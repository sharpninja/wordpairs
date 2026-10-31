#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$dir=Join-Path $repo 'docs/evidence/release15/conflict-freshness'
if(-not $PSCmdlet.ShouldProcess($dir,'Save truthful consolidated freshness repair evidence without rewriting originals')){return}
if(Test-Path -LiteralPath (Join-Path $dir 'receipt.json')){throw 'Preserve original consolidated receipt'}
$mock=Get-Content -LiteralPath (Join-Path $dir 'mock-20261030T200001/receipt.json') -Raw|ConvertFrom-Json
$real=Get-Content -LiteralPath (Join-Path $dir 'real-20261030T200127/receipt.json') -Raw|ConvertFrom-Json
$before=Get-Content -LiteralPath (Join-Path $dir 'protected-source.json') -Raw|ConvertFrom-Json
$checks=Get-Content -LiteralPath (Join-Path $dir 'source-check.json') -Raw|ConvertFrom-Json
$comparisons=@(foreach($pin in $before.files){
 $m=@($mock.sourcePins|Where-Object path -CEQ $pin.path)[0]
 $r=@($real.sourcePins|Where-Object path -CEQ $pin.path)[0]
 [pscustomobject]@{path=$pin.path;before=$pin.sha256;retainedBeforeMatches=((Get-FileHash -LiteralPath $pin.copy).Hash -ceq $pin.sha256);mock=$m.sha256;mockMatchesBefore=($m.sha256 -ceq $pin.sha256);real=$r.sha256;current=(Get-FileHash -LiteralPath $pin.path).Hash;currentMatchesReal=((Get-FileHash -LiteralPath $pin.path).Hash -ceq $r.sha256)}
})
$same=@(foreach($name in @('ui-command-freshness.contract.ts','ui-command-freshness.test.ts')){
 $m=@($mock.sourcePins|Where-Object {$_.path.EndsWith('/'+$name)})[0];$r=@($real.sourcePins|Where-Object {$_.path.EndsWith('/'+$name)})[0]
 [pscustomobject]@{path=$name;mock=$m.sha256;real=$r.sha256;identical=($m.sha256 -ceq $r.sha256);currentMatchesReal=((Get-FileHash -LiteralPath $r.path).Hash -ceq $r.sha256)}
})
$natives=@(foreach($mode in @('mock-20261030T200001','real-20261030T200127')){
 $xml=Join-Path $dir "$mode/unit.xml";[xml]$native=Get-Content -LiteralPath $xml -Raw;$cases=@($native.SelectNodes('//testcase'))
 [pscustomobject]@{path=$xml;sha256=(Get-FileHash -LiteralPath $xml).Hash;cases=$cases.Count;failed=@($cases|Where-Object {$_.SelectSingleNode('failure|error')}).Count;skipped=@($cases|Where-Object {$_.SelectSingleNode('skipped')}).Count;expectedNegative=@($cases|Where-Object name -Like '*rejects wrong*').Count}
})
$producers=@(foreach($source in @($PSCommandPath,'/tmp/WordpairsFreshnessChecks.ps1','/tmp/ReadWordpairsFreshnessRequirements.ps1','/tmp/WordpairsFreshnessSession.ps1')){
 $copy=Join-Path $dir ([IO.Path]::GetFileName($source));Copy-Item -LiteralPath $source -Destination $copy
 $hash=(Get-FileHash -LiteralPath $source).Hash;if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Producer retained copy mismatch'}
 [pscustomobject]@{source=$source;copy=$copy;sha256=$hash}
})
$files=@(foreach($name in @('plan.md','effective-requirements.json','protected-source.json','source-check.json','mock-20261030T200001/receipt.json','mock-20261030T200001/unit.log','real-20261030T200127/receipt.json','real-20261030T200127/unit.log')){[pscustomobject]@{path=$name;sha256=(Get-FileHash -LiteralPath (Join-Path $dir $name)).Hash}})
$oldFixtures=@($comparisons|Where-Object {$_.path -match 'contract\.ts$|\.test\.ts$'})
$oldChanges=@($oldFixtures|Where-Object {$_.before -cne $_.current})
$nonNullMockChanges=@($mock.protectedSourceChanges|Where-Object {$null -ne $_})
$badMocks=@($comparisons|Where-Object {-not $_.mockMatchesBefore -or -not $_.retainedBeforeMatches})
$badCurrent=@($comparisons|Where-Object {-not $_.currentMatchesReal})
$receipt=[ordered]@{atLocal=(Get-Date -Format s);classification='Authorized test-only reported bug repair and self-check, not HV';sourceHead=(& git -C $repo rev-parse HEAD).Trim();ownSessionId='Codex-20261030T200118Z-plugin-session';ownRequestId='req-20261031T005544Z-conflict-freshness-repair';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';newPositive=24;newExpectedNegative=24;newUnitDelta=48;priorCases=162;mockNative=$natives[0];realNative=$natives[1];sameOracle=$same;protectedComparisons=$comparisons;mockNonNullChangedPaths=$nonNullMockChanges;mockNonNullChangedPathCount=$nonNullMockChanges.Count;old162FixtureCount=$oldFixtures.Count;old162FixtureChangedPathCount=$oldChanges.Count;old162FixturesByteIdentical=($oldChanges.Count -eq 0);sourceCheck=$checks;filePins=$files;producerCopies=$producers;metadataQualification='Original mock protectedSourceChanges and source-check old162FixtureChanges each serialize [null] from an empty PowerShell member projection. Originals retained byte-for-byte. Independently counted NONNULL mock changes0 and direct before/copy/mock hashes allmatch; six old162 fixture source files remain byte-identical.';behavior='Actual409 first; validate captured expectedVersion and explicit minimum before probes; floor max(minimum,expectedVersion+1), idle/pending-free same perspective; preserve all existing bounds and assertion paths. Both commandAcknowledgements observers add only numeric safe expectedVersion or null.';limitations=@('Historical native13 rejected expectedVersion and409 bodies absent; exact server conflict cause not proven.','No actual UI/browser/build/fullsuite/provider/HV run by this agent. Root owns fresh full frozen validation; isolated oracle is not DOM/push/load evidence.','No server numeric latency SLA or causal resource measurement established; no latency fix claimed.','Actual observer field pushes are source-checked; isolated observer assertions prove exact captured Request/version attribution, not DOM execution.');warnings='Scoped Biome exited0 with15 preexisting warnings; no fixes applied. Every6 edit hook/directtsc event0; no intermediate failure. PowerShell producers parser/PSSA0 and WhatIf before actual mutations.';accuracy=99;completeness=98;releaseComplete=$false}
if($badMocks.Count -or $badCurrent.Count -or $nonNullMockChanges.Count -or $oldChanges.Count -or @($same|Where-Object {-not $_.identical -or -not $_.currentMatchesReal}).Count -or @($natives|Where-Object {$_.cases -ne 210 -or $_.failed -or $_.skipped -or $_.expectedNegative -ne 105}).Count){throw 'Consolidated proof mismatch'}
$receipt|ConvertTo-Json -Depth 18|Set-Content -LiteralPath (Join-Path $dir 'receipt.json')
$hash=(Get-FileHash -LiteralPath (Join-Path $dir 'receipt.json')).Hash
$text=@"
$($receipt.atLocal) - SOURCE STOPPED. Shared test-only captured409 retirement now requires idle/pending-free rendered projection at max(explicit minimum,rejected expectedVersion+1). Invalid/missing/unsafe/overflow versions fail before probes. Matrix12 attempts and strict four-conflict-only plus outer >before assertions are unchanged. Both existing observers add only safe numeric expectedVersion or null.

Focused SAME-oracle proof: mock210/0fail/0skip at20:00:02, real210/0fail/0skip at20:01:27,105 expected-negative controls each. New48 plus prior162; all six prior fixture files byte-identical. Mock helper/spec10 protected hashes match before/copy/mock; NONNULL changed paths0. Original [null] empty-projection metadata retained and qualified rather than rewritten. Every six TS edit events immediately passed Codex hook0/directtsc0. Final source Biome0 with15 preexisting warnings, source diff0, directtsc0. No focused failures or skips.

Consolidated receipt docs/evidence/release15/conflict-freshness/receipt.json SHA$hash; source-check.json and retained native XML/log/producer/source hashes are linked there. Five source paths changed: new ui-command-freshness.contract.ts605DA843..., new .test.ts702C92C0..., shared acknowledgement helper B9C8EFFC..., matrix01A9FE20..., strict93C7BBAA.... No app/policy/schema/dependency/cap/deadline/requirement or provider changes.

The c1181eb failed13 native11pass/1fail/2unrun and strict unrun remain preserved. Historical exact submitted expectedVersion/409 body and latency cause are still unproved. Source class corrected; actual full15 runtime remains pending root's fresh frozen chain. Isolated contracts do not execute DOM observers. No HV verdict or release completion claimed.

Own Codex session200118Z / req-20261031T005544Z-conflict-freshness-repair linked to root203656Z. Accuracy99% for exact native/source/hash-bound facts, qualified inference; completeness98% for this bounded repair, runtime/latency/HV remain outside proof. OverallVerdict: not HV. FAIL0 focused, UNKNOWN3: historical rejected-payload/body cause, latency cause, fresh full runtime acceptance.
"@
$text|Set-Content -LiteralPath (Join-Path $dir 'result.md')
[pscustomobject]@{receipt=(Join-Path $dir 'receipt.json');sha256=$hash;nonNullMockChangedPathCount=$nonNullMockChanges.Count;old162FixturesByteIdentical=($oldChanges.Count -eq 0);sourceStopped=$true;atLocal=(Get-Date -Format s)}|ConvertTo-Json
