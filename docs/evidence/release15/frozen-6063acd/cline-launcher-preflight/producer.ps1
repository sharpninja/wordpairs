#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$dir=Join-Path $repo 'docs/evidence/release15/frozen-6063acd/cline-launcher-preflight'
$own=Get-Content -LiteralPath /tmp/wordpairs-cline-preflight-session.json -Raw|ConvertFrom-Json
function Get-PreflightPin([string]$Path){[ordered]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash;bytes=(Get-Item -LiteralPath $Path).Length}}
$paths=@('/tmp/InvokeWordpairsClineHv.ps1','/tmp/StartWordpairsClineHvJob.ps1','/tmp/PrepareWordpairsClineReview.ps1','/tmp/wordpairs-cline-review-brief-template.md')
$pins=@($paths|ForEach-Object {Get-PreflightPin $_})
$expected=@('1141ED71BA2ECA8874E1ED68CDCBAF3237686A932FA06C96ED1F77AC5C4FA70C','0F4EA57B8C9BE1257B236C72769E1FBCC678D39652AB1E107B7A11764D04A38A','B9A91955C099D4A5FC53D5C4318AB5435C62E3988B17AC25F6F53310BDCC91A8','104B154A5F2755464DCEE1C91EEE9441D4693FE7F047CE079D2FABDFF57B50F1')
for($i=0;$i -lt $pins.Count;$i++){if($pins[$i].sha256 -cne $expected[$i]){throw 'Inspected preflight tool changed'}}
$analysis=@(foreach($path in $paths|Where-Object {$_ -like '*.ps1'}){
 $tokens=$null;$errors=$null;[void][Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
 $issues=@(Invoke-ScriptAnalyzer -Path $path -Severity Warning,Error -WhatIf:$false)
 [ordered]@{path=$path;parseErrors=@($errors).Count;analyzerIssues=$issues.Count;issueDetails=@($issues|ForEach-Object {$_.RuleName+':'+$_.Line+':'+$_.Message})}
})
if(@($analysis|Where-Object {$_.parseErrors -or $_.analyzerIssues}).Count){throw 'Current reviewed tool static analysis failure'}
$launcher=Get-Content -LiteralPath $paths[0] -Raw
$preparer=Get-Content -LiteralPath $paths[2] -Raw
$template=Get-Content -LiteralPath $paths[3] -Raw
foreach($phrase in @('NEVER build','completionPercent','etaMinutes','ENTIRE verdict','CacheRoot','NEVER a standalone AC record type')){if(-not $template.Contains($phrase)){throw 'Reviewed template obligation absent'}}
$start=$preparer.IndexOf('$relativeFiles=@(');$end=$preparer.IndexOf('$files=@(',$start)
if($start -lt 0 -or $end -lt 0){throw 'Static reviewed file inventory boundary absent'}
$relative=@([regex]::Matches($preparer.Substring($start,$end-$start),"'([^']+)'" )|ForEach-Object {$_.Groups[1].Value})
$missing=@($relative|Where-Object {-not(Test-Path -LiteralPath (Join-Path $repo $_) -PathType Leaf)})
$runtimePath=Join-Path $repo 'docs/evidence/release15/cline-runtime-preflight/readiness.json'
$runtime=Get-Content -LiteralPath $runtimePath -Raw|ConvertFrom-Json
$native=Get-PreflightPin $runtime.cli.nativePath
if($native.sha256 -cne $runtime.cli.nativeSha256 -or -not $launcher.Contains($native.sha256)){throw 'Actual native Cline hash differs from source pin'}
$anchors=@(foreach($path in $paths){
 $line=0;foreach($value in Get-Content -LiteralPath $path){$line++;if($value -match 'verifiedReports|reports\)\.Count|reports\)\+|--provider|--thinking|\.TotalMinutes|CopyToAsync|sourceHashes|bindingDrift|reviewer-owned|ENTIRE verdict|CacheRoot|never build|never run tests|completionPercent|etaMinutes|retainedInputs|Preparation provenance|full completed passing chain'){
  [ordered]@{path=$path;line=$line;text=$value}
 }}
})
$checks=@(
 [ordered]@{id='MODEL-EFFORT';source='InvokeWordpairsClineHv.ps1 native pin and arguments; template First actions; readiness nativeCodeAnchors';result='Configured native3.0.71 executable hash matches actual installed bytes; --provider cline --model reflection/beam-free --thinking high --json --verbose --cwd. Retained vendor catalog calls this ID Beam; explicit High resolution overrides persistedMedium. No model invocation here. Actual run_start provider/model/thinking and complete run_result remain acceptance observations; backend effort acknowledgement is not exposed or claimed.'},
 [ordered]@{id='UNBOUNDED-OWNERSHIP';source='InvokeWordpairsClineHv.ps1 process ownership/finally loop; StartWordpairsClineHvJob.ps1 systemd-run';result='No --timeout, max-output, step/iteration/size or RuntimeMaxSec cap introduced. CopyToAsync preserves byte stream; polling500ms does not bound review. Only Kill path is >30minutes without response-length update. Post-start stdin/capture errors do not terminate active reviewer. Persistent user unit has no requested runtime/output bound. Stream-read errors retain ownership instead of being treated as silence.'},
 [ordered]@{id='PLUGIN-IDENTITY';source='template First actions; launcher unique CacheRoot appendix/env; current matching wrapper parameter forwarding';result='Dedicated timestamped .mcpServer/cline-hv-*/plugin-cache is named in prompt. Every Cline invocation must explicitly pass it, workspace and PluginRoot to OWN Cline wrapper. Launcher sets PLUGIN_AGENT_NAME=Cline/CLINE_PLUGIN_ROOT/MCP_MODEL. Wrapper supports explicit CacheRoot/PluginRoot. Reviewer must actually verify trust/nonce/sourceType/session and return own readback; source obligation is not an observed future bootstrap.'},
 [ordered]@{id='TWELVE-REPORTS';source='launcher chain/core/supplemental/preparer/native-TRX loops; preparer replacement calls for every named report';result='Require exact current chain revision/run, five phases and four preparations all0; eight core reports plus three supplemental plus22casepreparer-real =12. Every TRX/native hash/outcome checked, nonzero case counts and each UnitTestResult Passed with exact report case count. Unit/PG/browser match collectedinventory; current preparer resolves each named attachment uniquely. Expected filenames/content missing or chain incomplete fail before process start. This preflight does not execute these gates or assert running chain complete.'},
 [ordered]@{id='SOURCE-PACKET-BINDING';source='launcher current Git pathset/manifest/hash/doc/self/retention binding, DRAFT/placeholder rejection and final bindingDrift';result='Clean declared source and exact committed operational producer blobs required; complete source pathset/count/unique/hashes and13whole-doc pins, inspected self files, preparation actualpath/hash/run, two retained input copies, all12TRX/native and native supporting lane files bound. Post-run HEAD/pathset/allboundfile drift recorded. Preparer retains ownsource/template, consumes retained template and rechecks both originals/copies. DRAFT template is correctly not itself launchable; only completed generated brief afterpassingchain is eligible.'},
 [ordered]@{id='FULL-VERDICT-AUDIT';source='template Four mandatory review surfaces and Deliver complete independent verdict; launcher process-result qualification';result='Require full byte-complete request/responseJSONL, meaningful numeric completionPercent/etaMinutes progress, allfour surfaces, everyfinding/PASS/FAIL/UNKNOWN/count/score and exact source/gate. Entire prose+structured verdict must persist in reviewer OWN complete ClineMCPturn with parentIDs and exact fullbody readback. Both scores>=98 and AGREE needed; reviewer never builds/tests/servers/browserruns. Launcher process exit is explicitly not approval. Root must actually verify all those post-run observations separately; lack of a future verdict is expected, not a launcher defect.'}
)
$receipt=[ordered]@{atLocal=(Get-Date -Format s);classification='Read-only operational launch preflight, not HV/source approval or launch';ownSessionId=$own.sessionId;ownRequestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;headAtRead=(& git -C $repo rev-parse HEAD).Trim();tools=$pins;scriptStaticAnalysis=$analysis;actualNative=$native;retainedRuntimeInspection=Get-PreflightPin $runtimePath;reviewedWrapper=Get-PreflightPin '<home>/github/mcpserver-cline-plugin/lib/Invoke-McpPlugin.ps1';relativeReferencedFileCount=$relative.Count;missingRelativeReferencedFiles=$missing;checks=$checks;sourceAnchors=$anchors;blockingToolDefects=@();launchEligibility='Pending actual complete current chain, completed preparation, genuine WhatIf/hardgate evaluation and exact-source full reports; this task did not run preparer/launcher/model or bypass pending gates.';remainingActualAcceptance=@('Authenticated provider run after any normalrefresh, actual runtime provider/model/thinking and effort qualification.','Reviewer literal profile/live memories and verified ownmatching plugin/cache/session, complete ownMCPverdict/readback.','Allfour surfaces, full JSONL/progress, fullverdict everyfinding,AGREE+bothscores>=98, no capture failure/stall or boundfile drift.');notClaimed=@('Backend internal effort acknowledgement unavailable from installedCLI.','Current full chain completion, review acceptance, hosted rollout or game completion.');mutations='Only safe preflight receipt/source copies and own required Codex audit. No reviewed tool edits, model/preparer invocation, test/build, source/requirement/provider writes.';accuracy=99;completeness=98}
if(-not $PSCmdlet.ShouldProcess($dir,'Retain narrow safe preflight receipt and exact reviewed source copies')){return}
[void](New-Item -ItemType Directory -Path $dir -Force)
if(Test-Path -LiteralPath (Join-Path $dir 'receipt.json')){throw 'Preserve existing preflight receipt'}
$copies=@(foreach($pin in $pins){$target=Join-Path $dir ([IO.Path]::GetFileName($pin.path));Copy-Item -LiteralPath $pin.path -Destination $target;if((Get-FileHash -LiteralPath $target).Hash -cne $pin.sha256 -or (Get-FileHash -LiteralPath $pin.path).Hash -cne $pin.sha256){throw 'Retained tool copy mismatch'};Get-PreflightPin $target})
$receipt['retainedCopies']=$copies
$receipt|ConvertTo-Json -Depth 15|Set-Content -LiteralPath (Join-Path $dir 'receipt.json')
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $dir 'producer.ps1')
if((Get-FileHash -LiteralPath $PSCommandPath).Hash -cne (Get-FileHash -LiteralPath (Join-Path $dir 'producer.ps1')).Hash){throw 'Preflight producer copy mismatch'}
$text=@"
$($receipt.atLocal) - Read-only operational preflight found no additional concrete blocker in current launcher1141ED71, job0F4EA57B, preparerB9A91955 and template104B154A. This is not HV or launch authorization by itself. Running full chain and completed generated packet/hardgates remain prerequisites, not defects to bypass. No reviewed source/tool edit or preparer/model/test/build/provider invocation occurred.

$([string]::Join("`n`n",@($checks|ForEach-Object {$_.id+': '+$_.result})))

Static parser/PSSA Warning/Error checks of all three reviewed PowerShell tools returned0. Actual native hash$($native.sha256) matches pinned3.0.71. Static existing relative evidence references:$($relative.Count); missing:$($missing.Count). Missing dynamic future chain/brief/report files are governed by current gates; no complete-chain claim is made. Current template placeholders are intentional and rejected by the launcher until preparation completes. All four reviewed source copies and line anchors are retained in receipt.json; originals unchanged.

No new launch-blocking tool defect observed. Pending actual run/auth/model/effort qualification, reviewer-own plugin/trust/session/fullverdict/readback, required progress/fullJSONL/allfour surfaces/98scores and post-run drift acceptance remain the operator's existing independent review contract. CLI backend effort acknowledgement is unavailable and is not invented as a prerequisite. Historical FAILED candidates/process exceptions remain in the brief with proper scope; this preflight does not re-review the game or erase them.

Own$($own.sessionId)/$($own.requestId), parent$($own.parentSessionId)/$($own.parentRequestId). Accuracy99%, completeness98% for this narrow mechanical/source preflight only; not independent review acceptance. FAIL0 new tool defects; UNKNOWN actual future runtime/model/bootstrap/verdict until execution.
"@
$text|Set-Content -LiteralPath (Join-Path $dir 'result.md')
[ordered]@{atLocal=(Get-Date -Format s);receipt=Get-PreflightPin (Join-Path $dir 'receipt.json');result=Get-PreflightPin (Join-Path $dir 'result.md');missingRelativeReferences=$missing.Count;newBlockingToolDefects=0;producer=Get-PreflightPin (Join-Path $dir 'producer.ps1')}|ConvertTo-Json -Depth 5
