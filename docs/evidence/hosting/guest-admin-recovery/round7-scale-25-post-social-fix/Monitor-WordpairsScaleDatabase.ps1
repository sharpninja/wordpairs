#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
$clone = '<home>/github/WordGame/.mcpServer/wordpairs-scale-review-20261029'
$runtimeRoot = Join-Path $clone '.mcpServer'
$deadline = [DateTimeOffset]::Now.AddMinutes(15)
if (Test-Path $OutputPath) { throw 'Refusing to overwrite a monitoring receipt.' }
if (-not $PSCmdlet.ShouldProcess($OutputPath, 'Sample lock and activity counts from the separately owned test database')) { return }
$identity = $null
while (-not $identity -and [DateTimeOffset]::Now -lt $deadline) {
    $candidates = @(Get-ChildItem -LiteralPath $runtimeRoot -Directory -Filter 'ui-*' -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName 'database-owner.json') })
    if ($candidates.Count -gt 1) { throw 'Multiple owned test databases detected; refusing to guess.' }
    if ($candidates.Count -eq 1) { $identity = Get-Content (Join-Path $candidates[0].FullName 'database-owner.json') -Raw | ConvertFrom-Json; $ownerPath = $candidates[0].FullName }
    if (-not $identity) { Start-Sleep -Seconds 1 }
}
if (-not $identity -or $identity.owner -notmatch '^[0-9a-f]{32}$' -or $identity.database -cne ('wordpairs_ui_' + $identity.owner) -or $identity.containerId -notmatch '^[0-9a-f]{64}$') { throw 'No valid owned test database appeared.' }
$label = & docker inspect $identity.containerId --format '{{ index .Config.Labels "wordpairs.ui-harness" }}'
if ($LASTEXITCODE -ne 0 -or "$label".Trim() -cne $identity.owner) { throw 'Test database ownership verification failed.' }
$sql = "select coalesce(json_agg(row_to_json(x)),'[]'::json) from (select coalesce(wait_event_type,'none') as wait_type,coalesce(wait_event,'none') as wait_event,state,count(*)::int as count from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() group by 1,2,3 order by 1,2,3) x;"
$samples = 0
while ((Test-Path -LiteralPath $ownerPath) -and [DateTimeOffset]::Now -lt $deadline) {
    $rows = & docker exec $identity.containerId psql -U postgres -d $identity.database -At -c $sql 2>$null
    if ($LASTEXITCODE -ne 0) { Start-Sleep -Seconds 2; continue }
    $sample = [ordered]@{ timestamp = (Get-Date -Format s); activity = ($rows | ConvertFrom-Json); cpuPressure = @(Get-Content /proc/pressure/cpu); memoryPressure = @(Get-Content /proc/pressure/memory) }
    Add-Content -LiteralPath $OutputPath -Value ($sample | ConvertTo-Json -Depth 6 -Compress)
    $samples++
    Start-Sleep -Seconds 2
}
if ($samples -eq 0) { throw 'No database activity samples were recorded.' }
[pscustomobject]@{ output = $OutputPath; owner = $identity.owner; samples = $samples } | ConvertTo-Json -Compress
