import { expect, it, vi } from "vitest";

// Dynamic path permits a meaningful red test before adding the lifecycle module.
const modulePath = "../../src/web/private-state";
it("retains exact uncertain command across remounts, shares lock and retires only on confirmed resolution", async () => {
  const state = await import(modulePath);
  state.bindPrivateIdentity("alice");
  const scope = state.privateScope("alice");
  state.setDraftValue(scope, "suggestion", { category: "Private draft" });
  let complete!: (r: Response) => void;
  const transport = vi.fn(
    (_url: string, _options: RequestInit) =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      }),
  );
  const first = state.submitPrivateIntent(
    scope,
    "content",
    "/api/content",
    { action: "suggest", expectedVersion: 2 },
    "suggestion",
    transport,
  );
  expect(state.intentFor(scope, "content").busy).toBe(true);
  await state.submitPrivateIntent(
    scope,
    "content",
    "/api/content",
    { action: "wrong" },
    undefined,
    transport,
  );
  expect(transport).toHaveBeenCalledTimes(1);
  complete(new Response("{}", { status: 503 }));
  await first;
  expect(state.intentFor(scope, "content").pending).not.toBeNull();
  expect(state.draftValue(scope, "suggestion")).toEqual({
    category: "Private draft",
  });
  const retry = vi.fn(
    async (_url: string, _options: RequestInit) =>
      new Response('{"version":3}'),
  );
  const result = await state.submitPrivateIntent(
    scope,
    "content",
    undefined,
    undefined,
    undefined,
    retry,
  );
  expect(retry.mock.calls[0]?.[0]).toEqual(transport.mock.calls[0]?.[0]);
  expect(retry.mock.calls[0]?.[1].body).toEqual(
    transport.mock.calls[0]?.[1].body,
  );
  expect(result.result).toEqual({ version: 3 });
  expect(state.intentFor(scope, "content").pending).toBeNull();
  expect(state.draftValue(scope, "suggestion")).toBeUndefined();
});
it("identity change or authorization invalidation clears drafts and makes late completion inert", async () => {
  const state = await import(modulePath);
  state.bindPrivateIdentity("alice");
  const oldScope = state.privateScope("alice");
  state.setDraftValue(oldScope, "editor", { target: "secret" });
  let complete!: (r: Response) => void;
  const first = state.submitPrivateIntent(
    oldScope,
    "catalog",
    "/api/content",
    { action: "save-pair" },
    "editor",
    () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      }),
  );
  state.bindPrivateIdentity("bob");
  const current = state.privateScope("bob");
  state.setDraftValue(current, "editor", { target: "Bob draft" });
  complete(new Response('{"version":1}'));
  expect(await first).toEqual({});
  expect(state.draftValue(oldScope, "editor")).toBeUndefined();
  expect(state.draftValue(current, "editor")).toEqual({ target: "Bob draft" });
  state.invalidatePrivateState();
  expect(state.draftValue(current, "editor")).toBeUndefined();
  const fetcher = vi.fn();
  expect(
    await state.submitPrivateIntent(
      oldScope,
      "catalog",
      "/api/content",
      {},
      undefined,
      fetcher,
    ),
  ).toEqual({});
  expect(fetcher).not.toHaveBeenCalled();
});
it("settled results survive navigation, block new writes and retire only after matching consumer acknowledgment", async () => {
  const state = await import(modulePath);
  state.bindPrivateIdentity("alice", "session-one");
  const scope = state.privateScope("alice");
  const transport = vi.fn(
    async () => new Response('{"roomId":"private-room"}'),
  );
  await state.submitPrivateIntent(
    scope,
    "room-menu",
    "/api/rooms",
    { action: "create" },
    undefined,
    transport,
  );
  const settled = state.intentFor(scope, "room-menu").settled;
  expect(settled.result).toEqual({ roomId: "private-room" });
  await state.submitPrivateIntent(
    scope,
    "room-menu",
    "/api/rooms",
    { action: "create" },
    undefined,
    transport,
  );
  expect(transport).toHaveBeenCalledTimes(1);
  state.acknowledgePrivateResult(scope, "room-menu", { ...settled });
  expect(state.intentFor(scope, "room-menu").settled).toBe(settled);
  state.acknowledgePrivateResult(scope, "room-menu", settled);
  expect(state.intentFor(scope, "room-menu").settled).toBeNull();
});
it("same-profile session replacement clears private data and old-generation completions; malformed denial also clears", async () => {
  const state = await import(modulePath);
  state.bindPrivateIdentity("alice", "session-one");
  const old = state.privateScope("alice");
  state.setDraftValue(old, "editor", { target: "Private" });
  state.bindPrivateIdentity("alice", "session-two");
  expect(state.draftValue(old, "editor")).toBeUndefined();
  expect(state.privateScope("alice")).not.toBe(old);
  const current = state.privateScope("alice");
  state.setDraftValue(current, "editor", { target: "Current" });
  const denied = await state.submitPrivateIntent(
    current,
    "content",
    "/api/content",
    { action: "save-pair" },
    "editor",
    async () => new Response("Access denied", { status: 403 }),
  );
  expect(denied).toEqual({ denied: true });
  expect(state.draftValue(current, "editor")).toBeUndefined();
});
