import type {
  ContentAction,
  ContentContext,
  ContentPort,
} from "../application/content";
import type { Command, Transition } from "../application/ports";
import { configuredAdministrator } from "../domain/access";
import { buildCatalog } from "../domain/catalog";
import { CONTENT_ID, type ContentState } from "../domain/content";
import { lobbyOverdue } from "../domain/lobby";
import type { Category, Match, Pair, Room } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import {
  type SqlConnection,
  type SqlPool,
  SupabasePostgresStore,
} from "./supabase-postgres";

const initial = [
  "heroes",
  "colors",
  "years",
  "directors",
  "singers",
  "opposites",
];
async function context(
  connection: SqlConnection,
  actorId: string,
  administrators: readonly string[],
): Promise<Result<ContentContext>> {
  const query = await connection.query(
    "select public.wordpairs_content_context($1) as response",
    [actorId],
  );
  const raw = query.rows[0]?.response as
    | (Omit<ContentContext, "catalog"> & {
        catalog: Result<{
          categories: Category[];
          pairs: Pair[];
          revision: number;
        }>;
      })
    | undefined;
  if (!raw) return failure("NOT_AUTHENTICATED");
  if (!raw.catalog.ok) return raw.catalog;
  const catalog = buildCatalog(
    raw.catalog.value.categories,
    raw.catalog.value.pairs,
    initial,
  );
  return catalog.ok
    ? success({
        ...raw,
        actor: configuredAdministrator(raw.actor, administrators),
        catalog: { ...catalog.value, revision: raw.catalog.value.revision },
      })
    : catalog;
}
export class PostgresContentRepository implements ContentPort {
  constructor(
    private pool: SqlPool,
    private now = () => Date.now(),
    private administrators: readonly string[] = [],
  ) {}
  async read(
    actorId: string,
  ): Promise<Result<{ state: ContentState; evidence: ContentContext }>> {
    let connection: SqlConnection | undefined;
    try {
      connection = await this.pool.connect();
      await connection.query("begin");
      await connection.query(
        "select pg_advisory_xact_lock_shared(hashtextextended('wordpairs-acl',0))",
      );
      const loaded = await connection.query(
        "select state from wordpairs.aggregates where kind='moderation' and id=$1",
        [CONTENT_ID],
      );
      const state = loaded.rows[0]?.state as ContentState | undefined;
      const evidence = await context(connection, actorId, this.administrators);
      await connection.query("commit");
      return !state
        ? failure("NOT_FOUND")
        : evidence.ok
          ? success({ state, evidence: evidence.value })
          : evidence;
    } catch {
      return failure("TEMPORARY_UNAVAILABLE");
    } finally {
      if (connection) {
        try {
          await connection.query("rollback");
        } catch {}
        connection.release();
      }
    }
  }
  transact<T>(
    command: Command,
    action: ContentAction,
    decide: (
      state: ContentState,
      evidence: ContentContext,
    ) => Promise<Result<Transition<ContentState, T>>>,
  ) {
    let connection: SqlConnection | undefined;
    let room: Room | undefined;
    let match: Match | undefined;
    const store = new SupabasePostgresStore<ContentState>(
      this.pool,
      "moderation",
      async (client, input) => {
        connection = client;
        await client.query(
          "select pg_advisory_xact_lock_shared(hashtextextended('wordpairs-acl',0))",
        );
        if (input.aggregateId !== CONTENT_ID)
          return failure("VALIDATION_ERROR");
        const prior = await client.query(
          "select public.wordpairs_snapshot('moderation',$1,$2,$3,$4,$5) as response",
          [
            CONTENT_ID,
            input.actorId,
            input.commandId,
            input.requestDigest,
            input.expectedVersion,
          ],
        );
        const response = prior.rows[0]?.response as
          | { status: string; code?: string }
          | undefined;
        if (response?.status === "replayed") return success(input);
        if (response?.code === "IDEMPOTENCY_CONFLICT")
          return failure("IDEMPOTENCY_CONFLICT");
        if (action.type === "nominate") {
          const loaded = await client.query(
            "select state from wordpairs.aggregates where kind='room' and id=$1 for update",
            [action.roomId],
          );
          room = loaded.rows[0]?.state as Room | undefined;
          if (!room) return failure("NOT_FOUND");
          if (lobbyOverdue(room, this.now())) return failure("CONFLICT");
          const game = await client.query(
            "select state from wordpairs.aggregates where kind='match' and id=$1 for update",
            [action.roomId],
          );
          match = game.rows[0]?.state as Match | undefined;
          if (!match) return failure("NOT_FOUND");
        }
        return success(input);
      },
    );
    return store.transact(command, async (state) => {
      if (!connection) return failure("INTERNAL_ERROR");
      const evidence = await context(
        connection,
        command.actorId,
        this.administrators,
      );
      return evidence.ok
        ? decide(state, { ...evidence.value, room, match })
        : evidence;
    });
  }
}
