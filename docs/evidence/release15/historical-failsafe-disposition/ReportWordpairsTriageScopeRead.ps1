#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0'
$cache='/tmp/wordpairs-release-selfcheck-codex'
if(-not $PSCmdlet.ShouldProcess($repo,'Write normal failsafe and submit factual triage catalog/read-scope mismatch')){return}
$env:MCP_CACHE_DIR_OVERRIDE=$cache;$env:MCP_WORKSPACE_PATH=$repo;$env:MCPSERVER_WORKSPACE_PATH=$repo;$env:MCP_AGENT_NAME='Codex';$env:MCP_PLUGIN_HOST='codex'
Import-Module (Join-Path $plugin 'lib/McpPluginShim.psm1') -Force
. (Join-Path $plugin 'lib/resolve-cache-dir.ps1')
. (Join-Path $plugin 'lib/yaml-object-mutation.ps1')
Import-McpYamlSerializer
$evidence='Read-only optional historical inquiry: own trusted Codex wrapper at wordpairs workflow.triage.queryGroups params workspacePath=<home>/github/McpServer returned220 groups and triage-group-c198e07edd07ee87 matching the retained historical report title/summary, statusfailed, reportCount1. Subsequent schema-valid workflow.triage.getGroup with that exact full groupId from catalog returned method_invocation_error/McpNotFoundException group not found at2026-10-30T19:38:56. No trust or nonce error occurred. Query filter may expose a group outside current read context; exact accepted/replayed/resolved fate is unproved. Investigate or document required scope through supported plugin surfaces; do not repair Wordpairs or infer missing data.'
$triageParams=New-McpTriageReportParams -Title 'Triage catalog workspace filter returns group unavailable to getGroup in current context' -Summary 'Supported queryGroups explicit McpServer filter returned a full groupId, but schema-valid getGroup through the same trusted Wordpairs Codex plugin context returned not found. Cross-workspace read semantics may require documented context handling; historical fate inquiry remains qualified.' -Component 'McpServer triage read API' -AffectedPaths @('skills/triage/SKILL.md','lib/McpPluginShim.psm1') -AffectedSymbols @('workflow.triage.queryGroups','workflow.triage.getGroup') -ErrorSignature 'triage_filtered_group_get_not_found' -DedupeKey 'triage-filtered-group-get-workspace-context' -Evidence $evidence -ReporterAgent 'Codex' -WorkspacePath $repo -SessionId 'Codex-20261030T200118Z-plugin-session' -TurnId 'req-20261031T003421Z-failsafe-disposition' -Tags @('incidental','read-only','scope','historical-evidence') -ReproductionHints @('Using supported plugin, queryGroups with workspacePath=<home>/github/McpServer, then getGroup on an exact catalog groupId while active workspace remains Wordpairs. Preserve scope/authorization distinctions.') -IdempotencyKey 'wordpairs-failsafe-disposition-scope-20261030'
$stamp=Get-Date -Format yyyyMMddTHHmmss
$dir=Join-Path $repo 'docs/evidence/release15/historical-failsafe-disposition'
$queue=Join-Path (Get-McpFailsafeDir -StartPath $repo) "$stamp-triage-scope-read.yaml"
Write-McpYamlObject -Path $queue -Document ([ordered]@{method='workflow.triage.report';label='triage-scope-read';timestamp=$stamp;params=$triageParams})
$backup=Join-Path $dir 'scope-read-failsafe.yaml';Copy-Item -LiteralPath $queue -Destination $backup
if((Get-FileHash -LiteralPath $queue).Hash -cne (Get-FileHash -LiteralPath $backup).Hash){throw 'Normal failsafe copy mismatch'}
$response=& (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') -Command Invoke -WorkspacePath $repo -CacheRoot $cache -Method workflow.triage.report -ParamsObject $triageParams
$response|Set-Content -LiteralPath (Join-Path $dir 'scope-read-triage-submission.yaml')
$response
