import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const inventoryPath = resolve(process.cwd(), 'docs/ac_test_inventory.md');
const inventory = readFileSync(inventoryPath, 'utf8');
const rows = inventory.split(/\r?\n/).filter((line) => /^\| AC-\d{2} \|/.test(line));
const activeAcIds = new Set(rows.map((line) => line.split('|')[1].trim()));
const caseIds = rows.map((line) => line.match(/`(AC-\d{2}-T\d{2})`/)?.[1]).filter((id): id is string => Boolean(id));

function validateRows(inputRows: string[]): string[] {
  const ids: string[] = [];
  for (const row of inputRows) {
    const columns = row.split('|').map((column) => column.trim());
    if (columns.length !== 9) throw new Error('Expected exactly seven inventory fields');
    for (const index of [1, 2, 3, 4, 5, 6, 7]) {
      if (typeof columns[index] !== 'string' || columns[index].length === 0) {
        throw new Error(`Missing inventory field ${index}`);
      }
    }
    const caseMatch = columns[3].match(/^`(AC-\d{2}-T\d{2})`$/);
    if (!caseMatch) throw new Error('Malformed active-AC test ID');
    if (!caseMatch[1].startsWith(`${columns[1]}-T`)) throw new Error('Test ID does not belong to its AC row');
    ids.push(caseMatch[1]);
  }
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate active-AC test ID');
  return ids;
}

const expectedActiveAcIds = [
  ...Array.from({ length: 33 }, (_, index) => `AC-${String(index + 1).padStart(2, '0')}`),
  'AC-37', 'AC-38', 'AC-39',
  'AC-41', 'AC-42', 'AC-43', 'AC-44', 'AC-45', 'AC-46', 'AC-47',
  'AC-50', 'AC-51',
];

describe('AC test inventory traceability (AC-38)', () => {
  it('maps every active acceptance criterion to at least one named case', () => {
    expect([...activeAcIds].sort()).toEqual(expectedActiveAcIds.sort());
    expect(caseIds).toHaveLength(67);
    expect(new Set(caseIds).size).toBe(67);
  });

  it('validates each case schema, assertion, boundary, seam, status, and AC ownership', () => {
    expect(validateRows(rows)).toHaveLength(67);
  });

  it('rejects missing fields, truncated rows, mismatched AC ownership, and duplicate IDs', () => {
    const valid = '| AC-01 | Room joining | `AC-01-T01` | Joins through one authority. | Room use case | Fake repository | Planned |';
    expect(() => validateRows([valid.replace('Fake repository', '')])).toThrow('Missing inventory field 6');
    expect(() => validateRows([valid.slice(0, -10)])).toThrow('Expected exactly seven inventory fields');
    expect(() => validateRows([valid.replace('AC-01-T01', 'AC-02-T01')])).toThrow('Test ID does not belong to its AC row');
    expect(() => validateRows([valid, valid])).toThrow('Duplicate active-AC test ID');
  });
});

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  license: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const attribution = readFileSync(resolve(process.cwd(), 'docs/ATTRIBUTIONS.md'), 'utf8');

describe('direct dependency attribution (AC-39)', () => {
  it('records each installed direct dependency, exact version, and declared license', () => {
    expect(packageJson.license).toBe('GPL-2.0-only');
    const direct = { ...packageJson.dependencies, ...packageJson.devDependencies };
    for (const [name, version] of Object.entries(direct)) {
      const row = attribution.split(/\r?\n/).find((line) => line.startsWith(`| \`${name}\` |`));
      expect(row, `missing attribution for ${name}`).toBeDefined();
      expect(row!.split('|')[3].trim(), `version mismatch for ${name}`).toBe(version);
      const packageFile = resolve(process.cwd(), 'node_modules', ...name.split('/'), 'package.json');
      const installed = JSON.parse(readFileSync(packageFile, 'utf8')) as { version: string; license: string };
      expect(installed.version, `installed version mismatch for ${name}`).toBe(version);
      expect(row!.split('|')[5].trim(), `license mismatch for ${name}`).toBe(installed.license);
    }
  });
});
