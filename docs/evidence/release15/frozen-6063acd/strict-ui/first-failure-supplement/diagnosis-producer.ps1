#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-6063acd/strict-ui/first-failure-supplement'
$own=Get-Content -LiteralPath /tmp/wordpairs-strict606-session.json -Raw|ConvertFrom-Json
$pins=@(foreach($relative in @('tests/browser/live-multiplayer.integration.spec.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/ui-command-acknowledgement.ts','tests/browser/ui-command-capture.ts','src/web/room-screen.tsx','src/web/game-panel.tsx','playwright.live.config.ts','docs/evidence/release15/operational-producers/RunWordpairsRelease15Evidence.ps1','docs/evidence/release15/strict-entry/plan.md')){
 $path=Join-Path $repo $relative
 [ordered]@{path=$relative;sha256=(Get-FileHash -LiteralPath $path).Hash;bytes=(Get-Item -LiteralPath $path).Length}
})
$normal=[xml](Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/frozen-6063acd/live-ui/live-ui.xml') -Raw)
$strict=[xml](Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/frozen-6063acd/strict-ui/strict-ui.xml') -Raw)
$normalCases=@($normal.SelectNodes('//testcase'))
$strictCases=@($strict.SelectNodes('//testcase'))
$entry=$strictCases[0]
$nativeFailure=$entry.SelectSingleNode('failure')
if(-not $nativeFailure){$nativeFailure=$entry.SelectSingleNode('error')}
$observationPath=Join-Path $folder 'strict-observations-amendment/live-ui-observations.json'
$observation=Get-Content -LiteralPath $observationPath -Raw|ConvertFrom-Json
$diagnosis=[ordered]@{
 atLocal=(Get-Date -Format s);head=(& git -C $repo rev-parse HEAD).Trim();sessionId=$own.sessionId;requestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId
 classification='Read-only test-harness diagnosis and plan; not implementation, runtime repair proof, hostile validation or release acceptance'
 native=[ordered]@{normalCases=$normalCases.Count;normalFailures=@($normal.SelectNodes('//failure|//error')).Count;normalSkipped=@($normal.SelectNodes('//skipped')).Count;strictCases=$strictCases.Count;strictFailures=@($strict.SelectNodes('//failure|//error')).Count;strictSkipped=@($strict.SelectNodes('//skipped')).Count;strictDurationSeconds=[double]$entry.time;strictMessage=[string]$nativeFailure.message;strictBody=[string]$nativeFailure.InnerText}
 originalPreservation=[ordered]@{path='docs/evidence/release15/frozen-6063acd/strict-ui/first-failure-supplement/manifest.json';sha256=(Get-FileHash -LiteralPath (Join-Path $folder 'manifest.json')).Hash;files=27;pngProduced=$false;domSnapshotProduced=$false}
 observationAmendment=[ordered]@{manifest='docs/evidence/release15/frozen-6063acd/strict-ui/first-failure-supplement/strict-observations-amendment/manifest.json';manifestSha256=(Get-FileHash -LiteralPath (Join-Path $folder 'strict-observations-amendment/manifest.json')).Hash;fileSha256=(Get-FileHash -LiteralPath $observationPath).Hash;sourceMtimeLocal='2026-10-30T20:31:27.4654769-05:00';invocationStart='2026-10-30T20:30:45';invocationEnd='2026-10-30T20:31:47';explicitRunKeyInJson=$false;qualification='Source mtime falls in invocation; exact temporal association is not a per-event run key.';milestones=$observation.milestones;commandAcknowledgements=@($observation.commandAcknowledgements).Count;authorizedReadsByPage=@($observation.authorizedReads|ForEach-Object {$_.Count});noticesByPage=@($observation.notices|ForEach-Object {$_.Count});responseInstrumentation=$observation.responseInstrumentation;cleanup=$observation.cleanup;elapsedMs=$observation.elapsedMs}
 observed=@('Strict failed at its fresh guard before command capture at first join, with the combined missing-or-denied assertion.','No actual rejected UiCommandState, DOM snapshot or PNG exists in the retained first failure.','Fixed-name strict observation exists and is now additively preserved; operational collector omitted it.','Source has no action-specific readiness before strict first join fresh guard. Room panel can be absent before identity or present without loaded room/version while finding the room.','Normal matrix readiness waits actual connected state, complete roster and visible/enabled ready actions before submissions.','Strict contexts close in finally before framework error snapshot; normal matrix explicitly captures failure UI before cleanup.')
 inference=@('Initial identity/authorized room-read mount is a source-supported explanation for missing perspective, but cannot be proved uniquely from the source-only failure context.','An action-entry boundary before the unchanged fresh guard addresses the observed source ordering gap without bypassing denial, malformed state, unknown pending or private-push assertions.')
 unknown=@('Actual absent versus hidden versus denied state at the failed historical probe.','The precise sequence of polling probe states; no rejected-state observer existed.','Network/transport/load causation; no captured join request/response exists to join.','Complete strict private-push, eight-round, renewal and reconnect outcomes on the candidate; execution stopped during setup.')
 plan=[ordered]@{path='docs/evidence/release15/strict-entry/plan.md';sha256=(Get-FileHash -LiteralPath (Join-Path $repo 'docs/evidence/release15/strict-entry/plan.md')).Hash;status='Awaiting parent read; no implementation or tests executed';requirements='docs/evidence/release15/frozen-6063acd/strict-ui/first-failure-supplement/effective-requirements.json';requirementsSha256=(Get-FileHash -LiteralPath (Join-Path $folder 'effective-requirements.json')).Hash;cases='ENTRY-01 through ENTRY-14, actual DOM correct and wrong controls before helper changes';collectorOwner='capacity15, strict-only exact auxiliary whitelist, separate operational slice'}
 sourcePins=$pins;applicationEdits=$false;testEdits=$false;testRuns=$false;requirementsChanged=$false;providersChanged=$false;accuracy=99;accuracyQualification='Exact native/source/retained observation claims pinned; transient state and causal alternatives explicitly unknown';completeness=98;completenessQualification='Bounded diagnosis, original preservation and decision-complete proposed repair; full strict outcome and independent review remain pending'
}
$result=@"
$(Get-Date -Format s) - Frozen606 strict first-failure diagnosis and plan only.

Observed native: normal$($normalCases.Count) cases, failures$(@($normal.SelectNodes('//failure|//error')).Count), skipped$(@($normal.SelectNodes('//skipped')).Count); strict$($strictCases.Count) case, failures$(@($strict.SelectNodes('//failure|//error')).Count), skipped$(@($strict.SelectNodes('//skipped')).Count), duration$($entry.time)s. Strict failed at first join's initial fresh UI guard before its request-capture boundary. Its combined missing-or-denied assertion does not establish which DOM state occurred.

Original first-failure27-file manifest and omitted strict auxiliary observation were separately copied/hash-verified and retained. Original error-context has source only; no DOM snapshot or PNG existed. Safe observation JSON is temporally associated with this invocation and has no explicit run key: host reads/notices only, no command acknowledgements, no second/observer reads. All original files and the first manifest remain unchanged.

Source-backed recommendation: await the exact same-page visible/enabled action before unchanged fresh guard. Preserve fail-closed missing/denied/malformed/unknown-pending, exact captured request, strict fail-only acknowledgement/four conflicts and all game/push assertions. Prove actual DOM ordering and error/evidence ownership using correct/wrong fixtures before implementation. Proposed exact rejected-state observer and first-failure post-failure UI capture precede cleanup and preserve original errors. Capacity15 separately owns exact strict auxiliary collector whitelist.

UNKNOWN: actual rejected historical DOM state and probe sequence; unique cause; network/load/transport relationship; complete strict private-push/eight-round/renewal/reconnect on this candidate. Normal14-game success does not replace strict proof. No source/test/config implementation, tests/builds, provider/requirement changes or HV executed by this diagnostic turn. Plan remains for parent read before implementation.

Receipts: docs/evidence/release15/frozen-6063acd/strict-ui/first-failure-supplement/manifest.json; strict-observations-amendment/manifest.json; diagnosis.json; effective-requirements.json; docs/evidence/release15/strict-entry/plan.md. Own $($own.sessionId) / $($own.requestId), linked parent$($own.parentSessionId) / $($own.parentRequestId).

Accuracy99%: exact native/source/observations pinned with causal uncertainty explicit. Completeness98% for this bounded diagnostic/plan task; no release/HV acceptance claimed.
"@
if(-not $PSCmdlet.ShouldProcess($folder,'Save safe linked diagnosis and complete model-authored diagnostic result')){return}
if(Test-Path -LiteralPath (Join-Path $folder 'diagnosis.json')){throw 'Preserve existing diagnosis'}
$diagnosis|ConvertTo-Json -Depth 18|Set-Content -LiteralPath (Join-Path $folder 'diagnosis.json')
$result|Set-Content -LiteralPath (Join-Path $folder 'result.md')
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $folder 'diagnosis-producer.ps1')
[ordered]@{atLocal=(Get-Date -Format s);diagnosisSha256=(Get-FileHash -LiteralPath (Join-Path $folder 'diagnosis.json')).Hash;resultSha256=(Get-FileHash -LiteralPath (Join-Path $folder 'result.md')).Hash;planSha256=(Get-FileHash -LiteralPath (Join-Path $repo 'docs/evidence/release15/strict-entry/plan.md')).Hash}|ConvertTo-Json
