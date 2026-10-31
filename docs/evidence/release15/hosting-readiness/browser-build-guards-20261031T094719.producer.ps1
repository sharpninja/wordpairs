#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$repo='<repo>'
$stamp=Get-Date -Format yyyyMMddTHHmmss
$path=Join-Path $repo "docs/evidence/release15/hosting-readiness/browser-build-guards-$stamp.json"
$build='npm run typecheck && NODE_ENV=test npm test && node scripts/generate-sbom.mjs && npm run build'
$record=[ordered]@{recordedAt=(Get-Date -Format s);sessionId='Codex-20261027T100516Z-plugin-session';requestId='req-20261031T142639Z-release-resume';sourceRevision=(& git -C $repo rev-parse HEAD).Trim();classification='Read-only model-authored browser observations, not native provider export or deployment';browser='Codex IAB2';tab='2';account='sharpninja';teamVisible='SharpNinja Hobby';teamSlug='sharp-ninja1';projects=@(
    @{name='wordpairs';role='staging';projectId='prj_bHGxyZfZU6gsvEOBA5CKljyKq73w';url='https://vercel.com/sharp-ninja1/wordpairs/settings/build-and-deployment';observedAfterLocal='2026-10-31T09:40:05';observedBeforeLocal='2026-10-31T09:42:44';guardSection='Project Settings expanded separately from Production Overrides';guardBehavior="Don't build anything";guardCommand='exit 0';buildCommand=$build;buildOverride=$true;installCommand='npm ci';installOverride=$true;framework='Next.js';node='24.x';buildMachine='Basic2vCPU8GB';onDemandConcurrentBuilds='Disabled';uiAnchors='Loaded AX build73,install93,Node158,Basic184,on-demand214; expanded global ProjectSettings144 then selected304/command311. Loading defaults excluded.'}
    @{name='wordpairs-j9jf';role='production';projectId='prj_DuOPJUyewR9XfrapB6whbNEyNRxh';url='https://vercel.com/sharp-ninja1/wordpairs-j9jf/settings/build-and-deployment';observedAfterLocal='2026-10-31T09:42:44';observedBeforeLocal=(Get-Date -Format s);guardSection='Loaded project-level Ignored Build Step';guardBehavior="Don't build anything";guardCommand='exit 0';buildCommand=$build;buildOverride=$true;installCommand='npm ci';installOverride=$true;framework='Next.js';node='24.x';buildMachine='Basic2vCPU8GB';onDemandConcurrentBuilds='Disabled';uiAnchors='Loaded AX build74/install94, selected behavior149 and command156,Node167,Basic193,on-demand223. Loading defaults excluded.'}
);providerSettingsChanged=$false;deploymentCreated=$false;secretValuesReadOrEntered=$false;authentication='Existing browser sign-in retained; no login action, credential field or new permission prompt.';qualification='Measured enclosing observation bounds, not individual endpoint times. Both global exit0 guards remain configured. No Save or settings change. One-time Redeploy checkbox and exact reviewed deployment are unobserved here; no hosted acceptance claim.';producer=$PSCommandPath;producerSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash}
if(-not $PSCmdlet.ShouldProcess($path,'Retain current safe build guard observations and producer')){return}
if(Test-Path -LiteralPath $path){throw 'Retain prior observation'}
$copy=$path.Replace('.json','.producer.ps1')
Copy-Item -LiteralPath $PSCommandPath -Destination $copy
if((Get-FileHash -LiteralPath $copy).Hash -cne $record.producerSha256){throw 'Producer copy mismatch'}
$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $path
[pscustomobject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path).Hash;producer=$copy;originalRetained=$true} | ConvertTo-Json
