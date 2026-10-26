import { describe, expect, it, vi } from "vitest";
import { failure, success } from "../../src/domain/result";
import {
  type SqlConnection,
  SupabasePostgresStore,
} from "../../src/infrastructure/supabase-postgres";

const command = {
  aggregateId: "r1",
  actorId: "p1",
  commandId: "c1",
  requestDigest: "digest",
  expectedVersion: 4,
};
const transition = {
  state: { id: "r1", version: 5 },
  result: { status: "changed" },
  events: [
    {
      id: "e1",
      aggregateType: "room" as const,
      schemaVersion: 1 as const,
      aggregateId: "r1",
      version: 5,
      type: "changed",
      audience: ["p1"],
      payload: {},
    },
  ],
  deadlines: [],
  audits: [],
};

function connection(
  snapshot: unknown,
  commit: unknown = { status: "committed", transition },
) {
  const queries: { text: string; values?: readonly unknown[] }[] = [];
  const release = vi.fn();
  const sql: SqlConnection = {
    async query(text, values) {
      queries.push({ text, values });
      if (text.includes("wordpairs_snapshot"))
        return { rows: [{ response: snapshot }] };
      if (text.includes("wordpairs_commit")) {
        if (commit instanceof Error) throw commit;
        return { rows: [{ response: commit }] };
      }
      return { rows: [] };
    },
    release,
  };
  return { queries, sql, release, pool: { connect: async () => sql } };
}

describe("Supabase Postgres transaction adapter (scripted SQL port, not DB evidence)", () => {
  it("locks the aggregate before deciding and commits state/result/outbox together", async () => {
    const h = connection({ status: "loaded", state: { id: "r1", version: 4 } });
    const decide = vi.fn(async () => success(transition));
    const store = new SupabasePostgresStore<{ id: string; version: number }>(
      h.pool,
      "room",
    );
    expect(await store.transact(command, decide)).toEqual(success(transition));
    expect(h.queries.map((query) => query.text)).toEqual([
      "begin",
      "select id from wordpairs.aggregates where kind=$1 and id=$2 for update",
      "select public.wordpairs_snapshot($1,$2,$3,$4,$5,$6) as response",
      "select public.wordpairs_commit($1,$2,$3,$4,$5,$6,$7::jsonb) as response",
      "commit",
    ]);
    expect(h.queries[3].values?.[6]).toBe(JSON.stringify(transition));
    expect(decide).toHaveBeenCalledTimes(1);
    expect(h.release).toHaveBeenCalledTimes(1);
  });

  it("replays canonical results before deciding or checking stale versions", async () => {
    const h = connection({ status: "replayed", transition });
    const decide = vi.fn(async () => failure("INTERNAL_ERROR"));
    const store = new SupabasePostgresStore<{ id: string; version: number }>(
      h.pool,
      "room",
    );
    expect(await store.transact(command, decide)).toEqual(success(transition));
    expect(decide).not.toHaveBeenCalled();
    expect(
      h.queries.some((query) => query.text.includes("wordpairs_commit")),
    ).toBe(false);
    expect(h.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back a rejected decision without issuing persistence RPC", async () => {
    const h = connection({ status: "loaded", state: { id: "r1", version: 4 } });
    const store = new SupabasePostgresStore<{ id: string; version: number }>(
      h.pool,
      "room",
    );
    expect(
      await store.transact(command, async () => failure("NOT_AUTHORIZED")),
    ).toEqual(failure("NOT_AUTHORIZED"));
    expect(h.queries.at(-1)?.text).toBe("rollback");
    expect(
      h.queries.some((query) => query.text.includes("wordpairs_commit")),
    ).toBe(false);
    expect(h.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back SQL failures after decision, redacts errors, and never retries", async () => {
    const h = connection(
      { status: "loaded", state: { id: "r1", version: 4 } },
      new Error("credential=DO-NOT-LEAK"),
    );
    const decide = vi.fn(async () => success(transition));
    const store = new SupabasePostgresStore<{ id: string; version: number }>(
      h.pool,
      "room",
    );
    expect(await store.transact(command, decide)).toEqual(
      failure("TEMPORARY_UNAVAILABLE"),
    );
    expect(decide).toHaveBeenCalledTimes(1);
    expect(h.queries.at(-1)?.text).toBe("rollback");
    expect(h.release).toHaveBeenCalledTimes(1);
  });

  it.each(["53300", "53400"])(
    "returns recoverable SERVICE_LIMIT for connection SQLSTATE %s",
    async (code) => {
      const pool = {
        connect: async (): Promise<SqlConnection> => {
          throw Object.assign(new Error("private provider detail"), { code });
        },
      };
      const decide = vi.fn(async () => success(transition));
      const store = new SupabasePostgresStore<{ id: string; version: number }>(
        pool,
        "room",
      );
      expect(await store.transact(command, decide)).toEqual(
        failure("SERVICE_LIMIT", command.commandId),
      );
      expect(decide).not.toHaveBeenCalled();
    },
  );

  it("rolls back a commit-time resource limit with the same retry command ID", async () => {
    const h = connection(
      { status: "loaded", state: { id: "r1", version: 4 } },
      Object.assign(new Error("private provider detail"), { code: "53400" }),
    );
    const store = new SupabasePostgresStore<{ id: string; version: number }>(
      h.pool,
      "room",
    );
    const decide = vi.fn(async () => success(transition));
    expect(await store.transact(command, decide)).toEqual(
      failure("SERVICE_LIMIT", command.commandId),
    );
    expect(decide).toHaveBeenCalledTimes(1);
    expect(h.queries.at(-1)?.text).toBe("rollback");
    expect(h.release).toHaveBeenCalledTimes(1);
  });
});
