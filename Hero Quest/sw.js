self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('hero-quest-v1').then((cache) => {
      return cache.addAll(['jogo.html', 'manifest.json']);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
