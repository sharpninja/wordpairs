# TEST-HOLDOUTWARNINGANDREMOVAL-032 - AC-32: Holdout warning and removal

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-32: Holdout warning and removal. |
| QBrain reference/scope | `TEST-HOLDOUTWARNINGANDREMOVAL-032`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg); [word_association_game_requirements.md](../../../word_association_game_requirements.md) |
| Frame/element identifiers | SCREEN-LOBBY, STATE-LOBBY-01, STATE-LOBBY-02, STATE-LOBBY-03, STATE-LOBBY-04, STATE-LOBBY-05, STATE-LOBBY-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYDISCOVERY-019#AC-32`; `FR-LOBBYLIFECYCLE-003#AC-32` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Independent waiting-room fixtures have either two or three players with all but Bob ready. |
| Test data | 5-second holdout warning; Bob remains unready or becomes ready before expiry. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Observe Bob's warning and mark him ready before it expires in one run. | Countdown starts immediately when Bob becomes ready. |
| 2 | Let warning expire without readiness in three-player and two-player runs. | Three-player run removes Bob and starts locked countdown; two-player run retains Bob and waits for both players. |

## Scenario

```gherkin
Feature: AC-32: Holdout warning and removal
  Scenario: TEST-HOLDOUTWARNINGANDREMOVAL-032 design verification
    Given Independent waiting-room fixtures have either two or three players with all but Bob ready.
    And the fixture data is 5-second holdout warning; Bob remains unready or becomes ready before expiry.
    When Observe Bob's warning and mark him ready before it expires in one run.
    Then Countdown starts immediately when Bob becomes ready.
    When Let warning expire without readiness in three-player and two-player runs.
    Then Three-player run removes Bob and starts locked countdown; two-player run retains Bob and waits for both players.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
