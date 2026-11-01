#Requires -Version 7.0
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSReviewUnusedParameter','',Justification='Pester container parameters are consumed in its BeforeAll execution scope.')]
[CmdletBinding()]
param([string]$RepositoryRoot,[string]$GitleaksPath='gitleaks')

BeforeAll {
    $script:exporter=Join-Path $RepositoryRoot 'scripts/Export-PublicReview.ps1'
    $script:config=Join-Path $RepositoryRoot '.gitleaks.toml'
    $script:scanner=$GitleaksPath
    function Invoke-ExportFixture {
        param([object[]]$Events,[string]$Root)
        $source=Join-Path $Root 'review.response.jsonl'
        $output=Join-Path $Root 'review.public.response.jsonl'
        $retention=Join-Path $Root 'private-originals'
        $events|ForEach-Object { $_|ConvertTo-Json -Depth 100 -Compress }|Set-Content -LiteralPath $source
        $script:lastSourceHash=(Get-FileHash -LiteralPath $source).Hash
        $null=& $script:exporter -SourcePath $source -OutputPath $output -RepositoryRoot (Join-Path $Root 'repo') -PrivateRetentionRoot $retention
        return ,@(Get-Content -LiteralPath $output|ForEach-Object { $_|ConvertFrom-Json -AsHashtable -Depth 100 })
    }
    function Invoke-ScanFixture {
        param([string]$Root,[string]$RelativeFile,[string]$Text)
        $target=Join-Path $Root $RelativeFile
        [void][IO.Directory]::CreateDirectory((Split-Path -Parent $target))
        [IO.File]::WriteAllText($target,$Text)
        $report=Join-Path $TestDrive ([guid]::NewGuid().ToString()+'.json')
        $null=& $script:scanner dir $Root --config $script:config --redact=100 --no-banner --log-level error --report-format json --report-path $report 2>$null
        $code=$LASTEXITCODE
        if($code -notin @(0,1)){throw "Scanner failure: $code"}
        $findings=if(Test-Path -LiteralPath $report){@(Get-Content -LiteralPath $report -Raw|ConvertFrom-Json)}else{@()}
        return [pscustomobject]@{exitCode=$code;findings=$findings}
    }
}

Describe 'Allowlisted public review export' {
    BeforeEach {
        $caseRoot=Join-Path $TestDrive ([guid]::NewGuid().ToString())
        [void][IO.Directory]::CreateDirectory((Join-Path $caseRoot 'repo/src'))
    }
    It 'preserves repository source content, verdict and other event values' {
        $sourceFile=Join-Path $caseRoot 'repo/src/score.ts'
        $events=@(@{type='user';tool_use_result=@{file=@{filePath=$sourceFile;content='export const score = 5;'};untouched=17}},@{type='result';result='AGREE: score remains 5';accuracy=98})
        $result=Invoke-ExportFixture -Events $events -Root $caseRoot
        $result[0].tool_use_result.file.content|Should -BeExactly 'export const score = 5;'
        $result[0].tool_use_result.file.filePath|Should -BeExactly '<repo>/src/score.ts'
        $result[0].tool_use_result.untouched|Should -Be 17
        $result[1].result|Should -BeExactly 'AGREE: score remains 5'
        $result[1].accuracy|Should -Be 98
    }
    It 'redacts an external file body and the same text echoed in a message tool result' {
        $privateValue='synthetic-private-context-canary'
        $events=@(@{type='user';tool_use_result=@{file=@{filePath='/outside/private/memory.txt';content=$privateValue}};message=@{content=@(@{type='tool_result';content='prefix '+$privateValue+' suffix'})}})
        $result=Invoke-ExportFixture -Events $events -Root $caseRoot
        $result[0].tool_use_result.file.content|Should -BeExactly '[PRIVATE OPERATOR CONTEXT REDACTED; ORIGINAL RETAINED PRIVATELY]'
        $result[0].message.content[0].content|Should -Not -Match $privateValue
    }
    It 'defaults an unaddressed file result to private instead of exporting an unknown body' {
        $events=@(@{type='user';tool_use_result=@{file=@{content='synthetic-unaddressed-context'}}})
        $result=Invoke-ExportFixture -Events $events -Root $caseRoot
        $result[0].tool_use_result.file.content|Should -BeExactly '[PRIVATE OPERATOR CONTEXT REDACTED; ORIGINAL RETAINED PRIVATELY]'
    }
    It 'redacts numbered and normalized echoes of a private multiline Read body' {
        $privateBody="synthetic operator context`nArtifact /home/fixtureuser/private/note.txt"
        $arrow=[char]0x2192
        $wrapped="Read output:`n  1${arrow}synthetic operator context`n  2${arrow}Artifact <home>/private/note.txt`nEnd output"
        $events=@(@{type='user';tool_use_result=@{file=@{filePath='/outside/context.md';content=$privateBody}};message=@{content=@(@{type='tool_result';content=$wrapped})}})
        $result=Invoke-ExportFixture -Events $events -Root $caseRoot
        $result[0].message.content[0].content|Should -BeExactly '[PRIVATE OPERATOR CONTEXT REDACTED; ORIGINAL RETAINED PRIVATELY]'
    }
    It 'redacts repository Git and credential-like reads while allowing explicit environment templates' {
        $repo=Join-Path $caseRoot 'repo'
        $denied=@('.git/config','.env','.env.local','.env.production','credentials.json','private-key.pem','client_secret.json','access-token.txt','id_rsa')
        $events=@(foreach($relative in $denied){@{type='user';tool_use_result=@{file=@{filePath=(Join-Path $repo $relative);content='synthetic credential-like read'}}}})
        $events+=@{type='user';tool_use_result=@{file=@{filePath=(Join-Path $repo '.env.example');content='PUBLIC_SETTING=example'}}}
        $result=Invoke-ExportFixture -Events $events -Root $caseRoot
        foreach($item in @($result|Select-Object -First $denied.Count)){$item.tool_use_result.file.content|Should -BeExactly '[PRIVATE OPERATOR CONTEXT REDACTED; ORIGINAL RETAINED PRIVATELY]'}
        $result[-1].tool_use_result.file.content|Should -BeExactly 'PUBLIC_SETTING=example'
    }
    It 'redacts unlinked external Read tool results and unknown Read paths' {
        $events=@(@{type='assistant';message=@{content=@(@{type='tool_use';name='Read';id='external';input=@{file_path='/outside/context.md'}},@{type='tool_use';name='Read';id='unknown';input=@{}})}},@{type='user';message=@{content=@(@{type='tool_result';tool_use_id='external';content='synthetic-external'},@{type='tool_result';tool_use_id='unknown';content='synthetic-unknown'})}})
        $result=Invoke-ExportFixture -Events $events -Root $caseRoot
        foreach($block in $result[1].message.content){$block.content|Should -BeExactly '[PRIVATE OPERATOR CONTEXT REDACTED; ORIGINAL RETAINED PRIVATELY]'}
    }
    It 'rejects dependency files, traversal, sibling-prefix tricks and cache contexts' {
        $repo=Join-Path $caseRoot 'repo'
        $denied=@((Join-Path $repo 'node_modules/package/index.js'),(Join-Path $repo '../outside/context.md'),($repo+'-sibling/context.md'),(Join-Path $repo 'local-review-cache-a/session-state.yaml'))
        $events=foreach($path in $denied){@{type='user';tool_use_result=@{file=@{filePath=$path;content='synthetic-denied'}}}}
        $result=Invoke-ExportFixture -Events $events -Root $caseRoot
        foreach($item in $result){$item.tool_use_result.file.content|Should -BeExactly '[PRIVATE OPERATOR CONTEXT REDACTED; ORIGINAL RETAINED PRIVATELY]'}
    }
    It 'redacts symlink traversal instead of treating it as repository evidence' -Skip:$IsWindows {
        [void][IO.Directory]::CreateDirectory((Join-Path $caseRoot 'outside'))
        $null=New-Item -ItemType SymbolicLink -Path (Join-Path $caseRoot 'repo/link') -Target (Join-Path $caseRoot 'outside')
        $events=@(@{type='user';tool_use_result=@{file=@{filePath=(Join-Path $caseRoot 'repo/link/context.md');content='synthetic-linked-private'}}})
        $result=Invoke-ExportFixture -Events $events -Root $caseRoot
        $result[0].tool_use_result.file.content|Should -BeExactly '[PRIVATE OPERATOR CONTEXT REDACTED; ORIGINAL RETAINED PRIVATELY]'
    }
    It 'redacts hook bodies and normalizes arbitrary absolute home paths' {
        $homePath='/home/'+'fixtureuser'+'/workspace/note.txt'
        $events=@(@{type='system';stdout='synthetic-hook-context';additionalContext='synthetic-hook-guidance'},@{type='result';result='Artifact '+$homePath})
        $result=Invoke-ExportFixture -Events $events -Root $caseRoot
        $result[0].stdout|Should -BeExactly '[PRIVATE OPERATOR CONTEXT REDACTED; ORIGINAL RETAINED PRIVATELY]'
        $result[0].additionalContext|Should -BeExactly '[PRIVATE OPERATOR CONTEXT REDACTED; ORIGINAL RETAINED PRIVATELY]'
        $result[1].result|Should -BeExactly 'Artifact <home>/workspace/note.txt'
    }
    It 'retains byte-identical originals privately and reruns without duplicates' {
        $events=@(@{type='result';result='verdict fixture'})
        $null=Invoke-ExportFixture -Events $events -Root $caseRoot
        $null=Invoke-ExportFixture -Events $events -Root $caseRoot
        $retained=@(Get-ChildItem -LiteralPath (Join-Path $caseRoot 'private-originals') -File)
        $retained.Count|Should -Be 1
        (Get-FileHash -LiteralPath $retained[0].FullName).Hash|Should -BeExactly $script:lastSourceHash
        $receipt=Get-Content -LiteralPath (Join-Path $caseRoot 'review.public.response.jsonl.receipt.json') -Raw|ConvertFrom-Json
        $receipt.originalRetainedPrivately|Should -BeTrue
        $receipt.privateRetentionPathPublished|Should -BeFalse
        $receipt.executionOrReviewAcceptanceEstablished|Should -BeFalse
    }
    It 'does not read or write source evidence under WhatIf' {
        $missing=Join-Path $caseRoot 'missing.response.jsonl'
        [IO.File]::WriteAllText($missing,'deliberately invalid JSON')
        $output=Join-Path $caseRoot 'preview.public.response.jsonl'
        $null=& $script:exporter -SourcePath $missing -OutputPath $output -RepositoryRoot (Join-Path $caseRoot 'repo') -PrivateRetentionRoot (Join-Path $caseRoot 'private') -WhatIf
        Test-Path -LiteralPath $output|Should -BeFalse
        Test-Path -LiteralPath (Join-Path $caseRoot 'private')|Should -BeFalse
    }
    It 'fails closed on malformed JSON before publication' {
        $source=Join-Path $caseRoot 'invalid.response.jsonl'
        [IO.File]::WriteAllText($source,'not JSON')
        $output=Join-Path $caseRoot 'invalid.public.response.jsonl'
        {& $script:exporter -SourcePath $source -OutputPath $output -RepositoryRoot (Join-Path $caseRoot 'repo') -PrivateRetentionRoot (Join-Path $caseRoot 'private')}|Should -Throw
        Test-Path -LiteralPath $output|Should -BeFalse
    }
    It 'refuses private retention inside the public repository' {
        $source=Join-Path $caseRoot 'retention.response.jsonl'
        [IO.File]::WriteAllText($source,'{}')
        {& $script:exporter -SourcePath $source -OutputPath (Join-Path $caseRoot 'retention.public.response.jsonl') -RepositoryRoot (Join-Path $caseRoot 'repo') -PrivateRetentionRoot (Join-Path $caseRoot 'repo/private')}|Should -Throw '*outside*'
    }
    It 'refuses a retention symlink that would publish original bodies inside the repository' -Skip:$IsWindows {
        $source=Join-Path $caseRoot 'linked-retention.response.jsonl'
        [IO.File]::WriteAllText($source,'{}')
        [void][IO.Directory]::CreateDirectory((Join-Path $caseRoot 'repo/private'))
        $null=New-Item -ItemType SymbolicLink -Path (Join-Path $caseRoot 'retention-link') -Target (Join-Path $caseRoot 'repo/private')
        {& $script:exporter -SourcePath $source -OutputPath (Join-Path $caseRoot 'linked-retention.public.response.jsonl') -RepositoryRoot (Join-Path $caseRoot 'repo') -PrivateRetentionRoot (Join-Path $caseRoot 'retention-link')}|Should -Throw '*symbolic link*'
    }
    It 'refuses a pre-existing retained-file symlink before hashing its target' -Skip:$IsWindows {
        $source=Join-Path $caseRoot 'retained-link.response.jsonl'
        [IO.File]::WriteAllText($source,'{}')
        $retention=Join-Path $caseRoot 'private-retention'
        [void][IO.Directory]::CreateDirectory($retention)
        $target=Join-Path $caseRoot 'repo/src/public-copy.json'
        [IO.File]::WriteAllText($target,'{}')
        $name=[IO.Path]::GetFileName($source)+'.'+(Get-FileHash -LiteralPath $source).Hash.ToLowerInvariant()+'.original'
        $null=New-Item -ItemType SymbolicLink -Path (Join-Path $retention $name) -Target $target
        {& $script:exporter -SourcePath $source -OutputPath (Join-Path $caseRoot 'retained-link.public.response.jsonl') -RepositoryRoot (Join-Path $caseRoot 'repo') -PrivateRetentionRoot $retention}|Should -Throw '*symbolic link*'
    }
}

Describe 'Native privacy rule negative controls' {
    It 'rejects every specified operator reconnaissance marker' {
        $markers=@(('10'+'.42'+'.0.'),('LAB'+'-OMARCHY'),('PAYTON'+'-LEGION'+'2'),('LEGION'+'2'),('ki'+'ngd'),('id_ed25'+'519'),('authorized_'+'keys'),('cred-legion'+'2'),('legion'+'2-github'),('MEMORY-'+'INFRA-'),('MEMORY-'+'PROCEDURE-'),('MEMORY-'+'PROCESS-'),('/home/'+'sharp'+'ninja/'+'.claude/'),('/home/'+'sharp'+'ninja/'+'.codex/'),('/home/'+'alice/'+'.ssh/'))
        $markerIndex=0
        foreach($marker in $markers){
            $root=Join-Path $TestDrive ([guid]::NewGuid().ToString())
            $scan=Invoke-ScanFixture -Root $root -RelativeFile 'docs/evidence.txt' -Text ('fixture '+$marker+' forbidden')
            $scan.exitCode|Should -Be 1 -Because ('marker index '+$markerIndex+' must be rejected')
            @($scan.findings|Where-Object RuleID -In @('private-operator-context','private-agent-home')).Count|Should -BeGreaterThan 0
            $markerIndex++
        }
    }
    It 'rejects all private IPv4 ranges in docs while allowing public and loopback addresses' {
        foreach($ip in @((10,0,0,1 -join '.'),(172,16,0,1 -join '.'),(172,31,255,254 -join '.'),(192,168,5,4 -join '.'))){
            $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/network.txt' -Text $ip
            @($scan.findings|Where-Object RuleID -EQ 'private-network-in-documentation').Count|Should -Be 1
        }
        foreach($ip in @((127,0,0,1 -join '.'),(8,8,8,8 -join '.'),(172,32,0,1 -join '.'))){
            $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/network.txt' -Text $ip
            $scan.exitCode|Should -Be 0
        }
    }
    It 'rejects case-folded host share key and coordination metadata without relying on exact capitalization' {
        $markers=@(('lab'+'-omarchy'),('PaYtOn'+'-LeGiOn'+'2'),('legion'+'2'),('Id_Ed25'+'519'),('AuThOrIzEd_'+'KeYs'),('CrEd-LeGiOn'+'2'),('LeGiOn'+'2-GiThUb'),('memory-'+'infra-'),('MeMoRy-'+'PrOcEdUrE-'),('mEmOrY-'+'pRoCeSs-'),('qb-'+'agent-00'+'1'),('/HOME/'+'FixtureUser/'+'.CoDeX/'))
        foreach($marker in $markers){
            $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/casefold.json' -Text ('{"context":"'+$marker+'"}')
            $scan.exitCode|Should -Be 1
            @($scan.findings|Where-Object RuleID -In @('private-operator-context','private-agent-home')).Count|Should -BeGreaterThan 0
        }
    }
    It 'bounds case-folded private usernames while preserving unrelated legal and programming words' {
        foreach($text in @(('ki'+'ngd'),('Ki'+'NgD'),('/users/KI'+'NGD/'),('user="kI'+'nGd"'))){
            $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/account.txt' -Text $text
            @($scan.findings|Where-Object RuleID -EQ 'private-operator-context').Count|Should -BeGreaterThan 0
        }
        foreach($text in @('Kingdom',('king'+'dom'),'WorkingDirectory','workingdirectory','workingdir','QBrain.AI',('ki'+'ngd-user'),('ki'+'ngd_user'),('usernameki'+'ngd'))){
            $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/legal.txt' -Text $text
            $scan.exitCode|Should -Be 0
        }
    }
    It 'finds lower and mixed-case private metadata in decoded staged JSON and compressed JSON keys' {
        $repo=Join-Path $TestDrive 'casefold-encoded-repo'
        [void][IO.Directory]::CreateDirectory((Join-Path $repo 'docs'))
        Copy-Item -LiteralPath $script:config -Destination (Join-Path $repo '.gitleaks.toml')
        $null=& git -C $repo init --quiet
        $json='{"context":"la\u0062-'+'omarchy"}'
        [IO.File]::WriteAllText((Join-Path $repo 'docs/context.json'),$json)
        $null=& git -C $repo add docs/context.json
        {& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo -Staged}|Should -Throw '*Strict public-evidence*'
        $null=& git -C $repo rm --cached --quiet docs/context.json
        $zip=[IO.Compression.ZipFile]::Open((Join-Path $repo 'docs/encoded.zip'),[IO.Compression.ZipArchiveMode]::Create)
        try{
            $entry=$zip.CreateEntry('docs/context.jsonl')
            $writer=[IO.StreamWriter]::new($entry.Open())
            try{$writer.WriteLine('{"PaYtOn-LEgI\u004fN'+'2":"fixture"}')}finally{$writer.Dispose()}
        }finally{$zip.Dispose()}
        $null=& git -C $repo add docs/encoded.zip
        {& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo -Staged}|Should -Throw '*Strict public-evidence*'
    }
    It 'does not let hash-manifest exceptions hide operator data' {
        $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/source-hashes.json' -Text ('{"source":"LAB'+'-OMARCHY"}')
        $scan.exitCode|Should -Be 1
    }
    It 'limits verified SHA-256 exceptions to exact manifest fields and paths' {
        $digest='d9d86461a48df271eab38887e096a8e6dc6bfca0469ab759b84a4337b9356b1c'
        $examples=@(@{path='docs/evidence/phase6/source-hashes.json';text='{"guest-credential.ts": "'+$digest+'"}'},@{path='docs/phase6_review_receipt.jsonl';text='{"guest-credential.ts":"'+$digest+'"}'})
        foreach($example in $examples){
            $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile $example.path -Text $example.text
            $scan.exitCode|Should -Be 0
        }
        $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/ordinary.json' -Text ('{"api_key":"'+$digest+'"}')
        $scan.exitCode|Should -Be 1
        $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/evidence/phase6/source-hashes.json' -Text ('{"api_key":"'+$digest+'"}')
        $scan.exitCode|Should -Be 1
    }
    It 'allows only the explicit synthetic fixture credential prefix' {
        $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'tests/fixture.txt' -Text ('api_key="fixture-secret-'+'abc1230123456789abcdef0123456789"')
        $scan.exitCode|Should -Be 0
    }
    It 'limits HTML identifier exceptions to the exact field and source directory' {
        $identifier='a83bf19d704e6c528af307d19e4bca65'
        $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/submission/sources/example.html' -Text ('{"_key":"'+$identifier+'"}')
        $scan.exitCode|Should -Be 0
        $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/submission/sources/example.html' -Text ('{"api_key":"'+$identifier+'"}')
        $scan.exitCode|Should -Be 1
        $scan=Invoke-ScanFixture -Root (Join-Path $TestDrive ([guid]::NewGuid().ToString())) -RelativeFile 'docs/ordinary.html' -Text ('{"_key":"'+$identifier+'"}')
        $scan.exitCode|Should -Be 1
    }
    It 'rejects a staged leak through the installed executable hook and accepts a clean replacement' {
        $hookRepo=Join-Path $TestDrive 'hook-repo'
        [void][IO.Directory]::CreateDirectory((Join-Path $hookRepo 'scripts'))
        [void][IO.Directory]::CreateDirectory((Join-Path $hookRepo '.githooks'))
        Copy-Item -LiteralPath (Join-Path $RepositoryRoot 'scripts/Invoke-PrivacyCheck.ps1') -Destination (Join-Path $hookRepo 'scripts/Invoke-PrivacyCheck.ps1')
        Copy-Item -LiteralPath (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -Destination (Join-Path $hookRepo 'scripts/Test-PrivateEvidence.ps1')
        Copy-Item -LiteralPath (Join-Path $RepositoryRoot '.githooks/pre-commit') -Destination (Join-Path $hookRepo '.githooks/pre-commit')
        Copy-Item -LiteralPath $script:config -Destination (Join-Path $hookRepo '.gitleaks.toml')
        if(-not $IsWindows){[IO.File]::SetUnixFileMode((Join-Path $hookRepo '.githooks/pre-commit'),[IO.UnixFileMode]493)}
        $null=& git -C $hookRepo init --quiet
        $null=& git -C $hookRepo config core.hooksPath .githooks
        [IO.File]::WriteAllText((Join-Path $hookRepo 'evidence.txt'),('LAB'+'-OMARCHY'))
        $null=& git -C $hookRepo add evidence.txt
        $null=& git -C $hookRepo hook run pre-commit 2>$null
        $LASTEXITCODE|Should -Not -Be 0
        [IO.File]::WriteAllText((Join-Path $hookRepo 'evidence.txt'),'public evidence')
        $null=& git -C $hookRepo add evidence.txt
        $null=& git -C $hookRepo hook run pre-commit 2>$null
        $LASTEXITCODE|Should -Be 0
    }
    It 'rejects private text in staged SVG evidence despite inherited native exclusions' {
        $repo=Join-Path $TestDrive 'svg-repo'
        [void][IO.Directory]::CreateDirectory((Join-Path $repo 'docs'))
        Copy-Item -LiteralPath $script:config -Destination (Join-Path $repo '.gitleaks.toml')
        $null=& git -C $repo init --quiet
        [IO.File]::WriteAllText((Join-Path $repo 'docs/frame.svg'),('<svg>LAB'+'-OMARCHY</svg>'))
        $null=& git -C $repo add docs/frame.svg
        {& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo -Staged}|Should -Throw '*Strict public-evidence*'
    }
    It 'preserves executable hook mode through native Git commit and fresh clone without fixture chmod' -Skip:$IsWindows {
        $sourceMode=(& git -C $RepositoryRoot ls-files --stage -- '.githooks/pre-commit') -join ''
        $sourceMode|Should -Match '^100755 ' -Because 'working chmod alone does not prove the committed hook is executable'
        $seed=Join-Path $TestDrive 'clone-hook-seed'
        $clone=Join-Path $TestDrive 'clone-hook-checkout'
        foreach($relative in @('.githooks/pre-commit','.gitattributes','.gitleaks.toml','scripts/Invoke-PrivacyCheck.ps1','scripts/Test-PrivateEvidence.ps1')){
            $target=Join-Path $seed $relative
            [void][IO.Directory]::CreateDirectory((Split-Path -Parent $target))
            Copy-Item -LiteralPath (Join-Path $RepositoryRoot $relative) -Destination $target
        }
        $null=& git -C $seed init --quiet
        $null=& git -C $seed config core.filemode true
        $null=& git -C $seed add .
        $seedMode=(& git -C $seed ls-files --stage -- '.githooks/pre-commit') -join ''
        $seedMode|Should -Match '^100755 '
        $null=& git -C $seed -c core.hooksPath=.isolated-fixture-hooks -c user.name=Fixture -c user.email=fixture@example.invalid commit --quiet -m 'Executable privacy hook round-trip fixture'
        $LASTEXITCODE|Should -Be 0
        $null=& git clone --no-local --quiet -- $seed $clone
        $LASTEXITCODE|Should -Be 0
        $clonedMode=(& git -C $clone ls-files --stage -- '.githooks/pre-commit') -join ''
        $clonedMode|Should -Match '^100755 '
        $mode=[int](Get-Item -LiteralPath (Join-Path $clone '.githooks/pre-commit') -Force).UnixFileMode
        ($mode -band [int][IO.UnixFileMode]::UserExecute)|Should -BeGreaterThan 0
        $null=& git -C $clone config core.hooksPath .githooks
        [IO.File]::WriteAllText((Join-Path $clone 'public.txt'),'public staged fixture')
        $null=& git -C $clone add public.txt
        $null=& git -C $clone hook run pre-commit 2>$null
        $LASTEXITCODE|Should -Be 0
        [void][IO.Directory]::CreateDirectory((Join-Path $clone 'docs'))
        [IO.File]::WriteAllText((Join-Path $clone 'docs/private.txt'),('lab'+'-omarchy'))
        $null=& git -C $clone add docs/private.txt
        $null=& git -C $clone hook run pre-commit 2>$null
        $LASTEXITCODE|Should -Not -Be 0
    }
    It 'inspects compressed staged evidence entries including excluded SVG extensions' {
        $repo=Join-Path $TestDrive 'archive-repo'
        [void][IO.Directory]::CreateDirectory((Join-Path $repo 'docs'))
        Copy-Item -LiteralPath $script:config -Destination (Join-Path $repo '.gitleaks.toml')
        $null=& git -C $repo init --quiet
        $zip=[IO.Compression.ZipFile]::Open((Join-Path $repo 'docs/evidence.zip'),[IO.Compression.ZipArchiveMode]::Create)
        try{
            $entry=$zip.CreateEntry('docs/frame.svg')
            $writer=[IO.StreamWriter]::new($entry.Open())
            try{$writer.Write('<svg>PAYTON'+'-LEGION'+'2</svg>')}finally{$writer.Dispose()}
        }finally{$zip.Dispose()}
        $null=& git -C $repo add docs/evidence.zip
        {& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo -Staged}|Should -Throw '*Strict public-evidence*'
    }
    It 'refuses credential-like tracked paths before inspecting blob contents' {
        $repo=Join-Path $TestDrive 'credential-path-repo'
        [void][IO.Directory]::CreateDirectory($repo)
        Copy-Item -LiteralPath $script:config -Destination (Join-Path $repo '.gitleaks.toml')
        $null=& git -C $repo init --quiet
        [IO.File]::WriteAllText((Join-Path $repo '.env.local'),'synthetic non-secret fixture')
        $null=& git -C $repo add .env.local
        {& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo -Staged}|Should -Throw '*without opening*'
    }
    It 'finds a historical SVG leak after a clean replacement in an isolated repository' {
        $repo=Join-Path $TestDrive 'historical-svg-repo'
        [void][IO.Directory]::CreateDirectory((Join-Path $repo 'docs'))
        Copy-Item -LiteralPath $script:config -Destination (Join-Path $repo '.gitleaks.toml')
        $null=& git -C $repo init --quiet
        [IO.File]::WriteAllText((Join-Path $repo 'docs/frame.svg'),('<svg>LAB'+'-OMARCHY</svg>'))
        $null=& git -C $repo add docs/frame.svg
        $null=& git -C $repo -c core.hooksPath=.isolated-fixture-hooks -c user.name=Fixture -c user.email=fixture@example.invalid commit --quiet -m 'Synthetic history fixture'
        if($LASTEXITCODE -ne 0){throw 'Isolated Git fixture commit failed.'}
        [IO.File]::WriteAllText((Join-Path $repo 'docs/frame.svg'),'<svg>public fixture</svg>')
        $null=& git -C $repo add docs/frame.svg
        {& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo}|Should -Throw '*Strict public-evidence*'
    }
    It 'does not traverse untracked build caches when checking a public working tree' {
        $repo=Join-Path $TestDrive 'tracked-projection-repo'
        [void][IO.Directory]::CreateDirectory((Join-Path $repo '.next/cache'))
        Copy-Item -LiteralPath $script:config -Destination (Join-Path $repo '.gitleaks.toml')
        $null=& git -C $repo init --quiet
        [IO.File]::WriteAllText((Join-Path $repo 'public.txt'),'public evidence')
        $null=& git -C $repo add public.txt
        $null=& git -C $repo -c core.hooksPath=.isolated-fixture-hooks -c user.name=Fixture -c user.email=fixture@example.invalid commit --quiet -m 'Synthetic projection fixture'
        if($LASTEXITCODE -ne 0){throw 'Isolated Git fixture commit failed.'}
        [IO.File]::WriteAllText((Join-Path $repo '.next/cache/private.txt'),('LAB'+'-OMARCHY'))
        $result=& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo|ConvertFrom-Json
        $result.valid|Should -BeTrue
        $result.checkedWorkingFiles|Should -Be 1
    }
    It 'rejects encoded host keys and escaped private home paths in staged JSON' {
        $repo=Join-Path $TestDrive 'encoded-json-repo'
        [void][IO.Directory]::CreateDirectory((Join-Path $repo 'docs'))
        Copy-Item -LiteralPath $script:config -Destination (Join-Path $repo '.gitleaks.toml')
        $null=& git -C $repo init --quiet
        $hostValue='LAB'+'-OMARCHY'
        $node=[ordered]@{}
        $node[$hostValue]='safe value'
        $node.path='/home/'+'alice/'+'.claude/'+'context.txt'
        $json=($node|ConvertTo-Json -Compress).Replace($hostValue,('L\u0041B-'+'OMARCHY')).Replace('/','\/')
        [IO.File]::WriteAllText((Join-Path $repo 'docs/context.json'),$json)
        $null=& git -C $repo add docs/context.json
        {& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo -Staged}|Should -Throw '*Strict public-evidence*'
    }
    It 'decodes JSONL strings within ZIP entries before checking private context' {
        $repo=Join-Path $TestDrive 'encoded-archive-repo'
        [void][IO.Directory]::CreateDirectory((Join-Path $repo 'docs'))
        Copy-Item -LiteralPath $script:config -Destination (Join-Path $repo '.gitleaks.toml')
        $null=& git -C $repo init --quiet
        $hostValue='PAYTON'+'-LEGION'+'2'
        $json=(@{context=$hostValue}|ConvertTo-Json -Compress).Replace($hostValue,('PAYTON-LEGI\u004fN'+'2'))
        $zip=[IO.Compression.ZipFile]::Open((Join-Path $repo 'docs/encoded.zip'),[IO.Compression.ZipArchiveMode]::Create)
        try{
            $entry=$zip.CreateEntry('docs/context.jsonl')
            $writer=[IO.StreamWriter]::new($entry.Open())
            try{$writer.WriteLine($json)}finally{$writer.Dispose()}
        }finally{$zip.Dispose()}
        $null=& git -C $repo add docs/encoded.zip
        {& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo -Staged}|Should -Throw '*Strict public-evidence*'
    }
    It 'refuses an unreadable archive rather than reporting a clean inspection' {
        $repo=Join-Path $TestDrive 'malformed-archive-repo'
        [void][IO.Directory]::CreateDirectory((Join-Path $repo 'docs'))
        Copy-Item -LiteralPath $script:config -Destination (Join-Path $repo '.gitleaks.toml')
        $null=& git -C $repo init --quiet
        [IO.File]::WriteAllText((Join-Path $repo 'docs/broken.zip'),'not a ZIP file')
        $null=& git -C $repo add docs/broken.zip
        {& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo -Staged}|Should -Throw '*could not be inspected completely*'
    }
    It 'checks BOM encoded text and decoded JSON strings in every supported Unicode byte order' {
        $encodings=@([Text.Encoding]::Unicode,[Text.Encoding]::BigEndianUnicode,[Text.Encoding]::UTF32,[Text.UTF32Encoding]::new($true,$true))
        $caseIndex=0
        foreach($encoding in $encodings){
            $repo=Join-Path $TestDrive ('bom-repo-'+$caseIndex)
            [void][IO.Directory]::CreateDirectory((Join-Path $repo 'docs'))
            Copy-Item -LiteralPath $script:config -Destination (Join-Path $repo '.gitleaks.toml')
            $null=& git -C $repo init --quiet
            $json='{"context":"L\u0041B-'+'OMARCHY"}'
            [IO.File]::WriteAllBytes((Join-Path $repo 'docs/context.json'),[byte[]]($encoding.GetPreamble()+$encoding.GetBytes($json)))
            $null=& git -C $repo add docs/context.json
            {& (Join-Path $RepositoryRoot 'scripts/Test-PrivateEvidence.ps1') -RepositoryRoot $repo -Staged}|Should -Throw '*Strict public-evidence*'
            $caseIndex++
        }
    }
}
