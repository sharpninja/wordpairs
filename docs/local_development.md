# Local development

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
| `WORDPAIRS_ADMIN_PROFILE_IDS` | Optional comma-separated existing profile IDs that receive administrator authority. See bootstrap below. |
| `WORDPAIRS_SUPABASE_URL`, `WORDPAIRS_SUPABASE_ANON_KEY`, `WORDPAIRS_SUPABASE_SERVICE_KEY`, `WORDPAIRS_SUPABASE_JWT_SECRET` | Realtime connection, private-channel authorization and outbox delivery configuration. All four are required to construct the Realtime adapter. |
| `WORDPAIRS_OIDC_ISSUER`, `WORDPAIRS_OIDC_CLIENT_ID`, `WORDPAIRS_OIDC_CLIENT_SECRET` | Optional approved OIDC provider settings. Issuer, client ID and canonical origin enable the provider; a client secret is used when configured. The callback is `/api/auth/callback` on the canonical origin. Guest play does not require OIDC. |
| `WORDPAIRS_SCHEDULER_SECRET` | Authorizes `/api/internal/deadlines` for scheduler delivery. Hosted scheduler configuration remains Phase 7 work. |

Keep these settings on the server. The database URL, service key, JWT secret, signing secret and administrator allowlist must never become public build variables or Git content. `.env*`, `.vercel/`, `.mcpServer/` and the generated credential-bearing MCP trust marker are ignored by Git.

## First administrator

Continue as a guest or sign in, open **Profile details** and copy the displayed profile ID. Set `WORDPAIRS_ADMIN_PROFILE_IDS` to that ID in the server environment and restart the server. The allowlist uses profile IDs, not displayed aliases. Empty configuration grants no bootstrap authority. Prefer a durable signed-in profile for ongoing operations.

Open `/admin` for moderation, `/admin/words` for word pairs and three ordered hints, and `/admin/users` to grant or revoke moderator, senior-moderator and administrator roles with reasons. Configured administrator authority is managed through the server allowlist. See the [permission matrix and transaction design](admin_acl_design.md).

## Guest-entry troubleshooting

If guest entry fails, verify the browser address exactly matches `WORDPAIRS_ORIGIN`, including `localhost` versus `127.0.0.1`. These hosts also have separate cookies. Check database availability, all applied migrations and certificate trust. A page shell can render while its database-backed session request fails. An HTTPS origin produces Secure cookies; an HTTP origin produces local HTTP cookies. Refresh after a server configuration change and restart so cached server services use the new settings.

## Phone installation

Use an HTTPS origin for a phone installation. On Android, use the page's **Install Wordpairs** button when available, or the browser's **Install app / Add to Home screen** menu. On iPhone, use Safari → **Share → Add to Home Screen**; keep **Open as Web App** enabled if offered. Installed launches use `/play`; installation on a different origin can have separate cookies/profile state. Use a durable sign-in for cross-device identity.

`http://localhost` and loopback are development exceptions, but a phone opening `http://<LAN-IP>:3000` is not a secure origin. HTTPS hosting or a deliberately configured trusted development HTTPS origin is needed; this feature does not create a public tunnel or deployment. The existing `WORDPAIRS_ORIGIN` exact-origin rule still applies.

The worker registers at `/sw.js` and stores only `/offline.html` plus public icons. It never stores game/session/admin responses or replays actions offline. Close all existing app windows to allow a waiting update to activate. Bump the worker cache version when offline assets change. Do not simply delete the worker URL to roll back an installed worker; see [PWA lifecycle and rollback](pwa_design.md).

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

Verify `/play`, `/manifest.webmanifest`, `/sw.js`, private `/api/realtime`, actual channel subscription, the worker result and durable pending count. A successful HTTP shell alone cannot verify game delivery. See [live game design and evidence](room_sync_fix.md).

For repeatable real UI testing without ngrok, use `scripts/run-local-ui-integration.ps1` after building. It creates owned disposable TLS PostgreSQL containers on bounded volatile test storage, applies migrations, verifies the exact application URL over TLS, and serves private loopback HTTPS. Never pair separate brokers with the same game database: competing publishers share its global outbox and can acknowledge notifications delivered to the wrong broker. The runner owns and removes its generated database and services; the original game database survives. See [testing](testing.md#disposable-loopback-https-ui-harness) for prerequisites, bounds and evidence qualifications.

