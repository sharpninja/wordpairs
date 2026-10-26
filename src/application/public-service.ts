import { failure, type Result, success } from "../domain/result";
import type { Clock } from "./ports";
import {
  minimumRevision,
  type PageRequest,
  type PublicPage,
  paging,
  parsePage,
} from "./public-pages";
import {
  LEADERBOARD_REFRESH_MS,
  LOBBY_REFRESH_MS,
  landingProjection,
  type PublicProfileSource,
  type PublicRoomSource,
} from "./public-projections";

export interface PublicReadRepository {
  leaderboard(
    bounds: PageRequest,
  ): Promise<Result<PublicPage<PublicProfileSource>>>;
  lobbies(bounds: PageRequest): Promise<Result<PublicPage<PublicRoomSource>>>;
}

class PublicCache<T> {
  private value: { at: number; page: PublicPage<T> } | null = null;
  private pending: Promise<Result<PublicPage<T>>> | null = null;
  constructor(
    private clock: Clock,
    private ttl: number,
  ) {}
  read(
    minimum: number,
    fresh: boolean,
    fetcher: () => Promise<Result<PublicPage<T>>>,
  ): Promise<Result<PublicPage<T>>> {
    const cached = this.value;
    if (
      !fresh &&
      cached &&
      cached.page.revision >= minimum &&
      this.clock.now() < cached.at + this.ttl
    )
      return Promise.resolve(success(cached.page));
    if (!fresh && this.pending)
      return this.pending.then((result) =>
        result.ok && result.value.revision < minimum
          ? this.read(minimum, true, fetcher)
          : result,
      );
    const task = Promise.resolve()
      .then(fetcher)
      .then((result) => {
        if (result.ok && this.pending === task)
          this.value = { at: this.clock.now(), page: result.value };
        return result;
      })
      .catch(() => failure("TEMPORARY_UNAVAILABLE"))
      .finally(() => {
        if (this.pending === task) this.pending = null;
      });
    this.pending = task;
    return task;
  }
}

/** Snapshot revisions travel with rows. Continuations always check the database. */
export class PublicLandingService {
  private profiles: PublicCache<PublicProfileSource>;
  private rooms: PublicCache<PublicRoomSource>;
  constructor(
    private repository: PublicReadRepository,
    private clock: Clock,
  ) {
    this.profiles = new PublicCache(clock, LEADERBOARD_REFRESH_MS);
    this.rooms = new PublicCache(clock, LOBBY_REFRESH_MS);
  }
  async read(
    leaderboardCursor: string | null,
    lobbyCursor: string | null,
    options: {
      minLeaderboardRevision?: string | null;
      minLobbyRevision?: string | null;
      fresh?: boolean;
    } = {},
  ) {
    const profiles = parsePage("leaderboard", leaderboardCursor);
    const rooms = parsePage("lobbies", lobbyCursor);
    const minProfiles = minimumRevision(options.minLeaderboardRevision ?? null);
    const minRooms = minimumRevision(options.minLobbyRevision ?? null);
    if (!profiles || !rooms || minProfiles === null || minRooms === null)
      return failure("VALIDATION_ERROR");
    const [ranking, lobbies] = await Promise.all([
      profiles.revision === null
        ? this.profiles.read(minProfiles, options.fresh === true, () =>
            this.repository.leaderboard(profiles),
          )
        : this.repository.leaderboard(profiles),
      rooms.revision === null
        ? this.rooms.read(minRooms, options.fresh === true, () =>
            this.repository.lobbies(rooms),
          )
        : this.repository.lobbies(rooms),
    ]);
    if (!ranking.ok) return ranking;
    if (!lobbies.ok) return lobbies;
    return success({
      projection: landingProjection(
        ranking.value.rows,
        lobbies.value.rows,
        this.clock.now(),
      ),
      leaderboard: paging("leaderboard", ranking.value),
      lobbies: paging("lobbies", lobbies.value),
    });
  }
}
