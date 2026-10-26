import { expect,it } from 'vitest';
import { MatchService } from '../../src/application/matches';
import { buildCatalog } from '../../src/domain/catalog';
import { createMatch } from '../../src/domain/match';
import type { Category,Match,Pair,Room } from '../../src/domain/model';
import type { TransactionStore } from '../../src/application/ports';
import { failure,success,type Result } from '../../src/domain/result';
const val=<T>(r:Result<T>)=>{if(!r.ok)throw new Error(r.error.code);return r.value;};
function fixture(){
  const categories:Category[]=Array.from({length:6},(_,i)=>({id:`c${i}`,version:0,name:`Category${i}`,backgroundId:`art${i}`,approved:true}));
  const pairs:Pair[]=categories.map(c=>({id:c.id,version:0,categoryId:c.id,prompt:'Prompt',target:'cat',acceptedAnswers:['kitty'],hints:['one','two','three'],backgroundId:c.backgroundId,approved:true}));const catalog=val(buildCatalog(categories,pairs));let match=val(createMatch('m','r',['p1','p2'],{integer:a=>a},0));let now=0;let id=0;const events:unknown[]=[];const records=new Map<string,unknown>();
  const store:TransactionStore<Match>={async transact(command,decide){const previous=records.get(command.commandId);if(previous)return previous as never;if(command.expectedVersion!==match.version)return failure('CONFLICT');const result=await decide(structuredClone(match));if(result.ok){match=result.value.state;events.push(...result.value.events);records.set(command.commandId,structuredClone(result));}return result;}};
  const repository={...store,get:async()=>success(match),ensure:async(_roomId:string,_factory:(r:Room)=>Result<Match>)=>success(match)};
  const service=new MatchService(repository,{read:async()=>success(catalog)},{now:()=>now},{next:()=>`id${++id}`},{integer:a=>a});
  const command=(actorId='p1',name=`cmd${++id}`)=>({aggregateId:'m',actorId,commandId:name,expectedVersion:match.version,requestDigest:name});
  return {service,command,events,time:(t:number)=>{now=t;},match:()=>match};
}
it('canonically replays correct scoring and returns no answer/guess text in transport results or event payloads',async()=>{
  const h=fixture();expect((await h.service.act(h.command(),{type:'choose',categoryId:'c0'})).ok).toBe(true);h.time(1000);const roundId=h.match().rounds[0].id;const command=h.command('p1','solve');
  const first=await h.service.act(command,{type:'answer',roundId,stage:0,answer:'cat'});expect(first.ok&&first.value.correct).toBe(true);expect(await h.service.act(command,{type:'answer',roundId,stage:0,answer:'cat'})).toEqual(first);
  expect(h.match().rounds[0].solves).toHaveLength(1);expect(h.events).toHaveLength(2);expect(JSON.stringify([first,h.events])).not.toContain('cat');
});
it('commits authoritative stage catch-up while canonically rejecting an answer sent at its deadline',async()=>{
  const h=fixture();await h.service.act(h.command(),{type:'choose',categoryId:'c0'});const roundId=h.match().rounds[0].id;h.time(20000);const command=h.command();
  expect(await h.service.act(command,{type:'answer',roundId,stage:0,answer:'cat'})).toEqual(failure('CONFLICT'));expect(h.match().rounds[0].stage).toBe(1);expect(h.events).toHaveLength(2);
  expect(await h.service.act(command,{type:'answer',roundId,stage:0,answer:'cat'})).toEqual(failure('CONFLICT'));expect(h.events).toHaveLength(2);
});
it('returns repository conflicts without repeating a solve, and denies non-roster commands',async()=>{
  const h=fixture();const stale=h.command();await h.service.act(h.command(),{type:'choose',categoryId:'c0'});expect(await h.service.act(stale,{type:'choose',categoryId:'c0'})).toEqual(failure('CONFLICT'));
  expect(await h.service.act(h.command('observer'),{type:'answer',roundId:h.match().rounds[0].id,stage:0,answer:'cat'})).toEqual(failure('NOT_AUTHORIZED'));
});
