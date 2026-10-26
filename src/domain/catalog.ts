import type { Category, Pair } from "./model";
import { failure, type Result, success } from "./result";
import caseFoldData from "./unicode-casefold.json" with { type: "json" };
export function fullCaseFold(value: string): string {
  const mappings: Record<string, string> = caseFoldData;
  return [...value]
    .map((character) => mappings[character] ?? character)
    .join("");
}

export interface Catalog {
  categories: Category[];
  pairs: Pair[];
  initialCategoryIds: string[];
}
export function normalizeAnswer(value: string): string {
  return fullCaseFold(value.normalize("NFKC").trim().replace(/\s+/gu, " "));
}
const text = (value: unknown, maximum: number): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maximum;
export function buildCatalog(
  categories: Category[],
  pairs: Pair[],
  initialCategoryIds = categories
    .filter((c) => c.approved)
    .slice(0, 6)
    .map((c) => c.id),
): Result<Catalog> {
  const approved = categories.filter((c) => c.approved);
  if (
    new Set(approved.map((c) => c.id)).size !== approved.length ||
    approved.some(
      (c) =>
        !text(c.id, 128) ||
        !text(c.name, 80) ||
        !text(c.backgroundId, 128) ||
        !Number.isSafeInteger(c.version) ||
        c.version < 0,
    )
  )
    return failure("VALIDATION_ERROR");
  const eligible = pairs.filter(
    (p) => p.approved && approved.some((c) => c.id === p.categoryId),
  );
  if (
    new Set(eligible.map((p) => `${p.id}:${p.version}`)).size !==
      eligible.length ||
    eligible.some(
      (p) =>
        !text(p.id, 128) ||
        !Number.isSafeInteger(p.version) ||
        p.version < 0 ||
        !text(p.prompt, 200) ||
        !text(p.target, 200) ||
        !Array.isArray(p.hints) ||
        p.hints.length !== 3 ||
        p.hints.some((h) => !text(h, 400)) ||
        !Array.isArray(p.acceptedAnswers) ||
        p.acceptedAnswers.some((a) => !text(a, 200)) ||
        p.backgroundId !==
          approved.find((c) => c.id === p.categoryId)?.backgroundId,
    )
  )
    return failure("VALIDATION_ERROR");
  if (
    new Set(initialCategoryIds).size !== initialCategoryIds.length ||
    initialCategoryIds.some((id) => !approved.some((c) => c.id === id))
  )
    return failure("VALIDATION_ERROR");
  return success(
    structuredClone({
      categories: approved,
      pairs: eligible,
      initialCategoryIds,
    }),
  );
}
export function categoryPool(catalog: Catalog, categoryId: string): Pair[] {
  const newest = new Map<string, Pair>();
  for (const pair of catalog.pairs.filter((p) => p.categoryId === categoryId)) {
    if ((newest.get(pair.id)?.version ?? -1) < pair.version)
      newest.set(pair.id, pair);
  }
  return [...newest.values()].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
}
export function roundPair(
  catalog: Catalog,
  pairId: string,
  version: number,
): Pair | undefined {
  return catalog.pairs.find((p) => p.id === pairId && p.version === version);
}
