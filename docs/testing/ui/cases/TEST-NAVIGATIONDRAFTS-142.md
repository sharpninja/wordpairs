# TEST-NAVIGATIONDRAFTS-142 - Back, Cancel and profile-isolated drafts

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json). Current implementation evidence is in [implementation-receipt.json](../implementation-receipt.json); the original documentation-only snapshot is retained under archive/design-20261027/.

| Field | Specification |
| --- | --- |
| Objective | Verify Back, Cancel and profile-isolated drafts. |
| QBrain reference/scope | `TEST-NAVIGATIONDRAFTS-142`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [decisions.md](../decisions.md) |
| Frame/element identifiers | GAP-FLOW-NAVIGATIONDRAFTS, GAP-TRANS-NAVIGATIONDRAFTS-01, GAP-TRANS-NAVIGATIONDRAFTS-02, GAP-TRANS-NAVIGATIONDRAFTS-03, GAP-TRANS-NAVIGATIONDRAFTS-04; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-NAVIGATIONDRAFTS-029#UI-NAV-01`; `FR-NAVIGATIONDRAFTS-029#UI-NAV-02`; `FR-NAVIGATIONDRAFTS-029#UI-NAV-03`; `FR-NAVIGATIONDRAFTS-029#UI-NAV-04`; `FR-NAVIGATIONDRAFTS-029#UI-NAV-05` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice has a saved category draft form, saved profile icon owl and an active room membership; editor permissions are current. |
| Test data | Unsaved category Space; saved profile alias Oak/icon owl; unsaved alias Ash/icon fox. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Automated isolated browser integration and supporting application/SQL checks executed; operational boundaries remain separate. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Executed applicable UI-DEC variants in Chromium with real React and isolated HTTP/application/domain fixtures; real disposable PostgreSQL covers persistence/audit. See [execution receipt](../implementation-receipt.json). |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Enter unsaved edits, navigate to another authorized screen and use Back; dismiss a dialog. | The same-profile in-tab content draft returns and focus returns to the dialog opener; no submission, readiness or Leave event occurs. |
| 2 | Choose Cancel/Discard on content and profile forms. | Unsaved edits are cleared; saved content and Oak/owl remain unchanged; originating screen is shown. |
| 3 | Repeat with reload, tab close, profile switch and permission revocation in independent fixtures. | Private drafts do not persist or cross identities; denied privileged data cannot return through Back. |
| 4 | Choose the explicit Leave room action. | Only this action leaves membership and the existing roster/promotion rules apply. |

## Scenario

```gherkin
Feature: Back, Cancel and profile-isolated drafts
  Scenario: TEST-NAVIGATIONDRAFTS-142 design verification
    Given Alice has a saved category draft form, saved profile icon owl and an active room membership; editor permissions are current.
    And the fixture data is Unsaved category Space; saved profile alias Oak/icon owl; unsaved alias Ash/icon fox.
    When Enter unsaved edits, navigate to another authorized screen and use Back; dismiss a dialog.
    Then The same-profile in-tab content draft returns and focus returns to the dialog opener; no submission, readiness or Leave event occurs.
    When Choose Cancel/Discard on content and profile forms.
    Then Unsaved edits are cleared; saved content and Oak/owl remain unchanged; originating screen is shown.
    When Repeat with reload, tab close, profile switch and permission revocation in independent fixtures.
    Then Private drafts do not persist or cross identities; denied privileged data cannot return through Back.
    When Choose the explicit Leave room action.
    Then Only this action leaves membership and the existing roster/promotion rules apply.
```

## Boundaries

Specified gap behavior is implemented and verified within the execution receipt's isolated UI/application/SQL scope. The original design-only snapshot remains historical.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.

## Implementation evidence

[Implementation snapshot and tiered results](../implementation.md), [hashed source inventory](../implementation-manifest.json), and [raw execution logs](../../../evidence/ui-gaps/) bind this case to the current tested implementation. Browser journeys use actual pages and real application/domain services behind isolated HTTP/persistence/time ports. They do not establish physical screen-reader behavior, native phone install, real OIDC, deployed availability or real private-push2..25UI delivery. Reflow at400% is the documented320CSS-pixel equivalent, not a physical browser-zoom certification.
