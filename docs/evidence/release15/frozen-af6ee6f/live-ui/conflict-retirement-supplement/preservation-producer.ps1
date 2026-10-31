#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/live-ui'
$out=Join-Path $folder 'conflict-retirement-supplement'
$revision='af6ee6fe0c4a288ac23f570a4fa6a94d697d8127'
function Invoke-OwnPlugin {
 param([string]$Method,[hashtable]$Parameters)
 $r=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot '/tmp/wordpairs-capacity15-codex-cache' -Method $Method -ParamsObject $Parameters | ConvertFrom-Yaml
 if($r.type -ne 'result'){throw "Required plugin failure: $Method"}
 $r.payload.result
}
function Copy-GitBlob {
 param([string]$Path,[string]$Destination)
 $start=[Diagnostics.ProcessStartInfo]::new('git');$start.WorkingDirectory=$repo;$start.UseShellExecute=$false;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
 $start.ArgumentList.Add('show');$start.ArgumentList.Add($revision+':'+$Path)
 $p=[Diagnostics.Process]::Start($start)
 $stream=[IO.File]::Create($Destination)
 try{$p.StandardOutput.BaseStream.CopyTo($stream)}finally{$stream.Dispose()}
 $problem=$p.StandardError.ReadToEnd();$p.WaitForExit()
 if($p.ExitCode -ne 0){throw ('Frozen Git blob copy failed: '+$Path+' '+$problem)}
}
$files=@(Get-ChildItem -LiteralPath $folder -File -Recurse | ForEach-Object {$_.FullName})
$manifestPath=Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/source-inventory.json'
$sourceManifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -AsHashtable
$sourceNames=@('tests/browser/live-player-counts.integration.spec.ts','tests/browser/live-multiplayer.integration.spec.ts','tests/browser/ui-command-acknowledgement.contract.ts','tests/browser/ui-command-acknowledgement.test.ts','tests/browser/ui-command-acknowledgement.ts','tests/browser/ui-command-capture.ts','tests/browser/ui-command-capture.contract.ts','tests/browser/ui-command-capture.test.ts','src/web/game-panel.tsx','src/web/room-screen.tsx')
if(-not $PSCmdlet.ShouldProcess($out,'Begin own diagnosis and copy/hash-retain failed lane native/context/PNG/runtime evidence plus exact frozen sources')){return}
if(Test-Path -LiteralPath $out){throw 'Refusing overwrite of preserved failure supplement'}
$begun=Invoke-OwnPlugin -Method 'workflow.sessionlog.beginTurn' -Parameters @{queryTitle='Diagnose known conflict retirement versus fresh command guard';queryText='Parent Codex-20261027T100516Z-plugin-session / req-20261030T203656Z-cline-beam-release delegates read-only failed af6ee6f actual4player matrix diagnosis. Preserve native2pass1fail11skip, round3/11solves, all original failure UI/context/PNG/runtime and exact frozen source copies before future run. Inspect known409 retirement using fresh guard, siblings in strict and current effective existing recovery/feedback obligations. Review release_selfcheck correction plan/oracle without source/test/build/HV/provider/requirements mutation. Do not infer transport cause or call prior124gate DOM evidence; keep unknown fresh guard strict and fix actual waiting boundary.'}
$copies=@(foreach($path in $files + @($manifestPath,(Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/expected-inventory.json')) | Sort-Object -Unique){
 $copy=Join-Path $out ('retained/'+[IO.Path]::GetRelativePath($repo,$path));[void](New-Item -ItemType Directory -Path (Split-Path $copy) -Force)
 $hash=(Get-FileHash -LiteralPath $path).Hash;Copy-Item -LiteralPath $path -Destination $copy
 if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Retained original hash mismatch'}
 [ordered]@{source=$path;retainedCopy=$copy;sha256=$hash;bytes=(Get-Item -LiteralPath $copy).Length;kind='original failed-lane evidence copied and retained'}
})
$copies+=@(foreach($path in $sourceNames){
 $pin=@($sourceManifest.sourceHashes | Where-Object path -CEQ $path)[0]
 if(-not $pin){throw 'Missing frozen source pin'}
 $copy=Join-Path $out ('retained/'+$path);[void](New-Item -ItemType Directory -Path (Split-Path $copy) -Force)
 $original=Join-Path $repo $path;$workingMatches=(Get-FileHash -LiteralPath $original).Hash -ceq $pin.sha256
 if($workingMatches){Copy-Item -LiteralPath $original -Destination $copy}else{Copy-GitBlob -Path $path -Destination $copy}
 if((Get-FileHash -LiteralPath $copy).Hash -cne $pin.sha256){throw 'Frozen source copy hash mismatch'}
 [ordered]@{source=$original;retainedCopy=$copy;sha256=$pin.sha256;bytes=(Get-Item -LiteralPath $copy).Length;workingSourceMatchedFrozen=$workingMatches;kind=if($workingMatches){'frozen source original copied and retained'}else{'exact frozen Git blob; changed working original retained'}}
})
$effective=Invoke-OwnPlugin -Method 'workflow.requirements.effective' -Parameters @{}
$effectivePath=Join-Path $out 'effective-requirements.json'
$effective | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $effectivePath -Encoding utf8NoBOM
$manifest=[ordered]@{recordedAt=(Get-Date).ToString('o');sourceHead=$revision;validationRunId='9d00fa3e-555b-4491-8b8b-4f72d3b6177d';ownSessionId=$begun.sessionId;ownRequestId=$begun.requestId;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';files=$copies;originalsRetained=$true;allCopyHashesVerified=$true;effectiveSnapshot=$effectivePath;effectiveSnapshotSha256=(Get-FileHash -LiteralPath $effectivePath).Hash;qualification='Only existing failed candidate lane files and exact public source bytes. No private runtime config, credentials, database/browser/model/provider actions. Fdee evidence and prior124 isolated gates remain unchanged.'}
$manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $out 'manifest.json') -Encoding utf8NoBOM
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $out 'preservation-producer.ps1')
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.appendDialog' -Parameters @{dialogItems=@(@{timestamp=$manifest.recordedAt;role='model';category='observation';content='Reloaded complete1profile and live9Global/0Workspace memories, PROCESS-007 excluded; current reviewer Cline/Beam/High. Opened own linked diagnosis; preserved failed af6ee6f native/context/PNG/runtime and exact frozen source bytes by copy/hash while retaining originals. No source/test/build/HV/provider/requirements edits.'})})
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.appendActions' -Parameters @{actions=@(@{order=1;type='create';status='completed';filePath='docs/evidence/release15/frozen-af6ee6f/live-ui/conflict-retirement-supplement/manifest.json';description='Preserved failed lane originals and exact frozen source copies with verified hashes, own and parent identities and current effective requirement snapshot.'})})
[ordered]@{recordedAt=$manifest.recordedAt;sessionId=$begun.sessionId;requestId=$begun.requestId;files=$copies.Count;manifest=(Join-Path $out 'manifest.json');sha256=(Get-FileHash (Join-Path $out 'manifest.json')).Hash;effectiveSha256=$manifest.effectiveSnapshotSha256} | ConvertTo-Json -Depth 5
