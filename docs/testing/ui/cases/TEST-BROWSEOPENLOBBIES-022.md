# TEST-BROWSEOPENLOBBIES-022 - AC-22: Browse open lobbies

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-22: Browse open lobbies. |
| QBrain reference/scope | `TEST-BROWSEOPENLOBBIES-022`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_lobby_discovery.svg](../../../word_association_lobby_discovery.svg) |
| Frame/element identifiers | DISC-FLOW, DISC-NODE-A, DISC-NODE-B, DISC-NODE-D, DISC-NODE-E, DISC-NODE-F, DISC-TRANS-A-B, DISC-TRANS-B-C, DISC-TRANS-C-D, DISC-TRANS-D-E, DISC-TRANS-E-F, DISC-TRANS-E-B, ROOM-FLOW, ROOM-NODE-C, ROOM-TRANS-C-D, SCREEN-DISCOVERY, STATE-DISCOVERY-01, STATE-DISCOVERY-02, STATE-DISCOVERY-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYDISCOVERY-019#AC-22`; `TR-LOBBY-MATCHING-017#TR-17-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Fixture contains four rooms with distinguishable capacity/waiting/discovery flags. |
| Test data | Public waiting 1/2; private waiting 1/2; public full 2/2; public started 2/2. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Open lobby browsing. | Only the discoverable waiting room with an open seat appears as joinable. |
| 2 | Select that room and join. | The player reaches its room; hidden/full/started rooms remain unavailable as joinable entries. |

## Scenario

```gherkin
Feature: AC-22: Browse open lobbies
  Scenario: TEST-BROWSEOPENLOBBIES-022 design verification
    Given Fixture contains four rooms with distinguishable capacity/waiting/discovery flags.
    And the fixture data is Public waiting 1/2; private waiting 1/2; public full 2/2; public started 2/2.
    When Open lobby browsing.
    Then Only the discoverable waiting room with an open seat appears as joinable.
    When Select that room and join.
    Then The player reaches its room; hidden/full/started rooms remain unavailable as joinable entries.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
