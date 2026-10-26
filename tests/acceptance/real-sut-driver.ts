import { roomProjection } from "../../src/application/rooms";
import {
  chooseCategory,
  createMatch,
  matchProjection,
  standings,
} from "../../src/domain/match";
import type { Match } from "../../src/domain/model";
import type {
  AcScenarioDriver,
  JsonValue,
  ScenarioRequest,
} from "../ac-contracts/oracle-scenarios";
import {
  fixtureCatalog,
  gameFixture,
  roomFixture,
  roundFixture,
  solve,
  value,
} from "./fixtures";
/** Observations are derived from production entry points; this module never imports expected outputs. */
export class RealSutDriver implements AcScenarioDriver {
  async execute(
    id: string,
    request: ScenarioRequest,
  ): Promise<Record<string, JsonValue>> {
    const setup = request.setup;
    switch (id) {
      case "AC-04-T01": {
        const roster = setup.roster as string[];
        const values = setup.randomReturns as number[];
        const randomCalls: { min: number; max: number }[] = [];
        const selections = values.map((randomValue) => {
          const match = value(
            createMatch(
              "m",
              "r",
              roster,
              {
                integer: (min, max) => {
                  randomCalls.push({ min, max });
                  return randomValue;
                },
              },
              0,
            ),
          );
          return { randomValue, anchorId: match.anchorId };
        });
        return { randomCalls, selections };
      }
      case "AC-04-T02": {
        const catalog = fixtureCatalog();
        let match = {
          ...value(
            createMatch("m", "r", ["p1", "p2"], { integer: () => 2 }, 0),
          ),
          version: 1,
        };
        const attempts = [];
        for (const actorId of [String(setup.anchorId), "p1"]) {
          const result = chooseCategory(
            match,
            actorId,
            String(setup.categoryId),
            catalog,
            { integer: (a) => a },
            0,
            () => "round",
          );
          if (result.ok) match = result.value;
          attempts.push({
            actorId,
            result: result.ok
              ? "chosen"
              : result.error.code === "NOT_AUTHORIZED"
                ? "forbidden"
                : result.error.code,
            matchVersion: match.version,
          });
        }
        return {
          attempts,
          categoryId: match.rounds.at(-1)?.categoryId ?? null,
        };
      }
      case "AC-06-T01": {
        const h = gameFixture();
        value(await h.choose());
        const round = h.store.state.rounds[0];
        const command = h.command("p1", "accepted");
        const action = {
          type: "answer" as const,
          roundId: round.id,
          stage: 0,
          answer: "cat",
        };
        const results = [];
        for (const [answer, run] of [
          ["cat", () => h.service.act(command, action)],
          ["dog", () => h.answer("p2", "dog")],
          ["cat", () => h.service.act(command, action)],
        ] as const) {
          const before =
            standings(h.store.state).find((r) => r.profileId === "p1")
              ?.points ?? 0;
          const result = await run();
          const after =
            standings(h.store.state).find((r) => r.profileId === "p1")
              ?.points ?? 0;
          results.push({
            answer,
            accepted: result.ok && !!result.value.correct,
            scoreDelta: after - before,
          });
        }
        return {
          results,
          scoreAfter:
            standings(h.store.state).find((r) => r.profileId === "p1")
              ?.points ?? 0,
        };
      }
      case "AC-07-T01": {
        const results = [];
        for (const stageName of setup.stages as string[]) {
          const h = gameFixture();
          value(await h.choose());
          const stage = Number(stageName.at(-1));
          for (let i = 0; i < stage; i++)
            value(await h.expire(h.store.state.rounds[0].stageDueAt));
          h.time(h.store.state.rounds[0].stageDueAt - 1);
          const result = value(
            await h.answer("p1", String(setup.acceptedAnswer)),
          );
          results.push({ stage: stageName, scoreDelta: result.points ?? 0 });
        }
        return { results };
      }
      case "AC-08-T01": {
        const h = gameFixture();
        value(await h.choose());
        value(await h.expire(80000));
        const view = value(
          matchProjection(h.store.state, String(setup.playerId), h.catalog),
        );
        const row = view.scorecard.find((r) => r.profileId === setup.playerId);
        return {
          playerResult: {
            scoreDelta: row?.points ?? 0,
            solved: row?.solved ?? false,
          },
          projectionAfterHint3: {
            revealedTarget: view.round?.correctAnswer ?? null,
          },
        };
      }
      case "AC-09-T01": {
        const h = gameFixture();
        value(await h.choose());
        value(await h.expire(20000));
        const submitted: string[] = [];
        const transitions = [];
        for (const actor of setup.unsolved as string[]) {
          const before = new Map(
            h.store.state.roster.map((p) => [
              p,
              value(matchProjection(h.store.state, p, h.catalog)).round?.hints
                .length ?? 0,
            ]),
          );
          h.time(20001);
          value(await h.answer(actor, "incorrect"));
          submitted.push(actor);
          const round = h.store.state.rounds[0];
          transitions.push({
            submitted: [...submitted],
            stage: `hint-${round.stage}`,
            hintRecipients: h.store.state.roster.filter(
              (p) =>
                (value(matchProjection(h.store.state, p, h.catalog)).round
                  ?.hints.length ?? 0) > (before.get(p) ?? 0),
            ),
          });
        }
        return { transitions };
      }
      case "AC-10-T01": {
        const h = gameFixture(["p1", "p2"], Number(setup.roundStartedAtMs));
        h.store.state = {
          ...h.store.state,
          status: "summary",
          rounds: [
            roundFixture("prior-a", [solve("p1", 3, 2000)]),
            roundFixture("prior-b", [solve("p1", 1, 3000)]),
          ],
        };
        value(await h.choose());
        h.time(1001);
        value(await h.answer("p1", "wrong"));
        value(await h.answer("p2", "wrong"));
        h.time(Number(setup.serverAcceptedAtMs));
        value(await h.answer(String(setup.playerId), "cat"));
        const current = h.store.state.rounds.at(-1)!;
        const accepted = current.solves[0];
        const projection = value(
          matchProjection(h.store.state, "p1", h.catalog),
        );
        const profile = roomProjection(roomFixture(), "p1", [
          { id: "p1", alias: "Oak", icon: String(setup.icon) },
        ]).players.find((p) => p.id === "p1");
        return {
          acceptedSubmission: {
            playerId: accepted.profileId,
            acceptedAtMs: accepted.acceptedAt,
            elapsedMs: accepted.elapsedMs,
            scoreDelta: accepted.points,
          },
          scorecard: [
            {
              playerId: accepted.profileId,
              icon: profile?.icon ?? null,
              roundPoints:
                projection.scorecard.find((p) => p.profileId === "p1")
                  ?.points ?? 0,
              cumulativePoints:
                projection.standings.find((p) => p.profileId === "p1")
                  ?.points ?? 0,
              elapsedMs: accepted.elapsedMs,
            },
          ],
        };
      }
      case "AC-11-T01": {
        const submissions = setup.submissions as {
          playerId: string;
          acceptedAtMs: number;
          sequence: number;
        }[];
        const h = gameFixture(submissions.map((s) => s.playerId));
        value(await h.choose());
        for (const submission of [...submissions].sort(
          (a, b) => a.acceptedAtMs - b.acceptedAtMs || a.sequence - b.sequence,
        )) {
          h.time(submission.acceptedAtMs);
          value(await h.answer(submission.playerId));
        }
        return {
          chooserId: h.store.state.chooserId,
          orderedCandidates: h.store.state.rounds[0].solves.map(
            (s) => s.profileId,
          ),
        };
      }
      case "AC-12-T01": {
        const prior = setup.priorScores as Record<string, number>;
        const results = setup.roundResults as Record<
          string,
          { points: number; elapsedMs: number | null }
        >;
        const match: Match = {
          ...value(
            createMatch("m", "r", Object.keys(prior), { integer: (a) => a }, 0),
          ),
          status: "summary",
          rounds: [
            roundFixture(
              "prior",
              Object.entries(prior).map(([p, points], i) =>
                solve(p, points, 1000, i),
              ),
            ),
            roundFixture(
              "current",
              Object.entries(results)
                .filter(([, r]) => r.points > 0)
                .map(([p, r], i) => solve(p, r.points, r.elapsedMs ?? 0, i)),
            ),
          ],
        };
        const projection = value(
          matchProjection(match, "p1", fixtureCatalog()),
        );
        return {
          rows: projection.standings.map((row) => ({
            playerId: row.profileId,
            cumulativeScore: row.points,
            roundPoints:
              projection.scorecard.find((p) => p.profileId === row.profileId)
                ?.points ?? 0,
            elapsedMs:
              match.rounds
                .at(-1)
                ?.solves.find((p) => p.profileId === row.profileId)
                ?.elapsedMs ?? null,
          })),
        };
      }
      case "AC-14-T01": {
        const rows = setup.rows as {
          playerId: string;
          score: number;
          solveSeconds: number[];
          unsolvedRounds: number;
        }[];
        const rounds = Array.from(
          {
            length: Math.max(
              ...rows.map((r) => r.solveSeconds.length + r.unsolvedRounds),
            ),
          },
          (_, i) =>
            roundFixture(
              `round-${i}`,
              rows.flatMap((r, index) =>
                r.solveSeconds[i] === undefined
                  ? []
                  : [
                      solve(
                        r.playerId,
                        i === 0 ? r.score : 0,
                        r.solveSeconds[i] * 1000,
                        index,
                      ),
                    ],
              ),
            ),
        );
        const match = {
          ...value(
            createMatch(
              "m",
              "r",
              rows.map((r) => r.playerId),
              { integer: (a) => a },
              0,
            ),
          ),
          rounds,
        };
        return {
          standings: standings(match).map((r) => ({
            rank: r.rank,
            playerId: r.profileId,
            score: r.points,
            tieSeconds: r.totalTimeMs / 1000,
          })),
        };
      }
      case "AC-45-T01": {
        const h = gameFixture();
        value(await h.choose());
        const round = h.store.state.rounds[0];
        const command = h.command(
          String(setup.playerId),
          String((setup.commandIds as string[])[0]),
        );
        const action = {
          type: "answer" as const,
          roundId: round.id,
          stage: 0,
          answer: "cat",
        };
        const acceptances = [];
        for (const commandId of setup.commandIds as string[]) {
          const before = h.store.state.rounds[0].solves.length;
          const result = await h.service.act({ ...command, commandId }, action);
          const after = h.store.state.rounds[0].solves.length;
          if (result.ok && after > before)
            acceptances.push({
              commandId,
              scoreDelta: result.value.points ?? 0,
            });
        }
        return {
          acceptances,
          scoreAfter:
            standings(h.store.state).find((p) => p.profileId === setup.playerId)
              ?.points ?? 0,
        };
      }
      case "AC-45-T02": {
        const h = gameFixture();
        h.store.state = {
          ...h.store.state,
          status: "summary",
          rounds: [
            roundFixture("prior", [
              solve(String(setup.playerId), Number(setup.scoreBefore), 1000),
            ]),
          ],
        };
        value(await h.choose());
        const result = value(
          await h.answer(String(setup.playerId), String(setup.answer)),
        );
        const events = h.store.commits.flatMap((c) => c.transition.events);
        if (JSON.stringify(events).includes(String(setup.answer)))
          throw new Error("Incorrect guess leaked to events");
        return {
          result: result.correct ? "correct" : "incorrect",
          scoreAfter:
            standings(h.store.state).find((p) => p.profileId === setup.playerId)
              ?.points ?? 0,
          emittedEvents: events
            .filter((e) => e.type.toLowerCase().includes("guess"))
            .map((e) => ({ type: e.type, ...e.payload })),
        };
      }
      case "AC-45-T03": {
        const h = gameFixture();
        value(await h.choose());
        const room = {
          ...roomFixture(["p1", "p2"], [{ id: "o1", follows: "p1" }]),
          status: "playing" as const,
          startedAt: 0,
          startedRoster: ["p1", "p2"],
        };
        const target = (
          view: Awaited<ReturnType<typeof h.service.view>>,
        ): Record<string, JsonValue> => {
          const projection = value(view);
          return projection.round && "correctAnswer" in projection.round
            ? { target: projection.round.correctAnswer as string }
            : {};
        };
        const beforeReveal = {
          player: target(await h.service.view(room, "p1")),
          observer: target(await h.service.view(room, "o1")),
        };
        value(await h.expire(80000));
        return {
          beforeReveal,
          afterReveal: {
            player: target(await h.service.view(room, "p1")),
            observer: target(await h.service.view(room, "o1")),
          },
        };
      }
      default:
        throw new Error(`No real SUT observation adapter for ${id}`);
    }
  }
}
