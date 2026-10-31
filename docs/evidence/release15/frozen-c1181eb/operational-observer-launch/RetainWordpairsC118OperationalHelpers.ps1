[CmdletBinding(SupportsShouldProcess)]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$directory='<repo>/docs/evidence/release15/frozen-c1181eb/operational-observer-launch'
$target=Join-Path $directory 'readback-producer-retention.json'
if(Test-Path -LiteralPath $target){throw 'Preserve prior readback producer receipt'}
if(-not $PSCmdlet.ShouldProcess($target,'Retain original helper and exact checkpoint hash append-only; explicitly record that checkpoint predates this copy')){return}
$pins=@(foreach($path in @('/tmp/ReadWordpairsC118ObserverEvidence.ps1',$PSCommandPath)){$copy=Join-Path $directory (Split-Path $path -Leaf);if(Test-Path -LiteralPath $copy){throw 'Preserve prior helper copy'};$hash=(Get-FileHash -LiteralPath $path).Hash;Copy-Item -LiteralPath $path -Destination $copy;if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Readback helper copy mismatch'};[pscustomobject]@{original=$path;copy=$copy;sha256=$hash}})
$checkpoint=Join-Path $directory 'checkpoint-readback.json'
$record=[pscustomobject]@{recordedAt=[DateTimeOffset]::Now.ToString('o');sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261031T003052Z-c118-operational-evidence';producerPins=$pins;existingCheckpoint=@{path=$checkpoint;sha256=(Get-FileHash -LiteralPath $checkpoint).Hash};chronology='Helper copied after the existing partial checkpoint; no claim of pre-checkpoint retention. Exact copy retained before any future terminal readback. Existing checkpoint bytes remain unchanged. Actual observer measurement producer was retained before launch separately.';originalsRetained=$true;qualification='Operational producer retention only, not new sampling, tests/builds or acceptance proof.'}
$record|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $target
[pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;pins=$pins}|ConvertTo-Json -Depth 10
