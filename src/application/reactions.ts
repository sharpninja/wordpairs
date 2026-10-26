import { playerGraceEndsAt } from "../domain/lobby";
import type { Match, Room } from "../domain/model";
import {
  type ReactionState,
  sendReaction,
  visibleReactions,
} from "../domain/reactions";
import { failure, type Result, success } from "../domain/result";
import { roomRole } from "../domain/rooms";
import { executeCommand } from "./command";
import type {
  Clock,
  Command,
  IdSource,
  TransactionStore,
  Transition,
} from "./ports";
export interface ReactionPort {
  read(
    roomId: string,
    actorId: string,
  ): Promise<Result<{ state: ReactionState; room: Room; match: Match }>>;
  transact<T>(
    command: Command,
    decide: (
      state: ReactionState,
      room: Room,
      match: Match,
    ) => Promise<Result<Transition<ReactionState, T>>>,
  ): Promise<Result<Transition<ReactionState, T>>>;
}
export class ReactionService {
  constructor(
    private repository: ReactionPort,
    private clock: Clock,
    private ids: IdSource,
  ) {}
  async view(roomId: string, actorId: string) {
    const result = await this.repository.read(roomId, actorId);
    if (!result.ok) return result;
    const { state, room, match } = result.value;
    const role = roomRole(room, actorId);
    const now = this.clock.now();
    if (
      !role ||
      (role === "player" &&
        !room.players.some(
          (p) => p.profileId === actorId && now < playerGraceEndsAt(p),
        ))
    )
      return failure("NOT_AUTHORIZED");
    return success({
      actorId,
      version: state.version,
      serverNow: now,
      reactions:
        room.status === "playing" && match.status === "playing"
          ? visibleReactions(state, now)
          : [],
    });
  }
  async send(command: Command, emoji: string) {
    let room: Room | undefined;
    let match: Match | undefined;
    const store: TransactionStore<ReactionState> = {
      transact: (input, decide) =>
        this.repository.transact(
          input,
          async (state, owningRoom, owningMatch) => {
            room = owningRoom;
            match = owningMatch;
            return decide(state);
          },
        ),
    };
    return executeCommand(
      command,
      {
        store,
        clock: this.clock,
        quota: { check: async () => success(undefined) },
      },
      (state, now) => {
        if (!room || !match) return failure("NOT_AUTHORIZED");
        const next = sendReaction(
          state,
          room,
          match,
          command.actorId,
          emoji,
          now,
          this.ids.next(),
        );
        if (!next.ok) return next;
        const reaction = next.value.reactions.at(-1);
        if (!reaction) return failure("INTERNAL_ERROR");
        return success({
          state: next.value,
          result: {
            version: next.value.version,
            reactionId: reaction.id,
            expiresAt: reaction.expiresAt,
          },
          deadlines: [],
          audits: [],
          events: [
            {
              id: this.ids.next(),
              aggregateType: "moderation" as const,
              aggregateId: room.id,
              version: next.value.version,
              schemaVersion: 1 as const,
              type: "ReactionSent",
              audience: reaction.audience,
              payload: {},
            },
          ],
        });
      },
    );
  }
}
