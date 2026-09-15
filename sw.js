self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('hero-quest-v2').then((cache) => {
      return cache.addAll(['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png']);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== 'hero-quest-v2').map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
