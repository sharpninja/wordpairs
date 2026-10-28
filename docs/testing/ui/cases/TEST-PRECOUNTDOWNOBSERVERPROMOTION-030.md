# TEST-PRECOUNTDOWNOBSERVERPROMOTION-030 - AC-30: Pre-countdown observer promotion

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-30: Pre-countdown observer promotion. |
| QBrain reference/scope | `TEST-PRECOUNTDOWNOBSERVERPROMOTION-030`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_room_creation.svg](../../../word_association_room_creation.svg); [word_association_game_requirements.md](../../../word_association_game_requirements.md) |
| Frame/element identifiers | SCREEN-LOBBY, STATE-LOBBY-01, STATE-LOBBY-02, STATE-LOBBY-03, STATE-LOBBY-04, STATE-LOBBY-05, STATE-LOBBY-06, SCREEN-OBSERVER, STATE-OBSERVER-01, STATE-OBSERVER-02, STATE-OBSERVER-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYDISCOVERY-019#AC-30`; `FR-LOBBYLIFECYCLE-003#AC-30`; `FR-OBSERVERS-020#AC-30` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Full waiting roster Alice, Bob, Cara; observers Eve then Finn; countdown not started. |
| Test data | Observer arrival order Eve older; equal-arrival variant resolves by stable profile ID. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Have Bob leave before countdown. | Remaining players Alice/Cara keep relative order; Eve is promoted to the last player position. |
| 2 | Inspect observers. | Finn remains an observer; player capacity is not exceeded. |

## Scenario

```gherkin
Feature: AC-30: Pre-countdown observer promotion
  Scenario: TEST-PRECOUNTDOWNOBSERVERPROMOTION-030 design verification
    Given Full waiting roster Alice, Bob, Cara; observers Eve then Finn; countdown not started.
    And the fixture data is Observer arrival order Eve older; equal-arrival variant resolves by stable profile ID.
    When Have Bob leave before countdown.
    Then Remaining players Alice/Cara keep relative order; Eve is promoted to the last player position.
    When Inspect observers.
    Then Finn remains an observer; player capacity is not exceeded.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
