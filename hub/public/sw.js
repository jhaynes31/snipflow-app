/* The Shire service worker.
 *
 * Deliberately small: it makes the app installable and keeps the shell
 * reachable if the network hiccups. It never shows notifications; the Hub
 * delivers heads-ups on its own terms, and it never caches Convex data.
 *
 * Notifications (added 2026-09-21): the server sends one only when the
 * other person did something that involves you, and only to devices you
 * added in Settings. The payload is a title, a line, and where a tap lands.
 */
const CACHE = "shire-shell-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png"]))
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

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "The Shire", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "The Shire";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    requireInteraction: Boolean(data.urgent),
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin));
      if (open && "navigate" in open) return open.navigate(url).then((c) => c && c.focus());
      if (open) return open.focus();
      return self.clients.openWindow(url);
    }),
  );
});
