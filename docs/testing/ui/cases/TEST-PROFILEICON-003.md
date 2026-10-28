# TEST-PROFILEICON-003 - AC-03: Profile icon

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-03: Profile icon. |
| QBrain reference/scope | `TEST-PROFILEICON-003`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_identity_profile.svg](../../../word_association_identity_profile.svg); [word_association_round_flow.svg](../../../word_association_round_flow.svg) |
| Frame/element identifiers | ID-FLOW, ID-NODE-F, ID-TRANS-D-F, ID-TRANS-E-F, ID-TRANS-F-G, SCREEN-PROFILE, STATE-PROFILE-01, STATE-PROFILE-02; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-PLAYERPROFILE-002#AC-03` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice can edit her profile and join a room with Bob. |
| Test data | Select fox icon for Alice; one complete eight-round match fixture. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Select the fox icon and join the room. | Alice's lobby row shows the fox icon. |
| 2 | Play a round and inspect the live scorecard, round summary and final standings. | All four views identify Alice with the same fox icon. |

## Scenario

```gherkin
Feature: AC-03: Profile icon
  Scenario: TEST-PROFILEICON-003 design verification
    Given Alice can edit her profile and join a room with Bob.
    And the fixture data is Select fox icon for Alice; one complete eight-round match fixture.
    When Select the fox icon and join the room.
    Then Alice's lobby row shows the fox icon.
    When Play a round and inspect the live scorecard, round summary and final standings.
    Then All four views identify Alice with the same fox icon.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
