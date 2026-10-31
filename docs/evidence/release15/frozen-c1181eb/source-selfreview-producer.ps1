#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$revision='c1181eb4eb01825c8b12f3521f92286080addfba'
$baseline='af6ee6fe0c4a288ac23f570a4fa6a94d697d8127'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-c1181eb'
$own=Get-Content -LiteralPath '/tmp/wordpairs-c1181eb-review-session.json' -Raw | ConvertFrom-Json -AsHashtable
function Get-Pin { param([string]$Path) [ordered]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash;bytes=(Get-Item -LiteralPath $Path).Length} }
function Read-GitText {
 param([string]$Revision,[string]$Path)
 $lines=@(& git -C $repo show ($Revision+':'+$Path))
 if($LASTEXITCODE -ne 0){throw "Git read failed: $Path"}
 [string]::Join("`n",$lines)+"`n"
}
function Get-TextHash { param([string]$Text) [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Text))) }
function Get-CanonicalValue {
 param($Value)
 if($null -eq $Value){return 'null'}
 if($Value -is [System.Collections.IDictionary]){
  $parts=@(foreach($key in @($Value.Keys | Sort-Object)){($key | ConvertTo-Json -Compress)+':'+(Get-CanonicalValue $Value[$key])})
  return '{'+[string]::Join(',',$parts)+'}'
 }
 if($Value -is [System.Collections.IEnumerable] -and $Value -isnot [string]){return '['+[string]::Join(',',@($Value | ForEach-Object {Get-CanonicalValue $_}))+']'}
 ConvertTo-Json -InputObject $Value -Compress -Depth 100
}
if((& git -C $repo rev-parse HEAD).Trim() -cne $revision){throw 'Frozen HEAD mismatch'}
$manifestPath=Join-Path $folder 'source-inventory.json'
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -AsHashtable
if($manifest.revision -cne $revision -or $manifest.expectedCount -ne 353 -or $manifest.manifestCount -ne 353 -or -not $manifest.pathSetEqual -or @($manifest.missing).Count -or @($manifest.extra).Count){throw 'Frozen manifest identity/set mismatch'}
foreach($pin in $manifest.sourceHashes){if((Get-FileHash -LiteralPath (Join-Path $repo $pin.path)).Hash -cne $pin.sha256){throw "Frozen source changed: $($pin.path)"}}
$expectedPath=Join-Path $folder 'expected-inventory.json'
$expected=Get-Content -LiteralPath $expectedPath -Raw | ConvertFrom-Json -AsHashtable
if($expected.revision -cne $revision -or $expected.runId -cne '169e6d93-632f-423c-8572-be3cccb96a00' -or $expected.expectedUnitCount -ne 846 -or $expected.expectedPostgresCount -ne 63 -or $expected.expectedBrowserCount -ne 86 -or $expected.expectedRealtimeCount -ne 4 -or $expected.expectedMatrixCount -ne 14 -or $expected.expectedStrictCount -ne 1){throw 'Collected inventory mismatch'}
$oldManifestPath=Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/source-inventory.json'
$oldManifest=Get-Content -LiteralPath $oldManifestPath -Raw | ConvertFrom-Json -AsHashtable
if($oldManifest.manifestCount -ne 351 -or $oldManifest.revision -cne $baseline){throw 'Baseline manifest mismatch'}
$sets=@($manifest.sourceHashes.path)+@($oldManifest.sourceHashes.path)
$changes=@(foreach($line in @(& git -C $repo diff --name-status $baseline $revision)){
 $parts=$line -split "`t"; $path=$parts[-1]
 if($path -in $sets){
  $before=@($oldManifest.sourceHashes | Where-Object path -CEQ $path)
  $after=@($manifest.sourceHashes | Where-Object path -CEQ $path)
  [ordered]@{kind=$parts[0];path=$path;beforeSha256=if($before.Count){$before[0].sha256}else{$null};afterSha256=if($after.Count){$after[0].sha256}else{$null}}
 }
})
$expectedChanges=@('tests/browser/live-multiplayer.integration.spec.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/ui-command-acknowledgement.contract.ts','tests/browser/ui-command-acknowledgement.test.ts','tests/browser/ui-command-acknowledgement.ts','tests/browser/ui-command-capture.ts','tests/browser/ui-command-retirement.contract.ts','tests/browser/ui-command-retirement.test.ts')
if(@(Compare-Object @($changes.path | Sort-Object) @($expectedChanges | Sort-Object)).Count){throw 'Unexpected source delta'}
$unchanged=@(foreach($p in $manifest.sourceHashes){$old=@($oldManifest.sourceHashes | Where-Object path -CEQ $p.path);if($old.Count -and $old[0].sha256 -ceq $p.sha256){$p.path}})
if($unchanged.Count -ne 345){throw 'Unchanged source denominator mismatch'}
$productDelta=@(& git -C $repo diff --name-only $baseline $revision -- src public scripts package.json package-lock.json tsconfig.json next.config.ts)
$operationalDelta=@(& git -C $repo diff --name-only $baseline $revision -- docs/evidence/release15/operational-producers)
if($productDelta.Count -or $operationalDelta.Count){throw 'Unexpected product/operational producer delta'}
$matrix='tests/browser/live-player-counts.integration.spec.ts'
$strict='tests/browser/live-multiplayer.integration.spec.ts'
$ack='tests/browser/ui-command-acknowledgement.ts'
$capture='tests/browser/ui-command-capture.ts'
$blocks=@(
 @{id='captureStartedRequestBodyActionOwnership';path=$capture;pattern='(?s)export async function captureUiCommand\(.*?(?=\n/\*\* Existing matrix)'},
 @{id='matrixReadinessAndEightRoundJourneyIncludingCleanup';path=$matrix;pattern='(?s)  try \{\n    for \(let i = 0; i < count; i\+\+\).*'},
 @{id='strictActualNetworkJourneyAndCleanup';path=$strict;pattern='(?s)  try \{\n    for \(let i = 0; i < 3; i\+\+\).*'},
 @{id='actualScopedDomProbe';path=$ack;pattern='(?s)export async function readCommandUi\(.*?(?=\n/\*\*)'},
 @{id='ownRoundSolveDomAdapter';path=$ack;pattern='(?s)export async function assertPageOwnRoundSolve\(.*'}
)
$preserved=@(foreach($block in $blocks){
 $before=[regex]::Match((Read-GitText $baseline $block.path),$block.pattern).Value
 $after=[regex]::Match((Read-GitText $revision $block.path),$block.pattern).Value
 if(-not $before -or $before -cne $after){throw "Preserved block changed: $($block.id)"}
 [ordered]@{id=$block.id;path=$block.path;exactNormalizedGitTextEqual=$true;canonicalTextSha256=Get-TextHash $after;qualification='Git text normalized to LF for comparison; full byte hashes are separately pinned.'}
})
$oldAckContract=Read-GitText $baseline 'tests/browser/ui-command-acknowledgement.contract.ts'
$newAckContract=Read-GitText $revision 'tests/browser/ui-command-acknowledgement.contract.ts'
if([regex]::Match($oldAckContract,'(?s)export const ackCases =.*').Value -cne [regex]::Match($newAckContract,'(?s)export const ackCases =.*').Value){throw 'Old acknowledgement assertions/inputs changed'}
$oldAckProvider=Read-GitText $baseline 'tests/browser/ui-command-acknowledgement.test.ts'
$newAckProvider=Read-GitText $revision 'tests/browser/ui-command-acknowledgement.test.ts'
if($newAckProvider.Replace('options.retired(response)','options.retired()') -cne $oldAckProvider){throw 'Unexpected original acknowledgement provider change'}
$retirementFolder=Join-Path $repo 'docs/evidence/release15/conflict-retirement'
$repairReceiptPath=Join-Path $retirementFolder 'receipt.json'
$repair=Get-Content -LiteralPath $repairReceiptPath -Raw | ConvertFrom-Json -AsHashtable
foreach($p in $repair.evidence){if((Get-FileHash -LiteralPath $p.path).Hash -cne $p.sha256){throw 'Owner receipt evidence drift'}}
foreach($p in $repair.sourcePins){if((Get-FileHash -LiteralPath (Join-Path $repo $p.path)).Hash -cne $p.sha256){throw 'Owner final source differs from candidate'}}
$gates=@(foreach($name in @('mock-20261030T192055','real-20261030T192330')){
 $path=Join-Path $retirementFolder ($name+'/receipt.json')
 $g=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
 [xml]$x=Get-Content -LiteralPath $g.junit -Raw
 $cases=@($x.SelectNodes('//testcase'));$negative=@($cases | Where-Object {$_.name -match 'rejects wrong|rejects independent wrong'}).Count
 if($g.exitCode -ne 0 -or $cases.Count -ne 162 -or $negative -ne 81 -or @($x.SelectNodes('//testcase[failure or error or skipped]')).Count -or (Get-FileHash -LiteralPath $g.junit).Hash -cne $g.junitSha256){throw 'Native isolated gate identity/count mismatch'}
 foreach($p in $g.sourcePins){if((Get-FileHash -LiteralPath $p.copy).Hash -cne $p.sha256){throw 'Isolated source copy mismatch'}}
 $producer=Join-Path (Split-Path $path) 'producer.ps1'
 if((Get-FileHash -LiteralPath $producer).Hash -cne $g.producerSha256){throw 'Isolated producer mismatch'}
 [ordered]@{receipt=Get-Pin $path;junit=Get-Pin $g.junit;producer=Get-Pin $producer;binding=$g.binding;startedAt=$g.startedAt;finishedAt=$g.finishedAt;cases=162;expectedNegative=81;failed=0;skipped=0;sourcePins=$g.sourcePins}
})
$sameOracle=@(foreach($name in @('ui-command-retirement.contract.ts','ui-command-retirement.test.ts')){
 $hashes=@(foreach($g in $gates){@($g.sourcePins | Where-Object {[IO.Path]::GetFileName($_.path) -ceq $name})[0].sha256})
 if(@($hashes | Sort-Object -Unique).Count -ne 1){throw 'Retirement SAME oracle drift'}
 [ordered]@{path='tests/browser/'+$name;mockSha256=$hashes[0];realSha256=$hashes[1];identical=$true}
})
$protected=@(foreach($name in @('ui-command-acknowledgement.contract.ts','ui-command-acknowledgement.ts','ui-command-capture.ts','live-player-counts.integration.spec.ts','live-multiplayer.integration.spec.ts')){
 $path='tests/browser/'+$name
 $old=@($oldManifest.sourceHashes | Where-Object path -CEQ $path)[0]
 $mock=@($gates[0].sourcePins | Where-Object {[IO.Path]::GetFileName($_.path) -ceq $name})[0]
 if($old.sha256 -cne $mock.sha256){throw 'Protected preimplementation source mismatch'}
 [ordered]@{path=$path;baselineSha256=$old.sha256;retainedMockSha256=$mock.sha256;equal=$true}
})
if([datetime]$gates[1].startedAt -le [datetime]$gates[0].finishedAt){throw 'Mock/real chronology mismatch'}
$checkPath=Join-Path $retirementFolder 'source-check.json'
$check=Get-Content -LiteralPath $checkPath -Raw | ConvertFrom-Json -AsHashtable
if($check.typecheckExit -ne 0 -or $check.lintExit -ne 0 -or $check.diffExit -ne 0){throw 'Final source check not successful'}
$failedChecks=@($check.editChecks | Where-Object typecheckExitCode -NE 0)
if($failedChecks.Count -ne 4){throw 'Intermediate compiler failure disclosure count mismatch'}
$failurePins=@(foreach($f in $failedChecks){[ordered]@{timestamp=$f.timestamp;file=$f.file;hookExitCode=$f.hookExitCode;directTypecheckExit=$f.typecheckExitCode;log=Get-Pin $f.log}})
$priorPath=Join-Path $repo 'docs/evidence/release15/frozen-0fb37e6/pre-hv-what-if.json'
$prior=Get-Content -LiteralPath $priorPath -Raw | ConvertFrom-Json -AsHashtable
$afPath=Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/source-what-if-supplement.json'
$effective=Get-Content -LiteralPath $own.effectiveSnapshot -Raw | ConvertFrom-Json -AsHashtable
if($effective.currentLayer.key -cne 'layer-1'){throw 'Wrong active effective layer'}
$all=@($effective.functional)+@($effective.technical)+@($effective.testing)
$oldEffectivePath=Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/source-selfreview-effective-requirements.json'
$oldEffective=Get-Content -LiteralPath $oldEffectivePath -Raw | ConvertFrom-Json -AsHashtable
$oldAll=@($oldEffective.functional)+@($oldEffective.technical)+@($oldEffective.testing)
$axisNames=@('crash_restart_replay','ordering_concurrency','boundary_malformed','supported_host_inert_unsupported','lifecycle_terminal','workspace_session_agent_isolation','legacy_upgrade','user_visible_output')
$directIds=@('FR-ANCHORSELECTION-007','FR-CATEGORIES-005','FR-LOBBYLIFECYCLE-003','FR-ROOMACCESS-001','TEST-FIRSTCATEGORY-004','TEST-ROOMJOINING-001','TR-MULTIPLAYER-INTEGRATION-034','TEST-MULTIPLAYERINTEGRATION-134','TR-ROOM-SYNCRECOVERY-038','TEST-ROOMSYNC-139','TR-TDD-ACCEPTANCE-026','TEST-TDDACCEPTANCE-126')
$records=@(foreach($priorRecord in $prior.records){
 $r=@($all | Where-Object id -CEQ $priorRecord.id);$old=@($oldAll | Where-Object id -CEQ $priorRecord.id)
 if($r.Count -ne 1 -or $old.Count -ne 1){throw 'Missing or duplicate scoped record'}
 foreach($field in @('title','description','status','notes')){if((Get-CanonicalValue $r[0][$field]) -cne (Get-CanonicalValue $old[0][$field])){throw "Scoped semantic field drift: $($r[0].id)/$field"}}
 $criteria=@(foreach($c in $r[0].acceptanceCriteria){
  $was=@($old[0].acceptanceCriteria | Where-Object id -CEQ $c.id)
  if($was.Count -ne 1){throw 'Scoped criterion identity changed'}
  foreach($field in @('text','isSatisfied','evidence')){if((Get-CanonicalValue $c[$field]) -cne (Get-CanonicalValue $was[0][$field])){throw "Scoped criterion semantic drift: $($r[0].id)#$($c.id)/$field"}}
  [ordered]@{reference=$r[0].id+'#'+$c.id;text=$c.text;isSatisfiedAtRead=$c.isSatisfied;evidenceUnchanged=$true}
 })
 if($criteria.Count -ne $old[0].acceptanceCriteria.Count){throw 'Scoped criterion count changed'}
 [ordered]@{id=$r[0].id;statusAtRead=$r[0].status;criteria=$criteria;currentSemanticFieldsEqualToAfRead=$true;directDeltaVerificationPath=$r[0].id -in $directIds;axes=@(foreach($axis in $axisNames){[ordered]@{axis=$axis;historicalRecordReference='records#'+$r[0].id+'/axes/'+$axis;deltaOutcomeReference='axes#'+$axis;assessment=if($r[0].id -in $directIds){'test_composition_delta_reviewed_runtime_pending'}else{'product_source_unchanged_historical_assessment_not_recertified'}}})}
})
if($records.Count -ne 45 -or @($records | ForEach-Object {$_.criteria}).Count -ne 207){throw 'Scoped denominator mismatch'}
$additionalIds=@('FR-REQUESTFEEDBACK-030','TEST-REQUESTFEEDBACK-143','TR-CONNECTION-RECOVERY-009','TEST-CONNECTIONRECOVERY-109','FR-ANSWERSTAGES-008','FR-SCORELOCK-010')
$additional=@(foreach($id in $additionalIds){$r=@($all | Where-Object id -CEQ $id);if($r.Count -ne 1){throw 'Missing existing support requirement'};[ordered]@{id=$id;statusAtRead=$r[0].status;criteria=@($r[0].acceptanceCriteria | ForEach-Object {[ordered]@{reference=$id+'#'+$_.id;text=$_.text;isSatisfiedAtRead=$_.isSatisfied}});qualification='Existing support outside45/207 denominator. Historical satisfaction is not recertified.'}})
$duplicates=@($all | Group-Object id | Where-Object Count -GT 1 | Select-Object -ExpandProperty Name)
$duplicateCriteria=@(foreach($r in $all){foreach($g in @($r.acceptanceCriteria | Group-Object id | Where-Object Count -GT 1)){$r.id+'#'+$g.Name}})
$flat=@(foreach($m in $effective.mappings){foreach($id in $m.trIds){[ordered]@{frId=$m.frId;kind='TR';target=$id}};foreach($id in $m.testIds){[ordered]@{frId=$m.frId;kind='TEST';target=$id}}})
$duplicateEdges=@($flat | Group-Object {$_.frId+'|'+$_.kind+'|'+$_.target} | Where-Object Count -GT 1 | Select-Object -ExpandProperty Name)
$dangling=@($flat | Where-Object {$_.frId -notin $effective.functional.id -or ($_.kind -eq 'TR' -and $_.target -notin $effective.technical.id) -or ($_.kind -eq 'TEST' -and $_.target -notin $effective.testing.id)})
$orphans=@($effective.testing | Where-Object {$_.id -notin $flat.target} | Select-Object -ExpandProperty id)
$scopedEdges=@(foreach($r in $records | Where-Object id -Like 'TEST-*'){
 $parents=@($effective.mappings | Where-Object {$r.id -in $_.testIds})
 [ordered]@{testId=$r.id;nativeParentFrIds=@($parents.frId);nativeTechnicalIds=@($parents.trIds | Sort-Object -Unique);hasFrParent=$parents.Count -gt 0;hasTechnical=$parents.trIds.Count -gt 0}
})
if($duplicates.Count -or $duplicateCriteria.Count -or $duplicateEdges.Count -or $dangling.Count -or $orphans.Count -or @($scopedEdges | Where-Object {-not $_.hasFrParent -or -not $_.hasTechnical}).Count){throw 'Mechanical mapping/identity defect'}
$mapping=[ordered]@{recordCount=$all.Count;mappingParentRecords=@($effective.mappings).Count;flatLinks=$flat.Count;testCount=@($effective.testing).Count;duplicateRecordIds=$duplicates;duplicateCriterionIdsWithinParent=$duplicateCriteria;duplicateTargetsWithinParent=$duplicateEdges;danglingTargets=$dangling;orphanTests=$orphans;scopedTestBacking=$scopedEdges;qualification='Mechanical identity, target type, parent and TR/TEST existence only. Not a fresh semantic certification of1427 broad historical edges.'}
$axes=@(
 [ordered]@{axis=$axisNames[0];status='delta_source_supported_runtime_pending';outcome='An already captured409 is a known command requiring retirement, not unknown fresh intent. Wait without replay until same scoped panel is idle, pending-free and version-qualified; original canonical replay rules and full-payload equality remain unchanged. A process crash or the original slow command cause is not established by scripted fixtures.';cases=@('retire-enabled','retire-blocks-next','retire-error-blocks-next','fresh-guard');pins=@(($ack+':8-22'),($ack+':78-94'),($capture+':40-83'))},
 [ordered]@{axis=$axisNames[1];status='delta_source_supported_runtime_pending';outcome='Both matrix and strict pass the exact captured409 through the shared real classifier/wait seam before another intent. Matrix retains12 attempts, strict retains4 conflicts and its greater-than-before projection assertion. The actual readiness barrier, maximum two concurrent answers and eight-round journey are text-identical to af6.';cases=@('retire-busy-game','retire-busy-room','retire-blocks-next','retire-version');pins=@(($matrix+':62-110'),($strict+':67-118'),($ack+':53-95'))},
 [ordered]@{axis=$axisNames[2];status='delta_source_supported';outcome='Require actual409 before probing, exact expected scope, visible authorized perspective, valid pending/busy fields and safe integer version. Missing/hidden/denied/malformed state and original probe/observer/wait errors fail. Busy or enabled/disabled pending are wait-only in retirement; fresh pending remains prohibited even while busy; strict success does not gain replay.';cases=@('retire-scope','retire-missing','retire-denied','retire-malformed','retire-non409','retire-probe-error','retire-observer-error','fresh-guard','strict-guard');pins=@(($ack+':8-22'),($ack+':78-81'),'tests/browser/ui-command-retirement.contract.ts:30-140')},
 [ordered]@{axis=$axisNames[3];status='delta_source_supported_real_dom_pending';outcome='The unchanged readCommandUi DOM adapter and existing Playwright expect.poll options supply the real wait seam. Isolated162 proves scripted read/until/classifier/coordinator composition and negative discrimination; it does not prove browser extraction, deadline timing, hosting, another engine or physical phones. No driver fallback, API refresh, fixed sleep or assertion-bound increase was added.';cases=@('retire-busy-game','retire-busy-room','retire-wait-error');pins=@(($ack+':32-50'),($ack+':84-95'))},
 [ordered]@{axis=$axisNames[4];status='delta_source_supported_runtime_pending';outcome='waitCommandState drains every probe it actually starts when until rejects. The original wait failure survives; distinct late probe failure is retained in AggregateError. A failed retirement cannot start another command. Existing request/body/action ownership and both real cleanup journeys are exact preserved blocks. Work outside the supplied wait seam or forced process termination is not claimed covered.';cases=@('retire-drains-wait','retire-wait-probe-errors','retire-error-blocks-next');pins=@(($ack+':53-81'),($capture+':6-36'),'gameAssertionPreservation')},
 [ordered]@{axis=$axisNames[5];status='delta_source_supported';outcome='The retirement observer receives the exact captured command/Request, not a copied token. Browser call sites bind the same page/room/game scope and retain exact actor/action/path/answer validation. Safe retained observations allowlist UUID identity/action/status/version/busy/pending and omit answers/raw payloads. This test delta does not change agent/workspace/session boundaries.';cases=@('request-attribution','retire-scope');pins=@(($matrix+':67-108'),($strict+':67-116'),'tests/browser/ui-command-retirement.contract.ts:132-139')},
 [ordered]@{axis=$axisNames[6];status='not_applicable_to_new_product_behavior';outcome='Only eight test files changed. Existing15-player policy, separate25 observers, grandfathered matches, server five-second holdout/grace/deadline behavior, schemas, dependencies and providers are unchanged. Existing124 assertions/inputs survive; mode/callback types and two provider forwards were adapted and are not byte-identical. Historical whole-game upgrade assessment is linked, not rerun.';cases=@('prior124 preservation','protectedPreimplementationSource');pins=@('sourceChanges','prior360AxisReview','originalOraclePreservation')},
 [ordered]@{axis=$axisNames[7];status='delta_source_supported_runtime_pending';outcome='Known409 busy/pending states now wait for actual sender retirement instead of applying the fresh unknown-intent guard. Success still requires sender acknowledgement plus own intended-round solve before counting; strict remains fail-only for uncertain success. Native/classifier errors remain errors. Actual synchronized final rankings, fourteen games119participations952solves and strict push journey require current-source DOM evidence.';cases=@('retire-enabled','retire-busy-game','strict-guard','fresh-guard');pins=@(($matrix+':183-205'),($strict+':94-118'),($ack+':97-111'))}
)
$afNativePath=Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/live-ui/live-ui.xml'
[xml]$afNative=Get-Content -LiteralPath $afNativePath -Raw
$afCounts=[ordered]@{passed=@($afNative.SelectNodes('//testcase[not(failure) and not(error) and not(skipped)]')).Count;failed=@($afNative.SelectNodes('//testcase[failure or error]')).Count;skipped=@($afNative.SelectNodes('//testcase[skipped]')).Count}
if($afCounts.passed -ne 2 -or $afCounts.failed -ne 1 -or $afCounts.skipped -ne 11){throw 'Original af6 native failure count mismatch'}
$native=@(foreach($file in @(Get-ChildItem -LiteralPath $folder -Recurse -File -Filter '*.xml')){
 try{[xml]$x=Get-Content -LiteralPath $file.FullName -Raw;$cases=@($x.SelectNodes('//testcase'));[ordered]@{pin=Get-Pin $file.FullName;caseCount=$cases.Count;failed=@($x.SelectNodes('//testcase[failure or error]')).Count;skipped=@($x.SelectNodes('//testcase[skipped]')).Count;qualification='Point-in-time native file observation only; complete chain/group source binding must be supplied by parent.'}}
 catch{[ordered]@{path=$file.FullName;qualification='Incomplete or concurrently written XML at read; acceptance pending'}}
})
$historicalRepairPath=Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/live-ui/conflict-retirement-supplement/repair-review.json'
$historicalDiagnosisPath=Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f/live-ui/conflict-retirement-supplement/diagnosis.json'
$wikiPath=Join-Path $repo 'docs/evidence/release15/frozen-131269a/wiki-publication-repair/index.json'
$wikiZip=Join-Path $repo 'docs/requirements/requirements-wiki-documents.zip'
$failures=@([ordered]@{id='PROCESS-SEQUENCE';classification='observed historical process deviation in this increment';evidence=Get-Pin (Join-Path $retirementFolder 'result.md');outcome='Four intermediate direct TypeScript exits2 retained. Owner continued helper edits while required callback-transition type errors remained, contrary to stop-on-failure instruction. Final checks0 remove current compile failure but do not erase the sequence deviation. No new operator approval gate is invented.'})
$unknowns=@('Current-source full five-lane chain, actual DOM retirement/polling and all14 games/strict push acceptance are pending complete parent reports.','Exact transient busy/visibility at failed af6 probe and exact failing409 actor/command attribution remain unknown; later snapshots cannot reconstruct them.','The original fdee slow successful response versus frontend timeout causal join remains unproved. The af6 failure is a separate known409/fresh waiting composition defect.','Isolated scripted probes do not establish public-tunnel or hosted/physical-phone capacity, independent HV, deployment or contest submission readiness.','Broad historical native edge semantic relevance is not recertified by current mechanical mapping checks.','Wiki publication remains a qualified href-normalized projection with four missing historical temporary assets; unchanged raw export and prior publication are not current gameplay or submission evidence.')
$r=[ordered]@{
 schema='wordpairs-source-delta-selfreview-v1';recordedAt=(Get-Date).ToString('o');classification='Same-family source-only self-review; not independent hostile validation';sourceHead=$revision;baselineHead=$baseline;validationRunId=$expected.runId
 ownSessionId=$own.sessionId;ownRequestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;profileLoad=[ordered]@{files=1;globalMemories=9;workspaceMemories=0;excluded='PRIVATE-MEMORY-REFERENCE-007'};independentReviewerPreference='Cline CLI / Beam / High until Monday afternoon2November2026 America/Chicago, exact afternoon cutoff hour unspecified; no reviewer invoked by this agent.'
 sourceManifest=Get-Pin $manifestPath;baselineSourceManifest=Get-Pin $oldManifestPath;currentSourcePins=$manifest.sourceHashes;sourceChanges=$changes;unchangedSourcePaths=$unchanged;applicationSourceUnchangedInDelta=$true;operationalProducerUnchangedInDelta=$true;gameAssertionPreservation=$preserved
 prior360AxisReview=[ordered]@{pin=Get-Pin $priorPath;status='HISTORICAL ONLY';records=45;criteria=207;axes=360;qualification='Unmodified game analysis is linked, not re-certified. Original302supported/46pending/12NA belong only to historical0fb source and evidence.'}
 priorFrozenSourceSupplement=[ordered]@{pin=Get-Pin $afPath;status='HISTORICAL ONLY';qualification='Earlier source review missed known409 versus fresh phase composition. Its no-new-blocker statement predates actual af6 failure and is not current acceptance.'}
 currentEffectiveSnapshot=Get-Pin $own.effectiveSnapshot;currentLayer=$effective.currentLayer.key;records=$records;recordCount=45;criterionCount=207;recordAxisReferences=360;axes=$axes;additionalExistingSupport=$additional;mappingChecks=$mapping;semanticComparisonQualification='Current id/title/description/status/notes and criterion id/text/isSatisfied/evidence compared to prior af effective snapshot. Read-only equality, not fresh acceptance; timestamp metadata and broad edge semantic relevance are excluded.'
 retirementIncrement=[ordered]@{ownerReceipt=Get-Pin $repairReceiptPath;plan=Get-Pin (Join-Path $retirementFolder 'plan.md');chronologicalGates=$gates;sameOracle=$sameOracle;protectedPreimplementationSource=$protected;newCases=38;retainedPriorCases=124;totalIsolatedCases=162;expectedNegativeControls=81;historicalReadOnlyRepairReview=Get-Pin $historicalRepairPath;currentCompileChecks=[ordered]@{receipt=Get-Pin $checkPath;typecheckExit=0;lintExit=0;diffExit=0;lintWarnings=15;intermediateFailures=$failurePins;sequenceDeviationRetained=$true};runtimeQualification='Same oracle proved at independent mock gate before shared helper edits, then real helper binding. Actual DOM/full game acceptance is separate.'}
 originalOraclePreservation=[ordered]@{acknowledgementAssertionBodyAndInputsUnchanged=$true;capture58WholeFilesUnchanged=$true;modeTypeExtended='AckMode adds retire';callbackTypeChanged='retired(command: CapturedCommand)';oldProviderChange='Two existing calls forward exact response to retired; inverse-normalized provider equals af6. Files are not claimed byte-identical.'}
 originalFailedRun=[ordered]@{native=Get-Pin $afNativePath;counts=$afCounts;diagnosis=Get-Pin $historicalDiagnosisPath;failure='4player case,round3,11acknowledged own-round solves, known409 enters fresh guard; later full connected snapshots do not show transient throwing state.'}
 currentNativeProgress=[ordered]@{readAt=(Get-Date).ToString('o');files=$native;qualification='Read-only point-in-time native observations. Test collection846/63/86/4/14/1 is not execution; no complete chain/HV claim.'};expectedValidationInventory=$expected
 wholeChainConclusions=@('Treat captured409 retirement and unknown fresh intent as distinct existing lifecycle phases. Shared real wait/classifier composition replaces a test adapter misuse; do not weaken the fresh guard.','Retain exact canonical request ownership and full payload before retry. Retirement only waits, never replays or accepts an enabled pending control as success.','Await every condition probe actually started when the assertion deadline wins; preserve original wait/probe failures and do not generalize that supported framework race into an observed transport cause.','A synchronous or asynchronous setup, probe, denial, observer, capture/body/action or retirement failure remains a failure; cleanup and assertion bounds are unchanged.','The prior self-review missed a composed lifecycle boundary despite isolated tests. Actual same-seam oracle and both adapter branches are inspected now, but only complete new DOM runs can establish the user outcome.')
 wikiPublicationBoundary=[ordered]@{historicalIndex=Get-Pin $wikiPath;rawExport=Get-Pin $wikiZip;wikiCommit='93cc02daa6ef8e777fd8287fce9b2bd264de775e';qualification='Historical qualified publication projection, raw export unchanged by this task; four missing historical temporary assets remain explicit. Publication is separate from actual deployment and submission.'}
 failures=$failures;unknowns=$unknowns;newBlockingSourceGapsObserved=@();noRequirementOrSatisfactionMutation=$true;sourceEditsByThisAgent=$false;testsBuildsModelsProvidersRunByThisAgent=$false
 accuracy=99;completeness=97;ratingQualification='Bounded source/composition/chronology and fresh mechanical traceability review only; unexecuted current DOM/full-chain, unresolved causes and broader historical semantic edges remain explicit.'
}
if(-not $PSCmdlet.ShouldProcess($folder,'Write bounded frozen-source self-review, effective snapshot copy and exact provenance without overwriting history')){return}
$names=@('source-selfreview.md','source-what-if-supplement.json','source-selfreview-producer.ps1','source-selfreview-provenance.json','source-selfreview-effective-requirements.json')
foreach($name in $names){if(Test-Path -LiteralPath (Join-Path $folder $name)){throw "Refusing to overwrite retained evidence: $name"}}
$jsonPath=Join-Path $folder 'source-what-if-supplement.json'
$r | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $jsonPath -Encoding utf8NoBOM
$text=@(
 ($r.recordedAt+' - Source-only self-review for c1181eb, run '+$expected.runId+'. This is not hostile validation or a release acceptance claim.'),
 '',
 'The353 current source pins match the frozen manifest. Against af6ee6f351pins,345 are unchanged, six test files are modified and two retirement oracle/provider files are added. No application, schema, public asset, policy, dependency, game cap, deadline, runner or operational producer delta exists. Both exact gameplay/cleanup journeys, actual DOM extraction, own-round solve extraction and request/body/action ownership are preserved by extracted Git-text comparison; full byte pins are retained.',
 '',
 'The corrected boundary is known409 retirement versus unknown fresh intent. The actual shared retirement helper checks captured409, waits for the same scoped visible authorized panel to become idle/pending-free/version-qualified, and never authorizes replay. Matrix still has12 attempts; strict retains four conflicts and its greater-than-before version assertion. Fresh pending fails even while busy, successful strict pending remains fail-only, complete canonical payload validation and own intended-round solve precede counting. The wait seam drains every probe it starts after a raced wait failure and retains both original wait and distinct late-probe errors. Both actual browser adapters select that seam.',
 '',
 'Chronological isolated evidence: mock19:20:55..56 and real19:23:30..32 each162passed,0failed,0skipped,81expected-negative controls. These are19new positive plus19new negative cases alongside124prior cases. New oracle/provider hashes are identical across both gates; protected retained mock source equals af6 before shared helper edits. This proves the same scripted read/until/classifier/coordinator assertions, not162browser journeys. Original124 assertion bodies and inputs remain; callback/mode types and two old provider forwards changed, so those files are not byte-identical.',
 '',
 'FAIL PROCESS-SEQUENCE: Four intermediate direct TypeScript exits2 are retained. The owner continued edits while callback-transition type errors remained, contrary to the stop-on-failure instruction. Final direct TypeScript0, scoped Biome0 (15warnings) and diff0 remove the current compile failure; they do not erase this sequence deviation. The original logs and owner admission are linked. This review adds no human approval gate.',
 '',
 'The original af6 actual UI result remains2passed/1failed/11skipped at four players,round3,11acknowledged own-round solves. Its stack proves fresh-mode use within captured409 retirement. The precise transient busy/visibility, failing409 actor/command attribution and transport cause are not established. Earlier source review missed this composed phase boundary; its prior no-new-blocker statement is historical, not current acceptance. The older slow successful response versus frontend timeout causal join also remains unproved.',
 '',
 'Fresh QBrain layer1 read:45scoped records/207criteria retain identity, text, satisfaction, evidence and scoped semantic fields against the af6 snapshot. Eight current-delta references per record point to the bounded composition analysis and historical360-axis game review; unmodified game analysis is not re-certified. Six separately named existing support records remain outside45/207. Mechanical whole-store checks cover168records/31FRmappingrecords/1427flatlinks: no duplicate record IDs, within-parent criterion IDs or targets, dangling targets or orphan TESTs; all21scoped TESTs have FR/TR backing. These counts do not establish semantic relevance of every historical edge. No requirement/status/satisfaction was changed.',
 '',
 'Current native files are point-in-time observations in the JSON supplement; the complete five-lane chain, actual DOM polling/retirement, fourteen full games119participations952solves, strict private-push journey and independent Cline/Beam/High98/98 remain separate required evidence. Current operator reviewer preference is Cline CLI, Beam, High until Monday afternoon2November2026 America/Chicago; exact afternoon cutoff hour is unspecified. Collection846unit/63Postgres/86browser/4Realtime/14matrix/1strict is not execution. No tests, build, model/HV, provider or application mutation was performed by this agent.',
 '',
 'Historical wiki93cc02d is a qualified href-normalized export projection with four missing historical temporary assets; raw canonical export remains linked and unchanged by this review. Wiki publication, current gameplay, hosted/physical-phone behavior, actual deployment and contest submission remain separate claims.',
 '',
 ('UNKNOWN list: '+[string]::Join(' ',@($unknowns))),
 '',
 'No additional blocking source gap was observed in this bounded eight-file composition delta. Known process deviation and runtime/causal limits above remain visible. Accuracy99%, completeness97% apply only to this source/native-receipt and traceability review, not release acceptance. OverallVerdict is not an HV verdict.',
 '',
 ('Own '+$own.sessionId+' / '+$own.requestId+'. Parent '+$own.parentSessionId+' / '+$own.parentRequestId+'. Full producer, source, native, requirement and prior-receipt hashes are in source-what-if-supplement.json and source-selfreview-provenance.json.')
)
$mdPath=Join-Path $folder 'source-selfreview.md'
[string]::Join("`n",$text)+"`n" | Set-Content -LiteralPath $mdPath -Encoding utf8NoBOM
$producerPath=Join-Path $folder 'source-selfreview-producer.ps1'
Copy-Item -LiteralPath $PSCommandPath -Destination $producerPath
$effectiveCopy=Join-Path $folder 'source-selfreview-effective-requirements.json'
Copy-Item -LiteralPath $own.effectiveSnapshot -Destination $effectiveCopy
if((Get-FileHash -LiteralPath $PSCommandPath).Hash -cne (Get-FileHash -LiteralPath $producerPath).Hash -or (Get-FileHash -LiteralPath $own.effectiveSnapshot).Hash -cne (Get-FileHash -LiteralPath $effectiveCopy).Hash){throw 'Evidence copy verification failed'}
$provenance=[ordered]@{recordedAt=(Get-Date).ToString('o');sourceHead=$revision;runId=$expected.runId;ownSessionId=$own.sessionId;ownRequestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;producer=Get-Pin $producerPath;producerAnalysis='PowerShell parser and PSScriptAnalyzer Warning/Error zero before WhatIf and real evidence write; no tests/builds executed.';outputs=@(Get-Pin $jsonPath;Get-Pin $mdPath;Get-Pin $effectiveCopy);manifest=Get-Pin $manifestPath;scope='Only new candidate evidence files and own MCP audit logging; original evidence retained, no app/test/provider/requirements mutations.'}
$provenancePath=Join-Path $folder 'source-selfreview-provenance.json'
$provenance | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $provenancePath -Encoding utf8NoBOM
foreach($pin in $manifest.sourceHashes){if((Get-FileHash -LiteralPath (Join-Path $repo $pin.path)).Hash -cne $pin.sha256){throw 'Frozen source changed during receipt write'}}
[ordered]@{recordedAt=$r.recordedAt;head=$revision;runId=$expected.runId;currentPins=353;baselinePins=351;unchanged=345;changed=8;scopedRecords=45;criteria=207;mappingRecords=$all.Count;mappingParents=@($effective.mappings).Count;flatLinks=$flat.Count;currentNative=$native;outputs=@($names | ForEach-Object {Get-Pin (Join-Path $folder $_)})} | ConvertTo-Json -Depth 10
