# TEST-LANDINGPAGEPUBLICDATA-050 - AC-50: Landing-page public data

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-50: Landing-page public data. |
| QBrain reference/scope | `TEST-LANDINGPAGEPUBLICDATA-050`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_game_requirements.md](../../../word_association_game_requirements.md) |
| Frame/element identifiers | SCREEN-LANDING, STATE-LANDING-01, STATE-LANDING-02, STATE-LANDING-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-PUBLICLANDING-022#AC-50`; `FR-PUBLICLANDING-022#DEC-19`; `TR-LANDING-PRIVACY-030#DEC-19` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Anonymous public fixture contains opted-in generated aliases and private room/player content. |
| Test data | Known sentinel room code, OIDC subject, guess, target, moderation reason and secret absent from public projection. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Open anonymous leaderboard/lobbies/rules and inspect the public representation. | Only allowed lifetime ranking fields, generated aliases, exact counts/capacity, waiting state, age and rules version are present. |
| 2 | Search all rendered public content and authorized public response fields for sentinels. | No room code, real identity, private game/observer view, moderation record or secret is exposed. |

## Scenario

```gherkin
Feature: AC-50: Landing-page public data
  Scenario: TEST-LANDINGPAGEPUBLICDATA-050 design verification
    Given Anonymous public fixture contains opted-in generated aliases and private room/player content.
    And the fixture data is Known sentinel room code, OIDC subject, guess, target, moderation reason and secret absent from public projection.
    When Open anonymous leaderboard/lobbies/rules and inspect the public representation.
    Then Only allowed lifetime ranking fields, generated aliases, exact counts/capacity, waiting state, age and rules version are present.
    When Search all rendered public content and authorized public response fields for sentinels.
    Then No room code, real identity, private game/observer view, moderation record or secret is exposed.
```

## Boundaries

Response inspection is an observation seam for public confidentiality, independent of selector/driver choices.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
