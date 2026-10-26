export type AssertionBinding = {
  file: string;
  title: string;
  observations: string[];
};
const b = (
  file: string,
  title: string,
  ...observations: string[]
): AssertionBinding => ({ file, title, observations });
const a = (file: string, title: string, ...observations: string[]) =>
  b(`tests/application/${file}.test.ts`, title, ...observations);
const p = (title: string, ...observations: string[]) =>
  b(
    "tests/acceptance/lobby-content-counterparts.test.ts",
    title,
    ...observations,
  );
const boundary = (title: string, ...observations: string[]) =>
  b("tests/acceptance/boundary-counterparts.test.ts", title, ...observations);
const ui = (file: string, title: string, ...observations: string[]) =>
  b(`tests/browser/${file}.spec.ts`, title, ...observations);
const admission = p(
  "primary and supplemental counterparts resolve code",
  "view.roomId",
  "view.players",
  "results.filter",
  "store.state",
);
const capacity = boundary(
  "fills capacities 2/8/25",
  "joinRoom",
  "room",
  "calls",
  "match.anchorId",
);
const icon = ui(
  "accessibility.phase6",
  "chosen icon persists",
  "aria-pressed",
  "frog",
  "final",
);
const art = ui(
  "accessibility.phase6",
  "counterpart artwork failure",
  "data-artwork",
  "Your answer",
  "Category artwork unavailable",
);
const artLoaded = ui(
  "accessibility.phase6",
  "counterpart real",
  "observed.background",
  "pair.prompt",
  "data-artwork",
);
const phone = ui(
  "accessibility.phase6",
  "keyboard and touch",
  "scrollWidth",
  "sample.ratios",
  "measured.focus",
  "measured.buttonHeight",
  "Solved",
);
const audit = p(
  "audit fields follow threshold",
  "transition.audits",
  "store.state",
  "store.commits",
  "publications",
);
const appeal = a(
  "content",
  "allows one proposer appeal",
  "resolveAppeal",
  "appealCase",
  "publications",
  "status",
);
const contentGate = a(
  "content",
  "activation requires an approved case",
  "activateCase",
  "publications",
  "playable",
);
const oidc = b(
  "tests/integration/oidc.test.ts",
  "rejects a malformed or untrusted token",
  "verify",
);
const identity = ui(
  "recovery.phase6",
  "guest clear/reset",
  "state.guests",
  "state.members",
  "state.profiles",
  "preferenceBodies",
  "aria-pressed",
);
const pub = a(
  "public-projections",
  "orders lifetime wins",
  "calls",
  "rankPublicProfiles",
);
const cache = a(
  "public-service",
  "refreshes lobbies",
  "repository.lobbies",
  "repository.leaderboard",
);
const archive = b(
  "tests/acceptance/source-archive.test.ts",
  "exact Git snapshot tar.gz",
  "inspect",
  "manifest.has",
  "sha256",
  "svg",
);
const leave = a(
  "lobby",
  "compacts survivors",
  "next.players",
  "next.observers",
  "ready",
);
const locked = p(
  "concurrent leave and observer arrival",
  "results",
  "store.state.players",
  "store.state.lockedRoster",
  "store.state.observers",
);
const noop = a("command", "runs unchanged AC-51-T03/T04", "assertObservation");
export const primaryBindings: Record<string, AssertionBinding[]> = {
  "AC-01-T01": [admission],
  "AC-02-T01": [
    capacity,
    a("rooms", "enforces the 2–25 capacity range", "roomCapacity"),
  ],
  "AC-02-T02": [admission],
  "AC-03-T01": [icon],
  "AC-05-T01": [
    art,
    artLoaded,
    a("catalog-seed", "ships six categories", "backgroundId"),
  ],
  "AC-13-T01": [
    b(
      "tests/acceptance/eight-round-counterpart.test.ts",
      "actual commands finish only after eight",
      "store.state.status",
      "store.state.rounds",
      "scenario.assertObservation",
    ),
  ],
  "AC-15-T01": [phone],
  "AC-16-T01": [
    boundary(
      "rejects each incomplete catalog field",
      "buildCatalog",
      "categoryPool",
    ),
  ],
  "AC-17-T01": [a("content", "normalizes candidates", "nominate")],
  "AC-18-T01": [
    a(
      "content",
      "counts unique profiles",
      "status",
      "reviewCase",
      "futureEligible",
      "publications",
    ),
    contentGate,
  ],
  "AC-18-T02": [
    appeal,
    a(
      "content-service",
      "commits audited suggestions once",
      "service.act",
      "audits",
      "state.publications",
    ),
    audit,
  ],
  "AC-19-T01": [
    a(
      "content",
      "requires ten lifetime wins",
      "suggestCategory",
      "playable",
      "publications",
    ),
    contentGate,
  ],
  "AC-20-T01": [
    identity,
    a("identity", "passes only verified identities", "service", "member"),
    oidc,
  ],
  "AC-21-T01": [
    identity,
    admission,
    ui(
      "recovery.phase6",
      "empty and lost-seat quick match",
      "rooms.size",
      "1 / 8 players",
    ),
  ],
  "AC-22-T01": [
    a("public-projections", "shows only discoverable waiting", "publicLobbies"),
  ],
  "AC-23-T01": [
    p(
      "oldest-room port contract",
      "selected",
      "service.quickMatch",
      "stores.every",
    ),
    admission,
    ui(
      "recovery.phase6",
      "empty and lost-seat quick match",
      "No joinable rooms",
      "The room or account changed",
      "Browse open rooms",
    ),
  ],
  "AC-23-T02": [p("oldest-room port contract", "raced", "stores.every", "p3")],
  "AC-24-T01": [
    capacity,
    a("rooms", "enforces the 2–25 capacity range", "roomCapacity"),
  ],
  "AC-25-T01": [admission],
  "AC-26-T01": [
    admission,
    ui(
      "rooms.phase2",
      "signed full-room link",
      "landing",
      "joins",
      "Join as player",
      "Read-only observer",
    ),
  ],
  "AC-27-T01": [
    a(
      "rooms",
      "rejects a full player join",
      "players",
      "observed.value.observers",
      "playerAuthority",
    ),
  ],
  "AC-28-T01": [
    a("lobby", "rejects observers and outsiders", "setReady", "presence"),
    boundary("maximum 25 players", "observer", "h.act", "scorecard"),
    b(
      "tests/web/lobby-api.test.ts",
      "returns canonical observer denial",
      "status).toBe(403)",
    ),
  ],
  "AC-29-T01": [
    a("reactions", "permits exactly five emoji", "REACTION", "room", "match"),
  ],
  "AC-30-T01": [leave],
  "AC-30-T02": [
    a("lobby", "does not promote if room was not full", "players", "observers"),
  ],
  "AC-30-T03": [
    p(
      "stale departure loses to queue change",
      "results",
      "store.state.players",
      "store.state.observers",
    ),
  ],
  "AC-30-T04": [leave],
  "AC-31-T01": [
    a(
      "lobby",
      "starts a five-second warning",
      "room.status",
      "countdownDueAt",
      "lockedRoster",
    ),
    a("lobby", "commits one canonical ready", "events", "service.act"),
  ],
  "AC-31-T02": [
    a(
      "lobby",
      "never substitutes after lock",
      "room.players",
      "room.observers",
      "next.status",
    ),
  ],
  "AC-31-T03": [locked],
  "AC-31-T04": [
    a("lobby", "never substitutes after lock", "next.status", "next.closedAt"),
  ],
  "AC-32-T01": [
    ui(
      "lobby.phase3",
      "two actual clients ready",
      "Mark ready within 5 seconds",
      "getByRole('alert')",
      "Roster locked",
    ),
    a(
      "lobby",
      "starts a five-second warning",
      "holdoutDueAt",
      "countdownDueAt",
      "expireLobby",
    ),
  ],
  "AC-32-T02": [
    a(
      "lobby",
      "removes a holdout in larger",
      "expireLobby",
      "next.players",
      "next.observers",
      "next.status",
      "next.countdownDueAt",
    ),
  ],
  "AC-32-T03": [
    p(
      "final ready wins before warning expiry",
      "countdownDueAt",
      "store.state.version",
      "service.expire",
      "store.commits",
    ),
    a(
      "lobby",
      "enforces overdue holdout",
      "h.events",
      "h.room().status",
      "service.act",
    ),
  ],
  "AC-32-T04": [
    a(
      "lobby",
      "retains exactly-two holdout",
      "room.status",
      "room.players",
      "room.holdoutDueAt",
      "setReady",
    ),
  ],
  "AC-33-T01": [
    p(
      "all five membership/readiness changes",
      "expireLobby",
      "fresh.dueAt",
      "prompted.players",
      "locked.status",
    ),
    a(
      "lobby",
      "prompts once after 30s",
      "dueAt",
      "expireLobby",
      "idlePromptedVersion",
    ),
  ],
  "AC-37-T01": [
    a("command", "runs the unchanged AC-37-T01", "assertObservation"),
  ],
  "AC-38-T01": [
    b(
      "tests/traceability/ac-inventory.test.ts",
      "validates concrete manifest",
      "validateTraceabilityManifest",
    ),
  ],
  "AC-39-T01": [
    b(
      "tests/traceability/ac-inventory.test.ts",
      "records each installed direct",
      "packageJson.license",
      "columns",
      "locked",
      "installed",
    ),
  ],
  "AC-41-T01": [
    archive,
    b(
      "tests/ac-contracts/oracle-supplemental-validation.test.ts",
      "creates and inspects ZIP",
      "validateSourceArchiveZip",
    ),
  ],
  "AC-42-T01": [
    archive,
    b(
      "tests/ac-contracts/oracle-supplemental-validation.test.ts",
      "validates complete GPL",
      "validateReleaseNoticesZip",
    ),
  ],
  "AC-43-T01": [
    b(
      "tests/web/landing.test.ts",
      "renders rules, ranking and rooms",
      "screen",
    ),
    b("tests/web/landing.test.ts", "shows recoverable unavailable", "screen"),
  ],
  "AC-43-T02": [pub, cache],
  "AC-43-T03": [
    a("public-projections", "shows only discoverable waiting", "publicLobbies"),
    a("public-projections", "runs unchanged AC-50", "assertObservation"),
    cache,
  ],
  "AC-44-T01": [phone, icon],
  "AC-46-T01": [
    oidc,
    b("tests/integration/oidc.test.ts", "rejects a bad state", "verify"),
    a("identity", "passes only verified identities", "member"),
  ],
  "AC-47-T01": [audit],
  "AC-47-T02": [
    audit,
    contentGate,
    p(
      "normal independent moderator approval",
      "transition.audits",
      "publications",
      "playable",
    ),
  ],
  "AC-47-T03": [audit, appeal],
  "AC-50-T01": [
    a(
      "public-projections",
      "runs unchanged AC-50",
      "assertObservation",
      "encoded",
    ),
  ],
  "AC-51-T01": [
    b(
      "tests/architecture/phase1a-bootstrap.test.ts",
      "keeps domain modules",
      "forbiddenImports",
    ),
    b(
      "tests/architecture/phase1a-bootstrap.test.ts",
      "rejects infrastructure/framework imports",
      "forbiddenImports",
    ),
  ],
  "AC-51-T02": [admission],
  "AC-51-T03": [noop],
  "AC-51-T04": [noop],
};
for (const id of [
  "AC-04-T01",
  "AC-04-T02",
  "AC-06-T01",
  "AC-07-T01",
  "AC-08-T01",
  "AC-09-T01",
  "AC-10-T01",
  "AC-11-T01",
  "AC-12-T01",
  "AC-14-T01",
  "AC-45-T01",
  "AC-45-T02",
  "AC-45-T03",
])
  primaryBindings[id] = [
    b(
      "tests/acceptance/real-gameplay.test.ts",
      `${id} real domain/application conformance`,
      "scenario.assertObservation(observed)",
    ),
  ];
primaryBindings["AC-10-T01"].push(icon);
primaryBindings["AC-14-T01"].push(
  a("match", "draws no-solver next category", "standings", "rank"),
  ui(
    "matches.phase4",
    "eight authoritative no-solver rounds",
    "Final ranking",
    "toHaveCount(2)",
  ),
);
primaryBindings["AC-39-T01"].push(
  a(
    "catalog-seed",
    "applies the official full default Unicode",
    "UNICODE LICENSE V3",
    "createHash",
  ),
);
export const supplementalBindings: Record<string, AssertionBinding[]> = {
  "AC-01-T01": [admission],
  "AC-02-T01": [capacity],
  "AC-04-T01": [
    capacity,
    a("match", "rejects non-anchor choices", "chosen.rounds", "pairId"),
  ],
  "AC-06-T01": [
    boundary("independent unsolved answer cases", "solves.reduce", "h.answer"),
    primaryBindings["AC-06-T01"][0],
  ],
  "AC-09-T01": [
    ui(
      "matches.phase4",
      "actual players and bound observer",
      "visible hints",
      "Your score is locked",
      "Correct answer",
    ),
  ],
  "AC-16-T01": primaryBindings["AC-16-T01"],
  "AC-18-T02": [
    audit,
    appeal,
    a(
      "content-service",
      "commits audited suggestions once",
      "service.act",
      "audits",
    ),
  ],
  "AC-19-T01": primaryBindings["AC-19-T01"],
  "AC-20-T01": [identity],
  "AC-23-T01": primaryBindings["AC-23-T01"],
  "AC-24-T01": [
    ui(
      "recovery.phase6",
      "empty and lost-seat quick match",
      "1 / 8 players",
      "capacity).toBe(8)",
    ),
  ],
  "AC-25-T01": [
    admission,
    a("rooms", "rejects a full player join", "ROOM_FULL", "joined.value"),
  ],
  "AC-26-T01": primaryBindings["AC-26-T01"],
  "AC-28-T01": primaryBindings["AC-28-T01"],
  "AC-29-T01": primaryBindings["AC-29-T01"],
  "AC-32-T01": primaryBindings["AC-32-T01"],
  "AC-32-T02": primaryBindings["AC-32-T02"],
  "AC-33-T01": primaryBindings["AC-33-T01"],
  "AC-38-T01": primaryBindings["AC-38-T01"],
  "AC-39-T01": [
    b(
      "tests/ac-contracts/oracle-supplemental-validation.test.ts",
      "validates complete GPL",
      "validateReleaseNoticesZip",
    ),
  ],
  "AC-43-T01": primaryBindings["AC-43-T01"],
  "AC-43-T02": [pub, cache],
  "AC-44-T01": [phone, icon],
  "AC-45-T01": [
    boundary(
      "independent unsolved answer cases",
      "result.correct",
      "solves.reduce",
      "h.answer",
    ),
  ],
  "AC-47-T01": [audit],
  "AC-47-T02": primaryBindings["AC-47-T02"],
  "AC-47-T03": [audit, appeal],
};
