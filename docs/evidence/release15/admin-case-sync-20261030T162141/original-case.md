# TEST-ADMINUI-136 - Administration browser flows and private-state invalidation

Current release supersession: [owner-only GitHub admin cases](../../../admin_pwa_release.md). Only verified sharpninja can access administration; /admin/users and its API no longer provide delegation. Public /content is inactive. The historical multi-role cases below retain their original evidence; the current TEST record carries updated unsatisfied release criteria pending final review.


Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify Administration browser flows and private-state invalidation. |
| QBrain reference/scope | `TEST-ADMINUI-136`; Word Pairs / `PROD-WORDPAIRS`; workspace `<home>/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [admin_acl_design.md](../../../admin_acl_design.md) |
| Frame/element identifiers | SCREEN-ADMIN, STATE-ADMIN-01, STATE-ADMIN-02, STATE-ADMIN-03, STATE-ADMIN-04, STATE-ADMIN-05, SCREEN-WORDS, STATE-WORDS-01, STATE-WORDS-02, STATE-WORDS-03, STATE-WORDS-04, STATE-WORDS-05, SCREEN-USERS, STATE-USERS-01, STATE-USERS-02, STATE-USERS-03, STATE-USERS-04, STATE-USERS-05; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-ADMINPAGES-023#FR-23-C01`; `FR-ADMINPAGES-023#FR-23-C02`; `FR-ADMINPAGES-023#FR-23-C03`; `FR-ADMINPAGES-023#FR-23-C04` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Independent player, moderator, senior and administrator profiles exist with pending/appealed/approved/completed content. |
| Test data | Routes /admin, /admin/words, /admin/users; searchable synthetic aliases; reason Fixture review. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Visit all three routes as player and then each authorized staff role; search/filter queue, words and user directory. | Player sees denied state; role-appropriate bounded records/controls appear; no private records leak. |
| 2 | Make a reasoned permitted decision; inspect history; simulate authorization loss while an older GET remains pending. | History retains the decision; a late old response cannot restore private data after denial. |
| 3 | Simulate an uncertain write, retry the pending operation, and use forms at 390x844. | Retry preserves command identity, successful draft clears once, no duplicate write is shown, and phone forms remain operable. |

## Scenario

```gherkin
Feature: Administration browser flows and private-state invalidation
  Scenario: TEST-ADMINUI-136 design verification
    Given Independent player, moderator, senior and administrator profiles exist with pending/appealed/approved/completed content.
    And the fixture data is Routes /admin, /admin/words, /admin/users; searchable synthetic aliases; reason Fixture review.
    When Visit all three routes as player and then each authorized staff role; search/filter queue, words and user directory.
    Then Player sees denied state; role-appropriate bounded records/controls appear; no private records leak.
    When Make a reasoned permitted decision; inspect history; simulate authorization loss while an older GET remains pending.
    Then History retains the decision; a late old response cannot restore private data after denial.
    When Simulate an uncertain write, retry the pending operation, and use forms at 390x844.
    Then Retry preserves command identity, successful draft clears once, no duplicate write is shown, and phone forms remain operable.
```

## Boundaries

## Navigation regression extension — 28October2026

Traceability: `FR-ADMINPAGES-023#FR-23-C05` →
`TR-ACL-AUTHORIZATION-032` → `TEST-ADMINUI-136`. Source: operator's hosted
UI defect report and [permission-aware navigation design](../../../admin_acl_design.md).
Inspect both `/play` profile details and direct `/admin` entry as anonymous,
ordinary player, moderator and administrator. Only effective server permissions
may enable links: moderation and content for moderators; users/access only for
administrators. Await the verified session response; no fixed sleeps. Revoke
roles, return focus, fail a refresh, and sign out; links must disappear. Delay
guest POST and sign-out DELETE while focusing the tab; a stale GET must not
restore the former identity or links. Clean up only fixture browser contexts.

Automation: `tests/browser/auth-navigation.phase6.spec.ts` uses real rendered
pages with isolated HTTP session/content ports; `tests/web/identity-navigation.test.ts`
provides deterministic deferred-response race checks. The browser regression and
existing administration suite passed10/10; API/React targeted checks passed14/14.
These fixtures do not prove real OpenAI registration or provider sign-in.

```gherkin
Scenario: Administration navigation follows current server permissions
  Given an ordinary player has a verified session with no management permissions
  When they open profile details and then visit the administration page directly
  Then no administration navigation links are rendered
  And the administration page states that moderation access is required
  When an administrator opens the same pages in an independent authorized session
  Then moderation, word-pair management and user-access links are available
  When that administrator signs out while a focus event occurs
  Then their old profile and all administration links remain absent
```



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
