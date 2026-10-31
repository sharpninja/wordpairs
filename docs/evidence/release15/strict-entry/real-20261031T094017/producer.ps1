#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][ValidateSet('Edit','mock','real','Prior','Checks')][string]$Mode,[string]$File)
$ErrorActionPreference='Stop'
$repo='<repo>'
$root=Join-Path $repo 'docs/evidence/release15/strict-entry'
if(-not $PSCmdlet.ShouldProcess($repo,"$Mode source-slice checks only")){return}
$out=Join-Path $root ($Mode+'-'+(Get-Date -Format yyyyMMddTHHmmss))
[void][IO.Directory]::CreateDirectory($out)
Push-Location $repo
try{
 if($Mode -eq 'Edit'){
  & /tmp/StrictEntrySession.ps1 -Operation Hook -FilePath (Join-Path $repo $File) *> (Join-Path $out 'hook.log');$hook=$LASTEXITCODE
  & npm exec tsc -- --noEmit --pretty false *> (Join-Path $out 'tsc.log');$tsc=$LASTEXITCODE
  [ordered]@{atLocal=(Get-Date -Format s);file=$File;sha256=(Get-FileHash $File).Hash;hookExit=$hook;typecheckExit=$tsc}|ConvertTo-Json|Set-Content (Join-Path $out 'receipt.json')
  Get-Content (Join-Path $out 'receipt.json') -Raw
  if($hook -or $tsc){Get-Content (Join-Path $out 'tsc.log');Get-Content (Join-Path $out 'hook.log');throw 'Immediate edit verification failed'}
 }elseif($Mode -in 'mock','real'){
  $env:WORDPAIRS_BROWSER_PATH='/usr/bin/chromium';$env:WORDPAIRS_UI_ENTRY_BINDING=$Mode;$env:PLAYWRIGHT_JUNIT_OUTPUT_FILE=Join-Path $out 'browser.xml'
  & npm exec playwright -- test --config=playwright.ui-command.config.ts --reporter=line,junit *> (Join-Path $out 'browser.log');$exit=$LASTEXITCODE
  [xml]$xml=Get-Content $env:PLAYWRIGHT_JUNIT_OUTPUT_FILE -Raw
  $cases=@($xml.SelectNodes('//testcase'));$failed=@($xml.SelectNodes('//failure|//error')).Count;$skipped=@($xml.SelectNodes('//skipped')).Count
  $pins=@(Get-ChildItem tests/browser/ui-command-entry* | ForEach-Object {[ordered]@{path=$_.FullName;sha256=(Get-FileHash $_).Hash}})
  foreach($pin in $pins){$dest=Join-Path $out ([IO.Path]::GetFileName($pin.path));Copy-Item -LiteralPath $pin.path -Destination $dest;if((Get-FileHash $dest).Hash -cne $pin.sha256){throw 'Retained oracle differs'}}
  Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $out 'producer.ps1')
  [ordered]@{atLocal=(Get-Date -Format s);binding=$Mode;exitCode=$exit;cases=$cases.Count;failed=$failed;skipped=$skipped;names=@($cases|ForEach-Object name);pins=$pins;ackSha256=(Get-FileHash tests/browser/ui-command-acknowledgement.ts).Hash;strictSha256=(Get-FileHash tests/browser/live-multiplayer.integration.spec.ts).Hash;junitSha256=(Get-FileHash $env:PLAYWRIGHT_JUNIT_OUTPUT_FILE).Hash}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $out 'receipt.json')
  Get-Content (Join-Path $out 'browser.log')|Select-Object -Last 45
  Get-Content (Join-Path $out 'receipt.json') -Raw
  if($exit -or $failed -or $skipped -or $cases.Count -ne 28){throw 'Focused DOM gate failed'}
 }elseif($Mode -eq 'Prior'){
  & npm exec vitest -- run tests/browser/ui-command-freshness.test.ts tests/browser/ui-command-retirement.test.ts tests/browser/ui-command-acknowledgement.test.ts tests/browser/ui-command-capture.test.ts --maxWorkers=4 --reporter=default --reporter=junit ('--outputFile.junit='+(Join-Path $out 'unit.xml')) *> (Join-Path $out 'unit.log');$exit=$LASTEXITCODE
  [xml]$xml=Get-Content (Join-Path $out 'unit.xml') -Raw
  [ordered]@{atLocal=(Get-Date -Format s);exitCode=$exit;cases=@($xml.SelectNodes('//testcase')).Count;failed=@($xml.SelectNodes('//failure|//error')).Count;skipped=@($xml.SelectNodes('//skipped')).Count;junitSha256=(Get-FileHash (Join-Path $out 'unit.xml')).Hash}|ConvertTo-Json|Set-Content (Join-Path $out 'receipt.json')
  Get-Content (Join-Path $out 'receipt.json') -Raw
  if($exit){Get-Content (Join-Path $out 'unit.log');throw 'Prior oracle gate failed'}
 }else{
  & npm exec tsc -- --noEmit --pretty false *> (Join-Path $out 'tsc.log');$tsc=$LASTEXITCODE
  & npm exec biome -- lint --max-diagnostics=200 tests/browser/ui-command-entry.contract.ts tests/browser/ui-command-entry.phase6.spec.ts tests/browser/ui-command-entry.ts tests/browser/ui-command-acknowledgement.ts tests/browser/live-multiplayer.integration.spec.ts playwright.ui-command.config.ts *> (Join-Path $out 'lint.log');$lint=$LASTEXITCODE
  & git diff --check -- tests/browser playwright.ui-command.config.ts *> (Join-Path $out 'diff.log');$diff=$LASTEXITCODE
  [ordered]@{atLocal=(Get-Date -Format s);typecheckExit=$tsc;lintExit=$lint;diffExit=$diff}|ConvertTo-Json|Set-Content (Join-Path $out 'receipt.json')
  Get-Content (Join-Path $out 'receipt.json') -Raw
  if($tsc -or $lint -or $diff){Get-Content (Join-Path $out 'lint.log');throw 'Scoped checks failed'}
 }
}finally{Pop-Location}
