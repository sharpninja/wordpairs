import type { Match, Room } from "../../src/domain/model";
import { failure, success } from "../../src/domain/result";

// Independent contract fixture. Values come from the operator-approved CAP10
// policy, not roomCapacity, newRoom, createMatch or lobby implementation.
export function fixtureProvider(kind: string) {
  const maximum = kind === "wrong-player-limit" ? 15 : 10;
  const blocked = (room: Room) =>
    kind !== "wrong-legacy" &&
    ["waiting", "countdown"].includes(room.status) &&
    (kind === "wrong-block-after-shrink"
      ? room.players.length >= 10
      : room.players.length > 10);
  const capacity = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= 2 && value <= maximum;
  const room = (id: string, actor: string, count: number, code: string, now: number): Room => ({
    id, version: 0, code, creatorId: actor, capacity: count, discoverable: false,
    status: "waiting", createdAt: now, changedAt: now, closedAt: null,
    players: [{ profileId: actor, ready: false, joinedAt: now, disconnectedAt: null, lastSeenAt: now }],
    observers: [], lockedRoster: [], nextObserverSequence: 0, idlePromptedVersion: null,
    holdoutId: null, holdoutDueAt: null, countdownDueAt: null,
  });
  return {
    roomCapacity: capacity,
    newRoom: (id: string, actor: string, count: number, code: string, now: number) =>
      capacity(count) ? success(room(id, actor, count, code, now)) : failure("VALIDATION_ERROR"),
    createMatch: (id: string, roomId: string, roster: string[], random: {integer(a: number, b: number): number}, now: number) => {
      if (!capacity(roster.length)) return failure("VALIDATION_ERROR");
      const index = random.integer(1, roster.length);
      const match: Match = { id, roomId, version: 0, roster: [...roster], anchorId: roster[index - 1], chooserId: roster[index - 1], status: "choosing", rounds: [], usedPairIds: [], autoCategoryId: null, startedAt: now, finishedAt: null };
      return success(match);
    },
    joinRoom: (state: Room, actor: string, mode: "player" | "observer", inviter: string | null, now: number) => {
      if (mode === "player") {
        if (state.players.length >= Math.min(state.capacity, maximum)) return failure("ROOM_FULL");
        return success({ ...structuredClone(state), players: [...state.players, {profileId: actor, ready: false, joinedAt: now, disconnectedAt: null, lastSeenAt: now}] });
      }
      if (state.observers.length >= (kind === "wrong-observer-limit" ? 10 : 25)) return failure("ROOM_FULL");
      return success({...structuredClone(state), observers: [...state.observers, {profileId: actor, followedPlayerId: inviter as string, arrivalSequence: state.observers.length, joinedAt: now}]});
    },
    reconcileLobby: (state: Room, _now: number) => blocked(state)
      ? {...structuredClone(state), status: "waiting" as const, holdoutId: null, holdoutDueAt: null}
      : {...structuredClone(state), status: "countdown" as const, lockedRoster: state.players.map(p => p.profileId)},
    setReady: (state: Room, _actor: string, _ready: boolean, _now: number) => blocked(state) ? failure("VALIDATION_ERROR") : success(structuredClone(state)),
    leaveRoom: (state: Room, actor: string, _now: number) => success({...structuredClone(state), players: state.players.filter(p => p.profileId !== actor)}),
    lobbyDeadlines: (state: Room, _id: () => string) => blocked(state) ? [] : state.status === "countdown" ? [{id:"countdown",aggregateId:state.id,expectedVersion:state.version,kind:"countdown",dueAt:state.countdownDueAt as number}] : [],
    roomProjection: (state: Room, _actor: string, _labels: unknown[]) => ({
      capacity: state.status === "playing" || blocked(state) ? state.capacity : Math.min(state.capacity, maximum),
      availableSlots: state.status === "waiting" ? Math.max(0, Math.min(state.capacity, maximum) - state.players.length) : 0,
      canJoinPlayer: state.status === "waiting" && state.players.length < Math.min(state.capacity, maximum),
      ...(blocked(state) ? { capacityBlocked: true } : {}),
    }),
  };
}
