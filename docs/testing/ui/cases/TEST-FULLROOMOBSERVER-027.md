# TEST-FULLROOMOBSERVER-027 - AC-27: Full-room observer

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-27: Full-room observer. |
| QBrain reference/scope | `TEST-FULLROOMOBSERVER-027`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_room_creation.svg](../../../word_association_room_creation.svg) |
| Frame/element identifiers | ROOM-FLOW, ROOM-NODE-H, ROOM-NODE-I, ROOM-NODE-J, ROOM-TRANS-D-H, ROOM-TRANS-H-I, ROOM-TRANS-I-J, ROOM-TRANS-I-F, ROOM-TRANS-H-F, SCREEN-JOIN, STATE-JOIN-01, STATE-JOIN-02, STATE-JOIN-03, STATE-JOIN-04, STATE-JOIN-05, SCREEN-OBSERVER, STATE-OBSERVER-01, STATE-OBSERVER-02, STATE-OBSERVER-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYLIFECYCLE-003#AC-27`; `FR-OBSERVERS-020#AC-27`; `FR-OBSERVERS-020#DEC-13`; `TR-OBSERVER-PERMISSIONS-018#TR-18-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice's room has reached capacity; invited Eve is not a member. |
| Test data | Signed invitation bound to Alice; second run uses manual room code and roster inviter selection. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Choose Observe as Eve. | Eve appears only in observers; player count/capacity is unchanged and her perspective follows Alice. |
| 2 | Repeat code invitation and select Alice from current roster. | The observer is bound to the explicitly chosen inviter, not an arbitrary player. |
| 3 | Fill observer capacity with25 independent invited profiles, then attempt a26th observer. | Twenty-five observers are permitted; the26th is rejected without consuming a player seat or displacing an observer. |

## Scenario

```gherkin
Feature: AC-27: Full-room observer
  Scenario: TEST-FULLROOMOBSERVER-027 design verification
    Given Alice's room has reached capacity; invited Eve is not a member.
    And the fixture data is Signed invitation bound to Alice; second run uses manual room code and roster inviter selection.
    When Choose Observe as Eve.
    Then Eve appears only in observers; player count/capacity is unchanged and her perspective follows Alice.
    When Repeat code invitation and select Alice from current roster.
    Then The observer is bound to the explicitly chosen inviter, not an arbitrary player.
    When Fill observer capacity with25 independent invited profiles, then attempt a26th observer.
    Then Twenty-five observers are permitted; the26th is rejected without consuming a player seat or displacing an observer.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
