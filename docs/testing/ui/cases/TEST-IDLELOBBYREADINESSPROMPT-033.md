# TEST-IDLELOBBYREADINESSPROMPT-033 - AC-33: Idle lobby readiness prompt

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-33: Idle lobby readiness prompt. |
| QBrain reference/scope | `TEST-IDLELOBBYREADINESSPROMPT-033`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg); [word_association_game_requirements.md](../../../word_association_game_requirements.md) |
| Frame/element identifiers | SCREEN-LOBBY, STATE-LOBBY-01, STATE-LOBBY-02, STATE-LOBBY-03, STATE-LOBBY-04, STATE-LOBBY-05, STATE-LOBBY-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYDISCOVERY-019#AC-33`; `FR-LOBBYLIFECYCLE-003#AC-33`; `FR-LOBBYLIFECYCLE-003#DEC-16` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Room is waiting without countdown and its current membership/readiness version is recorded. |
| Test data | 30-second unchanged interval; one ready-state or observer membership change. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Keep the room version unchanged through the idle deadline. | All players receive one ready prompt for that version, with no repeated prompts for the same unchanged version. |
| 2 | Change readiness or membership, then await the next idle deadline. | The idle interval restarts from the change; a new prompt appears only for the later unchanged version. |

## Scenario

```gherkin
Feature: AC-33: Idle lobby readiness prompt
  Scenario: TEST-IDLELOBBYREADINESSPROMPT-033 design verification
    Given Room is waiting without countdown and its current membership/readiness version is recorded.
    And the fixture data is 30-second unchanged interval; one ready-state or observer membership change.
    When Keep the room version unchanged through the idle deadline.
    Then All players receive one ready prompt for that version, with no repeated prompts for the same unchanged version.
    When Change readiness or membership, then await the next idle deadline.
    Then The idle interval restarts from the change; a new prompt appears only for the later unchanged version.
```

## Boundaries

 Expected-version stale deadline jobs are a separate technical no-op assertion; this UI case covers their visible prompt consequences.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
