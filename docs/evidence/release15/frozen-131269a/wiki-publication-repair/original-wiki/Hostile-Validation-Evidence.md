# Hostile-validation evidence archive

The [hash index](hv-index.json) points to the original review receipts and supporting manifests. It includes Phase0–6, administration, PWA, maintenance, UI documentation and the ongoing UI implementation review. Original files are retained in place. JSONL record hashes include their original line endings and preserve rejected, superseded and approved rounds without filtering by outcome.

The current [UI review history](../evidence/ui-gaps/hostile-validation.jsonl) is append-only. Earlier rounds reconstructed from available conversation summaries are expressly labeled; missing transcripts, source hashes and scores are not invented. Append corrections and later dispositions as new events. Never edit an old approval to imply it covers later source changes.

Before submission, freeze the exact source/configuration/package/assets and relevant test inventory; record its immutable commit/tree or complete content-hash manifest. Join each reported test execution and final hostile review to that exact inventory. Preserve failing and superseded evidence alongside passing runs. Review changes after a tested snapshot before extending approval to them. Refresh the index after the final append and freeze its digest with the submission artifacts; the index cannot hash itself. A changed receipt hash is a reason to inspect the append history, not to discard earlier records.

This index is an archive inventory, not approval of the current application, entrant eligibility, contest entry or deployment. Historical approvals retain their original scope and limitations. At initial archive creation, the UI review required race repairs and matching evidence; later dated dispositions below supersede that status. The current actual multiplayer UI obligation covers every player count 2 through 15 under the [30 October release amendment](../release15-completion-plan.md); earlier 25-player obligations and failures remain historical. Disposable SQL service games do not establish that UI result. Mock HTTP browser fixtures, actual database tests, real transport tests, visual inspection and physical-phone/provider validation must remain distinct evidence tiers. No physical-device or authenticated-mission result is inferred.

Only repository review artifacts and supporting manifests are indexed. Do not add private session logs, runtime credentials, database URLs containing secrets, browser profiles or raw core dumps to submission material. Existing receipts remain unchanged; links to local runtime evidence are historical references and do not imply that private files should be copied into the submission.

## Review update: repaired races

The subsequent `ui-source-rereview-races-repaired` event records that source inspection resolved the two outstanding races. This supersedes the earlier race-repair status above without erasing it. Final approval still awaits complete browser/build evidence, synchronized documentation/readback and a frozen source/evidence snapshot.

## Final-evidence review update

The `ui-final-evidence-room-error-finding` event preserves a new rejection for UI-HV-007: raw RoomSession parse/network exception rendering. Prior race fixes remain resolved. Final approval awaits that repair, matching source/evidence and export linkage; earlier status paragraphs are historical.

## Scoped implementation approval

The `ui-implementation-final-approval` event resolves UI-HV-007 and approves the UI extension at99accuracy/99completeness for the234-file manifest with SHA256 `2728c24a17214fa06d1e4de9af4742f1a466ba736e922e88bb6a6c932784b0f8`. Earlier rejections remain preserved. This supersedes the implementation pending status above for that candidate only. Wiki publication linkage, contest readiness and real live2–25UI execution were separate obligations at that review; the player-count obligation was later amended to 2 through 15 without changing this historical approval.

## Current release amendment: 30 October 2026

The [current completion plan](../release15-completion-plan.md) and [guest/admin contract](../admin_pwa_release.md) define a guest-only public game for 2 through 15 players, a separate 25-observer limit, private GitHub administration for `sharpninja`, and an admin-only PWA. Retired public OpenAI sign-in, member and public-PWA reviews retain their original source scope; no old approval extends to the current release by implication.

The current scale matrix uses actual private Realtime with ordinary safety polling. Its 14 complete eight-round UI games require 119 player participations and 952 accepted solves with at most two simultaneous answers and verified cleanup. Keep strict two-player/observer push, reconnect and renewal evidence with polling suppressed separate from the scale matrix and from the actual Realtime integration lane. Historical 20/25-player failures remain available and are not rewritten as successful runs.

The [frozen-source serial validation receipt](../evidence/release15/frozen-b8400dc/full-serial/validation.json) records local typecheck, lint, build and native reports for 632 unit, 61 PostgreSQL and 79 browser cases at `b8400dc6f7aeb42a991861ac98e36f297eae8bb3`, each with zero failures/skips. It establishes its stated local checks, not the outstanding actual multiplayer lanes, a hostile verdict or hosted deployment. Later edits need their own provenance and review.

The operator's [current reviewer selection](../evidence/release15/reviewer-selection.json) is Cline with model Beam and High effort until Monday, 2 November 2026, with no exact cutoff hour specified. Verify actual runtime identity, retain full request/response JSONL and the entire verdict in a read-back MCP turn, and require independent AGREE with accuracy and completeness each at least 98 percent before tracked completion. Selection is not execution or approval. Historical Claude rounds, including the last DISAGREE at 97/95, remain preserved. Fresh actual Realtime/UI evidence, review and hosted verification are still release obligations at this amendment.

Refresh the archive inventory after new retained review receipts are appended, then bind its digest and the [current contest checklist](README.md) to the actual submission candidate. Neither this amendment nor any review accepts legal terms or submits the contest entry; authenticated mission/conduct content and manual entrant actions remain explicit gaps.
