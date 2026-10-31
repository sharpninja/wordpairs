#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$Directory)
$ErrorActionPreference='Stop'
$root='<repo>'
$Directory=[IO.Path]::GetFullPath($Directory)
$inventory=Get-Content -Raw (Join-Path $Directory 'expected-inventory.json')|ConvertFrom-Json
$runner=Join-Path $root 'docs/evidence/release15/operational-producers/RunWordpairsRelease15Evidence.ps1'
if((& git -C $root rev-parse HEAD).Trim() -cne $inventory.revision){throw 'Frozen revision changed'}
if(Test-Path -LiteralPath (Join-Path $Directory 'chain-completion.json')){throw 'Do not overwrite an earlier chain receipt'}
if(-not $PSCmdlet.ShouldProcess($Directory,'Run full source, PowerShell, real transport, every2..15 UI game and strict-push lanes sequentially on the frozen revision')){return}
$started=Get-Date -Format s
$phases=@();$preparation=@();$failure=$null
function Assert-FrozenOperationalProducer {
 [CmdletBinding()]
 param()
 foreach($name in @('RunWordpairsRelease15Evidence.ps1','InitializeNextWordpairsEvidence.ps1','RunNextWordpairsEvidenceChain.ps1')){
  $relative='docs/evidence/release15/operational-producers/'+$name
  $path=Join-Path $root $relative
  $committed=& git -C $root rev-parse ($inventory.revision+':'+$relative)
  if($LASTEXITCODE){throw 'Operational producer is not committed at the frozen revision'}
  $actual=& git -C $root hash-object -- $path
  if($LASTEXITCODE -or "$actual".Trim() -cne "$committed".Trim()){throw 'Operational producer bytes differ from the frozen commit'}
 }
}
try{
 Assert-FrozenOperationalProducer
 foreach($lane in @('full','powershell','realtime','live-ui','strict-ui')){
  $report=Join-Path $Directory $lane
  if(Test-Path -LiteralPath $report){throw 'Lane directory already exists; retain interrupted runs'}
  $begin=Get-Date -Format s
  & pwsh -NoProfile -NonInteractive -File $runner -Lane $lane -ReportDirectory $report -EvidenceRunId $inventory.runId
  $code=$LASTEXITCODE
  $phases+=[pscustomobject]@{lane=$lane;startedAt=$begin;finishedAt=(Get-Date -Format s);exitCode=$code;reportDirectory=$report}
  Assert-FrozenOperationalProducer
  if($code){throw "Validation lane $lane failed; retained all available receipts"}
 }
 $supplementalReports=@(foreach($lane in @('realtime','live-ui','strict-ui')){
  $invocation=Get-Content -LiteralPath (Join-Path (Join-Path $Directory $lane) 'invocation.json') -Raw|ConvertFrom-Json
  if($invocation.revision -cne $inventory.revision -or @($invocation.reports).Count -ne 1 -or $invocation.reports[0].runId -cne $inventory.runId){throw 'Supplemental lane identity differs from the frozen collection'}
  $invocation.reports[0]
 })
 $supplementalManifest=Join-Path $Directory 'supplemental-invocation.json'
 [pscustomobject]@{runId=$inventory.runId;revision=$inventory.revision;reports=$supplementalReports}|ConvertTo-Json -Depth 15|Set-Content -LiteralPath $supplementalManifest
 $operations=@(
  @{name='core-index';arguments=@('-NoProfile','-NonInteractive','-File',(Join-Path $root 'scripts/Prepare-ReviewEvidence.ps1'),'-ReportDirectory',(Join-Path $Directory 'full'),'-PowerShellDirectory',(Join-Path $Directory 'powershell'),'-OutputDirectory',(Join-Path $Directory 'core-index'),'-SourceInventoryPath',(Join-Path $Directory 'source-inventory.json'),'-ExpectedUnitCount',[string]$inventory.expectedUnitCount,'-ExpectedPostgresCount',[string]$inventory.expectedPostgresCount,'-ExpectedBrowserCount',[string]$inventory.expectedBrowserCount)}
  @{name='preparer-real';arguments=@('-NoProfile','-NonInteractive','-File',(Join-Path $root 'tests/powershell/Run-ReviewEvidencePreparationGate.ps1'),'-ReportDirectory',(Join-Path $Directory 'preparer-real'),'-Mode','Real','-ParentRunId',$inventory.runId)}
  @{name='preparer-trx';arguments=@('-NoProfile','-NonInteractive','-File',(Join-Path $root 'scripts/Convert-JUnitToTrx.ps1'),'-InputPath',(Join-Path $Directory 'preparer-real/Real.xml'),'-OutputPath',(Join-Path $Directory 'preparer-real/Real.trx'),'-SourceRevision',$inventory.revision,'-HostName',[Environment]::MachineName)}
  @{name='supplemental-index';arguments=@('-NoProfile','-NonInteractive','-File',(Join-Path $root 'scripts/Prepare-ReviewSupplementalEvidence.ps1'),'-InvocationManifestPath',$supplementalManifest,'-SourceInventoryPath',(Join-Path $Directory 'source-inventory.json'),'-OutputDirectory',(Join-Path $Directory 'supplemental-index'),'-ExpectedRealtimeCount',[string]$inventory.expectedRealtimeCount)}
 )
 foreach($operation in $operations){
  $begin=Get-Date -Format s
  $nativeArguments=$operation.arguments
  & pwsh @nativeArguments
  $code=$LASTEXITCODE
  $preparation+=[pscustomobject]@{name=$operation.name;startedAt=$begin;finishedAt=(Get-Date -Format s);executable='pwsh';arguments=$nativeArguments;exitCode=$code}
  Assert-FrozenOperationalProducer
  if($code){throw ('Evidence preparation failed: '+$operation.name)}
 }
}catch{$failure=$_.Exception.Message}
finally{
 try{Assert-FrozenOperationalProducer}catch{$failure=(@($failure,$_.Exception.Message)|Where-Object {$_}) -join '; '}
 [pscustomobject]@{runId=$inventory.runId;revision=$inventory.revision;hostName=[Environment]::MachineName;producer=$PSCommandPath;producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;startedAt=$started;finishedAt=(Get-Date -Format s);phases=$phases;preparation=$preparation;failure=$failure;qualification='Operational validation orchestration. Neither successful local tests nor these receipts establish independent review or hosted rollout.'}|ConvertTo-Json -Depth 10|Set-Content (Join-Path $Directory 'chain-completion.json')
}
if($failure){throw $failure}
'Sequential validation chain finished; inspect each native receipt and prepare the review evidence before any approval claim.'
