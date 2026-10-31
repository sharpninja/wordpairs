# Phase 3 execution

Status: formal Phase 3 APPROVED at remote commit `991a0d42bd26226e737591296877b953edf3a468`, with 99% accuracy and 99% completeness from independent GPT-6 Astra/high review. Phase 4 entry is authorized; Phases 4–6 remain required and deployment remains Phase 7.

3A covers AC-24–28/30/51 and TR-09/10/18/31: ordered membership, observer promotion into the final slot only after a departure from a full waiting room, stable arrival ties, compaction, two-minute reconnect retention and 30-minute empty-room expiry. Tests use deterministic clocks and interleaved commands, followed by actual Postgres persistence/race checks.

3B covers AC-30–33: player-only readiness, the unchanged-lobby 30-second prompt, five-second holdout warning, exactly-two retention, larger-room removal, atomic 10-second countdown/roster lock, and close below two original members at expiry. Every mutation reschedules outstanding deadlines against its committed version without extending unrelated intervals. Stale jobs have no effect. Durable leased jobs and canonical command IDs make dispatcher retries safe; production cron wiring remains Phase 7.

Validation will include domain/application fake-clock boundary and race tests, API authorization, browser controls and actual database deadline claims/commits. Existing mock-oracle assertions remain unchanged. Gameplay after countdown belongs to Phase 4; no game-completion or deployment claim is made here.

## Implementation and race repairs

`domain/lobby.ts` contains pure transitions and absolute-time catch-up. Deadlines are ordered by due time, with reconnect expiry preceding readiness/countdown decisions at equal times. A delayed worker uses each deadline's original timestamp. All elapsed consequences collapse into one canonical aggregate version/event; state, event, new deadlines and command result commit together. Simultaneous player expiries remove their entire batch before readiness reconciliation. An earlier countdown followed by a later disconnect remains distinct from an equal-time abort.

`LobbyService.act` catches up under the room lock before deciding the requested action. If a late holdout was removed, catch-up remains durable even though their readiness request is rejected; the same command replays that failure. Admission rejects overdue consequential deadlines inside its own serialized decision, so a join cannot cancel expired removal or empty-room closure. Departure compacts surviving order and appends the earliest observer only when the waiting room was full. Equal arrival times use stable profile ID; arrival timestamps are normalized against existing observers when a server clock regresses. A followed player leaving never silently changes the observer's perspective.

Presence is a separate renewal intent: the server selects its current room version under the same lock, rechecks the verified actor's membership, and retains canonical command IDs. Concurrent heartbeats cannot starve another player through unrelated version changes. Browsers renew every 20 seconds independently of pending readiness retries. Missing heartbeats are detected after 45 seconds; this is detection latency. The disconnected player then retains the same membership/position for a full 120-second grace interval. An explicit disconnect starts that grace immediately. Late detection records `lastSeenAt + 45s`, and expiry uses that timestamp plus 120s, so worker delay does not extend retention. Neither presence nor idle prompts reset the membership/readiness activity timer.

Migration `006_lobby_deadlines.sql` persists creation deadlines atomically and adds exclusive bounded job claims with 30-second leases and owner-scoped completion. A crash after commit is recovered through canonical job replay; stale versions are terminal no-ops. The private scheduler endpoint requires `WORDPAIRS_SCHEDULER_SECRET` (at least 32 characters); production scheduling is not provisioned. Cookie-authorized room reads also attempt bounded deadline/outbox progress, while every consequential player action enforces its own transactional boundary.

The room screen provides ready/unready, leave, idle prompt, holdout warning, countdown status, separate observer view and explicit retry for uncertain mutations. UI clocks are display-only and calibrated from server time. No browser timer mutates authoritative game state. The three-minute simulated browser retry journey keeps presence active while retaining the identical original readiness request.

## Verification and limits

Verified on 26 October 2026:

- `npm test`: 428 tests in 22 files passed, with no failures/skips; includes 21 actual lobby policy/use-case tests and four lobby/scheduler API cases.
- `npm run typecheck` and `npm run lint`: passed.
- `npm run build`: passed; local production compilation only.
- `pwsh -File tests/integration/run-phase1.ps1 -Realtime`: 18 actual Postgres tests in five files, two actual Realtime tests, and the SQL/RLS/retention/rollback/final-seat checks passed. Seven new persisted lobby cases cover promotion order, readiness/departure concurrency, leased-overdue holdout enforcement, claim ownership/recovery, role denial, creation retry, closed-code expiry and 12 repeated pairs of concurrent same-version heartbeat renewals.
- `WORDPAIRS_BROWSER_PATH=/usr/bin/chromium npm exec playwright -- test --config playwright.phase3.config.ts`: all eight journeys passed. The two Phase 3 journeys cover real multi-client readiness/lock/leave/abort and an uncertain readiness retry with three simulated minutes of continuing heartbeats.

The independent reviewer verified the exact GitHub commit and tree `06310ba41e116adb72b874b59153fd5330e9b579`, matching all 151 leaf paths, modes, types and blob hashes to the local candidate. The reviewer independently passed all 428 tests, typecheck, lint, local production build, 18 actual PostgreSQL tests plus SQL checks, two actual Realtime tests and eight Chromium journeys. No unresolved material findings remain. The full request, rubric, output, resolved findings, scores and remote evidence are preserved in [`phase3_review_receipt.jsonl`](phase3_review_receipt.jsonl). The real Postgres/Realtime runner and browser fixtures represent separate evidence tiers. Browser HTTP boundaries are intercepted; the Phase 3 journeys run the actual lobby application/domain behind that test seam. They are not described as a deployed or live-provider full-stack acceptance run. The existing global AC oracle remains mock evidence, not proof that future gameplay has been implemented.

The MCP hook still reports missing marker, `no-session`, `health-failed` and empty failsafe path. No recovery success is claimed. No deployment, branch movement, live-account setup, GitHub Actions or release work occurred.
