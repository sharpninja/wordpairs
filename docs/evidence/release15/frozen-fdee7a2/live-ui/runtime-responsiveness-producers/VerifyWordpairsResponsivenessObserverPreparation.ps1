#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$workspace='<repo>'
$directory=Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/live-ui/runtime-responsiveness-producers'
$producer=Join-Path $directory 'WatchWordpairsOwnedRuntime.ps1'
$target=Join-Path $directory 'whatif-native.json'
if(Test-Path $target){throw 'Preserve prior verification receipt'}
if(-not $PSCmdlet.ShouldProcess($target,'Capture native placeholder WhatIf only and verify retained hashes')){return}
$parameters=@('-NoProfile','-NonInteractive','-File',$producer,'-UnitName','wordpairs-replay-example.service','-ControlGroup','/user.slice/wordpairs-replay-example.service','-InvocationId','00000000000000000000000000000000','-RuntimeDirectory',(Join-Path $workspace '.mcpServer/ui-00000000000000000000000000000000'),'-RunId','00000000-0000-0000-0000-000000000000','-SourceHead','fdee7a2569bb4742e008977e2a9cd7d312def859','-SourceManifest',(Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/source-inventory.json'),'-OutputDirectory',(Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/live-ui/observer-whatif-placeholder'),'-WhatIf')
$info=[Diagnostics.ProcessStartInfo]::new('pwsh');$info.UseShellExecute=$false;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
foreach($argument in $parameters){$info.ArgumentList.Add($argument)}
$start=[DateTimeOffset]::Now;$process=[Diagnostics.Process]::Start($info)
try{$out=$process.StandardOutput.ReadToEndAsync();$err=$process.StandardError.ReadToEndAsync();$process.WaitForExit();$stdout=$out.GetAwaiter().GetResult();$stderr=$err.GetAwaiter().GetResult();$exit=$process.ExitCode}finally{$process.Dispose()}
$end=[DateTimeOffset]::Now
if($exit -ne 0 -or $stderr -or $stdout -notmatch 'What if:' -or (Test-Path (Join-Path $workspace 'docs/evidence/release15/frozen-fdee7a2/live-ui/observer-whatif-placeholder'))){throw 'Native WhatIf verification failed'}
[IO.File]::WriteAllText((Join-Path $directory 'observer-whatif.stdout.log'),$stdout)
[IO.File]::WriteAllText((Join-Path $directory 'observer-whatif.stderr.log'),$stderr)
$preparationPath=Join-Path $directory 'preparation.json'
$preparation=Get-Content -Raw $preparationPath|ConvertFrom-Json -Depth 100
$readback=@(foreach($pin in $preparation.producerPins){$hash=(Get-FileHash -LiteralPath $pin.retained).Hash;if($hash -cne $pin.sha256){throw 'Retained producer hash mismatch'};[ordered]@{path=$pin.retained;sha256=$hash;matches=$true}})
$record=[ordered]@{recordedAt=$end.ToString('o');startedAt=$start.ToString('o');finishedAt=$end.ToString('o');executable='pwsh';arguments=$parameters;exitCode=$exit;stdout=@{path=(Join-Path $directory 'observer-whatif.stdout.log');sha256=(Get-FileHash (Join-Path $directory 'observer-whatif.stdout.log')).Hash};stderr=@{path=(Join-Path $directory 'observer-whatif.stderr.log');sha256=(Get-FileHash (Join-Path $directory 'observer-whatif.stderr.log')).Hash;length=$stderr.Length};preparation=@{path=$preparationPath;sha256=(Get-FileHash $preparationPath).Hash;unchanged=$true};producerReadback=$readback;scope='Native placeholder-only WhatIf, no systemctl/docker/database or measurement operations executed. Earlier preparation.message was empty because in-process ShouldProcess host output was not captured; this append-only receipt preserves actual native stdout.';measurementOutputCreated=$false;sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261030T233950Z-runtime-responsiveness-diagnosis'}
$record|ConvertTo-Json -Depth 100|Set-Content $target
$copy=Join-Path $directory (Split-Path $PSCommandPath -Leaf)
Copy-Item -LiteralPath $PSCommandPath -Destination $copy
if((Get-FileHash $copy).Hash -cne (Get-FileHash $PSCommandPath).Hash){throw 'Verification producer copy mismatch'}
[IO.File]::AppendAllText('/tmp/wordpairs-runtime-responsiveness-result.txt',([Environment]::NewLine+'Native placeholder WhatIf readback: '+$target+', SHA256 '+(Get-FileHash $target).Hash+'. Exit 0, stderr empty, no measurement output, all 3 retained producer hashes match; original preparation receipt preserved.'))
[pscustomobject]@{path=$target;sha256=(Get-FileHash $target).Hash;exitCode=$exit;producerReadback=$readback;observerMeasurementExecuted=$false}|ConvertTo-Json -Depth 20
