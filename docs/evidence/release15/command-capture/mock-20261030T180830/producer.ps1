#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('mock','real')][string]$Binding='mock')
$ErrorActionPreference='Stop'
$repo='<repo>'
$helper=Join-Path $repo 'tests/browser/ui-command-capture.ts'
if($Binding -eq 'mock' -and (Test-Path -LiteralPath $helper)){throw 'Mock gate must precede capture helper implementation'}
$dir=Join-Path $repo ('docs/evidence/release15/command-capture/'+$Binding+'-'+(Get-Date -Format yyyyMMddTHHmmss))
if(-not $PSCmdlet.ShouldProcess($dir,'Run focused same-oracle isolated command capture suite; retain source copies and native evidence')){return}
[void](New-Item -ItemType Directory -Path $dir)
$xml=Join-Path $dir 'unit.xml'
$log=Join-Path $dir 'unit.log'
$arguments=@('exec','vitest','--','run','tests/browser/ui-command-capture.test.ts','--maxWorkers=4','--reporter=default','--reporter=junit',('--outputFile.junit='+$xml))
$previous=$env:WORDPAIRS_COMMAND_CAPTURE_BINDING
$env:WORDPAIRS_COMMAND_CAPTURE_BINDING=$Binding
$started=Get-Date -Format s
Push-Location $repo
try{& npm @arguments *> $log;$exit=$LASTEXITCODE}finally{Pop-Location;$env:WORDPAIRS_COMMAND_CAPTURE_BINDING=$previous}
Get-Content -LiteralPath $log|Select-Object -Last 35
[xml]$native=Get-Content -LiteralPath $xml -Raw
$cases=@($native.SelectNodes('//testcase'))
$failed=@($cases|Where-Object {$_.SelectSingleNode('failure|error')}).Count
$skipped=@($cases|Where-Object {$_.SelectSingleNode('skipped')}).Count
$pins=@(foreach($name in @('ui-command-capture.contract.ts','ui-command-capture.test.ts','ui-command-capture.ts')){
 $path=Join-Path $repo "tests/browser/$name"
 if(Test-Path -LiteralPath $path){$copy=Join-Path $dir $name;Copy-Item -LiteralPath $path -Destination $copy;$hash=(Get-FileHash -LiteralPath $path).Hash;if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Retained oracle/helper copy mismatch'};[pscustomobject]@{path=$path;sha256=$hash;copy=$copy}}
})
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $dir 'producer.ps1')
$producerHash=(Get-FileHash -LiteralPath $PSCommandPath).Hash
if((Get-FileHash -LiteralPath (Join-Path $dir 'producer.ps1')).Hash -cne $producerHash){throw 'Retained producer differs'}
$negative=@($cases|Where-Object name -Like '*rejects wrong*').Count
[ordered]@{startedAt=$started;finishedAt=(Get-Date -Format s);binding=$Binding;revision=(& git -C $repo rev-parse HEAD).Trim();dirtyTestSource=$true;hostName=[Environment]::MachineName;executable='npm';arguments=$arguments;exitCode=$exit;cases=$cases.Count;failed=$failed;skipped=$skipped;positiveCases=28;negativeControls=$negative;helperAbsent=(-not(Test-Path -LiteralPath $helper));sourcePins=$pins;producerSha256=$producerHash;junit=$xml;junitSha256=(Get-FileHash -LiteralPath $xml).Hash;qualification='Expected negatives are passing rejection checks within the same oracle; test-only isolated callback/response lifetime and canonical UI retry evidence, not an actual UI/full-game/transport acceptance run.'}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $dir 'receipt.json')
Get-Content -LiteralPath (Join-Path $dir 'receipt.json') -Raw
if($exit -or $cases.Count -ne 56 -or $failed -or $skipped -or $negative -ne 28){throw 'Capture gate failed; retain chronology and fix oracle/provider before implementation'}
