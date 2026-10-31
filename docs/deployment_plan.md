# Wordpairs Deployment and Release Plan

Current release override, 28 October 2026: [guest game and GitHub admin PWA](admin_pwa_release.md)
is the current identity and installation contract. Public play has no manifest or
installation controls; `/admin/manifest.webmanifest` and `/admin-sw.js` serve the
admin PWA. Only verified GitHub owner sharpninja may administer it; profile-ID
bootstrap and user delegation are inactive. Both existing Vercel projects use
their production target, with explicit reviewed-commit staging deployment before
production. Earlier Preview/public-PWA/OpenAI/bootstrap proposals and their
original diagrams are historical. No GitHub Actions are added.

The [31 October 2026 release amendment](release15-completion-plan.md) sets rules v2.8: new room capacities and match rosters are 2 through 10, with the independent 25-observer limit unchanged (35-person maximum audience). The complete service/UI matrix requires 9 eight-round games, 54 player participations and 432 accepted solves. Preserve larger historical running matches and stored results; above-limit waiting/countdown rooms keep Leave and an explicit compatibility notice rather than forced eviction or oversized start. Apply forward migrations with staging-first verification and never rewrite existing migration file bytes.

**Status:** Hosted setup in progress; see [execution and current blockers](hosting_execution.md)
**Requirements baseline:** current QBrain layer and rules v2.8; `word_association_game_requirements.md` v2.6 is historical
**Implementation sequence:** `implementation_plan.md`  
**Hosting constraint:** Vercel Hobby and Supabase Free; no paid add-ons or fallback  
**Automation constraint:** no GitHub Actions

## 1. Purpose and scope

The operator selected two existing projects: `wordpairs` for logical Staging and
`wordpairs-j9jf` for Production. Each uses its own stable Vercel production-target
domain and matching isolated Supabase project. This supersedes the single-project
Staging Preview proposal. The [execution record](hosting_execution.md)
documents the current server-only configuration, scheduler, migrations and evidence.

The current installation contract is the admin-only PWA in [guest game and GitHub admin PWA](admin_pwa_release.md). The public game has no installation prompt or manifest; `/sw.js` retires the former public worker. Operational checks for the admin app must separately verify hosted GitHub sign-in, installation and relaunch on physical devices. Local Chromium diagnostics do not establish those observations.

This document defines how Wordpairs will be provisioned, built, deployed, operated, rolled back, and released under the project's current constraints. Deployment, provisioning, build/SWBOM, and environment-isolation checks are bound to technical requirements TR-20–TR-29, not to ACs. Any live deployment/account/database checks are TR-only integration or operational evidence and cannot satisfy the AC mock-coverage gate. The public landing behavior remains covered by active AC-43 and AC-50 tests against local components and mocked projections; deployed smoke checks are operational diagnostics only.

The system uses Vercel Git integration for deployment from `sharpninja/wordpairs` and Supabase Postgres/Realtime for durable and live room data. Next.js/TypeScript is the selected application stack recorded in the approved Phase 0 technical ADR. GitHub Actions is not used. Provisioning and release archive creation are manually invoked from an authenticated workstation. The build and release gates are implemented only after the project's planning and mock-first TDD gates pass.

![Historical single-project deployment proposal; current two-project mapping is specified below](word_association_vercel_deployment.svg)

## 2.1 TR-only verification, separate from AC coverage

The following contract tests are specified before implementation and validated against mocks before the corresponding scripts/build code is written. They do not add ACs or count toward AC coverage. Real Vercel, Supabase, and deployment checks run later as technical integration evidence.

| TR | Mock-first technical contract | Later TR-only integration/operational evidence |
|---|---|---|
| TR-20, TR-24 | `TR-20-T01` / `TR-24-T01`: fake Vercel configuration metadata verifies distinct staging/production project bindings, ordered exact-SHA rollout and no GitHub Actions dependency. | Verify both named projects and automatic-build controls in Vercel; this is not AC evidence. |
| TR-21 | `TR-21-T01`: configuration policy rejects paid tiers, add-ons, and metered resources. | Confirm actual account plan/eligibility and deployed resource settings before provisioning/release. |
| TR-22 | `TR-22-T01`: application ports handle repository/Realtime success, failure, retry, and stale-state responses without assuming process memory is durable. | Disposable Supabase integration verifies persistence, RLS, transactions, and Realtime behavior. |
| TR-23 | `TR-23-T01`–`TR-23-T03`: fake CLI/temp filesystem verifies idempotent link/status, migration reporting, separate project variables and secret redaction. | Run safe provisioning and migration checks against the isolated named staging/production projects. |
| TR-26 | `TR-26-T01`: fake test runner proves the build orchestrator fails closed on test failure and orders checks before build. | Inspect actual Vercel build command/configuration; operational evidence only. |
| TR-27 | `TR-27-T01`: fixture lockfile and mocked build metadata produce a valid CycloneDX 1.6 SWBOM in a temporary pre-deployment build output with no secrets. | Verify the real build/deployment inventory and served endpoint; this remains TR-only and is not AC coverage. |
| TR-28, TR-29 | `TR-28-T01` / `TR-29-T01`: temporary source archive with fixture SWBOM/license verifies exact-commit paths and required notices. | Inspect the release archive and publication record; AC-41/42 also have independent mock-backed archive tests. |

## 2. Deployment principles and constraints

1. **No paid usage:** keep Vercel on Hobby and Supabase on Free. Never add a card-backed resource, paid add-on, metered service, or automatic paid fallback. A quota error is a recoverable application state, not permission to spend.
2. **Hobby is personal/non-commercial:** Vercel documents Hobby as personal, non-commercial use. Confirm continued eligibility before launch and whenever the project's use changes. If use becomes commercial, this deployment target no longer satisfies the requirement; stop and revise the hosting decision before continuing.
3. **Repository and author requirements:** the repo is public under the `sharpninja` account. Keep Vercel connected to the matching personal Git provider account. Vercel's current Hobby Git rules require the commit author to own the destination Hobby team; verify this on the first deployment and after changing Git identities. Private repositories in GitHub organizations are not deployable to Hobby under current Vercel rules.
4. **Environment separation:** local Development, `wordpairs` staging and `wordpairs-j9jf` production use distinct secrets and data. Disable unsafe feature previews; never provide production credentials to a preview or staging deployment.
5. **Control deployment order:** deploy the same reviewed Git commit to `wordpairs` first and `wordpairs-j9jf` after staging passes. Suppress automatic production Git builds during staged validation, using the existing controls in [hosting execution](hosting_execution.md), so a push cannot bypass this sequence.
6. **Migrations are versioned:** schema changes live in reviewed migration files. No manual dashboard schema edits in a hosted environment; make any emergency repair immediately reproducible in a migration.
7. **Deployment is not a release:** every Vercel build has its own SWBOM. A public release additionally requires a source archive containing the same Production build's SWBOM and the complete GPL license.
8. **Landing-page data is public by design:** expose only an explicit, approved read model for leaderboard and discoverable lobby metadata. A landing-page query is never a shortcut to the private room API.

Vercel and Supabase plans, quotas, CLI behavior, and terms can change. This plan records a baseline checked on 26 October 2026 and requires a fresh official-doc/account-dashboard check before provisioning and each release. The values below are planning constraints, not a guarantee of future quotas.

## 3. Environments and data boundaries

| Environment | Hosting and branch | Database | Data and access rules |
|---|---|---|---|
| **Development** | Local Next.js server; local Supabase stack where the developer has a compatible container runtime. | Local disposable database; deterministic seeded content. | Mocked external services for unit/component tests; no Production data or credentials. `.env.local` and `.vercel/` are ignored by Git. |
| **Staging** | Project `wordpairs`, production target, `https://wordpairs.vercel.app`. | Supabase Free project `jshjkaigwbxsbnnogfxs`. | Owned synthetic profiles/rooms/content for validation; isolated staging credentials; verify the reviewed commit before production. |
| **Feature Preview** | Disabled until a safe non-production binding is explicitly configured. | No production binding or inherited production secrets. | Feature builds cannot bypass staged rollout or use real production users/data. |
| **Production** | Project `wordpairs-j9jf`, production target, `https://wordpairs-j9jf.vercel.app`. | Supabase Free project `krdcuuhcynmdfcjlpbsf`. | The same reviewed commit after staging passes; real data preserved; non-destructive smoke checks only. |

Staging is a logical label for the production target of its own existing project; it is not a paid custom environment or the former single-project protected Preview proposal. Both named projects have independent database and variable bindings. Local Supabase development requires a Docker-compatible container runtime; local fixtures and synthetic staging data have separate evidence boundaries.

Keep the two existing Supabase projects for staging and production; verify current account limits and allocation before provisioning. Do not create a new hosted project for each branch. Isolate staging fixtures with opaque test prefixes and cleanup scoped to their owner, without assuming the database is empty.

## 4. Provisioning plan

### Administration configuration

The earlier profile-ID bootstrap and role-delegation workflow in the [administration/ACL extension](admin_acl_design.md) is historical for this release. The current server-only GitHub App configuration and fixed-owner authorization are specified in [guest game and GitHub admin PWA](admin_pwa_release.md); `/admin/users` does not manage grants in the current release. Staging and production retain separate configuration and databases.

### 4.1 Preconditions

- Confirm repository visibility, owner, production branch (`main`), expected commit author, and Vercel Hobby eligibility.
- Confirm the Vercel account/team and Supabase account have access to the personal GitHub repository and room for two Free projects.
- Review current official plan terms, usage quotas, project pausing, log retention, database backup availability, region choice, and CLI versions.
- Choose a region based on expected player geography and service availability; record the choice. Avoid claiming a multi-region or uptime guarantee on Free.
- Approve secret names and ownership without writing secret values to this plan or the repository.
- Approve database schema and migrations in accordance with the implementation plan. Deployment planning may be completed during Phase 0. Provisioning, deployment tooling, and deployment execution begin only after coding Phases 1–6 are complete, in Phase 7. Confirm branch/project topology at Phase 7 deployment entry.

### 4.2 Repeatable provisioning command

Implement one manually invoked PowerShell provisioning entry point, backed by pinned Supabase CLI and Vercel CLI versions. The current schema planner is `scripts/hosting-schema.ps1`; the earlier Node fallback is retired. Declare tools as direct development/build dependencies or provide a pinned documented installation mechanism, and add their purpose, license, and upstream source to `ATTRIBUTIONS.md`. Final branch/project topology and account-capacity confirmation are Phase 7 deployment-entry decisions after coding, not Phase 0 exit gates.

The command has explicit subcommands, a safe default dry-run/plan mode, and confirmation for destructive changes:

1. `doctor`: report CLI versions, linked accounts/project IDs, repository/branch, and required variable *names*; never print token or secret values.
2. `plan`: show the intended project/environment/migration/variable actions without mutation. Fail if the selected plan is not Free, the target is ambiguous, or staging/preview could point at production.
3. `provision staging`: link the existing `wordpairs` and `jshjkaigwbxsbnnogfxs` projects; apply approved migrations and staging-only variables to that Vercel production target; verify settings without echoing values.
4. `provision production`: link the existing `wordpairs-j9jf` and `krdcuuhcynmdfcjlpbsf` projects; apply the same migration sequence after staging validation; set only that project's production-target variables and verify the exact project ID before applying. The operator has authorized this rollout; target confirmation is a safety check rather than a new personal approval gate.
5. `status`: show project IDs, regions, plan names, migration version, deployment branch mapping, and secret variable names/presence only.
6. `backup` / `restore-check`: create a database export to an operator-controlled encrypted location, record checksum and schema version, and restore it to a disposable local/Staging database to prove recoverability. Never commit dumps or retain them in a public artifact.

The script obtains authentication from the operator's CLI session or environment. It must redact command output, avoid shell tracing of secrets, avoid placing credentials in command-line arguments where process listings may expose them, enforce restrictive file permissions on temporary files, and remove temporary files on success/failure. It is idempotent: reruns report already-correct state and do not reset projects or erase data. No script may silently change a plan or enable a paid feature.

### 4.3 Infrastructure configuration under version control

Store Supabase configuration, SQL migrations, seed fixtures, application build commands, and non-secret environment-variable names in the repo. Store no access token, database password, service-role key, OAuth client secret, user data, or exported database. Keep environment configuration as an allowlisted schema describing required key, target environments, public/private classification, and validation rule.

Use a two-person review where possible; otherwise use an explicit self-review checklist for Production. Supabase schema and RLS policies are reviewed as code. Keep Vercel build configuration in the project files only where the framework actually requires it; do not duplicate settings in incompatible Dashboard and file-based configuration.

## 5. Git-to-Vercel workflow (post-coding phase)

Do not connect the repository to Vercel or execute deployments during coding Phases 1–6. Complete local and disposable-service validation first. Begin this workflow only in Phase 7, after the coding phase is complete and the full AC suite passes.

### 5.1 Repository setup

1. Connect the existing `sharpninja/wordpairs` repository to a Vercel Hobby project owned by the matching personal Vercel account.
2. Select the production branch `main`; verify the framework preset, root directory, install command, test/build command, and output handling from the implemented Next.js app.
3. Enable deployment comments/links where available. Review fork deployment authorization and Preview protection so an untrusted pull request cannot access secrets or run against Production.
4. Add least-privilege variables independently to each project's production target. Disable unsafe feature previews; they must never inherit production secrets or database bindings.
5. Enable Vercel-provided environment metadata needed by the build (commit SHA, branch, deployment URL/environment). Treat all build-time environment values as secrets unless explicitly classified as public.
6. Verify the exact reviewed commit on `wordpairs` staging before deploying it to `wordpairs-j9jf` production. Confirm author eligibility and that no GitHub Actions workflow is involved.
7. Verify the anonymous landing-page route is reachable without authentication and returns only the public projection; inspect rendered HTML, network responses, cache headers, logs, and the SWBOM endpoint for accidental secrets or private lobby/game fields.

### 5.2 Normal change path

1. Start from current `main`; create a short-lived feature branch named for the work item and AC IDs.
2. Before implementation, pass the increment's mock-first TDD gate. The build cannot proceed if tests fail.
3. Freeze and push the candidate with automatic production builds suppressed. Deploy the reviewed SHA to the production target of `wordpairs`. The build sequence is lockfile install, static/type/content checks, the full test suite, SWBOM generation/validation, then the framework build containing that report.
4. Validate staging's immutable URL, logical environment, source commit, database target and SWBOM endpoint. Run real multiplayer/admin checks with owned synthetic staging data; review accessibility and errors.
5. After staging passes, apply the same compatible forward migrations and deploy the same reviewed SHA to the production target of `wordpairs-j9jf`. Verify the canonical domain as well as its immutable deployment. Preserve both projects' global Ignored Build Step commands as `exit 0` throughout and afterward; never restore automatic builds as part of this rollout. Use only the exact-SHA Dashboard Redeploy dialog's one-time unchecked **Use project's Ignore Build Step** checkbox, with no persistent project-setting or `ignoreCommand` override, as specified in the [guarded rollout procedure](evidence/release15/hosting-readiness/guarded-rollout-procedure.md).
6. Run a post-deploy smoke checklist against the immutable Production deployment URL and canonical domain; inspect errors and quota dashboard. Do not run destructive tests against Production.

### 5.3 Build command and gates

The eventual package scripts should make the sequence explicit and exit non-zero on any failed gate. Exact command names are selected after dependency versions are validated and pinned.

| Gate | Required checks | Failure behavior |
|---|---|---|
| Source | Clean lockfile install; type/lint/static analysis; curated content validation; verify generated files are deterministic. | Stop build. |
| Tests | Unit/component and all earlier increment suites; acceptance traceability report confirms all active ACs have tests; mock-first result is recorded. | Stop before SBOM/application build. |
| Supply-chain | Generate CycloneDX JSON 1.6 from the exact lockfile; include runtime and development/build dependencies and required metadata; validate schema, commit SHA, environment, deployment URL, and absence of secrets. | Stop build; do not deploy an artifact with missing or wrong metadata. |
| Application | Next.js production build; include report at `public/sbom/<commit-sha>.cdx.json`; verify exact endpoint path is part of output. | Vercel deployment fails. |
| Deployment | Verify Vercel environment and source commit; check expected Supabase project binding; run smoke checks, including anonymous landing-page and public-data privacy checks. | Do not promote/announce release; use rollback procedure if Production is degraded. |

Every successful staging and production deployment serves its own immutable `/sbom/<commit-sha>.cdx.json`. Include the actual Vercel deployment URL, `VERCEL_ENV`, branch and commit metadata. Both named targets use Vercel production mode, so record the project and logical environment in the deployment receipt rather than inferring them from that mode alone. Escape/validate metadata without disclosing secret values. Builds from the same SHA still have distinct project/deployment identity, and each report belongs to its served URL.

## 6. Database migration and change strategy

- Develop each migration locally or against a disposable database; run schema and RLS tests against mocks first, then the Supabase local stack or Staging.
- Keep migrations forward-compatible across the currently deployed and candidate application versions. Prefer expand → deploy compatible code → migrate/backfill → contract in later work. Do not drop/rename a live column in the same release that first stops reading it.
- Apply the same ordered migration set to staging, then production. Verify migration source bodies/history before and after. The production command must match the exact allowlisted project ID; retain its dry-run and apply receipt under the already authorized rollout.
- Seed only curated public content through reviewed, idempotent migration/seed files. Keep synthetic test accounts separate from real user data.
- Define transaction and lock behavior for online changes. Estimate table size and lock duration before applying any expensive migration under the Free database resource limit.
- Supabase Free currently lists a 500 MB database per project, 5 GB egress, 200 Realtime peak connections, 2 million Realtime messages/month, and pausing after a week of low activity; its pricing page also lists no automatic backups. The requirements additionally set 100 Realtime messages/second as an operating threshold. Treat all of these as hard ceilings and verify the live project dashboard before deployment; design a buffer below each ceiling and test the recoverable quota response.
- Because free automatic backups are not included in the current plan, operator-managed encrypted exports and restore drills are required before real user data is accepted. These exports are disaster-recovery copies, not releases, and must not be placed in GitHub, Vercel static output, or public artifacts.

## 7. Observability and incident response

### Signals to inspect

- Vercel deployment status, build duration/failure, function errors/duration/invocation quotas, runtime logs, and current Hobby usage.
- Supabase project status/paused state, database/storage size, egress, Realtime concurrent connections/messages, authentication errors, migration history, and available logs/retention.
- Landing-page read-model health: leaderboard query age, discoverable/joinable lobby result count, empty-state rate, cache age, query errors, and public projection field allowlist. Do not log individual leaderboard identities beyond the approved operational need.
- Application-level counters: active rooms/players/observers, join failures, readiness timeouts, reconnect rates, state-transition conflicts, quota responses, and repeated client retries. Collect the minimum data needed; do not log raw guesses, tokens, secret values, or unnecessary identity data.
- SWBOM endpoint reachability and commit/deployment metadata for each deployment.

Since the Free plans do not promise a production SLA and have limited log retention, the runbook relies on operator review and exported deployment evidence. Alerting must not create a paid external dependency. Establish user-facing status copy for service unavailable, capacity reached, maintenance, and paused Supabase project states.

### Incident sequence

1. Identify affected environment, commit SHA, and service status; preserve relevant non-sensitive logs and quota snapshots.
2. Stop further migrations/releases if data integrity or auth is uncertain. Never enable paid usage to recover service.
3. For a bad application deployment, redeploy/rollback to the last known-good immutable Vercel deployment using the Vercel-supported rollback/promotion mechanism; verify it points to a compatible schema.
4. For schema/data faults, use a reviewed forward repair migration or restore a verified encrypted export to a deliberate recovery target. Do not assume a Vercel code rollback reverses database changes.
5. For a quota or project pause, show recoverable status, follow the current Free-plan resume/quota instructions, and validate data integrity before reopening joins. Do not repeatedly issue requests that increase quota pressure.
6. Record impact, timeline, root cause, data-loss assessment, recovery actions, and prevention work in a private incident log; update this plan and relevant tests/ACs.

## 8. Release and archive procedure

1. Select a Production deployment with known commit SHA `S` and verify it passed all tests and post-deploy checks.
2. Retrieve the SWBOM from that exact deployment's `/sbom/S.cdx.json`; validate JSON/CycloneDX 1.6, build/deployment URL, branch, lockfile inventory, commit SHA, license inventory, and no-secret scan.
3. Check out the corresponding source tag/commit and build a source archive reproducibly. Include all source needed to modify/build the release, root `LICENSE`, `ATTRIBUTIONS.md`, required third-party notices, release metadata, and the exact SWBOM at `sbom/S.cdx.json`.
4. Exclude `.env*`, `.vercel/`, Supabase access tokens, local database files/dumps, cached credentials, and unrelated generated artifacts. Include project source/configuration and migrations needed to reproduce the release.
5. Inspect the archive listing and extract it to a clean temporary directory. Confirm one `LICENSE`, one matching report, expected SHA, and no secret-like files; rerun the archive validation against the extracted contents.
6. Publish the archive and checksum through the approved GitHub release method. No GitHub Actions asset generation is involved; the operator manually invokes the versioned packaging command and reviews its output.
7. Open the release archive after publication, compare its checksum to the local validated archive, download/extract it, and verify the SWBOM and GPL notice are present.

The packaging script must be deterministic where practical: stable file ordering, normalized timestamps/ownership, and checksum recorded separately. It must fail closed on missing/malformed/mismatched SWBOM or license review. The Production build artifact and source tag must identify the same commit; never attach a newer SWBOM to an older source archive.

## 9. Rollback and recovery objectives

During Phase 0, set realistic recovery-time and recovery-point expectations suitable for the game and free plans. The following are proposed controls, not uptime guarantees:

- **Application rollback:** keep the prior known-good Vercel deployment available; rollback code without changing database configuration. Validate current schema compatibility before rollback.
- **Database recovery:** establish an encrypted operator-held backup/export cadence and retention window before onboarding real users; prove restoration to Staging/local and document the expected data-loss window. Supabase Free lacks automatic backups according to the current pricing table, so no managed point-in-time recovery is assumed.
- **Secrets:** rotate compromised credentials in the provider dashboard/CLI, update only affected environment scopes, redeploy, then verify that old credentials are rejected. Do not place secret values in issue comments or logs.
- **Project pause:** maintain a documented resume procedure and owner contact path for the Supabase project. Reopening after pause requires database connection, migration status, auth, and Realtime smoke checks.

## 10. Deployment acceptance checklist

### Provisioning and security

- [ ] Vercel Hobby use remains personal/non-commercial; repository owner and commit author comply with current Hobby Git rules.
- [ ] Supabase Staging and Production are separate Free projects; no third paid resource is configured.
- [ ] Environment variables are scoped correctly; Preview cannot reach Production; secrets are absent from Git, logs, static files, artifacts, and screenshots.
- [ ] Provisioning `plan` is non-mutating; rerun is idempotent; production apply is target-checked and confirmed; migrations match the reviewed source.
- [ ] Staging and Production recovery procedures and encrypted backup/restore check are documented.

### Build and deployment

- [ ] The reviewed SHA passes `wordpairs` staging before the identical SHA reaches `wordpairs-j9jf` production; automatic builds cannot bypass that order; no GitHub Actions workflow is required.
- [ ] Build order runs checks/tests before SWBOM and app build; failed tests fail deployment.
- [ ] The two projects use separate matching credentials/databases; disabled or safely bound feature previews and fork deployment cannot expose production secrets.
- [ ] TR-27 operational check confirms each deployment serves the SWBOM for its exact commit, lockfile, environment, and URL without secret values; this is TR evidence, not AC coverage.
- [ ] Smoke checks confirm the anonymous landing page, approved leaderboard projection, discoverable/joinable lobby summary, rules content, identity, room creation/join, quota error handling, and expected environment labeling.
- [ ] AC-43 and AC-50 contract tests pass against local components with mocked public projections before implementation. Any deployed smoke check is diagnostic only and does not count toward AC coverage.
- [ ] TR-23/TR-26/TR-27 configuration, provisioning, build-gate, and SWBOM checks pass as TR-only evidence; they do not substitute for AC coverage.

### Release archive

- [ ] Source release archive contains the complete corresponding source, `LICENSE`, attribution notices, and the SWBOM from the matching Production deployment.
- [ ] Archive SWBOM SHA equals the source release SHA; archive listing/extraction and secret scan pass.
- [ ] Published archive checksum matches the validated local artifact; the release is manually verified after publication.

## 11. Current official references

Checked 26 October 2026; re-check at provisioning and release because plan rules and quotas may change.

- [Vercel Git deployments](https://vercel.com/docs/git) — branch previews, production branch behavior, and Hobby author/repository restrictions.
- [Vercel environments](https://vercel.com/docs/deployments/environments) — Local, Preview, Production, and Preview deployment behavior.
- [Vercel environment variables](https://vercel.com/docs/environment-variables) — environment and branch-specific Preview variables.
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) — personal, non-commercial use and Hobby limits.
- [Supabase pricing](https://supabase.com/pricing) — Free project limits, included quotas, and backup availability.
- [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing) — low activity pause behavior and recovery.
- [Supabase local development](https://supabase.com/docs/guides/local-development) and [database migrations](https://supabase.com/docs/guides/local-development/database-migrations) — local stack and versioned schema changes.
- [`SWBOM.md`](SWBOM.md) and [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) — project artifact and license-inventory contracts.

## Temporary local validation

The local Realtime gateway, independent scheduler and real browser integration are documented in [the live multiplayer extension](room_sync_fix.md). This temporary leased runtime preserves the game database and is not a Vercel/Supabase cloud deployment. A cloud deployment must provide an independent deadline/outbox trigger and verify actual private delivery before release; browser polling does not establish scheduler health.
