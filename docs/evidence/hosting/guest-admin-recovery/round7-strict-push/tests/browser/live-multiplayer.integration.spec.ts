import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createSupabasePool } from "../../src/infrastructure/postgres-pool";
import seed from "../../src/infrastructure/catalog-seed.json" with {
  type: "json",
};

type Notice = {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  receivedAt: number;
};
test("LIVE real two-player and observer UI: private push, all eight rounds, autonomous deadlines, renewal and reconnect", async ({
  browser,
}, info) => {
  const origin = process.env.WORDPAIRS_LIVE_ORIGIN!;
  const runtimePath = process.env.WORDPAIRS_LIVE_RUNTIME_PATH;
  if (!runtimePath)
    throw new Error(
      "WORDPAIRS_LIVE_RUNTIME_PATH is required for the no-browser-read scheduler proof",
    );
  const settings = JSON.parse(await readFile(runtimePath, "utf8"));
  const pool = createSupabasePool(
    settings.WORDPAIRS_DATABASE_URL,
    settings.WORDPAIRS_DATABASE_CA,
  );
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  const notices: Notice[][] = [[], [], []];
  const expiries: number[][] = [[], [], []];
  const reads: { type: string; version: number; receivedAt: number }[][] = [[], [], []];
  const transport: { player: number; at: number; event: string; status?: string; message?: string }[] = [];
  const profileIds: string[] = [];
  let presence: ReturnType<typeof setInterval> | undefined;
  let paused = false;
  let presenceBusy = false;
  const aliases: string[] = [];
  const services: SupabaseClient[] = [];
  let roomId = "";
  const started = Date.now();
  const milestones: Record<string, unknown> = {
    periodicPollsSuppressed: true,
    httpMocks: false,
  };
  const changed = async (index: number, before: number, type = "match", version = 0) => {
    await expect
      .poll(() =>
        notices[index].slice(before).some((n) => n.aggregateId === roomId && n.aggregateType === type && n.version >= version && reads[index].some((r) => r.type === type && r.version >= n.version && r.receivedAt >= n.receivedAt)),
      )
      .toBe(true);
  };
  async function command(page: Page, click: () => Promise<unknown>) {
    const response = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes(`/api/rooms/`));
    await click();
    const result = await response;
    expect(result.status()).toBe(200);
    return (await result.json()).version as number;
  }
  async function answer(page: Page, value: string) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await expect(page.getByLabel("Your answer", { exact: true })).toBeEnabled();
      const before = Number(await page.locator(".game-panel").getAttribute("data-match-version"));
      await page.getByLabel("Your answer", { exact: true }).fill(value);
      const response = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/match") && r.request().postDataJSON()?.action === "answer");
      await page.getByRole("button", { name: "Submit answer", exact: true }).click();
      const result = await response;
      if (result.ok()) { const solved = await result.json(); expect(solved.correct).toBe(true); return solved.version as number; }
      expect(result.status()).toBe(409);
      await expect.poll(async () => Number(await page.locator(".game-panel").getAttribute("data-match-version"))).toBeGreaterThan(before);
    }
    throw new Error("Explicit UI answer submissions did not converge after stage/version conflict");
  }
  try {
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext({
        baseURL: origin,
        ignoreHTTPSErrors: process.env.WORDPAIRS_LIVE_LOCAL_TLS === "1",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" },
      });
      contexts.push(context);
      await context.addInitScript(() => {
        // Real network remains intact. Disable safety polls and the UI presence/read loop.
        const interval = window.setInterval.bind(window);
        window.setInterval = ((
          handler: TimerHandler,
          timeout?: number,
          ...args: unknown[]
        ) =>
          interval(
            [1000, 15000, 20000].includes(Number(timeout)) ? () => {} : handler,
            timeout,
            ...args,
          )) as typeof window.setInterval;
        const NativeSocket = window.WebSocket;
        const sockets: WebSocket[] = [];
        Object.assign(window, { __liveTestSockets: sockets });
        window.WebSocket = class extends NativeSocket {
          constructor(url: string | URL, protocols?: string | string[]) {
            super(url, protocols);
            sockets.push(this);
          }
        };
      });
      const page = await context.newPage();
      pages.push(page);
      page.on("websocket", (socket) => {
        transport.push({ player: i, at: Date.now(), event: "socket-open" });
        socket.on("close", () => transport.push({ player: i, at: Date.now(), event: "socket-close" }));
        socket.on("socketerror", () => transport.push({ player: i, at: Date.now(), event: "socket-error" }));
        socket.on("framereceived", (frame) => {
          try {
            const data = JSON.parse(String(frame.payload));
            const envelope = Array.isArray(data) ? { event: data[3], payload: data[4] } : data;
            if (["phx_reply", "phx_error", "phx_close", "system"].includes(envelope.event)) transport.push({ player: i, at: Date.now(), event: envelope.event, status: envelope.payload?.status, message: String(envelope.payload?.message ?? "").replace(/eyJ[A-Za-z0-9_.-]+/g, "[redacted-token]") });
            const event = Array.isArray(data) ? data[4]?.payload : data.payload;
            if (event && typeof event.eventId === "string") {
              expect(Object.keys(event).sort()).toEqual([
                "aggregateId",
                "aggregateType",
                "eventId",
                "version",
              ]);
              notices[i].push({ ...event, receivedAt: Date.now() });
            }
          } catch (error) {
            if (!(error instanceof SyntaxError)) throw error;
          }
        });
      });
      page.on("response", async (response) => {
        const path = new URL(response.url()).pathname;
        if (response.request().method() === "GET" && response.ok() && roomId && path.startsWith(`/api/rooms/${roomId}`)) {
          try {
            const data = await response.json();
            reads[i].push({ type: path.endsWith("/match") ? "match" : path.endsWith("/reactions") ? "moderation" : "room", version: data.version, receivedAt: Date.now() });
          } catch { /* Navigation can cancel a response body. */ }
        }
        if (
          new URL(response.url()).pathname === "/api/realtime" &&
          response.ok()
        ) {
          const access = await response.json();
          expiries[i].push(access.expiresAt);
        }
      });
      await page.goto("/play");
      await page
        .getByRole("button", { name: "Continue as guest", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Your player profile" }),
      ).toBeVisible();
      aliases.push(
        (await page.locator(".profile-alias strong").textContent())!.trim(),
      );
      profileIds.push((await (await context.request.get("/api/session")).json()).profile.id);
    }
    const [a, b, observer] = pages;
    await a.getByLabel("Maximum players (2–25)").fill("2");
    await a.getByRole("button", { name: "Create room", exact: true }).click();
    await a.waitForURL(/\/rooms\//);
    roomId = new URL(a.url()).pathname.split("/").at(-1)!;
    const code = (await a.locator(".room-code strong").textContent())!.trim();
    await expect(
      a.getByText("● Live updates connected", { exact: true }),
    ).toBeVisible();
    const hostBeforeJoin = notices[0].length;
    await b.getByLabel("Have a room code?").fill(code);
    await b.getByRole("button", { name: "Open room", exact: true }).click();
    const joinedVersion = await command(b, () => b
      .getByRole("button", { name: "Join as player", exact: true })
      .click());
    await changed(0, hostBeforeJoin, "room", joinedVersion);
    await expect(a.locator(".roster")).toContainText(aliases[1]);
    await expect(
      b.getByText("● Live updates connected", { exact: true }),
    ).toBeVisible();
    milestones.joinDeliveredByWebSocket = true;
    // Keep real membership alive without a periodic UI read. Pause during SQL-only deadline probes.
    presence = setInterval(async () => {
      if (paused || presenceBusy) return;
      presenceBusy = true;
      try {
        for (let i = 0; i < 2; i++) {
          const r = await pool.query("select version from wordpairs.aggregates where kind='room' and id=$1", [roomId]);
          await contexts[i].request.post(`/api/rooms/${roomId}/lobby`, { headers: { Origin: origin }, data: { action: "presence", connected: true, expectedProfileId: profileIds[i], expectedVersion: r.rows[0].version, commandId: randomUUID() } });
        }
      } finally { presenceBusy = false; }
    }, 15000);
    await observer.getByLabel("Have a room code?").fill(code);
    await observer
      .getByRole("button", { name: "Open room", exact: true })
      .click();
    await observer
      .getByLabel("Who invited you?")
      .selectOption({ label: aliases[1] });
    await observer
      .getByRole("button", { name: "Join as observer", exact: true })
      .click();
    await expect(
      observer.getByText("● Live updates connected", { exact: true }),
    ).toBeVisible();
    await expect(
      observer.getByRole("button", { name: "Mark ready", exact: true }),
    ).toHaveCount(0);
    const beforeReady = notices[1].length;
    const readyVersion = await command(a, () => a.getByRole("button", { name: "Mark ready", exact: true }).click());
    await changed(1, beforeReady, "room", readyVersion);
    await expect(
      b.locator(".roster li").filter({ hasText: aliases[0] }),
    ).toContainText("✓ Ready");
    await b.getByRole("button", { name: "Mark ready", exact: true }).click();
    await expect(b.getByText(/Roster locked\. Starting in/)).toBeVisible();
    paused = true;
    await expect.poll(() => presenceBusy).toBe(false);
    await Promise.all(contexts.map((c) => c.setOffline(true)));
    await expect
      .poll(
        async () => {
          const r = await pool.query(
            "select exists(select 1 from wordpairs.aggregates where kind='match' and id=$1) as opened",
            [roomId],
          );
          return r.rows[0]?.opened;
        },
        { timeout: 20000, intervals: [1000] },
      )
      .toBe(true);
    milestones.schedulerStartsMatchWithAllBrowsersOffline = true;
    await Promise.all(contexts.map((c) => c.setOffline(false)));
    paused = false;
    await expect
      .poll(
        async () =>
          (await a
            .getByRole("button", { name: "Opposites", exact: true })
            .count()) +
          (await b
            .getByRole("button", { name: "Opposites", exact: true })
            .count()),
      )
      .toBe(1);
    milestones.countdownBySchedulerAndOnlineResume = true;

    for (let round = 1; round <= 8; round++) {
      const chooser = (await a
        .getByRole("button", { name: "Opposites", exact: true })
        .isVisible())
        ? a
        : b;
      const beforeCategory = notices.map((n) => n.length);
      const categoryVersion = await command(chooser, () => chooser
        .getByRole("button", { name: "Opposites", exact: true })
        .click());
      for (let i = 0; i < 3; i++) {
        await changed(i, beforeCategory[i], "match", categoryVersion);
        await expect(pages[i].locator(".game-prompt")).toBeVisible();
      }
      const prompt = (await a.locator(".game-prompt").textContent())!.trim();
      const pair = seed.pairs.find(
        (p) => p.categoryId === "opposites" && p.prompt === prompt,
      );
      if (!pair)
        throw new Error(
          "Live UI integration requires the documented seeded Opposites catalog; selected prompt has no test answer",
        );
      await expect(b.locator(".game-prompt")).toHaveText(prompt);
      await expect(observer.locator(".game-prompt")).toHaveText(prompt);

      if (round === 2) {
        // Only SQL reads below: they cannot drive the application's deadline dispatcher.
        paused = true;
        await expect.poll(() => presenceBusy).toBe(false);
        await Promise.all(contexts.map((c) => c.setOffline(true)));
        const connection = await pool.connect();
        try {
          await expect
            .poll(
              async () => {
                const r = await connection.query(
                  "select state->'rounds'->-1->>'stage' as stage from wordpairs.aggregates where kind='match' and id=$1",
                  [roomId],
                );
                return r.rows[0]?.stage;
              },
              { timeout: 30000, intervals: [1000] },
            )
            .toBe("1");
        } finally {
          connection.release();
        }
        milestones.schedulerAdvancesWithAllBrowsersOffline = true;
        await Promise.all(contexts.map((c) => c.setOffline(false)));
        paused = false;
        for (const page of pages)
          await expect(
            page.getByText("● Live updates connected", { exact: true }),
          ).toBeVisible({ timeout: 40000 });
      }

      const beforeAnswer = notices[1].length;
      const answerVersion = await answer(a, pair.target);
      await changed(1, beforeAnswer, "match", answerVersion);
      await expect(
        b
          .getByRole("table", { name: `Round ${round} scorecard`, exact: true })
          .getByRole("row")
          .filter({ hasText: aliases[0] }),
      ).toContainText("✓ Solved");
      if (round === 1) {
        const beforeHint = notices[1].length;
        const hintAfterVersion = Math.max(...notices[1].filter((n) => n.aggregateType === "match").map((n) => n.version));
        await expect(b.getByLabel("Your visible hints")).toBeVisible({
          timeout: 30000,
        });
        await changed(1, beforeHint, "match", hintAfterVersion + 1);
        await expect(observer.getByLabel("Your visible hints")).toBeVisible();
        await expect(a.getByLabel("Your visible hints")).toHaveCount(0);
        await a.getByText("Send a reaction", { exact: true }).click();
        const beforeReaction = notices[2].length;
        await a
          .getByRole("button", { name: "React with 👍", exact: true })
          .click();
        await changed(2, beforeReaction, "moderation");
        await expect(observer.getByLabel("Room reactions")).toContainText("👍");
        milestones.hintsRemainPerspectivePrivate = true;
        milestones.reactionDeliveredByPush = true;
      }
      await answer(b, pair.target);
      for (const page of pages)
        await expect(page.locator(".answer-reveal")).toContainText(pair.target);
      if (round === 2) {
        // Wait between rounds so no answer stage expires during token-renewal verification.
        const originalExpiry = Math.max(...expiries.map((e) => e[0]));
        await expect
          .poll(() => Date.now(), { timeout: 150000, intervals: [1000] })
          .toBeGreaterThan(originalExpiry + 1000);
        for (let i = 0; i < 3; i++)
          expect(expiries[i].at(-1)!).toBeGreaterThan(expiries[i][0]);
        milestones.tokenRenewedPastOriginalLifetime = true;
        const reopened = a.waitForEvent("websocket");
        const closed = await a.evaluate(() => {
          const sockets = (window as unknown as { __liveTestSockets: WebSocket[] }).__liveTestSockets;
          const active = sockets.filter((socket) => socket.readyState === WebSocket.OPEN);
          active.forEach((socket) => socket.close());
          return active.length;
        });
        expect(closed).toBeGreaterThan(0);
        await reopened;
        await expect(a.getByText("● Live updates connected", { exact: true })).toBeVisible();
      }
      if (round === 3) milestones.forcedSocketReconnectThenPushVerified = true;
      if (round < 8)
        await expect(
          a.getByRole("button", { name: "Opposites", exact: true }),
        ).toBeVisible();
    }
    for (const page of pages)
      await expect(
        page.getByRole("heading", { name: "Final standings", exact: true }),
      ).toBeVisible();
    const ranking = await a
      .getByRole("table", { name: "Final ranking", exact: true })
      .textContent();
    expect(
      await b
        .getByRole("table", { name: "Final ranking", exact: true })
        .textContent(),
    ).toBe(ranking);
    expect(
      await observer
        .getByRole("table", { name: "Final ranking", exact: true })
        .textContent(),
    ).toBe(ranking);
    milestones.fullEightRoundUiGame = true;

    // Test actual private transport permissions with real application-issued identities.
    const accessA = await (
      await contexts[0].request.get("/api/realtime")
    ).json();
    const accessB = await (
      await contexts[1].request.get("/api/realtime")
    ).json();
    async function subscribe(token: string, ownProfile: string) {
      const client = createClient(accessA.url, accessA.anonKey, {
        accessToken: async () => token,
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      services.push(client);
      await client.realtime.setAuth(token);
      const channel = client.channel(`wordpairs-profile:${ownProfile}`, {
        config: { private: true, broadcast: { ack: true } },
      });
      const status = await new Promise<string>((resolve) =>
        channel.subscribe((value) => {
          if (["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT"].includes(value))
            resolve(value);
        }, 10000),
      );
      return { status, channel };
    }
    expect((await subscribe(accessB.token, accessA.profileId)).status).toBe(
      "CHANNEL_ERROR",
    );
    expect((await subscribe(accessA.anonKey, accessA.profileId)).status).toBe(
      "CHANNEL_ERROR",
    );
    const own = await subscribe(accessA.token, accessA.profileId);
    expect(own.status).toBe("SUBSCRIBED");
    expect(
      await own.channel.send({
        type: "broadcast",
        event: "changed",
        payload: { eventId: "forbidden-client-publish" },
      }),
    ).toBe("error");
    milestones.privateTransportDenialsVerified = true;
    await a.screenshot({
      path: info.outputPath("live-final-standings.png"),
      fullPage: true,
    });
  } finally {
    paused = true;
    clearInterval(presence);
    await expect.poll(() => presenceBusy).toBe(false);
    await writeFile("docs/evidence/room-sync/live-ui-observations.json", JSON.stringify({ milestones, notices, transport, tokenExpiries: expiries, authorizedReads: reads, elapsedMs: Date.now() - started }, null, 2));
    await info.attach("live-integration-evidence", {
      body: Buffer.from(
        JSON.stringify(
          {
            milestones,
            notices,
            tokenExpiries: expiries,
            authorizedReads: reads,
            elapsedMs: Date.now() - started,
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });
    if (roomId)
      for (const context of contexts.slice(0, 2).reverse())
        try {
          await context.setOffline(false);
          for (let n = 0; n < 3; n++) {
            const r = await context.request.get(`/api/rooms/${roomId}`);
            if (!r.ok()) break;
            const room = await r.json();
            if (room.role !== "player") break;
            const left = await context.request.post(
              `/api/rooms/${roomId}/lobby`,
              {
                headers: { Origin: origin },
                data: {
                  action: "leave",
                  expectedProfileId: room.actorId,
                  expectedVersion: room.version,
                  commandId: randomUUID(),
                },
              },
            );
            if (left.ok()) break;
          }
        } catch {
          /* Test cleanup never modifies another room. */
        }
    await Promise.all(services.map((c) => c.removeAllChannels()));
    await Promise.all(contexts.map((c) => c.close()));
    await pool.end();
  }
});
