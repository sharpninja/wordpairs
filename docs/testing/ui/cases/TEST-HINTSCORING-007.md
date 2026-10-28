# TEST-HINTSCORING-007 - AC-07: Hint scoring

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-07: Hint scoring. |
| QBrain reference/scope | `TEST-HINTSCORING-007`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-F, ROUND-NODE-G, ROUND-NODE-I, ROUND-TRANS-E-F, ROUND-TRANS-F-G, ROUND-TRANS-G-H, ROUND-TRANS-H-I, ROUND-TRANS-I-F, MSG-M26, SCREEN-ROUND, STATE-ROUND-01, STATE-ROUND-02, STATE-ROUND-03, STATE-ROUND-04, STATE-ROUND-05, STATE-ROUND-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ANSWERSTAGES-008#AC-07`; `FR-SCORELOCK-010#AC-07`; `FR-SCORING-009#AC-07` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice remains unsolved until the specified hint stage in independent round fixtures. |
| Test data | Examples: Hint 1 → 3 points; Hint 2 → 2; Hint 3 → 1; target Cold. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Advance the fixture to the selected visible hint stage and submit Cold as Alice. | Alice receives exactly the example's points: 3, 2 or 1. |
| 2 | Observe Alice through later stage transitions. | Her points stay locked and later hints are not offered to her. |

## Scenario

```gherkin
Feature: AC-07: Hint scoring
  Scenario: TEST-HINTSCORING-007 design verification
    Given Alice remains unsolved until the specified hint stage in independent round fixtures.
    And the fixture data is Examples: Hint 1 → 3 points; Hint 2 → 2; Hint 3 → 1; target Cold.
    When Advance the fixture to the selected visible hint stage and submit Cold as Alice.
    Then Alice receives exactly the example's points: 3, 2 or 1.
    When Observe Alice through later stage transitions.
    Then Her points stay locked and later hints are not offered to her.
```

## Boundaries

Execute one independent scenario per hint-stage/points pair; use condition-based stage synchronization.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
