import "./trace";
import { expect, it } from "vitest";
import { matchProjection } from "../../src/domain/match";
import { acOracleScenarios } from "../ac-contracts/oracle-scenarios";
import { gameFixture, value } from "./fixtures";

it("AC-13-T01 counterpart: actual commands finish only after eight rounds and satisfy the unchanged final ordering oracle", async () => {
  const h = gameFixture();
  let now = 0;
  const plans = [
    [5, 5],
    [5, 5],
    [0, 2],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ];
  for (let number = 1; number <= 8; number++) {
    value(await h.choose());
    for (
      let stage = 0;
      stage < 4 && h.store.state.status === "playing";
      stage++
    ) {
      for (const [index, actor] of ["p1", "p2"].entries()) {
        const round = h.store.state.rounds.at(-1)!;
        if (round.solves.some((s) => s.profileId === actor)) continue;
        h.time(++now);
        value(
          await h.answer(
            actor,
            plans[number - 1][index] === [5, 3, 2, 1][round.stage]
              ? "cat"
              : "wrong",
          ),
        );
      }
    }
    if (number === 3 || number === 7)
      expect(h.store.state.status).not.toBe("finished");
  }
  expect(h.store.state.rounds).toHaveLength(8);
  expect(h.store.state.status).toBe("finished");
  const view = value(matchProjection(h.store.state, "p1", h.catalog));
  const scenario = acOracleScenarios.find((s) => s.id === "AC-13-T01");
  if (!scenario) throw new Error("Missing oracle");
  scenario.assertObservation({
    status: view.status === "finished" ? "final" : view.status,
    rows: view.standings.map((r) => ({
      rank: r.rank,
      playerId: r.profileId,
      totalScore: r.points,
    })),
  });
});
