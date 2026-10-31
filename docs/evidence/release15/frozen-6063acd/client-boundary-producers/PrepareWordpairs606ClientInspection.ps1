#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Prepare','Scan','Readback')][string]$Operation='Prepare')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root='<repo>'
$evidence=Join-Path $root 'docs/evidence/release15/frozen-6063acd'
$directory=Join-Path $evidence 'client-boundary-producers'
$adapted=Join-Path $directory 'InspectWordpairsCompiledClientBoundary-6063acd.ps1'
$revision='6063acd9d6869fd71a33f75ee5c940c736c99124'
$groupRun='d941371c-59de-40e1-875e-5c3b90778adb'
$request='req-20261031T011300Z-compiled-client-6063acd'
if($Operation -eq 'Prepare'){
 $validationPath=Join-Path $evidence 'full/validation.json';$invocationPath=Join-Path $evidence 'full/invocation.json'
 $validation=Get-Content -LiteralPath $validationPath -Raw|ConvertFrom-Json -Depth 100;$invocation=Get-Content -LiteralPath $invocationPath -Raw|ConvertFrom-Json -Depth 100
 $build=@($validation.steps|Where-Object name -CEQ 'build')
 if($validation.revision -cne $revision -or $validation.status -cne 'passed' -or $validation.failure -or @($validation.steps|Where-Object exitCode -NE 0).Count -or $build.Count -ne 1 -or $build[0].exitCode -ne 0 -or $invocation.revision -cne $revision -or @($invocation.reports).Count -ne 1 -or $invocation.reports[0].runId -cne $groupRun -or $invocation.reports[0].exitCode -ne 0 -or -not $invocation.reports[0].sourceUnchanged){throw 'Successful exact terminal native build required'}
 $nativeRun=[string]$validation.runId
 if($nativeRun -notmatch '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'){throw 'Native validation run ID malformed'}
 if(Test-Path -LiteralPath $directory){throw 'Preserve prior producer retention'}
 if(-not $PSCmdlet.ShouldProcess($directory,'Retain original/prior/adapted inspection and preparation producers, parser/analyzer proof before narrow scan')){return}
 $prior=Join-Path $root 'docs/evidence/release15/frozen-c1181eb/client-boundary-producers/InspectWordpairsCompiledClientBoundary-c1181eb.ps1'
 $original=Join-Path $root 'docs/evidence/release15/frozen-c1181eb/client-boundary-producers/InspectWordpairsCompiledClientBoundary-original.ps1'
 if((Get-FileHash -LiteralPath $original).Hash -cne 'B0CC92F1AA3BAFFC8668FA1C4E100C695CF150557421C7003E7399A5C340CAC5' -or (Get-FileHash -LiteralPath $prior).Hash -cne '011A8F4FBB5A4D8CC96C7ACA46B202DF4825991FD1416215CAD5DDCC79959D98'){throw 'Prior inspection producer changed'}
 [void][IO.Directory]::CreateDirectory($directory)
 $originalCopy=Join-Path $directory 'InspectWordpairsCompiledClientBoundary-original.ps1';$priorCopy=Join-Path $directory 'InspectWordpairsCompiledClientBoundary-c1181eb-original.ps1'
 Copy-Item -LiteralPath $original -Destination $originalCopy;Copy-Item -LiteralPath $prior -Destination $priorCopy
 if((Get-FileHash -LiteralPath $originalCopy).Hash -cne (Get-FileHash -LiteralPath $original).Hash -or (Get-FileHash -LiteralPath $priorCopy).Hash -cne (Get-FileHash -LiteralPath $prior).Hash){throw 'Retained original producer mismatch'}
 $text=[IO.File]::ReadAllText($prior)
 foreach($pair in @(@('frozen-c1181eb','frozen-6063acd'),@('c1181eb4eb01825c8b12f3521f92286080addfba',$revision),@('c37a6139-186d-4a40-9136-d0a49e2f52a3',$nativeRun),@('169e6d93-632f-423c-8572-be3cccb96a00',$groupRun),@('ne 353','ne 355'))){if(-not $text.Contains($pair[0],[StringComparison]::Ordinal)){throw 'Exact adaptation anchor absent'};$text=$text.Replace($pair[0],$pair[1])}
 [IO.File]::WriteAllText($adapted,$text)
 $preparationCopy=Join-Path $directory (Split-Path $PSCommandPath -Leaf);Copy-Item -LiteralPath $PSCommandPath -Destination $preparationCopy
 $pins=@(foreach($path in @($originalCopy,$priorCopy,$adapted,$preparationCopy)){$tokens=$null;$parseErrors=$null;[void][Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$parseErrors);$issues=@(Invoke-ScriptAnalyzer -Path $path -Severity Warning,Error);if(@($parseErrors).Count -or $issues.Count){throw 'Retained producer parser/analyzer failed'};[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;parserErrors=0;analyzerIssues=0}})
 $target=Join-Path $directory 'producer-retention.json'
 [pscustomobject]@{recordedAt=[DateTimeOffset]::Now.ToString('o');sessionId='Codex-20261030T194802Z-plugin-session';requestId=$request;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';sourceRevision=$revision;sourceCount=355;nativeRunId=$nativeRun;producerGroupRunId=$groupRun;build=$build[0];fullValidationSha256=(Get-FileHash -LiteralPath $validationPath).Hash;fullInvocationSha256=(Get-FileHash -LiteralPath $invocationPath).Hash;producerPins=$pins;originalsRetained=$true;adaptation='Only exact frozen directory/revision/355 denominator, native/group run IDs and corresponding retained original pointer changed from prior retained producer. Existing literal/symbol/relative graph and fail-closed build timestamp/stability assertions unchanged.';qualification='Producer retention before scan only. No build/test/model/provider or broad secret/hosted/HV acceptance.'}|ConvertTo-Json -Depth 20|Set-Content -LiteralPath $target
 [pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;producerPins=$pins}|ConvertTo-Json -Depth 10
 return
}
if($Operation -eq 'Scan'){
 & $adapted -RequestId $request -WhatIf:$WhatIfPreference
 return
}
$receiptPath=Join-Path $evidence 'client-boundary.json';$receipt=Get-Content -LiteralPath $receiptPath -Raw|ConvertFrom-Json -Depth 100
$retentionPath=Join-Path $directory 'producer-retention.json';$retention=Get-Content -LiteralPath $retentionPath -Raw|ConvertFrom-Json -Depth 100
foreach($pin in $retention.producerPins){if((Get-FileHash -LiteralPath $pin.path).Hash -cne $pin.sha256){throw 'Retained producer changed'}}
if((Get-FileHash -LiteralPath $receipt.inspectionProducer.path).Hash -cne $receipt.inspectionProducer.sha256 -or (Get-FileHash -LiteralPath $receipt.sourceBinding.inventory).Hash -cne $receipt.sourceBinding.inventorySha256){throw 'Inspection producer/manifest changed'}
$source=Get-Content -LiteralPath $receipt.sourceBinding.inventory -Raw|ConvertFrom-Json -Depth 100
foreach($pin in $source.sourceHashes){if((Get-FileHash -LiteralPath (Join-Path $root $pin.path)).Hash -cne $pin.sha256){throw 'Source pin changed after scan'}}
foreach($pin in $receipt.inventory){if((Get-FileHash -LiteralPath (Join-Path $root $pin.path)).Hash -cne $pin.sha256){throw 'Asset changed after scan'}}
$validation=Get-Content -LiteralPath $receipt.buildBinding.validation -Raw|ConvertFrom-Json -Depth 100
$counts=@(foreach($name in @('unit','postgres','browser')){
 $step=@($validation.steps|Where-Object name -CEQ $name);if($step.Count -ne 1 -or $step[0].exitCode -ne 0){throw 'Native full step missing/nonzero'}
 $native=Join-Path $evidence ('full/'+$step[0].junit);if((Get-FileHash -LiteralPath $native).Hash -cne $step[0].junitSha256){throw 'Native report hash differs'}
 $settings=[Xml.XmlReaderSettings]::new();$settings.DtdProcessing=[Xml.DtdProcessing]::Prohibit;$reader=[Xml.XmlReader]::Create($native,$settings)
 try{$xml=[Xml.XmlDocument]::new();$xml.Load($reader)}finally{$reader.Dispose()}
 [pscustomobject]@{name=$name;cases=@($xml.SelectNodes('//testcase')).Count;failed=@($xml.SelectNodes('//testcase[failure or error]')).Count;skipped=@($xml.SelectNodes('//testcase[skipped]')).Count;path=$native;sha256=$step[0].junitSha256}
})
$target=Join-Path $evidence 'client-boundary-readback.json'
if(-not $PSCmdlet.ShouldProcess($target,'Retain safe asset/source/native count and producer hash readback without new execution')){return}
if(Test-Path -LiteralPath $target){throw 'Preserve prior readback'}
[pscustomobject]@{recordedAt=[DateTimeOffset]::Now.ToString('o');sessionId='Codex-20261030T194802Z-plugin-session';requestId=$request;receipt=@{path=$receiptPath;sha256=(Get-FileHash -LiteralPath $receiptPath).Hash};producerRetention=@{path=$retentionPath;sha256=(Get-FileHash -LiteralPath $retentionPath).Hash};revision=$receipt.revision;assetCount=$receipt.assetCount;totalBytes=$receipt.totalBytes;stableDuringScan=$receipt.stableDuringScan;knownValueLiteralMatches=$receipt.knownValueLiteralMatchCount;privateSymbolMatches=$receipt.privateSymbolMatchCount;checkedSourceFiles=$receipt.sourceBinding.checkedSourceFiles;allPinsMatch=$receipt.sourceBinding.allPinsMatch;build=$receipt.buildBinding.buildStep;groupRunId=$receipt.buildBinding.producerGroupRunId;clientEntrypoints=@($receipt.clientSourceGraph.entrypoints).Count;reachable=$receipt.clientSourceGraph.reachableCount;privateReachable=@($receipt.clientSourceGraph.privateModulesReachable).Count;unresolvedRelativeImports=@($receipt.clientSourceGraph.unresolvedRelativeImports).Count;dynamicImports=@($receipt.clientSourceGraph.dynamicImportFiles).Count;nativeCounts=$counts;limitations=$receipt.limitations;qualification=$receipt.qualification}|ConvertTo-Json -Depth 20|Set-Content -LiteralPath $target
[pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;receiptSha256=(Get-FileHash -LiteralPath $receiptPath).Hash;nativeCounts=$counts;assetCount=$receipt.assetCount;bytes=$receipt.totalBytes;sourcePins=$receipt.sourceBinding.checkedSourceFiles;clientEntrypoints=@($receipt.clientSourceGraph.entrypoints).Count;reachable=$receipt.clientSourceGraph.reachableCount;knownLiteralMatches=$receipt.knownValueLiteralMatchCount;privateSymbolMatches=$receipt.privateSymbolMatchCount}|ConvertTo-Json -Depth 10
