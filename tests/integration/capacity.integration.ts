import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { LobbyService } from "../../src/application/lobby";
import { MatchService } from "../../src/application/matches";
import type { Command } from "../../src/application/ports";
import { RoomService } from "../../src/application/rooms";
import type { Match, Room } from "../../src/domain/model";
import type { Result } from "../../src/domain/result";
import { PostgresCatalogRepository } from "../../src/infrastructure/catalog-repository";
import { PostgresMatchRepository } from "../../src/infrastructure/match-repository";
import { PostgresRoomRepository } from "../../src/infrastructure/room-repository";
import { random } from "../../src/infrastructure/secrets";
import { assertCapacityCleanup } from "./capacity-cleanup.contract";
import { cleanupCapacityFixture, type CapacityFixtureIds } from "./capacity-cleanup";
import { assertCapacityBoundary, assertCapacityPlaying, assertCapacityWaiting } from "./capacity-sql.contract";
import { capacityBoundaryFixture, capacityPlayingFixture, capacityWaitingFixture } from "./capacity-sql.fixture";

const fixture = process.env.WORDPAIRS_CAPACITY_FIXTURE;
const url=process.env.WORDPAIRS_TEST_DATABASE_URL;
if(!fixture && (!url || new URL(url).hostname !== "127.0.0.1"))throw new Error("Use run-phase1.ps1 -CapacityUpgrade with its owned disposable database");
const admin=fixture ? null : new Pool({connectionString:url,ssl:false});
const pool=fixture ? null : new Pool({connectionString:url,ssl:false,options:"-c role=service_role"});
const fresh=process.env.WORDPAIRS_CAPACITY_MODE==="fresh";
const legacyRoom=(phase:string,capacity:number)=>capacity===25 ? `cap15-upgrade-${phase}` : `cap10-upgrade-${phase}-${capacity}`;
const owned:CapacityFixtureIds={rooms:[...[11,15,25].flatMap(capacity=>[legacyRoom("waiting",capacity),legacyRoom("playing",capacity)]),"cap15-upgrade-full","cap15-upgrade-partial"],profiles:Array.from({length:26},(_,index)=>`cap15-upgrade-player-${index+1}`)};
beforeAll(async()=>{if(fresh && admin)await admin.query("insert into wordpairs.profiles(id,identity_kind,alias,icon,public_leaderboard) select 'cap15-upgrade-player-'||n,'guest','Capacity Fresh '||n,'owl',false from generate_series(1,26)n");});
afterAll(async()=>{await cleanupCapacityFixture(admin,pool,owned);});
const value=<T>(result:Result<T>):T=>{if(!result.ok)throw new Error(result.error.code);return result.value;};
const ids={next:()=>`cap15-${randomUUID()}`};
let now=100;
const clock={now:()=>now};
const command=(state:Pick<Room|Match,"id"|"version">,actorId:string):Command=>({aggregateId:state.id,expectedVersion:state.version,actorId,commandId:ids.next(),requestDigest:ids.next()});
const player=(index:number)=>`cap15-upgrade-player-${index}`;

async function boundaries(){
  if(fixture)return capacityBoundaryFixture(fixture);
  if(!admin || !pool)throw new Error("Missing local database");
  const rooms=new PostgresRoomRepository(pool);const service=new RoomService(rooms,clock,ids,random);
  const roomId=`cap15-boundary-${randomUUID()}`;
  owned.rooms.push(roomId,...[11,15].flatMap(capacity=>[`${roomId}-invalid-${capacity}`,`${roomId}-sql-${capacity}`]));
  const created=await service.create(command({id:roomId,version:0},player(1)),10);
  const invalid11=await service.create(command({id:`${roomId}-invalid-11`,version:0},player(1)),11);
  const invalid15=await service.create(command({id:`${roomId}-invalid-15`,version:0},player(1)),15);
  const sqlRejected:boolean[]=[];
  for(const capacity of [11,15]){
    let rejected=false;
    try{await admin.query("insert into wordpairs.rooms(id,capacity,status,code_digest,creator_id) values($1,$3,'waiting',$1,$2)",[`${roomId}-sql-${capacity}`,player(1),capacity]);}catch(error){rejected=(error as {code:string}).code==="23514";}
    sqlRejected.push(rejected);
  }
  let raise11Rejected=false,newMatch11Rejected=false,newMatch10=false;
  try{await admin.query("update wordpairs.rooms set capacity=11 where id=$1",[roomId]);}catch(error){raise11Rejected=(error as {code:string}).code==="23514";}
  const state:Match={id:roomId,roomId,version:0,roster:Array.from({length:11},(_,index)=>player(index+1)),anchorId:player(1),chooserId:player(1),status:"choosing",rounds:[],usedPairIds:[],startedAt:0};
  try{await admin.query("insert into wordpairs.aggregates(kind,id,version,state) values('match',$1,0,$2::jsonb)",[roomId,JSON.stringify(state)]);}catch(error){newMatch11Rejected=(error as {code:string}).code==="23514";}
  state.roster=state.roster.slice(0,10);
  try{await admin.query("insert into wordpairs.aggregates(kind,id,version,state) values('match',$1,0,$2::jsonb)",[roomId,JSON.stringify(state)]);newMatch10=true;}catch{/* Report through the same assertion oracle. */}
  let room=value(await rooms.get(roomId));
  for(let index=2;index<=9;index++){
    value(await service.join(command(room,player(index)),"player",null));room=value(await rooms.get(roomId));
  }
  const finalSeat=await Promise.all([10,11].map(index=>service.join(command(room,player(index)),"player",null)));
  owned.profiles.push(...Array.from({length:26},(_,index)=>`${roomId}-observer-${index+1}`));
  await admin.query("insert into wordpairs.profiles(id,identity_kind,alias,icon,public_leaderboard) select $1||n,'guest','Observer '||n,'owl',false from generate_series(1,26)n",[`${roomId}-observer-`]);
  for(let index=1;index<=25;index++){
    room=value(await rooms.get(roomId));value(await service.join(command(room,`${roomId}-observer-${index}`),"observer",player(1)));
  }
  room=value(await rooms.get(roomId));
  const extra=await service.join(command(room,`${roomId}-observer-26`),"observer",player(1));
  if(fresh)for(const [phase,count] of [["full",10],["partial",9]] as const){
    const id=`cap15-upgrade-${phase}`;value(await service.create(command({id,version:0},player(1)),10));
    for(let index=2;index<=count;index++){const current=value(await rooms.get(id));value(await service.join(command(current,player(index)),"player",null));}
  }
  await admin.query("update wordpairs.aggregates set state=jsonb_set(state,'{discoverable}','true') where kind='room' and id=any($1::text[])",[["cap15-upgrade-full","cap15-upgrade-partial"]]);
  const publicPage=await admin.query("select public.wordpairs_public_rooms(0,1,null) as page");
  const publicRows=(publicPage.rows[0].page.rows as {id:string;capacity:number;playerCount:number}[]).map(row=>({id:row.id,capacity:row.capacity,playerCount:row.playerCount}));
  const discover=value(await rooms.discover(1)).map(row=>row.id);
  const quick=value<{joined:string|null;fallback:string[]}>(await service.quickMatch(player(26),ids.next(),ids.next()));
  return {new10:created.ok,new11:invalid11.ok,new15:invalid15.ok,sql11Rejected:sqlRejected[0],sql15Rejected:sqlRejected[1],raise11Rejected,newMatch10,newMatch11Rejected,finalSeatWinners:finalSeat.filter(result=>result.ok).length,players:room.players.length,observers:room.observers.length,observer26Rejected:!extra.ok && extra.error.code === "ROOM_FULL",publicRows,discover,quickJoined:quick.joined};
}
async function waiting(){
  if(fixture)return capacityWaitingFixture(fixture);
  if(!pool || !admin)throw new Error("Missing local database");
  const repository=new PostgresRoomRepository(pool);const service=new RoomService(repository,clock,ids,random);const lobby=new LobbyService(repository,clock,ids,repository.presenceStore);
  const observations=[];
  for(const capacity of [11,15,25]){
    const original=value(await repository.get(legacyRoom("waiting",capacity)));
    const updated=await admin.query("update wordpairs.rooms set capacity=capacity where id=$1 returning capacity",[original.id]);
    let growRejected=false;
    try{await admin.query("update wordpairs.rooms set capacity=capacity+1 where id=$1",[original.id]);}catch(error){growRejected=(error as {code:string}).code==="23514";}
    value(await lobby.act(command(original,player(1)),{type:"leave"}));
    const result=value(await repository.get(original.id));const view=value(await service.view(result,player(2)));
    observations.push({capacity,before:original.players.length,after:result.players.length,storedCapacity:result.capacity,unchangedCapacityUpdate:updated.rowCount===1 && updated.rows[0].capacity===capacity,growRejected,canJoin:view.canJoinPlayer,blocked:view.capacityBlocked===true});
  }
  return observations;
}
async function playing(){
  if(fixture)return capacityPlayingFixture(fixture);
  if(!admin || !pool)throw new Error("Missing local database");
  const rooms=new PostgresRoomRepository(pool);const matches=new PostgresMatchRepository(pool,ids,clock);const content=new PostgresCatalogRepository(pool);const service=new MatchService(matches,content,clock,ids,{integer:a=>a});
  const observations=[];
  for(const capacity of [11,15,25]){
  let match=value(await matches.get(legacyRoom("playing",capacity)));
  const initialRoom=value(await rooms.get(match.roomId));
  const initialScorecard=value(await service.view(initialRoom,player(capacity))).scorecard.length;
  let replayIdentical=true;
  for(let index=0;index<8;index++){
    value(await service.act(command(match,match.chooserId as string),{type:"choose",categoryId:"opposites"}));match=value(await matches.get(match.id));
    const round=match.rounds.at(-1);if(!round)throw new Error("Missing actual persisted round");
    const pair=value(await content.pair(round.pairId,round.pairVersion));now+=100;
    for(const actorId of match.roster){
      const input=command(match,actorId);const action={type:"answer" as const,roundId:round.id,stage:0,answer:pair.target};
      const accepted=await service.act(input,action);expect(value(accepted).correct).toBe(true);
      const replay=await service.act(input,action);expect(replay).toEqual(accepted);
      replayIdentical=replayIdentical && JSON.stringify(replay)===JSON.stringify(accepted);
      match=value(await matches.get(match.id));
    }
  }
  const room=value(await rooms.get(match.roomId));
  const awards=await admin.query("select count(*)::int as count from wordpairs.profile_match_awards where match_id=$1",[match.id]);
  observations.push({capacity,initialScorecard,roster:match.roster.length,rounds:match.rounds.length,solves:match.rounds.reduce((count,round)=>count+round.solves.length,0),status:match.status,roomStatus:room.status,awards:awards.rows[0].count,replayIdentical});
  }
  return observations;
}
it("CAP10 SQL accepts10 and rejects11/15 at service and direct SQL boundaries",async()=>{assertCapacityBoundary(await boundaries());});
if(!fresh){
it("CAP15-LEGACY forward upgrade preserves11/15/25 waiting membership, unchanged capacity and Leave",async()=>{assertCapacityWaiting(await waiting());});
it("CAP15-LEGACY forward upgrade preserves11/15/25 scoring, replay and final awards",async()=>{assertCapacityPlaying(await playing());},120000);
}

async function cleanupSnapshot(scope:CapacityFixtureIds):Promise<string[]>{
  if(!admin)throw new Error("Owned disposable database required");
  const result=await admin.query(`
    select 'profiles:'||to_jsonb(t)::text as record from wordpairs.profiles t where id=any($2::text[])
    union all select 'rooms:'||to_jsonb(t)::text from wordpairs.rooms t where id=any($1::text[])
    union all select 'members:'||to_jsonb(t)::text from wordpairs.room_members t where room_id=any($1::text[])
    union all select 'quick:'||to_jsonb(t)::text from wordpairs.quick_assignments t where room_id=any($1::text[])
    union all select 'aggregates:'||to_jsonb(t)::text from wordpairs.aggregates t where (kind in('room','match') and id=any($1::text[])) or (kind='profile' and id=any($2::text[]))
    union all select 'outbox:'||to_jsonb(t)::text from wordpairs.outbox_events t where (aggregate_kind in('room','match') and aggregate_id=any($1::text[])) or (aggregate_kind='profile' and aggregate_id=any($2::text[]))
    union all select 'commands:'||to_jsonb(t)::text from wordpairs.idempotency_records t where (aggregate_kind in('room','match') and aggregate_id=any($1::text[])) or (aggregate_kind='profile' and aggregate_id=any($2::text[]))
    union all select 'deadlines:'||to_jsonb(t)::text from wordpairs.deadline_jobs t where (aggregate_kind in('room','match') and aggregate_id=any($1::text[])) or (aggregate_kind='profile' and aggregate_id=any($2::text[]))
    order by record`,[scope.rooms,scope.profiles]);
  return result.rows.map(row=>row.record);
}

// These real bindings reuse the oracle already proved against independent
// correct and incorrect observations. Legacy capacity mock runs remain separate.
if(!fixture)for(const injectFailure of [false,true]){
  it(`CAP15 fixture cleanup ${injectFailure ? "reports SQL failure and closes both actual pools" : "removes exact owned rows while preserving outsider data and same-ID other-kind events"}`,async()=>{
    if(!admin || !pool || !url)throw new Error("Owned disposable database required");
    const prefix=`cap15-cleanup-${randomUUID()}`;
    const mine={rooms:[`${prefix}-owned`],profiles:[`${prefix}-owner`]};
    const outside={rooms:[`${prefix}-outside`],profiles:[`${prefix}-outsider`,mine.rooms[0]]};
    const all={rooms:[...mine.rooms,...outside.rooms],profiles:[...mine.profiles,...outside.profiles]};
    owned.rooms.push(...all.rooms);owned.profiles.push(...all.profiles);
    for(const id of all.profiles)await admin.query("insert into wordpairs.profiles(id,identity_kind,alias,icon,public_leaderboard) values($1,'guest','Cleanup Sentinel','owl',false)",[id]);
    const rooms=new PostgresRoomRepository(pool);const service=new RoomService(rooms,clock,ids,random);
    value(await service.create(command({id:mine.rooms[0],version:0},mine.profiles[0]),2));
    value(await service.create(command({id:outside.rooms[0],version:0},outside.profiles[0]),2));
    // Same text ID as the owned room, but a different aggregate namespace.
    for(const id of [mine.profiles[0],mine.rooms[0]]){
      await admin.query("insert into wordpairs.aggregates(kind,id,version,state) values('profile',$1,0,$2::jsonb)",[id,JSON.stringify({id,version:0,alias:"Cleanup Sentinel",icon:"owl",publicLeaderboard:false,wins:0,points:0,earliestWinAt:null})]);
      await admin.query("insert into wordpairs.outbox_events(id,aggregate_kind,aggregate_id,aggregate_version,schema_version,event_type,audience,payload) values($1,'profile',$2,0,1,'changed','[]'::jsonb,$3::jsonb)",[`${prefix}-${id}-event`,id,JSON.stringify({sentinel:prefix})]);
    }
    const ownedBefore=await cleanupSnapshot(mine);const unrelatedBefore=await cleanupSnapshot(outside);
    const cleanupAdmin=new Pool({connectionString:url,ssl:false});const cleanupService=new Pool({connectionString:url,ssl:false});
    let captured:unknown[]=[];
    try{
      const query=async(sql:string,parameters?:unknown[])=>{
        if(injectFailure)await cleanupAdmin.query("do $$begin raise exception 'cleanup failed';end$$");
        return cleanupAdmin.query(sql,parameters);
      };
      try{await cleanupCapacityFixture({query,end:()=>cleanupAdmin.end()},cleanupService,mine);}catch(error){captured=error instanceof AggregateError ? error.errors : [error];}
      assertCapacityCleanup({ownedBefore,ownedAfter:await cleanupSnapshot(mine),unrelatedBefore,unrelatedAfter:await cleanupSnapshot(outside),closedPools:[...(cleanupAdmin.ended ? ["admin"] : []),...(cleanupService.ended ? ["service"] : [])],errors:captured.map(error=>error instanceof Error ? error.message : String(error))},injectFailure);
    }finally{
      await cleanupCapacityFixture(new Pool({connectionString:url,ssl:false}),new Pool({connectionString:url,ssl:false}),all);
    }
  });
}
