# TEST-PWAPRIVACY-138 - Real worker offline, private traffic and update safety

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify Real worker offline, private traffic and update safety. |
| QBrain reference/scope | `TEST-PWAPRIVACY-138`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [pwa_design.md](../../../pwa_design.md) |
| Frame/element identifiers | SCREEN-OFFLINE, STATE-OFFLINE-01, STATE-OFFLINE-02, STATE-OFFLINE-03; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-PHONEINSTALL-026#PWA-06`; `FR-PHONEINSTALL-026#PWA-07`; `FR-PHONEINSTALL-026#PWA-08`; `TR-PWA-CACHEPRIVACY-037#PWA-06`; `TR-PWA-CACHEPRIVACY-037#PWA-07`; `TR-PWA-CACHEPRIVACY-037#PWA-08` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | A real worker controls the page; a private room has been visited; an unrelated origin cache also exists. |
| Test data | Offline navigation, private API GET and mutation POST; pending worker update during active round. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Ready for automation once isolated UI fixture seeding and observations are available; documentation only. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Disconnect and navigate, then attempt private reads/mutations. | Navigation shows static reconnect guidance; private requests fail rather than receive cached private data or offline HTML. |
| 2 | Inspect worker caches, restore connectivity and reload through the UI. | Only static allowlisted Wordpairs resources are cached; online live site returns. |
| 3 | Install a new worker version during an active round and later activate after clients close. | No forced in-match reload/activation occurs; unrelated cache survives cleanup. |

## Scenario

```gherkin
Feature: Real worker offline, private traffic and update safety
  Scenario: TEST-PWAPRIVACY-138 design verification
    Given A real worker controls the page; a private room has been visited; an unrelated origin cache also exists.
    And the fixture data is Offline navigation, private API GET and mutation POST; pending worker update during active round.
    When Disconnect and navigate, then attempt private reads/mutations.
    Then Navigation shows static reconnect guidance; private requests fail rather than receive cached private data or offline HTML.
    When Inspect worker caches, restore connectivity and reload through the UI.
    Then Only static allowlisted Wordpairs resources are cached; online live site returns.
    When Install a new worker version during an active round and later activate after clients close.
    Then No forced in-match reload/activation occurs; unrelated cache survives cleanup.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
