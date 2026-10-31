#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('mock','real')][string]$Binding='mock',[ValidateSet('v1','v2')][string]$Increment='v2')
$ErrorActionPreference='Stop'
$repo='<repo>'
$baseline=@{
 'tests/browser/ui-command-capture.ts'='5805DACBF4589F8843D0CC4BEC63B31D44B7F117716EE13E91F82BD04F2B98BF'
 'tests/browser/live-player-counts.integration.spec.ts'='AD62D7C49E8F7C028EAD5A24885122D8AE733B71E6719D010998706E30C05E22'
 'tests/browser/live-multiplayer.integration.spec.ts'='B012DA05BD981B62A43ADDC79645525EE1EB873BC308F34C6B9B9E228F74821D'
}
if($Binding -eq 'mock'){
 foreach($key in $baseline.Keys){if((Get-FileHash -LiteralPath (Join-Path $repo $key)).Hash -cne $baseline[$key]){throw 'Mock gate must precede helper/live-spec changes'}}
 $ackHelper=Join-Path $repo 'tests/browser/ui-command-acknowledgement.ts'
 if($Increment -eq 'v1' -and (Test-Path -LiteralPath $ackHelper)){throw 'V1 mock gate must precede acknowledgement helper implementation'}
 if($Increment -eq 'v2' -and (Get-FileHash -LiteralPath $ackHelper).Hash -cne '125004BFA5151C3255DFB3F6BBB0AEBBC529019563735FEC64216AD5079533C5'){throw 'V2 mock must retain unchanged V1 classifier; coordinator and both adapters must remain frozen'}
}
$dir=Join-Path $repo ('docs/evidence/release15/ui-acknowledgement/'+$Binding+'-'+$Increment+'-'+(Get-Date -Format yyyyMMddTHHmmss))
if(-not $PSCmdlet.ShouldProcess($dir,'Run focused same-oracle acknowledgement gate and unchanged capture58; retain native evidence and source copies')){return}
[void](New-Item -ItemType Directory -Path $dir)
$xml=Join-Path $dir 'unit.xml'
$log=Join-Path $dir 'unit.log'
$arguments=@('exec','vitest','--','run','tests/browser/ui-command-acknowledgement.test.ts','tests/browser/ui-command-capture.test.ts','--maxWorkers=4','--reporter=default','--reporter=junit',('--outputFile.junit='+$xml))
$previous=$env:WORDPAIRS_UI_ACK_BINDING
$env:WORDPAIRS_UI_ACK_BINDING=$Binding
$started=Get-Date -Format s
Push-Location $repo
try{& npm @arguments *> $log;$exit=$LASTEXITCODE}finally{Pop-Location;$env:WORDPAIRS_UI_ACK_BINDING=$previous}
Get-Content -LiteralPath $log|Select-Object -Last 45
[xml]$native=Get-Content -LiteralPath $xml -Raw
$cases=@($native.SelectNodes('//testcase'))
$failed=@($cases|Where-Object {$_.SelectSingleNode('failure|error')}).Count
$skipped=@($cases|Where-Object {$_.SelectSingleNode('skipped')}).Count
$pins=@(foreach($name in @('ui-command-acknowledgement.contract.ts','ui-command-acknowledgement.test.ts','ui-command-acknowledgement.ts','ui-command-capture.contract.ts','ui-command-capture.test.ts','ui-command-capture.ts','live-player-counts.integration.spec.ts','live-multiplayer.integration.spec.ts')){
 $path=Join-Path $repo "tests/browser/$name"
 if(Test-Path -LiteralPath $path){$copy=Join-Path $dir $name;Copy-Item -LiteralPath $path -Destination $copy;$hash=(Get-FileHash -LiteralPath $path).Hash;if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Retained oracle/helper copy mismatch'};[pscustomobject]@{path=$path;sha256=$hash;copy=$copy}}
})
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $dir 'producer.ps1')
$producerHash=(Get-FileHash -LiteralPath $PSCommandPath).Hash
if((Get-FileHash -LiteralPath (Join-Path $dir 'producer.ps1')).Hash -cne $producerHash){throw 'Retained producer differs'}
$negative=@($cases|Where-Object name -Like '*rejects wrong*').Count
$newCount=if($Increment -eq 'v2'){33}else{30}
[ordered]@{startedAt=$started;finishedAt=(Get-Date -Format s);binding=$Binding;increment=$Increment;revision=(& git -C $repo rev-parse HEAD).Trim();dirtyTestSource=$true;hostName=[Environment]::MachineName;executable='npm';arguments=$arguments;exitCode=$exit;cases=$cases.Count;failed=$failed;skipped=$skipped;expectedNewPositive=$newCount;expectedNewNegative=$newCount;priorCaptureCases=58;negativeControls=$negative;sourcePins=$pins;producerSha256=$producerHash;junit=$xml;junitSha256=(Get-FileHash -LiteralPath $xml).Hash;qualification='Isolated provider/real test-helper evidence, including unchanged58 prior capture cases. V2 adds deferred retirement/rejection and exact Request aggregate-path controls before coordinator/adapters implementation; V1 classifier retained unchanged. No actual UI/full game, latency or transport acceptance is established.'}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $dir 'receipt.json')
Get-Content -LiteralPath (Join-Path $dir 'receipt.json') -Raw
if($exit -or $cases.Count -ne (58+2*$newCount) -or $failed -or $skipped -or $negative -ne (29+$newCount)){throw 'Acknowledgement gate failed; retained chronological receipts must not be overwritten'}
