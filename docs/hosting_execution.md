# Hosted deployment execution

## 1 November 2026 stopped-work record

The operator stopped product release work and deleted the recurring progress timer. The [deadline report and supporting evidence](submission/deadline-20261101/report.md) record the exact-source local success, incomplete hostile reviews, subsequent staging migration/status fix and unfinished hosted release. This document's earlier checkpoints remain dated history. Later documentation refresh, wiki publication and Git synchronization do not resume product development, tests, reviews or deployment, and do not establish contest submission or requirement satisfaction.

Operator decision, 27 October 2026: use the existing Vercel project **wordpairs**
(`prj_bHGxyZfZU6gsvEOBA5CKljyKq73w`) as logical staging and **wordpairs-j9jf**
(`prj_DuOPJUyewR9XfrapB6whbNEyNRxh`) as production. Each uses Vercel's production
target for its stable domain; this supersedes the single-project staging Preview
proposal in [deployment plan](deployment_plan.md). Staging binds only to Supabase
`jshjkaigwbxsbnnogfxs`; production binds only to `krdcuuhcynmdfcjlpbsf`.

## Execution plan

1. Verify exact projects, origins, database bindings, plans, current schema and
   migration histories. No new resources, upgrades, paid services or GitHub Actions.
   Per-project Vercel operations work without a team query. Preserve integration
   secrets: retain existing sensitive variables and read their integration names
   only on the server. Vercel does not support renaming a sensitive variable.
   Prepare database URLs from environment-specific generated login credentials
   through private programmatic handling, with verified TLS and no URL SSL overrides.
   Use a dedicated `wordpairs_app` login inheriting only the existing service_role
   privileges, rather than a postgres administrator connection at runtime.
   Generate separate invitation and scheduler secrets per database using pgcrypto;
   store scheduler credentials in Vault. No secret values enter repository evidence.
   The repeatable `pwsh -NoProfile -NonInteractive -File scripts/hosting-schema.ps1
   -Environment staging -Mode plan` reports exact mappings, migration names and
   source hashes. Select `-Environment production` for that project. Use
   supported MCP `apply_migration` for connected writes. The guarded TLS fallback
   supports status/apply with a private config and exact project confirmation;
   unknown migration history fails closed. All writes are transactional.
2. Add the missing repeatable hosted build gate: tests, schema-validated CycloneDX
   1.6 inventory from the exact lockfile (including build dependencies and dependency
   edges), then Next.js. Metadata includes commit, branch, target, timestamp and
   immutable Vercel URL. Keep output out of source control. Validate with fixtures.
3. Apply the reviewed numbered game migrations unchanged, in order, first staging.
   Read back history, grants, catalog and RLS. Add a versioned hosted-only scheduler
   migration and the existing private Realtime policy after inspecting policies.
   Never reset an existing database or import test accounts into production.
4. Hosted scheduler uses pg_cron once a second to check for due work, not to invoke
   Vercel when idle. pg_net POSTs to the one allowlisted environment endpoint with
   a Vault credential. Private control state bounds in-flight calls and backoff;
   only the database administrator can change endpoints/secrets. Record HTTP
   outcomes; preserve pending outbox/deadlines on failure. Use no paid scheduler.
   A35-second in-flight lease recovers missing unlogged requests; exponential
   backoff caps at60seconds. Idle detection also includes playing rooms missing
   their match. Retain only one hour of this job's cron history, prune owned HTTP
   responses, and check live DB size/invocation usage before production activation.
   Revoke app/browser access to the owned private control/function. Managed pg_net
   queues can expose headers to direct database logins; do not claim postgres can
   revoke managed-owner grants. All database logins are trusted backend operators;
   the runtime already holds this purpose-limited scheduler credential. Never issue
   database credentials to players, and keep net/Vault out of exposed Data API schemas.
5. Configure canonical origins `https://wordpairs.vercel.app` and
   `https://wordpairs-j9jf.vercel.app`, independent secrets and `WORDPAIRS_*` runtime
   values. Disable feature previews in production until a safe staging binding is
   configured. Do not copy production secrets into a preview. Do not grant an
   administrator by guessing a profile ID.
6. Preserve both projects' global Ignored Build Step commands as `exit 0` before,
   throughout and after the staged rollout; do not restore automatic Git builds.
   For each reviewed exact-SHA deployment, use that deployment's Dashboard Redeploy
   dialog and uncheck **Use project's Ignore Build Step** for that invocation only.
   Do not send `projectSettings.commandForIgnoringBuildStep`, change either global
   command or add an `ignoreCommand` override. Follow the [guarded rollout
   procedure](evidence/release15/hosting-readiness/guarded-rollout-procedure.md)
   and verify the unchanged global guards before and after each redeploy.
   Validate the build locally, retain hostile review rounds, commit required source
   and documentation changes and deploy the same exact Git commit to staging first.
   Verify guest cookies, two independent browser players, private realtime delivery
   and autonomous game progression. Run expanded browser integration only on
   synthetic staging data, with cleanup limited to owned fixtures.
7. After staging passes, apply the pending migrations to the explicitly named
   production project and deploy the same commit. Verify the SWBOM, admin-only
   manifest and offline resources, and non-destructive anonymous/public responses. Record URLs, commit,
   migration versions, tests and remaining limitations; reconcile QBrain and docs.

## Evidence and authority

QBrain's current layer was read before this plan. Relevant records include
TR-VERCEL-DEPLOYMENT-020, TR-FREETIER-OPERATION-021,
TR-SCHEMA-PROVISIONING-023, TR-DEPLOYMENT-NOACTIONS-024,
TR-TDD-ACCEPTANCE-026, TR-SWBOM-GENERATION-027 and TR-REALTIME-SYNC-002.
Deployment does not claim a contest entry, downloadable release publication,
physical-device PWA certification, backups/restore drill or full Phase7 completion.

Current official references: [Supabase Cron](https://supabase.com/docs/guides/cron),
[scheduled HTTP calls with Vault](https://supabase.com/docs/guides/functions/schedule-functions),
[Vercel deployment guide](https://vercel.com/docs/deployments),
[Vercel Hobby](https://vercel.com/docs/plans/hobby).
The Supabase changelog was checked on 27 October: the announced November removal
of old TLS ciphers does not require weakening the app's certificate verification.
Vercel Hobby's personal-use eligibility for a prize contest remains unverified.
The operator explicitly authorized deploying both named existing projects; proceed
with that deployment scope without representing a provider ruling or complete
contest compliance. No payment, advertising, sale or paid account upgrade is added.
The [official forum question about hackathon prizes](https://community.vercel.com/t/can-i-use-the-hobby-free-plan-for-a-hackathon-submission/49441)
had no published answer when checked. Keep the interpretation uncertainty in the
deployment receipt and do not mark the free-tier eligibility criterion satisfied.

## Historical preflight checkpoint (before the first deployment)

Staging's11 game migrations and hosted scheduler/private Realtime policy are
installed. Read-back found6 categories,60 pairs,31 game tables with RLS and a
database size of about12.7MB. Scheduler dispatch and its cron job remain disabled;
a configured disabled tick verified that history pruning executes. Separate
invitation, scheduler and application-login credentials were generated in Vault;
private Vercel runtime settings were written without displaying their values.

Migration007 committed its complete schema but the provider's automatically
generated history timestamp collided with006. The matching table, final function
and catalog were verified before recording007's missing history entry. Subsequent
native migrations omit outer transaction wrappers and are spaced to avoid version
collisions; the schema planner compares stored source bodies and ordered names.

The managed private-policy migration reads the existing RLS catalog and only
creates the policy. Unlike the self-hosted policy bootstrap, it does not attempt
`ALTER TABLE realtime.messages`, which Supabase's managed owner forbids.

The initial connection failed with `SELF_SIGNED_CERT_IN_CHAIN`; the operator
subsequently attached the Supabase Root2021 CA certificate. Its SHA-256 fingerprint
is `807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA`, valid
through26April2031. It is configured as `WORDPAIRS_DATABASE_CA` in both projects.
Staging administrator and application logins now connect with certificate/hostname
verification enabled; the application login reads all6 catalog categories. The
repeatable status command checked all13 migration source bodies and returned zero
pending migrations. The database password and application credentials remain private.

The local candidate passes553 unit/contract tests, lint and production build.
All five hostile-review rounds, including rejected rounds, are retained under
`docs/evidence/hosting/`. Round5 approves source readiness at99/99, separately from
operational deployment readiness. No application deployment has been created yet;
production database migrations await successful staging validation.

## Operational update — 28October2026

Staging is READY at `https://wordpairs.vercel.app` from exact source commit
`8e2f62417e0fe46cefd884e8a61024b12860a2cf`, deployment
`dpl_4unZq3queczsyf23J95UTVyF4mcJ`. Its public manifest and served CycloneDX1.6
report returned200; the inventory contains283 components and the exact source
and lockfile identity. The first build failed because Vercel's production
environment selected production React test utilities. The corrected command
sets `NODE_ENV=test` for the test step only; the unit gate remains mandatory.
The failed deployment is preserved in `docs/evidence/hosting/staging-first-build-failure.json`.

The worker rejected unauthenticated requests with403 and accepted its configured
credential with200. Staging's scheduler and cron are now enabled. The actual
hosted two-player/observer UI integration passed1/1 in2.6minutes: private push,
eight rounds, token renewal, reconnect, private-channel denial checks, and
autonomous countdown/hint progression with all browsers offline. Observations
are retained separately in `staging-live-ui-observations.json`, preserving the
earlier local evidence. This is staging evidence for the exact commit above.

Following that successful test, production's13 migrations were applied in order
with outer transaction wrappers removed. Readback found6 categories,60 pairs,
31 game tables with RLS and the private realtime policy. Its app login uses the
reviewed catalog RPC; direct table reads remain denied as designed. Both the
administrator and dedicated application login verified TLS with the second CA
attachment, explicitly identified by the operator as production. Scheduler
dispatch remains disabled until the production deployment and worker are verified.

The operator's subsequent navigation defect produced a separately reviewed fix:
server-derived permission links and a visible unavailable account-sign-in state.
Local validation passed560 unit/contract tests,10 browser administration/navigation
tests, lint and production build. Hostile review initially rejected a focus/session
race; the correction and deferred POST/DELETE tests received99/99 source approval.
Both review rounds are retained. The changed source still requires an exact-commit
staging deployment and validation before production rollout.

Historical OpenAI registration attempt, superseded by the guest/admin release:
neither environment had an OpenAI client registration. The authorized request
includes the competition purpose/URL and both callbacks. The official interest
form reported a loading failure; refilling it did not establish submission or
client issuance. OpenAI sign-in is inactive in the current release. No API key,
coding-agent credential or unrelated client ID substitutes for that registration.

Supabase security advice includes seven private trigger/invoker functions with
mutable search paths; this is recorded rather than represented as a clean
advisory report. Existing fixed-path privileged RPCs and revoked public execution
remain in place. Provider prize-contest eligibility, physical-phone PWA checks and
formal release packaging retain their separate qualifications above.

## Historical guest/admin PWA rollout checkpoint

The operator replaced public OpenAI sign-in and public installation with guest-only
play plus a fixed-owner GitHub admin PWA. The registered private GitHub App has
both exact hosting callbacks and no repository/organization/email/webhook access.
Server-only client configuration is present in both Vercel projects; credential
values are private. Source and QBrain changes are described in
[the current release record](admin_pwa_release.md). Existing staging evidence above
belongs to8e2f624, not the later guest/admin PWA candidate. Production remains prepared but
not deployed. No live owner sign-in, standalone phone continuity or changed-source
hosted rollout is claimed yet. All rejected build/test/HV rounds are retained.

