import type { ContentAction } from "../application/content";
import type { CuratedPackage, Proposal } from "../domain/content";
import { isRoomId } from "../domain/rooms";

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const only = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((k) => keys.includes(k));
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;
const id = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
function proposal(value: unknown): value is Proposal {
  return (
    object(value) &&
    only(value, ["category", "pairs"]) &&
    text(value.category, 80) &&
    Array.isArray(value.pairs) &&
    value.pairs.length === 3 &&
    value.pairs.every(
      (p) =>
        object(p) &&
        only(p, ["prompt", "target"]) &&
        text(p.prompt, 200) &&
        text(p.target, 200),
    )
  );
}
function curated(value: unknown): value is CuratedPackage {
  if (
    !object(value) ||
    !only(value, ["category", "pairs"]) ||
    !object(value.category) ||
    !only(value.category, [
      "id",
      "version",
      "name",
      "backgroundId",
      "approved",
    ]) ||
    !id(value.category.id) ||
    !Number.isSafeInteger(value.category.version) ||
    !text(value.category.name, 80) ||
    !id(value.category.backgroundId) ||
    value.category.approved !== true ||
    !Array.isArray(value.pairs) ||
    value.pairs.length < 1 ||
    value.pairs.length > 3
  )
    return false;
  return value.pairs.every(
    (p) =>
      object(p) &&
      only(p, [
        "id",
        "version",
        "categoryId",
        "prompt",
        "target",
        "acceptedAnswers",
        "hints",
        "backgroundId",
        "approved",
      ]) &&
      id(p.id) &&
      Number.isSafeInteger(p.version) &&
      id(p.categoryId) &&
      text(p.prompt, 200) &&
      text(p.target, 200) &&
      Array.isArray(p.hints) &&
      p.hints.length === 3 &&
      p.hints.every((h) => text(h, 400)) &&
      Array.isArray(p.acceptedAnswers) &&
      p.acceptedAnswers.length <= 20 &&
      p.acceptedAnswers.every((a) => text(a, 200)) &&
      id(p.backgroundId) &&
      p.approved === true,
  );
}
export function contentAction(
  input: Record<string, unknown>,
): ContentAction | null {
  const common = [
    "action",
    "expectedProfileId",
    "expectedVersion",
    "commandId",
  ];
  const fields = (extra: string[]) => only(input, [...common, ...extra]);
  if (
    input.action === "nominate" &&
    fields(["roomId", "roundId", "word"]) &&
    typeof input.roomId === "string" &&
    isRoomId(input.roomId) &&
    id(input.roundId) &&
    text(input.word, 200)
  )
    return {
      type: "nominate",
      roomId: input.roomId,
      roundId: input.roundId,
      word: input.word,
    };
  if (
    input.action === "suggest" &&
    fields(["proposal"]) &&
    proposal(input.proposal)
  )
    return { type: "suggest", proposal: input.proposal };
  if (
    input.action === "review" &&
    fields(["caseId", "decision", "reason"]) &&
    id(input.caseId) &&
    (input.decision === "approve" || input.decision === "reject") &&
    text(input.reason, 1000)
  )
    return {
      type: "review",
      caseId: input.caseId,
      decision: input.decision,
      reason: input.reason,
    };
  if (
    input.action === "appeal" &&
    fields(["caseId", "reason"]) &&
    id(input.caseId) &&
    text(input.reason, 1000)
  )
    return { type: "appeal", caseId: input.caseId, reason: input.reason };
  if (
    input.action === "resolve" &&
    fields(["caseId", "outcome", "reason"]) &&
    id(input.caseId) &&
    (input.outcome === "uphold" || input.outcome === "overturn") &&
    text(input.reason, 1000)
  )
    return {
      type: "resolve",
      caseId: input.caseId,
      outcome: input.outcome,
      reason: input.reason,
    };
  if (
    input.action === "activate" &&
    fields(["caseId", "content"]) &&
    id(input.caseId) &&
    curated(input.content)
  )
    return { type: "activate", caseId: input.caseId, content: input.content };
  if (
    input.action === "disable" &&
    fields(["pairId", "pairVersion", "reason"]) &&
    id(input.pairId) &&
    Number.isSafeInteger(input.pairVersion) &&
    (input.pairVersion as number) >= 0 &&
    text(input.reason, 1000)
  )
    return {
      type: "disable",
      pairId: input.pairId,
      pairVersion: input.pairVersion as number,
      reason: input.reason,
    };
  return null;
}
