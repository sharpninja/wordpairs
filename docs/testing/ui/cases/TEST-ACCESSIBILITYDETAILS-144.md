# TEST-ACCESSIBILITYDETAILS-144 - Contrast, focus, announcements and touch geometry

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json). Current implementation evidence is in [implementation-receipt.json](../implementation-receipt.json); the original documentation-only snapshot is retained under archive/design-20261027/.

| Field | Specification |
| --- | --- |
| Objective | Verify Contrast, focus, announcements and touch geometry. |
| QBrain reference/scope | `TEST-ACCESSIBILITYDETAILS-144`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [decisions.md](../decisions.md) |
| Frame/element identifiers | GAP-FLOW-ACCESSIBILITYDETAILS, GAP-TRANS-ACCESSIBILITYDETAILS-01, GAP-TRANS-ACCESSIBILITYDETAILS-02, GAP-TRANS-ACCESSIBILITYDETAILS-03, GAP-TRANS-ACCESSIBILITYDETAILS-04; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `TR-UI-ACCESSIBILITYDETAILS-039#UI-A11Y-01`; `TR-UI-ACCESSIBILITYDETAILS-039#UI-A11Y-02`; `TR-UI-ACCESSIBILITYDETAILS-039#UI-A11Y-03`; `TR-UI-ACCESSIBILITYDETAILS-039#UI-A11Y-04` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Every game/form/staff state can be seeded with all category backgrounds and accepted/error updates. |
| Test data | Normal text, large text and essential indicators; keyboard focus order; screen reader; target rectangles44x44CSSpx. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Automated isolated browser integration and supporting application/SQL checks executed; operational boundaries remain separate. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Executed applicable UI-DEC variants in Chromium with real React and isolated HTTP/application/domain fixtures; real disposable PostgreSQL covers persistence/audit. See [execution receipt](../implementation-receipt.json). |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Measure text/indicator contrast against the actual adjacent rendered colors. | Normal text meets4.5:1, large text3:1 and essential indicators3:1 under the specified definitions/exceptions. |
| 2 | Traverse primary actions using keyboard and inspect accessible names/non-color state. | Focus is visible and ordered; names and labels/shapes identify every primary action and relevant state. |
| 3 | Trigger accepted score/stage changes and an error while reading the page. | Assistive announcements convey the changes without unexpectedly stealing focus. |
| 4 | Measure the primary touch target geometry. | Each is at least44x44CSSpx under the project rule; no formal compliance result is inferred. |

## Scenario

```gherkin
Feature: Contrast, focus, announcements and touch geometry
  Scenario: TEST-ACCESSIBILITYDETAILS-144 design verification
    Given Every game/form/staff state can be seeded with all category backgrounds and accepted/error updates.
    And the fixture data is Normal text, large text and essential indicators; keyboard focus order; screen reader; target rectangles44x44CSSpx.
    When Measure text/indicator contrast against the actual adjacent rendered colors.
    Then Normal text meets4.5:1, large text3:1 and essential indicators3:1 under the specified definitions/exceptions.
    When Traverse primary actions using keyboard and inspect accessible names/non-color state.
    Then Focus is visible and ordered; names and labels/shapes identify every primary action and relevant state.
    When Trigger accepted score/stage changes and an error while reading the page.
    Then Assistive announcements convey the changes without unexpectedly stealing focus.
    When Measure the primary touch target geometry.
    Then Each is at least44x44CSSpx under the project rule; no formal compliance result is inferred.
```

## Boundaries

Specified gap behavior is implemented and verified within the execution receipt's isolated UI/application/SQL scope. The original design-only snapshot remains historical.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.

## Implementation evidence

[Implementation snapshot and tiered results](../implementation.md), [hashed source inventory](../implementation-manifest.json), and [raw execution logs](../../../evidence/ui-gaps/) bind this case to the current tested implementation. Browser journeys use actual pages and real application/domain services behind isolated HTTP/persistence/time ports. They do not establish physical screen-reader behavior, native phone install, real OIDC, deployed availability or real private-push2..25UI delivery. Reflow at400% is the documented320CSS-pixel equivalent, not a physical browser-zoom certification.
