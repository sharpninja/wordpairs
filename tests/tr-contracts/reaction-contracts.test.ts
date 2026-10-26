import { expect, it } from 'vitest';

const APPROVED_REACTIONS = ['👍', '❤️', '😂', '🎉', '👀'] as const;

type ReactionObservation = {
  emoji: string;
  shownAtMs: number;
  hiddenAtMs: number;
  accepted: Array<{ actorId: string; atMs: number }>;
  rejected: Array<{ actorId: string; atMs: number }>;
  deliveredTo: string[];
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
};

function assertReactionContract(observation: ReactionObservation): void {
  expect(APPROVED_REACTIONS).toContain(observation.emoji);
  expect(observation.hiddenAtMs - observation.shownAtMs).toBe(5000);
  const acceptedByActor = new Map<string, number[]>();
  for (const attempt of observation.accepted) {
    acceptedByActor.set(attempt.actorId, [...(acceptedByActor.get(attempt.actorId) ?? []), attempt.atMs]);
  }
  for (const acceptedTimes of acceptedByActor.values()) {
    for (let index = 1; index < acceptedTimes.length; index += 1) {
      expect(acceptedTimes[index] - acceptedTimes[index - 1]).toBeGreaterThanOrEqual(2000);
    }
  }
  for (const rejected of observation.rejected) {
    expect((acceptedByActor.get(rejected.actorId) ?? []).some((acceptedAt) => rejected.atMs > acceptedAt && rejected.atMs - acceptedAt < 2000)).toBe(true);
  }
  expect(observation.deliveredTo).toStrictEqual(['player:p1', 'player:p2', 'observer:o1']);
  expect(observation.afterState).toStrictEqual(observation.beforeState);
}

const conforming: ReactionObservation = {
  emoji: '❤️',
  shownAtMs: 10_000,
  hiddenAtMs: 15_000,
  accepted: [{ actorId: 'p1', atMs: 10_000 }, { actorId: 'p2', atMs: 10_500 }, { actorId: 'p1', atMs: 12_000 }],
  rejected: [{ actorId: 'p1', atMs: 11_999 }],
  deliveredTo: ['player:p1', 'player:p2', 'observer:o1'],
  beforeState: { stage: 'answering', scores: { p1: 5, p2: 0 }, submissions: 1 },
  afterState: { stage: 'answering', scores: { p1: 5, p2: 0 }, submissions: 1 },
};

it('TR-19-T01 accepts exactly the approved reaction allowlist', () => {
  for (const emoji of APPROVED_REACTIONS) expect(() => assertReactionContract({ ...conforming, emoji })).not.toThrow();
  expect(() => assertReactionContract({ ...conforming, emoji: '💣' })).toThrow();
});

it('TR-19-T02 keeps each reaction visible for exactly five seconds', () => {
  expect(() => assertReactionContract(conforming)).not.toThrow();
  expect(() => assertReactionContract({ ...conforming, hiddenAtMs: 14_999 })).toThrow();
  expect(() => assertReactionContract({ ...conforming, hiddenAtMs: 15_001 })).toThrow();
});

it('TR-19-T03 limits each player to one reaction per two-second window', () => {
  expect(() => assertReactionContract(conforming)).not.toThrow();
  expect(() => assertReactionContract({ ...conforming, accepted: [{ actorId: 'p1', atMs: 10_000 }, { actorId: 'p1', atMs: 11_999 }], rejected: [] })).toThrow();
  expect(() => assertReactionContract({ ...conforming, accepted: [{ actorId: 'p1', atMs: 10_000 }], rejected: [{ actorId: 'p1', atMs: 12_000 }] })).toThrow();
});

it('TR-19-T04 delivers to players and observers without mutating game state', () => {
  expect(() => assertReactionContract(conforming)).not.toThrow();
  expect(() => assertReactionContract({ ...conforming, deliveredTo: ['player:p1', 'player:p2'] })).toThrow();
  expect(() => assertReactionContract({ ...conforming, afterState: { ...conforming.beforeState, submissions: 2 } })).toThrow();
});
