# Guest game and GitHub admin PWA release

Current operator scope, 28 October 2026. This document supersedes the public
OpenAI sign-in, public PWA installation and browser role-delegation portions of
the earlier designs. QBrain is authoritative; this is its linked implementation
and verification projection. Implementation and hosted rollout are in progress.

The operator's 31 October capacity amendment is [the 10-player completion plan](release15-completion-plan.md): new rooms and matches support 2 through 10 players, with the separate 25-observer limit unchanged and a maximum audience of 35. The full service and UI matrix is 9 eight-round games, 54 player participations and 432 accepted round solves. Existing larger running matches remain readable and finishable; a legacy waiting/countdown room above 10 must show a compatibility notice, preserve Leave and wait for voluntary departures before starting. It must not remove players merely to meet the new limit. QBrain `FR-ROOMACCESS-001#CAP15-LEGACY` records that compatibility obligation. This is the target contract, not a claim that the changed source is deployed or approved.

## Behavior and boundaries

The public game accepts guests only. Generated aliases, icons, browser-persistent
guest credentials, rooms, private live updates and reactions remain available.
Public OpenAI login/callback routes return404. Public session responses expose no
administration permissions, stored/bootstrap grants do not elevate guests, and
member-shaped public sessions are rejected. Community suggestion/nomination UI
and the former `/content` entry are inactive in this release.

Administration uses the registered [Word Pairs Admin GitHub App](https://github.com/settings/apps/word-pairs-admin-sharpninja).
Only verified GitHub numeric account16146732 and login `sharpninja` can complete
sign-in. The private App requests no repository, organization or email permissions
and has no webhook. User-access delegation is disabled: `/admin/users` redirects
to `/admin` and its API returns404 without touching access storage. Existing ACL
and community policy/domain/history remain preserved for future scope.

Server configuration uses `WORDPAIRS_GITHUB_CLIENT_ID` and
`WORDPAIRS_GITHUB_CLIENT_SECRET`, never public-prefixed variables. Both callback
URLs are registered exactly:

- `https://wordpairs.vercel.app/api/auth/github/callback` (staging).
- `https://wordpairs-j9jf.vercel.app/api/auth/github/callback` (production).

The provider uses Authorization Code with S256PKCE and state. Existing persisted
challenges are browser-bound, expire after10minutes and are consumed before
callback validation. The server exchanges the code and verifies `/user`; it
retains neither GitHub access/refresh tokens nor provider email. Admin cookies
`wp_admin`/`wp_admin_login` and stored hashes have a separate `github-admin` purpose
namespace from `wp_session`. Copying a guest token into an admin cookie or the
reverse cannot authenticate. Admin login/logout leaves the guest session intact.
Admin responses are private/no-store; logout requires the canonical same origin.

## Installation and offline behavior

Only the admin layout links `/admin/manifest.webmanifest`. Its stable identity,
start URL and scope are `/admin`; display is standalone and its name is Wordpairs
Admin. Existing opaque192/512 PNGs, maskable icon and Apple touch icon are reused.
The manifest is an explicit route because nested `admin/manifest.ts` is not a
recognized metadata convention in the installed Next.js version.

Authenticated admin UI offers installation and phone instructions. It registers
`/admin-sw.js` with scope `/admin`, `updateViaCache: none`, no-store script headers
and `Service-Worker-Allowed: /admin`. The worker handles only same-origin GET
admin document navigation. HTTP errors pass through; a network failure receives
the generic `/admin-offline.html` reconnect/sign-in screen. API/auth/RSC requests,
mutations and public game navigation receive no offline fallback. No operation
is queued for later execution.

Only the offline document and four public icons are cached under
`wordpairs-admin-pwa-v1`. Sessions, profiles, admin HTML, answers, room projections,
credentials and mutation responses are never put in CacheStorage. Normal admin
updates wait for active clients and delete only older admin cache versions.

Public pages have no manifest or install controls. The former `/sw.js` remains
as a retirement worker with no fetch handler; it deletes only `wordpairs-pwa-*`
caches and unregisters itself. Root cleanup recognizes only that exact former
root registration and cache prefix, preserving admin and unrelated apps. Website
code cannot remove an existing OS home-screen icon or prevent browser bookmarks.

## Traceability and repeatable cases

QBrain records: `FR-GUESTADMIN-031`, `TR-GITHUB-ADMIN-043`,
`TEST-GITHUBADMIN-149`; updated existing `FR-IDENTITY-018`,
`FR-PLAYERPROFILE-002`, `FR-ADMINPAGES-023`, `FR-PHONEINSTALL-026`,
`TR-IDENTITY-AUTHENTICATION-016`, `TR-PWA-INSTALLATION-036`,
`TR-PWA-CACHEPRIVACY-037`, `TEST-ADMINUI-136`, `TEST-PWAINSTALL-137`,
`TEST-PWAPRIVACY-138` and `TEST-IDENTITYAUTHENTICATION-116`. Native mappings
preserve prior edges. Changed criteria remain unsatisfied until their new evidence
and independent review justify a separate status update.

- `FR-GUESTADMIN-031#GA-01/02` maps public guest-only behavior and disabled secured
  entry to identity/content/admin HTTP tests and the rendered navigation/content
  browser journeys. Original multi-account community UI cases are retained in
  `docs/testing/historical/*.spec.ts.txt`; inactive features are not silently
  represented as current successful UI coverage. Domain/transaction tests remain.
- `FR-GUESTADMIN-031#GA-03/04/08` and `TR-GITHUB-ADMIN-043#GA-03/04/08` map to
  `TEST-GITHUBADMIN-149` and `TEST-ADMINUI-136`. Provider fakes cover wrong numeric
  ID, wrong login, malformed state/PKCE, denied/token/network failures and claim
  minimization. Actual runtime/repository composition tests cover token namespace
  isolation, stripped guest grants and separate logout. HTTP tests cover cookies,
  malformed callback parameters, CSRF and private responses. Rendered pages test
  direct guest denial, safe callback feedback, logout, stale responses and retries.
- `FR-PHONEINSTALL-026#PWA-01..05` and `TR-PWA-INSTALLATION-036` map to
  `TEST-PWAINSTALL-137`: inspect actual production HTML/manifest/icons; await real
  worker activation; inspect unfiltered Chromium installability diagnostics using
  a disposable regular profile; exercise click-only prompts and standalone hiding.
- `FR-PHONEINSTALL-026#PWA-06..09`, `TR-PWA-CACHEPRIVACY-037` and
  `FR-GUESTADMIN-031#GA-05..07` map to `TEST-PWAPRIVACY-138`: inspect the actual
  static cache allowlist, abort the real worker's outgoing network request, require
  a fresh admin URL response from that worker, assert generic offline content and failed private/API/public
  requests, reconnect and require authentication again. Deterministic worker and
  client tests preserve unrelated registrations/caches during legacy retirement.
- `FR-GUESTADMIN-031#GA-09` maps welcome/profile card whitespace to actual
 390px/1440px browser geometry and screenshots. Responsive padding is20px minimum
  on phones and32px on desktop, with no horizontal overflow.

`TEST-GITHUBADMIN-149` objective is to prove that guest gameplay cannot grant
administration and that only the verified owner flow creates a usable admin
session. Priority is critical. Preconditions are an isolated database/network
adapter or declared HTTP fixture and independent guest/admin browser contexts.
Data includes owner numeric ID16146732, wrong ID16146733, wrong login, unique
opaque browser tokens, duplicate callback parameters and synthetic catalog cases.
Use phone390x844 and desktop1440x900, plus the existing enlargement/orientation
matrix. Never use live users or actual provider tokens as fixture data.

Ordered actions and expected observations:

1. Open public play, continue as guest, and attempt admin entry with only the
   guest credential. Guest play works; no public provider/install/delegation links
   appear; private APIs deny before reading records.
2. Complete a fixed-owner provider fixture, then try wrong ID/login, bad state,
   missing/expired/consumed challenge and malformed callbacks. Only the verified
   owner path may issue `wp_admin`; failures show safe feedback and no private UI.
3. Copy each issued opaque token into the other realm's cookie. Both copies fail.
   Sign out of admin with a same-origin request; only its stored session/cookie
   is revoked. A cross-origin request changes nothing.
4. Open admin word/hint forms, save/retry an uncertain write, and deny a mutation
   while an old read is pending. Existing versions/audit remain immutable, the
   command is reused without duplicates, and old responses cannot restore data.
5. Inspect installation metadata and activate the real admin worker; abort
   its outgoing network request and navigate to a fresh admin URL. Only a static reconnect screen appears.
   Reconnect and verify current authentication, never cached private content.

Synchronization is condition-based: await responses, visible states, cache
contents and worker activation, without fixed sleeps. Cleanup closes owned
contexts/profiles and resets only disposable fixture resources. Automation is
ready through the named Vitest and Playwright suites; HTTP fixture evidence does
not establish live GitHub consent or phone OS installation.

The offline browser case routes and aborts only service-worker-owned outgoing
network requests before enabling browser offline mode for subsequent API/public
checks. Chromium offline emulation alone intermittently left worker fetches online.
The case requires an actual worker response and records the intercepted request;
it never supplies mocked fallback HTML. This uses Playwright's documented
[service worker network routing](https://playwright.dev/docs/service-workers).

```gherkin
Scenario: TEST-GITHUBADMIN-149 owner administration is isolated from guest play
  Given a browser has a valid guest session with stored administrator role data
  When it requests the administration session using only that guest token
  Then no administrator profile is returned
  And no private catalog records are read
  When GitHub identifies numeric account 16146733 with login sharpninja
  Then the callback creates no administrator session
  When GitHub identifies numeric account 16146732 with login sharpninja
  And its browser-bound challenge is current and unused
  Then only the administrator session cookie is issued
  And the existing guest session cookie is unchanged
  When the administrator signs out
  Then its stored administrator session is revoked
  And the guest session remains usable
```

## Verification, operations and open dependencies

Use `npm test`, `npm run lint`, `npm run build`, then production-browser
`npx playwright test --config=playwright.pwa.config.ts`. The full active browser
suite includes all currently enabled guest/game/admin flows. Source-level provider
and namespace tests are `tests/integration/github-admin.test.ts` and
`tests/integration/admin-session-isolation.test.ts`; HTTP checks include
`tests/web/github-admin-api.test.ts`. The hostile-review correction adds forward
migration `012_guest_public_profiles.sql`; no package is added. Existing schema
and private Realtime/scheduler remain separate deployment prerequisites.

Real PostgreSQL coverage in `tests/integration/admin.integration.ts` exercises the
actual login/callback/session/content routes and runtime composition, with only
the external GitHub transport faked. It verifies stored one-time challenges,
cross-realm denial, catalog writes, callback replay and durable logout. Run the
full database suite with `tests/integration/run-phase1.ps1 -ReportDirectory <path>`;
`-VolatileStorage` uses an owned temporary PostgreSQL container and does not prove
disk durability or crash recovery. `scripts/Convert-JUnitToTrx.ps1` adapts each
native JUnit case into the review's TRX format, preserving original JUnit receipts.
TRX conversion timestamps are explicitly distinguished from execution times.

The wider browser run also exposed a presence-timer regression:15-second profile
refreshes changed the profile object and restarted the20-second heartbeat effect.
Room refresh now depends on stable profile ID; the existing uncertain-readiness
browser case verifies repeated presence during a pending request. Artwork tests
now require absence of the removed public install panel and explicitly set their
desktop viewport instead of inheriting a phone viewport.

Keep every failed test/build run and hostile-review round. Original admin ACL,
OpenAI and public-PWA receipts remain historical, not approval of these bytes.
The first architecture review rejected a nested manifest and missing callback
feedback; both findings require fresh final evidence. The operator's latest
30 October override selects Cline with model Beam and High effort for final
source review until Monday, 2 November 2026, superseding the pending Cursor/Grok
and Claude Opus selections.
Acceptance still requires at least 98% accuracy and 98% completeness. The Claude
rounds below retain their original reviewer identity and outcomes.
Real hosted GitHub consent,
standalone phone OAuth cookie continuity and physical OS installation remain
distinct from fixture/browser installability evidence. Deployment claims must
name the actual reviewed source commit and verified public endpoint.

## Hostile-review recovery slice

Claude Opus round1 rejected candidate437c501 at92%accuracy/88%completeness.
Its full findings and persistence proof are retained under `docs/receipts/hv/`.
The owner was created with the former member public-default, without a public
preferences route. The earlier PostgreSQL public-read failure exposed the extra
row; fixture cleanup made the suite independent but did not repair that product
privacy problem. That distinction was missing from the original failure analysis.

The operator confirmed: "Hide all old member profiles". GA-10 therefore requires
new members to default private and all member identities, including retired
OpenAI records, to be excluded by the server's public query even if their stored
flag remains true. Preserve historical records, guest opt-in, ranking, paging and
revision conflicts. Add a forward SQL migration after the existing hosted history;
apply it to staging first, verify, then production. No data deletion or provider
token import is needed. Existing cached public pages may expire over their normal
five-minute read lifetime; restart/deployment creates fresh application caches.

Before this correction, the independent GA-10 oracle accepted a private member
and guest-only rows, and rejected a public member and both owner/legacy leaks.
The mock gate passed3/3 at20:22:38 on28October2026. The same oracle is bound to
the real identity service and PostgreSQL query. This is evidence for the recovery
slice, not a reconstruction of the missing original pre-implementation gate.
The original slice's chronological process receipt remains missing and is not
claimed satisfied. On28October2026 the operator explicitly answered "Record the
one-time exception" to question `call_30e2a1f3011842979ab422d87f21432e`. This is a
one-time exception for that historical missing receipt only. It does not waive
fresh hostile validation, current tests, security checks, migration verification
or hosted observations. No original chronology is reconstructed. The decision
and QBrain readback are retained in `docs/evidence/hosting/guest-admin-recovery/process-exception.json`.
All current status/criteria remain in progress/unsatisfied.

Recovery work also supplies explicit GA-05/06/07 cross-references to canonical
PWA criteria and their TEST/TR records, GA-09 on the responsive TR/admin TEST,
reproducible adapter fixtures and full post-edit PWA browser execution. No prior
failed review or test receipt is removed. Fresh review follows the full applicable
unit, PostgreSQL, browser, lint and production-build checks.

Claude Opus round2 rejected the corrective candidate at95%accuracy and
94%completeness. Its four FAILs were a missing mock-first gate for the deployment
planner edit, continued extension of a Node script tool, an incomplete candidate
source hash manifest, and missing pre-run analyzer receipts for the JUnit/TRX
adapter scripts. The full verdict and request/response receipts remain under
`docs/receipts/hv/`. Later reviews and dispositions are recorded below.

For the next review, a PowerShell schema planner and CLI replace the Node planner.
An initial planner module and five-case mock gate preceded the sixth test case;
the six-case gate preceded the final module edit, not the initial module. A later
catch-up gate added a rejecting negative control for every case. These receipts do
not change the original chronology. The mock-gate summary, real-run JUnit and adapted TRX receipts are in
`docs/evidence/hosting/guest-admin-recovery/planner-*`. The tracked source-manifest
generator enumerates literal Git paths, including bracketed routes, public assets
and root test/build configuration; the frozen review manifest records its path count.
The adapter analyzer receipt records parser and ScriptAnalyzer results for both
scripts before the fresh three-fixture run. These are local process receipts, not
approval to deploy. The final source manifest and all execution reports must be
regenerated against the frozen source revision that the next hostile review sees.

Round3 first ended incomplete during the MCP outage. Its later Claude Opus retry
returned DISAGREE at95% accuracy and93% completeness: 31 PASS, four FAIL and three
UNKNOWN. Round4 returned DISAGREE at96% accuracy and94% completeness: 35 PASS,
five FAIL and three UNKNOWN. The full request, response, findings and protected
originals are retained under `docs/receipts/hv/` and its privacy-export records.
The round4 findings prompted a deterministic reaction-clock test, complete
PowerShell analyzer coverage, corrected current-scope documentation and per-run
test metadata. Those changes require fresh tests and independent review; the
earlier chronology and unresolved reviewer-effort and prior-triage uncertainties
remain historical facts.

Round5 returned DISAGREE at 97% accuracy and 95% completeness, with 37 PASS,
three FAIL and four UNKNOWN. Round6 returned DISAGREE at 97% accuracy and 95%
completeness, with 39 PASS, two FAIL and three UNKNOWN. Round6 identified missing
links between aggregated run IDs and producer receipts, and a documentation
drift check that missed reworded instructions and omitted two documents. Its
unknowns were reviewer effort attestation, the outcome of an earlier failsafe,
and the original documentation check's mock-first order. See the complete
`docs/receipts/hv/20261029T102510-admin-pwa-source-round6.verdict.json` and the
preserved original and public response receipts. Later local changes require a
fresh review; these historical results do not establish staging readiness.

Documentation phrase checks are targeted regression aids. They cannot establish
the meaning or correctness of arbitrary prose; contextual review of current
requirements, instructions and deployment state remains necessary. Retained
browser scale receipts show completed eight-round games for 2 through 14
players and a 25-player run that stopped in round one. These original receipts
are historical under the former 25-player scope and remain distinct from
service-level tests. A later isolated 15-player run completed eight rounds and
120 UI solves, with seven recorded request failures, no uncertain retries and
no cleanup failures; its dirty-build evidence is retained in
`docs/evidence/hosting/guest-admin-recovery/round7-scale-15/`. The isolated
20-player readiness failure remains in `round7-scale-20-readiness-failure/`.
Neither run establishes the changed committed release or hosted capacity.

The following 25-player investigations retain their original scope and outcomes
as historical evidence. They are not the current LIVE-07 acceptance range,
which is now 2 through 10, and they must not be rewritten as passing results.

An additional isolated 25-player diagnostic failed during readiness before its
simultaneous-answer experiment. The captured screens show the game playing with
24 players while the last participant could no longer access the room. The
specified five-second holdout removal is consistent with that outcome, but no
retained deadline event proves it was the cause. The local build included
uncommitted match-notification routing changes. The preserved diagnostic and its
actual test source are under
`docs/evidence/hosting/guest-admin-recovery/round7-scale-25-simultaneous/`.
This evidence does not establish 25-player gameplay or public capacity. QBrain
`TR-ROOM-SYNCRECOVERY-038#LIVE-07` remains unsatisfied.

A follow-up isolated diagnostic readied the last two players together and
reached round one with 25 players, but failed after nine recorded solves. It
recorded 15 uncertain retries and 453 request failures; only the first 100
failure details were retained. The captured scorecard shows the round deadline
had elapsed. The cause of the delay is not established. This exploratory run
allowed 25 concurrent answers, outside the LIVE-07 limit of two. Receipt:
`docs/evidence/hosting/guest-admin-recovery/round7-scale-25-ready-together/`.
Another isolated run retained the last-two readiness adjustment and limited
answer submissions to two at once, as LIVE-07 specifies. It failed in round one
after two recorded solves, one uncertain retry and 396 request failures, with
only the first 100 failure details retained. The answer control was absent when
the test attempted to submit. The run reported no cleanup errors. Receipt:
`docs/evidence/hosting/guest-admin-recovery/round7-scale-25-bounded/`. Its
cause remains unproven, and the local candidate has not passed the 25-player
case.

A subsequent diagnostic collected request counts by phase and endpoint but
failed during readiness before gameplay. In the test's readiness phase it
started 1,563 room reads, observed 24 successful readiness responses, and
recorded a maximum completed room-read time of approximately 9.1 seconds. The
captured roster had 24 players. These are local observations, not proof of the
source of the delay or of public-host performance. Receipt:
`docs/evidence/hosting/guest-admin-recovery/round7-scale-25-metrics/`.

An exploratory run suppressed periodic browser safety reads while keeping real
push and presence heartbeats. All 25 readiness actions succeeded, but the test
failed before it saw the category chooser; 22 captured clients were still
loading the game. Request totals recorded after cleanup include cleanup traffic
and cannot establish why the chooser was missing. This altered-timer run is not
an acceptance test. Receipt:
`docs/evidence/hosting/guest-admin-recovery/round7-scale-25-no-safety-polls/`.

Another normal-polling diagnostic failed during readiness. Its pre-cleanup
snapshot recorded 881 started room reads. An independent monitor sampled the
isolated game database 36 times, with three idle connections observed in 35
samples and no sampled database lock wait. Sampling can miss brief waits and
does not establish the cause of the delay. The initial monitor attempt ran
before PostgreSQL was ready and captured no samples; the corrected monitor was
attached after startup. Receipt, monitor source and samples:
`docs/evidence/hosting/guest-admin-recovery/round7-scale-25-db-monitored/`.

After the deadline-worker change, a local 25-player run completed round one but
failed in round two after 45 recorded solves. Its pre-cleanup round-two metrics
recorded 33 answer conflicts, 20 successful answer responses, 1,896 reaction
reads, 1,467 room reads and 1,171 match reads started. The monitor captured
103 database snapshots, with lock waits in three snapshots. Sampling cannot
establish their contribution to the failure. Receipt:
`docs/evidence/hosting/guest-admin-recovery/round7-scale-25-post-deadline-fix/`.
The change does not establish the 25-player acceptance case.

After additionally separating game and reaction refresh keys, another local
25-player run failed in round two after 29 recorded solves. It recorded 304
reaction reads in round one, compared with 826 in the prior diagnostic; timing
and run conditions differed, so the counts do not prove a capacity improvement.
Receipt: `docs/evidence/hosting/guest-admin-recovery/round7-scale-25-post-social-fix/`.

The local strict-push browser integration passed for two players and an observer
through eight rounds, token renewal and reconnect with periodic UI reads
suppressed. It used the uncommitted candidate build, an isolated TLS database
and private local Realtime. Its receipt is in
`docs/evidence/hosting/guest-admin-recovery/round7-strict-push/`; it does not
establish deployed behavior or the former 2-to-25-player matrix. Current release
verification must rerun the approved 2-to-10 matrix against the frozen candidate.
