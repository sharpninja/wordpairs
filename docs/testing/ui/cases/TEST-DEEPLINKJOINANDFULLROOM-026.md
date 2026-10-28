# TEST-DEEPLINKJOINANDFULLROOM-026 - AC-26: Deep-link join and full room

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-26: Deep-link join and full room. |
| QBrain reference/scope | `TEST-DEEPLINKJOINANDFULLROOM-026`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_room_creation.svg](../../../word_association_room_creation.svg) |
| Frame/element identifiers | ROOM-FLOW, ROOM-NODE-C, ROOM-NODE-H, ROOM-TRANS-C-D, ROOM-TRANS-D-H, ROOM-TRANS-H-I, ROOM-TRANS-H-F, SCREEN-JOIN, STATE-JOIN-01, STATE-JOIN-02, STATE-JOIN-03, STATE-JOIN-04, STATE-JOIN-05; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYDISCOVERY-019#AC-26`; `FR-LOBBYLIFECYCLE-003#AC-26`; `FR-ROOMACCESS-001#AC-26` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice has a valid signed room invitation; one fixture has a seat, another is full. |
| Test data | Invited guest Bob; same room deep-link destination. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Open the invitation in each fixture. | It bypasses discovery and checks the intended room directly. |
| 2 | Join the open fixture and inspect the full fixture. | Open fixture admits Bob as a player; full fixture offers observer mode without silently adding a player. |

## Scenario

```gherkin
Feature: AC-26: Deep-link join and full room
  Scenario: TEST-DEEPLINKJOINANDFULLROOM-026 design verification
    Given Alice has a valid signed room invitation; one fixture has a seat, another is full.
    And the fixture data is Invited guest Bob; same room deep-link destination.
    When Open the invitation in each fixture.
    Then It bypasses discovery and checks the intended room directly.
    When Join the open fixture and inspect the full fixture.
    Then Open fixture admits Bob as a player; full fixture offers observer mode without silently adding a player.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
