#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Begin','Complete','Readback')][string]$Mode='Begin',[string]$ResponsePath)
$ErrorActionPreference='Stop'
$repo='<repo>'
$cache='/tmp/wordpairs-release-selfcheck-codex'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
if($Mode -ne 'Readback' -and -not $PSCmdlet.ShouldProcess($repo,"$Mode captured-conflict projection freshness repair")){return}
function Invoke-Freshness([string]$Method,[hashtable]$Payload){
 $r=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot $cache -Method $Method -ParamsObject $Payload|ConvertFrom-Yaml
 if($r.type -ne 'result'){throw 'Freshness repair plugin operation failed'}
 $r.payload.result
}
if($Mode -eq 'Begin'){
 $rid='req-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')+'-conflict-freshness-repair'
 Invoke-Freshness workflow.sessionlog.beginTurn @{requestId=$rid;queryTitle='Require fresh rendered projection before retrying a captured UI conflict';queryText='Authorized reported test-harness bug repair after frozen c1181eb actual13player readiness failure. Preserve prior failed runtime and162 isolated cases. Plan and independently discriminated correct/wrong mock gate before shared retirement helper floor max(explicit minimum,captured expectedVersion+1), actual409 and safe integer/overflow validation before probing. Same new oracle binds real helper+coordinator; safe expectedVersion-only attribution in both existing browser observation paths if cleanly supported. No app/policy/cap/deadline/schema/dependency/requirement mutation, actual UI/build/HV or gitcommit by this agent. Direct tsc+hook immediately after each TS edit, resolve errors before next edit. Root owns frozen full chain. Parent Codex-20261027T100516Z-plugin-session / req-20261030T203656Z-cline-beam-release.'}
 Invoke-Freshness workflow.sessionlog.updateTurn @{interpretation='The same-perspective sender being idle and pending-free does not establish that a conflict-stale projection advanced. Gate fresh intent on the captured rejected version, preserve strict stronger outer check and all retry bounds. Historical request expectedVersion/409 body absence and latency cause remain unproved.';tags=@('test-only','BDPv4','not-HV','parent:Codex-20261027T100516Z-plugin-session','parentRequest:req-20261030T203656Z-cline-beam-release')}
 return
}
$state=Get-Content -LiteralPath "$cache/current-turn.yaml" -Raw|ConvertFrom-Yaml
if($Mode -eq 'Complete'){
 $text=Get-Content -LiteralPath $ResponsePath -Raw
 $decision='A captured409 retires only after the sender is idle/pending-free and its rendered projection exceeds the exact rejected expectedVersion. Validate unsupported versions before any probe; malformed input or unadvanced projection fails rather than permitting fresh intent. This test-only correction does not prove latency cause or full15-player success.'
 Invoke-Freshness workflow.sessionlog.appendDialog @{dialogItems=@(@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';content=$decision;category='decision'},@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';content=$text;category='observation'})}
 Invoke-Freshness workflow.sessionlog.appendActions @{actions=@(@{order=1;description=$decision;type='design_decision';status='completed';filePath='docs/evidence/release15/conflict-freshness/plan.md'},@{order=2;description='Discriminate independent correct/wrong fixtures before shared helper changes, then bind identical oracle and retain focused native/source proof.';type='edit';status='completed';filePath='tests/browser/ui-command-acknowledgement.ts'})}
 Invoke-Freshness workflow.sessionlog.completeTurn @{response=$text}
 return
}
$result=Invoke-Freshness client.SessionLog.QueryAsync @{agent='Codex';limit=20}
$sessions=if($result -is [Collections.IDictionary] -and $result.Contains('items')){$result.items}else{$result}
$turn=$null
foreach($session in $sessions){if($session.sessionId -eq $state.sessionId){$turn=@($session.turns|Where-Object requestId -EQ $state.turnRequestId)[0]}}
if(-not $turn){throw 'Exact freshness turn absent from readback'}
$receipt=[pscustomobject]@{sessionId=$state.sessionId;requestId=$turn.requestId;status=$turn.status;responseMatches=([string]$turn.response -ceq (Get-Content -LiteralPath $ResponsePath -Raw));actions=@($turn.actions).Count;decisionActions=@($turn.actions|Where-Object type -EQ 'design_decision').Count;dialogItems=@($turn.processingDialog).Count;readAtLocal=(Get-Date -Format s)}
$receipt|ConvertTo-Json
if($receipt.status -ne 'completed' -or -not $receipt.responseMatches){throw 'Freshness completion not verified'}
