#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$dir=Join-Path $repo 'docs/evidence/release15/historical-failsafe-disposition'
$filename='20261029T042440Z-triage-report-5ca5.yaml'
$recordedHash='2154F3574CC200C1D1DA606E4382C4117CA8378CB2B22F96141FC228B01DBA0F'
function Get-Pin([string]$Path){[pscustomobject]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash}}
$verdict=Join-Path $repo 'docs/receipts/hv/20261029T102510-admin-pwa-source-round6.verdict.json'
$old=Get-Content -LiteralPath $verdict -Raw|ConvertFrom-Json
$unknown=@($old.items|Where-Object id -EQ 'S1-20')[0]
if($unknown.status -cne 'UNKNOWN' -or -not $unknown.claim.Contains($filename)){throw 'Original reviewer UNKNOWN changed'}
$creation=Join-Path $repo 'docs/receipts/hv/20261028T230220-admin-pwa-source-round3.public.response.jsonl'
$line=(Get-Content -LiteralPath $creation|Select-Object -Skip 546 -First 1)
if(-not $line.Contains($filename) -or -not $line.Contains($recordedHash) -or -not $line.Contains('FAILSAFE-WRITTEN')){throw 'Exact retained file creation receipt absent'}
$producer=Join-Path $repo 'docs/receipts/hv/claude-opus-round3-tools/R3-04-StopReceipts.ps1'
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($producer,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'Cannot inspect retained producer literal arguments'}
$command=@($ast.FindAll({param($node) $node -is [Management.Automation.Language.CommandAst] -and $node.GetCommandName() -eq 'New-McpTriageReportParams'},$true))[0]
$literals=@{}
for($i=0;$i -lt $command.CommandElements.Count-1;$i++){
 $element=$command.CommandElements[$i]
 if($element -is [Management.Automation.Language.CommandParameterAst] -and $element.ParameterName -in @('Title','Summary','DedupeKey')){
  $next=$command.CommandElements[$i+1]
  if($next -isnot [Management.Automation.Language.StringConstantExpressionAst]){throw 'Original parameter is not a literal'}
  $literals[$element.ParameterName]=$next.Value
 }
}
$research=Get-Content -LiteralPath (Join-Path $dir 'research-readback.json') -Raw|ConvertFrom-Json
if($research.runs.Count -ne 1){throw 'Retained exact-group research is ambiguous'}
$run=$research.runs[0]
$report=$run.groupSnapshot.reports[0]
$titleMatches=$report.title -ceq $literals.Title
$summaryMatches=$report.summary -ceq $literals.Summary
if(-not $titleMatches -or -not $summaryMatches -or $report.originalWorkspacePath -cne $repo){throw 'Matching report material differs from retained original producer'}
$files=@(Get-ChildItem -LiteralPath (Join-Path $repo '.mcpServer/failsafe') -Recurse -Force -File)
$found=@($files|Where-Object Name -EQ $filename)
$evidence=@('query-groups.json','query-groups-mcpserver.json','catalog-report.json','research-readback.json','cross-reference-readback.json','scope-read-failsafe.yaml','scope-read-triage-submission.yaml')
$receipt=[ordered]@{
 recordedAt=(Get-Date -Format s);classification='Optional read-only factual evidence reconciliation, not HV or a release gate';sessionId='Codex-20261030T200118Z-plugin-session';requestId='req-20261031T003421Z-failsafe-disposition';parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release'
 originalVerdict=(Get-Pin $verdict);originalFinding=$unknown;originalVerdictUnchanged=$true;originalFateFindingStillUnknown=$true
 queued=@{confirmed=$true;filename=$filename;recordedFileSha256=$recordedHash;source=(Get-Pin $creation);line=547;qualification='The retained creation result confirms a local queue write and readback in that historical run. Current original YAML bytes are unavailable.'}
 localSearch=@{path=(Join-Path $repo '.mcpServer/failsafe');recursiveForce=$true;filesInspected=$files.Count;exactFilenameMatches=$found.Count;qualification='Current absence is not proof of replay, deletion cause or loss.'}
 originalProducer=@{source=(Get-Pin $producer);literalTitle=$literals.Title;literalSummary=$literals.Summary;literalDedupeKey=$literals.DedupeKey;executedBytesQualification='Retained producer source is inspected, not re-executed or claimed byte-bound to the unavailable original YAML.'}
 durableMatchingIncident=@{reportId=$report.reportId;groupId=$report.groupId;reportStatusInResearchSnapshot=$report.status;createdUtc=$report.createdUtc;originalWorkspacePath=$report.originalWorkspacePath;effectiveWorkspacePath=$report.workspacePath;titleExactMatch=$titleMatches;summaryExactMatch=$summaryMatches;dedupeExposedByReadModel=$false;canonicalReportSnapshotVerified=$true;qualification='A server-retained research input proves this matching report existed and was grouped. No native record shown contains the original failsafe filename/hash or its dedupe key, so byte-specific replay identity is not established.'}
 research=@{runId=$run.runId;status=$run.status;groupCurrentCatalogStatus='failed';agentExitCode=$run.agentExitCode;startedUtc=$run.startedUtc;completedUtc=$run.completedUtc;createdTodoId=$run.createdTodoId;qualification='Research failed after intake. It does not establish failed submission, loss, repair or incident resolution.'}
 disposition=@{queued='CONFIRMED';matchingIncidentDurablyGrouped='CONFIRMED';exactFailsafeSubmittedOrReplayed='UNKNOWN';exactFailsafeAccepted='UNKNOWN';incidentResolved='UNPROVED';missingDependency='An authoritative replay/intake acknowledgement joining this exact filename and recorded2154F357... file hash to the accepted report ID, or equivalent exact origin provenance. Matching title/summary and timing cannot distinguish replay from an identical independent submission.'}
 supportedOperations=@('workflow.triage.queryGroups unfiltered and explicit McpServer workspace','workflow.triage.queryRuns explicit workspace and exact groupId','client.Context.SearchAsync exact filename','client.SessionLog.QueryAsync ClaudeCode limit100/offset0','workflow.triage.getGroup exact catalog ID in Wordpairs returned notfound; not retried around scope/trust')
 scopeQualification='Local supported client/workflow source shows queryGroups/queryRuns accept workspacePath, getGroup/getReport accept ID only. Local service source explains filtered query override versus current-context detail lookup, and queryGroups omits detailed reports. This is explanatory source inspection, not deployed-version attestation; no context/authentication bypass was used.'
 incidentalTriage=@{reportId='triage-report-ea2cd13ccc5c48c4be8e9020c0bca80c';groupId='triage-group-e3532663a55520c2';accepted=$true;status='collecting';qualification='Separate narrowly qualified scope/documentation observation, submitted before the expected-scope explanation was fully inspected. Not a confirmed server defect, not repair work, and not original5ca5 fate evidence.'}
 originalEvidencePreserved=$true;applicationTestsRequirementsGuidesEdited=$false;testsBuildModelsProviderMutationsRun=$false;rawRestUsed=$false;accuracy=99;completeness=98;ratingQualification='Scoped factual inquiry with explicit unresolved origin dependency, not acceptance of the original review or release.'
 evidence=@($evidence|ForEach-Object {Get-Pin (Join-Path $dir $_)})
}
if(-not $PSCmdlet.ShouldProcess($dir,'Retain linked safe disposition and inspected producer copies')){return}
$path=Join-Path $dir 'disposition.json';if(Test-Path -LiteralPath $path){throw 'Preserve prior disposition'}
$receipt|ConvertTo-Json -Depth 25|Set-Content -LiteralPath $path
foreach($script in @($PSCommandPath,'/tmp/ReadWordpairsFailsafeResearch.ps1','/tmp/ReadWordpairsFailsafeCrossReferences.ps1','/tmp/QueryWordpairsFailsafeDisposition.ps1','/tmp/ReportWordpairsTriageScopeRead.ps1')){
 $copy=Join-Path $dir ([IO.Path]::GetFileName($script));Copy-Item -LiteralPath $script -Destination $copy
 if((Get-FileHash -LiteralPath $copy).Hash -cne (Get-FileHash -LiteralPath $script).Hash){throw 'Retained producer copy mismatch'}
}
Get-Pin $path|ConvertTo-Json
Get-Date -Format s
