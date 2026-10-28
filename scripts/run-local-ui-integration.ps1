# Real browser/API/TLS PostgreSQL/private WebSocket integration. No HTTP fixtures.
param(
    [string]$RuntimePath,
    [string]$BrowserPath=$env:WORDPAIRS_BROWSER_PATH,
    [string]$ScratchRoot,
    [string]$PlayerCounts='2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25',
    [ValidateRange(1,2)][int]$Workers=1,
    [ValidateRange(1,120)][int]$MaxMinutes=90,
    [int]$TlsPort=3443,[int]$GatewayPort=3004,[int]$AppPort=3005,
    [switch]$StrictPush,
    [switch]$HeartbeatBody
)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot
$owner=[Guid]::NewGuid().ToString('N')
$dbName='wordpairs_ui_'+$owner
$local=Join-Path $repo ('.mcpServer/ui-'+$owner)
$scratchParent=if($ScratchRoot){(Resolve-Path $ScratchRoot).Path}elseif((Get-Item $repo).Parent.Name -eq '.mcpServer'){(Get-Item $repo).Parent.Parent.FullName}else{$repo}
$scratch=Join-Path $scratchParent ('.wpu-'+$owner.Substring(0,8))
$children=[Collections.Generic.List[object]]::new()
$databaseId=$null
$localCreated=$false; $scratchCreated=$false
$isolatedDatabase=$false; $databaseTlsVerified=$false
$durabilitySettingsVerified=$false; $volatileStorageVerified=$false
$exitCode=1; $cleanupErrors=[Collections.Generic.List[string]]::new()
$until=[DateTimeOffset]::UtcNow.AddMinutes($MaxMinutes)
$evidence=Join-Path $repo 'docs/evidence/room-sync'
function Private-File($Path,$Content) { [IO.File]::WriteAllText($Path,$Content); & chmod 600 $Path; if($LASTEXITCODE -ne 0){throw 'Private file permissions failed'} }
function Random-Secret { [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant() }
function Sql([string]$Database,[string]$Text) {
    $result=$Text | & docker exec -i $databaseId psql -U postgres -d $Database -v ON_ERROR_STOP=1 -At 2> (Join-Path $local 'sql-error.log')
    if($LASTEXITCODE -ne 0){throw 'Isolated UI database command failed'}
    return "$result".Trim()
}
function Start-Child([string]$Name,[string]$Executable,[string[]]$Arguments,[hashtable]$Environment=@{}) {
    $info=[Diagnostics.ProcessStartInfo]::new($Executable)
    $info.UseShellExecute=$false; $info.WorkingDirectory=$repo
    $info.RedirectStandardOutput=$true; $info.RedirectStandardError=$true
    foreach($a in $Arguments){$info.ArgumentList.Add($a)}
    foreach($entry in $Environment.GetEnumerator()){$info.Environment[$entry.Key]=[string]$entry.Value}
    $process=[Diagnostics.Process]::Start($info)
    $item=@{name=$Name;process=$process;startToken=$null;streams=@();copies=@()}
    $children.Add($item)
    $item.startToken=(([IO.File]::ReadAllText('/proc/'+$process.Id+'/stat') -replace '^.*\)\s+','') -split '\s+')[19]
    $out=[IO.File]::Open((Join-Path $local ($Name+'.stdout.log')),[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite)
    $err=[IO.File]::Open((Join-Path $local ($Name+'.stderr.log')),[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite)
    $item.streams=@($out,$err)
    $item.copies=@($process.StandardOutput.BaseStream.CopyToAsync($out),$process.StandardError.BaseStream.CopyToAsync($err))
    return $item
}
function Stop-Child($Child) {
    $p=$Child.process
    if(-not $p.HasExited) {
        $token=(([IO.File]::ReadAllText('/proc/'+$p.Id+'/stat') -replace '^.*\)\s+','') -split '\s+')[19]
        if($token -ne $Child.startToken){throw 'Owned process identity changed; refusing cleanup'}
        $p.Kill($true)
        if(-not $p.WaitForExit(30000)){throw 'Owned process did not stop'}
    }
    foreach($copy in $Child.copies){$null=$copy.GetAwaiter().GetResult()}
    foreach($stream in $Child.streams){$stream.Dispose()}
}
try {
    Set-Location $repo
    if(-not(Test-Path '.next/BUILD_ID')){throw 'Build the production application before starting the harness'}
    if($StrictPush -and $HeartbeatBody){throw 'Select either the strict game or heartbeat regression'}
    if(-not $BrowserPath){$BrowserPath=(Get-Command chromium -ErrorAction Stop).Source}
    if(-not(Test-Path $BrowserPath -PathType Leaf)){throw 'An installed browser executable is required'}
    $settings=if($RuntimePath){Get-Content (Resolve-Path $RuntimePath) -Raw | ConvertFrom-Json -AsHashtable}else{@{WORDPAIRS_INVITE_SECRET=(Random-Secret)}}
    if($PlayerCounts -notmatch '^(?:[2-9]|1[0-9]|2[0-5])(?:,(?:[2-9]|1[0-9]|2[0-5]))*$'){throw 'Invalid player-count matrix'}
    New-Item $local -ItemType Directory | Out-Null; $localCreated=$true; & chmod 700 $local
    New-Item $scratch -ItemType Directory | Out-Null; $scratchCreated=$true; & chmod 700 $scratch
    $cert=Join-Path $local 'localhost.crt'; $key=Join-Path $local 'localhost.key'
    & openssl req -x509 -newkey rsa:2048 -nodes -keyout $key -out $cert -days 1 -subj '/CN=127.0.0.1' -addext 'subjectAltName=IP:127.0.0.1,DNS:localhost' *> (Join-Path $local 'openssl.log')
    if($LASTEXITCODE -ne 0){throw 'Loopback test certificate generation failed'}
    & chmod 600 $key $cert
    $pgEnv=Join-Path $local 'game-postgres.env'
    Private-File $pgEnv ("POSTGRES_PASSWORD="+(Random-Secret)+"`nPOSTGRES_DB=$dbName`n")
    $created=& docker run --detach --name ('wordpairs-ui-game-'+$owner) --label ('wordpairs.ui-harness='+$owner) --tmpfs '/var/lib/postgresql/data:rw,size=512m,mode=0700' -p '127.0.0.1::5432' --env-file $pgEnv 'postgres:17-alpine@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b' -c max_wal_size=128MB -c min_wal_size=32MB
    if($LASTEXITCODE -ne 0 -or "$created".Trim() -notmatch '^[0-9a-f]{64}$'){throw 'Owned game PostgreSQL did not start'}
    $databaseId="$created".Trim()
    Private-File (Join-Path $local 'database-owner.json') (@{owner=$owner;database=$dbName;containerId=$databaseId} | ConvertTo-Json)
    $ready=$false
    for($i=0;$i -lt 120;$i++){& docker exec $databaseId pg_isready -h 127.0.0.1 -U postgres -d $dbName *> $null; if($LASTEXITCODE -eq 0){$ready=$true;break};Start-Sleep -Milliseconds 250}
    if(-not $ready){throw 'Owned game PostgreSQL did not initialize'}
    if((Sql $dbName 'select current_database();') -ne $dbName){throw 'Isolated database identity mismatch'}
    $isolatedDatabase=$true
    # Stream directly into the running tmpfs mount; never print private PEM data.
    foreach($file in @(@{source=$cert;target='/var/lib/postgresql/data/server.crt'},@{source=$key;target='/var/lib/postgresql/data/server.key'})) {
        Get-Content $file.source -Raw | & docker exec -i $databaseId sh -c 'set -eu; umask 077; cat > "$1"; chown postgres:postgres "$1"; chmod 600 "$1"' sh $file.target
        if($LASTEXITCODE -ne 0){throw 'Game database certificate installation/permissions failed'}
    }
    Sql $dbName "alter system set ssl_cert_file='/var/lib/postgresql/data/server.crt'; alter system set ssl_key_file='/var/lib/postgresql/data/server.key'; alter system set ssl='on'; select pg_reload_conf();" | Out-Null
    $tlsReady=$false
    for($i=0;$i -lt 40;$i++){if((Sql $dbName 'show ssl;') -eq 'on'){$tlsReady=$true;break};Start-Sleep -Milliseconds 100}
    if(-not $tlsReady){throw 'Game database TLS did not enable'}
    if((Sql $dbName "select current_setting('fsync'),current_setting('synchronous_commit');") -ne 'on|on'){throw 'Game database durability settings were weakened'}
    $durabilitySettingsVerified=$true
    $tmpfs=& docker inspect $databaseId --format '{{ index .HostConfig.Tmpfs "/var/lib/postgresql/data" }}'
    if($LASTEXITCODE -ne 0 -or "$tmpfs" -ne 'rw,size=512m,mode=0700'){throw 'Game database test storage configuration mismatch'}
    $volatileStorageVerified=$true
    $servicePassword=Random-Secret
    Sql $dbName ("create role anon; create role authenticated; create role service_role login password '$servicePassword';") | Out-Null
    foreach($migration in (Get-ChildItem (Join-Path $repo 'src/infrastructure/migrations') -Filter '*.sql' | Sort-Object Name)){Sql $dbName (Get-Content $migration.FullName -Raw) | Out-Null}
    $binding=& docker port $databaseId 5432/tcp
    if($LASTEXITCODE -ne 0 -or "$binding" -notmatch '^127\.0\.0\.1:[0-9]+$'){throw 'Game database is not loopback-only'}
    $dbPort=[int]("$binding".Split(':')[-1])
    $settings.WORDPAIRS_DATABASE_URL="postgresql://service_role:${servicePassword}@localhost:$dbPort/$dbName"
    $settings.WORDPAIRS_DATABASE_CA=Get-Content $cert -Raw
    $inputPath=Join-Path $local 'input-runtime.json'
    Private-File $inputPath ($settings | ConvertTo-Json -Depth 10)
    & node (Join-Path $PSScriptRoot 'verify-local-ui-db.mjs') $inputPath $dbName
    if($LASTEXITCODE -ne 0){throw 'Application database TLS/identity preflight failed'}
    $databaseTlsVerified=$true
    $origin='https://127.0.0.1:'+$TlsPort
    & (Join-Path $PSScriptRoot 'start-local-realtime.ps1') -RuntimePath $inputPath -Origin $origin -GatewayPort $GatewayPort -AppPort $AppPort -VolatileTestStorage
    $livePath=Join-Path $local 'live-runtime.json'
    $childEnv=@{NODE_EXTRA_CA_CERTS=$cert}
    $null=Start-Child 'app' 'pwsh' @('-NoProfile','-File',(Join-Path $PSScriptRoot 'run-local-app.ps1'),'-RuntimePath',$livePath,'-Port',"$AppPort") $childEnv
    $null=Start-Child 'tls' 'node' @((Join-Path $PSScriptRoot 'run-local-tls.mjs'),$cert,$key,"$TlsPort","$GatewayPort")
    $ready=$false
    for($i=0;$i -lt 120;$i++) {
        if(@($children | Where-Object {$_.process.HasExited}).Count){throw 'An owned runtime child exited during startup'}
        try {$r=Invoke-WebRequest ($origin+'/play') -SkipCertificateCheck -TimeoutSec 2 -SkipHttpErrorCheck; if($r.StatusCode -eq 200){$ready=$true;break}}catch{}
        Start-Sleep -Milliseconds 500
    }
    if(-not $ready){throw 'Private real UI runtime did not become ready'}
    $null=Start-Child 'worker' 'pwsh' @('-NoProfile','-File',(Join-Path $PSScriptRoot 'run-local-scheduler.ps1'),'-RuntimePath',$livePath,'-Port',"$AppPort",'-UntilUtc',$until.ToString('o'))
    $testEnv=@{NODE_EXTRA_CA_CERTS=$cert;WORDPAIRS_LIVE_ORIGIN=$origin;WORDPAIRS_LIVE_LOCAL_TLS='1';WORDPAIRS_LIVE_RUNTIME_PATH=$livePath;WORDPAIRS_LIVE_PLAYER_COUNTS=$PlayerCounts;WORDPAIRS_BROWSER_PATH=$BrowserPath;TMPDIR=$scratch}
    $spec=if($StrictPush){'live-multiplayer.integration.spec.ts'}elseif($HeartbeatBody){'heartbeat.integration.spec.ts'}else{'live-player-counts.integration.spec.ts'}
    $test=Start-Child 'playwright' 'npm' @('run','test:live-ui','--',$spec,'--output=test-results/live-local',"--workers=$Workers",'--fully-parallel','--max-failures=1') $testEnv
    Write-Output ('Private real UI integration started; counts='+$PlayerCounts+'; bounded until '+$until.ToString('o'))
    while(-not $test.process.HasExited) {
        if([DateTimeOffset]::UtcNow -ge $until){throw 'Private integration lifetime expired'}
        Start-Sleep -Seconds 1
    }
    $exitCode=$test.process.ExitCode
} finally {
    [IO.Directory]::CreateDirectory($evidence) | Out-Null
    if($localCreated -and (Test-Path (Join-Path $local 'local-scheduler-status.json'))) {
        Copy-Item (Join-Path $local 'local-scheduler-status.json') (Join-Path $evidence 'live-local-scheduler-final.json')
    }
    # Publishers stop before dropping the only database they may drain.
    foreach($child in @($children.ToArray())[-1..(-$children.Count)] | Where-Object {$_}) {
        try {Stop-Child $child}catch{$cleanupErrors.Add('Could not confirm stopped child: '+$child.name)}
    }
    # Startup may have created resources before throwing, including a failed
    # cleanup attempt. Its state receipt must survive even without a success return.
    if($localCreated -and (Test-Path (Join-Path $local 'local-realtime-state.json'))) {
        try {
            $state=Get-Content (Join-Path $local 'local-realtime-state.json') -Raw | ConvertFrom-Json
            if($state.databaseId -match '^[0-9a-f]{64}$') {
                $label=& docker inspect $state.databaseId --format '{{ index .Config.Labels "wordpairs.local-live" }}' 2>&1
                if($LASTEXITCODE -eq 0 -and "$label".Trim() -eq $state.owner){& docker exec $state.databaseId sh -c 'df -k /var/lib/postgresql/data; du -sk /var/lib/postgresql/data/pg_wal' 2>&1 | Set-Content (Join-Path $evidence 'live-local-realtime-storage.log')}
            }
        }catch{Set-Content (Join-Path $evidence 'live-local-realtime-storage.log') 'Storage diagnostics unavailable; cleanup status recorded separately'}
        try {& (Join-Path $PSScriptRoot 'start-local-realtime.ps1') -RuntimePath $inputPath -Origin $origin -Stop}catch{$cleanupErrors.Add('Owned Realtime cleanup failed')}
    }
    if($databaseId -and $cleanupErrors.Count -eq 0) {
        try {
            $receipt=Get-Content (Join-Path $local 'database-owner.json') -Raw | ConvertFrom-Json
            if($dbName -notmatch '^wordpairs_ui_[0-9a-f]{32}$' -or $receipt.owner -ne $owner -or $receipt.database -ne $dbName -or $receipt.containerId -ne $databaseId){throw 'Database ownership receipt mismatch'}
            $ids=& docker container ls --all --no-trunc --filter ('id='+$databaseId) --format '{{.ID}}' 2>&1
            if($LASTEXITCODE -ne 0){throw 'Game container existence check failed'}
            if(@($ids | Where-Object {"$_".Trim() -eq $databaseId}).Count) {
                $label=& docker inspect $databaseId --format '{{ index .Config.Labels "wordpairs.ui-harness" }}' 2>&1
                if($LASTEXITCODE -ne 0 -or "$label".Trim() -ne $owner){throw 'Game container ownership mismatch'}
                $usage=& docker exec $databaseId sh -c 'df -k /var/lib/postgresql/data; du -sk /var/lib/postgresql/data/pg_wal' 2>&1
                $usage | Set-Content (Join-Path $evidence 'live-local-game-storage.log')
                & docker rm --force $databaseId *> $null
                if($LASTEXITCODE -ne 0){throw 'Owned game container removal failed'}
                $remaining=& docker container ls --all --no-trunc --filter ('id='+$databaseId) --format '{{.ID}}' 2>&1
                if($LASTEXITCODE -ne 0 -or @($remaining | Where-Object {"$_".Trim() -eq $databaseId}).Count){throw 'Owned game container removal unconfirmed'}
            }
        }catch{$cleanupErrors.Add('Isolated database cleanup failed')}
    }
    New-Item $evidence -ItemType Directory -Force | Out-Null
    foreach($kind in @('stdout','stderr')) {
        $log=Join-Path $local ('playwright.'+$kind+'.log')
        if($localCreated -and (Test-Path $log)){$text=Get-Content $log -Raw; $text=$text -replace '(wp_session=)[A-Za-z0-9_-]+','$1[redacted-test-session]'; Set-Content (Join-Path $evidence ('live-local-'+$kind+'.log')) $text}
    }
    $sqlLog=Join-Path $local 'sql-error.log'
    if($localCreated -and (Test-Path $sqlLog)){$text=Get-Content $sqlLog -Raw; if($servicePassword){$text="$text".Replace($servicePassword,'[redacted-test-role-password]')}; Set-Content (Join-Path $evidence 'live-local-database-errors.log') $text}
    @{owner=$owner;origin=('https://127.0.0.1:'+$TlsPort);players=$PlayerCounts;strictPush=[bool]$StrictPush;heartbeatBody=[bool]$HeartbeatBody;exitCode=$exitCode;isolatedGameDatabase=$isolatedDatabase;databaseTlsVerified=$databaseTlsVerified;durabilitySettingsVerified=$durabilitySettingsVerified;volatileTestStorageVerified=$volatileStorageVerified;powerLossDurabilityProven=$false;httpFixtures=$false;cleanupErrors=@($cleanupErrors);finishedAtUtc=[DateTimeOffset]::UtcNow.ToString('o')} | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $evidence 'live-local-harness.json')
    if($localCreated -and $cleanupErrors.Count -eq 0 -and (Test-Path $local)){Remove-Item $local -Recurse -Force}elseif($localCreated){Write-Warning 'Owned resources require cleanup; private ownership directory retained'}
    if($scratchCreated -and $cleanupErrors.Count -eq 0 -and (Test-Path $scratch)){Remove-Item $scratch -Recurse -Force}
}
if($cleanupErrors.Count){throw 'Private integration cleanup incomplete'}
exit $exitCode
