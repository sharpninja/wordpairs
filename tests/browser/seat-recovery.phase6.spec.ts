import { type BrowserContext, expect, test } from "@playwright/test";
import type { Command, Transition } from "../../src/application/ports";
import { type RoomDirectory, RoomService } from "../../src/application/rooms";
import type { Room } from "../../src/domain/model";
import { leaveRoom } from "../../src/domain/lobby";
import { failure, type Result, success } from "../../src/domain/result";
import { joinRoom, newRoom } from "../../src/domain/rooms";

const roomId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const value = <T>(r: Result<T>) => {
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
};
async function fixture(
  context: BrowserContext,
  winner: boolean,
  lostResponse = false,
) {
  let room = value(newRoom(roomId, "host", 2, "ABCDEFGH", 1000));
  let serial = 0;
  let race = !winner;
  let lose = lostResponse;
  const writes: Record<string, unknown>[] = [];
  const publicReads: URL[] = [];
  let failBoard = false;
  const records = new Map<string, Result<Transition<Room, unknown>>>();
  const port: RoomDirectory = {
    findByCode: async () => success(room),
    lookupCode: async () => success(room),
    discover: async () => success([]),
    create: async () => failure("CONFLICT"),
    get: async () => success(room),
    labels: async (ids) =>
      success(ids.map((id) => ({ id, alias: `Guest ${id}`, icon: "owl" }))),
    invite: async () => failure("NOT_AUTHORIZED"),
    invitation: async () => failure("NOT_FOUND"),
    quickStore: { transact: async () => failure("CONFLICT") },
    async transact<T>(
      c: Command,
      decide: (s: Room) => Promise<Result<Transition<Room, T>>>,
    ) {
      const prior = records.get(c.commandId);
      if (prior) return prior as Result<Transition<Room, T>>;
      if (c.expectedVersion !== room.version) return failure("CONFLICT");
      const result = await decide(structuredClone(room));
      if (result.ok) {
        room = result.value.state;
        records.set(c.commandId, result);
      }
      return result;
    },
  };
  const service = new RoomService(
    port,
    { now: () => 1000 },
    { next: () => `seat-${++serial}` },
    { integer: (min) => min },
  );
  await context.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        profile: {
          id: "alice",
          version: 0,
          kind: "guest",
          alias: "Guest alice",
          icon: "owl",
          wins: 0,
          points: 0,
          publicLeaderboard: false,
          earliestWinAt: null,
        },
      },
    }),
  );
  await context.route("**/api/realtime", (r) =>
    r.fulfill({ status: 503, json: {} }),
  );
  await context.route("**/api/landing*", (r) => {
    publicReads.push(new URL(r.request().url()));
    return r.fulfill(
      failBoard
        ? { status: 503, body: "Unavailable" }
        : {
            headers: { "X-Leaderboard-Revision": "1", "X-Lobby-Revision": "1" },
            json: {
              leaderboard: [],
              lobbies: [],
              rules: { version: "2.6", updated: "2026-10-26" },
            },
          },
    );
  });
  await context.route("**/api/rooms/**", async (r) => {
    if (r.request().method() === "GET")
      return r.fulfill({
        json: {
          ...value(await service.view(room, "alice")),
          actorId: "alice",
          inviterId: null,
        },
      });
    const body = r.request().postDataJSON();
    writes.push(body);
    if (race) {
      race = false;
      room = value(joinRoom(room, "racer", "player", null, 1000));
    }
    const result = await service.join(
      {
        aggregateId: roomId,
        actorId: "alice",
        expectedVersion: body.expectedVersion,
        commandId: body.commandId,
        requestDigest: JSON.stringify(body),
      },
      body.mode,
      body.inviterId ?? null,
    );
    if (lose && result.ok) {
      lose = false;
      return r.fulfill({ status: 503, json: {} });
    }
    return r.fulfill({
      status: result.ok ? 200 : 409,
      json: result.ok ? result.value : result,
    });
  });
  return {
    fill: () => {
      room = value(joinRoom(room, "racer", "player", null, 1000));
    },
    room: () => room,
    preview: async () => ({
      ...value(await service.view(room, "alice")),
      actorId: "alice",
      inviterId: null,
    }),
    seedAcceptedJoin: () => {
      room = value(joinRoom(room, "alice", "player", null, 1002));
      return { roomId: room.id, version: room.version };
    },
    releaseSeat: () => {
      room = value(leaveRoom(room, "racer", 1001));
    },
    writes,
    publicReads,
    failBoard: (next: boolean) => {
      failBoard = next;
    },
  };
}
test("TEST-LOBBYMATCHING-117 discovery last-seat loser returns to a fresh first-page board with honest retry", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    const f = await fixture(context, false);
    const page = await context.newPage();
    await page.goto(`/rooms/${roomId}?from=discovery`);
    await expect(
      page.getByRole("button", { name: "Join as player" }),
    ).toBeVisible();
    f.failBoard(true);
    await page.getByRole("button", { name: "Join as player" }).click();
    await expect(page).toHaveURL(/\?seatLost=1#community$/);
    await expect(
      page.getByText(
        "That room is no longer available. Choose another open room.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Try again later").first()).toBeVisible();
    expect(f.room().players.map((p) => p.profileId)).toEqual(["host", "racer"]);
    expect(f.publicReads.length).toBeGreaterThan(0);
    expect(
      f.publicReads.every(
        (u) =>
          u.searchParams.get("fresh") === "1" &&
          !u.searchParams.has("lobbyCursor"),
      ),
    ).toBe(true);
    f.failBoard(false);
    await page
      .getByRole("button", { name: "Refresh public information" })
      .click();
    await expect(
      page.getByText("No joinable rooms", { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
test("TEST-LOBBYMATCHING-117 accepted last-seat winner retains uncertain join and is never bounced by full preview", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    const f = await fixture(context, true, true);
    const page = await context.newPage();
    await page.goto(`/rooms/${roomId}?from=discovery`);
    await page.getByRole("button", { name: "Join as player" }).click();
    await expect(
      page.getByRole("button", { name: "Retry pending room request" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Refresh room" }).click();
    await expect(page).toHaveURL(/from=discovery$/);
    await expect(
      page.getByText("2 / 2 players · 0 open player slots · waiting", {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Retry pending room request" })
      .click();
    await expect(
      page.getByRole("button", { name: "Leave room" }),
    ).toBeVisible();
    expect(f.writes).toHaveLength(2);
    expect(f.writes[0]).toEqual(f.writes[1]);
    expect(f.room().players.map((p) => p.profileId)).toEqual(["host", "alice"]);
    expect(f.publicReads).toHaveLength(0);
  } finally {
    await context.close();
  }
});
test("TEST-ROOMCODES-110 invalid and rate-limited code can be corrected without leaking another room code", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    await fixture(context, true);
    let rateLimited = false;
    let windowOpen = false;
    await context.route("**/api/rooms/ABCDEFGH", (route) =>
      rateLimited && !windowOpen
        ? route.fulfill({
            status: 429,
            json: { error: { code: "RATE_LIMITED" } },
          })
        : route.fallback(),
    );
    await context.route("**/api/rooms/BBBBBBBB", (r) =>
      r.fulfill({
        status: rateLimited ? 429 : 404,
        json: { error: { code: rateLimited ? "RATE_LIMITED" : "NOT_FOUND" } },
      }),
    );
    const page = await context.newPage();
    await page.clock.install({ time: 0 });
    await page.goto("/play");
    await page.getByLabel("Have a room code?").fill("BBBBBBBB");
    await page.getByRole("button", { name: "Open room" }).click();
    await expect(
      page.getByText("Room not found or invitation expired."),
    ).toBeVisible();
    rateLimited = true;
    await page.getByRole("button", { name: "Refresh room" }).click();
    await expect(
      page.getByText("Too many code attempts. Wait a minute and try again."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Find a room", exact: true }).click();
    await page.getByLabel("Have a room code?").fill("ABCDEFGH");
    await page.getByRole("button", { name: "Open room" }).click();
    await expect(
      page.getByText("Too many code attempts. Wait a minute and try again."),
    ).toBeVisible();
    await page.clock.fastForward(60000);
    windowOpen = true;
    await page.getByRole("button", { name: "Refresh room" }).click();
    await expect(
      page.getByRole("button", { name: "Join as player" }),
    ).toBeVisible();
    await expect(page.locator(".room-code")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
test("TEST-LOBBYMATCHING-117 direct full-room link retains read-only observation", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    const f = await fixture(context, true);
    f.fill();
    const page = await context.newPage();
    await page.goto(`/rooms/${roomId}`);
    await expect(
      page.getByRole("button", { name: "Join as player" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Join as observer" }),
    ).toBeVisible();
    await page.getByLabel("Who invited you?").selectOption("host");
    await page.getByRole("button", { name: "Join as observer" }).click();
    await expect(
      page.getByText(/Read-only observer · Following Guest host/),
    ).toBeVisible();
    expect(f.publicReads).toHaveLength(0);
    expect(f.room().players.map((p) => p.profileId)).toEqual(["host", "racer"]);
    expect(f.room().observers[0].profileId).toBe("alice");
  } finally {
    await context.close();
  }
});

test("TEST-LOBBYMATCHING-117 a pre-join full preview cannot bounce the successful new member", async ({
  browser,
}) => {
  const context = await browser.newContext();
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const waiting = new Promise<void>((r) => {
    started = r;
  });
  try {
    const f = await fixture(context, true);
    const page = await context.newPage();
    await page.clock.install();
    await page.goto(`/rooms/${roomId}?from=discovery`);
    await expect(
      page.getByRole("button", { name: "Join as player", exact: true }),
    ).toBeVisible();
    f.fill();
    let held = false;
    await context.route(`**/api/rooms/${roomId}`, async (r) => {
      if (r.request().method() !== "GET" || held) return r.fallback();
      held = true;
      const snapshot = await f.preview();
      expect(snapshot.role).toBeNull();
      expect(snapshot.canJoinPlayer).toBe(false);
      f.releaseSeat();
      started();
      await gate;
      return r.fulfill({
        headers: { "x-ui-fixture": "stale-prejoin" },
        json: snapshot,
      });
    });
    await page
      .getByRole("button", { name: "Refresh room", exact: true })
      .click();
    await waiting;
    // Seed accepted membership via the real domain at this HTTP boundary.
    // Service version/idempotency behavior is exercised by the other cases;
    // this case isolates a successful command followed by an obsolete read.
    await context.route(`**/api/rooms/${roomId}`, async (r) => {
      if (r.request().method() !== "POST") return r.fallback();
      await r.fulfill({ json: f.seedAcceptedJoin() });
    });
    const accepted = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        new URL(r.url()).pathname === `/api/rooms/${roomId}` &&
        r.status() === 200,
    );
    await page
      .getByRole("button", { name: "Join as player", exact: true })
      .click();
    await (await accepted).finished();
    // The stale GET must be retired even when its body arrives after200.
    const complete = page.waitForResponse(
      (r) =>
        r.request().method() === "GET" &&
        new URL(r.url()).pathname === `/api/rooms/${roomId}` &&
        r.headers()["x-ui-fixture"] === "stale-prejoin",
    );
    release();
    await (await complete).finished();
    await page.evaluate(
      () =>
        new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        ),
    );
    await expect(page).toHaveURL(/from=discovery$/);
    await expect(
      page.getByRole("button", { name: "Leave room", exact: true }),
    ).toBeVisible();
    expect(f.room().players.map((p) => p.profileId)).toEqual(["host", "alice"]);
    expect(f.publicReads).toHaveLength(0);
  } finally {
    release();
    await context.close();
  }
});
