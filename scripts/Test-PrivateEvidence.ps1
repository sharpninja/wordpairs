#Requires -Version 7.0
[CmdletBinding()]
param([string]$RepositoryRoot=(Split-Path -Parent $PSScriptRoot),[switch]$Staged,[string]$ReportPath)
$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath $RepositoryRoot).ProviderPath
$rules=[Collections.Generic.List[object]]::new()
$rule=$null
foreach($line in [IO.File]::ReadLines((Join-Path $root '.gitleaks.toml'))){
    if($line -eq '[[rules]]'){$rule=[ordered]@{id='';pattern='';path=''};continue}
    if($line.StartsWith('[')){$rule=$null;continue}
    if($null -eq $rule){continue}
    if($line -match '^id = "(?<id>[^"]+)"$'){$rule.id=$Matches.id}
    if($line -match "^regex = '''(?<expression>.*)'''$"){$rule.pattern=$Matches.expression;$rules.Add($rule)}
    if($line -match "^path = '''(?<expression>.*)'''$"){$rule.path=$Matches.expression}
}
if($rules.Count -ne 3 -or @($rules|Where-Object {$_.id -notlike 'private-*'}).Count){throw 'Strict privacy rule configuration changed; review the scanner contract.'}
$failures=[Collections.Generic.List[object]]::new()
$checkedBlobs=0
$checkedFiles=0
$checkedEntries=0
$decodedStrings=0
$credentialPattern='(?:^|/)(?:\.ssh|\.creds)(?:/|$)|(?:^|/)(?:cred-[^/]+|credentials?(?:\.[^/]+)?|id_(?:rsa|dsa|ecdsa|ed25[5]19)|[^/]+\.(?:pwd|key)|\.env(?:\.(?:local|production|development|test))?(?:\.local)?)$'

function Test-PrivacyText {
    [CmdletBinding()]
    param([string]$Text,[string]$RelativePath,[int]$ArchiveDepth,[string]$Encoding)
    foreach($privacyRule in $rules){
        if($privacyRule.path -and -not [regex]::IsMatch($RelativePath,$privacyRule.path)){continue}
        $found=[regex]::Matches($Text,$privacyRule.pattern)
        if($found.Count){$failures.Add([ordered]@{file=$RelativePath;ruleId=$privacyRule.id;occurrences=$found.Count;insideArchive=($ArchiveDepth -gt 0);encoding=$Encoding})}
    }
}

function Test-DecodedPrivacyNode {
    [CmdletBinding()]
    param([AllowNull()][object]$Node,[string]$RelativePath,[int]$ArchiveDepth)
    if($Node -is [Collections.IDictionary]){
        foreach($key in $Node.Keys){
            Test-PrivacyText -Text ([string]$key) -RelativePath $RelativePath -ArchiveDepth $ArchiveDepth -Encoding 'decoded-json-key'
            $script:decodedStrings++
            Test-DecodedPrivacyNode -Node $Node[$key] -RelativePath $RelativePath -ArchiveDepth $ArchiveDepth
        }
    }elseif($Node -is [Collections.IList]){
        foreach($item in $Node){Test-DecodedPrivacyNode -Node $item -RelativePath $RelativePath -ArchiveDepth $ArchiveDepth}
    }elseif($Node -is [string]){
        Test-PrivacyText -Text $Node -RelativePath $RelativePath -ArchiveDepth $ArchiveDepth -Encoding 'decoded-json-string'
        $script:decodedStrings++
    }
}

function Test-PrivacyPayload {
    [CmdletBinding()]
    param([byte[]]$Bytes,[string]$RelativePath,[int]$Depth=0)
    if($RelativePath -match $credentialPattern){throw 'A credential-like evidence path was rejected without opening its contents.'}
    $encoding=[Text.Encoding]::UTF8
    if($Bytes.Length -ge 4 -and $Bytes[0] -eq 255 -and $Bytes[1] -eq 254 -and $Bytes[2] -eq 0 -and $Bytes[3] -eq 0){$encoding=[Text.Encoding]::UTF32}
    elseif($Bytes.Length -ge 4 -and $Bytes[0] -eq 0 -and $Bytes[1] -eq 0 -and $Bytes[2] -eq 254 -and $Bytes[3] -eq 255){$encoding=[Text.UTF32Encoding]::new($true,$true)}
    elseif($Bytes.Length -ge 2 -and $Bytes[0] -eq 255 -and $Bytes[1] -eq 254){$encoding=[Text.Encoding]::Unicode}
    elseif($Bytes.Length -ge 2 -and $Bytes[0] -eq 254 -and $Bytes[1] -eq 255){$encoding=[Text.Encoding]::BigEndianUnicode}
    $text=$encoding.GetString($Bytes)
    Test-PrivacyText -Text $text -RelativePath $RelativePath -ArchiveDepth $Depth -Encoding 'raw-text'
    if($RelativePath -match '(?i)\.jsonl?$'){
        if($RelativePath.EndsWith('.jsonl',[StringComparison]::OrdinalIgnoreCase)){
            foreach($line in [regex]::Split($text,'\r\n|\n|\r')){
                if([string]::IsNullOrWhiteSpace($line)){continue}
                $node=$line.TrimStart([char]0xFEFF)|ConvertFrom-Json -AsHashtable -Depth 100 -DateKind String
                Test-DecodedPrivacyNode -Node $node -RelativePath $RelativePath -ArchiveDepth $Depth
            }
        }else{
            $node=$text.TrimStart([char]0xFEFF)|ConvertFrom-Json -AsHashtable -Depth 100 -DateKind String
            Test-DecodedPrivacyNode -Node $node -RelativePath $RelativePath -ArchiveDepth $Depth
        }
    }
    $zipSignature=$Bytes.Length -ge 4 -and $Bytes[0] -eq 80 -and $Bytes[1] -eq 75 -and (($Bytes[2] -eq 3 -and $Bytes[3] -eq 4) -or ($Bytes[2] -eq 5 -and $Bytes[3] -eq 6) -or ($Bytes[2] -eq 7 -and $Bytes[3] -eq 8))
    if(-not $zipSignature -and -not $RelativePath.EndsWith('.zip',[StringComparison]::OrdinalIgnoreCase)){return}
    if($Depth -ge 32){throw 'Archive nesting exceeded the scan contract; refuse publication without completing inspection.'}
    $memory=[IO.MemoryStream]::new($Bytes,$false)
    try{
        try{$archive=[IO.Compression.ZipArchive]::new($memory,[IO.Compression.ZipArchiveMode]::Read,$true)}catch{throw 'An archive could not be inspected completely; publication is blocked.'}
        try{
            foreach($entry in $archive.Entries){
                if($entry.FullName.EndsWith('/')){continue}
                if($entry.FullName -match $credentialPattern){throw 'An archived credential-like path was rejected without opening its entry.'}
                $stream=$entry.Open()
                $entryBytes=[IO.MemoryStream]::new()
                try{$stream.CopyTo($entryBytes);$data=$entryBytes.ToArray()}finally{$stream.Dispose();$entryBytes.Dispose()}
                $script:checkedEntries++
                Test-PrivacyPayload -Bytes $data -RelativePath ($RelativePath+'!/'+$entry.FullName) -Depth ($Depth+1)
            }
        }finally{$archive.Dispose()}
    }finally{$memory.Dispose()}
}

function Read-PrivacyGitBlob {
    [CmdletBinding()]
    param([string]$Object)
    $start=[Diagnostics.ProcessStartInfo]::new()
    $start.FileName='git'
    foreach($argument in @('-C',$root,'cat-file','blob',$Object)){[void]$start.ArgumentList.Add($argument)}
    $start.UseShellExecute=$false
    $start.RedirectStandardOutput=$true
    $start.RedirectStandardError=$true
    $process=[Diagnostics.Process]::new()
    $process.StartInfo=$start
    $buffer=[IO.MemoryStream]::new()
    try{
        [void]$process.Start()
        $copy=$process.StandardOutput.BaseStream.CopyToAsync($buffer)
        $errors=$process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $null=$copy.GetAwaiter().GetResult()
        $null=$errors.GetAwaiter().GetResult()
        if($process.ExitCode -ne 0){throw 'Git evidence blob could not be read.'}
        return ,$buffer.ToArray()
    }finally{$buffer.Dispose();$process.Dispose()}
}

$tracked=@((& git -C $root ls-files -z) -split [char]0|Where-Object {$_})
if($LASTEXITCODE -ne 0){throw 'Tracked path inventory failed.'}
if(@($tracked|Where-Object {$_ -match $credentialPattern}).Count){throw 'Tracked credential-like paths were rejected without opening their contents.'}
if($Staged){
    foreach($relative in @((& git -C $root diff --cached --name-only --diff-filter=ACMR -z) -split [char]0|Where-Object {$_})){
        Test-PrivacyPayload -Bytes (Read-PrivacyGitBlob -Object (':'+$relative)) -RelativePath $relative
        $checkedBlobs++
    }
}else{
    $objects=@(& git -C $root rev-list --all --objects)
    if($LASTEXITCODE -ne 0){throw 'Historical path inventory failed.'}
    $pathsByObject=@{}
    foreach($objectLine in $objects){
        $split=$objectLine.Split(' ',2)
        if($split.Count -eq 2){
            if($split[1] -match $credentialPattern){throw 'Historical credential-like paths were rejected without opening their contents.'}
            $pathsByObject[$split[0]]=$split[1]
        }
    }
    $objectKinds=@($pathsByObject.Keys|& git -C $root cat-file '--batch-check=%(objectname) %(objecttype)')
    if($LASTEXITCODE -ne 0){throw 'Historical blob inventory failed.'}
    foreach($objectKind in $objectKinds){
        $split=$objectKind.Split(' ',2)
        if($split[1] -ne 'blob'){continue}
        Test-PrivacyPayload -Bytes (Read-PrivacyGitBlob -Object $split[0]) -RelativePath $pathsByObject[$split[0]]
        $checkedBlobs++
    }
    foreach($relative in $tracked){
        $cursor=$root
        foreach($part in $relative.Split('/')){
            $cursor=Join-Path $cursor $part
            $item=Get-Item -LiteralPath $cursor -Force -ErrorAction SilentlyContinue
            if($null -ne $item -and $null -ne $item.LinkTarget){throw 'Tracked symbolic-link evidence requires review without reading its target.'}
        }
        $path=Join-Path $root $relative
        if([IO.File]::Exists($path)){Test-PrivacyPayload -Bytes ([IO.File]::ReadAllBytes($path)) -RelativePath $relative;$checkedFiles++}
    }
}
$result=[ordered]@{schema='wordpairs-strict-public-evidence-scan/v1';recordedAt=[DateTimeOffset]::Now.ToString('o');valid=($failures.Count -eq 0);checkedGitBlobs=$checkedBlobs;checkedWorkingFiles=$checkedFiles;checkedArchiveEntries=$script:checkedEntries;decodedStringValuesAndKeys=$script:decodedStrings;failures=$failures.ToArray();inheritedSecretScannerExclusionsApplied=$false;credentialFilesOpened=0}
if($ReportPath){$result|ConvertTo-Json -Depth 30|Set-Content -LiteralPath $ReportPath -Encoding utf8}
$result|ConvertTo-Json -Depth 30
if($failures.Count){throw 'Strict public-evidence privacy checks failed.'}
