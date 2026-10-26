# Wordpairs Implementation Plan

**Status:** Phase 0 approved; global active-AC mock-validation gate precedes production implementation  
**Planning baseline:** Requirements v2.6, 26 October 2026
**Process:** Byrd Development Process draft v4  
**Target repository:** `sharpninja/wordpairs`  
**Execution tracker:** [`implementation_phase0_execution.md`](implementation_phase0_execution.md)

## 1. Purpose and governing documents

This plan decomposes the current requirements into reviewable coding increments, each with explicit acceptance-criterion coverage and a mock-first test gate. Deployment and release operations are a separate post-coding phase. The functional and technical requirements and acceptance criteria in [`word_association_game_requirements.md`](word_association_game_requirements.md) remain authoritative. This plan does not silently weaken any acceptance criterion.

Deployment, provisioning, SWBOM generation, environment isolation, and deployment-build gates are TR-bound technical work, not AC-bound behaviors. Their mockable checks are test-first, while live deployment/account checks remain technical integration/operational evidence and cannot satisfy AC coverage.

The work follows the [Byrd Development Process v4](https://github.com/sharpninja/McpServer/blob/main/docs/Development-Process-draft-v4.md), with the stricter project-specific gate explicitly required by the user: complete planning and define iterations before implementation; discover components and document public interfaces before code; after Phase 0 approval, author the full executable test suite for all active ACs, validate every test against mocks, and only then begin any production implementation code. After that global gate, implement Phases 1–6 in small coding increments, keep the full prior suite green, add integration tests after unit tests are established, and validate with human users where appropriate. Begin deployment and release operations only after coding is complete. Deployed artifacts and deployment/account checks are never AC evidence.

### Non-negotiable implementation rules

1. **No tests or implementation code before Phase 0 approval.** Phase 0 exit requires a final expected outcome and evidence disposition for every active AC. Resolve every decision that changes an active AC's expected result; if behavior is deferred, formally revise the requirements so the AC is not in the active baseline. A blocked, expectation-free test cannot pass Phase 0.
2. **100% acceptance-criterion traceability.** Every active AC has at least one named test case before its behavior is implemented. No AC is counted as covered merely because a nearby scenario happens to exercise it.
3. **Global mock-oracle gate before project implementation.** After Phase 0 is approved and expected behavior is fixed, bootstrap only the reviewed test toolchain/configuration (no product behavior), then author all active-AC contract oracles. For each oracle, validate that a conforming scripted mock trace is accepted and a deliberately violating trace is rejected before writing production implementation code. This proves the test assertions are sensitive; it does not prove the application behavior. Keep the same oracles and run them against each real implementation increment. Database concurrency, RLS, transactional durability, deployment, and other system-level integration tests are additional evidence tiers: define their contract assertions before implementation, validate the application/domain contracts with mocks, then run the separate real-system tests against disposable environments after adapters exist. These integration checks are TR/operational evidence only and never count toward AC coverage. A mock does not prove a database invariant or external platform fact. Do not replace a failing test, relax an assertion, or label a valid test invalid to make progress.
4. **Green regression suite at every increment boundary.** Run all tests for the current increment and all earlier increments before marking the increment complete.
5. **No GitHub Actions dependency.** Use Vercel Git integration for branch previews and production. Run provisioning and release packaging manually from an authenticated workstation, as specified in the requirements.
6. **Free-tier boundary.** Use Vercel Hobby and Supabase Free only. Do not silently enable paid services, usage, add-ons, or upgrades.
7. **GPL and supply-chain records.** Keep project source under GPL-2.0-only; review every distributed dependency and asset for compatibility and notices. Generate a commit-specific CycloneDX SWBOM for each Preview and Production deployment and include the matching SWBOM plus `LICENSE` in each release archive; deployment behavior is TR-bound, while source-archive contents remain independently fixture-testable under AC-41/42.

## 2. Approved Phase 0 baseline: architecture and interfaces

Requirements v2.6 resolves product decisions that affect active AC expected results. Phase 0 was approved by the user on 26 October 2026 after technical review of the selected architecture and contracts and hostile validation of the baseline. If a later change affects an AC expected result, revise the baseline and test specification before implementation.

| Technical artifact | Phase 0 disposition | Primary impact |
|---|---|---|
| Stack and architecture ADR | Selected baseline: Next.js/TypeScript/npm; Vitest, MSW/fakes, Testing Library, Playwright; modular monolith with DDD boundaries and ports/adapters. The selected architecture is approved; install the recorded compatible versions as test tooling. | Test setup, module boundaries and toolchain (AC-38/39; TR-26–29). |
| Public application interfaces | Review command/query inputs, result/error types, authorization, event schemas, projection allowlists, idempotency keys and clock ownership in the Phase 0 contract draft. | Every active AC and server boundary. |
| Data/security contract | Approve logical schema, RLS, transaction/version strategy, moderator role source, secret handling, no raw incorrect-guess persistence, retention, idempotency and outbox lifecycle. | AC-28/37/45/47/50/51; TR-01–05/09/22/23/31. |
| Deadline behavior | v2.6 selects 20-second answer stages, 30-second lobby-idle prompt, five-second holdout warning, 10-second countdown, versioned deadlines, and Supabase Cron/pg_cron adapter. Verify Free-plan operational availability only in post-coding Phase 7. | AC-30–33; TR-22. |
| Content and privacy contract | v2.6 sets 10 initial pairs per category, no within-match repeat before pool exhaustion, unique-player nomination count, moderation roles/appeal, generated aliases, public leaderboard and lobby allowlists. | AC-05/16–19/43/47/50. |
| Deployment and release contracts | Vercel/Supabase/Hobby/Free/manual workflow and SWBOM/archive contracts remain TR-only. Specify them during planning, but implement/configure/deploy only after coding Phases 1–6 in Phase 7. | TR-20–29; AC-41/42 cover temporary source-archive fixtures only. |

The following design artifacts were reviewed and approved at Phase 0 exit:

- Architecture decision record recording the selected Next.js/TypeScript/npm stack and detailing Vercel/Supabase adapters, guest/OpenAI OIDC identity, and server-authoritative game state. Vercel and Supabase are requirements (TR-20–TR-24); the v2.6 baseline selects the framework and language.
- Pattern decision record in [`architecture_patterns.md`](architecture_patterns.md) covering DDD boundaries, ports/adapters, pure policy testing, room transactions, idempotency, and transactional outbox.
- Context/container diagram and trust-boundary notes. Identify browser, Next.js server/API, Supabase database, Realtime, identity provider, Vercel deployment, and operator workstation responsibilities.
- Domain model and state-transition diagrams for room/lobby readiness, membership/observer promotion, match, round/hint stages, nominations, moderation, and suggestions.
- Public interface specifications: route/action inputs and outputs, event names/payloads, authorization checks, error codes, and versioning policy. Document which side owns each timer and timestamp.
- Database schema and migrations for profiles, rooms, ordered player roster, observers/invitation context, ready states, curated categories/pairs, matches/rounds/submissions/scores, nominations, moderation, suggestions, and audit events. Include uniqueness, foreign-key, transaction, retention, and row-level-security policies.
- Mock boundary catalog: clock, random-number source, repository/database, Realtime publisher/subscriber, OIDC verifier, environment/quota status, and Vercel build metadata. Production logic must depend on these interfaces rather than hidden globals.
- Requirements-to-test traceability matrix, initial content plan, accessibility checks, security/threat review, deployment constraints and abstract environment-isolation evidence, and release/SWBOM artifact contract. Final branch/project topology and account-capacity verification are post-coding Phase 7 deployment-entry decisions, not Phase 0 exit conditions.
- The approved command, event, logical data, authorization, transaction, and timer contracts are in [`phase0_interface_and_data_contracts.md`](phase0_interface_and_data_contracts.md).

## 3. Delivery sequence and phase gates

Phases are ordered by dependency. Phase 0 was the planning-only gate and has passed. No production implementation code may be authored until the global active-AC mock-validation gate passes. After Phase 0, all active AC tests must be authored and mock-validated as a single global pre-implementation gate; only then may project implementation begin. Implementation may then proceed in small increments, with each increment's applicable tests run and the complete existing regression suite green. External account, static configuration, integration, deployment, and human evidence may be required by TRs or operational release policy, but no AC depends on deployed artifacts and none of that evidence contributes to AC coverage.

| Phase | Outcome and included work | AC coverage | Entry and exit gate |
|---|---|---|---|
| **0 — Planning closure** | Approve the v2.6 product baseline, selected architecture, interfaces, database/security contract, content seed approach, AC traceability, dependency/license review, test strategy, and iteration order. Specify all test expectations without authoring executable tests. | Every active criterion has a fixed expected result, test IDs, and evidence tiers. | Exit after baseline and technical contract approval, complete active-AC traceability, and hostile validation. No executable tests, project scripts/configuration, or production code. |
| **1 — Core application foundation** | After the global mock gate, create the application skeleton, lock direct dependencies, establish test scripts, implement core ports/adapters for persistence and identity, define migrations/schema, quota handling, and modular import boundaries. Do not configure or deploy Vercel environments in this coding phase. | Active AC-37, AC-39, AC-51; application persistence contracts TR-22–TR-23. | Keep unit/use-case suites green; mock-validate each TR contract before its implementation. Database integration evidence uses local/disposable services. |
| **2 — Public landing, identity, profiles, room creation and joining** | Implement the anonymous landing page with the approved leaderboard projection, public discoverable-lobby summary, and gameplay rules; then guest and approved OIDC profile flows, icons, room creation/capacity, codes/deep links, direct joins, atomic slot assignment, lobby list, quick match, invite/observer entry, and observer permission boundaries. | AC-01–03, AC-20–28, AC-43, AC-46, AC-50–51. | Mock public read projections, identity verifier, room repository/transactions, and realtime interfaces; prove privacy filters, boundary and concurrency behavior before implementation. Exit with landing page available without login, cross-client integration tests, and no over-capacity race. |
| **3 — Lobby lifecycle and readiness** | Implement ordered membership, observer queue timestamps, pre-countdown vacancy promotion and roster compaction, ready state, 30-second idle prompt, holdout warning/removal, countdown start/lock, and no replacement after lock. | AC-24–28, AC-30–33 (plus AC-01/02 membership regression). | Use a fake clock and deterministic event scheduler. Mock multi-client events and simultaneous leave/ready/timeout operations. Exit only when boundary and race tests prove the roster invariant and locked-roster rule. |
| **4 — Curated content and core match/round engine** | Implement validated catalog loading; category art binding; roster snapshot and anchor draw; category choice; authoritative round progression and stage submissions; answer checking; scoring/time; solve locking; hint visibility; reveal; summaries and standings/tiebreak. | AC-04–16, AC-45. | Mock content repository, clock, random source, and concurrent submissions. Prove deterministic ordering, privacy, stage transitions, scoring, and result calculations against mocks first. Exit with service integration tests against a disposable Supabase environment. |
| **5 — Nominations, suggestions, reactions** | Implement no-hint nomination eligibility, normalization/counting, moderation gate and future-pool eligibility; 10-win unlock and three-pair category suggestion review; menu-limited emoji reactions and realtime delivery. | AC-17–19, AC-29, AC-47. | Mock auth, moderation roles, thresholds, content validation, and event transport. Exit with unauthorized, below-threshold, duplicate, rejected, and approved cases covered. |
| **6 — Responsive UX, accessibility, and complete acceptance validation** | Complete phone portrait/landscape behavior, keyboard/touch operation, contrast and focus states, loading/offline/quota/reconnect states; run end-to-end flows across landing, identity, lobby, game, and results; close all AC traceability gaps. | All 45 active ACs; retired IDs AC-34, AC-35, AC-36, AC-40, AC-48, and AC-49 are excluded from AC regression. | Browser tests use deterministic seeded data and mocked/intercepted external services as appropriate. Human validation on representative phone-sized viewports and both orientations. No known acceptance criterion remains uncovered or failing. |
| **7 — Post-coding deployment and release** | Begins only after coding Phases 1–6 are complete and the full AC suite passes. Implement and run TR-only provisioning/build/SWBOM tools, confirm environment topology, provision Development/Staging/Production, connect Vercel Git integration, deploy and verify operations, package the complete GPL source archive with matching SWBOM, and publish. This phase performs operational configuration and release work; it adds no game features. | Final regression across all 45 active ACs; TR-20–TR-29 operational/build/release work. AC-41/42 verify source archive contents using temporary fixtures. | Validate mockable TR contracts before writing deployment tooling; then pass real account, integration and deployment checks separately. No deployment or Vercel Preview build occurs in coding Phases 1–6. Deployment checks and deployed artifacts never count as AC evidence. |

### Phase 0A test-harness bootstrap and Phase 1–6 execution packages

After Phase 0 approval, install only the direct dependencies listed in `ATTRIBUTIONS.md` that are needed to run tests; create the lockfile and minimal test-runner configuration; then author the contract tests, mocks/fakes, and fixtures. This bootstrap may add test-only configuration and test code, but no game domain behavior, UI, routes, database schema/migrations, production adapters, or deployment scripts. Run and record the complete mock suite for all 45 active ACs before starting Phase 1A. Phase 1A may then create the application skeleton and remaining production build/module configuration.

The phase table gives each phase's boundaries. This breakdown makes the implementation work reviewable and keeps production behavior within the approved AC contracts. The global active-AC mock-validation gate precedes all packages; each package then follows BDP v4 Red → Green → Refactor and closes with a full regression run.

| Phase / package | Work sequence | AC scope | Mock-first test focus | Exit evidence |
|---|---|---|---|---|
| **1A — Application skeleton and module boundaries** | Create the Next.js/TypeScript application skeleton and context/module boundaries; configure application lint/type/build commands against the already validated test harness. | AC-38/39/51; TR-25/26. | Test manifest completeness, dependency/attribution consistency, and domain import boundaries with fixture manifests and mocked adapters. | Reproducible local setup; lockfile matches ATTRIBUTIONS; 45/45 ACs mapped to 67 executable test oracles; conforming/violating mock-trace gate recorded. Product behavior still requires real-SUT validation. |
| **1B — Domain and application ports** | Create typed domain/application interfaces for room, match, content, profile, clock, random source, deadline scheduler, quota, identity, and outbox. | AC-37/51; TR-01/03/08/22/31. | Contract failures, idempotency outcomes, conflict responses, outbox intent, deterministic time/random seams; mocks do not implement domain decisions. | Domain has no framework imports; all contract tests compile and pass against fakes before adapters. |
| **1C — Persistence security and migration baseline** | Implement initial schema, constraints, RLS, server-only Supabase adapter, transaction/RPC boundaries, outbox and idempotency persistence. | AC-28/37/47/51; TR-01/05/09/22/31. | Application contracts remain fake-backed; local DB integration separately proves RLS, atomic capacity, idempotency and outbox durability (TR only). | Migration/RLS checks pass on local disposable Postgres; no deployed service is used. |
| **2A — Anonymous landing projections** | Build rules, ranking and lobby read models with bounded paging, empty/unavailable states, cache intervals, and no-auth route. | AC-43/50; TR-30. | Mock projection data tests all field allowlists, ranking, alias/opt-out, guest opt-in, 5-minute leaderboard refresh, 15-second lobby refresh, rules version/date, pagination and cache policy. | Anonymous journey passes with synthetic projections; private data remains absent. |
| **2B — Identity and profiles** | Implement guest browser identity, generated aliases/opt-out/icon, OIDC callback/token validation and profile association. | AC-03/20/21/46. | Fake OIDC discovery/JWKS/claim failures; guest persistence and account isolation; no real credentials. | Authenticated and guest sessions pass local tests; secrets stay server-side. |
| **2C — Rooms and discovery** | Implement create/capacity/code, browse/quick-match, invites/deep links, observer entry, scoped views and read-only authorization. | AC-01/02/22–28/50/51. | Capacity boundaries, join conflicts, FIFO quick match, stable IDs, invitation binding, privacy, and concurrent seat claims. | Cross-client room integration tests against local DB/Realtime pass; database evidence remains TR. |
| **3A — Membership and observer ordering** | Implement ordered player membership, observer arrival sequence, pre-countdown promotion into final slot, roster compaction, stable-ID ties, reconnect grace and room expiry. | AC-24–28/30/51; TR-09/10/18/31. | Fixed clock and interleaved leave/join commands; no observer promotion after countdown lock. | Aggregate invariants pass; separate TR database race cases pass locally. |
| **3B — Readiness and deadlines** | Implement SetReady, idle prompt, holdout warning, timeout policy, countdown and lock, below-minimum abort/close. | AC-30–33. | Fake clock/scheduler at 30s/5s/10s; 2-player wait; >2-player removal; ready/leave/expiry races; stale version no-ops. | All readiness and departure state transitions pass unit/use-case tests and local persistence integration. |
| **4A — Catalog and match setup** | Validate curated records; choose category/background; snapshot roster; assign anchor by injected uniform random range; choose pair without repeat until category pool is exhausted. | AC-04/05/16. | Catalog invalid fixtures, random range boundaries, anchor authorization, category background, pair pool depletion/reshuffle. | Only complete approved content is playable; seeded match setup is deterministic under fakes. |
| **4B — Round engine and scoring** | Implement no-hint and hint stages, submission acceptance, stage timers, answer normalization, score lock, solve times, reveal and summaries. | AC-06–14/45. | All scoring stages, no response/no solver, Unicode normalization, exact accepted answer set, simultaneous submissions, no duplicate scoring, private guesses/hints and final ties. | Full deterministic round suite passes; local integration confirms persisted ordering separately. |
| **5A — Nominations and moderation** | Implement eligibility from no-hint solves, normalized unique nominations, threshold queue, moderator roles/reasons/appeal/audit, complete-record curation gate, and future-pool query. | AC-16–18/47. | 9/10 threshold, unique profile, duplicate/retry, unauthorized and self-review cases, one appeal with distinct Senior Moderator uphold/overturn outcomes, audit, incomplete/unapproved exclusion. | Moderation decisions are audited and only complete curated content can enter future play. |
| **5B — Suggestions and reactions** | Implement ten-lifetime-win unlock, one-open suggestion with three pairs, review/curation handoff, reaction menu, rate interval and expiry. | AC-19/29/47. | 9/10 wins, duplicate open suggestion, invalid pair count, approval ≠ publication, emoji allowlist, 2s/5s behavior, no state mutation. | Suggestion/reaction suites pass; no paid service is introduced. |
| **6A — Responsive and accessible UI** | Finish portrait/landscape layouts, touch/keyboard controls, focus, contrast, status labels/shapes, loading/quota/reconnect/error states. | AC-15/37/44. | Component tests plus browser viewport/keyboard cases; axe/contrast fixtures if selected dependency/license review allows. | All AC-44 assertions pass at phone viewports in both orientations. |
| **6B — Full acceptance and hostile validation** | Run full mocked AC suite, local DB/Realtime TR integrations, seeded multi-client browser journeys, manual usability/accessibility review, adversarial/privacy review and final docs/receipt update. | All 45 active ACs; TR integration separate. | Re-run every AC test ID; no deployed artifact or live external account is used as AC evidence. | 45/45 active ACs green; TR evidence separated; Phase 6 hostile review ≥98/98; release-ready source, with deployment still deferred to Phase 7. |

### Post-coding deployment environments (topology finalized at Phase 7 entry)

The environment mapping below is a planning proposal. Confirm the branch-to-environment mapping, project allocation, account capacity, and service settings at Phase 7 entry, after coding Phases 1–6 are complete. These operational choices do not gate Phase 0 or change the AC contract expectations.

- **Development:** local Next.js and local test/mocked services; disposable Supabase project or isolated local database for integration testing where practical.
- **Staging:** a persistent Vercel Preview target (for example, a protected `staging` branch) and isolated Supabase project/configuration. Validate migrations, quotas, OIDC callback, and release packaging without Production data.
- **Production:** Vercel Production deployments from `main`, connected only to the Production Supabase project and production secrets.

Each environment has separately scoped credentials and Supabase/Vercel variables. Provisioning scripts must be repeatable and safe to rerun, print identifiers/status but never secret values, and make paid resource configuration impossible by default. Document free-plan limits and verify current account quotas at provisioning/release time.

## 4. Acceptance-criterion traceability

This is the approved allocation of every criterion to its first implementation phase. During the global mock-validation gate, replace each planned case ID with a concrete test-file/test-case identifier. A criterion may have multiple unit, integration, browser, and manual tests; it must have at least one automated assertion unless the approved criterion explicitly requires human-only evidence.

| Criteria | Increment | Minimum test evidence |
|---|---|---|
| AC-01–03 | Phase 2 | Multi-client room membership, capacity rejection without state mutation, profile icon persistence through lobby/round/standings. |
| AC-04–05 | Phase 4 | Deterministic N-boundary/random draw and anchor authorization; category-to-background mapping across distinct pairs. |
| AC-06–10 | Phase 4 | Score cases for all stages, unsolved reveal, hint progression/recipient filtering, score lock, elapsed-time source, and live scorecard update. |
| AC-11–14 | Phase 4 | Earliest accepted solver selection; cumulative and round summary; final score sort; approved time tie-break including edge cases from decision register. |
| AC-15 | Phase 6 | Viewport matrix in portrait/landscape; no horizontal overflow; input, hint, and scorecard controls visible and operable. |
| AC-16 | Phase 4 | Valid and invalid catalog fixtures; missing prompt/answer/hint/background and wrong hint count rejected; no incomplete category enabled. |
| AC-17–18 | Phase 5 | At most one candidate per eligible round; unique profile count; threshold 9/10 boundary; moderator review/appeal; complete pair required before playable. |
| AC-19 | Phase 5 | Lifetime wins on stable profile, 9/10 boundary; one open suggestion; exactly one category plus three pairs; review/approval and incomplete-content rejection. |
| AC-20–21 | Phase 2 | Mock issuer success, invalid signature/issuer/audience/state failures, profile association; guest identity without token and ability to create/join. |
| AC-22–23 | Phase 2 | Private-by-default/discoverable/waiting/open visibility matrix; hidden/full/started excluded; oldest-room quick match, stable-ID tie, no-match fallback and concurrent capacity race. |
| AC-24–26 | Phase 2 | Capacity lower/upper/invalid boundaries; code/deep-link destination; deep link bypasses browse; open-slot and full-room outcomes. |
| AC-27–28 | Phase 2 | Observer consumes no player slot; inviter binding; realtime perspective; rejected commands and no score/state mutation. |
| AC-29 | Phase 5 | Fixed five-emoji allowlist, five-second display, two-second per-player interval; arbitrary payload and state/score mutation rejected. |
| AC-30–33 | Phase 3 | Transactional observer FIFO/tie order; roster compaction; 30s idle reset and once-per-version prompt; 5s holdout warning; 10s countdown; over-two boot; exactly-two holdout waits; post-lock no replacement; abort/close below two. |
| AC-37 | Phase 1 | Fake quota provider returns a recoverable service-limit outcome without paid fallback. |
| AC-38 | Phases 0–7 | [`ac_test_inventory.md`](ac_test_inventory.md) links all 45 active ACs to planned test IDs; it does not mean test code has been authored or passed. After Phase 0 approval, every active AC test must be authored and mock-validated before the first project implementation code. A fail-closed application build command is a separate TR-only build control and is not part of AC-38 evidence. |
| AC-39 | Phase 1 and any dependency/asset change | Lockfile consistency; attribution row/license/source for every direct package and external asset; unreviewed dependency/asset blocks release. |
| AC-41 | Phase 7 and every source release | Temporary archive fixture contains tracked source, `LICENSE`, and `sbom/<sha>.cdx.json`; reject missing, malformed, or wrong-commit SWBOM. No deployed artifact is read. |
| AC-42 | Phase 7 and every source release | Temporary source archive contains complete GPL-2.0-only text and required bundled-component notices. |
| AC-43 | Phase 2 and Phase 6 | Anonymous visitor sees approved leaderboard, discoverable/joinable lobby information, and concise versioned rules with updated date; assert guest opt-in, alias/opt-out, exact ranking, five-minute leaderboard refresh, 15-second lobby refresh, public field allowlist, no-data and unavailable states. TR-30 separately covers bounded pagination/cache policy. |
| AC-44 | Phase 6 | Touch/keyboard operability, contrast, visible focus, and non-color status cues checked at phone portrait/landscape sizes. |
| AC-45 | Phase 4 and Phase 6 | Correct answer checked against approved policy; incorrect/replayed submissions do not score twice or leak guess text; target is withheld until reveal. |
| AC-46 | Phase 2 | Invalid OIDC signature/issuer/audience/state/nonce/expiry fails closed without creating or associating an authenticated profile. |
| AC-47 | Phase 5 | Unauthorized moderation/catalog changes are rejected; moderation state/count/eligibility remain auditable; unapproved/incomplete content cannot be played. |
| AC-50 | Phase 2 and Phase 6 | Anonymous landing response contains only approved leaderboard/lobby fields and excludes room codes, private profile/game/moderation data, and secrets. |
| AC-51 | Phases 1, 2, and 6 | Domain unit/use-case tests run through ports/fakes; architecture check blocks framework imports in the domain; domain/use-case ports return a single conflict result and preserve idempotency/outbox intent under fakes. TR-31 database integration separately verifies serialization and durable atomicity; it does not count as AC coverage. |

## 5. Global mock-validation gate and incremental TDD protocol

Phase 0 is approved. Before any production implementation code, author and mock-validate the complete contract-test suite for every active AC. Mockable TR contracts are validated before their respective implementation; deployment TR tooling is implemented only in post-coding Phase 7. Live deployment/account/database checks are TR-only integration or operational evidence and do not count as AC coverage. Once the global mock-validation gate passes, apply this sequence to each small coding increment:

1. **Select scope:** identify the approved requirement and AC IDs; state the behavior, invariant, and exclusions. Confirm no unresolved decision changes expected results.
2. **Design boundary:** identify the public interface and injected collaborators. For time, randomness, network, persistence, identity, and event delivery, define deterministic seams before test authoring.
3. **Write the AC-to-test mapping:** record at least one test case for each applicable AC and each important boundary case. Include negative/security cases and concurrent state changes when relevant.
4. **Build mocks/fakes:** provide executable mock adapters that represent the specified public contract. Keep assertions on observable behavior; do not let the mock implement the business rule being tested.
5. **Global pre-implementation mock-oracle validation:** before production code, execute all 67 AC oracles against conforming and violating scripted mock traces; every oracle must accept the conforming trace and reject its targeted mutation. This validates assertion sensitivity only. Record every test ID, command, result, and evidence boundary. Then run the same oracles against each real implementation increment and record product-conformance separately.
6. **TR-19 reaction-policy contracts:** keep `TR-19-T01` through `TR-19-T04` separate from AC coverage. Before reaction implementation, validate the complete emoji allowlist, exact five-second visibility, one-per-player-per-two-second rate rule, full player/observer audience, and game-state invariance against conforming and violating mock observations.
7. **Implement the smallest behavior:** after the global gate passes, use failing contracts as targets within a small increment. Avoid unrelated refactoring or scope additions.
8. **Run increment and regression suites:** run all tests for this increment plus all previous increments. Keep production integration separate from the mock contract tests.
9. **Integrate real adapters:** after unit tests pass, add integration tests against disposable/local services; only use test credentials and seeded data. Do not replace mock-first unit tests with integration-only coverage.
10. **Review evidence:** verify AC mapping, test output, security boundaries, accessibility, docs, migrations, and artifact effects. Update the matrix whenever requirements change.
11. **Close increment:** merge only when checks pass and the work is reviewable. Validate the branch locally and against disposable services. Vercel Preview deployment and its SWBOM occur only in Phase 7, after coding Phases 1–6 are complete. Manual human validation is recorded where required.

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

## 8. Post-coding deployment, release, licensing, and SWBOM

This section applies only after coding Phases 1–6 are complete. Deployment is not part of those coding phases.

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
| Free-tier pause/quota disrupts play. | Isolated quota adapter, recoverable UX, validate the fixed v2.6 target of one full 25-player room plus up to 25 observers during Phase 7 quota simulation; no paid fallback. |
| GPL conflict in runtime/transitive bundle or artwork. | Lockfile/SWBOM/license review before adding or shipping each component; preserve notices; release gate blocks unresolved licenses. |
| Mock differs from Supabase/OIDC behavior. | Adapter contract tests plus staged integration test suite after mock-first unit tests. |
| Build artifact and source archive describe different commits. | Embed commit SHA in SWBOM; verify deployment, source tag, lockfile, and archive all match before publication. |
| Context/process drift skips a gate. | Keep this plan, AC traceability, and per-increment evidence in the repo; each work item names AC IDs and mock-first gate. |

## 10. Completion definition

A coding increment is complete only when its approved ACs map to passing mock-first tests, implementation and regression suites pass, security/data invariants are verified, and migrations/interfaces are documented. Do not deploy during coding Phases 1–6. After those phases and the full active-AC suite complete, Phase 7 performs deployment, operational verification, and release packaging. Deployment checks and deployed artifacts remain outside AC coverage.

The global AC mock-oracle suite has 67 primary AC scenarios, 27 supplemental scenarios, four separate TR-19 cases, and 112 named controls; its 316 tests passed independent exact-commit review at 99% accuracy / 100% completeness on `f7b5ff8302e24c6eae4dd1d2f21d7cba8577ac29`. Phase 1A has since added a minimal Next.js shell, domain/application/infrastructure roots, and five architecture/bootstrap tests. The current suite passes 321 tests; typecheck, lint, and local build pass. Gameplay behavior remains unimplemented. The same assertions must run against real application behavior in each implementation increment.
