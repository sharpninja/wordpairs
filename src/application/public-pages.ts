export type PublicKind = "leaderboard" | "lobbies";
export type PageRequest = {
  offset: number;
  limit: number;
  revision: number | null;
};
export type PublicPage<T> = {
  rows: T[];
  revision: number;
  nextOffset: number | null;
};
export type Paging = { revision: number; next: string | null };
export const MAX_PUBLIC_OFFSET = 1000000;

/** Contains only a public snapshot revision and position, never identity fields. */
export function pageCursor(
  kind: PublicKind,
  revision: number,
  offset: number,
): string {
  return `1:${kind}:${revision}:${offset}`;
}
export function parsePage(
  kind: PublicKind,
  token: string | null,
): PageRequest | null {
  if (token === null) return { offset: 0, limit: 25, revision: null };
  if (token.length > 100) return null;
  const match = /^1:(leaderboard|lobbies):(0|[1-9]\d*):(0|[1-9]\d*)$/.exec(
    token,
  );
  if (!match || match[1] !== kind) return null;
  const revision = Number(match[2]);
  const offset = Number(match[3]);
  return Number.isSafeInteger(revision) &&
    Number.isSafeInteger(offset) &&
    offset <= MAX_PUBLIC_OFFSET
    ? { revision, offset, limit: 25 }
    : null;
}
export function minimumRevision(value: string | null): number | null {
  if (value === null) return 0;
  if (!/^(0|[1-9]\d*)$/.test(value) || value.length > 16) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}
export function paging<T>(kind: PublicKind, page: PublicPage<T>): Paging {
  return {
    revision: page.revision,
    next:
      page.nextOffset === null
        ? null
        : pageCursor(kind, page.revision, page.nextOffset),
  };
}
