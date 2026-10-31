#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$root='<repo>'
$parent='007afa52bb2e7bd34f561bf0683b5e6659ab7227'
if((& git -C $root rev-parse HEAD).Trim() -cne $parent){throw 'Unexpected parent revision'}
if(@(& git -C $root diff --cached --name-only).Count){throw 'Unrelated staged changes must remain untouched'}
$proof=Get-Content -LiteralPath (Join-Path $root 'docs/evidence/release10/hosting-catalog-digits-20261031T135700/real-provenance.json') -Raw|ConvertFrom-Json
$pins=@($proof.ownedAfter)+@([pscustomobject]@{path='tests/integration/hosting-schema.test.ts';sha256='B089D032D74F46DBEB995E7714E2C8C49708F2BB7A2B6CB86FC646366E518802'})
foreach($pin in $pins){if((Get-FileHash -LiteralPath (Join-Path $root $pin.path)).Hash -cne $pin.sha256){throw "Reviewed source differs: $($pin.path)"}}
$sourcePaths=@('src','tests','scripts','public','package.json','package-lock.json','tsconfig.json','next.config.ts','biome.json','vitest*.config.ts','playwright*.config.ts')
$changed=@(& git -C $root diff --name-only -- @sourcePaths)+@(& git -C $root ls-files --others --exclude-standard -- @sourcePaths)
if(@(Compare-Object @($pins.path|Sort-Object) @($changed|Sort-Object)).Count){throw 'Source diff is outside the reviewed thirteen files'}
$docs=@('docs/deployment_plan.md','docs/hosting_execution.md','docs/release15-completion-plan.md','docs/wiki.yaml')
$intended=@($pins.path)+$docs
& git -C $root diff --check -- @intended
if($LASTEXITCODE){throw 'Reviewed source/document whitespace check failed'}
if(-not $PSCmdlet.ShouldProcess($root,'Commit only thirteen reviewed hosting correction files and four reviewed guides; no push or release completion')){return}
$directory=Join-Path $root ('docs/evidence/release10/catalog-freeze-'+(Get-Date -Format yyyyMMddTHHmmss))
[void][IO.Directory]::CreateDirectory($directory)
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $directory 'producer.ps1')
if((Get-FileHash -LiteralPath $PSCommandPath).Hash -cne (Get-FileHash -LiteralPath (Join-Path $directory 'producer.ps1')).Hash){throw 'Retained producer differs'}
$receipt=Join-Path $directory 'review.json'
[pscustomobject]@{at=(Get-Date -Format s);parentRevision=$parent;sourcePins=$pins;documentPins=@($docs|ForEach-Object {[pscustomobject]@{path=$_;sha256=(Get-FileHash -LiteralPath (Join-Path $root $_)).Hash}});powerShellCases=50;reviewPreparationCases=22;typescriptHostingCases=6;failed=0;skipped=0;mockBeforeProduction=$true;qualification='Reviewed bounded source freeze only. Dirty workspace focused receipts do not establish frozen full gate, independent HV, hosted migration or deployment completion.'}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $receipt
$message=Join-Path $directory 'commit-message.txt'
@('fix: include numeric migration suffixes','','Include014_capacity10 in the hosting catalog. Preserve SQL bytes and history checks. Retain six TypeScript history cases, expand the PowerShell planner contract to eight cases with independent omission and invalid-name controls, and propagate report expectations. Reconcile rollout guard instructions and current wiki titles.','','Both mock gates preceded the production correction. Focused real checks pass; fresh frozen full validation and independent review remain required. No hosted or release completion is claimed.','','Signed: gpt-6.1-sol-ultra@Codex | Confidence: correctness 99%, accuracy 99%, completeness 92%')|Set-Content -LiteralPath $message
$retained=@('producer.ps1','review.json','commit-message.txt')|ForEach-Object {[IO.Path]::GetRelativePath($root,(Join-Path $directory $_))}
$expected=@(@($intended)+@($retained)|Sort-Object -Unique)
& git -C $root add -- @expected
if($LASTEXITCODE){throw 'Bounded source staging failed'}
$staged=@(& git -C $root diff --cached --name-only|Sort-Object -Unique)
if(@(Compare-Object $expected $staged).Count){throw 'Staged paths differ from exact allowlist'}
& git -C $root diff --cached --check
if($LASTEXITCODE){throw 'Staged whitespace check failed'}
& git -C $root commit --file $message
if($LASTEXITCODE){throw 'Bounded source commit failed'}
& git -C $root rev-parse HEAD
