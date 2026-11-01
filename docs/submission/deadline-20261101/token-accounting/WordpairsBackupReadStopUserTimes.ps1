#Requires -Version 7.5
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
$path='<home>/.codex/sessions/2026/10/26/rollout-2026-10-26T11-17-57-01a17901-193c-7163-bb57-05a12ae57269.jsonl'
$zone=[TimeZoneInfo]::FindSystemTimeZoneById('America/Chicago')
$reader=[IO.StreamReader]::new([IO.FileStream]::new($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite));$number=0;$results=@()
$patterns=@('I need you to get it wrapped up with the bugs','just push','stop','deploy immediately','before deadline','deadline is today','Assume October 31',"don't block on me")
try{while($null-ne($line=$reader.ReadLine())){
 $number++;try{$doc=[Text.Json.JsonDocument]::Parse($line)}catch{continue}
 try{
  $r=$doc.RootElement;if($r.GetProperty('type').GetString()-cne'event_msg'){continue};$p=$r.GetProperty('payload');$type=[Text.Json.JsonElement]::new();if(-not$p.TryGetProperty('type',[ref]$type)-or$type.GetString()-cne'user_message'){continue}
  $value=[Text.Json.JsonElement]::new();if(-not$p.TryGetProperty('message',[ref]$value)-or$value.ValueKind-ne[Text.Json.JsonValueKind]::String){continue};$message=$value.GetString()
  $matched=@($patterns|Where-Object {$message.IndexOf($_,[StringComparison]::OrdinalIgnoreCase)-ge0});if(-not$matched.Count){continue}
  $timestamp=[DateTimeOffset]::Parse($r.GetProperty('timestamp').GetString())
  $selected=@($message -split '\r?\n'|Where-Object {$text=$_;@($patterns|Where-Object {$text.IndexOf($_,[StringComparison]::OrdinalIgnoreCase)-ge0}).Count-and$text-notmatch'^\s*<|"source"\s*:|"annotation"\s*:|"text"\s*:'})
  foreach($quote in $selected){if($quote.Length-gt2000){$results+=@{line=$number;utc=$timestamp.ToUniversalTime().ToString('o');central=[TimeZoneInfo]::ConvertTime($timestamp,$zone).ToString('o');matching=$matched;quoteOmitted='Selected line longer than2000characters; not rendered to avoid unrelated embedded context'};continue};$results+=@{line=$number;utc=$timestamp.ToUniversalTime().ToString('o');central=[TimeZoneInfo]::ConvertTime($timestamp,$zone).ToString('o');matching=$matched;quote=$quote}}
 }finally{$doc.Dispose()}
}}finally{$reader.Dispose()}
@{atLocal=(Get-Date -Format s);path=$path;source='Native event_msg user_message only,not assistant responses';results=$results}|ConvertTo-Json -Depth 12
