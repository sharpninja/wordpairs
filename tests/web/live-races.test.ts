// @vitest-environment jsdom
import * as React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { OutboxRelay } from "../../src/application/outbox";
import { deliverOutbox } from "../../src/infrastructure/runtime";
import { GamePanel } from "../../src/web/game-panel";
import { useRoomUpdates } from "../../src/web/use-room-updates";
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("../../src/infrastructure/postgres-pool", () => ({ createSupabasePool: () => ({}) }));
vi.mock("../../src/web/social-panel", () => ({ SocialPanel: () => null }));
vi.mock("../../src/web/identity-panel", () => ({ ProfileIcon: () => null }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it("LIVE-HV-001 foreground requests do not wait for a deferred worker batch", async () => {
  vi.stubEnv("WORDPAIRS_DATABASE_URL", "postgres://test");
  vi.stubEnv("WORDPAIRS_SUPABASE_URL", "https://realtime.test");
  vi.stubEnv("WORDPAIRS_SUPABASE_ANON_KEY", "sb_publishable_test");
  vi.stubEnv("WORDPAIRS_SUPABASE_SERVICE_KEY", "sb_secret_test");
  vi.stubEnv("WORDPAIRS_SUPABASE_JWT_SECRET", "s".repeat(32));
  const pending = deferred<Awaited<ReturnType<OutboxRelay["drain"]>>>();
  const drain = vi.spyOn(OutboxRelay.prototype, "drain").mockReturnValue(pending.promise);
  const worker = deliverOutbox(25);
  let foregroundDone = false;
  const foreground = deliverOutbox().then(() => { foregroundDone = true; });
  try { await Promise.resolve(); await Promise.resolve(); expect(foregroundDone).toBe(true); }
  finally { pending.resolve({ ok: true, value: 25 }); await Promise.all([worker, foreground]); }
  expect(drain).toHaveBeenCalledExactlyOnceWith(25);
});
it("LIVE-HV-002 a push during an older game GET schedules exactly one newer read", async () => {
  vi.stubGlobal("React", React);
  vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
  const older = deferred<Response>();
  const state = (version: number) => ({ actorId: "p1", role: "player", serverNow: Date.now(), version, status: "choosing", roundNumber: 0, roundsTotal: 8, anchorId: "p1", chooserId: "p1", categories: [], labels: [], round: null, autoCategoryId: null });
  const fetcher = vi.fn().mockReturnValueOnce(older.promise).mockResolvedValue(new Response(JSON.stringify(state(2))));
  vi.stubGlobal("fetch", fetcher);
  const props = { roomId: "r1", profileId: "p1", onFinished: async () => {} };
  const view = render(React.createElement(GamePanel, { ...props, refreshKey: 0 }));
  view.rerender(React.createElement(GamePanel, { ...props, refreshKey: 1 }));
  view.rerender(React.createElement(GamePanel, { ...props, refreshKey: 2 }));
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => { older.resolve(new Response(JSON.stringify(state(1)))); });
  await waitFor(() => expect(view.container.querySelector(".game-panel")?.getAttribute("data-match-version")).toBe("2"));
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("LIVE-HV-003 unmount during authentication cannot create an obsolete channel", async () => {
  const authenticated = deferred<void>();
  const channel = vi.fn();
  const removeAllChannels = vi.fn().mockResolvedValue([]);
  vi.mocked(createClient).mockReturnValue({ realtime: { setAuth: () => authenticated.promise }, channel, removeAllChannels } as never);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ profileId: "p1", token: "token", url: "https://test", anonKey: "anon" }))));
  const refresh = async () => {};
  function Screen() { useRoomUpdates("p1", "r1", refresh); return null; }
  const view = render(React.createElement(Screen));
  await act(async () => {});
  view.unmount();
  await act(async () => { authenticated.resolve(); });
  expect(channel).not.toHaveBeenCalled();
  expect(removeAllChannels).toHaveBeenCalled();
});
it("LIVE connected game safety polling is15s and cadence changes do not invalidate an active read", async () => {
  vi.stubGlobal("React", React);
  const intervals = vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
  const older = deferred<Response>();
  const state = (version: number) => ({ actorId: "p1", role: "player", serverNow: Date.now(), version, status: "choosing", roundNumber: 0, roundsTotal: 8, anchorId: "p1", chooserId: "p1", categories: [], labels: [], round: null });
  const fetcher = vi.fn().mockReturnValueOnce(older.promise).mockResolvedValue(new Response(JSON.stringify(state(2))));
  vi.stubGlobal("fetch", fetcher);
  const props = { roomId: "r1", profileId: "p1", refreshKey: 0, onFinished: async () => {} };
  const view = render(React.createElement(GamePanel, { ...props, live: true } as React.ComponentProps<typeof GamePanel>));
  expect(intervals.mock.calls.some((call) => call[1] === 15000)).toBe(true);
  expect(intervals.mock.calls.some((call) => call[1] === 1000)).toBe(false);
  view.rerender(React.createElement(GamePanel, { ...props, live: false } as React.ComponentProps<typeof GamePanel>));
  expect(intervals.mock.calls.some((call) => call[1] === 1000)).toBe(true);
  view.rerender(React.createElement(GamePanel, { ...props, live: true, refreshKey: 1 } as React.ComponentProps<typeof GamePanel>));
  view.rerender(React.createElement(GamePanel, { ...props, live: false, refreshKey: 2 } as React.ComponentProps<typeof GamePanel>));
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => { older.resolve(new Response(JSON.stringify(state(1)))); });
  expect(view.container.querySelector(".game-panel")?.getAttribute("data-match-version")).toBe("2");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("LIVE auth callbacks retain the application identity through renewal and replace closed channels", async () => {
  let renew!: () => Promise<void>;
  vi.spyOn(globalThis, "setInterval").mockImplementation(((handler: () => Promise<void>, delay: number) => { if (delay === 60000) renew = handler; return 0; }) as never);
  let channels: unknown[] = [];
  const channel = { state: "joined", on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
  const client = { realtime: { setAuth: vi.fn().mockResolvedValue(undefined), isConnected: () => true }, getChannels: () => channels, removeAllChannels: vi.fn().mockResolvedValue([]), channel: vi.fn(() => { channels = [channel]; return channel; }) };
  vi.mocked(createClient).mockReturnValue(client as never);
  const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ profileId: "p1", token: fetcher.mock.calls.length === 1 ? "initial-profile-token" : "renewed-profile-token", url: "https://test", anonKey: "anon" })));
  vi.stubGlobal("fetch", fetcher);
  const refresh = async () => {};
  function Screen() { useRoomUpdates("p1", "r1", refresh); return null; }
  render(React.createElement(Screen));
  await act(async () => {});
  const accessToken = vi.mocked(createClient).mock.calls.at(-1)?.[2]?.accessToken;
  expect(accessToken).toBeTypeOf("function");
  expect(await accessToken!()).toBe("initial-profile-token");
  await act(async () => { await renew(); });
  expect(await accessToken!()).toBe("renewed-profile-token");
  channels = [];
  await act(async () => { await renew(); });
  expect(createClient).toHaveBeenCalledTimes(2);
  expect(client.channel).toHaveBeenCalledTimes(2);
});
