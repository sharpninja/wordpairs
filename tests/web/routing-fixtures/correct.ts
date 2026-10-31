import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";

export function useRoomUpdates(profileId: string | null, roomId: string | null, refresh: () => Promise<void>, refreshMatch?: () => Promise<void>) {
  useEffect(() => {
    if (!profileId || !roomId) return;
    const client = createClient("https://fixture.invalid", "fixture");
    const seen = new Set<string>();
    client.channel("fixture").on("broadcast", { event: "changed" }, (message) => {
      const event = message.payload;
      if (typeof event?.eventId !== "string" || seen.has(event.eventId) || event.aggregateId !== roomId) return;
      seen.add(event.eventId);
      if (event.aggregateType === "match") void (refreshMatch ?? refresh)();
      else if (["room", "moderation"].includes(event.aggregateType)) void refresh();
    }).subscribe();
    return () => { void client.removeAllChannels(); };
  }, [profileId, roomId, refresh, refreshMatch]);
}
