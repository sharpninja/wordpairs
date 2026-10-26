import type { JsonValue } from './oracle-scenarios.js';

// Independently authored expected observations for requirement clauses that need
// more than the primary scenario. These are deliberately separate from the
// scripted raw fixtures in oracle-supplemental-scenarios.ts.
export const supplementalContractExpectations: Record<string, Record<string, JsonValue>> = {
  'AC-01-T01': { joins: ['code', 'browse', 'quick-match', 'deep-link'], roster: [{ id: 'p1', icon: 'owl' }, { id: 'p2', icon: 'fox' }], sameRoomId: 'room-a' },
  'AC-02-T01': { configuredCapacity: 2, before: { players: ['p1', 'p2'], version: 7 }, result: 'no-slot', after: { players: ['p1', 'p2'], version: 7 } },
  'AC-04-T01': { mappings: [{ value: 1, player: 'p9' }, { value: 2, player: 'p3' }, { value: 3, player: 'p7' }], firstRound: { anchor: 'p3', category: 'animals', background: 'forest.svg' } },
  'AC-06-T01': { solve: { accepted: true, scoreAfter: 5, scoreLocked: true }, laterSubmission: { result: 'already-solved', scoreAfter: 5 } },
  'AC-09-T01': { confirmedResults: [{ player: 'p1', solved: true }, { player: 'p2', solved: false }], nextStage: 'hint-2', hintRecipients: ['p2'], solvedPlayerControls: false },
  'AC-16-T01': { playable: [{ id: 'complete', prompt: 'pet', target: 'cat', hints: ['animal', 'feline', 'meows'], acceptedAnswers: ['cat', 'kitty'], category: 'animals', background: 'forest.svg' }], excluded: [{ id: 'missing-hint', reason: 'incomplete' }, { id: 'unapproved', reason: 'unapproved' }, { id: 'disabled', reason: 'disabled' }] },
  'AC-18-T02': { attempts: [{ actor: 'other', result: 'not-proposer', version: 4 }, { actor: 'junior', result: 'senior-required', version: 4 }, { actor: 'original', result: 'reviewer-conflict', version: 4 }, { actor: 'senior', outcome: 'uphold', result: 'rejected', version: 5 }, { actor: 'senior', expectedVersion: 4, result: 'version-conflict', version: 5 }], audit: [{ action: 'upheld', actor: 'senior', reason: 'Evidence insufficient' }], publications: 0 },
  'AC-19-T01': { first: { result: 'created', playable: false, moderation: 'pending', complete: true }, secondOpenAttempt: 'already-open', approvedIncompletePlayable: false, approvedCompleteCuratedPlayable: true },
  'AC-20-T01': { firstLogin: { profileId: 'p1', associationsCreated: 1 }, repeatLogin: { profileId: 'p1', associationsCreated: 0 }, iconSelection: { selected: 'owl', persisted: 'owl' } },
  'AC-23-T01': { nonempty: { selected: 'room-a', result: 'joined' }, empty: { selected: null, fallback: ['browse', 'create'] }, staleSelection: { result: 'no-slot', fallback: ['browse', 'create'] } },
  'AC-24-T01': { request: 8, accepted: true, storedCapacity: 8, displayedCapacity: 8 },
  'AC-25-T01': { byCode: { roomId: 'room-a', membership: 'player' }, byDeepLink: { roomId: 'room-a', membership: 'player' }, full: { roomId: 'room-full', membership: null } },
  'AC-26-T01': { browseShown: false, openRoom: { membership: 'player', roomId: 'open' }, fullRoom: { membership: null, offer: 'observer', roomId: 'full' } },
  'AC-28-T01': { inviterView: { playerId: 'p2', revision: 8, prompt: 'pet' }, observerView: { follows: 'p2', revision: 8, prompt: 'pet' }, commands: ['forbidden', 'forbidden'], scoreRows: [] },
  'AC-29-T01': { stage: 'answering', menu: ['👍', '😂', '🎉'], valid: { emoji: '👍', broadcast: true }, invalid: { emoji: '💣', result: 'not-allowlisted', broadcast: false }, stateChanged: false },
  'AC-32-T01': { warning: { recipient: 'p2', visible: true, seconds: 5, dueAtMs: 5000 }, readyAtMs: 4999, countdown: { started: true, seconds: 10 } },
  'AC-32-T02': { deadline: { startedAtMs: 0, dueAtMs: 5000, firedAtMs: 5000 }, removed: 'p3', roster: ['p1', 'p2'], countdownLocked: true },
  'AC-33-T01': { timeline: [{ atMs: 30000, action: 'prompt', recipients: ['p1', 'p2'] }, { atMs: 30001, action: 'ready-change', version: 4 }, { atMs: 60000, action: 'stale-callback', prompts: 0 }, { atMs: 60001, action: 'prompt', recipients: ['p1', 'p2'] }], promptsTotal: 2 },
  'AC-38-T01': { controls: [{ fixture: 'complete', result: 'valid' }, { fixture: 'missing-ac', result: 'missing-ac' }, { fixture: 'missing-test', result: 'missing-test' }, { fixture: 'incomplete-mock-record', result: 'incomplete-record' }], deploymentEvidenceRequired: false },
  'AC-39-T01': { externalAssets: [{ name: 'Recursive font', purpose: 'diagram labels', license: 'OFL-1.1', upstream: 'https://github.com/arrowtype/recursive', noticePresent: true }] },
  'AC-43-T01': { normal: { rules: ['Join or create a room', 'Mark ready', 'Solve with fewer hints for more points'], version: '2.6', updated: '2026-10-26' }, empty: { leaderboard: 'No games yet', lobbies: 'No joinable rooms' }, unavailable: { leaderboard: 'Try again later', lobbies: 'Try again later' } },
  'AC-43-T02': { rows: [{ id: 'wins', wins: 5, points: 1, earliestWin: 50 }, { id: 'points', wins: 4, points: 30, earliestWin: 100 }, { id: 'early-a', wins: 4, points: 20, earliestWin: 20 }, { id: 'early-b', wins: 4, points: 20, earliestWin: 20 }], stableTieOrder: ['early-a', 'early-b'], excluded: ['opted-out', 'guest-not-opted-in'], refreshSeconds: 300 },
  'AC-44-T01': { indicators: [{ state: 'icon-selected', text: 'Owl selected', icon: 'owl' }, { state: 'solved', text: 'Solved', icon: 'check' }, { state: 'score-change', text: '+3 points', icon: 'arrow-up' }], primaryActions: [{ input: 'touch', result: 'submitted' }, { input: 'keyboard', result: 'submitted' }], focusVisible: true, contrastRatio: 4.5 },
  'AC-45-T01': { policy: { canonical: 'cat', approvedAlternatives: ['kitty'] }, submissions: [{ answer: 'cat', accepted: true, scoreDelta: 5 }, { answer: 'kitty', accepted: true, scoreDelta: 0 }, { answer: 'feline', accepted: false, scoreDelta: 0 }], scoreBearingAcceptances: 1 },
  'AC-47-T02': { audit: [{ action: 'nomination-count-changed', before: 9, after: 10 }, { action: 'eligibility-changed', before: false, after: true }, { action: 'moderation-approved', actor: 'm1' }], playableBeforeCuration: false },
  'AC-47-T03': { actions: [{ actor: 'proposer', command: 'appeal', result: 'applied' }, { actor: 'senior', command: 'resolve', result: 'upheld' }, { actor: 'original-reviewer', command: 'resolve', result: 'forbidden' }, { actor: 'proposer', command: 'appeal-again', result: 'already-appealed' }], transactionFailure: { result: 'rolled-back', caseVersion: 5, auditCount: 2, publicationCount: 0 } },
};
