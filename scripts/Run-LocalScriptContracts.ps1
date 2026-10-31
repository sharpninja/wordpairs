#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory,[string]$ParentRunId)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot
$report=[IO.Path]::GetFullPath($ReportDirectory)
if(-not $PSCmdlet.ShouldProcess($report,'Run isolated PowerShell contracts and write JUnit evidence')){return}
$null=New-Item -ItemType Directory -Path $report -Force
$revision=(& git -C $repo rev-parse HEAD).Trim()
$runId=[Guid]::NewGuid().ToString('D')
$started=Get-Date -Format s
$results=[Collections.Generic.List[object]]::new()
foreach($name in @('local-live-lease.contract.ps1','local-realtime-cleanup.contract.ps1','local-ui-startup.contract.ps1')){
 $path=Join-Path $repo "tests/integration/$name"
 $arguments=@('-NoProfile','-NonInteractive','-File',$path)
 $caseStart=Get-Date -Format s
 & pwsh @arguments *>&1 | Tee-Object (Join-Path $report "$name.log")
 $results.Add([pscustomobject]@{name=$name;runId=$runId;hostName=[Environment]::MachineName;revision=$revision;startedAt=$caseStart;finishedAt=(Get-Date -Format s);executable='pwsh';arguments=$arguments;exitCode=$LASTEXITCODE;sha256=(Get-FileHash $path).Hash})
}
$doc=[System.Xml.XmlDocument]::new()
$suite=$doc.CreateElement('testsuite')
$suite.SetAttribute('name','isolated PowerShell contracts')
$suite.SetAttribute('tests',[string]$results.Count)
$failed=@($results|Where-Object exitCode -ne 0).Count
$suite.SetAttribute('failures',[string]$failed)
$null=$doc.AppendChild($suite)
foreach($result in $results){
 $case=$doc.CreateElement('testcase');$case.SetAttribute('classname','local-script-contract');$case.SetAttribute('name',$result.name)
 if($result.exitCode -ne 0){$failure=$doc.CreateElement('failure');$failure.SetAttribute('message',"Exit code $($result.exitCode); see $($result.name).log");$null=$case.AppendChild($failure)}
 $null=$suite.AppendChild($case)
}
$doc.Save((Join-Path $report 'contracts.xml'))
[pscustomobject]@{runId=$runId;parentRunId=$ParentRunId;hostName=[Environment]::MachineName;revision=$revision;startedAt=$started;finishedAt=(Get-Date -Format s);producer=$PSCommandPath;producerSha256=(Get-FileHash $PSCommandPath).Hash;invocation=@('pwsh','-NoProfile','-NonInteractive','-File',$PSCommandPath,'-ReportDirectory',$report,'-ParentRunId',$ParentRunId);results=@($results)}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $report 'receipt.json')
if($failed){throw "$failed local script contracts failed."}
