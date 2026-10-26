export type TraceabilityMapping = {
  acId: string;
  testIds: string[];
};

export type MockValidationRecord = {
  testId: string;
  setup: unknown;
  actions: unknown[];
  observation: unknown;
  assertions: string[];
  status: 'planned' | 'passing';
};

export type TraceabilityManifest = {
  activeAcIds: string[];
  mappings: TraceabilityMapping[];
  existingTestIds: string[];
  mockValidationRecords: MockValidationRecord[];
};

export type TraceabilityResult =
  | { valid: true }
  | { valid: false; code: 'empty-active-set' | 'missing-ac' | 'missing-test' | 'missing-record' | 'incomplete-record' };

export function validateRows(inputRows: string[]): string[] {
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

function hasConcreteValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

export function validateTraceabilityManifest(manifest: TraceabilityManifest): TraceabilityResult {
  if (manifest.activeAcIds.length === 0) return { valid: false, code: 'empty-active-set' };
  const mappingByAc = new Map(manifest.mappings.map((mapping) => [mapping.acId, mapping]));
  const existingTests = new Set(manifest.existingTestIds);
  const records = new Map(manifest.mockValidationRecords.map((record) => [record.testId, record]));

  for (const acId of manifest.activeAcIds) {
    const mapping = mappingByAc.get(acId);
    if (!mapping || mapping.testIds.length === 0) return { valid: false, code: 'missing-ac' };
    for (const testId of mapping.testIds) {
      if (!existingTests.has(testId)) return { valid: false, code: 'missing-test' };
      const record = records.get(testId);
      if (!record) return { valid: false, code: 'missing-record' };
      if (
        record.testId !== testId
        || !hasConcreteValue(record.setup)
        || !hasConcreteValue(record.actions)
        || !hasConcreteValue(record.observation)
        || !hasConcreteValue(record.assertions)
        || record.status !== 'passing'
      ) return { valid: false, code: 'incomplete-record' };
    }
  }
  return { valid: true };
}
