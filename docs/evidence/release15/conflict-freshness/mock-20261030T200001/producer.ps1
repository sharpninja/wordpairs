#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Protect','Verify','mock','real','Checks')][string]$Mode='Protect',[string]$File)
$ErrorActionPreference='Stop'
$repo='<repo>'
$dir=Join-Path $repo 'docs/evidence/release15/conflict-freshness'
$protected=@('ui-command-retirement.contract.ts','ui-command-retirement.test.ts','ui-command-acknowledgement.contract.ts','ui-command-acknowledgement.test.ts','ui-command-acknowledgement.ts','ui-command-capture.contract.ts','ui-command-capture.test.ts','ui-command-capture.ts','live-player-counts.integration.spec.ts','live-multiplayer.integration.spec.ts')
if(-not $PSCmdlet.ShouldProcess($dir,"$Mode focused freshness validation; no actual browser/build/provider")){return}
function Copy-Pin([string]$Source,[string]$Target){
 $before=(Get-FileHash -LiteralPath $Source).Hash
 Copy-Item -LiteralPath $Source -Destination $Target
 if((Get-FileHash -LiteralPath $Target).Hash -cne $before -or (Get-FileHash -LiteralPath $Source).Hash -cne $before){throw 'Retained source hash mismatch'}
 [pscustomobject]@{path=$Source;sha256=$before;copy=$Target}
}
function Get-ProtectedDelta {
 $baseline=Get-Content -LiteralPath (Join-Path $dir 'protected-source.json') -Raw|ConvertFrom-Json
 @($baseline.files|Where-Object {(Get-FileHash -LiteralPath $_.path).Hash -cne $_.sha256})
}
if($Mode -eq 'Protect'){
 $out=Join-Path $dir 'before';if(Test-Path -LiteralPath $out){throw 'Preserve original protected source'}
 [void](New-Item -ItemType Directory -Path $out)
 $pins=@(foreach($name in $protected){Copy-Pin (Join-Path $repo "tests/browser/$name") (Join-Path $out $name)})
 [ordered]@{atLocal=(Get-Date -Format s);head=(& git -C $repo rev-parse HEAD).Trim();files=$pins;planSha256=(Get-FileHash -LiteralPath (Join-Path $dir 'plan.md')).Hash}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $dir 'protected-source.json')
 Get-Content -LiteralPath (Join-Path $dir 'protected-source.json') -Raw
 return
}
if($Mode -eq 'Verify'){
 if(-not $File){throw 'Missing TS edit path'}
 $plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0'
 $env:MCP_CACHE_DIR_OVERRIDE='/tmp/wordpairs-release-selfcheck-codex';$env:MCP_WORKSPACE_PATH=$repo;$env:CODEX_WORKSPACE_PATH=$repo
 $out=Join-Path $dir 'edit-verification';[void](New-Item -ItemType Directory -Path $out -Force)
 $log=Join-Path $out ((Get-Date -Format yyyyMMddTHHmmss)+'-'+[IO.Path]::GetFileName($File)+'.log')
 Push-Location $repo
 try{
  @{tool_name='Edit';tool_input=@{file_path=(Join-Path $repo $File)}}|ConvertTo-Json -Compress|& pwsh -NoProfile -NonInteractive -File (Join-Path $plugin 'lib/code-verify.ps1') *> $log;$hook=$LASTEXITCODE
  & npm exec tsc -- --noEmit --pretty false *>> $log;$tsc=$LASTEXITCODE
  [ordered]@{atLocal=(Get-Date -Format s);file=$File;sha256=(Get-FileHash -LiteralPath $File).Hash;hookExit=$hook;typecheckExit=$tsc;log=$log}|ConvertTo-Json|Set-Content -LiteralPath ($log+'.json')
  Get-Content -LiteralPath ($log+'.json') -Raw
  if($hook -or $tsc){Get-Content -LiteralPath $log|Select-Object -Last 35;throw 'Immediate edit check failed; fix before next edit'}
 }finally{Pop-Location}
 return
}
$new=@('ui-command-freshness.contract.ts','ui-command-freshness.test.ts')
if($Mode -eq 'mock' -or $Mode -eq 'real'){
 if($Mode -eq 'mock' -and @(Get-ProtectedDelta).Count){throw 'Mock must precede all protected implementation/provider edits'}
 $out=Join-Path $dir ($Mode+'-'+(Get-Date -Format yyyyMMddTHHmmss));[void](New-Item -ItemType Directory -Path $out)
 $xml=Join-Path $out 'unit.xml';$log=Join-Path $out 'unit.log'
 $argsList=@('exec','vitest','--','run','tests/browser/ui-command-freshness.test.ts','tests/browser/ui-command-retirement.test.ts','tests/browser/ui-command-acknowledgement.test.ts','tests/browser/ui-command-capture.test.ts','--maxWorkers=4','--reporter=default','--reporter=junit',('--outputFile.junit='+$xml))
 $prior=@{};foreach($name in @('WORDPAIRS_UI_FRESHNESS_BINDING','WORDPAIRS_UI_RETIREMENT_BINDING','WORDPAIRS_UI_ACK_BINDING')){$prior[$name]=[Environment]::GetEnvironmentVariable($name);[Environment]::SetEnvironmentVariable($name,$Mode)}
 $started=Get-Date -Format s
 Push-Location $repo
 try{& npm @argsList *> $log;$exit=$LASTEXITCODE}finally{Pop-Location;foreach($name in $prior.Keys){[Environment]::SetEnvironmentVariable($name,$prior[$name])}}
 [xml]$native=Get-Content -LiteralPath $xml -Raw
 $cases=@($native.SelectNodes('//testcase'));$fail=@($cases|Where-Object {$_.SelectSingleNode('failure|error')}).Count;$skip=@($cases|Where-Object {$_.SelectSingleNode('skipped')}).Count;$negative=@($cases|Where-Object name -Like '*rejects wrong*').Count
 $pins=@(foreach($name in @($new+$protected)){Copy-Pin (Join-Path $repo "tests/browser/$name") (Join-Path $out $name)})
 $producer=Copy-Pin $PSCommandPath (Join-Path $out 'producer.ps1')
 $changed=@(Get-ProtectedDelta)
 [ordered]@{startedAtLocal=$started;finishedAtLocal=(Get-Date -Format s);binding=$Mode;head=(& git -C $repo rev-parse HEAD).Trim();hostName=[Environment]::MachineName;executable='npm';arguments=$argsList;exitCode=$exit;cases=$cases.Count;failed=$fail;skipped=$skip;expectedNegative=$negative;newCases=48;priorCases=162;protectedSourceChanges=@($changed.path);sourcePins=$pins;producer=$producer;junit=$xml;junitSha256=(Get-FileHash -LiteralPath $xml).Hash;qualification='Isolated SAME retirement/coordinator oracle, no actual DOM/network/capacity proof.'}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $out 'receipt.json')
 Get-Content -LiteralPath $log|Select-Object -Last 30
 [pscustomobject]@{path=(Join-Path $out 'receipt.json');binding=$Mode;exit=$exit;cases=$cases.Count;failed=$fail;skipped=$skip;expectedNegative=$negative;protectedChanges=@($changed.path)}|ConvertTo-Json -Depth 5
 if($exit -or $cases.Count -ne 210 -or $fail -or $skip -or $negative -ne 105 -or ($Mode -eq 'mock' -and $changed.Count)){throw 'Focused freshness gate failed; preserve receipt'}
 return
}
$out=Join-Path $dir ((Get-Date -Format yyyyMMddTHHmmss)+'-source-check');[void](New-Item -ItemType Directory -Path $out)
$files=@(@($new+'ui-command-acknowledgement.ts'+'live-player-counts.integration.spec.ts'+'live-multiplayer.integration.spec.ts')|ForEach-Object {'tests/browser/'+$_})
Push-Location $repo
try{
 & npm exec biome -- lint --max-diagnostics=200 @files *> (Join-Path $out 'biome.log');$lint=$LASTEXITCODE
 & git diff --check -- @files *> (Join-Path $out 'diff.log');$diff=$LASTEXITCODE
 & npm exec tsc -- --noEmit --pretty false *> (Join-Path $out 'tsc.log');$type=$LASTEXITCODE
 $oldFixtures=@(Get-ProtectedDelta|Where-Object {$_.path -match 'contract\.ts$|\.test\.ts$'})
 $pins=@(foreach($name in @($new+$protected)){[pscustomobject]@{path="tests/browser/$name";sha256=(Get-FileHash -LiteralPath (Join-Path $repo "tests/browser/$name")).Hash}})
 $checks=@(Get-ChildItem -LiteralPath (Join-Path $dir 'edit-verification') -Filter '*.json'|ForEach-Object {Get-Content -LiteralPath $_.FullName -Raw|ConvertFrom-Json})
 [ordered]@{atLocal=(Get-Date -Format s);lintExit=$lint;diffExit=$diff;typecheckExit=$type;old162FixtureChanges=@($oldFixtures.path);sourcePins=$pins;editChecks=$checks;logs=$out}|ConvertTo-Json -Depth 9|Set-Content -LiteralPath (Join-Path $dir 'source-check.json')
 Get-Content -LiteralPath (Join-Path $out 'biome.log')|Select-Object -Last 35
 Get-Content -LiteralPath (Join-Path $dir 'source-check.json') -Raw
 if($lint -or $diff -or $type -or $oldFixtures.Count){throw 'Scoped freshness source checks failed'}
}finally{Pop-Location}
