import { describe, expect, it, vi } from "vitest";
import { executeCommand } from "../../src/application/command";
import type { Command, TransactionStore } from "../../src/application/ports";
import { failure, success } from "../../src/domain/result";
import { acOracleScenarios } from "../ac-contracts/oracle-scenarios";

const event = {
  id: "event-1",
  aggregateType: "room" as const,
  schemaVersion: 1 as const,
  aggregateId: "room-1",
  version: 5,
  type: "changed",
  audience: ["player-1"],
  payload: {},
};
const command: Command = {
  aggregateId: "room-1",
  actorId: "player-1",
  commandId: "command-1",
  requestDigest: "digest-1",
  expectedVersion: 4,
};

function harness(failCommit = false) {
  const state = { id: "room-1", version: 4, count: 0 };
  const records = new Map<string, { digest: string; result: unknown }>();
  const events: unknown[] = [];
  const deadlines: unknown[] = [];
  const audits: unknown[] = [];
  let staged = 0;
  let calls = 0;
  const store: TransactionStore<typeof state> = {
    async transact(input, decide) {
      const key = `${input.aggregateId}:${input.actorId}:${input.commandId}`;
      const prior = records.get(key);
      if (prior) {
        return prior.digest === input.requestDigest
          ? (structuredClone(prior.result) as Awaited<
              ReturnType<typeof decide>
            >)
          : failure("IDEMPOTENCY_CONFLICT");
      }
      if (input.expectedVersion !== state.version) return failure("CONFLICT");
      calls++;
      const result = await decide(structuredClone(state));
      if (result.ok) {
        staged =
          result.value.events.length +
          result.value.deadlines.length +
          result.value.audits.length;
        if (failCommit) return failure("TEMPORARY_UNAVAILABLE");
        Object.assign(state, result.value.state);
        events.push(...result.value.events);
        deadlines.push(...result.value.deadlines);
        audits.push(...result.value.audits);
        records.set(key, {
          digest: input.requestDigest,
          result: structuredClone(result),
        });
      }
      return result;
    },
  };
  return {
    state,
    store,
    records,
    events,
    deadlines,
    audits,
    calls: () => calls,
    staged: () => staged,
  };
}

describe("Phase 1B command transaction boundary", () => {
  it("AC-51 stages state and outbox intent together and returns canonical retries", async () => {
    const h = harness();
    const quota = { check: vi.fn(async () => success(undefined)) };
    const decide = vi.fn((state: typeof h.state, now: number) =>
      success({
        state: { ...state, version: state.version + 1, count: state.count + 1 },
        result: { status: "changed", at: now },
        events: [
          {
            id: "event-1",
            aggregateType: "room" as const,
            schemaVersion: 1 as const,
            aggregateId: state.id,
            version: 5,
            type: "changed",
            audience: ["player-1"],
            payload: {},
          },
        ],
        deadlines: [],
        audits: [],
      }),
    );
    const ports = { store: h.store, clock: { now: () => 123 }, quota };
    const first = await executeCommand(command, ports, decide);
    expect(first).toEqual(success({ status: "changed", at: 123 }));
    expect(await executeCommand(command, ports, decide)).toEqual(first);
    expect(decide).toHaveBeenCalledTimes(1);
    expect(quota.check).toHaveBeenCalledTimes(1);
    expect(h.state).toEqual({ id: "room-1", version: 5, count: 1 });
    expect(h.events).toHaveLength(1);
  });

  it("AC-51 rejects conflicting command reuse and stale versions without decisions", async () => {
    const h = harness();
    const decide = vi.fn((state: typeof h.state) =>
      success({
        state: { ...state, version: 5 },
        result: "done",
        events: [event],
        deadlines: [],
        audits: [],
      }),
    );
    const ports = {
      store: h.store,
      clock: { now: () => 123 },
      quota: { check: async () => success(undefined) },
    };
    await executeCommand(command, ports, decide);
    expect(
      await executeCommand(
        { ...command, requestDigest: "different" },
        ports,
        decide,
      ),
    ).toEqual(failure("IDEMPOTENCY_CONFLICT"));
    expect(
      await executeCommand(
        { ...command, commandId: "command-2" },
        ports,
        decide,
      ),
    ).toEqual(failure("CONFLICT"));
    expect(decide).toHaveBeenCalledTimes(1);
  });

  it("AC-37 leaves committed state untouched on quota rejection and permits the same command on recovery", async () => {
    const h = harness();
    let limited = true;
    const quota = {
      check: vi.fn(async () =>
        limited ? failure("SERVICE_LIMIT") : success(undefined),
      ),
    };
    const decide = vi.fn((state: typeof h.state) =>
      success({
        state: { ...state, version: 5 },
        result: "done",
        events: [event],
        deadlines: [],
        audits: [],
      }),
    );
    const ports = { store: h.store, clock: { now: () => 123 }, quota };
    expect(await executeCommand(command, ports, decide)).toEqual(
      failure("SERVICE_LIMIT", command.commandId),
    );
    expect(h.state.version).toBe(4);
    expect(h.events).toEqual([]);
    expect(h.records.size).toBe(0);
    expect(decide).not.toHaveBeenCalled();
    limited = false;
    expect(await executeCommand(command, ports, decide)).toEqual(
      success("done"),
    );
  });

  it("AC-51 rolls back rejected decisions without state, records, or events", async () => {
    const h = harness();
    const result = await executeCommand(
      command,
      {
        store: h.store,
        clock: { now: () => 123 },
        quota: { check: async () => success(undefined) },
      },
      () => failure("NOT_AUTHORIZED"),
    );
    expect(result).toEqual(failure("NOT_AUTHORIZED"));
    expect(h.state.version).toBe(4);
    expect(h.records.size).toBe(0);
    expect(h.events).toEqual([]);
  });

  it("rejects invalid metadata before touching a repository", async () => {
    const h = harness();
    const result = await executeCommand(
      { ...command, commandId: "" },
      {
        store: h.store,
        clock: { now: () => 0 },
        quota: { check: async () => success(undefined) },
      },
      () => failure("INTERNAL_ERROR"),
    );
    expect(result).toEqual(failure("VALIDATION_ERROR"));
    expect(h.calls()).toBe(0);
  });

  it("runs the unchanged AC-37-T01 oracle against actual command/quota observations", async () => {
    const h = harness();
    const providerCalls: string[] = [];
    const attempted = { ...command, commandId: "cmd-1" };
    const outcome = await executeCommand(
      attempted,
      {
        store: h.store,
        clock: { now: () => 0 },
        quota: {
          check: async () => {
            providerCalls.push("free-tier");
            return failure("SERVICE_LIMIT");
          },
        },
      },
      () => {
        throw new Error("decision must not run");
      },
    );
    const scenario = acOracleScenarios.find(
      (entry) => entry.id === "AC-37-T01",
    );
    expect(scenario).toBeDefined();
    scenario?.assertObservation({
      result: outcome.ok
        ? { code: "unexpected-success" }
        : { ...outcome.error },
      stateAfter: { version: h.state.version },
      providerCalls,
      paidFallbackCalls: providerCalls.filter(
        (provider) => provider !== "free-tier",
      ).length,
    });
  });

  it("runs unchanged AC-51-T03/T04 oracles against actual replay/rollback orchestration", async () => {
    const h = harness();
    let decisions = 0;
    const ports = {
      store: h.store,
      clock: { now: () => 0 },
      quota: { check: async () => success(undefined) },
    };
    const decide = (state: typeof h.state) => {
      decisions++;
      return success({
        state: { ...state, version: 5 },
        result: { status: "joined", roomId: "r1" },
        events: [
          {
            id: "e1",
            aggregateType: "room" as const,
            schemaVersion: 1 as const,
            aggregateId: state.id,
            version: 5,
            type: "changed",
            audience: ["player-1"],
            payload: {},
          },
        ],
        deadlines: [],
        audits: [],
      });
    };
    const first = await executeCommand(command, ports, decide);
    const retry = await executeCommand(command, ports, decide);
    if (!first.ok || !retry.ok)
      throw new Error("expected successful synthetic decisions");
    acOracleScenarios
      .find((entry) => entry.id === "AC-51-T03")
      ?.assertObservation({
        results: [first.value, retry.value],
        domainSideEffectCalls: decisions,
        databaseUniquenessClaimed: false,
      });

    const rejected = harness(true);
    expect(
      await executeCommand(
        command,
        { ...ports, store: rejected.store },
        decide,
      ),
    ).toEqual(failure("TEMPORARY_UNAVAILABLE"));
    acOracleScenarios
      .find((entry) => entry.id === "AC-51-T04")
      ?.assertObservation({
        committed: {
          domainMutations: h.state.version - 4,
          outboxIntents: h.events.length,
        },
        rolledBack: {
          domainMutations: rejected.state.version - 4,
          outboxIntents: rejected.events.length,
        },
        databaseAtomicityClaimed: false,
      });
  });

  it.each(["CONFLICT", "ROOM_FULL"] as const)(
    "propagates repository %s without invoking a decision",
    async (code) => {
      const decide = vi.fn(() => failure("INTERNAL_ERROR"));
      const store: TransactionStore<{ id: string; version: number }> = {
        transact: async () => failure(code),
      };
      expect(
        await executeCommand(
          command,
          {
            store,
            clock: { now: () => 0 },
            quota: { check: async () => success(undefined) },
          },
          decide,
        ),
      ).toEqual(failure(code));
      expect(decide).not.toHaveBeenCalled();
    },
  );

  it("discards a valid transition if the repository fails commit and never retries the decision", async () => {
    const decide = vi.fn((state: { id: string; version: number }) =>
      success({
        state: { ...state, version: 5 },
        result: "changed",
        events: [event],
        deadlines: [
          {
            id: "job-1",
            aggregateId: state.id,
            expectedVersion: 5,
            kind: "idle" as const,
            dueAt: 30000,
          },
        ],
        audits: [
          {
            id: "audit-1",
            actorId: command.actorId,
            targetId: state.id,
            action: "changed",
            at: 0,
            details: {},
          },
        ],
      }),
    );
    const h = harness(true);
    expect(
      await executeCommand(
        command,
        {
          store: h.store,
          clock: { now: () => 0 },
          quota: { check: async () => success(undefined) },
        },
        decide,
      ),
    ).toEqual(failure("TEMPORARY_UNAVAILABLE"));
    expect(decide).toHaveBeenCalledTimes(1);
    expect(h.staged()).toBe(3);
    expect(h.state.version).toBe(4);
    expect(h.events).toEqual([]);
    expect(h.deadlines).toEqual([]);
    expect(h.audits).toEqual([]);
    expect(h.records.size).toBe(0);
  });

  it.each(
    [
      [],
      [event, event],
      [{ ...event, version: 9 }],
      [{ ...event, schemaVersion: 2 }],
    ].map((events) => ({ events })),
  )(
    "rejects invalid event intent before persistence: %j",
    async ({ events }) => {
      const h = harness();
      const outcome = await executeCommand(
        command,
        {
          store: h.store,
          clock: { now: () => 0 },
          quota: { check: async () => success(undefined) },
        },
        (state) =>
          success({
            state: { ...state, version: 5 },
            result: "changed",
            events: events as (typeof event)[],
            deadlines: [],
            audits: [],
          }),
      );
      expect(outcome).toEqual(failure("INTERNAL_ERROR"));
      expect(h.state.version).toBe(4);
      expect(h.events).toEqual([]);
      expect(h.records.size).toBe(0);
    },
  );
});
