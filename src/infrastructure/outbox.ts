import type { EventOutbox } from "../application/ports";
import type { DomainEvent } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import type { SqlConnection, SqlPool } from "./supabase-postgres";
export class PostgresOutbox implements EventOutbox {
  constructor(private pool: SqlPool) {}
  private async call<T>(
    method: "pending" | "published",
    args: unknown[],
  ): Promise<Result<T>> {
    let connection: SqlConnection | undefined;
    let discard = false;
    try {
      connection = await this.pool.connect();
      const result = await connection.query(
        `select public.wordpairs_outbox_${method}(${args.map((_, index) => `$${index + 1}`).join(",")}) as response`,
        args,
      );
      return success(result.rows[0]?.response as T);
    } catch {
      discard = true;
      return failure("TEMPORARY_UNAVAILABLE");
    } finally {
      connection?.release(discard);
    }
  }
  pending(limit: number) {
    return this.call<DomainEvent[]>("pending", [limit]);
  }
  async markPublished(id: string, at: number) {
    const result = await this.call<boolean>("published", [id, at]);
    return result.ok ? success(undefined) : result;
  }
}
