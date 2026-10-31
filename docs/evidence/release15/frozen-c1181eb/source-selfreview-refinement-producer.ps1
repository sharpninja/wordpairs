#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$folder='<repo>/docs/evidence/release15/frozen-c1181eb'
function Get-Pin {param([string]$Path) [ordered]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash;bytes=(Get-Item -LiteralPath $Path).Length}}
$json=Join-Path $folder 'source-what-if-supplement.json'
$md=Join-Path $folder 'source-selfreview.md'
$provenance=Join-Path $folder 'source-selfreview-provenance.json'
$r=Get-Content -LiteralPath $json -Raw | ConvertFrom-Json -AsHashtable
$p=Get-Content -LiteralPath $provenance -Raw | ConvertFrom-Json -AsHashtable
$history=Join-Path $folder 'source-selfreview-history/initial-20261030T193749'
if(Test-Path -LiteralPath $history){throw 'Refusing to overwrite retained initial review'}
$names=@('source-selfreview.md','source-what-if-supplement.json','source-selfreview-producer.ps1','source-selfreview-provenance.json','source-selfreview-effective-requirements.json')
$originals=@($names | ForEach-Object {Get-Pin (Join-Path $folder $_)})
$unknownFormats=@($r.currentNativeProgress.files | Where-Object {$_.Contains('caseCount') -and $_.caseCount -eq 0})
if($unknownFormats.Count -ne 3){throw 'Unexpected control fixture qualification scope'}
$now=(Get-Date).ToString('o')
if(-not $PSCmdlet.ShouldProcess($folder,'Preserve initial review bytes, clarify non-JUnit control fixtures and improve human report spacing')){return}
[void](New-Item -ItemType Directory -Path $history)
$historyPins=@()
foreach($pin in $originals){
 $copy=Join-Path $history ([IO.Path]::GetFileName($pin.path))
 Copy-Item -LiteralPath $pin.path -Destination $copy
 if((Get-FileHash -LiteralPath $copy).Hash -cne $pin.sha256){throw 'Initial review copy mismatch'}
 $historyPins += [ordered]@{originalPath=$pin.path;path=$copy;sha256=$pin.sha256;bytes=$pin.bytes}
}
foreach($observation in $unknownFormats){
 $observation.caseCount=$null;$observation.failed=$null;$observation.skipped=$null
 $observation.format='raw_non_JUnit_control_fixture_not_interpreted'
 $observation.qualification='This raw control fixture has no JUnit testcase nodes. No execution pass/failure/skip count is inferred. Expected-negative control acceptance belongs to the owning planner contract report, not this raw fixture.'
}
$r.nativeFormattingQualification=[ordered]@{recordedAt=$now;initialReviewCopies=$historyPins;retainedDirectory=$history;change='The initial generic JUnit scan returned zero nodes for three raw planner control XML fixtures. Those fields are now null and explicitly unparsed, not zero-success. Native files and all source/semantic conclusions remain unchanged.'}
$r | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $json -Encoding utf8NoBOM
$text=Get-Content -LiteralPath $md -Raw
$replacements=[ordered]@{
 'The353'='The 353';'af6ee6f351pins'='af6ee6f''s 351 pins';'345 are'='345 are';'Matrix still has12'='Matrix still has 12';'each162passed,0failed,0skipped,81expected-negative controls'='each 162 passed, 0 failed, 0 skipped and 81 expected-negative controls';'These are19new positive plus19new negative cases alongside124prior cases'='These are 19 new positive plus 19 new negative cases alongside 124 prior cases';'not162browser journeys'='not 162 browser journeys';'Original124 assertion'='Original 124 assertion';'TypeScript exits2'='TypeScript exits 2';'TypeScript0, scoped Biome0 (15warnings) and diff0'='TypeScript 0, scoped Biome 0 (15 warnings) and diff 0';'remains2passed/1failed/11skipped'='remains 2 passed / 1 failed / 11 skipped';'players,round3,11acknowledged'='players, round 3, 11 acknowledged';'layer1 read:45scoped records/207criteria'='layer 1 read: 45 scoped records / 207 criteria';'historical360-axis'='historical 360-axis';'outside45/207'='outside 45/207';'cover168records/31FRmappingrecords/1427flatlinks'='cover 168 records / 31 FR mapping records / 1427 flat links';'all21scoped TESTs'='all 21 scoped TESTs';'games119participations952solves'='games, 119 participations and 952 solves';'Cline/Beam/High98/98'='Cline/Beam/High 98/98';'Monday afternoon2November2026'='Monday afternoon, 2 November 2026';'Collection846unit/63Postgres/86browser/4Realtime/14matrix/1strict'='Collection: 846 unit / 63 PostgreSQL / 86 browser / 4 Realtime / 14 matrix / 1 strict';'Accuracy99%, completeness97%'='Accuracy 99%, completeness 97%';'Current-source full five-lane chain, actual DOM retirement/polling and all14 games'='Current-source full five-lane chain, actual DOM retirement/polling and all 14 games'
}
foreach($entry in $replacements.GetEnumerator()){$text=$text.Replace($entry.Key,$entry.Value)}
$text += "`n"+$now+' - Native observation qualification: three raw planner control XML fixtures have no JUnit testcase nodes; their counts are unparsed/null, not inferred passes. Initial report bytes and producer are copied and hash-verified under source-selfreview-history/initial-20261030T193749. Source, native files and review conclusions are unchanged.'+"`n"
$text | Set-Content -LiteralPath $md -Encoding utf8NoBOM
$copy=Join-Path $folder 'source-selfreview-refinement-producer.ps1'
Copy-Item -LiteralPath $PSCommandPath -Destination $copy
if((Get-FileHash -LiteralPath $copy).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Refinement producer copy mismatch'}
$p.refinedAt=$now;$p.initialReviewHistory=$history;$p.refinementProducer=Get-Pin $copy
$p.outputs=@(Get-Pin $json;Get-Pin $md;Get-Pin (Join-Path $folder 'source-selfreview-effective-requirements.json'))
$p.refinementQualification='Only zero-node non-JUnit fixture qualification and human-readable spacing changed. Original five artifacts retained by exact copied bytes. No native/source/requirement changes or executions.'
$p | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $provenance -Encoding utf8NoBOM
[ordered]@{recordedAt=$now;correctedUninterpretedFixtures=3;initialHistory=$history;outputs=@(Get-Pin $json;Get-Pin $md;Get-Pin $provenance;Get-Pin $copy)} | ConvertTo-Json -Depth 6
