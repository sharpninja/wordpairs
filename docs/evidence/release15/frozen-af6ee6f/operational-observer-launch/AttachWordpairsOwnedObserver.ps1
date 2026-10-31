#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Inspect','Launch','Status','Build')][string]$Operation='Inspect')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$workspace='<repo>'
$directory=Join-Path $workspace 'docs/evidence/release15/frozen-af6ee6f'
$unit='wordpairs-release15-af6ee6f-chain.service'
if($Operation -eq 'Inspect'){
 $properties=& systemctl --user show $unit --no-pager --property=LoadState,ActiveState,SubState,ControlGroup,MainPID,InvocationID,ExecMainStatus,ExecMainCode,Result
 if($LASTEXITCODE -ne 0){throw 'Owned unit metadata unavailable'}
 Write-Output $properties
 if(Test-Path $directory){Get-ChildItem -File $directory|Select-Object Name,Length|ConvertTo-Json;Write-Output ('LIVE_UI_SOURCE_BEFORE '+(Test-Path (Join-Path $directory 'live-ui/source-before.json')))}
}elseif($Operation -eq 'Build'){
 $validationPath=Join-Path $directory 'full/validation.json';$invocationPath=Join-Path $directory 'full/invocation.json'
 if(-not (Test-Path $validationPath) -or -not (Test-Path $invocationPath)){Write-Output 'WAIT: terminal full receipts absent';return}
 $validation=Get-Content -Raw $validationPath|ConvertFrom-Json -Depth 100;$invocation=Get-Content -Raw $invocationPath|ConvertFrom-Json -Depth 100
 [pscustomobject]@{revision=$validation.revision;nativeRunId=$validation.runId;status=$validation.status;failure=$validation.failure;build=@($validation.steps|Where-Object name -CEQ 'build');groupRevision=$invocation.revision;nativeReports=$invocation.reports}|ConvertTo-Json -Depth 30
}elseif($Operation -eq 'Launch'){
 $beforePath=Join-Path $directory 'live-ui/source-before.json'
 if(-not (Test-Path $beforePath)){Write-Output 'WAIT: live-ui source-before absent; observer not launched';return}
 $before=Get-Content -Raw $beforePath|ConvertFrom-Json -Depth 100
 $manifestPath=Join-Path $directory 'source-inventory.json'
 $manifest=Get-Content -Raw $manifestPath|ConvertFrom-Json -Depth 100
 $startPath=Join-Path $directory 'service-start.json';$start=Get-Content -Raw $startPath|ConvertFrom-Json
 if($before.revision -cne 'af6ee6fe0c4a288ac23f570a4fa6a94d697d8127' -or $manifest.revision -cne $before.revision -or $start.revision -cne $before.revision -or $start.runId -cne '9d00fa3e-555b-4491-8b8b-4f72d3b6177d' -or $manifest.manifestCount -ne 351 -or $before.manifestCount -ne 351 -or -not $before.pathSetEqual){throw 'Frozen phase binding mismatch'}
 $unitText=& systemctl --user show $unit --no-pager --property=ControlGroup,MainPID,InvocationID,ActiveState
 if($LASTEXITCODE -ne 0){throw 'Owned unit metadata unavailable'}
 $properties=@{};foreach($line in $unitText){if($line -match '^([^=]+)=(.*)$'){$properties[$Matches[1]]=$Matches[2]}}
 if($properties.InvocationID -cne '581e9a893a5846afa6baf63c3794659f' -or $properties.ActiveState -ne 'active'){throw 'Owned chain not active as expected'}
 $memberPids=@(Get-Content -LiteralPath ('/sys/fs/cgroup'+$properties.ControlGroup+'/cgroup.procs'))
 $candidates=@(foreach($item in (Get-ChildItem -LiteralPath (Join-Path $workspace '.mcpServer') -Directory -Filter 'ui-*')){
  if($item.Name -notmatch '^ui-([0-9a-f]{32})$'){continue};$owner=$Matches[1]
  $ownerPath=Join-Path $item.FullName 'database-owner.json';$appPath=Join-Path $item.FullName 'local-live-app-process.json'
  if(-not (Test-Path $ownerPath) -or -not (Test-Path $appPath)){continue}
  if((Get-Item $ownerPath).LastWriteTime -lt [datetime]$before.recordedAt){continue}
  $db=Get-Content -Raw $ownerPath|ConvertFrom-Json;$app=Get-Content -Raw $appPath|ConvertFrom-Json
  if($db.owner -cne $owner -or $db.database -cne ('wordpairs_ui_'+$owner) -or $db.containerId -notmatch '^[0-9a-f]{64}$' -or [string]$app.pid -notin $memberPids){continue}
  $stat=([IO.File]::ReadAllText('/proc/'+$app.pid+'/stat') -replace '^.*\)\s+','') -split '\s+'
  if([string]$stat[19] -cne [string]$app.startToken){continue}
  [ordered]@{runtime=$item.FullName;owner=$owner;databaseOwnerPath=$ownerPath;databaseOwnerSha256=(Get-FileHash $ownerPath).Hash;appProcessPath=$appPath;appProcessSha256=(Get-FileHash $appPath).Hash;appPid=$app.pid;appStartToken=$app.startToken}
 })
 if($candidates.Count -eq 0){Write-Output 'WAIT: no exact phase-owned app/runtime association yet; observer not launched';return}
 if($candidates.Count -ne 1){throw 'Ambiguous owned runtime; do not attach'}
 $candidate=$candidates[0]
 $producer=Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/live-ui/runtime-responsiveness-producers/WatchWordpairsOwnedRuntime.ps1'
 if((Get-FileHash $producer).Hash -cne '946F92B05E1629855654E00ADB6F160C10B6096F2BE3E35107D09BEA3531B88D'){throw 'Observer producer changed'}
 $observerOutput=Join-Path $directory 'operational-observer'
 $launchDirectory=Join-Path $directory 'operational-observer-launch'
 if((Test-Path $launchDirectory) -or (Test-Path $observerOutput)){throw 'Preserve prior observer evidence'}
 $observerParams=@{UnitName=$unit;SystemdScope='User';ControlGroup=$properties.ControlGroup;InvocationId=$properties.InvocationID;RuntimeDirectory=$candidate.runtime;RunId=$start.runId;SourceHead=$before.revision;SourceManifest=$manifestPath;OutputDirectory=$observerOutput;IntervalSeconds=2}
 if(-not $PSCmdlet.ShouldProcess($candidate.runtime,'Launch unchanged optional owned-resource observer in separate persistent user unit')){return}
 & $producer @observerParams -WhatIf
 [void][IO.Directory]::CreateDirectory($launchDirectory)
 $retained=Join-Path $launchDirectory 'WatchWordpairsOwnedRuntime.ps1';Copy-Item -LiteralPath $producer -Destination $retained
 if((Get-FileHash $retained).Hash -cne (Get-FileHash $producer).Hash){throw 'Observer retention mismatch'}
 $launcher=Join-Path $launchDirectory (Split-Path $PSCommandPath -Leaf);Copy-Item -LiteralPath $PSCommandPath -Destination $launcher
 if((Get-FileHash $launcher).Hash -cne (Get-FileHash $PSCommandPath).Hash){throw 'Launcher retention mismatch'}
 $arguments=@('--user','--collect','--unit=wordpairs-release15-af6ee6f-observer','--property',('WorkingDirectory='+$workspace),'--property',('StandardOutput=append:'+(Join-Path $launchDirectory 'stdout.log')),'--property',('StandardError=append:'+(Join-Path $launchDirectory 'stderr.log')),'--','/usr/bin/pwsh','-NoProfile','-NonInteractive','-File',$retained)
 foreach($key in @('UnitName','SystemdScope','ControlGroup','InvocationId','RuntimeDirectory','RunId','SourceHead','SourceManifest','OutputDirectory','IntervalSeconds')){$arguments+=@('-'+$key,[string]$observerParams[$key])}
 $launchAt=[DateTimeOffset]::Now
 $ack=@(& systemd-run @arguments 2>&1|ForEach-Object ToString);$exit=$LASTEXITCODE
 $receipt=[ordered]@{at=$launchAt.ToString('o');hostName=[Environment]::MachineName;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261031T000538Z-attach-owned-runtime-observer';phaseSourceBefore=@{path=$beforePath;sha256=(Get-FileHash $beforePath).Hash};sourceManifest=@{path=$manifestPath;sha256=(Get-FileHash $manifestPath).Hash};serviceStart=@{path=$startPath;sha256=(Get-FileHash $startPath).Hash};ownedUnit=$properties;runtimeAssociation=$candidate;parameters=$observerParams;producerSha256=(Get-FileHash $retained).Hash;launcherSha256=(Get-FileHash $launcher).Hash;executable='systemd-run';arguments=$arguments;exitCode=$exit;launchAcknowledgement=$ack;qualification='Launch acknowledgement only. Observer evidence/terminal receipt establish measured scope. No new test or acceptance assertions; original validation chain is unchanged. The app PID/start-token is a member of the exact chain cgroup, binding this runtime without capturing argv/environment.'}
 $target=Join-Path $launchDirectory 'launch.json';$receipt|ConvertTo-Json -Depth 100|Set-Content $target
 if($exit -ne 0){throw 'Observer unit launch failed; receipt retained'}
 [pscustomobject]@{path=$target;sha256=(Get-FileHash $target).Hash;runtime=$candidate.runtime;unit='wordpairs-release15-af6ee6f-observer.service';output=$observerOutput;measurementCompletionClaimed=$false}|ConvertTo-Json
}else{
 & systemctl --user show wordpairs-release15-af6ee6f-observer.service --no-pager --property=LoadState,ActiveState,SubState,MainPID,InvocationID,ExecMainStatus,ExecMainCode,Result
 $resultPath=Join-Path $directory 'operational-observer/observer.json'
 if(Test-Path $resultPath){$r=Get-Content -Raw $resultPath|ConvertFrom-Json -Depth 100;[pscustomobject]@{path=$resultPath;sha256=(Get-FileHash $resultPath).Hash;stopReason=$r.stopReason;sampleCount=$r.sampleCount;errors=$r.errors;ownership=$r.ownershipInitiallyVerified}|ConvertTo-Json -Depth 20}
}
