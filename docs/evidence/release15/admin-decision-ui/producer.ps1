#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([switch]$WholeAdminFile,[ValidatePattern('^[a-z0-9-]+$')][string]$Attempt='v2')
$ErrorActionPreference='Stop'
$repo='<repo>'
$name=if($WholeAdminFile){'admin-file'}else{'assertion-gate'}
$folder=Join-Path $repo "docs/evidence/release15/admin-decision-ui/$name-$Attempt"
if(-not $PSCmdlet.ShouldProcess($folder,'Run isolated actual-rendered administrator UI cases and retain native evidence')){return}
[void][IO.Directory]::CreateDirectory($folder)
$env:WORDPAIRS_BROWSER_PATH='/usr/bin/chromium'
$env:PLAYWRIGHT_JUNIT_OUTPUT_FILE=Join-Path $folder 'browser.xml'
$argsList=@('exec','playwright','--','test','tests/browser/admin.phase6.spec.ts','--config=playwright.pwa.config.ts','--reporter=line,junit')
if(-not $WholeAdminFile){$argsList+=@('--grep','FR-23-C01')}
$started=Get-Date -Format s
$source=@(foreach($path in @('tests/browser/admin.phase6.spec.ts','tests/browser/admin-decision-fixture.ts','src/web/content-panel.tsx','src/domain/content.ts','src/application/content.ts')){@{path=$path;sha256=(Get-FileHash -LiteralPath (Join-Path $repo $path)).Hash}})
$runId=[guid]::NewGuid().ToString()
Push-Location $repo
try{& npm @argsList 2>&1|Tee-Object -FilePath (Join-Path $folder 'browser.log');$exitCode=$LASTEXITCODE}finally{Pop-Location}
$cases=@();$failed=@();$skipped=@()
if(Test-Path -LiteralPath $env:PLAYWRIGHT_JUNIT_OUTPUT_FILE){[xml]$xml=Get-Content -LiteralPath $env:PLAYWRIGHT_JUNIT_OUTPUT_FILE -Raw;$cases=@($xml.SelectNodes('//testcase'));$failed=@($cases|Where-Object{$_.SelectSingleNode('failure|error')});$skipped=@($cases|Where-Object{$_.SelectSingleNode('skipped')})}
$receipt=[ordered]@{runId=$runId;host=[Environment]::MachineName;startedAtLocal=$started;finishedAtLocal=(Get-Date -Format s);parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261030T203656Z-cline-beam-release';ownSessionId='Codex-20261030T200118Z-plugin-session';ownRequestId='req-20261030T210822Z-admin-decision-ui';executable='npm';arguments=$argsList;producer=$PSCommandPath;producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;source=$source;sourceHead=(& git -C $repo rev-parse HEAD).Trim();exitCode=$exitCode;tests=$cases.Count;failed=$failed.Count;skipped=$skipped.Count;caseNames=@($cases|ForEach-Object{$_.GetAttribute('name')});negativeControls=if($failed.Count -eq 0 -and $cases.Count){@('approve/wrong-status','reject/wrong-reason','overturn/missing-history','original-reviewer/self-resolution','proposer/self-resolution')}else{@()};qualification='Actual React UI in Chromium with independent isolated HTTP snapshots. Existing application build remains unchanged; test source is dirty and source-hashed. Not live GitHub, PostgreSQL, hosted or hostile-approval evidence.'}
$receipt|ConvertTo-Json -Depth 12|Set-Content -LiteralPath (Join-Path $folder 'invocation.json')
$receipt|ConvertTo-Json -Depth 12
if($exitCode -ne 0 -or $failed.Count -or $skipped.Count -or -not $cases.Count){throw 'Administrator UI focused verification failed; preserve receipts before correcting tests.'}
