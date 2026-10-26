import type { Room,Match } from '../../src/domain/model';
import { expect,it } from 'vitest';
import { ReactionService,type ReactionPort } from '../../src/application/reactions';
import { emptyReactions,type ReactionState } from '../../src/domain/reactions';
import { newRoom,joinRoom } from '../../src/domain/rooms';
import { createMatch } from '../../src/domain/match';
import { failure,success,type Result } from '../../src/domain/result';
import type { Command,Transition } from '../../src/application/ports';
const val=<T>(r:Result<T>)=>{if(!r.ok)throw new Error(r.error.code);return r.value;};
it('AC-29 canonical retry emits once without state/score mutation; observer cannot send and expired events vanish',async()=>{
 let room=val(joinRoom(val(joinRoom(val(newRoom('r','p1',2,'ABCDEFGH',0)),'p2','player',null,0)),'o1','observer','p1',0));room={...room,status:'playing'};const match={...val(createMatch('r','r',['p1','p2'],{integer:a=>a},0)),status:'playing' as const,rounds:[{id:'round',pairId:'pair',pairVersion:0,categoryId:'c',startedAt:0,stage:0,stageDueAt:20000,submittedPlayerIds:[],solves:[],revealed:false}]};let state=emptyReactions('r');let now=1000;const records=new Map<string,unknown>();const events:unknown[]=[];
 const repo:ReactionPort={read:async()=>success({state,room,match}),async transact<T>(command:Command,decide:(state:ReactionState,roomState:Room,matchState:Match)=>Promise<Result<Transition<ReactionState,T>>>){const prior=records.get(command.commandId);if(prior)return prior as Result<Transition<ReactionState,T>>;const next=await decide(structuredClone(state),room,match);if(next.ok){state=next.value.state;events.push(...next.value.events);records.set(command.commandId,next);}return next;}};
 let serial=0;const service=new ReactionService(repo,{now:()=>now},{next:()=>`r-${++serial}`});const command={aggregateId:'r',actorId:'p1',commandId:'one',requestDigest:'thumb',expectedVersion:0};const before=structuredClone({room,match});const first=await service.send(command,'👍');expect(first.ok).toBe(true);expect(await service.send(command,'👍')).toEqual(first);expect(events).toHaveLength(1);expect({room,match}).toEqual(before);expect(await service.send({...command,actorId:'o1',commandId:'observer'},'👍')).toEqual(failure('NOT_AUTHORIZED'));expect(val(await service.view('r','o1')).reactions).toHaveLength(1);now=6000;expect(val(await service.view('r','o1')).reactions).toEqual([]);
});
