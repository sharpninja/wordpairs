#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot
$adapter=Join-Path $PSScriptRoot 'Convert-JUnitToTrx.ps1'
$fixture=Join-Path $repo 'tests/fixtures/junit-outcomes.xml'
$empty=Join-Path $repo 'tests/fixtures/junit-empty.xml'
$target=Join-Path $OutputDirectory ('fixture-'+[guid]::NewGuid().ToString('N')+'.trx')
if(-not $PSCmdlet.ShouldProcess($OutputDirectory,'Validate isolated adapter fixtures; preserve generated evidence')){return}
$null=New-Item $OutputDirectory -ItemType Directory -Force
$null=& $adapter -InputPath $fixture -OutputPath $target -SourceRevision 'synthetic-fixture-only' -WhatIf
if(Test-Path $target){throw 'WhatIf wrote output'}
$summary=& $adapter -InputPath $fixture -OutputPath $target -SourceRevision 'synthetic-fixture-only'|ConvertFrom-Json
if($summary.total -ne 3 -or $summary.passed -ne 1 -or $summary.failed -ne 1 -or $summary.skipped -ne 1){throw 'Incorrect synthetic outcomes'}
[xml]$xml=Get-Content $target -Raw
$outcomes=@($xml.SelectNodes('//*[local-name()="UnitTestResult"]')|ForEach-Object{$_.GetAttribute('outcome')})
if(($outcomes -join ',') -ne 'Passed,Failed,NotExecuted'){throw 'Incorrect individual outcomes'}
$rejected=$false
try{$null=& $adapter -InputPath $empty -OutputPath ($target+'.invalid') -SourceRevision 'synthetic-fixture-only'}catch{$rejected=$_.Exception.Message -eq 'JUnit contains no individual testcase records'}
if(-not $rejected -or (Test-Path ($target+'.invalid'))){throw 'Empty report rejection failed'}
$result=@{timestamp=(Get-Date -Format s);correctOutcomes=3;negativeControls=2;whatIfCreatesNoOutput=$true;emptyReportRejected=$true;adapterSha256=(Get-FileHash $adapter).Hash;harnessSha256=(Get-FileHash $PSCommandPath).Hash;fixtureSha256=(Get-FileHash $fixture).Hash;output=$target;qualification='Synthetic fixture deliberately contains passed/failed/skipped input. All adapter assertions passed; these are not application execution results.'}
$result|ConvertTo-Json|Set-Content (Join-Path $OutputDirectory 'adapter-validation.json')
$result|ConvertTo-Json
