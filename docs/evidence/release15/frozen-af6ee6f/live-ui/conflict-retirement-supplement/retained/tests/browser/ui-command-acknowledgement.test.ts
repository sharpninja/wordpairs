import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { ackCases, assertAckCase, type AckBinding, type AckCase, type AckCommitOptions, type AckMode, type Scope, type UiCommandState } from "./ui-command-acknowledgement.contract";

// Independent state/interaction providers. No real helper is loaded at the mock gate.
function fixture(defect?: AckCase): AckBinding {
  return {
    state: (value: UiCommandState, scope: Scope, minimum: number, mode: AckMode) => {
      if (defect && ackCases.slice(0, 10).includes(defect as typeof ackCases[0])) return "acknowledged";
      assert.equal(value.scope, scope);
      assert(value.present && value.visible && !value.denied);
      assert(Number.isSafeInteger(minimum) && minimum >= 0);
      assert(value.busy === "true" || value.busy === "false");
      assert(value.version !== null && /^\d+$/.test(value.version) && Number.isSafeInteger(Number(value.version)));
      if (value.busy === "true") return "waiting";
      if (value.pending !== "absent") {
        assert.equal(mode, "matrix");
        return value.pending === "enabled" ? "pending" : "waiting";
      }
      return Number(value.version) >= minimum ? "acknowledged" : "waiting";
    },
    solve: (value, alias, round) => {
      if (defect && ["wrong-actor", "wrong-row", "wrong-round", "unsolved"].includes(defect)) return;
      assert.equal(value.actorAlias, alias); assert.equal(value.rowAlias, alias);
      assert.equal(value.round, defect === "own-current" ? round + 1 : round);
      assert.equal(value.solved, true);
    },
    commit: async (action: string, options: AckCommitOptions) => {
      const prepared = options.prepare();
      if (defect === "wait-for-preparation") void prepared.catch(() => {});
      else try { await prepared; } catch (error) { if (defect !== "preexisting-blocks-action") throw error; }
      let mode = false;
      let held: unknown;
      for (let remaining = defect === "bounded-pending" ? 11 : 12; remaining > 0; remaining--) {
        const response = await options.invoke(mode);
        const payload = response.request().postDataJSON();
        if (mode && defect !== "changed-command" && defect !== "changed-payload") options.assertPayload(payload, held);
        if (!["changed-command", "changed-payload", "wrong-intent", "wrong-profile", "wrong-aggregate"].includes(defect ?? "")) options.validate(payload, response.request());
        if (!response.ok()) {
          if (response.status() === 0 || response.status() >= 500) {
            options.uncertain(); held ??= payload; mode = true; continue;
          }
          if (defect === "permanent-denial") return {};
          assert.equal(response.status(), 409);
          if (defect === "conflict-drains-retirement" || defect === "retirement-error") void options.retired().catch(() => {});
          else if (defect !== "conflict-retired") await options.retired();
          mode = false; held = undefined; continue;
        }
        let body: unknown;
        try { body = await response.json(); }
        catch (error) {
          const pending = await options.pendingReady();
          if (defect !== "body-error-distinct") options.bodyError({ request: response.request(), status: response.status(), pending });
          if (!pending) throw error;
          options.uncertain(); held ??= payload; mode = true; continue;
        }
        if (defect === "wait-for-ack") return body;
        const acknowledgement = options.acknowledge(response, body);
        if (defect === "drain-ack-error") { void acknowledgement.catch(() => {}); return body; }
        let outcome: "acknowledged" | "pending";
        try { outcome = await acknowledgement; }
        catch (error) { if (defect === "probe-error") return body; throw error; }
        if (outcome === "acknowledged") return body;
        try { options.uncertain(); }
        catch (error) { if (defect === "observer-error") return body; throw error; }
        held ??= payload; mode = true;
        if (defect === "pending-identical") mode = false;
      }
      throw new Error(`UI ${action} did not converge through explicit conflict/uncertain retries`);
    },
  };
}
const real = process.env.WORDPAIRS_UI_ACK_BINDING !== "mock";
const ackModulePath = "./ui-command-acknowledgement";
const captureModulePath = "./ui-command-capture";
const acknowledgement = real ? await import(ackModulePath) : null;
const capture = real ? await import(captureModulePath) : null;
const binding: AckBinding = acknowledgement && capture ? { state: acknowledgement.commandUiState, solve: acknowledgement.assertOwnRoundSolve, commit: capture.commitUiCommand } : fixture();

describe(`UI acknowledgement oracle (${real ? "real helpers" : "independent correct provider"})`, () => {
  it.each(ackCases)("preserves %s", async (name) => { await assertAckCase(name, binding); });
  it.each(ackCases)("rejects wrong %s provider", async (name) => {
    await expect(assertAckCase(name, fixture(name))).rejects.toThrow();
  });
});
