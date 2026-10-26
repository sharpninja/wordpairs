import { isDeepStrictEqual } from 'node:util';
import { contractExpectations } from './oracle-contract-expectations.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ScenarioAction = {
  type: string;
  payload?: Record<string, JsonValue>;
};

export type ScenarioRequest = {
  setup: Record<string, JsonValue>;
  actions: ScenarioAction[];
};

export type NamedViolation = {
  name: string;
  observation: Record<string, JsonValue>;
};

export type OracleScenario = {
  id: string;
  request: ScenarioRequest;
  conformingObservation: Record<string, JsonValue>;
  contractExpected: Record<string, JsonValue>;
  violations: NamedViolation[];
  assertObservation: (observation: Record<string, JsonValue>) => void;
};

type ScenarioDraft = Omit<OracleScenario, 'contractExpected'>;

export interface AcScenarioDriver {
  execute(id: string, request: ScenarioRequest): Promise<Record<string, JsonValue>>;
}

export class ScriptedObservationDriver implements AcScenarioDriver {
  readonly requests: Array<{ id: string; request: ScenarioRequest }> = [];
  private readonly observations: ReadonlyMap<string, Record<string, JsonValue>>;

  constructor(observations: ReadonlyMap<string, Record<string, JsonValue>>) {
    this.observations = observations;
  }

  async execute(id: string, request: ScenarioRequest): Promise<Record<string, JsonValue>> {
    this.requests.push({ id, request: structuredClone(request) });
    const observation = this.observations.get(id);
    if (!observation) throw new Error(`No scripted observation for ${id}`);
    return structuredClone(observation);
  }
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function exact(expected: Record<string, JsonValue>): OracleScenario['assertObservation'] {
  return (observation) => {
    invariant(isDeepStrictEqual(observation, expected), 'raw observation did not exactly match the contract');
  };
}

function replaceAtPath(
  source: Record<string, JsonValue>,
  path: Array<string | number>,
  replacement: JsonValue,
): Record<string, JsonValue> {
  const copy = structuredClone(source);
  let cursor: JsonValue = copy;
  for (const segment of path.slice(0, -1)) cursor = (cursor as Record<string | number, JsonValue>)[segment];
  (cursor as Record<string | number, JsonValue>)[path.at(-1)!] = replacement;
  return copy;
}

function standard(
  id: string,
  action: string,
  setup: Record<string, JsonValue>,
  observation: Record<string, JsonValue>,
  violationPath: Array<string | number>,
  violatingValue: JsonValue,
  violationName: string,
): ScenarioDraft {
  const expected = contractExpectations[id as keyof typeof contractExpectations] as Record<string, JsonValue> | undefined;
  invariant(expected, `No independently authored contract expectation for ${id}`);
  return {
    id,
    request: { setup, actions: [{ type: action }] },
    conformingObservation: observation,
    violations: [{ name: violationName, observation: replaceAtPath(observation, violationPath, violatingValue) }],
    assertObservation: exact(expected),
  };
}

const standardScenarios: ScenarioDraft[] = [
  standard('AC-01-T01', 'join-room', { room: { id: 'room-a', capacity: 4, players: ['p1'] }, actor: 'p2' }, { attempts: [
    { path: 'code', authority: 'slot-authority', result: { membership: 'player', roomId: 'room-a' } },
    { path: 'browse', authority: 'slot-authority', result: { membership: 'player', roomId: 'room-a' } },
    { path: 'quick-match', authority: 'slot-authority', result: { membership: 'player', roomId: 'room-a' } },
    { path: 'deep-link', authority: 'slot-authority', result: { membership: 'player', roomId: 'room-a' } },
  ] }, ['attempts', 3, 'authority'], 'bypass-authority', 'deep link bypasses slot authority'),
  standard('AC-02-T01', 'configure-and-join-room', { capacities: [1, 2, 8, 25, 26], fullRoomPlayers: ['p1', 'p2'] }, { capacityResults: [
    { capacity: 1, accepted: false }, { capacity: 2, accepted: true }, { capacity: 8, accepted: true }, { capacity: 25, accepted: true }, { capacity: 26, accepted: false },
  ], fullJoin: { result: 'no-slot', playersAfter: ['p1', 'p2'], versionAfter: 7 } }, ['fullJoin', 'playersAfter'], ['p1', 'p2', 'p3'], 'full join mutates roster'),
  standard('AC-02-T02', 'claim-final-seat-concurrently', { capacity: 2, players: ['p1'], commands: ['join-2', 'join-3'] }, { results: [
    { commandId: 'join-2', result: 'joined' }, { commandId: 'join-3', result: 'no-slot' },
  ], playersAfter: ['p1', 'p2'], membershipsForFinalSeat: 1 }, ['membershipsForFinalSeat'], 2, 'both commands claim final seat'),
  standard('AC-03-T01', 'select-profile-icon', { profileId: 'p1', selectedIcon: 'owl' }, { persistedIcon: 'owl', projections: { room: 'owl', scorecard: 'owl', summary: 'owl', standings: 'owl' } }, ['projections', 'standings'], 'fox', 'standings uses stale icon'),
  standard('AC-04-T02', 'choose-first-category', { anchorId: 'p2', categoryId: 'animals' }, { attempts: [
    { actorId: 'p2', result: 'chosen', matchVersion: 2 }, { actorId: 'p1', result: 'forbidden', matchVersion: 2 },
  ], categoryId: 'animals' }, ['attempts', 1, 'matchVersion'], 3, 'unauthorized choice mutates match'),
  standard('AC-06-T01', 'submit-answer', { stage: 'no-hint', acceptedAnswer: 'cat', submissions: ['cat', 'dog', 'cat'] }, { results: [
    { answer: 'cat', accepted: true, scoreDelta: 5 }, { answer: 'dog', accepted: false, scoreDelta: 0 }, { answer: 'cat', accepted: true, scoreDelta: 0 },
  ], scoreAfter: 5 }, ['results', 2, 'scoreDelta'], 5, 'duplicate answer scores twice'),
  standard('AC-07-T01', 'submit-answer-at-hint-stages', { acceptedAnswer: 'cat', stages: ['hint-1', 'hint-2', 'hint-3'] }, { results: [
    { stage: 'hint-1', scoreDelta: 3 }, { stage: 'hint-2', scoreDelta: 2 }, { stage: 'hint-3', scoreDelta: 1 },
  ] }, ['results', 1, 'scoreDelta'], 3, 'hint two awards wrong points'),
  standard('AC-08-T01', 'exhaust-hints', { playerId: 'p1', target: 'cat' }, { playerResult: { scoreDelta: 0, solved: false }, projectionAfterHint3: { revealedTarget: 'cat' } }, ['projectionAfterHint3', 'revealedTarget'], null, 'target remains hidden after final hint'),
  standard('AC-09-T01', 'submit-stage-answers', { stage: 'hint-1', unsolved: ['p1', 'p2'] }, { transitions: [
    { submitted: ['p1'], stage: 'hint-1', hintRecipients: [] }, { submitted: ['p1', 'p2'], stage: 'hint-2', hintRecipients: ['p1', 'p2'] },
  ] }, ['transitions', 0, 'stage'], 'hint-2', 'stage advances before all submit'),
  standard('AC-11-T01', 'accept-competing-correct-answers', { submissions: [
    { playerId: 'p2', acceptedAtMs: 200, sequence: 2 }, { playerId: 'p1', acceptedAtMs: 100, sequence: 1 }, { playerId: 'p3', acceptedAtMs: 100, sequence: 2 },
  ] }, { chooserId: 'p1', orderedCandidates: ['p1', 'p3', 'p2'] }, ['chooserId'], 'p2', 'later solver becomes chooser'),
  standard('AC-12-T01', 'project-round-summary', { priorScores: { p1: 5, p2: 3 }, roundResults: { p1: { points: 0, elapsedMs: null }, p2: { points: 3, elapsedMs: 12000 } } }, { rows: [
    { playerId: 'p2', cumulativeScore: 6, roundPoints: 3, elapsedMs: 12000 }, { playerId: 'p1', cumulativeScore: 5, roundPoints: 0, elapsedMs: null },
  ] }, ['rows', 0, 'roundPoints'], 0, 'round points omitted from summary'),
  standard('AC-13-T01', 'project-final-standings', { configuredRounds: 3, completedRound: 3, totals: { p1: 10, p2: 12 } }, { status: 'final', rows: [
    { rank: 1, playerId: 'p2', totalScore: 12 }, { rank: 2, playerId: 'p1', totalScore: 10 },
  ] }, ['rows', 0, 'playerId'], 'p1', 'lower score ranks first'),
  standard('AC-15-T01', 'render-phone-game', { viewports: [{ width: 390, height: 844 }, { width: 844, height: 390 }] }, { renders: [
    { orientation: 'portrait', scrollWidth: 390, clientWidth: 390, visible: ['answer', 'hints', 'scorecard'], interactions: ['touch', 'keyboard'] },
    { orientation: 'landscape', scrollWidth: 844, clientWidth: 844, visible: ['answer', 'hints', 'scorecard'], interactions: ['touch', 'keyboard'] },
  ] }, ['renders', 1, 'scrollWidth'], 900, 'landscape overflows horizontally'),
  standard('AC-16-T01', 'query-playable-catalog', { records: ['complete-approved', 'missing-background', 'disabled', 'unapproved'] }, { playableIds: ['complete-approved'], excludedIds: ['missing-background', 'disabled', 'unapproved'] }, ['playableIds'], ['complete-approved', 'unapproved'], 'unapproved content becomes playable'),
  standard('AC-17-T01', 'nominate-pair', { attempts: [{ playerId: 'p1', solveStage: 'no-hint' }, { playerId: 'p2', solveStage: 'hint-1' }] }, { results: [
    { playerId: 'p1', result: 'created' }, { playerId: 'p2', result: 'ineligible' },
  ] }, ['results', 1, 'result'], 'created', 'hint solver may nominate'),
  standard('AC-18-T01', 'evaluate-nomination', { candidates: [
    { id: 'n1', nominations: 9, moderation: 'approved', curated: true }, { id: 'n2', nominations: 10, moderation: 'pending', curated: true }, { id: 'n3', nominations: 10, moderation: 'approved', curated: false },
  ] }, { results: [
    { id: 'n1', eligibleForCuration: false, playable: false }, { id: 'n2', eligibleForCuration: false, playable: false }, { id: 'n3', eligibleForCuration: true, playable: false },
  ] }, ['results', 2, 'playable'], true, 'approval bypasses curation'),
  standard('AC-19-T01', 'submit-category-suggestion', { attempts: [{ wins: 9, pairs: 3 }, { wins: 10, pairs: 3 }, { wins: 10, pairs: 2 }] }, { results: ['locked', 'created', 'invalid-pair-count'], openSuggestions: 1 }, ['results', 0], 'created', 'nine wins unlocks suggestions'),
  standard('AC-20-T01', 'complete-oidc-callback', { callbacks: [{ token: 'verified' }, { token: 'bad-signature' }] }, { results: [
    { token: 'verified', profileId: 'p1', associationsCreated: 1 }, { token: 'bad-signature', error: 'invalid-token', associationsCreated: 0 },
  ] }, ['results', 1, 'associationsCreated'], 1, 'invalid token creates association'),
  standard('AC-21-T01', 'enter-as-guest', { guestIcon: 'owl', roomCode: 'ABCD' }, { identity: { kind: 'guest', id: 'guest-1', icon: 'owl' }, allowedActions: ['create-room', 'join-by-code'] }, ['allowedActions'], ['join-by-code'], 'guest cannot create room'),
  standard('AC-22-T01', 'browse-lobbies', { rooms: [
    { id: 'open', discoverable: true, state: 'waiting', playerCount: 1, capacity: 4 }, { id: 'hidden', discoverable: false, state: 'waiting', playerCount: 1, capacity: 4 }, { id: 'full', discoverable: true, state: 'waiting', playerCount: 4, capacity: 4 }, { id: 'started', discoverable: true, state: 'playing', playerCount: 1, capacity: 4 },
  ] }, { joinableRoomIds: ['open'] }, ['joinableRoomIds'], ['open', 'full'], 'full room is joinable'),
  standard('AC-23-T01', 'quick-match', { eligibleRooms: [
    { id: 'room-b', createdAt: 100 }, { id: 'room-a', createdAt: 100 }, { id: 'room-c', createdAt: 200 },
  ] }, { selectedRoomId: 'room-a', joinCommand: { authority: 'capacity-checked-assignment' }, emptyFallback: ['browse', 'create'] }, ['selectedRoomId'], 'room-b', 'stable room ID tie break ignored'),
  standard('AC-23-T02', 'quick-match-concurrently', { roomId: 'room-a', capacity: 2, players: ['p1'], actors: ['p2', 'p3'] }, { results: ['joined', 'no-slot'], playersAfter: ['p1', 'p2'], duplicateMemberships: [] }, ['playersAfter'], ['p1', 'p2', 'p3'], 'quick match overfills room'),
  standard('AC-24-T01', 'configure-capacity', { requested: [1, 2, 25, 26] }, { decisions: [
    { value: 1, accepted: false }, { value: 2, accepted: true }, { value: 25, accepted: true }, { value: 26, accepted: false },
  ] }, ['decisions', 3, 'accepted'], true, 'capacity 26 accepted'),
  standard('AC-25-T01', 'follow-room-invitation', { invitations: [{ code: 'ABCD', roomId: 'active-open' }, { code: 'EFGH', roomId: 'active-full' }] }, { results: [
    { code: 'ABCD', resolvedRoomId: 'active-open', membership: 'player' }, { code: 'EFGH', resolvedRoomId: 'active-full', membership: null },
  ] }, ['results', 1, 'membership'], 'player', 'full invitation admits player'),
  standard('AC-26-T01', 'follow-room-deep-link', { links: [{ roomId: 'open' }, { roomId: 'full' }] }, { browseShown: false, results: [
    { roomId: 'open', offer: 'join-player' }, { roomId: 'full', offer: 'join-observer' },
  ] }, ['browseShown'], true, 'deep link routes through browse'),
  standard('AC-27-T01', 'accept-observer-invite', { room: { capacity: 2, players: ['p1', 'p2'] }, invitation: { observerId: 'o1', inviterId: 'p2' } }, { playerCount: 2, observers: [{ id: 'o1', follows: 'p2' }] }, ['playerCount'], 3, 'observer consumes player seat'),
  standard('AC-28-T01', 'act-as-observer', { observer: { id: 'o1', follows: 'p2' }, attemptedCommands: ['answer', 'choose-category', 'ready'] }, { projectedPlayerId: 'p2', commandResults: ['forbidden', 'forbidden', 'forbidden'], scoreRows: [] }, ['scoreRows'], [{ playerId: 'o1', score: 0 }], 'observer receives score row'),
  standard('AC-29-T01', 'react-with-emoji', { actorId: 'p1', emoji: '👍', audience: ['p1', 'p2', 'o1'], before: { score: 5, answer: null, roundVersion: 3 } }, { event: { type: 'reaction', emoji: '👍', recipients: ['p1', 'p2', 'o1'] }, after: { score: 5, answer: null, roundVersion: 3 } }, ['after', 'score'], 6, 'reaction changes score'),
  standard('AC-30-T02', 'leave-before-countdown', { players: ['p1', 'p2', 'p3'], observers: [], leaving: 'p2' }, { players: ['p1', 'p3'], observers: [], openSeats: 1 }, ['players'], ['p3', 'p1'], 'surviving players reordered'),
  standard('AC-30-T03', 'resolve-leave-observer-race', { initialVersion: 7, staleObserver: 'o1', latestObservers: ['o2', 'o1'] }, { firstAttempt: 'version-conflict', retriedVersion: 8, promotedObserver: 'o2', players: ['p1', 'p3', 'o2'] }, ['promotedObserver'], 'o1', 'promotion is not recomputed'),
  standard('AC-30-T04', 'promote-equal-arrival-observer', { observers: [{ id: 'o9', arrival: 100 }, { id: 'o2', arrival: 100 }] }, { promotedObserver: 'o2', remainingObservers: ['o9'] }, ['promotedObserver'], 'o9', 'stable profile tie break reversed'),
  standard('AC-31-T01', 'mark-final-player-ready', { roomVersion: 4, players: [{ id: 'p1', ready: true }, { id: 'p2', ready: false }] }, { roomVersion: 5, players: [{ id: 'p1', ready: true }, { id: 'p2', ready: true }], countdown: { seconds: 10, roster: ['p1', 'p2'], locked: true }, emittedEvents: ['countdown-started'] }, ['countdown', 'locked'], false, 'countdown roster remains unlocked'),
  standard('AC-31-T02', 'leave-after-countdown-lock', { lockedRoster: ['p1', 'p2', 'p3'], observers: ['o1'], leaving: 'p2' }, { players: ['p1', 'p3'], observers: ['o1'], vacancy: true, promoted: null }, ['promoted'], 'o1', 'observer promoted after lock'),
  standard('AC-31-T03', 'race-promotion-after-lock', { lockedRoster: ['p1', 'p2'], commands: ['leave-p2', 'promote-o1'] }, { leaveResult: 'left', promotionResult: 'roster-locked', players: ['p1'], observers: ['o1'] }, ['players'], ['p1', 'o1'], 'race substitutes after lock'),
  standard('AC-31-T04', 'expire-countdown', { lockedRoster: ['p1', 'p2'], remainingPlayers: ['p1'], observers: ['o1'] }, { gameStarted: false, roomState: 'closed', players: ['p1'], observers: ['o1'] }, ['gameStarted'], true, 'game starts below minimum'),
  standard('AC-32-T01', 'mark-holdout-ready', { warning: { playerId: 'p2', dueAtMs: 5000 }, readyAtMs: 4999 }, { warningShownForMs: 5000, deadlineResult: 'stale', countdown: { started: true, seconds: 10 } }, ['countdown', 'started'], false, 'ready before expiry fails to start countdown'),
  standard('AC-32-T02', 'expire-holdout-warning', { players: [{ id: 'p1', ready: true }, { id: 'p2', ready: true }, { id: 'p3', ready: false }], holdout: 'p3' }, { players: ['p1', 'p2'], removed: 'p3', countdown: { started: true, lockedRoster: ['p1', 'p2'] } }, ['players'], ['p1', 'p2', 'p3'], 'expired holdout retained in larger room'),
  standard('AC-32-T03', 'race-ready-and-warning-expiry', { roomVersion: 9, commands: ['ready-p3', 'expire-p3'] }, { applied: ['ready-p3'], stale: ['expire-p3'], roomVersion: 10, countdownStarts: 1 }, ['countdownStarts'], 2, 'race starts countdown twice'),
  standard('AC-32-T04', 'expire-two-player-warning', { players: [{ id: 'p1', ready: true }, { id: 'p2', ready: false }], holdout: 'p2' }, { players: ['p1', 'p2'], removed: null, countdown: null, roomState: 'waiting' }, ['players'], ['p1'], 'two-player holdout is booted'),
  standard('AC-33-T01', 'expire-idle-readiness-deadline', { roomVersion: 3, players: ['p1', 'p2'], idleMs: 30000 }, { prompts: [{ roomVersion: 3, recipients: ['p1', 'p2'] }], repeatedCallbackPrompts: 0, changedVersionCallbackPrompts: 0, resetDelayMs: 30000 }, ['prompts', 0, 'recipients'], ['p1'], 'idle prompt omits player'),
  standard('AC-37-T01', 'attempt-quota-limited-operation', { commandId: 'cmd-1', committedState: { version: 4 }, quota: 'exhausted' }, { result: { code: 'SERVICE_LIMIT', retryableWithCommandId: 'cmd-1' }, stateAfter: { version: 4 }, providerCalls: ['free-tier'], paidFallbackCalls: 0 }, ['paidFallbackCalls'], 1, 'paid fallback used'),
  standard('AC-38-T01', 'validate-traceability-manifest', { activeAcIds: ['AC-01', 'AC-02'], mappings: [{ ac: 'AC-01', tests: ['AC-01-T01'], status: 'mock-validated' }, { ac: 'AC-02', tests: ['AC-02-T01'], status: 'mock-validated' }] }, { missingAcIds: [], missingTestIds: [], incompleteMockRecords: [], deploymentEvidenceRequired: false }, ['missingAcIds'], ['AC-02'], 'active AC lacks mapping'),
  standard('AC-43-T01', 'render-anonymous-landing', { signedIn: false, rules: { version: '2.6', updated: '2026-10-26' } }, { sections: ['leaderboard', 'joinable-lobbies', 'rules'], rules: { version: '2.6', updated: '2026-10-26' }, emptyState: 'No games yet', unavailableState: 'Try again later', signInRequired: false }, ['signInRequired'], true, 'landing requires sign in'),
  standard('AC-43-T02', 'refresh-public-leaderboard', { nowMs: 0, profiles: [
    { id: 'p2', wins: 3, points: 20, earliestWin: 200, public: true, kind: 'member' }, { id: 'p1', wins: 3, points: 20, earliestWin: 100, public: true, kind: 'member' }, { id: 'g1', wins: 4, points: 5, earliestWin: 50, public: true, kind: 'guest', optedIn: true }, { id: 'g2', wins: 9, points: 99, earliestWin: 1, public: true, kind: 'guest', optedIn: false },
  ] }, { rows: [{ alias: 'Guest Cedar', profileId: 'g1' }, { alias: 'Player p1', profileId: 'p1' }, { alias: 'Player p2', profileId: 'p2' }], excludedProfileIds: ['g2'], refreshAtMs: 300000 }, ['rows', 0, 'profileId'], 'g2', 'guest without opt-in included'),
  standard('AC-43-T03', 'refresh-public-lobbies', { nowMs: 60000, rooms: [{ id: 'r1', playerCount: 2, capacity: 4, state: 'waiting', createdAtMs: 0, code: 'SECRET', playerNames: ['A', 'B'] }] }, { cards: [{ roomId: 'r1', playerCount: 2, capacity: 4, state: 'waiting', ageSeconds: 60 }], refreshAtMs: 75000 }, ['cards', 0, 'roomId'], 'SECRET', 'room code replaces public ID'),
  standard('AC-44-T01', 'exercise-accessible-controls', { viewports: ['portrait', 'landscape'], inputs: ['touch', 'keyboard'] }, { results: [
    { viewport: 'portrait', inputs: ['touch', 'keyboard'], visibleFocus: true, contrastRatio: 4.5, statusText: 'Ready' }, { viewport: 'landscape', inputs: ['touch', 'keyboard'], visibleFocus: true, contrastRatio: 4.5, statusText: 'Ready' },
  ] }, ['results', 0, 'visibleFocus'], false, 'focus is not visible'),
  standard('AC-45-T01', 'retry-accepted-answer', { playerId: 'p1', stage: 'no-hint', commandIds: ['cmd-1', 'cmd-1', 'cmd-2'] }, { acceptances: [{ commandId: 'cmd-1', scoreDelta: 5 }], scoreAfter: 5 }, ['scoreAfter'], 10, 'retry scores twice'),
  standard('AC-45-T02', 'submit-incorrect-answer', { playerId: 'p1', answer: 'dog', target: 'cat', scoreBefore: 5 }, { result: 'incorrect', scoreAfter: 5, emittedEvents: [] }, ['emittedEvents'], [{ type: 'guess', answer: 'dog' }], 'incorrect guess is broadcast'),
  standard('AC-45-T03', 'project-answer-visibility', { target: 'cat' }, { beforeReveal: { player: {}, observer: {} }, afterReveal: { player: { target: 'cat' }, observer: { target: 'cat' } } }, ['beforeReveal', 'observer'], { target: 'cat' }, 'observer sees target before reveal'),
  standard('AC-46-T01', 'validate-oidc-callbacks', { invalidClaims: ['signature', 'issuer', 'audience', 'state', 'nonce', 'expiry'] }, { results: [
    { claim: 'signature', result: 'rejected' }, { claim: 'issuer', result: 'rejected' }, { claim: 'audience', result: 'rejected' }, { claim: 'state', result: 'rejected' }, { claim: 'nonce', result: 'rejected' }, { claim: 'expiry', result: 'rejected' },
  ], profileAssociationsCreated: 0 }, ['profileAssociationsCreated'], 1, 'invalid callback creates profile association'),
  standard('AC-47-T01', 'attempt-moderation-review', { actorRole: 'player', candidateId: 'n1' }, { result: 'forbidden', moderationVersionBefore: 3, moderationVersionAfter: 3, catalogEntriesCreated: 0 }, ['moderationVersionAfter'], 4, 'unauthorized review changes state'),
  standard('AC-47-T02', 'review-catalog-candidate', { actorRole: 'moderator', candidates: ['complete-approved', 'incomplete', 'unapproved'] }, { auditRecords: [{ candidateId: 'complete-approved', action: 'approved', actorRole: 'moderator' }], playableIds: ['complete-approved'] }, ['playableIds'], ['complete-approved', 'incomplete'], 'incomplete candidate becomes playable'),
  standard('AC-47-T03', 'resolve-moderation-appeal', { originalReviewer: 'm1', seniorModerator: 'm2', proposer: 'p1' }, { appealAudit: { actor: 'p1', action: 'appealed' }, resolutionAudit: { actor: 'm2', reason: 'Evidence verified', outcome: 'overturned' }, originalReviewerAttempt: 'forbidden', secondAppealAttempt: 'already-appealed', catalogPublications: 0 }, ['catalogPublications'], 1, 'appeal publishes content'),
  standard('AC-51-T01', 'scan-domain-imports', { files: ['domain/room.ts', 'application/join.ts'] }, { forbiddenImports: [], checkedSpecifiers: ['next', '@supabase/supabase-js'] }, ['forbiddenImports'], ['next/server'], 'domain imports Next runtime'),
  standard('AC-51-T02', 'assign-capacity-checked-membership', { repositoryResponses: ['assigned', 'version-conflict-full'] }, { issuedCommands: [{ type: 'assign-if-capacity', capacity: 2 }], results: ['joined', 'no-slot'], playersExposed: 2, databaseSerializationClaimed: false }, ['results', 1], 'joined', 'conflict exposed as success'),
  standard('AC-51-T03', 'handle-duplicate-command', { commandId: 'cmd-1', priorResult: { status: 'joined', roomId: 'r1' } }, { results: [{ status: 'joined', roomId: 'r1' }, { status: 'joined', roomId: 'r1' }], domainSideEffectCalls: 1, databaseUniquenessClaimed: false }, ['domainSideEffectCalls'], 2, 'duplicate causes second side effect'),
  standard('AC-51-T04', 'stage-outbox-intent', { transitions: ['commit', 'rollback'] }, { committed: { domainMutations: 1, outboxIntents: 1 }, rolledBack: { domainMutations: 0, outboxIntents: 0 }, databaseAtomicityClaimed: false }, ['rolledBack', 'outboxIntents'], 1, 'rollback retains outbox intent'),
];

const customScenarios: ScenarioDraft[] = [
  {
    id: 'AC-04-T01',
    request: { setup: { roster: ['p9', 'p3', 'p7'], randomReturns: [1, 3] }, actions: [{ type: 'select-first-anchor' }] },
    conformingObservation: { randomCalls: [{ min: 1, max: 3 }, { min: 1, max: 3 }], selections: [{ randomValue: 1, anchorId: 'p9' }, { randomValue: 3, anchorId: 'p7' }] },
    violations: [
      { name: 'zero-based random range', observation: { randomCalls: [{ min: 0, max: 2 }, { min: 0, max: 2 }], selections: [{ randomValue: 1, anchorId: 'p9' }, { randomValue: 3, anchorId: 'p7' }] } },
      { name: 'last index maps to wrong roster member', observation: { randomCalls: [{ min: 1, max: 3 }, { min: 1, max: 3 }], selections: [{ randomValue: 1, anchorId: 'p9' }, { randomValue: 3, anchorId: 'p3' }] } },
    ],
    assertObservation(observation) {
      invariant(isDeepStrictEqual(observation.randomCalls, [{ min: 1, max: 3 }, { min: 1, max: 3 }]), 'random source must receive inclusive 1..N bounds');
      invariant(isDeepStrictEqual(observation.selections, [{ randomValue: 1, anchorId: 'p9' }, { randomValue: 3, anchorId: 'p7' }]), 'random result must map to frozen one-based roster');
    },
  },
  {
    id: 'AC-05-T01',
    request: { setup: { categories: [{ id: 'animals', background: 'forest.svg' }, { id: 'space', background: 'stars.svg' }], pairs: [{ id: 'a1', category: 'animals' }, { id: 'a2', category: 'animals' }, { id: 's1', category: 'space' }] }, actions: [{ type: 'render-category-rounds' }] },
    conformingObservation: { rounds: [{ pairId: 'a1', background: 'forest.svg', controls: { readable: true } }, { pairId: 'a2', background: 'forest.svg', controls: { readable: true } }, { pairId: 's1', background: 'stars.svg', controls: { readable: true } }], missingAsset: { background: 'accessible-fallback', label: 'Category artwork unavailable' } },
    violations: [
      { name: 'same category has different backgrounds', observation: { rounds: [{ pairId: 'a1', background: 'forest.svg', controls: { readable: true } }, { pairId: 'a2', background: 'desert.svg', controls: { readable: true } }, { pairId: 's1', background: 'stars.svg', controls: { readable: true } }], missingAsset: { background: 'accessible-fallback', label: 'Category artwork unavailable' } } },
      { name: 'different category reuses wrong background', observation: { rounds: [{ pairId: 'a1', background: 'forest.svg', controls: { readable: true } }, { pairId: 'a2', background: 'forest.svg', controls: { readable: true } }, { pairId: 's1', background: 'forest.svg', controls: { readable: true } }], missingAsset: { background: 'accessible-fallback', label: 'Category artwork unavailable' } } },
    ],
    assertObservation(observation) {
      const rounds = observation.rounds as Array<Record<string, JsonValue>>;
      invariant(rounds[0].background === rounds[1].background, 'pairs in one category must share its background');
      invariant(rounds[2].background !== rounds[0].background, 'different category must use its assigned background');
      invariant(rounds.every((round) => (round.controls as Record<string, JsonValue>).readable === true), 'controls must remain readable');
      invariant(isDeepStrictEqual(observation.missingAsset, { background: 'accessible-fallback', label: 'Category artwork unavailable' }), 'missing art must have accessible fallback');
    },
  },
  {
    id: 'AC-10-T01',
    request: { setup: { playerId: 'p1', icon: 'owl', scoreBefore: 4, stage: 'hint-1', roundStartedAtMs: 1000, serverAcceptedAtMs: 13000, clientClaimedAtMs: 2000 }, actions: [{ type: 'submit-answer', payload: { answer: 'cat' } }, { type: 'project-live-scorecard' }] },
    conformingObservation: { acceptedSubmission: { playerId: 'p1', acceptedAtMs: 13000, elapsedMs: 12000, scoreDelta: 3 }, scorecard: [{ playerId: 'p1', icon: 'owl', points: 7, elapsedMs: 12000 }] },
    violations: [
      { name: 'client clock determines elapsed time', observation: { acceptedSubmission: { playerId: 'p1', acceptedAtMs: 13000, elapsedMs: 1000, scoreDelta: 3 }, scorecard: [{ playerId: 'p1', icon: 'owl', points: 7, elapsedMs: 1000 }] } },
      { name: 'scorecard omits icon and wrong points', observation: { acceptedSubmission: { playerId: 'p1', acceptedAtMs: 13000, elapsedMs: 12000, scoreDelta: 3 }, scorecard: [{ playerId: 'p1', icon: 'fox', points: 4, elapsedMs: 12000 }] } },
    ],
    assertObservation: exact({ acceptedSubmission: { playerId: 'p1', acceptedAtMs: 13000, elapsedMs: 12000, scoreDelta: 3 }, scorecard: [{ playerId: 'p1', icon: 'owl', points: 7, elapsedMs: 12000 }] }),
  },
  {
    id: 'AC-14-T01',
    request: { setup: { rows: [{ playerId: 'fast', score: 10, solveSeconds: [10, 20], unsolvedRounds: 0 }, { playerId: 'slow', score: 10, solveSeconds: [20, 30], unsolvedRounds: 0 }, { playerId: 'penalty-a', score: 8, solveSeconds: [5], unsolvedRounds: 1 }, { playerId: 'penalty-b', score: 8, solveSeconds: [5], unsolvedRounds: 1 }] }, actions: [{ type: 'rank-final-standings' }] },
    conformingObservation: { standings: [{ rank: 1, playerId: 'fast', score: 10, tieSeconds: 30 }, { rank: 2, playerId: 'slow', score: 10, tieSeconds: 50 }, { rank: 3, playerId: 'penalty-a', score: 8, tieSeconds: 85 }, { rank: 3, playerId: 'penalty-b', score: 8, tieSeconds: 85 }] },
    violations: [
      { name: 'slower player ranks first', observation: { standings: [{ rank: 1, playerId: 'slow', score: 10, tieSeconds: 50 }, { rank: 2, playerId: 'fast', score: 10, tieSeconds: 30 }, { rank: 3, playerId: 'penalty-a', score: 8, tieSeconds: 85 }, { rank: 3, playerId: 'penalty-b', score: 8, tieSeconds: 85 }] } },
      { name: 'unsolved penalty omitted', observation: { standings: [{ rank: 1, playerId: 'fast', score: 10, tieSeconds: 30 }, { rank: 2, playerId: 'slow', score: 10, tieSeconds: 50 }, { rank: 3, playerId: 'penalty-a', score: 8, tieSeconds: 5 }, { rank: 3, playerId: 'penalty-b', score: 8, tieSeconds: 5 }] } },
      { name: 'exact tie receives different ranks', observation: { standings: [{ rank: 1, playerId: 'fast', score: 10, tieSeconds: 30 }, { rank: 2, playerId: 'slow', score: 10, tieSeconds: 50 }, { rank: 3, playerId: 'penalty-a', score: 8, tieSeconds: 85 }, { rank: 4, playerId: 'penalty-b', score: 8, tieSeconds: 85 }] } },
    ],
    assertObservation: exact({ standings: [{ rank: 1, playerId: 'fast', score: 10, tieSeconds: 30 }, { rank: 2, playerId: 'slow', score: 10, tieSeconds: 50 }, { rank: 3, playerId: 'penalty-a', score: 8, tieSeconds: 85 }, { rank: 3, playerId: 'penalty-b', score: 8, tieSeconds: 85 }] }),
  },
  {
    id: 'AC-18-T02',
    request: { setup: { caseId: 'n1', proposerId: 'p1', originalReviewerId: 'm1', seniorModeratorId: 'm2', rejectedVersion: 4 }, actions: [{ type: 'appeal', payload: { actorId: 'p1', commandId: 'appeal-1', reason: 'Context supplied' } }, { type: 'appeal', payload: { actorId: 'p1', commandId: 'appeal-1', reason: 'Context supplied' } }, { type: 'resolve-appeal', payload: { actorId: 'm2', commandId: 'resolve-1', reason: 'Evidence verified', outcome: 'overturn' } }] },
    conformingObservation: { commandResults: [{ commandId: 'appeal-1', result: 'appealed', version: 5 }, { commandId: 'appeal-1', result: 'appealed', version: 5 }, { commandId: 'resolve-1', result: 'approved-for-curation', version: 6 }], audit: [{ actorId: 'p1', action: 'appealed', reason: 'Context supplied' }, { actorId: 'm2', action: 'overturned', reason: 'Evidence verified' }], directPublications: 0, originalReviewerResolution: 'forbidden', secondAppeal: 'already-appealed', staleVersionResult: 'version-conflict' },
    violations: [
      { name: 'duplicate appeal creates second audit record', observation: { commandResults: [{ commandId: 'appeal-1', result: 'appealed', version: 5 }, { commandId: 'appeal-1', result: 'appealed', version: 6 }, { commandId: 'resolve-1', result: 'approved-for-curation', version: 7 }], audit: [{ actorId: 'p1', action: 'appealed', reason: 'Context supplied' }, { actorId: 'p1', action: 'appealed', reason: 'Context supplied' }, { actorId: 'm2', action: 'overturned', reason: 'Evidence verified' }], directPublications: 0, originalReviewerResolution: 'forbidden', secondAppeal: 'already-appealed', staleVersionResult: 'version-conflict' } },
      { name: 'resolution has no reason', observation: { commandResults: [{ commandId: 'appeal-1', result: 'appealed', version: 5 }, { commandId: 'appeal-1', result: 'appealed', version: 5 }, { commandId: 'resolve-1', result: 'approved-for-curation', version: 6 }], audit: [{ actorId: 'p1', action: 'appealed', reason: 'Context supplied' }, { actorId: 'm2', action: 'overturned', reason: '' }], directPublications: 0, originalReviewerResolution: 'forbidden', secondAppeal: 'already-appealed', staleVersionResult: 'version-conflict' } },
    ],
    assertObservation: exact({ commandResults: [{ commandId: 'appeal-1', result: 'appealed', version: 5 }, { commandId: 'appeal-1', result: 'appealed', version: 5 }, { commandId: 'resolve-1', result: 'approved-for-curation', version: 6 }], audit: [{ actorId: 'p1', action: 'appealed', reason: 'Context supplied' }, { actorId: 'm2', action: 'overturned', reason: 'Evidence verified' }], directPublications: 0, originalReviewerResolution: 'forbidden', secondAppeal: 'already-appealed', staleVersionResult: 'version-conflict' }),
  },
  {
    id: 'AC-30-T01',
    request: { setup: { phase: 'waiting', players: ['p1', 'p2', 'p3', 'p4'], observers: [{ id: 'o2', arrival: 20 }, { id: 'o1', arrival: 10 }], leavingPlayerId: 'p2' }, actions: [{ type: 'leave-player', payload: { playerId: 'p2' } }] },
    conformingObservation: { players: ['p1', 'p3', 'p4', 'o1'], observers: ['o2'], promoted: { observerId: 'o1', position: 4 } },
    violations: [
      { name: 'new player inserted at vacancy', observation: { players: ['p1', 'o1', 'p3', 'p4'], observers: ['o2'], promoted: { observerId: 'o1', position: 2 } } },
      { name: 'newest observer promoted', observation: { players: ['p1', 'p3', 'p4', 'o2'], observers: ['o1'], promoted: { observerId: 'o2', position: 4 } } },
      { name: 'surviving players reordered', observation: { players: ['p3', 'p1', 'p4', 'o1'], observers: ['o2'], promoted: { observerId: 'o1', position: 4 } } },
    ],
    assertObservation: exact({ players: ['p1', 'p3', 'p4', 'o1'], observers: ['o2'], promoted: { observerId: 'o1', position: 4 } }),
  },
  {
    id: 'AC-39-T01',
    request: { setup: { manifest: { dependencies: { vitest: '5.0.5' } }, lockfile: { packages: { 'node_modules/vitest': { version: '5.0.5', license: 'MIT' } } }, attributions: [{ name: 'vitest', purpose: 'test runner', license: 'MIT', upstream: 'https://github.com/vitest-dev/vitest', version: '5.0.5' }] }, actions: [{ type: 'validate-attributions' }] },
    conformingObservation: { directNames: ['vitest'], attributedNames: ['vitest'], records: [{ name: 'vitest', purpose: 'test runner', license: 'MIT', upstream: 'https://github.com/vitest-dev/vitest', declaredVersion: '5.0.5', lockedVersion: '5.0.5' }] },
    violations: [
      { name: 'missing purpose and upstream', observation: { directNames: ['vitest'], attributedNames: ['vitest'], records: [{ name: 'vitest', purpose: '', license: 'MIT', upstream: '', declaredVersion: '5.0.5', lockedVersion: '5.0.5' }] } },
      { name: 'lock version mismatch', observation: { directNames: ['vitest'], attributedNames: ['vitest'], records: [{ name: 'vitest', purpose: 'test runner', license: 'MIT', upstream: 'https://github.com/vitest-dev/vitest', declaredVersion: '5.0.5', lockedVersion: '5.0.4' }] } },
    ],
    assertObservation: exact({ directNames: ['vitest'], attributedNames: ['vitest'], records: [{ name: 'vitest', purpose: 'test runner', license: 'MIT', upstream: 'https://github.com/vitest-dev/vitest', declaredVersion: '5.0.5', lockedVersion: '5.0.5' }] }),
  },
  {
    id: 'AC-41-T01',
    request: { setup: { requiredCommit: 'abc123', candidateArchives: ['valid.tar', 'missing.tar', 'wrong.tar', 'invalid.tar'] }, actions: [{ type: 'list-archive-entries' }, { type: 'read-swbom-entry' }] },
    conformingObservation: { requiredCommit: 'abc123', archives: [
      { name: 'valid.tar', entries: [{ path: 'src/index.ts', content: 'source' }, { path: 'swbom/abc123.cdx.json', content: '{"bomFormat":"CycloneDX","commit":"abc123"}' }], decision: 'accepted' },
      { name: 'missing.tar', entries: [{ path: 'src/index.ts', content: 'source' }], decision: 'missing-swbom' },
      { name: 'wrong.tar', entries: [{ path: 'swbom/abc123.cdx.json', content: '{"bomFormat":"CycloneDX","commit":"def456"}' }], decision: 'commit-mismatch' },
      { name: 'invalid.tar', entries: [{ path: 'swbom/abc123.cdx.json', content: 'not-json' }], decision: 'invalid-swbom' },
    ] },
    violations: [
      { name: 'wrong commit archive accepted', observation: { requiredCommit: 'abc123', archives: [
        { name: 'valid.tar', entries: [{ path: 'src/index.ts', content: 'source' }, { path: 'swbom/abc123.cdx.json', content: '{"bomFormat":"CycloneDX","commit":"abc123"}' }], decision: 'accepted' },
        { name: 'missing.tar', entries: [{ path: 'src/index.ts', content: 'source' }], decision: 'missing-swbom' },
        { name: 'wrong.tar', entries: [{ path: 'swbom/abc123.cdx.json', content: '{"bomFormat":"CycloneDX","commit":"def456"}' }], decision: 'accepted' },
        { name: 'invalid.tar', entries: [{ path: 'swbom/abc123.cdx.json', content: 'not-json' }], decision: 'invalid-swbom' },
      ] } },
      { name: 'invalid document treated as valid', observation: { requiredCommit: 'abc123', archives: [
        { name: 'valid.tar', entries: [{ path: 'src/index.ts', content: 'source' }, { path: 'swbom/abc123.cdx.json', content: '{"bomFormat":"CycloneDX","commit":"abc123"}' }], decision: 'accepted' },
        { name: 'missing.tar', entries: [{ path: 'src/index.ts', content: 'source' }], decision: 'missing-swbom' },
        { name: 'wrong.tar', entries: [{ path: 'swbom/abc123.cdx.json', content: '{"bomFormat":"CycloneDX","commit":"def456"}' }], decision: 'commit-mismatch' },
        { name: 'invalid.tar', entries: [{ path: 'swbom/abc123.cdx.json', content: 'not-json' }], decision: 'accepted' },
      ] } },
    ],
    assertObservation(observation) {
      const requiredCommit = observation.requiredCommit;
      invariant(typeof requiredCommit === 'string', 'required commit must be observed');
      const archives = observation.archives as Array<Record<string, JsonValue>>;
      for (const archive of archives) {
        const entries = archive.entries as Array<Record<string, JsonValue>>;
        const swbom = entries.find(({ path }) => path === `swbom/${requiredCommit}.cdx.json`);
        let expectedDecision = 'missing-swbom';
        if (swbom) {
          try {
            const parsed = JSON.parse(String(swbom.content)) as { bomFormat?: string; commit?: string };
            expectedDecision = parsed.bomFormat !== 'CycloneDX'
              ? 'invalid-swbom'
              : parsed.commit === requiredCommit ? 'accepted' : 'commit-mismatch';
          } catch {
            expectedDecision = 'invalid-swbom';
          }
        }
        invariant(archive.decision === expectedDecision, `${String(archive.name)} decision does not match its raw entries`);
      }
    },
  },
  {
    id: 'AC-42-T01',
    request: { setup: { requiredLicense: 'GPL-2.0-only', bundledComponents: ['Recursive font'] }, actions: [{ type: 'list-archive-entries' }, { type: 'read-license-and-notices' }] },
    conformingObservation: { entries: [{ path: 'LICENSE', content: 'GNU GENERAL PUBLIC LICENSE\nVersion 2, June 1991\nEND OF TERMS AND CONDITIONS' }, { path: 'docs/ATTRIBUTIONS.md', content: 'Recursive font | SIL Open Font License 1.1' }], spdx: 'GPL-2.0-only' },
    violations: [
      { name: 'archive omits bundled component notice', observation: { entries: [{ path: 'LICENSE', content: 'GNU GENERAL PUBLIC LICENSE\nVersion 2, June 1991\nEND OF TERMS AND CONDITIONS' }, { path: 'docs/ATTRIBUTIONS.md', content: '' }], spdx: 'GPL-2.0-only' } },
      { name: 'archive contains incomplete license text', observation: { entries: [{ path: 'LICENSE', content: 'GNU GPL' }, { path: 'docs/ATTRIBUTIONS.md', content: 'Recursive font | SIL Open Font License 1.1' }], spdx: 'GPL-2.0-only' } },
    ],
    assertObservation(observation) {
      invariant(observation.spdx === 'GPL-2.0-only', 'release must use GPL-2.0-only');
      const entries = observation.entries as Array<Record<string, JsonValue>>;
      const license = String(entries.find(({ path }) => path === 'LICENSE')?.content ?? '');
      const notices = String(entries.find(({ path }) => path === 'docs/ATTRIBUTIONS.md')?.content ?? '');
      invariant(license.includes('GNU GENERAL PUBLIC LICENSE'), 'GPL text is missing');
      invariant(license.includes('Version 2, June 1991'), 'GPL v2 header is missing');
      invariant(license.includes('END OF TERMS AND CONDITIONS'), 'GPL v2 text is incomplete');
      invariant(notices.includes('Recursive font'), 'bundled component notice is missing');
      invariant(notices.includes('SIL Open Font License 1.1'), 'bundled component license is missing');
    },
  },
  {
    id: 'AC-50-T01',
    request: { setup: { room: { id: 'room-public-1', playerCount: 2, capacity: 4, state: 'waiting', ageSeconds: 60, code: 'SECRET', target: 'cat', guesses: ['dog'], playerNames: ['Alice'], moderation: { status: 'pending' }, serviceSecret: 'key' }, leaderboard: [{ alias: 'Player Oak', wins: 2, points: 17 }] }, actions: [{ type: 'query-public-landing' }] },
    conformingObservation: { leaderboard: [{ alias: 'Player Oak', wins: 2, points: 17 }], lobbies: [{ roomId: 'room-public-1', playerCount: 2, capacity: 4, state: 'waiting', ageSeconds: 60 }], rules: { version: '2.6', updated: '2026-10-26' } },
    violations: [
      { name: 'public payload leaks room code and target', observation: { leaderboard: [{ alias: 'Player Oak', wins: 2, points: 17 }], lobbies: [{ roomId: 'room-public-1', playerCount: 2, capacity: 4, state: 'waiting', ageSeconds: 60, code: 'SECRET', target: 'cat' }], rules: { version: '2.6', updated: '2026-10-26' } } },
      { name: 'public payload leaks identity and moderation', observation: { leaderboard: [{ alias: 'Player Oak', wins: 2, points: 17, playerName: 'Alice' }], lobbies: [{ roomId: 'room-public-1', playerCount: 2, capacity: 4, state: 'waiting', ageSeconds: 60, moderation: { status: 'pending' } }], rules: { version: '2.6', updated: '2026-10-26' } } },
      { name: 'public payload leaks secret', observation: { leaderboard: [{ alias: 'Player Oak', wins: 2, points: 17 }], lobbies: [{ roomId: 'room-public-1', playerCount: 2, capacity: 4, state: 'waiting', ageSeconds: 60 }], rules: { version: '2.6', updated: '2026-10-26' }, serviceSecret: 'key' } },
    ],
    assertObservation: exact({ leaderboard: [{ alias: 'Player Oak', wins: 2, points: 17 }], lobbies: [{ roomId: 'room-public-1', playerCount: 2, capacity: 4, state: 'waiting', ageSeconds: 60 }], rules: { version: '2.6', updated: '2026-10-26' } }),
  },
];

export const acOracleScenarios: OracleScenario[] = [...standardScenarios, ...customScenarios]
  .map((scenario) => {
    const contractExpected = contractExpectations[scenario.id as keyof typeof contractExpectations] as Record<string, JsonValue> | undefined;
    invariant(contractExpected, `No independently authored contract expectation for ${scenario.id}`);
    return { ...scenario, contractExpected };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

