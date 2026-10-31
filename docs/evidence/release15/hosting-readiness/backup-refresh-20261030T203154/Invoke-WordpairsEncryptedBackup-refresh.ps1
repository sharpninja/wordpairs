#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('staging','production')][string]$Environment='staging')
$ErrorActionPreference='Stop'
$repo='<repo>'
$privateFolder='<home>/github/WordGame/.mcpServer/wordpairs-local'
$age='/tmp/wordpairs-age-1.3.2/age/age'
$recipient='<home>/.ssh/[PRIVATE SSH KEY NAME]_[PRIVATE HOST].pub'
$identity='<home>/.ssh/[PRIVATE SSH KEY NAME]_[PRIVATE HOST]'
$image='postgres:17-alpine@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b'
$target=if($Environment -eq 'staging'){@{reference='jshjkaigwbxsbnnogfxs';file='hosting-staging-admin.json';ca='<home>/.codex/attachments/b841a26c-22ca-44a0-ac60-061e91ea27c0/prod-ca-2021.crt'}}else{@{reference='krdcuuhcynmdfcjlpbsf';file='hosting-production-admin.json';ca='<home>/.codex/attachments/2dd34e7e-ab26-4180-a71a-d467e5f10b5f/prod-ca-2021 (1).crt'}}
$runId=('backup-'+(Get-Date -Format yyyyMMddTHHmmss)+'-'+[guid]::NewGuid().ToString('N').Substring(0,8))
$directory=Join-Path $privateFolder ('backups/'+$runId+'-'+$Environment)
$receiptPath=Join-Path $repo ('docs/evidence/release15/hosting-readiness/backup-refresh-20261030T203154/'+$runId+'-'+$Environment+'.json')
if(-not $PSCmdlet.ShouldProcess($directory,"Read-only $Environment game-schema snapshot encrypted directly to age; decrypt into one owned network-none/tmpfs PostgreSQL17 restore and compare, no hosted mutation")){return}
[void](New-Item -ItemType Directory -Path $directory)
[IO.File]::SetUnixFileMode($directory,[IO.UnixFileMode]::UserRead-bor[IO.UnixFileMode]::UserWrite-bor[IO.UnixFileMode]::UserExecute)
$ciphertext=Join-Path $directory ($Environment+'.pgdump.age')
$restoreName='wordpairs-restore-'+[guid]::NewGuid().ToString('N').Substring(0,12)
$dumpName='wordpairs-dump-'+[guid]::NewGuid().ToString('N').Substring(0,12)
$restoreId=$null
$dumpId=$null
$keeper=$null
$password=$null
$failures=[Collections.Generic.List[string]]::new()
$receipt=[ordered]@{timestamp=(Get-Date -Format s);runId=$runId;environment=$Environment;projectReference=$target.reference;scope='APP/game logical schema+data backup, not full Supabase project backup';sourceReadOnly=$true;sslMode='verify-full';hostedMutation=$false;plaintextDumpFile=$false;schemas=@('wordpairs','wordpairs_hosting','public','supabase_migrations');image=$image;dumpJobs=1;restoreJobs=1;sourceSessionClient='psql18.6compatiblewithserver17';dumpClientMajor=17;restoreClientMajor=17;cpuLimit=1;memoryLimit='512m';restoreNetwork='none';restoreHostPorts=@();storage='tmpfs; this proves logical restore, not disk durability/crash recovery';recipientPublicSha256=(Get-FileHash $recipient).Hash;recipientPublicFingerprint='SHA256:p3N5H4DpEmfWQecPs49ULE8WzGPAJAX1IpkZDv1Z7kg';identityPath=$identity;ageVersion='1.3.2';ageBinarySha256=(Get-FileHash $age).Hash;privateBackupPath=$ciphertext;sourceConfigRetained=$true;ownerNormalization='Restore uses --no-owner into local postgres; role credentials/membership/global attributes are not restored.';limits=@('Excludes managed auth,storage,Vault contents/keys,cron schedules,net queues,Realtime policies/settings/publications,EdgeFunctions and external OAuth/Vercel settings.','wordpairs_hosting scheduler definition/state is retained but never invoked on restore; pg_cron/pg_net/Vault require separate managed reprovisioning and purpose-secret configuration.','Existing private runtime/provider configuration files are preserved at their original locations; no new secret store/key is created and these files are not copied into public evidence.','Source row fingerprints use one exported read-only REPEATABLE READ snapshot shared with pg_dump. PostgreSQL sequence state is not MVCC; source values must remain stable before/after dump for exact comparison.','This operator-held local ciphertext is not an independently stored off-site backup and existing SSH private identity must be retained to decrypt it.');status='in_progress';nativeExitCodes=[ordered]@{}}
$receipt.schemaComparisonScope='Eight projected sections: columns/defaults/types, constraints, indexes, function definition SHA256/security-definer/config, table RLS flags, triggers, policies, and effective relation/function ACL. Namespace ACL/default privileges, standalone view/type/sequence definitions are included by selected-schema pg_dump but are not independently compared by this projection. Object ownership is normalized; global role credentials/membership/settings require separate provisioning.'
$producerCopy=Join-Path $directory 'Invoke-WordpairsEncryptedBackup.ps1'
Copy-Item -LiteralPath $PSCommandPath -Destination $producerCopy
$producerHash=(Get-FileHash -LiteralPath $PSCommandPath).Hash
if($producerHash -cne (Get-FileHash -LiteralPath $producerCopy).Hash){throw 'Producer archive copy hash mismatch'}
$receipt.producer=[ordered]@{path=$PSCommandPath;sha256=$producerHash;archivedPath=$producerCopy;archivedSha256=(Get-FileHash -LiteralPath $producerCopy).Hash;pinnedBeforeHostedRead=$true;originalRetained=$true}
$receipt.caSha256=(Get-FileHash -LiteralPath $target.ca).Hash
function Get-Hash([string]$Text){[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Text)))}
function Start-NativeProcess {
 [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSUseShouldProcessForStateChangingFunctions','',Justification='All process starts are scoped by the top-level approved operational ShouldProcess; hosted commands are read-only and local state is owned disposable restore.')]
 [CmdletBinding()]param([string]$File,[string[]]$Arguments,[hashtable]$Variables=@{},[switch]$InputStream)
 $info=[Diagnostics.ProcessStartInfo]::new($File)
 $info.UseShellExecute=$false;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true;$info.RedirectStandardInput=[bool]$InputStream
 foreach($argument in $Arguments){$info.ArgumentList.Add($argument)}
 foreach($entry in $Variables.GetEnumerator()){$info.Environment[$entry.Key]=[string]$entry.Value}
 [Diagnostics.Process]::Start($info)
}
function Invoke-PlainProcess([string]$File,[string[]]$Arguments,[string]$InputText){
 $process=Start-NativeProcess $File $Arguments -InputStream:($null -ne $InputText)
 try{
  $output=$process.StandardOutput.ReadToEndAsync();$errors=$process.StandardError.ReadToEndAsync()
  if($null -ne $InputText){$process.StandardInput.Write($InputText);$process.StandardInput.Close()}
  $process.WaitForExit()
  [pscustomobject]@{exitCode=$process.ExitCode;output=$output.GetAwaiter().GetResult();error=$errors.GetAwaiter().GetResult()}
 }finally{$process.Dispose()}
}
function Protect-Diagnostic {
 [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSUseShouldProcessForStateChangingFunctions','',Justification='Writes only age-encrypted owned diagnostics after the enclosing operational ShouldProcess; no plaintext data or secret value is written.')]
 [CmdletBinding()]param([string]$Name,[string]$Text)
 if(-not $Text){return}
 $path=Join-Path $directory ($Name+'.age')
 if(Test-Path $path){throw 'Retain prior encrypted diagnostic; filename already exists'}
 $encryption=Start-NativeProcess $age @('--encrypt','--recipients-file',$recipient,'--output',$path) -InputStream
 try{$errors=$encryption.StandardError.ReadToEndAsync();$encryption.StandardInput.Write($Text);$encryption.StandardInput.Close();$encryption.WaitForExit();if($encryption.ExitCode -ne 0){throw 'Diagnostic encryption failed'};[void]$errors.GetAwaiter().GetResult()}finally{$encryption.Dispose()}
 [IO.File]::SetUnixFileMode($path,[IO.UnixFileMode]::UserRead-bor[IO.UnixFileMode]::UserWrite)
}
function Read-KeeperQuery([string]$Sql){
 $marker='MARKER_'+[guid]::NewGuid().ToString('N')
 $keeper.StandardInput.WriteLine($Sql)
 $keeper.StandardInput.WriteLine("select '$marker';")
 $keeper.StandardInput.Flush()
 $lines=[Collections.Generic.List[string]]::new()
 while($true){
  $task=$keeper.StandardOutput.ReadLineAsync()
  if(-not $task.Wait(30000)){throw 'Read-only source SQL did not return within30seconds'}
  $line=$task.GetAwaiter().GetResult()
  if($null -eq $line){throw 'Read-only source SQL session ended unexpectedly'}
  if($line -ceq $marker){break}
  if($line){$lines.Add($line)}
 }
 $lines -join "`n"
}
function Invoke-LocalSql([string]$Sql){
 $result=Invoke-PlainProcess 'docker' @('exec','-i',$restoreId,'psql','-U','postgres','-d','restore','-X','-A','-t','-q','-v','ON_ERROR_STOP=1') $Sql
 if($result.exitCode -ne 0){Protect-Diagnostic ('local-sql-'+[guid]::NewGuid().ToString('N').Substring(0,6)) $result.error;throw 'Owned restore SQL failed; private encrypted diagnostic retained'}
 return $result.output.Trim()
}
function Get-SequenceSql([hashtable]$Sequence){
 $qualified='"'+$Sequence.schema.Replace('"','""')+'"."'+$Sequence.sequence.Replace('"','""')+'"'
 "select jsonb_build_object('schema','$($Sequence.schema)','sequence','$($Sequence.sequence)','lastValue',last_value,'isCalled',is_called) from $qualified;"
}
$schemaSql=@'
select jsonb_build_object(
'columns',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,a.attnum,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid)) order by n.nspname,c.relname,a.attnum) from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname in('wordpairs','wordpairs_hosting','public','supabase_migrations') and c.relkind in('r','p')),
'constraints',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid)) order by n.nspname,c.relname,k.conname) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('wordpairs','wordpairs_hosting','public','supabase_migrations')),
'indexes',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,ic.relname,pg_get_indexdef(i.indexrelid)) order by n.nspname,c.relname,ic.relname) from pg_index i join pg_class c on c.oid=i.indrelid join pg_class ic on ic.oid=i.indexrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('wordpairs','wordpairs_hosting','public','supabase_migrations')),
'functions',(select jsonb_agg(jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),p.prosecdef,p.proconfig) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('wordpairs','wordpairs_hosting','public','supabase_migrations')),
'rls',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('wordpairs','wordpairs_hosting','public','supabase_migrations') and c.relkind in('r','p')),
'triggers',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid),t.tgenabled) order by n.nspname,c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in('wordpairs','wordpairs_hosting','public','supabase_migrations')),
'policies',(select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_policies p where p.schemaname in('wordpairs','wordpairs_hosting','public','supabase_migrations')),
'acl',(select jsonb_agg(jsonb_build_array(kind,object,grantee,privilege_type,is_grantable) order by kind,object,grantee,privilege_type,is_grantable) from (
select 'relation' kind,n.nspname||'.'||c.relname object,case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee)::text end grantee,x.privilege_type,x.is_grantable from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) x where n.nspname in('wordpairs','wordpairs_hosting','public','supabase_migrations') and c.relkind in('r','p','S','v','m','f')
union all select 'function',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee)::text end,x.privilege_type,x.is_grantable from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x where n.nspname in('wordpairs','wordpairs_hosting','public','supabase_migrations')
) a));
'@
$tableQuery="select jsonb_build_object('schema',n.nspname,'table',c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('wordpairs','wordpairs_hosting','public','supabase_migrations') and c.relkind in('r','p') order by n.nspname,c.relname;"
$sequenceQuery="select jsonb_build_object('schema',n.nspname,'sequence',c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('wordpairs','wordpairs_hosting','public','supabase_migrations') and c.relkind='S' order by n.nspname,c.relname;"
try{
 $config=Get-Content -LiteralPath (Join-Path $privateFolder $target.file) -Raw|ConvertFrom-Json
 $uri=[Uri]$config.ADMIN_DATABASE_URL
 $parts=$uri.UserInfo.Split(':',2)
 if($uri.Host -cne 'aws-0-us-east-1.pooler.supabase.com' -or $uri.Port -ne 5432 -or $parts.Length -ne 2 -or [Uri]::UnescapeDataString($parts[0]) -cne ('postgres.'+$target.reference) -or $uri.AbsolutePath -cne '/postgres'){throw 'Exact source endpoint verification failed'}
 $password=[Uri]::UnescapeDataString($parts[1])
 $sourceEnv=@{PGHOST=$uri.Host;PGPORT='5432';PGDATABASE='postgres';PGUSER=[Uri]::UnescapeDataString($parts[0]);PGPASSWORD=$password;PGSSLMODE='verify-full';PGSSLROOTCERT=$target.ca;PGCONNECT_TIMEOUT='10';PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=20000 -c timezone=UTC -c extra_float_digits=3 -c search_path=pg_catalog'}
 $keeper=Start-NativeProcess 'psql' @('-X','-A','-t','-q','-w','-v','ON_ERROR_STOP=1') $sourceEnv -InputStream
 $keeperErrors=$keeper.StandardError.ReadToEndAsync()
 $snapshot=Read-KeeperQuery 'begin isolation level repeatable read read only; select pg_export_snapshot();'
 if($snapshot -notmatch '^[0-9a-fA-F]+-[0-9a-fA-F]+-\d+$'){throw 'Unexpected exported snapshot identity'}
 $receipt.snapshotId=$snapshot
 $version=Read-KeeperQuery "select current_setting('server_version');"
 if($version -notmatch '^17\.'){throw 'Source server major mismatch'}
 $receipt.sourceServerVersion=$version
 $receipt.sourceTransactionReadOnly=(Read-KeeperQuery "select current_setting('transaction_read_only');") -ceq 'on'
 if(-not $receipt.sourceTransactionReadOnly){throw 'Source transaction is not read-only'}
 $schemaBefore=Read-KeeperQuery $schemaSql
 $tables=@((Read-KeeperQuery $tableQuery) -split "`n" | ForEach-Object {$_ | ConvertFrom-Json -AsHashtable})
 $sequences=@((Read-KeeperQuery $sequenceQuery) -split "`n" | ForEach-Object {$_ | ConvertFrom-Json -AsHashtable})
 $sourceRows=@(foreach($table in $tables){
  $qualified='"'+$table.schema.Replace('"','""')+'"."'+$table.table.Replace('"','""')+'"'
  $sql="select jsonb_build_object('schema','$($table.schema)','table','$($table.table)','rows',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex'),'' order by encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')),''),'UTF8')),'hex')) from $qualified t;"
  Read-KeeperQuery $sql | ConvertFrom-Json -AsHashtable
 })
 $sourceSequenceBefore=@(foreach($sequence in $sequences){Read-KeeperQuery (Get-SequenceSql $sequence) | ConvertFrom-Json -AsHashtable})
 $receipt.sourceTables=$sourceRows;$receipt.sourceSequences=$sourceSequenceBefore;$receipt.sourceSchemaSha256=Get-Hash $schemaBefore
 $rolesJson=Read-KeeperQuery "select jsonb_agg(jsonb_build_object('name',rolname,'bypassRls',rolbypassrls) order by rolname) from pg_roles where rolname !~ '^pg_' and rolname<>'postgres';"
 $roles=@($rolesJson | ConvertFrom-Json -AsHashtable)
 $nativeVersion=Invoke-PlainProcess 'docker' @('run','--rm','--network','none','--cpus','1','--memory','128m',$image,'pg_dump','--version') $null
 if($nativeVersion.exitCode -ne 0 -or $nativeVersion.output -notmatch 'PostgreSQL\) 17\.'){throw 'Pinned pg_dump client is not major17'}
 $receipt.dumpVersion=$nativeVersion.output.Trim()
 $dumpEnv=$sourceEnv.Clone();$dumpEnv.PGSSLROOTCERT='/run/source-ca.crt'
 $dumpArgs=@('run','--rm','--name',$dumpName,'--cidfile',(Join-Path $directory 'dump.cid'),'--label',"wordpairs.backup.run=$runId",'--network','host','--read-only','--cpus','1','--memory','256m','--cap-drop','ALL','--security-opt','no-new-privileges','--mount',"type=bind,source=$($target.ca),target=/run/source-ca.crt,readonly")
 foreach($key in $dumpEnv.Keys){$dumpArgs+=@('--env',[string]$key)}
 $dumpArgs+=@($image,'pg_dump','--no-password','--format=custom','--no-owner','--no-publications','--no-subscriptions','--strict-names',"--snapshot=$snapshot",'--lock-wait-timeout=5s','--schema=wordpairs','--schema=wordpairs_hosting','--schema=public','--schema=supabase_migrations')
 if(Test-Path $ciphertext){throw 'Refusing to overwrite existing backup ciphertext'}
 $encrypt=Start-NativeProcess $age @('--encrypt','--recipients-file',$recipient,'--output',$ciphertext) -InputStream
 $dump=Start-NativeProcess 'docker' $dumpArgs $dumpEnv
 try{
  $encryptErrors=$encrypt.StandardError.ReadToEndAsync();$dumpErrors=$dump.StandardError.ReadToEndAsync()
  $copy=$dump.StandardOutput.BaseStream.CopyToAsync($encrypt.StandardInput.BaseStream)
  [void]$copy.GetAwaiter().GetResult();$encrypt.StandardInput.Close();$dump.WaitForExit();$encrypt.WaitForExit()
  $receipt.nativeExitCodes.dump=$dump.ExitCode;$receipt.nativeExitCodes.encrypt=$encrypt.ExitCode
  $dumpError=$dumpErrors.GetAwaiter().GetResult();$encryptError=$encryptErrors.GetAwaiter().GetResult()
  Protect-Diagnostic 'dump.stderr' $dumpError;Protect-Diagnostic 'encrypt.stderr' $encryptError
  if($dump.ExitCode -ne 0 -or $encrypt.ExitCode -ne 0){throw 'Dump/encryption failed; encrypted diagnostic retained'}
 }finally{$dump.Dispose();$encrypt.Dispose()}
 [IO.File]::SetUnixFileMode($ciphertext,[IO.UnixFileMode]::UserRead-bor[IO.UnixFileMode]::UserWrite)
 $receipt.ciphertextSha256=(Get-FileHash $ciphertext).Hash;$receipt.ciphertextBytes=(Get-Item $ciphertext).Length
 $sourceSequenceAfter=@(foreach($sequence in $sequences){Read-KeeperQuery (Get-SequenceSql $sequence) | ConvertFrom-Json -AsHashtable})
 $receipt.sourceSequenceStable=($sourceSequenceBefore|ConvertTo-Json -Depth 10 -Compress) -ceq ($sourceSequenceAfter|ConvertTo-Json -Depth 10 -Compress)
 if(-not $receipt.sourceSequenceStable){throw 'Source sequence changed during dump; exact source sequence proof requires a fresh snapshot/export'}
 [void](Read-KeeperQuery 'rollback;')
 $keeper.StandardInput.Close();$keeper.WaitForExit();$receipt.nativeExitCodes.sourceRead=$keeper.ExitCode
 Protect-Diagnostic 'source-session.stderr' $keeperErrors.GetAwaiter().GetResult()
 if($keeper.ExitCode -ne 0){throw 'Source snapshot session failed'}
 $keeper.Dispose();$keeper=$null;$password=$null;$sourceEnv.Clear();$dumpEnv.Clear()
 $started=Invoke-PlainProcess 'docker' @('run','--detach','--name',$restoreName,'--cidfile',(Join-Path $directory 'restore.cid'),'--label',"wordpairs.backup.run=$runId",'--network','none','--read-only','--cpus','1','--memory','512m','--pids-limit','128','--tmpfs','/var/lib/postgresql/data:rw,noexec,nosuid,size=384m','--tmpfs','/var/run/postgresql:rw,noexec,nosuid,size=16m','--tmpfs','/tmp:rw,noexec,nosuid,size=32m','--env','POSTGRES_HOST_AUTH_METHOD=trust','--env','POSTGRES_DB=restore',$image,'-c','shared_buffers=32MB','-c','max_connections=10') $null
 if($started.exitCode -ne 0 -or $started.output.Trim() -notmatch '^[0-9a-f]{64}$'){throw 'Owned isolated restore container did not start'}
 $restoreId=$started.output.Trim();$receipt.restoreContainerId=$restoreId
 $ready=$false
 for($attempt=0;$attempt -lt 120;$attempt++){
  # The image temporarily starts a socket-only server before POSTGRES_DB exists.
  # Require an actual query to the intended DB over its final loopback listener.
  $r=Invoke-PlainProcess 'docker' @('exec',$restoreId,'psql','-h','127.0.0.1','-U','postgres','-d','restore','-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-c','select 1') $null
  if($r.exitCode -eq 0 -and $r.output.Trim() -ceq '1'){$ready=$true;break}
  Start-Sleep -Milliseconds 250
 }
 if(-not $ready){throw 'Owned restore database not ready'}
 $bootstrap='drop schema public cascade; create schema extensions; create extension pgcrypto with schema extensions; create extension "uuid-ossp" with schema extensions; create schema auth; create function auth.uid() returns uuid language sql stable as ''select nullif(current_setting(''''request.jwt.claims'''',true)::jsonb->>''''sub'''','''''''')::uuid''; create function auth.jwt() returns jsonb language sql stable as ''select current_setting(''''request.jwt.claims'''',true)::jsonb'';'
 foreach($role in $roles){$quoted='"'+$role.name.Replace('"','""')+'"';$bootstrap+="create role $quoted nologin $(if($role.bypassRls){'bypassrls'});"}
 [void](Invoke-LocalSql $bootstrap)
 $decrypt=Start-NativeProcess $age @('--decrypt','--identity',$identity,$ciphertext)
 $restore=Start-NativeProcess 'docker' @('exec','-i',$restoreId,'pg_restore','--username=postgres','--dbname=restore','--no-owner','--exit-on-error','--single-transaction') -InputStream
 try{
  $decryptErrors=$decrypt.StandardError.ReadToEndAsync();$restoreErrors=$restore.StandardError.ReadToEndAsync();$restoreOutput=$restore.StandardOutput.ReadToEndAsync()
  $copy=$decrypt.StandardOutput.BaseStream.CopyToAsync($restore.StandardInput.BaseStream);[void]$copy.GetAwaiter().GetResult();$restore.StandardInput.Close();$decrypt.WaitForExit();$restore.WaitForExit()
  $receipt.nativeExitCodes.decrypt=$decrypt.ExitCode;$receipt.nativeExitCodes.restore=$restore.ExitCode
  Protect-Diagnostic 'decrypt.stderr' $decryptErrors.GetAwaiter().GetResult();Protect-Diagnostic 'restore.stderr' $restoreErrors.GetAwaiter().GetResult();Protect-Diagnostic 'restore.stdout' $restoreOutput.GetAwaiter().GetResult()
  if($decrypt.ExitCode -ne 0 -or $restore.ExitCode -ne 0){throw 'Decryption/restore failed; private encrypted diagnostics retained'}
 }finally{$decrypt.Dispose();$restore.Dispose()}
 $localSettings='set timezone=''UTC'';set extra_float_digits=3;set search_path=pg_catalog;'
 $schemaRestored=Invoke-LocalSql ($localSettings+$schemaSql)
 $restoredRows=@(foreach($table in $tables){
  $qualified='"'+$table.schema.Replace('"','""')+'"."'+$table.table.Replace('"','""')+'"'
  $sql="select jsonb_build_object('schema','$($table.schema)','table','$($table.table)','rows',count(*),'sha256',encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex'),'' order by encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')),''),'UTF8')),'hex')) from $qualified t;"
  Invoke-LocalSql ($localSettings+$sql) | ConvertFrom-Json -AsHashtable
 })
 $restoredSequences=@(foreach($sequence in $sequences){Invoke-LocalSql (Get-SequenceSql $sequence) | ConvertFrom-Json -AsHashtable})
 $receipt.sourceSchemaSha256=Get-Hash $schemaBefore
 $receipt.restoredSchemaSha256=Get-Hash $schemaRestored
 $receipt.schemaEqual=$schemaBefore -ceq $schemaRestored
 $receipt.dataEqual=($sourceRows|ConvertTo-Json -Depth 10 -Compress) -ceq ($restoredRows|ConvertTo-Json -Depth 10 -Compress)
 $receipt.sequencesEqual=($sourceSequenceBefore|ConvertTo-Json -Depth 10 -Compress) -ceq ($restoredSequences|ConvertTo-Json -Depth 10 -Compress)
 $receipt.sourceTables=$sourceRows;$receipt.restoredTables=$restoredRows;$receipt.sourceSequences=$sourceSequenceBefore;$receipt.restoredSequences=$restoredSequences
 $receipt.sourceSchemaSectionHashes=[ordered]@{};$receipt.restoredSchemaSectionHashes=[ordered]@{}
 $beforeObject=$schemaBefore|ConvertFrom-Json -AsHashtable;$afterObject=$schemaRestored|ConvertFrom-Json -AsHashtable
 foreach($key in $beforeObject.Keys){$receipt.sourceSchemaSectionHashes[$key]=Get-Hash ($beforeObject[$key]|ConvertTo-Json -Depth 30 -Compress);$receipt.restoredSchemaSectionHashes[$key]=Get-Hash ($afterObject[$key]|ConvertTo-Json -Depth 30 -Compress)}
 if(-not $receipt.schemaEqual -or -not $receipt.dataEqual -or -not $receipt.sequencesEqual){
  Protect-Diagnostic 'source-schema-metadata.json' $schemaBefore;Protect-Diagnostic 'restored-schema-metadata.json' $schemaRestored
  throw 'Restore comparison mismatch; private encrypted metadata retained'
 }
 $receipt.status='verified_app_restore'
}catch{
 $failures.Add($_.Exception.Message)
 $receipt.status='failed'
}finally{
 if($keeper){try{$keeper.StandardInput.WriteLine('rollback;');$keeper.StandardInput.Close();$keeper.WaitForExit(5000)|Out-Null;if(-not $keeper.HasExited){$keeper.Kill()}}catch{[void]$failures.Add('Source snapshot session cleanup needs verification')};$keeper.Dispose()}
 $password=$null
 if(Test-Path (Join-Path $directory 'dump.cid')){$dumpId=(Get-Content (Join-Path $directory 'dump.cid') -Raw).Trim();$receipt.dumpContainerId=$dumpId}
 if(-not $restoreId){
  if(Test-Path (Join-Path $directory 'restore.cid')){$restoreId=(Get-Content (Join-Path $directory 'restore.cid') -Raw).Trim()}
  else{
   $fallback=Invoke-PlainProcess 'docker' @('ps','--all','--quiet','--no-trunc','--filter',"name=^/$restoreName$",'--filter',"label=wordpairs.backup.run=$runId") $null
   if($fallback.exitCode -ne 0){$failures.Add('Owned restore fallback lookup failed; retained name/runID requires cleanup verification')}
   elseif($fallback.output.Trim()){
    $found=@($fallback.output.Trim() -split "`n")
    if($found.Count -eq 1){$restoreId=$found[0].Trim()}else{$failures.Add('Owned restore fallback identity was ambiguous')}
   }
  }
  if($restoreId){$receipt.restoreContainerId=$restoreId;$receipt.restoreIdentityRecoveredFromCidOrExactNameAndRunLabel=$true}
 }
 $cleanupResults=@(foreach($ownedId in @($restoreId,$dumpId)|Where-Object {$_}){
  if($ownedId -notmatch '^[0-9a-f]{64}$'){$failures.Add('Owned container ID malformed');continue}
  $inspect=Invoke-PlainProcess 'docker' @('inspect','--format','{{index .Config.Labels "wordpairs.backup.run"}}',$ownedId) $null
  if($inspect.exitCode -ne 0){
   $absent=Invoke-PlainProcess 'docker' @('ps','--all','--quiet','--no-trunc','--filter',"id=$ownedId") $null
   $confirmed=$absent.exitCode -eq 0 -and -not $absent.output.Trim()
   if(-not $confirmed){$failures.Add('Owned container inspection failed and absence was not confirmed')}
   [ordered]@{id=$ownedId;alreadyAbsent=$confirmed;absenceVerified=$confirmed};continue
  }
  if($inspect.output.Trim() -cne $runId){$failures.Add('Container ownership label mismatch');continue}
  $removed=Invoke-PlainProcess 'docker' @('rm','--force','--volumes',$ownedId) $null
  $remaining=Invoke-PlainProcess 'docker' @('ps','--all','--quiet','--no-trunc','--filter',"id=$ownedId") $null
  $verified=$removed.exitCode -eq 0 -and $remaining.exitCode -eq 0 -and -not $remaining.output.Trim()
  if(-not $verified){$failures.Add('Owned container cleanup could not be confirmed')}
  [ordered]@{id=$ownedId;removedExitCode=$removed.exitCode;absenceVerified=$verified}
 })
 $receipt.cleanup=$cleanupResults;$receipt.failures=@($failures);$receipt.finishedAt=Get-Date -Format s
 if($failures.Count){$receipt.status='failed'}
 $receipt | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $receiptPath -Encoding utf8
 [pscustomobject]@{runId=$runId;environment=$Environment;status=$receipt.status;receipt=$receiptPath;ciphertextRetained=(Test-Path $ciphertext);schemaEqual=$receipt.schemaEqual;dataEqual=$receipt.dataEqual;sequencesEqual=$receipt.sequencesEqual;nativeExitCodes=$receipt.nativeExitCodes;failures=@($failures)} | ConvertTo-Json -Depth 10
}
if($failures.Count){throw 'Backup/restore operation failed; receipt and original ciphertext retained'}
