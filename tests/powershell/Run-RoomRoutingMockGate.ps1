#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
$repo=Split-Path (Split-Path $PSScriptRoot)
$report=[IO.Path]::GetFullPath($ReportDirectory)
if(-not $PSCmdlet.ShouldProcess($report,'Exercise room-routing assertions with correct and incorrect fixtures')){return}
$null=New-Item -ItemType Directory -Path $report -Force
$runs=[Collections.Generic.List[object]]::new()
Push-Location $repo
try{
 foreach($kind in @('correct','wrong','wrong-social')){
  $env:WORDPAIRS_ROOM_ROUTING_FIXTURE=$kind
  $xml=Join-Path $report "$kind.xml"
  & npm exec vitest -- run tests/web/room-match-routing.test.ts --maxWorkers=1 --reporter=default --reporter=junit "--outputFile.junit=$xml" *>&1 | Tee-Object (Join-Path $report "$kind.log")
  $exit=$LASTEXITCODE
  [xml]$result=Get-Content $xml -Raw
  $cases=@($result.SelectNodes('//testcase'))
  $failed=@($cases|Where-Object {$_.SelectSingleNode('failure|error')})
  $skipped=@($cases|Where-Object {$_.SelectSingleNode('skipped')})
  if($cases.Count -ne 3 -or $skipped.Count){throw "Incomplete room-routing fixture run: $kind"}
  if($kind -eq 'correct' -and ($exit -ne 0 -or $failed.Count)){throw 'Correct room-routing fixture failed.'}
  if($kind -eq 'wrong' -and ($exit -eq 0 -or $failed.Count -ne 1)){throw 'Wrong room-routing fixture did not reject the targeted assertion.'}
  if($kind -eq 'wrong-social' -and ($exit -eq 0 -or $failed.Count -ne 1 -or $failed[0].GetAttribute('name') -notlike '*already mounted match*')){throw 'Wrong social-refresh fixture did not reject the targeted assertion.'}
  $runs.Add([pscustomobject]@{fixture=$kind;exitCode=$exit;cases=$cases.Count;failed=$failed.Count;skipped=$skipped.Count;report=$xml;reportSha256=(Get-FileHash $xml).Hash})
 }
}finally{Remove-Item Env:WORDPAIRS_ROOM_ROUTING_FIXTURE -ErrorAction SilentlyContinue;Pop-Location}
[pscustomobject]@{timestamp=(Get-Date -Format s);testSha256=(Get-FileHash (Join-Path $repo 'tests/web/room-match-routing.test.ts')).Hash;runs=@($runs);qualification='The social-refresh extension precedes its implementation; the earlier match-routing rework and its original chronology are retained separately.'}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $report 'mock-gate.json')
