// Offline Dice Service Worker
// Immer die neueste Version vom Server laden (kein Browser-/HTTP-Cache).
// Der Zwischenspeicher wird nur genutzt, wenn man offline ist.
const CACHE_NAME = "offline-dice-shell-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline-dice-icon-192.png",
  "/offline-dice-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of APP_SHELL) {
      try { await cache.add(new Request(url, { cache: "reload" })); }
      catch (error) { console.warn("Offline Dice cache skip:", url, error); }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (request.headers.has("range")) return; // Audio/Video-Teilanfragen normal lassen
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // cache: "no-store" -> der Browser fragt bei jedem Neuladen den Server
      const response = await fetch(request, { cache: "no-store" });
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      return cached || caches.match("/index.html");
    }
  })());
});
