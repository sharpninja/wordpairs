#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
 [Parameter(Mandatory)][string]$InvocationManifestPath,
 [Parameter(Mandatory)][string]$SourceInventoryPath,
 [Parameter(Mandatory)][string]$OutputDirectory,
 [Parameter(Mandatory)][ValidateRange(1,2147483647)][int]$ExpectedRealtimeCount
)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot
. (Join-Path $PSScriptRoot 'Prepare-ReviewEvidence.ps1') -ReportDirectory unused -PowerShellDirectory unused -OutputDirectory $OutputDirectory -SourceInventoryPath $SourceInventoryPath -ExpectedUnitCount 1 -ExpectedPostgresCount 1 -ExpectedBrowserCount 1 -LoadContractsOnly
Import-Module (Join-Path $PSScriptRoot 'ReviewRunProvenance.psm1') -Force
$revision=(& git -C $root rev-parse HEAD).Trim()
if($LASTEXITCODE){throw 'Unable to resolve HEAD.'}
$dirty=@(& git -C $root status --short -- src tests scripts public package.json package-lock.json tsconfig.json next.config.ts biome.json 'vitest*.config.ts' 'playwright*.config.ts')
if($dirty.Count){throw 'Source is dirty before supplemental preparation.'}
$manifestFile=(Resolve-Path -LiteralPath $InvocationManifestPath).ProviderPath
$sourceFile=(Resolve-Path -LiteralPath $SourceInventoryPath).ProviderPath
$output=[IO.Path]::GetFullPath($OutputDirectory)
$indexPath=Join-Path $output 'supplemental-evidence-index.json'
if($manifestFile -ceq $indexPath -or $sourceFile -ceq $indexPath){throw 'Supplemental output would overwrite a source receipt.'}
$manifestHash=(Get-FileHash $manifestFile).Hash
$sourceHash=(Get-FileHash $sourceFile).Hash
$manifest=[IO.File]::ReadAllText($manifestFile)|ConvertFrom-Json
$inventory=[IO.File]::ReadAllText($sourceFile)|ConvertFrom-Json
if(-not $manifest.runId -or $manifest.revision -cne $revision -or $inventory.revision -cne $revision -or $inventory.pathSetEqual -ne $true){throw 'Invocation/source inventory does not match the frozen revision.'}
$paths=@(& git -C $root ls-files --cached --others --exclude-standard | Where-Object {$_ -match '^(src|tests|scripts|public)/' -or $_ -match '^(package(-lock)?\.json|tsconfig\.json|next-env\.d\.ts|next\.config\.ts|biome\.json|vitest[^/]*\.config\.ts|playwright[^/]*\.config\.ts)$'} | Sort-Object -Unique)
if($LASTEXITCODE -or -not $paths.Count -or $inventory.expectedCount -ne $paths.Count -or $inventory.manifestCount -ne $paths.Count -or @($inventory.sourceHashes).Count -ne $paths.Count){throw 'Source inventory path set changed.'}
foreach($path in $paths){
 $entry=@($inventory.sourceHashes|Where-Object path -CEQ $path)
 if($entry.Count -ne 1 -or (Get-FileHash -LiteralPath (Join-Path $root $path)).Hash -cne $entry[0].sha256){throw 'Source inventory bytes changed.'}
}
$verified=@(foreach($run in @($manifest.reports)){
 if(-not $run.kind -or -not $run.hostName -or -not $run.startedAt -or -not $run.finishedAt -or -not $run.executable -or -not @($run.arguments|Where-Object {-not [string]::IsNullOrWhiteSpace([string]$_)}).Count){throw 'Incomplete invocation provenance.'}
 if([DateTimeOffset]::Parse($run.finishedAt) -lt [DateTimeOffset]::Parse($run.startedAt)){throw 'Invalid invocation chronology.'}
 $junit=(Resolve-Path -LiteralPath $run.junit).ProviderPath
 $problems=@(Get-ReviewRunProblem -Run $run -ExpectedRunId $manifest.runId -ExpectedRevision $revision -ActualJUnitSha256 (Get-FileHash $junit).Hash)
 if($problems.Count){throw "Supplemental provenance mismatch: $($problems -join '; ')"}
 [xml]$xml=[IO.File]::ReadAllText($junit)
 $cases=@($xml.SelectNodes('//testcase'))
 $summary=[pscustomobject]@{kind=$run.kind;cases=$cases.Count;failed=@($cases|Where-Object {$_.SelectSingleNode('failure|error')}).Count;skipped=@($cases|Where-Object {$_.SelectSingleNode('skipped')}).Count;caseNames=@($cases|ForEach-Object {$_.GetAttribute('name')});junit=$junit;run=$run}
 $expected=@{realtime=$ExpectedRealtimeCount;'live-ui'=9;'strict-ui'=1}[$run.kind]
 if($run.expectedCount -ne $expected){throw 'Invocation expected count does not match the caller-pinned lane inventory.'}
 $summary
})
$problems=@(Get-ReviewSupplementalProblem -Reports $verified -ExpectedRealtimeCount $ExpectedRealtimeCount)
if($problems.Count){throw "Supplemental obligation mismatch: $($problems -join '; ')"}
if(-not $PSCmdlet.ShouldProcess($OutputDirectory,'Convert verified real Realtime, complete player matrix and strict UI reports')){return}
[void](New-Item -ItemType Directory -Path $output -Force)
$reports=@(foreach($entry in $verified){
 $trx=Join-Path $output ($entry.kind+'.trx')
 & pwsh -NoProfile -NonInteractive -File (Join-Path $PSScriptRoot 'Convert-JUnitToTrx.ps1') -InputPath $entry.junit -OutputPath $trx -SourceRevision $revision -HostName $entry.run.hostName | Out-Null
 if($LASTEXITCODE){throw 'Supplemental TRX conversion failed.'}
 [xml]$xml=[IO.File]::ReadAllText($trx)
 $results=@($xml.SelectNodes('//*[local-name()="UnitTestResult"]'))
 if($results.Count -ne $entry.cases -or @($results|Where-Object outcome -NE 'Passed').Count){throw 'Supplemental TRX outcome mismatch.'}
 if((Get-FileHash $entry.junit).Hash -cne $entry.run.junitSha256){throw 'Supplemental JUnit changed during conversion.'}
 [pscustomobject]@{kind=$entry.kind;cases=$entry.cases;failed=0;skipped=0;junit=$entry.junit;junitSha256=(Get-FileHash $entry.junit).Hash;trx=$trx;trxSha256=(Get-FileHash $trx).Hash;run=$entry.run}
})
if((& git -C $root rev-parse HEAD).Trim() -cne $revision -or (Get-FileHash $sourceFile).Hash -cne $sourceHash -or (Get-FileHash $manifestFile).Hash -cne $manifestHash){throw 'Source/invocation identity changed during preparation.'}
if(@(& git -C $root status --short -- src tests scripts public package.json package-lock.json tsconfig.json next.config.ts biome.json 'vitest*.config.ts' 'playwright*.config.ts').Count){throw 'Source became dirty during supplemental preparation.'}
[pscustomobject]@{timestamp=(Get-Date -Format s);runId=$manifest.runId;revision=$revision;sourceInventory=$sourceFile;sourceInventorySha256=$sourceHash;invocationManifest=$manifestFile;invocationManifestSha256=$manifestHash;expectedCounts=@{realtime=$ExpectedRealtimeCount;'live-ui'=9;'strict-ui'=1};reports=$reports;qualification='Native producer reports establish the executed assertions; conversion does not establish physical devices, hosting or disk durability.'}|ConvertTo-Json -Depth 12|Set-Content $indexPath
