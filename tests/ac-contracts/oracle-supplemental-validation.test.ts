import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateExtractedSourceArchive, validateReleaseNotices } from './archive-fixture-validator.js';
import { supplementalContractExpectations } from './oracle-supplemental-contracts.js';
import { supplementalScenarios } from './oracle-supplemental-scenarios.js';
import { ScriptedObservationDriver } from './oracle-scenarios.js';

const temporaryRoots: string[] = [];
afterEach(() => {
  while (temporaryRoots.length) rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
});

function scriptsFor(scenario: (typeof supplementalScenarios)[number]) {
  return new Map([[scenario.id, { request: scenario.request, observation: scenario.conformingObservation }]]);
}

describe.each(supplementalScenarios)('$id supplemental requirement coverage', (scenario) => {
  it('executes the exact scripted request and accepts the independent contract', async () => {
    const driver = new ScriptedObservationDriver(scriptsFor(scenario));
    const observation = await driver.execute(scenario.id, scenario.request);
    expect(scenario.conformingObservation).not.toBe(supplementalContractExpectations[scenario.id]);
    expect(scenario.conformingObservation).toStrictEqual(supplementalContractExpectations[scenario.id]);
    expect(() => scenario.assertObservation(observation)).not.toThrow();
  });

  it.each(scenario.violations)('rejects semantic control: $name', ({ observation }) => {
    expect(() => scenario.assertObservation(structuredClone(observation))).toThrow();
  });

  it('rejects an omitted action or altered setup', async () => {
    const driver = new ScriptedObservationDriver(scriptsFor(scenario));
    await expect(driver.execute(scenario.id, { ...scenario.request, actions: [] })).rejects.toThrow();
    await expect(driver.execute(scenario.id, { ...scenario.request, setup: { unexpected: true } })).rejects.toThrow();
  });
});

function writeFixture(root: string, path: string, content: string): void {
  const destination = join(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function extractedArchive(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'wordpairs-archive-'));
  temporaryRoots.push(root);
  for (const [path, content] of Object.entries(files)) writeFixture(root, path, content);
  return root;
}

const validBom = JSON.stringify({
  bomFormat: 'CycloneDX', specVersion: '1.6', version: 1,
  metadata: { component: { type: 'application', name: 'wordpairs', version: 'abc123' } },
});
const baseArchive = {
  LICENSE: readFileSync(resolve(process.cwd(), 'LICENSE'), 'utf8'),
  'docs/ATTRIBUTIONS.md': readFileSync(resolve(process.cwd(), 'docs/ATTRIBUTIONS.md'), 'utf8'),
  'README.md': 'fixture readme',
  'src/index.ts': 'export const fixture = true;',
  'sbom/abc123.cdx.json': validBom,
};

it('AC-41 validates extracted temporary source archives and every required failure', () => {
  const sourceManifest = ['README.md', 'src/index.ts'];
  expect(validateExtractedSourceArchive(extractedArchive(baseArchive), 'abc123', sourceManifest)).toBe('accepted');
  expect(validateExtractedSourceArchive(extractedArchive({}), 'abc123', sourceManifest)).toBe('empty-archive');
  const { LICENSE: _license, ...withoutLicense } = baseArchive;
  expect(validateExtractedSourceArchive(extractedArchive(withoutLicense), 'abc123', sourceManifest)).toBe('missing-license');
  const { ['src/index.ts']: _source, ...withoutSource } = baseArchive;
  expect(validateExtractedSourceArchive(extractedArchive(withoutSource), 'abc123', sourceManifest)).toBe('incomplete-source');
  const { ['sbom/abc123.cdx.json']: _bom, ...withoutBom } = baseArchive;
  expect(validateExtractedSourceArchive(extractedArchive(withoutBom), 'abc123', sourceManifest)).toBe('missing-sbom');
  expect(validateExtractedSourceArchive(extractedArchive({ ...withoutBom, 'sbom/def456.cdx.json': validBom }), 'abc123', sourceManifest)).toBe('commit-mismatch');
  expect(validateExtractedSourceArchive(extractedArchive({ ...baseArchive, 'sbom/abc123.cdx.json': '{}' }), 'abc123', sourceManifest)).toBe('invalid-sbom');
  expect(validateExtractedSourceArchive(extractedArchive({ ...withoutBom, 'swbom/abc123.cdx.json': validBom }), 'abc123', sourceManifest)).toBe('missing-sbom');
});

it('AC-42 pins the complete GPL text and bundled attribution document', () => {
  const root = extractedArchive(baseArchive);
  expect(validateReleaseNotices(root,
    'aaf135472f81c5b4a0dca9367e5bb5e9750032b5bebe5442b36e4c0a47430df3',
    '259a762030cf0ff1de48236116b203bf135f2b3aa195ba3f6a940db02c87b08a')).toBe(true);
  const truncated = extractedArchive({ ...baseArchive, LICENSE: 'GNU GENERAL PUBLIC LICENSE\nVersion 2, June 1991\nEND OF TERMS AND CONDITIONS' });
  expect(validateReleaseNotices(truncated,
    'aaf135472f81c5b4a0dca9367e5bb5e9750032b5bebe5442b36e4c0a47430df3',
    '259a762030cf0ff1de48236116b203bf135f2b3aa195ba3f6a940db02c87b08a')).toBe(false);
});

it('AC-30 strict driver rejects the empty-roster and empty-actions hostile control', async () => {
  const primary = (await import('./oracle-scenarios.js')).acOracleScenarios.find(({ id }) => id === 'AC-30-T01')!;
  const driver = new ScriptedObservationDriver(new Map([[primary.id, { request: primary.request, observation: primary.conformingObservation }]]));
  await expect(driver.execute(primary.id, { setup: { phase: 'waiting', players: [], observers: [], leavingPlayerId: 'p2' }, actions: [] })).rejects.toThrow('Unexpected setup or ordered actions');
});
