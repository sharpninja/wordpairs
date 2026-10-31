"use client";

import { useEffect, useRef, useState } from "react";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaSupport() {
  const [installed, setInstalled] = useState(true);
  const [secure, setSecure] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const prompting = useRef(false);

  useEffect(() => {
    let active = true;
    const media = window.matchMedia("(display-mode: standalone)");
    const isInstalled = () =>
      media.matches ||
      ("standalone" in navigator && navigator.standalone === true);
    const modeChanged = () => setInstalled(isInstalled());
    const ready = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const appInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    modeChanged();
    setSecure(window.isSecureContext);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", appInstalled);
    media.addEventListener("change", modeChanged);
    if (window.isSecureContext && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/admin-sw.js", { scope: "/admin", updateViaCache: "none" })
        .catch(() => {
          if (active)
            setMessage(
              "Installation support could not start. Reload to retry, or use your browser’s install menu.",
            );
        });
    }
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", appInstalled);
      media.removeEventListener("change", modeChanged);
    };
  }, []);

  async function install() {
    if (!installPrompt || prompting.current) return;
    const event = installPrompt;
    prompting.current = true;
    setInstallPrompt(null);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Finish installing in your browser’s prompt."
          : "You can install later from your browser’s menu.",
      );
    } catch {
      setMessage("Use your browser’s install menu or the instructions below.");
    } finally {
      prompting.current = false;
    }
  }

  if (installed) return null;
  return (
    <aside
      className="site-shell pwa-install"
      aria-label="Install Wordpairs Admin"
    >
      {secure && installPrompt && (
        <button type="button" onClick={install}>
          Install Wordpairs Admin
        </button>
      )}
      <details>
        <summary>Get Wordpairs Admin on your phone</summary>
        <p>
          <strong>iPhone:</strong> Open this site in Safari, tap Share, then Add
          to Home Screen. Keep Open as Web App enabled if offered.
        </p>
        <p>
          <strong>Android:</strong> Open your browser’s menu and choose Install
          app or Add to Home screen. The wording depends on your browser.
        </p>
        <p>
          Opens administration from your home screen. A connection and GitHub
          sign-in are required.
        </p>
      </details>
      {!secure && (
        <p>
          Installation requires a secure HTTPS address. Localhost is supported
          for development.
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </aside>
  );
}
/** Retire only the former public-game worker/cache; leave admin and other apps intact. */
export function LegacyPwaCleanup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .getRegistrations()
        .then(async (registrations) => {
          for (const registration of registrations) {
            const worker =
              registration.active ??
              registration.waiting ??
              registration.installing;
            if (
              new URL(registration.scope).pathname === "/" &&
              worker &&
              new URL(worker.scriptURL).pathname === "/sw.js"
            )
              await registration.unregister();
          }
        })
        .catch(() => {});
    }
    if (typeof caches !== "undefined") {
      void caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("wordpairs-pwa-"))
              .map((key) => caches.delete(key)),
          ),
        )
        .catch(() => {});
    }
  }, []);
  return null;
}
