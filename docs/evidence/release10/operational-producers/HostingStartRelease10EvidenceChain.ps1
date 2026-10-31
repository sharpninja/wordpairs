#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$Directory)
$ErrorActionPreference='Stop'
$root='<repo>'
$Directory=[IO.Path]::GetFullPath($Directory)
if(-not $PSCmdlet.ShouldProcess($Directory,'Start persistent sequential capacity10 validation only after future frozen inventory is prepared')){return}
$inventory=Get-Content -LiteralPath (Join-Path $Directory 'expected-inventory.json') -Raw|ConvertFrom-Json
$runner=Join-Path $root 'docs/evidence/release10/operational-producers/HostingRunRelease10EvidenceChain.ps1'
if((& git -C $root rev-parse HEAD).Trim() -cne $inventory.revision){throw 'Frozen revision changed'}
$receipt=Join-Path $Directory 'service-start.json'
if(Test-Path -LiteralPath $receipt){throw 'Do not overwrite service launch evidence'}
$unit='wordpairs-release10-'+$inventory.revision.Substring(0,7)+'-chain'
$arguments=@('--user','--collect',('--unit='+$unit),'--property',('WorkingDirectory='+$root),'--property',('StandardOutput=append:'+(Join-Path $Directory 'service.stdout.log')),'--property',('StandardError=append:'+(Join-Path $Directory 'service.stderr.log')),'--','/usr/bin/pwsh','-NoProfile','-NonInteractive','-File',$runner,'-Directory',$Directory)

$output=& systemd-run @arguments 2>&1
$code=$LASTEXITCODE
[pscustomobject]@{timestamp=(Get-Date -Format s);revision=$inventory.revision;runId=$inventory.runId;unit=$unit;executable='systemd-run';arguments=$arguments;exitCode=$code;output=@($output|ForEach-Object ToString);qualification='Launch acknowledgement only. Native lane receipts and chain completion establish results.'}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $receipt
if($code){throw 'Persistent validation launch failed'}
$output
