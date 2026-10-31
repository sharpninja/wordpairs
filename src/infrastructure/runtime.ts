import { AccessService } from "../application/access";
import { ContentService } from "../application/content";
import { IdentityService } from "../application/identity";
import { LobbyDispatcher, LobbyService } from "../application/lobby";
import { MatchService } from "../application/matches";
import { OutboxRelay } from "../application/outbox";
import { PublicLandingService } from "../application/public-service";
import { ReactionService } from "../application/reactions";
import { RoomService } from "../application/rooms";
import type { Profile } from "../domain/model";
import { success } from "../domain/result";
import { PostgresAccessRepository } from "./access-repository";
import { PostgresCatalogRepository } from "./catalog-repository";
import { PostgresContentRepository } from "./content-repository";
import { PostgresLobbyQueue } from "./deadlines";
import { GithubAdminProvider } from "./github-admin";
import { PostgresIdentityRepository } from "./identity-repository";
import { InvitationSigner } from "./invitations";
import { PostgresMatchRepository } from "./match-repository";
import { PostgresOutbox } from "./outbox";
import { createSupabasePool } from "./postgres-pool";
import { PostgresPublicReadRepository } from "./public-read";
import { PostgresReactionRepository } from "./reaction-repository";
import { realtimeSettings, SupabaseRealtimePublisher } from "./realtime";
import { PostgresRoomRepository } from "./room-repository";
import { ids, random, secrets } from "./secrets";
import { SupabasePostgresStore } from "./supabase-postgres";

let publicService: PublicLandingService | undefined;
let database: ReturnType<typeof createSupabasePool> | undefined;
let identity: IdentityService | undefined;
let adminIdentity: IdentityService | undefined;
/** Private server configuration; never copied into a client projection. */
export function configuredAdminProfileIds(): string[] {
  return [
    ...new Set(
      (process.env.WORDPAIRS_ADMIN_PROFILE_IDS ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter((id) => /^[A-Za-z0-9_-]{1,128}$/.test(id)),
    ),
  ];
}
export function getAccessService(adminProfileId?: string) {
  const pool = getDatabasePool();
  return pool
    ? new AccessService(
        new PostgresAccessRepository(
          pool,
          adminProfileId ? [adminProfileId] : [],
        ),
      )
    : null;
}
export function getContentService(adminProfileId?: string) {
  const pool = getDatabasePool();
  return pool
    ? new ContentService(
        new PostgresContentRepository(
          pool,
          () => Date.now(),
          adminProfileId ? [adminProfileId] : [],
        ),
        { now: () => Date.now() },
        ids,
      )
    : null;
}
export function getReactionService() {
  const pool = getDatabasePool();
  return pool
    ? new ReactionService(
        new PostgresReactionRepository(pool),
        { now: () => Date.now() },
        ids,
      )
    : null;
}
export function getInvitationSigner() {
  const key = process.env.WORDPAIRS_INVITE_SECRET;
  try {
    return key ? new InvitationSigner(key) : null;
  } catch {
    return null;
  }
}
let relay: OutboxRelay | undefined;
let delivery: ReturnType<OutboxRelay["drain"]> | null = null;
let dispatching: ReturnType<LobbyDispatcher["drain"]> | null = null;
export async function advanceLobbyDeadlines(waitForActive = false) {
  // Foreground reads and actions must not join a worker's potentially long
  // catch-up batch. The protected worker waits for the actual result instead.
  if (dispatching) return waitForActive ? dispatching : success(0);
  const pool = getDatabasePool();
  if (!pool) return null;
  const dispatcher = new LobbyDispatcher(
    new PostgresLobbyQueue(pool),
    new LobbyService(
      new PostgresRoomRepository(pool),
      { now: () => Date.now() },
      ids,
    ),
    { now: () => Date.now() },
    ids,
  );
  dispatching = (async () => {
    const lobby = await dispatcher.drain(25);
    if (!lobby.ok) return lobby;
    const matches = getMatchServices();
    if (!matches) return lobby;
    const starts = await matches.repository.starts(25);
    if (!starts.ok) return starts;
    for (const roomId of starts.value) {
      const started = await matches.service.open(roomId);
      if (
        !started.ok &&
        !["NOT_FOUND", "CONFLICT"].includes(started.error.code)
      )
        return started;
    }
    const stages = await new LobbyDispatcher(
      new PostgresLobbyQueue(pool, "match"),
      matches.service,
      { now: () => Date.now() },
      ids,
    ).drain(25);
    return stages.ok ? success(lobby.value + stages.value) : stages;
  })().finally(() => {
    dispatching = null;
  });
  return dispatching;
}
let catalog: PostgresCatalogRepository | undefined;
export function getMatchServices() {
  const pool = getDatabasePool();
  if (!pool) return null;
  catalog ??= new PostgresCatalogRepository(pool);
  const repository = new PostgresMatchRepository(pool, ids);
  return {
    repository,
    service: new MatchService(
      repository,
      catalog,
      { now: () => Date.now() },
      ids,
      random,
    ),
  };
}
export function getRealtimeSettings() {
  const url = process.env.WORDPAIRS_SUPABASE_URL;
  const anonKey = process.env.WORDPAIRS_SUPABASE_ANON_KEY;
  // Vercel's managed Supabase integration installs write-only secret variables.
  // Read those names server-side; explicit local/runtime settings take precedence.
  const serviceKey =
    process.env.WORDPAIRS_SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret =
    process.env.WORDPAIRS_SUPABASE_JWT_SECRET ??
    process.env.SUPABASE_JWT_SECRET;
  if (!url || !anonKey || !serviceKey || !jwtSecret) return null;
  try {
    return realtimeSettings({ url, anonKey, serviceKey, jwtSecret });
  } catch {
    return null;
  }
}
export async function deliverOutbox(limit = 1) {
  // A foreground request must not inherit a worker's 25-publication latency.
  // The active relay owns publication; the next worker tick catches later events.
  if (delivery) return limit === 1 ? success(0) : delivery;
  if (!relay) {
    const settings = getRealtimeSettings();
    const pool = getDatabasePool();
    if (!settings || !pool) return;
    relay = new OutboxRelay(
      new PostgresOutbox(pool),
      new SupabaseRealtimePublisher(settings),
      () => Date.now(),
    );
  }
  delivery = relay
    .drain(Math.max(1, Math.min(25, Math.trunc(limit))))
    .catch(() => ({
      ok: false as const,
      error: { code: "TEMPORARY_UNAVAILABLE" as const },
    }))
    .finally(() => {
      delivery = null;
    });
  return delivery;
}
export function getDatabasePool() {
  if (database) return database;
  if (!process.env.WORDPAIRS_DATABASE_URL) return null;
  try {
    database = createSupabasePool(
      process.env.WORDPAIRS_DATABASE_URL,
      process.env.WORDPAIRS_DATABASE_CA,
    );
    return database;
  } catch {
    return null;
  }
}
export function oidcAvailable() {
  return false;
}
export function getIdentityService() {
  if (identity) return identity;
  const pool = getDatabasePool();
  if (!pool) return null;
  identity = new IdentityService(
    new PostgresIdentityRepository(pool),
    secrets,
    ids,
    random,
    { now: () => Date.now() },
    null,
    [],
    true,
  );
  return identity;
}
export function githubAdminAvailable() {
  return Boolean(
    process.env.WORDPAIRS_GITHUB_CLIENT_ID &&
      process.env.WORDPAIRS_GITHUB_CLIENT_SECRET &&
      process.env.WORDPAIRS_ORIGIN,
  );
}
export function getAdminIdentityService() {
  if (adminIdentity) return adminIdentity;
  const pool = getDatabasePool();
  if (!pool || !githubAdminAvailable()) return null;
  try {
    const provider = new GithubAdminProvider({
      clientId: process.env.WORDPAIRS_GITHUB_CLIENT_ID as string,
      clientSecret: process.env.WORDPAIRS_GITHUB_CLIENT_SECRET as string,
      redirectUri: new URL(
        "/api/auth/github/callback",
        process.env.WORDPAIRS_ORIGIN,
      ).href,
    });
    // A guest/OpenAI token cannot resolve as an administrator, even if copied
    // into the admin cookie. Only the verified GitHub flow issues this namespace.
    adminIdentity = new IdentityService(
      new PostgresIdentityRepository(pool),
      {
        token: secrets.token,
        hash: (value) => secrets.hash(`github-admin\u0000${value}`),
      },
      ids,
      random,
      { now: () => Date.now() },
      provider,
    );
    return adminIdentity;
  } catch {
    return null;
  }
}
export function getProfileStore() {
  const pool = getDatabasePool();
  return pool ? new SupabasePostgresStore<Profile>(pool, "profile") : null;
}
export function getRoomServices() {
  const pool = getDatabasePool();
  if (!pool) return null;
  const repository = new PostgresRoomRepository(pool);
  return {
    repository,
    lobby: new LobbyService(
      repository,
      { now: () => Date.now() },
      ids,
      repository.presenceStore,
    ),
    service: new RoomService(
      repository,
      { now: () => Date.now() },
      ids,
      random,
    ),
  };
}
/** Environment values stay in the server composition root and never enter a public DTO. */
export function getPublicService(): PublicLandingService | null {
  if (publicService) return publicService;
  const pool = getDatabasePool();
  if (!pool) return null;
  try {
    publicService = new PublicLandingService(
      new PostgresPublicReadRepository(pool),
      { now: () => Date.now() },
    );
    return publicService;
  } catch {
    return null;
  }
}
