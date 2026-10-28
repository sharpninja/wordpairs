# TEST-GUESTPLAY-021 - AC-21: Guest play

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-21: Guest play. |
| QBrain reference/scope | `TEST-GUESTPLAY-021`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_identity_profile.svg](../../../word_association_identity_profile.svg) |
| Frame/element identifiers | ID-FLOW, ID-NODE-A, ID-NODE-B, ID-NODE-E, ID-TRANS-A-B, ID-TRANS-B-C, ID-TRANS-B-E, ID-TRANS-E-F, SCREEN-ENTRY, STATE-ENTRY-01, STATE-ENTRY-02, STATE-ENTRY-03, SCREEN-PROFILE, STATE-PROFILE-01, STATE-PROFILE-02; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-IDENTITY-018#AC-21`; `FR-IDENTITY-018#DEC-11`; `FR-PLAYERPROFILE-002#AC-21`; `FR-PLAYERPROFILE-002#DEC-11` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | A clean browser has no profile; OIDC sign-in is not used. |
| Test data | Guest browser A; separate clean browser B; selected owl icon. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Choose Continue as guest, select owl and create/join a room. | A guest identity with owl can participate without OIDC. |
| 2 | Reload browser A, then open browser B; clear A's site data and reenter. | A retains its identity until site data is cleared; B does not inherit it; cleared A receives a different guest identity. |
| 3 | Change the generated guest alias and opt out of public leaderboard display. | The profile uses the saved generated/public alias policy, honors opt-out and never exposes real provider identity; guest is not silently linked to an OIDC subject. |

## Scenario

```gherkin
Feature: AC-21: Guest play
  Scenario: TEST-GUESTPLAY-021 design verification
    Given A clean browser has no profile; OIDC sign-in is not used.
    And the fixture data is Guest browser A; separate clean browser B; selected owl icon.
    When Choose Continue as guest, select owl and create/join a room.
    Then A guest identity with owl can participate without OIDC.
    When Reload browser A, then open browser B; clear A's site data and reenter.
    Then A retains its identity until site data is cleared; B does not inherit it; cleared A receives a different guest identity.
    When Change the generated guest alias and opt out of public leaderboard display.
    Then The profile uses the saved generated/public alias policy, honors opt-out and never exposes real provider identity; guest is not silently linked to an OIDC subject.
```

## Boundaries

Guest-to-OIDC linking is not specified and must not be assumed.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
