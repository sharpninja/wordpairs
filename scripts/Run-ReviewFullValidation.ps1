#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$ReportDirectory)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot
$report=[IO.Path]::GetFullPath($ReportDirectory)
if(-not $PSCmdlet.ShouldProcess($report,'Run full local source validation and record per-command provenance')){return}
$null=New-Item -ItemType Directory -Path $report -Force
$steps=[Collections.Generic.List[object]]::new()
$runId=[Guid]::NewGuid().ToString('D')
$started=Get-Date -Format s
$revision=(& git -C $root rev-parse HEAD).Trim()
$hostName=[Environment]::MachineName
$status='failed'
$failure=$null
function Invoke-ValidationStep {
 param([string]$Name,[string]$Executable,[string[]]$Arguments,[string]$JUnit)
 $stepStart=Get-Date -Format s
 & $Executable @Arguments *>&1 | Tee-Object -FilePath (Join-Path $report "$Name.log")
 $code=$LASTEXITCODE
 $reportHash=if($JUnit -and (Test-Path (Join-Path $report $JUnit))){(Get-FileHash (Join-Path $report $JUnit)).Hash}else{$null}
 $steps.Add([pscustomobject]@{name=$Name;runId=$runId;hostName=$hostName;revision=$revision;startedAt=$stepStart;finishedAt=(Get-Date -Format s);executable=$Executable;arguments=$Arguments;exitCode=$code;log="$Name.log";junit=$JUnit;junitSha256=$reportHash})
 if($code){throw "$Name failed with exit code $code"}
}
Push-Location $root
try{
 Invoke-ValidationStep -Name 'typecheck' -Executable 'npm' -Arguments @('run','typecheck')
 Invoke-ValidationStep -Name 'lint' -Executable 'npm' -Arguments @('run','lint')
 Invoke-ValidationStep -Name 'unit' -Executable 'npm' -Arguments @('exec','vitest','--','run','--maxWorkers=4','--reporter=default','--reporter=junit',"--outputFile.junit=$(Join-Path $report 'unit.xml')") -JUnit 'unit.xml'
 Invoke-ValidationStep -Name 'postgres' -Executable 'pwsh' -Arguments @('-NoProfile','-NonInteractive','-File','tests/integration/run-phase1.ps1','-ReportDirectory',$report,'-VolatileStorage') -JUnit 'postgres.xml'
 Invoke-ValidationStep -Name 'build' -Executable 'npm' -Arguments @('run','build')
 $env:PLAYWRIGHT_JUNIT_OUTPUT_FILE=Join-Path $report 'browser.xml'
 $env:WORDPAIRS_BROWSER_PATH='/usr/bin/chromium'
 Invoke-ValidationStep -Name 'browser' -Executable 'npm' -Arguments @('exec','playwright','--','test','--config=playwright.pwa.config.ts','--reporter=line,junit') -JUnit 'browser.xml'
 if((& git rev-parse HEAD).Trim() -cne $revision){throw 'HEAD changed during validation.'}
 $status='passed'
}catch{$failure=$_.Exception.Message}
finally{
 Remove-Item Env:PLAYWRIGHT_JUNIT_OUTPUT_FILE,Env:WORDPAIRS_BROWSER_PATH -ErrorAction SilentlyContinue
 Pop-Location
 [pscustomobject]@{runId=$runId;hostName=$hostName;startedAt=$started;finishedAt=(Get-Date -Format s);revision=$revision;status=$status;failure=$failure;steps=@($steps);qualification='Local source validation with disposable PostgreSQL and a local browser server.'}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $report 'validation.json')
}
if($status -ne 'passed'){throw "Full validation failed: $failure"}
