#Requires -Version 7.5
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
$database='<home>/.codex/state_5.sqlite'
$rollout='<home>/.codex/sessions/2026/10/26/rollout-2026-10-26T11-17-57-01a17901-193c-7163-bb57-05a12ae57269.jsonl'
$sqlite=Get-Command sqlite3 -ErrorAction SilentlyContinue
$result=[ordered]@{atLocal=(Get-Date -Format s);databaseExists=(Test-Path -LiteralPath $database -PathType Leaf);parentRolloutExists=(Test-Path -LiteralPath $rollout -PathType Leaf);sqlite3Available=($null-ne$sqlite);scope='Only named root metadata and database table/column schema; no transcript text'}
if($result.databaseExists-and$null-ne$sqlite){
 $tables=& $sqlite.Source -readonly $database 'SELECT name FROM sqlite_master WHERE type=''table'' ORDER BY name;'
 if($LASTEXITCODE-ne0){throw 'Read-only database schema query failed'}
 $result.tableNames=@($tables)
 if('threads'-in$tables){$columns=& $sqlite.Source -readonly -json $database 'PRAGMA table_info(threads);';if($LASTEXITCODE-ne0){throw 'Thread column metadata query failed'};$result.threadColumns=@(($columns-join"`n"|ConvertFrom-Json)|Select-Object name,type)}
}
$result|ConvertTo-Json -Depth 10
