# Fault injection only: fake sibling launcher and Docker; no real services touched.
$ErrorActionPreference='Stop'
$repo=Split-Path (Split-Path $PSScriptRoot)
$scratch=Join-Path ([IO.Path]::GetTempPath()) ('wp-ui-startup-'+[Guid]::NewGuid().ToString('N'))
$fixture=@{sqlCalls=0;dropped=$false;collisionMode='';collisionPath='';startMode='partial';gamePresent=$false;owner='';gameRemoved=$false}
New-Item (Join-Path $scratch 'scripts'),(Join-Path $scratch '.next'),(Join-Path $scratch 'src/infrastructure/migrations') -ItemType Directory -Force | Out-Null
'fixture' | Set-Content (Join-Path $scratch '.next/BUILD_ID')
Copy-Item (Join-Path $repo 'scripts/run-local-ui-integration.ps1') (Join-Path $scratch 'scripts/')
@'
param([string]$RuntimePath,[string]$Origin,[int]$GatewayPort,[int]$AppPort,[switch]$Stop)
$local=Split-Path $RuntimePath
if($fixture.startMode -like 'game-*'){throw 'Injected failure before broker startup'}
if($Stop){throw 'Injected cleanup failure'}
@{owner='fixture';status='cleanup-incomplete';gatewayId=('a'*64);realtimeId=('b'*64);databaseId=('c'*64)} | ConvertTo-Json | Set-Content (Join-Path $local 'local-realtime-state.json')
throw 'Injected partial startup failure'
'@ | Set-Content (Join-Path $scratch 'scripts/start-local-realtime.ps1')
function docker {
    $global:LASTEXITCODE=0
    if($args[0] -eq 'run') {
        $labelIndex=[Array]::IndexOf([object[]]$args,'--label')
        $fixture.owner=([string]$args[$labelIndex+1]).Split('=')[1]
        $fixture.gamePresent=$true; $fixture.gameRemoved=$false
        return ('d'*64)
    }
    if($args[0] -eq 'inspect') {
        if("$args" -like '*HostConfig.Tmpfs*'){return 'rw,size=512m,mode=0700'}
        if("$args" -like '*wordpairs.local-live*'){return 'fixture'}
        if($fixture.startMode -eq 'game-inspect-failure'){$global:LASTEXITCODE=1;return 'injected inspect error'}
        if($fixture.startMode -eq 'game-owner-mismatch'){return 'unrelated'}
        return $fixture.owner
    }
    if($args[0] -eq 'cp'){return}
    if($args[0] -eq 'container') {
        if($fixture.startMode -eq 'game-already-absent'){$fixture.gamePresent=$false}
        if($fixture.gamePresent){return ('d'*64)}
        return
    }
    if($args[0] -eq 'rm') {
        if($fixture.startMode -eq 'game-rm-failure'){$global:LASTEXITCODE=1;return}
        $fixture.gamePresent=$false; $fixture.gameRemoved=$true; return
    }
    if($args[0] -eq 'port'){return '127.0.0.1:55555'}
    if($args[0] -ne 'exec'){throw 'Unexpected mocked Docker command'}
    $sql=@($input) -join "`n"; $fixture.sqlCalls++
    if($sql -match 'drop database'){$fixture.dropped=$true;throw 'Must retain isolated database after unconfirmed service cleanup'}
    if($sql -match 'select current_database') {
        $index=[Array]::IndexOf([object[]]$args,'-d'); return [string]$args[$index+1]
    }
    if($sql -match 'show ssl'){return 'on'}
    if($sql -match 'current_setting'){return 'on|on'}
}
function node { $global:LASTEXITCODE=0 }
function openssl {
    $keyIndex=[Array]::IndexOf([object[]]$args,'-keyout'); $certIndex=[Array]::IndexOf([object[]]$args,'-out')
    'fake test key' | Set-Content ([string]$args[$keyIndex+1]); 'fake test cert' | Set-Content ([string]$args[$certIndex+1])
    $global:LASTEXITCODE=0
}
function New-Item {
    param([string]$Path,[string]$ItemType,[switch]$Force)
    $leaf=Split-Path $Path -Leaf
    if(($fixture.collisionMode -eq 'local' -and $leaf -like 'ui-*') -or ($fixture.collisionMode -eq 'scratch' -and $leaf -like '.wpu-*')) {
        $fixture.collisionPath=$Path
        [IO.Directory]::CreateDirectory($Path) | Out-Null
        [IO.File]::WriteAllText((Join-Path $Path 'pre-existing-sentinel'),'preserve')
        throw 'Injected pre-existing directory collision'
    }
    Microsoft.PowerShell.Management\New-Item -Path $Path -ItemType $ItemType -Force:$Force
}
$originalLocation=Get-Location
try {
    $runtime=Join-Path $scratch 'runtime.json'
    @{WORDPAIRS_DATABASE_URL='postgresql://fixture:fixture@localhost:55555/original';WORDPAIRS_DATABASE_CA='fixture'} | ConvertTo-Json | Set-Content $runtime
    $failed=$false
    try {& (Join-Path $scratch 'scripts/run-local-ui-integration.ps1') -RuntimePath $runtime -BrowserPath $runtime -PlayerCounts '2' -MaxMinutes 1}catch{$failed=$true}
    $directories=@(Get-ChildItem (Join-Path $scratch '.mcpServer') -Directory -Filter 'ui-*')
    $receipt=Get-Content (Join-Path $scratch 'docs/evidence/room-sync/live-local-harness.json') -Raw | ConvertFrom-Json
    if(-not $failed -or $directories.Count -ne 1 -or $receipt.cleanupErrors.Count -ne 1 -or $fixture.dropped){throw 'Partial startup failure erased unresolved cleanup ownership'}
    foreach($name in @('database-owner.json','input-runtime.json','local-realtime-state.json')){if(-not(Test-Path (Join-Path $directories[0].FullName $name))){throw "Missing retained recovery file: $name"}}
    $state=Get-Content (Join-Path $directories[0].FullName 'local-realtime-state.json') -Raw | ConvertFrom-Json
    if($state.status -ne 'cleanup-incomplete'){throw 'Unresolved state was rewritten'}
    # The retained browser scratch is inside this uniquely owned fake repository.
    Write-Output 'PASS: partial Realtime startup plus cleanup failure retains all ownership files and isolated database'
    foreach($mode in @('game-rm-failure','game-inspect-failure','game-owner-mismatch','game-already-absent','game-success')) {
        $fixture.startMode=$mode; $failed=$false
        try {& (Join-Path $scratch 'scripts/run-local-ui-integration.ps1') -RuntimePath $runtime -BrowserPath $runtime -PlayerCounts '2' -MaxMinutes 1}catch{$failed=$true}
        $receipt=Get-Content (Join-Path $scratch 'docs/evidence/room-sync/live-local-harness.json') -Raw | ConvertFrom-Json
        $local=Join-Path $scratch ('.mcpServer/ui-'+$receipt.owner)
        if(-not $failed){throw 'Injected startup failure was hidden'}
        if($mode -in @('game-success','game-already-absent')) {
            if($receipt.cleanupErrors.Count -or (Test-Path $local) -or $fixture.gamePresent){throw "Owned game cleanup did not confirm absence: $mode"}
        } else {
            if($receipt.cleanupErrors.Count -ne 1 -or -not(Test-Path (Join-Path $local 'database-owner.json')) -or -not $fixture.gamePresent){throw "Owned game cleanup failure erased recovery: $mode"}
        }
        Write-Output "PASS: owned game database $mode"
    }
    foreach($mode in @('local','scratch')) {
        $fixture.collisionMode=$mode; $fixture.collisionPath=''; $failed=$false
        try {& (Join-Path $scratch 'scripts/run-local-ui-integration.ps1') -RuntimePath $runtime -BrowserPath $runtime -PlayerCounts '2' -MaxMinutes 1}catch{$failed=$true}
        if(-not $failed -or -not $fixture.collisionPath -or (Get-Content (Join-Path $fixture.collisionPath 'pre-existing-sentinel') -Raw) -ne 'preserve'){throw "Runner deleted a pre-existing $mode directory"}
        Write-Output "PASS: pre-existing $mode directory survives startup collision"
    }
} finally {Set-Location $originalLocation; Remove-Item $scratch -Recurse -Force}
