import { expect } from "vitest";
import type { CapturedCommand, CommitOptions } from "./ui-command-capture.contract";

export type Scope = "room" | "game";
export type AckMode = "fresh" | "matrix" | "strict";
export type AckOutcome = "waiting" | "acknowledged" | "pending";
export interface UiCommandState {
  scope: Scope;
  present: boolean;
  visible: boolean;
  denied: boolean;
  busy: string | null;
  version: string | null;
  pending: "absent" | "disabled" | "enabled";
}
export interface AckCommitOptions extends CommitOptions {
  prepare(): Promise<void>;
  validate(payload: unknown): void;
  acknowledge(result: CapturedCommand, body: unknown): Promise<"acknowledged" | "pending">;
  retired(): Promise<void>;
}
export interface OwnSolveState { actorAlias: string; rowAlias: string; round: number; solved: boolean }
export interface AckBinding {
  state(value: UiCommandState, scope: Scope, minimum: number, mode: AckMode): AckOutcome;
  commit(action: string, options: AckCommitOptions): Promise<unknown>;
  solve(value: OwnSolveState, alias: string, round: number): void;
}
export const ackCases = [
  "busy-newer", "pending-newer", "disabled-pending", "strict-pending", "unknown-pending",
  "wrong-scope", "missing", "denied", "stale", "malformed",
  "wait-for-ack", "pending-identical", "changed-command", "changed-payload", "wrong-intent",
  "probe-error", "bounded-pending", "permanent-denial", "conflict-retired", "body-error-distinct",
  "observer-error", "drain-ack-error", "own-current", "wrong-actor", "wrong-row", "wrong-round", "unsolved",
  "preexisting-blocks-action", "wait-for-preparation", "wrong-profile",
] as const;
export type AckCase = typeof ackCases[number];
const checkpoint = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export const idleState = (): UiCommandState => ({ scope: "game", present: true, visible: true, denied: false, busy: "false", version: "12", pending: "absent" });
const original = { action: "answer", expectedProfileId: "actor", commandId: "C-1", expectedVersion: 11, roundId: "round-1", stage: 0, answer: "Late" };
function result(payload: unknown = original, status = 200, body: unknown = { version: 12, correct: true }, problem?: Error): CapturedCommand {
  const request = { postDataJSON: () => payload, response: async () => null };
  return { request: () => request, status: () => status, ok: () => status === 200, json: async () => { if (problem) throw problem; return body; } };
}

/** Same requirement-derived assertions for independent controls and real helpers. */
export async function assertAckCase(name: AckCase, binding: AckBinding): Promise<void> {
  if (["busy-newer", "pending-newer", "disabled-pending", "strict-pending", "unknown-pending", "wrong-scope", "missing", "denied", "stale", "malformed"].includes(name)) {
    const state = idleState();
    if (name === "busy-newer") { state.version = "99"; state.busy = "true"; expect(binding.state(state, "game", 12, "matrix")).toBe("waiting"); state.busy = "false"; }
    if (name === "pending-newer") { state.version = "99"; state.pending = "enabled"; expect(binding.state(state, "game", 12, "matrix")).toBe("pending"); state.pending = "absent"; }
    if (name === "disabled-pending") { state.pending = "disabled"; expect(binding.state(state, "game", 12, "matrix")).toBe("waiting"); state.pending = "enabled"; state.busy = "true"; expect(binding.state(state, "game", 12, "matrix")).toBe("waiting"); state.busy = "false"; expect(binding.state(state, "game", 12, "matrix")).toBe("pending"); state.pending = "absent"; }
    if (name === "stale") { state.version = "11"; expect(binding.state(state, "game", 12, "matrix")).toBe("waiting"); state.version = "12"; }
    if (name === "strict-pending" || name === "unknown-pending") { state.pending = "enabled"; expect(() => binding.state(state, "game", 12, name === "strict-pending" ? "strict" : "fresh")).toThrow(); return; }
    if (name === "wrong-scope") state.scope = "room";
    if (name === "missing") state.present = false;
    if (name === "denied") state.denied = true;
    if (["wrong-scope", "missing", "denied"].includes(name)) { expect(() => binding.state(state, "game", 12, "matrix")).toThrow(); return; }
    if (name === "malformed") {
      for (const version of [null, "", "NaN", "-1", "12junk", "Infinity"]) expect(() => binding.state({ ...state, version }, "game", 12, "matrix")).toThrow();
      expect(() => binding.state({ ...state, busy: null }, "game", 12, "matrix")).toThrow();
      expect(() => binding.state(state, "game", Number.NaN, "matrix")).toThrow();
    }
    expect(binding.state(state, "game", 12, "matrix")).toBe("acknowledged");
    return;
  }
  if (["own-current", "wrong-actor", "wrong-row", "wrong-round", "unsolved"].includes(name)) {
    const state: OwnSolveState = { actorAlias: "Guest Alice", rowAlias: "Guest Alice", round: 2, solved: true };
    if (name === "wrong-actor") state.actorAlias = "Guest Bob";
    if (name === "wrong-row") state.rowAlias = "Guest Bob";
    if (name === "wrong-round") state.round = 1;
    if (name === "unsolved") state.solved = false;
    if (name === "own-current") binding.solve(state, "Guest Alice", 2);
    else expect(() => binding.solve(state, "Guest Alice", 2)).toThrow();
    return;
  }
  const events: string[] = [];
  const modes: boolean[] = [];
  let calls = 0;
  let acknowledged = 0;
  let bodyErrors = 0;
  let uncertain = 0;
  const failure = new Error("original acknowledgement probe error");
  const bodyFailure = new Error("original driver body error");
  const held = deferred<"acknowledged" | "pending">();
  const preparation = deferred<void>();
  const options: AckCommitOptions = {
    prepare: async () => { events.push("prepared"); if (name === "preexisting-blocks-action") throw failure; if (name === "wait-for-preparation") await preparation.promise; },
    invoke: async (pending) => {
      expect(events[0]).toBe("prepared"); modes.push(pending); calls++;
      if (name === "permanent-denial") return result(original, 403);
      if (name === "conflict-retired" && calls === 1) return result(original, 409);
      if (name === "body-error-distinct" && calls === 1) return result(original, 200, undefined, bodyFailure);
      if (name === "changed-command" && calls > 1) return result({ ...original, commandId: "C-2" });
      if (name === "changed-payload" && calls > 1) return result({ ...original, roundId: "round-2", stage: 1, expectedVersion: 99 });
      if (name === "wrong-intent") return result({ ...original, action: "choose", expectedProfileId: "other", roundId: "old-round" });
      if (name === "wrong-profile") return result({ ...original, expectedProfileId: "other" });
      return result();
    },
    validate: (payload) => { expect(payload).toEqual(original); events.push("validated"); },
    assertPayload: (payload, old) => { expect(payload).toEqual(old); events.push("same-payload"); },
    acknowledge: async () => {
      acknowledged++; events.push("ack-start");
      if (name === "wait-for-ack" || name === "drain-ack-error") return held.promise;
      if (name === "probe-error") throw failure;
      if (name === "bounded-pending") return "pending";
      if (["pending-identical", "changed-command", "changed-payload", "observer-error"].includes(name) && calls === 1) return "pending";
      events.push("ack-done"); return "acknowledged";
    },
    retired: async () => { events.push("retired"); },
    pendingReady: async () => true,
    uncertain: () => { uncertain++; if (name === "observer-error") throw failure; },
    bodyError: () => { bodyErrors++; },
  };
  let settled = false;
  const work = binding.commit("answer", options);
  const observed = work.then((value) => { settled = true; return { ok: true as const, value }; }, (error: unknown) => { settled = true; return { ok: false as const, error }; });
  if (name === "wait-for-preparation") {
    await checkpoint(); const startedEarly = calls; preparation.resolve(); const final = await observed;
    expect(startedEarly).toBe(0); expect(final.ok).toBe(true); expect(calls).toBe(1); return;
  }
  if (name === "wait-for-ack" || name === "drain-ack-error") {
    await checkpoint();
    const before = settled;
    if (name === "wait-for-ack") held.resolve("acknowledged"); else held.reject(failure);
    const final = await observed;
    expect(before).toBe(false);
    expect(acknowledged).toBe(1);
    if (name === "wait-for-ack") { expect(final.ok).toBe(true); if (final.ok) expect(final.value).toEqual({ version: 12, correct: true }); }
    else { expect(final.ok).toBe(false); if (!final.ok) expect(final.error).toBe(failure); }
    return;
  }
  const final = await observed;
  if (["changed-command", "changed-payload", "wrong-intent", "wrong-profile", "preexisting-blocks-action", "bounded-pending", "permanent-denial", "observer-error", "probe-error"].includes(name)) {
    expect(final.ok).toBe(false);
    if (name === "preexisting-blocks-action") { expect(calls).toBe(0); if (!final.ok) expect(final.error).toBe(failure); }
    if (name === "bounded-pending") expect(calls).toBe(12);
    if (name === "permanent-denial") { expect(calls).toBe(1); expect(acknowledged).toBe(0); }
    if (name === "observer-error" || name === "probe-error") { if (!final.ok) expect(final.error).toBe(failure); expect(bodyErrors).toBe(0); }
  } else {
    expect(final.ok).toBe(true);
    if (final.ok) expect(final.value).toEqual({ version: 12, correct: true });
    if (name === "pending-identical") { expect(modes).toEqual([false, true]); expect(events).toContain("same-payload"); expect(acknowledged).toBe(2); expect(uncertain).toBe(1); }
    if (name === "conflict-retired") { expect(modes).toEqual([false, false]); expect(events).toContain("retired"); expect(events.indexOf("retired")).toBeLessThan(events.lastIndexOf("validated")); }
    if (name === "body-error-distinct") { expect(bodyErrors).toBe(1); expect(modes).toEqual([false, true]); expect(acknowledged).toBe(1); }
  }
}
