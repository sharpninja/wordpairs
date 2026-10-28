# TEST-MODERATIONANDCATALOGBOUNDARY-047 - AC-47: Moderation and catalog boundary

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-47: Moderation and catalog boundary. |
| QBrain reference/scope | `TEST-MODERATIONANDCATALOGBOUNDARY-047`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_nomination_flow.svg](../../../word_association_nomination_flow.svg); [word_association_category_suggestion.svg](../../../word_association_category_suggestion.svg); [admin_acl_design.md](../../../admin_acl_design.md) |
| Frame/element identifiers | SUG-FLOW, SUG-NODE-E, SUG-NODE-F, SUG-NODE-G, SUG-TRANS-D-E, SUG-TRANS-E-F, SUG-TRANS-F-G, SUG-TRANS-F-H, NOM-FLOW, NOM-NODE-F, NOM-NODE-G, NOM-NODE-H, NOM-TRANS-D-F, NOM-TRANS-F-G, NOM-TRANS-G-H, NOM-TRANS-G-I, SCREEN-NOMINATION, STATE-NOMINATION-01, STATE-NOMINATION-02, STATE-NOMINATION-03, STATE-NOMINATION-04, STATE-NOMINATION-05, STATE-NOMINATION-06, SCREEN-SUGGESTION, STATE-SUGGESTION-01, STATE-SUGGESTION-02, STATE-SUGGESTION-03, STATE-SUGGESTION-04, STATE-SUGGESTION-05, STATE-SUGGESTION-06, SCREEN-ADMIN, STATE-ADMIN-01, STATE-ADMIN-02, STATE-ADMIN-03, STATE-ADMIN-04, STATE-ADMIN-05; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-CATEGORYSUGGESTIONS-017#AC-47`; `FR-NOMINATIONS-016#AC-47` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Player Alice proposes content; independent moderator Bob and senior moderator Cara are available. |
| Test data | Pending nomination with 10 unique profiles; category suggestion with 3 pairs; reason Approved for fixture. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | As Alice attempt moderation or publication, then review as independent Bob. | Alice's changes are rejected; Bob's permitted reasoned decision is recorded in history. |
| 2 | Inspect future playability before complete curation and after approved complete publication. | Approval alone does not make incomplete content playable; only approved complete content reaches future rounds. |

## Scenario

```gherkin
Feature: AC-47: Moderation and catalog boundary
  Scenario: TEST-MODERATIONANDCATALOGBOUNDARY-047 design verification
    Given Player Alice proposes content; independent moderator Bob and senior moderator Cara are available.
    And the fixture data is Pending nomination with 10 unique profiles; category suggestion with 3 pairs; reason Approved for fixture.
    When As Alice attempt moderation or publication, then review as independent Bob.
    Then Alice's changes are rejected; Bob's permitted reasoned decision is recorded in history.
    When Inspect future playability before complete curation and after approved complete publication.
    Then Approval alone does not make incomplete content playable; only approved complete content reaches future rounds.
```

## Boundaries

Every count/decision/eligibility change needs audit verification; UI history covers visible consequences, not transaction atomicity.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
