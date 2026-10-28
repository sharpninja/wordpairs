import type { Catalog } from "../domain/catalog";
import {
  activateCase,
  appealCase,
  CONTENT_ID,
  type ContentState,
  type CuratedPackage,
  changeReviewState,
  contentProjection,
  disablePair,
  futureEligible,
  nominate,
  openSuggestionStatuses,
  type Proposal,
  resolveAppeal,
  resubmitSuggestion,
  reviewCase,
  saveCatalogPair,
  suggestCategory,
} from "../domain/content";
import { playerGraceEndsAt } from "../domain/lobby";
import type { Actor, Match, Pair, Room } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import { executeCommand } from "./command";
import type {
  AuditRecord,
  Clock,
  Command,
  IdSource,
  TransactionStore,
  Transition,
} from "./ports";
export type ContentAction =
  | { type: "nominate"; roomId: string; roundId: string; word: string }
  | { type: "suggest"; proposal: Proposal }
  | { type: "resubmit"; caseId: string; proposal: Proposal }
  | {
      type: "request-changes" | "hold" | "resume";
      caseId: string;
      reason: string;
    }
  | {
      type: "review";
      caseId: string;
      decision: "approve" | "reject";
      reason: string;
    }
  | { type: "appeal"; caseId: string; reason: string }
  | {
      type: "resolve";
      caseId: string;
      outcome: "uphold" | "overturn";
      reason: string;
    }
  | { type: "activate"; caseId: string; content: CuratedPackage }
  | { type: "disable"; pairId: string; pairVersion: number; reason: string }
  | { type: "save-pair"; pair: Pair; reason: string };
export interface ContentContext {
  actor: Actor;
  wins: number;
  catalog: Catalog;
  room?: Room;
  match?: Match;
  audits?: AuditRecord[];
}
export interface ContentPort {
  read(
    actorId: string,
  ): Promise<Result<{ state: ContentState; evidence: ContentContext }>>;
  transact<T>(
    command: Command,
    action: ContentAction,
    decide: (
      state: ContentState,
      evidence: ContentContext,
    ) => Promise<Result<Transition<ContentState, T>>>,
  ): Promise<Result<Transition<ContentState, T>>>;
}
export class ContentService {
  constructor(
    private repository: ContentPort,
    private clock: Clock,
    private ids: IdSource,
  ) {}
  async view(actorId: string) {
    const result = await this.repository.read(actorId);
    if (!result.ok) return result;
    const { state, evidence } = result.value;
    const projection = contentProjection(state, evidence.actor);
    const ids = new Set(projection.cases.map((c) => c.id));
    return success({
      ...projection,
      actorId,
      nominatedRoundIds: state.cases
        .flatMap((c) => c.nominationEvidence ?? [])
        .filter((v) => v.profileId === actorId)
        .map((v) => v.roundId),
      wins: evidence.wins,
      canSuggest:
        evidence.wins >= 10 &&
        !state.cases.some(
          (c) =>
            c.kind === "suggestion" &&
            c.proposerId === actorId &&
            openSuggestionStatuses.includes(c.status),
        ),
      categories: evidence.catalog.categories.map((c) => ({ ...c })),
      catalogPairs: projection.canModerate
        ? evidence.catalog.pairs.map((p) => ({
            ...p,
            selectable: p.selectable !== false,
          }))
        : [],
      audit: (evidence.audits ?? [])
        .filter(
          (a) => projection.canModerate || ids.has(String(a.details.caseId)),
        )
        .map((a) => ({
          actorId: projection.canModerate ? a.actorId : null,
          action: a.action,
          at: a.at,
          caseId: a.details.caseId,
          caseVersion: a.details.caseVersion ?? null,
          previousProposal: a.details.previousProposal ?? null,
          proposal: a.details.proposal ?? null,
          reason: a.details.reason ?? null,
          previousStatus: a.details.previousStatus ?? null,
          status: a.details.status ?? null,
          nominationCount: a.details.nominationCount ?? null,
          futureEligible: a.details.futureEligible ?? null,
          playable: a.details.playable ?? null,
          pairId: a.details.pairId ?? null,
          pairVersion: a.details.pairVersion ?? null,
        })),
    });
  }
  async act(command: Command, action: ContentAction) {
    if (command.aggregateId !== CONTENT_ID) return failure("VALIDATION_ERROR");
    let context: ContentContext | undefined;
    const store: TransactionStore<ContentState> = {
      transact: (input, decide) =>
        this.repository.transact(input, action, async (state, evidence) => {
          context = evidence;
          return decide(state);
        }),
    };
    return executeCommand(
      command,
      {
        clock: this.clock,
        quota: { check: async () => success(undefined) },
        store,
      },
      (state: ContentState, now) => {
        const evidence = context;
        if (!evidence || evidence.actor.profileId !== command.actorId)
          return failure("NOT_AUTHORIZED");
        const actor = evidence.actor;
        let changed: Result<ContentState>;
        if (action.type === "nominate") {
          const { room, match } = evidence;
          if (
            !room ||
            !match ||
            room.id !== action.roomId ||
            match.rounds.at(-1)?.id !== action.roundId ||
            !room.players.some(
              (p) =>
                p.profileId === actor.profileId &&
                (room.status === "closed" || now < playerGraceEndsAt(p)),
            )
          )
            return failure("NOT_AUTHORIZED");
          changed = nominate(state, match, actor, action.word, now, () =>
            this.ids.next(),
          );
        } else if (action.type === "suggest")
          changed = suggestCategory(
            state,
            actor,
            evidence.wins,
            action.proposal,
            now,
            () => this.ids.next(),
            evidence.catalog,
          );
        else if (action.type === "resubmit")
          changed = resubmitSuggestion(
            state,
            action.caseId,
            actor,
            action.proposal,
            now,
            evidence.catalog,
          );
        else if (
          action.type === "request-changes" ||
          action.type === "hold" ||
          action.type === "resume"
        )
          changed = changeReviewState(
            state,
            action.caseId,
            actor,
            action.type,
            action.reason,
            now,
          );
        else if (action.type === "review")
          changed = reviewCase(
            state,
            action.caseId,
            actor,
            action.decision,
            action.reason,
            now,
          );
        else if (action.type === "appeal")
          changed = appealCase(state, action.caseId, actor, action.reason, now);
        else if (action.type === "resolve")
          changed = resolveAppeal(
            state,
            action.caseId,
            actor,
            action.outcome,
            action.reason,
            now,
          );
        else if (action.type === "activate")
          changed = activateCase(
            state,
            action.caseId,
            actor,
            action.content,
            now,
            evidence.catalog,
          );
        else if (action.type === "save-pair")
          changed = saveCatalogPair(
            state,
            actor,
            action.pair,
            action.reason,
            now,
            evidence.catalog,
            () => this.ids.next(),
          );
        else if (action.type === "disable")
          changed = disablePair(
            state,
            actor,
            action.pairId,
            action.pairVersion,
            action.reason,
            now,
            evidence.catalog,
          );
        else return failure("VALIDATION_ERROR");
        if (!changed.ok) return changed;
        const next = changed.value;
        const item = next.cases.find(
          (c) =>
            !state.cases.some(
              (old) => old.id === c.id && old.version === c.version,
            ),
        );
        const prior = state.cases.find((c) => c.id === item?.id);
        const result = {
          version: next.version,
          ...(item
            ? {
                caseId: item.id,
                status: item.status,
                nominationCount: item.nominatorIds.length,
                futureEligible: futureEligible(item),
                playable: item.playable,
              }
            : {}),
        };
        const actionName =
          action.type === "resolve"
            ? action.outcome === "overturn"
              ? "overturned"
              : "upheld"
            : action.type === "review"
              ? action.decision === "approve"
                ? "approved"
                : "rejected"
              : action.type;
        return success({
          state: next,
          result,
          deadlines: [],
          events: [
            {
              id: this.ids.next(),
              aggregateType: "moderation" as const,
              aggregateId: state.id,
              version: next.version,
              schemaVersion: 1 as const,
              type: "ContentChanged",
              audience: item
                ? [
                    ...new Set([
                      actor.profileId,
                      item.proposerId,
                      ...item.nominatorIds,
                    ]),
                  ]
                : [actor.profileId],
              payload: {},
            },
          ],
          audits: [
            {
              id: this.ids.next(),
              actorId: actor.profileId,
              targetId: state.id,
              action: actionName,
              at: now,
              details: {
                policyVersion: "2.6",
                caseId: item?.id ?? null,
                caseVersion: item?.version ?? null,
                previousStatus: prior?.status ?? null,
                status: item?.status ?? null,
                nominationCount: item?.nominatorIds.length ?? null,
                futureEligible: item ? futureEligible(item) : false,
                playable: item?.playable ?? false,
                ...(item?.proposal
                  ? {
                      previousProposal: prior?.proposal
                        ? {
                            category: prior.proposal.category,
                            pairs: prior.proposal.pairs.map((p) => ({ ...p })),
                          }
                        : null,
                      proposal: {
                        category: item.proposal.category,
                        pairs: item.proposal.pairs.map((p) => ({ ...p })),
                      },
                    }
                  : {}),
                reason:
                  "reason" in action ? action.reason : (item?.reason ?? null),
                ...(action.type === "save-pair"
                  ? { pairId: action.pair.id, pairVersion: action.pair.version }
                  : {}),
                ...(action.type === "disable"
                  ? { pairId: action.pairId, pairVersion: action.pairVersion }
                  : {}),
              },
            },
          ],
        });
      },
    );
  }
}
