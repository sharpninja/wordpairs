# Captured conflict projection freshness repair

Authorized test-only reported-bug repair. Parent turn: Codex-20261027T100516Z-plugin-session / req-20261030T203656Z-cline-beam-release. Own turn: Codex-20261030T200118Z-plugin-session / req-20261031T005544Z-conflict-freshness-repair. This is implementation preparation and self-check, not HV or release completion.

## Evidence and decision

Preserve frozen c1181eb normal matrix11pass/1fail13/2skip and unrun strict unchanged. Its retained diagnosis is `../frozen-c1181eb/live-ui/readiness13-supplement/diagnosis.json` (CAC60B368064A34B638854B72C0E916C2D0657BC1ADC0A1846844CEA4DE11BBF). Twelve distinct player11 readiness commands were409 and each retirement observed rendered32/idle/no pending; all13 snapshots remained connected/full roster,11ready/2notready. The exact rejected payload versions and409 bodies were not retained. Therefore repeated stale submissions are a source-supported explanation, not a proven exact server cause. Transport/load/latency causality remains unresolved.

Actual `ui-command-acknowledgement.ts:78..81` accepts caller minimum0 without comparing captured expectedVersion; matrix `live-player-counts.integration.spec.ts:84..87` supplies0. `room-screen.tsx:308..310,347..365` uses rendered room.version for a new intent and tells a409 user to refresh, without ordinary lobby automatic refresh. Strict `live-multiplayer.integration.spec.ts:114..116` already explicitly requires advancement. Original source hashes are pinned in the diagnosis and copied/hash-verified before mock validation. This correction strengthens the existing test boundary; it does not impose new application refresh behavior.

Fresh effective QBrain snapshot: `effective-requirements.json`. Support is FR-REQUESTFEEDBACK-030 / TEST-REQUESTFEEDBACK-143#UI-FEEDBACK-02,04,05; TR-CONNECTION-RECOVERY-009#TR-09-C01 / TEST-CONNECTIONRECOVERY-109#VERIFY-TR-09; TR-MULTIPLAYER-INTEGRATION-034 / TEST-MULTIPLAYERINTEGRATION-134#TR-34-C01,C02; TR-ROOM-SYNCRECOVERY-038 / TEST-ROOMSYNC-139#LIVE-02,LIVE-07. Existing satisfaction/evidence is preserved, including changed release criteria still false. No QBrain writes or new standalone AC type.

## Locked behavior and blast radius

Only shared test helper `retireCapturedCommand` changes behavior: check captured status409 first; read exact request payload expectedVersion; require a nonnegative safe integer strictly below MAX_SAFE_INTEGER, and a nonnegative safe-integer explicit minimum. Before any state probe/wait, reject missing, null, nonnumeric, negative, fractional, NaN, infinity, unsafe or overflow versions. Required rendered floor is `max(explicit minimum, captured expectedVersion + 1)`.

Existing wait/classifier retains same-panel identity, denied/missing/malformed failures, idle/pending-free retirement, observer error propagation and ownership/draining of every started probe. No replay/new intent until that floor is actually observed. A nonadvancing server history fails honestly within existing assertion bounds. Matrix keeps12 attempts, exact-original-payload uncertain recovery, intended-round/own-player solve assertions. Strict keeps four-conflict-only behavior, outer greater-than-before assertion and fail-only success acknowledgement. No app, policy, cap, schema, dependency, deadline, retry limit, sleeps, API refresh or HTTP route mocks change.

Safe additive instrumentation: add only `expectedVersion: number | null` to both existing commandAcknowledgements records, from the exact captured request and only a nonnegative safe integer. New oracle observer assertions verify captured request identity/value and its error propagation; actual browser push adoption is source-checked, not claimed to be DOM-tested by isolated contracts. No answer/raw payload/token/409 body is persisted.

## Mock-first oracle

Add `tests/browser/ui-command-freshness.contract.ts` and `.test.ts`. The SAME exported assertion function and inputs bind an independent correct/wrong provider first, then actual `retireCapturedCommand`, `commandUiState` and `commitUiCommand`. The provider selection changes, assertions do not. Do not edit the old162 contract/provider files or gameplay assertions.

Named positive cases, each with a corresponding deliberately wrong provider rejected inside a passing harness:

- `room-stale`, `game-stale`: min0 must observe rejected11 as waiting, then12 as acknowledged.
- `explicit-higher`: caller14 dominates rejected11;12 waits,14 acknowledges.
- `captured-higher`: rejected12 dominates caller0;12 waits,13 acknowledges.
- `zero`, `max-valid`: version0 requires1; MAX_SAFE_INTEGER-1 requires MAX_SAFE_INTEGER without overflow.
- `no-advance`: stale projection exhausts the existing scripted wait, preserves its original error and blocks any next coordinator intent.
- `deferred-next`: actual shared coordinator cannot invoke its next command until a held stale-to-fresh retirement completes; next request is a fresh conflict retry, never uncertain replay.
- `observer-attribution`: exact captured Request, expectedVersion and status survive every observation; a substituted request/version is rejected.
- `observer-error`: original observer failure blocks the next coordinator intent and remains the original error.
- `status-first`: non409 rejects before reading even a throwing payload, before wait/probes or next intent.
- `version-missing`, `version-null`, `version-string`, `version-boolean`, `version-fraction`, `version-negative`, `version-nan`, `version-infinity`, `version-unsafe`, `version-max-safe`: malformed/unsupported captured version rejects before wait/probe or next intent.
- `minimum-negative`, `minimum-nan`, `payload-null`: invalid explicit floor or missing object rejects before wait/probe or next intent.

These24 pairs add48 isolated cases. Retain all prior162 cases, for210 focused mock and real cases,105 expected-negative controls,0fail/0skip. Wrong controls include ignoring captured floor, ignoring explicit floor, accepting equal version, premature/unawaited retirement, swallowing wait/observer failures, substituting request/version and accepting each malformed version.

## Chronology and gates

1. Save this decision-complete plan, fresh effective scope, protected implementation and all prior162 oracle/provider source copies/hashes. Record source HEAD and dirty status, without git mutation.
2. Write the independent SAME oracle/provider. Immediately after EACH TS edit run the isolated Codex code-verify hook plus direct `npm exec tsc -- --noEmit --pretty false`; resolve any failure before another edit. Parser/PSSA and WhatIf first for PowerShell producers.
3. Run focused mock binding over new48 plus old162, retain native JUnit/log/source/producer hashes, verify0fail/0skip and105 expected negatives. Assert all protected implementation and old fixture bytes still match before and after mock. No helper or observer-adapter edit until this green gate.
4. Implement only shared floor/version validation, with hook and direct typecheck0. Add the two safe observation fields separately, each followed immediately by hook/direct typecheck0. Preserve old fixture bytes and strict/matrix assertions.
5. Bind SAME new oracle to real helper/coordinator and rerun all210,0fail/0skip. Retain original gate receipts, no overwrites. Run scoped source Biome/diff/typecheck and pin actual counts, failures and warnings.
6. Log decisions/full result and canonical readback. Signal SOURCE STOPPED. Root owns the next freeze/full unit, PostgreSQL, browser, PowerShell, Realtime, normal2..15, strict runtime and independent Cline/Beam/High HV. Isolated green does not establish full runtime, latency cause, public capacity or release completion.
