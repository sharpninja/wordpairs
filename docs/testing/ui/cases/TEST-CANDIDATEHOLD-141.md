# TEST-CANDIDATEHOLD-141 - Hold and resume a nominated candidate

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json). Current implementation evidence is in [implementation-receipt.json](../implementation-receipt.json); the original documentation-only snapshot is retained under archive/design-20261027/.

| Field | Specification |
| --- | --- |
| Objective | Verify Hold and resume a nominated candidate. |
| QBrain reference/scope | `TEST-CANDIDATEHOLD-141`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [decisions.md](../decisions.md) |
| Frame/element identifiers | NOM-NODE-H, NOM-TRANS-G-H, GAP-FLOW-CANDIDATEHOLD, GAP-TRANS-CANDIDATEHOLD-01, GAP-TRANS-CANDIDATEHOLD-02, GAP-TRANS-CANDIDATEHOLD-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-CANDIDATEHOLD-028#UI-HOLD-01`; `FR-CANDIDATEHOLD-028#UI-HOLD-02`; `FR-CANDIDATEHOLD-028#UI-HOLD-03` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Moon has ten unique nominations and pending_review status; Alice is proposer and Bob an independent moderator. |
| Test data | Hold reason Check wording; resume reason Review can continue; current game score Alice5. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Automated isolated browser integration and supporting application/SQL checks executed; operational boundaries remain separate. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Executed applicable UI-DEC variants in Chromium with real React and isolated HTTP/application/domain fixtures; real disposable PostgreSQL covers persistence/audit. See [execution receipt](../implementation-receipt.json). |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Attempt hold as Alice, then as Bob without a reason and with Check wording. | Proposer and empty-reason attempts fail; valid hold enters on_hold with actor/reason in history. |
| 2 | Inspect counts, score and approval/publish controls while held. | Ten nominations and Alice5 persist; held content cannot be approved, published or played. |
| 3 | Resume as independent Bob with Review can continue. | Threshold is rechecked, status returns to pending_review and both audited decisions remain; resume is not approval. |

## Scenario

```gherkin
Feature: Hold and resume a nominated candidate
  Scenario: TEST-CANDIDATEHOLD-141 design verification
    Given Moon has ten unique nominations and pending_review status; Alice is proposer and Bob an independent moderator.
    And the fixture data is Hold reason Check wording; resume reason Review can continue; current game score Alice5.
    When Attempt hold as Alice, then as Bob without a reason and with Check wording.
    Then Proposer and empty-reason attempts fail; valid hold enters on_hold with actor/reason in history.
    When Inspect counts, score and approval/publish controls while held.
    Then Ten nominations and Alice5 persist; held content cannot be approved, published or played.
    When Resume as independent Bob with Review can continue.
    Then Threshold is rechecked, status returns to pending_review and both audited decisions remain; resume is not approval.
```

## Boundaries

Specified gap behavior is implemented and verified within the execution receipt's isolated UI/application/SQL scope. The original design-only snapshot remains historical.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.

## Implementation evidence

[Implementation snapshot and tiered results](../implementation.md), [hashed source inventory](../implementation-manifest.json), and [raw execution logs](../../../evidence/ui-gaps/) bind this case to the current tested implementation. Browser journeys use actual pages and real application/domain services behind isolated HTTP/persistence/time ports. They do not establish physical screen-reader behavior, native phone install, real OIDC, deployed availability or real private-push2..25UI delivery. Reflow at400% is the documented320CSS-pixel equivalent, not a physical browser-zoom certification.
