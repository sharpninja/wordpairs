# TEST-CATEGORYART-005 - AC-05: Category art

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-05: Category art. |
| QBrain reference/scope | `TEST-CATEGORYART-005`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-D, ROUND-TRANS-C-D, ROUND-TRANS-D-E, ROUND-TRANS-L-D, MSG-M16, MSG-M17, MSG-M18, SCREEN-ROUND, STATE-ROUND-01, STATE-ROUND-02, STATE-ROUND-03, STATE-ROUND-04, STATE-ROUND-05, STATE-ROUND-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-CATEGORIES-005#AC-05`; `FR-CATEGORYART-006#AC-05`; `TR-ART-RENDER-007#TR-07-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Controlled catalog provides two Opposites pairs and one Colors pair with approved backgrounds. |
| Test data | Hot/Cold and Up/Down in Opposites; Red/Green in Colors. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Play Hot/Cold and then Up/Down. | Both rounds use the same Opposites background. |
| 2 | Play the Colors pair and simulate a missing background asset in a separate fixture. | Colors uses its own background; missing art does not obscure prompt, hints, input or scorecard. |

## Scenario

```gherkin
Feature: AC-05: Category art
  Scenario: TEST-CATEGORYART-005 design verification
    Given Controlled catalog provides two Opposites pairs and one Colors pair with approved backgrounds.
    And the fixture data is Hot/Cold and Up/Down in Opposites; Red/Green in Colors.
    When Play Hot/Cold and then Up/Down.
    Then Both rounds use the same Opposites background.
    When Play the Colors pair and simulate a missing background asset in a separate fixture.
    Then Colors uses its own background; missing art does not obscure prompt, hints, input or scorecard.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.


## Comic background refinement (27 October 2026)

The operator-approved refinement is documented in [the artwork design](../../../category_artwork.md) and read back from [QBrain](../../../evidence/category-artwork/qbrain-readback.json). It covers `FR-CATEGORYART-006#ART-COMIC-01`, `#ART-PANEL-01`, and `#ART-ASPECT-01`, through this existing TEST record. The historical design case above and its original evidence remain unchanged.

For each of the six categories, start an isolated approved round at 390×844 and1440×960. Await the loaded artwork state, decode the actual9:16 or16:9 asset, verify that it fills the page background with no image panel, and observe enabled answer controls. Check translucent game/header/install surfaces and worst-case text contrast; disable backdrop blur and confirm the same readable fills and usable answer input. Rotate a portrait viewport and await the16:9 URL and loaded state, then restore portrait and await9:16. Abort artwork loading separately, confirm usable fallback and activate Retry artwork. Expected observations and hashes are in [the bounded execution receipt](../../../evidence/category-artwork/receipt.json). The real-UI fixture isolates HTTP/time/persistence ports; it is not physical-device or live Realtime evidence.
