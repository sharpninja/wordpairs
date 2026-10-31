// @vitest-environment jsdom
import * as React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { roomProjection } from "../../src/application/rooms";
import { RoomScreen as actual } from "../../src/web/room-screen";
import { RoomScreen as correct } from "./routing-fixtures/room-correct";
import { RoomScreen as wrong } from "./routing-fixtures/room-wrong";
import { RoomScreen as socialWrong } from "./routing-fixtures/room-social-wrong";
import { roomFixture } from "../acceptance/fixtures";

const state = vi.hoisted(() => ({ match: undefined as undefined | (() => Promise<void>), room: undefined as undefined | (() => Promise<void>) }));
const RoomScreen = process.env.WORDPAIRS_ROOM_ROUTING_FIXTURE === "correct" ? correct : process.env.WORDPAIRS_ROOM_ROUTING_FIXTURE === "wrong" ? wrong : process.env.WORDPAIRS_ROOM_ROUTING_FIXTURE === "wrong-social" ? socialWrong : actual;
vi.mock("next/navigation", () => { const router = { replace: vi.fn(), push: vi.fn() }; return { useRouter: () => router }; });
vi.mock("../../src/web/use-room-updates", () => ({ useRoomUpdates: (_profile: unknown, _room: unknown, refresh: () => Promise<void>, match: () => Promise<void>) => { state.room = refresh; state.match = match; return true; } }));
vi.mock("../../src/web/game-panel", () => ({ GamePanel: ({ refreshKey, socialRefreshKey }: { refreshKey: number; socialRefreshKey?: number }) => React.createElement(React.Fragment, null, React.createElement("div", { "data-testid": "game-refresh" }, String(refreshKey)), React.createElement("div", { "data-testid": "social-refresh" }, String(socialRefreshKey ?? refreshKey))) }));
vi.mock("../../src/web/identity-panel", () => ({ ProfileIcon: () => null, IdentityPanel: ({ onProfile }: { onProfile: (p: unknown) => void }) => { React.useEffect(() => { onProfile({ id: "p1", alias: "Player One" }); }, [onProfile]); return null; } }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); state.match = undefined; state.room = undefined; });

function snapshot(matchAvailable: boolean, version: number) {
  return { ...roomProjection({ ...roomFixture(["p1", "p2"], [], 2), id: "r1", version }, "p1", [{ id: "p1", alias: "Player One", icon: "owl" }, { id: "p2", alias: "Player Two", icon: "owl" }]), actorId: "p1", inviterId: null, matchAvailable };
}
async function setup(initiallyAvailable: boolean) {
  vi.stubGlobal("React", React); vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
  let available = initiallyAvailable; let reads = 0;
  vi.stubGlobal("fetch", vi.fn(async () => { reads++; return new Response(JSON.stringify(snapshot(available, reads))); }));
  const view = render(React.createElement(RoomScreen, { reference: "r1", invitation: null, oidcEnabled: false }));
  await waitFor(() => expect(view.container.querySelector(".room-panel")?.getAttribute("data-room-version")).toBe("2"));
  return { view, reads: () => reads, setAvailable: () => { available = true; }, notify: async () => act(async () => { await state.match?.(); }), notifyRoom: async () => act(async () => { await state.room?.(); }) };
}
it("discovers a newly created match through an authorized room read", async () => {
  const fixture = await setup(false); const initialReads = fixture.reads(); expect(fixture.view.queryByTestId("game-refresh")).toBeNull();
  fixture.setAvailable(); await fixture.notify();
  await waitFor(() => expect(fixture.view.getByTestId("game-refresh")).toBeTruthy());
  expect(fixture.reads()).toBe(initialReads + 1);
});
it("refreshes an already mounted match without rereading the room", async () => {
  const fixture = await setup(true); const initialReads = fixture.reads(); const initial = Number(fixture.view.getByTestId("game-refresh").textContent); const social = Number(fixture.view.getByTestId("social-refresh").textContent);
  await fixture.notify();
  await waitFor(() => expect(Number(fixture.view.getByTestId("game-refresh").textContent)).toBe(initial + 1));
  expect(fixture.reads()).toBe(initialReads);
  expect(Number(fixture.view.getByTestId("social-refresh").textContent)).toBe(social);
});
it("room changes refresh both game and social views", async () => {
  const fixture = await setup(true); const initialReads = fixture.reads(); const game = Number(fixture.view.getByTestId("game-refresh").textContent); const social = Number(fixture.view.getByTestId("social-refresh").textContent);
  await fixture.notifyRoom();
  await waitFor(() => expect(Number(fixture.view.getByTestId("game-refresh").textContent)).toBe(game + 1));
  expect(Number(fixture.view.getByTestId("social-refresh").textContent)).toBe(social + 1);
  expect(fixture.reads()).toBe(initialReads + 1);
});
