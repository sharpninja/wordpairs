import type {
  IdentityRepository,
  LoginChallenge,
} from "../application/identity";
import type { Actor, Profile } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import type { SqlConnection, SqlPool } from "./supabase-postgres";

export class PostgresIdentityRepository implements IdentityRepository {
  constructor(private pool: SqlPool) {}
  private async call<T>(
    method:
      | "guest"
      | "member"
      | "session"
      | "revoke"
      | "save_challenge"
      | "take_challenge",
    args: unknown[],
  ): Promise<Result<T>> {
    let connection: SqlConnection | undefined;
    let discard = false;
    try {
      connection = await this.pool.connect();
      const values = args.map((value) =>
        typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : value,
      );
      const result = await connection.query(
        `select public.wordpairs_identity_${method}(${values.map((_, index) => `$${index + 1}`).join(",")}) as response`,
        values,
      );
      const response = result.rows[0]?.response;
      return response === null || response === undefined
        ? failure("NOT_AUTHENTICATED")
        : success(response as T);
    } catch (error) {
      discard = true;
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
      connection?.release(discard);
    }
  }
  guest(hash: string, draft: Profile, session: string, now: number) {
    return this.call<Profile>("guest", [hash, draft, session, now]);
  }
  member(
    identity: { issuer: string; subject: string },
    draft: Profile,
    session: string,
    now: number,
  ) {
    return this.call<Profile>("member", [
      identity.issuer,
      identity.subject,
      draft,
      session,
      now,
    ]);
  }
  session(hash: string, now: number) {
    return this.call<{ profile: Profile; actor: Actor }>("session", [
      hash,
      now,
    ]);
  }
  async revoke(hash: string) {
    const result = await this.call<boolean>("revoke", [hash]);
    return result.ok ? success(undefined) : result;
  }
  async saveChallenge(hash: string, challenge: LoginChallenge, dueAt: number) {
    const result = await this.call<boolean>("save_challenge", [
      hash,
      challenge,
      dueAt,
    ]);
    return result.ok ? success(undefined) : result;
  }
  takeChallenge(hash: string, now: number) {
    return this.call<LoginChallenge>("take_challenge", [hash, now]);
  }
}
