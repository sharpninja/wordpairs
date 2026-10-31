#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Begin','Update','Complete')][string]$Mode='Begin',[string]$TextPath)
$ErrorActionPreference='Stop'
$repo='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
$cache='/tmp/wordpairs-release-selfcheck-codex'
if(-not $PSCmdlet.ShouldProcess($repo,"$Mode test-only eager command-response capture repair log")){return}
function Invoke-CapturePlugin([string]$Method,[hashtable]$Payload){
 $r=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot $cache -Method $Method -ParamsObject $Payload|ConvertFrom-Yaml
 if($r.type -ne 'result'){throw 'Command capture plugin operation failed'}
 $r.payload.result
}
if($Mode -eq 'Begin'){
 $rid='req-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')+'-command-capture'
 Invoke-CapturePlugin workflow.sessionlog.beginTurn @{requestId=$rid;queryTitle='Repair test-only eager UI command response capture';queryText='Parent authorized bounded test-only BDPv4 repair. Preserve failed cca320b evidence; inspect actual matrix/strict command and answer helpers plus current effective requirements. Save plan before oracle/helper. Prove independent correct/wrong fixtures and same-oracle green mock gate before implementing eager request.response and successful body capture while click action is pending. Preserve exact request identity, cached body, null status0, 409/5xx without parsing errors, truthful body/action/capture failures and full owned-work drain. Adopt in both specs without changing retry budgets, game cap/policy, timeouts, assertions or cleanup. No app/schema/dependency/provider/HV/git changes, actual UI tests or build. Focused isolated contracts, hooks, direct typecheck, Biome and source diff only. Parent Codex-20261027T100516Z-plugin-session / req-20261030T203656Z-cline-beam-release.'}
 Invoke-CapturePlugin workflow.sessionlog.updateTurn @{interpretation='Fix the browser-test lifetime ownership class, rather than retrying or hiding successful HTTP response body errors. Establish a discriminating mock gate before helper implementation and join the same oracle to the actual helper; preserve normal-versus-strict validation claims.';tags=@('test-only','BDPv4','not-HV','parent:Codex-20261027T100516Z-plugin-session','parentRequest:req-20261030T203656Z-cline-beam-release')}
}else{
 $text=Get-Content -LiteralPath $TextPath -Raw
 Invoke-CapturePlugin workflow.sessionlog.appendDialog @{dialogItems=@(@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';content=$text;category='observation'})}
 Invoke-CapturePlugin workflow.sessionlog.updateTurn @{designDecisions=@('A successful HTTP command body must be captured as soon as the exact request response is available while the initiating UI action is still owned. Do not defer body access until UI completion or reinterpret 200 body errors as retryable conflicts.','Drain every started action/capture task before propagating a failure so final cleanup cannot abandon its sibling. Preserve original game rules, 12-attempt payload retries, response statuses and full gameplay assertions.');contextList=@('tests/browser/live-player-counts.integration.spec.ts','tests/browser/live-multiplayer.integration.spec.ts','TR-MULTIPLAYER-INTEGRATION-034#TR-34-C01','TEST-MULTIPLAYERINTEGRATION-134#TR-34-C01','TR-ROOM-SYNCRECOVERY-038#LIVE-02/LIVE-07','TEST-ROOMSYNC-139#LIVE-02/LIVE-07')}
 if($Mode -eq 'Complete'){
  Invoke-CapturePlugin workflow.sessionlog.appendActions @{actions=@(@{order=1;description='Preserve failed matrix artifacts and pin current effective scope; retain causal qualifications.';type='read';status='completed';filePath='docs/evidence/release15/command-capture'},@{order=2;description='Establish independent mock gate before shared helper implementation; bind same oracle to helper and preserve chronological test/edit/typecheck/lint evidence.';type='test';status='completed';filePath='tests/browser'})}
  Invoke-CapturePlugin workflow.sessionlog.completeTurn @{response=$text}
 }
}
