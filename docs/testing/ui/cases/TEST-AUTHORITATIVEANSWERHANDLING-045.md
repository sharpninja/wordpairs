# TEST-AUTHORITATIVEANSWERHANDLING-045 - AC-45: Authoritative answer handling

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-45: Authoritative answer handling. |
| QBrain reference/scope | `TEST-AUTHORITATIVEANSWERHANDLING-045`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg); [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-E, ROUND-NODE-F, ROUND-TRANS-D-E, ROUND-TRANS-E-F, ROUND-TRANS-F-G, ROUND-TRANS-I-F, MSG-M14, MSG-M15, MSG-M16, MSG-M17, MSG-M18, MSG-M23, MSG-M24, MSG-M25, MSG-FLOW, SCREEN-ROUND, STATE-ROUND-01, STATE-ROUND-02, STATE-ROUND-03, STATE-ROUND-04, STATE-ROUND-05, STATE-ROUND-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ANSWERREVEAL-012#AC-45`; `FR-ANSWERSTAGES-008#AC-45`; `FR-SCORELOCK-010#AC-45`; `TR-ANSWER-CONFIDENTIALITY-005#TR-05-C01`; `TR-ANSWER-VALIDATION-004#DEC-03` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice is unsolved with one permitted answer per stage and Bob watches another client. |
| Test data | Target Cold; accepted alternative chilly; inputs "  COLD  ", "chilly", "Cold!", "warm" in independent stages. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Submit each input in independent fixtures. | Normalized canonical and listed alternative score once; punctuation-modified Cold! and warm do not score. |
| 2 | Inspect Bob's view before reveal and attempt a second same-stage submission. | Bob sees no guess text or unrevealed target; a second submission cannot award additional points. |

## Scenario

```gherkin
Feature: AC-45: Authoritative answer handling
  Scenario: TEST-AUTHORITATIVEANSWERHANDLING-045 design verification
    Given Alice is unsolved with one permitted answer per stage and Bob watches another client.
    And the fixture data is Target Cold; accepted alternative chilly; inputs "  COLD  ", "chilly", "Cold!", "warm" in independent stages.
    When Submit each input in independent fixtures.
    Then Normalized canonical and listed alternative score once; punctuation-modified Cold! and warm do not score.
    When Inspect Bob's view before reveal and attempt a second same-stage submission.
    Then Bob sees no guess text or unrevealed target; a second submission cannot award additional points.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
