# TEST-ACCESSIBLEGAMECONTROLS-044 - AC-44: Accessible game controls

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-44: Accessible game controls. |
| QBrain reference/scope | `TEST-ACCESSIBLEGAMECONTROLS-044`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg); [word_association_game_requirements.md](../../../word_association_game_requirements.md) |
| Frame/element identifiers | ; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-CATEGORYART-006#AC-44`; `FR-RESPONSIVEUI-015#AC-44`; `TR-UI-ACCESSIBILITY-012#TR-12-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Phone-sized active game has category background, selectable icon and score updates. |
| Test data | Portrait 390x844, landscape 844x390 (test configurations); keyboard and touch; fox selected, Alice solved. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Use keyboard focus and touch for primary actions in both orientations. | Actions are operable, focus is visible and text/control contrast remains clear over category art. |
| 2 | Inspect selected icon, Alice's solved state and score change without relying on color. | Labels or shapes distinguish selection, solved status and changed score. |

## Scenario

```gherkin
Feature: AC-44: Accessible game controls
  Scenario: TEST-ACCESSIBLEGAMECONTROLS-044 design verification
    Given Phone-sized active game has category background, selectable icon and score updates.
    And the fixture data is Portrait 390x844, landscape 844x390 (test configurations); keyboard and touch; fox selected, Alice solved.
    When Use keyboard focus and touch for primary actions in both orientations.
    Then Actions are operable, focus is visible and text/control contrast remains clear over category art.
    When Inspect selected icon, Alice's solved state and score change without relying on color.
    Then Labels or shapes distinguish selection, solved status and changed score.
```

## Boundaries

No numeric contrast ratio or WCAG level is invented; quantitative compliance targets remain Q-A11Y-01.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
