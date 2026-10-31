#Requires -Version 7.0
Set-StrictMode -Version Latest

function Get-HostingSchemaMigrationCatalog {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Root)
    $migrations=[Collections.Generic.List[object]]::new()
    $directory=Join-Path $Root 'src/infrastructure/migrations'
    $core=@(Get-ChildItem -LiteralPath $directory -Filter '*.sql' -File | Where-Object Name -Match '^\d{3}_[a-z0-9_]+\.sql$' | Sort-Object Name)
    foreach($file in @($core | Select-Object -First 11)){
        $migrations.Add([pscustomobject]@{version=('20261027000'+$file.Name.Substring(0,3));name=('wordpairs_'+$file.BaseName);query=[IO.File]::ReadAllText($file.FullName)})
    }
    foreach($hosted in @(
        @{version='20261027000101';name='wordpairs_hosted_scheduler';path='src/infrastructure/hosting/001_scheduler.sql'},
        @{version='20261027000102';name='wordpairs_private_realtime';path='src/infrastructure/hosting/002_realtime_policy.sql'}
    )){
        $path=Join-Path $Root $hosted.path
        $migrations.Add([pscustomobject]@{version=$hosted.version;name=$hosted.name;query=[IO.File]::ReadAllText($path)})
    }
    foreach($file in @($core | Select-Object -Skip 11)){
        $migrations.Add([pscustomobject]@{version=('20261027000'+$file.Name.Substring(0,3));name=('wordpairs_'+$file.BaseName);query=[IO.File]::ReadAllText($file.FullName)})
    }
    return $migrations.ToArray()
}

function Get-HostingSchemaBody {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Query)
    $body=($Query -replace "`r`n","`n").Trim()
    $body=[regex]::Replace($body,'^((?:--[^\n]*\n\s*)*)begin;\s*','$1','IgnoreCase')
    $body=[regex]::Replace($body,'\s*commit;$','', 'IgnoreCase')
    return $body.Trim()
}

function Get-HostingSchemaPending {
    [CmdletBinding()]
    param([Parameter(Mandatory)][object[]]$Migrations,[Parameter(Mandatory)][AllowEmptyCollection()][object[]]$History)
    $ordered=@($History | Sort-Object version)
    if($ordered.Count -gt $Migrations.Count){throw 'Unknown migration history'}
    for($index=0;$index -lt $ordered.Count;$index++){
        $row=$ordered[$index]
        $expected=$Migrations[$index]
        if($row.name -ne $expected.name -or @($row.statements).Count -ne 1 -or
            (Get-HostingSchemaBody -Query ([string]$row.statements[0])) -cne (Get-HostingSchemaBody -Query ([string]$expected.query))){
            throw "Migration source/order drift at $($expected.name)"
        }
    }
    return @($Migrations | Select-Object -Skip $ordered.Count)
}

function Get-HostingSchemaSummary {
    [CmdletBinding()]
    param([Parameter(Mandatory)][object[]]$Migrations)
    @($Migrations | ForEach-Object {
        $digest=[Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes([string]$_.query))
        [pscustomobject]@{version=$_.version;name=$_.name;sha256=[Convert]::ToHexString($digest).ToLowerInvariant()}
    })
}

Export-ModuleMember -Function Get-HostingSchemaMigrationCatalog,Get-HostingSchemaBody,Get-HostingSchemaPending,Get-HostingSchemaSummary
