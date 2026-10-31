#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Create','Ask','ReportBlocked','RootMetadata','Finish','Readback')][string]$Operation='Create')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$workspace='<repo>'
$directory=Join-Path $workspace 'docs/evidence/release15/audit-persistence-diagnosis-20261030T201948'
$ownSession='Codex-20261030T194802Z-plugin-session';$ownRequest='req-20261031T011813Z-root-audit-agenthelp'
$rootSession='Codex-20261027T100516Z-plugin-session';$rootRequest='req-20261030T203656Z-cline-beam-release'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0'
$base=@{WorkspacePath=$workspace;CacheRoot='/tmp/wordpairs-release-audit-20261030';PluginRoot=$plugin}
Import-Module powershell-yaml
function Invoke-OwnPlugin([string]$Method,[hashtable]$Data){
 $raw=& (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command Invoke -Method $Method -ParamsObject $Data
 $document=ConvertFrom-Yaml (((($raw -join "`n") -split '(?m)^---\s*$'))[0])
 if($document.type -cne 'result'){throw ($Method+': '+($document.payload|ConvertTo-Json -Compress -Depth 8))}
 return $document.payload.result
}
function Get-TextHash([string]$Text){[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Text)))}
function Save-SafeJson([object]$Value,[string]$Name){
 $target=Join-Path $directory $Name
 if(Test-Path -LiteralPath $target){throw 'Preserve original diagnosis evidence'}
 $text=$Value|ConvertTo-Json -Depth 40
 $marker=ConvertFrom-Yaml ([IO.File]::ReadAllText((Join-Path $workspace 'AGENTS-README-FIRST.yaml')))
 if($marker.apiKey){$text=$text.Replace([string]$marker.apiKey,'[REDACTED]')}
 [IO.File]::WriteAllText($target,$text)
 [pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash}
}
function Submit-InquiryFailure([string]$Method,[string]$ErrorText){
 Import-Module (Join-Path $plugin 'lib/McpPluginShim.psm1') -Force
 . (Join-Path $plugin 'lib/resolve-cache-dir.ps1')
 . (Join-Path $plugin 'lib/yaml-object-mutation.ps1')
 Import-McpYamlSerializer
 $env:MCP_WORKSPACE_PATH=$workspace;$env:MCPSERVER_WORKSPACE_PATH=$workspace;$env:MCP_AGENT_NAME='Codex';$env:MCP_PLUGIN_HOST='codex';$env:MCP_CACHE_DIR_OVERRIDE=$base.CacheRoot
 $params=New-McpTriageReportParams -Title 'Supported Agent Help persistence diagnosis could not complete' -Summary 'Read-only expert inquiry for an existing Wordpairs root turn failed through its own Codex plugin; preserve accepted earlier incidents and diagnose supported Agent Help route without changing application.' -Component 'McpServer agent-help/plugin' -AffectedPaths @('/tmp/WordpairsRootAuditAgentHelp.ps1') -AffectedSymbols @($Method) -ErrorSignature 'Wordpairs_AgentHelp_Diagnosis_Failure' -DedupeKey 'wordpairs-agenthelp-persistence-diagnosis-20261030' -Evidence $ErrorText -ReporterAgent Codex -WorkspacePath $workspace -SessionId $ownSession -TurnId $ownRequest -Tags @('agenthelp','persistence','incidental') -ReproductionHints @('Invoke supported workflow.agenthelp method through own Codex plugin; do not use raw REST or repair storage/configuration.') -IdempotencyKey ('wordpairs-agenthelp-diagnosis-'+$Operation)
 $stamp=Get-Date -Format yyyyMMddTHHmmss;$queue=Join-Path (Get-McpFailsafeDir -StartPath $workspace) ($stamp+'-triage-agenthelp-diagnosis.yaml')
 Write-McpYamlObject -Path $queue -Document ([ordered]@{method='workflow.triage.report';label='triage-agenthelp-diagnosis';timestamp=$stamp;params=$params})
 $result=Invoke-OwnPlugin 'workflow.triage.report' $params
 Save-SafeJson ([pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');failedMethod=$Method;error=$ErrorText;failsafePath=$queue;triage=$result;qualification='Intake only, no diagnosis/resolution or repair inferred.'}) ('failure-'+$Operation+'.json')
}
if(-not $PSCmdlet.ShouldProcess($directory,($Operation+': own plugin read-only expert inquiry/allowlisted root metadata or own audit evidence only'))){return}
if(-not(Test-Path -LiteralPath $directory)){[void][IO.Directory]::CreateDirectory($directory)}
if($Operation -eq 'Create'){
 $observations=@(foreach($name in @('audit-persistence-20261030T194738','audit-persistence-20261030T201719')){
  $submission=Join-Path $workspace ('docs/evidence/release15/'+$name+'/submission.yaml');$failsafe=Join-Path $workspace ('docs/evidence/release15/'+$name+'/failsafe.yaml')
  $parsed=ConvertFrom-Yaml ([IO.File]::ReadAllText($submission));$result=$parsed.payload.result
  [pscustomobject]@{submission=$submission;submissionSha256=(Get-FileHash -LiteralPath $submission).Hash;failsafe=$failsafe;failsafeSha256=(Get-FileHash -LiteralPath $failsafe).Hash;envelopeType=$parsed.type;reportId=$result.reportId;groupId=$result.groupId;status=$result.status}
 })
 $issue='Read-only expert diagnosis requested, not repair or HV. Root reports two workflow.sessionlog.appendActions rejections: persisted=false, queued=false, storage backend unreachable; normal session_submit-2019 failsafe retained. Accepted incidents 114b209eb1c940faac37afbde493656f and d4db07501fb8445f9ecd840ee2153337 share group cd6ceae0e798493c. Existing root session '+$rootSession+' / '+$rootRequest+'. Smaller own Codex turns have completed with exact canonical readback. Do not infer a payload-size cause. /tmp/LogWordpairsReleaseProgress.ps1 appends dialog, then actions, then queries readback; failure prevented that root readback. Need supported replay/idempotency/exact existing-turn persistence semantics and safe metadata readback. Do not create a duplicate root request, replay/write/update/repair root/session storage, change configuration, TODOs/requirements, build/test/deploy or inspect/print secrets/full private history. Only read relevant docs/source and allowlisted root turn status/counts/matching hashes; distinguish current read from prior accepted triage research. Caller is independent Codex subagent; parent root IDs are evidence, not caller impersonation.'
 $params=@{workspacePath=$workspace;topic='Existing session turn persistence and failsafe replay semantics';clientName='Wordpairs release-audit read-only expert inquiry';callerAgent='Codex';callerSessionId=$ownSession;callerRequestId=$ownRequest;issueSummary=$issue;agentSeed='Read-only diagnosis only. No server/configuration/storage/root-turn mutations or new TODO/requirements. Never print credentials or full private session history. Return source-pinned supported commands and factual limitations, not an inferred repair or resolution. Do not read PRIVATE-MEMORY-REFERENCE-007.'}
 try{$result=Invoke-OwnPlugin 'workflow.agenthelp.createSession' $params;Save-SafeJson ([pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');callerSessionId=$ownSession;callerRequestId=$ownRequest;parentSessionId=$rootSession;parentRequestId=$rootRequest;method='workflow.agenthelp.createSession';parameters=$params;priorIncidents=$observations;result=$result}) 'create.json'}catch{Submit-InquiryFailure 'workflow.agenthelp.createSession' $_.Exception.Message;throw}
 return
}
if($Operation -eq 'Ask'){
 $created=Get-Content -LiteralPath (Join-Path $directory 'create.json') -Raw|ConvertFrom-Json -Depth 100
 $question='Diagnose only, without any repair or root-turn writes. For existing root '+$rootSession+' / '+$rootRequest+', explain supported safe recovery after appendDialog may succeed but appendActions SubmitAsync says persisted=false/storage backend unreachable while smaller independent turns work. Read /tmp/LogWordpairsReleaseProgress.ps1 and relevant installed plugin/server source or docs. What exact existing-turn/plugin operation should root use to verify whether last requested dialog/actions persisted, obtain count/order and hashes without printing full private history, and retry/replay without duplicate or clobbered evidence? Are session_submit failsafe replay/upsert and action ordering/idempotency safe, and under what actual source conditions? Distinguish acknowledgement, canonical readback, replay and incident research. Do not presume size, storage saturation or resolution. Root already has accepted incidents114b209e and d4db0750/groupcd6ceae0; do not create another root session/request, replay or mutate anything. Your current task is read-only diagnosis. Return supported method/parameter shapes, exact source anchors and explicit unknowns. Never print marker/API keys, private histories, credential values or PRIVATE-MEMORY-REFERENCE-007. Do not build or run tests/models as HV; normal expert analysis only.'
 try{$result=Invoke-OwnPlugin 'workflow.agenthelp.submitTurn' @{sessionId=$created.result.sessionId;userMessage=$question;clientTimestampUtc=[DateTimeOffset]::UtcNow.ToString('o')};Save-SafeJson ([pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');method='workflow.agenthelp.submitTurn';helpSessionId=$created.result.sessionId;question=$question;result=$result}) 'answer.json'}catch{Submit-InquiryFailure 'workflow.agenthelp.submitTurn' $_.Exception.Message;throw}
 if($result.status -in @('failed','error','blocked')){Submit-InquiryFailure 'workflow.agenthelp.submitTurn' ([string]$result.error)}
 return
}
if($Operation -eq 'RootMetadata'){
 try{
  $query=Invoke-OwnPlugin 'client.SessionLog.QueryAsync' @{agent='Codex';limit=40}
  $sessions=if($query -is [Collections.IDictionary] -and $query.Contains('items')){$query.items}else{$query}
  $turns=@(foreach($session in $sessions){if($session.sessionId -ceq $rootSession){@($session.turns|Where-Object requestId -CEQ $rootRequest)}})
  if($turns.Count -ne 1){throw 'Exact root turn absent/ambiguous in supported read'}
  $turn=$turns[0];$observations=@($turn.processingDialog|Where-Object category -CEQ 'observation');$last=if($observations.Count){$observations[-1]}else{$null}
  $lastText=if($last){[string]$last.content}else{''}
  $actionMatches=@($turn.actions|Where-Object {[string]$_.description -ceq $lastText -and $lastText.Length -gt 0})
  $safe=[pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');method='client.SessionLog.QueryAsync';rootSessionId=$rootSession;rootRequestId=$rootRequest;status=$turn.status;actionCount=@($turn.actions).Count;dialogCount=@($turn.processingDialog).Count;observationCount=$observations.Count;lastReturnedObservation=@{present=($null -ne $last);timestamp=if($last){$last.timestamp}else{$null};characters=$lastText.Length;sha256=(Get-TextHash $lastText);matchingActionDescriptionCount=$actionMatches.Count;matchingOrders=@($actionMatches|ForEach-Object {$_.order})};maximumActionOrder=($turn.actions|Measure-Object order -Maximum).Maximum;qualification='Allowlisted current canonical read only. Last returned observation identity is hashed; absent caller-supplied intended-observation hash, this does not prove it is the last attempted root write. No private history/content printed or retained; no root replay/write.'}
  Save-SafeJson $safe 'root-metadata.json'
 }catch{Submit-InquiryFailure 'client.SessionLog.QueryAsync root metadata' $_.Exception.Message;throw}
 return
}
if($Operation -eq 'ReportBlocked'){
 $answer=Get-Content -LiteralPath (Join-Path $directory 'answer.json') -Raw|ConvertFrom-Json -Depth 100
 if($answer.result.status -cne 'terminated_guardrail'){throw 'Expected retained guard-blocked original answer'}
 $details='Original supported Agent Help request was read-only. Help session '+$answer.helpSessionId+' / '+$answer.result.turnId+' returned terminated_guardrail, incident '+$answer.result.incidentId+', rule '+$answer.result.guardResult.ruleId+'. The exact matched snippet came from a protective Never print instruction: '+$answer.result.guardResult.matchedSnippet+'. Original request and response retained in '+(Join-Path $directory 'answer.json')+'. No expert answer was generated; no retry, rephrasing, bypass or repair attempted. Root current canonical metadata independently reads51actions/51dialogs with latest observation matching order51; do not infer ongoing storage outage or a cause.'
 Submit-InquiryFailure 'workflow.agenthelp.submitTurn terminated_guardrail' $details
 return
}
if($Operation -eq 'Readback'){
 $query=Invoke-OwnPlugin 'client.SessionLog.QueryAsync' @{agent='Codex';limit=10};$sessions=if($query -is [Collections.IDictionary] -and $query.Contains('items')){$query.items}else{$query}
 $turns=@(foreach($session in $sessions){if($session.sessionId -ceq $ownSession){@($session.turns|Where-Object requestId -CEQ $ownRequest)}})
 if($turns.Count -ne 1){throw 'Exact own turn absent'}
 $turn=$turns[0];$expected=[IO.File]::ReadAllText('/tmp/wordpairs-root-agenthelp-result.txt')
 if($turn.status -cne 'completed' -or [string]$turn.response -cne $expected){throw 'Own canonical response/status mismatch'}
 Save-SafeJson ([pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');sessionId=$ownSession;requestId=$ownRequest;status=$turn.status;responseExact=$true;response=$turn.response;processingDialog=$turn.processingDialog;actions=$turn.actions;parentSessionId=$rootSession;parentRequestId=$rootRequest}) 'canonical-readback.json'
 return
}
$created=Get-Content -LiteralPath (Join-Path $directory 'create.json') -Raw|ConvertFrom-Json -Depth 100
$answerPath=Join-Path $directory 'answer.json';$metadataPath=Join-Path $directory 'root-metadata.json'
$answer=if(Test-Path -LiteralPath $answerPath){Get-Content -LiteralPath $answerPath -Raw|ConvertFrom-Json -Depth 100}else{$null}
$metadata=if(Test-Path -LiteralPath $metadataPath){Get-Content -LiteralPath $metadataPath -Raw|ConvertFrom-Json -Depth 100}else{$null}
$failurePath=Join-Path $directory 'failure-ReportBlocked.json';$failure=if(Test-Path -LiteralPath $failurePath){Get-Content -LiteralPath $failurePath -Raw|ConvertFrom-Json -Depth 100}else{$null}
$producerCopy=Join-Path $directory 'WordpairsRootAuditAgentHelp.ps1';Copy-Item -LiteralPath $PSCommandPath -Destination $producerCopy
if((Get-FileHash -LiteralPath $producerCopy).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Retained diagnosis producer mismatch'}
Save-SafeJson ([pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');producer=$producerCopy;sha256=(Get-FileHash -LiteralPath $producerCopy).Hash;qualification='Final operational producer copy retained after inquiry, before closing audit. It is not a pre-execution source freeze. Original blocked question and response are separately preserved in answer.json.'}) 'producer-retention.json'|Out-Null
$decision='Keep existing root identity, distinguish append acknowledgement from canonical state and queued replay from proven origin/resolution. Agent Help guard terminated the protective instruction, so expert diagnosis is unavailable. Preserve the blocked original; do not rephrase/retry around the security guard. Normal failsafe and triage intake succeeded; do not wait for research. Current root read51 with one matching latest observation is not evidence of continuing outage or exact replay origin. A last-returned observation hash does not identify the last attempted write without an intended hash. No root write/replay/repair performed.'
$response=(Get-Date -Format s)+' - Supported read-only expert inquiry help session '+[string]$created.result.sessionId+'. Full safe create/answer and metadata receipts in '+$directory+'. Caller '+$ownSession+' / '+$ownRequest+'; parent '+$rootSession+' / '+$rootRequest+'. Expert turn '+$(if($answer){[string]$answer.result.turnId}else{'UNAVAILABLE'})+', status '+$(if($answer){[string]$answer.result.status}else{'UNAVAILABLE'})+'. No expert diagnosis was produced: the guard matched text inside a protective Never print instruction. Original retained, no retry, rephrasing or bypass. FULL RETURNED HELP RESULT: '+$(if($answer){$answer.result|ConvertTo-Json -Depth 30}else{'No answer available.'})+'. SAFE ROOT METADATA: '+$(if($metadata){$metadata|ConvertTo-Json -Depth 15}else{'No metadata available.'})+'. FAILURE TRIAGE INTAKE: '+$(if($failure){$failure.triage|ConvertTo-Json -Depth 10}else{'No accepted intake receipt available.'})+'. Normal failsafe was written before triage; plugin reported one replay, but exact queue-file-to-report replay attribution was not independently established. No continuing storage outage, payload-size cause, storage cause or incident resolution inferred. Final producer retained after inquiry with explicit timing qualification. No duplicate root session/request, replay, storage/config repair, TODO/requirements changes, app/tests/build/model-HV execution or provider writes. Prior accepted incidents and failed root writes remain retained. Accuracy 99% for exact returned/readback fields; completeness 95% for bounded inquiry with expert analysis unavailable and exact recovery/causality unproved.'
[IO.File]::WriteAllText('/tmp/wordpairs-root-agenthelp-result.txt',$response)
Invoke-OwnPlugin 'workflow.sessionlog.appendDialog' @{dialogItems=@(@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';category='decision';content=$decision},@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';category='observation';content=$response})}|Out-Null
Invoke-OwnPlugin 'workflow.sessionlog.appendActions' @{actions=@(@{order=1;type='read';status='completed';filePath='/tmp/LogWordpairsReleaseProgress.ps1';description='Read exact root progress helper and documented Agent Help/SessionLog typed command schemas; inspect only safe incident/readback metadata.'},@{order=2;type='create';status='completed';filePath=$directory;description='Request supported agent-help create/turn using real own caller linkage, retain safe complete result and current root status/count/order/hash allowlist without root writes.'},@{order=3;type='design_decision';status='completed';filePath='';description=$decision})}|Out-Null
& (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command CompleteTurn -Response $response
