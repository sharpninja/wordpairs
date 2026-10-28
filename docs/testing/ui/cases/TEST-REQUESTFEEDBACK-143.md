# TEST-REQUESTFEEDBACK-143 - Loading, empty, failure and canonical retry feedback

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json). Current implementation evidence is in [implementation-receipt.json](../implementation-receipt.json); the original documentation-only snapshot is retained under archive/design-20261027/.

| Field | Specification |
| --- | --- |
| Objective | Verify Loading, empty, failure and canonical retry feedback. |
| QBrain reference/scope | `TEST-REQUESTFEEDBACK-143`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [decisions.md](../decisions.md) |
| Frame/element identifiers | GAP-FLOW-REQUESTFEEDBACK, GAP-TRANS-REQUESTFEEDBACK-01, GAP-TRANS-REQUESTFEEDBACK-02, GAP-TRANS-REQUESTFEEDBACK-03, GAP-TRANS-REQUESTFEEDBACK-04; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-REQUESTFEEDBACK-030#UI-FEEDBACK-01`; `FR-REQUESTFEEDBACK-030#UI-FEEDBACK-02`; `FR-REQUESTFEEDBACK-030#UI-FEEDBACK-03`; `FR-REQUESTFEEDBACK-030#UI-FEEDBACK-04`; `FR-REQUESTFEEDBACK-030#UI-FEEDBACK-05` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | An isolated fixture controls pending reads, empty results, denied reads and mutation outcomes for Alice. |
| Test data | Draft Space; command C-1 with fixed payload; outcomes pending, unavailable, committed-response-lost, conflict, forbidden. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Automated isolated browser integration and supporting application/SQL checks executed; operational boundaries remain separate. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Executed applicable UI-DEC variants in Chromium with real React and isolated HTTP/application/domain fixtures; real disposable PostgreSQL covers persistence/audit. See [execution receipt](../implementation-receipt.json). |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Hold a read pending, then resolve empty and unavailable in separate examples. | Accessible loading feedback changes to distinct empty/allowed-action or unavailable/Retry states without a false success. |
| 2 | Hold a form submission pending and attempt another submit; then fail it. | Busy feedback prevents duplicate submission; the safe draft remains and a user-safe error/valid Retry appears. |
| 3 | Retry a committed-response-lost C-1, then exercise conflict in another fixture. | The uncertain retry sends identical C-1/payload and displays one committed result; conflict refreshes state without silently replaying a changed command. |
| 4 | Deny authorization while an older read is pending, then complete that older read. | Privileged records/drafts clear and the older response cannot restore them; no raw errors or credentials are shown. |

## Scenario

```gherkin
Feature: Loading, empty, failure and canonical retry feedback
  Scenario: TEST-REQUESTFEEDBACK-143 design verification
    Given An isolated fixture controls pending reads, empty results, denied reads and mutation outcomes for Alice.
    And the fixture data is Draft Space; command C-1 with fixed payload; outcomes pending, unavailable, committed-response-lost, conflict, forbidden.
    When Hold a read pending, then resolve empty and unavailable in separate examples.
    Then Accessible loading feedback changes to distinct empty/allowed-action or unavailable/Retry states without a false success.
    When Hold a form submission pending and attempt another submit; then fail it.
    Then Busy feedback prevents duplicate submission; the safe draft remains and a user-safe error/valid Retry appears.
    When Retry a committed-response-lost C-1, then exercise conflict in another fixture.
    Then The uncertain retry sends identical C-1/payload and displays one committed result; conflict refreshes state without silently replaying a changed command.
    When Deny authorization while an older read is pending, then complete that older read.
    Then Privileged records/drafts clear and the older response cannot restore them; no raw errors or credentials are shown.
```

## Boundaries

Specified gap behavior is implemented and verified within the execution receipt's isolated UI/application/SQL scope. The original design-only snapshot remains historical.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.

## Implementation evidence

[Implementation snapshot and tiered results](../implementation.md), [hashed source inventory](../implementation-manifest.json), and [raw execution logs](../../../evidence/ui-gaps/) bind this case to the current tested implementation. Browser journeys use actual pages and real application/domain services behind isolated HTTP/persistence/time ports. They do not establish physical screen-reader behavior, native phone install, real OIDC, deployed availability or real private-push2..25UI delivery. Reflow at400% is the documented320CSS-pixel equivalent, not a physical browser-zoom certification.

Final hostile-review regression: malformed200room GET and POST bodies containing a private sentinel render only controlled room errors; the sentinel/parser/network text is absent and explicit Refresh restores authoritative room access. Both paths are included in the final61-browser run.
