# TEST-PUBLICGAMELANDINGPAGE-043 - AC-43: Public game landing page

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-43: Public game landing page. |
| QBrain reference/scope | `TEST-PUBLICGAMELANDINGPAGE-043`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_game_requirements.md](../../../word_association_game_requirements.md); [word_association_lobby_discovery.svg](../../../word_association_lobby_discovery.svg) |
| Frame/element identifiers | ID-FLOW, ID-NODE-A, ID-TRANS-A-B, SCREEN-LANDING, STATE-LANDING-01, STATE-LANDING-02, STATE-LANDING-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-PUBLICLANDING-022#AC-43`; `FR-PUBLICLANDING-022#DEC-19`; `TR-LANDING-PRIVACY-030#DEC-19` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Visitor is signed out and a public-data fixture includes leaderboard/lobby results. |
| Test data | Alias Oak wins 10 points 100; Ash wins 9 points 200; opted-out Pine; public lobby 1/2; empty and unavailable variants. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Open the landing page while signed out. | Leaderboard, public lobbies and versioned rules are visible; Oak ranks above Ash by wins; Pine is omitted. |
| 2 | Repeat with empty data and unavailable service. | Usable empty/unavailable states are shown; private room code and player-specific state never appear. |
| 3 | Change the isolated public data source and await the documented refresh periods. | Lobby data refreshes on the15-second cadence and leaderboard on the five-minute cadence; rules include version and updated date. |

## Scenario

```gherkin
Feature: AC-43: Public game landing page
  Scenario: TEST-PUBLICGAMELANDINGPAGE-043 design verification
    Given Visitor is signed out and a public-data fixture includes leaderboard/lobby results.
    And the fixture data is Alias Oak wins 10 points 100; Ash wins 9 points 200; opted-out Pine; public lobby 1/2; empty and unavailable variants.
    When Open the landing page while signed out.
    Then Leaderboard, public lobbies and versioned rules are visible; Oak ranks above Ash by wins; Pine is omitted.
    When Repeat with empty data and unavailable service.
    Then Usable empty/unavailable states are shown; private room code and player-specific state never appear.
    When Change the isolated public data source and await the documented refresh periods.
    Then Lobby data refreshes on the15-second cadence and leaderboard on the five-minute cadence; rules include version and updated date.
```

## Boundaries

Also vary equal wins using total points, earliest win and stable profile ID; exact empty/error copy remains unspecified.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
