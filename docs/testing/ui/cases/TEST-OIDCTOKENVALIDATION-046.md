# TEST-OIDCTOKENVALIDATION-046 - AC-46: OIDC token validation

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-46: OIDC token validation. |
| QBrain reference/scope | `TEST-OIDCTOKENVALIDATION-046`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_identity_profile.svg](../../../word_association_identity_profile.svg) |
| Frame/element identifiers | ID-FLOW, ID-NODE-C, ID-TRANS-B-C, ID-TRANS-C-D, SCREEN-ENTRY, STATE-ENTRY-01, STATE-ENTRY-02, STATE-ENTRY-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-IDENTITY-018#AC-46`; `TR-IDENTITY-AUTHENTICATION-016#TR-16-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Controlled OIDC provider can issue invalid callback inputs without contacting real users. |
| Test data | Separate invalid signature, issuer, audience, state, nonce and expiry examples. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Partial: safe provider/callback fixture required; UI-DEC-03/04 now define Back/Cancel and safe failure/retry behavior. Real OpenAI provider credentials remain an execution dependency. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Choose sign-in and return each invalid callback. | Sign-in is rejected and no authenticated profile is created or associated with the unverified subject. |
| 2 | Return to public/guest entry. | The visitor can still use the documented unauthenticated path; private identity claims are not exposed. |

## Scenario

```gherkin
Feature: AC-46: OIDC token validation
  Scenario: TEST-OIDCTOKENVALIDATION-046 design verification
    Given Controlled OIDC provider can issue invalid callback inputs without contacting real users.
    And the fixture data is Separate invalid signature, issuer, audience, state, nonce and expiry examples.
    When Choose sign-in and return each invalid callback.
    Then Sign-in is rejected and no authenticated profile is created or associated with the unverified subject.
    When Return to public/guest entry.
    Then The visitor can still use the documented unauthenticated path; private identity claims are not exposed.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
