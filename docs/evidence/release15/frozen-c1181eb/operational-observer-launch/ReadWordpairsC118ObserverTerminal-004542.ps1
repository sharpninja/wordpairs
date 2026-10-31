[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Checkpoint','Terminal')][string]$Operation='Checkpoint')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$directory='<repo>/docs/evidence/release15/frozen-c1181eb'
$launchPath=Join-Path $directory 'operational-observer-launch/launch.json'
if(-not (Test-Path -LiteralPath $launchPath)){Write-Output 'WAIT: actual observer launch receipt absent';return}
$launch=Get-Content -LiteralPath $launchPath -Raw|ConvertFrom-Json -Depth 100
$observerPath=Join-Path $directory 'operational-observer/observer.json'
$samplesPath=Join-Path $directory 'operational-observer/samples.jsonl'
if(-not (Test-Path -LiteralPath $samplesPath)){Write-Output 'WAIT: first optional observation absent';return}
if($Operation -eq 'Terminal' -and -not (Test-Path -LiteralPath $observerPath)){Write-Output 'WAIT: observer not terminal';return}
$samples=@(Get-Content -LiteralPath $samplesPath|ForEach-Object {$_|ConvertFrom-Json -Depth 100})
$target=Join-Path $directory ('operational-observer-launch/'+$Operation.ToLowerInvariant()+'-readback.json')
if(Test-Path -LiteralPath $target){throw 'Preserve prior observer readback'}
$record=[ordered]@{recordedAt=[DateTimeOffset]::Now.ToString('o');sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261031T004542Z-c118-observer-terminal';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';kind=$Operation;launch=@{path=$launchPath;sha256=(Get-FileHash -LiteralPath $launchPath).Hash};sourceHead=$launch.parameters.SourceHead;groupRunId=$launch.parameters.RunId;runtime=$launch.runtimeAssociation.runtime;producerSha256=$launch.producerSha256;samples=@{path=$samplesPath;sha256=(Get-FileHash -LiteralPath $samplesPath).Hash;lines=$samples.Count;pgPresent=@($samples|Where-Object {$null -ne $_.postgres}).Count;pgMissing=@($samples|Where-Object {$null -eq $_.postgres}).Count;cgroupPresent=@($samples|Where-Object {$null -ne $_.cgroup}).Count;explicitSampleErrors=@($samples|Where-Object {@($_.errors).Count -gt 0}).Count;lastSequence=$samples[-1].sequence;lastSampleFinishedAt=$samples[-1].finishedAt;overheadMs=@($samples|ForEach-Object overheadMs)};terminal=$null;qualification='Optional operational observations only. Checkpoint is a partial snapshot and does not establish terminal completeness. PG metadata missing is not zero activity, cgroup samples exclude external Docker CPU and cannot measure pool checkout/event-loop delay or attribute browser timings/409 to a server cause. No new test, app/provider/config change, acceptance SLA or independent HV.'}
if(Test-Path -LiteralPath $observerPath){
 $observer=Get-Content -LiteralPath $observerPath -Raw|ConvertFrom-Json -Depth 100
 $record.terminal=[pscustomobject]@{path=$observerPath;sha256=(Get-FileHash -LiteralPath $observerPath).Hash;ownershipInitiallyVerified=$observer.ownershipInitiallyVerified;stopReason=$observer.stopReason;sampleCount=$observer.sampleCount;missedIntervals=$observer.missedIntervals;databaseRetiredAt=$observer.databaseRetiredAt;databaseRetirementReason=$observer.databaseRetirementReason;databaseRetiredIntervals=$observer.databaseRetiredIntervals;headUnchanged=$observer.headUnchanged;manifestUnchanged=$observer.manifestUnchanged;errors=$observer.errors;nativeInvocations=@($observer.nativeInvocations).Count;nativeFailedOrTimedOut=@($observer.nativeInvocations|Where-Object {$_.exitCode -ne 0 -or $_.timedOut});limits=$observer.limits}
 if($Operation -eq 'Terminal' -and ($observer.sampleCount -ne $samples.Count -or $observer.samplesSha256 -cne (Get-FileHash -LiteralPath $samplesPath).Hash)){throw 'Terminal observer/sample identity mismatch'}
}
if(-not $PSCmdlet.ShouldProcess($target,'Retain safe optional observation snapshot without new runtime/DB reads or acceptance assertions')){return}
$record|ConvertTo-Json -Depth 100|Set-Content -LiteralPath $target
[pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;kind=$Operation;sampleCount=$samples.Count;pgPresent=$record.samples.pgPresent;pgMissing=$record.samples.pgMissing;explicitSampleErrors=$record.samples.explicitSampleErrors;terminal=$record.terminal}|ConvertTo-Json -Depth 30
