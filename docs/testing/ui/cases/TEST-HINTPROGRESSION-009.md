# TEST-HINTPROGRESSION-009 - AC-09: Hint progression

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-09: Hint progression. |
| QBrain reference/scope | `TEST-HINTPROGRESSION-009`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg); [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-H, ROUND-NODE-I, ROUND-TRANS-G-H, ROUND-TRANS-H-I, ROUND-TRANS-I-F, ROUND-TRANS-H-J, MSG-M30, MSG-M31, MSG-M32, MSG-FLOW, SCREEN-ROUND, STATE-ROUND-01, STATE-ROUND-02, STATE-ROUND-03, STATE-ROUND-04, STATE-ROUND-05, STATE-ROUND-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ANSWERSTAGES-008#AC-09`; `TR-ANSWER-CONFIDENTIALITY-005#TR-05-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice, Bob and Cara start unsolved; Alice then solves while Bob and Cara do not. |
| Test data | Target Cold; Bob wrong answer Warm; Cara unanswered until stage closure. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Submit Warm as Bob while Cara has not submitted. | The current stage remains open until all unsolved players submit or its 20-second deadline. |
| 2 | Submit an incorrect answer as Cara, then observe all three clients. | Bob and Cara receive the next ordered hint; solved Alice receives no later hint or answer control. |

## Scenario

```gherkin
Feature: AC-09: Hint progression
  Scenario: TEST-HINTPROGRESSION-009 design verification
    Given Alice, Bob and Cara start unsolved; Alice then solves while Bob and Cara do not.
    And the fixture data is Target Cold; Bob wrong answer Warm; Cara unanswered until stage closure.
    When Submit Warm as Bob while Cara has not submitted.
    Then The current stage remains open until all unsolved players submit or its 20-second deadline.
    When Submit an incorrect answer as Cara, then observe all three clients.
    Then Bob and Cara receive the next ordered hint; solved Alice receives no later hint or answer control.
```

## Boundaries

Repeat through Hints 1..3, plus a no-response branch where the server deadline closes the stage.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
