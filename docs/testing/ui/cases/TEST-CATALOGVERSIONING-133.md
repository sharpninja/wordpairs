# TEST-CATALOGVERSIONING-133 - Verify Immutable and bounded catalog publication

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify Verify Immutable and bounded catalog publication. |
| QBrain reference/scope | `TEST-CATALOGVERSIONING-133`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [admin_acl_design.md](../../../admin_acl_design.md) |
| Frame/element identifiers | SCREEN-WORDS, STATE-WORDS-01, STATE-WORDS-02, STATE-WORDS-03, STATE-WORDS-04, STATE-WORDS-05; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-WORDHINTEDITOR-025#FR-25-C01`; `FR-WORDHINTEDITOR-025#FR-25-C02`; `FR-WORDHINTEDITOR-025#FR-25-C03`; `FR-WORDHINTEDITOR-025#FR-25-C04` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Mo may edit words; an active round holds pair Hot/Cold version 0; future games can select published versions. |
| Test data | Exactly 3 ordered hints; replacement target Chilly; invalid 2/4 hints; reason Fixture edit. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Save invalid 2-hint and 4-hint versions, then a complete 3-hint next revision. | Invalid saves do not mutate content; valid edit appends the next version without moving categories. |
| 2 | Observe the active round, start a future round, and exclude latest pair with a reason. | Active round retains version 0; future pool uses highest selectable version and never falls back to an older excluded version. |
| 3 | Try excluding the last playable initial-category pair and publishing at the 4096-version ceiling. | Both are rejected without deleting history or emptying the category. |

## Scenario

```gherkin
Feature: Verify Immutable and bounded catalog publication
  Scenario: TEST-CATALOGVERSIONING-133 design verification
    Given Mo may edit words; an active round holds pair Hot/Cold version 0; future games can select published versions.
    And the fixture data is Exactly 3 ordered hints; replacement target Chilly; invalid 2/4 hints; reason Fixture edit.
    When Save invalid 2-hint and 4-hint versions, then a complete 3-hint next revision.
    Then Invalid saves do not mutate content; valid edit appends the next version without moving categories.
    When Observe the active round, start a future round, and exclude latest pair with a reason.
    Then Active round retains version 0; future pool uses highest selectable version and never falls back to an older excluded version.
    When Try excluding the last playable initial-category pair and publishing at the 4096-version ceiling.
    Then Both are rejected without deleting history or emptying the category.
```

## Boundaries

Actual immutable persistence and atomic ceiling checks need separate database evidence, not just the form outcome.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
