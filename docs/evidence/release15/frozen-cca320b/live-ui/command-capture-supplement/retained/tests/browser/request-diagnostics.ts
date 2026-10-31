import type { BodyHandle, DiagnosticHandle, DiagnosticState, EvidencePage, RequestEvidence, ResponseEvidence } from "./request-diagnostics.contract";

/** Header evidence is synchronous; timing is sampled only at requestfinished. */
export function attach(page: EvidencePage, state: DiagnosticState): DiagnosticHandle {
  const responses = new Map<RequestEvidence, number>();
  const finished = new WeakSet<RequestEvidence>();
  let active = true;
  const problem = (kind: string, path: string) => {
    state.failureTotal++;
    if (state.failures.length < 100) state.failures.push({ kind, path });
  };
  const response = (value: ResponseEvidence) => {
    if (!active || state.details.length >= 100) return;
    try {
      const request = value.request();
      if (!finished.has(request) && new URL(request.url()).pathname.startsWith("/api/")) responses.set(request, value.status());
    } catch { problem("response-metadata-unavailable", "unknown"); }
  };
  const complete = (request: RequestEvidence) => {
    if (!active) return;
    try {
      const status = responses.get(request);
      responses.delete(request); finished.add(request);
      if (state.details.length >= 100) return;
      const path = new URL(request.url()).pathname;
      if (!path.startsWith("/api/")) return;
      if (status === undefined) { problem("finished-without-response", path); return; }
      const durationMs = request.timing().responseEnd;
      if (status < 400 && durationMs <= 1000) return;
      let action: string | null = null;
      try {
        const body = request.postDataJSON() as { action?: unknown } | null;
        if (typeof body?.action === "string" && ["ready", "presence", "leave", "choose", "answer", "continue"].includes(body.action)) action = body.action;
      } catch { /* Non-JSON requests have no action, as in the original diagnostic. */ }
      state.details.push({ path, method: request.method(), status, durationMs, action });
    } catch { problem("finished-metadata-unavailable", "unknown"); }
  };
  const failed = (request: RequestEvidence) => { responses.delete(request); finished.add(request); };
  page.on("response", response); page.on("requestfinished", complete); page.on("requestfailed", failed);
  const handle: DiagnosticHandle = { pendingAtDispose: 0, dispose() {
    if (!active) return;
    active = false;
    page.off("response", response); page.off("requestfinished", complete); page.off("requestfailed", failed);
    handle.pendingAtDispose = responses.size; responses.clear();
  } };
  return handle;
}

/** Every body task is observed and drained while its browser context is open. */
export function bodies(page: EvidencePage, observe: (response: ResponseEvidence) => Promise<void>): BodyHandle {
  let active = true;
  const pending = new Set<Promise<void>>();
  const problem = () => {
    handle.failureTotal++;
    if (handle.failures.length < 100) handle.failures.push({ during: active ? "active" : "disposing" });
  };
  const response = (value: ResponseEvidence) => {
    if (!active) return;
    try {
      const task = observe(value).catch(problem);
      pending.add(task);
      void task.then(() => pending.delete(task));
    } catch { problem(); }
  };
  const handle: BodyHandle = { failures: [], failureTotal: 0, async dispose() {
    active = false;
    page.off("response", response);
    await Promise.all(pending);
  } };
  page.on("response", response);
  return handle;
}
