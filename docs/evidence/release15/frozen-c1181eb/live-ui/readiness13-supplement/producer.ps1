#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$lane=Join-Path $repo 'docs/evidence/release15/frozen-c1181eb/live-ui'
$target=Join-Path $lane 'readiness13-supplement'
$files=@(Get-ChildItem -LiteralPath $lane -Recurse -File|Where-Object {-not $_.FullName.StartsWith($target+[IO.Path]::DirectorySeparatorChar,[StringComparison]::Ordinal)})
$runtime=@(Get-ChildItem -LiteralPath (Join-Path $repo 'docs/evidence/room-sync') -File|Where-Object Name -Match '^live-scale-13(?:-failure-ui)?\.json$')
$source=@('tests/browser/live-player-counts.integration.spec.ts','tests/browser/live-multiplayer.integration.spec.ts','tests/browser/ui-command-capture.ts','tests/browser/ui-command-acknowledgement.ts','tests/browser/ui-command-acknowledgement.contract.ts','tests/browser/readiness-barrier.ts','src/web/room-screen.tsx','src/web/game-panel.tsx','src/application/lobby-service.ts')
$source=@($source|Where-Object {Test-Path -LiteralPath (Join-Path $repo $_)})
$originals=@($files.FullName)+@($runtime.FullName)+@($source|ForEach-Object {Join-Path $repo $_})
foreach($path in $originals){
 if([IO.Path]::GetExtension($path) -in @('.json','.xml','.log','.md')){
  $text=Get-Content -LiteralPath $path -Raw
  if($text -match '(?i)"(?:api[_-]?key|client[_-]?secret|database[_-]?password|access[_-]?token)"\s*:\s*"[^"\s]{12,}"|postgres(?:ql)?://[^\s"'']+:[^\s"'']+@|Bearer\s+[A-Za-z0-9_.-]{20,}'){
   throw "Potential secret field in $([IO.Path]::GetFileName($path)); preserve separately before public copy"
  }
 }
}
if(-not $PSCmdlet.ShouldProcess($target,"Copy/hash verify and retain $($originals.Count) original safe native/runtime/source files")){return}
if(Test-Path -LiteralPath $target){throw 'Preserve existing diagnostic supplement'}
[void](New-Item -ItemType Directory -Path $target)
$pins=@(foreach($path in $originals){
 $relative=[IO.Path]::GetRelativePath($repo,$path)
 $copy=Join-Path $target ('retained/'+$relative)
 [void](New-Item -ItemType Directory -Path (Split-Path $copy) -Force)
 $before=(Get-FileHash -LiteralPath $path).Hash
 Copy-Item -LiteralPath $path -Destination $copy
 $after=(Get-FileHash -LiteralPath $path).Hash;$copied=(Get-FileHash -LiteralPath $copy).Hash
 if($before -cne $after -or $before -cne $copied){throw 'Original/copy changed during preservation'}
 [pscustomobject]@{source=$relative;copy=[IO.Path]::GetRelativePath($repo,$copy);sha256=$copied;bytes=(Get-Item -LiteralPath $copy).Length;originalRetained=$true}
})
$producer=Join-Path $target 'producer.ps1';Copy-Item -LiteralPath $PSCommandPath -Destination $producer
if((Get-FileHash -LiteralPath $producer).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Preservation producer copy mismatch'}
$manifest=[ordered]@{recordedAt=(Get-Date -Format s);sessionId='Codex-20261030T200118Z-plugin-session';requestId='req-20261031T005003Z-readiness13-diagnosis';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';head=(& git -C $repo rev-parse HEAD).Trim();files=$pins;filesCopied=$pins.Count;producerSha256=(Get-FileHash -LiteralPath $producer).Hash;originalsRetained=$true;noTestsOrReruns=$true;secretEnvironmentFilesExcluded=$true;qualification='Safe original native lane, screenshots/error contexts, bounded runtime receipts and relevant source copies. No runtime environment or credentials exported; no cause or runtime acceptance inferred.'}
$manifest|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $target 'manifest.json')
[pscustomobject]@{path=(Join-Path $target 'manifest.json');sha256=(Get-FileHash -LiteralPath (Join-Path $target 'manifest.json')).Hash;files=$pins.Count;recordedAt=$manifest.recordedAt}|ConvertTo-Json
