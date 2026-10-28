import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { AccessService, type RoleChange } from "../../src/application/access";
import {
  type ContentAction,
  ContentService,
} from "../../src/application/content";
import { IdentityService } from "../../src/application/identity";
import { categoryPool, roundPair } from "../../src/domain/catalog";
import { CONTENT_ID, emptyContent } from "../../src/domain/content";
import type { Pair } from "../../src/domain/model";
import { failure, type Result } from "../../src/domain/result";
import { PostgresAccessRepository } from "../../src/infrastructure/access-repository";
import { PostgresCatalogRepository } from "../../src/infrastructure/catalog-repository";
import { PostgresContentRepository } from "../../src/infrastructure/content-repository";
import { PostgresIdentityRepository } from "../../src/infrastructure/identity-repository";
import { secrets } from "../../src/infrastructure/secrets";

const url = process.env.WORDPAIRS_TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1")
  throw new Error("Disposable database required");
const admin = new Pool({ connectionString: url, ssl: false });
const pool = new Pool({
  connectionString: url,
  ssl: false,
  options: "-c role=service_role",
  max: 5,
});
const ids = { next: () => `admin-${randomUUID()}` };
const fixtureNow = Date.now();
const clock = { now: () => fixtureNow };
const identity = new IdentityService(
  new PostgresIdentityRepository(pool),
  secrets,
  ids,
  { integer: (min) => min },
  clock,
  null,
);
const people: string[] = [];
const tokens: string[] = [];
let runtimePool: Pool | null = null;
// Only the TLS connection factory is replaced for the disposable plaintext
// database. The route, composition, identity, authorization and SQL are real.
vi.mock("../../src/infrastructure/postgres-pool", async () => {
  const { Pool: TestPool } = await import("pg");
  return {
    createSupabasePool: (connectionString: string) =>
      new TestPool({
        connectionString,
        ssl: false,
        options: "-c role=service_role",
        max: 3,
      }),
  };
});
const value = <T>(r: Result<T>) => {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.value;
};
let root: string;
let moderator: string;
let player: string;
let a: string;
let b: string;
let access: AccessService;
let content: ContentService;
let contentRepository: PostgresContentRepository;
const catalog = new PostgresCatalogRepository(pool);
const roleCommand = async (
  actorId: string,
  input: RoleChange,
  service = access,
) => ({
  aggregateId: "access-control",
  actorId,
  commandId: ids.next(),
  requestDigest: secrets.hash(JSON.stringify(input)),
  expectedVersion: value(await service.view(actorId)).version,
});
const role = async (
  profileId: string,
  managedRole: RoleChange["role"],
  grant = true,
) => {
  const input = {
    profileId,
    role: managedRole,
    grant,
    reason: "Integration role change",
  };
  return access.act(await roleCommand(root, input), input);
};
async function editorial(actorId: string, action: ContentAction) {
  return content.act(
    {
      aggregateId: CONTENT_ID,
      actorId,
      commandId: ids.next(),
      requestDigest: secrets.hash(JSON.stringify(action)),
      expectedVersion: value(await contentRepository.read(root)).state.version,
    },
    action,
  );
}
beforeAll(async () => {
  for (let n = 0; n < 5; n++) {
    const guest = value(await identity.guest(null));
    people.push(guest.profile.id);
    tokens.push(guest.sessionToken);
  }
  [root, moderator, player, a, b] = people;
  access = new AccessService(new PostgresAccessRepository(pool, [root]));
  contentRepository = new PostgresContentRepository(pool, clock.now, [root]);
  content = new ContentService(contentRepository, clock, ids);
});
afterAll(async () => {
  try {
    await admin.query(
      "delete from wordpairs.audit_events where target_id='content-catalog';delete from wordpairs.idempotency_records where aggregate_id='content-catalog';delete from wordpairs.outbox_events where aggregate_id='content-catalog'",
    );
    await admin.query(
      "update wordpairs.aggregates set version=0,state=$1::jsonb where kind='moderation' and id='content-catalog'",
      [JSON.stringify(emptyContent())],
    );
    await admin.query(
      "begin;alter table wordpairs.word_pairs disable trigger immutable_pair;alter table wordpairs.accepted_answers disable trigger immutable_accepted_answer;delete from wordpairs.catalog_exclusions where pair_id='opposites-01' and pair_version>0;delete from wordpairs.accepted_answers where (pair_id='opposites-01' and pair_version>0) or pair_id like 'admin-http-%';delete from wordpairs.word_pairs where (id='opposites-01' and version>0) or id like 'admin-http-%';alter table wordpairs.word_pairs enable trigger immutable_pair;alter table wordpairs.accepted_answers enable trigger immutable_accepted_answer;commit;update wordpairs.catalog_revision set revision=revision+1",
    );
    await admin.query(
      "delete from wordpairs.access_commands where actor_id=any($1::text[])",
      [people],
    );
    await admin.query(
      "delete from wordpairs.access_audit where actor_id=any($1::text[]) or profile_id=any($1::text[])",
      [people],
    );
    for (const table of ["profile_roles", "sessions", "guest_credentials"])
      await admin.query(
        `delete from wordpairs.${table} where profile_id=any($1::text[])`,
        [people],
      );
    await admin.query(
      "delete from wordpairs.nominations where candidate_id in(select id from wordpairs.moderation_cases where proposer_id=any($1::text[]))",
      [people],
    );
    await admin.query(
      "delete from wordpairs.moderation_cases where proposer_id=any($1::text[])",
      [people],
    );
    await admin.query(
      "delete from wordpairs.outbox_events where aggregate_kind='profile' and aggregate_id=any($1::text[])",
      [people],
    );
    await admin.query(
      "delete from wordpairs.aggregates where kind='profile' and id=any($1::text[])",
      [people],
    );
    await admin.query(
      "delete from wordpairs.profiles where id=any($1::text[])",
      [people],
    );
  } finally {
    await Promise.all([pool.end(), admin.end(), runtimePool?.end()]);
    vi.unstubAllEnvs();
  }
});
it("configured root grants and revokes roles with canonical retries, fresh directory authorization, bounded private projections and protected configuration", async () => {
  expect(await access.view(player)).toEqual(failure("NOT_AUTHORIZED"));
  const input: RoleChange = {
    profileId: moderator,
    role: "moderator",
    grant: true,
    reason: "Trusted reviewer",
  };
  const command = await roleCommand(root, input);
  const result = await access.act(command, input);
  expect(result.ok).toBe(true);
  expect(await access.act(command, input)).toEqual(result);
  expect(
    await access.act(
      { ...command, requestDigest: secrets.hash("changed") },
      input,
    ),
  ).toEqual(failure("IDEMPOTENCY_CONFLICT"));
  expect(await access.view(moderator)).toEqual(failure("NOT_AUTHORIZED"));
  value(await role(moderator, "moderator", false));
  expect(await access.act(command, input)).toEqual(result);
  expect(
    (
      await admin.query(
        "select * from wordpairs.profile_roles where profile_id=$1",
        [moderator],
      )
    ).rows,
  ).toEqual([]);
  expect(await role(root, "admin", false)).toEqual(failure("CONFLICT"));
  const view = value(await access.view(root, player));
  expect(view.users.map((p) => p.id)).toEqual([player]);
  expect(JSON.stringify(view)).not.toMatch(
    /sessionToken|providerSubject|credential_hash/,
  );
  expect(
    view.audit.filter((item) => item.profileId === moderator),
  ).toHaveLength(2);
  value(await role(moderator, "moderator"));
});
it("concurrent administrators cannot cross-revoke every administrator or replay grants after losing authority", async () => {
  value(await role(a, "admin"));
  value(await role(b, "admin"));
  const persisted = new AccessService(new PostgresAccessRepository(pool, []));
  const version = value(await persisted.view(a)).version;
  const changes = [
    { actor: a, profile: b },
    { actor: b, profile: a },
  ].map(({ actor, profile }) => {
    const input: RoleChange = {
      profileId: profile,
      role: "admin",
      grant: false,
      reason: "Concurrent revocation",
    };
    return {
      input,
      command: {
        aggregateId: "access-control",
        actorId: actor,
        commandId: ids.next(),
        requestDigest: secrets.hash(JSON.stringify(input)),
        expectedVersion: version,
      },
    };
  });
  const results = await Promise.all(
    changes.map((c) => persisted.act(c.command, c.input)),
  );
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  const removed = results[0].ok ? b : a;
  const remaining = removed === a ? b : a;
  expect(await persisted.view(removed)).toEqual(failure("NOT_AUTHORIZED"));
  const last: RoleChange = {
    profileId: remaining,
    role: "admin",
    grant: false,
    reason: "Cannot remove last admin",
  };
  expect(
    await persisted.act(await roleCommand(remaining, last, persisted), last),
  ).toEqual(failure("CONFLICT"));
  expect(
    (
      await admin.query(
        "select count(*)::int as count from wordpairs.profile_roles where role='admin'",
      )
    ).rows[0].count,
  ).toBe(1);
  const denied = changes.find((c) => c.command.actorId === removed);
  if (!denied) throw new Error("Missing actor");
  expect(await persisted.act(denied.command, denied.input)).toEqual(
    failure("NOT_AUTHORIZED"),
  );
  value(await role(remaining, "admin", false));
});
it("role and canonical records roll back together when the audit insert fails", async () => {
  await admin.query(
    "create function wordpairs.admin_test_fault() returns trigger language plpgsql as $$begin if new.reason='rollback-test' then raise exception 'injected test fault';end if;return new;end$$;create trigger admin_test_fault before insert on wordpairs.access_audit for each row execute function wordpairs.admin_test_fault()",
  );
  const input: RoleChange = {
    profileId: player,
    role: "admin",
    grant: true,
    reason: "rollback-test",
  };
  const command = await roleCommand(root, input);
  try {
    expect(await access.act(command, input)).toEqual(
      failure("TEMPORARY_UNAVAILABLE"),
    );
    expect(value(await access.view(root)).version).toBe(
      command.expectedVersion,
    );
    expect(
      (
        await admin.query(
          "select * from wordpairs.profile_roles where profile_id=$1",
          [player],
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await admin.query(
          "select * from wordpairs.access_commands where command_id=$1",
          [command.commandId],
        )
      ).rows,
    ).toEqual([]);
  } finally {
    await admin.query(
      "drop trigger admin_test_fault on wordpairs.access_audit;drop function wordpairs.admin_test_fault()",
    );
  }
});
it("browser database roles cannot read ACL tables or invoke privileged functions", async () => {
  for (const name of ["anon", "authenticated"]) {
    const client = await admin.connect();
    try {
      await client.query(`set role ${name}`);
      await expect(
        client.query("select * from wordpairs.access_audit"),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        client.query("select public.wordpairs_access_read($1,$2::text[],'')", [
          root,
          [root],
        ]),
      ).rejects.toMatchObject({ code: "42501" });
    } finally {
      await client.query("reset role");
      client.release();
    }
  }
});
it("editorial revisions preserve exact historical records, never resurrect excluded older versions, and reject unauthorized/stale saves", async () => {
  const original = value(await catalog.pair("opposites-01", 0));
  const revised: Pair = {
    ...original,
    selectable: undefined,
    version: 1,
    target: "Revised answer",
    hints: ["First revised clue", "Second revised clue", "Third revised clue"],
  };
  const action: ContentAction = {
    type: "save-pair",
    pair: revised,
    reason: "Clarify editorial clues",
  };
  expect(await editorial(player, action)).toEqual(failure("NOT_AUTHORIZED"));
  value(await editorial(moderator, action));
  expect(value(await catalog.pair(original.id, 0))).toEqual(original);
  let fresh = value(await catalog.read());
  expect(
    categoryPool(fresh, original.categoryId).find((p) => p.id === original.id)
      ?.version,
  ).toBe(1);
  expect(roundPair(fresh, original.id, 0)?.target).toBe(original.target);
  expect(await editorial(moderator, action)).toEqual(failure("CONFLICT"));
  value(
    await editorial(root, {
      type: "disable",
      pairId: original.id,
      pairVersion: 1,
      reason: "Exclude revised content",
    }),
  );
  fresh = value(await catalog.read());
  expect(
    categoryPool(fresh, original.categoryId).some((p) => p.id === original.id),
  ).toBe(false);
  value(await editorial(root, { ...action, pair: { ...revised, version: 2 } }));
  fresh = value(await catalog.read());
  expect(
    categoryPool(fresh, original.categoryId).find((p) => p.id === original.id)
      ?.version,
  ).toBe(2);
  expect(roundPair(fresh, original.id, 0)?.hints).toEqual(original.hints);
});
it("a content writer waiting behind revocation reloads roles after the shared ACL lock", async () => {
  const contentVersion = value(await contentRepository.read(root)).state
    .version;
  const client = await admin.connect();
  let pending: Promise<unknown> | undefined;
  try {
    await client.query("begin");
    const input: RoleChange = {
      profileId: moderator,
      role: "moderator",
      grant: false,
      reason: "Revoke before queued write",
    };
    const command = await roleCommand(root, input);
    value(
      (
        await client.query(
          "select public.wordpairs_access_change($1,$2,$3,$4,$5,$6,$7,$8,$9) as response",
          [
            root,
            [root],
            command.commandId,
            command.requestDigest,
            command.expectedVersion,
            input.profileId,
            input.role,
            input.grant,
            input.reason,
          ],
        )
      ).rows[0].response,
    );
    const original = value(await catalog.pair("opposites-01", 0));
    const action: ContentAction = {
      type: "save-pair",
      pair: { ...original, version: 3 },
      reason: "Queued revoked write",
    };
    pending = content.act(
      {
        aggregateId: CONTENT_ID,
        actorId: moderator,
        commandId: ids.next(),
        requestDigest: secrets.hash(JSON.stringify(action)),
        expectedVersion: contentVersion,
      },
      action,
    );
    let waiting = false;
    for (let step = 0; step < 100; step++) {
      if (
        (
          await admin.query(
            "select count(*)::int as count from pg_stat_activity where datname=current_database() and wait_event='advisory'",
          )
        ).rows[0].count > 0
      ) {
        waiting = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(waiting).toBe(true);
    await client.query("commit");
    expect(await pending).toEqual(failure("NOT_AUTHORIZED"));
  } finally {
    await client.query("rollback");
    client.release();
    if (pending) await pending;
  }
});
it("4096 to 4097 historical versions rejects atomically and keeps existing catalog lookups available", async () => {
  const current = value(await catalog.read());
  const extra = 4096 - current.pairs.length;
  await admin.query(
    "insert into wordpairs.word_pairs(id,category_id,prompt,target,hints,approved,version) select 'admin-limit-'||n,'opposites','Limit prompt','Limit answer',array['one','two','three'],true,0 from generate_series(1,$1::integer) n",
    [extra],
  );
  await admin.query(
    "update wordpairs.catalog_revision set revision=revision+1",
  );
  try {
    const before = value(await contentRepository.read(root));
    const revision = value(await catalog.read()).revision;
    const counts = (
      await admin.query(
        "select (select count(*) from wordpairs.audit_events) as audits,(select count(*) from wordpairs.idempotency_records) as commands",
      )
    ).rows;
    const original = value(await catalog.pair("opposites-01", 0));
    expect(
      await editorial(root, {
        type: "save-pair",
        pair: { ...original, version: 3 },
        reason: "Must not overflow",
      }),
    ).toEqual(failure("SERVICE_LIMIT"));
    expect(value(await contentRepository.read(root)).state).toEqual(
      before.state,
    );
    expect(value(await catalog.read()).revision).toBe(revision);
    expect(value(await catalog.pair(original.id, 0)).target).toBe(
      original.target,
    );
    expect(
      (
        await admin.query(
          "select (select count(*) from wordpairs.audit_events) as audits,(select count(*) from wordpairs.idempotency_records) as commands",
        )
      ).rows,
    ).toEqual(counts);
  } finally {
    await admin.query(
      "begin;alter table wordpairs.word_pairs disable trigger immutable_pair;delete from wordpairs.word_pairs where id like 'admin-limit-%';alter table wordpairs.word_pairs enable trigger immutable_pair;commit;update wordpairs.catalog_revision set revision=revision+1",
    );
  }
});
it("real request handlers compose server-configured bootstrap, authenticated ACL grants, editorial saves and fresh revocation against PostgreSQL", async () => {
  vi.stubEnv("WORDPAIRS_DATABASE_URL", url);
  vi.stubEnv("WORDPAIRS_ADMIN_PROFILE_IDS", root);
  vi.stubEnv("WORDPAIRS_ORIGIN", "https://admin-fixture.test");
  vi.stubEnv("WORDPAIRS_OIDC_ISSUER", "");
  const runtime = await import("../../src/infrastructure/runtime");
  runtimePool = runtime.getDatabasePool();
  const users = await import("../../src/app/api/admin/users/route");
  const contents = await import("../../src/app/api/content/route");
  const request = (path: string, actor = 0, body?: unknown) =>
    new Request(`https://admin-fixture.test${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Cookie: `wp_session=${tokens[actor]}`,
        Origin: "https://admin-fixture.test",
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const directory = await users.GET(request("/api/admin/users"));
  expect(directory.status).toBe(200);
  const view = await directory.json();
  expect(
    view.users.find((p: { id: string }) => p.id === root).configuredAdmin,
  ).toBe(true);
  const grant = {
    profileId: player,
    role: "moderator",
    grant: true,
    reason: "HTTP reviewer",
    expectedProfileId: root,
    expectedVersion: view.version,
    commandId: ids.next(),
  };
  expect((await users.POST(request("/api/admin/users", 0, grant))).status).toBe(
    200,
  );
  expect((await users.POST(request("/api/admin/users", 0, grant))).status).toBe(
    200,
  );
  expect((await users.GET(request("/api/admin/users", 2))).status).toBe(403);
  const editor = await contents.GET(request("/api/content", 2));
  const editable = await editor.json();
  expect(editable.canModerate).toBe(true);
  const original = value(await catalog.pair("opposites-01", 0));
  const pair = {
    ...original,
    id: `admin-http-${randomUUID()}`,
    selectable: undefined,
    version: 0,
    prompt: "HTTP authored pair",
    hints: ["First HTTP clue", "Second HTTP clue", "Third HTTP clue"],
  };
  const save = {
    action: "save-pair",
    pair,
    reason: "Verify real server composition",
    expectedProfileId: player,
    expectedVersion: editable.version,
    commandId: ids.next(),
  };
  expect((await contents.POST(request("/api/content", 2, save))).status).toBe(
    200,
  );
  expect(value(await catalog.pair(pair.id, 0)).hints).toEqual(pair.hints);
  const current = await (await users.GET(request("/api/admin/users"))).json();
  expect(
    (
      await users.POST(
        request("/api/admin/users", 0, {
          ...grant,
          grant: false,
          expectedVersion: current.version,
          commandId: ids.next(),
        }),
      )
    ).status,
  ).toBe(200);
  const revoked = await (await contents.GET(request("/api/content", 2))).json();
  expect(revoked.canModerate).toBe(false);
  expect(revoked.catalogPairs).toEqual([]);
  expect(
    (
      await contents.POST(
        request("/api/content", 2, {
          ...save,
          pair: { ...pair, version: 1 },
          expectedVersion: revoked.version,
          commandId: ids.next(),
        }),
      )
    ).status,
  ).toBe(403);
});
it("UI review status migration, one-open SQL uniqueness, atomic revision audits and canonical retries", async () => {
  await admin.query("update wordpairs.profiles set wins=10 where id=$1", [a]);
  const proposal = {
    category: "UI Space",
    pairs: [
      { prompt: "Earth", target: "Moon" },
      { prompt: "Sun", target: "Star" },
      { prompt: "Mars", target: "Planet" },
    ],
  };
  const created = value(await editorial(a, { type: "suggest", proposal }));
  const caseId = created.caseId;
  if (!caseId) throw new Error("Missing case");
  value(
    await editorial(root, {
      type: "request-changes",
      caseId,
      reason: "Clarify proposal",
    }),
  );
  const projection = await admin.query(
    "select status,version,playable from wordpairs.moderation_cases where id=$1",
    [caseId],
  );
  expect(projection.rows).toEqual([
    { status: "changes_requested", version: 1, playable: false },
  ]);
  await expect(
    admin.query(
      "insert into wordpairs.moderation_cases(id,proposer_id,kind,payload,status) values($1,$2,'suggestion','{}','pending_review')",
      [ids.next(), a],
    ),
  ).rejects.toMatchObject({ code: "23505" });
  const before = value(await contentRepository.read(root)).state;
  expect(await editorial(b, { type: "resubmit", caseId, proposal })).toEqual(
    failure("NOT_AUTHORIZED"),
  );
  expect(value(await contentRepository.read(root)).state).toEqual(before);
  const action: ContentAction = {
    type: "resubmit",
    caseId,
    proposal: { ...proposal, category: "UI Space revised" },
  };
  const command = {
    aggregateId: CONTENT_ID,
    actorId: a,
    commandId: ids.next(),
    requestDigest: secrets.hash(JSON.stringify(action)),
    expectedVersion: before.version,
  };
  const accepted = await content.act(command, action);
  expect(accepted.ok).toBe(true);
  expect(await content.act(command, action)).toEqual(accepted);
  expect(
    await content.act({ ...command, requestDigest: "changed" }, action),
  ).toEqual(failure("IDEMPOTENCY_CONFLICT"));
  const audits = await admin.query(
    "select details from wordpairs.audit_events where target_id='content-catalog' and details->>'caseId'=$1 and action='resubmit'",
    [caseId],
  );
  expect(audits.rows).toHaveLength(1);
  expect(audits.rows[0].details).toMatchObject({
    caseVersion: 2,
    previousStatus: "changes_requested",
    status: "pending_review",
    previousProposal: { category: "UI Space" },
    proposal: { category: "UI Space revised" },
  });
  const state = value(await contentRepository.read(root)).state;
  const source = state.cases.find((c) => c.id === caseId)!;
  const candidateId = ids.next();
  // Isolated preexisting ten-nomination fixture; command/repository/projection SQL are real.
  const candidate = {
    ...source,
    id: candidateId,
    version: 0,
    kind: "nomination" as const,
    status: "pending" as const,
    payload: { word: "Orbit" },
    normalizedWord: "orbit",
    nominatorIds: Array.from({ length: 10 }, (_, n) => `fixture-voter-${n}`),
  };
  await admin.query(
    "update wordpairs.aggregates set version=$1,state=$2::jsonb where kind='moderation' and id='content-catalog'",
    [
      state.version + 1,
      JSON.stringify({
        ...state,
        version: state.version + 1,
        cases: [...state.cases, candidate],
      }),
    ],
  );
  value(
    await editorial(root, {
      type: "hold",
      caseId: candidateId,
      reason: "Verify candidate",
    }),
  );
  expect(
    await editorial(root, {
      type: "review",
      caseId: candidateId,
      decision: "approve",
      reason: "Premature",
    }),
  ).toEqual(failure("CONFLICT"));
  const held = await admin.query(
    "select status,nomination_count,playable,future_eligible from wordpairs.moderation_cases where id=$1",
    [candidateId],
  );
  expect(held.rows).toEqual([
    {
      status: "on_hold",
      nomination_count: 10,
      playable: false,
      future_eligible: false,
    },
  ]);
  value(
    await editorial(root, {
      type: "resume",
      caseId: candidateId,
      reason: "Candidate checked",
    }),
  );
  expect(
    (
      await admin.query(
        "select status,nomination_count from wordpairs.moderation_cases where id=$1",
        [candidateId],
      )
    ).rows,
  ).toEqual([{ status: "pending_review", nomination_count: 10 }]);
});
