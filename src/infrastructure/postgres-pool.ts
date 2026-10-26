import { Pool } from "pg";
import type { SqlPool } from "./supabase-postgres";

/** Server composition only. Production never disables TLS certificate verification. */
export function createSupabasePool(
  connectionString: string,
  ca?: string,
): Pool & SqlPool {
  if (typeof window !== "undefined")
    throw new Error("Server persistence is unavailable in the browser");
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Invalid database configuration");
  }
  if (!(["postgres:", "postgresql:"] as string[]).includes(url.protocol))
    throw new Error("Invalid database configuration");
  // Driver URL parameters can override the explicit TLS object. Reject such overrides.
  for (const key of [
    "ssl",
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "uselibpqcompat",
  ]) {
    if (url.searchParams.has(key))
      throw new Error("TLS must use the server configuration");
  }
  const pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  });
  // Idle errors must not become uncaught exceptions or print connection secrets.
  pool.on("error", () => {});
  return pool;
}
