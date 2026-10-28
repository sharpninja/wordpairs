// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { roomProjection } from "../../src/application/rooms";
import { RoomScreen } from "../../src/web/room-screen";
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
async function setup(responses: Response[]) {
  vi.stubGlobal("React", React);
  let heartbeat!: () => void;
  vi.spyOn(globalThis, "setInterval").mockImplementation(((
    callback: () => void,
    delay: number,
  ) => {
    if (delay === 20000) heartbeat = callback;
    return 0;
  }) as typeof setInterval);
  const posts: Record<string, unknown>[] = [];
  let reads = 0;
  const snapshot = {
    ...roomProjection(
      { ...roomFixture(["p1", "p2"], [], 2), id: "r1" },
      "p1",
      [],
    ),
    actorId: "p1",
    inviterId: null,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, input?: RequestInit) => {
      if (url === "/api/realtime") return new Response(null, { status: 503 });
      if (input?.method === "POST") {
        posts.push(JSON.parse(String(input.body)));
        const response = responses.shift();
        if (!response) throw new Error("No heartbeat response fixture");
        return response;
      }
      reads++;
      return new Response(JSON.stringify(snapshot));
    }),
  );
  render(
    React.createElement(RoomScreen, {
      reference: "r1",
      invitation: null,
      oidcEnabled: false,
    }),
  );
  await act(async () => {});
  await waitFor(() => expect(heartbeat).toBeTypeOf("function"));
  return {
    beat: async () => {
      await act(async () => {
        heartbeat();
        await Promise.resolve();
      });
    },
    posts,
    reads: () => reads,
  };
}
it("LIVE production heartbeat drains its response before refreshing", async () => {
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        stream = controller;
      },
    }),
  );
  const fixture = await setup([response]);
  const before = fixture.reads();
  await fixture.beat();
  expect(response.bodyUsed).toBe(true);
  expect(fixture.reads()).toBe(before);
  await act(async () => {
    stream.enqueue(new TextEncoder().encode("{}"));
    stream.close();
  });
  await waitFor(() => expect(fixture.reads()).toBe(before + 1));
});
it("LIVE failed heartbeat body consumption preserves the exact canonical retry", async () => {
  const broken = new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new Error("Body interrupted"));
      },
    }),
  );
  const recovered = new Response("{}");
  const fixture = await setup([broken, recovered]);
  const before = fixture.reads();
  await fixture.beat();
  expect(fixture.reads()).toBe(before);
  await fixture.beat();
  expect(fixture.posts).toHaveLength(2);
  expect(fixture.posts[1]).toEqual(fixture.posts[0]);
  expect(recovered.bodyUsed).toBe(true);
  await waitFor(() => expect(fixture.reads()).toBe(before + 1));
});
