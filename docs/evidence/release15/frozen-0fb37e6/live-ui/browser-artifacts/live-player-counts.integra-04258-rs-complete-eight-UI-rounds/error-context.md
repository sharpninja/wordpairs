# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-player-counts.integration.spec.ts >> LIVE-SCALE 8 real browser players complete eight UI rounds
- Location: tests/browser/live-player-counts.integration.spec.ts:13:29

# Error details

```
Error: request.response: Target page, context or browser has been closed
```

# Test source

```ts
  1   | import { randomBytes, randomUUID } from "node:crypto";
  2   | import { writeFile } from "node:fs/promises";
  3   | import { test, expect, type BrowserContext, type Page } from "@playwright/test";
  4   | import seed from "../../src/infrastructure/catalog-seed.json" with { type: "json" };
  5   | import { cleanupOwnedRoom } from "./owned-room-cleanup";
  6   | 
  7   | const counts = process.env.WORDPAIRS_LIVE_PLAYER_COUNTS
  8   |   ? process.env.WORDPAIRS_LIVE_PLAYER_COUNTS.split(",").map(Number)
  9   |   : Array.from({ length: 14 }, (_, i) => i + 2);
  10  | if (counts.some((n) => !Number.isInteger(n) || n < 2 || n > 15) || new Set(counts).size !== counts.length)
  11  |   throw new Error("WORDPAIRS_LIVE_PLAYER_COUNTS must contain unique player counts from2 through15");
  12  | 
  13  | for (const count of counts) test(`LIVE-SCALE ${count} real browser players complete eight UI rounds`, async ({ browser }, info) => {
  14  |   test.setTimeout(600000);
  15  |   const origin = process.env.WORDPAIRS_LIVE_ORIGIN!;
  16  |   const contexts: BrowserContext[] = [];
  17  |   const pages: Page[] = [];
  18  |   const ids: string[] = [];
  19  |   const roomId = randomUUID();
  20  |   let created = false;
  21  |   let solves = 0;
  22  |   let uncertainUiRetries = 0;
  23  |   let phase = "identity setup";
  24  |   let completed = false;
  25  |   const started = Date.now();
  26  |   let requestFailureTotal = 0;
  27  |   const requestFailures: { path: string; method: string; action: string | null; phase: string; elapsedMs: number; error: string | null }[] = [];
  28  |   const slowResponses: { path: string; method: string; status: number; durationMs: number; action: string | null }[] = [];
  29  |   const actionOf = (r: import("@playwright/test").Request): string | null => {
  30  |     try { const action = r.postDataJSON()?.action; return typeof action === "string" && ["ready", "presence", "leave", "choose", "answer", "continue"].includes(action) ? action : null; } catch { return null; }
  31  |   };
  32  |   // API setup is real and only arranges identities/membership. Readiness, category
  33  |   // selection and every answer below use the actual browser UI without route fixtures.
  34  |   async function post(context: BrowserContext, path: string, data: unknown) {
  35  |     return context.request.post(path, { headers: { Origin: origin }, data });
  36  |   }
  37  |   async function click(page: Page, action: string, run: () => Promise<unknown>) {
  38  |     const [request] = await Promise.all([
  39  |       page.waitForRequest((r) => r.method() === "POST" && r.url().includes(`/api/rooms/${roomId}`) && r.postDataJSON()?.action === action),
  40  |       run(),
  41  |     ]);
  42  |     // A browser AbortSignal can end an uncertain request without any HTTP
  43  |     // response. The UI retains that command just as it does after5xx.
  44  |     const response = await request.response();
  45  |     return {
  46  |       ok: () => response?.ok() ?? false,
  47  |       status: () => response?.status() ?? 0,
  48  |       json: async () => response ? response.json() : null,
  49  |       request: () => request,
  50  |     };
  51  |   }
  52  |   async function commitUi(page: Page, action: string, run: () => Promise<unknown>, scope: "room" | "game" = "game") {
  53  |     let pendingPayload: unknown;
  54  |     let retryPending = false;
  55  |     for (let attempt = 0; attempt < 12; attempt++) {
  56  |       const result = await click(page, action, retryPending
  57  |         ? () => page.getByRole("button", { name: `Retry pending ${scope} request`, exact: true }).click()
  58  |         : run);
  59  |       const payload = result.request().postDataJSON();
  60  |       if (retryPending) expect(payload).toEqual(pendingPayload);
  61  |       if (result.ok()) return result.json();
  62  |       if (result.status() === 0 || result.status() >= 500) {
  63  |         uncertainUiRetries++;
  64  |         pendingPayload ??= payload;
  65  |         retryPending = true;
  66  |       } else {
  67  |         expect(result.status()).toBe(409);
  68  |         retryPending = false;
  69  |         pendingPayload = undefined;
  70  |       }
  71  |     }
  72  |     throw new Error(`UI ${action} did not converge through explicit conflict/uncertain retries`);
  73  |   }
  74  |   try {
  75  |     for (let i = 0; i < count; i++) {
  76  |       const context = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: process.env.WORDPAIRS_LIVE_LOCAL_TLS === "1", viewport: { width: 390, height: 844 }, extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } });
  77  |       contexts.push(context);
  78  |       const guest = await post(context, "/api/session", { guestCredential: randomBytes(32).toString("base64url") });
  79  |       expect(guest.status()).toBe(200);
  80  |       ids.push((await guest.json()).profile.id);
  81  |     }
  82  |     phase = "membership setup";
  83  |     const made = await post(contexts[0], "/api/rooms", { action: "create", roomId, capacity: count, commandId: randomUUID(), expectedProfileId: ids[0] });
  84  |     expect(made.status()).toBe(200);
  85  |     created = true;
  86  |     const code = (await made.json()).code;
  87  |     for (let i = 1; i < count; i++) {
  88  |       const room = await (await contexts[i].request.get(`/api/rooms/${code}`)).json();
  89  |       const joined = await post(contexts[i], `/api/rooms/${code}`, { action: "join", mode: "player", expectedVersion: room.version, expectedProfileId: ids[i], commandId: randomUUID() });
  90  |       expect(joined.status()).toBe(200);
  91  |     }
  92  |     // Bound simultaneous navigations across the supported fifteen-player room.
  93  |     for (let i = 0; i < count; i += 4) {
  94  |       const batch = await Promise.all(contexts.slice(i, i + 4).map(async (context) => {
  95  |         const page = await context.newPage();
  96  |         page.on("requestfailed", (r) => { requestFailureTotal++; if (requestFailures.length < 100) requestFailures.push({ path: new URL(r.url()).pathname, method: r.method(), action: actionOf(r), phase, elapsedMs: Date.now() - started, error: r.failure()?.errorText ?? null }); });
  97  |         page.on("requestfinished", async (r) => {
  98  |           if (slowResponses.length >= 100 || !new URL(r.url()).pathname.startsWith("/api/")) return;
  99  |           const durationMs = r.timing().responseEnd;
> 100 |           const response = await r.response();
      |                                    ^ Error: request.response: Target page, context or browser has been closed
  101 |           if (response && (response.status() >= 400 || durationMs > 1000)) slowResponses.push({ path: new URL(r.url()).pathname, method: r.method(), status: response.status(), durationMs, action: actionOf(r) });
  102 |         });
  103 |         await page.goto(`/rooms/${roomId}`); return page;
  104 |       }));
  105 |       pages.push(...batch);
  106 |     }
  107 |     for (const page of pages) {
  108 |       phase = "UI readiness";
  109 |       await expect(page.getByText("● Live updates connected", { exact: true })).toBeVisible();
  110 |       await commitUi(page, "ready", () => page.getByRole("button", { name: "Mark ready", exact: true }).click(), "room");
  111 |     }
  112 |     for (let round = 1; round <= 8; round++) {
  113 |       phase = `UI round ${round}`;
  114 |       console.log(`LIVE_SCALE players=${count} round=${round}`);
  115 |       await expect.poll(async () => (await Promise.all(pages.map((p) => p.getByRole("button", { name: "Opposites", exact: true }).isVisible()))).filter(Boolean).length, { timeout: 20000 }).toBe(1);
  116 |       const chooser = (await Promise.all(pages.map(async (p) => (await p.getByRole("button", { name: "Opposites", exact: true }).isVisible()) ? p : null))).find((p) => p)!;
  117 |       const chosen = await commitUi(chooser, "choose", () => chooser.getByRole("button", { name: "Opposites", exact: true }).click());
  118 |       const categoryVersion = chosen.version;
  119 |       await Promise.all(pages.map(async (p) => {
  120 |         await expect.poll(async () => Number(await p.locator(".game-panel").getAttribute("data-match-version"))).toBeGreaterThanOrEqual(categoryVersion);
  121 |         await expect(p.locator(".game-prompt")).toBeVisible();
  122 |         await expect(p.locator(".answer-reveal")).toHaveCount(0);
  123 |       }));
  124 |       const prompt = (await pages[0].locator(".game-prompt").textContent())!.trim();
  125 |       const pair = seed.pairs.find((p) => p.categoryId === "opposites" && p.prompt === prompt);
  126 |       if (!pair) throw new Error("The seeded Opposites catalog is required for live UI answer lookup");
  127 |       for (let batch = 0; batch < pages.length; batch += 2) {
  128 |       const submissions = await Promise.allSettled(pages.slice(batch, batch + 2).map(async (page) => {
  129 |         const solved = await commitUi(page, "answer", async () => {
  130 |           await expect(page.getByLabel("Your answer", { exact: true })).toBeEnabled();
  131 |           await page.getByLabel("Your answer", { exact: true }).fill(pair.target);
  132 |           await page.getByRole("button", { name: "Submit answer", exact: true }).click();
  133 |         });
  134 |         expect(solved.correct).toBe(true);
  135 |         solves++;
  136 |       }));
  137 |       const failed = submissions.find((r) => r.status === "rejected");
  138 |       if (failed?.status === "rejected") throw failed.reason;
  139 |       }
  140 |       await Promise.all(pages.map((p) => expect(p.locator(".answer-reveal")).toContainText(pair.target)));
  141 |     }
  142 |     const ranking = await pages[0].getByRole("table", { name: "Final ranking", exact: true }).textContent();
  143 |     for (const page of pages) {
  144 |       await expect(page.getByRole("heading", { name: "Final standings", exact: true })).toBeVisible();
  145 |       expect(await page.getByRole("table", { name: "Final ranking", exact: true }).textContent()).toBe(ranking);
  146 |     }
  147 |     expect(solves).toBe(count * 8);
  148 |     completed = true;
  149 |     await info.attach("live-scale-result", { body: JSON.stringify({ players: count, rounds: 8, uiSolves: solves, uncertainUiRetries, simultaneousAnswerUis: 2, realHttp: true, realPrivateWebSockets: true, apiSetup: true }), contentType: "application/json" });
  150 |   } catch (error) {
  151 |     const uiStates = await Promise.all(pages.map(async (page, player) => ({ player, closed: page.isClosed(), browserConnected: browser.isConnected(), body: await page.locator("body").innerText({ timeout: 2000 }).catch((problem: unknown) => `Page unavailable: ${problem instanceof Error ? problem.message.slice(0, 500) : "Unknown error"}`) })));
  152 |     await writeFile(`docs/evidence/room-sync/live-scale-${count}-failure-ui.json`, JSON.stringify({ players: count, phase, uiStates, requestFailureTotal, requestFailures, slowResponses }, null, 2));
  153 |     await pages[0]?.screenshot({ path: info.outputPath("failure-ui.png"), fullPage: true, timeout: 5000 }).catch(() => {});
  154 |     await info.attach("live-scale-failure", { body: JSON.stringify({ players: count, phase, uiSolves: solves, uncertainUiRetries, requestFailureTotal, requestFailures, slowResponses }), contentType: "application/json" });
  155 |     throw error;
  156 |   } finally {
  157 |     let cleanup = { cleanupFailures: 0, roomClosed: false, unresolvedPlayerIndices: [] as number[] };
  158 |     try {
  159 |       if (created) cleanup = await cleanupOwnedRoom(contexts.map((context, index) => ({
  160 |         profileId: ids[index],
  161 |         read: async () => {
  162 |           const response = await context.request.get(`/api/rooms/${roomId}`);
  163 |           const body = await response.text();
  164 |           return { status: response.status(), body: response.ok() ? JSON.parse(body) : undefined };
  165 |         },
  166 |         leave: async command => {
  167 |           const response = await post(context, `/api/rooms/${roomId}/lobby`, { action: "leave", expectedProfileId: ids[index], ...command });
  168 |           await response.body();
  169 |           return { status: response.status() };
  170 |         },
  171 |       })), randomUUID);
  172 |       await writeFile(`docs/evidence/room-sync/live-scale-${count}.json`, JSON.stringify({ players: count, phase, completed, rounds: completed ? 8 : null, uiSolves: solves, uncertainUiRetries, simultaneousAnswerUis: 2, cleanupFailures: cleanup.cleanupFailures, unresolvedPlayerIndices: cleanup.unresolvedPlayerIndices, completedRoomRetained: cleanup.roomClosed, requestFailureTotal, requestFailuresTruncated: requestFailureTotal > requestFailures.length, requestFailures, slowResponses, realHttp: true, apiSetup: true, qualification: "Actual network and private WebSockets with ordinary safety/presence reads enabled. Strict push-only behavior is verified separately." }, null, 2));
  173 |       await info.attach("live-scale-cleanup", { body: JSON.stringify({ players: count, cleanupFailures: cleanup.cleanupFailures, unresolvedPlayerIndices: cleanup.unresolvedPlayerIndices, ownRoomOnly: true }), contentType: "application/json" });
  174 |     } finally {
  175 |       await Promise.allSettled(contexts.map((context) => context.close()));
  176 |     }
  177 |     if (completed) expect(cleanup.cleanupFailures, "Owned room cleanup must be verified").toBe(0);
  178 |   }
  179 | });
  180 | 
```