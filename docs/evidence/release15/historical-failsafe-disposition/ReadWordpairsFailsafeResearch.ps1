#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
$queryParams=@{groupId='triage-group-c198e07edd07ee87';workspacePath='<home>/github/McpServer'}
$r=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot '/tmp/wordpairs-release-selfcheck-codex' -Method workflow.triage.queryRuns -ParamsObject $queryParams|ConvertFrom-Yaml
if($r.type -ne 'result'){throw 'Supported scoped research query failed'}
$runs=@(foreach($run in $r.payload.result.items){
 if($run.groupId -cne $queryParams.groupId){throw 'Research query returned another group'}
 $group=if($run.groupJson){$run.groupJson|ConvertFrom-Json}else{$null}
 [ordered]@{runId=$run.runId;groupId=$run.groupId;status=$run.status;groupStatus=$run.groupStatus;groupTitle=$run.groupTitle;groupSummary=$run.groupSummary;reportCount=$run.reportCount;startedUtc=$run.startedUtc;completedUtc=$run.completedUtc;createdTodoId=$run.createdTodoId;error=$run.error;agentExitCode=$run.agentExitCode;groupSnapshot=$group;qualification='Only the retained group input is projected. Raw model prompt/output/stdout/stderr are excluded.'}
})
$receipt=[ordered]@{readAtLocal=(Get-Date -Format s);method='workflow.triage.queryRuns';params=$queryParams;totalCount=$r.payload.result.totalCount;runs=$runs;qualification='Supported explicit workspace/group read. Research failure does not imply intake failure or resolution. Original failsafe origin requires exact provenance beyond matching title.'}
$receipt|ConvertTo-Json -Depth 40
$path=Join-Path $repo 'docs/evidence/release15/historical-failsafe-disposition/research-readback.json'
if($PSCmdlet.ShouldProcess($path,'Retain safe exact-group research input and disposition')){
 if(Test-Path -LiteralPath $path){throw 'Preserve prior research receipt'}
 $receipt|ConvertTo-Json -Depth 40|Set-Content -LiteralPath $path
}
