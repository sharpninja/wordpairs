import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { JsonStrictValidator } from '@cyclonedx/cyclonedx-library/Validation';
import { Version } from '@cyclonedx/cyclonedx-library/Spec';

// Explicit allowlist: never serialize process.env or credentials into build output.
const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const sha = args.get('--sha') ?? process.env.VERCEL_GIT_COMMIT_SHA;
const branch = args.get('--branch') ?? process.env.VERCEL_GIT_COMMIT_REF;
const target = args.get('--target') ?? process.env.VERCEL_ENV;
const host = args.get('--url') ?? process.env.VERCEL_URL;
if (!/^[a-f0-9]{40}$/.test(sha ?? '') || !branch || !['preview', 'production'].includes(target) || !host) throw new Error('Missing or invalid deployment metadata');
const url = new URL(host.includes('://') ? host : `https://${host}`);
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || !url.hostname.endsWith('.vercel.app')) throw new Error('Unsafe deployment URL');
const lockBytes = await readFile(args.get('--lockfile') ?? 'package-lock.json');
const lock = JSON.parse(lockBytes);
if (lock.lockfileVersion !== 3 || !lock.packages?.['']) throw new Error('An npm v3 lockfile is required');
const packages = lock.packages;
const root = packages[''];
const paths = Object.keys(packages).filter(p => p && packages[p].version && !packages[p].link).sort();
function name(path) { return packages[path].name ?? path.split('node_modules/').at(-1); }
function resolveDependency(path, dependency) {
  let directory = path;
  while (true) {
    const candidate = `${directory ? `${directory}/` : ''}node_modules/${dependency}`;
    if (paths.includes(candidate)) return candidate;
    if (!directory) return null; // Optional/platform packages may be absent.
    const at = directory.lastIndexOf('/node_modules/');
    directory = at < 0 ? '' : directory.slice(0, at);
  }
}
const components = paths.map(path => {
  const pkg = packages[path];
  const component = { type: 'library', 'bom-ref': path, name: name(path), version: pkg.version,
    purl: `pkg:npm/${name(path).replace('@', '%40')}@${encodeURIComponent(pkg.version)}`,
    scope: pkg.dev ? 'optional' : 'required',
    properties: [{ name: 'wordpairs:development', value: String(Boolean(pkg.dev)) }, { name: 'wordpairs:optional', value: String(Boolean(pkg.optional)) }] };
  if (typeof pkg.license === 'string') component.licenses = [{ expression: pkg.license }];
  return component;
});
const dependencies = ['', ...paths].map(path => ({ ref: path || 'wordpairs', dependsOn: [...new Set(Object.keys({ ...packages[path].dependencies, ...packages[path].optionalDependencies, ...packages[path].peerDependencies, ...(path ? {} : packages[path].devDependencies) }).map(dep => resolveDependency(path, dep)).filter(Boolean))].sort() }));
const bom = { bomFormat: 'CycloneDX', specVersion: '1.6', version: 1,
  metadata: { timestamp: new Date().toISOString(), component: { type: 'application', 'bom-ref': 'wordpairs', name: root.name, version: sha, licenses: [{ expression: root.license ?? 'GPL-2.0-only' }] },
    tools: { components: [{ type: 'application', name: 'wordpairs-lockfile-inventory', version: '1.0.0' }] },
    properties: [{ name: 'wordpairs:commit', value: sha }, { name: 'wordpairs:branch', value: branch }, { name: 'wordpairs:target', value: target }, { name: 'wordpairs:deployment', value: url.origin }, { name: 'wordpairs:lockfile-sha256', value: createHash('sha256').update(lockBytes).digest('hex') }] }, components, dependencies };
const json = JSON.stringify(bom, null, 2);
const errors = await new JsonStrictValidator(Version.v1dot6).validate(json);
if (errors !== null) throw new Error('CycloneDX 1.6 validation failed');
const output = args.get('--output') ?? `public/sbom/${sha}.cdx.json`;
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${json}\n`);
console.log(`Validated CycloneDX 1.6: ${components.length} components`);
