#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$workspace='<repo>'
$relative='docs/evidence/release15/hosting-readiness/backup-refresh-20261030T203154/'
$directory=Join-Path $workspace $relative
$baseline='<home>/github/WordGame/.mcpServer/wordpairs-local/backups/recovery-tools/Invoke-WordpairsEncryptedBackup-48EACDF6C0C5.ps1'
$expected='48EACDF6C0C5CC8BAFEA237E89D5DE0CB22C5805853DCFCAABC4043C864C95C0'
if((Get-FileHash -LiteralPath $baseline).Hash -cne $expected -or (Get-FileHash -LiteralPath '/tmp/Invoke-WordpairsEncryptedBackup.ps1').Hash -cne $expected){throw 'Reviewed backup baseline changed'}
if(Test-Path -LiteralPath $directory){throw 'Preserve all previous backup refresh evidence'}
if(-not $PSCmdlet.ShouldProcess($directory,'Retain/hash original and adapt only unique public receipt destination; pin and analyze before hosted reads')){return}
[void][IO.Directory]::CreateDirectory($directory)
$original=Join-Path $directory 'Invoke-WordpairsEncryptedBackup-original.ps1'
$adapted=Join-Path $directory 'Invoke-WordpairsEncryptedBackup-refresh.ps1'
Copy-Item -LiteralPath $baseline -Destination $original
if((Get-FileHash -LiteralPath $original).Hash -cne $expected -or (Get-FileHash -LiteralPath $baseline).Hash -cne $expected){throw 'Original retention mismatch'}
$text=[IO.File]::ReadAllText($original);$anchor='docs/evidence/release15/frozen-0fb37e6/'
if(([regex]::Matches($text,[regex]::Escape($anchor))).Count -ne 1){throw 'Unique destination adaptation anchor absent/ambiguous'}
[IO.File]::WriteAllText($adapted,$text.Replace($anchor,$relative))
if([IO.File]::ReadAllText($adapted).Replace($relative,$anchor) -cne $text){throw 'Adaptation changed more than the receipt destination'}
$prepareCopy=Join-Path $directory 'PrepareWordpairsBackupRefresh.ps1';Copy-Item -LiteralPath $PSCommandPath -Destination $prepareCopy
if((Get-FileHash -LiteralPath $prepareCopy).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Preparation producer retention differs'}
$pins=@(foreach($path in @($original,$adapted,$prepareCopy)){$tokens=$null;$parseErrors=$null;[void][Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$parseErrors);$issues=@(Invoke-ScriptAnalyzer -Path $path -Severity Warning,Error);if(@($parseErrors).Count -or $issues.Count){throw 'Producer parser/analyzer failed'};[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;parserErrors=0;analyzerIssues=0}})
$recipient='<home>/.ssh/[PRIVATE SSH KEY NAME]_[PRIVATE HOST].pub';$age='/tmp/wordpairs-age-1.3.2/age/age'
if((Get-FileHash -LiteralPath $recipient).Hash -cne 'B97FFDDACA958E2FFFE3A98C10EBC03D5E6B82D535D17AE21E589389E62980A2' -or (Get-FileHash -LiteralPath $age).Hash -cne 'EB7DD1B518F0A307C99CD97782623C5321DA049154B04ACD2D98D21AA7BC9B2C'){throw 'Existing recipient or age tool changed'}
$manifest=Join-Path $workspace 'docs/evidence/release15/frozen-6063acd/source-inventory.json'
$target=Join-Path $directory 'producer-retention.json'
[pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');sessionId='Codex-20261030T194802Z-plugin-session';requestId='req-20261031T013147Z-app-backup-refresh';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';sourceRevision=(& git -C $workspace rev-parse HEAD).Trim();sourceManifest=@{path=$manifest;sha256=(Get-FileHash -LiteralPath $manifest).Hash};baseline=$baseline;baselineSha256=$expected;adaptation='Exactly one public receipt destination string changed. All backup/source/restore/encryption/cleanup behavior retained byte-for-byte after reversing that one replacement.';producers=$pins;recipientPublicSha256=(Get-FileHash -LiteralPath $recipient).Hash;ageBinarySha256=(Get-FileHash -LiteralPath $age).Hash;powerShell=$PSVersionTable.PSVersion.ToString();analyzer=(Get-Module PSScriptAnalyzer).Version.ToString();documentation=@('https://supabase.com/changelog','https://supabase.com/docs/guides/platform/backups','https://www.postgresql.org/docs/17/app-pgdump.html');docsQualification='Public changelog.md fetch returned unsupported markdown content type; HTML changelog and current backup documentation plus connected Supabase search_docs inspected. No provider settings queried or changed.';noHostedReadYet=$true;noCredentialValueReadYet=$true}|ConvertTo-Json -Depth 20|Set-Content -LiteralPath $target
[pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;producers=$pins}|ConvertTo-Json -Depth 10
