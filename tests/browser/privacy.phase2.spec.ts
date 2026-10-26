import {test,expect} from '@playwright/test';
test('AC-46 switching from a member to a guest clears private room projections, links and roster',async({page})=>{
  const reference='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';let identity='member-A';
  const profile=(id:string)=>({id,version:0,kind:id==='member-A'?'member':'guest',alias:id==='member-A'?'Player A':'Guest B',icon:'owl',publicLeaderboard:false,wins:0,points:0,earliestWinAt:null});
  await page.route('**/api/session',async route=>{
    if(route.request().method()==='DELETE'){identity='signed-out';return route.fulfill({status:204});}
    if(route.request().method()==='POST'){identity='guest-B';return route.fulfill({json:{profile:profile(identity),guestCredential:route.request().postDataJSON().guestCredential}});}
    return route.fulfill({json:{profile:profile(identity)}});
  });
  await page.route('**/api/realtime',route=>route.fulfill({status:503,json:{error:{code:'TEMPORARY_UNAVAILABLE'}}}));
  await page.route('**/api/rooms/**',route=>{
    if(identity!=='member-A')return route.fulfill({status:404,json:{error:{code:'NOT_FOUND'}}});
    if(route.request().method()==='POST')return route.fulfill({json:{url:'https://wordpairs.example.test/rooms/SECRET?invite=PRIVATE'}});
    return route.fulfill({json:{roomId:reference,version:0,capacity:4,status:'waiting',discoverable:false,availableSlots:3,code:'SECRET12',role:'player',actorId:'member-A',inviterId:null,followedPlayerId:null,players:[{id:'member-A',alias:'Private room player',icon:'owl',position:1,ready:false,connected:true}],observers:[],observerCount:0,canJoinPlayer:false,canObserve:false}});
  });
  await page.goto(`/rooms/${reference}`);
  await expect(page.getByText('SECRET12',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Create invitation link'}).click();
  await expect(page.getByLabel('Shareable invitation link')).toBeVisible();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.getByRole('button',{name:'Continue as guest'}).click();
  await expect(page.getByText('Guest B',{exact:true})).toBeVisible();
  await expect(page.getByText('Room not found or invitation expired.')).toBeVisible();
  await expect(page.getByText('SECRET12',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Private room player',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Shareable invitation link')).toHaveCount(0);
});
test('AC-37 stalled room creation releases busy state and retries the identical command',async({page})=>{
  const bodies:unknown[]=[];
  await page.route('**/api/session',route=>route.fulfill({json:{profile:{id:'p1',kind:'guest',alias:'Guest Cedar',icon:'owl',version:0,publicLeaderboard:false,wins:0,points:0,earliestWinAt:null}}}));
  await page.route('**/api/rooms',route=>{bodies.push(route.request().postDataJSON());if(bodies.length===1)return;return route.fulfill({status:503,json:{error:{code:'SERVICE_LIMIT'}}});});
  await page.goto('/play');await page.getByRole('button',{name:'Create room',exact:true}).click();
  const retry=page.getByRole('button',{name:'Retry room creation'});await expect(retry).toBeEnabled({timeout:12000});await retry.click();
  await expect.poll(()=>bodies.length).toBe(2);expect(bodies[0]).toEqual(bodies[1]);
});
