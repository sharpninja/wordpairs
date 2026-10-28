import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { IdentityService } from "../../src/application/identity";
import { LobbyService } from "../../src/application/lobby";
import { type MatchAction, MatchService } from "../../src/application/matches";
import type { Command } from "../../src/application/ports";
import { RoomService } from "../../src/application/rooms";
import { lobbyDeadlines } from "../../src/domain/lobby";
import type { Match, Room } from "../../src/domain/model";
import { failure, type Result } from "../../src/domain/result";
import { PostgresCatalogRepository } from "../../src/infrastructure/catalog-repository";
import { PostgresIdentityRepository } from "../../src/infrastructure/identity-repository";
import { PostgresMatchRepository } from "../../src/infrastructure/match-repository";
import { PostgresRoomRepository } from "../../src/infrastructure/room-repository";
import {
  random as roomRandom,
  secrets,
} from "../../src/infrastructure/secrets";

// Real services, migrations, locking and persistence; only time/random draws are
// controlled. This suite does not replace the browser or Realtime transport tests.
const url = process.env.WORDPAIRS_TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1")
  throw new Error("Run npm run test:multiplayer with its disposable database");
const admin = new Pool({ connectionString: url, ssl: false });
const pool = new Pool({
  connectionString: url,
  ssl: false,
  options: "-c role=service_role",
  max: 8,
});
const prefix = `mp-${randomUUID()}`;
let serial = 0;
const ids = { next: () => `${prefix}-${++serial}` };
const roomIds: string[] = [];
const profileIds: string[] = [];
const value = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};
const entry = <T>(values: Map<string, T>, key: string): T => {
  const found = values.get(key);
  if (found === undefined) throw new Error(`Missing expected player: ${key}`);
  return found;
};
const command = (
  state: Pick<Room | Match, "id" | "version">,
  actorId: string,
): Command => ({
  aggregateId: state.id,
  actorId,
  commandId: ids.next(),
  requestDigest: ids.next(),
  expectedVersion: state.version,
});

afterAll(async () => {
  try {
    // Exact IDs from this invocation only, including a partially failed game.
    await admin.query(
      "delete from wordpairs.profile_match_awards where match_id=any($1::text[])",
      [roomIds],
    );
    await admin.query(
      "delete from wordpairs.submissions where round_id in (select id from wordpairs.rounds where match_id=any($1::text[]))",
      [roomIds],
    );
    for (const table of ["rounds", "match_players"])
      await admin.query(
        `delete from wordpairs.${table} where match_id=any($1::text[])`,
        [roomIds],
      );
    await admin.query(
      "delete from wordpairs.matches where id=any($1::text[])",
      [roomIds],
    );
    for (const table of [
      "deadline_jobs",
      "idempotency_records",
      "outbox_events",
    ])
      await admin.query(
        `delete from wordpairs.${table} where aggregate_id=any($1::text[])`,
        [[...roomIds, ...profileIds]],
      );
    await admin.query(
      "delete from wordpairs.aggregates where (kind in ('room','match') and id=any($1::text[])) or (kind='profile' and id=any($2::text[]))",
      [roomIds, profileIds],
    );
    for (const table of ["room_members", "room_invitations"])
      await admin.query(
        `delete from wordpairs.${table} where room_id=any($1::text[])`,
        [roomIds],
      );
    await admin.query("delete from wordpairs.rooms where id=any($1::text[])", [
      roomIds,
    ]);
    for (const table of ["sessions", "guest_credentials"])
      await admin.query(
        `delete from wordpairs.${table} where profile_id=any($1::text[])`,
        [profileIds],
      );
    await admin.query(
      "delete from wordpairs.profiles where id=any($1::text[])",
      [profileIds],
    );
  } finally {
    await Promise.all([pool.end(), admin.end()]);
  }
});

async function gameFixture(playerCount: number) {
  let now = playerCount * 1_000_000;
  const clock = { now: () => now };
  const random = { integer: (minimum: number) => minimum };
  const identity = new IdentityService(
    new PostgresIdentityRepository(pool),
    secrets,
    ids,
    random,
    clock,
    null,
  );
  const directory = new PostgresRoomRepository(pool);
  const rooms = new RoomService(directory, clock, ids, roomRandom);
  const lobby = new LobbyService(
    directory,
    clock,
    ids,
    directory.presenceStore,
  );
  const repository = new PostgresMatchRepository(pool, ids, clock);
  const catalog = new PostgresCatalogRepository(pool);
  const service = new MatchService(repository, catalog, clock, ids, random);
  const guests = [];
  for (let index = 0; index <= playerCount; index++) {
    const guest = value(await identity.guest(null));
    profileIds.push(guest.profile.id);
    guests.push({ id: guest.profile.id, token: guest.sessionToken });
    expect(
      value(await identity.session(guest.sessionToken)).actor.profileId,
    ).toBe(guest.profile.id);
  }
  const players = guests.slice(0, playerCount);
  const outsider = guests[playerCount];
  expect(new Set(guests.map((p) => p.id)).size).toBe(playerCount + 1);
  expect(new Set(guests.map((p) => p.token)).size).toBe(playerCount + 1);
  const id = `${prefix}-room-${playerCount}`;
  roomIds.push(id);
  value(
    await rooms.create(command({ id, version: 0 }, players[0].id), playerCount),
  );
  const loadRoom = async () => value(await directory.get(id));
  const loadMatch = async () => value(await repository.get(id));
  for (const player of players.slice(1))
    value(
      await rooms.join(command(await loadRoom(), player.id), "player", null),
    );
  expect(
    await rooms.join(command(await loadRoom(), outsider.id), "player", null),
  ).toEqual(failure("ROOM_FULL"));
  for (const player of players)
    value(
      await lobby.act(command(await loadRoom(), player.id), {
        type: "ready",
        ready: true,
      }),
    );
  const countdown = await loadRoom();
  expect(countdown.status).toBe("countdown");
  expect(countdown.lockedRoster).toEqual(players.map((p) => p.id));
  const due = lobbyDeadlines(countdown, ids.next).find(
    (job) => job.kind === "countdown",
  );
  if (!due) throw new Error("Missing countdown job");
  now = due.dueAt;
  value(await lobby.expire(due));
  const starts = await Promise.all(players.map(() => service.open(id)));
  const match = value(starts[0]);
  for (const started of starts) expect(value(started)).toEqual(match);
  expect(match.roster).toEqual(players.map((p) => p.id));
  expect(await service.view(await loadRoom(), outsider.id)).toEqual(
    failure("NOT_AUTHORIZED"),
  );
  expect(
    (
      await admin.query(
        "select count(*)::int as count from wordpairs.outbox_events where aggregate_kind='match' and aggregate_id=$1",
        [id],
      )
    ).rows[0].count,
  ).toBe(1);
  return {
    players,
    identity,
    directory,
    repository,
    catalog,
    service,
    loadRoom,
    loadMatch,
    tick: () => {
      now += 10;
      return now;
    },
  };
}

describe("complete multiplayer games on real PostgreSQL", () => {
  it.each(Array.from({ length: 24 }, (_, index) => index + 2))(
    "%i players finish eight rounds with isolated sessions, concurrent submissions and exactly-once awards",
    async (playerCount) => {
      const h = await gameFixture(playerCount);
      const expectedTime = new Map(h.players.map((p) => [p.id, 0]));
      const pointsByStage = [5, 3, 2, 1];
      let match = await h.loadMatch();
      for (let number = 0; number < 8; number++) {
        expect(match.status).toBe(number === 0 ? "choosing" : "summary");
        if (!match.chooserId) throw new Error("Missing category chooser");
        const choose: MatchAction = { type: "choose", categoryId: "opposites" };
        value(
          await h.service.act(
            {
              ...command(match, match.chooserId),
              requestDigest: secrets.hash(JSON.stringify(choose)),
            },
            choose,
          ),
        );
        match = await h.loadMatch();
        const round = match.rounds[number];
        const pair = value(
          await h.catalog.pair(round.pairId, round.pairVersion),
        );
        const targetStage = new Map(
          h.players.map((p, index) => [p.id, (index + number) % 4]),
        );
        for (let stage = 0; stage < 4 && match.status === "playing"; stage++) {
          expect(match.rounds[number].stage).toBe(stage);
          const room = await h.loadRoom();
          const views = await Promise.all(
            h.players.map((p) => h.service.view(room, p.id)),
          );
          for (const [index, result] of views.entries()) {
            const view = value(result);
            const plannedStage = entry(targetStage, h.players[index].id);
            expect(view.scorecard).toHaveLength(playerCount);
            expect(view.round).not.toHaveProperty("correctAnswer");
            expect(view.round?.hints).toEqual(
              pair.hints.slice(0, Math.min(stage, plannedStage)),
            );
            expect(view.round?.canAnswer).toBe(plannedStage >= stage);
          }
          const pending = h.players.filter(
            (p) => entry(targetStage, p.id) >= stage,
          );
          const requests = pending.map((player) => {
            const correct = targetStage.get(player.id) === stage;
            const action: MatchAction = {
              type: "answer",
              roundId: round.id,
              stage,
              answer: correct
                ? pair.target
                : "multiplayer deliberately incorrect answer",
            };
            return {
              player,
              correct,
              action,
              input: {
                ...command(match, player.id),
                requestDigest: secrets.hash(JSON.stringify(action)),
              },
            };
          });
          // All actors begin with the same version. One commits, the others must
          // refresh before retrying their own unchanged intent/command ID.
          const acceptedAt = h.tick();
          const results = await Promise.all(
            requests.map((request) =>
              h.service.act(request.input, request.action),
            ),
          );
          expect(results.filter((result) => result.ok)).toHaveLength(1);
          expect(results.filter((result) => !result.ok)).toEqual(
            Array.from({ length: pending.length - 1 }, () =>
              failure("CONFLICT"),
            ),
          );
          for (const [index, request] of requests.entries()) {
            let result = results[index];
            let submittedAt = acceptedAt;
            let input = request.input;
            if (!result.ok) {
              match = await h.loadMatch();
              input = { ...input, expectedVersion: match.version };
              submittedAt = h.tick();
              result = await h.service.act(input, request.action);
            }
            expect(value(result)).toMatchObject({
              correct: request.correct,
              points: request.correct ? pointsByStage[stage] : 0,
            });
            if (request.correct)
              expectedTime.set(
                request.player.id,
                entry(expectedTime, request.player.id) +
                  submittedAt -
                  round.startedAt,
              );
            // An uncertain response may be retried, including the answer that
            // finishes the match and closes the room. It must never score twice.
            expect(await h.service.act(input, request.action)).toEqual(result);
          }
          match = await h.loadMatch();
        }
        const ended = match.rounds[number];
        expect(ended.revealed).toBe(true);
        expect(ended.solves).toHaveLength(playerCount);
        expect(new Set(ended.solves.map((solve) => solve.profileId)).size).toBe(
          playerCount,
        );
        expect(ended.solves.map((solve) => solve.order)).toEqual(
          h.players.map((_, index) => index),
        );
        for (const solve of ended.solves)
          expect(solve.points).toBe(
            pointsByStage[entry(targetStage, solve.profileId)],
          );
        if (number < 7) {
          expect(match.status).toBe("summary");
          expect(match.chooserId).toBe(ended.solves[0].profileId);
        }
      }
      expect(match.status).toBe("finished");
      expect(match.rounds).toHaveLength(8);
      expect(match.usedPairIds).toHaveLength(8);
      expect(new Set(match.usedPairIds).size).toBe(8);
      const room = await h.loadRoom();
      expect(room.status).toBe("closed");
      const expected = h.players
        .map((player, index) => ({
          profileId: player.id,
          position: index + 1,
          points: 22,
          totalTimeMs: entry(expectedTime, player.id),
          rank: 0,
        }))
        .sort(
          (a, b) => a.totalTimeMs - b.totalTimeMs || a.position - b.position,
        );
      for (const [index, row] of expected.entries())
        row.rank =
          index && expected[index - 1].totalTimeMs === row.totalTimeMs
            ? expected[index - 1].rank
            : index + 1;
      expect(match.finalStandings).toEqual(expected);
      const finalViews = await Promise.all(
        h.players.map((p) => h.service.view(room, p.id)),
      );
      for (const view of finalViews) {
        const final = value(view);
        expect(final.status).toBe("finished");
        expect(final.standings).toEqual(expected);
        expect(final.history).toHaveLength(8);
        expect(final.round?.canAnswer).toBe(false);
        expect(final.round?.correctAnswer).toBeDefined();
      }
      for (const player of h.players) {
        const profile = value(await h.identity.session(player.token)).profile;
        expect(profile.points).toBe(22);
        expect(profile.wins).toBe(
          expected.find((row) => row.profileId === player.id)?.rank === 1
            ? 1
            : 0,
        );
      }
      expect(
        (
          await admin.query(
            "select profile_id,points,winner from wordpairs.profile_match_awards where match_id=$1 order by profile_id",
            [match.id],
          )
        ).rows,
      ).toEqual(
        expected
          .map((row) => ({
            profile_id: row.profileId,
            points: 22,
            winner: row.rank === 1,
          }))
          .sort((a, b) => a.profile_id.localeCompare(b.profile_id)),
      );
      expect(
        (
          await admin.query(
            "select count(*)::int as count from wordpairs.submissions where round_id=any($1::text[]) and correct",
            [match.rounds.map((round) => round.id)],
          )
        ).rows[0].count,
      ).toBe(playerCount * 8);
    },
    // Real PostgreSQL commits for 25 players across eight rounds can exceed a
    // minute on a busy developer/CI host; this is not a gameplay deadline.
    120_000,
  );
});
