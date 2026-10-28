// Repeatable fallback for environments where the Supabase MCP migration surface
// is unavailable. Prefer apply_migration when connected. Never logs credentials.
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const targets = { staging: { ref: 'jshjkaigwbxsbnnogfxs', vercel: 'wordpairs', origin: 'https://wordpairs.vercel.app' }, production: { ref: 'krdcuuhcynmdfcjlpbsf', vercel: 'wordpairs-j9jf', origin: 'https://wordpairs-j9jf.vercel.app' } };
const target = targets[args.get('--environment')];
const mode = args.get('--mode') ?? 'plan';
if (!target || !['plan', 'status', 'apply'].includes(mode)) throw new Error('Use --environment staging|production --mode plan|status|apply');
const root = resolve(import.meta.dirname, '..');
const migrations = [];
for (const file of (await readdir(`${root}/src/infrastructure/migrations`)).filter(f => /^\d{3}_[a-z_]+\.sql$/.test(f)).sort()) {
  const query = await readFile(`${root}/src/infrastructure/migrations/${file}`, 'utf8');
  migrations.push({ version: `20261027000${file.slice(0, 3)}`, name: `wordpairs_${file.slice(0, -4)}`, query });
}
for (const [version, name, file] of [['20261027000101', 'wordpairs_hosted_scheduler', 'src/infrastructure/hosting/001_scheduler.sql'], ['20261027000102', 'wordpairs_private_realtime', 'src/infrastructure/hosting/002_realtime_policy.sql']]) {
  migrations.push({ version, name, query: await readFile(`${root}/${file}`, 'utf8') });
}
const summary = m => ({ version: m.version, name: m.name, sha256: createHash('sha256').update(m.query).digest('hex') });
const body = sql => sql.replace(/\r\n/g, '\n').trim().replace(/^((?:--[^\n]*\n\s*)*)begin;\s*/i, '$1').replace(/\s*commit;$/i, '').trim();
function validateHistory(rows) {
  // MCP versions are generated timestamps, so compare ordered names and source
  // hashes rather than assuming the fallback runner's proposed version numbers.
  const sorted = [...rows].sort((a, b) => a.version.localeCompare(b.version));
  if (sorted.length > migrations.length) throw new Error('Unknown migration history');
  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i], migration = migrations[i];
    if (row.name !== migration.name || row.statements?.length !== 1 || body(row.statements[0]) !== body(migration.query)) throw new Error(`Migration source/order drift at ${migration.name}`);
  }
  return migrations.slice(sorted.length);
}
if (mode === 'plan') {
  const pending = args.has('--history') ? validateHistory(JSON.parse(await readFile(args.get('--history'), 'utf8'))) : migrations;
  console.log(JSON.stringify({ environment: args.get('--environment'), ...target, migrations: pending.map(summary), publicMapping: { SUPABASE_URL: 'WORDPAIRS_SUPABASE_URL', SUPABASE_ANON_KEY: 'WORDPAIRS_SUPABASE_ANON_KEY' }, serverOnlyFallbacks: ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET'], requiredPrivateSettings: ['WORDPAIRS_DATABASE_URL', 'WORDPAIRS_INVITE_SECRET', 'WORDPAIRS_SCHEDULER_SECRET', 'WORDPAIRS_ORIGIN'], next: 'Inspect schema/history; use supported Supabase apply_migration in this order, removing outer transaction wrappers and spacing timestamp-generated writes. status/apply fallback requires private --config and exact --confirm-project, using session port5432.' }, null, 2));
} else {
  const configPath = args.get('--config');
  if (!configPath || args.get('--confirm-project') !== target.ref) throw new Error('Private --config and exact --confirm-project are required');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const url = new URL(config.ADMIN_DATABASE_URL);
  if (url.username !== `postgres.${target.ref}` || !/^aws-\d+-us-east-1\.pooler\.supabase\.com$/.test(url.hostname) || url.port !== '5432' || url.pathname !== '/postgres' || url.search) throw new Error('Admin session connection must match the allowlisted target, port5432, and have no URL overrides');
  const client = new pg.Client({ connectionString: url.href, ssl: { rejectUnauthorized: true, ...(config.DATABASE_CA ? { ca: config.DATABASE_CA } : {}) }, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query("set statement_timeout='10000ms'");
    if (!(await client.query('select pg_try_advisory_lock(170027,2) as acquired')).rows[0].acquired) throw new Error('Another schema operation holds the lock');
    await client.query("set statement_timeout='60000ms'");
    const history = await client.query('select version,name,statements from supabase_migrations.schema_migrations order by version');
    const pending = validateHistory(history.rows);
    console.log(JSON.stringify({ mode, project: target.ref, applied: history.rows.map(r => ({ version: r.version, name: r.name })), pending: pending.map(summary) }));
    if (mode === 'apply') {
      for (const migration of pending) {
        const sql = body(migration.query);
        await client.query('begin');
        try {
          await client.query(sql);
          // Generated versions must follow any existing MCP timestamp versions.
          const version = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}${String(migrations.indexOf(migration)).padStart(3, '0')}`;
          await client.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)', [version, migration.name, [migration.query]]);
          await client.query('commit');
          console.log(JSON.stringify({ applied: summary(migration) }));
        } catch { await client.query('rollback'); throw new Error(`Migration failed: ${migration.name}; transaction rolled back`); }
      }
    }
  } catch (error) {
    // pg errors may include connection context; emit no driver/config objects.
    console.error(`Hosting schema ${mode} failed (${typeof error.code === 'string' ? error.code : 'preflight-or-migration'}); inspect private diagnostics`);
    process.exitCode = 1;
  } finally { await client.end(); }
}
