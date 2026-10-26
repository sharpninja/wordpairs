import { describe, expect, it, vi } from "vitest";
import { failure, success } from "../../src/domain/result";
import { PostgresPublicReadRepository } from "../../src/infrastructure/public-read";

describe("public read adapter SQL boundary", () => {
  it("uses a bounded public projection RPC with a snapshot revision and releases its connection", async () => {
    const page = { rows: [], revision: 2, nextOffset: null };
    const query = vi.fn(async () => ({ rows: [{ response: page }] }));
    const release = vi.fn();
    const repository = new PostgresPublicReadRepository({ connect: async () => ({ query, release }) });
    expect(await repository.leaderboard({ offset: 25, limit: 25, revision: 2 })).toEqual(success(page));
    expect(query).toHaveBeenCalledWith("select public.wordpairs_public_profiles($1,$2,$3) as response", [25, 25, 2]);
    expect(release).toHaveBeenCalledTimes(1);
  });
  it("maps a changed snapshot to a recoverable conflict", async () => {
    const repository = new PostgresPublicReadRepository({ connect: async () => ({ query: async () => ({ rows: [{ response: { conflict: true } }] }), release: () => {} }) });
    expect(await repository.lobbies({ offset: 25, limit: 25, revision: 1 })).toEqual(failure("CONFLICT"));
  });
  it("redacts query failures and reports resource limits without leaking provider details", async () => {
    for (const [code, expected] of [["53300", "SERVICE_LIMIT"], ["XX000", "TEMPORARY_UNAVAILABLE"], ["22023", "VALIDATION_ERROR"]] as const) {
      const release = vi.fn();
      const repository = new PostgresPublicReadRepository({ connect: async () => ({ query: async () => { throw Object.assign(new Error("DO-NOT-LEAK"), { code }); }, release }) });
      expect(await repository.lobbies({ offset: 0, limit: 25, revision: null })).toEqual(failure(expected));
      expect(release).toHaveBeenCalledTimes(1);
    }
  });
});
