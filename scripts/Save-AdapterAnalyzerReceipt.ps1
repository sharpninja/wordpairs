#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$OutputPath)
$ErrorActionPreference='Stop'
$entries=@(foreach($name in @('Convert-JUnitToTrx.ps1','Test-JUnitToTrx.ps1')){
    $path=Join-Path $PSScriptRoot $name
    $parserErrors=$null
    [void][Management.Automation.Language.Parser]::ParseFile($path,[ref]$null,[ref]$parserErrors)
    $analyzerIssues=@(Invoke-ScriptAnalyzer -Path $path -Severity Warning,Error)
    [pscustomobject]@{
        path=('scripts/'+$name)
        sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
        parserErrorCount=@($parserErrors).Count
        analyzerWarningErrorCount=$analyzerIssues.Count
        parserErrors=@($parserErrors|ForEach-Object Message)
        analyzerIssues=@($analyzerIssues|ForEach-Object {[pscustomobject]@{rule=$_.RuleName;line=$_.Line;message=$_.Message}})
    }
})
$receipt=[pscustomobject]@{
    timestamp=Get-Date -Format s
    entries=$entries
    totalParserErrors=@($entries|Where-Object parserErrorCount -GT 0).Count
    totalAnalyzerIssues=@($entries|Where-Object analyzerWarningErrorCount -GT 0).Count
    qualification='Current parser/analyzer status before the immediately subsequent adapter fixture rerun; does not backdate historical runs.'
}
if($PSCmdlet.ShouldProcess($OutputPath,'Write analyzer receipt for the exact adapter bytes')){
    $receipt|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $OutputPath
}
$receipt|ConvertTo-Json -Depth 8
if($receipt.totalParserErrors -or $receipt.totalAnalyzerIssues){throw 'Adapter analyzer gate failed.'}
