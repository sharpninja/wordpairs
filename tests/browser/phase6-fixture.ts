import type { BrowserContext } from "@playwright/test";
import { roomProjection } from "../../src/application/rooms";
import {
  IdentityService,
  ownProfile,
  type IdentityRepository,
} from "../../src/application/identity";
import { failure } from "../../src/domain/result";
import type { Profile } from "../../src/domain/model";
import { buildCatalog } from "../../src/domain/catalog";
import { createMatch, matchProjection } from "../../src/domain/match";
import seed from "../../src/infrastructure/catalog-seed.json" with {
  type: "json",
};
import {
  gameFixture,
  roomFixture,
  value,
  TransactionFake,
} from "../acceptance/fixtures";
export const roomId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export async function connectGame(
  context: BrowserContext,
  category = "heroes",
  pairIndex = 0,
  stage = 1,
  playerCount = 2,
) {
  const roster = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
  const catalog = value(buildCatalog(seed.categories, seed.pairs as never));
  const initial = value(
    createMatch(roomId, roomId, roster, { integer: (a) => a }, 0),
  );
  initial.usedPairIds = catalog.pairs
    .filter((p) => p.categoryId === category)
    .slice(0, pairIndex)
    .map((p) => p.id);
  const h = gameFixture(roster, 0, initial, catalog);
  value(await h.act({ type: "choose", categoryId: category }, "p1"));
  if (stage > 0) value(await h.expire(stage * 20000));
  h.time(stage * 20000 + 1);
  let now = stage * 20000 + 1;
  const room = {
    ...roomFixture(
      roster,
      playerCount === 25
        ? roster.map((id, i) => ({ id: `o${i + 1}`, follows: id }))
        : [],
      playerCount,
    ),
    id: roomId,
    status: "playing" as const,
    startedRoster: roster,
    startedAt: 0,
  };
  const profileStore = new TransactionFake<Profile>({
    id: "p1",
    version: 0,
    kind: "guest",
    alias: "Guest Oak",
    icon: "owl",
    publicLeaderboard: false,
    wins: 0,
    points: 0,
    earliestWinAt: null,
    providerSubject: null,
  });
  const denied = async () => failure("NOT_AUTHENTICATED");
  const identityPort: IdentityRepository = {
    guest: denied,
    member: denied,
    session: denied,
    revoke: denied,
    saveChallenge: denied,
    takeChallenge: denied,
  };
  const identity = new IdentityService(
    identityPort,
    { token: () => "fixture", hash: (v) => v },
    { next: () => "profile-event" },
    { integer: (a) => a },
    { now: () => now },
    null,
  );
  const labels = () => [
    {
      id: "p1",
      alias: profileStore.state.alias,
      icon: profileStore.state.icon,
    },
    ...roster.slice(1).map((id) => ({
      id,
      alias: id === "p2" ? "Guest Elm" : `Guest ${id}`,
      icon: "fox",
    })),
  ];
  await context.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        profile: ownProfile(profileStore.state),
      },
    }),
  );
  await context.route("**/api/profile", async (r) => {
    const b = r.request().postDataJSON();
    const result = await identity.preferences(
      {
        aggregateId: "p1",
        actorId: "p1",
        commandId: b.commandId,
        requestDigest: JSON.stringify(b),
        expectedVersion: b.expectedVersion,
      },
      { profileId: "p1", roles: ["player"] },
      {
        icon: b.icon,
        publicLeaderboard: b.publicLeaderboard,
        regenerateAlias: b.regenerateAlias,
      },
      profileStore,
    );
    return r.fulfill({
      status: result.ok ? 200 : 409,
      json: result.ok ? { profile: result.value } : result,
    });
  });
  await context.route("**/api/realtime", (r) =>
    r.fulfill({ status: 503, json: {} }),
  );
  await context.route("**/api/content", (r) =>
    r.fulfill({
      json: {
        actorId: "p1",
        version: 0,
        nominatedRoundIds: [],
        cases: [],
        wins: 0,
        canSuggest: false,
        canModerate: false,
        categories: [],
        catalogPairs: [],
        audit: [],
      },
    }),
  );
  await context.route("**/api/rooms/**", async (r) => {
    const path = new URL(r.request().url()).pathname;
    if (path.endsWith("/reactions"))
      return r.fulfill({
        json: { actorId: "p1", version: 0, serverNow: now, reactions: [] },
      });
    if (path.endsWith("/match")) {
      if (r.request().method() === "GET")
        return r.fulfill({
          json: {
            ...value(matchProjection(h.store.state, "p1", catalog)),
            actorId: "p1",
            role: "player",
            labels: labels(),
            serverNow: now,
            chooserPresent: true,
            activePlayerIds: roster,
          },
        });
      const body = r.request().postDataJSON();
      const action =
        body.action === "answer"
          ? {
              type: "answer" as const,
              roundId: body.roundId,
              stage: body.stage,
              answer: body.answer,
            }
          : body.action === "choose"
            ? { type: "choose" as const, categoryId: body.categoryId }
            : { type: "continue" as const };
      const result = await h.service.act(
        {
          aggregateId: roomId,
          actorId: "p1",
          commandId: body.commandId,
          expectedVersion: body.expectedVersion,
          requestDigest: JSON.stringify(action),
        },
        action,
      );
      return r.fulfill({
        status: result.ok ? 200 : 409,
        json: result.ok ? result.value : result,
      });
    }
    return r.fulfill({
      json: {
        ...roomProjection(room, "p1", labels()),
        actorId: "p1",
        inviterId: null,
        serverNow: now,
      },
    });
  });
  const pair = catalog.pairs.find(
    (p) => p.id === h.store.state.rounds[0].pairId,
  )!;
  return {
    h,
    pair,
    room,
    advance: (ms: number) => {
      now += ms;
      h.time(now);
    },
  };
}
