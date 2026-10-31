BeforeAll {
    $repo=Split-Path (Split-Path $PSScriptRoot)
    Import-Module (Join-Path $repo 'scripts/CurrentReleaseDocs.psm1') -Force
}
Describe 'Current release document inventory' {
    It 'checks the current operations and plan documents' {
        $documents=@{}
        foreach($name in @('docs/moderation_plan.md','docs/implementation_plan.md','docs/hosting_execution.md','docs/local_development.md','docs/deployment_plan.md','README.md')){
            $documents[$name]=Get-Content (Join-Path $repo $name) -Raw
        }
        @(Get-CurrentReleaseDocProblem $documents).Count | Should -Be 0
    }
}
