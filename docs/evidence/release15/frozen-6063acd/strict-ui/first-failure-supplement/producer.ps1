#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$lane=Join-Path $repo 'docs/evidence/release15/frozen-6063acd/strict-ui'
$target=Join-Path $lane 'first-failure-supplement'
$own=Get-Content -LiteralPath /tmp/wordpairs-strict606-session.json -Raw|ConvertFrom-Json
$files=@(Get-ChildItem -LiteralPath $lane -Recurse -File|Where-Object {-not $_.FullName.StartsWith($target+[IO.Path]::DirectorySeparatorChar,[StringComparison]::Ordinal)})
$originalArtifacts=Join-Path $repo 'test-results/live-local/live-multiplayer.integrati-7521b-lines-renewal-and-reconnect'
$extra=@(if(Test-Path -LiteralPath $originalArtifacts){Get-ChildItem -LiteralPath $originalArtifacts -Recurse -File})
$sources=@('tests/browser/live-multiplayer.integration.spec.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/ui-command-acknowledgement.ts','tests/browser/ui-command-acknowledgement.contract.ts','tests/browser/ui-command-capture.ts','tests/browser/ui-command-capture.contract.ts','tests/browser/ui-command-retirement.contract.ts','tests/browser/request-diagnostics.ts','src/web/room-screen.tsx','src/web/game-panel.tsx','src/application/lobby.ts','playwright.live.config.ts')
$sources=@($sources|Where-Object {Test-Path -LiteralPath (Join-Path $repo $_)})
$paths=@(@($files.FullName)+@($extra.FullName)+@($sources|ForEach-Object {Join-Path $repo $_})|Sort-Object -Unique)
foreach($path in $paths){
 if([IO.Path]::GetExtension($path) -in '.json','.xml','.log','.md'){
  $text=Get-Content -LiteralPath $path -Raw
  if($text -match '(?i)"(?:api[_-]?key|client[_-]?secret|database[_-]?password|access[_-]?token)"\s*:\s*"[^"\s]{12,}"|postgres(?:ql)?://[^\s"'']+:[^\s"'']+@|Bearer\s+[A-Za-z0-9_.-]{20,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b'){throw ('Potential secret in '+[IO.Path]::GetFileName($path)+'; no public copy performed')}
 }
}
if(-not $PSCmdlet.ShouldProcess($target,"Copy/hash/retain $($paths.Count) original first strict native/runtime/context/source files")){return}
if(Test-Path -LiteralPath $target){throw 'Preserve existing first strict failure supplement'}
[void](New-Item -ItemType Directory -Path $target)
$pins=@(foreach($path in $paths){
 $relative=[IO.Path]::GetRelativePath($repo,$path);$copy=Join-Path $target ('retained/'+$relative)
 [void](New-Item -ItemType Directory -Path (Split-Path $copy) -Force)
 $before=(Get-FileHash -LiteralPath $path).Hash;Copy-Item -LiteralPath $path -Destination $copy
 if((Get-FileHash -LiteralPath $path).Hash -cne $before -or (Get-FileHash -LiteralPath $copy).Hash -cne $before){throw 'Original/copy drift during first strict preservation'}
 [ordered]@{source=$relative;copy=[IO.Path]::GetRelativePath($repo,$copy);sha256=$before;bytes=(Get-Item -LiteralPath $copy).Length;originalRetained=$true}
})
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $target 'producer.ps1')
$producer=(Get-FileHash -LiteralPath $PSCommandPath).Hash;if((Get-FileHash -LiteralPath (Join-Path $target 'producer.ps1')).Hash -cne $producer){throw 'Preservation producer differs'}
$png=@($pins|Where-Object source -Like '*.png');$contexts=@($pins|Where-Object source -Like '*error-context.md')
[ordered]@{atLocal=(Get-Date -Format s);head=(& git -C $repo rev-parse HEAD).Trim();ownSessionId=$own.sessionId;ownRequestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;files=$pins;copiedFiles=$pins.Count;producerSha256=$producer;originalsRetained=$true;pngFiles=$png;errorContexts=$contexts;pngQualification=if($png.Count){'Only actual existing files copied'}else{'No PNG exists in archived strict lane or matching original Playwright artifact folder at preservation; no screenshot invented'};noRerun=$true;credentialsEnvironmentExcluded=$true}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $target 'manifest.json')
[ordered]@{atLocal=(Get-Date -Format s);path=(Join-Path $target 'manifest.json');sha256=(Get-FileHash -LiteralPath (Join-Path $target 'manifest.json')).Hash;files=$pins.Count;pngCount=$png.Count;errorContexts=$contexts}|ConvertTo-Json -Depth 6
