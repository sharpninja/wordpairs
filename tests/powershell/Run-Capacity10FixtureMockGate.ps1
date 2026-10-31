#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
if(-not $PSCmdlet.ShouldProcess($ReportDirectory,'Prove fresh/upgrade migration-order assertion with independent correct and wrong plans')){return}
$names=@('001_foundation.sql','002_public_reads.sql','003_identity.sql','004_rooms.sql','005_outbox.sql','006_lobby_deadlines.sql','007_matches.sql','008_content.sql','009_reactions.sql','010_access_control.sql','011_content_review_states.sql','012_guest_public_profiles.sql','013_player_capacity.sql','014_capacity10.sql')
$assert=Join-Path $PSScriptRoot 'Assert-CapacityMigrationPlan.ps1'
$results=[Collections.Generic.List[object]]::new()
foreach($mode in @('fresh','upgrade')){
 foreach($fault in @('correct','missing014','wrong-order','wrong-seed','wrong-legacy-claim')){
  $steps=[Collections.Generic.List[object]]::new()
  foreach($name in $names){if($mode -eq 'upgrade' -and $name -eq '013_player_capacity.sql'){$steps.Add([pscustomobject]@{kind='seed';name='capacity-upgrade-seed.sql'})};$steps.Add([pscustomobject]@{kind='migration';name=$name})}
  $plan=[pscustomobject]@{mode=$mode;legacyCasesExpected=($mode -eq 'upgrade');steps=@($steps)}
  if($fault -eq 'missing014'){$plan.steps=@($plan.steps|Where-Object name -NE '014_capacity10.sql')}
  if($fault -eq 'wrong-order'){$temp=$plan.steps[0];$plan.steps[0]=$plan.steps[1];$plan.steps[1]=$temp}
  if($fault -eq 'wrong-seed'){
   if($mode -eq 'fresh'){$plan.steps+=@([pscustomobject]@{kind='seed';name='capacity-upgrade-seed.sql'})}
   else{$plan.steps=@($plan.steps|Where-Object kind -NE 'seed')+@([pscustomobject]@{kind='seed';name='capacity-upgrade-seed.sql'})}
  }
  if($fault -eq 'wrong-legacy-claim'){$plan.legacyCasesExpected=-not $plan.legacyCasesExpected}
  $accepted=$false;try{$accepted=(& $assert -Plan $plan) -eq $true}catch{$accepted=$false}
  if($accepted -ne ($fault -eq 'correct')){throw "Fixture-plan oracle failed: $mode/$fault"}
  $results.Add([pscustomobject]@{mode=$mode;fixture=$fault;accepted=$accepted;expected=($fault -eq 'correct');passed=$true})
 }
}
[void][IO.Directory]::CreateDirectory([IO.Path]::GetFullPath($ReportDirectory))
$receipt=[pscustomobject]@{timestamp=[TimeZoneInfo]::ConvertTime([DateTimeOffset]::UtcNow,[TimeZoneInfo]::FindSystemTimeZoneById('America/Chicago')).ToString('s');tests=10;passed=10;failed=0;skipped=0;positive=2;negative=8;results=@($results);assertionSha256=(Get-FileHash -LiteralPath $assert).Hash;qualification='Independent fixture-planning mocks only. No database or migration execution.'}
$receipt|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $ReportDirectory 'fixture-mock-gate.json')
$receipt|ConvertTo-Json -Depth 10
