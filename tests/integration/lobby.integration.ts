import { Pool } from 'pg';
import { afterAll,beforeAll,expect,it } from 'vitest';
import { LobbyDispatcher,LobbyService } from '../../src/application/lobby';
import { RoomService } from '../../src/application/rooms';
import { lobbyDeadlines } from '../../src/domain/lobby';
import type { Room } from '../../src/domain/model';
import { PostgresLobbyQueue } from '../../src/infrastructure/deadlines';
import { PostgresRoomRepository } from '../../src/infrastructure/room-repository';
import { random } from '../../src/infrastructure/secrets';
import type { Result } from '../../src/domain/result';
const url=process.env.WORDPAIRS_TEST_DATABASE_URL;if(!url||new URL(url).hostname!=='127.0.0.1')throw new Error('Disposable local database required');
const admin=new Pool({connectionString:url,ssl:false});const pool=new Pool({connectionString:url,ssl:false,options:'-c role=service_role'});
const repository=new PostgresRoomRepository(pool);const queue=new PostgresLobbyQueue(pool);let now=10000;let serial=0;
const ids={next:()=>`lobby-event-${++serial}`};const clock={now:()=>now};const rooms=new RoomService(repository,clock,ids,random);const lobby=new LobbyService(repository,clock,ids,repository.presenceStore);
const val=<T>(r:Result<T>)=>{if(!r.ok)throw new Error(JSON.stringify(r));return r.value;};
const command=(room:Room,actorId:string,commandId=`lobby-command-${++serial}`)=>({aggregateId:room.id,actorId,commandId,requestDigest:commandId,expectedVersion:room.version});
const get=async(id:string)=>val(await repository.get(id));
async function create(name:string,capacity=3){const id=`lobby-${name}`;val(await rooms.create({aggregateId:id,actorId:'p1',commandId:`lobby-create-${name}`,requestDigest:name,expectedVersion:0},capacity));for(let i=2;i<=capacity;i++){const room=await get(id);val(await rooms.join(command(room,`p${i}`),'player',null));}return get(id);}
beforeAll(async()=>{await admin.query("insert into wordpairs.profiles(id,identity_kind,alias,icon,public_leaderboard) values('lobby-o1','guest','Observer One','owl',false),('lobby-o2','guest','Observer Two','fox',false)");});
afterAll(async()=>{await admin.query("delete from wordpairs.deadline_jobs where aggregate_kind='room' and aggregate_id like 'lobby-%';delete from wordpairs.idempotency_records where aggregate_kind='room' and aggregate_id like 'lobby-%';delete from wordpairs.outbox_events where aggregate_kind='room' and aggregate_id like 'lobby-%';delete from wordpairs.aggregates where kind='room' and id like 'lobby-%';delete from wordpairs.room_members where room_id like 'lobby-%';delete from wordpairs.rooms where id like 'lobby-%';delete from wordpairs.profiles where id like 'lobby-o%';");await pool.end();await admin.end();});
it('persists promotion, compaction and canonical departure under actual aggregate locking',async()=>{
  let room=await create('promotion');val(await rooms.join(command(room,'lobby-o2'),'observer','p1'));room=await get(room.id);now++;
  val(await rooms.join(command(room,'lobby-o1'),'observer','p3'));room=await get(room.id);
  const leave=command(room,'p2');const result=await lobby.act(leave,{type:'leave'});expect(result.ok).toBe(true);expect(await lobby.act(leave,{type:'leave'})).toEqual(result);
  room=await get(room.id);expect(room.players.map(p=>p.profileId)).toEqual(['p1','p3','lobby-o2']);expect(room.observers.map(p=>p.profileId)).toEqual(['lobby-o1']);
  const rows=await admin.query("select profile_id,roster_position from wordpairs.room_members where room_id=$1 and membership_kind='player' order by roster_position",[room.id]);expect(rows.rows).toEqual([{profile_id:'p1',roster_position:1},{profile_id:'p3',roster_position:2},{profile_id:'lobby-o2',roster_position:3}]);
});
it('serializes a ready/leave race with one canonical winner',async()=>{
  let room=await create('race');const results=await Promise.all([lobby.act(command(room,'p2'),{type:'leave'}),lobby.act(command(room,'p3'),{type:'ready',ready:true})]);expect(results.filter(r=>r.ok)).toHaveLength(1);expect(results.filter(r=>!r.ok)).toEqual([{ok:false,error:{code:'CONFLICT'}}]);
  room=await get(room.id);expect(room.version).toBe(3);const events=await admin.query('select count(*)::int as count from wordpairs.outbox_events where aggregate_id=$1',[room.id]);expect(events.rows[0].count).toBe(4);
});
it('applies an overdue holdout under the room lock while its durable job is leased elsewhere',async()=>{
  now=20000;let room=await create('holdout');val(await lobby.act(command(room,'p1'),{type:'ready',ready:true}));room=await get(room.id);val(await lobby.act(command(room,'p2'),{type:'ready',ready:true}));room=await get(room.id);
  await admin.query("update wordpairs.deadline_jobs set lease_id='other-worker',lease_until=now()+interval '1 hour' where aggregate_id=$1 and kind='holdout' and expected_version=$2",[room.id,room.version]);
  now=25001;const late=command(room,'p3');expect(await lobby.act(late,{type:'ready',ready:true})).toEqual({ok:false,error:{code:'NOT_AUTHORIZED'}});
  expect(await lobby.act(late,{type:'ready',ready:true})).toEqual({ok:false,error:{code:'NOT_AUTHORIZED'}});room=await get(room.id);expect(room.status).toBe('countdown');expect(room.lockedRoster).toEqual(['p1','p2']);expect(room.countdownDueAt).toBe(35000);
});
it('leases jobs exclusively, recovers abandoned leases and commits only one canonical prompt',async()=>{
  now=40000;let room=await create('lease',2);now=70000;
  const batches=await Promise.all([queue.claim(now,25,'worker-a'),queue.claim(now,25,'worker-b')]);const all=batches.flatMap(r=>val(r));expect(new Set(all.map(j=>j.id)).size).toBe(all.length);
  const prompt=all.find(j=>j.aggregateId===room.id&&j.kind==='idle');if(!prompt)throw new Error('Missing real prompt');
  const accepted=await lobby.expire(prompt);expect(accepted.ok).toBe(true);expect(await lobby.expire(prompt)).toEqual(accepted);room=await get(room.id);expect(room.idlePromptedVersion).not.toBeNull();
  await admin.query("update wordpairs.deadline_jobs set lease_until=to_timestamp(($1-1)::double precision/1000) where lease_id in ('worker-a','worker-b')",[now]);
  const recovered=val(await queue.claim(now,25,'worker-c'));expect(recovered.some(j=>j.kind==='countdown')).toBe(true);
  const owned=recovered[0];if(owned){expect(await queue.complete(owned.id,'wrong-worker')).toEqual({ok:false,error:{code:'CONFLICT'}});expect((await queue.complete(owned.id,'worker-c')).ok).toBe(true);}
  expect((await new LobbyDispatcher(queue,lobby,clock,ids).drain(25)).ok).toBe(true);
});
it('denies browser-role claims and creation retry does not duplicate scheduled work',async()=>{
  now=80000;const room=await create('retry',2);const jobs=await admin.query('select count(*)::int as count from wordpairs.deadline_jobs where aggregate_id=$1',[room.id]);
  const result=await rooms.create({aggregateId:room.id,actorId:'p1',commandId:'lobby-create-retry',requestDigest:'retry',expectedVersion:0},2);expect(result.ok).toBe(true);
  expect((await admin.query('select count(*)::int as count from wordpairs.deadline_jobs where aggregate_id=$1',[room.id])).rows).toEqual(jobs.rows);
  for(const role of ['anon','authenticated']){const client=await admin.connect();try{await client.query(`set role ${role}`);await expect(client.query("select public.wordpairs_lobby_claim(100000,10,'forged')")).rejects.toMatchObject({code:'42501'});}finally{await client.query('reset role');client.release();}}
});
it('locks countdown atomically, refuses observer substitution and expires the closed room code',async()=>{
  now=90000;let room=await create('abort',2);val(await rooms.join(command(room,'lobby-o1'),'observer','p2'));room=await get(room.id);
  val(await lobby.act(command(room,'p1'),{type:'ready',ready:true}));room=await get(room.id);val(await lobby.act(command(room,'p2'),{type:'ready',ready:true}));room=await get(room.id);expect(room.lockedRoster).toEqual(['p1','p2']);
  val(await lobby.act(command(room,'p1'),{type:'leave'}));room=await get(room.id);expect(room.players.map(p=>p.profileId)).toEqual(['p2']);expect(room.observers.map(p=>p.profileId)).toEqual(['lobby-o1']);
  const due=lobbyDeadlines(room,()=>`lobby-abort-job-${++serial}`).find(j=>j.kind==='countdown');if(!due)throw new Error('Missing countdown');now=100000;expect((await lobby.expire(due)).ok).toBe(true);room=await get(room.id);expect(room.status).toBe('closed');
  expect(await repository.lookupCode(room.code,'lobby-closed-session',now)).toEqual({ok:false,error:{code:'NOT_FOUND'}});
});
it('concurrent same-version heartbeats renew both live players without starvation across repeated ticks',async()=>{
  now=200000;let room=await create('presence',2);
  for(let tick=0;tick<12;tick++){
    now+=20000;const shared=room;const commands=['p1','p2'].map(p=>command(shared,p));
    const results=await Promise.all(commands.map(c=>lobby.act(c,{type:'presence',connected:true})));expect(results.every(r=>r.ok)).toBe(true);
    const canonical=await lobby.act(commands[1],{type:'presence',connected:true});expect(canonical).toEqual(results[1]);
    room=await get(room.id);expect(room.players.map(p=>p.lastSeenAt)).toEqual([now,now]);expect(room.players.every(p=>p.disconnectedAt===null)).toBe(true);
  }
  expect(room.players.map(p=>p.profileId)).toEqual(['p1','p2']);
});
