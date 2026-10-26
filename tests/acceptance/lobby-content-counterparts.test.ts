import "./trace";
import { expect, it } from "vitest";
import { LobbyService } from "../../src/application/lobby";
import { RoomService, type RoomDirectory } from "../../src/application/rooms";
import {
  ContentService,
  type ContentContext,
  type ContentPort,
  type ContentAction,
} from "../../src/application/content";
import { emptyContent } from "../../src/domain/content";
import { failure, success } from "../../src/domain/result";
import { joinRoom } from "../../src/domain/rooms";
import {
  setReady,
  leaveRoom,
  lobbyDeadlines,
  expireLobby,
} from "../../src/domain/lobby";
import { roomFixture, gameFixture, TransactionFake, value } from "./fixtures";

it("AC-23 oldest-room port contract orders age and stable ID; competing quickMatch calls cannot duplicate the final seat", async () => {
  const stores = ["b", "a", "z"].map(
    (id) =>
      new TransactionFake({
        ...roomFixture(["p1"], [], 2),
        id,
        discoverable: true,
        createdAt: id === "z" ? 0 : 10,
      }),
  );
  let serial = 0;
  const selected: string[] = [];
  // The fake implements the documented selection port; actual SQL ordering has separate TR evidence.
  const port: RoomDirectory = {
    transact: async () => failure("CONFLICT"),
    create: async () => failure("CONFLICT"),
    get: async () => failure("NOT_FOUND"),
    findByCode: async () => failure("NOT_FOUND"),
    discover: async () => success([]),
    lookupCode: async () => failure("NOT_FOUND"),
    labels: async () => success([]),
    invite: async () => failure("NOT_AUTHORIZED"),
    invitation: async () => failure("NOT_FOUND"),
    quickStore: {
      transact: (command, decide) => {
        const chosen = stores
          .filter(
            (s) =>
              s.state.status === "waiting" &&
              s.state.discoverable &&
              s.state.players.length < s.state.capacity,
          )
          .sort(
            (a, b) =>
              a.state.createdAt - b.state.createdAt ||
              a.state.id.localeCompare(b.state.id),
          )[0];
        if (!chosen) return Promise.resolve(failure("NOT_FOUND"));
        selected.push(chosen.state.id);
        return chosen.transact(
          {
            ...command,
            aggregateId: chosen.state.id,
            expectedVersion: chosen.state.version,
          },
          decide,
        );
      },
    },
  };
  const service = new RoomService(
    port,
    { now: () => 11 },
    { next: () => `quick-event-${++serial}` },
    { integer: (a) => a },
  );
  expect(await service.quickMatch("p2", "first", "first")).toEqual(
    success({ joined: "z", fallback: [] }),
  );
  const raced = await Promise.all([
    service.quickMatch("p3", "race-a", "race-a"),
    service.quickMatch("p4", "race-b", "race-b"),
  ]);
  expect(raced.filter((r) => r.ok)).toHaveLength(1);
  expect(
    raced.filter((r) => !r.ok && r.error.code === "CONFLICT"),
  ).toHaveLength(1);
  expect(selected).toEqual(["z", "a", "a"]);
  expect(await service.quickMatch("p4", "retry", "retry")).toEqual(
    success({ joined: "b", fallback: [] }),
  );
  expect(await service.quickMatch("p5", "empty", "empty")).toEqual(
    success({ joined: null, fallback: ["browse", "create"] }),
  );
  expect(stores.every((s) => s.state.players.length === 2)).toBe(true);
  expect(
    stores.flatMap((s) => s.state.players).filter((p) => p.profileId === "p3"),
  ).toHaveLength(1);
});

it("AC-47-T02 normal independent moderator approval records actor reason threshold eligibility and no activation", async () => {
  const store = new TransactionFake(emptyContent());
  const catalog = gameFixture().catalog;
  let evidence: ContentContext = {
    actor: { profileId: "p1", roles: ["player"] },
    wins: 10,
    catalog,
  };
  let serial = 0;
  const port: ContentPort = {
    read: async () => success({ state: store.state, evidence }),
    transact: (c, _a, decide) => store.transact(c, (s) => decide(s, evidence)),
  };
  const service = new ContentService(
    port,
    { now: () => 100 },
    { next: () => `approval-${++serial}` },
  );
  const act = (action: ContentAction) =>
    service.act(
      {
        aggregateId: store.state.id,
        actorId: evidence.actor.profileId,
        commandId: `c-${++serial}`,
        requestDigest: JSON.stringify(action),
        expectedVersion: store.state.version,
      },
      action,
    );
  for (let i = 0; i < 10; i++) {
    const actor = `p${i}`;
    const h = gameFixture([actor, "other"]);
    value(await h.choose());
    value(await h.answer(actor));
    value(await h.answer("other"));
    evidence = {
      ...evidence,
      actor: { profileId: actor, roles: ["player"] },
      room: roomFixture([actor, "other"]),
      match: h.store.state,
    };
    value(
      await act({
        type: "nominate",
        roomId: "r",
        roundId: h.store.state.rounds[0].id,
        word: "future word",
      }),
    );
  }
  const id = store.state.cases[0].id;
  evidence = { ...evidence, actor: { profileId: "m1", roles: ["moderator"] } };
  value(
    await act({
      type: "review",
      caseId: id,
      decision: "approve",
      reason: "Complete evidence verified",
    }),
  );
  expect(store.commits.at(-1)?.transition.audits[0]).toMatchObject({
    actorId: "m1",
    action: "approved",
    at: 100,
    details: {
      caseId: id,
      previousStatus: "pending",
      status: "approved",
      nominationCount: 10,
      reason: "Complete evidence verified",
      futureEligible: true,
      playable: false,
    },
  });
  expect(store.state.publications).toEqual([]);
  expect(store.state.cases[0].playable).toBe(false);
});

it("AC-32-T03 final ready wins before warning expiry and commits exactly one countdown despite replay and stale deadline", async () => {
  let room = roomFixture(["p1", "p2", "p3"], [], 3);
  room = value(setReady(room, "p1", true, 0));
  room = value(setReady(room, "p2", true, 0));
  const warning = lobbyDeadlines(room, () => "warning").find(
    (job) => job.kind === "holdout",
  );
  if (!warning) throw new Error("warning");
  const store = new TransactionFake(room);
  let now = 4999;
  const service = new LobbyService(
    store,
    { now: () => now },
    { next: () => "countdown-event" },
  );
  const command = {
    aggregateId: room.id,
    actorId: "p3",
    commandId: "last-ready",
    requestDigest: "last-ready",
    expectedVersion: room.version,
  };
  const accepted = value(
    await service.act(command, { type: "ready", ready: true }),
  );
  expect(store.state.status).toBe("countdown");
  expect(store.state.countdownDueAt).toBe(14999);
  expect(store.state.version).toBe(room.version + 1);
  expect(
    value(await service.act(command, { type: "ready", ready: true })),
  ).toEqual(accepted);
  now = 5000;
  expect(await service.expire(warning)).toEqual(failure("CONFLICT"));
  expect(store.commits).toHaveLength(1);
  expect(store.commits[0].transition.events).toHaveLength(1);
});

it("AC-30-T03 stale departure loses to queue change and retries against the latest oldest observer", async () => {
  const store = new TransactionFake(
    roomFixture(
      ["p1", "p2", "p3"],
      [
        { id: "o1", follows: "p1" },
        { id: "o2", follows: "p1" },
      ],
      3,
    ),
  );
  let serial = 0;
  const lobby = new LobbyService(
    store,
    { now: () => 1 },
    { next: () => `queue-event-${++serial}` },
  );
  const command = (actorId: string, commandId: string) => ({
    aggregateId: store.state.id,
    actorId,
    commandId,
    requestDigest: commandId,
    expectedVersion: store.state.version,
  });
  const oldDeparture = command("p2", "stale-departure");
  const oldestLeaves = command("o1", "oldest-leaves");
  const results = await Promise.all([
    lobby.act(oldestLeaves, { type: "leave" }),
    lobby.act(oldDeparture, { type: "leave" }),
  ]);
  expect(results[0].ok).toBe(true);
  expect(results[1]).toEqual(failure("CONFLICT"));
  expect(store.state.players.map((p) => p.profileId)).toEqual([
    "p1",
    "p2",
    "p3",
  ]);
  expect(store.state.observers.map((o) => o.profileId)).toEqual(["o2"]);
  value(
    await lobby.act(command("p2", "refreshed-departure"), { type: "leave" }),
  );
  expect(store.state.players.map((p) => p.profileId)).toEqual([
    "p1",
    "p3",
    "o2",
  ]);
  expect(store.state.observers).toEqual([]);
  expect(store.state.players.some((p) => p.profileId === "o1")).toBe(false);
});

it("AC-30-T03/31-T03 concurrent leave and observer arrival conflict, recompute promotion, and never substitute after roster lock", async () => {
  const store = new TransactionFake(
    roomFixture(["p1", "p2", "p3"], [{ id: "o1", follows: "p1" }], 3),
  );
  let serial = 0;
  const directory: RoomDirectory = {
    findByCode: async () => failure("NOT_FOUND"),
    discover: async () => success([]),
    transact: store.transact.bind(store),
    create: async () => failure("CONFLICT"),
    get: async () => success(store.state),
    lookupCode: async () => failure("NOT_FOUND"),
    labels: async () => success([]),
    invite: async () => failure("NOT_AUTHORIZED"),
    invitation: async () => failure("NOT_FOUND"),
    quickStore: store,
  };
  const rooms = new RoomService(
    directory,
    { now: () => 1 },
    { next: () => `race-${++serial}` },
    { integer: (a) => a },
  );
  const lobby = new LobbyService(
    store,
    { now: () => 1 },
    { next: () => `race-${++serial}` },
  );
  const command = (actorId: string) => ({
    aggregateId: store.state.id,
    actorId,
    commandId: `command-${++serial}`,
    requestDigest: `intent-${serial}`,
    expectedVersion: store.state.version,
  });
  const leaving = command("p2"),
    arriving = command("o2");
  const [left, arrival] = await Promise.all([
    lobby.act(leaving, { type: "leave" }),
    rooms.join(arriving, "observer", "p1"),
  ]);
  expect(left.ok).toBe(true);
  expect(arrival).toEqual(failure("CONFLICT"));
  expect(store.state.players.map((p) => p.profileId)).toEqual([
    "p1",
    "p3",
    "o1",
  ]);
  value(await rooms.join(command("o2"), "observer", "p1"));
  expect(store.state.observers.map((o) => o.profileId)).toEqual(["o2"]);
  for (const p of store.state.players)
    value(
      await lobby.act(command(p.profileId), { type: "ready", ready: true }),
    );
  expect(store.state.status).toBe("countdown");
  const locked = [...store.state.lockedRoster];
  const departing = command("p3"),
    replacement = command("replacement");
  const results = await Promise.all([
    lobby.act(departing, { type: "leave" }),
    rooms.join(replacement, "player", null),
  ]);
  expect(results[0].ok).toBe(true);
  expect(results[1]).toEqual(failure("CONFLICT"));
  expect(await rooms.join(command("replacement"), "player", null)).toEqual(
    failure("ROOM_CLOSED"),
  );
  expect(store.state.players.map((p) => p.profileId)).toEqual(["p1", "o1"]);
  expect(store.state.lockedRoster).toEqual(locked);
  expect(store.state.observers.map((o) => o.profileId)).toEqual(["o2"]);
});

it("AC-01/23/25/26 primary and supplemental counterparts resolve code, browse, quick match and invitation to the same capacity authority", async () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  for (const path of ["code", "browse", "quick", "invitation"]) {
    const store = new TransactionFake({
      ...roomFixture(["p1"], [], 8),
      id,
      discoverable: true,
    });
    let quickMode = "eligible";
    const directory: RoomDirectory = {
      findByCode: async () => failure("NOT_FOUND"),
      discover: async () => success([]),
      transact: store.transact.bind(store),
      create: async () => failure("CONFLICT"),
      get: async () => success(store.state),
      lookupCode: async (code) =>
        code === store.state.code ? success(store.state) : failure("NOT_FOUND"),
      labels: async (ids) =>
        success(
          ids.map((id) => ({
            id,
            alias: `Guest ${id}`,
            icon: id === "p2" ? "fox" : "owl",
          })),
        ),
      invite: async () => success(undefined),
      invitation: async (hash) =>
        hash === "signed-open-room"
          ? success({ roomId: id, inviterId: "p1" })
          : failure("NOT_FOUND"),
      quickStore: {
        transact: (command, decide) =>
          quickMode === "empty"
            ? Promise.resolve(failure("NOT_FOUND"))
            : quickMode === "lost-seat"
              ? Promise.resolve(failure("CONFLICT"))
              : store.transact(
                  {
                    ...command,
                    aggregateId: id,
                    expectedVersion: store.state.version,
                  },
                  decide,
                ),
      },
    };
    const service = new RoomService(
      directory,
      { now: () => 1 },
      { next: () => `${path}-event` },
      { integer: (a) => a },
    );
    if (path === "quick")
      expect(
        value<{ joined: string | null; fallback: string[] }>(
          await service.quickMatch("p2", "join", "join"),
        ).joined,
      ).toBe(id);
    else {
      const resolved = value(
        await service.resolve(
          path === "code" ? store.state.code : id,
          "p2",
          "session",
          path === "invitation" ? "signed-open-room" : null,
        ),
      );
      expect(resolved.room.id).toBe(id);
      value(
        await service.join(
          {
            aggregateId: id,
            actorId: "p2",
            commandId: "join",
            requestDigest: "join",
            expectedVersion: resolved.room.version,
          },
          "player",
          resolved.inviterId,
        ),
      );
    }
    const view = value(await service.view(store.state, "p2"));
    expect(view.roomId).toBe(id);
    expect(view.players.map((p) => [p.id, p.icon])).toEqual([
      ["p1", "owl"],
      ["p2", "fox"],
    ]);
    quickMode = "empty";
    expect(
      value<{ joined: string | null; fallback: string[] }>(
        await service.quickMatch("p3", "empty", "empty"),
      ),
    ).toEqual({
      joined: null,
      fallback: ["browse", "create"],
    });
    quickMode = "lost-seat";
    expect(await service.quickMatch("p3", "lost", "lost")).toEqual(
      failure("CONFLICT"),
    );
    expect(store.state.players).toHaveLength(2);
    store.state = { ...store.state, capacity: 3 };
    const competing = ["p3", "p4"].map((actorId) => ({
      aggregateId: id,
      actorId,
      commandId: "race-" + actorId,
      requestDigest: "race-" + actorId,
      expectedVersion: store.state.version,
    }));
    const results = await Promise.all(
      competing.map((c) => service.join(c, "player", null)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(
      results.filter((r) => !r.ok && r.error.code === "CONFLICT"),
    ).toHaveLength(1);
    expect(store.state.players).toHaveLength(3);
    const snapshot = structuredClone(store.state);
    expect(
      await service.join(
        {
          ...competing[1],
          commandId: "retry-current",
          expectedVersion: store.state.version,
        },
        "player",
        null,
      ),
    ).toEqual(failure("ROOM_FULL"));
    expect(store.state).toEqual(snapshot);
  }
});

it("AC-33 supplemental all five membership/readiness changes silence old idle deadlines, prompt the current roster once and suppress prompts after lock", () => {
  for (const change of [
    "ready",
    "player-join",
    "player-leave",
    "observer-join",
    "observer-leave",
  ]) {
    let room = roomFixture(
      ["p1", "p2", "p3"],
      [],
      change === "player-join" ? 4 : 3,
    );
    if (change === "observer-leave")
      room = value(joinRoom(room, "o1", "observer", "p1", 0));
    const old = lobbyDeadlines(room, () => "old-idle").find(
      (d) => d.kind === "idle",
    );
    if (!old) throw new Error("idle");
    room = value(
      change === "ready"
        ? setReady(room, "p1", true, 1000)
        : change === "player-join"
          ? joinRoom(room, "p4", "player", null, 1000)
          : change === "player-leave"
            ? leaveRoom(room, "p3", 1000)
            : change === "observer-join"
              ? joinRoom(room, "o1", "observer", "p1", 1000)
              : leaveRoom(room, "o1", 1000),
    );
    expect(expireLobby(room, old, 30000).ok).toBe(false);
    expect(room.idlePromptedVersion).toBeNull();
    const fresh = lobbyDeadlines(room, () => "new-idle").find(
      (d) => d.kind === "idle",
    );
    if (!fresh) throw new Error("new idle");
    expect(fresh.dueAt).toBe(31000);
    const prompted = value(expireLobby(room, fresh, 31000));
    expect(prompted.idlePromptedVersion).not.toBeNull();
    expect(prompted.players.map((p) => p.profileId)).toEqual(
      room.players.map((p) => p.profileId),
    );
    expect(expireLobby(prompted, fresh, 31001).ok).toBe(false);
    let locked = room;
    for (const p of locked.players)
      if (!p.ready) locked = value(setReady(locked, p.profileId, true, 1001));
    expect(locked.status).toBe("countdown");
    expect(expireLobby(locked, fresh, 31000).ok).toBe(false);
    expect(locked.idlePromptedVersion).toBeNull();
  }
});

it("AC-18/47 primary and supplemental audit fields follow threshold, review, one appeal and independent resolution without forbidden mutations or publication", async () => {
  for (const outcome of ["uphold", "overturn"] as const) {
    const store = new TransactionFake(emptyContent());
    const catalog = gameFixture().catalog;
    let evidence: ContentContext = {
      actor: { profileId: "p0", roles: ["player"] },
      wins: 10,
      catalog,
    };
    let serial = 0;
    const port: ContentPort = {
      read: async () => success({ state: store.state, evidence }),
      transact: (c, _action, decide) =>
        store.transact(c, (s) => decide(s, evidence)),
    };
    const service = new ContentService(
      port,
      { now: () => 1 },
      { next: () => `audit-${++serial}` },
    );
    const act = (action: ContentAction) =>
      service.act(
        {
          aggregateId: store.state.id,
          actorId: evidence.actor.profileId,
          commandId: `cmd-${++serial}`,
          requestDigest: JSON.stringify(action),
          expectedVersion: store.state.version,
        },
        action,
      );
    for (let i = 0; i < 10; i++) {
      const actor = `p${i}`;
      const h = gameFixture([actor, "other"]);
      value(await h.choose());
      value(await h.answer(actor));
      value(await h.answer("other"));
      evidence = {
        ...evidence,
        actor: { profileId: actor, roles: ["player"] },
        room: roomFixture([actor, "other"]),
        match: h.store.state,
      };
      value(
        await act({
          type: "nominate",
          roomId: "r",
          roundId: h.store.state.rounds[0].id,
          word: "future word",
        }),
      );
      expect(store.commits.at(-1)?.transition.audits[0]).toMatchObject({
        actorId: actor,
        action: "nominate",
        at: 1,
        details: {
          nominationCount: i + 1,
          status: i < 9 ? "collecting" : "pending",
          futureEligible: false,
          playable: false,
        },
      });
    }
    const id = store.state.cases[0].id;
    let before = structuredClone(store.state);
    const count = store.commits.length;
    expect(
      (
        await act({
          type: "review",
          caseId: id,
          decision: "approve",
          reason: "forged",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await act({
          type: "activate",
          caseId: id,
          content: { category: catalog.categories[0], pairs: [] },
        })
      ).ok,
    ).toBe(false);
    expect(store.state).toEqual(before);
    expect(store.commits).toHaveLength(count);
    evidence = {
      ...evidence,
      actor: { profileId: "m1", roles: ["moderator"] },
    };
    value(
      await act({
        type: "review",
        caseId: id,
        decision: "reject",
        reason: "Needs evidence",
      }),
    );
    expect(store.commits.at(-1)?.transition.audits[0]).toMatchObject({
      actorId: "m1",
      action: "rejected",
      details: {
        previousStatus: "pending",
        status: "rejected",
        reason: "Needs evidence",
        nominationCount: 10,
        futureEligible: false,
      },
    });
    evidence = { ...evidence, actor: { profileId: "p0", roles: ["player"] } };
    value(await act({ type: "appeal", caseId: id, reason: "New evidence" }));
    expect(store.commits.at(-1)?.transition.audits[0]).toMatchObject({
      actorId: "p0",
      action: "appeal",
      details: {
        previousStatus: "rejected",
        status: "appealed",
        reason: "New evidence",
      },
    });
    before = structuredClone(store.state);
    evidence = {
      ...evidence,
      actor: { profileId: "m1", roles: ["senior-moderator"] },
    };
    expect(
      (await act({ type: "resolve", caseId: id, outcome, reason: "Conflict" }))
        .ok,
    ).toBe(false);
    expect(store.state).toEqual(before);
    evidence = {
      ...evidence,
      actor: { profileId: "m2", roles: ["senior-moderator"] },
    };
    value(
      await act({
        type: "resolve",
        caseId: id,
        outcome,
        reason: "Evidence verified",
      }),
    );
    expect(store.commits.at(-1)?.transition.audits[0]).toMatchObject({
      actorId: "m2",
      action: outcome === "uphold" ? "upheld" : "overturned",
      details: {
        previousStatus: "appealed",
        status: outcome === "uphold" ? "rejected" : "approved",
        reason: "Evidence verified",
        futureEligible: outcome === "overturn",
        playable: false,
      },
    });
    expect(store.state.publications).toEqual([]);
    const accepted = structuredClone(store.state);
    const acceptedAudits = structuredClone(
      store.commits.flatMap((c) => c.transition.audits),
    );
    store.failNext = true;
    evidence = { ...evidence, actor: { profileId: "new", roles: ["player"] } };
    expect(
      (
        await act({
          type: "suggest",
          proposal: {
            category: "New category",
            pairs: [
              { prompt: "a", target: "b" },
              { prompt: "c", target: "d" },
              { prompt: "e", target: "f" },
            ],
          },
        })
      ).ok,
    ).toBe(false);
    expect(store.state).toEqual(accepted);
    expect(store.commits.flatMap((c) => c.transition.audits)).toEqual(
      acceptedAudits,
    );
  }
});
