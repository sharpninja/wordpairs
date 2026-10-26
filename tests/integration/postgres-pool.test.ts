import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { createSupabasePool } from "../../src/infrastructure/postgres-pool";

describe("server Postgres transport configuration (no network)", () => {
  it.each([
    "ssl=0",
    "ssl=false",
    "sslmode=disable",
    "sslmode=no-verify",
    "sslcert=x",
    "sslkey=x",
    "sslrootcert=x",
    "uselibpqcompat=true",
  ])("rejects URL override %s", (query) => {
    expect(() =>
      createSupabasePool(
        `postgresql://user:password@example.invalid/db?${query}`,
      ),
    ).toThrow("TLS must use the server configuration");
  });

  it("retains certificate verification in the actual driver's effective configuration", async () => {
    const pool = createSupabasePool(
      "postgresql://user:password@example.invalid/db",
    );
    try {
      const client = new Client(pool.options);
      const effective = client as unknown as {
        connectionParameters: { ssl: unknown };
      };
      expect(effective.connectionParameters.ssl).toEqual({
        rejectUnauthorized: true,
      });
      expect(pool.options.max).toBe(3);
    } finally {
      await pool.end();
    }
  });
});
