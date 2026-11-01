#Requires -Version 7.5
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
$path='<home>/.codex/sessions/2026/10/26/rollout-2026-10-26T11-17-57-01a17901-193c-7163-bb57-05a12ae57269.jsonl'
$zone=[TimeZoneInfo]::FindSystemTimeZoneById('America/Chicago')
$reader=[IO.StreamReader]::new([IO.FileStream]::new($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite));$number=0;$results=@();$users=0
$patterns=@('I need you to get it wrapped up with the bugs','just push','stop','deploy immediately','before deadline','deadline is today','Assume October 31',"don't block on me")
try{while($null-ne($line=$reader.ReadLine())){
 $number++;if($line.IndexOf('"role":"user"',[StringComparison]::Ordinal)-lt0-and$line.IndexOf('"role": "user"',[StringComparison]::Ordinal)-lt0){continue}
 try{$doc=[Text.Json.JsonDocument]::Parse($line)}catch{continue}
 try{
  $r=$doc.RootElement;if($r.GetProperty('type').GetString()-cne'response_item'){continue};$p=$r.GetProperty('payload');$role=[Text.Json.JsonElement]::new();if(-not$p.TryGetProperty('role',[ref]$role)-or$role.GetString()-cne'user'){continue};$users++
  $content=[Text.Json.JsonElement]::new();if(-not$p.TryGetProperty('content',[ref]$content)-or$content.ValueKind-ne[Text.Json.JsonValueKind]::Array){continue}
  $pieces=@(foreach($part in $content.EnumerateArray()){$text=[Text.Json.JsonElement]::new();if($part.TryGetProperty('text',[ref]$text)-and$text.ValueKind-eq[Text.Json.JsonValueKind]::String){$text.GetString()}})
  $message=$pieces-join"`n";$matched=@($patterns|Where-Object {$message.IndexOf($_,[StringComparison]::OrdinalIgnoreCase)-ge0});if(-not$matched.Count){continue}
  $timestamp=[DateTimeOffset]::Parse($r.GetProperty('timestamp').GetString())
  $selected=@($message -split '\r?\n'|Where-Object {$text=$_;@($patterns|Where-Object {$text.IndexOf($_,[StringComparison]::OrdinalIgnoreCase)-ge0}).Count-and$text-notmatch'^\s*<|"source"\s*:|"annotation"\s*:|"text"\s*:'})
  foreach($quote in $selected){if($quote.Length-gt2000){continue};$results+=@{line=$number;utc=$timestamp.ToUniversalTime().ToString('o');central=[TimeZoneInfo]::ConvertTime($timestamp,$zone).ToString('o');matching=$matched;quote=$quote}}
 }finally{$doc.Dispose()}
}}finally{$reader.Dispose()}
@{atLocal=(Get-Date -Format s);path=$path;source='Native response_item roleuser only;matchingusertextlines,noassistantrole';userMessages=$users;results=$results}|ConvertTo-Json -Depth 12
