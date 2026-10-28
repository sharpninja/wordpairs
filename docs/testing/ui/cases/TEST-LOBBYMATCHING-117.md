# TEST-LOBBYMATCHING-117 - Discovery seat loss returns to refreshed browsing

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json). Current implementation evidence is in [implementation-receipt.json](../implementation-receipt.json); the original documentation-only snapshot is retained under archive/design-20261027/.

| Field | Specification |
| --- | --- |
| Objective | Verify Discovery seat loss returns to refreshed browsing. |
| QBrain reference/scope | `TEST-LOBBYMATCHING-117`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [decisions.md](../decisions.md); [word_association_lobby_discovery.svg](../../../word_association_lobby_discovery.svg) |
| Frame/element identifiers | GAP-FLOW-LOBBYMATCHING, GAP-TRANS-LOBBYMATCHING-01, GAP-TRANS-LOBBYMATCHING-02; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-LOBBYDISCOVERY-019#AC-23`; `TR-LOBBY-MATCHING-017#TR-17-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Alice sees a discoverable room with one free seat; Bob can fill that seat before Alice commits. |
| Test data | Capacity2; one initial member; Alice and Bob separate profiles. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Automated isolated browser integration and supporting application/SQL checks executed; operational boundaries remain separate. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Executed applicable UI-DEC variants in Chromium with real React and isolated HTTP/application/domain fixtures; real disposable PostgreSQL covers persistence/audit. See [execution receipt](../implementation-receipt.json). This is the documented recovery variant, not a claim that every historical compound obligation was rerun. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Open discovery as Alice, fill the last seat as Bob, then request that seat as Alice. | Alice is not admitted or shown a false success; capacity remains2 and refreshed browsing replaces the stale listing. |
| 2 | Repeat by opening a valid direct invitation to the now-full room. | The invitee receives the observer choice rather than a player seat. |

## Scenario

```gherkin
Feature: Discovery seat loss returns to refreshed browsing
  Scenario: TEST-LOBBYMATCHING-117 design verification
    Given Alice sees a discoverable room with one free seat; Bob can fill that seat before Alice commits.
    And the fixture data is Capacity2; one initial member; Alice and Bob separate profiles.
    When Open discovery as Alice, fill the last seat as Bob, then request that seat as Alice.
    Then Alice is not admitted or shown a false success; capacity remains2 and refreshed browsing replaces the stale listing.
    When Repeat by opening a valid direct invitation to the now-full room.
    Then The invitee receives the observer choice rather than a player seat.
```

## Boundaries

Existing requirement, newly explicit UI scenario; no change to historical evidence or status.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.

## Implementation evidence

[Implementation snapshot and tiered results](../implementation.md), [hashed source inventory](../implementation-manifest.json), and [raw execution logs](../../../evidence/ui-gaps/) bind this case to the current tested implementation. Browser journeys use actual pages and real application/domain services behind isolated HTTP/persistence/time ports. They do not establish physical screen-reader behavior, native phone install, real OIDC, deployed availability or real private-push2..25UI delivery. Reflow at400% is the documented320CSS-pixel equivalent, not a physical browser-zoom certification.
