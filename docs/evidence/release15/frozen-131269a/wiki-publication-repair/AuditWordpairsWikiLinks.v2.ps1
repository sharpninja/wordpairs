#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([switch]$Save,[switch]$AfterRepair)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Import-Module powershell-yaml
$repo='<repo>'
$wiki=Join-Path $repo '.mcpServer/wiki-publish-release15'
$output=Join-Path $repo 'docs/evidence/release15/frozen-131269a/wiki-link-audit.json'
if($AfterRepair){$output=Join-Path $repo 'docs/evidence/release15/frozen-131269a/wiki-publication-repair/after-audit.json'}
$sourceHead=(& git -C $repo rev-parse HEAD).Trim()
$wikiHead=(& git -C $wiki rev-parse HEAD).Trim()
$sourceFiles=@(& git -C $repo ls-files)
$wikiFiles=@(& git -C $wiki ls-files)
if($LASTEXITCODE -ne 0){throw 'Git inventory failed'}
$dirty=@(& git -C $wiki status --porcelain=v1)
if($dirty.Count -and -not $AfterRepair){throw 'Wiki checkout is dirty'}
if($AfterRepair){
 $repair=Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/frozen-131269a/wiki-publication-repair/receipt.json') -Raw|ConvertFrom-Json
 $expectedPaths=@($repair.transforms.page|Sort-Object -Unique)
 $dirtyPaths=@(& git -C $wiki diff --name-only)
 if(@(Compare-Object $expectedPaths $dirtyPaths).Count){throw 'Unexpected publication changes'}
 foreach($pin in $repair.exportFiles){if($pin.publishedSha256 -ne (Get-FileHash -LiteralPath (Join-Path $wiki $pin.path)).Hash){throw 'Prepared file changed'}}
}
$sourceSet=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$wikiSet=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach($f in $sourceFiles){[void]$sourceSet.Add($f)}
foreach($f in $wikiFiles){[void]$wikiSet.Add($f)}
$configuration=ConvertFrom-Yaml ([IO.File]::ReadAllText((Join-Path $repo 'docs/wiki.yaml')))
$sourceByPage=@{}
$pageBySource=@{}
foreach($d in $configuration.documents){
 if(@($d.platforms) -contains 'github'){
  $sourceByPage[$d.target]=[string]$d.source
  if(-not([string]$d.source).StartsWith('generated:')){$pageBySource[[string]$d.source]=[string]$d.target}
 }
}
function Get-NormalizedPath {
 [CmdletBinding()]
 param([string]$BaseDirectory,[string]$Target)
 $normalized=[IO.Path]::GetFullPath((Join-Path $BaseDirectory $Target))
 return $normalized
}
function Get-RelativeFile {
 [CmdletBinding()]
 param([string]$Root,[string]$Path)
 return [IO.Path]::GetRelativePath($Root,$Path).Replace('\','/')
}
function Get-DocumentAnchor {
 [CmdletBinding()]
 param([string]$Path)
 $anchors=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
 $duplicates=@{}
 $fence=$false
 foreach($line in [IO.File]::ReadAllLines($Path)){
  if($line -match '^\s*(```|~~~)'){$fence=-not $fence;continue}
  if($fence){continue}
  if($line -match '^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$'){
   $heading=$Matches[1] -replace '<[^>]+>','' -replace '!?(\[([^\]]+)\])\([^)]*\)','$2'
   $anchor=$heading.ToLowerInvariant() -replace '[^\p{L}\p{N}_\-\s]','' -replace '\s','-'
   if($duplicates.ContainsKey($anchor)){$duplicates[$anchor]++;$anchor="$anchor-$($duplicates[$anchor])"}else{$duplicates[$anchor]=0}
   [void]$anchors.Add($anchor)
  }
  foreach($m in [regex]::Matches($line,'\b(?:id|name)\s*=\s*["'']([^"'']+)["'']')){[void]$anchors.Add($m.Groups[1].Value)}
 }
 return ,$anchors
}
$anchorsByFile=@{}
$inventory=[Collections.Generic.List[object]]::new()
$unresolvedReferenceSyntax=[Collections.Generic.List[object]]::new()
$markdownFiles=@($wikiFiles | Where-Object {$_ -like '*.md'})
foreach($page in $markdownFiles){
 $path=Join-Path $wiki $page
 $lines=[IO.File]::ReadAllLines($path)
 $definitions=@{}
 for($i=0;$i -lt $lines.Length;$i++){
  if($lines[$i] -match '^\s{0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?'){$definitions[$Matches[1].ToLowerInvariant()]=$Matches[2]}
 }
 $fence=$false
 for($i=0;$i -lt $lines.Length;$i++){
  $line=$lines[$i]
  if($line -match '^\s*(```|~~~)'){$fence=-not $fence;continue}
  if($fence -or $line -match '^\s{0,3}\[[^\]]+\]:'){continue}
  $line=$line -replace '`[^`]*`',''
  $matchesHere=[Collections.Generic.List[object]]::new()
  foreach($m in [regex]::Matches($line,'(?<image>!?)\[(?<label>(?:[^\]\\]|\\.)*)\]\(\s*(?<url><[^>]+>|(?:[^\s()]+|\([^()]*\))+)\s*(?:["''][^"'']*["''])?\s*\)')){
   $matchesHere.Add([pscustomobject]@{url=$m.Groups['url'].Value.Trim('<','>');label=$m.Groups['label'].Value;kind=$(if($m.Groups['image'].Value){'image'}else{'inline'})})
  }
  foreach($m in [regex]::Matches($line,'\[(?<label>[^\]]+)\]\[(?<id>[^\]]*)\]')){
   $id=$m.Groups['id'].Value;if(-not $id){$id=$m.Groups['label'].Value}
   if($definitions.ContainsKey($id.ToLowerInvariant())){$matchesHere.Add([pscustomobject]@{url=$definitions[$id.ToLowerInvariant()];label=$m.Groups['label'].Value;kind='reference'})}else{$unresolvedReferenceSyntax.Add([pscustomobject]@{page=$page;line=$i+1;reference=$id})}
  }
  foreach($m in [regex]::Matches($line,'<(?:a|img)\b[^>]*\b(?:href|src)\s*=\s*["'']([^"'']+)["'']')){$matchesHere.Add([pscustomobject]@{url=$m.Groups[1].Value;label='HTML';kind='html'})}
  foreach($m in [regex]::Matches($line,'\[\[(?:[^|\]]+\|)?([^\]]+)\]\]')){$matchesHere.Add([pscustomobject]@{url=$m.Groups[1].Value;label='wikilink';kind='wikilink'})}
  foreach($found in $matchesHere){
   $url=[Net.WebUtility]::HtmlDecode($found.url)
   $row=[ordered]@{page=$page;line=$i+1;kind=$found.kind;label=$found.label;target=$url;classification='';publishedTarget=$null;sourceTarget=$null;sourceTracked=$null;intendedWikiTarget=$null;intendedAssetTarget=$null;anchor=$null;anchorStatus='not-present'}
   if($url -match '^(?:https?|mailto|tel|data):' -or $url.StartsWith('//')){
    $row.classification='external-not-network-verified'
    if($url -match '^https://github\.com/sharpninja/wordpairs/(?:blob|tree)/([^/]+)/(.+?)(?:#(.*))?$'){
     $row.sourceTarget=[uri]::UnescapeDataString($Matches[2]);$row.sourceTracked=$sourceSet.Contains($row.sourceTarget)
     $row.classification=$(if($row.sourceTracked){'canonical-source-target-present-current-index'}else{'canonical-source-target-not-current-index-revision-unverified'})
    }
    $inventory.Add([pscustomobject]$row);continue
   }
   $parts=$url.Split('#',2)
   $target=[uri]::UnescapeDataString($parts[0].Split('?',2)[0])
   if($parts.Length -gt 1){$row.anchor=[uri]::UnescapeDataString($parts[1])}
   $candidate=if(-not $target){$page}else{Get-RelativeFile -Root $wiki -Path (Get-NormalizedPath -BaseDirectory (Split-Path $path) -Target $target)}
   if($candidate.StartsWith('../')){$row.classification='broken-wiki-root-escape'}
   elseif($wikiSet.Contains($candidate)){$row.classification='wiki-tracked-target-present';$row.publishedTarget=$candidate}
   elseif($wikiSet.Contains("$candidate.md")){$row.classification='wiki-page-slug-present';$row.publishedTarget="$candidate.md"}
   else{$row.classification='broken-wiki-target-absent'}
   if($sourceByPage.ContainsKey($page) -and -not $sourceByPage[$page].StartsWith('generated:')){
    $sourcePage=$sourceByPage[$page]
    $sourceCandidate=if(-not $target){$sourcePage}else{Get-RelativeFile -Root $repo -Path (Get-NormalizedPath -BaseDirectory (Split-Path (Join-Path $repo $sourcePage)) -Target $target)}
    $row.sourceTarget=$sourceCandidate
    $row.sourceTracked=$sourceSet.Contains($sourceCandidate)
    if($pageBySource.ContainsKey($sourceCandidate)){$row.intendedWikiTarget=$pageBySource[$sourceCandidate]}
    if($wikiSet.Contains("assets/$sourceCandidate")){$row.intendedAssetTarget="assets/$sourceCandidate"}
   }
   if($row.anchor -and $row.publishedTarget){
    $targetFile=Join-Path $wiki $row.publishedTarget
    if($row.publishedTarget -like '*.md'){
     if(-not $anchorsByFile.ContainsKey($row.publishedTarget)){$anchorsByFile[$row.publishedTarget]=Get-DocumentAnchor -Path $targetFile}
     if($anchorsByFile[$row.publishedTarget].Contains($row.anchor)){$row.anchorStatus='present-local-gfm-heading-or-explicit-id'}else{$row.anchorStatus='unverified-anchor-no-local-heading-match'}
    }elseif($row.publishedTarget -like '*.svg'){
     $raw=[IO.File]::ReadAllText($targetFile)
     $row.anchorStatus=$(if([regex]::IsMatch($raw,'\bid\s*=\s*["'']'+[regex]::Escape($row.anchor)+'["'']')){'present-svg-id'}else{'broken-svg-id-absent'})
    }else{$row.anchorStatus='unverified-nonmarkdown-anchor'}
   }
   $inventory.Add([pscustomobject]$row)
  }
 }
}
$broken=@($inventory | Where-Object classification -Like 'broken-*')
if($AfterRepair){
 if($broken.Count -ne 4 -or @($broken|Where-Object {$_.page -ne 'Phase-6-Phone-Feedback.md' -or -not $_.target.StartsWith('/tmp/wordpairs-phase6-screenshots/')}).Count){throw 'Unexpected unresolved link after publication normalization'}
}
$external=@($inventory | Where-Object classification -EQ 'external-not-network-verified')
$summary=@($inventory | Group-Object classification | Sort-Object Name | ForEach-Object {[pscustomobject]@{classification=$_.Name;count=$_.Count}})
$pageHashes=@($markdownFiles | ForEach-Object {[pscustomobject]@{path=$_;sha256=(Get-FileHash -LiteralPath (Join-Path $wiki $_) -Algorithm SHA256).Hash}})
$receipt=[ordered]@{
 schema='wordpairs-wiki-link-audit/v1';timestamp=(Get-Date -Format s);auditClass='read-only operational selfcheck; not hostile validation';
 sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261030T221507Z-wiki-link-audit';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';
 canonicalSourceRepository='https://github.com/sharpninja/wordpairs';wikiBase='https://github.com/sharpninja/wordpairs/wiki';sourceHead=$sourceHead;wikiHead=$wikiHead;
 publicationReceipt='docs/evidence/release15/wiki-publish-receipt.json';publicationReceiptSha256=(Get-FileHash -LiteralPath (Join-Path $repo 'docs/evidence/release15/wiki-publish-receipt.json')).Hash;
 sourceConfigurationSha256=(Get-FileHash -LiteralPath (Join-Path $repo 'docs/wiki.yaml')).Hash;
 counts=[ordered]@{wikiTrackedFiles=$wikiFiles.Count;markdownPages=$markdownFiles.Count;configuredGithubDocuments=$sourceByPage.Count;linkOccurrences=$inventory.Count;brokenRelativeOccurrences=$broken.Count;pagesWithBrokenReferences=@($broken.page | Sort-Object -Unique).Count;brokenWithSourceTracked=@($broken | Where-Object sourceTracked -EQ $true).Count;brokenWithExistingExportedWikiTarget=@($broken | Where-Object intendedWikiTarget).Count;brokenWithExistingAssetTarget=@($broken | Where-Object intendedAssetTarget).Count;unprobedExternalOccurrences=$external.Count;unresolvedReferenceSyntax=$unresolvedReferenceSyntax.Count};
 classificationCounts=$summary;inventory=$inventory.ToArray();unresolvedReferenceSyntax=$unresolvedReferenceSyntax.ToArray();markdownHashes=$pageHashes;
 methodology=@('Read Git-index path inventory and current working bytes from clean wiki checkout, pinned to published revision; no fetch or HTTP probes for individual links.','Resolve inline Markdown/images, explicit reference definitions, HTML href/src, wiki brackets outside fenced code and inline code. Track source-relative intent through full parsed docs/wiki.yaml source/target mapping.','A broken classification means the exact relative path escapes the wiki root or has no tracked file/page-slug target in this published tree. It is not an observed HTTP status. Existing canonical-repository target and exported asset/page are separately reported.','Heading anchors use conservative local GFM-style derivation with duplicate suffixes and explicit HTML ids; no-match is unverified rather than a remotely observed dead anchor.');
 limitations=@('No live GitHub rendering or HTTP status probes for each link; absolute external URLs remain unverified unless current canonical index target can be checked.','Inline parser supports the documented common link forms; arbitrary nested Markdown, shortcut reference syntax, autolink text and links inside code examples are not claimed exhaustively parsed.','GitHub wiki root assets may require raw or canonical URLs depending renderer. Local existing path is target existence evidence, not a remote-rendering claim.','Plain-text requirement evidence paths, JSON provenance paths and frame identifiers are inventoried only where actual Markdown/HTML links are present; they are not automatically clickable.','No app source, generated pages, requirements, Git refs, providers, builds, tests or reviewer processes were mutated. Only this separate audit receipt may be created.');
 documentationReferences=@('https://docs.github.com/en/communities/documenting-your-project-with-wikis/editing-wiki-content','https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax');
 overall='Observed export-projection navigation gaps; not a verdict on application behavior or release acceptance';
 triage=$null
}
if(($wikiHead -ne (& git -C $wiki rev-parse HEAD).Trim()) -or ($sourceHead -ne (& git -C $repo rev-parse HEAD).Trim())){throw 'HEAD changed during audit'}
foreach($pin in $pageHashes){if($pin.sha256 -ne (Get-FileHash -LiteralPath (Join-Path $wiki $pin.path)).Hash){throw "Wiki page changed during audit: $($pin.path)"}}
if($Save){
 if(Test-Path -LiteralPath $output){throw 'Audit receipt already exists; preserve original'}
 if($PSCmdlet.ShouldProcess($output,'Create separate semantic-link audit receipt')){[IO.File]::WriteAllText($output,($receipt | ConvertTo-Json -Depth 25)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))}
}
[pscustomobject]@{timestamp=$receipt.timestamp;sourceHead=$sourceHead;wikiHead=$wikiHead;counts=$receipt.counts;classifications=$summary;brokenExamples=@($broken | Select-Object -First 12);anchorStatuses=@($inventory | Group-Object anchorStatus | ForEach-Object {[pscustomobject]@{status=$_.Name;count=$_.Count}});receipt=$output} | ConvertTo-Json -Depth 12
