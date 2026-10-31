#Requires -Version 7.0
[CmdletBinding()]
param([ValidateSet('Index','Prior','Diff')][string]$Mode='Index')
$ErrorActionPreference='Stop'
$repo='<repo>'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-6063acd'
switch($Mode){
 'Index'{
  Get-ChildItem -LiteralPath $folder -File|Select-Object Name,Length
  foreach($name in @('source-inventory.json','expected-inventory.json')){$v=Get-Content -LiteralPath (Join-Path $folder $name) -Raw|ConvertFrom-Json;[pscustomobject]@{path=$name;fields=@($v.PSObject.Properties.Name);revision=$v.revision;count=$v.manifestCount;expectedCount=$v.expectedCount;runId=$v.runId;expectedUnit=$v.expectedUnitCount;expectedPostgres=$v.expectedPostgresCount;expectedBrowser=$v.expectedBrowserCount}|ConvertTo-Json}
  $prior=Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/frozen-c1181eb/source-what-if-supplement.json') -Raw|ConvertFrom-Json
  [pscustomobject]@{priorFields=@($prior.PSObject.Properties.Name);recordCount=@($prior.records).Count;criteria=@($prior.records.criteria).Count;failures=$prior.failures;unknowns=$prior.unknowns;mapping=$prior.mapping;wiki=$prior.wikiPublicationBoundary}|ConvertTo-Json -Depth 10
 }
 'Prior'{
  Get-Content -LiteralPath (Join-Path $repo 'docs/evidence/release15/frozen-c1181eb/source-selfreview.md') -Raw
  & rg -n 'exception|waiver|mock.gate|98|hostile|15|pending|scope' (Join-Path $repo 'docs/admin_pwa_release.md') (Join-Path $repo 'docs/release15_completion.md') (Join-Path $repo 'docs/implementation_plan.md')
 }
 'Diff'{
  & git -C $repo diff c1181eb4eb01825c8b12f3521f92286080addfba 6063acd9d6869fd71a33f75ee5c940c736c99124 -- tests/browser
 }
}
Get-Date -Format s
