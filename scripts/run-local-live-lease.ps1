param([Parameter(Mandatory)][string]$RuntimePath)
$ErrorActionPreference='Stop'
$local=Split-Path $RuntimePath
$path=Join-Path $local 'local-live-lease.json'
$lease=Get-Content $path -Raw | ConvertFrom-Json
$until=[DateTimeOffset]::Parse($lease.expiresAtUtc)
$generation=$lease.startedAtUtc
$statePath=Join-Path $local 'local-realtime-state.json'
$owned=Get-Content $statePath -Raw | ConvertFrom-Json
$processes=@('local-live-worker-process.json','local-live-app-process.json') | ForEach-Object {
    $file=Join-Path $local $_
    if(Test-Path $file){Get-Content $file -Raw | ConvertFrom-Json}
}
function Is-CurrentLease {
    if(-not(Test-Path $path)){return $false}
    $current=Get-Content $path -Raw | ConvertFrom-Json
    return $current.startedAtUtc -eq $generation -and $current.origin -eq $lease.origin
}
try {
    while([DateTimeOffset]::UtcNow -lt $until){
        if(-not(Is-CurrentLease)){return}
        Start-Sleep -Seconds 1
    }
} finally {
    # A renewed lease owns its own runtime. An obsolete watcher must never stop it.
    if(Is-CurrentLease){
    $failures=[Collections.Generic.List[string]]::new()
    try {
        $api='http://127.0.0.1:4040/api/endpoints/'+[Uri]::EscapeDataString($lease.endpointName)
        $endpoint=Invoke-RestMethod $api -TimeoutSec 10
        if($endpoint.url -eq $lease.origin -and $endpoint.upstream.url -eq $lease.upstream){Invoke-RestMethod $api -Method Delete -TimeoutSec 10 | Out-Null}
    } catch {
        if($_.Exception.Response.StatusCode.value__ -ne 404){$failures.Add('endpoint cleanup unconfirmed')}
    }
    foreach($identity in $processes) {
        try {
            $process=Get-Process -Id $identity.pid -ErrorAction SilentlyContinue
            if($process -and $identity.startToken){
                $token=(([IO.File]::ReadAllText('/proc/'+$identity.pid+'/stat') -replace '^.*\)\s+','') -split '\s+')[19]
                if($token -eq $identity.startToken){$process.Kill($true)}
            }
        } catch {
            # The worker can exit at this same deadline between identity checks.
            # A disappeared process is already stopped; other failures must not
            # prevent the remaining captured resources from being cleaned up.
            if(Get-Process -Id $identity.pid -ErrorAction SilentlyContinue){$failures.Add('owned process cleanup unconfirmed')}
        }
    }
    foreach($id in @($owned.gatewayId,$owned.realtimeId,$owned.databaseId)) {
        if($id -notmatch '^[0-9a-f]{64}$'){continue}
        $owner=& docker inspect --format '{{ index .Config.Labels "wordpairs.local-live" }}' $id 2>$null
        if($LASTEXITCODE -eq 0 -and "$owner".Trim() -eq $owned.owner){
            & docker rm --force $id *> $null
            if($LASTEXITCODE -ne 0){$failures.Add('owned container cleanup unconfirmed')}
        } else {
            $failures.Add('container ownership or absence unconfirmed')
        }
    }
    $currentOwned=Get-Content $statePath -Raw | ConvertFrom-Json
    if($currentOwned.owner -eq $owned.owner){$currentOwned.status=if($failures.Count){'cleanup-incomplete'}else{'stopped'};$currentOwned|ConvertTo-Json -Depth 5|Set-Content $statePath}
    $lease.state=if($failures.Count){'cleanup-incomplete'}else{'closed'}
    $lease|Add-Member -NotePropertyName cleanupFailures -NotePropertyValue @($failures) -Force
    $lease | Add-Member -NotePropertyName closedAtUtc -NotePropertyValue ([DateTimeOffset]::UtcNow.ToString('o')) -Force
    $lease | ConvertTo-Json | Set-Content $path
    }
}
