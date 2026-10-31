#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$dir=Join-Path $repo 'docs/evidence/release15/conflict-retirement'
$files=@('tests/browser/ui-command-retirement.contract.ts','tests/browser/ui-command-retirement.test.ts','tests/browser/ui-command-acknowledgement.contract.ts','tests/browser/ui-command-acknowledgement.test.ts','tests/browser/ui-command-acknowledgement.ts','tests/browser/ui-command-capture.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/live-multiplayer.integration.spec.ts')
if(-not $PSCmdlet.ShouldProcess($dir,'Run scoped source lint/diff/typecheck and retain exact current source proof')){return}
$stamp=Get-Date -Format yyyyMMddTHHmmss
$lint=Join-Path $dir "$stamp-biome.log";$diff=Join-Path $dir "$stamp-diff.log";$tsc=Join-Path $dir "$stamp-tsc.log"
Push-Location $repo
try{
 & npm exec biome -- lint --max-diagnostics=200 @files *> $lint;$lintExit=$LASTEXITCODE
 & git diff --check -- @files *> $diff;$diffExit=$LASTEXITCODE
 & npm exec tsc -- --noEmit --pretty false *> $tsc;$typeExit=$LASTEXITCODE
 $mock=Get-Content -LiteralPath (Join-Path $dir 'mock-20261030T192055/receipt.json') -Raw|ConvertFrom-Json
 $real=Get-Content -LiteralPath (Join-Path $dir 'real-20261030T192330/receipt.json') -Raw|ConvertFrom-Json
 $oldProvider=Get-Content -LiteralPath (Join-Path $dir 'mock-20261030T192055/ui-command-acknowledgement.test.ts') -Raw
 $newProvider=Get-Content -LiteralPath tests/browser/ui-command-acknowledgement.test.ts -Raw
 $providerOnlyForwarding=$newProvider.Replace('options.retired(response)','options.retired()') -ceq $oldProvider
 $oldContract=Get-Content -LiteralPath (Join-Path $dir 'mock-20261030T192055/ui-command-acknowledgement.contract.ts') -Raw
 $newContract=Get-Content -LiteralPath tests/browser/ui-command-acknowledgement.contract.ts -Raw
 $contractOnlyTypes=$newContract.Replace(' | "retire"','').Replace('retired(command: CapturedCommand)','retired()') -ceq $oldContract
 $same=@('ui-command-retirement.contract.ts','ui-command-retirement.test.ts')|ForEach-Object {
  $name=$_;$m=@($mock.sourcePins|Where-Object {$_.path.EndsWith('/'+$name)})[0];$r=@($real.sourcePins|Where-Object {$_.path.EndsWith('/'+$name)})[0]
  [pscustomobject]@{path=$name;mockSha256=$m.sha256;realSha256=$r.sha256;identical=($m.sha256 -ceq $r.sha256);currentMatches=((Get-FileHash -LiteralPath (Join-Path $repo ('tests/browser/'+$name))).Hash -ceq $r.sha256)}
 }
 $pins=@(foreach($file in $files){[pscustomobject]@{path=$file;sha256=(Get-FileHash -LiteralPath $file).Hash}})
 $hooks=@(Get-ChildItem -LiteralPath (Join-Path $dir 'edit-verification') -Filter '*.log.json'|Sort-Object Name|ForEach-Object {Get-Content -LiteralPath $_.FullName -Raw|ConvertFrom-Json})
 $receipt=[ordered]@{recordedAt=(Get-Date -Format s);lintExit=$lintExit;diffExit=$diffExit;typecheckExit=$typeExit;lintLog=$lint;diffLog=$diff;typecheckLog=$tsc;sourcePins=$pins;sameOracle=@($same);priorCaseAssertionsAndInputsUnchanged=$providerOnlyForwarding;priorContractOnlyModeAndCallbackTypes=$contractOnlyTypes;old124FilesNotClaimedByteIdentical=$true;mockCases=$mock.cases;realCases=$real.cases;negativeControls=$real.negativeControls;newUnitDelta=38;expectedFullUnitCountInferenceOnly=846;editChecks=$hooks;retainedIntermediateTypecheckFailures=@($hooks|Where-Object typecheckExitCode -NE 0).Count;finalDirectTypecheckZero=($typeExit -eq 0);qualification='Focused test-only checks, not actual DOM/full runtime or HV. Intermediate type adaptation tsc errors are retained; final direct tsc is authoritative. Root owns full frozen collection and runtime lanes.'}
 $receipt|ConvertTo-Json -Depth 12|Set-Content -LiteralPath (Join-Path $dir 'source-check.json')
 Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $dir 'source-check-producer.ps1')
 Get-Content -LiteralPath $lint|Select-Object -Last 30
 [pscustomobject]@{lintExit=$lintExit;diffExit=$diffExit;typecheckExit=$typeExit;priorCaseAssertionsAndInputsUnchanged=$providerOnlyForwarding;priorContractOnlyTypes=$contractOnlyTypes;identicalOracle=@($same|Where-Object {-not $_.identical -or -not $_.currentMatches}).Count -eq 0;sourcePins=$pins}|ConvertTo-Json -Depth 5
 if($lintExit -or $diffExit -or $typeExit -or -not $providerOnlyForwarding -or -not $contractOnlyTypes -or @($same|Where-Object {-not $_.identical -or -not $_.currentMatches}).Count){throw 'Scoped source checks failed; retain actual receipt'}
}finally{Pop-Location}
