// @vitest-environment jsdom
import * as React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { useRoomUpdates as actual } from "../../src/web/use-room-updates";
import { useRoomUpdates as correct } from "./routing-fixtures/correct";
import { useRoomUpdates as wrong } from "./routing-fixtures/wrong";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
type Hook = (profile: string | null, room: string | null, refresh: () => Promise<void>, match?: () => Promise<void>) => void;
const hook = (process.env.WORDPAIRS_ROUTING_FIXTURE === "correct" ? correct : process.env.WORDPAIRS_ROUTING_FIXTURE === "wrong" ? wrong : actual) as Hook;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function setup(withMatch = true) {
  let receive: (message: { payload: Record<string, unknown> }) => void = () => { throw new Error("Missing subscription"); };
  const channel = { state: "joined", on: vi.fn((_kind, _filter, handler) => { receive = handler; return channel; }), subscribe: vi.fn().mockReturnThis() };
  const client = { realtime: { setAuth: vi.fn().mockResolvedValue(undefined), isConnected: () => true }, getChannels: () => [channel], removeAllChannels: vi.fn().mockResolvedValue([]), channel: vi.fn(() => channel) };
  vi.mocked(createClient).mockReturnValue(client as never);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ profileId: "p1", token: "fixture", url: "https://fixture.invalid", anonKey: "fixture" }))));
  const room = vi.fn(async () => {}); const match = vi.fn(async () => {});
  function Screen() { hook("p1", "r1", room, withMatch ? match : undefined); return null; }
  render(React.createElement(Screen));
  await waitFor(() => expect(channel.on).toHaveBeenCalled());
  return { room, match, emit: async (id: string, type: string, aggregateId = "r1") => act(async () => receive({ payload: { eventId: id, aggregateType: type, aggregateId } })) };
}

it("routes match changes to the match refresh without rereading the room", async () => {
  const state = await setup(); await state.emit("m1", "match");
  expect(state.match).toHaveBeenCalledTimes(1); expect(state.room).not.toHaveBeenCalled();
});
it("routes room and moderation changes to the room refresh", async () => {
  const state = await setup(); await state.emit("r1", "room"); await state.emit("s1", "moderation");
  expect(state.room).toHaveBeenCalledTimes(2); expect(state.match).not.toHaveBeenCalled();
});
it("ignores duplicate and unrelated notifications", async () => {
  const state = await setup(); await state.emit("m1", "match"); await state.emit("m1", "match"); await state.emit("m2", "match", "other"); await state.emit("x", "profile");
  expect(state.match).toHaveBeenCalledTimes(1); expect(state.room).not.toHaveBeenCalled();
});
it("falls back to the room refresh when no match callback is supplied", async () => {
  const state = await setup(false); await state.emit("m1", "match");
  expect(state.room).toHaveBeenCalledTimes(1);
});
