#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
$root=Split-Path (Split-Path $PSScriptRoot)
$report=[IO.Path]::GetFullPath($ReportDirectory)
if(-not $PSCmdlet.ShouldProcess($report,'Run CAP10 SQL oracle against independent correct and deliberately incorrect mocks inside a passing harness')){return}
[void][IO.Directory]::CreateDirectory($report)
Push-Location $root
try{
 $xml=Join-Path $report 'sql-oracle.xml'
 & npm exec vitest -- run tests/integration/capacity-sql.contract.test.ts --maxWorkers=1 --reporter=default --reporter=junit "--outputFile.junit=$xml" *>&1 | Tee-Object (Join-Path $report 'sql-oracle.log')
 $code=$LASTEXITCODE
 [xml]$native=Get-Content -LiteralPath $xml -Raw
 $cases=@($native.SelectNodes('//testcase'));$failed=@($cases|Where-Object{$_.SelectSingleNode('failure|error')});$skipped=@($cases|Where-Object{$_.SelectSingleNode('skipped')})
 if($code -or $cases.Count -ne 65 -or $failed.Count -or $skipped.Count){throw 'CAP10 SQL assertion mock gate failed its exact65-case denominator'}
 $receipt=[pscustomobject]@{timestamp=[TimeZoneInfo]::ConvertTime([DateTimeOffset]::UtcNow,[TimeZoneInfo]::FindSystemTimeZoneById('America/Chicago')).ToString('s');gate='preimplementation-cap10-sql-oracle';sessionId='Codex-20261031T150618Z-plugin-session';requestId='req-20261031T171731Z-cap10-sql';parentRequestId='req-20261031T171140Z-cap10-release';tests=$cases.Count;passed=$cases.Count;failed=$failed.Count;skipped=$skipped.Count;positiveMocks=3;negativeControls=62;exitCode=$code;native=@{path=$xml;sha256=(Get-FileHash -LiteralPath $xml).Hash};inputs=@('tests/integration/capacity-sql.contract.ts','tests/integration/capacity-sql.fixture.ts','tests/integration/capacity-sql.contract.test.ts')|ForEach-Object{[pscustomobject]@{path=$_;sha256=(Get-FileHash -LiteralPath $_).Hash}};qualification='Mock assertion discrimination only. No SQL, migration014, provider mutation, application build or release claim.'}
 $receipt|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $report 'mock-gate.json')
 $receipt|ConvertTo-Json -Depth 10
}finally{Pop-Location}
