// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { roomProjection } from "../../src/application/rooms";
import { RoomScreen } from "../../src/web/room-screen";
import { useRoomUpdates } from "../../src/web/use-room-updates";
import { roomFixture } from "../acceptance/fixtures";

vi.mock("next/navigation", () => ({
  ...(() => {
    const router = { replace: vi.fn(), push: vi.fn() };
    return { useRouter: () => router };
  })(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("../../src/web/identity-panel", () => ({
  ProfileIcon: () => null,
  IdentityPanel: ({ onProfile }: { onProfile: (p: unknown) => void }) => {
    React.useEffect(() => {
      onProfile({ id: "p1", alias: "Player One" });
    }, [onProfile]);
    return null;
  },
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("LIVE resume bursts coalesce an actual RoomSession GET and retain one follow-up", async () => {
  vi.stubGlobal("React", React);
  vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
  const snapshot = (version: number, alias: string) => ({
    ...roomProjection(
      { ...roomFixture(["p1", "p2"], [], 2), id: "r1", version },
      "p1",
      [
        { id: "p1", alias: "Player One", icon: "owl" },
        { id: "p2", alias, icon: "owl" },
      ],
    ),
    actorId: "p1",
    inviterId: null,
  });
  let roomReads = 0;
  const fetcher = vi.fn((url: string) => {
    if (url === "/api/realtime")
      return Promise.resolve(new Response(null, { status: 503 }));
    roomReads++;
    return Promise.resolve(
      new Response(JSON.stringify(snapshot(1, "Older Player"))),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  const view = render(
    React.createElement(RoomScreen, {
      reference: "r1",
      invitation: null,
      oidcEnabled: false,
    }),
  );
  await act(async () => {});
  await waitFor(() =>
    expect(view.container.textContent).toContain("Older Player"),
  );
  const initialReads = roomReads;
  let resolveSecond!: (r: Response) => void;
  fetcher.mockImplementation((url: string) => {
    if (url === "/api/realtime")
      return Promise.resolve(new Response(null, { status: 503 }));
    roomReads++;
    return roomReads === initialReads + 1
      ? new Promise<Response>((done) => {
          resolveSecond = done;
        })
      : Promise.resolve(
          new Response(JSON.stringify(snapshot(3, "Newest Player"))),
        );
  });
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  expect(roomReads).toBe(initialReads + 1);
  await act(async () => {
    resolveSecond(new Response(JSON.stringify(snapshot(2, "Middle Player"))));
  });
  await waitFor(() =>
    expect(view.container.textContent).toContain("Newest Player"),
  );
  expect(roomReads).toBe(initialReads + 2);
});
it("live room/game resumes immediately on focus, online and becoming visible and cleans up listeners", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
  );
  const refresh = vi.fn(async () => {});
  function Screen() {
    useRoomUpdates("p1", "room1", refresh);
    return null;
  }
  const view = render(React.createElement(Screen));
  await act(async () => {});
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "hidden",
  });
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(refresh).not.toHaveBeenCalled();
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });
  expect(refresh).toHaveBeenCalledTimes(2);
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(refresh).toHaveBeenCalledTimes(3);
  view.unmount();
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(refresh).toHaveBeenCalledTimes(3);
});
