// Plush Squad service worker — cache-first so the game works offline.
const CACHE = 'plushsquad-v0.3.0';
const FILES = ["./", "index.html", "manifest.json", "vendor/phaser.min.js", "js/audio.js", "js/game.js", "assets/Poppins-Bold.ttf", "assets/Poppins-Medium.ttf", "assets/apple-touch-icon.png", "assets/books.png", "assets/cap.png", "assets/cloud.png", "assets/cow.png", "assets/crown.png", "assets/dance.png", "assets/dizzy.png", "assets/dumpling.png", "assets/heart.png", "assets/icon-192.png", "assets/icon-512.png", "assets/jack_front.png", "assets/jack_side.png", "assets/jack_upside.png", "assets/lock.png", "assets/milk.png", "assets/moon.png", "assets/note.png", "assets/owl.png", "assets/shield.png", "assets/snake.png", "assets/snow.png", "assets/sparkles.png", "assets/star.png", "assets/tiger.png", "assets/tigerface.png", "assets/trophy.png", "assets/zzz.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
