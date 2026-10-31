#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$lane=Join-Path $repo 'docs/evidence/release15/frozen-131269a/live-ui'
$target=Join-Path $lane 'diagnostic-supplement'
if(Test-Path -LiteralPath $target){throw 'Diagnostic supplement already exists; do not overwrite preserved evidence'}
$sources=@(& rg --files --hidden $lane|Where-Object {$_ -notlike "$target/*"})
$sources+=@(foreach($name in @('live-scale-11-failure-ui.json','live-scale-11.json','live-local-stdout.log','live-local-stderr.log','live-local-database-errors.log','live-local-game-storage.log','live-local-realtime-storage.log')){
 $path=Join-Path $repo "docs/evidence/room-sync/$name"
 if(Test-Path -LiteralPath $path -PathType Leaf){$path}
})
$sources+=@('tests/browser/live-player-counts.integration.spec.ts','tests/browser/request-diagnostics.ts','tests/browser/request-diagnostics.contract.ts','tests/browser/request-diagnostics.test.ts','tests/browser/owned-room-cleanup.ts','docs/evidence/release15/frozen-131269a/runtime-observation-unavailable-20261030T171923.json','docs/evidence/release15/frozen-131269a/service.stdout.log','docs/evidence/release15/frozen-131269a/service.stderr.log'|ForEach-Object {Join-Path $repo $_})
$sources=@($sources|Sort-Object -Unique)
$planned=@(foreach($source in $sources){
 if(-not(Test-Path -LiteralPath $source -PathType Leaf)){throw "Missing source: $source"}
 $relative=[IO.Path]::GetRelativePath($repo,$source)
 [pscustomobject][ordered]@{source=$source;destination=Join-Path $target "retained/$relative";sha256=(Get-FileHash -LiteralPath $source).Hash;bytes=(Get-Item -LiteralPath $source).Length}
})
if($PSCmdlet.ShouldProcess($target,"Preserve $($planned.Count) failed-lane and source artifacts by copy, SHA256 verify, retain originals; write producer and manifest")){
 [void](New-Item -ItemType Directory -Path $target)
 foreach($item in $planned){
  [void](New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($item.destination)) -Force)
  Copy-Item -LiteralPath $item.source -Destination $item.destination
  if((Get-FileHash -LiteralPath $item.destination).Hash -cne $item.sha256 -or (Get-FileHash -LiteralPath $item.source).Hash -cne $item.sha256){throw 'Preserved artifact changed or failed copy verification'}
 }
 $producer=Join-Path $target 'producer.ps1'
 Copy-Item -LiteralPath $PSCommandPath -Destination $producer
 $producerHash=(Get-FileHash -LiteralPath $PSCommandPath).Hash
 if((Get-FileHash -LiteralPath $producer).Hash -cne $producerHash){throw 'Producer copy differs'}
 $state=Get-Content -LiteralPath '/tmp/wordpairs-release-selfcheck-codex/current-turn.yaml' -Raw|ConvertFrom-Yaml
 [ordered]@{kind='failed-eleven-player-diagnostic-preservation';timestamp=(Get-Date -Format s);revision=(& git -C $repo rev-parse HEAD).Trim();ownSessionId=$state.sessionId;ownRequestId=$state.turnRequestId;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';files=$planned;producer=@{path=$producer;sha256=$producerHash};originalsRetained=$true;copiesVerified=$true;runtimeRecreated=$false;testRetryPerformed=$false;qualification='Preserves actual failed lane and all currently available raw eleven-player diagnostics before future runs. Does not reconstruct the already removed ephemeral runtime or imply acceptance.'}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $target 'manifest.json')
}
[pscustomobject]@{target=$target;plannedFiles=$planned.Count;bytes=($planned|Measure-Object -Property bytes -Sum).Sum;timestamp=(Get-Date -Format s)}|ConvertTo-Json
