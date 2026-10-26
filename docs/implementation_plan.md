# Wordpairs Implementation Plan

**Status:** Phase 0 planning closure started; application implementation is gated  
**Planning baseline:** Requirements v2.4, 26 October 2026
**Process:** Byrd Development Process draft v4  
**Target repository:** `sharpninja/wordpairs`  
**Execution tracker:** [`implementation_phase0_execution.md`](implementation_phase0_execution.md)

## 1. Purpose and governing documents

This plan decomposes the current requirements into reviewable implementation increments, each with explicit acceptance-criterion coverage, a mock-first test gate, and a deployable result. The functional and technical requirements and the acceptance criteria in [`word_association_game_requirements.md`](word_association_game_requirements.md) remain authoritative. This plan does not silently resolve the decision register or weaken any acceptance criterion.

The work follows the [Byrd Development Process v4](https://github.com/sharpninja/McpServer/blob/main/docs/Development-Process-draft-v4.md), with the stricter project-specific gate explicitly required by the user: complete planning and define iterations before implementation; discover components and document public interfaces before code; after Phase 0 approval, author the full executable test suite for all active ACs, validate every test against mocks, and only then begin any production implementation code. After that global gate, implement in small increments, keep the full prior suite green, add integration tests after unit tests are established, validate with human users where appropriate, and deploy through Development, Staging, and Production environments. The global gate does not replace external-platform, integration, or human evidence that an AC separately requires.

### Non-negotiable implementation rules

1. **No tests or implementation code before Phase 0 approval.** Phase 0 exit requires a final expected outcome and evidence disposition for every active AC. Resolve every decision that changes an active AC's expected result; if behavior is deferred, formally revise the requirements so the AC is not in the active baseline. A blocked, expectation-free test cannot pass Phase 0.
2. **100% acceptance-criterion traceability.** Every active AC has at least one named test case before its behavior is implemented. No AC is counted as covered merely because a nearby scenario happens to exercise it.
3. **Global mock-validation gate before project implementation.** After Phase 0 is approved and expected behavior is fixed, author all active-AC contract tests, create executable boundary mocks/fakes, and validate every such test against mocks before writing any project implementation code or scripts/configuration. Database concurrency, RLS, transactional durability, deployment, and other system-level integration tests are additional evidence tiers: define their contract assertions before implementation, validate the application/domain contracts with mocks, then run the separate real-system tests against disposable environments after adapters exist. A mock does not prove a database invariant or external platform fact. Do not replace a failing test, relax an assertion, or label a valid test invalid to make progress.
4. **Green regression suite at every increment boundary.** Run all tests for the current increment and all earlier increments before marking the increment complete.
5. **No GitHub Actions dependency.** Use Vercel Git integration for branch previews and production. Run provisioning and release packaging manually from an authenticated workstation, as specified in the requirements.
6. **Free-tier boundary.** Use Vercel Hobby and Supabase Free only. Do not silently enable paid services, usage, add-ons, or upgrades.
7. **GPL and supply-chain records.** Keep project source under GPL-2.0-only; review every distributed dependency and asset for compatibility and notices. Generate a commit-specific CycloneDX SWBOM for each Preview and Production deployment and include the matching SWBOM plus `LICENSE` in each release archive.

## 2. Planning gate: decisions, architecture, and interfaces

The current requirements call out unresolved or proposed decisions. Before Phase 0 can pass, update the decision register and requirements together and obtain a disposition for every decision that affects an active AC's expected outcome. A decision may remain open only if the associated AC is formally revised out of the active baseline before approval. Assign every remaining active criterion to an increment with a fixed expected result; no active AC may carry an unresolved expected outcome into the global mock gate. Do not silently defer behavior or count an expectation-free test as covered.

| Decision group | Required outcome before affected implementation | Primary impact |
|---|---|---|
| Match progression | Approve match length, stage duration, timeout/no-response behavior, and no-solver category fallback. | Round state machine and timer contracts (AC-04–14). |
| Answer and result policy | Approve answer normalization/accepted-answer semantics, total-time aggregation, unsolved-round treatment, and final equal-time tie behavior. | Validation, scoring, and final standings (AC-06–14, AC-16). |
| Content baseline | Define starting pair volume per category, pair reuse policy, Colors relationship examples, and initial curated catalog. | Content schema, catalog validation, and playable seed data (AC-05, AC-16). |
| Nominations and moderation | Define unique-voter counting, duplicate nomination limits, moderation roles/states, review timing, appeals/removal, and 10-win scope. | Eligibility rules, audit model, moderation interface (AC-17–19). |
| Identity and player labels | Confirm display name behavior, guest persistence, and account-linking behavior. Verify the OpenAI OIDC issuer/discovery, scopes, callback, and token-validation contract before committing to an auth adapter. | Identity model and session lifecycle (AC-03, AC-20–21). |
| Lobby discovery and invitations | Approve default discoverability, searchable fields, quick-match policy, observer limit, and inviter attribution for manually shared room codes. | Lobby query privacy and observer authorization (AC-22–28). |
| Readiness and host controls | Approve countdown duration and creator/host powers. Preserve the confirmed split: a timeout boots the holdout and starts the countdown for rooms over two players; an exactly two-player lobby keeps the holdout and waits for both to be ready. | Readiness state machine, roster lock and timeout boundary (AC-30–33). |
| Public landing page | Approve leaderboard metric/period, guest inclusion, public labels/privacy/opt-out, tie order, lobby fields/count precision/refresh/join behavior, and rules-summary source. | Anonymous read model, public data privacy, landing page behavior (AC-43). |
| Reactions | Approve reaction display duration and rate limit. | Realtime event and UI policy (AC-29). |
| Operations | Define room expiry/reconnection/creator disconnect behavior, expected concurrency, and exact recoverable free-quota behavior. Confirm free-tier configuration remains non-commercial/personal. | Persistence, scaling, operational limits (AC-35–37). |

Before coding, produce and review these design artifacts:

- Architecture decision record confirming the proposed Next.js/TypeScript application framework and detailing the already specified Vercel and Supabase choices, guest/OIDC identity, and server-authoritative game state. Vercel and Supabase are requirements (TR-20–TR-24); Next.js/TypeScript remain proposed until this ADR is approved.
- Pattern decision record in [`architecture_patterns.md`](architecture_patterns.md) covering DDD boundaries, ports/adapters, pure policy testing, room transactions, idempotency, and transactional outbox.
- Context/container diagram and trust-boundary notes. Identify browser, Next.js server/API, Supabase database, Realtime, identity provider, Vercel deployment, and operator workstation responsibilities.
- Domain model and state-transition diagrams for room/lobby readiness, membership/observer promotion, match, round/hint stages, nominations, moderation, and suggestions.
- Public interface specifications: route/action inputs and outputs, event names/payloads, authorization checks, error codes, and versioning policy. Document which side owns each timer and timestamp.
- Database schema and migrations for profiles, rooms, ordered player roster, observers/invitation context, ready states, curated categories/pairs, matches/rounds/submissions/scores, nominations, moderation, suggestions, and audit events. Include uniqueness, foreign-key, transaction, retention, and row-level-security policies.
- Mock boundary catalog: clock, random-number source, repository/database, Realtime publisher/subscriber, OIDC verifier, environment/quota status, and Vercel build metadata. Production logic must depend on these interfaces rather than hidden globals.
- Requirements-to-test traceability matrix, initial content plan, accessibility checks, security/threat review, deployment constraints and abstract environment-isolation evidence, and release/SWBOM artifact contract. Final branch/project topology and account-capacity verification are Phase 1 provisioning-entry decisions, not Phase 0 exit conditions.

## 3. Delivery sequence and phase gates

Phases are ordered by dependency. Phase 0 is the planning-only gate. No executable tests or implementation code may be authored until Phase 0 has passed. After Phase 0, all active AC tests must be authored and mock-validated as a single global pre-implementation gate; only then may project implementation begin. Implementation may then proceed in small increments, with each increment's applicable tests run and the complete existing regression suite green. External account, static configuration, integration, deployment, and human evidence remains required wherever an AC calls for it; mocked evidence alone does not satisfy those checks.

| Phase | Outcome and included work | AC coverage | Entry and exit gate |
|---|---|---|---|
| **0 — Planning closure** | Resolve decisions that affect active expected results; formally revise the baseline if any behavior is deferred; approve architecture, interfaces, database/security design, content seed approach, AC traceability, dependency/license review, test strategy, and iteration order. Specify all test expectations without authoring executable tests. | Every active criterion has a fixed expected result, test IDs, and evidence tiers. | Exit only when the product baseline and architecture are approved and no active AC has an unresolved expected outcome. Planning documents and test specifications only; no executable tests, project scripts/configuration, or production code. |
| **1 — Delivery foundation** | Create app/tooling skeleton only after Phase 0; lock direct dependencies; configure local Development, persistent Staging Preview, and Production environments; implement safe repeatable Supabase/Vercel provisioning and migrations; add test/build scripts; configure Vercel Git integration; design secrets and quota handling; add SWBOM generation and archive packaging gates; enforce modular domain/import boundaries. | AC-34–42, AC-48–49, AC-51, with deployment checks for AC-35–37. | Mock/contract tests for provisioning, environment isolation, build order, artifact metadata, archive membership, failure blocking, and domain-port boundaries pass before scripts/configuration are implemented. Initial Preview and Production deployment evidence is required. |
| **2 — Public landing, identity, profiles, room creation and joining** | Implement the anonymous landing page with the approved leaderboard projection, public discoverable-lobby summary, and gameplay rules; then guest and approved OIDC profile flows, icons, room creation/capacity, codes/deep links, direct joins, atomic slot assignment, lobby list, quick match, invite/observer entry, and observer permission boundaries. | AC-01–03, AC-20–28, AC-43, AC-46, AC-50–51. | Mock public read projections, identity verifier, room repository/transactions, and realtime interfaces; prove privacy filters, boundary and concurrency behavior before implementation. Exit with landing page available without login, cross-client integration tests, and no over-capacity race. |
| **3 — Lobby lifecycle and readiness** | Implement ordered membership, observer queue timestamps, pre-countdown vacancy promotion and roster compaction, ready state, 30-second idle prompt, holdout warning/removal, countdown start/lock, and no replacement after lock. | AC-24–28, AC-30–33 (plus AC-01/02 membership regression). | Use a fake clock and deterministic event scheduler. Mock multi-client events and simultaneous leave/ready/timeout operations. Exit only when boundary and race tests prove the roster invariant and locked-roster rule. |
| **4 — Curated content and core match/round engine** | Implement validated catalog loading; category art binding; roster snapshot and anchor draw; category choice; authoritative round progression and stage submissions; answer checking; scoring/time; solve locking; hint visibility; reveal; summaries and standings/tiebreak. | AC-04–16, AC-45. | Mock content repository, clock, random source, and concurrent submissions. Prove deterministic ordering, privacy, stage transitions, scoring, and result calculations against mocks first. Exit with service integration tests against a disposable Supabase environment. |
| **5 — Nominations, suggestions, reactions** | Implement no-hint nomination eligibility, normalization/counting, moderation gate and future-pool eligibility; 10-win unlock and three-pair category suggestion review; menu-limited emoji reactions and realtime delivery. | AC-17–19, AC-29, AC-47. | Mock auth, moderation roles, thresholds, content validation, and event transport. Exit with unauthorized, below-threshold, duplicate, rejected, and approved cases covered. |
| **6 — Responsive UX, accessibility, and complete acceptance validation** | Complete phone portrait/landscape behavior, keyboard/touch operation, contrast and focus states, loading/offline/quota/reconnect states; run end-to-end flows across landing, identity, lobby, game, and results; close all AC traceability gaps. | AC-01–33, AC-37–38, AC-43–47, AC-50–51, with full regression across AC-01–51. | Browser tests use Playwright with deterministic seeded data and mocked/intercepted external services as appropriate. Human validation on representative phone-sized viewports and both orientations. No known acceptance criterion remains uncovered or failing. |
| **7 — Release readiness and publication** | Generate the production commit's SWBOM; verify schema, commit, deployment URL/environment, dependencies/licenses, and no secrets; package complete GPL source and matching SWBOM; validate archive; publish through the approved manual release procedure; verify deployed production and downloadable archive. | AC-34–42 plus final regression of all active criteria. | Release candidate passes all tests, manual checks, free-tier audit, license/attribution review, archive inspection, and source/build/SWBOM commit matching. Publication is blocked on any mismatch. |

### Phase 1 deployment environments (topology finalized at Phase 1 entry)

The environment mapping below is a planning proposal. Confirm the branch-to-environment mapping, project allocation, account capacity, and service settings before Phase 1 provisioning/configuration work. These operational choices do not gate Phase 0 or change the AC contract expectations.

- **Development:** local Next.js and local test/mocked services; disposable Supabase project or isolated local database for integration testing where practical.
- **Staging:** a persistent Vercel Preview target (for example, a protected `staging` branch) and isolated Supabase project/configuration. Validate migrations, quotas, OIDC callback, and release packaging without Production data.
- **Production:** Vercel Production deployments from `main`, connected only to the Production Supabase project and production secrets.

Each environment has separately scoped credentials and Supabase/Vercel variables. Provisioning scripts must be repeatable and safe to rerun, print identifiers/status but never secret values, and make paid resource configuration impossible by default. Document free-plan limits and verify current account quotas at provisioning/release time.

## 4. Acceptance-criterion traceability

This is the initial allocation of every criterion to its first implementation phase. During Phase 0, replace the suggested test IDs with concrete test-file/test-case identifiers. A criterion may have multiple unit, integration, browser, and manual tests; it must have at least one automated assertion unless the approved criterion explicitly requires human-only evidence.

| Criteria | Increment | Minimum test evidence |
|---|---|---|
| AC-01–03 | Phase 2 | Multi-client room membership, capacity rejection without state mutation, profile icon persistence through lobby/round/standings. |
| AC-04–05 | Phase 4 | Deterministic N-boundary/random draw and anchor authorization; category-to-background mapping across distinct pairs. |
| AC-06–10 | Phase 4 | Score cases for all stages, unsolved reveal, hint progression/recipient filtering, score lock, elapsed-time source, and live scorecard update. |
| AC-11–14 | Phase 4 | Earliest accepted solver selection; cumulative and round summary; final score sort; approved time tie-break including edge cases from decision register. |
| AC-15 | Phase 6 | Viewport matrix in portrait/landscape; no horizontal overflow; input, hint, and scorecard controls visible and operable. |
| AC-16 | Phase 4 | Valid and invalid catalog fixtures; missing prompt/answer/hint/background and wrong hint count rejected; no incomplete category enabled. |
| AC-17–18 | Phase 5 | Eligibility on no-hint solve only; threshold 9/10 boundary; moderation required; complete pair required before playable. |
| AC-19 | Phase 5 | Win count 9/10 boundary; exactly one category plus three pairs submitted; review/approval and incomplete-content rejection. |
| AC-20–21 | Phase 2 | Mock issuer success, invalid signature/issuer/audience/state failures, profile association; guest identity without token and ability to create/join. |
| AC-22–23 | Phase 2 | Discoverable/waiting/open visibility matrix; hidden/full/started excluded; quick-match success, no-match fallback, and concurrent capacity race. |
| AC-24–26 | Phase 2 | Capacity lower/upper/invalid boundaries; code/deep-link destination; deep link bypasses browse; open-slot and full-room outcomes. |
| AC-27–28 | Phase 2 | Observer consumes no player slot; inviter binding; realtime perspective; rejected commands and no score/state mutation. |
| AC-29 | Phase 5 | Allowed emoji broadcast to players/observers; arbitrary payload and state/score mutation rejected; display/rate rules after approval. |
| AC-30–33 | Phase 3 | Oldest observer selected; player relative order retained; no-observer vacancy; fake-clock 30s idle; 5s holdout warning; ready-before-expiry; timeout boot/countdown for rooms over two players; exactly two-player timeout keeps holdout and waits; lock and no replacement after countdown. |
| AC-34–37 | Phase 1 | Vercel branch-to-environment mapping; no Actions dependency; free plan configuration; rerunnable provisioning/migrations/secrets masking; recoverable quota response without paid fallback. |
| AC-38 | Phases 0–7 | [`ac_test_inventory.md`](ac_test_inventory.md) links all 51 active ACs to planned test IDs; it does not mean test code has been authored or passed. After Phase 0 approval, every active AC test must be authored and mock-validated before the first project implementation code; thereafter the test command blocks the application build on failure. |
| AC-39 | Phase 1 and any dependency/asset change | Lockfile consistency; attribution row/license/source for every direct package and external asset; unreviewed dependency/asset blocks release. |
| AC-40 | Phase 1 and every deployment | Build fixture for valid CycloneDX 1.6; exact lockfile and commit metadata; runtime/dev inventory; environment/URL; secret scan; endpoint inclusion in same immutable deployment. |
| AC-41 | Phase 1 and every release | Archive contains exact release source, `LICENSE`, and `sbom/<sha>.cdx.json`; reject missing, malformed, or wrong-commit report. |
| AC-42 | Phase 1 and every release | GPL-2.0-only notice and complete text present; bundled components/asset notices retained and compatibility review recorded. |
| AC-43 | Phase 2 and Phase 6 | Anonymous visitor sees approved leaderboard, discoverable/joinable lobby information, and rules; forbidden fields absent from page/API/Realtime payloads; no-login path, pagination/cache/refresh, no-data, unavailable, and responsive states covered. |
| AC-44 | Phase 6 | Touch/keyboard operability, contrast, visible focus, and non-color status cues checked at phone portrait/landscape sizes. |
| AC-45 | Phase 4 and Phase 6 | Correct answer checked against approved policy; incorrect/replayed submissions do not score twice or leak guess text; target is withheld until reveal. |
| AC-46 | Phase 2 | Invalid OIDC signature/issuer/audience/state/nonce/expiry fails closed without creating or associating an authenticated profile. |
| AC-47 | Phase 5 | Unauthorized moderation/catalog changes are rejected; moderation state/count/eligibility remain auditable; unapproved/incomplete content cannot be played. |
| AC-48 | Phase 1 | Provisioning rerun preserves project data, reports migrations, protects secrets, and keeps Preview separate from Production. |
| AC-49 | Phase 1 | Test or SWBOM failure blocks application deployment; successful deployment serves the matching report for its lockfile and commit. |
| AC-50 | Phase 2 and Phase 6 | Anonymous landing response contains only approved leaderboard/lobby fields and excludes room codes, private profile/game/moderation data, and secrets. |
| AC-51 | Phases 1, 2, and 6 | Domain unit/use-case tests run through ports/fakes; architecture check blocks framework imports in the domain; concurrent final-seat joins and idempotent retries preserve capacity and emit one durable event per committed transition. |

## 5. Global mock-validation gate and incremental TDD protocol

The sequence has two gates. First, Phase 0 must pass; until then, work is limited to requirements, decision records, architecture/interface/schema designs, traceability, and non-executable test specifications. Second, after Phase 0 approval and before any project implementation code, author and mock-validate the complete test suite for every active AC. The global gate does not claim mocked verification is sufficient for facts that require static configuration inspection, account verification, live integration, deployment, or human validation. Record those separate evidence types in the AC inventory. Once the global mock-validation gate passes, apply this sequence to each small implementation increment:

1. **Select scope:** identify the approved requirement and AC IDs; state the behavior, invariant, and exclusions. Confirm no unresolved decision changes expected results.
2. **Design boundary:** identify the public interface and injected collaborators. For time, randomness, network, persistence, identity, and event delivery, define deterministic seams before test authoring.
3. **Write the AC-to-test mapping:** record at least one test case for each applicable AC and each important boundary case. Include negative/security cases and concurrent state changes when relevant.
4. **Build mocks/fakes:** provide executable mock adapters that represent the specified public contract. Keep assertions on observable behavior; do not let the mock implement the business rule being tested.
5. **Global pre-implementation validation:** before any project implementation code, execute the complete active-AC test suite using mocks/fakes. Confirm assertions measure behavior rather than mock outputs; record every test ID, command, result, and mock boundary. Resolve failures or approved AC dispositions without weakening valid assertions.
6. **Implement the smallest behavior:** after the global gate passes, use failing contracts as targets within a small increment. Avoid unrelated refactoring or scope additions.
7. **Run increment and regression suites:** run all tests for this increment plus all previous increments. Keep production integration separate from the mock contract tests.
8. **Integrate real adapters:** after unit tests pass, add integration tests against disposable/local services; only use test credentials and seeded data. Do not replace mock-first unit tests with integration-only coverage.
9. **Review evidence:** verify AC mapping, test output, security boundaries, accessibility, docs, migrations, and artifact effects. Update the matrix whenever requirements change.
10. **Close increment:** merge only when checks pass and the work is reviewable. Vercel Preview must deploy the branch and carry its own SWBOM. Manual human validation is recorded where required.

Mock fidelity is reviewed: mocks implement the documented interface, model failures/timeouts and authorization results, and do not encode implementation internals. Use fixed clocks, seeded random sources, transaction fakes, event capture, and deterministic fixtures. Add contract tests to compare real adapters with the same interface so mocks cannot drift.

## 6. Proposed test architecture

| Layer | Purpose | Tools and boundaries |
|---|---|---|
| Domain/unit | Pure room, roster, ready, match, round, scoring, eligibility, and validation rules. | Vitest; fake clock/randomness; repository and publisher interfaces mocked. |
| Component | Accessible controls, lobby transitions, observer/read-only view, hints, scorecards, summaries, and error states. | React Testing Library and user-event; mock API/client events; jsdom. |
| Service/contract | Authorization, transactions, quota handling, identity validation, and Realtime event payload contracts. | Vitest/MSW; Supabase/OIDC adapters replaced by contract fakes; explicit commit/rollback tests. |
| Browser acceptance | Anonymous landing page, full player journeys, and responsive layout across guest/authenticated identities and multiple clients. | Playwright; deterministic data; network interception for OIDC and external services; local or Staging app. |
| Integration | Verify migrations, row-level security, transactions, persistence/reconnect, and Realtime behavior. | Disposable Supabase/local database project; seeded fixtures; never Production. |
| Human validation | Game comprehension, mobile use, moderation experience, accessibility, and staging/release procedure. | Approved checklist with representative devices/viewports; findings tracked against AC/decisions. |

Every mock is initialized with deterministic clocks, IDs, and random values. Tests cover error and retry states as well as success. Never use real OIDC credentials, Production data, or paid services in automated tests. Preserve test output as build/release evidence.

## 7. Architecture and implementation order

### 7.1 Trust and authority

The browser is an untrusted presentation/client. A server-side application service owns membership, roster order, readiness, countdown transitions, answer validation, hint visibility, scoring, timestamps, category permissions, nomination eligibility, moderation state, and final ranking. Database constraints and transactions backstop service checks. Clients cannot choose trusted identity claims, promote themselves, assign points, reveal targets, alter the roster after lock, or mutate state through observer sessions.

Use a server-owned clock and injected random source. Assign a stable event/order key to simultaneous submissions and membership events. Persist the authoritative transition before broadcasting it. Realtime delivery is a view of committed state, not the source of truth. Define idempotency keys for joins, guesses, reactions, and moderation actions so retries do not duplicate side effects.

### 7.2 Suggested module boundaries

- `domain/`: typed entities, value objects, validation, state machines, scoring, and pure policies.
- `application/`: use cases and transaction orchestration; depends on interfaces only.
- `adapters/supabase/`: queries, migrations, transaction/RPC functions, row-level security, and Realtime transport.
- `adapters/identity/`: OIDC token verification and guest session issuance.
- `web/`: Next.js routes, server actions/API handlers, accessible React views, and client event subscriptions.
- `content/`: curated seed records and category backgrounds; validation runs at build and import.
- `tests/`: unit, component, service-contract, integration, and browser suites organized by AC ID.
- `scripts/`: provisioning, migration/status checks, SWBOM validation, release archive creation, and archive inspection. Scripts are safe to rerun and redact secrets.

Finalize exact module and route names during architecture approval. This is a proposed boundary map, not authorization to start coding.

### 7.3 Critical data invariants

- Active player count never exceeds room capacity (2–25); assignment is atomic under concurrency.
- A player appears once in an active roster; order is explicit and stable except the confirmed pre-countdown compaction rule.
- Promotion only occurs before countdown start, selects the earliest observer, places them last, shifts other players up without reordering them, and preserves remaining observers.
- Start countdown and roster lock happen atomically when all players are ready, or when an expired holdout is removed from a room with more than two players. In an exactly two-player room, expiry leaves the holdout in place and does not start the countdown. After lock, departures create a vacancy and never trigger replacement.
- A 30-second idle readiness prompt and 5-second holdout warning are driven from authoritative state/version timestamps, so stale timer callbacks cannot mutate a changed lobby.
- One accepted score per player per round; stage score is fixed at acceptance. Hints go only to players unsolved at the current transition.
- The target answer is never sent before reveal; incorrect guess text is never broadcast to other players or observers.
- Observer identity is bound to approved invite context; observer commands are read-only and scoreless.
- The landing page uses a public read-only projection with an allowlist of approved leaderboard/lobby fields; it cannot query private room state or mutate game state.
- OIDC authentication creates an authenticated profile only after server validation of the configured provider's signature and required claims.
- Moderation and catalog activation are separately authorized; candidate approval never directly makes incomplete content playable.
- Provisioning separates Preview/Staging and Production targets and can be safely repeated without exposing secrets or erasing user data.
- Domain policies are pure and framework-independent; each room mutation uses a transactional lock/version check, idempotency key, and same-transaction outbox event.
- Only approved, complete content records are playable; nominations/suggestions cannot bypass moderation or catalog validation.

## 8. Release, deployment, licensing, and SWBOM

Vercel Git integration creates Preview deployments for non-production branches and Production deployments from `main`. Configure a persistent Staging Preview path plus Development and Production credentials. The app build command first runs the complete test suite. After tests pass, generate a CycloneDX JSON 1.6 SWBOM from the exact committed lockfile and Vercel build metadata, then build the app so the report is included at `public/sbom/<commit-sha>.cdx.json` in that immutable deployment. The report includes direct/transitive runtime and development components, declared licenses, package URLs, dependency relationships, build timestamp, commit SHA, deployment environment, and deployment URL; it contains no secrets.

For each release, a manual, reproducible packaging command obtains the SWBOM for the selected Production deployment and verifies schema, hash/commit identity, and required metadata. It creates a source archive containing the complete source for that release, root `LICENSE`, attribution notices, and the same report at `sbom/<commit-sha>.cdx.json`. Validate the archive contents and open/read the SWBOM before publishing the release. Fail closed if the report is missing, invalid, secret-bearing, or references a different commit. Do not substitute a newly generated report from a different dependency lockfile or a Preview deployment.

Before locking dependencies, review direct/transitive licenses and whether shipped browser bundles/assets constitute redistributed components. Planned Apache-2.0 developer/build tools must remain tooling-only; preserve their notices as required by their terms and do not bundle them as game runtime code. A SWBOM's declared license field is an inventory, not an automatic compatibility ruling. The attribution document must track all direct dependencies and externally sourced assets; refresh it and the SWBOM whenever dependency or asset inputs change.

## 9. Project risks and controls

| Risk | Control / proof required |
|---|---|
| Ambiguous rules cause rework or incompatible tests. | Resolve decisions before affected AC tests; update approved requirements and traceability first. |
| Timer/event races corrupt room state. | State-versioned deadlines, server clock, transactional transitions, deterministic race tests, idempotency. |
| Concurrent joins overfill rooms. | Atomic database reservation and concurrency integration tests; quick-match uses the same reservation path as direct join. |
| OIDC assumptions fail against the chosen provider. | Verify discovery metadata and token-validation contract in planning; mock success/failure first; no token trust from browser input. |
| Realtime exposes hidden answers or private guesses. | Explicit event allowlist and per-recipient projections; security tests assert secret fields are absent. |
| Free-tier pause/quota disrupts play. | Isolated quota adapter, recoverable UX, load/capacity target decision, staging quota simulation, no paid fallback. |
| GPL conflict in runtime/transitive bundle or artwork. | Lockfile/SWBOM/license review before adding or shipping each component; preserve notices; release gate blocks unresolved licenses. |
| Mock differs from Supabase/OIDC behavior. | Adapter contract tests plus staged integration test suite after mock-first unit tests. |
| Build artifact and source archive describe different commits. | Embed commit SHA in SWBOM; verify deployment, source tag, lockfile, and archive all match before publication. |
| Context/process drift skips a gate. | Keep this plan, AC traceability, and per-increment evidence in the repo; each work item names AC IDs and mock-first gate. |

## 10. Completion definition

An implementation increment is complete only when its approved ACs are mapped to passing mock-first tests, implementation and regression suites pass, security and data invariants are verified, migrations and interfaces are documented, and required accessibility/deployment evidence is recorded. The project release is complete only when all active ACs are covered and passing, unresolved decisions have approved dispositions, Development/Staging/Production deployment checks succeed within the free-tier constraint, the GPL notices are correct, the Production deployment serves its exact SWBOM, and the published source archive contains the matching SWBOM and license.

No implementation work or test suite has been created by this plan. Starting Phase 1 requires approval of the plan and Phase 0 baseline; the normal mock-first TDD gates apply to every subsequent increment.
