import {test,expect} from '@playwright/test';
const roomId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const profile={id:'observer-1',version:0,kind:'guest',alias:'Guest Cedar',icon:'owl',publicLeaderboard:false,wins:0,points:0,earliestWinAt:null};
const players=[{id:'p1',alias:'Player Oak',icon:'owl',position:1,ready:false,connected:true},{id:'p2',alias:'Player Elm',icon:'fox',position:2,ready:false,connected:true}];
test('AC-26/27 signed full-room link bypasses browsing and keeps the inviter binding through observer entry',async({page})=>{
  const joins:Record<string,unknown>[]=[];const landing:string[]=[];let joined=false;
  await page.route('**/api/session',route=>route.fulfill({json:{profile}}));
  await page.route('**/api/realtime',route=>route.fulfill({status:503,json:{error:{code:'TEMPORARY_UNAVAILABLE'}}}));
  await page.route('**/api/landing*',route=>{landing.push(route.request().url());return route.fulfill({status:503});});
  await page.route('**/api/rooms/**',async route=>{
    if(route.request().method()==='POST'){joins.push(route.request().postDataJSON());joined=true;return route.fulfill({json:{roomId,membership:'observer',version:2}});}
    return route.fulfill({json:{roomId,version:joined?2:1,capacity:2,status:'waiting',discoverable:false,availableSlots:0,role:joined?'observer':null,actorId:profile.id,inviterId:'p2',followedPlayerId:joined?'p2':null,players,observers:joined?[{id:profile.id,alias:profile.alias,icon:'owl',follows:'p2'}]:[],observerCount:joined?1:0,canJoinPlayer:false,canObserve:!joined}});
  });
  await page.goto(`/rooms/ABCDEFGH?invite=${'i'.repeat(43)}`);
  await expect(page.getByRole('button',{name:'Join as observer'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Join as player'})).toHaveCount(0);
  await expect(page.getByLabel('Who invited you?')).toHaveCount(0);
  await expect(page.getByText('Invited by Player Elm')).toBeVisible();
  await page.getByRole('button',{name:'Join as observer'}).click();
  await expect(page.getByText(/Read-only observer · Following Player Elm/)).toBeVisible();
  expect(joins).toHaveLength(1);expect(joins[0]).toMatchObject({action:'join',mode:'observer',inviterId:'p2',expectedProfileId:'observer-1',expectedVersion:1});
  expect(landing).toEqual([]);
});
test('AC-25/27 manual code entry offers current players as inviter choices without consuming a player slot',async({page})=>{
  let join:Record<string,unknown>|null=null;
  await page.route('**/api/session',route=>route.fulfill({json:{profile}}));
  await page.route('**/api/rooms/**',async route=>{
    if(route.request().method()==='POST'){join=route.request().postDataJSON();return route.fulfill({json:{roomId,membership:'observer',version:2}});}
    return route.fulfill({json:{roomId,version:1,capacity:2,status:'waiting',discoverable:false,availableSlots:0,role:null,actorId:profile.id,inviterId:null,followedPlayerId:null,players,observers:[],observerCount:0,canJoinPlayer:false,canObserve:true}});
  });
  await page.goto('/rooms/ABCDEFGH');
  const observe=page.getByRole('button',{name:'Join as observer'});await expect(observe).toBeDisabled();
  await page.getByLabel('Who invited you?').selectOption('p1');await observe.click();
  await expect.poll(()=>join).toMatchObject({mode:'observer',inviterId:'p1'});
  await expect(page.getByText('2 / 2 players · 0 open player slots · waiting')).toBeVisible();
});
test('AC-24 creation uses private defaults and retains an uncertain command for a safe explicit retry',async({page})=>{
  const commands:Record<string,unknown>[]=[];
  await page.route('**/api/session',route=>route.fulfill({json:{profile}}));
  await page.route('**/api/rooms',async route=>{commands.push(route.request().postDataJSON());return route.fulfill({status:503,json:{error:{code:'SERVICE_LIMIT'}}});});
  await page.goto('/play');
  await expect(page.getByLabel('List this room on the community board')).not.toBeChecked();
  await page.getByLabel('Maximum players (2–25)').fill('25');
  await page.getByRole('button',{name:'Create room',exact:true}).click();
  await page.getByRole('button',{name:'Retry room creation'}).click();
  await expect.poll(()=>commands.length).toBe(2);
  expect(commands[0]).toEqual(commands[1]);expect(commands[0]).toMatchObject({capacity:25,discoverable:false,expectedProfileId:profile.id});
});
