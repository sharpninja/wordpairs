import { Pool } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { IdentityService } from "../../src/application/identity";
import { LobbyDispatcher, LobbyService } from "../../src/application/lobby";
import {
  type MatchAction,
  MatchService,
  matchDeadlines,
} from "../../src/application/matches";
import { RoomService } from "../../src/application/rooms";
import { lobbyDeadlines } from "../../src/domain/lobby";
import { standings } from "../../src/domain/match";
import type { Match, Room } from "../../src/domain/model";
import { failure, type Result, success } from "../../src/domain/result";
import { PostgresCatalogRepository } from "../../src/infrastructure/catalog-repository";
import { PostgresLobbyQueue } from "../../src/infrastructure/deadlines";
import { PostgresIdentityRepository } from "../../src/infrastructure/identity-repository";
import { PostgresMatchRepository } from "../../src/infrastructure/match-repository";
import { PostgresRoomRepository } from "../../src/infrastructure/room-repository";
import {
  random as roomRandom,
  secrets,
} from "../../src/infrastructure/secrets";

const url = process.env.WORDPAIRS_TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1")
  throw new Error("Disposable local database required");
const admin = new Pool({ connectionString: url, ssl: false });
const pool = new Pool({
  connectionString: url,
  ssl: false,
  options: "-c role=service_role",
  max: 3,
});
let now = 1000000;
let serial = 0;
let forced: string | null = null;
const ids = { next: () => forced ?? `game-event-${++serial}` };
const clock = { now: () => now };
const random = { integer: (minimum: number) => minimum };
const identity = new IdentityService(
  new PostgresIdentityRepository(pool),
  secrets,
  { next: () => `game-profile-${++serial}` },
  random,
  clock,
  null,
);
const roomsRepo = new PostgresRoomRepository(pool);
const rooms = new RoomService(roomsRepo, clock, ids, roomRandom);
const lobby = new LobbyService(roomsRepo, clock, ids, roomsRepo.presenceStore);
const repo = new PostgresMatchRepository(pool, ids, clock);
const content = new PostgresCatalogRepository(pool);
const game = new MatchService(repo, content, clock, ids, random);
const val = <T>(r: Result<T>) => {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.value;
};
const profiles: { id: string; sessionToken: string }[] = [];
beforeAll(async () => {
  for (let n = 0; n < 3; n++) {
    const entry = val(await identity.guest(null));
    profiles.push({ id: entry.profile.id, sessionToken: entry.sessionToken });
  }
});
afterAll(async () => {
  await admin.query(
    "delete from wordpairs.profile_match_awards where match_id like 'game-%';delete from wordpairs.submissions where round_id in(select id from wordpairs.rounds where match_id like 'game-%');delete from wordpairs.rounds where match_id like 'game-%';delete from wordpairs.match_players where match_id like 'game-%';delete from wordpairs.matches where id like 'game-%';delete from wordpairs.deadline_jobs where aggregate_id like 'game-%';delete from wordpairs.idempotency_records where aggregate_id like 'game-%';delete from wordpairs.outbox_events where aggregate_id like 'game-%';delete from wordpairs.aggregates where kind='match' and id like 'game-%';delete from wordpairs.aggregates where kind='room' and id like 'game-%';delete from wordpairs.room_members where room_id like 'game-%';delete from wordpairs.rooms where id like 'game-%';delete from wordpairs.sessions where profile_id like 'game-profile-%';delete from wordpairs.guest_credentials where profile_id like 'game-profile-%';delete from wordpairs.aggregates where kind='profile' and id like 'game-profile-%';delete from wordpairs.profiles where id like 'game-profile-%';",
  );
  await pool.end();
  await admin.end();
});
const command = (
  state: Room | Match,
  actorId: string,
  name = `game-command-${++serial}`,
) => ({
  aggregateId: state.id,
  actorId,
  commandId: name,
  expectedVersion: state.version,
  requestDigest: name,
});
const load = async (id: string) => val(await repo.get(id));
async function start(name: string) {
  now += 100000;
  const id = `game-${name}`;
  val(
    await rooms.create(
      {
        aggregateId: id,
        actorId: profiles[0].id,
        commandId: `game-create-${name}`,
        requestDigest: name,
        expectedVersion: 0,
      },
      2,
    ),
  );
  let room = val(await roomsRepo.get(id));
  val(await rooms.join(command(room, profiles[1].id), "player", null));
  room = val(await roomsRepo.get(id));
  val(
    await rooms.join(command(room, profiles[2].id), "observer", profiles[0].id),
  );
  for (const profile of profiles.slice(0, 2)) {
    room = val(await roomsRepo.get(id));
    val(
      await lobby.act(command(room, profile.id), {
        type: "ready",
        ready: true,
      }),
    );
  }
  room = val(await roomsRepo.get(id));
  const due = lobbyDeadlines(room, () => `game-start-job-${++serial}`).find(
    (j) => j.kind === "countdown",
  );
  if (!due) throw new Error("Missing countdown");
  now = due.dueAt;
  val(await lobby.expire(due));
  const results = await Promise.all([game.open(id), game.open(id)]);
  expect(results[0]).toEqual(results[1]);
  return val(results[0]);
}
async function act(match: Match, actor: string, action: MatchAction) {
  return game.act(
    {
      ...command(match, actor),
      requestDigest: secrets.hash(JSON.stringify(action)),
    },
    action,
  );
}
async function answer(match: Match, actor: string) {
  const current = match.rounds.at(-1);
  if (!current) throw new Error("Missing round");
  const pair = val(await content.pair(current.pairId, current.pairVersion));
  return act(match, actor, {
    type: "answer",
    roundId: current.id,
    stage: current.stage,
    answer: pair.target,
  });
}
it("loads 60 complete pairs and atomically snapshots one start/anchor despite concurrent bootstrap", async () => {
  const catalog = val(await content.read());
  expect(catalog.categories).toHaveLength(7); // includes the generic foundation content fixture
  expect(catalog.pairs).toHaveLength(60);
  const match = await start("start");
  expect(match.roster).toEqual(profiles.slice(0, 2).map((p) => p.id));
  expect(match.anchorId).toBe(profiles[0].id);
  expect(
    (
      await admin.query(
        "select count(*)::int as count from wordpairs.outbox_events where aggregate_kind='match' and aggregate_id=$1",
        [match.id],
      )
    ).rows[0].count,
  ).toBe(1);
});
it("serializes same-time correct submissions, replays canonically and rejects observers without writes", async () => {
  let match = await start("race");
  val(
    await act(match, profiles[0].id, {
      type: "choose",
      categoryId: "opposites",
    }),
  );
  match = await load(match.id);
  now += 100;
  const round = match.rounds[0];
  const pair = val(await content.pair(round.pairId, round.pairVersion));
  const action: MatchAction = {
    type: "answer",
    roundId: round.id,
    stage: 0,
    answer: pair.target,
  };
  const commands = profiles
    .slice(0, 2)
    .map((p) => ({
      ...command(match, p.id),
      requestDigest: secrets.hash(JSON.stringify(action)),
    }));
  const results = await Promise.all(commands.map((c) => game.act(c, action)));
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  expect(results.filter((r) => !r.ok)).toEqual([failure("CONFLICT")]);
  const winner = results.findIndex((r) => r.ok);
  expect(await game.act(commands[winner], action)).toEqual(results[winner]);
  match = await load(match.id);
  expect(await act(match, profiles[2].id, action)).toEqual(
    failure("NOT_AUTHORIZED"),
  );
  val(await act(match, profiles[1 - winner].id, action));
  match = await load(match.id);
  expect(match.status).toBe("summary");
  expect(match.chooserId).toBe(profiles[winner].id);
  expect(match.rounds[0].solves.map((s) => s.order)).toEqual([0, 1]);
  const rows = await admin.query(
    "select correct,points from wordpairs.submissions where round_id=$1",
    [round.id],
  );
  expect(rows.rows).toEqual([
    { correct: true, points: 5 },
    { correct: true, points: 5 },
  ]);
});
it("binds observer hint visibility to the inviter and never persists incorrect guess text", async () => {
  let match = await start("privacy");
  val(
    await act(match, profiles[0].id, {
      type: "choose",
      categoryId: "opposites",
    }),
  );
  match = await load(match.id);
  now += 100;
  val(await answer(match, profiles[0].id));
  match = await load(match.id);
  val(
    await act(match, profiles[1].id, {
      type: "answer",
      roundId: match.rounds[0].id,
      stage: 0,
      answer: "PRIVATE WRONG GAME TEXT",
    }),
  );
  match = await load(match.id);
  expect(match.rounds[0].stage).toBe(1);
  const room = val(await roomsRepo.get(match.roomId));
  const observer = val(await game.view(room, profiles[2].id));
  const player = val(await game.view(room, profiles[1].id));
  expect(observer.round?.hints).toEqual([]);
  expect(player.round?.hints).toHaveLength(1);
  expect(JSON.stringify(observer)).not.toContain("correctAnswer");
  const privateRows = await admin.query(
    "select exists(select 1 from wordpairs.aggregates where state::text like '%PRIVATE WRONG GAME TEXT%') or exists(select 1 from wordpairs.idempotency_records where transition::text like '%PRIVATE WRONG GAME TEXT%') or exists(select 1 from wordpairs.outbox_events where payload::text like '%PRIVATE WRONG GAME TEXT%') as leaked",
  );
  expect(privateRows.rows[0].leaked).toBe(false);
});
it("leases actual stage jobs and catches up all elapsed stages once, with an automatic next-category draw", async () => {
  let match = await start("deadline");
  val(
    await act(match, profiles[0].id, {
      type: "choose",
      categoryId: "opposites",
    }),
  );
  match = await load(match.id);
  now += 80000;
  const queue = new PostgresLobbyQueue(pool, "match");
  const jobs = val(await queue.claim(now, 25, "game-stage-worker"));
  const due = jobs.find((j) => j.aggregateId === match.id);
  if (!due) throw new Error("Missing persisted stage job");
  const result = await game.expire(due);
  expect(result.ok).toBe(true);
  expect(await game.expire(due)).toEqual(result);
  match = await load(match.id);
  expect(match.status).toBe("summary");
  expect(match.rounds[0].revealed).toBe(true);
  expect(match.autoCategoryId).toBe("heroes");
  expect(standings(match).map((p) => p.totalTimeMs)).toEqual([80000, 80000]);
  expect((await queue.complete(due.id, "game-stage-worker")).ok).toBe(true);
});
it("replays accepted actor commands after departure, rejects changed digest and denies every new departed-player command", async () => {
  let match = await start("replay-left");
  val(
    await act(match, profiles[0].id, {
      type: "choose",
      categoryId: "opposites",
    }),
  );
  match = await load(match.id);
  const round = match.rounds[0];
  const pair = val(await content.pair(round.pairId, round.pairVersion));
  now += 100;
  const action: MatchAction = {
    type: "answer",
    roundId: round.id,
    stage: 0,
    answer: pair.target,
  };
  const original = {
    ...command(match, profiles[0].id),
    requestDigest: secrets.hash(JSON.stringify(action)),
  };
  const accepted = await game.act(original, action);
  expect(accepted.ok).toBe(true);
  const room = val(await roomsRepo.get(match.roomId));
  val(await lobby.act(command(room, profiles[0].id), { type: "leave" }));
  expect(await game.act(original, action)).toEqual(accepted);
  expect(
    await game.act({ ...original, requestDigest: "changed" }, action),
  ).toEqual(failure("IDEMPOTENCY_CONFLICT"));
  match = await load(match.id);
  expect(await act(match, profiles[0].id, action)).toEqual(
    failure("NOT_AUTHORIZED"),
  );
  expect(
    await game.view(val(await roomsRepo.get(match.roomId)), profiles[0].id),
  ).toEqual(failure("NOT_AUTHORIZED"));
});
it("refuses new scoring and private perspective after grace expiry even while the reconnect job is leased elsewhere", async () => {
  let match = await start("expired-actor");
  val(
    await act(match, profiles[0].id, {
      type: "choose",
      categoryId: "opposites",
    }),
  );
  match = await load(match.id);
  const originalRoom = val(await roomsRepo.get(match.roomId));
  const room = {
    ...originalRoom,
    version: originalRoom.version + 1,
    players: originalRoom.players.map((p) =>
      p.profileId === profiles[0].id
        ? { ...p, disconnectedAt: now - 120000 }
        : p,
    ),
  };
  await admin.query(
    "update wordpairs.aggregates set version=$2,state=$3::jsonb where kind='room' and id=$1",
    [room.id, room.version, JSON.stringify(room)],
  );
  const job = {
    id: `game-leased-reconnect-${++serial}`,
    aggregateId: room.id,
    expectedVersion: room.version,
    kind: "reconnect" as const,
    dueAt: now,
  };
  await admin.query(
    "insert into wordpairs.deadline_jobs(id,aggregate_kind,aggregate_id,expected_version,kind,due_at,lease_id,lease_until) values($1,'room',$2,$3,'reconnect',to_timestamp($4::double precision/1000),'other-worker',now()+interval '1 hour')",
    [job.id, room.id, room.version, now],
  );
  expect(await answer(match, profiles[0].id)).toEqual(failure("CONFLICT"));
  expect((await load(match.id)).version).toBe(match.version);
  expect(await game.view(room, profiles[0].id)).toEqual(
    failure("NOT_AUTHORIZED"),
  );
  expect(await game.view(room, profiles[2].id)).toEqual(
    failure("NOT_AUTHORIZED"),
  );
  val(await lobby.expire(job));
  expect(
    val(await roomsRepo.get(room.id)).players.map((p) => p.profileId),
  ).toEqual([profiles[1].id]);
  expect(await answer(match, profiles[0].id)).toEqual(
    failure("NOT_AUTHORIZED"),
  );
});
it("rolls back final standings/profile awards/room closure together on failure, then awards once on canonical retry", async () => {
  let match = await start("complete");
  let finalCommand: ReturnType<typeof command> | undefined;
  let finalAction: MatchAction | undefined;
  const before = await admin.query(
    "select id,wins,points from wordpairs.profiles where id=any($1::text[]) order by id",
    [profiles.slice(0, 2).map((p) => p.id)],
  );
  for (let round = 0; round < 8; round++) {
    val(
      await act(match, profiles[0].id, {
        type: "choose",
        categoryId: "opposites",
      }),
    );
    match = await load(match.id);
    now += 100;
    val(await answer(match, profiles[0].id));
    match = await load(match.id);
    now += 100;
    if (round < 7) {
      val(await answer(match, profiles[1].id));
      match = await load(match.id);
      continue;
    }
    const current = match.rounds[7];
    const pair = val(await content.pair(current.pairId, current.pairVersion));
    finalAction = {
      type: "answer",
      roundId: current.id,
      stage: 0,
      answer: pair.target,
    };
    finalCommand = {
      ...command(match, profiles[1].id),
      requestDigest: secrets.hash(JSON.stringify(finalAction)),
    };
    const duplicate = await admin.query(
      "select id from wordpairs.outbox_events where aggregate_kind='match' and aggregate_id=$1 order by aggregate_version limit 1",
      [match.id],
    );
    forced = duplicate.rows[0].id;
    expect(await game.act(finalCommand, finalAction)).toEqual(
      failure("TEMPORARY_UNAVAILABLE"),
    );
    forced = null;
    expect((await load(match.id)).status).toBe("playing");
    expect(
      (
        await admin.query(
          "select id,wins,points from wordpairs.profiles where id=any($1::text[]) order by id",
          [profiles.slice(0, 2).map((p) => p.id)],
        )
      ).rows,
    ).toEqual(before.rows);
    expect(
      (
        await admin.query(
          "select count(*)::int as count from wordpairs.profile_match_awards where match_id=$1",
          [match.id],
        )
      ).rows[0].count,
    ).toBe(0);
    const result = await game.act(finalCommand, finalAction);
    expect(result.ok).toBe(true);
    expect(await game.act(finalCommand, finalAction)).toEqual(result);
    match = await load(match.id);
  }
  expect(match.status).toBe("finished");
  expect(match.rounds).toHaveLength(8);
  expect(standings(match).map((p) => p.points)).toEqual([40, 40]);
  expect((await roomsRepo.get(match.roomId)).ok).toBe(true);
  expect(val(await roomsRepo.get(match.roomId)).status).toBe("closed");
  const one = val(await identity.session(profiles[0].sessionToken));
  const two = val(await identity.session(profiles[1].sessionToken));
  expect(one.profile.points).toBe(40);
  expect(two.profile.points).toBe(40);
  expect(one.profile.wins).toBe(1);
  expect(two.profile.wins).toBe(0);
  expect(
    (
      await admin.query(
        "select count(*)::int as count from wordpairs.profile_match_awards where match_id=$1",
        [match.id],
      )
    ).rows[0].count,
  ).toBe(2);
});
it("UI-NOSOLVER catalog revision race retains the valid summary deadline for eventual real SQL advancement", async () => {
  let match = await start("summary-catalog-race");
  val(
    await act(match, profiles[0].id, {
      type: "choose",
      categoryId: "opposites",
    }),
  );
  match = await load(match.id);
  now += 80000;
  val(
    await game.expire(
      matchDeadlines(match, () => `game-race-expire-${++serial}`)[0],
    ),
  );
  match = await load(match.id);
  const job = matchDeadlines(match, () => `game-race-continue-${++serial}`)[0];
  expect(job).toBeDefined();
  now = job.dueAt;
  let race = true;
  let completed = 0;
  const changingCatalog = {
    read: async () => {
      const result = await content.read();
      if (race) {
        race = false;
        await admin.query(
          "update wordpairs.catalog_revision set revision=revision+1",
        );
      }
      return result;
    },
  };
  const raced = new MatchService(repo, changingCatalog, clock, ids, random);
  // Queue port isolates this job; SQL catalog lock, match transaction, jobs and outbox are real.
  const dispatcher = new LobbyDispatcher(
    {
      claim: async () => success([job]),
      complete: async () => {
        completed++;
        return success(undefined);
      },
    },
    raced,
    clock,
    ids,
  );
  expect(await dispatcher.drain()).toEqual(failure("TEMPORARY_UNAVAILABLE"));
  expect(completed).toBe(0);
  expect((await load(match.id)).version).toBe(match.version);
  expect(val(await dispatcher.drain())).toBe(1);
  expect(completed).toBe(1);
  const next = await load(match.id);
  expect(next.rounds).toHaveLength(2);
  expect(next.rounds[1]).toMatchObject({
    startedAt: now,
    stageDueAt: now + 20000,
  });
  expect(val(await dispatcher.drain())).toBe(1);
  expect((await load(match.id)).rounds).toHaveLength(2);
  const audits = await admin.query(
    "select actor_id from wordpairs.audit_events where target_id=$1 and actor_id='system:deadline'",
    [match.id],
  );
  expect(audits.rows).toHaveLength(1);
});
