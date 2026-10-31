#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$stamp=Get-Date -Format yyyyMMddTHHmmss
$path=Join-Path $repo "docs/evidence/release15/hosting-readiness/browser-build-guards-$stamp.json"
$build='npm run typecheck && NODE_ENV=test npm test && node scripts/generate-sbom.mjs && npm run build'
$projects=@(
 [pscustomobject]@{name='wordpairs';role='staging';projectId='prj_bHGxyZfZU6gsvEOBA5CKljyKq73w';url='https://vercel.com/sharp-ninja1/wordpairs/settings/build-and-deployment';observedAfterLocal='2026-10-30T20:07:58';observedBeforeLocal='2026-10-30T20:09:58';guardSection='Project Settings expanded, distinct from historical Production Overrides';guardBehavior="Don't build anything";guardCommand='exit 0';buildCommand=$build;buildOverride=$true;installCommand='npm ci';installOverride=$true;framework='Next.js';node='24.x';buildMachine='Basic 2 vCPUs and 8 GB memory';onDemandConcurrentBuilds='Disabled';uiAnchors='AX state: Project Settings button128; loaded build field295/install315; selected behavior343 and command350. Earlier loading/default tree was not used for persisted settings.'}
 [pscustomobject]@{name='wordpairs-j9jf';role='production';projectId='prj_DuOPJUyewR9XfrapB6whbNEyNRxh';url='https://vercel.com/sharp-ninja1/wordpairs-j9jf/settings/build-and-deployment';observedAfterLocal='2026-10-30T20:09:58';observedBeforeLocal='2026-10-30T20:11:17';guardSection='Loaded project-level Ignored Build Step';guardBehavior="Don't build anything";guardCommand='exit 0';buildCommand=$build;buildOverride=$true;installCommand='npm ci';installOverride=$true;framework='Next.js';node='24.x';buildMachine='Basic 2 vCPUs and 8 GB memory';onDemandConcurrentBuilds='Disabled';uiAnchors='Loaded AX diff: build243/install263; selected behavior308 and command315; Node324/Basic341/on-demand172. Initial unhydrated defaults were not used.'}
)
$record=[ordered]@{recordedAt=(Get-Date -Format s);sessionId='Codex-20261027T100516Z-plugin-session';requestId='req-20261030T203656Z-cline-beam-release';sourceRevision='6063acd9d6869fd71a33f75ee5c940c736c99124';classification='Read-only provider configuration observation, not a deployment';browser='Codex IAB2';tab='6';account='sharpninja';teamVisible='SharpNinja Hobby';teamSlug='sharp-ninja1';projects=$projects;providerSettingsChanged=$false;deploymentCreated=$false;secretValuesReadOrEntered=$false;authentication='Authorized Continue with GitHub completed the existing sign-in without a credential field or new permission prompt.';officialProcedure='https://vercel.com/docs/project-configuration/project-settings#ignore-build-step-on-redeploy';qualification='Model-authored selected observations from the CUA tool AX states, not a native API export or screenshot. Authenticated browser access and global guard/build configuration verified; no deployment-specific one-time checkbox, current reviewed deployment or hosted behavior claimed. Preserve both exit0 guards through and after rollout.';producer=$PSCommandPath;producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash}
if(-not $PSCmdlet.ShouldProcess($path,'Retain safe selected browser build-setting observations and producer')){return}
if(Test-Path -LiteralPath $path){throw 'Retain existing observation; no overwrite'}
$copy=$path.Replace('.json','.producer.ps1')
Copy-Item -LiteralPath $PSCommandPath -Destination $copy
if((Get-FileHash -LiteralPath $copy).Hash -cne $record.producerSha256){throw 'Producer copy mismatch'}
$record|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $path
[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;producer=$copy;originalRetained=$true}|ConvertTo-Json
