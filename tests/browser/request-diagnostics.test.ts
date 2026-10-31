import { describe, expect, it } from "vitest";
import { assertDiagnosticCase, diagnosticCases, type BodyHandle, type DiagnosticBinding, type DiagnosticCase, type DiagnosticHandle, type RequestEvidence, type ResponseEvidence } from "./request-diagnostics.contract";

type Defect = "status" | "duration" | "header-timing" | "cap" | "url-identity" | "missing" | "dispose" | "lookup" | "body-failure" | "body-drain";
// Independent event fixture. It contains no import of the implementation and is
// run before request-diagnostics.ts exists. Mutants must fail the SAME oracle.
function fixture(defect?: Defect): DiagnosticBinding {
  return {
    attach(page, state) {
      const evidence = new Map<RequestEvidence | string, { status: number; duration: number }>();
      const finished = new Set<RequestEvidence>();
      const key = (request: RequestEvidence) => defect === "url-identity" ? request.url() : request;
      const response = (value: ResponseEvidence) => {
        const request = value.request();
        if (!finished.has(request) && new URL(request.url()).pathname.startsWith("/api/")) evidence.set(key(request), { status: value.status(), duration: request.timing().responseEnd });
      };
      const finish = (request: RequestEvidence) => {
        const path = new URL(request.url()).pathname;
        if (!path.startsWith("/api/") || state.details.length >= (defect === "cap" ? 101 : 100)) return;
        const value = evidence.get(key(request)); evidence.delete(key(request)); finished.add(request);
        if (defect === "lookup") void (request as RequestEvidence & { response(): Promise<unknown> }).response().catch(() => {});
        if (!value) {
          if (defect !== "missing") { state.failureTotal++; state.failures.push({ kind: "finished-without-response", path }); }
          return;
        }
        const durationMs = defect === "header-timing" ? value.duration : request.timing().responseEnd;
        if ((defect === "status" ? value.status > 400 : value.status >= 400) || (defect === "duration" ? durationMs >= 1000 : durationMs > 1000)) state.details.push({ path, method: request.method(), status: value.status, durationMs, action: "ready" });
      };
      page.on("response", response); page.on("requestfinished", finish);
      const handle: DiagnosticHandle = { pendingAtDispose: 0, dispose() {
        handle.pendingAtDispose = evidence.size;
        if (defect !== "dispose") { page.off("response", response); page.off("requestfinished", finish); evidence.clear(); }
      } };
      return handle;
    },
    bodies(page, observe) {
      let active = true;
      const pending = new Set<Promise<void>>();
      const handle: BodyHandle = { failures: [], failureTotal: 0, async dispose() {
        active = false; page.off("response", response);
        if (defect !== "body-drain") await Promise.all(pending);
      } };
      const response = (value: ResponseEvidence) => {
        if (!active) return;
        const task = observe(value).catch(() => {
          if (defect !== "body-failure") { handle.failureTotal++; handle.failures.push({ during: active ? "active" : "disposing" }); }
        });
        pending.add(task); void task.then(() => pending.delete(task));
      };
      page.on("response", response); return handle;
    },
  };
}
const controls: { name: DiagnosticCase; defect: Defect }[] = [
  { name: "status-boundary", defect: "status" }, { name: "duration-boundary", defect: "duration" },
  { name: "finish-timing", defect: "header-timing" }, { name: "exact-detail-cap", defect: "cap" },
  { name: "same-url-identity", defect: "url-identity" }, { name: "missing-response", defect: "missing" },
  { name: "out-of-order", defect: "missing" }, { name: "disposal-race", defect: "dispose" },
  { name: "closed-context", defect: "lookup" }, { name: "body-active-failure", defect: "body-failure" },
  { name: "body-disposal-drain", defect: "body-drain" },
];
const real = process.env.WORDPAIRS_DIAGNOSTICS_BINDING !== "mock";
const modulePath = "./request-diagnostics";
const binding: DiagnosticBinding = real ? await import(modulePath) : fixture();
describe(`request diagnostic oracle (${real ? "real" : "independent correct fixture"})`, () => {
  it.each(diagnosticCases)("preserves %s", async (name) => { await assertDiagnosticCase(name, binding); });
  it.each(controls)("rejects independent wrong fixture $name/$defect", async ({ name, defect }) => {
    await expect(assertDiagnosticCase(name, fixture(defect))).rejects.toThrow();
  });
});
