#Requires -Version 7.0
function Get-FixtureHostingCatalog {
    [CmdletBinding()]
    param([string]$Root)
    # Independent scripted provider: literal valid filenames, no production enumeration or regex.
    $paths=@(1..11|ForEach-Object {'src/infrastructure/migrations/{0:D3}_core.sql' -f $_})+@('src/infrastructure/hosting/001_scheduler.sql','src/infrastructure/hosting/002_realtime_policy.sql','src/infrastructure/migrations/012_guest_public_profiles.sql','src/infrastructure/migrations/013_player_capacity.sql','src/infrastructure/migrations/014_capacity10.sql')
    for($index=0;$index -lt $paths.Count;$index++){
        $file=$paths[$index]
        $name=switch($index){11{'wordpairs_hosted_scheduler'}12{'wordpairs_private_realtime'}default{'wordpairs_'+[IO.Path]::GetFileNameWithoutExtension($file)}}
        [pscustomobject]@{version=('{0:D14}' -f ($index+1));name=$name;query=[IO.File]::ReadAllText((Join-Path $Root $file))}
    }
}
Export-ModuleMember -Function Get-FixtureHostingCatalog
