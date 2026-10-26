# Implementation Kickoff: Phase 0 Execution

**Status:** Phase 0 planning closure started; implementation code is gated  
**Requirements baseline:** `word_association_game_requirements.md` v2.2  
**Execution date:** 26 October 2026  
**Target:** `sharpninja/wordpairs`

## 1. Current baseline

This kickoff begins the implementation plan at **Phase 0 — Planning Closure**. The repository is still documentation-only. No executable tests have been authored, validated against mocks, or run, and no production implementation has been written. Phase 0 is currently a planning-only gate: do not author executable tests, project scripts/configuration, or implementation code until it passes. Once approved, author and validate tests for all active ACs against mocks before writing any project implementation code, as explicitly required for this project. Subsequent small increments still follow TDD and run the full regression suite.

The requirements contain 22 functional requirements, 31 technical requirements, and 51 active acceptance criteria. [`ac_test_inventory.md`](ac_test_inventory.md) currently maps all 51 criteria to 62 planned case IDs. This is traceability planning only: it does not satisfy the mock-validation gate. The unresolved-decision groups below remain open; implementation must not encode choices for them.

## 2. Phase 0 gate status

| Gate | Current evidence | Status | Remaining work |
|---|---|---|---|
| Requirements baseline | Requirements v2.2; 51 ACs; all FR/TR IDs mapped in [`architecture_design.md`](architecture_design.md) | In progress | Review and approve the baseline; resolve or explicitly defer every decision by increment. |
| DDD and concurrency direction | Modular monolith, context split, ports/adapters, aggregate transactions, idempotency, outbox and SVG diagrams in [`architecture_patterns.md`](architecture_patterns.md) and [`architecture_design.md`](architecture_design.md) | Direction documented; ADR approval pending | Approve selected framework/runtime and detailed public interfaces; confirm transaction, RLS and outbox contracts. |
| Test traceability | 62 planned test IDs cover AC-01–AC-51 | Planning/specification only; no executable tests permitted before Phase 0 approval | Complete expected outcomes, evidence type and mock boundary for all cases. After Phase 0 approval, author and mock-validate every active AC test before any project implementation code. |
| Dependency/license review | Planned direct dependencies and attribution are listed in [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md); GPL-2.0-only license exists | Preliminary | Select framework/package-manager versions, verify current licenses and compatibility, create lockfile only after stack approval. |
| Deployment topology | Vercel Hobby + Supabase Free, no GitHub Actions, manual provisioning, SWBOM/release gates documented | Constraints accepted; project topology pending | Approve the two-project Supabase allocation and protected `staging` Preview branch mapping; verify account eligibility and current limits before provisioning. |
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
| Environments | Local Development; isolated Supabase Staging project targeted by a protected `staging` Vercel Preview branch; Production on `main` and a separate Supabase project | Fits the stated free-tier limit of two hosted Supabase projects; no Preview points at Production. Confirm account availability and Hobby terms before provisioning. |
| Runtime behavior | Domain/app modules use ports for DB, identity, clock, random source, scheduler, quota and event delivery | Enables mock-first tests and prevents framework/services from owning game rules. |

**ADR approval required:** Next.js/TypeScript, npm, and the proposed test stack. The pattern direction is already captured, but the public interfaces, schema/RLS, migrations, provisioning command contract, test/build order, and deadline scheduler still need Phase 0 design. If any proposed framework/dependency is declined, update this ADR and the package attribution before writing tests or production code.

## 4. Decisions to resolve or defer before the first increment

Only decisions that affect the selected increment must be resolved before that increment starts, but every open criterion must remain assigned to an increment and blocked where necessary. Do not mark the full plan ready while these decisions lack an owner or disposition.

| Decision group | Required disposition | First affected phase | Gate effect |
|---|---|---:|---|
| Framework/runtime/package manager | Approve or replace Next.js/TypeScript/npm; confirm Node runtime and pinned toolchain policy. | 1 | Blocks executable test setup and project skeleton. |
| Staging/environment isolation | Confirm protected `staging` branch, distinct Staging and Production Supabase projects, Vercel Preview/Production variables, and operator account has capacity. | 1 | Blocks provisioning tests and project creation. |
| Provisioning interface | Approve CLI wrapper, dry-run default, idempotent create/link semantics, migration reporting, secret-source/redaction behavior, and safeguards against paid resources/Preview-to-Production targeting. | 1 | Blocks provisioning script tests and script implementation. |
| Test/build/SWBOM ordering | Approve test runner and mock-validation command, CycloneDX generator invocation, commit metadata source, artifact validation, archive format, and how Vercel's build command fails closed. | 1 | Blocks build/release gate implementation. |
| Domain persistence interfaces | Approve schema/RLS/transaction shape for aggregate versioning, idempotency, outbox, migrations, and disposable integration tests. | 1 | Blocks database adapters and AC-51 integration tests. |
| OIDC access and identity policy | Verify OpenAI website OIDC eligibility or revise the provider; separately approve guest persistence, display labels and account linking. | 2 | Blocks account-backed identity; guest/profile work can proceed only after its lifecycle is approved. |
| Lobby/public product policy | Approve quick-match ordering, discovery defaults, observer limits/inviter attribution, public leaderboard/lobby contract and cache/refresh policy. | 2 | Blocks corresponding lobby and public-projection behavior. |
| Match/content/moderation policy | Approve stage/no-response/answer/tiebreak/content-volume and nomination/moderation rules. | 4–5 | Blocks only the affected gameplay/content increments. |
| Readiness race outcomes | Resolve two-player holdout removal, countdown duration/host authority and deadline execution. | 3 | Blocks readiness/countdown implementation. |
| Quota/reconnect/room lifecycle | Set expected concurrency, recoverable Free-tier quota UX, reconnect/session behavior, room expiry and creator departure. | 1 for quota contract; 2–3 for room lifecycle | Blocks relevant operational and membership behavior. |

The detailed proposal/open state remains in the requirements decision register. An explicit deferral must identify the affected AC, the later phase, and the assertion that remains blocked; it cannot be used to claim full AC implementation.

## 5. First increment candidate: delivery foundation contracts

This is a **test-specification candidate only**, not permission to write tests or code while Phase 0 is open. Once Phase 0 passes, it is expected to be the first implementation increment. Its cases must be expanded to concrete test names, expected outcomes, mock behavior, and non-mock evidence types. After Phase 0 approval, these and all other active-AC tests must be executable and mock-validated before the first project implementation code.

| ACs | Planned cases | Mock-backed test responsibilities before implementation |
|---|---|---|
| AC-34–35 | `AC-34-T01`, `AC-35-T01` | Mock branch metadata to validate intended mapping logic and no paid-service fallback. Separately inspect committed Vercel configuration and verify the actual account plan/eligibility; mocks cannot establish either external fact. |
| AC-36, AC-48 | `AC-36-T01`, `AC-48-T01`, `AC-48-T02` | Fake CLI, existing-project state, migration inventory, Preview/Production variable maps, redacted logs and temporary filesystem; verify rerun and environment-separation behavior. Later inspect actual project settings and run a disposable staging provision/migration check. |
| AC-37 | `AC-37-T01` | Fake quota provider; validate recoverable response and absence of paid fallback. Later exercise quota behavior against the documented Free-tier configuration where feasible. |
| AC-38, AC-49 | `AC-38-T01`, `AC-49-T01` | Fake test runner and SWBOM validator; prove test failure, absent report, invalid schema and commit mismatch block build; valid gate exposes matching report. Later inspect Vercel build settings and deployed endpoint/artifact identity. |
| AC-39–42 | `AC-39-T01`–`AC-42-T01` | Fixture manifest/lockfile, license inventory, CycloneDX, temporary release archive and checksums; prove required files/metadata and rejection cases. Separately review the real dependency/asset notices and inspect each release archive. |
| AC-51 | `AC-51-T01` | Static architecture boundary check proving domain/app policy modules do not import runtime adapters. Database concurrency cases remain assigned to the room increment and require disposable database integration evidence. |

While Phase 0 is open, refine only the written test specifications; do not create executable test files. After Phase 0 approval, replace planned IDs with exact executable test names and paths for all active ACs, not just this increment. Each test must exercise behavior behind its fake; mocks may provide boundary responses but may not simply return the expected result. Run the complete suite against mocks, inspect positive and failure assertions, and record results before any project implementation code. Separately record non-mock evidence required by each AC. Once the global gate passes, implement the smallest behavior and run the full regression suite before closing each increment.

## 6. Phase 0 exit checklist

- [ ] Approve the ADR proposal or record replacements.
- [ ] Assign every active AC to an increment, test IDs, expected outcome, evidence type, owner and blocked decision, preserving all 51 criteria.
- [ ] Approve public interfaces for provisioning, migration, environment validation, quota reporting, build gates and artifact verification.
- [ ] Document database schema, idempotency, transaction/locking, outbox, RLS and secret boundaries for the foundation slice.
- [ ] Confirm current Vercel/Supabase Free account capacity and Hobby eligibility before provisioning.
- [ ] Review current direct dependency versions/licenses and update `ATTRIBUTIONS.md`; commit a lockfile only after toolchain approval.
- [ ] Complete all planning/design/decision work; keep this checklist free of executable test or implementation tasks.

**Current gate:** not passed. Phase 0 may pass only after the baseline, interfaces, schema/security contracts, AC expected outcomes/evidence types, and decision dispositions are approved. The next required inputs are approval or replacement of the framework/package/test-stack proposal, plus confirmation of the Staging/Production project layout and provisioning contract. Gameplay decisions outside Phase 1 may remain open only when their AC expected outcomes remain explicitly blocked and assigned. After Phase 0 passes, the next gate is the global mock validation of every active AC test; no project implementation code begins before it passes.
