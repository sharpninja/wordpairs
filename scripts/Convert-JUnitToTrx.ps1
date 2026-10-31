#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$InputPath,
    [Parameter(Mandatory)][string]$OutputPath,
    [Parameter(Mandatory)][string]$SourceRevision,
    [string]$HostName = [Environment]::MachineName
)
$ErrorActionPreference = 'Stop'
$inputFile = (Resolve-Path -LiteralPath $InputPath).Path
[xml]$junit = [IO.File]::ReadAllText($inputFile)
$cases = @($junit.SelectNodes('//testcase'))
if ($cases.Count -eq 0) { throw 'JUnit contains no individual testcase records' }
$namespace = 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010'
$trx = [xml]::new()
$run = $trx.CreateElement('TestRun', $namespace)
$null = $trx.AppendChild($run)
$run.SetAttribute('id', [guid]::NewGuid().ToString())
$run.SetAttribute('name', 'JUnit adapter: ' + [IO.Path]::GetFileName($inputFile))
$run.SetAttribute('runUser', [Environment]::UserName)
$append = {
    param([Xml.XmlNode]$Parent, [string]$Name, [hashtable]$Attributes)
    $element = $trx.CreateElement($Name, $namespace)
    foreach ($key in $Attributes.Keys) { $element.SetAttribute($key, [string]$Attributes[$key]) }
    $null = $Parent.AppendChild($element)
    return $element
}
$converted = [DateTimeOffset]::Now.ToString('o')
$times = & $append $run 'Times' @{creation=$converted;queuing=$converted;start=$converted;finish=$converted}
$null = $times
$results = & $append $run 'Results' @{}
$definitions = & $append $run 'TestDefinitions' @{}
$entries = & $append $run 'TestEntries' @{}
$listId = '8c43106b-9dc1-4907-a29f-aa66a61bf5b6'
$lists = & $append $run 'TestLists' @{}
$null = & $append $lists 'TestList' @{name='JUnit cases';id=$listId}
$passed = 0
$failed = 0
$skipped = 0
$index = 0
foreach ($case in $cases) {
    $index++
    $name = [string]$case.GetAttribute('name')
    $className = [string]$case.GetAttribute('classname')
    $digest = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes("$className|$name|$index")))
    $testId = [guid]::ParseExact($digest.Substring(0,32), 'N').ToString()
    $executionId = [guid]::NewGuid().ToString()
    $problem = $case.SelectSingleNode('failure|error')
    $ignored = $case.SelectSingleNode('skipped')
    $outcome = if ($problem) { $failed++; 'Failed' } elseif ($ignored) { $skipped++; 'NotExecuted' } else { $passed++; 'Passed' }
    $seconds = 0.0
    $rawDuration = $case.GetAttribute('time')
    if ($rawDuration -and -not [double]::TryParse($rawDuration, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$seconds)) { throw "Invalid testcase duration: $name" }
    $result = & $append $results 'UnitTestResult' @{executionId=$executionId;testId=$testId;testName=($className+' :: '+$name);computerName=$HostName;duration=([TimeSpan]::FromSeconds($seconds).ToString('c'));outcome=$outcome;testType='13cdc9d9-ddb5-4fa4-a97d-d965ccfc6d4b';testListId=$listId;relativeResultsDirectory=$executionId}
    if ($problem) {
        $output = & $append $result 'Output' @{}
        $errorInfo = & $append $output 'ErrorInfo' @{}
        $message = & $append $errorInfo 'Message' @{}
        $message.InnerText = $problem.InnerText
    }
    $definition = & $append $definitions 'UnitTest' @{name=$name;storage=$className;id=$testId}
    $null = & $append $definition 'Execution' @{id=$executionId}
    $null = & $append $definition 'TestMethod' @{codeBase=$className;adapterTypeName='JUnit-to-TRX explicit result adapter';className=$className;name=$name}
    $null = & $append $entries 'TestEntry' @{testId=$testId;executionId=$executionId;testListId=$listId}
}
$summary = & $append $run 'ResultSummary' @{outcome=$(if($failed){'Failed'}else{'Completed'})}
$null = & $append $summary 'Counters' @{total=$cases.Count;executed=($passed+$failed);passed=$passed;failed=$failed;error=0;timeout=0;aborted=0;inconclusive=0;passedButRunAborted=0;notRunnable=0;notExecuted=$skipped;disconnected=0;completed=($passed+$failed);inProgress=0;pending=0}
$runInfos = & $append $summary 'RunInfos' @{}
$info = & $append $runInfos 'RunInfo' @{computerName=$HostName;outcome='Completed';timestamp=$converted}
$text = & $append $info 'Text' @{}
$text.InnerText = 'Adapted individual JUnit names, outcomes and reported durations. TRX Times are conversion timestamps, not invented original execution intervals. Source=' + $inputFile + '; SHA256=' + (Get-FileHash $inputFile -Algorithm SHA256).Hash + '; reviewed revision=' + $SourceRevision
$outputFile = [IO.Path]::GetFullPath($OutputPath)
if ($PSCmdlet.ShouldProcess($outputFile, 'Write TRX with exact JUnit case outcomes')) {
    $null = [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($outputFile))
    $trx.Save($outputFile)
    [xml]$check = [IO.File]::ReadAllText($outputFile)
    $manager = [Xml.XmlNamespaceManager]::new($check.NameTable)
    $manager.AddNamespace('t',$namespace)
    if ($check.SelectNodes('//t:UnitTestResult',$manager).Count -ne $cases.Count) { throw 'TRX readback case-count mismatch' }
}
[pscustomobject]@{source=$inputFile;output=$outputFile;total=$cases.Count;passed=$passed;failed=$failed;skipped=$skipped;revision=$SourceRevision;whatIf=[bool]$WhatIfPreference} | ConvertTo-Json -Compress
