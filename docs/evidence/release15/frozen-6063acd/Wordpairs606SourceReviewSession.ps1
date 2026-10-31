#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Begin','Complete')][string]$Mode='Begin')
$ErrorActionPreference='Stop'
$repo='<repo>'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-6063acd'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
$cache='/tmp/wordpairs-release-selfcheck-codex'
function Invoke-OwnReview([string]$Method,[hashtable]$Payload){
 $result=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot $cache -Method $Method -ParamsObject $Payload|ConvertFrom-Yaml
 if($result.type -ne 'result'){throw 'Required own Codex plugin review operation failed'}
 $result.payload.result
}
if(-not $PSCmdlet.ShouldProcess($folder,"$Mode source-only review logging/effective read, no execution")){return}
if($Mode -eq 'Begin'){
 $rid='req-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')+'-606-source-review'
 $begin=Invoke-OwnReview workflow.sessionlog.beginTurn @{requestId=$rid;queryTitle='Source-only review of frozen conflict projection freshness candidate';queryText='Read-only self review, not HV, for6063acd9d6869fd71a33f75ee5c940c736c99124. Verify five-file test-only delta versusc118,24new correct/wrong pairs plus prior162 unchanged, SAME210mock/real chronology and DOM limits. Sweep lifecycle/replay/isolation/retirement/own-round/cleanup siblings, exact historical13 missing-payload/409body qualification, fresh45record207criterion semantic/status/evidence comparison and full168/1427 mechanical distinction. Preserve prior four tsc sequence deviation and original admin exception scope; no erasure by new six checks0. Save only new frozen source-selfreview/what-if/provenance/effective/readback artifacts. No source/test/runner/requirement/provider changes or tests/builds/HV. Parent Codex-20261027T100516Z-plugin-session / req-20261030T203656Z-cline-beam-release.'}
 $effective=Invoke-OwnReview workflow.requirements.effective @{}
 $effective|ConvertTo-Json -Depth 100|Set-Content -LiteralPath /tmp/wordpairs-606-effective.json
 [ordered]@{sessionId=$begin.sessionId;requestId=$rid;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';readAtLocal=(Get-Date -Format s);effectivePath='/tmp/wordpairs-606-effective.json';effectiveSha256=(Get-FileHash -LiteralPath /tmp/wordpairs-606-effective.json).Hash}|ConvertTo-Json|Set-Content -LiteralPath /tmp/wordpairs-606-review-session.json
 [void](Invoke-OwnReview workflow.sessionlog.appendDialog @{dialogItems=@(@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';category='decision';content='Treat source/helper discrimination, runtime user outcome, historical process failures and publication as separate claims. Full literal profile and redacted marker reloaded, live Global9/Workspace0 excludingPROCESS007; Cline/Beam/High until Monday afternoon remains independent reviewer. Current work is own same-family bounded source self-review, not HV or completion.'})})
 Get-Content -LiteralPath /tmp/wordpairs-606-review-session.json -Raw
 return
}
$own=Get-Content -LiteralPath /tmp/wordpairs-606-review-session.json -Raw|ConvertFrom-Json
$response=Get-Content -LiteralPath (Join-Path $folder 'source-selfreview.md') -Raw
$supplement=Get-Content -LiteralPath (Join-Path $folder 'source-what-if-supplement.json') -Raw|ConvertFrom-Json
$response+="`n`nFull bounded what-if conclusions:`n"+[string]::Join("`n`n",@($supplement.axes|ForEach-Object {$_.axis+': '+$_.outcome+"`nNamed cases: "+[string]::Join(', ',@($_.cases))}))
$response+="`n`nEvery scoped record/criterion reconciled:`n"+[string]::Join("`n",@($supplement.records|ForEach-Object {$_.id+': unchanged identity/text/status/satisfaction/evidence. '+[string]::Join(', ',@($_.criteria.reference))}))
$response+="`n`nSafe evidence/provenance postcheck:`n"+(Get-Content -LiteralPath (Join-Path $folder 'source-selfreview-postcheck.json') -Raw)
foreach($p in $supplement.currentSourcePins){if((Get-FileHash -LiteralPath (Join-Path $repo $p.path)).Hash -cne $p.sha256){throw 'Frozen source drift before review completion'}}
$decision='Freshness is a separate acknowledgement invariant: same-panel idle/pending-free is insufficient after409 unless rendered version exceeds the exact rejected expectedVersion. Preserve the original command, all bounds, unknown-pending guard and intended-own-round assertion. New isolated210 proof and six clean edit events cannot erase historical failures, establish DOM/full15 runtime, server cause, broad semantic mapping relevance or hosted acceptance.'
[void](Invoke-OwnReview workflow.sessionlog.appendDialog @{dialogItems=@(@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';category='decision';content=$decision},@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';category='observation';content=$response})})
[void](Invoke-OwnReview workflow.sessionlog.appendActions @{actions=@(@{order=1;type='design_decision';status='completed';description=$decision;filePath='docs/evidence/release15/frozen-6063acd/source-what-if-supplement.json'},@{order=2;type='create';status='completed';description='Retain bounded source/requirements/native chronology review and source-hash provenance, without source/test/execution mutations.';filePath='docs/evidence/release15/frozen-6063acd/source-selfreview.md'})})
[void](Invoke-OwnReview workflow.sessionlog.completeTurn @{response=$response})
$history=Invoke-OwnReview client.SessionLog.QueryAsync @{agent='Codex';limit=40}
$sessions=if($history -is [Collections.IDictionary] -and $history.Contains('items')){$history.items}else{$history}
$session=@($sessions|Where-Object sessionId -CEQ $own.sessionId)[0]
$turn=@($session.turns|Where-Object requestId -CEQ $own.requestId)[0]
if($turn.status -cne 'completed' -or $turn.response -cne $response){throw 'Canonical source review full response mismatch'}
$readback=[ordered]@{atLocal=(Get-Date -Format s);sessionId=$own.sessionId;requestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;status=$turn.status;fullResponseMatched=$true;response=$turn.response;actions=@($turn.actions).Count;dialogItems=@($turn.processingDialog).Count}
$readback|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $folder 'source-selfreview-turn-readback.json')
$readback.Remove('response');$readback|ConvertTo-Json
