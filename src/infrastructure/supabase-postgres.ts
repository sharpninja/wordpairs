import type {
  Command,
  TransactionStore,
  Transition,
} from "../application/ports";
import type { DomainEvent, Versioned } from "../domain/model";
import { failure, type Result, success } from "../domain/result";

/** Structural server driver seam: compatible with a pooled PostgreSQL connection. */
export interface SqlConnection {
  query(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
  release(discard?: boolean): void;
}
export interface SqlPool {
  connect(): Promise<SqlConnection>;
}

type Response<S, T> =
  | { status: "loaded"; state: S }
  | { status: "committed" | "replayed"; transition: Transition<S, T> }
  | {
      status: "error";
      code:
        | "NOT_FOUND"
        | "CONFLICT"
        | "IDEMPOTENCY_CONFLICT"
        | "VALIDATION_ERROR";
    };

/**
 * Connect through Supabase's server Postgres pool, with TLS verified by the pool driver.
 * One checked-out connection holds the aggregate lock through decision and RPC commit.
 * The driver/connection string belongs only in the server composition root.
 */
export class SupabasePostgresStore<S extends Versioned>
  implements TransactionStore<S>
{
  constructor(
    private readonly pool: SqlPool,
    private readonly kind: DomainEvent["aggregateType"],
    private readonly selectCommand?: (
      connection: SqlConnection,
      command: Command,
    ) => Promise<Result<Command>>,
  ) {
    if (typeof window !== "undefined")
      throw new Error("Server persistence is unavailable in the browser");
  }

  async transact<T>(
    command: Command,
    decide: (state: S) => Promise<Result<Transition<S, T>>>,
  ): Promise<Result<Transition<S, T>>> {
    let connection: SqlConnection | undefined;
    let completed = false;
    let discard = false;
    try {
      connection = await this.pool.connect();
      await connection.query("begin");
      if (this.selectCommand) {
        const selected = await this.selectCommand(connection, command);
        if (!selected.ok) {
          await connection.query("rollback");
          completed = true;
          return selected;
        }
        command = selected.value;
      }
      await connection.query(
        "select id from wordpairs.aggregates where kind=$1 and id=$2 for update",
        [this.kind, command.aggregateId],
      );
      const values = [
        this.kind,
        command.aggregateId,
        command.actorId,
        command.commandId,
        command.requestDigest,
        command.expectedVersion,
      ];
      const snapshot = await connection.query(
        "select public.wordpairs_snapshot($1,$2,$3,$4,$5,$6) as response",
        values,
      );
      const response = snapshot.rows[0]?.response as Response<S, T> | undefined;
      if (!response) throw new Error("Missing snapshot");
      if (response.status === "error") {
        await connection.query("rollback");
        completed = true;
        return failure(response.code);
      }
      if (response.status === "replayed") {
        await connection.query("commit");
        completed = true;
        return success(response.transition);
      }
      if (response.status !== "loaded")
        throw new Error("Invalid snapshot status");
      const decision = await decide(response.state);
      if (!decision.ok) {
        await connection.query("rollback");
        completed = true;
        return decision;
      }
      const write = await connection.query(
        "select public.wordpairs_commit($1,$2,$3,$4,$5,$6,$7::jsonb) as response",
        [...values, JSON.stringify(decision.value)],
      );
      const committed = write.rows[0]?.response as Response<S, T> | undefined;
      if (committed?.status === "error") {
        await connection.query("rollback");
        completed = true;
        return failure(committed.code);
      }
      if (committed?.status !== "committed" && committed?.status !== "replayed")
        throw new Error("Missing committed response");
      await connection.query("commit");
      completed = true;
      return success(committed.transition);
    } catch (error) {
      // A commit response may be lost after durability: retain the original command ID on retry.
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : null;
      if (code === "53300" || code === "53400")
        return failure("SERVICE_LIMIT", command.commandId);
      return failure("TEMPORARY_UNAVAILABLE");
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
