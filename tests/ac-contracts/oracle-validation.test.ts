import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { acOracleScenarios } from './oracle-scenarios.js';

function assertConforms(actual: unknown, expected: unknown, path = 'observation'): void {
  if (Array.isArray(expected)) {
    expect(actual, path).toStrictEqual(expected);
    return;
  }
  if (expected !== null && typeof expected === 'object') {
    expect(actual, path).toBeTruthy();
    expect(typeof actual, path).toBe('object');
    for (const [key, value] of Object.entries(expected)) {
      assertConforms((actual as Record<string, unknown>)[key], value, `${path}.${key}`);
    }
    return;
  }
  expect(actual, path).toStrictEqual(expected);
}

function leafPaths(value: unknown, path: Array<string | number> = []): Array<Array<string | number>> {
  if (Array.isArray(value)) return [path];
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length === 0 ? [path] : entries.flatMap(([key, nested]) => leafPaths(nested, [...path, key]));
  }
  return [path];
}

function mutateAt(source: unknown, path: Array<string | number>): unknown {
  const clone = structuredClone(source);
  let parent: unknown = clone;
  for (const segment of path.slice(0, -1)) {
    parent = (parent as Record<string | number, unknown>)[segment];
  }
  const last = path.at(-1);
  if (last === undefined) {
    if (Array.isArray(clone)) return [...clone, '__contract_violation__'];
    return mutateLeaf(clone);
  }
  const current = (parent as Record<string | number, unknown>)[last];
  const mutated = Array.isArray(current)
    ? current.length === 0 ? ['__contract_violation__'] : [mutateLeaf(current[0]), ...current.slice(1)]
    : mutateLeaf(current);
  (parent as Record<string | number, unknown>)[last] = mutated;
  return clone;
}

function makeViolations(expected: unknown): Array<{ path: string; actual: unknown }> {
  return leafPaths(expected).map((path) => ({
    path: path.length ? path.join('.') : 'observation',
    actual: mutateAt(expected, path),
  }));
}

function mutateLeaf(value: unknown): unknown {
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'number') return value + 1;
  if (typeof value === 'string') return `${value}__contract_violation__`;
  return '__contract_violation__';
}

it('has one scripted mock oracle for every planned active-AC test ID', () => {
  const inventory = readFileSync(resolve(process.cwd(), 'docs/ac_test_inventory.md'), 'utf8');
  const inventoryIds = [...inventory.matchAll(/`(AC-\d{2}-T\d{2})`/g)].map((match) => match[1]);
  const oracleIds = acOracleScenarios.map(({ id }) => id);
  expect(oracleIds).toHaveLength(67);
  expect(new Set(oracleIds).size).toBe(67);
  expect([...oracleIds].sort()).toEqual([...inventoryIds].sort());
});

for (const scenario of acOracleScenarios) {
  it(`${scenario.id} oracle accepts a conforming trace and rejects a violating trace`, () => {
    const conformingMockTrace = structuredClone(scenario.expected);
    expect(() => assertConforms(conformingMockTrace, scenario.expected)).not.toThrow();

    const violationControls = makeViolations(scenario.expected);
    expect(violationControls.length, scenario.id).toBeGreaterThan(0);
    for (const violation of violationControls) {
      expect(() => assertConforms(violation.actual, scenario.expected), `${scenario.id} should reject ${violation.path}`).toThrow();
    }
  });
}
