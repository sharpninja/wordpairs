#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
$report = [IO.Path]::GetFullPath($ReportDirectory)
if (-not $PSCmdlet.ShouldProcess($report, 'Exercise game and social routing against correct and incorrect fixtures')) { return }
$null = New-Item -ItemType Directory -Path $report -Force
$runs = [Collections.Generic.List[object]]::new()
Push-Location $root
try {
    foreach ($kind in @('correct', 'wrong-key', 'wrong-round')) {
        $env:WORDPAIRS_GAME_SOCIAL_FIXTURE = $kind
        $xml = Join-Path $report "$kind.xml"
        & npm exec vitest -- run tests/web/game-social-routing.test.ts --maxWorkers=1 --reporter=default --reporter=junit "--outputFile.junit=$xml" *>&1 | Tee-Object (Join-Path $report "$kind.log")
        $exit = $LASTEXITCODE
        [xml]$result = Get-Content $xml -Raw
        $cases = @($result.SelectNodes('//testcase'))
        $failed = @($cases | Where-Object { $_.SelectSingleNode('failure|error') })
        $skipped = @($cases | Where-Object { $_.SelectSingleNode('skipped') })
        if ($cases.Count -ne 3 -or $skipped.Count) { throw "Incomplete fixture run: $kind" }
        if ($kind -eq 'correct' -and ($exit -ne 0 -or $failed.Count)) { throw 'Correct game-social fixture failed.' }
        if ($kind -eq 'wrong-key' -and ($exit -eq 0 -or $failed.Count -ne 2)) { throw 'Incorrect refresh key was not rejected by both key assertions.' }
        if ($kind -eq 'wrong-round' -and ($exit -eq 0 -or $failed.Count -ne 1 -or $failed[0].GetAttribute('name') -notlike '*leaving an active round*')) { throw 'Incorrect round transition was not rejected.' }
        $runs.Add([pscustomobject]@{ fixture = $kind; exitCode = $exit; cases = $cases.Count; failed = $failed.Count; skipped = $skipped.Count; report = $xml; reportSha256 = (Get-FileHash $xml).Hash })
    }
} finally { Remove-Item Env:WORDPAIRS_GAME_SOCIAL_FIXTURE -ErrorAction SilentlyContinue; Pop-Location }
[pscustomobject]@{ timestamp = (Get-Date -Format s); testSha256 = (Get-FileHash (Join-Path $root 'tests/web/game-social-routing.test.ts')).Hash; runs = @($runs) } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $report 'mock-gate.json')
