import { test,expect,type BrowserContext } from '@playwright/test';
import { LobbyService } from '../../src/application/lobby';
import type { TransactionStore } from '../../src/application/ports';
import { roomProjection } from '../../src/application/rooms';
import { expireLobby,lobbyDeadlines } from '../../src/domain/lobby';
import { joinRoom,newRoom } from '../../src/domain/rooms';
import { failure,success,type Result } from '../../src/domain/result';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const value=<T>(r:Result<T>)=>{if(!r.ok)throw new Error(r.error.code);return r.value;};
function fixture(){
  let room=value(newRoom(id,'p1',2,'ABCDEFGH',1000));room=value(joinRoom(room,'p2','player',null,1000));room=value(joinRoom(room,'o1','observer','p1',1000));let now=1000;let serial=0;
  const records=new Map<string,unknown>();
  const store:TransactionStore<typeof room>={async transact(command,decide){const old=records.get(command.commandId);if(old)return old as never;if(command.expectedVersion!==room.version)return failure('CONFLICT');const result=await decide(structuredClone(room));if(result.ok){room=result.value.state;records.set(command.commandId,structuredClone(result));}return result;}};
  const presenceStore:TransactionStore<typeof room>={transact:(command,decide)=>store.transact({...command,expectedVersion:room.version},decide)};
  const lobby=new LobbyService(store,{now:()=>now},{next:()=>`browser-${++serial}`},presenceStore);
  async function connect(context:BrowserContext,actor:string,failFirst=false){let failed=false;const writes:Record<string,unknown>[]=[];
    const profile={id:actor,version:0,kind:'guest',alias:`Guest ${actor}`,icon:'owl',publicLeaderboard:false,wins:0,points:0,earliestWinAt:null};
    await context.route('**/api/session',route=>route.fulfill({json:{profile}}));
    await context.route('**/api/realtime',route=>route.fulfill({status:503,json:{error:{code:'TEMPORARY_UNAVAILABLE'}}}));
    await context.route('**/api/rooms/**',async route=>{
      if(route.request().method()==='POST'){
        const body=route.request().postDataJSON();writes.push(body);
        const action=body.action==='ready'?{type:'ready' as const,ready:body.ready}:body.action==='leave'?{type:'leave' as const}:{type:'presence' as const,connected:body.connected};
        const result=await lobby.act({aggregateId:id,actorId:actor,commandId:body.commandId,expectedVersion:body.expectedVersion,requestDigest:JSON.stringify(action)},action);
        if(failFirst&&!failed){failed=true;return route.fulfill({status:503,json:{error:{code:'TEMPORARY_UNAVAILABLE'}}});}
        return route.fulfill({status:result.ok?200:result.error.code==='CONFLICT'?409:403,json:result.ok?result.value:result});
      }
      return route.fulfill({json:{...roomProjection(room,actor,room.players.map(p=>({id:p.profileId,alias:`Guest ${p.profileId}`,icon:'owl'}))),actorId:actor,inviterId:null,serverNow:now}});
    });
    return writes;
  }
  function advance(ms:number){now+=ms;const due=lobbyDeadlines(room,()=> 'tick').filter(d=>d.dueAt<=now).sort((a,b)=>a.dueAt-b.dueAt)[0];if(due)room=value(expireLobby(room,due,now));}
  return {connect,advance,room:()=>room};
}
test('two actual clients ready, lock their roster and close below two without promoting the observer',async({browser})=>{
  const state=fixture();const first=await browser.newContext();const second=await browser.newContext();const observer=await browser.newContext();
  try{
    await state.connect(first,'p1');await state.connect(second,'p2');await state.connect(observer,'o1');const a=await first.newPage();const b=await second.newPage();const o=await observer.newPage();
    await Promise.all([a.goto(`/rooms/${id}`),b.goto(`/rooms/${id}`),o.goto(`/rooms/${id}`)]);
    await expect(o.getByRole('button',{name:'Mark ready',exact:true})).toHaveCount(0);await expect(o.getByText(/Read-only observer/)).toBeVisible();
    await a.getByRole('button',{name:'Mark ready',exact:true}).click();await b.getByRole('button',{name:'Refresh room'}).click();
    await expect(b.getByRole('alert').filter({hasText:'The room will wait for both players.'})).toBeVisible();
    await b.getByRole('button',{name:'Mark ready',exact:true}).click();await expect(b.getByText(/Roster locked/)).toBeVisible();
    await a.getByRole('button',{name:'Refresh room'}).click();await a.getByRole('button',{name:'Leave room',exact:true}).click();await expect(a).toHaveURL(/\/play$/);
    expect(state.room().players.map(p=>p.profileId)).toEqual(['p2']);expect(state.room().observers.map(p=>p.profileId)).toEqual(['o1']);
    state.advance(10000);await b.getByRole('button',{name:'Refresh room'}).click();await expect(b.getByText(/This room closed/)).toBeVisible();expect(state.room().status).toBe('closed');
  }finally{await Promise.all([first.close(),second.close(),observer.close()]);}
});
test('uncertain readiness retains its canonical request and blocks conflicting controls until retry',async({browser})=>{
  const state=fixture();const context=await browser.newContext();try{
    const writes=await state.connect(context,'p1',true);const page=await context.newPage();await page.clock.install();await page.goto(`/rooms/${id}`);await page.getByRole('button',{name:'Mark ready',exact:true}).click();
    await expect(page.getByRole('button',{name:'Retry pending room request'})).toBeVisible();await expect(page.getByRole('button',{name:'Leave room'})).toBeDisabled();
    for(let tick=0;tick<9;tick++){state.advance(20000);await page.clock.fastForward(20000);await expect.poll(()=>writes.filter(w=>w.action==='presence').length).toBe(tick+1);await expect(page.locator('.room-panel')).toHaveAttribute('data-room-version',String(state.room().version));}
    expect(state.room().players.some(p=>p.profileId==='p1')).toBe(true);await expect(page.getByRole('button',{name:'Retry pending room request'})).toBeVisible();
    await page.getByRole('button',{name:'Retry pending room request'}).click();await expect(page.getByRole('button',{name:'Not ready yet',exact:true})).toBeVisible();const ready=writes.filter(w=>w.action==='ready');expect(ready).toHaveLength(2);expect(ready[0]).toEqual(ready[1]);
  }finally{await context.close();}
});
