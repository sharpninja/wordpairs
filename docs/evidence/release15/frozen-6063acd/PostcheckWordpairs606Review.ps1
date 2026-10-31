#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$folder=Join-Path $repo 'docs/evidence/release15/frozen-6063acd'
$supplement=Get-Content -LiteralPath (Join-Path $folder 'source-what-if-supplement.json') -Raw|ConvertFrom-Json
$wikiPins=@(foreach($pin in @($supplement.historical.wiki.historicalIndex,$supplement.historical.wiki.rawExport)){
 $actual=(Get-FileHash -LiteralPath $pin.path).Hash
 if($actual -cne $pin.sha256){throw 'Historical wiki evidence changed; do not claim unchanged export'}
 [ordered]@{path=$pin.path;sha256=$actual;matchesHistoricalPin=$true;qualification='Only retained local bytes, not new remote publication or gameplay acceptance'}
})
$inventory=Get-Content -LiteralPath (Join-Path $folder 'unit-inventory.json') -Raw|ConvertFrom-Json
$inventoryFields=@($inventory.PSObject.Properties.Name)
if(-not $PSCmdlet.ShouldProcess($folder,'Retain safe source-review logger/inspection/verification producers and postcheck')){return}
$copies=@(foreach($source in @($PSCommandPath,'/tmp/Wordpairs606SourceReviewSession.ps1','/tmp/InspectWordpairs606Review.ps1')){
 $target=Join-Path $folder ([IO.Path]::GetFileName($source));if(Test-Path -LiteralPath $target){throw 'Retain existing review producer'}
 Copy-Item -LiteralPath $source -Destination $target
 $hash=(Get-FileHash -LiteralPath $source).Hash;if((Get-FileHash -LiteralPath $target).Hash -cne $hash){throw 'Review producer copy mismatch'}
 [ordered]@{path=$target;sha256=$hash}
})
$pins=@(foreach($name in @('source-selfreview.md','source-what-if-supplement.json','source-selfreview-provenance.json','source-selfreview-producer.ps1','source-selfreview-effective-requirements.json','unit-inventory.json','expected-inventory.json')){$p=Join-Path $folder $name;[ordered]@{path=$p;sha256=(Get-FileHash -LiteralPath $p).Hash}})
[ordered]@{atLocal=(Get-Date -Format s);sourceHead=$supplement.sourceHead;wikiRetainedByteChecks=$wikiPins;producerCopies=$copies;producerAnalysis='All three producers parser/PSSA Warning/Error0 before WhatIf then actual';reviewPins=$pins;unitInventoryFields=$inventoryFields;qualification='Collection inventory pinned; expected894 is not a full execution claim. Original review outputs and source/native bytes are retained unchanged.'}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $folder 'source-selfreview-postcheck.json')
[ordered]@{atLocal=(Get-Date -Format s);path=(Join-Path $folder 'source-selfreview-postcheck.json');sha256=(Get-FileHash -LiteralPath (Join-Path $folder 'source-selfreview-postcheck.json')).Hash;unitInventoryFields=$inventoryFields}|ConvertTo-Json
