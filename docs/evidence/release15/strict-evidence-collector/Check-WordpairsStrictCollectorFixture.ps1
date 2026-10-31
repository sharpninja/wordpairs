#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$producer=Join-Path $repo 'docs/evidence/release15/operational-producers/RunWordpairsRelease15Evidence.ps1'
$folder=Join-Path $repo 'docs/evidence/release15/strict-evidence-collector'
$tokens=$null;$errors=$null;$ast=[Management.Automation.Language.Parser]::ParseFile($producer,[ref]$tokens,[ref]$errors)
$diagnostics=@(Invoke-ScriptAnalyzer -Path $producer -Severity Warning,Error)
if(@($errors).Count -or $diagnostics.Count){throw 'Collector parser/PSSA gate failed'}
$loops=@($ast.FindAll({param($node)$node -is [Management.Automation.Language.ForEachStatementAst] -and $node.Variable.VariablePath.UserPath -ceq 'file'},$true))
$manifests=@($ast.FindAll({param($node)$node -is [Management.Automation.Language.PipelineAst] -and $node.PipelineElements.Count -gt 1 -and $node.Extent.Text -cmatch 'runtime-copy-manifest\.json'},$true))
if($loops.Count -ne 1 -or $manifests.Count -ne 1){throw 'Expected unique actual runtime-copy loop and manifest pipeline'}
$actualCopyBlock=[ScriptBlock]::Create($loops[0].Extent.Text)
$actualManifestBlock=[ScriptBlock]::Create($manifests[0].Extent.Text)
$fixtureRoot=Join-Path '/tmp' ('wordpairs-strict-collector-fixture-'+(Get-Date -Format yyyyMMddTHHmmss)+'-'+[Guid]::NewGuid().ToString('N'))
if(-not $fixtureRoot.StartsWith('/tmp/wordpairs-strict-collector-fixture-',[StringComparison]::Ordinal)){throw 'Owned fixture path guard failed'}
if(-not $PSCmdlet.ShouldProcess($fixtureRoot,'Create owned synthetic files,run only actual collector copy/manifest blocks,and retain fixture receipts')){return}
$root=Join-Path $fixtureRoot 'root'
$inputDirectory=Join-Path $root 'docs/evidence/room-sync'
[void](New-Item -ItemType Directory -Path $inputDirectory -Force)
$startedInstant=[DateTime]::Now;$startedInstant=$startedInstant.AddTicks(-($startedInstant.Ticks%[TimeSpan]::TicksPerMillisecond))
$normalNames=@(foreach($number in 2..15){'live-scale-'+$number+'.json';'live-scale-'+$number+'-failure-ui.json'})
$commonNames=@('live-local-current.json','live-local-boundary.json')
$strictNames=@('live-ui-observations.json','live-ui-failure-ui.json')
$excludedNames=@('live-local-stale.json','live-ui-observations.json.bak','live-ui-observation.json','Live-ui-observations.json','live-ui-failure-ui.json.extra','live-ui-failure.json','runtime.json','input-runtime.json','private-runtime.json','hosting-production-admin.json','live-scale-1.json','live-scale-16.json','live-scale-25.json','live-scale-02.json','live-scale-15.json.bak','live-scale-15-failure-ui.json.bak','live-scale-2-private.json','live-ui-failure-ui.private.json')
$allNames=@($normalNames+$commonNames+$strictNames+$excludedNames)
$originals=@()
foreach($name in $allNames){
 $path=Join-Path $inputDirectory $name
 [ordered]@{fixtureOnly=$true;name=$name;value='synthetic public fixture'} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $path -Encoding utf8NoBOM
 $item=Get-Item -LiteralPath $path
 $item.LastWriteTime=if($name -ceq 'live-local-stale.json'){$startedInstant.AddSeconds(-1)}elseif($name -ceq 'live-local-boundary.json'){$startedInstant}else{$startedInstant.AddSeconds(1)}
 $originals+=[ordered]@{name=$name;path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash}
}
$results=@()
foreach($case in @('normal-fresh','strict-fresh','strict-stale','normal-stale')){
 if($case -ceq 'strict-stale'){foreach($name in $strictNames){(Get-Item -LiteralPath (Join-Path $inputDirectory $name)).LastWriteTime=$startedInstant.AddSeconds(-1)}}
 if($case -ceq 'normal-stale'){foreach($name in $normalNames){(Get-Item -LiteralPath (Join-Path $inputDirectory $name)).LastWriteTime=$startedInstant.AddSeconds(-1)}}
 $Lane=if($case.StartsWith('strict',[StringComparison]::Ordinal)){'strict-ui'}else{'live-ui'}
 $report=Join-Path $fixtureRoot $case;$preserved=Join-Path $report 'runtime-receipts'
 [void](New-Item -ItemType Directory -Path $preserved -Force)
 $runId=[Guid]::NewGuid().ToString('D');$revision='isolated-operational-fixture';$copied=@()
 . $actualCopyBlock
 . $actualManifestBlock
 $manifestPath=Join-Path $report 'runtime-copy-manifest.json'
 $manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -AsHashtable
 if($copied.Count -ne $manifest.files.Count){throw 'Actual copied collection and manifest count differ'}
 $expected=@($commonNames)
 if($case -ceq 'normal-fresh'){$expected+=@($normalNames)}
 if($case -ceq 'strict-fresh'){$expected+=@($strictNames)}
 $observed=@($manifest.files.name | Sort-Object)
 if(($observed -join '|') -cne (@($expected | Sort-Object) -join '|')){throw ('Collector names differ: '+$case)}
 if($manifest.lane -cne $Lane -or $manifest.runId -cne $runId -or $manifest.revision -cne $revision){throw 'Actual manifest context differs'}
 $verified=@()
 foreach($file in $manifest.files){
  $source=Join-Path $inputDirectory $file.name;$destination=Join-Path $preserved $file.name
  if(-not(Test-Path -LiteralPath $source) -or (Get-FileHash -LiteralPath $source).Hash -cne $file.sha256 -or (Get-FileHash -LiteralPath $destination).Hash -cne $file.sha256){throw 'Copied manifest hash/source retention mismatch'}
  $verified+=[ordered]@{name=$file.name;sha256=$file.sha256;sourceRetained=$true;copyVerified=$true}
 }
 $results+=[ordered]@{case=$case;lane=$Lane;expectedCount=$expected.Count;copiedCount=$manifest.files.Count;passed=$true;allCopyHashesVerified=$true;manifestPath=$manifestPath;manifestSha256=(Get-FileHash -LiteralPath $manifestPath).Hash;files=$verified}
}
foreach($original in $originals){if(-not(Test-Path -LiteralPath $original.path) -or (Get-FileHash -LiteralPath $original.path).Hash -cne $original.sha256){throw 'Owned source fixture content changed or disappeared'}}
$current=Get-Content -LiteralPath $producer -Raw
$old=Get-Content -LiteralPath (Join-Path $folder 'RunWordpairsRelease15Evidence.original.ps1') -Raw
$delta=' -or ($Lane -eq ''strict-ui'' -and $_.Name -cin @(''live-ui-observations.json'',''live-ui-failure-ui.json''))'
if($current.Replace($delta,'') -cne $old){throw 'Collector edit exceeds the approved exact predicate addition'}
$receipt=[ordered]@{recordedAt=(Get-Date).ToString('o');classification='Operational collector fixtures only,no app/test/build/model/provider execution';producer=$producer;producerSha256=(Get-FileHash -LiteralPath $producer).Hash;fixtureSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;fixtureRoot=$fixtureRoot;cutoff=$startedInstant.ToString('o');cases=$results;passed=$results.Count;failed=0;copiesVerified=@($results.files).Count;allSourceFixtureFilesRetained=$true;normalNameVariantsCovered=$normalNames.Count;exactStrictNames=$strictNames;excludedNameControls=$excludedNames;exactCutoffCommonFileIncluded=$true;strictStaleExactNamesExcluded=$true;normalStaleNamesExcluded=$true;onlyApprovedPredicateAddition=$true;parserErrors=0;pssaWarningsErrors=0;qualification='Actual AST copy loop and existing manifest pipeline run against owned temporary files only. Original timestamps/lane branches/live-localwildcard and normal2..15regex remain unchanged. No full orchestrator or live lane executed;copies are not game success.'}
$path=Join-Path $folder 'fixture-result.json';if(Test-Path -LiteralPath $path){throw 'Fixture receipt overwrite refused'}
$receipt | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath $path -Encoding utf8NoBOM
[ordered]@{recordedAt=$receipt.recordedAt;producerSha256=$receipt.producerSha256;passed=$receipt.passed;failed=0;copiesVerified=$receipt.copiesVerified;cases=@($results | Select-Object case,lane,expectedCount,copiedCount,passed,allCopyHashesVerified);normalNameVariantsCovered=28;excludedNameControls=$excludedNames.Count;onlyApprovedPredicateAddition=$true;fixtureReceipt=$path;fixtureReceiptSha256=(Get-FileHash -LiteralPath $path).Hash;fixtureRoot=$fixtureRoot} | ConvertTo-Json -Depth 8
