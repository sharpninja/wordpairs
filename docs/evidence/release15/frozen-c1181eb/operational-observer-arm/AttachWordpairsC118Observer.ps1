#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Retain','Inspect','Arm','Launch','Status')][string]$Operation='Inspect')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$workspace='<repo>'
$directory=Join-Path $workspace 'docs/evidence/release15/frozen-c1181eb'
$unit='wordpairs-release15-c1181eb-chain.service'
$expectedInvocation='bf9cd8eecd34482c850bc95f5fc69250'
$revision='c1181eb4eb01825c8b12f3521f92286080addfba'
$groupRun='169e6d93-632f-423c-8572-be3cccb96a00'
$request='req-20261031T003052Z-c118-operational-evidence'
$observerUnit='wordpairs-release15-c1181eb-observer.service'
$armDirectory=Join-Path $directory 'operational-observer-arm'
$producer=Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/live-ui/runtime-responsiveness-producers/WatchWordpairsOwnedRuntime.ps1'
function Get-ChainUnit {
 $text=& systemctl --user show $unit --no-pager --property=LoadState,ControlGroup,MainPID,InvocationID,ActiveState,SubState,ExecMainStatus,ExecMainCode,Result
 if($LASTEXITCODE -ne 0){throw 'Exact owned unit metadata unavailable'}
 $properties=@{};foreach($line in $text){if($line -match '^([^=]+)=(.*)$'){$properties[$Matches[1]]=$Matches[2]}}
 return $properties
}
function Invoke-ObserverAttachment {
 [CmdletBinding(SupportsShouldProcess)]
 param()
 $properties=Get-ChainUnit
 if($properties.InvocationID -cne $expectedInvocation -or $properties.ActiveState -ne 'active'){throw 'Exact chain retired or changed before attachment'}
 $beforePath=Join-Path $directory 'live-ui/source-before.json'
 if(-not (Test-Path -LiteralPath $beforePath)){return [pscustomobject]@{status='WAIT';reason='Exact live-ui phase source receipt absent'}}
 $before=Get-Content -LiteralPath $beforePath -Raw|ConvertFrom-Json -Depth 100
 $manifestPath=Join-Path $directory 'source-inventory.json';$manifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json -Depth 100
 $startPath=Join-Path $directory 'service-start.json';$start=Get-Content -LiteralPath $startPath -Raw|ConvertFrom-Json
 $inventory=Get-Content -LiteralPath (Join-Path $directory 'expected-inventory.json') -Raw|ConvertFrom-Json
 if($before.revision -cne $revision -or $manifest.revision -cne $revision -or $start.revision -cne $revision -or $inventory.revision -cne $revision -or $start.runId -cne $groupRun -or $inventory.runId -cne $groupRun -or $manifest.manifestCount -ne 353 -or $before.manifestCount -ne 353 -or -not $before.pathSetEqual){throw 'Frozen candidate/group/phase binding mismatch'}
 $memberPids=@(Get-Content -LiteralPath ('/sys/fs/cgroup'+$properties.ControlGroup+'/cgroup.procs'))
 $candidates=@(foreach($item in (Get-ChildItem -LiteralPath (Join-Path $workspace '.mcpServer') -Directory -Filter 'ui-*')){
  if($item.Name -notmatch '^ui-([0-9a-f]{32})$'){continue};$owner=$Matches[1]
  $ownerPath=Join-Path $item.FullName 'database-owner.json';$appPath=Join-Path $item.FullName 'local-live-app-process.json'
  if(-not (Test-Path -LiteralPath $ownerPath) -or -not (Test-Path -LiteralPath $appPath)){continue}
  if((Get-Item -LiteralPath $ownerPath).LastWriteTime -lt [datetime]$before.recordedAt){continue}
  $db=Get-Content -LiteralPath $ownerPath -Raw|ConvertFrom-Json;$app=Get-Content -LiteralPath $appPath -Raw|ConvertFrom-Json
  if($db.owner -cne $owner -or $db.database -cne ('wordpairs_ui_'+$owner) -or $db.containerId -notmatch '^[0-9a-f]{64}$' -or [string]$app.pid -notin $memberPids){continue}
  $stat=([IO.File]::ReadAllText('/proc/'+$app.pid+'/stat') -replace '^.*\)\s+','') -split '\s+'
  if([string]$stat[19] -cne [string]$app.startToken){continue}
  [pscustomobject]@{runtime=$item.FullName;owner=$owner;databaseOwnerPath=$ownerPath;databaseOwnerSha256=(Get-FileHash -LiteralPath $ownerPath).Hash;appProcessPath=$appPath;appProcessSha256=(Get-FileHash -LiteralPath $appPath).Hash;appPid=$app.pid;appStartToken=$app.startToken}
 })
 if($candidates.Count -eq 0){return [pscustomobject]@{status='WAIT';reason='Exact phase-owned app/runtime association absent'}}
 if($candidates.Count -ne 1){throw 'Ambiguous phase-owned runtime; do not attach'}
 $candidate=$candidates[0]
 if((Get-FileHash -LiteralPath $producer).Hash -cne '946F92B05E1629855654E00ADB6F160C10B6096F2BE3E35107D09BEA3531B88D'){throw 'Unchanged observer producer pin mismatch'}
 $observerOutput=Join-Path $directory 'operational-observer';$launchDirectory=Join-Path $directory 'operational-observer-launch'
 if((Test-Path -LiteralPath $launchDirectory) -or (Test-Path -LiteralPath $observerOutput)){throw 'Preserve existing observer evidence'}
 $observerParams=@{UnitName=$unit;SystemdScope='User';ControlGroup=$properties.ControlGroup;InvocationId=$properties.InvocationID;RuntimeDirectory=$candidate.runtime;RunId=$groupRun;SourceHead=$revision;SourceManifest=$manifestPath;OutputDirectory=$observerOutput;IntervalSeconds=2}
 if(-not $PSCmdlet.ShouldProcess($candidate.runtime,'Launch unchanged optional observer in a persistent unit after exact runtime ownership validation')){return [pscustomobject]@{status='READY';runtime=$candidate.runtime}}
 $dryRun=@(& $producer @observerParams -WhatIf 6>&1|ForEach-Object ToString)
 [void][IO.Directory]::CreateDirectory($launchDirectory)
 $retained=Join-Path $launchDirectory 'WatchWordpairsOwnedRuntime.ps1';Copy-Item -LiteralPath $producer -Destination $retained
 $launcher=Join-Path $launchDirectory (Split-Path $PSCommandPath -Leaf);Copy-Item -LiteralPath $PSCommandPath -Destination $launcher
 if((Get-FileHash -LiteralPath $retained).Hash -cne (Get-FileHash -LiteralPath $producer).Hash -or (Get-FileHash -LiteralPath $launcher).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Observer/launcher retained source mismatch'}
 $arguments=@('--user','--collect',('--unit='+$observerUnit),'--property',('WorkingDirectory='+$workspace),'--property',('StandardOutput=append:'+(Join-Path $launchDirectory 'stdout.log')),'--property',('StandardError=append:'+(Join-Path $launchDirectory 'stderr.log')),'--','/usr/bin/pwsh','-NoProfile','-NonInteractive','-File',$retained)
 foreach($key in @('UnitName','SystemdScope','ControlGroup','InvocationId','RuntimeDirectory','RunId','SourceHead','SourceManifest','OutputDirectory','IntervalSeconds')){$arguments+=('-'+$key);$arguments+=([string]$observerParams[$key])}
 $at=[DateTimeOffset]::Now;$ack=@(& systemd-run @arguments 2>&1|ForEach-Object ToString);$exit=$LASTEXITCODE
 $target=Join-Path $launchDirectory 'launch.json'
 [pscustomobject]@{recordedAt=$at.ToString('o');hostName=[Environment]::MachineName;sessionId='Codex-20261030T194802Z-plugin-session';requestId=$request;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';phaseSourceBefore=@{path=$beforePath;sha256=(Get-FileHash -LiteralPath $beforePath).Hash};sourceManifest=@{path=$manifestPath;sha256=(Get-FileHash -LiteralPath $manifestPath).Hash};serviceStart=@{path=$startPath;sha256=(Get-FileHash -LiteralPath $startPath).Hash};ownedUnit=$properties;runtimeAssociation=$candidate;parameters=$observerParams;producerSha256=(Get-FileHash -LiteralPath $retained).Hash;launcherSha256=(Get-FileHash -LiteralPath $launcher).Hash;producerWhatIf=$dryRun;executable='systemd-run';arguments=$arguments;exitCode=$exit;acknowledgement=$ack;qualification='Launch acknowledgement only; unchanged optional measurement producer, no tests or acceptance assertions. Runtime bound by exact app PID/start token in exact chain cgroup, then independently checked Docker owner label by observer. No argv/environment captured. Sampling may begin after an early test action; no whole-run coverage guarantee.'}|ConvertTo-Json -Depth 50|Set-Content -LiteralPath $target
 if($exit -ne 0){throw 'Observer launch failed; native output retained'}
 return [pscustomobject]@{status='LAUNCHED';path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;runtime=$candidate.runtime;observerUnit=$observerUnit}
}
if($Operation -eq 'Retain'){
 if(-not $PSCmdlet.ShouldProcess($armDirectory,'Retain exact original corrected launcher, unchanged observer and new bounded attachment producer before arming')){return}
 if(Test-Path -LiteralPath $armDirectory){throw 'Preserve prior attachment retention'}
 [void][IO.Directory]::CreateDirectory($armDirectory)
 $pins=@(foreach($path in @('/tmp/AttachWordpairsOwnedObserver.ps1',$producer,$PSCommandPath)){$copy=Join-Path $armDirectory (Split-Path $path -Leaf);$hash=(Get-FileHash -LiteralPath $path).Hash;Copy-Item -LiteralPath $path -Destination $copy;if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Original attachment source copy mismatch'};[pscustomobject]@{original=$path;copy=$copy;sha256=$hash}})
 [pscustomobject]@{recordedAt=[DateTimeOffset]::Now.ToString('o');sessionId='Codex-20261030T194802Z-plugin-session';requestId=$request;sourceHead=$revision;sourceCount=353;groupRunId=$groupRun;expectedUnit=$unit;expectedInvocation=$expectedInvocation;producerPins=$pins;originalsRetained=$true;qualification='Attachment producer retention only; no observer or tests launched.'}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $armDirectory 'producer-retention.json')
}elseif($Operation -eq 'Inspect'){
 Get-ChainUnit|ConvertTo-Json
 [pscustomobject]@{recordedAt=[DateTimeOffset]::Now.ToString('o');fullReceiptExists=(Test-Path -LiteralPath (Join-Path $directory 'full/validation.json'));liveUiSourceBeforeExists=(Test-Path -LiteralPath (Join-Path $directory 'live-ui/source-before.json'))}|ConvertTo-Json
}elseif($Operation -eq 'Arm'){
 if(-not $PSCmdlet.ShouldProcess($unit,'Wait read-only for exact live-ui owner and launch optional unchanged observer once; no new test execution')){return}
 if(-not (Test-Path -LiteralPath (Join-Path $armDirectory 'producer-retention.json'))){throw 'Retained producer receipt required before attachment'}
 $at=[DateTimeOffset]::Now;$polls=0
 do{$result=Invoke-ObserverAttachment;$polls++;if($result.status -eq 'WAIT'){if($polls % 15 -eq 1){[pscustomobject]@{at=[DateTimeOffset]::Now.ToString('o');status=$result.status;reason=$result.reason;polls=$polls}|ConvertTo-Json -Compress};Start-Sleep -Seconds 2}}while($result.status -eq 'WAIT')
 [pscustomobject]@{startedAt=$at.ToString('o');finishedAt=[DateTimeOffset]::Now.ToString('o');polls=$polls;result=$result;qualification='Read-only phase/ownership attachment wait, not a test delay or acceptance gate.'}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $armDirectory 'attachment.json')
 $result|ConvertTo-Json
}elseif($Operation -eq 'Launch'){
 Invoke-ObserverAttachment|ConvertTo-Json
}else{
 & systemctl --user show $observerUnit --no-pager --property=LoadState,ActiveState,SubState,MainPID,InvocationID,ExecMainStatus,ExecMainCode,Result
 $path=Join-Path $directory 'operational-observer/observer.json'
 if(Test-Path -LiteralPath $path){$result=Get-Content -LiteralPath $path -Raw|ConvertFrom-Json -Depth 100;[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;stopReason=$result.stopReason;sampleCount=$result.sampleCount;errors=$result.errors;ownership=$result.ownershipInitiallyVerified}|ConvertTo-Json -Depth 20}
}
