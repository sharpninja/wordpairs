#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$dir=Join-Path $repo 'docs/evidence/release15/ui-acknowledgement'
if(-not $PSCmdlet.ShouldProcess($dir,'Run source-only Biome/scoped diff and retain final acknowledgement inspection')){return}
$files=@('tests/browser/ui-command-acknowledgement.contract.ts','tests/browser/ui-command-acknowledgement.test.ts','tests/browser/ui-command-acknowledgement.ts','tests/browser/ui-command-capture.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/live-multiplayer.integration.spec.ts')
Push-Location $repo
try{
 & npm exec biome -- lint @files *> (Join-Path $dir 'source-lint.log');$lint=$LASTEXITCODE
 & git diff --check -- @files *> (Join-Path $dir 'source-diff-check.log');$diff=$LASTEXITCODE
 & git diff -- tests/browser/ui-command-capture.ts tests/browser/live-player-counts.integration.spec.ts tests/browser/live-multiplayer.integration.spec.ts *> (Join-Path $dir 'integration-adoption.diff');$adoption=$LASTEXITCODE
 & rg -n 'waitForRequest|captureUiCommand|commitUiCommand|awaitCommandUi|assertPageOwnRoundSolve|attempt <|commandAcknowledgements|solves\+\+' @files *> (Join-Path $dir 'callsite-sweep.log');$sweep=$LASTEXITCODE
 $pins=@(foreach($file in $files){[pscustomobject]@{path=$file;sha256=(Get-FileHash -LiteralPath (Join-Path $repo $file)).Hash}})
 [ordered]@{timestamp=(Get-Date -Format s);lintExitCode=$lint;sourceDiffCheckExitCode=$diff;adoptionDiffExitCode=$adoption;callsiteSweepExitCode=$sweep;sourcePins=$pins;newUnitCases=66;priorCaptureCases=58;actualUiRun=$false;buildRun=$false;qualification='Source-only and isolated focused contract evidence; parent owns frozen full tests/build/actual UI/HV. Native failed fdee8/1/5 and all original receipts retained.'}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $dir 'source-check.json')
 Get-Content -LiteralPath (Join-Path $dir 'source-check.json') -Raw
 if($lint){Get-Content -LiteralPath (Join-Path $dir 'source-lint.log')|Select-Object -Last 100}
 if($diff){Get-Content -LiteralPath (Join-Path $dir 'source-diff-check.log') -Raw}
 if($lint -or $diff -or $adoption -or $sweep){throw 'Scoped source checks failed; preserve receipt before correction'}
}finally{Pop-Location}
