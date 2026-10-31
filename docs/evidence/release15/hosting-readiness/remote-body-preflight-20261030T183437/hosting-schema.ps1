#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][ValidateSet('staging','production')][string]$Environment,
    [ValidateSet('plan','status','apply')][string]$Mode='plan',
    [string]$History,
    [string]$Config,
    [string]$ConfirmProject
)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'HostingSchemaPlanner.psm1') -Force
$targets=@{
    staging=@{ref='jshjkaigwbxsbnnogfxs';vercel='wordpairs';origin='https://wordpairs.vercel.app'}
    production=@{ref='krdcuuhcynmdfcjlpbsf';vercel='wordpairs-j9jf';origin='https://wordpairs-j9jf.vercel.app'}
}
$target=$targets[$Environment]
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).ProviderPath
$migrations=@(Get-HostingSchemaMigrationCatalog -Root $root)

function Invoke-PrivatePsql {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Sql,[Parameter(Mandatory)][uri]$DatabaseUri,[Parameter(Mandatory)][securestring]$Password,[string]$CaPath)
    $processInfo=[Diagnostics.ProcessStartInfo]::new('psql')
    foreach($argument in @('-X','-A','-t','-v','ON_ERROR_STOP=1','-h',$DatabaseUri.Host,'-p','5432','-U',([uri]::UnescapeDataString($DatabaseUri.UserInfo.Split(':')[0])),'-d','postgres')){
        $processInfo.ArgumentList.Add([string]$argument)
    }
    $processInfo.UseShellExecute=$false
    $processInfo.RedirectStandardInput=$true
    $processInfo.RedirectStandardOutput=$true
    $processInfo.RedirectStandardError=$true
    $passwordPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    try{$processInfo.Environment['PGPASSWORD']=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)}
    finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)}
    $processInfo.Environment['PGSSLMODE']='verify-full'
    $processInfo.Environment['PGCONNECT_TIMEOUT']='5'
    $processInfo.Environment['PGOPTIONS']='-c statement_timeout=60000'
    if($CaPath){$processInfo.Environment['PGSSLROOTCERT']=$CaPath}
    $process=[Diagnostics.Process]::Start($processInfo)
    try{
        $process.StandardInput.WriteLine($Sql)
        $process.StandardInput.Close()
        $stdout=$process.StandardOutput.ReadToEnd()
        $stderr=$process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if($process.ExitCode -ne 0){throw "psql returned exit code $($process.ExitCode); inspect private diagnostics. $(if($stderr -match 'certificate'){'TLS certificate verification failed.'})"}
        return $stdout.Trim()
    } finally {$process.Dispose()}
}

if($Mode -eq 'plan'){
    $recorded=if($History){@([IO.File]::ReadAllText((Resolve-Path -LiteralPath $History).ProviderPath)|ConvertFrom-Json)}else{@()}
    $pending=@(Get-HostingSchemaPending -Migrations $migrations -History @($recorded))
    [pscustomobject]@{
        environment=$Environment;ref=$target.ref;vercel=$target.vercel;origin=$target.origin
        migrations=@(Get-HostingSchemaSummary -Migrations $pending)
        publicMapping=@{SUPABASE_URL='WORDPAIRS_SUPABASE_URL';SUPABASE_ANON_KEY='WORDPAIRS_SUPABASE_ANON_KEY'}
        serverOnlyFallbacks=@('SUPABASE_SERVICE_ROLE_KEY','SUPABASE_JWT_SECRET')
        requiredPrivateSettings=@('WORDPAIRS_DATABASE_URL','WORDPAIRS_INVITE_SECRET','WORDPAIRS_SCHEDULER_SECRET','WORDPAIRS_ORIGIN')
        next='Inspect schema/history; use supported Supabase apply_migration in this order, removing outer transaction wrappers. Fallback status/apply requires private -Config and exact -ConfirmProject.'
    }|ConvertTo-Json -Depth 8
    return
}

if(-not $Config -or $ConfirmProject -cne $target.ref){throw 'Private -Config and exact -ConfirmProject are required.'}
$privateConfig=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $Config).ProviderPath)|ConvertFrom-Json
if(-not $privateConfig.ADMIN_DATABASE_URL){throw 'Private configuration lacks ADMIN_DATABASE_URL.'}
$url=[uri]$privateConfig.ADMIN_DATABASE_URL
$userInfo=$url.UserInfo.Split(':',2)
$user=[uri]::UnescapeDataString($userInfo[0])
if($userInfo.Count -ne 2 -or $user -cne ('postgres.'+$target.ref) -or $url.Host -notmatch '^aws-\d+-us-east-1\.pooler\.supabase\.com$' -or $url.Port -ne 5432 -or $url.AbsolutePath -cne '/postgres' -or $url.Query -or $url.Fragment){
    throw 'Admin session connection does not match the allowlisted project, session port, and database.'
}
$password=[Security.SecureString]::new()
foreach($character in [uri]::UnescapeDataString($userInfo[1]).ToCharArray()){$password.AppendChar($character)}
$password.MakeReadOnly()
$caPath=$null
if($privateConfig.DATABASE_CA){
    $caPath=Join-Path ([IO.Path]::GetTempPath()) ('wordpairs-schema-ca-'+[guid]::NewGuid().ToString('N')+'.crt')
    [IO.File]::WriteAllText($caPath,[string]$privateConfig.DATABASE_CA,[Text.Encoding]::ASCII)
}
try{
    $historySql='select coalesce(json_agg(row_to_json(m) order by m.version),''[]''::json)::text from (select version,name,statements from supabase_migrations.schema_migrations) m;'
    $historyText=Invoke-PrivatePsql -Sql $historySql -DatabaseUri $url -Password $password -CaPath $caPath
    $recorded=@($historyText|ConvertFrom-Json)
    $pending=@(Get-HostingSchemaPending -Migrations $migrations -History @($recorded))
    [pscustomobject]@{mode=$Mode;project=$target.ref;applied=@($recorded|Select-Object version,name);pending=@(Get-HostingSchemaSummary -Migrations $pending)}|ConvertTo-Json -Depth 6
    if($Mode -eq 'apply'){
        for($index=0;$index -lt $pending.Count;$index++){
            $migration=$pending[$index]
            if(-not $PSCmdlet.ShouldProcess($target.ref,"Apply $($migration.name)")){continue}
            $body=Get-HostingSchemaBody -Query $migration.query
            $version=[DateTime]::UtcNow.ToString('yyyyMMddHHmmss')+('{0:D3}' -f ($recorded.Count+$index))
            $nameLiteral=$migration.name.Replace("'","''")
            $sourceLiteral=$migration.query.Replace("'","''")
            $statement=@"
begin;
select pg_advisory_xact_lock(170027,2);
do `$wordpairs`$ begin
  if (select count(*) from supabase_migrations.schema_migrations) <> $($recorded.Count+$index) then
    raise exception 'Migration history changed during apply';
  end if;
end `$wordpairs`$;
$body
insert into supabase_migrations.schema_migrations(version,name,statements)
values ('$version','$nameLiteral',ARRAY['$sourceLiteral']::text[]);
commit;
"@
            [void](Invoke-PrivatePsql -Sql $statement -DatabaseUri $url -Password $password -CaPath $caPath)
            [pscustomobject]@{applied=(Get-HostingSchemaSummary -Migrations @($migration))[0]}|ConvertTo-Json -Depth 4
        }
    }
} finally {
    if($caPath -and (Test-Path -LiteralPath $caPath)){Remove-Item -LiteralPath $caPath -Force}
}
