#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$File)
$ErrorActionPreference='Stop'
$repo='<repo>'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0'
if(-not $PSCmdlet.ShouldProcess($File,'Run immediate Codex edit hook and direct TypeScript check for acknowledgement repair')){return}
$env:MCP_CACHE_DIR_OVERRIDE='/tmp/wordpairs-release-selfcheck-codex'
$env:MCP_WORKSPACE_PATH=$repo
$env:CODEX_WORKSPACE_PATH=$repo
$dir=Join-Path $repo 'docs/evidence/release15/ui-acknowledgement/edit-verification'
[void](New-Item -ItemType Directory -Path $dir -Force)
$log=Join-Path $dir ((Get-Date -Format yyyyMMddTHHmmss)+'-'+[IO.Path]::GetFileName($File)+'.log')
Push-Location $repo
try{
 @{tool_name='Edit';tool_input=@{file_path=(Join-Path $repo $File)}}|ConvertTo-Json -Compress|& pwsh -NoProfile -NonInteractive -File (Join-Path $plugin 'lib/code-verify.ps1') *> $log
 $hookExit=$LASTEXITCODE
 & npm exec tsc -- --noEmit --pretty false *>> $log
 $typeExit=$LASTEXITCODE
 [pscustomobject]@{timestamp=(Get-Date -Format s);file=$File;sha256=(Get-FileHash -LiteralPath (Join-Path $repo $File)).Hash;hookExitCode=$hookExit;typecheckExitCode=$typeExit;log=$log;qualification='Known project-file detection hook issue already triaged; direct tsc is authoritative.'}|ConvertTo-Json|Set-Content -LiteralPath ($log+'.json')
 Get-Content -LiteralPath ($log+'.json') -Raw
 if($typeExit){Get-Content -LiteralPath $log|Select-Object -Last 35;throw 'Acknowledgement direct typecheck failed'}
}finally{Pop-Location}
