# TEST-ROOMSYNC-139 - Real browser multiplayer, private push and recovery integration

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify Real browser multiplayer, private push and recovery integration. |
| QBrain reference/scope | `TEST-ROOMSYNC-139`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg); [room_sync_fix.md](../../../room_sync_fix.md) |
| Frame/element identifiers | MSG-M03, MSG-M04, MSG-M05, MSG-M27, MSG-M28, MSG-M29, MSG-FLOW, SCREEN-ROUND, STATE-ROUND-01, STATE-ROUND-02, STATE-ROUND-03, STATE-ROUND-04, STATE-ROUND-05, STATE-ROUND-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `TR-ROOM-SYNCRECOVERY-038#LIVE-02`; `TR-ROOM-SYNCRECOVERY-038#LIVE-03`; `TR-ROOM-SYNCRECOVERY-038#LIVE-07` |
| Priority | critical |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Actual isolated TLS runtime has database, private notifications and autonomous deadline worker; separate UI contexts have real guest identities. |
| Test data | Player counts every integer 2..25; one inviter-bound observer; controlled pairs Hot/Cold, Up/Down, Left/Right, In/Out, Day/Night, Open/Closed, Big/Small, Fast/Slow; all no-hint correct solves yield 5 per round and 40 per player. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Partial: full actual-runtime UI fixture, seed control and independent observer are required; current execution state remains the existing QBrain in_progress record. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Join by UI room code and ready each player without manual refresh, with periodic application refresh suppressed. | All clients see the same roster, countdown and category chooser through actual private updates. |
| 2 | Select category and submit answers through UI for eight rounds; observe hints, scorecard, reactions and summaries from remote clients. | All clients converge on authorized state and identical final ranking; accepted UI solves correspond to expected round points. |
| 3 | Repeat each player count and perform offline/reconnect, token-renewal and socket-recovery variants. | Autonomous progression and authorized recovery work; no polling-only pass or service-only result is accepted. |

## Scenario

```gherkin
Feature: Real browser multiplayer, private push and recovery integration
  Scenario: TEST-ROOMSYNC-139 design verification
    Given Actual isolated TLS runtime has database, private notifications and autonomous deadline worker; separate UI contexts have real guest identities.
    And the fixture data is Player counts every integer 2..25; one inviter-bound observer; controlled pairs Hot/Cold, Up/Down, Left/Right, In/Out, Day/Night, Open/Closed, Big/Small, Fast/Slow; all no-hint correct solves yield 5 per round and 40 per player.
    When Join by UI room code and ready each player without manual refresh, with periodic application refresh suppressed.
    Then All clients see the same roster, countdown and category chooser through actual private updates.
    When Select category and submit answers through UI for eight rounds; observe hints, scorecard, reactions and summaries from remote clients.
    Then All clients converge on authorized state and identical final ranking; accepted UI solves correspond to expected round points.
    When Repeat each player count and perform offline/reconnect, token-renewal and socket-recovery variants.
    Then Autonomous progression and authorized recovery work; no polling-only pass or service-only result is accepted.
```

## Boundaries

This documents the outstanding matrix obligation; it does not claim that all counts passed. Private-frame privacy and worker ownership/fault contracts remain separate LIVE criteria.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
