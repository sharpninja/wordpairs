param(
    [Parameter(Mandatory)][string]$RuntimePath,
    [Parameter(Mandatory)][string]$Origin,
    [int]$GatewayPort=3002,
    [int]$AppPort=3003,
    [switch]$VolatileTestStorage,
    [switch]$Stop
)
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot
$local=Split-Path (Resolve-Path $RuntimePath)
$statePath=Join-Path $local 'local-realtime-state.json'
if($Stop) {
    if(Test-Path $statePath) {
        $old=Get-Content $statePath -Raw | ConvertFrom-Json
        $failures=[Collections.Generic.List[string]]::new()
        function Container-Exists([string]$Id) {
            $ids=& docker container ls --all --no-trunc --filter ('id='+$Id) --format '{{.ID}}' 2>&1
            if($LASTEXITCODE -ne 0){throw 'Could not confirm owned container existence'}
            return @($ids | Where-Object {"$_".Trim() -eq $Id}).Count -eq 1
        }
        foreach($id in @($old.gatewayId,$old.realtimeId,$old.databaseId)) {
            if(-not $id){continue}
            try {
                if($id -notmatch '^[0-9a-f]{64}$'){throw 'Invalid recorded container identity'}
                if(-not (Container-Exists $id)){continue}
                $owner=& docker inspect --format '{{ index .Config.Labels "wordpairs.local-live" }}' $id 2>&1
                if($LASTEXITCODE -ne 0){if(-not (Container-Exists $id)){continue};throw 'Could not inspect owned container'}
                if("$owner".Trim() -ne $old.owner){throw 'Container ownership mismatch'}
                & docker rm --force $id *> $null
                if($LASTEXITCODE -ne 0 -or (Container-Exists $id)){throw 'Owned container removal unconfirmed'}
            }catch{$failures.Add('Owned service cleanup unconfirmed: '+$id)}
        }
        $old.status=if($failures.Count){'cleanup-incomplete'}else{'stopped'}
        $old | Add-Member -NotePropertyName cleanupFailures -NotePropertyValue @($failures) -Force
        $old | ConvertTo-Json -Depth 5 | Set-Content $statePath
        if($failures.Count){throw 'Owned Realtime cleanup incomplete; ownership/configuration retained'}
    }
    return
}
if(([Uri]$Origin).Scheme -ne 'https'){throw 'A public HTTPS origin is required for this phone runtime'}
if(Test-Path $statePath) {
    $old=Get-Content $statePath -Raw | ConvertFrom-Json
    if($old.status -ne 'stopped'){throw 'Owned local Realtime is not confirmed stopped; reconcile its recorded resources before replacement'}
}
$settings=Get-Content $RuntimePath -Raw | ConvertFrom-Json -AsHashtable
$owner=[Guid]::NewGuid().ToString('N').Substring(0,12)
$state=[ordered]@{owner=$owner;status='starting';databaseId=$null;realtimeId=$null;gatewayId=$null;origin=$Origin;gatewayPort=$GatewayPort;appPort=$AppPort;runtimePath=(Join-Path $local 'live-runtime.json')}
function Save-State { $state | ConvertTo-Json -Depth 5 | Set-Content $statePath }
function Random-Secret([int]$Count=32){[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes($Count)).ToLowerInvariant()}
function Private-File($Path,$Content) { [IO.File]::WriteAllText($Path,$Content); & chmod 600 $Path; if($LASTEXITCODE -ne 0){throw 'Could not protect local private configuration'} }
function Start-OwnedContainer([string[]]$Arguments) {
    $id=& docker run --detach --label "wordpairs.local-live=$owner" @Arguments
    if($LASTEXITCODE -ne 0 -or "$id".Trim() -notmatch '^[0-9a-f]{64}$'){throw 'Could not start owned local live service'}
    return "$id".Trim()
}
function Sql([string]$Text) {
    $result=$Text | & docker exec -i $state.databaseId psql -U postgres -d postgres -v ON_ERROR_STOP=1 -At
    if($LASTEXITCODE -ne 0){throw 'Realtime internal database setup failed'}
    return $result
}
function Jwt([string]$Role,[string]$Secret) {
    $header=@{alg='HS256';typ='JWT'} | ConvertTo-Json -Compress
    $payload=@{role=$Role;exp=[DateTimeOffset]::UtcNow.AddDays(2).ToUnixTimeSeconds()} | ConvertTo-Json -Compress
    $parts=@($header,$payload) | ForEach-Object {[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_)).TrimEnd('=').Replace('+','-').Replace('/','_')}
    $body=$parts -join '.'
    $hmac=[Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($Secret))
    try {$signature=[Convert]::ToBase64String($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body))).TrimEnd('=').Replace('+','-').Replace('/','_')} finally {$hmac.Dispose()}
    return "$body.$signature"
}
Save-State
try {
    $password=Random-Secret; $jwt=Random-Secret
    $pgEnv=Join-Path $local 'realtime-postgres.env'
    Private-File $pgEnv "POSTGRES_PASSWORD=$password`nPOSTGRES_DB=postgres`n"
    $storageOptions=if($VolatileTestStorage){@('--tmpfs','/var/lib/postgresql/data:rw,size=512m,mode=0700')}else{@()}
    $walOptions=if($VolatileTestStorage){@('-c','max_wal_size=128MB','-c','min_wal_size=32MB')}else{@()}
    $state.databaseId=Start-OwnedContainer (@('--name',"wordpairs-live-db-$owner",'-p','127.0.0.1::5432','-p','127.0.0.1::4000','--env-file',$pgEnv)+$storageOptions+@('postgres:17-alpine@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b','-c','wal_level=logical','-c','max_replication_slots=10')+$walOptions)
    Save-State
    $ready=$false
    for($i=0;$i -lt 120;$i++){ & docker exec $state.databaseId pg_isready -h 127.0.0.1 -U postgres *> $null; if($LASTEXITCODE -eq 0){$ready=$true;break};Start-Sleep -Milliseconds 250 }
    if(-not $ready){throw 'Realtime internal database did not start'}
    if($VolatileTestStorage) {
        $tmpfs=& docker inspect $state.databaseId --format '{{ index .HostConfig.Tmpfs "/var/lib/postgresql/data" }}'
        if($LASTEXITCODE -ne 0 -or "$tmpfs" -ne 'rw,size=512m,mode=0700' -or (Sql "select current_setting('fsync'),current_setting('synchronous_commit');") -ne 'on|on'){throw 'Realtime test storage/durability settings verification failed'}
        $state['volatileTestStorageVerified']=$true; Save-State
    }
    Sql "create role anon; create role authenticated; create role service_role bypassrls; create role supabase_admin superuser login password '$password'; create role dashboard_user nologin; grant anon,authenticated,service_role to supabase_admin with admin option; create schema _realtime; create schema auth; create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claims'',true)::jsonb->>''sub'','''')::uuid'; create function auth.jwt() returns jsonb language sql stable as 'select current_setting(''request.jwt.claims'',true)::jsonb';" | Out-Null
    $rtEnv=Join-Path $local 'realtime-service.env'
    $environment=@{PORT='4000';DB_HOST='127.0.0.1';DB_PORT='5432';DB_USER='postgres';DB_PASSWORD=$password;DB_NAME='postgres';DB_AFTER_CONNECT_QUERY='SET search_path TO _realtime';DB_ENC_KEY=(Random-Secret 8);API_JWT_SECRET=$jwt;METRICS_JWT_SECRET=$jwt;SECRET_KEY_BASE=(Random-Secret 48);APP_NAME='realtime';SEED_SELF_HOST='true';SELF_HOST_TENANT_NAME='realtime-dev';RUN_JANITOR='true';DNS_NODES='';ERL_AFLAGS='+S 2:2 -proto_dist inet_tcp';RLIMIT_NOFILE='10000'}
    Private-File $rtEnv (($environment.GetEnumerator() | ForEach-Object { $_.Key+'='+$_.Value }) -join "`n")
    $state.realtimeId=Start-OwnedContainer @('--name',"wordpairs-live-realtime-$owner",'--network',('container:'+$state.databaseId),'--env-file',$rtEnv,'supabase/realtime:v2.143.3@sha256:768b559241dd234c4e8852c5c0f504e598b80f1df2ad4dd78d5486fbed2f17a2')
    Save-State
    $ready=$false
    for($i=0;$i -lt 120;$i++) {
        $exists=Sql "select to_regclass('realtime.messages') is not null;"
        if("$exists" -eq 't') {
            $status=& docker exec $state.realtimeId curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:4000/api/tenants/realtime-dev/health
            if($LASTEXITCODE -eq 0 -and "$status" -match '^[1-5][0-9]{2}$'){$ready=$true;break}
        }
        Start-Sleep -Milliseconds 500
    }
    if(-not $ready){throw 'Local Realtime tenant did not initialize; inspect owned container diagnostics privately'}
    Sql (Get-Content (Join-Path $repo 'src/infrastructure/realtime-policy.sql') -Raw) | Out-Null
    $binding=& docker port $state.databaseId 4000/tcp
    $rtPort=[int]("$binding".Split(':')[-1])
    $state['realtimePort']=$rtPort
    $caddy=@"
{
    admin off
    auto_https off
}
http://:$GatewayPort {
    bind 127.0.0.1
    @websocket path /realtime/v1/websocket
    handle @websocket {
        rewrite * /socket/websocket
        reverse_proxy 127.0.0.1:$rtPort {
            header_up Host realtime-dev.localhost
        }
    }
    @broadcast path /realtime/v1/api/broadcast
    handle @broadcast {
        rewrite * /api/broadcast
        reverse_proxy 127.0.0.1:$rtPort {
            header_up Host realtime-dev.localhost
        }
    }
    handle /realtime/* {
        respond 404
    }
    handle {
        reverse_proxy 127.0.0.1:$AppPort
    }
}
"@
    $caddyPath=Join-Path $local 'Realtime.Caddyfile'
    [IO.File]::WriteAllText($caddyPath,$caddy)
    & docker run --rm --network none -v ($caddyPath+':/etc/caddy/Caddyfile:ro') 'caddy:2.10.0-alpine@sha256:ae4458638da8e1a91aafffb231c5f8778e964bca650c8a8cb23a7e8ac557aa3c' caddy validate --config /etc/caddy/Caddyfile *> $null
    if($LASTEXITCODE -ne 0){throw 'Local live gateway configuration validation failed'}
    $state.gatewayId=Start-OwnedContainer @('--name',"wordpairs-live-gateway-$owner",'--network','host','--read-only','-v',($caddyPath+':/etc/caddy/Caddyfile:ro'),'caddy:2.10.0-alpine@sha256:ae4458638da8e1a91aafffb231c5f8778e964bca650c8a8cb23a7e8ac557aa3c')
    $settings.WORDPAIRS_SUPABASE_URL=$Origin
    $settings.WORDPAIRS_SUPABASE_ANON_KEY=Jwt 'anon' $jwt
    $settings.WORDPAIRS_SUPABASE_SERVICE_KEY=Jwt 'service_role' $jwt
    $settings.WORDPAIRS_SUPABASE_JWT_SECRET=$jwt
    $settings.WORDPAIRS_SCHEDULER_SECRET=Random-Secret
    $settings.WORDPAIRS_ORIGIN=$Origin
    Private-File $state.runtimePath ($settings | ConvertTo-Json -Depth 10)
    $state.status='running'; Save-State
    Write-Output ('Owned local Realtime ready; gateway127.0.0.1:'+ $GatewayPort +'; app port'+$AppPort+'. No private settings printed.')
} catch {
    Save-State
    & $PSCommandPath -RuntimePath $RuntimePath -Origin $Origin -Stop
    throw
}
