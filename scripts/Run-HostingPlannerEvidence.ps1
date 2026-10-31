#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory,[string]$ParentRunId)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot
$revision=(& git -C $repo rev-parse HEAD).Trim()
if(-not $PSCmdlet.ShouldProcess($ReportDirectory,'Run the planner mock, negative controls and real cases with provenance')){return}
$null=New-Item -ItemType Directory -Path $ReportDirectory -Force
$runId=[Guid]::NewGuid().ToString('D')
$hostName=[Environment]::MachineName
$test=Join-Path $repo 'tests/powershell/HostingSchemaPlanner.Tests.ps1'
$producer=$PSCommandPath
$invocation=@('pwsh','-NoProfile','-NonInteractive','-File',$producer,'-ReportDirectory',$ReportDirectory,'-ParentRunId',$ParentRunId)
$runs=[Collections.Generic.List[object]]::new()
$started=Get-Date -Format s
$controls=Join-Path $repo 'tests/powershell/Run-HostingSchemaMockGate.ps1'
& $controls -ReportDirectory (Join-Path $ReportDirectory 'controls')
$runs.Add([pscustomobject]@{name='negative-controls';runId=$runId;hostName=$hostName;revision=$revision;startedAt=$started;finishedAt=(Get-Date -Format s);invocation=$invocation;step='Run-HostingSchemaMockGate.ps1';outcome='passed';report='controls/mock-gate.json'})
$env:WORDPAIRS_PLANNER_MODULE=Join-Path $repo 'tests/powershell/HostingSchemaPlanner.MockCorrect.psm1'
try{
 $started=Get-Date -Format s
 $config=New-PesterConfiguration
 $config.Run.Path=@($test);$config.Run.PassThru=$true;$config.Output.Verbosity='Normal'
 $config.TestResult.Enabled=$true;$config.TestResult.OutputFormat='JUnitXml';$config.TestResult.OutputPath=Join-Path $ReportDirectory 'mock.xml'
 $mock=Invoke-Pester -Configuration $config
 if($mock.PassedCount -ne 8 -or $mock.FailedCount -or $mock.SkippedCount){throw 'Correct mock run was not fully green.'}
 $runs.Add([pscustomobject]@{name='planner-mock';runId=$runId;hostName=$hostName;revision=$revision;startedAt=$started;finishedAt=(Get-Date -Format s);invocation=$invocation;step='Invoke-Pester -Configuration $config';outcome='passed';failedCount=$mock.FailedCount;report='mock.xml';module=$env:WORDPAIRS_PLANNER_MODULE})
}finally{Remove-Item Env:WORDPAIRS_PLANNER_MODULE -ErrorAction SilentlyContinue}
$started=Get-Date -Format s
$realGate=Join-Path $repo 'tests/powershell/Run-HostingSchemaRealGate.ps1'
& $realGate -ReportDirectory $ReportDirectory
$real=Get-Content (Join-Path $ReportDirectory 'real-gate.json') -Raw|ConvertFrom-Json
if($real.passed -ne 8 -or $real.failed -or $real.skipped){throw 'Real planner run was not fully green.'}
$runs.Add([pscustomobject]@{name='planner-real';runId=$runId;hostName=$hostName;revision=$revision;startedAt=$started;finishedAt=(Get-Date -Format s);invocation=$invocation;step='Run-HostingSchemaRealGate.ps1';outcome='passed';report='real.xml'})
if((& git -C $repo rev-parse HEAD).Trim() -cne $revision){throw 'HEAD changed during planner validation.'}
[pscustomobject]@{timestamp=(Get-Date -Format s);runId=$runId;parentRunId=$ParentRunId;hostName=$hostName;revision=$revision;producer=$producer;producerSha256=(Get-FileHash $producer).Hash;invocation=$invocation;mockCases=8;realCases=8;testSha256=(Get-FileHash $test).Hash;runs=@($runs)}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $ReportDirectory 'receipt.json')
