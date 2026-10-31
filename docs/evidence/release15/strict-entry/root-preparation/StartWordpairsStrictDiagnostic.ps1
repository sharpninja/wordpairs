#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$Revision,[Parameter(Mandatory)][string]$Directory)
$ErrorActionPreference='Stop'
$root='<repo>'
$baseline='6063acd9d6869fd71a33f75ee5c940c736c99124'
$runner=Join-Path $root 'docs/evidence/release15/operational-producers/RunWordpairsRelease15Evidence.ps1'
$runnerHash='5567FD524E532EBA8A71A496A44E3FDF2375626546D38B627A62CCC765448444'
$Directory=[IO.Path]::GetFullPath($Directory)
$allowed=(Join-Path $root 'docs/evidence/release15/strict-entry')+[IO.Path]::DirectorySeparatorChar
if(-not $Directory.StartsWith($allowed,[StringComparison]::Ordinal)){throw 'Diagnostic must use the strict-entry evidence directory'}
if(Test-Path -LiteralPath $Directory){throw 'Retain the earlier diagnostic; choose a fresh directory'}
if((& git -C $root rev-parse HEAD).Trim() -cne $Revision){throw 'Candidate HEAD changed'}
if((Get-FileHash -LiteralPath $runner).Hash -cne $runnerHash){throw 'Reviewed evidence collector changed'}
$dirty=@(& git -C $root status --short -- src tests scripts public package.json package-lock.json tsconfig.json next.config.ts biome.json 'vitest*.config.ts' 'playwright*.config.ts')
if($LASTEXITCODE -or $dirty.Count){throw 'Commit the complete source candidate before diagnostic execution'}
$appDelta=@(& git -C $root diff --name-only $baseline $Revision -- src public package.json package-lock.json tsconfig.json next.config.ts)
if($LASTEXITCODE -or $appDelta.Count){throw 'Application inputs changed; diagnostic requires a fresh production build'}
$priorDirectory=Join-Path $root 'docs/evidence/release15/frozen-6063acd'
$validation=Get-Content -LiteralPath (Join-Path $priorDirectory 'full/validation.json') -Raw | ConvertFrom-Json
$client=Get-Content -LiteralPath (Join-Path $priorDirectory 'client-boundary.json') -Raw | ConvertFrom-Json
$build=@($validation.steps | Where-Object name -EQ 'build')
if($validation.revision -cne $baseline -or $build.Count -ne 1 -or $build[0].exitCode -ne 0){throw 'Prior successful application build is unbound'}
$buildIdPath=Join-Path $root '.next/BUILD_ID'
if((Get-FileHash -LiteralPath $buildIdPath).Hash -cne $client.buildBinding.buildIdSha256){throw 'Application build identity changed'}
foreach($asset in $client.inventory){if((Get-FileHash -LiteralPath (Join-Path $root $asset.path)).Hash -cne $asset.sha256){throw 'Retained compiled client asset changed'}}
$unit='wordpairs-strict-diagnostic-'+$Revision.Substring(0,7)+'-'+(Get-Date -Format yyyyMMddTHHmmss)
$report=Join-Path $Directory 'strict-ui'
$runId=[Guid]::NewGuid().ToString('D')
$arguments=@('--user','--collect',('--unit='+$unit),'--property',('WorkingDirectory='+$root),'--property',('StandardOutput=append:'+(Join-Path $Directory 'service.stdout.log')),'--property',('StandardError=append:'+(Join-Path $Directory 'service.stderr.log')),'--','/usr/bin/pwsh','-NoProfile','-NonInteractive','-File',$runner,'-Lane','strict-ui','-ReportDirectory',$report,'-EvidenceRunId',$runId)
if(-not $PSCmdlet.ShouldProcess($unit,'Run the exact-commit strict UI diagnostic before the full release validation')){return}
$null=New-Item -ItemType Directory -Path $Directory
$retained=Join-Path $Directory 'StartWordpairsStrictDiagnostic.ps1'
Copy-Item -LiteralPath $PSCommandPath -Destination $retained
if((Get-FileHash -LiteralPath $retained).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Diagnostic launch producer copy differs'}
$dryRun=& pwsh -NoProfile -NonInteractive -File $runner -Lane strict-ui -ReportDirectory $report -EvidenceRunId $runId -WhatIf 2>&1
if($LASTEXITCODE){throw 'Diagnostic collector WhatIf failed'}
$output=& systemd-run @arguments 2>&1
$code=$LASTEXITCODE
[pscustomobject]@{timestamp=(Get-Date -Format s);revision=$Revision;runId=$runId;unit=$unit;executable='systemd-run';arguments=$arguments;exitCode=$code;output=@($output | ForEach-Object ToString);collector=@{path=$runner;sha256=$runnerHash;whatIf=@($dryRun | ForEach-Object ToString)};producer=@{path=$retained;sha256=(Get-FileHash -LiteralPath $retained).Hash;original=$PSCommandPath;originalRetained=$true};applicationBuild=@{baseline=$baseline;buildRunId=$validation.runId;buildStartedAt=$build[0].startedAt;buildFinishedAt=$build[0].finishedAt;buildIdSha256=(Get-FileHash -LiteralPath $buildIdPath).Hash;unchangedAppInputPaths=$true;clientAssetsChecked=@($client.inventory).Count;qualification='Reused prior application build for an early diagnostic because application inputs, BUILD_ID and retained client hashes match. Server artifact bytes were not independently inventoried here. The complete fresh exact-candidate build and all five lanes are still mandatory before hostile review.'};qualification='Launch acknowledgement and bounded source/build identity checks only. Native strict report establishes this diagnostic result; it does not replace the complete release gate.'} | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath (Join-Path $Directory 'service-start.json')
if($code){throw 'Diagnostic launch failed; retain launch evidence'}
$output
