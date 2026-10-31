#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
 [Parameter(Mandatory)][string]$Directory,
 [Parameter(Mandatory)][string]$BriefPath,
 [Parameter(Mandatory)][string]$SelfReviewPath
)
$ErrorActionPreference='Stop'
$root='<repo>'
$Directory=[IO.Path]::GetFullPath($Directory)
$inventory=Get-Content -LiteralPath (Join-Path $Directory 'expected-inventory.json') -Raw|ConvertFrom-Json
$revision=(& git -C $root rev-parse HEAD).Trim()
if($revision -cne $inventory.revision){throw 'Source is not the validated frozen revision'}
if(@(& git -C $root status --short -- src tests scripts public package.json package-lock.json tsconfig.json next.config.ts biome.json 'vitest*.config.ts' 'playwright*.config.ts').Count){throw 'Product source is dirty'}
$chain=Get-Content -LiteralPath (Join-Path $Directory 'chain-completion.json') -Raw|ConvertFrom-Json
if($chain.revision -cne $revision -or $chain.runId -cne $inventory.runId -or $chain.failure -or @($chain.phases).Count -ne 5 -or @($chain.phases|Where-Object exitCode -NE 0).Count -or @($chain.preparation).Count -ne 4 -or @($chain.preparation|Where-Object exitCode -NE 0).Count){throw 'Frozen validation chain is incomplete or failed'}
foreach($name in @('RunWordpairsRelease15Evidence.ps1','InitializeNextWordpairsEvidence.ps1','RunNextWordpairsEvidenceChain.ps1')){
 $relative='docs/evidence/release15/operational-producers/'+$name
 $committed=& git -C $root rev-parse ($revision+':'+$relative)
 $actual=& git -C $root hash-object -- (Join-Path $root $relative)
 if($LASTEXITCODE -or "$committed".Trim() -cne "$actual".Trim()){throw 'Operational producer differs from the frozen commit'}
}
$self=Get-Content -LiteralPath $SelfReviewPath -Raw|ConvertFrom-Json
if($self.revision -cne $revision -or $self.runId -cne $inventory.runId){throw 'Self-review does not identify this candidate and execution'}
$preparationPath=Join-Path $Directory 'review-preparation.json'
$preparation=Get-Content -LiteralPath $preparationPath -Raw|ConvertFrom-Json
if($preparation.revision -cne $revision -or $preparation.runId -cne $inventory.runId -or $preparation.selfReview -cne $SelfReviewPath -or $preparation.brief -cne $BriefPath -or $preparation.selfReviewSha256 -cne (Get-FileHash -LiteralPath $SelfReviewPath).Hash -or $preparation.briefSha256 -cne (Get-FileHash -LiteralPath $BriefPath).Hash -or @($preparation.retainedInputs).Count -ne 2 -or $preparation.originalsRetained -ne $true){throw 'Preparation provenance does not bind the actual review inputs'}
foreach($inputPin in $preparation.retainedInputs){
 $selfPins=@($self.inspectedFiles|Where-Object {$_.path -ceq $inputPin.path -and $_.sha256 -ceq $inputPin.sha256})
 if($selfPins.Count -ne 1 -or (Get-FileHash -LiteralPath $inputPin.path).Hash -cne $inputPin.sha256){throw 'Retained preparation input is absent, unbound or changed'}
}
foreach($name in @('holisticReview','whatIf','propagationAudit','phaseBoundary','searchBeforeAdding','noNewMechanism','mappingLint','operatorScopeVerbatim','standingRulesDelegated')){
 $check=$self.checklist.$name
 if($check.passed -ne $true -or -not @($check.evidence).Count){throw "Required self-review evidence absent: $name"}
 foreach($path in $check.evidence){if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw "Self-review evidence does not exist: $name"}}
}
$core=Get-Content -LiteralPath (Join-Path $Directory 'core-index/evidence-index.json') -Raw|ConvertFrom-Json
$supplemental=Get-Content -LiteralPath (Join-Path $Directory 'supplemental-index/supplemental-evidence-index.json') -Raw|ConvertFrom-Json
if($core.revision -cne $revision -or $supplemental.revision -cne $revision -or $supplemental.runId -cne $inventory.runId -or @($core.reports).Count -ne 8 -or @($supplemental.reports).Count -ne 3){throw 'All required review reports are not indexed'}
$reports=@($core.reports)+@($supplemental.reports)
$preparer=Get-Content -LiteralPath (Join-Path $Directory 'preparer-real/gate.json') -Raw|ConvertFrom-Json
if($preparer.revision -cne $revision -or $preparer.parentRunId -cne $inventory.runId -or @($preparer.runs).Count -ne 1 -or $preparer.runs[0].passed -ne 22 -or $preparer.runs[0].failed -ne 0 -or $preparer.runs[0].skipped -ne 0){throw 'Real preparation gate evidence is incomplete'}
$preparerTrx=Join-Path $Directory 'preparer-real/Real.trx'
$reports+=[pscustomobject]@{name='preparer-real';cases=22;failed=0;skipped=0;trx=$preparerTrx;trxSha256=(Get-FileHash -LiteralPath $preparerTrx).Hash;junit=(Join-Path $Directory 'preparer-real/Real.xml');junitSha256=(Get-FileHash -LiteralPath (Join-Path $Directory 'preparer-real/Real.xml')).Hash;run=$preparer}
$verifiedReports=@(foreach($report in $reports){
 if($report.failed -ne 0 -or $report.skipped -ne 0 -or $report.cases -le 0 -or (Get-FileHash -LiteralPath $report.trx).Hash -cne $report.trxSha256 -or (Get-FileHash -LiteralPath $report.junit).Hash -cne $report.junitSha256){throw 'Review report hash/outcome mismatch'}
 [xml]$trx=Get-Content -LiteralPath $report.trx -Raw
 $results=@($trx.SelectNodes('//*[local-name()="UnitTestResult"]'))
 if($results.Count -ne $report.cases -or @($results|Where-Object outcome -NE 'Passed').Count){throw 'TRX does not contain the expected passing cases'}
 $report
})
foreach($pair in @(@('unit',$inventory.expectedUnitCount),@('postgres',$inventory.expectedPostgresCount),@('browser',$inventory.expectedBrowserCount))){
 $report=@($verifiedReports|Where-Object name -CEQ $pair[0])
 if($report.Count -ne 1 -or $report[0].cases -ne $pair[1]){throw 'Full test inventory mismatch'}
}
$source=Get-Content -LiteralPath (Join-Path $Directory 'source-inventory.json') -Raw|ConvertFrom-Json
function Get-CurrentSourcePath {
 $paths=@(& git -C $root ls-files --cached --others --exclude-standard)
 if($LASTEXITCODE){throw 'Current source inventory failed'}
 @($paths|Where-Object {$_ -match '^(src|tests|scripts|public)/' -or $_ -match '^(package(-lock)?\.json|tsconfig\.json|next-env\.d\.ts|next\.config\.ts|biome\.json|vitest[^/]*\.config\.ts|playwright[^/]*\.config\.ts)$'}|Sort-Object -Unique)
}
$currentSourcePaths=@(Get-CurrentSourcePath)
$pinnedSourcePaths=@($source.sourceHashes.path|Sort-Object -Unique)
if($source.revision -cne $revision -or $source.pathSetEqual -ne $true -or $source.expectedCount -ne $currentSourcePaths.Count -or $source.manifestCount -ne @($source.sourceHashes).Count -or @($source.sourceHashes).Count -ne $pinnedSourcePaths.Count -or @($source.missing).Count -or @($source.extra).Count -or @(Compare-Object $currentSourcePaths $pinnedSourcePaths).Count){throw 'Validated source manifest is incomplete or identifies another revision'}
$boundFiles=@(foreach($pin in $source.sourceHashes){
 $absolute=Join-Path $root $pin.path
 if((Get-FileHash -LiteralPath $absolute).Hash -cne $pin.sha256){throw 'A validated source file changed'}
 [pscustomobject]@{path=$absolute;sha256=$pin.sha256;kind='validated-source'}
})
$requiredDocuments=@('AGENTS.md','README.md','docs/release15-completion-plan.md','docs/admin_pwa_release.md','docs/implementation_plan.md','docs/deployment_plan.md','docs/hosting_execution.md','docs/moderation_plan.md','docs/local_development.md','docs/architecture_design.md','docs/room_sync_fix.md','docs/submission/README.md','docs/submission/hv-evidence.md')
foreach($relative in $requiredDocuments){
 $absolute=Join-Path $root $relative
 $pins=@($self.inspectedFiles|Where-Object path -CEQ $absolute)
 if($pins.Count -ne 1 -or (Get-FileHash -LiteralPath $absolute).Hash -cne $pins[0].sha256){throw "Current holistic document pin missing or changed: $relative"}
}
foreach($pin in $self.inspectedFiles){
 if((Get-FileHash -LiteralPath $pin.path).Hash -cne $pin.sha256){throw 'Inspected self-review artifact changed'}
 $boundFiles+=[pscustomobject]@{path=$pin.path;sha256=$pin.sha256;kind='self-review-inspected'}
}
foreach($path in @($BriefPath,$SelfReviewPath,$preparationPath,(Join-Path $Directory 'expected-inventory.json'),(Join-Path $Directory 'source-inventory.json'),(Join-Path $Directory 'chain-completion.json'),(Join-Path $Directory 'core-index/evidence-index.json'),(Join-Path $Directory 'supplemental-index/supplemental-evidence-index.json'))+@($verifiedReports.trx)+@($verifiedReports.junit)){
 $boundFiles+=[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;kind='review-evidence'}
}
# Preserve the evidence boundary beyond report totals: the exact per-game UI
# observations, copy manifests, native logs and source snapshots supplied to
# the reviewer must remain stable too. This records bytes, not new assertions.
foreach($lane in @('full','powershell','realtime','live-ui','strict-ui','preparer-real')){
 foreach($file in Get-ChildItem -LiteralPath (Join-Path $Directory $lane) -File -Recurse -Force){
  $boundFiles+=[pscustomobject]@{path=$file.FullName;sha256=(Get-FileHash -LiteralPath $file.FullName).Hash;kind='native-supporting-evidence'}
 }
}
$native='<home>/.local/share/mise/installs/npm-cline/latest/node_modules/.mise/@cline+cli-linux-x64@3.0.71/node_modules/@cline/cli-linux-x64/bin/cline'
$nativeHash=(Get-FileHash -LiteralPath $native).Hash
if($nativeHash -cne '8562EDA595D5766D253154053A0B386E0CFA1EF3ABCE928AE6FF63F594A61047'){throw 'Pinned Cline runtime changed; repeat runtime inspection'}
$brief=Get-Content -LiteralPath $BriefPath -Raw
if($brief -match 'DRAFT ONLY|<PLACEHOLDER>|<[A-Z][A-Z0-9_]+>|<workspace>'){throw 'Review brief contains draft placeholders'}
foreach($required in @('never build','never run tests','98','progress','ETA','Cline','Beam','High','30 minutes')){if(-not $brief.Contains($required,[StringComparison]::OrdinalIgnoreCase)){throw "Review brief lacks required instruction: $required"}}
$stamp=Get-Date -Format yyyyMMddTHHmmss
$prefix=Join-Path $root ('docs/receipts/hv/'+$stamp+'-release15-source-round7')
$cache=Join-Path $root ('.mcpServer/cline-hv-'+$stamp+'/plugin-cache')
$prompt=$brief+"`n`nFROZEN CANDIDATE: $revision`nEvidence directory: $Directory`nUnique Cline plugin CacheRoot: $cache`nSelf-review: $SelfReviewPath`nRequest: $prefix.request.jsonl`nFull response: $prefix.response.jsonl`n"
$prompt+="`nSUPPLIED TRX AND NATIVE REPORTS (read these files; do not execute them):`n"+($verifiedReports|ConvertTo-Json -Depth 15)
$arguments=@('--provider','cline','--model','reflection/beam-free','--thinking','high','--json','--verbose','--cwd',$root)
if(-not $PSCmdlet.ShouldProcess($prefix,'Launch independently logged Cline Beam High read-only hostile review with full supplied test evidence and unbounded review duration')){return}
$null=New-Item -ItemType Directory -Path (Split-Path $cache) -Force
[IO.File]::SetUnixFileMode((Split-Path $cache),([IO.UnixFileMode]::UserRead -bor [IO.UnixFileMode]::UserWrite -bor [IO.UnixFileMode]::UserExecute))
$request=[pscustomobject]@{timestamp=(Get-Date -Format s);workspace=$root;revision=$revision;gate='15-player source candidate ready for staging; hosted rollout and game completion not claimed';reviewer=@{agent='Cline';provider='cline';model='reflection/beam-free';displayModel='Beam';effort='High'};launch=@{executable=$native;sha256=$nativeHash;arguments=$arguments;timeout='none';sizeLimit='none';stallTermination='Only after more than30minutes without any response-stream update'};parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';selfReview=$SelfReviewPath;selfReviewSha256=(Get-FileHash -LiteralPath $SelfReviewPath).Hash;boundFiles=$boundFiles;suppliedReports=$verifiedReports;body=$prompt}
$request|ConvertTo-Json -Depth 30 -Compress|Set-Content -LiteralPath ($prefix+'.request.jsonl')
Copy-Item -LiteralPath $PSCommandPath -Destination ($prefix+'.launcher.ps1')
if((Get-FileHash -LiteralPath $PSCommandPath).Hash -cne (Get-FileHash -LiteralPath ($prefix+'.launcher.ps1')).Hash){throw 'Launcher receipt copy mismatch'}
$start=[Diagnostics.ProcessStartInfo]::new($native)
$start.WorkingDirectory=$root
$start.UseShellExecute=$false
$start.RedirectStandardInput=$true
$start.RedirectStandardOutput=$true
$start.RedirectStandardError=$true
foreach($argument in $arguments){$start.ArgumentList.Add($argument)}
$start.Environment['CLINE_PLUGIN_ROOT']='<home>/github/mcpserver-cline-plugin'
$start.Environment['PLUGIN_AGENT_NAME']='Cline'
$start.Environment['MCP_MODEL']='reflection/beam-free'
$start.Environment['MCP_AGENT_EXECUTABLE_PATH']=$native
$stdout=[IO.FileStream]::new(($prefix+'.response.jsonl'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite,1,[IO.FileOptions]::WriteThrough)
$stderr=[IO.FileStream]::new(($prefix+'.stderr.txt'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite,1,[IO.FileOptions]::WriteThrough)
[IO.File]::SetUnixFileMode(($prefix+'.response.jsonl'),([IO.UnixFileMode]::UserRead -bor [IO.UnixFileMode]::UserWrite))
[IO.File]::SetUnixFileMode(($prefix+'.stderr.txt'),([IO.UnixFileMode]::UserRead -bor [IO.UnixFileMode]::UserWrite))
$process=[Diagnostics.Process]::new()
$process.StartInfo=$start
$stoppedForSilence=$false
$started=Get-Date -Format s
$launcherFailure=$null
$captureFailures=@()
$processStarted=$false
$stdoutTask=$null
$stderrTask=$null
try{
 # Persist selection before starting the child. A metadata failure must not
 # strand an unmonitored reviewer or justify terminating an active review.
 [pscustomobject]@{timestamp=$started;revision=$revision;request=($prefix+'.request.jsonl');response=($prefix+'.response.jsonl');nativeExecutable=$native;nativeSha256=$nativeHash;arguments=$arguments;effortAttestation='Explicit High flag, pinned3.0.71 resolution semantics, and actual launch arguments. Backend internal effort acknowledgement is not exposed or claimed.'}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath ($prefix+'.runtime.json')
 $processStarted=$process.Start()
 if(-not $processStarted){throw 'Cline process did not start'}
 $stdoutTask=$process.StandardOutput.BaseStream.CopyToAsync($stdout)
 $stderrTask=$process.StandardError.BaseStream.CopyToAsync($stderr)
 try{$process.StandardInput.Write($prompt)}catch{$launcherFailure=$_.Exception.Message}
 try{$process.StandardInput.Close()}catch{$launcherFailure=(@($launcherFailure,$_.Exception.Message)|Where-Object {$_}) -join '; '}
}catch{$launcherFailure=(@($launcherFailure,$_.Exception.Message)|Where-Object {$_}) -join '; '}
finally{
 try{
  if($processStarted){
   # This ownership boundary applies to every post-start exception, including
   # stdin/capture setup failures. Such a failure is never a termination reason.
   try{$process.StandardInput.Close()}catch{$captureFailures+=$_.Exception.Message}
   $lastLength=0L
   $lastUpdate=[DateTime]::Now
   while(-not $process.HasExited){
    try{$length=$stdout.Length}
    catch{
     # A monitor read error is not evidence of reviewer silence and must not
     # unwind ownership or close an active reviewer's captured streams.
     $captureFailures+=('Response length inspection failed: '+$_.Exception.Message)
     [Threading.Thread]::Sleep(500)
     continue
    }
    if($length -ne $lastLength){$lastLength=$length;$lastUpdate=[DateTime]::Now}
    if(([DateTime]::Now-$lastUpdate).TotalMinutes -gt 30){$process.Kill($true);$stoppedForSilence=$true;break}
    [Threading.Thread]::Sleep(500)
   }
   $process.WaitForExit()
   foreach($task in @($stdoutTask,$stderrTask)|Where-Object {$_}){try{$task.GetAwaiter().GetResult()}catch{$captureFailures+=$_.Exception.Message}}
  }
  $drift=@()
  try{
   if((& git -C $root rev-parse HEAD).Trim() -cne $revision){$drift+='Git HEAD changed during review'}
   if(@(Compare-Object $pinnedSourcePaths @(Get-CurrentSourcePath)).Count){$drift+='Declared source path set changed during review'}
   foreach($pin in $boundFiles){if(-not(Test-Path -LiteralPath $pin.path -PathType Leaf) -or (Get-FileHash -LiteralPath $pin.path).Hash -cne $pin.sha256){$drift+=$pin.path}}
  }catch{$drift+='Post-review binding inspection failed: '+$_.Exception.Message}
  [pscustomobject]@{startedAt=$started;finishedAt=(Get-Date -Format s);revision=$revision;processStarted=$processStarted;processId=if($processStarted){$process.Id}else{$null};exitCode=if($processStarted){$process.ExitCode}else{$null};launcherFailure=$launcherFailure;captureFailures=$captureFailures;bindingDrift=$drift;stoppedForSilence=$stoppedForSilence;response=($prefix+'.response.jsonl');qualification='Process completion is not reviewer approval. Verify actual model stream, full verdict, both scores and reviewer-owned MCP readback. A launcher/capture failure or binding drift makes this invocation incomplete.'}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath ($prefix+'.process-result.json')
 }finally{$stdout.Dispose();$stderr.Dispose();$process.Dispose()}
}
