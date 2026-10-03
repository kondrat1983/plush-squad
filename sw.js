// Plush Squad service worker.
// Code (html/js/json) = network-first, so updates show up right away; pictures, fonts and libraries = cache-first (offline play).
const CACHE = 'plushsquad-v0.7.6';
const FILES = ["./", "index.html", "manifest.json", "vendor/phaser.min.js", "js/audio.js", "js/toys.js", "js/game.js", "vendor/supabase.js", "js/config.js", "js/extra.js", "js/net.js", "assets/icons2.webp", "assets/icons2.json", "assets/pumpkin.png", "assets/bat.png", "assets/spider.png", "assets/vampire.png", "assets/kraken.png", "assets/candy.png", "assets/lollipop.png", "assets/web.png", "assets/tophat.png", "assets/witchhat.png", "assets/gift.png", "js/toyworker.js", "assets/Poppins-Bold.ttf", "assets/Poppins-Medium.ttf", "assets/apple-touch-icon.png", "assets/arch_emb.json", "assets/books.png", "assets/cap.png", "assets/cloud.png", "assets/cow.png", "assets/crown.png", "assets/dance.png", "assets/dizzy.png", "assets/dumpling.png", "assets/heart.png", "assets/icon-192.png", "assets/icon-512.png", "assets/icons.json", "assets/icons.webp", "assets/jack_front.png", "assets/jack_side.png", "assets/jack_upside.png", "assets/lock.png", "assets/milk.png", "assets/moon.png", "assets/note.png", "assets/owl.png", "assets/shield.png", "assets/snake.png", "assets/snow.png", "assets/sparkles.png", "assets/star.png", "assets/tiger.png", "assets/tigerface.png", "assets/trophy.png", "assets/zzz.png", "assets/robot.png", "assets/ghost.png", "assets/dragonboss.png", "assets/polandball.png", "assets/planet.png", "assets/rocket.png", "assets/extinguisher.png", "assets/comet.png", "assets/ufo.png"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('plushsquad')).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const isCode = url => url.pathname.endsWith('/') || /\.(html|js|json|mjs)$/.test(url.pathname) && !url.pathname.includes('/vendor/');
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (isCode(url)) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
