#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
$root='<repo>'
if(-not $PSCmdlet.ShouldProcess($ReportDirectory,'Validate cleanup contract correct and intentionally wrong providers before implementation')){return}
[void][IO.Directory]::CreateDirectory($ReportDirectory)
$runs=@()
Push-Location $root
try{
 foreach($provider in @('correct','wrong-silent-failure','wrong-no-readback','wrong-identity')){
  $env:WORDPAIRS_CLEANUP_FIXTURE=$provider
  $xml=Join-Path $ReportDirectory "$provider.xml"
  & npm exec vitest -- run tests/application/live-scale-cleanup.test.ts --maxWorkers=1 --reporter=default --reporter=junit "--outputFile.junit=$xml" *>&1 | Tee-Object (Join-Path $ReportDirectory "$provider.log")
  $code=$LASTEXITCODE
  [xml]$report=Get-Content -LiteralPath $xml -Raw
  $cases=@($report.SelectNodes('//testcase'))
  $failed=@($cases|Where-Object {$_.SelectSingleNode('failure|error')})
  $skipped=@($cases|Where-Object {$_.SelectSingleNode('skipped')})
  if($cases.Count -ne 10 -or $skipped.Count){throw 'Incomplete cleanup contract fixture run'}
  if($provider -eq 'correct' -and ($code -ne 0 -or $failed.Count)){throw 'Correct cleanup fixture did not satisfy contract'}
  if($provider -ne 'correct' -and ($code -eq 0 -or -not $failed.Count)){throw "Wrong cleanup fixture escaped assertions: $provider"}
  $runs+=@{provider=$provider;exitCode=$code;tests=$cases.Count;rejections=$failed.Count;skipped=$skipped.Count;sha256=(Get-FileHash $xml).Hash}
 }
 $paths=@('tests/application/live-scale-cleanup.test.ts','tests/application/live-scale-cleanup-fixture.ts')
 @{timestamp=(Get-Date -Format s);requirement='TEST-ROOMSYNC-139#LIVE-07 truthful bounded cleanup';qualification='Correct fixture assertions pass; nonzero wrong-provider test exits are expected discriminating negative controls, not production-suite failures.';inputs=@($paths|ForEach-Object {@{path=$_;sha256=(Get-FileHash $_).Hash}});runs=$runs}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $ReportDirectory 'mock-gate.json')
}finally{Remove-Item Env:WORDPAIRS_CLEANUP_FIXTURE -ErrorAction SilentlyContinue;Pop-Location}
