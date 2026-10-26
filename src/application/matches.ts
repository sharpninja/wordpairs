import { type Catalog, categoryPool } from "../domain/catalog";
import { playerGraceEndsAt } from "../domain/lobby";
import {
  chooseCategory,
  continueAutoRound,
  createMatch,
  expireStage,
  matchProjection,
  submitAnswer,
} from "../domain/match";
import type { Deadline, Match, Room } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import { roomRole } from "../domain/rooms";
import { executeCommand } from "./command";
import type {
  Clock,
  Command,
  IdSource,
  MatchRepository,
  RandomSource,
} from "./ports";

/** Locks the owning room before the match and validates current player authority. */
export interface MatchDirectory extends MatchRepository {
  ensure(
    roomId: string,
    factory: (room: Room) => Result<Match>,
  ): Promise<Result<Match>>;
}
export interface CatalogReader {
  read(): Promise<Result<Catalog>>;
}
export type MatchAction =
  | { type: "choose"; categoryId: string }
  | { type: "continue" }
  | { type: "answer"; roundId: string; stage: number; answer: string };
export type MatchCommandResult = {
  matchId: string;
  version: number;
  correct?: boolean;
  points?: number;
};
export function matchDeadlines(match: Match, nextId: () => string): Deadline[] {
  const round = match.rounds.at(-1);
  return match.status === "playing" && round
    ? [
        {
          id: nextId(),
          aggregateId: match.id,
          expectedVersion: match.version,
          kind: "stage",
          dueAt: round.stageDueAt,
        },
      ]
    : [];
}
export class MatchService {
  constructor(
    private repository: MatchDirectory,
    private content: CatalogReader,
    private clock: Clock,
    private ids: IdSource,
    private random: RandomSource,
  ) {}
  async open(roomId: string) {
    const catalog = await this.content.read();
    if (!catalog.ok) return catalog;
    return this.repository.ensure(roomId, (room) =>
      room.status === "playing" &&
      room.startedAt !== undefined &&
      catalog.value.initialCategoryIds.length === 6 &&
      catalog.value.initialCategoryIds.every(
        (id) => categoryPool(catalog.value, id).length >= 10,
      )
        ? createMatch(
            room.id,
            room.id,
            room.startedRoster ?? [],
            this.random,
            room.startedAt,
          )
        : failure("CONFLICT"),
    );
  }
  async view(room: Room, actorId: string) {
    const role = roomRole(room, actorId);
    if (!role) return failure("NOT_AUTHORIZED");
    const perspective =
      role === "player"
        ? actorId
        : room.observers.find((o) => o.profileId === actorId)?.followedPlayerId;
    if (
      !perspective ||
      !room.players.some(
        (p) =>
          p.profileId === perspective &&
          (room.status === "closed" || this.clock.now() < playerGraceEndsAt(p)),
      )
    )
      return failure("NOT_AUTHORIZED");
    const match = await this.open(room.id);
    if (!match.ok) return match;
    const catalog = await this.content.read();
    if (!catalog.ok) return catalog;
    const projected = matchProjection(match.value, perspective, catalog.value);
    return projected.ok
      ? success({
          ...projected.value,
          chooserPresent: room.players.some(
            (p) =>
              p.profileId === match.value.chooserId &&
              (room.status === "closed" ||
                this.clock.now() < playerGraceEndsAt(p)),
          ),
          activePlayerIds: room.players.map((p) => p.profileId),
        })
      : projected;
  }
  private transition(
    match: Match,
    next: Match,
    result: Result<MatchCommandResult>,
  ) {
    return {
      state: next,
      result,
      events: [
        {
          id: this.ids.next(),
          aggregateType: "match" as const,
          aggregateId: match.id,
          version: next.version,
          schemaVersion: 1 as const,
          type: "MatchChanged",
          audience: [...match.roster],
          payload: { roomId: match.roomId },
        },
      ],
      deadlines: matchDeadlines(next, () => this.ids.next()),
      audits: [],
    };
  }
  async act(
    command: Command,
    action: MatchAction,
  ): Promise<Result<MatchCommandResult>> {
    const catalog = await this.content.read();
    if (!catalog.ok) return catalog;
    const committed = await executeCommand(
      command,
      {
        store: this.repository,
        clock: this.clock,
        quota: { check: async () => success(undefined) },
      },
      (match, now) => {
        if (!match.roster.includes(command.actorId))
          return failure("NOT_AUTHORIZED");
        const round = match.rounds.at(-1);
        const catchup =
          match.status === "playing" && round && now >= round.stageDueAt
            ? expireStage(match, now, catalog.value, this.random)
            : success(match);
        if (!catchup.ok) return catchup;
        const base = { ...catchup.value, version: match.version };
        const attempted =
          action.type === "choose"
            ? chooseCategory(
                base,
                command.actorId,
                action.categoryId,
                catalog.value,
                this.random,
                now,
                () => this.ids.next(),
              )
            : action.type === "continue"
              ? continueAutoRound(
                  base,
                  command.actorId,
                  catalog.value,
                  this.random,
                  now,
                  () => this.ids.next(),
                )
              : submitAnswer(
                  base,
                  command.actorId,
                  action.roundId,
                  action.stage,
                  action.answer,
                  catalog.value,
                  this.random,
                  now,
                );
        if (!attempted.ok && catchup.value === match) return attempted;
        const next = {
          ...(attempted.ok ? attempted.value : catchup.value),
          version: match.version + 1,
        };
        const solve =
          action.type === "answer"
            ? next.rounds
                .find((r) => r.id === action.roundId)
                ?.solves.find((s) => s.profileId === command.actorId)
            : null;
        const result: Result<MatchCommandResult> = attempted.ok
          ? success({
              matchId: match.id,
              version: next.version,
              ...(action.type === "answer"
                ? { correct: !!solve, points: solve?.points ?? 0 }
                : {}),
            })
          : attempted;
        return success(this.transition(match, next, result));
      },
    );
    return committed.ok ? committed.value : committed;
  }
  async expire(job: Deadline) {
    if (job.kind !== "stage") return failure("VALIDATION_ERROR");
    const catalog = await this.content.read();
    if (!catalog.ok) return catalog;
    const committed = await executeCommand(
      {
        aggregateId: job.aggregateId,
        actorId: "system:deadline",
        commandId: job.id,
        requestDigest: JSON.stringify(job),
        expectedVersion: job.expectedVersion,
      },
      {
        store: this.repository,
        clock: this.clock,
        quota: { check: async () => success(undefined) },
      },
      (match, now) => {
        if (match.rounds.at(-1)?.stageDueAt !== job.dueAt)
          return failure("CONFLICT");
        const next = expireStage(match, now, catalog.value, this.random);
        return next.ok
          ? success(
              this.transition(
                match,
                next.value,
                success({ matchId: match.id, version: next.value.version }),
              ),
            )
          : next;
      },
    );
    return committed.ok ? committed.value : committed;
  }
}
