import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateRows, validateTraceabilityManifest, type TraceabilityManifest } from './inventory-validator.js';

const inventoryPath = resolve(process.cwd(), 'docs/ac_test_inventory.md');
const inventory = readFileSync(inventoryPath, 'utf8');
const rows = inventory.split(/\r?\n/).filter((line) => /^\| AC-\d{2} \|/.test(line));
const activeAcIds = new Set(rows.map((line) => line.split('|')[1].trim()));
const caseIds = rows.map((line) => line.match(/`(AC-\d{2}-T\d{2})`/)?.[1]).filter((id): id is string => Boolean(id));

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

  it('validates concrete manifest mappings and mock-validation records', () => {
    const complete: TraceabilityManifest = {
      activeAcIds: ['AC-01', 'AC-02'],
      mappings: [{ acId: 'AC-01', testIds: ['AC-01-T01'] }, { acId: 'AC-02', testIds: ['AC-02-T01'] }],
      existingTestIds: ['AC-01-T01', 'AC-02-T01'],
      mockValidationRecords: [
        { testId: 'AC-01-T01', setup: { room: 'open' }, actions: [{ type: 'join' }], observation: { result: 'joined' }, assertions: ['membership is player'], status: 'passing' },
        { testId: 'AC-02-T01', setup: { room: 'full' }, actions: [{ type: 'join' }], observation: { result: 'no-slot' }, assertions: ['roster unchanged'], status: 'passing' },
      ],
    };
    expect(validateTraceabilityManifest(complete)).toEqual({ valid: true });
    const planned = structuredClone(complete);
    planned.mockValidationRecords[1].status = 'planned';
    expect(validateTraceabilityManifest(planned)).toEqual({ valid: false, code: 'incomplete-record' });
    expect(validateTraceabilityManifest({ ...complete, mappings: complete.mappings.slice(0, 1) })).toEqual({ valid: false, code: 'missing-ac' });
    expect(validateTraceabilityManifest({ ...complete, mappings: [{ acId: 'AC-01', testIds: ['AC-01-T99'] }, complete.mappings[1]] })).toEqual({ valid: false, code: 'missing-test' });
    expect(validateTraceabilityManifest({ ...complete, mockValidationRecords: complete.mockValidationRecords.slice(0, 1) })).toEqual({ valid: false, code: 'missing-record' });
    expect(validateTraceabilityManifest({ ...complete, mockValidationRecords: [{ ...complete.mockValidationRecords[0], assertions: [] }, complete.mockValidationRecords[1]] })).toEqual({ valid: false, code: 'incomplete-record' });
    expect(validateTraceabilityManifest({ activeAcIds: [], mappings: [], existingTestIds: [], mockValidationRecords: [] })).toEqual({ valid: false, code: 'empty-active-set' });
  });
});

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  license: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const packageLock = JSON.parse(readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8')) as {
  packages: Record<string, { version?: string; license?: string }>;
};
const attribution = readFileSync(resolve(process.cwd(), 'docs/ATTRIBUTIONS.md'), 'utf8');

describe('direct dependency attribution (AC-39)', () => {
  it('records each installed direct dependency purpose, upstream, exact locked version, and license', () => {
    expect(packageJson.license).toBe('GPL-2.0-only');
    const direct = { ...packageJson.dependencies, ...packageJson.devDependencies };
    for (const [name, version] of Object.entries(direct)) {
      const row = attribution.split(/\r?\n/).find((line) => line.startsWith(`| \`${name}\` |`));
      expect(row, `missing attribution for ${name}`).toBeDefined();
      const columns = row!.split('|').map((column) => column.trim());
      expect(columns[2], `missing purpose for ${name}`).not.toBe('');
      expect(columns[3], `version mismatch for ${name}`).toBe(version);
      expect(columns[4], `missing registry source for ${name}`).toMatch(/^\[.+\]\(https:\/\/.+\)$/);
      expect(columns[6], `missing upstream source for ${name}`).toMatch(/^\[.+\]\(https:\/\/.+\)$/);
      const packageFile = resolve(process.cwd(), 'node_modules', ...name.split('/'), 'package.json');
      const installed = JSON.parse(readFileSync(packageFile, 'utf8')) as { version: string; license: string };
      expect(installed.version, `installed version mismatch for ${name}`).toBe(version);
      expect(columns[5], `license mismatch for ${name}`).toBe(installed.license);
      const locked = packageLock.packages[`node_modules/${name}`];
      expect(locked?.version, `lockfile version mismatch for ${name}`).toBe(version);
      expect(locked?.license, `lockfile license mismatch for ${name}`).toBe(installed.license);
    }
  });
});
