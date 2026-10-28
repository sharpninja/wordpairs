# TEST-CATEGORYSUGGESTIONUNLOCK-019 - AC-19: Category suggestion unlock

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-19: Category suggestion unlock. |
| QBrain reference/scope | `TEST-CATEGORYSUGGESTIONUNLOCK-019`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_category_suggestion.svg](../../../word_association_category_suggestion.svg) |
| Frame/element identifiers | SUG-FLOW, SUG-NODE-A, SUG-NODE-B, SUG-NODE-C, SUG-NODE-D, SUG-TRANS-A-B, SUG-TRANS-B-C, SUG-TRANS-C-D, SUG-TRANS-D-E, SCREEN-SUGGESTION, STATE-SUGGESTION-01, STATE-SUGGESTION-02, STATE-SUGGESTION-03, STATE-SUGGESTION-04, STATE-SUGGESTION-05, STATE-SUGGESTION-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-CATEGORYSUGGESTIONS-017#AC-19`; `FR-CATEGORYSUGGESTIONS-017#DEC-09` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Profiles have controlled lifetime win totals; no open suggestion initially. |
| Test data | Alice 9 wins; Bob 10; Bob proposes Space with exactly three complete pair suggestions. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Open category suggestions as Alice and Bob. | Alice cannot submit; Bob can submit one category with exactly three pairs. |
| 2 | As Bob try two and four pairs, then exactly three; try opening a second suggestion. | Only exactly three is accepted and a second open suggestion is rejected. |
| 3 | Observe submitted content before approval and complete curation. | The submission is in review and not playable. |

## Scenario

```gherkin
Feature: AC-19: Category suggestion unlock
  Scenario: TEST-CATEGORYSUGGESTIONUNLOCK-019 design verification
    Given Profiles have controlled lifetime win totals; no open suggestion initially.
    And the fixture data is Alice 9 wins; Bob 10; Bob proposes Space with exactly three complete pair suggestions.
    When Open category suggestions as Alice and Bob.
    Then Alice cannot submit; Bob can submit one category with exactly three pairs.
    When As Bob try two and four pairs, then exactly three; try opening a second suggestion.
    Then Only exactly three is accepted and a second open suggestion is rejected.
    When Observe submitted content before approval and complete curation.
    Then The submission is in review and not playable.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
