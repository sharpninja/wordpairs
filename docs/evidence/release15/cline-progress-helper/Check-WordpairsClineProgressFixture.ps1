#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$folder='<repo>/docs/evidence/release15/cline-progress-helper'
$helper='/tmp/GetWordpairsClineProgress.ps1'
if(-not $PSCmdlet.ShouldProcess('Owned native-object fixtures','Exercise only extracted trusted progress function and retain safe results')){return}
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($helper,[ref]$tokens,[ref]$errors)
if(@($errors).Count){throw 'Helper parser gate failed'}
$diagnostics=@(Invoke-ScriptAnalyzer -Path $helper -Severity Warning,Error)
if($diagnostics.Count){throw 'Helper PSSA gate failed'}
$definition=@($ast.FindAll({param($node)$node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -ceq 'Get-ClineProgressObservation'},$true))
if($definition.Count -ne 1){throw 'Expected exactly one trusted extraction function'}
. ([ScriptBlock]::Create($definition[0].Extent.Text))
function New-AssistantEvent {
 [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSUseShouldProcessForStateChangingFunctions','',Justification='Pure fixture constructor creates only an in-memory object and never changes external state.')]
 [CmdletBinding()]
 param([object]$Value,[string]$EventType='content_end',[string]$ContentType='text')
 [pscustomobject]@{type='agent_event';event=[pscustomobject]@{type=$EventType;contentType=$ContentType;text=($Value | ConvertTo-Json -Depth 10 -Compress)}}
}
function Assert-ProgressCase {
 param([string]$Name,[Alias('Event')][object]$ReviewMessage,[int]$Count,[double]$Percent,[double]$Eta,[string]$Source='assistant')
 $observed=@(Get-ClineProgressObservation -ReviewEvent $ReviewMessage -Line 437)
 if($observed.Count -ne $Count){throw ('Fixture count mismatch: '+$Name)}
 if($Count -eq 1 -and ($observed[0].completionPercent -ne $Percent -or $observed[0].etaMinutes -ne $Eta -or $observed[0].source -cne $Source -or $observed[0].line -ne 437)){throw ('Fixture numeric/source mismatch: '+$Name)}
 $serialized=$observed | ConvertTo-Json -Depth 8
 if($serialized -cmatch 'FIXTURE_PRIVATE_VALUE|activity|toolName|apiKey'){throw ('Unallowlisted text escaped: '+$Name)}
 [ordered]@{name=$Name;expectedObservationCount=$Count;observedCount=$observed.Count;passed=$true}
}
$progress=[ordered]@{completionPercent=37.5;etaMinutes=12.25;activity='FIXTURE_PRIVATE_VALUE'}
$cases=@()
$cases+=Assert-ProgressCase -Name 'direct numeric pair preserved' -Event ([pscustomobject]@{type='progress';completionPercent=37.5;etaMinutes=12.25}) -Count 1 -Percent 37.5 -Eta 12.25 -Source direct
$cases+=Assert-ProgressCase -Name 'direct numeric strings preserved' -Event ([pscustomobject]@{type='progress';completionPercent='37.5';etaMinutes='12.25'}) -Count 1 -Percent 37.5 -Eta 12.25 -Source direct
$cases+=Assert-ProgressCase -Name 'native assistant content end' -Event (New-AssistantEvent $progress) -Count 1 -Percent 37.5 -Eta 12.25
$cases+=Assert-ProgressCase -Name 'native assistant content start' -Event (New-AssistantEvent $progress -EventType content_start) -Count 1 -Percent 37.5 -Eta 12.25
$accumulated=[pscustomobject]@{type='agent_event';event=[pscustomobject]@{type='content_start';contentType='text';text='partial';accumulated=($progress | ConvertTo-Json -Depth 5)}}
$cases+=Assert-ProgressCase -Name 'native accumulated complete JSON' -Event $accumulated -Count 1 -Percent 37.5 -Eta 12.25
$fenced=[pscustomobject]@{type='agent_event';event=[pscustomobject]@{type='content_end';contentType='text';text=('Narrative is not printed.'+"`n"+'```json'+"`n"+($progress | ConvertTo-Json -Depth 5)+"`n"+'```')}}
$cases+=Assert-ProgressCase -Name 'fenced multiline structured progress' -Event $fenced -Count 1 -Percent 37.5 -Eta 12.25
$ndjson=[pscustomobject]@{type='agent_event';event=[pscustomobject]@{type='content_end';contentType='text';text=('Narrative is not printed.'+"`n"+($progress | ConvertTo-Json -Depth 5 -Compress)+"`n"+'Additional narrative.')}}
$cases+=Assert-ProgressCase -Name 'newline complete structured entry' -Event $ndjson -Count 1 -Percent 37.5 -Eta 12.25
$repeat=[pscustomobject]@{type='agent_event';event=[pscustomobject]@{type='content_start';contentType='text';text=($progress | ConvertTo-Json -Compress);accumulated=($progress | ConvertTo-Json -Compress)}}
$cases+=Assert-ProgressCase -Name 'identical text and accumulated do not duplicate' -Event $repeat -Count 1 -Percent 37.5 -Eta 12.25
$cases+=Assert-ProgressCase -Name 'zero progress and ETA accepted' -Event (New-AssistantEvent ([ordered]@{completionPercent=0;etaMinutes=0})) -Count 1 -Percent 0 -Eta 0
$cases+=Assert-ProgressCase -Name 'tool end text excluded' -Event (New-AssistantEvent $progress -ContentType tool) -Count 0
$cases+=Assert-ProgressCase -Name 'tool update text excluded' -Event (New-AssistantEvent $progress -EventType content_update -ContentType tool) -Count 0
$cases+=Assert-ProgressCase -Name 'reasoning text excluded' -Event (New-AssistantEvent $progress -ContentType reasoning) -Count 0
$cases+=Assert-ProgressCase -Name 'notice text excluded' -Event (New-AssistantEvent $progress -EventType notice) -Count 0
$cases+=Assert-ProgressCase -Name 'tool result nested JSON excluded' -Event ([pscustomobject]@{type='agent_event';event=[pscustomobject]@{type='content_end';contentType='tool';output=$progress}}) -Count 0
$marked=New-AssistantEvent $progress;$marked.event | Add-Member -NotePropertyName toolName -NotePropertyValue fixture_tool
$cases+=Assert-ProgressCase -Name 'tool marked text excluded' -Event $marked -Count 0
$cases+=Assert-ProgressCase -Name 'non-native payload wrapper excluded' -Event ([pscustomobject]@{type='agent_event';payload=@{event=@{type='content_end';contentType='text';text=($progress | ConvertTo-Json -Compress)}}}) -Count 0
$cases+=Assert-ProgressCase -Name 'nested object is not root progress' -Event (New-AssistantEvent ([ordered]@{tool_result=$progress})) -Count 0
$cases+=Assert-ProgressCase -Name 'nested numeric strings rejected' -Event (New-AssistantEvent ([ordered]@{completionPercent='37.5';etaMinutes='12.25'})) -Count 0
$cases+=Assert-ProgressCase -Name 'nested boolean rejected' -Event (New-AssistantEvent ([ordered]@{completionPercent=$true;etaMinutes=12})) -Count 0
$cases+=Assert-ProgressCase -Name 'percent above100 rejected' -Event (New-AssistantEvent ([ordered]@{completionPercent=101;etaMinutes=12})) -Count 0
$cases+=Assert-ProgressCase -Name 'negative percent rejected' -Event (New-AssistantEvent ([ordered]@{completionPercent=-1;etaMinutes=12})) -Count 0
$cases+=Assert-ProgressCase -Name 'negative ETA rejected' -Event (New-AssistantEvent ([ordered]@{completionPercent=30;etaMinutes=-1})) -Count 0
$cases+=Assert-ProgressCase -Name 'missing ETA rejected' -Event (New-AssistantEvent ([ordered]@{completionPercent=30})) -Count 0
$cases+=Assert-ProgressCase -Name 'partial fragment remains inconclusive' -Event ([pscustomobject]@{type='agent_event';event=[pscustomobject]@{type='content_start';contentType='text';text=($progress | ConvertTo-Json -Compress).Substring(0,20)}}) -Count 0
$old=Get-Content -LiteralPath (Join-Path $folder 'GetWordpairsClineProgress.original.ps1') -Raw
$current=Get-Content -LiteralPath $helper -Raw
$preserved=@('bytes=$item.Length','lastWriteTime=$item.LastWriteTime.ToString(''s'')','lines=$lines','unparsedLines=$unparsed','eventTypes=$types','runtimeStarts=$starts','runtimeResults=$results','directProgress=$progress','[IO.FileShare]::ReadWrite','systemctl --user show')
foreach($literal in $preserved){if(-not$old.Contains($literal) -or -not$current.Contains($literal)){throw ('Existing metadata/read behavior changed: '+$literal)}}
if(-not$current.Contains('Empty extraction does not prove absence of reviewer progress.')){throw 'Missing absence qualification'}
$receipt=[ordered]@{recordedAt=(Get-Date).ToString('o');scope='Isolated native-object fixture checks of the actual extracted trusted helper function;no full helper/live stream/model execution';helperSha256=(Get-FileHash -LiteralPath $helper).Hash;fixtureSha256=(Get-FileHash -LiteralPath $PSCommandPath).Hash;parserErrors=0;pssaWarningsErrors=0;caseCount=$cases.Count;passed=@($cases | Where-Object passed).Count;failed=0;excludedInputControls=@($cases | Where-Object expectedObservationCount -EQ 0).Count;cases=$cases;preservedSourceLiterals=$preserved;arbitraryTextEscaped=$false;qualification='Only complete structured JSON entries in proven native assistant text/accumulated are recognized. Partial/prose/other-wrapper progress can remain unrecognized;empty extraction is inconclusive. Cumulative stream events can repeat numeric observations. Existing direct parser remains unchanged.'}
$path=Join-Path $folder 'fixture-result.json'
if(Test-Path -LiteralPath $path){throw 'Refusing fixture evidence overwrite'}
$receipt | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $path -Encoding utf8NoBOM
$receipt | ConvertTo-Json -Depth 10
