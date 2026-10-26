# Architecture Decision Record

**Status:** Approved at Phase 0 exit  
**Date:** 26 October 2026  
**Decision owner:** Project owner  
**Requirements baseline:** Word Association Game Requirements v2.6

## Decision

Build Wordpairs as a TypeScript modular monolith using Next.js App Router, deployed on Vercel after coding Phases 1–6. Use Supabase Postgres as durable system of record and Supabase Realtime only to deliver authorized, committed updates. Use Supabase Cron/`pg_cron` through a deadline-scheduler port; verify Free-tier availability during Phase 7 deployment entry.

Organize the code into Identity/Profile, Lobby, Match, Content/Moderation, Public Read Model, and Delivery/Operations bounded contexts. The first five contexts own game behavior and projections. Delivery/Operations owns TR-only provisioning, build, SWBOM, and release processes and is implemented in Phase 7.

The web server is the authority for identity, room membership, readiness, match state, answer acceptance, scoring, moderation, and public projection filtering. Browser clients use allowlisted read models and submit commands. Database transactions serialize conflicting aggregate mutations, enforce command idempotency, and write outbox events atomically. Realtime transports outbox events; clients refetch authorized projections after reconnect or a version gap.

## Test and dependency decision

Use npm with a committed lockfile. Vitest runs domain/use-case/component tests; MSW and explicit fakes replace external boundaries; Testing Library covers React interactions; Playwright covers browser journeys. Runtime validation uses Zod. Server-side OpenID Connect uses `openid-client`. Supabase integration uses `@supabase/supabase-js` and `@supabase/ssr` only in adapters.

Use the reviewed package versions in `ATTRIBUTIONS.md` as direct dependencies and generate the lockfile before any production implementation. Apache-2.0 packages remain build/test tools and are not bundled into game runtime assets. Wordpairs source and game are GPL-2.0-only.

## Boundary rules

- Domain modules import no Next.js, React, Supabase, OIDC, or transport packages.
- Application use cases depend on ports for repositories, clock, randomness, identity, scheduler, quota state, and event publication.
- Room commands use one aggregate transaction and version; database constraints backstop domain invariants.
- A fake validates application behavior but does not claim to prove database locking, RLS, or durability. Those checks are TR integration evidence and do not count as AC coverage.
- Public landing queries use a separate allowlisted read model and never expose room codes, player names, target answers, guesses, observer views, moderation records, or secrets.
- Vercel Preview/Production setup, provisioning, deployment, deployment SWBOMs, and release publication happen only in Phase 7 after coding Phases 1–6.

## Consequences

The design keeps lobby, game, and moderation rules independently testable while retaining one deployment and one transactional persistence boundary. It avoids relying on Vercel process memory for shared state and permits deterministic fake-clock and mocked-port tests. The Free-tier scheduler capability and provider/account entitlements remain external Phase 7 TR checks; they do not change AC expectations.

## Approval evidence

The project owner approved Phase 0 on 26 October 2026. The remote-anchored hostile review at commit `6411456f0e719dce65d31e2381765acf70f1458e` scored 99.5% accuracy and 99% completeness. The approval record is `phase0_approval_receipt.jsonl`.
