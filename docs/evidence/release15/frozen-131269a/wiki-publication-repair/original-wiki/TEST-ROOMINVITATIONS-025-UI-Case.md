# TEST-ROOMINVITATIONS-025 - AC-25: Room invitations

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-25: Room invitations. |
| QBrain reference/scope | `TEST-ROOMINVITATIONS-025`; Word Pairs / `PROD-WORDPAIRS`; workspace `<home>/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `435be05abac5310172cfb9a9290c9d7ea0d1cbde`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_room_creation.svg](../../../word_association_room_creation.svg) |
| Frame/element identifiers | ROOM-FLOW, ROOM-NODE-C, ROOM-NODE-G, ROOM-TRANS-C-D, ROOM-TRANS-B-G, ROOM-TRANS-G-D, MSG-M01, MSG-M02, SCREEN-JOIN, STATE-JOIN-01, STATE-JOIN-02, STATE-JOIN-03, STATE-JOIN-04, STATE-JOIN-05; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYDISCOVERY-019#AC-25`; `FR-LOBBYLIFECYCLE-003#AC-25`; `FR-ROOMACCESS-001#AC-25` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice is already a player in an active room; Bob and Cara have independent profiles. |
| Test data | The room's generated code and inviter-bound signed deep link. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | As Alice share the code to Bob and link to Cara. | Both invitation forms refer to Alice's intended room. |
| 2 | Join as Bob by code and Cara by link when seats are open. | Both enter that same room subject to its configured capacity. |

## Scenario

```gherkin
Feature: AC-25: Room invitations
  Scenario: TEST-ROOMINVITATIONS-025 design verification
    Given Alice is already a player in an active room; Bob and Cara have independent profiles.
    And the fixture data is The room's generated code and inviter-bound signed deep link.
    When As Alice share the code to Bob and link to Cara.
    Then Both invitation forms refer to Alice's intended room.
    When Join as Bob by code and Cara by link when seats are open.
    Then Both enter that same room subject to its configured capacity.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.

## Invitation clipboard extension

The operator requested the room action **Copy Invitation Link** on 28 October 2026.
QBrain records the new, unsatisfied criteria as
`FR-LOBBYDISCOVERY-019#INVITE-COPY-01` and
`FR-LOBBYDISCOVERY-019#INVITE-COPY-02` and
`FR-LOBBYDISCOVERY-019#INVITE-COPY-03`, with matching criteria on this TEST record.
The original AC-25 and its historical evidence are preserved.

The player selects **Copy Invitation Link**. The client requests a new
inviter-bound link, displays it and attempts to copy it. Successful copying
announces “Invitation link copied.” If clipboard access is unavailable or denied,
the displayed, selectable link remains available and the page announces that the
player can copy it manually. No clipboard success is reported when the write fails.
If link creation fails or returns no link, no new link is shown or copied, no
copy-success confirmation is announced, and an accessible error is shown.

The automated cases are in
[`invitation-copy.phase2.spec.ts`](../../../../tests/browser/invitation-copy.phase2.spec.ts).
They use the real rendered room screen with synthetic network responses; success,
text-only clipboard support and denial are isolated fixtures, while a separate
Chromium case writes and reads the actual browser clipboard. The mock gate also
rejects corrupted copied/displayed link outcomes. These tests do not establish
clipboard permission behavior on every physical phone or browser.

```gherkin
Scenario: INVITE-COPY-01 copies a generated invitation
  Given a player is in an active room and clipboard access is available
  When the player selects Copy Invitation Link
  Then the generated inviter-bound link is displayed
  And that exact link is on the clipboard
  And the page announces "Invitation link copied."

Scenario: INVITE-COPY-02 retains a link after clipboard denial
  Given a player is in an active room and clipboard access is denied
  When the player selects Copy Invitation Link
  Then the generated link remains selectable
  And the page explains that it can be copied manually

Scenario: INVITE-COPY-03 reports invitation creation failure
  Given a player is in an active room
  When invitation creation fails
  Then no new invitation is displayed or copied
  And the page shows an error instead of a copy-success confirmation
```

The current criteria remain unsatisfied until final suite and independent review
evidence is recorded in QBrain.
