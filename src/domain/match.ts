import {
  type Catalog,
  categoryPool,
  normalizeAnswer,
  roundPair,
} from "./catalog";
import type { Match, Round, Solve } from "./model";
import { failure, type Result, success } from "./result";

export const ANSWER_STAGE_MS = 20000;
export const MATCH_ROUNDS = 8;
type RandomSource = {
  integer(minInclusive: number, maxInclusive: number): number;
};
const POINTS = [5, 3, 2, 1] as const;
function draw(random: RandomSource, min: number, max: number): Result<number> {
  const value = random.integer(min, max);
  return Number.isInteger(value) && value >= min && value <= max
    ? success(value)
    : failure("INTERNAL_ERROR");
}
export function createMatch(
  id: string,
  roomId: string,
  roster: string[],
  random: RandomSource,
  now: number,
): Result<Match> {
  if (
    !id ||
    !roomId ||
    roster.length < 2 ||
    roster.length > 25 ||
    new Set(roster).size !== roster.length ||
    roster.some((p) => !p) ||
    !Number.isFinite(now)
  )
    return failure("VALIDATION_ERROR");
  const anchor = draw(random, 1, roster.length);
  if (!anchor.ok) return anchor;
  return success({
    id,
    roomId,
    version: 0,
    roster: [...roster],
    anchorId: roster[anchor.value - 1],
    chooserId: roster[anchor.value - 1],
    status: "choosing",
    rounds: [],
    usedPairIds: [],
    autoCategoryId: null,
    startedAt: now,
    finishedAt: null,
  });
}
function startRound(
  match: Match,
  categoryId: string,
  catalog: Catalog,
  random: RandomSource,
  now: number,
  nextId: () => string,
): Result<Match> {
  if (match.rounds.length >= MATCH_ROUNDS) return failure("ROOM_CLOSED");
  const pool = categoryPool(catalog, categoryId);
  if (!pool.length) return failure("NOT_FOUND");
  let used = [...match.usedPairIds];
  let available = pool.filter((p) => !used.includes(p.id));
  if (!available.length) {
    used = used.filter((id) => !pool.some((p) => p.id === id));
    available = pool;
  }
  const index = draw(random, 0, available.length - 1);
  if (!index.ok) return index;
  const pair = available[index.value];
  const id = nextId();
  if (!id || match.rounds.some((r) => r.id === id)) return failure("CONFLICT");
  const round: Round = {
    id,
    pairId: pair.id,
    pairVersion: pair.version,
    categoryId,
    startedAt: now,
    stage: 0,
    stageDueAt: now + ANSWER_STAGE_MS,
    submittedPlayerIds: [],
    solves: [],
    revealed: false,
    attempts: [],
  };
  return success({
    ...match,
    version: match.version + 1,
    status: "playing",
    autoCategoryId: null,
    rounds: [...match.rounds, round],
    usedPairIds: [...used, pair.id],
  });
}
export function chooseCategory(
  match: Match,
  actorId: string,
  categoryId: string,
  catalog: Catalog,
  random: RandomSource,
  now: number,
  nextId: () => string,
): Result<Match> {
  if (!match.roster.includes(actorId) || actorId !== match.chooserId)
    return failure("NOT_AUTHORIZED");
  if (!["choosing", "summary"].includes(match.status) || match.autoCategoryId)
    return failure("CONFLICT");
  return startRound(match, categoryId, catalog, random, now, nextId);
}
export function continueAutoRound(
  match: Match,
  actorId: string,
  catalog: Catalog,
  random: RandomSource,
  now: number,
  nextId: () => string,
): Result<Match> {
  if (!match.roster.includes(actorId)) return failure("NOT_AUTHORIZED");
  if (match.status !== "summary" || !match.autoCategoryId)
    return failure("CONFLICT");
  return startRound(match, match.autoCategoryId, catalog, random, now, nextId);
}
function replaceRound(match: Match, round: Round): Match {
  return { ...match, rounds: [...match.rounds.slice(0, -1), round] };
}
function endRound(
  match: Match,
  round: Round,
  catalog: Catalog,
  random: RandomSource,
  now: number,
): Result<Match> {
  const ended = replaceRound(match, { ...round, revealed: true, endedAt: now });
  if (match.rounds.length === MATCH_ROUNDS) {
    const finished: Match = {
      ...ended,
      status: "finished",
      chooserId: null,
      autoCategoryId: null,
      finishedAt: now,
    };
    const finalStandings = standings(finished);
    return success({
      ...finished,
      finalStandings,
      finalAwards: finalStandings.map((row) => ({
        profileId: row.profileId,
        points: row.points,
        winner: row.rank === 1,
      })),
    });
  }
  const first = [...round.solves].sort((a, b) => a.order - b.order)[0];
  if (first)
    return success({
      ...ended,
      status: "summary",
      chooserId: first.profileId,
      autoCategoryId: null,
    });
  if (
    catalog.initialCategoryIds.length !== 6 ||
    catalog.initialCategoryIds.some((id) => !categoryPool(catalog, id).length)
  )
    return failure("VALIDATION_ERROR");
  const category = draw(random, 0, 5);
  if (!category.ok) return category;
  return success({
    ...ended,
    status: "summary",
    chooserId: null,
    autoCategoryId: catalog.initialCategoryIds[category.value],
  });
}
function closeStage(
  match: Match,
  catalog: Catalog,
  random: RandomSource,
  now: number,
): Result<Match> {
  const round = match.rounds.at(-1);
  if (!round || match.status !== "playing") return failure("CONFLICT");
  if (round.solves.length === match.roster.length || round.stage === 3)
    return endRound(match, round, catalog, random, now);
  return success(
    replaceRound(match, {
      ...round,
      stage: round.stage + 1,
      stageDueAt: now + ANSWER_STAGE_MS,
      submittedPlayerIds: [],
    }),
  );
}
export function expireStage(
  match: Match,
  now: number,
  catalog: Catalog,
  random: RandomSource,
): Result<Match> {
  if (
    match.status !== "playing" ||
    !match.rounds.length ||
    now < (match.rounds.at(-1) as Round).stageDueAt
  )
    return failure("CONFLICT");
  let next = match;
  for (let step = 0; step < 4 && next.status === "playing"; step++) {
    const round = next.rounds.at(-1) as Round;
    if (now < round.stageDueAt) break;
    const changed = closeStage(next, catalog, random, round.stageDueAt);
    if (!changed.ok) return changed;
    next = changed.value;
  }
  return success({ ...next, version: match.version + 1 });
}
export function submitAnswer(
  match: Match,
  actorId: string,
  roundId: string,
  stage: number,
  answer: string,
  catalog: Catalog,
  random: RandomSource,
  now: number,
): Result<Match> {
  if (!match.roster.includes(actorId)) return failure("NOT_AUTHORIZED");
  const round = match.rounds.at(-1);
  if (
    match.status !== "playing" ||
    !round ||
    round.id !== roundId ||
    round.stage !== stage ||
    now >= round.stageDueAt ||
    now < round.startedAt ||
    round.solves.some((s) => s.profileId === actorId) ||
    round.submittedPlayerIds.includes(actorId)
  )
    return failure("CONFLICT");
  if (
    typeof answer !== "string" ||
    answer.length > 2000 ||
    !normalizeAnswer(answer) ||
    normalizeAnswer(answer).length > 200
  )
    return failure("VALIDATION_ERROR");
  const pair = roundPair(catalog, round.pairId, round.pairVersion);
  if (!pair) return failure("TEMPORARY_UNAVAILABLE");
  const correct = [pair.target, ...pair.acceptedAnswers].some(
    (a) => normalizeAnswer(a) === normalizeAnswer(answer),
  );
  const solve: Solve = {
    profileId: actorId,
    points: POINTS[stage],
    elapsedMs: now - round.startedAt,
    acceptedAt: now,
    order: round.solves.length,
    stage,
  };
  const updated = {
    ...round,
    attempts: [
      ...(round.attempts ?? []),
      { profileId: actorId, stage, acceptedAt: now, correct },
    ],
    submittedPlayerIds: [...round.submittedPlayerIds, actorId],
    solves: correct ? [...round.solves, solve] : [...round.solves],
  };
  let next = replaceRound(match, updated);
  const unsolved = match.roster.filter(
    (p) => !updated.solves.some((s) => s.profileId === p),
  );
  if (unsolved.every((p) => updated.submittedPlayerIds.includes(p))) {
    const closed = closeStage(next, catalog, random, now);
    if (!closed.ok) return closed;
    next = closed.value;
  }
  return success({ ...next, version: match.version + 1 });
}
export function standings(match: Match) {
  const rows = match.roster.map((profileId, index) => ({
    profileId,
    position: index + 1,
    points: match.rounds.reduce(
      (sum, r) =>
        sum + (r.solves.find((s) => s.profileId === profileId)?.points ?? 0),
      0,
    ),
    totalTimeMs: match.rounds.reduce(
      (sum, r) =>
        sum +
        (r.solves.find((s) => s.profileId === profileId)?.elapsedMs ??
          (r.revealed ? 80000 : 0)),
      0,
    ),
    rank: 0,
  }));
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      a.totalTimeMs - b.totalTimeMs ||
      a.position - b.position,
  );
  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    row.rank =
      previous &&
      previous.points === row.points &&
      previous.totalTimeMs === row.totalTimeMs
        ? previous.rank
        : index + 1;
  });
  return rows;
}
export function matchProjection(
  match: Match,
  perspectiveId: string,
  catalog: Catalog,
) {
  if (!match.roster.includes(perspectiveId)) return failure("NOT_AUTHORIZED");
  const current = match.rounds.at(-1);
  const pair = current
    ? roundPair(catalog, current.pairId, current.pairVersion)
    : null;
  if (current && !pair) return failure("TEMPORARY_UNAVAILABLE");
  const own = current?.solves.find((s) => s.profileId === perspectiveId);
  return success({
    matchId: match.id,
    version: match.version,
    status: match.status,
    roundNumber: match.rounds.length,
    roundsTotal: MATCH_ROUNDS,
    anchorId: match.anchorId,
    chooserId: match.chooserId,
    autoCategoryId: match.autoCategoryId ?? null,
    categories: catalog.categories
      .filter((c) => categoryPool(catalog, c.id).length)
      .map((c) => ({ id: c.id, name: c.name, backgroundId: c.backgroundId })),
    round:
      current && pair
        ? {
            roundId: current.id,
            stage: current.stage,
            pointsAvailable: POINTS[current.stage],
            stageDueAt: current.stageDueAt,
            prompt: pair.prompt,
            backgroundId: pair.backgroundId,
            hints: pair.hints.slice(0, own?.stage ?? current.stage),
            solved: !!own,
            nominationEligible: current.revealed && own?.stage === 0,
            submitted: current.submittedPlayerIds.includes(perspectiveId),
            canAnswer:
              match.status === "playing" &&
              !own &&
              !current.submittedPlayerIds.includes(perspectiveId),
            revealed: current.revealed,
            ...(current.revealed ? { correctAnswer: pair.target } : {}),
          }
        : null,
    scorecard: match.roster.map((profileId, index) => {
      const solve = current?.solves.find((s) => s.profileId === profileId);
      return {
        profileId,
        position: index + 1,
        solved: !!solve,
        points: solve?.points ?? 0,
        elapsedMs: solve?.elapsedMs ?? (current?.revealed ? 80000 : null),
      };
    }),
    standings: standings(match),
    history: match.rounds
      .filter((r) => r.revealed)
      .map((r) => ({
        roundId: r.id,
        categoryId: r.categoryId,
        correctAnswer:
          roundPair(catalog, r.pairId, r.pairVersion)?.target ?? "",
        ownPoints:
          r.solves.find((s) => s.profileId === perspectiveId)?.points ?? 0,
        ownElapsedMs:
          r.solves.find((s) => s.profileId === perspectiveId)?.elapsedMs ??
          80000,
      })),
  });
}
