#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$Revision,[Parameter(Mandatory)][string]$Directory)
$ErrorActionPreference='Stop'
$root='<repo>'
$Directory=[IO.Path]::GetFullPath($Directory)
if(-not $PSCmdlet.ShouldProcess($Directory,'Collect independently expanded test inventories and save the source manifest before execution')){return}
if((& git -C $root rev-parse HEAD).Trim() -cne $Revision){throw 'Unexpected source revision'}
if(@(& git -C $root status --short -- src tests scripts public package.json package-lock.json tsconfig.json next.config.ts biome.json 'vitest*.config.ts' 'playwright*.config.ts').Count){throw 'Source must be committed before collection'}
if(Test-Path -LiteralPath $Directory){throw 'A fresh collection directory is required; retain interrupted inventories'}

$null=New-Item -ItemType Directory -Path $Directory -Force
& pwsh -NoProfile -NonInteractive -File (Join-Path $root 'scripts/Get-CandidateSourceManifest.ps1') -Root $root -OutputPath (Join-Path $Directory 'source-inventory.json')
if($LASTEXITCODE){throw 'Source manifest failed'}
$oldDatabaseUrl=$env:WORDPAIRS_TEST_DATABASE_URL
Push-Location $root
try{
 $unitArguments=@('exec','vitest','--','list',('--json='+(Join-Path $Directory 'unit-inventory.json')),'--staticParse=false','--maxWorkers=4')
 & npm @unitArguments
 if($LASTEXITCODE){throw 'Expanded unit collection failed'}
 $env:WORDPAIRS_TEST_DATABASE_URL='postgresql://inventory:inventory@127.0.0.1:9/inventory'
 $postgresArguments=@('exec','vitest','--','list','--config','vitest.postgres.config.ts',('--json='+(Join-Path $Directory 'postgres-inventory.json')),'--staticParse=false','--maxWorkers=4')
 & npm @postgresArguments
 if($LASTEXITCODE){throw 'Expanded PostgreSQL collection failed'}
 $browser=& npm exec playwright -- test --config=playwright.pwa.config.ts --list 2>&1
 if($LASTEXITCODE){throw 'Browser test collection failed'}
 $browser|Set-Content (Join-Path $Directory 'browser-inventory.txt')
 $totals=@($browser|Select-String 'Total:\s*(\d+)\s+tests?\s+in\s+(\d+)\s+files?')
 if($totals.Count -ne 1){throw 'Expected one browser collection total'}
 if((& git -C $root rev-parse HEAD).Trim() -cne $Revision -or @(& git -C $root status --short -- src tests scripts public package.json package-lock.json tsconfig.json next.config.ts biome.json 'vitest*.config.ts' 'playwright*.config.ts').Count){throw 'Frozen source changed during inventory collection'}
 & pwsh -NoProfile -NonInteractive -File (Join-Path $root 'scripts/Get-CandidateSourceManifest.ps1') -Root $root -OutputPath (Join-Path $Directory 'source-after-collection.json')
 if($LASTEXITCODE){throw 'Post-collection source manifest failed'}
 $sourceBefore=Get-Content -LiteralPath (Join-Path $Directory 'source-inventory.json') -Raw|ConvertFrom-Json
 $sourceAfter=Get-Content -LiteralPath (Join-Path $Directory 'source-after-collection.json') -Raw|ConvertFrom-Json
 $sourceDifference=@(Compare-Object @($sourceBefore.sourceHashes|ForEach-Object {$_.path+':'+$_.sha256}) @($sourceAfter.sourceHashes|ForEach-Object {$_.path+':'+$_.sha256}))
 if($sourceBefore.revision -cne $Revision -or $sourceAfter.revision -cne $Revision -or $sourceDifference.Count){throw 'Source changed during test collection'}
 $unit=@(Get-Content -Raw (Join-Path $Directory 'unit-inventory.json')|ConvertFrom-Json).Count
 $postgres=@(Get-Content -Raw (Join-Path $Directory 'postgres-inventory.json')|ConvertFrom-Json).Count
 $browserCount=[int]$totals[0].Matches[0].Groups[1].Value
 if($unit -le 0 -or $postgres -le 0 -or $browserCount -le 0){throw 'Empty test inventory'}
 [pscustomobject]@{timestamp=(Get-Date -Format s);runId=[guid]::NewGuid().ToString('D');revision=$Revision;expectedUnitCount=$unit;expectedPostgresCount=$postgres;expectedBrowserCount=$browserCount;expectedRealtimeCount=4;expectedMatrixCount=9;expectedStrictCount=1;producer=$PSCommandPath;producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;unitInventorySha256=(Get-FileHash -LiteralPath (Join-Path $Directory 'unit-inventory.json')).Hash;postgresInventorySha256=(Get-FileHash -LiteralPath (Join-Path $Directory 'postgres-inventory.json')).Hash;qualification='Test collection, not execution. Source manifests recorded before and after test collection; no test execution.'}|ConvertTo-Json -Depth 5|Set-Content (Join-Path $Directory 'expected-inventory.json')
 "Collected unit=$unit postgres=$postgres browser=$browserCount"
}finally{$env:WORDPAIRS_TEST_DATABASE_URL=$oldDatabaseUrl;Pop-Location}
