# Acceptance Criteria to Test Inventory

**Requirements baseline:** `word_association_game_requirements.md` v2.2  
**Status:** Planned traceability inventory; no tests are authored or validated yet

This table gives each active acceptance criterion at least one stable planned test-case ID. It establishes 51/51 planned criterion-to-test mappings only. It does **not** claim 51/51 implemented tests, passing test results, mock validation, or production coverage. Before each increment, write its tests, run and validate them against mocks, and only then write production code, following Byrd Development Process v4. The full regression suite must pass at the increment gate.

| AC | Acceptance criterion | Planned test ID | Verification boundary | Mock seam / fixture | Evidence status |
|---|---|---|---|---|---|
| AC-01 | Room joining | `AC-01-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-02 | Player limit | `AC-02-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-03 | Profile icon | `AC-03-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-04 | First category | `AC-04-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-05 | Category art | `AC-05-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-06 | No-hint solve | `AC-06-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-07 | Hint scoring | `AC-07-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-08 | Unsolved result | `AC-08-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-09 | Hint progression | `AC-09-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-10 | Live scorecard | `AC-10-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-11 | Category choice | `AC-11-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-12 | Round summary | `AC-12-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-13 | Final standings | `AC-13-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-14 | Time tiebreak | `AC-14-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-15 | Orientation | `AC-15-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-16 | Content validation | `AC-16-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-17 | Nomination eligibility | `AC-17-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-18 | Nomination threshold and moderation | `AC-18-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-19 | Category suggestion unlock | `AC-19-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-20 | OpenAI OIDC profile | `AC-20-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-21 | Guest play | `AC-21-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-22 | Browse open lobbies | `AC-22-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-23 | Quick match | `AC-23-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-24 | Configured capacity | `AC-24-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-25 | Room invitations | `AC-25-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-26 | Deep-link join and full room | `AC-26-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-27 | Full-room observer | `AC-27-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-28 | Observer perspective and permissions | `AC-28-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-29 | In-round emoji reaction | `AC-29-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-30 | Pre-countdown observer promotion | `AC-30-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-31 | Ready countdown and roster lock | `AC-31-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-32 | Holdout warning and removal | `AC-32-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-33 | Idle lobby readiness prompt | `AC-33-T01` | Domain/use-case unit + UI acceptance | Pure policy; fixed clock/random; fake repository/event ports | Planned — not authored |
| AC-34 | Vercel branch deployments | `AC-34-T01` | Build/provisioning acceptance | Mock CLI, filesystem, environment, and deployment responses | Planned — not authored |
| AC-35 | Free-tier deployment | `AC-35-T01` | Build/provisioning acceptance | Mock CLI, filesystem, environment, and deployment responses | Planned — not authored |
| AC-36 | Repeatable provisioning | `AC-36-T01` | Build/provisioning acceptance | Mock CLI, filesystem, environment, and deployment responses | Planned — not authored |
| AC-37 | Free-tier quota handling | `AC-37-T01` | Build/provisioning acceptance | Mock CLI, filesystem, environment, and deployment responses | Planned — not authored |
| AC-38 | Mock-first acceptance coverage | `AC-38-T01` | Build/provisioning acceptance | Mock CLI, filesystem, environment, and deployment responses | Planned — not authored |
| AC-39 | Dependency attribution | `AC-39-T01` | Supply-chain/release acceptance | Fixture lockfile, mock build metadata, temporary archive | Planned — not authored |
| AC-40 | Per-deployment SWBOM | `AC-40-T01` | Supply-chain/release acceptance | Fixture lockfile, mock build metadata, temporary archive | Planned — not authored |
| AC-41 | SWBOM release archive | `AC-41-T01` | Supply-chain/release acceptance | Fixture lockfile, mock build metadata, temporary archive | Planned — not authored |
| AC-42 | GPL-2.0-only release | `AC-42-T01` | Supply-chain/release acceptance | Fixture lockfile, mock build metadata, temporary archive | Planned — not authored |
| AC-43 | Public game landing page | `AC-43-T01` | Security/projection or adapter contract | Fake actor/session, fake catalog, allowlisted DTO fixtures | Planned — not authored |
| AC-44 | Accessible game controls | `AC-44-T01` | Security/projection or adapter contract | Fake actor/session, fake catalog, allowlisted DTO fixtures | Planned — not authored |
| AC-45 | Authoritative answer handling | `AC-45-T01` | Security/projection or adapter contract | Fake actor/session, fake catalog, allowlisted DTO fixtures | Planned — not authored |
| AC-46 | OIDC token validation | `AC-46-T01` | Security/projection or adapter contract | Fake actor/session, fake catalog, allowlisted DTO fixtures | Planned — not authored |
| AC-47 | Moderation and catalog boundary | `AC-47-T01` | Security/projection or adapter contract | Fake actor/session, fake catalog, allowlisted DTO fixtures | Planned — not authored |
| AC-48 | Repeatable provisioning and environment isolation | `AC-48-T01` | Security/projection or adapter contract | Fake actor/session, fake catalog, allowlisted DTO fixtures | Planned — not authored |
| AC-49 | Build quality and SWBOM gate | `AC-49-T01` | Security/projection or adapter contract | Fake actor/session, fake catalog, allowlisted DTO fixtures | Planned — not authored |
| AC-50 | Landing-page public data | `AC-50-T01` | Security/projection or adapter contract | Fake actor/session, fake catalog, allowlisted DTO fixtures | Planned — not authored |
| AC-51 | Testable, concurrency-safe domain boundary | `AC-51-T01` | Domain unit + database concurrency integration | Injected fakes first; disposable DB for concurrent final-seat case | Planned — not authored |

## Decision-gated cases

The planned IDs for criteria affected by unresolved requirements cannot receive final expected-result assertions until the listed decision is approved. Keep these cases marked blocked in the increment plan; do not encode an assumed outcome in test doubles or production code.

| Planned tests | Decision required |
|---|---|
| `AC-20-T01`, `AC-46-T01` | Confirm eligibility for OpenAI Sign in with ChatGPT; otherwise revise provider requirements and tests. |
| `AC-32-T01` | Resolve whether a two-player room may lose its holdout while preserving the minimum two-player game rule. |
| `AC-13-T01`, `AC-14-T01` | Approve match length, unsolved-time aggregation, and final tie behavior. |
| `AC-04-T01`, `AC-06-T01`, `AC-18-T01`, `AC-45-T01` | Approve catalog volume/reuse, answer normalization, nomination identity/counting, and other listed answer-policy details. |
| `AC-22-T01`, `AC-23-T01`, `AC-43-T01`, `AC-50-T01` | Approve public leaderboard and lobby fields, ordering, visibility, and freshness behavior. |
| `AC-30-T01`–`AC-33-T01`, `AC-48-T01` | Define supported deadline execution mechanism and approve race outcomes at readiness/countdown boundaries. |
| `AC-36-T01`, `AC-48-T01` | Approve the exact isolated Development, Staging, Preview, and Production provisioning topology. |

## Evidence fields for implementation

For each test ID, implementation evidence must record the test file and test name, mock-validation command and result, production implementation commit, full-suite regression result, and any later integration/browser evidence. A test must not be marked complete solely because a mock returns the expected answer; the test must exercise the actual domain/use-case contract while its external ports are mocked.
