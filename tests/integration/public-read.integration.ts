import { Pool } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { landingProjection } from "../../src/application/public-projections";
import { PostgresPublicReadRepository } from "../../src/infrastructure/public-read";

const connectionString = process.env.WORDPAIRS_TEST_DATABASE_URL;
if (!connectionString || new URL(connectionString).hostname !== "127.0.0.1")
  throw new Error("Disposable local database required");
const admin = new Pool({ connectionString, ssl: false });
const pool = new Pool({
  connectionString,
  ssl: false,
  options: "-c role=service_role",
});
const repository = new PostgresPublicReadRepository(pool);
beforeAll(async () => {
  await admin.query(`insert into wordpairs.profiles(id,identity_kind,issuer,provider_subject,alias,icon,public_leaderboard,wins,points,earliest_win_at) values
    ('public-a','member','test-issuer','PRIVATE-SUBJECT-a','Player A','owl',true,4,20,to_timestamp(1)),
    ('public-b','member','test-issuer','PRIVATE-SUBJECT-b','Player B','owl',true,4,20,to_timestamp(1)),
    ('public-wins','member','test-issuer','PRIVATE-SUBJECT-c','Player Wins','owl',true,5,1,to_timestamp(1)),
    ('public-points','member','test-issuer','PRIVATE-SUBJECT-d','Player Points','owl',true,4,30,to_timestamp(1)),
    ('public-optout','member','test-issuer','PRIVATE-SUBJECT-e','PRIVATE-ALIAS','owl',false,99,99,to_timestamp(1)),
    ('public-guest','guest',null,null,'Guest Cedar','owl',true,6,1,to_timestamp(1));
    insert into wordpairs.rooms(id,capacity,status,code_digest,creator_id,discoverable,created_at) values
    ('public-room-a',4,'waiting','PRIVATE-CODE-a','p1',true,to_timestamp(0)),
    ('public-room-b',4,'waiting','PRIVATE-CODE-b','p1',true,to_timestamp(0)),
    ('public-hidden',4,'waiting','PRIVATE-CODE-c','p1',false,to_timestamp(0)),
    ('public-full',2,'waiting','PRIVATE-CODE-d','p1',true,to_timestamp(0)),
    ('public-started',4,'playing','PRIVATE-CODE-e','p1',true,to_timestamp(0));
    insert into wordpairs.room_members(room_id,profile_id,membership_kind,roster_position) values
    ('public-full','p1','player',1),('public-full','p2','player',2);`);
});
afterAll(async () => {
  await pool.end();
  await admin.end();
});

it("TR-30 real public query is bounded, ordered, opt-out aware, and private fields never reach the projection", async () => {
  const profiles = await repository.leaderboard({ offset: 0, limit: 25, revision: null });
  const rooms = await repository.lobbies({ offset: 0, limit: 25, revision: null });
  if (!profiles.ok || !rooms.ok) throw new Error("Public queries failed");
  expect(profiles.value.rows.map((row) => row.id)).toEqual([
    "public-guest",
    "public-wins",
    "public-points",
    "public-a",
    "public-b",
  ]);
  expect(rooms.value.rows.map((row) => row.id)).toEqual([
    "public-room-a",
    "public-room-b",
  ]);
  const view = landingProjection(profiles.value.rows, rooms.value.rows, 60000);
  expect(view.lobbies[0]).toEqual({
    roomId: "public-room-a",
    playerCount: 0,
    capacity: 4,
    state: "waiting",
    ageSeconds: 60,
  });
  expect(JSON.stringify(view)).not.toMatch(
    /PRIVATE|provider_subject|code_digest|creator_id/,
  );
  const first = await repository.leaderboard({ offset: 0, limit: 1, revision: null });
  if (!first.ok) throw new Error('First page failed');
  expect(first.value.nextOffset).toBe(1);
  const second = await repository.leaderboard({ offset: 1, limit: 1, revision: first.value.revision });
  expect(second.ok && second.value.rows.map((row) => row.id)).toEqual([
    "public-wins",
  ]);
  expect((await repository.lobbies({ offset: 0, limit: 26, revision: null })).ok).toBe(false);
  await admin.query("begin; update wordpairs.profiles set public_leaderboard=false where id='public-guest'; rollback;");
  const afterRollback = await repository.leaderboard({ offset: 1, limit: 1, revision: first.value.revision });
  expect(afterRollback.ok).toBe(true);
  await admin.query("update wordpairs.profiles set public_leaderboard=false where id='public-guest'");
  expect(await repository.leaderboard({ offset: 1, limit: 1, revision: first.value.revision })).toEqual({ ok:false,error:{code:'CONFLICT'} });
  const fresh = await repository.leaderboard({ offset: 0, limit: 1, revision: null });
  expect(fresh.ok && fresh.value.rows[0].id).toBe('public-wins');
  await admin.query("insert into wordpairs.room_members(room_id,profile_id,membership_kind,roster_position) values ('public-room-a','p3','player',1)");
  expect(await repository.lobbies({ offset: 1, limit: 1, revision: rooms.value.revision })).toEqual({ ok:false,error:{code:'CONFLICT'} });
  for (const role of ['anon','authenticated']) {
    const client = await admin.connect();
    try {
      await client.query(`set role ${role}`);
      await expect(client.query('select public.wordpairs_public_profiles(0,25,null)')).rejects.toMatchObject({ code: '42501' });
    } finally { await client.query('reset role'); client.release(); }
  }
});
