import { expect } from "vitest";
import type { AckCommitOptions, AckMode, AckOutcome, Scope, UiCommandState } from "./ui-command-acknowledgement.contract";
import type { CapturedCommand } from "./ui-command-capture.contract";

export type RetirementMode = AckMode | "retire";
export type UntilCommandState = (condition: () => Promise<AckOutcome>) => Promise<void>;
export interface RetirementObservation { command: CapturedCommand; state: UiCommandState; outcome: AckOutcome }
export interface RetirementBinding {
  retire(command: CapturedCommand, scope: Scope, minimum: number, read: () => Promise<UiCommandState>, until: UntilCommandState, observe?: (event: RetirementObservation) => void): Promise<void>;
  state(value: UiCommandState, scope: Scope, minimum: number, mode: RetirementMode): AckOutcome;
  commit(action: string, options: Omit<AckCommitOptions, "retired"> & { retired(command: CapturedCommand): Promise<void> }): Promise<unknown>;
}
export const retirementCases = [
  "retire-busy-game", "retire-busy-room", "retire-enabled", "retire-version",
  "retire-scope", "retire-missing", "retire-denied", "retire-malformed", "retire-non409",
  "retire-probe-error", "retire-observer-error", "retire-wait-error", "retire-drains-wait",
  "retire-blocks-next", "retire-error-blocks-next", "fresh-guard", "strict-guard", "request-attribution", "retire-wait-probe-errors",
] as const;
export type RetirementCase = typeof retirementCases[number];
const checkpoint = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const idle = (scope: Scope): UiCommandState => ({ scope, present: true, visible: true, denied: false, busy: "false", version: "12", pending: "absent" });

/** Identical observable wait/mode assertions bind independent controls and real helpers. */
export async function assertRetirementCase(name: RetirementCase, binding: RetirementBinding): Promise<void> {
  const scope = name === "retire-busy-room" ? "room" : "game";
  if (name === "fresh-guard" || name === "strict-guard") {
    const states = name === "fresh-guard" ? [
      { ...idle(scope), pending: "enabled" as const },
      { ...idle(scope), busy: "true", pending: "disabled" as const },
      { ...idle(scope), busy: "true", pending: "enabled" as const },
    ] : [{ ...idle(scope), pending: "enabled" as const }];
    for (const state of states) expect(() => binding.state(state, scope, 0, name === "fresh-guard" ? "fresh" : "strict")).toThrow();
    return;
  }
  const failure = new Error(`original ${name} failure`);
  const lateFailure = new Error("original late probe failure");
  const gate = deferred();
  const payload = { action: "answer", commandId: "original-command", expectedProfileId: "original-actor", expectedVersion: 11 };
  const request = { postDataJSON: () => payload, response: async () => null };
  const conflict: CapturedCommand = { status: () => name === "retire-non409" ? 403 : 409, ok: () => false, request: () => request, json: async () => { throw new Error("Conflict error JSON must not be parsed"); } };
  const states = [idle(scope)];
  if (name === "retire-busy-game" || name === "retire-busy-room") states.unshift({ ...idle(scope), busy: "true", pending: "disabled" }, { ...idle(scope), busy: "true" });
  if (name === "retire-enabled") states.unshift({ ...idle(scope), pending: "enabled" });
  if (name === "retire-version") states.unshift({ ...idle(scope), version: "11" });
  if (name === "retire-scope") states[0].scope = "room";
  if (name === "retire-missing") states[0].visible = false;
  if (name === "retire-denied") states[0].denied = true;
  if (name === "retire-malformed") states[0].version = "12junk";
  let reads = 0;
  let conditions = 0;
  let invokes = 0;
  let settled = false;
  const startedConditions: Promise<AckOutcome>[] = [];
  const retirements: Promise<void>[] = [];
  const observed: RetirementObservation[] = [];
  const read = async () => {
    if (name === "retire-drains-wait" || name === "retire-wait-probe-errors") await gate.promise;
    if (name === "retire-wait-probe-errors") throw lateFailure;
    if (name === "retire-probe-error" || name === "retire-error-blocks-next") throw failure;
    return states[Math.min(reads++, states.length - 1)];
  };
  const until: UntilCommandState = async (condition) => {
    if (name === "retire-wait-error") throw failure;
    if (name === "retire-drains-wait" || name === "retire-wait-probe-errors") {
      conditions++;
      const started = condition();
      startedConditions.push(started);
      void started.catch(() => {});
      throw failure;
    }
    if (name === "retire-blocks-next") {
      await gate.promise;
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      conditions++;
      if (await condition() !== "waiting") return;
    }
    throw new Error("Existing assertion-bound wait exhausted");
  };
  const observe = (event: RetirementObservation) => {
    if (name === "retire-observer-error") throw failure;
    observed.push(event);
  };
  const retire = (command: CapturedCommand) => {
    const work = binding.retire(command, scope, 12, read, until, observe);
    retirements.push(work);
    return work;
  };
  let work: Promise<unknown>;
  if (name === "retire-blocks-next" || name === "retire-error-blocks-next") {
    const next: CapturedCommand = { ...conflict, ok: () => true, status: () => 200, json: async () => ({ version: 12 }) };
    work = binding.commit("answer", {
      prepare: async () => {}, validate: () => {}, assertPayload: () => {}, acknowledge: async () => "acknowledged",
      invoke: async (pending) => { expect(pending).toBe(false); invokes++; return invokes === 1 ? conflict : next; },
      retired: retire, pendingReady: async () => false, uncertain: () => { throw new Error("Conflict retirement cannot authorize uncertain replay"); }, bodyError: () => {},
    });
  } else work = retire(conflict);
  const completion = work.then(() => { settled = true; return { ok: true as const }; }, (error: unknown) => { settled = true; return { ok: false as const, error }; });
  if (name === "retire-drains-wait" || name === "retire-wait-probe-errors" || name === "retire-blocks-next") {
    await checkpoint();
    const before = settled;
    const earlyInvokes = invokes;
    gate.resolve();
    const final = await completion;
    await Promise.allSettled(retirements);
    await Promise.allSettled(startedConditions);
    expect(before).toBe(false);
    if (name === "retire-blocks-next") { expect(earlyInvokes).toBe(1); expect(invokes).toBe(2); }
    expect(final.ok).toBe(name === "retire-blocks-next");
    if (name === "retire-drains-wait" && !final.ok) expect(final.error).toBe(failure);
    if (name === "retire-wait-probe-errors" && !final.ok) {
      expect(final.error).toBeInstanceOf(AggregateError);
      expect((final.error as AggregateError).errors).toEqual([failure, lateFailure]);
    }
    expect(conditions).toBe(1);
    return;
  }
  const final = await completion;
  if (["retire-scope", "retire-missing", "retire-denied", "retire-malformed", "retire-non409", "retire-probe-error", "retire-observer-error", "retire-wait-error", "retire-error-blocks-next"].includes(name)) {
    expect(final.ok).toBe(false);
    if (["retire-probe-error", "retire-observer-error", "retire-wait-error", "retire-error-blocks-next"].includes(name) && !final.ok) expect(final.error).toBe(failure);
    if (name === "retire-non409") expect(reads).toBe(0);
    if (name === "retire-error-blocks-next") expect(invokes).toBe(1);
    return;
  }
  expect(final.ok).toBe(true);
  expect(reads).toBe(states.length);
  expect(observed.map((event) => event.outcome)).toEqual(states.map((_, index) => index === states.length - 1 ? "acknowledged" : "waiting"));
  for (const event of observed) {
    expect(event.command).toBe(conflict);
    expect(event.command.request()).toBe(request);
    expect(event.command.status()).toBe(409);
  }
}
