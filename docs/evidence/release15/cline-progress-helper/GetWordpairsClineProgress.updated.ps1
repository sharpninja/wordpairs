#Requires -Version 7.0
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Directory)
$ErrorActionPreference='Stop'
function Get-ClineProgressObservation {
 [CmdletBinding()]
 param([Parameter(Mandatory)][object]$ReviewEvent,[Parameter(Mandatory)][int]$Line)
 # Preserve the existing direct-field interpretation, including numeric strings.
 if($null -ne $ReviewEvent.completionPercent -and $null -ne $ReviewEvent.etaMinutes){
  $percent=0.0;$eta=0.0
  if([double]::TryParse([string]$ReviewEvent.completionPercent,[ref]$percent) -and [double]::TryParse([string]$ReviewEvent.etaMinutes,[ref]$eta)){
   [pscustomobject]@{source='direct';line=$Line;completionPercent=$percent;etaMinutes=$eta}
  }
 }
 # Installed Cline3.0.71 CLI emits {type:agent_event,event:<AgentEvent>}.
 # Never traverse tool inputs/outputs, notices, reasoning, or arbitrary payloads.
 if($ReviewEvent.type -cne 'agent_event' -or $null -eq $ReviewEvent.event){return}
 $content=$ReviewEvent.event
 if($content.contentType -cne 'text' -or $content.type -cnotin @('content_start','content_end')){return}
 if($null -ne $content.toolName -or $null -ne $content.toolCallId){return}
 $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
 foreach($field in @('text','accumulated')){
  $text=$content.$field
  if($text -isnot [string] -or [string]::IsNullOrWhiteSpace($text)){continue}
  $candidates=[Collections.Generic.List[string]]::new()
  $candidates.Add($text.Trim())
  foreach($entry in ($text -split '\r?\n')){
   $trimmed=$entry.Trim()
   if($trimmed.StartsWith('{',[StringComparison]::Ordinal) -and $trimmed.EndsWith('}',[StringComparison]::Ordinal)){$candidates.Add($trimmed)}
  }
  foreach($fence in [regex]::Matches($text,'(?ms)^\s*```(?:json)?\s*\r?\n(?<body>.*?)^\s*```\s*$')){$candidates.Add($fence.Groups['body'].Value.Trim())}
  foreach($candidate in $candidates){
   if(-not$seen.Add($candidate)){continue}
   try{$value=ConvertFrom-Json -InputObject $candidate -AsHashtable -Depth 100 -ErrorAction Stop}catch{continue}
   if($value -isnot [Collections.IDictionary] -or -not$value.Contains('completionPercent') -or -not$value.Contains('etaMinutes')){continue}
   $p=$value.completionPercent;$e=$value.etaMinutes
   if($p -isnot [ValueType] -or $p -is [bool] -or $e -isnot [ValueType] -or $e -is [bool]){continue}
   $p=[double]$p;$e=[double]$e
   if(-not[double]::IsFinite($p) -or -not[double]::IsFinite($e) -or $p -lt 0 -or $p -gt 100 -or $e -lt 0){continue}
   [pscustomobject]@{source='assistant';line=$Line;eventType=[string]$content.type;contentField=$field;completionPercent=$p;etaMinutes=$e}
  }
 }
}
$inventory=Get-Content -LiteralPath (Join-Path $Directory 'expected-inventory.json') -Raw|ConvertFrom-Json
$launch=Get-Content -LiteralPath (Join-Path $Directory 'hv-service-start.json') -Raw|ConvertFrom-Json
$root='<repo>'
Get-Date -Format s
& systemctl --user show ($launch.unit+'.service') --property=ActiveState,SubState,Result
$runtime=@(Get-ChildItem -LiteralPath (Join-Path $root 'docs/receipts/hv') -Filter '*-release15-source-round7.runtime.json' -File|ForEach-Object {
 $record=Get-Content -LiteralPath $_.FullName -Raw|ConvertFrom-Json
 if($record.revision -ceq $inventory.revision -and [DateTime]::Parse($record.timestamp) -ge [DateTime]::Parse($launch.timestamp)){$record}
})
if($runtime.Count -ne 1){Write-Output ('Matching runtime receipts='+$runtime.Count);return}
$response=$runtime[0].response
$item=Get-Item -LiteralPath $response
$types=@{};$starts=@();$results=@();$progress=@();$assistantProgress=@();$unparsed=0;$lines=0
$reader=[IO.StreamReader]::new([IO.FileStream]::new($response,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite))
try{
 while($null -ne ($line=$reader.ReadLine())){
  $lines++
  try{$reviewEvent=$line|ConvertFrom-Json -Depth 100}catch{$unparsed++;continue}
  $type=[string]$reviewEvent.type
  if($type -notmatch '^[a-z_]{1,60}$'){$type='other'}
  if(-not $types.ContainsKey($type)){$types[$type]=0};$types[$type]++
  if($type -eq 'run_start'){$starts+=[pscustomobject]@{type=$type;providerId=$reviewEvent.providerId;modelId=$reviewEvent.modelId;thinking=$reviewEvent.thinking;sessionId=$reviewEvent.sessionId}}
  if($type -eq 'run_result'){$results+=[pscustomobject]@{type=$type;model=$reviewEvent.model;finishReason=$reviewEvent.finishReason;iterations=$reviewEvent.iterations}}
  foreach($observation in @(Get-ClineProgressObservation -ReviewEvent $reviewEvent -Line $lines)){
   if($observation.source -ceq 'direct'){$progress+=[pscustomobject]@{line=$observation.line;completionPercent=$observation.completionPercent;etaMinutes=$observation.etaMinutes}}
   else{$assistantProgress+=[pscustomobject]@{line=$observation.line;eventType=$observation.eventType;contentField=$observation.contentField;completionPercent=$observation.completionPercent;etaMinutes=$observation.etaMinutes}}
  }
 }
}finally{$reader.Dispose()}
[pscustomobject]@{response=$response;bytes=$item.Length;lastWriteTime=$item.LastWriteTime.ToString('s');lines=$lines;unparsedLines=$unparsed;eventTypes=$types;runtimeStarts=$starts;runtimeResults=$results;directProgress=$progress;nestedAssistantProgress=$assistantProgress;qualification='Read-only numeric metadata from direct fields or structured JSON entries in native assistant text/accumulated content only. Tool/reasoning text and arbitrary model text are not rendered. Cumulative stream events can repeat observations; these are not unique progress-entry counts. Empty extraction does not prove absence of reviewer progress. Full original response remains unchanged.'}|ConvertTo-Json -Depth 8
$processPath=$response.Replace('.response.jsonl','.process-result.json')
if(Test-Path -LiteralPath $processPath){Get-Content -LiteralPath $processPath -Raw}
