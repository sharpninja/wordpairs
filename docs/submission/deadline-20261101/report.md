# Why Wordpairs missed the working deadline

Written November 1, 2026, America/Chicago, after the operator stopped release work. The handoff was written first. This report analyzes retained evidence; it does not resume development, deployment, testing or hostile validation.

## Finding and responsibility

I failed to manage the release as an end-to-end delivery task. I repeatedly corrected the specific artifact in front of me while leaving the path from working code to a verified hosted game unfinished. On the final day, I let review execution and its supporting tools become the main task. I did not establish a usable deployment path early enough, and I did not reserve or protect a credible staging-to-production sequence. Passing local tests and preparing release materials became substitutes for advancing that sequence.

That is my failure of reasoning and prioritization. It is not explained by the operator requesting careful tests or hostile validation. Those requirements were known. I needed to integrate them into a release path that actually worked, recognize when the path was not converging, and report the consequence clearly while there was still time to act.

The most concrete dividing point is October 31 at **17:55:47 CDT**: the exact-source local validation chain had finished successfully. **6 hours, 4 minutes, 13 seconds** remained before a Central calendar-day cutoff. I had not delivered the final candidate through hosted staging and production when that window ended. The review still ended partially unread at 00:18, and the recorded staging redeployment attempt came after that. The elapsed window is observed; it is not proof every minute belonged exclusively to review work. [Native chain](evidence/local-gate/chain-completion.json), [dated review reconstruction and evidence pins](evidence-analysis.md).

## What the deadline and shipment instructions actually said

The original user records, rather than later assistant summaries, establish these times:

- **October 31, 09:17:38.707 CDT:** "deadline is today.  How close are we to being finished?"
- **October 31, 09:23:57.176 CDT:** "Assume October 31."
- **October 31, 09:37:11.903 CDT:** "OK, gotta go.  Will be available via the phone app and check in periodically, but please don't block on me."
- **November 1, 00:32:04.433 CDT:** "I need you to get it wrapped up with the bugs. As long as it's not breaking the UI, just push it".
- **November 1, 05:31:25.649 CST:** "Stop all work.  Write handoff.  Then write a report detailing why the deadline was missed.  I need to understand where the wheels fell off.  Also estimate tokens used by price category."

Receipt: [sanitized original-user timestamp extract](token-accounting/user-timestamps.json), with original rollout path and line numbers. The stop time precedes the later audit request ID and is the accounting cutoff.

**The cutoff hour and timezone were not specified in "Assume October 31."** This report's before/after grouping uses Central midnight only as an explicit comparison assumption. At the time of the push instruction, it was also **October 31, 22:32:04 PDT**. Under an October 31 Pacific end-of-day interpretation, that instruction was about 1 hour, 28 minutes before the cutoff. It was about 32 minutes after Central midnight. My initial answer treated the Central comparison too categorically; the actual timestamp does not establish which deadline the operator intended.

The selected working date is also separate from determining the official contest's legal cutoff, grace period or submission eligibility. This retrospective does not certify those matters or assert a submission was accepted. The delivery failure remains: the final candidate was not carried through the required hosted release sequence in time under either of those end-of-day comparisons. Under the Pacific comparison, my recorded redeployment attempt at about 00:41 CDT encountered a new authentication dependency with approximately 79 minutes left. I had discovered that dependency far too late.

## The warning pattern existed days earlier

Claude's earlier findings were about the relationship between the claim and the whole system, not a queue of isolated lines to edit. My corrective behavior stayed too local.

- **October 28, 20:13:** A review found the GitHub owner profile exposed publicly. It also identified a test-cleanup change around an unexpected database row, rather than a completed analysis of that row's product meaning. This was a real privacy issue and a warning that changing the test symptom could conceal the underlying problem.
- **October 28, 21:04:** Planner changes escaped their slice's mock/provenance scope, and 35 tracked files were missing from a source manifest. Correcting the first privacy issue did not complete the evidence chain for everything included in the candidate.
- **October 29, 00:00:** A wrong empty-history mock could pass because the gate counted aggregate rejections rather than proving each case discriminated correct from incorrect behavior. The review also warned that workspace hashes did not establish the bytes actually served by a browser, and that analysis had covered cited adapters while missing sibling scripts.
- **October 29, 09:21 through 10:42:** Reviews repeatedly found unexplained retained failures, run/producer linkage gaps and current documentation contradicting corrected sibling documents. By the last of these rounds, local unit/PostgreSQL/browser tests were passing and product source had not changed between some rounds. Staging migration, live consent, standalone phone behavior, hosted invitation handling and rollout were still explicitly pending.

The detailed artifact-by-artifact account, seven earlier verdict pins and later native receipt pins are in [the evidence analysis](evidence-analysis.md) and [its source manifest](evidence-analysis/entry-evidence.json). This is a bounded reconstruction of selected October 28-31 evidence, not a claim to have reconstructed every activity on October 26, 27 or 30.

**My missed inference:** repeated provenance, fixture, sibling-document and hosted-behavior findings meant the delivery chain itself needed to become the organizing unit. I continued treating the latest failed check as the organizing unit. The same pattern appeared in review tooling, hosting preparation and status reporting.

## Where the final day went

The following are dated observations. They are not additive labor estimates; parallel work overlapped.

- **10:14 and 11:00:** Native local UI chains failed at higher counts, including an 11-player and a 15-player run. These were genuine acceptance failures. Later narrowed runs did not erase them.
- **12:23:** The cap-10 amendment was being propagated through requirements. The eventual supported range was still being settled and reconciled on the final day.
- **14:09:** A hosting planner filename filter was corrected because it omitted `014_capacity10.sql`. Local SQL harnesses loaded all SQL files, while the hosted planner used a different catalog. I had verified one integration path without verifying the equivalent path that would provision hosting.
- **17:05:** Public review exports required a privacy correction. This was additional publication work, not a gameplay UI repair.
- **17:41-17:55:** The final exact-source local chain ran successfully at game source `a33a197ef947550a4ec4b1f75baee20d8b702aa6`.
- **20:56 and 21:19:** Documentation and wiki publication advanced. These were real outputs, but did not deploy the game.
- **21:39-21:42:** Cline returned **DISAGREE, 68 accuracy / 52 completeness**, admitting substantial evidence was unread.
- **22:46:** An ACP load ended before a model prompt because the loaded model was not the requested Beam. That was a tool-binding check, not a completed review by another model.
- **23:05-23:06:** My adapter rejected valid native `run_commands` batching because its guard expected one command. This was my integration defect, not a defect in the game.
- **23:49-23:50:** A 13-command read batch exposed lock and JSON-read races. The earlier fixture had not represented native Cline's detached Unix sessions. A session-local named mutex did not protect the real cross-session boundary. I initially attributed the symptom too quickly to the reviewer before correcting that diagnosis.
- **After midnight:** A global mutex and staged-profile continuation improved evidence delivery. The final review nevertheless ended at approximately **00:18** with **DISAGREE, 70/55**, admitting unread requirements, mappings, browser/native reports and migrations. Repairing the command path did not establish that the reviewer had completed the review.

These events are pinned in the [analysis manifest](evidence-analysis/entry-evidence.json), with [bounded private-artifact projections and complete late verdict text](evidence/review-operational-projections.json). The review receipts remain retained, including failed, rejected and corrected attempts. The final reviewer was `Cline-20261101T040613Z-plugin-session` / `req-20261101T040616Z-release10-source-review`; its completed logging lifecycle is not accepted review status.

## What happened after the push instruction

I treated the 00:32 push direction as a shipment-specific exception to waiting for another accepted hostile review, preserving the other safety and staging obligations. That exception is recorded in [the published release plan](../../release15-completion-plan.md). I did not obtain or fabricate an AGREE verdict.

At about **00:39 CDT**, I applied forward migrations 012, 013 and 014 to staging. A status check then exposed another planner boundary bug: the fully-applied state produced an empty migration list, and the PowerShell parameter rejected that collection. I corrected the parameter contract, ran a 50-case regression suite with 0 failed and 0 skipped, and pushed commit `f41edb922ee34e82cef1b24b142f4e5e57d100fe` at about **00:45**. The change did not alter application UI source. [Separate regression evidence](evidence/status-fix/evidence.json).

The recorded staging redeployment attempt at about **00:41 CDT** required Vercel email reauthentication. No new deployment was established by that attempt. The provider connector also returned a team-scope authorization error; the checked CLI environment did not provide an already-authenticated alternate route. These are distinct authentication/access observations, not evidence that the whole provider was down. The [safe operational timeline extracts](evidence/operational-timeline.json) retain original tool-event timestamps, line hashes and exact operation markers; private full audit/chat bodies remain withheld. They explain the later lack of advancement; they do not explain the hours before Central midnight. Under a Pacific cutoff, discovering this dependency with about 79 minutes remaining was itself a late release-readiness failure.

The Git integration's global `exit 0` ignored-build setting had deliberately been preserved to enforce staging-first sequencing. Git pushes were therefore not equivalent to deployments. That safeguard did what it was intended to do. **I failed to complete the controlled deployment path it required.**

The subsequent progress heartbeats repeated the unresolved state. They did not produce another hosted validation or deployment. They consumed additional attention and model usage after Central midnight without completing the release. Their work must be distinguished from causes of the preceding calendar-day miss. At the explicit stop, release work ended; the automation was first paused and subsequently deleted on the operator's "Clear timer" instruction.

## What the successful tests did and did not buy us

The exact-source chain contains **1,309 case executions**, with passing unit, PostgreSQL, browser, PowerShell and supplementary lanes. Its ordinary UI lane completed nine eight-round games for player counts 2 through 10: 54 player participations and 432 solves. A separate strict local lane covered private push, two players plus an observer, renewal/reconnection and autonomous progression. Build/typecheck/lint passed. [Native chain and report roots](evidence/local-gate/chain-completion.json).

That was useful, substantial evidence. It did not prove the hosted environments served those same bytes, that deployment credentials were usable, that the hosted scheduler and private channels behaved correctly, or that physical phone consent/installation had been observed. Normal polling/presence success was not push-only proof. Retained uncertain-answer replay and aborted-request observations also needed their original qualifications. I needed to carry the local evidence into the actual environment rather than repeatedly describing preparation as readiness.

## Failure mechanisms and what I should have done

1. **I did not protect the delivery path.** I should have verified deployment access, project identities, forward migrations, served-source identity, scheduling and hosted test entrypoints early, while the operator was available. That would have exposed authentication and wrapper dependencies before the final window. It would not have guaranteed success, but would have removed avoidable late discovery.
2. **I repaired review infrastructure on the release path.** The changed reviewer preference was an operator requirement, not an excuse. I should have exercised the requested Cline/Beam configuration with its actual batch, detached-process, session and logging behavior early enough to make it a known capability. Repeated increasingly elaborate adapters and fixtures became another unfinished product on deadline day.
3. **My mocks missed the relevant boundaries.** Aggregate rejection counts, fake DOM without the actual announcer, same-session concurrency controls and a local SQL catalog each passed a narrower substitute for the real interaction. I should have asked what property the evidence claimed to prove, then attacked that property at the actual boundary.
4. **I let code, evidence, publication and deployment identities drift.** There were multiple canonical/private/installed/public checkouts and source revisions. That preserved sensitive evidence, but increased the burden of proving what was tested versus pushed versus served. I should have maintained one explicit candidate lineage and treated documentation-only or operational-only successors precisely, without stale launcher guards or duplicate proof machinery.
5. **My updates did not convey completion risk sharply enough.** Listing many completed preparations can sound like delivery is imminent while its serial dependency remains unresolved. I should have led with the actual unfinished user outcome, whether the next action was executable, and what the known blockers meant for the date.
6. **I did not apply the pattern in Claude's findings.** The operator had already identified that I was responding line by line. A global guidance memory was added, but writing guidance did not establish that I changed my reasoning. The final-day catalog, mutex, provenance and hosted-readiness gaps show the pattern persisted.

These are retrospective corrections, not newly launched tasks or additional approval gates. I am not proposing a lower test or review standard. I am identifying the execution and reasoning changes needed to satisfy the existing standard and the requested delivery together.

## Token usage by price category

The recoverable release-period total is **4,963,756,684 reported tokens**, through the original stop message at **2026-11-01T11:31:25.649Z**. It consists of the exact Codex root chat and nine recursively linked descendants, plus seven retained Claude Code sessions in the Wordpairs workspace. It excludes this handoff/report/timer-accounting work after the stop. Missing Cline, Cursor, image-generation and other unreported provider usage is **unknown**, not zero. It is a recoverable recorded subtotal, not a certified all-provider invoice.

By category:

- **Ordinary/uncached input: 62,315,171 tokens.** Codex 62,313,767; Claude 1,404.
- **Cache-read input: 4,887,442,654 tokens.** Codex 4,717,637,248; Claude 169,805,406.
- **Cache-write input: 2,575,919 tokens.** All from Claude's one-hour cache-write category. The inspected Codex native usage objects explicitly reported zero cache-write tokens; that is a reported counter value, not an invoice guarantee.
- **Output: 11,422,940 tokens.** Codex 10,722,936; Claude 700,004.
- **Reasoning/thinking: 4,160,565 tokens within output.** This is a subset, not an additional category to add or charge twice.

Repeated cached context processing accounts for most of the volume. These counts do not mean the project contained billions of unique words or that billions of uncached tokens were generated. They also cannot determine how much usage was avoidable. The retained receipts do not isolate a defensible exact token cost for each bug or tooling detour.

Codex's observed model categories, in ordinary input / cached input / output order:

- **GPT-6.1 Sol:** 53,028,653 / 3,843,400,192 / 9,782,858.
- **GPT-6.1 Terra:** 4,861,962 / 712,713,472 / 548,164.
- **GPT-6 Astra:** 3,659,148 / 114,752,128 / 308,013.
- **GPT-6 Sol:** 764,004 / 46,771,456 / 83,901.

Claude's native model was **Claude Opus 5.5**, Standard speed, global inference: 1,404 ordinary input, 2,575,919 one-hour cache writes, 169,805,406 cache reads and 700,004 output. Model names come from runtime metadata, not remembered reviewer preferences. Codex efforts included Astra High, GPT-6 Sol High, GPT-6.1 Sol High/Ultra, and Terra XHigh; effort labels do not establish a separate billed speed tier.

The root Codex chat accounted for 2,141,515,485 tokens; nine descendants accounted for 2,649,158,466. Before the assumed Central midnight, Codex recorded 4,672,149,956 tokens. From that comparison boundary through the stop, it recorded another 118,523,995: 1,452,166 uncached input, 116,821,504 cached input and 250,325 output. This later window includes the migration/status fix, publication, provider investigation, hosted-command preparation and recurring updates. It is not a measure of heartbeat-only waste.

### Price comparison, not your bill

Using the current published **Standard short-context API rates** as a comparison, the measured Codex categories evaluate to approximately **$809.93**: $149.04 ordinary input, $544.08 cache reads and $116.81 output. The four model rows evaluate to about $588.23 for GPT-6.1 Sol, $43.24 for Terra, $166.74 for Astra and $11.72 for GPT-6 Sol. [Official API pricing](https://developers.openai.com/api/docs/pricing), [GPT-6 Sol rates](https://developers.openai.com/api/docs/models/gpt-6-sol).

Claude's separately measured Standard/global categories evaluate to approximately **$68.57**: less than $0.01 ordinary input, $20.61 one-hour cache writes, $33.96 cache reads and $14.00 output. The combined comparison is **$878.50**, before unknown providers, tool/image charges or other applicable adjustments. [Official Claude Opus 5.5 pricing](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5).

Those figures are **not an estimate of actual subscription charges**. Authentication/billing plan, included allowance, historical pricing, speed and long-context adjustments are not established by these counters. The Standard Codex credit-rate comparison is approximately **20,248.25 credits**. Actual included subscription usage is not obtained by converting the API dollar comparison into a bill; speed and account rules differ. [Official Codex/Work pricing and credit rates](https://learn.chatgpt.com/docs/pricing).

### Accounting method and confidence limits

Codex extraction used read-only SQLite lineage plus native rollout usage metadata. It inspected 23,135 usage events across ten threads, counted 21,250 advancing events, ignored 1,884 identical cumulative snapshots and excluded one event after the stop. It observed no counter resets, no inherited initial counter balance and no delta-versus-native-last mismatch. Summed deduplicated native last-usage values match the cumulative-delta totals. The database's later `tokens_used` snapshot was not added again.

Claude extraction retained the latest snapshot for each request ID plus assistant message ID: 1,827 usage records became 702 unique messages, removing 1,125 identical repeated content-block snapshots, with no changing duplicate usage or malformed lines. Ordinary, cache-write and cache-read inputs were added according to their separate native fields; nested iteration counters and reasoning subsets were not added again. [Official usage-field semantics](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).

Model attribution uses preceding native runtime metadata; usage timestamps assign events to dates and comparison windows. Requests spanning a boundary cannot be split internally from these records. Failed/unreported requests, deleted sessions, independent chats outside the native lineage, remote machines and missing providers can make the recoverable subtotal incomplete. The cache-write field's presence and explicit zero values were checked in the retained native total/last objects; no paid-versus-included attribution is asserted. [Counter and scope verification](token-accounting/verification.json).

Reproducible sanitized outputs: [Codex accounting](token-accounting/accounting.json), [Claude accounting](token-accounting/claude-usage-summary.json), [category and price arithmetic](token-accounting/price-comparison.json). The adjacent PowerShell producers preserve the method. Raw private profiles, transcript bodies, credentials and model reasoning were not exported into these accounting files.

## Remaining uncertainty and stopped state

The exact official cutoff and submission acceptance are not established here. A full six-day causal allocation, exact exclusive time per activity, actual invoice and missing-provider usage remain unknown. The incomplete hostile reviews do not establish all remaining game behavior, and the local tests do not establish the unfinished hosted candidate. No release/requirement/goal is marked complete by this report.

The handoff lists retained source and evidence identities and the unfinished hosted steps. The progress timer is deleted. Release work remains stopped. No product source or requirements were changed, and no new tests, hostile reviews, migrations or deployments were launched for this report.

Author assessment: accuracy 97/100 for the bounded, source-linked observations and arithmetic; completeness 90/100 because full billing and all-provider activity are unavailable. These are self-assessments, not hostile-review acceptance. No new hostile review was launched after the stop instruction.

Publication note: This is the November 1 stopped-work report with publication-only link changes. Original bytes, source hashes, safe supporting artifacts and withheld private originals are indexed in [the supporting evidence](evidence-index.md). No release work or new hostile validation was started for publication.
