import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createZipArchive, sha256, validateReleaseNoticesZip, validateSourceArchiveZip } from './archive-fixture-validator.js';
import { supplementalContractExpectations } from './oracle-supplemental-contracts.js';
import { supplementalScenarios } from './oracle-supplemental-scenarios.js';
import { ScriptedObservationDriver } from './oracle-scenarios.js';

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

const EXPECTED_COMMIT = '9c759e87adad4ff92d600da2ccac9315f0ada0d8';
const validBom = JSON.stringify({
  bomFormat: 'CycloneDX', specVersion: '1.6', serialNumber: 'urn:uuid:550e8400-e29b-41d4-a716-446655440000', version: 1,
  metadata: { component: { type: 'application', name: 'wordpairs', version: EXPECTED_COMMIT } },
  components: [],
});
const preparedSourcePaths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean).sort();
const preparedSource = Object.fromEntries(preparedSourcePaths.map((path) => [path, readFileSync(resolve(process.cwd(), path))]));
const sourceManifest = Object.fromEntries(preparedSourcePaths.map((path) => [path, sha256(readFileSync(resolve(process.cwd(), path)))]));
const baseArchive: Record<string, string | Buffer> = { ...preparedSource, [`sbom/${EXPECTED_COMMIT}.cdx.json`]: validBom };

async function roundTripTemporaryArchive(files: Record<string, string | Buffer>): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), 'wordpairs-archive-'));
  const archivePath = join(directory, 'candidate.zip');
  try {
    await writeFile(archivePath, await createZipArchive(files));
    return await readFile(archivePath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

it('AC-41 creates and inspects ZIP archives using the official pinned CycloneDX 1.6 validator', async () => {
  expect(preparedSourcePaths.length).toBeGreaterThan(0);
  expect(await validateSourceArchiveZip(await roundTripTemporaryArchive(baseArchive), EXPECTED_COMMIT, sourceManifest)).toBe('accepted');
  expect(await validateSourceArchiveZip(await roundTripTemporaryArchive(baseArchive), EXPECTED_COMMIT, {})).toBe('incomplete-source');
  expect(await validateSourceArchiveZip(await createZipArchive({}), EXPECTED_COMMIT, sourceManifest)).toBe('empty-archive');
  const { LICENSE: _license, ...withoutLicense } = baseArchive;
  expect(await validateSourceArchiveZip(await createZipArchive(withoutLicense), EXPECTED_COMMIT, sourceManifest)).toBe('missing-license');
  const { ['docs/ATTRIBUTIONS.md']: _notices, ...withoutNotices } = baseArchive;
  expect(await validateSourceArchiveZip(await createZipArchive(withoutNotices), EXPECTED_COMMIT, sourceManifest)).toBe('missing-notices');
  const sourceToRemove = preparedSourcePaths.find((path) => !['LICENSE', 'docs/ATTRIBUTIONS.md'].includes(path))!;
  const withoutSource = { ...baseArchive };
  delete withoutSource[sourceToRemove];
  expect(await validateSourceArchiveZip(await createZipArchive(withoutSource), EXPECTED_COMMIT, sourceManifest)).toBe('incomplete-source');
  expect(await validateSourceArchiveZip(await createZipArchive({ ...baseArchive, [sourceToRemove]: Buffer.alloc(0) }), EXPECTED_COMMIT, sourceManifest)).toBe('altered-source');
  const withoutBom = { ...baseArchive };
  delete withoutBom[`sbom/${EXPECTED_COMMIT}.cdx.json`];
  expect(await validateSourceArchiveZip(await createZipArchive(withoutBom), EXPECTED_COMMIT, sourceManifest)).toBe('missing-sbom');
  expect(await validateSourceArchiveZip(await createZipArchive({ ...withoutBom, 'sbom/def456.cdx.json': validBom }), EXPECTED_COMMIT, sourceManifest)).toBe('commit-mismatch');
  expect(await validateSourceArchiveZip(await createZipArchive({ ...withoutBom, [`swbom/${EXPECTED_COMMIT}.cdx.json`]: validBom }), EXPECTED_COMMIT, sourceManifest)).toBe('missing-sbom');
  expect(await validateSourceArchiveZip((await createZipArchive(baseArchive)).subarray(0, 32), EXPECTED_COMMIT, sourceManifest)).toBe('truncated-archive');
  const malformed = [
    { ...JSON.parse(validBom), components: 'not-an-array' },
    { ...JSON.parse(validBom), serialNumber: 'not-a-uuid' },
    { ...JSON.parse(validBom), unexpectedField: true },
  ];
  for (const bom of malformed) {
    expect(await validateSourceArchiveZip(await createZipArchive({ ...baseArchive, [`sbom/${EXPECTED_COMMIT}.cdx.json`]: JSON.stringify(bom) }), EXPECTED_COMMIT, sourceManifest)).toBe('invalid-sbom');
  }
  const wrongMetadata = { ...JSON.parse(validBom), metadata: { component: { type: 'application', name: 'wordpairs', version: 'wrong' } } };
  expect(await validateSourceArchiveZip(await createZipArchive({ ...baseArchive, [`sbom/${EXPECTED_COMMIT}.cdx.json`]: JSON.stringify(wrongMetadata) }), EXPECTED_COMMIT, sourceManifest)).toBe('commit-mismatch');
});

it('AC-42 validates complete GPL and the actual Recursive-bearing SVG notice', async () => {
  const expected = {
    licenseSha256: 'aaf135472f81c5b4a0dca9367e5bb5e9750032b5bebe5442b36e4c0a47430df3',
    // Reviewed inventory now also includes the MIT-licensed pg/@types/pg 8.23.1 rows.
    attributionSha256: 'f6570d3556eb7b4806b8e9199c1094104da55704616b6abb5494cf0a9f420450',
    assetPath: 'docs/word_association_round_flow.svg',
    assetSha256: 'da03873d53e31a9e7d84d772cab14bbfcd47bfdf0c285580a468dc39822c2bb0',
    requiredAssetText: ['Copyright 2019 The Recursive Project Authors', 'SIL OPEN FONT LICENSE Version 1.1', 'PERMISSION &amp; CONDITIONS', 'TERMINATION'],
  } as const;
  expect(await validateReleaseNoticesZip(await createZipArchive(baseArchive), expected)).toBe(true);
  expect(await validateReleaseNoticesZip(await createZipArchive({ ...baseArchive, LICENSE: 'GNU GENERAL PUBLIC LICENSE\nVersion 2, June 1991' }), expected)).toBe(false);
  expect(await validateReleaseNoticesZip(await createZipArchive({ ...baseArchive, 'docs/ATTRIBUTIONS.md': 'Recursive font — OFL-1.1' }), expected)).toBe(false);
  const { ['docs/word_association_round_flow.svg']: _asset, ...withoutAsset } = baseArchive;
  expect(await validateReleaseNoticesZip(await createZipArchive(withoutAsset), expected)).toBe(false);
  const assetText = baseArchive['docs/word_association_round_flow.svg'].toString();
  for (const removed of ['Copyright 2019 The Recursive Project Authors', 'SIL OPEN FONT LICENSE Version 1.1', 'PERMISSION &amp; CONDITIONS', 'TERMINATION']) {
    expect(await validateReleaseNoticesZip(await createZipArchive({ ...baseArchive, 'docs/word_association_round_flow.svg': assetText.replace(removed, '') }), expected)).toBe(false);
  }
  expect(await validateReleaseNoticesZip(await createZipArchive({ ...baseArchive, 'docs/word_association_round_flow.svg': assetText.slice(0, assetText.indexOf('TERMINATION')) }), expected)).toBe(false);
});

it('AC-30 strict driver rejects the empty-roster and empty-actions hostile control', async () => {
  const primary = (await import('./oracle-scenarios.js')).acOracleScenarios.find(({ id }) => id === 'AC-30-T01')!;
  const driver = new ScriptedObservationDriver(new Map([[primary.id, { request: primary.request, observation: primary.conformingObservation }]]));
  await expect(driver.execute(primary.id, { setup: { phase: 'waiting', players: [], observers: [], leavingPlayerId: 'p2' }, actions: [] })).rejects.toThrow('Unexpected setup or ordered actions');
});
