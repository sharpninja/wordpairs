import type { Deadline, DeadlineKind, Room } from "./model";
import { failure, type Result, success } from "./result";
import { playerAuthority, roomRole } from "./rooms";

export const LOBBY_IDLE_MS = 30000;
export const HOLDOUT_MS = 5000;
export const COUNTDOWN_MS = 10000;
export const RECONNECT_MS = 120000;
export const PRESENCE_TIMEOUT_MS = 45000;
export const EMPTY_ROOM_MS = 1800000;

/** Called only after a membership/readiness change, at the transaction's clock. */
export function reconcileLobby(room: Room, now: number): Room {
  const next = { ...room, changedAt: now, idlePromptedVersion: null };
  if (next.players.length || next.observers.length) next.emptySince = null;
  else next.emptySince ??= now;
  if (next.status !== "waiting") return next;
  if (next.players.length >= 2 && next.players.every((p) => p.ready)) {
    return {
      ...next,
      status: "countdown",
      countdownDueAt: now + COUNTDOWN_MS,
      lockedRoster: next.players.map((p) => p.profileId),
      holdoutId: null,
      holdoutDueAt: null,
    };
  }
  const unready = next.players.filter((p) => !p.ready);
  const holdout =
    next.players.length >= 2 && unready.length === 1
      ? unready[0].profileId
      : null;
  return {
    ...next,
    holdoutId: holdout,
    holdoutDueAt:
      holdout === null
        ? null
        : holdout === room.holdoutId
          ? room.holdoutDueAt
          : now + HOLDOUT_MS,
  };
}

export function setReady(
  room: Room,
  actorId: string,
  ready: boolean,
  now: number,
): Result<Room> {
  const allowed = playerAuthority(room, actorId);
  if (!allowed.ok) return allowed;
  if (room.status !== "waiting") return failure("ROOM_CLOSED");
  if (lobbyOverdue(room, now)) return failure("CONFLICT");
  if (room.players.find((p) => p.profileId === actorId)?.ready === ready)
    return failure("CONFLICT");
  return success(
    reconcileLobby(
      {
        ...room,
        version: room.version + 1,
        players: room.players.map((p) =>
          p.profileId === actorId ? { ...p, ready } : p,
        ),
      },
      now,
    ),
  );
}

export function leaveRoom(
  room: Room,
  actorId: string,
  now: number,
): Result<Room> {
  return depart(room, actorId, now, true);
}
function depart(
  room: Room,
  actorId: string,
  now: number,
  reconcile: boolean,
): Result<Room> {
  const role = roomRole(room, actorId);
  if (!role) return failure("NOT_AUTHORIZED");
  if (room.status === "closed") return failure("ROOM_CLOSED");
  let players = room.players.filter((p) => p.profileId !== actorId);
  let observers = room.observers.filter((o) => o.profileId !== actorId);
  if (
    role === "player" &&
    room.status === "waiting" &&
    !room.lockedRoster.length &&
    room.players.length === room.capacity &&
    observers.length
  ) {
    const oldest = [...observers].sort(
      (a, b) =>
        a.joinedAt - b.joinedAt ||
        (a.profileId < b.profileId ? -1 : a.profileId > b.profileId ? 1 : 0),
    )[0];
    players = [
      ...players,
      {
        profileId: oldest.profileId,
        ready: false,
        joinedAt: now,
        disconnectedAt: null,
        lastSeenAt: now,
      },
    ];
    observers = observers.filter((o) => o.profileId !== oldest.profileId);
  }
  // A followed player leaving never silently changes an observer's perspective.
  const next = { ...room, players, observers, version: room.version + 1 };
  return success(reconcile ? reconcileLobby(next, now) : next);
}

export function presence(
  room: Room,
  actorId: string,
  connected: boolean,
  now: number,
): Result<Room> {
  if (!playerAuthority(room, actorId).ok) return failure("NOT_AUTHORIZED");
  if (room.status === "closed") return failure("ROOM_CLOSED");
  if (lobbyOverdue(room, now)) return failure("CONFLICT");
  const player = room.players.find((p) => p.profileId === actorId);
  if (!player) return failure("NOT_AUTHORIZED");
  // A late reconnect cannot revive membership whose authoritative lease expired.
  if (
    now >=
    (player.disconnectedAt ??
      (player.lastSeenAt ?? player.joinedAt) + PRESENCE_TIMEOUT_MS) +
      RECONNECT_MS
  )
    return failure("CONFLICT");
  return success({
    ...room,
    version: room.version + 1,
    players: room.players.map((p) =>
      p.profileId === actorId
        ? {
            ...p,
            disconnectedAt: connected ? null : (p.disconnectedAt ?? now),
            ...(connected ? { lastSeenAt: now } : {}),
          }
        : p,
    ),
  });
}

/** All still-live deadlines are carried to the new version without extending time. */
export function lobbyDeadlines(room: Room, nextId: () => string): Deadline[] {
  if (room.status === "closed") return [];
  const jobs: Deadline[] = [];
  const add = (kind: DeadlineKind, dueAt: number) =>
    jobs.push({
      id: nextId(),
      aggregateId: room.id,
      expectedVersion: room.version,
      kind,
      dueAt,
    });
  if (room.status === "waiting") {
    if (room.idlePromptedVersion === null && room.players.length)
      add("idle", room.changedAt + LOBBY_IDLE_MS);
    if (room.holdoutDueAt !== null) add("holdout", room.holdoutDueAt);
  }
  if (room.status === "countdown" && room.countdownDueAt !== null)
    add("countdown", room.countdownDueAt);
  if (!room.players.length && !room.observers.length && room.emptySince != null)
    add("empty-room", room.emptySince + EMPTY_ROOM_MS);
  if (room.players.length)
    add(
      "reconnect",
      Math.min(
        ...room.players.map((p) =>
          p.disconnectedAt === null
            ? (p.lastSeenAt ?? p.joinedAt) + PRESENCE_TIMEOUT_MS
            : p.disconnectedAt + RECONNECT_MS,
        ),
      ),
    );
  return jobs;
}

export function lobbyOverdue(room: Room, now: number): boolean {
  return lobbyDeadlines(room, () => "check").some(
    (job) => job.kind !== "idle" && job.dueAt <= now,
  );
}

/** Advance overdue rules within the same aggregate lock as the next player action. */
export function settleLobby(room: Room, now: number): Room {
  let next = room;
  const priority: Record<string, number> = {
    reconnect: 0,
    "empty-room": 1,
    holdout: 2,
    countdown: 3,
    idle: 4,
  };
  // At most 25 players + 25 promoted observers can traverse detection/grace,
  // with intervening prompts/warnings. Bound work above that finite lifecycle.
  for (let step = 0; step < 512; step++) {
    const due = lobbyDeadlines(next, () => "settle")
      .filter((job) => job.dueAt <= now)
      .sort((a, b) => a.dueAt - b.dueAt || priority[a.kind] - priority[b.kind]);
    if (!due.length) break;
    // Use authoritative deadline time, so a delayed worker never extends a phase.
    const settled = applyDeadline(next, due[0], due[0].dueAt);
    if (!settled.ok) break;
    next = settled.value;
  }
  return next;
}

export function expireLobby(
  room: Room,
  job: Deadline,
  now: number,
): Result<Room> {
  if (
    room.version !== job.expectedVersion ||
    now < job.dueAt ||
    !lobbyDeadlines(room, () => "check").some(
      (current) => current.kind === job.kind && current.dueAt === job.dueAt,
    )
  )
    return failure("CONFLICT");
  const settled = settleLobby(room, now);
  return settled === room
    ? failure("CONFLICT")
    : success({ ...settled, version: room.version + 1 });
}

function applyDeadline(room: Room, job: Deadline, now: number): Result<Room> {
  if (
    room.version !== job.expectedVersion ||
    now < job.dueAt ||
    room.status === "closed"
  )
    return failure("CONFLICT");
  if (
    job.kind === "idle" &&
    room.status === "waiting" &&
    room.idlePromptedVersion === null &&
    now >= room.changedAt + LOBBY_IDLE_MS
  )
    return success({
      ...room,
      version: room.version + 1,
      idlePromptedVersion: room.version,
    });
  if (
    job.kind === "holdout" &&
    room.status === "waiting" &&
    room.holdoutDueAt !== null &&
    now >= room.holdoutDueAt
  ) {
    const holdout = room.players.find(
      (p) => p.profileId === room.holdoutId && !p.ready,
    );
    if (!holdout) return failure("CONFLICT");
    if (room.players.length <= 2)
      return success({
        ...room,
        version: room.version + 1,
        holdoutDueAt: null,
      });
    // Timeout removal starts/locks countdown atomically, without promoting an observer.
    const players = room.players.filter(
      (p) => p.profileId !== holdout.profileId,
    );
    return success({
      ...room,
      players,
      version: room.version + 1,
      status: "countdown",
      changedAt: now,
      lockedRoster: players.map((p) => p.profileId),
      countdownDueAt: now + COUNTDOWN_MS,
      holdoutId: null,
      holdoutDueAt: null,
    });
  }
  if (
    job.kind === "countdown" &&
    room.status === "countdown" &&
    room.countdownDueAt !== null &&
    now >= room.countdownDueAt
  ) {
    const original = room.players.filter((p) =>
      room.lockedRoster.includes(p.profileId),
    );
    const closed = original.length < 2;
    return success({
      ...room,
      version: room.version + 1,
      status: closed ? "closed" : "playing",
      closedAt: closed ? now : null,
      countdownDueAt: null,
    });
  }
  if (
    job.kind === "empty-room" &&
    !room.players.length &&
    !room.observers.length &&
    room.emptySince != null &&
    now >= room.emptySince + EMPTY_ROOM_MS
  )
    return success({
      ...room,
      version: room.version + 1,
      status: "closed",
      closedAt: now,
    });
  if (job.kind === "reconnect") {
    const detected = room.players.map((p) =>
      p.disconnectedAt === null &&
      now >= (p.lastSeenAt ?? p.joinedAt) + PRESENCE_TIMEOUT_MS
        ? {
            ...p,
            disconnectedAt: (p.lastSeenAt ?? p.joinedAt) + PRESENCE_TIMEOUT_MS,
          }
        : p,
    );
    const expired = room.players.filter(
      (p) =>
        p.disconnectedAt !== null && now >= p.disconnectedAt + RECONNECT_MS,
    );
    if (!expired.length)
      return success({ ...room, players: detected, version: room.version + 1 });
    // Apply simultaneous expired leases together: transient promotion must not start a game.
    let next = { ...room, players: detected };
    for (const p of expired) {
      const departed = depart(
        { ...next, version: room.version },
        p.profileId,
        now,
        false,
      );
      if (!departed.ok) return departed;
      next = departed.value;
    }
    return success(reconcileLobby({ ...next, version: room.version + 1 }, now));
  }
  return failure("CONFLICT");
}
