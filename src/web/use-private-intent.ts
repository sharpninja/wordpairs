"use client";
import { useRef, useState } from "react";
/** Uncertain writes retain the identical endpoint, payload and command ID for explicit retry. */
export function usePrivateIntent(
  profileId: string,
  committed: () => Promise<void>,
  denied: () => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef<{
    url: string;
    input: Record<string, unknown>;
  } | null>(null);
  const inFlight = useRef(false);
  const send = async (url?: string, input?: Record<string, unknown>) => {
    if (inFlight.current) return;
    const intent =
      pending.current ??
      (url && input
        ? {
            url,
            input: {
              ...input,
              expectedProfileId: profileId,
              commandId: crypto.randomUUID(),
            },
          }
        : null);
    if (!intent) return;
    pending.current = intent;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(intent.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intent.input),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500) {
          pending.current = null;
          if ([401, 403, 404].includes(response.status)) denied();
          else await committed();
        }
        throw new Error(
          response.status === 409
            ? "The content or round changed. Refresh and try again."
            : response.status === 429
              ? "Please wait two seconds between reactions."
              : response.status === 403
                ? "This action is not available for your current role or membership."
                : "Your request was not confirmed. Retry the same request.",
        );
      }
      pending.current = null;
      setNotice("Saved.");
      await committed();
      return result;
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Service unavailable. Retry the same request.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return {
    busy,
    locked: busy || pending.current !== null,
    pending: pending.current !== null,
    error,
    notice,
    send,
  };
}
