BeforeAll {
    $repo=Split-Path (Split-Path $PSScriptRoot)
    $module=if($env:WORDPAIRS_PROVENANCE_MODULE){$env:WORDPAIRS_PROVENANCE_MODULE}else{Join-Path $repo 'scripts/ReviewRunProvenance.psm1'}
    Import-Module $module -Force
    function Get-ValidCase {
        @{
            Run=@{case='valid';runId='parent';revision='head';exitCode=0;junitSha256='report';producerRunId='child';producerSha256='producer';producerReceiptSha256='receipt'}
            ExpectedRunId='parent';ExpectedRevision='head';ActualJUnitSha256='report'
            Receipt=@{parentRunId='parent';runId='child';producerSha256='producer'};ActualReceiptSha256='receipt'
        }
    }
}
Describe 'Review evidence provenance' {
    It 'accepts a complete matching chain' { $case=Get-ValidCase; @(Get-ReviewRunProblem @case).Count | Should -Be 0 }
    It 'accepts an aggregate-run report without a producer receipt' { $case=Get-ValidCase;$case.Run.case='aggregate';$case.Receipt=$null;$case.ActualReceiptSha256=''; @(Get-ReviewRunProblem @case).Count | Should -Be 0 }
    It 'rejects a different parent run' { $case=Get-ValidCase;$case.Run.case='run';$case.Run.runId='other'; @(Get-ReviewRunProblem @case).Count | Should -BeGreaterThan 0 }
    It 'rejects a different revision' { $case=Get-ValidCase;$case.Run.case='revision';$case.Run.revision='other'; @(Get-ReviewRunProblem @case).Count | Should -BeGreaterThan 0 }
    It 'rejects a nonzero exit' { $case=Get-ValidCase;$case.Run.case='exit';$case.Run.exitCode=1; @(Get-ReviewRunProblem @case).Count | Should -BeGreaterThan 0 }
    It 'rejects a different JUnit report' { $case=Get-ValidCase;$case.Run.case='junit';$case.ActualJUnitSha256='other'; @(Get-ReviewRunProblem @case).Count | Should -BeGreaterThan 0 }
    It 'rejects an unlinked producer receipt' { $case=Get-ValidCase;$case.Run.case='parent';$case.Receipt.parentRunId='other'; @(Get-ReviewRunProblem @case).Count | Should -BeGreaterThan 0 }
    It 'rejects different producer bytes' { $case=Get-ValidCase;$case.Run.case='producer';$case.Receipt.producerSha256='other'; @(Get-ReviewRunProblem @case).Count | Should -BeGreaterThan 0 }
    It 'rejects a modified producer receipt' { $case=Get-ValidCase;$case.Run.case='receipt';$case.ActualReceiptSha256='other'; @(Get-ReviewRunProblem @case).Count | Should -BeGreaterThan 0 }
}
