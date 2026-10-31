#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).ProviderPath
$module=Join-Path $root 'scripts/HostingSchemaPlanner.psm1'
$test=Join-Path $PSScriptRoot 'HostingSchemaPlanner.Tests.ps1'
if(-not $PSCmdlet.ShouldProcess($ReportDirectory,'Run the mock-validated planner assertions against the production PowerShell module')){return}
New-Item -ItemType Directory -Path $ReportDirectory -Force|Out-Null
$env:WORDPAIRS_PLANNER_MODULE=$module
$configuration=New-PesterConfiguration
$configuration.Run.Path=@($test)
$configuration.Run.PassThru=$true
$configuration.Output.Verbosity='Detailed'
$configuration.TestResult.Enabled=$true
$configuration.TestResult.OutputFormat='JUnitXml'
$configuration.TestResult.OutputPath=Join-Path $ReportDirectory 'real.xml'
$result=Invoke-Pester -Configuration $configuration
Remove-Item Env:WORDPAIRS_PLANNER_MODULE -ErrorAction SilentlyContinue
$receipt=[pscustomobject]@{
    timestamp=Get-Date -Format s
    moduleSha256=(Get-FileHash $module -Algorithm SHA256).Hash
    testSha256=(Get-FileHash $test -Algorithm SHA256).Hash
    passed=$result.PassedCount
    failed=$result.FailedCount
    skipped=$result.SkippedCount
    testResult='real.xml'
}
$receipt|ConvertTo-Json -Depth 5|Set-Content (Join-Path $ReportDirectory 'real-gate.json')
$receipt|ConvertTo-Json -Depth 5
if($result.PassedCount -ne 8 -or $result.FailedCount -ne 0 -or $result.SkippedCount -ne 0){throw 'Production planner gate failed.'}
