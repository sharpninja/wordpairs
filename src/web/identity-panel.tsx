"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { type OwnProfile, PROFILE_ICONS } from "../application/identity";
import { guestCredential } from "./guest-credential";
import { usePrivateDraftState } from "./private-draft";
import { bindPrivateIdentity } from "./private-state";
import { usePrivateIntent } from "./use-private-intent";

const ICONS: Record<string, string> = {
  owl: "🦉",
  fox: "🦊",
  frog: "🐸",
  cat: "🐈",
  whale: "🐳",
  bee: "🐝",
};
export function ProfileIcon({ icon }: { icon: string }) {
  return (
    <span role="img" aria-label={icon}>
      {ICONS[icon] ?? "●"}
    </span>
  );
}
export function IdentityPanel({
  oidcEnabled,
  onProfile,
}: {
  oidcEnabled: boolean;
  onProfile?: (profile: OwnProfile | null) => void;
}) {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const generation = useRef(0);
  const running = useRef(false);
  const accept = useCallback(
    (current: OwnProfile | null, sessionGeneration?: string) => {
      bindPrivateIdentity(current?.id ?? null, sessionGeneration);
      setProfile(current);
      onProfile?.(current);
    },
    [onProfile],
  );
  const load = useCallback(async () => {
    const sequence = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok && response.status !== 401)
        throw new Error("Unavailable");
      const result = response.ok ? await response.json() : null;
      if (!response.ok) await response.text();
      if (sequence === generation.current)
        accept(result?.profile ?? null, result?.sessionGeneration ?? undefined);
    } catch {
      if (sequence === generation.current)
        setError("Your profile is unavailable. Try again.");
    } finally {
      if (sequence === generation.current) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, [accept]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const session = async (method: "POST" | "DELETE") => {
    if (running.current) return;
    running.current = true;
    const sequence = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const body =
        method === "POST"
          ? JSON.stringify({ guestCredential: await guestCredential() })
          : undefined;
      const response = await fetch("/api/session", {
        method,
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!response.ok) throw new Error("Unavailable");
      const result = method === "POST" ? await response.json() : null;
      if (sequence === generation.current)
        accept(result?.profile ?? null, result?.sessionGeneration ?? undefined);
    } catch {
      if (sequence === generation.current)
        setError(
          method === "POST"
            ? "Could not continue as guest. Check your connection and allow browser site data, then try again."
            : "Could not sign out. Try again.",
        );
    } finally {
      running.current = false;
      if (sequence === generation.current) setLoading(false);
    }
  };
  return (
    <section
      className="panel identity-panel"
      aria-labelledby="profile-heading"
      aria-busy={loading}
    >
      <p className="eyebrow">Make yourself at home</p>
      <h1 id="profile-heading">
        {profile ? "Your player profile" : "Ready for some wordplay?"}
      </h1>
      {error && (
        <p role="alert">
          {error}{" "}
          <button type="button" disabled={loading} onClick={() => void load()}>
            Retry profile
          </button>
        </p>
      )}
      {loading && <p role="status">Loading your profile…</p>}
      {profile ? (
        <>
          <p className="profile-alias">
            <ProfileIcon icon={profile.icon} /> <strong>{profile.alias}</strong>
          </p>
          <p>
            {profile.kind === "guest"
              ? "Guest profile saved in this browser."
              : "Signed-in profile."}{" "}
            {profile.wins} lifetime wins · {profile.points} points
          </p>
          <details>
            <summary>Profile details</summary>
            <p className="admin-id">
              Profile ID: <code>{profile.id}</code>
            </p>
            <Link href="/admin">Administration</Link>
          </details>
          <ProfilePreferences
            key={profile.id}
            profile={profile}
            loading={loading}
            refresh={load}
            denied={() => accept(null)}
          />
          <div className="hero-actions">
            <button
              type="button"
              disabled={loading}
              onClick={() => void session("DELETE")}
            >
              Sign out
            </button>
            {profile.kind === "guest" && oidcEnabled && (
              <a className="button secondary" href="/api/auth/login">
                Sign in with ChatGPT
              </a>
            )}
          </div>
          {profile.kind === "guest" && (
            <p className="panel-note">
              Guest play stays separate from a signed-in account. Clearing this
              browser’s site data resets your guest identity.
            </p>
          )}
        </>
      ) : (
        <>
          <p>
            Play as a guest in this browser, or sign in to keep your profile
            across devices.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="button"
              disabled={loading || !initialized}
              onClick={() => void session("POST")}
            >
              Continue as guest
            </button>
            {oidcEnabled && (
              <a className="button secondary" href="/api/auth/login">
                Sign in with ChatGPT
              </a>
            )}
          </div>
        </>
      )}
    </section>
  );
}
function ProfilePreferences({
  profile,
  loading,
  refresh,
  denied,
}: {
  profile: OwnProfile;
  loading: boolean;
  refresh: () => Promise<void>;
  denied: () => void;
}) {
  const intent = usePrivateIntent(profile.id, refresh, denied, "profile");
  const [editing, setEditing, clearEditing] = usePrivateDraftState<{
    icon: string;
    publicLeaderboard: boolean;
    regenerateAlias: boolean;
  } | null>(profile.id, "profile-editor", null);
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const editingOpen = editing !== null;
  useEffect(() => {
    const modal = dialog.current;
    if (editingOpen && modal && !modal.open) modal.showModal();
    return () => {
      if (modal?.open) modal.close();
    };
  }, [editingOpen]);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!editing && !loading && !intent.locked && restoreFocus.current) {
      restoreFocus.current = false;
      opener.current?.focus();
    }
  }, [editing, loading, intent.locked]);
  const update = (input: Record<string, unknown>, draftKey?: string) =>
    intent.send(
      "/api/profile",
      {
        ...input,
        expectedVersion: profile.version,
      },
      draftKey,
      "PATCH",
    );
  return (
    <>
      {!editing && intent.error && <p role="alert">{intent.error}</p>}
      {!editing && intent.notice && <p role="status">{intent.notice}</p>}
      {!editing && intent.busy && <p role="status">Saving your profile…</p>}
      <fieldset disabled={loading || intent.locked || !!editing}>
        <legend>Choose your icon</legend>
        <div className="icon-picker">
          {PROFILE_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              aria-label={`Choose ${icon}`}
              aria-pressed={profile.icon === icon}
              onClick={() => void update({ icon })}
            >
              <ProfileIcon icon={icon} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={profile.publicLeaderboard}
          disabled={loading || intent.locked || !!editing}
          onChange={(event) =>
            void update({ publicLeaderboard: event.target.checked })
          }
        />{" "}
        Show my generated alias on the public leaderboard
      </label>
      <div className="hero-actions">
        <button
          type="button"
          disabled={loading || intent.locked || !!editing}
          onClick={() => void update({ regenerateAlias: true })}
        >
          Generate another alias
        </button>
        <button
          ref={opener}
          type="button"
          disabled={loading || intent.locked || !!editing}
          onClick={() =>
            setEditing({
              icon: profile.icon,
              publicLeaderboard: profile.publicLeaderboard,
              regenerateAlias: false,
            })
          }
        >
          Edit profile
        </button>
      </div>
      {editing && (
        <dialog
          ref={dialog}
          aria-labelledby="edit-profile-title"
          onCancel={(event) => {
            event.preventDefault();
            if (!intent.locked) {
              restoreFocus.current = true;
              clearEditing();
            }
          }}
        >
          <h2 id="edit-profile-title">Edit profile</h2>
          {intent.error && <p role="alert">{intent.error}</p>}
          {intent.busy && <p role="status">Saving your profile…</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              restoreFocus.current = true;
              void update(editing, "profile-editor");
            }}
          >
            <fieldset disabled={loading || intent.locked}>
              <legend>Edit profile preferences</legend>
              <p>
                Saved alias: {profile.alias}. A new alias is generated only when
                you save.
              </p>
              <label>
                Draft profile icon
                <select
                  value={editing.icon}
                  onChange={(event) =>
                    setEditing({ ...editing, icon: event.target.value })
                  }
                >
                  {PROFILE_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editing.regenerateAlias}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      regenerateAlias: event.target.checked,
                    })
                  }
                />
                Generate a new alias on Save
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editing.publicLeaderboard}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      publicLeaderboard: event.target.checked,
                    })
                  }
                />
                Publish alias on Save
              </label>
              <button type="submit">Save profile</button>
              <button
                type="button"
                onClick={() => {
                  restoreFocus.current = true;
                  clearEditing();
                }}
              >
                Cancel profile editing
              </button>
            </fieldset>
          </form>
          {intent.pending && (
            <button
              type="button"
              disabled={intent.busy}
              onClick={() => void intent.send()}
            >
              Retry profile update
            </button>
          )}
        </dialog>
      )}
      {!editing && intent.pending && (
        <button
          type="button"
          disabled={intent.busy}
          onClick={() => void intent.send()}
        >
          Retry profile update
        </button>
      )}
    </>
  );
}
