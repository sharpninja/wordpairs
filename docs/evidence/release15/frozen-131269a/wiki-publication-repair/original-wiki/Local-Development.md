# Local development

Current release scope: [guest-only game and owner-only GitHub admin PWA](admin_pwa_release.md). Configure server-only WORDPAIRS_GITHUB_CLIENT_ID/WORDPAIRS_GITHUB_CLIENT_SECRET and the exact canonical origin for administration. Public OpenAI/member sign-in, user delegation, nominations and community-submission UI are inactive. Public pages have no install metadata/controls; admin manifest/worker launch at /admin. Earlier feature counts and provider/delegation instructions below describe their historical snapshots. Current active browser tests use playwright.pwa.config.ts; superseded community cases are retained under docs/testing/historical/.

The [current release amendment](release15-completion-plan.md) supports new rooms and matches with 2 through 15 players and up to 25 observers. Preserve larger historical running matches and results. Legacy waiting/countdown rooms above 15 show an explanation and keep Leave available; they do not start an oversized match or remove members merely to meet the new limit. Apply the forward migration after `012_guest_public_profiles.sql`; never rewrite applied migration files.


The repository root contains the runnable Next.js application. Its pinned framework requires Node.js 20.9.0 or later. Use npm with the committed lockfile, PowerShell 7 for the integration runner, and Docker for disposable database/Realtime verification. Exact installed package versions are in `package.json`; reviewed package purposes are in [attributions](ATTRIBUTIONS.md).

## Install and start

1. Run `npm ci` from the repository root.
2. Configure a local TLS-enabled PostgreSQL/Supabase database. Apply every SQL file in `src/infrastructure/migrations` in numeric filename order using a migration administrator. Migration `010_access_control.sql` is required for administration. Use a private application connection with the required `service_role` privileges at runtime.
3. Supply the server variables below through the process environment or an ignored `.env.local` file.
4. Run `npm run dev -- --hostname 127.0.0.1 --port 3000` and open the exact origin in `WORDPAIRS_ORIGIN`.

For a local production build, stop the development server, run `npm run build`, then `npm run start -- --hostname 127.0.0.1 --port 3000`. `WORDPAIRS_ORIGIN` is required for production mutation requests, including a local production server. A successful build does not provision a database or hosted environment. Deployment operations remain in the [Phase 7 plan](deployment_plan.md).

## Server environment

| Variable | Purpose |
|---|---|
| `WORDPAIRS_ORIGIN` | Canonical browser origin including scheme and port, for example `http://127.0.0.1:3000`. Use `http://localhost:3000` instead when that is the address being opened. |
| `WORDPAIRS_DATABASE_URL` | Private PostgreSQL application connection. The runtime always verifies TLS certificates and rejects URL options that override its TLS configuration. |
| `WORDPAIRS_DATABASE_CA` | Optional PEM CA contents for a database with a private/local certificate authority. Supply the CA rather than disabling certificate verification. |
| `WORDPAIRS_INVITE_SECRET` | Server invitation-signing secret of at least 32 characters. Generate it from cryptographic random bytes and retain it across restarts. |
| `WORDPAIRS_GITHUB_CLIENT_ID`, `WORDPAIRS_GITHUB_CLIENT_SECRET` | Server-only GitHub App credentials for the fixed-owner administrator sign-in. |
| `WORDPAIRS_SUPABASE_URL`, `WORDPAIRS_SUPABASE_ANON_KEY`, `WORDPAIRS_SUPABASE_SERVICE_KEY`, `WORDPAIRS_SUPABASE_JWT_SECRET` | Realtime connection, private-channel authorization and outbox delivery configuration. All four are required to construct the Realtime adapter. |
| `WORDPAIRS_SCHEDULER_SECRET` | Authorizes `/api/internal/deadlines` for scheduler delivery. Hosted scheduler configuration remains Phase 7 work. |

Keep these settings on the server. The database URL, service key, JWT secret, signing secret and GitHub client secret must never become public build variables or Git content. `.env*`, `.vercel/`, `.mcpServer/` and the generated credential-bearing MCP trust marker are ignored by Git.

## First administrator

Open `/admin` and sign in with the configured GitHub App. The current release authorizes the fixed owner `sharpninja`; guest identities and the former profile-ID bootstrap do not grant administrator access. Open `/admin/words` to manage word pairs and three ordered hints. Role delegation and `/admin/users` are inactive. See the [current release configuration](admin_pwa_release.md).

## Guest-entry troubleshooting

### Historical OpenAI account registration

The following registration attempt predates the guest-only release and is retained as history. OpenAI sign-in and these callbacks are inactive; they are not setup instructions for the current release.

Historically, website sign-in required an issued OpenAI OIDC client registration. The former
[official registration instructions](https://developers.openai.com/siwc/request-client-id)
direct applicants to an interest form; preparing that form does not issue a client
ID. The [website integration guide](https://developers.openai.com/siwc/website)
specifies Authorization Code with PKCE and verified ID tokens. An OpenAI API key
or this coding agent's credentials cannot substitute for the application's client.

The historical registration proposal used these callbacks; do not configure them for the current release:

- Staging: `https://wordpairs.vercel.app/api/auth/callback`
- Production: `https://wordpairs-j9jf.vercel.app/api/auth/callback`

The former proposal was to set `WORDPAIRS_OIDC_ISSUER` and
`WORDPAIRS_OIDC_CLIENT_ID` on the matching server target, plus
`WORDPAIRS_OIDC_CLIENT_SECRET` only when issued for that client's authentication
method, then redeploy and verify a real sign-in. That proposal is superseded; the current game offers guest play only.

On28October2026 the operator authorized an identity-only registration request
for the OpenAI-sponsored Handshake competition, including the
[mission URL](https://app.joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/mission_step_cmssgy0di000y1ztkbjrpbt5r)
and both callbacks. The filled official form reported a loading failure and its
Submit button remained disabled after reload. Submission and client issuance
remain unconfirmed. Contact details and the filled browser capture stay outside
the repository; no registration secret is committed.


If guest entry fails, verify the browser address exactly matches `WORDPAIRS_ORIGIN`, including `localhost` versus `127.0.0.1`. These hosts also have separate cookies. Check database availability, all applied migrations and certificate trust. A page shell can render while its database-backed session request fails. An HTTPS origin produces Secure cookies; an HTTP origin produces local HTTP cookies. Refresh after a server configuration change and restart so cached server services use the new settings.

## Phone installation

The administrator app alone is installable: open `/admin` on an HTTPS origin and use its install guidance. The public game has no PWA install prompt or manifest. Installation on a different origin can have separate cookies and session state. Physical-device installation remains to be verified.

`http://localhost` and loopback are development exceptions, but a phone opening `http://<LAN-IP>:3000` is not a secure origin. HTTPS hosting or a deliberately configured trusted development HTTPS origin is needed; this feature does not create a public tunnel or deployment. The existing `WORDPAIRS_ORIGIN` exact-origin rule still applies.

The current admin worker is scoped to `/admin` and must not cache private pages or API responses. The former root worker is retained to retire previous public installations. See the [admin PWA release record](admin_pwa_release.md) for its current behavior.

## Source layout

| Path | Responsibility |
|---|---|
| `src/domain` | Pure gameplay, identity, content and permission policies |
| `src/application` | Use cases, commands and injected ports |
| `src/infrastructure` | PostgreSQL repositories, OIDC, Realtime, deadlines and server composition |
| `src/infrastructure/migrations` | Versioned SQL schema, constraints and privileged functions |
| `src/web` | React screens, strict input parsers and HTTP/session helpers |
| `src/app` | App Router pages and route handlers |
| `tests` | Contract, application, architecture, database and browser verification |
| `public`, `third_party` | Category assets and preserved upstream notices |

See [testing](testing.md) for validation commands and [the wiki manifest](wiki.yaml) for the documentation index.

## Local private Realtime and independent progression

A working page and guest session do not imply working multiplayer. `/api/realtime` requires all four server settings: `WORDPAIRS_SUPABASE_URL`, `WORDPAIRS_SUPABASE_ANON_KEY`, `WORDPAIRS_SUPABASE_SERVICE_KEY`, `WORDPAIRS_SUPABASE_JWT_SECRET`. The browser receives only the public key and a short-lived identity for its own private channel. Never disable private-channel authorization or database certificate verification to get a green badge.

The Linux/PowerShell helpers use an existing migrated TLS game database and a separate disposable Realtime internal database. Docker, PowerShell7 and the pinned images must be available. Start with an ignored private JSON runtime containing the existing `WORDPAIRS_*` server configuration. Stop servers sharing this checkout before building; keep any unrelated checkout/runtime intact.

```powershell
npm run build
$runtime = '/absolute/private/local/runtime.json'
$origin = 'https://your-explicit-temporary-game-origin.example'
& scripts/start-local-realtime.ps1 -RuntimePath $runtime -Origin $origin
```

The helper creates private mode0600 environment files and `live-runtime.json` beside the original runtime. It records exact owned container IDs in `local-realtime-state.json`; it does not migrate/reset the game database. The gateway binds127.0.0.1:3002, forwards the app to3003, and exposes only the WebSocket and authenticated broadcast Realtime paths. Management paths return404. Point the deliberately temporary HTTPS tunnel at that gateway. Gateway administration is disabled.

Create `local-live-lease.json` beside the runtime with `endpointName`, `origin`, `upstream` (`http://127.0.0.1:3002`), `startedAtUtc`, `expiresAtUtc`, and `state: running`. This describes the existing authorized ngrok endpoint and its actual expiry; it contains no secret. In separate terminals launch the app, serialized worker and finally the lease watcher, so it captures their current identities:

```powershell
& scripts/run-local-app.ps1 -RuntimePath '/absolute/private/local/live-runtime.json' -Port 3003
& scripts/run-local-scheduler.ps1 -RuntimePath '/absolute/private/local/live-runtime.json' -Port 3003 -UntilUtc '2026-10-27T20:42:31Z'
& scripts/run-local-live-lease.ps1 -RuntimePath '/absolute/private/local/live-runtime.json'
```

Replace the example expiry and spell PowerShell parameters with a space before their values (`-Port 3003`). The worker calls the protected loopback endpoint every second, with no overlapping ticks. It writes safe separate deadline/outbox outcomes to `local-scheduler-status.json`; either component failing produces503. Foreground publication handles at most one event and skips joining a batch already in progress; the worker drains up to25 events per call. Failed publications stay pending.

The lease watcher captures its generation, exact container IDs/labels and Linux process start tokens. An obsolete watcher leaves a replacement lease alone. Restart the watcher after deliberately replacing its app/worker so it captures the new processes, preserving the same authorized expiry. It deletes only the matching endpoint and its captured resources. Cleanup failures remain explicit. The original runtime and game data survive. A stopped live runtime configuration must not be reused until its services are started again; rollback uses the original private runtime and a compatible build. To stop owned Realtime manually use `start-local-realtime.ps1` with the same runtime/origin and `-Stop`.

Verify `/play`, private `/api/realtime`, actual channel subscription, the worker result and durable pending count. Verify the admin manifest separately at `/admin/manifest.webmanifest`. A successful HTTP shell alone cannot verify game delivery. See [live game design and evidence](room_sync_fix.md).

For repeatable real UI testing without ngrok, use `scripts/run-local-ui-integration.ps1` after building. It creates owned disposable TLS PostgreSQL containers on bounded volatile test storage, applies migrations, verifies the exact application URL over TLS, and serves private loopback HTTPS. Never pair separate brokers with the same game database: competing publishers share its global outbox and can acknowledge notifications delivered to the wrong broker. The runner owns and removes its generated database and services; the original game database survives. See [testing](testing.md#disposable-loopback-https-ui-harness) for prerequisites, bounds and evidence qualifications.

Select the approved full matrix explicitly with `-PlayerCounts '2,3,4,5,6,7,8,9,10,11,12,13,14,15'`: 14 games, 119 player participations and 952 accepted round solves. Use `-StrictPush` separately for the two-player/observer no-periodic-read journey. Every run needs its own retained reports; a subset or old dirty-build result is not evidence for the full changed release. Hosted targets remain the two isolated production-target projects in [hosting execution](hosting_execution.md), not a single project's Preview environment.

