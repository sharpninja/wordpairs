# Acceptance-Criteria Gap Analysis

**Baseline reviewed:** `word_association_game_requirements.md` v2.0  
**Current criteria reviewed:** AC-01 through AC-43  
**Status:** Review and proposed changes; not yet incorporated into the approved requirements

## 1. Executive summary

The requirements have broad feature coverage, and AC-38 correctly requires every active criterion to map to tests before implementation. However, a 43/43 coverage count alone would not prove readiness: several criteria still depend on unresolved product decisions, a few acceptance statements conflict with the configured room-size rules, and multiple technical requirements have no direct acceptance test for their security or failure behavior.

The most important gaps to resolve before the affected increments are designed are:

1. **OpenAI sign-in feasibility:** AC-20 assumes OpenAI can be used as a general OIDC identity provider. OpenAI's current “Sign in with ChatGPT” documentation says website integration is available only to selected commercial partners through a limited trial, with a waitlist. Confirm eligibility before treating AC-20 as implementable; otherwise replace the provider in FR-02/FR-18, TR-16, and AC-20. citeturn15search0
2. **Capacity contradictions:** AC-02 treats a room with eight players as necessarily full, while the requirements permit capacities from 2 to 25. AC-22 says a lobby is joinable when it has fewer than 25 players, even if its configured capacity is lower. Both should use the room's configured capacity.
3. **Two-player holdout case:** AC-32 says the unready player is removed and countdown starts. In a two-player room this leaves one player, contradicting the two-player minimum in FR-03. This is already identified as an open decision but currently remains an acceptance-criterion contradiction.
4. **Cross-cutting security and failure cases:** ACs cover successful flows better than invalid tokens/codes, concurrent/stale operations, reconnect/retry, answer confidentiality, access-control enforcement, and data leakage.
5. **Unresolved policies undermine testability:** match/timer rules, answer normalization, leaderboard semantics, nomination counting, moderation states, and guest identity scope must be decided before test expectations can be finalized.

This report proposes wording for additional criteria AC-44 through AC-53. They are drafts for review, not active requirements. Preserve the current baseline until each proposed behavior is accepted, revised, or explicitly excluded.

## 2. Direct inconsistencies and testability blockers

| Priority | Existing text / area | Gap | Recommended correction |
|---|---|---|---|
| **P0** | AC-02 says a room with 8 players rejects another player. FR-01/TR-10 allow a configured capacity from 2 to 25. | A room of 8 may have capacity 25; the expected outcome cannot be inferred. | Rewrite AC-02 around `player_count == configured_capacity`; separately test capacity values 2, 8, and 25, and reject only above the configured maximum. |
| **P0** | AC-22 says fewer than 25 players means joinable. | Rooms can have a lower configured maximum. A 4/4 room is not joinable even though it has fewer than 25. | Use `player_count < room.capacity`, and state that hidden, full, started, or otherwise closed rooms are not joinable. |
| **P0** | AC-32 boots a sole holdout and starts countdown; FR-03 says a game needs at least two players. | A two-player room drops to one. “Countdown begins” conflicts with the minimum roster. | Decide whether to cancel readiness/countdown, allow a one-player game, or apply another policy. Add explicit AC cases for two-player and three-player rooms. |
| **P0** | AC-20 requires successful OpenAI OIDC sign-in. | Provider access is restricted to selected commercial partners in a limited trial per OpenAI's current developer page. No access is recorded in project requirements. citeturn15search0 | Confirm access first. If unavailable, select an accessible supported identity provider or defer account sign-in; update all linked FR/TR/AC and dependency/attribution entries. |
| **P1** | AC-23 says quick match assigns the player to “one available lobby.” | No selection rule or tie behavior is defined; deterministic tests cannot assert which lobby is selected. | Approve a selection policy (for example, least-filled, oldest waiting, or deterministic random) and test ties, stale capacity, and concurrent joins. |
| **P1** | AC-25 says an invite reaches the room “subject to an open slot”; AC-26 separately offers observer mode when full. | The criteria leave unclear whether the invitation still succeeds as an observer, and whether an observer can enter an already-started room. | Clarify the outcomes for open seat, full lobby, started game, invalid/expired code, and unavailable observer capacity. Keep observer access gated by valid invitation context. |
| **P1** | AC-30 uses “earliest” observer and compacts roster; AC-31 locks after countdown. | The timestamp tie-break, atomicity with simultaneous leave/join/readiness events, and exact time at which an observer becomes eligible for promotion are unspecified. | Define a stable ordering key and one serialized/transactional membership transition. Test simultaneous events and the countdown boundary. |
| **P1** | AC-33 prompts readiness after 30 seconds unchanged. | It does not define which events reset the timer, whether the prompt is once-only, or whether a stale timer may fire after a state change/countdown. | Define the lobby-state version/events that reset the idle clock; test reset, prompt once, and stale callback rejection. |
| **P1** | AC-43 requires a leaderboard and lobby data but says “approved” and “public.” | It does not define leaderboard metric/window/labels/guest inclusion/ties or the exact lobby fields. A test cannot check the data contract until decisions are approved. | Approve a field allowlist and ranking policy; use empty, stale, unavailable, and privacy-sensitive fixtures. Do not expose room codes by default. |
| **P1** | TR-09 requires brief-disconnect safety; decision register leaves reconnect behavior open. | There is no AC proving a reconnect restores authoritative state or avoids duplicate scores/submissions. | Resolve session/reconnect/expiry rules and add an AC for retries, replay, disconnect, and rejoin during lobby and round states. |
| **P1** | TR-04/05 require answer validation and confidentiality; AC-09 tests hint recipients only. | No explicit AC rejects incorrect answers without side effects or proves target/guess text is absent from unauthorized payloads. | Add answer validation, privacy-projection, and server-authority acceptance tests. |

## 3. Requirement-to-AC coverage gaps

“Partial” means a related AC exists but does not verify the requirement's defining security, negative, or boundary behavior.

| Requirement area | Existing AC coverage | Remaining acceptance gap |
|---|---|---|
| TR-01/02 authoritative state and realtime | AC-01, AC-09–12, AC-28–29 | No direct proof that a client cannot mutate scores, hint state, roster, target answer, category choice, or match result; no stale/out-of-order event handling. |
| TR-03 deterministic submission ordering | AC-11, AC-14 | No explicit equal/near-simultaneous correct-answer test, idempotent retry, or stable tie-break assertion. |
| TR-04 answer validation | AC-06–09, AC-16 | No AC for wrong-answer rejection, accepted alternatives, normalization policy, one submission per stage, duplicate submission, or rate limits. Several policies are open. |
| TR-05 answer/hint confidentiality | AC-09, AC-28 | No direct API/event assertion that target answer and other players' incorrect guesses are absent until reveal; solved-player payloads are not tested for hint/answer controls. |
| TR-06 catalog integrity | AC-16 | Does not explicitly prove that unapproved/incomplete/disabled content is excluded from selection, or that active match content is stable if a catalog item changes. |
| TR-07/11/12 visual, mobile, accessibility | AC-05, AC-15 | AC-15 checks visibility/overflow only. No test requires keyboard/touch operation, focus visibility, contrast, screen-reader names, non-color state indicators, or missing-background fallback. |
| TR-08 clock consistency | AC-10, AC-14 | No test fixes the server clock as source of elapsed time, clock skew behavior, precision/rounding, or negative time rejection. Tiebreak aggregation is open. |
| TR-09 connection handling | None direct | Reconnect, retry/idempotency, disconnection during answer/readiness, room expiry, and creator departure are not accepted outcomes. |
| TR-10 room-code security | AC-24–26 | Invalid/expired codes, enumeration/rate limiting, code rotation, duplicate join retries, and behavior for closed/started rooms are missing. |
| TR-13 anchor assignment | AC-04 | Criterion checks range and selection but not uniformity, server ownership, roster snapshot stability, or rejection of category choices from non-anchor players. |
| TR-14/15 moderation/suggestions | AC-17–19 | Outcomes are high-level. No AC covers moderator authorization, review states/reasons, audit record, self-approval, appeals/revisions, privacy, disabled content, or “approval is not publication.” See the proposed detailed moderation plan. |
| TR-16 identity validation | AC-20–21 | Success cases only; no invalid issuer/audience/signature/nonce/state/expiry, account collision/linking, logout, session renewal, guest abuse, or guest migration tests. Provider feasibility is a blocker. |
| TR-17/18/19 lobby, observers, reactions | AC-22–30 | Capacity contradiction; observer cap/context, access revocation, inviter departure, reaction allowlist/rate/duration, and realtime failure cases remain open or untested. |
| TR-20–24 deployment/provisioning/free-tier | AC-34–37 | No explicit acceptance that provisioning reruns are safe, Preview cannot access Production, forks cannot read secrets, migrations are compatible/verified, or automated promotion is blocked on failed tests/SWBOM. |
| TR-25/29 attribution/license | AC-39, AC-42 | No explicit check that every transitive bundled component and shipped asset has a reviewed license and preserved notice; archive completeness and source correspondence are not specified. |
| TR-27/28 SWBOM | AC-40–41 | No explicit fail-closed build behavior for missing/invalid SWBOM, cryptographic binding/checksum to build and source, completeness of source archive, or post-publication download verification. |
| TR-30 landing public data | AC-43 | Does not specify exact field allowlist, cache freshness, pagination limit, stale-data labeling, ranking stability, join/create actions, or the rules version/source. These depend on the landing-page decision register. |

## 4. Proposed additional acceptance criteria

The following drafts fill high-value gaps. Approve, revise, or reject them during planning closure; if accepted, add them to the requirements and implementation traceability matrix before code. The numbering assumes the current final ID is AC-43.

### AC-44 — Accessible controls and status

Given a player uses keyboard-only navigation, touch input, and a screen reader on supported phone-sized portrait and landscape viewports, when they use the landing page, lobby, round, hints, scorecard, and results, then every primary action is operable, focus is visible, controls have accessible names, state is not conveyed by color alone, text remains legible over backgrounds, and no horizontal overflow blocks task completion.

### AC-45 — Authoritative answer acceptance and privacy

Given a player submits an answer, when the server validates it against the approved matching policy, then only an approved correct answer earns the current stage's points and locks once; an incorrect/replayed answer cannot mutate score or stage; the target is absent from all client-visible responses until the authorized reveal; and other players' incorrect guess text is not disclosed.

### AC-46 — Retry and reconnect safety

Given a client disconnects or retries a request after an uncertain response, when it reconnects or resends the same operation, then it receives the current authorized state without duplicating membership, nomination, reaction, answer, or score side effects; an expired/closed room follows the approved expiry rule.

### AC-47 — Room-code failure and abuse limits

Given a room code is malformed, unknown, expired, closed, or queried beyond an approved rate limit, when a player attempts to open or join it, then the server returns the approved recoverable error, does not reveal whether unrelated private rooms exist, and does not mutate room membership.

### AC-48 — Concurrent lobby transitions

Given a lobby is near a readiness, timeout, player departure, observer promotion, or capacity boundary, when two or more such events arrive concurrently or a timer callback is stale, then exactly one authoritative transition commits; all resulting player counts respect configured capacity and minimum roster policy; and the event order follows the approved deterministic rule.

### AC-49 — Provider authentication failure

Given an approved OIDC provider is configured, when an ID token has an invalid signature, issuer, audience, nonce, state, or expiry, then account creation/session issuance fails closed and no profile is associated with an unverified identity. This AC depends on confirming the provider and its available registration process.

### AC-50 — Moderation authorization, audit, and publication gate

Given a non-moderator, submitter, or unauthorized editor attempts to review/activate content, when the operation is submitted, then it is rejected without changing moderation or catalog state; an authorized decision records actor, time, prior/new state, policy version, and reason; approved content remains unplayable until editorial completion and an active catalog release.

### AC-51 — Safe repeatable provisioning and environment isolation

Given staging and production projects are provisioned, when the provisioning command is rerun or a Preview deployment is inspected, then the rerun does not erase or duplicate existing state, all migrations are versioned and reported, secrets are not printed or committed, Preview credentials cannot address Production, and no paid feature is configured.

### AC-52 — Fail-closed build and SWBOM provenance

Given a deployment build runs for a commit, when tests, SWBOM generation, schema validation, commit/environment metadata validation, or secret scanning fails, then the application artifact is not deployed; when it succeeds, the immutable deployment serves the report generated from that exact lockfile and deployment metadata.

### AC-53 — Complete, matching release archive

Given a Production build is selected for release, when the source archive is packaged and inspected, then it contains the complete source and necessary build/migration files for the same commit, `LICENSE`, `ATTRIBUTIONS.md` and required notices, a checksum, and the exact Production SWBOM; extracting and inspecting it confirms commit match and absence of secrets, local data, and credentials.

### AC-54 — Landing-page public projection

Given an unauthenticated visitor requests the landing data, when the server returns leaderboard and lobby information, then the response contains only the approved leaderboard fields and discoverable/joinable lobby fields, never room codes or private identities/game state; ordering and pagination are stable under the approved policy; and stale, empty, or unavailable data is presented with the approved state.

## 5. Decisions to close before test authoring

These are not merely implementation details: each changes expected user-visible behavior, test fixtures, or data contracts.

| Decision | Why acceptance tests cannot be finalized without it | Suggested owner action |
|---|---|---|
| OpenAI OIDC eligibility | Provider is presently limited to selected commercial partners in a trial; identity architecture may need to change. | Verify project access; otherwise select a supported provider and revise AC-20. citeturn15search0 |
| Match length, stage timer, no response, no solver | Determines round completion and scoring transitions. | Approve concrete values/fallback and timeout effects. |
| Answer normalization and total-time tiebreak | Determines whether submissions count as correct and final ranking. | Specify canonicalization, accepted alternatives, unsolved time, and final tie behavior. |
| Two-player holdout boot | Can leave fewer than the required two active players. | Decide whether countdown is canceled, minimum is relaxed, or another action occurs. |
| Nomination counts and moderation | “10 nominations” is not testable until identity/duplicates and review timing are fixed. | Approve unique-voter rule, repeated-vote policy, roles, states, appeals, removal, and review trigger. |
| Suggestion eligibility | “10 game wins” has no scope and guest persistence is unresolved. | Define lifetime/session scope and guest/account treatment. |
| Leaderboard data contract | Public ranking is undefined and may expose player identity. | Choose metric, period, names/aliases, guest inclusion, opt-out, ties, and empty-result behavior. |
| Lobby public metadata | “Lobby information” and “joinable” are broad. | Define public fields, counts, refresh, visibility policy, and link/join behavior. |
| Room lifecycle | Codes, expiry, observer caps, disconnect and creator departure are open. | Define validity window, rate limiting, recovery, and observer invitation context. |
| Reactions | Emoji set, duration and rate limits are unspecified. | Approve list and display/abuse policy. |
| Capacity and free-tier load | Product's no-paid-service constraint needs a realistic operating target. | Set expected concurrency and exact quota/pause UX without an upgrade path. |
| Release evidence | “Archive” and “valid SWBOM” leave packaging details open. | Choose archive format, checksum, reproducibility policy, source completeness rule, and validation command. |

## 6. Recommended correction order

1. Resolve the OpenAI OIDC access question and the two-player holdout outcome; these affect feasibility and domain state-machine design.
2. Correct AC-02 and AC-22 to use configured capacity, then review AC-25/26 invitation outcomes for consistency.
3. Approve decision-register items needed by each increment: core match/answer policies first, then identity/lobby/observer rules, moderation policy, and landing-page ranking/privacy.
4. Add approved security, accessibility, reconnect, provisioning, SWBOM, and archive criteria from AC-44–AC-54 (or replacement wording).
5. Build a single traceability sheet linking every active FR/TR to one or more ACs, and every AC to named unit/component/integration/browser/manual test cases. An AC count is not coverage evidence by itself.
6. Only after those edits and approvals, baseline the requirements version and use the mock-first TDD gate for each implementation increment.

## 7. Review limits

This review identifies requirement completeness, consistency, feasibility, and testability gaps. It does not decide product policy, validate a live OpenAI partner entitlement, implement software, or run tests. The proposed ACs remain non-binding until accepted and merged into the requirements baseline.
