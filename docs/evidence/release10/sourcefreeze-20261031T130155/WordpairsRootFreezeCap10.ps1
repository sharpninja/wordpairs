#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$root='<repo>'
$dirty=@(& git -C $root ls-files --modified --others --exclude-standard | Sort-Object -Unique)
if($LASTEXITCODE){throw 'Cannot enumerate candidate files'}
if(@(& git -C $root diff --cached --name-only).Count){throw 'An existing staged change must be inspected before this isolated source commit'}
$documentPaths=@('README.md','docs/ATTRIBUTIONS.md','docs/release15-completion-plan.md','docs/submission/README.md','docs/submission/hv-evidence.md','docs/testing.md','docs/word_association_game_requirements.md','docs/admin_pwa_release.md','docs/architecture_design.md','docs/ac_gap_analysis.md','docs/ac_test_inventory.md','docs/category_artwork.md','docs/deployment_plan.md','docs/implementation_plan.md','docs/local_development.md','docs/room_sync_fix.md')
$candidate=@($dirty|Where-Object {$_ -match '^(src|tests|scripts)/' -or $_ -in $documentPaths -or $_ -match '^docs/testing/ui/(cases/TEST-(CONFIGUREDCAPACITY-024|FIRSTCATEGORY-004|FREETIERQUOTAHANDLING-037|PLAYERLIMIT-002|ROOMJOINING-001|ROOMSYNC-139)\.md|decisions\.md|implementation-plan\.md|implementation\.md|index\.md|questions\.md)$' -or $_ -match '^docs/evidence/release10/operational-producers/Hosting(?:RunRelease10Evidence|InitializeRelease10Evidence|RunRelease10EvidenceChain|StartRelease10EvidenceChain)\.ps1$'})
if(-not $candidate.Count){throw 'No intended CAP10 source/document changes found'}
$modelPath=Join-Path $root 'docs/evidence/release10/operational-preparation-20261031T124550/root-runtime-identity.json'
$identity=Get-Content -LiteralPath $modelPath -Raw|ConvertFrom-Json
if($identity.threadId -cne '01a17901-193c-7163-bb57-05a12ae57269' -or $identity.latestTurnMetadata.model -cne 'gpt-6.1-sol' -or $identity.latestTurnMetadata.effort -cne 'ultra' -or -not $identity.latestTurnMetadata.cwdMatchesWordGame){throw 'Root model/effort must be verified by the retained runtime metadata'}
$marker=Get-Content -LiteralPath (Join-Path $root 'AGENTS-README-FIRST.yaml') -Raw|ConvertFrom-Yaml
$knownSecrets=@([string]$marker.apiKey)
$passwordPath='<home>/.creds/supabase.pwd'
if(Test-Path -LiteralPath $passwordPath){$password=[IO.File]::ReadAllText($passwordPath).Trim();if($password.Length -ge 10){$knownSecrets+=$password}}
$problems=@();$checks=@();$pins=@()
foreach($relative in $candidate){
    $path=Join-Path $root $relative
    if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw "Missing intended candidate: $relative"}
    $item=Get-Item -LiteralPath $path
    if($item.Length -gt 95000000){$problems+="Oversize artifact: $relative";continue}
    $text=[IO.File]::ReadAllText($path)
    if(@($knownSecrets|Where-Object {$text.Contains($_)}).Count -or $text -match '-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----'){$problems+="Private material in intended candidate: $relative"}
    $pins+=[pscustomobject]@{path=$relative;sha256=(Get-FileHash -LiteralPath $path).Hash}
    if($item.Extension -in @('.ps1','.psm1')){
        $tokens=$null;$errors=$null
        [void][Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
        $issues=@(Invoke-ScriptAnalyzer -Path $path -Severity Warning,Error -WhatIf:$false)
        $checks+=[pscustomobject]@{path=$relative;parserErrors=@($errors).Count;analyzerIssues=$issues.Count;details=@($issues|Select-Object RuleName,Line,Message)}
        if($errors.Count -or $issues.Count){$problems+="Parser/analyzer issue: $relative"}
    }
}
& git -C $root diff --check -- @candidate
if($LASTEXITCODE){$problems+='Intended source/document whitespace check failed'}
if($problems.Count){$problems;$checks|Where-Object {$_.parserErrors -or $_.analyzerIssues}|ConvertTo-Json -Depth 6;throw 'Sourcefreeze preflight failed'}
[pscustomobject]@{at=(Get-Date -Format s);candidateCount=$candidate.Count;candidatePaths=$candidate;analyzedPowerShell=$checks.Count;knownSecretOccurrences=0;scope='Intended CAP10 source/current documents and four operational producers only; historical mutable reports and unrelated evidence remain untouched.'}|ConvertTo-Json -Depth 5
if(-not $PSCmdlet.ShouldProcess($root,'Commit the inspected CAP10 candidate for frozen-source validation; no push or deployment')){return}
$directory=Join-Path $root ('docs/evidence/release10/sourcefreeze-'+(Get-Date -Format yyyyMMddTHHmmss))
[void][IO.Directory]::CreateDirectory($directory)
$copy=Join-Path $directory 'WordpairsRootFreezeCap10.ps1'
Copy-Item -LiteralPath $PSCommandPath -Destination $copy
if((Get-FileHash -LiteralPath $copy).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Freeze producer copy differs'}
$receiptPath=Join-Path $directory 'preflight.json'
[pscustomobject]@{at=(Get-Date -Format s);parentRevision=(& git -C $root rev-parse HEAD).Trim();candidate=$pins;parserAndAnalyzer=$checks;producerSha256=(Get-FileHash -LiteralPath $copy).Hash;runtimeMetadataPath=$modelPath;runtimeMetadataSha256=(Get-FileHash -LiteralPath $modelPath).Hash;qualification='Local source commit only. Independent HV, full frozen validation, push, provider migrations and deployment remain unperformed.'}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $receiptPath
foreach($pin in $pins){if((Get-FileHash -LiteralPath (Join-Path $root $pin.path)).Hash -cne $pin.sha256){throw 'Candidate changed during freeze'}}
$messagePath=Join-Path $directory 'commit-message.txt'
@('fix: cap new games at 10 players','','Enforce the requested 2..10 range in the shared domain and a new forward SQL migration. Preserve historical larger games, the default of four players and the separate 25-observer limit. Update current rules, requirements-linked documents, test contracts and exact-count evidence preparation.','','Frozen candidate for the full release validation chain and Cline Beam High hostile review. Focused results do not establish release completion or hosted behavior.','','Signed: gpt-6.1-sol-ultra@Codex | Confidence: correctness 98%, accuracy 99%, completeness 90%')|Set-Content -LiteralPath $messagePath
$retained=@($copy,$receiptPath,$messagePath)|ForEach-Object {[IO.Path]::GetRelativePath($root,$_)}
& git -C $root add -- @candidate @retained
if($LASTEXITCODE){throw 'Intended CAP10 staging failed'}
$staged=@(& git -C $root diff --cached --name-only | Sort-Object -Unique)
$expected=@(@($candidate)+@($retained)|Sort-Object -Unique)
if(@(Compare-Object $expected $staged).Count){throw 'Staged file set differs from the inspected candidate'}
& git -C $root diff --cached --check
if($LASTEXITCODE){throw 'Staged source whitespace check failed'}
& git -C $root commit --file $messagePath
if($LASTEXITCODE){throw 'CAP10 source commit failed'}
& git -C $root rev-parse HEAD
