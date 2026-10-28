# TEST-CONTENTVALIDATION-016 - AC-16: Content validation

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-16: Content validation. |
| QBrain reference/scope | `TEST-CONTENTVALIDATION-016`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_category_suggestion.svg](../../../word_association_category_suggestion.svg); [word_association_nomination_flow.svg](../../../word_association_nomination_flow.svg) |
| Frame/element identifiers | SUG-FLOW, SUG-NODE-H, SUG-NODE-I, SUG-TRANS-F-H, SUG-TRANS-H-I, NOM-FLOW, NOM-NODE-J, NOM-TRANS-I-J, ROUND-FLOW, ROUND-NODE-D, ROUND-TRANS-C-D, ROUND-TRANS-D-E, ROUND-TRANS-L-D, MSG-M14, MSG-M15, SCREEN-SUGGESTION, STATE-SUGGESTION-01, STATE-SUGGESTION-02, STATE-SUGGESTION-03, STATE-SUGGESTION-04, STATE-SUGGESTION-05, STATE-SUGGESTION-06, SCREEN-WORDS, STATE-WORDS-01, STATE-WORDS-02, STATE-WORDS-03, STATE-WORDS-04, STATE-WORDS-05; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-CATEGORIES-005#AC-16`; `FR-CATEGORIES-005#DEC-06`; `FR-CURATEDPAIRS-004#AC-16`; `FR-CURATEDPAIRS-004#DEC-05`; `TR-CATALOG-INTEGRITY-006#TR-06-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Authorized content editor has a complete draft pair in an approved category. |
| Test data | Prompt Hot; target Cold; hints H1/H2/H3; accepted alternative chilly; approved category/background. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Remove each required field in turn and try publishing the pair. | Incomplete pairs do not become playable; validation identifies the missing field. |
| 2 | Restore all required fields and complete the approved publishing path. | The catalog includes a complete pair with the three hints in order and its category background. |
| 3 | Inspect the initial approved catalog and use a controlled two-eligible-pair category pool in an eight-round match. | Each initial category has ten complete seeded pairs; a pair is not repeated until all currently eligible pairs in that category have appeared, then that pool can reshuffle. |
| 4 | Inspect Colors pair relationships using approved complementary-color fixtures. | Every Colors pair follows its approved complementary-color relationship; arbitrary unapproved color targets are not generated. |

## Scenario

```gherkin
Feature: AC-16: Content validation
  Scenario: TEST-CONTENTVALIDATION-016 design verification
    Given Authorized content editor has a complete draft pair in an approved category.
    And the fixture data is Prompt Hot; target Cold; hints H1/H2/H3; accepted alternative chilly; approved category/background.
    When Remove each required field in turn and try publishing the pair.
    Then Incomplete pairs do not become playable; validation identifies the missing field.
    When Restore all required fields and complete the approved publishing path.
    Then The catalog includes a complete pair with the three hints in order and its category background.
    When Inspect the initial approved catalog and use a controlled two-eligible-pair category pool in an eight-round match.
    Then Each initial category has ten complete seeded pairs; a pair is not repeated until all currently eligible pairs in that category have appeared, then that pool can reshuffle.
    When Inspect Colors pair relationships using approved complementary-color fixtures.
    Then Every Colors pair follows its approved complementary-color relationship; arbitrary unapproved color targets are not generated.
```

## Boundaries

Exact validation copy is not specified; assert identified field and unchanged playability, not invented wording.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
