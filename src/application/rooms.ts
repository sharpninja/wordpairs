import { lobbyDeadlines } from "../domain/lobby";
import type { Room } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import {
  isRoomId,
  joinRoom,
  newRoom,
  normalizeRoomCode,
  ROOM_ALPHABET,
  roomRole,
} from "../domain/rooms";
import { executeCommand } from "./command";
import type {
  Clock,
  Command,
  IdSource,
  RandomSource,
  RoomRepository,
  TransactionStore,
} from "./ports";
export type PlayerLabel = { id: string; alias: string; icon: string };
export interface RoomDirectory extends RoomRepository {
  readonly quickStore: TransactionStore<Room>;
  lookupCode(
    code: string,
    sessionKey: string,
    now: number,
  ): Promise<Result<Room>>;
  labels(ids: string[]): Promise<Result<PlayerLabel[]>>;
  invite(
    roomId: string,
    inviterId: string,
    tokenHash: string,
  ): Promise<Result<undefined>>;
  invitation(
    hash: string,
  ): Promise<Result<{ roomId: string; inviterId: string }>>;
}
export function roomProjection(
  room: Room,
  actorId: string,
  labels: PlayerLabel[],
  preview = false,
) {
  const role = roomRole(room, actorId);
  const label = (id: string) => {
    const row = labels.find((value) => value.id === id);
    return { id, alias: row?.alias ?? "Player", icon: row?.icon ?? "owl" };
  };
  const observer = room.observers.find((row) => row.profileId === actorId);
  return {
    roomId: room.id,
    version: room.version,
    capacity: room.capacity,
    status: room.status,
    discoverable: room.discoverable,
    availableSlots:
      room.status === "waiting" ? room.capacity - room.players.length : 0,
    ...(role === "player" ? { code: room.code } : {}),
    role,
    followedPlayerId: observer?.followedPlayerId ?? null,
    idlePrompt: room.idlePromptedVersion !== null,
    holdoutId: room.holdoutId,
    holdoutDueAt: room.holdoutDueAt,
    countdownDueAt: room.countdownDueAt,
    players: room.players.map((player, index) => ({
      ...label(player.profileId),
      position: index + 1,
      ready: player.ready,
      connected: player.disconnectedAt === null,
    })),
    observers: preview
      ? []
      : room.observers.map((value) => ({
          ...label(value.profileId),
          follows: value.followedPlayerId,
        })),
    observerCount: room.observers.length,
    canJoinPlayer:
      !role && room.status === "waiting" && room.players.length < room.capacity,
    canObserve:
      !role &&
      room.status !== "closed" &&
      (room.players.length === room.capacity || room.status !== "waiting") &&
      room.observers.length < 25,
  };
}
export type RoomView = ReturnType<typeof roomProjection>;
export class RoomService {
  constructor(
    private repository: RoomDirectory,
    private clock: Clock,
    private ids: IdSource,
    private random: RandomSource,
  ) {}
  async create(
    command: Command,
    capacity: unknown,
    discoverable: unknown = false,
  ) {
    if (
      typeof capacity !== "number" ||
      typeof discoverable !== "boolean" ||
      command.expectedVersion !== 0 ||
      !command.actorId ||
      !command.aggregateId ||
      !command.commandId ||
      !command.requestDigest
    )
      return failure("VALIDATION_ERROR");
    let code = "";
    for (let i = 0; i < 8; i++)
      code += ROOM_ALPHABET[this.random.integer(0, 31)];
    const room = newRoom(
      command.aggregateId,
      command.actorId,
      capacity,
      code,
      this.clock.now(),
      discoverable,
    );
    if (!room.ok) return room;
    const event = {
      id: this.ids.next(),
      aggregateType: "room" as const,
      aggregateId: room.value.id,
      version: 0,
      schemaVersion: 1 as const,
      type: "RoomCreated",
      audience: [command.actorId],
      payload: { roomId: room.value.id },
    };
    const result = await this.repository.create(
      command,
      room.value,
      [event],
      lobbyDeadlines(room.value, () => this.ids.next()),
    );
    return result.ok
      ? success({
          roomId: result.value.id,
          code: result.value.code,
          version: result.value.version,
        })
      : result;
  }
  async resolve(
    reference: string,
    actorId: string,
    sessionKey: string,
    inviteHash: string | null = null,
  ): Promise<Result<{ room: Room; inviterId: string | null }>> {
    if (reference.length > 128) return failure("NOT_FOUND");
    if (inviteHash) {
      const invite = await this.repository.invitation(inviteHash);
      if (!invite.ok) return invite;
      const room = await this.repository.get(invite.value.roomId);
      if (
        !room.ok ||
        room.value.status === "closed" ||
        (reference !== room.value.id &&
          normalizeRoomCode(reference) !== room.value.code) ||
        !room.value.players.some((p) => p.profileId === invite.value.inviterId)
      )
        return failure("NOT_FOUND");
      return success({ room: room.value, inviterId: invite.value.inviterId });
    }
    const code = normalizeRoomCode(reference);
    const room =
      code || !isRoomId(reference)
        ? await this.repository.lookupCode(
            code ?? reference.trim().toUpperCase(),
            sessionKey,
            this.clock.now(),
          )
        : await this.repository.get(reference);
    if (!room.ok) return room;
    if (
      room.value.status === "closed" &&
      (code || !roomRole(room.value, actorId))
    )
      return failure("NOT_FOUND");
    if (
      !code &&
      !roomRole(room.value, actorId) &&
      !(
        room.value.discoverable &&
        room.value.status === "waiting" &&
        room.value.players.length < room.value.capacity
      )
    )
      return failure("NOT_FOUND");
    return success({ room: room.value, inviterId: null });
  }
  async view(room: Room, actorId: string) {
    const labels = await this.repository.labels([
      ...room.players.map((p) => p.profileId),
      ...room.observers.map((o) => o.profileId),
    ]);
    return labels.ok
      ? success({
          ...roomProjection(
            room,
            actorId,
            labels.value,
            !roomRole(room, actorId),
          ),
          serverNow: this.clock.now(),
        })
      : labels;
  }
  async join(
    command: Command,
    mode: "player" | "observer",
    inviterId: string | null,
    store: TransactionStore<Room> = this.repository,
  ) {
    return executeCommand(
      command,
      {
        store,
        clock: this.clock,
        quota: { check: async () => success(undefined) },
      },
      (room, now) => {
        const next = joinRoom(room, command.actorId, mode, inviterId, now);
        if (!next.ok) return next;
        return success({
          state: next.value,
          result: {
            roomId: room.id,
            membership: mode,
            version: next.value.version,
          },
          events: [
            {
              id: this.ids.next(),
              aggregateType: "room",
              aggregateId: room.id,
              version: next.value.version,
              schemaVersion: 1,
              type: "RoomMembershipChanged",
              audience: [
                ...next.value.players.map((p) => p.profileId),
                ...next.value.observers.map((o) => o.profileId),
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
  async quickMatch(actorId: string, commandId: string, digest: string) {
    const result = await this.join(
      {
        aggregateId: "quick-match",
        actorId,
        commandId,
        requestDigest: digest,
        expectedVersion: 0,
      },
      "player",
      null,
      this.repository.quickStore,
    );
    if (!result.ok && result.error.code === "NOT_FOUND")
      return success({ joined: null, fallback: ["browse", "create"] });
    if (!result.ok) return result;
    return success({ joined: result.value.roomId, fallback: [] });
  }
}
