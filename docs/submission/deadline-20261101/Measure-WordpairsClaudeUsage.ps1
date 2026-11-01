#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([string]$OutputDirectory=(Join-Path $PSScriptRoot 'token-accounting'))
$ErrorActionPreference='Stop'
$project='<home>/.claude/projects/-home-sharpninja-github-WordGame--mcpServer-wordpairs'
$stopAt=[DateTimeOffset]::Parse('2026-11-01T11:31:25.649Z')
$startAt=[DateTimeOffset]::Parse('2026-10-26T00:00:00Z')
$messages=@{}; $events=0; $duplicates=0; $changedUsage=0; $malformed=0; $files=[System.Collections.Generic.List[object]]::new()
foreach($file in (Get-ChildItem -LiteralPath $project -Filter '*.jsonl' -File -Recurse | Sort-Object FullName)){
 $lineNumber=0
 foreach($line in [System.IO.File]::ReadLines($file.FullName)){
  $lineNumber++
  try{$item=$line|ConvertFrom-Json -AsHashtable}catch{$malformed++;continue}
  if($item.type -ne 'assistant' -or -not $item.message.usage){continue}
  $at=[DateTimeOffset]::Parse([string]$item.timestamp)
  if($at -lt $startAt -or $at -ge $stopAt){continue}
  $events++; $id=[string]$item.message.id
  if(-not $id){throw "Missing assistant message ID in $($file.Name):$lineNumber"}
  $key=([string]$item.requestId)+'|'+$id
  $usage=$item.message.usage
  $usageJson=$usage|ConvertTo-Json -Depth 20 -Compress
  if($messages.ContainsKey($key)){
   $duplicates++
   if($messages[$key].usageJson -cne $usageJson){$changedUsage++}
   if($at -lt $messages[$key].at){continue}
  }
  $messages[$key]=@{at=$at;usage=$usage;usageJson=$usageJson;model=[string]$item.message.model;path=$file.FullName;line=$lineNumber;messageId=$id;requestId=[string]$item.requestId}
 }
 $files.Add([ordered]@{path=$file.FullName;bytes=$file.Length;sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash})
}
$rows=@(foreach($entry in $messages.Values){
 $u=$entry.usage
 [pscustomobject][ordered]@{
  timestamp=$entry.at.ToString('o');model=$entry.model;messageId=$entry.messageId;requestId=$entry.requestId
  ordinaryInput=[long]$u.input_tokens;cacheWriteInput=[long]$u.cache_creation_input_tokens
  cacheWrite5m=[long]$u.cache_creation.ephemeral_5m_input_tokens;cacheWrite1h=[long]$u.cache_creation.ephemeral_1h_input_tokens
  cachedInput=[long]$u.cache_read_input_tokens;output=[long]$u.output_tokens;thinkingOutputSubset=[long]$u.output_tokens_details.thinking_tokens
  serviceTier=$u.service_tier;speed=$u.speed;inferenceGeo=$u.inference_geo
  source=$entry.path;sourceLine=$entry.line
 }
})
$rows=@($rows|Sort-Object timestamp,messageId)
$groups=@(foreach($group in ($rows|Group-Object model,serviceTier,speed,inferenceGeo)){
 $totals=[ordered]@{model=$group.Group[0].model;serviceTier=$group.Group[0].serviceTier;speed=$group.Group[0].speed;inferenceGeo=$group.Group[0].inferenceGeo;messages=$group.Count}
 foreach($property in @('ordinaryInput','cacheWriteInput','cacheWrite5m','cacheWrite1h','cachedInput','output','thinkingOutputSubset')){$totals[$property]=[long](($group.Group|Measure-Object -Property $property -Sum).Sum)}
 $totals.totalInput=$totals.ordinaryInput+$totals.cacheWriteInput+$totals.cachedInput
 $totals.totalTokens=$totals.totalInput+$totals.output
 if($totals.cacheWriteInput -ne ($totals.cacheWrite5m+$totals.cacheWrite1h)){throw 'Cache-write lifetime breakdown does not reconcile'}
 # Explicit standard global API-equivalent, not subscription or invoiced cost.
 if($totals.model -eq 'claude-opus-5-5' -and $totals.speed -eq 'standard' -and $totals.inferenceGeo -eq 'global'){
  $totals.apiEquivalentOrdinaryInputUsd=$totals.ordinaryInput*4.0/1e6
  $totals.apiEquivalentCache5mUsd=$totals.cacheWrite5m*5.0/1e6
  $totals.apiEquivalentCache1hUsd=$totals.cacheWrite1h*8.0/1e6
  $totals.apiEquivalentCacheReadUsd=$totals.cachedInput*0.2/1e6
  $totals.apiEquivalentOutputUsd=$totals.output*20.0/1e6
  $totals.apiEquivalentUsd=$totals.apiEquivalentOrdinaryInputUsd+$totals.apiEquivalentCache5mUsd+$totals.apiEquivalentCache1hUsd+$totals.apiEquivalentCacheReadUsd+$totals.apiEquivalentOutputUsd
 }
 [pscustomobject]$totals
})
$result=[ordered]@{
 generatedAt=[DateTimeOffset]::Now.ToString('o');periodStart=$startAt.ToString('o');stopCutoff=$stopAt.ToString('o')
 scope='Seven retained Claude Code project sessions for canonical Wordpairs workspace, bounded to release period. Attribution is project-local rather than Codex thread-spawn lineage.'
 method='Keep latest usage snapshot for each requestId plus assistant message.id across all files. Repeated content-block records do not count as new model requests. Add ordinary, cache-write and cache-read inputs; thinking output is a subset of output. Do not sum usage.iterations again.'
 usageEvents=$events;uniqueMessages=$messages.Count;duplicateSnapshots=$duplicates;changedDuplicateUsage=$changedUsage;malformedLines=$malformed
 groups=$groups;files=@($files)
 pricingSources=@('https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5','https://platform.claude.com/docs/en/build-with-claude/prompt-caching')
 qualification='API-equivalent only at current standard global list rates; actual subscription charges and other missing reviewer/provider sessions unknown. All retained usage predates assumed Central deadline.'
}
if($PSCmdlet.ShouldProcess($OutputDirectory,'Write sanitized Claude usage totals and per-message metadata, without transcript content')){
 $null=New-Item -ItemType Directory -Path $OutputDirectory -Force
 $result|ConvertTo-Json -Depth 16|Set-Content -LiteralPath (Join-Path $OutputDirectory 'claude-usage-summary.json') -Encoding utf8NoBOM
 $rows|Export-Csv -LiteralPath (Join-Path $OutputDirectory 'claude-usage-messages.csv') -NoTypeInformation -Encoding utf8NoBOM
 [pscustomobject]$result|Select-Object generatedAt,usageEvents,uniqueMessages,duplicateSnapshots,changedDuplicateUsage,malformedLines,groups|ConvertTo-Json -Depth 10
}
