# Acceptance-Criteria Gap Analysis

**Baseline reviewed:** `word_association_game_requirements.md` v2.6  
**Review date:** 26 October 2026  
**Active criteria:** 45 (AC-01–33, AC-37–39, AC-41–47, AC-50–51)  
**Retired identifiers:** AC-34, AC-35, AC-36, AC-40, AC-48, AC-49 (reserved; TR/operational verification only)

## 1. Current status

Requirements v2.6 resolves the product choices that determine active AC outcomes. The inventory maps all 45 active criteria to 65 planned AC test cases; two TR-30 public-query contract cases and six TR-31 database integration cases remain outside AC coverage. This is traceability planning, not authored or passing coverage. Phase 0 remains planning-only: no executable tests, project scripts, migrations, or implementation code may be authored until Phase 0 passes. After Phase 0, every active-AC contract test must be authored and validated against mocks before any project implementation code begins.

No AC depends on deployed artifacts. Deployment, provisioning, environment topology, build gates, and deployed SWBOM checks are TR-only or operational evidence. Deployment execution and its tooling occur after coding Phases 1–6, in Phase 7; topology/account eligibility is assessed at Phase 7 entry. AC-39/41/42 are mockable document/archive contracts using local fixtures, and AC-37 is mockable application behavior. AC-38 is a traceability/process contract.

Lobby behavior is fixed: pre-countdown departure from a full room promotes the oldest observer into the last player position and compacts the remaining roster. After countdown begins, the roster is locked and no replacement occurs. If fewer than two original roster members remain at countdown expiry, start is aborted and the room closes. An exactly two-player holdout is retained after the five-second warning expires; the lobby waits until both players are ready. In rooms with more than two players, an expired unready holdout is removed and countdown begins. A 30-second unchanged lobby prompts all players once for that aggregate version.

## 2. Remaining Phase 0 work

There are no unresolved product decisions affecting active AC expected outcomes. Phase 0 remains open for review and approval of technical design and test specifications:

| Work item | Phase 0 completion evidence | Related scope |
|---|---|---|
| Baseline and architecture ADR | Approve requirements v2.6, selected stack, DDD boundaries, dependency/license versions and pattern contracts. | AC-38/39; TR-26–31 |
| Application interfaces | Approve commands, queries, typed errors, event schemas/audiences, server-derived identity and role checks. | AC-01–33, AC-37–39, AC-43–47, AC-50–51 |
| Persistence and security | Approve logical schema, RLS, transaction/locking, idempotency, outbox, audit, retention and secret boundaries. | AC-28/37/45/47/50/51; TR-01–05/09/22/23/31 |
| Timer contract | Approve versioned durable deadline semantics and stale/duplicate delivery handling. Actual Free-plan platform availability is a post-coding Phase 7 TR integration check. | AC-30–33; TR-22 |
| Test specification | Expand all 65 planned AC cases into concrete assertions, fake behavior and evidence tiers; preserve a mockable contract for every active AC. | All active ACs |
| Post-coding deployment planning | Keep Vercel, account, branch/project, provisioning, deployed build and operational SWBOM evidence outside AC coverage. | TR-20–29; AC-41/42 use only local fixtures |

## 3. Traceability and evidence gaps to close

| Requirement area | Current mapping | Phase 0 specification action |
|---|---|---|
| Server authority, answers, privacy | AC-09, AC-28, AC-45; TR-01–05 | Give adversarial client payloads explicit assertions for score, roster, category choice, results and event order. |
| Timing and concurrency | AC-10–14, AC-30–33, AC-51 | Define equal-time event ordering and timer invalidation assertions with deterministic clocks/schedulers. Database locking/durability remains separate TR integration evidence. |
| Catalog and moderation | AC-16–19, AC-47 | Specify fixtures for incomplete/unapproved content, unique nominations, reasoned moderation, one appeal and audit expectations. |
| Identity | AC-20–21, AC-46 | Specify verified OIDC claims and same-device guest persistence contracts. Provider registration/entitlement remains external TR integration evidence, never an AC oracle. |
| Lobby and observers | AC-01–02, AC-22–33, AC-51 | Specify invalid/expired code and link, reconnect grace, stale capacity, simultaneous membership, observer promotion, compaction and locked departure cases. |
| Public landing | AC-43, AC-50 | Freeze allowlisted DTO assertions for leaderboard ordering/opt-out, lobby summaries, refresh cadence and versioned rules. |
| Attribution and source release | AC-39, AC-41–42 | Validate temporary manifests/archives for missing notices, incomplete tracked source, malformed/mismatched fixture SWBOM, GPL text and checksum behavior. |
| Architecture boundary | AC-51 / TR-31 | AC-51 is limited to mockable domain/application behavior. Database serialization/idempotency/outbox durability is tested separately as TR-31 integration evidence and never contributes to AC coverage. |
| Deployment and operations | TR-20–TR-29 | Validate mockable operational interfaces before their Phase 7 tools are written. Record real account, environment and deployment evidence separately after coding. |

## 4. Resolved findings

| Earlier issue | Current disposition |
|---|---|
| Capacity used inconsistent fixed limits | Resolved: configured capacity is 2–25. |
| Two-player holdout could be removed or start below minimum | Resolved: retain the holdout and wait until both players are ready. |
| Pre-countdown full-room departure handling | Resolved: promote oldest observer into last player position and compact the remaining player order. |
| Post-countdown departure could trigger replacement | Resolved: roster is locked; no replacement; abort and close if fewer than two originals remain at expiry. |
| Deployment topology treated as a Phase 0 gate | Resolved: assess topology/account capacity at Phase 7 entry after coding Phases 1–6. |
| Deployment/build/release automation represented as ACs | Resolved: AC-34/35/36/40/48/49 are retired; associated checks are TR/operational. |
| Deployed artifacts used as AC evidence | Resolved: no AC depends on deployed artifacts. Mockable behavior and local fixtures provide AC evidence. |
| SWBOM archive behavior conflated with deployment | Resolved: AC-41/42 check temporary source archives and fixtures; deployment SWBOM behavior is TR-only. |

## 5. Phase 0 exit actions

1. Approve the v2.6 baseline and technical architecture/interface/schema/security contracts.
2. Refine all 65 planned AC cases into exact assertions, fake interactions and evidence tiers; verify all 45 active ACs have mockable contract coverage.
3. Keep real database/provider/deployment checks in separate TR integration or operations records. They cannot establish or substitute for AC coverage.
4. Obtain hostile review at 98% or higher accuracy and completeness on the exact repository commit, with complete reviewer output recorded in the JSONL receipt.
5. Only after Phase 0 passes, author executable tests; validate the complete active-AC suite against mocks before any project implementation code.

## 6. Review limits

This document reviews requirements completeness, consistency, feasibility and testability against v2.6. It does not claim test execution, external account entitlement, or deployment evidence. Planned IDs are not passing coverage.
