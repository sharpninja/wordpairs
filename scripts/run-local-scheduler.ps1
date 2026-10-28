param([Parameter(Mandatory)][string]$RuntimePath,[int]$Port=3003,[Parameter(Mandatory)][DateTimeOffset]$UntilUtc)
$ErrorActionPreference='Stop'
$settings=Get-Content $RuntimePath -Raw | ConvertFrom-Json -AsHashtable
@{pid=$PID;startToken=(([IO.File]::ReadAllText('/proc/'+$PID+'/stat') -replace '^.*\)\s+','') -split '\s+')[19];startedAtUtc=(Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content (Join-Path (Split-Path $RuntimePath) 'local-live-worker-process.json')
$secret=$settings.WORDPAIRS_SCHEDULER_SECRET
if(-not $secret -or $secret.Length -lt 32){throw 'Scheduler secret missing'}
$receiptPath=Join-Path (Split-Path $RuntimePath) 'local-scheduler-status.json'
while([DateTimeOffset]::UtcNow -lt $UntilUtc) {
    try {
        $r=Invoke-WebRequest "http://127.0.0.1:$Port/api/internal/deadlines" -Method Post -Headers @{Authorization="Bearer $secret"} -SkipHttpErrorCheck -TimeoutSec 90
        $receipt=@{atUtc=[DateTime]::UtcNow.ToString('o');httpStatus=[int]$r.StatusCode;result=($r.Content | ConvertFrom-Json)}
    } catch { $receipt=@{atUtc=[DateTime]::UtcNow.ToString('o');httpStatus=0;error='Scheduler request failed; retrying'} }
    $receipt | ConvertTo-Json -Depth 10 | Set-Content $receiptPath
    Start-Sleep -Milliseconds 1000
}
