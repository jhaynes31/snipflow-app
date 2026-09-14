/* Every Box service worker.
 *
 * Deliberately small: it makes the app installable and keeps the shell
 * reachable if the network hiccups. It never shows notifications — Every Box
 * is ambient by design — and it never caches Convex data.
 */
const CACHE = "everybox-shell-v1";
const OFFLINE_URL = "/everybox/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/everybox/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate") return;
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    }),
  );
});
