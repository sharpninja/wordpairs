#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Scope','Triage','Semantic')][string]$Operation)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$repo='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0'
$argsBase=@{Command='Invoke';WorkspacePath=$repo;CacheRoot='/tmp/wordpairs-release-audit-20261030';PluginRoot=$plugin}
if($Operation -eq 'Scope'){
 & (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @argsBase -Method 'workflow.sessionlog.updateTurn' -ParamsObject @{interpretation='Scope expanded by parent at17:19: minimally normalize publication-copy hrefs only, preserve exact server ZIP and original wiki bytes, source tree remains frozen. Use explicit verified source-to-export page/asset map, current-source-only URLs only for verified Git targets, disclose unresolved historical paths. Publish wiki only after fresh effective-QBrain/mapping unchanged-semantic readback, preserve unrelated files, verify remote bytes. No application/docs-source/tests/scripts/requirements/plan edits.';tags=@('wiki-link-audit','publication-repair-authorized','not-HV','parent:Codex-20261027T100516Z-plugin-session','parentRequest:req-20261030T203656Z-cline-beam-release')}
}elseif($Operation -eq 'Triage'){
 Import-Module (Join-Path $plugin 'lib/McpPluginShim.psm1') -Force
 $p=New-McpTriageReportParams -Title 'GitHub wiki export flattens document paths without rewriting repository-relative links' -Summary 'Supported requirements wiki/all ZIP preserves source-relative hrefs while flattening source pages. In Wordpairs published f0c112b,939 relative-link occurrences on93pages escape wiki root or have no tracked published target.399 point to existing exported pages and477 to existing exported assets under assets/docs. UI-Index cases/TEST-ROOMJOINING-001.md is exported as TEST-ROOMJOINING-001-UI-Case.md; invitation case ../receipt.json actually lives at assets/docs/testing/ui/receipt.json. Canonical server ZIP remains preserved. This is export projection/navigation failure, not application behavior failure. Repair server exporter source-path->target-page/asset mapping including anchors and all sibling links; preserve exact requirement content, source evidence, native manifest and unrelated wiki pages. Acceptance: every rewritten target exists, original input ZIP retained, reruns deterministic, no semantic requirement edits, missing original targets remain explicit.' -Component 'McpServer requirements wiki exporter' -AffectedPaths @('docs/wiki.yaml','docs/requirements/requirements-wiki-documents.zip','docs/evidence/release15/frozen-131269a/wiki-link-audit.json') -AffectedSymbols @('workflow.requirements.generateDocument') -ErrorSignature 'github_wiki_flattened_source_relative_href' -DedupeKey 'requirements-wiki-github-flattened-source-links' -Evidence 'Audit109markdownpages/1417actualhrefs atwikiHEADf0c112bdf8b535f5ba618da9355260153d73815e,appHEAD131269a590046a3c1c83314d11ff79f2b731799c; source link intent parsed from full docs/wiki.yaml. No per-link HTTP checks; absence is Git-tree target evidence. Audit receipt preserves each occurrence and current tracked source correspondence.' -ReporterAgent Codex -WorkspacePath $repo -SessionId 'Codex-20261030T194802Z-plugin-session' -TurnId 'req-20261030T221507Z-wiki-link-audit' -Tags @('wiki','export','projection','relative-links')
 & (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @argsBase -Method 'workflow.triage.report' -ParamsObject $p
}else{
 Import-Module powershell-yaml
 function ConvertTo-CanonicalValue {
  [CmdletBinding()]
  param([AllowNull()][object]$Value)
  if($null -eq $Value){return $null}
  if($Value -is [Collections.IDictionary]){$map=[ordered]@{};foreach($key in @($Value.Keys|Sort-Object)){$map[$key]=ConvertTo-CanonicalValue $Value[$key]};return $map}
  if($Value -is [Collections.IEnumerable] -and $Value -isnot [string]){$list=[Collections.Generic.List[object]]::new();foreach($entry in $Value){$list.Add((ConvertTo-CanonicalValue $entry))};return ,$list.ToArray()}
  return $Value
 }
 $directory=Join-Path $repo 'docs/evidence/release15/frozen-131269a/wiki-publication-repair'
 $records=@{}
 foreach($method in @('workflow.requirements.effective','workflow.requirements.listMappings')){
  $raw=& (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @argsBase -Method $method -ParamsObject @{}
  $result=ConvertFrom-Yaml ($raw -join "`n")
  if($result.type -ne 'result' -or -not $result.payload.result){throw "Readback failed:$method"}
  $records[$method]=$result.payload.result
 }
 $expected=Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/qbrain-after.json') -Raw|ConvertFrom-Json -AsHashtable
 $expectedMappings=Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/qbrain-mappings.json') -Raw|ConvertFrom-Json -AsHashtable
 $actual=$records['workflow.requirements.effective'];$actualMappings=$records['workflow.requirements.listMappings']
 $comparison=[ordered]@{}
 $differentFields=[Collections.Generic.List[object]]::new()
 foreach($kind in @('functional','technical','testing','mappings')){
  $before=ConvertTo-CanonicalValue @($expected[$kind]|Sort-Object id)
  $after=ConvertTo-CanonicalValue @($actual[$kind]|Sort-Object id)
  $comparison[$kind]=[pscustomobject]@{beforeCount=@($expected[$kind]).Count;afterCount=@($actual[$kind]).Count;equal=(($before|ConvertTo-Json -Depth 100 -Compress) -ceq ($after|ConvertTo-Json -Depth 100 -Compress))}
  if($kind -ne 'mappings'){
   foreach($prior in $expected[$kind]){
    $current=@($actual[$kind]|Where-Object id -EQ $prior.id)[0]
    foreach($key in $prior.Keys){if((ConvertTo-CanonicalValue $prior[$key]|ConvertTo-Json -Depth 100 -Compress) -cne (ConvertTo-CanonicalValue $current[$key]|ConvertTo-Json -Depth 100 -Compress)){$differentFields.Add([pscustomobject]@{kind=$kind;id=$prior.id;field=$key;beforeType=$(if($null -eq $prior[$key]){'null'}else{$prior[$key].GetType().FullName});afterType=$(if($null -eq $current[$key]){'null'}else{$current[$key].GetType().FullName})})}}
   }
  }
 }
 $mappingRawEqual=((ConvertTo-CanonicalValue $expectedMappings|ConvertTo-Json -Depth 100 -Compress) -ceq (ConvertTo-CanonicalValue $actualMappings|ConvertTo-Json -Depth 100 -Compress))
 foreach($item in @($expectedMappings.items)+@($actualMappings.items)){if(@($item.Keys|Where-Object {$_ -notin @('frId','trId','testId','createdAt')}).Count){throw 'Unknown mapping field requires inspection'}}
 $beforeEdges=@($expectedMappings.items|ForEach-Object {[pscustomobject]@{frId=$_.frId;trId=$(if($_.ContainsKey('trId')){$_.trId}else{$null});testId=$(if($_.ContainsKey('testId')){$_.testId}else{$null})}}|Sort-Object frId,trId,testId)
 $afterEdges=@($actualMappings.items|ForEach-Object {[pscustomobject]@{frId=$_.frId;trId=$(if($_.ContainsKey('trId')){$_.trId}else{$null});testId=$(if($_.ContainsKey('testId')){$_.testId}else{$null})}}|Sort-Object frId,trId,testId)
 $mappingEqual=(($beforeEdges|ConvertTo-Json -Depth 10 -Compress) -ceq ($afterEdges|ConvertTo-Json -Depth 10 -Compress))
 $out=[ordered]@{timestamp=(Get-Date -Format s);sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261030T221507Z-wiki-link-audit';methods=@($records.Keys);producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;comparison=$comparison;mappingResponseEqual=$mappingEqual;mappingResponseRawEqual=$mappingRawEqual;mappingComparedFields=@('frId','trId','testId');mappingExcludedField='createdAt only: known per-read timestamp defect triage e7f86b4c590b44c0bb2624afa3becaba; full raw current records preserved';mappingEdgeCount=$afterEdges.Count;differentFields=$differentFields.ToArray();effective=$actual;mappingResponse=$actualMappings}
 $path=Join-Path $directory 'semantic-readback-normalized.json'
 if(Test-Path -LiteralPath $path){throw 'Preserve prior semantic readback'}
 if($PSCmdlet.ShouldProcess($path,'Save fresh effective-requirement and mapping unchanged-semantics readback')){[void][IO.Directory]::CreateDirectory($directory);[IO.File]::WriteAllText($path,($out|ConvertTo-Json -Depth 100)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))}
 [pscustomobject]@{path=$path;comparison=$comparison;mappingResponseEqual=$mappingEqual;differentFields=@($differentFields|Group-Object field|ForEach-Object {[pscustomobject]@{field=$_.Name;count=$_.Count;sample=$_.Group[0]}})}|ConvertTo-Json -Depth 6
 if(@($comparison.Values|Where-Object equal -NE $true).Count -or -not $mappingEqual){throw 'Live requirements/mapping differ from preserved export-source readback; stop publication pending parent reconciliation'}
}
