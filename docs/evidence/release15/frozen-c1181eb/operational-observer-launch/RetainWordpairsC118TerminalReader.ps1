[CmdletBinding(SupportsShouldProcess)]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$directory='<repo>/docs/evidence/release15/frozen-c1181eb/operational-observer-launch'
$original=Join-Path $directory 'ReadWordpairsC118ObserverEvidence.ps1'
$adapted=Join-Path $directory 'ReadWordpairsC118ObserverTerminal-004542.ps1'
$target=Join-Path $directory 'terminal-reader-retention.json'
if((Get-FileHash -LiteralPath $original).Hash -cne '60A02303391FFCA326655EF058B58B58B4A74744306036BDD7AF3772F6EDA20E'){throw 'Original retained readback producer changed'}
if((Test-Path -LiteralPath $target) -or (Test-Path -LiteralPath $adapted)){throw 'Preserve prior terminal reader preparation'}
$before=[IO.File]::ReadAllText($original)
$oldRequest='req-20261031T003052Z-c118-operational-evidence';$newRequest='req-20261031T004542Z-c118-observer-terminal'
if(-not $before.Contains($oldRequest,[StringComparison]::Ordinal)){throw 'Expected original request linkage absent'}
if(-not $PSCmdlet.ShouldProcess($adapted,'Retain original terminal reader and copy with current follow-up request ID only, before final readback')){return}
[IO.File]::WriteAllText($adapted,$before.Replace($oldRequest,$newRequest))
$selfCopy=Join-Path $directory (Split-Path $PSCommandPath -Leaf);Copy-Item -LiteralPath $PSCommandPath -Destination $selfCopy
if((Get-FileHash -LiteralPath $selfCopy).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Terminal reader retention producer copy mismatch'}
$pins=@(foreach($path in @($original,$adapted,$selfCopy)){$tokens=$null;$errorsFound=$null;[void][Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errorsFound);$issues=@(Invoke-ScriptAnalyzer -Path $path -Severity Warning,Error);if(@($errorsFound).Count -or $issues.Count){throw 'Terminal reader syntax/analyzer failed'};[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;parserErrors=0;analyzerIssues=0}})
[pscustomobject]@{recordedAt=[DateTimeOffset]::Now.ToString('o');sessionId='Codex-20261030T194802Z-plugin-session';requestId=$newRequest;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';producerPins=$pins;adaptation='Only terminal readback requestId changed from initial attachment turn to current follow-up turn. No sampling/readback algorithm changed. Original retained unchanged; copy retained before terminal readback.';originalsRetained=$true}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath $target
[pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;pins=$pins}|ConvertTo-Json -Depth 10
