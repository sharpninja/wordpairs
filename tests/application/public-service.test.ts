import { describe, expect, it, vi } from "vitest";
import { pageCursor, parsePage } from "../../src/application/public-pages";
import { PublicLandingService } from "../../src/application/public-service";
import { failure, success } from "../../src/domain/result";

const page = (revision = 1) => ({ rows: [], revision, nextOffset: null });
const repositoryAt = (revision: () => number) => ({
  leaderboard: vi.fn(async () => success(page(revision()))),
  lobbies: vi.fn(async () => success(page(revision()))),
});
describe("TR-30 bounded public reads and cache ownership", () => {
  it("refreshes lobbies at 15 seconds and rankings at 5 minutes independent of identity", async () => {
    let now = 0;
    const repository = repositoryAt(() => 1);
    const service = new PublicLandingService(repository, { now: () => now });
    expect((await service.read(null, null)).ok).toBe(true);
    now = 14999;
    await service.read(null, null);
    expect(repository.lobbies).toHaveBeenCalledTimes(1);
    now = 15000;
    await service.read(null, null);
    expect(repository.lobbies).toHaveBeenCalledTimes(2);
    expect(repository.leaderboard).toHaveBeenCalledTimes(1);
    now = 300000;
    await service.read(null, null);
    expect(repository.leaderboard).toHaveBeenCalledTimes(2);
    expect(repository.leaderboard).toHaveBeenLastCalledWith({ offset: 0, limit: 25, revision: null });
  });
  it("rejects malformed and cross-kind cursors before querying and never caches failures", async () => {
    const repository = { ...repositoryAt(() => 1), leaderboard: vi.fn(async () => failure("TEMPORARY_UNAVAILABLE")) };
    const service = new PublicLandingService(repository, { now: () => 0 });
    for (const token of ["-1", "1:leaderboard:1:-1", "1:lobbies:1:25", "1:leaderboard:1:1000001", "1:leaderboard:1:1.5", "1:leaderboard:9007199254740992:25", "x".repeat(1024)]) {
      expect(await service.read(token, null)).toEqual(failure("VALIDATION_ERROR"));
    }
    expect(await service.read(null, null, { minLobbyRevision: "NaN" })).toEqual(failure("VALIDATION_ERROR"));
    expect(repository.leaderboard).not.toHaveBeenCalled();
    expect(await service.read(null, null)).toEqual(failure("TEMPORARY_UNAVAILABLE"));
    await service.read(null, null);
    expect(repository.leaderboard).toHaveBeenCalledTimes(2);
    expect(parsePage("leaderboard", pageCursor("leaderboard", 5, 25))).toEqual({ offset: 25, limit: 25, revision: 5 });
  });
  it("checks every continuation against the database even within the cache TTL", async () => {
    const repository = repositoryAt(() => 1);
    const service = new PublicLandingService(repository, { now: () => 0 });
    const cursor = pageCursor("leaderboard", 1, 25);
    await service.read(cursor, null);
    repository.leaderboard.mockResolvedValue(failure("CONFLICT"));
    expect(await service.read(cursor, null)).toEqual(failure("CONFLICT"));
    expect(repository.leaderboard).toHaveBeenCalledTimes(2);
  });
  it("bypasses stale first-page caches on any server instance after a conflict and preserves minimum revisions", async () => {
    let revision = 1;
    const first = new PublicLandingService(repositoryAt(() => revision), { now: () => 0 });
    const other = new PublicLandingService(repositoryAt(() => revision), { now: () => 0 });
    await first.read(null, null);
    await other.read(null, null);
    revision = 2;
    const fresh = await first.read(null, null, { fresh: true });
    expect(fresh.ok && fresh.value.leaderboard.revision).toBe(2);
    const next = await other.read(null, null, { minLeaderboardRevision: "2", minLobbyRevision: "2" });
    expect(next.ok && next.value.leaderboard.revision).toBe(2);
    expect(next.ok && next.value.lobbies.revision).toBe(2);
  });
  it("never lets an old in-flight fetch overwrite a forced fresh snapshot", async () => {
    let complete!: (value: ReturnType<typeof success<ReturnType<typeof page>>>) => void;
    const repository = { ...repositoryAt(() => 2), leaderboard: vi.fn().mockImplementationOnce(() => new Promise(resolve => { complete = resolve; })).mockResolvedValue(success(page(2))) };
    const service = new PublicLandingService(repository, { now: () => 0 });
    const old = service.read(null, null);
    await Promise.resolve();
    await service.read(null, null, { fresh: true });
    complete(success(page(1)));
    await old;
    const current = await service.read(null, null);
    expect(current.ok && current.value.leaderboard.revision).toBe(2);
    expect(repository.leaderboard).toHaveBeenCalledTimes(2);
  });
});
