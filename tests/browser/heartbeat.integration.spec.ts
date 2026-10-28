import { randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("LIVE unread-body control and production heartbeat completion through real HTTP", async ({ page, context }, info) => {
  const origin = process.env.WORDPAIRS_LIVE_ORIGIN!;
  const roomId = randomUUID();
  const guest = await context.request.post("/api/session", { headers: { Origin: origin }, data: { guestCredential: randomBytes(32).toString("base64url") } });
  expect(guest.status()).toBe(200);
  const profileId = (await guest.json()).profile.id;
  const created = await context.request.post("/api/rooms", { headers: { Origin: origin }, data: { action: "create", roomId, capacity: 2, commandId: randomUUID(), expectedProfileId: profileId } });
  expect(created.status()).toBe(200);
  try {
    await page.goto(`/rooms/${roomId}`);
    await expect(page.getByText("● Live updates connected", { exact: true })).toBeVisible();
    const unreadMarker = randomUUID();
    const unreadFailure = page.waitForEvent("requestfailed", { predicate: (r) => r.url().includes(unreadMarker), timeout: 5000 });
    const unread = await page.evaluate(async (marker) => {
      const response = await fetch(`/api/session?bodyControl=${marker}`, { signal: AbortSignal.timeout(1000), cache: "no-store" });
      return { status: response.status, bodyUsed: response.bodyUsed };
    }, unreadMarker);
    expect(unread).toEqual({ status: 200, bodyUsed: false });
    expect((await unreadFailure).failure()?.errorText).toBe("net::ERR_ABORTED");

    const consumedMarker = randomUUID();
    const consumedFinished = page.waitForEvent("requestfinished", { predicate: (r) => r.url().includes(consumedMarker), timeout: 5000 });
    const consumed = await page.evaluate(async (marker) => {
      const response = await fetch(`/api/session?bodyControl=${marker}`, { signal: AbortSignal.timeout(1000), cache: "no-store" });
      await response.text();
      return { status: response.status, bodyUsed: response.bodyUsed };
    }, consumedMarker);
    expect(consumed).toEqual({ status: 200, bodyUsed: true });
    await consumedFinished;

    const presence = (r: import("@playwright/test").Request) => r.method() === "POST" && r.url().endsWith(`/api/rooms/${roomId}/lobby`) && r.postDataJSON()?.action === "presence";
    const failures: import("@playwright/test").Request[] = [];
    page.on("requestfailed", (r) => { if (presence(r)) failures.push(r); });
    const requested = page.waitForRequest(presence);
    const finished = page.waitForEvent("requestfinished", { predicate: presence, timeout: 8000 });
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    const request = await requested;
    expect((await request.response())?.status()).toBe(200);
    // The test never reads this response body; only production RoomSession can drain it.
    expect(await finished).toBe(request);
    // Observe past the production AbortSignal deadline, rather than ending on headers.
    await page.waitForTimeout(10500);
    expect(failures).not.toContain(request);
    await info.attach("heartbeat-body-result", { body: JSON.stringify({ httpFixtures: false, unreadNegativeControlAborted: true, consumedControlFinished: true, productionHeartbeatFinishedBeforeAbort: true, testConsumedProductionBody: false }), contentType: "application/json" });
  } finally {
    const current = await context.request.get(`/api/rooms/${roomId}`);
    if (current.ok()) {
      const room = await current.json();
      if (room.role === "player") await context.request.post(`/api/rooms/${roomId}/lobby`, { headers: { Origin: origin }, data: { action: "leave", expectedProfileId: profileId, expectedVersion: room.version, commandId: randomUUID() } });
    }
  }
});
