import { expect } from "vitest";

export interface CommandResponse {
  ok(): boolean;
  status(): number;
  json(): Promise<unknown>;
}
export interface CommandRequest {
  response(): Promise<CommandResponse | null>;
  postDataJSON(): unknown;
}
export interface CapturedCommand {
  ok(): boolean;
  status(): number;
  json(): Promise<unknown>;
  request(): CommandRequest;
}
export interface BodyErrorObservation {
  request: CommandRequest;
  status: number;
  pending: boolean;
}
export interface CommitOptions {
  invoke(pending: boolean): Promise<CapturedCommand>;
  pendingReady(): Promise<boolean>;
  assertPayload(actual: unknown, original: unknown): void;
  uncertain(): void;
  bodyError(event: BodyErrorObservation): void;
}
export interface CommandBinding {
  capture(wait: () => Promise<CommandRequest>, action: () => Promise<unknown>): Promise<CapturedCommand>;
  commit(action: string, options: CommitOptions): Promise<unknown>;
}
export const captureCases = [
  "eager-response", "eager-body", "request-identity", "cached-body", "null-response",
  "conflict-no-json", "server-no-json", "body-error", "wait-error", "response-error",
  "action-error", "sync-action-error", "capture-drains-action", "action-drains-body",
  "sync-wait-error", "dual-errors", "body-action-errors",
] as const;
export const commitCases = [
  "success", "conflict-fresh-command", "server-pending-identical", "null-pending-identical",
  "body-pending-identical", "body-no-pending", "body-disabled-pending", "body-wrong-command",
  "bounded-attempts", "unrelated-invoke-error", "probe-error-original", "observer-error-preserves-failure",
] as const;
export type CaptureCase = typeof captureCases[number];
export type CommitCase = typeof commitCases[number];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const checkpoint = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Contract-derived dependency oracle; no implementation, browser or timer sleeps. */
export async function assertCaptureCase(name: CaptureCase, binding: CommandBinding) {
  const failure = new Error(`original ${name}`);
  const secondary = new Error("independent action failure");
  const body = { version: 17, correct: true };
  const payload = { action: "answer", commandId: "fixture-command", expectedProfileId: "fixture-actor", answer: "fixture-answer" };
  const actionGate = deferred<void>();
  const bodyGate = deferred<unknown>();
  const calls: string[] = [];
  let responseCalls = 0;
  let bodyCalls = 0;
  let returned = false;
  const blockedAction = ["eager-response", "eager-body", "capture-drains-action", "wait-error", "response-error"].includes(name);
  const blockedBody = name === "action-drains-body";
  const response: CommandResponse = {
    ok: () => !["conflict-no-json", "server-no-json"].includes(name),
    status: () => name === "conflict-no-json" ? 409 : name === "server-no-json" ? 503 : 200,
    json: async () => {
      bodyCalls++; calls.push("body");
      if (["conflict-no-json", "server-no-json"].includes(name)) throw new Error("Error JSON must not be parsed");
      if (name === "body-error" || name === "body-action-errors") throw failure;
      return blockedBody ? bodyGate.promise : body;
    },
  };
  const request: CommandRequest = {
    postDataJSON: () => payload,
    response: async () => {
      responseCalls++; calls.push("response");
      if (["response-error", "capture-drains-action", "dual-errors"].includes(name)) throw failure;
      return name === "null-response" ? null : response;
    },
  };
  const run = binding.capture(() => {
    calls.push("wait");
    if (name === "sync-wait-error") throw failure;
    return name === "wait-error" ? Promise.reject(failure) : Promise.resolve(request);
  }, () => {
    calls.push("action");
    if (name === "sync-action-error") throw failure;
    if (["action-error", "action-drains-body"].includes(name)) return Promise.reject(failure);
    if (name === "dual-errors" || name === "body-action-errors") return Promise.reject(secondary);
    return blockedAction ? actionGate.promise : Promise.resolve();
  });
  const outcome = run.then((value) => { returned = true; return { ok: true as const, value }; }, (error: unknown) => { returned = true; return { ok: false as const, error }; });
  try {
    await checkpoint();
    expect(calls.slice(0, 2), "A failed waiter registration cannot start an unobserved UI mutation").toEqual(name === "sync-wait-error" ? ["wait"] : ["wait", "action"]);
    if (["eager-response", "eager-body"].includes(name)) {
      expect(responseCalls, "Capture exact response while action is pending").toBe(1);
      if (name === "eager-body") expect(bodyCalls, "Capture successful body while action is pending").toBe(1);
      expect(returned).toBe(false);
    }
    if (blockedAction || blockedBody) expect(returned, "Do not abandon a started sibling on failure").toBe(false);
  } finally {
    actionGate.resolve(); bodyGate.resolve(body);
  }
  const result = await outcome;
  if (name === "dual-errors" || name === "body-action-errors") {
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AggregateError);
      expect((result.error as AggregateError).errors).toEqual([failure, secondary]);
    }
  } else if (["wait-error", "response-error", "action-error", "sync-action-error", "capture-drains-action", "action-drains-body", "sync-wait-error"].includes(name)) {
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(failure);
  } else {
    if (!result.ok) throw result.error;
    expect(result.value.request()).toBe(request);
    expect(result.value.request().postDataJSON()).toBe(payload);
    expect(result.value.status()).toBe(name === "null-response" ? 0 : response.status());
    expect(result.value.ok()).toBe(name !== "null-response" && response.ok());
    if (name === "body-error") {
      await expect(result.value.json()).rejects.toBe(failure);
      await expect(result.value.json()).rejects.toBe(failure);
    } else {
      const first = await result.value.json();
      const second = await result.value.json();
      expect(first).toBe(name === "null-response" || !response.ok() ? null : body);
      expect(second).toBe(first);
    }
    expect(bodyCalls).toBe(name === "null-response" || !response.ok() ? 0 : 1);
  }
  expect(responseCalls).toBe(["wait-error", "sync-wait-error"].includes(name) ? 0 : 1);
}

export async function assertCommitCase(name: CommitCase, binding: CommandBinding) {
  const failure = new Error(`original body ${name}`);
  const invokeFailure = new Error("unrelated UI action failure");
  const observerFailure = new Error("attribution observer failure");
  const body = { version: 23, correct: true };
  const original = { action: "answer", commandId: "original-command", expectedProfileId: "original-actor", answer: "original-answer" };
  const flags: boolean[] = [];
  const observations: BodyErrorObservation[] = [];
  let probeCalls = 0;
  let payloadChecks = 0;
  let uncertain = 0;
  const bodyCase = name.startsWith("body-") || ["probe-error-original", "observer-error-preserves-failure"].includes(name);
  const firstStatus = name === "conflict-fresh-command" ? 409 : name === "server-pending-identical" || name === "bounded-attempts" ? 503 : name === "null-pending-identical" ? 0 : 200;
  const request: CommandRequest = { response: async () => null, postDataJSON: () => original };
  let firstBodyCalls = 0;
  const first: CapturedCommand = {
    request: () => request, status: () => firstStatus, ok: () => firstStatus === 200,
    json: async () => { firstBodyCalls++; if (bodyCase) throw failure; return body; },
  };
  const options: CommitOptions = {
    invoke: async (pending) => {
      flags.push(pending);
      if (name === "unrelated-invoke-error") throw invokeFailure;
      if (flags.length === 1 || name === "bounded-attempts") return first;
      const nextPayload = name === "body-wrong-command" || name === "conflict-fresh-command" ? { ...original, commandId: "new-command" } : { ...original };
      return { request: () => ({ ...request, postDataJSON: () => nextPayload }), ok: () => true, status: () => 200, json: async () => body };
    },
    pendingReady: async () => {
      probeCalls++;
      if (name === "probe-error-original") throw new Error("pending UI inaccessible");
      return !["body-no-pending", "body-disabled-pending"].includes(name);
    },
    assertPayload: (actual, expected) => { payloadChecks++; expect(actual).toEqual(expected); },
    uncertain: () => { uncertain++; },
    bodyError: (event) => { observations.push(event); if (name === "observer-error-preserves-failure") throw observerFailure; },
  };
  const result = await binding.commit("answer", options).then((value) => ({ ok: true as const, value }), (error: unknown) => ({ ok: false as const, error }));
  if (["body-no-pending", "body-disabled-pending", "probe-error-original"].includes(name)) {
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(failure);
    expect(flags).toEqual([false]); expect(uncertain).toBe(0);
  } else if (name === "observer-error-preserves-failure") {
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AggregateError);
      expect((result.error as AggregateError).errors).toEqual([failure, observerFailure]);
    }
    expect(flags).toEqual([false]);
  } else if (name === "unrelated-invoke-error") {
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(invokeFailure);
    expect(flags).toEqual([false]);
  } else if (name === "body-wrong-command") {
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(Error);
    expect(flags).toEqual([false, true]); expect(payloadChecks).toBe(1);
  } else if (name === "bounded-attempts") {
    expect(result.ok).toBe(false);
    expect(flags).toEqual([false, ...Array<boolean>(11).fill(true)]);
    expect(payloadChecks).toBe(11); expect(uncertain).toBe(12);
  } else {
    if (!result.ok) throw result.error;
    expect(result.value).toBe(body);
    const retry = name !== "success";
    expect(flags).toEqual(retry ? [false, name !== "conflict-fresh-command"] : [false]);
    expect(payloadChecks).toBe(retry && name !== "conflict-fresh-command" ? 1 : 0);
    expect(uncertain).toBe(retry && name !== "conflict-fresh-command" ? 1 : 0);
  }
  expect(probeCalls).toBe(bodyCase ? 1 : 0);
  expect(firstBodyCalls).toBe(firstStatus === 200 && name !== "unrelated-invoke-error" ? 1 : 0);
  expect(observations).toHaveLength(bodyCase ? 1 : 0);
  if (bodyCase) {
    expect(observations[0].request).toBe(request);
    expect(observations[0].status).toBe(200);
    expect(observations[0].pending).toBe(!["body-no-pending", "body-disabled-pending", "probe-error-original"].includes(name));
  }
}
