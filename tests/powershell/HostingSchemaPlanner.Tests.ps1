#Requires -Version 7.0
$ErrorActionPreference='Stop'
Import-Module $env:WORDPAIRS_PLANNER_MODULE -Force

Describe 'hosting migration prefix contract' {
    BeforeAll {
        $names=@(1..11 | ForEach-Object { 'wordpairs_{0:D3}_core' -f $_ }) + @('wordpairs_hosted_scheduler','wordpairs_private_realtime','wordpairs_012_guest_public_profiles','wordpairs_013_player_capacity','wordpairs_014_capacity10')
        $migrations=@(for($i=0;$i -lt $names.Count;$i++){
            [pscustomobject]@{version=('{0:D14}' -f ($i+1));name=$names[$i];query=('select {0};' -f ($i+1))}
        })
        function Get-MockHistory([int]$Count) {
            @($migrations | Select-Object -First $Count | ForEach-Object {
                [pscustomobject]@{version=$_.version;name=$_.name;statements=@($_.query)}
            })
        }
    }

    It 'proposes 012 through 014 after the recorded thirteen-migration hosted prefix' {
        $pending=@(Get-HostingSchemaPending -Migrations $migrations -History (Get-MockHistory 13))
        $pending.name | Should -Be @('wordpairs_012_guest_public_profiles','wordpairs_013_player_capacity','wordpairs_014_capacity10')
        $fullyApplied=@(Get-HostingSchemaPending -Migrations $migrations -History (Get-MockHistory 16))
        $fullyApplied.Count | Should -Be 0
        @(Get-HostingSchemaSummary -Migrations $fullyApplied).Count | Should -Be 0
    }

    It 'proposes the whole catalog for an empty history' {
        $pending=@(Get-HostingSchemaPending -Migrations $migrations -History @())
        $pending.name | Should -Be $migrations.name
    }

    It 'proposes hosted scheduler, private realtime, then 012 through 014 after core 001 through 011' {
        $pending=@(Get-HostingSchemaPending -Migrations $migrations -History (Get-MockHistory 11))
        $pending.name | Should -Be @('wordpairs_hosted_scheduler','wordpairs_private_realtime','wordpairs_012_guest_public_profiles','wordpairs_013_player_capacity','wordpairs_014_capacity10')
    }

    It 'rejects 012 inserted before hosted 101 without opening a connection' {
        $history=Get-MockHistory 11
        $history+=Get-MockHistory 14 | Select-Object -Last 1
        { Get-HostingSchemaPending -Migrations $migrations -History $history } | Should -Throw '*drift*'
    }

    It 'rejects source drift at an otherwise matching migration' {
        $history=Get-MockHistory 13
        $history[4].statements=@('select incorrect;')
        { Get-HostingSchemaPending -Migrations $migrations -History $history } | Should -Throw '*drift*'
    }

    It 'rejects history longer than the declared migration set' {
        $history=Get-MockHistory 16
        $history+= [pscustomobject]@{version='00000000000017';name='wordpairs_unknown';statements=@('select 17;')}
        { Get-HostingSchemaPending -Migrations $migrations -History $history } | Should -Throw '*Unknown migration history*'
    }
}

Describe 'hosting migration filename catalog contract' {
    BeforeAll {
        $fixtureRoot=Join-Path $TestDrive 'catalog'
        $coreDirectory=Join-Path $fixtureRoot 'src/infrastructure/migrations'
        $hostingDirectory=Join-Path $fixtureRoot 'src/infrastructure/hosting'
        $null=New-Item -ItemType Directory -Path $coreDirectory,$hostingDirectory
        $coreNames=@(1..11|ForEach-Object {'{0:D3}_core' -f $_})+@('012_guest_public_profiles','013_player_capacity','014_capacity10')
        foreach($index in 13..0){[IO.File]::WriteAllText((Join-Path $coreDirectory ($coreNames[$index]+'.sql')),('select core {0:D3};' -f ($index+1)))}
        [IO.File]::WriteAllText((Join-Path $hostingDirectory '001_scheduler.sql'),'select scheduler;')
        [IO.File]::WriteAllText((Join-Path $hostingDirectory '002_realtime_policy.sql'),'select realtime;')
        $invalidFiles=@('14_bad.sql','0014_bad.sql','015_.sql','015_bad-name.sql','015_bad.name.sql','015_bad.sql.bak','nonsense.sql')
        foreach($name in $invalidFiles){[IO.File]::WriteAllText((Join-Path $coreDirectory $name),'invalid;')}
        $null=New-Item -ItemType Directory -Path (Join-Path $coreDirectory 'nested')
        [IO.File]::WriteAllText((Join-Path $coreDirectory 'nested/015_nested.sql'),'nested;')
        $script:expectedNames=@($coreNames[0..10]|ForEach-Object {'wordpairs_'+$_})+@('wordpairs_hosted_scheduler','wordpairs_private_realtime')+@($coreNames[11..13]|ForEach-Object {'wordpairs_'+$_})
        $script:expectedBodies=@(1..11|ForEach-Object {'select core {0:D3};' -f $_})+@('select scheduler;','select realtime;')+@(12..14|ForEach-Object {'select core {0:D3};' -f $_})
    }
    It 'includes digit-bearing 014 in the exact core and hosted order with original source bodies' {
        $actual=@(Get-HostingSchemaMigrationCatalog -Root $fixtureRoot)
        $actual.Count|Should -Be 16
        $actual.name|Should -Be $script:expectedNames
        $actual.query|Should -Be $script:expectedBodies
        $actual[-1].name|Should -BeExactly 'wordpairs_014_capacity10'
    }
    It 'excludes invalid filenames and nested files without losing valid migrations' {
        $actual=@(Get-HostingSchemaMigrationCatalog -Root $fixtureRoot)
        $actual.Count|Should -Be 16
        foreach($invalid in $invalidFiles){$actual.name|Should -Not -Contain ('wordpairs_'+[IO.Path]::GetFileNameWithoutExtension($invalid))}
        $actual.name|Should -Not -Contain 'wordpairs_015_nested'
    }
}
