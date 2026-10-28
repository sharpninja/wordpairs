# Local TR-31 verification. No ports, credentials, or data from external services are used.
param([string]$ContainerName = ('wordpairs-verification-' + [guid]::NewGuid().ToString('N').Substring(0,10)),[switch]$Realtime,[switch]$Multiplayer,[switch]$Administration)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$createdContainerId = $null
$createdRealtimeId = $null

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
    $portOptions = @('-p','127.0.0.1::5432')
    $databaseOptions = @()
    if ($Realtime) { $portOptions += @('-p','127.0.0.1::4000') }
    if ($Realtime) { $databaseOptions = @('-c','wal_level=logical','-c','max_replication_slots=10') }
    $created = & docker run --detach --name $ContainerName @portOptions -e POSTGRES_PASSWORD=wordpairs-local-test -e POSTGRES_DB=wordpairs 'postgres:17-alpine@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b' @databaseOptions
    if ($LASTEXITCODE -ne 0) { throw 'Could not start disposable test database' }
    $createdContainerId = "$created".Trim()
    if ($createdContainerId -notmatch '^[0-9a-f]{64}$') { $createdContainerId=$null; throw 'Unexpected container identity' }
    $ready = $false
    for ($attempt=0; $attempt -lt 120; $attempt++) {
        & docker exec $ContainerName pg_isready -h 127.0.0.1 -U postgres -d wordpairs *> $null
        if ($LASTEXITCODE -eq 0) { $ready=$true; break }
        Start-Sleep -Milliseconds 250
    }
    if (-not $ready) { & docker logs --tail 30 $createdContainerId;throw 'Disposable database did not become ready' }
    Invoke-TestSql 'create role anon; create role authenticated; create role service_role;'
    foreach ($migration in (Get-ChildItem (Join-Path $repoRoot 'src/infrastructure/migrations') -Filter '*.sql' | Sort-Object Name)) { Invoke-TestSql (Get-Content $migration.FullName -Raw) }
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
        try {
            $testFiles = @()
            if ($Multiplayer) { $testFiles = @('tests/integration/multiplayer.integration.ts') }
            if ($Administration) { $testFiles = @('tests/integration/admin.integration.ts') }
            & npm exec vitest -- run --config vitest.postgres.config.ts @testFiles
            if ($LASTEXITCODE -ne 0) { throw 'Real adapter integration tests failed' }
            if ($Realtime) {
                Invoke-TestSql "create role supabase_admin superuser login password 'wordpairs-local-test'; create role dashboard_user nologin; grant anon,authenticated,service_role to supabase_admin with admin option; create schema _realtime; create schema auth; alter role service_role bypassrls; create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claims'',true)::jsonb->>''sub'','''')::uuid'; create function auth.jwt() returns jsonb language sql stable as 'select current_setting(''request.jwt.claims'',true)::jsonb';"
                $fixtureSecret = 'wordpairs-local-realtime-fixture-secret-at-least-32-characters'
                $realtimeCreated = & docker run --detach --rm --name "${ContainerName}-realtime" --network "container:$createdContainerId" -e PORT=4000 -e DB_HOST=127.0.0.1 -e DB_PORT=5432 -e DB_USER=postgres -e DB_PASSWORD=wordpairs-local-test -e DB_NAME=wordpairs -e 'DB_AFTER_CONNECT_QUERY=SET search_path TO _realtime' -e DB_ENC_KEY=1234567890123456 -e "API_JWT_SECRET=$fixtureSecret" -e "METRICS_JWT_SECRET=$fixtureSecret" -e SECRET_KEY_BASE=wordpairs-local-test-only-secret-key-base-that-is-longer-than-sixty-four-characters -e APP_NAME=realtime -e SEED_SELF_HOST=true -e SELF_HOST_TENANT_NAME=realtime-dev -e RUN_JANITOR=true -e 'DNS_NODES=' -e 'ERL_AFLAGS=+S 2:2 -proto_dist inet_tcp' -e RLIMIT_NOFILE=10000 'supabase/realtime:v2.143.3@sha256:768b559241dd234c4e8852c5c0f504e598b80f1df2ad4dd78d5486fbed2f17a2'
                if ($LASTEXITCODE -ne 0) { throw 'Could not start disposable Realtime' }
                $createdRealtimeId="$realtimeCreated".Trim()
                if ($createdRealtimeId -notmatch '^[0-9a-f]{64}$') { $createdRealtimeId=$null;throw 'Unexpected Realtime identity' }
                $realtimeReady=$false
                for($attempt=0;$attempt -lt 120;$attempt++) {
                    $exists=Invoke-TestSql "select to_regclass('realtime.messages') is not null;"
                    if("$exists" -eq 't') {
                        # The seed process installs tables before the actual HTTP server starts.
                        $httpStatus=& docker exec $createdRealtimeId curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:4000/api/tenants/realtime-dev/health
                        if($LASTEXITCODE -eq 0 -and "$httpStatus" -match '^[1-5][0-9]{2}$'){$realtimeReady=$true;break}
                    }
                    if($attempt -gt 0 -and $attempt%10 -eq 0) { $failedSeed=& docker logs --tail 250 $createdRealtimeId 2>&1 | Select-String 'Failed to set-up tenant:'; if($failedSeed){break} }
                    Start-Sleep -Milliseconds 500
                }
                if(-not $realtimeReady) { $logPath=Join-Path ([IO.Path]::GetTempPath()) "$ContainerName-realtime.log"; & docker logs $createdRealtimeId 2>&1 | Set-Content $logPath; "Realtime diagnostics: $logPath"; Get-Content $logPath | Select-String -Pattern 'error|failed|exception|undefined' -Context 2,4;throw 'Realtime tenant did not initialize' }
                Invoke-TestSql (Get-Content (Join-Path $repoRoot 'src/infrastructure/realtime-policy.sql') -Raw)
                $realtimeBinding=& docker port $createdContainerId 4000/tcp
                $realtimePort=($realtimeBinding -split ':')[-1]
                $priorRealtimeUrl=$env:WORDPAIRS_TEST_REALTIME_URL;$priorRealtimeSecret=$env:WORDPAIRS_TEST_REALTIME_JWT_SECRET
                try {
                    $env:WORDPAIRS_TEST_REALTIME_URL="http://127.0.0.1:$realtimePort"
                    $env:WORDPAIRS_TEST_REALTIME_JWT_SECRET=$fixtureSecret
                    & npm exec vitest -- run --config vitest.realtime.config.ts
                    if($LASTEXITCODE -ne 0){$logPath=Join-Path ([IO.Path]::GetTempPath()) "$ContainerName-realtime.log";& docker logs $createdRealtimeId 2>&1 | Set-Content $logPath;"Realtime diagnostics: $logPath";Get-Content $logPath | Select-String -Pattern 'error_code=|Failed' -Context 0,4;throw 'Real Realtime transport integration failed'}
                }finally{$env:WORDPAIRS_TEST_REALTIME_URL=$priorRealtimeUrl;$env:WORDPAIRS_TEST_REALTIME_JWT_SECRET=$priorRealtimeSecret}
            }
        }
        finally { Pop-Location }
    } finally { $env:WORDPAIRS_TEST_DATABASE_URL = $priorTestUrl }
    'PASS: TR-31 migration, direct-role denial, canonical retry/conflict, durable outbox, rollback fault, and concurrent final-seat checks'
} finally {
    if ($createdRealtimeId) { & docker rm --force $createdRealtimeId *> $null }
    if ($createdContainerId) { & docker rm --force $createdContainerId *> $null }
}
