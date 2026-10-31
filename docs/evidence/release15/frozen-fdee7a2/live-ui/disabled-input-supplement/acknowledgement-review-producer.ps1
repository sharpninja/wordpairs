#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$base=Join-Path $repo 'docs/evidence/release15/ui-acknowledgement'
$out=Join-Path $repo 'docs/evidence/release15/frozen-fdee7a2/live-ui/disabled-input-supplement/acknowledgement-review.json'
$gates=@(foreach($name in @('mock-v2-20261030T185349','real-v2-20261030T185614')){
 $receiptPath=Join-Path $base "$name/receipt.json"
 $r=Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json -AsHashtable
 [xml]$xml=Get-Content -LiteralPath $r.junit -Raw
 $cases=@($xml.SelectNodes('//testcase'))
 $failed=@($xml.SelectNodes('//testcase[failure or error]')).Count
 $skipped=@($xml.SelectNodes('//testcase[skipped]')).Count
 $negative=@($cases | Where-Object {$_.name -match 'rejects wrong|rejects independent wrong'}).Count
 $pins=@(foreach($pin in $r.sourcePins){
  $copyHash=(Get-FileHash -LiteralPath $pin.copy).Hash
  if($copyHash -cne $pin.sha256){throw "Retained gate source mismatch: $($pin.copy)"}
  [ordered]@{path=$pin.path;sha256=$pin.sha256;retainedCopy=$pin.copy;copyVerified=$true;currentMatches=(Get-FileHash -LiteralPath $pin.path).Hash -ceq $pin.sha256}
 })
 if($cases.Count -ne 124 -or $failed -ne 0 -or $skipped -ne 0 -or $r.exitCode -ne 0){throw 'Native focused gate mismatch'}
 if((Get-FileHash -LiteralPath $r.junit).Hash -cne $r.junitSha256){throw 'Native JUnit hash mismatch'}
 if((Get-FileHash -LiteralPath (Join-Path $base "$name/producer.ps1")).Hash -cne $r.producerSha256){throw 'Gate producer hash mismatch'}
 [ordered]@{path=$receiptPath;sha256=(Get-FileHash -LiteralPath $receiptPath).Hash;binding=$r.binding;startedAt=$r.startedAt;finishedAt=$r.finishedAt;nativeExit=$r.exitCode;cases=$cases.Count;failed=$failed;skipped=$skipped;expectedNewPositive=$r.expectedNewPositive;expectedNewNegative=$r.expectedNewNegative;priorCaptureCases=$r.priorCaptureCases;negativeNamesCount=$negative;junit=$r.junit;junitSha256=$r.junitSha256;sourcePins=$pins;producerSha256=$r.producerSha256}
})
if([datetime]$gates[0].finishedAt -ge [datetime]$gates[1].startedAt){throw 'Mock and real chronology invalid'}
$sameOracle=@('ui-command-acknowledgement.contract.ts','ui-command-acknowledgement.test.ts','ui-command-capture.contract.ts','ui-command-capture.test.ts')
foreach($name in $sameOracle){
 $before=@($gates[0].sourcePins | Where-Object { [IO.Path]::GetFileName($_.path) -ceq $name })[0]
 $after=@($gates[1].sourcePins | Where-Object { [IO.Path]::GetFileName($_.path) -ceq $name })[0]
 if($before.sha256 -cne $after.sha256 -or -not $after.currentMatches){throw "SAME oracle drift: $name"}
}
$sourcePaths=@('tests/browser/ui-command-acknowledgement.contract.ts','tests/browser/ui-command-acknowledgement.test.ts','tests/browser/ui-command-acknowledgement.ts','tests/browser/ui-command-capture.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/live-multiplayer.integration.spec.ts','src/application/identity.ts','src/web/identity-panel.tsx','src/web/game-panel.tsx')
$sourcePins=@(foreach($path in $sourcePaths){[ordered]@{path=$path;sha256=(Get-FileHash -LiteralPath (Join-Path $repo $path)).Hash}})
$r=[ordered]@{
 recordedAt=(Get-Date).ToString('o');kind='read-only same-family diagnosis and source review; not hostile validation'
 parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release'
 ownSessionId='Codex-20261030T194703Z-plugin-session';ownRequestId='req-20261030T233723Z-turn-a09f'
 failedRevision='fdee7a2569bb4742e008977e2a9cd7d312def859';workingTestChanges=$true
 nativeFailedMatrix=@{total=14;passed=8;failed=1;skipped=5;failedPlayers=10;round=2;driverJsonSolves=17;completed=$false}
 gates=$gates;sourcePins=$sourcePins
 conclusions=@(
  'Confirmed test boundary defect: prior commit returned driver HTTP JSON before requiring the submitting frontend to retire pending state. This does not establish why that frontend request became uncertain.',
  'V1 oracle retirement event was insufficient to prove awaited completion. V2 deferred completion and original rejection cases bind the SAME real shared coordinator; wrong providers deliberately start fresh work before retirement and are rejected.',
  'V1 wrong-scope case did not cover initial aggregate URL. V2 validates the original Request URL and wrong aggregate independently of profile/action, through the SAME real commit callback.',
  'Current matrix preflight rejects unknown pending work, validates exact aggregate/action/profile/answer, holds a successful driver body until visible nonbusy pending-free finite-version acknowledgement, and preserves complete payload during explicit pending retries within the existing twelve-attempt bound.',
  'Current matrix waits for submitting browser alias and intended round scorecard own-row solved before incrementing solves; shared scorecard text from other players cannot satisfy the pure own-row assertion.',
  'Actual guest aliases are generated Guest plus one tree word plus six token characters; profile preferences only regenerate this form. ProfileIcon renders one span before direct alias text. Distinct supported aliases cannot contain another complete generated alias as a suffix. Duplicate aliases would produce multiple matching rows and fail count one. The endsWith normalizer relies on this source-pinned supported-input invariant; no arbitrary malformed DOM identity test is claimed.',
  'Strict live adapter retains fail-only sender acknowledgement and its existing four conflict-only retries, exact request path/action/profile/answer and own-round solve checks. Existing capture ownership, action/request/body errors, readiness, two-at-a-time answers, eight rounds, final standings and owned cleanup assertions remain.',
  'Safe acknowledgement observations are emitted after successful classification; a classifier rejection relies on native error and prior observations. Do not claim every rejected/denied snapshot was retained.'
 )
 existingRequirements=@('TR-CONNECTION-RECOVERY-009#TR-09-C01','TEST-CONNECTIONRECOVERY-109#VERIFY-TR-09','FR-REQUESTFEEDBACK-030#UI-FEEDBACK-02','FR-REQUESTFEEDBACK-030#UI-FEEDBACK-04','FR-REQUESTFEEDBACK-030#UI-FEEDBACK-05','TEST-REQUESTFEEDBACK-143#UI-FEEDBACK-02','TEST-REQUESTFEEDBACK-143#UI-FEEDBACK-04','TEST-REQUESTFEEDBACK-143#UI-FEEDBACK-05','FR-ANSWERSTAGES-008#AC45','FR-SCORELOCK-010#AC45','TR-MULTIPLAYER-INTEGRATION-034#TR-34-C01','TR-ROOM-SYNCRECOVERY-038#LIVE07')
 limits=@(
  'No tests, builds, application/browser runtime, provider/model/HV or requirement/source edits were performed by this diagnosing agent. Focused owner-produced mock/real receipts were read and independently recounted, not rerun.',
  'Focused124-case receipts establish only isolated test-helper/oracle behavior, not a successful actual game, hosted behavior, transport root cause or release completion. Successor full frozen suites, all fourteen actual UI games and strict push lane remain required.',
  'Exact join of the slow200 answer response to page7 pending command remains unavailable in failed evidence. Generic input ID is room UUID, not actor. Current future diagnostic identity cannot backfill that missing historical join.',
  'No CPU/memory/worker bottleneck, actual abort cause, body-cache cause or navigation cause is established by the historical timing. The11601ms answer200 is an unjoined observation.',
  'Original failure artifacts, initial118 oracle history and all58 previous capture cases are preserved. No satisfaction or goal state is changed. Current reviewer remains Cline/Beam/High; this is not independent HV.'
 )
 accuracy=99;completeness=97;ratingsQualification='Source/oracle assertions are pinned and recounted; original causal and actor/request joins remain explicitly unknown.'
}
if(-not $PSCmdlet.ShouldProcess($out,'Save additional safe source-oracle review without rewriting original diagnosis')){return}
if(Test-Path -LiteralPath $out){throw 'Refusing overwrite of prior oracle review'}
$r | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $out -Encoding utf8NoBOM
$producer=Join-Path (Split-Path $out) 'acknowledgement-review-producer.ps1'
if(Test-Path -LiteralPath $producer){throw 'Refusing overwrite of producer'}
Copy-Item -LiteralPath $PSCommandPath -Destination $producer
if((Get-FileHash $PSCommandPath).Hash -cne (Get-FileHash $producer).Hash){throw 'Producer copy mismatch'}
[ordered]@{recordedAt=$r.recordedAt;path=$out;sha256=(Get-FileHash $out).Hash;producer=$producer;producerSha256=(Get-FileHash $producer).Hash;gates=@($gates | ForEach-Object {[ordered]@{binding=$_.binding;cases=$_.cases;failed=$_.failed;skipped=$_.skipped;negativeNamesCount=$_.negativeNamesCount}})} | ConvertTo-Json -Depth 6
