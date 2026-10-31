#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Protect','Verify','mock','real','Prior','Checks')][string]$Mode='Protect',[string]$File)
$ErrorActionPreference='Stop'
$repo='<repo>'
$dir=Join-Path $repo 'docs/evidence/release15/strict-entry'
$protected=@('tests/browser/ui-command-acknowledgement.ts','tests/browser/ui-command-capture.ts','tests/browser/live-multiplayer.integration.spec.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/ui-command-freshness.contract.ts','tests/browser/ui-command-freshness.test.ts','tests/browser/ui-command-retirement.contract.ts','tests/browser/ui-command-retirement.test.ts','tests/browser/ui-command-acknowledgement.contract.ts','tests/browser/ui-command-acknowledgement.test.ts','tests/browser/ui-command-capture.contract.ts','tests/browser/ui-command-capture.test.ts')
$new=@('tests/browser/ui-command-entry.contract.ts','tests/browser/ui-command-entry.phase6.spec.ts','tests/browser/ui-command-entry.ts','playwright.ui-command.config.ts')
function Copy-EntryPin([string]$Relative,[string]$Target){$path=Join-Path $repo $Relative;$hash=(Get-FileHash -LiteralPath $path).Hash;Copy-Item -LiteralPath $path -Destination $Target;if((Get-FileHash -LiteralPath $Target).Hash -cne $hash -or (Get-FileHash -LiteralPath $path).Hash -cne $hash){throw 'Entry source copy differs'};[ordered]@{path=$Relative;sha256=$hash;copy=$Target}}
function Get-EntryDelta {$before=Get-Content -LiteralPath (Join-Path $dir 'protected-source.json') -Raw|ConvertFrom-Json;@($before.files|Where-Object {(Get-FileHash -LiteralPath (Join-Path $repo $_.path)).Hash -cne $_.sha256})}
if(-not $PSCmdlet.ShouldProcess($dir,"$Mode focused actual-DOM entry evidence, no live runtime or build")){return}
if($Mode -eq 'Protect'){
 $out=Join-Path $dir 'before';if(Test-Path -LiteralPath $out){throw 'Retain existing protected sources'};[void](New-Item -ItemType Directory -Path $out)
 $pins=@(foreach($path in $protected){Copy-EntryPin $path (Join-Path $out ([IO.Path]::GetFileName($path)))})
 [ordered]@{atLocal=(Get-Date -Format s);head=(& git -C $repo rev-parse HEAD).Trim();planSha256=(Get-FileHash -LiteralPath (Join-Path $dir 'plan.md')).Hash;files=$pins}|ConvertTo-Json -Depth 7|Set-Content -LiteralPath (Join-Path $dir 'protected-source.json');return
}
if($Mode -eq 'Verify'){
 if(-not $File){throw 'TS path required'}
 $plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0';$env:MCP_CACHE_DIR_OVERRIDE='/tmp/wordpairs-release-selfcheck-codex';$env:MCP_WORKSPACE_PATH=$repo;$env:CODEX_WORKSPACE_PATH=$repo
 $out=Join-Path $dir 'edit-verification';[void](New-Item -ItemType Directory -Path $out -Force);$log=Join-Path $out ((Get-Date -Format yyyyMMddTHHmmss)+'-'+[IO.Path]::GetFileName($File)+'.log')
 Push-Location $repo
 try{
  @{tool_name='Edit';tool_input=@{file_path=(Join-Path $repo $File)}}|ConvertTo-Json -Compress|& pwsh -NoProfile -NonInteractive -File (Join-Path $plugin 'lib/code-verify.ps1') *> $log;$hook=$LASTEXITCODE
  & npm exec tsc -- --noEmit --pretty false *>> $log;$tsc=$LASTEXITCODE
  [ordered]@{atLocal=(Get-Date -Format s);file=$File;sha256=(Get-FileHash -LiteralPath $File).Hash;hookExit=$hook;typecheckExit=$tsc;log=$log}|ConvertTo-Json|Set-Content -LiteralPath ($log+'.json');Get-Content -LiteralPath ($log+'.json') -Raw
  if($hook -or $tsc){Get-Content -LiteralPath $log|Select-Object -Last 30;throw 'Immediate hook/tsc failure; resolve before next edit'}
 }finally{Pop-Location};return
}
if($Mode -in 'mock','real'){
 $delta=@(Get-EntryDelta);if($Mode -eq 'mock' -and $delta.Count){throw 'Mock must precede implementation changes'}
 $out=Join-Path $dir ($Mode+'-'+(Get-Date -Format yyyyMMddTHHmmss));[void](New-Item -ItemType Directory -Path $out)
 $prior=$env:WORDPAIRS_UI_ENTRY_BINDING;$priorXml=$env:PLAYWRIGHT_JUNIT_OUTPUT_FILE;$env:WORDPAIRS_UI_ENTRY_BINDING=$Mode;$env:PLAYWRIGHT_JUNIT_OUTPUT_FILE=Join-Path $out 'browser.xml'
 $argsList=@('exec','playwright','--','test','--config=playwright.ui-command.config.ts','--reporter=line,junit');$started=Get-Date -Format s
 Push-Location $repo;try{& npm @argsList *> (Join-Path $out 'browser.log');$exit=$LASTEXITCODE}finally{Pop-Location;$env:WORDPAIRS_UI_ENTRY_BINDING=$prior;$env:PLAYWRIGHT_JUNIT_OUTPUT_FILE=$priorXml}
 [xml]$native=Get-Content -LiteralPath (Join-Path $out 'browser.xml') -Raw;$cases=@($native.SelectNodes('//testcase'));$failed=@($native.SelectNodes('//failure|//error')).Count;$skipped=@($native.SelectNodes('//skipped')).Count;$negative=@($cases|Where-Object name -Like '*rejects wrong*').Count
 $pins=@(foreach($path in @($protected+$new)|Where-Object {Test-Path -LiteralPath (Join-Path $repo $_)}){Copy-EntryPin $path (Join-Path $out ([IO.Path]::GetFileName($path)))})
 Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $out 'producer.ps1')
 [ordered]@{startedAtLocal=$started;finishedAtLocal=(Get-Date -Format s);binding=$Mode;head=(& git -C $repo rev-parse HEAD).Trim();executable='npm';arguments=$argsList;exitCode=$exit;cases=$cases.Count;failed=$failed;skipped=$skipped;expectedNegative=$negative;protectedSourceChanges=@(Get-EntryDelta|ForEach-Object path);sourcePins=$pins;producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;junitSha256=(Get-FileHash -LiteralPath (Join-Path $out 'browser.xml')).Hash;qualification='Actual isolated Playwright DOM, no product server/provider/network game/strict push proof.'}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $out 'receipt.json')
 Get-Content -LiteralPath (Join-Path $out 'browser.log')|Select-Object -Last 35;Get-Content -LiteralPath (Join-Path $out 'receipt.json') -Raw
 if($exit -or $failed -or $skipped -or $cases.Count -ne 28 -or $negative -ne 14){throw 'Actual DOM gate failed; preserve original receipt'};return
}
if($Mode -eq 'Prior'){
 $out=Join-Path $dir ('prior-'+(Get-Date -Format yyyyMMddTHHmmss));[void](New-Item -ItemType Directory -Path $out)
 Push-Location $repo;try{& npm exec vitest -- run tests/browser/ui-command-freshness.test.ts tests/browser/ui-command-retirement.test.ts tests/browser/ui-command-acknowledgement.test.ts tests/browser/ui-command-capture.test.ts --maxWorkers=4 --reporter=default --reporter=junit ('--outputFile.junit='+ (Join-Path $out 'unit.xml')) *> (Join-Path $out 'unit.log');$exit=$LASTEXITCODE}finally{Pop-Location}
 [xml]$native=Get-Content -LiteralPath (Join-Path $out 'unit.xml') -Raw;$cases=@($native.SelectNodes('//testcase'));$failed=@($native.SelectNodes('//failure|//error')).Count;$skipped=@($native.SelectNodes('//skipped')).Count
 [ordered]@{atLocal=(Get-Date -Format s);exitCode=$exit;cases=$cases.Count;failed=$failed;skipped=$skipped;priorOracleChanges=@(Get-EntryDelta|Where-Object path -Match 'contract\.ts$|\.test\.ts$'|ForEach-Object path);junitSha256=(Get-FileHash -LiteralPath (Join-Path $out 'unit.xml')).Hash}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $out 'receipt.json');Get-Content -LiteralPath (Join-Path $out 'receipt.json') -Raw
 if($exit -or $failed -or $skipped -or $cases.Count -ne 210){throw 'Prior210 gate failed'};return
}
$out=Join-Path $dir ('source-check-'+(Get-Date -Format yyyyMMddTHHmmss));[void](New-Item -ItemType Directory -Path $out)
$files=@($new+'tests/browser/ui-command-acknowledgement.ts'+'tests/browser/live-multiplayer.integration.spec.ts')
Push-Location $repo
try{
 & npm exec biome -- lint --max-diagnostics=200 @files *> (Join-Path $out 'biome.log');$lint=$LASTEXITCODE
 & git diff --check -- @files *> (Join-Path $out 'diff.log');$diff=$LASTEXITCODE
 & npm exec tsc -- --noEmit --pretty false *> (Join-Path $out 'tsc.log');$tsc=$LASTEXITCODE
 [ordered]@{atLocal=(Get-Date -Format s);lintExit=$lint;diffExit=$diff;typecheckExit=$tsc;files=@($files|ForEach-Object {[ordered]@{path=$_;sha256=(Get-FileHash -LiteralPath $_).Hash}});priorOracleChanges=@(Get-EntryDelta|Where-Object path -Match 'contract\.ts$|\.test\.ts$'|ForEach-Object path);editChecks=@(Get-ChildItem -LiteralPath (Join-Path $dir 'edit-verification') -Filter '*.json'|ForEach-Object {Get-Content -LiteralPath $_.FullName -Raw|ConvertFrom-Json})}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $dir 'source-check.json')
 Get-Content -LiteralPath (Join-Path $out 'biome.log')|Select-Object -Last 25;Get-Content -LiteralPath (Join-Path $dir 'source-check.json') -Raw
 if($lint -or $diff -or $tsc){throw 'Final scoped checks failed'}
}finally{Pop-Location}
