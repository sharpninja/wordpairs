"use client";
import { useEffect, useRef, useState } from "react";
import { type OwnProfile, PROFILE_ICONS } from "../application/identity";
import { guestCredential } from "./guest-credential";

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
  const pendingPreference = useRef<Record<string, unknown> | null>(null);
  const [hasPending, setHasPending] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      if (!controller.signal.aborted) {
        setError("Your profile is unavailable. Try again.");
        setLoading(false);
        setInitialized(true);
        controller.abort();
      }
    }, 10000);
    void fetch("/api/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok && response.status !== 401)
          throw new Error("Session unavailable");
        const current = response.ok
          ? ((await response.json()).profile as OwnProfile)
          : null;
        if (!controller.signal.aborted) {
          setProfile(current);
          onProfile?.(current);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Your profile is unavailable. Try again.");
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) {
          setLoading(false);
          setInitialized(true);
        }
      });
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [onProfile]);
  const guest = async () => {
    setLoading(true);
    setError("");
    try {
      const credential = await guestCredential();
      const response = await fetch("/api/session", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestCredential: credential }),
      });
      if (!response.ok) throw new Error("Guest entry unavailable");
      const result = await response.json();
      pendingPreference.current = null;
      setHasPending(false);
      setProfile(result.profile);
      onProfile?.(result.profile);
    } catch {
      setError(
        "Could not continue as guest. Check your connection and allow browser site data, then try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const update = async (input: Record<string, unknown>) => {
    if (!profile) return;
    setLoading(true);
    setError("");
    const body = pendingPreference.current ?? {
      ...input,
      commandId: crypto.randomUUID(),
      expectedVersion: profile.version,
      expectedProfileId: profile.id,
    };
    pendingPreference.current = body;
    setHasPending(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        if (response.status < 500) {
          pendingPreference.current = null;
          setHasPending(false);
        }
        if (response.status === 409) {
          const current = await fetch("/api/session", {
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
          });
          if (current.ok) {
            const result = await current.json();
            setProfile(result.profile);
            onProfile?.(result.profile);
          }
        }
        throw new Error("Profile update unavailable");
      }
      const result = await response.json();
      pendingPreference.current = null;
      setHasPending(false);
      setProfile(result.profile);
      onProfile?.(result.profile);
    } catch {
      setError(
        "Your change was not confirmed. Refresh your profile before trying again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const logout = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "DELETE",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Sign-out unavailable");
      pendingPreference.current = null;
      setHasPending(false);
      setProfile(null);
      onProfile?.(null);
    } catch {
      setError("Could not sign out. Try again.");
    } finally {
      setLoading(false);
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
      {error && <p role="alert">{error}</p>}
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
          <fieldset disabled={loading || hasPending}>
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
              disabled={loading || hasPending}
              onChange={(event) =>
                void update({ publicLeaderboard: event.target.checked })
              }
            />{" "}
            Show my generated alias on the public leaderboard
          </label>
          <div className="hero-actions">
            <button
              type="button"
              disabled={loading || hasPending}
              onClick={() => void update({ regenerateAlias: true })}
            >
              Generate another alias
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void logout()}
            >
              Sign out
            </button>
            {profile.kind === "guest" && oidcEnabled && (
              <a className="button secondary" href="/api/auth/login">
                Sign in with ChatGPT
              </a>
            )}
          </div>
          {hasPending && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void update({})}
            >
              Retry profile update
            </button>
          )}
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
              onClick={() => void guest()}
            >
              Continue as guest
            </button>
            {oidcEnabled && (
              <a className="button secondary" href="/api/auth/login">
                Sign in with ChatGPT
              </a>
            )}
          </div>
          {loading && <p role="status">Loading your profile…</p>}
        </>
      )}
    </section>
  );
}
