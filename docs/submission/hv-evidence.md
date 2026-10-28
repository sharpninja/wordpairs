# Hostile-validation evidence archive

The [hash index](hv-index.json) points to the original review receipts and supporting manifests. It includes Phase0–6, administration, PWA, maintenance, UI documentation and the ongoing UI implementation review. Original files are retained in place. JSONL record hashes include their original line endings and preserve rejected, superseded and approved rounds without filtering by outcome.

The current [UI review history](../evidence/ui-gaps/hostile-validation.jsonl) is append-only. Earlier rounds reconstructed from available conversation summaries are expressly labeled; missing transcripts, source hashes and scores are not invented. Append corrections and later dispositions as new events. Never edit an old approval to imply it covers later source changes.

Before submission, freeze the exact source/configuration/package/assets and relevant test inventory; record its immutable commit/tree or complete content-hash manifest. Join each reported test execution and final hostile review to that exact inventory. Preserve failing and superseded evidence alongside passing runs. Review changes after a tested snapshot before extending approval to them. Refresh the index after the final append and freeze its digest with the submission artifacts; the index cannot hash itself. A changed receipt hash is a reason to inspect the append history, not to discard earlier records.

This index is an archive inventory, not approval of the current application, entrant eligibility, contest entry or deployment. Historical approvals retain their original scope and limitations. At initial archive creation, the UI review required race repairs and matching evidence; later dated dispositions below supersede that status. The separate live2–25-player UI obligation remains outstanding; disposable SQL service games do not establish that UI result. Mock HTTP browser fixtures, actual database tests, real transport tests, visual inspection and physical-phone/provider validation must remain distinct evidence tiers. No physical-device or authenticated-mission result is inferred.

Only repository review artifacts and supporting manifests are indexed. Do not add private session logs, runtime credentials, database URLs containing secrets, browser profiles or raw core dumps to submission material. Existing receipts remain unchanged; links to local runtime evidence are historical references and do not imply that private files should be copied into the submission.

## Review update: repaired races

The subsequent `ui-source-rereview-races-repaired` event records that source inspection resolved the two outstanding races. This supersedes the earlier race-repair status above without erasing it. Final approval still awaits complete browser/build evidence, synchronized documentation/readback and a frozen source/evidence snapshot.

## Final-evidence review update

The `ui-final-evidence-room-error-finding` event preserves a new rejection for UI-HV-007: raw RoomSession parse/network exception rendering. Prior race fixes remain resolved. Final approval awaits that repair, matching source/evidence and export linkage; earlier status paragraphs are historical.

## Scoped implementation approval

The `ui-implementation-final-approval` event resolves UI-HV-007 and approves the UI extension at99accuracy/99completeness for the234-file manifest with SHA256 `2728c24a17214fa06d1e4de9af4742f1a466ba736e922e88bb6a6c932784b0f8`. Earlier rejections remain preserved. This supersedes the implementation pending status above; wiki publication linkage, contest readiness and real live2–25UI execution remain separate obligations.
