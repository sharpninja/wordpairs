#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
$r=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot '/tmp/wordpairs-release-selfcheck-codex' -Method workflow.requirements.effective -ParamsObject @{}|ConvertFrom-Yaml
if($r.type -ne 'result'){throw 'Effective requirement read failed'}
$selected=[Collections.Generic.List[object]]::new()
function Find-FreshnessRequirement($Value){
 if($Value -is [Collections.IDictionary]){
  if($Value.Contains('id') -and [string]$Value.id -match '^(FR|TR|TEST)-' -and ($Value.Contains('acceptanceCriteria') -or $Value.Contains('body'))){
   if([string]$Value.id -match 'REQUESTFEEDBACK-(030|143)$|CONNECTION.*(009|109)$|MULTIPLAYER.*(034|134)$|ROOM.?SYNC.*(038|139)$'){$selected.Add($Value)}
  }
  foreach($key in $Value.Keys){Find-FreshnessRequirement $Value[$key]}
 }elseif($Value -is [Collections.IEnumerable] -and $Value -isnot [string]){foreach($item in $Value){Find-FreshnessRequirement $item}}
}
Find-FreshnessRequirement $r.payload.result
$receipt=[ordered]@{readAtLocal=(Get-Date -Format s);workspace=$repo;currentLayer=$r.payload.result.currentLayer;sessionId='Codex-20261030T200118Z-plugin-session';requestId='req-20261031T005544Z-conflict-freshness-repair';records=@($selected.ToArray()|Sort-Object id);qualification='Fresh effective read only, no requirement/status/satisfaction changes.'}
$dir=Join-Path $repo 'docs/evidence/release15/conflict-freshness'
if($PSCmdlet.ShouldProcess($dir,'Retain fresh effective requirement support')){
 [void](New-Item -ItemType Directory -Path $dir -Force)
 if(Test-Path -LiteralPath (Join-Path $dir 'effective-requirements.json')){throw 'Preserve original fresh snapshot'}
 $receipt|ConvertTo-Json -Depth 40|Set-Content -LiteralPath (Join-Path $dir 'effective-requirements.json')
}
foreach($record in $receipt.records){[pscustomobject]@{id=$record.id;title=$record.title;body=$record.body;acceptanceCriteria=$record.acceptanceCriteria}|ConvertTo-Json -Depth 15}
