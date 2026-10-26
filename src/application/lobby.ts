import {
  expireLobby,
  leaveRoom,
  lobbyDeadlines,
  presence,
  setReady,
  settleLobby,
} from "../domain/lobby";
import type { Deadline, Room } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import { playerAuthority, roomRole } from "../domain/rooms";
import { executeCommand } from "./command";
import type { Clock, Command, IdSource, TransactionStore } from "./ports";

export type LobbyAction =
  | { type: "ready"; ready: boolean }
  | { type: "leave" }
  | { type: "presence"; connected: boolean };
export class LobbyService {
  constructor(
    private store: TransactionStore<Room>,
    private clock: Clock,
    private ids: IdSource,
    private presenceStore: TransactionStore<Room> = store,
  ) {}
  private run(
    command: Command,
    type: string,
    decide: (room: Room, now: number) => Result<Room>,
  ) {
    return executeCommand(
      command,
      {
        store: this.store,
        clock: this.clock,
        quota: { check: async () => success(undefined) },
      },
      (room, now) => {
        const next = decide(room, now);
        if (!next.ok) return next;
        return success({
          state: next.value,
          result: {
            roomId: room.id,
            version: next.value.version,
            status: next.value.status,
          },
          events: [
            {
              id: this.ids.next(),
              aggregateType: "room",
              aggregateId: room.id,
              version: next.value.version,
              schemaVersion: 1,
              type,
              audience: [
                ...new Set(
                  [
                    ...room.players,
                    ...room.observers,
                    ...next.value.players,
                    ...next.value.observers,
                  ].map((p) => p.profileId),
                ),
              ],
              payload: { roomId: room.id },
            },
          ],
          deadlines: lobbyDeadlines(next.value, () => this.ids.next()),
          audits: [],
        });
      },
    );
  }
  async act(command: Command, action: LobbyAction) {
    const committed = await executeCommand(
      command,
      {
        store: action.type === "presence" ? this.presenceStore : this.store,
        clock: this.clock,
        quota: { check: async () => success(undefined) },
      },
      (room, now) => {
        if (
          action.type === "leave"
            ? !roomRole(room, command.actorId)
            : !playerAuthority(room, command.actorId).ok
        )
          return failure("NOT_AUTHORIZED");
        const settled = settleLobby(room, now);
        // Collapse internal catch-up into this one canonical aggregate transition.
        const base = { ...settled, version: room.version };
        const attempted =
          action.type === "ready"
            ? setReady(base, command.actorId, action.ready, now)
            : action.type === "leave"
              ? leaveRoom(base, command.actorId, now)
              : presence(base, command.actorId, action.connected, now);
        if (!attempted.ok && settled === room) return attempted;
        const next = {
          ...(attempted.ok ? attempted.value : settled),
          version: room.version + 1,
        };
        const result = attempted.ok
          ? success({
              roomId: room.id,
              version: next.version,
              status: next.status,
            })
          : attempted;
        return success({
          state: next,
          result,
          events: [
            {
              id: this.ids.next(),
              aggregateType: "room",
              aggregateId: room.id,
              version: next.version,
              schemaVersion: 1,
              type: "RoomLobbyChanged",
              audience: [
                ...new Set(
                  [
                    ...room.players,
                    ...room.observers,
                    ...next.players,
                    ...next.observers,
                  ].map((p) => p.profileId),
                ),
              ],
              payload: { roomId: room.id },
            },
          ],
          deadlines: lobbyDeadlines(next, () => this.ids.next()),
          audits: [],
        });
      },
    );
    return committed.ok ? committed.value : committed;
  }
  expire(job: Deadline) {
    return this.run(
      {
        aggregateId: job.aggregateId,
        actorId: "system:deadline",
        commandId: job.id,
        requestDigest: JSON.stringify(job),
        expectedVersion: job.expectedVersion,
      },
      "RoomDeadlinesApplied",
      (room, now) => expireLobby(room, job, now),
    );
  }
}

export interface DeadlineQueue {
  claim(
    now: number,
    limit: number,
    leaseId: string,
  ): Promise<Result<Deadline[]>>;
  complete(id: string, leaseId: string): Promise<Result<undefined>>;
}
export interface DeadlineProcessor {
  expire(job: Deadline): Promise<Result<unknown>>;
}
/** A crash after commit replays the canonical job command before acknowledging its lease. */
export class LobbyDispatcher {
  constructor(
    private queue: DeadlineQueue,
    private lobby: DeadlineProcessor,
    private clock: Clock,
    private ids: IdSource,
  ) {}
  async drain(limit = 10): Promise<Result<number>> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 25)
      return failure("VALIDATION_ERROR");
    const lease = this.ids.next();
    const jobs = await this.queue.claim(this.clock.now(), limit, lease);
    if (!jobs.ok) return jobs;
    let applied = 0;
    for (const job of jobs.value) {
      const result = await this.lobby.expire(job);
      if (
        !result.ok &&
        !["CONFLICT", "NOT_FOUND", "ROOM_CLOSED"].includes(result.error.code)
      )
        return result;
      const completed = await this.queue.complete(job.id, lease);
      if (!completed.ok) return completed;
      if (result.ok) applied++;
    }
    return success(applied);
  }
}
