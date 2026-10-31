import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";

export function useRoomUpdates(profileId: string | null, roomId: string | null, refresh: () => Promise<void>, refreshMatch?: () => Promise<void>) {
  useEffect(() => {
    if (!profileId || !roomId) return;
    const client = createClient("https://fixture.invalid", "fixture");
    client.channel("fixture").on("broadcast", { event: "changed" }, () => { void refresh(); }).subscribe();
    return () => { void client.removeAllChannels(); };
  }, [profileId, roomId, refresh, refreshMatch]);
}
