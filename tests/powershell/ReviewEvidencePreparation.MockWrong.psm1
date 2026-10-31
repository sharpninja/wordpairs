function Get-ReviewPreparationProblem {
    [CmdletBinding()]
    param($Inventory,$Revision,$SourceHashes,$ExpectedCounts,$Reports)
    $null=@($Inventory,$Revision,$SourceHashes,$ExpectedCounts,$Reports)
}
function Get-ReviewSupplementalProblem {
    [CmdletBinding()]
    param($Reports,[int]$ExpectedRealtimeCount)
    $null=@($Reports,$ExpectedRealtimeCount)
}
Export-ModuleMember -Function Get-ReviewPreparationProblem,Get-ReviewSupplementalProblem
