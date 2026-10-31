import { describe, expect, it } from "vitest";
import { assertReadinessCase, readinessCases, type ReadinessBarrier, type ReadinessCase } from "./readiness-barrier.contract";

type Defect = "interleaved" | "omitted-preparation" | "swallowed-preparation" | "identity-swap" | "continued-ready";
// Independent scripted providers, including the old interleaved failure class.
// They do not import or derive expectations from the implementation.
function fixture(defect?: Defect): ReadinessBarrier {
  return async (players, prepare, ready) => {
    if (defect === "interleaved") {
      for (const [index, player] of players.entries()) {
        await prepare(player, index);
        await ready(player, index);
      }
      return;
    }
    const preparation = defect === "identity-swap" ? [...players].reverse() : defect === "omitted-preparation" ? players.slice(0, -1) : players;
    const inspection = Promise.all(preparation.map(prepare));
    if (defect === "swallowed-preparation") await inspection.catch(() => undefined);
    else await inspection;
    for (const [index, player] of players.entries()) {
      if (defect === "continued-ready") await ready(player, index).catch(() => undefined);
      else await ready(player, index);
    }
  };
}

const controls: { name: ReadinessCase; defect: Defect }[] = [
  { name: "delayed-last-connection", defect: "interleaved" },
  { name: "delayed-first-connection", defect: "omitted-preparation" },
  { name: "fifteen-player-identity", defect: "identity-swap" },
  { name: "missing-page", defect: "swallowed-preparation" },
  { name: "disconnected-page", defect: "swallowed-preparation" },
  { name: "short-roster", defect: "swallowed-preparation" },
  { name: "disabled-ready", defect: "swallowed-preparation" },
  { name: "connection-rejection", defect: "swallowed-preparation" },
  { name: "readiness-rejection", defect: "continued-ready" },
];
const real = process.env.WORDPAIRS_READINESS_BINDING !== "mock";
const modulePath = "./readiness-barrier";
const barrier: ReadinessBarrier = real ? (await import(modulePath)).readyAfterBarrier : fixture();

describe(`common UI readiness oracle (${real ? "real helper" : "independent correct fixture"})`, () => {
  it.each(readinessCases)("preserves %s", async (name) => { await assertReadinessCase(name, barrier); });
  it.each(controls)("rejects independent wrong $name/$defect", async ({ name, defect }) => {
    await expect(assertReadinessCase(name, fixture(defect))).rejects.toThrow();
  });
});
