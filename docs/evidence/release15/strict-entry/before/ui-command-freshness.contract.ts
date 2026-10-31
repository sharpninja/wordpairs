import { expect } from "vitest";
import type { AckOutcome, Scope, UiCommandState } from "./ui-command-acknowledgement.contract";
import type { CapturedCommand } from "./ui-command-capture.contract";
import type { RetirementBinding, RetirementObservation, UntilCommandState } from "./ui-command-retirement.contract";

export const freshnessCases = [
  "room-stale", "game-stale", "explicit-higher", "captured-higher", "zero", "max-valid",
  "no-advance", "deferred-next", "observer-attribution", "observer-error", "status-first",
  "version-missing", "version-null", "version-string", "version-boolean", "version-fraction",
  "version-negative", "version-nan", "version-infinity", "version-unsafe", "version-max-safe",
  "minimum-negative", "minimum-nan", "payload-null",
] as const;
export type FreshnessCase = typeof freshnessCases[number];
const checkpoint = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Contract inputs are independent of the implementation's computed floor. */
export async function assertFreshnessCase(name: FreshnessCase, binding: RetirementBinding): Promise<void> {
  const scope: Scope = name === "room-stale" ? "room" : "game";
  const invalid: Record<string, unknown> = {
    "version-missing": undefined, "version-null": null, "version-string": "11", "version-boolean": true,
    "version-fraction": 11.5, "version-negative": -1, "version-nan": Number.NaN,
    "version-infinity": Number.POSITIVE_INFINITY, "version-unsafe": Number.MAX_SAFE_INTEGER + 1,
    "version-max-safe": Number.MAX_SAFE_INTEGER,
  };
  const invalidVersion = Object.hasOwn(invalid, name);
  const minimum = name === "explicit-higher" ? 14 : name === "minimum-negative" ? -1 : name === "minimum-nan" ? Number.NaN : 0;
  const version = name === "captured-higher" ? 12 : name === "zero" ? 0 : name === "max-valid" ? Number.MAX_SAFE_INTEGER - 1 : invalidVersion ? invalid[name] : 11;
  const payload = name === "payload-null" ? null : { action: "answer", commandId: "exact-original-command", expectedProfileId: "exact-actor", expectedVersion: version };
  const waitError = new Error("Original unchanged projection wait exhausted");
  const observerError = new Error("Original safe observer failed");
  const forbiddenPayloadError = new Error("Non409 payload must never be read");
  let payloadReads = 0;
  const request = { postDataJSON: () => { payloadReads++; if (name === "status-first") throw forbiddenPayloadError; return payload; }, response: async () => null };
  const conflict: CapturedCommand = { request: () => request, status: () => name === "status-first" ? 403 : 409, ok: () => false, json: async () => { throw new Error("Do not parse409 JSON"); } };
  const initial = name === "zero" ? "0" : name === "max-valid" ? String(Number.MAX_SAFE_INTEGER - 1) : name === "explicit-higher" || name === "captured-higher" ? "12" : "11";
  const advanced = name === "zero" ? "1" : name === "max-valid" ? String(Number.MAX_SAFE_INTEGER) : name === "explicit-higher" ? "14" : name === "captured-higher" ? "13" : "12";
  let reads = 0;
  let waits = 0;
  let invokes = 0;
  let settled = false;
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const observed: RetirementObservation[] = [];
  const read = async (): Promise<UiCommandState> => {
    const index = reads++;
    return { scope, present: true, visible: true, denied: false, busy: "false", pending: "absent", version: name === "no-advance" || index === 0 ? initial : advanced };
  };
  const until: UntilCommandState = async (condition) => {
    waits++;
    for (let attempt = 0; attempt < 4; attempt++) {
      const outcome: AckOutcome = await condition();
      if (outcome !== "waiting") return;
      if (name === "deferred-next") await held;
    }
    throw waitError;
  };
  const observe = (event: RetirementObservation) => {
    if (name === "observer-error") throw observerError;
    observed.push(event);
  };
  const next = { ...conflict, status: () => 200, ok: () => true, json: async () => ({ version: 12 }) };
  const work = name === "status-first" ? binding.retire(conflict, scope, minimum, read, until, observe) : binding.commit("answer", {
    prepare: async () => {}, validate: () => {}, assertPayload: () => {}, acknowledge: async () => "acknowledged",
    invoke: async (pending) => { expect(pending).toBe(false); invokes++; return invokes === 1 ? conflict : next; },
    retired: (command) => binding.retire(command, scope, minimum, read, until, observe),
    pendingReady: async () => false, uncertain: () => { throw new Error("A conflict cannot authorize uncertain replay"); }, bodyError: () => {},
  });
  const completion = work.then(() => { settled = true; return { ok: true as const }; }, (error: unknown) => { settled = true; return { ok: false as const, error }; });
  if (name === "deferred-next") {
    await checkpoint();
    const returnedEarly = settled;
    const earlyInvokes = invokes;
    release();
    const final = await completion;
    expect(returnedEarly).toBe(false);
    expect(earlyInvokes).toBe(1);
    expect(final.ok).toBe(true);
  } else {
    const final = await completion;
    const rejects = invalidVersion || name.startsWith("minimum-") || ["payload-null", "status-first", "no-advance", "observer-error"].includes(name);
    expect(final.ok).toBe(!rejects);
    if (rejects) {
      expect(invokes).toBe(name === "status-first" ? 0 : 1);
      if (name === "no-advance" && !final.ok) { expect(final.error).toBe(waitError); expect(reads).toBe(4); }
      else if (name === "observer-error" && !final.ok) expect(final.error).toBe(observerError);
      else { expect(reads).toBe(0); expect(waits).toBe(0); }
      if (name === "status-first") { expect(payloadReads).toBe(0); if (!final.ok) expect(final.error).not.toBe(forbiddenPayloadError); }
      return;
    }
  }
  expect(invokes).toBe(2);
  expect(reads).toBe(2);
  expect(observed.map((event) => event.outcome)).toEqual(["waiting", "acknowledged"]);
  for (const event of observed) {
    expect(event.command).toBe(conflict);
    expect(event.command.request()).toBe(request);
    expect(event.command.request().postDataJSON()).toBe(payload);
    expect((event.command.request().postDataJSON() as { expectedVersion: unknown }).expectedVersion).toBe(version);
    expect(event.command.status()).toBe(409);
  }
}
