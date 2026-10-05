// Plush Squad v0.6 — Jack the plush dragon, his rivals, YOUR toys (+ Toy), Space, Star Catch, difficulty and booster capsules. Phaser 3.
(function () {
  'use strict';
  // main() builds the whole game for the current screen orientation. On rotate the game is destroyed and
  // main() runs again with a snapshot (RESUME) of the scene the kid was in, so nothing is lost.
  // v0.7.2b: the canvas fills the whole screen (also under the iPhone status bar / home bar) and the camera
  // shifts the scene so buttons stay inside the safe area; backgrounds and dims bleed to the screen edges.
  function viewSize() {
    const el = document.getElementById('game'), r = el && el.getBoundingClientRect();
    return { w: Math.max((r && r.width) || window.innerWidth, 1), h: Math.max((r && r.height) || window.innerHeight, 1) };
  }
  function insets() {
    const el = document.getElementById('safe'); if (!el) return { t: 0, b: 0, l: 0, r: 0 };
    const cs = getComputedStyle(el), n = v => parseFloat(v) || 0;
    const i = { t: n(cs.paddingTop), b: n(cs.paddingBottom), l: n(cs.paddingLeft), r: n(cs.paddingRight) };
    // iOS 26 home-screen web app: the page is shorter than the screen and the home bar sits below it,
    // so there is no need to keep clear of it inside the page
    const sh = Math.max(screen.width, screen.height), sw = Math.min(screen.width, screen.height);
    const full = window.innerHeight > window.innerWidth ? sh : sw;
    i.dead = navigator.standalone ? Math.max(0, full - window.innerHeight) : 0;
    if (i.dead < 8) i.dead = 0;
    i.b = Math.max(0, i.b - i.dead);
    return i;
  }
  function main(RESUME) {
  const VIEW = viewSize(), INS = insets();
  const UW = Math.max(VIEW.w - INS.l - INS.r, 1), UH = Math.max(VIEW.h - INS.t - INS.b, 1);
  const PORTRAIT = UH > UW;
  const ASPECT = UW / UH;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const W = PORTRAIT ? 1080 : Math.round(clamp(1080 * ASPECT, 1440, 2340));
  const H = PORTRAIT ? Math.round(clamp(1080 / ASPECT, 1500, 2340)) : 1080;
  // safe-area margins in game units, and the full canvas around the W x H play area
  const KU = PORTRAIT ? W / UW : H / UH;
  const ST = Math.round(INS.t * KU), SB = Math.round(INS.b * KU), SL = Math.round(INS.l * KU), SR = Math.round(INS.r * KU);
  const GW = W + SL + SR, GH = H + ST + SB;
  const BLEED = { W, H, cx: W / 2 + (SR - SL) / 2, cy: H / 2 + (SB - ST) / 2, w: GW, h: GH };
  window.__psBleed = BLEED;
  // full-screen rectangles (dims, flashes) automatically cover the safe-area margins too
  const GOF = Phaser.GameObjects.GameObjectFactory.prototype;
  if (!GOF.__psRect) {
    GOF.__psRect = GOF.rectangle;
    GOF.rectangle = function (x, y, w, h, c, a) {
      const b = window.__psBleed;
      if (b && x === b.W / 2 && y === b.H / 2 && w === b.W && h === b.H) { x = b.cx; y = b.cy; w = b.w; h = b.h; }
      return GOF.__psRect.call(this, x, y, w, h, c, a);
    };
  }
  const safeCam = scene => scene.cameras.main.setScroll(-SL, -ST);
  // ground strips anchored to the bottom stretch down into the home-bar margin
  function bottomGround(scene, key, sy, alpha) {
    const img = scene.add.image(W / 2, H + 40 + SB, key).setOrigin(0.5, 1);
    img.setScale(1, sy + SB / img.height); if (alpha != null) img.setAlpha(alpha);
    bottomFade(scene);
    return img;
  }
  // iOS 26 home-screen web app: a strip under the page can't be drawn on (WebKit bug 301108), only coloured.
  // The scene's bottom edge fades into one flat colour and the page behind gets the same colour, so the strip blends in.
  const DEAD = INS.dead || 0, FADE = 260;
  window.__psFadeCol = window.__psFadeCol || 0x1d2163;
  function bottomFade(scene) {
    if (!DEAD) return;
    const f = scene.add.image(BLEED.cx, H + SB, 'fadeB').setOrigin(0.5, 1).setDisplaySize(GW + 8, FADE).setTint(window.__psFadeCol);
    (scene._psFades = scene._psFades || []).push(f);
  }
  function tintPage(game) {
    const r = game.renderer; if (!r || !r.snapshotPixel) return;
    try {
      // with the fade: sample just above it, at the right edge (the version label sits bottom-left)
      r.snapshotPixel(DEAD ? GW - 6 : Math.round(GW * 0.04), DEAD ? GH - FADE - 6 : GH - 2, c => {
        if (!c) return;
        const n = (c.r << 16) | (c.g << 8) | c.b, col = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
        document.documentElement.style.background = col; document.body.style.background = col;
        window.__psFadeCol = n;
        game.scene.getScenes(true).forEach(sc => (sc._psFades || []).forEach(f => f.active && f.setTint(n)));
      });
    } catch (e) {}
  }
  const DEBUG = /[?&]debug/.test(location.search);
  const VERSION = '0.8.0';
  const A = window.PSAudio;
  const FONT = 'Poppins, "Arial Rounded MT Bold", Arial, sans-serif';
  const C = { night: 0x1d2163, night2: 0x272c7c, night3: 0x343a96, seam: 0x6a72d6, star: 0xffd23f, cream: 0xfff3d2, coral: 0xff6b5b, mint: 0x7fd6c2, orange: 0xff8a3d, ink: '#1d2163' };

  // ---------- save
  const KEY = 'plushsquad_v1';
  const Save = {
    data: { xp: 0, wins: 0, muted: false, stars: {}, toys: [], hero: 'jack' },
    load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {} },
    store() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} if (window.PSOnSave) { try { window.PSOnSave(this.data); } catch (e) {} } },
  };
  Save.load(); A.muted = !!Save.data.muted; if (!Save.data.stars) Save.data.stars = {}; if (!Array.isArray(Save.data.toys)) Save.data.toys = []; if (!Save.data.hero) Save.data.hero = 'jack';
  ['diff', 'caps', 'boosts', 'seen', 'stats', 'ach', 'costumes'].forEach((k, i) => { if (Save.data[k] == null) Save.data[k] = ['normal', 0, {}, {}, {}, {}, {}][i]; });
  if (!Save.data.costume) Save.data.costume = 'none';
  // v0.8 save migration (runs on every load, also after a cloud save is pulled in; never takes anything away)
  (d => {
    if (d.ach && d.ach.allstars) d.costumes.crown = true; // the crown is the Superstar sticker's reward
    // once, for saves from before v0.8 (fresh saves get the flag on their first load):
    if (!d.mig08) {
      const had = Object.assign({}, d.costumes);
      // the Royal Crown was shown to Dragon Boss winners without being stored (G35). Only for old saves:
      // the v0.8 UFO boss keeps the id 'dragonboss' and gives the UFO Hat instead
      if ((d.stars.dragonboss || 0) > 0) d.costumes.crown = true;
      // boss hats for players who already beat these bosses (owner's decision, v0.8)
      if ((d.stars.hoot || 0) > 0) d.costumes.owlhat = true;
      if ((d.stars.fang || 0) > 0) d.costumes.bat = true;
      // new hats are announced once as a gift on the first menu screen (js/extra.js, QA B43)
      // (the crown is no news to Dragon Boss winners: Me already showed it to them, only unstored, code review)
      const gifts = ['owlhat', 'bat', 'crown'].filter(k => d.costumes[k] && !had[k] && !(k === 'crown' && (d.stars.dragonboss || 0) > 0));
      if (gifts.length) d.gifts08 = gifts;
      d.mig08 = 1;
    }
  })(Save.data);
  // Halloween event: October + first week of November (or ?halloween to test)
  const NOW = new Date();
  const EVENT_ON = /[?&]halloween/.test(location.search) || NOW.getMonth() === 9 || (NOW.getMonth() === 10 && NOW.getDate() <= 7);
  // plugins (js/extra.js, js/net.js) add scenes and listen to game events
  const PLUGINS = window.PSPlugins || [];
  let PS = null;
  function emit(name, data, scene) { PLUGINS.forEach(p => { try { p.onEvent && p.onEvent(name, data || {}, scene, PS); } catch (e) { console.warn('plugin', e); } }); }

  // ---------- difficulty
  const DIFFS = {
    easy: { name: 'EASY', color: 0x7fe39a, hp: 0.8, dmg: 0.8, scale: false, smart: false, xp: 1 },
    normal: { name: 'NORMAL', color: 0xffd23f, hp: 1, dmg: 1, scale: true, smart: true, xp: 1 },
    hard: { name: 'HARD', color: 0xff6b5b, hp: 1.2, dmg: 1.15, scale: true, smart: true, xp: 1.5 },
  };
  const diff = () => DIFFS[Save.data.diff] || DIFFS.normal;
  // SAVE IT! (v0.8 Canada, docs/gdd/0.8-canada.md section 4). Times in ms after the puck leaves the stick; F = flight time.
  const SAVE_T = {
    easy: { pause: [800, 800], F: 2000 },
    normal: { pause: [600, 600], F: 1200, perfect: [880, 1280], good: [480, 880] },
    hard: { pause: [300, 1000], F: 1000, perfect: [810, 1060], good: [560, 810] },
  };
  // a tap t ms after launch (negative = during the pause): 'perfect', 'good', 'early' or 'late'. EASY: any tap until F + 300 is perfect.
  function judgeSave(t, d) {
    const T = SAVE_T[d] || SAVE_T.normal;
    if (!T.perfect) return t <= T.F + 300 ? 'perfect' : 'late';
    if (t >= T.perfect[0] && t <= T.perfect[1]) return 'perfect';
    if (t >= T.good[0] && t < T.good[1]) return 'good';
    return t < T.good[0] ? 'early' : 'late';
  }

  // ---------- boosters from the capsule machine (just for the surprise, nothing to buy)
  // rarity: 1 common, 2 rare, 3 super rare. Each booster is used up in one duel.
  const BOOSTS = [
    { id: 'breakfast', r: 1, name: 'Big Breakfast', icon: 'dumpling', desc: 'Start with +25 pep' },
    { id: 'fort', r: 1, name: 'Pillow Fort', icon: 'shield', desc: 'Start behind a shield' },
    { id: 'milk', r: 1, name: 'Warm Milk', icon: 'milk', desc: 'Extra move: +30 pep',
      move: { k: 'b_milk', uses: 1, title: 'Warm Milk', sub: '+30 pep', icon: 'milk', type: 'heal', tex: 'milk', amt: 30, log: '{a} sips warm milk. So cozy!' } },
    { id: 'lucky', r: 2, name: 'Lucky Star', icon: 'star', desc: 'Every hit does +3' },
    { id: 'feathers', r: 2, name: 'Feather Storm', icon: 'feather', desc: 'Extra move: 3 feather hits',
      move: { k: 'b_feathers', uses: 1, title: 'Feather Storm', sub: '18–26 pep', icon: 'feather', type: 'volley', tex: 'feather', dmg: [18, 26], word: 'FEATHER STORM!', sound: 'whoosh', log: '{a} shakes a pillow open... FEATHER STORM!' } },
    { id: 'blizzard', r: 2, name: 'Snow Globe', icon: 'snow', desc: 'Extra move: Blizzard',
      move: { k: 'b_blizzard', uses: 1, title: 'Blizzard', sub: '20–26 pep', icon: 'snow', type: 'spray', tex: 'snow', dmg: [20, 26], word: 'BLIZZARD!', sound: 'whoosh', log: '{a} shakes the snow globe... BLIZZARD!' } },
    { id: 'moon', r: 2, name: 'Sleepy Moon', icon: 'moon', desc: 'Rival starts dizzy' },
    { id: 'rocket', r: 2, name: 'Rocket Start', icon: 'rocket', desc: 'First hit does +10' },
    { id: 'heart', r: 3, name: 'Spare Heart', icon: 'heart', desc: 'Out of pep? Bounce back with 40!' },
    { id: 'superstar', r: 3, name: 'Super Star', icon: 'sparkles', desc: 'Double XP this duel' },
  ];
  const BOOST_BY_ID = {}; BOOSTS.forEach(b => BOOST_BY_ID[b.id] = b);
  const RARITY = { 1: { name: 'COMMON', color: '#bcc0ee', w: 14 }, 2: { name: 'RARE', color: '#7fd6ff', w: 8 }, 3: { name: 'SUPER RARE!', color: '#ff9ed8', w: 4 } };
  function rollBoost() {
    const sum = BOOSTS.reduce((t, b) => t + RARITY[b.r].w, 0); let x = Math.random() * sum;
    for (const b of BOOSTS) { x -= RARITY[b.r].w; if (x <= 0) return b; }
    return BOOSTS[0];
  }
  // one free capsule per day
  function dailyCapsule() {
    const today = new Date().toDateString();
    if (Save.data.daily === today) return false;
    Save.data.daily = today; Save.data.caps++; Save.store(); return true;
  }
  const need = l => 100 + (l - 1) * 50;
  function levelOf(x) { let l = 1, r = x; while (r >= need(l)) { r -= need(l); l++; } return { l, r, n: need(l) }; }
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  function txt(scene, x, y, s, size, color = '#fff', o = {}) {
    const t = scene.add.text(x, y, s, {
      fontFamily: FONT, fontStyle: o.weight || 'bold', fontSize: size + 'px', color,
      stroke: o.stroke || '#1d2163', strokeThickness: o.st == null ? Math.round(size / 7) : o.st,
      align: o.align || 'center', wordWrap: o.wrap ? { width: o.wrap } : undefined,
    }).setOrigin(o.ox == null ? 0.5 : o.ox, o.oy == null ? 0.5 : o.oy);
    if (o.shadow !== false) t.setShadow(0, Math.round(size / 14), 'rgba(0,0,0,0.35)', Math.round(size / 10), true, true);
    return t;
  }
  // shrink a text object so it fits a max width
  const fit = (t, maxW) => { if (t.width > maxW) t.setScale(maxW / t.width); return t; };
  const tw = (scene, cfg) => new Promise(r => scene.tweens.add(Object.assign({}, cfg, { onComplete: () => { cfg.onComplete && cfg.onComplete(); r(); } })));
  const wait = (scene, ms) => new Promise(r => scene.time.delayedCall(ms, r));

  // ---------- tiny IndexedDB key/value store for toy pictures
  const IDB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        try {
          const r = indexedDB.open('plushsquad', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('img');
          r.onsuccess = () => { this.db = r.result; res(this.db); };
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
    },
    req(mode, fn) { return this.open().then(db => new Promise((res, rej) => { const tx = db.transaction('img', mode); const q = fn(tx.objectStore('img')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); })); },
    get(k) { return this.req('readonly', s => s.get(k)); },
    set(k, v) { return this.req('readwrite', s => s.put(v, k)); },
    del(k) { return this.req('readwrite', s => s.delete(k)); },
  };
  function addTexture(scene, key, url) {
    return new Promise((res) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const img = new Image();
      if (/^https?:/.test(url)) img.crossOrigin = 'anonymous';
      img.onload = () => { if (scene.textures.exists(key)) scene.textures.remove(key); scene.textures.addImage(key, img); res(true); };
      img.onerror = () => res(false);
      img.src = url;
    });
  }
  // image helper: 'i:name' = frame of the icons atlas, otherwise a texture key
  function img(scene, x, y, key) {
    if (key && key.startsWith('i:')) return scene.add.image(x, y, 'icons', key.slice(2));
    if (key && key.startsWith('j:')) return scene.add.image(x, y, 'icons2', key.slice(2));
    return scene.add.image(x, y, key);
  }
  function iconScale(key, size) { // scale so the icon is ~size px
    if (!key) return 1;
    if (key.startsWith('i:') || key.startsWith('j:')) return size / 144;
    const base = { moose: 240, beaver: 242, bear: 242, sasquatch: 380, mapleleaf: 238, pine: 201, pancakes: 238, hockey: 238, glove: 238, toque: 230, snowball: 120, puck: 100, polandball: 486, aliens: 385, mothership: 318, umbrella: 237, kraken: 235, pumpkin: 236, bat: 236, spider: 236, vampire: 235, candy: 235, lollipop: 236, web: 234, tophat: 234, witchhat: 230, gift: 234, robot: 242, ghost: 243, dragonboss: 285, owl: 299, tiger: 241, cow: 242, snake: 242, heart: 224, moon: 211, comet: 200, extinguisher: 224, rocket: 224, planet: 190, ufo: 224, pillow: 216, books: 224, snow: 214, zzz: 223, sparkles: 223, star: 224, dizzy: 224, dance: 223, shield: 179, note: 230, dumpling: 223, milk: 188, cloud: 224, feather: 120, dot: 64, spark: 80 }[key] || 220;
    return size / base;
  }

  // ---------- shared scenery
  const SPACE = 1;
  const CANADA = 2; // v0.8
  const SPOOKY = 3;
  const groundKey = w => w === SPACE ? 'ground2' : w === SPOOKY ? 'ground3' : w === CANADA ? 'ground4' : 'ground';
  function sky(scene, world = 0) {
    const sp = world === SPACE, spook = world === SPOOKY, can = world === CANADA;
    scene.add.image(BLEED.cx, BLEED.cy, sp ? 'sky2' : spook ? 'sky3' : can ? 'sky4' : 'sky').setDisplaySize(GW, GH);
    const g = scene.add.image(W * 0.5, PORTRAIT ? H * 0.27 : H * 0.3, 'glow').setScale(PORTRAIT ? 2.2 : 2.6).setAlpha(0.55);
    scene.tweens.add({ targets: g, alpha: 0.35, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    for (let i = 0; i < (PORTRAIT ? 70 : 90) * (sp ? 1.6 : 1); i++) {
      const s = scene.add.image(Math.random() * W, Math.random() * H * (sp ? 0.75 : 0.62), 'dot')
        .setScale(0.12 + Math.random() * 0.22).setTint(Math.random() < 0.3 ? C.star : 0xffffff).setAlpha(0.3 + Math.random() * 0.6);
      scene.tweens.add({ targets: s, alpha: 0.08, duration: 900 + Math.random() * 2200, yoyo: true, repeat: -1, delay: Math.random() * 2000, ease: 'Sine.inOut' });
    }
    if (sp) spaceDecor(scene, scene.scene.key === 'battle' ? 15000 : 7000);
    else if (spook) spookyDecor(scene);
    else if (can) canadaDecor(scene);
    else for (let i = 0; i < 5; i++) {
      const cl = scene.add.image(Math.random() * W, H * (0.08 + Math.random() * 0.42), 'cloud')
        .setAlpha(0.13 + Math.random() * 0.12).setScale(0.8 + Math.random() * 1.3);
      const sp = 9000 + Math.random() * 12000;
      scene.tweens.add({ targets: cl, x: cl.x + W * 0.35, duration: sp * 2, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    scene.time.addEvent({ delay: 4200, loop: true, callback: () => { if (Math.random() < 0.6) shootingStar(scene); } });
    bottomFade(scene);
  }
  // Halloween world: bats flapping across, an orange glow, cobwebs in the corners
  function spookyDecor(scene) {
    const wb = scene.add.image(W - 70, 70, 'web').setScale(0.9).setAlpha(0.35).setAngle(10);
    const wb2 = scene.add.image(70, 70, 'web').setScale(0.7).setAlpha(0.3).setFlipX(true);
    scene.time.addEvent({ delay: 3500, loop: true, callback: () => {
      const y = H * (0.08 + Math.random() * 0.35), dir = Math.random() < 0.5 ? 1 : -1;
      const b = scene.add.image(dir > 0 ? -100 : W + 100, y, 'bat').setScale(0.3).setFlipX(dir < 0).setAlpha(0.85);
      scene.tweens.add({ targets: b, scaleY: 0.18, duration: 140, yoyo: true, repeat: -1 });
      scene.tweens.add({ targets: b, x: dir > 0 ? W + 100 : -100, y: y + rnd(-120, 120), duration: 5200, ease: 'Sine.inOut', onComplete: () => b.destroy() });
    } });
  }
  // Canada: northern lights, pines on the horizon, falling snow and now and then a maple leaf
  function canadaDecor(scene) {
    const au = scene.add.image(BLEED.cx, PORTRAIT ? H * 0.2 : H * 0.22, 'aurora').setDisplaySize(GW, PORTRAIT ? H * 0.32 : H * 0.42).setAlpha(0.55);
    scene.tweens.add({ targets: au, alpha: 0.28, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const gy = scene.scene.key === 'map' ? H * (PORTRAIT ? 0.62 : 0.58) : null; // pines only on the map (QA B53)
    if (gy) for (let i = 0; i < 6; i++) scene.add.image(W * (0.05 + i * 0.18) + rnd(-30, 30), gy + rnd(-20, 20), 'pine').setOrigin(0.5, 1).setScale(0.5 + Math.random() * 0.4).setAlpha(0.55).setTint(0x9fb6d8);
    const snow = scene.add.particles(0, 0, 'dot', { x: { min: -40, max: W + 40 }, y: -30, speedY: { min: 60, max: 140 }, speedX: { min: -40, max: 40 }, lifespan: 16000, scale: { min: 0.1, max: 0.28 }, alpha: { min: 0.5, max: 0.95 }, frequency: 260 });
    snow.setDepth(3);
    scene.time.addEvent({ delay: 6500, loop: true, callback: () => {
      if (Math.random() < 0.4) return;
      const y = H * (0.1 + Math.random() * 0.35), l = scene.add.image(-80, y, 'mapleleaf').setScale(0.22).setAlpha(0.9).setDepth(3);
      scene.tweens.add({ targets: l, angle: 720, x: W + 80, y: y + rnd(80, 260), duration: 9000, ease: 'Sine.inOut', onComplete: () => l.destroy() });
    } });
  }
  // Space world: a far planet, a drifting UFO and a rocket that zooms by now and then
  function spaceDecor(scene, rocketEvery = 7000) {
    const pl = scene.add.image(W * 0.12, H * (PORTRAIT ? 0.1 : 0.16), 'planet').setScale(0.7).setAlpha(0.55).setTint(0xc9b6ff);
    scene.tweens.add({ targets: pl, angle: 360, duration: 60000, repeat: -1 });
    if (!(scene.R && scene.R.id === 'dragonboss')) { // no second UFO flying around the Mothership
      const u = scene.add.image(-150, H * (PORTRAIT ? 0.33 : 0.3), 'ufo').setScale(0.42).setAlpha(0.8);
      scene.tweens.add({ targets: u, x: W + 150, duration: 26000, repeat: -1, delay: 1500 });
      scene.tweens.add({ targets: u, y: u.y - 40, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    scene.time.addEvent({ delay: rocketEvery, loop: true, callback: () => {
      const y = H * (0.08 + Math.random() * 0.3);
      const r = scene.add.image(W + 140, y, 'rocket').setScale(0.4).setAngle(-135).setAlpha(0.9);
      const tr = scene.add.particles(0, 0, 'dot', { follow: r, frequency: 30, lifespan: 600, scale: { start: 0.35, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: [0xffd23f, 0xff8a3d, 0xffffff], speed: 30 });
      scene.tweens.add({ targets: r, x: -160, y: y + H * 0.15, duration: 3800, ease: 'Sine.inOut', onComplete: () => { tr.stop(); r.destroy(); scene.time.delayedCall(700, () => tr.destroy()); } });
    } });
  }
  function shootingStar(scene) {
    const x = Math.random() * W * 0.7 + W * 0.1, y = Math.random() * H * 0.25;
    const s = scene.add.image(x, y, 'streak').setAngle(28).setAlpha(0).setScale(0.6);
    scene.tweens.add({ targets: s, x: x + 420, y: y + 225, alpha: { from: 1, to: 0 }, duration: 900, ease: 'Quad.in', onComplete: () => s.destroy() });
  }
  function muteButton(scene) {
    const x = W - 80, y = 80;
    const c = scene.add.container(x, y).setDepth(50);
    const bg = scene.add.circle(0, 0, 46, C.night2).setStrokeStyle(4, C.seam);
    const g = scene.add.graphics();
    const draw = () => {
      g.clear(); g.fillStyle(0xfff3d2); g.fillRect(-24, -10, 12, 20); g.fillTriangle(-14, -10, 4, -24, 4, 24); g.fillTriangle(-14, 10, 4, -24, 4, 24);
      g.lineStyle(5, 0xfff3d2);
      if (A.muted) { g.lineBetween(12, -12, 28, 12); g.lineBetween(28, -12, 12, 12); }
      else { g.beginPath(); g.arc(6, 0, 12, -0.9, 0.9); g.strokePath(); g.beginPath(); g.arc(6, 0, 22, -0.9, 0.9); g.strokePath(); }
    };
    draw(); c.add([bg, g]);
    c.setSize(100, 100).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      A.init(); A.setMuted(!A.muted); Save.data.muted = A.muted; Save.store(); draw(); if (!A.muted) { A.startMusic(); A.click(); }
      scene.tweens.add({ targets: c, scale: { from: 0.85, to: 1 }, duration: 250, ease: 'Back.out' });
    });
    return c;
  }
  function button(scene, x, y, w, h, label, color, cb, o = {}) {
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, h / 2.4);
    g.fillStyle(color); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2.4);
    g.fillStyle(0xffffff, 0.25); g.fillRoundedRect(-w / 2 + 14, -h / 2 + 8, w - 28, h * 0.32, h / 5);
    const t = txt(scene, 0, 0, label, o.size || 54, o.color || C.ink, { st: 0, shadow: false });
    c.add([g, t]); c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { A.init(); A.click(); scene.tweens.add({ targets: c, scale: 0.93, duration: 70 }); });
    c.on('pointerup', () => { scene.tweens.add({ targets: c, scale: 1, duration: 220, ease: 'Back.out' }); cb && cb(); });
    c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 120 }));
    return c;
  }

  // ---------- Boot
  class Boot extends Phaser.Scene {
    constructor() { super('boot'); }
    preload() {
      safeCam(this);
      const bar = this.add.rectangle(W / 2 - 300, H / 2, 4, 26, C.star).setOrigin(0, 0.5);
      this.add.rectangle(W / 2, H / 2, 608, 34).setStrokeStyle(4, C.seam);
      this.load.on('progress', p => bar.width = 600 * p);
      ['jack_side', 'jack_upside', 'jack_front', 'tiger', 'cow', 'snake', 'owl', 'moon', 'cloud', 'zzz', 'snow', 'star', 'trophy', 'heart', 'sparkles',
        'dumpling', 'milk', 'books', 'lock', 'dizzy', 'dance', 'crown', 'note', 'shield',
        'robot', 'ghost', 'dragonboss', 'aliens', 'mothership', 'umbrella', 'planet', 'rocket', 'extinguisher', 'comet', 'ufo',
        'pumpkin', 'bat', 'spider', 'vampire', 'kraken', 'candy', 'lollipop', 'web', 'tophat', 'witchhat', 'gift',
        'moose', 'beaver', 'bear', 'sasquatch', 'mapleleaf', 'pine', 'pancakes', 'hockey', 'glove']
        .forEach(k => this.load.image(k, 'assets/' + k + '.png'));
      this.load.atlas('icons', 'assets/icons.webp', 'assets/icons.json');
      this.load.atlas('icons2', 'assets/icons2.webp', 'assets/icons2.json');
    }
    create() {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff); g.fillCircle(32, 32, 32); g.generateTexture('dot', 64, 64); g.clear();
      // spark (4-point star)
      g.fillStyle(0xffffff); g.beginPath();
      for (let i = 0; i < 8; i++) { const a = Math.PI / 4 * i - Math.PI / 2, r = i % 2 ? 9 : 40; g.lineTo(40 + r * Math.cos(a), 40 + r * Math.sin(a)); }
      g.closePath(); g.fillPath(); g.generateTexture('spark', 80, 80); g.clear();
      // feather
      g.fillStyle(0xffffff); g.fillEllipse(30, 60, 30, 100); g.fillStyle(0xe4dcff); g.fillEllipse(34, 64, 14, 80);
      g.lineStyle(3, 0xc9bdf2); g.lineBetween(30, 8, 30, 118); g.generateTexture('feather', 60, 120); g.clear();
      // confetti
      g.fillStyle(0xffffff); g.fillRect(0, 0, 18, 30); g.generateTexture('conf', 18, 30); g.clear();
      // ring
      g.lineStyle(10, 0xffffff); g.strokeCircle(70, 70, 60); g.generateTexture('ring', 140, 140); g.clear();
      // shadow
      g.fillStyle(0x000000, 0.35); g.fillEllipse(150, 30, 300, 60); g.generateTexture('shadow', 300, 60); g.clear();
      // streak
      // pillow
      g.fillStyle(0x000000, 0.2); g.fillRoundedRect(10, 22, 200, 120, 46);
      g.fillStyle(0xf6efff); g.fillRoundedRect(6, 10, 200, 120, 46);
      g.fillStyle(0xe2d6ff); g.fillRoundedRect(26, 70, 160, 50, 26);
      g.lineStyle(5, 0xb7a6ef); g.strokeRoundedRect(6, 10, 200, 120, 46);
      g.fillStyle(0xb7a6ef); [[22, 26], [190, 26], [22, 114], [190, 114]].forEach(([x, y]) => g.fillCircle(x, y, 10));
      g.generateTexture('pillow', 216, 150); g.clear();
      g.fillStyle(0x9fc3ea); g.fillCircle(60, 62, 56); g.fillStyle(0xffffff); g.fillCircle(56, 56, 52); g.fillStyle(0xe6f1ff); g.fillCircle(72, 72, 22);
      g.generateTexture('snowball', 120, 120); g.clear();
      g.fillStyle(0x0b0d1a); g.fillEllipse(50, 34, 96, 44); g.fillStyle(0x2a2f4a); g.fillEllipse(50, 26, 96, 40); g.fillStyle(0x4a5070, 0.8); g.fillEllipse(42, 22, 50, 14);
      g.generateTexture('puck', 100, 60); g.clear();
      g.destroy();
      // sky gradient + glow + quilt ground (canvas textures)
      const sk = this.textures.createCanvas('sky', W, H), cx = sk.getContext();
      const gr = cx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0f1240'); gr.addColorStop(0.55, '#262b7c'); gr.addColorStop(1, '#3a3f9e');
      cx.fillStyle = gr; cx.fillRect(0, 0, W, H); sk.refresh();
      const sk2 = this.textures.createCanvas('sky2', W, H), cx2 = sk2.getContext();
      const gr2 = cx2.createLinearGradient(0, 0, 0, H); gr2.addColorStop(0, '#05041a'); gr2.addColorStop(0.5, '#1c0f4d'); gr2.addColorStop(1, '#3b1d70');
      cx2.fillStyle = gr2; cx2.fillRect(0, 0, W, H);
      const neb = (x, y, r, col) => { const ng = cx2.createRadialGradient(x, y, 0, x, y, r); ng.addColorStop(0, col); ng.addColorStop(1, 'rgba(0,0,0,0)'); cx2.fillStyle = ng; cx2.fillRect(0, 0, W, H); };
      neb(W * 0.75, H * 0.25, W * 0.35, 'rgba(255,90,180,0.16)'); neb(W * 0.2, H * 0.45, W * 0.3, 'rgba(90,200,255,0.12)');
      sk2.refresh();
      const sk3 = this.textures.createCanvas('sky3', W, H), cx3 = sk3.getContext();
      const gr3 = cx3.createLinearGradient(0, 0, 0, H); gr3.addColorStop(0, '#0d0820'); gr3.addColorStop(0.5, '#2e1450'); gr3.addColorStop(1, '#7a3046');
      cx3.fillStyle = gr3; cx3.fillRect(0, 0, W, H);
      const ng3 = cx3.createRadialGradient(W * 0.5, H * 0.75, 0, W * 0.5, H * 0.75, W * 0.6); ng3.addColorStop(0, 'rgba(255,140,60,0.25)'); ng3.addColorStop(1, 'rgba(0,0,0,0)');
      cx3.fillStyle = ng3; cx3.fillRect(0, 0, W, H); sk3.refresh();
      const st = this.textures.createCanvas('streak', 240, 8), sx = st.getContext();
      const sg = sx.createLinearGradient(0, 0, 240, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,1)');
      sx.fillStyle = sg; sx.beginPath(); sx.moveTo(0, 4); sx.lineTo(236, 0); sx.arc(236, 4, 4, -Math.PI / 2, Math.PI / 2); sx.closePath(); sx.fill(); st.refresh();
      const fb = this.textures.createCanvas('fadeB', 4, 256), fx = fb.getContext(), fg = fx.createLinearGradient(0, 0, 0, 256);
      fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(0.55, 'rgba(255,255,255,0.75)'); fg.addColorStop(1, 'rgba(255,255,255,1)');
      fx.fillStyle = fg; fx.fillRect(0, 0, 4, 256); fb.refresh();
      const gl = this.textures.createCanvas('glow', 400, 400), gx = gl.getContext();
      const rg = gx.createRadialGradient(200, 200, 0, 200, 200, 200); rg.addColorStop(0, 'rgba(255,220,120,0.55)'); rg.addColorStop(0.4, 'rgba(160,150,255,0.18)'); rg.addColorStop(1, 'rgba(120,120,255,0)');
      gx.fillStyle = rg; gx.fillRect(0, 0, 400, 400); gl.refresh();
      const GW = Math.round(W * 1.5), GH = Math.round(PORTRAIT ? H * 0.5 : H * 0.6), RY = Math.min(GH * 0.62, GW * 0.17);
      const gt = this.textures.createCanvas('ground', GW, GH), q = gt.getContext();
      q.save(); q.beginPath(); q.ellipse(GW / 2, RY, GW / 2, RY, 0, Math.PI, 0); q.lineTo(GW, GH); q.lineTo(0, GH); q.closePath(); q.clip();
      const qg = q.createLinearGradient(0, 0, 0, GH); qg.addColorStop(0, '#4a50b8'); qg.addColorStop(0.35, '#2f3492'); qg.addColorStop(1, '#1d2163');
      q.fillStyle = qg; q.fillRect(0, 0, GW, GH);
      q.setLineDash([22, 18]); q.lineWidth = 5; q.strokeStyle = 'rgba(140,150,255,0.55)';
      for (let i = 1; i < 6; i++) { q.beginPath(); q.ellipse(GW / 2, RY + i * GH * 0.11, GW / 2 - i * 20, RY, 0, Math.PI, 0); q.stroke(); }
      for (let i = -8; i <= 8; i++) { q.beginPath(); q.moveTo(GW / 2 + i * GW * 0.035, GH * 0.02); q.lineTo(GW / 2 + i * GW * 0.11, GH); q.stroke(); }
      q.restore(); gt.refresh();
      // moon-dust ground for the Space world
      const gt2 = this.textures.createCanvas('ground2', GW, GH), q2 = gt2.getContext();
      q2.save(); q2.beginPath(); q2.ellipse(GW / 2, RY, GW / 2, RY, 0, Math.PI, 0); q2.lineTo(GW, GH); q2.lineTo(0, GH); q2.closePath(); q2.clip();
      const qg2 = q2.createLinearGradient(0, 0, 0, GH); qg2.addColorStop(0, '#a99ad8'); qg2.addColorStop(0.35, '#6a5aa8'); qg2.addColorStop(1, '#2d2463');
      q2.fillStyle = qg2; q2.fillRect(0, 0, GW, GH);
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * GW, y = RY * 0.5 + Math.random() * (GH - RY * 0.5), r = 20 + Math.random() * 70 * (0.4 + y / GH);
        q2.fillStyle = 'rgba(40,28,100,0.35)'; q2.beginPath(); q2.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2); q2.fill();
        q2.fillStyle = 'rgba(220,210,255,0.25)'; q2.beginPath(); q2.ellipse(x, y - r * 0.12, r * 0.8, r * 0.22, 0, Math.PI, 0); q2.fill();
      }
      q2.restore(); gt2.refresh();
      // Canada: twilight sky with northern lights (separate texture so it can shimmer), snow ground
      const sk4 = this.textures.createCanvas('sky4', W, H), cx4 = sk4.getContext();
      const gr4 = cx4.createLinearGradient(0, 0, 0, H); gr4.addColorStop(0, '#0b1a3a'); gr4.addColorStop(0.6, '#1f3f6e'); gr4.addColorStop(1, '#3d6597');
      cx4.fillStyle = gr4; cx4.fillRect(0, 0, W, H); sk4.refresh();
      const ht = this.textures.createCanvas('halftone', 24, 24), hx = ht.getContext();
      hx.fillStyle = 'rgba(29,33,99,0.08)'; [[6, 6], [18, 18]].forEach(([x, y]) => { hx.beginPath(); hx.arc(x, y, 3, 0, Math.PI * 2); hx.fill(); }); ht.refresh();
      const au = this.textures.createCanvas('aurora', 512, 256), ax = au.getContext();
      [['rgba(111,247,194,0.55)', 90, 0], ['rgba(80,220,230,0.4)', 130, 2], ['rgba(255,140,220,0.28)', 60, 4]].forEach(([col, y0, ph]) => {
        ax.strokeStyle = col; ax.lineCap = 'round';
        for (let k = 0; k < 6; k++) {
          ax.lineWidth = 34 - k * 5; ax.globalAlpha = 0.35 + k * 0.1; ax.beginPath();
          for (let x = 0; x <= 512; x += 8) { const y = y0 + Math.sin(x / 70 + ph) * 28 + Math.sin(x / 31 + ph) * 8; if (x) ax.lineTo(x, y); else ax.moveTo(x, y); }
          ax.stroke();
        }
      });
      ax.globalAlpha = 1; au.refresh();
      const gt4 = this.textures.createCanvas('ground4', GW, GH), q4 = gt4.getContext();
      q4.save(); q4.beginPath(); q4.ellipse(GW / 2, RY, GW / 2, RY, 0, Math.PI, 0); q4.lineTo(GW, GH); q4.lineTo(0, GH); q4.closePath(); q4.clip();
      const qg4 = q4.createLinearGradient(0, 0, 0, GH); qg4.addColorStop(0, '#f2f8ff'); qg4.addColorStop(0.4, '#b9d3f0'); qg4.addColorStop(1, '#6d8fc4');
      q4.fillStyle = qg4; q4.fillRect(0, 0, GW, GH);
      for (let i = 0; i < 22; i++) {
        const x = Math.random() * GW, y = RY * 0.6 + Math.random() * (GH - RY * 0.6), r = 40 + Math.random() * 90 * (0.4 + y / GH);
        q4.fillStyle = 'rgba(255,255,255,0.35)'; q4.beginPath(); q4.ellipse(x, y, r, r * 0.25, 0, 0, Math.PI * 2); q4.fill();
      }
      for (let i = 0; i < 90; i++) { q4.fillStyle = 'rgba(255,255,255,' + (0.4 + Math.random() * 0.6) + ')'; q4.fillRect(Math.random() * GW, RY * 0.4 + Math.random() * GH, 3, 3); }
      q4.restore(); gt4.refresh();
      // the Sasquatch reward: a red knit toque with a white band, a pom-pom and a maple leaf (owner's choice, 4 Oct 2026)
      const tq = this.textures.createCanvas('toque', 240, 230), tx = tq.getContext();
      tx.fillStyle = '#ffffff'; tx.beginPath(); tx.arc(120, 40, 36, 0, Math.PI * 2); tx.fill();
      tx.fillStyle = '#e8eef8'; for (let i = 0; i < 14; i++) { tx.beginPath(); tx.arc(120 + Math.cos(i) * 26, 40 + Math.sin(i * 1.7) * 26, 9, 0, Math.PI * 2); tx.fill(); }
      tx.fillStyle = '#d7263d'; tx.beginPath(); tx.moveTo(22, 175); tx.bezierCurveTo(18, 60, 222, 60, 218, 175); tx.closePath(); tx.fill();
      tx.strokeStyle = 'rgba(120,10,30,0.35)'; tx.lineWidth = 6; for (let x = 50; x <= 190; x += 28) { tx.beginPath(); tx.moveTo(x, 168); tx.quadraticCurveTo(120 + (x - 120) * 0.5, 90, 120 + (x - 120) * 0.3, 78); tx.stroke(); }
      tx.fillStyle = '#ffffff'; tx.beginPath(); tx.roundRect ? tx.roundRect(8, 160, 224, 58, 26) : tx.rect(8, 160, 224, 58); tx.fill();
      tx.strokeStyle = 'rgba(160,170,200,0.6)'; tx.lineWidth = 4; for (let x = 24; x < 228; x += 18) { tx.beginPath(); tx.moveTo(x, 166); tx.lineTo(x, 212); tx.stroke(); }
      const leaf = this.textures.get('mapleleaf').getSourceImage(); tx.drawImage(leaf, 82, 92, 76, 79);
      tq.refresh();
      // spooky grass for the Halloween world
      const gt3 = this.textures.createCanvas('ground3', GW, GH), q3 = gt3.getContext();
      q3.save(); q3.beginPath(); q3.ellipse(GW / 2, RY, GW / 2, RY, 0, Math.PI, 0); q3.lineTo(GW, GH); q3.lineTo(0, GH); q3.closePath(); q3.clip();
      const qg3 = q3.createLinearGradient(0, 0, 0, GH); qg3.addColorStop(0, '#4a3a6e'); qg3.addColorStop(0.35, '#2c2048'); qg3.addColorStop(1, '#160f2c');
      q3.fillStyle = qg3; q3.fillRect(0, 0, GW, GH);
      q3.setLineDash([22, 18]); q3.lineWidth = 5; q3.strokeStyle = 'rgba(255,140,60,0.4)';
      for (let i = 1; i < 6; i++) { q3.beginPath(); q3.ellipse(GW / 2, RY + i * GH * 0.11, GW / 2 - i * 20, RY, 0, Math.PI, 0); q3.stroke(); }
      for (let i = -8; i <= 8; i++) { q3.beginPath(); q3.moveTo(GW / 2 + i * GW * 0.035, GH * 0.02); q3.lineTo(GW / 2 + i * GW * 0.11, GH); q3.stroke(); }
      q3.restore(); gt3.refresh();
      // load saved toy pictures, then go
      Promise.all(Save.data.toys.map(t => IDB.get(t.id).then(url => url && addTexture(this, 'toy_' + t.id, url)).catch(() => {})))
        .then(() => this.go(), () => this.go());
    }
    go() {
      if (RESUME && RESUME.key && this.scene.get(RESUME.key)) this.scene.start(RESUME.key, Object.assign({}, RESUME.data, RESUME.battle ? { resume: RESUME.battle } : {}));
      else this.scene.start('title');
    }
  }

  // ---------- game data
  const TOYS = window.PSToys;
  // Jack's moves (generic move format). lvl = player level that unlocks it, uses = per-duel limit (0 = unlimited)
  const MOVES = [
    { k: 'pillow', lvl: 1, uses: 0, title: 'Pillow Whack', sub: '12–20 pep', icon: 'pillow', type: 'throw', tex: 'pillow', dmg: [12, 20], log: '{a} whacks {d} with a pillow!' },
    { k: 'tickle', lvl: 1, uses: 0, title: 'Tickle Attack', sub: '5–28, pure luck', icon: 'sparkles', type: 'tickle', dmg: [5, 28] },
    { k: 'frost', lvl: 1, uses: 1, title: 'Frosty Sneeze', sub: '25 pep', icon: 'snow', type: 'spray', tex: 'snow', dmg: [25, 25], word: 'ACHOO!', sound: 'sneeze', inhale: true, log: 'Ah... ah... ACHOO! A frosty sneeze!' },
    { k: 'nap', lvl: 1, uses: 1, title: 'Upside-Down Nap', sub: '+35 pep', icon: 'zzz', type: 'nap', amt: 35, log: '{a} flips upside down and naps mid-flight... +35 pep!' },
    { k: 'dumpling', lvl: 2, uses: 2, title: 'Dumpling Snack', sub: '+20 pep', icon: 'dumpling', type: 'heal', tex: 'dumpling', amt: 20, log: 'Snack break! {a} gobbles a dumpling. Nom!' },
    { k: 'sixseven', lvl: 3, uses: 1, title: 'Six-Seven Dance', sub: 'rival gets dizzy', icon: 'dance', type: 'dance', log: '{a} busts out the SIX-SEVEN dance! {d} gets dizzy watching!' },
    { k: 'tailspin', lvl: 4, uses: 0, title: 'Tail Spin', sub: '3 hits × 5–9', icon: 'dizzy', type: 'multi', hits: 3, dmg: [5, 9], log: 'TAIL SPIN! {a} whirls like a plush tornado!' },
    { k: 'inferno', lvl: 5, uses: 1, title: 'Inferno Rain', sub: '22–30 pep', icon: 'comet', type: 'rain', dmg: [22, 30], log: '{a} calls down INFERNO RAIN from the sky!' },
  ];
  // worlds (rivals are unlocked in order across all worlds)
  const WORLDS = [
    { name: 'PILLOW HILLS', icon: 'moon' },
    { name: 'SPACE', icon: 'rocket' },
    { name: 'CANADA', icon: 'mapleleaf' },
  ].concat(EVENT_ON ? [{ name: 'SPOOKY', icon: 'pumpkin', event: true }] : []);
  const RIVALS = [
    { id: 'timmy', name: 'Timmy the Tiger', nick: 'Timmy', short: 'TIMMY', tex: 'tiger', scale: 2.0, color: C.orange, hp: 100, xp: 40,
      intro: 'Timmy waves a paw: "Pillows at dawn, Jack!"', laugh: 'Timmy laughed so hard he gave up.',
      moves: [{ type: 'throw', tex: 'pillow', dmg: [10, 18], w: 45, log: '{a} swings a pillow at {d}!' }, { type: 'tickle', dmg: [4, 22], w: 40 },
        { type: 'roar', word: 'RRRRR!', color: 0xffb36b, sound: 'roar', dmg: [15, 24], w: 15, log: '{a} ROARS so funny that {d} tumbles over!' }] },
    { id: 'moo', name: 'Moo the Cow', nick: 'Moo', short: 'MOO', tex: 'cow', scale: 2.0, color: 0xf2f2f7, hp: 120, xp: 55,
      intro: 'Moo chews slowly: "Moooove aside, little dragon."', laugh: 'Moo rolled over giggling in the hay.',
      moves: [{ type: 'throw', tex: 'pillow', dmg: [10, 17], w: 35, log: '{a} swings a pillow at {d}!' }, { type: 'quake', dmg: [12, 20], w: 30, sound: 'moo', log: 'MOO-QUAKE! {a} stomps and the whole blanket shakes!' },
        { type: 'heal', tex: 'milk', amt: 20, uses: 1, w: 15, log: '{a} takes a milk break. Refreshing!' }, { type: 'shield', w: 20, log: '{a} hides behind a shield. Next hit only does half!' }] },
    { id: 'sly', name: 'Sly the Snake', nick: 'Sly', short: 'SLY', tex: 'snake', scale: 1.9, color: 0x5fd38d, hp: 130, xp: 70,
      intro: 'Sly hisses: "Ssssleepy already, Jack?"', laugh: 'Sly tied himself in a knot laughing.',
      moves: [{ type: 'rush', dmg: [10, 18], word: 'WHIP!', w: 40, log: '{a} whips his tail like a jump rope!' }, { type: 'tickle', dmg: [5, 20], w: 25 },
        { type: 'dizzy', color: 0xb38cff, word: 'DIZZY!', uses: 2, w: 15, sound: 'hiss', log: '{a} does the hypno-sway... {d} feels wobbly!' },
        { type: 'roar', word: 'HSSSSS!', color: 0x8ef0a8, sound: 'hiss', dmg: [13, 21], w: 20, log: '{a} hisses so loudly {d}\'s ears flop!' }] },
    { id: 'hoot', name: 'Professor Hoot', nick: 'Professor Hoot', short: 'PROF. HOOT', tex: 'owl', scale: 1.9, color: 0xc89a6a, hp: 150, xp: 100, boss: true, reward: 'owlhat',
      intro: 'Professor Hoot adjusts his cap: "Lesson time, Jack!"', laugh: 'The Professor declared a holiday. No homework!',
      moves: [{ type: 'volley', tex: 'books', dmg: [12, 21], word: 'LESSON TIME!', sound: 'hoot', w: 35, log: 'POP QUIZ! {a} throws books at {d}!' },
        { type: 'throw', tex: 'pillow', dmg: [11, 18], w: 25, log: '{a} swings a pillow at {d}!' },
        { type: 'dizzy', color: 0xffe08a, word: 'STARE...', uses: 2, w: 15, sound: 'hoot', log: '{a} gives {d} THE STARE...' },
        { type: 'heal', tex: 'milk', amt: 25, uses: 1, w: 10, log: '{a} sips some warm milk. Ahh.' },
        { type: 'roar', word: 'HOOT HOOT!', color: 0xffe08a, sound: 'hoot', dmg: [14, 22], w: 15, log: '{a} hoots so loud the moon wobbles!' }] },
    // ---- World 2: SPACE
    { id: 'robot', world: SPACE, name: 'Robo-Bop', nick: 'Robo-Bop', short: 'ROBO-BOP', tex: 'robot', color: 0x6ff7ff, hp: 135, xp: 110,
      intro: 'Robo-Bop beeps: "TARGET: JACK. MODE: PILLOW FIGHT."', laugh: 'Robo-Bop laughed so hard his bolts popped out. BEEP... GG.',
      moves: [{ type: 'spray', tex: 'spark', tint: [0x6ff7ff, 0xffffff], word: 'PEW PEW!', sound: 'laser', dmg: [12, 20], w: 35, log: '{a} fires the tickle laser at {d}!' },
        { type: 'rush', word: 'CLANK!', dmg: [11, 19], w: 30, log: '{a} rolls in at full speed!' },
        { type: 'roar', word: 'BEEP BOOP!', color: 0x6ff7ff, sound: 'beep', dmg: [13, 21], w: 15, log: '{a} plays the loudest BEEP in the galaxy!' },
        { type: 'dance', words: ['BEEP!', 'BOOP!'], uses: 1, w: 12, log: '{a} does the robot dance! {d} gets dizzy watching!' },
        { type: 'heal', tex: 'sparkles', amt: 22, uses: 1, w: 15, log: '{a} plugs in to recharge. Battery full!' }] },
    // v0.8: The Blips replace Polandball (the id stays 'polandball' so old saves keep their stars and stickers)
    { id: 'polandball', world: SPACE, name: 'The Blips', nick: 'Blips', short: 'THE BLIPS', tex: 'aliens', color: 0x8cff7a, hp: 145, xp: 120, scale: 1.1, plural: true,
      intro: 'The Blips wobble on each other\'s shoulders: "We come in peace! And with PILLOWS!"', laugh: 'The Blips giggled so hard they fell off each other. "Take us to your bedtime!"',
      moves: [{ type: 'throw', tex: 'planet', dmg: [13, 20], w: 35, log: 'MINI PLANET! {a} bowl a tiny planet at {d}!' },
        { type: 'hop', word: 'WOBBLE WOBBLE!', dmg: [12, 21], w: 30, log: '{a} hop over, wobble wobble!' },
        { type: 'quake', jump: 1, word: 'BEAM ME UP... OOPS!', color: 0x8cff7a, sound: 'blip', dmg: [15, 24], w: 20, uses: 2, log: '{a} try to beam up to their saucer... the beam blinks off! They land right on {d}!' },
        { type: 'shield', w: 15, log: '{a} put on bubble helmets. Next hit only does half!' },
        // the tutorial for the Mothership: one small beam, the umbrella blocks it (no dizzy, no card taken)
        { type: 'beam', charge: true, mini: true, dmg: [14, 20], uses: 1, w: 15, log: '{a} point a teeny tractor beam at {d}!' }] },
    { id: 'ghost', world: SPACE, name: 'Boo the Space Ghost', nick: 'Boo', short: 'BOO', tex: 'ghost', color: 0xd8e6ff, hp: 155, xp: 130, ghostly: true,
      intro: 'Boo floats out of a crater: "Boooo! Are you scared yet, Jack?"', laugh: 'Boo giggled so hard he turned see-through. Bye-booo!',
      moves: [{ type: 'roar', word: 'BOOOO!', color: 0xd8e6ff, sound: 'boo', dmg: [13, 22], w: 25, log: '{a} jumps out and yells BOO at {d}!' },
        { type: 'spray', tex: 'dot', tint: [0x9dff9a, 0xd8ffd0], hitTint: 0x9dff9a, word: 'SLIME!', sound: 'whoosh', dmg: [12, 20], w: 30, log: '{a} sneezes space slime at {d}!' },
        { type: 'dizzy', color: 0x9dff9a, word: 'SPOOKY...', uses: 2, w: 15, sound: 'boo', log: '{a} spins spooky circles... {d} feels wobbly!' },
        { type: 'shield', w: 20, log: '{a} turns see-through. Next hit only does half!' },
        { type: 'tickle', dmg: [6, 22], w: 20 }] },
    // v0.8: The Mothership replaces the Giant Dragon Boss (id kept for old saves; the Dragon is on holiday on her ship)
    { id: 'dragonboss', world: SPACE, name: 'The Mothership', nick: 'Mothership', short: 'MOTHERSHIP', tex: 'mothership', big: 1.15, color: 0xc6a8ff, hp: 200, xp: 180, boss: true, reward: 'ufohat',
      intro: 'The Mothership hums down from the stars: "Attention, little dragon! Your friend the Giant Dragon is on holiday on my ship. He taught me INFERNO RAIN!"',
      laugh: 'The Mothership giggled into disco lights. The Dragon waves: "Great job!"',
      // "Fire or Beam?": two charged moves, the extinguisher stops the fire, the umbrella stops the beam
      moves: [{ type: 'rain', charge: true, dmg: [24, 30], uses: 1, w: 20, log: '{a} opens the hatch... INFERNO RAIN!' },
        { type: 'beam', charge: true, dmg: [24, 30], uses: 2, usesHard: 3, w: 30, log: '{a} switches on the TRACTOR BEAM!' },
        { type: 'multi', hits: 3, dmg: [7, 11], w: 25, log: 'SAUCER SPIN! {a} whirls like a giant frisbee!' },
        { type: 'roar', word: 'WE COME IN PEACE!', color: 0xc6a8ff, sound: 'beam', dmg: [16, 24], w: 20, log: '{a} shouts "WE COME IN PEACE!" so loud the stars wobble!' },
        { type: 'spray', tex: 'spark', tint: [0xff9ed8, 0xffd23f, 0x7fd6c2, 0x9aa2ff], hitTint: 0xffd6ff, word: 'GLITTER RAY!', sound: 'laser', dmg: [15, 22], w: 15, log: '{a} zaps {d} with a sparkly glitter ray!' }] },
    // ---- World 3: CANADA (v0.8, docs/gdd/0.8-canada.md). Harder than Space: +10 pep per slot, scaling from level 6.
    { id: 'moose', world: CANADA, name: 'Max the Moose', nick: 'Max', short: 'MAX', tex: 'moose', color: 0xa0714f, hp: 145, xp: 130,
      intro: 'Max the Moose bows: "Sorry, eh! I have to pillow-fight you now. So sorry!"', laugh: 'Max laughed so hard his antlers wobbled. "Sorry for losing, eh!"',
      // Max teaches SAVE IT! before the boss: one small slapshot
      moves: [{ type: 'slapshot', charge: true, mini: true, dmg: [14, 20], uses: 1, w: 30, log: '{a} winds up a mini SLAPSHOT!' },
        { type: 'rush', word: 'ANTLERS!', dmg: [12, 21], w: 30, log: '{a} charges in antlers first... gently!' },
        { type: 'roar', word: 'SORRY, EH!', color: 0xffd9a0, sound: 'honk', dmg: [13, 21], w: 20, log: '{a} says SORRY so loud that {d} falls over!' },
        { type: 'heal', tex: 'pancakes', amt: 22, uses: 1, w: 15, log: '{a} eats a stack of pancakes with maple syrup. Yum!' }] },
    { id: 'beaver', world: CANADA, name: 'Beaver Bob', nick: 'Bob', short: 'BEAVER BOB', tex: 'beaver', color: 0xc08a5a, hp: 155, xp: 140,
      intro: 'Beaver Bob slaps his tail: "Nice pillows! I will build a dam with them."', laugh: 'Bob giggled and hid in his pillow dam. "Best game ever, eh!"',
      moves: [{ type: 'rush', word: 'TAIL SLAP!', dmg: [12, 20], w: 35, log: '{a} slaps the ice with his tail. SPLAT!' },
        { type: 'throw', tex: 'pillow', dmg: [12, 19], w: 25, log: 'PILLOW LOG! {a} rolls a fluffy log at {d}!' },
        { type: 'spray', tex: 'feather', word: 'CHOMP CHOMP!', sound: 'chomp', dmg: [11, 19], w: 25, log: '{a} chews a pillow and sprays fluff at {d}!' },
        { type: 'shield', w: 20, log: '{a} builds a pillow dam. Next hit only does half!' }] },
    { id: 'mountie', world: CANADA, name: 'Mountie Bear', nick: 'Mountie Bear', short: 'MOUNTIE BEAR', tex: 'bear', color: 0xd94a3d, hp: 165, xp: 150,
      intro: 'Mountie Bear tips his hat: "Pillow fight rules: no biting, no crying, always say sorry!"', laugh: 'Mountie Bear laughed and gave himself a ticket for being too ticklish.',
      moves: [{ type: 'rush', word: 'BEAR HUG!', dmg: [13, 21], w: 30, log: '{a} gives {d} a big squishy BEAR HUG!' },
        { type: 'volley', tex: 'snowball', word: 'SNOWBALL FIGHT!', sound: 'whoosh', dmg: [12, 20], w: 25, log: '{a} starts a SNOWBALL FIGHT!' },
        { type: 'dizzy', color: 0xffb347, word: 'STICKY!', sound: 'gulp', uses: 1, w: 15, log: '{a} pours maple syrup! {d} is all sticky!' },
        { type: 'roar', word: 'PARDON ME!', color: 0xff6b5b, sound: 'roar', dmg: [13, 21], w: 20, log: '{a} roars very politely. Still loud!' },
        { type: 'heal', tex: 'i:honey', amt: 25, uses: 1, w: 10, log: '{a} has a honey snack. Bears love honey!' }] },
    { id: 'sasquatch', world: CANADA, name: 'Sasquatch', nick: 'Sasquatch', short: 'SASQUATCH', tex: 'sasquatch', big: 1.15, color: 0x9c6b4a, hp: 210, xp: 200, boss: true, reward: 'toque',
      intro: 'Sasquatch peeks out from behind a pine tree: "H-hello... do you want to play hockey? I shoot REALLY hard."',
      laugh: 'Sasquatch giggled so hard the snow fell off the trees. "You are my best friend now!"',
      moves: [{ type: 'slapshot', charge: true, dmg: [26, 32], uses: 2, usesHard: 3, w: 35, log: '{a} shoots the hardest SLAPSHOT in the North!' },
        { type: 'quake', word: 'AVALANCHE!', sound: 'stomp', dmg: [16, 24], w: 25, log: '{a} stomps his giant feet. AVALANCHE!' },
        { type: 'volley', tex: 'snowball', word: 'SNOWBALLS!', sound: 'whoosh', dmg: [16, 24], w: 20, log: '{a} throws a mountain of snowballs at {d}!' },
        { type: 'roar', word: 'HELLO FRIEND!', color: 0xc9a27a, sound: 'roar', dmg: [15, 23], w: 20, log: '{a} waves and yells HELLO so loud the snow falls off the trees!' }] },
  ].concat(EVENT_ON ? [
    // ---- Halloween event world: SPOOKY (open from the start while the event runs)
    { id: 'pumpkin', world: SPOOKY, event: true, name: 'Pumpkin Pete', nick: 'Pete', short: 'PUMPKIN PETE', tex: 'pumpkin', color: C.orange, hp: 110, xp: 50, reward: 'pumpkin',
      intro: 'Pumpkin Pete grins: "Trick or treat... or PILLOW FIGHT!"', laugh: 'Pete laughed so hard his candle went out. Happy Halloween!',
      moves: [{ type: 'throw', tex: 'pumpkin', dmg: [11, 19], w: 35, log: 'PUMPKIN TOSS! {a} throws a mini pumpkin at {d}!' },
        { type: 'spray', tex: 'j:candy', word: 'CANDY STORM!', sound: 'whoosh', dmg: [10, 18], w: 30, log: '{a} throws a handful of candy at {d}!' },
        { type: 'roar', word: 'MWAHAHA!', color: 0xff8a3d, sound: 'roar', dmg: [13, 20], w: 20, log: '{a} does his spookiest laugh!' },
        { type: 'heal', tex: 'lollipop', amt: 20, uses: 1, w: 15, log: '{a} licks a lollipop. Sugar power!' }] },
    { id: 'batty', world: SPOOKY, event: true, name: 'Batty the Bat', nick: 'Batty', short: 'BATTY', tex: 'bat', color: 0x9a7bd6, hp: 125, xp: 60, reward: 'tophat',
      intro: 'Batty hangs upside down: "Hey Jack, you nap like me!"', laugh: 'Batty giggled and flew loop-de-loops. Bye!',
      moves: [{ type: 'hop', word: 'FLAP FLAP!', dmg: [11, 19], w: 35, log: '{a} swoops down on {d}!' },
        { type: 'dizzy', color: 0x9a7bd6, word: 'SONAR!', uses: 2, w: 15, sound: 'laser', log: '{a} squeaks a sonar song... {d} gets dizzy!' },
        { type: 'nap', amt: 25, uses: 1, w: 15, log: '{a} hangs upside down for a power nap!' },
        { type: 'roar', word: 'EEEEK!', color: 0xd8c2ff, sound: 'tickle', dmg: [12, 20], w: 25, log: '{a} squeaks super loud!' }] },
    { id: 'webster', world: SPOOKY, event: true, name: 'Webster the Spider', nick: 'Webster', short: 'WEBSTER', tex: 'spider', color: 0x7fd6c2, hp: 140, xp: 70, reward: 'witchhat',
      intro: 'Webster waves all eight legs: "Eight legs = eight tickles!"', laugh: 'Webster got tangled in his own web laughing.',
      moves: [{ type: 'dizzy', tex: 'web', color: 0xffffff, word: 'STUCK!', uses: 2, w: 20, sound: 'whoosh', log: '{a} throws a sticky web! {d} is stuck!' },
        { type: 'multi', hits: 4, dmg: [4, 7], w: 30, log: 'EIGHT-LEG TICKLE! {a} tickles {d} again and again!' },
        { type: 'tickle', dmg: [6, 24], w: 25 },
        { type: 'shield', w: 15, log: '{a} hides in a web hammock. Next hit only does half!' }] },
    { id: 'fang', world: SPOOKY, event: true, name: 'Count Fang', nick: 'Count Fang', short: 'COUNT FANG', tex: 'vampire', color: 0xff6b5b, hp: 175, xp: 120, boss: true, reward: 'bat',
      intro: 'Count Fang swirls his cape: "I vant to... tickle your toes!"', laugh: 'Count Fang laughed until sunrise. Jack is the King of Halloween!',
      moves: [{ type: 'volley', tex: 'bat', dmg: [13, 21], word: 'BAT ATTACK!', sound: 'laser', w: 30, log: '{a} sends a flock of bats at {d}!' },
        { type: 'dizzy', color: 0xff6b5b, word: 'HYPNO STARE', uses: 2, w: 15, sound: 'boo', log: '{a} gives {d} the hypno stare...' },
        { type: 'shield', w: 15, log: '{a} hides behind his cape. Next hit only does half!' },
        { type: 'heal', tex: 'j:chocolate', amt: 25, uses: 1, w: 10, log: '{a} snacks on Halloween chocolate.' },
        { type: 'roar', word: 'BLAH BLAH!', color: 0xff6b5b, sound: 'boo', dmg: [14, 22], w: 20, log: '{a} says BLAH so loud the bats fly away!' }] },
  ] : []);
  // costumes: Halloween hats (SPOOKY rivals), one hat per world boss, the Royal Crown (Superstar sticker; old Dragon Boss winners keep it)
  const COSTUMES = [
    { id: 'none', name: 'No hat' },
    { id: 'owlhat', name: 'Owl Hat', tex: 'owl', w: 0.38, tint: 0x8fe39a },
    { id: 'ufohat', name: 'UFO Hat', tex: 'ufo', w: 0.5 },
    { id: 'bat', name: 'Bat Hat', tex: 'bat', w: 0.5 },
    { id: 'toque', name: 'Canada Toque', tex: 'toque', w: 0.46 },
    { id: 'pumpkin', name: 'Pumpkin Hat', tex: 'pumpkin', w: 0.42 },
    { id: 'tophat', name: 'Top Hat', tex: 'tophat', w: 0.45 },
    { id: 'witchhat', name: 'Witch Hat', tex: 'witchhat', w: 0.55 },
    { id: 'crown', name: 'Royal Crown', tex: 'crown', w: 0.45 },
  ];
  // a costume image (with its tint) for the title, the duel and the Me screen
  const hatImage = (scene, x, y, c) => { const h = scene.add.image(x, y, c.tex); if (c.tint) h.setTint(c.tint); return h; };
  // the weekly co-op boss (only when online, see js/net.js)
  const KRAKEN = { id: 'kraken', name: 'Pillow Kraken', nick: 'Kraken', short: 'PILLOW KRAKEN', tex: 'kraken', color: 0xff9ed8, hp: 220, xp: 60, boss: true, big: 1.1,
    intro: 'The Pillow Kraken rises from the blanket sea! Everyone hits it together this week!', laugh: 'The Kraken giggles and sinks back into the blanket sea... for now!',
    moves: [{ type: 'multi', hits: 4, dmg: [5, 9], w: 30, log: 'TENTACLE TICKLES! {a} tickles {d} with four arms!' },
      { type: 'spray', tex: 'dot', tint: [0x3b2a6e, 0x6a4fb0], word: 'INK!', sound: 'whoosh', dmg: [12, 20], w: 25, log: '{a} squirts pillow ink at {d}!' },
      { type: 'tickle', dmg: [8, 26], w: 25 },
      { type: 'roar', word: 'BLUB BLUB!', color: 0xff9ed8, sound: 'boo', dmg: [13, 21], w: 20, log: '{a} bubbles a giant BLUB!' }] };
  const DEF_W = { throw: 30, rush: 30, hop: 30, multi: 25, roar: 20, quake: 25, spray: 25, tickle: 25, volley: 25, rain: 30, beam: 30, slapshot: 30, heal: 15, nap: 15, shield: 15, dizzy: 15, dance: 12 };
  const isUnlocked = i => i === 0 || (RIVALS[i].event && !RIVALS[i - 1].event) || (Save.data.stars[RIVALS[i - 1].id] || 0) > 0;
  const worldOf = i => RIVALS[i] && RIVALS[i].world || 0;
  const worldOpen = w => RIVALS.some((r, i) => (r.world || 0) === w && isUnlocked(i));
  // event rivals are always open, so they don't count as progress (QA B04)
  const furthest = () => { let c = 0; RIVALS.forEach((r, i) => { if (!r.event && isUnlocked(i)) c = i; }); return c; };
  const totalStars = () => RIVALS.reduce((s, r) => s + (Save.data.stars[r.id] || 0), 0);
  const toyById = id => Save.data.toys.find(t => t.id === id);
  const elColor = t => (TOYS.ELEMENTS[t.element] || TOYS.ELEMENTS.magic).color;
  function jackDef() {
    const lv = levelOf(Save.data.xp).l;
    return { id: 'jack', name: 'Jack', short: 'JACK', tex: 'jack_side', napTex: 'jack_upside', color: C.mint, hp: 100, isJack: true,
      moves: MOVES.filter(m => m.lvl <= lv).map(m => Object.assign({}, m)) };
  }
  function toyDef(t) {
    return { id: t.id, name: t.name, short: t.name.toUpperCase(), tex: 'toy_' + t.id, color: elColor(t), hp: t.hp, isToy: true, toy: t,
      moves: TOYS.makeKit(t), intro: t.name + ' wiggles: "Let\'s play!"', laugh: t.name + ' giggled so hard they gave up.' };
  }
  function heroDef(scene) {
    const t = Save.data.hero !== 'jack' && toyById(Save.data.hero);
    if (t && scene.textures.exists('toy_' + t.id)) return toyDef(t);
    return jackDef();
  }
  function fade(scene, key, data) {
    if (scene._leaving) return; scene._leaving = true;
    // the first trip to Canada starts with the comic (#31); the comic then goes on to where the player was heading
    if (key === 'battle' && data && RIVALS[data.rival] && RIVALS[data.rival].world === CANADA && comicDue()) { data = { world: 'canada', then: { key, data } }; key = 'comic'; }
    scene.cameras.main.fadeOut(320, 15, 18, 64);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
      // the screen was rotated while we couldn't rebuild (e.g. in the toy studio): rebuild now, straight into the next scene
      const v = viewSize();
      if ((v.h > v.w) !== PORTRAIT && window.__psRebuild) window.__psRebuild({ key, data: data || {} });
      else scene.scene.start(key, data);
    });
  }
  function backButton(scene, cb) {
    const c = scene.add.container(80, 80).setDepth(50);
    const bg = scene.add.circle(0, 0, 46, C.night2).setStrokeStyle(4, C.seam);
    const g = scene.add.graphics(); g.lineStyle(9, 0xfff3d2); g.beginPath(); g.moveTo(10, -20); g.lineTo(-12, 0); g.lineTo(10, 20); g.strokePath();
    c.add([bg, g]); c.setSize(100, 100).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => { A.init(); A.click(); cb(); });
    return c;
  }
  function starRow(scene, x, y, n, size, gap) {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const s = scene.add.image(x + (i - 1) * gap, y - (i === 1 ? size * 0.12 : 0), 'star').setScale(size / 224);
      if (i >= n) s.setTint(0x3a3f7a).setAlpha(0.9);
      out.push(s);
    }
    return out;
  }
  function panel(scene, x, y, w, h, color = C.night2, depth = 61) {
    const g = scene.add.graphics().setDepth(depth);
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - w / 2, y - h / 2 + 16, w, h, 56);
    g.fillStyle(color); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 56);
    g.lineStyle(6, C.seam); g.strokeRoundedRect(x - w / 2 + 16, y - h / 2 + 16, w - 32, h - 32, 44);
    return g;
  }
  function chip(scene, x, y, label, color, size = 30) {
    const t = txt(scene, 0, 0, label, size, C.ink, { st: 0, shadow: false });
    const w = t.width + 44, h = size + 26;
    const g = scene.add.graphics(); g.fillStyle(color); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const c = scene.add.container(x, y, [g, t]); c.w = w; return c;
  }
  // a toy picture (texture) fitted into a box
  function fitImage(scene, x, y, key, boxW, boxH) {
    const im = scene.add.image(x, y, key);
    im.setScale(Math.min(boxW / im.width, boxH / im.height));
    return im;
  }

  // round capsule-machine button with a badge (map)
  function capsuleButton(scene, x, y, world) {
    const c = scene.add.container(x, y).setDepth(50);
    const n = Save.data.caps + (Save.data.goldCaps || 0);
    c.add(scene.add.circle(0, 0, 46, n ? C.coral : C.night2).setStrokeStyle(4, n ? 0xffffff : C.seam));
    const g = scene.add.graphics(); drawCapsule(g, 0, 0, 28, 0xffd23f); c.add(g);
    if (n) {
      c.add(scene.add.circle(32, -32, 22, C.star).setStrokeStyle(3, 0x0f1240));
      c.add(txt(scene, 32, -32, String(n), 26, C.ink, { st: 0, shadow: false }));
      scene.tweens.add({ targets: c, scale: 1.1, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    c.setSize(100, 100).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => { A.init(); A.click(); fade(scene, 'gacha', { world }); });
    return c;
  }
  // a two-tone capsule: coloured top, cream bottom
  function drawCapsule(g, x, y, r, color) {
    g.fillStyle(0x0f1240, 0.35); g.fillCircle(x + 3, y + 5, r);
    g.fillStyle(0xfff3d2); g.fillCircle(x, y, r);
    g.fillStyle(color); g.slice(x, y, r, Math.PI, 0, false); g.fillPath();
    g.lineStyle(Math.max(2, r / 9), 0x0f1240, 0.8); g.strokeCircle(x, y, r); g.lineBetween(x - r, y, x + r, y);
    g.fillStyle(0xffffff, 0.55); g.fillEllipse(x - r * 0.35, y - r * 0.5, r * 0.5, r * 0.28);
  }

  // ---------- Title
  class Title extends Phaser.Scene {
    constructor() { super('title'); }
    create() {
      this._leaving = false;
      this.cameras.main.fadeIn(400, 15, 18, 64);
      sky(this, EVENT_ON ? SPOOKY : 0);
      bottomGround(this, EVENT_ON ? 'ground3' : 'ground', PORTRAIT ? 0.55 : 0.6);
      const moon = this.add.image(PORTRAIT ? W * 0.82 : W * 0.84, PORTRAIT ? 300 : H * 0.2, 'moon').setScale(PORTRAIT ? 0.9 : 1.3);
      if (EVENT_ON) moon.setTint(0xffa64d);
      this.tweens.add({ targets: moon, angle: 8, y: moon.y + 14, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const ly = PORTRAIT ? 300 : H * 0.16, fs = PORTRAIT ? 140 : 170;
      const word = (str, y, size, color, d0) => {
        const letters = str.split(''); const sp = size * 0.72; const x0 = W / 2 - (letters.length - 1) * sp / 2;
        letters.forEach((ch, i) => {
          const t = txt(this, x0 + i * sp, y - 300, ch, size, color, { stroke: '#0f1240', st: Math.round(size / 6) });
          this.tweens.add({ targets: t, y, duration: 700, delay: d0 + i * 60, ease: 'Bounce.out' });
          this.tweens.add({ targets: t, y: y - 14, duration: 1200, delay: 1600 + i * 110, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        });
      };
      word('PLUSH', ly, fs, '#fff3d2', 100);
      word('SQUAD', ly + fs * 1.07, fs, EVENT_ON ? '#ff8a3d' : '#ffd23f', 450);
      if (EVENT_ON) {
        const pk = this.add.image(W / 2 + fs * 2.1, ly + fs * 1.07, 'pumpkin').setScale(fs / 300).setAngle(12);
        this.tweens.add({ targets: pk, angle: -8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
      // hero
      const jy = PORTRAIT ? H - 330 : H * 0.95;
      // portrait: logo, level panel and Jack share the height evenly; Jack grows on tall phones (QA B44 / #45)
      const logoBot = ly + fs * 1.07 + fs * 0.55, avail = jy - logoBot;
      const hatOn = COSTUMES.some(c => c.id === Save.data.costume && c.tex);
      const hMax = PORTRAIT ? clamp(avail - 190 - 120 - (hatOn ? 230 : 0), hatOn ? 280 : 380, 800) : 425; // small iPads with a hat: Jack shrinks a bit (QA B55)
      const sh = this.add.image(W / 2, jy + 6, 'shadow').setScale(1.3, 1);
      const hero = heroDef(this);
      const heroKey = hero.isJack ? 'jack_front' : hero.tex;
      const jack = this.add.image(W / 2, jy, heroKey).setOrigin(0.5, 1);
      jack.setScale(Math.min(hMax / jack.height, (PORTRAIT ? 600 : 520) / jack.width));
      const hc = COSTUMES.find(c => c.id === Save.data.costume);
      let hat = null;
      if (hc && hc.tex) { hat = hatImage(this, W / 2, jy - jack.displayHeight * 0.96, hc).setOrigin(0.5, 0.85); hat.setScale(jack.displayWidth * hc.w / hat.width).setAngle(-6); }
      this.tweens.add({ targets: [jack].concat(hat ? [hat] : []), y: '-=34', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: sh, scaleX: 1.05, alpha: 0.6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.add.particles(0, 0, 'spark', { x: { min: W / 2 - 300, max: W / 2 + 300 }, y: { min: jy - hMax, max: jy - 60 }, lifespan: 1200, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 220, tint: [C.star, 0xffffff, C.mint], rotate: { min: 0, max: 90 } }).setDepth(-0.5);
      // level panel
      const lv = levelOf(Save.data.xp);
      // the hat sticks up above Jack's head and he bobs 34 px: keep both clear of the panel (code review)
      const gap = Math.max(24, (avail - 190 - jack.displayHeight - (hat ? hat.displayHeight * 0.85 : 0) - 34) / 2);
      const px = PORTRAIT ? W / 2 : 420, py = PORTRAIT ? logoBot + gap + 95 : H * 0.7;
      const pg = this.add.graphics(); pg.fillStyle(C.night2, 0.9); pg.fillRoundedRect(px - 210, py - 95, 420, 190, 40); pg.lineStyle(4, C.seam); pg.strokeRoundedRect(px - 210, py - 95, 420, 190, 40);
      txt(this, px, py - 46, 'LEVEL ' + lv.l, 50, '#ffd23f', { st: 0 });
      this.add.rectangle(px, py + 10, 320, 26, C.night3).setStrokeStyle(3, C.seam);
      this.add.rectangle(px - 160, py + 10, Math.max(6, 320 * lv.r / lv.n), 20, C.star).setOrigin(0, 0.5);
      txt(this, px, py + 48, lv.r + ' / ' + lv.n + ' XP', 26, '#bcc0ee', { st: 0, shadow: false, weight: '500' });
      this.add.image(px - 40, py + 78, 'star').setScale(0.12);
      txt(this, px + 10, py + 78, totalStars() + ' / ' + RIVALS.length * 3, 26, '#fff3d2', { st: 0, shadow: false, ox: 0 });
      // play buttons
      const bx = PORTRAIT ? W / 2 : W - 330, byy = PORTRAIT ? H - 230 : H * 0.6;
      const tp = button(this, bx, byy, PORTRAIT ? 640 : 500, PORTRAIT ? 140 : 150, 'TAP TO PLAY', C.star, () => this.go(), { size: 60 });
      this.tweens.add({ targets: tp, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      button(this, bx, byy + (PORTRAIT ? 135 : 150), PORTRAIT ? 480 : 420, PORTRAIT ? 92 : 100, '+ ADD A TOY', C.cream, () => { A.init(); A.startMusic(); fade(this, 'studio'); }, { size: 40 });
      // menu from plugins: Me, Friends, Album, Quests, Parents...
      const nav = [].concat(...PLUGINS.map(p => p.nav || [])).sort((a, b) => (a.order || 9) - (b.order || 9));
      nav.forEach((it, i) => {
        const x = PORTRAIT ? 90 + i * Math.min(170, (W - 300) / Math.max(1, nav.length - 1)) : 90, y = PORTRAIT ? 85 : 85 + i * 112;
        const c = this.add.container(x, y).setDepth(50);
        c.add(this.add.circle(0, 0, 46, it.color || C.night2).setStrokeStyle(4, C.seam));
        const ic = img(this, 0, 0, typeof it.icon === 'function' ? it.icon(PS) : it.icon); ic.setScale(iconScale(ic.texture.key === 'icons2' || ic.texture.key === 'icons' ? 'j:x' : ic.texture.key, 62)); c.add(ic);
        c.add(txt(this, PORTRAIT ? 0 : 64, PORTRAIT ? 66 : 0, typeof it.label === 'function' ? it.label(PS) : it.label, 24, '#fff3d2', { st: 5, ox: PORTRAIT ? 0.5 : 0 }));
        const n = it.badge ? it.badge(PS) : 0;
        if (n) { c.add(this.add.circle(32, -32, 20, C.coral).setStrokeStyle(3, 0x0f1240)); c.add(txt(this, 32, -32, n > 9 ? '9+' : String(n), 22, '#ffffff', { st: 0, shadow: false })); }
        c.setSize(100, 100).setInteractive({ useHandCursor: true });
        c.on('pointerup', () => { A.init(); A.click(); A.startMusic(); fade(this, it.key, it.data || {}); });
      });
      muteButton(this);
      txt(this, 24, H - 26, 'v' + VERSION, 24, '#6a72d6', { ox: 0, st: 0, shadow: false, weight: '500' });
      this.input.keyboard && this.input.keyboard.once('keydown-SPACE', () => this.go());
    }
    go() { A.init(); A.startMusic(); A.whoosh(); fade(this, 'map'); }
  }

  // ---------- Map: choose a world + rival
  class MapScene extends Phaser.Scene {
    constructor() { super('map'); }
    init(data) {
      const last = Save.data.lastWorld;
      this.world = data && data.world != null ? data.world : (last != null && WORLDS[last] && worldOpen(last) ? last : worldOf(furthest()));
      if (!worldOpen(this.world)) this.world = 0;
    }
    create() {
      this._leaving = false;
      if (this.world === CANADA && comicDue()) { this.scene.start('comic', { world: 'canada', then: { key: 'map', data: { world: CANADA } } }); return; }
      if (Save.data.lastWorld !== this.world) { Save.data.lastWorld = this.world; Save.store(); }
      const wd = this.world;
      this.cameras.main.fadeIn(350, 15, 18, 64);
      sky(this, wd);
      bottomGround(this, groundKey(wd), PORTRAIT ? 0.45 : 0.5, 0.8);
      // world tabs (landscape keeps room for back, mute and the capsule button: QA B51; names that would be squeezed become icon-only tabs: QA B52)
      const ty = PORTRAIT ? 190 : 95, room = PORTRAIT ? W - 60 : W - 600, n = WORLDS.length, tw0 = Math.min(PORTRAIT ? 420 : 440, room / n - 30);
      // 4 worlds (Canada + the October event): names do not fit any more, so only the open tab is wide with its name,
      // the others show just their icon
      const wide = tw0 - 140 < 230, tws = WORLDS.map((w, i) => !wide ? tw0 : i === this.world ? Math.min(400, (room - 30 * (n - 1)) * 2 / (n + 1)) : Math.min(200, (room - 30 * (n - 1)) / (n + 1)));
      let tx0 = W / 2 - (tws.reduce((a, b) => a + b, 0) + 30 * (n - 1)) / 2;
      WORLDS.forEach((w, i) => { this.tab(w, i, tx0 + tws[i] / 2, ty, tws[i], wide && i !== this.world); tx0 += tws[i] + 30; });
      const lv = levelOf(Save.data.xp);
      txt(this, W / 2, PORTRAIT ? 285 : 180, 'Level ' + lv.l + '  ·  ★ ' + totalStars() + ' / ' + RIVALS.length * 3, 34, '#ffd23f', { st: 6 });
      // portrait: fit the 4 nodes between the difficulty switch and the bottom buttons (short phones shrink the nodes)
      let pts; this.ns = 1;
      if (PORTRAIT) {
        const yTopLim = 430, yBotLim = H - 110 - 55 - 24;
        let s = 1;
        for (let k = 0; k < 3; k++) {
          const yTop = yTopLim + (130 + 60) * s, yBot = yBotLim - (110 + 140) * s;
          s = clamp(2 * (yBot - yTop) / 3 / (220 + 140 + 40), 0.6, 1);
          pts = [[0.3, yBot], [0.7, yBot - (yBot - yTop) / 3], [0.3, yBot - 2 * (yBot - yTop) / 3], [0.66, yTop]].map(([x, y]) => [W * x, y]);
        }
        this.ns = s;
      } else pts = [[0.14, 0.6], [0.37, 0.37], [0.61, 0.6], [0.85, 0.37]].map(([x, y]) => [W * x, H * y]);
      const idx = RIVALS.map((r, i) => i).filter(i => worldOf(i) === wd);
      const g = this.add.graphics(); g.lineStyle(10, 0xfff3d2, 0.55);
      for (let i = 0; i < idx.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; const n = 14;
        for (let k = 0; k < n; k += 2) {
          const t1 = k / n, t2 = (k + 1) / n;
          const bx = (t) => x1 + (x2 - x1) * t, by = (t) => y1 + (y2 - y1) * t - Math.sin(Math.PI * t) * 60;
          g.lineBetween(bx(t1), by(t1), bx(t2), by(t2));
        }
      }
      let current = 0;
      idx.forEach((ri, k) => { if (isUnlocked(ri)) current = k; });
      idx.forEach((ri, k) => this.node(RIVALS[ri], ri, pts[k][0], pts[k][1], isUnlocked(ri), k === current));
      // hero marker at the furthest open node of this world
      const hero = heroDef(this);
      const [cx, cy] = pts[current];
      const nr = (RIVALS[idx[current]].boss ? 130 : 110) * this.ns, off = nr + 80 * this.ns;
      const j = this.add.image(cx - off < 90 ? cx + off : cx - off, cy + 40 * this.ns, hero.tex).setOrigin(0.5, 1).setDepth(5);
      j.setScale(Math.min(150 / j.height, 150 / j.width) * this.ns);
      this.tweens.add({ targets: j, y: j.y - 20, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      // squad + mini-game buttons
      const by = PORTRAIT ? H - 110 : H - 90;
      const sq = button(this, PORTRAIT ? W * 0.73 : W - 200, by, 330, 110, 'MY SQUAD', C.cream, () => fade(this, 'squad'), { size: 44 });
      const face = this.add.image(-125, 0, hero.isJack ? 'jack_front' : hero.tex); face.setScale(Math.min(84 / face.height, 84 / face.width));
      sq.add(face); sq.list[1].x = 25;
      // Canada after the first win over Beaver Bob: Pond Hockey instead of Star Catch
      const hk = wd === CANADA && hockeyOpen();
      const mg = button(this, PORTRAIT ? W * 0.27 : 220, by, 360, 110, hk ? 'POND HOCKEY' : 'STAR CATCH', C.mint, () => fade(this, hk ? 'hockey' : 'catch', { world: wd }), { size: 42 });
      if (hk) fit(mg.list[1], 230);
      const st = this.add.image(-140, 0, hk ? 'puck' : 'star').setScale(hk ? 0.8 : 0.36); mg.add(st); mg.list[1].x = 28;
      this.tweens.add({ targets: st, angle: 360, duration: 4000, repeat: -1 });
      this.diffSwitch(W / 2, PORTRAIT ? 370 : H - 90);
      let cbtn = capsuleButton(this, W - 200, 80, wd);
      backButton(this, () => fade(this, 'title'));
      muteButton(this);
      if (dailyCapsule()) this.time.delayedCall(700, () => {
        cbtn.destroy(); cbtn = capsuleButton(this, W - 200, 80, wd);
        this.hint('Daily gift: +1 capsule! Tap the capsule button'); A.levelUp();
        this.tweens.add({ targets: cbtn, angle: { from: -20, to: 20 }, duration: 120, yoyo: true, repeat: 5, onComplete: () => cbtn.setAngle(0) });
      });
    }
    // EASY / NORMAL / HARD switch (saved for all duels)
    diffSwitch(x, y) {
      const keys = ['easy', 'normal', 'hard'], bw = 190, bh = 76;
      const c = this.add.container(x, y).setDepth(6);
      const bg = this.add.graphics(); bg.fillStyle(0x000000, 0.3); bg.fillRoundedRect(-bw * 1.5 - 10, -bh / 2 - 2, bw * 3 + 20, bh + 14, bh / 2 + 6);
      bg.fillStyle(0x161946); bg.fillRoundedRect(-bw * 1.5 - 10, -bh / 2 - 8, bw * 3 + 20, bh + 16, bh / 2 + 8); c.add(bg);
      const pills = keys.map((k, i) => {
        const D = DIFFS[k], px = (i - 1) * bw;
        const g = this.add.graphics(), t = txt(this, px, 0, D.name, 30, '#fff3d2', { st: 0, shadow: false });
        const z = this.add.zone(px, 0, bw, bh).setInteractive({ useHandCursor: true });
        z.on('pointerup', () => { A.init(); A.click(); Save.data.diff = k; Save.store(); draw(); this.tweens.add({ targets: c, scale: { from: 1.06, to: 1 }, duration: 200 }); });
        c.add([g, t, z]);
        return { k, g, t, px, D };
      });
      const draw = () => pills.forEach(p => {
        const on = Save.data.diff === p.k; p.g.clear();
        if (on) { p.g.fillStyle(p.D.color); p.g.fillRoundedRect(p.px - bw / 2 + 4, -bh / 2, bw - 8, bh, bh / 2); }
        p.t.setColor(on ? C.ink : '#8a8fd6');
      });
      draw();
      return c;
    }
    tab(w, i, x, y, tw0, iconOnly) {
      const open = worldOpen(i), on = i === this.world, h = 96;
      const c = this.add.container(x, y).setDepth(6);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-tw0 / 2, -h / 2 + 8, tw0, h, h / 2);
      g.fillStyle(on ? C.star : (open ? C.night2 : 0x161946)); g.fillRoundedRect(-tw0 / 2, -h / 2, tw0, h, h / 2);
      g.lineStyle(5, on ? 0xffffff : C.seam); g.strokeRoundedRect(-tw0 / 2, -h / 2, tw0, h, h / 2);
      const ic = this.add.image(iconOnly ? 0 : -tw0 / 2 + 58, 0, open ? w.icon : 'lock'); ic.setScale(70 / Math.max(ic.width, ic.height));
      const t = fit(txt(this, 26, 0, open ? w.name : '???', 40, on ? C.ink : (open ? '#fff3d2' : '#8a8fd6'), { st: 0, shadow: false }), tw0 - 140).setVisible(!iconOnly);
      c.add([g, ic, t]);
      c.setSize(tw0, h).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        A.init();
        if (!open) { A.block(); this.tweens.add({ targets: c, x: x + 12, duration: 60, yoyo: true, repeat: 3 }); const fi = RIVALS.findIndex(r => (r.world || 0) === i); this.hint(fi > 0 ? 'Beat ' + RIVALS[fi - 1].name + ' to open ' + w.name + '!' : 'Locked!'); return; }
        if (on) { if (i === CANADA) fade(this, 'comic', { world: 'canada', then: { key: 'map', data: { world: CANADA } } }); return; } // replay the comic
        A.click(); A.whoosh(); fade(this, 'map', { world: i });
      });
    }
    hint(s) {
      if (this._hint) this._hint.destroy();
      const t = this._hint = txt(this, W / 2, PORTRAIT ? 470 : 250, s, 36, '#ff9ed8', { st: 7 }).setDepth(70);
      this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 500, onComplete: () => t.destroy() });
    }
    node(r, i, x, y, open, current) {
      const R = r.boss ? 130 : 110;
      const ns = this.ns || 1;
      const c = this.add.container(x, y).setDepth(4).setScale(ns);
      const g = this.add.graphics();
      const stars = Save.data.stars[r.id] || 0;
      g.fillStyle(0x000000, 0.3); g.fillCircle(0, 12, R);
      g.fillStyle(open ? C.night2 : 0x161946); g.fillCircle(0, 0, R);
      g.lineStyle(8, stars > 0 ? C.star : (open ? C.cream : C.seam)); g.strokeCircle(0, 0, R);
      const im = this.add.image(0, 8, r.tex); im.setScale((R * 1.55) / Math.max(im.width, im.height));
      c.add([g, im]);
      if (r.boss && !r.ownCrown) c.add(this.add.image(0, -R - 10, 'crown').setScale(0.42));
      if (!open) { im.setTint(0x000000).setAlpha(0.75); c.add(this.add.image(0, 10, 'lock').setScale(0.42)); }
      c.add(fit(txt(this, 0, R + 46, open ? r.name : '???', 38, open ? '#fff3d2' : '#8a8fd6', { st: 7 }), 420));
      if (open) c.add(starRow(this, 0, R + 104, stars, 64, 70));
      if (current && open) {
        this.tweens.add({ targets: c, scale: 1.07 * ns, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        const ring = this.add.image(x, y, 'ring').setScale(R * ns / 52).setTint(C.star).setDepth(3).setAlpha(0.6);
        this.tweens.add({ targets: ring, scale: R * ns / 40, alpha: 0, duration: 1300, repeat: -1 });
      }
      c.setSize(R * 2, R * 2 + 120).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        A.init();
        if (!open) { A.block(); this.tweens.add({ targets: c, x: x + 14, duration: 60, yoyo: true, repeat: 3 }); if (i > 0) this.hint('Beat ' + RIVALS[i - 1].name + ' first!'); return; }
        A.click(); A.whoosh(); fade(this, 'battle', { rival: i });
      });
    }
  }

  // ---------- Squad: your toys
  class SquadScene extends Phaser.Scene {
    constructor() { super('squad'); }
    init(data) { this.focus = data && data.focus; }
    create() {
      this._leaving = false;
      this.cameras.main.fadeIn(350, 15, 18, 64);
      sky(this);
      txt(this, W / 2, PORTRAIT ? 190 : 95, 'MY SQUAD', PORTRAIT ? 80 : 72, '#fff3d2', { stroke: '#0f1240', st: 12 });
      txt(this, W / 2, PORTRAIT ? 270 : 165, 'Tap a toy to play as it or to duel it', 32, '#bcc0ee', { st: 5, weight: '500' });
      const items = [{ jack: true }].concat(Save.data.toys.map(t => ({ toy: t }))).concat(Save.data.toys.length < 14 ? [{ add: true }] : []);
      const cols = PORTRAIT ? 3 : Math.min(5, Math.max(4, Math.floor((W - 120) / 300)));
      const cw = PORTRAIT ? 310 : Math.min(290, (W - 160) / cols - 20), ch = PORTRAIT ? 330 : 270;
      const top = PORTRAIT ? 360 : 225;
      items.forEach((it, i) => {
        const x = W / 2 + ((i % cols) - (cols - 1) / 2) * (cw + 22), y = top + ch / 2 + Math.floor(i / cols) * (ch + 22);
        this.card(it, x, y, cw, ch, i);
      });
      backButton(this, () => fade(this, 'map'));
      muteButton(this);
      if (this.focus) { const t = toyById(this.focus); if (t) this.time.delayedCall(450, () => this.details({ toy: t })); }
    }
    card(it, x, y, w, h, i) {
      const c = this.add.container(x, y).setDepth(5);
      const g = this.add.graphics();
      const isHero = it.jack ? Save.data.hero === 'jack' || !toyById(Save.data.hero) : Save.data.hero === (it.toy && it.toy.id);
      const col = it.add ? 0x1b1f5a : C.night2;
      g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, 36);
      g.fillStyle(col); g.fillRoundedRect(-w / 2, -h / 2, w, h, 36);
      g.lineStyle(it.add ? 5 : 6, isHero ? C.star : C.seam); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 36);
      c.add(g);
      if (it.add) {
        const plus = txt(this, 0, -30, '+', 120, '#ffd23f', { st: 10 });
        c.add([plus, img(this, 50, -70, 'i:camera').setScale(0.5), txt(this, 0, h / 2 - 50, 'NEW TOY', 36, '#fff3d2', { st: 6 })]);
        this.tweens.add({ targets: plus, scale: 1.12, duration: 700, yoyo: true, repeat: -1 });
      } else {
        const key = it.jack ? 'jack_front' : 'toy_' + it.toy.id;
        if (this.textures.exists(key)) c.add(fitImage(this, 0, -22, key, w - 60, h - 110));
        const name = it.jack ? 'Jack' : it.toy.name;
        c.add(fit(txt(this, 0, h / 2 - 46, name, 36, '#fff3d2', { st: 6 }), w - 30));
        if (!it.jack) { const a = TOYS.ARCH_BY_ID[it.toy.arch]; if (a) c.add(img(this, w / 2 - 36, -h / 2 + 36, 'i:' + (a.id === 'mystery' ? 'mystery' : a.id)).setScale(0.36)); }
        if (isHero) c.add(chip(this, 0, -h / 2 + 4, 'PLAYING', C.star, 24));
      }
      c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 300, delay: i * 50, ease: 'Back.out' });
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => { A.init(); A.click(); if (it.add) fade(this, 'studio'); else this.details(it); });
    }
    details(it) {
      const d = it.jack ? jackDef() : toyDef(it.toy);
      const layer = this.add.container(0, 0).setDepth(60);
      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.7).setInteractive();
      dim.on('pointerup', () => close());
      layer.add(dim);
      const pw = PORTRAIT ? 960 : 1240, ph = PORTRAIT ? 1500 : 860;
      const p = this.add.container(W / 2, H / 2);
      const bg = panel(this, 0, 0, pw, ph, C.night2, 0); p.add(bg);
      const blocker = this.add.rectangle(0, 0, pw, ph, 0, 0.001).setInteractive(); p.add(blocker);
      const imgKey = it.jack ? 'jack_front' : 'toy_' + it.toy.id;
      const ix = PORTRAIT ? 0 : -pw / 2 + 300, iy = PORTRAIT ? -ph / 2 + 300 : -40;
      const im = fitImage(this, ix, iy, imgKey, PORTRAIT ? 420 : 460, PORTRAIT ? 400 : 560); p.add(im);
      this.tweens.add({ targets: im, y: iy - 14, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const tx = PORTRAIT ? 0 : 140, ty = PORTRAIT ? -ph / 2 + 560 : -ph / 2 + 110;
      p.add(fit(txt(this, tx, ty, d.name, 76, '#ffd23f', { stroke: '#0f1240', st: 12 }), PORTRAIT ? pw - 100 : 640));
      // chips
      const chips = [];
      if (it.jack) chips.push(['Dragon', C.mint], ['Ice', 0x7fd0ff], ['Sleepy', 0xfff3d2]);
      else { const t = it.toy; const a = TOYS.ARCH_BY_ID[t.arch]; chips.push([a ? a.name : 'Toy', C.mint], [(TOYS.ELEMENTS[t.element] || {}).name || 'Magic', elColor(t)], [(TOYS.QUIRKS[t.quirk] || {}).name || '', 0xfff3d2]); }
      chips.push(['PEP ' + d.hp, 0xff9ed8]);
      let cx0 = 0; const cs = chips.map(([l, col]) => chip(this, 0, ty + 90, l, col, 28));
      const total = cs.reduce((s, c) => s + c.w + 14, -14); cx0 = tx - total / 2;
      cs.forEach(c => { c.x = cx0 + c.w / 2; cx0 += c.w + 14; p.add(c); });
      // moves
      // buttons first, so the move list knows how much room it has (QA B08)
      const isHero = it.jack ? (Save.data.hero === 'jack' || !toyById(Save.data.hero)) : Save.data.hero === it.toy.id;
      const by = ph / 2 - (PORTRAIT ? 230 : 110);
      const ml = d.moves, more = it.jack && MOVES.length > ml.length;
      const my0 = ty + 170, room = by - 55 - 30 - my0, rowsN = ml.length + (more ? 1 : 0);
      const step = Math.min(PORTRAIT ? 78 : (ml.length > 4 ? 62 : 80), room / Math.max(1, rowsN - 1 + 0.6));
      const ts = Math.min(34, Math.round(step * 0.6)), ss = Math.min(26, Math.round(step * 0.46));
      ml.forEach((m, i) => {
        const my = my0 + i * step;
        const ic = img(this, tx - 250, my, m.icon || 'pillow'); ic.setScale(iconScale(m.icon || 'pillow', Math.min(56, step * 0.8)));
        p.add([ic, txt(this, tx - 205, my - 2, m.title, ts, '#fff3d2', { ox: 0, st: 5 }), txt(this, tx + 300, my, m.sub || '', ss, '#bcc0ee', { ox: 1, st: 0, weight: '500' })]);
      });
      if (more) p.add(txt(this, tx, my0 + ml.length * step, 'More moves unlock as you level up!', ss, '#ffd23f', { st: 4, weight: '500' }));
      const bxs = PORTRAIT ? [0, 0] : [tx - 170, tx + 170];
      const b1 = button(this, bxs[0], by, 320, 110, isHero ? 'PLAYING ✓' : 'PLAY AS', isHero ? 0x9fe3c0 : C.star, () => {
        if (isHero) return; Save.data.hero = it.jack ? 'jack' : it.toy.id; Save.store(); A.levelUp(); close(); this.scene.restart();
      }, { size: 42 });
      p.add(b1);
      if (!it.jack) {
        const b2 = button(this, bxs[1], PORTRAIT ? by + 130 : by, 320, 110, 'DUEL!', C.coral, () => {
          if (isHero) { this.toast('Pick another hero first — a toy can\'t duel itself!'); return; }
          fade(this, 'battle', { toy: it.toy.id });
        }, { size: 42, color: '#fff3d2' });
        p.add(b2);
        // a real button, big enough for small fingers (QA B50 / #48)
        // portrait: top right; landscape: under the picture (the name row is full there)
        const del = button(this, PORTRAIT ? pw / 2 - 150 : ix, PORTRAIT ? -ph / 2 + 75 : ph / 2 - 80, 230, 90, 'REMOVE', C.cream, () => this.confirmRemove(it.toy, close), { size: 30 });
        del.add(img(this, -78, 0, 'i:trash').setScale(iconScale('i:trash', 50))); del.list[1].x = 22;
        p.add(del);
      }
      const x = txt(this, -pw / 2 + 70, -ph / 2 + 70, '✕', 50, '#bcc0ee', { st: 0 }).setInteractive({ useHandCursor: true });
      x.on('pointerup', () => close()); p.add(x);
      layer.add(p); p.setScale(0.7); p.alpha = 0;
      this.tweens.add({ targets: p, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
      const close = () => { this.tweens.add({ targets: layer, alpha: 0, duration: 150, onComplete: () => layer.destroy() }); };
    }
    confirmRemove(t, closeDetails) {
      const layer = this.add.container(0, 0).setDepth(80);
      layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.6).setInteractive());
      layer.add(panel(this, W / 2, H / 2, 820, 440, C.night2, 0));
      layer.add(fit(txt(this, W / 2, H / 2 - 110, 'Remove ' + t.name + '?', 54, '#fff3d2', { st: 8 }), 740));
      layer.add(txt(this, W / 2, H / 2 - 40, 'This toy will leave the squad.', 30, '#bcc0ee', { st: 0, weight: '500' }));
      layer.add(button(this, W / 2 - 180, H / 2 + 100, 300, 104, 'KEEP', C.star, () => layer.destroy(), { size: 40 }));
      layer.add(button(this, W / 2 + 180, H / 2 + 100, 300, 104, 'REMOVE', C.coral, () => {
        Save.data.toys = Save.data.toys.filter(x => x.id !== t.id);
        if (Save.data.hero === t.id) Save.data.hero = 'jack';
        Save.store(); IDB.del(t.id).catch(() => {});
        layer.destroy(); closeDetails(); this.scene.restart();
      }, { size: 40, color: '#fff3d2' }));
    }
    toast(s) {
      const t = txt(this, W / 2, H - 120, s, 34, '#fff3d2', { st: 6, wrap: W * 0.8 }).setDepth(90);
      this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
    }
  }

  // ---------- Studio: photo -> cut-out -> "who is it?" -> new hero
  let toyWorker = null;
  function getWorker() {
    if (toyWorker) return toyWorker;
    const q = /[?&]localmodels/.test(location.search) ? '?local' : '';
    toyWorker = new Worker('js/toyworker.js' + q, { type: 'module' });
    return toyWorker;
  }
  function pickFile() {
    return new Promise((res) => {
      let inp = document.getElementById('toyfile');
      if (!inp) {
        inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.id = 'toyfile';
        inp.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.appendChild(inp);
      }
      inp.value = '';
      inp.onchange = () => res(inp.files && inp.files[0]);
      inp.click();
    });
  }
  async function fileToRGBA(file, max = 1024) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = await createImageBitmap(file); }
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); ctx.drawImage(bmp, 0, 0, w, h);
    return { w, h, data: ctx.getImageData(0, 0, w, h), url: cv.toDataURL('image/jpeg', 0.85) };
  }
  // keep the biggest blob of the mask (prefers the one nearest the centre), soften edges, crop, outline
  function finishCutout(rgba, w, h) {
    const a = new Uint8ClampedArray(w * h);
    for (let i = 0; i < w * h; i++) { const v = rgba[i * 4 + 3] / 255; const t = Math.min(1, Math.max(0, (v - 0.25) / 0.5)); a[i] = Math.round(255 * t * t * (3 - 2 * t)); }
    // connected components on a coarse grid
    const S = 4, gw = Math.ceil(w / S), gh = Math.ceil(h / S), lab = new Int32Array(gw * gh).fill(-1), on = new Uint8Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) on[y * gw + x] = a[Math.min(h - 1, y * S) * w + Math.min(w - 1, x * S)] > 128 ? 1 : 0;
    const comps = []; const stack = [];
    for (let i = 0; i < gw * gh; i++) {
      if (!on[i] || lab[i] >= 0) continue;
      const id = comps.length; let n = 0, sx = 0, sy = 0; stack.push(i); lab[i] = id;
      while (stack.length) {
        const j = stack.pop(); n++; const x = j % gw, y = (j / gw) | 0; sx += x; sy += y;
        for (const k of [j - 1, j + 1, j - gw, j + gw]) {
          if (k < 0 || k >= gw * gh) continue; if ((k === j - 1 && x === 0) || (k === j + 1 && x === gw - 1)) continue;
          if (on[k] && lab[k] < 0) { lab[k] = id; stack.push(k); }
        }
      }
      comps.push({ id, n, cx: sx / n / gw, cy: sy / n / gh });
    }
    if (!comps.length) return null;
    const score = c => c.n * (1.2 - Math.min(1, Math.hypot(c.cx - 0.5, c.cy - 0.5)));
    const best = comps.reduce((b, c) => score(c) > score(b) ? c : b);
    const keep = new Set(comps.filter(c => c === best || c.n > best.n * 0.6).map(c => c.id));
    // grid of kept cells, grown by 2 cells so soft edges survive
    const kg = new Uint8Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) if (lab[i] >= 0 && keep.has(lab[i])) kg[i] = 1;
    const kd = new Uint8Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      if (!kg[y * gw + x]) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < gh && xx >= 0 && xx < gw) kd[yy * gw + xx] = 1; }
    }
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!kd[Math.min(gh - 1, (y / S) | 0) * gw + Math.min(gw - 1, (x / S) | 0)]) { a[i] = 0; continue; }
      if (a[i] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < x0) return null;
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const src = document.createElement('canvas'); src.width = cw; src.height = ch;
    const sctx = src.getContext('2d'); const id = sctx.createImageData(cw, ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const si = (y + y0) * w + (x + x0), di = (y * cw + x) * 4;
      id.data[di] = rgba[si * 4]; id.data[di + 1] = rgba[si * 4 + 1]; id.data[di + 2] = rgba[si * 4 + 2]; id.data[di + 3] = a[si];
    }
    sctx.putImageData(id, 0, 0);
    // scale to max 560 tall / 600 wide and add a white sticker outline
    const sc = Math.min(1, 560 / ch, 600 / cw); const ow = Math.round(cw * sc), oh = Math.round(ch * sc), R = 8, pad = R + 4;
    const out = document.createElement('canvas'); out.width = ow + pad * 2; out.height = oh + pad * 2;
    const octx = out.getContext('2d');
    const sil = document.createElement('canvas'); sil.width = ow; sil.height = oh;
    const sl = sil.getContext('2d'); sl.drawImage(src, 0, 0, ow, oh); sl.globalCompositeOperation = 'source-in'; sl.fillStyle = '#fff'; sl.fillRect(0, 0, ow, oh);
    for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2; octx.drawImage(sil, pad + Math.cos(an) * R, pad + Math.sin(an) * R); }
    octx.drawImage(sil, pad, pad);
    octx.drawImage(src, pad, pad, ow, oh);
    const pix = sctx.getImageData(0, 0, cw, ch).data;
    return { url: out.toDataURL('image/png'), pixels: pix, w: cw, h: ch };
  }

  class StudioScene extends Phaser.Scene {
    constructor() { super('studio'); }
    create() {
      this._leaving = false; this.busyState = false; this.job = null;
      this.cameras.main.fadeIn(350, 15, 18, 64);
      sky(this);
      bottomGround(this, 'ground', PORTRAIT ? 0.45 : 0.5, 0.8);
      this.title = txt(this, W / 2, PORTRAIT ? 190 : 95, 'NEW TOY', PORTRAIT ? 80 : 72, '#fff3d2', { stroke: '#0f1240', st: 12 });
      this.layer = this.add.container(0, 0);
      // BACK while the photo is processed cancels it (QA B41 / #43)
      backButton(this, () => { if (this.busyState) this.cancelJob(); else fade(this, Save.data.toys.length ? 'squad' : 'title'); });
      muteButton(this);
      this.intro();
      try { getWorker(); } catch (e) {}
    }
    clear() { this.layer.removeAll(true); }
    // stop the photo magic: the worker is replaced, so a late reply can never land (the model files stay in the browser cache)
    cancelJob() {
      const job = this.job; if (!job) return;
      this.job = null; this.busyState = false;
      try { if (toyWorker) toyWorker.terminate(); } catch (e) {}
      toyWorker = null;
      job.finish({ type: 'cancel' });
      A.click(); this.intro();
    }
    intro() {
      this.clear(); this.title.setVisible(true);
      const cy = PORTRAIT ? H * 0.42 : H * 0.45;
      const cam = img(this, W / 2, cy - 40, 'i:camera').setScale(PORTRAIT ? 2.2 : 1.9);
      this.tweens.add({ targets: cam, angle: { from: -6, to: 6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const tip = txt(this, W / 2, cy + (PORTRAIT ? 260 : 210), 'Put ONE toy on the floor or a plain blanket\nand take a photo. The magic does the rest!', PORTRAIT ? 38 : 36, '#fff3d2', { st: 6, wrap: W * 0.86 });
      const b = button(this, W / 2, cy + (PORTRAIT ? 480 : 380), PORTRAIT ? 640 : 560, 150, 'TAKE A PHOTO', C.star, () => this.start(), { size: 56 });
      this.tweens.add({ targets: b, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.layer.add([cam, tip, b]);
    }
    async start() {
      if (this.busyState) return;
      A.init();
      const file = await pickFile();
      if (!file) return;
      this.busyState = true;
      let pic;
      try { pic = await fileToRGBA(file); } catch (e) { this.busyState = false; this.fail('Hmm, I could not open that picture.'); return; }
      this.clear();
      await addTexture(this, 'toy_photo', pic.url);
      const cy = PORTRAIT ? H * 0.46 : H * 0.5;
      const ph = fitImage(this, W / 2, cy, 'toy_photo', PORTRAIT ? 900 : 900, PORTRAIT ? 1100 : 700);
      const frame = this.add.rectangle(W / 2, cy, ph.displayWidth + 24, ph.displayHeight + 24, 0xffffff).setOrigin(0.5);
      this.layer.add([frame, ph]);
      const scan = this.add.rectangle(W / 2, cy - ph.displayHeight / 2, ph.displayWidth, 14, C.star, 0.85);
      this.tweens.add({ targets: scan, y: cy + ph.displayHeight / 2, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const sparks = this.add.particles(0, 0, 'spark', { x: { min: W / 2 - ph.displayWidth / 2, max: W / 2 + ph.displayWidth / 2 }, y: { min: cy - ph.displayHeight / 2, max: cy + ph.displayHeight / 2 }, lifespan: 700, scale: { start: 0.5, end: 0 }, frequency: 90, tint: [C.star, 0xffffff], blendMode: 'ADD' });
      const status = txt(this, W / 2, cy + ph.displayHeight / 2 + 80, 'Looking for your toy...', 42, '#fff3d2', { st: 7 });
      this.layer.add([scan, sparks, status]);
      // top right, clear of the photo and the status line on every screen (code review)
      const cancel = button(this, W - 310, 80, 300, 100, 'CANCEL', C.cream, () => this.cancelJob(), { size: 42 });
      this.layer.add(cancel);
      const files = {};
      const w = getWorker();
      const job = this.job = {};
      const result = await new Promise((res) => {
        job.finish = res;
        // the magic can be very slow on an old phone: 90 s with no news uses the photo as it is.
        // Every progress message restarts the clock, so a slow first download is never cut off (code review)
        const arm = () => { if (job.timer) job.timer.remove(false); job.timer = this.time.delayedCall(90000, () => { try { w.terminate(); } catch (e) {} if (toyWorker === w) toyWorker = null; res({ type: 'error', message: 'timeout' }); }); };
        arm();
        w.onmessage = (ev) => {
          if (this.job !== job) return;
          arm();
          const m = ev.data;
          if (m.type === 'progress') {
            files[m.file] = [m.loaded, m.total];
            const L = Object.values(files).reduce((s, f) => s + f[0], 0), T = Object.values(files).reduce((s, f) => s + f[1], 0);
            status.setText('Downloading toy magic (first time only)... ' + Math.round(100 * L / Math.max(T, 1)) + '%');
          } else if (m.type === 'stage') {
            status.setText({ download: 'Getting the magic ready...', cutout: 'Cutting out your toy...', classify: 'Who could this be?...' }[m.stage] || status.text);
          } else if (m.type === 'done' || m.type === 'error') res(m);
        };
        w.onerror = (e) => { if (this.job === job) res({ type: 'error', message: e.message || 'worker failed' }); };
        const buf = pic.data.data.buffer.slice(0);
        w.postMessage({ type: 'process', rgba: buf, w: pic.w, h: pic.h }, [buf]);
      });
      if (job.timer) job.timer.remove(false);
      if (result.type === 'cancel' || this.job !== job || !this.sys.isActive()) return; // cancelled (BACK / CANCEL) or left the scene
      this.job = null;
      cancel.destroy();
      scan.destroy(); sparks.stop();
      let cut = null, scores = [];
      if (result.type === 'done') { cut = finishCutout(new Uint8ClampedArray(result.rgba), result.w, result.h); scores = result.scores || []; }
      if (!cut) {
        // fallback: use the photo itself (no magic available on this device)
        cut = finishCutout(fallbackMask(pic), pic.w, pic.h);
        status.setText('The magic got sleepy, so I used your photo as it is!');
      }
      await addTexture(this, 'toy_new', cut.url);
      this.cut = cut; this.scores = scores;
      this.tweens.add({ targets: [frame, ph, status], alpha: 0, duration: 300 });
      await wait(this, 320);
      this.reveal();
    }
    reveal() {
      this.clear();
      const cy = PORTRAIT ? H * 0.42 : H * 0.48;
      const im = fitImage(this, PORTRAIT ? W / 2 : W * 0.32, cy, 'toy_new', PORTRAIT ? 760 : 620, PORTRAIT ? 760 : 640);
      const base = im.scale; im.setScale(0);
      this.tweens.add({ targets: im, scale: base, duration: 600, ease: 'Back.out' });
      this.tweens.add({ targets: im, y: cy - 16, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 600 });
      A.levelUp(); buzz([30, 40, 30]);
      const conf = this.add.particles(0, 0, 'conf', { emitting: false, speed: { min: 500, max: 1200 }, angle: { min: 230, max: 310 }, gravityY: 1100, lifespan: 2400, rotate: { min: 0, max: 360 }, tint: [0xff6b5b, 0xffd23f, 0x7fd6c2, 0x9aa2ff, 0xff9ed8] }).setDepth(40);
      conf.explode(120, im.x, H);
      this.layer.add([im, conf]);
      this.toyImg = im;
      const top = this.scores[0];
      this.guess = top ? top[0] : 'mystery';
      this.askWho();
    }
    askWho() {
      const a = TOYS.ARCH_BY_ID[this.guess] || TOYS.ARCH_BY_ID.mystery;
      const x = PORTRAIT ? W / 2 : W * 0.72, y = PORTRAIT ? H * 0.78 : H * 0.42;
      const c = this.add.container(x, y);
      const q = txt(this, 0, -150, this.guess === 'mystery' ? 'Who is this?' : 'Is it a...', 48, '#bcc0ee', { st: 6 });
      const ic = img(this, -170, -20, 'i:' + a.id).setScale(0.8);
      const nm = fit(txt(this, 40, -20, a.name.toUpperCase() + '?', 80, '#ffd23f', { stroke: '#0f1240', st: 12, ox: 0.5 }), 420);
      const yes = button(this, -170, 140, 300, 120, 'YES!', C.star, () => { c.destroy(); this.makeHero(this.guess); }, { size: 52 });
      const no = button(this, 170, 140, 300, 120, 'NO...', C.cream, () => { c.destroy(); this.picker(); }, { size: 52 });
      c.add([q, ic, nm, yes, no]);
      if (this.guess === 'mystery') { yes.setVisible(false); no.x = 0; no.list[1].setText('CHOOSE'); }
      c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 350, delay: 500, ease: 'Back.out' });
      this.layer.add(c);
    }
    picker() {
      const layer = this.add.container(0, 0).setDepth(60);
      layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.85).setInteractive());
      layer.add(txt(this, W / 2, PORTRAIT ? 170 : 80, 'Who is your toy?', PORTRAIT ? 64 : 58, '#fff3d2', { stroke: '#0f1240', st: 10 }));
      // most likely first
      const order = this.scores.map(s => s[0]).concat(TOYS.ARCH.map(a => a.id)).filter((v, i, arr) => arr.indexOf(v) === i);
      const cols = PORTRAIT ? 6 : 11, cell = PORTRAIT ? 172 : Math.min(136, (W - 80) / cols);
      const rows = Math.ceil(order.length / cols);
      const y0 = PORTRAIT ? 300 : 170;
      order.forEach((id, i) => {
        const a = TOYS.ARCH_BY_ID[id]; if (!a) return;
        const x = W / 2 + ((i % cols) - (cols - 1) / 2) * cell, y = y0 + Math.floor(i / cols) * (cell + (PORTRAIT ? 34 : 26));
        const bg = this.add.circle(x, y, cell * 0.44, i < 3 && this.scores.length ? 0x3a3f9e : C.night2).setStrokeStyle(4, i < 3 && this.scores.length ? C.star : C.seam);
        const ic = img(this, x, y - 4, 'i:' + id).setScale(cell * 0.62 / 144);
        const lb = fit(txt(this, x, y + cell * 0.48, a.name, PORTRAIT ? 24 : 20, '#fff3d2', { st: 4, weight: '500' }), cell - 6);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerup', () => { A.click(); layer.destroy(); this.makeHero(id); });
        layer.add([bg, ic, lb]);
      });
      layer.alpha = 0; this.tweens.add({ targets: layer, alpha: 1, duration: 200 });
    }
    makeHero(arch) {
      const cut = this.cut;
      const element = TOYS.elementFromPixels(cut.pixels);
      const seed = TOYS.seedFromPixels(cut.pixels, cut.w, cut.h);
      this.toy = TOYS.createToy({ arch, element, seed, aspect: cut.w / cut.h });
      this.card();
    }
    card() {
      const t = this.toy, d = toyDef(t);
      const px = PORTRAIT ? W / 2 : W * 0.68, py = PORTRAIT ? H * 0.72 : H * 0.53;
      const pw = PORTRAIT ? 980 : Math.min(900, W * 0.56), ph = PORTRAIT ? 880 : 860;
      this.title.setVisible(false);
      if (PORTRAIT) { this.tweens.add({ targets: this.toyImg, y: H * 0.27, scale: this.toyImg.scale * 0.72, duration: 400 }); }
      const c = this.add.container(px, py);
      c.add(panel(this, 0, 0, pw, ph, C.night2, 0));
      // name: DOM input so the kid (or a parent) can type it
      const ny = -ph / 2 + 100;
      c.add(txt(this, -pw / 2 + 60, ny - 52, 'NAME', 26, '#bcc0ee', { ox: 0, st: 0, weight: '500' }));
      const a = TOYS.ARCH_BY_ID[t.arch];
      const chips = [[a.name, C.mint], [TOYS.ELEMENTS[t.element].name, elColor(t)], [TOYS.QUIRKS[t.quirk].name, 0xfff3d2], ['PEP ' + t.hp, 0xff9ed8]];
      const cs = chips.map(([l, col]) => chip(this, 0, ny + 100, l, col, 28));
      let cx0 = -cs.reduce((s, cc) => s + cc.w + 14, -14) / 2; cs.forEach(cc => { cc.x = cx0 + cc.w / 2; cx0 += cc.w + 14; c.add(cc); });
      d.moves.forEach((m, i) => {
        const my = ny + 200 + i * (PORTRAIT ? 96 : 88);
        const ic = img(this, -pw / 2 + 110, my, m.icon || 'pillow'); ic.setScale(iconScale(m.icon || 'pillow', 70));
        c.add([ic, fit(txt(this, -pw / 2 + 170, my - 16, m.title, 38, '#fff3d2', { ox: 0, st: 6 }), pw - 260), txt(this, -pw / 2 + 170, my + 24, m.sub, 26, '#bcc0ee', { ox: 0, st: 0, weight: '500' })]);
      });
      const save = button(this, 140, ph / 2 - 100, 400, 120, 'SAVE TO SQUAD', C.star, () => this.save(), { size: 40 });
      const again = button(this, -230, ph / 2 - 100, 260, 120, 'RETAKE', C.cream, () => { this.removeInput(); this.busyState = false; this.intro(); }, { size: 40 });
      c.add([save, again]);
      c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 380, ease: 'Back.out' });
      this.layer.add(c);
      // DOM name field
      this.removeInput();
      const el = document.createElement('input');
      el.type = 'text'; el.maxLength = 16; el.value = t.name; el.setAttribute('autocomplete', 'off'); el.setAttribute('enterkeyhint', 'done');
      el.style.cssText = 'font:700 46px Poppins,Arial,sans-serif;color:#1d2163;background:#fff3d2;border:0;border-radius:24px;padding:8px 22px;width:' + (pw - 140) + 'px;text-align:center;outline:none;box-sizing:border-box';
      this.nameEl = this.add.dom(px, py + ny + 12, el);
      el.addEventListener('input', () => { t.name = el.value.trim().slice(0, 16) || TOYS.ARCH_BY_ID[t.arch].nicks[0]; });
      this.nameEl.setAlpha(0); this.tweens.add({ targets: this.nameEl, alpha: 1, delay: 300, duration: 200 });
    }
    removeInput() { if (this.nameEl) { this.nameEl.destroy(); this.nameEl = null; } }
    async save() {
      const t = this.toy;
      t.name = (t.name || '').trim() || TOYS.ARCH_BY_ID[t.arch].nicks[0];
      try { await IDB.set(t.id, this.cut.url); } catch (e) { /* storage unavailable: keep for this session */ }
      await addTexture(this, 'toy_' + t.id, this.cut.url);
      Save.data.toys.push(t); Save.store();
      emit('toyAdded', { toy: t, url: this.cut.url }, this);
      this.removeInput();
      A.win();
      fade(this, 'squad', { focus: t.id });
    }
    fail(msg) {
      this.clear();
      this.layer.add(txt(this, W / 2, H * 0.45, msg, 44, '#fff3d2', { st: 7, wrap: W * 0.8 }));
      this.layer.add(button(this, W / 2, H * 0.6, 420, 120, 'TRY AGAIN', C.star, () => this.intro(), { size: 44 }));
    }
  }
  // When the on-device model is not available: keep a soft oval from the middle of the photo
  function fallbackMask(pic) {
    const { w, h } = pic; const d = new Uint8ClampedArray(pic.data.data);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w * 0.42), dy = (y - h / 2) / (h * 0.45), r = Math.hypot(dx, dy);
      d[(y * w + x) * 4 + 3] = r < 0.9 ? 255 : r < 1 ? Math.round(255 * (1 - r) * 10) : 0;
    }
    return d;
  }

  // ---------- Battle (generic: any hero vs any rival; moves are data)
  class Battle extends Phaser.Scene {
    constructor() { super('battle'); }
    init(data) {
      this.data0 = Object.assign({}, data || {});
      this.res = this.data0.resume || null; delete this.data0.resume;
      this.boostRefunded = false; // the scene object is reused for every duel (QA B30)
      const d = this.data0, toy = d.toy && toyById(d.toy);
      this.mode = 'campaign';
      if (toy) { this.mode = 'toy'; this.rivalIdx = -1; this.R = Object.assign(toyDef(toy), { xp: 30, scale: null }); }
      else if (d.ftoy) {
        // a friend's toy (picture loaded by the friends screen as texture 'ftoy_<id>')
        const t = d.ftoy;
        this.mode = 'friend'; this.rivalIdx = -2;
        this.R = Object.assign(toyDef(t), { tex: 'ftoy_' + t.id, xp: 35, scale: null, short: t.name.toUpperCase(),
          intro: d.ownerName + '\'s ' + t.name + ' wiggles: "Ready to lose, Jack?"', laugh: d.ownerName + '\'s ' + t.name + ' giggled so hard they gave up.' });
      } else if (d.fjack) {
        // a friend's own Jack (everyone has a Jack!)
        const lvl = d.fjack.level || 1;
        this.mode = 'friend'; this.rivalIdx = -2;
        this.R = { id: 'fjack', name: d.ownerName + '\'s Jack', nick: d.ownerName + '\'s Jack', short: (d.ownerName + '\'S JACK').toUpperCase(), tex: 'jack_side', flip: true, color: C.mint, hp: 100, xp: 35, scale: null,
          intro: d.ownerName + '\'s Jack flaps: "Two Jacks? Only one can win!"', laugh: d.ownerName + '\'s Jack flipped upside down and gave up.',
          moves: MOVES.filter(m => m.lvl <= lvl).map(m => Object.assign({}, m)) };
      } else if (d.boss) { this.mode = 'boss'; this.rivalIdx = -3; this.R = KRAKEN; }
      else { this.rivalIdx = d.rival || 0; this.R = RIVALS[this.rivalIdx] || RIVALS[0]; }
      this.world = this.R.world || 0;
      this.backKey = this.mode === 'toy' ? 'squad' : this.mode === 'friend' ? 'friends' : 'map';
    }
    create() {
      this._leaving = false; this.hero = null; this.over = false; this.busy = false; this.shown = null; this.celebrating = false;
      // a friend's toy picture may be missing (e.g. after rotating the screen): load it first
      const ft = this.data0.ftoy;
      if (ft && !this.textures.exists('ftoy_' + ft.id)) {
        txt(this, W / 2, H / 2, 'Loading...', 50, '#fff3d2');
        addTexture(this, 'ftoy_' + ft.id, ft.url).then(ok => { if (ok) this.scene.restart(Object.assign({}, this.data0, this.res ? { resume: this.res } : {})); else fade(this, 'friends'); });
        return;
      }
      this.cameras.main.fadeIn(400, 15, 18, 64);
      sky(this, this.world);
      const owned = BOOSTS.filter(b => (Save.data.boosts[b.id] || 0) > 0);
      if (this.res) this.setup(this.res.boost, this.res);
      else if (owned.length) this.pickBooster(owned);
      else this.setup(null, null);
    }
    // before the duel: pick one booster from the capsule collection (or none)
    pickBooster(owned) {
      const layer = this.add.container(0, 0).setDepth(80);
      const items = owned.concat([null]);
      // card size comes from the free space, so 10 boosters + NO BOOSTER fit on iPad and phones (QA B01)
      const gap = 24, top = PORTRAIT ? 380 : 250, availW = W - 80, availH = H - 40 - top;
      const cols = PORTRAIT ? 2 : Math.min(5, items.length);
      const rows = Math.ceil(items.length / cols);
      const cw = Math.min(PORTRAIT ? 470 : 300, (availW - gap * (cols - 1)) / cols);
      const ch = Math.min(PORTRAIT ? 190 : 250, (availH - gap * (rows - 1)) / rows);
      const y0 = top + ch / 2;
      layer.add(txt(this, W / 2, PORTRAIT ? 220 : 110, 'PICK A BOOSTER!', PORTRAIT ? 80 : 76, '#ffd23f', { stroke: '#0f1240', st: 12 }));
      layer.add(txt(this, W / 2, PORTRAIT ? 310 : 195, 'vs ' + this.R.name + '  ·  ' + diff().name, 34, '#bcc0ee', { st: 6 }));
      const done = this._pick = (b) => {
        if (b) { Save.data.boosts[b.id]--; if (Save.data.boosts[b.id] <= 0) delete Save.data.boosts[b.id]; Save.store(); }
        this.tweens.add({ targets: layer, alpha: 0, duration: 250, onComplete: () => { layer.destroy(true); bb.destroy(); mb.destroy(); this.setup(b ? b.id : null, null); } });
      };
      items.forEach((b, i) => {
        const inRow = Math.floor(i / cols) === rows - 1 ? items.length - cols * (rows - 1) : cols;
        const x = W / 2 + ((i % cols) - (inRow - 1) / 2) * (cw + 24), y = y0 + Math.floor(i / cols) * (ch + 24);
        const c = this.add.container(x, y);
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-cw / 2, -ch / 2 + 10, cw, ch, 34);
        g.fillStyle(b ? C.cream : C.night2); g.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 34);
        if (b) { g.lineStyle(6, Phaser.Display.Color.HexStringToColor(RARITY[b.r].color).color); g.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 34); }
        c.add(g);
        if (b) {
          const ix = PORTRAIT ? -cw / 2 + 80 : 0, iy = PORTRAIT ? 0 : -ch * 0.2;
          const ic = img(this, ix, iy, b.icon); ic.setScale(iconScale(b.icon, PORTRAIT ? Math.min(110, ch - 50) : Math.min(100, ch * 0.4))); c.add(ic);
          this.tweens.add({ targets: ic, angle: { from: -8, to: 8 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          const tx = PORTRAIT ? -cw / 2 + 150 : 0, ox = PORTRAIT ? 0 : 0.5;
          c.add(fit(txt(this, tx, PORTRAIT ? -Math.min(30, ch * 0.17) : ch * 0.14, b.name, 34, C.ink, { st: 0, shadow: false, ox }), cw - (PORTRAIT ? 170 : 30)));
          if (PORTRAIT) c.add(fit(txt(this, tx, Math.min(22, ch * 0.14), b.desc, 24, '#4a4f8c', { st: 0, shadow: false, weight: '500', ox }), cw - 170));
          else {
            // landscape: the description starts under the name and shrinks to the card's free height
            const dTop = ch * 0.14 + 24, room = ch / 2 - 12 - dTop;
            const dt = txt(this, 0, dTop, b.desc, 24, '#4a4f8c', { st: 0, shadow: false, weight: '500', oy: 0, wrap: cw - 30 });
            if (dt.height > room) dt.setScale(room / dt.height);
            c.add(dt);
          }
          c.add(chip(this, cw / 2 - 44, -ch / 2 + 6, '×' + Save.data.boosts[b.id], C.star, 26));
        } else c.add(txt(this, 0, 0, 'NO BOOSTER', 38, '#fff3d2', { st: 6 }));
        c.setSize(cw, ch).setInteractive({ useHandCursor: true }).setScale(0);
        this.tweens.add({ targets: c, scale: 1, duration: 300, delay: i * 50, ease: 'Back.out' });
        c.on('pointerup', () => { A.init(); A.click(); if (b) { A.levelUp(); } layer.list.forEach(o => o.disableInteractive && o.disableInteractive()); done(b); });
        layer.add(c);
      });
      const bb = backButton(this, () => fade(this, this.backKey, { world: this.world }));
      const mb = muteButton(this);
    }
    setup(boostId, res) {
      const R = this.R;
      const boost = boostId && BOOST_BY_ID[boostId];
      this.boost = boost || null;
      const space = this.world === SPACE;
      // level scaling per world: Hills and Spooky from L1, Space from L4, Canada from L6 (docs/gdd/0.8-canada.md section 5)
      const from = space ? 4 : this.world === CANADA ? 6 : 0;
      // difficulty: chosen mode + it grows with the player's level ("too easy!" said the chief tester)
      const lvl = levelOf(Save.data.xp).l, D = diff();
      const hpMul = this.mode === 'boss' ? 1 : D.hp * (!D.scale ? 1 : from ? clamp(1 + 0.05 * (lvl - from), 1, 1.25) : clamp(1 + 0.07 * (lvl - 1), 1, 1.4));
      const dmgMul = D.dmg * (!D.scale ? 1 : from ? clamp(1 + 0.04 * (lvl - from), 1, 1.2) : clamp(1 + 0.05 * (lvl - 1), 1, 1.3));
      this.rHp = Math.round(R.hp * hpMul / 5) * 5;
      this.H = heroDef(this);
      this.moves = this.H.moves.slice();
      if (boost && boost.move) this.moves.push(Object.assign({}, boost.move));
      // card layout
      const n = this.moves.length; const rects = []; let top;
      if (PORTRAIT) {
        const cols = n > 6 || (n > 4 && H < 1900) ? 3 : 2;
        const rows = Math.ceil(n / cols), h = rows > 2 ? 172 : 200, gy = h + 22, w = cols === 3 ? 330 : 490;
        const y0 = H - 70 - h / 2 - (rows - 1) * gy;
        for (let i = 0; i < n; i++) {
          const row = Math.floor(i / cols), inRow = row === rows - 1 ? n - cols * (rows - 1) : cols;
          rects.push({ x: W / 2 + ((i % cols) - (inRow - 1) / 2) * (w + 18), y: y0 + row * gy, w, h });
        }
        top = y0 - h / 2;
      } else {
        const rows = n <= 4 ? 1 : 2, cols = Math.ceil(n / rows);
        const w = Math.min(430, (W - 100) / cols - 22), h = rows === 1 ? (w < 400 ? 200 : 170) : 128;
        for (let i = 0; i < n; i++) {
          const row = Math.floor(i / cols), inRow = row === rows - 1 ? n - cols * (rows - 1) : cols, col = i - row * cols;
          rects.push({ x: W / 2 + (col - (inRow - 1) / 2) * (w + 22), y: H - 22 - h / 2 - (rows - 1 - row) * (h + 16), w, h });
        }
        top = rects[0].y - h / 2;
      }
      const compact = !PORTRAIT && n > 4;
      // portrait: fighters stand just above the cards (room for the log line) and shrink when space is short
      const groundY = PORTRAIT ? top - 150 : (compact ? top - 80 : H * 0.68);
      this.groundY = groundY;
      const zoom = compact ? 0.82 : (PORTRAIT ? clamp((groundY - 330) / 520, 0.55, 1) : 1);
      const moon = this.add.image(W / 2, PORTRAIT ? Math.max(H * 0.2, groundY - 760) : H * 0.24, space ? 'planet' : 'moon').setScale((PORTRAIT ? 0.6 : 0.62 * zoom) * (space ? 1.15 : 1)).setAlpha(0.95);
      if (this.world === SPOOKY) moon.setTint(0xffa64d).setScale(moon.scale * 1.3);
      if (this.world === CANADA) moon.setTint(0xd8ecff);
      this.tweens.add({ targets: moon, angle: -6, y: moon.y + 12, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const bg = this.add.image(W / 2, groundY - (PORTRAIT ? 230 : 300 * zoom), groundKey(this.world)).setOrigin(0.5, 0).setScale(1, PORTRAIT ? 1.6 : 0.9);
      if (bg.y + bg.displayHeight < H + SB + 4) bg.setScale(1, (H + SB + 4 - bg.y) / bg.height); // reach the bottom edge
      bottomFade(this);
      this.fireFx = this.add.rectangle(W / 2, H / 2, W, H, 0xff3b1f, 0).setDepth(5);

      this.feathers = this.add.particles(0, 0, 'feather', { emitting: false, speed: { min: 250, max: 750 }, angle: { min: 200, max: 340 }, gravityY: 900, lifespan: { min: 1100, max: 1700 }, rotate: { start: 0, end: 540 }, scale: { start: 0.7, end: 0.45 }, alpha: { start: 1, end: 0 } }).setDepth(20);
      this.sparks = this.add.particles(0, 0, 'spark', { emitting: false, speed: { min: 300, max: 900 }, lifespan: 450, scale: { start: 0.9, end: 0 }, tint: [C.star, 0xffffff], blendMode: 'ADD' }).setDepth(21);
      this.heals = this.add.particles(0, 0, 'dot', { emitting: false, speedY: { min: -500, max: -200 }, speedX: { min: -80, max: 80 }, lifespan: 1000, scale: { start: 0.45, end: 0 }, tint: [0x7fe39a, 0xd7ffb0, 0xffffff], blendMode: 'ADD' }).setDepth(21);
      this.dust = this.add.particles(0, 0, 'dot', { emitting: false, speed: { min: 200, max: 600 }, angle: { min: 180, max: 360 }, gravityY: 500, lifespan: 800, scale: { start: 0.6, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: [0xd8c7a3, 0xffffff] }).setDepth(19);
      this.notes = this.add.particles(0, 0, 'note', { emitting: false, speedY: { min: -400, max: -200 }, speedX: { min: -200, max: 200 }, lifespan: 1200, scale: { start: 0.25, end: 0.1 }, rotate: { min: -30, max: 30 }, alpha: { start: 1, end: 0 } }).setDepth(22);
      this.steamP = this.add.particles(0, 0, 'dot', { emitting: false, speed: { min: 120, max: 420 }, angle: { min: 200, max: 340 }, lifespan: 900, scale: { start: 0.5, end: 1.3 }, alpha: { start: 0.85, end: 0 }, tint: [0xffffff, 0xdfe8ff, 0xc9d3f0] }).setDepth(28);
      this.fireP = this.add.particles(0, 0, 'dot', { emitting: false, speed: { min: 200, max: 650 }, lifespan: 500, scale: { start: 0.55, end: 0 }, tint: [0xff6b2b, 0xffd23f, 0xff3b1f], blendMode: 'ADD' }).setDepth(28);
      this.confetti = this.add.particles(0, 0, 'conf', { emitting: false, speed: { min: 500, max: 1300 }, angle: { min: 230, max: 310 }, gravityY: 1100, lifespan: 2600, rotate: { min: 0, max: 360 }, scaleX: { start: 1, end: 0.2 }, tint: [0xff6b5b, 0xffd23f, 0x7fd6c2, 0x9aa2ff, 0xff9ed8] }).setDepth(40);

      // fighters
      const fitScale = (key, hTarget, wMax) => { const f = this.textures.get(key).getSourceImage(); return Math.min(hTarget / f.height, wMax / f.width); };
      const hT = (PORTRAIT ? 520 : 465) * zoom, wM = (PORTRAIT ? 470 : 540) * zoom;
      const heroScale = this.H.isJack ? (PORTRAIT ? 0.9 : 0.8) * zoom : fitScale(this.H.tex, hT, wM);
      if (R.flip && R.tex === 'jack_side') R.scale = (PORTRAIT ? 0.9 : 0.8) / (PORTRAIT ? 1.1 : 1);
      const rivScale = (R.scale ? R.scale * (PORTRAIT ? 1.1 : 1) * zoom : fitScale(R.tex, hT, wM)) * (PORTRAIT ? 1 : (R.big || 1));
      const heroMax = this.H.hp + (boostId === 'breakfast' ? 25 : 0);
      this.hero = this.fighter(W * (PORTRAIT ? 0.27 : 0.28), groundY, this.H.tex, heroScale, 1, heroMax, false);
      this.rival = this.fighter(W * (PORTRAIT ? 0.74 : 0.72), groundY, R.tex, rivScale, -1, this.rHp, !!(R.isToy || R.flip));
      this.addHat(this.hero);
      if (R.ghostly) this.tweens.add({ targets: this.rival.spr, alpha: 0.6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.hero.name = this.H.name; this.hero.napTex = this.H.napTex; this.hero.isJack = this.H.isJack;
      this.rival.name = R.nick || R.name;
      this.rmoves = R.moves.map((m, i) => {
        const o = Object.assign({ k: 'r' + i, w: DEF_W[m.type] || 20 }, m);
        if (o.usesHard && D === DIFFS.hard) o.uses = o.usesHard;
        if (o.dmg) o.dmg = o.dmg.map(v => Math.round(v * dmgMul));
        if (o.amt) o.amt = Math.round(o.amt * hpMul);
        return o;
      });

      const hy = PORTRAIT ? 200 : 150;
      this.hero.bar = this.hpBar(W * 0.27, hy, this.H.short, this.H.color, heroMax);
      this.rival.bar = this.hpBar(W * 0.73, hy, R.short, R.color, this.rHp);
      const vs = txt(this, W / 2, hy + 10, 'VS', PORTRAIT ? 56 : 72, '#ffd23f', { stroke: '#0f1240', st: 12 });
      this.tweens.add({ targets: vs, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.diffChip = D !== DIFFS.normal ? chip(this, W / 2, hy + (PORTRAIT ? 70 : 90), D.name, D.color, 24).setDepth(30) : null;
      this.beamSpot = null; this.beamSweep = null; this.extHold = null; // the scene object is reused: no leftovers from a duel left during a charge
      this.smart = D.smart; this.xpMul = D.xp * (boostId === 'superstar' ? 2 : 1);
      const intro = (R.intro || '').replace(/Jack/g, this.H.name);
      this.logT = txt(this, W / 2, groundY + (PORTRAIT ? 72 : (compact ? 42 : 55)), intro, PORTRAIT ? 30 : 34, '#fff3d2', { st: 6, wrap: W * 0.9 });

      this.moves.forEach((m, i) => { m.card = this.actionCard(rects[i].x, rects[i].y, rects[i].w, rects[i].h, m); });
      // block buttons: appear while a rival is charging. EASY: one BLOCK IT! that picks the right tool by itself.
      // NORMAL / HARD (v0.8 "Fire or Beam?"): FOAM! (extinguisher, stops fire) and UMBRELLA! (stops a beam)
      const bby = this.bby = PORTRAIT ? Math.max(330, groundY - hT - 90) : Math.max(280, groundY - hT - 75);
      this.easy = D === DIFFS.easy; this.hard = D === DIFFS.hard;
      const toolBtn = (label, color, tex, cb) => {
        const b = button(this, W / 2, bby, 400, 130, label, color, cb, { size: 50, color: '#fff3d2' }).setDepth(35).setVisible(false);
        fit(b.list[1], 240); b.list[1].x = 50;
        b.icon = this.add.image(-130, -10, tex).setScale(iconScale(tex, 118)).setAngle(-12); b.add(b.icon);
        this.tweens.add({ targets: b, scale: 1.05, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        return b;
      };
      this.blockBtn = toolBtn('BLOCK IT!', C.coral, 'extinguisher', () => this.playerBlock(this.rival.charging && this.rival.charging.type === 'beam' ? 'umb' : 'ext'));
      this.extBtn = toolBtn('FOAM!', C.coral, 'extinguisher', () => this.playerBlock('ext'));
      this.umbBtn = toolBtn('UMBRELLA!', 0x6c7bff, 'umbrella', () => this.playerBlock('umb'));
      // SLAPSHOT wind-up: a reminder by the hero instead of a button
      // under the hero's pep bar, where the booster chip is (hidden meanwhile): clear of a hat on the hero (QA B54)
      this.saveChip = chip(this, W * 0.27, hy + (PORTRAIT ? 70 : 76), '        NEXT: SAVE IT!', 0xd8ecff, 30).setDepth(35).setVisible(false);
      this.saveChip.add(img(this, -this.saveChip.w / 2 + 44, 0, 'glove').setScale(iconScale('glove', 56)));
      this.tweens.add({ targets: this.saveChip, scale: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      backButton(this, () => {
        if (this.busy && !this.over) return;
        // no move made yet: the booster goes back to the collection (QA B30)
        if (!this.over && !this.acted && this.boost && !this.boostRefunded) { this.boostRefunded = true; Save.data.boosts[this.boost.id] = (Save.data.boosts[this.boost.id] || 0) + 1; Save.store(); }
        fade(this, this.backKey, { world: this.world });
      });
      muteButton(this);
      this.over = false; this.busy = false; this.acted = !!(res && res.acted);
      // booster effects
      const P = this.hero, T = this.rival;
      if (boostId === 'fort') P.shield = true;
      if (boostId === 'lucky') P.bonus = 3;
      if (boostId === 'rocket') P.firstBonus = 10;
      if (boostId === 'moon') T.dizzy = true;
      if (boostId === 'heart') P.spare = true;
      if (boost) {
        const bc = chip(this, W * 0.27, hy + (PORTRAIT ? 70 : 76), '      ' + boost.name, 0xfff3d2, 24).setDepth(30);
        const bi = img(this, -bc.w / 2 + 34, 0, boost.icon); bi.setScale(iconScale(boost.icon, 40)); bc.add(bi);
        this.boostChip = bc;
      }
      // coming back after the screen was rotated: restore the duel exactly
      if (res) {
        const put = (f, o) => { ['hp', 'max', 'used', 'dizzy', 'shield', 'spare', 'bonus', 'firstBonus', 'lastType', 'afterCharge', 'beamed'].forEach(k => { if (o[k] !== undefined) f[k] = o[k]; }); f.bar.setMax(f.max); f.bar.set(f.hp, this); };
        put(P, res.h); put(T, res.r);
        if (res.charging >= 0 && this.rmoves[res.charging]) { T.charging = this.rmoves[res.charging]; this.chargeFx(T); }
        if (res.log) this.logT.setText(res.log);
        // the duel was already over: show the result panel again in the new layout (QA B31)
        if (res.result) {
          this.setStatus(P); this.setStatus(T);
          this.over = true; this.busy = true; this.acted = true; this.shown = res.result; this.setCards(false);
          this.resultPanel(res.result, false);
          return;
        }
      }
      this.setStatus(P); this.setStatus(T);
      if (boost && !res) {
        A.levelUp(); this.popWord(P.center().x, P.center().y - 260, boost.name.toUpperCase() + '!', '#ffd23f', 70, -6);
        this.sparks.explode(24, P.center().x, P.center().y);
        if (boostId === 'breakfast') this.heals.explode(30, P.root.x, P.root.y - 40);
      }
      this.banner('YOUR TURN', C.star);
      this.setCards(true);
    }
    snapshot() {
      const pick = f => ({ hp: f.hp, max: f.max, used: Object.assign({}, f.used), dizzy: f.dizzy, shield: f.shield, spare: f.spare, bonus: f.bonus, firstBonus: f.firstBonus, lastType: f.lastType, afterCharge: !!f.afterCharge, beamed: (f.beamed || []).slice() });
      return { boost: this.boost ? this.boost.id : null, h: pick(this.hero), r: pick(this.rival), charging: this.rival.charging ? this.rmoves.indexOf(this.rival.charging) : -1, log: this.logT ? this.logT.text : '', acted: !!this.acted };
    }

    fighter(x, y, key, scale, dir, maxHp, flip) {
      const root = this.add.container(x, y).setDepth(10);
      const shadow = this.add.image(0, 4, 'shadow').setScale(dir > 0 ? 1.25 : 1.1, 1);
      const squash = this.add.container(0, 0);
      const spr = this.add.image(0, 0, key).setOrigin(0.5, 1).setScale(scale).setFlipX(!!flip);
      const status = this.add.container(0, 0);
      squash.add(spr); root.add([shadow, squash, status]);
      const f = { root, squash, spr, shadow, status, scale, dir, key, hp: maxHp, max: maxHp, dizzy: false, shield: false, used: {}, home: x };
      this.tweens.add({ targets: spr, scaleY: scale * 1.035, scaleX: scale * 0.99, duration: 950 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: spr, y: -10, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * 500 });
      f.height = () => spr.displayHeight;
      f.center = () => ({ x: root.x + (dir > 0 ? 40 : -10), y: root.y - spr.displayHeight * 0.55 });
      f.front = () => ({ x: root.x + dir * spr.displayWidth * 0.38, y: root.y - spr.displayHeight * (dir > 0 ? 0.72 : 0.62) });
      return f;
    }
    // Halloween costume on the hero
    addHat(f) {
      const c = COSTUMES.find(x => x.id === Save.data.costume);
      if (!c || !c.tex || !this.textures.exists(c.tex)) return;
      const w = f.spr.displayWidth, h = f.spr.displayHeight, jack = f.key === 'jack_side';
      const hat = hatImage(this, jack ? w * 0.2 : 0, -h * (jack ? 0.9 : 0.96), c).setOrigin(0.5, 0.85);
      hat.setScale(w * c.w / hat.width * (jack ? 0.8 : 1)).setAngle(jack ? 14 : -6);
      f.squash.add(hat); f.hat = hat;
      this.tweens.add({ targets: hat, y: hat.y - 10, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    setStatus(f) {
      f.status.removeAll(true);
      const top = -f.height() - 40;
      if (f.dizzy) { const d = this.add.image(0, top, 'dizzy').setScale(0.38); this.tweens.add({ targets: d, angle: 360, duration: 1200, repeat: -1 }); f.status.add(d); }
      if (f.shield) {
        const s = this.add.image(f.dir * -f.spr.displayWidth * 0.45, -f.height() * 0.45, 'shield').setScale(0.42).setAlpha(0.95);
        this.tweens.add({ targets: s, y: s.y - 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); f.status.add(s);
      }
    }
    hpBar(x, y, name, color, max) {
      const w = PORTRAIT ? 370 : Math.min(560, W * 0.33), h = 44;
      const c = this.add.container(x, y).setDepth(30);
      const back = this.add.graphics();
      back.fillStyle(0x0f1240, 0.85); back.fillRoundedRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 30);
      back.lineStyle(4, C.seam); back.strokeRoundedRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 30);
      const ghost = this.add.rectangle(-w / 2, 0, w, h - 8, 0xffffff).setOrigin(0, 0.5);
      const fill = this.add.rectangle(-w / 2, 0, w, h - 8, color).setOrigin(0, 0.5);
      const shine = this.add.rectangle(-w / 2, -8, w, 8, 0xffffff, 0.3).setOrigin(0, 0.5);
      const label = fit(txt(this, -w / 2 + 4, -h / 2 - 34, name, 38, '#fff3d2', { ox: 0, st: 7 }), w * 0.56);
      const val = txt(this, w / 2 - 4, -h / 2 - 34, 'PEP ' + max, PORTRAIT ? 28 : 32, '#bcc0ee', { ox: 1, st: 6 });
      c.add([back, ghost, fill, shine, label, val]);
      return {
        setMax: (m) => { max = m; },
        set: (hp, scene) => {
          const tw2 = w * Math.max(0, hp) / max;
          scene.tweens.add({ targets: [fill, shine], width: tw2, duration: 260, ease: 'Quad.out' });
          scene.tweens.add({ targets: ghost, width: tw2, duration: 500, delay: 420, ease: 'Quad.inOut' });
          val.setText('PEP ' + Math.max(0, hp));
          scene.tweens.add({ targets: c, scale: { from: 1.07, to: 1 }, duration: 260, ease: 'Back.out' });
          fill.fillColor = hp < max * 0.3 ? C.coral : color;
        },
      };
    }
    actionCard(x, y, w, h, a) {
      const c = this.add.container(x, y).setDepth(30);
      const g = this.add.graphics();
      const R = Math.min(34, h / 4);
      // look: 'on', 'off' (wait for your turn) or 'used'. The card stays opaque and gets its own flat colour:
      // a see-through card showed its shadow and highlight as strips at the top (owner's device notes, 4 Oct 2026)
      let look = 'on';
      const draw = (pressed) => {
        g.clear();
        const on = look === 'on';
        g.fillStyle(0x000000, on ? 0.3 : 0.18); g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 10), w, h, R);
        g.fillStyle(on ? C.cream : look === 'off' ? 0xd8d1e4 : 0xa49ec0); g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 6 : 0), w, h, R);
        if (on) { g.fillStyle(0xffffff, 0.45); g.fillRoundedRect(-w / 2 + 14, -h / 2 + 9 + (pressed ? 6 : 0), w - 28, Math.min(22, h * 0.13), 11); }
      };
      draw(false);
      const compact = h < 150;
      const V = !compact && w < 400;
      let L;
      // icon fully inside the card, with room for the wobble (owner's device notes: icons almost spilled out)
      if (V) { const isz = Math.min(80, h * 0.44); L = { ix: 0, iy: Math.min(-h / 2 + isz / 2 + 14, -28), tx: 0, t1y: 26, t2y: 66, ox: 0.5, f1: 32, f2: 25, isz, tw: w - 30 }; }
      else if (compact) L = { ix: -w / 2 + 58, iy: 0, tx: -w / 2 + 110, t1y: -18, t2y: 22, ox: 0, f1: 30, f2: 22, isz: 72, tw: w - 125 };
      else L = { ix: -w / 2 + (PORTRAIT ? 72 : 85), iy: 0, tx: -w / 2 + (PORTRAIT ? 140 : 165), t1y: -24, t2y: 26, ox: 0, f1: PORTRAIT ? 35 : 36, f2: PORTRAIT ? 28 : 27, isz: PORTRAIT ? 96 : 100, tw: w - (PORTRAIT ? 155 : 180) };
      const ik = a.icon || 'pillow';
      const ic = img(this, L.ix, L.iy, ik); ic.setScale(iconScale(ik, L.isz));
      if (ic.displayHeight > L.isz) ic.setScale(ic.scaleX * L.isz / ic.displayHeight); // tall icons (Warm Milk) stay in their slot (QA B39)
      const t1 = fit(txt(this, L.tx, L.t1y, a.title, L.f1, C.ink, { ox: L.ox, st: 0, shadow: false }), L.tw);
      const t2 = txt(this, L.tx, L.t2y, a.sub || '', L.f2, '#4a4f8c', { ox: L.ox, st: 0, shadow: false, weight: '500' });
      const used = txt(this, 0, 0, 'USED', compact ? 46 : 60, '#ff6b5b', { stroke: '#fff3d2', st: 8 }).setAngle(-12).setVisible(false);
      // a card the Mothership's tractor beam took: small UFO + BEAMED UP stamp until the end of the duel
      const ufo = this.add.image(w / 2 - 34, -h / 2 + 30, 'ufo').setScale(iconScale('ufo', 52)).setAngle(12).setVisible(false);
      c.add([g, ic, t1, t2, used, ufo]);
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: ic, angle: { from: -6, to: 6 }, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      c.on('pointerdown', () => { if (!c.enabled) return; A.init(); draw(true); ic.y = L.iy + 6; t1.y = L.t1y + 6; t2.y = L.t2y + 6; });
      const up = () => { draw(false); ic.y = L.iy; t1.y = L.t1y; t2.y = L.t2y; };
      c.on('pointerout', up);
      c.on('pointerup', () => { up(); if (c.enabled) this.playerMove(a.k); });
      c.refresh = (on) => {
        const left = a.uses ? a.uses - (this.hero.used[a.k] || 0) : Infinity;
        const beamed = (this.hero.beamed || []).includes(a.k);
        const isUsed = left <= 0 || beamed;
        t2.setText(a.uses ? (a.sub || '') + ' · ' + (beamed ? 'beamed up' : isUsed ? 'used' : (a.uses === 1 ? 'once' : left + ' left')) : (a.sub || ''));
        fit(t2.setScale(1), L.tw);
        c.enabled = on && !isUsed; look = c.enabled ? 'on' : isUsed ? 'used' : 'off'; draw(false);
        [ic, t1, t2].forEach(o => o.setAlpha(look === 'on' ? 1 : look === 'off' ? 0.7 : 0.45));
        used.setText(beamed ? 'BEAMED UP' : 'USED').setScale(1).setVisible(isUsed); fit(used, w - 70); ufo.setVisible(beamed);
      };
      return c;
    }
    setCards(on) {
      this.moves.forEach(m => m.card.refresh(on && !this.over));
      if (this.blockBtn) {
        const cur = on && !this.over ? this.rival.charging : null, slap = !!(cur && cur.type === 'slapshot');
        const ch = slap ? null : cur, beam = !!(ch && ch.type === 'beam');
        // SLAPSHOT has no block button: the save is a timed tap when the shot comes
        if (this.saveChip) this.saveChip.setVisible(slap);
        const one = !!(ch && this.easy && !ch.mini), two = !!(ch && !this.easy && !ch.mini);
        this.blockBtn.setVisible(one); this.blockBtn.icon.setTexture(beam ? 'umbrella' : 'extinguisher').setScale(iconScale(beam ? 'umbrella' : 'extinguisher', 118));
        this.extBtn.setVisible(two);
        this.umbBtn.setVisible(two || !!(ch && ch.mini));
        // the buttons sit where the HARD / booster chips are on iPad and phone landscape: hide the chips meanwhile (QA B48)
        const btns = one || two || !!(ch && ch.mini);
        [this.diffChip, this.boostChip].forEach(o => o && o.setVisible(!btns));
        if (this.boostChip && slap) this.boostChip.setVisible(false);
        // HARD: the two buttons swap sides at random each charge (this.toolSwap is set in startCharge)
        const dx = 230, sw = this.toolSwap ? -1 : 1;
        this.extBtn.x = W / 2 - dx * sw; this.umbBtn.x = two ? W / 2 + dx * sw : W / 2;
      }
    }
    log(s) {
      this.logT.setText(s);
      this.tweens.add({ targets: this.logT, scale: { from: 1.12, to: 1 }, alpha: { from: 0.4, to: 1 }, duration: 260, ease: 'Back.out' });
    }
    banner(s, color) {
      const y = PORTRAIT ? H * 0.35 : H * 0.42;
      const c = this.add.container(W / 2, y).setDepth(45);
      const t = fit(txt(this, 0, 0, s, 64, C.ink, { st: 0, shadow: false }), W * 0.8);
      const w = t.displayWidth + 120;
      const g = this.add.graphics(); g.fillStyle(color); g.fillRoundedRect(-w / 2, -55, w, 110, 55);
      g.lineStyle(6, 0xffffff); g.strokeRoundedRect(-w / 2, -55, w, 110, 55);
      c.add([g, t]); c.setScale(0); A.turn();
      this.tweens.chain({ targets: c, tweens: [{ scale: 1, duration: 260, ease: 'Back.out' }, { scale: 1, duration: 650 }, { scale: 0, alpha: 0, duration: 200, ease: 'Quad.in' }], onComplete: () => c.destroy() });
    }
    number(x, y, s, color, size = 120) {
      const t = txt(this, x, y, s, size, color, { stroke: '#0f1240', st: 16 }).setDepth(42).setScale(0);
      this.tweens.add({ targets: t, scale: { from: 0, to: 1 }, duration: 260, ease: 'Back.out' });
      this.tweens.add({ targets: t, y: y - 170, alpha: 0, duration: 900, delay: 450, ease: 'Quad.in', onComplete: () => t.destroy() });
    }
    popWord(x, y, s, color, size = 80, angle = 0) {
      const t = fit(txt(this, x, y, s, size, color, { stroke: '#0f1240', st: 12 }), W * 0.6).setDepth(41).setAngle(angle);
      const sc = t.scale; t.setScale(0);
      this.tweens.add({ targets: t, scale: sc, duration: 220, ease: 'Back.out' });
      this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 500, delay: 650, onComplete: () => t.destroy() });
      return t;
    }
    async hitStop(ms) { this.tweens.pauseAll(); await new Promise(r => setTimeout(r, ms)); if (this.sys && this.sys.isActive()) this.tweens.resumeAll(); }
    // raw: a fixed hit (the SAVE IT! bounce-back): no boosters, no shield
    async impact(target, dmg, kind = 'pillow', quiet = false, raw = false) {
      const p = target.center();
      // boosters that make the hero's hits stronger
      if (target === this.rival && dmg > 0 && !raw) {
        if (this.hero.bonus) dmg += this.hero.bonus;
        if (this.hero.firstBonus) { dmg += this.hero.firstBonus; this.hero.firstBonus = 0; this.popWord(p.x, p.y - 300, 'ROCKET START!', '#ff8a3d', 64, 6); }
      }
      if (target.shield && dmg > 0 && !raw) {
        dmg = Math.ceil(dmg / 2); target.shield = false; this.setStatus(target);
        A.block(); this.popWord(p.x, p.y - 220, 'BLOCKED!', '#9fdcff', 70, -6);
      }
      const crit = dmg >= 20;
      A.thump(crit ? 1.3 : (quiet ? 0.6 : 0.9)); buzz(crit ? 60 : 30);
      target.spr.setTintFill(0xffffff);
      this.time.delayedCall(90, () => target.spr.clearTint());
      this.sparks.explode(crit ? 26 : (quiet ? 8 : 14), p.x, p.y);
      if (kind !== 'roar' && kind !== 'fire') this.feathers.explode(quiet ? 5 : 8 + Math.round(dmg / 2), p.x, p.y - 20);
      const ring = this.add.image(p.x, p.y, 'ring').setDepth(22).setScale(0.3).setAlpha(0.9);
      this.tweens.add({ targets: ring, scale: crit ? 2.6 : 1.8, alpha: 0, duration: 380, ease: 'Quad.out', onComplete: () => ring.destroy() });
      this.cameras.main.shake(crit ? 320 : 180, crit ? 0.014 : (quiet ? 0.004 : 0.006));
      if (crit) { A.crit(); this.cameras.main.zoomTo(1.05, 90); this.time.delayedCall(260, () => this.cameras.main.zoomTo(1, 260)); }
      await this.hitStop(crit ? 130 : 60);
      target.hp = Math.max(0, target.hp - dmg); target.bar.set(target.hp, this);
      this.number(p.x + (quiet ? rnd(-60, 60) : 0), p.y - 120, '-' + dmg, target === this.rival ? '#ffd23f' : '#ff6b5b', quiet ? 90 : 120);
      if (crit) this.popWord(p.x + (target.dir > 0 ? -150 : 150), p.y - 260, 'CRIT!', '#ff6b5b', 76, -10);
      const kb = -target.dir * (crit ? 90 : 50);
      this.tweens.add({ targets: target.squash, scaleX: 1.18, scaleY: 0.82, duration: 70, yoyo: true, ease: 'Quad.out' });
      await tw(this, { targets: target.root, x: target.root.x + kb, angle: -target.dir * (crit ? 10 : 5), duration: 110, ease: 'Quad.out' });
      await tw(this, { targets: target.root, x: target.home, angle: 0, duration: 420, ease: 'Elastic.out', easeParams: [1, 0.5] });
    }
    heal(f, n) {
      A.heal(); this.heals.explode(40, f.root.x, f.root.y - 40);
      f.hp = Math.min(f.max, f.hp + n); f.bar.set(f.hp, this);
      this.number(f.center().x, f.center().y - 140, '+' + n, '#7fe39a');
    }
    async lunge(f, dist, dur = 160) {
      await tw(this, { targets: f.squash, scaleX: 0.9, scaleY: 1.08, duration: 120, ease: 'Quad.out' });
      this.tweens.add({ targets: f.squash, scaleX: 1.08, scaleY: 0.94, duration: dur, yoyo: true });
      await tw(this, { targets: f.root, x: f.root.x + f.dir * dist, duration: dur, ease: 'Back.out' });
    }
    async back(f) { await tw(this, { targets: f.root, x: f.home, y: this.groundY, duration: 380, ease: 'Quad.inOut' }); }
    projScale(tex) { return tex === 'pillow' ? 0.95 : tex === 'books' ? 0.5 : iconScale(tex, 120); }
    async throwThing(from, to, tex = 'pillow', dur = 420) {
      const a = from.front(), b = to.center();
      const pil = img(this, a.x, a.y, tex).setDepth(25).setScale(this.projScale(tex));
      A.whoosh();
      const trail = this.add.particles(0, 0, 'feather', { follow: pil, frequency: 45, lifespan: 500, scale: { start: 0.35, end: 0 }, alpha: { start: 0.8, end: 0 }, speed: 40, rotate: { min: 0, max: 360 } }).setDepth(24);
      const o = { t: 0 };
      await tw(this, { targets: o, t: 1, duration: dur, ease: 'Sine.in', onUpdate: () => {
        pil.x = a.x + (b.x - a.x) * o.t; pil.y = a.y + (b.y - a.y) * o.t - Math.sin(Math.PI * o.t) * 220; pil.angle = from.dir * o.t * 540;
      } });
      trail.stop(); this.time.delayedCall(600, () => trail.destroy());
      pil.destroy();
    }
    async tickleRun(att, def, d) {
      const tx = def.root.x - att.dir * (PORTRAIT ? 300 : 360);
      A.whoosh();
      await tw(this, { targets: att.root, x: tx, y: this.groundY - 60, duration: 330, ease: 'Quad.out' });
      await tw(this, { targets: att.root, y: this.groundY, duration: 160, ease: 'Quad.in' });
      A.tickle();
      const words = ['tickle!', 'hehe', 'tickle!'];
      for (let i = 0; i < 3; i++) {
        this.popWord(def.center().x + rnd(-120, 120), def.center().y - 150 - i * 50, words[i], i % 2 ? '#ff9ed8' : '#fff3d2', 56, rnd(-15, 15));
        this.tweens.add({ targets: att.squash, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 1 });
        await tw(this, { targets: def.root, angle: i % 2 ? 7 : -7, duration: 90, yoyo: true });
      }
      att.squash.setAngle(0);
      A.giggle();
      await this.impact(def, d, 'tickle');
      await this.back(att);
    }
    sfx(name) { const f = A[name]; if (typeof f === 'function') f.call(A); else A.roar(); }
    async rings(att, def, color, word, sound) {
      this.sfx(sound || 'roar'); buzz(80);
      this.tweens.add({ targets: att.squash, scaleX: 1.18, scaleY: 1.18, duration: 200, yoyo: true, hold: 500 });
      const c = att.front();
      this.popWord(c.x - att.dir * 60, c.y - 160, word, '#' + color.toString(16).padStart(6, '0'), word.length > 8 ? 84 : 110, 8);
      for (let i = 0; i < 4; i++) {
        const ring = this.add.image(c.x, c.y, 'ring').setDepth(22).setTint(color).setScale(0.4).setAlpha(0.9);
        this.tweens.add({ targets: ring, x: def.center().x - att.dir * 80, scale: 2.2, alpha: 0, duration: 650, delay: i * 120, onComplete: () => ring.destroy() });
      }
      this.cameras.main.shake(700, 0.006);
      await wait(this, 600);
    }
    async makeDizzy(att, def, color, word) {
      A.dizzy();
      const c = att.front(), t = def.center();
      for (let i = 0; i < 6; i++) {
        const ring = this.add.image(c.x, c.y, 'ring').setDepth(22).setTint(color).setScale(0.25).setAlpha(0.95);
        this.tweens.add({ targets: ring, x: t.x, y: t.y - 60, scale: 1.4, angle: 180, alpha: 0.1, duration: 600, delay: i * 90, onComplete: () => ring.destroy() });
      }
      await wait(this, 750);
      this.tweens.add({ targets: def.root, angle: { from: -10, to: 10 }, duration: 160, yoyo: true, repeat: 3, onComplete: () => def.root.setAngle(0) });
      def.dizzy = true; this.setStatus(def);
      this.popWord(t.x, t.y - 230, word || 'DIZZY!', '#ffd23f', 76, 6);
      await wait(this, 700);
    }
    async flipNap(f, on) {
      if (f.hat) f.hat.setVisible(!on);
      if (f.napTex) {
        await tw(this, { targets: f.squash, scaleX: 0, duration: 130, ease: 'Quad.in' });
        f.spr.setTexture(on ? f.napTex : f.key);
        await tw(this, { targets: f.squash, scaleX: 1, duration: 200, ease: 'Back.out' });
      } else {
        await tw(this, { targets: f.squash, angle: on ? 180 : 0, y: on ? -f.height() : 0, duration: 380, ease: 'Back.out' });
      }
    }

    // ---- the move engine: every move is data with a type
    async doMove(m, att, def) {
      const pl = def === this.rival && this.R.plural; // "Blips get dizzy" (QA B46)
      const L = s => this.log((pl ? s.replace(/\{d\} gets/g, '{d} get').replace(/\{d\} is /g, '{d} are ') : s).replace(/\{a\}/g, att.name).replace(/\{d\}/g, def.name));
      const DEF_LOG = { throw: '{a} uses ' + m.title + '!', tickle: '{a} sneaks in for a tickle!', heal: '{a} takes a snack break!', shield: '{a} hides behind a shield. Next hit only does half!', nap: '{a} takes a quick upside-down nap!' };
      L(m.log || DEF_LOG[m.type] || ('{a}: ' + (m.title || 'Here I come') + '!'));
      const d = m.dmg ? rnd(m.dmg[0], m.dmg[1]) : 0;
      switch (m.type) {
        case 'throw': await this.lunge(att, 60); await this.throwThing(att, def, m.tex || 'pillow'); await this.impact(def, d); await this.back(att); break;
        case 'tickle': await this.tickleRun(att, def, d); break;
        case 'roar': await this.rings(att, def, m.color || 0xffb36b, m.word || 'RAWR!', m.sound); await this.impact(def, d, 'roar'); break;
        case 'spray': {
          if (m.inhale) { A.inhale(); await tw(this, { targets: att.squash, scaleX: 1.12, scaleY: 1.12, duration: 520, ease: 'Sine.in' }); }
          const f = att.front();
          this.sfx(m.sound || 'whoosh'); buzz(40);
          this.popWord(f.x + att.dir * 60, f.y - 120, m.word || 'WHOOSH!', '#9fe3ff', 96, -8 * att.dir);
          this.tweens.add({ targets: att.squash, scaleX: 0.92, scaleY: 0.95, duration: 120, yoyo: true });
          this.tweens.add({ targets: att.squash, scaleX: 1, scaleY: 1, duration: 200, delay: 240 });
          const ang = Phaser.Math.RadToDeg(Math.atan2(def.center().y - f.y, def.center().x - f.x));
          const tex = m.tex || 'snow'; const atlas = tex.startsWith('i:') ? 'icons' : tex.startsWith('j:') ? 'icons2' : null;
          const cfg = { speed: { min: 900, max: 1500 }, angle: { min: ang - 14, max: ang + 14 }, lifespan: 650, scale: { start: this.projScale(tex) * 0.35, end: this.projScale(tex) * 0.12 }, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0.3 }, frequency: 14 };
          if (atlas) cfg.frame = tex.slice(2);
          if (m.tint) cfg.tint = m.tint;
          if (tex === 'dot') cfg.scale = { start: 0.5, end: 0.2 };
          const cone = this.add.particles(f.x, f.y, atlas || tex, cfg).setDepth(26);
          await wait(this, 420); cone.stop(); this.time.delayedCall(800, () => cone.destroy());
          await this.impact(def, d, 'spray');
          const ht = m.hitTint || (tex === 'snow' ? 0x9fdcff : 0);
          if (ht) { def.spr.setTint(ht); this.time.delayedCall(1100, () => def.spr.clearTint()); }
          break;
        }
        case 'nap': {
          await this.flipNap(att, true);
          this.tweens.add({ targets: att.root, y: this.groundY - 70, duration: 600, yoyo: true, hold: 900, ease: 'Sine.inOut' });
          A.snore();
          for (let i = 0; i < 3; i++) {
            const z = this.add.image(att.root.x + att.dir * (110 + i * 30), att.root.y - att.height() * 0.85, 'zzz').setScale(0.25 + i * 0.07).setDepth(26).setAlpha(0);
            this.tweens.add({ targets: z, y: z.y - 230, x: z.x + 80 * att.dir, alpha: { from: 1, to: 0 }, duration: 1500, delay: i * 330, ease: 'Sine.out', onComplete: () => z.destroy() });
          }
          await wait(this, 700); this.heal(att, m.amt || 30); await wait(this, 1000);
          await this.flipNap(att, false);
          break;
        }
        case 'heal': {
          const f = att.front();
          const food = img(this, f.x + att.dir * 140, f.y - 40, m.tex || 'dumpling').setScale(0).setDepth(26);
          await tw(this, { targets: food, scale: this.projScale(m.tex || 'dumpling') * 0.6, angle: 360, duration: 420, ease: 'Back.out' });
          await tw(this, { targets: food, x: f.x, y: f.y, scale: 0.15, duration: 260, ease: 'Quad.in' });
          food.destroy(); A.gulp();
          this.tweens.add({ targets: att.squash, scaleX: 1.15, scaleY: 0.88, duration: 120, yoyo: true, repeat: 2 });
          this.popWord(f.x + att.dir * 30, f.y - 140, 'NOM!', '#ffd23f', 90, -8);
          await wait(this, 400); this.heal(att, m.amt || 20); await wait(this, 600);
          break;
        }
        case 'shield': {
          A.block(); att.shield = true; this.setStatus(att);
          this.tweens.add({ targets: att.squash, scaleX: 0.92, scaleY: 1.06, duration: 160, yoyo: true });
          await wait(this, 900); break;
        }
        case 'dance': {
          A.dance();
          const sx = att.root.x;
          for (let i = 0; i < 4; i++) {
            this.notes.explode(3, att.root.x, att.root.y - att.height() * 0.8);
            const wd = m.words || ['SIX!', 'SEVEN!'];
            if (i === 1) this.popWord(att.root.x - 60, att.root.y - att.height() - 40, wd[0], '#ff9ed8', 90, -10);
            if (i === 3) this.popWord(att.root.x + 80, att.root.y - att.height() - 40, wd[1], '#7fd6c2', 90, 10);
            await tw(this, { targets: att.root, x: sx + (i % 2 ? 40 : -40), y: this.groundY - 60, angle: i % 2 ? 12 : -12, duration: 170, ease: 'Quad.out' });
            await tw(this, { targets: att.root, y: this.groundY, duration: 140, ease: 'Quad.in' });
          }
          await tw(this, { targets: att.root, x: sx, angle: 0, duration: 150 });
          await this.makeDizzy(att, def, 0xff9ed8);
          break;
        }
        case 'dizzy': {
          if (m.sound) this.sfx(m.sound);
          if (m.tex) { await this.throwThing(att, def, m.tex, 380); }
          else this.tweens.add({ targets: att.root, angle: { from: -8, to: 8 }, duration: 260, yoyo: true, repeat: 2, onComplete: () => att.root.setAngle(0) });
          await this.makeDizzy(att, def, m.color || 0xb38cff, m.word);
          break;
        }
        case 'multi': {
          A.spin();
          const tx = def.root.x - att.dir * (PORTRAIT ? 300 : 360);
          await Promise.all([tw(this, { targets: att.root, x: tx, duration: 380, ease: 'Quad.in' }), tw(this, { targets: att.squash, angle: 720 * att.dir, duration: 380 })]);
          att.squash.setAngle(0);
          for (let i = 0; i < (m.hits || 3); i++) {
            if (def.hp <= 0) break;
            this.tweens.add({ targets: att.squash, angle: 360 * att.dir, duration: 220, onComplete: () => att.squash.setAngle(0) });
            await this.impact(def, rnd(m.dmg[0], m.dmg[1]), 'pillow', true);
          }
          await this.back(att); break;
        }
        case 'quake': {
          this.sfx(m.sound || 'stomp');
          if (m.jump) {
            // "Cannot into space!": rockets up off the screen, wobbles... and falls right onto the target
            this.tweens.add({ targets: att.squash, scaleX: 0.85, scaleY: 1.15, duration: 200, yoyo: true });
            await tw(this, { targets: att.root, y: -200, duration: 650, ease: 'Quad.out' });
            this.popWord(W / 2, PORTRAIT ? H * 0.2 : H * 0.18, m.word || 'CANNOT!', m.color ? '#' + m.color.toString(16).padStart(6, '0') : '#ff4d6d', 84, -6);
            A.dizzy(); await wait(this, 750);
            att.root.x = def.root.x; att.root.y = -250;
            await tw(this, { targets: att.root, y: def.root.y - def.height() * 0.6, angle: 360, duration: 420, ease: 'Quad.in' });
            att.root.setAngle(0);
            this.tweens.add({ targets: def.squash, scaleX: 1.3, scaleY: 0.65, duration: 120, yoyo: true });
            await this.impact(def, d, 'roar');
            A.bounce();
            await tw(this, { targets: att.root, x: att.home, y: this.groundY - 260, duration: 300, ease: 'Quad.out' });
            await tw(this, { targets: att.root, y: this.groundY, duration: 220, ease: 'Bounce.out' });
            break;
          }
          await tw(this, { targets: att.root, y: this.groundY - 220, duration: 320, ease: 'Quad.out' });
          await tw(this, { targets: att.root, y: this.groundY, duration: 180, ease: 'Quad.in' });
          A.stomp(); buzz(90);
          if (m.word) this.popWord(att.root.x, this.groundY - att.height() - 60, m.word, m.color ? '#' + m.color.toString(16).padStart(6, '0') : '#d8ecff', 84, -6);
          this.cameras.main.shake(450, 0.016);
          this.dust.explode(26, att.root.x - 120, this.groundY); this.dust.explode(26, att.root.x + 120, this.groundY);
          this.tweens.add({ targets: att.squash, scaleX: 1.2, scaleY: 0.8, duration: 90, yoyo: true });
          await tw(this, { targets: def.root, y: this.groundY - 150, duration: 220, ease: 'Quad.out', yoyo: true });
          await this.impact(def, d, 'roar'); break;
        }
        case 'rush': {
          A.whoosh();
          await tw(this, { targets: att.squash, scaleX: 0.9, scaleY: 1.08, duration: 140 });
          await tw(this, { targets: att.root, x: def.root.x - att.dir * (PORTRAIT ? 330 : 400), duration: 260, ease: 'Quad.in' });
          this.tweens.add({ targets: att.squash, scaleX: 1.15, scaleY: 0.9, angle: 12 * att.dir, duration: 120, yoyo: true });
          if (m.word) this.popWord(def.center().x, def.center().y - 220, m.word, '#fff3d2', 84, rnd(-10, 10));
          await this.impact(def, d);
          att.squash.setScale(1); await this.back(att); break;
        }
        case 'rain': await this.rain(m, att, def, d); break;
        case 'beam': await this.beam(m, att, def, d); break;
        case 'slapshot': await this.slapshot(m, att, def, d); break;
        case 'hop': {
          const sx = att.root.x, tx = def.root.x - att.dir * (PORTRAIT ? 330 : 400);
          for (let i = 1; i <= 3; i++) {
            A.tone && A.tone(400 + i * 150, 0.12, { type: 'triangle', vol: 0.15, slide: 1.6 });
            await tw(this, { targets: att.root, x: sx + (tx - sx) * i / 3, y: this.groundY - 160, duration: 180, ease: 'Quad.out' });
            await tw(this, { targets: att.root, y: this.groundY, duration: 150, ease: 'Quad.in' });
            this.tweens.add({ targets: att.squash, scaleX: 1.15, scaleY: 0.85, duration: 80, yoyo: true });
          }
          this.popWord(def.center().x, def.center().y - 220, m.word || 'BOING!', '#7fd6c2', 84, -8);
          await this.impact(def, d); await this.back(att); break;
        }
        case 'volley': {
          if (m.sound) this.sfx(m.sound);
          if (m.word) this.popWord(att.front().x - att.dir * 80, att.front().y - 170, m.word, '#ffe08a', 72, 6);
          const per = Math.ceil(d / 3);
          for (let i = 0; i < 3; i++) {
            await this.throwThing(att, def, m.tex || 'books', 300);
            await this.impact(def, i < 2 ? per : Math.max(1, d - per * 2), 'pillow', true);
            if (def.hp <= 0) break;
          }
          break;
        }
        default: await this.lunge(att, 60); await this.impact(def, d || 12); await this.back(att);
      }
    }

    async playerMove(k) {
      if (this.busy || this.over) return;
      const m = this.moves.find(x => x.k === k); if (!m || (this.hero.beamed || []).includes(k)) return;
      this.busy = true; this.acted = true; this.setCards(false);
      const P = this.hero, T = this.rival;
      P.used[k] = (P.used[k] || 0) + 1;
      emit('move', { k, type: m.type }, this);
      await this.doMove(m, P, T);
      if (this.checkEnd()) return;
      await this.afterPlayer();
    }
    async afterPlayer() {
      const P = this.hero;
      await this.rivalTurn();
      if (this.checkEnd()) return;
      await wait(this, 250);
      if (P.dizzy) {
        P.dizzy = false;
        this.banner(P.name.toUpperCase() + ' IS DIZZY!', C.coral);
        this.log(P.name + ' is too dizzy... skips this turn!');
        await tw(this, { targets: P.root, angle: { from: -12, to: 12 }, duration: 180, yoyo: true, repeat: 3, onComplete: () => P.root.setAngle(0) });
        this.setStatus(P);
        await wait(this, 900);
        await this.rivalTurn();
        if (this.checkEnd()) return;
        await wait(this, 250);
      }
      this.banner('YOUR TURN', C.star);
      this.busy = false; this.setCards(true);
      // a rotation that happened during the turn is applied now (QA B02)
      if (window.__psRotatePending) this.time.delayedCall(60, () => window.__psTryRebuild && window.__psTryRebuild());
    }
    async rivalTurn() {
      await this.rivalTurn0();
      if (!this.rival.charging) this.dropExtinguisher();
    }
    async rivalTurn0() {
      const T = this.rival;
      await wait(this, 450);
      this.banner(T.name.toUpperCase() + (/s$/i.test(T.name) ? '\' TURN' : '\'S TURN'), this.R.color === 0xf2f2f7 ? C.cream : this.R.color);
      await wait(this, 1100);
      if (T.dizzy) {
        T.dizzy = false; this.setStatus(T);
        const is = this.R.plural ? ' are' : ' is'; // the Blips are three (QA B46)
        if (T.charging && T.charging.type === 'slapshot' && this.hard) {
          // HARD: Six-Seven only delays the shot, the wind-up stays
          this.log(T.name + is + ' too dizzy... the SLAPSHOT waits one turn!');
        } else if (T.charging && T.charging.type === 'slapshot') {
          this.endCharge(T); T.afterCharge = true;
          this.log(T.name + is + ' too dizzy... ' + (this.R.plural ? 'they drop' : 'and drops') + ' the puck!');
        } else if (T.charging) {
          const beam = T.charging.type === 'beam';
          this.endCharge(T); T.afterCharge = true; A.steam();
          this.log(T.name + is + (beam ? ' too dizzy... the beam goes disco and fizzles!' : ' too dizzy... the fire fizzles out!'));
        }
        else this.log(T.name + is + ' too dizzy to move!');
        A.dizzy();
        await tw(this, { targets: T.root, angle: { from: -12, to: 12 }, duration: 180, yoyo: true, repeat: 2, onComplete: () => T.root.setAngle(0) });
        await wait(this, 500); return;
      }
      if (T.charging) { T.afterCharge = true; await this.doMove(T.charging, T, this.hero); return; }
      const m = this.pickMove();
      T.used[m.k] = (T.used[m.k] || 0) + 1; T.lastType = m.type; T.afterCharge = false;
      if (m.charge) { await this.startCharge(m, T); return; }
      await this.doMove(m, T, this.hero);
    }
    pickMove() {
      const T = this.rival, P = this.hero;
      const ok = this.rmoves.filter(m => {
        if (m.uses && (T.used[m.k] || 0) >= m.uses) return false;
        if (m.type === 'heal' || m.type === 'nap') return T.hp < T.max * 0.65;
        if (m.type === 'shield') return !T.shield;
        if (m.type === 'dizzy' || m.type === 'dance') return !P.dizzy && T.lastType !== m.type;
        if (m.charge) return T.lastType !== m.type && !T.afterCharge; // never two charged moves in a row
        return true;
      });
      const pool = ok.length ? ok : this.rmoves.filter(m => m.dmg && !m.charge);
      // a little smarter: go for the finish, avoid hitting a shield, heal when really low
      const wOf = m => {
        let w = m.w;
        if (!this.smart) return w;
        if (m.dmg && !m.charge && P.hp <= m.dmg[0] && !P.shield) w *= 4;
        if (m.dmg && P.shield) w *= 0.5;
        if ((m.type === 'heal' || m.type === 'nap') && T.hp < T.max * 0.35) w *= 2.5;
        return w;
      };
      const sum = pool.reduce((s, m) => s + wOf(m), 0); let r = Math.random() * sum;
      for (const m of pool) { r -= wOf(m); if (r <= 0) return m; }
      return pool[0];
    }

    // ---- Inferno Rain: a rival gathers fire for a turn, then fireballs fall from the sky.
    // Block it with the fire extinguisher (or, for rivals, with milk!)
    chargeFx(T) {
      const beam = T.charging && T.charging.type === 'beam';
      if (T.charging && T.charging.type === 'slapshot') {
        // SLAPSHOT wind-up: frosty tint, snowflakes rising around the rival
        this.fireFx.fillColor = 0x9fdcff;
        this.tweens.add({ targets: this.fireFx, fillAlpha: 0.14, duration: 600 });
        this.chargeTw = this.tweens.add({ targets: this.fireFx, fillAlpha: 0.06, duration: 800, yoyo: true, repeat: -1, delay: 600 });
        T.spr.setTint(0xcfeaff);
        this.embers = this.add.particles(0, 0, 'snow', { x: { min: T.root.x - 160, max: T.root.x + 160 }, y: T.root.y - 20, speedY: { min: -360, max: -160 }, speedX: { min: -50, max: 50 }, lifespan: 1300, scale: { start: 0.14, end: 0 }, rotate: { min: 0, max: 360 }, frequency: 90 }).setDepth(12);
        return;
      }
      this.fireFx.fillColor = beam ? 0xc8ff3d : 0xff3b1f;
      this.tweens.add({ targets: this.fireFx, fillAlpha: beam ? 0.2 : 0.3, duration: 600 });
      this.chargeTw = this.tweens.add({ targets: this.fireFx, fillAlpha: beam ? 0.08 : 0.14, duration: 700, yoyo: true, repeat: -1, delay: 600 });
      if (beam) {
        // Tractor Beam: a yellow-green spotlight from the saucer sweeps over the ground in front of the hero
        T.spr.setTint(0xe6ffb0);
        const sx = T.root.x, sy = T.root.y - T.height() * 0.4, gy = this.groundY + 10, P = this.hero;
        const g = this.beamSpot = this.add.graphics().setDepth(9).setAlpha(0.5);
        const draw = (cx) => { g.clear(); g.fillStyle(0xd8ff6a, 0.55); g.fillTriangle(sx, sy, cx - 120, gy, cx + 120, gy); g.fillStyle(0xffffff, 0.35); g.fillEllipse(cx, gy, 250, 50); };
        const o = { x: P.root.x + 160 };
        draw(o.x);
        this.beamSweep = this.tweens.add({ targets: o, x: P.root.x - 120, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', onUpdate: () => draw(o.x) });
        this.tweens.add({ targets: g, alpha: 0.85, duration: 500, yoyo: true, repeat: -1 });
        this.embers = this.add.particles(0, 0, 'dot', { x: { min: sx - 100, max: sx + 100 }, y: sy, speedY: { min: -200, max: 200 }, speedX: { min: -200, max: 200 }, lifespan: 700, scale: { start: 0.3, end: 0 }, tint: [0xd8ff6a, 0xffffff, 0x8cff7a], blendMode: 'ADD', frequency: 60 }).setDepth(12);
        return;
      }
      T.spr.setTint(0xffb08a);
      this.embers = this.add.particles(0, 0, 'dot', { x: { min: T.root.x - 150, max: T.root.x + 150 }, y: T.root.y - 20, speedY: { min: -520, max: -260 }, speedX: { min: -60, max: 60 }, lifespan: 1100, scale: { start: 0.35, end: 0 }, tint: [0xff6b2b, 0xffd23f, 0xff3b1f], blendMode: 'ADD', frequency: 40 }).setDepth(12);
    }
    async startCharge(m, T) {
      T.charging = m;
      if (m.type === 'slapshot') {
        this.log(T.name + ' winds up a ' + (m.mini ? 'mini ' : '') + 'SLAPSHOT! Get ready to SAVE IT!');
        A.slide();
        this.chargeFx(T);
        await tw(this, { targets: T.squash, angle: -14 * T.dir, scaleX: 1.06, duration: 600, ease: 'Sine.in' });
        this.popWord(T.center().x, T.center().y - 240, 'WINDING UP...', '#d8ecff', 60, 6);
        await tw(this, { targets: T.squash, angle: 0, scaleX: 1, duration: 300 });
        await wait(this, 600);
        return;
      }
      this.toolSwap = this.hard && Math.random() < 0.5;
      const beam = m.type === 'beam';
      const tap = m.mini ? ' Grab the UMBRELLA!' : this.easy ? ' Tap BLOCK IT!' : ' Pick your tool!';
      if (beam) {
        this.log((m.mini ? 'Tiny beam! ' + T.name + ' point a teeny tractor beam...' : T.name + ' warms up the TRACTOR BEAM!' + (this.easy ? '' : ' The beam takes a card if it hits.')) + tap); // (QA B49)
        A.beam();
      } else {
        this.log(T.name + ' takes a deep breath... the sky turns red! INFERNO RAIN is coming!' + tap);
        A.inhale(); this.time.delayedCall(350, () => A.fire());
      }
      this.chargeFx(T);
      await tw(this, { targets: T.squash, scaleX: 1.12, scaleY: 1.12, duration: 600, ease: 'Sine.in' });
      this.popWord(T.center().x, T.center().y - 240, beam ? 'WARMING UP THE BEAM...' : 'GATHERING FIRE...', beam ? '#d8ff6a' : '#ff8a3d', beam ? 56 : 64, 6);
      await tw(this, { targets: T.squash, scaleX: 1, scaleY: 1, duration: 300 });
      await wait(this, 600);
    }
    endCharge(T) {
      T.charging = null; T.spr.clearTint();
      if (this.chargeTw) { this.chargeTw.stop(); this.chargeTw = null; }
      if (this.embers) { const e = this.embers; e.stop(); this.time.delayedCall(1200, () => e.destroy()); this.embers = null; }
      if (this.beamSweep) { this.beamSweep.stop(); this.beamSweep = null; }
      if (this.beamSpot) { const g = this.beamSpot; this.beamSpot = null; this.tweens.killTweensOf(g); this.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() }); }
      this.tweens.add({ targets: this.fireFx, fillAlpha: 0, duration: 500 });
    }
    // tool: 'ext' (fire extinguisher, stops Inferno Rain) or 'umb' (umbrella, stops a Tractor Beam)
    async playerBlock(tool) {
      if (this.busy || this.over || !this.rival.charging || this.rival.charging.type === 'slapshot') return;
      tool = tool === 'umb' ? 'umb' : 'ext';
      this.busy = true; this.acted = true; this.setCards(false);
      const P = this.hero;
      P.blocker = tool;
      this.log(P.name + (tool === 'umb' ? ' grabs the umbrella. Bring it on!' : ' grabs the fire extinguisher. Bring it on!'));
      if (tool === 'umb') A.umbrella(); else A.block();
      buzz(30);
      const c = P.center(), tex = tool === 'umb' ? 'umbrella' : 'extinguisher';
      const ex = this.extHold = this.add.image(c.x + 110, c.y + 30, tex).setDepth(27).setScale(0).setAngle(-15);
      await tw(this, { targets: ex, scale: iconScale(tex, 123), duration: 320, ease: 'Back.out' });
      this.extTw = this.tweens.add({ targets: ex, angle: 5, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.popWord(c.x, c.y - 260, 'READY!', '#9fdcff', 84, -6);
      await wait(this, 800);
      await this.afterPlayer();
    }
    dropExtinguisher() {
      this.hero.blocker = false;
      if (this.extTw) { this.extTw.stop(); this.extTw = null; }
      if (this.extHold) { const e = this.extHold; this.extHold = null; this.tweens.add({ targets: e, scale: 0, duration: 250, onComplete: () => e.destroy() }); }
    }
    async rain(m, att, def, d) {
      A.fire(); buzz(80);
      // Jack's own Inferno Rain while the Mothership charges: keep her charge sky (a red sky would mean "grab FOAM!")
      const keepSky = !!(this.rival.charging && att !== this.rival);
      if (!keepSky) { this.fireFx.fillColor = 0xff3b1f; this.tweens.add({ targets: this.fireFx, fillAlpha: 0.28, duration: 300 }); }
      this.popWord(W / 2, PORTRAIT ? H * 0.22 : H * 0.2, 'INFERNO RAIN!', '#ff8a3d', 100, -4);
      // who blocks? the hero holding the extinguisher, or a rival who still has milk
      let block = null;
      if (def.blocker === 'umb') {
        // wrong tool: the umbrella takes half the fire, no dizzy
        d = Math.max(1, Math.round(d / 2));
        this.log('The umbrella gets toasty! Only half the fire gets through.');
        if (this.extHold) { this.tweens.add({ targets: this.extHold, angle: 0, y: def.center().y - 200, duration: 250 }); this.extHold.setTint(0xffb36b); }
      } else if (def.blocker) block = 'ext';
      else if (def === this.rival) {
        const mk = this.rmoves.find(x => x.type === 'heal' && x.tex === 'milk' && !(x.uses && (def.used[x.k] || 0) >= x.uses));
        if (mk) { block = 'milk'; def.used[mk.k] = (def.used[mk.k] || 0) + 1; }
      }
      const c = def.center(), topY = def.root.y - def.height() - 120;
      let tool = null, foam = null;
      if (block) {
        tool = block === 'ext' && this.extHold ? this.extHold : this.add.image(c.x + def.dir * 110, c.y + 30, block === 'ext' ? 'extinguisher' : 'milk').setDepth(27).setScale(0.55);
        if (this.extTw) { this.extTw.stop(); this.extTw = null; }
        this.extHold = null;
        this.tweens.add({ targets: tool, angle: -def.dir * 25, y: tool.y - 30, duration: 200 });
        foam = this.add.particles(0, 0, 'dot', { x: { min: c.x - 120, max: c.x + 120 }, y: tool.y - 120, speedY: { min: -1100, max: -700 }, speedX: { min: -240, max: 240 }, lifespan: 520, scale: { start: 0.45, end: 1.1 }, alpha: { start: 0.9, end: 0 }, tint: block === 'ext' ? [0xffffff, 0xe6f4ff] : [0xffffff, 0xfff6dc], frequency: 10 }).setDepth(26);
        A.steam();
        this.popWord(c.x, c.y - 120, block === 'ext' ? 'FOAM!' : 'MILK SPLASH!', '#ffffff', 70, 6);
      }
      const n = 5, per = Math.ceil(d / n); let dealt = 0;
      for (let i = 0; i < n; i++) {
        const tx = c.x + rnd(-140, 140), ty = c.y + rnd(-70, 50);
        const sx = tx + 320 + rnd(-40, 40), sy = -150;
        const ex = block ? sx + (tx - sx) * ((topY - sy) / (ty - sy)) : tx, ey = block ? topY + rnd(-40, 30) : ty;
        const fb = this.add.image(sx, sy, 'comet').setDepth(25).setScale(0.6);
        fb.setAngle(Phaser.Math.RadToDeg(Math.atan2(ey - sy, ex - sx)) - 135);
        const trail = this.add.particles(0, 0, 'dot', { follow: fb, frequency: 25, lifespan: 380, scale: { start: 0.45, end: 0 }, tint: [0xff6b2b, 0xffd23f], blendMode: 'ADD', speed: 40 }).setDepth(24);
        A.whoosh();
        await tw(this, { targets: fb, x: ex, y: ey, duration: 300, ease: 'Quad.in' });
        trail.stop(); this.time.delayedCall(500, () => trail.destroy());
        fb.destroy();
        if (block) {
          this.steamP.explode(14, ex, ey); this.fireP.explode(6, ex, ey);
          if (i % 2 === 0) A.steam();
          this.popWord(ex + rnd(-40, 40), ey - 40, 'PSSH!', '#e6f4ff', 58, rnd(-12, 12));
          await wait(this, 160);
        } else {
          const dmg = i < n - 1 ? Math.min(per, d - dealt) : Math.max(1, d - dealt); dealt += dmg;
          this.fireP.explode(18, ex, ey);
          def.spr.setTint(0xffb36b); this.time.delayedCall(500, () => def.spr.clearTint());
          if (dmg > 0) await this.impact(def, dmg, 'fire', true);
          if (def.hp <= 0) break;
        }
      }
      if (att.charging) this.endCharge(att); else if (!keepSky) this.tweens.add({ targets: this.fireFx, fillAlpha: 0, duration: 600 });
      if (block) {
        foam.stop(); this.time.delayedCall(700, () => foam.destroy());
        this.tweens.add({ targets: tool, scale: 0, alpha: 0, duration: 300, delay: 300, onComplete: () => tool.destroy() });
        this.popWord(c.x, topY - 80, 'PSSHHHH!', '#e6f4ff', 100, -6);
        this.steamP.explode(40, c.x, topY);
        if (block === 'ext') {
          def.blocker = false;
          this.log(def.name + ' blocked the Inferno Rain! ' + att.name + (this.R.plural && att === this.rival ? ' are' : ' is') + ' all steamed up!');
          if (def === this.hero) emit('block', { tool: 'ext' }, this);
          await wait(this, 500);
          await this.makeDizzy(def, att, 0x9fdcff, 'STEAMED!');
        } else {
          this.log(def.name + ' splashes milk on the fire! PSSHHH! Blocked!');
          await wait(this, 900);
        }
      }
    }
    // ---- Tractor Beam (v0.8 Mothership, Blips' Mini Beam). Umbrella: bounces off (0 damage, BEAM JAM! dizzy; mini: no dizzy).
    // Extinguisher: wrong tool, half damage. No block: full damage and (NORMAL / HARD, not mini) the beam takes one card.
    async beam(m, att, def, d) {
      A.beam(); buzz(60);
      const blk = def.blocker, P = this.hero;
      const sx = att.root.x, sy = att.root.y - att.height() * 0.4, c = def.center(), gy = def.root.y + 10;
      if (this.beamSpot) { this.beamSpot.setVisible(false); }
      if (this.beamSweep) { this.beamSweep.stop(); this.beamSweep = null; }
      const g = this.add.graphics().setDepth(9);
      g.fillStyle(0xd8ff6a, 0.6); g.fillTriangle(sx, sy, def.root.x - 170, gy, def.root.x + 170, gy);
      g.fillStyle(0xffffff, 0.4); g.fillEllipse(def.root.x, gy, 340, 60);
      g.setAlpha(0); await tw(this, { targets: g, alpha: 1, duration: 250 });
      this.popWord(W / 2, PORTRAIT ? H * 0.22 : H * 0.2, m.mini ? 'MINI BEAM!' : 'TRACTOR BEAM!', '#d8ff6a', m.mini ? 84 : 100, -4);
      const done = async () => { this.tweens.add({ targets: g, alpha: 0, duration: 350, onComplete: () => g.destroy() }); if (att.charging) this.endCharge(att); };
      if (blk === 'umb') {
        // the umbrella pops open over the hero and the beam bounces off
        const u = this.extHold; this.extHold = null;
        if (this.extTw) { this.extTw.stop(); this.extTw = null; }
        const umb = u || this.add.image(c.x + def.dir * 60, c.y, 'umbrella').setDepth(27).setScale(0);
        A.umbrella();
        await tw(this, { targets: umb, x: def.root.x, y: def.root.y - def.height() - 40, angle: 0, scale: iconScale('umbrella', 260), duration: 300, ease: 'Back.out' });
        for (let i = 0; i < 3; i++) { this.sparks.explode(10, def.root.x + rnd(-90, 90), umb.y - 80); A.bounce(); await wait(this, 160); }
        this.popWord(def.root.x, umb.y - 160, 'BOING!', '#d8ff6a', 100, -6);
        this.tweens.add({ targets: umb, scale: 0, alpha: 0, duration: 300, delay: 600, onComplete: () => umb.destroy() });
        await done(); def.blocker = false;
        if (def === P) emit('block', { tool: 'umbrella', mini: !!m.mini }, this);
        if (m.mini) { this.log(def.name + ' blocked the tiny beam with the umbrella! Nice!'); await wait(this, 900); return; }
        this.log(def.name + ' bounced the Tractor Beam back! ' + att.name + (this.R.plural ? ' are' : ' is') + ' all jammed up!');
        await wait(this, 400);
        await this.makeDizzy(def, att, 0xd8ff6a, 'BEAM JAM!');
        return;
      }
      if (blk === 'ext') {
        // wrong tool: foam floats up the beam, half damage, nothing taken
        d = Math.max(1, Math.round(d / 2));
        const foam = this.add.particles(0, 0, 'dot', { x: { min: def.root.x - 120, max: def.root.x + 120 }, y: c.y, speedY: { min: -900, max: -500 }, speedX: { min: -60, max: 60 }, lifespan: 900, scale: { start: 0.5, end: 1.1 }, alpha: { start: 0.9, end: 0 }, tint: [0xffffff, 0xe6f4ff], frequency: 15 }).setDepth(26);
        A.steam();
        this.popWord(c.x, c.y - 220, 'FOAM FLOATS UP!', '#e6f4ff', 64, 6);
        await wait(this, 700); foam.stop(); this.time.delayedCall(900, () => foam.destroy());
        this.log('Foam floats up the beam! Only half of it gets through.');
        await this.impact(def, d, 'roar');
        await done(); return;
      }
      // no block: the hero floats up, giggling... a card flies into the saucer... PLOP!
      const take = !m.mini && !this.easy && def === P ? this.stealCard() : null;
      await Promise.all([tw(this, { targets: def.root, y: def.root.y - 180, duration: 700, ease: 'Sine.out' }), tw(this, { targets: def.squash, angle: 360 * def.dir, duration: 700 })]);
      def.squash.setAngle(0);
      this.popWord(c.x, c.y - 330, 'HEE HEE!', '#ff9ed8', 64, -8);
      if (take) {
        const card = take.card, ik = take.icon || 'pillow', ic = img(this, card.x, card.y, ik).setDepth(36); ic.setScale(iconScale(ik, 90));
        A.whoosh();
        await tw(this, { targets: ic, x: sx, y: sy, scale: 0.1, angle: 540, duration: 650, ease: 'Quad.in' });
        ic.destroy();
        this.setCards(false);
        this.popWord(sx, sy - 120, 'BEAMED UP!', '#d8ff6a', 70, 6);
      } else if (!m.mini && !this.easy && def === P) this.log('The beam finds nothing to grab!');
      await tw(this, { targets: def.root, y: this.groundY, duration: 260, ease: 'Quad.in' });
      this.popWord(c.x, c.y - 200, 'PLOP!', '#fff3d2', 84, 8);
      if (take) this.log(att.name + ' beamed up ' + def.name + '\'s ' + take.title + '! It comes back after the duel.');
      await this.impact(def, d, 'roar');
      await done();
    }
    // ---- SLAPSHOT + SAVE IT! (v0.8 Canada). The rival shoots a puck; the kid taps anywhere (or SPACE) when the ring closes.
    // Perfect: 0 damage and the puck bounces back for 10. Good: half damage. Miss: full damage. No turn is used.
    async slapshot(m, att, def, d) {
      const P = this.hero, dk = Save.data.diff in SAVE_T ? Save.data.diff : 'normal';
      const res = await this.saveIt(att, def);
      if (att.charging) this.endCharge(att);
      const c = def.center();
      if (res === 'perfect') {
        A.glove(); A.goalHorn(); buzz([30, 40, 30]);
        this.popWord(c.x, c.y - 260, 'SAVE!', '#7fe39a', 110, -6);
        this.confetti.explode(30, c.x, c.y - 100);
        this.log(def.name + ' makes a PERFECT SAVE! The puck bounces back!');
        const pk = this.add.image(c.x + def.dir * 120, c.y, 'puck').setDepth(26);
        const t = att.center();
        await tw(this, { targets: pk, x: t.x, y: t.y, angle: 720, duration: 380, ease: 'Quad.in' });
        pk.destroy();
        await this.impact(att, 10, 'pillow', true, true);
      } else if (res === 'good') {
        A.glove();
        this.popWord(c.x, c.y - 260, 'GOOD SAVE!', '#ffd23f', 96, -6);
        this.log('Good save! Only half of the SLAPSHOT gets through.');
        await this.impact(def, Math.ceil(d / 2), 'pillow');
      } else {
        this.popWord(c.x, c.y - 260, 'BONK!', '#ff9ed8', 96, 6);
        await this.impact(def, d, 'pillow');
        this.log(att.name + ': "Oh! Sorry!"');
        await wait(this, 500);
      }
      if (def === P) {
        const st = Save.data.stats || (Save.data.stats = {});
        if (!st.saveSeen) { st.saveSeen = 1; Save.store(); }
        emit('save', { result: res, diff: dk }, this);
      }
    }
    // the timed save: resolves 'perfect' | 'good' | 'miss'. Judged with performance.now() (Phaser treats slow frames as 33 ms).
    saveIt(att, def) {
      const dk = Save.data.diff in SAVE_T ? Save.data.diff : 'normal', T = SAVE_T[dk];
      const auto = window.__psSaveAuto; // ?debug only: tests run at 2-3 fps and cannot time a tap
      const tutorial = !((Save.data.stats || {}).saveSeen);
      const f = att.front(), c = def.center();
      const gx = c.x + def.dir * 130, gy = c.y - 20;
      const glove = this.add.image(gx, gy, 'glove').setDepth(27).setScale(0).setFlipX(def.dir < 0);
      const gs = iconScale('glove', 260);
      const ring = this.add.image(gx, gy, 'ring').setDepth(28).setAlpha(0).setScale(3);
      const puck = this.add.image(f.x, f.y + 40, 'puck').setDepth(29).setVisible(false);
      const ready = txt(this, gx, gy - 220, 'GET READY...', 56, '#d8ecff', { st: 8 }).setDepth(30);
      const cleanup = () => { [glove, ring, puck, ready].forEach(o => this.tweens.add({ targets: o, alpha: 0, duration: 300, delay: 200, onComplete: () => o.destroy() })); };
      this.tweens.add({ targets: glove, scale: gs, duration: 200, ease: 'Back.out' });
      if (auto) return new Promise(r => this.time.delayedCall(300, () => { cleanup(); r(auto === 'perfect' || auto === 'good' ? auto : 'miss'); }));
      return new Promise(resolve => {
        const pause = rnd(T.pause[0], T.pause[1]);
        let t0 = performance.now() + pause, last = performance.now(), restarts = 0, stalls = 0, early = 0, done = false, launched = false, frozen = null, tapWait = null;
        const finish = r => {
          if (done) return; done = true;
          this.events.off('update', tick); this.input.off('pointerdown', onTap);
          if (this.input.keyboard) this.input.keyboard.off('keydown-SPACE', onKey);
          if (tapWait) tapWait.destroy();
          cleanup(); resolve(r);
        };
        const wobble = word => { this.tweens.add({ targets: glove, angle: { from: -14, to: 14 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => glove.setAngle(0) }); this.popWord(gx, gy - 160, word, '#ffb3b3', 56, 6); };
        const tap = () => {
          if (done) return;
          const now = performance.now(), t = now - t0;
          if (frozen) { finish('perfect'); return; } // tutorial or the EASY "TAP!" wait
          // a tap during a stalled frame or in the pause after a restart is forgiven, never judged (code review)
          if (now - last > 250 || (restarts && t < 0)) return;
          if (tutorial && T.perfect) return; // the tutorial waits for its frozen moment (EASY: any tap is perfect anyway)
          const j = judgeSave(t, dk);
          if (j === 'perfect' || j === 'good') { glove.setTint(0xb8ffcf); finish(j); return; }
          if (j === 'early') {
            if (dk === 'normal' && !early++) { wobble('WAIT FOR IT!'); return; }
            wobble('TOO EARLY!'); finish('miss'); return;
          }
          finish('miss');
        };
        const onTap = p => { if (p.worldY > (PORTRAIT ? 300 : 170)) tap(); };
        const onKey = () => tap();
        this.input.on('pointerdown', onTap);
        if (this.input.keyboard) this.input.keyboard.on('keydown-SPACE', onKey);
        const freeze = (t, word) => {
          frozen = t; puck.setTint(0xffffff); ready.setVisible(false);
          tapWait = txt(this, gx, gy - 230, word, 64, '#7fe39a', { st: 9 }).setDepth(31);
          this.tweens.add({ targets: tapWait, scale: 1.15, duration: 320, yoyo: true, repeat: -1 });
        };
        const tick = () => {
          if (done) return;
          const now = performance.now(), gap = now - last; last = now;
          // hiccup rule: a stalled frame during the flight (rotation, background, old iPad) restarts the shot; twice = a good save
          if (!frozen && gap > 250) {
            // a stall before the launch only stretches the pause (code review: never an instant miss)
            if (!launched) { if (++stalls > 8) { finish('good'); return; } t0 = Math.max(t0, now + 300); return; } // a device that keeps stalling: good save
            if (++restarts > 2) { finish('good'); return; }
            this.log(att.name + ' slips! Again!');
            t0 = now + 400; launched = false; puck.setVisible(false); ring.setAlpha(0); ready.setText('GET READY...');
            return;
          }
          const t = frozen != null ? frozen : now - t0;
          if (t < 0) return;
          if (!launched) { launched = true; ready.setText('SLAPSHOT!'); A.slap(); puck.setVisible(true); ring.setAlpha(0.9); }
          const k = Math.min(1, t / T.F);
          puck.x = f.x + (gx - f.x) * k; puck.y = f.y + 40 + (gy - f.y - 40) * k; puck.angle = t * 0.6;
          ring.setScale(3 - 2 * k);
          const j = judgeSave(t, dk);
          ring.setTint(j === 'perfect' ? 0x7fe39a : j === 'good' ? 0xffd23f : 0xffffff);
          if (frozen != null) return;
          // the very first SAVE IT!: freeze inside the perfect window and wait for the tap
          if (tutorial && T.perfect && t >= (T.perfect[0] + T.perfect[1]) / 2 - 80) { freeze(t, 'TAP NOW!'); return; }
          if (!T.perfect) {
            // EASY: the puck stops just before the glove and waits up to 3 s; no tap is still a good save.
            // The first save ever waits there with no time limit.
            const stopT = T.F * (1 - 120 / Math.max(240, Math.hypot(gx - f.x, gy - f.y)));
            if (t >= stopT) {
              freeze(stopT, tutorial ? 'TAP NOW!' : 'TAP!');
              if (!tutorial) this.time.delayedCall(3000, () => { if (!done) { this.popWord(gx, gy - 160, 'OOF!', '#ffd23f', 64, 6); finish('good'); } });
            }
            return;
          }
          if (t > T.perfect[1]) finish('miss');
        };
        this.events.on('update', tick);
      });
    }
    // the card the beam takes: the first limited card that still has uses. Never an unlimited one, so the kid can always act.
    // Jack: Nap, Inferno Rain, Frosty Sneeze, Dumpling, booster move, Six-Seven Dance. Toys: heal / nap first, then the strongest.
    stealCard() {
      const P = this.hero, JORD = ['nap', 'inferno', 'frost', 'dumpling'];
      const rank = m => { const i = JORD.indexOf(m.k); if (i >= 0) return i; if (m.type === 'heal' || m.type === 'nap') return 4; if (m.type === 'dance') return 1000; return 500 - (m.dmg ? m.dmg[1] : 0); };
      const left = this.moves.filter(m => m.uses && (P.used[m.k] || 0) < m.uses && !(P.beamed || []).includes(m.k));
      if (!left.length) return null;
      left.sort((a, b) => rank(a) - rank(b));
      P.beamed = (P.beamed || []).concat(left[0].k);
      return left[0];
    }
    checkEnd() {
      if (this.rival.hp <= 0) { this.finish(true); return true; }
      if (this.hero.hp <= 0 && this.hero.spare) {
        // Spare Heart booster: bounce back once
        const P = this.hero; P.spare = false;
        this.heal(P, 40); A.levelUp();
        this.popWord(P.center().x, P.center().y - 280, 'SPARE HEART!', '#ff9ed8', 80, -6);
        this.tweens.add({ targets: P.squash, scaleX: 1.2, scaleY: 0.85, duration: 140, yoyo: true, repeat: 1 });
        if (this.boostChip) this.tweens.add({ targets: this.boostChip, alpha: 0.3, duration: 400 });
        return false;
      }
      if (this.hero.hp <= 0) { this.finish(false); return true; }
      return false;
    }
    async finish(won) {
      this.over = true; this.busy = true; this.setCards(false);
      const P = this.hero, T = this.rival;
      if (T.charging) this.endCharge(T);
      this.dropExtinguisher();
      A.music(null); // duel music stops for the win / lose jingle
      if ((P.beamed || []).length) {
        // the beamed-up cards come back (they were never really gone)
        const names = this.moves.filter(m => P.beamed.includes(m.k)).map(m => m.title);
        P.beamed = []; this.setCards(false);
        this.log(T.name + ' gives back your ' + names.join(' and ') + '. Too cozy to keep!');
        await wait(this, 1600);
      }
      if (won) {
        this.log((this.R.laugh || (T.name + ' giggled so hard they gave up.')) + ' ' + P.name + ' wins!');
        await tw(this, { targets: T.root, angle: 28 * -T.dir, duration: 380, ease: 'Back.out' });
        this.tweens.add({ targets: T.squash, scaleY: 0.9, scaleX: 1.06, duration: 110, yoyo: true, repeat: 7 });
        this.popWord(T.center().x + 40, T.center().y - 200, 'HAHAHA', '#ff9ed8', 80, 8);
        A.win(); buzz([40, 60, 40]);
        this.confetti.explode(90, W * 0.25, H); this.confetti.explode(90, W * 0.75, H);
        for (let i = 0; i < 3; i++) await tw(this, { targets: P.root, y: this.groundY - 140, duration: 230, yoyo: true, ease: 'Quad.out' });
      } else {
        this.log(P.name + ' is too sleepy to go on...');
        await this.flipNap(P, true);
        A.lose();
        for (let i = 0; i < 3; i++) {
          const z = this.add.image(P.root.x + 120, P.root.y - P.height() * 0.8, 'zzz').setScale(0.3).setDepth(26).setAlpha(0);
          this.tweens.add({ targets: z, y: z.y - 230, x: z.x + 70, alpha: { from: 1, to: 0 }, duration: 1600, delay: i * 400, onComplete: () => z.destroy() });
        }
        this.tweens.add({ targets: T.root, y: this.groundY - 100, duration: 250, yoyo: true, repeat: 2 });
        await wait(this, 1200);
      }
      this.result(won);
    }
    result(won) {
      this.time.delayedCall(1600, () => A.music('calm'));
      const R = this.R, isCampaign = this.mode === 'campaign', id = R.id;
      const stars = won ? (this.hero.hp >= this.hero.max * 0.7 ? 3 : this.hero.hp >= this.hero.max * 0.35 ? 2 : 1) : 0;
      const prevStars = isCampaign ? (Save.data.stars[id] || 0) : 0;
      const firstClear = isCampaign && won && prevStars === 0;
      const gain = Math.round((won ? R.xp + (firstClear ? 20 : 0) : 10) * (this.xpMul || 1));
      const before = levelOf(Save.data.xp);
      Save.data.xp += gain; if (won) Save.data.wins++;
      // capsules: every first win over a rival + every 3rd win
      const caps = won ? (firstClear ? 1 : 0) + (Save.data.wins % 3 === 0 ? 1 : 0) : 0;
      Save.data.caps += caps;
      const nextWasOpen = isCampaign && this.rivalIdx + 1 < RIVALS.length && isUnlocked(this.rivalIdx + 1);
      if (isCampaign && stars > prevStars) Save.data.stars[id] = stars;
      const newCostume = won && R.reward && !Save.data.costumes[R.reward] ? COSTUMES.find(c => c.id === R.reward) : null;
      if (newCostume) Save.data.costumes[R.reward] = true;
      Save.store();
      const hadCrown = !!Save.data.costumes.crown;
      emit('duel', { won, mode: this.mode, rival: R, rivalIdx: this.rivalIdx, stars, firstClear, diff: Save.data.diff, boss: !!R.boss,
        dmg: Math.max(0, this.rival.max - Math.max(0, this.rival.hp)), data: this.data0, hero: this.H }, this);
      const after = levelOf(Save.data.xp);
      const newMoves = MOVES.filter(m => m.lvl > before.l && m.lvl <= after.l);
      const nextIdx = this.rivalIdx + 1;
      const unlockedNext = firstClear && nextIdx < RIVALS.length && !nextWasOpen; // (QA B20)

      const notes = [];
      if (firstClear) notes.push('First win bonus +20 XP');
      if (firstClear && id === 'beaver') notes.push('Bob challenges you to POND HOCKEY! Find it on the Canada map');
      if (unlockedNext && worldOf(nextIdx) !== this.world) notes.push('NEW WORLD: ' + WORLDS[worldOf(nextIdx)].name + '! Rival: ' + RIVALS[nextIdx].name);
      else if (unlockedNext) notes.push('New rival unlocked: ' + RIVALS[nextIdx].name + '!');
      if (newMoves.length && this.hero.isJack) notes.push('Jack learned: ' + newMoves.map(m => m.title).join(', ') + '!');
      if (caps) notes.push('+' + caps + ' capsule' + (caps > 1 ? 's' : '') + '! Open on the map');
      if (newCostume) notes.push('New costume: ' + newCostume.name + '! Put it on in Me');
      if (!hadCrown && Save.data.costumes.crown) notes.push('Superstar! New costume: Royal Crown!'); // the Superstar sticker's reward (QA B42)
      if (this.mode === 'boss') notes.push('You hit the Kraken for ' + Math.max(0, this.rival.max - Math.max(0, this.rival.hp)) + '! Everyone\'s hits add up');
      if (this.xpMul > 1) notes.push((this.boost && this.boost.id === 'superstar' ? 'Super Star ' : '') + (Save.data.diff === 'hard' ? 'Hard mode ' : '') + 'bonus XP!');
      const primary = isCampaign && won && nextIdx < RIVALS.length && isUnlocked(nextIdx) ? 'next' : this.mode === 'boss' ? 'boss' : 'rematch';
      // kept so a rotation on the result panel can rebuild the panel without giving the rewards again (QA B31)
      this.shown = { won, stars, gain, before, after, notes, primary, nextIdx };
      this.resultPanel(this.shown, true);
      // a rotation waits until the stars, the XP count and LEVEL UP! have played (QA B36, owner's choice)
      this.celebrating = true;
      this.time.delayedCall(3300 + stars * 280, () => {
        this.celebrating = false;
        if (window.__psRotatePending && window.__psTryRebuild) window.__psTryRebuild();
      });
    }
    // the result panel; fresh = false when it is rebuilt after a rotation (no sounds, no counting up)
    resultPanel(info, fresh) {
      const { won, stars, gain, before, after, notes } = info, R = this.R, isCampaign = this.mode === 'campaign';
      if (!fresh) A.music('calm');
      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0).setDepth(60).setInteractive();
      if (fresh) this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 300 }); else dim.fillAlpha = 0.6;
      const pw = PORTRAIT ? 920 : 1000, ph = PORTRAIT ? 1230 : 1020, T0 = -ph / 2;
      const p = this.add.container(W / 2, H / 2).setDepth(61).setScale(fresh ? 0 : 1);
      p.add(panel(this, 0, 0, pw, ph, C.night2, 0));
      const icon = this.add.image(0, T0 + 120, won ? 'trophy' : 'zzz').setScale(0.7);
      this.tweens.add({ targets: icon, y: icon.y - 12, angle: { from: -5, to: 5 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const title = txt(this, 0, T0 + 265, won ? 'YOU WIN!' : 'SO SLEEPY...', 100, won ? '#ffd23f' : '#bcc0ee', { stroke: '#0f1240', st: 14 });
      const sub = txt(this, 0, T0 + 345, won ? (R.laugh || '') : this.hero.name + ' needs a nap. Next time for sure!', 34, '#fff3d2', { st: 0, weight: '500', wrap: pw - 120 });
      p.add([icon, title, sub]);
      const sr = [];
      if (isCampaign) for (let i = 0; i < 3; i++) { const s = this.add.image((i - 1) * 120, T0 + 445 - (i === 1 ? 14 : 0), 'star').setScale(0.42).setTint(0x3a3f7a); p.add(s); sr.push(s); }
      const xpT = txt(this, 0, T0 + 545, '+0 XP', 60, '#7fe39a', { stroke: '#0f1240', st: 10 });
      const bw = pw - 220;
      const lvT = txt(this, -bw / 2, T0 + 610, 'LEVEL ' + before.l, 34, '#fff3d2', { ox: 0, st: 0 });
      const barBg = this.add.rectangle(0, T0 + 660, bw, 34, C.night3).setStrokeStyle(4, C.seam);
      const bar = this.add.rectangle(-bw / 2, T0 + 660, Math.max(4, bw * before.r / before.n), 26, C.star).setOrigin(0, 0.5);
      const note = txt(this, 0, T0 + 700, '', 34, '#ffd23f', { st: 6, wrap: pw - 100, oy: 0 });
      p.add([xpT, lvT, barBg, bar, note]);
      const by = T0 + (PORTRAIT ? 940 : 925);
      // all notes stay above the buttons (QA B09)
      let nfs = notes.length > 2 ? 27 : notes.length > 1 ? 30 : 34;
      note.setText(notes.join('\n')).setFontSize(nfs);
      while (note.height > by - 70 - (T0 + 700) && nfs > 18) { nfs -= 2; note.setFontSize(nfs); }
      const primary = info.primary === 'next' ? ['NEXT RIVAL', () => fade(this, 'battle', { rival: info.nextIdx })]
        // Kraken fights only through the Weekly Boss screen: it counts the daily tries (QA B33)
        : info.primary === 'boss' ? ['BOSS', () => fade(this, 'boss')]
        : ['REMATCH', () => fade(this, 'battle', this.data0)];
      p.add(button(this, PORTRAIT ? 0 : -215, by, 390, 120, primary[0], C.star, primary[1], { size: 46 }));
      p.add(button(this, PORTRAIT ? 0 : 215, PORTRAIT ? by + 150 : by, 390, 120, { squad: 'SQUAD', friends: 'FRIENDS', map: 'MAP' }[this.backKey], C.cream, () => fade(this, this.backKey, { world: this.world }), { size: 46 }));
      if (!fresh) {
        sr.slice(0, stars).forEach(s => s.clearTint());
        xpT.setText('+' + gain + ' XP'); lvT.setText('LEVEL ' + after.l); bar.width = Math.max(4, bw * after.r / after.n);
        return;
      }
      this.tweens.add({ targets: p, scale: 1, duration: 420, ease: 'Back.out' });
      for (let i = 0; i < stars && sr.length; i++) {
        this.time.delayedCall(600 + i * 280, () => {
          sr[i].clearTint(); A.starDing(i);
          this.tweens.add({ targets: sr[i], scale: { from: 0.8, to: 0.42 }, angle: { from: -30, to: 0 }, duration: 320, ease: 'Back.out' });
          this.sparks.explode(10, W / 2 + (i - 1) * 120, H / 2 + T0 + 445);
        });
      }
      const st = sr.length ? stars : 0;
      const o = { v: 0 };
      this.tweens.add({ targets: o, v: gain, duration: 900, delay: 500 + st * 280, onUpdate: () => { xpT.setText('+' + Math.round(o.v) + ' XP'); if (Math.random() < 0.5) A.tick(); } });
      this.time.delayedCall(800 + st * 280, () => {
        if (after.l > before.l) {
          this.tweens.add({ targets: bar, width: bw, duration: 500, ease: 'Quad.out', onComplete: () => {
            A.levelUp(); buzz([30, 40, 30]); lvT.setText('LEVEL ' + after.l); bar.width = 4;
            this.tweens.add({ targets: bar, width: Math.max(4, bw * after.r / after.n), duration: 400 });
            const lu = txt(this, W / 2, H / 2 - 40, 'LEVEL UP!', 130, '#ffd23f', { stroke: '#0f1240', st: 16 }).setDepth(70).setScale(0);
            this.tweens.add({ targets: lu, scale: 1, angle: { from: -20, to: -6 }, duration: 400, ease: 'Back.out' });
            this.tweens.add({ targets: lu, alpha: 0, y: lu.y - 120, duration: 600, delay: 1300, onComplete: () => lu.destroy() });
            this.confetti.explode(120, W / 2, H * 0.6);
          } });
        } else this.tweens.add({ targets: bar, width: Math.max(4, bw * after.r / after.n), duration: 800, ease: 'Quad.out' });
      });
    }
  }

  // ---------- Star Catch: 30-second mini-game
  class CatchScene extends Phaser.Scene {
    constructor() { super('catch'); }
    init(data) { this.world = (data && data.world) || 0; }
    create() {
      this._leaving = false;
      this.cameras.main.fadeIn(350, 15, 18, 64);
      sky(this, this.world);
      bottomGround(this, groundKey(this.world), PORTRAIT ? 0.35 : 0.45, 0.9);
      const hero = heroDef(this);
      this.groundY = H - (PORTRAIT ? 120 : 70);
      this.sh = this.add.image(W / 2, this.groundY + 4, 'shadow').setScale(0.9, 0.8).setDepth(9);
      this.p = this.add.image(W / 2, this.groundY, hero.isJack ? 'jack_front' : hero.tex).setOrigin(0.5, 1).setDepth(10);
      const ps = PORTRAIT ? 300 : 280;
      this.pScale = Math.min(ps / this.p.height, ps / this.p.width); this.p.setScale(this.pScale);
      this.tx = W / 2; this.vx = 0; this.stun = 0;
      this.items = []; this.score = 0; this.left = 30; this.running = false; this.spawnT = 0; this.elapsed = 0;
      this.sparks = this.add.particles(0, 0, 'spark', { emitting: false, speed: { min: 200, max: 600 }, lifespan: 450, scale: { start: 0.7, end: 0 }, tint: [C.star, 0xffffff], blendMode: 'ADD' }).setDepth(21);
      this.feathers = this.add.particles(0, 0, 'feather', { emitting: false, speed: { min: 250, max: 650 }, angle: { min: 200, max: 340 }, gravityY: 900, lifespan: 1200, rotate: { start: 0, end: 540 }, scale: { start: 0.6, end: 0.4 }, alpha: { start: 1, end: 0 } }).setDepth(20);
      this.confetti = this.add.particles(0, 0, 'conf', { emitting: false, speed: { min: 500, max: 1300 }, angle: { min: 230, max: 310 }, gravityY: 1100, lifespan: 2600, rotate: { min: 0, max: 360 }, tint: [0xff6b5b, 0xffd23f, 0x7fd6c2, 0x9aa2ff, 0xff9ed8] }).setDepth(70);
      // HUD
      const hy = PORTRAIT ? 200 : 80;
      this.add.image(W / 2 - 70, hy, 'star').setScale(0.36).setDepth(30);
      this.scoreT = txt(this, W / 2 - 10, hy, '0', 80, '#ffd23f', { ox: 0, st: 12 }).setDepth(30);
      this.timeT = txt(this, PORTRAIT ? W / 2 : W - 220, PORTRAIT ? hy + 100 : hy, '30', 64, '#fff3d2', { st: 10 }).setDepth(30);
      backButton(this, () => fade(this, 'map', { world: this.world }));
      muteButton(this);
      // controls: drag / tap anywhere, or arrow keys
      const aim = p => { if (p.worldY > (PORTRAIT ? 260 : 150)) this.tx = clamp(p.worldX, 80, W - 80); };
      this.input.on('pointerdown', aim); this.input.on('pointermove', aim);
      this.keys = this.input.keyboard && this.input.keyboard.createCursorKeys();
      this.intro();
    }
    async intro() {
      const c = this.add.container(W / 2, H * 0.42).setDepth(60);
      const pw = PORTRAIT ? 900 : 1000, ph = PORTRAIT ? 760 : 620;
      c.add(panel(this, 0, 0, pw, ph, C.night2, 0));
      c.add(txt(this, 0, -ph / 2 + 100, 'STAR CATCH!', 90, '#ffd23f', { stroke: '#0f1240', st: 14 }));
      const rows = [['star', '+1', '#ffd23f'], [EVENT_ON ? 'candy' : 'dumpling', '+3', '#7fe39a'], ['pillow', 'OUCH! -2', '#ff6b5b']];
      rows.forEach(([k, l, col], i) => {
        const x = (i - 1) * (PORTRAIT ? 280 : 300), y = -10;
        c.add(img(this, x, y, k).setScale(iconScale(k, 130)));
        c.add(txt(this, x, y + 110, l, 48, col, { st: 8 }));
      });
      c.add(txt(this, 0, ph / 2 - (PORTRAIT ? 150 : 110), PORTRAIT ? 'Drag left and right\nto catch the falling stars!' : 'Drag or use arrows to catch the falling stars!', 36, '#fff3d2', { st: 0, weight: '500' }));
      c.setScale(0);
      await tw(this, { targets: c, scale: 1, duration: 380, ease: 'Back.out' });
      await wait(this, 2300);
      await tw(this, { targets: c, scale: 0, alpha: 0, duration: 250, ease: 'Quad.in' });
      c.destroy();
      for (const n of ['3', '2', '1', 'GO!']) {
        const t = txt(this, W / 2, H * 0.42, n, n === 'GO!' ? 200 : 180, n === 'GO!' ? '#7fe39a' : '#fff3d2', { stroke: '#0f1240', st: 18 }).setDepth(60).setScale(0);
        n === 'GO!' ? A.levelUp() : A.tick();
        await tw(this, { targets: t, scale: 1, duration: 260, ease: 'Back.out' });
        await wait(this, 380);
        this.tweens.add({ targets: t, scale: 1.5, alpha: 0, duration: 250, onComplete: () => t.destroy() });
      }
      this.running = true;
    }
    spawn() {
      const r = Math.random(), sp = this.elapsed / 30;
      const kind = r < 0.2 + sp * 0.12 ? 'pillow' : (r < 0.33 + sp * 0.12 ? 'dumpling' : 'star');
      const o = img(this, rnd(90, W - 90), -80, kind === 'dumpling' && EVENT_ON ? 'candy' : kind).setDepth(15);
      o.setScale(iconScale(kind, kind === 'pillow' ? 150 : 110));
      const base = H * (PORTRAIT ? 0.32 : 0.45);
      this.items.push({ o, kind, vy: base * (1 + Math.random() * 0.5) * (1 + sp * 0.8), spin: rnd(-200, 200), wob: Math.random() * 6 });
      if (kind === 'star') this.tweens.add({ targets: o, scale: o.scale * 1.15, duration: 300, yoyo: true, repeat: -1 });
    }
    float(x, y, s, col) {
      const t = txt(this, x, y, s, 70, col, { stroke: '#0f1240', st: 10 }).setDepth(40);
      this.tweens.add({ targets: t, y: y - 140, alpha: 0, duration: 700, ease: 'Quad.out', onComplete: () => t.destroy() });
    }
    update(time, dtMs) {
      const dt = Math.min(dtMs, 50) / 1000;
      if (this.keys) { if (this.keys.left.isDown) this.tx = clamp(this.tx - 1400 * dt, 80, W - 80); if (this.keys.right.isDown) this.tx = clamp(this.tx + 1400 * dt, 80, W - 80); }
      // hero follows the finger
      const px = this.p.x;
      if (this.stun > 0) this.stun -= dt;
      else this.p.x += (this.tx - this.p.x) * Math.min(1, dt * 12);
      this.vx = (this.p.x - px) / Math.max(dt, 0.001);
      this.p.setAngle(clamp(this.vx / 90, -14, 14));
      this.sh.x = this.p.x;
      if (!this.running) return;
      this.elapsed += dt; this.left -= dt;
      const sec = Math.max(0, Math.ceil(this.left));
      if (this.timeT.text !== String(sec)) {
        this.timeT.setText(String(sec));
        if (sec <= 5) { this.timeT.setColor('#ff6b5b'); A.tick(); this.tweens.add({ targets: this.timeT, scale: { from: 1.3, to: 1 }, duration: 250 }); }
      }
      if (this.left <= 0) { this.end(); return; }
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawn(); this.spawnT = clamp(0.62 - this.elapsed * 0.012, 0.3, 0.62); }
      const cx = this.p.x, cy = this.p.y - this.p.displayHeight * 0.6, rr = this.p.displayWidth * 0.42 + 40;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        it.o.y += it.vy * dt; it.o.angle += it.spin * dt; it.o.x += Math.sin(time / 300 + it.wob) * 40 * dt;
        const dx = it.o.x - cx, dy = it.o.y - cy;
        if (dx * dx + dy * dy < rr * rr) { this.grab(it); this.items.splice(i, 1); continue; }
        if (it.o.y > H + 100) { it.o.destroy(); this.items.splice(i, 1); }
      }
    }
    grab(it) {
      const x = it.o.x, y = it.o.y; it.o.destroy();
      if (it.kind === 'pillow') {
        this.score = Math.max(0, this.score - 2); this.stun = 0.6;
        A.thump(0.8); buzz(40); this.feathers.explode(12, x, y);
        this.cameras.main.shake(200, 0.008);
        this.p.setTintFill(0xffffff); this.time.delayedCall(90, () => this.p.setTint(0xb0b6ff)); this.time.delayedCall(600, () => this.p.clearTint());
        this.tweens.add({ targets: this.p, scaleY: this.pScale * 0.8, scaleX: this.pScale * 1.15, duration: 90, yoyo: true });
        this.float(x, y - 40, 'OUCH!', '#ff6b5b');
      } else {
        const n = it.kind === 'dumpling' ? 3 : 1; this.score += n;
        it.kind === 'dumpling' ? A.gulp() : A.catchStar();
        this.sparks.explode(it.kind === 'dumpling' ? 16 : 10, x, y);
        this.tweens.add({ targets: this.p, scaleY: this.pScale * 1.08, scaleX: this.pScale * 0.95, duration: 80, yoyo: true });
        this.float(x, y - 40, '+' + n, it.kind === 'dumpling' ? '#7fe39a' : '#ffd23f');
      }
      this.scoreT.setText(String(this.score));
      this.tweens.add({ targets: this.scoreT, scale: { from: 1.25, to: 1 }, duration: 200, ease: 'Back.out' });
    }
    end() {
      this.running = false; this.timeT.setText('0');
      this.items.forEach(it => { this.tweens.add({ targets: it.o, alpha: 0, scale: 0, duration: 300, onComplete: () => it.o.destroy() }); }); this.items = [];
      const best = Save.data.bestCatch || 0, isBest = this.score > best;
      const gain = Math.min(this.score, 60);
      const before = levelOf(Save.data.xp);
      Save.data.xp += gain; if (isBest) Save.data.bestCatch = this.score; Save.store();
      emit('catch', { score: this.score }, this);
      const after = levelOf(Save.data.xp);
      const newMoves = MOVES.filter(m => m.lvl > before.l && m.lvl <= after.l);
      A.win(); this.confetti.explode(100, W / 2, H);
      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0).setDepth(60).setInteractive();
      this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 300 });
      const pw = PORTRAIT ? 900 : 940, ph = PORTRAIT ? 1050 : 860, T0 = -ph / 2;
      const p = this.add.container(W / 2, H / 2).setDepth(61).setScale(0);
      p.add(panel(this, 0, 0, pw, ph, C.night2, 0));
      p.add(txt(this, 0, T0 + 110, 'TIME\'S UP!', 90, '#ffd23f', { stroke: '#0f1240', st: 14 }));
      p.add(this.add.image(-90, T0 + 260, 'star').setScale(0.6));
      p.add(txt(this, 10, T0 + 260, String(this.score), 130, '#fff3d2', { ox: 0, stroke: '#0f1240', st: 16 }));
      p.add(txt(this, 0, T0 + 380, isBest && best > 0 ? 'NEW RECORD!' : 'Best: ' + Math.max(best, this.score), 44, isBest && best > 0 ? '#ff9ed8' : '#bcc0ee', { st: 7 }));
      p.add(txt(this, 0, T0 + 470, '+' + gain + ' XP', 64, '#7fe39a', { stroke: '#0f1240', st: 10 }));
      const notes = [];
      if (after.l > before.l) notes.push('LEVEL UP! Level ' + after.l);
      if (newMoves.length && heroDef(this).isJack) notes.push('Jack learned: ' + newMoves.map(m => m.title).join(', ') + '!');
      p.add(txt(this, 0, T0 + 560, notes.join('\n'), 36, '#ffd23f', { st: 6, wrap: pw - 100 }));
      const by = T0 + (PORTRAIT ? 760 : 730);
      p.add(button(this, PORTRAIT ? 0 : -210, by, 380, 120, 'AGAIN!', C.star, () => fade(this, 'catch', { world: this.world }), { size: 48 }));
      p.add(button(this, PORTRAIT ? 0 : 210, PORTRAIT ? by + 150 : by, 380, 120, 'MAP', C.cream, () => fade(this, 'map', { world: this.world }), { size: 48 }));
      this.tweens.add({ targets: p, scale: 1, duration: 420, ease: 'Back.out' });
      if (after.l > before.l) this.time.delayedCall(700, () => { A.levelUp(); this.confetti.explode(120, W / 2, H * 0.6); });
    }
  }

  // ---------- Comic: a short animated comic page the first time the player arrives in a new world (#31, docs/gdd/0.8-canada.md 7b)
  const comicDue = () => !(Save.data.comics && Save.data.comics.canada) && worldOpen(CANADA);
  class ComicScene extends Phaser.Scene {
    constructor() { super('comic'); }
    init(data) { this.d = data || {}; this.then = this.d.then || { key: 'map', data: { world: CANADA } }; this.start0 = this.d.panel || 0; }
    create() {
      this._leaving = false;
      this.cameras.main.fadeIn(300, 15, 18, 64);
      // paper with halftone dots
      this.add.rectangle(W / 2, H / 2, W, H, 0xfff3d2);
      this.add.tileSprite(BLEED.cx, BLEED.cy, GW, GH, 'halftone').setAlpha(0.6);
      const top = PORTRAIT ? 150 : 130, bot = 200, gut = 30;
      const rects = [];
      for (let i = 0; i < 3; i++) {
        if (PORTRAIT) { const ph = (H - top - bot - gut * 2) / 3; rects.push({ x: W / 2, y: top + ph / 2 + i * (ph + gut), w: W - 80, h: ph }); }
        else { const pw = (W - 80 - gut * 2) / 3, ph = H - top - bot; rects.push({ x: 40 + pw / 2 + i * (pw + gut), y: top + ph / 2, w: pw, h: ph }); }
      }
      this.rects = rects; this.panels = []; this.cur = -1; this.steps = []; this.live = []; this.titled = false; this.nextEv = null; // the scene object is reused (replay)
      const skip = button(this, W - 150, PORTRAIT ? 80 : 70, 220, 90, 'SKIP', C.cream, () => this.toTitle(), { size: 40 }).setDepth(90);
      this.skipBtn = skip;
      this.hint = txt(this, W / 2, H - 100, 'Tap to go on', 34, '#4a4f8c', { st: 0, shadow: false, weight: '500' }).setDepth(90);
      this.input.on('pointerdown', p => { if (p.worldY < 140 && p.worldX > W - 300) return; this.tap(); });
      A.whoosh();
      for (let i = 0; i < this.start0 && i < 3; i++) this.play(i, true);
      if (this.start0 >= 3) this.toTitle(); else this.play(this.start0, false);
    }
    // a panel frame: ink border, hard shadow, tilted a little; returns a container in panel coordinates (0..w, 0..h, centred)
    frame(i) {
      const r = this.rects[i], c = this.add.container(r.x, r.y).setDepth(10 + i).setAngle((i - 1) * 1.2);
      const g = this.add.graphics();
      g.fillStyle(0x1d2163, 0.25); g.fillRoundedRect(-r.w / 2 + 12, -r.h / 2 + 12, r.w, r.h, 18);
      c.add(g); c.r = r; return c;
    }
    border(c) { const r = c.r, g = this.add.graphics(); g.lineStyle(10, 0x1d2163); g.strokeRoundedRect(-r.w / 2, -r.h / 2, r.w, r.h, 18); c.add(g); }
    // inner picture fitted to the panel (no masks: the pictures are sized to the panel)
    bg(c, key, tint) { const r = c.r, b = this.add.image(0, 0, key).setDisplaySize(r.w - 10, r.h - 10); if (tint) b.setTint(tint); c.add(b); return b; }
    actor(c, key, fx, fy, hFrac, wFrac = 0.45) { const r = c.r, a = this.add.image((fx - 0.5) * r.w, (fy - 0.5) * r.h, key).setOrigin(0.5, 1); a.setScale(Math.min(hFrac * r.h / a.height, wFrac * r.w / a.width)); c.add(a); return a; }
    bubble(c, fx, fy, text, tailX, instant) {
      const r = c.r, x = (fx - 0.5) * r.w, y = (fy - 0.5) * r.h;
      const t = txt(this, 0, 0, text, PORTRAIT ? 32 : 30, '#1d2163', { st: 0, shadow: false, wrap: Math.min(r.w * 0.8, 560) });
      const bw = t.width + 60, bh = t.height + 44, g = this.add.graphics();
      g.fillStyle(0xffffff); g.lineStyle(6, 0x1d2163);
      g.fillTriangle(tailX * bw * 0.3 - 20, bh / 2 - 8, tailX * bw * 0.3 + 20, bh / 2 - 8, tailX * bw * 0.45, bh / 2 + 44);
      g.strokeTriangle(tailX * bw * 0.3 - 20, bh / 2 - 8, tailX * bw * 0.3 + 20, bh / 2 - 8, tailX * bw * 0.45, bh / 2 + 44);
      g.fillEllipse(0, 0, bw, bh); g.strokeEllipse(0, 0, bw, bh);
      g.fillStyle(0xffffff); g.fillRect(tailX * bw * 0.3 - 16, bh / 2 - 14, 32, 10);
      // keep the bubble inside its panel (a little overlap on the border is comic style)
      const b = this.add.container(clamp(x, -r.w / 2 + bw / 2 - 10, r.w / 2 - bw / 2 + 10), y, [g, t]); c.add(b);
      if (!instant) { b.setScale(0); this.anim({ targets: b, scale: 1, duration: 260, ease: 'Back.out' }); A.babble && A.babble(text.length); }
      return b;
    }
    burst(c, fx, fy, word, size, instant) {
      const r = c ? c.r : null, x = c ? (fx - 0.5) * r.w : fx, y = c ? (fy - 0.5) * r.h : fy, R = size * 1.6, g = this.add.graphics();
      const star = (rad, col) => { const pts = []; for (let k = 0; k < 28; k++) { const a = k * Math.PI / 14, rr = k % 2 ? rad * 0.62 : rad; pts.push(new Phaser.Geom.Point(Math.cos(a) * rr * 1.25, Math.sin(a) * rr)); } g.fillStyle(col); g.fillPoints(pts, true); g.lineStyle(6, 0x1d2163); g.strokePoints(pts, true); };
      star(R, 0xffd23f); star(R * 0.72, 0xff6b5b);
      const t = txt(this, 0, 0, word, size, '#fff3d2', { stroke: '#1d2163', st: Math.round(size / 6) });
      const b = this.add.container(x, y, [g, t]).setAngle(-6);
      if (c) c.add(b);
      if (!instant) { b.setScale(0); this.anim({ targets: b, scale: 1, duration: 300, ease: 'Back.out' }); }
      return b;
    }
    // finite tweens are kept so a tap can jump them to their end; endless wobbles keep running
    anim(cfg) { const t = this.tweens.add(cfg); if (cfg.repeat !== -1) this.live.push([t, cfg]); return t; }
    // a timed step of the panel script; fn(instant)
    at(ms, fn, auto) { const rec = { fn, auto, ran: false }; this.later.push(rec); this.steps.push(this.time.delayedCall(ms, () => { rec.ran = true; fn(false); })); }
    // panel i: instant = draw it already finished (fast taps, coming back after a rotation)
    play(i, instant) {
      this.cur = i; this.d.panel = i; this.sys.settings.data = Object.assign({}, this.d, { panel: i });
      this.steps = []; this.later = []; this.live = []; this.done = false;
      const c = this.frame(i); this.panels.push(c);
      if (i === 0) {
        this.bg(c, 'sky4'); const au = this.bg(c, 'aurora'); au.setAlpha(0.8);
        for (let k = 0; k < 4; k++) { const p = this.actor(c, 'pine', 0.14 + k * 0.24, 0.98, 0.4, 0.2); p.setAlpha(0.8).setTint(0x9fb6d8); }
        const jack = this.actor(c, 'jack_side', instant ? 0.3 : -0.3, 0.95, 0.5);
        this.anim({ targets: jack, angle: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: -1 });
        if (!instant) this.anim({ targets: jack, x: (0.3 - 0.5) * c.r.w, duration: 700, ease: 'Quad.out' });
        // caption types in
        const cap = txt(this, -c.r.w / 2 + 30, -c.r.h / 2 + 30, '', PORTRAIT ? 34 : 30, '#1d2163', { ox: 0, oy: 0, st: 0, shadow: false });
        const capBg = this.add.graphics(); c.add([capBg, cap]);
        const full = 'MEANWHILE, IN CANADA...';
        const drawCap = () => { capBg.clear(); capBg.fillStyle(0xffd23f); capBg.lineStyle(5, 0x1d2163); capBg.fillRect(-c.r.w / 2 + 14, -c.r.h / 2 + 16, cap.width + 32, cap.height + 28); capBg.strokeRect(-c.r.w / 2 + 14, -c.r.h / 2 + 16, cap.width + 32, cap.height + 28); };
        if (instant) { cap.setText(full); drawCap(); }
        else { let n = 0; const ev = this.time.addEvent({ delay: 30, repeat: full.length - 1, callback: () => { cap.setText(full.slice(0, ++n)); drawCap(); } }); this.steps.push(ev); this.later.push({ fn: () => { cap.setText(full); drawCap(); }, ran: false }); }
        const say = inst => this.bubble(c, 0.68, 0.36, 'Brrr! Why is the sky made of ice cream?', -1, inst);
        instant ? say(true) : this.at(900, say);
        if (!instant) { const sn = this.add.particles(0, 0, 'dot', { x: { min: -c.r.w / 2, max: c.r.w / 2 }, y: -c.r.h / 2, speedY: { min: 80, max: 160 }, lifespan: c.r.h / 160 * 1000, scale: { min: 0.1, max: 0.22 }, frequency: 120 }); c.add(sn); }
      } else if (i === 1) {
        this.bg(c, 'sky4');
        const g = this.add.graphics(); g.fillStyle(0xf2f8ff); g.fillRect(-c.r.w / 2 + 5, c.r.h * 0.2, c.r.w - 10, c.r.h * 0.3 - 5); c.add(g);
        // head first in the snowbank: the upside-down Jack, the head half hidden by a snow mound, tail wagging
        const j = this.actor(c, 'jack_upside', 0.55, 0.88, 0.7);
        // the mound is sized from Jack, so his tail always sticks out (QA B57)
        const mh = Math.min(j.displayHeight * 0.55, 2 * (c.r.h * 0.48 - j.y));
        const snow = this.add.graphics(); snow.fillStyle(0xffffff); snow.fillEllipse(j.x, j.y, Math.max(j.displayWidth * 1.4, c.r.w * 0.4), mh); c.add(snow);
        this.anim({ targets: j, angle: { from: -6, to: 6 }, duration: 260, yoyo: true, repeat: -1 });
        const fw = inst => { this.burst(c, 0.22, 0.28, 'FWUMP!', PORTRAIT ? 72 : 60, inst); if (!inst) { A.stomp(); A.whoosh(); } };
        instant ? fw(true) : this.at(200, fw);
      } else {
        this.bg(c, 'sky4');
        const g = this.add.graphics(); g.fillStyle(0xf2f8ff); g.fillRect(-c.r.w / 2 + 5, c.r.h * 0.15, c.r.w - 10, c.r.h * 0.35 - 5); c.add(g);
        this.actor(c, 'pine', 0.88, 0.72, 0.5).setAlpha(0.9);
        this.sasq = this.actor(c, 'sasquatch', 0.88, 0.7, 0.3).setVisible(false);
        this.actor(c, 'moose', 0.7, 0.98, 0.42);
        this.actor(c, 'pancakes', 0.5, 0.8, 0.18);
        this.actor(c, 'jack_front', 0.24, 0.98, 0.5);
        // B58: narrow pines stay inside panel 1, snow melts before its bottom edge, Max's bubble points at Max
        const s1 = inst => this.bubble(c, 0.62, 0.2, 'Sorry, eh! Welcome to Canada!', 0.2, inst);
        const s2 = inst => this.bubble(c, 0.34, 0.42, 'Why are YOU sorry? I fell on YOUR snow!', -1, inst);
        if (instant) { s1(true); s2(true); } else { this.at(200, s1); this.at(1400, s2); }
      }
      this.border(c);
      if (!instant) {
        c.y += 60; c.setAlpha(0); this.anim({ targets: c, y: c.r.y, alpha: 1, duration: 300, ease: 'Back.out' });
        const len = [2700, 2500, 3500][i];
        this.at(len, () => this.finishPanel(true), true);
      } else this.done = true;
    }
    // jump to the end state of the current panel
    finishPanel(auto) {
      if (this.done) return; this.done = true;
      this.steps.forEach(e => e.remove(false)); this.steps = [];
      const later = this.later; this.later = [];
      if (!auto) later.forEach(r => { if (!r.ran && !r.auto) { r.ran = true; r.fn(true); } });
      // stop the finite tweens and put their targets at the end values (Tween.complete() does not jump to the end)
      const META = ['targets', 'duration', 'ease', 'delay', 'yoyo', 'repeat', 'onComplete'];
      this.live.forEach(([t, cfg]) => {
        t.stop();
        [].concat(cfg.targets).forEach(o => Object.keys(cfg).forEach(k => { if (META.includes(k)) return; const v = cfg[k]; if (typeof v === 'number') o[k] = v; else if (v && typeof v.to === 'number') o[k] = v.to; }));
      });
      this.live = [];
      const c = this.panels[this.cur]; if (c) { c.y = c.r.y; c.setAlpha(1); }
      if (auto) this.nextEv = this.time.delayedCall(300, () => { this.nextEv = null; this.next(); });
    }
    next() { if (this._leaving || this.titled) return; if (this.cur >= 2) this.toTitle(); else this.play(this.cur + 1, false); }
    tap() {
      if (this.titled) return;
      if (this.nextEv) { this.nextEv.remove(false); this.nextEv = null; } // a tap in the short pause after an auto-finish: one step only (code review)
      if (!this.done) this.finishPanel(false); else this.next();
    }
    toTitle() {
      if (this.titled) return; this.titled = true;
      Save.data.comics = Object.assign({}, Save.data.comics, { canada: true }); Save.store(); // seen once the title page shows (SKIP or the end)
      if (this.nextEv) { this.nextEv.remove(false); this.nextEv = null; }
      while (this.cur < 2) { this.finishPanel(false); this.play(this.cur + 1, true); }
      if (!this.done) this.finishPanel(false);
      this.d.panel = 3; this.sys.settings.data = Object.assign({}, this.d, { panel: 3 });
      this.skipBtn.setVisible(false); this.hint.setVisible(false);
      if (this.sasq) { this.sasq.setVisible(true); this.tweens.add({ targets: this.sasq, angle: { from: -8, to: 8 }, duration: 300, yoyo: true, repeat: -1 }); }
      const r0 = this.rects[0], r1 = this.rects[1];
      const b = this.burst(null, PORTRAIT ? W / 2 : (r0.x + r1.x) / 2, PORTRAIT ? (r0.y + r0.h / 2 + r1.y - r1.h / 2) / 2 : H * 0.42, 'CANADA!', PORTRAIT ? 120 : 110, false); b.setDepth(50);
      A.comicSting && A.comicSting(); this.time.delayedCall(400, () => A.levelUp());
      const leaves = this.add.particles(0, 0, 'mapleleaf', { x: { min: 0, max: W }, y: -60, speedY: { min: 250, max: 500 }, speedX: { min: -120, max: 120 }, rotate: { min: 0, max: 360 }, lifespan: 4000, scale: { min: 0.15, max: 0.3 }, quantity: 2, frequency: 120 }).setDepth(49);
      this.time.delayedCall(2500, () => leaves.stop());
      const go = button(this, W / 2, H - 110, 460, 130, this.then.key === 'album' ? 'DONE!' : 'LET\'S GO!', C.star, () => {
        Save.data.comics = Object.assign({}, Save.data.comics, { canada: true }); Save.store();
        fade(this, this.then.key, this.then.data);
      }, { size: 56 }).setDepth(60);
      this.tweens.add({ targets: go, scale: 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  // ---------- Pond Hockey (v0.8 Canada, docs/gdd/0.8-canada.md 4b): shoot pucks past Beaver Bob. 45 s, nobody loses.
  const hockeyOpen = () => (Save.data.stars.beaver || 0) > 0;
  class HockeyScene extends Phaser.Scene {
    constructor() { super('hockey'); }
    init() { this.world = CANADA; }
    create() {
      this._leaving = false;
      this.cameras.main.fadeIn(350, 15, 18, 64);
      sky(this, CANADA);
      // the rink: light-blue ice with scratch lines and snowy boards
      // the net sits in the middle of the screen (portrait) so the shot is not too long
      this.netY = PORTRAIT ? Math.max(720, H * 0.4) : Math.max(290, H * 0.32); this.netW = PORTRAIT ? 420 : 460; this.netX = W / 2;
      const top = this.netY - (PORTRAIT ? 260 : 200);
      const g = this.add.graphics().setDepth(1);
      g.fillGradientStyle(0xe8f4ff, 0xe8f4ff, 0x9fc3ea, 0x9fc3ea, 1); g.fillRect(-SL, top, W + SL + SR, H - top + SB);
      g.lineStyle(4, 0xffffff, 0.6); for (let i = 0; i < 26; i++) { const x = rnd(0, W), y = rnd(top + 40, H); g.lineBetween(x, y, x + rnd(-120, 120), y + rnd(-20, 20)); }
      g.fillStyle(0xffffff, 0.95); g.fillRect(-SL, top - 30, W + SL + SR, 40);
      g.lineStyle(6, 0xd94a3d, 0.7); g.lineBetween(-SL, this.netY + 120, W + SR, this.netY + 120);
      // the net and Bob
      const ng = this.add.graphics().setDepth(4);
      ng.fillStyle(0xffffff, 0.35); ng.fillRect(this.netX - this.netW / 2, this.netY - 150, this.netW, 150);
      ng.lineStyle(2, 0xffffff, 0.7); for (let x = -this.netW / 2; x <= this.netW / 2; x += 30) ng.lineBetween(this.netX + x, this.netY - 150, this.netX + x, this.netY);
      for (let y = -150; y <= 0; y += 30) ng.lineBetween(this.netX - this.netW / 2, this.netY + y, this.netX + this.netW / 2, this.netY + y);
      ng.lineStyle(14, 0xd94a3d); ng.strokeRect(this.netX - this.netW / 2, this.netY - 150, this.netW, 150);
      this.bob = this.add.image(this.netX, this.netY + 10, 'beaver').setOrigin(0.5, 1).setDepth(6);
      this.bob.setScale(150 / this.bob.width); this.bobV = 1; this.bobHalf = 75;
      this.dam = this.add.image(0, this.netY - 40, 'pillow').setDepth(7).setScale(1.05, 1.2).setVisible(false); this.damSide = 0; this.damT = 0; this.nextDam = 30;
      // the hero with the puck
      const hero = heroDef(this);
      this.heroY = H - (PORTRAIT ? 140 : 70);
      this.p = this.add.image(W / 2, this.heroY, hero.isJack ? 'jack_side' : hero.tex).setOrigin(0.5, 1).setDepth(10);
      const ps = PORTRAIT ? 300 : 240; this.p.setScale(Math.min(ps / this.p.height, ps / this.p.width));
      this.stick = this.add.image(W / 2 + 120, this.heroY - 40, 'hockey').setDepth(11).setScale(iconScale('hockey', 150));
      this.puckY = this.heroY - (PORTRAIT ? 380 : 300); this.puckX = W / 2;
      this.puck = null; this.aim = 0; this.shots = 0; this.score = 0; this.streak = 0; this.bestStreak = 0;
      this.left = 45; this.elapsed = 0; this.running = false; this.waitT = 0;
      this.sparks = this.add.particles(0, 0, 'spark', { emitting: false, speed: { min: 200, max: 600 }, lifespan: 450, scale: { start: 0.7, end: 0 }, tint: [C.star, 0xffffff], blendMode: 'ADD' }).setDepth(21);
      this.confetti = this.add.particles(0, 0, 'conf', { emitting: false, speed: { min: 500, max: 1300 }, angle: { min: 230, max: 310 }, gravityY: 1100, lifespan: 2600, rotate: { min: 0, max: 360 }, tint: [0xff6b5b, 0xffd23f, 0x7fd6c2, 0x9aa2ff, 0xff9ed8] }).setDepth(70);
      // HUD
      const hy = PORTRAIT ? 200 : 80;
      this.add.image(W / 2 - 80, hy, 'puck').setScale(0.7).setDepth(30);
      this.scoreT = txt(this, W / 2 - 10, hy, '0', 80, '#ffd23f', { ox: 0, st: 12 }).setDepth(30);
      this.timeT = txt(this, PORTRAIT ? W / 2 : W - 220, PORTRAIT ? hy + 100 : hy, '45', 64, '#fff3d2', { st: 10 }).setDepth(30);
      backButton(this, () => fade(this, 'map', { world: CANADA }));
      muteButton(this);
      // controls: swipe up from the lower half (angle + speed), tap the net area, or arrows + SPACE
      this.input.on('pointerdown', p => { this.sw = { x: p.worldX, y: p.worldY, t: performance.now() }; });
      this.input.on('pointerup', p => {
        const s = this.sw; this.sw = null; if (!s || !this.running) return;
        const dx = p.worldX - s.x, dy = p.worldY - s.y, dt = Math.max(30, performance.now() - s.t);
        if (dy < -60 && s.y > H * 0.45) {
          const ang = clamp(Math.atan2(dx, -dy), -0.61, 0.61), v = -dy / dt; // px per ms
          this.shoot(ang, clamp(0.7 - (v - 0.5) * 0.12, 0.45, 0.7));
        } else if (Math.abs(dx) < 40 && Math.abs(dy) < 40 && p.worldY < this.netY + 200 && p.worldY > Math.max(this.netY - 300, 170)) { // not the back / mute buttons
          this.shoot(Math.atan2(p.worldX - this.puckX, this.puckY - this.netY + 75), 0.6);
        }
      });
      this.keys = this.input.keyboard && this.input.keyboard.createCursorKeys();
      if (this.input.keyboard) this.input.keyboard.on('keydown-SPACE', () => this.running && this.shoot(this.aim, 0.55));
      this.aimLine = this.add.graphics().setDepth(9);
      this.intro();
    }
    async intro() {
      const c = this.add.container(W / 2, H * 0.45).setDepth(60);
      const pw = PORTRAIT ? 900 : 1000, ph = PORTRAIT ? 760 : 620;
      c.add(panel(this, 0, 0, pw, ph, C.night2, 0));
      c.add(txt(this, 0, -ph / 2 + 100, 'POND HOCKEY!', 90, '#ffd23f', { stroke: '#0f1240', st: 14 }));
      [['puck', 'GOAL +1', '#ffd23f'], ['mapleleaf', 'GOLD +2', '#7fe39a'], ['beaver', 'NOPE!', '#ff9ed8']].forEach(([k, l, col], i) => {
        const x = (i - 1) * (PORTRAIT ? 280 : 300), y = -10;
        c.add(img(this, x, y, k).setScale(iconScale(k, 130)));
        c.add(txt(this, x, y + 110, l, 48, col, { st: 8 }));
      });
      c.add(txt(this, 0, ph / 2 - (PORTRAIT ? 150 : 110), PORTRAIT ? 'Shoot past Bob!\nSwipe up or tap the net.' : 'Shoot past Bob! Swipe up, tap the net, or arrows + SPACE.', 36, '#fff3d2', { st: 0, weight: '500' }));
      c.setScale(0);
      await tw(this, { targets: c, scale: 1, duration: 380, ease: 'Back.out' });
      await wait(this, 2300);
      await tw(this, { targets: c, scale: 0, alpha: 0, duration: 250, ease: 'Quad.in' });
      c.destroy();
      for (const n of ['3', '2', '1', 'GO!']) {
        const t = txt(this, W / 2, H * 0.45, n, n === 'GO!' ? 200 : 180, n === 'GO!' ? '#7fe39a' : '#fff3d2', { stroke: '#0f1240', st: 18 }).setDepth(60).setScale(0);
        n === 'GO!' ? A.levelUp() : A.tick();
        await tw(this, { targets: t, scale: 1, duration: 260, ease: 'Back.out' });
        await wait(this, 380);
        this.tweens.add({ targets: t, scale: 1.5, alpha: 0, duration: 250, onComplete: () => t.destroy() });
      }
      this.running = true; this.newPuck();
    }
    newPuck() {
      if (!this.running) return;
      const gold = (this.shots + 1) % 5 === 0;
      this.puck = { o: this.add.image(this.puckX, this.puckY, 'puck').setDepth(12).setScale(0), gold, flying: false };
      if (gold) { this.puck.leaf = this.add.image(this.puckX, this.puckY - 10, 'mapleleaf').setDepth(13).setScale(0); this.tweens.add({ targets: this.puck.leaf, scale: iconScale('mapleleaf', 60), duration: 200 }); this.puck.o.setTint(0xffd23f); }
      this.tweens.add({ targets: this.puck.o, scale: 0.9, duration: 200, ease: 'Back.out' });
    }
    // ang: radians from straight up; dur: travel time in s
    shoot(ang, dur) {
      const pk = this.puck; if (!pk || pk.flying) return;
      pk.flying = true; this.shots++;
      A.slap(); buzz(20);
      this.tweens.add({ targets: this.stick, angle: { from: 0, to: -50 }, duration: 120, yoyo: true });
      const tx = this.puckX + Math.tan(ang) * (this.puckY - (this.netY - 70)), ty = this.netY - 70;
      const objs = [pk.o].concat(pk.leaf ? [pk.leaf] : []);
      this.tweens.add({ targets: objs, x: tx, y: ty, scale: '*=0.7', duration: dur * 1000, ease: 'Quad.out', onComplete: () => this.judge(pk, tx) });
      A.slide();
    }
    judge(pk, x) {
      if (!this.running) { [pk.o, pk.leaf].forEach(o => o && o.destroy()); return; } // time is up: the result is already shown (code review)
      const hw = this.netW / 2, off = Math.abs(x - this.netX);
      let res;
      if (off > hw + 22) res = 'wide';
      else if (off > hw - 18) res = 'post';
      else if (Math.abs(x - this.bob.x) < this.bobHalf + 10) res = 'save';
      else if (this.damT > 0 && (this.damSide < 0 ? x < this.netX : x > this.netX)) res = 'save';
      else res = 'goal';
      const fx = x, fy = this.netY - 120;
      if (res === 'goal') {
        const n = pk.gold ? 2 : 1; this.score += n; this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak);
        A.goalHorn(); if (pk.gold) A.levelUp(); buzz(40);
        this.sparks.explode(pk.gold ? 24 : 14, fx, fy);
        this.float(fx, fy, pk.gold ? 'GOLDEN GOAL! +2' : 'GOAL! +1', pk.gold ? '#7fe39a' : '#ffd23f');
        if (this.streak === 3) this.float(W / 2, this.netY + 120, 'HAT TRICK!', '#ff9ed8');
        this.scoreT.setText(String(this.score));
        this.tweens.add({ targets: this.scoreT, scale: { from: 1.25, to: 1 }, duration: 200, ease: 'Back.out' });
      } else {
        this.streak = 0;
        if (res === 'post') { A.block(); this.float(fx, fy, 'DING!', '#d8ecff'); }
        else if (res === 'save') { A.chomp(); this.float(fx, fy, 'NOPE!', '#ff9ed8'); this.tweens.add({ targets: this.bob, angle: { from: -10, to: 10 }, duration: 90, yoyo: true, repeat: 1, onComplete: () => this.bob.setAngle(0) }); }
        else this.float(fx, fy, 'WIDE!', '#bcc0ee');
      }
      const objs = [pk.o].concat(pk.leaf ? [pk.leaf] : []);
      this.tweens.add({ targets: objs, alpha: 0, duration: 250, delay: 150, onComplete: () => objs.forEach(o => o.destroy()) });
      this.puck = null; this.waitT = 0.4;
    }
    float(x, y, s, col) {
      const t = txt(this, x, y, s, 64, col, { stroke: '#0f1240', st: 10 }).setDepth(40);
      this.tweens.add({ targets: t, y: y - 140, alpha: 0, duration: 800, ease: 'Quad.out', onComplete: () => t.destroy() });
    }
    update(time, dtMs) {
      const dt = Math.min(dtMs, 50) / 1000;
      // Bob slides in the net: slow, medium, then fast with random turns
      const ph = this.elapsed < 15 ? 0 : this.elapsed < 30 ? 1 : 2, sp = [140, 230, 330][ph];
      if (ph === 2 && Math.random() < dt * 0.8) this.bobV *= -1;
      this.bob.x += this.bobV * sp * dt;
      const lim = this.netW / 2 - this.bobHalf;
      if (this.bob.x > this.netX + lim) { this.bob.x = this.netX + lim; this.bobV = -1; }
      if (this.bob.x < this.netX - lim) { this.bob.x = this.netX - lim; this.bobV = 1; }
      // aim with the arrows
      if (this.keys) { if (this.keys.left.isDown) this.aim = clamp(this.aim - 1.2 * dt, -0.61, 0.61); if (this.keys.right.isDown) this.aim = clamp(this.aim + 1.2 * dt, -0.61, 0.61); }
      this.aimLine.clear();
      if (this.puck && !this.puck.flying && this.aim) { this.aimLine.lineStyle(6, 0xffffff, 0.5); this.aimLine.lineBetween(this.puckX, this.puckY, this.puckX + Math.sin(this.aim) * 260, this.puckY - Math.cos(this.aim) * 260); }
      if (!this.running) return;
      this.elapsed += dt; this.left -= dt;
      // from 30 s Bob builds a pillow dam over half of the net for 3 s, every ~8 s
      if (this.damT > 0) { this.damT -= dt; if (this.damT <= 0) this.dam.setVisible(false); }
      else if (this.elapsed >= this.nextDam) {
        this.damSide = Math.random() < 0.5 ? -1 : 1; this.damT = 3; this.nextDam = this.elapsed + 8;
        this.dam.setPosition(this.netX + this.damSide * this.netW / 4, this.netY - 40).setVisible(true); A.chomp();
      }
      const sec = Math.max(0, Math.ceil(this.left));
      if (this.timeT.text !== String(sec)) {
        this.timeT.setText(String(sec));
        if (sec <= 5) { this.timeT.setColor('#ff6b5b'); A.tick(); this.tweens.add({ targets: this.timeT, scale: { from: 1.3, to: 1 }, duration: 250 }); }
      }
      if (this.left <= 0) { this.end(); return; }
      if (!this.puck && this.waitT > 0) { this.waitT -= dt; if (this.waitT <= 0) this.newPuck(); }
    }
    end() {
      this.running = false; this.timeT.setText('0');
      const best = Save.data.bestHockey || 0, isBest = this.score > best;
      const gain = Math.min(60, this.score * 2);
      const before = levelOf(Save.data.xp);
      Save.data.xp += gain; if (isBest) Save.data.bestHockey = this.score; Save.store();
      emit('hockey', { score: this.score, streak: this.bestStreak }, this);
      const after = levelOf(Save.data.xp);
      A.win(); this.confetti.explode(100, W / 2, H);
      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0).setDepth(60).setInteractive();
      this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 300 });
      const pw = PORTRAIT ? 900 : 940, ph = PORTRAIT ? 1050 : 860, T0 = -ph / 2;
      const p = this.add.container(W / 2, H / 2).setDepth(61).setScale(0);
      p.add(panel(this, 0, 0, pw, ph, C.night2, 0));
      p.add(txt(this, 0, T0 + 110, 'TIME\'S UP!', 90, '#ffd23f', { stroke: '#0f1240', st: 14 }));
      p.add(this.add.image(-100, T0 + 260, 'puck').setScale(1.2));
      p.add(txt(this, 10, T0 + 260, String(this.score), 130, '#fff3d2', { ox: 0, stroke: '#0f1240', st: 16 }));
      p.add(txt(this, 0, T0 + 380, isBest && best > 0 ? 'NEW RECORD!' : 'Best: ' + Math.max(best, this.score), 44, isBest && best > 0 ? '#ff9ed8' : '#bcc0ee', { st: 7 }));
      p.add(txt(this, 0, T0 + 470, '+' + gain + ' XP', 64, '#7fe39a', { stroke: '#0f1240', st: 10 }));
      const notes = [];
      if (after.l > before.l) notes.push('LEVEL UP! Level ' + after.l);
      const newMoves = MOVES.filter(m => m.lvl > before.l && m.lvl <= after.l);
      if (newMoves.length && heroDef(this).isJack) notes.push('Jack learned: ' + newMoves.map(m => m.title).join(', ') + '!');
      if (this.bestStreak >= 3) notes.push('Hat trick! ' + this.bestStreak + ' goals in a row');
      p.add(txt(this, 0, T0 + 560, notes.join('\n'), 36, '#ffd23f', { st: 6, wrap: pw - 100 }));
      const by = T0 + (PORTRAIT ? 760 : 730);
      p.add(button(this, PORTRAIT ? 0 : -210, by, 380, 120, 'AGAIN!', C.star, () => fade(this, 'hockey'), { size: 48 }));
      p.add(button(this, PORTRAIT ? 0 : 210, PORTRAIT ? by + 150 : by, 380, 120, 'MAP', C.cream, () => fade(this, 'map', { world: CANADA }), { size: 48 }));
      this.tweens.add({ targets: p, scale: 1, duration: 420, ease: 'Back.out' });
      if (after.l > before.l) this.time.delayedCall(700, () => { A.levelUp(); this.confetti.explode(120, W / 2, H * 0.6); });
    }
  }

  // ---------- Capsule machine (gacha): turn the crank, get a surprise booster. Nothing to buy, ever.
  const CAP_COLORS = [0xff6b5b, 0xffd23f, 0x7fd6c2, 0x9aa2ff, 0xff9ed8, 0x7fe39a, 0xff8a3d];
  class GachaScene extends Phaser.Scene {
    constructor() { super('gacha'); }
    init(data) { this.world = (data && data.world) || 0; }
    create() {
      this._leaving = false; this.busy = false;
      this.cameras.main.fadeIn(350, 15, 18, 64);
      sky(this, this.world);
      txt(this, W / 2, PORTRAIT ? 190 : 80, 'CAPSULE MACHINE', PORTRAIT ? 76 : 70, '#fff3d2', { stroke: '#0f1240', st: 12 });
      this.countT = txt(this, W / 2, PORTRAIT ? 275 : 155, '', 36, '#ffd23f', { st: 6 });
      const short = PORTRAIT && H < 1900;
      this.mx = PORTRAIT ? W / 2 : W * 0.3; this.my = PORTRAIT ? (short ? 620 : 760) : 560; this.ms = short ? 0.8 : 1;
      this.machine();
      const by = this.my + (PORTRAIT ? 330 * this.ms + 90 : 390);
      this.turnBtn = button(this, this.mx, by, 380, 120, 'TURN!', C.star, () => this.turn(), { size: 56 });
      this.tweens.add({ targets: this.turnBtn, scale: 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.noneT = txt(this, this.mx, by, 'Win duels to get capsules.\nOne more is free every day!', 32, '#bcc0ee', { st: 5, weight: '500' });
      this.gridTop = PORTRAIT ? by + 140 : 250;
      this.grid = this.add.container(0, 0);
      this.refresh();
      backButton(this, () => fade(this, 'map', { world: this.world }));
      muteButton(this);
    }
    machine() {
      const m = this.m = this.add.container(this.mx, this.my).setScale(this.ms).setDepth(5);
      const g = this.add.graphics();
      // base + body
      g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-230, 10, 460, 320, 40);
      g.fillStyle(0xc9443a); g.fillRoundedRect(-240, 250, 480, 70, 24);
      g.fillStyle(C.coral); g.fillRoundedRect(-210, -10, 420, 290, 40);
      g.fillStyle(0xffffff, 0.22); g.fillRoundedRect(-190, 4, 380, 40, 20);
      g.lineStyle(6, 0x0f1240, 0.5); g.strokeRoundedRect(-210, -10, 420, 290, 40);
      // chute
      g.fillStyle(0x2b1a40); g.fillRoundedRect(-80, 180, 160, 80, 24);
      g.fillStyle(0x000000, 0.4); g.fillRoundedRect(-66, 192, 132, 50, 18);
      // dome
      g.fillStyle(0xbfe6ff, 0.16); g.fillCircle(0, -170, 215);
      m.add(g);
      // capsules inside the dome
      this.inside = [];
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 150;
        const x = Math.cos(a) * r, y = -130 + Math.abs(Math.sin(a)) * r * 0.55 - Math.random() * 60 + 20;
        const cg = this.add.graphics(); drawCapsule(cg, 0, 0, 40, CAP_COLORS[i % CAP_COLORS.length]);
        const cc = this.add.container(x, y, [cg]).setAngle(rnd(-40, 40));
        m.add(cc); this.inside.push(cc);
      }
      const gl = this.add.graphics();
      gl.lineStyle(10, 0xffffff, 0.9); gl.strokeCircle(0, -170, 215);
      gl.lineStyle(14, 0xffffff, 0.45); gl.beginPath(); gl.arc(0, -170, 180, Math.PI * 1.1, Math.PI * 1.45); gl.strokePath();
      gl.fillStyle(C.coral); gl.fillRoundedRect(-70, -405, 140, 50, 20); gl.fillStyle(C.star); gl.fillCircle(0, -410, 22);
      m.add(gl);
      // crank
      const ck = this.crank = this.add.container(0, 90);
      const kg = this.add.graphics();
      kg.fillStyle(0x0f1240, 0.35); kg.fillCircle(4, 6, 62);
      kg.fillStyle(C.cream); kg.fillCircle(0, 0, 60); kg.lineStyle(6, 0x0f1240, 0.5); kg.strokeCircle(0, 0, 60);
      kg.fillStyle(C.star); kg.fillRoundedRect(-70, -16, 140, 32, 16); kg.fillStyle(C.coral); kg.fillCircle(-62, 0, 20);
      ck.add(kg); m.add(ck);
      // little lights on the body
      for (let i = 0; i < 5; i++) {
        const l = this.add.circle(-150 + i * 75, 20, 11, CAP_COLORS[i]); m.add(l);
        this.tweens.add({ targets: l, alpha: 0.3, duration: 400, yoyo: true, repeat: -1, delay: i * 120 });
      }
    }
    refresh() {
      const g = Save.data.goldCaps || 0, n = Save.data.caps + g;
      this.countT.setText(n ? 'You have ' + n + ' capsule' + (n > 1 ? 's' : '') + (g ? ' (' + g + ' golden!)' : '') + '!' : 'No capsules right now');
      this.turnBtn.setVisible(n > 0); this.noneT.setVisible(n <= 0);
      // collection: all 10 boosters, unknown ones as "?"
      this.grid.removeAll(true);
      const cols = 5, cw = PORTRAIT ? 190 : Math.min(200, (W * 0.55 - 120) / 5), ch = PORTRAIT ? 220 : Math.round(cw * 1.3);
      const gx = PORTRAIT ? W / 2 : W * 0.72, gy = this.gridTop;
      const seen = BOOSTS.filter(b => Save.data.seen[b.id]).length;
      this.grid.add(txt(this, gx, gy, 'MY BOOSTERS  ' + seen + ' / ' + BOOSTS.length, 38, '#fff3d2', { st: 7 }));
      BOOSTS.forEach((b, i) => {
        const x = gx + ((i % cols) - 2) * (cw + 14), y = gy + 70 + ch / 2 + Math.floor(i / cols) * (ch + 16);
        const known = !!Save.data.seen[b.id], cnt = Save.data.boosts[b.id] || 0;
        const c = this.add.container(x, y);
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-cw / 2, -ch / 2 + 8, cw, ch, 26);
        g.fillStyle(known ? C.cream : 0x161946); g.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 26);
        g.lineStyle(5, known ? Phaser.Display.Color.HexStringToColor(RARITY[b.r].color).color : C.seam); g.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 26);
        c.add(g);
        if (known) {
          const ic = img(this, 0, -ch * 0.14, b.icon); ic.setScale(iconScale(b.icon, cw * 0.5)); c.add(ic);
          c.add(fit(txt(this, 0, ch * 0.22, b.name, 24, C.ink, { st: 0, shadow: false }), cw - 16));
          for (let k = 0; k < b.r; k++) c.add(this.add.image((k - (b.r - 1) / 2) * 26, ch / 2 - 24, 'star').setScale(0.1));
          if (cnt) c.add(chip(this, cw / 2 - 24, -ch / 2 + 8, '×' + cnt, C.star, 22));
          else c.setAlpha(0.6);
        } else c.add(txt(this, 0, -10, '?', 90, '#6a72d6', { st: 0, shadow: false }));
        c.setSize(cw, ch).setInteractive();
        c.on('pointerup', () => { if (known) { A.click(); this.hint2(b.name + ': ' + b.desc); } });
        this.grid.add(c);
      });
    }
    hint2(s) {
      if (this._h) this._h.destroy();
      const t = this._h = fit(txt(this, W / 2, H - 50, s, 32, '#ffd23f', { st: 6 }), W - 80).setDepth(70);
      this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
    }
    async turn() {
      const gold = (Save.data.goldCaps || 0) > 0;
      if (this.busy || (Save.data.caps <= 0 && !gold)) return;
      this.busy = true; this.turnBtn.setVisible(false);
      // golden capsules (from the weekly boss) always hold a SUPER RARE booster
      let b = rollBoost(); if (gold) { const sr = BOOSTS.filter(x => x.r === 3); b = sr[rnd(0, sr.length - 1)]; }
      const isNew = !Save.data.seen[b.id];
      if (gold) Save.data.goldCaps--; else Save.data.caps--; Save.data.boosts[b.id] = (Save.data.boosts[b.id] || 0) + 1; Save.data.seen[b.id] = true; Save.store();
      emit('capsule', { boost: b, isNew }, this);
      // crank + shake + capsules tumbling
      A.spin();
      for (let i = 0; i < 6; i++) this.time.delayedCall(i * 140, () => A.tick());
      this.tweens.add({ targets: this.crank, angle: 360, duration: 900, ease: 'Sine.inOut', onComplete: () => this.crank.setAngle(0) });
      this.tweens.add({ targets: this.m, x: this.mx + 10, duration: 60, yoyo: true, repeat: 7 });
      this.inside.forEach(c => this.tweens.add({ targets: c, y: c.y - rnd(20, 70), angle: c.angle + rnd(-120, 120), duration: 200, yoyo: true, repeat: 1, ease: 'Quad.out' }));
      await wait(this, 1000);
      // a capsule drops out of the chute
      const col = gold ? 0xffd23f : CAP_COLORS[rnd(0, CAP_COLORS.length - 1)];
      const cap = this.bigCapsule(col);
      const sx = this.mx, sy = this.my + 220 * this.ms;
      cap.c.setPosition(sx, sy).setScale(0.35).setDepth(20);
      A.thump(0.5);
      await tw(this, { targets: cap.c, y: sy + 150, scale: 0.6, duration: 380, ease: 'Bounce.out' });
      A.bounce();
      // ...and rolls to the middle of the screen
      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0).setDepth(18).setInteractive();
      this.tweens.add({ targets: dim, fillAlpha: 0.75, duration: 400 });
      await tw(this, { targets: cap.c, x: W / 2, y: H * 0.45, scale: 1.6, angle: 360, duration: 650, ease: 'Back.out' });
      cap.c.setAngle(0);
      const tap = txt(this, W / 2, H * 0.45 + 200, 'TAP TO OPEN!', 56, '#ffd23f', { stroke: '#0f1240', st: 10 }).setDepth(21);
      this.tweens.add({ targets: tap, scale: 1.12, duration: 400, yoyo: true, repeat: -1 });
      const wob = this.tweens.add({ targets: cap.c, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: -1 });
      await new Promise(r => { dim.once('pointerup', r); this.time.delayedCall(6000, r); });
      tap.destroy(); wob.stop(); cap.c.setAngle(0);
      for (let i = 0; i < 3; i++) { A.tick(); await tw(this, { targets: cap.c, angle: i % 2 ? 14 : -14, scale: 1.6 + i * 0.12, duration: 110, yoyo: true }); }
      // pop!
      A.poof(); A.thump(0.7); buzz(50);
      const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.9).setDepth(30);
      this.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
      this.tweens.add({ targets: cap.top, y: -260, x: -120, angle: -70, alpha: 0, duration: 650, ease: 'Quad.out' });
      this.tweens.add({ targets: cap.bot, y: 240, x: 120, angle: 50, alpha: 0, duration: 650, ease: 'Quad.out', onComplete: () => cap.c.destroy() });
      this.reveal(b, isNew, dim);
    }
    bigCapsule(col) {
      const r = 110;
      const top = this.add.graphics(); top.fillStyle(col); top.slice(0, 0, r, Math.PI, 0, false); top.fillPath();
      top.lineStyle(10, 0x0f1240, 0.8); top.beginPath(); top.arc(0, 0, r, Math.PI, 0, false); top.strokePath(); top.lineBetween(-r, 0, r, 0);
      top.fillStyle(0xffffff, 0.5); top.fillEllipse(-r * 0.35, -r * 0.5, r * 0.5, r * 0.26);
      const bot = this.add.graphics(); bot.fillStyle(C.cream); bot.slice(0, 0, r, 0, Math.PI, false); bot.fillPath();
      bot.lineStyle(10, 0x0f1240, 0.8); bot.beginPath(); bot.arc(0, 0, r, 0, Math.PI, false); bot.strokePath();
      const c = this.add.container(0, 0, [bot, top]);
      return { c, top, bot };
    }
    reveal(b, isNew, dim) {
      const R = RARITY[b.r], cx = W / 2, cy = H * 0.42;
      const layer = this.add.container(0, 0).setDepth(25);
      const rays = this.add.image(cx, cy, 'glow').setScale(b.r === 3 ? 3.4 : 2.6).setAlpha(0.9).setTint(Phaser.Display.Color.HexStringToColor(R.color).color);
      this.tweens.add({ targets: rays, scale: rays.scale * 1.15, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
      layer.add(rays);
      for (let i = 0; i < 10; i++) {
        const sp = this.add.image(cx, cy, 'spark').setTint(C.star).setScale(0.6).setAlpha(0.8);
        const a = i / 10 * Math.PI * 2;
        this.tweens.add({ targets: sp, x: cx + Math.cos(a) * 260, y: cy + Math.sin(a) * 260, angle: 180, alpha: 0, scale: 0.2, duration: 900, repeat: -1, delay: i * 90 });
        layer.add(sp);
      }
      const ic = img(this, cx, cy, b.icon); const s0 = iconScale(b.icon, 280); ic.setScale(0); layer.add(ic);
      this.tweens.add({ targets: ic, scale: s0, angle: { from: -30, to: 0 }, duration: 500, ease: 'Back.out' });
      this.tweens.add({ targets: ic, y: cy - 16, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 500 });
      const rt = txt(this, cx, cy - 250, R.name, b.r === 3 ? 64 : 50, R.color, { stroke: '#0f1240', st: 10 }); layer.add(rt);
      const nt = fit(txt(this, cx, cy + 200, b.name, 76, '#fff3d2', { stroke: '#0f1240', st: 12 }), W - 80); layer.add(nt);
      const dt = fit(txt(this, cx, cy + 285, b.desc, 38, '#bcc0ee', { st: 6, weight: '500' }), W - 80); layer.add(dt);
      if (isNew) { const nc = chip(this, cx + 170, cy - 150, 'NEW!', C.coral, 34).setAngle(12); layer.add(nc); this.tweens.add({ targets: nc, scale: 1.15, duration: 400, yoyo: true, repeat: -1 }); }
      [rt, nt, dt].forEach((t, i) => { const sc = t.scale; t.setScale(0); this.tweens.add({ targets: t, scale: sc, duration: 300, delay: 200 + i * 120, ease: 'Back.out' }); });
      b.r >= 2 ? A.win() : A.levelUp();
      const conf = this.add.particles(0, 0, 'conf', { emitting: false, speed: { min: 500, max: 1300 }, angle: { min: 230, max: 310 }, gravityY: 1100, lifespan: 2600, rotate: { min: 0, max: 360 }, tint: CAP_COLORS }).setDepth(40);
      conf.explode(b.r === 3 ? 200 : b.r === 2 ? 110 : 60, W / 2, H);
      if (b.r === 3) this.time.delayedCall(500, () => { conf.explode(120, W * 0.2, H); conf.explode(120, W * 0.8, H); A.starDing(2); });
      const ok = button(this, cx, cy + 420, 380, 120, Save.data.caps + (Save.data.goldCaps || 0) > 0 ? 'ONE MORE!' : 'NICE!', C.star, () => {
        ok.disableInteractive();
        this.tweens.add({ targets: [layer, ok, dim], alpha: 0, duration: 250, onComplete: () => {
          layer.destroy(true); ok.destroy(); dim.destroy(); this.time.delayedCall(2600, () => conf.destroy());
          this.busy = false; this.refresh();
          if (Save.data.caps + (Save.data.goldCaps || 0) > 0) this.turn();
        } });
      }, { size: 50 }).setDepth(26);
    }
  }

  // ---------- start
  // helpers + data shared with plugin scenes (js/extra.js, js/net.js)
  PS = { VERSION, W, H, PORTRAIT, C, A, FONT, Save, IDB, TOYS, MOVES, RIVALS, WORLDS, BOOSTS, BOOST_BY_ID, RARITY, COSTUMES, KRAKEN, DIFFS, EVENT_ON, SPOOKY, SPACE, CANADA,
    txt, fit, tw, wait, rnd, clamp, buzz, img, iconScale, sky, groundKey, button, panel, chip, fitImage, starRow, fade, backButton, muteButton, capsuleButton, drawCapsule,
    addTexture, hatImage, levelOf, heroDef, jackDef, toyDef, toyById, totalStars, isUnlocked, emit, dailyCapsule };
  const EXTRA_SCENES = [].concat(...PLUGINS.map(p => { try { return p.scenes ? p.scenes(PS) : []; } catch (e) { console.warn('plugin scenes', e); return []; } }));
  function snapshot(game) {
    const sc = game.scene.getScenes(true).find(x => x.scene.key !== 'boot');
    if (!sc) return null;
    const key = sc.scene.key, data = Object.assign({}, sc.sys.settings.data || {});
    delete data.resume;
    if (key === 'battle') {
      if (sc.over && sc.shown && sc.hero) return { key, data, battle: Object.assign(sc.snapshot(), { result: sc.shown }) }; // (QA B31)
      if (sc.over) return { key: sc.backKey || 'map', data: { world: sc.world } };
      if (sc.hero) return { key, data, battle: sc.snapshot() };
    }
    if (key === 'studio') return { key: 'title', data: {} };
    return { key, data };
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#1d2163', width: GW, height: GH,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    dom: { createContainer: true },
    fps: { smoothStep: !DEBUG },
    input: { activePointers: 2 }, render: { antialias: true, powerPreference: 'high-performance' },
    scene: [Boot, Title, MapScene, SquadScene, StudioScene, Battle, CatchScene, HockeyScene, ComicScene, GachaScene].concat(EXTRA_SCENES),
  });
  // every scene tells the plugins when it has been built (for popups, bedtime checks, inbox...)
  // ...and a rotation held back (duel turn, result celebration) is applied on the next screen if it is still waiting
  game.events.once('ready', () => game.scene.scenes.forEach(sc => {
    sc.events.on('start', () => { safeCam(sc); sc._psFades = []; });
    sc.events.on('create', () => { safeCam(sc); if (sc.scene.key !== 'boot') A.music(sc.scene.key !== 'battle' || sc.over ? 'calm' : sc.R && sc.R.boss ? 'boss' : sc.R && sc.R.world === CANADA ? 'north' : 'battle'); emit('scene', { key: sc.scene.key }, sc); if (window.__psRotatePending && sc.scene.key !== 'boot') sc.time.delayedCall(100, () => window.__psTryRebuild && window.__psTryRebuild()); [700, 2200].forEach(t => sc.time.delayedCall(t, () => tintPage(game))); });
  }));
  window.__psJudgeSave = judgeSave; window.__game = game; window.__save = Save; window.__RIVALS = RIVALS; window.__IDB = IDB; window.__BOOSTS = BOOSTS;
  window.__psPortrait = PORTRAIT; window.__psAspect = ASPECT; window.__psInsets = INS;
  window.__psSnapshot = () => snapshot(game);
  // don't rebuild in the middle of taking a toy photo (the phone keyboard also changes the window size there)
  // ...and not while a duel turn is playing out: the snapshot would restore it as YOUR TURN (QA B02)
  window.__psBlockRotate = () => game.scene.isActive('studio') || (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) ||
    (game.scene.isActive('battle') && (b => !!(b.hero && ((b.busy && !b.shown) || b.celebrating)))(game.scene.getScene('battle'))) || window.__psToasts > 0; // ...and not before the rewards are given (QA B31)
  } // end main

  let rotT = 0, built = false;
  function rebuild(target) {
    const snap = target || (window.__psSnapshot && window.__psSnapshot());
    const old = window.__game;
    try { window.__save && window.__save.store(); } catch (e) {} // stats bumped in memory (blocks, naps, saves...) survive the rebuild (QA B47; Save lives inside main())
    if (old) { try { old.destroy(true); } catch (e) {} }
    window.__game = null; window.__psToasts = 0;
    main(snap);
  }
  window.__psRebuild = rebuild;
  // rebuild when the phone is rotated, or when the usable screen changes a lot
  // (e.g. iOS home-screen web app settling its size after launch)
  function viewChanged() {
    const v = viewSize(), i = insets(), uw = v.w - i.l - i.r, uh = v.h - i.t - i.b, p = uh > uw, a = uw / uh, o = window.__psInsets || i;
    const same = ['t', 'b', 'l', 'r'].every(k => Math.abs(i[k] - o[k]) < 2);
    return !(same && p === window.__psPortrait && Math.abs(a - window.__psAspect) / window.__psAspect < 0.03);
  }
  window.__psTryRebuild = () => {
    if (!built || !viewChanged()) { window.__psRotatePending = false; return; }
    if (window.__psBlockRotate && window.__psBlockRotate()) { window.__psRotatePending = true; return; }
    window.__psRotatePending = false;
    rebuild();
  };
  window.addEventListener('resize', () => {
    clearTimeout(rotT);
    rotT = setTimeout(() => window.__psTryRebuild(), 300);
  });
  document.addEventListener('visibilitychange', () => { const A = window.PSAudio; if (!A.ctx) return; document.hidden ? A.ctx.suspend() : A.ctx.resume(); });
  const fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('500 40px Poppins')]).catch(() => {}) : Promise.resolve();
  // wait for fonts and (if online play is set up) the saved login, but never more than ~3 s
  const netReady = window.PSNetReady || Promise.resolve();
  Promise.race([Promise.all([fontsReady, netReady.catch(() => {})]), new Promise(r => setTimeout(r, 3000))]).then(() => { built = true; main(null); });
})();
