# Finish the guest game and admin release with15 players

Operator authorization:30October2026, "Please, finish the game!" and "Set the cap to15 (recommended)". This is the current release-capacity amendment to the earlier25-player plan. The separate25-observer limit remains. QBrain is authoritative. `docs/evidence/release15/qbrain-update-receipt.json` records19 existing requirement updates and readback; `qbrain-before.json` retains their prior scope and evidence. Changed criteria remain unsatisfied until actual verification and independent review.

## Intended result and scope

Guests can create and join rooms with2 through15 players, play eight synchronized rounds through the actual browser UI, and see the same final ranking. Continue the existing guest-only public game, fixed-owner GitHub admin authentication, admin-only PWA, private historical member profiles, content moderation and word/hint administration, whitespace and invitation-copy corrections. Complete the current-source verification, requirements/documentation publication, independent review, staging verification and production deployment. The operator's latest30October reviewer amendment selects Cline with model Beam at High effort until Monday,2November2026; it supersedes the earlier Cursor/Grok and Claude Opus selections for this interval. The latest instruction specifies no exact expiration hour. Do not revive the retired public authentication, public installation or role-delegation features.

## Capacity and compatibility contract

1. New room capacities are integral numbers2 through15. The UI states the same range. Server domain validation and forward database safeguards reject larger newly created rooms and new match rosters. Preserve the existing25-observer limit and permissions.
2. Existing running matches, including historical larger rosters, remain readable, replayable and finishable. Existing members can leave. Preserve every historical room, match and result; no deletion, forced eviction or destructive backfill.
3. A legacy waiting/countdown room with more than15 players does not start an oversized new match or admit another player above15. Its UI explains the changed capacity and keeps Leave available. Membership/readiness deadlines must not silently remove players to force compliance. A legacy room with at most15 players may start an allowed match; compute its effective available capacity safely.
4. Applied migrations remain byte-identical. Add forward013 insert/update safeguards that allow unchanged historical capacities and existing match updates. Test the distinction between new inserts and historical updates against real PostgreSQL.

Traceability: `FR-ROOMACCESS-001#AC-01/02/24/CAP15-LEGACY`, `FR-LOBBYLIFECYCLE-003#AC-01/02/24`, `FR-ANCHORSELECTION-007#AC-04`, `FR-CATEGORIES-005#AC-04`, `TR-ROOM-CODES-010`, `TR-ANCHOR-RANDOMNESS-013`, `TR-FREETIER-OPERATION-021#DEC-20`, `TR-MULTIPLAYER-INTEGRATION-034#TR-34-C01`, `TR-ROOM-SYNCRECOVERY-038#LIVE-07`; mapped existing TEST records retain IDs. The reduced service matrix is14 games,119 player participations and952 accepted round solves. The maximum audience is15 players plus25 observers.

## Implementation and test sequence

###1. Capacity contract and tests before production edits

Write the actual boundary/legacy assertions with independent correct and intentionally incorrect providers before modifying the implementation. Record the green mock gate, every rejected negative control and source hashes. Cases cover all14 allowed capacities,1/16/25/fraction/string rejection, random anchor endpoints, new16-player match rejection, concurrent final-seat admission, observer25, legacy waiting/countdown/playing behavior and truthful UI notices. Bind the same expectations to the production code. Source changes remain localized to existing room/match/lobby/application projections, room creation/display and a new migration. Run the code-verification hook immediately after each TypeScript source edit.

###2. User-facing propagation and whole-source verification

Update public landing/rules and current release documentation, preserving historical receipts as history. Update live/service fixture ranges and explicit expected matrix totals. Correct evidence scripts' stale denominators from actual results, while continuing to reject zero tests, failures, skips and provenance mismatches. Preserve the existing known chronology exceptions; later passing controls do not rewrite their order.

Run `scripts/Run-ReviewFullValidation.ps1 -ReportDirectory <fresh-directory>` for typecheck, lint, all unit/component/contract tests, disposable PostgreSQL integration, production build and all active browser cases. Run `scripts/Run-ReviewPowerShellEvidence.ps1 -ReportDirectory <fresh-directory>`. Supplement the full runner with `tests/integration/run-phase1.ps1 -Realtime -ReportDirectory <fresh-directory>` because the ordinary PostgreSQL lane excludes the actual Realtime suite. Test against a committed frozen source state and compare source manifests before/after. Do not label a dirty run as exact-commit evidence. The earlier full-suite receipts predate current changes and remain historical.

###3. Actual multiplayer browser validation

Run `scripts/run-local-ui-integration.ps1 -PlayerCounts 2,3,4,5,6,7,8,9,10,11,12,13,14,15 -MaxMinutes 90` in a separately owned local runtime. Use the actual UI for readiness, category selection and answers, actual private Realtime and TLS PostgreSQL, at most two simultaneous answer UIs and explicit condition-based synchronization. Preserve individual results immediately before a subsequent run can overwrite fixed-name report files. Require every game to finish eight rounds with correct UI totals/rankings and truthful cleanup. Also run the strict private-push case for observer/reconnect/renewal behavior. Local results do not prove hosted or physical-phone behavior.

###4. Requirements, documentation and evidence reconciliation

Read authoritative records/mappings back, associate current exact-source tests and criteria, export the supported QBrain wiki and publish intended pages to `https://github.com/sharpninja/wordpairs.wiki.git` while preserving unrelated pages. Follow the existing refresh-docs workflow. Address round6's evidence-provenance and documentation-drift findings across the entire chain, including committed producers, parent/producer run IDs, report hashes, README and deployment plan. Preserve raw receipts privately when they contain credential-bearing context; commit only verified safe exports. Do not publish credentials, private session files or historical marker content.

###5. Cline and Beam High independent hostile review

Before launch, produce a source-pinned holistic self-review: user outcomes, authority/privacy, lifecycle, concurrency, boundary and legacy behavior, traceability, docs and deployed-artifact claims. Supply full TRX files for every unit test and the scoped integration/browser lanes, with native reports, run IDs, hashes, host, source revision and commands. Verify the launcher checks this evidence and the self-review before running.

Use Cline with model Beam at High effort, verifying the supported model identifier and runtime receipt before making a model claim. The reviewer uses its documented matching QBrain plugin identity and reviews read-only without building or running tests. Save request JSONL, the complete response stream, periodic progress entries and final full verdict; the reviewer logs its own turn and proves the entire verdict was persisted. No review timeout or size cap; terminate only after more than30 minutes without any stream update. Address findings contextually and inspect sibling paths, not merely the cited lines. Report every FAIL and UNKNOWN. Only AGREE with accuracy and completeness each at least98% permits tracked done claims. The latest historical Claude round6 remains DISAGREE97/95 until superseded by an actual new result. The temporary reviewer selection applies until Monday,2November2026, without an invented exact-hour cutoff.

###6. Staging then production

Inspect current provider state and existing migration history through the connected provider tools. Preserve the selected topology: `wordpairs` is staging and `wordpairs-j9jf` production, each a separate production-target Vercel project and isolated Supabase database. Deploy exactly the reviewed commit; prevent automatic Git integration from skipping staging. Apply pending forward migrations to staging, verify privacy/capacity/schema and real multiplayer behavior, then apply the same migrations and reviewed code to production. Use only existing authorized free-tier resources. Do not run destructive acceptance fixtures against production.

Verify live public guest-only behavior, lack of public install controls, privileged-link exclusion, clipboard invitation handling, real private push/deadline progression and the admin sign-in/manifest boundaries. A fixture-only GitHub OAuth result or Chromium installability result does not prove live consent, standalone phone cookie continuity or OS installation. Keep any unavoidable physical-user observation explicit rather than asserting it happened. Retain all submission/HV evidence and update the current release record with actual source and endpoint evidence.

## Exit criteria

The15-player cap is enforced consistently, existing data survives, every supported count completes the required real browser game, the applicable suites report zero failures/skips, QBrain/docs/wiki match, and the currently selected independent reviewer reaches98/98 AGREE. Finish staging before production and report exactly which hosted behaviors were observed. No test count, local pass or deployment URL alone establishes completion of the game or its review.
