import "./trace";
import { writeFile } from "node:fs/promises";
import { afterAll, expect, it } from "vitest";
import { acOracleScenarios } from "../ac-contracts/oracle-scenarios";
import { RealSutDriver } from "./real-sut-driver";

const ids = [
  "AC-04-T01",
  "AC-04-T02",
  "AC-06-T01",
  "AC-07-T01",
  "AC-08-T01",
  "AC-09-T01",
  "AC-10-T01",
  "AC-11-T01",
  "AC-12-T01",
  "AC-14-T01",
  "AC-45-T01",
  "AC-45-T02",
  "AC-45-T03",
];
const driver = new RealSutDriver();
const observations: Record<string, unknown> = {};
afterAll(async () => {
  if (process.env.WORDPAIRS_ACCEPTANCE_OBSERVATIONS)
    await writeFile(
      process.env.WORDPAIRS_ACCEPTANCE_OBSERVATIONS,
      JSON.stringify(observations, null, 2),
    );
});
for (const id of ids)
  it(`${id} real domain/application conformance with unchanged oracle`, async () => {
    const scenario = acOracleScenarios.find((s) => s.id === id);
    expect(scenario).toBeDefined();
    if (!scenario) throw new Error("Missing oracle");
    const observed = await driver.execute(id, scenario.request);
    observations[id] = { request: scenario.request, observed };
    scenario.assertObservation(observed);
  });
