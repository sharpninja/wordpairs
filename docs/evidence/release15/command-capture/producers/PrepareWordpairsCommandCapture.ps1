#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('requirements','preserve')][string]$Mode='requirements')
$ErrorActionPreference='Stop'
$repo='<repo>'
if($Mode -eq 'requirements'){
 $plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
 $r=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot '/tmp/wordpairs-release-selfcheck-codex' -Method workflow.requirements.effective -ParamsObject @{}|ConvertFrom-Yaml
 if($r.type -ne 'result'){throw 'Effective requirement read failed'}
 function Find-CaptureRequirement($Value){
  if($Value -is [Collections.IDictionary]){
   if($Value.Contains('id') -and ([string]$Value.id -in @('TR-MULTIPLAYER-INTEGRATION-034','TR-ROOM-SYNCRECOVERY-038','TEST-ROOMSYNC-139','TEST-MULTIPLAYERINTEGRATION-134') -or [string]$Value.id -match 'CONNECTION.*(009|109)$')){
    [pscustomobject]@{id=$Value.id;scopeStartLayerKey=$Value.scopeStartLayerKey;status=$Value.status;body=$Value.body;acceptanceCriteria=@($Value.acceptanceCriteria|Where-Object {$_.id -in @('TR-34-C01','TR-34-C02','TR-09-C01','VERIFY-TR-09','LIVE-02','LIVE-07')})}|ConvertTo-Json -Depth 10
   }
   foreach($key in $Value.Keys){Find-CaptureRequirement $Value[$key]}
  }elseif($Value -is [Collections.IEnumerable] -and $Value -isnot [string]){foreach($item in $Value){Find-CaptureRequirement $item}}
 }
 [pscustomobject]@{currentLayer=$r.payload.result.currentLayer;timestamp=(Get-Date -Format s)}|ConvertTo-Json
 Find-CaptureRequirement $r.payload.result
 return
}
$lane=Join-Path $repo 'docs/evidence/release15/frozen-cca320b/live-ui'
$target=Join-Path $lane 'command-capture-supplement'
if(Test-Path -LiteralPath $target){throw 'Retain existing preservation supplement'}
$sources=@(& rg --files --hidden $lane|Where-Object {$_ -notlike "$target/*"})
$sources+=@(foreach($name in @('live-scale-9-failure-ui.json','live-scale-9.json','live-local-stdout.log','live-local-stderr.log','live-local-database-errors.log','live-local-game-storage.log','live-local-realtime-storage.log')){$path=Join-Path $repo "docs/evidence/room-sync/$name";if(Test-Path -LiteralPath $path -PathType Leaf){$path}})
$sources+=@('tests/browser/live-player-counts.integration.spec.ts','tests/browser/live-multiplayer.integration.spec.ts','tests/browser/request-diagnostics.ts','src/web/game-panel.tsx','src/web/room-screen.tsx'|ForEach-Object {Join-Path $repo $_})
$items=@(foreach($source in $sources|Sort-Object -Unique){$relative=[IO.Path]::GetRelativePath($repo,$source);[pscustomobject]@{source=$source;destination=Join-Path $target "retained/$relative";sha256=(Get-FileHash -LiteralPath $source).Hash;bytes=(Get-Item -LiteralPath $source).Length}})
if($PSCmdlet.ShouldProcess($target,"Copy/hash verify/retain $($items.Count) failed lane artifacts and source files before subsequent fixed-name reports")){
 [void](New-Item -ItemType Directory -Path $target)
 foreach($item in $items){[void](New-Item -ItemType Directory -Path (Split-Path $item.destination) -Force);Copy-Item -LiteralPath $item.source -Destination $item.destination;if((Get-FileHash -LiteralPath $item.destination).Hash -cne $item.sha256 -or (Get-FileHash -LiteralPath $item.source).Hash -cne $item.sha256){throw 'Preserved copy/source hash mismatch'}}
 Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $target 'producer.ps1')
 $producerHash=(Get-FileHash -LiteralPath $PSCommandPath).Hash
 if((Get-FileHash -LiteralPath (Join-Path $target 'producer.ps1')).Hash -cne $producerHash){throw 'Preservation producer copy differs'}
 [ordered]@{timestamp=(Get-Date -Format s);kind='failed-cca320b-matrix-command-body-capture-preservation';ownSessionId='Codex-20261030T200118Z-plugin-session';ownRequestId='req-20261030T225947Z-command-capture';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';files=$items;producerSha256=$producerHash;originalsRetained=$true;copiesVerified=$true;qualification='Actual failed lane and currently available raw nine-player diagnostics preserved without runtime reconstruction, retries or acceptance claims.'}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $target 'manifest.json')
}
[pscustomobject]@{files=$items.Count;bytes=($items|Measure-Object bytes -Sum).Sum;target=$target;timestamp=(Get-Date -Format s)}|ConvertTo-Json
