#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
$cache='/tmp/wordpairs-capacity15-codex-cache'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-fdee7a2/live-ui'
$destination=Join-Path $folder 'disabled-input-supplement'
function Invoke-OwnPlugin {
 param([string]$Method,[hashtable]$Parameters)
 $reply=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot $cache -Method $Method -ParamsObject $Parameters | ConvertFrom-Yaml
 if($reply.type -ne 'result'){throw "Required plugin failure: $Method"}
 $reply.payload.result
}
if(-not $PSCmdlet.ShouldProcess($destination,'Begin own read-only ten-player failure turn, snapshot current requirements and preserve original frozen evidence/source copies')){return}
$begun=Invoke-OwnPlugin -Method 'workflow.sessionlog.beginTurn' -Parameters @{queryTitle='Diagnose ten-player disabled answer and UI acknowledgement';queryText='Parent Codex-20261027T100516Z-plugin-session / req-20261030T203656Z-cline-beam-release delegates READONLY frozen fdee7a2 ten-player failure diagnosis. Current native ordinary matrix8pass/1fail/5skip after17 UI-counted solves in round2; AggregateError original request waiter timeout and disabled Your answer input. Preserve all original failure artifacts/source bytes before another fixed-name run, inspect all10 UI snapshots, actual actor/command diagnostics and frontend pending/busy/confirmed/version lifecycle. Distinguish driver HTTP acknowledgement from actual UI acknowledgement; possible11.6s response versus10s frontend timeout remains hypothesis until exact actor/request linkage. No tests/builds/source/provider/requirements mutations or cap/policy/timeouts relaxation. Safe structured whole-chain diagnosis; current Cline/Beam/High reviewer remains pending independent HV.'}
$effective=Invoke-OwnPlugin -Method 'workflow.requirements.effective' -Parameters @{}
$snapshot='/tmp/wordpairs-disabled-input-effective.json'
$effective | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $snapshot -Encoding utf8NoBOM
if(Test-Path -LiteralPath $destination){throw 'Preserve previous supplement; do not overwrite'}
$files=@(Get-ChildItem -LiteralPath $folder -File -Recurse | ForEach-Object { $_.FullName })
$files+=@('tests/browser/live-player-counts.integration.spec.ts','tests/browser/live-multiplayer.integration.spec.ts','tests/browser/ui-command-capture.ts','tests/browser/ui-command-capture.contract.ts','tests/browser/ui-command-capture.test.ts','src/web/game-panel.tsx','src/web/room-screen.tsx','src/web/realtime-room.ts','src/domain/match.ts' | ForEach-Object {Join-Path $repo $_} | Where-Object {Test-Path -LiteralPath $_})
$copies=@(foreach($path in $files | Sort-Object -Unique){
 $relative=[IO.Path]::GetRelativePath($repo,$path)
 $copy=Join-Path $destination ('retained/'+$relative)
 [void](New-Item -ItemType Directory -Path (Split-Path $copy) -Force)
 Copy-Item -LiteralPath $path -Destination $copy
 $hash=(Get-FileHash -LiteralPath $path).Hash
 if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Preserved copy mismatch'}
 [ordered]@{source=$path;retainedCopy=$copy;sha256=$hash;bytes=(Get-Item -LiteralPath $path).Length}
})
$manifest=[ordered]@{recordedAt=(Get-Date).ToString('o');kind='read-only-fdee7a2-ten-player-disabled-input-original-preservation';sourceHead='fdee7a2569bb4742e008977e2a9cd7d312def859';runId='0f337bfa-39c7-4650-b35d-6ee8d698be0f';ownSessionId=$begun.sessionId;ownRequestId=$begun.requestId;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';files=$copies;originalsRetained=$true;allCopyHashesVerified=$true;effectiveSnapshot=$snapshot;effectiveSnapshotSha256=(Get-FileHash -LiteralPath $snapshot).Hash;producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;qualification='Copied only existing frozen failure-lane artifacts and named public source files; no private runtime settings, credentials or database access. No retry, browser, build or provider action.'}
$manifestPath=Join-Path $destination 'manifest.json'
$manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $manifestPath -Encoding utf8NoBOM
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $destination 'preservation-producer.ps1')
[ordered]@{recordedAt=$manifest.recordedAt;sessionId=$begun.sessionId;requestId=$begun.requestId;files=$copies.Count;manifest=$manifestPath;sha256=(Get-FileHash -LiteralPath $manifestPath).Hash;effectiveSnapshotSha256=$manifest.effectiveSnapshotSha256} | ConvertTo-Json -Depth 4
