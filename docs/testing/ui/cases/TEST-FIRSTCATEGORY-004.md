# TEST-FIRSTCATEGORY-004 - AC-04: First category

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-04: First category. |
| QBrain reference/scope | `TEST-FIRSTCATEGORY-004`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg); [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-B, ROUND-NODE-C, ROUND-TRANS-A-B, ROUND-TRANS-B-C, ROUND-TRANS-C-D, MSG-M07, MSG-M08, MSG-M09, MSG-M10, MSG-M11, MSG-M12, MSG-M13, MSG-FLOW, SCREEN-CHOOSER, STATE-CHOOSER-01, STATE-CHOOSER-02, STATE-CHOOSER-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ANCHORSELECTION-007#AC-04`; `FR-CATEGORIES-005#AC-04`; `TR-ANCHOR-RANDOMNESS-013#TR-13-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | The start roster is Alice, Bob, Cara; all are ready; fixture controls which roster index the service selects. |
| Test data | Controlled selected-index examples 1, 2, 3; opening category Opposites. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Let the countdown finish and inspect the announced anchor on all clients. | The player at the selected roster index is identified as anchor consistently. |
| 2 | As a non-anchor attempt category selection, then select Opposites as the anchor. | Only the anchor's choice starts the first round; every client shows Opposites and its background. |

## Scenario

```gherkin
Feature: AC-04: First category
  Scenario: TEST-FIRSTCATEGORY-004 design verification
    Given The start roster is Alice, Bob, Cara; all are ready; fixture controls which roster index the service selects.
    And the fixture data is Controlled selected-index examples 1, 2, 3; opening category Opposites.
    When Let the countdown finish and inspect the announced anchor on all clients.
    Then The player at the selected roster index is identified as anchor consistently.
    When As a non-anchor attempt category selection, then select Opposites as the anchor.
    Then Only the anchor's choice starts the first round; every client shows Opposites and its background.
```

## Boundaries

Repeat each selected index, including other-player branch; UI verifies consequences, not statistical uniformity. Stable-index distribution proof remains separate technical coverage.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
