import { lobbyOverdue, reconcileLobby } from "./lobby";
import type { Room } from "./model";
import { failure, type Result, success } from "./result";
export const ROOM_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function isRoomId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
export function roomCapacity(value: unknown): value is number {
  return (
    Number.isInteger(value) && (value as number) >= 2 && (value as number) <= 25
  );
}
export function normalizeRoomCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^[0-9A-HJKMNP-TV-Z]{8}$/.test(code) ? code : null;
}
export function newRoom(
  id: string,
  actorId: string,
  capacity: number,
  code: string,
  now: number,
  discoverable = false,
): Result<Room> {
  if (!roomCapacity(capacity) || !normalizeRoomCode(code))
    return failure("VALIDATION_ERROR");
  return success({
    id,
    version: 0,
    code,
    creatorId: actorId,
    capacity,
    discoverable,
    status: "waiting",
    createdAt: now,
    changedAt: now,
    closedAt: null,
    players: [
      {
        profileId: actorId,
        ready: false,
        joinedAt: now,
        disconnectedAt: null,
        lastSeenAt: now,
      },
    ],
    observers: [],
    lockedRoster: [],
    nextObserverSequence: 0,
    idlePromptedVersion: null,
    holdoutId: null,
    holdoutDueAt: null,
    countdownDueAt: null,
  });
}
export function roomRole(
  room: Room,
  actorId: string,
): "player" | "observer" | null {
  return room.players.some((p) => p.profileId === actorId)
    ? "player"
    : room.observers.some((o) => o.profileId === actorId)
      ? "observer"
      : null;
}
export function playerAuthority(
  room: Room,
  actorId: string,
): Result<undefined> {
  return room.players.some((p) => p.profileId === actorId)
    ? success(undefined)
    : failure("NOT_AUTHORIZED");
}
export function joinRoom(
  room: Room,
  actorId: string,
  mode: "player" | "observer",
  inviterId: string | null,
  now: number,
): Result<Room> {
  if (room.status === "closed") return failure("ROOM_CLOSED");
  if (roomRole(room, actorId)) return failure("CONFLICT");
  if (lobbyOverdue(room, now)) return failure("CONFLICT");
  if (mode === "player") {
    if (room.status !== "waiting" || room.lockedRoster.length)
      return failure("ROOM_CLOSED");
    if (room.players.length >= room.capacity) return failure("ROOM_FULL");
    return success(
      reconcileLobby(
        {
          ...room,
          version: room.version + 1,
          changedAt: now,
          idlePromptedVersion: null,
          players: [
            ...room.players,
            {
              profileId: actorId,
              ready: false,
              joinedAt: now,
              disconnectedAt: null,
              lastSeenAt: now,
            },
          ],
        },
        now,
      ),
    );
  }
  if (room.observers.length >= 25) return failure("ROOM_FULL");
  if (!inviterId || !room.players.some((p) => p.profileId === inviterId))
    return failure("NOT_AUTHORIZED");
  if (room.status === "waiting" && room.players.length < room.capacity)
    return failure("VALIDATION_ERROR");
  return success(
    reconcileLobby(
      {
        ...room,
        version: room.version + 1,
        changedAt: now,
        idlePromptedVersion: null,
        nextObserverSequence: room.nextObserverSequence + 1,
        observers: [
          ...room.observers,
          {
            profileId: actorId,
            followedPlayerId: inviterId,
            arrivalSequence: room.nextObserverSequence,
            joinedAt: Math.max(now, ...room.observers.map((o) => o.joinedAt)),
          },
        ],
      },
      now,
    ),
  );
}
