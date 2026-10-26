# Implementation Kickoff: Phase 0 Execution

**Status:** Phase 0 planning closure started; implementation code is gated  
**Requirements baseline:** `word_association_game_requirements.md` v2.5  
**Execution date:** 26 October 2026  
**Target:** `sharpninja/wordpairs`

## 1. Current baseline

This kickoff begins the implementation plan at **Phase 0 — Planning Closure**. The repository is still documentation-only. No executable tests have been authored, validated against mocks, or run, and no production implementation has been written. Phase 0 is currently a planning-only gate: do not author executable tests, project scripts/configuration, or implementation code until it passes. Once approved, author and validate tests for all active ACs against mocks before writing any project implementation code, as explicitly required for this project. Subsequent small increments still follow TDD and run the full regression suite.

The requirements contain 22 functional requirements, 31 technical requirements, and 45 active acceptance criteria. The six retired IDs AC-34, AC-35, AC-36, AC-40, AC-48, and AC-49 remain reserved and are verified only through their mapped technical requirements. [`ac_test_inventory.md`](ac_test_inventory.md) maps the 45 active ACs to 64 planned case IDs. This is traceability planning only; it does not satisfy the mock-validation gate. Decision groups that affect active AC expected results are Phase 0 blockers; do not carry them into the global gate unresolved.

## 2. Phase 0 gate status

| Gate | Current evidence | Status | Remaining work |
|---|---|---|---|
| Requirements baseline | Requirements v2.5; 45 active ACs (51 numbered IDs including six retired TR-only IDs); all FR/TR IDs mapped in [`architecture_design.md`](architecture_design.md) | In progress | Review and approve the baseline; resolve every decision that affects an active AC's expected result. Formal requirements changes are required for deferred behavior. |
| DDD and concurrency direction | Modular monolith, context split, ports/adapters, aggregate transactions, idempotency, outbox and SVG diagrams in [`architecture_patterns.md`](architecture_patterns.md) and [`architecture_design.md`](architecture_design.md) | Direction documented; ADR approval pending | Approve selected framework/runtime and detailed public interfaces; confirm transaction, RLS and outbox contracts. |
| Test traceability | 45 active ACs map to 64 planned case IDs; deployment-only IDs are retired and mapped to TR-only verification | Planning/specification only; no executable tests permitted before Phase 0 approval | Fix expected outcomes for every active AC. After Phase 0 approval, author and mock-validate every active-AC contract test before any project implementation code. Mockable TR contract tests are also test-first; deployed-artifact checks are TR integration/operational evidence and never count as AC coverage. |
| Dependency/license review | Planned direct dependencies and attribution are listed in [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md); GPL-2.0-only license exists | Preliminary | Select framework/package-manager versions, verify current licenses and compatibility, create lockfile only after stack approval. |
| Deployment topology | Vercel Hobby + Supabase Free, no GitHub Actions, manual provisioning, SWBOM/release gates documented | Constraints accepted; proposed layout is documented and is not a Phase 0 gate | Finalize branch/project mapping and verify account capacity at Phase 1 provisioning entry, before provisioning/configuration implementation or deployment. AC contract tests validate isolation behavior generically and do not depend on branch names or project IDs. |
| Data/security design | DDD ownership and projection boundaries are documented | Incomplete | Define schema, RLS, transaction procedures, retention, secret names, role model and failure behavior for the Foundation increment. |
| Delivery order | Phases 0–7 and AC allocation are in [`implementation_plan.md`](implementation_plan.md) | Documented | Assign test-file IDs/owners and evidence types for all ACs; retain decision-blocked expectations at their later phase. |

## 3. Proposed architecture decision for approval

This is a concrete proposal, not an approved technology decision. Requirements already specify Vercel, Supabase, the Free/Hobby tiers, Git-based Vercel deployment, no GitHub Actions, and GPL-2.0-only. They do not approve the application framework or package manager.

| Decision | Proposal | Reason / constraint |
|---|---|---|
| Application | Next.js with TypeScript, deployed as one modular monolith on Vercel | Matches Vercel target; supports server-owned use cases and public/server projections without splitting the domain into services. |
| Package manager | npm with committed `package-lock.json` | TR-27 and SWBOM workflow already specify the exact npm lockfile as inventory input. |
| Test stack | Vitest for domain/use-case tests; MSW and explicit fakes for network/port boundaries; Testing Library for UI behavior; Playwright for browser acceptance | Keeps domain tests independent of production services while permitting component and multi-client acceptance tests. No dependency may be installed until the compatible version/license review is recorded. |
| Persistence | Supabase Postgres with versioned SQL migrations and server-only privileged adapter | Required by TR-22; Postgres transactions are the room serialization boundary. |
| Realtime | Supabase Realtime transports committed, audience-filtered outbox events; clients refetch authorized projections after reconnect | Keeps Postgres authoritative and delivery retry-safe. |
| Environments | Proposed Phase 1 layout: local Development; isolated Supabase Staging project targeted by a protected `staging` Vercel Preview branch; Production on `main` and a separate Supabase project | The proposal fits the stated free-tier limit and keeps Preview away from Production. It is not a Phase 0 approval gate; confirm account availability and finalize branch/project mapping at Phase 1 provisioning entry. |
| Runtime behavior | Domain/app modules use ports for DB, identity, clock, random source, scheduler, quota and event delivery | Enables mock-first tests and prevents framework/services from owning game rules. |

**ADR approval required:** Next.js/TypeScript, npm, and the proposed test stack. The pattern direction is already captured, but the public interfaces, schema/RLS, migrations, provisioning command contract, test/build order, and deadline scheduler still need Phase 0 design. If any proposed framework/dependency is declined, update this ADR and the package attribution before writing tests or production code.

## 4. Decisions to resolve before Phase 0 exit

Every decision that affects an active AC's expected result must be resolved before Phase 0 exits. If a behavior is intentionally deferred, formally revise the requirement and remove or re-scope its AC from the active baseline before approval. An active AC may not enter the global mock gate without fixed expected behavior. Decisions that do not affect any active AC may remain informational/open with an owner and rationale.

| Decision group | Required disposition | First affected phase | Gate effect |
|---|---|---:|---|
| Framework/runtime/package manager | Approve or replace Next.js/TypeScript/npm; confirm Node runtime and pinned toolchain policy. | 1 | Blocks executable test setup and project skeleton. |
| Provisioning interface | Approve CLI wrapper, dry-run default, idempotent create/link semantics, migration reporting, secret-source/redaction behavior, and safeguards against paid resources/Preview-to-Production targeting. | 1 | Blocks provisioning script tests and script implementation. |
| Test/build/SWBOM ordering | Approve test runner and mock-validation command, CycloneDX generator invocation, commit metadata source, artifact validation, archive format, and how Vercel's build command fails closed. | 1 | Blocks build/release gate implementation. |
| Domain persistence interfaces | Approve schema/RLS/transaction shape for aggregate versioning, idempotency, outbox, migrations, and disposable integration tests. | 1 | Blocks database adapters and AC-51 integration tests. |
| OIDC access and identity policy | Verify OpenAI website OIDC eligibility or revise the provider; separately approve guest persistence, display labels and account linking. | 2 | Blocks account-backed identity; guest/profile work can proceed only after its lifecycle is approved. |
| Lobby/public product policy | Approve quick-match ordering, discovery defaults, observer limits/inviter attribution, public leaderboard/lobby contract and cache/refresh policy. | 2 | Blocks corresponding lobby and public-projection behavior. |
| Match/content/moderation policy | Approve stage/no-response/answer/tiebreak/content-volume and nomination/moderation rules. | 4–5 | Blocks only the affected gameplay/content increments. |
| Readiness race outcomes | Resolve countdown duration/host authority and deadline execution. The two-player timeout exception is confirmed: do not boot the holdout or start countdown; wait until both players are ready. | 3 | Blocks readiness/countdown implementation except the already specified timeout branch. |
| Quota/reconnect/room lifecycle | Set expected concurrency, recoverable Free-tier quota UX, reconnect/session behavior, room expiry and creator departure. | 1 for quota contract; 2–3 for room lifecycle | Blocks relevant operational and membership behavior. |

The detailed proposal/open state remains in the requirements decision register. Any deferral that affects an active AC requires a requirements change before Phase 0 approval; after that change, the revised AC must have testable expected behavior. A blocked assertion is not full coverage and cannot pass the global gate.

### Phase 1 entry decision — deployment topology (not a Phase 0 gate)

Before provisioning/configuration work for TR-20–TR-24 and TR-27, finalize the protected staging branch and Vercel Preview mapping, separate Staging/Production Supabase project allocation, account capacity, and Preview/Production variable scopes. This operational mapping does not change active AC contract expectations and is not required for Phase 0 exit. Mockable TR tests can validate branch/environment separation and fail-closed behavior using abstract identifiers; actual account eligibility and deployed settings are TR-only integration/operational evidence, never AC coverage.

Phase 1 provisioning-entry checklist:

- [ ] Confirm current Vercel Hobby eligibility and Supabase Free account capacity.
- [ ] Approve the branch-to-environment mapping and separate Staging/Production project allocation.
- [ ] Verify Preview and Production variable scopes before provisioning or deployment.

## 5. First increment candidate: delivery foundation contracts

This is a **test-specification candidate only**, not permission to write tests or code while Phase 0 is open. Once Phase 0 passes, it is expected to be the first implementation increment. Its cases must be expanded to concrete test names, expected outcomes, mock behavior, and non-mock evidence types. After Phase 0 approval, these and all other active-AC tests must be executable and mock-validated before the first project implementation code.

| ACs | Planned cases | Mock-backed test responsibilities before implementation |
|---|---|---|
| TR-20, TR-24 | `TR-20-T01`, `TR-24-T01` | Fake Vercel Git metadata/config adapter; validate branch-to-environment mapping and no Actions dependency. Live Vercel behavior is separate TR integration evidence, not an AC. |
| TR-21 | `TR-21-T01` | Fake configuration evaluator rejects paid plans/add-ons; actual account eligibility is checked at Phase 1 provisioning entry. |
| TR-22–23 | `TR-23-T01`–`TR-23-T03` | Fake CLI and temporary filesystem validate safe rerun, migration reporting, secret redaction, and environment variable scoping. Disposable database/account checks remain TR-only integration evidence. |
| TR-26–27 | `TR-26-T01`, `TR-27-T01` | Fake test runner and build metadata plus temporary build output validate fail-closed ordering and CycloneDX SWBOM generation against the fixture lockfile; no deployed artifact is read. |
| TR-28–29 | `TR-28-T01`, `TR-29-T01` | Temporary source archive and fixture SWBOM/license validate exact-commit archive contents and GPL notices without publishing or deploying. |
| AC-51 | `AC-51-T01`–`AC-51-T07` | Active-AC mock contracts cover domain boundaries/conflict policy/idempotency/outbox intent; distinct later DB integration tests verify actual capacity, uniqueness and atomic durability. |

While Phase 0 is open, refine only the written test specifications; do not create executable test files. After Phase 0 approval, replace planned IDs with exact executable test names and paths for all active ACs, not just this increment. Each test must exercise behavior behind its fake; mocks may provide boundary responses but may not simply return the expected result. Run the complete suite against mocks, inspect positive and failure assertions, and record results before any project implementation code. Separately record non-mock evidence required by each AC. Once the global gate passes, implement the smallest behavior and run the full regression suite before closing each increment.

## 6. Phase 0 exit checklist

- [ ] Approve the ADR proposal or record replacements.
- [ ] Assign every active AC (45 total) to an increment, test IDs, expected outcome, evidence type, owner and blocked decision; keep retired deployment IDs in TR-only verification records.
- [ ] Approve public interfaces for provisioning, migration, environment validation, quota reporting, build gates and artifact verification.
- [ ] Document database schema, idempotency, transaction/locking, outbox, RLS and secret boundaries for the foundation slice.
- [ ] Review current direct dependency versions/licenses and update `ATTRIBUTIONS.md`; commit a lockfile only after toolchain approval.
- [ ] Complete all planning/design/decision work; keep this checklist free of executable test or implementation tasks.

**Current gate:** not passed. Phase 0 may pass only after the baseline, interfaces, schema/security contracts, every active AC expected outcome/evidence tier, and all product decisions affecting active assertions are approved. Any intentionally deferred behavior must first be removed or re-scoped in the requirements baseline. Remaining Phase 0 inputs are approval or replacement of the framework/package/test-stack proposal and disposition of open product decisions that affect active ACs. AC-32's two-player exception is confirmed. Deployment topology is a Phase 1 entry decision and does not block Phase 0. After Phase 0 passes, the next gate is mock validation of every active-AC contract test; no project implementation code begins before it passes. Real database/platform tests run as separate evidence after adapters exist.
