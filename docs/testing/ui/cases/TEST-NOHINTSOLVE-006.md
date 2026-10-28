# TEST-NOHINTSOLVE-006 - AC-06: No-hint solve

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-06: No-hint solve. |
| QBrain reference/scope | `TEST-NOHINTSOLVE-006`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-E, ROUND-NODE-F, ROUND-NODE-G, ROUND-TRANS-D-E, ROUND-TRANS-E-F, ROUND-TRANS-F-G, ROUND-TRANS-G-H, ROUND-TRANS-I-F, MSG-M26, SCREEN-ROUND, STATE-ROUND-01, STATE-ROUND-02, STATE-ROUND-03, STATE-ROUND-04, STATE-ROUND-05, STATE-ROUND-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ANSWERSTAGES-008#AC-06`; `FR-SCORELOCK-010#AC-06`; `FR-SCORING-009#AC-06` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice is unsolved in the no-hint stage; Bob keeps the round open. |
| Test data | Prompt Hot, target Cold, initial Alice round points 0. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | As Alice enter Cold and submit before any hint. | Alice receives exactly 5 round points and her score is locked. |
| 2 | Attempt another answer during that round. | Alice has no further answer opportunity and her round points remain 5. |

## Scenario

```gherkin
Feature: AC-06: No-hint solve
  Scenario: TEST-NOHINTSOLVE-006 design verification
    Given Alice is unsolved in the no-hint stage; Bob keeps the round open.
    And the fixture data is Prompt Hot, target Cold, initial Alice round points 0.
    When As Alice enter Cold and submit before any hint.
    Then Alice receives exactly 5 round points and her score is locked.
    When Attempt another answer during that round.
    Then Alice has no further answer opportunity and her round points remain 5.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
