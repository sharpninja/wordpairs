#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
 [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9_.@-]+\.service$')][string]$UnitName,
 [ValidateSet('User','System')][string]$SystemdScope='User',
 [Parameter(Mandatory)][ValidatePattern('^/[A-Za-z0-9_.:@/-]+$')][string]$ControlGroup,
 [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{32}$')][string]$InvocationId,
 [Parameter(Mandatory)][string]$RuntimeDirectory,
 [Parameter(Mandatory)][guid]$RunId,
 [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$SourceHead,
 [Parameter(Mandatory)][string]$SourceManifest,
 [Parameter(Mandatory)][string]$OutputDirectory,
 [ValidateRange(2,30)][int]$IntervalSeconds=2
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$workspace='<repo>'
$started=[DateTimeOffset]::Now
$invocations=[Collections.Generic.List[object]]::new()
$errorsFound=[Collections.Generic.List[object]]::new()
function Invoke-OwnedNative {
 param([string]$Executable,[string[]]$Arguments,[string]$InputText='',[int]$TimeoutSeconds=15)
 $info=[Diagnostics.ProcessStartInfo]::new($Executable)
 $info.UseShellExecute=$false;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true;$info.RedirectStandardInput=$true
 foreach($argument in $Arguments){$info.ArgumentList.Add($argument)}
 $at=[DateTimeOffset]::Now;$process=$null;$timedOut=$false
 try {
  $process=[Diagnostics.Process]::Start($info)
  $stdout=$process.StandardOutput.ReadToEndAsync();$stderr=$process.StandardError.ReadToEndAsync()
  if($InputText){$process.StandardInput.Write($InputText)}
  $process.StandardInput.Close()
  if(-not $process.WaitForExit($TimeoutSeconds*1000)){$timedOut=$true;$process.Kill($true);$process.WaitForExit()}
  $out=$stdout.GetAwaiter().GetResult();$err=$stderr.GetAwaiter().GetResult()
  $finished=[DateTimeOffset]::Now
  $invocations.Add([ordered]@{executable=$Executable;startedAt=$at.ToString('o');finishedAt=$finished.ToString('o');durationMs=($finished-$at).TotalMilliseconds;exitCode=$process.ExitCode;timedOut=$timedOut;stderrPresent=[bool]$err})
  if($timedOut -or $process.ExitCode -ne 0){throw ('NativeFailure:'+ $Executable)}
  return $out
 }finally{if($process){$process.Dispose()}}
}
function Get-OwnedUnit {
 $arguments=@();if($SystemdScope -eq 'User'){$arguments+='--user'}
 $arguments+=@('show','--no-pager','--property=LoadState,ActiveState,SubState,ControlGroup,MainPID,InvocationID,ExecMainStatus,ExecMainCode,Result','--',$UnitName)
 $text=Invoke-OwnedNative 'systemctl' $arguments
 $result=[ordered]@{}
 foreach($line in ($text -split "`n")){if($line -match '^([^=]+)=(.*)$'){$result[$Matches[1]]=$Matches[2]}}
 return $result
}
function Confirm-OwnedDatabase {
 param([string]$ContainerId,[string]$Owner)
 $label=Invoke-OwnedNative 'docker' @('inspect','--format','{{ index .Config.Labels "wordpairs.ui-harness" }}',$ContainerId)
 if($label.Trim() -cne $Owner){throw 'DatabaseOwnershipMismatch'}
}
function Get-CgroupSnapshot {
 param([string]$Path,[long]$ClockTicks)
 $cpu=[ordered]@{}
 foreach($line in (Get-Content -LiteralPath (Join-Path $Path 'cpu.stat'))){if($line -match '^(\S+)\s+(\d+)$'){$cpu[$Matches[1]]=[long]$Matches[2]}}
 $processes=[Collections.Generic.List[object]]::new();$vanished=0
 foreach($value in (Get-Content -LiteralPath (Join-Path $Path 'cgroup.procs')|Sort-Object -Unique)){
  if($value -notmatch '^\d+$'){throw 'InvalidOwnedCgroupPid'}
  try{
   $stat=[IO.File]::ReadAllText('/proc/'+$value+'/stat')
   $fields=($stat -replace '^\d+ \(.*\)\s+','') -split '\s+'
   $processes.Add([ordered]@{pid=[int]$value;startTicks=[long]$fields[19];state=$fields[0];cpuTicks=([long]$fields[11]+[long]$fields[12]);cpuSeconds=([double]$fields[11]+[double]$fields[12])/$ClockTicks;rssBytes=([long]$fields[21]*[Environment]::SystemPageSize)})
  }catch [IO.IOException]{$vanished++}
 }
 return [ordered]@{cpu=$cpu;memoryCurrentBytes=[long]([IO.File]::ReadAllText((Join-Path $Path 'memory.current')).Trim());processes=@($processes);vanishedDuringRead=$vanished}
}
function Add-ObserverError {
 param([string]$Stage,[string]$Kind)
 $errorsFound.Add([ordered]@{at=[DateTimeOffset]::Now.ToString('o');stage=$Stage;kind=$Kind})
}
if($ControlGroup.Contains('..')){throw 'ControlGroupTraversalRejected'}
$runtime=[IO.Path]::GetFullPath($RuntimeDirectory)
$expectedParent=Join-Path $workspace '.mcpServer'
if((Split-Path $runtime) -cne $expectedParent -or (Split-Path $runtime -Leaf) -notmatch '^ui-([0-9a-f]{32})$'){throw 'ExplicitOwnedUiDirectoryRequired'}
$owner=$Matches[1]
$manifestPath=[IO.Path]::GetFullPath($SourceManifest)
$output=[IO.Path]::GetFullPath($OutputDirectory)
if(-not $manifestPath.StartsWith(($workspace+'/docs/evidence/'),[StringComparison]::Ordinal)){throw 'SourceManifestMustBeWorkspaceEvidence'}
if(-not $output.StartsWith(($workspace+'/docs/evidence/'),[StringComparison]::Ordinal)){throw 'OutputMustBeWorkspaceEvidence'}
if(Test-Path -LiteralPath $output){throw 'FreshOutputDirectoryRequired'}
if(-not $PSCmdlet.ShouldProcess($UnitName,'Observe only explicit owned runtime cgroup and database until unit exits; create fresh safe evidence')){return}
$stopReason='not-started';$terminalUnit=$null;$sampleCount=0;$missedIntervals=0;$identityVerified=$false;$nativeFailure=$false
$sourceHash=$null;$databaseOwnerHash=$null;$initialUnit=$null;$clockTicks=0;$initialMainPid=$null;$samplerPids=@($PID)
$databaseRetiredAt=$null;$databaseRetirementReason=$null;$databaseRetiredIntervals=0
$paths=@{samples=(Join-Path $output 'samples.jsonl');result=(Join-Path $output 'observer.json')}
[void][IO.Directory]::CreateDirectory($output)
try{
 $manifest=Get-Content -Raw -LiteralPath $manifestPath|ConvertFrom-Json -Depth 100
 if($manifest.revision -cne $SourceHead -or -not $manifest.pathSetEqual -or $manifest.manifestCount -ne $manifest.expectedCount){throw 'SourceManifestBindingMismatch'}
 $sourceHash=(Get-FileHash -LiteralPath $manifestPath).Hash
 $head=(Invoke-OwnedNative 'git' @('-C',$workspace,'rev-parse','HEAD')).Trim()
 if($head -cne $SourceHead){throw 'SourceHeadMismatch'}
 foreach($pin in $manifest.sourceHashes){if((Get-FileHash -LiteralPath (Join-Path $workspace $pin.path)).Hash -ine $pin.sha256){throw 'SourceHashMismatch'}}
 $ownerPath=Join-Path $runtime 'database-owner.json'
 $databaseOwnerHash=(Get-FileHash -LiteralPath $ownerPath).Hash
 $databaseOwner=Get-Content -Raw -LiteralPath $ownerPath|ConvertFrom-Json
 if($databaseOwner.owner -cne $owner -or $databaseOwner.database -cne ('wordpairs_ui_'+$owner) -or $databaseOwner.containerId -notmatch '^[0-9a-f]{64}$'){throw 'DatabaseOwnerReceiptMismatch'}
 Confirm-OwnedDatabase $databaseOwner.containerId $owner
 $initialUnit=Get-OwnedUnit
 if($initialUnit.LoadState -ne 'loaded' -or $initialUnit.ActiveState -notin @('active','activating') -or $initialUnit.ControlGroup -cne $ControlGroup -or $initialUnit.InvocationID -cne $InvocationId -or [int]$initialUnit.MainPID -lt 1){throw 'UnitOwnershipMismatch'}
 $initialMainPid=$initialUnit.MainPID
 $cgroupRoot='/sys/fs/cgroup'+$ControlGroup
 if(-not (Test-Path -LiteralPath $cgroupRoot -PathType Container)){throw 'OwnedCgroupMissing'}
 if((Get-Content -LiteralPath (Join-Path $cgroupRoot 'cgroup.procs')) -notcontains $initialMainPid){throw 'UnitMainPidOutsideCgroup'}
 $clockTicks=[long](Invoke-OwnedNative 'getconf' @('CLK_TCK')).Trim()
 if($clockTicks -lt 1){throw 'InvalidProcessClockResolution'}
 $identityVerified=$true;$stopReason='observing'
 $sql=@'
select jsonb_build_object('sampledAt',clock_timestamp(),'database',current_database(),
'activity',(select coalesce(jsonb_agg(jsonb_build_object('pid',pid,'backendType',backend_type,'state',state,'waitType',wait_event_type,'waitEvent',wait_event,'queryAgeMs',case when state='active' then extract(epoch from(clock_timestamp()-query_start))*1000 end,'transactionAgeMs',extract(epoch from(clock_timestamp()-xact_start))*1000,'blockingPids',pg_blocking_pids(pid)) order by pid),'[]'::jsonb) from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid()),
'locks',(select coalesce(jsonb_agg(jsonb_build_object('pid',l.pid,'type',l.locktype,'mode',l.mode,'granted',l.granted,'relationOid',l.relation,'waitStart',l.waitstart) order by l.pid,l.locktype,l.mode),'[]'::jsonb) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.datname=current_database() and a.pid<>pg_backend_pid()));
'@
 $next=[DateTimeOffset]::Now;$priorMetrics=$null;$priorAt=$null
 while($true){
  $sampleStart=[DateTimeOffset]::Now
  $unit=Get-OwnedUnit
  if($unit.ActiveState -in @('inactive','failed') -or $unit.LoadState -eq 'not-found'){$terminalUnit=$unit;$stopReason='owned-unit-exited';break}
  if($unit.InvocationID -cne $InvocationId -or $unit.ControlGroup -cne $ControlGroup -or $unit.MainPID -cne $initialMainPid){throw 'UnitIdentityChanged'}
  if(-not $databaseRetiredAt){
   if(-not (Test-Path -LiteralPath $ownerPath -PathType Leaf)){$databaseRetiredAt=[DateTimeOffset]::Now.ToString('o');$databaseRetirementReason='Original owned runtime receipt disappeared; no successor discovery or DB sampling.'}
   elseif((Get-FileHash -LiteralPath $ownerPath).Hash -cne $databaseOwnerHash){throw 'DatabaseOwnerReceiptChanged'}
  }
  $metrics=$null;$postgres=$null;$sampleErrors=[Collections.Generic.List[string]]::new()
  try{
   $metrics=Get-CgroupSnapshot $cgroupRoot $clockTicks
   $metrics.cpuWindowSeconds=if($priorAt){($sampleStart-$priorAt).TotalSeconds}else{$null}
   $metrics.cpuCoreEquivalent=if($priorMetrics -and $metrics.cpuWindowSeconds -gt 0){($metrics.cpu.usage_usec-$priorMetrics.cpu.usage_usec)/1000000.0/$metrics.cpuWindowSeconds}else{$null}
   $priorMetrics=$metrics;$priorAt=$sampleStart
  }catch{$sampleErrors.Add('owned-cgroup-sample-unavailable');Add-ObserverError 'cgroup' 'SampleUnavailable'}
  $dbStarted=[DateTimeOffset]::Now
  if($databaseRetiredAt){$databaseRetiredIntervals++}else{try{
   Confirm-OwnedDatabase $databaseOwner.containerId $owner
   $dbText=Invoke-OwnedNative 'docker' @('exec','-i',$databaseOwner.containerId,'psql','-X','-q','-A','-t','-U','postgres','-d',$databaseOwner.database,'-v','ON_ERROR_STOP=1') $sql
   $postgres=$dbText|ConvertFrom-Json -Depth 100
   if($postgres.database -cne $databaseOwner.database){throw 'OwnedDatabaseIdentityMismatch'}
  }catch{$sampleErrors.Add('owned-postgres-sample-unavailable');Add-ObserverError 'postgres' 'SampleUnavailable'}}
  $finished=[DateTimeOffset]::Now
  $sample=[ordered]@{sequence=$sampleCount;scheduledAt=$next.ToString('o');startedAt=$sampleStart.ToString('o');finishedAt=$finished.ToString('o');latenessMs=[Math]::Max(0,($sampleStart-$next).TotalMilliseconds);overheadMs=($finished-$sampleStart).TotalMilliseconds;databaseReadMs=if($databaseRetiredAt){$null}else{($finished-$dbStarted).TotalMilliseconds};unitState=$unit.ActiveState;cgroup=$metrics;postgres=$postgres;databaseRetired=[bool]$databaseRetiredAt;errors=@($sampleErrors)}
  [IO.File]::AppendAllText($paths.samples,($sample|ConvertTo-Json -Compress -Depth 100)+[Environment]::NewLine)
  $sampleCount++;$next=$next.AddSeconds($IntervalSeconds)
  while($next -lt $finished){$missedIntervals++;$next=$next.AddSeconds($IntervalSeconds)}
  $delay=[int][Math]::Max(0,($next-[DateTimeOffset]::Now).TotalMilliseconds)
  if($delay){Start-Sleep -Milliseconds $delay}
 }
}catch{
 $nativeFailure=$true;$stopReason='observer-failed-or-ownership-changed'
 $known=@('SourceManifestBindingMismatch','SourceHeadMismatch','SourceHashMismatch','DatabaseOwnerReceiptMismatch','DatabaseOwnershipMismatch','UnitOwnershipMismatch','OwnedCgroupMissing','UnitMainPidOutsideCgroup','InvalidProcessClockResolution','UnitIdentityChanged','DatabaseOwnerReceiptChanged')
 $safeKind=if($_.Exception.Message -in $known){$_.Exception.Message}else{$_.Exception.GetType().FullName}
 Add-ObserverError 'observer' $safeKind
}finally{
 $manifestUnchanged=$false;$headUnchanged=$false
 try{$manifestUnchanged=(Get-FileHash -LiteralPath $manifestPath).Hash -ceq $sourceHash;$headUnchanged=(Invoke-OwnedNative 'git' @('-C',$workspace,'rev-parse','HEAD')).Trim() -ceq $SourceHead}catch{Add-ObserverError 'source-after' 'ReadUnavailable'}
 $receipt=[ordered]@{startedAt=$started.ToString('o');finishedAt=[DateTimeOffset]::Now.ToString('o');hostName=[Environment]::MachineName;runId=$RunId.ToString();sourceHead=$SourceHead;sourceManifest=$manifestPath;sourceManifestSha256=$sourceHash;manifestUnchanged=$manifestUnchanged;headUnchanged=$headUnchanged;unitName=$UnitName;systemdScope=$SystemdScope;controlGroup=$ControlGroup;invocationId=$InvocationId;initialUnit=$initialUnit;terminalUnit=$terminalUnit;runtimeDirectory=$runtime;runtimeOwner=$owner;databaseOwnerSha256=$databaseOwnerHash;ownershipInitiallyVerified=$identityVerified;samplerPids=$samplerPids;intervalSeconds=$IntervalSeconds;sampleCount=$sampleCount;missedIntervals=$missedIntervals;databaseRetiredAt=$databaseRetiredAt;databaseRetirementReason=$databaseRetirementReason;databaseRetiredIntervals=$databaseRetiredIntervals;stopReason=$stopReason;nativeInvocations=@($invocations);errors=@($errorsFound);samplesSha256=if(Test-Path $paths.samples){(Get-FileHash $paths.samples).Hash}else{$null};producerSha256=(Get-FileHash $PSCommandPath).Hash;limits=@('External operational sampling only; no tests, app/provider/DB/config mutations, SQL text, credentials, environment or process argv captured.','Cgroup/process cumulative CPU and RSS do not measure event-loop delay or prove saturation. Process CPU/RSS is sampled only for cgroup.procs membership, which may omit nested child cgroups. Docker PostgreSQL/Realtime container CPU outside that unit is not captured.','When original runtime owner receipt disappears, database sampling retires and stays retired; cgroup observation continues until unit exits and may include subsequent validation lanes. No successor runtime is discovered or queried.','PG wait/lock snapshots and query age do not measure pg-pool checkout wait, SQL execution duration or transient waits between samples. Null backend metadata/permission limits stay explicit.','Sampling itself adds docker/psql/backend and filesystem overhead. databaseReadMs includes docker startup and transport, not PostgreSQL execution alone.','Native helper process timeout15s bounds the observer subprocess only and is unrelated to HV; timed-out reads are missing samples.','Initial source file hashes are verified; final only HEAD and manifest hashes are checked. No full source immutability claim without separate replay provenance.','No numeric performance SLA or release/HV verdict is established. Exact per-command browser/server correlation remains separate.')}
 $receipt|ConvertTo-Json -Depth 100|Set-Content -LiteralPath $paths.result
}
if($nativeFailure -or -not $manifestUnchanged -or -not $headUnchanged -or $errorsFound.Count){throw 'Observer evidence is qualified or incomplete; inspect safe observer.json'}
Write-Output ('Observer receipt: '+$paths.result)
