"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchService } from "../application/matches";
import { ProfileIcon } from "./identity-panel";
import { invalidatePrivateState } from "./private-state";
import { SocialPanel } from "./social-panel";

type Projection = Extract<
  Awaited<ReturnType<MatchService["view"]>>,
  { ok: true }
>["value"];
type View = Projection & {
  actorId: string;
  role: "player" | "observer";
  serverNow: number;
  labels: { id: string; alias: string; icon: string }[];
};
type Intent =
  | { action: "choose"; categoryId: string }
  | { action: "continue" }
  | { action: "answer"; roundId: string; stage: number; answer: string };
const BACKGROUNDS = new Set([
  "heroes",
  "colors",
  "years",
  "directors",
  "singers",
  "opposites",
]);
export function GamePanel({
  roomId,
  profileId,
  refreshKey,
  onFinished,
  live = false,
}: {
  roomId: string;
  profileId: string;
  refreshKey: number;
  onFinished: () => Promise<void>;
  live?: boolean;
}) {
  const [view, setView] = useState<View | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  const [loadedArt, setLoadedArt] = useState<string | null>(null);
  const [failedArt, setFailedArt] = useState<string | null>(null);
  const [artAttempt, setArtAttempt] = useState(0);
  const [portrait, setPortrait] = useState<boolean | null>(null);
  useEffect(() => {
    const update = () => setPortrait(window.innerHeight > window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const pending = useRef<Record<string, unknown> | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const lifecycle = useRef(0);
  const fetching = useRef(false);
  const refreshAgain = useRef(false);
  const offset = useRef(0);
  const deny = useCallback(() => {
    generation.current++;
    lifecycle.current++;
    fetching.current = false;
    refreshAgain.current = false;
    pending.current = null;
    invalidatePrivateState();
    setView(null);
    setAnswer("");
    setBusy(false);
    setError(
      "Your game perspective is unavailable. The followed player may have left.",
    );
  }, []);
  const endpoint = `/api/rooms/${encodeURIComponent(roomId)}/match`;
  const refresh = useCallback(async (): Promise<void> => {
    if (fetching.current) {
      refreshAgain.current = true;
      return;
    }
    fetching.current = true;
    const sequence = ++generation.current;
    let explanation = "Game updates are unavailable. Refresh to recover.";
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (sequence !== generation.current) {
        await response.text();
        return;
      }
      if ([401, 403, 404].includes(response.status)) {
        deny();
        await response.text();
        return;
      }
      const result = await response.json();
      if (sequence !== generation.current) return;
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status)) {
          lifecycle.current++;
          setBusy(false);
          setView(null);
          setAnswer("");
          pending.current = null;
        }
        explanation =
          response.status === 403
            ? "Your game perspective is unavailable. The followed player may have left."
            : "Game updates are unavailable. Refresh to recover.";
        throw new Error("Unavailable");
      }
      if (result.actorId !== profileId) {
        lifecycle.current++;
        setBusy(false);
        setView(null);
        setAnswer("");
        pending.current = null;
        throw new Error("Your account changed. Reload to continue.");
      }
      setView((previous) =>
        previous && previous.version > result.version ? previous : result,
      );
      offset.current = result.serverNow - Date.now();
      setNow(result.serverNow);
      setError("");
    } catch {
      if (sequence === generation.current) setError(explanation);
    } finally {
      if (sequence === generation.current) {
        fetching.current = false;
        if (refreshAgain.current) {
          refreshAgain.current = false;
          void refresh();
        }
      }
    }
  }, [endpoint, profileId, deny]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
      lifecycle.current++;
      fetching.current = false;
      refreshAgain.current = false;
    };
  }, [refresh]);
  useEffect(() => {
    const timer = setInterval(() => void refresh(), live ? 15000 : 1000);
    return () => clearInterval(timer);
  }, [refresh, live]);
  useEffect(() => {
    if (refreshKey === 0) return;
    void refresh();
  }, [refresh, refreshKey]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset.current), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (view?.status === "finished") void onFinished();
  }, [view?.status, onFinished]);
  const send = async (intent?: Intent) => {
    if (!view || inFlight.current || view.role !== "player") return;
    const sequence = lifecycle.current;
    const input =
      pending.current ??
      (intent
        ? {
            ...intent,
            expectedProfileId: profileId,
            expectedVersion: view.version,
            commandId: crypto.randomUUID(),
          }
        : null);
    if (!input) return;
    inFlight.current = true;
    pending.current = input;
    setBusy(true);
    setError("");
    setNotice("");
    let explanation = "Game service is unavailable. Retry the same request.";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(10000),
      });
      if (sequence !== lifecycle.current) {
        await response.text();
        return;
      }
      if ([401, 403, 404].includes(response.status)) {
        deny();
        await response.text();
        return;
      }
      const result = await response.json();
      if (sequence !== lifecycle.current) return;
      if (!response.ok) {
        if (response.status < 500) {
          pending.current = null;
          if ([401, 403, 404].includes(response.status)) {
            setView(null);
            setAnswer("");
          } else await refresh();
        }
        explanation =
          response.status === 409
            ? "The round or account changed. Review the current stage and try again."
            : "Your request was not confirmed. Retry the same request.";
        throw new Error("Unavailable");
      }
      pending.current = null;
      setConfirmed(result.version);
      if (input.action === "answer") {
        setAnswer("");
        setNotice(
          result.correct
            ? `Solved · +${result.points} points. Your score is locked.`
            : "Answer received. Wait for the next hint or round result.",
        );
      }
      await refresh();
    } catch {
      if (sequence === lifecycle.current) setError(explanation);
    } finally {
      inFlight.current = false;
      if (sequence === lifecycle.current) setBusy(false);
    }
  };
  const locked =
    busy || pending.current !== null || !!(view && confirmed > view.version);
  const label = (id: string) =>
    view?.labels.find((p) => p.id === id) ?? {
      id,
      alias: "Player",
      icon: "owl",
    };
  const choosing =
    view && (view.status === "choosing" || view.status === "summary");
  const category = view?.categories.find((c) => c.id === view.autoCategoryId);
  const art = view?.round?.backgroundId;
  const artUrl =
    art && BACKGROUNDS.has(art) && portrait !== null
      ? `/backgrounds/${art}-${portrait ? "9x16" : "16x9"}.webp`
      : null;
  const requestedArtUrl =
    artUrl && artAttempt > 0 ? `${artUrl}?attempt=${artAttempt}` : artUrl;
  useEffect(() => {
    if (!requestedArtUrl) return;
    let active = true;
    const probe = new Image();
    probe.onload = () => {
      if (active) {
        setLoadedArt(requestedArtUrl);
        setFailedArt(null);
      }
    };
    probe.onerror = () => {
      if (active) setFailedArt(requestedArtUrl);
    };
    probe.src = requestedArtUrl;
    return () => {
      active = false;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [requestedArtUrl]);
  const artwork =
    !requestedArtUrl || failedArt === requestedArtUrl
      ? "fallback"
      : loadedArt === requestedArtUrl
        ? "loaded"
        : "loading";
  const background =
    requestedArtUrl && failedArt !== requestedArtUrl
      ? `url(${requestedArtUrl})`
      : undefined;
  return (
    <>
      <div
        className="game-backdrop"
        style={{ backgroundImage: background }}
        aria-hidden="true"
      />
      <section
        className="panel game-panel"
        aria-labelledby="game-title"
        aria-busy={busy}
        data-match-version={view?.version}
        data-artwork={artwork}
      >
        <div className="game-surface">
          <div className="panel-heading">
            <h2 id="game-title">
              {view?.status === "finished" ? "Final standings" : "The game"}
            </h2>
            <button type="button" onClick={() => void refresh()}>
              Refresh game
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          {!view && !error && <p role="status">Loading the game…</p>}
          {view && (
            <>
              <p
                className="sr-only"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                Round {view.roundNumber}. {view.status}.
                {view.round
                  ? ` Stage ${view.round.stage}. ${view.round.pointsAvailable} points available.`
                  : ""}
                {view.scorecard
                  ?.map(
                    (row) =>
                      `${label(row.profileId).alias}: ${row.points} points.`,
                  )
                  .join(" ")}
              </p>
              <p>
                Round {view.roundNumber} / {view.roundsTotal} · Anchor:{" "}
                {label(view.anchorId).alias}
                {view.role === "observer" ? " · Read-only observer" : ""}
              </p>
              {choosing && (
                <div className="category-selection">
                  {view.autoCategoryId ? (
                    <>
                      <p role="status">
                        No player solved. The next category was drawn uniformly:{" "}
                        {category?.name}.
                      </p>
                      {view.role === "player" && (
                        <button
                          type="button"
                          className="button"
                          disabled={locked}
                          onClick={() => void send({ action: "continue" })}
                        >
                          Play next round
                        </button>
                      )}
                    </>
                  ) : view.chooserId === profileId && view.role === "player" ? (
                    <>
                      <h3>Choose a category</h3>
                      <div className="category-choices">
                        {view.categories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="button secondary"
                            disabled={locked}
                            onClick={() =>
                              void send({ action: "choose", categoryId: c.id })
                            }
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p role="status">
                      Waiting for {label(view.chooserId ?? "").alias} to choose
                      the next category.
                      {view.chooserPresent === false
                        ? " This player is no longer in the room. You can leave and create a new game."
                        : ""}
                    </p>
                  )}
                </div>
              )}
              {view.round && (
                <>
                  <h3 className="game-prompt">{view.round.prompt}</h3>
                  {artwork === "fallback" && (
                    <p role="status">
                      <span>Category artwork unavailable</span>
                      {artUrl && (
                        <>
                          {" "}
                          ·{" "}
                          <button
                            type="button"
                            onClick={() => setArtAttempt((value) => value + 1)}
                          >
                            Retry artwork
                          </button>
                        </>
                      )}
                    </p>
                  )}
                  {view.status === "playing" && (
                    <p className="round-timer">
                      {view.round.stage === 0
                        ? "No hint"
                        : `Hint ${view.round.stage}`}{" "}
                      · {view.round.pointsAvailable} points ·{" "}
                      {Math.max(
                        0,
                        Math.ceil((view.round.stageDueAt - now) / 1000),
                      )}{" "}
                      seconds remaining
                    </p>
                  )}
                  {view.round.hints.length > 0 && (
                    <ol className="game-hints" aria-label="Your visible hints">
                      {view.round.hints.map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ol>
                  )}
                  {view.round.revealed && (
                    <p className="answer-reveal">
                      Correct answer:{" "}
                      <strong>{view.round.correctAnswer}</strong>
                    </p>
                  )}
                  {view.role === "player" && view.round.canAnswer && (
                    <form
                      className="answer-entry"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!locked && answer.trim())
                          void send({
                            action: "answer",
                            roundId: view.round?.roundId as string,
                            stage: view.round?.stage as number,
                            answer,
                          });
                      }}
                    >
                      <label htmlFor={`answer-${roomId}`}>
                        Your answer
                        <input
                          id={`answer-${roomId}`}
                          name="answer"
                          type="text"
                          maxLength={200}
                          autoComplete="off"
                          disabled={locked}
                          value={answer}
                          onChange={(event) => setAnswer(event.target.value)}
                        />
                      </label>
                      <button
                        className="button"
                        type="submit"
                        disabled={locked || !answer.trim()}
                      >
                        Submit answer
                      </button>
                    </form>
                  )}
                  {view.status === "playing" && view.round.solved && (
                    <p role="status">
                      ✓ Solved. Your score is locked; later hints stay private
                      to unsolved players.
                    </p>
                  )}
                  {view.status === "playing" &&
                    view.round.submitted &&
                    !view.round.solved && (
                      <p role="status">
                        Answer submitted for this stage. Waiting for other
                        players or the deadline.
                      </p>
                    )}
                  <table className="score-table">
                    <caption>Round {view.roundNumber} scorecard</caption>
                    <thead>
                      <tr>
                        <th scope="col">Player</th>
                        <th scope="col">Status</th>
                        <th scope="col">Points</th>
                        <th scope="col">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.scorecard.map((row) => (
                        <tr key={row.profileId}>
                          <th scope="row">
                            <ProfileIcon icon={label(row.profileId).icon} />{" "}
                            {label(row.profileId).alias}
                          </th>
                          <td>
                            {row.solved
                              ? "✓ Solved"
                              : view.round?.revealed
                                ? "Unsolved"
                                : "Solving"}
                          </td>
                          <td>{row.points}</td>
                          <td>
                            {row.elapsedMs === null
                              ? "—"
                              : `${(row.elapsedMs / 1000).toFixed(1)}s`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {view.roundNumber > 0 && (
                <table className="score-table">
                  <caption>
                    {view.status === "finished"
                      ? "Final ranking"
                      : `Cumulative ranking · round ${view.roundNumber}`}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Rank</th>
                      <th scope="col">Player</th>
                      <th scope="col">Total points</th>
                      <th scope="col">Total time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.standings.map((row) => (
                      <tr key={row.profileId}>
                        <td>{row.rank}</td>
                        <th scope="row">
                          <ProfileIcon icon={label(row.profileId).icon} />{" "}
                          {label(row.profileId).alias}
                        </th>
                        <td>{row.points}</td>
                        <td>{(row.totalTimeMs / 1000).toFixed(1)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {view.status === "finished" && (
                <>
                  <p role="status">
                    Eight rounds complete. Equal points use total answer time;
                    exact ties share rank. An unsolved round counts as 80
                    seconds.
                  </p>
                  <Link className="button" href="/play">
                    Create or join another room
                  </Link>
                </>
              )}
              <SocialPanel
                live={live}
                roomId={roomId}
                profileId={profileId}
                canReact={view.status === "playing" && view.role === "player"}
                roundId={view.round?.roundId ?? null}
                canNominate={
                  view.role === "player" && !!view.round?.nominationEligible
                }
                now={now}
                refreshKey={refreshKey}
                labels={view.labels}
              />
              {pending.current && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send()}
                >
                  Retry pending game request
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
