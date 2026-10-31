import * as React from "react";
import { useRoomUpdates } from "../../../src/web/use-room-updates";
export function RoomScreen() {
  const [view, setView] = React.useState<{ version: number; matchAvailable: boolean } | null>(null);
  const [key, setKey] = React.useState(0);
  const [social, setSocial] = React.useState(0);
  const refresh = React.useCallback(async () => { const result = await (await fetch("/fixture-room")).json(); setView(result); setKey((value) => value + 1); setSocial((value) => value + 1); }, []);
  React.useEffect(() => { void refresh(); void refresh(); }, [refresh]);
  const match = React.useCallback(async () => { if (!view?.matchAvailable) await refresh(); else setKey((value) => value + 1); }, [view, refresh]);
  useRoomUpdates("p1", "r1", refresh, match);
  return React.createElement("section", { className: "room-panel", "data-room-version": view?.version }, view?.matchAvailable ? React.createElement(React.Fragment, null, React.createElement("div", { "data-testid": "game-refresh" }, String(key)), React.createElement("div", { "data-testid": "social-refresh" }, String(social))) : null);
}
