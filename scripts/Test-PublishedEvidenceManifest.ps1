#Requires -Version 7.0
[CmdletBinding()]
param(
    [string]$RepositoryRoot=(Split-Path -Parent $PSScriptRoot),
    [string]$EvidenceRelative='docs/submission/deadline-20261101',
    [string]$ReportPath,
    [switch]$NoThrow
)
$ErrorActionPreference='Stop'
$failures=[Collections.Generic.List[object]]::new()
$checkedFiles=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$checkedArchiveEntries=0
$root=[IO.Path]::GetFullPath($RepositoryRoot).TrimEnd([IO.Path]::DirectorySeparatorChar)

function Resolve-EvidenceFile {
    [CmdletBinding()]
    param([string]$BaseDirectory,[string]$RelativePath)
    if([string]::IsNullOrWhiteSpace($RelativePath) -or [IO.Path]::IsPathRooted($RelativePath)){throw 'Manifest file paths must be relative.'}
    if($RelativePath -match '(?:^|[/\\])(?:\.ssh|\.creds|\.env[^/\\]*|cred-[^/\\]+|credentials?(?:\.[^/\\]+)?)(?:[/\\]|$)'){throw 'Credential storage paths are not evidence targets.'}
    $base=[IO.Path]::GetFullPath($BaseDirectory).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $path=[IO.Path]::GetFullPath((Join-Path $base $RelativePath))
    if(-not $path.StartsWith($base+[IO.Path]::DirectorySeparatorChar,[StringComparison]::Ordinal)){throw 'Manifest file path escapes its evidence directory.'}
    $cursor=$base
    foreach($part in [IO.Path]::GetRelativePath($base,$path).Split([IO.Path]::DirectorySeparatorChar)){
        $cursor=Join-Path $cursor $part
        $item=Get-Item -LiteralPath $cursor -Force -ErrorAction SilentlyContinue
        if($null -ne $item -and $null -ne $item.LinkTarget){throw 'Evidence targets must not traverse symbolic links.'}
    }
    return $path
}

function Test-EvidenceBinding {
    [CmdletBinding()]
    param([string]$BaseDirectory,[string]$RelativePath,[string]$ExpectedSha256,[AllowNull()][object]$ExpectedBytes,[string]$Source)
    try{
        $path=Resolve-EvidenceFile -BaseDirectory $BaseDirectory -RelativePath $RelativePath
        if(-not [IO.File]::Exists($path)){throw 'Published artifact is missing.'}
        if($ExpectedSha256 -notmatch '^[A-Fa-f0-9]{64}$'){throw 'A SHA-256 binding is missing or malformed.'}
        if((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ine $ExpectedSha256){throw 'Published artifact SHA-256 mismatch.'}
        if($null -ne $ExpectedBytes -and (Get-Item -LiteralPath $path).Length -ne [long]$ExpectedBytes){throw 'Published artifact byte count mismatch.'}
        [void]$checkedFiles.Add([IO.Path]::GetRelativePath($root,$path).Replace('\','/'))
    }catch{
        $failures.Add([ordered]@{source=$Source;file=$RelativePath;reason=$_.Exception.Message})
    }
}

$evidenceRoot=Resolve-EvidenceFile -BaseDirectory $root -RelativePath $EvidenceRelative
$evidenceManifestPath=Join-Path $evidenceRoot 'evidence-manifest.json'
$publicManifestPath=Join-Path $evidenceRoot 'redacted-artifacts/manifest.json'
$evidenceManifest=[IO.File]::ReadAllText($evidenceManifestPath)|ConvertFrom-Json -AsHashtable -Depth 100 -DateKind String
$publicManifest=[IO.File]::ReadAllText($publicManifestPath)|ConvertFrom-Json -AsHashtable -Depth 100 -DateKind String
$publicRoot=Split-Path -Parent $publicManifestPath
$artifactNames=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach($artifact in $publicManifest.artifacts){
    if(-not $artifactNames.Add([string]$artifact.published)){$failures.Add([ordered]@{source='redacted-artifacts/manifest.json';file=$artifact.published;reason='Duplicate published artifact path.'})}
    Test-EvidenceBinding -BaseDirectory $publicRoot -RelativePath $artifact.published -ExpectedSha256 $artifact.redactedSha256 -ExpectedBytes $artifact.redactedBytes -Source 'redacted-artifacts/manifest.json'
}
foreach($artifact in $evidenceManifest.publishedArtifacts){Test-EvidenceBinding -BaseDirectory $evidenceRoot -RelativePath $artifact.published -ExpectedSha256 $artifact.sha256 -ExpectedBytes $artifact.bytes -Source 'evidence-manifest.json:publishedArtifacts'}
foreach($artifact in $evidenceManifest.publicationDerivatives){Test-EvidenceBinding -BaseDirectory $evidenceRoot -RelativePath $artifact.path -ExpectedSha256 $artifact.sha256 -ExpectedBytes $artifact.bytes -Source 'evidence-manifest.json:publicationDerivatives'}
$publication=$evidenceManifest.redactedPublication
foreach($pair in @(@('manifest','manifestSha256'),@('archive','archiveSha256'),@('privacyValidation','privacyValidationSha256'))){
    Test-EvidenceBinding -BaseDirectory $evidenceRoot -RelativePath $publication[$pair[0]] -ExpectedSha256 $publication[$pair[1]] -ExpectedBytes $null -Source ('evidence-manifest.json:redactedPublication.'+$pair[0])
}
try{
    $archivePath=Resolve-EvidenceFile -BaseDirectory $evidenceRoot -RelativePath $publication.archive
    $archive=[IO.Compression.ZipFile]::OpenRead($archivePath)
    try{
        foreach($entry in $archive.Entries){
            if($entry.FullName.EndsWith('/')){continue}
            $counterpart=Resolve-EvidenceFile -BaseDirectory $publicRoot -RelativePath $entry.FullName
            if(-not [IO.File]::Exists($counterpart)){throw ('Archive entry has no current published counterpart: '+$entry.FullName)}
            $stream=$entry.Open()
            try{$actual=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream))}finally{$stream.Dispose()}
            if($actual -ine (Get-FileHash -LiteralPath $counterpart -Algorithm SHA256).Hash){throw ('Archive entry differs from its current published counterpart: '+$entry.FullName)}
            $checkedArchiveEntries++
        }
    }finally{$archive.Dispose()}
}catch{$failures.Add([ordered]@{source='redacted-publication-archive';file=$publication.archive;reason=$_.Exception.Message})}
$result=[ordered]@{schema='wordpairs-current-evidence-manifest-validation/v1';recordedAt=[DateTimeOffset]::Now.ToString('o');valid=($failures.Count -eq 0);checkedFiles=$checkedFiles.Count;checkedArchiveEntries=$checkedArchiveEntries;failures=$failures.ToArray();historicalOriginalHashesReinterpreted=$false;liveRequirementsModified=$false}
if($ReportPath){$result|ConvertTo-Json -Depth 30|Set-Content -LiteralPath $ReportPath -Encoding utf8}
$result|ConvertTo-Json -Depth 30
if($failures.Count -gt 0 -and -not $NoThrow){throw 'Current published evidence manifest validation failed.'}
