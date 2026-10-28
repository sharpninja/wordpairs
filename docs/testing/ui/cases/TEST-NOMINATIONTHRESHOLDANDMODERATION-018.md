# TEST-NOMINATIONTHRESHOLDANDMODERATION-018 - AC-18: Nomination threshold and moderation

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-18: Nomination threshold and moderation. |
| QBrain reference/scope | `TEST-NOMINATIONTHRESHOLDANDMODERATION-018`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_nomination_flow.svg](../../../word_association_nomination_flow.svg) |
| Frame/element identifiers | NOM-FLOW, NOM-NODE-C, NOM-NODE-D, NOM-NODE-E, NOM-NODE-G, NOM-NODE-I, NOM-NODE-J, NOM-TRANS-B-C, NOM-TRANS-C-D, NOM-TRANS-D-E, NOM-TRANS-E-C, NOM-TRANS-D-F, NOM-TRANS-F-G, NOM-TRANS-G-H, NOM-TRANS-G-I, NOM-TRANS-I-J, SCREEN-NOMINATION, STATE-NOMINATION-01, STATE-NOMINATION-02, STATE-NOMINATION-03, STATE-NOMINATION-04, STATE-NOMINATION-05, STATE-NOMINATION-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-NOMINATIONS-016#AC-18`; `FR-NOMINATIONS-016#DEC-07`; `TR-NOMINATION-MODERATION-014#DEC-07` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Candidate Moon has nine unique nominations; a tenth independent eligible profile is available. |
| Test data | Profiles p01..p10; independent moderator m01; one complete curated pair fixture. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Inspect the candidate at nine nominations, then record the tenth unique eligible nomination. | At nine it is ineligible; at ten it enters moderation and remains ineligible until approval. |
| 2 | Approve as independent m01, then inspect future eligibility before and after complete curation. | Approved candidate enters the future-eligible pool but is playable only after complete curated content exists. |

## Scenario

```gherkin
Feature: AC-18: Nomination threshold and moderation
  Scenario: TEST-NOMINATIONTHRESHOLDANDMODERATION-018 design verification
    Given Candidate Moon has nine unique nominations; a tenth independent eligible profile is available.
    And the fixture data is Profiles p01..p10; independent moderator m01; one complete curated pair fixture.
    When Inspect the candidate at nine nominations, then record the tenth unique eligible nomination.
    Then At nine it is ineligible; at ten it enters moderation and remains ineligible until approval.
    When Approve as independent m01, then inspect future eligibility before and after complete curation.
    Then Approved candidate enters the future-eligible pool but is playable only after complete curated content exists.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
