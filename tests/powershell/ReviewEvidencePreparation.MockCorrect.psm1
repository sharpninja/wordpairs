function Get-ReviewPreparationProblem {
    [CmdletBinding()]
    param($Inventory,$Revision,$SourceHashes,$ExpectedCounts,$Reports)
    if($Inventory.revision -ne $Revision -or -not $Inventory.pathSetEqual){'Unbound inventory'}
    $recorded=@($Inventory.sourceHashes)
    if($recorded.Count -ne $Inventory.expectedCount -or $recorded.Count -ne $Inventory.manifestCount -or $recorded.Count -ne @($SourceHashes).Count -or $recorded.Count -eq 0){'Wrong path inventory'}
    foreach($entry in $SourceHashes){$matchingEntries=@($recorded|Where-Object { $_.path -ceq $entry.path -and $_.sha256 -ceq $entry.sha256 });if($matchingEntries.Count -ne 1){'Wrong bytes'}}
    foreach($name in @('unit','postgres','browser')){
        $expected=$ExpectedCounts[$name]
        if(($expected -isnot [int] -and $expected -isnot [long]) -or $expected -le 0){'Invalid expectation'}
        $found=@($Reports|Where-Object name -EQ $name)
        if($found.Count -ne 1){'Wrong report inventory';continue}
        if($found[0].cases -ne $expected -or $found[0].failed -ne 0 -or $found[0].skipped -ne 0){'Wrong outcome'}
    }
}
function Get-ReviewSupplementalProblem {
    [CmdletBinding()]
    param($Reports,[int]$ExpectedRealtimeCount)
    foreach($kind in @('realtime','live-ui','strict-ui')){
        $found=@($Reports|Where-Object kind -EQ $kind)
        if($found.Count -ne 1){'Missing report';continue}
        $expected=@{realtime=$ExpectedRealtimeCount;'live-ui'=9;'strict-ui'=1}[$kind]
        if($expected -le 0 -or $found[0].cases -ne $expected -or $found[0].failed -ne 0 -or $found[0].skipped -ne 0){'Wrong outcome'}
        if($kind -eq 'live-ui'){
            foreach($playerCount in 2..10){if(@($found[0].caseNames|Where-Object {$_ -ceq "LIVE-SCALE $playerCount real browser players complete eight UI rounds"}).Count -ne 1){'Missing unique player count'}}
        }
        if($kind -eq 'strict-ui' -and ($found[0].caseNames.Count -ne 1 -or $found[0].caseNames[0] -cne 'LIVE real two-player and observer UI: private push, all eight rounds, autonomous deadlines, renewal and reconnect')){'Wrong strict case'}
    }
}
Export-ModuleMember -Function Get-ReviewPreparationProblem,Get-ReviewSupplementalProblem
