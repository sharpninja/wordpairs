import type { MatchDirectory } from "../application/matches";
import type {
  Clock,
  Command,
  IdSource,
  Transition,
} from "../application/ports";
import { lobbyOverdue } from "../domain/lobby";
import type { Match, Room } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import {
  type SqlConnection,
  type SqlPool,
  SupabasePostgresStore,
} from "./supabase-postgres";

function recipients(room: Room) {
  return [
    ...new Set([...room.players, ...room.observers].map((p) => p.profileId)),
  ];
}
export class PostgresMatchRepository
  extends SupabasePostgresStore<Match>
  implements MatchDirectory
{
  constructor(
    private matchPool: SqlPool,
    private ids: IdSource,
    private clock: Clock = { now: () => Date.now() },
  ) {
    super(matchPool, "match");
  }
  override transact<T>(
    command: Command,
    decide: (state: Match) => Promise<Result<Transition<Match, T>>>,
  ) {
    let audience: string[] = [];
    const store = new SupabasePostgresStore<Match>(
      this.matchPool,
      "match",
      async (connection, input) => {
        // Match and owning room share an ID. The lock order is always room, then match.
        const loaded = await connection.query(
          "select state from wordpairs.aggregates where kind='room' and id=$1 for update",
          [input.aggregateId],
        );
        const room = loaded.rows[0]?.state as Room | undefined;
        if (!room) return failure("NOT_FOUND");
        const prior = await connection.query(
          "select public.wordpairs_snapshot('match',$1,$2,$3,$4,$5) as response",
          [
            input.aggregateId,
            input.actorId,
            input.commandId,
            input.requestDigest,
            input.expectedVersion,
          ],
        );
        const snapshot = prior.rows[0]?.response as
          | { status: string; code?: string }
          | undefined;
        if (snapshot?.status === "replayed") return success(input);
        if (snapshot?.code === "IDEMPOTENCY_CONFLICT")
          return failure("IDEMPOTENCY_CONFLICT");
        if (
          "catalogRevision" in input &&
          typeof input.catalogRevision === "number"
        ) {
          const revision = await connection.query(
            "select public.wordpairs_lock_catalog_revision() as revision",
          );
          if (Number(revision.rows[0]?.revision) !== input.catalogRevision)
            // An unchanged match still owns its deadline. A catalog race must
            // not be acknowledged as an obsolete-version job by the worker.
            return failure(
              input.actorId === "system:deadline"
                ? "TEMPORARY_UNAVAILABLE"
                : "CONFLICT",
            );
        }
        if (
          input.actorId !== "system:deadline" &&
          lobbyOverdue(room, this.clock.now())
        )
          return failure("CONFLICT");
        if (
          input.actorId !== "system:deadline" &&
          !room.players.some((p) => p.profileId === input.actorId)
        )
          return failure("NOT_AUTHORIZED");
        audience = recipients(room);
        return success(input);
      },
    );
    return store.transact(command, async (state) => {
      const result = await decide(state);
      return result.ok
        ? success({
            ...result.value,
            events: result.value.events.map((event) => ({
              ...event,
              audience,
            })),
          })
        : result;
    });
  }
  private async read<T>(
    method: "get" | "starts",
    value: string | number,
  ): Promise<Result<T>> {
    let connection: SqlConnection | undefined;
    try {
      connection = await this.matchPool.connect();
      const result = await connection.query(
        `select public.wordpairs_match_${method}($1) as response`,
        [value],
      );
      const response = result.rows[0]?.response;
      return response === null || response === undefined
        ? failure("NOT_FOUND")
        : success(response as T);
    } catch {
      return failure("TEMPORARY_UNAVAILABLE");
    } finally {
      connection?.release();
    }
  }
  get(id: string) {
    return this.read<Match>("get", id);
  }
  starts(limit = 25) {
    return this.read<string[]>("starts", limit);
  }
  async ensure(
    roomId: string,
    factory: (room: Room) => Result<Match>,
  ): Promise<Result<Match>> {
    let connection: SqlConnection | undefined;
    let completed = false;
    let discard = false;
    try {
      connection = await this.matchPool.connect();
      await connection.query("begin");
      const loaded = await connection.query(
        "select state from wordpairs.aggregates where kind='room' and id=$1 for update",
        [roomId],
      );
      const room = loaded.rows[0]?.state as Room | undefined;
      if (!room) return failure("NOT_FOUND");
      const prior = await connection.query(
        "select state from wordpairs.aggregates where kind='match' and id=$1",
        [roomId],
      );
      if (prior.rows[0]) {
        await connection.query("commit");
        completed = true;
        return success(prior.rows[0].state as Match);
      }
      const created = factory(room);
      if (!created.ok) return created;
      const result = await connection.query(
        "select public.wordpairs_match_create($1::jsonb,$2::jsonb) as response",
        [
          JSON.stringify(created.value),
          JSON.stringify({
            id: this.ids.next(),
            aggregateType: "match",
            aggregateId: roomId,
            version: 0,
            schemaVersion: 1,
            type: "MatchCreated",
            audience: recipients(room),
            payload: { roomId },
          }),
        ],
      );
      const response = result.rows[0]?.response as Result<Match> | undefined;
      if (!response) return failure("TEMPORARY_UNAVAILABLE");
      if (!response.ok) return response;
      await connection.query("commit");
      completed = true;
      return response;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : null;
      return failure(
        code === "53300" || code === "53400"
          ? "SERVICE_LIMIT"
          : "TEMPORARY_UNAVAILABLE",
      );
    } finally {
      if (connection) {
        try {
          if (!completed) await connection.query("rollback");
        } catch {
          discard = true;
        } finally {
          connection.release(discard);
        }
      }
    }
  }
}
