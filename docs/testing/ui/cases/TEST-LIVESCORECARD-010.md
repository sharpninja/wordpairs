# TEST-LIVESCORECARD-010 - AC-10: Live scorecard

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-10: Live scorecard. |
| QBrain reference/scope | `TEST-LIVESCORECARD-010`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_round_flow.svg](../../../word_association_round_flow.svg); [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg) |
| Frame/element identifiers | ROUND-FLOW, ROUND-NODE-G, ROUND-TRANS-F-G, ROUND-TRANS-G-H, MSG-M26, MSG-M27, MSG-M28, MSG-M29, MSG-FLOW, SCREEN-ROUND, STATE-ROUND-01, STATE-ROUND-02, STATE-ROUND-03, STATE-ROUND-04, STATE-ROUND-05, STATE-ROUND-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LIVESCORECARD-011#AC-10`; `FR-SCORELOCK-010#AC-10`; `TR-CLOCK-CONSISTENCY-008#TR-08-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice and Bob see the same active round and Alice is unsolved. |
| Test data | Alice fox icon; controlled authoritative round start 12:00:00 and accepted correct solve 12:00:04. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Submit the target as Alice and observe Bob without manual refresh. | Bob's live scorecard shows Alice, fox icon, 5 round points and 4 seconds elapsed. |
| 2 | Change a client clock in an independent fixture. | Displayed authoritative solve duration and points remain based on server acceptance time. |

## Scenario

```gherkin
Feature: AC-10: Live scorecard
  Scenario: TEST-LIVESCORECARD-010 design verification
    Given Alice and Bob see the same active round and Alice is unsolved.
    And the fixture data is Alice fox icon; controlled authoritative round start 12:00:00 and accepted correct solve 12:00:04.
    When Submit the target as Alice and observe Bob without manual refresh.
    Then Bob's live scorecard shows Alice, fox icon, 5 round points and 4 seconds elapsed.
    When Change a client clock in an independent fixture.
    Then Displayed authoritative solve duration and points remain based on server acceptance time.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
