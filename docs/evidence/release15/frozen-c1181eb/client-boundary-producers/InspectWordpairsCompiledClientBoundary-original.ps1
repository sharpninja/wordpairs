#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$RequestId)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root='<repo>'
$evidence=Join-Path $root 'docs/evidence/release15/frozen-131269a'
$output=Join-Path $evidence 'client-boundary.json'
$assetRoot=Join-Path $root '.next/static'
if(Test-Path -LiteralPath $output){throw 'Retain existing client-boundary evidence'}
if(-not(Test-Path -LiteralPath $assetRoot -PathType Container)){throw 'Emitted client assets are absent'}
if(-not $PSCmdlet.ShouldProcess($output,'Inspect emitted client assets and only two authorized private values without printing either; save safe receipt')){return}
Import-Module powershell-yaml
$started=Get-Date -Format s
$revision=(& git -C $root rev-parse HEAD).Trim()
if($LASTEXITCODE){throw 'Cannot resolve source revision'}
$validationPath=Join-Path $evidence 'full/validation.json'
$invocationPath=Join-Path $evidence 'full/invocation.json'
$sourcePath=Join-Path $evidence 'source-inventory.json'
$validation=Get-Content -LiteralPath $validationPath -Raw|ConvertFrom-Json
$invocation=Get-Content -LiteralPath $invocationPath -Raw|ConvertFrom-Json
$source=Get-Content -LiteralPath $sourcePath -Raw|ConvertFrom-Json
$build=@($validation.steps|Where-Object name -CEQ 'build')
if($revision -cne '131269a590046a3c1c83314d11ff79f2b731799c' -or $build.Count -ne 1 -or $build[0].exitCode -ne 0 -or $validation.status -cne 'passed' -or $validation.failure -or $validation.revision -cne $revision -or $source.revision -cne $revision -or $invocation.revision -cne $revision -or $invocation.reports[0].exitCode -ne 0 -or -not $invocation.reports[0].sourceUnchanged){throw 'Frozen build/source provenance mismatch'}
if(@($source.sourceHashes).Count -ne 342 -or $source.expectedCount -ne 342 -or $source.manifestCount -ne 342){throw 'Unexpected fresh candidate source denominator'}
if(-not ([IO.File]::ReadAllText((Join-Path $evidence 'full/build.log'))).Contains('Compiled successfully',[StringComparison]::OrdinalIgnoreCase)){throw 'Successful native build log evidence absent'}
if($source.pathSetEqual -ne $true){throw 'Frozen source path set was not verified'}
$sourceMismatches=@(foreach($pin in $source.sourceHashes){if((Get-FileHash -LiteralPath (Join-Path $root $pin.path)).Hash -cne $pin.sha256){$pin.path}})
if($sourceMismatches.Count){throw 'Source bytes no longer match frozen inventory'}
$marker=ConvertFrom-Yaml ([IO.File]::ReadAllText((Join-Path $root 'AGENTS-README-FIRST.yaml')))
$markerValue=[string]$marker.apiKey
$passwordValue=[IO.File]::ReadAllText('<home>/.creds/supabase.pwd').TrimEnd([char[]]"`r`n")
if([string]::IsNullOrEmpty($markerValue) -or [string]::IsNullOrEmpty($passwordValue)){throw 'A specifically authorized scan value was empty'}
$known=@([pscustomobject]@{label='current-workspace-marker-api-key';hex=[Convert]::ToHexString([Text.Encoding]::UTF8.GetBytes($markerValue))},[pscustomobject]@{label='authorized-supabase-project-database-password';hex=[Convert]::ToHexString([Text.Encoding]::UTF8.GetBytes($passwordValue))})
$markerValue=$null;$passwordValue=$null;$marker=$null
$symbols=@('WORDPAIRS_GITHUB_CLIENT_ID','WORDPAIRS_GITHUB_CLIENT_SECRET','WORDPAIRS_DATABASE_URL','WORDPAIRS_DATABASE_CA','WORDPAIRS_INVITE_SECRET','WORDPAIRS_SUPABASE_SERVICE_KEY','SUPABASE_SERVICE_ROLE_KEY','WORDPAIRS_SUPABASE_JWT_SECRET','SUPABASE_JWT_SECRET','GithubAdminProvider','getAdminIdentityService','../infrastructure/runtime','src/infrastructure/github-admin','src/infrastructure/runtime')
$literalMatches=@();$symbolMatches=@();$files=@()
foreach($file in Get-ChildItem -LiteralPath $assetRoot -File -Recurse|Sort-Object FullName){
 $bytes=[IO.File]::ReadAllBytes($file.FullName)
 $hex=[Convert]::ToHexString($bytes)
 $text=[Text.Encoding]::UTF8.GetString($bytes)
 $relative=[IO.Path]::GetRelativePath($root,$file.FullName)
 foreach($value in $known){if($hex.Contains($value.hex,[StringComparison]::Ordinal)){$literalMatches+=[pscustomobject]@{valueLabel=$value.label;path=$relative}}}
 foreach($symbol in $symbols){if($text.Contains($symbol,[StringComparison]::Ordinal)){$symbolMatches+=[pscustomobject]@{symbol=$symbol;path=$relative}}}
 $files+=[pscustomobject]@{path=$relative;bytes=$bytes.Length;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes));lastWriteTime=$file.LastWriteTime.ToString('o')}
}
$known=$null
$documents=@{}
foreach($file in Get-ChildItem -LiteralPath (Join-Path $root 'src') -File -Recurse|Where-Object Extension -In @('.ts','.tsx')){$documents[$file.FullName]=[IO.File]::ReadAllText($file.FullName)}
$clientPattern=@'
^\s*["']use client["']\s*;
'@
$importPattern=@'
(?ms)^\s*import\s+(?:[^;]*?\s+from\s+)?["'](?<path>[^"']+)["']\s*;|^\s*export\s+(?:\*|\{[^}]*\})\s+from\s+["'](?<path>[^"']+)["']\s*;
'@
$entries=@($documents.Keys|Where-Object {$documents[$_] -match $clientPattern}|Sort-Object)
$queue=[Collections.Generic.Queue[string]]::new()
foreach($entry in $entries){$queue.Enqueue($entry)}
$reachable=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$unresolved=@();$dynamicImports=@()
while($queue.Count){
 $path=$queue.Dequeue()
 if(-not $reachable.Add($path)){continue}
 $content=$documents[$path]
 if($content -match '\b(?:import|require)\s*\('){$dynamicImports+=[IO.Path]::GetRelativePath($root,$path)}
 foreach($match in [regex]::Matches($content,$importPattern)){
  $specifier=$match.Groups['path'].Value
  if(-not $specifier.StartsWith('.')){continue}
  $base=[IO.Path]::GetFullPath((Join-Path (Split-Path $path) $specifier))
  $resolved=@(@($base,($base+'.ts'),($base+'.tsx'),(Join-Path $base 'index.ts'),(Join-Path $base 'index.tsx'))|Where-Object {$documents.ContainsKey($_)}|Select-Object -First 1)
  if($resolved.Count){$queue.Enqueue($resolved[0])}else{$unresolved+=[pscustomobject]@{from=[IO.Path]::GetRelativePath($root,$path);specifier=$specifier}}
 }
}
$privateSourcePaths=@('src/infrastructure/runtime.ts','src/infrastructure/github-admin.ts','src/infrastructure/secrets.ts','src/infrastructure/postgres-pool.ts','src/web/github-auth-http.ts','src/web/admin-session.ts','src/web/server-http.ts')
$privateReachable=@($privateSourcePaths|Where-Object {$reachable.Contains((Join-Path $root $_))})
$graphFiles=@($reachable|Sort-Object|ForEach-Object {[pscustomobject]@{path=[IO.Path]::GetRelativePath($root,$_);sha256=(Get-FileHash -LiteralPath $_).Hash}})
$second=@(Get-ChildItem -LiteralPath $assetRoot -File -Recurse|Sort-Object FullName|ForEach-Object {[pscustomobject]@{path=[IO.Path]::GetRelativePath($root,$_.FullName);sha256=(Get-FileHash -LiteralPath $_.FullName).Hash}})
$changedAssets=@(Compare-Object @($files|ForEach-Object {$_.path+':'+$_.sha256}) @($second|ForEach-Object {$_.path+':'+$_.sha256}))
if($changedAssets.Count){throw 'Emitted client assets changed during inspection; no stable receipt saved'}
if((& git -C $root rev-parse HEAD).Trim() -cne $revision){throw 'Source revision changed during inspection'}
$buildStart=[DateTimeOffset]::Parse($build[0].startedAt)
$buildFinish=[DateTimeOffset]::Parse($build[0].finishedAt)
$outsideWindow=@($files|Where-Object {([DateTimeOffset]::Parse($_.lastWriteTime)) -lt $buildStart -or ([DateTimeOffset]::Parse($_.lastWriteTime)) -ge $buildFinish.AddSeconds(1)})
$buildIdPath=Join-Path $root '.next/BUILD_ID'
$buildId=[IO.File]::ReadAllText($buildIdPath).Trim()
$limitations=@('Known-value scan covers exact UTF8 literals only; no escaped, encoded, split, encrypted or transformed variants are claimed.','Only current workspace marker key and explicitly authorized Supabase password were loaded. Unknown local or Vercel-sensitive environment values were not read or scanned.','Only .next/static emitted client assets were scanned, including binary assets. Server bundles, rendered HTML/RSC payloads, API/network responses, public service workers and hosted deployments were not scanned.','Build association uses the existing successful frozen build receipt, BUILD_ID directory, asset timestamps and stable inventory at inspection. The build receipt did not itself pin these asset hashes at build time; this receipt is their first independent inventory.','Static source reachability follows relative import/reexport declarations, conservatively including type-only edges. It is not the compiler module graph; package dependencies, aliases, computed/dynamic imports and loaders are outside that graph claim.','No explicit server-only package guard was inferred from comments. Current source import boundaries and emitted-value/symbol absence do not certify every future refactor or unknown secret.')
$receipt=[pscustomobject]@{startedAt=$started;finishedAt=(Get-Date -Format s);inspectionProducer=@{path=$PSCommandPath;sha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash};revision=$revision;sessionId='Codex-20261030T194802Z-plugin-session';requestId=$RequestId;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';assetRoot='.next/static';assetCount=$files.Count;totalBytes=($files|Measure-Object bytes -Sum).Sum;inventory=$files;stableDuringScan=$true;knownValueLabels=@('current-workspace-marker-api-key','authorized-supabase-project-database-password');knownValueLiteralMatchCount=$literalMatches.Count;knownValueLiteralMatches=$literalMatches;privateSymbolPatterns=$symbols;privateSymbolMatchCount=$symbolMatches.Count;privateSymbolMatches=$symbolMatches;sourceBinding=@{inventory=$sourcePath;inventorySha256=(Get-FileHash -LiteralPath $sourcePath).Hash;checkedSourceFiles=@($source.sourceHashes).Count;allPinsMatch=$true};buildBinding=@{validation=$validationPath;validationSha256=(Get-FileHash -LiteralPath $validationPath).Hash;invocation=$invocationPath;invocationSha256=(Get-FileHash -LiteralPath $invocationPath).Hash;buildStep=$build[0];producerGroupRunId=$invocation.reports[0].runId;buildLog=(Join-Path $evidence 'full/build.log');buildLogSha256=(Get-FileHash -LiteralPath (Join-Path $evidence 'full/build.log')).Hash;buildId=$buildId;buildIdSha256=(Get-FileHash -LiteralPath $buildIdPath).Hash;buildIdStaticDirectoryExists=(Test-Path -LiteralPath (Join-Path $assetRoot $buildId));assetsOutsideBuildWindow=@($outsideWindow|Select-Object path,lastWriteTime)};clientSourceGraph=@{entrypoints=@($entries|ForEach-Object {[IO.Path]::GetRelativePath($root,$_)});reachableCount=$reachable.Count;reachable=$graphFiles;privateModulesReachable=$privateReachable;unresolvedRelativeImports=$unresolved;dynamicImportFiles=$dynamicImports;qualification='Conservative relative import graph; not compiler graph.'};sourceObservations=@('src/infrastructure/runtime.ts:225-248 reads GitHub client ID/secret and constructs GithubAdminProvider on server.','src/infrastructure/github-admin.ts exchanges the secret in server-side token POST; it does not return secret/token from verified identity.','src/app/admin/page.tsx and src/app/admin/words/page.tsx have no use-client directive and pass only githubAdminAvailable() boolean to client components.','src/web/github-auth-http.ts and admin-session.ts import server runtime and are used by server routes, not identified client entrypoints.');limitations=$limitations;qualification='Narrow emitted-client and known-literal inspection, not hostile approval, complete secret audit, hosted verification or release completion.'}
$receipt|ConvertTo-Json -Depth 15|Set-Content -LiteralPath $output
[pscustomobject]@{path=$output;sha256=(Get-FileHash -LiteralPath $output).Hash;assetCount=$files.Count;bytes=$receipt.totalBytes;knownValueLiteralMatches=$literalMatches.Count;privateSymbolMatches=$symbolMatches.Count;privateModulesReachable=$privateReachable;unresolvedRelativeImports=$unresolved.Count;dynamicImportFiles=$dynamicImports;assetsOutsideBuildWindow=$outsideWindow.Count;revision=$revision;finishedAt=(Get-Date -Format s)}|ConvertTo-Json -Depth 6
