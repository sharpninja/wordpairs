function Get-ReviewRunProblem {
    [CmdletBinding()]
    param($Run,[string]$ExpectedRunId,[string]$ExpectedRevision,[string]$ActualJUnitSha256,$Receipt,[string]$ActualReceiptSha256)
    if(-not $Run -or -not $Run.runId -or $Run.runId -cne $ExpectedRunId){'Run ID mismatch'}
    if(-not $Run.revision -or $Run.revision -cne $ExpectedRevision){'Revision mismatch'}
    if($null -eq $Run.exitCode -or $Run.exitCode -ne 0){'Run did not exit successfully'}
    if(-not $Run.junitSha256 -or $Run.junitSha256 -cne $ActualJUnitSha256){'JUnit hash mismatch'}
    if($null -ne $Receipt){
        if($Receipt.parentRunId -cne $ExpectedRunId -or $Receipt.runId -cne $Run.producerRunId){'Producer run linkage mismatch'}
        if(-not $Receipt.producerSha256 -or $Receipt.producerSha256 -cne $Run.producerSha256){'Producer hash mismatch'}
        if(-not $Run.producerReceiptSha256 -or $Run.producerReceiptSha256 -cne $ActualReceiptSha256){'Producer receipt hash mismatch'}
    }
}
Export-ModuleMember -Function Get-ReviewRunProblem
