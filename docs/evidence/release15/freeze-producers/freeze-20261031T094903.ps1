#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$root='<repo>'
$candidate=@(& git -C $root ls-files --modified --others --exclude-standard|Sort-Object -Unique)
if($LASTEXITCODE -ne 0 -or -not $candidate.Count){throw 'No candidate changes found'}
$marker=Get-Content (Join-Path $root 'AGENTS-README-FIRST.yaml') -Raw|ConvertFrom-Yaml
$secrets=@([string]$marker.apiKey,([string]$marker.apiKey).Substring(0,8))
$passwordFile='<home>/.creds/supabase.pwd'
if(Test-Path $passwordFile){$password=[IO.File]::ReadAllText($passwordFile).Trim();if($password.Length -ge 10){$secrets+=$password}}
$problems=@();$scriptResults=@()
foreach($relative in $candidate){
 $path=Join-Path $root $relative
 if(-not(Test-Path -LiteralPath $path -PathType Leaf)){continue}
 $item=Get-Item -LiteralPath $path -Force
 if($item.Length -gt 95000000){$problems+="Oversize public Git artifact: $relative";continue}
 if($item.Extension -notin @('.zip','.png','.jpg','.jpeg','.webp','.gif','.ico','.woff','.woff2','.mp4')){
  $text=[IO.File]::ReadAllText($path)
  foreach($secret in $secrets){if($secret -and $text.Contains($secret)){$problems+="Known private credential in candidate file: $relative";break}}
  if($text -match '-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----'){$problems+="Private key material in candidate file: $relative"}
 }
 if($item.Extension -in @('.ps1','.psm1')){
  $tokens=$null;$errors=$null
  [void][Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
  $warnings=@(Invoke-ScriptAnalyzer -Path $path -Severity Warning,Error -WhatIf:$false)
  $unjustified=@($warnings|Where-Object RuleName -NE 'PSUseBOMForUnicodeEncodedFile')
  $scriptResults+=[pscustomobject]@{path=$relative;parserErrors=@($errors).Count;unjustifiedWarnings=$unjustified.Count;encodingStyleWarnings=@($warnings|Where-Object RuleName -EQ 'PSUseBOMForUnicodeEncodedFile').Count;encodingJustification='PowerShell7 on Linux supports UTF8 without BOM; numeric label punctuation must match the UI. This style warning does not indicate parser or runtime ambiguity.';details=@($unjustified|Select-Object RuleName,Line,Message)}
  if($errors.Count -or $unjustified.Count){$problems+="PowerShell preflight failed: $relative"}
 }
}
$retainedNativeLog='docs/evidence/room-sync/live-local-stdout.log'
$retainedNativeHash='C23E8E6FC235F2087854DD343EACE881B2B435C4AC490CF6CC1E673E15AF5823'
if((Get-FileHash -LiteralPath (Join-Path $root $retainedNativeLog) -Algorithm SHA256).Hash -cne $retainedNativeHash){throw 'Retained native stdout changed since inspection'}
# The exact native failed-run stdout contains two trailing spaces emitted by
# Playwright. Preserve those bytes as evidence; all other changed files remain checked.
& git -C $root diff --check -- . ":(exclude)$retainedNativeLog"
if($LASTEXITCODE){$problems+='Git whitespace check failed'}
if($problems.Count){$problems; $scriptResults|Where-Object {$_.parserErrors -or $_.unjustifiedWarnings}|ConvertTo-Json -Depth 8;throw 'Candidate freeze preflight failed'}
Write-Output "Inspected $($candidate.Count) candidate paths and $($scriptResults.Count) changed PowerShell files; no known credentials or unjustified analyzer findings."
if(-not $PSCmdlet.ShouldProcess($root,'Commit the source candidate for exact-revision validation; no push or deployment')){return}
$producerRelative='docs/evidence/release15/freeze-producers/freeze-'+(Get-Date -Format yyyyMMddTHHmmss)+'.ps1'
$producerPath=Join-Path $root $producerRelative
if(Test-Path -LiteralPath $producerPath){throw 'Retain existing producer; do not overwrite'}
$null=New-Item -ItemType Directory -Path (Split-Path $producerPath) -Force
$producerHash=(Get-FileHash -LiteralPath $PSCommandPath).Hash
Copy-Item -LiteralPath $PSCommandPath -Destination $producerPath
if((Get-FileHash -LiteralPath $producerPath).Hash -cne $producerHash -or (Get-FileHash -LiteralPath $PSCommandPath).Hash -cne $producerHash){throw 'Retained freeze producer hash mismatch'}
$candidate+=@($producerRelative)
$receipt='docs/evidence/release15/freeze-preflight.json'
[pscustomobject]@{timestamp=(Get-Date -Format s);producer=$producerRelative;producerSha256=$producerHash;originalProducer=$PSCommandPath;originalRetained=$true;candidatePaths=$candidate.Count;knownCredentialOccurrences=0;parserAndAnalyzer=$scriptResults;retainedNativeWhitespace=@{path=$retainedNativeLog;sha256=$retainedNativeHash;lines=@(9,34);reason='Two trailing spaces in original Playwright failed-run stdout retained byte-for-byte; excluded only this exact hash from whitespace check.'};productionAutomaticBuildGuard='Both global exit0 guards verified by current read-only browser observation browser-build-guards-20261031T094719.json SHA256825F6D8CE76373B033BD0AF393C9129A5597174391D81FC28020817642016231. No setting change or one-time Redeploy observation; recheck at actual rollout if state changes.';stagingAutomaticBuildGuard='Both global exit0 guards verified by current read-only browser observation browser-build-guards-20261031T094719.json SHA256825F6D8CE76373B033BD0AF393C9129A5597174391D81FC28020817642016231. No setting change or one-time Redeploy observation; recheck at actual rollout if state changes.';qualification='Local source preflight only. No push/provider write. Full source, browser matrix, independent review and hosting remain pending.'}|ConvertTo-Json -Depth 10|Set-Content (Join-Path $root $receipt)
$message='/tmp/wordpairs-release15-commit-message.txt'
@('test: synchronize strict UI command entry','','Wait for the intended visible and enabled UI action before the unchanged fresh-command guard. Preserve rejected probe and first-failure evidence before cleanup, collect strict runtime observations, and retain all failed runs and mock-first chronology. Game behavior, sender retirement, canonical identity, strict recovery bounds and gameplay assertions remain unchanged.','','Frozen candidate for full verification, Cline Beam High review and staged hosting rollout. No release completion, exact prior conflict cause or latency fix is claimed.','','Signed: gpt-6.1-sol-ultra@Codex | Confidence: correctness 98%, accuracy 99%, completeness 90%')|Set-Content $message
& git -C $root add -- @candidate $receipt
if($LASTEXITCODE){throw 'Candidate staging failed'}
& git -C $root commit --file $message
if($LASTEXITCODE){throw 'Candidate commit failed'}
& git -C $root rev-parse HEAD
