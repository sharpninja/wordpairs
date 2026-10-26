# Phase 0 Interface and Data Contracts

**Status:** Draft for Phase 0 review; not an approved implementation contract  
**Requirements baseline:** `word_association_game_requirements.md` v2.6  
**Architecture:** DDD modular monolith, ports and adapters, Supabase Postgres, Vercel  
**Implementation status:** Specification only; no executable tests, project code, scripts, migrations, or schema files are created by this document.

## 1. Purpose and constraints

This document advances Phase 0 by defining candidate module boundaries, application commands and queries, persistence concepts, authorization boundaries, and transaction invariants. It is deliberately concrete enough to refine into mock-first test specifications with product decisions affecting AC expected results resolved in requirements v2.6.

The interfaces below are logical contracts, not committed route names, SQL, TypeScript source, or approved schema. Before Phase 0 exits, review and approve the v2.6 framework/runtime selection and technical contracts. Product choices that affect active AC behavior are resolved in the v2.6 decision register. No executable test or project implementation code may be authored before Phase 0 passes. After Phase 0, every active-AC contract test must be authored and mock-validated before any project implementation code is written.

Deployment, provider/account configuration, branch topology, and deployed-artifact checks are outside AC coverage. Deployment execution and deployment tooling follow completion of coding Phases 1–6; topology is finalized at Phase 7 entry. Mockable operational command contracts remain TR work and follow their own test-first gate.

## 2. Bounded contexts and ownership

| Context | Owns | Public application boundary | Data owner |
|---|---|---|---|
| Identity and Profile | Verified account identity, guest identity, icon and approved public label | Establish guest/session, complete OIDC callback, update profile | Profile module |
| Lobby | Room lifecycle, player order, capacity, observer queue/invitation binding, readiness, timers and roster lock | Create/join/leave room, browse, quick match, observe, ready, timer commands | Lobby module; `Room` aggregate |
| Match | Match roster snapshot, anchor, round sequence, category choice, submissions, scoring, summaries and standings | Start match, choose category, submit answer, close stage, reveal and query results | Match module; `Match` aggregate |
| Content | Curated categories/pairs, accepted answers, nominations, suggestions, moderation decisions and eligibility | Query playable content, nominate, suggest, review, activate | Content module |
| Public Read Model | Approved leaderboard and discoverable lobby summaries | Anonymous landing-page query | Projection builder; no write ownership |
| Delivery and Operations | Provisioning, migrations, environment checks, build metadata, SWBOM and source archives | Operator commands and release packaging | Operations adapter; TR-only contracts |

Contexts call each other through application interfaces. No module imports another module's persistence implementation. The transport layer parses inputs and maps results; it does not make domain decisions.

## 3. Command and query contracts

Names and paths are proposed; the request/response semantics should remain stable if the transport changes. The server derives actor identity and permissions from verified session state. Clients do not authoritatively supply roster, score, role, acceptance timestamp, capacity, or timer result.

| Operation | Input contract | Success result | Required rejection behavior |
|---|---|---|---|
| `CreateRoom` | Actor identity, requested capacity, discoverability choice, command ID | Room ID, display code, capacity, initial roster/version | Reject capacity outside 2–25; do not create partial room |
| `JoinRoom` | Room ID/code, actor, requested player mode, invite context, command ID, optional expected version | Canonical player/observer membership and current safe projection | Full/stale/closed room returns typed result; concurrent final-seat loss cannot overfill |
| `LeaveRoom` | Room ID, actor, command ID, expected version | Updated membership, ordered roster, version | Duplicate command returns canonical prior result; unauthorized/nonmember does not mutate |
| `BrowseRooms` | Public filter/page token | Only discoverable waiting rooms with an available player slot and approved fields | No room code, private profile, game answer, or observer-specific view |
| `QuickMatch` | Actor and command ID | Joined oldest eligible room or browse/create fallback | Sort by room creation time then stable room ID; use the same atomic capacity-checked join command |
| `EnterObserverMode` | Room ID/code, actor, inviter context, command ID | Observer membership and followed-player projection | Must not consume a player slot; reject missing/invalid invitation context |
| `SetReady` | Room ID, actor, ready intent, command ID, expected version | Current readiness state and any transition (warning/countdown/lock) | Reject nonplayer/locked-roster mutation; deduplicate retries |
| `ProcessDeadline` | Room ID, deadline kind, expected aggregate version, due time, scheduler job ID | Applied transition or stale/no-op result | Stale version/deadline is a no-op; duplicate job is idempotent |
| `ChooseCategory` | Match ID, actor, category ID, command ID, expected version | Accepted category and next-round state | Reject non-anchor/non-eligible actor without state change |
| `SubmitAnswer` | Match/round ID, actor, stage ID, answer input, command ID | Accepted/rejected status, server timestamp and actor's allowed result | Incorrect guess is not broadcast; duplicate accepted submission cannot score twice |
| `GetPlayerView` | Match/room ID, verified actor | Allowlisted player projection | Never includes another player's guess text or unrevealed target |
| `GetObserverView` | Room ID, verified observer membership | View scoped to the bound inviter | Cannot submit or mutate; only inviter-authorized visible fields |
| `GetLandingPage` | Page/filter token, anonymous or authenticated caller | Approved leaderboard, lobby summary, rules projection and explicit empty/unavailable state | Allowlist only; no room codes, answers, guesses, private profile fields, moderation data, secrets |
| `NominateAnswer` / `SuggestCategory` | Actor, source match/win evidence, candidate payload, command ID | Submission status and audit reference | Server checks eligibility and idempotency; never automatically activates content |
| `ReviewContent` | Moderator identity, content ID, decision/reason, command ID | Updated moderation state and audit reference | Reject unauthorized or invalid transition; preserve audit trail |

Typed errors should be stable domain/application codes, independent of HTTP status or Supabase error strings. Proposed classes: `VALIDATION_ERROR`, `NOT_AUTHENTICATED`, `NOT_AUTHORIZED`, `NOT_FOUND`, `ROOM_FULL`, `ROOM_CLOSED`, `CONFLICT`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED`, `SERVICE_LIMIT`, `TEMPORARY_UNAVAILABLE`, and `INTERNAL_ERROR`. Public wording avoids provider details; retryable service-limit behavior returns `SERVICE_LIMIT`; never return secrets or raw provider/database errors.

## 4. Event contract and privacy boundary

All events describe committed state. Event IDs are unique and stable across retries. Payloads are versioned, minimal, and constructed for an explicit audience; event publication follows transaction commit.

| Event family | Audience | Example fields | Excluded fields |
|---|---|---|---|
| Room membership | Current room players; observers receive their scoped projection | Room ID, roster version, player IDs/labels/icons, ordered positions, observer count | Room secret/code, credentials, unrelated profile fields |
| Readiness/countdown | Current room players and permitted observers | Ready state, warning deadline, countdown state, roster version | Server secrets, hidden identity claims |
| Round stage/score | Players and observers with authorized projection | Round/stage ID, hint stage, solve status, points, elapsed time | Raw guesses, target answer before reveal, private player view |
| Hint | Only unsolved players and observers following an eligible unsolved player, according to approved view policy | Round ID, hint index, hint text | Target answer, other players' private hints |
| Reveal/standings | Match participants and their authorized observers | Revealed target, final round result, approved standings | Authentication claims, moderation records |
| Reaction | Current room players and observers | Actor ID/approved label, allowlisted emoji, expiry | Arbitrary HTML/text, game-state mutation fields |
| Public landing projection | Anonymous visitors | Approved ranking fields, public lobby counts/status, rules version | Room codes, private labels, gameplay data, guesses, target answers, observer views, moderation, secrets |

Exact event names and payload schemas are versioned in the eventual interface specification. Realtime transport is a notification mechanism; clients refetch an authorized projection after reconnect or a version gap. Replayed events are deduplicated by event ID.

## 5. Candidate persistence model

This is a logical model. Column types, identifiers, indexes, normalization, retention, and physical partitioning require a schema ADR before migration files exist.

| Relation / aggregate | Candidate key and important fields | Invariants / ownership |
|---|---|---|
| `profiles` | `profile_id`, `identity_kind`, nullable `provider_subject`, `icon_id`, optional public label, timestamps | Unique verified provider subject; identity claims are not public projection fields. Guest identity persists in the same browser/device until site data is cleared and does not sync or link to OIDC. |
| `rooms` | `room_id`, protected code lookup value, `capacity`, `status`, `version`, `discoverable`, creator reference, timestamps | Capacity 2–25; status/version changes serialized by the Lobby aggregate; never expose lookup secret publicly. |
| `room_members` | `room_id`, `profile_id`, `membership_kind`, `roster_position`, `ready`, `joined_at`, inviter reference | At most one active membership per profile/room; player positions unique and dense after compaction; player count never above capacity. |
| `observer_memberships` | `room_id`, `profile_id`, `followed_player_id`, monotonic arrival sequence/time, active state | Does not consume player capacity; promotion selects earliest eligible observer; inviter binding is server verified. |
| `matches` | `match_id`, `room_id`, frozen roster/version, status, anchor profile, round index, timestamps | Roster snapshot taken at match start; room countdown lock prevents substitution after countdown begins. |
| `match_players` | `match_id`, `profile_id`, stable roster index, score/result fields | One row per frozen player; authoritative score and time are server-owned. |
| `rounds` | `round_id`, `match_id`, pair/category IDs, stage, status, started/closed timestamps | Stage transitions are serialized; category/pair comes from approved playable catalog. |
| `submissions` | `submission_id`, round/player/stage, idempotency reference, accepted status, server acceptance time | One score-bearing acceptance per player/stage. Raw incorrect guess text is never persisted or sent to other players. |
| `categories`, `word_pairs`, `accepted_answers` | IDs, category relation, prompt/target, ordered hints, background, status, moderation version | Only complete approved records are playable; target/accepted answers are restricted server-side until reveal. |
| `nominations` | ID, candidate, source player/round, actor, created time, status | Count only unique player profiles; each profile may nominate a candidate once and submit at most one candidate per eligible no-hint solve. Retain only the fields required to enforce unique nominations and moderation; audit events follow the one-year v2.6 retention schedule. |
| `suggestions` | ID, proposer, proposed category and pair payload, status, timestamps | Requires 10 lifetime wins on one stable profile and no other open suggestion; does not enter play without moderation and complete curated records. |
| `moderation_actions` / `audit_events` | ID, actor, target, prior/new state, reason code, timestamp, correlation ID | Append-only for authorized review; no client mutation; audit events are retained for one year; access is restricted by role. |
| `idempotency_records` | scope, actor, command ID, request digest, canonical result/reference, created/expiry times | Unique per agreed scope; same key/same request returns prior result; same key/different request rejects. Retain idempotency results until 30 days after room close. |
| `outbox_events` | event ID, aggregate type/ID/version, event type/version, minimal payload, audience, publish state/attempts | Inserted in same transaction as aggregate change; only committed events published; payload is already privacy-scoped. Retain published outbox rows for seven days. |
| `deadline_jobs` (or external scheduler reference) | job ID, aggregate ID, kind, expected version, due time, state | Idempotent and version-checked; stale jobs no-op. Persist versioned deadline jobs in Postgres and process them with the selected Supabase Cron/pg_cron adapter; verify actual Free-plan availability at Phase 7 deployment entry. |

Foreign keys should prevent orphaned room memberships, rounds, submissions, content relations, moderation actions, and outbox aggregate references. Unique/check constraints backstop room capacity, player positions, one active membership, command keys, and event versions. Complex policy remains in one domain implementation rather than duplicated in database and application layers; constraints are invariant backstops.

## 6. Authorization, RLS, and secrets

Candidate access model for approval:

- Browser clients use an unprivileged identity/session and may read only explicit public or actor-authorized projections. They never receive a service-role key or database connection secret.
- Server application handlers verify session/provider claims, derive actor and role, and invoke use cases. Client-supplied actor IDs or role claims are ignored for authorization.
- Anonymous landing access uses a narrow server-side query or view that returns only allowlisted public fields. Direct anonymous table access is denied.
- Player queries require active membership in the requested room/match. Observer queries require active observer membership and enforce the inviter binding for every projection and event.
- Moderator/admin commands require server-derived roles and legal state transitions. Every moderation/eligibility change writes an audit event in the same transaction.
- Realtime publication uses server-authorized audience projections. Subscription channel names are not treated as authorization.
- Migration and operator credentials are kept in the operator secret store or CLI session, never source control, fixtures, client bundles, logs, SWBOM, or public archive.

RLS policy details, guest-session representation, and role administration remain technical contracts for Phase 0 approval. Retention values follow the resolved v2.6 schedule: audit events one year, published outbox rows seven days, and idempotency results through 30 days after room close. The v2.6 product policy fixes guest persistence and public aliases. Service-role credentials remain server-only and are not exposed to clients. Integration checks against local/disposable Postgres/Supabase later verify actual RLS/transaction behavior; they remain TR evidence and do not replace mock AC tests.

## 7. Transaction and concurrency contracts

Each state-changing command includes a unique command ID, authenticated actor, aggregate ID, and expected version when a stale view could cause a conflict. The transaction boundary owns command deduplication, aggregate transition, durable result, and outbox intent.

1. Begin transaction and lock or conditionally update the target aggregate/version.
2. Check command idempotency. Return the canonical prior result for an identical committed command; reject conflicting reuse.
3. Load authoritative membership, permissions, capacity, and current state.
4. Apply one canonical domain policy and validate resulting invariants.
5. Persist changed aggregate/membership/content state and command result.
6. Insert exactly one event/outbox intent for the committed transition; insert none on rollback.
7. Commit. Publish asynchronously from committed outbox rows; retries use event ID.

Required room serialization points:

- **Final seat:** capacity check and membership insertion occur in one serialized room transaction; at most one concurrent command claims the last seat.
- **Pre-countdown departure:** remove leaver, promote oldest observer if applicable, and compact remaining roster atomically. Order by observer-arrival sequence/time, then stable profile ID. A mock case supplies equal arrival order and asserts the stable-ID winner.
- **All-ready transition:** the final ready update, countdown start, and roster lock are one aggregate transition.
- **Holdout timeout:** compare deadline and aggregate version inside the same transition as any concurrent ready/leave command. In exactly two-player rooms, expiry keeps the holdout and waits; for larger rooms, expiry removes the holdout and starts/locks countdown.
- **Post-countdown departure:** membership departure does not unlock roster or promote a replacement.
- **Correct answer:** acceptance order is server assigned and one player cannot earn duplicate score for the same stage after retry.

Mock contracts assert application behavior at each port (commands, conflict result, canonical retry response, staged outbox intent). Later database integration evidence checks row locking/constraints, RLS, durable idempotency, commit/rollback atomicity, and actual event persistence. Fakes must not claim to prove those database properties.

## 8. Clock, scheduler, and failure contracts

- `Clock.now()` is the authoritative source for accepted answer times, lobby change times, and audit timestamps. A client timestamp may be informational only.
- `DeadlineScheduler.schedule()` accepts aggregate ID, deadline kind, due time, and expected aggregate version; it returns an opaque job reference. `cancel()` is best effort. `deliver()` may repeat or arrive late; the application re-reads state/version and applies idempotently.
- A 30-second idle prompt and five-second holdout warning are based on server-recorded state versions/timestamps. Any qualifying state change invalidates stale callback work according to the finalized definition of “unchanged.”
- The durable deadline-job contract is validated with injected clock/scheduler mocks before implementation. Verify Supabase Cron availability and Free-plan compatibility as TR integration at Phase 7 deployment entry, after coding Phases 1–6. A browser timer or ephemeral Vercel process is not authoritative.
- Transient persistence/realtime/quota failures return typed recoverable outcomes when safe. Never retry a non-idempotent write without its command ID. Realtime failure does not roll back an already committed state; clients recover from an authorized projection.
- A quota rejection returns `SERVICE_LIMIT`, preserves the last committed state and may be retried with the same command ID after capacity recovers. Do not silently upgrade or automatically repeat a non-idempotent command.

## 9. Phase 0 technical approvals

Requirements v2.6 resolves product choices affecting active AC expected results. The remaining work is technical review and approval of these contracts; external integration checks stay post-coding TR evidence.

| Approval | Contract to review | Related requirements |
|---|---|---|
| Architecture ADR | Selected Next.js/TypeScript/npm stack, DDD boundaries, ports/adapters and test stack; record reviewed compatible versions before project setup. | AC-38/39; TR-26–31 |
| Public interfaces | Finalize application command/query schemas, stable error codes, event versions/audiences and authorization derivation. | AC-01–33, AC-37–39, AC-43–47, AC-50–51 |
| Persistence/security | Approve schema, RLS, transactions/versioning, idempotency/outbox, role source, retention, and server-only secret handling. | AC-28/37/45/47/50/51; TR-01–05/09/22/23/31 |
| Timer adapter | Approve durable deadline-job contract and Postgres transaction semantics. Supabase Cron/pg_cron is selected; actual free-plan eligibility is checked in Phase 7. | AC-30–33; TR-22 |
| Test specification | Refine all 65 planned AC cases into exact assertions, mocks and evidence tiers. Verify every active AC has a mockable contract before any implementation. | AC-01–33, AC-37–39, AC-41–47, AC-50–51 |
| Deployment contract planning | Keep Vercel, provisioning, build/SWBOM and source archive checks TR-only; do not execute deployment during coding Phases 1–6. | TR-20–29; AC-41/42 use local archive fixtures only |

## 10. Phase 0 completion checklist

- [ ] Approve the architecture ADR and bounded-context ownership.
- [ ] Freeze route/action inputs, outputs, error codes, event schemas, and authorization rules for every active AC.
- [ ] Approve logical schema, RLS rules, constraints, transaction/locking strategy, idempotency and outbox retention, audit policy, and secret boundaries.
- [ ] Approve server clock and durable deadline-scheduler contract for lobby timers.
- [ ] Confirm the v2.6 product outcomes remain reflected in each contract and test specification; no active-AC product decision remains open.
- [ ] Refine all 65 planned AC case IDs into exact assertions, mock interactions, and evidence tiers; preserve one mockable contract test or fixture-verifiable contract for every active AC.
- [ ] Keep actual Vercel/account/branch/project/deployment evidence in TR/operational records. Concrete topology remains a Phase 7 post-coding deployment-entry decision.
- [ ] Obtain hostile review at 98% or higher accuracy and completeness; record exact repository commit and complete review output in the JSONL receipt.

**Current status:** Draft work advances Phase 0, but the gate remains open. This document does not authorize executable tests, scripts, migrations, or project code. Deployment and release operations begin only after coding Phases 1–6 are complete.
