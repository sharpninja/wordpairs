# TEST-READYCOUNTDOWNANDROSTERLOCK-031 - AC-31: Ready countdown and roster lock

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-31: Ready countdown and roster lock. |
| QBrain reference/scope | `TEST-READYCOUNTDOWNANDROSTERLOCK-031`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg); [word_association_game_requirements.md](../../../word_association_game_requirements.md) |
| Frame/element identifiers | MSG-M06, MSG-FLOW, SCREEN-LOBBY, STATE-LOBBY-01, STATE-LOBBY-02, STATE-LOBBY-03, STATE-LOBBY-04, STATE-LOBBY-05, STATE-LOBBY-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYDISCOVERY-019#AC-31`; `FR-LOBBYLIFECYCLE-003#AC-31`; `FR-LOBBYLIFECYCLE-003#DEC-14`; `FR-LOBBYLIFECYCLE-003#DEC-15` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Two or more players are in a waiting room; an observer is available. |
| Test data | Alice and Bob; countdown 10 seconds; original roster recorded. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Mark every player ready. | The 10-second start countdown begins and roster locks immediately. |
| 2 | Have one original player leave and try substituting an observer. | No substitution occurs; if fewer than two original members remain at expiry the game aborts and closes. |
| 3 | Repeat readiness controls as creator and non-creator. | Both have equal readiness controls; creator has no special force-start authority. |

## Scenario

```gherkin
Feature: AC-31: Ready countdown and roster lock
  Scenario: TEST-READYCOUNTDOWNANDROSTERLOCK-031 design verification
    Given Two or more players are in a waiting room; an observer is available.
    And the fixture data is Alice and Bob; countdown 10 seconds; original roster recorded.
    When Mark every player ready.
    Then The 10-second start countdown begins and roster locks immediately.
    When Have one original player leave and try substituting an observer.
    Then No substitution occurs; if fewer than two original members remain at expiry the game aborts and closes.
    When Repeat readiness controls as creator and non-creator.
    Then Both have equal readiness controls; creator has no special force-start authority.
```

## Boundaries

Retain the specified 10-second timing condition; do not implement synchronization with a fixed sleep.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
