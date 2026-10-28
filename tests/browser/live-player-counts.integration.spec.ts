import { randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import seed from "../../src/infrastructure/catalog-seed.json" with { type: "json" };

const counts = process.env.WORDPAIRS_LIVE_PLAYER_COUNTS
  ? process.env.WORDPAIRS_LIVE_PLAYER_COUNTS.split(",").map(Number)
  : Array.from({ length: 24 }, (_, i) => i + 2);
if (counts.some((n) => !Number.isInteger(n) || n < 2 || n > 25) || new Set(counts).size !== counts.length)
  throw new Error("WORDPAIRS_LIVE_PLAYER_COUNTS must contain unique player counts from2 through25");

for (const count of counts) test(`LIVE-SCALE ${count} real browser players complete eight UI rounds`, async ({ browser }, info) => {
  test.setTimeout(600000);
  const origin = process.env.WORDPAIRS_LIVE_ORIGIN!;
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  const ids: string[] = [];
  const roomId = randomUUID();
  let created = false;
  let solves = 0;
  let uncertainUiRetries = 0;
  let phase = "identity setup";
  let completed = false;
  const started = Date.now();
  let requestFailureTotal = 0;
  const requestFailures: { path: string; method: string; action: string | null; phase: string; elapsedMs: number; error: string | null }[] = [];
  const slowResponses: { path: string; method: string; status: number; durationMs: number; action: string | null }[] = [];
  const actionOf = (r: import("@playwright/test").Request): string | null => {
    try { const action = r.postDataJSON()?.action; return typeof action === "string" && ["ready", "presence", "leave", "choose", "answer", "continue"].includes(action) ? action : null; } catch { return null; }
  };
  // API setup is real and only arranges identities/membership. Readiness, category
  // selection and every answer below use the actual browser UI without route fixtures.
  async function post(context: BrowserContext, path: string, data: unknown) {
    return context.request.post(path, { headers: { Origin: origin }, data });
  }
  async function click(page: Page, action: string, run: () => Promise<unknown>) {
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.method() === "POST" && r.url().includes(`/api/rooms/${roomId}`) && r.postDataJSON()?.action === action),
      run(),
    ]);
    // A browser AbortSignal can end an uncertain request without any HTTP
    // response. The UI retains that command just as it does after5xx.
    const response = await request.response();
    return {
      ok: () => response?.ok() ?? false,
      status: () => response?.status() ?? 0,
      json: async () => response ? response.json() : null,
      request: () => request,
    };
  }
  async function commitUi(page: Page, action: string, run: () => Promise<unknown>, scope: "room" | "game" = "game") {
    let pendingPayload: unknown;
    let retryPending = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      const result = await click(page, action, retryPending
        ? () => page.getByRole("button", { name: `Retry pending ${scope} request`, exact: true }).click()
        : run);
      const payload = result.request().postDataJSON();
      if (retryPending) expect(payload).toEqual(pendingPayload);
      if (result.ok()) return result.json();
      if (result.status() === 0 || result.status() >= 500) {
        uncertainUiRetries++;
        pendingPayload ??= payload;
        retryPending = true;
      } else {
        expect(result.status()).toBe(409);
        retryPending = false;
        pendingPayload = undefined;
      }
    }
    throw new Error(`UI ${action} did not converge through explicit conflict/uncertain retries`);
  }
  try {
    for (let i = 0; i < count; i++) {
      const context = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: process.env.WORDPAIRS_LIVE_LOCAL_TLS === "1", viewport: { width: 390, height: 844 }, extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } });
      contexts.push(context);
      const guest = await post(context, "/api/session", { guestCredential: randomBytes(32).toString("base64url") });
      expect(guest.status()).toBe(200);
      ids.push((await guest.json()).profile.id);
    }
    phase = "membership setup";
    const made = await post(contexts[0], "/api/rooms", { action: "create", roomId, capacity: count, commandId: randomUUID(), expectedProfileId: ids[0] });
    expect(made.status()).toBe(200);
    created = true;
    const code = (await made.json()).code;
    for (let i = 1; i < count; i++) {
      const room = await (await contexts[i].request.get(`/api/rooms/${code}`)).json();
      const joined = await post(contexts[i], `/api/rooms/${code}`, { action: "join", mode: "player", expectedVersion: room.version, expectedProfileId: ids[i], commandId: randomUUID() });
      expect(joined.status()).toBe(200);
    }
    // Bound simultaneous navigations rather than create25 renderer loads at once.
    for (let i = 0; i < count; i += 4) {
      const batch = await Promise.all(contexts.slice(i, i + 4).map(async (context) => {
        const page = await context.newPage();
        page.on("requestfailed", (r) => { requestFailureTotal++; if (requestFailures.length < 100) requestFailures.push({ path: new URL(r.url()).pathname, method: r.method(), action: actionOf(r), phase, elapsedMs: Date.now() - started, error: r.failure()?.errorText ?? null }); });
        page.on("requestfinished", async (r) => {
          if (slowResponses.length >= 100 || !new URL(r.url()).pathname.startsWith("/api/")) return;
          const durationMs = r.timing().responseEnd;
          const response = await r.response();
          if (response && (response.status() >= 400 || durationMs > 1000)) slowResponses.push({ path: new URL(r.url()).pathname, method: r.method(), status: response.status(), durationMs, action: actionOf(r) });
        });
        await page.goto(`/rooms/${roomId}`); return page;
      }));
      pages.push(...batch);
    }
    for (const page of pages) {
      phase = "UI readiness";
      await expect(page.getByText("● Live updates connected", { exact: true })).toBeVisible();
      await commitUi(page, "ready", () => page.getByRole("button", { name: "Mark ready", exact: true }).click(), "room");
    }
    for (let round = 1; round <= 8; round++) {
      phase = `UI round ${round}`;
      console.log(`LIVE_SCALE players=${count} round=${round}`);
      await expect.poll(async () => (await Promise.all(pages.map((p) => p.getByRole("button", { name: "Opposites", exact: true }).isVisible()))).filter(Boolean).length, { timeout: 20000 }).toBe(1);
      const chooser = (await Promise.all(pages.map(async (p) => (await p.getByRole("button", { name: "Opposites", exact: true }).isVisible()) ? p : null))).find((p) => p)!;
      const chosen = await commitUi(chooser, "choose", () => chooser.getByRole("button", { name: "Opposites", exact: true }).click());
      const categoryVersion = chosen.version;
      await Promise.all(pages.map(async (p) => {
        await expect.poll(async () => Number(await p.locator(".game-panel").getAttribute("data-match-version"))).toBeGreaterThanOrEqual(categoryVersion);
        await expect(p.locator(".game-prompt")).toBeVisible();
        await expect(p.locator(".answer-reveal")).toHaveCount(0);
      }));
      const prompt = (await pages[0].locator(".game-prompt").textContent())!.trim();
      const pair = seed.pairs.find((p) => p.categoryId === "opposites" && p.prompt === prompt);
      if (!pair) throw new Error("The seeded Opposites catalog is required for live UI answer lookup");
      for (let batch = 0; batch < pages.length; batch += 2) {
      const submissions = await Promise.allSettled(pages.slice(batch, batch + 2).map(async (page) => {
        const solved = await commitUi(page, "answer", async () => {
          await expect(page.getByLabel("Your answer", { exact: true })).toBeEnabled();
          await page.getByLabel("Your answer", { exact: true }).fill(pair.target);
          await page.getByRole("button", { name: "Submit answer", exact: true }).click();
        });
        expect(solved.correct).toBe(true);
        solves++;
      }));
      const failed = submissions.find((r) => r.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      }
      await Promise.all(pages.map((p) => expect(p.locator(".answer-reveal")).toContainText(pair.target)));
    }
    const ranking = await pages[0].getByRole("table", { name: "Final ranking", exact: true }).textContent();
    for (const page of pages) {
      await expect(page.getByRole("heading", { name: "Final standings", exact: true })).toBeVisible();
      expect(await page.getByRole("table", { name: "Final ranking", exact: true }).textContent()).toBe(ranking);
    }
    expect(solves).toBe(count * 8);
    completed = true;
    await info.attach("live-scale-result", { body: JSON.stringify({ players: count, rounds: 8, uiSolves: solves, uncertainUiRetries, simultaneousAnswerUis: 2, realHttp: true, realPrivateWebSockets: true, apiSetup: true }), contentType: "application/json" });
  } catch (error) {
    const uiStates = await Promise.all(pages.map(async (page, player) => ({ player, closed: page.isClosed(), browserConnected: browser.isConnected(), body: await page.locator("body").innerText({ timeout: 2000 }).catch((problem: unknown) => `Page unavailable: ${problem instanceof Error ? problem.message.slice(0, 500) : "Unknown error"}`) })));
    await writeFile(`docs/evidence/room-sync/live-scale-${count}-failure-ui.json`, JSON.stringify({ players: count, phase, uiStates, requestFailureTotal, requestFailures, slowResponses }, null, 2));
    await pages[0]?.screenshot({ path: info.outputPath("failure-ui.png"), fullPage: true, timeout: 5000 }).catch(() => {});
    await info.attach("live-scale-failure", { body: JSON.stringify({ players: count, phase, uiSolves: solves, uncertainUiRetries, requestFailureTotal, requestFailures, slowResponses }), contentType: "application/json" });
    throw error;
  } finally {
    let cleanupFailures = 0;
    let roomClosed = false;
    if (created) for (let i = count - 1; i >= 0; i--) {
      try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const room = await (await contexts[i].request.get(`/api/rooms/${roomId}`)).json();
        if (room.status === "closed") { roomClosed = true; break; }
        if (room.role !== "player") break;
        const left = await post(contexts[i], `/api/rooms/${roomId}/lobby`, { action: "leave", expectedProfileId: ids[i], expectedVersion: room.version, commandId: randomUUID() });
        if (left.ok()) break;
        if (left.status() !== 409) break;
      }
      } catch { cleanupFailures++; }
      if (roomClosed) break;
    }
    await writeFile(`docs/evidence/room-sync/live-scale-${count}.json`, JSON.stringify({ players: count, phase, completed, rounds: completed ? 8 : null, uiSolves: solves, uncertainUiRetries, simultaneousAnswerUis: 2, cleanupFailures, completedRoomRetained: roomClosed, requestFailureTotal, requestFailuresTruncated: requestFailureTotal > requestFailures.length, requestFailures, slowResponses, realHttp: true, apiSetup: true }, null, 2));
    await info.attach("live-scale-cleanup", { body: JSON.stringify({ players: count, cleanupFailures, ownRoomOnly: true }), contentType: "application/json" });
    await Promise.allSettled(contexts.map((context) => context.close()));
  }
});
