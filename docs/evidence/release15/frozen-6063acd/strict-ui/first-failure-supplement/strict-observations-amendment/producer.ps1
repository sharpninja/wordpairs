#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-6063acd/strict-ui/first-failure-supplement'
$source=Join-Path $repo 'docs/evidence/room-sync/live-ui-observations.json'
$copy=Join-Path $folder 'strict-observations-amendment/live-ui-observations.json'
$receipt=Join-Path $folder 'strict-observations-amendment/manifest.json'
$invocation=Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/frozen-6063acd/strict-ui/invocation.json') -Raw|ConvertFrom-Json
$originalManifest=(Get-FileHash -LiteralPath (Join-Path $folder 'manifest.json')).Hash
$text=Get-Content -LiteralPath $source -Raw
if($text -match '(?i)"(?:api[_-]?key|client[_-]?secret|database[_-]?password|access[_-]?token)"\s*:\s*"[^"\s]{12,}"|postgres(?:ql)?://[^\s"'']+:[^\s"'']+@|Bearer\s+[A-Za-z0-9_.-]{20,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b'){throw 'Potential secret; no public copy performed'}
$item=Get-Item -LiteralPath $source
$hash=(Get-FileHash -LiteralPath $source).Hash
$own=Get-Content -LiteralPath /tmp/wordpairs-strict606-session.json -Raw|ConvertFrom-Json
if(-not $PSCmdlet.ShouldProcess($copy,'Additive copy/hash/retain original strict observations omitted by operational collector')){return}
if(Test-Path -LiteralPath $receipt){throw 'Preserve existing amendment'}
[void](New-Item -ItemType Directory -Path (Split-Path $copy) -Force)
Copy-Item -LiteralPath $source -Destination $copy
if((Get-FileHash -LiteralPath $source).Hash -cne $hash -or (Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Original/copy drift'}
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path (Split-Path $copy) 'producer.ps1')
if((Get-FileHash -LiteralPath (Join-Path $folder 'manifest.json')).Hash -cne $originalManifest){throw 'Original first-preservation manifest changed'}
[ordered]@{atLocal=(Get-Date -Format s);sessionId=$own.sessionId;requestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;source=[IO.Path]::GetRelativePath($repo,$source);copy=[IO.Path]::GetRelativePath($repo,$copy);sha256=$hash;bytes=$item.Length;sourceLastWriteTime=$item.LastWriteTime.ToString('o');sourceLastWriteTimeUtc=$item.LastWriteTimeUtc.ToString('o');invocation=$invocation;qualification='Fixed-name file, source mtime must be compared with strict invocation; original run identifier may be absent. Metadata alone does not join every observation to actor/command or reconstruct transient DOM.';originalRetained=$true;originalManifestSha256=$originalManifest;producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;noRerun=$true;noSourceEdits=$true}|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $receipt
[ordered]@{atLocal=(Get-Date -Format s);path=$receipt;sha256=(Get-FileHash -LiteralPath $receipt).Hash;originalSha256=$hash;bytes=$item.Length;mtime=$item.LastWriteTime.ToString('o');invocationProperties=@($invocation.PSObject.Properties.Name)}|ConvertTo-Json -Depth 4
