"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  acknowledgePrivateResult,
  currentPrivateScope,
  intentFor,
  privateRevision,
  privateScope,
  submitPrivateIntent,
  subscribePrivateState,
} from "./private-state";

/** Navigation shares the exact command and lock; obsolete sessions cannot settle it. */
export function usePrivateIntent(
  profileId: string,
  committed: (
    result?: Record<string, unknown>,
    draftKey?: string,
  ) => Promise<void>,
  denied: () => void,
  resource = "content",
) {
  useSyncExternalStore(subscribePrivateState, privateRevision, () => 0);
  const scope = privateScope(profileId);
  const entry = intentFor(scope, resource);
  const mounted = useRef(false);
  const callbacks = useRef({ committed, denied });
  callbacks.current = { committed, denied };
  const observed = useRef({ scope, resolution: 0 });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (observed.current.scope !== scope) {
      observed.current = { scope, resolution: 0 };
    }
    if (
      entry.resolution > observed.current.resolution &&
      currentPrivateScope(scope)
    ) {
      observed.current.resolution = entry.resolution;
      const settled = entry.settled;
      void (async () => {
        try {
          await callbacks.current.committed(settled?.result, settled?.draftKey);
          if (mounted.current && currentPrivateScope(scope))
            acknowledgePrivateResult(scope, resource, settled);
        } catch {
          // Retain the result for a later mounted consumer; never repeat its write.
          observed.current.resolution = 0;
        }
      })();
    }
  }, [scope, resource, entry.resolution, entry.settled]);
  const send = async (
    url?: string,
    input?: Record<string, unknown>,
    draftKey?: string,
    method: "POST" | "PATCH" = "POST",
  ) => {
    const result = await submitPrivateIntent(
      scope,
      resource,
      url,
      input,
      draftKey,
      fetch,
      method,
    );
    if (!mounted.current) return;
    if (result.denied) callbacks.current.denied();
    if (currentPrivateScope(scope))
      return result.result as
        | { expiresAt?: number; [key: string]: unknown }
        | undefined;
  };
  return {
    busy: entry.busy,
    locked: entry.busy || entry.pending !== null || entry.settled !== null,
    pending: entry.pending !== null,
    error: entry.error,
    notice: entry.notice,
    send,
  };
}
