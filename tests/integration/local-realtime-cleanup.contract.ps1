$ErrorActionPreference='Stop'
$repo=Split-Path (Split-Path $PSScriptRoot)
$scratch=Join-Path ([IO.Path]::GetTempPath()) ('wordpairs-stop-test-'+[Guid]::NewGuid().ToString('N'))
New-Item $scratch -ItemType Directory | Out-Null
$runtime=Join-Path $scratch 'runtime.json'; '{}' | Set-Content $runtime
$fixture=@{mode='';present=@{};calls=0;removed=[Collections.Generic.List[string]]::new()}
function docker {
    $fixture.calls++
    $global:LASTEXITCODE=0
    if($args[0] -eq 'container') {
        if($fixture.mode -eq 'daemon-failure'){$global:LASTEXITCODE=1;return 'daemon unavailable'}
        $id=([string]$args[5]).Substring(3)
        if($fixture.present.ContainsKey($id)){$id}
    } elseif($args[0] -eq 'inspect') {
        $id=[string]$args[-1]
        if($id -eq ('a'*64) -and $fixture.mode -eq 'inspect-failure'){$global:LASTEXITCODE=1;return 'inspect failed'}
        if($id -eq ('a'*64) -and $fixture.mode -eq 'owner-mismatch'){return 'unrelated'}
        'owned-test'
    } elseif($args[0] -eq 'rm') {
        $id=[string]$args[-1]
        if($id -eq ('a'*64) -and $fixture.mode -eq 'rm-failure'){$global:LASTEXITCODE=1;return}
        $fixture.removed.Add($id); $fixture.present.Remove($id)
    } else {throw 'Unexpected mocked Docker command'}
}
try {
    foreach($mode in @('inspect-failure','rm-failure','daemon-failure','owner-mismatch','success','already-absent')) {
        $fixture.mode=$mode; $fixture.present=@{}; $fixture.removed.Clear()
        if($mode -ne 'already-absent'){foreach($letter in @('a','b','c')){$fixture.present[($letter*64)]=$true}}
        @{owner='owned-test';status='running';gatewayId=('a'*64);realtimeId=('b'*64);databaseId=('c'*64)} | ConvertTo-Json | Set-Content (Join-Path $scratch 'local-realtime-state.json')
        $failed=$false
        try {& (Join-Path $repo 'scripts/start-local-realtime.ps1') -RuntimePath $runtime -Origin 'https://127.0.0.1:3443' -Stop}catch{$failed=$true}
        $state=Get-Content (Join-Path $scratch 'local-realtime-state.json') -Raw | ConvertFrom-Json
        if($mode -in @('success','already-absent')) {
            if($failed -or $state.status -ne 'stopped' -or $fixture.present.Count){throw "Successful cleanup failed: $mode"}
        } else {
            if(-not $failed -or $state.status -ne 'cleanup-incomplete' -or -not $state.cleanupFailures.Count -or -not $fixture.present.ContainsKey(('a'*64))){throw "Cleanup failure was hidden: $mode"}
            if($mode -ne 'daemon-failure' -and $fixture.removed.Count -ne 2){throw 'Failure interrupted remaining owned-service cleanup'}
            $fixture.calls=0; $restartRejected=$false
            try {& (Join-Path $repo 'scripts/start-local-realtime.ps1') -RuntimePath $runtime -Origin 'https://127.0.0.1:3443'}catch{$restartRejected=$true}
            $retained=Get-Content (Join-Path $scratch 'local-realtime-state.json') -Raw | ConvertFrom-Json
            if(-not $restartRejected -or $fixture.calls -ne 0 -or $retained.status -ne 'cleanup-incomplete'){throw 'Restart overwrote retained cleanup ownership'}
        }
        Write-Output "PASS: owned Realtime cleanup $mode"
    }
} finally {Remove-Item $scratch -Recurse -Force}
