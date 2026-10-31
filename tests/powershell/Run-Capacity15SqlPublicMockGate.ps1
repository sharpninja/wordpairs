#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
$root=Split-Path (Split-Path $PSScriptRoot)
$report=[IO.Path]::GetFullPath($ReportDirectory)
if(-not $PSCmdlet.ShouldProcess($report,'Prove SQL-upgrade and public-rules assertions with correct and deliberately wrong fixtures')){return}
$null=New-Item -ItemType Directory -Path $report -Force
$runs=[Collections.Generic.List[object]]::new()
Push-Location $root
try{
 foreach($kind in @('correct','wrong-player-limit','wrong-legacy','wrong-observer-limit')){
  $env:WORDPAIRS_CAPACITY_FIXTURE=$kind
  foreach($lane in @('public','sql')){
   $test=if($lane -eq 'public'){'tests/application/capacity-public.test.ts'}else{'tests/integration/capacity.integration.ts'}
   $config=if($lane -eq 'sql'){@('--config','vitest.postgres.config.ts')}else{@()}
   $xml=Join-Path $report "$kind-$lane.xml"
   & npm exec vitest -- run $test @config --maxWorkers=1 --reporter=default --reporter=junit "--outputFile.junit=$xml" *>&1 | Tee-Object (Join-Path $report "$kind-$lane.log")
   $exit=$LASTEXITCODE
   [xml]$results=Get-Content -Raw $xml
   $cases=@($results.SelectNodes('//testcase'));$failed=@($cases|Where-Object{$_.SelectSingleNode('failure|error')});$skipped=@($cases|Where-Object{$_.SelectSingleNode('skipped')})
   $expected=if($lane -eq 'public'){2}else{3}
   $expectedFailed=if($kind -eq 'correct'){0}elseif($kind -eq 'wrong-player-limit'){1}elseif($kind -eq 'wrong-legacy' -and $lane -eq 'sql'){3}elseif($kind -eq 'wrong-legacy'){1}elseif($lane -eq 'sql'){1}else{0}
   if($cases.Count -ne $expected -or $skipped.Count -or $failed.Count -ne $expectedFailed){throw "Unexpected fixture result: $kind $lane"}
   if(($expectedFailed -eq 0 -and $exit -ne 0) -or ($expectedFailed -gt 0 -and $exit -eq 0)){throw "Incorrect fixture exit: $kind $lane"}
   $runs.Add([pscustomobject]@{fixture=$kind;lane=$lane;cases=$cases.Count;failed=$failed.Count;skipped=$skipped.Count;exitCode=$exit;report=$xml;sha256=(Get-FileHash $xml).Hash})
  }
 }
}finally{Remove-Item Env:WORDPAIRS_CAPACITY_FIXTURE -ErrorAction SilentlyContinue;Pop-Location}
[pscustomobject]@{timestamp=(Get-Date -Format s);gate='preimplementation-sql-and-public-rules';inputs=@(@('tests/application/capacity-public.test.ts','tests/integration/capacity.integration.ts')|ForEach-Object{[pscustomobject]@{path=$_;sha256=(Get-FileHash (Join-Path $root $_)).Hash}});runs=@($runs)}|ConvertTo-Json -Depth 10|Set-Content (Join-Path $report 'mock-gate.json')
