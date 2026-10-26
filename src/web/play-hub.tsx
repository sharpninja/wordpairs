"use client";
import { useRef, useState } from "react";
import type { OwnProfile } from "../application/identity";
import { IdentityPanel } from "./identity-panel";
export function PlayHub({ oidcEnabled }: { oidcEnabled: boolean }) {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  return (
    <>
      <IdentityPanel oidcEnabled={oidcEnabled} onProfile={setProfile} />
      {profile && <RoomMenu key={profile.id} profile={profile} />}
    </>
  );
}
function RoomMenu({ profile }: { profile: OwnProfile }) {
  const [capacity, setCapacity] = useState(4);
  const [discoverable, setDiscoverable] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingKind, setPendingKind] = useState<string | null>(null);
  const pending = useRef<Record<string, unknown> | null>(null);
  const send = async (action: "create" | "quick-match") => {
    if (busy) return;
    setBusy(true);
    setError("");
    const input = pending.current ?? {
      action,
      commandId: crypto.randomUUID(),
      expectedProfileId: profile.id,
      ...(action === "create"
        ? { roomId: crypto.randomUUID(), capacity, discoverable }
        : {}),
    };
    pending.current = input;
    setPendingKind(action);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500) {
          pending.current = null;
          setPendingKind(null);
        }
        throw new Error(
          response.status === 409
            ? "The room or account changed. Try again, browse, or create a room."
            : "The request was not confirmed. Retry to check the same request.",
        );
      }
      pending.current = null;
      setPendingKind(null);
      const roomId = action === "create" ? result.roomId : result.joined;
      if (roomId)
        window.location.assign(`/rooms/${encodeURIComponent(roomId)}`);
      else
        setError(
          "No joinable rooms right now. Browse the community board or create a room.",
        );
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Room access is unavailable. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="panel room-menu"
      aria-labelledby="find-room"
      aria-busy={busy}
    >
      <p className="eyebrow">A room full of connections</p>
      <h2 id="find-room">Find your people</h2>
      {error && <p role="status">{error}</p>}
      <div className="hero-actions">
        <button
          type="button"
          className="button"
          disabled={busy || pendingKind === "create"}
          onClick={() => void send("quick-match")}
        >
          {pendingKind === "quick-match" ? "Retry quick match" : "Quick match"}
        </button>
        <a href="/#community">Browse open rooms</a>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (/^[0-9A-HJKMNP-TV-Z]{8}$/.test(code.trim().toUpperCase()))
            window.location.assign(`/rooms/${code.trim().toUpperCase()}`);
          else setError("Enter the eight-character room code.");
        }}
      >
        <label htmlFor="room-code">Have a room code?</label>
        <div className="hero-actions">
          <input
            id="room-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={8}
            required
          />
          <button type="submit" disabled={busy}>
            Open room
          </button>
        </div>
      </form>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send("create");
        }}
      >
        <h3>Start a new room</h3>
        <label htmlFor="capacity">Maximum players (2–25)</label>
        <input
          id="capacity"
          type="number"
          min={2}
          max={25}
          value={capacity}
          onChange={(event) => setCapacity(Number(event.target.value))}
          disabled={busy || pendingKind !== null}
          required
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={discoverable}
            disabled={busy || pendingKind !== null}
            onChange={(event) => setDiscoverable(event.target.checked)}
          />{" "}
          List this room on the community board
        </label>
        <p className="panel-note">
          Rooms stay private unless you choose to list them.
        </p>
        <button
          className="button secondary"
          type="submit"
          disabled={busy || pendingKind === "quick-match"}
        >
          {pendingKind === "create" ? "Retry room creation" : "Create room"}
        </button>
      </form>
    </section>
  );
}
