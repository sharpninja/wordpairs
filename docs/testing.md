# Testing and evidence

The [UI test case index](testing/ui/index.md) links 58 design-derived specifications, source/state/transition coverage, resolved design gaps and the verified QBrain synchronization receipt. Product Word Pairs (`PROD-WORDPAIRS`) owns this workspace's requirements. New UI decisions are pending implementation and testing; documentation does not establish execution results, and historical evidence remains unchanged. Update requirements, case notes and these linked exports together under the [synchronization contract](testing/ui/persistence.md).

Run commands from the repository root after `npm ci`. The default unit suite uses injected ports and local fixtures. Database and browser suites are separate commands, with their boundaries disclosed below.

| Command | Verification |
|---|---|
| `npm test` | Domain, application, transport, architecture, acceptance-contract and temporary source-archive tests selected by `vitest.config.ts` |
| `npm run typecheck` | TypeScript without emitting application files |
| `npm run lint` | Biome checks for `src` and `tests/architecture`; check other changed test files explicitly with `npm exec biome -- check <paths>` |
| `pwsh -NoProfile -NonInteractive -File tests/integration/run-phase1.ps1` | Disposable PostgreSQL, all migrations, SQL contracts, browser-role denial, final-seat races and every non-Realtime integration file |
| `npm run test:admin` | Same disposable SQL setup plus the focused administration PostgreSQL suite |
| `npm run test:multiplayer` | Same disposable SQL setup plus eight-round games at every size from 2 through 25 players |
| `pwsh -NoProfile -NonInteractive -File tests/integration/run-phase1.ps1 -Realtime` | PostgreSQL verification followed by actual Realtime integration using disposable containers |
| `npm exec playwright -- test --config playwright.phase6.config.ts` | All current phase 2–6 browser journeys, including administration |
| `npm run build` | Local Next.js production compilation and route generation |

The integration runner requires Docker and PowerShell 7. It binds ephemeral database ports to loopback, owns its disposable containers by exact ID and removes them in `finally`. It does not reuse the running game's database. Do not combine the focused `-Administration` and `-Multiplayer` switches; use the unfiltered runner for both suites together.

The browser config starts a development server at `http://127.0.0.1:3100`, uses one worker and can select an existing Chromium executable through `WORDPAIRS_BROWSER_PATH`. Install the matching Playwright Chromium with `npm exec playwright -- install chromium` when using the bundled browser. Stop another Next.js server using this checkout before browser/build work; development and production compilation share `.next`. Run browser verification and production builds sequentially.

## Host-specific browser scratch space

The Phase 6 host exhausted `/tmp` shared-memory quota during Chromium verification. On that host use a fresh, short directory on the workspace disk and remove only that owned directory after the browser exits. The recorded PowerShell pattern is:

```powershell
$env:WORDPAIRS_BROWSER_PATH = '/usr/bin/chromium'
$browserScratch = & mktemp -d '/home/sharpninja/github/WordGame/.wp-XXXXXX'
$env:TMPDIR = $browserScratch
try {
    & npm exec playwright -- test --config playwright.phase6.config.ts
    $testExit = $LASTEXITCODE
} finally {
    Remove-Item -LiteralPath $browserScratch -Recurse -Force -ErrorAction SilentlyContinue
}
exit $testExit
```

This is a host-specific workaround; choose an adequately provisioned short writable scratch path on another machine. The underlying diagnosis and prior failed runs remain in [Phase 6 evidence](phase6_execution.md).

## Verified administration candidate, 27 October 2026

| Evidence | Result |
|---|---|
| Default suite | 502/502 tests, 42 files |
| Full PostgreSQL suite | 66/66 tests, 10 files, plus SQL checks |
| Focused administration PostgreSQL | 8/8 tests |
| Full browser suite | 31/31 journeys |
| Administration browser journeys against the production build | 5/5 journeys |
| Independent hostile review focused suite | 18/18 tests, 5 files |
| Typecheck, lint and production build | Passed |

The multiplayer suite contributes 24 database games, 324 player participations and 2,592 accepted round solves. It checks complete eight-round play, all hint/scoring stages, concurrent conflicts/retries, final standings and exactly-once profile awards. The first combined PostgreSQL run passed 65/66 but hit a 60-second fixture timeout at 25 players while the host was busy. Increasing that fixture's wall-clock budget to 120 seconds retained its assertions; the clean complete rerun passed 66/66. The failure and rerun completion records are retained.

The [hostile review receipt](admin_acl_review_receipt.json) identifies the exact [189-file snapshot](admin_acl_review_manifest.json), independently checked source hashes, resolved findings and evidence qualifications. Approval was 99/100 in accuracy and completeness with no unresolved material finding. [Completion logs](evidence/admin/) preserve the unit/build results, the first database failure, the passing database rerun and the production browser result. Later documentation maintenance does not alter that historical snapshot or claim review of subsequently edited documentation.

## Phone PWA verification

Run `npm test -- tests/web/pwa-manifest.test.ts tests/web/pwa-support.test.ts tests/web/pwa-worker.test.ts` for manifest/icon contracts, install-event/standalone lifecycle and service-worker privacy/update controls. These tests were authored first and failed 13/13 before implementation. Maskable artwork is checked against the circular safe area; icons are decoded to confirm dimensions and opacity.

Run `npm run build`, then `npx playwright test --config=playwright.pwa.config.ts`. This configuration starts a production server on loopback port 3200 and runs all existing browser journeys plus the real worker, CacheStorage allowlist, offline navigation/API/mutations, reconnection, parsed manifest and Chromium installability diagnostics. It also checks mobile layout, iPhone guidance and synthetic install events. Add `pwa.spec.ts` to run only the four PWA journeys. Use `WORDPAIRS_BROWSER_PATH` and a short writable `TMPDIR` as described above when needed. Evidence is under `docs/evidence/pwa/`.

Current PWA extension results: 14/14 focused contracts, 516/516 full unit/contract regression tests in 45 files, 35/35 production browser journeys, no lint warnings and a successful production build. These full suites were rerun after a hostile-review correction for safe-area persistence in standalone mode and installation-panel padding under the complete CSS cascade. The real installability diagnostic uses a disposable regular profile; the initial default incognito check correctly reported `in-incognito`, and its failure log is retained. No browser error is filtered out of the passing result.

The initial production run exposed a test assumption about the legacy `apple-mobile-web-app-capable` name. Installed Next.js 16.4.3's `appleWebApp.capable` emits `mobile-web-app-capable`; the test now verifies that actual framework metadata plus Apple title/touch icon and standalone manifest. This corrects the metadata expectation, not a weakened installability or private-cache assertion. The initial failure log is retained.

Browser prompt events are synthetic lifecycle checks, iPhone user-agent screenshots run in Chromium, and Chromium installability diagnostics verify browser prerequisites. None proves that a physical phone installed or relaunched the app. Actual Android/iPhone installation at a hosted HTTPS origin remains operational verification. Multiplayer still requires network access; no private game data is stored for offline play.

## Evidence boundaries

Administration browser journeys use HTTP fixtures. The catalog journey invokes the real content application/domain code with an in-memory transaction port; it does not prove PostgreSQL authorization. Separate real PostgreSQL tests cover trusted environment bootstrap, actual route handlers, role authorization, revocation races, final-administrator protection, canonical retries, audit rollback, immutable catalog versions and the 4096-version ceiling. Those route tests substitute only the test database TLS connection factory for disposable plaintext PostgreSQL; production TLS verification remains enabled.

Phone captures received independent agent visual inspection, alongside automated interaction/layout checks. Human feedback is optional and no personal human sign-off is claimed. Historical Phase 6 source-bound AC mapping remains in [the acceptance inventory](ac_test_inventory.md), [gap analysis](ac_gap_analysis.md) and [execution record](phase6_execution.md). Its four actual Realtime tests describe that historical run; the administration extension did not claim a new Realtime run. Database and transport evidence supplements the AC contract evidence. Hosted deployment and live provider/account validation remain Phase 7 work.

## Real UI multiplayer integration

`npm run test:live-ui` runs a separate operational tier against the actual private Realtime/database runtime, with no HTTP route fixtures. Configure the local runtime above, preserve the seeded Opposites catalog, and select the target explicitly:

```powershell
$env:WORDPAIRS_LIVE_ORIGIN = 'https://your-explicit-temporary-game-origin.example'
$env:WORDPAIRS_LIVE_RUNTIME_PATH = '/absolute/private/local/live-runtime.json'
$env:WORDPAIRS_BROWSER_PATH = '/usr/bin/chromium'
npm run test:live-ui
```

The primary game uses three isolated phone-size browser sessions: two players and an inviter-bound observer. Guest entry, code join, readiness, categories, every answer, hints, scores, reactions, reveal and final ranking use the actual UI. It suppresses periodic UI reads, correlates actual private frames and versioned authorized reads, probes autonomous deadlines with all browsers offline, waits beyond the initial token expiry and closes/reconnects a real socket. Negative transport checks reject anonymous/cross-profile subscriptions and client publication.

The player-count matrix runs eight UI rounds at every size2 through25. Its initial guest/membership arrangement uses real APIs, while readiness, category selection and every answer use browser controls. Version conflicts are handled through fresh explicit UI submissions and current UI state. This is separate from the deterministic2..25 service integration. Use `npm run test:live-ui -- live-player-counts.integration.spec.ts` for the matrix or `live-multiplayer.integration.spec.ts` for the strict privacy/recovery game. Optional `WORDPAIRS_LIVE_PLAYER_COUNTS='2,25'` limits matrix execution; a subset must never be reported as all counts.

Runs create real private guest profiles/rooms and lifetime results in the selected database. They leave only their own room in cleanup; profiles remain subject to normal retention. Prefer a dedicated validation database. They never edit the reported user room. Use fresh owned scratch storage as described above; this host has previously crashed Chromium with shared temporary storage. Artifacts are under `docs/evidence/room-sync/` and Playwright output. These checks do not claim physical-device OS installation or hosted Phase7 completion.

Focused regressions cover deferred game/room reads, deferred authentication cleanup, SDK token callbacks, closed-channel replacement and bounded foreground publication. `pwsh -NoProfile -File tests/integration/local-live-lease.contract.ps1` proves an obsolete watcher leaves replacement state untouched without contacting Docker/ngrok. Scheduler route tests assert truthful partial failures, and existing relay tests retain failed publications and stable retry IDs. The source archive fixture retains every checksum/source/license/tamper assertion with a240-second budget after measured shared-host runs exceeded60seconds; bound suite concurrency on that host.

### Disposable loopback HTTPS UI harness

After a production build, run the real browser matrix without a public tunnel or existing database:

```powershell
pwsh -NoProfile -File scripts/run-local-ui-integration.ps1
```

The runner requires Linux, PowerShell7, Docker, OpenSSL and installed Chromium (auto-detected as `chromium`, or supply `-BrowserPath`). It creates a fresh pinned PostgreSQL container, roles and migrated game database, plus its own Realtime/internal PostgreSQL/gateway set. The operator database is never contacted. Optional `-RuntimePath` copies other private server settings; database URL/CA, broker, origin and scheduler settings are always replaced with owned test configuration.

Both disposable PostgreSQL data directories use512MiB tmpfs mounts. `fsync` and `synchronous_commit` remain enabled and are checked; the generated service-role URL and CA must connect to the expected database with verified TLS before publishers start. WAL128/32MiB settings are soft checkpoint/recycling targets, not filesystem bounds; only tmpfs capacity is a hard limit ([PostgreSQL WAL settings](https://www.postgresql.org/docs/17/runtime-config-wal.html)). Storage usage and database errors are retained. This volatile setup cannot establish production power-loss durability, disk performance or hosted capacity. The normal disk-backed PostgreSQL integration evidence remains separate.

The browser targets `https://127.0.0.1:3443`, with app/gateway ports3005/3004. Use the port parameters if occupied. The one-day test certificate is trusted only by owned Node children and an explicit loopback-only browser flag; database TLS remains verified. No system trust store or public endpoint changes. The existing production build is reused. Do not rebuild its checkout while it is running. Phone/PWA installation uses its separately verified real HTTPS tier; the generated test certificate is not a physical-phone installation test.

Default execution covers every count2..25 with one worker. `-PlayerCounts '2,25'` selects a subset; `-StrictPush` selects the no-periodic-read two-player/observer game instead. `-Workers 2` allows two games concurrently. Within each matrix game, at most two players submit answers simultaneously through actual UI controls. Uncertain retries must preserve the complete original command ID/payload;409 conflicts require fresh UI submissions. Every player must solve all8rounds and see the same final ranking.

Browser scratch uses a fresh short workspace directory (the outer workspace when nested under `.mcpServer`), with `-ScratchRoot <short-workspace-path>` available. Successfully created directory flags protect pre-existing paths, and standalone `.wpu-*` profiles are ignored by Git. The bounded lifetime defaults to90minutes. Cleanup stops captured child process trees, confirms exact label-owned containers absent, and removes only successfully created directories. Partial startup or unconfirmed cleanup retains recovery receipts and rejects unresolved replacement.

`live-local-harness.json`, sanitized stdout/stderr and per-count JSON receipts under `docs/evidence/room-sync/` record execution. New matrix diagnostics record total failed requests, an explicit100-record detail cap/truncation flag, action/phase/time, slow/error responses and failure UI snapshots before cleanup. Earlier receipts lack total counts and may contain at most100details. Passing games may include recovered mixed lobby/match request failures; do not relabel these as heartbeat-only failures or a zero-error run. Public-tunnel failures and the shared-cluster WAL-flush diagnosis remain separate evidence.

Fault regressions:

```powershell
pwsh -NoProfile -File tests/integration/local-live-lease.contract.ps1
pwsh -NoProfile -File tests/integration/local-realtime-cleanup.contract.ps1
pwsh -NoProfile -File tests/integration/local-ui-startup.contract.ps1
node --test tests/integration/local-tls.contract.mjs
```

These infrastructure fault fixtures are separate from the real game tests, which have no HTTP fixtures. The latest complete unit/acceptance regression passed530tests. Focused lifecycle regressions verify15-second connected/one-second disconnected game/social safety reads without losing pending/coalesced requests when cadence changes; display clocks remain independent.

The real heartbeat response-body regression runs with `pwsh -NoProfile -File scripts/run-local-ui-integration.ps1 -HeartbeatBody`. It preserves an actual unread-response negative control, a consumed control, and an online-triggered production heartbeat that must finish before its abort deadline without test-side body consumption. `tests/web/heartbeat-body.test.ts` separately verifies deferred-body sequencing and exact canonical retry preservation on a body-read failure. Chromium can report an unread response as aborted after200headers; do not infer mutation failure from that event alone, or use this finding to dismiss unrelated match failures.

## UI gap implementation regression

The [UI implementation record](testing/ui/implementation.md) links TEST-REVIEWCHANGES-140 through TEST-NOSOLVERFALLBACK-146 plus admission/code variants to repeatable UI tests, focused domain/lifecycle tests and disposable SQL checks. The execution receipt records final counts and source hashes. The responsive matrix includes320x568,390x844,844x390,320CSS-pixel/4x-scale zoom equivalence and200%text enlargement; captures are bounded viewport images. Native profile dialog Cancel/Escape, unchanged mutation counts, private drafts, same-profile replacement sessions, late denial races, acknowledged room destinations and DOM announcements/focus are exercised. This is distinct from real private-push delivery and physical-phone installation.
