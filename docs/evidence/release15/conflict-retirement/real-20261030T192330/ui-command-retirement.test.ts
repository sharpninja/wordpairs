import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import type { AckOutcome } from "./ui-command-acknowledgement.contract";
import { assertRetirementCase, retirementCases, type RetirementBinding, type RetirementCase } from "./ui-command-retirement.contract";

/** Independent controls, loaded without the real helper at the mock gate. */
function fixture(defect?: RetirementCase): RetirementBinding {
  const binding: RetirementBinding = {
    state: (value, scope, minimum, mode) => {
      if (["retire-scope", "retire-missing", "retire-denied", "retire-malformed", "fresh-guard", "strict-guard"].includes(defect ?? "")) return "acknowledged";
      assert.equal(value.scope, scope);
      assert(value.present && value.visible && !value.denied);
      assert(Number.isSafeInteger(minimum) && minimum >= 0);
      assert(value.busy === "true" || value.busy === "false");
      assert(value.version !== null && /^\d+$/.test(value.version) && Number.isSafeInteger(Number(value.version)));
      assert(["absent", "disabled", "enabled"].includes(value.pending));
      if (mode === "fresh") assert.equal(value.pending, "absent");
      if (value.busy === "true") return "waiting";
      if (value.pending !== "absent") {
        if (mode === "retire" || value.pending === "disabled") return "waiting";
        assert.equal(mode, "matrix");
        return "pending";
      }
      return Number(value.version) >= minimum ? "acknowledged" : "waiting";
    },
    retire: async (command, scope, minimum, read, until, observe) => {
      if (defect !== "retire-non409") assert.equal(command.status(), 409);
      const owned: Promise<AckOutcome>[] = [];
      const mode = defect === "retire-busy-game" || defect === "retire-busy-room" ? "fresh" : defect === "retire-enabled" ? "matrix" : "retire";
      let problem: { error: unknown } | undefined;
      try {
        await until(() => {
          const work = (async () => {
            const state = await read();
            const outcome = binding.state(state, scope, defect === "retire-version" ? 0 : minimum, mode);
            if (defect !== "retire-observer-error") observe?.({ command: defect === "request-attribution" ? { ...command } : command, state, outcome });
            return outcome;
          })();
          owned.push(work);
          return work;
        });
      } catch (error) { problem = { error }; }
      const finished = defect === "retire-drains-wait" ? [] : await Promise.allSettled(owned);
      if (problem && !["retire-probe-error", "retire-wait-error", "retire-error-blocks-next"].includes(defect ?? "")) {
        const other = finished.flatMap((item) => item.status === "rejected" && item.reason !== problem.error ? [item.reason] : []);
        if (other.length && defect !== "retire-wait-probe-errors") throw new AggregateError([problem.error, ...other]);
        throw problem.error;
      }
    },
    commit: async (_action, options) => {
      await options.prepare();
      for (let attempt = 0; attempt < 12; attempt++) {
        const result = await options.invoke(false);
        options.validate(result.request().postDataJSON(), result.request());
        if (result.ok()) {
          const body = await result.json();
          assert.equal(await options.acknowledge(result, body), "acknowledged");
          return body;
        }
        assert.equal(result.status(), 409);
        const retired = options.retired(result);
        if (defect === "retire-blocks-next") void retired.catch(() => {});
        else await retired;
      }
      throw new Error("Existing conflict attempt bound exhausted");
    },
  };
  return binding;
}
const real = process.env.WORDPAIRS_UI_RETIREMENT_BINDING !== "mock";
const ackPath = "./ui-command-acknowledgement";
const capturePath = "./ui-command-capture";
const ack = real ? await import(ackPath) : null;
const capture = real ? await import(capturePath) : null;
const binding: RetirementBinding = ack && capture ? { retire: ack.retireCapturedCommand, state: ack.commandUiState, commit: capture.commitUiCommand } : fixture();

describe(`Captured409 retirement oracle (${real ? "real wait/mode helpers" : "independent correct provider"})`, () => {
  it.each(retirementCases)("preserves %s", async (name) => { await assertRetirementCase(name, binding); });
  it.each(retirementCases)("rejects wrong %s provider", async (name) => {
    await expect(assertRetirementCase(name, fixture(name))).rejects.toThrow();
  });
});
