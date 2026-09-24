const CACHE_NAME = 'hero-quest-v28';
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
  'js/main.js',
  'img/guerreiro.jpg',
  'img/assassino.jpg',
  'img/mago.jpg',
  'img/world-boss.jpg',
  'img/goblin-feroz.jpg',
  'img/orc-selvagem.jpg',
  'img/lobo-das-sombras.jpg',
  'img/esqueleto-guerreiro.jpg',
  'img/troll-da-montanha.jpg',
  'img/bandido-mascarado.jpg',
  'img/aranha-gigante.jpg',
  'img/golem-de-pedra.jpg',
  'img/excalibur.jpg',
  'img/cajado_odin.jpg',
  'img/adaga_brutus.jpg',
  'img/placas_titan.jpg',
  'img/manto_avalon.jpg',
  'img/manto_vazio.jpg',
  'img/grevas_marte.jpg',
  'img/botas_cinza_fenica.jpg',
  'img/botas_hermes.jpg',
  'img/amuleto_eternidade.jpg',
  'img/anel_engano.jpg',
  'img/selo_salomao.jpg',
  'img/anel_borgia.jpg',
  'img/capa_sombras.jpg',
  'img/veu_morgana.jpg',
  'img/estandarte_dragao.jpg'
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
