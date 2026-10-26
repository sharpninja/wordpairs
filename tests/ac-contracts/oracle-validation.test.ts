import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contractExpectations } from './oracle-contract-expectations.js';
import {
  acOracleScenarios,
  ScriptedObservationDriver,
  type JsonValue,
  type OracleScenario,
} from './oracle-scenarios.js';

function scenarioMap(scenarios: OracleScenario[]): Map<string, { request: OracleScenario['request']; observation: Record<string, JsonValue> }> {
  return new Map(scenarios.map((scenario) => [scenario.id, { request: scenario.request, observation: scenario.conformingObservation }]));
}

it('has one reusable scripted scenario for every planned active-AC test ID', () => {
  const inventory = readFileSync(resolve(process.cwd(), 'docs/ac_test_inventory.md'), 'utf8');
  const inventoryIds = [...inventory.matchAll(/`(AC-\d{2}-T\d{2})`/g)].map((match) => match[1]);
  const oracleIds = acOracleScenarios.map(({ id }) => id);

  expect(oracleIds).toHaveLength(67);
  expect(new Set(oracleIds).size).toBe(67);
  expect([...oracleIds].sort()).toEqual([...inventoryIds].sort());
  expect(Object.keys(contractExpectations).sort()).toEqual([...oracleIds].sort());
});

it('gives every scenario concrete setup, ordered actions, raw observations, and named semantic violations', () => {
  for (const scenario of acOracleScenarios) {
    expect(Object.keys(scenario.request.setup).length, `${scenario.id} setup`).toBeGreaterThan(0);
    expect(scenario.request.actions.length, `${scenario.id} actions`).toBeGreaterThan(0);
    expect(scenario.request.actions.every(({ type }) => type.length > 0), `${scenario.id} action names`).toBe(true);
    expect(Object.keys(scenario.conformingObservation).length, `${scenario.id} raw observation`).toBeGreaterThan(0);
    expect(scenario.violations.length, `${scenario.id} violations`).toBeGreaterThan(0);
    expect(scenario.violations.every(({ name }) => name.length > 0), `${scenario.id} violation names`).toBe(true);
    expect(scenario.contractExpected, `${scenario.id} contract source`).not.toBe(scenario.conformingObservation);
    expect(scenario.contractExpected, `${scenario.id} fixture/contract agreement`).toStrictEqual(scenario.conformingObservation);
    expect(() => scenario.assertObservation(structuredClone(scenario.contractExpected)), `${scenario.id} independent contract`).not.toThrow();
  }
});

describe.each(acOracleScenarios)('$id reusable acceptance oracle', (scenario) => {
  it('runs the request through the driver and accepts the conforming raw observation', async () => {
    const driver = new ScriptedObservationDriver(scenarioMap([scenario]));
    const observation = await driver.execute(scenario.id, scenario.request);

    expect(() => scenario.assertObservation(observation)).not.toThrow();
    expect(driver.requests).toStrictEqual([{ id: scenario.id, request: scenario.request }]);
  });

  it.each(scenario.violations)('rejects semantic control: $name', ({ observation }) => {
    expect(() => scenario.assertObservation(structuredClone(observation))).toThrow();
  });

  it('rejects missing, reordered, or altered scripted actions', async () => {
    const driver = new ScriptedObservationDriver(scenarioMap([scenario]));
    const missingActions = { ...structuredClone(scenario.request), actions: [] };
    await expect(driver.execute(scenario.id, missingActions)).rejects.toThrow('Unexpected setup or ordered actions');

    const alteredSetup = structuredClone(scenario.request);
    alteredSetup.setup = { __unexpected: true };
    await expect(driver.execute(scenario.id, alteredSetup)).rejects.toThrow('Unexpected setup or ordered actions');

    if (scenario.request.actions.length > 1) {
      const reordered = structuredClone(scenario.request);
      reordered.actions.reverse();
      await expect(driver.execute(scenario.id, reordered)).rejects.toThrow('Unexpected setup or ordered actions');
    }
  });
});

it('rejects the hostile-review semantic controls that summary flags previously missed', () => {
  const controls = [
    ['AC-05-T01', 'same category has different backgrounds'],
    ['AC-14-T01', 'slower player ranks first'],
    ['AC-30-T01', 'newest observer promoted'],
    ['AC-50-T01', 'public payload leaks room code and target'],
  ] as const;

  for (const [id, name] of controls) {
    const scenario = acOracleScenarios.find((candidate) => candidate.id === id);
    const violation = scenario?.violations.find((candidate) => candidate.name === name);
    expect(scenario, id).toBeDefined();
    expect(violation, `${id}: ${name}`).toBeDefined();
    expect(() => scenario!.assertObservation(structuredClone(violation!.observation))).toThrow();
  }
});
