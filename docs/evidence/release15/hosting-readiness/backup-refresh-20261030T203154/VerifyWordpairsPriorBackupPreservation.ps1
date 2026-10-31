[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$root='<repo>'
$source=Join-Path $root 'docs/evidence/release15/frozen-0fb37e6/encrypted-game-backup-index-v2.json'
$target=Join-Path $root 'docs/evidence/release15/hosting-readiness/backup-refresh-20261030T203154/prior-preservation.json'
if(Test-Path -LiteralPath $target){throw 'Preserve prior readback'}
$index=Get-Content -LiteralPath $source -Raw|ConvertFrom-Json -Depth 100
$pins=@(foreach($item in $index.observations){$receipt=Join-Path $root $item.receiptPath;if((Get-FileHash -LiteralPath $receipt).Hash -cne $item.receiptSha256 -or (Get-FileHash -LiteralPath $item.privateCiphertextPath).Hash -cne $item.ciphertextSha256){throw 'Historical backup receipt/ciphertext differs'};[pscustomobject]@{runId=$item.runId;environment=$item.environment;historicalStatus=$item.status;receipt=$receipt;receiptSha256=$item.receiptSha256;ciphertext=$item.privateCiphertextPath;ciphertextSha256=$item.ciphertextSha256;hashesMatch=$true}})
if(-not $PSCmdlet.ShouldProcess($target,'Retain exact local hashes proving all six prior receipts/ciphertexts remain unchanged after fresh operations')){return}
$copy=Join-Path (Split-Path $target) 'VerifyWordpairsPriorBackupPreservation.ps1';Copy-Item -LiteralPath $PSCommandPath -Destination $copy
if((Get-FileHash -LiteralPath $copy).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Readback producer retention differs'}
[pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');source=$source;sourceSha256=(Get-FileHash -LiteralPath $source).Hash;preservedCount=$pins.Count;pins=$pins;producer=$copy;producerSha256=(Get-FileHash -LiteralPath $copy).Hash;qualification='Read-only local hash verification after two new backups; no provider query, decryption, replay or historical verdict change.'}|ConvertTo-Json -Depth 15|Set-Content -LiteralPath $target
[pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;preservedCount=$pins.Count}|ConvertTo-Json
