# Local TR-31 verification. No ports, credentials, or data from external services are used.
param([string]$ContainerName = 'wordpairs-phase1-verification')
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$createdContainerId = $null

function Invoke-TestSql([string]$Sql) {
    $result = $Sql | & docker exec -i $ContainerName psql -U postgres -d wordpairs -v ON_ERROR_STOP=1 -At
    if ($LASTEXITCODE -ne 0) { throw 'Database test command failed' }
    return $result
}
function Start-TestSql([string]$Sql) {
    $info = [Diagnostics.ProcessStartInfo]::new('docker')
    $info.UseShellExecute = $false
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    foreach ($argument in @('exec','-i',$ContainerName,'psql','-U','postgres','-d','wordpairs','-v','ON_ERROR_STOP=1','-At')) { $info.ArgumentList.Add($argument) }
    $process = [Diagnostics.Process]::Start($info)
    $process.StandardInput.WriteLine($Sql)
    $process.StandardInput.Close()
    return $process
}

try {
    $created = & docker run --detach --rm --name $ContainerName -p '127.0.0.1::5432' -e POSTGRES_PASSWORD=wordpairs-local-test -e POSTGRES_DB=wordpairs 'postgres:17-alpine@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b'
    if ($LASTEXITCODE -ne 0) { throw 'Could not start disposable test database' }
    $createdContainerId = "$created".Trim()
    if ($createdContainerId -notmatch '^[0-9a-f]{64}$') { $createdContainerId=$null; throw 'Unexpected container identity' }
    $ready = $false
    for ($attempt=0; $attempt -lt 60; $attempt++) {
        & docker exec $ContainerName pg_isready -h 127.0.0.1 -U postgres -d wordpairs *> $null
        if ($LASTEXITCODE -eq 0) { $ready=$true; break }
        Start-Sleep -Milliseconds 250
    }
    if (-not $ready) { throw 'Disposable database did not become ready' }
    Invoke-TestSql 'create role anon; create role authenticated; create role service_role;'
    Invoke-TestSql (Get-Content (Join-Path $repoRoot 'src/infrastructure/migrations/001_foundation.sql') -Raw)
    Invoke-TestSql (Get-Content (Join-Path $PSScriptRoot 'phase1-contract.sql') -Raw)

    # Exercise actual unprivileged sessions, not merely catalog grant inspection.
    foreach ($role in @('anon','authenticated')) {
        $denied = Start-TestSql "set role $role; select * from wordpairs.aggregates;"
        $denied.WaitForExit()
        $reason = $denied.StandardError.ReadToEnd()
        if ($denied.ExitCode -eq 0 -or $reason -notmatch 'permission denied') { throw "Private read was not denied for $role" }
        $denied.Dispose()
    }
    Invoke-TestSql "set role service_role; select public.wordpairs_snapshot('room','r1','p1','c1','digest',4)->>'status'; reset role;"

    Invoke-TestSql @'
insert into wordpairs.profiles(id,identity_kind,alias,icon,public_leaderboard) values
('p1','guest','Player Oak','owl',false),('p2','guest','Player Elm','owl',false),('p3','guest','Player Pine','owl',false);
insert into wordpairs.rooms(id,capacity,status,code_digest,creator_id) values ('capacity-room',2,'waiting','test-code-digest','p1');
insert into wordpairs.room_members(room_id,profile_id,membership_kind,roster_position) values ('capacity-room','p1','player',1);
'@
    $sqlA = "begin; insert into wordpairs.room_members(room_id,profile_id,membership_kind,roster_position) values ('capacity-room','p2','player',2); select pg_sleep(0.3); commit;"
    $sqlB = "begin; insert into wordpairs.room_members(room_id,profile_id,membership_kind,roster_position) values ('capacity-room','p3','player',2); commit;"
    $a = Start-TestSql $sqlA
    $b = Start-TestSql $sqlB
    $a.WaitForExit(); $b.WaitForExit()
    $aError = $a.StandardError.ReadToEnd(); $bError = $b.StandardError.ReadToEnd()
    $winnerCount = @($a.ExitCode,$b.ExitCode | Where-Object { $_ -eq 0 }).Count
    if ($winnerCount -ne 1 -or "$aError $bError" -notmatch 'capacity exceeded') { throw "Final-seat race failed: $aError $bError" }
    $a.Dispose(); $b.Dispose()
    $count = Invoke-TestSql "select count(*) from wordpairs.room_members where room_id='capacity-room';"
    if ($count[-1] -ne '2' -and "$count" -ne '2') { throw "Capacity exceeded: $count" }
    $portBinding = & docker port $ContainerName 5432/tcp
    $localPort = ($portBinding -split ':')[-1]
    $priorTestUrl = $env:WORDPAIRS_TEST_DATABASE_URL
    try {
        $env:WORDPAIRS_TEST_DATABASE_URL = "postgresql://postgres:wordpairs-local-test@127.0.0.1:${localPort}/wordpairs"
        Push-Location $repoRoot
        try { & npm exec vitest -- run --config vitest.postgres.config.ts; if ($LASTEXITCODE -ne 0) { throw 'Real adapter integration tests failed' } }
        finally { Pop-Location }
    } finally { $env:WORDPAIRS_TEST_DATABASE_URL = $priorTestUrl }
    'PASS: TR-31 migration, direct-role denial, canonical retry/conflict, durable outbox, rollback fault, and concurrent final-seat checks'
} finally {
    if ($createdContainerId) { & docker rm --force $createdContainerId *> $null }
}
