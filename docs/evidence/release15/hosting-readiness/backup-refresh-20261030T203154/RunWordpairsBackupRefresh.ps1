#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][ValidateSet('staging','production')][string]$Environment,[ValidateSet('WhatIf','Run')][string]$Mode='WhatIf')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root='<repo>'
$directory=Join-Path $root 'docs/evidence/release15/hosting-readiness/backup-refresh-20261030T203154'
$producer=Join-Path $directory 'Invoke-WordpairsEncryptedBackup-refresh.ps1'
$expected='B4BA738228AF74ADF82E6642F11BB3305C38DAA6B48DAE07E4DF7185727979F9'
$record=Join-Path $directory ($Environment+'-'+$Mode.ToLowerInvariant()+'-invocation.json')
if(Test-Path -LiteralPath $record){throw 'Preserve every prior operation attempt'}
if((Get-FileHash -LiteralPath $producer).Hash -cne $expected){throw 'Pinned backup producer changed'}
if($Mode -eq 'Run'){$prior=Get-Content -LiteralPath (Join-Path $directory ($Environment+'-whatif-invocation.json')) -Raw|ConvertFrom-Json;if($prior.exitCode -ne 0 -or $prior.producerSha256 -cne $expected){throw 'Matching successful native producer WhatIf required'}}
if($Mode -eq 'Run' -and $Environment -eq 'production'){$staging=Get-Content -LiteralPath (Join-Path $directory 'staging-run-invocation.json') -Raw|ConvertFrom-Json;if($staging.exitCode -ne 0 -or @($staging.newReceiptPaths).Count -ne 1){throw 'Successful staged backup must precede production'};$verified=Get-Content -LiteralPath $staging.newReceiptPaths[0] -Raw|ConvertFrom-Json;if($verified.status -cne 'verified_app_restore'){throw 'Staging restore verification required before production'}}
if(-not $PSCmdlet.ShouldProcess($Environment,($Mode+' existing read-only APP backup producer with owned isolated restore and protected full native streams'))){return}
$runnerCopy=Join-Path $directory 'RunWordpairsBackupRefresh.ps1';if(-not (Test-Path -LiteralPath $runnerCopy)){Copy-Item -LiteralPath $PSCommandPath -Destination $runnerCopy};$runnerHash=(Get-FileHash -LiteralPath $PSCommandPath).Hash;if((Get-FileHash -LiteralPath $runnerCopy).Hash -cne $runnerHash){throw 'Preserve original invocation producer; source changed'}
$private='<home>/github/WordGame/.mcpServer/wordpairs-local/backups/operation-logs/backup-refresh-20261030T203154'
[void][IO.Directory]::CreateDirectory($private);[IO.File]::SetUnixFileMode($private,[IO.UnixFileMode]::UserRead-bor[IO.UnixFileMode]::UserWrite-bor[IO.UnixFileMode]::UserExecute)
$stdout=Join-Path $private ($Environment+'-'+$Mode.ToLowerInvariant()+'.stdout.log');$stderr=Join-Path $private ($Environment+'-'+$Mode.ToLowerInvariant()+'.stderr.log')
if((Test-Path -LiteralPath $stdout) -or (Test-Path -LiteralPath $stderr)){throw 'Preserve native stream originals'}
$before=@(Get-ChildItem -LiteralPath $directory -File -Filter ('backup-*-'+$Environment+'.json')|ForEach-Object Name)
$started=[DateTimeOffset]::Now
$info=[Diagnostics.ProcessStartInfo]::new((Get-Command pwsh -CommandType Application|Select-Object -First 1).Source);$info.UseShellExecute=$false;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
$arguments=@('-NoProfile','-NonInteractive','-File',$producer,'-Environment',$Environment);if($Mode -eq 'WhatIf'){$arguments+=@('-WhatIf')}
foreach($argument in $arguments){$info.ArgumentList.Add($argument)}
$process=[Diagnostics.Process]::new();$process.StartInfo=$info
try{[void]$process.Start();$output=$process.StandardOutput.ReadToEndAsync();$errors=$process.StandardError.ReadToEndAsync();$process.WaitForExit();$exit=$process.ExitCode;[IO.File]::WriteAllText($stdout,$output.GetAwaiter().GetResult());[IO.File]::WriteAllText($stderr,$errors.GetAwaiter().GetResult())}finally{$process.Dispose()}
foreach($path in @($stdout,$stderr)){[IO.File]::SetUnixFileMode($path,[IO.UnixFileMode]::UserRead-bor[IO.UnixFileMode]::UserWrite)}
$after=@(Get-ChildItem -LiteralPath $directory -File -Filter ('backup-*-'+$Environment+'.json')|Where-Object Name -NotIn $before|ForEach-Object FullName)
[pscustomobject]@{startedAtLocal=$started.ToString('o');finishedAtLocal=[DateTimeOffset]::Now.ToString('o');environment=$Environment;mode=$Mode;executable=$info.FileName;arguments=$arguments;exitCode=$exit;producer=$producer;producerSha256=$expected;producerUnchanged=((Get-FileHash -LiteralPath $producer).Hash -ceq $expected);runnerCopy=$runnerCopy;runnerSha256=$runnerHash;newReceiptPaths=$after;privateStdout=@{path=$stdout;sha256=(Get-FileHash -LiteralPath $stdout).Hash};privateStderr=@{path=$stderr;sha256=(Get-FileHash -LiteralPath $stderr).Hash};sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261031T013147Z-app-backup-refresh';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';qualification='Operational producer invocation only, no source test/build or hosted mutation. Full native streams retained privately without printing contents.'}|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $record
[pscustomobject]@{path=$record;sha256=(Get-FileHash -LiteralPath $record).Hash;exitCode=$exit;newReceiptPaths=$after}|ConvertTo-Json -Depth 8
if($exit -ne 0){throw 'Backup producer failed; preserve native streams and safe receipt before further action'}
if($Mode -eq 'Run' -and $after.Count -ne 1){throw 'Exactly one fresh environment backup receipt required'}
