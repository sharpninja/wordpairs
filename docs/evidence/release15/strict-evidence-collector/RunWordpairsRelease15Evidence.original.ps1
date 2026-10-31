#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
 [Parameter(Mandatory)][ValidateSet('full','powershell','realtime','live-ui','strict-ui')][string]$Lane,
 [Parameter(Mandatory)][string]$ReportDirectory,
 [string]$EvidenceRunId
)
$ErrorActionPreference='Stop'
$root='<repo>'
$report=[IO.Path]::GetFullPath($ReportDirectory)
if(Test-Path -LiteralPath $report){throw 'A fresh report directory is required; retain any interrupted run'}
$revision=(& git -C $root rev-parse HEAD).Trim()
$dirty=@(& git -C $root status --short -- src tests scripts public package.json package-lock.json tsconfig.json next.config.ts biome.json 'vitest*.config.ts' 'playwright*.config.ts')
if($dirty.Count){throw 'Frozen source required before execution'}
if(-not $PSCmdlet.ShouldProcess($report,"Execute $Lane on frozen source and preserve per-run provenance")){return}
$null=New-Item -ItemType Directory -Path $report -Force
$runId=if($EvidenceRunId){[Guid]::Parse($EvidenceRunId).ToString('D')}else{[Guid]::NewGuid().ToString('D')}
$startedInstant=[DateTime]::Now
$started=$startedInstant.ToString('s')
$arguments=@('-NoProfile','-NonInteractive','-File')
$junit=$null;$expectedCount=0
switch($Lane){
 'full'{$arguments+=@('scripts/Run-ReviewFullValidation.ps1','-ReportDirectory',$report)}
 'powershell'{$arguments+=@('scripts/Run-ReviewPowerShellEvidence.ps1','-ReportDirectory',$report)}
 'realtime'{$arguments+=@('tests/integration/run-phase1.ps1','-Realtime','-ReportDirectory',$report,'-VolatileStorage');$junit=Join-Path $report 'realtime.xml';$expectedCount=4}
 'live-ui'{$arguments+=@('scripts/run-local-ui-integration.ps1','-PlayerCounts','2,3,4,5,6,7,8,9,10,11,12,13,14,15','-MaxMinutes','90');$junit=Join-Path $report 'live-ui.xml';$expectedCount=14}
 'strict-ui'{$arguments+=@('scripts/run-local-ui-integration.ps1','-StrictPush','-MaxMinutes','30');$junit=Join-Path $report 'strict-ui.xml';$expectedCount=1}
}
$before=Join-Path $report 'source-before.json'
$after=Join-Path $report 'source-after.json'
& pwsh -NoProfile -NonInteractive -File (Join-Path $root 'scripts/Get-CandidateSourceManifest.ps1') -Root $root -OutputPath $before | Out-Null
if($LASTEXITCODE){throw 'Source-before manifest failed'}
$priorJUnit=$env:PLAYWRIGHT_JUNIT_OUTPUT_FILE
$code=1
Push-Location $root
try{
 if($Lane -in @('live-ui','strict-ui')){$env:PLAYWRIGHT_JUNIT_OUTPUT_FILE=$junit}
 & pwsh @arguments *>&1|Tee-Object -FilePath (Join-Path $report 'invocation.log')
 $code=$LASTEXITCODE
}finally{
 $env:PLAYWRIGHT_JUNIT_OUTPUT_FILE=$priorJUnit
 Pop-Location
 $unchanged=$false;$sourceAfterFailure=$null
 try{
  & pwsh -NoProfile -NonInteractive -File (Join-Path $root 'scripts/Get-CandidateSourceManifest.ps1') -Root $root -OutputPath $after | Out-Null
  if($LASTEXITCODE){throw 'Source-after manifest failed'}
  $b=Get-Content $before -Raw|ConvertFrom-Json
  $a=Get-Content $after -Raw|ConvertFrom-Json
  $unchanged=$b.revision -ceq $revision -and $a.revision -ceq $revision -and -not @(Compare-Object @($b.sourceHashes|ForEach-Object {$_.path+':'+$_.sha256}) @($a.sourceHashes|ForEach-Object {$_.path+':'+$_.sha256})).Count
 }catch{$sourceAfterFailure=$_.Exception.Message}
 $reportHash=if($junit -and (Test-Path $junit)){(Get-FileHash $junit).Hash}else{$null}
 $entry=[pscustomobject]@{name=$Lane;kind=$Lane;expectedCount=$expectedCount;runId=$runId;hostName=[Environment]::MachineName;startedAt=$started;finishedAt=(Get-Date -Format s);producer=$PSCommandPath;producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;executable='pwsh';arguments=$arguments;exitCode=$code;junit=$junit;junitSha256=$reportHash;revision=$revision;sourceUnchanged=$unchanged;sourceBefore=$before;sourceAfter=$after;sourceAfterFailure=$sourceAfterFailure}
 [pscustomobject]@{revision=$revision;reports=@($entry)}|ConvertTo-Json -Depth 12|Set-Content (Join-Path $report 'invocation.json')
 if($Lane -in @('live-ui','strict-ui')){
  $preserved=Join-Path $report 'runtime-receipts'
  $null=New-Item -ItemType Directory -Path $preserved -Force
  $copied=@()
  foreach($file in Get-ChildItem (Join-Path $root 'docs/evidence/room-sync') -File|Where-Object {$_.LastWriteTime -ge $startedInstant -and ($_.Name -like 'live-local-*' -or ($Lane -eq 'live-ui' -and $_.Name -match '^live-scale-(?:[2-9]|1[0-5])(?:-failure-ui)?\.json$'))}){
   Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $preserved $file.Name)
   if((Get-FileHash $file.FullName).Hash -cne (Get-FileHash (Join-Path $preserved $file.Name)).Hash){throw 'Runtime evidence copy mismatch'}
   $copied+=[pscustomobject]@{name=$file.Name;lastWriteTime=$file.LastWriteTime.ToString('s');sha256=(Get-FileHash -LiteralPath $file.FullName).Hash}
  }
  [pscustomobject]@{runId=$runId;revision=$revision;lane=$Lane;startedAt=$startedInstant.ToString('o');qualification='Only auxiliary files modified during this invocation were copied. Native JUnit defines executed cases; a copied file alone is not execution success.';files=$copied}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $report 'runtime-copy-manifest.json')
  $artifacts=Join-Path $root 'test-results/live-local'
  if(Test-Path -LiteralPath $artifacts){
   foreach($artifact in Get-ChildItem -LiteralPath $artifacts -File -Recurse|Where-Object LastWriteTime -GE $startedInstant){
    $relative=[IO.Path]::GetRelativePath($artifacts,$artifact.FullName)
    $destination=Join-Path (Join-Path $report 'browser-artifacts') $relative
    $null=New-Item -ItemType Directory -Path (Split-Path $destination) -Force
    Copy-Item -LiteralPath $artifact.FullName -Destination $destination
    if((Get-FileHash -LiteralPath $destination).Hash -cne (Get-FileHash -LiteralPath $artifact.FullName).Hash){throw 'Current browser artifact copy differs'}
   }
  }
 }
}
if(-not $unchanged){throw 'Source changed during execution; results cannot qualify frozen source'}
if($code){throw "$Lane returned exit code $code; failure receipts retained"}
Write-Output "Recorded $Lane run $runId at $revision with unchanged source."
