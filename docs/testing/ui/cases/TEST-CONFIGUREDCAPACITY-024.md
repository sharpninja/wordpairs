# TEST-CONFIGUREDCAPACITY-024 - AC-24: Configured capacity

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-24: Configured capacity. |
| QBrain reference/scope | `TEST-CONFIGUREDCAPACITY-024`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_room_creation.svg](../../../word_association_room_creation.svg) |
| Frame/element identifiers | ROOM-FLOW, ROOM-NODE-A, ROOM-NODE-B, ROOM-TRANS-A-B, ROOM-TRANS-B-G, MSG-M01, MSG-M02, SCREEN-CREATE, STATE-CREATE-01; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYLIFECYCLE-003#AC-24`; `FR-ROOMACCESS-001#AC-24` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | An identified player can create a room. |
| Test data | Capacity inputs 1, 2, 8, 25, 26. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Try creating rooms with capacities 1 and 26. | Both invalid capacities are rejected; no invalid room is created. |
| 2 | Create separate rooms with 2, 8 and 25. | Each room stores and displays exactly its selected limit and correct open slots. |

## Scenario

```gherkin
Feature: AC-24: Configured capacity
  Scenario: TEST-CONFIGUREDCAPACITY-024 design verification
    Given An identified player can create a room.
    And the fixture data is Capacity inputs 1, 2, 8, 25, 26.
    When Try creating rooms with capacities 1 and 26.
    Then Both invalid capacities are rejected; no invalid room is created.
    When Create separate rooms with 2, 8 and 25.
    Then Each room stores and displays exactly its selected limit and correct open slots.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
