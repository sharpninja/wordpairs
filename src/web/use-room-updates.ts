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
    // Mobile browsers can suspend timers/sockets. Recover committed state on return,
    // without replacing the live channel or invalidating an in-flight authorized read.
    const resume = () => void refresh();
    const visible = () => {
      if (document.visibilityState === "visible") resume();
    };
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [profileId, roomId, refresh]);
  useEffect(() => {
    if (!profileId || !roomId) return;
    let cancelled = false;
    let connecting = false;
    let currentToken = "";
    let client: ReturnType<typeof createClient> | null = null;
    const seen = new Set<string>();
    const connect = async () => {
      if (cancelled || connecting) return;
      connecting = true;
      try {
        const response = await fetch("/api/realtime", {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("Realtime unavailable");
        const access = await response.json();
        if (cancelled) return;
        if (access.profileId !== profileId) {
          await client?.removeAllChannels();
          client = null;
          throw new Error("Account changed");
        }
        currentToken = access.token;
        if (
          client &&
          !client.getChannels().some((channel) => channel.state !== "closed")
        ) {
          await client.removeAllChannels();
          client = null;
          if (cancelled) return;
        }
        if (client) {
          await client.realtime.setAuth(access.token);
          if (cancelled) {
            await client.removeAllChannels();
            return;
          }
          setLive(
            client.realtime.isConnected() &&
              client
                .getChannels()
                .some((channel) => channel.state === "joined"),
          );
          return;
        }
        client = createClient(access.url, access.anonKey, {
          // Supabase's internal auth/heartbeat refresh must keep our verified game
          // identity instead of falling back to an absent Supabase Auth session.
          accessToken: async () => currentToken,
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });
        await client.realtime.setAuth(access.token);
        if (cancelled) {
          await client.removeAllChannels();
          return;
        }
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
            if (
              ["room", "match", "moderation"].includes(event.aggregateType) &&
              event.aggregateId === roomId
            )
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
      } finally {
        connecting = false;
      }
    };
    void connect();
    const reconnect = () => void connect();
    window.addEventListener("online", reconnect);
    const timer = setInterval(() => void connect(), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("online", reconnect);
      setLive(false);
      void client?.removeAllChannels();
    };
  }, [profileId, roomId, refresh]);
  return live;
}
