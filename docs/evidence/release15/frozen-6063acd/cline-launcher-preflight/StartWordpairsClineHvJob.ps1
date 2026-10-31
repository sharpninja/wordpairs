#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$Directory,[Parameter(Mandatory)][string]$BriefPath,[Parameter(Mandatory)][string]$SelfReviewPath)
$ErrorActionPreference='Stop'
$root='<repo>'
$runner='/tmp/InvokeWordpairsClineHv.ps1'
$inventory=Get-Content -LiteralPath (Join-Path $Directory 'expected-inventory.json') -Raw|ConvertFrom-Json
$receipt=Join-Path $Directory 'hv-service-start.json'
if(Test-Path -LiteralPath $receipt){throw 'Retain earlier review launch evidence; do not overwrite'}
$unit='wordpairs-hv-'+$inventory.revision.Substring(0,7)+'-'+(Get-Date -Format yyyyMMddTHHmmss)
$arguments=@('--user','--collect',('--unit='+$unit),'--property',('WorkingDirectory='+$root),'--property',('StandardOutput=append:'+(Join-Path $Directory 'hv-service.stdout.log')),'--property',('StandardError=append:'+(Join-Path $Directory 'hv-service.stderr.log')),'--','/usr/bin/pwsh','-NoProfile','-NonInteractive','-File',$runner,'-Directory',$Directory,'-BriefPath',$BriefPath,'-SelfReviewPath',$SelfReviewPath)
if(-not $PSCmdlet.ShouldProcess($unit,'Start persistent Cline Beam High hostile review; no runtime or output limit')){return}
$output=& systemd-run @arguments 2>&1
$code=$LASTEXITCODE
[pscustomobject]@{timestamp=(Get-Date -Format s);revision=$inventory.revision;runId=$inventory.runId;unit=$unit;executable='systemd-run';arguments=$arguments;runnerSha256=(Get-FileHash -LiteralPath $runner).Hash;exitCode=$code;output=@($output|ForEach-Object ToString);qualification='Launch acknowledgement only; full model stream, verdict, bound-file stability and reviewer-owned MCP readback govern acceptance.'}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $receipt
if($code){throw 'Persistent reviewer launch failed'}
$output
