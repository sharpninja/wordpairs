"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { minimumRevision, parsePage } from "../application/public-pages";
import {
  GAMEPLAY_RULES,
  type LandingProjection,
  LOBBY_REFRESH_MS,
  RULES_METADATA,
} from "../application/public-projections";

function rankingRows(rows: LandingProjection["leaderboard"]) {
  const occurrences = new Map<string, number>();
  return rows.map((entry) => {
    const value = JSON.stringify(entry);
    const occurrence = occurrences.get(value) ?? 0;
    occurrences.set(value, occurrence + 1);
    return { entry, key: `${value}:${occurrence}` };
  });
}

export function LandingBoard({
  initialData,
  resetForSeatLoss = false,
}: {
  initialData: LandingProjection | null;
  resetForSeatLoss?: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [failed, setFailed] = useState(
    !resetForSeatLoss && initialData === null,
  );
  const [loading, setLoading] = useState(resetForSeatLoss);
  const [pages, setPages] = useState({
    leaderboard: [null] as (string | null)[],
    lobbies: [null] as (string | null)[],
  });
  const leaderboardPage = pages.leaderboard.length - 1;
  const lobbyPage = pages.lobbies.length - 1;
  const leaderboardCursor = pages.leaderboard[leaderboardPage];
  const lobbyCursor = pages.lobbies[lobbyPage];
  const [next, setNext] = useState({
    leaderboard: null as string | null,
    lobbies: null as string | null,
  });
  const [changed, setChanged] = useState<"refreshing" | "updated" | null>(null);
  const [rankingOffset, setRankingOffset] = useState(0);
  const minimum = useRef({ leaderboard: 0, lobbies: 0 });
  const freshNext = useRef(resetForSeatLoss);
  const sequence = useRef(0);
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(
    async (poll = false) => {
      if (poll && active.current) return;
      const requestSequence = ++sequence.current;
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      const signal = controller.signal;
      const ownsResponse = () =>
        !signal.aborted && requestSequence === sequence.current;
      setLoading(true);
      const timeout = setTimeout(() => {
        if (requestSequence !== sequence.current) return;
        controller.abort();
        active.current = null;
        setLoading(false);
        setFailed(true);
      }, 10000);
      try {
        const params = new URLSearchParams({
          minLeaderboardRevision: String(minimum.current.leaderboard),
          minLobbyRevision: String(minimum.current.lobbies),
        });
        if (leaderboardCursor)
          params.set("leaderboardCursor", leaderboardCursor);
        if (lobbyCursor) params.set("lobbyCursor", lobbyCursor);
        if (freshNext.current) params.set("fresh", "1");
        const response = await fetch(`/api/landing?${params}`, {
          credentials: "omit",
          cache: "no-store",
          signal,
        });
        if (!ownsResponse()) return;
        if (response.status === 409 && (leaderboardCursor || lobbyCursor)) {
          freshNext.current = true;
          setChanged("refreshing");
          setNext({ leaderboard: null, lobbies: null });
          setPages({ leaderboard: [null], lobbies: [null] });
          return;
        }
        if (!response.ok) throw new Error("Public information unavailable");
        const next = (await response.json()) as LandingProjection;
        if (
          !Array.isArray(next.leaderboard) ||
          !Array.isArray(next.lobbies) ||
          !next.rules
        )
          throw new Error("Invalid public response");
        if (ownsResponse()) {
          const leaderboardRevision = minimumRevision(
            response.headers?.get("X-Leaderboard-Revision") ?? null,
          );
          const lobbyRevision = minimumRevision(
            response.headers?.get("X-Lobby-Revision") ?? null,
          );
          if (
            leaderboardRevision === null ||
            lobbyRevision === null ||
            leaderboardRevision < minimum.current.leaderboard ||
            lobbyRevision < minimum.current.lobbies
          )
            throw new Error("Stale public response");
          minimum.current = {
            leaderboard: leaderboardRevision,
            lobbies: lobbyRevision,
          };
          if (freshNext.current) setChanged("updated");
          freshNext.current = false;
          setRankingOffset(
            parsePage("leaderboard", leaderboardCursor)?.offset ?? 0,
          );
          const rankingNext =
            response.headers?.get("X-Leaderboard-Next") ?? null;
          const lobbyNext = response.headers?.get("X-Lobby-Next") ?? null;
          setNext({
            leaderboard:
              rankingNext && parsePage("leaderboard", rankingNext)
                ? rankingNext
                : null,
            lobbies:
              lobbyNext && parsePage("lobbies", lobbyNext) ? lobbyNext : null,
          });
          setData(next);
          setFailed(false);
        }
      } catch {
        if (ownsResponse()) setFailed(true);
      } finally {
        clearTimeout(timeout);
        if (ownsResponse()) {
          active.current = null;
          setLoading(false);
        }
      }
    },
    [leaderboardCursor, lobbyCursor],
  );
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh(true);
    }, LOBBY_REFRESH_MS);
    return () => {
      sequence.current++;
      active.current?.abort();
      clearInterval(timer);
    };
  }, [refresh]);
  return (
    <div className="public-area" id="community">
      {resetForSeatLoss && (
        <p role="status">
          That room is no longer available. Choose another open room.
        </p>
      )}
      {loading && !data && <p role="status">Loading the community board…</p>}
      <div className="section-heading">
        <div>
          <p className="eyebrow">The community board</p>
          <p>Find your next room. Make your next connection.</p>
        </div>
        <button
          className="button subtle"
          type="button"
          disabled={loading}
          onClick={() => {
            void refresh();
          }}
          aria-label="Refresh public information"
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>
      <div className="public-grid" aria-busy={loading}>
        <section className="panel" aria-labelledby="leaderboard-title">
          <div className="panel-heading">
            <span className="badge">01</span>
            <h2 id="leaderboard-title">Leaderboard</h2>
            <span className="small-label">Lifetime wins</span>
          </div>
          {failed ? (
            <p className="state-message" role="status">
              Try again later
            </p>
          ) : !data?.leaderboard.length ? (
            <p className="state-message">No games yet</p>
          ) : (
            <div className="table-scroll">
              <table>
                <caption className="visually-hidden">
                  Players ranked by lifetime wins, total points, earliest win
                  and stable profile ID
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Player</th>
                    <th scope="col">Wins</th>
                    <th scope="col">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingRows(data.leaderboard).map(
                    ({ entry, key }, index) => (
                      <tr key={key}>
                        <td>{rankingOffset + index + 1}</td>
                        <th scope="row">{entry.alias}</th>
                        <td>{entry.wins}</td>
                        <td>{entry.points}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="panel-note">
            Public aliases only · Refreshes every 5 minutes
          </p>
          <div className="pagination">
            <button
              type="button"
              disabled={loading || leaderboardPage === 0}
              onClick={() =>
                setPages((value) => ({
                  ...value,
                  leaderboard: value.leaderboard.slice(0, -1),
                }))
              }
            >
              Previous rankings
            </button>
            <button
              type="button"
              disabled={loading || failed || next.leaderboard === null}
              onClick={() =>
                setPages((value) => ({
                  ...value,
                  leaderboard: [...value.leaderboard, next.leaderboard],
                }))
              }
            >
              More rankings
            </button>
          </div>
        </section>
        <section className="panel" aria-labelledby="lobbies-title">
          <div className="panel-heading">
            <span className="badge green">02</span>
            <h2 id="lobbies-title">Open lobbies</h2>
            <span className="small-label">Ready for company</span>
          </div>
          {failed ? (
            <p className="state-message" role="status">
              Try again later
            </p>
          ) : !data?.lobbies.length ? (
            <div className="state-message">
              <p>No joinable rooms</p>
              <Link href="/play">Create the first room →</Link>
            </div>
          ) : (
            <ul className="lobby-list">
              {data.lobbies.map((room) => (
                <li key={room.roomId}>
                  <div>
                    <strong>Waiting for players</strong>
                    <span>
                      {room.playerCount} / {room.capacity} players ·{" "}
                      {Math.floor(room.ageSeconds / 60)}m old
                    </span>
                  </div>
                  <Link
                    className="button compact"
                    href={`/rooms/${encodeURIComponent(room.roomId)}?from=discovery`}
                  >
                    Join room <span aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="panel-note">
            Private and full rooms stay private · Refreshes every 15 seconds
          </p>
          <div className="pagination">
            <button
              type="button"
              disabled={loading || lobbyPage === 0}
              onClick={() =>
                setPages((value) => ({
                  ...value,
                  lobbies: value.lobbies.slice(0, -1),
                }))
              }
            >
              Previous lobbies
            </button>
            <button
              type="button"
              disabled={loading || failed || next.lobbies === null}
              onClick={() =>
                setPages((value) => ({
                  ...value,
                  lobbies: [...value.lobbies, next.lobbies],
                }))
              }
            >
              More lobbies
            </button>
          </div>
        </section>
      </div>
      {changed && (
        <p role="status">
          {changed === "updated"
            ? "The board changed. Showing the latest first page."
            : "The board changed. Refreshing the first page…"}
        </p>
      )}
      <section className="rules-panel" id="rules" aria-labelledby="rules-title">
        <div>
          <p className="eyebrow">A little wordplay goes a long way</p>
          <h2 id="rules-title">How to play</h2>
          <p className="panel-note">
            Rules v{RULES_METADATA.version} · Updated{" "}
            <time dateTime={RULES_METADATA.updated}>26 October 2026</time>
          </p>
        </div>
        <ol>
          {GAMEPLAY_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
