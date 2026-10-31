import { describe, expect, it } from "vitest";
import {
  assertCaptureCase, assertCommitCase, captureCases, commitCases,
  type CapturedCommand, type CaptureCase, type CommandBinding, type CommandRequest, type CommitCase,
} from "./ui-command-capture.contract";

type Defect = "late-response" | "late-body" | "swap-request" | "repeat-body" | "fabricate-null" |
  "parse-error" | "swallow-body" | "swallow-capture" | "swallow-action" | "fail-fast" |
  "sync-wait-starts-action" | "drop-secondary" | "wrong-result" | "conflict-pending" |
  "forget-pending" | "retry-without-ui" | "ignore-payload" | "wrong-limit" | "swallow-invoke" |
  "probe-overwrites" | "observer-swallow" | "drop-body-error";

// Independently scripted providers; expectations are defined by the oracle,
// never generated from the implementation or imported from its module.
function fixture(defect?: Defect): CommandBinding {
  return {
    capture: async (wait, action) => {
      let observed: Promise<CommandRequest>;
      try { observed = wait(); }
      catch (error) {
        if (defect === "sync-wait-starts-action") await Promise.resolve().then(action);
        throw error;
      }
      let actionTask!: Promise<unknown>;
      const evidence = observed.then(async (request): Promise<CapturedCommand> => {
        if (defect === "late-response") await actionTask;
        const response = await request.response();
        if (defect === "late-body") await actionTask;
        let value: unknown = null;
        let bodyError: unknown;
        let bodyFailed = false;
        if (response && (response.ok() || defect === "parse-error")) {
          try { value = await response.json(); }
          catch (error) { bodyFailed = true; bodyError = error; }
          if (!response.ok() && bodyFailed) throw bodyError;
        }
        return {
          request: () => defect === "swap-request" ? { ...request } : request,
          status: () => response?.status() ?? (defect === "fabricate-null" ? 200 : 0),
          ok: () => response?.ok() ?? defect === "fabricate-null",
          json: async () => {
            if (defect === "repeat-body" && response) return response.json();
            if (bodyFailed && defect !== "swallow-body") throw bodyError;
            return value;
          },
        };
      });
      // Attach rejection observation before starting the sibling action.
      const evidenceOutcome = evidence.then((value) => ({ ok: true as const, value }), (error: unknown) => ({ ok: false as const, error }));
      actionTask = (async () => action())();
      const actionOutcome = actionTask.then(() => ({ ok: true as const }), (error: unknown) => ({ ok: false as const, error }));
      if (defect === "fail-fast") await Promise.all([evidence, actionTask]);
      const captured = await evidenceOutcome;
      const acted = await actionOutcome;
      if (!captured.ok && !acted.ok && defect !== "drop-secondary") throw new AggregateError([captured.error, acted.error]);
      if (!captured.ok) {
        if (defect !== "swallow-capture") throw captured.error;
        return { ok: () => true, status: () => 200, json: async () => ({}), request: () => ({ postDataJSON: () => ({}), response: async () => null }) };
      }
      if (!acted.ok && defect !== "swallow-action") {
        if (defect !== "drop-body-error") {
          try { await captured.value.json(); }
          catch (error) { throw new AggregateError([error, acted.error]); }
        }
        throw acted.error;
      }
      return captured.value;
    },
    commit: async (action, options) => {
      let mode: "fresh" | "pending" = "fresh";
      let canonical: unknown;
      for (let remaining = defect === "wrong-limit" ? 11 : 12; remaining > 0; remaining--) {
        let result: CapturedCommand;
        try { result = await options.invoke(mode === "pending"); }
        catch (error) { if (defect === "swallow-invoke") return {}; throw error; }
        const payload = result.request().postDataJSON();
        if (mode === "pending" && defect !== "ignore-payload") options.assertPayload(payload, canonical);
        if (result.ok()) {
          try {
            const value = await result.json();
            return defect === "wrong-result" ? {} : value;
          } catch (error) {
            let allowed = false;
            try { allowed = await options.pendingReady(); }
            catch (probeError) { if (defect === "probe-overwrites") throw probeError; }
            try { options.bodyError({ request: result.request(), status: result.status(), pending: allowed }); }
            catch (observerError) {
              if (defect === "observer-swallow") return {};
              throw new AggregateError([error, observerError]);
            }
            if (!allowed && defect !== "retry-without-ui") throw error;
          }
        } else if (result.status() !== 0 && result.status() < 500) {
          expect(result.status()).toBe(409);
          mode = defect === "conflict-pending" ? "pending" : "fresh";
          canonical = undefined;
          continue;
        }
        options.uncertain();
        canonical ??= payload;
        mode = defect === "forget-pending" ? "fresh" : "pending";
      }
      throw new Error(`UI ${action} did not converge through explicit conflict/uncertain retries`);
    },
  };
}

const captureControls: { name: CaptureCase; defect: Defect }[] = [
  { name: "eager-response", defect: "late-response" },
  { name: "eager-body", defect: "late-body" },
  { name: "request-identity", defect: "swap-request" },
  { name: "cached-body", defect: "repeat-body" },
  { name: "null-response", defect: "fabricate-null" },
  { name: "conflict-no-json", defect: "parse-error" },
  { name: "server-no-json", defect: "parse-error" },
  { name: "body-error", defect: "swallow-body" },
  { name: "wait-error", defect: "swallow-capture" },
  { name: "response-error", defect: "swallow-capture" },
  { name: "action-error", defect: "swallow-action" },
  { name: "sync-action-error", defect: "swallow-action" },
  { name: "capture-drains-action", defect: "fail-fast" },
  { name: "action-drains-body", defect: "fail-fast" },
  { name: "sync-wait-error", defect: "sync-wait-starts-action" },
  { name: "dual-errors", defect: "drop-secondary" },
  { name: "body-action-errors", defect: "drop-body-error" },
];
const commitControls: { name: CommitCase; defect: Defect }[] = [
  { name: "success", defect: "wrong-result" },
  { name: "conflict-fresh-command", defect: "conflict-pending" },
  { name: "server-pending-identical", defect: "forget-pending" },
  { name: "null-pending-identical", defect: "forget-pending" },
  { name: "body-pending-identical", defect: "forget-pending" },
  { name: "body-no-pending", defect: "retry-without-ui" },
  { name: "body-disabled-pending", defect: "retry-without-ui" },
  { name: "body-wrong-command", defect: "ignore-payload" },
  { name: "bounded-attempts", defect: "wrong-limit" },
  { name: "unrelated-invoke-error", defect: "swallow-invoke" },
  { name: "probe-error-original", defect: "probe-overwrites" },
  { name: "observer-error-preserves-failure", defect: "observer-swallow" },
];
const real = process.env.WORDPAIRS_COMMAND_CAPTURE_BINDING !== "mock";
const modulePath = "./ui-command-capture";
const implementation = real ? await import(modulePath) : null;
const binding: CommandBinding = implementation ? { capture: implementation.captureUiCommand, commit: implementation.commitUiCommand } : fixture();

describe(`UI command capture oracle (${real ? "real helper" : "independent correct fixture"})`, () => {
  it.each(captureCases)("preserves capture %s", async (name) => { await assertCaptureCase(name, binding); });
  it.each(commitCases)("preserves commit %s", async (name) => { await assertCommitCase(name, binding); });
  it.each(captureControls)("rejects wrong capture $name/$defect", async ({ name, defect }) => {
    await expect(assertCaptureCase(name, fixture(defect))).rejects.toThrow();
  });
  it.each(commitControls)("rejects wrong commit $name/$defect", async ({ name, defect }) => {
    await expect(assertCommitCase(name, fixture(defect))).rejects.toThrow();
  });
});
