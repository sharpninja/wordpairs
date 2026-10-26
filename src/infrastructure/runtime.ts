import { IdentityService } from "../application/identity";
import { OutboxRelay } from "../application/outbox";
import { PublicLandingService } from "../application/public-service";
import { RoomService } from "../application/rooms";
import type { Profile } from "../domain/model";
import { PostgresIdentityRepository } from "./identity-repository";
import { InvitationSigner } from "./invitations";
import { OpenAiOidcProvider } from "./oidc";
import { PostgresOutbox } from "./outbox";
import { createSupabasePool } from "./postgres-pool";
import { PostgresPublicReadRepository } from "./public-read";
import { realtimeSettings, SupabaseRealtimePublisher } from "./realtime";
import { PostgresRoomRepository } from "./room-repository";
import { ids, random, secrets } from "./secrets";
import { SupabasePostgresStore } from "./supabase-postgres";

let publicService: PublicLandingService | undefined;
let database: ReturnType<typeof createSupabasePool> | undefined;
let identity: IdentityService | undefined;
export function getInvitationSigner() {
  const key = process.env.WORDPAIRS_INVITE_SECRET;
  try {
    return key ? new InvitationSigner(key) : null;
  } catch {
    return null;
  }
}
let relay: OutboxRelay | undefined;
let delivery: Promise<unknown> | null = null;
export function getRealtimeSettings() {
  const url = process.env.WORDPAIRS_SUPABASE_URL;
  const anonKey = process.env.WORDPAIRS_SUPABASE_ANON_KEY;
  const serviceKey = process.env.WORDPAIRS_SUPABASE_SERVICE_KEY;
  const jwtSecret = process.env.WORDPAIRS_SUPABASE_JWT_SECRET;
  if (!url || !anonKey || !serviceKey || !jwtSecret) return null;
  try {
    return realtimeSettings({ url, anonKey, serviceKey, jwtSecret });
  } catch {
    return null;
  }
}
export async function deliverOutbox() {
  if (delivery) return delivery;
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
    .drain(1)
    .catch(() => undefined)
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
  return Boolean(
    process.env.WORDPAIRS_OIDC_ISSUER &&
      process.env.WORDPAIRS_OIDC_CLIENT_ID &&
      process.env.WORDPAIRS_ORIGIN,
  );
}
export function getIdentityService() {
  if (identity) return identity;
  const pool = getDatabasePool();
  if (!pool) return null;
  let oidc: OpenAiOidcProvider | null = null;
  if (oidcAvailable()) {
    try {
      oidc = new OpenAiOidcProvider({
        issuer: process.env.WORDPAIRS_OIDC_ISSUER as string,
        clientId: process.env.WORDPAIRS_OIDC_CLIENT_ID as string,
        redirectUri: new URL("/api/auth/callback", process.env.WORDPAIRS_ORIGIN)
          .href,
        clientSecret: process.env.WORDPAIRS_OIDC_CLIENT_SECRET,
      });
    } catch {
      return null;
    }
  }
  identity = new IdentityService(
    new PostgresIdentityRepository(pool),
    secrets,
    ids,
    random,
    { now: () => Date.now() },
    oidc,
  );
  return identity;
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
