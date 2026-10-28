# TEST-PWAINSTALL-137 - Manifest, icons and phone installation contracts

Linked specification for the matching authoritative QBrain TEST record. Persistence is reported by [receipt.json](../receipt.json); this documentation run executed no application tests.

| Field | Specification |
| --- | --- |
| Objective | Verify Manifest, icons and phone installation contracts. |
| QBrain reference/scope | `TEST-PWAINSTALL-137`; Word Pairs / `PROD-WORDPAIRS`; workspace `/home/sharpninja/github/WordGame/.mcpServer/wordpairs`; layer `layer-1` |
| Source revision | Original designs at `3273c121de6517aec34503d8c769b0159e9e52df`; exact dirty prose/decision hashes in [sources.json](../sources.json). New UI-DEC decisions derive from the operator instruction to fill gaps. |
| Source links | [pwa_design.md](../../../pwa_design.md) |
| Frame/element identifiers | SCREEN-INSTALL, STATE-INSTALL-01, STATE-INSTALL-02, STATE-INSTALL-03, STATE-INSTALL-04, STATE-INSTALL-05, STATE-INSTALL-06; exact SVG anchors are listed in [coverage.md](../coverage.md) |
| FR/TR → specific AC references | `FR-PHONEINSTALL-026#PWA-01`; `FR-PHONEINSTALL-026#PWA-02`; `FR-PHONEINSTALL-026#PWA-03`; `FR-PHONEINSTALL-026#PWA-04`; `FR-PHONEINSTALL-026#PWA-05`; `TR-PWA-INSTALLATION-036#PWA-01`; `TR-PWA-INSTALLATION-036#PWA-02`; `TR-PWA-INSTALLATION-036#PWA-03`; `TR-PWA-INSTALLATION-036#PWA-04`; `TR-PWA-INSTALLATION-036#PWA-05` |
| Priority | high |
| Platform/viewport | Phone Chromium/Android and Safari/iPhone where applicable; project matrix320x568,390x844,844x390;1280px at400%zoom and200%text enlargement. OS-native installation is a separate physical-device dependency. |
| Preconditions/roles | Phone browser opens a secure Wordpairs origin; separate native-event and unsupported-browser fixtures exist. |
| Test data | Android Chromium; iPhone Safari guidance; 390x844; dismissed/accepted/rejected native prompt fixtures. |
| Synchronization | Await the explicit observable conditions and source-defined deadlines below; no fixed sleeps. Harness timeouts do not create a product response-time SLA. |
| Cleanup | Close case-owned contexts and reset only isolated fixture accounts, rooms or content, including after failure. Preserve shared catalog and real profile data. |
| Automation readiness | Partial: synthetic browser prompt lifecycle is automatable; real OS installation requires an HTTPS origin and physical devices. |
| Basis | Specified by cited designs/QBrain; new gap behavior is specified by UI-DEC-01..08. Synthetic fixture identities/data are test configurations. |
| Execution | Not run here. Existing historical status/evidence remains unchanged; new obligations remain pending/unsatisfied. |

## Ordered actions and observable results

| Step | Action / condition | Observable expected result |
| --- | --- | --- |
| 1 | Open install help without a native prompt event, then on an insecure origin in a separate run. | Android menu/iPhone Share guidance is usable; insecure origin explains HTTPS instead of presenting a nonfunctional native prompt. |
| 2 | Provide an install event, click Install once, dismiss/reject, then supply a fresh event. | One event prompts at most once; cancellation retains manual guidance; only a fresh event enables another prompt. |
| 3 | Enter standalone/appinstalled state and simulate registration failure separately. | Install controls hide in installed mode; registration failure does not break gameplay. |
| 4 | Inspect the browser-reported install manifest, linked icon resources and Apple metadata. | Manifest has stable root identity/scope, /play standalone launch, names/colors, same-origin192/512icons and separate maskable icon; actual opaque icon dimensions/safe zone and Apple touch metadata match their declarations. |

## Scenario

```gherkin
Feature: Manifest, icons and phone installation contracts
  Scenario: TEST-PWAINSTALL-137 design verification
    Given Phone browser opens a secure Wordpairs origin; separate native-event and unsupported-browser fixtures exist.
    And the fixture data is Android Chromium; iPhone Safari guidance; 390x844; dismissed/accepted/rejected native prompt fixtures.
    When Open install help without a native prompt event, then on an insecure origin in a separate run.
    Then Android menu/iPhone Share guidance is usable; insecure origin explains HTTPS instead of presenting a nonfunctional native prompt.
    When Provide an install event, click Install once, dismiss/reject, then supply a fresh event.
    Then One event prompts at most once; cancellation retains manual guidance; only a fresh event enables another prompt.
    When Enter standalone/appinstalled state and simulate registration failure separately.
    Then Install controls hide in installed mode; registration failure does not break gameplay.
    When Inspect the browser-reported install manifest, linked icon resources and Apple metadata.
    Then Manifest has stable root identity/scope, /play standalone launch, names/colors, same-origin192/512icons and separate maskable icon; actual opaque icon dimensions/safe zone and Apple touch metadata match their declarations.
```

## Boundaries

Physical Android/iPhone home-screen installation and manifest/icon metadata are separate verification obligations, not proven by emulation.

Criterion references identify intended verification. Non-UI transaction, distribution, release/deployment and native OS guarantees retain separate technical/operational tests; this document is not a claim that a compound criterion passed.
