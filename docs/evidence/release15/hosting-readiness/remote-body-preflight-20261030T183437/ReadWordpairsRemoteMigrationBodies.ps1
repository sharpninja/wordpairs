#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$repo='<repo>'
$privateDirectory='<home>/github/WordGame/.mcpServer/wordpairs-local'
$head='fdee7a2569bb4742e008977e2a9cd7d312def859'
$scriptHash='D47914412511DAD25DF438A74FC8D8C0296A327F2E06467E751BC2DFC90EF689'
$moduleHash='F002924A2F673F39A4B3260965D32486988EA71EE32F8402C27BA74725773DA0'
$targets=@(@{environment='staging';project='jshjkaigwbxsbnnogfxs';config='hosting-staging-admin.json'},@{environment='production';project='krdcuuhcynmdfcjlpbsf';config='hosting-production-admin.json'})
$sourceScript=Join-Path $repo 'scripts/hosting-schema.ps1'
$sourceModule=Join-Path $repo 'scripts/HostingSchemaPlanner.psm1'
if((& git -C $repo rev-parse HEAD).Trim() -cne $head){throw 'Frozen application HEAD changed'}
if((Get-FileHash -LiteralPath $sourceScript).Hash -cne $scriptHash -or (Get-FileHash -LiteralPath $sourceModule).Hash -cne $moduleHash){throw 'Reviewed producer bytes changed'}
foreach($target in $targets){if(-not(Test-Path -LiteralPath (Join-Path $privateDirectory $target.config) -PathType Leaf)){throw 'Expected private configuration is absent'}}
$stamp=Get-Date -Format yyyyMMddTHHmmss
$directory=Join-Path $repo ('docs/evidence/release15/hosting-readiness/remote-body-preflight-'+$stamp)
$output=Join-Path $repo ('docs/evidence/release15/hosting-readiness/remote-body-preflight-'+$stamp+'.json')
if(-not $PSCmdlet.ShouldProcess($output,'Read hosted migration bodies/order in status mode only; archive safe producers and metadata')){return}
[void][IO.Directory]::CreateDirectory($directory)
$producerPins=[Collections.Generic.List[object]]::new()
foreach($path in @($sourceScript,$sourceModule,$PSCommandPath)){
 $destination=Join-Path $directory ([IO.Path]::GetFileName($path))
 if(Test-Path -LiteralPath $destination){throw 'Preserve preexisting producer archive'}
 Copy-Item -LiteralPath $path -Destination $destination
 $hash=(Get-FileHash -LiteralPath $path).Hash
 if($hash -cne (Get-FileHash -LiteralPath $destination).Hash){throw 'Producer retention hash mismatch'}
 $producerPins.Add([pscustomobject]@{originalPath=$path;retainedCopy=[IO.Path]::GetRelativePath($repo,$destination);sha256=$hash;parserErrors=0;analyzerWarningErrorCount=0})
}
Import-Module $sourceModule -Force
$catalog=@(Get-HostingSchemaMigrationCatalog -Root $repo)
$catalogSummary=@(Get-HostingSchemaSummary -Migrations $catalog)
$results=[Collections.Generic.List[object]]::new()
foreach($target in $targets){
 $configPath=Join-Path $privateDirectory $target.config
 $privateConfig=Get-Content -LiteralPath $configPath -Raw|ConvertFrom-Json
 $caProvided=[bool]$privateConfig.DATABASE_CA
 $privateConfig=$null
 $arguments=@('-NoProfile','-NonInteractive','-File',$sourceScript,'-Environment',$target.environment,'-Mode','status','-Config',$configPath,'-ConfirmProject',$target.project)
 $info=[Diagnostics.ProcessStartInfo]::new('pwsh')
 foreach($argument in $arguments){$info.ArgumentList.Add($argument)}
 $info.WorkingDirectory=$repo;$info.UseShellExecute=$false;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $started=Get-Date -Format s
 $process=[Diagnostics.Process]::Start($info)
 try{
  $stdoutTask=$process.StandardOutput.ReadToEndAsync();$stderrTask=$process.StandardError.ReadToEndAsync()
  $process.WaitForExit();$stdout=$stdoutTask.GetAwaiter().GetResult();$stderr=$stderrTask.GetAwaiter().GetResult();$exit=$process.ExitCode
 }finally{$process.Dispose()}
 $finished=Get-Date -Format s
 $row=[ordered]@{environment=$target.environment;project=$target.project;startedAt=$started;finishedAt=$finished;executable='pwsh';arguments=$arguments;exitCode=$exit;mode='status';caProvided=$caProvided;sslMode='verify-full';nativeStatus=$null;appliedCount=$null;pendingCount=$null;normalizedBodyOrderAccepted=$false;appliedCatalogHashes=@();safeFailure=$null;stderrPresent=[bool]$stderr}
 if($exit -ne 0){$row.safeFailure='Existing status producer returned nonzero; private diagnostic text was deliberately not rendered or stored.'}
 else{
  $parsed=$stdout|ConvertFrom-Json
  if($parsed.mode -cne 'status' -or $parsed.project -cne $target.project){throw 'Native status target/mode mismatch'}
  foreach($applied in $parsed.applied){if(@($applied.PSObject.Properties.Name|Where-Object {$_ -notin @('version','name')}).Count){throw 'Unexpected applied-status field; do not store raw result'}}
  foreach($pending in $parsed.pending){if(@($pending.PSObject.Properties.Name|Where-Object {$_ -notin @('version','name','sha256')}).Count){throw 'Unexpected pending-status field; do not store raw result'}}
  $row.nativeStatus=$parsed;$row.appliedCount=@($parsed.applied).Count;$row.pendingCount=@($parsed.pending).Count;$row.normalizedBodyOrderAccepted=$true
  $row.appliedCatalogHashes=@($catalogSummary|Select-Object -First $row.appliedCount)
  $safePath=Join-Path $directory ($target.environment+'-status.json')
  [IO.File]::WriteAllText($safePath,($parsed|ConvertTo-Json -Depth 10)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
  $row.nativeStatusFile=[IO.Path]::GetRelativePath($repo,$safePath);$row.nativeStatusFileSha256=(Get-FileHash -LiteralPath $safePath).Hash
 }
 $stdout=$null;$stderr=$null
 $results.Add([pscustomobject]$row)
}
$clientPath=Join-Path $repo 'docs/evidence/release15/frozen-fdee7a2/client-boundary.json'
$clientHash=(Get-FileHash -LiteralPath $clientPath).Hash
if($clientHash -cne '797C84B4090E6BBAAF08AFFC8D3D18EAEEE5A66F71B625FDEF9EC80D70DE9193'){throw 'Existing client-boundary receipt changed'}
$retainedDirectory=Join-Path $repo 'docs/evidence/release15/frozen-fdee7a2/client-boundary-producers'
[void][IO.Directory]::CreateDirectory($retainedDirectory)
$clientProducerPins=[Collections.Generic.List[object]]::new()
foreach($entry in @(@{path='/tmp/InspectWordpairsCompiledClientBoundary.ps1';hash='B0CC92F1AA3BAFFC8668FA1C4E100C695CF150557421C7003E7399A5C340CAC5'},@{path='/tmp/InspectWordpairsCompiledClientBoundary-fdee7a2.ps1';hash='BB64CE230A697940007CFDE023C5B3327911D307192D32A91AF6A70BE0C413EC'})){
 if((Get-FileHash -LiteralPath $entry.path).Hash -cne $entry.hash){throw 'Original client producer hash changed'}
 $destination=Join-Path $retainedDirectory ([IO.Path]::GetFileName($entry.path))
 if(Test-Path -LiteralPath $destination){throw 'Preserve existing client producer archive'}
 Copy-Item -LiteralPath $entry.path -Destination $destination
 if((Get-FileHash -LiteralPath $destination).Hash -cne $entry.hash){throw 'Retained client producer hash mismatch'}
 $clientProducerPins.Add([pscustomobject]@{original=$entry.path;copy=[IO.Path]::GetRelativePath($repo,$destination);sha256=$entry.hash})
}
$retention=[ordered]@{timestamp=(Get-Date -Format s);sourceHead=$head;producerGroupRunId='0f337bfa-39c7-4650-b35d-6ee8d698be0f';nativeFullRunId='b8d49829-2942-4b9d-aa8f-1d3667e4016d';receipt=[IO.Path]::GetRelativePath($repo,$clientPath);receiptSha256=$clientHash;originalsRetained=$true;copies=$clientProducerPins.ToArray();qualification='Append-only producer retention for existing inspection provenance. This does not create new build, test or scan proof.'}
$retentionPath=Join-Path $retainedDirectory 'retention-manifest.json'
if(Test-Path -LiteralPath $retentionPath){throw 'Preserve existing retention manifest'}
[IO.File]::WriteAllText($retentionPath,($retention|ConvertTo-Json -Depth 10)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
if((Get-FileHash -LiteralPath $clientPath).Hash -cne $clientHash){throw 'Client-boundary receipt changed during retention'}
$receipt=[ordered]@{schema='wordpairs-remote-migration-body-preflight/v1';timestamp=(Get-Date -Format s);sourceHead=$head;sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261030T233149Z-remote-migration-body-status';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';producerPins=$producerPins.ToArray();catalogCount=$catalog.Count;catalog=$catalogSummary;results=$results.ToArray();mode='status-only';providerMutations=0;bodyProof='Existing canonical planner sorted remote versions, required exact expected name and one statement per applied row, and compared each normalized remote statement to local source. Normalization changes CRLF and strips outer BEGIN/COMMIT only. Raw remote bodies remained inside child process and were not printed/persisted.';clientProducerRetention=[IO.Path]::GetRelativePath($repo,$retentionPath);clientProducerRetentionSha256=(Get-FileHash -LiteralPath $retentionPath).Hash;documentation=@('https://supabase.com/changelog','https://supabase.com/docs/guides/database/connecting-to-postgres','https://supabase.com/docs/guides/api/securing-your-api');documentationAccess='Markdown endpoints returned unsupported-content-type from search service; public HTML documentation and supported Supabase search_docs read successfully. No dashboard/browser access attempted.';limitations=@('Status accepts canonicalized body/order, not byte equality of raw remote SQL whitespace/outer transaction wrappers or equality of catalog-generated version labels to historical timestamps.','This SELECT-only history snapshot does not establish no future concurrent changes; apply and all provider/config/schema mutations were excluded.','Data API exposed-schema dashboard allowlist is not verified. A null pgrst.db_schemas value would not prove safety.','No current grants/RLS/scheduler/Vault presence, advisors, actual hosted gameplay, OAuth or rollout readiness claimed from migration history alone.','Existing private config credentials were consumed only by reviewed status process; values and raw SQL/history were not retained.','Client producer retention is provenance only; existing receipt, current application source and full build/test proof were not changed.');readinessClaim=$false}
if((& git -C $repo rev-parse HEAD).Trim() -cne $head){throw 'HEAD changed during preflight'}
[IO.File]::WriteAllText($output,($receipt|ConvertTo-Json -Depth 25)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
[pscustomobject]@{receipt=$output;sha256=(Get-FileHash -LiteralPath $output).Hash;results=@($results|Select-Object environment,project,exitCode,appliedCount,pendingCount,normalizedBodyOrderAccepted);clientRetentionManifest=$retentionPath;clientReceiptUnchanged=$true;finishedAt=(Get-Date -Format s)}|ConvertTo-Json -Depth 6
