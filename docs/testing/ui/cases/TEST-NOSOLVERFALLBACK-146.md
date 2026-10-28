# TEST-NOSOLVERFALLBACK-146 - No solver advances without a human chooser

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json). Current implementation evidence is in [implementation-receipt.json](../implementation-receipt.json); the original documentation-only snapshot is retained under archive/design-20261027/.

| Field | Specification |
| --- | --- |
| Objective | Verify No solver advances without a human chooser. |
| QBrain reference/scope | `TEST-NOSOLVERFALLBACK-146`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [decisions.md](../decisions.md) |
| Frame/element identifiers | GAP-FLOW-NOSOLVERFALLBACK, GAP-TRANS-NOSOLVERFALLBACK-01, GAP-TRANS-NOSOLVERFALLBACK-02; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ANCHORSELECTION-007#DEC-02`; `FR-ANSWERREVEAL-012#DEC-02`; `FR-ANSWERSTAGES-008#DEC-02` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Round1 is active for Alice and Bob; both remain unsolved through all four20-second stages; seven rounds remain. |
| Test data | Prompt Hot/target Cold; no accepted correct answer; six configured categories; initial totals0. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Automated isolated browser integration and supporting application/SQL checks executed; operational boundaries remain separate. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Executed applicable UI-DEC variants in Chromium with real React and isolated HTTP/application/domain fixtures; real disposable PostgreSQL covers persistence/audit. See [execution receipt](../implementation-receipt.json). |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Let the authoritative Hint3 deadline end the no-solver round and inspect both clients. | Both see Cold reveal and zero-point summary; neither is falsely shown as first solver. |
| 2 | Await the server-selected next category and round projection without choosing as either player. | A category from the configured six appears and round2 starts for both clients without a human-choice dependency. |

## Scenario

```gherkin
Feature: No solver advances without a human chooser
  Scenario: TEST-NOSOLVERFALLBACK-146 design verification
    Given Round1 is active for Alice and Bob; both remain unsolved through all four20-second stages; seven rounds remain.
    And the fixture data is Prompt Hot/target Cold; no accepted correct answer; six configured categories; initial totals0.
    When Let the authoritative Hint3 deadline end the no-solver round and inspect both clients.
    Then Both see Cold reveal and zero-point summary; neither is falsely shown as first solver.
    When Await the server-selected next category and round projection without choosing as either player.
    Then A category from the configured six appears and round2 starts for both clients without a human-choice dependency.
```

## Boundaries

Specified gap behavior is implemented and verified within the execution receipt's isolated UI/application/SQL scope. The original design-only snapshot remains historical.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.

## Implementation evidence

[Implementation snapshot and tiered results](../implementation.md), [hashed source inventory](../implementation-manifest.json), and [raw execution logs](../../../evidence/ui-gaps/) bind this case to the current tested implementation. Browser journeys use actual pages and real application/domain services behind isolated HTTP/persistence/time ports. They do not establish physical screen-reader behavior, native phone install, real OIDC, deployed availability or real private-push2..25UI delivery. Reflow at400% is the documented320CSS-pixel equivalent, not a physical browser-zoom certification.
