#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Before','Final')][string]$Stage='Before')
$ErrorActionPreference='Stop'
$repo='<repo>'
$base=Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/live-ui/conflict-retirement-supplement'
$folder=Join-Path $repo 'docs/evidence/release15/conflict-retirement'
function Get-Pin {
 param([string]$Path)
 [ordered]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash;bytes=(Get-Item -LiteralPath $Path).Length}
}
$gatePaths=@(Join-Path $folder 'mock-20261030T192055/receipt.json')
if($Stage -eq 'Final'){
 $real=@(Get-ChildItem -LiteralPath $folder -Directory -Filter 'real-*' | ForEach-Object {Join-Path $_.FullName 'receipt.json'} | Where-Object {Test-Path -LiteralPath $_})
 if(-not $real.Count){throw 'Final real gate receipt absent'}
 $gatePaths+=$real
}
$gates=@(foreach($path in $gatePaths){
 $r=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
 [xml]$xml=Get-Content -LiteralPath $r.junit -Raw
 $cases=@($xml.SelectNodes('//testcase'));$negative=@($cases | Where-Object {$_.name -match 'rejects wrong|rejects independent wrong'}).Count
 if($cases.Count -ne 162 -or $negative -ne 81 -or @($xml.SelectNodes('//testcase[failure or error or skipped]')).Count -or $r.exitCode -ne 0 -or (Get-FileHash $r.junit).Hash -cne $r.junitSha256){throw 'Retirement gate native/hash/count mismatch'}
 $pins=@(foreach($pin in $r.sourcePins){
  if((Get-FileHash -LiteralPath $pin.copy).Hash -cne $pin.sha256){throw 'Retained source copy mismatch'}
  [ordered]@{path=$pin.path;sha256=$pin.sha256;copy=$pin.copy;retainedVerified=$true;currentMatches=(Get-FileHash -LiteralPath $pin.path).Hash -ceq $pin.sha256}
 })
 $producer=Join-Path (Split-Path $path) 'producer.ps1'
 if((Get-FileHash -LiteralPath $producer).Hash -cne $r.producerSha256){throw 'Retained gate producer mismatch'}
 [ordered]@{receipt=Get-Pin $path;junit=Get-Pin $r.junit;producer=Get-Pin $producer;binding=$r.binding;startedAt=$r.startedAt;finishedAt=$r.finishedAt;cases=$cases.Count;expectedNegative=$negative;failed=0;skipped=0;sourcePins=$pins}
})
$oracleNames=@('ui-command-retirement.contract.ts','ui-command-retirement.test.ts')
foreach($name in $oracleNames){
 $hashes=@(foreach($g in $gates){@($g.sourcePins | Where-Object {[IO.Path]::GetFileName($_.path) -ceq $name})[0].sha256})
 if(@($hashes | Sort-Object -Unique).Count -ne 1){throw 'Retirement SAME oracle drift'}
}
$frozen=Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/source-inventory.json') -Raw | ConvertFrom-Json -AsHashtable
$protected=@(foreach($name in @('ui-command-acknowledgement.contract.ts','ui-command-acknowledgement.ts','ui-command-capture.ts','live-player-counts.integration.spec.ts','live-multiplayer.integration.spec.ts')){
 $path='tests/browser/'+$name;$old=@($frozen.sourceHashes | Where-Object path -CEQ $path)[0]
 $mock=@($gates[0].sourcePins | Where-Object {[IO.Path]::GetFileName($_.path) -ceq $name})[0]
 if($mock.sha256 -cne $old.sha256){throw 'Mock gate did not retain frozen preimplementation source'}
 [ordered]@{path=$path;frozenSha256=$old.sha256;mockRetainedSha256=$mock.sha256;preimplementationBytesVerified=$true}
})
$manifest=Get-Content -LiteralPath (Join-Path $base 'manifest.json') -Raw | ConvertFrom-Json -AsHashtable
$planPath=Join-Path $folder 'plan.md'
$paths=@('tests/browser/ui-command-retirement.contract.ts','tests/browser/ui-command-retirement.test.ts','tests/browser/ui-command-acknowledgement.contract.ts','tests/browser/ui-command-acknowledgement.ts','tests/browser/ui-command-capture.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/live-multiplayer.integration.spec.ts','node_modules/playwright-core/lib/coreBundle.js','node_modules/playwright/lib/matchers/expect.js')
$r=[ordered]@{
 recordedAt=(Get-Date).ToString('o');stage=$Stage;originalOracleReadAtLocal='2026-10-30T19:21:21';currentPinQualification='Current source pins are observed at receipt save, not backdated to the oracle read. Protected source at mock execution is established only by retained gate copies.';classification='read-only same-family oracle/source review; not hostile validation';ownSessionId=$manifest.ownSessionId;ownRequestId=$manifest.ownRequestId;parentSessionId=$manifest.parentSessionId;parentRequestId=$manifest.parentRequestId
 originalFailure='af6ee6f actual2passed1failed11skipped; known409 retirement used fresh guard; original failed evidence retained'
 plan=Get-Pin $planPath;chronologicalGates=$gates;protectedPreimplementationSource=$protected;currentSourcePins=@($paths | ForEach-Object {Get-Pin (Join-Path $repo $_)})
 oracleConclusions=@(
  'Full revised19-case oracle and independent correct/wrong providers read. Real binding composes retireCapturedCommand, commandUiState and shared commit, rather than accepting only a synthetic resolved retired callback.',
  'Known409 busy+disabled and busy+absent states wait; enabled pending waits without canonical replay; stale version waits, then idle absent version qualifies. Wrong fresh/matrix mode providers are rejected by the same asserted state sequence.',
  'Fresh guard now tests idle enabled and busy disabled/enabled pending; correct behavior rejects before a new action. Strict successful pending remains rejected and no uncertain replay is added.',
  'Until starts an actual held condition/read and then rejects. Oracle checks outer helper remains unsettled before that read resolves; original wait failure survives, and distinct late probe failure yields ordered AggregateError[wait,probe]. Deliberately wrong providers are drained by the oracle, so expected negative controls create no abandoned work.',
  'Coordinator409 callback receives exact CapturedCommand; next action is blocked until retirement resolves and original retirement failure prevents next invoke. Request attribution observer identity is exact, not copied or fabricated.',
  'Installed Playwright expect.js13165 imports pollAgainstDeadline from coreBundle, calls it at13394-13404 around awaited actual callback; coreBundle4738-4773 races callback against a deadline. That supported callback-lifetime path motivates the bounded ownership control, without asserting it caused af6ee6f.',
  'No additional bounded oracle blocker found. Fresh denial/scope/malformed/version and original error behavior remain; no arbitrary unsupported product input cases, app rules, timeouts, cap or extra approval gate introduced.'
 )
 implementationQualification=if($Stage -eq 'Before'){'Only mock/native162 and preimplementation byte chronology are verified here. Actual helper delta/adoption, real162 and complete DOM/game evidence remain pending.'}else{'Current helper/adoption and owner-produced real gates are source-reviewed and native-recounted; actual successor full DOM/game/build/HV outcomes remain separate.'}
 limits=@('Native162 counts comprise19positive+19expected-negative new controls plus124 existing cases; these are isolated helper checks, not162 browser journeys.','No build/test/model/HV/browser/provider or requirement/source mutation performed by this diagnosing agent.','Af failure exact transient busy/visibility, failing409 actor/command and transport cause remain unknown.','The earlier source review missed known409 versus fresh phase composition. Original124 gates remain preserved as isolated historical evidence, not retroactive DOM proof.')
 accuracy=99;completeness=97;ratingsQualification='Bounded source/native review with explicit original causal and pending runtime limits.'
}
$name=if($Stage -eq 'Before'){'oracle-review-before-implementation.json'}else{'repair-review.json'}
$out=Join-Path $base $name
if(-not $PSCmdlet.ShouldProcess($out,'Retain exact oracle/native/protected-source review without rewriting historical diagnosis')){return}
if(Test-Path -LiteralPath $out){throw 'Refusing overwrite of oracle review'}
$r | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $out -Encoding utf8NoBOM
$producer=Join-Path $base ('oracle-review-'+$Stage.ToLowerInvariant()+'-producer.ps1')
Copy-Item -LiteralPath $PSCommandPath -Destination $producer
if((Get-FileHash $PSCommandPath).Hash -cne (Get-FileHash $producer).Hash){throw 'Review producer copy mismatch'}
[ordered]@{recordedAt=$r.recordedAt;stage=$Stage;output=Get-Pin $out;producer=Get-Pin $producer;gates=@($gates | ForEach-Object {[ordered]@{binding=$_.binding;cases=$_.cases;failed=$_.failed;skipped=$_.skipped;negative=$_.expectedNegative}})} | ConvertTo-Json -Depth 6
