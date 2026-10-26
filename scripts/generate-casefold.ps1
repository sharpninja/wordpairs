$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$source = Join-Path $root 'third_party/unicode/CaseFolding-18.0.0.txt'
if ((Get-FileHash $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'a004797658a457bec4dc11683e39f69249ea3b595b752dbea6721c4c9f587b0d') { throw 'Unexpected Unicode source hash' }
# PowerShell hashtables are case insensitive; Unicode source keys must remain distinct.
$map = [Collections.Generic.Dictionary[string,string]]::new([StringComparer]::Ordinal)
foreach ($line in (Get-Content $source)) {
    if ($line -match '^([0-9A-F]+);\s+([CF]);\s+([0-9A-F ]+);') {
        $from = [char]::ConvertFromUtf32([Convert]::ToInt32($Matches[1],16))
        $to = ($Matches[3].Trim().Split(' ',[StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { [char]::ConvertFromUtf32([Convert]::ToInt32($_,16)) }) -join ''
        $map[$from] = $to
    }
}
[IO.File]::WriteAllText((Join-Path $root 'src/domain/unicode-casefold.json'),($map | ConvertTo-Json -Compress -EscapeHandling EscapeNonAscii),[Text.UTF8Encoding]::new($false))
Write-Output ('Generated '+$map.Count+' full default mappings')
