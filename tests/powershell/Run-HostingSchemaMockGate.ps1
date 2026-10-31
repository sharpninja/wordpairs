#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).ProviderPath
$test=Join-Path $PSScriptRoot 'HostingSchemaPlanner.Tests.ps1'
$correct=Join-Path $PSScriptRoot 'HostingSchemaPlanner.MockCorrect.psm1'
$wrong=Join-Path $PSScriptRoot 'HostingSchemaPlanner.MockWrong.psm1'
$wrongEmpty=Join-Path $PSScriptRoot 'HostingSchemaPlanner.MockWrongEmpty.psm1'
$wrongOmitted=Join-Path $PSScriptRoot 'HostingSchemaPlanner.MockWrongOmitted.psm1'
if(-not $PSCmdlet.ShouldProcess($ReportDirectory,'Run independent planner mock gate and save evidence')){return}
New-Item -ItemType Directory -Path $ReportDirectory -Force|Out-Null
$runs=@()
foreach($case in @(@{name='correct';module=$correct},@{name='wrong';module=$wrong},@{name='wrong-empty';module=$wrongEmpty},@{name='wrong-omitted';module=$wrongOmitted})){
    $env:WORDPAIRS_PLANNER_MODULE=$case.module
    $configuration=New-PesterConfiguration
    $configuration.Run.Path=@($test)
    $configuration.Run.PassThru=$true
    $configuration.Output.Verbosity='Detailed'
    $configuration.TestResult.Enabled=$true
    $configuration.TestResult.OutputFormat='NUnitXml'
    $configuration.TestResult.OutputPath=Join-Path $ReportDirectory ($case.name+'.xml')
    $result=Invoke-Pester -Configuration $configuration
    $cases=@($result.Tests | ForEach-Object { [pscustomobject]@{name=$_.Name;result=[string]$_.Result} })
    $runs+= [pscustomobject]@{name=$case.name;passed=$result.PassedCount;failed=$result.FailedCount;skipped=$result.SkippedCount;cases=$cases}
}
Remove-Item Env:WORDPAIRS_PLANNER_MODULE -ErrorAction SilentlyContinue
if($runs[0].passed -ne 8 -or $runs[0].failed -ne 0 -or $runs[0].skipped -ne 0){throw 'Correct mock did not pass every planner case.'}
foreach($case in $runs[0].cases){
    $controls=@($runs[1..3] | ForEach-Object { $_.cases | Where-Object name -CEQ $case.name })
    if($controls.Count -ne 3 -or @($controls | Where-Object result -EQ 'Failed').Count -eq 0){throw "No rejecting negative control for: $($case.name)"}
}
if(@($runs[3].cases|Where-Object { $_.name -eq 'includes digit-bearing 014 in the exact core and hosted order with original source bodies' -and $_.result -eq 'Failed' }).Count -ne 1){throw 'Targeted014 omission was not rejected'}
$receipt=[pscustomobject]@{
    timestamp=Get-Date -Format s
    root=$root
    test=(Resolve-Path $test).ProviderPath
    testSha256=(Get-FileHash $test -Algorithm SHA256).Hash
    correctMockSha256=(Get-FileHash $correct -Algorithm SHA256).Hash
    wrongMockSha256=(Get-FileHash $wrong -Algorithm SHA256).Hash
    wrongEmptyMockSha256=(Get-FileHash $wrongEmpty -Algorithm SHA256).Hash
    wrongOmittedMockSha256=(Get-FileHash $wrongOmitted -Algorithm SHA256).Hash
    runs=$runs
    qualification='Mock sensitivity evidence. A rerun does not establish pre-implementation chronology; use the retained original gate and production-module before/after hashes. Historical receipts are unchanged.'
}
$receipt|ConvertTo-Json -Depth 6|Set-Content (Join-Path $ReportDirectory 'mock-gate.json')
$receipt|ConvertTo-Json -Depth 6
