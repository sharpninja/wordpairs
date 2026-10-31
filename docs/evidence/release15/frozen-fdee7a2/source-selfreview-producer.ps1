#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$revision='fdee7a2569bb4742e008977e2a9cd7d312def859'
$baseline='cca320b02596d21683cec38ab604d7fe31a5c672'
$runId='0f337bfa-39c7-4650-b35d-6ee8d698be0f'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-fdee7a2'
function Get-Pin {
 param([string]$Path)
 [ordered]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash;bytes=(Get-Item -LiteralPath $Path).Length}
}
function Read-GitText {
 param([string]$Revision,[string]$Path)
 $lines=@(& git -C $repo show ($Revision+':'+$Path))
 if($LASTEXITCODE -ne 0){throw "Git text lookup failed: $Path"}
 [string]::Join("`n",$lines)+"`n"
}
function Get-TextHash {
 param([string]$Text)
 [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Text)))
}
$head=(& git -C $repo rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $head -cne $revision){throw 'Frozen source HEAD mismatch'}
$manifestPath=Join-Path $folder 'source-inventory.json'
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -AsHashtable
if($manifest.revision -cne $revision -or $manifest.manifestCount -ne 348 -or $manifest.expectedCount -ne 348 -or -not $manifest.pathSetEqual -or @($manifest.missing).Count -or @($manifest.extra).Count){throw 'Frozen manifest contract mismatch'}
$sourcePins=@(foreach($pin in $manifest.sourceHashes){
 $actual=(Get-FileHash -LiteralPath (Join-Path $repo $pin.path)).Hash
 if($actual -cne $pin.sha256){throw ('Frozen source changed: '+$pin.path)}
 [ordered]@{path=$pin.path;sha256=$actual}
})
$expectedPath=Join-Path $folder 'expected-inventory.json'
$expected=Get-Content -LiteralPath $expectedPath -Raw | ConvertFrom-Json -AsHashtable
if($expected.revision -cne $revision -or $expected.runId -cne $runId -or $expected.expectedUnitCount -ne 742 -or $expected.expectedPostgresCount -ne 63 -or $expected.expectedBrowserCount -ne 86 -or $expected.expectedRealtimeCount -ne 4 -or $expected.expectedMatrixCount -ne 14 -or $expected.expectedStrictCount -ne 1){throw 'Expected validation inventory mismatch'}
$oldManifestPath=Join-Path $repo 'docs/evidence/release15/frozen-cca320b/source-inventory.json'
$oldManifest=Get-Content -LiteralPath $oldManifestPath -Raw | ConvertFrom-Json -AsHashtable
$sourceSet=@($sourcePins.path)+@($oldManifest.sourceHashes.path)
$rawChanges=@(& git -C $repo diff --name-status $baseline $revision)
if($LASTEXITCODE -ne 0){throw 'Frozen Git source diff failed'}
$changes=@(foreach($line in $rawChanges){$p=$line -split "`t";if($p[-1] -in $sourceSet){[ordered]@{kind=$p[0];path=$p[-1]}}})
$expectedChanges=@('tests/browser/live-multiplayer.integration.spec.ts','tests/browser/live-player-counts.integration.spec.ts','tests/browser/ui-command-capture.contract.ts','tests/browser/ui-command-capture.test.ts','tests/browser/ui-command-capture.ts')
if(@(Compare-Object @($changes.path | Sort-Object) @($expectedChanges | Sort-Object)).Count){throw 'Unexpected canonical source delta'}
$productChanges=@(& git -C $repo diff --name-only $baseline $revision -- src public scripts package.json package-lock.json tsconfig.json next.config.ts)
if($LASTEXITCODE -ne 0 -or $productChanges.Count){throw 'Unexpected product/runner/dependency change'}
$matrix='tests/browser/live-player-counts.integration.spec.ts'
$strict='tests/browser/live-multiplayer.integration.spec.ts'
$blocks=@(
 @{id='matrixReadinessAndIdentity';path=$matrix;pattern='(?s)    // A slow final connection.*?(?=    for \(let round = 1;)'},
 @{id='matrixEightRoundsRevealsRankings';path=$matrix;pattern='(?s)    for \(let round = 1; round <= 8; round\+\+\) \{.*?(?=  } catch \(error\) \{)'},
 @{id='matrixOwnedCleanupCommands';path=$matrix;pattern='(?s)    let cleanup =.*?      disposeDiagnostics\(\);'},
 @{id='matrixTerminalContextDiagnostics';path=$matrix;pattern='(?s)    } finally \{\n      disposeDiagnostics\(\);.*'},
 @{id='strictEntireScenarioAndCleanup';path=$strict;pattern='(?s)  try \{\n    for \(let i = 0; i < 3; i\+\+\).*'}
)
$preserved=@(foreach($b in $blocks){
 $old=[regex]::Match((Read-GitText $baseline $b.path),$b.pattern).Value
 $current=[regex]::Match((Read-GitText $revision $b.path),$b.pattern).Value
 if(-not $old -or $old -cne $current){throw ('Unchanged assertion block mismatch: '+$b.id)}
 [ordered]@{id=$b.id;path=$b.path;equal=$true;canonicalTextSha256=Get-TextHash $current;qualification='Exact extracted native Git text; full bytes separately pinned.'}
})
$priorPath=Join-Path $repo 'docs/evidence/release15/frozen-0fb37e6/pre-hv-what-if.json'
$prior=Get-Content -LiteralPath $priorPath -Raw | ConvertFrom-Json -AsHashtable
$ccaPath=Join-Path $repo 'docs/evidence/release15/frozen-cca320b/source-what-if-supplement.json'
$cca=Get-Content -LiteralPath $ccaPath -Raw | ConvertFrom-Json -AsHashtable
$effectivePath='/tmp/wordpairs-fdee7a2-effective-requirements.json'
$effective=Get-Content -LiteralPath $effectivePath -Raw | ConvertFrom-Json -AsHashtable
$currentRecords=@($effective.functional)+@($effective.technical)+@($effective.testing)
$recordReadback=@(foreach($record in $prior.records){
 $current=@($currentRecords | Where-Object id -CEQ $record.id)
 if($current.Count -ne 1){throw ('Prior scoped record missing or duplicated: '+$record.id)}
 $criterionResults=@(foreach($c in $record.criteria){
  $criterionId=$c.reference.Substring($record.id.Length+1)
  $actual=@($current[0].acceptanceCriteria | Where-Object id -CEQ $criterionId)
  [ordered]@{reference=$c.reference;currentExactlyOnce=$actual.Count -eq 1;textMatchesPrior=$actual.Count -eq 1 -and $actual[0].text -ceq $c.text;satisfactionMatchesPrior=$actual.Count -eq 1 -and $actual[0].isSatisfied -eq $c.isSatisfiedAtRead}
 })
 [ordered]@{id=$record.id;criteria=$criterionResults;axesCompared=@($record.axes.Keys);deltaClassification=if($record.id -in @('TR-MULTIPLAYER-INTEGRATION-034','TEST-MULTIPLAYERINTEGRATION-134','TR-ROOM-SYNCRECOVERY-038','TEST-ROOMSYNC-139','TR-CONNECTION-RECOVERY-009','TEST-CONNECTIONRECOVERY-109')){'verification_path_delta_assessed_below'}else{'no_product_source_delta_historical_review_not_recertified'}}
})
$criterionChecks=@($recordReadback | ForEach-Object { $_.criteria })
if($recordReadback.Count -ne 45 -or $criterionChecks.Count -ne 207 -or @($criterionChecks | Where-Object {-not $_.currentExactlyOnce -or -not $_.textMatchesPrior -or -not $_.satisfactionMatchesPrior}).Count){throw 'Current scoped criterion semantics differ from prior review; inspect before proceeding'}
$gateReadbackPath=Join-Path $repo 'docs/evidence/release15/frozen-cca320b/response-body-repair-source-readback.json'
$gateReadback=Get-Content -LiteralPath $gateReadbackPath -Raw | ConvertFrom-Json -AsHashtable
$gates=@(foreach($g in $gateReadback.gates){
 $r=Get-Content -LiteralPath $g.receiptPin.path -Raw | ConvertFrom-Json -AsHashtable
 [xml]$xml=Get-Content -LiteralPath $r.junit -Raw
 $nodes=@($xml.SelectNodes('//testcase'));$negative=@($nodes | Where-Object {$_.name -like '* > rejects wrong *'}).Count
 if($nodes.Count -ne $g.cases -or $negative -ne $g.expectedNegativeControls -or @($xml.SelectNodes('//testcase[failure or error or skipped]')).Count -or (Get-FileHash -LiteralPath $r.junit).Hash -cne $r.junitSha256){throw 'Retained command-capture JUnit mismatch'}
 foreach($p in $r.sourcePins){if((Get-FileHash -LiteralPath $p.copy).Hash -cne $p.sha256){throw 'Retained oracle/helper copy hash mismatch'}}
 [ordered]@{name=$g.name;binding=$g.binding;receipt=Get-Pin $g.receiptPin.path;junit=Get-Pin $r.junit;startedAt=$r.startedAt;finishedAt=$r.finishedAt;cases=$nodes.Count;positive=$nodes.Count-$negative;expectedNegativeControls=$negative;failed=0;skipped=0;helperAbsent=$r.helperAbsent;unchangedPreDeltaHelperSha256=$r.unchangedPreDeltaHelperSha256;sourcePins=$r.sourcePins;qualification=if($g.name -match 'v2'){'current_focused_oracle_evidence_only'}else{'historical_v1_not_complete_ownership_proof'}}
})
$captureReceiptPath=Join-Path $repo 'docs/evidence/release15/command-capture/receipt.json'
$captureReceipt=Get-Content -LiteralPath $captureReceiptPath -Raw | ConvertFrom-Json -AsHashtable
foreach($p in $captureReceipt.sourcePins){if((Get-FileHash -LiteralPath (Join-Path $repo $p.path)).Hash -cne $p.sha256){throw 'Current frozen helper/adoption differs from inspected receipt'}}
foreach($p in $captureReceipt.localEvidence + $captureReceipt.retainedProducers){if((Get-FileHash -LiteralPath (Join-Path $repo $p.path)).Hash -cne $p.sha256){throw 'Consolidated capture evidence/producer hash mismatch'}}
$nativeFailurePath=Join-Path $repo 'docs/evidence/release15/frozen-cca320b/live-ui/live-ui.xml'
[xml]$failedNative=Get-Content -LiteralPath $nativeFailurePath -Raw
$failedCounts=[ordered]@{total=@($failedNative.SelectNodes('//testcase')).Count;passed=@($failedNative.SelectNodes('//testcase[not(failure) and not(error) and not(skipped)]')).Count;failed=@($failedNative.SelectNodes('//testcase[failure or error]')).Count;skipped=@($failedNative.SelectNodes('//testcase[skipped]')).Count}
$axes=@(
 [ordered]@{axis='crash_restart_replay';status='source_supported_with_runtime_limits';outcome='Each capture invocation owns the exact Request, response and single successful-body read. A body loss remains original failure unless actual same-page enabled pending UI permits canonical replay; subsequent full payload must equal the original. No synthetic response/API retry/new command ID. Process death or backend restart is not established by callback fixtures.';pins=@('ui-command-capture.ts:10-35','ui-command-capture.ts:42-68','game-panel.tsx:173-240');cases=@('cached-body','body-error','body-pending-identical','body-wrong-command','unrelated-invoke-error')},
 [ordered]@{axis='ordering_concurrency';status='source_supported_runtime_pending';outcome='Waiter registration precedes UI action. Response/body work starts while action is pending; all owned capture/action promises settle before return or throw. Combined original response/action and cached body/action failures are preserved in deterministic order. Existing readiness barrier and two-answer batches remain exact. Actual full browser timing remains a separate required lane.';pins=@('ui-command-capture.ts:10-35','live-player-counts.integration.spec.ts:109-158');cases=@('eager-response','eager-body','capture-drains-action','action-drains-body','sync-wait-error','dual-errors','body-action-errors')},
 [ordered]@{axis='boundary_malformed';status='source_supported';outcome='Null response stays actual0/false/null;409 and5xx status are retained without reading error JSON. Successful JSON is cached once or retains the same original error. Inaccessible/absent/disabled pending controls do not authorize recovery. Canonical payload mismatch rejects before success. Unique integer2..15 validation and all solve assertions remain. The adapter is test-specific, not a new arbitrary driver API.';pins=@('ui-command-capture.ts:14-23','ui-command-capture.ts:43-68','live-player-counts.integration.spec.ts:11-18');cases=@('null-response','conflict-no-json','server-no-json','body-no-pending','body-disabled-pending','probe-error-original','body-wrong-command')},
 [ordered]@{axis='supported_host_inert_unsupported';status='source_supported_runtime_pending';outcome='Both actual Playwright adapters use real UI actions and request waiters. Network/private Realtime, owned TLS database and provider bindings are unchanged. Missing actual enabled retry UI fails with original error. Mock58/real-helper58 do not prove a browser transport fix, hosted capacity or another browser/platform; native new-source runs must supply that evidence.';pins=@('live-player-counts.integration.spec.ts:51-75','live-multiplayer.integration.spec.ts:62-84','sourceManifest');cases=@('body-no-pending','body-disabled-pending','probe-error-original')},
 [ordered]@{axis='lifecycle_terminal';status='source_supported_with_runtime_limits';outcome='Synchronous waiter failure starts no UI action; asynchronous waiter/action/body failures drain already-started siblings. Body and action failures both survive, including observer failure preserving original body error. Existing room cleanup commands, context/disposal assertions and strict full scenario remain exact. Framework timeout/process termination cannot be certified by these58 callback checks; original timeout and cleanup obligations are unchanged.';pins=@('ui-command-capture.ts:10-35','ui-command-capture.ts:48-54','gameAssertionPreservation');cases=@('sync-wait-error','sync-action-error','capture-drains-action','action-drains-body','dual-errors','body-action-errors','observer-error-preserves-failure')},
 [ordered]@{axis='workspace_session_agent_isolation';status='source_supported';outcome='Helper state is per invocation and keeps the original Request instance. Matrix waiter is bound to actual page, room and action; a pending retry must match full original payload. Added attribution records page index, allowlisted action/status and UUID-only command/profile IDs; no raw payload/answer/token is added. This audit uses its own cache/session with explicit parent/run/source linkage. No cross-session/browser isolation is inferred from counts.';pins=@('ui-command-capture.ts:11-23','live-player-counts.integration.spec.ts:51-75','ownSessionId');cases=@('request-identity','body-wrong-command','server-pending-identical','null-pending-identical')},
 [ordered]@{axis='legacy_upgrade';status='unchanged_product_source';outcome='No application/domain/schema/migration/assets/dependency/runner changes exist fromcca320b. New15-player cap, separate25-observer limit, grandfathered match leave/finish/replay, five-second holdout and existing grace/expiry policy are unchanged. Prior legacy coverage is retained as history; new-source full integration results remain required, not recertified by test-helper checks.';pins=@('applicationSourceUnchanged','sourceChanges','prior360AxisReview','ccaReadinessSupplement');cases=@()},
 [ordered]@{axis='user_visible_output';status='source_supported_runtime_pending';outcome='A real body failure can leave the frontend pending canonical command. Matrix recovery waits for actual exact Retry pending room/game request visibility and enabled state, then clicks it; otherwise the original body failure remains fatal. Strict receives eager capture only and retains four-conflict-only semantics. Eight rounds, solves/reveals/shared ranking, readiness/identity and cleanup assertions remain exact. New attribution improves future linkage without inventing a cause for the original failure.';pins=@('live-player-counts.integration.spec.ts:57-75','live-multiplayer.integration.spec.ts:62-84','game-panel.tsx:579-585','gameAssertionPreservation');cases=@('body-pending-identical','body-no-pending','body-disabled-pending','observer-error-preserves-failure')}
)
$operationalPath=Join-Path $repo 'docs/evidence/release15/operational-producers/RunWordpairsRelease15Evidence.ps1'
$operationalDelta=@(& git -C $repo diff --name-only $baseline $revision -- 'docs/evidence/release15/operational-producers/RunWordpairsRelease15Evidence.ps1')
if($LASTEXITCODE -ne 0 -or $operationalDelta.Count){throw 'Unexpected operational lane producer delta'}
$wikiPath=Join-Path $repo 'docs/evidence/release15/frozen-131269a/wiki-publication-repair/index.json'
$wiki=Get-Content -LiteralPath $wikiPath -Raw | ConvertFrom-Json -AsHashtable
$zipPath=Join-Path $repo 'docs/requirements/requirements-wiki-documents.zip'
$zipPin=Get-Pin $zipPath
if($zipPin.sha256 -cne $cca.wikiPublicationBoundary.rawCanonicalZipSha256){throw 'Canonical requirement export differs from prior qualified publication boundary'}
$created=(Get-Date).ToString('o')
$supplement=[ordered]@{
 schema='wordpairs-command-capture-source-selfreview/v1';recordedAt=$created;classification='Same-family source selfcheck, not independent HV or release approval';sourceHead=$revision;baselineHead=$baseline;validationRunId=$runId;ownSessionId='Codex-20261030T194703Z-plugin-session';ownRequestId='req-20261030T232221Z-turn-61b3';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release'
 sourceManifest=[ordered]@{pin=Get-Pin $manifestPath;count=$sourcePins.Count;allCurrentSourceBytesMatched=$true;sourceHashes=$sourcePins};baselineSourceManifest=[ordered]@{pin=Get-Pin $oldManifestPath;count=$oldManifest.manifestCount};sourceChanges=$changes;unchangedSourcePaths=@($sourcePins.path | Where-Object {$_ -notin $changes.path});applicationSourceUnchanged=$true;gameAssertionPreservation=$preserved
 prior360AxisReview=[ordered]@{pin=Get-Pin $priorPath;sourceHead=$prior.sourceHead;scope=$prior.scope;historicalAxisCounts=$prior.axisCounts;qualification='Complete592917-byte prior artifact deserialized; every45 scoped record/207 criterion reference reconciled against current effective snapshot. Prior302supported/46pending/12NA are historical, not newly recertified.'};ccaReadinessSupplement=[ordered]@{pin=Get-Pin $ccaPath;sourceHead=$cca.sourceHead;axes=$cca.axes;qualification='Prior readiness source review retained. Current source delta does not change barrier or policy; its runtime limits are still separate.'};currentScopedRequirementReadback=[ordered]@{effectiveSnapshot=Get-Pin $effectivePath;records=$recordReadback;recordCount=$recordReadback.Count;criterionCount=$criterionChecks.Count;allCriterionIdsTextAndSatisfactionMatchPrior=$true;qualification='Compares criterion semantics/status only, not drift-prone createdAt or full-record/native-edge equality. No requirements mutation or satisfaction refresh.'}
 commandCaptureIncrement=[ordered]@{consolidatedReceipt=Get-Pin $captureReceiptPath;sourcePins=$captureReceipt.sourcePins;chronologicalGates=$gates;v2SameOracleVerified=$gateReadback.v2SameOracleVerified;history='V1 mock56 preceded helper; real56 retained. Distinct cached-body/action loss was found contextually; V2 mock58 used unchanged V1 helper12B54038 before final5805DACB correction, identical V2 oracle real58. All0failed0skipped; no full-game proof.';targetedChecks=Get-Pin (Join-Path $repo 'docs/evidence/release15/command-capture/source-check-final.json');knownPluginLimit='Previously triaged project-file detection issue means direct tsc output, not hook project inference, is authoritative. Consolidated retained verification records hook and direct compile exits0.'}
 axes=$axes;affectedCriterionReferences=@('TR-CONNECTION-RECOVERY-009#TR-09-C01','TEST-CONNECTIONRECOVERY-109#VERIFY-TR-09','TR-MULTIPLAYER-INTEGRATION-034#TR-34-C01','TR-MULTIPLAYER-INTEGRATION-034#TR-34-C02','TEST-MULTIPLAYERINTEGRATION-134#TR-34-C01','TR-ROOM-SYNCRECOVERY-038#LIVE-07','TEST-ROOMSYNC-139#LIVE-07');knownSafeAnchors=$prior.knownSafeAnchors;wholeChainConclusions=$prior.wholeChainConclusions
 canonicalDefinitionsAndMappings=[ordered]@{source='Prior complete canonical definitions/mapping checks remain linked by artifact hash; current207criterion semantics readback unchanged.';newProductFieldsOrEnums=$false;newStandaloneAcRecords=$false;newNativeRequirementEdges=$false;qualification='No native mapping mutations. This delta audit does not independently rerun the entire prior full-store mapping graph audit or infer full mapping acceptance from counts.'}
 operationalProducer=[ordered]@{pin=Get-Pin $operationalPath;unchangedFromCca=$true;qualification='Failure UI filename capture remains auxiliary lane/run/mtime/name/copy-hash provenance; no new native execution or acceptance inference.'}
 wikiPublicationBoundary=[ordered]@{pin=Get-Pin $wikiPath;wikiHead=$wiki.remoteWikiHead;sourceHead=$wiki.sourceHead;rawCanonicalZip=$zipPin;rawCanonicalZipUnchanged=$true;missingHistoricalAssets=$wiki.unresolved;qualification='93cc02d href-normalized publication projection remains separate from unchanged raw canonical export and current application/test source. Four historical/tmp assets lack exact originals; no new HTTP/rendering/deployment acceptance inferred.'}
 failedHistory=[ordered]@{ccaNativePin=Get-Pin $nativeFailurePath;ccaCounts=$failedCounts;diagnosis=Get-Pin (Join-Path $repo 'docs/evidence/release15/frozen-cca320b/response-body-failure-diagnosis.json');qualification='Originalcca9-player deferred body lookup failure remains7pass/1fail/6skip after16UI-confirmed solves. All9snapshots were open/connected/fullroster/round2, onependingtext. Exact failing actor, enabled state and navigation/cache/resource cause are unproved. Prior1319/1/4 and0fb6/1/7 remain separate historical lanes.'}
 expectedValidationInventory=[ordered]@{pin=Get-Pin $expectedPath;unit=742;postgres=63;browser=86;realtime=4;matrix=14;strict=1;qualification='Expected inventory only. This source selfcheck does not certify current native full-lane outcomes, TRX conversion, source-before/after execution identity or hosted behavior.'}
 pendingDependencies=$prior.pendingDependencies;currentRuntimeAndProcessLimitations=@('Actual new-source fourteen2..15UI games/119 participations/952 UI-confirmed solves/shared standings and verifiedcleanup remain required separately from focused58 callback checks.','Strict private-push eight-round journey and current native Realtime/full suite evidence remain separate from ordinary matrix polling.','No cause for the original body failure is established by eager capture or successful focused helper fixtures.','No source hash establishes deployed build, provider worker/privacy, GitHub consent, physical admin PWA installation or contest submission.','Cline/Beam/High98/98 independent review requires actual runtime identity, supplied all applicable unit/scoped integration TRX, complete JSONL/verdict/session-readback; no actual reviewer invoked by this agent.','Normal framework/browser timeouts and process-death limits remain; all started task drains are proven through controlled settlements, not arbitrary external process termination.');newSourceGapsObserved=@();noRequirementsOrSatisfactionMutation=$true;testsBuildsModelsProvidersRunByThisAgent=$false;sourceEditsByThisAgent=0;accuracy=99;completeness=98;scoreQualification='Bounded source/evidence selfcheck only, not independent hostile scores or release acceptance. Runtime/causal/publication limits remain explicit.'
}
$jsonPath=Join-Path $folder 'source-what-if-supplement.json'
$markdownPath=Join-Path $folder 'source-selfreview.md'
$provenancePath=Join-Path $folder 'source-selfreview-provenance.json'
$producerCopy=Join-Path $folder 'source-selfreview-producer.ps1'
if(-not $PSCmdlet.ShouldProcess($folder,'Write fresh immutable-source self-review supplement, prose and producer provenance without source changes')){return}
foreach($p in @($jsonPath,$markdownPath,$provenancePath,$producerCopy)){if(Test-Path -LiteralPath $p){throw ('Refusing to overwrite prior artifact: '+$p)}}
$supplement | ConvertTo-Json -Depth 55 | Set-Content -LiteralPath $jsonPath -Encoding utf8NoBOM
$jsonHash=(Get-FileHash -LiteralPath $jsonPath).Hash
$markdown=@"
# Frozen command-capture source self-review

$created. Same-family source selfcheck, not hostile approval or release acceptance.

Source $revision and validation group $runId. All 348 current source hashes match the frozen manifest. Relative to the 345 pins at cca320b, 343 source files are unchanged, two browser specs are modified and three test-only command-capture files are added. Product code, policy, schemas, assets, dependencies, scripts and the operational lane producer are unchanged. Exact changed/unchanged paths and full source hashes appear in source-what-if-supplement.json (SHA256 $jsonHash).

The original cca320b native matrix remains 7 passed, 1 failed and 6 skipped. The 9-player case reached round 2 and 16 UI-confirmed solves before deferred successful-response body lookup failed. Nine snapshots remained open, browser/live connected and with a full roster; one showed the real pending game control text. Its enabled state, attribution to the exact failing Request and navigation/cache/resource cause are unknown. Installed-driver generic navigation advice is not proof of actual navigation. The preserved failure and 36 retained originals/copies remain linked, with their failed outcome unchanged.

The repair follows existing canonical lost-response recovery: capture the exact Request/response/successful body while the initiating UI action remains pending, cache value or original error once, and drain all started tasks before the caller can clean up. A synchronous registration failure starts no UI mutation. Simultaneous lookup/body and action failures retain both original errors. The matrix may recover a successful-status body failure only after its exact same-page pending UI is visibly enabled; it clicks that control and asserts complete payload equality including command ID. Missing/disabled/inaccessible UI preserves the original error. Strict adopts eager capture only and retains its four-conflict loop. No blind successful-status/API replay or fabricated success was introduced.

Chronology is preserved and native XML recounted: V1 mock 56 and real 56 are historical. Contextual review exposed cached body plus action error loss, which the earlier lookup plus action test missed. The expanded V2 mock 58 (29 positive and 29 expected-negative checks) ran with unchanged V1 helper 12B54038 before final 5805DACB; identical oracle bytes then passed real 58. Every gate has 0 failures and 0 skips, and copy/XML hashes match. The consolidated receipt, retained producers, direct compiler outputs and targeted source checks are pinned. These results establish focused discrimination/helper behavior; actual browser transport recovery requires fresh runtime evidence.

Five extracted assertion blocks are exactly unchanged: matrix readiness/identity barrier, eight rounds/reveals/rankings, owned cleanup commands, terminal context/diagnostic checks, and the strict entire scenario/cleanup. The supplement assesses crash/replay, ordering/concurrency, boundary/malformed input, supported/inert unsupported hosts, terminal lifecycle, session/workspace/agent isolation, legacy upgrade and visible output. Existing 15-player and 25-observer limits, historical-match compatibility and five-second holdout/grace policy remain unchanged.

The complete prior 0fb what-if artifact remains the historical 45-record, 207-criterion, 360-axis anchor. Every scoped criterion ID/text/satisfaction was reconciled against the fresh current effective snapshot; no criterion state changed. The cca320b readiness supplement is linked with its limits. Prior supported counts and old mapping results are not recertified; no new requirement mechanism or standalone AC type was introduced. Native mapping completeness remains the separately owned graph evidence.

Wiki 93cc02d remains a qualified href-normalized projection of unchanged raw canonical export; four historical/tmp screenshot originals remain unresolved. That publication, source commit, deployed build, actual provider consent, physical admin PWA and contest entry are separate acceptance claims.

Expected current inventory is 742 unit, 63 Postgres, 86 browser, 4 Realtime, 14 ordinary matrix and 1 strict case. This audit does not certify their current execution; parent must bind exact frozen native/TRX reports and all required runtime outcomes before independent Cline/Beam/High review with 98/98 and full JSONL/verdict/readback. No builds, tests, models, provider writes, source edits or requirement mutations were performed by this agent. No additional blocking source gap was found in the bounded delta. Accuracy 99 and completeness 98 apply only to this source/evidence selfcheck, with all stated unknowns preserved.
"@
$markdown | Set-Content -LiteralPath $markdownPath -Encoding utf8NoBOM
Copy-Item -LiteralPath $PSCommandPath -Destination $producerCopy
if((Get-FileHash -LiteralPath $producerCopy).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Producer copy mismatch'}
$provenance=[ordered]@{recordedAt=(Get-Date).ToString('o');sourceHead=$revision;runId=$runId;producer=Get-Pin $producerCopy;originalProducer=Get-Pin $PSCommandPath;originalRetained=$true;producerCopyVerified=$true;parserErrors=0;scriptAnalyzerWarningErrorCount=0;whatIfPerformed=$true;outputs=@(Get-Pin $jsonPath;Get-Pin $markdownPath);qualification='Producer pin recorded after this one authorized invocation; no pre-invocation pin or execution acceptance is implied. Source manifests rechecked before output.'}
$provenance | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $provenancePath -Encoding utf8NoBOM
$check=Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json -AsHashtable
if($check.sourceHead -cne $revision -or $check.axes.Count -ne 8 -or $check.sourceManifest.sourceHashes.Count -ne 348){throw 'Supplement serialized readback mismatch'}
[ordered]@{recordedAt=(Get-Date).ToString('o');sourceHead=$revision;runId=$runId;sourceCount=348;changed=5;unchanged=343;axes=8;records=45;criteria=207;outputs=@(Get-Pin $jsonPath;Get-Pin $markdownPath;Get-Pin $provenancePath;Get-Pin $producerCopy)} | ConvertTo-Json -Depth 8
