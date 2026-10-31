#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$folder=Join-Path $repo 'docs/evidence/release15/hosting-readiness'
$base='supabase-readiness-20261030T201006'
$original=Join-Path $folder ($base+'.json')
$path=Join-Path $folder ($base+'.qualification.json')
$producer=Join-Path $folder ($base+'.qualification.producer.ps1')
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
$cache='/tmp/wordpairs-capacity15-codex-cache'
$own=Get-Content -LiteralPath '/tmp/wordpairs-supabase-readiness-session.json' -Raw | ConvertFrom-Json -AsHashtable
function Invoke-OwnPlugin {
 param([string]$Method,[hashtable]$Parameters)
 $r=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot $cache -Method $Method -ParamsObject $Parameters | ConvertFrom-Yaml
 if($r.type -ne 'result'){throw "Required Codex plugin failure: $Method"}
 $r.payload.result
}
$originalHash=(Get-FileHash -LiteralPath $original).Hash
if($originalHash -cne '08D9205F51C3E846DD7E87CE7A19208E179940C916675DCFDAC36CBDDD630E60'){throw 'Original readiness evidence changed'}
$parseTokens=$null;$parseErrors=$null
[void][Management.Automation.Language.Parser]::ParseFile('/tmp/Save-WordpairsSupabaseReadiness.ps1',[ref]$parseTokens,[ref]$parseErrors)
$diagnostics=@(Invoke-ScriptAnalyzer -Path '/tmp/Save-WordpairsSupabaseReadiness.ps1' -Severity Warning,Error)
if(@($parseErrors).Count -ne 0 -or $diagnostics.Count -ne 0){throw 'Readiness producer analyzer gate failed'}
$qualification=[ordered]@{recordedAt=(Get-Date).ToString('o');ownSessionId=$own.sessionId;ownRequestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;originalPath=$original;originalSha256=$originalHash;originalRetainedUnmodified=$true;qualification='observations.observedWindowLocal.start/end are coarse collection-window labels, not individually measured provider-call timestamps or a single consistent database snapshot. In particular,19:59:00 is a rounded label rather than a measured call start. Use the measured own-turn opening19:58:53.3655344-05:00 as the earlier audit bound and original recordedAt20:10:06 as receipt-persistence time. No statement that these independent connector reads share one snapshot is made.';producerChecks=[ordered]@{parserErrors=0;pssaWarningsErrors=0;whatIfPerformedBeforePersistence=$true;producerSha256=(Get-FileHash -LiteralPath '/tmp/Save-WordpairsSupabaseReadiness.ps1').Hash};findingsAndCountsUnchanged=$true;metadataNotRolloutAcceptance=$true}
if(-not $PSCmdlet.ShouldProcess($path,'Retain precise timestamp qualification without overwriting original evidence')){return}
foreach($p in @($path,$producer)){if(Test-Path -LiteralPath $p){throw 'Refusing qualification overwrite'}}
$qualification | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $path -Encoding utf8NoBOM
Copy-Item -LiteralPath $PSCommandPath -Destination $producer
if((Get-FileHash -LiteralPath $producer).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Qualification producer copy mismatch'}
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.appendDialog' -Parameters @{dialogItems=@(@{timestamp=(Get-Date).ToString('o');role='model';category='observation';content=($qualification | ConvertTo-Json -Depth 8)})})
$history=Invoke-OwnPlugin -Method 'client.SessionLog.QueryAsync' -Parameters @{agent='Codex';limit=40}
$session=@($history.items | Where-Object sessionId -CEQ $own.sessionId)[0]
$turn=@($session.turns | Where-Object requestId -CEQ $own.requestId)[0]
$match=@($turn.processingDialog | Where-Object {$_.content -ceq ($qualification | ConvertTo-Json -Depth 8)})
if($turn.status -cne 'completed' -or $match.Count -ne 1){throw 'Qualification canonical turn readback mismatch'}
$readback=[ordered]@{recordedAt=(Get-Date).ToString('o');ownSessionId=$own.sessionId;ownRequestId=$own.requestId;status=$turn.status;qualificationDialogMatched=$true;dialogCount=@($turn.processingDialog).Count;responseRetained=$true;qualification=$qualification;qualificationSha256=(Get-FileHash -LiteralPath $path).Hash;producerSha256=(Get-FileHash -LiteralPath $producer).Hash}
$readbackPath=Join-Path $folder ($base+'.qualification.turn-readback.json')
$readback | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $readbackPath -Encoding utf8NoBOM
$readback | ConvertTo-Json -Depth 10
