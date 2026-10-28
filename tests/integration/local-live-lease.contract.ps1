$ErrorActionPreference='Stop'
$repo=Split-Path (Split-Path $PSScriptRoot)
$scratch=Join-Path ([IO.Path]::GetTempPath()) ('wordpairs-lease-test-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $scratch|Out-Null
$calls=@{network=0;container=0;process=0}

function Invoke-RestMethod { $calls.network++; throw 'An obsolete lease must not access endpoint management' }
function docker { $calls.container++; throw 'An obsolete lease must not access containers' }
function Start-Sleep {
    $replacement=@{startedAtUtc='replacement';expiresAtUtc=[DateTimeOffset]::UtcNow.AddMinutes(1).ToString('o');origin='https://replacement.test';state='running'}
    $replacement|ConvertTo-Json|Set-Content (Join-Path $scratch 'local-live-lease.json')
    @{owner='replacement';status='running'}|ConvertTo-Json|Set-Content (Join-Path $scratch 'local-realtime-state.json')
}
try {
    $runtime=Join-Path $scratch 'runtime.json'
    '{}'|Set-Content $runtime
    @{startedAtUtc='original';expiresAtUtc=[DateTimeOffset]::UtcNow.AddMinutes(1).ToString('o');origin='https://original.test';state='running'}|ConvertTo-Json|Set-Content (Join-Path $scratch 'local-live-lease.json')
    @{owner='original';status='running';gatewayId=('a'*64);databaseId=('b'*64);realtimeId=('c'*64)}|ConvertTo-Json|Set-Content (Join-Path $scratch 'local-realtime-state.json')
    & (Join-Path $repo 'scripts/run-local-live-lease.ps1') -RuntimePath $runtime
    $lease=Get-Content (Join-Path $scratch 'local-live-lease.json') -Raw|ConvertFrom-Json
    $state=Get-Content (Join-Path $scratch 'local-realtime-state.json') -Raw|ConvertFrom-Json
    if($calls.network -or $calls.container -or $lease.state -ne 'running' -or $state.owner -ne 'replacement' -or $state.status -ne 'running'){throw 'An obsolete lease touched replacement resources'}
    Write-Output 'PASS: replacement lease and runtime preserved; no network/container/process cleanup attempted'
    function Invoke-RestMethod { [pscustomobject]@{url='https://unrelated.test';upstream=@{url='http://unrelated'}} }
    function docker { $calls.container++; $global:LASTEXITCODE=0; if($args[0] -eq 'inspect'){'original'} }
    $calls.process=0
    function Get-Process { $calls.process++; if($calls.process -eq 1){[pscustomobject]@{Id=999999999}} }
    @{startedAtUtc='original';expiresAtUtc=[DateTimeOffset]::UtcNow.AddMinutes(-1).ToString('o');origin='https://original.test';endpointName='owned';upstream='http://owned';state='running'}|ConvertTo-Json|Set-Content (Join-Path $scratch 'local-live-lease.json')
    @{owner='original';status='running';gatewayId=('a'*64);databaseId=('b'*64);realtimeId=('c'*64)}|ConvertTo-Json|Set-Content (Join-Path $scratch 'local-realtime-state.json')
    @{pid=999999999;startToken='1'}|ConvertTo-Json|Set-Content (Join-Path $scratch 'local-live-worker-process.json')
    & (Join-Path $repo 'scripts/run-local-live-lease.ps1') -RuntimePath $runtime
    $lease=Get-Content (Join-Path $scratch 'local-live-lease.json') -Raw|ConvertFrom-Json
    if($calls.container -ne 6 -or $calls.process -ne 2 -or $lease.state -ne 'closed'){throw "Vanished process regression: containerCalls=$calls.container processCalls=$calls.process state=$($lease.state) failures=$($lease.cleanupFailures -join ',')"}
    Write-Output 'PASS: process disappearance during identity check does not interrupt remaining container cleanup'
} finally {Remove-Item $scratch -Recurse -Force}
