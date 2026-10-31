#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
if(-not $PSCmdlet.ShouldProcess($ReportDirectory,'Validate provenance assertions with correct and incorrect fixtures')){return}
$null=New-Item -ItemType Directory -Path $ReportDirectory -Force
$test=Join-Path $PSScriptRoot 'ReviewRunProvenance.Tests.ps1'
$runs=[Collections.Generic.List[object]]::new()
try{
 foreach($kind in @('Correct','Wrong')){
  $module=Join-Path $PSScriptRoot "ReviewRunProvenance.Mock$kind.psm1"
  $env:WORDPAIRS_PROVENANCE_MODULE=$module
  $config=New-PesterConfiguration
  $config.Run.Path=@($test);$config.Run.PassThru=$true;$config.Output.Verbosity='Normal'
  $config.TestResult.Enabled=$true;$config.TestResult.OutputFormat='JUnitXml';$config.TestResult.OutputPath=Join-Path $ReportDirectory "$kind.xml"
  $result=Invoke-Pester -Configuration $config
  if($kind -eq 'Correct' -and ($result.PassedCount -ne 9 -or $result.FailedCount -or $result.SkippedCount)){throw 'Correct fixture gate failed.'}
  if($kind -eq 'Wrong' -and ($result.FailedCount -ne 7 -or $result.PassedCount -ne 2 -or $result.SkippedCount)){throw 'Negative fixture did not reject every intended assertion.'}
  $runs.Add([pscustomobject]@{fixture=$kind;moduleSha256=(Get-FileHash $module).Hash;passed=$result.PassedCount;failed=$result.FailedCount;skipped=$result.SkippedCount;cases=@($result.Tests|ForEach-Object {@{name=$_.Name;result=$_.Result}})})
 }
}finally{Remove-Item Env:WORDPAIRS_PROVENANCE_MODULE -ErrorAction SilentlyContinue}
[pscustomobject]@{timestamp=(Get-Date -Format s);testSha256=(Get-FileHash $test).Hash;runs=@($runs)}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $ReportDirectory 'mock-gate.json')
