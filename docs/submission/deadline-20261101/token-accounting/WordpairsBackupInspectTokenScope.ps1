#Requires -Version 7.5
[CmdletBinding(SupportsShouldProcess)]param()
$ErrorActionPreference='Stop';Set-StrictMode -Version 3
if(-not$PSCmdlet.ShouldProcess('Private stopped-release accounting scope','Read only named root and recursive spawn descendants,retain sanitized usage schema metadata')){return}
$state=Get-Content /tmp/wordpairs-backup-token-accounting.json -Raw|ConvertFrom-Json -AsHashtable -DateKind String
$root=$state.rootThreadId;$database='<home>/.codex/state_5.sqlite'
if($root-notmatch'^[a-f0-9-]{36}$'){throw 'Unexpected rootID shape'}
$sql="WITH RECURSIVE lineage(id) AS (VALUES('$root') UNION SELECT e.child_thread_id FROM thread_spawn_edges e JOIN lineage l ON e.parent_thread_id=l.id) SELECT id,rollout_path,created_at_ms,updated_at_ms,tokens_used,model_provider,model,reasoning_effort,agent_path FROM threads WHERE id IN (SELECT id FROM lineage) ORDER BY created_at_ms,id;"
$raw=& sqlite3 -readonly -json $database $sql;if($LASTEXITCODE){throw 'Scoped native metadata query failed'}
$threads=@(($raw-join"`n")|ConvertFrom-Json -AsHashtable -DateKind String)
$edgeSql="WITH RECURSIVE lineage(id) AS (VALUES('$root') UNION SELECT e.child_thread_id FROM thread_spawn_edges e JOIN lineage l ON e.parent_thread_id=l.id) SELECT parent_thread_id,child_thread_id,status FROM thread_spawn_edges WHERE parent_thread_id IN (SELECT id FROM lineage) ORDER BY parent_thread_id,child_thread_id;"
$edgeRaw=& sqlite3 -readonly -json $database $edgeSql;if($LASTEXITCODE){throw 'Scoped edge metadata query failed'}
$edges=@(($edgeRaw-join"`n")|ConvertFrom-Json -AsHashtable -DateKind String)
$scopePath=Join-Path $state.directory scope.json;if(Test-Path $scopePath){throw 'Preserve previous scope'}
$scope=@{atLocal=(Get-Date -Format s);root=$root;threadCount=$threads.Count;edgeCount=$edges.Count;threads=$threads;edges=$edges;queryScope='Exactroot+recursive thread_spawn_edges descendants,UNION deduplicated;no unrelated thread records or transcript text selected'}
[IO.File]::WriteAllText($scopePath,($scope|ConvertTo-Json -Depth 20));[IO.File]::SetUnixFileMode($scopePath,[IO.UnixFileMode]384)
$samples=@();$types=@{};$meta=@();$missing=@()
foreach($thread in $threads){
 $path=[string]$thread.rollout_path
 if(-not(Test-Path -LiteralPath $path -PathType Leaf)){$missing+=$thread.id;continue}
 $reader=[IO.StreamReader]::new($path)
 $found=0;$lineNumber=0
 try{while($null-ne($line=$reader.ReadLine())){
  $lineNumber++
  try{$doc=[Text.Json.JsonDocument]::Parse($line)}catch{continue}
  try{$r=$doc.RootElement;$t=$r.GetProperty('type').GetString();if(-not$types.ContainsKey($t)){$types[$t]=0};$types[$t]++
   if($t-ceq'session_meta'){$p=$r.GetProperty('payload');$item=@{threadId=$thread.id;line=$lineNumber;keys=@($p.EnumerateObject()|ForEach-Object Name)};foreach($key in @('id','forked_from_id','parent_thread_id','model_provider')){$v=[Text.Json.JsonElement]::new();if($p.TryGetProperty($key,[ref]$v)-and$v.ValueKind-eq[Text.Json.JsonValueKind]::String){$item[$key]=$v.GetString()}};$meta+=$item}
   if($t-ceq'event_msg'){$p=$r.GetProperty('payload');$pt=[Text.Json.JsonElement]::new();if($p.TryGetProperty('type',[ref]$pt)-and$pt.GetString()-ceq'token_count'){
    $info=[Text.Json.JsonElement]::new();if($p.TryGetProperty('info',[ref]$info)-and$info.ValueKind-eq[Text.Json.JsonValueKind]::Object){
     $s=@{threadId=$thread.id;line=$lineNumber;timestamp=$r.GetProperty('timestamp').GetString();payloadKeys=@($p.EnumerateObject()|ForEach-Object Name);infoKeys=@($info.EnumerateObject()|ForEach-Object Name)}
     foreach($kind in @('total_token_usage','last_token_usage')){$u=[Text.Json.JsonElement]::new();if($info.TryGetProperty($kind,[ref]$u)-and$u.ValueKind-eq[Text.Json.JsonValueKind]::Object){$counts=@{};foreach($prop in $u.EnumerateObject()){if($prop.Value.ValueKind-eq[Text.Json.JsonValueKind]::Number){$counts[$prop.Name]=$prop.Value.GetInt64()}};$s[$kind]=$counts}}
     $samples+=$s;$found++
    }
   }}
  }finally{$doc.Dispose()}
  if($found-ge3){break}
 }}finally{$reader.Dispose()}
}
$path=Join-Path $state.directory schema-sample.json
[IO.File]::WriteAllText($path,(@{atLocal=(Get-Date -Format s);threadCount=$threads.Count;missingRollouts=$missing;nativeEventTypesObservedInPrefixes=$types;sessionMetadata=$meta;tokenSamples=$samples}|ConvertTo-Json -Depth 30));[IO.File]::SetUnixFileMode($path,[IO.UnixFileMode]384)
@{atLocal=(Get-Date -Format s);scopePath=$scopePath;scopeSha256=(Get-FileHash $scopePath).Hash;threadCount=$threads.Count;edgeCount=$edges.Count;missingRollouts=$missing;schemaPath=$path;schemaSha256=(Get-FileHash $path).Hash;tokenSamples=$samples;sessionMetadata=$meta}|ConvertTo-Json -Depth 30
