#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Begin','Complete','Readback')][string]$Mode='Begin',[string]$ResponsePath)
$ErrorActionPreference='Stop'
$repo='<repo>'
$cache='/tmp/wordpairs-release-selfcheck-codex'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
if($Mode -ne 'Readback' -and -not $PSCmdlet.ShouldProcess($repo,"$Mode authorized test-only UI acknowledgement repair")){return}
function Invoke-AckRepair([string]$Method,[hashtable]$Payload){
 $r=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot $cache -Method $Method -ParamsObject $Payload|ConvertFrom-Yaml
 if($r.type -ne 'result'){throw 'UI acknowledgement repair plugin operation failed'}
 $r.payload.result
}
if($Mode -eq 'Begin'){
 $rid='req-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')+'-ui-ack-repair'
 Invoke-AckRepair workflow.sessionlog.beginTurn @{requestId=$rid;queryTitle='Repair test-only rendered command acknowledgement and canonical retry boundaries';queryText='Parent authorizes locked test-only plan docs/evidence/release15/ui-acknowledgement/plan.md: independent positive/wrong same-oracle green gate before helper/adapters, then real binding. Preserve58 prior cases, matrix12 attempts, strict fail-only acknowledgement/four conflict attempts, deadlines15cap and all gameplay assertions. No app/schema/dependency/provider/requirements mutations, no actual UI/full builds/models by this agent. Root owns frozen full verification and ClineBeamHigh HV. Parent Codex-20261027T100516Z-plugin-session / req-20261030T203656Z-cline-beam-release.'}
 Invoke-AckRepair workflow.sessionlog.updateTurn @{interpretation='Success requires frontend acknowledgement, not just driver JSON. Keep the original command through the same-page busy/pending/version boundary; unknown old pending blocks new intent; exact-payload replay cannot count as a later round solve. Preserve failure evidence and do not claim the runtime latency cause fixed.';tags=@('test-only','not-HV','BDPv4','parent:Codex-20261027T100516Z-plugin-session','parentRequest:req-20261030T203656Z-cline-beam-release')}
 return
}
$state=Get-Content -LiteralPath "$cache/current-turn.yaml" -Raw|ConvertFrom-Yaml
if($Mode -eq 'Complete'){
 $text=Get-Content -LiteralPath $ResponsePath -Raw
 $decision='Treat rendered acknowledgement as a separate outcome from driver body parsing. Matrix recovery is limited to the held exact request through the enabled same-page UI control, and strict acknowledgement fails honestly without adding uncertain retries. Preserve prior failures and leave actual responsiveness/full-runtime acceptance pending.'
 Invoke-AckRepair workflow.sessionlog.appendDialog @{dialogItems=@(@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';content=$decision;category='decision'},@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';content=$text;category='observation'})}
 Invoke-AckRepair workflow.sessionlog.appendActions @{actions=@(@{order=1;description=$decision;type='design_decision';status='completed';filePath='docs/evidence/release15/ui-acknowledgement/plan.md'},@{order=2;description='Add discriminating independent same-oracle contracts before implementation, then bind identical assertions to test-only acknowledgement and live-spec adapters; retain native checks and chronology.';type='edit';status='completed';filePath='tests/browser/ui-command-acknowledgement.ts'})}
 Invoke-AckRepair workflow.sessionlog.completeTurn @{response=$text}
 return
}
$result=Invoke-AckRepair client.SessionLog.QueryAsync @{agent='Codex';limit=20}
$sessions=if($result -is [Collections.IDictionary] -and $result.Contains('items')){$result.items}else{$result}
$turn=$null
foreach($session in $sessions){if($session.sessionId -eq $state.sessionId){$turn=@($session.turns|Where-Object requestId -EQ $state.turnRequestId)[0]}}
if(-not $turn){throw 'Exact UI acknowledgement repair turn absent from readback'}
$receipt=[pscustomobject]@{sessionId=$state.sessionId;requestId=$turn.requestId;status=$turn.status;responseMatches=([string]$turn.response -ceq (Get-Content -LiteralPath $ResponsePath -Raw));actions=@($turn.actions).Count;decisionActions=@($turn.actions|Where-Object type -EQ 'design_decision').Count;dialogItems=@($turn.processingDialog).Count;readAtLocal=(Get-Date -Format s)}
$receipt|ConvertTo-Json
if($receipt.status -ne 'completed' -or -not $receipt.responseMatches){throw 'UI acknowledgement repair completion not verified'}
