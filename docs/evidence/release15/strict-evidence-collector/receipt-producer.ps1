#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$folder=Join-Path $repo 'docs/evidence/release15/strict-evidence-collector'
$producer=Join-Path $repo 'docs/evidence/release15/operational-producers/RunWordpairsRelease15Evidence.ps1'
$original=Join-Path $folder 'RunWordpairsRelease15Evidence.original.ps1'
$fixtureSource='/tmp/Check-WordpairsStrictCollectorFixture.ps1'
$root='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0'
$cache='/tmp/wordpairs-capacity15-codex-cache'
$own=Get-Content -LiteralPath '/tmp/wordpairs-strict-collector-turn.json' -Raw | ConvertFrom-Json -AsHashtable
$before=Get-Content -LiteralPath (Join-Path $folder 'before.json') -Raw | ConvertFrom-Json -AsHashtable
$fixture=Get-Content -LiteralPath (Join-Path $folder 'fixture-result.json') -Raw | ConvertFrom-Json -AsHashtable
function Get-Pin {param([string]$Path) [ordered]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash;bytes=(Get-Item -LiteralPath $Path).Length}}
function Invoke-OwnPlugin {
 param([string]$Method,[hashtable]$Parameters)
 $r=& (Join-Path $root 'Invoke-CodexMcpPlugin.ps1') -Command Invoke -WorkspacePath $repo -CacheRoot $cache -Method $Method -ParamsObject $Parameters | ConvertFrom-Yaml
 if($r.type -ne 'result'){throw "Required Codex plugin failure: $Method"}
 $r.payload.result
}
if((Get-FileHash -LiteralPath $producer).Hash -cne $fixture.producerSha256 -or (Get-FileHash -LiteralPath $fixtureSource).Hash -cne $fixture.fixtureSha256 -or $fixture.passed -ne 4 -or $fixture.failed -ne 0 -or $fixture.copiesVerified -ne 38){throw 'Actual fixture/source binding mismatch'}
if((Get-FileHash -LiteralPath $original).Hash -cne $before.originalProducerSha256){throw 'Retained original differs'}
$checks=@()
foreach($source in @($producer,$fixtureSource,$PSCommandPath)){
 $tokens=$null;$errors=$null;[void][Management.Automation.Language.Parser]::ParseFile($source,[ref]$tokens,[ref]$errors)
 $diagnostics=@(Invoke-ScriptAnalyzer -Path $source -Severity Warning,Error)
 if(@($errors).Count -or $diagnostics.Count){throw ('Operational script analysis failed: '+$source)}
 $checks+=[ordered]@{source=$source;parserErrors=0;pssaWarningsErrors=0;sha256=(Get-FileHash -LiteralPath $source).Hash}
}
$oldLines=@(Get-Content -LiteralPath $original);$newLines=@(Get-Content -LiteralPath $producer)
if($oldLines.Count -ne $newLines.Count){throw 'Unexpected collector line count change'}
$changes=@(for($index=0;$index -lt $oldLines.Count;$index++){if($oldLines[$index] -cne $newLines[$index]){[ordered]@{line=$index+1;before=$oldLines[$index];after=$newLines[$index]}}})
if($changes.Count -ne 1 -or $changes[0].line -ne 58 -or -not$fixture.onlyApprovedPredicateAddition){throw 'Collector source diff exceeds approved change'}
$now=(Get-Date).ToString('o')
$receipt=[ordered]@{schema='wordpairs-strict-evidence-collector-repair-v1';recordedAt=$now;classification='Approved bounded operational artifact collection repair;not product implementation,testoracle or HV';ownSessionId=$own.sessionId;ownRequestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;profile=[ordered]@{files=1;globalMemories=9;workspaceMemories=0;excluded='PRIVATE-MEMORY-REFERENCE-007'};before=$before;currentProducer=Get-Pin $producer;sourceDiff=$changes;isolatedFixture=$fixture;scriptChecks=$checks;contract='Keep originaltimestampcutoff and laneisolation/live-localwildcard/normal live-scale2..15 logic;strict-ui only adds case-sensitive exactlive-ui-observations.json andlive-ui-failure-ui.json. Existingcopy/hashverify/manifest path is unchanged,so copied files participate in the existing recursive launcher binding.';fixtureHistory='Before data execution,the firstWhatIf rejected an overbroad ASTpipeline selection which included nestedJoin-Path. Filter corrected to the unique actual multipart manifestpipeline;subsequentWhatIf andfouractualisolatedcases passed. Initialunused-variable analyzerwarning resolved by verifying copied collection equals manifest count. Consolefixture caseprojection usedSelect-Object on dictionaries and printednulls;canonical fixture-result.json was separately read bykeys and confirms30/4/2/2. No receipt was overwritten or live lane rerun.';preserved='Originalcollector retained/copied/hashverified before edit;prior606strict observation preservationE6219BFE...readbackverified. All38 fixturecopies hashverified andallownedsourcefixture files retained. Existinghash-failure behavior,sourcechecks,reporting,artifactcopy and invocation controls unchanged.';unknowns=@('Actual next frozen strictcollector/runtime capture has not executed. This operational fixture proof does not repair or pass the historical606strict test or establish game/HV acceptance.');noApplicationTestsOtherOrchestratorsPreparerProviderOrModelChangesByThisAgent=$true;noLiveRerunFullSuiteOrNewProductRequirement=$true;counts=[ordered]@{pass=4;fail=0;copiesVerified=38;normalFilenameVariants=28;nonallowlistedNameControls=18;unknown=1};overallVerdict='NOT_HV';accuracy=99;completeness=100;ratingQualification='Exact one-line diff and actual copy/manifest AST exercised with owned temporary files;no live application/test execution or reviewer approval inferred.'}
if(-not $PSCmdlet.ShouldProcess($folder,'Retain exact collector diff/fixture/source copies and complete own canonical operational audit')){return}
$copies=@(@{from=$producer;to=(Join-Path $folder 'RunWordpairsRelease15Evidence.updated.ps1')},@{from=$fixtureSource;to=(Join-Path $folder 'Check-WordpairsStrictCollectorFixture.ps1')},@{from=$PSCommandPath;to=(Join-Path $folder 'receipt-producer.ps1')})
foreach($copy in $copies){if(Test-Path -LiteralPath $copy.to){throw 'Historical source copy overwrite refused'};Copy-Item -LiteralPath $copy.from -Destination $copy.to;if((Get-FileHash -LiteralPath $copy.from).Hash -cne (Get-FileHash -LiteralPath $copy.to).Hash){throw 'Operational source copy mismatch'}}
$diffPath=Join-Path $folder 'source-diff.json';$changes | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $diffPath -Encoding utf8NoBOM
$path=Join-Path $folder 'receipt.json';if(Test-Path -LiteralPath $path){throw 'Historical collector receipt overwrite refused'}
$receipt | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $path -Encoding utf8NoBOM
$pins=@(Get-Pin $path;Get-Pin $diffPath;Get-Pin (Join-Path $folder 'fixture-result.json');foreach($copy in $copies){Get-Pin $copy.to})
$response=$now+' - Collector-only operational repair retained;STOPPED before nextfreeze/liveexecution.'+"`n"+($receipt | ConvertTo-Json -Depth 30)+"`nPins:`n"+($pins | ConvertTo-Json -Depth 5)
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.appendDialog' -Parameters @{dialogItems=@(@{timestamp=$now;role='model';category='observation';content='Fullprofile376lines and live9Global/0Workspace loaded excludingPROCESS007. Fullcollector78lines read;originalparser/PSSA0. VerifiedselfcheckstrictpreservationmanifestE6219BFE...and copied118CEC13...before originalcollector21711...copied/hashverified. Separateownership communicated;no strict/sourcehelper edits.'},@{timestamp=$now;role='model';category='decision';content='Repair onlyexact strictfilename selection atcollectorline58. Keeporiginalcutoff,live-localwildcard,normal2..15regex,lane separation andsamecopy/hash/manifest code. Do notbroaden toother live-ui*,private/runtimeinputs orchangeexecution/assertion policy. This isoperationalcollection,not newproductAC/testoracle.'},@{timestamp=$now;role='model';category='observation';content='Ownedtempfilefixtures ranactualASTcopyloop+existingmanifestpipeline:fourcasespassed,38copieshashverified. Freshnormal30,freshstrict4,stalstrict2common,stalenormal2common. All28normalnamevariants and18nonallowlistednear/private/runtime names checked;equalcutoff included. CanonicalfixtureJSON30/4/2/2readbackcorrect;stdoutdictionaryprojectionnulls are not nativecasecounts. InitialWhatIfASTguard rejected beforedata,thenfixed;finalparser/PSSA0.'},@{timestamp=$now;role='model';category='decision';content='Preservehistorical606failure andalloriginals. No live rerun,fullsuite,app/test/otherorchestrator/preparer/provider/model/requirementschanges inthisturn. Stop afterownfullcanonicalreadback andstopgate;parentowns nextsourcefreeze,fullgates andClineHVlaunch.'})})
$actions=@();$order=1
foreach($pin in $pins){$actions+=@{order=$order;type='create';status='completed';filePath=[IO.Path]::GetRelativePath($repo,$pin.path);description='Retained operational collector evidence SHA256 '+$pin.sha256};$order++}
$actions+=@{order=$order;type='edit';status='completed';filePath=[IO.Path]::GetRelativePath($repo,$producer);description='Exact strict-onlyfilename predicate addition atline58;SHA256 '+$fixture.producerSha256};$order++
$actions+=@{order=$order;type='design_decision';status='completed';filePath=[IO.Path]::GetRelativePath($repo,$producer);description='Preserve cutoff/lane/private-name boundaries and existing copyhash/manifest behavior;historicalfailed606notrevalidated;operationalfixtures only.'}
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.appendActions' -Parameters @{actions=$actions})
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.completeTurn' -Parameters @{response=$response})
$history=Invoke-OwnPlugin -Method 'client.SessionLog.QueryAsync' -Parameters @{agent='Codex';limit=40}
$session=@($history.items | Where-Object sessionId -CEQ $own.sessionId)[0];$turn=@($session.turns | Where-Object requestId -CEQ $own.requestId)[0]
if($turn.status -cne 'completed' -or $turn.response -cne $response){throw 'Ownfullcanonicalcollectorreadback mismatch'}
$readback=[ordered]@{recordedAt=(Get-Date).ToString('o');sessionId=$own.sessionId;requestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;status=$turn.status;fullResponseMatched=$true;response=$turn.response;actions=@($turn.actions).Count;dialogs=@($turn.processingDialog).Count;pins=$pins}
$readbackPath=Join-Path $folder 'turn-readback.json';$readback | ConvertTo-Json -Depth 35 | Set-Content -LiteralPath $readbackPath -Encoding utf8NoBOM
[ordered]@{recordedAt=$readback.recordedAt;sessionId=$own.sessionId;requestId=$own.requestId;status=$turn.status;fullResponseMatched=$true;actions=$readback.actions;dialogs=$readback.dialogs;producerSha256=$fixture.producerSha256;receiptPins=$pins;readback=Get-Pin $readbackPath;counts=$receipt.counts;overallVerdict='NOT_HV';stopped=$true} | ConvertTo-Json -Depth 8
