#Requires -Version 7.0
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Directory)
$ErrorActionPreference='Stop'
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
$types=@{};$starts=@();$results=@();$progress=@();$unparsed=0;$lines=0
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
  if($null -ne $reviewEvent.completionPercent -and $null -ne $reviewEvent.etaMinutes){
   $percent=0.0;$eta=0.0
   if([double]::TryParse([string]$reviewEvent.completionPercent,[ref]$percent) -and [double]::TryParse([string]$reviewEvent.etaMinutes,[ref]$eta)){$progress+=[pscustomobject]@{line=$lines;completionPercent=$percent;etaMinutes=$eta}}
  }
 }
}finally{$reader.Dispose()}
[pscustomobject]@{response=$response;bytes=$item.Length;lastWriteTime=$item.LastWriteTime.ToString('s');lines=$lines;unparsedLines=$unparsed;eventTypes=$types;runtimeStarts=$starts;runtimeResults=$results;directProgress=$progress;qualification='Read-only allowlisted metadata. No tool context or arbitrary model text is rendered; full original response remains unchanged.'}|ConvertTo-Json -Depth 8
$processPath=$response.Replace('.response.jsonl','.process-result.json')
if(Test-Path -LiteralPath $processPath){Get-Content -LiteralPath $processPath -Raw}
