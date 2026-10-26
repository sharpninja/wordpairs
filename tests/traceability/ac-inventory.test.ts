import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const inventoryPath = resolve(process.cwd(), 'docs/ac_test_inventory.md');
const inventory = readFileSync(inventoryPath, 'utf8');
const rows = inventory.split(/\r?\n/).filter((line) => /^\| AC-\d{2} \|/.test(line));
const activeAcIds = new Set(rows.map((line) => line.split('|')[1].trim()));
const caseIds = rows.map((line) => line.match(/`(AC-\d{2}-T\d{2})`/)?.[1]).filter(Boolean);

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

  it('gives each planned case an assertion, verification boundary, and test seam', () => {
    for (const row of rows) {
      const columns = row.split('|').map((column) => column.trim());
      expect(columns[3], row).not.toBe('');
      expect(columns[4], row).not.toBe('');
      expect(columns[5], row).not.toBe('');
    }
  });
});
