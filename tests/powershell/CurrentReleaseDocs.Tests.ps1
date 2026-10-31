BeforeAll {
    $repo=Split-Path (Split-Path $PSScriptRoot)
    $module=if($env:WORDPAIRS_DOCS_CHECK_MODULE){$env:WORDPAIRS_DOCS_CHECK_MODULE}else{Join-Path $repo 'scripts/CurrentReleaseDocs.psm1'}
    Import-Module $module -Force
}
Describe 'Current release documentation drift' {
    It 'accepts a current release reference' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md for the current owner-only release.'}).Count | Should -Be 0
    }
    It 'rejects a missing current release reference' {
        @(Get-CurrentReleaseDocProblem @{fixture='An unrelated historical plan.'}).Count | Should -Be 1
    }
    It 'rejects a superseded administrator bootstrap instruction' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Set `WORDPAIRS_ADMIN_PROFILE_IDS` to that ID.'}).Count | Should -Be 1
    }
    It 'rejects a superseded public installation instruction' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Installed launches use `/play`.'}).Count | Should -Be 1
    }
    It 'rejects a superseded OpenAI setup instruction' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. After OpenAI issues the registration, set the client ID.'}).Count | Should -Be 1
    }
    It 'rejects a reworded profile bootstrap without markdown quoting' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Configure WORDPAIRS_ADMIN_PROFILE_IDS to grant access.'}).Count | Should -Be 1
    }
    It 'rejects a reworded grant instruction' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Manage grants using /admin/users.'}).Count | Should -Be 1
    }
    It 'rejects a root manifest instruction' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Serve /manifest.webmanifest for the public game.'}).Count | Should -Be 1
    }
    It 'rejects a reworded public installation instruction' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Install the public game using Add to Home Screen.'}).Count | Should -Be 1
    }
    It 'accepts a locally qualified historical instruction' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Historical: configure WORDPAIRS_ADMIN_PROFILE_IDS for bootstrap.'}).Count | Should -Be 0
    }
    It 'rejects a bootstrap instruction after an unrelated negative sentence' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. No network setup is needed. Configure WORDPAIRS_ADMIN_PROFILE_IDS to grant administrator rights.'}).Count | Should -Be 1
    }
    It 'rejects an instruction after an unrelated historical sentence' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Historical: the server used PostgreSQL. Configure WORDPAIRS_ADMIN_PROFILE_IDS to grant administrator rights.'}).Count | Should -Be 1
    }
    It 'rejects a reworded OpenAI login instruction' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Configure OpenAI login for every player.'}).Count | Should -Be 1
    }
    It 'rejects a reworded phone installation instruction' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Install Wordpairs on your phone from the public game page.'}).Count | Should -Be 1
    }
    It 'rejects an unsafe instruction under an actual document name' {
        @(Get-CurrentReleaseDocProblem @{'README.md'='See admin_pwa_release.md. Configure WORDPAIRS_ADMIN_PROFILE_IDS to grant administrator rights.'}).Count | Should -Be 1
    }
    It 'rejects an empty document inventory' {
        @(Get-CurrentReleaseDocProblem @{}).Count | Should -Be 1
    }
    It 'accepts admin-only installation' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Install the administrator app from /admin.'}).Count | Should -Be 0
    }
    It 'accepts a sentence explicitly marked historically' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Historically, website sign-in required an issued OpenAI OIDC client registration.'}).Count | Should -Be 0
    }
    It 'rejects unrelated negation within the same sentence' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. No network setup is needed, configure WORDPAIRS_ADMIN_PROFILE_IDS for administrator rights.'}).Count | Should -Be 1
    }
    It 'rejects unrelated historical wording within the same sentence' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Review the historical migration and configure WORDPAIRS_ADMIN_PROFILE_IDS for administrator rights.'}).Count | Should -Be 1
    }
    It 'accepts an explicit instruction not to use the legacy setting' {
        @(Get-CurrentReleaseDocProblem @{fixture='See admin_pwa_release.md. Do not configure WORDPAIRS_ADMIN_PROFILE_IDS for administrator rights.'}).Count | Should -Be 0
    }
}
