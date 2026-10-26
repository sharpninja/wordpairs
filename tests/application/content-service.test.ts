import { expect,it } from 'vitest';
import { ContentService,type ContentAction,type ContentPort,type ContentContext } from '../../src/application/content';
import { emptyContent,type ContentState } from '../../src/domain/content';
import { buildCatalog } from '../../src/domain/catalog';
import { failure,success,type Result } from '../../src/domain/result';
import type { Command,Transition } from '../../src/application/ports';
import seed from '../../src/infrastructure/catalog-seed.json';
const val=<T>(r:Result<T>)=>{if(!r.ok)throw new Error(r.error.code);return r.value;};
it('AC-19/47 commits audited suggestions once, retains canonical retry, rejects stale and rolls back failed storage',async()=>{
 let state=emptyContent();let fail=false;let evidence:ContentContext={actor:{profileId:'p1',roles:['player']},wins:10,catalog:val(buildCatalog(seed.categories,seed.pairs as never))};const records=new Map<string,unknown>();const audits:unknown[]=[];
 const repo:ContentPort={read:async()=>success({state,evidence}),async transact<T>(command:Command,action:ContentAction,decide:(state:ContentState,evidence:ContentContext)=>Promise<Result<Transition<ContentState,T>>>){const prior=records.get(command.commandId);if(prior)return prior as Result<Transition<ContentState,T>>;if(command.expectedVersion!==state.version)return failure('CONFLICT');const next=await decide(structuredClone(state),evidence);if(!next.ok||fail)return fail?failure('TEMPORARY_UNAVAILABLE'):next;state=next.value.state;audits.push(...next.value.audits);records.set(command.commandId,next);return next;}};
 let serial=0;const service=new ContentService(repo,{now:()=>1000},{next:()=>`e-${++serial}`});const command={aggregateId:'content-catalog',actorId:'p1',commandId:'one',expectedVersion:0,requestDigest:'suggest'};const action={type:'suggest' as const,proposal:{category:'Weather pairs',pairs:[{prompt:'Rain',target:'Wet'},{prompt:'Sun',target:'Warm'},{prompt:'Snow',target:'Cold'}]}};
 const result=await service.act(command,action);expect(result.ok).toBe(true);expect(await service.act(command,action)).toEqual(result);expect(audits).toHaveLength(1);expect(state.cases).toHaveLength(1);expect((await service.view('p1')).ok).toBe(true);expect(await service.act({...command,commandId:'stale'},action)).toEqual(failure('CONFLICT'));
 evidence={...evidence,actor:{profileId:'m1',roles:['moderator']}};const review={aggregateId:'content-catalog',actorId:'m1',commandId:'review',expectedVersion:1,requestDigest:'approve'};fail=true;expect(await service.act(review,{type:'review',caseId:state.cases[0].id,decision:'approve',reason:'Verified'})).toEqual(failure('TEMPORARY_UNAVAILABLE'));expect(state.cases[0].status).toBe('pending');expect(audits).toHaveLength(1);fail=false;expect((await service.act(review,{type:'review',caseId:state.cases[0].id,decision:'approve',reason:'Verified'})).ok).toBe(true);expect(audits).toHaveLength(2);expect(state.publications).toEqual([]);
});
