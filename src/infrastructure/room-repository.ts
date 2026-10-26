import type { Command, TransactionStore } from "../application/ports";
import type { PlayerLabel, RoomDirectory } from "../application/rooms";
import type { Deadline, DomainEvent, Room } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import { secrets } from "./secrets";
import {
  type SqlConnection,
  type SqlPool,
  SupabasePostgresStore,
} from "./supabase-postgres";
export class PostgresRoomRepository
  extends SupabasePostgresStore<Room>
  implements RoomDirectory
{
  readonly quickStore: TransactionStore<Room>;
  constructor(private directoryPool: SqlPool) {
    super(directoryPool, "room");
    this.quickStore = new SupabasePostgresStore<Room>(
      directoryPool,
      "room",
      async (connection, command) => {
        const selected = await connection.query(
          "select public.wordpairs_room_assignment($1,$2,$3) as response",
          [command.actorId, command.commandId, command.requestDigest],
        );
        const result = selected.rows[0]?.response as Result<{
          roomId: string;
          expectedVersion: number;
        } | null>;
        if (!result) return failure("TEMPORARY_UNAVAILABLE");
        if (!result.ok) return result;
        return result.value
          ? success({
              ...command,
              aggregateId: result.value.roomId,
              expectedVersion: result.value.expectedVersion,
            })
          : failure("NOT_FOUND");
      },
    );
  }
  private async call<T>(
    method:
      | "get"
      | "discover"
      | "code"
      | "labels"
      | "create"
      | "invite"
      | "invitation",
    args: unknown[],
    wrapped = false,
  ): Promise<Result<T>> {
    let connection: SqlConnection | undefined;
    let discard = false;
    try {
      connection = await this.directoryPool.connect();
      const values = args.map((value) =>
        typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : value,
      );
      const result = await connection.query(
        `select public.wordpairs_room_${method}(${values.map((_, i) => `$${i + 1}`).join(",")}) as response`,
        values,
      );
      const response = result.rows[0]?.response;
      if (response === null || response === undefined)
        return failure("NOT_FOUND");
      return wrapped ? (response as Result<T>) : success(response as T);
    } catch (error) {
      discard = true;
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : null;
      return failure(
        code === "53300" || code === "53400"
          ? "SERVICE_LIMIT"
          : code === "23505"
            ? "CONFLICT"
            : code === "22023"
              ? "VALIDATION_ERROR"
              : "TEMPORARY_UNAVAILABLE",
      );
    } finally {
      connection?.release(discard);
    }
  }
  get(id: string) {
    return this.call<Room>("get", [id]);
  }
  lookupCode(code: string, sessionKey: string, now: number) {
    return this.call<Room>("code", [secrets.hash(code), sessionKey, now], true);
  }
  findByCode(code: string) {
    return this.lookupCode(code, "server-lookup", Date.now());
  }
  discover(limit: number, after?: string) {
    return this.call<Room[]>("discover", [limit, after ?? null]);
  }
  labels(ids: string[]) {
    return this.call<PlayerLabel[]>("labels", [ids]);
  }
  async create(
    command: Command,
    room: Room,
    events: DomainEvent[],
    deadlines: Deadline[],
  ) {
    if (events.length !== 1 || deadlines.length !== 0)
      return failure("VALIDATION_ERROR");
    const result = await this.call<Room>(
      "create",
      [command, room, secrets.hash(room.code), events[0]],
      true,
    );
    return !result.ok && result.error.code === "SERVICE_LIMIT"
      ? failure("SERVICE_LIMIT", command.commandId)
      : result;
  }
  async invite(roomId: string, inviterId: string, hash: string) {
    const result = await this.call<undefined>(
      "invite",
      [roomId, inviterId, hash],
      true,
    );
    return result.ok ? success(undefined) : result;
  }
  invitation(hash: string) {
    return this.call<{ roomId: string; inviterId: string }>("invitation", [
      hash,
    ]);
  }
}
