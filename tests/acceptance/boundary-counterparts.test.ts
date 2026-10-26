import "./trace";
import { expect, it } from "vitest";
import { buildCatalog, categoryPool } from "../../src/domain/catalog";
import { newRoom, joinRoom } from "../../src/domain/rooms";
import { setReady, lobbyDeadlines, expireLobby } from "../../src/domain/lobby";
import { createMatch } from "../../src/domain/match";
import { LobbyService } from "../../src/application/lobby";
import {
  gameFixture,
  value,
  fixtureCatalog,
  TransactionFake,
} from "./fixtures";

it("AC-02/24/27/28/51 maximum 25 players plus 25 observers keep capacity, locked roster, scoring and perspectives under competing commands", async () => {
  let room = value(newRoom("r", "p1", 25, "ABCDEFGH", 0));
  const players = Array.from({ length: 25 }, (_, i) => `p${i + 1}`);
  for (const id of players.slice(1))
    room = value(joinRoom(room, id, "player", null, 0));
  for (let i = 1; i <= 25; i++)
    room = value(joinRoom(room, `o${i}`, "observer", `p${i}`, 0));
  const before = structuredClone(room);
  expect(joinRoom(room, "overflow", "player", null, 0).ok).toBe(false);
  expect(joinRoom(room, "overflow", "observer", "p1", 0).ok).toBe(false);
  expect(room).toEqual(before);
  for (const id of players) room = value(setReady(room, id, true, 1));
  const deadline = lobbyDeadlines(room, () => "countdown").find(
    (d) => d.kind === "countdown",
  );
  if (!deadline) throw new Error("No countdown");
  room = value(expireLobby(room, deadline, 10001));
  expect(room.status).toBe("playing");
  expect(room.startedRoster).toEqual(players);
  expect(room.observers).toHaveLength(25);
  const h = gameFixture(players, 10001);
  const initialMatch = structuredClone(h.store.state);
  expect(await h.act({ type: "choose", categoryId: "animals" }, "o1")).toEqual({
    ok: false,
    error: { code: "NOT_AUTHORIZED" },
  });
  expect(h.store.state).toEqual(initialMatch);
  value(await h.choose());
  h.time(11001);
  const round = h.store.state.rounds[0];
  const action = {
    type: "answer" as const,
    roundId: round.id,
    stage: 0,
    answer: "cat",
  };
  const commands = players.map((id) => h.command(id, `answer-${id}`));
  const first = await Promise.all(
    commands.map((c) => h.service.act(c, action)),
  );
  expect(first.filter((r) => r.ok)).toHaveLength(1);
  expect(
    first.filter((r) => !r.ok && r.error.code === "CONFLICT"),
  ).toHaveLength(24);
  for (const id of players.slice(1)) value(await h.answer(id));
  expect(h.store.state.rounds[0].solves).toHaveLength(25);
  expect(h.store.state.status).toBe("summary");
  expect(await h.service.act(commands[0], action)).toEqual(first[0]);
  expect(h.store.state.rounds[0].solves).toHaveLength(25);
  for (let i = 1; i <= 25; i++) {
    const player = value(await h.service.view(room, `p${i}`));
    const observer = value(await h.service.view(room, `o${i}`));
    expect(observer).toEqual(player);
    expect(observer.scorecard).toHaveLength(25);
    expect(observer.standings.every((s) => s.points === 5)).toBe(true);
    expect((await h.act(action, `o${i}`)).ok).toBe(false);
  }
  expect(h.store.state.roster).toEqual(players);
  const roomStore = new TransactionFake(room);
  const lobby = new LobbyService(
    roomStore,
    { now: () => 11001 },
    { next: () => "presence-event" },
  );
  value(
    await lobby.act(
      {
        aggregateId: "r",
        actorId: "p1",
        commandId: "disconnect",
        requestDigest: "disconnect",
        expectedVersion: room.version,
      },
      { type: "presence", connected: false },
    ),
  );
  expect(new Set(roomStore.commits[0].transition.events[0].audience)).toEqual(
    new Set([...players, ...players.map((_, i) => `o${i + 1}`)]),
  );
});

it("AC-16 primary/supplemental counterpart rejects each incomplete catalog field and excludes unapproved or disabled future content", () => {
  const catalog = fixtureCatalog();
  const pair = catalog.pairs[0];
  for (const broken of [
    { prompt: "" },
    { target: "" },
    { hints: ["one", "two"] },
    { acceptedAnswers: undefined },
    { backgroundId: "" },
  ])
    expect(
      buildCatalog(catalog.categories, [{ ...pair, ...broken }] as never).ok,
    ).toBe(false);
  expect(
    value(buildCatalog(catalog.categories, [{ ...pair, categoryId: "" }]))
      .pairs,
  ).toEqual([]);
  const filtered = value(
    buildCatalog(catalog.categories, [
      pair,
      { ...pair, id: "unapproved", approved: false },
      { ...pair, id: "disabled", selectable: false },
    ]),
  );
  expect(categoryPool(filtered, pair.categoryId).map((p) => p.id)).toEqual([
    pair.id,
  ]);
  // Canonical target is an explicit policy; zero approved alternatives is valid.
  expect(
    buildCatalog(catalog.categories, [{ ...pair, acceptedAnswers: [] }]).ok,
  ).toBe(true);
});

it("AC-02/04/24 fills capacities 2/8/25 without mutation on overflow and maps every inclusive anchor index", () => {
  for (const capacity of [2, 8, 25]) {
    let room = value(newRoom("r", "p1", capacity, "ABCDEFGH", 0));
    for (let i = 2; i <= capacity; i++)
      room = value(joinRoom(room, `p${i}`, "player", null, 0));
    const before = structuredClone(room);
    expect(joinRoom(room, "extra", "player", null, 0).ok).toBe(false);
    expect(room).toEqual(before);
    const roster = room.players.map((p) => p.profileId);
    for (let index = 1; index <= capacity; index++) {
      const calls: number[][] = [];
      const match = value(
        createMatch(
          "m",
          "r",
          roster,
          {
            integer: (min, max) => {
              calls.push([min, max]);
              return index;
            },
          },
          0,
        ),
      );
      expect(calls).toEqual([[1, capacity]]);
      expect(match.anchorId).toBe(roster[index - 1]);
    }
  }
});

it("AC-45 supplemental independent unsolved answer cases normalize canonical and approved alternatives, reject fuzzy/punctuation changes and lock later scoring", async () => {
  for (const [target, alternatives, input, accepted] of [
    ["cat", ["kitty"], "  CＡT  ", true],
    ["cat", ["kitty"], " KITTY ", true],
    ["sea lion", [], "sea   lion", true],
    ["spider-man", [], "spider man", false],
    ["cat", [], "cta", false],
    ["cat", ["kitty"], "kitten", false],
  ] as const) {
    const catalog = fixtureCatalog();
    catalog.pairs[0] = {
      ...catalog.pairs[0],
      target,
      acceptedAnswers: [...alternatives],
    };
    const h = gameFixture(["p1", "p2"], 0, undefined, catalog);
    value(await h.choose());
    const result = value(await h.answer("p1", input));
    expect(result.correct).toBe(accepted);
    expect(
      h.store.state.rounds[0].solves.reduce((sum, s) => sum + s.points, 0),
    ).toBe(accepted ? 5 : 0);
    expect((await h.answer("p1", input)).ok).toBe(false);
    expect(
      h.store.state.rounds[0].solves.reduce((sum, s) => sum + s.points, 0),
    ).toBe(accepted ? 5 : 0);
  }
});
