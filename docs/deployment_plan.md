# Wordpairs Deployment and Release Plan

**Status:** Proposed operational plan; deployment implementation has not started  
**Requirements baseline:** `word_association_game_requirements.md` v2.6  
**Implementation sequence:** `implementation_plan.md`  
**Hosting constraint:** Vercel Hobby and Supabase Free; no paid add-ons or fallback  
**Automation constraint:** no GitHub Actions

## 1. Purpose and scope

Phone home-screen installation is implemented in the [PWA extension](pwa_design.md). Production must serve the application, `/manifest.webmanifest`, `/sw.js`, `/offline.html` and `/icons/*` from the same HTTPS origin. Preserve the worker's no-cache/no-store JavaScript headers and root scope. Operational checks must install and relaunch on actual Android/iPhone devices, verify standalone `/play`, offline reconnect guidance and recovery online. Local Chromium diagnostics and iPhone user-agent tests do not establish a physical-device installation or a hosted release. No deployment was performed as part of adding PWA support.

This document defines how Wordpairs will be provisioned, built, deployed, operated, rolled back, and released under the project's current constraints. Deployment, provisioning, build/SWBOM, and environment-isolation checks are bound to technical requirements TR-20–TR-29, not to ACs. Any live deployment/account/database checks are TR-only integration or operational evidence and cannot satisfy the AC mock-coverage gate. The public landing behavior remains covered by active AC-43 and AC-50 tests against local components and mocked projections; deployed smoke checks are operational diagnostics only.

The system uses Vercel Git integration for deployment from `sharpninja/wordpairs` and Supabase Postgres/Realtime for durable and live room data. Next.js/TypeScript is the selected application stack recorded in the approved Phase 0 technical ADR. GitHub Actions is not used. Provisioning and release archive creation are manually invoked from an authenticated workstation. The build and release gates are implemented only after the project's planning and mock-first TDD gates pass.

![Vercel deployment workflow](word_association_vercel_deployment.svg)

## 2.1 TR-only verification, separate from AC coverage

The following contract tests are specified before implementation and validated against mocks before the corresponding scripts/build code is written. They do not add ACs or count toward AC coverage. Real Vercel, Supabase, and deployment checks run later as technical integration evidence.

| TR | Mock-first technical contract | Later TR-only integration/operational evidence |
|---|---|---|
| TR-20, TR-24 | `TR-20-T01` / `TR-24-T01`: fake Vercel configuration metadata verifies branch-to-Preview/Production mapping and no GitHub Actions dependency. | Verify the connected repository and branch settings in Vercel; this is not AC evidence. |
| TR-21 | `TR-21-T01`: configuration policy rejects paid tiers, add-ons, and metered resources. | Confirm actual account plan/eligibility and deployed resource settings before provisioning/release. |
| TR-22 | `TR-22-T01`: application ports handle repository/Realtime success, failure, retry, and stale-state responses without assuming process memory is durable. | Disposable Supabase integration verifies persistence, RLS, transactions, and Realtime behavior. |
| TR-23 | `TR-23-T01`–`TR-23-T03`: fake CLI/temp filesystem verifies idempotent create/link, migration reporting, Preview/Production variable separation, and secret redaction. | Run safe provisioning and migration checks against isolated Staging/Production targets. |
| TR-26 | `TR-26-T01`: fake test runner proves the build orchestrator fails closed on test failure and orders checks before build. | Inspect actual Vercel build command/configuration; operational evidence only. |
| TR-27 | `TR-27-T01`: fixture lockfile and mocked build metadata produce a valid CycloneDX 1.6 SWBOM in a temporary pre-deployment build output with no secrets. | Verify the real build/deployment inventory and served endpoint; this remains TR-only and is not AC coverage. |
| TR-28, TR-29 | `TR-28-T01` / `TR-29-T01`: temporary source archive with fixture SWBOM/license verifies exact-commit paths and required notices. | Inspect the release archive and publication record; AC-41/42 also have independent mock-backed archive tests. |

## 2. Deployment principles and constraints

1. **No paid usage:** keep Vercel on Hobby and Supabase on Free. Never add a card-backed resource, paid add-on, metered service, or automatic paid fallback. A quota error is a recoverable application state, not permission to spend.
2. **Hobby is personal/non-commercial:** Vercel documents Hobby as personal, non-commercial use. Confirm continued eligibility before launch and whenever the project's use changes. If use becomes commercial, this deployment target no longer satisfies the requirement; stop and revise the hosting decision before continuing.
3. **Repository and author requirements:** the repo is public under the `sharpninja` account. Keep Vercel connected to the matching personal Git provider account. Vercel's current Hobby Git rules require the commit author to own the destination Hobby team; verify this on the first deployment and after changing Git identities. Private repositories in GitHub organizations are not deployable to Hobby under current Vercel rules.
4. **Environment separation:** local Development, Vercel Preview/Staging, and Vercel Production must use distinct secrets and data. Never pass Production credentials to a Preview deployment.
5. **Git is the deployment trigger:** pushes to non-production branches produce Preview deployments; pushes/merges to `main` produce Production deployments. Do not add a second deploy trigger that can race or bypass the approved path.
6. **Migrations are versioned:** schema changes live in reviewed migration files. No manual dashboard schema edits in a hosted environment; make any emergency repair immediately reproducible in a migration.
7. **Deployment is not a release:** every Vercel build has its own SWBOM. A public release additionally requires a source archive containing the same Production build's SWBOM and the complete GPL license.
8. **Landing-page data is public by design:** expose only an explicit, approved read model for leaderboard and discoverable lobby metadata. A landing-page query is never a shortcut to the private room API.

Vercel and Supabase plans, quotas, CLI behavior, and terms can change. This plan records a baseline checked on 26 October 2026 and requires a fresh official-doc/account-dashboard check before provisioning and each release. The values below are planning constraints, not a guarantee of future quotas.

## 3. Environments and data boundaries

| Environment | Hosting and branch | Database | Data and access rules |
|---|---|---|---|
| **Development** | Local Next.js server; local Supabase stack where the developer has a compatible container runtime. | Local disposable database; deterministic seeded content. | Mocked external services for unit/component tests; no Production data or credentials. `.env.local` and `.vercel/` are ignored by Git. |
| **Staging** | Persistent non-production branch (proposed name: `staging`) deploys to Vercel Preview. | Dedicated Supabase Free project. | Synthetic profiles, rooms, content, and test sessions only. Protect the Preview URL with Vercel's available deployment protection; reviewer access is explicitly granted. |
| **Feature Preview** | Each non-production branch/PR receives an immutable Vercel Preview URL. | Default to the Staging Supabase project with per-test unique identifiers; allow a branch-specific override only when a separately approved free project exists. | No Production secrets/data. Use branch-specific Vercel Preview variables to target `staging`; feature branches inherit the safe Preview defaults. Ensure tests clean up only their own seeded rows. |
| **Production** | Vercel Production deployments from `main`. | Dedicated Production Supabase Free project. | Real users/data; least-privilege keys; change control and release verification. Never use this environment for automated acceptance or destructive tests. |

Vercel Hobby currently provides Local, Preview, and Production environments; named custom environments are documented for Pro/Enterprise. Therefore “Staging” is a persistent protected Preview branch and isolated Supabase project, not a paid custom Vercel environment. Branch-specific Preview variables allow that branch to use its staging database while other Preview deployments inherit the non-production default. Local Supabase development is free but requires a Docker API-compatible container runtime; if unavailable, use mock-backed tests and do integration checks in Staging with strictly synthetic data.

Supabase Free currently permits two free projects across an owner's/admin's organizations. Allocate those projects to Staging and Production; confirm account availability before provisioning. Do not create a new hosted Supabase project for each branch. Make branch previews data-safe through opaque test prefixes, short-lived fixtures, cleanup scoped to the fixture owner, and no assumption that the shared staging database is empty.

## 4. Provisioning plan

### Administration configuration

Apply migration `010_access_control.sql` before using the [administration/ACL extension](admin_acl_design.md). Set `WORDPAIRS_ADMIN_PROFILE_IDS` only in the server environment to a comma-separated list of existing profile IDs. The authenticated profile panel shows the current ID. Never use a `NEXT_PUBLIC_` variable for this setting and never set it from browser input. Restart/redeploy when changing the allowlist. An empty value grants no bootstrap authority; there is no default administrator account or password. Persisted grants can then be managed at `/admin/users` by an effective administrator. Use durable signed-in profiles for operational administrators; losing guest browser data loses access to that guest identity. Separate Preview and Production administrator lists and databases.

### 4.1 Preconditions

- Confirm repository visibility, owner, production branch (`main`), expected commit author, and Vercel Hobby eligibility.
- Confirm the Vercel account/team and Supabase account have access to the personal GitHub repository and room for two Free projects.
- Review current official plan terms, usage quotas, project pausing, log retention, database backup availability, region choice, and CLI versions.
- Choose a region based on expected player geography and service availability; record the choice. Avoid claiming a multi-region or uptime guarantee on Free.
- Approve secret names and ownership without writing secret values to this plan or the repository.
- Approve database schema and migrations in accordance with the implementation plan. Deployment planning may be completed during Phase 0. Provisioning, deployment tooling, and deployment execution begin only after coding Phases 1–6 are complete, in Phase 7. Confirm branch/project topology at Phase 7 deployment entry.

### 4.2 Repeatable provisioning command

Implement one manually invoked provisioning entry point, backed by pinned Supabase CLI and Vercel CLI versions. Select a shell or Node-based wrapper during Phase 7 post-coding deployment design, before provisioning scripts are implemented; declare the tools as direct development/build dependencies or provide a pinned documented installation mechanism, and add their purpose, license, and upstream source to `ATTRIBUTIONS.md`. Final branch/project topology and account-capacity confirmation are Phase 7 deployment-entry decisions after coding, not Phase 0 exit gates.

The command has explicit subcommands, a safe default dry-run/plan mode, and confirmation for destructive changes:

1. `doctor`: report CLI versions, linked accounts/project IDs, repository/branch, and required variable *names*; never print token or secret values.
2. `plan`: show the intended project/environment/migration/variable actions without mutation. Fail if the selected project plan is not Free, if a target project is ambiguous, or if an action could point Preview at Production.
3. `provision staging`: create or link the Staging Supabase project and Vercel project configuration; apply approved migrations; set only Preview variables, using a branch-specific override for `staging`; verify the settings without echoing values.
4. `provision production`: create or link the Production Supabase project; apply the same migration sequence after Staging validation; set only Production variables; require an explicit operator confirmation and verify the target project ID before applying.
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
4. Add Preview and Production environment variables with least privilege. Apply a branch-specific Preview override for `staging`; Preview defaults still point only to Staging/non-production infrastructure.
5. Enable Vercel-provided environment metadata needed by the build (commit SHA, branch, deployment URL/environment). Treat all build-time environment values as secrets unless explicitly classified as public.
6. Verify one feature branch Preview and one `main` Production deployment. Confirm the author rule and that no GitHub Actions workflow is involved.
7. Verify the anonymous landing-page route is reachable without authentication and returns only the public projection; inspect rendered HTML, network responses, cache headers, logs, and the SWBOM endpoint for accidental secrets or private lobby/game fields.

### 5.2 Normal change path

1. Start from current `main`; create a short-lived feature branch named for the work item and AC IDs.
2. Before implementation, pass the increment's mock-first TDD gate. The build cannot proceed if tests fail.
3. Push the branch. Vercel automatically builds a Preview. The build sequence is: install from lockfile → static/type/content checks → full test suite → generate and validate deployment SWBOM → production framework build including the SWBOM.
4. Validate the Preview URL, environment label, branch, commit, database target, and SWBOM endpoint. Execute acceptance/browser tests against synthetic staging data; review accessibility and log/errors.
5. Merge only after review and all gates. Vercel deploys the new `main` commit to Production. Migration ordering must be safe for old and new application revisions during rollout.
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

Every successful Preview and Production deployment serves its own immutable `/sbom/<commit-sha>.cdx.json`. Include the Vercel deployment URL, `VERCEL_ENV`, branch and commit metadata available at build time. Ensure metadata is escaped/validated and does not disclose environment variables. Preview and Production deployments from the same SHA still have distinct build/deployment metadata and each report belongs to the URL that serves it.

## 6. Database migration and change strategy

- Develop each migration locally or against a disposable database; run schema and RLS tests against mocks first, then the Supabase local stack or Staging.
- Keep migrations forward-compatible across the currently deployed and candidate application versions. Prefer expand → deploy compatible code → migrate/backfill → contract in later work. Do not drop/rename a live column in the same release that first stops reading it.
- Apply the same ordered migration set to Staging, then Production. Verify migration history/version before and after. A production migration command requires the selected project ID to match an allowlisted Production ID and a human confirmation.
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

- [ ] A feature branch gets a Preview; `main` gets Production; no GitHub Actions workflow is required.
- [ ] Build order runs checks/tests before SWBOM and app build; failed tests fail deployment.
- [ ] Preview uses Staging credentials; Production uses Production credentials; protected fork deployment cannot expose secrets.
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
