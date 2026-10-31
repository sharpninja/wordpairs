# Wordpairs

<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="docs/images/readme/wordpairs-desktop-perspective.png">
  <img src="docs/images/readme/wordpairs-slideshow.gif" alt="Wordpairs gameplay on a phone and desktop, showing hints, answer entry and player scores." width="1200">
</picture>

Actual game UI with demonstration players. Slides alternate every seven seconds.

[Phone view](docs/images/readme/wordpairs-phone-perspective.png) · [Desktop view](docs/images/readme/wordpairs-desktop-perspective.png) · [Capture details](docs/images/readme/capture-receipt.json)

Every category has cel-shaded comic backgrounds in **9:16 for phones** and **16:9 for desktop**, displayed behind a frosted translucent game surface. [View all twelve backgrounds and their design](docs/category_artwork.md).

Wordpairs is a real-time word-association game. Its [requirements](docs/word_association_game_requirements.md), [AC gap analysis](docs/ac_gap_analysis.md), [test execution receipt](docs/test_execution_receipt.jsonl), [planned AC test inventory](docs/ac_test_inventory.md), [repo review receipt](docs/repo_review_receipt.jsonl), [implementation plan](docs/implementation_plan.md), [Phase 1A execution record](docs/phase1a_execution.md), [Phase 0–6 hostile-validation goal](docs/goal_hv_agreement_through_phase_6.md), [Phase 0 execution tracker](docs/implementation_phase0_execution.md), [Phase 0 interface and data contracts](docs/phase0_interface_and_data_contracts.md), [Phase 0 approval receipt](docs/phase0_approval_receipt.jsonl), [Phase 0 refresh review receipt](docs/phase0_refresh_hostile_review_receipt.jsonl), [implementation kickoff review receipt](docs/implementation_kickoff_receipt.jsonl), [approved architecture decision record](docs/architecture_decision_record.md), [architecture design and FR/TR traceability](docs/architecture_design.md), [architecture patterns](docs/architecture_patterns.md), [deployment plan](docs/deployment_plan.md), [moderation plan](docs/moderation_plan.md), and rendered diagrams are in `docs/`.

## Project status

Current release in progress: [2 through 10 players and owner-only GitHub admin PWA](docs/release15-completion-plan.md). Public play uses guests; rooms retain a separate limit of 25 observers, for an audience of at most 35. The creation default stays 4; the current rules metadata target is v2.8, dated 31 October 2026. Existing larger running matches remain finishable. The [31 October authoritative amendment](docs/evidence/release10/qbrain-update-receipt.json) updates 19 existing requirements and leaves all 28 changed criteria unsatisfied pending new evidence. The changed source requires fresh verification and staged deployment; historical evidence does not establish its hosted state. The canonical plan filename retains release15 for stable links.

31 October prior-candidate validation history: source `0e8d31a638e4db63e96302ca60fa7512c6accc96` passed its [local source/build lane](docs/evidence/release15/frozen-0e8d31a-observed-20261031T103209/full/validation.json), but the [full multiplayer repeat](docs/evidence/release15/frozen-0e8d31a-observed-20261031T103209/live-ui/live-ui.xml) reports 13 passing games and one failure at 15 players. Strict push validation and subsequent evidence preparation did not run. Independent acceptance and staged deployment remain pending; this is not a completed release.

The operator selected Cline with model Beam and High effort for hostile validation until Monday, 2 November 2026. Acceptance still requires at least 98% accuracy and 98% completeness. Earlier reviewer selections and receipts retain their historical scope.

Phases 0–6 completed implementation and independent phase-exit review, including multiplayer gameplay, moderation and final acceptance. Historical evidence remains in the [Phase 6 execution record](docs/phase6_execution.md). The earlier [administration and ACL extension](docs/admin_acl_design.md) included role-management pages; delegation is inactive in the current release. Hosted deployment remains Phase 7; a locally running app is not a hosted release.

## Local setup and validation

The application uses Next.js 16.4.3, React 19.3.1 and TypeScript 6.0.3, pinned in `package.json` and `package-lock.json`. Install dependencies with `npm ci`, configure the server environment and a migrated TLS-enabled database as described in [local development](docs/local_development.md), then run `npm run dev -- --hostname 127.0.0.1 --port 3000`. Open the exact origin configured in `WORDPAIRS_ORIGIN`.

The [testing guide](docs/testing.md) lists unit, PostgreSQL, multiplayer, administration, Realtime and browser commands and their evidence boundaries. The administration candidate passed 502 unit/contract tests, 66 PostgreSQL tests and 31 browser journeys, plus the production build. Its [independent hostile review](docs/admin_acl_review_receipt.json) approved the recorded [189-file snapshot](docs/admin_acl_review_manifest.json) at 99/100 for accuracy and completeness with no unresolved findings. This documentation refresh follows that snapshot and does not relabel it as a review of later bytes.

The [wiki manifest](docs/wiki.yaml) indexes current guides and historical execution records. MCP trust and logging were restored by registering this repository and correcting the service configuration file's ACL mask. The [maintenance receipt](docs/maintenance_receipt.json) records the recovery, triage reports and requirements-export outcome.

## Administration and installation

The public game uses guests only and has no account sign-in or PWA install
controls. Administration at `/admin` and `/admin/words` uses the registered
GitHub App and permits only the verified `sharpninja` account. User delegation
and public community submissions/nominations are disabled in this release.

Set server-only `WORDPAIRS_GITHUB_CLIENT_ID` and
`WORDPAIRS_GITHUB_CLIENT_SECRET` together with the canonical
`WORDPAIRS_ORIGIN`. Both hosting callbacks are registered; GitHub credentials
belong in the hosting secret configuration, never source control. Former
`WORDPAIRS_ADMIN_PROFILE_IDS` guest/bootstrap grants do not authorize this
release's admin routes.

Only administration remains installable. Sign into `/admin` over HTTPS, then
use **Get Wordpairs Admin on your phone** or the browser's install menu. The
manifest launches at `/admin`; its worker caches only generic offline HTML
and public icons. Admin/guest sessions are separate and private data is not
cached. The former public worker retires itself; an already-installed OS icon
requires manual removal if no longer wanted.

See the [current release design, cases and QBrain references](docs/admin_pwa_release.md).
Earlier [PWA](docs/pwa_design.md) and [ACL](docs/admin_acl_design.md) reviews
remain historical evidence. Physical OS installation and live standalone GitHub
cookie continuity are separate from automated Chromium installability checks.

## Multiplayer integration tests

Run `npm run test:multiplayer` with Docker, PowerShell 7, and installed npm dependencies. The runner creates a disposable, loopback-only PostgreSQL container, applies every migration, and removes the container in `finally`. It does not use the running game's database.

The current release matrix requires eight-round games at every size from 2 through 10 players: 9 games, 54 player participations and 432 accepted round solves. It exercises real identity, room, lobby, match and PostgreSQL services, including simultaneous answer conflicts and retries, all hint/scoring stages, shared final standings and idempotent profile awards. Time and random draws are controlled; actual browser UI and private Realtime have separate integration suites. The full `tests/integration/run-phase1.ps1` run also includes the service matrix. Earlier 2 through 25 results remain historical and do not prove the changed release.

## License

The game is intended to use GNU GPL version 2 only (`GPL-2.0-only`). See [`LICENSE`](LICENSE).

## Deployment target

The application deploys from `sharpninja/wordpairs` to two existing Vercel projects: `wordpairs` is logical staging and `wordpairs-j9jf` is production. Both use Vercel's production target with separate Supabase databases and secrets. Verify the same reviewed commit in staging before production; prevent automatic Git builds from bypassing that sequence. See [hosting execution](docs/hosting_execution.md) and [the current completion plan](docs/release15-completion-plan.md).

## Live multiplayer runtime

Live gameplay needs authenticated Realtime configuration and an independent deadline/outbox worker. A rendered page alone does not establish a working game. See [local live setup](docs/local_development.md) and [real browser integration](docs/room_sync_fix.md). `npm run test:live-ui` targets an explicitly configured real runtime and complements the service integration suite.

For a repeatable local browser matrix, run `pwsh -NoProfile -NonInteractive -File scripts/run-local-ui-integration.ps1 -PlayerCounts '2,3,4,5,6,7,8,9,10'` after a production build. It uses installed Chromium, owned disposable TLS databases on volatile test storage, private Realtime and loopback HTTPS, then cleans up only its owned resources. Readiness, categories and every answer use the UI, with at most two simultaneous answer submissions. It does not establish disk durability or hosted capacity. See [the UI harness guide](docs/testing.md#disposable-loopback-https-ui-harness).

## UI workflow and recovery extension

Existing moderation history and immutable word/hint editing remain available to
the owner. Multi-account community submission/resubmission and browser role
delegation are inactive under the current guest-only release. Their original UI
cases remain in `docs/testing/historical/`, while policy/transaction tests stay
available. Profile Save/Cancel, safe retries and active game/accessibility
journeys remain in the current browser suite. No-solver rounds still advance
after the server delay. See the [current release design](docs/admin_pwa_release.md)
and [historical UI implementation](docs/testing/ui/implementation.md).

Contest readiness and all historical hostile-validation evidence are tracked in [the submission checklist](docs/submission/README.md). The operator directed us to use **31 October 2026 as the working deadline**. The original PDF/public-date conflict remains recorded; no sponsor extension or exact cutoff hour is asserted. Final public/live evidence and entrant prerequisites remain explicit.
