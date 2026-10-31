import { expect, test } from "@playwright/test";
const profile={id:"owner",version:0,kind:"member",alias:"Admin Navigation",icon:"owl",publicLeaderboard:false,wins:0,points:0,earliestWinAt:null};
test("GA-10 admin context does not appear in the public guest leaderboard",async({page})=>{
 await page.route("**/api/admin/session",r=>r.fulfill({json:{profile,permissions:["moderate","manage-content"]}}));
 await page.route("**/api/content",r=>r.fulfill({json:{actorId:profile.id,version:0,canModerate:true,cases:[],categories:[],catalogPairs:[]}}));
 // Disclosed rendering fixture. The real PostgreSQL public query is verified
 // separately with both owner and legacy members still present in storage.
 await page.route("**/api/landing?*",r=>r.fulfill({headers:{"X-Leaderboard-Revision":"1","X-Lobby-Revision":"1"},json:{leaderboard:[{alias:"Guest Leader",wins:1,points:5}],lobbies:[],rules:{version:"2.8",updated:"2026-10-31"}}}));
 await page.goto("/admin");
 await expect(page.getByText(profile.alias,{exact:true})).toBeVisible();
 await page.goto("/?seatLost=1");
 await expect(page.getByText("Guest Leader",{exact:true})).toBeVisible();
 await expect(page.getByText(profile.alias,{exact:true})).toHaveCount(0);
 await expect(page.getByText("PRIVATE-LEGACY-ADMIN",{exact:true})).toHaveCount(0);
});
test("public player navigation ignores admin grants and exposes guest play only",async({page})=>{
 await page.route("**/api/session",r=>r.fulfill({json:{profile:{...profile,kind:"guest"},permissions:["moderate","manage-content","manage-users"]}}));
 await page.goto("/play");
 await expect(page.getByText(profile.alias,{exact:true})).toBeVisible();
 await page.getByText("Profile details",{exact:true}).click();
 await expect(page.getByRole("link",{name:"Administration",exact:true})).toHaveCount(0);
 await expect(page.getByRole("link",{name:/ChatGPT|GitHub|Community content/})).toHaveCount(0);
 await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
});
test("admin entry has no guest continuation and explains failed GitHub callbacks",async({page})=>{
 await page.route("**/api/admin/session",r=>r.fulfill({status:401,json:{}}));
 await page.goto("/admin?auth=failed");
 await expect(page.getByRole("alert").filter({hasText:"GitHub sign-in was not accepted"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Continue as guest"})).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Sign in with GitHub"})).toBeDisabled();
 await expect(page.getByText("GitHub administrator sign-in is being configured.")).toBeVisible();
 await expect(page.getByRole("navigation",{name:"Administration",exact:true})).toHaveCount(0);
});
test("admin authorization loss, failed session refresh and logout remove privileged links",async({page})=>{
 let status=200;let permissions=["moderate","manage-content","resolve-appeals"];
 await page.route("**/api/admin/session",r=>{
  if(r.request().method()==="DELETE"){status=401;return r.fulfill({status:204});}
  return r.fulfill({status,json:status===200?{profile,permissions}:{}});
 });
 await page.route("**/api/content",r=>r.fulfill({json:{actorId:profile.id,version:0,canModerate:true,cases:[],categories:[],catalogPairs:[]}}));
 await page.goto("/admin");
 const nav=page.getByRole("navigation",{name:"Administration",exact:true});
 await expect(nav.getByRole("link",{name:"Word pairs and hints"})).toBeVisible();
 await expect(nav.getByRole("link",{name:"Users and access"})).toHaveCount(0);
 permissions=[];
 await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect(nav).toHaveCount(0);
 permissions=["moderate"];await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect(nav).toBeVisible();
 status=503;await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect(nav).toHaveCount(0);
 await expect(page.getByRole("alert").filter({hasText:"Your profile is unavailable"})).toBeVisible();
 status=200;await page.getByRole("button",{name:"Retry profile"}).click();
 await expect(nav).toBeVisible();
 await page.getByRole("button",{name:"Sign out",exact:true}).click();
 await expect(nav).toHaveCount(0);
 await expect(page.getByText(/restricted to the GitHub account sharpninja/)).toBeVisible();
});
