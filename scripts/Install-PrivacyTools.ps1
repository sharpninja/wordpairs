#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param([string]$Version='8.30.1',[string]$Destination=(Join-Path ([IO.Path]::GetTempPath()) 'wordpairs-privacy-tools'))
$ErrorActionPreference='Stop'
if($Version -notmatch '^\d+\.\d+\.\d+$'){throw 'Use an explicit release version.'}
if($Version -ne '8.30.1'){throw 'A scanner version change requires reviewing and updating the pinned release checksum.'}
$pinnedArchiveSha256='551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb'
if(-not $IsLinux -or [Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64'){throw 'This CI installer targets Linux x64. Install the matching native Gitleaks release on other hosts.'}
if(-not $PSCmdlet.ShouldProcess($Destination,'Install the pinned native privacy scanner after verifying its published SHA-256; install pinned Pester for isolated tests')){return}
[void][IO.Directory]::CreateDirectory($Destination)
$archiveName='gitleaks_'+$Version+'_linux_x64.tar.gz'
$release='https://github.com/gitleaks/gitleaks/releases/download/v'+$Version+'/'
$archive=Join-Path $Destination $archiveName
$checksums=Join-Path $Destination 'checksums.txt'
Invoke-WebRequest -Uri ($release+$archiveName) -OutFile $archive
Invoke-WebRequest -Uri ($release+'gitleaks_'+$Version+'_checksums.txt') -OutFile $checksums
$checksumLine=@(Get-Content -LiteralPath $checksums|Where-Object {$_ -match ('\s'+[regex]::Escape($archiveName)+'$')})
if($checksumLine.Count -ne 1){throw 'Pinned archive checksum entry is missing or ambiguous.'}
$expected=($checksumLine[0] -split '\s+')[0]
if($expected -ine $pinnedArchiveSha256){throw 'Published release checksum differs from the reviewed pinned artifact digest.'}
if((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ine $expected){throw 'Pinned Gitleaks archive SHA-256 mismatch.'}
& tar -xzf $archive -C $Destination gitleaks
if($LASTEXITCODE -ne 0){throw 'Native scanner extraction failed.'}
$binary=Join-Path $Destination 'gitleaks'
if((& $binary version).Trim() -ne $Version){throw 'Installed scanner version mismatch.'}
Install-Module -Name Pester -RequiredVersion 5.9.1 -Repository PSGallery -Scope CurrentUser -Force
if($env:GITHUB_PATH){Add-Content -LiteralPath $env:GITHUB_PATH -Value $Destination}
[pscustomobject]@{version=$Version;verifiedArchiveSha256=$expected;gitleaks=$binary;pester='5.9.1'}|ConvertTo-Json
