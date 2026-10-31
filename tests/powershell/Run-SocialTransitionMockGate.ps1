#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
$report = [IO.Path]::GetFullPath($ReportDirectory)
if (-not $PSCmdlet.ShouldProcess($report, 'Exercise observer reaction transition against correct and wrong fixtures')) { return }
$null = New-Item -ItemType Directory -Path $report -Force
$runs = [Collections.Generic.List[object]]::new()
Push-Location $root
try {
    foreach ($kind in @('correct', 'wrong')) {
        $env:WORDPAIRS_SOCIAL_TRANSITION_FIXTURE = $kind
        $xml = Join-Path $report "$kind.xml"
        & npm exec vitest -- run tests/web/social-round-transition.test.ts --maxWorkers=1 --reporter=default --reporter=junit "--outputFile.junit=$xml" *>&1 | Tee-Object (Join-Path $report "$kind.log")
        $exit = $LASTEXITCODE
        [xml]$result = Get-Content $xml -Raw
        $cases = @($result.SelectNodes('//testcase'))
        $failed = @($cases | Where-Object { $_.SelectSingleNode('failure|error') })
        $skipped = @($cases | Where-Object { $_.SelectSingleNode('skipped') })
        if ($cases.Count -ne 1 -or $skipped.Count) { throw "Incomplete fixture run: $kind" }
        if ($kind -eq 'correct' -and ($exit -ne 0 -or $failed.Count)) { throw 'Correct social-transition fixture failed.' }
        if ($kind -eq 'wrong' -and ($exit -eq 0 -or $failed.Count -ne 1)) { throw 'Wrong social-transition fixture was not rejected.' }
        $runs.Add([pscustomobject]@{ fixture = $kind; exitCode = $exit; cases = $cases.Count; failed = $failed.Count; skipped = $skipped.Count; report = $xml; reportSha256 = (Get-FileHash $xml).Hash })
    }
} finally { Remove-Item Env:WORDPAIRS_SOCIAL_TRANSITION_FIXTURE -ErrorAction SilentlyContinue; Pop-Location }
[pscustomobject]@{ timestamp = (Get-Date -Format s); testSha256 = (Get-FileHash (Join-Path $root 'tests/web/social-round-transition.test.ts')).Hash; runs = @($runs) } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $report 'mock-gate.json')
