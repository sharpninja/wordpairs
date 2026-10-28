# TEST-INROUNDEMOJIREACTION-029 - AC-29: In-round emoji reaction

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-29: In-round emoji reaction. |
| QBrain reference/scope | `TEST-INROUNDEMOJIREACTION-029`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_client_message_flow.svg](../../../word_association_client_message_flow.svg) |
| Frame/element identifiers | MSG-M19, MSG-M20, MSG-M21, MSG-M22, MSG-FLOW; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-REACTIONS-021#AC-29`; `FR-REACTIONS-021#DEC-18`; `TR-REACTION-DELIVERY-019#DEC-18` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice, Bob and observer Eve share an active round. |
| Test data | Approved menu 👍 ❤️ 😂 🎉 👀; select 🎉; initial scores and stage recorded. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | As Alice select 🎉 from the menu and observe Bob and Eve. | The same reaction appears to players and observers in real time. |
| 2 | Inspect scores/stage, then observe expiry and rate boundary in separate examples. | Scores/stage do not change; reaction expires at 5 seconds; a second reaction before 2 seconds is denied and at 2 seconds is allowed. |

## Scenario

```gherkin
Feature: AC-29: In-round emoji reaction
  Scenario: TEST-INROUNDEMOJIREACTION-029 design verification
    Given Alice, Bob and observer Eve share an active round.
    And the fixture data is Approved menu 👍 ❤️ 😂 🎉 👀; select 🎉; initial scores and stage recorded.
    When As Alice select 🎉 from the menu and observe Bob and Eve.
    Then The same reaction appears to players and observers in real time.
    When Inspect scores/stage, then observe expiry and rate boundary in separate examples.
    Then Scores/stage do not change; reaction expires at 5 seconds; a second reaction before 2 seconds is denied and at 2 seconds is allowed.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
