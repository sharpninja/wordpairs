#Requires -Version 7.0
Import-Module (Join-Path $PSScriptRoot 'HostingSchemaPlanner.CatalogFixture.psm1') -Force
function Get-HostingSchemaMigrationCatalog {
    [CmdletBinding()]
    param([string]$Root)
    $catalog=@(Get-FixtureHostingCatalog -Root $Root)
    [array]::Reverse($catalog)
    # Keep the correct count so invalid-name rejection cannot pass on count alone.
    $catalog[0]=[pscustomobject]@{version='bad';name='wordpairs_015_bad-name';query='invalid;'}
    $catalog
}
function Get-HostingSchemaPending {
    [CmdletBinding()]
    param([object[]]$Migrations,[AllowEmptyCollection()][object[]]$History)
    # Deliberately faulty: ignores history and ordering to prove the tests reject it.
    $History.Count | Out-Null
    $Migrations
}
Export-ModuleMember -Function Get-HostingSchemaPending,Get-HostingSchemaMigrationCatalog
