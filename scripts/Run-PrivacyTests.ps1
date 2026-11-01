#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([string]$OutputDirectory=(Join-Path ([IO.Path]::GetTempPath()) 'wordpairs-privacy-tests'),[string]$GitleaksPath='gitleaks')
$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).ProviderPath
if(-not $PSCmdlet.ShouldProcess($OutputDirectory,'Run isolated synthetic privacy fixtures and write their test receipts')){return}
Import-Module Pester -RequiredVersion 5.9.1
[void][IO.Directory]::CreateDirectory($OutputDirectory)
$configuration=New-PesterConfiguration
$configuration.Run.Container=@(
    (New-PesterContainer -Path (Join-Path $root 'tests/powershell/PrivacyExport.Tests.ps1') -Data @{RepositoryRoot=$root;GitleaksPath=$GitleaksPath}),
    (New-PesterContainer -Path (Join-Path $root 'tests/powershell/PublishedEvidenceManifest.Tests.ps1') -Data @{RepositoryRoot=$root})
)
$configuration.Run.PassThru=$true
$configuration.TestResult.Enabled=$true
$configuration.TestResult.OutputFormat='JUnitXml'
$configuration.TestResult.OutputPath=Join-Path $OutputDirectory 'privacy.junit.xml'
$configuration.Output.Verbosity='Detailed'
$result=Invoke-Pester -Configuration $configuration
[ordered]@{measuredLocal=[DateTimeOffset]::Now.ToString('o');passed=$result.PassedCount;failed=$result.FailedCount;skipped=$result.SkippedCount;total=$result.TotalCount;gitleaksVersion=(& $GitleaksPath version);liveRequirementsModified=$false}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $OutputDirectory 'privacy-test-receipt.json') -Encoding utf8
if($result.FailedCount -gt 0 -or $result.PassedCount -eq 0){throw 'Privacy fixture tests failed.'}
