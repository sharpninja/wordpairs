#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot
$report=[IO.Path]::GetFullPath($ReportDirectory)
if(-not $PSCmdlet.ShouldProcess($report,'Run and record isolated planner, cleanup and documentation contracts')){return}
$null=New-Item -ItemType Directory -Path $report -Force
$revision=(& git -C $repo rev-parse HEAD).Trim()
$runId=[Guid]::NewGuid().ToString('D')
$reports=[Collections.Generic.List[object]]::new()
foreach($item in @(
 @{name='planner';script='scripts/Run-HostingPlannerEvidence.ps1';outputs=@(@{file='mock.xml';count=8},@{file='real.xml';count=8})},
 @{name='contracts';script='scripts/Run-LocalScriptContracts.ps1';outputs=@(@{file='contracts.xml';count=3})},
 @{name='docs';script='scripts/Run-CurrentReleaseDocsTests.ps1';outputs=@(@{file='docs.xml';count=22})},
 @{name='provenance';script='scripts/Run-ReviewProvenanceTests.ps1';outputs=@(@{file='provenance.xml';count=9})}
)){
 $folder=Join-Path $report $item.name
 $script=Join-Path $repo $item.script
 $arguments=@('-NoProfile','-NonInteractive','-File',$script,'-ReportDirectory',$folder,'-ParentRunId',$runId)
 $started=Get-Date -Format s
 & pwsh @arguments *>&1 | Tee-Object (Join-Path $report "$($item.name).log")
 $code=$LASTEXITCODE
 $finished=Get-Date -Format s
 if($code){throw "$($item.name) failed: $code"}
 $producerReceipt=Get-Content (Join-Path $folder 'receipt.json') -Raw|ConvertFrom-Json
 if($producerReceipt.parentRunId -cne $runId){throw "Producer parent run ID mismatch: $($item.name)"}
 if($producerReceipt.producerSha256 -cne (Get-FileHash $script).Hash){throw "Producer hash mismatch: $($item.name)"}
 $producerReceiptHash=(Get-FileHash (Join-Path $folder 'receipt.json')).Hash
 foreach($entry in $item.outputs){
  $junit=Join-Path $folder $entry.file
  [xml]$xml=Get-Content $junit -Raw
  $cases=@($xml.SelectNodes('//testcase'))
  if($cases.Count -ne $entry.count -or @($cases|Where-Object {$_.SelectSingleNode('failure|error|skipped')}).Count){throw "Invalid JUnit: $junit"}
  $name="$($item.name)-$([IO.Path]::GetFileNameWithoutExtension($entry.file))"
  $trx=Join-Path $report "$name.trx"
  & pwsh -NoProfile -NonInteractive -File (Join-Path $repo 'scripts/Convert-JUnitToTrx.ps1') -InputPath $junit -OutputPath $trx -SourceRevision $revision | Out-Null
  if($LASTEXITCODE){throw "TRX conversion failed for $name"}
  $reports.Add([pscustomobject]@{name=$name;runId=$runId;producerRunId=$producerReceipt.runId;producerReceipt=(Join-Path $folder 'receipt.json');producerReceiptSha256=$producerReceiptHash;hostName=[Environment]::MachineName;revision=$revision;startedAt=$started;finishedAt=$finished;executable='pwsh';arguments=$arguments;exitCode=$code;producerSha256=(Get-FileHash $script).Hash;junit=$junit;junitSha256=(Get-FileHash $junit).Hash;trx=$trx;trxSha256=(Get-FileHash $trx).Hash;cases=$entry.count;failed=0;skipped=0})
 }
}
if((& git -C $repo rev-parse HEAD).Trim() -cne $revision){throw 'HEAD changed during tests.'}
[pscustomobject]@{timestamp=(Get-Date -Format s);runId=$runId;hostName=[Environment]::MachineName;revision=$revision;reports=@($reports);plannerControls=(Join-Path $report 'planner/controls/mock-gate.json')}|ConvertTo-Json -Depth 10|Set-Content (Join-Path $report 'evidence.json')
