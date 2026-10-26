# Implementation Kickoff: Phase 0 Execution

**Status:** Phase 0 approved on 26 October 2026; global active-AC mock-validation gate is in progress  
**Requirements baseline:** `word_association_game_requirements.md` v2.6  
**Execution date:** 26 October 2026  
**Target:** `sharpninja/wordpairs`

## 1. Current baseline

The user approved Phase 0 on 26 October 2026. Planning artifacts and the v2.6 baseline are now approved for test authoring. No executable tests or production implementation have been written yet. The next gate is to author the full active-AC suite and validate its boundary mocks before any production implementation code. Subsequent increments follow BDP v4 red/green/refactor and run the complete regression suite.

The requirements contain 22 functional requirements, 31 technical requirements, and 45 active acceptance criteria. The six retired IDs AC-34, AC-35, AC-36, AC-40, AC-48, and AC-49 remain reserved and are verified only through their mapped technical requirements. [`ac_test_inventory.md`](ac_test_inventory.md) maps the 45 active ACs to 65 planned AC case IDs. This is traceability planning only; it does not satisfy the mock-validation gate. The user approved the v2.6 baseline, architecture, interface contracts, and Phase 0 exit. All product choices affecting active AC expected results are resolved.

## 2. Phase 0 gate status

| Gate | Current evidence | Status | Remaining work |
|---|---|---|---|
| Requirements baseline | Requirements v2.6; 45 active ACs (51 numbered IDs including six retired TR-only IDs); all FR/TR IDs mapped in [`architecture_design.md`](architecture_design.md) | Approved by user | Record approval in the Phase 0 receipt; any later behavior change requires a formal requirements and test change. |
| DDD and concurrency direction | Modular monolith, context split, ports/adapters, aggregate transactions, idempotency, outbox and SVG diagrams in [`architecture_patterns.md`](architecture_patterns.md) and [`architecture_design.md`](architecture_design.md) | Approved for implementation | ADR and interface contracts are recorded; evolve only through reviewed requirements/design changes. |
| Test traceability | 45 active ACs map to 65 planned AC case IDs; deployment-only IDs are retired and mapped to TR-only verification | Phase 0 approved; test specifications planned, not yet authored | Author and mock-validate every active-AC contract test before any project implementation code. Mockable TR contracts are also test-first before their later implementation; deployed-artifact checks are TR integration/operational evidence and never count as AC coverage. |
| Dependency/license review | Selected toolchain and direct dependency set are documented in the v2.6 requirements and [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md); GPL-2.0-only license exists | Approved baseline; lockfile pending | Resolve and install the reviewed versions as test-tool setup after completing the global mock-validation gate and before production implementation. |
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

The Phase 0 approval order is complete. Continue with the implementation gates in this order:

1. **Global test authoring:** replace all 65 planned AC case IDs with named executable tests and exact paths; add separate TR-30/TR-31 contract tests where applicable.
2. **Mock validation:** run the complete active-AC suite with fake clocks, deterministic randomness, and mocked external boundaries. Record every AC ID, test ID, mock seam, command, and result.
3. **Gate review:** confirm 45/45 active ACs have explicit assertions and the complete suite is mock-validated before production code.
4. **Phase 1 entry:** only after the global mock gate is green, implement the first production code increment and run BDP v4 real-code Red/Green/Refactor.

The v2.6 decision register resolves all product outcomes. Phase 0 approvals are complete; the active work is test authoring followed by the global mock-validation gate. Deployment topology and account eligibility remain post-coding Phase 7 work.

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

Phase 0 is approved. Replace planned IDs with exact executable test names and paths for all active ACs before production code. Each test must exercise behavior behind its fake; mocks may provide boundary responses but may not simply return the expected result. Run the complete suite against mocks, inspect positive and failure assertions, and record results before any project implementation code. Separately record non-mock evidence required by each AC. Once the global gate passes, implement the smallest behavior and run the full regression suite before closing each increment.

## 6. Phase 0 exit checklist

- [x] Approve the ADR recording the selected stack and architecture.
- [x] Assign every active AC (45 total) to an increment, test IDs, expected outcome, evidence type, owner and blocked decision; keep retired deployment IDs in TR-only verification records.
- [x] Approve Phase 0 application interfaces, schema, RLS, transaction/idempotency/outbox, quota and deadline contracts. Provisioning, build-gate, and artifact-verification interfaces belong to the post-coding Phase 7 deployment plan.
- [x] Approve [`phase0_interface_and_data_contracts.md`](phase0_interface_and_data_contracts.md), including logical schema, idempotency, transaction/locking, outbox, RLS and secret boundaries for the foundation slice.
- [x] Review current direct dependency versions/licenses and update `ATTRIBUTIONS.md`; commit a lockfile only after toolchain approval.
- [x] Complete all planning/design/decision work; keep this checklist free of executable test or implementation tasks.

**Current gate:** Phase 0 passed on 26 October 2026 by user approval; see `phase0_approval_receipt.jsonl`. All 45 active ACs must have executable, mock-validated tests before production implementation. This gate is in progress. Deployment remains Phase 7 after coding Phases 1–6; database/platform checks remain TR evidence separate from AC coverage.
