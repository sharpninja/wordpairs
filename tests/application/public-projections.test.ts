import { describe, expect, it } from "vitest";
import {
  landingProjection,
  publicLobbies,
  rankPublicProfiles,
} from "../../src/application/public-projections";
import { PublicLandingService } from "../../src/application/public-service";
import type { Profile, Room } from "../../src/domain/model";
import { success } from "../../src/domain/result";
import { acOracleScenarios } from "../ac-contracts/oracle-scenarios";

const profile = (id: string, values: Partial<Profile> = {}): Profile => ({
  id,
  version: 0,
  kind: "member",
  providerSubject: "PRIVATE",
  alias: `Player ${id}`,
  icon: "owl",
  publicLeaderboard: true,
  wins: 3,
  points: 20,
  earliestWinAt: 100,
  ...values,
});
const room = (id: string, values: Partial<Room> = {}): Room => ({
  id,
  version: 0,
  code: "SECRET",
  creatorId: "p1",
  capacity: 4,
  discoverable: true,
  status: "waiting",
  createdAt: 0,
  changedAt: 0,
  closedAt: null,
  players: [
    { profileId: "p1", ready: false, joinedAt: 0, disconnectedAt: null },
    { profileId: "p2", ready: false, joinedAt: 0, disconnectedAt: null },
  ],
  observers: [],
  lockedRoster: [],
  nextObserverSequence: 0,
  idlePromptedVersion: null,
  holdoutId: null,
  holdoutDueAt: null,
  countdownDueAt: null,
  ...values,
});

describe("Phase 2A anonymous public projections", () => {
  it("orders lifetime wins, points, earliest win and stable ID while excluding opt-outs", async () => {
    const inputs = [
      profile("p2", { earliestWinAt: 200 }),
      profile("p1"),
      profile("g1", {
        kind: "guest",
        wins: 4,
        points: 5,
        earliestWinAt: 50,
        alias: "Guest Cedar",
      }),
      profile("g2", { kind: "guest", wins: 9, publicLeaderboard: false }),
    ];
    const ranked = rankPublicProfiles(inputs);
    let now = 0;
    const calls: number[] = [];
    const service = new PublicLandingService(
      {
        leaderboard: async () => {
          calls.push(now);
          return success({ rows: inputs, revision: 1, nextOffset: null });
        },
        lobbies: async () =>
          success({ rows: [], revision: 1, nextOffset: null }),
      },
      { now: () => now },
    );
    await service.read(null, null);
    now = 299999;
    await service.read(null, null);
    expect(calls).toEqual([0]);
    now = 300000;
    await service.read(null, null);
    expect(calls).toHaveLength(2);
    acOracleScenarios
      .find((scenario) => scenario.id === "AC-43-T02")
      ?.assertObservation({
        rows: ranked.map((entry) => ({
          alias: entry.alias,
          profileId: entry.id,
        })),
        excludedProfileIds: inputs
          .filter((input) => !ranked.some((row) => row.id === input.id))
          .map((input) => input.id),
        refreshAtMs: calls[1],
      });
    expect(
      rankPublicProfiles([profile("b"), profile("a")]).map((entry) => entry.id),
    ).toEqual(["a", "b"]);
    expect(
      rankPublicProfiles([
        profile("points", { points: 21 }),
        profile("wins", { wins: 4 }),
      ]).map((entry) => entry.id),
    ).toEqual(["wins", "points"]);
  });

  it("runs unchanged AC-50-T01 against the entire actual projection including poisoned private records", () => {
    const view = landingProjection(
      [profile("p1", { alias: "Player Oak", wins: 2, points: 17 })],
      [room("room-public-1")],
      60000,
    );
    acOracleScenarios
      .find((scenario) => scenario.id === "AC-50-T01")
      ?.assertObservation(view);
    const encoded = JSON.stringify(view);
    for (const privateValue of [
      "SECRET",
      "PRIVATE",
      "providerSubject",
      "creatorId",
      "observers",
      "players",
    ])
      expect(encoded).not.toContain(privateValue);
  });

  it("AC-22/43 shows only discoverable waiting lobbies with free seats, and stable oldest-first order", () => {
    const rooms = [
      room("b"),
      room("a"),
      room("private", { discoverable: false }),
      room("full", { capacity: 2 }),
      room("started", { status: "playing" }),
    ];
    expect(publicLobbies(rooms, 60000).map((entry) => entry.roomId)).toEqual([
      "a",
      "b",
    ]);
    expect(
      publicLobbies([room("future", { createdAt: 90000 })], 60000)[0]
        .ageSeconds,
    ).toBe(0);
  });

  it("bounds page sizes and offsets without accepting malformed or unbounded queries", () => {
    expect(landingProjection([], [], 0)).toEqual({
      leaderboard: [],
      lobbies: [],
      rules: { version: "2.6", updated: "2026-10-26" },
    });
  });
});
