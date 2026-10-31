# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-player-counts.integration.spec.ts >> LIVE-SCALE 9 real browser players complete eight UI rounds
- Location: tests/browser/live-player-counts.integration.spec.ts:16:29

# Error details

```
Error: response.json: Protocol error (Network.getResponseBody): No data found for resource with given identifier
Response body is not available for a response that was navigated away from. Read response.body() before triggering any navigation.
```

# Test source

```ts
  1   | import { randomBytes, randomUUID } from "node:crypto";
  2   | import { writeFile } from "node:fs/promises";
  3   | import { test, expect, type BrowserContext, type Page } from "@playwright/test";
  4   | import seed from "../../src/infrastructure/catalog-seed.json" with { type: "json" };
  5   | import { cleanupOwnedRoom } from "./owned-room-cleanup";
  6   | import { attach as attachRequestDiagnostics } from "./request-diagnostics";
  7   | import type { DiagnosticHandle, DiagnosticState } from "./request-diagnostics.contract";
  8   | import { readyAfterBarrier } from "./readiness-barrier";
  9   | 
  10  | const counts = process.env.WORDPAIRS_LIVE_PLAYER_COUNTS
  11  |   ? process.env.WORDPAIRS_LIVE_PLAYER_COUNTS.split(",").map(Number)
  12  |   : Array.from({ length: 14 }, (_, i) => i + 2);
  13  | if (counts.some((n) => !Number.isInteger(n) || n < 2 || n > 15) || new Set(counts).size !== counts.length)
  14  |   throw new Error("WORDPAIRS_LIVE_PLAYER_COUNTS must contain unique player counts from2 through15");
  15  | 
  16  | for (const count of counts) test(`LIVE-SCALE ${count} real browser players complete eight UI rounds`, async ({ browser }, info) => {
  17  |   test.setTimeout(600000);
  18  |   const origin = process.env.WORDPAIRS_LIVE_ORIGIN!;
  19  |   const contexts: BrowserContext[] = [];
  20  |   const pages: Page[] = [];
  21  |   const ids: string[] = [];
  22  |   const roomId = randomUUID();
  23  |   let created = false;
  24  |   let solves = 0;
  25  |   let uncertainUiRetries = 0;
  26  |   let phase = "identity setup";
  27  |   let completed = false;
  28  |   const started = Date.now();
  29  |   let requestFailureTotal = 0;
  30  |   const requestFailures: { path: string; method: string; action: string | null; phase: string; elapsedMs: number; error: string | null }[] = [];
  31  |   const slowResponses: { path: string; method: string; status: number; durationMs: number; action: string | null }[] = [];
  32  |   const diagnostics: DiagnosticState = { details: slowResponses, failures: [], failureTotal: 0 };
  33  |   const diagnosticHandles: DiagnosticHandle[] = [];
  34  |   const preparedActors: string[] = [];
  35  |   const readinessObservations: { phase: "prepared" | "ready"; player: number; expectedProfileId: string; actorId: string; uiRosterCount: number; version: number }[] = [];
  36  |   const failureListeners: { page: Page; listener: (request: import("@playwright/test").Request) => void }[] = [];
  37  |   const disposeDiagnostics = () => {
  38  |     for (const handle of diagnosticHandles) handle.dispose();
  39  |     for (const { page, listener } of failureListeners) page.off("requestfailed", listener);
  40  |   };
  41  |   const actionOf = (r: import("@playwright/test").Request): string | null => {
  42  |     try { const action = r.postDataJSON()?.action; return typeof action === "string" && ["ready", "presence", "leave", "choose", "answer", "continue"].includes(action) ? action : null; } catch { return null; }
  43  |   };
  44  |   // API setup is real and only arranges identities/membership. Readiness, category
  45  |   // selection and every answer below use the actual browser UI without route fixtures.
  46  |   async function post(context: BrowserContext, path: string, data: unknown) {
  47  |     return context.request.post(path, { headers: { Origin: origin }, data });
  48  |   }
  49  |   async function click(page: Page, action: string, run: () => Promise<unknown>) {
  50  |     const [request] = await Promise.all([
  51  |       page.waitForRequest((r) => r.method() === "POST" && r.url().includes(`/api/rooms/${roomId}`) && r.postDataJSON()?.action === action),
  52  |       run(),
  53  |     ]);
  54  |     // A browser AbortSignal can end an uncertain request without any HTTP
  55  |     // response. The UI retains that command just as it does after5xx.
  56  |     const response = await request.response();
  57  |     return {
  58  |       ok: () => response?.ok() ?? false,
  59  |       status: () => response?.status() ?? 0,
> 60  |       json: async () => response ? response.json() : null,
      |                                             ^ Error: response.json: Protocol error (Network.getResponseBody): No data found for resource with given identifier
  61  |       request: () => request,
  62  |     };
  63  |   }
  64  |   async function commitUi(page: Page, action: string, run: () => Promise<unknown>, scope: "room" | "game" = "game") {
  65  |     let pendingPayload: unknown;
  66  |     let retryPending = false;
  67  |     for (let attempt = 0; attempt < 12; attempt++) {
  68  |       const result = await click(page, action, retryPending
  69  |         ? () => page.getByRole("button", { name: `Retry pending ${scope} request`, exact: true }).click()
  70  |         : run);
  71  |       const payload = result.request().postDataJSON();
  72  |       if (retryPending) expect(payload).toEqual(pendingPayload);
  73  |       if (result.ok()) return result.json();
  74  |       if (result.status() === 0 || result.status() >= 500) {
  75  |         uncertainUiRetries++;
  76  |         pendingPayload ??= payload;
  77  |         retryPending = true;
  78  |       } else {
  79  |         expect(result.status()).toBe(409);
  80  |         retryPending = false;
  81  |         pendingPayload = undefined;
  82  |       }
  83  |     }
  84  |     throw new Error(`UI ${action} did not converge through explicit conflict/uncertain retries`);
  85  |   }
  86  |   try {
  87  |     for (let i = 0; i < count; i++) {
  88  |       const context = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: process.env.WORDPAIRS_LIVE_LOCAL_TLS === "1", viewport: { width: 390, height: 844 }, extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } });
  89  |       contexts.push(context);
  90  |       const guest = await post(context, "/api/session", { guestCredential: randomBytes(32).toString("base64url") });
  91  |       expect(guest.status()).toBe(200);
  92  |       ids.push((await guest.json()).profile.id);
  93  |     }
  94  |     phase = "membership setup";
  95  |     const made = await post(contexts[0], "/api/rooms", { action: "create", roomId, capacity: count, commandId: randomUUID(), expectedProfileId: ids[0] });
  96  |     expect(made.status()).toBe(200);
  97  |     created = true;
  98  |     const code = (await made.json()).code;
  99  |     for (let i = 1; i < count; i++) {
  100 |       const room = await (await contexts[i].request.get(`/api/rooms/${code}`)).json();
  101 |       const joined = await post(contexts[i], `/api/rooms/${code}`, { action: "join", mode: "player", expectedVersion: room.version, expectedProfileId: ids[i], commandId: randomUUID() });
  102 |       expect(joined.status()).toBe(200);
  103 |     }
  104 |     // Bound simultaneous navigations across the supported fifteen-player room.
  105 |     for (let i = 0; i < count; i += 4) {
  106 |       const batch = await Promise.all(contexts.slice(i, i + 4).map(async (context) => {
  107 |         const page = await context.newPage();
  108 |         const failureListener = (r: import("@playwright/test").Request) => { requestFailureTotal++; if (requestFailures.length < 100) requestFailures.push({ path: new URL(r.url()).pathname, method: r.method(), action: actionOf(r), phase, elapsedMs: Date.now() - started, error: r.failure()?.errorText ?? null }); };
  109 |         page.on("requestfailed", failureListener);
  110 |         failureListeners.push({ page, listener: failureListener });
  111 |         diagnosticHandles.push(attachRequestDiagnostics(page, diagnostics));
  112 |         await page.goto(`/rooms/${roomId}`); return page;
  113 |       }));
  114 |       pages.push(...batch);
  115 |     }
  116 |     // A slow final connection must not become the sole unready holdout while
  117 |     // earlier pages are readied. Complete actual UI preparation for everyone.
  118 |     phase = "UI readiness barrier";
  119 |     await readyAfterBarrier(pages, async (page, player) => {
  120 |       await expect(page.getByText("● Live updates connected", { exact: true })).toBeVisible();
  121 |       await expect(page.locator(".roster > li")).toHaveCount(count);
  122 |       const ready = page.getByRole("button", { name: "Mark ready", exact: true });
  123 |       await expect(ready).toBeVisible();
  124 |       await expect(ready).toBeEnabled();
  125 |       // Attribute UI setup to its real same-context actor, without readiness
  126 |       // injection or an additional diagnostic read between ready commands.
  127 |       const response = await contexts[player].request.get(`/api/rooms/${roomId}`);
  128 |       expect(response.status()).toBe(200);
  129 |       const room = await response.json();
  130 |       expect(room.actorId).toBe(ids[player]);
  131 |       expect(room.role).toBe("player");
  132 |       expect(room.players).toHaveLength(count);
  133 |       preparedActors[player] = room.actorId;
  134 |       readinessObservations.push({ phase: "prepared", player, expectedProfileId: ids[player], actorId: room.actorId, uiRosterCount: await page.locator(".roster > li").count(), version: room.version });
  135 |     }, async (page, player) => {
  136 |       phase = "UI readiness";
  137 |       const ready = await commitUi(page, "ready", () => page.getByRole("button", { name: "Mark ready", exact: true }).click(), "room");
  138 |       readinessObservations.push({ phase: "ready", player, expectedProfileId: ids[player], actorId: preparedActors[player], uiRosterCount: await page.locator(".roster > li").count(), version: ready.version });
  139 |     });
  140 |     for (let round = 1; round <= 8; round++) {
  141 |       phase = `UI round ${round}`;
  142 |       console.log(`LIVE_SCALE players=${count} round=${round}`);
  143 |       await expect.poll(async () => (await Promise.all(pages.map((p) => p.getByRole("button", { name: "Opposites", exact: true }).isVisible()))).filter(Boolean).length, { timeout: 20000 }).toBe(1);
  144 |       const chooser = (await Promise.all(pages.map(async (p) => (await p.getByRole("button", { name: "Opposites", exact: true }).isVisible()) ? p : null))).find((p) => p)!;
  145 |       const chosen = await commitUi(chooser, "choose", () => chooser.getByRole("button", { name: "Opposites", exact: true }).click());
  146 |       const categoryVersion = chosen.version;
  147 |       await Promise.all(pages.map(async (p) => {
  148 |         await expect.poll(async () => Number(await p.locator(".game-panel").getAttribute("data-match-version"))).toBeGreaterThanOrEqual(categoryVersion);
  149 |         await expect(p.locator(".game-prompt")).toBeVisible();
  150 |         await expect(p.locator(".answer-reveal")).toHaveCount(0);
  151 |       }));
  152 |       const prompt = (await pages[0].locator(".game-prompt").textContent())!.trim();
  153 |       const pair = seed.pairs.find((p) => p.categoryId === "opposites" && p.prompt === prompt);
  154 |       if (!pair) throw new Error("The seeded Opposites catalog is required for live UI answer lookup");
  155 |       for (let batch = 0; batch < pages.length; batch += 2) {
  156 |       const submissions = await Promise.allSettled(pages.slice(batch, batch + 2).map(async (page) => {
  157 |         const solved = await commitUi(page, "answer", async () => {
  158 |           await expect(page.getByLabel("Your answer", { exact: true })).toBeEnabled();
  159 |           await page.getByLabel("Your answer", { exact: true }).fill(pair.target);
  160 |           await page.getByRole("button", { name: "Submit answer", exact: true }).click();
```