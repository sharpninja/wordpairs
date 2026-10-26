import { test, expect, type BrowserContext } from '@playwright/test';
import { MatchService, type MatchAction } from '../../src/application/matches';
import { roomProjection } from '../../src/application/rooms';
import type { TransactionStore } from '../../src/application/ports';
import { buildCatalog } from '../../src/domain/catalog';
import { createMatch } from '../../src/domain/match';
import type { Match, Room } from '../../src/domain/model';
import { newRoom, joinRoom } from '../../src/domain/rooms';
import { failure, success, type Result } from '../../src/domain/result';
import seed from '../../src/infrastructure/catalog-seed.json' with { type: 'json' };
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const value=<T>(r:Result<T>)=>{if(!r.ok)throw new Error(r.error.code);return r.value;};
// Disclosed HTTP seam: actual MatchService/catalog/domain; in-memory transaction port.
function fixture(){
  const catalog=value(buildCatalog(seed.categories,seed.pairs as never));
  let now=1000;let serial=0;
  let room:Room=value(joinRoom(value(joinRoom(value(newRoom(id,'p1',2,'ABCDEFGH',now)),'p2','player',null,now)),'o1','observer','p1',now));
  room={...room,status:'playing',startedRoster:['p1','p2'],startedAt:now};
  let match=value(createMatch(id,id,['p1','p2'],{integer:a=>a},now));
  const records=new Map<string,unknown>();
  const store:TransactionStore<Match>={async transact(command,decide){const previous=records.get(command.commandId);if(previous)return previous as never;if(command.expectedVersion!==match.version)return failure('CONFLICT');const result=await decide(structuredClone(match));if(result.ok){match=result.value.state;records.set(command.commandId,structuredClone(result));}return result;}};
  const service=new MatchService({...store,get:async()=>success(match),ensure:async()=>success(match)},{read:async()=>success(catalog)},{now:()=>now},{next:()=>`browser-game-${++serial}`},{integer:a=>a});
  async function connect(context:BrowserContext,actor:string,failAnswer=false){let failed=false;const writes:Record<string,unknown>[]=[];
    const labels=['p1','p2','o1'].map(id=>({id,alias:`Guest ${id}`,icon:'owl'}));
    await context.route('**/api/session',route=>route.fulfill({json:{profile:{...labels.find(p=>p.id===actor),version:0,kind:'guest',publicLeaderboard:false,wins:0,points:0,earliestWinAt:null}}}));
    await context.route('**/api/realtime',route=>route.fulfill({status:503,json:{error:{code:'TEMPORARY_UNAVAILABLE'}}}));
    await context.route('**/api/rooms/**',async route=>{
      if(new URL(route.request().url()).pathname.endsWith('/match')){
        if(route.request().method()==='GET'){const view=await service.view(room,actor);return route.fulfill({status:view.ok?200:403,json:view.ok?{...view.value,actorId:actor,role:actor==='o1'?'observer':'player',labels,serverNow:now}:view});}
        const body=route.request().postDataJSON();writes.push(body);
        const action:MatchAction=body.action==='choose'?{type:'choose',categoryId:body.categoryId}:body.action==='continue'?{type:'continue'}:{type:'answer',roundId:body.roundId,stage:body.stage,answer:body.answer};
        const result=await service.act({aggregateId:id,actorId:actor,expectedVersion:body.expectedVersion,commandId:body.commandId,requestDigest:JSON.stringify(action)},action);
        if(failAnswer&&!failed&&body.action==='answer'){failed=true;return route.fulfill({status:503,json:{error:{code:'TEMPORARY_UNAVAILABLE'}}});}
        return route.fulfill({status:result.ok?200:result.error.code==='CONFLICT'?409:403,json:result.ok?result.value:result});
      }
      if(route.request().method()==='POST')return route.fulfill({json:{roomId:id,version:room.version}});
      return route.fulfill({json:{...roomProjection(room,actor,labels),actorId:actor,inviterId:null,serverNow:now}});
    });return writes;
  }
  async function advance(ms:number){now+=ms;room={...room,players:room.players.map(p=>({...p,lastSeenAt:now}))};const round=match.rounds.at(-1);if(round&&match.status==='playing'&&now>=round.stageDueAt)value(await service.expire({id:`tick-${++serial}`,aggregateId:id,kind:'stage',expectedVersion:match.version,dueAt:round.stageDueAt}));}
  return {connect,advance,match:()=>match,answer:()=>catalog.pairs.find(p=>p.id===match.rounds.at(-1)?.pairId)?.target as string};
}
test('actual players and bound observer preserve solved hints, scoring and the same uncertain answer retry',async({browser})=>{
  const state=fixture();const contexts=await Promise.all([browser.newContext(),browser.newContext(),browser.newContext()]);
  try{
    const writes=await state.connect(contexts[0],'p1',true);await state.connect(contexts[1],'p2');await state.connect(contexts[2],'o1');const [a,b,o]=await Promise.all(contexts.map(c=>c.newPage()));
    await Promise.all([a.goto(`/rooms/${id}`),b.goto(`/rooms/${id}`),o.goto(`/rooms/${id}`)]);
    await expect(a.getByRole('heading',{name:'Choose a category'})).toBeVisible();await expect(b.getByRole('heading',{name:'Choose a category'})).toHaveCount(0);await a.getByRole('button',{name:'Opposites',exact:true}).click();
    await expect(a.getByLabel('Your answer', {exact:true})).toBeVisible();await a.getByLabel('Your answer',{exact:true}).fill(state.answer());await a.getByRole('button',{name:'Submit answer',exact:true}).click();
    await expect(a.getByRole('button',{name:'Retry pending game request'})).toBeVisible();await a.getByRole('button',{name:'Retry pending game request'}).click();await expect(a.getByText(/Your score is locked/).first()).toBeVisible();
    const answers=writes.filter(w=>w.action==='answer');expect(answers).toHaveLength(2);expect(answers[0]).toEqual(answers[1]);
    await state.advance(20000);await Promise.all([a.getByRole('button',{name:'Refresh game',exact:true}).click(),b.getByRole('button',{name:'Refresh game',exact:true}).click(),o.getByRole('button',{name:'Refresh game',exact:true}).click()]);
    await expect(b.getByRole('list',{name:'Your visible hints'})).toBeVisible();await expect(a.getByRole('list',{name:'Your visible hints'})).toHaveCount(0);await expect(o.getByRole('list',{name:'Your visible hints'})).toHaveCount(0);await expect(o.getByRole('button',{name:'Submit answer',exact:true})).toHaveCount(0);await expect(o.getByText('Correct answer:',{exact:false})).toHaveCount(0);
    await b.getByLabel('Your answer',{exact:true}).fill(state.answer());await b.getByRole('button',{name:'Submit answer',exact:true}).click();await expect(b.getByText('Correct answer:',{exact:false})).toBeVisible();expect(state.match().rounds[0].solves.map(s=>s.points)).toEqual([5,3]);
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});
test('eight authoritative no-solver rounds show uniform category continuation, reveal and shared final ranking on a phone',async({browser})=>{
  const state=fixture();const context=await browser.newContext({viewport:{width:390,height:844}});try{
    await state.connect(context,'p1');const page=await context.newPage();await page.goto(`/rooms/${id}`);await page.getByRole('button',{name:'Heroes and Villains',exact:true}).click();
    for(let round=1;round<=8;round++){
      await state.advance(80000);await page.getByRole('button',{name:'Refresh game',exact:true}).click();await expect(page.getByText('Correct answer:',{exact:false})).toBeVisible();
      if(round<8){await expect(page.getByText(/next category was drawn uniformly/)).toBeVisible();await page.getByRole('button',{name:'Play next round',exact:true}).click();await expect(page.locator('.game-panel')).toHaveAttribute('data-match-version',String(state.match().version));}
    }
    await expect(page.getByRole('heading',{name:'Final standings',exact:true})).toBeVisible();await expect(page.getByText(/Eight rounds complete/)).toBeVisible();await expect(page.getByRole('table',{name:'Final ranking'}).getByRole('cell',{name:'1',exact:true})).toHaveCount(2);expect(state.match().rounds).toHaveLength(8);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{await context.close();}
});
