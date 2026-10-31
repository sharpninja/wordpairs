#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
$report = [IO.Path]::GetFullPath($ReportDirectory)
if (-not $PSCmdlet.ShouldProcess($report, 'Exercise deadline-worker assertions with correct and deliberately wrong fixtures')) { return }
$null = New-Item -ItemType Directory -Path $report -Force
$runs = [Collections.Generic.List[object]]::new()
Push-Location $root
try {
    foreach ($kind in @('correct', 'wrong')) {
        $env:WORDPAIRS_DEADLINE_FIXTURE = $kind
        $xml = Join-Path $report "$kind.xml"
        & npm exec vitest -- run tests/web/deadline-worker-isolation.test.ts --maxWorkers=1 --reporter=default --reporter=junit "--outputFile.junit=$xml" *>&1 | Tee-Object (Join-Path $report "$kind.log")
        $exit = $LASTEXITCODE
        [xml]$result = Get-Content $xml -Raw
        $cases = @($result.SelectNodes('//testcase'))
        $failed = @($cases | Where-Object { $_.SelectSingleNode('failure|error') })
        $skipped = @($cases | Where-Object { $_.SelectSingleNode('skipped') })
        if ($cases.Count -ne 4 -or $skipped.Count) { throw "Incomplete fixture run: $kind" }
        if ($kind -eq 'correct' -and ($exit -ne 0 -or $failed.Count)) { throw 'Correct deadline fixture failed.' }
        if ($kind -eq 'wrong' -and ($exit -eq 0 -or $failed.Count -ne 1 -or $failed[0].GetAttribute('name') -notlike '*foreground does not join*')) { throw 'Wrong deadline fixture did not reject the intended assertion.' }
        $runs.Add([pscustomobject]@{ fixture = $kind; exitCode = $exit; cases = $cases.Count; failed = $failed.Count; skipped = $skipped.Count; report = $xml; reportSha256 = (Get-FileHash $xml).Hash })
    }
} finally { Remove-Item Env:WORDPAIRS_DEADLINE_FIXTURE -ErrorAction SilentlyContinue; Pop-Location }
[pscustomobject]@{ timestamp = (Get-Date -Format s); testSha256 = (Get-FileHash (Join-Path $root 'tests/web/deadline-worker-isolation.test.ts')).Hash; runs = @($runs) } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $report 'mock-gate.json')
