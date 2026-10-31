#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
$report = [IO.Path]::GetFullPath($ReportDirectory)
if (-not $PSCmdlet.ShouldProcess($report,'Prove capacity15 assertions with independent correct and incorrect contract fixtures')) { return }
$null = New-Item -ItemType Directory -Path $report -Force
$runs = [Collections.Generic.List[object]]::new()
$testPaths = @('tests/application/capacity-policy.test.ts','tests/web/capacity-ui.test.ts','tests/application/legacy-match-capacity.test.ts')
Push-Location $root
try {
    foreach ($kind in @('correct','wrong-player-limit','wrong-observer-limit','wrong-legacy')) {
        $env:WORDPAIRS_CAPACITY_FIXTURE = $kind
        $xml = Join-Path $report "$kind.xml"
        & npm exec vitest -- run @testPaths --maxWorkers=1 --reporter=default --reporter=junit "--outputFile.junit=$xml" *>&1 | Tee-Object (Join-Path $report "$kind.log")
        $exit = $LASTEXITCODE
        [xml]$result = Get-Content -Raw $xml
        $cases = @($result.SelectNodes('//testcase'))
        $failed = @($cases | Where-Object { $_.SelectSingleNode('failure|error') })
        $skipped = @($cases | Where-Object { $_.SelectSingleNode('skipped') })
        if ($cases.Count -ne 16 -or $skipped.Count) { throw "Incomplete capacity fixture run: $kind ($($cases.Count) tests)" }
        if ($kind -eq 'correct' -and ($exit -ne 0 -or $failed.Count)) { throw 'Correct capacity fixture failed.' }
        if ($kind -ne 'correct' -and ($exit -eq 0 -or $failed.Count -eq 0)) { throw "Incorrect capacity fixture escaped all assertions: $kind" }
        $runs.Add([pscustomobject]@{fixture=$kind;exitCode=$exit;cases=$cases.Count;failed=$failed.Count;skipped=$skipped.Count;rejectedAssertions=@($failed | ForEach-Object {$_.GetAttribute('name')});report=$xml;reportSha256=(Get-FileHash $xml).Hash})
    }
} finally {Remove-Item Env:WORDPAIRS_CAPACITY_FIXTURE -ErrorAction SilentlyContinue;Pop-Location}
$inputs = @($testPaths + @('tests/application/capacity-contract-fixture.ts','tests/web/capacity-ui-fixture.ts'))
[pscustomobject]@{timestamp=(Get-Date -Format s);gate='preimplementation-capacity15';requirements=@('FR-ROOMACCESS-001','TR-ROOM-CODES-010','TR-ANCHOR-RANDOMNESS-013','TEST-CONFIGUREDCAPACITY-024');inputs=@($inputs | ForEach-Object {[pscustomobject]@{path=$_;sha256=(Get-FileHash (Join-Path $root $_)).Hash}});runs=@($runs)} | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $report 'mock-gate.json')
