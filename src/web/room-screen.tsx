"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OwnProfile } from "../application/identity";
import type { RoomView } from "../application/rooms";
import { GamePanel } from "./game-panel";
import { IdentityPanel, ProfileIcon } from "./identity-panel";
import {
  invalidatePrivateState,
  privateIdentityRevision,
} from "./private-state";
import { useRoomUpdates } from "./use-room-updates";

type View = RoomView & {
  actorId: string;
  inviterId: string | null;
  serverNow?: number;
};
type ScreenProps = {
  reference: string;
  invitation: string | null;
  oidcEnabled: boolean;
  fromDiscovery?: boolean;
};
export function RoomScreen(props: ScreenProps) {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  return (
    <>
      <IdentityPanel oidcEnabled={props.oidcEnabled} onProfile={setProfile} />
      {profile && (
        <RoomSession
          key={`${profile.id}:${privateIdentityRevision()}`}
          {...props}
          profile={profile}
        />
      )}
    </>
  );
}
function RoomSession({
  reference,
  invitation,
  profile,
  fromDiscovery = false,
}: ScreenProps & {
  profile: OwnProfile;
}) {
  const router = useRouter();
  const [room, setRoom] = useState<View | null>(null);
  const [activeRef, setActiveRef] = useState(reference);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const [link, setLink] = useState("");
  const [gameRefresh, setGameRefresh] = useState(0);
  const [displayNow, setDisplayNow] = useState(0);
  const serverOffset = useRef(0);
  const sequence = useRef(0);
  const fetching = useRef(false);
  const refreshAgain = useRef(false);
  const pending = useRef<Record<string, unknown> | null>(null);
  const inFlight = useRef(false);
  const commandEpoch = useRef(0);
  useEffect(
    () => () => {
      commandEpoch.current++;
    },
    [],
  );
  const deny = useCallback(() => {
    sequence.current++;
    commandEpoch.current++;
    fetching.current = false;
    refreshAgain.current = false;
    pending.current = null;
    invalidatePrivateState();
    setRoom(null);
    setLink("");
    setSelected("");
    setBusy(false);
    setError(
      "Room access is unavailable. Refresh your profile or find a room.",
    );
  }, []);
  const endpoint = `/api/rooms/${encodeURIComponent(activeRef)}${activeRef === reference && invitation ? `?invite=${encodeURIComponent(invitation)}` : ""}`;
  const refresh = useCallback(
    async (resolvedJoin = false): Promise<void> => {
      if (!profile) return;
      if (fetching.current) {
        refreshAgain.current = true;
        return;
      }
      fetching.current = true;
      const generation = ++sequence.current;
      let explanation = "Room information is unavailable. Try again.";
      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        const body = await response.text();
        if (generation !== sequence.current) return;
        if (!response.ok) {
          explanation =
            response.status === 404
              ? "Room not found or invitation expired."
              : response.status === 429
                ? "Too many code attempts. Wait a minute and try again."
                : "Room information is unavailable. Try again.";
          if (
            fromDiscovery &&
            response.status === 404 &&
            !pending.current &&
            (!inFlight.current || resolvedJoin)
          ) {
            router.replace("/?seatLost=1#community");
            return;
          }
          if ([401, 403, 404].includes(response.status)) {
            setRoom(null);
            setLink("");
            setSelected("");
            pending.current = null;
          }
          throw new Error("Unavailable");
        }
        const result = JSON.parse(body) as View;
        if (result.actorId !== profile.id) {
          setRoom(null);
          setLink("");
          setSelected("");
          pending.current = null;
          explanation =
            "Your account changed in another tab. Reload to continue.";
          throw new Error("Unavailable");
        }
        if (
          fromDiscovery &&
          !result.role &&
          !result.canJoinPlayer &&
          !pending.current &&
          (!inFlight.current || resolvedJoin)
        ) {
          router.replace("/?seatLost=1#community");
          return;
        }
        setRoom((previous) =>
          previous &&
          previous.actorId === result.actorId &&
          previous.roomId === result.roomId &&
          previous.version > result.version
            ? previous
            : result,
        );
        if (typeof result.serverNow === "number") {
          serverOffset.current = result.serverNow - Date.now();
          setDisplayNow(result.serverNow);
        }
        setError("");
        setGameRefresh((value) => value + 1);
        if (result.role) setActiveRef(result.roomId);
      } catch {
        if (generation === sequence.current) setError(explanation);
      } finally {
        if (generation === sequence.current) {
          fetching.current = false;
          if (refreshAgain.current) {
            refreshAgain.current = false;
            void refresh();
          }
        }
      }
    },
    [endpoint, profile, fromDiscovery, router],
  );
  useEffect(() => {
    fetching.current = false;
    void refresh();
    const timer = setInterval(
      () => void refresh(),
      room?.status === "countdown" || room?.holdoutDueAt ? 1000 : 15000,
    );
    return () => {
      sequence.current++;
      fetching.current = false;
      refreshAgain.current = false;
      clearInterval(timer);
    };
  }, [refresh, room?.status, room?.holdoutDueAt]);
  useEffect(() => {
    const timer = setInterval(
      () => setDisplayNow(Date.now() + serverOffset.current),
      250,
    );
    return () => clearInterval(timer);
  }, []);
  const current = useRef({ room, busy });
  current.current = { room, busy };
  useEffect(() => {
    if (room?.role !== "player" || room.status === "closed") return;
    let stopped = false;
    let inFlight = false;
    let retry: Record<string, unknown> | null = null;
    const heartbeat = async () => {
      const latest = current.current;
      if (
        stopped ||
        inFlight ||
        latest.busy ||
        !latest.room ||
        latest.room.role !== "player"
      )
        return;
      inFlight = true;
      retry ??= {
        action: "presence",
        connected: true,
        expectedProfileId: profile.id,
        expectedVersion: latest.room.version,
        commandId: crypto.randomUUID(),
      };
      try {
        const response = await fetch(
          `/api/rooms/${encodeURIComponent(latest.room.roomId)}/lobby`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(retry),
            signal: AbortSignal.timeout(10000),
          },
        );
        // Drain before releasing the canonical retry. An unread fetch body can
        // remain active until its abort deadline even after200 headers arrive.
        await response.text();
        if (response.ok || response.status < 500) retry = null;
        if (!stopped) await refresh();
      } catch {
        /* An uncertain heartbeat reuses its command ID at the next bounded attempt. */
      } finally {
        inFlight = false;
      }
    };
    const timer = setInterval(() => void heartbeat(), 20000);
    window.addEventListener("online", heartbeat);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("online", heartbeat);
    };
  }, [profile.id, room?.role, room?.status, refresh]);
  const command = async (
    action: "join" | "invite" | "ready" | "leave",
    mode?: "player" | "observer",
  ) => {
    if (!room || !profile || inFlight.current) return;
    inFlight.current = true;
    const epoch = commandEpoch.current;
    setBusy(true);
    setError("");
    const input = pending.current ?? {
      action,
      expectedProfileId: profile.id,
      commandId: crypto.randomUUID(),
      expectedVersion: room.version,
      ...(mode ? { mode, inviterId: room.inviterId ?? selected } : {}),
      ...(action === "ready"
        ? { ready: !room.players.find((p) => p.id === profile.id)?.ready }
        : {}),
    };
    if (action !== "invite") pending.current = input;
    let explanation = "Room access is unavailable. Retry the same request.";
    try {
      const response = await fetch(
        ["ready", "leave"].includes(input.action as string)
          ? `/api/rooms/${encodeURIComponent(room.roomId)}/lobby`
          : endpoint,
        {
          method: "POST",
          signal: AbortSignal.timeout(10000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (epoch !== commandEpoch.current) {
        await response.text();
        return;
      }
      if ([401, 403, 404].includes(response.status)) {
        deny();
        await response.text();
        return;
      }
      const result = await response.json();
      if (epoch !== commandEpoch.current) return;
      if (response.ok || response.status < 500) {
        // A pre-command preview cannot decide membership or discovery recovery.
        // Retire it before clearing the canonical intent and read fresh state.
        sequence.current++;
        fetching.current = false;
        refreshAgain.current = false;
      }
      if (!response.ok) {
        if (response.status < 500) pending.current = null;
        if (
          fromDiscovery &&
          input.action === "join" &&
          input.mode === "player" &&
          response.status === 409
        ) {
          await refresh(true);
          return;
        }
        explanation =
          response.status === 409
            ? "The room or account changed. Refresh and try again."
            : "Your request was not confirmed. Retry the same request.";
        throw new Error("Unavailable");
      }
      pending.current = null;
      if (input.action === "leave") {
        window.location.assign("/play");
        return;
      }
      if (input.action === "invite") setLink(result.url);
      else setActiveRef(result.roomId);
      await refresh();
    } catch {
      if (epoch === commandEpoch.current) setError(explanation);
    } finally {
      inFlight.current = false;
      if (epoch === commandEpoch.current) setBusy(false);
    }
  };
  const live = useRoomUpdates(
    profile?.id ?? null,
    room?.role ? room.roomId : null,
    refresh,
  );
  return (
    <>
      {profile && (
        <section
          className="panel room-panel"
          aria-labelledby="room-title"
          aria-busy={busy}
          data-room-version={room?.version}
        >
          <div className="panel-heading">
            <h1 id="room-title">
              {room?.role === "observer" ? "Observer seat" : "The room"}
            </h1>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Refresh room
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
          {room?.role && (
            <p role="status">
              {live
                ? "● Live updates connected"
                : "○ Live updates unavailable. Retrying; room refresh remains available."}
            </p>
          )}
          {!room && !error && <p role="status">Finding your room…</p>}
          {room && (
            <>
              <p>
                {room.players.length} / {room.capacity} players ·{" "}
                {room.availableSlots} open player slots · {room.status}
              </p>
              {room.code && (
                <p className="room-code">
                  Room code: <strong>{room.code}</strong>
                </p>
              )}
              <h2>Players</h2>
              {room.status === "waiting" && room.idlePrompt && (
                <p role="status">
                  Ready to play? All players, mark yourself ready when you are
                  set.
                </p>
              )}
              {room.status === "waiting" &&
                room.holdoutId === profile.id &&
                room.holdoutDueAt && (
                  <p role="alert">
                    Mark ready within{" "}
                    {Math.max(
                      0,
                      Math.ceil((room.holdoutDueAt - displayNow) / 1000),
                    )}{" "}
                    seconds.
                    {room.players.length > 2
                      ? " Otherwise you will leave this countdown."
                      : " The room will wait for both players."}
                  </p>
                )}
              {room.status === "countdown" && room.countdownDueAt && (
                <p role="status">
                  Roster locked. Starting in{" "}
                  {Math.max(
                    0,
                    Math.ceil((room.countdownDueAt - displayNow) / 1000),
                  )}{" "}
                  seconds. Departing players will not be replaced.
                </p>
              )}
              {room.status === "closed" && (
                <p role="status">
                  {room.matchAvailable
                    ? "This game is complete. View the final standings below."
                    : "This room closed. The game cannot start with fewer than two original players."}
                </p>
              )}
              <ol className="roster">
                {room.players.map((player) => (
                  <li key={player.id}>
                    <ProfileIcon icon={player.icon} />{" "}
                    <strong>{player.alias}</strong>
                    <span>{player.ready ? "✓ Ready" : "○ Not ready"}</span>
                    {!player.connected && (
                      <span>Reconnecting · seat retained for two minutes</span>
                    )}
                  </li>
                ))}
              </ol>
              <h2>Observers ({room.observerCount} / 25)</h2>
              {room.observers.length ? (
                <ul>
                  {room.observers.map((observer) => (
                    <li key={observer.id}>
                      <ProfileIcon icon={observer.icon} /> {observer.alias} ·
                      following{" "}
                      {room.players.find(
                        (player) => player.id === observer.follows,
                      )?.alias ?? "a player who left"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No observers yet.</p>
              )}
              {room.role === "player" && (
                <>
                  {room.status === "waiting" && (
                    <button
                      className="button"
                      type="button"
                      disabled={busy || pending.current !== null}
                      onClick={() => void command("ready")}
                    >
                      {room.players.find((p) => p.id === profile.id)?.ready
                        ? "Not ready yet"
                        : "Mark ready"}
                    </button>
                  )}
                  <button
                    className="button secondary"
                    type="button"
                    disabled={
                      busy ||
                      pending.current !== null ||
                      room.status === "closed"
                    }
                    onClick={() => void command("invite")}
                  >
                    Create invitation link
                  </button>
                  {link && (
                    <label className="invite-link">
                      Shareable invitation link
                      <input
                        readOnly
                        value={link}
                        onFocus={(event) => event.target.select()}
                      />
                    </label>
                  )}
                </>
              )}
              {room.role === "observer" && (
                <p role="status">
                  Read-only observer · Following{" "}
                  {room.players.find(
                    (player) => player.id === room.followedPlayerId,
                  )?.alias ?? "a player who left"}
                  . You cannot submit answers or change readiness.
                </p>
              )}
              {room.role && room.status !== "closed" && (
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy || pending.current !== null}
                  onClick={() => void command("leave")}
                >
                  Leave room
                </button>
              )}
              {!room.role && (
                <div className="join-options">
                  {room.canJoinPlayer && (
                    <button
                      className="button"
                      type="button"
                      disabled={busy || pending.current !== null}
                      onClick={() => void command("join", "player")}
                    >
                      Join as player
                    </button>
                  )}
                  {room.canObserve && (
                    <>
                      <p>
                        The player roster is full or locked. You can watch the
                        inviting player.
                      </p>
                      {room.inviterId ? (
                        <p>
                          Invited by{" "}
                          {
                            room.players.find(
                              (player) => player.id === room.inviterId,
                            )?.alias
                          }
                        </p>
                      ) : (
                        <label htmlFor="inviter">
                          Who invited you?
                          <select
                            id="inviter"
                            disabled={busy || pending.current !== null}
                            value={selected}
                            onChange={(event) =>
                              setSelected(event.target.value)
                            }
                          >
                            <option value="">Choose a current player</option>
                            {room.players.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.alias}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <button
                        className="button secondary"
                        type="button"
                        disabled={
                          busy ||
                          pending.current !== null ||
                          (!room.inviterId && !selected)
                        }
                        onClick={() => void command("join", "observer")}
                      >
                        Join as observer
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          {pending.current && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void command("join")}
            >
              Retry pending room request
            </button>
          )}
        </section>
      )}
      {room?.role && room.matchAvailable && (
        <GamePanel
          live={live}
          key={`${profile.id}:${room.roomId}`}
          roomId={room.roomId}
          profileId={profile.id}
          refreshKey={gameRefresh}
          onFinished={refresh}
        />
      )}
    </>
  );
}
