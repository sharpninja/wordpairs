# TEST-FINALSTANDINGS-013 - AC-13: Final standings

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-13: Final standings. |
| QBrain reference/scope | `TEST-FINALSTANDINGS-013`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-K, ROUND-NODE-M, ROUND-TRANS-J-K, ROUND-TRANS-K-L, ROUND-TRANS-K-M, SCREEN-FINAL, STATE-FINAL-01, STATE-FINAL-02, STATE-FINAL-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ANSWERSTAGES-008#DEC-01`; `FR-FINALSTANDINGS-014#AC-13`; `FR-FINALSTANDINGS-014#DEC-01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Eight-round fixture has known totals and round eight is active. |
| Test data | Final totals Alice 24, Bob 20, Cara 12. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Finish round eight. | Final standings appear rather than a ninth round. |
| 2 | Read the ranking. | Alice ranks first with 24, Bob second with 20, Cara third with 12. |

## Scenario

```gherkin
Feature: AC-13: Final standings
  Scenario: TEST-FINALSTANDINGS-013 design verification
    Given Eight-round fixture has known totals and round eight is active.
    And the fixture data is Final totals Alice 24, Bob 20, Cara 12.
    When Finish round eight.
    Then Final standings appear rather than a ninth round.
    When Read the ranking.
    Then Alice ranks first with 24, Bob second with 20, Cara third with 12.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
