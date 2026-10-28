# TEST-ORIENTATION-015 - AC-15: Orientation

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-15: Orientation. |
| QBrain reference/scope | `TEST-ORIENTATION-015`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg); [word_association_game_requirements.md](../../../word_association_game_requirements.md) |
| Frame/element identifiers | ; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-RESPONSIVEUI-015#AC-15`; `TR-MOBILE-INPUT-011#TR-11-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | A player is in an active round with a hint, answer input and populated scorecard. |
| Test data | Proposed test configurations: 390x844 portrait and 844x390 landscape; target Cold. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Rotate between both viewports and enter Cold with touch and with keyboard in independent runs. | Prompt, hint, input, scorecard and primary action remain visible and operable. |
| 2 | Inspect the whole page width in each orientation. | No horizontal overflow hides content or controls. |

## Scenario

```gherkin
Feature: AC-15: Orientation
  Scenario: TEST-ORIENTATION-015 design verification
    Given A player is in an active round with a hint, answer input and populated scorecard.
    And the fixture data is Proposed test configurations: 390x844 portrait and 844x390 landscape; target Cold.
    When Rotate between both viewports and enter Cold with touch and with keyboard in independent runs.
    Then Prompt, hint, input, scorecard and primary action remain visible and operable.
    When Inspect the whole page width in each orientation.
    Then No horizontal overflow hides content or controls.
```

## Boundaries

Viewport sizes are test configurations, not invented product breakpoints.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
