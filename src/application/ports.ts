import type {
  Actor,
  Category,
  Deadline,
  DomainEvent,
  Json,
  Match,
  ModerationCase,
  Pair,
  Profile,
  Room,
  Versioned,
} from "../domain/model";
import type { Result } from "../domain/result";

/** Metadata is constructed by the trusted server transport, never from an actor field in JSON. */
export interface Command {
  aggregateId: string;
  actorId: string;
  commandId: string;
  requestDigest: string;
  expectedVersion: number;
}

export interface Transition<S, T> {
  state: S;
  result: T;
  events: DomainEvent[];
  deadlines: Deadline[];
  audits: AuditRecord[];
}

/**
 * Adapters must serialize per aggregate. Idempotency is scoped to aggregate + actor + command.
 * Before calling decide: replay an identical committed result, reject changed digest, then
 * check expectedVersion. Atomically persist state, result, events and deadlines, or none.
 * Never retry decide automatically after a concurrency conflict.
 */
export interface TransactionStore<S extends Versioned> {
  transact<T>(
    command: Command,
    decide: (state: S) => Promise<Result<Transition<S, T>>>,
  ): Promise<Result<Transition<S, T>>>;
}

export interface Clock {
  now(): number;
}
export interface RandomSource {
  integer(minInclusive: number, maxInclusive: number): number;
}
export interface IdSource {
  next(): string;
}
export interface QuotaStatus {
  check(): Promise<Result<undefined>>;
}
export interface DeadlineScheduler {
  schedule(deadline: Deadline): Promise<Result<string>>;
  cancel(jobId: string): Promise<Result<undefined>>;
  due(now: number, limit: number): Promise<Result<Deadline[]>>;
}
export interface EventOutbox {
  pending(limit: number): Promise<Result<DomainEvent[]>>;
  markPublished(
    eventId: string,
    publishedAt: number,
  ): Promise<Result<undefined>>;
}
export interface RealtimePublisher {
  publish(event: DomainEvent): Promise<Result<undefined>>;
}
export interface Repository<T extends Versioned> {
  get(id: string): Promise<Result<T>>;
}
export interface RoomRepository
  extends Repository<Room>,
    TransactionStore<Room> {
  create(
    command: Command,
    room: Room,
    events: DomainEvent[],
    deadlines: Deadline[],
  ): Promise<Result<Room>>;
  findByCode(code: string): Promise<Result<Room>>;
  discover(limit: number, after?: string): Promise<Result<Room[]>>;
}
export interface MatchRepository
  extends Repository<Match>,
    TransactionStore<Match> {}
export interface ProfileRepository
  extends Repository<Profile>,
    TransactionStore<Profile> {
  findBySubject(issuer: string, subject: string): Promise<Result<Profile>>;
  establish(profile: Profile): Promise<Result<Profile>>;
  leaderboard(limit: number, after?: string): Promise<Result<Profile[]>>;
}
export interface ContentRepository {
  categories(): Promise<Result<Category[]>>;
  pairs(categoryId: string): Promise<Result<Pair[]>>;
  pair(id: string, version: number): Promise<Result<Pair>>;
}
export interface ModerationRepository
  extends Repository<ModerationCase>,
    TransactionStore<ModerationCase> {}

/** A verifier returns only server-validated identity, never client claims or access tokens. */
export interface IdentityVerifier {
  verify(callback: {
    code: string;
    state: string;
    expectedState: string;
    nonce: string;
    pkceVerifier: string;
  }): Promise<Result<{ issuer: string; subject: string }>>;
}
export interface SessionStore {
  resolve(token: string): Promise<Result<Actor>>;
  issue(
    profileId: string,
  ): Promise<Result<{ token: string; expiresAt: number }>>;
}
export interface AuditRecord {
  id: string;
  actorId: string;
  targetId: string;
  action: string;
  at: number;
  details: { [key: string]: Json };
}
