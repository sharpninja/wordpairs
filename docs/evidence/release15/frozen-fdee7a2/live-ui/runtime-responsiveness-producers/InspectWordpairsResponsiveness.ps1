#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Recover','Read','Evidence','Search','Inventory','Requirements','RequirementMatches','CriterionMatches','Write','Finish')][string]$Operation='Read',[string[]]$Paths,[string]$Pattern='',[int]$Start=1,[int]$Count=0)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$workspace='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0'
$base=@{WorkspacePath=$workspace;CacheRoot='/tmp/wordpairs-release-audit-20261030';PluginRoot=$plugin}
if($Operation -eq 'Recover'){
 & (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command Invoke -Method 'workflow.sessionlog.updateTurn' -ParamsObject @{interpretation='Recovered after compaction. Continue same read-only runtime responsiveness diagnosis turn req-20261030T233950Z-runtime-responsiveness-diagnosis; full profile, live memories and workspace marker reloaded. Parent root Codex-20261027T100516Z-plugin-session / req-20261030T203656Z-cline-beam-release. Separate observed browser latency from unmeasured pool/DB/CPU causes; no application edits or new runtime/test/provider execution.'}
}elseif($Operation -eq 'Read'){
 foreach($path in $Paths){$full=Join-Path $workspace $path;Write-Output ('FILE '+$path);$line=0;Get-Content -LiteralPath $full | ForEach-Object {$line++;if($line -ge $Start -and ($Count -eq 0 -or $line -lt ($Start+$Count))){'{0}: {1}' -f $line,$_}}}
}elseif($Operation -eq 'Requirements'){
 $target=Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/live-ui/runtime-responsiveness-effective.json'
 if(Test-Path $target){throw 'Fresh requirements receipt already exists'}
 if($PSCmdlet.ShouldProcess($target,'Read current effective QBrain requirements and retain exact response')){
  Import-Module powershell-yaml
  $raw=& (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command Invoke -Method 'workflow.requirements.effective' -ParamsObject @{}
  $parsed=ConvertFrom-Yaml ($raw -join "`n")
  if($parsed.type -ne 'result'){throw 'Effective QBrain read failed'}
  $parsed | ConvertTo-Json -Depth 100 | Set-Content $target
  [pscustomobject]@{path=$target;sha256=(Get-FileHash $target).Hash;keys=@($parsed.payload.result.Keys)}|ConvertTo-Json -Depth 10
 }
}elseif($Operation -in @('RequirementMatches','CriterionMatches')){
 $j=Get-Content -Raw (Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/live-ui/runtime-responsiveness-effective.json')|ConvertFrom-Json -Depth 100
 Write-Output ('LAYER '+($j.payload.result.currentLayer|ConvertTo-Json -Depth 10 -Compress))
 foreach($kind in @('functional','technical','testing')){
  $records=@($j.payload.result.$kind)
  Write-Output ('KIND '+$kind+' RECORDS '+$records.Count)
  foreach($record in $records){
   $searchText=(@($record.PSObject.Properties | Where-Object Name -In @('id','title','body','condition') | ForEach-Object Value)+@($record.acceptanceCriteria|ForEach-Object text)) -join "`n"
   if($Operation -eq 'CriterionMatches'){
    foreach($criterion in $record.acceptanceCriteria){if($criterion.text -match $Pattern){[pscustomobject]@{parentId=$record.id;title=$record.title;criterion=$criterion}|ConvertTo-Json -Depth 100}}
   }elseif($searchText -match $Pattern){
    $record|Select-Object id,title,status,scopeStartLayerKey,body,condition,acceptanceCriteria|ConvertTo-Json -Depth 100
   }
  }
 }
}elseif($Operation -eq 'Inventory'){
 foreach($path in $Paths){Get-ChildItem -Recurse -File -LiteralPath (Join-Path $workspace $path) | Select-Object @{n='path';e={$_.FullName.Substring($workspace.Length+1)}},Length,LastWriteTime}
}elseif($Operation -eq 'Search'){
 Push-Location $workspace
 try {& rg -n -- $Pattern @Paths} finally {Pop-Location}
}elseif($Operation -eq 'Evidence'){
 $p=Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/live-ui/runtime-receipts/live-scale-10.json'
 $j=Get-Content -Raw $p | ConvertFrom-Json -Depth 100
 [pscustomobject]@{path=$p;sha256=(Get-FileHash $p).Hash;players=$j.players;phase=$j.phase;completed=$j.completed;rounds=$j.rounds;uiSolves=$j.uiSolves;uncertainUiRetries=$j.uncertainUiRetries;commandBodyFailures=$j.commandBodyFailures;requestFailureTotal=$j.requestFailureTotal;requestFailures=$j.requestFailures;slowResponses=$j.slowResponses;requestDiagnostics=$j.requestDiagnostics;realHttp=$j.realHttp;apiSetup=$j.apiSetup;qualification=$j.qualification}|ConvertTo-Json -Depth 100
}elseif($Operation -eq 'Write'){
 $directory='docs/evidence/release15/frozen-fdee7a2/live-ui'
 $target=Join-Path $workspace ($directory+'/runtime-responsiveness-diagnosis.json')
 if(Test-Path $target){throw 'Diagnosis receipt already exists; preserve it'}
 if(-not $PSCmdlet.ShouldProcess($target,'Write bounded source/evidence/requirements diagnosis only')){return}
 $manifestPath=Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/source-inventory.json'
 $manifest=Get-Content -Raw $manifestPath|ConvertFrom-Json -Depth 100
 $sourcePaths=@('src/infrastructure/postgres-pool.ts','src/infrastructure/runtime.ts','src/infrastructure/identity-repository.ts','src/infrastructure/room-repository.ts','src/infrastructure/match-repository.ts','src/infrastructure/catalog-repository.ts','src/infrastructure/supabase-postgres.ts','src/infrastructure/outbox.ts','src/infrastructure/realtime.ts','src/infrastructure/deadlines.ts','src/application/outbox.ts','src/application/matches.ts','src/application/lobby.ts','src/application/identity.ts','src/app/api/session/route.ts','src/app/api/rooms/[reference]/route.ts','src/app/api/rooms/[reference]/match/route.ts','src/app/api/rooms/[reference]/lobby/route.ts','src/app/api/rooms/[reference]/reactions/route.ts','src/app/api/internal/deadlines/route.ts','src/web/game-panel.tsx','src/web/room-screen.tsx','src/web/use-room-updates.ts','src/web/identity-panel.tsx','src/web/social-panel.tsx','src/infrastructure/migrations/003_identity.sql','src/infrastructure/migrations/004_rooms.sql','src/infrastructure/migrations/007_matches.sql','scripts/run-local-ui-integration.ps1','scripts/run-local-tls.mjs','scripts/start-local-realtime.ps1','scripts/run-local-app.ps1','scripts/run-local-scheduler.ps1','tests/browser/request-diagnostics.ts','package-lock.json')
 $pins=@(foreach($path in $sourcePaths){$hash=(Get-FileHash -LiteralPath (Join-Path $workspace $path)).Hash;$frozen=@($manifest.sourceHashes|Where-Object path -CEQ $path);if($frozen.Count -ne 1 -or $frozen[0].sha256 -ine $hash){throw ('Inspected source pin mismatch: '+$path)};[ordered]@{path=$path;sha256=$hash;matchesFrozen=$true}})
 $evidencePaths=@(($directory+'/runtime-receipts/live-scale-10.json'),($directory+'/runtime-receipts/live-scale-10-failure-ui.json'),($directory+'/runtime-receipts/live-local-harness.json'),($directory+'/runtime-receipts/live-local-scheduler-final.json'),($directory+'/invocation.json'),($directory+'/live-ui.xml'),($directory+'/runtime-responsiveness-effective.json'))
 $evidencePins=@(foreach($path in $evidencePaths){[ordered]@{path=$path;sha256=(Get-FileHash -LiteralPath (Join-Path $workspace $path)).Hash}})
 $runtime=Get-Content -Raw (Join-Path $workspace $evidencePaths[0])|ConvertFrom-Json -Depth 100
 $effective=Get-Content -Raw (Join-Path $workspace ($directory+'/runtime-responsiveness-effective.json'))|ConvertFrom-Json -Depth 100
 $wanted=@('FR-REQUESTFEEDBACK-030','TR-CONNECTION-RECOVERY-009','TR-REALTIME-SYNC-002','TR-ROOM-SYNCRECOVERY-038','TR-FREETIER-OPERATION-021','TEST-MULTIPLAYERINTEGRATION-134','TEST-REQUESTFEEDBACK-143','TEST-ROOMSYNC-139')
 $requirements=@(foreach($kind in @('functional','technical','testing')){foreach($r in $effective.payload.result.$kind){if($r.id -in $wanted){$r|Select-Object id,title,status,body,condition,scopeStartLayerKey,acceptanceCriteria}}})
 $receipt=[ordered]@{
  recordedAt=[DateTimeOffset]::Now.ToString('o');classification='Read-only operational diagnosis, not hostile validation or release acceptance';sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261030T233950Z-runtime-responsiveness-diagnosis';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';sourceRevision=$manifest.revision;manifestCount=$manifest.manifestCount;manifestSha256=(Get-FileHash $manifestPath).Hash;inspectedSourcePins=$pins;evidencePins=$evidencePins
  observation=[ordered]@{nativeGameCompleted=$runtime.completed;players=$runtime.players;phase=$runtime.phase;uiSolves=$runtime.uiSolves;driverUncertainUiRetries=$runtime.uncertainUiRetries;driverBodyFailures=@($runtime.commandBodyFailures).Count;diagnosticFailureTotal=$runtime.requestDiagnostics.failureTotal;diagnosticPendingAtDispose=$runtime.requestDiagnostics.pendingAtDispose;retainedDetailCount=@($runtime.slowResponses).Count;longCompletedResponses=@($runtime.slowResponses|Where-Object durationMs -GT 8000);requestFailureTotal=$runtime.requestFailureTotal;qualification='Completed timing is browser Request.timing().responseEnd captured synchronously at requestfinished. Details retain status>=400 or duration>1000 with100-entry cap, not all requests or a latency percentile population. Request-failure elapsedMs is case-relative capture time, not request duration. Detail records omit actor, canonical command ID, start/header/abort timestamps and request identity; cannot link11.601s answer to page7 pending intent. No body error is evidence for this case; old CCA9 body failure is separate.'}
  sourceSupportedChain=@(
   'Pool is a module-level process singleton shared by services, max3 checked-out connections; checkout/connection timeout5000ms and idle timeout10000ms. These are not a whole HTTP/SQL response budget. Installed pg-pool queues checkout when full and applies its timeout to pending checkout. No pool wait telemetry retained.',
   'Match POST context awaits identity session RPC, possible deadline catch-up, and room RPC. MatchService.act reads catalog revision before its transaction; cached catalog still checks revision. Transaction holds one connection through BEGIN, room FOR UPDATE, replay snapshot, catalog revision lock, match FOR UPDATE, canonical snapshot/decision/commit RPC and COMMIT. Server routes/store do not forward Request.signal into PG or set query/statement/lock timeout in the inspected path.',
   'After durable command result the route awaits deliverOutbox. It skips joining an active relay for a foreground limit1; otherwise it can read one pending event, await broadcast with3000ms AbortSignal, then mark published. One broadcast contains distinct per-profile audience messages. This provides a possible post-commit response delay, not proof it occurred here.',
   'Deadline owner can itself drain25lobby jobs, ensure up to25starting matches and25stage jobs. Foreground skips an already-active dispatcher. Worker POST waits for the active result, then delivers25events; local worker starts the next request after previous completion plus1000ms. Only final worker200/zero-applied/zero-published is retained; it is not an interval latency history.',
   'Game GET calls MatchService.view -> open -> repository.ensure even for an existing match; ensure uses a transaction and room FOR UPDATE before reading existing match. Answer and presence operations share that room lock. Thus read/write contention is a source-supported sibling path; measured lock wait/holder evidence is missing.',
   'Distinct MatchChanged notifications fan out to audience profiles, each triggering an authorized game refetch. Room refresh also increments game/social refresh keys. Connected game/social safety reads use15s, disconnected1s; room reads15s except countdown/holdout1s; session reads15s; presence20s. Individual panels coalesce one follow-up; there is no proven runtime global request population here.',
   'GamePanel POST uses AbortSignal.timeout10000. Uncertain transport/body failure retains canonical pending payload and locks new answer controls. A newer GET can show next prompt while pending remains; Retry invokes send with the original command. Refresh does not acknowledge that mutation. Source permits this state and retained page7 symptoms are consistent, but exact abort/request causality is unproven.'
  )
  topology='Owned Chromium contexts -> loopback Node HTTPS3443 -> Caddy3004. App routes proxy to production Next start3005; realtime websocket/broadcast paths proxy to separately owned Supabase Realtime container and its separate internal PG. App PG is a separate owned postgres17 container with strict certificate TLS, fsync/synchronous_commit on, volatile tmpfs test storage. Worker directly calls Next internal deadlines endpoint. Local evidence is not Vercel/Supabase hosted capacity evidence.'
  hypotheses=@(
   @{name='Shared pool checkout/backpressure and same-room lock serialization';support='Pool3, repeated RPC roundtrips, reads and writes share room lock, fanout refetches';proved=$false;missing='Contemporaneous checkout wait, active/idle/total connection counts, PG lock/blocker/query-age spans correlated to command.'},
   @{name='Foreground catch-up/publication adds critical-path delay';support='Awaited deadline owner and one-event relay before route response';proved=$false;missing='Per-step server timing, publication start/end/status and batch ownership during exact affected request.'},
   @{name='Browser/Node/gateway scheduling or local host pressure';support='Broad delayed session/room/match/presence completed timings in same retained case';proved=$false;missing='Contemporaneous owned cgroup/process CPU/RSS, event loop delay, gateway timing, browser request start/header/body/abort timestamps. Broad latency does not prove CPU saturation.'}
  )
  currentRequirements=[ordered]@{readAt=[DateTimeOffset]::Now.ToString('o');layer=$effective.payload.result.currentLayer.key;functionalCount=@($effective.payload.result.functional).Count;technicalCount=@($effective.payload.result.technical).Count;testingCount=@($effective.payload.result.testing).Count;selectedRecords=$requirements;assessment='No numeric HTTP latency/p95/p99 SLA found in current normative bodies/conditions/ACs by mechanical keyword/number search and focused full criterion review. Responsive ACs address viewport geometry. Do not invent a10s SLA from frontend abort or harness waits. LIVE-07 and TR-34-C01 require complete2..15UI/service matrix, currently unsatisfied. Recovery/feedback criteria require busy/retained draft, valid Retry and exact canonical identity; completing by Retry cannot waive unchanged user-visible latency or20s stage behavior.'}
  recoveryAssessment='Native UI acknowledgement/retry gating can correctly exercise supported recovery without replacing a pending command or submitting a new answer prematurely. A passing replay establishes that recovery/completion outcome, not why the request delayed or that normal gameplay is responsive. Retain explicit latency qualification and missing measurements. No timeout, pool, worker or cap increase is proposed merely to pass.'
  minimalNextMeasurements=@(
   'Root runs unchanged focused10and15-player replay after approved test-only acknowledgement repair. Preserve failed fdee receipts. Bind new source/run/host and exact runtime ownership; no test or runtime launched by this agent.',
   'Use an external owned-cgroup observer at a modest interval to record cumulative CPU deltas, RSS/memory, PG backend state/query age/wait type/event, pg_blocking_pids and granted/ungranted lock metadata without SQL text. Record sampler duration, missed intervals, native exit/error and ownership validity. Sampling cannot directly measure JS pg-pool checkout waits or sub-interval stalls.',
   'Keep existing per-page command/recovery diagnostics correlated by page index and canonical command identity, browser start/header/completion/abort observations and game phase. No new app instrumentation authorized here. If unavailable, explicitly retain exact-command/critical-path causality as unknown.',
   'Retain worker interval outcomes if existing external collection permits; final200 alone cannot exclude earlier backlog. Do not treat observer-based absence of a sampled lock wait as proof no lock wait existed. Separate PostgreSQL query age from execution time and browser responseEnd from server latency.'
  )
  result=[ordered]@{scopeVerdict='QUALIFIED_DIAGNOSIS_ONLY';knownFail=@('Native10-player game incomplete at round2 with17solves; not a completed release matrix.');unknown=@('Exact pending request/abort cause and association with11.601s completed answer.','Pool checkout occupancy/wait duration.','PG wait/lock holder and SQL durations at incident.','Node/browser/gateway scheduling/CPU/memory at incident.','Worker/publication critical-path latency and interval backlog.','Focused repaired10/15replay and full fresh matrix not run by this agent.');accuracyPercent=99;completenessPercent=95;ratingBasis='Exact source/effective requirements and retained browser measurements verified; causal attribution deliberately unresolved and operational monitor/replay not executed.'}
  limitations=@('No source edits, builds, tests, runtime launch, provider writes, requirement/status changes or HV performed.','Only listed frozen source pins verified; no whole working-tree unchanged claim.','Questionable direct file path scripts/run-local-gateway.mjs did not exist; corrected to actual Caddy configuration in start-local-realtime.ps1. No evidence lost.','An initial broad QBrain rendering was truncated; exact effective response retained, focused normative records/criteria subsequently read without notes/output truncation.','Installed pg-pool source is dependency evidence outside frozen source set; package-lock is pinned.')
  dependencyPin=@{path='node_modules/pg-pool/index.js';sha256=(Get-FileHash (Join-Path $workspace 'node_modules/pg-pool/index.js')).Hash;frozenSourcePin=$false}
 }
 $receipt|ConvertTo-Json -Depth 100|Set-Content $target
 [pscustomobject]@{path=$target;sha256=(Get-FileHash $target).Hash;sourcePins=$pins.Count;requirements=$requirements.Count;verdict=$receipt.result.scopeVerdict}|ConvertTo-Json
}elseif($Operation -eq 'Finish'){
 $target=Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/live-ui/runtime-responsiveness-diagnosis.json'
 $response=[IO.File]::ReadAllText('/tmp/wordpairs-runtime-responsiveness-result.txt')
 $decision='Retain completed browser timings as user-visible responsiveness evidence, not proof of pool, PostgreSQL, CPU or exact pending-command cause. Native Retry gating may verify canonical recovery while leaving latency unresolved. Apply current effective feedback/recovery/matrix/20s-stage obligations without inventing a numeric HTTP SLA. Prepare external owned-resource measurements only; no source/runtime/provider changes or policy increases.'
 & (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command Invoke -Method 'workflow.sessionlog.appendDialog' -ParamsObject @{dialogItems=@(@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';category='decision';content=$decision},@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';category='observation';content=$response})}
 & (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command Invoke -Method 'workflow.sessionlog.appendActions' -ParamsObject @{actions=@(@{order=1;type='read';status='completed';filePath='src/infrastructure/runtime.ts';description='Read and pin scoped request, auth, pool, transaction, outbox, UI refetch and local topology siblings; inspect retained native timings without new runtime/test execution.'},@{order=2;type='read';status='completed';filePath='docs/evidence/release15/frozen-fdee7a2/live-ui/runtime-responsiveness-effective.json';description='Read current effective layer1QBrain criteria through own Codex plugin and retain exact response; no requirement mutations.'},@{order=3;type='design_decision';status='completed';filePath='';description=$decision},@{order=4;type='create';status='completed';filePath=$target;description='Retain qualified diagnostic chain, exact pins, failures/unknowns and smallest missing operational measurements; prepare analyzed nonexecuted observer for root.'})}
 & (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command CompleteTurn -Response $response
}
