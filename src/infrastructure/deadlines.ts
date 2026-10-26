import type { DeadlineQueue } from "../application/lobby";
import type { Deadline } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import type { SqlConnection, SqlPool } from "./supabase-postgres";

export class PostgresLobbyQueue implements DeadlineQueue {
  constructor(private pool: SqlPool) {}
  private async call<T>(sql: string, values: unknown[]): Promise<Result<T>> {
    let connection: SqlConnection | undefined;
    let discard = false;
    try {
      connection = await this.pool.connect();
      const result = await connection.query(sql, values);
      return success(result.rows[0]?.response as T);
    } catch {
      discard = true;
      return failure("TEMPORARY_UNAVAILABLE");
    } finally {
      connection?.release(discard);
    }
  }
  claim(now: number, limit: number, leaseId: string) {
    return this.call<Deadline[]>(
      "select public.wordpairs_lobby_claim($1,$2,$3) as response",
      [now, limit, leaseId],
    );
  }
  async complete(id: string, leaseId: string): Promise<Result<undefined>> {
    const result = await this.call<boolean>(
      "select public.wordpairs_lobby_complete($1,$2) as response",
      [id, leaseId],
    );
    return result.ok
      ? result.value
        ? success(undefined)
        : failure("CONFLICT")
      : result;
  }
}
