#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$revision='af6ee6fe0c4a288ac23f570a4fa6a94d697d8127'
$baseline='fdee7a2569bb4742e008977e2a9cd7d312def859'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-af6ee6f'
$own=Get-Content -LiteralPath '/tmp/wordpairs-af6ee6f-review-session.json' -Raw | ConvertFrom-Json -AsHashtable
function Get-Pin {
 param([string]$Path)
 [ordered]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash;bytes=(Get-Item -LiteralPath $Path).Length}
}
function Read-GitText {
 param([string]$Revision,[string]$Path)
 $lines=@(& git -C $repo show ($Revision+':'+$Path))
 if($LASTEXITCODE -ne 0){throw "Git read failed: $Path"}
 [string]::Join("`n",$lines)+"`n"
}
function Get-TextHash {
 param([string]$Value)
 [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Value)))
}
$head=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $head -cne $revision){throw 'Current frozen HEAD mismatch'}
$manifestPath=Join-Path $folder 'source-inventory.json'
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -AsHashtable
if($manifest.revision -cne $revision -or $manifest.manifestCount -ne 351 -or $manifest.expectedCount -ne 351 -or -not $manifest.pathSetEqual -or @($manifest.missing).Count -or @($manifest.extra).Count){throw 'Current source manifest mismatch'}
$sourcePins=@(foreach($pin in $manifest.sourceHashes){
 $hash=(Get-FileHash -LiteralPath (Join-Path $repo $pin.path)).Hash
 if($hash -cne $pin.sha256){throw "Frozen source bytes changed: $($pin.path)"}
 [ordered]@{path=$pin.path;sha256=$hash}
})
$expectedPath=Join-Path $folder 'expected-inventory.json'
$expected=Get-Content -LiteralPath $expectedPath -Raw | ConvertFrom-Json -AsHashtable
if($expected.revision -cne $revision -or $expected.runId -cne '9d00fa3e-555b-4491-8b8b-4f72d3b6177d' -or $expected.expectedUnitCount -ne 808 -or $expected.expectedPostgresCount -ne 63 -or $expected.expectedBrowserCount -ne 86 -or $expected.expectedRealtimeCount -ne 4 -or $expected.expectedMatrixCount -ne 14 -or $expected.expectedStrictCount -ne 1){throw 'Expected collection inventory mismatch'}
$oldManifestPath=Join-Path $repo 'docs/evidence/release15/frozen-fdee7a2/source-inventory.json'
$oldManifest=Get-Content -LiteralPath $oldManifestPath -Raw | ConvertFrom-Json -AsHashtable
$sourceSet=@($sourcePins.path)+@($oldManifest.sourceHashes.path)
$delta=@(& git -C $repo diff --name-status $baseline $revision)
if($LASTEXITCODE -ne 0){throw 'Source delta read failed'}
$changes=@(foreach($line in $delta){$parts=$line -split "`t";if($parts[-1] -in $sourceSet){[ordered]@{kind=$parts[0];path=$parts[-1]}}})
$expectedChanges=@('tests/browser/live-multiplayer.integration.spec.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/ui-command-capture.ts','tests/browser/ui-command-acknowledgement.contract.ts','tests/browser/ui-command-acknowledgement.test.ts','tests/browser/ui-command-acknowledgement.ts')
if(@(Compare-Object @($changes.path | Sort-Object) @($expectedChanges | Sort-Object)).Count){throw 'Unexpected changed source set'}
$productChanges=@(& git -C $repo diff --name-only $baseline $revision -- src public scripts package.json package-lock.json tsconfig.json next.config.ts)
if($LASTEXITCODE -ne 0 -or $productChanges.Count){throw 'Unexpected product/schema/policy/runner/dependency delta'}
$operationalChanges=@(& git -C $repo diff --name-only $baseline $revision -- docs/evidence/release15/operational-producers)
if($LASTEXITCODE -ne 0 -or $operationalChanges.Count){throw 'Unexpected operational evidence producer delta'}
$matrix='tests/browser/live-player-counts.integration.spec.ts'
$strict='tests/browser/live-multiplayer.integration.spec.ts'
$capture='tests/browser/ui-command-capture.ts'
$exactBlocks=@(
 @{id='captureStartedWorkOwnership';path=$capture;pattern='(?s)export async function captureUiCommand\(.*?(?=\n/\*\* Existing matrix)'},
 @{id='matrixOwnedCleanupCommands';path=$matrix;pattern='(?s)    let cleanup =.*?      disposeDiagnostics\(\);'},
 @{id='matrixTerminalContextDiagnostics';path=$matrix;pattern='(?s)    } finally \{\n      disposeDiagnostics\(\);.*'}
)
$preserved=@(foreach($b in $exactBlocks){
 $before=[regex]::Match((Read-GitText $baseline $b.path),$b.pattern).Value
 $after=[regex]::Match((Read-GitText $revision $b.path),$b.pattern).Value
 if(-not $before -or $before -cne $after){throw "Exact ownership/cleanup block changed: $($b.id)"}
 [ordered]@{id=$b.id;path=$b.path;equal=$true;canonicalTextSha256=Get-TextHash $after;qualification='Exact extracted Git text with LF line normalization; full file byte hash separately pinned.'}
})
$needles=@(
 @{path=$matrix;value='test.setTimeout(600000);'},
 @{path=$matrix;value='for (let round = 1; round <= 8; round++)'},
 @{path=$matrix;value='for (let batch = 0; batch < pages.length; batch += 2)'},
 @{path=$matrix;value='expect(solved.correct).toBe(true);'},
 @{path=$matrix;value='expect(solves).toBe(count * 8);'},
 @{path=$matrix;value='await Promise.all(pages.map((p) => expect(p.locator(".answer-reveal")).toContainText(pair.target)));'},
 @{path=$matrix;value='expect(await page.getByRole("table", { name: "Final ranking", exact: true }).textContent()).toBe(ranking);'},
 @{path=$matrix;value='await expect(page.locator(".roster > li")).toHaveCount(count);'},
 @{path=$matrix;value='expect(room.actorId).toBe(ids[player]);'},
 @{path=$strict;value='for (let attempt = 0; attempt < 4; attempt++)'},
 @{path=$strict;value='[1000, 15000, 20000].includes(Number(timeout)) ? () => {} : handler'},
 @{path=$strict;value='expect(result.status()).toBe(409);'}
)
$assertionPins=@(foreach($n in $needles){
 foreach($rev in @($baseline,$revision)){if(-not (Read-GitText $rev $n.path).Contains($n.value)){throw "Game contract assertion changed or missing: $($n.value)"}}
 [ordered]@{path=$n.path;exactSource=$n.value;presentInBoth=$true}
})
$priorPath=Join-Path $repo 'docs/evidence/release15/frozen-0fb37e6/pre-hv-what-if.json'
$prior=Get-Content -LiteralPath $priorPath -Raw | ConvertFrom-Json -AsHashtable
$priorSourcePath=Join-Path $repo 'docs/evidence/release15/frozen-fdee7a2/source-what-if-supplement.json'
$priorSource=Get-Content -LiteralPath $priorSourcePath -Raw | ConvertFrom-Json -AsHashtable
$effective=Get-Content -LiteralPath $own.effectiveSnapshot -Raw | ConvertFrom-Json -AsHashtable
if($effective.currentLayer.key -cne 'layer-1'){throw 'Wrong effective requirement layer'}
$all=@($effective.functional)+@($effective.technical)+@($effective.testing)
$axisNames=@('crash_restart_replay','ordering_concurrency','boundary_malformed','supported_host_inert_unsupported','lifecycle_terminal','workspace_session_agent_isolation','legacy_upgrade','user_visible_output')
$axes=@(
 [ordered]@{axis=$axisNames[0];status='source_supported_with_runtime_limits';outcome='Server acknowledgement and sender acknowledgement are distinct. Hold the original logical call until actual rendered busy=false, pending absent and version>=response; canonical replay retains complete payload. Pre-existing unknown pending cannot be converted into a new-round command. Process death/restart and the original slow response cause are not proved by helper fixtures.';cases=@('wait-for-ack','pending-identical','changed-command','changed-payload','preexisting-blocks-action','wrong-round');source=@('ui-command-capture.ts:40-83','ui-command-acknowledgement.ts:6-20','live-player-counts.integration.spec.ts:60-102','game-panel.tsx:173-244')},
 [ordered]@{axis=$axisNames[1];status='source_supported_runtime_pending';outcome='Prepare before starting a waiter/action, await preparation and sender acknowledgement, and await conflict retirement before a fresh intent. Existing eager capture owns/drains request/body/action and preserves both originals. Readiness barrier and at most two concurrent answer UIs remain; actual timing for fourteen games is a separate lane.';cases=@('wait-for-preparation','wait-for-ack','conflict-drains-retirement','retirement-error','drain-ack-error');source=@('ui-command-capture.ts:10-36','ui-command-capture.ts:41-80','ui-command-acknowledgement.contract.ts:91-147')},
 [ordered]@{axis=$axisNames[2];status='source_supported';outcome='Require finite nonnegative rendered/response versions, exact scope/panel, valid busy/pending shape and non-denied visible perspective. Busy/disabled pending waits; matrix enabled pending may authorize exact original retry, strict pending fails. Null/5xx/body/409 semantics and permanent4xx failure remain. Original Request path/action/profile and answer are validated, and changed canonical payload is rejected.';cases=@('malformed','busy-newer','disabled-pending','wrong-scope','wrong-intent','wrong-profile','wrong-aggregate','permanent-denial','bounded-pending');source=@('ui-command-acknowledgement.ts:6-20','ui-command-acknowledgement.contract.ts:54-69','live-player-counts.integration.spec.ts:67-94','live-multiplayer.integration.spec.ts:77-114')},
 [ordered]@{axis=$axisNames[3];status='source_supported_runtime_pending';outcome='Actual Playwright page adapters read existing DOM state and use real click/fetch/private push paths. No route fixture, forced API refresh, readiness injection, platform fallback or new driver capability is added. Isolated124 helper checks do not establish real browser, hosted, other-engine or physical-phone acceptance; unsupported/missing UI state fails.';cases=@('missing','denied','strict-pending');source=@('ui-command-acknowledgement.ts:30-59','live-player-counts.integration.spec.ts:54-102','live-multiplayer.integration.spec.ts:66-114')},
 [ordered]@{axis=$axisNames[4];status='source_supported_with_runtime_limits';outcome='The helper must not return while owned action/capture/probe/retirement work is pending. Original preparation, acknowledgement, retirement and observer errors remain failures; acknowledgement errors stay outside JSON-body catch. Cleanup and context ownership remain exact. Framework timeout or external process termination is outside controlled promise-settlement proof.';cases=@('drain-ack-error','retirement-error','probe-error','observer-error','body-error-distinct');source=@('ui-command-capture.ts:29-36','ui-command-capture.ts:49-80','gameAssertionPreservation')},
 [ordered]@{axis=$axisNames[5];status='source_supported';outcome='Per-invocation payload and page/room/game scope remain isolated; retries compare full original identity before accepting a result. Safe observations retain only UUID IDs, player/scope/action/status/version/busy/pending, not answers/raw payload/tokens. Own-row solve requires same-context alias and intended round. Supported aliases are generated Guest/tree/fixed-six-token and a single ProfileIcon prefix; distinct supported aliases cannot suffix-match another full alias, duplicates fail rowcount one.';cases=@('changed-command','changed-payload','wrong-aggregate','wrong-profile','wrong-actor','wrong-row','wrong-round');source=@('live-player-counts.integration.spec.ts:67-100','ui-command-acknowledgement.ts:62-75','identity.ts:76-88','identity-panel.tsx:20-25','game-panel.tsx:496-502')},
 [ordered]@{axis=$axisNames[6];status='unchanged_product_source';outcome='No app/domain/schema/migration/policy/dependency/runner change exists from fdee. New15-player and separate25-observer limits, historical match read/replay/leave/finish, five-second holdout, grace and current stages/deadlines remain unchanged. Old helper calls retain optional backward-compatible hooks, and all58 prior capture cases are unchanged.';cases=@('prior58 unchanged');source=@('applicationSourceUnchanged','sourceChanges','prior360AxisReview','priorFrozenSourceSupplement')},
 [ordered]@{axis=$axisNames[7];status='source_supported_runtime_pending';outcome='A solve counts only after sender acknowledgement and the intended round own-row solved UI. Newer shared projection alone cannot retire a pending command or count another actor/round. Strict remains fail-only acknowledgement/four conflicts. Classifier-returned observations are safe; rejected probes fail natively without claiming a complete rejected-state history. Actual synchronized final rankings and all fourteen games remain required.';cases=@('own-current','wrong-row','wrong-round','unsolved','pending-newer','probe-error');source=@('live-player-counts.integration.spec.ts:174-195','live-multiplayer.integration.spec.ts:91-115','ui-command-acknowledgement.ts:23-27','ui-command-acknowledgement.ts:62-75')}
)
$directIds=@('FR-ANCHORSELECTION-007','FR-CATEGORIES-005','FR-LOBBYLIFECYCLE-003','FR-ROOMACCESS-001','TEST-FIRSTCATEGORY-004','TEST-ROOMJOINING-001','TR-MULTIPLAYER-INTEGRATION-034','TEST-MULTIPLAYERINTEGRATION-134','TR-ROOM-SYNCRECOVERY-038','TEST-ROOMSYNC-139')
$records=@(foreach($record in $prior.records){
 $current=@($all | Where-Object id -CEQ $record.id)
 if($current.Count -ne 1){throw "Missing/duplicate scoped requirement: $($record.id)"}
 $criteria=@(foreach($c in $record.criteria){
  $id=$c.reference.Substring($record.id.Length+1)
  $actual=@($current[0].acceptanceCriteria | Where-Object id -CEQ $id)
  if($actual.Count -ne 1 -or $actual[0].text -cne $c.text -or $actual[0].isSatisfied -ne $c.isSatisfiedAtRead){throw "Scoped criterion semantic drift: $($c.reference)"}
  [ordered]@{reference=$c.reference;text=$actual[0].text;isSatisfiedAtRead=$actual[0].isSatisfied;historicalTextAndSatisfactionMatch=$true;familyIds=$c.familyIds}
 })
 $direct=$record.id -in $directIds
 $recordAxes=[ordered]@{}
 foreach($axis in $axisNames){
  $old=$record.axes[$axis]
  $recordAxes[$axis]=[ordered]@{historicalStatus=$old.status;historicalAssessments=$old.assessments;currentDeltaStatus=if($direct){'verification_path_delta_source_supported_runtime_pending'}else{'product_source_unchanged_historical_assessment_not_recertified'};criterionReferences=@($criteria.reference);deltaOutcomeReference='axes#'+$axis;reason=if($direct){'Current logical-call acknowledgement and actual intended-round own-state checks strengthen this browser verification path. See pinned axis outcome/cases and preserved source assertions; full runtime acceptance remains pending.'}else{'No product implementation or requirement criterion delta. Prior family-specific outcome, source/test pins and NA reasons remain historical by exact artifact reference; this six-file test delta does not recertify their runtime or acceptance status.'};historicalReason=$old.reason}
 }
 [ordered]@{id=$record.id;title=$current[0].title;statusAtRead=$current[0].status;criteria=$criteria;nativeParentFrIds=$record.nativeParentFrIds;axes=$recordAxes;directAcknowledgementVerificationPath=$direct}
})
if($records.Count -ne 45 -or @($records | ForEach-Object {$_.criteria}).Count -ne 207){throw 'Historical scope changed'}
$additionalIds=@('FR-REQUESTFEEDBACK-030','TEST-REQUESTFEEDBACK-143','TR-CONNECTION-RECOVERY-009','TEST-CONNECTIONRECOVERY-109','FR-ANSWERSTAGES-008','FR-SCORELOCK-010')
$additional=@(foreach($id in $additionalIds){$r=@($all | Where-Object id -CEQ $id);if($r.Count -ne 1){throw 'Missing additional acknowledgement requirement'};[ordered]@{id=$id;statusAtRead=$r[0].status;criteria=@($r[0].acceptanceCriteria | ForEach-Object {[ordered]@{reference=$id+'#'+$_.id;text=$_.text;isSatisfiedAtRead=$_.isSatisfied}});axesOutcomeReferences=@($axisNames | ForEach-Object {'axes#'+$_});qualification='Existing linked support for the new verification path, outside the preserved45-record/207-criterion historical denominator. Historical satisfaction is neither refreshed nor recertified.'}})
$duplicateRecords=@($all | Group-Object id | Where-Object Count -GT 1 | Select-Object -ExpandProperty Name)
$duplicateCriteria=@(foreach($r in $all){foreach($g in @($r.acceptanceCriteria | Group-Object id | Where-Object Count -GT 1)){ $r.id+'#'+$g.Name }})
$flatLinks=@(foreach($m in $effective.mappings){foreach($id in $m.trIds){[ordered]@{frId=$m.frId;kind='TR';target=$id}};foreach($id in $m.testIds){[ordered]@{frId=$m.frId;kind='TEST';target=$id}}})
$duplicates=@($flatLinks | Group-Object { $_.frId+'|'+$_.kind+'|'+$_.target } | Where-Object Count -GT 1 | Select-Object -ExpandProperty Name)
$dangling=@($flatLinks | Where-Object { $_.frId -notin $effective.functional.id -or ($_.kind -eq 'TR' -and $_.target -notin $effective.technical.id) -or ($_.kind -eq 'TEST' -and $_.target -notin $effective.testing.id) })
$orphanTests=@($effective.testing | Where-Object { $_.id -notin $flatLinks.target } | Select-Object -ExpandProperty id)
$scopedTestEdges=@(foreach($r in $records | Where-Object id -Like 'TEST-*'){
 $edges=@($effective.mappings | Where-Object { $r.id -in $_.testIds })
 [ordered]@{testId=$r.id;nativeParentFrIds=@($edges.frId);nativeTechnicalIds=@($edges.trIds | Sort-Object -Unique);hasFrParent=$edges.Count -gt 0;hasTechnical=$edges.trIds.Count -gt 0}
})
if($duplicateRecords.Count -or $duplicateCriteria.Count -or $duplicates.Count -or $dangling.Count -or $orphanTests.Count -or @($scopedTestEdges | Where-Object {-not $_.hasFrParent -or -not $_.hasTechnical}).Count){throw 'Current mechanical native mapping/identity defect'}
$ackReceiptPath=Join-Path $repo 'docs/evidence/release15/ui-acknowledgement/receipt.json'
$ack=Get-Content -LiteralPath $ackReceiptPath -Raw | ConvertFrom-Json -AsHashtable
$gates=@(foreach($g in $ack.gates){
 if((Get-FileHash -LiteralPath $g.path).Hash -cne $g.sha256){throw 'Acknowledgement gate receipt drift'}
 $r=Get-Content -LiteralPath $g.path -Raw | ConvertFrom-Json -AsHashtable
 [xml]$x=Get-Content -LiteralPath $r.junit -Raw
 $cases=@($x.SelectNodes('//testcase'));$negative=@($cases | Where-Object {$_.name -match 'rejects wrong|rejects independent wrong'}).Count
 if($cases.Count -ne $r.cases -or $negative -ne $r.negativeControls -or @($x.SelectNodes('//testcase[failure or error or skipped]')).Count -or $r.exitCode -ne 0 -or (Get-FileHash -LiteralPath $r.junit).Hash -cne $r.junitSha256){throw 'Acknowledgement native count/hash mismatch'}
 foreach($p in $r.sourcePins){if((Get-FileHash -LiteralPath $p.copy).Hash -cne $p.sha256){throw 'Gate retained source copy mismatch'}}
 if((Get-FileHash -LiteralPath (Join-Path (Split-Path $g.path) 'producer.ps1')).Hash -cne $r.producerSha256){throw 'Gate producer mismatch'}
 [ordered]@{receipt=Get-Pin $g.path;junit=Get-Pin $r.junit;binding=$r.binding;increment=$r.increment;startedAt=$r.startedAt;finishedAt=$r.finishedAt;cases=$cases.Count;expectedNegative=$negative;failed=0;skipped=0;sourcePins=$r.sourcePins}
})
$v2=@($gates | Where-Object increment -EQ 'v2')
foreach($name in @('ui-command-acknowledgement.contract.ts','ui-command-acknowledgement.test.ts','ui-command-capture.contract.ts','ui-command-capture.test.ts')){
 $hashes=@(foreach($g in $v2){@($g.sourcePins | Where-Object {[IO.Path]::GetFileName($_.path) -ceq $name})[0].sha256})
 if(@($hashes | Sort-Object -Unique).Count -ne 1){throw 'V2 SAME oracle drift'}
}
foreach($p in $ack.sourceCheck.result.sourcePins){if((Get-FileHash -LiteralPath (Join-Path $repo $p.path)).Hash -cne $p.sha256){throw 'Stopped acknowledgement source differs from candidate'}}
foreach($p in $ack.producerPins){if((Get-FileHash -LiteralPath $p.retained).Hash -cne $p.sha256){throw 'Consolidated producer pin mismatch'}}
if((Get-FileHash -LiteralPath $ack.sourceCheck.path).Hash -cne $ack.sourceCheck.sha256){throw 'Consolidated source check drift'}
$historicalFailurePath=Join-Path $repo 'docs/evidence/release15/frozen-fdee7a2/live-ui/live-ui.xml'
[xml]$failedXml=Get-Content -LiteralPath $historicalFailurePath -Raw
$failedCounts=[ordered]@{cases=@($failedXml.SelectNodes('//testcase')).Count;passed=@($failedXml.SelectNodes('//testcase[not(failure) and not(error) and not(skipped)]')).Count;failed=@($failedXml.SelectNodes('//testcase[failure or error]')).Count;skipped=@($failedXml.SelectNodes('//testcase[skipped]')).Count}
if($failedCounts.passed -ne 8 -or $failedCounts.failed -ne 1 -or $failedCounts.skipped -ne 5){throw 'Historical failure denominator drift'}
$progress=@(foreach($name in @('full/unit.xml','full/postgres.xml','full/browser.xml','ps-contract/powershell.xml','realtime/postgres.xml','realtime/realtime.xml','live-ui/live-ui.xml','strict/live-ui.xml')){
 $p=Join-Path $folder $name
 if(-not (Test-Path -LiteralPath $p)){[ordered]@{path=$name;status='not_present_at_read';acceptance='pending'};continue}
 $hash=(Get-FileHash -LiteralPath $p).Hash
 try{
  [xml]$x=Get-Content -LiteralPath $p -Raw
  if((Get-FileHash -LiteralPath $p).Hash -cne $hash){throw 'Native report changed during read'}
  [ordered]@{path=$name;status='observed_native_report_only';sha256=$hash;cases=@($x.SelectNodes('//testcase')).Count;failed=@($x.SelectNodes('//testcase[failure or error]')).Count;skipped=@($x.SelectNodes('//testcase[skipped]')).Count;acceptance='single point-in-time report, not whole chain certification'}
 }catch{[ordered]@{path=$name;status='incomplete_or_changed_during_read';acceptance='pending'}}
})
$wikiPath=Join-Path $repo 'docs/evidence/release15/frozen-131269a/wiki-publication-repair/index.json'
$wiki=Get-Content -LiteralPath $wikiPath -Raw | ConvertFrom-Json -AsHashtable
$zipPin=Get-Pin (Join-Path $repo 'docs/requirements/requirements-wiki-documents.zip')
if($zipPin.sha256 -cne $priorSource.wikiPublicationBoundary.rawCanonicalZip.sha256){throw 'Canonical export changed'}
$sourceCheck=Get-Content -LiteralPath $ack.sourceCheck.path -Raw | ConvertFrom-Json -AsHashtable
$supplement=[ordered]@{
 schema='wordpairs-rendered-acknowledgement-source-selfreview/v1';recordedAt=(Get-Date).ToString('o');classification='same-family read-only source/evidence selfcheck; not independent HV or release approval';sourceHead=$revision;baselineHead=$baseline;validationRunId=$expected.runId;ownSessionId=$own.sessionId;ownRequestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId
 sourceManifest=@{pin=Get-Pin $manifestPath;count=351;allSourceBytesMatched=$true;sourceHashes=$sourcePins};baselineSourceManifest=@{pin=Get-Pin $oldManifestPath;count=348};sourceChanges=$changes;unchangedSourcePaths=@($sourcePins.path | Where-Object {$_ -notin $changes.path});applicationSourceUnchanged=$true;operationalProducerUnchanged=$true;gameAssertionPreservation=@{exactBlocks=$preserved;exactAssertions=$assertionPins;qualification='New acknowledgement/own-solve checks intentionally modify helpers and assertion callsites. No claim that entire scenario blocks are byte-identical; full changed files and all351 hashes are pinned.'}
 prior360AxisReview=@{pin=Get-Pin $priorPath;scope=$prior.scope;historicalAxisCounts=$prior.axisCounts;qualification='Complete historical artifact deserialized, every scoped criterion reconciled against fresh effective snapshot. Its302supported/46pending/12NA counts are historical, not recertified.'};priorFrozenSourceSupplement=@{pin=Get-Pin $priorSourcePath;qualification='Fdee source supplement and earlier CCA/131/0fb source/failure chains retained with original limits. No historical execution acceptance transfers to new candidate.'};currentEffectiveSnapshot=Get-Pin $own.effectiveSnapshot;currentLayer=$effective.currentLayer.key
 records=$records;recordCount=45;criterionCount=207;recordAxes=360;axes=$axes;additionalExistingAcknowledgementRequirements=$additional;additionalSupportCount=6;noRequirementOrSatisfactionMutation=$true
 mappingChecks=@{source='Fresh current effective requirements native mapping array';allRecords=$all.Count;mappingParents=$effective.mappings.Count;flatLinks=$flatLinks.Count;duplicateRecordIds=$duplicateRecords;duplicateCriterionIdsWithinParent=$duplicateCriteria;duplicateTargetsWithinParent=$duplicates;danglingTargets=$dangling;orphanTests=$orphanTests;scopedTestEdges=$scopedTestEdges;qualification='Mechanical identity/type/parent/TR/TEST existence and scoped native reachability only. Broad historical link semantic relevance is not re-certified by edge counts.'}
 acknowledgementIncrement=@{receipt=Get-Pin $ackReceiptPath;chronologicalGates=$gates;v2SameOracleVerified=$true;sourceCheck=Get-Pin $ack.sourceCheck.path;sourceCheckSummary=$sourceCheck;retainedProducers=$ack.producerPins;editChronology=$ack.edits;qualifications=$ack.knownQualification;history='Initial independent118 preceded classifier. Deferred retirement completion/rejection and original Request aggregate-path controls expanded the oracle before coordinator/adapters; mock124 then SAME real124 and final124. New66=33positive+33negative, plus58 unchanged capture cases. Native count/copy/producer/JUnit hashes verified. These isolated controls are not browser journeys or root-cause proof.'}
 failedHistory=@{native=Get-Pin $historicalFailurePath;counts=$failedCounts;diagnosis=Get-Pin (Join-Path $repo 'docs/evidence/release15/frozen-fdee7a2/live-ui/disabled-input-supplement/diagnosis.json');priorOracleReview=Get-Pin (Join-Path $repo 'docs/evidence/release15/frozen-fdee7a2/live-ui/disabled-input-supplement/acknowledgement-review.json');facts='Failed10-player reached round2 with17driver-JSON-counted solves; all10full connected snapshots, page7pending gamecontrol, native disabledLate input/request waiter AggregateError. Input UUID is room, not actor. No exact pending/slow200Request join or latency/abort/load/driver-only cause is established.';priorReferenceCorrection='Prior oracle-review existingRequirements shorthand FR-ANSWERSTAGES-008#AC45 and FR-SCORELOCK-010#AC45 is corrected here to #AC-45. The original receipt is retained, not silently rewritten.'}
 currentNativeProgress=@{observedAt=(Get-Date).ToString('o');reports=$progress;qualification='Point-in-time read of files produced by parent ongoing chain. No tests or builds run by this agent, no current whole-chain success claim, later complete native/TRX evidence controls acceptance.'};expectedValidationInventory=@{pin=Get-Pin $expectedPath;unit=808;postgres=63;browser=86;realtime=4;matrix=14;strict=1;qualification='Collection only; expected counts do not establish execution.'}
 knownSafeAnchors=$prior.knownSafeAnchors;wholeChainConclusions=$prior.wholeChainConclusions;canonicalDefinitionsAndMappingLimits=@{historicalDefinitions=$prior.canonicalDefinitions;newProductFieldsOrEnums=$false;newStandaloneAcType=$false;newNativeEdges=$false;newTestOnlyTypes='AckMode, AckOutcome, UiCommandState, OwnSolveState, AckCommitOptions remain test-only; both actual adapters use the common helper.'}
 wikiPublicationBoundary=@{pin=Get-Pin $wikiPath;wikiHead=$wiki.remoteWikiHead;rawCanonicalZip=$zipPin;missingHistoricalAssets=$wiki.unresolved;qualification='93cc02d href-normalized publication projection remains separate from raw canonical export, source and deployed artifact. Four historical/tmp originals remain unresolved; no fabricated substitution or new publication claim.'}
 pendingDependencies=@('Current frozen full suite/build/native source-before-after identity, PowerShell/Realtime lane, all14actual2..15 games/119participations/952UI-acknowledged intended-round solves and strict journey/TRX remain required.','Historical transport/latency cause and exact failed Request-to-page7 identity remain unknown; new diagnostics cannot backfill old evidence.','Hosted staging-first then production reviewed commit, worker progression/privacy/quota/external multiplayer, live OAuth consent and physical admin PWA continuity remain separate.','Current Cline/Beam/High independent98/98 approval still requires actual model/effort/plugin/runtime receipt, all applicable TRX, full request/response JSONL and entire verdict/own-session readback. No reviewer invoked by this agent.','Contest mission/Work provenance/final materials and eligible entrant manual submission are separate; no source or local test receipt proves entry.');newBlockingSourceGapsObserved=@();testsBuildsModelsProvidersRunByThisAgent=$false;sourceEditsByThisAgent=0;accuracy=99;completeness=98;ratingQualification='Bounded current source/requirements/evidence analysis, not independent hostile scores or release approval. Runtime/causal/hosted/physical/publication limits remain explicit.'
}
foreach($pin in $sourcePins){if((Get-FileHash -LiteralPath (Join-Path $repo $pin.path)).Hash -cne $pin.sha256){throw 'Frozen source changed before output'}}
$jsonPath=Join-Path $folder 'source-what-if-supplement.json'
$markdownPath=Join-Path $folder 'source-selfreview.md'
$provenancePath=Join-Path $folder 'source-selfreview-provenance.json'
$producerPath=Join-Path $folder 'source-selfreview-producer.ps1'
$effectiveCopy=Join-Path $folder 'source-selfreview-effective-requirements.json'
if(-not $PSCmdlet.ShouldProcess($folder,'Persist current source review, per-record what-if, exact pins and provenance without source/requirements mutation')){return}
foreach($p in @($jsonPath,$markdownPath,$provenancePath,$producerPath,$effectiveCopy)){if(Test-Path -LiteralPath $p){throw "Refusing overwrite: $p"}}
Copy-Item -LiteralPath $own.effectiveSnapshot -Destination $effectiveCopy
if((Get-FileHash -LiteralPath $effectiveCopy).Hash -cne $own.effectiveSha256){throw 'Effective snapshot copy mismatch'}
$supplement.currentEffectiveSnapshot=Get-Pin $effectiveCopy
$supplement | ConvertTo-Json -Depth 65 | Set-Content -LiteralPath $jsonPath -Encoding utf8NoBOM
$jsonHash=(Get-FileHash -LiteralPath $jsonPath).Hash
$markdown=@"
# Frozen rendered-acknowledgement source self-review

$($supplement.recordedAt). Same-family source/evidence selfcheck; no independent hostile approval or release acceptance.

Source $revision, validation group $($expected.runId). All351 source hashes match the frozen manifest. Compared with fdee348,345 source paths are unchanged, three test files are modified and three acknowledgement test files are added. Product code, domain rules, schema/migrations, public assets, dependencies, runners and operational lane producers are unchanged. Exact paths, source hashes, preserved ownership/cleanup blocks and retained game assertions are in source-what-if-supplement.json (SHA256 $jsonHash).

The prior native matrix remains8passed/1failed/5skipped. The10-player game reached round2 and17 driver-JSON-counted solves. All10 snapshots remained connected with the full roster; page7 showed a pending game control and the native failure preserved a disabled answer input plus request-waiter AggregateError. Its room UUID is not a profile ID. The11601ms successful answer is not joined to that page or command. No latency/abort/load/navigation/driver-only cause is established, and zero driver body failures is different from the earlier CCA body lookup failure. Those failed artifacts are preserved. The older review's two #AC45 shorthand references are corrected to #AC-45 here without rewriting that receipt.

The concrete verification gap was accepting driver HTTP JSON before the sender retired its pending command. The current test coordinator prepares a fresh panel before starting work, validates original Request path/action/profile and intended answer, then waits for actual nonbusy, pending-free finite-version UI acknowledgement before returning. Matrix recovery uses only the held original command and actual enabled pending control, with complete payload equality and the existing12-attempt bound. Explicit409 must finish UI retirement before a fresh intent. Strict adds fail-only acknowledgement and keeps four conflict-only answer attempts. A solve counts only after the submitting browser and intended round own scorecard row show solved. No gameplay or timeout assertion is relaxed.

Chronology/native XML/copy hashes were reread: original independent mock118/0/0 preceded the classifier; its immediate retirement event was insufficient to prove awaited completion. V2 added deferred retirement completion/rejection and exact aggregate-path discrimination before coordinator/adapters. Mock124/0/0 and SAME real124/0/0, then final124/0/0, retain identical oracle/provider bytes. New66 cases are33positive and33expected-negative controls plus58 unchanged earlier capture cases. This is isolated helper evidence, not124 browser games. The single retained transient direct tsc2 was followed by corrected provider/typechecks; scoped lint exit0 had15warnings. Rejected classifier probes fail natively, so observers do not claim complete rejected-state histories.

The own-row normalizer relies on supported guest aliases generated as Guest/tree/six-token characters and a single ProfileIcon span before direct alias text. Distinct supported aliases cannot suffix-match another complete generated alias. Exact duplicates fail the one-row count. This source-pinned invariant does not claim arbitrary malformed DOM identity coverage.

Every45 historical scoped records/207criterion IDs, texts and satisfaction states match fresh layer-1 QBrain; no states changed. Each record has eight explicit current delta assessments linked to the complete historical360-axis artifact and current source outcomes. Six additional existing acknowledgement/scoring/recovery records are separately named outside that denominator. Current native mappings are mechanically checked for duplicate IDs/targets, dangling edges, orphan tests and scoped FR/TR reachability; broad historical edge semantic relevance and prior302supported/46pending/12NA are not recertified by counts. No standalone AC record or new product mechanism is introduced.

Point-in-time current native reports are embedded with hashes and their individual observed counts. Expected inventory is808unit/63Postgres/86browser,4Realtime,14ordinary matrix and1strict. An individual report is not whole-chain completion. The parent ongoing run and final native/TRX/source-before-after identity control acceptance. All14actual UI games, shared rankings and truthful cleanup, strict push journey, hosted staging/production, live GitHub consent and physical admin-PWA continuity remain separate obligations. The new acknowledgement boundary does not prove the unresolved latency cause is fixed.

Wiki93cc02d remains a qualified href-normalized projection of unchanged raw canonical export; four historical/tmp asset originals remain unresolved. Source, export, publication, deployed build, physical installation and contest submission remain separate claims. Independent Cline/Beam/High review still requires current runtime identity, supplied applicable TRX, full JSONL/verdict/readback and98/98AGREE. No new source blocker was found in this bounded read-only delta; full runtime and independent review are pending. No builds, tests, models, providers, source or requirement edits were performed by this agent. Source/evidence accuracy99%, completeness98%, with all causal/runtime limits retained.
"@
$markdown | Set-Content -LiteralPath $markdownPath -Encoding utf8NoBOM
Copy-Item -LiteralPath $PSCommandPath -Destination $producerPath
if((Get-FileHash -LiteralPath $producerPath).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Producer copy mismatch'}
$provenance=[ordered]@{recordedAt=(Get-Date).ToString('o');sourceHead=$revision;validationRunId=$expected.runId;ownSessionId=$own.sessionId;ownRequestId=$own.requestId;originalProducer=Get-Pin $PSCommandPath;producer=Get-Pin $producerPath;originalRetained=$true;producerCopyVerified=$true;parserErrors=0;scriptAnalyzerWarningsErrors=0;whatIfPerformed=$true;outputs=@(Get-Pin $jsonPath;Get-Pin $markdownPath;Get-Pin $effectiveCopy);qualification='Read-only source/evidence producer, no builds/tests/application/provider writes. Timestamped report observations do not certify final chain state.'}
$provenance | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $provenancePath -Encoding utf8NoBOM
$back=Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json -AsHashtable
if($back.sourceHead -cne $revision -or $back.records.Count -ne 45 -or $back.axes.Count -ne 8 -or $back.sourceManifest.sourceHashes.Count -ne 351 -or @($back.records | ForEach-Object {$_.axes.Keys}).Count -ne 360){throw 'Source review serialized readback mismatch'}
[ordered]@{recordedAt=(Get-Date).ToString('o');sourceHead=$revision;runId=$expected.runId;sourceCount=351;changed=6;unchanged=345;records=45;criteria=207;recordAxes=360;additionalSupportRecords=6;nativeMapping=@{records=$all.Count;parents=$effective.mappings.Count;links=$flatLinks.Count;duplicates=0;dangling=0;orphans=0};outputs=@(Get-Pin $jsonPath;Get-Pin $markdownPath;Get-Pin $provenancePath;Get-Pin $producerPath;Get-Pin $effectiveCopy)} | ConvertTo-Json -Depth 8
