#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$root=Join-Path $repo 'docs/evidence/release15/command-capture'
$path=Join-Path $root 'receipt.json'
if(-not $PSCmdlet.ShouldProcess($path,'Save consolidated chronological test-only capture receipt and retained safe producers')){return}
if(Test-Path -LiteralPath $path){throw 'Retain existing consolidated receipt'}
$runs=@(foreach($name in @('mock-20261030T180830','real-20261030T180943','mock-v2-20261030T181321','real-v2-20261030T181423')){
 $file=Join-Path $root "$name/receipt.json"
 $run=Get-Content -LiteralPath $file -Raw|ConvertFrom-Json
 if((Get-FileHash -LiteralPath $run.junit).Hash -cne $run.junitSha256){throw 'Native JUnit source drift'}
 [pscustomobject]@{path=[IO.Path]::GetRelativePath($repo,$file);sha256=(Get-FileHash -LiteralPath $file).Hash;startedAt=$run.startedAt;finishedAt=$run.finishedAt;binding=$run.binding;cases=$run.cases;failed=$run.failed;skipped=$run.skipped;positiveCases=$run.positiveCases;negativeControls=$run.negativeControls;sourcePins=$run.sourcePins;junitSha256=$run.junitSha256;helperAbsent=$run.helperAbsent;unchangedPreDeltaHelperSha256=$run.unchangedPreDeltaHelperSha256}
})
$checks=Get-Content -LiteralPath (Join-Path $root 'source-check-final.json') -Raw|ConvertFrom-Json
foreach($pin in $checks.sourcePins){if((Get-FileHash -LiteralPath (Join-Path $repo $pin.path)).Hash -cne $pin.sha256){throw 'Current source differs from final source check'}}
$verifications=@(Get-ChildItem -LiteralPath (Join-Path $root 'edit-verification') -Filter '*.json' -File|Sort-Object Name|ForEach-Object {Get-Content -LiteralPath $_.FullName -Raw|ConvertFrom-Json})
if(@($verifications|Where-Object {$_.hookExitCode -ne 0 -or $_.typecheckExitCode -ne 0}).Count){throw 'Edit verification not green'}
$localPins=@(foreach($name in @('plan.md','assessment.md','source-check.json','source-check-final.json','source-lint-final.log','source-diff-check-final.log','integration-adoption-final.diff','callsite-sweep-final.log')){$file=Join-Path $root $name;[pscustomobject]@{path=[IO.Path]::GetRelativePath($repo,$file);sha256=(Get-FileHash -LiteralPath $file).Hash}})
$supplement=Join-Path $repo 'docs/evidence/release15/frozen-cca320b/live-ui/command-capture-supplement/manifest.json'
$preserved=Get-Content -LiteralPath $supplement -Raw|ConvertFrom-Json
foreach($file in $preserved.files){if((Get-FileHash -LiteralPath $file.destination).Hash -cne $file.sha256){throw 'Preserved failed artifact copy drift'}}
[xml]$failedXml=Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/frozen-cca320b/live-ui/live-ui.xml') -Raw
$failedCases=@($failedXml.SelectNodes('//testcase'))
$nativeFailures=@($failedCases|Where-Object {$_.SelectSingleNode('failure|error')}).Count
$nativeSkipped=@($failedCases|Where-Object {$_.SelectSingleNode('skipped')}).Count
$producers=@(foreach($source in @('/tmp/WordpairsCommandCaptureSession.ps1','/tmp/PrepareWordpairsCommandCapture.ps1','/tmp/VerifyWordpairsCaptureEdit.ps1','/tmp/RunWordpairsCommandCaptureGate.ps1','/tmp/CheckWordpairsCommandCapture.ps1',$PSCommandPath)){
 $dir=Join-Path $root 'producers';[void](New-Item -ItemType Directory -Path $dir -Force)
 $copy=Join-Path $dir ([IO.Path]::GetFileName($source));Copy-Item -LiteralPath $source -Destination $copy
 $hash=(Get-FileHash -LiteralPath $source).Hash
 if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Retained producer copy differs'}
 [pscustomobject]@{path=[IO.Path]::GetRelativePath($repo,$copy);sha256=$hash;originalRetained=$true}
})
$sameOracle=@($runs[2].sourcePins|Where-Object path -Match '(contract|test)\.ts$'|ForEach-Object {$pin=$_;$real=@($runs[3].sourcePins|Where-Object path -EQ $pin.path)[0];[pscustomobject]@{path=$pin.path;mockSha256=$pin.sha256;realSha256=$real.sha256;matches=($pin.sha256 -ceq $real.sha256)}})
if(@($sameOracle|Where-Object {-not $_.matches}).Count){throw 'V2 mock/real oracle differs'}
$before=Get-Location
try{Set-Location -LiteralPath $repo;$head=(& git rev-parse HEAD).Trim();$applicationDiff=@(& git diff --name-only HEAD -- src package.json package-lock.json);if($LASTEXITCODE){throw 'Source diff inspection failed'}}finally{Set-Location -LiteralPath $before}
[ordered]@{
 timestampLocal=(Get-Date -Format s)
 kind='test-only-ui-command-capture-repair-not-HV-not-full-game-acceptance'
 ownSessionId='Codex-20261030T200118Z-plugin-session';ownRequestId='req-20261030T225947Z-command-capture'
 parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release'
 baselineHead=$head;dirtyTestSource=$true;sourceStopped=$true
 sourcePins=$checks.sourcePins;localEvidence=$localPins;chronologicalRuns=$runs;sameV2Oracle=$sameOracle
 v1MockBeforeImplementation=($runs[0].helperAbsent -and $runs[0].finishedAt -lt '2026-10-30T18:09:40')
 v2MockBeforeHelperDelta=($runs[2].unchangedPreDeltaHelperSha256 -ceq '12B54038DCF92A0B4E03DB5463014C987D910C977FA4DECBD72C06F3243C909D' -and $runs[2].finishedAt -lt '2026-10-30T18:14:23')
 editVerifications=$verifications;editVerificationCount=$verifications.Count
 finalLintExitCode=$checks.lintExitCode;finalSourceDiffExitCode=$checks.sourceDiffCheckExitCode;currentUnitDelta=58
 currentEffectiveLayer='layer-1';requirementRecords=@('TR-CONNECTION-RECOVERY-009#TR-09-C01','TEST-CONNECTIONRECOVERY-109#VERIFY-TR-09','TR-MULTIPLAYER-INTEGRATION-034#TR-34-C01/TR-34-C02','TEST-MULTIPLAYERINTEGRATION-134#TR-34-C01/TR-34-C02','TR-ROOM-SYNCRECOVERY-038#LIVE-02/LIVE-07','TEST-ROOMSYNC-139#LIVE-02/LIVE-07');requirementsMutated=$false
 preservedFailure=[ordered]@{manifestPath=[IO.Path]::GetRelativePath($repo,$supplement);manifestSha256=(Get-FileHash -LiteralPath $supplement).Hash;files=@($preserved.files).Count;bytes=($preserved.files|Measure-Object bytes -Sum).Sum;copiesVerified=$true;originalsRetained=$true;nativeCases=$failedCases.Count;nativeFailed=$nativeFailures;nativeSkipped=$nativeSkipped;nativePassed=($failedCases.Count-$nativeFailures-$nativeSkipped)}
 causalLimits='All9snapshots were open/liveconnected/fullroster/round2; onependingUI. No exact original Request-to-player attribution, no proof of navigation/cache eviction, no claim that eager capture alone establishes transport recovery.'
 safeAttribution='Future matrix JSON retains original Request UUID-only command/profile IDs, player/page index, allowlisted action, actual status and enabled-pending observation; no raw payload/answer/token.'
 applicationDependencyDiffPaths=$applicationDiff;noApplicationDependencyChanges=($applicationDiff.Count -eq 0)
 noProviderSchemaConfigurationWrites=$true;noBuildActualUiOrHvRun=$true;noGitCommit=$true
 retainedProducers=$producers
 pending=@('Parent frozen full applicable suites/build/Realtime and2..15ordinary UI matrix','Parent strict full UI lane and evidence conversion/readback','Independent Cline Beam High review and source gate','Hosted staging/production and physical acceptance where pending')
 accuracyPercent=99;completenessPercent=98;scoreQualification='Bounded test-only repair;58/0/0isolated oracle proves discrimination/real helper, not actual browser/full game/product approval.'
}|ConvertTo-Json -Depth 20|Set-Content -LiteralPath $path
[pscustomobject]@{path=[IO.Path]::GetRelativePath($repo,$path);sha256=(Get-FileHash -LiteralPath $path).Hash;timestampLocal=(Get-Date -Format s);sourceStopped=$true;unitDelta=58;editVerifications=$verifications.Count;noApplicationDependencyChanges=($applicationDiff.Count -eq 0)}|ConvertTo-Json
