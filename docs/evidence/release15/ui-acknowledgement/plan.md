# Rendered command acknowledgement test-harness repair

Parent-authorized reported test-gap repair, not a new product rule or hostile validation. Plan locked after source/effective-requirement read at2026-10-30T18:43:45 local. Parent Codex-20261027T100516Z-plugin-session / req-20261030T203656Z-cline-beam-release. Original frozen candidate fdee7a2569bb4742e008977e2a9cd7d312def859 and failed8/1/5 matrix remain historical. Diagnosis: [assessment](../frozen-fdee7a2/ui-ack-boundary-assessment.md). No exact load/transport cause is claimed.

Scope: test-only helper/oracle/provider fixtures and the matrix/strict browser adapters. No application source, schema, dependencies, API readiness injection, HTTP route mocks in live specs, cap, deadlines, timeouts or gameplay assertions change. No migration or breaking public interface. Root owns new freeze, build, full suites, actual UI matrix, strict journey and independent HV afterward. Cline/Beam/High remains the operator's current reviewer, until Monday2November, without an invented cutoff hour.

Requirements: FR-REQUESTFEEDBACK-030 and TEST-REQUESTFEEDBACK-143#UI-FEEDBACK-02/04/05; TR-CONNECTION-RECOVERY-009#TR-09-C01 and TEST-CONNECTIONRECOVERY-109#VERIFY-TR-09; TR-MULTIPLAYER-INTEGRATION-034 and TEST-MULTIPLAYERINTEGRATION-134#TR-34-C01/C02; TR-ROOM-SYNCRECOVERY-038 and TEST-ROOMSYNC-139#LIVE-02/LIVE-07; FR-ANSWERSTAGES-008#AC-45 and FR-SCORELOCK-010#AC-06/07/45. Fresh effective records, read times and hashes are linked in the assessment. No requirement/status mutation is authorized. Existing historical satisfaction remains historical.

Observable contract:

1. Before starting a fresh command, await the intended page's exact room/game panel, valid finite rendered version and busy=false. Any unknown pending control is a failure, not permission to replay an older command. No UI mutation or unobserved request waiter starts before this preparation succeeds.
2. Capture the exact Request/response/body eagerly using the existing ownership helper. Preserve current null/409/5xx/body-error semantics and all58 existing oracle cases. Validate the request action, expected profile and intended room/game path against the logical call; retries compare the entire original postDataJSON, including command ID, version, round/stage and answer held only in memory.
3. Successful driver JSON is provisional. Before return/count, await same-panel busy=false AND absent exact pending control AND a finite rendered version >= actual response.version. Busy or disabled pending means wait under existing assertion bounds. A newer version while busy/pending is insufficient. Missing/denied/malformed/wrong-scope state fails honestly. No synthetic success/status and no forced API refresh.
4. Matrix only: when that original logical call observes same-scope visible enabled pending while busy=false, retry through that exact actual UI control, retaining original payload and the existing total12-attempt bound. The following actual request must deep-equal the held original before any result is counted. A different pending command/action/profile/scope/round/payload fails; no API replay or new intent can replace it. A replay belongs to the held original call, never a later round's solve. Driver-body errors remain separately attributed from successful-driver/frontend-pending outcomes.
5. Explicit409 retains existing fresh-intent behavior only after the prior UI request is no longer busy/pending and authoritative UI is available. Stale/changed round conditions remain subject to all existing solve/round assertions. Permanent non4094xx fails, never becomes a canonical retry. Probes/observer errors cannot become permission or success.
6. Strict: add preparation and rendered acknowledgement to both generic command and answer helpers. Unresolved pending fails without adding uncertain retries; the existing four-conflict-only answer bound, private push/version/read assertions, polling suppression, deadlines and cleanup remain unchanged.
7. Retain safe per-command observations on success and failure: player/page index, phase, scope, action, UUID-only command/profile/round IDs, numeric response/rendered versions/status, busy/pending outcome and attempt. Never persist answer text, raw payload, tokens or credentials. This joins future failures to the command without fabricating attribution for fdee.
8. Before incrementing an answer solve, verify the actual intended round's scorecard and the submitting same-context player's own row show solved. Bind the initial answer action/profile/answer to that call in memory. A generic solved row, another player's solve, an old-round correct:true replay, or an unresolved prior command cannot establish this round's solve. The SAME oracle includes correct own-round state and wrong actor, wrong row, wrong round and unsolved controls before live-spec edits.

Implementation seam: a small test-only acknowledgement classifier/wait coordinator consumes a snapshot port plus condition-wait port. The browser adapter reads the already existing .game-panel/.room-panel aria-busy and version attributes plus exact scoped pending control. Independent scripted providers drive the same oracle as the real helper. The real matrix commit hook runs acknowledgement outside the JSON parsing catch, so a probe/denial error is never misclassified as a body-read error. Optional backward-compatible hooks preserve the58 prior test cases byte-for-byte; both real browser adapters supply the required acknowledgement hooks.

First write a shared contract oracle and independent correct/wrong providers. Required named scenarios, each with a deliberately incorrect counterpart rejected as an expected negative control:

- ACK01: successful driver body waits for a deferred frontend acknowledgement before returning or counting.
- ACK02: newer version plus busy=true never counts; busy=false later completes.
- ACK03: newer version plus pending never counts as acknowledgement.
- ACK04: matrix enabled same-scope pending retries the held original, then acknowledges once.
- ACK05: disabled pending/busy waits and never clicks until enabled and not busy.
- ACK06: strict pending fails without retry.
- ACK07: unknown pre-existing pending prevents any fresh UI action.
- ACK08: wrong-scope pending/panel fails without retry.
- ACK09: changed command ID on retry is rejected.
- ACK10: changed full payload, including round/stage/expected version, is rejected.
- ACK11: wrong initial action/profile/aggregate is rejected before accepting its result.
- ACK12: missing or denied panel cannot acknowledge success.
- ACK13: stale rendered version waits; qualifying later version acknowledges.
- ACK14: malformed version/busy/pending shape fails rather than coercing success.
- ACK15: acknowledgement/probe failure propagates as its original error, not driver-body loss or recovery permission.
- ACK16: repeated pending reaches the unchanged12 bound and fails, never silently succeeds.
- ACK17: permanent4xx never retries or acknowledges.
- ACK18: explicit409 still retires the UI request before a fresh intent; no stale pending replay.
- ACK19: body-error recovery keeps the existing exact-original retry and body diagnostic distinction.
- ACK20: acknowledgement/safe-observer failure cannot turn failure into success or leak payloads.
- ACK21: old-round canonical replay remains attached to the held call; unknown old pending before a new-round call fails and cannot increment that round's solve.
- ACK22: all started request/action/probe work is observed and settled before helper failure returns, with original error provenance preserved.

Use deferred promises/condition updates, no fixed sleeps. Wrong providers must violate the named observable interaction, not merely throw an arbitrary error. Extend case enumeration only if source inspection exposes a necessary sibling; record actual counts rather than claiming the planned22 equals native counts. Retain independent mock/native output and oracle/provider hashes before changing any shared helper or live spec. Mock exit: every positive passes, every wrong control is rejected, zero failures/skips.

Only after that gate implement the real helper/classifier and wire both actual adapters. Bind the identical oracle/inputs/assertions to the real helper, with no expected-value changes. Retain chronological edits and immediate shared code-verification hook plus direct tsc after each TypeScript edit. Focused real exit: all new cases plus unchanged58 previous cases pass, zero failures/skips; scoped Biome and source diff checks pass, direct typecheck passes. Any failure remains retained and corrected with its own chronology. PowerShell automation is parser/PSSA checked and WhatIf first. Do not normalize native stdout whitespace or rewrite earlier receipts.

Consolidated receipt records original/final file hashes, exact commands, native counts and negative controls, chronology, source-stopped timestamp, focused limitations and own MCP full response/readback. No full UI success, latency fix, release completion, requirement satisfaction or HV approval follows from focused mock/real contract success alone.
