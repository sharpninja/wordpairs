#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$folder=Join-Path $PSScriptRoot 'token-accounting'
$codex=Get-Content -LiteralPath (Join-Path $folder 'accounting.json') -Raw|ConvertFrom-Json
$claude=Get-Content -LiteralPath (Join-Path $folder 'claude-usage-summary.json') -Raw|ConvertFrom-Json
$rateMap=@{
 'gpt-6.1-sol'=@{input=2.0;cached=0.1;output=10.0;creditsInput=50.0;creditsCached=2.5;creditsOutput=250.0}
 'gpt-6.1-terra'=@{input=1.0;cached=0.05;output=5.0;creditsInput=25.0;creditsCached=1.25;creditsOutput=125.0}
 'gpt-6-sol'=@{input=2.0;cached=0.2;output=10.0;creditsInput=50.0;creditsCached=5.0;creditsOutput=250.0}
 'gpt-6-astra'=@{input=10.0;cached=1.0;output=50.0;creditsInput=250.0;creditsCached=25.0;creditsOutput=1250.0}
}
$rows=@(foreach($group in ($codex.byModelPeriod|Group-Object model)){
 $inputCount=[long](($group.Group.counts|Measure-Object uncached_input_tokens -Sum).Sum)
 $cacheCount=[long](($group.Group.counts|Measure-Object cached_input_tokens -Sum).Sum)
 $outputCount=[long](($group.Group.counts|Measure-Object output_tokens -Sum).Sum)
 $rate=$rateMap[$group.Name];if(-not $rate){throw "Missing official rate for $($group.Name)"}
 [pscustomobject][ordered]@{model=$group.Name;uncachedInput=$inputCount;cachedInput=$cacheCount;output=$outputCount;ratesPerMillion=$rate
  apiEquivalentInputUsd=$inputCount*$rate.input/1e6;apiEquivalentCachedUsd=$cacheCount*$rate.cached/1e6;apiEquivalentOutputUsd=$outputCount*$rate.output/1e6
  standardCreditEquivalent=($inputCount*$rate.creditsInput+$cacheCount*$rate.creditsCached+$outputCount*$rate.creditsOutput)/1e6
 }
})
$apiInput=($rows|Measure-Object apiEquivalentInputUsd -Sum).Sum
$apiCache=($rows|Measure-Object apiEquivalentCachedUsd -Sum).Sum
$apiOutput=($rows|Measure-Object apiEquivalentOutputUsd -Sum).Sum
$claudeTotal=($claude.groups|Measure-Object apiEquivalentUsd -Sum).Sum
$combined=[ordered]@{ordinaryInput=[long]$codex.overall.uncached_input_tokens+[long](($claude.groups|Measure-Object ordinaryInput -Sum).Sum)
 cachedInput=[long]$codex.overall.cached_input_tokens+[long](($claude.groups|Measure-Object cachedInput -Sum).Sum)
 reportedCacheWriteInput=[long](($claude.groups|Measure-Object cacheWriteInput -Sum).Sum)
 output=[long]$codex.overall.output_tokens+[long](($claude.groups|Measure-Object output -Sum).Sum)
 reasoningOrThinkingSubset=[long]$codex.overall.reasoning_output_tokens+[long](($claude.groups|Measure-Object thinkingOutputSubset -Sum).Sum)
 totalTokens=[long]$codex.overall.total_tokens+[long](($claude.groups|Measure-Object totalTokens -Sum).Sum)}
if($combined.totalTokens -ne ($combined.ordinaryInput+$combined.cachedInput+$combined.reportedCacheWriteInput+$combined.output)){throw 'Combined token categories do not reconcile'}
$result=[ordered]@{generatedAt=[DateTimeOffset]::Now.ToString('o');classification='LIST_RATE_COMPARISON_NOT_ACTUAL_BILL'
 sourceCodexSha256=(Get-FileHash -LiteralPath (Join-Path $folder 'accounting.json')).Hash
 sourceClaudeSha256=(Get-FileHash -LiteralPath (Join-Path $folder 'claude-usage-summary.json')).Hash
 codexRows=$rows;codexStandardShortContextApiEquivalentUsd=[ordered]@{uncachedInput=$apiInput;cachedInput=$apiCache;output=$apiOutput;total=$apiInput+$apiCache+$apiOutput}
 codexStandardCreditEquivalent=($rows|Measure-Object standardCreditEquivalent -Sum).Sum
 claudeStandardGlobalApiEquivalentUsd=$claudeTotal;combinedApiEquivalentUsd=$apiInput+$apiCache+$apiOutput+$claudeTotal;combinedReportedTokens=$combined
 officialSources=@('https://developers.openai.com/api/docs/pricing','https://developers.openai.com/api/docs/models/gpt-6-sol','https://learn.chatgpt.com/docs/pricing','https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5')
 qualifications=@('Current published rates read on 2026-11-01. Historical invoiced rates, auth billing plan, paid subscription share, speed/context premiums, API cache writes and tool/image charges are not established. This is a Standard short-context list-rate comparison, not an estimated invoice.'
 'Codex credit billing has no separate cache-write charge. Inspected native Codex cache-write counters explicitly report zero, without establishing billing completeness. Claude cache writes are separately reported and reconcile to 1-hour lifetime.'
 'Cline Beam, Cursor, image-generation and other provider usage not exposed by these retained native counters is unknown and excluded, not zero. Reasoning/thinking output is already within output tokens.'
 'Project release accounting stops at original user stop timestamp 2026-11-01T11:31:25.649Z. Work preparing this handoff/report and clearing the timer is excluded.')}
if($PSCmdlet.ShouldProcess($folder,'Save reproducible token category and list-rate comparison without billing or execution claims')){
 $result|ConvertTo-Json -Depth 16|Set-Content -LiteralPath (Join-Path $folder 'price-comparison.json') -Encoding utf8NoBOM
 [pscustomobject]$result|Select-Object codexStandardShortContextApiEquivalentUsd,codexStandardCreditEquivalent,claudeStandardGlobalApiEquivalentUsd,combinedApiEquivalentUsd,combinedReportedTokens|ConvertTo-Json -Depth 10
}
