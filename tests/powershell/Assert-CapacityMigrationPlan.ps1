#Requires -Version 7.0
[CmdletBinding()]
param([Parameter(Mandatory)][object]$Plan)
$ErrorActionPreference='Stop'
$expected=@('001_foundation.sql','002_public_reads.sql','003_identity.sql','004_rooms.sql','005_outbox.sql','006_lobby_deadlines.sql','007_matches.sql','008_content.sql','009_reactions.sql','010_access_control.sql','011_content_review_states.sql','012_guest_public_profiles.sql','013_player_capacity.sql','014_capacity10.sql')
if($Plan.mode -notin @('fresh','upgrade')){throw 'Unknown capacity fixture mode'}
$actual=@($Plan.steps|Where-Object kind -EQ 'migration'|ForEach-Object name)
if(($actual -join '|') -cne ($expected -join '|')){throw 'Migration history must apply001 through014 exactly once in order'}
$seeds=@($Plan.steps|Where-Object kind -EQ 'seed')
if($Plan.mode -eq 'fresh'){
 if($seeds.Count -ne 0 -or $Plan.legacyCasesExpected -ne $false){throw 'Fresh mode must contain no historical seed or legacy-case claim'}
}else{
 if($seeds.Count -ne 1 -or $seeds[0].name -cne 'capacity-upgrade-seed.sql' -or $Plan.legacyCasesExpected -ne $true){throw 'Upgrade mode requires one historical seed and legacy assertions'}
 $steps=@($Plan.steps)
 $seedIndex=[Array]::FindIndex($steps,[Predicate[object]]{param($step)$step.kind -eq 'seed'})
 if($seedIndex -ne 12 -or $steps[$seedIndex+1].name -cne '013_player_capacity.sql'){throw 'Historical fixture must be installed after012 and before013'}
}
return $true
