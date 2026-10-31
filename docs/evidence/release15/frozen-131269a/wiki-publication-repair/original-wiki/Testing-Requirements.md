# Testing Requirements (MCP Server)

## TEST-ACCESSIBILITYDETAILS

### TEST-ACCESSIBILITYDETAILS-144

Verify the documented UI behavior: Contrast, focus, announcements and touch geometry.

**Acceptance Criteria:**
- [x] Normal text contrast is at least4.5:1, large text3:1 and essential control/state indicators3:1 against adjacent colors under the W3C definitions and applicable exceptions. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. DOM/Chromium evidence; no physical assistive technology certification.)
- [x] All primary actions support keyboard navigation with visible ordered focus, meaningful accessible names and labels/shapes for non-color state. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. DOM/Chromium evidence; no physical assistive technology certification.)
- [x] Accepted score/stage changes and errors are announced to assistive technology without unexpectedly moving focus. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. DOM/Chromium evidence; no physical assistive technology certification.)
- [x] Primary touch actions have at least44x44CSS-pixel targets as the project usability requirement; this is not a formal WCAG conformance claim. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. DOM/Chromium evidence; no physical assistive technology certification.)


## TEST-ACCESSIBLEGAMECONTROLS

### TEST-ACCESSIBLEGAMECONTROLS-044

Given a player uses a phone-sized viewport in portrait or landscape, when they operate primary game actions with touch or keyboard and view text over category backgrounds, then the actions remain operable, text and controls retain clear contrast, focus is visible, and selected icon, solved status, and score changes are indicated by labels or shapes as well as color.

**Acceptance Criteria:**
- [x] Given a player uses a phone-sized viewport in portrait or landscape, when they operate primary game actions with touch or keyboard and view text over category backgrounds, then the actions remain operable, text and controls retain clear contrast, focus is visible, and selected icon, solved status, and score changes are indicated by labels or shapes as well as color. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-ACLAUTHORIZATION

### TEST-ACLAUTHORIZATION-132

Enforce permissions in authenticated HTTP/application code and privileged SQL functions, with shared ACL locking for content writes and exclusive locking for role mutations. Validate identity/origin, strict allowlists, expected revision, digest/retry semantics and bounded private projections.

**Acceptance Criteria:**
- [x] Forged actor IDs, browser roles, missing sessions and cross-origin writes are rejected; browser database roles have no direct ACL table/function privilege. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Serialize concurrent role changes and final-admin checks. A content writer blocked behind revocation must reload roles after the lock and deny a new revoked write. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Audit insertion failure rolls back role/revision/idempotency mutations; stale revisions and changed command digests fail without side effects; permitted exact replays do not reapply grants. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] WORDPAIRS_ADMIN_PROFILE_IDS is a private server-only comma-separated allowlist of stable existing profile IDs. Empty configuration grants no bootstrap authority and aliases/browser input cannot grant access. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)
- [x] Moderators moderate and curate; senior moderators additionally resolve independent appeals; administrators additionally manage users. Proposer/original-reviewer independence remains enforced. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)
- [x] Roles are read from trusted current server/database evidence; configured administrator authority cannot be revoked in the UI and the final effective administrator cannot be removed, including concurrent cross-revocation. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)
- [x] Role changes atomically persist revision, canonical retry result and reasoned audit. Revoked administrators cannot replay old grants to regain authority; directories omit credentials, emails and OIDC subjects. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)


## TEST-ADMINUI

### TEST-ADMINUI-136

Verify fixed-owner administration, guest denial, disabled delegation, phone word/hint editing, canonical retries, permission-aware navigation and late-response invalidation through real rendered pages with disclosed HTTP fixtures.

**Acceptance Criteria:**
- [x] Authorized staff can search/filter the moderation queue at /admin, approve/reject with reasons, review history and independently resolve permitted appeals. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)
- [ ] /admin/words supports audited immutable word/hint editing. User delegation is disabled: /admin/users redirects to /admin and its API returns404 without reading/writing access storage. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [x] Ordinary players cannot fetch privileged records or perform administrative writes; stale authorized GET responses cannot restore private data after an authorization denial. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)
- [x] Phone-sized forms and controls remain readable and operable; uncertain-write retries preserve command identity and clear successful drafts without duplicates. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)
- [ ] Only the verified GitHub owner admin session sees moderation and word/hint navigation. Public guest sessions see no admin links; no session sees user-delegation links. Refresh failure and logout remove privileged links. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Only GitHub numeric account16146732 with login sharpninja can establish an admin identity. Authorization Code uses exact registered callbacks, S256PKCE, cryptographic state and a one-time expiring browser-bound challenge; wrong users, duplicate parameters, replay and provider failures issue no admin session. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Guest/admin cookies and stored challenge/session digests use separate namespaces. Copying a token into the other cookie cannot authenticate. GitHub login/logout preserves the guest session. Admin API responses are private/no-store and logout requires same origin and revokes the stored admin session. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Navigation/private content require the verified admin session; ordinary guest grants cannot authorize admin pages. Callback failure gives safe visible feedback; logout/failure removes links, stale requests cannot restore private state, and active content edits retain audit/version/retry rules. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] The welcome/profile card has responsive internal whitespace of at least20CSSpixels on phone and32CSSpixels on desktop, with readable controls and no horizontal overflow. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)


## TEST-ANCHORRANDOMNESS

### TEST-ANCHORRANDOMNESS-113

Inject every random boundary/index for2,8,15-player rosters; assert uniform-source bounds and only the selected anchor may choose the first category.

**Acceptance Criteria:**
- [ ] Inject every random boundary/index for2,8,15-player rosters; assert uniform-source bounds and only the selected anchor may choose the first category. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)
- [ ] At game start, the service snapshots and indexes the active roster from 1 through N, where N is 2-15. It draws a random integer uniformly from 1 through N, inclusive, and assigns the matching player as anchor for the match. The index remains stable for the match. The service accepts the first category selection only from the anchor and synchronizes the assignment and selected category to all room clients. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)


## TEST-ANSWERCONFIDENTIALITY

### TEST-ANSWERCONFIDENTIALITY-105

Compare player, solved-player, observer and public DTOs before/after reveal; assert hidden targets, other private views and raw guesses never leak.

**Acceptance Criteria:**
- [x] Compare player, solved-player, observer and public DTOs before/after reveal; assert hidden targets, other private views and raw guesses never leak. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] The target answer remains unavailable to clients until round reveal. A hint is sent only to clients that remain unsolved. Solved players receive no later hints or answer controls for that round. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-ANSWERORDER

### TEST-ANSWERORDER-103

Submit simultaneous correct answers with fixed server timestamps; assert one acceptance sequence and earliest accepted solver authority without client-clock influence.

**Acceptance Criteria:**
- [x] Submit simultaneous correct answers with fixed server timestamps; assert one acceptance sequence and earliest accepted solver authority without client-clock influence. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] The service records an authoritative acceptance time for each submission. The first correct accepted answer determines the next-category chooser. If submissions arrive at effectively the same time, the service applies a deterministic ordering rule. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-ANSWERVALIDATION

### TEST-ANSWERVALIDATION-104

Verify NFKC, trimmed/collapsed whitespace, case folding, punctuation preservation and explicit alternatives; reject fuzzy/unlisted matches.

**Acceptance Criteria:**
- [x] Verify NFKC, trimmed/collapsed whitespace, case folding, punctuation preservation and explicit alternatives; reject fuzzy/unlisted matches. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] The service validates each submission against the pair’s target and its approved accepted-answer list. Capitalization, whitespace, punctuation, and synonym handling follow an approved answer-matching policy. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Answer normalization: Apply Unicode NFKC, trim outer whitespace, collapse internal whitespace, and compare case-insensitively. Preserve punctuation. Only the canonical answer or an explicitly listed accepted alternative matches; no fuzzy matching. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-ARCHIVESWBOM

### TEST-ARCHIVESWBOM-128

Inspect exact tracked-source tar.gz, full license/notices, matching SWBOM and SHA256 sidecar; reject missing/malformed/mismatched reports before actual release publication.

**Acceptance Criteria:**
- [ ] Inspect exact tracked-source tar.gz, full license/notices, matching SWBOM and SHA256 sidecar; reject missing/malformed/mismatched reports before actual release publication. (evidence: Verification contract recorded; local partial evidence retained, Phase7 completion not claimed.)
- [ ] Every release must include a downloadable archive containing the release contents and the SWBOM generated for the exact release commit and published build. Place the report at `sbom/<git-commit-sha>.cdx.json` inside the archive. The release packaging step must verify that the SWBOM exists and that its commit SHA matches the release before publication. Do not depend on GitHub Actions for packaging or publication. (evidence: Local implementation/fixtures may cover part of this obligation; Phase7 operational completion is not claimed.)
- [ ] Source archive: Use `.tar.gz` containing the complete tracked source at the release commit, root GPL-2.0-only `LICENSE`, attribution/notices, and `sbom/<commit-sha>.cdx.json`; exclude secrets and generated dependencies. Include a SHA-256 sidecar. AC-41/42 validate temporary fixtures; live deployment inventory remains TR-only. (evidence: Requirement imported; operational portions remain unverified until the documented Phase7 check.)


## TEST-ARTRENDER

### TEST-ARTRENDER-107

Render pairs from the same/different categories with exact assets; fail an asset request then retry, asserting readable fallback and actual recovered computed background.

**Acceptance Criteria:**
- [x] Render pairs from the same/different categories with exact assets; fail an asset request then retry, asserting readable fallback and actual recovered computed background. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Category backgrounds load on supported phone screens. An overlay or equivalent treatment preserves text contrast. A missing asset must not make round controls unreadable. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-AUTHORITATIVEANSWERHANDLING

### TEST-AUTHORITATIVEANSWERHANDLING-045

Given an unsolved player submits an answer for the current stage, when the server checks it against the target and approved accepted-answer list, then only a correct answer is accepted and scored once for that stage; an incorrect answer does not change score or expose guess text to other players; and the target answer remains unavailable to clients until round reveal.

**Acceptance Criteria:**
- [x] Given an unsolved player submits an answer for the current stage, when the server checks it against the target and approved accepted-answer list, then only a correct answer is accepted and scored once for that stage; an incorrect answer does not change score or expose guess text to other players; and the target answer remains unavailable to clients until round reveal. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-BROWSEOPENLOBBIES

### TEST-BROWSEOPENLOBBIES-022

Given a discoverable lobby is waiting and has fewer players than its configured capacity, when a player browses lobbies, then the lobby appears as joinable; hidden, full, or started lobbies do not appear as joinable.

**Acceptance Criteria:**
- [x] Given a discoverable lobby is waiting and has fewer players than its configured capacity, when a player browses lobbies, then the lobby appears as joinable; hidden, full, or started lobbies do not appear as joinable. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-CANDIDATEHOLD

### TEST-CANDIDATEHOLD-141

Verify the documented UI behavior: Hold and resume a nominated candidate.

**Acceptance Criteria:**
- [x] An independent moderator with a nonempty reason can move a pending candidate to on_hold; unauthorized actors and the proposer cannot do so. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] on_hold retains nominations and history but prevents approval/publication/playability and never changes current scores or progression. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] An independent moderator resumes with a reason to pending_review after rechecking unique-count threshold; hold/resume actor and reasons are audited. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)


## TEST-CATALOGINTEGRITY

### TEST-CATALOGINTEGRITY-106

Reject incomplete pairs, wrong hint counts, wrong category/background, reused IDs and invalid catalog transitions; valid complete records become playable atomically.

**Acceptance Criteria:**
- [x] Reject incomplete pairs, wrong hint counts, wrong category/background, reused IDs and invalid catalog transitions; valid complete records become playable atomically. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Every playable pair has a category identifier, prompt, target answer, three ordered hints, accepted answers, and a category-background reference. A category cannot be enabled unless its required content and background are present. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Content volume and reuse: Seed 10 complete pairs per category. Do not repeat a pair within a match until every playable pair in the selected category has been used; then reshuffle that category’s eligible pool. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Colors category: Each Colors pair contains complementary colors. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-CATALOGVERSIONING

### TEST-CATALOGVERSIONING-133

Route editorial and community publication through the serialized moderation transaction and catalog projection, preserving exact version lookup, audit/outbox atomicity and the historical version ceiling.

**Acceptance Criteria:**
- [x] Save v0 then v1, exclude latest, then save v2: old lookups remain exact and future pools use the current selectable highest version. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Reject reused/cross-category IDs and nonzero community activation versions, invalid hints and category/background mismatches. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] At4096 approved historical versions, another save or activation returns SERVICE_LIMIT without catalog, state, audit, revision or idempotency writes. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Each pair has a prompt, canonical target, accepted alternatives, approved category/background and exactly three ordered bounded hints; invalid input is rejected without mutation. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)
- [x] Creation uses an unused ID at version0; edits append exactly the next version without moving an existing ID to another category. Community activation cannot reuse IDs or skip versions. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)
- [x] Current and historical rounds retain their recorded versions. Future selection chooses the highest version per ID and then selectability, with no fallback to older excluded versions. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)
- [x] Reasoned exclusion preserves history and cannot empty an initial category. Both editorial and community publication reject a projected total above4096 historical approved versions atomically. (evidence: docs/admin_acl_design.md; docs/admin_acl_review_receipt.json; tests/browser/admin.phase6.spec.ts; tests/integration/admin.integration.ts)


## TEST-CATEGORYART

### TEST-CATEGORYART-005

Given two word pairs in the same category, when each is played, then both rounds use that category’s predefined background. A pair in another category uses that category’s background.

**Acceptance Criteria:**
- [x] Given two word pairs in the same category, when each is played, then both rounds use that category’s predefined background. A pair in another category uses that category’s background. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Verify FR-CATEGORYART-006#ART-COMIC-01 by visually inspecting all six generated category scenes and loading and decoding their real assets through the game UI at phone and desktop sizes. (evidence: docs/evidence/category-artwork/receipt.json; tests/browser/accessibility.phase6.spec.ts. 22/22 production browser checks; exact864x1536/1536x864 dimensions, orientation, opacity/blur, contrast, fallback and controls verified.)
- [x] Verify FR-CATEGORYART-006#ART-PANEL-01 through the game UI: translucent blurred content surface, prompt contrast over light/dark artwork, width/overflow, usable answer controls, and missing-image retry behavior. (evidence: docs/evidence/category-artwork/receipt.json; tests/browser/accessibility.phase6.spec.ts. 22/22 production browser checks; exact864x1536/1536x864 dimensions, orientation, opacity/blur, contrast, fallback and controls verified.)
- [x] Verify FR-CATEGORYART-006#ART-ASPECT-01: all twelve category files have exact 864x1536 or1536x864 dimensions, both versions decode in the UI, and rotating a viewport switches backgrounds without an artwork panel. (evidence: docs/evidence/category-artwork/receipt.json; tests/browser/accessibility.phase6.spec.ts. 22/22 production browser checks; exact864x1536/1536x864 dimensions, orientation, opacity/blur, contrast, fallback and controls verified.)


## TEST-CATEGORYCHOICE

### TEST-CATEGORYCHOICE-011

Given at least one player solves a round, when the round ends, then the earliest accepted correct solver can select the next category.

**Acceptance Criteria:**
- [x] Given at least one player solves a round, when the round ends, then the earliest accepted correct solver can select the next category. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-CATEGORYSUGGESTIONUNLOCK

### TEST-CATEGORYSUGGESTIONUNLOCK-019

Given a player has fewer than 10 game wins, when they open the content suggestion flow, then category-and-pair submission is unavailable. Given they have won 10 games, then they can submit one proposed relationship category with three word pairs for review. The submission is not playable until approved and complete.

**Acceptance Criteria:**
- [x] Given a player has fewer than 10 game wins, when they open the content suggestion flow, then category-and-pair submission is unavailable. Given they have won 10 games, then they can submit one proposed relationship category with three word pairs for review. The submission is not playable until approved and complete. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-CLOCKCONSISTENCY

### TEST-CLOCKCONSISTENCY-108

Control server clock across all stages, accepted solves and deadlines; assert elapsed-time/scoring/tiebreak use server measurements and80seconds per unsolved round.

**Acceptance Criteria:**
- [x] Control server clock across all stages, accepted solves and deadlines; assert elapsed-time/scoring/tiebreak use server measurements and80seconds per unsolved round. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Elapsed answer time uses a consistent server-controlled round start time and accepted submission time. Client clocks may animate locally, but scorecard and tiebreak values use authoritative times. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Total answer time and final tie: Sum server-measured solve durations; an unsolved round adds the 80-second maximum round duration. Sort tied scores by this total; exact remaining ties share rank. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-CONFIGUREDCAPACITY

### TEST-CONFIGUREDCAPACITY-024

Given a player creates a room, when they set a maximum capacity from 2 through 15, then the room stores and displays that limit. Values below 2 or above 15 are rejected.

**Acceptance Criteria:**
- [ ] Given a player creates a room, when they set a maximum capacity from 2 through 15, then the room stores and displays that limit. Values below 2 or above 15 are rejected. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)
- [ ] New rooms and new matches allow at most15 players. Existing running matches, including historical larger rosters, remain readable, replayable and finishable; existing members can leave. Oversized legacy waiting rooms admit no new player beyond15 and cannot start a new oversized match. They show a clear15-player compatibility notice and retain Leave. No existing room, player, match or historical result is deleted or forcibly evicted. (evidence: Operator approved15-player cap30October2026. Compatibility implementation and tests pending.)


## TEST-CONNECTIONRECOVERY

### TEST-CONNECTIONRECOVERY-109

Simulate lost response, reconnect, expiry and stale commands; assert same-command canonical retry, unchanged committed state and authoritative recovery.

**Acceptance Criteria:**
- [x] Simulate lost response, reconnect, expiry and stale commands; assert same-command canonical retry, unchanged committed state and authoritative recovery. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] A disconnect must not corrupt accepted scores or duplicate a submission. Reconnecting players retain membership for a two-minute grace interval; after it expires the room applies the normal departure rules. Client retries reuse the original command ID. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Room code, reconnect, creator departure: Use an eight-character Crockford Base32 code. Codes remain valid while the room is active and expire on close; empty rooms close after 30 minutes. Reconnect retains membership for a two-minute grace interval. Creator departure grants no special authority; remaining players retain control. Invalid/expired codes return the same generic not-found response; limit code attempts to 10 per minute per session. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-CONTENTVALIDATION

### TEST-CONTENTVALIDATION-016

Given a category is enabled, when the content catalog is checked, then every playable pair has a prompt, target answer, three ordered hints, accepted-answer policy, and category background.

**Acceptance Criteria:**
- [x] Given a category is enabled, when the content catalog is checked, then every playable pair has a prompt, target answer, three ordered hints, accepted-answer policy, and category background. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-CONTESTREADINESS

### TEST-CONTESTREADINESS-147

Audit the final release, incorporated rules, entrant prerequisites and evidence package against each TR-CONTEST-READINESS-041 criterion; report every unresolved dependency before manual entry.

**Acceptance Criteria:**
- [ ] Before release, retain exact official-rule source/hash, resolve mission/conduct requirements and entrant eligibility, and use the earlier documented cutoff; do not assert unknown compliance.
- [ ] At the final stable public HTTPS URL, clean guests on phone/laptop can join by code without required sign-in or install, complete synchronized games and replay; fulfill existing TEST-ROOMSYNC-139 rather than substituting fixture evidence.
- [ ] Retain accurate ChatGPT Work design/build provenance and authenticated mission completion evidence; Codex-only activity does not establish the named workflow.
- [ ] Prepare title, licensed cover, accurate description and playable URL; the eligible entrant manually submits through the actual Handshake mission before the cutoff, with no automated entry or unapproved agreement acceptance.
- [ ] Retain every available hostile-validation receipt including rejected/superseded rounds, labeled reconstructions, corrections, candidate hashes and evidence limits; bind final approval and release/source/SWBOM evidence to the submitted candidate without exposing secrets.


## TEST-DDDTRANSACTIONS

### TEST-DDDTRANSACTIONS-131

Run architecture import guards plus actual parallel final-seat, stale/idempotent command, audit/outbox fault rollback and deterministic port tests; domain imports no framework/network adapters.

**Acceptance Criteria:**
- [x] Run architecture import guards plus actual parallel final-seat, stale/idempotent command, audit/outbox fault rollback and deterministic port tests; domain imports no framework/network adapters. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Organize application behavior as a modular monolith with explicit domain boundaries and application use cases. Keep game policies independent of Next.js and Supabase frameworks; route persistence, identity, time, randomness, and realtime effects through injected ports/adapters. Keep each business rule in one canonical domain policy, with database constraints as invariant backstops rather than competing rule implementations. As a TR integration requirement, the persistence adapter serializes conflicting room mutations in one database transaction, enforces durable idempotency for retried commands, and commits the event/outbox record atomically before realtime delivery. These database guarantees are verified as TR integration evidence and do not count toward AC coverage. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-DEEPLINKJOINANDFULLROOM

### TEST-DEEPLINKJOINANDFULLROOM-026

Given a valid room deep link, when a player opens it, then the game bypasses lobby browsing and checks the room directly. If a slot is open, the player joins; if the room has no open player slot, the invitee is offered observer mode.

**Acceptance Criteria:**
- [x] Given a valid room deep link, when a player opens it, then the game bypasses lobby browsing and checks the room directly. If a slot is open, the player joins; if the room has no open player slot, the invitee is offered observer mode. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-DEPENDENCYATTRIBUTION

### TEST-DEPENDENCYATTRIBUTION-039

Given a direct dependency or externally sourced asset is added or changed, when the change is prepared, then `docs/ATTRIBUTIONS.md` records its purpose, license, and upstream source, and dependency versions are locked in the package manager lockfile.

**Acceptance Criteria:**
- [x] Given a direct dependency or externally sourced asset is added or changed, when the change is prepared, then `docs/ATTRIBUTIONS.md` records its purpose, license, and upstream source, and dependency versions are locked in the package manager lockfile. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)

### TEST-DEPENDENCYATTRIBUTION-125

Compare every installed direct package and bundled asset against attribution/license/upstream records and exact lockfile pins; reject missing notices or unreviewed distribution inputs.

**Acceptance Criteria:**
- [x] Compare every installed direct package and bundled asset against attribution/license/upstream records and exact lockfile pins; reject missing notices or unreviewed distribution inputs. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Declare the approved runtime and test packages as direct dependencies in `package.json`; pin compatible resolved versions through the package manager lockfile. Maintain `docs/ATTRIBUTIONS.md` with each direct package’s purpose, license, and upstream source, plus attribution for any externally sourced visual, audio, or content assets. Update it when dependencies or assets change. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Toolchain and test stack: Next.js with TypeScript, npm with committed lockfile, Vitest for domain/use-case tests, MSW/fakes for ports, Testing Library for UI, and Playwright for browser acceptance. Pin compatible versions after the Phase 0 license/version review and before setup. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-DEPLOYMENTNOACTIONS

### TEST-DEPLOYMENTNOACTIONS-124

Verify deployment/provisioning succeeds through Vercel Git integration and manual authenticated tooling without GitHub Actions; live topology checks remain Phase7.

**Acceptance Criteria:**
- [ ] Verify deployment/provisioning succeeds through Vercel Git integration and manual authenticated tooling without GitHub Actions; live topology checks remain Phase7. (evidence: Verification contract recorded; local partial evidence retained, Phase7 completion not claimed.)
- [ ] Build and deployment automation must not depend on GitHub Actions. Use Vercel’s Git integration for automatic branch Preview and `main` Production deployments. Run infrastructure provisioning scripts manually from an authenticated developer workstation. (evidence: Local implementation/fixtures may cover part of this obligation; Phase7 operational completion is not claimed.)


## TEST-DESIGNHOSTILEREVIEW

### TEST-DESIGNHOSTILEREVIEW-135

Update design documentation for requested behavior and obtain independent hostile validation with exact source identity, evidence boundaries, findings/corrections and final disposition.

**Acceptance Criteria:**
- [x] Architecture, moderation, deployment and administration design agree with the implemented role matrix, bootstrap, transaction ordering, retry semantics and immutable content behavior. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [ ] Independent hostile validation uses the reviewer tool, model and effort selected by the latest explicit operator direction. The current selection is Cline with Beam and High effort until Monday, 2 November 2026; no cutoff hour is specified and no later reviewer is inferred. Before accepting a tracked completion claim, OverallVerdict is AGREE with accuracy at least 98/100, completeness at least 98/100, and no unresolved material findings. Retain the full request and response JSONL, complete verdict and findings in the reviewer's own durable MCP session turn with readback, and the reviewed source manifest with exact revision/worktree/source and evidence identity. Supply all applicable unit and scoped integration TRX evidence under the operator review policy; the reviewer does not build code or run tests. Runtime model and effort selection receipts must support the selected reviewer without implying unverifiable provider-internal reasoning.
- [x] Distinguish agent visual inspection, automated fixtures, real database evidence and hosted operations. Human feedback is optional; do not invent personal sign-off gates or claim unperformed human testing. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-FINALSTANDINGS

### TEST-FINALSTANDINGS-013

Given the configured final round ends, when players have different total scores, then final standings rank them by total score.

**Acceptance Criteria:**
- [x] Given the configured final round ends, when players have different total scores, then final standings rank them by total score. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-FIRSTCATEGORY

### TEST-FIRSTCATEGORY-004

Given a new game with 2-15 players, when the game indexes the start roster from 1 through N and draws a random integer from 1 through N inclusive, then the player with that index becomes anchor; when that player chooses a category, the first round uses the chosen category and its background.

**Acceptance Criteria:**
- [ ] Given a new game with 2-15 players, when the game indexes the start roster from 1 through N and draws a random integer from 1 through N inclusive, then the player with that index becomes anchor; when that player chooses a category, the first round uses the chosen category and its background. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)


## TEST-FREETIEROPERATION

### TEST-FREETIEROPERATION-121

Assert recoverable quota rejection with canonical retry and no paid fallback; verify one15-player/25-observer target against actual approved Free-tier resources in Phase7.

**Acceptance Criteria:**
- [ ] Assert recoverable quota rejection with canonical retry and no paid fallback; verify one15-player/25-observer target against actual approved Free-tier resources in Phase7. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)
- [ ] The deployment must remain on free tiers: Vercel Hobby and Supabase Free. Do not enable paid add-ons, metered upgrades, or paid external services. The product is personal and non-commercial while using Vercel Hobby. Current Supabase Free constraints include a 500 MB database, 200 concurrent Realtime connections, 100 Realtime messages per second, 2 million Realtime messages per month, and automatic pause after one week of inactivity. Treat these as capacity limits and provide graceful handling when service quotas are reached. (evidence: Local implementation/fixtures may cover part of this obligation; Phase7 operational completion is not claimed.)
- [ ] Quota behavior and initial load target: Initial supported target is one full 15-player room plus up to 25 observers. Quota rejection returns a recoverable `SERVICE_LIMIT`, preserves the last committed state, and allows retry with the same command ID; no paid fallback or non-idempotent automatic retry. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)


## TEST-FREETIERQUOTAHANDLING

### TEST-FREETIERQUOTAHANDLING-037

Given a Supabase Free quota is reached, when a room or database operation cannot be served, then the game reports a recoverable service-limit state and does not silently switch to a paid resource.

**Acceptance Criteria:**
- [x] Given a Supabase Free quota is reached, when a room or database operation cannot be served, then the game reports a recoverable service-limit state and does not silently switch to a paid resource. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-FULLROOMOBSERVER

### TEST-FULLROOMOBSERVER-027

Given an invited player follows an invitation to a full room, when they choose to observe, then they enter without consuming a player slot and are bound to the player who invited them.

**Acceptance Criteria:**
- [x] Given an invited player follows an invitation to a full room, when they choose to observe, then they enter without consuming a player slot and are bound to the player who invited them. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-GITHUBADMIN

### TEST-GITHUBADMIN-149

Verify GA-01/02/03/04/08 with provider network fakes, actual runtime/hash/repository composition, HTTP cookies/origin checks and rendered browser journeys. Native mappings link FR-GUESTADMIN-031 and existing identity/admin requirements to TR-GITHUB-ADMIN-043 and this TEST.

**Acceptance Criteria:**
- [ ] Public gameplay offers guest entry only. Public OpenAI routes return404, member-shaped public sessions fail closed, and public session permissions are empty regardless of stored grants or bootstrap configuration. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Public community submissions, nominations, secured content links and user-delegation controls are disabled; reactions and guest multiplayer remain available. /content redirects to /play and /api/admin/users returns404 without storage. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Only GitHub numeric account16146732 with login sharpninja can establish an admin identity. Authorization Code uses exact registered callbacks, S256PKCE, cryptographic state and a one-time expiring browser-bound challenge; wrong users, duplicate parameters, replay and provider failures issue no admin session. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Guest/admin cookies and stored challenge/session digests use separate namespaces. Copying a token into the other cookie cannot authenticate. GitHub login/logout preserves the guest session. Admin API responses are private/no-store and logout requires same origin and revokes the stored admin session. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Navigation/private content require the verified admin session; ordinary guest grants cannot authorize admin pages. Callback failure gives safe visible feedback; logout/failure removes links, stale requests cannot restore private state, and active content edits retain audit/version/retry rules. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] All account/member profiles, including the GitHub administrator and retired OpenAI profiles, are excluded server-side from public leaderboard/landing projections even when their saved public flag is true. New member profiles default private. Guest opt-in, ordering, bounded paging and revision conflict behavior remain unchanged. (evidence: User confirmed 28 October 2026: Hide all old member profiles. Recovery slice tests and migration pending; no completion claimed.)


## TEST-GPL20ONLYRELEASE

### TEST-GPL20ONLYRELEASE-042

Given a candidate source archive is prepared, when its contents are inspected, then it contains the root `LICENSE` file with the complete GPL-2.0-only text, and every bundled third-party component retains its required attribution and license notice. This is validated against a temporary archive fixture and does not depend on a published or deployed artifact.

**Acceptance Criteria:**
- [x] Given a candidate source archive is prepared, when its contents are inspected, then it contains the root `LICENSE` file with the complete GPL-2.0-only text, and every bundled third-party component retains its required attribution and license notice. This is validated against a temporary archive fixture and does not depend on a published or deployed artifact. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-GUESTPLAY

### TEST-GUESTPLAY-021

Given a player chooses guest mode, when they continue without OIDC authentication, then the game creates a guest player identity, allows icon selection, and lets them create or join a room by code.

**Acceptance Criteria:**
- [x] Given a player chooses guest mode, when they continue without OIDC authentication, then the game creates a guest player identity, allows icon selection, and lets them create or join a room by code. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-HINTPROGRESSION

### TEST-HINTPROGRESSION-009

Given multiple unsolved players, when all unsolved players submit for the current stage, then the game confirms stage results and shows the next hint only to players still unsolved.

**Acceptance Criteria:**
- [x] Given multiple unsolved players, when all unsolved players submit for the current stage, then the game confirms stage results and shows the next hint only to players still unsolved. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-HINTSCORING

### TEST-HINTSCORING-007

Given a player solves after Hint 1, Hint 2, or Hint 3, when the game accepts the answer, then the player earns 3, 2, or 1 point respectively.

**Acceptance Criteria:**
- [x] Given a player solves after Hint 1, Hint 2, or Hint 3, when the game accepts the answer, then the player earns 3, 2, or 1 point respectively. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-HOLDOUTWARNINGANDREMOVAL

### TEST-HOLDOUTWARNINGANDREMOVAL-032

Given all but one player have marked ready, when the room enters the holdout state, then the unready player sees a five-second warning to mark ready. If they mark ready before it expires, the start countdown begins immediately. If the warning expires while they remain unready in a room with more than two players, they are removed and the start countdown begins with the remaining roster locked. If the room has exactly two players, the holdout is not removed and the lobby continues waiting; the countdown does not begin until both are ready.

**Acceptance Criteria:**
- [x] Given all but one player have marked ready, when the room enters the holdout state, then the unready player sees a five-second warning to mark ready. If they mark ready before it expires, the start countdown begins immediately. If the warning expires while they remain unready in a room with more than two players, they are removed and the start countdown begins with the remaining roster locked. If the room has exactly two players, the holdout is not removed and the lobby continues waiting; the countdown does not begin until both are ready. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-IDENTITYAUTHENTICATION

### TEST-IDENTITYAUTHENTICATION-116

Verify public guest mode and separate fixed-owner GitHub authentication with wrong-account, token-copy, CSRF, expiry/replay and logout controls.

**Acceptance Criteria:**
- [ ] Public gameplay offers guest entry only. Public OpenAI routes return404, member-shaped public sessions fail closed, and public session permissions are empty regardless of stored grants or bootstrap configuration. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Only GitHub numeric account16146732 with login sharpninja can establish an admin identity. Authorization Code uses exact registered callbacks, S256PKCE, cryptographic state and a one-time expiring browser-bound challenge; wrong users, duplicate parameters, replay and provider failures issue no admin session. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Guest/admin cookies and stored challenge/session digests use separate namespaces. Copying a token into the other cookie cannot authenticate. GitHub login/logout preserves the guest session. Admin API responses are private/no-store and logout requires same origin and revokes the stored admin session. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)


## TEST-IDLELOBBYREADINESSPROMPT

### TEST-IDLELOBBYREADINESSPROMPT-033

Given the game start countdown has not begun, when no player/observer membership or ready-state change occurs for 30 seconds, then the game prompts all players once for that room version to mark themselves ready; any membership or ready-state change resets the interval.

**Acceptance Criteria:**
- [x] Given the game start countdown has not begun, when no player/observer membership or ready-state change occurs for 30 seconds, then the game prompts all players once for that room version to mark themselves ready; any membership or ready-state change resets the interval. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-INROUNDEMOJIREACTION

### TEST-INROUNDEMOJIREACTION-029

Given a round is active, when a player selects an emoji from the menu, then the reaction appears in real time to room players and observers and does not change scores, answer stage, or round state.

**Acceptance Criteria:**
- [x] Given a round is active, when a player selects an emoji from the menu, then the reaction appears in real time to room players and observers and does not change scores, answer stage, or round state. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-LANDINGPAGEPUBLICDATA

### TEST-LANDINGPAGEPUBLICDATA-050

Given an unauthenticated visitor requests landing-page data, when the service responds, then it returns only lifetime-win ranking fields, opted-in generated aliases, exact counts/capacity, waiting state, room age, and rules version for public content; it does not expose room codes, real identity, guesses, target answers, observer-only views, moderation records, or secrets.

**Acceptance Criteria:**
- [x] Given an unauthenticated visitor requests landing-page data, when the service responds, then it returns only lifetime-win ranking fields, opted-in generated aliases, exact counts/capacity, waiting state, room age, and rules version for public content; it does not expose room codes, real identity, guesses, target answers, observer-only views, moderation records, or secrets. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-LANDINGPRIVACY

### TEST-LANDINGPRIVACY-130

Request anonymous landing projections with bounded pagination/cache refresh and empty/unavailable states; reject private codes, identities, guesses, answers and moderation fields.

**Acceptance Criteria:**
- [x] Request anonymous landing projections with bounded pagination/cache refresh and empty/unavailable states; reject private codes, identities, guesses, answers and moderation fields. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Serve the landing page and its gameplay rules without requiring authentication. Retrieve leaderboard and lobby display data through a read-only, server-controlled public projection that returns only approved fields. Restrict lobby results to discoverable, joinable rooms; exclude room codes, non-public profile fields and identifiers, observer perspective data, guesses, targets, moderation records, and secrets. Use bounded pagination, a documented refresh/cache policy, and recoverable empty/unavailable states. Do not expose service-role credentials or allow the public query to mutate game state. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Public landing contract: Leaderboard is lifetime wins, then total points, earliest win, and stable profile ID. Show public alias only, include opt-in guests, honor profile opt-out. Lobby card shows exact player count/capacity, waiting state and room age, never room code/player names. Refresh lobby data every 15 seconds and leaderboard every five minutes. Rules are a concise versioned summary with an updated date. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-LICENSEGPL

### TEST-LICENSEGPL-129

Compare complete GPL-2.0-only root text and every bundled third-party notice in temporary source-archive fixtures; preserve metadata and notices.

**Acceptance Criteria:**
- [x] Compare complete GPL-2.0-only root text and every bundled third-party notice in temporary source-archive fixtures; preserve metadata and notices. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] License Wordpairs source and the game under GNU GPL version 2 only (`GPL-2.0-only`). Include the complete license text in the root `LICENSE` file and include that file in each source release archive. Preserve independent third-party license notices and check compatibility before redistributing any third-party code or asset as part of the game. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-LIVESCORECARD

### TEST-LIVESCORECARD-010

Given a player solves, when the game accepts the answer, then the active scorecard shows that player’s icon, points earned, and elapsed time from round start.

**Acceptance Criteria:**
- [x] Given a player solves, when the game accepts the answer, then the active scorecard shows that player’s icon, points earned, and elapsed time from round start. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-LOBBYMATCHING

### TEST-LOBBYMATCHING-117

Enumerate hidden/full/started/waiting discoverable rooms and concurrent oldest-room selection; assert stable ID tie-breaking and no capacity overflow.

**Acceptance Criteria:**
- [x] Enumerate hidden/full/started/waiting discoverable rooms and concurrent oldest-room selection; assert stable ID tie-breaking and no capacity overflow. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] The service lists only discoverable lobbies with available player slots under their configured capacity. Rooms are private by default. Quick match selects the oldest eligible room, then stable room ID; all player-seat assignments use the same atomic capacity check. Deep links containing a valid room code route directly to that room without lobby browsing, then use the same authoritative open-slot check. A valid invite to a full room may establish an observer session without reserving a player slot. Lobby discovery responses expose only approved lobby metadata, not private room state. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Lobby discovery and quick match: Rooms are undiscoverable by default; creator may opt in. Quick match selects the oldest discoverable waiting room with a free seat, then stable room ID. The same atomic capacity-checked join command handles the selection. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-MOBILEINPUT

### TEST-MOBILEINPUT-111

Use phone portrait/landscape touch and keyboard input; assert reachable controls, preserved answers and no horizontal overflow.

**Acceptance Criteria:**
- [x] Use phone portrait/landscape touch and keyboard input; assert reachable controls, preserved answers and no horizontal overflow. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Primary actions work with touch and keyboard input. Category art does not obstruct text entry, hints, score status, or buttons in either phone orientation. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-MOCKFIRSTACCEPTANCECOVERAGE

### TEST-MOCKFIRSTACCEPTANCECOVERAGE-038

Given an implementation increment is ready to begin, when its test plan is reviewed, then every active acceptance criterion maps to at least one test and those tests pass against mocks before implementation code is written.

**Acceptance Criteria:**
- [x] Given an implementation increment is ready to begin, when its test plan is reviewed, then every active acceptance criterion maps to at least one test and those tests pass against mocks before implementation code is written. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-MODERATIONANDCATALOGBOUNDARY

### TEST-MODERATIONANDCATALOGBOUNDARY-047

Given an actor is not authorized to perform moderation or catalog activation, when they attempt to change moderation status or publish content, then the service rejects the action; every change to nomination count, moderation status, and eligibility is auditable; and content cannot be selected for play until it has passed moderation and is complete in the curated catalog.

**Acceptance Criteria:**
- [x] Given an actor is not authorized to perform moderation or catalog activation, when they attempt to change moderation status or publish content, then the service rejects the action; every change to nomination count, moderation status, and eligibility is auditable; and content cannot be selected for play until it has passed moderation and is complete in the curated catalog. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-MULTIPLAYERINTEGRATION

### TEST-MULTIPLAYERINTEGRATION-134

Exercise the real identity/room/lobby/match/PostgreSQL services in complete eight-round games for every integer player count2..15, using disposable infrastructure.

**Acceptance Criteria:**
- [ ] Run14 complete games with119 player participations and952 accepted round solves; every game reaches shared final standings. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)
- [x] Exercise all hint/scoring stages, simultaneous conflicts/retries, roster/anchor transitions and exactly-once profile awards. Keep deterministic clocks/randomness; preserve all assertions under bounded fixture wall-clock timeouts. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Use a disposable loopback-only database, apply every migration and remove owned containers/fixtures in finally without touching the running game database. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] No response and no solver: A missing answer counts as unsolved and advances to the next hint. After Hint 3 deadline the round reveals and awards zero to remaining players. If nobody solves, choose the next category uniformly from the six configured categories. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Match length and stage timer: Eight rounds. Each of the four answer stages has a 20-second deadline; a stage closes early when all unsolved players submit. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-NAVIGATIONDRAFTS

### TEST-NAVIGATIONDRAFTS-142

Verify the documented UI behavior: Back, Cancel and profile-isolated drafts.

**Acceptance Criteria:**
- [x] Back returns to the previous authorized screen and dialog dismissal restores focus to its opener without submitting, changing readiness or leaving room membership. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] Unsaved content/editor drafts survive ordinary same-profile in-tab navigation in memory only; reload, tab close, session/profile change and permission loss clear them. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] Explicit Cancel/Discard abandons the draft and returns to the originating screen without changing the saved record; a canceled profile edit restores saved alias/icon. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] Leaving a room requires an explicit Leave action and applies the existing authoritative membership/departure rules. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] Returning to a privileged screen revalidates authorization; back navigation cannot restore cleared private data or another profile's draft. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)


## TEST-NOHINTSOLVE

### TEST-NOHINTSOLVE-006

Given a player submits the correct answer during the no-hint stage, when the game accepts it, then the player earns 5 points and their round score locks.

**Acceptance Criteria:**
- [x] Given a player submits the correct answer during the no-hint stage, when the game accepts it, then the player earns 5 points and their round score locks. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-NOMINATIONELIGIBILITY

### TEST-NOMINATIONELIGIBILITY-017

Given a player solves during the no-hint stage, when the round results are shown, then that player can submit a candidate answer nomination; players who solve after any hint cannot nominate from that round.

**Acceptance Criteria:**
- [x] Given a player solves during the no-hint stage, when the round results are shown, then that player can submit a candidate answer nomination; players who solve after any hint cannot nominate from that round. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-NOMINATIONMODERATION

### TEST-NOMINATIONMODERATION-114

Exercise eligible no-hint nominations, one-per-round/profile, normalized distinct votes at9/10, independent review, rejection, one appeal and complete-record activation.

**Acceptance Criteria:**
- [x] Exercise eligible no-hint nominations, one-per-round/profile, normalized distinct votes at9/10, independent review, rejection, one appeal and complete-record activation. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] The service permits nomination submission only for a player who solved the current round before any hint. It stores each nomination against a normalized candidate word and records its nominating player and timestamp. Candidate eligibility requires both at least 10 nominations and an approved moderation status. Moderation status, nomination count, and eligibility state must be auditable. An eligible candidate cannot be played until a complete curated word-pair record exists. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Nomination counting: Count unique player profiles per normalized candidate. A profile may nominate a candidate once and submit at most one candidate per eligible no-hint solve. Moderation begins at 10 unique nominations. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Moderation workflow: Roles are Content Moderator and Senior Moderator. At threshold, content enters Pending Review. A moderator other than the proposer approves or rejects with a reason. The proposer may appeal once to a Senior Moderator. Approval alone does not make content playable; the complete curated record must pass validation. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-NOMINATIONTHRESHOLDANDMODERATION

### TEST-NOMINATIONTHRESHOLDANDMODERATION-018

Given a candidate has fewer than 10 nominations or has not passed moderation, when the answer pool is checked, then it is not eligible for future games. Given it has at least 10 nominations and passes moderation, then it enters the future-eligible answer pool but is not playable until its full curated pair record exists.

**Acceptance Criteria:**
- [x] Given a candidate has fewer than 10 nominations or has not passed moderation, when the answer pool is checked, then it is not eligible for future games. Given it has at least 10 nominations and passes moderation, then it enters the future-eligible answer pool but is not playable until its full curated pair record exists. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-NOSOLVERFALLBACK

### TEST-NOSOLVERFALLBACK-146

Verify the documented UI behavior: No solver advances without a human chooser.

**Acceptance Criteria:**
- [x] Verify zero-point reveal and autonomous configured next-category progression after a no-solver round without waiting for a player chooser. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)


## TEST-OBSERVERPERMISSIONS

### TEST-OBSERVERPERMISSIONS-118

Fill25 observer seats, bind inviter perspective, promote FIFO before lock and reject all observer state/scoring writes; preserve40-member audiences.

**Acceptance Criteria:**
- [ ] Fill25 observer seats, bind inviter perspective, promote FIFO before lock and reject all observer state/scoring writes; preserve40-member audiences. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)
- [x] An observer session is read-only, limited to 25 observers per room, and is bound to the player who invited the observer. Signed links carry inviter context; a manual room-code observer selects an active inviter from the roster. Observer queue order is transactional, with stable profile ID as tie-break. The service streams the same player-authorized game view that the inviter’s client receives, including updates as the inviter’s view changes, while rejecting guesses, category choices, and other game-affecting commands from the observer. Observers do not count toward player capacity or scoring. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Observer behavior: Maximum 25 observers per room. Signed links bind the inviter. Manual room-code observers select an active player as inviter. Observer arrival order is assigned transactionally; ties use stable profile ID. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-OBSERVERPERSPECTIVEANDPERMISSIONS

### TEST-OBSERVERPERSPECTIVEANDPERMISSIONS-028

Given an observer is following an inviter, when the inviter’s player-authorized view changes, then the observer sees the corresponding update in real time. Observer attempts to submit guesses, choose categories, or change game state are rejected; the observer earns no score.

**Acceptance Criteria:**
- [x] Given an observer is following an inviter, when the inviter’s player-authorized view changes, then the observer sees the corresponding update in real time. Observer attempts to submit guesses, choose categories, or change game state are rejected; the observer earns no score. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-OIDCTOKENVALIDATION

### TEST-OIDCTOKENVALIDATION-046

Given an OIDC identity provider is configured, when a sign-in callback presents a token with an invalid signature, issuer, audience, state, nonce, or expiry, then the service rejects the sign-in and does not create or associate an authenticated profile from the unverified identity.

**Acceptance Criteria:**
- [x] Given an OIDC identity provider is configured, when a sign-in callback presents a token with an invalid signature, issuer, audience, state, nonce, or expiry, then the service rejects the sign-in and does not create or associate an authenticated profile from the unverified identity. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-OPENAIOIDCPROFILE

### TEST-OPENAIOIDCPROFILE-020

Given a player chooses account sign-in, when OpenAI OIDC authentication succeeds, then the game establishes or loads the game profile associated with that authenticated identity and allows the player to select an icon.

**Acceptance Criteria:**
- [x] Given a player chooses account sign-in, when OpenAI OIDC authentication succeeds, then the game establishes or loads the game profile associated with that authenticated identity and allows the player to select an icon. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-ORIENTATION

### TEST-ORIENTATION-015

Given a phone-sized viewport in portrait or landscape, when a player enters an answer or views a hint and scorecard, then text and controls remain visible without horizontal overflow.

**Acceptance Criteria:**
- [x] Given a phone-sized viewport in portrait or landscape, when a player enters an answer or views a hint and scorecard, then text and controls remain visible without horizontal overflow. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-PLAYERLIMIT

### TEST-PLAYERLIMIT-002

Given a room has reached its configured player capacity from 2 through 15, when another player attempts to join, then the game rejects the additional player without changing existing room state. This is true for any configured capacity, including 2, 8, and 15.

**Acceptance Criteria:**
- [ ] Given a room has reached its configured player capacity from 2 through 15, when another player attempts to join, then the game rejects the additional player without changing existing room state. This is true for any configured capacity, including 2, 8, and 15. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)


## TEST-POSTGRESPERSISTENCE

### TEST-POSTGRESPERSISTENCE-122

Run SQL migrations, direct-role denial, rollback faults, durable retries/outbox and concurrent writes on disposable PostgreSQL; verify isolated hosted Supabase persistence/Realtime in Phase7.

**Acceptance Criteria:**
- [ ] Run SQL migrations, direct-role denial, rollback faults, durable retries/outbox and concurrent writes on disposable PostgreSQL; verify isolated hosted Supabase persistence/Realtime in Phase7. (evidence: Verification contract recorded; local partial evidence retained, Phase7 completion not claimed.)
- [ ] Use Supabase Postgres as the durable source of truth for profiles, curated pairs, nominations, moderation records, completed matches, and scores. Use Supabase Realtime for active-room presence and event delivery within its free-tier limits. Do not rely on a Vercel Function’s process memory as shared or durable room state. Keep category background assets in the repository unless a future requirement needs uploaded files. (evidence: Local implementation/fixtures may cover part of this obligation; Phase7 operational completion is not claimed.)
- [ ] Persistence/security model: All writes and private reads go through server application commands; browser receives no service-role credential and no direct table grants. RLS remains enabled, with narrow public and actor-authorized views/functions. Moderator roles are server-managed. Raw incorrect guesses are not persisted. Audit events retain one year; published outbox rows seven days; idempotency results until 30 days after room close. (evidence: Requirement imported; operational portions remain unverified until the documented Phase7 check.)


## TEST-PRECOUNTDOWNOBSERVERPROMOTION

### TEST-PRECOUNTDOWNOBSERVERPROMOTION-030

Given a room is full and the start countdown has not begun, when a player leaves and at least one observer is waiting, then the observer who entered observer mode earliest becomes the final player in the roster, existing players move up to close the vacancy while preserving their relative order, and any remaining observers stay observers.

**Acceptance Criteria:**
- [x] Given a room is full and the start countdown has not begun, when a player leaves and at least one observer is waiting, then the observer who entered observer mode earliest becomes the final player in the roster, existing players move up to close the vacancy while preserving their relative order, and any remaining observers stay observers. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-PROFILEICON

### TEST-PROFILEICON-003

Given a player selects an icon, when that player enters the lobby and plays a round, then the same icon appears in the lobby, live scorecard, and standings.

**Acceptance Criteria:**
- [x] Given a player selects an icon, when that player enters the lobby and plays a round, then the same icon appears in the lobby, live scorecard, and standings. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-PUBLICGAMELANDINGPAGE

### TEST-PUBLICGAMELANDINGPAGE-043

Given an unauthenticated visitor opens the game landing page, when the page loads, then it presents an all-time leaderboard ranked by lifetime wins, total points, earliest win, and stable profile ID; discoverable lobby cards with exact player count/capacity, waiting state, and room age; and a concise versioned rules summary. It uses generated public aliases, honors opt-outs, excludes room codes and private room/game data, and provides usable empty/unavailable states.

**Acceptance Criteria:**
- [x] Given an unauthenticated visitor opens the game landing page, when the page loads, then it presents an all-time leaderboard ranked by lifetime wins, total points, earliest win, and stable profile ID; discoverable lobby cards with exact player count/capacity, waiting state, and room age; and a concise versioned rules summary. It uses generated public aliases, honors opt-outs, excludes room codes and private room/game data, and provides usable empty/unavailable states. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-PWAINSTALL

### TEST-PWAINSTALL-137

Verify actual admin manifest, icons, secure registration, install prompt lifecycle, production Chromium installability and absence of public-game install UI. Concrete assertions: tests/web/pwa-manifest.test.ts; tests/web/pwa-support.test.ts; tests/browser/pwa.spec.ts.

**Acceptance Criteria:**
- [ ] Only admin HTML links a manifest with stable id /admin, start_url /admin, scope /admin, Wordpairs Admin names, standalone display, same-origin192/512 PNGs and separate maskable icon. Public HTML has no manifest. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Referenced PNGs have declared dimensions, opaque brand background and safe-zone maskable artwork; Apple metadata and touch icon exist. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Authenticated admin UI registers /admin-sw.js with scope /admin and updateViaCache none in secure contexts, handles failures and uses fresh worker script headers. Public game has no installation UI or active worker registration. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] A captured install event prompts once after a click; dismissal/rejection preserves guidance; installed/standalone state hides install UI and listeners clean up. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Admin-only phone guidance covers iPhone Share/Android menus and HTTPS, with accessible narrow-screen layout. No physical installation or standalone GitHub cookie-context continuity is claimed by emulation. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Only admin pages link the admin manifest with identity/start/scope /admin and standalone presentation. Only authenticated admin UI offers installation. Public / and /play expose no manifest or install controls. No GitHub secret or provider token is returned to a browser response or client bundle. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)


## TEST-PWAPRIVACY

### TEST-PWAPRIVACY-138

Verify real production admin worker offline navigation/private cache exclusion, API/auth/public fallback exclusion, selective legacy retirement and updates. Concrete assertions: tests/web/pwa-worker.test.ts; tests/web/pwa-support.test.ts; tests/browser/pwa.spec.ts.

**Acceptance Criteria:**
- [ ] Network-failed admin document navigation returns a generic static reconnect/sign-in screen without private content; online recovery requires a current admin session. Public/API/auth navigations receive no admin offline fallback. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] API/auth/realtime/private navigation and mutations are never stored in worker caches; offline API/mutation requests fail without receiving offline HTML. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Admin updates remove only older wordpairs-admin-pwa-* caches and wait for active clients. Legacy public retirement removes only wordpairs-pwa-* and root /sw.js registration, preserving admin and other apps. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] The former root worker retires itself and only wordpairs-pwa-* caches. Admin/unrelated registrations and caches survive. Existing OS-installed icons cannot be removed by website code and are not claimed removed. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] The former root worker retires itself and only wordpairs-pwa-* caches. Admin/unrelated registrations and caches survive. Existing OS-installed icons cannot be removed by website code and are not claimed removed. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)
- [ ] Admin worker handles only same-origin GET admin document navigations, preserves HTTP errors and provides a generic offline screen only for network failure. It caches only public offline HTML/icons; no private HTML, sessions, APIs, credentials, RSC, mutations or background actions. (evidence: Unverified changed-release obligation; prior evidence retained in notes. Specification: docs/admin_pwa_release.md.)


## TEST-QUICKMATCH

### TEST-QUICKMATCH-023

Given at least one discoverable lobby has an available player slot, when a player uses quick match, then the service assigns them to the oldest eligible lobby, breaking equal creation times by stable room ID, without exceeding configured capacity. Given none is available, then the player is offered browsing or room creation.

**Acceptance Criteria:**
- [x] Given at least one discoverable lobby has an available player slot, when a player uses quick match, then the service assigns them to the oldest eligible lobby, breaking equal creation times by stable room ID, without exceeding configured capacity. Given none is available, then the player is offered browsing or room creation. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-REACTIONDELIVERY

### TEST-REACTIONDELIVERY-119

Test only the five allowed emoji, five-second expiry and two-second interval; verify real authorized delivery and unchanged game state/scores.

**Acceptance Criteria:**
- [x] Test only the five allowed emoji, five-second expiry and two-second interval; verify real authorized delivery and unchanged game state/scores. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] The service accepts only 👍, ❤️, 😂, 🎉, and 👀; each player may send one reaction every two seconds. It broadcasts reactions to connected players and observers in real time; reactions disappear after five seconds. Reactions are informational events and cannot mutate scores, answer submissions, hint state, category selection, or match state. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Reactions: Menu: 👍, ❤️, 😂, 🎉, 👀. A reaction is visible for five seconds; one reaction per player per two seconds. It cannot change game state or score. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-READYCOUNTDOWNANDROSTERLOCK

### TEST-READYCOUNTDOWNANDROSTERLOCK-031

Given every player in the room has marked ready, when the final ready state is received, then the game start countdown begins immediately and the player roster locks. If a player leaves after the countdown begins, then no observer or other player is promoted or substituted into that player’s place.

**Acceptance Criteria:**
- [x] Given every player in the room has marked ready, when the final ready state is received, then the game start countdown begins immediately and the player roster locks. If a player leaves after the countdown begins, then no observer or other player is promoted or substituted into that player’s place. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-REALTIMESYNC

### TEST-REALTIMESYNC-102

Publish committed state to authorized players/observers; assert ordered deduplicated allowlisted delivery, no pre-commit notification and authorized refetch after gaps.

**Acceptance Criteria:**
- [x] Publish committed state to authorized players/observers; assert ordered deduplicated allowlisted delivery, no pre-commit notification and authorized refetch after gaps. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] The service synchronizes room membership and round updates to all connected players. A confirmed correct answer updates the live scorecard, and all clients progress through the same hint stage. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-REQUESTFEEDBACK

### TEST-REQUESTFEEDBACK-143

Verify the documented UI behavior: Loading, empty, failure and canonical retry feedback.

**Acceptance Criteria:**
- [x] Pending reads expose accessible loading feedback; empty results are distinct from unavailable results and offer an allowed next action. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] Pending mutations show busy feedback and prevent duplicate submission while preserving entered data. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] Failures show a user-safe explanation and valid Retry action while retaining safe drafts; raw errors, credentials and private data are not exposed. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] An uncertain-write retry uses identical command identity/payload; conflicts refresh authoritative state without silently replaying a changed command or claiming success. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] Authorization denial clears privileged data/drafts and rejects stale response restoration; connection recovery retains accepted state without duplicate writes. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)


## TEST-RESPONSIVEMATRIX

### TEST-RESPONSIVEMATRIX-145

Verify the documented UI behavior: Minimum width, orientation and zoom preservation.

**Acceptance Criteria:**
- [x] At320x568,390x844 and844x390CSS-pixel layouts, game/form text, hints, score fields and controls remain reachable without horizontal page scrolling or clipping. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. 320CSS-pixel zoom equivalent and200%text fixture.)
- [x] At1280px width with400%zoom (320CSS-pixel equivalent) and with200%text enlargement, content reflows without losing required information/actions; browser zoom remains enabled. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. 320CSS-pixel zoom equivalent and200%text fixture.)
- [x] Orientation changes preserve the authorized room and safe draft state; stacked score layouts retain all fields and touch/keyboard actions remain operable. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. 320CSS-pixel zoom equivalent and200%text fixture.)


## TEST-REVIEWCHANGES

### TEST-REVIEWCHANGES-140

Verify the documented UI behavior: Reasoned change request and resubmission.

**Acceptance Criteria:**
- [x] An independent moderator requests changes with a nonempty reason; the suggestion enters changes_requested and remains unplayable. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] changes_requested consumes the proposer's one-open-suggestion slot; another open suggestion is rejected. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] Only the proposer can edit and resubmit exactly three pair suggestions; valid resubmission enters pending_review and still requires independent review and complete curation. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)
- [x] Revision, reason, actor and status transitions are auditable; a change request does not consume the rejection appeal allowance. (evidence: docs/testing/ui/implementation-receipt.json; matching criterion procedure in docs/testing/ui/cases/; exact snapshot docs/testing/ui/implementation-manifest.json. Isolated UI + real application/domain; SQL tier separately identified.)


## TEST-ROOMCODES

### TEST-ROOMCODES-110

Test valid/invalid/expired eight-character codes,10-per-minute attempts, atomic final-slot admission, empty-room expiry and generic not-found privacy.

**Acceptance Criteria:**
- [x] Test valid/invalid/expired eight-character codes,10-per-minute attempts, atomic final-slot admission, empty-room expiry and generic not-found privacy. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [ ] Room codes identify the intended active room and reject invalid or expired codes. Each room stores a configured capacity from 2 through 15. Room-code joins and deep-link joins use the same authoritative slot check as lobby browsing and quick match. When full, a valid invite permits the player to request observer mode instead of a player slot. Before countdown, promote the oldest observer into the last player position when a player leaves a full room; break equal observer-arrival times by stable profile ID. Use an eight-character Crockford Base32 code, valid while the room is active and expired on close; close empty rooms after 30 minutes and limit invalid-code attempts to 10 per minute per session. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)
- [x] Room code, reconnect, creator departure: Use an eight-character Crockford Base32 code. Codes remain valid while the room is active and expire on close; empty rooms close after 30 minutes. Reconnect retains membership for a two-minute grace interval. Creator departure grants no special authority; remaining players retain control. Invalid/expired codes return the same generic not-found response; limit code attempts to 10 per minute per session. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-ROOMINVITATIONS

### TEST-ROOMINVITATIONS-025

Given a player is in a room, when they share its room code or deep link, then another player can use either invitation to reach the intended room, subject to an open slot.

**Acceptance Criteria:**
- [x] Given a player is in a room, when they share its room code or deep link, then another player can use either invitation to reach the intended room, subject to an open slot. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [ ] Given a player in an active room, when they choose Copy Invitation Link and link creation and clipboard access succeed, the generated inviter-bound link is copied and displayed, with an accessible confirmation.
- [ ] Given a generated invitation link, when clipboard access is unavailable or denied, the link remains visible for manual copying and an accessible message explains that automatic copying failed.
- [ ] Given a player requests an invitation, if creation fails or returns no link, no new link is shown or copied, no copy-success confirmation is announced, and an accessible error is shown.


## TEST-ROOMJOINING

### TEST-ROOMJOINING-001

Given a valid room code and 2-15 players on separate devices, when each joins, then every joined player appears in the same room with their selected icon.

**Acceptance Criteria:**
- [ ] Given a valid room code and 2-15 players on separate devices, when each joins, then every joined player appears in the same room with their selected icon. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)


## TEST-ROOMSYNC

### TEST-ROOMSYNC-139

Run repeatable UI integration against an explicitly selected actual database-backed runtime with real private WebSockets and no HTTP fixtures, plus focused concurrency, lifecycle, scheduler and negative authorization regressions. Exercise2 through15 players and an observer, retain evidence and distinguish local runtime proof from hosted deployment.

**Acceptance Criteria:**
- [x] Actual private WebSocket subscriptions deliver only event/aggregate/version metadata to authenticated per-profile audiences; anonymous, cross-profile subscriptions and client publication are denied. (evidence: docs/evidence/room-sync/live-ui-final.log; docs/evidence/room-sync/live-ui-observations.json; docs/evidence/room-sync/runtime-health.json; docs/evidence/room-sync/auth-callback-green.log; docs/evidence/room-sync/lease-contract.log; docs/evidence/room-sync/unit-regression-final.log; tests/browser/live-player-counts.integration.spec.ts (matrix pending))
- [x] Repeatable browser integration creates real guests and room membership, enters a code, readies players, plays eight UI rounds, and verifies remote category, solve, hints, scores, reveal, reactions and final standings through actual private notifications and authorized reads while periodic UI polling is suppressed. (evidence: docs/evidence/room-sync/live-ui-final.log; docs/evidence/room-sync/live-ui-observations.json; docs/evidence/room-sync/runtime-health.json; docs/evidence/room-sync/auth-callback-green.log; docs/evidence/room-sync/lease-contract.log; docs/evidence/room-sync/unit-regression-final.log; tests/browser/live-player-counts.integration.spec.ts (matrix pending))
- [x] An authenticated server worker advances countdown and hint deadlines with all browsers offline, drains bounded durable outbox batches, reports deadline and publication failures separately, and preserves failed events for retry. Foreground requests never wait for an active worker batch. (evidence: docs/evidence/room-sync/live-ui-final.log; docs/evidence/room-sync/live-ui-observations.json; docs/evidence/room-sync/runtime-health.json; docs/evidence/room-sync/auth-callback-green.log; docs/evidence/room-sync/lease-contract.log; docs/evidence/room-sync/unit-regression-final.log; tests/browser/live-player-counts.integration.spec.ts (matrix pending))
- [x] The temporary HTTPS gateway serves app and Realtime paths while rejecting tenant management paths; private credentials and internal ports remain private. Cleanup acts only on its captured lease generation and owned resource identities. A separate-broker harness must own a separate strict-TLS game database/outbox; partial startup or unconfirmed cleanup preserves recovery identities and blocks replacement. (evidence: docs/evidence/room-sync/live-ui-final.log; docs/evidence/room-sync/live-ui-observations.json; docs/evidence/room-sync/runtime-health.json; docs/evidence/room-sync/auth-callback-green.log; docs/evidence/room-sync/lease-contract.log; docs/evidence/room-sync/unit-regression-final.log; tests/browser/live-player-counts.integration.spec.ts (matrix pending))
- [x] Focus, visibility and online recovery trigger authorized reads; concurrent reads coalesce one follow-up, older responses cannot lose newer notifications, and unmount/account changes prevent obsolete subscriptions after deferred authentication. Connected game/social safety reads use15seconds and disconnected recovery uses1second; cadence changes preserve in-flight/coalesced reads and independent display clocks. Presence responses are fully consumed before clearing canonical retries and refreshing; a body-read failure retains the exact retry command. (evidence: docs/evidence/room-sync/live-ui-final.log; docs/evidence/room-sync/live-ui-observations.json; docs/evidence/room-sync/runtime-health.json; docs/evidence/room-sync/auth-callback-green.log; docs/evidence/room-sync/lease-contract.log; docs/evidence/room-sync/unit-regression-final.log; tests/browser/live-player-counts.integration.spec.ts (matrix pending))
- [x] Real UI integration proves token renewal beyond the original120-second expiry and actual WebSocket close/reconnect followed by another push-driven game transition. (evidence: docs/evidence/room-sync/live-ui-final.log; docs/evidence/room-sync/live-ui-observations.json; docs/evidence/room-sync/runtime-health.json; docs/evidence/room-sync/auth-callback-green.log; docs/evidence/room-sync/lease-contract.log; docs/evidence/room-sync/unit-regression-final.log; tests/browser/live-player-counts.integration.spec.ts (matrix pending))
- [ ] Repeatable browser integration plays real eight-round games at every player count2 through15, with UI readiness/categories/every answer and identical final rankings, using a separately owned TLS game database and private Realtime outbox. At most two UI answers are submitted simultaneously; local results do not establish public-tunnel capacity. Cleanup is truthful and bounded. (evidence: Changed release scope30October2026; pending fresh cap15 validation and independent review. Prior criterion/evidence retained in docs/evidence/release15/qbrain-before.json.)


## TEST-ROUNDSUMMARY

### TEST-ROUNDSUMMARY-012

Given a round ends, when the summary appears, then it ranks all players by current cumulative score and shows the completed round’s points and solve times.

**Acceptance Criteria:**
- [x] Given a round ends, when the summary appears, then it ranks all players by current cumulative score and shows the completed round’s points and solve times. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-SCHEMAPROVISIONING

### TEST-SCHEMAPROVISIONING-123

Verify fresh/versioned migrations and repeatable credential-redacted provisioning with separated Preview/Production settings; actual provisioning entry point and hosted checks remain Phase7.

**Acceptance Criteria:**
- [ ] Verify fresh/versioned migrations and repeatable credential-redacted provisioning with separated Preview/Production settings; actual provisioning entry point and hosted checks remain Phase7. (evidence: Verification contract recorded; local partial evidence retained, Phase7 completion not claimed.)
- [ ] Provide a manually invoked, repeatable provisioning script using the Supabase and Vercel CLIs. It must create or link the projects, apply version-controlled database migrations, and set required Vercel environment variables for Preview and Production. The script must accept authenticated credentials from the operator’s environment, never commit or print secret values, and avoid configuring paid resources. (evidence: Local implementation/fixtures may cover part of this obligation; Phase7 operational completion is not claimed.)
- [ ] Deadline scheduler: Store versioned deadline jobs in Postgres and process due jobs using Supabase Cron/`pg_cron` at one-second cadence; each job calls a transactional database function, with stale-version and duplicate delivery as no-ops. This is a TR technical choice; verify current Free-plan capability at Phase 7 deployment entry after coding. (evidence: Requirement imported; operational portions remain unverified until the documented Phase7 check.)
- [ ] Given the planner is supplied recorded hosted history of core 001 through 011 followed by the hosted scheduler and private realtime migrations, it proposes later core extensions in order; changed, out-of-order, or unknown longer history is rejected before applying any migration.


## TEST-STATEAUTHORITY

### TEST-STATEAUTHORITY-101

Submit forged, stale and competing room/game commands; assert only the authoritative transaction commits and rejected commands preserve roster, score and version.

**Acceptance Criteria:**
- [x] Submit forged, stale and competing room/game commands; assert only the authoritative transaction commits and rejected commands preserve roster, score and version. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] A server-side game service owns room membership, round state, accepted answers, hint stage, scoring, solve timestamps, category choice, and match completion. Clients cannot award points or change a target answer. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Host authority and countdown: Creator has no special start/readiness privilege. All players have equivalent controls. All-ready starts a 10-second countdown and locks the roster. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Countdown departure below minimum: Never replace a player who leaves after lock. If fewer than two original players remain at countdown expiry, abort start and close the room. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Idle prompt and readiness races: The 30-second interval resets on player/observer membership or ready-state changes. Prompt once per unchanged aggregate version. Deadlines carry the expected version; stale jobs are no-ops. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-SUGGESTIONREVIEW

### TEST-SUGGESTIONREVIEW-115

Exercise lifetime wins at9/10, one open suggestion and exactly three pairs; reject unauthorized/incomplete activation and require independent review.

**Acceptance Criteria:**
- [x] Exercise lifetime wins at9/10, one open suggestion and exactly three pairs; reject unauthorized/incomplete activation and require independent review. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] The service tracks game wins for each player and unlocks category-and-pair suggestions when the player reaches 10 wins. It stores the proposed category and its three proposed word pairs as one submission, tracks its review status, and prevents unapproved or incomplete content from entering the playable catalog. Win counts use a stable player profile and are cumulative for that profile’s lifetime. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Moderation workflow: Roles are Content Moderator and Senior Moderator. At threshold, content enters Pending Review. A moderator other than the proposer approves or rejects with a reason. The proposer may appeal once to a Senior Moderator. Approval alone does not make content playable; the complete curated record must pass validation. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Suggestion eligibility: Wins are lifetime wins on one stable profile. A profile may have one open category suggestion at a time; each contains one category and exactly three pairs. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-SWBOMGENERATION

### TEST-SWBOMGENERATION-127

Generate CycloneDX1.6 from the exact lockfile with commit/environment/URL metadata and no secrets; reject invalid schema or mismatched deployment identity in Phase7.

**Acceptance Criteria:**
- [ ] Generate CycloneDX1.6 from the exact lockfile with commit/environment/URL metadata and no secrets; reject invalid schema or mismatched deployment identity in Phase7. (evidence: Verification contract recorded; local partial evidence retained, Phase7 completion not claimed.)
- [ ] Generate one CycloneDX JSON 1.6 software bill of materials (SWBOM) from the exact npm lockfile for every Vercel Preview or Production deployment. Include direct and transitive runtime and development components, declared licenses, package URLs, dependency relationships, build timestamp, Git commit SHA, deployment environment, and Vercel deployment URL. Generate it after the mock-first test gate and before the application build, then bundle it into that same immutable deployment at `public/sbom/<git-commit-sha>.cdx.json`. Never include secrets or environment-variable values. Document the artifact contract in `docs/SWBOM.md`. (evidence: Local implementation/fixtures may cover part of this obligation; Phase7 operational completion is not claimed.)


## TEST-SWBOMRELEASEARCHIVE

### TEST-SWBOMRELEASEARCHIVE-041

Given source files and a candidate SWBOM fixture for the same release commit are prepared, when a source archive is packaged, then the archive contains the complete source, `LICENSE`, and SWBOM at `sbom/<git-commit-sha>.cdx.json`; packaging rejects a missing, invalid, or mismatched report. This criterion is verified against temporary files and does not depend on a deployed artifact.

**Acceptance Criteria:**
- [x] Given source files and a candidate SWBOM fixture for the same release commit are prepared, when a source archive is packaged, then the archive contains the complete source, `LICENSE`, and SWBOM at `sbom/<git-commit-sha>.cdx.json`; packaging rejects a missing, invalid, or mismatched report. This criterion is verified against temporary files and does not depend on a deployed artifact. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-TDDACCEPTANCE

### TEST-TDDACCEPTANCE-126

Reject uncovered active ACs, invalid mocks and missing negative controls before implementation; verify the eventual deployment build runs tests before compilation and fails closed.

**Acceptance Criteria:**
- [ ] Reject uncovered active ACs, invalid mocks and missing negative controls before implementation; verify the eventual deployment build runs tests before compilation and fails closed. (evidence: Verification contract recorded; local partial evidence retained, Phase7 completion not claimed.)
- [ ] Before writing implementation code for an increment, define tests for every applicable acceptance criterion, validate the tests against mocks, and then implement the smallest behavior that makes them pass. The Vercel build must run the test suite before the production build. No GitHub Actions workflow is assumed or required. (evidence: Local implementation/fixtures may cover part of this obligation; Phase7 operational completion is not claimed.)


## TEST-TESTABLECONCURRENCYSAFEDOMAINBOUNDARY

### TEST-TESTABLECONCURRENCYSAFEDOMAINBOUNDARY-051

Given game rules are exercised without production infrastructure, when domain use cases are tested, then they run through injected ports/fakes without requiring Next.js or Supabase runtime services. Given an application command targets a full or stale room, when its repository port reports a conflict, then the use case returns the canonical conflict result without repeating a domain side effect.

**Acceptance Criteria:**
- [x] Given game rules are exercised without production infrastructure, when domain use cases are tested, then they run through injected ports/fakes without requiring Next.js or Supabase runtime services. Given an application command targets a full or stale room, when its repository port reports a conflict, then the use case returns the canonical conflict result without repeating a domain side effect. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-TIMETIEBREAK

### TEST-TIMETIEBREAK-014

Given two or more players tie for the highest score, when final standings are calculated, then total answer time is the sum of each round’s accepted solve duration, with 80 seconds charged for an unsolved round; the lower total ranks first, and an exact tie shares the same rank.

**Acceptance Criteria:**
- [x] Given two or more players tie for the highest score, when final standings are calculated, then total answer time is the sum of each round’s accepted solve duration, with 80 seconds charged for an unsolved round; the lower total ranks first, and an exact tie shares the same rank. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-UIACCESSIBILITY

### TEST-UIACCESSIBILITY-112

Measure text/button contrast, visible focus,44px primary targets, semantic state labels and keyboard/touch action across portrait/landscape.

**Acceptance Criteria:**
- [x] Measure text/button contrast, visible focus,44px primary targets, semantic state labels and keyboard/touch action across portrait/landscape. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)
- [x] Text and controls maintain clear contrast over every category background. Focus, selected icons, solved status, and score changes use labels or shapes as well as color. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-UNSOLVEDRESULT

### TEST-UNSOLVEDRESULT-008

Given a player remains unsolved after Hint 3, when the round ends, then the player earns 0 points and the game reveals the correct answer.

**Acceptance Criteria:**
- [x] Given a player remains unsolved after Hint 3, when the round ends, then the player earns 0 points and the game reveals the correct answer. (evidence: docs/phase6_execution.md; docs/admin_acl_review_receipt.json; docs/testing.md)


## TEST-VERCELDEPLOYMENT

### TEST-VERCELDEPLOYMENT-120

After Phase7 implementation, verify the authorized Vercel Git target, preview/production branch mapping and commit-bound deployment metadata; no hosted deployment is currently claimed.

**Acceptance Criteria:**
- [ ] After Phase7 implementation, verify the authorized Vercel Git target, preview/production branch mapping and commit-bound deployment metadata; no hosted deployment is currently claimed. (evidence: Verification contract recorded; local partial evidence retained, Phase7 completion not claimed.)
- [ ] Deploy the web application from the `sharpninja/wordpairs` GitHub repository to Vercel. Use Vercel’s Git integration: pushes to non-production branches create Preview deployments, and changes merged to `main` create Production deployments. Select the framework preset, project root, build command, and output directory to match the implementation once its framework is approved. (evidence: Local implementation/fixtures may cover part of this obligation; Phase7 operational completion is not claimed.)


## TEST-WIKIPUBLISH

### TEST-WIKIPUBLISH-148

Verify current QBrain readback/export counts, canonical ZIP integrity, all page/evidence hashes and link transforms; push the isolated wiki checkout, read back its exact commit/tree, preserve unrelated pages and reject secret-bearing evidence. Record the concrete remote result, not merely a prepared payload.

**Acceptance Criteria:**
- [x] Each refresh-docs reconciles authoritative QBrain records and mappings, verifies readback, exports the supported wiki and validates every configured page and scoped requirement ID before publication. (evidence: Verified wiki commit 62c60250feb869762eeffad0b689eac1be2a1579; complete remote Git tree readback 270files. Canonical export b6a44c6cc43dddcb473af18d504c64026ef75599f78c04863e4913afe1d0505c; docs/submission/wiki-publication.json; hostile publication approval99/99 and all retained prior rounds in docs/evidence/ui-gaps/hostile-validation.jsonl.)
- [x] Publish the GitHub export to https://github.com/sharpninja/wordpairs.wiki.git, preserve unrelated pages, disclose publication-only link/asset transforms, and verify pushed commit and file hashes by remote Git readback. (evidence: Verified wiki commit 62c60250feb869762eeffad0b689eac1be2a1579; complete remote Git tree readback 270files. Canonical export b6a44c6cc43dddcb473af18d504c64026ef75599f78c04863e4913afe1d0505c; docs/submission/wiki-publication.json; hostile publication approval99/99 and all retained prior rounds in docs/evidence/ui-gaps/hostile-validation.jsonl.)
- [x] Preserve all available hostile-validation receipts including rejected/superseded rounds and labeled reconstructions, bind approvals to source/evidence inventories, and exclude private runtime credentials/session files from the published evidence. (evidence: Verified wiki commit 62c60250feb869762eeffad0b689eac1be2a1579; complete remote Git tree readback 270files. Canonical export b6a44c6cc43dddcb473af18d504c64026ef75599f78c04863e4913afe1d0505c; docs/submission/wiki-publication.json; hostile publication approval99/99 and all retained prior rounds in docs/evidence/ui-gaps/hostile-validation.jsonl.)
