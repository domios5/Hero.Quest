const CACHE_NAME = 'hero-quest-v24';
const CACHE_FILES = [
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'css/style.css',
  'js/data.js',
  'js/state.js',
  'js/achievements.js',
  'js/talents.js',
  'js/progression.js',
  'js/companion.js',
  'js/economy.js',
  'js/quests.js',
  'js/combat.js',
  'js/ui.js',
  'js/main.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_FILES);
    }).then(() => self.skipWaiting()) // ativa a versão nova de imediato, sem esperar que feches todas as abas
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim()) // assume o controlo das abas já abertas sem precisares de recarregar duas vezes
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
