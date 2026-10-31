import { expect } from "vitest";

export type ReadinessBarrier = <T>(
  players: readonly T[],
  prepare: (player: T, index: number) => Promise<void>,
  ready: (player: T, index: number) => Promise<void>,
) => Promise<void>;

export const readinessCases = [
  "delayed-last-connection", "delayed-first-connection", "fifteen-player-identity",
  "missing-page", "disconnected-page", "short-roster", "disabled-ready",
  "connection-rejection", "readiness-rejection",
] as const;
export type ReadinessCase = typeof readinessCases[number];

function signal() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

/** Independent ordered-callback oracle; no selector, clock or helper import. */
export async function assertReadinessCase(name: ReadinessCase, barrier: ReadinessBarrier) {
  const count = name === "fifteen-player-identity" ? 15 : name === "delayed-last-connection" ? 11 : 3;
  const players = Array.from({ length: count }, (_, index) => ({
    actorId: `fixture-player-${index}`, present: true, connected: true,
    rosterCount: count, readyEnabled: true,
  }));
  const failure = new Error(`Required preparation failed: ${name}`);
  const invalid = players[1];
  if (name === "missing-page") invalid.present = false;
  if (name === "disconnected-page") invalid.connected = false;
  if (name === "short-roster") invalid.rosterCount = count - 1;
  if (name === "disabled-ready") invalid.readyEnabled = false;
  const prepared = new Set<string>();
  const calls: number[] = [];
  const blocked = signal();
  const entered = signal();
  const delayed = name === "delayed-last-connection" ? count - 1 : name === "delayed-first-connection" ? 0 : -1;
  const run = barrier(players, async (player, index) => {
    expect(player).toBe(players[index]);
    if (index === delayed) { entered.resolve(); await blocked.promise; }
    if (!player.present || !player.connected || player.rosterCount !== count || !player.readyEnabled || (name === "connection-rejection" && index === 1)) throw failure;
    prepared.add(player.actorId);
  }, async (player, index) => {
    calls.push(index);
    expect(player).toBe(players[index]);
    expect(prepared.size, "No ready callback before every player's connected/full-roster/enabled preparation").toBe(count);
    expect(prepared.has(player.actorId)).toBe(true);
    if (name === "readiness-rejection" && index === 1) throw failure;
  });
  // Observe rejection immediately, including wrong providers, to avoid creating
  // an unowned asynchronous error while waiting for a deferred preparation.
  const outcome = run.then(() => ({ ok: true as const }), (error: unknown) => ({ ok: false as const, error }));
  if (delayed >= 0) {
    try {
      await Promise.race([entered.promise, outcome.then((result) => {
        if (!result.ok) throw result.error;
        throw new Error("Coordinator returned before blocked preparation");
      })]);
      expect(calls).toEqual([]);
    } finally { blocked.resolve(); }
  }
  const result = await outcome;
  if (["missing-page", "disconnected-page", "short-roster", "disabled-ready", "connection-rejection", "readiness-rejection"].includes(name)) {
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(failure);
    expect(calls).toEqual(name === "readiness-rejection" ? [0, 1] : []);
  } else {
    if (!result.ok) throw result.error;
    expect(calls).toEqual(Array.from({ length: count }, (_, index) => index));
    expect(prepared.size).toBe(count);
  }
}
