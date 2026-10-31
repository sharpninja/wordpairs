import { expect, test } from "@playwright/test";
// Former multi-role community publishing journeys are retained in docs/testing/historical/content.phase5.spec.ts.txt.
test("guest release disables community content entry instead of exposing secured submission forms",async({page,request})=>{
 await page.route("**/api/session",r=>r.fulfill({status:401,json:{}}));
 await page.goto("/content");
 await expect(page).toHaveURL(/\/play$/);
 await expect(page.getByRole("button",{name:"Continue as guest"})).toBeVisible();
 await expect(page.getByLabel("Proposed category")).toHaveCount(0);
 await expect(page.getByRole("link",{name:"Community content",exact:true})).toHaveCount(0);
 expect((await request.get("/api/content")).status()).toBeGreaterThanOrEqual(400);
});
