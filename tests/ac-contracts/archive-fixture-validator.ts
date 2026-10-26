import { JsonStrictValidator } from '@cyclonedx/cyclonedx-library/Validation';
import { Version } from '@cyclonedx/cyclonedx-library/Spec';
import { createHash } from 'node:crypto';
import { ZipFile } from 'yazl';
import { fromBuffer } from 'yauzl';

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export type ContentManifest = Readonly<Record<string, string>>;

export async function createZipArchive(files: Readonly<Record<string, string | Buffer>>): Promise<Buffer> {
  const archive = new ZipFile();
  for (const [path, content] of Object.entries(files)) archive.addBuffer(Buffer.from(content), path);
  archive.end();
  const chunks: Buffer[] = [];
  for await (const chunk of archive.outputStream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function inspectZipArchive(archive: Buffer): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    fromBuffer(archive, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(error ?? new Error('ZIP could not be opened'));
      const entries = new Map<string, Buffer>();
      zip.on('error', reject);
      zip.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) return zip.readEntry();
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return reject(streamError ?? new Error('ZIP entry could not be read'));
          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          stream.on('error', reject);
          stream.on('end', () => {
            entries.set(entry.fileName, Buffer.concat(chunks));
            zip.readEntry();
          });
        });
      });
      zip.on('end', () => resolve(entries));
      zip.readEntry();
    });
  });
}

export type ArchiveDecision = 'accepted' | 'truncated-archive' | 'empty-archive' | 'missing-license'
  | 'missing-notices' | 'incomplete-source' | 'altered-source' | 'missing-sbom' | 'commit-mismatch' | 'invalid-sbom';

const cycloneDx16 = new JsonStrictValidator(Version.v1dot6);

export async function validateSourceArchiveZip(
  archive: Buffer,
  requiredCommit: string,
  sourceManifest: ContentManifest,
): Promise<ArchiveDecision> {
  let entries: Map<string, Buffer>;
  try {
    entries = await inspectZipArchive(archive);
  } catch {
    return 'truncated-archive';
  }
  if (entries.size === 0) return 'empty-archive';
  if (!entries.has('LICENSE')) return 'missing-license';
  if (!entries.has('docs/ATTRIBUTIONS.md')) return 'missing-notices';
  if (Object.keys(sourceManifest).length === 0) return 'incomplete-source';
  for (const [path, expectedHash] of Object.entries(sourceManifest)) {
    const content = entries.get(path);
    if (!content) return 'incomplete-source';
    if (sha256(content) !== expectedHash) return 'altered-source';
  }
  const expectedPath = `sbom/${requiredCommit}.cdx.json`;
  const report = entries.get(expectedPath);
  if (!report) {
    return [...entries.keys()].some((path) => /^sbom\/.+\.cdx\.json$/.test(path)) ? 'commit-mismatch' : 'missing-sbom';
  }
  const validationError = await cycloneDx16.validate(report.toString('utf8'));
  if (validationError !== null) return 'invalid-sbom';
  const parsed = JSON.parse(report.toString('utf8')) as { metadata?: { component?: { version?: string } } };
  return parsed.metadata?.component?.version === requiredCommit ? 'accepted' : 'commit-mismatch';
}

export type ReleaseNoticeExpectation = {
  licenseSha256: string;
  attributionSha256: string;
  assetPath: string;
  assetSha256: string;
  requiredAssetText: readonly string[];
};

export async function validateReleaseNoticesZip(archive: Buffer, expected: ReleaseNoticeExpectation): Promise<boolean> {
  let entries: Map<string, Buffer>;
  try {
    entries = await inspectZipArchive(archive);
  } catch {
    return false;
  }
  const license = entries.get('LICENSE');
  const attributions = entries.get('docs/ATTRIBUTIONS.md');
  const asset = entries.get(expected.assetPath);
  if (!license || !attributions || !asset) return false;
  const assetText = asset.toString('utf8');
  return sha256(license) === expected.licenseSha256
    && sha256(attributions) === expected.attributionSha256
    && sha256(asset) === expected.assetSha256
    && expected.requiredAssetText.every((text) => assetText.includes(text));
}
