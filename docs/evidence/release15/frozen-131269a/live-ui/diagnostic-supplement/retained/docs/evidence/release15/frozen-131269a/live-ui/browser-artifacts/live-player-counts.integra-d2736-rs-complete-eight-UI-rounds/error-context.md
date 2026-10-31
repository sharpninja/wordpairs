# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-player-counts.integration.spec.ts >> LIVE-SCALE 11 real browser players complete eight UI rounds
- Location: tests/browser/live-player-counts.integration.spec.ts:15:29

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('● Live updates connected', { exact: true })
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('● Live updates connected', { exact: true }) with timeout 30000ms
  - waiting for getByText('● Live updates connected', { exact: true })

```

```yaml
- main:
  - link "wordpairs":
    - /url: /
  - navigation "Main navigation":
    - link "Find a room":
      - /url: /play
  - region "Your player profile":
    - paragraph: Make yourself at home
    - heading "Your player profile" [level=1]
    - paragraph:
      - img "owl": 🦉
      - strong: Guest Pine hrqbq2
    - paragraph: Guest profile saved in this browser. 0 lifetime wins · 0 points
    - group: Profile details
    - group "Choose your icon":
      - text: Choose your icon
      - button "Choose owl" [pressed]:
        - img "owl": 🦉
      - button "Choose fox":
        - img "fox": 🦊
      - button "Choose frog":
        - img "frog": 🐸
      - button "Choose cat":
        - img "cat": 🐈
      - button "Choose whale":
        - img "whale": 🐳
      - button "Choose bee":
        - img "bee": 🐝
    - checkbox "Show my generated alias on the public leaderboard"
    - text: Show my generated alias on the public leaderboard
    - button "Generate another alias"
    - button "Edit profile"
    - button "Sign out"
    - paragraph: Clearing this browser’s site data resets your guest identity.
  - region "The room":
    - heading "The room" [level=1]
    - button "Refresh room"
    - alert: Room not found or invitation expired.
- alert
```

# Test source

```ts
  15  | for (const count of counts) test(`LIVE-SCALE ${count} real browser players complete eight UI rounds`, async ({ browser }, info) => {
  16  |   test.setTimeout(600000);
  17  |   const origin = process.env.WORDPAIRS_LIVE_ORIGIN!;
  18  |   const contexts: BrowserContext[] = [];
  19  |   const pages: Page[] = [];
  20  |   const ids: string[] = [];
  21  |   const roomId = randomUUID();
  22  |   let created = false;
  23  |   let solves = 0;
  24  |   let uncertainUiRetries = 0;
  25  |   let phase = "identity setup";
  26  |   let completed = false;
  27  |   const started = Date.now();
  28  |   let requestFailureTotal = 0;
  29  |   const requestFailures: { path: string; method: string; action: string | null; phase: string; elapsedMs: number; error: string | null }[] = [];
  30  |   const slowResponses: { path: string; method: string; status: number; durationMs: number; action: string | null }[] = [];
  31  |   const diagnostics: DiagnosticState = { details: slowResponses, failures: [], failureTotal: 0 };
  32  |   const diagnosticHandles: DiagnosticHandle[] = [];
  33  |   const failureListeners: { page: Page; listener: (request: import("@playwright/test").Request) => void }[] = [];
  34  |   const disposeDiagnostics = () => {
  35  |     for (const handle of diagnosticHandles) handle.dispose();
  36  |     for (const { page, listener } of failureListeners) page.off("requestfailed", listener);
  37  |   };
  38  |   const actionOf = (r: import("@playwright/test").Request): string | null => {
  39  |     try { const action = r.postDataJSON()?.action; return typeof action === "string" && ["ready", "presence", "leave", "choose", "answer", "continue"].includes(action) ? action : null; } catch { return null; }
  40  |   };
  41  |   // API setup is real and only arranges identities/membership. Readiness, category
  42  |   // selection and every answer below use the actual browser UI without route fixtures.
  43  |   async function post(context: BrowserContext, path: string, data: unknown) {
  44  |     return context.request.post(path, { headers: { Origin: origin }, data });
  45  |   }
  46  |   async function click(page: Page, action: string, run: () => Promise<unknown>) {
  47  |     const [request] = await Promise.all([
  48  |       page.waitForRequest((r) => r.method() === "POST" && r.url().includes(`/api/rooms/${roomId}`) && r.postDataJSON()?.action === action),
  49  |       run(),
  50  |     ]);
  51  |     // A browser AbortSignal can end an uncertain request without any HTTP
  52  |     // response. The UI retains that command just as it does after5xx.
  53  |     const response = await request.response();
  54  |     return {
  55  |       ok: () => response?.ok() ?? false,
  56  |       status: () => response?.status() ?? 0,
  57  |       json: async () => response ? response.json() : null,
  58  |       request: () => request,
  59  |     };
  60  |   }
  61  |   async function commitUi(page: Page, action: string, run: () => Promise<unknown>, scope: "room" | "game" = "game") {
  62  |     let pendingPayload: unknown;
  63  |     let retryPending = false;
  64  |     for (let attempt = 0; attempt < 12; attempt++) {
  65  |       const result = await click(page, action, retryPending
  66  |         ? () => page.getByRole("button", { name: `Retry pending ${scope} request`, exact: true }).click()
  67  |         : run);
  68  |       const payload = result.request().postDataJSON();
  69  |       if (retryPending) expect(payload).toEqual(pendingPayload);
  70  |       if (result.ok()) return result.json();
  71  |       if (result.status() === 0 || result.status() >= 500) {
  72  |         uncertainUiRetries++;
  73  |         pendingPayload ??= payload;
  74  |         retryPending = true;
  75  |       } else {
  76  |         expect(result.status()).toBe(409);
  77  |         retryPending = false;
  78  |         pendingPayload = undefined;
  79  |       }
  80  |     }
  81  |     throw new Error(`UI ${action} did not converge through explicit conflict/uncertain retries`);
  82  |   }
  83  |   try {
  84  |     for (let i = 0; i < count; i++) {
  85  |       const context = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: process.env.WORDPAIRS_LIVE_LOCAL_TLS === "1", viewport: { width: 390, height: 844 }, extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } });
  86  |       contexts.push(context);
  87  |       const guest = await post(context, "/api/session", { guestCredential: randomBytes(32).toString("base64url") });
  88  |       expect(guest.status()).toBe(200);
  89  |       ids.push((await guest.json()).profile.id);
  90  |     }
  91  |     phase = "membership setup";
  92  |     const made = await post(contexts[0], "/api/rooms", { action: "create", roomId, capacity: count, commandId: randomUUID(), expectedProfileId: ids[0] });
  93  |     expect(made.status()).toBe(200);
  94  |     created = true;
  95  |     const code = (await made.json()).code;
  96  |     for (let i = 1; i < count; i++) {
  97  |       const room = await (await contexts[i].request.get(`/api/rooms/${code}`)).json();
  98  |       const joined = await post(contexts[i], `/api/rooms/${code}`, { action: "join", mode: "player", expectedVersion: room.version, expectedProfileId: ids[i], commandId: randomUUID() });
  99  |       expect(joined.status()).toBe(200);
  100 |     }
  101 |     // Bound simultaneous navigations across the supported fifteen-player room.
  102 |     for (let i = 0; i < count; i += 4) {
  103 |       const batch = await Promise.all(contexts.slice(i, i + 4).map(async (context) => {
  104 |         const page = await context.newPage();
  105 |         const failureListener = (r: import("@playwright/test").Request) => { requestFailureTotal++; if (requestFailures.length < 100) requestFailures.push({ path: new URL(r.url()).pathname, method: r.method(), action: actionOf(r), phase, elapsedMs: Date.now() - started, error: r.failure()?.errorText ?? null }); };
  106 |         page.on("requestfailed", failureListener);
  107 |         failureListeners.push({ page, listener: failureListener });
  108 |         diagnosticHandles.push(attachRequestDiagnostics(page, diagnostics));
  109 |         await page.goto(`/rooms/${roomId}`); return page;
  110 |       }));
  111 |       pages.push(...batch);
  112 |     }
  113 |     for (const page of pages) {
  114 |       phase = "UI readiness";
> 115 |       await expect(page.getByText("● Live updates connected", { exact: true })).toBeVisible();
      |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  116 |       await commitUi(page, "ready", () => page.getByRole("button", { name: "Mark ready", exact: true }).click(), "room");
  117 |     }
  118 |     for (let round = 1; round <= 8; round++) {
  119 |       phase = `UI round ${round}`;
  120 |       console.log(`LIVE_SCALE players=${count} round=${round}`);
  121 |       await expect.poll(async () => (await Promise.all(pages.map((p) => p.getByRole("button", { name: "Opposites", exact: true }).isVisible()))).filter(Boolean).length, { timeout: 20000 }).toBe(1);
  122 |       const chooser = (await Promise.all(pages.map(async (p) => (await p.getByRole("button", { name: "Opposites", exact: true }).isVisible()) ? p : null))).find((p) => p)!;
  123 |       const chosen = await commitUi(chooser, "choose", () => chooser.getByRole("button", { name: "Opposites", exact: true }).click());
  124 |       const categoryVersion = chosen.version;
  125 |       await Promise.all(pages.map(async (p) => {
  126 |         await expect.poll(async () => Number(await p.locator(".game-panel").getAttribute("data-match-version"))).toBeGreaterThanOrEqual(categoryVersion);
  127 |         await expect(p.locator(".game-prompt")).toBeVisible();
  128 |         await expect(p.locator(".answer-reveal")).toHaveCount(0);
  129 |       }));
  130 |       const prompt = (await pages[0].locator(".game-prompt").textContent())!.trim();
  131 |       const pair = seed.pairs.find((p) => p.categoryId === "opposites" && p.prompt === prompt);
  132 |       if (!pair) throw new Error("The seeded Opposites catalog is required for live UI answer lookup");
  133 |       for (let batch = 0; batch < pages.length; batch += 2) {
  134 |       const submissions = await Promise.allSettled(pages.slice(batch, batch + 2).map(async (page) => {
  135 |         const solved = await commitUi(page, "answer", async () => {
  136 |           await expect(page.getByLabel("Your answer", { exact: true })).toBeEnabled();
  137 |           await page.getByLabel("Your answer", { exact: true }).fill(pair.target);
  138 |           await page.getByRole("button", { name: "Submit answer", exact: true }).click();
  139 |         });
  140 |         expect(solved.correct).toBe(true);
  141 |         solves++;
  142 |       }));
  143 |       const failed = submissions.find((r) => r.status === "rejected");
  144 |       if (failed?.status === "rejected") throw failed.reason;
  145 |       }
  146 |       await Promise.all(pages.map((p) => expect(p.locator(".answer-reveal")).toContainText(pair.target)));
  147 |     }
  148 |     const ranking = await pages[0].getByRole("table", { name: "Final ranking", exact: true }).textContent();
  149 |     for (const page of pages) {
  150 |       await expect(page.getByRole("heading", { name: "Final standings", exact: true })).toBeVisible();
  151 |       expect(await page.getByRole("table", { name: "Final ranking", exact: true }).textContent()).toBe(ranking);
  152 |     }
  153 |     expect(solves).toBe(count * 8);
  154 |     completed = true;
  155 |     await info.attach("live-scale-result", { body: JSON.stringify({ players: count, rounds: 8, uiSolves: solves, uncertainUiRetries, simultaneousAnswerUis: 2, realHttp: true, realPrivateWebSockets: true, apiSetup: true }), contentType: "application/json" });
  156 |   } catch (error) {
  157 |     const uiStates = await Promise.all(pages.map(async (page, player) => ({ player, closed: page.isClosed(), browserConnected: browser.isConnected(), body: await page.locator("body").innerText({ timeout: 2000 }).catch((problem: unknown) => `Page unavailable: ${problem instanceof Error ? problem.message.slice(0, 500) : "Unknown error"}`) })));
  158 |     await writeFile(`docs/evidence/room-sync/live-scale-${count}-failure-ui.json`, JSON.stringify({ players: count, phase, uiStates, requestFailureTotal, requestFailures, slowResponses }, null, 2));
  159 |     await pages[0]?.screenshot({ path: info.outputPath("failure-ui.png"), fullPage: true, timeout: 5000 }).catch(() => {});
  160 |     await info.attach("live-scale-failure", { body: JSON.stringify({ players: count, phase, uiSolves: solves, uncertainUiRetries, requestFailureTotal, requestFailures, slowResponses }), contentType: "application/json" });
  161 |     throw error;
  162 |   } finally {
  163 |     let cleanup = { cleanupFailures: 0, roomClosed: false, unresolvedPlayerIndices: [] as number[] };
  164 |     try {
  165 |       if (created) cleanup = await cleanupOwnedRoom(contexts.map((context, index) => ({
  166 |         profileId: ids[index],
  167 |         read: async () => {
  168 |           const response = await context.request.get(`/api/rooms/${roomId}`);
  169 |           const body = await response.text();
  170 |           return { status: response.status(), body: response.ok() ? JSON.parse(body) : undefined };
  171 |         },
  172 |         leave: async command => {
  173 |           const response = await post(context, `/api/rooms/${roomId}/lobby`, { action: "leave", expectedProfileId: ids[index], ...command });
  174 |           await response.body();
  175 |           return { status: response.status() };
  176 |         },
  177 |       })), randomUUID);
  178 |       disposeDiagnostics();
  179 |       const requestDiagnostics = { failureTotal: diagnostics.failureTotal, failures: diagnostics.failures, failuresTruncated: diagnostics.failureTotal > diagnostics.failures.length, pendingAtDispose: diagnosticHandles.reduce((total, handle) => total + handle.pendingAtDispose, 0), qualification: "Response headers keyed by Request identity; timing captured at completion. Pending requests at diagnostic disposal are excluded before context shutdown." };
  180 |       await writeFile(`docs/evidence/room-sync/live-scale-${count}.json`, JSON.stringify({ players: count, phase, completed, rounds: completed ? 8 : null, uiSolves: solves, uncertainUiRetries, simultaneousAnswerUis: 2, cleanupFailures: cleanup.cleanupFailures, unresolvedPlayerIndices: cleanup.unresolvedPlayerIndices, completedRoomRetained: cleanup.roomClosed, requestFailureTotal, requestFailuresTruncated: requestFailureTotal > requestFailures.length, requestFailures, slowResponses, requestDiagnostics, realHttp: true, apiSetup: true, qualification: "Actual network and private WebSockets with ordinary safety/presence reads enabled. Strict push-only behavior is verified separately." }, null, 2));
  181 |       await info.attach("live-scale-cleanup", { body: JSON.stringify({ players: count, cleanupFailures: cleanup.cleanupFailures, unresolvedPlayerIndices: cleanup.unresolvedPlayerIndices, ownRoomOnly: true }), contentType: "application/json" });
  182 |     } finally {
  183 |       disposeDiagnostics();
  184 |       await Promise.allSettled(contexts.map((context) => context.close()));
  185 |     }
  186 |     if (completed) {
  187 |       expect(cleanup.cleanupFailures, "Owned room cleanup must be verified").toBe(0);
  188 |       expect(diagnostics.failureTotal, "Active request instrumentation must retain complete response evidence").toBe(0);
  189 |     }
  190 |   }
  191 | });
  192 | 
```