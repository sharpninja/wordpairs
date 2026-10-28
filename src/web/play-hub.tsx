"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OwnProfile } from "../application/identity";
import { IdentityPanel } from "./identity-panel";
import { usePrivateDraftState } from "./private-draft";
import { privateIdentityRevision } from "./private-state";
import { usePrivateIntent } from "./use-private-intent";
export function PlayHub({ oidcEnabled }: { oidcEnabled: boolean }) {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  return (
    <>
      <IdentityPanel oidcEnabled={oidcEnabled} onProfile={setProfile} />
      {profile && (
        <RoomMenu
          key={`${profile.id}:${privateIdentityRevision()}`}
          profile={profile}
        />
      )}
    </>
  );
}
function RoomMenu({ profile }: { profile: OwnProfile }) {
  const router = useRouter();
  const [capacity, setCapacity] = usePrivateDraftState(
    profile.id,
    "room-capacity",
    4,
  );
  const [discoverable, setDiscoverable] = usePrivateDraftState(
    profile.id,
    "room-listed",
    false,
  );
  const [code, setCode] = usePrivateDraftState(profile.id, "room-code", "");
  const [error, setError] = useState("");
  const [pendingKind, setPendingKind] = usePrivateDraftState<string | null>(
    profile.id,
    "room-intent-kind",
    null,
  );
  const intent = usePrivateIntent(
    profile.id,
    async (result) => {
      if (!result) return;
      setPendingKind(null);
      const roomId = result.roomId ?? result.joined;
      if (typeof roomId === "string")
        router.push(`/rooms/${encodeURIComponent(roomId)}`);
      else
        setError(
          "No joinable rooms right now. Browse the community board or create a room.",
        );
    },
    () => setError("Your session changed. Refresh your profile."),
    "room-menu",
  );
  const send = async (action: "create" | "quick-match") => {
    setError("");
    setPendingKind(action);
    await intent.send("/api/rooms", {
      action,
      ...(action === "create"
        ? { roomId: crypto.randomUUID(), capacity, discoverable }
        : {}),
    });
  };
  return (
    <section
      className="panel room-menu"
      aria-labelledby="find-room"
      aria-busy={intent.busy}
    >
      <p className="eyebrow">A room full of connections</p>
      <h2 id="find-room">Find your people</h2>
      {(error || intent.error) && <p role="alert">{error || intent.error}</p>}
      {intent.busy && <p role="status">Opening your room…</p>}
      <div className="hero-actions">
        <button
          type="button"
          className="button"
          disabled={intent.busy || (intent.pending && pendingKind === "create")}
          onClick={() => void send("quick-match")}
        >
          {intent.pending && pendingKind === "quick-match"
            ? "Retry quick match"
            : "Quick match"}
        </button>
        <Link href="/#community">Browse open rooms</Link>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (/^[0-9A-HJKMNP-TV-Z]{8}$/.test(code.trim().toUpperCase()))
            router.push(`/rooms/${code.trim().toUpperCase()}`);
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
          <button type="submit" disabled={intent.locked}>
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
          disabled={intent.locked}
          required
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={discoverable}
            disabled={intent.locked}
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
          disabled={
            intent.busy || (intent.pending && pendingKind === "quick-match")
          }
        >
          {intent.pending && pendingKind === "create"
            ? "Retry room creation"
            : "Create room"}
        </button>
      </form>
    </section>
  );
}
