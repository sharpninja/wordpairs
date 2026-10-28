# TEST-SUGGESTIONREVIEW-115 - Verify TR-15: Category suggestion eligibility and review

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify Verify TR-15: Category suggestion eligibility and review. |
| QBrain reference/scope | `TEST-SUGGESTIONREVIEW-115`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_category_suggestion.svg](../../../word_association_category_suggestion.svg) |
| Frame/element identifiers | SUG-FLOW, SUG-NODE-E, SUG-NODE-F, SUG-NODE-G, SUG-NODE-H, SUG-NODE-I, SUG-TRANS-D-E, SUG-TRANS-E-F, SUG-TRANS-F-G, SUG-TRANS-F-H, SUG-TRANS-H-I, SCREEN-SUGGESTION, STATE-SUGGESTION-01, STATE-SUGGESTION-02, STATE-SUGGESTION-03, STATE-SUGGESTION-04, STATE-SUGGESTION-05, STATE-SUGGESTION-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-CATEGORYSUGGESTIONS-017#DEC-08`; `FR-NOMINATIONS-016#DEC-08`; `TR-NOMINATION-MODERATION-014#DEC-08`; `TR-SUGGESTION-REVIEW-015#DEC-08`; `TR-SUGGESTION-REVIEW-015#TR-15-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Bob has 10 lifetime wins, one open three-pair suggestion and no independent review yet. |
| Test data | Category Space with exactly 3 pairs; independent moderator Alice; one appeal to senior Cara. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Try opening another suggestion, then independently review the existing submission with a reason. | Only one suggestion remains open and the reasoned independent decision is recorded. |
| 2 | For a rejected example appeal once; for approved example complete required curation before activation. | Only permitted independent senior resolution succeeds; approved incomplete pairs are never playable. |

## Scenario

```gherkin
Feature: Verify TR-15: Category suggestion eligibility and review
  Scenario: TEST-SUGGESTIONREVIEW-115 design verification
    Given Bob has 10 lifetime wins, one open three-pair suggestion and no independent review yet.
    And the fixture data is Category Space with exactly 3 pairs; independent moderator Alice; one appeal to senior Cara.
    When Try opening another suggestion, then independently review the existing submission with a reason.
    Then Only one suggestion remains open and the reasoned independent decision is recorded.
    When For a rejected example appeal once; for approved example complete required curation before activation.
    Then Only permitted independent senior resolution succeeds; approved incomplete pairs are never playable.
```

## Boundaries

The diagram's "request changes" action lacks a defined resubmission/status contract: Q-MOD-01 remains blocked.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
