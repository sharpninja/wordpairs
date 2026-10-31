#Requires -Version 7.0
function Get-HostingSchemaMigrationCatalog {
    [CmdletBinding()]
    param([string]$Root)
    $Root.Length|Out-Null
    return @()
}
function Get-HostingSchemaPending {
    [CmdletBinding()]
    param([object[]]$Migrations,[AllowEmptyCollection()][object[]]$History)
    # Deliberately faulty: never proposes migrations, including for empty history.
    $Migrations.Count | Out-Null
    $History.Count | Out-Null
    return @()
}
Export-ModuleMember -Function Get-HostingSchemaPending,Get-HostingSchemaMigrationCatalog
