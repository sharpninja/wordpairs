# Acceptance-Criteria Gap Analysis

**Baseline reviewed:** `word_association_game_requirements.md` v2.2  
**Current criteria reviewed:** AC-01 through AC-51  
**Status:** Resolved criteria merged; remaining findings and proposals are documented below

## 1. Executive summary

The requirements now contain 51 active acceptance criteria. This update merged the gaps whose expected behavior was already established by the functional/technical requirements, corrected the two configured-capacity inconsistencies, and kept unresolved product decisions out of the baseline. AC-38 still requires a complete test mapping; the presence of 50 criteria is not evidence that tests have been authored or validated.

The main unresolved blockers are:

1. **OpenAI sign-in feasibility:** AC-20 assumes OpenAI can be used as the identity provider. OpenAI's current “Sign in with ChatGPT” documentation says website integration is limited to selected commercial partners in a limited trial, with a waitlist. Confirm eligibility before treating AC-20 as implementable; otherwise replace the provider in FR-02/FR-18, TR-16, and AC-20. citeturn15search0
2. **Two-player holdout case:** AC-32 removes the sole unready player and starts the countdown. In a two-player room this leaves one player, contradicting the two-player minimum in FR-03. This remains an explicit decision and acceptance gap.
3. **Room lifecycle and concurrency:** invalid/expired room-code behavior, reconnect/expiry, observer capacity/context, creator departure, simultaneous lobby events, and stale readiness timers still need precise outcomes.
4. **Unresolved policy choices:** match length, stage timers/no-response, answer normalization/tiebreaks, nomination counting, moderation workflow, guest identity scope, leaderboard semantics, and public lobby fields still affect test expectations.

The v2.1 changes corrected AC-02 and AC-22 to use each room's configured capacity. AC-44 through AC-51 add testable criteria for accessibility, answer authority/privacy, OIDC token validation, moderation/catalog boundaries, repeatable provisioning, the build/SWBOM gate, the public landing data boundary, and the DDD/ports-and-adapters architecture with transaction/idempotency/outbox guarantees. Remaining gap candidates are listed in Section 4.

## 2. Direct inconsistencies and testability blockers

| Priority | Existing text / area | Gap | Recommended correction |
|---|---|---|---|
| **Resolved in v2.1** | AC-02 used a fixed eight-player limit despite configurable capacity. | A room with eight players may still have open seats. | AC-02 now rejects joins only after the configured capacity (2–25) is reached, with 2, 8, and 25 called out as examples. |
| **Resolved in v2.1** | AC-22 used 25 as the joinability threshold. | Rooms can have a lower configured maximum. | AC-22 now requires `player_count < configured_capacity`; hidden, full, or started rooms are not joinable. |
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
| TR-01/02 authoritative state and realtime | AC-01, AC-09–12, AC-28–29, AC-45 | AC-45 now covers server-side answer authority and confidentiality. Client tampering with scores, roster, category choice, match result, and stale/out-of-order events still needs explicit cases. |
| TR-03 deterministic submission ordering | AC-11, AC-14 | No explicit equal/near-simultaneous correct-answer test, idempotent retry, or stable tie-break assertion. |
| TR-04 answer validation | AC-06–09, AC-16, AC-45 | AC-45 now requires server checking against the approved target/accepted-answer list and prevents incorrect answers from scoring/leaking. Exact normalization and rate-limit rules remain open. |
| TR-05 answer/hint confidentiality | AC-09, AC-28, AC-45 | AC-45 now requires the target remain hidden until reveal and incorrect guess text stay private. Solved-player hint/control projection remains a useful explicit test case. |
| TR-06 catalog integrity | AC-16 | Does not explicitly prove that unapproved/incomplete/disabled content is excluded from selection, or that active match content is stable if a catalog item changes. |
| TR-07/11/12 visual, mobile, accessibility | AC-05, AC-15, AC-44 | AC-44 adds touch/keyboard operation, focus, contrast, and non-color status cues. Screen-reader naming and missing-background fallback remain less explicit. |
| TR-08 clock consistency | AC-10, AC-14 | No test fixes the server clock as source of elapsed time, clock skew behavior, precision/rounding, or negative time rejection. Tiebreak aggregation is open. |
| TR-09 connection handling | None direct | Reconnect, retry/idempotency, disconnection during answer/readiness, room expiry, and creator departure remain open and lack accepted outcomes. |
| TR-10 room-code security | AC-24–26 | Invalid/expired codes, enumeration/rate limiting, code rotation, duplicate join retries, and behavior for closed/started rooms are missing. |
| TR-13 anchor assignment | AC-04 | Criterion checks range and selection but not uniformity, server ownership, roster snapshot stability, or rejection of category choices from non-anchor players. |
| TR-14/15 moderation/suggestions | AC-17–19, AC-47 | AC-47 adds authorization, auditable state/count/eligibility, and the approved-plus-complete catalog gate. Review states/reasons, self-approval, appeals/revisions, privacy details, and disabled content remain open. |
| TR-16 identity validation | AC-20–21, AC-46 | AC-46 now requires invalid OIDC signatures/claims to fail closed. Provider feasibility, account collision/linking, logout, session renewal, guest abuse, and guest migration remain unresolved or uncovered. |
| TR-17/18/19 lobby, observers, reactions | AC-22–30 | The capacity contradiction is fixed in AC-22. Observer cap/context, access revocation, inviter departure, reaction allowlist/rate/duration, and realtime failure cases remain open or untested. |
| TR-20–24 deployment/provisioning/free-tier | AC-34–37, AC-48–49 | AC-48 adds safe provisioning reruns, secret protection, migration reporting, and Preview/Production separation. Fork protection and migration compatibility/rollback need clearer criteria; AC-49 adds the test/SWBOM fail-closed gate. |
| TR-25/29 attribution/license | AC-39, AC-42 | No explicit check that every transitive bundled component and shipped asset has a reviewed license and preserved notice; archive completeness and source correspondence are not specified. |
| TR-27/28 SWBOM | AC-40–41, AC-49 | AC-49 adds a fail-closed build gate and exact lockfile/commit report match. Source-archive completeness, checksum policy, cryptographic binding, and post-publication download verification remain open. |
| TR-30 landing public data | AC-43, AC-50 | AC-50 adds the public field boundary and explicit exclusion of room codes and private data. Ranking semantics, precise fields, freshness, pagination, stale labeling, actions, and rules version/source remain open.
| TR-31 domain/concurrency architecture | AC-51 | AC-51 adds testable domain boundaries and final-seat serialization/idempotency/outbox proof. Broader simultaneous lobby transition outcomes still depend on the open readiness/holdout decisions. |

## 4. Resolution record and remaining gap candidates

The following criteria from the previous draft were merged into requirements v2.1 because their outcomes were already established by current FR/TR statements or by the user-approved landing-page requirement:

| Adopted requirement | Draft source | What is now accepted |
|---|---|---|
| AC-44 | Earlier draft AC-44 | Touch/keyboard operation, visible focus, contrast, and non-color status cues. |
| AC-45 | Earlier draft AC-45 | Server checks answers against the target/approved list; wrong answers do not score or leak; target withheld until reveal. |
| AC-46 | Earlier draft AC-49 | Invalid OIDC tokens/claims fail closed; provider eligibility itself remains unresolved. |
| AC-47 | Earlier draft AC-50 | Moderation/catalog actions require authorization; counts/status/eligibility are auditable; only approved complete content is playable. Detailed policy stays open. |
| AC-48 | Earlier draft AC-51 | Provisioning reruns preserve data, report migrations, protect secrets, and isolate Preview from Production. |
| AC-49 | Earlier draft AC-52 | Tests and valid matching SWBOM are required before an application deployment proceeds. |
| AC-50 | Earlier draft AC-54 | Landing data is limited to approved leaderboard/lobby fields and excludes room codes/private data. |
| AC-51 | New in v2.2 | Pure, injectable domain use cases and an atomic final-seat join/idempotency/outbox criterion establish the selected DDD modular-monolith pattern. |

These prior gap candidates were not merged because they depend on unresolved product or operational decisions, or add an unapproved release policy:

- **Reconnect/retry:** session identity, timeout, room expiry, creator departure, and duplicate-operation behavior are still open. Define those outcomes before adding a criterion.
- **Room-code failure/rate limits:** code expiration, validity window, observer access after start, and thresholds for rate limiting are open.
- **Concurrent lobby transitions:** the two-player holdout outcome and event ordering rules need approval before expected results are precise.
- **Complete release archive/checksum:** the baseline already requires release contents, license notices, and matching SWBOM, but source-completeness and checksum/reproducibility policy need approval before adding a stronger criterion.

AC-20's provider requirement and AC-32's two-player holdout case remain blockers in Section 2/5. The leaderboard metric and detailed public lobby fields remain open; AC-50 only establishes the privacy boundary.

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
2. AC-02 and AC-22 now use configured capacity; next clarify AC-25/26 invitation outcomes and room-code edge cases.
3. Approve decision-register items needed by each increment: core match/answer policies first, then identity/lobby/observer rules, moderation policy, and landing-page ranking/privacy.
4. Add any further approved security, reconnect, room-code, concurrency, and archive criteria after their policy decisions are resolved; AC-44–AC-50 are already in v2.1.
5. Build a single traceability sheet linking every active FR/TR to one or more ACs, and every AC to named unit/component/integration/browser/manual test cases. An AC count is not coverage evidence by itself.
6. Only after those edits and approvals, baseline the requirements version and use the mock-first TDD gate for each implementation increment.

## 7. Review limits

This review identifies requirement completeness, consistency, feasibility, and testability gaps. It does not decide product policy, validate a live OpenAI partner entitlement, implement software, or run tests. The remaining gap candidates in Section 4 are non-binding until their decisions are resolved and they are merged into the requirements baseline.
