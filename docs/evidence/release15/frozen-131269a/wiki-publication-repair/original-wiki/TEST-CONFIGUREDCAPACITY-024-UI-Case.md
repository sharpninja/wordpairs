# TEST-CONFIGUREDCAPACITY-024 - AC-24: Configured capacity

Current rules v2.7 amendment (30 October 2026) is [the 15-player completion contract](../../../release15-completion-plan.md). Parent criterion references remain stable; original design/receipt provenance below is historical and does not verify these changed boundaries.

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-24: Configured capacity. |
| QBrain reference/scope | `TEST-CONFIGUREDCAPACITY-024`; Word Pairs / `PROD-WORDPAIRS`; workspace `<home>/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_room_creation.svg](../../../word_association_room_creation.svg) |
| Frame/element identifiers | ROOM-FLOW, ROOM-NODE-A, ROOM-NODE-B, ROOM-TRANS-A-B, ROOM-TRANS-B-G, MSG-M01, MSG-M02, SCREEN-CREATE, STATE-CREATE-01; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYLIFECYCLE-003#AC-24`; `FR-ROOMACCESS-001#AC-24`; `FR-ROOMACCESS-001#CAP15-LEGACY` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | An identified player can create a room. |
| Test data | Every integral capacity 2 through 15; rejected inputs 1, 16, 25, a fractional value and a numeric string; historical waiting/countdown and playing rooms above 15. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Try capacities 1, 16, 25, a fractional value and a numeric string. | Every invalid value is rejected without creating a room. |
| 2 | Create separate rooms for every integral capacity 2 through 15. | Each room stores/displays the selected limit and correct open slots; the control advertises maximum 15. |
| 3 | Open a pre-existing waiting/countdown room containing more than 15 players and attempt another admission/start. | Membership is readable; a compatibility notice and Leave are present; no oversized admission/start or forced eviction occurs. |
| 4 | Read and continue an existing larger running match, then inspect its final result. | Existing participants can finish/leave and stored history is preserved; the new-capacity guard does not reject unchanged historical match updates. |

## Scenario

```gherkin
Feature: AC-24: Configured capacity
  Scenario: TEST-CONFIGUREDCAPACITY-024 design verification
    Given An identified player can create a room.
    And the fixture data includes every integral capacity 2 through 15
    And invalid inputs are 1, 16, 25, a fraction and a numeric string
    When I try each invalid capacity
    Then no invalid room is created
    When I create a room for each integral capacity 2 through 15
    Then Each room stores and displays exactly its selected limit and correct open slots.

  Scenario: TEST-CONFIGUREDCAPACITY-024 preserves historical larger rooms
    Given a historical waiting or countdown room has more than 15 players
    When I read the room and attempt an additional player admission or new match start
    Then I see the compatibility notice and Leave action
    And no oversized new admission or match start succeeds
    And no member is evicted merely to reduce the roster
    Given a larger historical match is already playing
    When its existing participants continue the match
    Then the match remains finishable and its final result is preserved
```

## Boundaries

Preserve the independent 25-observer limit. A numeric-string rejection is a raw transport/domain fixture; an ordinary number typed into the browser control is serialized by the UI and is not that malformed payload. Verify legacy behavior and new-write guards through separate real PostgreSQL/transaction tests as well as UI feedback. Documentation does not establish that those cases have executed.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
