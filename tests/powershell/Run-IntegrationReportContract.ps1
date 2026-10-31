#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Mock','Source')][string]$Mode='Mock',[Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
$root=Split-Path (Split-Path $PSScriptRoot)
if(-not $PSCmdlet.ShouldProcess($ReportDirectory,'Verify independent report targets and child browser JUnit reporter')){return}
function Assert-ReportPlan([object]$Plan){
 if($Plan.postgres -eq $Plan.realtime -or $Plan.realtime -ne 'realtime.xml'){throw 'Realtime report must be distinct from PostgreSQL report'}
 if(-not $Plan.realtimeArguments.Contains('--reporter=junit')){throw 'Realtime command lost JUnit reporter'}
 if(-not $Plan.browserArguments.Contains('--reporter=line,junit')){throw 'Browser child lost JUnit reporter'}
}
$correct=[pscustomobject]@{postgres='postgres.xml';realtime='realtime.xml';realtimeArguments=@('--reporter=default','--reporter=junit');browserArguments=@('--reporter=line,junit')}
$results=[Collections.Generic.List[object]]::new()
if($Mode -eq 'Mock'){
 Assert-ReportPlan $correct
 $results.Add([pscustomobject]@{fixture='correct';accepted=$true})
 foreach($kind in @('same-output','missing-browser-junit')){
  $wrong=$correct | ConvertTo-Json | ConvertFrom-Json
  if($kind -eq 'same-output'){$wrong.realtime='postgres.xml'}else{$wrong.browserArguments=@('--reporter=line')}
  $rejected=$false
  try{Assert-ReportPlan $wrong}catch{$rejected=$true}
  if(-not $rejected){throw "Incorrect report plan escaped: $kind"}
  $results.Add([pscustomobject]@{fixture=$kind;rejected=$rejected})
 }
}else{
 $database=Get-Content -Raw (Join-Path $root 'tests/integration/run-phase1.ps1')
 $browser=Get-Content -Raw (Join-Path $root 'scripts/run-local-ui-integration.ps1')
 $actual=[pscustomobject]@{
  postgres='postgres.xml'
  realtime=if($database -match "Join-Path.+?'realtime\.xml'"){'realtime.xml'}else{'missing'}
  realtimeArguments=if($database -match '--reporter=junit' -and $database -match 'vitest\.realtime\.config\.ts @realtimeReportOptions'){@('--reporter=junit')}else{@()}
  browserArguments=if($browser.Contains("'--reporter=line,junit'")){@('--reporter=line,junit')}else{@()}
 }
 Assert-ReportPlan $actual
 $results.Add([pscustomobject]@{provider='source';accepted=$true;databaseSha256=(Get-FileHash (Join-Path $root 'tests/integration/run-phase1.ps1')).Hash;browserSha256=(Get-FileHash (Join-Path $root 'scripts/run-local-ui-integration.ps1')).Hash})
}
$null=New-Item -ItemType Directory -Path $ReportDirectory -Force
[pscustomobject]@{timestamp=(Get-Date -Format s);mode=$Mode;results=@($results);qualification='Command construction contract only; actual JUnit output requires executing each respective lane.'}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $ReportDirectory 'contract.json')
