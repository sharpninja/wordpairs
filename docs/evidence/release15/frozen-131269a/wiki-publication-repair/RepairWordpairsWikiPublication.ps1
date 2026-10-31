#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Prepare','Publish')][string]$Operation='Prepare',[string]$SemanticReadbackReceipt,[string]$CommitSignature)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$repo='<repo>'
$wiki=Join-Path $repo '.mcpServer/wiki-publish-release15'
$evidence=Join-Path $repo 'docs/evidence/release15/frozen-131269a/wiki-publication-repair'
$receiptPath=Join-Path $evidence 'receipt.json'
$oldHead='f0c112bdf8b535f5ba618da9355260153d73815e'
$sourceHead='131269a590046a3c1c83314d11ff79f2b731799c'
function Invoke-WikiGit {
 [CmdletBinding()]
 param([string[]]$ArgumentList)
 $value=@(& git -C $wiki @ArgumentList)
 if($LASTEXITCODE -ne 0){throw "Git failed: $($ArgumentList[0])"}
 return $value
}
function ConvertTo-UrlPath {
 [CmdletBinding()]
 param([string]$Path)
 return (($Path.Split('/') | ForEach-Object {[uri]::EscapeDataString($_)}) -join '/')
}
function Get-RelativeReplacement {
 [CmdletBinding()]
 param([object]$Link)
 $anchor=if($Link.anchor){'#'+[uri]::EscapeDataString($Link.anchor)}else{''}
 if($Link.intendedWikiTarget){return 'https://github.com/sharpninja/wordpairs/wiki/'+(ConvertTo-UrlPath ([IO.Path]::GetFileNameWithoutExtension($Link.intendedWikiTarget)))+$anchor}
 if($Link.intendedAssetTarget){return 'https://raw.githubusercontent.com/wiki/sharpninja/wordpairs/'+(ConvertTo-UrlPath $Link.intendedAssetTarget)+$anchor}
 if($Link.sourceTracked){
  $prefix=if($Link.kind -eq 'image' -or $Link.kind -eq 'html'){'https://raw.githubusercontent.com/sharpninja/wordpairs/'+$sourceHead+'/'}else{'https://github.com/sharpninja/wordpairs/blob/'+$sourceHead+'/'}
  return $prefix+(ConvertTo-UrlPath $Link.sourceTarget)+$anchor
 }
 if($Link.target.StartsWith('/tmp/')){return $null}
 $directory=([string]$Link.sourceTarget).TrimEnd('/')
 & git -C $repo cat-file -e "${sourceHead}:$directory" 2>$null
 if($LASTEXITCODE -eq 0){
  $type=(& git -C $repo cat-file -t "${sourceHead}:$directory").Trim()
  if($type -eq 'tree'){return 'https://github.com/sharpninja/wordpairs/tree/'+$sourceHead+'/'+(ConvertTo-UrlPath $directory)+$anchor}
 }
 return $null
}
if($Operation -eq 'Prepare'){
 if(@(Invoke-WikiGit @('rev-parse','HEAD'))[0] -ne $oldHead){throw 'Unexpected original wiki revision'}
 if(@(Invoke-WikiGit @('status','--porcelain=v1')).Count){throw 'Wiki checkout must be clean'}
 if(Test-Path -LiteralPath $receiptPath){throw 'Preserve prior repair receipt'}
 $audit=Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/frozen-131269a/wiki-link-audit.json') -Raw|ConvertFrom-Json
 $links=@($audit.inventory|Where-Object classification -Like 'broken-*')
 $changes=[Collections.Generic.List[object]]::new()
 $unresolved=[Collections.Generic.List[object]]::new()
 $originalByPage=@{};$newByPage=@{}
 foreach($link in $links){
  if($link.anchor -and $link.sourceTarget -like '*.svg'){
   $svg=[IO.File]::ReadAllText((Join-Path $repo $link.sourceTarget))
   if(-not [regex]::IsMatch($svg,'\bid\s*=\s*["'']'+[regex]::Escape($link.anchor)+'["'']')){throw "Missing exact SVG anchor:$($link.sourceTarget)#$($link.anchor)"}
  }
  if($link.anchor -and $link.sourceTarget -like '*.md'){
   if($link.anchor -ne 'disposable-loopback-https-ui-harness' -or -not [regex]::IsMatch([IO.File]::ReadAllText((Join-Path $repo $link.sourceTarget)),'(?im)^#{1,6}\s+Disposable loopback HTTPS UI harness\s*$')){throw 'Unverified Markdown heading anchor'}
  }
  $replacement=Get-RelativeReplacement $link
  if(-not $replacement){$unresolved.Add($link);continue}
  $page=[string]$link.page
  if(-not $originalByPage.ContainsKey($page)){$originalByPage[$page]=[IO.File]::ReadAllText((Join-Path $wiki $page));$newByPage[$page]=$originalByPage[$page]}
  $old=$link.target
  if($link.kind -eq 'html'){$needle='src="'+$old+'"';$next='src="'+$replacement+'"'}else{$needle=']('+$old+')';$next=']('+$replacement+')'}
  $pageLines=$newByPage[$page].Split([char]10)
  $lineIndex=[int]$link.line-1
  if(-not $pageLines[$lineIndex].Contains($needle)){throw "Unsupported exact href representation in $page line$($link.line)"}
  $pageLines[$lineIndex]=$pageLines[$lineIndex].Replace($needle,$next,[StringComparison]::Ordinal)
  $newByPage[$page]=$pageLines -join "`n"
  $changes.Add([pscustomobject]@{page=$page;line=$link.line;oldHref=$old;newHref=$replacement;sourceTarget=$link.sourceTarget;wikiTarget=$link.intendedWikiTarget;assetTarget=$link.intendedAssetTarget;anchor=$link.anchor})
 }
 foreach($page in $newByPage.Keys){
  $restored=$newByPage[$page].Split([char]10)
  foreach($change in @($changes|Where-Object page -EQ $page)){$index=[int]$change.line-1;$restored[$index]=$restored[$index].Replace($change.newHref,$change.oldHref,[StringComparison]::Ordinal)}
  if(($restored -join "`n") -cne $originalByPage[$page]){throw "Non-href content changed:$page"}
 }
 $zipPath=Join-Path $repo 'docs/requirements/requirements-wiki-documents.zip'
 $zipHash=(Get-FileHash -LiteralPath $zipPath).Hash
 $exportPins=[Collections.Generic.List[object]]::new()
 $zip=[IO.Compression.ZipFile]::OpenRead($zipPath)
 try{
  foreach($entry in $zip.Entries|Where-Object {$_.FullName.StartsWith('github/') -and $_.Name -ne '.mcp-requirements-manifest.json'}){
   $relative=$entry.FullName.Substring(7);$target=Join-Path $wiki $relative
   $stream=$entry.Open();try{$hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream))}finally{$stream.Dispose()}
   if($hash -ne (Get-FileHash -LiteralPath $target).Hash){throw "Original server export differs from wiki: $relative"}
   $exportPins.Add([pscustomobject]@{path=$relative;serverExportSha256=$hash;publishedSha256=$null})
  }
 }finally{$zip.Dispose()}
 if($exportPins.Count -ne 108){throw "Expected108exportedfiles, got$($exportPins.Count)"}
 $wikiPins=@(Invoke-WikiGit @('ls-files')|ForEach-Object {[pscustomobject]@{path=$_;sha256=(Get-FileHash -LiteralPath (Join-Path $wiki $_)).Hash}})
 $summary=[pscustomobject]@{operation=$Operation;changedPages=$newByPage.Count;transformedOccurrences=$changes.Count;unresolvedOccurrences=$unresolved.Count;exportedFiles=$exportPins.Count;preservedWikiFiles=$wikiPins.Count;serverZipSha256=$zipHash}
 if(-not $PSCmdlet.ShouldProcess($wiki,'Preserve original export/wiki bytes and normalize verified hrefs only')){$summary|ConvertTo-Json;return}
 [void][IO.Directory]::CreateDirectory($evidence)
 Copy-Item -LiteralPath $zipPath -Destination (Join-Path $evidence 'original-server-export.zip')
 if($zipHash -ne (Get-FileHash -LiteralPath (Join-Path $evidence 'original-server-export.zip')).Hash){throw 'ZIP backup hash mismatch'}
 $backup=Join-Path $evidence 'original-wiki'
 foreach($pin in $wikiPins){$target=Join-Path $backup $pin.path;[void][IO.Directory]::CreateDirectory((Split-Path $target));Copy-Item -LiteralPath (Join-Path $wiki $pin.path) -Destination $target;if($pin.sha256 -ne (Get-FileHash -LiteralPath $target).Hash){throw "Backup mismatch:$($pin.path)"}}
 Copy-Item -LiteralPath (Join-Path $repo 'docs/evidence/release15/wiki-publish-receipt.json') -Destination (Join-Path $evidence 'original-publication-receipt.json')
 foreach($page in $newByPage.Keys){[IO.File]::WriteAllText((Join-Path $wiki $page),$newByPage[$page],[Text.UTF8Encoding]::new($false))}
 foreach($pin in $exportPins){$pin.publishedSha256=(Get-FileHash -LiteralPath (Join-Path $wiki $pin.path)).Hash}
 $receipt=[ordered]@{schema='wordpairs-wiki-publication-repair/v1';preparedAt=(Get-Date -Format s);sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261030T221507Z-wiki-link-audit';parentRequestId='req-20261030T203656Z-cline-beam-release';sourceHead=$sourceHead;originalWikiHead=$oldHead;serverZipSha256=$zipHash;serverZipUnchanged=$true;producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;transforms=$changes.ToArray();unresolved=$unresolved.ToArray();originalWikiPins=$wikiPins;exportFiles=$exportPins.ToArray();summary=$summary;published=$false;semanticReadbackReceipt=$null;newWikiHead=$null;remoteWikiHead=$null;limitations=@('Canonical source-only URLs are pinned to the verified local source revision; remote source publication is a separate root-owned operation, not verified by local tree existence.','Four original /tmp screenshot targets have no exact original-file hash evidence and remain unresolved rather than inferred from similar archived filenames.','Native server export is unchanged; published hrefs are an explicitly normalized projection, not byte-identical server export pages.','External HTTP/rendering was not exhaustively probed. No requirement content, status, criteria or application behavior was changed.')}
 [IO.File]::WriteAllText($receiptPath,($receipt|ConvertTo-Json -Depth 35)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
 $summary|ConvertTo-Json
 return
}
if(-not $SemanticReadbackReceipt -or -not(Test-Path -LiteralPath $SemanticReadbackReceipt)){throw 'Fresh semantic readback receipt is required'}
$semantic=Get-Content -LiteralPath $SemanticReadbackReceipt -Raw|ConvertFrom-Json
foreach($kind in @('functional','technical','testing','mappings')){if($semantic.comparison.$kind.equal -ne $true){throw "Semantic readback mismatch:$kind"}}
if($semantic.mappingResponseEqual -ne $true){throw 'Mapping response mismatch'}
if(-not $CommitSignature -or -not $CommitSignature.StartsWith('Signed: ')){throw 'Exact verified runtime commit signature required'}
$receipt=Get-Content -LiteralPath $receiptPath -Raw|ConvertFrom-Json
if($receipt.published){throw 'Publication already recorded'}
foreach($pin in $receipt.exportFiles){if($pin.publishedSha256 -ne (Get-FileHash -LiteralPath (Join-Path $wiki $pin.path)).Hash){throw "Prepared file drift:$($pin.path)"}}
$expected=@($receipt.transforms.page|Sort-Object -Unique)
$actual=@(Invoke-WikiGit @('diff','--name-only'))
if(@(Compare-Object $expected $actual).Count){throw 'Wiki diff includes unexpected or missing paths'}
foreach($pin in $receipt.originalWikiPins|Where-Object path -NotIn $expected){if($pin.sha256 -ne (Get-FileHash -LiteralPath (Join-Path $wiki $pin.path)).Hash){throw "Unrelated file changed:$($pin.path)"}}
if(-not $PSCmdlet.ShouldProcess('https://github.com/sharpninja/wordpairs.wiki.git','Commit and push verified href-only publication projection')){return}
Invoke-WikiGit (@('add','--')+$expected)|Out-Null
$message="docs: repair published wiki source links`n`nNormalize verified page, asset and source-only hrefs. Preserve raw server export and unresolved historical references in the repair receipt.`n`n$CommitSignature"
Invoke-WikiGit @('commit','-m',$message)|Out-Null
$head=@(Invoke-WikiGit @('rev-parse','HEAD'))[0]
Invoke-WikiGit @('push','origin','HEAD:master')|Out-Null
$remote=@(Invoke-WikiGit @('ls-remote','origin','refs/heads/master'))[0].Split("`t")[0]
if($remote -ne $head){throw 'Remote wiki revision mismatch'}
foreach($pin in $receipt.exportFiles){
 $localBlob=@(Invoke-WikiGit @('rev-parse',"${head}:$($pin.path)"))[0]
 $remoteBlob=@(Invoke-WikiGit @('rev-parse',"${remote}:$($pin.path)"))[0]
 if($localBlob -ne $remoteBlob){throw "Remote blob mismatch:$($pin.path)"}
 $pin|Add-Member -NotePropertyName gitBlob -NotePropertyValue $localBlob
}
$receipt.published=$true;$receipt.newWikiHead=$head;$receipt.remoteWikiHead=$remote;$receipt.semanticReadbackReceipt=[IO.Path]::GetRelativePath($repo,$SemanticReadbackReceipt);$receipt|Add-Member -NotePropertyName publishedAt -NotePropertyValue (Get-Date -Format s)
$receipt|Add-Member -NotePropertyName semanticReadbackSha256 -NotePropertyValue (Get-FileHash -LiteralPath $SemanticReadbackReceipt).Hash
[IO.File]::WriteAllText($receiptPath,($receipt|ConvertTo-Json -Depth 35)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
[pscustomobject]@{published=$true;head=$head;remote=$remote;verifiedExportFiles=$receipt.exportFiles.Count;unresolved=$receipt.unresolved.Count}|ConvertTo-Json
