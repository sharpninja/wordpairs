# Acceptance-Criteria Gap Analysis

**Baseline reviewed:** `word_association_game_requirements.md` v2.6  
**Review date:** 26 October 2026  
**Active criteria:** 45 (AC-01–33, AC-37–39, AC-41–47, AC-50–51)  
**Retired identifiers:** AC-34, AC-35, AC-36, AC-40, AC-48, AC-49 (reserved; TR/operational verification only)

## 1. Current status

Requirements v2.6 resolves the product choices that determine active AC outcomes. The inventory maps all 45 active criteria to 67 case IDs; two TR-30 public-query contract cases, six TR-31 database integration cases, and four TR-19 reaction cases remain separate from AC coverage. Phase 0 was approved on 26 October 2026. The current candidate has 67 primary and 27 supplemental AC scenarios and passes 316 tests, with 112 named AC semantic controls. The latest exact-commit hostile review of `afd3371913e44ee0cf8eeb8a61a7880c6fc57405` scored 97% accuracy and 99% completeness. Its AC-38 planned-status gap, stale status references, and obsolete SVG labels are corrected in the pending candidate; fresh review is required before Phase 1A. Run unchanged assertions against real product behavior as each increment is implemented; mock sensitivity does not establish application conformance.

No AC depends on deployed artifacts. Deployment, provisioning, environment topology, build gates, and deployed SWBOM checks are TR-only or operational evidence. Deployment execution and its tooling occur after coding Phases 1–6, in Phase 7; topology/account eligibility is assessed at Phase 7 entry. AC-39/41/42 are mockable document/archive contracts using local fixtures, and AC-37 is mockable application behavior. AC-38 is a traceability/process contract.

Lobby behavior is fixed: pre-countdown departure from a full room promotes the oldest observer into the last player position and compacts the remaining roster. After countdown begins, the roster is locked and no replacement occurs. If fewer than two original roster members remain at countdown expiry, start is aborted and the room closes. An exactly two-player holdout is retained after the five-second warning expires; the lobby waits until both players are ready. In rooms with more than two players, an expired unready holdout is removed and countdown begins. A 30-second unchanged lobby prompts all players once for that aggregate version.

## 2. Phase 0 closure and next gate

There are no unresolved product decisions affecting active AC expected outcomes. The user approved the v2.6 baseline, architecture, interfaces, and technical contracts in Phase 0. An earlier hostile review identified self-comparison and missing semantic-control defects; those were corrected in subsequent iterations with separate expected contracts and raw scripted observations. The latest review identified that AC-38 treated a planned test as mock-validated; the candidate now rejects planned records and empty active sets. Validate the corrected exact commit before Phase 1A; record mock-oracle validation separately from later real-SUT conformance.

| Approved Phase 0 decision | Recorded contract/design baseline | Related scope |
|---|---|---|
| Baseline and architecture ADR | Approved requirements v2.6, selected stack, DDD boundaries, dependency/license versions and pattern contracts. | AC-38/39; TR-26–31 |
| Application interfaces | Approved commands, queries, typed errors, event schemas/audiences, server-derived identity and role checks. | AC-01–33, AC-37–39, AC-43–47, AC-50–51 |
| Persistence and security | Approved logical schema, RLS, transaction/locking, idempotency, outbox, audit, retention and secret boundaries. | AC-28/37/45/47/50/51; TR-01–05/09/22/23/31 |
| Timer contract | Approved versioned durable deadline semantics and stale/duplicate delivery handling. Actual Free-plan platform availability is a post-coding Phase 7 TR integration check. | AC-30–33; TR-22 |
| Mock-oracle gate | 67 executable test oracles cover all 45 active ACs; each accepts a conforming scripted trace and rejects a violating mutation. Product behavior is verified separately as code is implemented. | All active ACs |
| Post-coding deployment planning | Keep Vercel, account, branch/project, provisioning, deployed build and operational SWBOM evidence outside AC coverage. | TR-20–29; AC-41/42 use only local fixtures |

## 3. Traceability and evidence gaps to close

| Requirement area | Current mapping | Implementation conformance check |
|---|---|---|
| Server authority, answers, privacy | AC-09, AC-28, AC-45; TR-01–05 | Run the existing adversarial payload oracles against real use cases and verify score, roster, category choice, results and event order. |
| Timing and concurrency | AC-10–14, AC-30–33, AC-51 | Run equal-time ordering and timer invalidation oracles with deterministic clocks/schedulers. Database locking/durability remains separate TR integration evidence. |
| Catalog and moderation | AC-16–19, AC-47 | Run the approved incomplete/unapproved content, nomination, reasoned moderation, appeal and audit oracles against the real implementation. |
| Identity | AC-20–21, AC-46 | Verify OIDC claim failures and same-device guest persistence against mocked providers and the real application adapter. Provider registration/entitlement remains external TR integration evidence, never an AC oracle. |
| Lobby and observers | AC-01–02, AC-22–33, AC-51 | Run existing invalid/expired code, reconnect, stale capacity, concurrent membership, observer promotion/compaction and locked-departure oracles against the real SUT. |
| Public landing | AC-43, AC-50 | Run allowlisted DTO assertions for leaderboard order/opt-out, lobby summaries, refresh cadence and versioned rules against the real projection. |
| Attribution and source release | AC-39, AC-41–42 | Run the temporary-manifest/archive oracles against local fixtures for notices, tracked source, SWBOM identity, GPL text and checksums. |
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

## 5. Current next actions

1. Preserve the 67 executable oracle cases and their traceability to all 45 active ACs.
2. Keep the test-execution receipt anchored to hashes, commands, and exact outputs.
3. Obtain exact-commit hostile review at 98% or higher accuracy and completeness before beginning Phase 1A.
4. During each implementation increment, run applicable oracles against real product behavior; report product conformance separately from mock-oracle sensitivity.
5. Keep real database/provider/deployment checks in separate TR integration or operations records; they cannot establish or substitute for AC coverage.

## 6. Review limits

This document reviews requirements completeness, consistency, feasibility and testability against v2.6. It does not claim test execution, external account entitlement, or deployment evidence. Planned IDs are not passing coverage.
