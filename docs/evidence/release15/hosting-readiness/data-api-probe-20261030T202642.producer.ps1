#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$folder=Join-Path $repo 'docs/evidence/release15/hosting-readiness'
$root='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0'
$cache='/tmp/wordpairs-capacity15-codex-cache'
$own=Get-Content -LiteralPath '/tmp/wordpairs-data-api-probe-session.json' -Raw | ConvertFrom-Json -AsHashtable
$safe=Get-Content -LiteralPath '/tmp/wordpairs-data-api-probe-safe-metadata.json' -Raw | ConvertFrom-Json -AsHashtable
function Invoke-OwnPlugin {
 param([string]$Method,[hashtable]$Parameters)
 $r=& (Join-Path $root 'Invoke-CodexMcpPlugin.ps1') -Command Invoke -WorkspacePath $repo -CacheRoot $cache -Method $Method -ParamsObject $Parameters | ConvertFrom-Yaml
 if($r.type -ne 'result'){throw "Required Codex plugin failure: $Method"}
 $r.payload.result
}
function Get-Pin {param([string]$Path) [ordered]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash;bytes=(Get-Item -LiteralPath $Path).Length}}
foreach($row in $safe.connectedProjectMetadata){
 $expected=if($row.logical -ceq 'staging'){'jshjkaigwbxsbnnogfxs'}elseif($row.logical -ceq 'production'){'krdcuuhcynmdfcjlpbsf'}else{throw 'Unexpected project context'}
 if($row.ref -cne $expected -or $row.projectUrl -cne ('https://'+$expected+'.supabase.co') -or -not$row.keyLookupSucceeded -or -not$row.urlLookupSucceeded){throw 'Project URL/key metadata context mismatch'}
 if(@($row.keys | Where-Object {-not$_.disabled -and $_.type -ceq 'publishable'}).Count -lt 1){throw 'No active publishable key metadata observed'}
}
$localClassifications=& '/tmp/Inspect-WordpairsExistingPublicInput.ps1' | ConvertFrom-Json -AsHashtable
$nativeRoute=& '/tmp/Inspect-WordpairsNativePublicKeyRoute.ps1' | ConvertFrom-Json -AsHashtable
$now=(Get-Date).ToString('o');$stamp=Get-Date -Format yyyyMMddTHHmmss
$base='data-api-probe-'+$stamp
$path=Join-Path $folder ($base+'.json')
$unknowns=@(
 'Actual exposed-schema allowlists remain UNKNOWN:zero HTTPS DataAPI probes were sent. No PGRST106,401,404 or RLS outcome was observed for either hosted project in this task.',
 'Safe native authentication dependency: connected active publishable-key values remain only in tool runtime memory. No approved private in-memory/file transfer interface to native PowerShell is available without key values entering tool arguments/logs. Existing inspected private inputs contain only a local anonJWT with no hosted projectref and a non-project SupabaseURL; it was rejected. No Supabase CLI was found on PATH or four named standard executable paths; four named standard credential-store files, token environment variable and six named existing hosted.env export paths were absent. This is a bounded route check,not a whole-machine absence claim. An existing private hosted public-key input bound to each exactproject would allow the documented native probe.'
)
$receipt=[ordered]@{schema='wordpairs-data-api-exposure-probe-preflight-v1';recordedAt=$now;classification='Operator-directed read-only operational probe preparation;actual networkprobe notperformed';ownSessionId=$own.sessionId;ownRequestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;profile=[ordered]@{files=1;globalMemories=9;workspaceMemories=0;excluded='PRIVATE-MEMORY-REFERENCE-007'};connectedMetadata=$safe;existingPrivateInputClassification=$localClassifications;boundedNativeRouteInspection=$nativeRoute;probePlan=[ordered]@{method='GET';path='/rest/v1/';schemaHeader='Accept-Profile';candidateSchemas=@('net','vault','public','wordpairs_probe_nonexistent');authentication='activepublicpublishable/anon key only through private local input';classification='Only PGRST106 and a valid schema-name list would establish nonexposure/current allowlist. Other statuses/authentication/permission/route failures remain different observations. No table rows or RPC invoked.'};actualProbeCount=0;actualDataApiSchemaList=$null;unknowns=$unknowns;noKeyValuesRenderedOrPutInArgumentsOrEvidence=$true;noServiceRoleDatabasePasswordOrGithubKeyUsed=$true;noProviderSchemaResourceApplicationMutation=$true;noBrowserDashboardCdpOrManagementRestUsed=$true;noBuildTestModelInvocation=$true;counts=[ordered]@{pass=2;fail=0;unknown=2};overallVerdict='NOT_HV';readinessVerdict='PENDING_SAFE_NATIVE_PUBLIC_KEY_INPUT';accuracy=99;completeness=80;ratingQualification='Official protocol semantics and active connected-key/projectURLmetadata verified;actualbehavior intentionally unobserved because no safe native key bridge exists.';incident=[ordered]@{originalFailure='beginTurn persistedfalse,exit0,noresult;normal session_submit failsafe replayed and livehistory confirms same8477 in_progress';acceptedTriage='triage-report-df5a3d8b84db4acb833f3536f215f47b';group='triage-group-fcf0d219cd5c22c7';correction='Earlier nullrequestID diagnosis withdrawn:I selected nonexistent requestId field;actual current-turn canonical turnRequestId correctly8477. No cache repair/duplicate turn needed.'}}
if(-not $PSCmdlet.ShouldProcess($path,'Retain no-probe limitation and complete the same recovered own turn')){return}
$env:MCP_CACHE_DIR_OVERRIDE=$cache;$env:MCP_WORKSPACE_PATH=$repo;$env:MCPSERVER_WORKSPACE_PATH=$repo;$env:MCP_AGENT_NAME='Codex';$env:MCP_PLUGIN_HOST='codex'
Import-Module (Join-Path $root 'lib/McpPluginShim.psm1') -Force
. (Join-Path $root 'lib/resolve-cache-dir.ps1')
. (Join-Path $root 'lib/yaml-object-mutation.ps1')
Import-McpYamlSerializer
$correction=New-McpTriageReportParams -Title 'Correction: Codex turnRequestId is valid after rejected persistence replay' -Summary 'Correction to reportdf5a3d8b84db4acb833f3536f215f47b:the caller inspected nonexistent cache requestId. Canonical turnRequestId is8477 and valid. Withdraw null-ID part. Actual initial persistedfalse rejection/session_submit failsafe is retained; queue replay succeeded and livehistory8477 is in_progress. No cache repair or duplicate turn occurred; backend rejection cause remains unknown.' -Component 'mcpserver-codex-plugin session persistence' -AffectedPaths @('Invoke-CodexMcpPlugin.ps1','lib/repl-invoke.ps1') -AffectedSymbols @('workflow.sessionlog.beginTurn','client.SessionLog.SubmitAsync') -ErrorSignature 'begin_turn_rejected_request_id_null_exit0' -DedupeKey 'codex-beginturn-persistence-rejected-null-request' -Evidence 'Original diagnostic correction only: local cache field is turnRequestId,notrequestId. Original req-20261031T011723Z-turn-8477 exists canonicalhistory under Codex-20261030T194703Z-plugin-session. Acceptedtriage may research initial persistence rejection,but must not infer cacheIDloss/serveroutage from caller field-selection mistake.' -ReporterAgent 'Codex' -WorkspacePath $repo -SessionId $own.sessionId -TurnId $own.requestId -Tags @('correction','incidental','sessionlog') -IdempotencyKey 'wordpairs-dataapi-turn-rejected-20261030-correction1'
$queue=Join-Path (Get-McpFailsafeDir -StartPath $repo) ($stamp+'-dataapi-turn-correction.yaml')
Write-McpYamlObject -Path $queue -Document ([ordered]@{method='workflow.triage.report';label='dataapi-turn-correction';timestamp=$stamp;params=$correction})
$queueCopy=Join-Path $folder ($base+'.triage-correction-failsafe.yaml')
Copy-Item -LiteralPath $queue -Destination $queueCopy
if((Get-FileHash -LiteralPath $queue).Hash -cne (Get-FileHash -LiteralPath $queueCopy).Hash){throw 'Correction failsafe copy mismatch'}
$accepted=Invoke-OwnPlugin -Method 'workflow.triage.report' -Parameters $correction
if(-not$accepted.success){throw 'Triage correction not accepted;stop'}
$receipt.incident.correctionAccepted=$accepted
foreach($p in @($path,(Join-Path $folder ($base+'.producer.ps1')),(Join-Path $folder ($base+'.allowlisted-input.json')))){if(Test-Path -LiteralPath $p){throw 'Historical evidence overwrite refused'}}
$receipt | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $path -Encoding utf8NoBOM
$producer=Join-Path $folder ($base+'.producer.ps1');Copy-Item -LiteralPath $PSCommandPath -Destination $producer
$inputCopy=Join-Path $folder ($base+'.allowlisted-input.json');Copy-Item -LiteralPath '/tmp/wordpairs-data-api-probe-safe-metadata.json' -Destination $inputCopy
if((Get-FileHash -LiteralPath $producer).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash -or (Get-FileHash -LiteralPath $inputCopy).Hash -cne (Get-FileHash -LiteralPath '/tmp/wordpairs-data-api-probe-safe-metadata.json').Hash){throw 'Producer/input copy mismatch'}
$pins=@(Get-Pin $path;Get-Pin $producer;Get-Pin $inputCopy;Get-Pin $queueCopy)
$response=$now+' - DataAPIexposure remainsUNKNOWN;actualprobes0 due no safe native public-key input.'+"`n"+($receipt | ConvertTo-Json -Depth 20)+"`nPins:`n"+($pins | ConvertTo-Json -Depth 5)
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.appendDialog' -Parameters @{dialogItems=@(@{timestamp=$now;role='model';category='observation';content='Connectedtools verified actualprojectURLs and active legacyanon+modernpublishable keys forboth exactrefs. Values neverrendered. Read officialPostgRESTschema andSupabasekey docs. Native local classification emitted onlypublicfield paths/type/projectref/role booleans;onlylocalanon without hostedref was found and rejected.'},@{timestamp=$now;role='model';category='decision';content='Stop beforeanyHTTPSprobe because connected-key result has no safe native memory/file bridge;toolargv/stdinpatchwould exposevalues. Preserve explicitUNKNOWN and exact dependency ratherthan use service-role/DB/GitHub credentials,browser/ManagementAPI or unsupported customcrypto. PGRST106 semantics documented,actualbehavior unobserved.'},@{timestamp=$now;role='model';category='decision';content='Withdraw wrong nullcacheID claim;canonicalturnRequestId valid. Preserve original persistence rejection/failsafe/replay evidence and acceptedtriagecorrection. Continue same8477 turn,notduplicate. No productorrequirement state changed.'})})
$actions=@();$order=1
foreach($pin in $pins){$actions+=@{order=$order;type='create';status='completed';filePath=[IO.Path]::GetRelativePath($repo,$pin.path);description='Retained safe operational evidence SHA256 '+$pin.sha256};$order++}
foreach($doc in $safe.documentation){$actions+=@{order=$order;type='web_reference';status='completed';filePath='';description=$doc.href+' '+$doc.verifiedBehavior};$order++}
$actions+=@{order=$order;type='design_decision';status='completed';filePath=[IO.Path]::GetRelativePath($repo,$path);description='ActualDataAPIexposure remainsUNKNOWN;no unsafekeytransport or alternatecredential/Browser/ManagementREST route.'}
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.appendActions' -Parameters @{actions=$actions})
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.completeTurn' -Parameters @{response=$response})
$history=Invoke-OwnPlugin -Method 'client.SessionLog.QueryAsync' -Parameters @{agent='Codex';limit=40}
$session=@($history.items | Where-Object sessionId -CEQ $own.sessionId)[0];$turn=@($session.turns | Where-Object requestId -CEQ $own.requestId)[0]
if($turn.status -cne 'completed' -or $turn.response -cne $response){throw 'Own fullcanonical turn readback mismatch'}
$readback=[ordered]@{recordedAt=(Get-Date).ToString('o');sessionId=$own.sessionId;requestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;status=$turn.status;fullResponseMatched=$true;actions=@($turn.actions).Count;dialogs=@($turn.processingDialog).Count;response=$turn.response;pins=$pins}
$readbackPath=Join-Path $folder ($base+'.turn-readback.json');$readback | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $readbackPath -Encoding utf8NoBOM
[ordered]@{recordedAt=$readback.recordedAt;sessionId=$own.sessionId;requestId=$own.requestId;status=$turn.status;fullResponseMatched=$true;actions=$readback.actions;dialogs=$readback.dialogs;receiptPins=$pins;readback=Get-Pin $readbackPath;actualProbeCount=0;counts=$receipt.counts;verdict=$receipt.readinessVerdict;triageCorrectionReportId=$accepted.reportId} | ConvertTo-Json -Depth 7
