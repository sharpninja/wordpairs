import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import type { AckOutcome } from "./ui-command-acknowledgement.contract";
import type { CapturedCommand } from "./ui-command-capture.contract";
import { assertFreshnessCase, freshnessCases, type FreshnessCase } from "./ui-command-freshness.contract";
import type { RetirementBinding } from "./ui-command-retirement.contract";

/** Independent reference: strict comparison to the rejected version, no real helper import. */
function fixture(defect?: FreshnessCase): RetirementBinding {
  const binding: RetirementBinding = {
    state: (value, scope, minimum, mode) => {
      assert.equal(value.scope, scope);
      assert(value.present && value.visible && !value.denied);
      assert(Number.isSafeInteger(minimum) && minimum >= 0);
      assert(value.busy === "true" || value.busy === "false");
      assert(value.version !== null && /^\d+$/.test(value.version));
      if (mode === "fresh") assert.equal(value.pending, "absent");
      if (value.busy === "true" || value.pending !== "absent") return "waiting";
      return Number(value.version) >= minimum ? "acknowledged" : "waiting";
    },
    retire: async (command, scope, minimum, read, until, observe) => {
      if (defect === "status-first") command.request().postDataJSON();
      assert.equal(command.status(), 409, "Only a captured conflict can enter retirement");
      const payload = command.request().postDataJSON() as { expectedVersion?: unknown } | null;
      const rejected = payload?.expectedVersion;
      if (!defect) {
        assert(typeof rejected === "number" && Number.isSafeInteger(rejected) && rejected >= 0 && rejected < Number.MAX_SAFE_INTEGER);
        assert(Number.isSafeInteger(minimum) && minimum >= 0);
      }
      const required = typeof rejected === "number" ? rejected : -1;
      await until(async () => {
        const state = await read();
        const explicit = defect === "explicit-higher" || defect?.startsWith("minimum-") ? 0 : minimum;
        const classification = binding.state(state, scope, explicit, "retire");
        const fresh = !defect || defect === "observer-attribution" || defect === "observer-error" ? Number(state.version) > required : true;
        const outcome: AckOutcome = classification === "acknowledged" && fresh ? "acknowledged" : "waiting";
        const attributed: CapturedCommand = defect === "observer-attribution" ? { ...command, request: () => ({ ...command.request(), postDataJSON: () => ({ ...payload, expectedVersion: 999 }) }) } : command;
        if (defect !== "observer-error") observe?.({ command: attributed, state, outcome });
        return outcome;
      });
    },
    commit: async (_action, options) => {
      await options.prepare();
      for (let attempt = 0; attempt < 12; attempt++) {
        const result = await options.invoke(false);
        options.validate(result.request().postDataJSON(), result.request());
        if (result.ok()) {
          const value = await result.json();
          assert.equal(await options.acknowledge(result, value), "acknowledged");
          return value;
        }
        assert.equal(result.status(), 409);
        await options.retired(result);
      }
      throw new Error("Original attempt bound exhausted");
    },
  };
  return binding;
}

const real = process.env.WORDPAIRS_UI_FRESHNESS_BINDING !== "mock";
const ackPath = "./ui-command-acknowledgement";
const capturePath = "./ui-command-capture";
const ack = real ? await import(ackPath) : null;
const capture = real ? await import(capturePath) : null;
const binding: RetirementBinding = ack && capture ? { retire: ack.retireCapturedCommand, state: ack.commandUiState, commit: capture.commitUiCommand } : fixture();

describe(`Captured conflict freshness (${real ? "real shared helper/coordinator" : "independent correct provider"})`, () => {
  it.each(freshnessCases)("preserves %s", async (name) => { await assertFreshnessCase(name, binding); });
  it.each(freshnessCases)("rejects wrong %s provider", async (name) => {
    await expect(assertFreshnessCase(name, fixture(name))).rejects.toThrow();
  });
});
