// Plush Squad service worker — cache-first so the game works offline.
// The "+ Toy" engine (vendor/tjs, ~22 MB) is cached on first use only; models are cached by transformers.js itself.
const CACHE = 'plushsquad-v0.4.0';
const FILES = ["./", "index.html", "manifest.json", "vendor/phaser.min.js", "js/audio.js", "js/toys.js", "js/game.js", "js/toyworker.js", "assets/Poppins-Bold.ttf", "assets/Poppins-Medium.ttf", "assets/apple-touch-icon.png", "assets/arch_emb.json", "assets/books.png", "assets/cap.png", "assets/cloud.png", "assets/cow.png", "assets/crown.png", "assets/dance.png", "assets/dizzy.png", "assets/dumpling.png", "assets/heart.png", "assets/icon-192.png", "assets/icon-512.png", "assets/icons.json", "assets/icons.webp", "assets/jack_front.png", "assets/jack_side.png", "assets/jack_upside.png", "assets/lock.png", "assets/milk.png", "assets/moon.png", "assets/note.png", "assets/owl.png", "assets/shield.png", "assets/snake.png", "assets/snow.png", "assets/sparkles.png", "assets/star.png", "assets/tiger.png", "assets/tigerface.png", "assets/trophy.png", "assets/zzz.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('plushsquad')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // models etc. handled by the browser / transformers.js cache
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok && url.pathname.includes('/vendor/tjs/')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
