# Acceptance-Criteria Gap Analysis

**Baseline reviewed:** `word_association_game_requirements.md` v2.5  
**Review date:** 26 October 2026  
**Active criteria:** 45 (AC-01–33, AC-37–39, AC-41–47, AC-50–51)  
**Retired identifiers:** AC-34, AC-35, AC-36, AC-40, AC-48, AC-49 (reserved; technical-requirement verification only)

## 1. Current status

The active baseline has 45 ACs and [`ac_test_inventory.md`](ac_test_inventory.md) maps them to 64 planned test case IDs. This is planned traceability, not authored or passing coverage. Phase 0 remains planning-only. No executable tests or application code may be written until Phase 0 exits; after exit, all active AC contract tests must pass against mocks before any project implementation code is written.

Deployment, provisioning, environment isolation, build gates, and deployed SWBOM checks are TR-only or operational evidence. No AC depends on a deployed artifact, and no deployment or account check counts toward AC coverage. AC-39, AC-41, and AC-42 remain active because they cover attribution records and source archive contents that can be tested using temporary manifests/files and fixture SWBOM/license inputs. AC-37 is application behavior for a quota response and is mockable. AC-38 is a traceability/process contract, not a deployment gate.

The 2-player holdout outcome is resolved: after the five-second warning expires, keep the holdout and wait without starting countdown until both players are ready. For rooms with more than two players, an unready holdout is removed and the countdown begins. Before countdown, a departing player in a full room is replaced by the oldest observer and the remaining player order compacts; after countdown lock, a departure is not replaced. These behaviors appear in FR-03/FR-19/FR-20, AC-30–33, and the test inventory.

## 2. Remaining Phase 0 blockers

These decisions affect active AC expected results and must be approved or formally resolved in the requirements before the global mock gate:

| Priority | Area | Missing decision or precision | Affected criteria |
|---|---|---|---|
| P0 | Account identity feasibility | Verify eligibility for the specified OpenAI OIDC integration. If unavailable, choose and baseline a supported provider or revise the account sign-in behavior. | AC-20, AC-46 |
| P0 | Match and scoring | Set match length, stage duration, no-response/no-solver outcome, normalization and accepted-answer policy, total-time aggregation, and final tie behavior. | AC-06–14, AC-45 |
| P0 | Readiness lifecycle | Confirm countdown duration, host authority, and timer reset/cancellation semantics; preserve the already confirmed 2-player exception. Specify ordering for simultaneous ready, leave, and expiry events. | AC-30–33 |
| P1 | Lobby policy | Define quick-match selection/tie behavior, discoverability default, observer limit, room-code expiry/invalid behavior, invite context after inviter departure, reconnect, and creator departure. | AC-01–02, AC-22–28, AC-30–33, AC-51 |
| P1 | Public landing contract | Approve leaderboard metric/window, identity labels and guest inclusion, tie order, public lobby field allowlist/count precision/freshness, and rules-summary source. Keep private data excluded as already required. | AC-43, AC-50 |
| P1 | Moderation and suggestions | Define unique nomination counting, duplicate/self-nomination rules, moderation roles/states/reasons, review trigger, appeals/removal, and 10-win scope. | AC-17–19, AC-47 |
| P1 | Free-tier service behavior | Set supported concurrency target and the exact recoverable quota/service-limit response; do not add paid fallback. | AC-37 |
| P2 | Reactions and accessibility detail | Approve reaction display duration/rate limit; define any additional screen-reader and background-fallback acceptance needed beyond AC-44. | AC-29, AC-44 |
| P2 | Release archive policy | AC-41/42 cover fixture-verifiable archive contents. Decide archive format, source completeness rule, checksum/reproducibility policy, and notice manifest details as operational/TR contract details, without making deployment an AC dependency. | AC-39, AC-41–42; TR-25, TR-28–29 |

## 3. Traceability and coverage gaps

The inventory gives each active AC one or more planned IDs, but several entries describe later real-system integration evidence. Those entries are not AC coverage by themselves. Each active AC must have at least one mock-validated application or document/archive contract before implementation. Real database/provider/browser checks are additional integration evidence where relevant; deployment/account checks are TR-only.

| Requirement area | Existing coverage | Remaining gap or test-specification action |
|---|---|---|
| Server authority, answers, privacy | AC-09, AC-28, AC-45; architecture TR-01–05 | Add explicit adversarial payload cases for client attempts to alter scores, roster, category choice, results, and event order if those behaviors are asserted by the finalized requirements. Keep the acceptance oracle in local/mockable application contracts. |
| Timing and concurrency | AC-10–14, AC-30–33, AC-51 | Fix equal-time ordering and timer invalidation semantics; retain deterministic clock/scheduler cases. Database locking/durability proof is TR integration evidence and cannot replace mock AC coverage. |
| Catalog and moderation | AC-16–19, AC-47 | Specify fixtures for disabled/unapproved/incomplete content, duplicate nominations, moderation transitions and audit expectations after policy approval. |
| Identity | AC-20–21, AC-46 | Resolve provider feasibility and guest/session lifecycle; inventory currently marks entitlement as a planning dependency. |
| Lobby, invitations, observers | AC-01–02, AC-22–33, AC-51 | Resolve code and lifecycle edge cases, then add explicit mock cases for invalid/expired links, stale capacity, and simultaneous membership commands where those outcomes are baselined. |
| Public landing | AC-43, AC-50 | Freeze public DTO field list and ranking/freshness behavior; test allowlisting against adversarial private fields and empty/unavailable fixtures. |
| Attribution and source release | AC-39, AC-41–42 | Test temporary manifests and archives with missing notices, incomplete source, malformed/mismatched fixture SWBOM, and missing GPL text. Do not inspect or depend on a deployed artifact. |
| Architecture boundary | AC-51 | Separate mockable application guarantees (port use, conflict handling, idempotency intent, outbox intent) from actual DB serialization/durability proof, which remains a later TR integration check. |
| Deployment and operations | TR-20–TR-29 | Keep all Vercel/account/branch/environment/deployed SWBOM checks outside the AC inventory. Validate mockable script/build contracts test-first as TR work; record real operational evidence separately. |

## 4. Prior findings and dispositions

| Earlier finding | Current disposition |
|---|---|
| AC-02/AC-22 used inconsistent fixed capacity limits | Resolved: current criteria use configured capacity (2–25). |
| Two-player timeout could remove the second player and start below minimum | Resolved by user: exactly two players keep the holdout and wait for both ready; AC-32-T04 covers it. |
| Deployment topology was treated as a Phase 0 gate | Resolved: topology/account capacity is a Phase 1 provisioning-entry decision, not a Phase 0 gate. |
| Deployment/build/release automation appeared as AC-34/35/36/40/48/49 | Resolved in v2.5: IDs are retired and reserved; mapped requirements are verified as TR-only/operational evidence. |
| AC coverage could rely on a deployed build or artifact | Resolved: no AC depends on deployed artifacts. Mockable application or fixture contracts provide AC coverage; deployment evidence cannot satisfy it. |
| “SWBOM release archive” could be read as deployment gate behavior | Refined: AC-41 checks temporary source archive contents and fixture SWBOM path/validity/commit match; actual deployment SWBOM serving is TR-only. |

## 5. Phase 0 exit actions

1. Close all P0/P1 decisions that affect active expected results, or formally revise affected ACs out of the active baseline.
2. Freeze public interfaces, domain policies, database schema/RLS/transaction contracts, scheduler behavior, and the approved dependency/toolchain proposal.
3. Refine all 64 planned cases into exact assertions, mock behavior, and evidence type; ensure every one of the 45 active ACs has a mockable AC contract test.
4. Keep real database/provider/deployment checks in separate TR integration/operational records. They can neither establish nor substitute for AC coverage.
5. Pass the Phase 0 hostile review and obtain baseline approval. Only then author executable tests; validate all active AC tests against mocks before project implementation code.

## 6. Review limits

This document records requirement completeness, consistency, feasibility, and testability gaps in the v2.5 baseline. It does not claim test execution, resolve product decisions, verify an external account entitlement, or provide deployment evidence. Planned IDs are not passing coverage.
