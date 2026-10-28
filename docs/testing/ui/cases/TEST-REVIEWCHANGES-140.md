# TEST-REVIEWCHANGES-140 - Reasoned change request and resubmission

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json). Current implementation evidence is in [implementation-receipt.json](../implementation-receipt.json); the original documentation-only snapshot is retained under archive/design-20261027/.

| Field | Specification |
| --- | --- |
| Objective | Verify Reasoned change request and resubmission. |
| QBrain reference/scope | `TEST-REVIEWCHANGES-140`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [decisions.md](../decisions.md) |
| Frame/element identifiers | SUG-NODE-G, SUG-TRANS-F-G, GAP-FLOW-REVIEWCHANGES, GAP-TRANS-REVIEWCHANGES-01, GAP-TRANS-REVIEWCHANGES-02, GAP-TRANS-REVIEWCHANGES-03, GAP-TRANS-REVIEWCHANGES-NONPROPOSER; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-REVIEWCHANGES-027#UI-CHANGES-01`; `FR-REVIEWCHANGES-027#UI-CHANGES-02`; `FR-REVIEWCHANGES-027#UI-CHANGES-03`; `FR-REVIEWCHANGES-027#UI-CHANGES-04` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice proposed Space with three pairs; independent moderator Bob can review it. |
| Test data | Reason Add clearer hints; revised pair hints H1/H2/H3; second category Oceans. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Automated isolated browser integration and supporting application/SQL checks executed; operational boundaries remain separate. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Executed applicable UI-DEC variants in Chromium with real React and isolated HTTP/application/domain fixtures; real disposable PostgreSQL covers persistence/audit. See [execution receipt](../implementation-receipt.json). |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | As Bob request changes with an empty reason, then with Add clearer hints. | Empty reason is rejected; valid request shows changes_requested, the reason and an audit entry. |
| 2 | While Space is changes_requested, attempt to edit its pairs and resubmit as another proposer Mallory and as reviewer Bob. | Both non-proposer attempts are denied; Space content, pair count, recorded revision and changes_requested status are unchanged, and no accepted edit/resubmission appears in decision history. |
| 3 | As Alice try a second open category, then revise Space with two pairs and with three pairs. | The second suggestion and two-pair resubmission are rejected; exactly three edited pairs can resubmit. |
| 4 | Resubmit and inspect review/playability/history. | Status becomes pending_review; content remains unplayable pending independent approval/complete curation, revision history is retained and rejection-appeal allowance is unused. |

## Scenario

```gherkin
Feature: Reasoned change request and resubmission
  Scenario: TEST-REVIEWCHANGES-140 design verification
    Given Alice proposed Space with three pairs; independent moderator Bob can review it.
    And the fixture data is Reason Add clearer hints; revised pair hints H1/H2/H3; second category Oceans.
    When As Bob request changes with an empty reason, then with Add clearer hints.
    Then Empty reason is rejected; valid request shows changes_requested, the reason and an audit entry.
    When While Space is changes_requested, attempt to edit its pairs and resubmit as another proposer Mallory and as reviewer Bob.
    Then Both non-proposer attempts are denied; Space content, pair count, recorded revision and changes_requested status are unchanged, and no accepted edit/resubmission appears in decision history.
    When As Alice try a second open category, then revise Space with two pairs and with three pairs.
    Then The second suggestion and two-pair resubmission are rejected; exactly three edited pairs can resubmit.
    When Resubmit and inspect review/playability/history.
    Then Status becomes pending_review; content remains unplayable pending independent approval/complete curation, revision history is retained and rejection-appeal allowance is unused.
```

## Boundaries

Specified gap behavior is implemented and verified within the execution receipt's isolated UI/application/SQL scope. The original design-only snapshot remains historical.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.

## Implementation evidence

[Implementation snapshot and tiered results](../implementation.md), [hashed source inventory](../implementation-manifest.json), and [raw execution logs](../../../evidence/ui-gaps/) bind this case to the current tested implementation. Browser journeys use actual pages and real application/domain services behind isolated HTTP/persistence/time ports. They do not establish physical screen-reader behavior, native phone install, real OIDC, deployed availability or real private-push2..25UI delivery. Reflow at400% is the documented320CSS-pixel equivalent, not a physical browser-zoom certification.
