import { describe, expect, it, vi } from 'vitest';
import { expireLobby, leaveRoom, lobbyDeadlines, presence, setReady } from '../../src/domain/lobby';
import { joinRoom, newRoom } from '../../src/domain/rooms';
import type { Deadline, Room } from '../../src/domain/model';
import { success, failure, type Result } from '../../src/domain/result';
import { LobbyDispatcher, LobbyService } from '../../src/application/lobby';
import type { TransactionStore } from '../../src/application/ports';

const value = <T>(result: Result<T>): T => { if (!result.ok) throw new Error(result.error.code); return result.value; };
function fixture(count=3, capacity=count) {
  let room=value(newRoom('r','p1',capacity,'ABCDEFGH',0));
  for(let n=2;n<=count;n++) room=value(joinRoom(room,`p${n}`,'player',null,0));
  return room;
}
const job=(room:Room,kind:Deadline['kind']) => {
  const found=lobbyDeadlines(room,()=>`${kind}-${room.version}`).find(d=>d.kind===kind);
  if(!found)throw new Error(`Missing ${kind}`);return found;
};
function harness(initial:Room) {
  let room=structuredClone(initial);let now=0;let id=0;
  const records=new Map<string,{digest:string;transition:unknown}>();const events:unknown[]=[];
  const store:TransactionStore<Room>={async transact(command,decide){
    const previous=records.get(command.commandId);
    if(previous)return previous.digest===command.requestDigest?success(structuredClone(previous.transition) as never):failure('IDEMPOTENCY_CONFLICT');
    if(command.expectedVersion!==room.version)return failure('CONFLICT');
    const result=await decide(structuredClone(room));
    if(result.ok){room=result.value.state;events.push(...result.value.events);records.set(command.commandId,{digest:command.requestDigest,transition:structuredClone(result.value)});}
    return result;
  }};
  const service=new LobbyService(store,{now:()=>now},{next:()=>`e${++id}`});
  const command=(actorId:string,name:string)=>({aggregateId:'r',actorId,expectedVersion:room.version,commandId:name,requestDigest:name});
  return {service,store,events,room:()=>room,time:(t:number)=>{now=t;},command};
}
describe('Phase 3 actual lobby policy: AC-30–33 and TR-09/10',()=>{
  it('compacts survivors and appends earliest observer, using stable ID for equal arrival times',()=>{
    const full=fixture(4);const room={...full,observers:[{profileId:'o9',followedPlayerId:'p1',arrivalSequence:0,joinedAt:20},{profileId:'o2',followedPlayerId:'p1',arrivalSequence:1,joinedAt:20}]};
    const next=value(leaveRoom(room,'p2',100));
    expect(next.players.map(p=>p.profileId)).toEqual(['p1','p3','p4','o2']);
    expect(next.observers.map(p=>p.profileId)).toEqual(['o9']);expect(next.players[3].ready).toBe(false);
    expect(room.players).toHaveLength(4);
  });
  it('does not promote if room was not full, and creator has no departure privilege',()=>{
    const room={...fixture(3,4),observers:[{profileId:'o',followedPlayerId:'p1',arrivalSequence:0,joinedAt:0}]};
    const next=value(leaveRoom(room,'p1',10));expect(next.players.map(p=>p.profileId)).toEqual(['p2','p3']);expect(next.observers).toHaveLength(1);
  });
  it('rejects observers and outsiders changing readiness or player presence',()=>{
    const room={...fixture(),observers:[{profileId:'o',followedPlayerId:'p1',arrivalSequence:0,joinedAt:0}]};
    for(const actor of ['o','outsider']){expect(setReady(room,actor,true,0)).toEqual(failure('NOT_AUTHORIZED'));expect(presence(room,actor,true,0)).toEqual(failure('NOT_AUTHORIZED'));}
    expect(value(leaveRoom(room,'o',10)).observers).toHaveLength(0);
  });
  it('starts a five-second warning only at all-but-one, then locks immediately on final ready',()=>{
    let room=value(setReady(fixture(),'p1',true,100));expect(room.holdoutDueAt).toBeNull();
    room=value(setReady(room,'p2',true,200));expect(room.holdoutId).toBe('p3');expect(room.holdoutDueAt).toBe(5200);
    const stale=job(room,'holdout');room=value(setReady(room,'p3',true,5199));
    expect(room.status).toBe('countdown');expect(room.countdownDueAt).toBe(15199);expect(room.lockedRoster).toEqual(['p1','p2','p3']);
    expect(expireLobby(room,stale,5200)).toEqual(failure('CONFLICT'));
  });
  it('removes a holdout in larger rooms and locks remaining roster without promoting',()=>{
    let room=fixture();room=value(joinRoom(room,'o','observer','p1',0));room=value(setReady(room,'p1',true,0));room=value(setReady(room,'p2',true,0));
    expect(expireLobby(room,job(room,'holdout'),4999)).toEqual(failure('CONFLICT'));
    const next=value(expireLobby(room,job(room,'holdout'),5000));expect(next.players.map(p=>p.profileId)).toEqual(['p1','p2']);expect(next.observers).toHaveLength(1);expect(next.status).toBe('countdown');expect(next.countdownDueAt).toBe(15000);
  });
  it('retains exactly-two holdout without repeatedly warning and waits for both ready',()=>{
    let room=value(setReady(fixture(2),'p1',true,0));room=value(expireLobby(room,job(room,'holdout'),5000));
    expect(room.status).toBe('waiting');expect(room.players).toHaveLength(2);expect(room.holdoutDueAt).toBeNull();
    room=value(presence(room,'p1',true,10000));expect(lobbyDeadlines(room,()=> 'id').some(d=>d.kind==='holdout')).toBe(false);
    expect(value(setReady(room,'p2',true,20000)).status).toBe('countdown');
  });
  it('never substitutes after lock and closes if fewer than two original players remain at expiry',()=>{
    let room=fixture(2);room=value(joinRoom(room,'o','observer','p1',0));room=value(setReady(room,'p1',true,0));room=value(setReady(room,'p2',true,1));
    room=value(leaveRoom(room,'p1',2));expect(room.players.map(p=>p.profileId)).toEqual(['p2']);expect(room.observers[0].followedPlayerId).toBe('p1');
    const next=value(expireLobby(room,job(room,'countdown'),10001));expect(next.status).toBe('closed');expect(next.closedAt).toBe(10001);
  });
  it('starts with at least two original members and blocks late player admission',()=>{
    let room=fixture(2);room=value(setReady(room,'p1',true,0));room=value(setReady(room,'p2',true,0));
    expect(joinRoom(room,'new','player',null,1)).toEqual(failure('ROOM_CLOSED'));
    expect(value(expireLobby(room,job(room,'countdown'),10000)).status).toBe('playing');
  });
  it('prompts once after 30s, preserves the interval across presence, and resets on membership/readiness',()=>{
    let room=fixture();const old=job(room,'idle');room=value(presence(room,'p1',true,20000));
    expect(job(room,'idle').dueAt).toBe(30000);expect(expireLobby(room,old,30000)).toEqual(failure('CONFLICT'));
    expect(expireLobby(room,job(room,'idle'),29999)).toEqual(failure('CONFLICT'));
    room=value(expireLobby(room,job(room,'idle'),30000));expect(room.idlePromptedVersion).not.toBeNull();expect(lobbyDeadlines(room,()=> 'id').some(d=>d.kind==='idle')).toBe(false);
    room=value(presence(room,'p1',true,31000));expect(room.idlePromptedVersion).not.toBeNull();
    room=value(setReady(room,'p1',true,32000));expect(job(room,'idle').dueAt).toBe(62000);
  });
  it('disconnects retain membership for 120s, early reconnect cancels old job, and late reconnect fails',()=>{
    let room=value(presence(fixture(2),'p2',false,0));room=value(presence(room,'p1',false,1000));
    const deadline=job(room,'reconnect');expect(deadline.dueAt).toBe(120000); // p2 has an earlier lease
    room=value(presence(room,'p2',true,50000));room=value(presence(room,'p2',false,50000));expect(job(room,'reconnect').dueAt).toBe(121000);
    room=value(presence(room,'p1',true,120999));expect(expireLobby(room,deadline,121000)).toEqual(failure('CONFLICT'));
    expect(presence(room,'p2',true,170000)).toEqual(failure('CONFLICT'));
  });
  it('expires simultaneous player leases before deciding whether remaining players can start',()=>{
    let room=fixture();room=value(setReady(room,'p3',true,0));
    room={...room,players:room.players.map(p=>p.profileId==='p3'?{...p,lastSeenAt:100000}:{...p,disconnectedAt:0})};
    const next=value(expireLobby(room,job(room,'reconnect'),120000));expect(next.players.map(p=>p.profileId)).toEqual(['p3']);expect(next.status).toBe('waiting');expect(next.lockedRoster).toEqual([]);
  });
  it('closes an empty room at 30 minutes and a rejoin cancels its stale expiry',()=>{
    let room=fixture(1,2);room=value(leaveRoom(room,'p1',100));const deadline=job(room,'empty-room');expect(deadline.dueAt).toBe(1800100);
    expect(expireLobby(room,deadline,1800099)).toEqual(failure('CONFLICT'));expect(value(expireLobby(room,deadline,1800100)).status).toBe('closed');
    const rejoined=value(joinRoom(room,'p2','player',null,1000));expect(rejoined.emptySince).toBeNull();expect(expireLobby(rejoined,deadline,1800100)).toEqual(failure('CONFLICT'));
  });
  it('commits one canonical ready result/event and rejects a stale concurrent command without repeating it',async()=>{
    const h=harness(fixture(2));const command=h.command('p1','ready');const competing=h.command('p2','other');
    const accepted=await h.service.act(command,{type:'ready',ready:true});expect(accepted.ok).toBe(true);
    expect(await h.service.act(command,{type:'ready',ready:true})).toEqual(accepted);expect(h.events).toHaveLength(1);
    expect(await h.service.act(competing,{type:'ready',ready:true})).toEqual(failure('CONFLICT'));
    const expire=job(h.room(),'holdout');h.time(5000);const result=await h.service.expire(expire);expect(result.ok).toBe(true);expect(await h.service.expire(expire)).toEqual(result);expect(h.events).toHaveLength(2);
  });
  it('enforces overdue holdout under the action lock even when its worker is leased elsewhere',async()=>{
    let room=fixture();room=value(setReady(room,'p1',true,0));room=value(setReady(room,'p2',true,0));
    const h=harness(room);h.time(5001);const command=h.command('p3','late-ready');
    const result=await h.service.act(command,{type:'ready',ready:true});expect(result).toEqual(failure('NOT_AUTHORIZED'));
    expect(h.room().players.map(p=>p.profileId)).toEqual(['p1','p2']);expect(h.room().status).toBe('countdown');expect(h.events).toHaveLength(1);
    expect(await h.service.act(command,{type:'ready',ready:true})).toEqual(result);expect(h.events).toHaveLength(1);
    expect(joinRoom(room,'late','player',null,5001)).toEqual(failure('CONFLICT'));
  });
  it('settles equal countdown/reconnect deadlines identically regardless of which worker wins',()=>{
    const base=fixture(2);const room:Room={...base,status:'countdown',lockedRoster:['p1','p2'],countdownDueAt:120000,
      players:base.players.map(p=>p.profileId==='p2'?{...p,lastSeenAt:100000}:{...p,disconnectedAt:0})};
    const countdown=value(expireLobby(room,job(room,'countdown'),120000));
    const reconnect=value(expireLobby(room,job(room,'reconnect'),120000));
    expect(countdown).toEqual(reconnect);expect(countdown.status).toBe('closed');expect(countdown.players.map(p=>p.profileId)).toEqual(['p2']);
  });
  it('a delayed worker preserves an earlier countdown before a later disconnect expiry',()=>{
    const base=fixture(2);const room:Room={...base,status:'countdown',lockedRoster:['p1','p2'],countdownDueAt:10000,
      players:base.players.map(p=>p.profileId==='p2'?{...p,lastSeenAt:100000}:{...p,disconnectedAt:0})};
    const first=value(expireLobby(room,job(room,'countdown'),120000));const second=value(expireLobby(room,job(room,'reconnect'),120000));
    expect(first).toEqual(second);expect(first.status).toBe('playing');expect(first.players.map(p=>p.profileId)).toEqual(['p2']);
  });
  it('reconnect wins an equal holdout deadline and applies the exactly-two exception',()=>{
    let room=fixture();room=value(setReady(room,'p1',true,0));
    room={...room,players:room.players.map(p=>p.profileId==='p1'?{...p,disconnectedAt:0}:{...p,lastSeenAt:100000})};
    room=value(setReady(room,'p2',true,115000));
    const holdout=value(expireLobby(room,job(room,'holdout'),120000));const reconnect=value(expireLobby(room,job(room,'reconnect'),120000));
    expect(holdout).toEqual(reconnect);expect(holdout.status).toBe('waiting');expect(holdout.players.map(p=>p.profileId)).toEqual(['p2','p3']);
  });
  it('rejects admissions after empty expiry or lease expiry without cancelling those deadlines',()=>{
    const empty=value(leaveRoom(fixture(1,2),'p1',0));expect(joinRoom(empty,'p2','player',null,1800000)).toEqual(failure('CONFLICT'));
    expect(joinRoom(fixture(1,2),'p2','player',null,120000)).toEqual(failure('CONFLICT'));
  });
  it('acknowledges stale jobs but leaves failed commits leased for retry',async()=>{
    const h=harness(fixture());h.time(30000);const due=job(h.room(),'idle');
    const complete=vi.fn(async()=>success(undefined));const claim=vi.fn(async()=>success([due]));
    const dispatcher=new LobbyDispatcher({claim,complete},h.service,{now:()=>30000},{next:()=> 'lease'});
    expect(await dispatcher.drain()).toEqual(success(1));expect(complete).toHaveBeenCalledWith(due.id,'lease');
    expect(await dispatcher.drain()).toEqual(success(1));expect(h.events).toHaveLength(1); // canonical retry
    const broken=new LobbyService({transact:async()=>failure('TEMPORARY_UNAVAILABLE')},{now:()=>30000},{next:()=> 'id'});
    complete.mockClear();expect(await new LobbyDispatcher({claim,complete},broken,{now:()=>30000},{next:()=> 'lease'}).drain()).toEqual(failure('TEMPORARY_UNAVAILABLE'));expect(complete).not.toHaveBeenCalled();
  });
  it('detects silent loss at 45s, then retains the same roster position for a full 120s grace',()=>{
    let room=fixture(1,2);const detect=job(room,'reconnect');expect(detect.dueAt).toBe(45000);
    expect(expireLobby(room,detect,44999)).toEqual(failure('CONFLICT'));room=value(expireLobby(room,detect,45000));
    expect(room.players[0].disconnectedAt).toBe(45000);expect(job(room,'reconnect').dueAt).toBe(165000);
    const restored=value(presence(room,'p1',true,164999));expect(restored.players[0].disconnectedAt).toBeNull();expect(restored.players[0].profileId).toBe('p1');
    expect(value(expireLobby(room,job(room,'reconnect'),165000)).players).toEqual([]);
  });
  it('a delayed detector catches up detection and grace expiry at their original deadlines',()=>{
    const room=fixture(1,2);const next=value(expireLobby(room,job(room,'reconnect'),165000));expect(next.players).toEqual([]);expect(next.emptySince).toBe(165000);
    expect(job(next,'empty-room').dueAt).toBe(1965000);
  });
});
