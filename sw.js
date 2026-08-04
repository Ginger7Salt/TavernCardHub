const CACHE_NAME = 'resource-hub-v99999';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((k) => caches.delete(k)));
        }).then(() => self.clients.claim())
    );
});
self.addEventListener('fetch', (e) => {
    // 强制网络优先，避免 SW 缓存旧版 ui.js
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
