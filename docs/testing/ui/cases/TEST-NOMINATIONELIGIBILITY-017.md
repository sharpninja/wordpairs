# TEST-NOMINATIONELIGIBILITY-017 - AC-17: Nomination eligibility

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-17: Nomination eligibility. |
| QBrain reference/scope | `TEST-NOMINATIONELIGIBILITY-017`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_nomination_flow.svg](../../../word_association_nomination_flow.svg) |
| Frame/element identifiers | NOM-FLOW, NOM-NODE-A, NOM-NODE-B, NOM-TRANS-A-B, NOM-TRANS-B-C, SCREEN-NOMINATION, STATE-NOMINATION-01, STATE-NOMINATION-02, STATE-NOMINATION-03, STATE-NOMINATION-04, STATE-NOMINATION-05, STATE-NOMINATION-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-NOMINATIONS-016#AC-17` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice solves with no hint; Bob solves after Hint 1 in the same round. |
| Test data | Candidate Moon; Alice no-hint 5 points, Bob Hint-1 3 points. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Open round results as Alice and Bob. | Alice can submit a nomination from this solve; Bob cannot nominate from his hinted solve. |
| 2 | Nominate Moon as Alice. | The candidate is recorded without altering the round score or progression. |

## Scenario

```gherkin
Feature: AC-17: Nomination eligibility
  Scenario: TEST-NOMINATIONELIGIBILITY-017 design verification
    Given Alice solves with no hint; Bob solves after Hint 1 in the same round.
    And the fixture data is Candidate Moon; Alice no-hint 5 points, Bob Hint-1 3 points.
    When Open round results as Alice and Bob.
    Then Alice can submit a nomination from this solve; Bob cannot nominate from his hinted solve.
    When Nominate Moon as Alice.
    Then The candidate is recorded without altering the round score or progression.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
