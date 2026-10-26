# Implementation Kickoff: Phase 0 Execution

**Status:** Phase 0 approved; AC mock-oracle gate incomplete after hostile review; Phase 1A blocked  
**Requirements baseline:** `word_association_game_requirements.md` v2.6  
**Execution date:** 26 October 2026  
**Target:** `sharpninja/wordpairs`

## 1. Current baseline

The user approved Phase 0 on 26 October 2026. Planning artifacts and the v2.6 baseline are approved. The current test-only candidate passes 316 tests: 67 primary AC scenarios, 27 supplemental scenarios, four separate TR-19 reaction contract cases, and 112 named AC semantic controls. The latest exact-commit hostile review at `afd3371913e44ee0cf8eeb8a61a7880c6fc57405` scored 97% accuracy and 99% completeness and identified AC-38 planned-status acceptance plus stale evidence labels; these are corrected in the pending candidate. A fresh exact-commit hostile review is pending. The global mock-oracle gate remains incomplete; Phase 1A stays blocked until independent review scores at least 98/98. Passing tests validate mock assertions only, not product behavior.

The requirements contain 22 functional requirements, 31 technical requirements, and 45 active acceptance criteria. The six retired IDs AC-34, AC-35, AC-36, AC-40, AC-48, and AC-49 remain reserved and are verified only through their mapped technical requirements. [`ac_test_inventory.md`](ac_test_inventory.md) maps all 45 active ACs to 67 test oracles. The oracle suite proves assertion sensitivity, not product conformance. The user approved the v2.6 baseline, architecture, interface contracts, and Phase 0 exit. All product choices affecting active AC expected results are resolved.

## 2. Phase 0 gate status

| Gate | Current evidence | Status | Remaining work |
|---|---|---|---|
| Requirements baseline | Requirements v2.6; 45 active ACs (51 numbered IDs including six retired TR-only IDs); all FR/TR IDs mapped in [`architecture_design.md`](architecture_design.md) | Approved by user | Record approval in the Phase 0 receipt; any later behavior change requires a formal requirements and test change. |
| DDD and concurrency direction | Modular monolith, context split, ports/adapters, aggregate transactions, idempotency, outbox and SVG diagrams in [`architecture_patterns.md`](architecture_patterns.md) and [`architecture_design.md`](architecture_design.md) | Approved for implementation | ADR and interface contracts are recorded; evolve only through reviewed requirements/design changes. |
| Test traceability | 45 active ACs map to 67 planned AC case IDs; deployment-only IDs are retired and mapped to TR-only verification | Inventory and schema guard present; full meaningful scenario coverage not yet validated | Correct each scenario/assertion and relevant semantic negative control. Then run the same reusable assertions against real behavior as implemented; keep product-conformance evidence distinct. TR and deployment checks never count as AC coverage. |
| Test-harness bootstrap | Test-only dependencies and licenses are documented in [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md); package-lock.json records installed test dependencies | Corrected candidate passes 316 tests; fresh exact-commit hostile review pending | Candidate includes full-schema/source/archive/notices validation, snapshotted driver requests, concrete supplemental AC scenarios, and separate TR-19 tests. Obtain exact-commit 98/98 review before Phase 1A. No product implementation exists. |
| Deployment topology | Vercel Hobby + Supabase Free, no GitHub Actions, manual provisioning, SWBOM/release gates documented | Constraints accepted; deployment follows coding | Do not provision or deploy during coding Phases 1–6. Finalize branch/project mapping and verify account capacity at Phase 7 entry. These TR checks do not change AC expectations. |
| Data/security design | DDD ownership, projection boundaries, and candidate persistence/security contracts are documented | Approved design baseline | Implement and validate the schema/security contract through tests before the Phase 1 persistence adapter. |
| Public interfaces and data contracts | Approved commands, queries, typed failures, event audiences, logical relations, RLS and transaction invariants are documented in [`phase0_interface_and_data_contracts.md`](phase0_interface_and_data_contracts.md) | Approved design baseline | Translate the approved contracts into executable test names/paths; any technical change requires corresponding test updates. |
| Delivery order | Coding Phases 1–6 and post-coding deployment Phase 7 are in [`implementation_plan.md`](implementation_plan.md) | Documented | Confirm AC-to-increment allocation, test IDs/owners, and evidence tiers; perform deployment only after coding Phase 6 is complete. |

## 3. Approved architecture decision

This is the selected v2.6 stack recorded in the approved architecture ADR. Requirements specify Vercel, Supabase, the Free/Hobby tiers, Git-based Vercel deployment, no GitHub Actions, and GPL-2.0-only; the draft resolves the framework and package manager as Next.js/TypeScript/npm.

| Decision | Proposal | Reason / constraint |
|---|---|---|
| Application | Next.js with TypeScript, deployed as one modular monolith on Vercel | Matches Vercel target; supports server-owned use cases and public/server projections without splitting the domain into services. |
| Package manager | npm with committed `package-lock.json` | TR-27 and SWBOM workflow already specify the exact npm lockfile as inventory input. |
| Test stack | Vitest for domain/use-case tests; MSW and explicit fakes for network/port boundaries; Testing Library for UI behavior; Playwright for browser acceptance | Keeps domain tests independent of production services while permitting component and multi-client acceptance tests. No dependency may be installed until the compatible version/license review is recorded. |
| Persistence | Supabase Postgres with versioned SQL migrations and server-only privileged adapter | Required by TR-22; Postgres transactions are the room serialization boundary. |
| Realtime | Supabase Realtime transports committed, audience-filtered outbox events; clients refetch authorized projections after reconnect | Keeps Postgres authoritative and delivery retry-safe. |
| Environments | Proposed post-coding layout: local Development; isolated Supabase Staging project targeted by a protected `staging` Vercel Preview branch; Production on `main` and a separate Supabase project | The proposal fits the stated free-tier limit and keeps Preview away from Production. It is not a Phase 0 approval gate; confirm account availability and finalize branch/project mapping at Phase 7 entry after coding. |
| Runtime behavior | Domain/app modules use ports for DB, identity, clock, random source, scheduler, quota and event delivery | Enables mock-first tests and prevents framework/services from owning game rules. |

**ADR approval is complete:** the selected Next.js/TypeScript/npm stack, DDD boundaries, dependency/license baseline, application interfaces, schema/RLS, transaction model, and deadline scheduler contract are approved for test authoring. If test design reveals a semantic gap, revise the relevant requirement/contract and traceability before implementation. Deployment tooling remains post-coding Phase 7 work.

## 4. Phase 0 approvals and closure

All product decisions affecting active AC expected results are resolved in Requirements v2.6. Phase 0 was closed by the user approval recorded in `phase0_approval_receipt.jsonl`. The approved requirements, ADR, technical interfaces and schema/security contracts are the baseline for the global test gate. Any later change must update affected expected results and traceability before implementation.

### Accountable roles and approval order

The user approved the Phase 0 baseline and exit on 26 October 2026. The implementation owner records test/mock evidence, implementation increments and review receipts. Any change affecting requirements or expected results returns through requirements and test review before code changes.

Phase 0 approval is complete; the global mock-oracle gate is awaiting independent re-review after correction. The candidate contains 67 primary AC scenarios plus 27 supplemental scenarios, checked against independent expectations and semantic controls. Four additional TR-19 reaction cases remain separate from AC coverage. This is mock assertion sensitivity evidence, not product conformance. The next steps are:

1. **Record the exact gate evidence:** keep test IDs, commands, results, hashes, and boundary limits in `test_execution_receipt.jsonl`.
2. **Hostile review:** independently review the exact remote commit and iterate until accuracy and completeness both score at least 98%.
3. **Phase 1A entry:** after that review passes, begin production implementation with BDP v4 Red/Green/Refactor. Run the unchanged oracles against real behavior incrementally and record product conformance separately.

The v2.6 decision register resolves all product outcomes. Phase 0 approval is complete; the global mock-oracle gate is pending exact-commit hostile re-review at 98/98 before Phase 1A. Deployment topology and account eligibility remain post-coding Phase 7 work.

The v2.6 requirements decision register records resolved defaults. Future changes that affect expected behavior require a baseline update and corresponding test-specification revision before implementation.

### Phase 7 entry decision — deployment topology (after coding; not a Phase 0 gate)

After coding Phases 1–6 and before deployment execution for TR-20–TR-29, finalize the protected staging branch and Vercel Preview mapping, separate Staging/Production Supabase project allocation, account capacity, and Preview/Production variable scopes. This operational mapping does not change active AC contract expectations and is not required for Phase 0 exit. Mockable TR tests can validate branch/environment separation and fail-closed behavior using abstract identifiers; actual account eligibility and deployed settings are TR-only integration/operational evidence, never AC coverage.

Phase 7 deployment-entry checklist:

- [ ] Confirm current Vercel Hobby eligibility and Supabase Free account capacity after coding is complete.
- [ ] Approve the branch-to-environment mapping and separate Staging/Production project allocation.
- [ ] Verify Preview and Production variable scopes before provisioning or deployment.

## 5. Phase 1 test and implementation package: core application foundation

This is the Phase 1 test-authoring and implementation plan. Its planned cases must be replaced with executable test names/paths, exact expected outcomes, mock behavior, and separate non-mock evidence. All active-AC tests must be executable and mock-validated before the first project implementation code.

| ACs | Planned cases | Mock-backed test responsibilities before implementation |
|---|---|---|
| TR-22–23 | `TR-23-T01`–`TR-23-T03` | Mock persistence/use-case contracts and migration fixtures support application coding. Provisioning CLI behavior is specified for Phase 7 and implemented only after coding. Disposable database checks remain TR-only integration evidence. |


| AC-37, AC-39 | `AC-37-T01`, `AC-39-T01` | Mock quota port and fixture manifest/lockfile validate recoverable service limits and attribution records without any deployment dependency. |
| AC-51 | `AC-51-T01`–`AC-51-T04` plus separate `TR-30-T01`–`TR-30-T02` and `TR-31-T01`–`TR-31-T06` checks | Active-AC mock contracts cover domain boundaries/conflict policy/idempotency/outbox intent; distinct later local/disposable DB integration tests verify actual capacity, uniqueness and atomic durability. |

### Post-coding deployment TR contracts

Specify these now, but implement/run them only after coding Phases 1–6 are complete. Validate each mockable TR contract before its Phase 7 tooling is written. None contributes to AC coverage.

| TR | Planned cases | Mock-backed contract |
|---|---|---|
| TR-20, TR-24 | `TR-20-T01`, `TR-24-T01` | Fake Vercel metadata/config verifies repository and branch mapping and no GitHub Actions dependency. |
| TR-21 | `TR-21-T01` | Fake configuration evaluator rejects paid tiers/add-ons; account eligibility is checked in Phase 7. |
| TR-23 provisioning | `TR-23-T02`–`TR-23-T03` | Fake CLI/temp filesystem verifies safe reruns, secret redaction and environment separation. |
| TR-26–27 | `TR-26-T01`, `TR-27-T01` | Fake test runner/build metadata and temporary output verify fail-closed ordering and fixture SWBOM generation. |
| TR-28–29 | `TR-28-T01`, `TR-29-T01` | Temporary source archive and fixture SWBOM/license verify required paths/notices without deployment. |

The 67 active-AC IDs have reusable scenario assertions. The latest 97/99 hostile review confirmed the archive and driver fixes but found AC-38 accepted planned mock records and identified stale score/receipt/SVG labels. The pending candidate rejects planned records and updates those artifacts; the test suite has 316 checks. The gate remains pending independent exact-commit review at 98/98. Phase 1A may begin only after that review passes. During implementation, run those unchanged assertions against the real system and record actual product conformance separately.

## 6. Phase 0 exit checklist

- [x] Approve the ADR recording the selected stack and architecture.
- [x] Assign every active AC (45 total) to an increment, test IDs, expected outcome, evidence type, owner and blocked decision; keep retired deployment IDs in TR-only verification records.
- [x] Approve Phase 0 application interfaces, schema, RLS, transaction/idempotency/outbox, quota and deadline contracts. Provisioning, build-gate, and artifact-verification interfaces belong to the post-coding Phase 7 deployment plan.
- [x] Approve [`phase0_interface_and_data_contracts.md`](phase0_interface_and_data_contracts.md), including logical schema, idempotency, transaction/locking, outbox, RLS and secret boundaries for the foundation slice.
- [x] Review current direct dependency versions/licenses and update `ATTRIBUTIONS.md`; the approved test-only dependency lockfile is committed. Runtime dependencies remain planned for Phase 1.
- [x] Complete all planning/design/decision work; keep this checklist free of executable test or implementation tasks.

**Current gate:** Phase 0 passed on 26 October 2026 by user approval; see `phase0_approval_receipt.jsonl`. The global AC mock-oracle gate remains incomplete pending fresh hostile review of the corrected 316-test candidate. The latest exact-commit review at `afd3371913e44ee0cf8eeb8a61a7880c6fc57405` scored 97% accuracy and 99% completeness; it found one AC-38 gate defect and bounded documentation issues, now corrected in the pending candidate; see the review receipt. Phase 1A is blocked until the current exact commit scores at least 98/98. Deployment remains Phase 7 after coding Phases 1–6; database/platform checks remain TR evidence separate from AC coverage.
