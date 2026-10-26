import type { PageRequest, PublicPage } from "../application/public-pages";
import type {
  PublicProfileSource,
  PublicRoomSource,
} from "../application/public-projections";
import type { PublicReadRepository } from "../application/public-service";
import { failure, type Result, success } from "../domain/result";
import type { SqlConnection, SqlPool } from "./supabase-postgres";

export class PostgresPublicReadRepository implements PublicReadRepository {
  constructor(private pool: SqlPool) {}
  private async read<T>(
    name: "profiles" | "rooms",
    bounds: PageRequest,
  ): Promise<Result<PublicPage<T>>> {
    let connection: SqlConnection | undefined;
    let discard = false;
    try {
      connection = await this.pool.connect();
      const result = await connection.query(
        `select public.wordpairs_public_${name}($1,$2,$3) as response`,
        [bounds.offset, bounds.limit, bounds.revision],
      );
      const raw = result.rows[0]?.response;
      const response =
        raw && typeof raw === "object"
          ? (raw as Record<string, unknown>)
          : null;
      if (response?.conflict === true) return failure("CONFLICT");
      return response &&
        Array.isArray(response.rows) &&
        Number.isSafeInteger(response.revision) &&
        (response.nextOffset === null ||
          Number.isSafeInteger(response.nextOffset))
        ? success(response as PublicPage<T>)
        : failure("TEMPORARY_UNAVAILABLE");
    } catch (error) {
      discard = true;
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : null;
      return failure(
        code === "53300" || code === "53400"
          ? "SERVICE_LIMIT"
          : code === "22023"
            ? "VALIDATION_ERROR"
            : "TEMPORARY_UNAVAILABLE",
      );
    } finally {
      connection?.release(discard);
    }
  }
  leaderboard(bounds: PageRequest) {
    return this.read<PublicProfileSource>("profiles", bounds);
  }
  lobbies(bounds: PageRequest) {
    return this.read<PublicRoomSource>("rooms", bounds);
  }
}
