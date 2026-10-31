#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$dir=Join-Path $repo 'docs/evidence/release15/command-capture'
if(-not $PSCmdlet.ShouldProcess($dir,'Run source-only Biome/scoped diff and preserve final static inspection evidence')){return}
$files=@('tests/browser/ui-command-capture.contract.ts','tests/browser/ui-command-capture.test.ts','tests/browser/ui-command-capture.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/live-multiplayer.integration.spec.ts')
Push-Location $repo
try{
 & npm exec biome -- lint @files *> (Join-Path $dir 'source-lint-final.log');$lint=$LASTEXITCODE
 & git diff --check -- @files *> (Join-Path $dir 'source-diff-check-final.log');$diff=$LASTEXITCODE
 & git diff -- tests/browser/live-player-counts.integration.spec.ts tests/browser/live-multiplayer.integration.spec.ts *> (Join-Path $dir 'integration-adoption-final.diff')
 $diffCaptureExit=$LASTEXITCODE
 & rg -n 'waitForRequest|waitForResponse|captureUiCommand|commitUiCommand|result.json|response.json|setTimeout|attempt <|commandBodyFailures' tests/browser/live-player-counts.integration.spec.ts tests/browser/live-multiplayer.integration.spec.ts *> (Join-Path $dir 'callsite-sweep-final.log')
 $sweep=$LASTEXITCODE
 $pins=@(foreach($file in $files){[pscustomobject]@{path=$file;sha256=(Get-FileHash -LiteralPath (Join-Path $repo $file)).Hash}})
 [ordered]@{timestamp=(Get-Date -Format s);lintExitCode=$lint;sourceDiffCheckExitCode=$diff;diffCaptureExitCode=$diffCaptureExit;callsiteSweepExitCode=$sweep;sourcePins=$pins;unitDelta=58;actualUiRun=$false;buildRun=$false;qualification='Source-only inspection and focused isolated contract evidence. Full source test/build/actual UI acceptance remains owned by parent after freeze. Initial source-check.json retained unchanged as V1 evidence.'}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $dir 'source-check-final.json')
 Get-Content -LiteralPath (Join-Path $dir 'source-check-final.json') -Raw
 if($lint){Get-Content -LiteralPath (Join-Path $dir 'source-lint-final.log')|Select-Object -Last 100}
 if($diff){Get-Content -LiteralPath (Join-Path $dir 'source-diff-check-final.log') -Raw}
 if($lint -or $diff -or $diffCaptureExit -or $sweep){throw 'Scoped source checks failed; native receipts retained'}
}finally{Pop-Location}
