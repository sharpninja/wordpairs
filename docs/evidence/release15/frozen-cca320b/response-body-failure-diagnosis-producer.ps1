#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-cca320b'
$failure=Join-Path $folder 'live-ui'
$destination=Join-Path $folder 'response-body-failure-diagnosis.json'
function Get-Pin {
    param([string]$Path)
    $item=Get-Item -LiteralPath $Path
    [ordered]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash;bytes=$item.Length}
}
$nativePath=Join-Path $failure 'live-ui.xml'
[xml]$native=Get-Content -LiteralPath $nativePath -Raw
$runtimePath=Join-Path $failure 'runtime-receipts/live-scale-9.json'
$runtime=Get-Content -LiteralPath $runtimePath -Raw | ConvertFrom-Json -AsHashtable
$uiPath=Join-Path $failure 'runtime-receipts/live-scale-9-failure-ui.json'
$ui=Get-Content -LiteralPath $uiPath -Raw | ConvertFrom-Json -AsHashtable
$safeUi=@($ui.uiStates | ForEach-Object {
    $body=$_.body
    [ordered]@{player=$_.player;closed=$_.closed;browserConnected=$_.browserConnected;liveConnected=$body.Contains('Live updates connected');pendingGameRetryText=$body.Contains('Retry pending game request');pendingRoomRetryText=$body.Contains('Retry pending room request');roomNotFound=$body.Contains('Room not found');roster=([regex]::Match($body,'\d+ / \d+ players')).Value;rounds=@([regex]::Matches($body,'Round\s+\d+(?:\s+of\s+\d+)?') | ForEach-Object { $_.Value })}
})
$manifestPath=Join-Path $failure 'command-capture-supplement/manifest.json'
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -AsHashtable
$copyVerification=@($manifest.files | ForEach-Object {
    [ordered]@{source=$_.source;retainedCopy=$_.destination;expectedSha256=$_.sha256;originalStillExists=Test-Path -LiteralPath $_.source;retainedCopyMatches=(Get-FileHash -LiteralPath $_.destination).Hash -ceq $_.sha256}
})
if(@($copyVerification | Where-Object {-not $_.originalStillExists -or -not $_.retainedCopyMatches}).Count){throw 'Preserved evidence copy verification failed'}
$driverPath=Join-Path $repo 'node_modules/playwright-core/lib/coreBundle.js'
$driverPackage=Get-Content -LiteralPath (Join-Path $repo 'node_modules/playwright-core/package.json') -Raw | ConvertFrom-Json -AsHashtable
$snapshot='/tmp/wordpairs-response-recovery-effective.json'
$originalSourcePins=@($manifest.files | Where-Object {$_.source -match '/(?:src/web/(?:game-panel|room-screen)\.tsx|tests/browser/(?:live-player-counts\.integration\.spec|live-multiplayer\.integration\.spec|request-diagnostics)\.ts)$'} | ForEach-Object {[ordered]@{originalPath=$_.source;retainedCopy=$_.destination;sha256=$_.sha256}})
$receipt=[ordered]@{
    recordedAt=(Get-Date).ToString('o');kind='read-only-native-failure-diagnosis-not-HV';sourceHead='cca320b02596d21683cec38ab604d7fe31a5c672';runId='cdfa9899-c115-4621-aae2-fa8c51035d5c';ownSessionId='Codex-20261030T194703Z-plugin-session';ownRequestId='req-20261030T225743Z-turn-d224';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release'
    native=[ordered]@{pin=Get-Pin $nativePath;cases=@($native.SelectNodes('//testcase')).Count;passed=@($native.SelectNodes('//testcase[not(failure) and not(error) and not(skipped)]')).Count;failed=@($native.SelectNodes('//testcase[failure or error]')).Count;skipped=@($native.SelectNodes('//testcase[skipped]')).Count;failurePlayers=9;failureSeconds=66.72;originalStackAnchors=@('tests/browser/live-player-counts.integration.spec.ts:60:45 Object.json','tests/browser/live-player-counts.integration.spec.ts:73:38 commitUi','tests/browser/live-player-counts.integration.spec.ts:157:24 answer callback');message='response.json: Protocol error (Network.getResponseBody): No data found for resource with given identifier'}
    observedRuntime=[ordered]@{pin=Get-Pin $runtimePath;uiPin=Get-Pin $uiPath;phase=$runtime.phase;completed=$runtime.completed;rounds=$runtime.rounds;uiConfirmedSolves=$runtime.uiSolves;uncertainUiRetries=$runtime.uncertainUiRetries;cleanupFailures=$runtime.cleanupFailures;unresolvedPlayerIndices=$runtime.unresolvedPlayerIndices;requestFailureTotal=$runtime.requestFailureTotal;diagnosticFailureTotal=$runtime.requestDiagnostics.failureTotal;pendingAtDiagnosticDispose=$runtime.requestDiagnostics.pendingAtDispose;safeUi=$safeUi;pendingControlEnabled='UNKNOWN: innerText snapshot cannot establish enabled state';exactFailedRequestToPendingActorJoin='UNKNOWN: original diagnostics do not join actor/command IDs to failing body Request';nearbyAnswerAbort=[ordered]@{method='POST';action='answer';elapsedMs=63776;error='net::ERR_ABORTED';sameFailingRequestEstablished=$false};solvesQualification='16 is successful UI-response confirmations, not a snapshot count of all database accepted solves.'}
    sourceChain=[ordered]@{originalSourcePins=$originalSourcePins;matrix='Original capture waited for both request and UI action, then awaited request.response and deferred response.json; successful-body failure escaped before pending retry classification.';frontend='game-panel.tsx173-240 sets canonical pending input before fetch; response.json precedes pending clear; catch preserves pending input. Retry button579-585 reuses send() with pending object and is disabled while busy.';strict='Original command/answer helpers also deferred body consumption. Approved successor changes capture timing only; strict retains four-conflict-only semantics.';driver=[ordered]@{package=$driverPackage.name;version=$driverPackage.version;pin=Get-Pin $driverPath;anchors=@('internalBody14539-14552 awaits _finishedPromise before body lookup','createResponseBodyCallback37797-37805 issues Network.getResponseBody for original request ID');conclusion='Navigation advice is appended for protocol error type error without verifying navigation. Waiting for finished alone does not repair this lookup failure.'}}
    conclusions=@(
        [ordered]@{status='CONFIRMED';claim='Deferred successful-response body lookup failed. Actual UI pending command text exists on one actor; user-visible uncertainty cannot be classified as instrumentation-only.'},
        [ordered]@{status='UNKNOWN';claim='Whether actual navigation, cache eviction, browser/backend resource pressure or an aborted transport body caused the exact body lookup failure.'},
        [ordered]@{status='SUPPORTED_CURRENT_CONTRACT';claim='Bounded same-page UI pending retry may cover successful-status body loss only after actual visible and enabled control observation and full next-payload equality. No API replay, synthetic success, new command ID or blind successful-status retry.'},
        [ordered]@{status='CONFIRMED_TEST_HELPER_V1_GAP';claim='V1 cached body rejection plus simultaneous action rejection loses body error because CapturedCommand is fulfilled. Root verified sibling finding requires separate V2 same-oracle positive and wrong-provider control before correction.'}
    )
    requirements=[ordered]@{freshReadSnapshotPin=Get-Pin $snapshot;support=@('TR-CONNECTION-RECOVERY-009#TR-09-C01','TEST-CONNECTIONRECOVERY-109#VERIFY-TR-09','TR-MULTIPLAYER-INTEGRATION-034#TR-34-C02');stillUnsatisfied=@('TR-MULTIPLAYER-INTEGRATION-034#TR-34-C01','TEST-MULTIPLAYERINTEGRATION-134#TR-34-C01','TR-ROOM-SYNCRECOVERY-038#LIVE-07','TEST-ROOMSYNC-139#LIVE-07');qualification='Read current effective layer1 through matching Codex plugin. No requirements writes or satisfaction changes. LIVE05 applies specifically to presence body errors and is not substituted for game-command coverage.'}
    approvedRepair=[ordered]@{owner='/root/release_selfcheck';plan='docs/evidence/release15/command-capture/plan.md';scope='Test-only shared eager response/body capture plus matrix existing canonical UI pending recovery. Preserve actual Request/status, cached value/original error, drain all started action/capture work; simultaneous failures retain both originals.';oracle='Independent correct/wrong providers first; same real-binding assertions afterward. Preserve V1 historical receipts and distinct V2 body-plus-action delta gate.';pending='Parent must freeze successor source and rerun every required full lane, complete14game119participation952solve matrix and strict push lane before actual Cline/Beam/High HV.'}
    preservation=[ordered]@{manifestPin=Get-Pin $manifestPath;verifiedRetainedCopies=$copyVerification.Count;allRetainedCopyHashesMatch=$true;allOriginalPathsStillExist=$true;qualification='Original mutable spec paths now belong to successor edits. Retained copies, not current source equality, establish original failed-version bytes.'}
    limits=@('No source/test/script/config/application/requirements changes by this agent; only diagnostic receipt output.','No new build/test/browser/model/HV/provider operation by this agent.','This diagnosis does not prove successor runtime recovery, hosted behavior or release completion.','Original failed and skipped native cases remain visible; focused helper gates do not establish full-game success.')
    ratings=[ordered]@{accuracyPercent=99;completenessPercent=95;qualification='Source-pinned bounded diagnosis; exact underlying transport cause and actual failing actor are unproved. This is self-review, not independent HV or a done-state score.'}
}
if(-not $PSCmdlet.ShouldProcess($destination,'Save safe source-pinned failure diagnosis and producer provenance without modifying original evidence')){return}
if(Test-Path -LiteralPath $destination){throw 'Refusing to overwrite prior diagnosis'}
$receipt | ConvertTo-Json -Depth 25 | Set-Content -LiteralPath $destination -Encoding utf8NoBOM
$producerCopy=Join-Path $folder 'response-body-failure-diagnosis-producer.ps1'
if(Test-Path -LiteralPath $producerCopy){throw 'Refusing to overwrite producer copy'}
Copy-Item -LiteralPath $PSCommandPath -Destination $producerCopy
if((Get-FileHash -LiteralPath $producerCopy).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Producer copy mismatch'}
[ordered]@{recordedAt=(Get-Date).ToString('o');diagnosis=Get-Pin $destination;producer=Get-Pin $producerCopy;nativeCounts=@($receipt.native.cases,$receipt.native.passed,$receipt.native.failed,$receipt.native.skipped);safeUiActors=$safeUi.Count;retainedCopies=$copyVerification.Count} | ConvertTo-Json -Depth 5
