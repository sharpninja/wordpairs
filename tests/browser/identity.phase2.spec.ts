import {test,expect} from '@playwright/test';
test('AC-21/46 concurrent fresh tabs create one browser credential before requests, surviving lost responses',async({context})=>{
  const received:string[]=[];let loseFirst=true;
  await context.route('**/api/session',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:401,json:{error:{code:'NOT_AUTHENTICATED'}}});
    const input=route.request().postDataJSON();received.push(input.guestCredential);
    if(loseFirst){loseFirst=false;return route.abort('failed');}
    return route.fulfill({json:{profile:{id:'guest-shared-browser',version:0,kind:'guest',alias:'Guest Shared',icon:'owl',publicLeaderboard:false,wins:0,points:0,earliestWinAt:null},guestCredential:input.guestCredential}});
  });
  const first=await context.newPage();const second=await context.newPage();
  await Promise.all([first.goto('/play'),second.goto('/play')]);
  await Promise.all([first.getByRole('button',{name:'Continue as guest'}).click(),second.getByRole('button',{name:'Continue as guest'}).click()]);
  await expect.poll(()=>received.length).toBe(2);
  expect(received[0]).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(received[1]).toBe(received[0]);
  await expect.poll(async()=>await first.getByText(/Could not continue as guest/).count()+await second.getByText(/Could not continue as guest/).count()).toBe(1);
  const failed=(await first.getByText(/Could not continue as guest/).count())?first:second;
  await expect(failed.getByText(/Could not continue as guest/)).toBeVisible();
  await failed.getByRole('button',{name:'Continue as guest'}).click();
  await expect(failed.getByText('Guest Shared',{exact:true})).toBeVisible();
  expect(received).toEqual([received[0],received[0],received[0]]);
  await first.reload();
  await first.getByRole('button',{name:'Continue as guest'}).click();
  await expect.poll(()=>received.length).toBe(4);
  expect(received[3]).toBe(received[0]);
});
