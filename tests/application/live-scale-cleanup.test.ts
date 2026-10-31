import { describe, expect, it } from "vitest";
import { fixtureProvider, type CleanupActor, type CleanupCommand, type CleanupProvider, type CleanupResponse } from "./live-scale-cleanup-fixture";

const productionPath = "../browser/owned-room-cleanup";
const cleanup: CleanupProvider = process.env.WORDPAIRS_CLEANUP_FIXTURE
  ? fixtureProvider(process.env.WORDPAIRS_CLEANUP_FIXTURE)
  : (await import(productionPath)).cleanupOwnedRoom;
const member = (id = "p1", version = 1): CleanupResponse => ({ status: 200, body: { actorId: id, role: "player", status: "waiting", version } });
const absent = (id = "p1"): CleanupResponse => ({ status: 200, body: { actorId: id, role: null, status: "waiting", version: 2 } });
function actor(reads: CleanupResponse[], leaves: (CleanupResponse | Error)[] = [], profileId = "p1") {
  let readIndex = 0;
  let leaveIndex = 0;
  const commands: CleanupCommand[] = [];
  const transport: CleanupActor = {
    profileId,
    read: async () => reads[Math.min(readIndex++, reads.length - 1)],
    leave: async command => {
      commands.push({ ...command });
      const response = leaves[Math.min(leaveIndex++, leaves.length - 1)] ?? { status: 200 };
      if (response instanceof Error) throw response;
      return response;
    },
  };
  return { transport, commands, reads: () => readIndex };
}
const ids = () => { let serial = 0; return () => `cleanup-${++serial}`; };
describe("TEST-ROOMSYNC-139 LIVE-07: truthful bounded cleanup", () => {
  it("confirms absence after a successful leave instead of trusting the write response", async () => {
    const probe = actor([member(), absent()]);
    expect(await cleanup([probe.transport], ids())).toEqual({ cleanupFailures: 0, roomClosed: false, unresolvedPlayerIndices: [] });
    expect(probe.commands).toEqual([{ expectedVersion: 1, commandId: "cleanup-1" }]);
    expect(probe.reads()).toBeGreaterThanOrEqual(2);
  });
  it("reports a membership still present after every successful leave response", async () => {
    const probe = actor([member()]);
    expect(await cleanup([probe.transport], ids())).toEqual({ cleanupFailures: 1, roomClosed: false, unresolvedPlayerIndices: [0] });
    expect(probe.commands).toHaveLength(4);
    expect(probe.reads()).toBeGreaterThanOrEqual(5);
  });
  it("reports repeated server failures and preserves the exact uncertain command", async () => {
    const probe = actor([member()], [{ status: 503 }]);
    expect(await cleanup([probe.transport], ids())).toEqual({ cleanupFailures: 1, roomClosed: false, unresolvedPlayerIndices: [0] });
    expect(probe.commands).toHaveLength(4);
    expect(probe.commands.every(command => JSON.stringify(command) === JSON.stringify(probe.commands[0]))).toBe(true);
  });
  it("retries transport uncertainty with the same command before verified absence", async () => {
    const probe = actor([member(), member(), absent()], [new Error("connection lost"), { status: 200 }]);
    expect(await cleanup([probe.transport], ids())).toEqual({ cleanupFailures: 0, roomClosed: false, unresolvedPlayerIndices: [] });
    expect(probe.commands).toEqual([{ expectedVersion: 1, commandId: "cleanup-1" }, { expectedVersion: 1, commandId: "cleanup-1" }]);
  });
  it("bounds conflicts and does not silently accept exhausted retries", async () => {
    const probe = actor([member()], [{ status: 409 }]);
    expect(await cleanup([probe.transport], ids())).toEqual({ cleanupFailures: 1, roomClosed: false, unresolvedPlayerIndices: [0] });
    expect(probe.commands).toHaveLength(4);
    expect(new Set(probe.commands.map(command => command.commandId)).size).toBe(4);
  });
  it("does not treat lost authentication or malformed reads as removed membership", async () => {
    for (const read of [{ status: 401 }, { status: 403 }, { status: 503 }, { status: 200, body: {} }]) {
      const probe = actor([read]);
      expect(await cleanup([probe.transport], ids())).toEqual({ cleanupFailures: 1, roomClosed: false, unresolvedPlayerIndices: [0] });
      expect(probe.commands).toEqual([]);
    }
  });
  it("accepts an authenticated empty membership or missing owned room without a write", async () => {
    for (const read of [absent(), { status: 404 }]) {
      const probe = actor([read]);
      expect(await cleanup([probe.transport], ids())).toEqual({ cleanupFailures: 0, roomClosed: false, unresolvedPlayerIndices: [] });
      expect(probe.commands).toEqual([]);
    }
  });
  it("preserves a completed closed room and requires the expected actor identity", async () => {
    const closed = actor([{ status: 200, body: { actorId: "p1", status: "closed", role: "player", version: 5 } }]);
    expect(await cleanup([closed.transport], ids())).toEqual({ cleanupFailures: 0, roomClosed: true, unresolvedPlayerIndices: [] });
    expect(closed.commands).toEqual([]);
    const wrongIdentity = actor([absent("other")]);
    expect(await cleanup([wrongIdentity.transport], ids())).toEqual({ cleanupFailures: 1, roomClosed: false, unresolvedPlayerIndices: [0] });
  });
  it("cleans only supplied actors in reverse order and reports exact unresolved indices", async () => {
    const first = actor([member()], [{ status: 503 }]);
    const second = actor([absent("p2")], [], "p2");
    const order: string[] = [];
    for (const probe of [first, second]) { const read = probe.transport.read; probe.transport.read = async () => { order.push(probe.transport.profileId); return read(); }; }
    expect(await cleanup([first.transport, second.transport], ids())).toEqual({ cleanupFailures: 1, roomClosed: false, unresolvedPlayerIndices: [0] });
    expect(order[0]).toBe("p2");
    expect(second.commands).toEqual([]);
  });
  it("also verifies observer departure if an owned actor's membership changed", async () => {
    const read = member();
    (read.body as { role: string }).role = "observer";
    const probe = actor([read, absent()]);
    expect(await cleanup([probe.transport], ids())).toEqual({ cleanupFailures: 0, roomClosed: false, unresolvedPlayerIndices: [] });
    expect(probe.commands).toHaveLength(1);
  });
});
