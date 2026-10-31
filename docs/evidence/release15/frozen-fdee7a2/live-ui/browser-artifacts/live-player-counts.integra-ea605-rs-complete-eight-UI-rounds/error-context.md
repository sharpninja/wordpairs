# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-player-counts.integration.spec.ts >> LIVE-SCALE 10 real browser players complete eight UI rounds
- Location: tests/browser/live-player-counts.integration.spec.ts:17:29

# Error details

```
AggregateError: 
```

```
TimeoutError: page.waitForRequest: Timeout 30000ms exceeded while waiting for event "request"
```

```
Error: expect(locator).toBeEnabled() failed

Locator:  getByLabel('Your answer', { exact: true })
Expected: enabled
Received: disabled
Timeout:  30000ms

Call log:
  - Expect "toBeEnabled" getByLabel('Your answer', { exact: true }) with timeout 30000ms
  - waiting for getByLabel('Your answer', { exact: true })
    63 × locator resolved to <input disabled type="text" value="Late" name="answer" maxlength="200" autocomplete="off" id="answer-384e5b4e-71cf-4474-8433-5b52b78a4897"/>
       - unexpected value "disabled"

```

```yaml
- textbox "Your answer" [disabled]: Late
```

# Test source

```ts
  49  |     return context.request.post(path, { headers: { Origin: origin }, data });
  50  |   }
  51  |   async function click(page: Page, action: string, run: () => Promise<unknown>) {
  52  |     return captureUiCommand(
  53  |       () => page.waitForRequest((r) => r.method() === "POST" && r.url().includes(`/api/rooms/${roomId}`) && r.postDataJSON()?.action === action),
  54  |       run,
  55  |     );
  56  |   }
  57  |   async function commitUi(page: Page, action: string, run: () => Promise<unknown>, scope: "room" | "game" = "game") {
  58  |     const pending = page.getByRole("button", { name: `Retry pending ${scope} request`, exact: true });
  59  |     return commitUiCommand<{ version: number; correct: boolean }>(action, {
  60  |       invoke: (retryPending) => click(page, action, retryPending
  61  |         ? () => page.getByRole("button", { name: `Retry pending ${scope} request`, exact: true }).click()
  62  |         : run),
  63  |       pendingReady: async () => {
  64  |         try { await expect(pending).toBeVisible(); await expect(pending).toBeEnabled(); return true; }
  65  |         catch { return false; }
  66  |       },
  67  |       assertPayload: (payload, original) => { expect(payload).toEqual(original); },
  68  |       uncertain: () => { uncertainUiRetries++; },
  69  |       bodyError: ({ request, status, pending: enabled }) => {
  70  |         const data: unknown = request.postDataJSON();
  71  |         const payload = typeof data === "object" && data !== null ? data as Record<string, unknown> : {};
  72  |         const uuid = (value: unknown) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
  73  |         commandBodyFailures.push({ player: pages.indexOf(page), phase, action: typeof payload.action === "string" && ["ready", "leave", "choose", "answer", "continue"].includes(payload.action) ? payload.action : null, commandId: uuid(payload.commandId), expectedProfileId: uuid(payload.expectedProfileId), status, pendingControl: enabled ? "visible-enabled" : "not-observed-enabled" });
  74  |       },
  75  |     });
  76  |   }
  77  |   try {
  78  |     for (let i = 0; i < count; i++) {
  79  |       const context = await browser.newContext({ baseURL: origin, ignoreHTTPSErrors: process.env.WORDPAIRS_LIVE_LOCAL_TLS === "1", viewport: { width: 390, height: 844 }, extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } });
  80  |       contexts.push(context);
  81  |       const guest = await post(context, "/api/session", { guestCredential: randomBytes(32).toString("base64url") });
  82  |       expect(guest.status()).toBe(200);
  83  |       ids.push((await guest.json()).profile.id);
  84  |     }
  85  |     phase = "membership setup";
  86  |     const made = await post(contexts[0], "/api/rooms", { action: "create", roomId, capacity: count, commandId: randomUUID(), expectedProfileId: ids[0] });
  87  |     expect(made.status()).toBe(200);
  88  |     created = true;
  89  |     const code = (await made.json()).code;
  90  |     for (let i = 1; i < count; i++) {
  91  |       const room = await (await contexts[i].request.get(`/api/rooms/${code}`)).json();
  92  |       const joined = await post(contexts[i], `/api/rooms/${code}`, { action: "join", mode: "player", expectedVersion: room.version, expectedProfileId: ids[i], commandId: randomUUID() });
  93  |       expect(joined.status()).toBe(200);
  94  |     }
  95  |     // Bound simultaneous navigations across the supported fifteen-player room.
  96  |     for (let i = 0; i < count; i += 4) {
  97  |       const batch = await Promise.all(contexts.slice(i, i + 4).map(async (context) => {
  98  |         const page = await context.newPage();
  99  |         const failureListener = (r: import("@playwright/test").Request) => { requestFailureTotal++; if (requestFailures.length < 100) requestFailures.push({ path: new URL(r.url()).pathname, method: r.method(), action: actionOf(r), phase, elapsedMs: Date.now() - started, error: r.failure()?.errorText ?? null }); };
  100 |         page.on("requestfailed", failureListener);
  101 |         failureListeners.push({ page, listener: failureListener });
  102 |         diagnosticHandles.push(attachRequestDiagnostics(page, diagnostics));
  103 |         await page.goto(`/rooms/${roomId}`); return page;
  104 |       }));
  105 |       pages.push(...batch);
  106 |     }
  107 |     // A slow final connection must not become the sole unready holdout while
  108 |     // earlier pages are readied. Complete actual UI preparation for everyone.
  109 |     phase = "UI readiness barrier";
  110 |     await readyAfterBarrier(pages, async (page, player) => {
  111 |       await expect(page.getByText("● Live updates connected", { exact: true })).toBeVisible();
  112 |       await expect(page.locator(".roster > li")).toHaveCount(count);
  113 |       const ready = page.getByRole("button", { name: "Mark ready", exact: true });
  114 |       await expect(ready).toBeVisible();
  115 |       await expect(ready).toBeEnabled();
  116 |       // Attribute UI setup to its real same-context actor, without readiness
  117 |       // injection or an additional diagnostic read between ready commands.
  118 |       const response = await contexts[player].request.get(`/api/rooms/${roomId}`);
  119 |       expect(response.status()).toBe(200);
  120 |       const room = await response.json();
  121 |       expect(room.actorId).toBe(ids[player]);
  122 |       expect(room.role).toBe("player");
  123 |       expect(room.players).toHaveLength(count);
  124 |       preparedActors[player] = room.actorId;
  125 |       readinessObservations.push({ phase: "prepared", player, expectedProfileId: ids[player], actorId: room.actorId, uiRosterCount: await page.locator(".roster > li").count(), version: room.version });
  126 |     }, async (page, player) => {
  127 |       phase = "UI readiness";
  128 |       const ready = await commitUi(page, "ready", () => page.getByRole("button", { name: "Mark ready", exact: true }).click(), "room");
  129 |       readinessObservations.push({ phase: "ready", player, expectedProfileId: ids[player], actorId: preparedActors[player], uiRosterCount: await page.locator(".roster > li").count(), version: ready.version });
  130 |     });
  131 |     for (let round = 1; round <= 8; round++) {
  132 |       phase = `UI round ${round}`;
  133 |       console.log(`LIVE_SCALE players=${count} round=${round}`);
  134 |       await expect.poll(async () => (await Promise.all(pages.map((p) => p.getByRole("button", { name: "Opposites", exact: true }).isVisible()))).filter(Boolean).length, { timeout: 20000 }).toBe(1);
  135 |       const chooser = (await Promise.all(pages.map(async (p) => (await p.getByRole("button", { name: "Opposites", exact: true }).isVisible()) ? p : null))).find((p) => p)!;
  136 |       const chosen = await commitUi(chooser, "choose", () => chooser.getByRole("button", { name: "Opposites", exact: true }).click());
  137 |       const categoryVersion = chosen.version;
  138 |       await Promise.all(pages.map(async (p) => {
  139 |         await expect.poll(async () => Number(await p.locator(".game-panel").getAttribute("data-match-version"))).toBeGreaterThanOrEqual(categoryVersion);
  140 |         await expect(p.locator(".game-prompt")).toBeVisible();
  141 |         await expect(p.locator(".answer-reveal")).toHaveCount(0);
  142 |       }));
  143 |       const prompt = (await pages[0].locator(".game-prompt").textContent())!.trim();
  144 |       const pair = seed.pairs.find((p) => p.categoryId === "opposites" && p.prompt === prompt);
  145 |       if (!pair) throw new Error("The seeded Opposites catalog is required for live UI answer lookup");
  146 |       for (let batch = 0; batch < pages.length; batch += 2) {
  147 |       const submissions = await Promise.allSettled(pages.slice(batch, batch + 2).map(async (page) => {
  148 |         const solved = await commitUi(page, "answer", async () => {
> 149 |           await expect(page.getByLabel("Your answer", { exact: true })).toBeEnabled();
      |                                                                         ^ Error: expect(locator).toBeEnabled() failed
  150 |           await page.getByLabel("Your answer", { exact: true }).fill(pair.target);
  151 |           await page.getByRole("button", { name: "Submit answer", exact: true }).click();
  152 |         });
  153 |         expect(solved.correct).toBe(true);
  154 |         solves++;
  155 |       }));
  156 |       const failed = submissions.find((r) => r.status === "rejected");
  157 |       if (failed?.status === "rejected") throw failed.reason;
  158 |       }
  159 |       await Promise.all(pages.map((p) => expect(p.locator(".answer-reveal")).toContainText(pair.target)));
  160 |     }
  161 |     const ranking = await pages[0].getByRole("table", { name: "Final ranking", exact: true }).textContent();
  162 |     for (const page of pages) {
  163 |       await expect(page.getByRole("heading", { name: "Final standings", exact: true })).toBeVisible();
  164 |       expect(await page.getByRole("table", { name: "Final ranking", exact: true }).textContent()).toBe(ranking);
  165 |     }
  166 |     expect(solves).toBe(count * 8);
  167 |     completed = true;
  168 |     await info.attach("live-scale-result", { body: JSON.stringify({ players: count, rounds: 8, uiSolves: solves, uncertainUiRetries, simultaneousAnswerUis: 2, realHttp: true, realPrivateWebSockets: true, apiSetup: true }), contentType: "application/json" });
  169 |   } catch (error) {
  170 |     const uiStates = await Promise.all(pages.map(async (page, player) => ({ player, closed: page.isClosed(), browserConnected: browser.isConnected(), body: await page.locator("body").innerText({ timeout: 2000 }).catch((problem: unknown) => `Page unavailable: ${problem instanceof Error ? problem.message.slice(0, 500) : "Unknown error"}`) })));
  171 |     await writeFile(`docs/evidence/room-sync/live-scale-${count}-failure-ui.json`, JSON.stringify({ players: count, phase, uiStates, readinessObservations, commandBodyFailures, requestFailureTotal, requestFailures, slowResponses }, null, 2));
  172 |     await pages[0]?.screenshot({ path: info.outputPath("failure-ui.png"), fullPage: true, timeout: 5000 }).catch(() => {});
  173 |     await info.attach("live-scale-failure", { body: JSON.stringify({ players: count, phase, uiSolves: solves, uncertainUiRetries, readinessObservations, commandBodyFailures, requestFailureTotal, requestFailures, slowResponses }), contentType: "application/json" });
  174 |     throw error;
  175 |   } finally {
  176 |     let cleanup = { cleanupFailures: 0, roomClosed: false, unresolvedPlayerIndices: [] as number[] };
  177 |     try {
  178 |       if (created) cleanup = await cleanupOwnedRoom(contexts.map((context, index) => ({
  179 |         profileId: ids[index],
  180 |         read: async () => {
  181 |           const response = await context.request.get(`/api/rooms/${roomId}`);
  182 |           const body = await response.text();
  183 |           return { status: response.status(), body: response.ok() ? JSON.parse(body) : undefined };
  184 |         },
  185 |         leave: async command => {
  186 |           const response = await post(context, `/api/rooms/${roomId}/lobby`, { action: "leave", expectedProfileId: ids[index], ...command });
  187 |           await response.body();
  188 |           return { status: response.status() };
  189 |         },
  190 |       })), randomUUID);
  191 |       disposeDiagnostics();
  192 |       const requestDiagnostics = { failureTotal: diagnostics.failureTotal, failures: diagnostics.failures, failuresTruncated: diagnostics.failureTotal > diagnostics.failures.length, pendingAtDispose: diagnosticHandles.reduce((total, handle) => total + handle.pendingAtDispose, 0), qualification: "Response headers keyed by Request identity; timing captured at completion. Pending requests at diagnostic disposal are excluded before context shutdown." };
  193 |       await writeFile(`docs/evidence/room-sync/live-scale-${count}.json`, JSON.stringify({ players: count, phase, completed, rounds: completed ? 8 : null, uiSolves: solves, uncertainUiRetries, simultaneousAnswerUis: 2, cleanupFailures: cleanup.cleanupFailures, unresolvedPlayerIndices: cleanup.unresolvedPlayerIndices, completedRoomRetained: cleanup.roomClosed, readinessObservations, commandBodyFailures, requestFailureTotal, requestFailuresTruncated: requestFailureTotal > requestFailures.length, requestFailures, slowResponses, requestDiagnostics, realHttp: true, apiSetup: true, qualification: "Actual network and private WebSockets with ordinary safety/presence reads enabled. Strict push-only behavior is verified separately." }, null, 2));
  194 |       await info.attach("live-scale-cleanup", { body: JSON.stringify({ players: count, cleanupFailures: cleanup.cleanupFailures, unresolvedPlayerIndices: cleanup.unresolvedPlayerIndices, ownRoomOnly: true }), contentType: "application/json" });
  195 |     } finally {
  196 |       disposeDiagnostics();
  197 |       await Promise.allSettled(contexts.map((context) => context.close()));
  198 |     }
  199 |     if (completed) {
  200 |       expect(cleanup.cleanupFailures, "Owned room cleanup must be verified").toBe(0);
  201 |       expect(diagnostics.failureTotal, "Active request instrumentation must retain complete response evidence").toBe(0);
  202 |     }
  203 |   }
  204 | });
  205 | 
```