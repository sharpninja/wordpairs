# TEST-ROOMINVITATIONS-025 - AC-25: Room invitations

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-25: Room invitations. |
| QBrain reference/scope | `TEST-ROOMINVITATIONS-025`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_room_creation.svg](../../../word_association_room_creation.svg) |
| Frame/element identifiers | ROOM-FLOW, ROOM-NODE-C, ROOM-NODE-G, ROOM-TRANS-C-D, ROOM-TRANS-B-G, ROOM-TRANS-G-D, MSG-M01, MSG-M02, SCREEN-JOIN, STATE-JOIN-01, STATE-JOIN-02, STATE-JOIN-03, STATE-JOIN-04, STATE-JOIN-05; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYDISCOVERY-019#AC-25`; `FR-LOBBYLIFECYCLE-003#AC-25`; `FR-ROOMACCESS-001#AC-25` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice is already a player in an active room; Bob and Cara have independent profiles. |
| Test data | The room's generated code and inviter-bound signed deep link. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | As Alice share the code to Bob and link to Cara. | Both invitation forms refer to Alice's intended room. |
| 2 | Join as Bob by code and Cara by link when seats are open. | Both enter that same room subject to its configured capacity. |

## Scenario

```gherkin
Feature: AC-25: Room invitations
  Scenario: TEST-ROOMINVITATIONS-025 design verification
    Given Alice is already a player in an active room; Bob and Cara have independent profiles.
    And the fixture data is The room's generated code and inviter-bound signed deep link.
    When As Alice share the code to Bob and link to Cara.
    Then Both invitation forms refer to Alice's intended room.
    When Join as Bob by code and Cara by link when seats are open.
    Then Both enter that same room subject to its configured capacity.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
