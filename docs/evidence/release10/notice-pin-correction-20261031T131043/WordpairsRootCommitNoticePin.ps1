#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$root='<repo>'
$parent='f6b65ca19a2043a30e61477bcfd4c05c9c0fcd77'
$relative='tests/ac-contracts/oracle-supplemental-validation.test.ts'
if((& git -C $root rev-parse HEAD).Trim() -cne $parent){throw 'Expected retained failed candidate differs'}
if(@(& git -C $root diff --cached --name-only).Count){throw 'Unrelated staged changes must remain untouched'}
$sourcePaths=@('src','tests','scripts','public','package.json','package-lock.json','tsconfig.json','next.config.ts','biome.json','vitest*.config.ts','playwright*.config.ts')
$changed=@(& git -C $root diff --name-only -- @sourcePaths)
if($changed.Count -ne 1 -or $changed[0] -cne $relative){throw 'Only the reviewed notice test may change in this correction'}
$pins=@{LICENSE='AAF135472F81C5B4A0DCA9367E5BB5E9750032B5BEBE5442B36E4C0A47430DF3';'docs/ATTRIBUTIONS.md'='C7215F7738C1E092F15C4908C50CB477D21F70460CF9355CF2D7952E8A73BE79';'docs/word_association_round_flow.svg'='DA03873D53E31A9E7D84D772CAB14BBFCD47BFDF0C285580A468DC39822C2BB0'}
foreach($path in $pins.Keys){if((Get-FileHash -LiteralPath (Join-Path $root $path)).Hash -cne $pins[$path]){throw "Reviewed notice input differs: $path"}}
$testPath=Join-Path $root $relative
$test=Get-Content -LiteralPath $testPath -Raw
if($test.Contains('c34b69d1c56d4df056223e1ab2b9330df239cf6773bbc1b644628bd5622444ae') -or -not $test.Contains($pins['docs/ATTRIBUTIONS.md'].ToLowerInvariant())){throw 'Expected reviewed attribution pin correction is absent'}
& git -C $root diff --check -- $relative
if($LASTEXITCODE){throw 'Notice correction whitespace check failed'}
& git -C $root diff -- $relative
if(-not $PSCmdlet.ShouldProcess($root,'Commit only the reviewed attribution pin correction and retained operational receipts; no push')){return}
$directory=Join-Path $root ('docs/evidence/release10/notice-pin-correction-'+(Get-Date -Format yyyyMMddTHHmmss))
[void][IO.Directory]::CreateDirectory($directory)
$copy=Join-Path $directory 'WordpairsRootCommitNoticePin.ps1'
Copy-Item -LiteralPath $PSCommandPath -Destination $copy
if((Get-FileHash -LiteralPath $copy).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Producer copy differs'}
$receipt=Join-Path $directory 'review.json'
[pscustomobject]@{at=(Get-Date -Format s);parentRevision=$parent;originalTestSha256='40F41B16D0096DEF853B02205A705C730EF09FDB831AD96F3D388FF62326EB15';currentTestSha256=(Get-FileHash -LiteralPath $testPath).Hash;reviewedNoticePins=$pins;sourceChange=$relative;failedNativeJUnit='docs/evidence/release10/frozen-f6b65ca-20261031T130221/full/unit.xml';failedNativeSha256='AE125EEFAD1E1280653480CB07F550C9FD1C0F2E72046B23B2EB0D3A09CB3C29';failures=1;passes=982;skipped=0;decision='Correct the independent reviewed-document pin after inspecting truthful AI-art provenance and preserved dependency/font notices. Do not derive expectations inside the test, alter the validator or weaken any negative control. Historical notice hashes remain history.';qualification='Test metadata correction only. No legal rights clearance, current test pass, independent review, push or hosted claim.'}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $receipt
$message=Join-Path $directory 'commit-message.txt'
@('test: refresh reviewed attribution pin','','Align the AC-42 archive expectation with the reviewed attribution document that records the twelve AI-generated backgrounds. Preserve GPL and embedded font pins, the validator and every negative control. Retain the first frozen983-case run:982passed,1failed,0skipped.','','No artwork rights clearance or release completion is claimed. Fresh complete validation remains required.','','Signed: gpt-6.1-sol-ultra@Codex | Confidence: correctness 99%, accuracy 99%, completeness 90%')|Set-Content -LiteralPath $message
$retained=@($copy,$receipt,$message)|ForEach-Object {[IO.Path]::GetRelativePath($root,$_)}
& git -C $root add -- $relative @retained
if($LASTEXITCODE){throw 'Notice correction staging failed'}
$expected=@(@($relative)+@($retained)|Sort-Object -Unique)
$staged=@(& git -C $root diff --cached --name-only|Sort-Object -Unique)
if(@(Compare-Object $expected $staged).Count){throw 'Staged paths differ from bounded notice correction'}
& git -C $root diff --cached --check
if($LASTEXITCODE){throw 'Staged notice correction whitespace failure'}
& git -C $root commit --file $message
if($LASTEXITCODE){throw 'Notice correction commit failed'}
& git -C $root rev-parse HEAD
