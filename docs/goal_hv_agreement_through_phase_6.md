# Goal: Hostile Validation Agreement Through Phase 6

**Goal status:** Active; planning baseline completed, implementation not started  
**Repository:** `sharpninja/wordpairs`  
**Baseline:** Requirements v2.6  
**Review threshold:** Independent hostile validation must score at least 98% for both accuracy and completeness, with no unresolved material findings, at each phase exit through Phase 6.

## Goal statement

Deliver Wordpairs through coding Phase 6 and obtain independent hostile-validation agreement at every phase boundary. Agreement means the reviewer verifies the exact repository commit, finds no unresolved material contradiction or coverage gap, and scores at least 98% on both accuracy and completeness. Correct findings and repeat validation until both scores meet the threshold. Preserve the project's approved requirements, Byrd Development Process v4, strict mock-first TDD gate, and Phase 7 deployment boundary.

## Current state

- Phase 0 was approved by the user on 26 October 2026.
- The detailed Phase 1–6 plan is documented and remote-reviewed at commit `fb9225b931b262c74fbf03ad52503a1a3a5b43b0` with 99% accuracy and 99% completeness; the complete output is in `repo_review_receipt.jsonl`.
- The current plan covers 45 active ACs. Its inventory has 67 planned AC test IDs; two TR-30 and six TR-31 cases are separately identified. The original Phase 0 approval receipt's count of 65 records the inventory at approval time, before two appeal-coverage cases were added.
- The test-only Node/Vitest candidate passes 315 tests: 67 primary AC scenarios, 27 supplemental scenarios, four separate TR-19 reaction cases, and 111 named AC semantic controls. The latest exact-commit review (`eb5aba2111d5581b4b88f615165ec8d7c1e34060`) scored 96% accuracy and 94.6% completeness before these fixes; a fresh exact-commit review is pending. The global test gate remains incomplete; no production implementation has been created.
- Deployment remains Phase 7, after coding Phases 1–6. No AC depends on deployed artifacts, and deployment checks do not count as AC evidence.

## Non-negotiable constraints

1. **Resolve from the approved requirements.** Do not reopen decisions already fixed in Requirements v2.6 or ask the user to repeat them. Update the requirements and test mapping before implementation only if evidence exposes a genuine semantic conflict.
2. **Global mock-first gate.** After Phase 0 approval, bootstrap only reviewed test tooling/configuration, then author executable tests for every active AC and validate the entire suite against mocks/fakes before any production code. Mocks must expose meaningful behavior and failures; they must not return the expected answer directly.
3. **Incremental BDP v4 TDD.** Within each Phase 1–6 increment, maintain AC-to-test traceability, follow Red → Green → Refactor, and run the full applicable suite before closing the increment. No failed or skipped tests at a phase exit.
4. **Separate evidence tiers.** AC contract evidence is mockable and independent of deployment. Local/disposable database and provider checks are additional TR integration evidence; deployed artifact checks never satisfy AC coverage.
5. **No deployment before Phase 7.** Do not provision, connect, preview-deploy, or release during coding Phases 1–6. Phase 7 is after all coding and final AC validation.
6. **Project constraints.** Use the approved Vercel/Supabase Free-tier target, do not depend on GitHub Actions, preserve GPL-2.0-only licensing, attribution, and the per-release SWBOM requirement.
7. **Independent review.** Use GPT-5.6 Sol High for implementation/coding and reserve GPT-6 Astra xhigh for independent hostile validation after implementation. At each phase exit, review the exact immutable GitHub commit with a hostile reviewer independent from implementation. Record the complete request, rubric, reviewer output, scores, findings, corrections, and final disposition in JSONL. Iterate until reviewer and implementation owner agree at 98% or higher for both measures.

## Milestones and exit evidence

| Milestone | Scope | Required exit evidence |
|---|---|---|
| **Phase 0 — Approved baseline** | Requirements v2.6, architecture, interfaces, schema/security contracts, traceability, dependency/license review, and phased plan. | User approval receipt; exact-commit hostile review at ≥98/98; no unresolved product decision. **Status: complete.** |
| **Pre-implementation — Global test gate** | Reviewed test-only harness; executable contract tests for all active ACs; deterministic fakes/mocks, clocks, random sources, and fixtures. | 45/45 active ACs map to meaningful reusable scenarios; each scenario asserts concrete raw observations and rejects relevant semantic failures; suite has zero failures/skips; exact commit receives hostile review ≥98/98. Product conformance is tested against each real increment separately. **Status: incomplete; the 26 October review scored 82/75 and production work is blocked.** |
| **Phase 1 — Core application foundation** | Application skeleton, domain/application ports, persistence/security adapters, migrations, idempotency/outbox, quota handling. | Increment tests and regression green; local/disposable database evidence separately filed as TR; domain boundaries and AC traceability complete; phase hostile review ≥98/98. |
| **Phase 2 — Landing, identity, rooms** | Anonymous leaderboard/lobby/rules, guest and OIDC profiles, room creation/join, browse/quick match, invites and observer boundaries. | Mock contracts and local multi-client tests green; privacy and capacity invariants verified; phase hostile review ≥98/98. |
| **Phase 3 — Lobby/readiness** | Ordered rosters, observer promotion before countdown, compaction, ready state, idle prompt, holdout warning, countdown lock and departure policy. | Fake-clock tests cover the 30s prompt, 5s warning, 10s countdown, two-player holdout exception, larger-room boot, and no replacement after countdown; race regressions green; phase hostile review ≥98/98. |
| **Phase 4 — Content and match engine** | Catalog validation, match setup, rounds, answer checks, scoring, hints, reveal, standings and ties. | Deterministic mock tests for all applicable ACs and local persistence integrations green; privacy/result invariants verified; phase hostile review ≥98/98. |
| **Phase 5 — Moderation and social features** | Nominations, category suggestions, moderation, appeals, reactions. | Threshold, role, audit, appeal separation/outcomes, curation, reaction constraints, and all applicable AC tests green; phase hostile review ≥98/98. |
| **Phase 6 — UX and final acceptance** | Responsive/accessibility work, loading/offline/reconnect states, full end-to-end acceptance, final privacy/security review. | 45/45 active ACs pass with zero failures/skips; all TR evidence is separate; human checks and source documentation complete; exact-commit hostile review ≥98/98 with no unresolved material findings. **The goal is achieved only after all Phase 6 exit conditions are met.** |
| **Phase 7 — Deployment and release** | Vercel/Supabase provisioning, deployment, operations, and GPL source release with SWBOM. | Explicitly outside this goal; starts only after Phase 6 completion and is not AC-bound. |

## Phase 1–6 delivery slices

Use the detailed package decomposition in [`implementation_plan.md`](implementation_plan.md): Phase 1A–1C; 2A–2C; 3A–3B; 4A–4B; 5A–5B; and 6A–6B. Each package must state its AC/TR scope, mock-first assertions, implementation boundary, regression command, and required evidence before work begins. Do not count test IDs as executed coverage until the test exists and its result is recorded.

## Lobby rules to preserve

- Before countdown starts, if a player leaves a full room, promote the oldest observer into the last player position and compact the remaining player order.
- Once all active players are ready—or an expired holdout is removed in a room with more than two players—the countdown starts and the roster locks. A departing player is not replaced after that point.
- When all but one player is ready, warn the holdout for five seconds. If the warning expires, remove them and begin countdown only when more than two players were in the room. In a two-player room, retain the holdout and wait for both players.
- An unchanged lobby prompts all players to mark readiness after 30 seconds. A valid lobby membership/readiness change resets the interval.

## Completion record

Append a milestone record after each exit with: phase/package IDs; exact repository commit; AC/TR scope; test names and commands; pass/fail/skip counts; mock or integration boundaries; human-evidence status; hostile reviewer rubric and full output; accuracy/completeness scores; findings and resolved changes; and reviewer/owner agreement. The goal remains active until Phase 6 evidence meets all exit conditions above.
