#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
$needle='20261029T042440Z-triage-report-5ca5.yaml'
$report='triage-report-3e0873bbca604ad8bc8d467921de01e9'
$hash='2154F3574CC200C1D1DA606E4382C4117CA8378CB2B22F96141FC228B01DBA0F'
$searchParams=@{query=$needle;limit=20}
$search=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot '/tmp/wordpairs-release-selfcheck-codex' -Method client.Context.SearchAsync -ParamsObject $searchParams|ConvertFrom-Yaml
if($search.type -ne 'result'){throw 'Supported literal context search failed'}
$searchText=$search.payload.result|ConvertTo-Json -Depth 50 -Compress
$historyParams=@{agent='ClaudeCode';limit=100;offset=0}
$history=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot '/tmp/wordpairs-release-selfcheck-codex' -Method client.SessionLog.QueryAsync -ParamsObject $historyParams|ConvertFrom-Yaml
if($history.type -ne 'result'){throw 'Supported Claude session history query failed'}
$sessions=if($history.payload.result -is [Collections.IDictionary] -and $history.payload.result.Contains('items')){$history.payload.result.items}else{$history.payload.result}
$hits=@(foreach($session in $sessions){foreach($turn in $session.turns){
 $text=$turn|ConvertTo-Json -Depth 60 -Compress
 if($text.Contains($needle) -or $text.Contains($report)){
  [pscustomobject]@{sessionId=$session.sessionId;requestId=$turn.requestId;title=$turn.queryTitle;status=$turn.status;hasExactFilename=$text.Contains($needle);hasNativeReportId=$text.Contains($report);hasOriginalFileHash=$text.Contains($hash);qualification='Co-occurrence is only a search lead, not proof of replay acknowledgement.'}
 }
}})
$receipt=[ordered]@{readAtLocal=(Get-Date -Format s);context=@{method='client.Context.SearchAsync';params=$searchParams;topLevelKeys=@($search.payload.result.Keys);hasExactFilename=$searchText.Contains($needle);hasNativeReportId=$searchText.Contains($report);hasOriginalHash=$searchText.Contains($hash)};history=@{method='client.SessionLog.QueryAsync';params=$historyParams;returnedSessions=@($sessions).Count;exactReferenceTurns=$hits};qualification='Read-only supported literal cross-reference search. No unrelated text or private context content retained; no universal absence/replay claim from missing indexed matches.'}
$receipt|ConvertTo-Json -Depth 15
$path=Join-Path $repo 'docs/evidence/release15/historical-failsafe-disposition/cross-reference-readback.json'
if($PSCmdlet.ShouldProcess($path,'Retain safe literal context/history search metadata')){
 if(Test-Path -LiteralPath $path){throw 'Preserve previous cross-reference receipt'}
 $receipt|ConvertTo-Json -Depth 15|Set-Content -LiteralPath $path
}
