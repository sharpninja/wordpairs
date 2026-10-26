import type { Clock, Command, Transition } from "../application/ports";
import type { ReactionPort } from "../application/reactions";
import { lobbyOverdue } from "../domain/lobby";
import type { Match, Room } from "../domain/model";
import { emptyReactions, type ReactionState } from "../domain/reactions";
import { failure, type Result, success } from "../domain/result";
import {
  type SqlConnection,
  type SqlPool,
  SupabasePostgresStore,
} from "./supabase-postgres";
export class PostgresReactionRepository implements ReactionPort {
  constructor(
    private pool: SqlPool,
    private clock: Clock = { now: () => Date.now() },
  ) {}
  async read(
    roomId: string,
    _actorId: string,
  ): Promise<Result<{ state: ReactionState; room: Room; match: Match }>> {
    let connection: SqlConnection | undefined;
    try {
      connection = await this.pool.connect();
      const result = await connection.query(
        "select kind,state from wordpairs.aggregates where id=$1 and kind in('room','match','moderation')",
        [roomId],
      );
      const room = result.rows.find((r) => r.kind === "room")?.state as
        | Room
        | undefined;
      const match = result.rows.find((r) => r.kind === "match")?.state as
        | Match
        | undefined;
      const state = result.rows.find((r) => r.kind === "moderation")?.state as
        | ReactionState
        | undefined;
      return room && match
        ? success({ room, match, state: state ?? emptyReactions(roomId) })
        : failure("NOT_FOUND");
    } catch {
      return failure("TEMPORARY_UNAVAILABLE");
    } finally {
      connection?.release();
    }
  }
  transact<T>(
    command: Command,
    decide: (
      state: ReactionState,
      room: Room,
      match: Match,
    ) => Promise<Result<Transition<ReactionState, T>>>,
  ) {
    let room: Room | undefined;
    let match: Match | undefined;
    const store = new SupabasePostgresStore<ReactionState>(
      this.pool,
      "moderation",
      async (connection, input) => {
        const prior = await connection.query(
          "select public.wordpairs_snapshot('moderation',$1,$2,$3,$4,$5) as response",
          [
            input.aggregateId,
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
        const loaded = await connection.query(
          "select state from wordpairs.aggregates where kind='room' and id=$1 for update",
          [input.aggregateId],
        );
        room = loaded.rows[0]?.state as Room | undefined;
        if (!room) return failure("NOT_FOUND");
        if (lobbyOverdue(room, this.clock.now())) return failure("CONFLICT");
        const game = await connection.query(
          "select state from wordpairs.aggregates where kind='match' and id=$1 for update",
          [input.aggregateId],
        );
        match = game.rows[0]?.state as Match | undefined;
        if (!match) return failure("NOT_FOUND");
        if (!room.players.some((p) => p.profileId === input.actorId))
          return failure("NOT_AUTHORIZED");
        await connection.query(
          "select public.wordpairs_reactions_ensure($1,$2::jsonb)",
          [
            input.aggregateId,
            JSON.stringify(emptyReactions(input.aggregateId)),
          ],
        );
        const current = await connection.query(
          "select version from wordpairs.aggregates where kind='moderation' and id=$1",
          [input.aggregateId],
        );
        return success({
          ...input,
          expectedVersion: current.rows[0]?.version as number,
        });
      },
    );
    return store.transact(command, async (state) =>
      room && match ? decide(state, room, match) : failure("NOT_AUTHORIZED"),
    );
  }
}
