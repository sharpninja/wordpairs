#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('mock','real')][string]$Binding='mock')
$ErrorActionPreference='Stop'
$repo='<repo>'
$baseline=@{
 'tests/browser/ui-command-acknowledgement.ts'='125004BFA5151C3255DFB3F6BBB0AEBBC529019563735FEC64216AD5079533C5'
 'tests/browser/ui-command-capture.ts'='928C7E1B756BA5EA96904FE6DB2CD06A373C509F12C3933052AC52155127CD32'
 'tests/browser/live-player-counts.integration.spec.ts'='667FF04BD035A3D5D243D0A20C19AA02EA703AE704AC0D417A04512F38C01025'
 'tests/browser/live-multiplayer.integration.spec.ts'='E3183F6EFB1D61F3FBCEF8965D8F830EE960151FBF66B921289AB82827E46DE8'
 'tests/browser/ui-command-acknowledgement.contract.ts'='655E425F129BD831325D475A745196DB9E772F1364A23B75FD5286E4433D9553'
}
if($Binding -eq 'mock'){foreach($key in $baseline.Keys){if((Get-FileHash -LiteralPath (Join-Path $repo $key)).Hash -cne $baseline[$key]){throw 'Mock gate must precede actual retirement helper/adaptor delta'}}}
$dir=Join-Path $repo ('docs/evidence/release15/conflict-retirement/'+$Binding+'-'+(Get-Date -Format yyyyMMddTHHmmss))
if(-not $PSCmdlet.ShouldProcess($dir,'Run focused SAME retirement oracle plus unchanged124 prior cases; retain native and source copies')){return}
[void](New-Item -ItemType Directory -Path $dir)
$xml=Join-Path $dir 'unit.xml';$log=Join-Path $dir 'unit.log'
$arguments=@('exec','vitest','--','run','tests/browser/ui-command-retirement.test.ts','tests/browser/ui-command-acknowledgement.test.ts','tests/browser/ui-command-capture.test.ts','--maxWorkers=4','--reporter=default','--reporter=junit',('--outputFile.junit='+$xml))
$priorAck=$env:WORDPAIRS_UI_ACK_BINDING;$priorRetire=$env:WORDPAIRS_UI_RETIREMENT_BINDING
$env:WORDPAIRS_UI_ACK_BINDING=$Binding;$env:WORDPAIRS_UI_RETIREMENT_BINDING=$Binding
$started=Get-Date -Format s
Push-Location $repo
try{& npm @arguments *> $log;$exit=$LASTEXITCODE}finally{Pop-Location;$env:WORDPAIRS_UI_ACK_BINDING=$priorAck;$env:WORDPAIRS_UI_RETIREMENT_BINDING=$priorRetire}
Get-Content -LiteralPath $log|Select-Object -Last 55
[xml]$native=Get-Content -LiteralPath $xml -Raw
$cases=@($native.SelectNodes('//testcase'));$failed=@($cases|Where-Object {$_.SelectSingleNode('failure|error')}).Count;$skipped=@($cases|Where-Object {$_.SelectSingleNode('skipped')}).Count
$pins=@(foreach($name in @('ui-command-retirement.contract.ts','ui-command-retirement.test.ts','ui-command-acknowledgement.contract.ts','ui-command-acknowledgement.test.ts','ui-command-acknowledgement.ts','ui-command-capture.contract.ts','ui-command-capture.test.ts','ui-command-capture.ts','live-player-counts.integration.spec.ts','live-multiplayer.integration.spec.ts')){
 $path=Join-Path $repo "tests/browser/$name";$copy=Join-Path $dir $name;Copy-Item -LiteralPath $path -Destination $copy;$hash=(Get-FileHash -LiteralPath $path).Hash
 if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Retained source copy mismatch'}
 [pscustomobject]@{path=$path;sha256=$hash;copy=$copy}
})
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $dir 'producer.ps1')
$producer=(Get-FileHash -LiteralPath $PSCommandPath).Hash
if((Get-FileHash -LiteralPath (Join-Path $dir 'producer.ps1')).Hash -cne $producer){throw 'Retained producer differs'}
$negative=@($cases|Where-Object name -Like '*rejects wrong*').Count
[ordered]@{startedAt=$started;finishedAt=(Get-Date -Format s);binding=$Binding;revision=(& git -C $repo rev-parse HEAD).Trim();dirtyTestSource=$true;hostName=[Environment]::MachineName;executable='npm';arguments=$arguments;exitCode=$exit;cases=$cases.Count;failed=$failed;skipped=$skipped;newPositive=19;newExpectedNegative=19;priorCases=124;negativeControls=$negative;sourcePins=$pins;producerSha256=$producer;junit=$xml;junitSha256=(Get-FileHash -LiteralPath $xml).Hash;qualification='Isolated SAME wait/classifier/coordinator oracle, not actual DOM/network/runtime capacity. Original124 cases retained; existing contract type changes, if any, are separately disclosed.'}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $dir 'receipt.json')
Get-Content -LiteralPath (Join-Path $dir 'receipt.json') -Raw
if($exit -or $cases.Count -ne 162 -or $failed -or $skipped -or $negative -ne 81){throw 'Retirement gate failed; preserve all chronological receipts'}
