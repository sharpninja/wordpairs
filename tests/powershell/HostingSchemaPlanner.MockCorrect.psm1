#Requires -Version 7.0
Import-Module (Join-Path $PSScriptRoot 'HostingSchemaPlanner.CatalogFixture.psm1') -Force
function Get-HostingSchemaMigrationCatalog {
    [CmdletBinding()]
    param([string]$Root)
    Get-FixtureHostingCatalog -Root $Root
}
function Get-HostingSchemaPending {
    [CmdletBinding()]
    param([object[]]$Migrations,[AllowEmptyCollection()][object[]]$History)
    $ordered=@($History | Sort-Object version)
    if($ordered.Count -gt $Migrations.Count){throw 'Unknown migration history'}
    for($i=0;$i -lt $ordered.Count;$i++){
        if($ordered[$i].name -ne $Migrations[$i].name -or @($ordered[$i].statements).Count -ne 1 -or $ordered[$i].statements[0] -ne $Migrations[$i].query){
            throw "Migration source/order drift at $($Migrations[$i].name)"
        }
    }
    @($Migrations | Select-Object -Skip $ordered.Count)
}
function Get-HostingSchemaSummary {
    [CmdletBinding()]
    param([AllowEmptyCollection()][object[]]$Migrations)
    if($Migrations.Count -ne 0){throw 'Summary mock only supports the empty pending fixture'}
    @()
}
Export-ModuleMember -Function Get-HostingSchemaPending,Get-HostingSchemaMigrationCatalog,Get-HostingSchemaSummary
