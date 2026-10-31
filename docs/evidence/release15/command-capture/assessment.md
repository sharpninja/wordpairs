# Test-only command capture result and limits

The current shared adapter captures the exact Request's response and successful JSON while its UI action is pending, caches one body outcome, and drains every started task before returning or propagating failure. Synchronous waiter-registration failure prevents an unobserved action. Separate response/action and cached-body/action failures preserve both original errors. Null responses remain status 0; 409/5xx bodies are intentionally unread.

The matrix now uses that adapter and the same bounded twelve-attempt coordinator. A successful-status JSON failure authorizes retry only after the actual same-page exact pending-request button is visible and enabled. It preserves the whole canonical payload, including command ID, and asserts the next real UI request matches it. Absent, disabled or inaccessible pending UI surfaces the original body error. Unrelated action/capture failures do not enter that branch. Strict command/answer helpers use eager capture while retaining their original four-conflict-only behavior.

Matrix failure and final artifacts retain safe body-error attribution: actual page index, phase, allowlisted action, UUID-only command/profile IDs, actual status and whether the enabled pending control was observed. The observer receives the original Request; observer failure cannot manufacture acceptance and retains the original body error.

The original `cca320b` failure remains failed historical evidence. All nine captured pages were open/live connected with a full roster in round 2; one page showed a pending retry. The original diagnostics do not join that pending command to the exact driver body failure, and the generic navigation hint is not proof of navigation. The repair addresses the observed lifetime/uncertainty classes without claiming a proven driver-cache or network cause, or claiming a full-game pass.

Chronological isolated gates:

- V1 independent mock: 56 passed, zero failed/skipped at 2026-10-30T18:08:31; helper absent. Identical V1 real binding: 56 passed, zero failed/skipped at 18:09:44. These original reports remain unchanged.
- Parent and capacity's contextual read identified the untested cached-body-plus-action sibling. V2 independent mock: 58 passed, zero failed/skipped at 18:13:22, with the V1 helper pinned unchanged. Only afterward was the minimal combined-error retention correction implemented.
- Identical V2 real binding: 58 passed, zero failed/skipped at 18:14:24. The V2 contract/test hashes match between mock and real. This comprises 29 positive cases and 29 expected-negative rejection controls, not 58 browser journeys.
- Every TypeScript edit has an immediate Codex hook and direct typecheck receipt. Final scoped Biome lint and source diff check exit 0. `source-check.json` remains V1; `source-check-final.json` reports the current unit delta of 58. No actual UI lane or build was run by this agent.

The source diff preserves the fifteen-player cap, separate observer cap, original payload equality, retry bounds, existing timeouts, eight rounds, all solve/ranking assertions, readiness barrier, cleanup and normal-polling versus strict-push qualifications. Application/schema/dependency/provider configuration remains unchanged. Current effective requirements were read only; no requirement/criterion status was changed. Historical LIVE-02/TR09 satisfaction is not refreshed by these isolated tests; TR34-C01/LIVE-07 remain pending release evidence.

Parent must freeze this candidate and run the entire applicable source/build/PostgreSQL/browser/Realtime/normal UI matrix/strict UI evidence chain, followed by the required independent review. No product done claim or hostile approval is made here. Accuracy 99%, completeness 98% for this test-only increment; actual game, hosted and physical acceptance remain outside this result.
