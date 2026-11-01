# TEST-ADMINUI-136 - Administration browser flows and private-state invalidation

Current release supersession: [owner-only GitHub admin cases](../../../admin_pwa_release.md). Only verified sharpninja can access administration; /admin/users and its API no longer provide delegation. Public /content is inactive. The historical multi-role cases below retain their original evidence; the current TEST record carries updated unsatisfied release criteria pending final review.


## Current local rendered decision evidence - 30 October 2026

Traceability remains `FR-ADMINPAGES-023#FR-23-C01` and
`TEST-ADMINUI-136#FR-23-C01`; no acceptance criterion or satisfaction state is
added or changed by this supplement. Current owner-only release obligations
remain in progress and unsatisfied where already marked. The historical
multi-role scenarios below are not restored as current public features.

The seven added Chromium cases in `tests/browser/admin.phase6.spec.ts` use the
independent HTTP snapshots in `tests/browser/admin-decision-fixture.ts`. They
render the actual administration UI with a synthetic owner session and isolated
pending/appealed legacy content. They do not authenticate GitHub or exercise
PostgreSQL authority. The fixture and the test's expected semantic outcomes are
separate; the snapshot provider imports no production policy or projection.

Use case `legacy-decision-case` / `Legacy Orbit`, ten nominations, aggregate
version 7, and reason `Reviewed the retained legacy evidence.`. Search and status
filters must remove `Unrelated legacy case`; an opposite-result filter must show
the explicit empty state after the decision. Expand history before and after the
write. Await visible conditions, the matching POST response and the changed
status; use no fixed sleeps. Close owned browser contexts; fixture state is
context-local and no real content is reset.

- **Approve/reject:** submit the selected review decision once. Assert HTTP 200,
  a nonempty command ID, actor `owner`, expected version 7, exact case/reason and
  selected decision. The rendered status and reason match; the visible audit
  contains the exact actor, revision 1, pending-to-result transition and ten
  nominations. Approval is eligible for curation and remains unplayable.
- **Independent legacy appeal:** uphold or overturn a rejection originally made
  by `legacy-reviewer` and appealed by `legacy-proposer`. Assert the exact resolve
  outcome, rejected/approved result, preserved two-entry prior history, and a
  visible revision-3 upheld/overturned audit by `owner`. Old review/resolve
  approval and overturn controls disappear and exactly one POST occurred. Overturn still does not make
  the content playable.
- **Owner is original reviewer or proposer:** the appealed case retains its exact
  status/history, both appeal-resolution buttons are absent, and no POST occurs.
  These rendered capability checks use disclosed HTTP fixtures; server-side
  denial and provider identity remain separate evidence.
- **Five wrong-provider controls:** the same semantic oracle must reject
  `approve/wrong-status`, `reject/wrong-reason`, `overturn/missing-history`,
  `original-reviewer/self-resolution` and `proposer/self-resolution`. Each caught
  failure must identify `FR-23-C01 semantic outcome`; an unrelated timeout is not
  accepted as a successful negative control. These are expected rejection checks
  inside one passing test, not unresolved test failures.

```gherkin
Scenario Outline: Owner decisions retain the existing case and audit
  Given the isolated owner can decide the pending or independently appealed Legacy Orbit case
  When the owner submits <decision> with the exact retained-evidence reason
  Then exactly one command names the owner, case and expected aggregate version 7
  And the rendered result is <status> with the exact reason and ordered decision history
  And the content remains unplayable
  Examples:
    | decision | status   |
    | approve  | approved |
    | reject   | rejected |
    | uphold   | rejected |
    | overturn | approved |

Scenario Outline: An involved owner cannot resolve their own legacy appeal
  Given the owner is the case's <relationship>
  When the owner opens the appealed case
  Then no uphold or overturn control is rendered
  And the original history remains unchanged and no command is sent
  Examples:
    | relationship      |
    | original reviewer |
    | proposer          |
```

Retained local receipts are `docs/evidence/release15/admin-decision-ui/`:
`assertion-gate-v3` run `533871c8-fbbb-48d8-a144-e43c946443ef` contains 7 passed,
0 failed, 0 skipped; `admin-file-v3` run
`fcaf5626-b63c-4f5f-abc1-fcfbd6bf18bc` contains all 11 administration cases passed,
0 failed, 0 skipped. Each directory retains `invocation.json`, `browser.xml` and
`browser.log`, with exact test/application source hashes. The application build
is `b8400dc6f7aeb42a991861ac98e36f297eae8bb3`; the added tests are dirty and
source-hashed. This documentation sync reviewed those existing receipts and did
not rerun tests. These observations do not establish hosted success, independent
hostile approval, or completion of the compound release requirements.


Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify Administration browser flows and private-state invalidation. |
| QBrain reference/scope | `TEST-ADMINUI-136`; Word Pairs / `PROD-WORDPAIRS`; workspace `<home>/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `435be05abac5310172cfb9a9290c9d7ea0d1cbde`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
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
