# Implementation Kickoff: Phase 0 Execution

**Status:** Phase 0 planning closure started; implementation code is gated  
**Requirements baseline:** `word_association_game_requirements.md` v2.6  
**Execution date:** 26 October 2026  
**Target:** `sharpninja/wordpairs`

## 1. Current baseline

This kickoff begins the implementation plan at **Phase 0 — Planning Closure**. The repository is still documentation-only. No executable tests have been authored, validated against mocks, or run, and no production implementation has been written. Phase 0 is currently a planning-only gate: do not author executable tests, project scripts/configuration, or implementation code until it passes. Once approved, author and validate tests for all active ACs against mocks before writing any project implementation code, as explicitly required for this project. Subsequent small increments still follow TDD and run the full regression suite.

The requirements contain 22 functional requirements, 31 technical requirements, and 45 active acceptance criteria. The six retired IDs AC-34, AC-35, AC-36, AC-40, AC-48, and AC-49 remain reserved and are verified only through their mapped technical requirements. [`ac_test_inventory.md`](ac_test_inventory.md) maps the 45 active ACs to 65 planned case IDs. This is traceability planning only; it does not satisfy the mock-validation gate. All product choices affecting active AC expected results are resolved in the v2.6 draft; Phase 0 approval and technical contract review remain pending.

## 2. Phase 0 gate status

| Gate | Current evidence | Status | Remaining work |
|---|---|---|---|
| Requirements baseline | Requirements v2.6; 45 active ACs (51 numbered IDs including six retired TR-only IDs); all FR/TR IDs mapped in [`architecture_design.md`](architecture_design.md) | Draft complete; approval pending | Approve the v2.6 baseline. All product decisions affecting active-AC expected results are resolved. Any later deferral requires a formal requirements change. |
| DDD and concurrency direction | Modular monolith, context split, ports/adapters, aggregate transactions, idempotency, outbox and SVG diagrams in [`architecture_patterns.md`](architecture_patterns.md) and [`architecture_design.md`](architecture_design.md) | Direction documented; ADR approval pending | Approve selected framework/runtime and detailed public interfaces; confirm transaction, RLS and outbox contracts. |
| Test traceability | 45 active ACs map to 65 planned case IDs; deployment-only IDs are retired and mapped to TR-only verification | Planning/specification only; no executable tests permitted before Phase 0 approval | Refine all planned cases to exact assertions and evidence tiers. After Phase 0 approval, author and mock-validate every active-AC contract test before any project implementation code. Mockable TR contracts are also test-first before their later implementation; deployed-artifact checks are TR integration/operational evidence and never count as AC coverage. |
| Dependency/license review | Selected toolchain and direct dependency set are documented in the v2.6 requirements and [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md); GPL-2.0-only license exists | Draft complete; verification pending | Verify selected dependency versions/licenses after baseline approval; lock the compatible versions before project setup. |
| Deployment topology | Vercel Hobby + Supabase Free, no GitHub Actions, manual provisioning, SWBOM/release gates documented | Constraints accepted; deployment follows coding | Do not provision or deploy during coding Phases 1–6. Finalize branch/project mapping and verify account capacity at Phase 7 entry. These TR checks do not change AC expectations. |
| Data/security design | DDD ownership, projection boundaries, and candidate persistence/security contracts are documented | Drafted; approval pending | Review and approve schema, RLS, transaction procedures, retention, secret names, role model, and failure behavior for the Foundation increment. |
| Public interfaces and data contracts | Candidate commands, queries, typed failures, event audiences, logical relations, RLS and transaction invariants are drafted in [`phase0_interface_and_data_contracts.md`](phase0_interface_and_data_contracts.md) | Draft; approval pending | Review and approve the v2.6 contracts; all listed product-policy outcomes are resolved in the baseline. |
| Delivery order | Coding Phases 1–6 and post-coding deployment Phase 7 are in [`implementation_plan.md`](implementation_plan.md) | Documented | Confirm AC-to-increment allocation, test IDs/owners, and evidence tiers; perform deployment only after coding Phase 6 is complete. |

## 3. Proposed architecture decision for approval

This is the selected v2.6 stack, pending architecture ADR approval. Requirements specify Vercel, Supabase, the Free/Hobby tiers, Git-based Vercel deployment, no GitHub Actions, and GPL-2.0-only; the draft resolves the framework and package manager as Next.js/TypeScript/npm.

| Decision | Proposal | Reason / constraint |
|---|---|---|
| Application | Next.js with TypeScript, deployed as one modular monolith on Vercel | Matches Vercel target; supports server-owned use cases and public/server projections without splitting the domain into services. |
| Package manager | npm with committed `package-lock.json` | TR-27 and SWBOM workflow already specify the exact npm lockfile as inventory input. |
| Test stack | Vitest for domain/use-case tests; MSW and explicit fakes for network/port boundaries; Testing Library for UI behavior; Playwright for browser acceptance | Keeps domain tests independent of production services while permitting component and multi-client acceptance tests. No dependency may be installed until the compatible version/license review is recorded. |
| Persistence | Supabase Postgres with versioned SQL migrations and server-only privileged adapter | Required by TR-22; Postgres transactions are the room serialization boundary. |
| Realtime | Supabase Realtime transports committed, audience-filtered outbox events; clients refetch authorized projections after reconnect | Keeps Postgres authoritative and delivery retry-safe. |
| Environments | Proposed post-coding layout: local Development; isolated Supabase Staging project targeted by a protected `staging` Vercel Preview branch; Production on `main` and a separate Supabase project | The proposal fits the stated free-tier limit and keeps Preview away from Production. It is not a Phase 0 approval gate; confirm account availability and finalize branch/project mapping at Phase 7 entry after coding. |
| Runtime behavior | Domain/app modules use ports for DB, identity, clock, random source, scheduler, quota and event delivery | Enables mock-first tests and prevents framework/services from owning game rules. |

**ADR approval required:** record the selected Next.js/TypeScript/npm and test stack with versions/licenses after review. The pattern direction is captured; public interfaces, schema/RLS, transaction model, and deadline scheduler contract need Phase 0 technical review. Deployment tooling is implemented only in post-coding Phase 7. If the architecture ADR changes the selected stack, update attribution and traceability before executable tests are written.

## 4. Phase 0 approvals and closure

All product decisions affecting active AC expected results are resolved in Requirements v2.6. Phase 0 now closes by reviewing and approving the requirements/architecture baseline, technical interfaces and schema/security contracts, and the complete test specifications. If the baseline changes, update affected expected results and traceability before approval.

### Accountable roles and approval order

The product owner is accountable for decisions that change user-visible behavior and for approving the requirements baseline and Phase 0 exit. The implementation owner prepares the ADR, interfaces, schema/security contract, dependency review, and test specifications; the product owner approves those artifacts. The implementation owner also records the final evidence and review receipt. This assigns responsibility; product policies affecting active AC outcomes are resolved in requirements v2.6, while technical contracts remain subject to Phase 0 review.

Complete the remaining approvals in this order:

1. **Baseline approval:** review the resolved v2.6 product behaviors, including game timing/scoring, identity, lobby, moderation, reactions, and landing-page data contracts.
2. **Technical architecture:** approve Next.js/TypeScript/npm and the selected test stack; approve DDD boundaries and public application interfaces.
3. **Data/security design:** approve schema, RLS, transaction/versioning, idempotency/outbox, retention, role source, secret boundaries, and deadline scheduler contracts.
4. **Coverage closure:** refine the 65 planned AC cases, verify every active AC has mockable contract coverage, and separate later TR integration/deployment evidence.
5. **Phase 0 exit:** complete hostile review and approve Phase 0. Only after approval may executable tests be authored; all active AC tests must pass against mocks before project implementation code.

The requirements v2.6 decision register contains the selected outcomes for all product choices. The only remaining blockers are approval of the baseline and technical design artifacts listed in Section 6; deployment topology and account eligibility are post-coding Phase 7 work.

The v2.6 requirements decision register records resolved defaults. Future changes that affect expected behavior require a baseline update and corresponding test-specification revision before implementation.

### Phase 7 entry decision — deployment topology (after coding; not a Phase 0 gate)

After coding Phases 1–6 and before deployment execution for TR-20–TR-29, finalize the protected staging branch and Vercel Preview mapping, separate Staging/Production Supabase project allocation, account capacity, and Preview/Production variable scopes. This operational mapping does not change active AC contract expectations and is not required for Phase 0 exit. Mockable TR tests can validate branch/environment separation and fail-closed behavior using abstract identifiers; actual account eligibility and deployed settings are TR-only integration/operational evidence, never AC coverage.

Phase 7 deployment-entry checklist:

- [ ] Confirm current Vercel Hobby eligibility and Supabase Free account capacity after coding is complete.
- [ ] Approve the branch-to-environment mapping and separate Staging/Production project allocation.
- [ ] Verify Preview and Production variable scopes before provisioning or deployment.

## 5. First coding increment candidate: core application foundation contracts

This is a **test-specification candidate only**, not permission to write tests or code while Phase 0 is open. Once Phase 0 passes, it is expected to be the first implementation increment. Its cases must be expanded to concrete test names, expected outcomes, mock behavior, and non-mock evidence types. After Phase 0 approval, these and all other active-AC tests must be executable and mock-validated before the first project implementation code.

| ACs | Planned cases | Mock-backed test responsibilities before implementation |
|---|---|---|
| TR-22–23 | `TR-23-T01`–`TR-23-T03` | Mock persistence/use-case contracts and migration fixtures support application coding. Provisioning CLI behavior is specified for Phase 7 and implemented only after coding. Disposable database checks remain TR-only integration evidence. |


| AC-37, AC-39 | `AC-37-T01`, `AC-39-T01` | Mock quota port and fixture manifest/lockfile validate recoverable service limits and attribution records without any deployment dependency. |
| AC-51 | `AC-51-T01`–`AC-51-T07` | Active-AC mock contracts cover domain boundaries/conflict policy/idempotency/outbox intent; distinct later local/disposable DB integration tests verify actual capacity, uniqueness and atomic durability. |

### Post-coding deployment TR contracts

Specify these now, but implement/run them only after coding Phases 1–6 are complete. Validate each mockable TR contract before its Phase 7 tooling is written. None contributes to AC coverage.

| TR | Planned cases | Mock-backed contract |
|---|---|---|
| TR-20, TR-24 | `TR-20-T01`, `TR-24-T01` | Fake Vercel metadata/config verifies repository and branch mapping and no GitHub Actions dependency. |
| TR-21 | `TR-21-T01` | Fake configuration evaluator rejects paid tiers/add-ons; account eligibility is checked in Phase 7. |
| TR-23 provisioning | `TR-23-T02`–`TR-23-T03` | Fake CLI/temp filesystem verifies safe reruns, secret redaction and environment separation. |
| TR-26–27 | `TR-26-T01`, `TR-27-T01` | Fake test runner/build metadata and temporary output verify fail-closed ordering and fixture SWBOM generation. |
| TR-28–29 | `TR-28-T01`, `TR-29-T01` | Temporary source archive and fixture SWBOM/license verify required paths/notices without deployment. |

While Phase 0 is open, refine only the written test specifications; do not create executable test files. After Phase 0 approval, replace planned IDs with exact executable test names and paths for all active ACs, not just this increment. Each test must exercise behavior behind its fake; mocks may provide boundary responses but may not simply return the expected result. Run the complete suite against mocks, inspect positive and failure assertions, and record results before any project implementation code. Separately record non-mock evidence required by each AC. Once the global gate passes, implement the smallest behavior and run the full regression suite before closing each increment.

## 6. Phase 0 exit checklist

- [ ] Approve the ADR recording the selected stack and architecture.
- [ ] Assign every active AC (45 total) to an increment, test IDs, expected outcome, evidence type, owner and blocked decision; keep retired deployment IDs in TR-only verification records.
- [ ] Approve Phase 0 application interfaces, schema, RLS, transaction/idempotency/outbox, quota and deadline contracts. Provisioning, build-gate, and artifact-verification interfaces belong to the post-coding Phase 7 deployment plan.
- [ ] Approve [`phase0_interface_and_data_contracts.md`](phase0_interface_and_data_contracts.md), including logical schema, idempotency, transaction/locking, outbox, RLS and secret boundaries for the foundation slice.
- [ ] Review current direct dependency versions/licenses and update `ATTRIBUTIONS.md`; commit a lockfile only after toolchain approval.
- [ ] Complete all planning/design/decision work; keep this checklist free of executable test or implementation tasks.

**Current gate:** not passed. Phase 0 may pass only after the baseline, interfaces, schema/security contracts, every active AC expected outcome/evidence tier, and all product decisions affecting active assertions are approved. Any intentionally deferred behavior must first be removed or re-scoped in the requirements baseline. The v2.6 requirements resolve product choices affecting active AC expected results. Remaining Phase 0 work is approval of that baseline and technical review/approval of the selected architecture, interfaces, schema/security contracts, and complete test specifications. Deployment topology is a post-coding Phase 7 decision and does not block Phase 0. After Phase 0 passes, the next gate is mock validation of every active-AC contract test; no project implementation code begins before it passes. Real database/platform tests run as separate evidence after adapters exist.
