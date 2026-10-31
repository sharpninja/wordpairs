# TEST-ROOMSYNC-139 - Real browser multiplayer, private push and recovery integration

Current amendment persistence: [19-record QBrain readback](../../../evidence/release10/qbrain-update-receipt.json) confirms the current cap10 requirement amendment, stable IDs/native mappings and 28 changed criteria still unsatisfied. Original design provenance, case synchronization receipts, v2.7 before copies and execution history remain retained; current case/export reconciliation and exact-source execution are separate obligations. `CAP15-LEGACY` retains its historical ID with current10-player text. Documentation does not satisfy criteria or establish a passing game.

Current rules v2.8 amendment (31 October 2026): new games use every count 2 through 10. The full matrix is 9 games, 54 player participations and 432 accepted round solves. The separate observer limit remains 25 and the new-release audience is at most 35. Original design/receipt provenance remains historical; [the completion plan](../../../release15-completion-plan.md) governs fresh evidence.

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify Real browser multiplayer, private push and recovery integration. |
| QBrain reference/scope | `TEST-ROOMSYNC-139`; Word Pairs / `PROD-WORDPAIRS`; workspace `<home>/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg); [room_sync_fix.md](../../../room_sync_fix.md) |
| Frame/element identifiers | MSG-M03, MSG-M04, MSG-M05, MSG-M27, MSG-M28, MSG-M29, MSG-FLOW, SCREEN-ROUND, STATE-ROUND-01, STATE-ROUND-02, STATE-ROUND-03, STATE-ROUND-04, STATE-ROUND-05, STATE-ROUND-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `TR-ROOM-SYNCRECOVERY-038#LIVE-02`; `TR-ROOM-SYNCRECOVERY-038#LIVE-03`; `TR-ROOM-SYNCRECOVERY-038#LIVE-07` |
| Priority | critical |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Actual isolated TLS runtime has database, private notifications and autonomous deadline worker; separate UI contexts have real guest identities. |
| Test data | Every player count 2 through 10 for the matrix; two players plus one inviter-bound observer for the separate strict-push journey; controlled pairs Hot/Cold, Up/Down, Left/Right, In/Out, Day/Night, Open/Closed, Big/Small, Fast/Slow; no-hint correct solves yield 5 per round and 40 per player. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Partial: full actual-runtime UI fixture, seed control and independent observer are required; current execution state remains the existing QBrain in_progress record. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Arrange independent matrix identities/membership using real APIs, then ready every player through browser controls without manual refresh. In the separate strict-push journey, join by UI room code and suppress periodic UI reads. | All expected players see the same roster, countdown and category chooser; the strict journey correlates actual private notifications with authorized reads. |
| 2 | Select category and submit answers through UI for eight rounds; observe hints, scorecard, reactions and summaries from remote clients. | All clients converge on authorized state and identical final ranking; accepted UI solves correspond to expected round points. |
| 3 | Complete all 9 matrix games with at most two simultaneous answer UIs, and separately run strict observer/offline/reconnect/token-renewal/socket-recovery variants. | Matrix reports record eight rounds per game, 54 participations and 432 accepted UI solves with matching final rankings and truthful cleanup; strict observations prove autonomous progression and private recovery without periodic-read substitution. |

## Scenario

```gherkin
Feature: Real browser multiplayer, private push and recovery integration
  Scenario: TEST-ROOMSYNC-139 design verification
    Given Actual isolated TLS runtime has database, private notifications and autonomous deadline worker; separate UI contexts have real guest identities.
    And the matrix contains every player count 2 through 10
    And the separate strict-push game has two players and an inviter-bound observer
    When I arrange matrix membership through real APIs and ready every player through the UI
    Then all expected players see the same roster, countdown and category chooser
    When Select category and submit answers through UI for eight rounds; observe hints, scorecard, reactions and summaries from remote clients.
    Then All clients converge on authorized state and identical final ranking; accepted UI solves correspond to expected round points.
    When I complete all 9 matrix games with at most two simultaneous answer UIs
    Then 54 player participations produce 432 accepted UI solves and matching rankings
    When I run the strict observer game with periodic UI reads suppressed
    Then actual private notifications cause authorized state updates
    And autonomous deadlines, reconnect and token renewal remain observable
```

## Boundaries

This documents the current matrix obligation, not a claim that all counts passed. Preserve the older 2 through 25 attempts with their original source and outcomes. The 29 October 15-player dirty-build pass is historical until the changed committed candidate is rerun. Private-frame privacy, maximum observer audience, legacy-match compatibility and worker ownership/fault contracts retain their separately mapped criteria.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
