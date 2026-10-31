#Requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param()
$ErrorActionPreference='Stop'
$preparer='/tmp/PrepareWordpairsClineReview.ps1'
$template='/tmp/wordpairs-cline-review-brief-template.md'
$expected=@{$preparer='B9A91955C099D4A5FC53D5C4318AB5435C62E3988B17AC25F6F53310BDCC91A8';$template='104B154A5F2755464DCEE1C91EEE9441D4693FE7F047CE079D2FABDFF57B50F1'}
foreach($path in @($preparer,$template)){if((Get-FileHash -LiteralPath $path).Hash -cne $expected[$path]){throw 'Review input changed since full inspection'}}
$preparerText=Get-Content -LiteralPath $preparer -Raw
$templateText=Get-Content -LiteralPath $template -Raw
$additionalFiles=@'
$relativeFiles+=@(
 'docs/evidence/release15/frozen-6063acd/chain-completion.json','docs/evidence/release15/frozen-6063acd/full/validation.json','docs/evidence/release15/frozen-6063acd/live-ui/live-ui.xml','docs/evidence/release15/frozen-6063acd/strict-ui/strict-ui.xml',
 'docs/evidence/release15/frozen-6063acd/strict-ui/first-failure-supplement/manifest.json','docs/evidence/release15/frozen-6063acd/strict-ui/first-failure-supplement/strict-observations-amendment/manifest.json',
 'docs/evidence/release15/strict-entry/plan.md','docs/evidence/release15/strict-entry/receipt.json','docs/evidence/release15/strict-entry/protected-source.json','tests/browser/ui-command-entry.ts','tests/browser/ui-command-entry.contract.ts','tests/browser/ui-command-entry.phase6.spec.ts','playwright.ui-command.config.ts',
 'docs/evidence/release15/strict-evidence-collector/receipt.json','docs/evidence/release15/cline-progress-helper/receipt.json','docs/evidence/release15/hosting-readiness/backup-refresh-20261030T203154/index.json','docs/evidence/release15/hosting-readiness/resume-20261031-index.json'
)
$relativeFiles=@($relativeFiles | Select-Object -Unique)
'@
$filesAnchor='$files=@($relativeFiles|ForEach-Object'
if(([regex]::Matches($preparerText,[regex]::Escape($filesAnchor))).Count -ne 1){throw 'Expected one review pin anchor'}
$preparerText=$preparerText.Insert($preparerText.IndexOf($filesAnchor,[StringComparison]::Ordinal),$additionalFiles+"`n")
$entryChecklist=@'
$entryPlan=Join-Path $root 'docs/evidence/release15/strict-entry/plan.md'
$entryReceipt=Join-Path $root 'docs/evidence/release15/strict-entry/receipt.json'
$failed606=Join-Path $root 'docs/evidence/release15/frozen-6063acd'
$checklist.holisticReview.evidence+=@($entryPlan,$entryReceipt,(Join-Path $failed606 'chain-completion.json'),(Join-Path $failed606 'strict-ui/strict-ui.xml'))
$checklist.holisticReview.reason+=' Retained6063acd completed all14 ordinary2..15-player games but strict failed before second-player join. Read the actual-DOM entry repair, all failed/corrected mock attempts, unchanged old210 cases, adopted helper and fresh strict/full gate. The exact missing-versus-denied historical DOM was not retained; no unique mount-race cause or later full runtime success is inferred from isolated tests.'
$checklist.whatIf.evidence+=@($entryPlan,$entryReceipt)
$checklist.whatIf.reason+=' Inspect actual DOM delayed/hidden/disabled entry, same-page authority, invalid version/busy/pending variants, original rejected-probe identity, observer double-failure and capture-before-cleanup. Real action conditions precede the existing fresh guard; no fixed sleeps, synthetic commands, weakened denials, increased bounds or removed gameplay assertions.'
$checklist.phaseBoundary.evidence+=@($entryReceipt)
$checklist.phaseBoundary.reason+=' The first28 browser-launch errors and later failed/interrupted mock controls remain history, not approval. The corrected actual-DOM mock gate must precede entry/helper/adoption edits and the SAME oracle must bind real helpers; inspect exact native counts, protected hashes and immediate hook/directtsc receipts. Actual frozen strict/full lanes remain a separate mandatory exit gate.'
$checklist.searchBeforeAdding.evidence+=@($entryPlan)
$checklist.searchBeforeAdding.reason+=' Strict join/ready/choose/answer entry siblings were reviewed together; normal readiness/category/input preconditions retain the passing14-game matrix semantics. Test diagnostics preserve the rejected state separately from later post-failure snapshots and run before cleanup.'
$checklist.noNewMechanism.evidence+=@((Join-Path $root 'tests/browser/ui-command-entry.ts'),(Join-Path $root 'docs/evidence/release15/strict-evidence-collector/receipt.json'))
$checklist.noNewMechanism.reason+=' Test-only action-entry/probe/failure observation reuses actual Playwright Locators and the existing command classifier. The operational collector adds only two exact strict auxiliary names with existing freshness/lane/copy/hash checks; no application, policy, capacity, schema, deadline or dependency change.'
'@
$selfAnchor='$self=[pscustomobject]'
if(([regex]::Matches($preparerText,[regex]::Escape($selfAnchor))).Count -ne 1){throw 'Expected one self-review anchor'}
$preparerText=$preparerText.Insert($preparerText.IndexOf($selfAnchor,[StringComparison]::Ordinal),$entryChecklist+"`n")
$preparerText=$preparerText.Replace("parentRequestId='req-20261030T203656Z-cline-beam-release'","parentRequestId='req-20261031T142639Z-release-resume'")
$templateText=$templateText.Replace('`req-20261030T203656Z-cline-beam-release`','`req-20261031T142639Z-release-resume`')
$templateText+="`n"+@'

## Subsequent strict-entry evidence and working deadline

Operator's latest planning instruction, verbatim: "Assume October 31." Use October31,2026 as the working submission deadline. This is an operator-directed planning assumption, not evidence of a sponsor extension, an exact cutoff hour or available entry submission. The operator will check in by phone and says not to block on them; no new human approval gate is introduced. Preserve the original official/public-source discrepancy as history, with no further deadline investigation required for this release work.

Frozen6063acd9d6869fd71a33f75ee5c940c736c99124 is retained FAILED history despite its full ordinary14-game success. Read docs/evidence/release15/frozen-6063acd/chain-completion.json, full/validation.json, live-ui/live-ui.xml and strict-ui/strict-ui.xml. Full894unit/63Postgres/86browser, PS46 and actualRealtime63+4 passed, then all14 normal2..15-player games completed eight rounds. The strict case errored after3.811seconds at initial fresh-command state before the second-player join was captured. Preparation did not run. This candidate does not prove strict push/reconnect/renewal/deadline outcomes or hostile acceptance.

The original27-file preservation manifest and additive strict-observations amendment are under that strict-ui/first-failure-supplement. Original failure lacked a DOM snapshot/PNG and exact rejected state. Later retained observations show host-only reads/one notice and no command acknowledgements; exact missing-versus-denied state and unique failure cause remain unproved. Source independently shows the entry-order gap: waiting for an actual Join action must precede inspecting its fresh perspective. Do not weaken the fresh unknown-pending/denial/malformed guards or erase rejected probes.

Read docs/evidence/release15/strict-entry/plan.md, receipt.json, protected-source.json and every native mock/real/edit-check artifact named by the consolidated receipt. Inspect tests/browser/ui-command-entry.contract.ts, ui-command-entry.phase6.spec.ts, ui-command-entry.ts, shared ui-command-acknowledgement.ts and strict adapter. The SAME actual-DOM oracle must discriminate correct/wrong behavior and bind real helpers; old210 isolated cases remain required. The initial missing-browser launch attempt and corrected mock's failed hidden-control/interrupted attempt stay retained. The final corrected gate must precede helper/adoption edits; derive actual counts and chronology from native receipts. Include hidden locators and actual operation settlement rather than a browser-event-turn assumption. Exact pending/malformed variants, same-page control authority, observer/original-error identity and pre-cleanup safe failure capture are part of the existing contract. Do not infer current full gameplay from isolated DOM success. The NEW frozen native matrix and strict attachments govern this review gate.

Read strict-evidence-collector/receipt.json and cline-progress-helper/receipt.json under docs/evidence/release15. Exact strict auxiliary collection and exclusion fixtures, and progress helper's isolated typed-event extraction controls, are operational evidence. They do not establish a future native Cline event shape or successful game. The new exact-commit strict diagnostic, if supplied, is an early diagnostic and does not replace the mandatory complete five-lane final gate.

Read hosting-readiness/backup-refresh-20261030T203154/index.json and hosting-readiness/resume-20261031-index.json. The former is a dated APP logical backup/restore proof, not current recovery-point or full-platform/off-site assurance. The latter is the fresh bounded prerequisite observation, not hosted acceptance: both forward012/013 migrations were absent; an owned staging guest/session and Realtime-config route returned200 and logout204, but its public-key DataAPI probe returned401 and actual exposed schemas remain unknown. Source configuration shape does not establish provider key validity or a private Realtime handshake. Preserve the normal guest profile/credential/outbox remnants and qualified expiry/outbox side effects. No blanket readonly or cleanup claim applies to that explicitly authorized staging guest smoke. Investigate current credential/transport validity through supported tools before hosted acceptance; do not silently treat local Realtime success as hosted proof. No production mutation was performed by that bounded inspection.
'@
foreach($text in @($preparerText,$templateText)){if($text.Contains('Use October30 as the working deadline')){throw 'Working deadline contradiction'}}
if(-not $PSCmdlet.ShouldProcess('review preparer and template','Retain inspected originals and add strict-entry failure/proof and current operational qualifiers')){return}
$retention='/tmp/wordpairs-review-before-entry-'+(Get-Date -Format yyyyMMddTHHmmss)
$null=New-Item -ItemType Directory -Path $retention
foreach($path in @($preparer,$template)){
    $copy=Join-Path $retention (Split-Path $path -Leaf)
    Copy-Item -LiteralPath $path -Destination $copy
    if((Get-FileHash -LiteralPath $copy).Hash -cne $expected[$path] -or (Get-FileHash -LiteralPath $path).Hash -cne $expected[$path]){throw 'Review input retention differs'}
}
[IO.File]::WriteAllText($preparer,$preparerText)
[IO.File]::WriteAllText($template,$templateText)
$parseErrors=$null;$parseTokens=$null
$null=[Management.Automation.Language.Parser]::ParseFile($preparer,[ref]$parseTokens,[ref]$parseErrors)
$findings=@(Invoke-ScriptAnalyzer -Path $preparer -Severity Warning,Error)
if(@($parseErrors).Count -or $findings.Count){throw 'Updated review preparer static validation failed'}
[pscustomobject]@{timestamp=(Get-Date -Format s);retainedOriginals=$retention;originalHashes=$expected;preparerSha256=(Get-FileHash -LiteralPath $preparer).Hash;templateSha256=(Get-FileHash -LiteralPath $template).Hash;parserErrors=@($parseErrors).Count;analyzerFindings=$findings.Count;qualification='Input preparation only. No case/helper implementation, frozen gate, model invocation, provider mutation or acceptance performed.'} | ConvertTo-Json -Depth 6
