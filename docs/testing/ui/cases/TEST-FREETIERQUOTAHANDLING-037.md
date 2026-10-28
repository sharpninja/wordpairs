# TEST-FREETIERQUOTAHANDLING-037 - AC-37: Free-tier quota handling

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify AC-37: Free-tier quota handling. |
| QBrain reference/scope | `TEST-FREETIERQUOTAHANDLING-037`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [word_association_game_requirements.md](../../../word_association_game_requirements.md) |
| Frame/element identifiers | SCREEN-SERVICE, STATE-SERVICE-01, STATE-SERVICE-02; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `TR-FREETIER-OPERATION-021#TR-21-C01` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | An isolated controllable fixture can make room operations return a quota/service-limit result. |
| Test data | Recoverable service-limit outcome; existing accepted score 5. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Partial: controlled quota response and safe recovery fixture required; UI cannot establish infrastructure billing behavior. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Attempt a room operation while the fixture reports quota exhaustion. | The UI reports a recoverable service-limit state; existing score remains 5. |
| 2 | Restore service and retry using the documented canonical retry behavior. | The operation can recover without duplicated state or silent paid-resource substitution. |

## Scenario

```gherkin
Feature: AC-37: Free-tier quota handling
  Scenario: TEST-FREETIERQUOTAHANDLING-037 design verification
    Given An isolated controllable fixture can make room operations return a quota/service-limit result.
    And the fixture data is Recoverable service-limit outcome; existing accepted score 5.
    When Attempt a room operation while the fixture reports quota exhaustion.
    Then The UI reports a recoverable service-limit state; existing score remains 5.
    When Restore service and retry using the documented canonical retry behavior.
    Then The operation can recover without duplicated state or silent paid-resource substitution.
```

## Boundaries



Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
