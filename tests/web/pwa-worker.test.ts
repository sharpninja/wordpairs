import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

function worker(failInstall = false) {
  const handlers = new Map<string, (e: any) => void>();
  const stores = new Map<string, Map<string, Response>>([
    ["wordpairs-pwa-v0", new Map()],
    ["other-app", new Map()],
  ]);
  const network = vi.fn(async () => new Response("live", { status: 200 }));
  const skipWaiting = vi.fn();
  const claim = vi.fn();
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (key: string) => stores.delete(key),
    open: async (key: string) => {
      const entries = stores.get(key) ?? new Map<string, Response>();
      stores.set(key, entries);
      return {
        addAll: async (urls: string[]) => {
          if (failInstall) throw new Error("offline during update");
          for (const url of urls)
            entries.set(url, new Response("static offline"));
        },
        match: async (url: string) => entries.get(url)?.clone(),
      };
    },
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: new URL("https://wordpairs.test/sw.js"),
      addEventListener: (type: string, cb: any) => handlers.set(type, cb),
      skipWaiting,
      clients: { claim },
    },
    caches,
    fetch: network,
    URL,
    Response,
  });
  async function lifecycle(type: string) {
    let promise: Promise<unknown> | undefined;
    handlers.get(type)!({
      waitUntil: (p: Promise<unknown>) => {
        promise = p;
      },
    });
    await promise;
  }
  async function request(path: string, mode = "navigate", method = "GET") {
    let response: Promise<Response> | undefined;
    handlers.get("fetch")!({
      request: {
        url: new URL(path, "https://wordpairs.test").href,
        mode,
        method,
      },
      respondWith: (p: Promise<Response>) => {
        response = p;
      },
    });
    return response;
  }
  return { stores, network, skipWaiting, claim, lifecycle, request };
}

it("PWA-06 returns live HTTP errors unchanged and static offline navigation only on network failure", async () => {
  const w = worker();
  await w.lifecycle("install");
  w.network.mockResolvedValueOnce(
    new Response("server error", { status: 503 }),
  );
  expect((await w.request("/play"))?.status).toBe(503);
  w.network.mockRejectedValueOnce(new Error("disconnected"));
  expect(await (await w.request("/rooms/private-room"))?.text()).toBe(
    "static offline",
  );
  expect(await (await w.request("/play"))?.text()).toBe("live");
});

it("PWA-07 excludes all API/auth/realtime/mutations and RSC from fallback and private caching", async () => {
  const w = worker();
  await w.lifecycle("install");
  for (const [path, mode, method] of [
    ["/api/session", "navigate", "GET"],
    ["/api/auth/callback?code=secret", "navigate", "GET"],
    ["/auth/callback", "navigate", "GET"],
    ["/api/realtime", "cors", "GET"],
    ["/api/session", "cors", "POST"],
    ["/play?_rsc=private", "cors", "GET"],
    ["https://other.test/play", "navigate", "GET"],
  ]) {
    expect(await w.request(path, mode, method)).toBeUndefined();
  }
  await w.request("/admin");
  await w.request("/rooms/private-room");
  const cached = [...w.stores.get("wordpairs-pwa-v1")!.keys()];
  expect(cached.sort()).toEqual(
    [
      "/offline.html",
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/maskable-512.png",
      "/icons/apple-touch-icon.png",
    ].sort(),
  );
});

it("PWA-08 removes only owned old caches after activation without forcing an update", async () => {
  const w = worker();
  await w.lifecycle("install");
  expect(w.stores.has("wordpairs-pwa-v0")).toBe(true);
  expect(w.skipWaiting).not.toHaveBeenCalled();
  expect(w.claim).not.toHaveBeenCalled();
  await w.lifecycle("activate");
  expect([...w.stores.keys()].sort()).toEqual([
    "other-app",
    "wordpairs-pwa-v1",
  ]);
  expect(w.skipWaiting).not.toHaveBeenCalled();
});

it("PWA-08 failed precache rejects installation and preserves the previously usable cache", async () => {
  const w = worker(true);
  await expect(w.lifecycle("install")).rejects.toThrow("offline during update");
  expect(w.stores.has("wordpairs-pwa-v0")).toBe(true);
  expect(w.stores.has("other-app")).toBe(true);
  expect(w.skipWaiting).not.toHaveBeenCalled();
  expect(w.claim).not.toHaveBeenCalled();
});
