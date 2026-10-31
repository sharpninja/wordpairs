#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory,[ValidateSet('Mock','Real')][string]$Mode='Mock',[string]$ParentRunId)
$ErrorActionPreference='Stop'
if(-not $PSCmdlet.ShouldProcess($ReportDirectory,'Run frozen-evidence assertions and preserve native case results')){return}
[void](New-Item -ItemType Directory -Path $ReportDirectory -Force)
$test=Join-Path $PSScriptRoot 'ReviewEvidencePreparation.Tests.ps1'
$runs=[Collections.Generic.List[object]]::new()
try{
  foreach($kind in $(if($Mode -eq 'Mock'){@('Correct','Wrong')}else{@('Real')})){
    $module=if($kind -eq 'Real'){$null}else{Join-Path $PSScriptRoot "ReviewEvidencePreparation.Mock$kind.psm1"}
    if($module){$env:WORDPAIRS_PREPARATION_FIXTURE=$module}else{Remove-Item Env:WORDPAIRS_PREPARATION_FIXTURE -ErrorAction SilentlyContinue}
    $config=New-PesterConfiguration
    $config.Run.Path=@($test);$config.Run.PassThru=$true;$config.Output.Verbosity='Normal'
    $config.TestResult.Enabled=$true;$config.TestResult.OutputFormat='JUnitXml';$config.TestResult.OutputPath=Join-Path $ReportDirectory "$kind.xml"
    $result=Invoke-Pester -Configuration $config
    if($kind -eq 'Wrong'){
      if($result.FailedCount -ne 20 -or $result.PassedCount -ne 2 -or $result.SkippedCount){throw 'Wrong fixture did not discriminate all twenty negative assertions.'}
    }elseif($result.PassedCount -ne 22 -or $result.FailedCount -or $result.SkippedCount){throw 'Correct/real preparation assertions failed.'}
    $runs.Add([pscustomobject]@{binding=$kind;module=$module;passed=$result.PassedCount;failed=$result.FailedCount;skipped=$result.SkippedCount;negativeControlExpected=($kind -eq 'Wrong');tests=@($result.Tests|ForEach-Object {@{name=$_.Name;result=$_.Result}})})
  }
}finally{Remove-Item Env:WORDPAIRS_PREPARATION_FIXTURE -ErrorAction SilentlyContinue}
$repo=Split-Path (Split-Path $PSScriptRoot)
[pscustomobject]@{timestamp=(Get-Date -Format s);runId=[guid]::NewGuid().ToString('D');parentRunId=$ParentRunId;hostName=[Environment]::MachineName;revision=(& git -C $repo rev-parse HEAD).Trim();producer=$PSCommandPath;producerSha256=(Get-FileHash $PSCommandPath).Hash;executable='pwsh';arguments=@('-NoProfile','-NonInteractive','-File',$PSCommandPath,'-ReportDirectory',$ReportDirectory,'-Mode',$Mode);mode=$Mode;testSha256=(Get-FileHash $test).Hash;runs=@($runs);qualification='Current workspace contract binding. Mock Wrong failures are expected rejection controls inside this successful gate; neither a mock gate nor a dirty-tree real binding establishes a frozen release pass.'}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $ReportDirectory 'gate.json')
