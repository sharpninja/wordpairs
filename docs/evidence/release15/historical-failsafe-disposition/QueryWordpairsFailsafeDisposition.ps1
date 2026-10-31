#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([string]$WorkspaceFilter='',[string]$OutputName='query-groups-current.json')
$ErrorActionPreference='Stop'
$repo='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
$queryParams=@{}
if($WorkspaceFilter){$queryParams.workspacePath=$WorkspaceFilter}
$result=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot '/tmp/wordpairs-release-selfcheck-codex' -Method workflow.triage.queryGroups -ParamsObject $queryParams|ConvertFrom-Yaml
if($result.type -ne 'result'){throw 'Supported triage group query failed; normal plugin failure handling is required'}
$foundObjects=[Collections.Generic.List[object]]::new()
function Find-ExactDedupe($Value){
 if($Value -is [Collections.IDictionary]){
  $text=$Value|ConvertTo-Json -Depth 50 -Compress
  if(($Value.Contains('groupId') -or $Value.Contains('reportId')) -and $text.Contains('wordpairs-health-timeout-20261028')){$foundObjects.Add($Value);return}
  foreach($key in $Value.Keys){Find-ExactDedupe $Value[$key]}
 }elseif($Value -is [Collections.IEnumerable] -and $Value -isnot [string]){foreach($item in $Value){Find-ExactDedupe $item}}
}
Find-ExactDedupe $result.payload.result
$receipt=[ordered]@{readAtLocal=(Get-Date -Format s);method='workflow.triage.queryGroups';params=$queryParams;agent='Codex';workspace=$repo;sessionId='Codex-20261030T200118Z-plugin-session';requestId='req-20261031T003421Z-failsafe-disposition';topLevelKeys=@($result.payload.result.Keys);totalCount=$result.payload.result.totalCount;exactDedupe='wordpairs-health-timeout-20261028';matchingObjects=$foundObjects.ToArray();qualification='Exact dedupe taken from original failsafe producer, not inferred from5ca5 prefix. Explicit filter and current authorization scope are recorded; this is not a universal absence claim.'}
$receipt|ConvertTo-Json -Depth 50
$path=Join-Path $repo ('docs/evidence/release15/historical-failsafe-disposition/'+$OutputName)
if($PSCmdlet.ShouldProcess($path,'Retain safe exact-dedupe group-query projection')){
 if(Test-Path -LiteralPath $path){throw 'Preserve previous query projection'}
 [void](New-Item -ItemType Directory -Path (Split-Path $path) -Force)
 $receipt|ConvertTo-Json -Depth 50|Set-Content -LiteralPath $path
}
