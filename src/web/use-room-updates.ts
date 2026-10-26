"use client";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
/** Notifications only trigger actor-authorized refetches. No service credential enters the browser. */
export function useRoomUpdates(
  profileId: string | null,
  roomId: string | null,
  refresh: () => Promise<void>,
) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!profileId || !roomId) return;
    let cancelled = false;
    let client: ReturnType<typeof createClient> | null = null;
    const seen = new Set<string>();
    const connect = async () => {
      try {
        const response = await fetch("/api/realtime", {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("Realtime unavailable");
        const access = await response.json();
        if (cancelled) return;
        if (access.profileId !== profileId) throw new Error("Account changed");
        if (client) {
          await client.realtime.setAuth(access.token);
          return;
        }
        client = createClient(access.url, access.anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });
        await client.realtime.setAuth(access.token);
        client
          .channel(`wordpairs-profile:${profileId}`, {
            config: { private: true },
          })
          .on("broadcast", { event: "changed" }, (message) => {
            const event = message.payload;
            if (typeof event?.eventId !== "string" || seen.has(event.eventId))
              return;
            if (seen.size >= 256)
              seen.delete(seen.values().next().value as string);
            seen.add(event.eventId);
            if (event.aggregateType === "room" && event.aggregateId === roomId)
              void refresh();
          })
          .subscribe((status) => {
            if (!cancelled) {
              setLive(status === "SUBSCRIBED");
              if (status === "SUBSCRIBED") void refresh();
            }
          });
      } catch {
        if (!cancelled) setLive(false);
      }
    };
    void connect();
    const timer = setInterval(() => void connect(), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      setLive(false);
      void client?.removeAllChannels();
    };
  }, [profileId, roomId, refresh]);
  return live;
}
