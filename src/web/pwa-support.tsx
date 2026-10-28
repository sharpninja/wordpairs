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
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
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
    <aside className="site-shell pwa-install" aria-label="Install Wordpairs">
      {secure && installPrompt && (
        <button type="button" onClick={install}>
          Install Wordpairs
        </button>
      )}
      <details>
        <summary>Get Wordpairs on your phone</summary>
        <p>
          <strong>iPhone:</strong> Open this site in Safari, tap Share, then Add
          to Home Screen. Keep Open as Web App enabled if offered.
        </p>
        <p>
          <strong>Android:</strong> Open your browser’s menu and choose Install
          app or Add to Home screen. The wording depends on your browser.
        </p>
        <p>
          Opens like an app from your home screen. A connection is needed to
          play.
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
