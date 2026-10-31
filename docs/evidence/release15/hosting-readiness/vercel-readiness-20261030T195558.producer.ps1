#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$folder=Join-Path $repo 'docs/evidence/release15/hosting-readiness'
$plugin='<home>/.codex/plugins/cache/mcpserver-codex-plugin/mcpserver/1.121.0/Invoke-CodexMcpPlugin.ps1'
$cache='/tmp/wordpairs-capacity15-codex-cache'
$own=Get-Content -LiteralPath '/tmp/wordpairs-vercel-readiness-session.json' -Raw | ConvertFrom-Json -AsHashtable
$inputData=Get-Content -LiteralPath '/tmp/wordpairs-vercel-readiness-safe-input.json' -Raw | ConvertFrom-Json -AsHashtable
function Get-Pin {param([string]$Path) [ordered]@{path=$Path;sha256=(Get-FileHash -LiteralPath $Path).Hash;bytes=(Get-Item -LiteralPath $Path).Length}}
function Invoke-OwnPlugin {
 param([string]$Method,[hashtable]$Parameters)
 $r=& $plugin -Command Invoke -WorkspacePath $repo -CacheRoot $cache -Method $Method -ParamsObject $Parameters | ConvertFrom-Yaml
 if($r.type -ne 'result'){throw "Required Codex plugin failure: $Method"}
 $r.payload.result
}
$targets=@(
 [ordered]@{logical='staging';projectId='prj_bHGxyZfZU6gsvEOBA5CKljyKq73w';projectName='wordpairs';canonicalDomain='wordpairs.vercel.app';accountId='team_bWASsr4U8yJQls10eWgbkxKH'},
 [ordered]@{logical='production';projectId='prj_DuOPJUyewR9XfrapB6whbNEyNRxh';projectName='wordpairs-j9jf';canonicalDomain='wordpairs-j9jf.vercel.app';accountId='team_bWASsr4U8yJQls10eWgbkxKH'}
)
foreach($target in $targets){
 $p=@($inputData.implicitScopeObservations | Where-Object {$_.logical -ceq $target.logical -and $_.kind -ceq 'project'})
 if($p.Count -ne 1 -or $p[0].id -cne $target.projectId -or $p[0].name -cne $target.projectName -or $p[0].accountId -cne $target.accountId -or $p[0].isError){throw 'Exact provider project/account identity mismatch'}
 $env=@($inputData.implicitScopeObservations | Where-Object {$_.logical -ceq $target.logical -and $_.kind -ceq 'environmentNames'})[0]
 if($env.variables.Count -ne 25 -or $env.isError){throw 'Environment-name observation mismatch'}
 foreach($v in $env.variables){
  if($v.name -cnotmatch '^[A-Za-z_][A-Za-z0-9_]*$' -or @($v.targets).Count -ne 1 -or $v.targets[0] -cne 'production'){throw 'Unexpected environment-name/target scope'}
  if($v.Contains('value') -or $v.Contains('decryptedValue')){throw 'Environment value must not enter safe receipt'}
 }
}
foreach($d in $inputData.immutableDeployments){
 if($d.returnedFields -notcontains 'aliasError'){
  $d.Remove('aliasErrorPresent');$d.aliasErrorQualification='Provider projection omits aliasError; absence is not proof of a successful alias assignment.'
 }
}
$now=(Get-Date).ToString('o')
$base='vercel-readiness-'+(Get-Date).ToString('yyyyMMddTHHmmss')
$path=Join-Path $folder ($base+'.json')
$producer=Join-Path $folder ($base+'.producer.ps1')
$inputCopy=Join-Path $folder ($base+'.allowlisted-input.json')
$unknowns=@(
 'Both current global Ignored Build Step commands are unverified. Connected project projections omit commandForIgnoringBuildStep. Required unchanged policy is exit 0 on both projects; no persistent setting or per-project override was changed.',
 'Actual build/install commands, root/output directory and production Git branch are unverified because the connected project projection omits them; installed CLI and authenticated browser fallback were unavailable in this bounded check.',
 'Actual provider gitSource is omitted even with withGitRepoInfo=true. The old full8e2f62417e0fe46cefd884e8a61024b12860a2cf is metadata reported by both observed deployments, not sufficient accepted-source provenance. No c1181eb hosted-current claim is made.',
 'Production canonical deployment lookup returns not_found404 while the domain is configured/verified and the READY production deployment query is empty. These are provider observations, not an HTTP-origin availability test or proof of a known rollback deployment.',
 'Effective anonymous/member access through SSO protection is untested. Actual configured SSO deploymentType is all_except_custom_domains; password and trusted-IP enabled flags are false on both projects. No protection was weakened or share-link bypass created.',
 'Environment values, connection/TLS correctness, OAuth secret validity and scheduler purpose-secret validity were intentionally not read or tested. Twenty-five names per project are visible, all production-scoped, with hiddenProductionEnvCount0.',
 'The one-time Dashboard Redeploy ignore-step checkbox route is not freshly inspected. Root separately observed the Vercel login screen and performed no login/action. No CLI installation, project linking or authentication mutation was attempted by this agent.',
 'Accepted source, complete frozen validation/HV, hosted migration/schema/worker acceptance, owner OAuth, physical admin PWA and contest submission remain separate execution evidence. This operational check does not approve them.'
)
$safeFindings=@(
 [ordered]@{id='PROJECT-IDENTITIES';status='verified_metadata';outcome='Exact immutable project IDs and names report the expected accountId under the default connector account scope.'},
 [ordered]@{id='CANONICAL-DOMAIN-CONFIG';status='verified_metadata';outcome='Both expected canonical domains are configured, verified, nonredirecting and not branch-specific in project-domain reads.'},
 [ordered]@{id='NODE-FRAMEWORK';status='verified_metadata';outcome='Both projects report framework nextjs and nodeVersion24.x.'},
 [ordered]@{id='ENV-NAMES-SCOPES';status='verified_metadata';outcome='Both projects return25 variable names, each scoped only to production, hiddenProductionEnvCount0. No values are retained.'},
 [ordered]@{id='CURRENT-STAGING-DEPLOYMENT';status='verified_provider_metadata';outcome='Canonical staging resolves dpl_4unZq3queczsyf23J95UTVyF4mcJ, targetproduction,READY, reported oldSHA8e2f62417e0fe46cefd884e8a61024b12860a2cf. It is not current c118 candidate proof.'},
 [ordered]@{id='CURRENT-PRODUCTION-DEPLOYMENT';status='observed_not_ready';outcome='Latest observed dpl_D5W8WwEN3CqxV31kCwBsXq3X1Eic is CANCELED; configured canonical hostname has no resolved deployment in the connector and READY-production query is empty.'},
 [ordered]@{id='GLOBAL-GUARDS-BUILD';status='unverified';outcome='Provider projection omits exact exit0 guards and build settings. Historical procedure is policy, not fresh setting evidence.'}
)
$receipt=[ordered]@{
 schema='wordpairs-vercel-readonly-readiness-v1';recordedAt=$now;classification='Operator-directed operational metadata inspection, not a deployment or hostile approval';ownSessionId=$own.sessionId;ownRequestId=$own.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId
 targets=$targets;candidateContext=[ordered]@{parentNamedCandidate='c1181eb4eb01825c8b12f3521f92286080addfba';qualification='Parent said this candidate was not pushed or reviewed at delegation. This check makes no current source/deployment acceptance claim.'}
 profile=[ordered]@{files=1;globalMemories=9;workspaceMemories=0;excluded='PRIVATE-MEMORY-REFERENCE-007'}
 applicableSkills=@('<home>/.agents/skills/add-profile/SKILL.md','<home>/.codex/plugins/cache/openai-curated-remote/vercel/0.54.1/skills/deployments-cicd/SKILL.md','<home>/.codex/plugins/cache/openai-curated-remote/vercel/0.54.1/skills/vercel-cli/SKILL.md','<home>/.codex/plugins/cache/openai-curated-remote/vercel/0.54.1/skills/env-vars/SKILL.md')
 guardedProcedure=Get-Pin (Join-Path $folder 'guarded-rollout-procedure.md');connectedObservations=$inputData;findings=$safeFindings;unknowns=$unknowns
 globalIgnoredBuildPolicy=[ordered]@{required='exit 0';currentStagingValue=$null;currentProductionValue=$null;verified=$false;changed=$false;qualification='Never replace current-read evidence with old receipt/policy; no global guard mutation or saved projectSettings override.'}
 noProviderOrEnvironmentOrGuardMutation=$true;noBuildTestModelInvocation=$true;noSecretValueRenderedOrPersisted=$true;noShareLinkCreated=$true;readinessVerdict='INCOMPLETE_READ_ONLY_METADATA_NOT_ROLLOUT_ACCEPTANCE'
 accuracy=99;completeness=90;ratingQualification='Exact successful safe projections are retained. Missing guard/build/Git-source/authenticated-access and current hosted acceptance proof prevent full readiness verification.'
}
if(-not $PSCmdlet.ShouldProcess($path,'Save new public-safe read-only Vercel metadata receipt and complete own audited turn')){return}
foreach($p in @($path,$producer,$inputCopy)){if(Test-Path -LiteralPath $p){throw 'Refusing overwrite of historical readiness receipt'}}
$receipt | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $path -Encoding utf8NoBOM
Copy-Item -LiteralPath $PSCommandPath -Destination $producer
Copy-Item -LiteralPath '/tmp/wordpairs-vercel-readiness-safe-input.json' -Destination $inputCopy
if((Get-FileHash -LiteralPath $producer).Hash -cne (Get-FileHash -LiteralPath $PSCommandPath).Hash -or (Get-FileHash -LiteralPath $inputCopy).Hash -cne (Get-FileHash -LiteralPath '/tmp/wordpairs-vercel-readiness-safe-input.json').Hash){throw 'Readiness producer/input copy mismatch'}
$pins=@(Get-Pin $path;Get-Pin $producer;Get-Pin $inputCopy)
$response=$now+' - Read-only Vercel metadata inspection, not rollout acceptance or hostile approval.'+"`n"+($receipt | ConvertTo-Json -Depth 30)+"`nReceipt/producer/input pins:`n"+($pins | ConvertTo-Json -Depth 5)
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.appendDialog' -Parameters @{dialogItems=@(
 @{timestamp=$now;role='model';category='observation';content='Literal profile and applicable Vercel skills/current guarded-rollout procedure read; fresh Global9/Workspace0 texts loaded excludingPROCESS007. Connected tools used first. Explicitteam403 responses were not treated as absent settings. Retried immutable project IDs under default connector scope and verified expected accountId on both. Node24/Next,25production-scoped names per project and actual protection enabled fields verified; no env values rendered/decrypted/persisted.'},
 @{timestamp=$now;role='model';category='decision';content='Default connector scope is acceptable only because exact requested immutable IDs independently report the expected accountId. This is not another identity or target substitution. Do not interpret omitted build/ignore/Git-source fields, protection object presence or production metadata as actual setting/hosted success. Keep guard exit0 policy unchanged and unverified.'},
 @{timestamp=$now;role='model';category='decision';content='Stop bounded fallback investigation as root directed. CLI was not found in checked installed/cache routes and this agent CUA inventory had no browser; root separately observed Vercel login and no login/action. Preserve current provider facts and all eight unknowns rather than install/link/authenticate/change settings. Staging oldREADY and production CANCELED/canonicalnotfound/emptyREADY list are not current c118 release acceptance.'}
)})
$actions=@();$order=1
foreach($pin in $pins){$actions+=@{order=$order;type='create';status='completed';filePath=[IO.Path]::GetRelativePath($repo,$pin.path);description='Saved public-safe operational metadata receipt/copy; SHA256 '+$pin.sha256};$order++}
$actions+=@{order=$order;type='design_decision';status='completed';filePath='docs/evidence/release15/hosting-readiness/guarded-rollout-procedure.md';description='Exact current global guards/build/Git-source remain unknown; preserve exit0 policy and no provider mutation rather than infer current settings from history.'};$order++
$actions+=@{order=$order;type='design_decision';status='completed';filePath=[IO.Path]::GetRelativePath($repo,$path);description='Scope default-account reads by exact immutable project IDs and verifiedaccountId; keep reported old metadata, effective-access unknowns and pending release acceptance distinct.'}
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.appendActions' -Parameters @{actions=$actions})
[void](Invoke-OwnPlugin -Method 'workflow.sessionlog.completeTurn' -Parameters @{response=$response})
$history=Invoke-OwnPlugin -Method 'client.SessionLog.QueryAsync' -Parameters @{agent='Codex';limit=40}
$session=@($history.items | Where-Object sessionId -CEQ $own.sessionId)[0]
$turn=@($session.turns | Where-Object requestId -CEQ $own.requestId)[0]
if($turn.status -cne 'completed' -or $turn.response -cne $response){throw 'Live full readiness turn readback mismatch'}
$readback=[ordered]@{recordedAt=(Get-Date).ToString('o');sessionId=$session.sessionId;requestId=$turn.requestId;parentSessionId=$own.parentSessionId;parentRequestId=$own.parentRequestId;status=$turn.status;fullResponseMatched=$true;response=$turn.response;actions=@($turn.actions).Count;dialogs=@($turn.processingDialog).Count;receiptPins=$pins}
$readbackPath=Join-Path $folder ($base+'.turn-readback.json')
$readback | ConvertTo-Json -Depth 35 | Set-Content -LiteralPath $readbackPath -Encoding utf8NoBOM
[ordered]@{recordedAt=$readback.recordedAt;sessionId=$session.sessionId;requestId=$turn.requestId;status=$turn.status;fullResponseMatched=$true;actions=$readback.actions;dialogs=$readback.dialogs;receipts=$pins;readback=Get-Pin $readbackPath;unknownCount=$unknowns.Count;verdict=$receipt.readinessVerdict} | ConvertTo-Json -Depth 6
