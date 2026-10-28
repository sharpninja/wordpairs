// @vitest-environment jsdom
import * as React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SocialPanel } from "../../src/web/social-panel";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const props = { roomId: "r1", profileId: "p1", canReact: false, roundId: null, canNominate: false, now: 0, refreshKey: 0, labels: [] };
it("LIVE social cadence changes in both directions preserve a pending read and coalesce newer pushes", async () => {
  vi.stubGlobal("React", React);
  const timers = vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
  let resolve!: (r: Response) => void;
  const pending = new Promise<Response>((done) => { resolve = done; });
  const fetcher = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(new Response(JSON.stringify({ actorId: "p1", version: 2, reactions: [{ id: "fresh", actorId: "p1", emoji: "👍", expiresAt: 5000 }] })));
  vi.stubGlobal("fetch", fetcher);
  const view = render(React.createElement(SocialPanel, { ...props, live: true }));
  expect(timers.mock.calls.map((c) => c[1])).toEqual([15000]);
  view.rerender(React.createElement(SocialPanel, { ...props, live: false, refreshKey: 1 }));
  view.rerender(React.createElement(SocialPanel, { ...props, live: true, refreshKey: 2 }));
  expect(timers.mock.calls.map((c) => c[1])).toEqual([15000, 1000, 15000]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(new Response(JSON.stringify({ actorId: "p1", version: 1, reactions: [] }))); });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(view.container.textContent).toContain("👍");
});
it("LIVE social unmount cancels the queued follow-up and cannot install a late actor response", async () => {
  vi.stubGlobal("React", React);
  vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
  const clear = vi.spyOn(globalThis, "clearInterval");
  let resolve!: (r: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
  vi.stubGlobal("fetch", fetcher);
  const view = render(React.createElement(SocialPanel, { ...props, live: false }));
  view.rerender(React.createElement(SocialPanel, { ...props, live: true, refreshKey: 1 }));
  view.unmount();
  await act(async () => { resolve(new Response(JSON.stringify({ actorId: "old-account", version: 99, reactions: [] }))); });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(clear).toHaveBeenCalledTimes(2);
  expect(view.container.textContent).toBe("");
});
