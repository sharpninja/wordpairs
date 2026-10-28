# TEST-OPENAIOIDCPROFILE-020 - AC-20: OpenAI OIDC profile

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-20: OpenAI OIDC profile. |
| QBrain reference/scope | `TEST-OPENAIOIDCPROFILE-020`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_identity_profile.svg](../../../word_association_identity_profile.svg) |
| Frame/element identifiers | ID-FLOW, ID-NODE-B, ID-NODE-C, ID-NODE-D, ID-TRANS-A-B, ID-TRANS-B-C, ID-TRANS-C-D, ID-TRANS-B-E, ID-TRANS-D-F, SCREEN-ENTRY, STATE-ENTRY-01, STATE-ENTRY-02, STATE-ENTRY-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-IDENTITY-018#AC-20`; `FR-IDENTITY-018#DEC-10`; `FR-PLAYERPROFILE-002#AC-20`; `TR-IDENTITY-AUTHENTICATION-016#DEC-10` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | An approved test OIDC provider registration is available with callback configuration. |
| Test data | A synthetic returning OIDC subject and a separate new subject; fox icon. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Blocked for real-provider automation until OpenAI OIDC client registration/entitlement and safe test identities are available; use a controlled provider only with its evidence limitation disclosed. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Choose account sign-in and complete a valid Authorization Code with PKCE flow. | The returning subject loads its existing profile; the new subject receives its own profile. |
| 2 | Select fox and continue to room entry. | The authenticated profile and selected icon are used for room membership; real identity-provider name is not public. |

## Scenario

```gherkin
Feature: AC-20: OpenAI OIDC profile
  Scenario: TEST-OPENAIOIDCPROFILE-020 design verification
    Given An approved test OIDC provider registration is available with callback configuration.
    And the fixture data is A synthetic returning OIDC subject and a separate new subject; fox icon.
    When Choose account sign-in and complete a valid Authorization Code with PKCE flow.
    Then The returning subject loads its existing profile; the new subject receives its own profile.
    When Select fox and continue to room entry.
    Then The authenticated profile and selected icon are used for room membership; real identity-provider name is not public.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
