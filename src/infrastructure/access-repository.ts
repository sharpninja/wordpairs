import type { AccessPort, AccessView, RoleChange } from "../application/access";
import type { Command } from "../application/ports";
import { failure, type Result } from "../domain/result";
import type { SqlPool } from "./supabase-postgres";

export class PostgresAccessRepository implements AccessPort {
  constructor(
    private pool: SqlPool,
    private administrators: readonly string[],
  ) {}
  private async call<T>(
    method: "read" | "change",
    args: unknown[],
  ): Promise<Result<T>> {
    const connection = await this.pool.connect().catch(() => null);
    if (!connection) return failure("TEMPORARY_UNAVAILABLE");
    try {
      const result = await connection.query(
        `select public.wordpairs_access_${method}(${args.map((_, i) => `$${i + 1}`).join(",")}) as response`,
        args,
      );
      return (
        (result.rows[0]?.response as Result<T> | undefined) ??
        failure("TEMPORARY_UNAVAILABLE")
      );
    } catch {
      return failure("TEMPORARY_UNAVAILABLE");
    } finally {
      connection.release();
    }
  }
  read(actorId: string, search: string) {
    return this.call<AccessView>("read", [
      actorId,
      this.administrators,
      search,
    ]);
  }
  change(command: Command, input: RoleChange) {
    return this.call<{ version: number }>("change", [
      command.actorId,
      this.administrators,
      command.commandId,
      command.requestDigest,
      command.expectedVersion,
      input.profileId,
      input.role,
      input.grant,
      input.reason,
    ]);
  }
}
