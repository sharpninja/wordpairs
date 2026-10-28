# Design questions and dependencies

The operator instructed "Fill gaps" and "The documentation should be kept in sync with reqs." [UI-DEC-01..08](decisions.md) resolve the design gaps without claiming the original diagrams already specified them.

| Prior ID | Resolution / exact remaining dependency | Canonical record/case |
| --- | --- | --- |
| Q-SCOPE-01 | Resolved: Word Pairs / PROD-WORDPAIRS created via installed plugin; first-party typed-client readback verifies exact owner/member workspace. REPL product serializer bug remains triaged and is bypassed only for product readback. | product-receipt.json |
| Q-MOD-01 | Resolved: reasoned changes_requested, proposer revision of exactly three pairs, one-open retention and pending_review resubmission with audit. | FR-REVIEWCHANGES-027 / TEST-REVIEWCHANGES-140 |
| Q-MOD-02 | Resolved: reasoned on_hold / pending_review resume, count/history retention and approval/publication prohibition. | FR-CANDIDATEHOLD-028 / TEST-CANDIDATEHOLD-141 |
| Q-NAV-01 | Resolved: Back and dialog focus restoration, memory-only same-profile draft retention, explicit Cancel/Discard and Leave, authorization revalidation. | FR-NAVIGATIONDRAFTS-029 / TEST-NAVIGATIONDRAFTS-142 |
| Q-LOAD-01 | Resolved: accessible loading/busy/empty/unavailable states, safe Retry, exact uncertain-command retry, conflict refresh and denied-data cleanup. Exact translated prose may vary while required meanings/actions remain observable. | FR-REQUESTFEEDBACK-030 / TEST-REQUESTFEEDBACK-143 |
| Q-A11Y-01 | Resolved: explicit quantitative contrast, focus/name/announcement and project44px touch-target criteria; no certification claim. | TR-UI-ACCESSIBILITYDETAILS-039 / TEST-ACCESSIBILITYDETAILS-144 |
| Q-RESP-01 | Resolved: minimum-width/orientation/zoom/text-enlargement configurations and state retention. | TR-UI-RESPONSIVEMATRIX-040 / TEST-RESPONSIVEMATRIX-145 |
| Q-ROUND-01 | Resolved UI documentation: explicit zero-solver reveal and autonomous next configured category; probability proof stays technical. | FR-ANCHORSELECTION-007#DEC-02 / TEST-NOSOLVERFALLBACK-146 |
| Q-OIDC-01 | Execution dependency: real provider registration/entitlement and safe OpenAI OIDC test identities remain necessary. This does not block requirement documentation. | TEST-OPENAIOIDCPROFILE-020 |
| Q-PWA-01 | Execution dependency: physical phones and HTTPS origin remain necessary for actual OS home-screen installation. Emulation does not close this dependency. | TEST-PWAINSTALL-137 |

The13UI gap records and49criterion entries now have scoped implementation evidence; their historical pending state is archived. Contest readiness adds10unsatisfied entries. The live2..25 matrix remains an existing uncompleted execution obligation; no result was inferred from this documentation run. Non-UI database, release, legal, deployment and statistical obligations retain separate verification coverage.

Contest release dependencies and operator eligibility attestation are tracked in [the submission checklist](../../submission/README.md); unavailable conduct text is not invented or treated as reviewed.
