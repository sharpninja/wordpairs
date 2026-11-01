#Requires -Version 7.0
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSReviewUnusedParameter','',Justification='Pester container parameters are consumed in its BeforeAll execution scope.')]
[CmdletBinding()]
param([string]$RepositoryRoot)

BeforeAll {
    $script:validator=Join-Path $RepositoryRoot 'scripts/Test-PublishedEvidenceManifest.ps1'
    function Write-FixtureJson {
        param([object]$Object,[string]$Path)
        $Object|ConvertTo-Json -Depth 100|Set-Content -LiteralPath $Path -Encoding utf8
    }
    function New-ManifestFixture {
        [CmdletBinding(SupportsShouldProcess)]
        param([string]$Root)
        if(-not $PSCmdlet.ShouldProcess($Root,'Create isolated synthetic evidence and hash bindings')){return}
        $evidence=Join-Path $Root 'docs/submission/deadline-20261101'
        $public=Join-Path $evidence 'redacted-artifacts'
        [void][IO.Directory]::CreateDirectory((Join-Path $public 'artifacts'))
        $artifact=Join-Path $public 'artifacts/artifact-001.json'
        Write-FixtureJson -Object @{publicValue=17} -Path $artifact
        $manifest=@{artifacts=@(@{published='artifacts/artifact-001.json';originalSha256=('F'*64);redactedSha256=(Get-FileHash -LiteralPath $artifact).Hash;redactedBytes=(Get-Item -LiteralPath $artifact).Length})}
        Write-FixtureJson -Object $manifest -Path (Join-Path $public 'manifest.json')
        Write-FixtureJson -Object @{fixtureOnly=$true} -Path (Join-Path $public 'privacy-validation.json')
        [IO.File]::WriteAllText((Join-Path $evidence 'report.md'),'Synthetic evidence report')
        $zip=[IO.Compression.ZipFile]::Open((Join-Path $public 'review-artifacts-redacted.zip'),[IO.Compression.ZipArchiveMode]::Create)
        try{
            foreach($relative in @('artifacts/artifact-001.json','manifest.json','privacy-validation.json')){
                $entry=$zip.CreateEntry($relative)
                $entry.LastWriteTime=[DateTimeOffset]::new(1980,1,1,0,0,0,[TimeSpan]::Zero)
                $stream=$entry.Open()
                try{$bytes=[IO.File]::ReadAllBytes((Join-Path $public $relative));$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
            }
        }finally{$zip.Dispose()}
        $evidenceManifest=@{
            publishedArtifacts=@(@{published='report.md';sha256=(Get-FileHash -LiteralPath (Join-Path $evidence 'report.md')).Hash;bytes=(Get-Item -LiteralPath (Join-Path $evidence 'report.md')).Length})
            publicationDerivatives=@()
            redactedPublication=@{
                manifest='redacted-artifacts/manifest.json';manifestSha256=(Get-FileHash -LiteralPath (Join-Path $public 'manifest.json')).Hash
                archive='redacted-artifacts/review-artifacts-redacted.zip';archiveSha256=(Get-FileHash -LiteralPath (Join-Path $public 'review-artifacts-redacted.zip')).Hash
                privacyValidation='redacted-artifacts/privacy-validation.json';privacyValidationSha256=(Get-FileHash -LiteralPath (Join-Path $public 'privacy-validation.json')).Hash
            }
        }
        Write-FixtureJson -Object $evidenceManifest -Path (Join-Path $evidence 'evidence-manifest.json')
        return [pscustomobject]@{root=$Root;evidence=$evidence;public=$public;artifact=$artifact;manifest=$manifest;evidenceManifest=$evidenceManifest}
    }
}

Describe 'Current published evidence hash bindings' {
    BeforeEach {$script:fixture=New-ManifestFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString()))}
    It 'accepts valid current files and identical archive counterparts without reinterpreting original hashes' {
        $result=& $script:validator -RepositoryRoot $fixture.root|ConvertFrom-Json
        $result.valid|Should -BeTrue
        $result.checkedFiles|Should -Be 5
        $result.checkedArchiveEntries|Should -Be 3
        $result.historicalOriginalHashesReinterpreted|Should -BeFalse
    }
    It 'rejects artifact content tampering' {
        [IO.File]::WriteAllText($fixture.artifact,'changed artifact')
        $result=& $script:validator -RepositoryRoot $fixture.root -NoThrow|ConvertFrom-Json
        $result.valid|Should -BeFalse
        @($result.failures|Where-Object reason -Like '*SHA-256 mismatch*').Count|Should -BeGreaterThan 0
    }
    It 'rejects stale archive entries even when the archive outer hash was rebound' {
        $zipPath=Join-Path $fixture.public 'review-artifacts-redacted.zip'
        $zip=[IO.Compression.ZipFile]::Open($zipPath,[IO.Compression.ZipArchiveMode]::Update)
        try{
            $stream=$zip.GetEntry('artifacts/artifact-001.json').Open()
            try{$stream.SetLength(0);$bytes=[Text.Encoding]::UTF8.GetBytes('stale entry');$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
        }finally{$zip.Dispose()}
        $fixture.evidenceManifest.redactedPublication.archiveSha256=(Get-FileHash -LiteralPath $zipPath).Hash
        Write-FixtureJson -Object $fixture.evidenceManifest -Path (Join-Path $fixture.evidence 'evidence-manifest.json')
        $result=& $script:validator -RepositoryRoot $fixture.root -NoThrow|ConvertFrom-Json
        @($result.failures|Where-Object reason -Like '*Archive entry differs*').Count|Should -Be 1
    }
    It 'rejects traversal paths before opening their targets' {
        $fixture.manifest.artifacts[0].published='../outside.json'
        Write-FixtureJson -Object $fixture.manifest -Path (Join-Path $fixture.public 'manifest.json')
        $result=& $script:validator -RepositoryRoot $fixture.root -NoThrow|ConvertFrom-Json
        @($result.failures|Where-Object reason -Like '*escapes*').Count|Should -Be 1
    }
    It 'rejects wrong recorded byte counts independently of matching hashes' {
        $fixture.evidenceManifest.publishedArtifacts[0].bytes++
        Write-FixtureJson -Object $fixture.evidenceManifest -Path (Join-Path $fixture.evidence 'evidence-manifest.json')
        $result=& $script:validator -RepositoryRoot $fixture.root -NoThrow|ConvertFrom-Json
        @($result.failures|Where-Object reason -Like '*byte count mismatch*').Count|Should -Be 1
    }
    It 'rejects duplicate public paths and fails closed by default' {
        $fixture.manifest.artifacts+=@($fixture.manifest.artifacts[0])
        Write-FixtureJson -Object $fixture.manifest -Path (Join-Path $fixture.public 'manifest.json')
        {& $script:validator -RepositoryRoot $fixture.root}|Should -Throw '*validation failed*'
    }
}
