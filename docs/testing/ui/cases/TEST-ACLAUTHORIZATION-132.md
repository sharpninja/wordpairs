# TEST-ACLAUTHORIZATION-132 - Verify Server-authoritative ACL transactions

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify Verify Server-authoritative ACL transactions. |
| QBrain reference/scope | `TEST-ACLAUTHORIZATION-132`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [admin_acl_design.md](../../../admin_acl_design.md) |
| Frame/element identifiers | SCREEN-USERS, STATE-USERS-01, STATE-USERS-02, STATE-USERS-03, STATE-USERS-04, STATE-USERS-05; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ACCESSCONTROL-024#FR-24-C01`; `FR-ACCESSCONTROL-024#FR-24-C02`; `FR-ACCESSCONTROL-024#FR-24-C03`; `FR-ACCESSCONTROL-024#FR-24-C04` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Synthetic existing profiles have player/moderator/senior/admin roles; configured admin IDs are server-only. |
| Test data | Admin Ada; moderator Mo; senior Sam; player Pat; server-configured Ada; reason Fixture role grant. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | As Ada grant moderator to Pat with a reason; open staff pages as Pat; revoke that role and retry. | Grant enables only moderation/word editing; revocation denies new privileged actions and history retains reason. |
| 2 | Try user management as Mo/Sam and removal of configured/final administrator through the UI. | Only administrators manage roles; configured admin and final effective admin cannot be revoked. |
| 3 | Inspect bounded user directory/history. | Only permitted profile metadata/effective roles appear; emails, OIDC subjects and credentials are absent. |

## Scenario

```gherkin
Feature: Verify Server-authoritative ACL transactions
  Scenario: TEST-ACLAUTHORIZATION-132 design verification
    Given Synthetic existing profiles have player/moderator/senior/admin roles; configured admin IDs are server-only.
    And the fixture data is Admin Ada; moderator Mo; senior Sam; player Pat; server-configured Ada; reason Fixture role grant.
    When As Ada grant moderator to Pat with a reason; open staff pages as Pat; revoke that role and retry.
    Then Grant enables only moderation/word editing; revocation denies new privileged actions and history retains reason.
    When Try user management as Mo/Sam and removal of configured/final administrator through the UI.
    Then Only administrators manage roles; configured admin and final effective admin cannot be revoked.
    When Inspect bounded user directory/history.
    Then Only permitted profile metadata/effective roles appear; emails, OIDC subjects and credentials are absent.
```

## Boundaries

UI consequences do not prove concurrent cross-revocation serialization, atomic audit or private environment handling; retain separate technical evidence.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
