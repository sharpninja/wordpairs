#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$SourcePath,
    [Parameter(Mandatory)][string]$OutputPath,
    [Parameter(Mandatory)][string]$RepositoryRoot,
    [Parameter(Mandatory)][string]$PrivateRetentionRoot
)
$ErrorActionPreference = 'Stop'
$redaction = '[PRIVATE OPERATOR CONTEXT REDACTED; ORIGINAL RETAINED PRIVATELY]'
$repoRoot = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $RepositoryRoot).ProviderPath).TrimEnd([IO.Path]::DirectorySeparatorChar)
$comparison = if ($IsWindows) { [StringComparison]::OrdinalIgnoreCase } else { [StringComparison]::Ordinal }

function Assert-ReviewPathWithoutLink {
    [CmdletBinding()]
    param([string]$Path)
    $full=[IO.Path]::GetFullPath($Path)
    $cursor=[IO.Path]::GetPathRoot($full)
    foreach($part in $full.Substring($cursor.Length).Split([IO.Path]::DirectorySeparatorChar)){
        $cursor=Join-Path $cursor $part
        $item=Get-Item -LiteralPath $cursor -Force -ErrorAction SilentlyContinue
        if($null -ne $item -and $null -ne $item.LinkTarget){throw 'Repository, source and private retention paths must not traverse a symbolic link.'}
    }
}

function Test-PublicReviewPath {
    [CmdletBinding()]
    param([AllowNull()][string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    if ($Value.StartsWith('<repo>/',[StringComparison]::Ordinal)) { $Value = Join-Path $repoRoot $Value.Substring(7) }
    if (-not [IO.Path]::IsPathRooted($Value)) { return $false }
    try { $fullPath = [IO.Path]::GetFullPath($Value) } catch { return $false }
    if (-not $fullPath.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar,$comparison)) { return $false }
    $relative = [IO.Path]::GetRelativePath($repoRoot,$fullPath)
    $cursor = $repoRoot
    foreach ($part in $relative.Split([IO.Path]::DirectorySeparatorChar)) {
        if ($part -in @('node_modules','.git','.ssh','.creds','.claude','.codex','.mcpServer','session-state.yaml','current-turn.yaml','AGENTS-README-FIRST.yaml') -or $part -like '*-review-cache-*') { return $false }
        if ($part -match '^\.env(?:\..+)?$' -and $part -notmatch '^\.env\.(?:example|sample|template)(?:\..+)?$') { return $false }
        if ($part -match '(?i)(?:credential|private[-_]?key|client[-_]?secret|access[-_]?token)|^cred-|^id_(?:rsa|dsa|ecdsa|ed25[5]19)(?:\.|$)|\.(?:pwd|key|pem|p12|pfx)$') { return $false }
        $cursor = Join-Path $cursor $part
        $item = Get-Item -LiteralPath $cursor -Force -ErrorAction SilentlyContinue
        if ($null -ne $item -and $null -ne $item.LinkTarget) { return $false }
    }
    return $true
}

function ConvertTo-ReviewComparisonText {
    [CmdletBinding()]
    param([string]$Value)
    $lines=foreach($line in [regex]::Split($Value,'\r\n|\n|\r')) {
        ([regex]::Replace($line,'^\s*\d+\s*(?:\u2192|\t|[|:])\s?','')).TrimEnd()
    }
    $normalized=($lines -join "`n").Trim().Replace($repoRoot,'<repo>')
    return [regex]::Replace($normalized,'/home/[^/\s"''<>]+/','<home>/')
}

function Find-PrivateReviewRead {
    [CmdletBinding()]
    param([AllowNull()][object]$Node)
    if ($Node -is [Collections.IDictionary]) {
        if ($Node.tool_use_result -is [Collections.IDictionary] -and $Node.tool_use_result.file -is [Collections.IDictionary]) {
            $file=$Node.tool_use_result.file
            if ($file.Contains('content') -and -not (Test-PublicReviewPath -Value ([string]$file.filePath))) {
                if ($file.content -is [string] -and $file.content.Length -gt 0) { [void]$privateText.Add([string]$file.content) }
                [void]$privateNodes.Add($file)
            }
        }
        if ($Node.Contains('filePath') -and $Node.Contains('content') -and -not (Test-PublicReviewPath -Value ([string]$Node.filePath))) {
            if ($Node.content -is [string] -and $Node.content.Length -gt 0) { [void]$privateText.Add([string]$Node.content) }
            [void]$privateNodes.Add($Node)
        }
        if ($Node.type -eq 'tool_use' -and $Node.name -eq 'Read') {
            $readPath = if ($Node.input -is [Collections.IDictionary]) { [string]$Node.input.file_path } else { '' }
            if (-not (Test-PublicReviewPath -Value $readPath)) { [void]$privateToolIds.Add([string]$Node.id) }
        }
        foreach ($key in @($Node.Keys)) { Find-PrivateReviewRead -Node $Node[$key] }
    } elseif ($Node -is [Collections.IList]) {
        foreach ($child in $Node) { Find-PrivateReviewRead -Node $child }
    }
}

function Protect-PublicReviewNode {
    [CmdletBinding()]
    param([AllowNull()][object]$Node)
    if ($Node -is [Collections.IDictionary]) {
        if ($Node.type -eq 'tool_result' -and $privateToolIds.Contains([string]$Node.tool_use_id)) {
            $Node.content = $redaction
            $script:redactedValues++
        }
        if ($Node.type -eq 'system') {
            foreach ($field in @('stdout','stderr','output','content','message','hook_output','additionalContext')) {
                if ($Node.Contains($field)) { $Node[$field] = $redaction; $script:redactedValues++ }
            }
        }
        foreach ($key in @($Node.Keys)) { $Node[$key] = Protect-PublicReviewNode -Node $Node[$key] }
        return ,$Node
    }
    if ($Node -is [Collections.IList]) {
        for ($index=0;$index -lt $Node.Count;$index++) { $Node[$index] = Protect-PublicReviewNode -Node $Node[$index] }
        return ,$Node
    }
    if ($Node -is [string]) {
        $value = $Node
        foreach ($privateValue in $privateText) {
            if ($value.Contains($privateValue)) { $value = $value.Replace($privateValue,$redaction); $script:redactedValues++ }
            else {
                $comparisonBody=ConvertTo-ReviewComparisonText -Value $privateValue
                if($comparisonBody.Length -gt 0 -and (ConvertTo-ReviewComparisonText -Value $value).Contains($comparisonBody)) { $value = $redaction; $script:redactedValues++ }
            }
        }
        $value = $value.Replace($repoRoot,'<repo>')
        return [regex]::Replace($value,'/home/[^/\s"''<>]+/','<home>/')
    }
    return $Node
}

$source = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $SourcePath).ProviderPath)
$output = [IO.Path]::GetFullPath($OutputPath)
$retention = [IO.Path]::GetFullPath($PrivateRetentionRoot)
Assert-ReviewPathWithoutLink -Path $repoRoot
Assert-ReviewPathWithoutLink -Path $source
Assert-ReviewPathWithoutLink -Path $retention
Assert-ReviewPathWithoutLink -Path $output
if ($source -eq $output) { throw 'Source and output must differ; originals are never overwritten.' }
if ($source -notlike '*.response.jsonl') { throw 'Source must be an explicitly selected review response JSONL file.' }
if ($source -match '(?:^|[/\\])(?:\.ssh|\.creds|credentials?)(?:[/\\]|$)|(?:^|[/\\])cred-') { throw 'Credential storage paths are not valid export sources.' }
if ((Get-Item -LiteralPath $source).LinkTarget) { throw 'A review source must not be a symbolic link.' }
if ($retention.Equals($repoRoot,$comparison) -or $retention.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar,$comparison)) { throw 'Private retention must be outside the repository.' }
if (-not $PSCmdlet.ShouldProcess($output,'Retain the unchanged original privately and export repository-allowlisted review events')) { return }

$records = [Collections.Generic.List[object]]::new()
$privateNodes = [Collections.Generic.HashSet[object]]::new()
$privateText = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$privateToolIds = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$script:redactedValues = 0
foreach ($line in [IO.File]::ReadLines($source)) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $record = $line | ConvertFrom-Json -AsHashtable -Depth 100 -DateKind String
    Find-PrivateReviewRead -Node $record
    $records.Add($record)
}
foreach ($privateNode in $privateNodes) { $privateNode.content = $redaction; $script:redactedValues++ }
$sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
[void][IO.Directory]::CreateDirectory($retention)
if (-not $IsWindows) { [IO.File]::SetUnixFileMode($retention,[IO.UnixFileMode]448) }
$retained = Join-Path $retention ([IO.Path]::GetFileName($source) + '.' + $sourceHash.ToLowerInvariant() + '.original')
Assert-ReviewPathWithoutLink -Path $retained
if (-not [IO.File]::Exists($retained)) { [IO.File]::Copy($source,$retained,$false) }
if ((Get-FileHash -LiteralPath $retained -Algorithm SHA256).Hash -cne $sourceHash) { throw 'Retained original hash mismatch.' }
if (-not $IsWindows) { [IO.File]::SetUnixFileMode($retained,[IO.UnixFileMode]384) }
[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($output))
$publicLines = foreach ($record in $records) { Protect-PublicReviewNode -Node $record | ConvertTo-Json -Depth 100 -Compress }
[IO.File]::WriteAllLines($output,[string[]]$publicLines,[Text.UTF8Encoding]::new($false))
$receipt = [ordered]@{
    schema='wordpairs-public-review-allowlist-export/v1'
    recordedAt=[DateTimeOffset]::Now.ToString('o')
    originalSha256=$sourceHash
    publicSha256=(Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
    originalRetainedPrivately=$true
    privateRetentionPathPublished=$false
    events=$records.Count
    redactedStringValues=$script:redactedValues
    policy='Only repository file reads are eligible; dependency, Git internals, credential-like files, symlink paths, external reads, unknown Read results and hook contexts are redacted. Matching echoes, including numbered Read wrappers and normalized paths, are redacted. Absolute home paths are normalized.'
    executionOrReviewAcceptanceEstablished=$false
}
$receipt | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath ($output + '.receipt.json') -Encoding utf8
$receipt | ConvertTo-Json -Depth 10
