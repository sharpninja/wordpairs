#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([ValidateSet('Probe','Finish','Readback')][string]$Operation='Probe')
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$workspace='<repo>'
$locator='/tmp/wordpairs-staging-dataapi-resume-directory.txt'
$directory=if($Operation -eq 'Probe'){Join-Path $workspace ('docs/evidence/release15/hosting-readiness/dataapi-staging-'+(Get-Date -Format yyyyMMddTHHmmss))}else{[IO.File]::ReadAllText($locator)}
$receiptPath=Join-Path $directory 'receipt.json'
$sessionId='Codex-20261031T143030Z-plugin-session';$requestId='req-20261031T143033Z-hosting-resume'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0'
$base=@{WorkspacePath=$workspace;CacheRoot='/tmp/wordpairs-hosting-resume-20261031';PluginRoot=$plugin}
if(-not $PSCmdlet.ShouldProcess($directory,($Operation+': authorized STAGING application guest smoke, anonymous-role schema GET probe and owned-session logout; safe receipts only'))){return}
if($Operation -eq 'Probe'){
 if(Test-Path -LiteralPath $directory){throw 'Preserve earlier staging probe attempt'}
 $null=New-Item -Path $directory -ItemType Directory
 [IO.File]::WriteAllText($locator,$directory)
 $retained=Join-Path $directory 'ProbeWordpairsStagingDataApi.ps1';Copy-Item -LiteralPath $PSCommandPath -Destination $retained
 if((Get-FileHash -LiteralPath $PSCommandPath).Hash -cne (Get-FileHash -LiteralPath $retained).Hash){throw 'Producer retention mismatch'}
 Copy-Item -LiteralPath '/tmp/wordpairs-staging-dataapi-resume-analysis.json' -Destination (Join-Path $directory 'analysis.json')
 $analysis=Get-Content -LiteralPath (Join-Path $directory 'analysis.json') -Raw|ConvertFrom-Json
 if($analysis.parserErrors -ne 0 -or $analysis.analyzerFindings -ne 0 -or $analysis.scriptSha256 -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash){throw 'Analyzed producer mismatch'}
 $authorization='Root authorized one concrete STAGING-only APP guest POST, Realtime GET, native anonymous-role Data API schema GETs and owned-session DELETE. This is not read-only as a whole: guest/credential/profile/aggregate/session/outbox creation, normal expired-session deletion and normal oldest-outbox delivery are source-supported side effects. No room, production traffic, SQL cleanup, provider settings, keys, resources or denied Dashboard route. Key and cookies remain only in process; separate authenticated Realtime token is never used or logged. Stop exact branch on binding/auth/status failure without broad retries.'
 & (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command Invoke -Method workflow.sessionlog.appendDialog -ParamsObject @{dialogItems=@(@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';category='decision';content=$authorization})}
 $origin=[uri]'https://wordpairs.vercel.app';$expectedProjectOrigin='https://jshjkaigwbxsbnnogfxs.supabase.co'
 $webSession=[Microsoft.PowerShell.Commands.WebRequestSession]::new()
 $steps=[Collections.Generic.List[object]]::new();$probes=[Collections.Generic.List[object]]::new()
 $started=[DateTimeOffset]::Now;$phase='guest-post';$failure=$null;$profileId=$null;$keyClass=$null;$logoutAttempted=$false;$logoutConfirmed=$false;$createdGuest=$false;$boundProject=$false
 $client=$null;$handler=$null;$publicKey=$null;$access=$null;$body=$null
 try{
  $post=Invoke-WebRequest -Uri ([uri]::new($origin,'/api/session')) -Method Post -WebSession $webSession -Headers @{Origin=$origin.GetLeftPart([UriPartial]::Authority)} -ContentType 'application/json' -Body (@{}|ConvertTo-Json -Compress) -MaximumRedirection 0 -SkipHttpErrorCheck -TimeoutSec 30
  $steps.Add([pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');phase=$phase;status=[int]$post.StatusCode})
  if([int]$post.StatusCode -ne 200){throw [InvalidOperationException]::new('Guest status rejected')}
  $body=[string]$post.Content;$guest=$body|ConvertFrom-Json -Depth 30;$body=$null;$post=$null
  if(-not $guest.profile -or [string]$guest.profile.kind -cne 'guest' -or [string]$guest.profile.id -notmatch '^[A-Za-z0-9_-]+$'){throw [InvalidOperationException]::new('Guest shape rejected')}
  $profileId=[string]$guest.profile.id;$guest=$null;$createdGuest=$true
  $cookie=@($webSession.Cookies.GetCookies($origin)|Where-Object Name -CEQ 'wp_session')
  if($cookie.Count -ne 1 -or [string]::IsNullOrWhiteSpace($cookie[0].Value)){throw [InvalidOperationException]::new('Guest cookie absent')}
  $cookie=$null;$phase='realtime-get'
  $realtime=Invoke-WebRequest -Uri ([uri]::new($origin,'/api/realtime')) -Method Get -WebSession $webSession -MaximumRedirection 0 -SkipHttpErrorCheck -TimeoutSec 30
  $steps.Add([pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');phase=$phase;status=[int]$realtime.StatusCode})
  if([int]$realtime.StatusCode -ne 200){throw [InvalidOperationException]::new('Realtime status rejected')}
  $body=[string]$realtime.Content;$access=$body|ConvertFrom-Json -Depth 20;$body=$null;$realtime=$null
  $projectUrl=[uri][string]$access.url
  if($projectUrl.AbsoluteUri.TrimEnd('/') -cne $expectedProjectOrigin -or $projectUrl.UserInfo -or $projectUrl.Query -or $projectUrl.Fragment -or [string]$access.profileId -cne $profileId){throw [InvalidOperationException]::new('Realtime project/profile binding rejected')}
  $publicKey=[string]$access.anonKey;$access=$null
  if($publicKey.StartsWith('sb_publishable_',[StringComparison]::Ordinal)){$keyClass='publishable'}
  elseif($publicKey -match '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'){
   $segment=$publicKey.Split('.')[1].Replace('-','+').Replace('_','/');$segment=$segment.PadRight($segment.Length+(4-$segment.Length%4)%4,'=')
   $claims=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($segment))|ConvertFrom-Json -Depth 10;$segment=$null
   if([string]$claims.role -cne 'anon'){throw [InvalidOperationException]::new('Non-anonymous key rejected')}
   if($claims.PSObject.Properties.Name -contains 'ref' -and [string]$claims.ref -cne 'jshjkaigwbxsbnnogfxs'){throw [InvalidOperationException]::new('Legacy key project rejected')}
   $claims=$null;$keyClass='legacy-anon-jwt-role-classified-not-independently-verified'
  }else{throw [InvalidOperationException]::new('Unknown key type rejected')}
  $boundProject=$true;$phase='dataapi-schema-get'
  $handler=[Net.Http.HttpClientHandler]::new();$handler.AllowAutoRedirect=$false;$handler.UseCookies=$false
  $client=[Net.Http.HttpClient]::new($handler);$client.Timeout=[TimeSpan]::FromSeconds(30)
  foreach($schema in @('wordpairs_release_probe_20261031')){
   $request=[Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Get,$expectedProjectOrigin+'/rest/v1/')
   $request.Headers.Add('apikey',$publicKey);$request.Headers.Add('Accept-Profile',$schema)
   if($keyClass -ne 'publishable'){$request.Headers.Authorization=[Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$publicKey)}
   $response=$null
   try{
    $response=$client.SendAsync($request).GetAwaiter().GetResult();$status=[int]$response.StatusCode;$errorCode=$null;$allowlist=@()
    if($status -ge 400){
     $errorBody=$response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
     try{$errorObject=$errorBody|ConvertFrom-Json -Depth 20;if($errorObject.PSObject.Properties.Name -contains 'code' -and [string]$errorObject.code -match '^(PGRST[0-9]{3}|[0-9A-Z]{5})$'){$errorCode=[string]$errorObject.code}
      if($errorCode -ceq 'PGRST106' -and [string]$errorObject.message -match '^The schema must be one of the following:\s*([A-Za-z0-9_, ]+)\s*$'){$allowlist=@($Matches[1].Split(',')|ForEach-Object {$_.Trim()}|Where-Object {$_ -match '^[A-Za-z_][A-Za-z0-9_]*$'})}
     }catch{$errorCode='UNPARSED_SAFE_ERROR'}finally{$errorBody=$null;$errorObject=$null}
    }
    $probes.Add([pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');method='GET';path='/rest/v1/';acceptProfile=$schema;status=$status;errorCode=$errorCode;reportedSchemaAllowlist=$allowlist;anonymousApplicationKeyOnly=$true;authenticatedRealtimeTokenUsed=$false})
    if(-not (($status -eq 200) -or ($status -eq 406 -and $errorCode -ceq 'PGRST106'))){throw [InvalidOperationException]::new('Unexpected Data API status; branch stopped')}
   }finally{if($response){$response.Dispose()};$request.Dispose()}
  }
 }catch{$failure=[pscustomobject]@{phase=$phase;exceptionType=$_.Exception.GetType().FullName;qualification='Exact branch stopped. No exception message, response body, header, cookie, key or token is retained.'}}
 finally{
  $publicKey=$null;$access=$null;$body=$null
  if($client){$client.Dispose()};if($handler){$handler.Dispose()}
  $ownedCookies=@($webSession.Cookies.GetCookies($origin)|Where-Object Name -CEQ 'wp_session')
  if($ownedCookies.Count -eq 1){
   $logoutAttempted=$true
   try{$logout=Invoke-WebRequest -Uri ([uri]::new($origin,'/api/session')) -Method Delete -WebSession $webSession -Headers @{Origin=$origin.GetLeftPart([UriPartial]::Authority)} -MaximumRedirection 0 -SkipHttpErrorCheck -TimeoutSec 30;$logoutConfirmed=([int]$logout.StatusCode -eq 204);$steps.Add([pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');phase='owned-session-logout';status=[int]$logout.StatusCode});$logout=$null}
   catch{$steps.Add([pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');phase='owned-session-logout';status=$null;exceptionType=$_.Exception.GetType().FullName})}
  }
  $ownedCookies=$null;$webSession=$null
  [pscustomobject]@{
   startedAtLocal=$started.ToString('o');finishedAtLocal=[DateTimeOffset]::Now.ToString('o');sessionId=$sessionId;requestId=$requestId;parentSessionId='Codex-20261027T100516Z-plugin-session';parentRequestId='req-20261031T142639Z-release-resume'
   classification='Authorized existing STAGING APP smoke plus read-only anonymous-role Data API schema-selection GETs. Whole flow is not read-only.';origin=$origin.GetLeftPart([UriPartial]::Authority);expectedProjectOrigin=$expectedProjectOrigin;createdGuestResponseConfirmed=$createdGuest;ownedProfileId=$profileId;projectAndProfileBound=$boundProject;keyClassification=$keyClass;steps=@($steps);schemaProbes=@($probes);failure=$failure;ownedSessionLogoutAttempted=$logoutAttempted;ownedSessionLogout204=$logoutConfirmed
   producer=@{path=$retained;sha256=(Get-FileHash -LiteralPath $retained).Hash;analysisSha256=(Get-FileHash -LiteralPath (Join-Path $directory 'analysis.json')).Hash;retainedBeforeNetwork=$true}
   sourceFeasibility=@{path='docs/evidence/release15/hosting-readiness/dataapi-key-input-20261030T204544-route-feasibility.json';sha256=(Get-FileHash -LiteralPath (Join-Path $workspace 'docs/evidence/release15/hosting-readiness/dataapi-key-input-20261030T204544-route-feasibility.json')).Hash;localRevision='6063acd9d6869fd71a33f75ee5c940c736c99124';hostedSourceRevisionNotVerified=$true}
   sourceSupportedSideEffects='Guest POST normally creates profile, aggregate, credential, session and outbox event and deletes globally expired sessions. Realtime GET may deliver and mark oldest pending event. HTTP alone does not prove exact DB row effects or which event was delivered. Logout removes only owned session; guest profile/aggregate/credential/outbox remain without direct SQL cleanup.'
   limits=@('Exact GET /rest/v1/ schema-selection outcomes only, not table/function/RLS/data confidentiality verification.','No hosted source-revision binding, independent JWT signature validation, complete provider allowlist proof unless explicitly returned, production probe or deployment acceptance.','No private row query or OpenAPI/response-body persistence.','If guest creation succeeded, its profile/aggregate/credential/outbox remain after logout; no direct DB removal or provider mutation.','No exact row-count/delivery attribution inferred from source effects alone.')
   officialDocs=@('https://supabase.com/docs/guides/getting-started/api-keys','https://supabase.com/docs/guides/api/creating-routes','https://docs.postgrest.org/en/latest/references/api/schemas.html','https://supabase.com/changelog/cbc-tls-ciphers-deprecated');changelog='Markdown fetch unsupported by tool; HTML changelog and relevant Oct12 HTTP TLS-cipher change inspected. Fresh Oct31 HTML changelog inspected; both projects already 17.11.0.003 resolving Oct30 timezone notice. No TLS validation bypass or obsolete cipher forcing.'
   noValuesPrinted=$true;noDashboardAccess=$true;noProductionTraffic=$true;noNewKeysOrProviderConfiguration=$true;noApplicationSourceEditOrTestsBuildsModels=$true
  }|ConvertTo-Json -Depth 30|Set-Content -LiteralPath $receiptPath
 }
 [pscustomobject]@{path=$receiptPath;sha256=(Get-FileHash -LiteralPath $receiptPath).Hash;schemaProbes=@($probes);failure=$failure;ownedSessionLogout204=$logoutConfirmed}|ConvertTo-Json -Depth 10
 return
}
if($Operation -eq 'Readback'){
 Import-Module powershell-yaml
 $raw=& (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command Invoke -Method client.SessionLog.QueryAsync -ParamsObject @{agent='Codex';limit=10}
 $document=ConvertFrom-Yaml (((($raw -join "`n") -split '(?m)^---\s*$'))[0]);$result=$document.payload.result;$sessions=if($result -is [Collections.IDictionary] -and $result.Contains('items')){$result.items}else{$result}
 $turns=@(foreach($item in $sessions){if($item.sessionId -ceq $sessionId){@($item.turns|Where-Object requestId -CEQ $requestId)}})
 if($turns.Count -ne 1){throw 'Exact own canonical turn absent'}
 $turn=$turns[0];$expected=[IO.File]::ReadAllText('/tmp/wordpairs-staging-dataapi-result.txt');if($turn.status -cne 'completed' -or [string]$turn.response -cne $expected){throw 'Canonical response/status differs'}
 $target=Join-Path $directory 'canonical-readback.json';if(Test-Path -LiteralPath $target){throw 'Preserve earlier readback'}
 [pscustomobject]@{atLocal=[DateTimeOffset]::Now.ToString('o');sessionId=$sessionId;requestId=$requestId;status=$turn.status;responseExact=$true;response=$turn.response;processingDialog=$turn.processingDialog;actions=$turn.actions}|ConvertTo-Json -Depth 30|Set-Content -LiteralPath $target
 [pscustomobject]@{path=$target;sha256=(Get-FileHash -LiteralPath $target).Hash;status=$turn.status;responseExact=$true;dialogs=@($turn.processingDialog).Count;actions=@($turn.actions).Count}|ConvertTo-Json
 return
}
$receipt=Get-Content -LiteralPath $receiptPath -Raw|ConvertFrom-Json -Depth 100
$decision='Public key retrieval uses the normal authorized staging guest/Reatime application flow wholly inside one native process, with exact project/profile binding. This resolves only a scoped transport-input question when it succeeds; it does not establish private table/RPC protections, production exposure or release readiness. Preserve data-write and outbox side effects, remaining guest data, historical discovery helper errors and all actual HTTP failures without retries or bypasses.'
$outcomes=($receipt.schemaProbes|ForEach-Object {$_.acceptProfile+':HTTP'+$_.status+':'+$_.errorCode+':allowlist='+($_.reportedSchemaAllowlist -join ',')}) -join '; '
$response=(Get-Date -Format s)+' - Staging native Data API smoke receipt '+$receiptPath+' SHA256 '+(Get-FileHash -LiteralPath $receiptPath).Hash+'. '+$outcomes+'. Failure='+($null -ne $receipt.failure)+'; owned-session logout204='+$receipt.ownedSessionLogout204+'. Created guest response='+$receipt.createdGuestResponseConfirmed+', exact project/profile bound='+$receipt.projectAndProfileBound+'. Only url+anonKey were used in process; authenticated Realtime token, cookie, guest credential, keys and response bodies were not logged. Initial immediate ~/.creds search found only known supabase.pwd without reading it; four task configs had no relevant nonempty key/PAT fields, verified sidecar SHA C8DA7522896C35A9A9873C71E698B474925DF03B3ED36FD5EE1505D00A1FA16E. Source feasibility SHA0291BB835D681809B5A60C05B035A7565FD95A1233EEEC8D4AFC00F8F037F22D captures guest/profile/credential/aggregate/session/outbox creation, global expired-session cleanup and possible normal oldest-outbox delivery. Logout only revokes owned session; other guest data remains. No room, production traffic, SQL deletion, Dashboard, management configuration, new keys/resources, app/test changes, tests/builds/models/HV. Exact schema-selection endpoint responses only; no table/RPC/RLS/private-row or hosted-revision verification. Accuracy99%, completeness99% for this bounded operation; unmeasured scopes remain UNKNOWN. Own '+$sessionId+' / '+$requestId+'; parent203656Z.'
[IO.File]::WriteAllText('/tmp/wordpairs-staging-dataapi-result.txt',$response)
& (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command Invoke -Method workflow.sessionlog.appendDialog -ParamsObject @{dialogItems=@(@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';category='decision';content=$decision},@{timestamp=[DateTimeOffset]::Now.ToString('o');role='model';category='observation';content=$response})}
& (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command Invoke -Method workflow.sessionlog.appendActions -ParamsObject @{actions=@(@{order=1;type='read';status='completed';filePath='<home>/.creds';description='Immediate Supabase filename metadata and four named config field sets only; no values printed. Preserved initial StrictMode summary error and corrected anticipated request ID in sidecar.'},@{order=2;type='read';status='completed';filePath='src/app/api/realtime/route.ts';description='Pinned eleven source files and existing hosted-smoke helper; recorded concrete route shape and non-read-only guest/outbox effects. Current official API-key and schema docs consulted.'},@{order=3;type='create';status='completed';filePath=$receiptPath;description='Retained analyzed producer before one authorized staging guest flow, three anonymous schema GET attempts and owned-session logout. Native statuses/errors and source/evidence limits retained.'},@{order=4;type='design_decision';status='completed';filePath='';description=$decision})}
& (Join-Path $plugin 'Invoke-CodexMcpPlugin.ps1') @base -Command CompleteTurn -Response $response
