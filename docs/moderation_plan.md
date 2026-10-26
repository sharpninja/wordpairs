# Wordpairs Content Moderation Plan

**Status:** Moderation policy baseline and technical workflow design approved in Phase 0; implementation awaits the global active-AC mock-validation gate  
**Requirements baseline:** `word_association_game_requirements.md` v2.6  
**Implementation sequence:** `implementation_plan.md`  
**Current scope:** player nominations and category/pair suggestions; no public chat

## 1. Purpose and scope

This plan defines the workflow, data boundaries, reviewer experience, audit trail, and test coverage for user-submitted candidate answers and category/pair suggestions. It supports FR-16–FR-17 and AC-16–AC-19 and AC-47 in the requirements. Requirements v2.6 establishes nomination thresholds, moderator roles, reasoned decisions, one senior-moderator appeal, and catalog activation gates; retention and audit details are also fixed there. The new public landing page (FR-22/AC-43/AC-50) may show leaderboard labels and lobby summaries; this plan treats those as a separate public projection, not moderation data. It does not publish user submissions or introduce a public chat feature.

There are two related but different flows:

- **Candidate nomination:** a player who solves during the no-hint stage nominates a word for possible inclusion in a future answer pool. A candidate must meet the approved nomination threshold and pass moderation; even then it cannot be played until editors create a complete curated word-pair record.
- **Category and pair suggestion:** a player who has ten lifetime wins on one stable profile proposes one relationship category and exactly three pairs. Review and approval do not make those pairs playable until each record and the category background are complete and the curated catalog passes validation.

The moderation process reviews content quality and suitability. It does not resolve the gameplay requirement questions, choose accepted-answer policy, or automatically promote content because it received votes. The curated catalog remains the only source of playable prompts, answers, hints, accepted alternatives, and background references.

## 2. Product principles

1. **Human decision for publication:** automation may check formatting, duplicates, and completeness, but only an authorized reviewer can approve user content for editorial use.
2. **Approval is not publication:** an approved nomination is only eligible for curation; an approved suggestion is only eligible for catalog preparation. Curated records need a separate editorial completion and release step.
3. **Explicit, consistent reasons:** every rejection, request for revision, and approval records a reason code and reviewer rationale. Apply the same policy to comparable submissions.
4. **Privacy by default:** do not expose nominator identities or private guesses to other players. The public game need not reveal reviewer identity or internal notes. Collect only the information needed to enforce eligibility and audit decisions.
5. **No paid moderation dependency:** use deterministic validation and human review. Do not make a paid language-model, moderation API, or other metered service a launch dependency. A later optional classifier would only prioritize/flag, never silently approve or reject.
6. **Separation of duties:** a submitter cannot approve their own submission. The authorized moderator/editor role is distinct from the ordinary player role. If one owner performs several roles in an early release, preserve the audit trail and expose that the review was self-administered.
7. **Decision records are durable:** retain an auditable history of threshold changes, reviews, status transitions, and catalog linkage. A moderation action must not rewrite nomination history.
8. **Keep live play safe and predictable:** only complete, approved content may enter a published catalog version. Nominations and suggestions never alter an active match.

## 3. Policy boundary and content standards

The requirements specify product outcomes. The content checklist below is operational guidance for human reviewers and does not change AC expectations; technical review interfaces and permissions are approved in Phase 0.

### 3.1 Reviewer checklist

| Review dimension | Approve when | Return/reject when |
|---|---|---|
| Eligibility | The submitter satisfies the approved gameplay/win rule; the record has required fields. | The submitter is ineligible, the nomination is from a hinted solve, or the submission is structurally incomplete. |
| Relationship | The prompt and answer form a clear, defensible relationship in the selected category; the relation is understandable without private context. | The pair is arbitrary, misleading, ambiguous, or categorized incorrectly. |
| Accuracy | Names, dates, titles, spelling, and claims are accurate enough for the approved content standard. Reviewer records a reference for disputed or non-obvious factual claims. | Material factual error cannot be corrected or the pair depends on an unsupported assertion. |
| Distinctiveness | The candidate adds useful variety and is not an accidental normalized duplicate of an existing candidate, pair, category, or alias. | It duplicates existing content without adding a useful accepted alternative. |
| Playability | The answer has a clear accepted-answer policy; three useful ordered hints can be written without revealing the answer too early; the prompt is solvable at the intended difficulty. | No fair prompt/hint sequence can be created or a hint leaks the target before its stage. |
| Audience and harm | Content meets the general-audience suitability baseline in the v2.6 requirements. Reviewers can flag slurs, targeted abuse, threats, personal data, sexual content, or other sensitive content for restricted review. | It violates the approved safety policy or targets a private person with abusive content. |
| Rights and attribution | Text/artwork can be used with appropriate permissions/notices and the pair does not depend on copying protected material beyond an approved use. | Required permission is absent, attribution is impossible, or a proposed asset conflicts with GPL distribution requirements. |
| Category quality | The category name is distinct, describable, and supports a coherent set of pairs and a suitable background. | It is a duplicate, too broad to guide content, or cannot be represented safely and consistently. |

### 3.2 Resolved moderation policy

Requirements v2.6 fixes the policy: ten unique profiles trigger review; each profile may nominate a candidate once and submit at most one candidate per eligible no-hint solve; an independent Content Moderator approves or rejects with a reason; one appeal may be submitted to a Senior Moderator; ten lifetime wins unlock one open category suggestion containing exactly three pairs. Approval does not publish incomplete content. Technical role storage, state-transition interfaces and audit schema remain Phase 0 design work.

Candidate matching uses the requirements' Unicode NFKC, trim, internal-whitespace collapse and case-insensitive normalization while preserving punctuation. The submitted spelling is retained separately for reviewer display. Public aliases and leaderboard opt-out follow FR-22. Rejected or pending user content is not public or playable. The requirements' retention schedule governs audit, idempotency and outbox records; no raw incorrect guesses are persisted.

## 4. Roles and permissions

| Role | Allowed actions | Not allowed |
|---|---|---|
| Player / submitter | Submit an eligible nomination; submit an unlocked category/pair proposal; view own submission status and public decision reason; submit one appeal to a Senior Moderator. | See another player's private nomination identity, internal reviewer notes, or unresolved drafts; approve own content; edit the live catalog. |
| Moderator | Review assigned eligible cases; request revision, approve for editorial curation, reject with a reason, flag risk, and view only the submitter/eligibility data needed to decide. | Change vote history, change game scores, make content playable, approve own submission, or silently delete audit history. |
| Content editor | Convert approved nominations into complete pairs; edit/complete pair data; attach category/background; validate catalog; prepare a catalog release. | Bypass moderation status or publish unreviewed content. |
| Administrator | Manage moderator/editor accounts, policy configuration, and emergency content disablement; inspect audit history. | Erase the audit trail or make a user proposal playable without the required moderation/editorial checks. |
| System | Validate structure, normalize duplicate keys, count eligible votes/wins, create queue cases, enforce status transitions, and record immutable events. | Make final content suitability decisions unless a specific deterministic rule has been approved. |

The landing page uses generated public aliases and honors profile opt-out as specified in v2.6. Do not expose moderator-only fields or nomination histories as leaderboard data. If player-selected labels are used publicly, the display-name policy must define reserved/prohibited strings, report/removal handling, and how a disabled label is represented. These choices belong to the landing-page decision register, not the nomination review queue unless the product owner explicitly connects the workflows.

Moderator and senior-moderator authority is defined by the v2.6 policy; role storage and server-side assignment are technical design items. All privileged actions require server-side role checks; hiding an admin link in the browser is not authorization. Use the least-privilege service key only server-side. Require re-authentication or additional confirmation for permanent deletion and emergency disablement if supported by the approved identity design.

## 5. Submission lifecycle

### 5.1 Candidate nomination lifecycle

1. **Eligibility check:** on submission, the server verifies the player identity, active game/round, accepted no-hint solve, one-time/duplicate policy, and allowed submission window.
2. **Input handling:** retain the original spelling for display; derive a normalized comparison key using the v2.6 normalization rules; reject empty, excessive-length, malformed, or control-character input. Do not put raw text in general logs.
3. **Duplicate/threshold handling:** associate the nomination with the canonical candidate record or create a pending candidate. Apply the unique-profile and one-candidate-per-eligible-solve rules transactionally. Recheck threshold at commit to avoid double counting.
4. **Pre-review state:** keep below-threshold candidates out of playable content and out of public room views. Flag suspected personal data or prohibited content for restricted review; flagged content remains hidden from public projections and is not playable.
5. **Review queue:** once threshold and required eligibility rules pass, create exactly one active moderation case. Store the threshold snapshot and nomination count that triggered the case; subsequent votes remain auditable and do not duplicate the queue item.
6. **Human decision:** reviewer inspects original/normalized text, duplicate candidates, counts, game context, and references. Reviewer chooses `approved_for_curation`, `needs_revision`, `rejected`, or a restricted `escalated` state 
7. **Curation:** approval marks the candidate eligible for future-pool curation, not playable. Editor creates a complete pair with prompt, category, target, three hints, accepted answers, and background; content validation must pass.
8. **Catalog release:** only a reviewed catalog version with complete records is deployed. Record which moderation case and source candidate led to the pair. Never alter a published active match's content snapshot.

Open a moderation case when the ten-unique-profile threshold is reached. Approval and threshold are independent eligibility gates: neither alone makes a candidate eligible for curation.

### 5.2 Category-and-pair suggestion lifecycle

1. Check the ten-lifetime-wins stable-profile rule on the server; do not trust a client-supplied win total.
2. Accept one category proposal with exactly three pair proposals as a single submission transaction. Enforce size limits and field validation for each proposed pair.
3. Snapshot the eligibility evidence, proposer, category label, three pair records, submission time, and version. The proposer may not edit the submitted version in place.
4. Run deterministic validation: duplicate category/name, pair duplicates, missing fields, invalid hint count/order, invalid category/background references, prohibited markup/control characters, and content-size bounds.
5. Place the complete submission into review. Moderator considers the category and all three pairs together, with the option to request revision of the whole package or individual pairs.
6. On approval, create an editorial work item. Editors verify the relationship, factuality, answer alternatives, three hints, and artwork/background rights; a category background asset is not user-uploaded at launch under the current requirements.
7. Validate the finished catalog record and include it in a versioned catalog release. Only then is any proposed pair playable.
8. On rejection, preserve the case/reason and provide only approved public feedback. A resubmission is a new version linked to the prior case, not destructive overwrite.

### 5.3 Case states

Keep nomination eligibility, moderation review, editorial completion, and playability as separate dimensions rather than one overloaded status field.

| Dimension | Suggested states | Meaning |
|---|---|---|
| Nomination threshold | `collecting`, `threshold_met`, `withdrawn`, `closed` | Counts and availability; threshold is not an approval. |
| Moderation case | `not_queued`, `queued`, `in_review`, `needs_revision`, `approved`, `rejected`, `escalated`, `appealed`, `closed` | Human decision lifecycle. One appeal may be filed to a Senior Moderator; technical transition invariants are finalized in Phase 0. |
| Editorial curation | `not_started`, `in_progress`, `blocked`, `complete` | Whether a complete validated game record exists. |
| Catalog availability | `not_playable`, `scheduled`, `active`, `disabled` | Release-level state; only `active` content can enter a newly created round. |

Transitions must be explicit and permission-checked. A change in one dimension cannot imply a transition in another: `threshold_met` does not mean `approved`; `approved` does not mean `complete`; `complete` does not mean `active` until a catalog release includes it.

## 6. Data and audit design

Finalize physical schema during architecture planning. The following logical records are required for reliable enforcement:

- **Candidate:** stable ID, original display form, normalized comparison key/version, creation time, current threshold state, aggregate eligible-voter count, and current moderation/editorial pointers.
- **Nomination:** candidate ID, player/profile ID, source game/round ID, eligibility evidence, submitted form, timestamp, and idempotency key. Uniqueness constraints encode the approved repeat-vote policy.
- **Category/pair submission:** submitter, eligibility evidence, immutable version number, category proposal, exactly three proposed pair objects, timestamps, and linked prior revision/case where relevant.
- **Moderation case:** target type/ID/version, state, assigned reviewer, priority/flags, reason code, reviewer rationale, created/updated/closed times, and appeal linkage.
- **Moderation event:** append-only actor, action, previous/new state, timestamp, policy version, reason code, and non-secret metadata. Do not store complete OAuth tokens or raw guesses in the audit record.
- **Editorial item/catalog record:** source case/candidate, final pair/category fields, content provenance/reference notes, approval status, catalog version, and activation/disable history.

Enforce uniqueness and threshold counting in database transactions or a server-controlled database function so concurrent votes cannot cross the threshold inconsistently. Add row-level security that denies client-side direct updates to moderation states, thresholds, and catalog publication. Use service operations for authorized review actions. Keep a small, explicit list of public status fields; internal notes, risk flags, voter identities, and staff data remain private.

The resolved retention schedule is one year for audit events, seven days for published outbox rows, and until 30 days after room close for idempotency results. Raw incorrect guesses are not persisted. Moderation candidate/submission records retain only the content and identity linkage required for review and audit; access is restricted and deletion/pseudonymization follows applicable account-removal requirements without erasing the fact of a decision.

## 7. Moderator operations

### 7.1 Queue and review procedure

1. Open the case from the authenticated moderation interface; verify the target type, current version, eligibility evidence, duplicate search, and reason the case entered review.
2. Confirm no concurrent reviewer has completed or changed the case; use optimistic version checking when saving.
3. Review each checklist dimension from Section 3. Add factual references for claims where accuracy is not common knowledge. Mark uncertainty as a question or request for revision rather than inventing a fact.
4. Select a reason code and write brief, actionable rationale. Keep private operational notes separate from the submitter-facing explanation.
5. Save the decision atomically; system records reviewer ID/time, case version, policy version, old/new status, and rationale. Reject stale writes and preserve the current case state.
6. If approved, create/link the editorial task and explain that approval is not publication. If rejected or returned, notify the submitter with the approved public reason and next permitted action.
7. For escalated/high-risk content, hide the submission from ordinary player views pending a second authorized review. Preserve evidence with restricted access; do not quote the material publicly.

### 7.2 Queue ordering and workload

Use FIFO order as the simple default, with explicit escalation for risk flags, appeals, and approaching operational review age. Do not reward controversial or harmful content with visibility or popularity ranking. Display age, queue reason, candidate type, and current state; do not show personally identifying player details unless necessary to make a decision.

Because this is a free-tier, small-scope project, the initial approach is an owner-operated manual queue rather than paid moderation SaaS. Define a target review window only after expected submission volume and reviewer availability are known. The UI should state that review can take time; do not promise an unsupported SLA. Alerting may use existing free project email or a manual queue check, but the release cannot depend on a paid notification provider.

### 7.3 Appeals, revision, and emergency disablement

One appeal may be submitted to a senior moderator. Before implementation, the Phase 0 interface contract must specify the appeal state transition, eligible reason categories, reviewer separation, and resubmission handling consistently with that policy. Preserve every version and decision. Do not let an appeal silently restore content to the play pool.

Provide a privileged `disable` operation for active catalog content that is found to be harmful, inaccurate, rights-infringing, or otherwise unsuitable. It blocks inclusion in future rounds and future catalog releases; it cannot rewrite already completed match history. An active match continues using its content snapshot; disablement prevents selection in future rounds and catalog releases. Record actor, reason, time, affected catalog version, and whether the content remains visible in historical summaries.

## 8. Moderation controls and acceptance-criteria traceability

AC-16 through AC-19 and AC-47 cover catalog completeness, nomination thresholds/moderation, category-suggestion unlock, authorization and audit. The controls below detail implementation of those accepted requirements and technical safeguards. Additional product behavior is out of scope until explicitly added to requirements and the traceability matrix.

| Control | Given/when/then contract |
|---|---|
| **M-01 Role enforcement** | Given a player without a moderator/editor role, when they call a review, edit, or catalog activation operation, then the server rejects it and records no state change. |
| **M-02 Nomination uniqueness** | Given the approved vote-counting policy, when duplicate or repeat nominations arrive concurrently, then the candidate count reflects only eligible distinct votes and remains correct after retries. |
| **M-03 Independent gates** | Given a nomination meets the threshold but lacks approval, or has approval but is below threshold, when future-pool eligibility is calculated, then it remains ineligible. |
| **M-04 Review audit** | Given an authorized reviewer changes a case, when the transition commits, then an immutable event records actor, time, prior/new state, policy version, and reason while keeping internal notes private. |
| **M-05 No self-approval** | Given a submitter is also a moderator, when that person attempts to approve their own version, then approval is blocked or the separately approved self-review policy is applied and audited. |
| **M-06 Revision history** | Given a submitter revises a returned proposal, when the new version is reviewed, then the prior version and decisions remain auditable and the new version requires review. |
| **M-07 Catalog boundary** | Given approved content is incomplete or absent from an active catalog release, when a match selects content, then the record cannot be played. |
| **M-08 Restricted-content handling** | Given a submission triggers an approved sensitive-content flag, when it is escalated, then it is hidden from ordinary player views and accessible only to authorized reviewers. |
| **M-09 Disable active content** | Given an authorized editor disables a catalog item, when a new round starts, then the disabled item is excluded; historical match records remain stable. |
| **M-10 Privacy** | Given a player views a room or another player's status, when moderation data is returned, then voter identity, private notes, raw guesses, and staff-only flags are not exposed. |

M-01 through M-10 are moderation-plan controls, not independent acceptance criteria. Trace applicable controls to AC-16–19/47; do not use additional controls to claim AC coverage.

## 9. Mock-first test and implementation plan

Moderation code follows the same Byrd Development Process v4 gates as the rest of Wordpairs. For each increment, tests for every applicable accepted AC are written first, validated against mocks/fakes, and only then can implementation begin. Maintain the AC/test matrix in `implementation_plan.md` and add moderation-specific test IDs when the policies are approved.

| Increment | Scope | Required mock-first cases |
|---|---|---|
| **M0 — Policy and interface baseline** | Approve the standards, roles, thresholds, state transitions, normalization, appeals, retention, and new ACs. Define review use-case/API contracts and database access boundaries. | No production code. Define test cases and mock interfaces for role verification, candidate repository, policy version, threshold counter, clock, and audit writer. Resolve expected results before tests are written. |
| **M1 — Eligibility and nomination capture** | Enforce no-hint solve, nomination window, input limits, normalized candidate key, duplicate policy, and transactional vote count. | Eligible/ineligible player; no-hint vs hinted solve; duplicate spelling; Unicode/case/whitespace variants; repeat attempt; concurrent threshold race; idempotent retry; invalid/control/oversize input. Cover AC-17 and approved M-02. |
| **M2 — Threshold and moderation queue** | Maintain candidate gate states and create a queue case under the approved before/after-threshold policy. | 9/10 boundary, vote removed/invalidated policy, approved-but-below-threshold, threshold-without-approval, concurrent queue creation, no duplicate cases, restricted flag access. Cover AC-18 and approved M-03/M-08. |
| **M3 — Review permissions and audit** | Role-guard review actions; implement approved state transitions, reason codes, optimistic concurrency, private/public views, and immutable audit. | Player denial; moderator permitted; self-approval rule; stale case version; invalid transition; private-note non-disclosure; audit commit/rollback behavior. Cover approved M-01/M-04/M-05/M-10. |
| **M4 — Revision, appeal, and editorial handoff** | Implement approved revision/appeal flow and curation item creation. | Old versions retained; revision re-enters review; appeal assigned appropriately; rejection does not publish; approval creates editorial task but not playable content. Cover AC-18 and approved M-06/M-07. |
| **M5 — Category/pair proposals** | Enforce win-unlock, exactly three pairs, package review, and catalog/editor handoff. | Below/at win threshold; client-forged wins rejected; wrong pair count; incomplete record; duplicate category/pairs; approval still not active/playable. Cover AC-19, AC-16, and approved M-01/M-07. |
| **M6 — Disablement and moderation integration** | Implement catalog disablement and integrate moderated content with release versioning and active-match snapshots. | Disabled item excluded from new rounds; in-progress match follows approved snapshot rule; history unchanged; audit and catalog version linkage. Cover approved M-09 and regression AC-16/18/19. |

Use fake clocks, deterministic IDs, repository fakes, transaction fakes, and event capture. Mocks must reflect public contracts rather than copy the business rule under test. After unit tests pass, add Supabase migration/RLS/transaction integration tests using local or disposable Staging data. Browser tests cover submitter and reviewer views with network interception and synthetic data. No automated test uses Production credentials or paid moderation services.

## 10. Security, privacy, and abuse controls

- Enforce submitter identity and eligibility on the server; ignore client-supplied profile IDs, win counts, solve stages, vote totals, or moderator roles.
- Rate-limit submissions and review mutations using a design compatible with Free quotas. Do not reveal if a specific player nominated or reported a word. Define limits as approved policy and test boundaries.
- Normalize only for comparison; do not discard original spelling before review. Guard against Unicode confusables, hidden bidirectional controls, control characters, markup injection, and excessively long text.
- Render submissions as text, never unsanitized HTML. Escape all moderator rationale and user-facing decision text. Avoid embedding user text into logs, URLs, or metric labels.
- Keep candidate status and reviewer data out of public room Realtime channels. Publish only explicitly whitelisted events to authorized recipients.
- Protect moderation/admin routes with server-side authorization, CSRF protection appropriate to the chosen route model, rate limiting, and audit logging. Use service credentials only in the server runtime.
- Minimize retained personal data and apply the v2.6 retention schedule. Never retain raw incorrect guesses for moderation; the game requirement says guess text remains private.
- Treat suspected threats, personal information, or rights complaints as restricted cases; suppress public display while review is pending
- Do not assume a content filter can make final policy judgments. Any classifier is a future, optional triage aid that must have its own cost, bias, privacy, accuracy, and appeal review.

## 11. Moderation quality and operational metrics

Metrics should measure process health without turning vote count into a popularity contest or exposing individuals:

- Counts by candidate/suggestion status and queue age.
- Median review time and backlog size; number of revision requests, approvals, rejections, escalations, and appeals.
- Duplicate rate, incomplete-submission rate, catalog-validation failure rate, and content disabled after publication.
- Threshold-to-review transition failures and concurrent count reconciliation errors.
- Privacy/security incidents, unauthorized actions blocked, and audit-write failures.

Do not publish nominee identities or rank candidate words by vote totals. Set targets only after observed volume is known. A review backlog must not automatically approve pending submissions; pending content remains unplayable.

## 12. Rollout and completion gates

1. **Baseline review:** verify the resolved v2.6 policy is reflected in the moderation interface, state model and test specifications.
2. **Requirements update:** add requirements and acceptance criteria only if scope changes; update and render relevant diagrams as SVG when workflow topology changes.
3. **Design review:** approve data model, authorization matrix, state machine, public API, privacy boundaries, queue UX, catalog handoff, and audit schema before coding.
4. **Mock-first tests:** map every active AC to test IDs; validate all tests for the increment against mocks before production implementation. Maintain 100% active AC coverage and green prior increments.
5. **Staging trial:** use synthetic submissions and test moderator/editor accounts; verify role checks, queue transitions, audit history, privacy projections, and catalog release linkage.
6. **Release gate:** confirm no unreviewed or incomplete user proposal is playable; review dependencies/license/attribution and protect the Production catalog migration. Keep content enablement separate from deployment.
7. **Operations review:** inspect queue health and audit integrity; respond to flags using approved policy; review policy effectiveness after actual use and revise requirements through the normal change process.

Moderation is complete for a release only when every approved moderation criterion passes, sensitive/internal data is not exposed, audit events are verifiable, approved content cannot skip curation/catalog gates, and moderators can act without accessing Production secrets or raw private gameplay data beyond what the approved review policy requires.

## 13. Resolved policy and remaining technical review

The product policy checklist is resolved by requirements v2.6; there are no open product decisions for nomination count, nomination eligibility, moderation roles, appeal count, lifetime-win scope, public aliases, or retention. Phase 0 review remains for technical role assignment, authorization and RLS, state transitions, concurrent threshold enforcement, audit transaction boundaries, and test interface definitions. These technical approvals do not change acceptance outcomes.
