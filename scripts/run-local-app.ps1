param([Parameter(Mandatory)][string]$RuntimePath,[int]$Port=3003)
$ErrorActionPreference='Stop'
$settings=Get-Content $RuntimePath -Raw | ConvertFrom-Json -AsHashtable
@{pid=$PID;startToken=(([IO.File]::ReadAllText('/proc/'+$PID+'/stat') -replace '^.*\)\s+','') -split '\s+')[19];startedAtUtc=(Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content (Join-Path (Split-Path $RuntimePath) 'local-live-app-process.json')
foreach($name in $settings.Keys) {
    if($name -like 'WORDPAIRS_*') {[Environment]::SetEnvironmentVariable($name,[string]$settings[$name],'Process')}
}
Set-Location (Split-Path $PSScriptRoot)
& npm run start -- --hostname 127.0.0.1 --port $Port
exit $LASTEXITCODE
