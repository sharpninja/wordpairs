function Get-CurrentReleaseDocProblem {
    param([hashtable]$Documents)
    if($Documents.Count -eq 0){return [pscustomobject]@{document='';problem='Empty inventory'}}
    if($Documents.Count -ne 1){throw 'Unexpected fixture inventory'}
    $name=@($Documents.Keys)[0]
    $text=[string]$Documents[$name]
    $accepted=@(
        'See admin_pwa_release.md for the current owner-only release.',
        'See admin_pwa_release.md. Historical: configure WORDPAIRS_ADMIN_PROFILE_IDS for bootstrap.',
        'See admin_pwa_release.md. Install the administrator app from /admin.',
        'See admin_pwa_release.md. Historically, website sign-in required an issued OpenAI OIDC client registration.',
        'See admin_pwa_release.md. Do not configure WORDPAIRS_ADMIN_PROFILE_IDS for administrator rights.'
    )
    $rejected=@(
        'An unrelated historical plan.',
        'See admin_pwa_release.md. Set `WORDPAIRS_ADMIN_PROFILE_IDS` to that ID.',
        'See admin_pwa_release.md. Installed launches use `/play`.',
        'See admin_pwa_release.md. After OpenAI issues the registration, set the client ID.',
        'See admin_pwa_release.md. Configure WORDPAIRS_ADMIN_PROFILE_IDS to grant access.',
        'See admin_pwa_release.md. Manage grants using /admin/users.',
        'See admin_pwa_release.md. Serve /manifest.webmanifest for the public game.',
        'See admin_pwa_release.md. Install the public game using Add to Home Screen.',
        'See admin_pwa_release.md. No network setup is needed. Configure WORDPAIRS_ADMIN_PROFILE_IDS to grant administrator rights.',
        'See admin_pwa_release.md. Historical: the server used PostgreSQL. Configure WORDPAIRS_ADMIN_PROFILE_IDS to grant administrator rights.',
        'See admin_pwa_release.md. Configure OpenAI login for every player.',
        'See admin_pwa_release.md. Install Wordpairs on your phone from the public game page.',
        'See admin_pwa_release.md. Configure WORDPAIRS_ADMIN_PROFILE_IDS to grant administrator rights.',
        'See admin_pwa_release.md. No network setup is needed, configure WORDPAIRS_ADMIN_PROFILE_IDS for administrator rights.',
        'See admin_pwa_release.md. Review the historical migration and configure WORDPAIRS_ADMIN_PROFILE_IDS for administrator rights.'
    )
    if($text -cin $accepted){return}
    if($text -cin $rejected){return [pscustomobject]@{document=$name;problem='Fixture rejected'}}
    throw "Unexpected documentation fixture for $name"
}
Export-ModuleMember -Function Get-CurrentReleaseDocProblem
