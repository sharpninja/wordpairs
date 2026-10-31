import { randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import seed from "../../src/infrastructure/catalog-seed.json" with { type: "json" };
import { cleanupOwnedRoom } from "./owned-room-cleanup";
import { attach as attachRequestDiagnostics } from "./request-diagnostics";
import type { DiagnosticHandle, DiagnosticState } from "./request-diagnostics.contract";
import { readyAfterBarrier } from "./readiness-barrier";
import { captureUiCommand, commitUiCommand } from "./ui-command-capture";

const counts = process.env.WORDPAIRS_LIVE_PLAYER_COUNTS
  ? process.env.WORDPAIRS_LIVE_PLAYER_COUNTS.split(",").map(Number)
  : Array.from({ length: 14 }, (_, i) => i + 2);
if (counts.some((n) => !Number.isInteger(n) || n < 2 || n > 15) || new Set(counts).size !== counts.length)
  throw new Error("WORDPAIRS_LIVE_PLAYER_COUNTS must contain unique player counts from2 through15");

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
  const diagnostics: DiagnosticState = { details: slowResponses, failures: [], failureTotal: 0 };
  const diagnosticHandles: DiagnosticHandle[] = [];
  const preparedActors: string[] = [];
  const readinessObservations: { phase: "prepared" | "ready"; player: number; expectedProfileId: string; actorId: string; uiRosterCount: number; version: number }[] = [];
  const commandBodyFailures: { player: number; phase: string; action: string | null; commandId: string | null; expectedProfileId: string | null; status: number; pendingControl: "visible-enabled" | "not-observed-enabled" }[] = [];
  const failureListeners: { page: Page; listener: (request: import("@playwright/test").Request) => void }[] = [];
  const disposeDiagnostics = () => {
    for (const handle of diagnosticHandles) handle.dispose();
    for (const { page, listener } of failureListeners) page.off("requestfailed", listener);
  };
  const actionOf = (r: import("@playwright/test").Request): string | null => {
    try { const action = r.postDataJSON()?.action; return typeof action === "string" && ["ready", "presence", "leave", "choose", "answer", "continue"].includes(action) ? action : null; } catch { return null; }
  };
  // API setup is real and only arranges identities/membership. Readiness, category
  // selection and every answer below use the actual browser UI without route fixtures.
  async function post(context: BrowserContext, path: string, data: unknown) {
    return context.request.post(path, { headers: { Origin: origin }, data });
  }
  async function click(page: Page, action: string, run: () => Promise<unknown>) {
    return captureUiCommand(
      () => page.waitForRequest((r) => r.method() === "POST" && r.url().includes(`/api/rooms/${roomId}`) && r.postDataJSON()?.action === action),
      run,
    );
  }
  async function commitUi(page: Page, action: string, run: () => Promise<unknown>, scope: "room" | "game" = "game") {
    const pending = page.getByRole("button", { name: `Retry pending ${scope} request`, exact: true });
    return commitUiCommand<{ version: number; correct: boolean }>(action, {
      invoke: (retryPending) => click(page, action, retryPending
        ? () => page.getByRole("button", { name: `Retry pending ${scope} request`, exact: true }).click()
        : run),
      pendingReady: async () => {
        try { await expect(pending).toBeVisible(); await expect(pending).toBeEnabled(); return true; }
        catch { return false; }
      },
      assertPayload: (payload, original) => { expect(payload).toEqual(original); },
      uncertain: () => { uncertainUiRetries++; },
      bodyError: ({ request, status, pending: enabled }) => {
        const data: unknown = request.postDataJSON();
        const payload = typeof data === "object" && data !== null ? data as Record<string, unknown> : {};
        const uuid = (value: unknown) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
        commandBodyFailures.push({ player: pages.indexOf(page), phase, action: typeof payload.action === "string" && ["ready", "leave", "choose", "answer", "continue"].includes(payload.action) ? payload.action : null, commandId: uuid(payload.commandId), expectedProfileId: uuid(payload.expectedProfileId), status, pendingControl: enabled ? "visible-enabled" : "not-observed-enabled" });
      },
    });
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
    // Bound simultaneous navigations across the supported fifteen-player room.
    for (let i = 0; i < count; i += 4) {
      const batch = await Promise.all(contexts.slice(i, i + 4).map(async (context) => {
        const page = await context.newPage();
        const failureListener = (r: import("@playwright/test").Request) => { requestFailureTotal++; if (requestFailures.length < 100) requestFailures.push({ path: new URL(r.url()).pathname, method: r.method(), action: actionOf(r), phase, elapsedMs: Date.now() - started, error: r.failure()?.errorText ?? null }); };
        page.on("requestfailed", failureListener);
        failureListeners.push({ page, listener: failureListener });
        diagnosticHandles.push(attachRequestDiagnostics(page, diagnostics));
        await page.goto(`/rooms/${roomId}`); return page;
      }));
      pages.push(...batch);
    }
    // A slow final connection must not become the sole unready holdout while
    // earlier pages are readied. Complete actual UI preparation for everyone.
    phase = "UI readiness barrier";
    await readyAfterBarrier(pages, async (page, player) => {
      await expect(page.getByText("● Live updates connected", { exact: true })).toBeVisible();
      await expect(page.locator(".roster > li")).toHaveCount(count);
      const ready = page.getByRole("button", { name: "Mark ready", exact: true });
      await expect(ready).toBeVisible();
      await expect(ready).toBeEnabled();
      // Attribute UI setup to its real same-context actor, without readiness
      // injection or an additional diagnostic read between ready commands.
      const response = await contexts[player].request.get(`/api/rooms/${roomId}`);
      expect(response.status()).toBe(200);
      const room = await response.json();
      expect(room.actorId).toBe(ids[player]);
      expect(room.role).toBe("player");
      expect(room.players).toHaveLength(count);
      preparedActors[player] = room.actorId;
      readinessObservations.push({ phase: "prepared", player, expectedProfileId: ids[player], actorId: room.actorId, uiRosterCount: await page.locator(".roster > li").count(), version: room.version });
    }, async (page, player) => {
      phase = "UI readiness";
      const ready = await commitUi(page, "ready", () => page.getByRole("button", { name: "Mark ready", exact: true }).click(), "room");
      readinessObservations.push({ phase: "ready", player, expectedProfileId: ids[player], actorId: preparedActors[player], uiRosterCount: await page.locator(".roster > li").count(), version: ready.version });
    });
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
    await writeFile(`docs/evidence/room-sync/live-scale-${count}-failure-ui.json`, JSON.stringify({ players: count, phase, uiStates, readinessObservations, commandBodyFailures, requestFailureTotal, requestFailures, slowResponses }, null, 2));
    await pages[0]?.screenshot({ path: info.outputPath("failure-ui.png"), fullPage: true, timeout: 5000 }).catch(() => {});
    await info.attach("live-scale-failure", { body: JSON.stringify({ players: count, phase, uiSolves: solves, uncertainUiRetries, readinessObservations, commandBodyFailures, requestFailureTotal, requestFailures, slowResponses }), contentType: "application/json" });
    throw error;
  } finally {
    let cleanup = { cleanupFailures: 0, roomClosed: false, unresolvedPlayerIndices: [] as number[] };
    try {
      if (created) cleanup = await cleanupOwnedRoom(contexts.map((context, index) => ({
        profileId: ids[index],
        read: async () => {
          const response = await context.request.get(`/api/rooms/${roomId}`);
          const body = await response.text();
          return { status: response.status(), body: response.ok() ? JSON.parse(body) : undefined };
        },
        leave: async command => {
          const response = await post(context, `/api/rooms/${roomId}/lobby`, { action: "leave", expectedProfileId: ids[index], ...command });
          await response.body();
          return { status: response.status() };
        },
      })), randomUUID);
      disposeDiagnostics();
      const requestDiagnostics = { failureTotal: diagnostics.failureTotal, failures: diagnostics.failures, failuresTruncated: diagnostics.failureTotal > diagnostics.failures.length, pendingAtDispose: diagnosticHandles.reduce((total, handle) => total + handle.pendingAtDispose, 0), qualification: "Response headers keyed by Request identity; timing captured at completion. Pending requests at diagnostic disposal are excluded before context shutdown." };
      await writeFile(`docs/evidence/room-sync/live-scale-${count}.json`, JSON.stringify({ players: count, phase, completed, rounds: completed ? 8 : null, uiSolves: solves, uncertainUiRetries, simultaneousAnswerUis: 2, cleanupFailures: cleanup.cleanupFailures, unresolvedPlayerIndices: cleanup.unresolvedPlayerIndices, completedRoomRetained: cleanup.roomClosed, readinessObservations, commandBodyFailures, requestFailureTotal, requestFailuresTruncated: requestFailureTotal > requestFailures.length, requestFailures, slowResponses, requestDiagnostics, realHttp: true, apiSetup: true, qualification: "Actual network and private WebSockets with ordinary safety/presence reads enabled. Strict push-only behavior is verified separately." }, null, 2));
      await info.attach("live-scale-cleanup", { body: JSON.stringify({ players: count, cleanupFailures: cleanup.cleanupFailures, unresolvedPlayerIndices: cleanup.unresolvedPlayerIndices, ownRoomOnly: true }), contentType: "application/json" });
    } finally {
      disposeDiagnostics();
      await Promise.allSettled(contexts.map((context) => context.close()));
    }
    if (completed) {
      expect(cleanup.cleanupFailures, "Owned room cleanup must be verified").toBe(0);
      expect(diagnostics.failureTotal, "Active request instrumentation must retain complete response evidence").toBe(0);
    }
  }
});
