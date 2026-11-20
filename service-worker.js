// Offline Dice service worker - v5: remove old cached countdown/site assets.
const CACHE_NAME = 'offline-dice-shell-v5';
const APP_SHELL = ['/', '/index.html', '/service-offline.html', '/manifest.json'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of APP_SHELL) {
      try { await cache.add(new Request(url, { cache: 'reload' })); } catch (_) {}
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response && response.ok && (request.mode === 'navigate' || APP_SHELL.includes(url.pathname))) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return (await caches.match(request)) || (await caches.match('/index.html')) || Response.error();
    }
  })());
});
