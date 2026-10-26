type Proof = {
  files: string[];
  entrypoints: string[];
  assertions: string;
  difference?: string;
};
const proof = (
  files: string[],
  entrypoints: string[],
  assertions: string,
  difference?: string,
): Proof => ({ files, entrypoints, assertions, difference });
const app = (name: string) => `tests/application/${name}.test.ts`;
const acceptance = (name: string) => `tests/acceptance/${name}.test.ts`;
const browser = (name: string) => `tests/browser/${name}.spec.ts`;
const rooms = proof(
  [
    acceptance("lobby-content-counterparts"),
    app("rooms"),
    browser("rooms.phase2"),
    browser("recovery.phase6"),
  ],
  [
    "src/application/rooms.ts",
    "src/domain/rooms.ts",
    "src/web/room-screen.tsx",
    "src/web/play-hub.tsx",
  ],
  "Code, browse, quick-match and signed invitation resolve to the same room; RoomService.join checks capacity and returns one committed membership, conflicting last-seat command and unchanged full rejection. Shared roster contains the selected profile icons. Empty quick-match offers browse/create; a stale lost seat returns CONFLICT with actionable UI recovery. Lookup/selection/signature authority is an injected repository port, with adapter checks recorded separately.",
  "The historical four-character ABCD code is replaced by the approved eight-character code. Fixture names, error labels and response field names are projected explicitly rather than copied as raw product DTOs.",
);
const capacity = proof(
  [
    acceptance("boundary-counterparts"),
    acceptance("lobby-content-counterparts"),
    app("rooms"),
  ],
  [
    "src/application/rooms.ts",
    "src/domain/rooms.ts",
    "src/application/matches.ts",
  ],
  "Populate 2, 8 and 25-player rooms, reject overflow without mutation, populate 25 bound observers and reject observer 26. Competing actual RoomService commands through a serialized port admit only one final player; stale loser conflicts and a fresh full attempt changes nothing. At maximum size, all 25 score exactly once, observers have the corresponding player projection and cannot mutate; room event audience includes all 50 profiles.",
  "Port fake serialization is use-case evidence only; it does not claim PostgreSQL durability.",
);
const gameplay = proof(
  [
    acceptance("real-gameplay"),
    acceptance("eight-round-counterpart"),
    app("match"),
    app("matches"),
    browser("matches.phase4"),
  ],
  [
    "src/domain/match.ts",
    "src/application/matches.ts",
    "src/domain/catalog.ts",
    "src/web/game-panel.tsx",
  ],
  "Actual MatchService commands and domain projections provide anchor authority, 5/3/2/1 scoring once, all-unsolved hint advancement, server acceptance timing/order, locked solved hints, summary/final ranking and exact ties with 80 seconds per unsolved round. Original gameplay oracles run unchanged where the fixture matches; browser journeys verify controls, private observer perspective, revealed target and canonical answer retry.",
);
const content = proof(
  [
    app("content"),
    app("content-service"),
    acceptance("lobby-content-counterparts"),
    browser("content.phase5"),
    browser("reactions.phase5"),
  ],
  [
    "src/domain/content.ts",
    "src/application/content.ts",
    "src/web/content-panel.tsx",
    "src/web/social-panel.tsx",
  ],
  "Current revealed no-hint solver only; normalized unique profile/candidate and one eligible-round nomination; 9/10 threshold and approval remain unplayable before complete curation. Ten lifetime wins, exactly three distinct pairs and one open suggestion. Independent reasoned moderation; one proposer appeal; distinct senior uphold/overturn; forbidden original reviewer and second appeal. Captured transition audits assert actor, reason, previous/new status, count, eligibility and publication fields. Failed/forbidden actions preserve committed state/audits; activation alone introduces complete immutable future content.",
  "Production stores independent nomination votes and a separate content aggregate; historical observer/state/error DTO spellings are mapped by their policy meaning.",
);
const identity = proof(
  [
    app("identity"),
    "tests/integration/oidc.test.ts",
    "tests/web/identity-api.test.ts",
    browser("identity.phase2"),
    browser("privacy.phase2"),
    browser("recovery.phase6"),
  ],
  [
    "src/application/identity.ts",
    "src/infrastructure/oidc.ts",
    "src/web/identity-panel.tsx",
    "src/web/guest-credential.ts",
  ],
  "Actual identity application handles generated guest opt-out, stable browser credential and stable verified issuer/subject member association without guest linking. Browser IndexedDB/cookie clear resets the guest; reload retains preferences; uncertain preference retry has identical payload and one mutation; stale shared-session mutation refreshes identity. Actual OIDC adapter rejects invalid signature, issuer, audience, state, nonce and expiry; invalid callbacks never associate a profile. Private API derives actor and rejects forged displayed identity/roles.",
  "Provider discovery/JWKS/token transport and persistence are local fakes; no live account or provider entitlement is claimed. Browser member entry invokes application begin/completeLogin behind this verified-claims port.",
);
const lobby = proof(
  [
    app("lobby"),
    acceptance("lobby-content-counterparts"),
    browser("lobby.phase3"),
    browser("recovery.phase6"),
  ],
  [
    "src/domain/lobby.ts",
    "src/application/lobby.ts",
    "src/web/room-screen.tsx",
  ],
  "Full pre-countdown departure compacts survivors and promotes oldest observer last, with stable profile ID for equal arrival time. Empty queue leaves a slot. Concurrent/stale commands conflict canonically. Final ready locks a 10-second roster; locked departures never substitute and fewer than two originals closes at expiry. Five-second warning removes holdout only above two; two-player holdout remains. Ready/deadline races and stale jobs cannot apply twice. All five readiness/player/observer changes reset the 30-second prompt; old jobs are silent, current roster prompts once and countdown suppresses idle. Explicit loss, 45-second detection, full 120-second grace and late catch-up preserve original timing; browser reconnect restores the same seat and expired perspective disappears.",
);
const publicRead = proof(
  [
    app("public-projections"),
    app("public-service"),
    "tests/web/landing.test.ts",
    "tests/web/landing-api.test.ts",
  ],
  [
    "src/application/public-projections.ts",
    "src/application/public-service.ts",
    "src/web/landing-board.tsx",
  ],
  "Anonymous normal/empty/unavailable landing renders real versioned rules. Ranking sorts lifetime wins, points, earliest win and stable ID, filtering opt-outs including guests; generated aliases only. Exclusion IDs are derived from actual input/output difference, and observed repository call clocks establish 5-minute ranking and 15-second lobby refresh. Joinable summaries expose exact counts/capacity, waiting state and room age, with allowlisted DTOs excluding private names/codes/targets/provider records.",
  "Rules include the original three concise instructions plus approved eight-round/scoring instructions. Production DTOs and cache behavior are asserted separately where historical combined fixture DTOs differ.",
);
export const coverageProofs: Record<string, Proof> = {
  "AC-01": rooms,
  "AC-02": capacity,
  "AC-03": proof(
    [browser("accessibility.phase6"), app("identity")],
    [
      "src/application/identity.ts",
      "src/web/identity-panel.tsx",
      "src/web/room-screen.tsx",
      "src/web/game-panel.tsx",
    ],
    "Choose frog through actual preferences, reload, assert aria-pressed, then the selected icon in room roster, live scorecard, revealed round summary and final standings after eight actual rounds.",
  ),
  "AC-04": {
    ...gameplay,
    files: [...gameplay.files, acceptance("boundary-counterparts")],
  },
  "AC-05": proof(
    [browser("accessibility.phase6"), app("catalog-seed")],
    [
      "src/web/game-panel.tsx",
      "src/infrastructure/catalog-seed.json",
      "public/backgrounds/heroes.svg",
      "public/backgrounds/colors.svg",
    ],
    "Every seed pair matches its category asset; two different heroes pairs load heroes.svg and colors loads colors.svg in Chromium. Readable foreground/overlay contrast and enabled controls are measured. Forced missing art shows an accessible unavailable status and usable controls; explicit retry can recover.",
    "Historical animals/forest.svg fixtures are replaced by actual approved category assets. Actual CSS background URLs, successful image loads and fallback observations are retained.",
  ),
  ...Object.fromEntries(
    ["06", "07", "08", "09", "10", "11", "12", "13", "14"].map((n) => [
      `AC-${n}`,
      gameplay,
    ]),
  ),
  "AC-15": proof(
    [browser("accessibility.phase6")],
    ["src/app/globals.css", "src/web/game-panel.tsx"],
    "At 320×568, 568×320, 390×844 and 844×390, answer/hints/scorecard are visible by normal vertical scroll, no horizontal overflow occurs, keyboard Tab/Enter and touch submit actual answers; 25-player/25-observer long roster also renders on 320-pixel phone.",
  ),
  "AC-16": proof(
    [
      acceptance("boundary-counterparts"),
      app("catalog-seed"),
      app("match"),
      app("content"),
    ],
    ["src/domain/catalog.ts", "src/domain/content.ts"],
    "Complete approved records are selectable. Missing prompt, target, ordered hint, policy field or background rejects the catalog; missing category/unapproved records are excluded; disabled/selectable=false pairs are excluded from future pools while historical versions remain resolvable. Canonical target with zero alternatives is valid.",
    "Historical acceptedAnswers=[] meant missing policy; production target is canonical and acceptedAnswers lists alternatives, so [] is valid, while undefined/malformed policy is invalid. Historical enabled=false maps to selectable=false. Malformed complete catalog input is rejected as a whole, preventing that record from entering play.",
  ),
  "AC-17": content,
  "AC-18": content,
  "AC-19": content,
  "AC-20": identity,
  "AC-21": identity,
  "AC-22": publicRead,
  "AC-23": rooms,
  "AC-24": capacity,
  "AC-25": rooms,
  "AC-26": rooms,
  "AC-27": capacity,
  "AC-28": {
    ...gameplay,
    files: [
      ...gameplay.files,
      acceptance("boundary-counterparts"),
      "tests/web/matches-api.test.ts",
      "tests/web/lobby-api.test.ts",
    ],
  },
  "AC-29": proof(
    [app("reactions"), app("reaction-service"), browser("reactions.phase5")],
    [
      "src/domain/reactions.ts",
      "src/application/reactions.ts",
      "src/web/social-panel.tsx",
    ],
    "Exact 👍 ❤️ 😂 🎉 👀 menu; allowed reaction visible to room players/observers, invalid emoji denied without broadcast. Separate reaction aggregate leaves match, room, answer and score unchanged. Canonical resend does not extend lifetime or repeat event. Rate/expiry timing remains separately identified TR-19 evidence.",
  ),
  "AC-30": lobby,
  "AC-31": lobby,
  "AC-32": lobby,
  "AC-33": lobby,
  "AC-37": proof(
    [app("command"), browser("privacy.phase2"), browser("recovery.phase6")],
    [
      "src/application/command.ts",
      "src/web/play-hub.tsx",
      "src/web/game-panel.tsx",
    ],
    "Actual quota rejection produces SERVICE_LIMIT before decision with committed state untouched and identical-command retry succeeds on recovery. Stalled request releases busy state. Browser storage SERVICE_LIMIT is followed by explicit identical create retry to one confirmed room; no paid fallback exists.",
  ),
  "AC-38": proof(
    [
      "tests/traceability/ac-inventory.test.ts",
      "tests/ac-contracts/oracle-validation.test.ts",
      "tests/acceptance/coverage-map.test.ts",
    ],
    ["tests/traceability/inventory-validator.ts"],
    "45 active IDs/67 primary IDs/27 supplemental clauses are mapped to existing executable evidence. Missing AC/test/record/assertions, planned-only records, duplicate IDs and empty active set are rejected; all named semantic controls remain unchanged. The final manifest binds each oracle leaf to counterpart evidence and fixture discrepancies.",
  ),
  "AC-39": proof(
    [
      "tests/traceability/ac-inventory.test.ts",
      app("catalog-seed"),
      "tests/ac-contracts/oracle-supplemental-validation.test.ts",
    ],
    [
      "package.json",
      "package-lock.json",
      "docs/ATTRIBUTIONS.md",
      "LICENSE",
      "third_party/unicode/CaseFolding-18.0.0.txt",
    ],
    "Installed direct package versions/licenses match actual lock and purpose/upstream attribution rows. Original SVG Recursive font copyright/OFL text and Unicode source/license/hash are preserved; six background SVGs are original project artwork.",
    "Dependency versions and asset inventory are the actual locked project, not the historical example packages.",
  ),
  "AC-41": proof(
    [
      acceptance("source-archive"),
      "tests/ac-contracts/oracle-supplemental-validation.test.ts",
    ],
    ["tests/ac-contracts/archive-fixture-validator.ts", "docs/SWBOM.md"],
    "Temporary exact HEAD Git snapshot tar.gz is read back against every independently fetched Git blob hash, matching fixture CycloneDX 1.6 BOM and SHA256 sidecar. Missing/malformed/wrong-commit report, source alteration/removal and sidecar corruption fail. Original ZIP parser/truncation/schema/path controls remain.",
    "The original ZIP fixture keeps its historical commit token; added tar.gz counterpart uses current immutable Git HEAD and actual snapshot bytes. Fixture BOM has no deployed inventory claim; operational packaging remains Phase 7.",
  ),
  "AC-42": proof(
    [
      acceptance("source-archive"),
      "tests/ac-contracts/oracle-supplemental-validation.test.ts",
    ],
    ["LICENSE", "docs/ATTRIBUTIONS.md", "docs/word_association_round_flow.svg"],
    "Exact source archive preserves complete pinned GPL-2 text, attribution and complete Recursive copyright/OFL notice. Missing/truncated license, altered source, omitted notices and missing font terms are rejected.",
    "Exact-candidate tar.gz is additional temporary contract evidence; original ZIP tests and pinned notice hashes are preserved.",
  ),
  "AC-43": publicRead,
  "AC-44": proof(
    [browser("accessibility.phase6")],
    [
      "src/app/globals.css",
      "src/web/identity-panel.tsx",
      "src/web/game-panel.tsx",
    ],
    "Computed gameplay foreground/background RGBA ratios are retained unrounded; compositing over black and white gives conservative artwork bounds ≥4.5. Four viewports verify solid 3px visible keyboard focus, ≥44px primary button, Tab/Enter and touch operation. Icon selection is conveyed by accessible aria-pressed plus named icon; solved check/text and +3 points text convey status without color.",
    "Original contrastRatio exactly 4.5 is a threshold fixture, not an expected measurement. Actual minimum is retained, never capped. Historical literal “Owl selected” maps to accessible named icon and aria-pressed=true; score uses text +3 points without requiring a decorative arrow.",
  ),
  "AC-45": {
    ...gameplay,
    files: [
      ...gameplay.files,
      acceptance("boundary-counterparts"),
      "tests/web/matches-api.test.ts",
      browser("recovery.phase6"),
    ],
  },
  "AC-46": identity,
  "AC-47": content,
  "AC-50": publicRead,
  "AC-51": proof(
    [
      "tests/architecture/phase1a-bootstrap.test.ts",
      app("command"),
      acceptance("lobby-content-counterparts"),
      acceptance("boundary-counterparts"),
    ],
    [
      "src/domain/model.ts",
      "src/application/command.ts",
      "src/application/rooms.ts",
      "tests/architecture/import-boundary.ts",
    ],
    "AST runtime/type import guard rejects Next/Supabase/framework/infrastructure edges from domain/application. Real command orchestration stages exactly one domain transition/outbox, returns canonical retry without rerunning decisions, rejects changed digests/stale versions, and preserves committed state on reported rollback. Real room decisions obey conditional capacity conflicts.",
    "Serial transaction port is explicit use-case evidence only; database locking, RLS, uniqueness and transport delivery are separate TR results.",
  ),
};
