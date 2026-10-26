# Phase 2 landing, identity and rooms

Status: formal Phase 2 APPROVED at remote commit `a24550cd1ae389c91d8a863b617abfca67282adf`, with 99% accuracy and 99% completeness from independent GPT-6 Astra/high review. All 138 remote leaf entries match the tested local tree `074b0f912ccd2e6dbd2848fd36d16f3b95f1bd24`. Phase 3 entry is authorized; Phase 3 implementation has not been evaluated. The complete request, rubric, remote verification, independent test evidence and verdict are in [`phase2_review_receipt.jsonl`](phase2_review_receipt.jsonl).

## Scope and evidence

| Package | Implemented boundary | Evidence and limits |
|---|---|---|
| 2A — Anonymous landing | Rules v2.6/date; public alias rankings and opt-outs; discoverable waiting/open lobbies; exact public field allowlists; empty/unavailable states; 25-row revision-bound continuation; 5-minute ranking/15-second lobby caches | `public-projections`, `public-service`, public-read adapter, landing route/component tests. Actual SQL verifies ordering, opt-out, membership revision changes, rollback, cursor conflicts and unprivileged denial. Revision/cursor metadata contains only public counters/positions; successful JSON remains the exact AC-50 projection. |
| 2B — Identity | One persistent browser guest credential initialized transactionally in IndexedDB; independently expiring hashed sessions; generated aliases, icons and opt-in; OIDC code/PKCE/state/nonce/signature/issuer/audience/expiry checks; verified subject association; guest/member separation | Application and native OIDC protocol tests use fake discovery/JWKS/token endpoints and real RSA signatures. Database tests prove concurrent guest entry, restoration after session expiry, account isolation, challenge consumption and profile command persistence/replay. Browser test uses actual IndexedDB across two tabs and a lost response. Live provider/account entitlement remains Phase 7 work. |
| 2C — Rooms | Capacity 2–25; private default; Crockford eight-character codes; rolling code-attempt limit; canonical create/join replay; ordered oldest-room quick match; signed invitation binding; manual inviter selection; up to 25 read-only observers; scoped room views and notifications | Domain/API/component/browser checks plus actual Postgres creation/final-seat races, atomic quick admissions and invitation authorization. Private Supabase Realtime tests reject another profile's channel and deliver committed player/observer notifications through the durable outbox. Gameplay-specific observer projections/commands are completed alongside Phases 3–4, then exercised in Phase 6 acceptance. |

## Verification

Verified on 26 October 2026:

- `npm test`: **403 tests passed**, 20 files, zero failures/skips. This includes the existing mock-oracle/negative-control suite; it does not claim all future gameplay ACs are implemented.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed. Build is local only.
- `pwsh -File tests/integration/run-phase1.ps1 -Realtime`: **11 actual Postgres adapter/service tests and two actual Supabase Realtime tests passed**, plus the SQL/RLS/retention/rollback/concurrency script. These are separate TR evidence.
- `WORDPAIRS_BROWSER_PATH=/usr/bin/chromium npm exec playwright -- test --config playwright.phase2.config.ts`: **six browser journeys passed**. Application UI and IndexedDB are real; HTTP service boundaries are synthetic fixtures. The executable-path override is optional when Playwright's browser is installed.

The disposable runner uses pinned Postgres and Supabase Realtime images, random loopback ports and owned container IDs. It installs the Realtime fixture's actual role/schema prerequisites and waits for both tenant tables and the HTTP service; seed tables alone do not establish readiness. It removes only containers it created. Local fixture credentials are never live account credentials.

## Hostile review repairs

Incremental GPT-6 Astra/high reviews found and drove regression fixes for:

- stale public responses, compounded HTTP cache TTLs, duplicate-alias React keys, unstable offset paging, failed-conflict recovery and premature rank labels;
- concurrent fresh-tab guest creation and lost-response identity loss;
- profile writes targeting a changed shared session: the displayed profile ID is now a precondition, while actor authority still comes from the verified session;
- stale private room codes/rosters/links after an identity switch: room state is keyed by identity and denied projections are discarded;
- quick-match selection and admission in separate transactions: the command selector, oldest eligible aggregate lock, membership transition, assignment and canonical result now share one checked-out transaction;
- stalled write requests and malformed room IDs: bounded requests preserve retry IDs, and creation/resolution share one UUID validator.

The invitation nonce now also carries an HMAC signature; its stored digest binds the room and inviter. A modified signature fails before lookup. Active inviter membership is checked again inside the serialized join. Successful quick-match retries replay the committed assignment; unsuccessful admission rolls its selection back.

## Server configuration for local/integration composition

These are configuration names, not deployed resources or credential values:

| Variables | Purpose |
|---|---|
| `WORDPAIRS_DATABASE_URL`, optional `WORDPAIRS_DATABASE_CA` | Server PostgreSQL pool, strict TLS verification, maximum three connections |
| `WORDPAIRS_ORIGIN` | Canonical application origin, same-origin write checks and registered callback origin |
| `WORDPAIRS_OIDC_ISSUER`, `WORDPAIRS_OIDC_CLIENT_ID`, optional `WORDPAIRS_OIDC_CLIENT_SECRET` | Configured OIDC provider; exact callback `/api/auth/callback`; no assumed issuer or account entitlement |
| `WORDPAIRS_INVITE_SECRET` | Stable random signing secret of at least 32 characters, server only |
| `WORDPAIRS_SUPABASE_URL`, `WORDPAIRS_SUPABASE_ANON_KEY`, `WORDPAIRS_SUPABASE_SERVICE_KEY`, `WORDPAIRS_SUPABASE_JWT_SECRET` | Realtime endpoint, public client key, server publisher credential and transport-token signing secret |

Apply sorted migrations `001`–`005`. Apply `src/infrastructure/realtime-policy.sql` after Supabase Realtime has installed `realtime.messages`; it deliberately fails if that prerequisite is absent. Browser transport tokens last two minutes, have only the basic authenticated role and authorize only the profile's private notification channel. Notifications contain event/aggregate identifiers and version, never domain payloads. Clients refetch the cookie-authorized projection, deduplicate events and retain bounded polling recovery. Publication failure preserves committed state and leaves outbox delivery pending.

`openid-client@6.8.8` and `@supabase/supabase-js@2.118.0` are exact MIT dependencies with attribution rows. The notices-fixture hash was updated to the reviewed attribution text; oracle assertion semantics were preserved.

The MCP hook reports `no-session`, `health-failed`, missing workspace marker and empty failsafe path. Source edits and real verification continued; no recovery success is claimed. These repository records preserve the evidence until the marker is repaired.

## Formal exit

Independent GPT-6 Astra/high review approved the exact remote candidate at **99% accuracy and 99% completeness**, with no unresolved material findings. The reviewer independently reran all 403 tests, typecheck, lint, local build, 11 actual PostgreSQL tests plus SQL checks, two actual Supabase Realtime tests and six Chromium journeys; all passed. The reviewed source was clean before receipt edits. Phase 3 entry is authorized. Phases 3–6, final AC acceptance and their hostile reviews remain required for the active goal. Deployment/release stays in Phase 7.
