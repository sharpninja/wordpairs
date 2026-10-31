# TEST-PLAYERLIMIT-002 - AC-02: Player limit

Current rules v2.7 amendment (30 October 2026): new rooms and matches support 2 through 15 players. [Legacy compatibility](../../../release15-completion-plan.md) preserves existing larger running matches and prevents oversized waiting/countdown starts/admission without forced eviction. Original design/receipt provenance remains historical.

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-02: Player limit. |
| QBrain reference/scope | `TEST-PLAYERLIMIT-002`; Word Pairs / `PROD-WORDPAIRS`; workspace `<home>/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_room_creation.svg](../../../word_association_room_creation.svg) |
| Frame/element identifiers | DISC-FLOW, DISC-NODE-E, DISC-TRANS-D-E, DISC-TRANS-E-F, DISC-TRANS-E-B, ROOM-FLOW, ROOM-NODE-D, ROOM-NODE-H, ROOM-NODE-F, ROOM-TRANS-C-D, ROOM-TRANS-D-E, ROOM-TRANS-D-H, ROOM-TRANS-H-I, ROOM-TRANS-I-F, ROOM-TRANS-H-F, ROOM-TRANS-G-D, SCREEN-DISCOVERY, STATE-DISCOVERY-01, STATE-DISCOVERY-02, STATE-DISCOVERY-03, SCREEN-JOIN, STATE-JOIN-01, STATE-JOIN-02, STATE-JOIN-03, STATE-JOIN-04, STATE-JOIN-05; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYLIFECYCLE-003#AC-02`; `FR-ROOMACCESS-001#AC-02` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | A waiting room already contains exactly its configured player count. |
| Test data | Capacity examples 2, 8, 15; independent extra profile Eve. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | As Eve attempt a player join. | Player admission is rejected; existing roster and configured capacity are unchanged. |
| 2 | Reopen the room as an existing player. | There is no Eve player row and the roster still contains exactly the configured count. |

## Scenario

```gherkin
Feature: AC-02: Player limit
  Scenario: TEST-PLAYERLIMIT-002 design verification
    Given A waiting room already contains exactly its configured player count.
    And the fixture data is Capacity examples 2, 8, 15; independent extra profile Eve.
    When As Eve attempt a player join.
    Then Player admission is rejected; existing roster and configured capacity are unchanged.
    When Reopen the room as an existing player.
    Then There is no Eve player row and the roster still contains exactly the configured count.
```

## Boundaries

Invited observer entry retains its separate limit of 25; player rejection must not be confused with read-only observer admission. Repeat full-seat rejection through code, deep-link, browse and quick-match entry, and test concurrent final-seat commands at capacity 15. Under `FR-ROOMACCESS-001#CAP15-LEGACY`, an existing waiting/countdown room above 15 rejects new oversized admission/start, explains the limit and keeps Leave; a larger running match remains finishable and its existing results survive.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
