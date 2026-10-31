#Requires -Version 7.0
Import-Module (Join-Path $PSScriptRoot 'HostingSchemaPlanner.MockCorrect.psm1') -Force
Import-Module (Join-Path $PSScriptRoot 'HostingSchemaPlanner.CatalogFixture.psm1') -Force
function Get-HostingSchemaMigrationCatalog {
    [CmdletBinding()]
    param([string]$Root)
    # Targeted omission: all other names/bodies and pending behavior remain correct.
    Get-FixtureHostingCatalog -Root $Root|Where-Object name -NE 'wordpairs_014_capacity10'
}
Export-ModuleMember -Function Get-HostingSchemaPending,Get-HostingSchemaMigrationCatalog
