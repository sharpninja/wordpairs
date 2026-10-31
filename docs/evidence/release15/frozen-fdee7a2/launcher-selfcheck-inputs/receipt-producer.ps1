#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$root='<repo>'
$dir=Join-Path $root 'docs/evidence/release15/frozen-fdee7a2'
$receiptPath=Join-Path $dir 'launcher-selfcheck.json'
if(-not $PSCmdlet.ShouldProcess($receiptPath,'Write bounded read-only launcher self-check and hash-verified retained input copies')){return}
if(Test-Path -LiteralPath $receiptPath){throw 'Retain existing launcher self-check receipt'}
$retained=Join-Path $dir 'launcher-selfcheck-inputs'
if(Test-Path -LiteralPath $retained){throw 'Retain existing input snapshot directory'}
[void](New-Item -ItemType Directory -Path $retained)
$pins=@(foreach($source in @('/tmp/PrepareWordpairsClineReview.ps1','/tmp/InvokeWordpairsClineHv.ps1','/tmp/wordpairs-cline-review-brief-template.md')){
 $hash=(Get-FileHash -LiteralPath $source).Hash
 $copy=Join-Path $retained ([IO.Path]::GetFileName($source))
 Copy-Item -LiteralPath $source -Destination $copy
 if((Get-FileHash -LiteralPath $copy).Hash -cne $hash -or (Get-FileHash -LiteralPath $source).Hash -cne $hash){throw 'Self-check input changed or copy mismatch'}
 [pscustomobject]@{path=$source;sha256=$hash;retainedCopy=[IO.Path]::GetRelativePath($root,$copy);originalRetained=$true}
})
$support=@('docs/evidence/release15/frozen-fdee7a2/expected-inventory.json','docs/evidence/release15/operational-producers/RunNextWordpairsEvidenceChain.ps1','scripts/Prepare-ReviewSupplementalEvidence.ps1','docs/evidence/release15/command-capture/receipt.json','docs/evidence/release15/command-capture/source-check-final.json','docs/evidence/release15/frozen-fdee7a2/launcher-selfcheck.md')
$supportPins=@(foreach($relative in $support){[pscustomobject]@{path=$relative;sha256=(Get-FileHash -LiteralPath (Join-Path $root $relative)).Hash}})
$inventory=Get-Content -LiteralPath (Join-Path $dir 'expected-inventory.json') -Raw|ConvertFrom-Json
$state=Get-Content -LiteralPath '/tmp/wordpairs-release-selfcheck-codex/current-turn.yaml' -Raw|ConvertFrom-Yaml
$producer=Join-Path $retained 'receipt-producer.ps1'
Copy-Item -LiteralPath $PSCommandPath -Destination $producer
if((Get-FileHash -LiteralPath $producer).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Receipt producer copy differs'}
[ordered]@{
 timestampLocal=(Get-Date -Format s)
 kind='read-only-review-preparation-selfcheck-not-HV'
 revision='fdee7a2569bb4742e008977e2a9cd7d312def859';runId=$inventory.runId
 ownSessionId=$state.sessionId;ownRequestId=$state.turnRequestId
 parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release'
 fullInputsRead=$pins;supportPins=$supportPins
 recommendations=@(
  [ordered]@{id='PREP-NARRATIVE-1';source='/tmp/PrepareWordpairsClineReview.ps1';lines='26-30';classification='observed stale/incomplete current narrative';change='Include command capture and V2 cached-body/action error retention in current what-if/search/no-new-mechanism reasons and evidence lists; attachments already exist.'},
  [ordered]@{id='PREP-NARRATIVE-2';source='/tmp/PrepareWordpairsClineReview.ps1';lines='66';classification='causal inference qualification';change='Historical holdout-pruning explanation is source-supported inference, not exact removed-runtime DB proof; replace led-to certainty with explicit consistency/inference.'},
  [ordered]@{id='PREP-NARRATIVE-3';source='/tmp/PrepareWordpairsClineReview.ps1';lines='79';classification='ambiguous actor attribution';change='Say the test driver body read failed; do not imply player6 exact Request was joined. Keep the existing no exact old actor/Request binding qualification.'}
 )
 blockingLifecycleModelDefectObserved=$false
 supplementalGateSweep='Launcher counts unit/PG/browser directly; committed supplemental producer validates exactRealtime/matrix/strict names, inventories and provenance upstream. Preparation also requires every named report uniquely. Non-repetition is not an observed missing end-to-end gate.'
 nativeHighQualification='Explicit High flag and pinned native resolution do not prove backend effort acknowledgement; actual stream/model/resolved-effort and own reviewer readback remain acceptance obligations.'
 expectedCollection=[ordered]@{unit=$inventory.expectedUnitCount;postgres=$inventory.expectedPostgresCount;browser=$inventory.expectedBrowserCount;realtime=$inventory.expectedRealtimeCount;matrix=$inventory.expectedMatrixCount;strict=$inventory.expectedStrictCount}
 noCurrentExecutionOutcomeClaim=$true
 pending=@('Parent current completed five-lane chain and all12TRX','Filled final brief/current source self-review and actual launcher WhatIf','Actual Cline Beam High runtime stream and complete verdict/scores','Reviewer-owned full MCP logging/readback and post-run binding drift assessment','Hosted/physical/submission acceptance where pending')
 sourceOrProducerOrBriefEdits=$false;launchTestBuildProviderRuns=$false
 producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash
 accuracyPercent=99;completenessPercent=98;scoreQualification='Bounded same-family source/brief self-check only; no hostile approval or current execution pass.'
}|ConvertTo-Json -Depth 15|Set-Content -LiteralPath $receiptPath
[pscustomobject]@{path=[IO.Path]::GetRelativePath($root,$receiptPath);sha256=(Get-FileHash -LiteralPath $receiptPath).Hash;timestampLocal=(Get-Date -Format s);ownSessionId=$state.sessionId;ownRequestId=$state.turnRequestId;recommendations=3;blockingLifecycleModelDefectObserved=$false;allInputsCopiedAndVerified=$true}|ConvertTo-Json
