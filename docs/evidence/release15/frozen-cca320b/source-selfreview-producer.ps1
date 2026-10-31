#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
 [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$SourceRevision,
 [Parameter(Mandatory)][string]$RunId,
 [Parameter(Mandatory)][string]$ManifestPath,
 [Parameter(Mandatory)][string[]]$OperationalProducerPath
)
$ErrorActionPreference='Stop'
$repo='<repo>'
$baseline='131269a590046a3c1c83314d11ff79f2b731799c'
$folder=Join-Path $repo ('docs/evidence/release15/frozen-'+$SourceRevision.Substring(0,7))
$jsonPath=Join-Path $folder 'source-what-if-supplement.json'
$markdownPath=Join-Path $folder 'source-selfreview.md'
if(-not $PSCmdlet.ShouldProcess($folder,'Save immutable-source readiness delta self-review and eight-axis supplement without certifying pending execution')){return}
if((Test-Path $jsonPath) -or (Test-Path $markdownPath)){throw 'Preserve prior review; do not overwrite'}
Set-Location $repo
$head=(& git rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0 -or $head -cne $SourceRevision){throw 'Source revision is not current immutable HEAD'}
$manifest=Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -AsHashtable
if($manifest.revision -cne $SourceRevision -or -not $manifest.pathSetEqual -or $manifest.expectedCount -ne $manifest.manifestCount -or @($manifest.missing).Count -or @($manifest.extra).Count){throw 'Current source manifest identity/path set is invalid'}
$oldManifestPath=Join-Path $repo 'docs/evidence/release15/frozen-131269a/source-inventory.json'
$oldManifest=Get-Content -LiteralPath $oldManifestPath -Raw | ConvertFrom-Json -AsHashtable
$sourcePins=@(foreach($pin in $manifest.sourceHashes){
 $actual=(Get-FileHash -LiteralPath (Join-Path $repo $pin.path)).Hash
 if($actual -cne $pin.sha256){throw ('Source bytes changed: '+$pin.path)}
 [ordered]@{path=$pin.path;sha256=$actual}
})
if($sourcePins.Count -ne $manifest.manifestCount){throw 'Source manifest denominator mismatch'}
$sourcePaths=@($sourcePins.path)+@($oldManifest.sourceHashes.path)
$allChanges=@(& git diff --name-status $baseline $SourceRevision)
if($LASTEXITCODE -ne 0){throw 'Source delta could not be read'}
$changes=@(foreach($line in $allChanges){$parts=$line -split "`t";[ordered]@{kind=$parts[0];path=$parts[-1];inSourceInventory=$parts[-1] -in $sourcePaths}})
$sourceChanges=@($changes | Where-Object inSourceInventory -EQ $true)
$expected=@('tests/browser/live-player-counts.integration.spec.ts','tests/browser/readiness-barrier.ts','tests/browser/readiness-barrier.contract.ts','tests/browser/readiness-barrier.test.ts')
if(@(Compare-Object @($sourceChanges.path | Sort-Object) @($expected | Sort-Object)).Count){throw 'Unexpected source delta; inspect before writing review'}
$productChanges=@(& git diff --name-only $baseline $SourceRevision -- src public scripts package.json package-lock.json tsconfig.json next.config.ts)
if($LASTEXITCODE -ne 0 -or $productChanges.Count){throw 'Unexpected product/config/runner change'}
function Read-GitText([string]$Revision,[string]$Path){
 $lines=@(& git show ($Revision+':'+$Path))
 if($LASTEXITCODE -ne 0){throw ('Git source read failed: '+$Path)}
 return [string]::Join("`n",$lines)+"`n"
}
function Get-TextHash([string]$Value){return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Value)))}
$spec='tests/browser/live-player-counts.integration.spec.ts'
$old=Read-GitText $baseline $spec;$current=Read-GitText $SourceRevision $spec
$patterns=[ordered]@{
 canonicalRetry='(?s)  async function commitUi\(.*?\n  }\n'
 eightRoundsAndFinalRanking='(?s)    for \(let round = 1; round <= 8; round\+\+\) \{.*?\n  } catch \(error\) \{'
 ownedCleanup='(?s)  } finally \{\n    let cleanup.*?      disposeDiagnostics\(\);'
 finalContextClosureAndAssertions='(?s)    } finally \{\n      disposeDiagnostics\(\);.*?\n    }\n  }\n'
}
$preserved=@(foreach($key in $patterns.Keys){
 $before=[regex]::Match($old,$patterns[$key]).Value;$after=[regex]::Match($current,$patterns[$key]).Value
 if(-not $before -or $before -cne $after){throw ('Previously required assertion block changed: '+$key)}
 [ordered]@{block=$key;canonicalTextSha256=(Get-TextHash $after);equal=$true;qualification='Exact extracted source text after native Git line decoding; full file byte hashes are separately pinned.'}
})
$receipts=@('mock-20261030T172924','real-20261030T173027','mock-v2-20261030T173441','real-v2-20261030T173542')
$gates=@(foreach($gate in $receipts){
 $path=Join-Path $repo ('docs/evidence/release15/readiness-barrier/'+$gate+'/receipt.json')
 $r=Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
 [xml]$xml=Get-Content -LiteralPath $r.junit -Raw
 $cases=@($xml.SelectNodes('//testcase'));$failed=@($xml.SelectNodes('//testcase[failure or error]'));$skipped=@($xml.SelectNodes('//testcase[skipped]'))
 $negative=@($cases | Where-Object {$_.name -match 'rejects independent wrong'}).Count
 $expectedCases=if($gate -match 'v2'){22}else{18}
 if($r.exitCode -ne 0 -or $cases.Count -ne $expectedCases -or $failed.Count -or $skipped.Count -or $negative -ne $expectedCases/2 -or (Get-FileHash $r.junit).Hash -cne $r.junitSha256){throw ('Native gate recount mismatch: '+$gate)}
 $pins=@(foreach($pin in $r.sourcePins){$hash=(Get-FileHash -LiteralPath $pin.retainedCopy).Hash;if($hash -cne $pin.sha256){throw 'Retained gate source hash mismatch'};[ordered]@{path=$pin.path;sha256=$hash;retainedCopy=$pin.retainedCopy}})
 [ordered]@{id=$gate;receiptPath=$path;receiptSha256=(Get-FileHash $path).Hash;startedAt=$r.startedAt;finishedAt=$r.finishedAt;binding=$r.binding;cases=$cases.Count;positive=$cases.Count-$negative;expectedNegativeRejections=$negative;failures=0;skipped=0;helperAbsent=$r.helperAbsent;preDeltaHelperSha256=$r.unchangedPreDeltaHelperSha256;sourcePins=$pins;junitPath=$r.junit;junitSha256=$r.junitSha256;status=if($gate -match 'v2'){'current_focused_callback_evidence'}else{'historical_pre_ownership_delta'};qualification=$r.qualification}
})
$v2mock=@($gates | Where-Object id -Like 'mock-v2*')[0];$v2real=@($gates | Where-Object id -Like 'real-v2*')[0]
foreach($p in @('tests/browser/readiness-barrier.contract.ts','tests/browser/readiness-barrier.test.ts')){
 $mockPin=@($v2mock.sourcePins | Where-Object {$_.path.EndsWith($p)})[0];$realPin=@($v2real.sourcePins | Where-Object {$_.path.EndsWith($p)})[0]
 if($mockPin.sha256 -cne $realPin.sha256){throw 'The same oracle was not bound to mock and real helper'}
}
$followup=Join-Path $repo 'docs/evidence/release15/readiness-barrier/ownership-followup-plan.md'
$checkPath=Join-Path $repo 'docs/evidence/release15/readiness-barrier/source-check-final.json'
$checks=Get-Content -LiteralPath $checkPath -Raw | ConvertFrom-Json -AsHashtable
if($checks.scopedLintExit -ne 0 -or $checks.diffCheckExit -ne 0 -or $checks.unitDelta -ne 22){throw 'Final targeted source checks not established'}
$operational=@(foreach($path in $OperationalProducerPath){
 $relative=[IO.Path]::GetRelativePath($repo,$path)
 $diff=@(& git diff $baseline $SourceRevision -- $relative)
 if($LASTEXITCODE -ne 0){throw 'Operational producer diff could not be read'}
 [ordered]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;committedDelta=$diff;qualification='Separate operational evidence-capture producer, outside the canonical application/test source inventory; no new build or runtime execution claimed by this audit.'}
})
$wikiPath=Join-Path $repo 'docs/evidence/release15/frozen-131269a/wiki-publication-repair/index.json'
$wiki=Get-Content -LiteralPath $wikiPath -Raw | ConvertFrom-Json -AsHashtable
$wikiReceipt=Get-Content -LiteralPath (Join-Path (Split-Path $wikiPath) 'receipt.json') -Raw | ConvertFrom-Json -AsHashtable
$zip=Join-Path $repo 'docs/requirements/requirements-wiki-documents.zip'
$zipHash=(Get-FileHash -LiteralPath $zip).Hash
if($zipHash -cne $wikiReceipt.serverZipSha256){throw 'Raw canonical export changed since qualified wiki projection'}
$previousPath=Join-Path $repo 'docs/evidence/release15/frozen-0fb37e6/pre-hv-what-if.json'
$previous=Get-Content -LiteralPath $previousPath -Raw | ConvertFrom-Json -AsHashtable
$axes=@(
 [ordered]@{axis='crash_restart_replay';assessment='source_supported_with_runtime_limit';finding='Coordinator has invocation-local state and no persistent side effect; every started preparation is captured/drained before failure, and no ready follows a preparation rejection. Real process interruption/restart remains the existing owned harness responsibility, not proven by22callback cases.';evidence=@('tests/browser/readiness-barrier.ts:7','failed-preparation-drains-sibling','synchronous-preparation-failure','ownedCleanup')},
 [ordered]@{axis='ordering_concurrency';assessment='source_supported_runtime_pending';finding='All preparation callbacks begin with stable input indices, all settle before sequential actual UIready, and ready rejection stops later commands. Delayed first/last actors and15identity oracle cases reject eager interleaving, omissions and swaps. Browser timing/5second holdout acceptance still requires current14game evidence.';evidence=@('tests/browser/readiness-barrier.contract.ts','tests/browser/live-player-counts.integration.spec.ts:119','delayed-first-connection','delayed-last-connection','fifteen-player-identity')},
 [ordered]@{axis='boundary_malformed';assessment='source_supported';finding='Caller retains unique integer2..15range validation; preparation rejects missing/disconnected/shortroster/disabled controls. Synchronous exceptions are captured while remaining callbacks start. Empty/sparse/arbitrary consumer arrays are outside the matrixcaller contract; no new general-purpose validation claim.';evidence=@('tests/browser/live-player-counts.integration.spec.ts:10','missing-page','disconnected-page','short-roster','disabled-ready','synchronous-preparation-failure')},
 [ordered]@{axis='supported_host_unsupported_inert';assessment='source_supported_runtime_pending';finding='Only test-side coordination changes. Application/browser adapters, TLS transport, local worker and provider integrations retain exact source. Missing browser connection fails preparation rather than injecting APIready or enabling unsupported auth; actual successor host/browser/transport reports remain separate.';evidence=@('tests/browser/live-player-counts.integration.spec.ts:120','src/domain/lobby.ts','sourceManifest','gameAssertionPreservation')},
 [ordered]@{axis='lifecycle_terminal';assessment='source_supported_with_runtime_limit';finding='Mixed failed/deferred and synchronous-throw controls prove no abandoned preparation before callerfinally. Existing canonical ready retry, verified owned membership cleanup, diagnostic disposal and context closure remain identical. Framework-level abrupt timeout/process death and retained recovery identities are not certified by the focused helper.';evidence=@('tests/browser/readiness-barrier.ts:9','failed-preparation-drains-sibling','synchronous-preparation-failure','finalContextClosureAndAssertions')},
 [ordered]@{axis='cross_workspace_session_agent_isolation';assessment='source_supported';finding='No shared cache or cross-run coordinator state. Context/page/profile index identities remain stable; actual same-context roomresponse actor equals expected guest before readiness, and recorded observations carry explicit player index. No cookies/credentials/arbitrary request payloads were added to the readiness diagnostics.';evidence=@('fifteen-player-identity','tests/browser/live-player-counts.integration.spec.ts:127','tests/browser/live-player-counts.integration.spec.ts:134')},
 [ordered]@{axis='legacy_upgrade';assessment='unchanged_source';finding='No application policy/schema/migration or legacy data change. Five-second holdout,45second detection plus120second grace, empty expiry,15newplayercap and25observer limit retain prior source. Historical larger matches stay governed by their existing compatibility tests, not newly recertified by this test-only delta.';evidence=@('src/domain/lobby.ts','src/domain/rooms.ts','applicationSourceUnchanged')},
 [ordered]@{axis='user_visible_output';assessment='source_supported_runtime_pending';finding='Every browser must visibly show connected status, full player-only roster and enabled Markready before anyready; actual ready uses the original UI/canonical retries. Extra authorized setup reads attribute actor/roster; they do not substitute for gameplay. Eight-round solve/reveal/ranking assertions are unchanged. Current rendered results and four historical missing wikiassets remain explicitly separate pending/limited evidence.';evidence=@('tests/browser/live-player-counts.integration.spec.ts:120','eightRoundsAndFinalRanking','wikiPublicationBoundary')}
)
$supplement=[ordered]@{schema='wordpairs-readiness-delta-selfreview/v1';timestamp=(Get-Date -Format s);classification='read-only contextual self-review, not independent HV';sourceHead=$SourceRevision;baselineHead=$baseline;validationRunId=$RunId;ownSessionId='Codex-20261030T194703Z-plugin-session';ownRequestId='req-20261030T223024Z-turn-f833';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';sourceManifest=[ordered]@{path=$ManifestPath;sha256=(Get-FileHash $ManifestPath).Hash;expectedCount=$manifest.expectedCount;manifestCount=$manifest.manifestCount;allCurrentBytesMatched=$true;sourceHashes=$sourcePins};baselineSourceManifest=[ordered]@{path=$oldManifestPath;sha256=(Get-FileHash $oldManifestPath).Hash;count=$oldManifest.manifestCount};sourceChanges=$sourceChanges;unchangedSourcePaths=@($sourcePins.path | Where-Object {$_ -notin $sourceChanges.path});allCommittedChanges=$changes;applicationSourceUnchanged=$true;gameAssertionPreservation=$preserved;focusedChronology=$gates;ownershipFollowupPlan=[ordered]@{path=$followup;sha256=(Get-FileHash $followup).Hash};finalTargetedChecks=[ordered]@{path=$checkPath;sha256=(Get-FileHash $checkPath).Hash;content=$checks};operationalProducers=$operational;axes=$axes;affectedCriterionReferences=@('TR-MULTIPLAYER-INTEGRATION-034#TR-34-C01','TEST-MULTIPLAYERINTEGRATION-134#TR-34-C01','TR-ROOM-SYNCRECOVERY-038#LIVE-07','TEST-ROOMSYNC-139#LIVE-07','FR-LOBBYLIFECYCLE-003#AC-32');prior360AxisReview=[ordered]@{path=$previousPath;sha256=(Get-FileHash $previousPath).Hash;sourceHead=$previous.sourceHead;scope=$previous.scope;axisCounts=$previous.axisCounts;qualification='Historical source/mapping self-review only. This supplement assesses the precise successor delta and does not recertify360axes, runtime gates or old satisfaction.'};wikiPublicationBoundary=[ordered]@{receiptPath=$wikiPath;receiptSha256=(Get-FileHash $wikiPath).Hash;wikiHead=$wiki.remoteWikiHead;sourceHead=$wiki.sourceHead;changedPages=$wiki.changedPages;hrefChanges=$wiki.transformedOccurrences;verifiedExportFiles=$wiki.verifiedExportFiles;originalFilesPreserved=$wiki.originalWikiFilesPreserved;rawCanonicalZipPath=$zip;rawCanonicalZipSha256=$zipHash;rawCanonicalZipUnchanged=$true;missingHistoricalAssets=$wiki.unresolved;semanticProof=$wiki.semanticProof;qualification='Href-normalized published projection is distinct from raw canonical export and current application revision/execution. Four unmatched historical/tmp screenshot originals remain unavailable. Current source publication and external HTTP/GitHub rendering are not inferred from local target checks.'};runtimeQualification='Prior frozen131matrix9pass1fail4skip is retained failed evidence. Onlylastactor loss at56seconds fits the5second holdout; no actual165second expiry or allactor socket-loss claim. No new successor full/native/Realtime14game/strict/hosted/physical/HVresult is certified here; parent must bind complete current reports.';sourceLifecycleLimitations=@('InitialnavigationPromise.all lifecycle is unchanged from131; this delta specifically drains the new preparation ownership before callercleanup.','Sequential canonical ready commits can still fail real policy deadlines under excessive actual latency; no timeout or five-second holdout was relaxed.','The focused22callback tests are not selector/browser/SQL/WebSocket/hosted evidence.','No source hash identifies a deployed build or constitutes Cline/Beam/High98/98review.');noRequirementsOrSatisfactionMutation=$true;testsBuildsModelsProvidersRunByThisAgent=$false;accuracy=99;completeness=99;scoreQualification='Bounded source/evidence self-review only; not independent HVscores or release acceptance.'}
[void](New-Item -ItemType Directory -Path $folder -Force)
$supplement['operationalCaptureAssessment']=[ordered]@{sourcePin='docs/evidence/release15/operational-producers/RunWordpairsRelease15Evidence.ps1:58';observedDelta='Only the existing live-scale auxiliary filename matcher adds optional -failure-ui before .json. It remains gated to live-ui lane, local room-sync directory, names2..15 and LastWriteTime >= invocation start. Native reports, command arguments, timeouts, assertions and source manifest checks are unchanged.';retention='Copies retain originals, verify source/destination SHA256, and record lane/run/revision/time/name/hash. Browser artifacts retain their existing mtime/provenance copy rules.';limits='Mtime/name capture is auxiliary artifact selection in the controlled serial run, not independent execution identity or success proof. Native JUnit and full provenance remain authoritative; partial/failing lanes stay failed. No additional concurrency-isolation or executed failure-capture claim is made by this source inspection.'}
$supplement | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $jsonPath -Encoding utf8
$jsonHash=(Get-FileHash $jsonPath).Hash
$markdown=@"
# Readiness barrier source self-review

$(Get-Date -Format s). Read-only contextual self-review, not independent HV or release acceptance.

Source $SourceRevision, native validation group $RunId. The exact current source inventory has $($sourcePins.Count) entries; all working bytes match its pinned SHA256 values. Against 131269a, only the matrix specification and three new test-only barrier files changed in the source inventory. Application, policy, schema, assets, runners and configuration are unchanged. Full hashes and exact changed/unchanged paths are in source-what-if-supplement.json (SHA256 $jsonHash).

The old 131 matrix remains 9 pass/1 fail/4 skip. Corrected evidence shows only the eleventh unready actor lost membership while ten entered the game; the 56-second case fits the existing five-second holdout. The new coordinator waits for every connected/full-roster/enabled preparation before the original sequential UI ready callbacks. It captures synchronous throws and drains every preparation settlement before rethrowing an original error, preventing caller cleanup from racing a deferred sibling. Actor/context indices remain stable and same-context room responses are checked against expected guest identities. No API ready, policy extension, cap reduction or swallowed failure was introduced.

Chronology is retained: the original independent mock 18 cases preceded the V1 helper; the original real 18 cases are historical after the ownership finding. Expanded V2 mock 22 cases ran with the unchanged V1 helper pinned; then helper V2 bound the identical contract/test bytes and passed 22 cases. Each current gate has 11 positive cases/11 expected negative rejections, 0 fail/skip by direct native XML recount and hash checks. Controls reject early interleaving, omitted preparation, identity swap, swallowed failures, continued ready, fail-fast abandonment and synchronous-map abandonment. These are callback test results, not actual browser game proof.

Exact extracted source blocks for canonical conflicts/uncertain retries, all eight UI rounds/final ranking, owned room cleanup and terminal context/diagnostic checks match 131. The source supplement assesses all eight what-if axes and explicitly retains timeout/process death, real browser latency and current execution limits. Its prior 0fb 45-record/207-criterion/360-axis reference remains historical; no old source/runtime evidence is silently recertified. Existing requirements and satisfaction are unchanged.

Separate operational evidence capture producer hashes and committed diffs are included outside the canonical source inventory. The added failure UI capture retains the same live-ui lane, 2..15 name bounds, invocation mtime guard and copy/hash provenance. It does not change assertions or turn copied artifacts into passing execution proof. Corrected targeted lint/diff/unit delta receipts are pinned, while failed earlier receipts/raw logs remain retained.

Wiki 93cc02d is a href-normalized publication projection: 935 substitutions across 92 pages, 108 exports/274 original files preserved, current requirements/mapping semantics retained. Raw canonical export SHA256 $zipHash remains unchanged. Four historical/tmp screenshot originals have no exact restoration provenance and remain explicit gaps. Source commit publication, remote HTTP/rendering and current gameplay are separate claims.

Pending: parent current full native/TRX reports, 14 actual 2..15 browser games with 119 participations/952 solves, separate strict private push, hosted deployment/worker/privacy, physical admin PWA/provider consent observations, final Cline/Beam/High independent review/full JSONL/readback/98+98 and contest entry obligations. No source test execution, builds, model invocation, provider changes or requirement mutations were performed by this audit. Accuracy 99/completeness 99 refer only to this bounded source/evidence self-review.
"@
$markdown | Set-Content -LiteralPath $markdownPath -Encoding utf8
$readback=Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json -AsHashtable
if($readback.sourceHead -cne $SourceRevision -or $readback.axes.Count -ne 8 -or $readback.sourceManifest.sourceHashes.Count -ne $sourcePins.Count){throw 'Final supplement readback mismatch'}
[pscustomobject]@{timestamp=(Get-Date -Format s);sourceHead=$SourceRevision;runId=$RunId;sourceCount=$sourcePins.Count;sourceChanges=$sourceChanges;jsonPath=$jsonPath;jsonSha256=$jsonHash;markdownPath=$markdownPath;markdownSha256=(Get-FileHash $markdownPath).Hash} | ConvertTo-Json -Depth 10
