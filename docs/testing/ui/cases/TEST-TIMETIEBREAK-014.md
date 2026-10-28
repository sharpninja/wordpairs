# TEST-TIMETIEBREAK-014 - AC-14: Time tiebreak

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-14: Time tiebreak. |
| QBrain reference/scope | `TEST-TIMETIEBREAK-014`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-M, ROUND-TRANS-K-M, SCREEN-FINAL, STATE-FINAL-01, STATE-FINAL-02, STATE-FINAL-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-FINALSTANDINGS-014#AC-14`; `FR-FINALSTANDINGS-014#DEC-04`; `FR-SCORELOCK-010#AC-14`; `FR-SCORING-009#AC-14` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Eight-round game has tied highest scores and controlled solve durations. |
| Test data | Alice and Bob 20 points; Alice accepted solve total 30 seconds plus one unsolved round =110; Bob accepted solve total 115 and no unsolved rounds. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Complete round eight and inspect final standings. | Alice ranks above Bob because 110 < 115, including Alice's 80-second unsolved charge. |
| 2 | Repeat with both tied score and exactly equal total answer time. | Alice and Bob share the same rank. |

## Scenario

```gherkin
Feature: AC-14: Time tiebreak
  Scenario: TEST-TIMETIEBREAK-014 design verification
    Given Eight-round game has tied highest scores and controlled solve durations.
    And the fixture data is Alice and Bob 20 points; Alice accepted solve total 30 seconds plus one unsolved round =110; Bob accepted solve total 115 and no unsolved rounds.
    When Complete round eight and inspect final standings.
    Then Alice ranks above Bob because 110 < 115, including Alice's 80-second unsolved charge.
    When Repeat with both tied score and exactly equal total answer time.
    Then Alice and Bob share the same rank.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
