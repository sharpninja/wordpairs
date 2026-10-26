import { test, expect, type BrowserContext } from "@playwright/test";
import {
  IdentityService,
  type IdentityRepository,
  type LoginChallenge,
} from "../../src/application/identity";
import type { Profile } from "../../src/domain/model";
import { success, failure } from "../../src/domain/result";
import { TransactionFake, value } from "../acceptance/fixtures";
import { connectGame, roomId } from "./phase6-fixture";
import { LobbyService } from "../../src/application/lobby";
import { lobbyDeadlines } from "../../src/domain/lobby";
import { RoomService, type RoomDirectory } from "../../src/application/rooms";
import type { Room } from "../../src/domain/model";

// Real application identity commands; persistence and verified provider claims are ports.
async function identityFixture(context: BrowserContext) {
  const profiles = new Map<string, TransactionFake<Profile>>();
  const guests = new Map<string, string>();
  const members = new Map<string, string>();
  const sessions = new Map<string, string>();
  const challenges = new Map<string, LoginChallenge>();
  let serial = 0;
  let losePreference = true;
  const preferenceBodies: unknown[] = [];
  const associate = (
    map: Map<string, string>,
    key: string,
    draft: Profile,
    session: string,
  ) => {
    let id = map.get(key);
    if (!id) {
      id = draft.id;
      map.set(key, id);
      profiles.set(id, new TransactionFake(draft));
    }
    sessions.set(session, id);
    return success(profiles.get(id)!.state);
  };
  const port: IdentityRepository = {
    guest: async (key, draft, session) =>
      associate(guests, key, draft, session),
    member: async (claims, draft, session) =>
      associate(members, `${claims.issuer}:${claims.subject}`, draft, session),
    session: async (key) => {
      const id = sessions.get(key);
      return id
        ? success({
            profile: profiles.get(id)!.state,
            actor: { profileId: id, roles: ["player"] },
          })
        : failure("NOT_AUTHENTICATED");
    },
    revoke: async (key) => {
      sessions.delete(key);
      return success(undefined);
    },
    saveChallenge: async (key, c) => {
      challenges.set(key, c);
      return success(undefined);
    },
    takeChallenge: async (key) => {
      const c = challenges.get(key);
      challenges.delete(key);
      return c ? success(c) : failure("NOT_AUTHENTICATED");
    },
  };
  const service = new IdentityService(
    port,
    { token: () => String(++serial).padStart(43, "A"), hash: (v) => v },
    { next: () => `profile-${++serial}` },
    { integer: (a) => a },
    { now: () => 1000 },
    {
      authorization: async (c) =>
        success(`https://provider.invalid?state=${c.state}`),
      verify: async (input) =>
        input.state === input.expectedState
          ? success({
              issuer: "https://auth.openai.com",
              subject: "verified-member",
            })
          : failure("NOT_AUTHENTICATED"),
    },
  );
  const token = (request: { headers(): Record<string, string> }) =>
    request.headers().cookie?.match(/(?:^|; )wp_session=([^;]+)/)?.[1] ?? null;
  await context.route("**/api/session", async (r) => {
    if (r.request().method() === "POST") {
      const result = value(
        await service.guest(r.request().postDataJSON().guestCredential),
      );
      return r.fulfill({
        headers: {
          "Set-Cookie": `wp_session=${result.sessionToken}; Path=/; HttpOnly; SameSite=Lax`,
        },
        json: {
          profile: result.profile,
          guestCredential: result.guestCredential,
        },
      });
    }
    if (r.request().method() === "DELETE") {
      value(await service.logout(token(r.request())));
      return r.fulfill({
        status: 204,
        headers: { "Set-Cookie": "wp_session=; Path=/; Max-Age=0" },
      });
    }
    const result = await service.session(token(r.request()));
    return r.fulfill({
      status: result.ok ? 200 : 401,
      json: result.ok ? { profile: result.value.profile } : result,
    });
  });
  await context.route("**/api/auth/login", async (r) => {
    const start = value(await service.beginLogin());
    const state = new URL(start.url).searchParams.get("state");
    const result = value(
      await service.completeLogin(start.browserToken, "fixture-code", state),
    );
    return r.fulfill({
      status: 302,
      headers: {
        Location: "/play",
        "Set-Cookie": `wp_session=${result.sessionToken}; Path=/; HttpOnly; SameSite=Lax`,
      },
    });
  });
  await context.route("**/api/profile", async (r) => {
    const b = r.request().postDataJSON();
    preferenceBodies.push(b);
    const session = value(await service.session(token(r.request())));
    if (b.expectedProfileId !== session.profile.id)
      return r.fulfill({ status: 409, json: { error: { code: "CONFLICT" } } });
    const result = await service.preferences(
      {
        aggregateId: session.profile.id,
        actorId: session.profile.id,
        commandId: b.commandId,
        requestDigest: JSON.stringify(b),
        expectedVersion: b.expectedVersion,
      },
      session.actor,
      { icon: b.icon },
      profiles.get(session.profile.id)!,
    );
    if (losePreference) {
      losePreference = false;
      return r.fulfill({
        status: 503,
        json: { error: { code: "TEMPORARY_UNAVAILABLE" } },
      });
    }
    return r.fulfill({
      status: result.ok ? 200 : 409,
      json: result.ok ? { profile: result.value } : result,
    });
  });
  return { profiles, guests, members, preferenceBodies };
}

test("AC-20/21/46 guest clear/reset, repeated member entry, uncertain preference retry and changed shared session recover privately", async ({
  context,
}) => {
  const state = await identityFixture(context);
  const page = await context.newPage();
  await page.goto("/play");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page.getByText(/Guest Cedar/).first()).toBeVisible();
  const firstGuest = [...state.guests.values()][0];
  await page.getByRole("button", { name: "Choose fox", exact: true }).click();
  await page.getByRole("button", { name: "Retry profile update" }).click();
  await expect(
    page.getByRole("button", { name: "Choose fox", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(state.preferenceBodies[0]).toEqual(state.preferenceBodies[1]);
  expect(state.profiles.get(firstGuest)?.commits).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Choose fox", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await context.clearCookies();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase("wordpairs-browser");
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect.poll(() => state.guests.size).toBe(2);
  const secondGuest = [...state.guests.values()][1];
  expect(secondGuest).not.toBe(firstGuest);
  await expect(
    page.getByRole("button", { name: "Choose owl", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const other = await context.newPage();
  await other.goto("/api/auth/login");
  await expect(other.getByText(/Player Cedar/).first()).toBeVisible();
  const member = [...state.members.values()][0];
  expect(member).not.toBe(secondGuest);
  // The original tab still displays a guest while the shared cookie now belongs to the member.
  await page.getByRole("button", { name: "Choose frog", exact: true }).click();
  await expect(page.getByText(/Player Cedar/).first()).toBeVisible();
  expect(state.profiles.get(secondGuest)?.state.icon).toBe("owl");
  expect(state.profiles.get(member)?.state.icon).toBe("owl");
  await other.goto("/api/auth/login");
  await expect(other.getByText(/Player Cedar/).first()).toBeVisible();
  expect(state.members.size).toBe(1);
  expect([...state.members.values()][0]).toBe(member);
  expect(state.guests.size).toBe(2);
});

test("AC-37/45 unavailable game reads recover authoritative stage and expired perspective is removed", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    const { h, advance, room } = await connectGame(context, "heroes", 0, 0);
    const membership = new TransactionFake(room);
    let serverNow = 1;
    const lobby = new LobbyService(
      membership,
      { now: () => serverNow },
      { next: () => `presence-${serverNow}` },
    );
    const presence = async (connected: boolean, actorId = "p1") => {
      value(
        await lobby.act(
          {
            aggregateId: roomId,
            actorId,
            commandId: `presence-${serverNow}`,
            requestDigest: String(connected),
            expectedVersion: membership.state.version,
          },
          { type: "presence", connected },
        ),
      );
      Object.assign(room, membership.state);
    };
    let mode = "online";
    await context.route(`**/api/rooms/${roomId}/match`, async (r) =>
      mode === "offline"
        ? r.fulfill({ status: 503, json: { error: { code: "SERVICE_LIMIT" } } })
        : mode === "expired"
          ? r.fulfill({ status: 403, json: await h.service.view(room, "p1") })
          : r.fallback(),
    );
    const page = await context.newPage();
    await page.goto(`/rooms/${roomId}`);
    await expect(page.getByLabel("Your answer", { exact: true })).toBeEnabled();
    await presence(false);
    await page
      .getByRole("button", { name: "Refresh room", exact: true })
      .click();
    await expect(
      page.getByText("Reconnecting · seat retained for two minutes"),
    ).toBeVisible();
    mode = "offline";
    await page
      .getByRole("button", { name: "Refresh game", exact: true })
      .click();
    await expect(
      page.getByText("Game updates are unavailable. Refresh to recover."),
    ).toBeVisible();
    advance(20000);
    value(await h.expire(20000));
    serverNow = 20001;
    await presence(true);
    await page
      .getByRole("button", { name: "Refresh room", exact: true })
      .click();
    await expect(
      page.getByText("Reconnecting · seat retained for two minutes"),
    ).toHaveCount(0);
    mode = "online";
    await page
      .getByRole("button", { name: "Refresh game", exact: true })
      .click();
    await expect(page.getByLabel("Your visible hints")).toBeVisible();
    await expect(page.getByLabel("Your answer", { exact: true })).toBeEnabled();
    expect(room.players.map((p) => p.profileId)).toEqual(["p1", "p2"]);
    serverNow = 20002;
    await presence(false);
    for (const at of [40000, 80000, 120000]) {
      serverNow = at;
      await presence(true, "p2");
    }
    const grace = lobbyDeadlines(membership.state, () => "expired-grace").find(
      (job) => job.kind === "reconnect" && job.dueAt === 140002,
    );
    if (!grace) throw new Error("Missing grace");
    serverNow = 140002;
    value(await lobby.expire(grace));
    Object.assign(room, membership.state);
    expect((await h.service.view(room, "p1")).ok).toBe(false);
    mode = "expired";
    await page
      .getByRole("button", { name: "Refresh game", exact: true })
      .click();
    await expect(
      page.getByText(
        "Your game perspective is unavailable. The followed player may have left.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Your answer", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.locator(".game-prompt")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("AC-23/37 empty and lost-seat quick match offer browse/create; service limit creation retries once to confirmed success", async ({
  context,
}) => {
  const identity = await identityFixture(context);
  const rooms = new Map<string, Room>();
  let creations = 0;
  let quicks = 0;
  const bodies: unknown[] = [];
  const port: RoomDirectory = {
    findByCode: async () => failure("NOT_FOUND"),
    discover: async () => success([]),
    transact: async () => failure("CONFLICT"),
    create: async (_c, room) => {
      creations++;
      if (creations === 1) return failure("SERVICE_LIMIT");
      rooms.set(room.id, room);
      return success(room);
    },
    get: async (id) =>
      rooms.has(id) ? success(rooms.get(id)!) : failure("NOT_FOUND"),
    lookupCode: async () => failure("NOT_FOUND"),
    labels: async (ids) =>
      success(
        ids.map((id) => {
          const p = identity.profiles.get(id)!.state;
          return { id, alias: p.alias, icon: p.icon };
        }),
      ),
    invite: async () => failure("NOT_AUTHORIZED"),
    invitation: async () => failure("NOT_FOUND"),
    quickStore: {
      transact: async () => failure(++quicks === 1 ? "NOT_FOUND" : "CONFLICT"),
    },
  };
  const service = new RoomService(
    port,
    { now: () => 1000 },
    { next: () => `room-event-${creations}` },
    { integer: (a) => a },
  );
  await context.route("**/api/realtime", (r) =>
    r.fulfill({ status: 503, json: {} }),
  );
  await context.route("**/api/rooms", async (r) => {
    const b = r.request().postDataJSON();
    if (b.action === "quick-match") {
      const result = await service.quickMatch(
        b.expectedProfileId,
        b.commandId,
        JSON.stringify(b),
      );
      return r.fulfill({
        status: result.ok ? 200 : 409,
        json: result.ok ? result.value : result,
      });
    }
    bodies.push(b);
    const result = await service.create(
      {
        aggregateId: b.roomId,
        actorId: b.expectedProfileId,
        commandId: b.commandId,
        requestDigest: JSON.stringify(b),
        expectedVersion: 0,
      },
      b.capacity,
      b.discoverable,
    );
    return r.fulfill({
      status: result.ok ? 200 : 503,
      json: result.ok ? result.value : result,
    });
  });
  await context.route("**/api/rooms/**", async (r) => {
    const actor = [...identity.guests.values()][0];
    const room = value(
      await port.get(new URL(r.request().url()).pathname.split("/").at(-1)!),
    );
    return r.fulfill({
      json: {
        ...value(await service.view(room, actor)),
        actorId: actor,
        inviterId: null,
      },
    });
  });
  const page = await context.newPage();
  await page.goto("/play");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.getByRole("button", { name: "Quick match", exact: true }).click();
  await expect(
    page.getByText(
      "No joinable rooms right now. Browse the community board or create a room.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse open rooms" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Quick match", exact: true }).click();
  await expect(
    page.getByText(
      "The room or account changed. Try again, browse, or create a room.",
    ),
  ).toBeVisible();
  await page.getByLabel("Maximum players (2–25)").fill("8");
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await page.getByRole("button", { name: "Retry room creation" }).click();
  await expect(
    page.getByText("1 / 8 players · 7 open player slots · waiting"),
  ).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toEqual(bodies[1]);
  expect(rooms.size).toBe(1);
  expect(creations).toBe(2);
  expect([...rooms.values()][0].capacity).toBe(8);
});
