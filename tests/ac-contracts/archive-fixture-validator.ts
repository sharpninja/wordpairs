import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function listFiles(root: string, current = root): string[] {
  return readdirSync(current).flatMap((name) => {
    const absolute = join(current, name);
    return statSync(absolute).isDirectory() ? listFiles(root, absolute) : [relative(root, absolute).replaceAll('\\', '/')];
  }).sort();
}

export type ArchiveDecision =
  | 'accepted'
  | 'empty-archive'
  | 'missing-license'
  | 'missing-notices'
  | 'incomplete-source'
  | 'missing-sbom'
  | 'commit-mismatch'
  | 'invalid-sbom';

export function validateExtractedSourceArchive(root: string, requiredCommit: string, sourceManifest: string[]): ArchiveDecision {
  const entries = listFiles(root);
  if (entries.length === 0) return 'empty-archive';
  if (!entries.includes('LICENSE')) return 'missing-license';
  if (!entries.includes('docs/ATTRIBUTIONS.md')) return 'missing-notices';
  if (sourceManifest.some((path) => !entries.includes(path))) return 'incomplete-source';
  const expectedPath = `sbom/${requiredCommit}.cdx.json`;
  if (!entries.includes(expectedPath)) {
    return entries.some((path) => /^sbom\/.+\.cdx\.json$/.test(path)) ? 'commit-mismatch' : 'missing-sbom';
  }
  try {
    const parsed = JSON.parse(readFileSync(join(root, expectedPath), 'utf8')) as Record<string, unknown>;
    const component = (parsed.metadata as { component?: Record<string, unknown> } | undefined)?.component;
    if (parsed.bomFormat !== 'CycloneDX' || parsed.specVersion !== '1.6' || parsed.version !== 1
      || component?.type !== 'application' || component?.name !== 'wordpairs' || component?.version !== requiredCommit) {
      return 'invalid-sbom';
    }
  } catch {
    return 'invalid-sbom';
  }
  return 'accepted';
}

export function validateReleaseNotices(root: string, expectedLicenseSha: string, expectedNoticeSha: string): boolean {
  const license = join(root, 'LICENSE');
  const notices = join(root, 'docs/ATTRIBUTIONS.md');
  if (!existsSync(license) || !existsSync(notices)) return false;
  return sha256(readFileSync(license)) === expectedLicenseSha && sha256(readFileSync(notices)) === expectedNoticeSha;
}
