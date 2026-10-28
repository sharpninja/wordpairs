# TEST-OBSERVERPERSPECTIVEANDPERMISSIONS-028 - AC-28: Observer perspective and permissions

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-28: Observer perspective and permissions. |
| QBrain reference/scope | `TEST-OBSERVERPERSPECTIVEANDPERMISSIONS-028`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_room_creation.svg](../../../word_association_room_creation.svg); [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg) |
| Frame/element identifiers | ROOM-FLOW, ROOM-NODE-J, ROOM-TRANS-I-J, SCREEN-OBSERVER, STATE-OBSERVER-01, STATE-OBSERVER-02, STATE-OBSERVER-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-OBSERVERS-020#AC-28`; `TR-OBSERVER-PERMISSIONS-018#TR-18-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Eve observes Alice in a full room; Bob is another player. |
| Test data | Alice remains unsolved at Hint 1; Bob already solved. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Observe Eve as Alice receives her next hint. | Eve sees Alice's authorized perspective, without Bob's private guess text. |
| 2 | As Eve attempt guessing, category selection or state-changing controls. | Observer cannot change game state and earns no score. |

## Scenario

```gherkin
Feature: AC-28: Observer perspective and permissions
  Scenario: TEST-OBSERVERPERSPECTIVEANDPERMISSIONS-028 design verification
    Given Eve observes Alice in a full room; Bob is another player.
    And the fixture data is Alice remains unsolved at Hint 1; Bob already solved.
    When Observe Eve as Alice receives her next hint.
    Then Eve sees Alice's authorized perspective, without Bob's private guess text.
    When As Eve attempt guessing, category selection or state-changing controls.
    Then Observer cannot change game state and earns no score.
```

## Boundaries

UI control absence is insufficient proof of server rejection; retain separate authority tests and mark bypass denial as technical coverage.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
