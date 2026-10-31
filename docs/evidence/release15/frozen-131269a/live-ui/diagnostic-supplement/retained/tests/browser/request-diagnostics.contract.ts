import assert from "node:assert/strict";

export interface RequestEvidence {
  url(): string;
  method(): string;
  postDataJSON(): unknown;
  timing(): { responseEnd: number };
}
export interface ResponseEvidence {
  request(): RequestEvidence;
  url(): string;
  status(): number;
  ok(): boolean;
  json(): Promise<unknown>;
}
type Listener = ((value: RequestEvidence) => void) | ((value: ResponseEvidence) => void);
export interface EvidencePage {
  on(event: "response", listener: (response: ResponseEvidence) => void): unknown;
  on(event: "requestfinished" | "requestfailed", listener: (request: RequestEvidence) => void): unknown;
  off(event: "response", listener: (response: ResponseEvidence) => void): unknown;
  off(event: "requestfinished" | "requestfailed", listener: (request: RequestEvidence) => void): unknown;
}
export type SlowResponse = { path: string; method: string; status: number; durationMs: number; action: string | null };
export type InstrumentationFailure = { kind: string; path: string };
export type DiagnosticState = { details: SlowResponse[]; failures: InstrumentationFailure[]; failureTotal: number };
export type DiagnosticHandle = { dispose(): void; pendingAtDispose: number };
export type BodyHandle = { dispose(): Promise<void>; failures: { during: string }[]; failureTotal: number };
export interface DiagnosticBinding {
  attach(page: EvidencePage, state: DiagnosticState): DiagnosticHandle;
  bodies(page: EvidencePage, observe: (response: ResponseEvidence) => Promise<void>): BodyHandle;
}

export class FixturePage implements EvidencePage {
  closed = false;
  responseLookups = 0;
  private listeners = new Map<string, Set<Listener>>();
  on(event: string, listener: Listener) {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener); this.listeners.set(event, listeners); return this;
  }
  off(event: string, listener: Listener) { this.listeners.get(event)?.delete(listener); return this; }
  emit(event: string, value: RequestEvidence | ResponseEvidence) {
    for (const listener of this.listeners.get(event) ?? []) (listener as (input: RequestEvidence | ResponseEvidence) => void)(value);
  }
  request(path = "/api/rooms/shared", duration = 0) {
    const page = this;
    const guard = () => { if (page.closed) throw new Error("fixture context closed"); };
    return {
      duration,
      url() { guard(); return `https://game.invalid${path}`; },
      method() { guard(); return "POST"; },
      postDataJSON() { guard(); return { action: "ready" }; },
      timing() { guard(); return { responseEnd: this.duration }; },
      response(): Promise<never> { page.responseLookups++; return Promise.reject(new Error("async response lookup is forbidden")); },
    };
  }
  response(request: RequestEvidence, status: number, json: () => Promise<unknown> = async () => ({})): ResponseEvidence {
    return { request: () => request, url: () => request.url(), status: () => status, ok: () => status < 400, json };
  }
}

export const diagnosticCases = ["status-boundary", "duration-boundary", "finish-timing", "exact-detail-cap", "same-url-identity", "missing-response", "out-of-order", "disposal-race", "closed-context", "body-active-failure", "body-disposal-drain"] as const;
export type DiagnosticCase = (typeof diagnosticCases)[number];
export async function assertDiagnosticCase(name: DiagnosticCase, binding: DiagnosticBinding) {
  const page = new FixturePage();
  const state: DiagnosticState = { details: [], failures: [], failureTotal: 0 };
  if (name === "body-active-failure") {
    const handle = binding.bodies(page, async () => { throw new Error("active fixture body failure"); });
    page.emit("response", page.response(page.request(), 200));
    await Promise.resolve(); await Promise.resolve();
    await handle.dispose();
    assert.equal(handle.failureTotal, 1, "Active body failures must be explicit");
    assert.equal(handle.failures[0]?.during, "active");
    return;
  }
  if (name === "body-disposal-drain") {
    let release!: () => void;
    let observed = 0;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const handle = binding.bodies(page, async () => { await gate; assert.equal(page.closed, false); observed++; });
    page.emit("response", page.response(page.request(), 200));
    let disposed = false;
    const disposal = handle.dispose().then(() => { disposed = true; });
    await Promise.resolve();
    assert.equal(disposed, false, "Dispose must drain in-flight body evidence before context.close");
    release(); await disposal; page.closed = true;
    page.emit("response", page.response(page.request(), 200));
    await Promise.resolve();
    assert.equal(observed, 1, "No new body work may begin after disposal");
    assert.equal(handle.failureTotal, 0);
    return;
  }
  const handle = binding.attach(page, state);
  const complete = (status: number, duration: number, path = "/api/rooms/shared") => {
    const request = page.request(path, duration);
    page.emit("response", page.response(request, status)); page.emit("requestfinished", request);
    return request;
  };
  if (name === "status-boundary") {
    complete(399, 20); complete(400, 20); complete(503, 20); complete(503, 20, "/asset.js");
    assert.deepEqual(state.details.map((entry) => entry.status), [400, 503]);
    assert.equal(state.details[0]?.action, "ready");
  } else if (name === "duration-boundary") {
    complete(200, 1000); complete(200, 1001);
    assert.deepEqual(state.details.map((entry) => entry.durationMs), [1001]);
  } else if (name === "finish-timing") {
    const request = page.request(); page.emit("response", page.response(request, 200));
    assert.equal(state.details.length, 0, "Response headers are not completed-response timing");
    request.duration = 1600; page.emit("requestfinished", request);
    assert.equal(state.details[0]?.durationMs, 1600);
  } else if (name === "exact-detail-cap") {
    for (let i = 0; i < 102; i++) complete(500, i, `/api/rooms/${i}`);
    assert.equal(state.details.length, 100);
    assert.equal(state.details[99]?.path, "/api/rooms/99");
  } else if (name === "same-url-identity") {
    const first = page.request(undefined, 60); const second = page.request(undefined, 90);
    page.emit("response", page.response(first, 503)); page.emit("response", page.response(second, 401));
    page.emit("requestfinished", second); page.emit("requestfinished", first);
    assert.deepEqual(state.details.map(({ status, durationMs }) => [status, durationMs]), [[401, 90], [503, 60]]);
  } else if (name === "missing-response" || name === "out-of-order") {
    const request = page.request(); page.emit("requestfinished", request);
    if (name === "out-of-order") page.emit("response", page.response(request, 503));
    assert.equal(state.failureTotal, 1);
    assert.equal(state.failures[0]?.kind, "finished-without-response");
    assert.equal(state.details.length, 0);
  } else if (name === "disposal-race") {
    const request = page.request(); page.emit("response", page.response(request, 503));
    handle.dispose(); page.closed = true;
    assert.equal(handle.pendingAtDispose, 1, "In-flight diagnostics need explicit disposal qualification");
    assert.doesNotThrow(() => page.emit("requestfinished", request));
    assert.equal(state.details.length, 0);
    return;
  } else if (name === "closed-context") {
    complete(503, 60); handle.dispose(); page.closed = true;
    assert.doesNotThrow(() => page.emit("response", page.response(page.request(), 503)));
    assert.equal(page.responseLookups, 0, "Never issue asynchronous Request.response lookup");
    return;
  }
  handle.dispose();
  assert.equal(page.responseLookups, 0, "Never issue asynchronous Request.response lookup");
  if (name !== "missing-response" && name !== "out-of-order") assert.equal(state.failureTotal, 0);
}
