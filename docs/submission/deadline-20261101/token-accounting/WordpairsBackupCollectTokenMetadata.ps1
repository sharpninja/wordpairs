#Requires -Version 7.5
[CmdletBinding(SupportsShouldProcess)]param()
$ErrorActionPreference='Stop';Set-StrictMode -Version 3
if(-not$PSCmdlet.ShouldProcess('Scoped stopped-release token metadata','Stream only sanitized usage/model/time metadata for exactroot and9native descendants,retain no transcript text')){return}
$state=Get-Content /tmp/wordpairs-backup-token-accounting.json -Raw|ConvertFrom-Json -AsHashtable -DateKind String
$scope=Get-Content (Join-Path $state.directory scope.json) -Raw|ConvertFrom-Json -AsHashtable -Depth 30 -DateKind String
$eventsPath=Join-Path $state.directory usage-events.jsonl;$filesPath=Join-Path $state.directory rollout-metadata.json
if(Test-Path $eventsPath){throw 'Retain prior accounting extraction'}
$stream=[IO.FileStream]::new($eventsPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);[IO.File]::SetUnixFileMode($eventsPath,[IO.UnixFileMode]384);$writer=[IO.StreamWriter]::new($stream,[Text.UTF8Encoding]::new($false))
$files=@();$stop=[DateTimeOffset]::Parse($state.stopUtc);$eventCount=0
function Get-StringProperty([Text.Json.JsonElement]$Object,[string]$Name){$v=[Text.Json.JsonElement]::new();if($Object.TryGetProperty($Name,[ref]$v)-and$v.ValueKind-eq[Text.Json.JsonValueKind]::String){return $v.GetString()};return $null}
try{foreach($thread in $scope.threads){
 $path=[string]$thread.rollout_path;$file=Get-Item -LiteralPath $path;$initialBytes=$file.Length;$reader=[IO.StreamReader]::new([IO.FileStream]::new($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite))
 $lineNumber=0;$invalid=0;$tokenCount=0;$nullInfo=0;$afterStop=0;$beforeCreate=0;$contexts=0;$models=@{};$first=$null;$last=$null;$sessionMeta=@()
 $currentModel='UNKNOWN';$currentProvider=[string]$thread.model_provider;$currentEffort='UNKNOWN';$created=[DateTimeOffset]::FromUnixTimeMilliseconds([long]$thread.created_at_ms)
 try{while($null-ne($line=$reader.ReadLine())){
  $lineNumber++;try{$doc=[Text.Json.JsonDocument]::Parse($line)}catch{$invalid++;continue}
  try{
   $r=$doc.RootElement;$type=Get-StringProperty $r 'type';$p=[Text.Json.JsonElement]::new();if(-not$r.TryGetProperty('payload',[ref]$p)-or$p.ValueKind-ne[Text.Json.JsonValueKind]::Object){continue}
   if($type-ceq'session_meta'){
    $entry=@{line=$lineNumber;id=(Get-StringProperty $p id);parent_thread_id=(Get-StringProperty $p parent_thread_id);forked_from_id=(Get-StringProperty $p forked_from_id)}
    $ordinal=[Text.Json.JsonElement]::new();if($p.TryGetProperty('subagent_history_start_ordinal',[ref]$ordinal)-and$ordinal.ValueKind-eq[Text.Json.JsonValueKind]::Number){$entry.subagent_history_start_ordinal=$ordinal.GetInt64()}
    $sessionMeta+=$entry;continue
   }
   if($type-ceq'turn_context'){
    $value=Get-StringProperty $p model;if($value){$currentModel=$value};$value=Get-StringProperty $p model_provider;if($value){$currentProvider=$value};$value=Get-StringProperty $p effort;if(-not$value){$value=Get-StringProperty $p reasoning_effort};if($value){$currentEffort=$value};$contexts++;$models[$currentModel]=$true;continue
   }
   if($type-cne'event_msg'-or(Get-StringProperty $p type)-cne'token_count'){continue}
   $timestamp=[DateTimeOffset]::Parse((Get-StringProperty $r timestamp));if($timestamp-gt$stop){$afterStop++;continue}
   if($timestamp-lt$created){$beforeCreate++;continue}
   $info=[Text.Json.JsonElement]::new();if(-not$p.TryGetProperty('info',[ref]$info)-or$info.ValueKind-ne[Text.Json.JsonValueKind]::Object){$nullInfo++;continue}
   $row=[ordered]@{threadId=$thread.id;line=$lineNumber;timestamp=$timestamp.ToString('o');model=$currentModel;provider=$currentProvider;effort=$currentEffort;total=$null;last=$null}
   foreach($spec in @(@{source='total_token_usage';target='total'},@{source='last_token_usage';target='last'})){
    $u=[Text.Json.JsonElement]::new();if($info.TryGetProperty($spec.source,[ref]$u)-and$u.ValueKind-eq[Text.Json.JsonValueKind]::Object){$counts=@{};foreach($prop in $u.EnumerateObject()){if($prop.Value.ValueKind-eq[Text.Json.JsonValueKind]::Number){$counts[$prop.Name]=$prop.Value.GetInt64()}};$row[$spec.target]=$counts}
   }
   $writer.WriteLine(($row|ConvertTo-Json -Depth 8 -Compress));$tokenCount++;$eventCount++;if($null-eq$first){$first=$row.timestamp};$last=$row.timestamp
  }finally{$doc.Dispose()}
 }}finally{$reader.Dispose()}
 $files+=@{threadId=$thread.id;rolloutPath=$path;bytesAtStart=$initialBytes;bytesAtEnd=(Get-Item $path).Length;linesRead=$lineNumber;parseFailures=$invalid;ownedTokenEventsThroughStop=$tokenCount;nullInfoEvents=$nullInfo;eventsExcludedBeforeThreadCreation=$beforeCreate;eventsExcludedAfterStop=$afterStop;contexts=$contexts;models=@($models.Keys);firstUsage=$first;lastUsage=$last;sessionMetadata=$sessionMeta;databaseTokensUsed=$thread.tokens_used;databaseModel=$thread.model;databaseProvider=$thread.model_provider;databaseEffort=$thread.reasoning_effort;createdAt=$created.ToString('o')}
}}finally{$writer.Dispose()}
$result=@{atLocal=(Get-Date -Format s);threadCount=$scope.threadCount;sanitizedUsageEvents=$eventCount;eventsPath=$eventsPath;eventsSha256=(Get-FileHash $eventsPath).Hash;files=$files;method='Only sessionmetadata IDs/numericforkordinal,turn_context model/provider/effort,and token_count numericusage fields selected. All other payloads ignored. Inherited events older than ownthreadcreation excluded; finalcounter/dedup/reset analysis separate.'}
[IO.File]::WriteAllText($filesPath,($result|ConvertTo-Json -Depth 30));[IO.File]::SetUnixFileMode($filesPath,[IO.UnixFileMode]384)
@{atLocal=$result.atLocal;threadCount=$scope.threadCount;sanitizedUsageEvents=$eventCount;eventsSha256=$result.eventsSha256;metadataPath=$filesPath;metadataSha256=(Get-FileHash $filesPath).Hash;files=$files}|ConvertTo-Json -Depth 30
