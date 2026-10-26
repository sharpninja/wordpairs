import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { executeCommand } from "../../src/application/command";
import type { Command, Transition } from "../../src/application/ports";
import { failure, success } from "../../src/domain/result";
import { SupabasePostgresStore } from "../../src/infrastructure/supabase-postgres";

const connectionString = process.env.WORDPAIRS_TEST_DATABASE_URL;
if (!connectionString || new URL(connectionString).hostname !== "127.0.0.1")
  throw new Error(
    "Run tests/integration/run-phase1.ps1 with its disposable local database",
  );
const admin = new Pool({ connectionString, ssl: false });
const pool = new Pool({
  connectionString,
  ssl: false,
  options: "-c role=service_role",
  max: 3,
});
type State = { id: string; version: number; count: number };
const store = new SupabasePostgresStore<State>(pool, "room");
const command: Command = {
  aggregateId: "adapter-room",
  actorId: "p1",
  commandId: "adapter-c1",
  requestDigest: "digest",
  expectedVersion: 0,
};
const transition = (state: State): Transition<State, string> => ({
  state: { ...state, version: state.version + 1, count: state.count + 1 },
  result: "changed",
  events: [
    {
      id: `adapter-event-${state.version + 1}`,
      aggregateType: "room",
      schemaVersion: 1,
      aggregateId: state.id,
      version: state.version + 1,
      type: "changed",
      audience: ["p1"],
      payload: {},
    },
  ],
  deadlines: [
    {
      id: `adapter-job-${state.version + 1}`,
      aggregateId: state.id,
      expectedVersion: state.version + 1,
      kind: "idle",
      dueAt: 30000,
    },
  ],
  audits: [
    {
      id: `adapter-audit-${state.version + 1}`,
      actorId: "p1",
      targetId: state.id,
      action: "changed",
      at: 1000,
      details: {},
    },
  ],
});

beforeAll(async () => {
  await admin.query(
    "insert into wordpairs.aggregates(kind,id,version,state) values('room',$1,0,$2::jsonb)",
    [
      command.aggregateId,
      JSON.stringify({ id: command.aggregateId, version: 0, count: 0 }),
    ],
  );
});
afterAll(async () => {
  await pool.end();
  await admin.end();
});

describe("TR-31 real server adapter on disposable PostgreSQL", () => {
  it("serializes concurrent duplicate commands before invoking the decision", async () => {
    const decide = vi.fn((state: State) => success(transition(state)));
    const ports = {
      store,
      clock: { now: () => 1000 },
      quota: { check: async () => success(undefined) },
    };
    const [first, duplicate] = await Promise.all([
      executeCommand(command, ports, decide),
      executeCommand(command, ports, decide),
    ]);
    expect(first).toEqual(success("changed"));
    expect(duplicate).toEqual(first);
    expect(decide).toHaveBeenCalledTimes(1);
    expect(
      (
        await admin.query(
          "select version from wordpairs.aggregates where id=$1",
          [command.aggregateId],
        )
      ).rows[0].version,
    ).toBe(1);
    for (const table of ["outbox_events", "deadline_jobs"])
      expect(
        (
          await admin.query(
            `select count(*)::integer as count from wordpairs.${table} where aggregate_id=$1`,
            [command.aggregateId],
          )
        ).rows[0].count,
      ).toBe(1);
    expect(
      (
        await admin.query(
          "select count(*)::integer as count from wordpairs.audit_events where target_id=$1",
          [command.aggregateId],
        )
      ).rows[0].count,
    ).toBe(1);
  });

  it("rejects digest reuse and stale competitors before another decision", async () => {
    const decide = vi.fn((state: State) => success(transition(state)));
    expect(
      await store.transact(
        { ...command, requestDigest: "different" },
        async (state) => decide(state),
      ),
    ).toEqual(failure("IDEMPOTENCY_CONFLICT"));
    expect(
      await store.transact(
        { ...command, commandId: "adapter-c2" },
        async (state) => decide(state),
      ),
    ).toEqual(failure("CONFLICT"));
    expect(decide).not.toHaveBeenCalled();
  });

  it("rolls back state, result, audit, and deadline on an outbox uniqueness fault", async () => {
    const next = { ...command, commandId: "adapter-fault", expectedVersion: 1 };
    const decide = vi.fn((state: State) => {
      const intent = transition(state);
      intent.events[0].id = "adapter-event-1";
      return success(intent);
    });
    expect(
      await executeCommand(
        next,
        {
          store,
          clock: { now: () => 1000 },
          quota: { check: async () => success(undefined) },
        },
        decide,
      ),
    ).toEqual(failure("TEMPORARY_UNAVAILABLE"));
    expect(decide).toHaveBeenCalledTimes(1);
    expect(
      (
        await admin.query(
          "select version from wordpairs.aggregates where id=$1",
          [command.aggregateId],
        )
      ).rows[0].version,
    ).toBe(1);
    expect(
      (
        await admin.query(
          "select count(*)::integer as count from wordpairs.idempotency_records where command_id=$1",
          [next.commandId],
        )
      ).rows[0].count,
    ).toBe(0);
    expect(
      (
        await admin.query(
          "select count(*)::integer as count from wordpairs.audit_events where id='adapter-audit-2'",
        )
      ).rows[0].count,
    ).toBe(0);
    expect(
      (
        await admin.query(
          "select count(*)::integer as count from wordpairs.deadline_jobs where id='adapter-job-2'",
        )
      ).rows[0].count,
    ).toBe(0);
  });
});
