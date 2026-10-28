import { readFileSync } from "node:fs";
import { Pool } from "pg";
const [runtimePath, expectedDatabase] = process.argv.slice(2);
let pool;
try {
  const settings = JSON.parse(readFileSync(runtimePath, "utf8"));
  const url = new URL(settings.WORDPAIRS_DATABASE_URL);
  if (!/^wordpairs_ui_[a-f0-9]{32}$/.test(expectedDatabase) || url.pathname !== `/${expectedDatabase}` ||
      !["localhost", "127.0.0.1"].includes(url.hostname) || url.search)
    throw new Error("Invalid isolated connection target");
  pool = new Pool({ connectionString: settings.WORDPAIRS_DATABASE_URL, max: 1,
    connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: true, ca: settings.WORDPAIRS_DATABASE_CA } });
  const result = await pool.query("select current_database() as database, inet_server_port() as port");
  if (result.rows[0]?.database !== expectedDatabase || result.rows[0]?.port !== 5432)
    throw new Error("Isolated database identity mismatch");
  console.log("PASS: exact application URL connects to the isolated game database with verified TLS");
} catch {
  console.error("Isolated application database TLS/identity verification failed");
  process.exitCode = 1;
} finally { await pool?.end(); }
