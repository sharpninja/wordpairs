import { allowed } from "./access";
import {
  buildCatalog,
  type Catalog,
  categoryPool,
  normalizeAnswer,
} from "./catalog";
import type { Actor, Category, Match, ModerationCase, Pair } from "./model";
import { failure, type Result, success } from "./result";
export const CONTENT_ID = "content-catalog";
export const BACKGROUND_IDS = [
  "heroes",
  "colors",
  "years",
  "directors",
  "singers",
  "opposites",
] as const;
export interface Proposal {
  category: string;
  pairs: { prompt: string; target: string }[];
}
export interface CuratedPackage {
  category: Category;
  pairs: Pair[];
}
export interface ContentCase extends ModerationCase {
  futureEligible?: boolean;
  createdAt: number;
  updatedAt: number;
  normalizedWord?: string;
  originalReviewerId: string | null;
  nominationEvidence?: {
    profileId: string;
    matchId: string;
    roundId: string;
    at: number;
  }[];
  winsAtSubmission?: number;
  proposal?: Proposal;
  curated?: CuratedPackage;
}
export interface ContentState {
  id: string;
  version: number;
  sourceRoomId: null;
  cases: ContentCase[];
  publications: { caseId: string; content: CuratedPackage; at: number }[];
  disabled: { pairId: string; version: number; reason: string; at: number }[];
}
export const emptyContent = (): ContentState => ({
  id: CONTENT_ID,
  version: 0,
  sourceRoomId: null,
  cases: [],
  publications: [],
  disabled: [],
});
export const canModerate = (actor: Actor) => allowed(actor, "moderate");
export const openSuggestionStatuses = [
  "collecting",
  "pending",
  "pending_review",
  "changes_requested",
  "appealed",
];
const pendingReview = (item: ContentCase) =>
  item.status === "pending" || item.status === "pending_review";
export const cleanText = (value: unknown, max = 200): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= max &&
  !/[\p{Cc}\p{Cs}<>]/u.test(value);
function change(state: ContentState, next: ContentCase): ContentState {
  next = { ...next, futureEligible: futureEligible(next) };
  return {
    ...state,
    version: state.version + 1,
    cases: state.cases.some((c) => c.id === next.id)
      ? state.cases.map((c) => (c.id === next.id ? next : c))
      : [...state.cases, next],
  };
}
const edited = (item: ContentCase, at: number): ContentCase => ({
  ...item,
  version: item.version + 1,
  updatedAt: at,
});
export function futureEligible(item: ContentCase) {
  return (
    item.status === "approved" &&
    (item.kind === "suggestion" || item.nominatorIds.length >= 10)
  );
}
function anotherOpenSuggestion(state: ContentState, item: ContentCase) {
  return (
    item.kind === "suggestion" &&
    state.cases.some(
      (c) =>
        c.id !== item.id &&
        c.kind === "suggestion" &&
        c.proposerId === item.proposerId &&
        openSuggestionStatuses.includes(c.status),
    )
  );
}
export function nominate(
  state: ContentState,
  match: Match,
  actor: Actor,
  word: string,
  now: number,
  nextId: () => string,
): Result<ContentState> {
  const round = match.rounds.at(-1);
  const solve = round?.solves.find((s) => s.profileId === actor.profileId);
  if (
    !round?.revealed ||
    !["summary", "finished"].includes(match.status) ||
    !solve ||
    solve.stage !== 0 ||
    !match.roster.includes(actor.profileId)
  )
    return failure("NOT_AUTHORIZED");
  if (!cleanText(word) || !cleanText(normalizeAnswer(word)))
    return failure("VALIDATION_ERROR");
  if (
    state.cases
      .flatMap((c) => c.nominationEvidence ?? [])
      .some((v) => v.profileId === actor.profileId && v.roundId === round.id)
  )
    return failure("CONFLICT");
  const normalizedWord = normalizeAnswer(word);
  const prior = state.cases.find(
    (c) => c.kind === "nomination" && c.normalizedWord === normalizedWord,
  );
  if (prior?.nominatorIds.includes(actor.profileId)) return failure("CONFLICT");
  if (
    (state.cases.length >= 512 && !prior) ||
    state.cases.reduce((n, c) => n + (c.nominationEvidence?.length ?? 0), 0) >=
      4096
  )
    return failure("SERVICE_LIMIT");
  const item: ContentCase = prior
    ? edited(prior, now)
    : {
        id: nextId(),
        version: 0,
        sourceRoomId: match.roomId,
        kind: "nomination",
        proposerId: actor.profileId,
        payload: { word: word.trim() },
        normalizedWord,
        nominatorIds: [],
        status: "collecting",
        reviewerId: null,
        originalReviewerId: null,
        reason: null,
        appealed: false,
        appealResolved: false,
        playable: false,
        createdAt: now,
        updatedAt: now,
      };
  item.nominatorIds = [...item.nominatorIds, actor.profileId];
  item.nominationEvidence = [
    ...(item.nominationEvidence ?? []),
    {
      profileId: actor.profileId,
      matchId: match.id,
      roundId: round.id,
      at: now,
    },
  ];
  if (item.status === "collecting" && item.nominatorIds.length >= 10)
    item.status = "pending";
  return success(change(state, item));
}
export function suggestCategory(
  state: ContentState,
  actor: Actor,
  wins: number,
  proposal: Proposal,
  now: number,
  nextId: () => string,
  catalog: Catalog,
): Result<ContentState> {
  if (wins < 10) return failure("NOT_AUTHORIZED");
  if (
    state.cases.some(
      (c) =>
        c.kind === "suggestion" &&
        c.proposerId === actor.profileId &&
        openSuggestionStatuses.includes(c.status),
    )
  )
    return failure("CONFLICT");
  if (
    !proposal ||
    !cleanText(proposal.category, 80) ||
    !Array.isArray(proposal.pairs) ||
    proposal.pairs.length !== 3 ||
    proposal.pairs.some(
      (p) => !p || !cleanText(p.prompt) || !cleanText(p.target),
    ) ||
    new Set(
      proposal.pairs.map(
        (p) => `${normalizeAnswer(p.prompt)}\u0000${normalizeAnswer(p.target)}`,
      ),
    ).size !== 3 ||
    catalog.categories.some(
      (c) => normalizeAnswer(c.name) === normalizeAnswer(proposal.category),
    )
  )
    return failure("VALIDATION_ERROR");
  if (state.cases.length >= 512) return failure("SERVICE_LIMIT");
  return success(
    change(state, {
      id: nextId(),
      version: 0,
      sourceRoomId: null,
      kind: "suggestion",
      proposerId: actor.profileId,
      payload: { category: proposal.category },
      proposal: structuredClone(proposal),
      winsAtSubmission: wins,
      nominatorIds: [],
      status: "pending",
      reviewerId: null,
      originalReviewerId: null,
      reason: null,
      appealed: false,
      appealResolved: false,
      playable: false,
      createdAt: now,
      updatedAt: now,
    }),
  );
}
export function reviewCase(
  state: ContentState,
  id: string,
  actor: Actor,
  decision: "approve" | "reject",
  reason: string,
  now: number,
): Result<ContentState> {
  const item = state.cases.find((c) => c.id === id);
  if (!item) return failure("NOT_FOUND");
  if (!canModerate(actor) || item.proposerId === actor.profileId)
    return failure("NOT_AUTHORIZED");
  if (!cleanText(reason, 1000) || !["approve", "reject"].includes(decision))
    return failure("VALIDATION_ERROR");
  if (!pendingReview(item)) return failure("CONFLICT");
  return success(
    change(state, {
      ...edited(item, now),
      status: decision === "approve" ? "approved" : "rejected",
      reviewerId: actor.profileId,
      originalReviewerId: actor.profileId,
      reason,
    }),
  );
}
/** Review deferrals do not publish content or consume the rejection appeal. */
export function changeReviewState(
  state: ContentState,
  id: string,
  actor: Actor,
  action: "request-changes" | "hold" | "resume",
  reason: string,
  now: number,
): Result<ContentState> {
  const item = state.cases.find((c) => c.id === id);
  if (!item) return failure("NOT_FOUND");
  if (!canModerate(actor) || item.proposerId === actor.profileId)
    return failure("NOT_AUTHORIZED");
  if (!cleanText(reason, 1000)) return failure("VALIDATION_ERROR");
  const valid =
    action === "request-changes"
      ? item.kind === "suggestion" && pendingReview(item)
      : action === "hold"
        ? item.kind === "nomination" && pendingReview(item)
        : action === "resume" &&
          item.kind === "nomination" &&
          item.status === "on_hold" &&
          new Set(item.nominatorIds).size >= 10;
  if (!valid || item.playable) return failure("CONFLICT");
  return success(
    change(state, {
      ...edited(item, now),
      status:
        action === "request-changes"
          ? "changes_requested"
          : action === "hold"
            ? "on_hold"
            : "pending_review",
      reviewerId: actor.profileId,
      reason: reason.trim(),
    }),
  );
}
export function resubmitSuggestion(
  state: ContentState,
  id: string,
  actor: Actor,
  proposal: Proposal,
  now: number,
  catalog: Catalog,
): Result<ContentState> {
  const item = state.cases.find((c) => c.id === id);
  if (!item) return failure("NOT_FOUND");
  if (item.proposerId !== actor.profileId) return failure("NOT_AUTHORIZED");
  if (
    item.kind !== "suggestion" ||
    item.status !== "changes_requested" ||
    item.playable ||
    anotherOpenSuggestion(state, item)
  )
    return failure("CONFLICT");
  // Reuse the initial proposal validation without adding a second case or
  // requiring another ten wins. The original eligibility snapshot is retained.
  const checked = suggestCategory(
    { ...state, cases: state.cases.filter((c) => c.id !== id) },
    actor,
    10,
    proposal,
    now,
    () => id,
    catalog,
  );
  if (!checked.ok) return checked;
  return success(
    change(state, {
      ...edited(item, now),
      proposal: structuredClone(proposal),
      payload: { category: proposal.category },
      status: "pending_review",
      reviewerId: null,
      originalReviewerId: null,
      reason: null,
    }),
  );
}
export function appealCase(
  state: ContentState,
  id: string,
  actor: Actor,
  reason: string,
  now: number,
): Result<ContentState> {
  const item = state.cases.find((c) => c.id === id);
  if (!item) return failure("NOT_FOUND");
  if (item.proposerId !== actor.profileId) return failure("NOT_AUTHORIZED");
  if (item.status !== "rejected" || item.appealed) return failure("CONFLICT");
  if (anotherOpenSuggestion(state, item)) return failure("CONFLICT");
  if (!cleanText(reason, 1000)) return failure("VALIDATION_ERROR");
  return success(
    change(state, {
      ...edited(item, now),
      status: "appealed",
      reason,
      appealed: true,
    }),
  );
}
export function resolveAppeal(
  state: ContentState,
  id: string,
  actor: Actor,
  outcome: "uphold" | "overturn",
  reason: string,
  now: number,
): Result<ContentState> {
  const item = state.cases.find((c) => c.id === id);
  if (!item) return failure("NOT_FOUND");
  if (
    !allowed(actor, "resolve-appeals") ||
    item.proposerId === actor.profileId ||
    item.originalReviewerId === actor.profileId
  )
    return failure("NOT_AUTHORIZED");
  if (!cleanText(reason, 1000) || !["uphold", "overturn"].includes(outcome))
    return failure("VALIDATION_ERROR");
  if (item.status !== "appealed" || item.appealResolved)
    return failure("CONFLICT");
  return success(
    change(state, {
      ...edited(item, now),
      status: outcome === "overturn" ? "approved" : "rejected",
      reviewerId: actor.profileId,
      reason,
      appealResolved: true,
    }),
  );
}
export function activateCase(
  state: ContentState,
  id: string,
  actor: Actor,
  content: CuratedPackage,
  now: number,
  catalog: Catalog,
): Result<ContentState> {
  const item = state.cases.find((c) => c.id === id);
  if (!item) return failure("NOT_FOUND");
  if (!canModerate(actor) || item.proposerId === actor.profileId)
    return failure("NOT_AUTHORIZED");
  if (!futureEligible(item) || item.playable) return failure("CONFLICT");
  if (
    !content?.category ||
    !Array.isArray(content.pairs) ||
    content.pairs.length !== (item.kind === "nomination" ? 1 : 3) ||
    !content.category.approved ||
    !BACKGROUND_IDS.some((id) => id === content.category.backgroundId) ||
    !cleanText(content.category.name, 80) ||
    !/^[a-z0-9-]{1,128}$/.test(content.category.id) ||
    content.pairs.some(
      (p) =>
        !p?.approved ||
        !/^[-A-Za-z0-9_]{1,128}$/.test(p.id) ||
        !cleanText(p.prompt) ||
        !cleanText(p.target) ||
        !Array.isArray(p.hints) ||
        p.hints.some((h) => !cleanText(h, 400)) ||
        !Array.isArray(p.acceptedAnswers) ||
        p.acceptedAnswers.some((a) => !cleanText(a)),
    )
  )
    return failure("VALIDATION_ERROR");
  const existing = catalog.categories.find((c) => c.id === content.category.id);
  if (
    (existing &&
      (existing.name !== content.category.name ||
        existing.version !== content.category.version ||
        existing.backgroundId !== content.category.backgroundId ||
        existing.approved !== content.category.approved)) ||
    (!existing &&
      catalog.categories.some(
        (c) =>
          normalizeAnswer(c.name) === normalizeAnswer(content.category.name),
      ))
  )
    return failure("CONFLICT");
  if (
    item.kind === "nomination" &&
    normalizeAnswer(content.pairs[0].target) !== item.normalizedWord
  )
    return failure("VALIDATION_ERROR");
  if (
    item.kind === "suggestion" &&
    (normalizeAnswer(content.category.name) !==
      normalizeAnswer(item.proposal?.category ?? "") ||
      content.pairs.some(
        (p, i) =>
          normalizeAnswer(p.target) !==
          normalizeAnswer(item.proposal?.pairs[i]?.target ?? ""),
      ))
  )
    return failure("VALIDATION_ERROR");
  if (
    content.pairs.some(
      (p) => p.version !== 0 || catalog.pairs.some((old) => old.id === p.id),
    )
  )
    return failure("CONFLICT");
  const checked = buildCatalog([content.category], content.pairs, [
    content.category.id,
  ]);
  if (!checked.ok || checked.value.pairs.length !== content.pairs.length)
    return failure("VALIDATION_ERROR");
  if (catalog.pairs.length + content.pairs.length > 4096)
    return failure("SERVICE_LIMIT");
  const next = change(state, {
    ...edited(item, now),
    playable: true,
    curated: structuredClone(content),
  });
  return success({
    ...next,
    publications: [
      ...state.publications,
      { caseId: id, content: structuredClone(content), at: now },
    ],
  });
}
export function disablePair(
  state: ContentState,
  actor: Actor,
  pairId: string,
  version: number,
  reason: string,
  now: number,
  catalog: Catalog,
): Result<ContentState> {
  if (!canModerate(actor)) return failure("NOT_AUTHORIZED");
  if (!cleanText(reason, 1000)) return failure("VALIDATION_ERROR");
  if (!catalog.pairs.some((p) => p.id === pairId && p.version === version))
    return failure("NOT_FOUND");
  const pair = catalog.pairs.find(
    (p) => p.id === pairId && p.version === version,
  );
  if (
    pair &&
    catalog.initialCategoryIds.includes(pair.categoryId) &&
    categoryPool(catalog, pair.categoryId).filter(
      (p) => p.id !== pairId || p.version !== version,
    ).length === 0
  )
    return failure("CONFLICT");
  if (state.disabled.some((p) => p.pairId === pairId && p.version === version))
    return failure("CONFLICT");
  return success({
    ...state,
    version: state.version + 1,
    disabled: [...state.disabled, { pairId, version, reason, at: now }],
  });
}
/** Append-only editorial save: existing rounds keep the previous pair version. */
export function saveCatalogPair(
  state: ContentState,
  actor: Actor,
  pair: Pair,
  reason: string,
  now: number,
  catalog: Catalog,
  nextId: () => string,
): Result<ContentState> {
  if (!allowed(actor, "manage-content")) return failure("NOT_AUTHORIZED");
  const category = catalog.categories.find((c) => c.id === pair?.categoryId);
  if (
    !category ||
    !pair ||
    !/^[-A-Za-z0-9_]{1,128}$/.test(pair.id) ||
    !pair.approved ||
    !cleanText(reason, 1000) ||
    !cleanText(pair.prompt) ||
    !cleanText(pair.target) ||
    !Array.isArray(pair.hints) ||
    pair.hints.length !== 3 ||
    pair.hints.some((h) => !cleanText(h, 400)) ||
    !Array.isArray(pair.acceptedAnswers) ||
    pair.acceptedAnswers.length > 20 ||
    pair.acceptedAnswers.some((a) => !cleanText(a)) ||
    pair.backgroundId !== category.backgroundId
  )
    return failure("VALIDATION_ERROR");
  const previous = catalog.pairs.filter((p) => p.id === pair.id);
  const expectedVersion = previous.length
    ? Math.max(...previous.map((p) => p.version)) + 1
    : 0;
  if (
    pair.version !== expectedVersion ||
    previous.some((p) => p.categoryId !== pair.categoryId)
  )
    return failure("CONFLICT");
  const checked = buildCatalog([category], [pair], [category.id]);
  if (!checked.ok) return checked;
  if (catalog.pairs.length >= 4096) return failure("SERVICE_LIMIT");
  return success({
    ...state,
    version: state.version + 1,
    publications: [
      ...state.publications,
      {
        caseId: nextId(),
        content: { category, pairs: [structuredClone(pair)] },
        at: now,
      },
    ],
  });
}
export function contentProjection(state: ContentState, actor: Actor) {
  const moderator = canModerate(actor);
  return {
    version: state.version,
    canModerate: moderator,
    isSenior: allowed(actor, "resolve-appeals"),
    cases: state.cases
      .filter(
        (c) =>
          c.proposerId === actor.profileId ||
          c.nominatorIds.includes(actor.profileId) ||
          (moderator && c.status !== "collecting"),
      )
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        version: c.version,
        kind: c.kind,
        word: c.payload.word ?? null,
        proposal: c.proposal ?? null,
        status: c.status,
        nominationCount: c.nominatorIds.length,
        futureEligible: futureEligible(c),
        playable: c.playable,
        reason: c.reason,
        createdAt: c.createdAt,
        canReview:
          moderator && c.proposerId !== actor.profileId && pendingReview(c),
        canRequestChanges:
          moderator &&
          c.proposerId !== actor.profileId &&
          c.kind === "suggestion" &&
          pendingReview(c),
        canResubmit:
          c.proposerId === actor.profileId &&
          c.kind === "suggestion" &&
          c.status === "changes_requested",
        canHold:
          moderator &&
          c.proposerId !== actor.profileId &&
          c.kind === "nomination" &&
          pendingReview(c),
        canResume:
          moderator &&
          c.proposerId !== actor.profileId &&
          c.kind === "nomination" &&
          c.status === "on_hold" &&
          new Set(c.nominatorIds).size >= 10,
        canAppeal:
          c.proposerId === actor.profileId &&
          c.status === "rejected" &&
          !c.appealed &&
          !anotherOpenSuggestion(state, c),
        canResolve:
          allowed(actor, "resolve-appeals") &&
          c.proposerId !== actor.profileId &&
          c.originalReviewerId !== actor.profileId &&
          c.status === "appealed",
        canActivate:
          moderator &&
          c.proposerId !== actor.profileId &&
          futureEligible(c) &&
          !c.playable,
      })),
  };
}
