# TEST-ROOMJOINING-001 - AC-01: Room joining

Current rules v2.7 amendment (30 October 2026): 2 through 15 players, 25 observers unchanged. [Completion contract](../../../release15-completion-plan.md). Original design hashes and execution receipts below remain historical; current notes/export and execution require separate readback.

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-01: Room joining. |
| QBrain reference/scope | `TEST-ROOMJOINING-001`; Word Pairs / `PROD-WORDPAIRS`; workspace `<home>/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `435be05abac5310172cfb9a9290c9d7ea0d1cbde`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_room_creation.svg](../../../word_association_room_creation.svg); [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg) |
| Frame/element identifiers | ID-FLOW, ID-NODE-G, ID-TRANS-F-G, DISC-FLOW, DISC-NODE-F, DISC-TRANS-E-F, ROOM-FLOW, ROOM-NODE-C, ROOM-NODE-D, ROOM-NODE-E, ROOM-TRANS-C-D, ROOM-TRANS-D-E, ROOM-TRANS-D-H, ROOM-TRANS-G-D, ROUND-FLOW, ROUND-NODE-A, ROUND-TRANS-A-B, MSG-M03, MSG-M04, MSG-M05, MSG-FLOW, SCREEN-JOIN, STATE-JOIN-01, STATE-JOIN-02, STATE-JOIN-03, STATE-JOIN-04, STATE-JOIN-05, SCREEN-LOBBY, STATE-LOBBY-01, STATE-LOBBY-02, STATE-LOBBY-03, STATE-LOBBY-04, STATE-LOBBY-05, STATE-LOBBY-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYLIFECYCLE-003#AC-01`; `FR-ROOMACCESS-001#AC-01`; `TR-REALTIME-SYNC-002#TR-02-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice has a waiting room; Bob has an independent browser profile and no room membership. |
| Test data | Generated active room code, Alice owl icon, Bob fox icon; repeat for capacities 2, 8 and 15. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | As Bob enter the generated room code and choose player join. | Bob enters Alice's room with the fox icon. |
| 2 | Observe Alice's room without manually refreshing. | The same room roster includes Alice and Bob, each once, with their selected icons. |

## Scenario

```gherkin
Feature: AC-01: Room joining
  Scenario: TEST-ROOMJOINING-001 design verification
    Given Alice has a waiting room; Bob has an independent browser profile and no room membership.
    And the fixture data is Generated active room code, Alice owl icon, Bob fox icon; repeat for capacities 2, 8 and 15.
    When As Bob enter the generated room code and choose player join.
    Then Bob enters Alice's room with the fox icon.
    When Observe Alice's room without manually refreshing.
    Then The same room roster includes Alice and Bob, each once, with their selected icons.
```

## Boundaries

Run separate-device browser contexts; extend the fixture to every count 2 through 15 under TEST-MULTIPLAYERINTEGRATION-134 and TEST-ROOMSYNC-139. The 14-game matrix requires 119 player participations and 952 accepted round solves. This case alone does not establish the matrix or a latency bound. Larger historical matches retain their separate compatibility coverage.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
