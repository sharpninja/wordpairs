#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('mock','real')][string]$Binding='mock')
$ErrorActionPreference='Stop'
$repo='<repo>'
$directory=Join-Path $repo ('docs/evidence/release15/readiness-barrier/'+$Binding+'-'+(Get-Date -Format yyyyMMddTHHmmss))
$helper=Join-Path $repo 'tests/browser/readiness-barrier.ts'
if($Binding -eq 'mock' -and (Test-Path -LiteralPath $helper)){throw 'Mock readiness gate must precede helper implementation'}
if(-not $PSCmdlet.ShouldProcess($directory,'Run same readiness oracle with independent correct and wrong providers; retain native reports and source chronology')){return}
[void](New-Item -ItemType Directory -Path $directory)
$xml=Join-Path $directory 'unit.xml'
$log=Join-Path $directory 'unit.log'
$arguments=@('exec','vitest','--','run','tests/browser/readiness-barrier.test.ts','--maxWorkers=4','--reporter=default','--reporter=junit',('--outputFile.junit='+$xml))
$before=$env:WORDPAIRS_READINESS_BINDING
$env:WORDPAIRS_READINESS_BINDING=$Binding
$started=Get-Date -Format s
Push-Location $repo
try{& npm @arguments *> $log;$exit=$LASTEXITCODE}finally{Pop-Location;$env:WORDPAIRS_READINESS_BINDING=$before}
Get-Content -LiteralPath $log|Select-Object -Last 15
[xml]$native=Get-Content -LiteralPath $xml -Raw
$cases=@($native.SelectNodes('//testcase'))
$failed=@($cases|Where-Object {$_.SelectSingleNode('failure|error')}).Count
$skipped=@($cases|Where-Object {$_.SelectSingleNode('skipped')}).Count
$sourcePins=@(foreach($name in @('readiness-barrier.contract.ts','readiness-barrier.test.ts','readiness-barrier.ts')){
 $path=Join-Path $repo "tests/browser/$name"
 if(Test-Path -LiteralPath $path){
  $copy=Join-Path $directory $name
  Copy-Item -LiteralPath $path -Destination $copy
  $hash=(Get-FileHash -LiteralPath $path).Hash
  if((Get-FileHash -LiteralPath $copy).Hash -cne $hash){throw 'Retained source copy differs'}
  [pscustomobject]@{path=$path;sha256=$hash;retainedCopy=$copy}
 }
})
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $directory 'producer.ps1')
$producerHash=(Get-FileHash -LiteralPath $PSCommandPath).Hash
if((Get-FileHash -LiteralPath (Join-Path $directory 'producer.ps1')).Hash -cne $producerHash){throw 'Retained gate producer differs'}
$receipt=[pscustomobject]@{startedAt=$started;finishedAt=(Get-Date -Format s);binding=$Binding;revision=(& git -C $repo rev-parse HEAD).Trim();dirtyTestSource=$true;hostName=[Environment]::MachineName;executable='npm';arguments=$arguments;exitCode=$exit;cases=$cases.Count;failed=$failed;skipped=$skipped;positiveCases=9;expectedNegativeControls=9;actualNegativeControls=@($cases|Where-Object name -Like '*rejects independent wrong*').Count;helperAbsent= -not(Test-Path -LiteralPath $helper);sourcePins=$sourcePins;producerSha256=$producerHash;junit=$xml;junitSha256=(Get-FileHash -LiteralPath $xml).Hash;qualification='Expected negative controls are passing rejection checks inside the suite. Test-only callback coordination evidence, not actual browser/transport/full-game acceptance.'}
$receipt|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $directory 'receipt.json')
$receipt|ConvertTo-Json -Depth 8
if($exit -or $cases.Count -ne 18 -or $failed -or $skipped -or $receipt.actualNegativeControls -ne 9){throw 'Readiness gate failed; chronological evidence retained'}
