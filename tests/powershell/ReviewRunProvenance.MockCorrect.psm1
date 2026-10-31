function Get-ReviewRunProblem {
    param($Run,$ExpectedRunId,$ExpectedRevision,$ActualJUnitSha256,$Receipt,$ActualReceiptSha256)
    $null=$ExpectedRunId,$ExpectedRevision,$ActualJUnitSha256,$Receipt,$ActualReceiptSha256
    if($Run.case -in @('valid','aggregate')){return}
    if($Run.case -in @('run','revision','exit','junit','parent','producer','receipt')){return 'fixture rejected'}
    throw 'Unexpected provenance fixture'
}
Export-ModuleMember -Function Get-ReviewRunProblem
