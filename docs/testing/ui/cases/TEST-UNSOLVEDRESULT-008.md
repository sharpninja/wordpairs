# TEST-UNSOLVEDRESULT-008 - AC-08: Unsolved result

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-08: Unsolved result. |
| QBrain reference/scope | `TEST-UNSOLVEDRESULT-008`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-H, ROUND-NODE-J, ROUND-TRANS-G-H, ROUND-TRANS-H-I, ROUND-TRANS-H-J, ROUND-TRANS-J-K, MSG-M33, MSG-M34, MSG-M35, SCREEN-SUMMARY, STATE-SUMMARY-01, STATE-SUMMARY-02, STATE-SUMMARY-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ANSWERREVEAL-012#AC-08`; `FR-ANSWERSTAGES-008#AC-08`; `FR-SCORING-009#AC-08` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice remains unsolved at Hint 3 and Bob has already solved. |
| Test data | Target Cold; Alice either submits wrong or gives no answer through the final deadline. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Submit an incorrect final-stage answer, or await the authoritative final deadline without answering. | The round ends and reveals Cold. |
| 2 | Inspect Alice's round summary. | Alice receives 0 points for the round. |

## Scenario

```gherkin
Feature: AC-08: Unsolved result
  Scenario: TEST-UNSOLVEDRESULT-008 design verification
    Given Alice remains unsolved at Hint 3 and Bob has already solved.
    And the fixture data is Target Cold; Alice either submits wrong or gives no answer through the final deadline.
    When Submit an incorrect final-stage answer, or await the authoritative final deadline without answering.
    Then The round ends and reveals Cold.
    When Inspect Alice's round summary.
    Then Alice receives 0 points for the round.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
