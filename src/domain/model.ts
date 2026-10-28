export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };
export type Versioned = { id: string; version: number };
export type Role = "player" | "moderator" | "senior-moderator" | "admin";
export type Actor = { profileId: string; roles: readonly Role[] };

export interface Profile extends Versioned {
  kind: "guest" | "member";
  providerSubject: string | null;
  alias: string;
  icon: string;
  publicLeaderboard: boolean;
  wins: number;
  points: number;
  earliestWinAt: number | null;
}

export interface Player {
  profileId: string;
  ready: boolean;
  joinedAt: number;
  disconnectedAt: number | null;
  lastSeenAt?: number;
}

export interface Observer {
  profileId: string;
  followedPlayerId: string;
  arrivalSequence: number;
  joinedAt: number;
}

export interface Room extends Versioned {
  code: string;
  creatorId: string;
  capacity: number;
  discoverable: boolean;
  status: "waiting" | "countdown" | "playing" | "closed";
  createdAt: number;
  changedAt: number;
  closedAt: number | null;
  players: Player[];
  observers: Observer[];
  lockedRoster: string[];
  nextObserverSequence: number;
  idlePromptedVersion: number | null;
  holdoutId: string | null;
  holdoutDueAt: number | null;
  countdownDueAt: number | null;
  emptySince?: number | null;
  startedRoster?: string[];
  startedAt?: number;
}

export interface Pair extends Versioned {
  selectable?: boolean;
  categoryId: string;
  prompt: string;
  target: string;
  acceptedAnswers: string[];
  hints: [string, string, string];
  backgroundId: string;
  approved: boolean;
}

export interface Category extends Versioned {
  name: string;
  backgroundId: string;
  approved: boolean;
}

export interface Solve {
  profileId: string;
  points: number;
  elapsedMs: number;
  acceptedAt: number;
  order: number;
  stage: number;
}

export interface Round {
  id: string;
  pairId: string;
  pairVersion: number;
  categoryId: string;
  startedAt: number;
  stage: number;
  stageDueAt: number;
  submittedPlayerIds: string[];
  solves: Solve[];
  revealed: boolean;
  endedAt?: number;
  attempts?: {
    profileId: string;
    stage: number;
    acceptedAt: number;
    correct: boolean;
  }[];
}

export interface Match extends Versioned {
  roomId: string;
  roster: string[];
  anchorId: string;
  chooserId: string | null;
  status: "choosing" | "playing" | "summary" | "finished";
  rounds: Round[];
  usedPairIds: string[];
  autoCategoryId?: string | null;
  startedAt?: number;
  finishedAt?: number | null;
  finalStandings?: {
    profileId: string;
    position: number;
    points: number;
    totalTimeMs: number;
    rank: number;
  }[];
  finalAwards?: { profileId: string; points: number; winner: boolean }[];
}

export interface DomainEvent {
  id: string;
  aggregateType: "room" | "match" | "profile" | "moderation";
  aggregateId: string;
  version: number;
  schemaVersion: 1;
  type: string;
  audience: readonly string[];
  payload: { [key: string]: Json };
}

export type DeadlineKind =
  | "idle"
  | "holdout"
  | "countdown"
  | "stage"
  | "reconnect"
  | "empty-room";
export interface Deadline {
  id: string;
  aggregateId: string;
  expectedVersion: number;
  kind: DeadlineKind;
  dueAt: number;
}

export interface ModerationCase extends Versioned {
  sourceRoomId: string | null;
  proposerId: string;
  kind: "nomination" | "suggestion";
  payload: { [key: string]: Json };
  nominatorIds: string[];
  status:
    | "collecting"
    | "pending"
    | "pending_review"
    | "changes_requested"
    | "on_hold"
    | "approved"
    | "rejected"
    | "appealed";
  reviewerId: string | null;
  reason: string | null;
  appealed: boolean;
  appealResolved: boolean;
  playable: boolean;
}
