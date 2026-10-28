/* Only static, public, explicitly listed files belong in this cache. */
const CACHE_NAME = "wordpairs-pwa-v1";
const OFFLINE_URL = "/offline.html";
const STATIC_FILES = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_FILES)),
  );
  // Do not skipWaiting: an update must not take over an active game.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith("wordpairs-pwa-") && key !== CACHE_NAME,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Exclude API/auth endpoints even when directly opened as a document.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    /^\/(api|auth)(\/|$)/.test(url.pathname)
  )
    return;
  if (request.mode !== "navigate") return;
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await (await caches.open(CACHE_NAME)).match(OFFLINE_URL);
      return (
        cached ||
        new Response("You are offline. Reconnect to play Wordpairs.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }),
  );
});
