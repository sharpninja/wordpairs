#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$dir=Join-Path $repo 'docs/evidence/release15/ui-acknowledgement'
if(-not $PSCmdlet.ShouldProcess($dir,'Retain consolidated acknowledgement chronology, checked source and producer')){return}
$gates=@(Get-ChildItem -LiteralPath $dir -Directory|Where-Object Name -Match '^(mock|real)-'|ForEach-Object {
 $path=Join-Path $_.FullName 'receipt.json'
 if(Test-Path -LiteralPath $path){[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;result=(Get-Content -LiteralPath $path -Raw|ConvertFrom-Json)}}
}|Sort-Object {$_.result.startedAt})
if($gates.Count -ne 4){throw 'Expected preserved original118, V2mock124 and two real124 receipts'}
foreach($gate in $gates){if($gate.result.exitCode -or $gate.result.failed -or $gate.result.skipped){throw 'Gate has unresolved failures'};if((Get-FileHash -LiteralPath $gate.result.junit).Hash -cne $gate.result.junitSha256){throw 'Native gate evidence changed'}}
$mock=@($gates|Where-Object {$_.result.binding -eq 'mock' -and $_.result.increment -eq 'v2'})[0]
$real=@($gates|Where-Object {$_.result.binding -eq 'real'}|Sort-Object {$_.result.startedAt})[-1]
foreach($name in @('ui-command-acknowledgement.contract.ts','ui-command-acknowledgement.test.ts')){
 $a=@($mock.result.sourcePins|Where-Object {$_.path.EndsWith('/'+$name)})[0]
 $b=@($real.result.sourcePins|Where-Object {$_.path.EndsWith('/'+$name)})[0]
 if(-not $a -or -not $b -or $a.sha256 -cne $b.sha256){throw 'Mock/real same oracle binding changed'}
}
$sourcePath=Join-Path $dir 'source-check.json'
$source=Get-Content -LiteralPath $sourcePath -Raw|ConvertFrom-Json
if($source.lintExitCode -or $source.sourceDiffCheckExitCode -or $source.adoptionDiffExitCode -or $source.callsiteSweepExitCode){throw 'Source checks failed'}
foreach($pin in $source.sourcePins){if((Get-FileHash -LiteralPath (Join-Path $repo $pin.path)).Hash -cne $pin.sha256){throw 'Source changed after final inspection'}}
foreach($pin in $real.result.sourcePins){if((Get-FileHash -LiteralPath $pin.path).Hash -cne $pin.sha256){throw 'Source changed after final same-oracle run'}}
$edits=@(Get-ChildItem -LiteralPath (Join-Path $dir 'edit-verification') -Filter '*.log.json'|ForEach-Object {Get-Content -LiteralPath $_.FullName -Raw|ConvertFrom-Json}|Sort-Object timestamp)
if(@($edits|Where-Object hookExitCode -NE 0).Count){throw 'Unresolved hook failure'}
if($edits[-1].typecheckExitCode -ne 0){throw 'Final direct typecheck failed'}
$appChanges=@(& git -C $repo diff --name-only -- src)
if($appChanges.Count){throw 'This bounded repair must not change application source'}
$retained=Join-Path $dir 'producers'
[void](New-Item -ItemType Directory -Path $retained -Force)
$producerPins=@(foreach($path in @($PSCommandPath,'/tmp/RunWordpairsAckGate.ps1','/tmp/CheckWordpairsAckSource.ps1','/tmp/VerifyWordpairsAckEdit.ps1','/tmp/WordpairsUiAckRepairSession.ps1')){
 $copy=Join-Path $retained ([IO.Path]::GetFileName($path));Copy-Item -LiteralPath $path -Destination $copy
 $hash=(Get-FileHash -LiteralPath $path).Hash
 if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Retained operational producer copy differs'}
 [pscustomobject]@{original=$path;retained=$copy;sha256=$hash}
})
$receipt=[ordered]@{
 sourceStoppedAtLocal=(Get-Date -Format s);kind='test-only-rendered-command-acknowledgement-repair';revision=(& git -C $repo rev-parse HEAD).Trim();dirtyTestSource=$true
 sessionId='Codex-20261030T200118Z-plugin-session';requestId='req-20261030T234727Z-ui-ack-repair';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release'
 plan=@{path=(Join-Path $dir 'plan.md');sha256=(Get-FileHash -LiteralPath (Join-Path $dir 'plan.md')).Hash}
 gates=$gates;edits=$edits;sourceCheck=@{path=$sourcePath;sha256=(Get-FileHash -LiteralPath $sourcePath).Hash;result=$source};producerPins=$producerPins
 actualNewUnitCases=66;unchangedPriorCaptureCases=58;focusedFinal=@{passed=124;failed=0;skipped=0;positiveNew=33;negativeNew=33}
 priorFailureRetained='frozen-fdee7a2/live-ui/disabled-input-supplement/manifest.json';priorMatrix=@{passed=8;failed=1;skipped=5;playerCountFailed=10;uiSolves=17;cause='Exact request-to-pending/latency causal identity unproved'}
 knownQualification=@('Original118 gate did not prove deferred retirement completion; V2 added completion/rejection/path discrimination before shared coordinator/adapters changes.','One transient coupled-signature direct tsc2 at18:53:29 is retained; provider then updated and all subsequent direct typechecks passed.','Scoped Biome exit0 reports15warnings: baseline non-null assertions plus deliberate rendered innerText reads; this is not zero-warning evidence.','Acknowledgement observer records classifier-returned states; rejected/denied classifier probes surface through native failure rather than claiming a complete rejected-state history.','The helper/oracle checks are isolated test-harness evidence; no actual browser/full game, performance SLA, latency-cause fix, provider deployment or HV acceptance is established.','No application, schema, dependencies, game policy/cap/deadline, requirement status or live provider mutation occurred. Parent owns new frozen full UI/runtime/HV verification.')
 actualUiRun=$false;buildRun=$false;hvRun=$false;originalsRetained=$true;mockRealSameOracle=$true
}
$target=Join-Path $dir 'receipt.json'
if(Test-Path -LiteralPath $target){throw 'Never overwrite consolidated receipt'}
$receipt|ConvertTo-Json -Depth 30|Set-Content -LiteralPath $target
[pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;sourceStoppedAtLocal=$receipt.sourceStoppedAtLocal;focusedFinal=$receipt.focusedFinal;sourcePins=$source.sourcePins}|ConvertTo-Json -Depth 10
