import { playerGraceEndsAt } from "./lobby";
import type { Match, Room } from "./model";
import { failure, type Result, success } from "./result";
export const REACTIONS = ["👍", "❤️", "😂", "🎉", "👀"] as const;
export interface Reaction {
  id: string;
  actorId: string;
  emoji: string;
  sentAt: number;
  expiresAt: number;
  audience: string[];
}
export interface ReactionState {
  id: string;
  version: number;
  sourceRoomId: string;
  lastSent: Record<string, number>;
  reactions: Reaction[];
}
export const emptyReactions = (roomId: string): ReactionState => ({
  id: roomId,
  sourceRoomId: roomId,
  version: 0,
  lastSent: {},
  reactions: [],
});
export function sendReaction(
  state: ReactionState,
  room: Room,
  match: Match,
  actorId: string,
  emoji: string,
  now: number,
  id: string,
): Result<ReactionState> {
  if (!REACTIONS.some((r) => r === emoji) || !id || !Number.isFinite(now))
    return failure("VALIDATION_ERROR");
  if (
    room.status !== "playing" ||
    match.status !== "playing" ||
    state.id !== room.id ||
    match.roomId !== room.id ||
    !room.players.some(
      (p) => p.profileId === actorId && now < playerGraceEndsAt(p),
    ) ||
    !match.roster.includes(actorId)
  )
    return failure("NOT_AUTHORIZED");
  if (now >= (match.rounds.at(-1)?.stageDueAt ?? 0)) return failure("CONFLICT");
  const last = state.lastSent[actorId];
  if (last !== undefined && now - last < 2000) return failure("RATE_LIMITED");
  const audience = [
    ...room.players.filter((p) => now < playerGraceEndsAt(p)),
    ...room.observers,
  ].map((p) => p.profileId);
  return success({
    ...state,
    version: state.version + 1,
    lastSent: { ...state.lastSent, [actorId]: now },
    reactions: [
      ...state.reactions.filter((r) => r.expiresAt > now),
      { id, actorId, emoji, sentAt: now, expiresAt: now + 5000, audience },
    ].slice(-100),
  });
}
export function visibleReactions(state: ReactionState, now: number) {
  return state.reactions
    .filter((r) => r.sentAt <= now && now < r.expiresAt)
    .map(({ id, actorId, emoji, sentAt, expiresAt }) => ({
      id,
      actorId,
      emoji,
      sentAt,
      expiresAt,
    }));
}
