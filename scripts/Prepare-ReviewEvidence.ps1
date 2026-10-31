#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
 [Parameter(Mandatory)][string]$ReportDirectory,
 [Parameter(Mandatory)][string]$PowerShellDirectory,
 [Parameter(Mandatory)][string]$OutputDirectory,
 [Parameter(Mandatory)][string]$SourceInventoryPath,
 [Parameter(Mandatory)][ValidateRange(1,2147483647)][int]$ExpectedUnitCount,
 [Parameter(Mandatory)][ValidateRange(1,2147483647)][int]$ExpectedPostgresCount,
 [Parameter(Mandatory)][ValidateRange(1,2147483647)][int]$ExpectedBrowserCount,
 [switch]$LoadContractsOnly
)
$ErrorActionPreference='Stop'
function Get-ReviewPreparationProblem {
 [CmdletBinding()]
 param($Inventory,[string]$Revision,$SourceHashes,$ExpectedCounts,$Reports)
 if(-not $Revision -or $Inventory.revision -cne $Revision -or $Inventory.pathSetEqual -ne $true){'Inventory revision or verification mismatch'}
 $saved=@($Inventory.sourceHashes)
 if(-not $saved.Count -or $saved.Count -ne $Inventory.expectedCount -or $saved.Count -ne $Inventory.manifestCount -or $saved.Count -ne @($SourceHashes).Count){'Inventory path count mismatch'}
 foreach($source in $SourceHashes){
  $record=@($saved|Where-Object path -CEQ $source.path)
  if($record.Count -ne 1 -or $record[0].sha256 -cne $source.sha256){'Source inventory bytes mismatch'}
 }
 if(@($Reports).Count -ne 3){'Required report inventory mismatch'}
 foreach($name in @('unit','postgres','browser')){
  $expected=$ExpectedCounts[$name]
  if(($expected -isnot [int] -and $expected -isnot [long]) -or $expected -le 0){'Expected count must be an explicit positive integer'}
  $record=@($Reports|Where-Object name -CEQ $name)
  if($record.Count -ne 1){'Required unique report missing';continue}
  if($record[0].cases -ne $expected -or $record[0].failed -ne 0 -or $record[0].skipped -ne 0){'Report differs from expected inventory or includes failed/skipped cases'}
 }
}
function Get-ReviewSupplementalProblem {
 [CmdletBinding()]
 param($Reports,[int]$ExpectedRealtimeCount)
 if(@($Reports).Count -ne 3){'Supplemental report inventory mismatch'}
 foreach($kind in @('realtime','live-ui','strict-ui')){
  $record=@($Reports|Where-Object kind -CEQ $kind)
  if($record.Count -ne 1){'Unique supplemental lane missing';continue}
  $expected=@{realtime=$ExpectedRealtimeCount;'live-ui'=9;'strict-ui'=1}[$kind]
  if($expected -le 0 -or $record[0].cases -ne $expected -or $record[0].failed -ne 0 -or $record[0].skipped -ne 0){'Supplemental count/outcome mismatch'}
  if($kind -eq 'live-ui'){
   foreach($playerCount in 2..10){
    if(@($record[0].caseNames|Where-Object {$_ -ceq "LIVE-SCALE $playerCount real browser players complete eight UI rounds"}).Count -ne 1){'Missing or duplicate player-count assertion'}
   }
  }
  if($kind -eq 'strict-ui' -and (@($record[0].caseNames).Count -ne 1 -or $record[0].caseNames[0] -cne 'LIVE real two-player and observer UI: private push, all eight rounds, autonomous deadlines, renewal and reconnect')){'Strict private-push journey mismatch'}
 }
}
if($LoadContractsOnly){return}
$root=Split-Path $PSScriptRoot
Import-Module (Join-Path $PSScriptRoot 'ReviewRunProvenance.psm1') -Force
$report=[IO.Path]::GetFullPath($ReportDirectory)
$powershellReport=[IO.Path]::GetFullPath($PowerShellDirectory)
$output=[IO.Path]::GetFullPath($OutputDirectory)
$revision=(& git -C $root rev-parse HEAD).Trim()
$validation=[IO.File]::ReadAllText((Join-Path $report 'validation.json'))|ConvertFrom-Json
$powershell=[IO.File]::ReadAllText((Join-Path $powershellReport 'evidence.json'))|ConvertFrom-Json
if($validation.status -cne 'passed' -or $validation.revision -cne $revision -or $powershell.revision -cne $revision){throw 'Validation does not match current HEAD.'}
$dirty=@(& git -C $root status --short -- src tests scripts public package.json package-lock.json tsconfig.json next.config.ts biome.json 'vitest*.config.ts' 'playwright*.config.ts')
if($dirty.Count){throw 'Source is dirty after validation.'}
$inventoryFile=(Resolve-Path -LiteralPath $SourceInventoryPath).ProviderPath
$inventory=[IO.File]::ReadAllText($inventoryFile)|ConvertFrom-Json
$inventorySha256=(Get-FileHash -LiteralPath $inventoryFile).Hash
if($inventoryFile -ceq (Join-Path $output 'candidate-source-manifest.json') -or $inventoryFile -ceq (Join-Path $output 'evidence-index.json')){throw 'Output would overwrite the frozen source inventory.'}
$paths=@(& git -C $root ls-files --cached --others --exclude-standard | Where-Object {$_ -match '^(src|tests|scripts|public)/' -or $_ -match '^(package(-lock)?\.json|tsconfig\.json|next-env\.d\.ts|next\.config\.ts|biome\.json|vitest[^/]*\.config\.ts|playwright[^/]*\.config\.ts)$'} | Sort-Object -Unique)
if($LASTEXITCODE){throw 'Unable to enumerate current source inventory.'}
$currentHashes=@(foreach($path in $paths){[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath (Join-Path $root $path)).Hash}})
$expectations=@{unit=$ExpectedUnitCount;postgres=$ExpectedPostgresCount;browser=$ExpectedBrowserCount}
$catalog=@(
 @{name='unit';path=(Join-Path $report 'unit.xml');expected=$ExpectedUnitCount;run=@($validation.steps|Where-Object name -EQ 'unit')[0]}
 @{name='postgres';path=(Join-Path $report 'postgres.xml');expected=$ExpectedPostgresCount;run=@($validation.steps|Where-Object name -EQ 'postgres')[0]}
 @{name='browser';path=(Join-Path $report 'browser.xml');expected=$ExpectedBrowserCount;run=@($validation.steps|Where-Object name -EQ 'browser')[0]}
 @{name='planner-real';path=(Join-Path $powershellReport 'planner/real.xml');expected=8;producer=$true;run=@($powershell.reports|Where-Object name -EQ 'planner-real')[0]}
 @{name='planner-mock';path=(Join-Path $powershellReport 'planner/mock.xml');expected=8;producer=$true;run=@($powershell.reports|Where-Object name -EQ 'planner-mock')[0]}
 @{name='script-contracts';path=(Join-Path $powershellReport 'contracts/contracts.xml');expected=3;producer=$true;run=@($powershell.reports|Where-Object name -EQ 'contracts-contracts')[0]}
 @{name='docs-drift';path=(Join-Path $powershellReport 'docs/docs.xml');expected=22;producer=$true;run=@($powershell.reports|Where-Object name -EQ 'docs-docs')[0]}
 @{name='provenance';path=(Join-Path $powershellReport 'provenance/provenance.xml');expected=9;producer=$true;run=@($powershell.reports|Where-Object name -EQ 'provenance-provenance')[0]}
)
$checked=@(foreach($entry in $catalog){
 if(-not $entry.run -or -not $entry.run.runId -or -not $entry.run.hostName -or -not $entry.run.startedAt -or -not $entry.run.finishedAt){throw "Missing run provenance: $($entry.name)"}
 $expectedRunId=if($entry.producer){$powershell.runId}else{$validation.runId}
 $producer=$null;$receiptHash=''
 if($entry.producer){
  if(-not $entry.run.producerReceipt){throw "Missing producer receipt: $($entry.name)"}
  $producer=Get-Content $entry.run.producerReceipt -Raw|ConvertFrom-Json
  $receiptHash=(Get-FileHash $entry.run.producerReceipt).Hash
  if(-not $producer.producer -or (Get-FileHash $producer.producer).Hash -cne $producer.producerSha256){throw "Producer file hash mismatch: $($entry.name)"}
 }
 $reportedPath=if([IO.Path]::IsPathRooted($entry.run.junit)){$entry.run.junit}else{Join-Path $report $entry.run.junit}
 if([IO.Path]::GetFullPath($reportedPath) -cne [IO.Path]::GetFullPath($entry.path)){throw "Report path mismatch: $($entry.name)"}
 $problems=@(Get-ReviewRunProblem -Run $entry.run -ExpectedRunId $expectedRunId -ExpectedRevision $revision -ActualJUnitSha256 (Get-FileHash $entry.path).Hash -Receipt $producer -ActualReceiptSha256 $receiptHash)
 if($problems.Count){throw "Run provenance mismatch: $($entry.name): $($problems -join ', ')"}
 [xml]$xml=[IO.File]::ReadAllText($entry.path)
 $cases=@($xml.SelectNodes('//testcase'))
 $bad=@($cases|Where-Object {$_.SelectSingleNode('failure|error|skipped')})
 if($cases.Count -ne $entry.expected -or $bad.Count){throw "Invalid JUnit $($entry.name): cases=$($cases.Count), expected=$($entry.expected), failedOrSkipped=$($bad.Count)"}
 $entry
})
$summaries=@(foreach($entry in @($checked|Where-Object {-not $_.producer})){
 [xml]$xml=[IO.File]::ReadAllText($entry.path)
 [pscustomobject]@{name=$entry.name;cases=@($xml.SelectNodes('//testcase')).Count;failed=@($xml.SelectNodes('//testcase/failure|//testcase/error')).Count;skipped=@($xml.SelectNodes('//testcase/skipped')).Count}
})
$inventoryProblems=@(Get-ReviewPreparationProblem -Inventory $inventory -Revision $revision -SourceHashes $currentHashes -ExpectedCounts $expectations -Reports $summaries)
if($inventoryProblems.Count){throw "Frozen inventory mismatch: $($inventoryProblems -join '; ')"}
if(-not $PSCmdlet.ShouldProcess($output,'Convert verified reports and bind per-run provenance to the source manifest')){return}
$null=New-Item -ItemType Directory -Path $output -Force
$manifest=Join-Path $output 'candidate-source-manifest.json'
& pwsh -NoProfile -NonInteractive -File (Join-Path $root 'scripts/Get-CandidateSourceManifest.ps1') -Root $root -OutputPath $manifest | Out-Null
if($LASTEXITCODE){throw 'Source manifest generation failed.'}
$manifestBody=Get-Content $manifest -Raw|ConvertFrom-Json
if($manifestBody.revision -cne $revision -or -not $manifestBody.pathSetEqual){throw 'Source manifest mismatch.'}
$afterInventoryProblems=@(Get-ReviewPreparationProblem -Inventory $inventory -Revision $revision -SourceHashes $manifestBody.sourceHashes -ExpectedCounts $expectations -Reports $summaries)
if($afterInventoryProblems.Count){throw 'Source bytes changed between inventory validation and conversion.'}
$converted=@(foreach($entry in $checked){
 $trx=Join-Path $output ($entry.name+'.trx')
 & pwsh -NoProfile -NonInteractive -File (Join-Path $root 'scripts/Convert-JUnitToTrx.ps1') -InputPath $entry.path -OutputPath $trx -SourceRevision $revision | Out-Null
 if($LASTEXITCODE){throw "TRX conversion failed for $($entry.name)"}
 [xml]$trxXml=Get-Content $trx -Raw
 $results=@($trxXml.SelectNodes('//*[local-name()="UnitTestResult"]'))
 if($results.Count -ne $entry.expected -or @($results|Where-Object outcome -NE 'Passed').Count){throw "TRX mismatch for $($entry.name)"}
 if((Get-FileHash $entry.path).Hash -cne $entry.run.junitSha256){throw "JUnit changed during conversion: $($entry.name)"}
 if($entry.producer -and (Get-FileHash $entry.run.producerReceipt).Hash -cne $entry.run.producerReceiptSha256){throw "Producer receipt changed during conversion: $($entry.name)"}
 [pscustomobject]@{name=$entry.name;junit=$entry.path;junitSha256=(Get-FileHash $entry.path).Hash;trx=$trx;trxSha256=(Get-FileHash $trx).Hash;cases=$entry.expected;failed=0;skipped=0;run=$entry.run}
})
if((& git -C $root rev-parse HEAD).Trim() -cne $revision){throw 'HEAD changed during evidence preparation.'}
if(@(& git -C $root status --short -- src tests scripts public package.json package-lock.json tsconfig.json next.config.ts biome.json 'vitest*.config.ts' 'playwright*.config.ts').Count){throw 'Source became dirty during evidence preparation.'}
if((Get-FileHash -LiteralPath $inventoryFile).Hash -cne $inventorySha256){throw 'Frozen inventory changed during evidence preparation.'}
[pscustomobject]@{timestamp=(Get-Date -Format s);revision=$revision;sourceInventory=$inventoryFile;sourceInventorySha256=$inventorySha256;expectedCounts=$expectations;sourceManifest=$manifest;sourceManifestSha256=(Get-FileHash $manifest).Hash;sourcePathCount=$manifestBody.expectedCount;reports=$converted}|ConvertTo-Json -Depth 12|Set-Content (Join-Path $output 'evidence-index.json')
