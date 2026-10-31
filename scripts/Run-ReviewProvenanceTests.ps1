#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory,[string]$ParentRunId)
$ErrorActionPreference='Stop'
if(-not $PSCmdlet.ShouldProcess($ReportDirectory,'Run provenance checks and write JUnit evidence')){return}
$null=New-Item -ItemType Directory -Path $ReportDirectory -Force
$repo=Split-Path $PSScriptRoot
$config=New-PesterConfiguration
$config.Run.Path=@(Join-Path $repo 'tests/powershell/ReviewRunProvenance.Tests.ps1')
$config.Run.PassThru=$true;$config.Output.Verbosity='Normal'
$config.TestResult.Enabled=$true;$config.TestResult.OutputFormat='JUnitXml';$config.TestResult.OutputPath=Join-Path $ReportDirectory 'provenance.xml'
$result=Invoke-Pester -Configuration $config
if($result.PassedCount -ne 9 -or $result.FailedCount -or $result.SkippedCount){throw 'Provenance tests failed or did not all run.'}
[pscustomobject]@{runId=[Guid]::NewGuid().ToString('D');parentRunId=$ParentRunId;producer=$PSCommandPath;producerSha256=(Get-FileHash $PSCommandPath).Hash;passed=$result.PassedCount;failed=$result.FailedCount;skipped=$result.SkippedCount}|ConvertTo-Json|Set-Content (Join-Path $ReportDirectory 'receipt.json')
