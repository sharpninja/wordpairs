"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactionService } from "../application/reactions";
import { REACTIONS } from "../domain/reactions";
import { usePrivateIntent } from "./use-private-intent";

type View = Extract<
  Awaited<ReturnType<ReactionService["view"]>>,
  { ok: true }
>["value"];
export function SocialPanel({
  roomId,
  profileId,
  canReact,
  roundId,
  canNominate,
  now,
  refreshKey,
  labels,
  live = false,
}: {
  roomId: string;
  profileId: string;
  canReact: boolean;
  roundId: string | null;
  canNominate: boolean;
  now: number;
  refreshKey: number;
  labels: { id: string; alias: string }[];
  live?: boolean;
}) {
  const [view, setView] = useState<View | null>(null);
  const [contentVersion, setContentVersion] = useState<number | null>(null);
  const [nominated, setNominated] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const fetching = useRef(false);
  const refreshAgain = useRef(false);
  const contentFetched = useRef(false);
  const nominationRound = useRef<string | null>(null);
  const endpoint = `/api/rooms/${encodeURIComponent(roomId)}/reactions`;
  const deny = useCallback(() => {
    generation.current++;
    fetching.current = false;
    refreshAgain.current = false;
    contentFetched.current = false;
    setView(null);
    setContentVersion(null);
    setNominated(null);
    setError("Reactions and nominations require current room access.");
  }, []);
  const refresh = useCallback(async (): Promise<void> => {
    if (fetching.current) {
      refreshAgain.current = true;
      return;
    }
    fetching.current = true;
    const sequence = ++generation.current;
    try {
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
          if ([401, 403, 404].includes(response.status)) setView(null);
          throw new Error(
            "Reactions are unavailable. Refresh or wait for reconnection.",
          );
        }
        if (result.actorId !== profileId) {
          setView(null);
          return;
        }
        if (Array.isArray(result.reactions))
          setView((previous) =>
            previous && previous.version > result.version ? previous : result,
          );
        setError("");
      } catch {
        if (sequence === generation.current)
          setError(
            "Reactions are unavailable. Refresh or wait for reconnection.",
          );
      }
      if (canNominate && roundId && !contentFetched.current) {
        try {
          const response = await fetch("/api/content", {
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
          });
          const result = await response.json();
          if (
            sequence === generation.current &&
            response.ok &&
            result.actorId === profileId
          ) {
            setContentVersion(result.version);
            contentFetched.current = true;
            if (result.nominatedRoundIds?.includes(roundId))
              setNominated(roundId);
          }
        } catch {
          /* Keep an uncertain nomination available for explicit retry. */
        }
      }
    } finally {
      if (sequence === generation.current) {
        fetching.current = false;
        if (refreshAgain.current) {
          refreshAgain.current = false;
          void refresh();
        }
      }
    }
  }, [endpoint, profileId, canNominate, roundId, deny]);
  useEffect(() => {
    fetching.current = false;
    contentFetched.current = false;
    void refresh();
    return () => {
      generation.current++;
      fetching.current = false;
      refreshAgain.current = false;
    };
  }, [refresh]);
  useEffect(() => {
    const timer = setInterval(() => void refresh(), live ? 15000 : 1000);
    return () => clearInterval(timer);
  }, [refresh, live]);
  useEffect(() => {
    if (refreshKey > 0) void refresh();
  }, [refresh, refreshKey]);
  const intent = usePrivateIntent(
    profileId,
    async () => {
      contentFetched.current = false;
      await refresh();
    },
    deny,
    `social:${roomId}`,
  );
  const react = async (emoji: string) => {
    const result = await intent.send(endpoint, {
      emoji,
      expectedVersion: view?.version ?? 0,
    });
    if (result?.expiresAt) setCooldown(result.expiresAt - 3000);
  };
  return (
    <aside className="social-panel" aria-label="Reactions and nominations">
      {error && <p role="status">{error}</p>}
      {intent.error && <p role="alert">{intent.error}</p>}
      <ul className="reactions" aria-label="Room reactions" aria-live="polite">
        {view?.reactions
          .filter((r) => now < r.expiresAt)
          .map((r) => (
            <li key={r.id}>
              <span>
                {labels.find((p) => p.id === r.actorId)?.alias ?? "Player"}:{" "}
              </span>
              <span role="img" aria-label={r.emoji}>
                {r.emoji}
              </span>
            </li>
          ))}
      </ul>
      {canReact && (
        <details>
          <summary>Send a reaction</summary>
          <div className="reaction-menu">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`React with ${emoji}`}
                disabled={intent.locked || now < cooldown}
                onClick={() => void react(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p>One reaction every two seconds; visible for five seconds.</p>
        </details>
      )}
      {canNominate && roundId && nominated !== roundId && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (contentVersion === null) return;
            const form = new FormData(event.currentTarget);
            nominationRound.current = roundId;
            const result = await intent.send("/api/content", {
              action: "nominate",
              roomId,
              roundId,
              word: String(form.get("word") ?? ""),
              expectedVersion: contentVersion,
            });
            if (result) setNominated(roundId);
          }}
        >
          <fieldset disabled={intent.locked || contentVersion === null}>
            <legend>No-hint solve: nominate one future answer</legend>
            <label>
              Candidate word
              <input name="word" required maxLength={200} />
            </label>
            <button type="submit">Nominate answer</button>
          </fieldset>
          <p>
            Ten unique profiles trigger moderation. Nominations do not change
            this round.
          </p>
        </form>
      )}
      {nominated === roundId && (
        <p role="status">Nomination recorded for this round.</p>
      )}
      <p>
        <Link href="/content">Your submissions and community content</Link>
      </p>
      {intent.pending && (
        <button
          type="button"
          disabled={intent.busy}
          onClick={async () => {
            const result = await intent.send();
            if (result?.caseId && nominationRound.current)
              setNominated(nominationRound.current);
            if (result?.expiresAt) setCooldown(result.expiresAt - 3000);
          }}
        >
          Retry pending social request
        </button>
      )}
    </aside>
  );
}
