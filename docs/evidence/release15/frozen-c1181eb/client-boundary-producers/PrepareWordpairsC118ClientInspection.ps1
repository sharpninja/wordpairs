#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Prepare','Scan','Readback')][string]$Operation='Prepare')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root='<repo>'
$evidence=Join-Path $root 'docs/evidence/release15/frozen-c1181eb'
$directory=Join-Path $evidence 'client-boundary-producers'
$adapted=Join-Path $directory 'InspectWordpairsCompiledClientBoundary-c1181eb.ps1'
$revision='c1181eb4eb01825c8b12f3521f92286080addfba'
$groupRun='169e6d93-632f-423c-8572-be3cccb96a00'
$request='req-20261031T003052Z-c118-operational-evidence'
if($Operation -eq 'Prepare'){
 $validationPath=Join-Path $evidence 'full/validation.json';$invocationPath=Join-Path $evidence 'full/invocation.json'
 if(-not (Test-Path -LiteralPath $validationPath) -or -not (Test-Path -LiteralPath $invocationPath)){Write-Output 'WAIT: terminal full/native invocation receipts absent; no scan or producer adaptation';return}
 $validation=Get-Content -LiteralPath $validationPath -Raw|ConvertFrom-Json -Depth 100;$invocation=Get-Content -LiteralPath $invocationPath -Raw|ConvertFrom-Json -Depth 100
 $build=@($validation.steps|Where-Object name -CEQ 'build')
 if($validation.revision -cne $revision -or $validation.status -cne 'passed' -or $validation.failure -or @($validation.steps|Where-Object exitCode -NE 0).Count -or $build.Count -ne 1 -or $build[0].exitCode -ne 0 -or $invocation.revision -cne $revision -or @($invocation.reports).Count -ne 1 -or $invocation.reports[0].runId -cne $groupRun -or $invocation.reports[0].exitCode -ne 0 -or -not $invocation.reports[0].sourceUnchanged){throw 'Successful exact terminal full/native build required before producer adaptation'}
 $nativeRun=[string]$validation.runId
 if($nativeRun -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'){throw 'Native validation run ID malformed'}
 if(Test-Path -LiteralPath $directory){throw 'Preserve previous producer retention'}
 if(-not $PSCmdlet.ShouldProcess($directory,'Retain original/adapted inspection producers after actual successful full build, before narrow client scan')){return}
 $original='/tmp/InspectWordpairsCompiledClientBoundary.ps1';$template='/tmp/InspectWordpairsCompiledClientBoundary-fdee7a2.ps1'
 if((Get-FileHash -LiteralPath $original).Hash -cne 'B0CC92F1AA3BAFFC8668FA1C4E100C695CF150557421C7003E7399A5C340CAC5' -or (Get-FileHash -LiteralPath $template).Hash -cne 'BB64CE230A697940007CFDE023C5B3327911D307192D32A91AF6A70BE0C413EC'){throw 'Prior inspection producer pin changed'}
 [void][IO.Directory]::CreateDirectory($directory)
 $originalCopy=Join-Path $directory 'InspectWordpairsCompiledClientBoundary-original.ps1';$templateCopy=Join-Path $directory 'InspectWordpairsCompiledClientBoundary-fdee7a2-original.ps1'
 Copy-Item -LiteralPath $original -Destination $originalCopy;Copy-Item -LiteralPath $template -Destination $templateCopy
 if((Get-FileHash -LiteralPath $originalCopy).Hash -cne (Get-FileHash -LiteralPath $original).Hash -or (Get-FileHash -LiteralPath $templateCopy).Hash -cne (Get-FileHash -LiteralPath $template).Hash){throw 'Retained original inspection source mismatch'}
 $text=[IO.File]::ReadAllText($template)
 foreach($pair in @(@('frozen-fdee7a2','frozen-c1181eb'),@('fdee7a2569bb4742e008977e2a9cd7d312def859',$revision),@('b8d49829-2942-4b9d-aa8f-1d3667e4016d',$nativeRun),@('0f337bfa-39c7-4650-b35d-6ee8d698be0f',$groupRun),@('ne 348','ne 353'),@('/tmp/InspectWordpairsCompiledClientBoundary-fdee7a2-original.ps1',$originalCopy))){if(-not $text.Contains($pair[0],[StringComparison]::Ordinal)){throw 'Expected exact adaptation anchor absent'};$text=$text.Replace($pair[0],$pair[1])}
 [IO.File]::WriteAllText($adapted,$text)
 $preparationCopy=Join-Path $directory (Split-Path $PSCommandPath -Leaf);Copy-Item -LiteralPath $PSCommandPath -Destination $preparationCopy
 $pins=@(foreach($path in @($originalCopy,$templateCopy,$adapted,$preparationCopy)){$tokens=$null;$errorsFound=$null;[void][Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errorsFound);$issues=@(Invoke-ScriptAnalyzer -Path $path -Severity Warning,Error);if(@($errorsFound).Count -or $issues.Count){throw 'Retained inspection producer parser/analyzer failed'};[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;parserErrors=0;analyzerIssues=0}})
 $target=Join-Path $directory 'producer-retention.json'
 [pscustomobject]@{recordedAt=[DateTimeOffset]::Now.ToString('o');sessionId='Codex-20261030T194802Z-plugin-session';requestId=$request;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';sourceRevision=$revision;sourceCount=353;nativeRunId=$nativeRun;producerGroupRunId=$groupRun;build=$build[0];fullValidationSha256=(Get-FileHash -LiteralPath $validationPath).Hash;fullInvocationSha256=(Get-FileHash -LiteralPath $invocationPath).Hash;producerPins=$pins;originalsRetained=$true;adaptation='Only exact candidate directory/revision/353 denominator, native/group run IDs and retained original pointer changed. Existing literal/symbol/relative-graph scan and build timestamp/hash fail-closed assertions retained.';qualification='Producer retention before scan, not a new build/test or broad secret/hosted/HV acceptance.'}|ConvertTo-Json -Depth 20|Set-Content -LiteralPath $target
 [pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;producerPins=$pins}|ConvertTo-Json -Depth 10
}elseif($Operation -eq 'Scan'){
 & $adapted -RequestId $request -WhatIf:$WhatIfPreference
}else{
 $path=Join-Path $evidence 'client-boundary.json'
 $receipt=Get-Content -LiteralPath $path -Raw|ConvertFrom-Json -Depth 100
 $retention=Join-Path $directory 'producer-retention.json'
 [pscustomobject]@{recordedAt=[DateTimeOffset]::Now.ToString('o');path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;producerRetention=@{path=$retention;sha256=(Get-FileHash -LiteralPath $retention).Hash};revision=$receipt.revision;assetCount=$receipt.assetCount;totalBytes=$receipt.totalBytes;stableDuringScan=$receipt.stableDuringScan;knownValueLiteralMatches=$receipt.knownValueLiteralMatchCount;privateSymbolMatches=$receipt.privateSymbolMatchCount;checkedSourceFiles=$receipt.sourceBinding.checkedSourceFiles;allPinsMatch=$receipt.sourceBinding.allPinsMatch;build=$receipt.buildBinding.buildStep;groupRunId=$receipt.buildBinding.producerGroupRunId;clientEntrypoints=@($receipt.clientSourceGraph.entrypoints).Count;reachable=$receipt.clientSourceGraph.reachableCount;privateReachable=@($receipt.clientSourceGraph.privateModulesReachable).Count;unresolvedRelativeImports=@($receipt.clientSourceGraph.unresolvedRelativeImports).Count;dynamicImports=@($receipt.clientSourceGraph.dynamicImportFiles).Count;limitations=$receipt.limitations;qualification=$receipt.qualification}|ConvertTo-Json -Depth 20
}
