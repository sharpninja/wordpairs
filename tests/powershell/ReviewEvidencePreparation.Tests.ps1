BeforeAll {
    $repo=Split-Path (Split-Path $PSScriptRoot)
    if($env:WORDPAIRS_PREPARATION_FIXTURE){Import-Module $env:WORDPAIRS_PREPARATION_FIXTURE -Force}
    else{. (Join-Path $repo 'scripts/Prepare-ReviewEvidence.ps1') -ReportDirectory unused -PowerShellDirectory unused -OutputDirectory unused -SourceInventoryPath unused -ExpectedUnitCount 2 -ExpectedPostgresCount 1 -ExpectedBrowserCount 1 -LoadContractsOnly}
    function New-InventoryCase {
        [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSUseShouldProcessForStateChangingFunctions','',Justification='Builds only an independent in-memory fixture; no external state is changed.')]
        [CmdletBinding()]
        param()
        $hash='A'*64
        @{Inventory=@{revision='head';pathSetEqual=$true;expectedCount=1;manifestCount=1;sourceHashes=@(@{path='src/sample.ts';sha256=$hash})};Revision='head';SourceHashes=@(@{path='src/sample.ts';sha256=$hash});ExpectedCounts=@{unit=2;postgres=1;browser=1};Reports=@(@{name='unit';cases=2;failed=0;skipped=0},@{name='postgres';cases=1;failed=0;skipped=0},@{name='browser';cases=1;failed=0;skipped=0})}
    }
    function New-SupplementalCase {
        [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSUseShouldProcessForStateChangingFunctions','',Justification='Builds only an independent in-memory fixture; no external state is changed.')]
        [CmdletBinding()]
        param()
        $reports=@(@{kind='realtime';cases=4;failed=0;skipped=0;caseNames=@('private denial','room delivery','match delivery','reaction delivery')},@{kind='live-ui';cases=9;failed=0;skipped=0;caseNames=@(2..10|ForEach-Object {"LIVE-SCALE $_ real browser players complete eight UI rounds"})},@{kind='strict-ui';cases=1;failed=0;skipped=0;caseNames=@('LIVE real two-player and observer UI: private push, all eight rounds, autonomous deadlines, renewal and reconnect')})
        @{Reports=$reports;ExpectedRealtimeCount=4}
    }
}
Describe 'Frozen expected inventory and source binding' {
    It 'accepts the complete independent expected inventory' {$c=New-InventoryCase;@(Get-ReviewPreparationProblem @c).Count|Should -Be 0}
    It 'rejects another revision' {$c=New-InventoryCase;$c.Inventory.revision='old';@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects an unverified path set' {$c=New-InventoryCase;$c.Inventory.pathSetEqual=$false;@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects missing source entries' {$c=New-InventoryCase;$c.Inventory.sourceHashes=@();@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects changed source bytes' {$c=New-InventoryCase;$c.SourceHashes[0].sha256='B'*64;@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects omitted current source paths' {$c=New-InventoryCase;$c.SourceHashes+=@{path='tests/new.test.ts';sha256='B'*64};@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects zero caller expectations' {$c=New-InventoryCase;$c.ExpectedCounts.unit=0;@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects fractional caller expectations' {$c=New-InventoryCase;$c.ExpectedCounts.unit=2.5;@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects an executed count different from the expected inventory' {$c=New-InventoryCase;$c.Reports[0].cases=1;@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects failed cases' {$c=New-InventoryCase;$c.Reports[0].failed=1;@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects skipped cases' {$c=New-InventoryCase;$c.Reports[1].skipped=1;@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects empty executed reports' {$c=New-InventoryCase;$c.Reports[2].cases=0;@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects a missing required report' {$c=New-InventoryCase;$c.Reports=@($c.Reports[0],$c.Reports[1]);@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects duplicate report identities' {$c=New-InventoryCase;$c.Reports[2].name='unit';@(Get-ReviewPreparationProblem @c).Count|Should -BeGreaterThan 0}
}
Describe 'Supplemental real Realtime and UI matrix obligations' {
    It 'accepts real transport plus the full nine-case matrix and strict journey' {$c=New-SupplementalCase;@(Get-ReviewSupplementalProblem @c).Count|Should -Be 0}
    It 'rejects a missing strict journey' {$c=New-SupplementalCase;$c.Reports=@($c.Reports[0],$c.Reports[1]);@(Get-ReviewSupplementalProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects a partial matrix count' {$c=New-SupplementalCase;$c.Reports[1].cases=8;@(Get-ReviewSupplementalProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects nine duplicated player-count names' {$c=New-SupplementalCase;$c.Reports[1].caseNames=@(1..9|ForEach-Object {'LIVE-SCALE 2 real browser players complete eight UI rounds'});@(Get-ReviewSupplementalProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects an incorrect transport count' {$c=New-SupplementalCase;$c.Reports[0].cases=3;@(Get-ReviewSupplementalProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects a failed strict journey' {$c=New-SupplementalCase;$c.Reports[2].failed=1;@(Get-ReviewSupplementalProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects skipped matrix cases' {$c=New-SupplementalCase;$c.Reports[1].skipped=1;@(Get-ReviewSupplementalProblem @c).Count|Should -BeGreaterThan 0}
    It 'rejects a mislabeled strict case' {$c=New-SupplementalCase;$c.Reports[2].caseNames=@('a fixture-only page');@(Get-ReviewSupplementalProblem @c).Count|Should -BeGreaterThan 0}
}
