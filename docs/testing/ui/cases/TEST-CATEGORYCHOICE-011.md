# TEST-CATEGORYCHOICE-011 - AC-11: Category choice

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-11: Category choice. |
| QBrain reference/scope | `TEST-CATEGORYCHOICE-011`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-L, ROUND-TRANS-K-L, ROUND-TRANS-L-D, MSG-M36, MSG-M37, MSG-M38, MSG-M39, MSG-FLOW, SCREEN-CHOOSER, STATE-CHOOSER-01, STATE-CHOOSER-02, STATE-CHOOSER-03, SCREEN-SUMMARY, STATE-SUMMARY-01, STATE-SUMMARY-02, STATE-SUMMARY-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ANCHORSELECTION-007#AC-11` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice and Bob solve one round; accepted order is Bob first, then Alice. |
| Test data | Authoritative accepted solve times Bob 4 seconds, Alice 5 seconds. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | End the round and attempt next-category choice as Alice, then as Bob. | Only first accepted solver Bob can select the next category. |
| 2 | Choose Colors as Bob. | All room clients progress to the Colors round and background. |

## Scenario

```gherkin
Feature: AC-11: Category choice
  Scenario: TEST-CATEGORYCHOICE-011 design verification
    Given Alice and Bob solve one round; accepted order is Bob first, then Alice.
    And the fixture data is Authoritative accepted solve times Bob 4 seconds, Alice 5 seconds.
    When End the round and attempt next-category choice as Alice, then as Bob.
    Then Only first accepted solver Bob can select the next category.
    When Choose Colors as Bob.
    Then All room clients progress to the Colors round and background.
```

## Boundaries

An effectively simultaneous acceptance needs deterministic server ordering evidence; visual arrival order is not an oracle. The no-solver fallback is listed as a separate uncovered decision obligation.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
