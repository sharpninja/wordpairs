# TEST-CONNECTIONRECOVERY-109 - Verify TR-09: Connection handling

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify Verify TR-09: Connection handling. |
| QBrain reference/scope | `TEST-CONNECTIONRECOVERY-109`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg); [room_sync_fix.md](../../../room_sync_fix.md) |
| Frame/element identifiers | SCREEN-ROUND, STATE-ROUND-01, STATE-ROUND-02, STATE-ROUND-03, STATE-ROUND-04, STATE-ROUND-05, STATE-ROUND-06, SCREEN-SERVICE, STATE-SERVICE-01, STATE-SERVICE-02; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `TR-CONNECTION-RECOVERY-009#DEC-17`; `TR-CONNECTION-RECOVERY-009#TR-09-C01`; `TR-ROOM-CODES-010#DEC-17` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice has an accepted score and a room membership; a separate client Bob remains connected. |
| Test data | Accepted score 5; disconnected durations below and above 120-second grace; uncertain submission fixture. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Disconnect Alice, reconnect within grace and reopen the room. | Membership and accepted score persist; no duplicate submission is recorded. |
| 2 | Repeat beyond grace and observe the normal departure rule for the current room phase. | Expired membership departs without corrupting scores; retry of an uncertain command retains its original command ID. |

## Scenario

```gherkin
Feature: Verify TR-09: Connection handling
  Scenario: TEST-CONNECTIONRECOVERY-109 design verification
    Given Alice has an accepted score and a room membership; a separate client Bob remains connected.
    And the fixture data is Accepted score 5; disconnected durations below and above 120-second grace; uncertain submission fixture.
    When Disconnect Alice, reconnect within grace and reopen the room.
    Then Membership and accepted score persist; no duplicate submission is recorded.
    When Repeat beyond grace and observe the normal departure rule for the current room phase.
    Then Expired membership departs without corrupting scores; retry of an uncertain command retains its original command ID.
```

## Boundaries

Network readiness and authoritative grace expiry are conditions; do not substitute a fixed sleep. Generic recovery copy is not specified.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
