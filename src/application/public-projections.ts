import type { Profile, Room } from "../domain/model";

export type PublicProfileSource = Pick<
  Profile,
  "id" | "alias" | "publicLeaderboard" | "wins" | "points" | "earliestWinAt"
>;
export type PublicRoomSource = Pick<
  Room,
  "id" | "capacity" | "discoverable" | "status" | "createdAt"
> & { playerCount: number };

export const RULES_METADATA = {
  version: "2.6",
  updated: "2026-10-26",
} as const;
export const LOBBY_REFRESH_MS = 15000;
export const LEADERBOARD_REFRESH_MS = 300000;
export const GAMEPLAY_RULES = [
  "Join or create a room",
  "Mark ready",
  "Solve with fewer hints for more points",
  "Play eight rounds with 2–25 players. Each answer stage lasts 20 seconds.",
  "Score 5 points before hints, then 3, 2 or 1 after each hint. Unsolved rounds score zero.",
  "The first correct solver chooses the next category. Highest total points wins; lower total answer time breaks a tie.",
] as const;

export function rankPublicProfiles<T extends PublicProfileSource>(
  profiles: readonly T[],
): T[] {
  return profiles
    .filter((profile) => profile.publicLeaderboard === true)
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.points - a.points ||
        (a.earliestWinAt ?? Number.POSITIVE_INFINITY) -
          (b.earliestWinAt ?? Number.POSITIVE_INFINITY) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
}

export function publicLobbies(
  rooms: readonly (Room | PublicRoomSource)[],
  now: number,
) {
  const count = (room: Room | PublicRoomSource) =>
    "players" in room ? room.players.length : room.playerCount;
  return rooms
    .filter(
      (room) =>
        room.discoverable &&
        room.status === "waiting" &&
        count(room) < room.capacity,
    )
    .sort(
      (a, b) =>
        a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .map((room) => ({
      roomId: room.id,
      playerCount: count(room),
      capacity: room.capacity,
      state: "waiting" as const,
      ageSeconds: Math.max(0, Math.floor((now - room.createdAt) / 1000)),
    }));
}

export function landingProjection(
  profiles: readonly PublicProfileSource[],
  rooms: readonly (Room | PublicRoomSource)[],
  now: number,
) {
  return {
    leaderboard: rankPublicProfiles(profiles).map((profile) => ({
      alias: profile.alias,
      wins: profile.wins,
      points: profile.points,
    })),
    lobbies: publicLobbies(rooms, now),
    rules: { ...RULES_METADATA },
  };
}
export type LandingProjection = ReturnType<typeof landingProjection>;
