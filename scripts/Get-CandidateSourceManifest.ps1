#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).ProviderPath,
    [Parameter(Mandatory)][string]$OutputPath
)
$ErrorActionPreference='Stop'
$rootPath=(Resolve-Path -LiteralPath $Root).ProviderPath
$revision=(& git -C $rootPath rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0){throw 'Unable to resolve Git revision.'}
$allPaths=@(& git -C $rootPath ls-files --cached --others --exclude-standard)
if($LASTEXITCODE -ne 0){throw 'Unable to inventory source paths.'}
$declaredPaths=@($allPaths | Where-Object {
    $_ -match '^(src|tests|scripts|public)/' -or
    $_ -match '^(package(-lock)?\.json|tsconfig\.json|next-env\.d\.ts|next\.config\.ts|biome\.json|vitest[^/]*\.config\.ts|playwright[^/]*\.config\.ts)$'
} | Sort-Object -Unique)
$sourceHashes=@(foreach($relativePath in $declaredPaths){
    $absolutePath=Join-Path $rootPath $relativePath
    if(-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)){throw "Declared source file is missing: $relativePath"}
    [pscustomobject]@{path=$relativePath;sha256=(Get-FileHash -LiteralPath $absolutePath -Algorithm SHA256).Hash}
})
$writtenPaths=@(foreach($item in $sourceHashes){$item.path})
$missing=@($declaredPaths | Where-Object { $_ -notin $writtenPaths })
$extra=@($writtenPaths | Where-Object { $_ -notin $declaredPaths })
if($missing.Count -or $extra.Count){throw 'Candidate source manifest path-set mismatch.'}
$receipt=[pscustomobject]@{
    recordedAt=Get-Date -Format s
    revision=$revision
    scope='All Git-indexed or untracked, non-ignored paths under src, tests, scripts and public, plus build/test root configurations.'
    pathSetEqual=$true
    expectedCount=$declaredPaths.Count
    manifestCount=$sourceHashes.Count
    missing=$missing
    extra=$extra
    sourceHashes=$sourceHashes
    qualification='Current workspace bytes at recordedAt; test runs and committed Git bytes are separate evidence.'
}
if($PSCmdlet.ShouldProcess($OutputPath,'Write literal-path source hash manifest')){
    $receipt|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $OutputPath
}
$receipt|Select-Object recordedAt,revision,pathSetEqual,expectedCount,manifestCount|ConvertTo-Json
