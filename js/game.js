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
  const VERSION = '1.1.1';
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
  if (!Array.isArray(Save.data.away)) Save.data.away = []; // toys on an adventure (v1.0, js/adventure.js)
  if (!Save.data.costume) Save.data.costume = 'none';
  // v0.8 save migration (runs on every load, also after a cloud save is pulled in; never takes anything away)
  Save.migrate = d => {
    if (!d.stars || typeof d.stars !== 'object') d.stars = {}; // a partial save (B76): missing fields are empty, never a throw
    if (!Array.isArray(d.toys)) d.toys = [];
    ['diff', 'caps', 'boosts', 'seen', 'stats', 'ach', 'costumes'].forEach((k, i) => { if (d[k] == null) d[k] = ['normal', 0, {}, {}, {}, {}, {}][i]; }); // also for a cloud save (applyCloud)
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
    // once, for saves from before v0.9 (comics for every world, #62): the Pillow Hills comic is unlocked in the Album
    // for players who already played (it autoplays for new players only); Space is not, it plays once for everyone
    if (!d.mig09) {
      const played = (d.xp || 0) > 0 || (d.wins || 0) > 0 || Object.keys(d.stars).some(k => d.stars[k] > 0);
      if (played) d.comics = Object.assign({}, d.comics, { hills: true });
      d.mig09 = 1;
    }
    // Pillow Week (#32, v0.9): a save that already took today's daily capsule starts on day 1 today (no extra reward);
    // everyone else starts with an empty track. Nobody starts mid-week.
    if (!d.streak || !Array.isArray(d.streak.days)) {
      const E = window.PSExtra, t = E ? E.todayKey() : '';
      d.streak = E && d.daily === new Date().toDateString() ? { days: [t], pillow: 0, at: Date.now(), weeks: 0, seen: t } : { days: [], pillow: 0, at: 0, weeks: 0, seen: '' };
    }
    // once, for saves from before v1.0 (Ocean and Veggie Patch are worlds 3 and 4, Spooky moves from 3 to 5)
    if (!d.mig10) {
      if (d.lastWorld === 3) d.lastWorld = 5;
      d.mig10 = 1;
    }
    // once, for saves from before v1.1 (Countryballs is world 5, Spooky moves from 5 to 6)
    if (!d.mig11) {
      if (d.lastWorld === 5) d.lastWorld = 6;
      d.mig11 = 1;
    }
  };
  Save.migrate(Save.data);
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
  // Pillow Week (#32): replaces the daily capsule. One step of the 7-day track on the first map open of the local day;
  // the reward is stored at once (a popup or a rotation never gives it twice). Returns js/extra.js streakStep()'s result.
  function dailyStreak() {
    const E = window.PSExtra; if (!E) return null;
    const r = E.streakStep(Save.data.streak, E.todayKey(), Date.now());
    Save.data.streak = r.st;
    if (r.kind === 'none') return r;
    if (r.reward) {
      const w = r.reward;
      Save.data.caps += w.caps; if (w.gold) Save.data.goldCaps = (Save.data.goldCaps || 0) + w.gold; if (w.xp) Save.data.xp += w.xp;
      Save.data.daily = new Date().toDateString(); // the old daily-gift field, still written for older code
      E.checkAch(); // the Pillow Week sticker on day 7
    }
    Save.store();
    return r;
  }
  const need = l => 100 + (l - 1) * 50;
  function levelOf(x) { let l = 1, r = x; while (r >= need(l)) { r -= need(l); l++; } return { l, r, n: need(l) }; }
  // v1.0 Settings (js/settings.js): BUZZ off = no vibration; CALM MODE = no sky extras; LEFT = mirrored move cards
  const PREF = () => (window.PSPrefs && window.PSPrefs.data) || {};
  const calm = () => !!PREF().calm;
  const keep = cfg => (window.PSPrefs ? window.PSPrefs.keep(cfg) : cfg); // an endless tween that calm mode leaves running
  const buzz = ms => { if (PREF().buzz === false) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
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
    const base = { moose: 240, beaver: 242, bear: 242, sasquatch: 380, mapleleaf: 238, pine: 201, pancakes: 238, hockey: 238, glove: 238, toque: 230, crab: 242, blowfish: 242, jellyfish: 240, compass: 242, ship: 242, bubbles: 242, thully: 380, fogcap: 250, nightcap: 230, hand: 242,
      onion: 223, peapod: 243, garlic: 218, mushroom: 211, broccoli: 240, worm: 241, cheese: 238, bread: 242, sunflower: 242, brocklee: 380, mound: 200,
      england: 300, spain: 300, japan: 300, usa: 300, poland: 400, teacup: 242, bull: 242, paella: 242, sushi: 242, burger: 242, globe: 242, balloon: 240, snowball: 120, puck: 100, polandball: 486, aliens: 385, mothership: 318, umbrella: 237, kraken: 235, pumpkin: 236, bat: 236, spider: 236, vampire: 235, candy: 235, lollipop: 236, web: 234, tophat: 234, witchhat: 230, gift: 234, robot: 242, ghost: 243, dragonboss: 285, owl: 299, tiger: 241, cow: 242, snake: 242, heart: 224, moon: 211, comet: 200, extinguisher: 224, rocket: 224, planet: 190, ufo: 224, pillow: 216, books: 224, snow: 214, zzz: 223, sparkles: 223, star: 224, dizzy: 224, dance: 223, shield: 179, note: 230, dumpling: 223, milk: 188, cloud: 224, feather: 120, dot: 64, spark: 80 }[key] || 220;
    return size / base;
  }

  // ---------- shared scenery
  const SPACE = 1;
  const CANADA = 2; // v0.8
  const OCEAN = 3, VEGGIE = 4; // v1.0 (docs/gdd/1.0-ocean.md, 1.0-veggie.md)
  const BALLS = 5; // v1.1 Countryballs (docs/gdd/1.1-countryballs.md)
  const SPOOKY = 6; // the October event (3 before v1.0, 5 in v1.0; see mig10, mig11)
  const GROUND = { [SPACE]: 'ground2', [CANADA]: 'ground4', [OCEAN]: 'ground5', [VEGGIE]: 'ground6', [BALLS]: 'ground7', [SPOOKY]: 'ground3' };
  const SKY = { [SPACE]: 'sky2', [CANADA]: 'sky4', [OCEAN]: 'sky5', [VEGGIE]: 'sky6', [BALLS]: 'sky7', [SPOOKY]: 'sky3' };
  const groundKey = w => GROUND[w] || 'ground';
  function sky(scene, world = 0) {
    const sp = world === SPACE, spook = world === SPOOKY, can = world === CANADA;
    scene.add.image(BLEED.cx, BLEED.cy, SKY[world] || 'sky').setDisplaySize(GW, GH);
    const g = scene.add.image(W * 0.5, PORTRAIT ? H * 0.27 : H * 0.3, 'glow').setScale(PORTRAIT ? 2.2 : 2.6).setAlpha(0.55);
    scene.tweens.add({ targets: g, alpha: 0.35, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const few = world === OCEAN || world === VEGGIE ? 0.6 : world === BALLS ? 0.35 : 1; // foggy sea, moonlit garden, dusk picnic: fewer stars
    for (let i = 0; i < (PORTRAIT ? 70 : 90) * (sp ? 1.6 : few); i++) {
      const s = scene.add.image(Math.random() * W, Math.random() * H * (sp ? 0.75 : 0.62), 'dot')
        .setScale(0.12 + Math.random() * 0.22).setTint(Math.random() < 0.3 ? C.star : 0xffffff).setAlpha(0.3 + Math.random() * 0.6);
      scene.tweens.add({ targets: s, alpha: 0.08, duration: 900 + Math.random() * 2200, yoyo: true, repeat: -1, delay: Math.random() * 2000, ease: 'Sine.inOut' });
    }
    if (sp) spaceDecor(scene, scene.scene.key === 'battle' ? 15000 : 7000);
    else if (spook) spookyDecor(scene);
    else if (can) canadaDecor(scene);
    else if (world === OCEAN) oceanDecor(scene);
    else if (world === VEGGIE) veggieDecor(scene);
    else if (world === BALLS) ballsDecor(scene);
    else for (let i = 0; i < 5; i++) {
      const cl = scene.add.image(Math.random() * W, H * (0.08 + Math.random() * 0.42), 'cloud')
        .setAlpha(0.13 + Math.random() * 0.12).setScale(0.8 + Math.random() * 1.3);
      const sp = 9000 + Math.random() * 12000;
      scene.tweens.add({ targets: cl, x: cl.x + W * 0.35, duration: sp * 2, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    scene.time.addEvent({ delay: 4200, loop: true, callback: () => { if (!calm() && Math.random() < 0.6) shootingStar(scene); } });
    bottomFade(scene);
  }
  // Halloween world: bats flapping across, an orange glow, cobwebs in the corners
  function spookyDecor(scene) {
    const wb = scene.add.image(W - 70, 70, 'web').setScale(0.9).setAlpha(0.35).setAngle(10);
    const wb2 = scene.add.image(70, 70, 'web').setScale(0.7).setAlpha(0.3).setFlipX(true);
    scene.time.addEvent({ delay: 3500, loop: true, callback: () => {
      if (calm()) return;
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
      if (calm() || Math.random() < 0.4) return;
      const y = H * (0.1 + Math.random() * 0.35), l = scene.add.image(-80, y, 'mapleleaf').setScale(0.22).setAlpha(0.9).setDepth(3);
      scene.tweens.add({ targets: l, angle: 720, x: W + 80, y: y + rnd(80, 260), duration: 9000, ease: 'Sine.inOut', onComplete: () => l.destroy() });
    } });
  }
  // Ocean (v1.0): drifting fog bands everywhere; on the map also a lighthouse, plush ships, buoys and bobbing gulls
  function oceanDecor(scene) {
    for (let i = 0; i < 3; i++) {
      const f = scene.add.image(Math.random() * W, H * (0.2 + i * 0.16), 'glow').setDisplaySize(W * 0.9, 180 + i * 40).setTint(0xffffff).setAlpha(0.12 + i * 0.04);
      scene.tweens.add({ targets: f, x: { from: -W * 0.5, to: W * 1.5 }, duration: 40000 + i * 10000, repeat: -1 }); f.x = Math.random() * W;
    }
    const gy = scene.scene.key === 'map' ? H * (PORTRAIT ? 0.62 : 0.58) : null; // the horizon things only on the map (like Canada's pines)
    if (!gy) return;
    // the lighthouse: a striped tower, a yellow lamp and a beam that sweeps every 6 s
    const lx = scene.lhX = W * (PORTRAIT ? 0.07 : 0.4), g = scene.add.graphics(); // landscape: between the nodes, Hermy's node sits at the left edge (B72)
    for (let k = 0; k < 5; k++) { g.fillStyle(k % 2 ? 0xffffff : 0xe2524a, 0.85); g.fillRect(lx - 26 + k * 1.5, gy - 40 - k * 34, 52 - k * 3, 34); }
    g.fillStyle(0x2a3060); g.fillRect(lx - 24, gy - 226, 48, 18); g.fillStyle(0xffe08a); g.fillCircle(lx, gy - 192, 16);
    const beam = scene.add.graphics().setPosition(lx, gy - 192); beam.fillStyle(0xfff3b0, 0.18); beam.fillTriangle(0, 0, 420, -70, 420, 70);
    scene.tweens.add({ targets: beam, scaleX: { from: 1, to: -1 }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // plush ships napping in the seaweed ship park, buoys in a triangle, two gulls bobbing on the water (they never fly at anyone)
    [[0.84, 0.5, 0], [0.7, 0.32, 1]].forEach(([x, sc, k]) => {
      const sh = scene.add.image(W * x, gy + 10, 'ship').setOrigin(0.5, 1).setScale(sc).setAlpha(0.55).setTint(0xc8d8f0);
      scene.tweens.add({ targets: sh, y: sh.y - 8, angle: 3, duration: 2200 + k * 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    [[0.32, 0], [0.4, 0], [0.36, -26]].forEach(([x, dy], k) => { if (!PORTRAIT) x -= 0.07;
      const b = scene.add.graphics().setPosition(W * x, gy + 4 + dy); b.fillStyle(0xe2524a); b.fillCircle(0, 0, 10); b.fillStyle(0xffffff); b.fillRect(-10, -3, 20, 6);
      scene.tweens.add({ targets: b, y: b.y - 5, duration: 1500 + k * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    [0.55, 0.6].forEach((x, k) => {
      const gl = img(scene, W * x, gy - 6, 'i:bird').setScale(0.3).setTint(0xffffff).setFlipX(k === 1).setAlpha(0.85);
      scene.tweens.add({ targets: gl, y: gl.y - 10, duration: 1200 + k * 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
  }
  // Veggie Patch (v1.0): fireflies everywhere; on the map also a low fence, sunflowers and rows of sprouts
  function veggieDecor(scene) {
    for (let i = 0; i < 24; i++) {
      const f = scene.add.image(Math.random() * W, H * (0.1 + Math.random() * 0.6), 'dot').setScale(0.12 + Math.random() * 0.08).setTint(Math.random() < 0.5 ? 0xd8ff6a : 0xfff27a).setAlpha(0.2);
      scene.tweens.add({ targets: f, alpha: 0.95, duration: 700 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 2000, ease: 'Sine.inOut' });
      scene.tweens.add({ targets: f, x: f.x + rnd(-120, 120), y: f.y + rnd(-80, 80), duration: 5000 + Math.random() * 4000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    const gy = scene.scene.key === 'map' ? H * (PORTRAIT ? 0.62 : 0.58) : null;
    if (!gy) return;
    const fence = scene.add.graphics(); fence.fillStyle(0xb98a5a, 0.7);
    fence.fillRect(0, gy - 70, W, 12); fence.fillRect(0, gy - 36, W, 12);
    for (let x = 20; x < W; x += 90) { fence.fillRect(x, gy - 96, 22, 96); fence.fillTriangle(x, gy - 96, x + 22, gy - 96, x + 11, gy - 112); }
    [0.12, 0.5, 0.88].forEach((x, k) => {
      const sf = scene.add.image(W * x + rnd(-30, 30), gy - 20, 'sunflower').setOrigin(0.5, 1).setScale(0.45 + k * 0.05).setAlpha(0.8);
      scene.tweens.add({ targets: sf, angle: { from: -4, to: 4 }, duration: 2600 + k * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    for (let i = 0; i < 14; i++) img(scene, W * (0.04 + i * 0.07), gy + 30 + (i % 2) * 24, 'i:leaf').setScale(0.18).setTint(0x8fe36a).setAlpha(0.7);
  }
  // Countryballs (v1.1): a hot-air balloon drifting by now and then (off in calm mode); on the map also rainbow bunting (no real flags)
  function ballsDecor(scene) {
    for (let i = 0; i < 4; i++) {
      const cl = scene.add.image(Math.random() * W, H * (0.08 + Math.random() * 0.3), 'cloud').setAlpha(0.18).setTint(0xffd9c0).setScale(0.8 + Math.random());
      scene.tweens.add({ targets: cl, x: cl.x + W * 0.3, duration: 24000 + Math.random() * 12000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    // one balloon at a time, below the pep bars and the map tabs
    let bal = null;
    scene.time.addEvent({ delay: 12000, loop: true, callback: () => {
      if (calm() || (bal && bal.active) || Math.random() < 0.3) return;
      const dir = Math.random() < 0.5 ? 1 : -1, y = H * (PORTRAIT ? 0.24 : 0.3) + Math.random() * H * 0.08;
      const b = bal = scene.add.image(dir > 0 ? -120 : W + 120, y, 'balloon').setScale(0.3 + Math.random() * 0.1).setAlpha(0.8);
      scene.tweens.add({ targets: b, y: y - 30, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      scene.tweens.add({ targets: b, x: dir > 0 ? W + 120 : -120, duration: 26000, onComplete: () => b.destroy() });
    } });
    if (scene.scene.key !== 'map') return; // the bunting hangs along the top edge, behind the tabs: nothing else on the map has room for it (QA B77)
    const cols = [0xff6b5b, 0xff8a3d, 0xffd23f, 0x7fe39a, 0x5fc8ff, 0x9a7bff, 0xff9ed8], g = scene.add.graphics().setAlpha(0.8);
    [[0, 0.5], [0.5, 1]].forEach(([a, b], k) => {
      const x0 = W * a, x1 = W * b, y0 = -10, sag = 24, n = PORTRAIT ? 5 : 7;
      const yAt = t => y0 + Math.sin(Math.PI * t) * sag;
      g.lineStyle(4, 0xfff3d2, 0.8); g.beginPath(); for (let i = 0; i <= 16; i++) { const t = i / 16; i ? g.lineTo(x0 + (x1 - x0) * t, yAt(t)) : g.moveTo(x0, yAt(0)); } g.strokePath();
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, y = yAt(t); g.fillStyle(cols[(i + k * 3) % cols.length]); g.fillTriangle(x - 20, y, x + 20, y, x, y + 38); }
    });
  }
  // Space world: a far planet, a drifting UFO and a rocket that zooms by now and then
  function spaceDecor(scene, rocketEvery = 7000) {
    const pl = scene.add.image(W * 0.12, H * (PORTRAIT ? 0.1 : 0.16), 'planet').setScale(0.7).setAlpha(0.55).setTint(0xc9b6ff);
    scene.tweens.add({ targets: pl, angle: 360, duration: 60000, repeat: -1 });
    if (!calm() && !(scene.R && scene.R.id === 'dragonboss')) { // no second UFO flying around the Mothership (no flyby in calm mode)
      const u = scene.add.image(-150, H * (PORTRAIT ? 0.33 : 0.3), 'ufo').setScale(0.42).setAlpha(0.8);
      scene.tweens.add({ targets: u, x: W + 150, duration: 26000, repeat: -1, delay: 1500 });
      scene.tweens.add({ targets: u, y: u.y - 40, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    scene.time.addEvent({ delay: rocketEvery, loop: true, callback: () => {
      if (calm()) return;
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
  // press-down feedback for any tappable container (QA B27 / G30): shrink a little on touch, spring back on release
  // (rest = the scale the thing normally has; cards that pop in from 0 pass 1)
  // (an endless pulse on the same thing waits while it is pressed, so it can't undo the press)
  function press(scene, c, k = 0.93, rest = c.scaleX) {
    let down = false, own = null, held = [];
    const go = (scale, duration, ease, onComplete) => { if (own) own.stop(); own = scene.tweens.add({ targets: c, scale, duration, ease, onComplete }); };
    const back = d => { if (!down) return; down = false; go(rest, d, 'Back.out', () => { held.forEach(t => t.resume()); held = []; }); };
    c.on('pointerdown', () => {
      if (!down) { const loops = scene.tweens.getTweensOf(c).filter(t => t !== own && t.isPlaying() && (t.loop === -1 || (t.data || []).some(d => d.repeat === -1))); loops.forEach(t => t.pause()); held = held.concat(loops); }
      down = true; go(rest * k, 70);
    });
    c.on('pointerup', () => back(220));
    c.on('pointerout', () => back(120));
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
        'moose', 'beaver', 'bear', 'sasquatch', 'mapleleaf', 'pine', 'pancakes', 'hockey', 'glove',
        // v1.0 Ocean and Veggie Patch (Fluent Emoji 3D, MIT; thully and brocklee by Kondrat)
        'crab', 'blowfish', 'jellyfish', 'compass', 'ship', 'bubbles', 'thully', 'hand',
        'onion', 'peapod', 'garlic', 'mushroom', 'broccoli', 'worm', 'cheese', 'bread', 'sunflower', 'brocklee',
        // v1.1 Countryballs (the five balls from Kondrat's pictures; Fluent Emoji 3D props, MIT)
        'england', 'spain', 'japan', 'usa', 'poland', 'teacup', 'bull', 'paella', 'sushi', 'burger', 'globe']
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
      // v1.0 Captain Fog: the cloud with a face and a captain's hat (white top, navy band, black visor, gold anchor)
      const fc = this.textures.createCanvas('fogcap', 250, 250), fx2 = fc.getContext();
      fx2.drawImage(this.textures.get('cloud').getSourceImage(), 13, 96, 224, 146);
      fx2.fillStyle = '#1d2163'; [[100, 168], [150, 168]].forEach(([x, y]) => { fx2.beginPath(); fx2.ellipse(x, y, 9, 12, 0, 0, Math.PI * 2); fx2.fill(); });
      fx2.fillStyle = '#ff9ed8'; fx2.globalAlpha = 0.5; [[80, 190], [170, 190]].forEach(([x, y]) => { fx2.beginPath(); fx2.ellipse(x, y, 14, 8, 0, 0, Math.PI * 2); fx2.fill(); }); fx2.globalAlpha = 1;
      fx2.strokeStyle = '#1d2163'; fx2.lineWidth = 6; fx2.lineCap = 'round'; fx2.beginPath(); fx2.arc(125, 188, 22, 0.2, Math.PI - 0.2); fx2.stroke();
      fx2.fillStyle = '#ffffff'; fx2.beginPath(); fx2.ellipse(125, 74, 78, 34, 0, 0, Math.PI * 2); fx2.fill(); fx2.strokeStyle = '#c9d3f0'; fx2.lineWidth = 4; fx2.stroke();
      fx2.fillStyle = '#1d2163'; fx2.fillRect(62, 82, 126, 26);
      fx2.fillStyle = '#111428'; fx2.beginPath(); fx2.ellipse(125, 110, 70, 14, 0, 0, Math.PI); fx2.fill();
      fx2.fillStyle = '#ffd23f'; fx2.beginPath(); fx2.arc(125, 74, 13, 0, Math.PI * 2); fx2.fill(); fx2.fillStyle = '#1d2163'; fx2.fillRect(122, 64, 6, 18); fx2.fillRect(116, 70, 18, 4);
      fc.refresh();
      // v1.0 Nightcap (Sleepy Thully's reward): a floppy blue-and-white striped cap with a white pompom hanging to one side
      const nc = this.textures.createCanvas('nightcap', 240, 230), nx = nc.getContext();
      nx.save(); nx.beginPath(); nx.moveTo(20, 190); nx.bezierCurveTo(30, 60, 150, 20, 205, 95); nx.quadraticCurveTo(170, 110, 220, 190); nx.closePath(); nx.clip();
      for (let i = 0; i < 12; i++) { nx.fillStyle = i % 2 ? '#f4f7ff' : '#4a78dc'; nx.save(); nx.translate(120, 120); nx.rotate(-0.6); nx.fillRect(-200, -200 + i * 34, 400, 34); nx.restore(); }
      nx.restore();
      nx.fillStyle = '#ffffff'; nx.beginPath(); nx.roundRect ? nx.roundRect(8, 170, 224, 46, 22) : nx.rect(8, 170, 224, 46); nx.fill(); nx.strokeStyle = '#b8c6ee'; nx.lineWidth = 4; nx.stroke();
      nx.beginPath(); nx.arc(212, 104, 22, 0, Math.PI * 2); nx.fill(); nx.stroke();
      nc.refresh();
      // v1.0 PEEKABOO! mound: a soil heap with crumbs and a sprout
      const mc = this.textures.createCanvas('mound', 200, 130), mx = mc.getContext();
      const mgr = mx.createLinearGradient(0, 20, 0, 130); mgr.addColorStop(0, '#9a6a42'); mgr.addColorStop(1, '#5a3a22');
      mx.fillStyle = mgr; mx.beginPath(); mx.moveTo(4, 126); mx.bezierCurveTo(20, 20, 180, 20, 196, 126); mx.closePath(); mx.fill();
      mx.fillStyle = 'rgba(40,24,10,0.35)'; for (let i = 0; i < 14; i++) { mx.beginPath(); mx.arc(30 + Math.random() * 140, 60 + Math.random() * 60, 4 + Math.random() * 4, 0, Math.PI * 2); mx.fill(); }
      mx.strokeStyle = '#5fbf4a'; mx.lineWidth = 6; mx.lineCap = 'round'; mx.beginPath(); mx.moveTo(100, 44); mx.quadraticCurveTo(98, 26, 108, 16); mx.stroke();
      mx.fillStyle = '#7fe36a'; mx.beginPath(); mx.ellipse(116, 16, 12, 6, -0.5, 0, Math.PI * 2); mx.fill();
      mc.refresh();
      // spooky grass for the Halloween world
      const gt3 = this.textures.createCanvas('ground3', GW, GH), q3 = gt3.getContext();
      q3.save(); q3.beginPath(); q3.ellipse(GW / 2, RY, GW / 2, RY, 0, Math.PI, 0); q3.lineTo(GW, GH); q3.lineTo(0, GH); q3.closePath(); q3.clip();
      const qg3 = q3.createLinearGradient(0, 0, 0, GH); qg3.addColorStop(0, '#4a3a6e'); qg3.addColorStop(0.35, '#2c2048'); qg3.addColorStop(1, '#160f2c');
      q3.fillStyle = qg3; q3.fillRect(0, 0, GW, GH);
      q3.setLineDash([22, 18]); q3.lineWidth = 5; q3.strokeStyle = 'rgba(255,140,60,0.4)';
      for (let i = 1; i < 6; i++) { q3.beginPath(); q3.ellipse(GW / 2, RY + i * GH * 0.11, GW / 2 - i * 20, RY, 0, Math.PI, 0); q3.stroke(); }
      for (let i = -8; i <= 8; i++) { q3.beginPath(); q3.moveTo(GW / 2 + i * GW * 0.035, GH * 0.02); q3.lineTo(GW / 2 + i * GW * 0.11, GH); q3.stroke(); }
      q3.restore(); gt3.refresh();
      // v1.0 Ocean: foggy night sea and water with a sandbar; Veggie Patch: a moonlit garden and soil rows
      const grad = (key, stops) => { const t = this.textures.createCanvas(key, W, H), x = t.getContext(), gg = x.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => gg.addColorStop(o, c)); x.fillStyle = gg; x.fillRect(0, 0, W, H); return { t, x }; };
      grad('sky5', [[0, '#0e1f3d'], [0.6, '#173656'], [1, '#1d4a5c']]).t.refresh();
      const s6 = grad('sky6', [[0, '#2a1f4f'], [0.6, '#4a3560'], [1, '#6b4a6e']]);
      const mg = s6.x.createRadialGradient(W * 0.5, H * 0.8, 0, W * 0.5, H * 0.8, W * 0.6); mg.addColorStop(0, 'rgba(255,214,140,0.18)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
      s6.x.fillStyle = mg; s6.x.fillRect(0, 0, W, H); s6.t.refresh();
      const dome = (key, stops, paint) => {
        const t = this.textures.createCanvas(key, GW, GH), q = t.getContext();
        q.save(); q.beginPath(); q.ellipse(GW / 2, RY, GW / 2, RY, 0, Math.PI, 0); q.lineTo(GW, GH); q.lineTo(0, GH); q.closePath(); q.clip();
        const qg = q.createLinearGradient(0, 0, 0, GH); stops.forEach(([o, c]) => qg.addColorStop(o, c)); q.fillStyle = qg; q.fillRect(0, 0, GW, GH);
        paint(q); q.restore(); t.refresh();
      };
      dome('ground5', [[0, '#e9d7a6'], [0.07, '#d9c28a'], [0.1, '#2c8a8f'], [1, '#1b5a73']], q => {
        q.strokeStyle = 'rgba(255,255,255,0.35)'; q.lineWidth = 5; q.lineCap = 'round';
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * GW, y = GH * 0.14 + Math.random() * GH * 0.86, w = 50 + Math.random() * 90;
          q.beginPath(); for (let k = 0; k <= 16; k++) { const xx = x + w * k / 16, yy = y + Math.sin(k / 16 * Math.PI * 2) * 7; k ? q.lineTo(xx, yy) : q.moveTo(xx, yy); } q.stroke();
        }
      });
      dome('ground6', [[0, '#8a5a35'], [0.35, '#7a4e2d'], [1, '#4e3220']], q => {
        q.lineWidth = 9; q.strokeStyle = 'rgba(50,30,15,0.45)';
        for (let i = 1; i < 7; i++) { q.beginPath(); q.ellipse(GW / 2, RY + i * GH * 0.1, GW / 2 - i * 18, RY, 0, Math.PI, 0); q.stroke(); }
        for (let i = 0; i < 70; i++) { q.fillStyle = Math.random() < 0.5 ? 'rgba(127,214,90,0.8)' : 'rgba(170,230,120,0.7)'; q.beginPath(); q.ellipse(Math.random() * GW, RY * 0.6 + Math.random() * GH, 7, 4, -0.5, 0, Math.PI * 2); q.fill(); }
      });
      // v1.1 Countryballs: a warm dusk (peach to blue) and a giant picnic blanket in mint and cream checks (Jack's colours, not a flag)
      const s7 = grad('sky7', [[0, '#27306e'], [0.45, '#5a5a9a'], [0.8, '#c98a8a'], [1, '#f2b58a']]);
      const sg7 = s7.x.createRadialGradient(W * 0.5, H * 0.85, 0, W * 0.5, H * 0.85, W * 0.7); sg7.addColorStop(0, 'rgba(255,214,150,0.3)'); sg7.addColorStop(1, 'rgba(0,0,0,0)');
      s7.x.fillStyle = sg7; s7.x.fillRect(0, 0, W, H); s7.t.refresh();
      dome('ground7', [[0, '#bfeee0'], [1, '#6cc4b0']], q => {
        // checks in perspective: cream bands both ways over the mint
        q.fillStyle = 'rgba(255,243,210,0.5)';
        for (let i = 0; i < 10; i += 2) q.fillRect(0, RY * 0.3 + Math.pow(i / 10, 1.4) * GH, GW, 14 + i * 9);
        for (let i = -14; i <= 14; i += 2) { q.beginPath(); q.moveTo(GW / 2 + i * GW * 0.03, 0); q.lineTo(GW / 2 + (i + 1) * GW * 0.03, 0); q.lineTo(GW / 2 + (i + 1) * GW * 0.1, GH); q.lineTo(GW / 2 + i * GW * 0.1, GH); q.closePath(); q.fill(); }
        q.strokeStyle = 'rgba(29,33,99,0.12)'; q.lineWidth = 3; q.setLineDash([12, 10]);
        for (let i = -14; i <= 14; i++) { q.beginPath(); q.moveTo(GW / 2 + i * GW * 0.03, 0); q.lineTo(GW / 2 + i * GW * 0.1, GH); q.stroke(); }
        q.setLineDash([]);
      });
      // a striped hot-air balloon (the Countryballs sky extra)
      const bl = this.textures.createCanvas('balloon', 200, 240), bx = bl.getContext();
      bx.save(); bx.beginPath(); bx.ellipse(100, 92, 86, 90, 0, 0, Math.PI * 2); bx.clip();
      ['#ff6b5b', '#ffd23f', '#7fd6c2', '#fff3d2', '#ff9ed8', '#5fc8ff'].forEach((c, i) => { bx.fillStyle = c; bx.fillRect(14 + i * 29, 0, 29, 190); });
      bx.restore(); bx.strokeStyle = 'rgba(29,33,99,0.6)'; bx.lineWidth = 4; bx.beginPath(); bx.ellipse(100, 92, 86, 90, 0, 0, Math.PI * 2); bx.stroke();
      bx.beginPath(); bx.moveTo(56, 168); bx.lineTo(82, 206); bx.moveTo(144, 168); bx.lineTo(118, 206); bx.stroke();
      bx.fillStyle = '#b98a5a'; bx.fillRect(78, 204, 44, 32); bx.strokeRect(78, 204, 44, 32); bl.refresh();
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
  // the index is the world id (SPACE, CANADA...); tab = the short name on a squeezed map tab (v1.0: 5-6 tabs)
  const WORLDS = [
    { name: 'PILLOW HILLS', tab: 'HILLS', icon: 'moon' },
    { name: 'SPACE', tab: 'SPACE', icon: 'rocket' },
    { name: 'CANADA', tab: 'CANADA', icon: 'mapleleaf' },
    { name: 'OCEAN', tab: 'OCEAN', icon: 'compass' },
    { name: 'VEGGIE PATCH', tab: 'VEGGIES', icon: 'broccoli' },
    { name: 'COUNTRYBALLS', tab: 'FLAGS', icon: 'globe' }, // v1.1 (tab label: owner's decision, 17 Oct 2026)
  ].concat(EVENT_ON ? [{ name: 'SPOOKY', tab: 'SPOOKY', icon: 'pumpkin', event: true }] : []);
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
    // ---- World 4: OCEAN (v1.0, docs/gdd/1.0-ocean.md). +10 pep per slot over Canada, scaling from level 9.
    // Compass Spin ('whirl'): the next player turn the cards drift, one rides a LUCKY CURRENT (+5). Nothing moves on EASY.
    { id: 'hermy', world: OCEAN, name: 'Hermy the Hermit Crab', nick: 'Hermy', short: 'HERMY', tex: 'crab', color: 0xff7b5c, hp: 155, xp: 150,
      intro: 'Hermy pops out of a shell: "Welcome to my new house! Please wipe your feet."', laugh: 'Hermy giggled so hard he fell out of his shell. "Time to move house again!"',
      moves: [{ type: 'multi', hits: 2, dmg: [7, 11], w: 30, log: 'PINCH-TICKLE! {a} tickles {d} with both claws!' },
        { type: 'rush', word: 'SIDEWAYS!', dmg: [12, 20], w: 30, log: '{a} scuttles in sideways. Surprise!' },
        { type: 'shield', w: 20, log: '{a} hops into a bigger shell. Next hit only does half!' },
        { type: 'whirl', mini: true, word: 'WHIRL!', sound: 'whirr', dmg: [8, 12], uses: 1, w: 25, log: '{a} spins his shell like a compass... the cards get dizzy!' }] },
    { id: 'puff', world: OCEAN, name: 'Puff the Pufferfish', nick: 'Puff', short: 'PUFF', tex: 'blowfish', color: 0xffd36b, hp: 165, xp: 160,
      intro: 'Puff jumps: "EEP! You scared me!" ...and puffs up like a beach ball.', laugh: 'Puff giggled so hard he went PFFFT and floated away like a balloon.',
      moves: [{ type: 'shield', word: 'PUFF UP!', sound: 'puff', w: 25, log: '{a} puffs up big and round. Next hit only does half!' },
        { type: 'spray', tex: 'i:bubble', word: 'BUBBLES!', sound: 'bubble', dmg: [12, 20], w: 30, log: '{a} blows a stream of bubbles at {d}!' },
        { type: 'hop', word: 'BOING!', dmg: [13, 21], w: 25, log: '{a} bounces over like a beach ball!' },
        { type: 'roar', word: 'PFFFT!', color: 0xffd36b, sound: 'pffft', dmg: [13, 21], w: 20, log: '{a} lets the air out. PFFFT! {d} is blown over!' },
        { type: 'heal', tex: 'i:leaf', amt: 20, uses: 1, w: 10, log: '{a} munches some seaweed. Crunchy!' }] },
    { id: 'jelly', world: OCEAN, name: 'Jelly the Jellyfish', nick: 'Jelly', short: 'JELLY', tex: 'jellyfish', color: 0xd8a8ff, hp: 175, xp: 170,
      intro: 'Jelly floats by, glowing: "Hellooo... want to see me... wiggle?"', laugh: 'Jelly giggled and glowed all the colours of the rainbow. "Sooo... fun..."',
      moves: [{ type: 'dizzy', color: 0xd8a8ff, word: 'BZZZT!', sound: 'laser', uses: 1, w: 15, log: '{a} gives {d} a tiny tickle zap... bzzzt!' },
        { type: 'multi', hits: 4, dmg: [4, 6], w: 25, log: 'WIGGLE TICKLE! {a} tickles {d} with all her ribbons!' },
        { type: 'hop', word: 'WOBBLE!', dmg: [12, 20], w: 25, log: '{a} wobbles over like jelly on a plate!' },
        { type: 'whirl', word: 'GLOW SPIN!', sound: 'whirr', dmg: [10, 14], uses: 1, w: 25, log: '{a} spins and glows... the cards drift away!' },
        { type: 'spray', tex: 'spark', tint: [0xd8a8ff, 0xff9ed8, 0xffffff], word: 'GLOW!', sound: 'laser', dmg: [12, 19], w: 20, log: '{a} glows so bright that {d} has to blink!' }] },
    { id: 'fog', world: OCEAN, name: 'Captain Fog', nick: 'Captain Fog', short: 'CAPTAIN FOG', tex: 'fogcap', color: 0xdfe6f5, hp: 185, xp: 180, big: 1.05,
      intro: 'Captain Fog puffs up on deck: "Ahoy! The crew is on a picnic, so I am the whole ship today!"', laugh: 'Captain Fog giggled into a tiny cloud. "Ahoy, best pillow fight on the seven seas!"',
      moves: [{ type: 'roar', word: 'FOG HORN!', color: 0xdfe6f5, sound: 'honk', dmg: [15, 23], w: 25, log: '{a} toots the fog horn. HOOONK!' },
        { type: 'shield', w: 15, log: '{a} hides in a fog bank. Next hit only does half!' },
        { type: 'whirl', word: 'COMPASS SPIN!', sound: 'whirr', dmg: [12, 16], uses: 2, usesHard: 3, w: 25, log: 'THE TRIANGLE IS TINGLING... {a} spins every compass on the sea!' },
        { type: 'volley', tex: 'pillow', word: 'FIRE THE PILLOWS!', sound: 'whoosh', dmg: [14, 22], w: 25, log: '{a} fires the pillow cannon at {d}!' },
        // the ALARM! tutorial before Thully: if nobody rings, he naps (+20) and wakes by himself
        { type: 'yawn', charge: true, mini: true, amt: 20, uses: 1, w: 20, log: '{a} yawns on watch... "Just five minutes..."' }] },
    { id: 'thully', world: OCEAN, name: 'Sleepy Thully', nick: 'Thully', short: 'SLEEPY THULLY', tex: 'thully', big: 1.15, color: 0x7fd6b4, hp: 220, xp: 220, boss: true, sleepy: true, reward: 'nightcap',
      intro: 'Shhh... Sleepy Thully is having the longest nap in history. Wake him up for a pillow fight!',
      wake: '"WHO WOKE ME UP?! ...Oh. A pillow fight? Fine. But I\'m GRUMPY."',
      laugh: 'Thully giggled himself wide awake. "Good morning! Same time tomorrow?"',
      moves: [{ type: 'quake', word: 'FLAP FLOP!', sound: 'stomp', dmg: [14, 21], w: 25, log: '{a} flaps his tiny wings and flops down. The sea shakes!' },
        { type: 'multi', hits: 3, dmg: [6, 9], w: 25, log: '{a} tucks {d} in with a blanket... three times!' },
        { type: 'spray', tex: 'i:bubble', word: 'BLUB ZZZ!', sound: 'bubble', dmg: [13, 20], w: 20, log: '{a} snores a stream of bubbles at {d}!' },
        { type: 'roar', word: 'GRUMBLE!', color: 0x7fd6b4, sound: 'grumble', dmg: [13, 21], w: 20, log: '{a} grumbles like a grumpy morning. GRRRMBL!' },
        { type: 'yawn', charge: true, amt: 40, uses: 2, usesEasy: 1, usesHard: 3, w: 30, log: '{a} stretches and yawns... "Five more minutes..."' }] },
    // ---- World 5: VEGGIE PATCH (v1.0, docs/gdd/1.0-veggie.md). +10 pep per slot over Ocean (boss +20), scaling from level 11.
    // PEEKABOO! ('hide'): the rival hides in a mound; tap the one with the pillow corner peeking out. dmg = the sneak tickle on a miss.
    { id: 'onion', world: VEGGIE, name: 'Olly the Onion', nick: 'Olly', short: 'OLLY', tex: 'onion', color: 0xd9a5e8, hp: 165, xp: 170,
      intro: 'Olly sniffs: "A pillow fight? That\'s so beautiful... I\'m not crying, YOU\'RE crying!"', laugh: 'Olly laughed so hard he cried happy tears. "Best. Day. EVER!"',
      moves: [{ type: 'spray', tex: 'i:droplet', word: 'WAAAH!', sound: 'whoosh', dmg: [12, 20], w: 30, log: '{a} cries happy tears all over {d}!' },
        { type: 'shield', w: 20, log: '{a} puts on another layer. Next hit only does half!' },
        { type: 'throw', tex: 'ring', tint: 0xe8c9f0, dmg: [13, 20], w: 30, log: 'ONION RING! {a} rolls a ring at {d}!' },
        { type: 'hide', mini: true, word: 'PEEKABOO!', sound: 'peekaboo', dmg: [12, 18], uses: 1, w: 25, log: '{a} dives into the soil... which mound is he in?' }] },
    { id: 'peas', world: VEGGIE, name: 'The Peas', nick: 'Peas', short: 'THE PEAS', tex: 'peapod', color: 0x8fd96b, hp: 175, xp: 180, plural: true,
      intro: 'The Peas pop out of their pod: "We\'re the Peas!" "...in a pod!" "...and we HIDE!"', laugh: 'The Peas giggled and rolled away in three directions. "Bye!" "Bye!" "Bye!"',
      moves: [{ type: 'volley', tex: 'dot', tint: 0x8fd96b, word: 'PEW PEW PEA!', sound: 'blip', dmg: [13, 20], w: 30, log: '{a} shoot peas at {d}! Tiny but many!' },
        { type: 'hop', word: 'ROLL ROLL!', dmg: [13, 20], w: 25, log: '{a} roll over {d} like marbles!' },
        { type: 'multi', hits: 3, dmg: [5, 8], w: 25, log: 'ONE! TWO! THREE! {a} bonk {d} one by one!' },
        { type: 'hide', word: 'PEEKABOO!', sound: 'peekaboo', dmg: [14, 20], uses: 1, w: 20, log: '{a} hide under the mashed potatoes... find them!' }] },
    { id: 'garlic', world: VEGGIE, name: 'Garlic Gus', nick: 'Gus', short: 'GARLIC GUS', tex: 'garlic', color: 0xf3e9d2, hp: 185, xp: 190,
      intro: 'Garlic Gus breathes on his paws: "HAAAH! Smell that? That\'s FLAVOUR. Count Fang runs away from me!"', laugh: 'Gus laughed so hard his breath made the moon blink. "Okay, okay, I\'ll get a mint!"',
      moves: [{ type: 'roar', word: 'HAAAH!', color: 0xd7f5a0, sound: 'huff', dmg: [15, 23], w: 25, log: '{a} says HELLO very close. HAAAH!' },
        { type: 'dizzy', color: 0xd7f5a0, word: 'PEE-YEW!', sound: 'huff', uses: 1, w: 15, log: '{a} wafts a stinky cloud... {d} is dizzy!' },
        { type: 'volley', tex: 'garlic', word: 'CLOVES!', sound: 'whoosh', dmg: [14, 22], w: 30, log: '{a} throws a handful of garlic cloves at {d}!' },
        { type: 'shield', w: 15, log: '{a} wraps up in his papery skin. Next hit only does half!' },
        { type: 'heal', tex: 'bread', amt: 22, uses: 1, w: 10, log: '{a} munches warm garlic bread. Yum!' }] },
    { id: 'fungi', world: VEGGIE, name: 'Fun-Guy the Mushroom', nick: 'Fun-Guy', short: 'FUN-GUY', tex: 'mushroom', color: 0xff6b5b, hp: 195, xp: 200, big: 1.05,
      intro: 'Fun-Guy tips his spotty cap: "I\'m not a vegetable, I\'m a FUN-GI! ...Get it? GET IT?"', laugh: 'Fun-Guy laughed so hard his spots fell off. "Okay, YOU are the fun guy now!"',
      moves: [{ type: 'spray', tex: 'dot', tint: [0xfff3d2, 0xffffff], word: 'ACHOO!', sound: 'sneeze', dmg: [14, 22], w: 25, log: '{a} sneezes a cloud of tickly spores at {d}!' },
        { type: 'hop', word: 'BOING!', dmg: [15, 22], w: 25, log: '{a} bounces on his cap like a trampoline!' },
        { type: 'hide', word: 'PEEKABOO!', sound: 'peekaboo', dmg: [18, 24], uses: 2, w: 25, log: '{a} pops into the ground. Where did he go?' },
        { type: 'roar', word: 'KNOCK KNOCK!', color: 0xff6b5b, sound: 'honk', dmg: [14, 22], w: 20, log: '{a} tells a joke so bad that {d} falls over!' },
        { type: 'heal', tex: 'i:mushroom', amt: 20, uses: 1, w: 10, log: '{a} has a cup of mushroom soup. Cozy!' }] },
    { id: 'brocklee', world: VEGGIE, name: 'Brock Lee', nick: 'Brock Lee', short: 'BROCK LEE', tex: 'brocklee', big: 1.15, color: 0x5fbf4a, hp: 240, xp: 240, boss: true, reward: 'brochair',
      intro: 'Brock Lee flexes his florets: "I\'m not a vegetable. I\'m a TREE! A pillow-fighting TREE!"', laugh: 'Brock Lee giggled so hard he shook like a tree. "Fine, I\'m a veggie. A HAPPY one!"',
      moves: [{ type: 'hide', forest: true, word: 'PEEKABOO!', sound: 'peekaboo', dmg: [22, 28], uses: 2, usesHard: 3, w: 30, log: '{a} hides in a broccoli forest. Which tree is the real one?' },
        { type: 'rush', word: 'TIMBER!', dmg: [15, 22], w: 25, log: '{a} swings in like a falling tree... gently!' },
        { type: 'spray', tex: 'dot', tint: [0xffffff, 0xeef4ff], word: 'STEAMED!', sound: 'steam', dmg: [14, 21], w: 20, log: '{a} puffs warm steam at {d}. Like a sauna!' },
        { type: 'roar', word: 'GREEN POWER!', color: 0x5fbf4a, sound: 'roar', dmg: [14, 21], w: 20, log: '{a} shouts GREEN POWER so loud the leaves rustle!' },
        { type: 'heal', tex: 'cheese', amt: 25, uses: 1, w: 10, log: '{a} dips himself in cheese sauce. Delicious!' }] },
    // ---- World 6: COUNTRYBALLS (v1.1, docs/gdd/1.1-countryballs.md). +10 pep per slot over Veggie Patch, scaling from level 13.
    // COPYCAT! ('copy'): a paint splat, then the ball copies the player's next move with the same numbers (nap and dance flop).
    // Poland's PUSH! ('launch' charge): help him into space (orbit turn, a Space Pierogi) or he falls on the hero. The id 'polandball' is The Blips.
    { id: 'england', world: BALLS, name: 'England', nick: 'England', short: 'ENGLAND', tex: 'england', color: 0xff6b6b, hp: 175, xp: 190,
      intro: 'England tips his top hat: "Jolly good! Tea first, then a pillow fight?"', laugh: 'England giggled so hard his monocle popped out. "Jolly good game, old chap!"',
      moves: [{ type: 'throw', tex: 'teacup', sound: 'kettle', dmg: [13, 20], w: 30, log: '{a} tosses a cup of (cold!) tea at {d}. SPLOSH!' },
        { type: 'rush', word: 'BROLLY!', dmg: [13, 21], w: 25, log: '{a} pops open his umbrella and bops {d}!' },
        { type: 'shield', w: 20, log: '{a} stays very, very calm. Next hit only does half!' },
        { type: 'heal', tex: 'teacup', amt: 22, uses: 1, w: 10, log: '{a} stops for tea time. Pinky up!' },
        { type: 'copy', mini: true, word: 'COPYCAT!', sound: 'paint', dmg: [8, 12], uses: 1, w: 25, log: '{a} paints himself green like {d}... JACKBALL!' }] },
    { id: 'spain', world: BALLS, name: 'Spain', nick: 'Spain', short: 'SPAIN', tex: 'spain', color: 0xffc93d, hp: 185, xp: 200,
      intro: 'Spain swishes his red cape: "¡Hola, Jack! Toro wants to play too!"', laugh: 'Spain laughed and danced away with Toro. "¡OLÉ! What a game!"',
      moves: [{ type: 'throw', tex: 'bull', word: 'OLÉ!', sound: 'moo', dmg: [15, 23], w: 30, log: 'Toro the plush bull bounces in and boops {d}! OLÉ!' },
        { type: 'multi', hits: 3, dmg: [5, 8], sound: 'castanet', w: 25, log: 'FLAMENCO! {a} spins: clack, clack, CLACK!' },
        { type: 'shield', w: 20, log: '{a} swishes his cape. OLÉ! Next hit only does half!' },
        { type: 'heal', tex: 'paella', amt: 22, uses: 1, w: 10, log: '{a} shares a big pan of paella. ¡Delicioso!' },
        { type: 'copy', word: 'COPYCAT!', sound: 'paint', dmg: [8, 12], uses: 1, w: 20, log: '{a} paints himself green... JACKBALL!' }] },
    { id: 'japan', world: BALLS, name: 'Japan', nick: 'Japan', short: 'JAPAN', tex: 'japan', color: 0xff8a8a, hp: 195, xp: 210,
      intro: 'Japan bows: "Konnichiwa, Jack! Sushi is ready. Pillows are ready!"', laugh: 'Japan giggled and folded a paper crane for Jack. "Arigato! Great game!"',
      moves: [{ type: 'volley', tex: 'sushi', word: 'SUSHI TOSS!', sound: 'whoosh', dmg: [15, 22], w: 30, log: '{a} tosses a whole plate of sushi rolls at {d}!' },
        { type: 'rush', word: 'ZOOOM!', sound: 'train', dmg: [15, 22], w: 25, log: '{a} zooms in like a bullet train. Right on time!' },
        { type: 'dizzy', tex: 'i:bird', tint: 0xfff3f0, color: 0xffffff, word: 'FLUTTER!', uses: 1, w: 15, log: '{a} folds a paper crane. {d} watches it... dizzy!' },
        { type: 'shield', w: 15, log: '{a} bows very politely. Next hit only does half!' },
        { type: 'copy', word: 'COPYCAT!', sound: 'paint', dmg: [9, 13], uses: 1, w: 25, log: '{a} paints himself green... JACKBALL!' }] },
    { id: 'usa', world: BALLS, name: 'USA', nick: 'USA', short: 'USA', tex: 'usa', color: 0x5b7bd6, hp: 205, xp: 220, big: 1.05,
      intro: 'USA slides down his sunglasses: "Howdy! A pillow fight? Too easy, dude!"', laugh: 'USA laughed so hard his sunglasses fell off. "Okay... NOT too easy!"',
      moves: [{ type: 'throw', tex: 'burger', sound: 'whoosh', dmg: [16, 23], w: 30, log: '{a} throws a double cheeseburger at {d}. Extra pickles!' },
        { type: 'roar', word: 'HOWDY!', color: 0x5b7bd6, sound: 'honk', dmg: [15, 23], w: 20, log: '{a} yells HOWDY so loud that {d} falls over!' },
        { type: 'shield', w: 20, log: '{a} puts on his shades. Too cool! Next hit only does half!' },
        { type: 'copy', word: 'COPYCAT!', sound: 'paint', dmg: [10, 14], uses: 2, usesHard: 3, w: 25, log: '{a} paints himself green... JACKBALL! Too easy!' },
        { type: 'heal', tex: 'milk', amt: 22, uses: 1, w: 10, log: '{a} slurps a giant milkshake. Brain freeze!' }] },
    { id: 'poland', world: BALLS, name: 'Poland', nick: 'Poland', short: 'POLAND', tex: 'poland', big: 1.15, color: 0xff4d6d, hp: 250, xp: 260, boss: true, reward: 'pierogi',
      intro: 'Poland rolls up in a cardboard rocket: "Cześć, Jack! Today I go to SPACE! But first... pillows!"', laugh: 'Poland giggled so hard he rolled all the way to the Moon. "See? I CAN into space!"',
      moves: [{ type: 'launch', charge: true, word: '3... 2... 1...', sound: 'countdown', dmg: [24, 30], uses: 2, usesEasy: 1, usesHard: 3, w: 30, log: '{a} straps on a cardboard rocket: "3... 2... 1..."' },
        { type: 'volley', tex: 'dumpling', word: 'PIEROGI!', sound: 'whoosh', dmg: [15, 22], w: 25, log: '{a} throws a plate of pierogi at {d}!' },
        { type: 'hop', word: 'BOING!', sound: 'bounce', dmg: [14, 21], w: 20, log: '{a} bounces like the roundest ball in the world!' },
        { type: 'copy', word: 'COPYCAT!', sound: 'paint', dmg: [8, 12], uses: 1, usesHard: 2, w: 20, log: '{a} paints himself green... JACKBALL!' },
        { type: 'heal', tex: 'dumpling', amt: 25, uses: 1, w: 10, log: '{a} eats one pierogi. Just one. Okay, five.' }] },
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
    { id: 'nightcap', name: 'Nightcap', tex: 'nightcap', w: 0.5 }, // v1.0: beat Sleepy Thully
    { id: 'brochair', name: 'Broccoli Hair', tex: 'broccoli', w: 0.55 }, // v1.0: beat Brock Lee
    { id: 'pierogi', name: 'Pierogi Hat', tex: 'dumpling', w: 0.42 }, // v1.1: beat Poland
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
  const SCALE_FROM = { [SPACE]: 4, [CANADA]: 6, [OCEAN]: 9, [VEGGIE]: 11, [BALLS]: 13 };
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
    // the first duel in a world whose comic is due starts with the comic (#31, #62); the comic then goes on to where the
    // player was heading. Never on REMATCH (the same duel again) and never for toy, friend or Kraken duels (no RIVALS entry)
    if (key === 'battle' && data && RIVALS[data.rival] && !(scene.scene.key === 'battle' && data === scene.data0)) {
      const cid = COMIC_OF_WORLD[RIVALS[data.rival].world || 0];
      if (comicDue(cid)) { data = { world: cid, then: { key, data } }; key = 'comic'; }
    }
    scene._psTarget = { key, data: data || {} }; // a rotation during the fade rebuilds straight into it (QA B38 / #4)
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
    c.add([bg, g]); c.setSize(100, 100).setInteractive({ useHandCursor: true }); press(scene, c, 0.88);
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
    c.setSize(100, 100).setInteractive({ useHandCursor: true }); press(scene, c, 0.88);
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
      // landscape: the panel stays left of Jack's wing, also on 4:3 iPads (QA B18 / #19)
      const px = PORTRAIT ? W / 2 : clamp(W / 2 - jack.displayWidth / 2 - 240, 230, 420), py = PORTRAIT ? logoBot + gap + 95 : H * 0.7;
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
      // landscape column: the last item stays above the level panel (top at H * 0.7 - 95), also with SETTINGS as the 6th (v1.0)
      const navStep = Math.min(112, (H * 0.7 - 95 - 66 - 85) / Math.max(1, nav.length - 1));
      nav.forEach((it, i) => {
        const x = PORTRAIT ? 90 + i * Math.min(170, (W - 300) / Math.max(1, nav.length - 1)) : 90, y = PORTRAIT ? 85 : 85 + i * navStep;
        const c = this.add.container(x, y).setDepth(50);
        c.add(this.add.circle(0, 0, 46, it.color || C.night2).setStrokeStyle(4, C.seam));
        const ic = img(this, 0, 0, typeof it.icon === 'function' ? it.icon(PS) : it.icon); ic.setScale(iconScale(ic.texture.key === 'icons2' || ic.texture.key === 'icons' ? 'j:x' : ic.texture.key, 62)); c.add(ic);
        c.add(txt(this, PORTRAIT ? 0 : 64, PORTRAIT ? 66 : 0, typeof it.label === 'function' ? it.label(PS) : it.label, 24, '#fff3d2', { st: 5, ox: PORTRAIT ? 0.5 : 0 }));
        const n = it.badge ? it.badge(PS) : 0;
        if (n) { c.add(this.add.circle(32, -32, 20, C.coral).setStrokeStyle(3, 0x0f1240)); c.add(txt(this, 32, -32, n > 9 ? '9+' : String(n), 22, '#ffffff', { st: 0, shadow: false })); }
        c.setSize(100, 100).setInteractive({ useHandCursor: true }); press(this, c, 0.88);
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
      // a world opens for the first time: its comic first (also for a restored save or the last world looked at)
      const cid = COMIC_OF_WORLD[this.world];
      if (comicDue(cid)) { this.scene.start('comic', { world: cid, then: { key: 'map', data: { world: this.world } } }); return; }
      if (Save.data.lastWorld !== this.world) { Save.data.lastWorld = this.world; Save.store(); }
      const wd = this.world;
      this.cameras.main.fadeIn(350, 15, 18, 64);
      sky(this, wd);
      bottomGround(this, groundKey(wd), PORTRAIT ? 0.45 : 0.5, 0.8);
      // world tabs (landscape keeps room for back, mute and the capsule button: QA B51; names that would be squeezed become icon-only tabs: QA B52)
      const ty = PORTRAIT ? 190 : 95, room = PORTRAIT ? W - 60 : W - 600, n = WORLDS.length, tw0 = Math.min(PORTRAIT ? 420 : 440, room / n - 30);
      // 4 worlds (Canada + the October event): names do not fit any more, so only the open tab is wide with its name,
      // the others show just their icon
      // v1.0, 5-6 worlds: the other tabs are icon-only at 110 px, the open tab takes the rest and shows its short name;
      // landscape with 6 tabs: all icon-only, the world's name moves into the level line (docs/gdd/1.0-ocean.md section 2)
      // v1.1, 6-7 worlds: 7 icon tabs are 890 px wide, more than a 4:3 iPad in landscape has: they shrink a little there (never under 90 px, B26)
      const many = n >= 5, gap = many ? 20 : 30, ICON = many ? Math.max(90, Math.min(110, (room - (n - 1) * gap) / n)) : 110;
      const openW = many ? Math.min(400, room - (n - 1) * (ICON + gap)) : 0, allIcons = many && (!PORTRAIT && n >= 6 || openW < 260);
      const wide = !many && tw0 - 140 < 230, tws = WORLDS.map((w, i) => many ? (i === this.world && !allIcons ? openW : ICON)
        : !wide ? tw0 : i === this.world ? Math.min(400, (room - 30 * (n - 1)) * 2 / (n + 1)) : Math.min(200, (room - 30 * (n - 1)) / (n + 1)));
      let tx0 = W / 2 - (tws.reduce((a, b) => a + b, 0) + gap * (n - 1)) / 2;
      WORLDS.forEach((w, i) => { this.tab(w, i, tx0 + tws[i] / 2, ty, tws[i], (wide || many) && (i !== this.world || allIcons), many); tx0 += tws[i] + gap; });
      const lv = levelOf(Save.data.xp);
      txt(this, W / 2, PORTRAIT ? 285 : 180, (allIcons ? WORLDS[wd].tab + '  ·  ' : '') + 'Level ' + lv.l + '  ·  ★ ' + totalStars() + ' / ' + RIVALS.length * 3, 34, '#ffd23f', { st: 6 });
      const idx = RIVALS.map((r, i) => i).filter(i => worldOf(i) === wd), five = idx.length >= 5;
      // portrait: fit the nodes (4, or 5 in Ocean and Veggie Patch) between the difficulty switch and the bottom buttons (short phones shrink them)
      let pts; this.ns = 1; this.labelW = 420;
      if (PORTRAIT) {
        const yTopLim = 430, yBotLim = H - 110 - 55 - 24, gaps = Math.max(3, idx.length - 1);
        const xs = five ? [0.3, 0.7, 0.3, 0.7, 0.34] : [0.3, 0.7, 0.3, 0.66];
        let s = 1;
        for (let k = 0; k < (five ? 5 : 3); k++) {
          const yTop = yTopLim + (130 + 60) * s, yBot = yBotLim - (110 + 140) * s;
          s = clamp((yBot - yTop) / gaps / 200, 0.6, 1);
          pts = xs.map((x, j) => [W * x, yBot - j * (yBot - yTop) / gaps]);
        }
        this.ns = s;
      } else if (five) {
        // landscape, 5 nodes: a little smaller, names fitted between the neighbours (docs/gdd/1.0-ocean.md section 2, item 5)
        pts = [[0.11, 0.6], [0.3, 0.37], [0.5, 0.6], [0.7, 0.37], [0.89, 0.6]].map(([x, y]) => [W * x, H * y]);
        this.ns = 0.88; this.labelW = Math.min(420, 2 * (0.19 * W - 130 * this.ns - 16) / this.ns);
      } else pts = [[0.14, 0.6], [0.37, 0.37], [0.61, 0.6], [0.85, 0.37]].map(([x, y]) => [W * x, H * y]);
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
      // (landscape with 5 nodes: closer and a little lower, clear of the next node's star row)
      const low = five && !PORTRAIT, nr = (RIVALS[idx[current]].boss ? 130 : 110) * this.ns, off = nr + (low ? 70 : 80) * this.ns;
      const j = this.add.image(cx - off < 90 ? cx + off : cx - off, cy + (low ? nr : 40 * this.ns), hero.tex).setOrigin(0.5, 1).setDepth(5);
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
      const wiggle = () => {
        cbtn.destroy(); cbtn = capsuleButton(this, W - 200, 80, wd);
        this.tweens.add({ targets: cbtn, angle: { from: -20, to: 20 }, duration: 120, yoyo: true, repeat: 5, onComplete: () => cbtn.setAngle(0) });
      };
      this.pillowWeek(r => {
        if (r && r.reward && r.day === 1) this.time.delayedCall(700, () => { wiggle(); this.hint('Daily gift: +1 capsule! Tap the capsule button'); A.levelUp(); });
        else if (r && r.reward) { cbtn.destroy(); cbtn = capsuleButton(this, W - 200, 80, wd); window.PSExtra.streakPopup(this, PS, r, wiggle); }
        else if (window.PSExtra.streakDue(Save.data.streak)) window.PSExtra.streakPopup(this, PS, null, wiggle); // e.g. the map rebuilt after a rotation
      });
    }
    // Pillow Week (#32): the day counts on the first map open of the local day, never while bedtime or the daily limit
    // sends the kid to the bedtime screen (#65). A logged-in device first syncs with the cloud save (Net.sync, at most
    // 1.5 s; offline or slow: counts locally), so a day played on the other device is known before counting.
    pillowWeek(done) {
      const E = window.PSExtra; if (!E || E.blockedReason()) return;
      const game = this.game, run = () => {
        const st = this.sys.settings.status; // CREATING when called from create(), RUNNING after the cloud sync
        if (window.__game !== game || this._leaving || (st !== Phaser.Scenes.CREATING && st !== Phaser.Scenes.RUNNING)) return; // rebuilt (rotation, newer cloud save) or left
        done(dailyStreak());
      };
      const N = window.PSNet;
      if (N && N.user && !E.streakCounted(Save.data.streak)) Promise.race([N.sync().catch(() => {}), new Promise(r => setTimeout(r, 1500))]).then(run);
      else run();
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
        z.on('pointerdown', () => this.tweens.add({ targets: c, scale: 0.95, duration: 70 }));
        z.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 120 }));
        z.on('pointerup', () => { A.init(); A.click(); Save.data.diff = k; Save.store(); draw(); this.tweens.killTweensOf(c); this.tweens.add({ targets: c, scale: { from: 1.06, to: 1 }, duration: 200 }); });
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
    tab(w, i, x, y, tw0, iconOnly, short) {
      const open = worldOpen(i), on = i === this.world, h = 96;
      const c = this.add.container(x, y).setDepth(6);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-tw0 / 2, -h / 2 + 8, tw0, h, h / 2);
      g.fillStyle(on ? C.star : (open ? C.night2 : 0x161946)); g.fillRoundedRect(-tw0 / 2, -h / 2, tw0, h, h / 2);
      g.lineStyle(5, on ? 0xffffff : C.seam); g.strokeRoundedRect(-tw0 / 2, -h / 2, tw0, h, h / 2);
      const ic = img(this, iconOnly ? 0 : -tw0 / 2 + 58, 0, open ? w.icon : 'lock'); ic.setScale(70 / Math.max(ic.width, ic.height));
      const t = fit(txt(this, 26, 0, open ? (short ? w.tab : w.name) : '???', 40, on ? C.ink : (open ? '#fff3d2' : '#8a8fd6'), { st: 0, shadow: false }), tw0 - 140).setVisible(!iconOnly);
      c.add([g, ic, t]);
      c.setSize(tw0, h).setInteractive({ useHandCursor: true }); press(this, c);
      c.on('pointerup', () => {
        A.init();
        if (!open) { A.block(); this.tweens.add({ targets: c, x: x + 12, duration: 60, yoyo: true, repeat: 3 }); const fi = RIVALS.findIndex(r => (r.world || 0) === i); this.hint(fi > 0 ? 'Beat ' + RIVALS[fi - 1].name + ' to open ' + w.name + '!' : 'Locked!'); return; }
        if (on) return; // the open tab does nothing (comics play again from the Album, #62)
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
      c.add(fit(txt(this, 0, R + 46, open ? r.name : '???', 38, open ? '#fff3d2' : '#8a8fd6', { st: 7 }), this.labelW || 420));
      if (open) c.add(starRow(this, 0, R + 104, stars, 64, 70));
      if (current && open) {
        this.tweens.add({ targets: c, scale: 1.07 * ns, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        const ring = this.add.image(x, y, 'ring').setScale(R * ns / 52).setTint(C.star).setDepth(3).setAlpha(0.6);
        this.tweens.add({ targets: ring, scale: R * ns / 40, alpha: 0, duration: 1300, repeat: -1 });
      }
      c.setSize(R * 2, R * 2 + 120).setInteractive({ useHandCursor: true }); press(this, c);
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
    init(data) { this.focus = data && data.focus; this.page = (data && data.page) || 0; }
    create() {
      this._leaving = false;
      this.cameras.main.fadeIn(350, 15, 18, 64);
      sky(this);
      txt(this, W / 2, PORTRAIT ? 190 : 95, 'MY SQUAD', PORTRAIT ? 80 : 72, '#fff3d2', { stroke: '#0f1240', st: 12 });
      txt(this, W / 2, PORTRAIT ? 270 : 165, 'Tap a toy to play as it or to duel it', 32, '#bcc0ee', { st: 5, weight: '500' });
      // toys on an adventure live in their own list, behind the ADVENTURES card (v1.0, js/adventure.js)
      const items = [{ jack: true }].concat(Save.data.toys.map(t => ({ toy: t }))).concat(Save.data.toys.length < 14 ? [{ add: true }] : [])
        .concat((Save.data.away || []).length ? [{ adv: true }] : []);
      const cols = PORTRAIT ? 3 : Math.min(5, Math.max(4, Math.floor((W - 120) / 300)));
      const cw = PORTRAIT ? 310 : Math.min(290, (W - 160) / cols - 20), top = PORTRAIT ? 360 : 225;
      // pages when the squad does not fit (QA B05): the cards get a little shorter first, then ◀ n/m ▶ like the Sticker Album
      let ch = PORTRAIT ? 330 : 270, rows = Math.ceil(items.length / cols), pages = 1;
      if (top + rows * (ch + 22) > H - 30) {
        const room = H - top - 150 + 22, minCh = PORTRAIT ? 280 : 230;
        rows = Math.max(1, Math.floor(room / (minCh + 22)));
        ch = Math.min(ch, Math.floor(room / rows) - 22);
        pages = Math.ceil(items.length / (rows * cols));
      }
      const per = rows * cols, fi = this.focus ? items.findIndex(it => it.toy && it.toy.id === this.focus) : -1;
      const pg = this.page = Math.min(pages - 1, Math.max(0, fi >= 0 ? Math.floor(fi / per) : this.page || 0));
      items.slice(pg * per, pg * per + per).forEach((it, i) => {
        const x = W / 2 + ((i % cols) - (cols - 1) / 2) * (cw + 22), y = top + ch / 2 + Math.floor(i / cols) * (ch + 22);
        this.card(it, x, y, cw, ch, i);
      });
      if (pages > 1) {
        const by = top + rows * (ch + 22) + 50;
        if (pg > 0) button(this, W / 2 - 260, by, 200, 100, '◀', C.cream, () => this.scene.restart({ page: pg - 1 }), { size: 48 });
        txt(this, W / 2, by, (pg + 1) + ' / ' + pages, 40, '#fff3d2', { st: 6 });
        if (pg < pages - 1) button(this, W / 2 + 260, by, 200, 100, '▶', C.star, () => this.scene.restart({ page: pg + 1 }), { size: 48 });
      }
      backButton(this, () => fade(this, 'map'));
      muteButton(this);
      if (this.focus) { const t = toyById(this.focus); if (t) this.time.delayedCall(450, () => this.details({ toy: t })); }
      // the "Where to?" card was open when the screen was rotated: show it again
      const sd = this.sys.settings.data || {};
      if (sd.send && window.PSAdventure) { const t = toyById(sd.send); if (t) this.time.delayedCall(300, () => window.PSAdventure.whereTo(this, t)); else delete sd.send; }
    }
    card(it, x, y, w, h, i) {
      const c = this.add.container(x, y).setDepth(5);
      const g = this.add.graphics();
      const isHero = it.jack ? Save.data.hero === 'jack' || !toyById(Save.data.hero) : Save.data.hero === (it.toy && it.toy.id);
      const col = it.add || it.adv ? 0x1b1f5a : C.night2;
      g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, 36);
      g.fillStyle(col); g.fillRoundedRect(-w / 2, -h / 2, w, h, 36);
      const gold = !!(it.toy && TOYS.toyLevel(it.toy.xp) >= 4); // toy growth (v1.0): GOLDEN toys get a gold border
      g.lineStyle(gold ? 8 : it.add ? 5 : 6, isHero || gold ? C.star : C.seam); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 36);
      c.add(g);
      if (it.add) {
        const plus = txt(this, 0, -30, '+', 120, '#ffd23f', { st: 10 });
        c.add([plus, img(this, 50, -70, 'i:camera').setScale(0.5), txt(this, 0, h / 2 - 50, 'NEW TOY', 36, '#fff3d2', { st: 6 })]);
        this.tweens.add({ targets: plus, scale: 1.12, duration: 700, yoyo: true, repeat: -1 });
      } else if (it.adv) {
        // toys away exploring: a count chip, and a dot when a postcard is unread or a trip is done
        const ic = img(this, 0, -36, 'j:ticket'); ic.setScale(iconScale('j:ticket', Math.min(150, h - 150)));
        c.add([ic, fit(txt(this, 0, h / 2 - 50, 'ADVENTURES', 34, '#fff3d2', { st: 6 }), w - 30), chip(this, w / 2 - 44, -h / 2 + 40, String(Save.data.away.length), C.star, 26)]);
        if (window.PSAdventure && window.PSAdventure.news()) c.add(this.add.circle(-w / 2 + 38, -h / 2 + 38, 16, C.coral).setStrokeStyle(4, 0x0f1240));
        this.tweens.add({ targets: ic, angle: { from: -6, to: 6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      } else {
        const key = it.jack ? 'jack_front' : 'toy_' + it.toy.id;
        if (this.textures.exists(key)) c.add(fitImage(this, 0, -22, key, w - 60, h - 110));
        const name = it.jack ? 'Jack' : it.toy.name;
        c.add(fit(txt(this, 0, h / 2 - 46, name, 36, '#fff3d2', { st: 6 }), w - 30));
        if (!it.jack) { const a = TOYS.ARCH_BY_ID[it.toy.arch]; if (a) c.add(img(this, w / 2 - 36, -h / 2 + 36, 'i:' + (a.id === 'mystery' ? 'mystery' : a.id)).setScale(0.36)); }
        if (isHero) c.add(chip(this, 0, -h / 2 + 4, 'PLAYING', C.star, 24));
        if (gold) {
          c.add(chip(this, 0, h / 2 - 92, 'GOLDEN', C.star, 20));
          const sp = this.add.image(-w / 2 + 40, h / 2 - 120, 'spark').setTint(C.star).setScale(0.5); c.add(sp);
          this.tweens.add({ targets: sp, angle: 180, alpha: { from: 1, to: 0.2 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
        // souvenirs from adventures: small world icons down the left edge (v1.0)
        if (it.toy && Array.isArray(it.toy.souv) && window.PSAdventure) it.toy.souv.forEach((k, j) => {
          const wd = window.PSAdventure.WORLD[k]; if (wd) c.add(img(this, -w / 2 + 32, -h / 2 + 38 + j * 42, wd.icon).setScale(iconScale(wd.icon, 36)));
        });
      }
      c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 300, delay: i * 50, ease: 'Back.out' });
      c.setSize(w, h).setInteractive({ useHandCursor: true }); press(this, c, 0.93, 1);
      c.on('pointerup', () => { A.init(); A.click(); if (it.add) fade(this, 'studio'); else if (it.adv) fade(this, 'adventures'); else this.details(it); });
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
      const tl = it.jack ? 0 : TOYS.toyLevel(it.toy.xp);
      if (tl >= 4) { const gb = this.add.graphics(); gb.lineStyle(8, C.star); gb.strokeRoundedRect(-pw / 2 + 8, -ph / 2 + 8, pw - 16, ph - 16, 50); p.add(gb); }
      let cx0 = 0; const cs = chips.map(([l, col]) => chip(this, 0, ty + 90, l, col, 28));
      const total = cs.reduce((s, c) => s + c.w + 14, -14); cx0 = tx - total / 2;
      cs.forEach(c => { c.x = cx0 + c.w / 2; cx0 += c.w + 14; p.add(c); });
      // moves
      // buttons first, so the move list knows how much room it has (QA B08)
      const isHero = it.jack ? (Save.data.hero === 'jack' || !toyById(Save.data.hero)) : Save.data.hero === it.toy.id;
      const by = ph / 2 - (PORTRAIT ? 230 : 110);
      // toy growth (v1.0): toy level with its bar, then the badges (beaten rivals, bosses ringed)
      let gy = ty + 150;
      if (!it.jack) {
        const t = it.toy, xp = Math.max(0, t.xp || 0), lv = tl, lo = [0, 0, 50, 150, 300][lv], hi = [0, 50, 150, 300, 300][lv], bwid = 200; // the XP text stays inside the panel (B70)
        const lt = txt(this, tx - 40, gy, 'LEVEL ' + lv, 34, '#ffd23f', { st: 5, ox: 1 });
        p.add([lt, this.add.rectangle(tx, gy, bwid, 22, C.night3).setOrigin(0, 0.5).setStrokeStyle(3, C.seam),
          this.add.rectangle(tx + 3, gy, Math.max(4, (bwid - 6) * (lv >= 4 ? 1 : (xp - lo) / (hi - lo))), 16, C.star).setOrigin(0, 0.5),
          txt(this, tx + bwid + 16, gy, lv >= 4 ? 'GOLDEN!' : xp + ' / ' + hi + ' toy XP', 24, '#bcc0ee', { st: 0, shadow: false, ox: 0, weight: '500' })]);
        const ids = Object.keys(t.badges || {}).filter(k => TOYS.BADGES[k]);
        if (ids.length) {
          gy += 58;
          const bc = chip(this, 0, gy, '      ' + ids.length + (ids.length > 1 ? ' badges' : ' badge'), C.cream, 22); bc.x = tx - 260 + bc.w / 2; p.add(bc);
          bc.add(img(this, -bc.w / 2 + 30, 0, 'j:medal').setScale(iconScale('j:medal', 34)));
          // after the chip on the same line, or (many badges) on a line of their own
          let x0 = tx - 260 + bc.w + 16, room = tx + 300 - x0;
          if (ids.length * 40 > room) { gy += 52; x0 = tx - 260; room = 560; }
          const bs = Math.min(48, room / ids.length);
          ids.forEach((k, j) => {
            const [tex, boss] = TOYS.BADGES[k], bx = x0 + bs / 2 + j * bs;
            if (boss) p.add(this.add.circle(bx, gy, bs * 0.48).setStrokeStyle(3, C.star));
            if (this.textures.exists(tex)) p.add(img(this, bx, gy, tex).setScale(iconScale(tex, bs * 0.82)));
          });
        }
        gy += 30;
      }
      const ml = d.moves, more = it.jack ? MOVES.length > ml.length : tl < 3;
      const my0 = it.jack ? ty + 170 : gy + 50, room = by - 55 - 30 - my0, rowsN = ml.length + (more ? 1 : 0);
      const step = Math.min(PORTRAIT ? 78 : (ml.length > 4 ? 62 : 80), room / Math.max(1, rowsN - 1 + 0.6));
      const ts = Math.min(34, Math.round(step * 0.6)), ss = Math.min(26, Math.round(step * 0.46));
      ml.forEach((m, i) => {
        const my = my0 + i * step;
        const ic = img(this, tx - 250, my, m.icon || 'pillow'); ic.setScale(iconScale(m.icon || 'pillow', Math.min(56, step * 0.8)));
        p.add([ic, txt(this, tx - 205, my - 2, m.title, ts, '#fff3d2', { ox: 0, st: 5 }), txt(this, tx + 300, my, m.sub || '', ss, '#bcc0ee', { ox: 1, st: 0, weight: '500' })]);
      });
      if (more) p.add(txt(this, tx, my0 + ml.length * step, it.jack ? 'More moves unlock as you level up!' : 'Play as ' + d.name + ': a new move at toy LEVEL ' + (tl + 1) + '!', ss, '#ffd23f', { st: 4, weight: '500' }));
      const bxs = PORTRAIT ? [0, 0] : [tx - 100, tx + 250]; // landscape: ADVENTURE, PLAY AS and DUEL! side by side in one row (B70)
      const b1 = button(this, bxs[0], by, 320, 110, isHero ? 'PLAYING ✓' : 'PLAY AS', isHero ? 0x9fe3c0 : C.star, () => {
        if (isHero) return; Save.data.hero = it.jack ? 'jack' : it.toy.id; Save.store(); A.levelUp(); close(); this.scene.restart({ page: this.page });
      }, { size: 42 });
      p.add(b1);
      if (!it.jack) {
        const b2 = button(this, bxs[1], PORTRAIT ? by + 130 : by, 320, 110, 'DUEL!', C.coral, () => {
          if (isHero) { this.toast('Pick another hero first — a toy can\'t duel itself!'); return; }
          fade(this, 'battle', { toy: it.toy.id });
        }, { size: 42, color: '#fff3d2' });
        p.add(b2);
        // v1.0: REMOVE became ADVENTURE (#47); a real delete is in the Adventures list, behind the parent gate.
        // A real button, big enough for small fingers (QA B50 / #48). Portrait: top right; landscape: under the picture
        const adv = button(this, PORTRAIT ? pw / 2 - 175 : ix, PORTRAIT ? -ph / 2 + 75 : by, 280, 90, 'ADVENTURE', C.cream, () => window.PSAdventure && window.PSAdventure.ask(this, it.toy, close), { size: 30 });
        adv.add(img(this, -100, 0, 'j:ticket').setScale(iconScale('j:ticket', 54))); adv.list[1].x = 26; fit(adv.list[1], 180);
        p.add(adv);
      }
      const x = txt(this, -pw / 2 + 70, -ph / 2 + 70, '✕', 50, '#bcc0ee', { st: 0 }).setInteractive({ useHandCursor: true });
      x.on('pointerup', () => close()); press(this, x, 0.85); p.add(x);
      layer.add(p); p.setScale(0.7); p.alpha = 0;
      this.tweens.add({ targets: p, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
      const close = () => { this.tweens.add({ targets: layer, alpha: 0, duration: 150, onComplete: () => layer.destroy() }); };
    }
    toast(s) {
      const t = txt(this, W / 2, H - 120, s, 34, '#fff3d2', { st: 6, wrap: W * 0.8 }).setDepth(90);
      this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
    }
  }

  // ---------- Studio: photo -> cut-out -> "who is it?" -> new hero
  // one worker for the page, kept on window: a rotation rebuild runs main() again but keeps the worker and its loaded models (QA B22 / #21)
  const TW = window.__psToyWorker || (window.__psToyWorker = { w: null });
  function getWorker() {
    if (TW.w) return TW.w;
    const q = /[?&]localmodels/.test(location.search) ? '?local' : '';
    TW.w = new Worker('js/toyworker.js' + q, { type: 'module' });
    return TW.w;
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
      try { if (TW.w) TW.w.terminate(); } catch (e) {}
      TW.w = null;
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
        const arm = () => { if (job.timer) job.timer.remove(false); job.timer = this.time.delayedCall(90000, () => { try { w.terminate(); } catch (e) {} if (TW.w === w) TW.w = null; res({ type: 'error', message: 'timeout' }); }); };
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
        bg.setInteractive({ useHandCursor: true }); press(this, bg, 0.9);
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
    hintName(s) {
      if (this._hint) this._hint.destroy();
      const t = this._hint = txt(this, W / 2, H - (PORTRAIT ? 70 : 50), s, 36, '#ff9ed8', { st: 7 }).setDepth(90);
      this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
    }
    async save() {
      const t = this.toy, nick = TOYS.ARCH_BY_ID[t.arch].nicks[0];
      t.name = (t.name || '').trim() || nick;
      if (TOYS.badName(t.name)) { // not a kind name: put a friendly one in the box and ask again (QA B13 / #16)
        t.name = nick; if (this.nameEl) this.nameEl.node.value = nick;
        A.block(); this.hintName('Let\'s pick a kinder name!'); return;
      }
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
      this._leaving = false; this.hero = null; this.rival = null; this.over = false; this.busy = false; this.shown = null; this.celebrating = false;
      this.spin = null; this.spinNext = null; this.hidden = null; this.logBg = null; this.sleepParts = null; this.meterBox = null; this.fogBand = null; this.mounds = null; // v1.0 Compass Spin, PEEKABOO! (the scene object is reused)
      this.copy = null; this.copyRec = null; this.copyChip = null; this.copyHand = null; this.rocketImg = null; this.pushEv = null; // v1.1 COPYCAT!, PUSH!
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
        c.setSize(cw, ch).setInteractive({ useHandCursor: true }).setScale(0); press(this, c, 0.93, 1);
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
      // level scaling per world: Hills and Spooky from L1, Space from L4, Canada from L6 (docs/gdd/0.8-canada.md section 5),
      // Ocean from L9, Veggie Patch from L11 (docs/gdd/1.0-ocean.md section 5)
      const from = SCALE_FROM[this.world] || 0;
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
      this.rects = rects; // card homes (Compass Spin moves cards between them)
      // left-handed (Settings): the cards mirror, card 0 is top right; recomputed on every setup, so a rotation keeps it
      if (PREF().hand === 'left') rects.forEach(r => { r.x = W - r.x; });
      const compact = !PORTRAIT && n > 4;
      // portrait: fighters stand just above the cards (room for the log line) and shrink when space is short
      const groundY = PORTRAIT ? top - 150 : (compact ? top - 80 : H * 0.68);
      this.groundY = groundY;
      const zoom = compact ? 0.82 : (PORTRAIT ? clamp((groundY - 330) / 520, 0.55, 1) : 1);
      const moon = this.add.image(W / 2, PORTRAIT ? Math.max(H * 0.2, groundY - 760) : H * 0.24, space ? 'planet' : 'moon').setScale((PORTRAIT ? 0.6 : 0.62 * zoom) * (space ? 1.15 : 1)).setAlpha(0.95);
      if (this.world === SPOOKY) moon.setTint(0xffa64d).setScale(moon.scale * 1.3);
      if (this.world === CANADA) moon.setTint(0xd8ecff);
      if (this.world === OCEAN) moon.setTint(0xdff7f0);
      if (this.world === BALLS) moon.setTint(0xfff1c9);
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
      const golden = d => !!(d && d.isToy && d.toy && TOYS.toyLevel(d.toy.xp) >= 4);
      if (golden(this.H)) this.goldCopy(this.hero, W * 0.27, PORTRAIT ? 200 : 150, !!boost);
      if (golden(R)) this.goldCopy(this.rival, W * 0.73, PORTRAIT ? 200 : 150, false);
      if (R.ghostly) this.tweens.add({ targets: this.rival.spr, alpha: 0.6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.hero.name = this.H.name; this.hero.napTex = this.H.napTex; this.hero.isJack = this.H.isJack;
      this.rival.name = R.nick || R.name;
      this.rmoves = R.moves.map((m, i) => {
        const o = Object.assign({ k: 'r' + i, w: DEF_W[m.type] || 20 }, m);
        if (o.usesHard && D === DIFFS.hard) o.uses = o.usesHard;
        if (o.usesEasy && D === DIFFS.easy) o.uses = o.usesEasy; // v1.0 (Big Yawn: 1 on EASY)
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
        b.icon = img(this, -130, -10, tex).setScale(iconScale(tex, 118)).setAngle(-12); b.add(b.icon); // img(): atlas icons work too (j:alarm)
        this.tweens.add({ targets: b, scale: 1.05, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        return b;
      };
      this.blockBtn = toolBtn('BLOCK IT!', C.coral, 'extinguisher', () => this.playerBlock(this.rival.charging && this.rival.charging.type === 'beam' ? 'umb' : 'ext'));
      this.extBtn = toolBtn('FOAM!', C.coral, 'extinguisher', () => this.playerBlock('ext'));
      this.umbBtn = toolBtn('UMBRELLA!', 0x6c7bff, 'umbrella', () => this.playerBlock('umb'));
      // v1.0 Big Yawn / Captain's Nap: ring the ALARM! (costs the turn, like BLOCK IT!); a hand points at it on EASY and the first time
      this.alarmBtn = toolBtn('ALARM!', 0xffb347, 'j:alarm', () => this.playerAlarm());
      // v1.1 Poland's countdown: PUSH! helps him into space (costs the turn); HARD counts 3, 2, 1, GO! on the button
      this.pushBtn = toolBtn('PUSH!', C.orange, 'rocket', () => this.playerPush());
      this.pushBtn.on('pointerdown', () => { this.pushDownGo = this.pushGo(); }); // HARD: the press counts, not the lift (button() fires on pointerup)
      // portrait: above the button; landscape: beside it, pointing left (above it the hand sat on the VS, QA B74)
      this.alarmHand = img(this, PORTRAIT ? W / 2 : W / 2 + 275, PORTRAIT ? bby - 150 : bby, 'hand').setScale(iconScale('hand', 110)).setDepth(36).setVisible(false);
      if (!PORTRAIT) this.alarmHand.setAngle(90);
      this.tweens.add(PORTRAIT ? { targets: this.alarmHand, y: bby - 120, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' } : { targets: this.alarmHand, x: W / 2 + 250, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
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
        const put = (f, o) => { ['hp', 'max', 'used', 'dizzy', 'shield', 'spare', 'bonus', 'firstBonus', 'lastType', 'afterCharge', 'beamed', 'asleep', 'meter', 'orbit'].forEach(k => { if (o[k] !== undefined) f[k] = o[k]; }); f.bar.setMax(f.max); f.bar.set(f.hp, this); };
        put(P, res.h); put(T, res.r);
        if (res.spin) { this.spin = res.spin; this.applySpin(false); } // the same drifted cards and LUCKY card, no slide (docs/gdd/1.0-ocean.md section 4)
        if (res.hidden && this.showHidden) { this.hidden = res.hidden; this.showHidden(true); }
        if (res.charging >= 0 && this.rmoves[res.charging]) { T.charging = this.rmoves[res.charging]; this.chargeFx(T); }
        if (res.copy && this.rmoves[res.copy.k]) { this.copy = { k: res.copy.k, mini: !!res.copy.mini }; this.copyFx(true); } // COPYCAT! armed: the tint, the chip and the card strips come back
        if (res.log) { this.logT.setText(res.log); this.logBack(); }
        // the duel was already over: show the result panel again in the new layout (QA B31)
        if (res.result) {
          this.setStatus(P); this.setStatus(T);
          this.over = true; this.busy = true; this.acted = true; this.shown = res.result; this.setCards(false);
          this.resultPanel(res.result, false);
          return;
        }
      }
      if (R.sleepy && !res) { T.asleep = true; T.meter = 0; } // Sleepy Thully starts asleep (WAKE UP!)
      if (T.asleep) this.sleepFx(T);
      A.music(this.track()); // the create hook ran before setup: lullaby or boss after a restore
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
      const pick = f => ({ hp: f.hp, max: f.max, used: Object.assign({}, f.used), dizzy: f.dizzy, shield: f.shield, spare: f.spare, bonus: f.bonus, firstBonus: f.firstBonus, lastType: f.lastType, afterCharge: !!f.afterCharge, beamed: (f.beamed || []).slice(), asleep: !!f.asleep, meter: f.meter || 0, orbit: !!f.orbit });
      return { boost: this.boost ? this.boost.id : null, h: pick(this.hero), r: pick(this.rival), charging: this.rival.charging ? this.rmoves.indexOf(this.rival.charging) : -1, log: this.logT ? this.logT.text : '', acted: !!this.acted,
        spin: this.spin ? Object.assign({}, this.spin, { order: this.spin.order.slice() }) : null, hidden: this.hidden ? Object.assign({}, this.hidden) : null,
        copy: this.copy ? { k: this.copy.k, mini: !!this.copy.mini } : null };
    }
    // the duel's music: Thully asleep = lullaby; bosses = boss; Canada = north; Ocean = sea; Veggie Patch = garden; Countryballs = parade
    track() {
      const R = this.R, T = this.rival;
      if (R.sleepy && (!T || T.asleep)) return 'lullaby';
      return R.boss ? 'boss' : R.world === CANADA ? 'north' : R.world === OCEAN ? 'sea' : R.world === VEGGIE ? 'garden' : R.world === BALLS ? 'parade' : 'battle';
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
    // toy growth (v1.0): a GOLDEN toy gets a gold copy of its picture, 6% bigger, behind it (fills the white sticker outline).
    // Tint fill needs WebGL; on Canvas a GOLDEN chip under the pep bar instead
    goldCopy(f, bx, by, low) {
      if (this.game.renderer.type !== Phaser.WEBGL) { f.goldChip = chip(this, bx, by + (PORTRAIT ? 70 : 76) + (low ? 56 : 0), 'GOLDEN', C.star, 22).setDepth(30); return; }
      const g = this.add.image(0, 0, f.key).setOrigin(0.5, 1).setFlipX(f.spr.flipX).setTintFill(0xffd23f);
      f.squash.addAt(g, 0); f.gold = g;
      const sync = () => { if (!g.active || !f.spr.active) return; g.setScale(f.spr.scaleX * 1.06, f.spr.scaleY * 1.06); g.x = f.spr.x; g.y = f.spr.y + f.spr.displayHeight * 0.03; g.setVisible(f.spr.visible).setAlpha(f.spr.alpha); };
      sync(); this.events.on('update', sync); this.events.once('shutdown', () => this.events.off('update', sync));
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
      if (c.id === 'nightcap') this.tweens.add({ targets: hat, angle: hat.angle + 8, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); // the pompom swings
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
        c, setMax: (m) => { max = m; },
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
      const t1b = L.t1y, t1 = fit(txt(this, L.tx, L.t1y, a.title, L.f1, C.ink, { ox: L.ox, st: 0, shadow: false }), L.tw);
      const t2 = txt(this, L.tx, L.t2y, a.sub || '', L.f2, '#4a4f8c', { ox: L.ox, st: 0, shadow: false, weight: '500' });
      const used = txt(this, 0, 0, 'USED', compact ? 46 : 60, '#ff6b5b', { stroke: '#fff3d2', st: 8 }).setAngle(-12).setVisible(false);
      // a card the Mothership's tractor beam took: small UFO + BEAMED UP stamp until the end of the duel
      const ufo = this.add.image(w / 2 - 34, -h / 2 + 30, 'ufo').setScale(iconScale('ufo', 52)).setAngle(12).setVisible(false);
      // Compass Spin (v1.0): a compass badge on a moved card; the LUCKY CURRENT card glows aqua with a +5 chip
      const glow = this.add.graphics().setVisible(false);
      glow.lineStyle(10, 0x5ff0e6); glow.strokeRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, R + 6);
      glow.lineStyle(4, 0xffffff, 0.8); glow.strokeRoundedRect(-w / 2 - 14, -h / 2 - 14, w + 28, h + 28, R + 12);
      const badge = this.add.image(-w / 2 + 26, -h / 2 + 24, 'compass').setScale(iconScale('compass', 40)).setVisible(false);
      const plus = chip(this, w / 2 - 40, -h / 2 + 8, '+5', 0x5ff0e6, 24).setVisible(false);
      // v1.1 COPYCAT!: a 40 px strip (27 px text, QA B75) at the bottom of the card says what the copy will do (not on HARD); on EASY the best card glows mint
      const cs = this.add.graphics().setVisible(false), ct = txt(this, 0, h / 2 - 24, '', 27, C.ink, { st: 0, shadow: false }).setVisible(false);
      const cglow = this.add.graphics().setVisible(false); cglow.lineStyle(10, C.mint); cglow.strokeRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, R + 6);
      c.add([g, ic, t1, t2, used, ufo, glow, badge, plus, cs, ct, cglow]); // (the new parts go last: tests and other code read list[1] = icon, list[2] = title)
      this.tweens.add({ targets: [glow, cglow], alpha: { from: 1, to: 0.35 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      c.copyLabel = null;
      c.setCopy = (label, best) => {
        c.copyLabel = label || null; cs.setVisible(!!label); ct.setVisible(!!label); cglow.setVisible(!!label && !!best);
        if (V) t1.y = L.t1y = t1b - (label ? 8 : 0); // portrait grid: the title steps up so the taller strip clears it
        if (!label) { t2.setVisible(true); return; }
        cs.clear(); cs.fillStyle(/flops/.test(label) ? 0x9ff0b4 : /at you/.test(label) ? 0xffc2c2 : 0xd8ecff); cs.fillRoundedRect(-w / 2 + 8, h / 2 - 44, w - 16, 40, 12);
        fit(ct.setText(label).setScale(1), w - 30);
        t2.setVisible(L.t2y + L.f2 / 2 <= h / 2 - 44); // the strip takes the sub line's place on small cards
      };
      c.setSpin = (moved, lucky, shine) => { badge.setVisible(!!moved || (!!lucky && !shine && !this.easy)); glow.setVisible(!!lucky && !!shine); plus.setVisible(!!lucky && !!shine); };
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: ic, angle: { from: -6, to: 6 }, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      c.on('pointerdown', () => { if (!c.enabled) return; A.init(); draw(true); ic.y = L.iy + 6; t1.y = L.t1y + 6; t2.y = L.t2y + 6; });
      const up = () => { draw(false); ic.y = L.iy; t1.y = L.t1y; t2.y = L.t2y; };
      c.on('pointerout', up);
      c.on('pointerup', () => { up(); if (c.enabled) this.playerMove(a.k); });
      c.refresh = (on, hiding) => {
        const left = a.uses ? a.uses - (this.hero.used[a.k] || 0) : Infinity;
        const beamed = (this.hero.beamed || []).includes(a.k);
        const isUsed = left <= 0 || beamed;
        if (hiding && !isUsed && on) { // PEEKABOO!: the rival is hiding, attack cards wait
          c.enabled = false; look = 'off'; draw(false); [ic, t1, t2].forEach(o => o.setAlpha(0.7));
          // a small stamp in the top corner: the card names stay readable (B72)
          used.setText('HIDING!').setFontSize(compact ? 20 : 26).setStroke('#fff3d2', 5).setScale(1).setVisible(true); used.setPosition(w / 2 - used.width / 2 - 14, -h / 2 + (compact ? 16 : 22)); ufo.setVisible(false); return;
        }
        t2.setText(a.uses ? (a.sub || '') + ' · ' + (beamed ? 'beamed up' : isUsed ? 'used' : (a.uses === 1 ? 'once' : left + ' left')) : (a.sub || ''));
        fit(t2.setScale(1), L.tw);
        c.enabled = on && !isUsed; look = c.enabled ? 'on' : isUsed ? 'used' : 'off'; draw(false);
        [ic, t1, t2].forEach(o => o.setAlpha(look === 'on' ? 1 : look === 'off' ? 0.7 : 0.45));
        used.setText(beamed ? 'BEAMED UP' : 'USED').setFontSize(compact ? 46 : 60).setStroke('#fff3d2', 8).setPosition(0, 0).setScale(1).setVisible(isUsed); fit(used, w - 70); ufo.setVisible(beamed);
      };
      return c;
    }
    setCards(on) {
      this.moves.forEach(m => m.card.refresh(on && !this.over, !!this.hidden && !!m.dmg));
      // COPYCAT! armed: each card says what the copy will do (EASY / NORMAL; HARD no strips)
      const cpOn = on && !this.over && !!this.copy && !this.hard, best = cpOn && this.easy ? this.bestCopyCard() : null;
      this.moves.forEach(m => m.card.setCopy && m.card.setCopy(cpOn && m.card.enabled ? this.copyLabel(m) : null, m === best));
      if (this.blockBtn) {
        const cur = on && !this.over ? this.rival.charging : null, slap = !!(cur && cur.type === 'slapshot'), yawn = !!(cur && cur.type === 'yawn'), launch = !!(cur && cur.type === 'launch');
        const ch = slap || yawn || launch ? null : cur, beam = !!(ch && ch.type === 'beam');
        this.alarmBtn.setVisible(yawn);
        this.pushBtn.setVisible(launch);
        if (launch && this.hard) { if (!this.pushEv) this.pushCount(true); } else if (this.pushEv) this.pushCount(false);
        this.alarmHand.setVisible((yawn && (this.easy || !(Save.data.stats || {}).alarmSeen)) || (launch && (this.easy || !(Save.data.stats || {}).pushSeen)));
        // SLAPSHOT has no block button: the save is a timed tap when the shot comes
        if (this.saveChip) this.saveChip.setVisible(slap);
        const one = !!(ch && this.easy && !ch.mini), two = !!(ch && !this.easy && !ch.mini);
        this.blockBtn.setVisible(one); this.blockBtn.icon.setTexture(beam ? 'umbrella' : 'extinguisher').setScale(iconScale(beam ? 'umbrella' : 'extinguisher', 118));
        this.extBtn.setVisible(two);
        this.umbBtn.setVisible(two || !!(ch && ch.mini));
        // the buttons sit where the HARD / booster chips are on iPad and phone landscape: hide the chips meanwhile (QA B48)
        const btns = one || two || !!(ch && ch.mini) || yawn || launch;
        [this.diffChip, this.boostChip].forEach(o => o && o.setVisible(!btns));
        if (this.boostChip && slap) this.boostChip.setVisible(false);
        // HARD: the two buttons swap sides at random each charge (this.toolSwap is set in startCharge)
        const dx = 230, sw = (this.toolSwap ? -1 : 1) * (PREF().hand === 'left' ? -1 : 1); // left-handed: FOAM! on the right
        this.extBtn.x = W / 2 - dx * sw; this.umbBtn.x = two ? W / 2 + dx * sw : W / 2;
      }
    }
    log(s) {
      this.logT.setText(s); this.logBack();
      this.tweens.add({ targets: this.logT, scale: { from: 1.12, to: 1 }, alpha: { from: 0.4, to: 1 }, duration: 260, ease: 'Back.out' });
    }
    // PEEKABOO! in the forest: the log line gets a dark strip so the tree trunks do not run through the letters (B72)
    logBack(on) {
      if (on === false) { if (this.logBg) { this.logBg.destroy(); this.logBg = null; } return; }
      if (on && !this.logBg) this.logBg = this.add.rectangle(0, 0, 10, 10, 0x0f1240, 0.62).setDepth(19);
      if (this.logBg) { this.logT.setDepth(20); this.logBg.setPosition(W / 2, this.logT.y).setDisplaySize(Math.min(W - 20, this.logT.width + 50), this.logT.height + 16); }
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
        if (this.hero.lucky5) { dmg += this.hero.lucky5; this.hero.lucky5 = 0; this.popWord(p.x - 120, p.y - 340, 'LUCKY CURRENT +5!', '#5ff0e6', 60, -6); }
      }
      // Sleepy Thully: the dream bubble halves a hit, and every hit fills one pip of the Wake-o-meter
      let wakes = false;
      if (target.asleep && dmg > 0 && !raw) {
        dmg = Math.ceil(dmg / 2); target.meter = (target.meter || 0) + 1; this.meterFx(target);
        if (target.meter >= this.wakeNeed()) wakes = true;
      }
      if (target.shield && dmg > 0 && !raw) {
        dmg = Math.ceil(dmg / 2); target.shield = false; this.setStatus(target);
        A.block(); this.popWord(p.x, p.y - 220, 'BLOCKED!', '#9fdcff', 70, -6);
      }
      const crit = dmg >= 20;
      A.thump(crit ? 1.3 : (quiet ? 0.6 : 0.9)); buzz(crit ? 60 : 30);
      target.spr.setTintFill(0xffffff);
      this.time.delayedCall(90, () => { target.spr.clearTint(); if (target.asleep) target.spr.setTint(0xc4ccff); else if (target === this.rival) this.rivalTint(); });
      this.sparks.explode(crit ? 26 : (quiet ? 8 : 14), p.x, p.y);
      if (kind !== 'roar' && kind !== 'fire') this.feathers.explode(quiet ? 5 : 8 + Math.round(dmg / 2), p.x, p.y - 20);
      const ring = this.add.image(p.x, p.y, 'ring').setDepth(22).setScale(0.3).setAlpha(0.9);
      this.tweens.add({ targets: ring, scale: crit ? 2.6 : 1.8, alpha: 0, duration: 380, ease: 'Quad.out', onComplete: () => ring.destroy() });
      this.cameras.main.shake(crit ? 320 : 180, crit ? 0.014 : (quiet ? 0.004 : 0.006));
      if (crit) { A.crit(); this.cameras.main.zoomTo(1.05, 90); this.time.delayedCall(260, () => this.cameras.main.zoomTo(1, 260)); }
      await this.hitStop(crit ? 130 : 60);
      target.hp = Math.max(0, target.hp - dmg); target.bar.set(target.hp, this);
      if (this.copyRec && target === this.rival) this.copyRec.hits.push(dmg); // COPYCAT!: the number the player saw
      this.number(p.x + (quiet ? rnd(-60, 60) : 0), p.y - 120, '-' + dmg, target === this.rival ? '#ffd23f' : '#ff6b5b', quiet ? 90 : 120);
      if (crit) this.popWord(p.x + (target.dir > 0 ? -150 : 150), p.y - 260, 'CRIT!', '#ff6b5b', 76, -10);
      const kb = -target.dir * (crit ? 90 : 50);
      this.tweens.add({ targets: target.squash, scaleX: 1.18, scaleY: 0.82, duration: 70, yoyo: true, ease: 'Quad.out' });
      await tw(this, { targets: target.root, x: target.root.x + kb, angle: -target.dir * (crit ? 10 : 5), duration: 110, ease: 'Quad.out' });
      await tw(this, { targets: target.root, x: target.home, angle: 0, duration: 420, ease: 'Elastic.out', easeParams: [1, 0.5] });
      if (wakes && target.asleep) this.wakeUp();
    }
    // ---- v1.0 WAKE UP! (Sleepy Thully, docs/gdd/1.0-ocean.md section 4b)
    wakeNeed() { return this.easy ? 2 : this.hard ? 4 : 3; }
    // asleep: a sleepy tint, a lean, zzz rising, a dream bubble and the Wake-o-meter under the pep bar; awake: all gone
    sleepFx(T) {
      if (this.sleepParts) { this.sleepParts.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); }); this.sleepParts = null; }
      if (this.meterBox) { this.meterBox.destroy(); this.meterBox = null; }
      if (!T.asleep) { T.spr.clearTint(); T.squash.setAngle(0); return; }
      T.spr.setTint(0xc4ccff); T.squash.setAngle(8);
      const h = T.height(), w = T.spr.displayWidth;
      const bub = this.add.graphics(); bub.fillStyle(0xe6dcff, 0.14); bub.fillEllipse(0, -h * 0.5, w * 1.25, h * 1.15);
      bub.lineStyle(6, 0xd8c2ff, 0.6); bub.strokeEllipse(0, -h * 0.5, w * 1.25, h * 1.15);
      T.root.add(bub);
      this.tweens.add({ targets: bub, scaleX: 1.04, scaleY: 1.03, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const zz = this.add.particles(0, 0, 'zzz', { x: { min: T.root.x - 40, max: T.root.x + 40 }, y: T.root.y - h * 0.9, speedY: { min: -120, max: -70 }, speedX: { min: -40, max: 10 }, lifespan: 1800, scale: { start: 0.22, end: 0.08 }, alpha: { start: 0.9, end: 0 }, frequency: 700 }).setDepth(26);
      this.sleepParts = [bub, zz];
      this.meterFx(T);
    }
    meterFx(T) {
      if (this.meterBox) { this.meterBox.destroy(); this.meterBox = null; }
      if (!T.asleep) return;
      const n = this.wakeNeed(), hy = PORTRAIT ? 200 : 150, c = this.meterBox = this.add.container(W * 0.73, hy + (PORTRAIT ? 70 : 76)).setDepth(30);
      for (let i = 0; i < n; i++) {
        const on = i < (T.meter || 0), pip = img(this, (i - (n - 1) / 2) * 62, 0, 'j:alarm').setScale(iconScale('j:alarm', 52));
        if (!on) pip.setTint(0x3a3f7a).setAlpha(0.8); else this.tweens.add({ targets: pip, angle: { from: -14, to: 14 }, duration: 90, yoyo: true, repeat: 3 });
        c.add(pip);
      }
    }
    wakeUp(line) {
      const T = this.rival; T.asleep = false; T.meter = 0; this.sleepFx(T);
      const c = T.center();
      this.popWord(c.x, c.y - 280, 'WHO WOKE ME UP?!', '#ffb347', 70, -6);
      A.alarm && A.alarm(); this.time.delayedCall(500, () => A.grumble && A.grumble());
      this.tweens.add({ targets: T.squash, scaleX: 1.15, scaleY: 1.15, duration: 160, yoyo: true, repeat: 1 });
      A.music(this.track());
      this.log((line ? line + ' ' : '') + (this.R.wake || (T.name + ' wakes up!')));
    }
    // Big Yawn not stopped: back to sleep (+40 scaled, a full Wake-o-meter again). Captain's Nap (mini): he naps on watch (+20)
    async fallAsleep(m, T) {
      this.endCharge(T);
      this.tweens.add({ targets: T.squash, scaleY: 0.9, duration: 500, yoyo: true });
      A.snore();
      if (!m.mini) { T.asleep = true; T.meter = 0; this.sleepFx(T); A.music(this.track()); this.popWord(T.center().x, T.center().y - 260, 'ZZZ...', '#d8c2ff', 84, 6); }
      else this.popWord(T.center().x, T.center().y - 260, 'SNOOOZE...', '#d8c2ff', 70, 6);
      this.log(m.mini ? T.name + ' naps on watch... "Just five minutes..."' : T.name + ' falls back asleep! Hit him ' + this.wakeNeed() + ' times to wake him up.');
      await wait(this, 700);
      if (T.hp < T.max) this.heal(T, Math.min(m.amt || 20, T.max - T.hp));
      await wait(this, 800);
    }
    // ALARM!: the clock rings; Thully jumps up dizzy (I'M UP! I'M UP!); Captain Fog just wakes (I'M AWAKE, SIR!)
    async playerAlarm() {
      const T = this.rival, m = T.charging;
      if (this.busy || this.over || !m || m.type !== 'yawn') return;
      this.busy = true; this.acted = true; this.setCards(false); this.unspin(true);
      const st = Save.data.stats || (Save.data.stats = {}); st.alarmSeen = 1;
      emit('alarm', { mini: !!m.mini }, this);
      const c = T.center(), clock = img(this, c.x, c.y - 260, 'j:alarm').setScale(0).setDepth(27);
      A.alarm && A.alarm(); buzz([30, 30, 30]);
      await tw(this, { targets: clock, scale: iconScale('j:alarm', 150), duration: 220, ease: 'Back.out' });
      this.tweens.add({ targets: clock, angle: { from: -18, to: 18 }, duration: 70, yoyo: true, repeat: 7 });
      this.popWord(c.x, c.y - 420, 'RIIING!', '#ffb347', 84, -6);
      await wait(this, 700);
      this.endCharge(T); T.afterCharge = true;
      await tw(this, { targets: T.root, y: this.groundY - 160, duration: 200, yoyo: true, ease: 'Quad.out' });
      this.tweens.add({ targets: clock, scale: 0, alpha: 0, duration: 300, onComplete: () => clock.destroy() });
      if (m.mini) { this.popWord(c.x, c.y - 260, 'I\'M AWAKE, SIR!', '#fff3d2', 64, 6); this.log(T.name + ' jumps up: "I\'M AWAKE, SIR!"'); await wait(this, 900); }
      else {
        this.popWord(c.x, c.y - 260, 'I\'M UP! I\'M UP!', '#fff3d2', 72, 6);
        this.log(this.H.name + ' rings the ALARM! ' + T.name + ' jumps up all wobbly!');
        await wait(this, 400);
        T.dizzy = true; this.setStatus(T); A.dizzy(); await wait(this, 700);
      }
      await this.afterPlayer();
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
    async throwThing(from, to, tex = 'pillow', dur = 420, tint) {
      const a = from.front(), b = to.center();
      const pil = img(this, a.x, a.y, tex).setDepth(25).setScale(tex === 'dot' ? 0.9 : this.projScale(tex));
      if (tint) pil.setTint(tint);
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
        case 'throw':
          await this.lunge(att, 60); if (m.sound && m.sound !== 'whoosh') this.sfx(m.sound); // throwThing whooshes already
          await this.throwThing(att, def, m.tex || 'pillow', 420, m.tint);
          if (m.word) this.popWord(def.center().x, def.center().y - 220, m.word, '#ffd23f', 84, rnd(-10, 10));
          await this.impact(def, d); await this.back(att); break;
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
          if (m.sound) this.sfx(m.sound); else A.block();
          if (m.word) this.popWord(att.center().x, att.center().y - 240, m.word, '#ffd36b', 80, -6);
          att.shield = true; this.setStatus(att);
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
          if (m.tex) { await this.throwThing(att, def, m.tex, 380, m.tint); }
          else this.tweens.add({ targets: att.root, angle: { from: -8, to: 8 }, duration: 260, yoyo: true, repeat: 2, onComplete: () => att.root.setAngle(0) });
          await this.makeDizzy(att, def, m.color || 0xb38cff, m.word);
          break;
        }
        case 'multi': {
          if (m.sound) this.sfx(m.sound); else A.spin();
          const tx = def.root.x - att.dir * (PORTRAIT ? 300 : 360);
          await Promise.all([tw(this, { targets: att.root, x: tx, duration: 380, ease: 'Quad.in' }), tw(this, { targets: att.squash, angle: 720 * att.dir, duration: 380 })]);
          att.squash.setAngle(0);
          for (let i = 0; i < (m.seq ? m.seq.length : m.hits || 3); i++) { // seq: a COPYCAT! copy repeats the player's numbers
            if (def.hp <= 0) break;
            this.tweens.add({ targets: att.squash, angle: 360 * att.dir, duration: 220, onComplete: () => att.squash.setAngle(0) });
            await this.impact(def, m.seq ? m.seq[i] : rnd(m.dmg[0], m.dmg[1]), 'pillow', true);
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
          if (m.sound) this.sfx(m.sound); else A.whoosh();
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
        case 'whirl': await this.whirl(m, att, def, d); break;
        case 'yawn': await this.fallAsleep(m, att); break;
        case 'hide': await this.hide(m, att); break;
        case 'copy': await this.copyArm(m, att, def, d); break;
        case 'launch': await this.launchFall(m, att, def, d); break;
        case 'hop': {
          const sx = att.root.x, tx = def.root.x - att.dir * (PORTRAIT ? 330 : 400);
          for (let i = 1; i <= 3; i++) {
            A.tone && A.tone(400 + i * 150, 0.12, { type: 'triangle', vol: 0.15, slide: 1.6 });
            await tw(this, { targets: att.root, x: sx + (tx - sx) * i / 3, y: this.groundY - 160, duration: 180, ease: 'Quad.out' });
            await tw(this, { targets: att.root, y: this.groundY, duration: 150, ease: 'Quad.in' });
            this.tweens.add({ targets: att.squash, scaleX: 1.15, scaleY: 0.85, duration: 80, yoyo: true });
          }
          this.popWord(def.center().x, def.center().y - 220, m.word || 'BOING!', '#7fd6c2', 84, -8);
          if (m.sound) this.sfx(m.sound);
          await this.impact(def, d); await this.back(att); break;
        }
        case 'volley': {
          if (m.sound) this.sfx(m.sound);
          if (m.word) this.popWord(att.front().x - att.dir * 80, att.front().y - 170, m.word, '#ffe08a', 72, 6);
          const per = Math.ceil(d / 3);
          for (let i = 0; i < 3; i++) {
            await this.throwThing(att, def, m.tex || 'books', 300, m.tint);
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
      // Compass Spin: the LUCKY CURRENT card adds +5 to its first hit
      if (this.spin && this.moves.indexOf(m) === this.spin.lucky && m.dmg) { P.lucky5 = 5; emit('lucky', {}, this); }
      if (T.asleep && m.type === 'rain') { T.meter = this.wakeNeed(); this.wakeUp('INFERNO RAIN wakes anyone up!'); await wait(this, 900); }
      // COPYCAT! armed: remember this move and every number it shows on the rival; the copy comes on his next turn
      if (this.copy && !this.copy.rec) {
        this.copy.rec = { k, hits: [], amt: m.amt || 0 }; this.copyRec = this.copy.rec;
        const st = Save.data.stats || (Save.data.stats = {}); st.copySeen = 1;
        if (this.copyHand) { this.copyHand.destroy(); this.copyHand = null; }
      }
      if (this.hidden && m.type === 'dance') {
        // Six-Seven during a PEEKABOO!: the hidden rival can't stop giggling and pops out (found: dizzy, no bonk)
        this.stopTells(); emit('found', { dance: true }, this); this.seekSeen();
        this.log(T.name + (this.R.plural ? ' giggle' : ' giggles') + ' and ' + (this.R.plural ? 'pop' : 'pops') + ' out!'); await this.unhide(true);
      }
      await this.doMove(m, P, T);
      this.copyRec = null;
      if (this.hidden && !this.over) { await this.sneak(); if (this.checkEnd()) return; } // a heal or nap during a hide: then the sneak tickle
      P.lucky5 = 0;
      this.unspin(true);
      if (this.checkEnd()) return;
      await this.afterPlayer();
    }
    async afterPlayer() {
      const P = this.hero;
      await this.rivalTurn();
      if (this.checkEnd()) return;
      await wait(this, 250);
      if (P.dizzy) {
        P.dizzy = false; this.spinNext = null; // a Compass Spin is used up by a skipped turn
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
      if (this.spinNext) { const sp = this.spinNext; this.spinNext = null; this.startSpin(sp); }
      this.busy = false; this.setCards(true);
      this.autoSeek(); this.autoPush();
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
      if (this.hidden) await this.unhide(false); // (never expected: a seek turn always follows a hide)
      if (T.orbit) { await this.orbitTurn(T); return; } // pushed into space last turn: he waves from orbit and floats down
      if (T.asleep) {
        // Sleepy Thully only snores: EASY nothing, NORMAL +8, HARD +10 (not scaled)
        T.dizzy = false; this.setStatus(T);
        const n = this.easy ? 0 : this.hard ? 10 : 8;
        A.snore(); this.popWord(T.center().x, T.center().y - 260, 'SNORE...', '#d8c2ff', 76, 6);
        this.tweens.add({ targets: T.squash, scaleY: 1.06, duration: 600, yoyo: true });
        this.log(T.name + ' snores' + (n ? ' and dreams of pillows... +' + n + ' pep' : '... zzz') + '. Wake him up!');
        await wait(this, 700);
        if (n && T.hp < T.max) this.heal(T, Math.min(n, T.max - T.hp));
        await wait(this, 700); return;
      }
      if (T.dizzy) {
        T.dizzy = false; this.setStatus(T);
        const is = this.R.plural ? ' are' : ' is'; // the Blips are three (QA B46)
        if (this.copy) {
          // COPYCAT! after a Six-Seven (or any dizzy move): too dizzy to copy, the turn is lost
          this.copy = null; this.copyFx(false); T.afterCharge = true; T.lastType = 'copy';
          emit('copyflop', { how: 'dizzy' }, this);
          this.log(T.name + is + ' too dizzy to copy! The paint drips off.');
          A.dizzy(); await tw(this, { targets: T.root, angle: { from: -12, to: 12 }, duration: 180, yoyo: true, repeat: 2, onComplete: () => T.root.setAngle(0) });
          await wait(this, 500); return;
        }
        if (T.charging && T.charging.type === 'yawn') {
          // Six-Seven during a yawn: he dances along and forgets to sleep (EASY / NORMAL); HARD: he still falls asleep
          if (this.hard) { this.log(T.name + is + ' dizzy... and still sleepy!'); await this.fallAsleep(T.charging, T); T.afterCharge = true; return; }
          this.endCharge(T); T.afterCharge = true;
          this.log(T.name + ' dances along and forgets to sleep!');
          A.dance(); await tw(this, { targets: T.root, angle: { from: -12, to: 12 }, duration: 180, yoyo: true, repeat: 2, onComplete: () => T.root.setAngle(0) });
          await wait(this, 500); return;
        }
        if (T.charging && T.charging.type === 'slapshot' && this.hard) {
          // HARD: Six-Seven only delays the shot, the wind-up stays
          this.log(T.name + is + ' too dizzy... the SLAPSHOT waits one turn!');
        } else if (T.charging && T.charging.type === 'slapshot') {
          this.endCharge(T); T.afterCharge = true;
          this.log(T.name + is + ' too dizzy... ' + (this.R.plural ? 'they drop' : 'and drops') + ' the puck!');
        } else if (T.charging) {
          const beam = T.charging.type === 'beam', launch = T.charging.type === 'launch';
          this.endCharge(T); T.afterCharge = true; launch ? A.fizzle && A.fizzle() : A.steam();
          this.log(T.name + is + (beam ? ' too dizzy... the beam goes disco and fizzles!' : launch ? ' too dizzy... the rocket sputters out!' : ' too dizzy... the fire fizzles out!'));
        }
        else this.log(T.name + is + ' too dizzy to move!');
        A.dizzy();
        await tw(this, { targets: T.root, angle: { from: -12, to: 12 }, duration: 180, yoyo: true, repeat: 2, onComplete: () => T.root.setAngle(0) });
        await wait(this, 500); return;
      }
      if (this.copy) { await this.copyMove(T); return; }
      if (T.charging) { T.afterCharge = true; await this.doMove(T.charging, T, this.hero); return; }
      const m = this.pickMove();
      T.used[m.k] = (T.used[m.k] || 0) + 1; T.lastType = m.type; T.afterCharge = false;
      if (m.charge) { await this.startCharge(m, T); return; }
      await this.doMove(m, T, this.hero);
    }
    pickMove() {
      const T = this.rival, P = this.hero;
      // ?debug: __psCopy = true makes the next rival turn a COPYCAT! (tests)
      if (DEBUG && window.__psCopy) { const cm = this.rmoves.find(x => x.type === 'copy'); if (cm) { window.__psCopy = false; return cm; } }
      const ok = this.rmoves.filter(m => {
        if (m.uses && (T.used[m.k] || 0) >= m.uses) return false;
        if (m.type === 'heal' || m.type === 'nap') return T.hp < T.max * 0.65;
        if (m.type === 'shield') return !T.shield;
        if (m.type === 'dizzy' || m.type === 'dance') return !P.dizzy && T.lastType !== m.type;
        if (m.charge) return T.lastType !== m.type && !T.afterCharge; // never two charged moves in a row
        if (m.type === 'whirl') return T.lastType !== 'whirl' && !T.afterCharge; // Compass Spin: never twice in a row, never right after a charge
        if (m.type === 'hide') return T.lastType !== 'hide' && !T.afterCharge && !P.dizzy; // PEEKABOO!: a seek turn always follows
        if (m.type === 'copy') return T.lastType !== 'copy' && !T.afterCharge && !P.dizzy && !this.copy; // COPYCAT!: never twice in a row, never after a charge
        return true;
      });
      const pool = ok.length ? ok : this.rmoves.filter(m => m.dmg && !m.charge && m.type !== 'hide' && m.type !== 'copy');
      // a little smarter: go for the finish, avoid hitting a shield, heal when really low
      const wOf = m => {
        let w = m.w;
        if (!this.smart) return w;
        if (m.dmg && !m.charge && m.type !== 'hide' && m.type !== 'copy' && P.hp <= m.dmg[0] && !P.shield) w *= 4; // a hide's damage only comes on a miss
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
      if (T.charging && T.charging.type === 'launch') {
        // Poland's countdown: an orange glow, a cardboard rocket strapped on behind him, sparks from its bottom
        this.fireFx.fillColor = 0xff8a3d;
        this.tweens.add({ targets: this.fireFx, fillAlpha: 0.12, duration: 600 });
        this.chargeTw = this.tweens.add(keep({ targets: this.fireFx, fillAlpha: 0.05, duration: 800, yoyo: true, repeat: -1, delay: 600 }));
        T.spr.setTint(0xffd2b0);
        const h = T.height(), rk = this.rocketImg = this.add.image(-T.dir * T.spr.displayWidth * 0.18, -h * 0.5, 'rocket').setAngle(-45);
        rk.setScale(iconScale('rocket', h * 0.95)); T.root.addAt(rk, 1);
        this.tweens.add({ targets: rk, x: rk.x + 6, duration: 90, yoyo: true, repeat: -1 });
        this.embers = this.add.particles(0, 0, 'dot', { x: { min: T.root.x - 60, max: T.root.x + 60 }, y: T.root.y - 10, speedY: { min: 10, max: 60 }, speedX: { min: -120, max: 120 }, lifespan: 450, scale: { start: 0.35, end: 0 }, tint: [0xffd23f, 0xff8a3d, 0xffffff], blendMode: 'ADD', frequency: 70 }).setDepth(12);
        return;
      }
      if (T.charging && T.charging.type === 'yawn') {
        // Big Yawn: a sleepy lilac sky, zzz rising around the rival
        this.fireFx.fillColor = 0xb89cff;
        this.tweens.add({ targets: this.fireFx, fillAlpha: 0.14, duration: 600 });
        this.chargeTw = this.tweens.add(keep({ targets: this.fireFx, fillAlpha: 0.06, duration: 900, yoyo: true, repeat: -1, delay: 600 }));
        T.spr.setTint(0xe0d0ff);
        this.embers = this.add.particles(0, 0, 'zzz', { x: { min: T.root.x - 120, max: T.root.x + 120 }, y: T.root.y - T.height() * 0.8, speedY: { min: -200, max: -90 }, lifespan: 1500, scale: { start: 0.2, end: 0.06 }, alpha: { start: 1, end: 0 }, frequency: 260 }).setDepth(12);
        return;
      }
      if (T.charging && T.charging.type === 'slapshot') {
        // SLAPSHOT wind-up: frosty tint, snowflakes rising around the rival
        this.fireFx.fillColor = 0x9fdcff;
        this.tweens.add({ targets: this.fireFx, fillAlpha: 0.14, duration: 600 });
        this.chargeTw = this.tweens.add(keep({ targets: this.fireFx, fillAlpha: 0.06, duration: 800, yoyo: true, repeat: -1, delay: 600 }));
        T.spr.setTint(0xcfeaff);
        this.embers = this.add.particles(0, 0, 'snow', { x: { min: T.root.x - 160, max: T.root.x + 160 }, y: T.root.y - 20, speedY: { min: -360, max: -160 }, speedX: { min: -50, max: 50 }, lifespan: 1300, scale: { start: 0.14, end: 0 }, rotate: { min: 0, max: 360 }, frequency: 90 }).setDepth(12);
        return;
      }
      this.fireFx.fillColor = beam ? 0xc8ff3d : 0xff3b1f;
      this.tweens.add({ targets: this.fireFx, fillAlpha: beam ? 0.2 : 0.3, duration: 600 });
      this.chargeTw = this.tweens.add(keep({ targets: this.fireFx, fillAlpha: beam ? 0.08 : 0.14, duration: 700, yoyo: true, repeat: -1, delay: 600 }));
      if (beam) {
        // Tractor Beam: a yellow-green spotlight from the saucer sweeps over the ground in front of the hero
        T.spr.setTint(0xe6ffb0);
        const sx = T.root.x, sy = T.root.y - T.height() * 0.4, gy = this.groundY + 10, P = this.hero;
        const g = this.beamSpot = this.add.graphics().setDepth(9).setAlpha(0.5);
        const draw = (cx) => { g.clear(); g.fillStyle(0xd8ff6a, 0.55); g.fillTriangle(sx, sy, cx - 120, gy, cx + 120, gy); g.fillStyle(0xffffff, 0.35); g.fillEllipse(cx, gy, 250, 50); };
        const o = { x: P.root.x + 160 };
        draw(o.x);
        this.beamSweep = this.tweens.add({ targets: o, x: P.root.x - 120, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', onUpdate: () => draw(o.x) });
        this.tweens.add(keep({ targets: g, alpha: 0.85, duration: 500, yoyo: true, repeat: -1 }));
        this.embers = this.add.particles(0, 0, 'dot', { x: { min: sx - 100, max: sx + 100 }, y: sy, speedY: { min: -200, max: 200 }, speedX: { min: -200, max: 200 }, lifespan: 700, scale: { start: 0.3, end: 0 }, tint: [0xd8ff6a, 0xffffff, 0x8cff7a], blendMode: 'ADD', frequency: 60 }).setDepth(12);
        return;
      }
      T.spr.setTint(0xffb08a);
      this.embers = this.add.particles(0, 0, 'dot', { x: { min: T.root.x - 150, max: T.root.x + 150 }, y: T.root.y - 20, speedY: { min: -520, max: -260 }, speedX: { min: -60, max: 60 }, lifespan: 1100, scale: { start: 0.35, end: 0 }, tint: [0xff6b2b, 0xffd23f, 0xff3b1f], blendMode: 'ADD', frequency: 40 }).setDepth(12);
    }
    async startCharge(m, T) {
      T.charging = m;
      if (m.type === 'launch') {
        const first = !(Save.data.stats || {}).pushSeen;
        this.log('"3... 2... 1..." ' + (first || this.easy ? 'Tap PUSH! to help ' + T.name + ' fly!' : 'Help ' + T.name + ' fly?'));
        this.sfx(m.sound || 'countdown');
        this.chargeFx(T);
        for (const w of ['3...', '2...', '1...']) { this.popWord(T.center().x, T.center().y - 260, w, '#ffb36b', 90, 6); this.tweens.add({ targets: T.squash, scaleY: 1.08, duration: 150, yoyo: true }); await wait(this, 420); }
        await wait(this, 300);
        return;
      }
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
      if (m.type === 'yawn') {
        const first = !(Save.data.stats || {}).alarmSeen;
        this.log(m.mini ? T.name + ' yawns on watch... Tap ALARM! to wake him up!' : T.name + ' stretches... "Five more minutes..." ' + (first || this.easy ? 'Tap ALARM! to wake him up!' : 'Ring the ALARM!'));
        A.yawn ? A.yawn() : A.snore();
        this.chargeFx(T);
        await tw(this, { targets: T.squash, scaleX: 1.1, scaleY: 1.12, duration: 700, ease: 'Sine.inOut' });
        this.popWord(T.center().x, T.center().y - 240, m.mini ? 'JUST FIVE MINUTES...' : 'FIVE MORE MINUTES...', '#d8c2ff', 56, 6);
        await tw(this, { targets: T.squash, scaleX: 1, scaleY: 1, duration: 400 });
        await wait(this, 500);
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
      if (this.rocketImg) { const r = this.rocketImg; this.rocketImg = null; this.tweens.killTweensOf(r); this.tweens.add({ targets: r, scale: 0, alpha: 0, duration: 300, onComplete: () => r.destroy() }); }
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
      this.busy = true; this.acted = true; this.setCards(false); this.unspin(true);
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
    // ---- v1.0 Compass Spin (docs/gdd/1.0-ocean.md section 4): a hit, then the player's next turn is a Compass turn
    async whirl(m, att, def, d) {
      this.sfx(m.sound || 'whirr'); buzz(40);
      const c = att.center(), cp = this.add.image(c.x + att.dir * 170, c.y - 160, 'compass').setScale(0).setDepth(27);
      this.tweens.add({ targets: cp, scale: iconScale('compass', 120), duration: 260, ease: 'Back.out' });
      this.tweens.add({ targets: cp, angle: 720, duration: 1300, ease: 'Sine.inOut' });
      this.fogDrift();
      this.popWord(c.x, c.y - 300, m.word || 'WHIRL!', '#5ff0e6', 78, -6);
      await tw(this, { targets: att.squash, angle: 720 * att.dir, duration: 700, ease: 'Sine.inOut' });
      att.squash.setAngle(0);
      for (let i = 0; i < 4; i++) {
        const ring = this.add.image(c.x, c.y, 'ring').setDepth(22).setTint(0x5ff0e6).setScale(0.3).setAlpha(0.9);
        this.tweens.add({ targets: ring, x: def.center().x, y: def.center().y, scale: 1.6, angle: 360, alpha: 0, duration: 560, delay: i * 100, onComplete: () => ring.destroy() });
      }
      await wait(this, 450);
      this.tweens.add({ targets: cp, scale: 0, alpha: 0, duration: 300, delay: 200, onComplete: () => cp.destroy() });
      await this.impact(def, d, 'roar');
      if (def === this.hero) this.spinNext = { mini: !!m.mini };
    }
    // a white fog band drifting across the field
    fogDrift(hold) {
      if (this.fogBand) { this.tweens.killTweensOf(this.fogBand); this.fogBand.destroy(); this.fogBand = null; }
      const y = this.groundY - (PORTRAIT ? 220 : 200), f = this.fogBand = this.add.image(-W * 0.4, y, 'glow').setDisplaySize(W * 1.1, 260).setTint(0xffffff).setAlpha(0).setDepth(18);
      this.tweens.add({ targets: f, alpha: 0.25, duration: 400 });
      this.tweens.add({ targets: f, x: W * 1.4, duration: hold ? 9000 : 2600, ease: 'Sine.inOut', repeat: hold ? -1 : 0, onComplete: () => { if (this.fogBand === f) this.fogBand = null; f.destroy(); } });
    }
    // the Compass turn: which card goes to which place, and the LUCKY one (an attack card the player can still use)
    startSpin(sp) {
      const P = this.hero, n = this.moves.length;
      const usable = m => !(m.uses && (P.used[m.k] || 0) >= m.uses) && !(P.beamed || []).includes(m.k);
      const atk = this.moves.map((m, i) => i).filter(i => this.moves[i].dmg && usable(this.moves[i]));
      if (n < 2 || !atk.length) return;
      const L = atk[rnd(0, atk.length - 1)], order = this.moves.map((m, i) => i);
      if (this.easy) { /* nothing moves on EASY (owner's decision): the LUCKY card is a gift */ }
      else if (this.hard && !sp.mini && n >= 3) {
        // HARD: every card may move, at least 3 change place, the LUCKY card among them
        for (let t = 0; t < 60; t++) {
          const o = order.slice(); for (let i = n - 1; i > 0; i--) { const j = rnd(0, i); [o[i], o[j]] = [o[j], o[i]]; }
          if (o[L] !== L && o.filter((v, i) => v !== i).length >= Math.min(3, n)) { o.forEach((v, i) => order[i] = v); break; }
        }
        if (order[L] === L) { const X = (L + 1) % n; [order[L], order[X]] = [order[X], order[L]]; }
      } else { let X = rnd(0, n - 2); if (X >= L) X++; [order[L], order[X]] = [order[X], order[L]]; }
      this.spin = { order, lucky: L, glow: true, mini: !!sp.mini };
      this.applySpin(true);
      this.log(this.easy ? 'A LUCKY CURRENT! One card does +5!' : 'The cards drift on the current... find the LUCKY one!');
    }
    applySpin(anim) {
      const sp = this.spin; if (!sp || !this.rects) return;
      A.whirr && anim && A.whirr();
      this.fogDrift(true);
      const dur = this.hard ? 350 : 450;
      this.moves.forEach((m, i) => {
        const r = this.rects[sp.order[i]], c = m.card; if (!r || !c) return;
        c.setSpin(sp.order[i] !== i, i === sp.lucky, sp.glow);
        if (anim) this.tweens.add({ targets: c, x: r.x, y: r.y, duration: dur, ease: 'Sine.inOut' }); else c.setPosition(r.x, r.y);
      });
      // HARD: the glow shows during the slide and 1 s after, then only the compass badge stays
      if (this.hard && sp.glow) this.time.delayedCall((anim ? dur : 0) + 1000, () => { if (this.spin === sp) { sp.glow = false; this.moves.forEach((m, i) => m.card.setSpin(sp.order[i] !== i, i === sp.lucky, false)); } });
    }
    unspin(anim) {
      if (this.fogBand) { const f = this.fogBand; this.fogBand = null; this.tweens.killTweensOf(f); this.tweens.add({ targets: f, alpha: 0, duration: 400, onComplete: () => f.destroy() }); }
      if (!this.spin) return;
      this.spin = null;
      this.moves.forEach((m, i) => {
        const r = this.rects[i], c = m.card; if (!r || !c) return;
        c.setSpin(false, false, false);
        if (anim) this.tweens.add({ targets: c, x: r.x, y: r.y, duration: 300, ease: 'Sine.inOut' }); else c.setPosition(r.x, r.y);
      });
    }
    // ---- v1.0 PEEKABOO! (docs/gdd/1.0-veggie.md section 4): the rival hides in one of 2-4 mounds (Brock Lee: behind broccoli trees)
    async hide(m, T) {
      A.dig && A.dig();
      this.popWord(T.center().x, T.center().y - 260, 'DIG DIG!', '#d8b07a', 76, -6);
      this.dust.explode(30, T.root.x, this.groundY);
      await tw(this, { targets: T.squash, y: 120, alpha: 0, duration: 450, ease: 'Quad.in' });
      const n = m.mini ? 2 : this.easy ? 2 : m.forest && this.hard ? 4 : 3;
      this.hidden = { k: this.rmoves.indexOf(m), n, right: rnd(0, n - 1), worm: !this.hard }; // worm = the HARD decoy was used (or never comes)
      this.showHidden(false);
      if (m.sound) this.sfx(m.sound);
      this.log(this.logT.text + ' Tap the ' + (m.forest ? 'tree' : 'mound') + ' where ' + (this.R.plural ? 'they hide!' : 'he hides!'));
      await wait(this, 900);
    }
    // the mounds (or trees) with their tap zones; instant = coming back after a rotation (no pop-up, the worm does not repeat)
    showHidden(instant) {
      const Hd = this.hidden, T = this.rival, m = this.rmoves[Hd.k] || {};
      this.clearMounds();
      T.squash.setAlpha(0); T.squash.y = 120;
      if (T.bar && T.bar.c) T.bar.c.setAlpha(0.55);
      if (m.forest) this.logBack(true);
      this.hideChip = chip(this, W * 0.73, (PORTRAIT ? 200 : 150) + (PORTRAIT ? 70 : 76), '?', 0xd8b07a, 34).setDepth(30);
      const xs = { 2: [0.55, 0.82], 3: [0.5, 0.68, 0.86], 4: [0.46, 0.6, 0.74, 0.88] }[Hd.n], gy = this.groundY;
      const tree = !!m.forest, zw = Math.max(150, W * 0.13), cardsTop = Math.min(...this.rects.map(r => r.y - r.h / 2));
      this.mounds = xs.map((fx, i) => {
        const c = this.add.container(W * fx, gy).setDepth(15);
        const art = tree ? this.add.image(0, 0, 'broccoli').setOrigin(0.5, 1) : this.add.image(0, 0, 'mound').setOrigin(0.5, 1);
        const gapW = W * (xs[1] - xs[0]) - 10; // neighbours never overlap
        art.setScale(tree ? Math.min(Math.min(T.spr.displayHeight * 0.75, 300) / art.height, gapW / art.width) : Math.min(140, gapW) / art.width);
        const top = -art.displayHeight;
        const pil = this.add.image(tree ? art.displayWidth * 0.35 : 0, top + 40, 'pillow').setScale(0.38).setAngle(-20).setVisible(i === Hd.right);
        c.add([pil, art]); c.pil = pil; c.top = top; c.art = art;
        // the tap zone: 150 x 220+, grown upwards so it never reaches the cards
        const bot = Math.min(40, cardsTop - gy - 4), zh = Math.max(220, bot - (top - 60));
        const z = this.add.zone(0, bot - zh / 2, zw, zh).setInteractive({ useHandCursor: true }); c.add(z);
        z.on('pointerdown', () => { if (this.busy || this.over) return; this.tweens.add({ targets: c, scaleY: 0.88, scaleX: 1.06, duration: 70 }); });
        const up = () => this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 160, ease: 'Back.out' });
        z.on('pointerout', up);
        z.on('pointerup', () => { up(); this.seek(i); });
        if (!instant) { c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 300, delay: i * 90, ease: 'Back.out' }); }
        return c;
      });
      if (!instant) A.pop && A.pop();
      this.startTells(instant);
    }
    clearMounds() {
      (this.mounds || []).forEach(c => { this.tweens.killTweensOf(c); c.destroy(); }); this.mounds = null;
      if (this.hideChip) { this.hideChip.destroy(); this.hideChip = null; }
      this.logBack(false);
    }
    // the tell: the pillow corner peeks out of the right mound (EASY: all the time, with a sparkle). HARD: once, a worm pops out of a wrong one
    startTells(instant) {
      this.stopTells();
      const Hd = this.hidden, R = this.mounds[Hd.right], pil = R.pil, out = R.top - 30, inn = R.top + 40;
      const first = !(Save.data.stats || {}).seekSeen;
      const peek = (ms) => { this.tweens.killTweensOf(pil); pil.y = inn; this.tweens.add({ targets: pil, y: out, duration: 140, ease: 'Back.out', hold: ms, yoyo: true }); A.giggle && !this.hard && A.giggle(); this.tweens.add({ targets: R.art, angle: { from: -4, to: 4 }, duration: 80, yoyo: true, repeat: 2, onComplete: () => R.art.setAngle(0) }); };
      this.tellEvs = [];
      if (this.easy) { pil.y = out; this.tellEvs.push(this.time.addEvent({ delay: 500, loop: true, callback: () => this.sparks.explode(4, R.x + pil.x, R.y + out) })); }
      else {
        const T0 = this.hard ? 900 : 500, every = this.hard ? 3000 : 2000, hold = this.hard ? 300 : 600;
        if (first) { pil.y = out; this.tellEvs.push(this.time.delayedCall(2000, () => { if (this.hidden === Hd) pil.y = inn; })); }
        this.tellEvs.push(this.time.delayedCall(first ? 2000 + T0 : T0, () => { if (this.hidden !== Hd) return; peek(hold); this.tellEvs.push(this.time.addEvent({ delay: every, loop: true, callback: () => this.hidden === Hd && peek(hold) })); }));
        if (this.hard && !Hd.worm) this.tellEvs.push(this.time.delayedCall(1500, () => {
          if (this.hidden !== Hd) return; Hd.worm = true;
          const wi = [...Array(Hd.n).keys()].filter(i => i !== Hd.right)[rnd(0, Hd.n - 2)], M = this.mounds[wi];
          const wm = this.add.image(0, M.top + 30, 'worm').setScale(iconScale('worm', 110)); M.addAt(wm, 0); A.squeak && A.squeak();
          this.tweens.add({ targets: wm, y: M.top - 50, duration: 220, ease: 'Back.out', hold: 900, yoyo: true, onComplete: () => wm.destroy() });
          this.popWord(M.x, this.groundY + M.top - 140, 'Not me! I\'m just a worm!', '#ffd6e8', 44, 4);
        }));
      }
      if (first) {
        // the first seek ever: a hand points at the right mound
        const hd = this.seekHand = img(this, R.x, this.groundY + out - 150, 'hand').setScale(iconScale('hand', 100)).setDepth(36);
        this.tweens.add({ targets: hd, y: hd.y + 30, duration: 400, yoyo: true, repeat: -1 });
        if (!instant) this.log('Look for the pillow! Tap that mound!');
      }
    }
    stopTells() { (this.tellEvs || []).forEach(e => e.remove(false)); this.tellEvs = []; if (this.seekHand) { this.seekHand.destroy(); this.seekHand = null; } }
    seekSeen() { const st = Save.data.stats || (Save.data.stats = {}); if (!st.seekSeen) { st.seekSeen = 1; Save.store(); } }
    // the rival pops back out of the right mound (and the mounds go away)
    async unhide(anim) {
      const T = this.rival, Hd = this.hidden; if (!Hd) return;
      this.stopTells(); this.hidden = null;
      const M = this.mounds && this.mounds[Hd.right];
      if (M && anim) { this.popWord(M.x, this.groundY - 260, 'POP!', '#fff3d2', 70, 6); A.pop && A.pop(); }
      this.clearMounds();
      if (T.bar && T.bar.c) T.bar.c.setAlpha(1);
      if (anim) await tw(this, { targets: T.squash, y: 0, alpha: 1, duration: 300, ease: 'Back.out' }); else { T.squash.y = 0; T.squash.setAlpha(1); }
      this.setCards(false);
    }
    // a wrong mound, or a heal during the hide: PEEKABOO! the rival pops out and lands the sneak tickle
    async sneak() {
      const T = this.rival, P = this.hero, m = this.rmoves[this.hidden.k] || {}, d = m.dmg ? rnd(m.dmg[0], m.dmg[1]) : 12;
      await this.unhide(true);
      if (this.easy) { this.log(T.name + (this.R.plural ? ' pop' : ' pops') + ' out of the soil. Peekaboo!'); await wait(this, 500); return; } // EASY: no sneak damage ever
      this.popWord(P.center().x, P.center().y - 260, 'PEEKABOO!', '#ff9ed8', 84, -6); A.peekaboo && A.peekaboo();
      this.log(m.forest ? 'PEEKABOO! Trees can\'t hide... but I can!' : 'PEEKABOO! ' + T.name + ' sneaks up on ' + P.name + '!');
      await this.tickleRun(T, P, d);
    }
    // the player taps mound i
    async seek(i) {
      const Hd = this.hidden; if (!Hd || this.busy || this.over || !this.mounds) return;
      const M = this.mounds[i], T = this.rival, P = this.hero, m = this.rmoves[Hd.k] || {};
      if (i !== Hd.right && this.easy) { // EASY: a wrong mound costs nothing, tap again
        A.nope && A.nope(); A.bounce(); this.popWord(M.x, this.groundY + M.top - 120, 'Nope! Try again!', '#ffd6e8', 52, -4);
        this.tweens.add({ targets: M, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => M.setAngle(0) }); return;
      }
      this.busy = true; this.acted = true; this.setCards(false); this.stopTells(); this.seekSeen();
      if (i !== Hd.right) {
        A.nope && A.nope(); this.popWord(M.x, this.groundY + M.top - 120, 'NOPE!', '#ffd6e8', 70, -4);
        await tw(this, { targets: M, scaleY: 1.2, duration: 160, yoyo: true });
        await this.sneak();
        if (this.checkEnd()) return;
        await this.afterPlayer(); return;
      }
      // FOUND YOU!: a pillow bonk on the mound, the rival pops out giggling and dizzy
      emit('found', {}, this);
      const spot = { center: () => ({ x: M.x, y: this.groundY + M.top / 2 }) };
      await this.lunge(P, 60); await this.throwThing(P, spot, 'pillow'); this.back(P);
      this.popWord(M.x, this.groundY + M.top - 160, 'FOUND YOU!', '#7fe39a', 84, -6);
      await this.unhide(true);
      this.log(m.forest ? 'FOUND YOU! ...Fine, I\'m a veggie.' : 'FOUND YOU! ' + T.name + (this.R.plural ? ' giggle and are' : ' giggles and is') + ' all dizzy!');
      await this.impact(T, 15);
      if (this.checkEnd()) return;
      T.dizzy = true; this.setStatus(T); A.dizzy();
      await wait(this, 600);
      await this.afterPlayer();
    }
    // ?debug: __psHide = 'found' | 'miss' resolves the next seek after 300 ms (tests run at 2-3 fps, too slow for the tells)
    autoSeek() {
      const Hd = this.hidden, how = DEBUG && window.__psHide;
      if (!Hd || !how) return;
      this.time.delayedCall(300, () => { if (this.hidden === Hd) this.seek(how === 'found' ? Hd.right : (Hd.right + 1) % Hd.n); });
    }
    // ---- v1.1 COPYCAT! (docs/gdd/1.1-countryballs.md section 4): a paint splat, the ball turns mint ("JACKBALL!") and copies
    // the player's next move on his next turn with the same numbers. Nap and dance flop; EASY: every hit or heal copy flops
    rivalTint() { const T = this.rival; if (!T) return; if (this.copy) T.spr.setTint(C.mint); else if (T.charging && T.charging.type === 'launch') T.spr.setTint(0xffd2b0); }
    async copyArm(m, T, P, d) {
      this.sfx(m.sound || 'paint'); buzz(40);
      const c = T.center();
      this.popWord(c.x, c.y - 280, m.word || 'COPYCAT!', '#7fd6c2', 84, -6);
      this.tweens.add({ targets: T.squash, scaleX: 1.12, scaleY: 0.9, duration: 140, yoyo: true, repeat: 1 });
      T.spr.setTint(C.mint);
      await wait(this, 450);
      await this.throwThing(T, P, 'dot', 360, C.mint);
      const pc = P.center(), sp = this.add.particles(pc.x, pc.y, 'dot', { emitting: false, speed: { min: 200, max: 600 }, lifespan: 600, scale: { start: 0.5, end: 0 }, tint: [C.mint, 0xbff5e8, 0xffffff] }).setDepth(26);
      sp.explode(24); this.time.delayedCall(900, () => sp.destroy());
      await this.impact(P, d, 'spray');
      this.popWord(c.x, c.y - 300, 'JACKBALL!', '#7fd6c2', 76, 6);
      this.copy = { k: this.rmoves.indexOf(m), mini: !!m.mini };
      this.copyFx(true);
      this.log('JACKBALL! ' + T.name + ' paints himself like Jack and copies your next move!' + (!(Save.data.stats || {}).copySeen && this.copyHand ? ' Try the nap!' : ''));
      await wait(this, 700);
    }
    // armed: the mint tint, the COPYCAT chip under his pep bar and (the very first time) a hand on the nap card; off: all gone
    copyFx(on) {
      const T = this.rival; if (!T) return;
      if (this.copyChip) { this.copyChip.destroy(); this.copyChip = null; }
      if (this.copyHand) { this.copyHand.destroy(); this.copyHand = null; }
      if (!on) { if (!T.charging && !T.asleep) T.spr.clearTint(); return; }
      T.spr.setTint(C.mint);
      const hy = PORTRAIT ? 200 : 150, cc = this.copyChip = chip(this, W * 0.73, hy + (PORTRAIT ? 70 : 76), '      COPYCAT', C.mint, 28).setDepth(30);
      cc.add(img(this, -cc.w / 2 + 40, 0, 'j:cool').setScale(iconScale('j:cool', 46)));
      this.tweens.add({ targets: cc, scale: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      if (!(Save.data.stats || {}).copySeen) {
        const P = this.hero, ok = m => !(m.uses && (P.used[m.k] || 0) >= m.uses) && !(P.beamed || []).includes(m.k);
        const t = this.moves.find(m => m.type === 'nap' && ok(m)) || this.moves.find(m => m.type === 'dance' && ok(m));
        if (t && t.card) {
          // inside the nap card, over its icon (above the card it would cover the strip of the card above)
          // (small, beside the icon and above the strip: the title and the strip text stay readable, QA B74)
          const cd = t.card, v = cd.width < 400 && cd.height >= 150, hd = this.copyHand = img(this, cd.x + (v ? 62 : -cd.width / 2 + 66), cd.y - cd.height * (v ? 0.34 : 0.24), 'hand').setScale(iconScale('hand', 64)).setDepth(36);
          this.tweens.add({ targets: hd, y: hd.y + 16, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
      }
    }
    // what the copy of a card will do (the strip on the card)
    copyLabel(m) {
      if (m.type === 'nap' || m.type === 'dance' || m.type === 'dizzy') return 'COPY: flops!';
      if (m.type === 'shield') return 'COPY: shield';
      if (m.type === 'heal') return this.easy ? 'COPY: flops!' : 'COPY: heals him';
      if (!m.dmg || this.easy) return 'COPY: flops!';
      // the numbers impact() will record for the hero's next move: booster per hit, the one-time bonuses and his shield on the first hit, the dream bubble
      const n = m.type === 'multi' ? m.hits || 3 : 1, R = this.rival, H = this.hero, mini = this.copy && this.copy.mini;
      const sum = d => { let t = 0; for (let i = 0; i < n; i++) {
        let v = d + (H.bonus || 0) + (i ? 0 : (H.firstBonus || 0) + (H.lucky5 || 0));
        if (R.asleep) v = Math.ceil(v / 2); if (R.shield && !i) v = Math.ceil(v / 2);
        t += mini ? Math.max(1, Math.round(v / 2)) : v; } return t; };
      const lo = sum(m.dmg[0]), hi = sum(m.dmg[1]);
      return 'COPY: ' + (lo === hi ? lo : lo + '-' + hi) + ' at you';
    }
    // EASY: every copy flops, so the strongest card is the best one
    bestCopyCard() {
      const val = m => m.dmg ? m.dmg[1] * (m.type === 'multi' ? m.hits || 3 : 1) : 0;
      const ok = this.moves.filter(m => m.card && m.card.enabled);
      return ok.filter(m => m.dmg).sort((a, b) => val(b) - val(a))[0] || ok.find(m => m.type === 'nap' || m.type === 'dance') || null;
    }
    // the rival's copy turn
    async copyMove(T) {
      const cp = this.copy, r = cp.rec, P = this.hero, c = T.center();
      this.copy = null; this.copyFx(false); T.afterCharge = true; T.lastType = 'copy'; // a copy counts as a charge: no charge or copy right after
      const pm = r && this.moves.find(x => x.k === r.k);
      const flop = async (word, line) => {
        this.popWord(c.x, c.y - 260, word, '#9ff0b4', 80, 6); this.log(line);
        await tw(this, { targets: T.squash, angle: { from: -14, to: 14 }, duration: 160, yoyo: true, repeat: 2, onComplete: () => T.squash.setAngle(0) });
        await wait(this, 500);
      };
      if (!pm) { await flop('HUH?', T.name + ' has nothing to copy. The paint dries.'); return; }
      if (pm.type === 'nap') {
        // Upside-Down Nap: balls can't nap upside down! He rolls over and wobbles, the turn is gone
        emit('copyflop', { how: 'nap' }, this); A.bounce();
        this.log('Balls can\'t nap upside down! ' + T.name + ' rolls over and wobbles.');
        await tw(this, { targets: T.squash, angle: 180, y: -T.height(), duration: 380, ease: 'Back.out' });
        this.popWord(c.x, c.y - 280, 'WOBBLE!', '#9ff0b4', 80, 6);
        await tw(this, { targets: T.squash, angle: 196, duration: 120, yoyo: true, repeat: 2 });
        await tw(this, { targets: T.squash, angle: 360, y: 0, duration: 380, ease: 'Back.out' }); T.squash.setAngle(0);
        await wait(this, 500); return;
      }
      if (pm.type === 'shield') { await this.doMove({ type: 'shield', log: '{a} copies the shield! Next hit only does half!' }, T, P); return; }
      if (pm.type !== 'heal' && !pm.dmg) { await flop('FLOP!', T.name + ' can\'t copy that one. The copy flops!'); return; }
      if (this.easy) {
        // EASY: the paint is still wet, he slips (0 damage)
        await this.lunge(T, 80); this.sfx('paint');
        await tw(this, { targets: T.squash, angle: -70 * T.dir, duration: 220, ease: 'Quad.in' });
        this.popWord(c.x - 100, c.y - 200, 'SPLAT!', '#9ff0b4', 84, -6);
        this.log('The paint is still wet! ' + T.name + ' slips!');
        await wait(this, 600);
        await tw(this, { targets: T.squash, angle: 0, duration: 260, ease: 'Back.out' }); await this.back(T);
        return;
      }
      this.popWord(c.x, c.y - 280, 'COPYCAT!', '#7fd6c2', 84, -6);
      if (pm.type === 'heal') { await this.doMove(Object.assign({}, pm, { amt: r.amt || pm.amt || 20, log: '{a} copies ' + pm.title + '! Yum!' }), T, P); return; }
      // a hit: the same move back with the numbers the player saw (Mini Copycat: half); a copied Inferno Rain is a plain volley
      const hits = r.hits.map(v => cp.mini ? Math.max(1, Math.round(v / 2)) : v), tot = hits.reduce((a, b) => a + b, 0);
      if (!tot) { await flop('FLOP!', 'Nothing got through, so there is nothing to copy!'); return; }
      const m2 = Object.assign({}, pm, { dmg: [tot, tot], seq: pm.type === 'multi' ? hits : null, log: '{a} copies ' + pm.title + '!' + (cp.mini ? ' A mini copy: half as strong.' : '') });
      if (pm.type === 'rain') Object.assign(m2, { type: 'volley', tex: 'comet', word: 'COPY RAIN!', sound: 'fire' });
      await this.doMove(m2, T, P);
    }
    // ---- v1.1 PUSH! (section 4b): not pushed, the rocket sputters and Poland falls on the hero
    async launchFall(m, att, def, d) {
      const c = att.center();
      this.sfx('fizzle'); this.popWord(c.x, c.y - 260, 'FIZZLE...', '#ffb36b', 80, -6);
      this.log(att.name + '\'s rocket sputters...');
      if (this.rocketImg) this.tweens.add({ targets: this.rocketImg, angle: { from: -60, to: -30 }, duration: 90, yoyo: true, repeat: 4 });
      await tw(this, { targets: att.root, y: this.groundY - 240, duration: 450, ease: 'Quad.out' });
      this.endCharge(att);
      await tw(this, { targets: att.root, x: def.root.x, y: def.root.y - def.height() * 0.6, duration: 420, ease: 'Quad.in' });
      this.tweens.add({ targets: def.squash, scaleX: 1.3, scaleY: 0.65, duration: 120, yoyo: true });
      await this.impact(def, d, 'roar');
      A.bounce(); this.popWord(def.center().x, def.center().y - 260, 'PLOP!', '#fff3d2', 90, 8);
      this.log('Fizzle... PLOP! "Cannot into space... YET!"');
      await tw(this, { targets: att.root, x: att.home, y: this.groundY - 200, duration: 320, ease: 'Quad.out' });
      await tw(this, { targets: att.root, y: this.groundY, duration: 240, ease: 'Bounce.out' });
    }
    // PUSH! costs the turn. Full push: he zooms into space (orbit turn next). HARD off the GO!: a little push, he floats down
    async playerPush() {
      const T = this.rival, m = T.charging;
      if (this.busy || this.over || !m || m.type !== 'launch') return;
      const auto = DEBUG && window.__psPush, full = auto === 'soft' ? false : auto === 'go' ? true : !this.hard || (this.pushDownGo != null ? this.pushDownGo : this.pushGo());
      this.busy = true; this.acted = true; this.setCards(false); this.unspin(true);
      this.pushDownGo = null;
      const st = Save.data.stats || (Save.data.stats = {}); st.pushSeen = 1;
      emit('push', { full }, this);
      const P = this.hero, c = T.center(); buzz(40); A.whoosh();
      await tw(this, { targets: P.root, x: T.root.x - (PORTRAIT ? 250 : 300), duration: 280, ease: 'Quad.in' });
      this.tweens.add({ targets: P.squash, scaleX: 1.15, scaleY: 0.9, duration: 120, yoyo: true });
      this.popWord(c.x - 80, c.y - 220, 'PUSH!', '#ff8a3d', 96, -8);
      this.back(P);
      if (full) {
        A.levelUp();
        const trail = this.add.particles(0, 0, 'dot', { follow: T.root, frequency: 25, lifespan: 600, scale: { start: 0.5, end: 0 }, tint: [0xffd23f, 0xff8a3d, 0xffffff], blendMode: 'ADD', speed: 60 }).setDepth(9);
        await tw(this, { targets: T.root, y: -T.height() - 300, duration: 900, ease: 'Quad.in' });
        trail.stop(); this.time.delayedCall(700, () => trail.destroy());
        this.endCharge(T); T.afterCharge = true; T.orbit = true;
        this.popWord(W / 2, PORTRAIT ? H * 0.3 : H * 0.3, T.name.toUpperCase() + ' CAN INTO SPACE!', '#ffd23f', 96, -4);
        this.confetti.explode(70, W / 2, H * 0.5);
        this.log(P.name + ' gives the rocket a big PUSH! ' + T.name + ' can into space!');
        await wait(this, 1300);
      } else {
        A.bounce();
        await tw(this, { targets: T.root, y: this.groundY - 180, duration: 380, ease: 'Quad.out' });
        this.endCharge(T); T.afterCharge = true;
        await tw(this, { targets: T.root, y: this.groundY, duration: 900, ease: 'Sine.inOut' });
        this.log('A little push! ' + T.name + ' hops up and floats back down. Push on GO! to send him to space!');
        await wait(this, 500);
      }
      await this.afterPlayer();
    }
    // the turn after a full push: he waves from orbit, drops a Space Pierogi (+10 pep, EASY +15), floats down on a pierogi parachute
    async orbitTurn(T) {
      T.orbit = false;
      const P = this.hero, n = this.easy ? 15 : 10, px = W * 0.72, py = PORTRAIT ? 540 : 470; // a small planet up top, under the pep bars and the COPYCAT chip row
      const pl = this.add.image(px, py, 'planet').setScale(0).setDepth(8).setTint(0xc9b6ff);
      await tw(this, { targets: pl, scale: iconScale('planet', 170), duration: 400, ease: 'Back.out' });
      T.shadow.setVisible(false); T.root.setPosition(px + 110, py - 30).setScale(0.4);
      await tw(this, { targets: T.root, y: py - 70, duration: 300, ease: 'Back.out' });
      this.tweens.add({ targets: T.root, angle: { from: -12, to: 12 }, duration: 220, yoyo: true, repeat: 3, onComplete: () => T.root.setAngle(0) });
      this.popWord(px - 60, py + 150, 'HELLO FROM SPACE!', '#ffd23f', 64, -6); A.blip();
      await wait(this, 700);
      const pg = img(this, T.root.x, T.root.y, 'dumpling').setDepth(27).setScale(iconScale('dumpling', 70)), pc = P.center();
      await tw(this, { targets: pg, x: pc.x, y: pc.y, angle: 540, scale: iconScale('dumpling', 110), duration: 700, ease: 'Quad.in' });
      pg.destroy(); A.gulp(); this.heal(P, n);
      this.log(T.name + ' waves from orbit and drops a Space Pierogi! +' + n + ' pep for ' + P.name + '!');
      await wait(this, 800);
      const hgt = T.height(), wid = T.spr.displayWidth, cg = this.add.graphics();
      cg.lineStyle(4, 0xfff3d2, 0.9); cg.lineBetween(-70, -hgt - 40, -wid * 0.3, -hgt * 0.75); cg.lineBetween(70, -hgt - 40, wid * 0.3, -hgt * 0.75);
      const chute = img(this, 0, -hgt - 70, 'dumpling').setScale(iconScale('dumpling', 220));
      T.shadow.setVisible(true); T.root.add([cg, chute]); T.root.setScale(1).setAngle(0).setPosition(T.home, -120);
      this.tweens.add({ targets: pl, scale: 0, alpha: 0, duration: 400, onComplete: () => pl.destroy() });
      this.log(T.name + ' floats down on a pierogi parachute. Best day ever!');
      await tw(this, { targets: T.root, y: this.groundY, duration: 1500, ease: 'Sine.out' });
      this.tweens.add({ targets: [cg, chute], alpha: 0, duration: 300, onComplete: () => { cg.destroy(); chute.destroy(); } });
      await wait(this, 400);
    }
    // HARD: the PUSH! button counts 3, 2, 1, GO! in a 1.8 s loop; only a push on GO! (600 ms) sends him to space
    pushCount(on) {
      if (this.pushEv) { this.events.off('update', this.pushEv); this.pushEv = null; }
      const t = this.pushBtn && this.pushBtn.list[1]; if (!t || !t.active) return;
      if (!on) { t.setText('PUSH!'); return; }
      this.pushT0 = performance.now();
      const ev = this.pushEv = () => {
        if (!t.active) { this.events.off('update', ev); return; } // the scene was left (the scene object is reused)
        const lab = ['3', '2', '1', 'GO!'][Math.min(3, Math.floor(((performance.now() - this.pushT0) % 1800) / 400))];
        if (t.text !== lab) t.setText(lab);
      };
      this.events.on('update', ev);
    }
    pushGo() { return (performance.now() - (this.pushT0 || 0)) % 1800 >= 1200; }
    // ?debug: __psPush = 'go' | 'soft' (pushes 300 ms into the turn) | 'skip' (plays the first card instead)
    autoPush() {
      const T = this.rival, how = DEBUG && window.__psPush, ch = T.charging;
      if (!how || !ch || ch.type !== 'launch') return;
      this.time.delayedCall(300, () => {
        if (this.rival.charging !== ch || this.busy || this.over) return;
        if (how === 'skip') { const m = this.moves.find(x => x.card.enabled); if (m) this.playerMove(m.k); } else this.playerPush();
      });
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
      this.over = true; this.busy = true; this.setCards(false); this.unspin(false); this.spinNext = null;
      const P = this.hero, T = this.rival;
      if (T.charging) this.endCharge(T);
      if (this.copy) { this.copy = null; this.copyFx(false); }
      if (this.pushEv) this.pushCount(false);
      if (T.asleep) { T.asleep = false; this.sleepFx(T); }
      if (this.hidden) { this.stopTells(); this.hidden = null; this.clearMounds(); }
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
      // toy growth (v1.0): the hero toy (only the hero, never a rival toy) gets toy XP: win 10, boss 20, else 3, × the XP bonus;
      // a badge for each campaign rival or Kraken it beats. The player's XP is unchanged
      const ht = this.H && this.H.isToy && this.H.toy, toyNotes = [], toyFx = {};
      if (ht && Save.data.toys.includes(ht)) {
        const g = TOYS.addToyXp(ht, (won ? (R.boss ? 20 : 10) : 3) * (this.xpMul || 1));
        const badge = won && (isCampaign || this.mode === 'boss') && TOYS.BADGES[id] && !(ht.badges && ht.badges[id]);
        if (badge) ht.badges = Object.assign({}, ht.badges, { [id]: 1 });
        if (won && R.boss) Save.data.stats.toyBossWins = (Save.data.stats.toyBossWins || 0) + 1; // the Toy Champion sticker
        const l1 = (g.gain ? ht.name + ' +' + g.gain + ' toy XP' : '') + (badge ? (g.gain ? '  ·  ' : '') + 'New badge: ' + (R.nick || R.name) + '!' : '');
        if (l1) toyNotes.push(l1);
        if (g.note) toyNotes.push(g.note);
        toyFx.badge = badge; toyFx.up = g.to > g.from; toyFx.gold = g.to >= 4 && g.from < 4;
      }
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
      notes.push(...toyNotes);
      if (toyFx.badge) this.time.delayedCall(2200, () => A.starDing(0));
      if (toyFx.up) this.time.delayedCall(2600, () => { A.levelUp(); if (toyFx.gold) A.starDing(2); });
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
      // notes keep a readable size (QA B32 / #28): the panel makes room for them first. Portrait: it grows taller.
      // Landscape (no height to spare): it grows wider, the icon moves beside the title and the rest moves up.
      const NFS = 34, nTop = 700, ph0 = PORTRAIT ? 1230 : 1020, by0 = PORTRAIT ? 940 : 925;
      const measure = w => { if (!notes.length) return 0; const pr = txt(this, 0, 0, notes.join('\n'), NFS, '#ffd23f', { st: 6, wrap: w - 100 }), h = pr.height; pr.destroy(); return h; };
      // landscape: the panel widens whenever the notes do not fit, so the icon never moves beside a narrow title (code review)
      let pw = PORTRAIT ? 920 : 1000, need = measure(pw);
      if (!PORTRAIT && need > by0 - 70 - nTop) { pw = Math.min(W - 120, 1300); need = measure(pw); }
      let extra = Math.max(0, need - (by0 - 70 - nTop));
      const grow = Math.max(0, Math.min(extra, H - 60 - ph0)); extra -= grow;
      const lift = PORTRAIT ? 0 : Math.min(extra, 150);
      const ph = ph0 + grow, T0 = -ph / 2, Y = v => T0 + v - lift;
      const p = this.add.container(W / 2, H / 2).setDepth(61).setScale(fresh ? 0 : 1);
      p.add(panel(this, 0, 0, pw, ph, C.night2, 0));
      const icon = lift ? this.add.image(-pw / 2 + 150, Y(265), won ? 'trophy' : 'zzz').setScale(0.55) : this.add.image(0, T0 + 120, won ? 'trophy' : 'zzz').setScale(0.7);
      this.tweens.add({ targets: icon, y: icon.y - 12, angle: { from: -5, to: 5 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const title = txt(this, 0, Y(265), won ? 'YOU WIN!' : 'SO SLEEPY...', 100, won ? '#ffd23f' : '#bcc0ee', { stroke: '#0f1240', st: 14 });
      const sub = txt(this, 0, Y(345), won ? (R.laugh || '') : this.hero.name + ' needs a nap. Next time for sure!', 34, '#fff3d2', { st: 0, weight: '500', wrap: pw - 120 });
      p.add([icon, title, sub]);
      const sr = [];
      if (isCampaign) for (let i = 0; i < 3; i++) { const s = this.add.image((i - 1) * 120, Y(445) - (i === 1 ? 14 : 0), 'star').setScale(0.42).setTint(0x3a3f7a); p.add(s); sr.push(s); }
      const xpT = txt(this, 0, Y(545), '+0 XP', 60, '#7fe39a', { stroke: '#0f1240', st: 10 });
      const bw = Math.min(pw, 1000) - 220;
      const lvT = txt(this, -bw / 2, Y(610), 'LEVEL ' + before.l, 34, '#fff3d2', { ox: 0, st: 0 });
      const barBg = this.add.rectangle(0, Y(660), bw, 34, C.night3).setStrokeStyle(4, C.seam);
      const bar = this.add.rectangle(-bw / 2, Y(660), Math.max(4, bw * before.r / before.n), 26, C.star).setOrigin(0, 0.5);
      const note = txt(this, 0, Y(nTop), '', NFS, '#ffd23f', { st: 6, wrap: pw - 100, oy: 0 });
      p.add([xpT, lvT, barBg, bar, note]);
      const by = T0 + by0 + grow;
      // all notes stay above the buttons (QA B09); only the rare 6-note landscape case still shrinks a little
      let nfs = NFS;
      note.setText(notes.join('\n'));
      while (note.height > by - 70 - Y(nTop) && nfs > 24) { nfs -= 2; note.setFontSize(nfs); }
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
          this.sparks.explode(10, W / 2 + (i - 1) * 120, H / 2 + Y(445));
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

  // ---------- Comics: a short animated comic page the first time the player arrives in a world (#31, #62; docs/gdd/0.9-world-comics.md)
  // One script per comic: 3 panels (functions (scene, panel, instant) drawn with the scene helpers) + the title page.
  // Each panel function must also work with instant = true (fast taps, coming back after a rotation).
  const COMIC_OF_WORLD = ['hills', 'space', 'canada', 'ocean', 'veggie', 'countryballs', 'spooky'];
  const COMIC_SCRIPTS = {
    canada: {
      world: CANADA, title: 'CANADA!', len: [2700, 2500, 3500],
      confetti: { key: 'mapleleaf', speedY: { min: 250, max: 500 }, scale: { min: 0.15, max: 0.3 }, lifespan: 4000 },
      panels: [
        (s, c, instant) => {
          s.bg(c, 'sky4'); const au = s.bg(c, 'aurora'); au.setAlpha(0.8);
          for (let k = 0; k < 4; k++) { const p = s.actor(c, 'pine', 0.14 + k * 0.24, 0.98, 0.4, 0.2); p.setAlpha(0.8).setTint(0x9fb6d8); }
          const jack = s.actor(c, 'jack_side', instant ? 0.3 : -0.3, 0.95, 0.5);
          s.anim({ targets: jack, angle: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: -1 });
          if (!instant) s.anim({ targets: jack, x: (0.3 - 0.5) * c.r.w, duration: 700, ease: 'Quad.out' });
          s.caption(c, 'MEANWHILE, IN CANADA...', instant);
          const say = inst => s.bubble(c, 0.68, 0.36, 'Brrr! Why is the sky made of ice cream?', -1, inst);
          instant ? say(true) : s.at(900, say);
          if (!instant) { const sn = s.add.particles(0, 0, 'dot', { x: { min: -c.r.w / 2, max: c.r.w / 2 }, y: -c.r.h / 2, speedY: { min: 80, max: 160 }, lifespan: c.r.h / 160 * 1000, scale: { min: 0.1, max: 0.22 }, frequency: 120 }); c.add(sn); }
        },
        (s, c, instant) => {
          s.bg(c, 'sky4');
          const g = s.add.graphics(); g.fillStyle(0xf2f8ff); g.fillRect(-c.r.w / 2 + 5, c.r.h * 0.2, c.r.w - 10, c.r.h * 0.3 - 5); c.add(g);
          // head first in the snowbank: the upside-down Jack, the head half hidden by a snow mound, tail wagging
          const j = s.actor(c, 'jack_upside', 0.55, 0.88, 0.7);
          // the mound is sized from Jack, so his tail always sticks out (QA B57)
          const mh = Math.min(j.displayHeight * 0.55, 2 * (c.r.h * 0.48 - j.y));
          const snow = s.add.graphics(); snow.fillStyle(0xffffff); snow.fillEllipse(j.x, j.y, Math.max(j.displayWidth * 1.4, c.r.w * 0.4), mh); c.add(snow);
          s.anim({ targets: j, angle: { from: -6, to: 6 }, duration: 260, yoyo: true, repeat: -1 });
          const fw = inst => { s.burst(c, 0.22, 0.28, 'FWUMP!', PORTRAIT ? 72 : 60, inst); if (!inst) { A.stomp(); A.whoosh(); } };
          instant ? fw(true) : s.at(200, fw);
        },
        (s, c, instant) => {
          s.bg(c, 'sky4');
          const g = s.add.graphics(); g.fillStyle(0xf2f8ff); g.fillRect(-c.r.w / 2 + 5, c.r.h * 0.15, c.r.w - 10, c.r.h * 0.35 - 5); c.add(g);
          // B64: the pine and Sasquatch are kept inside the panel (they stuck out past the right screen edge in landscape)
          const pine = s.inside(c, s.actor(c, 'pine', 0.88, 0.72, 0.5).setAlpha(0.9));
          s.peekObj = s.inside(c, s.actor(c, 'sasquatch', 0.88, 0.7, 0.3).setVisible(false)); s.peekObj.x = Math.min(s.peekObj.x, pine.x);
          s.actor(c, 'moose', 0.7, 0.98, 0.42);
          s.actor(c, 'pancakes', 0.5, 0.8, 0.18);
          s.actor(c, 'jack_front', 0.24, 0.98, 0.5);
          // B58: narrow pines stay inside panel 1, snow melts before its bottom edge, Max's bubble points at Max
          const s1 = inst => s.bubble(c, 0.62, 0.2, 'Sorry, eh! Welcome to Canada!', 0.2, inst);
          const s2 = inst => s.bubble(c, 0.34, 0.42, 'Why are YOU sorry? I fell on YOUR snow!', -1, inst);
          if (instant) { s1(true); s2(true); } else { s.at(200, s1); s.at(1400, s2); }
        },
      ],
      // Sasquatch shows behind the pine and wobbles
      peek: s => { const o = s.peekObj; if (o) { o.setVisible(true); s.tweens.add({ targets: o, angle: { from: -8, to: 8 }, duration: 300, yoyo: true, repeat: -1 }); } },
    },
  };
  COMIC_SCRIPTS.space = {
    world: SPACE, title: 'SPACE!', len: [2900, 2900, 3500],
    confetti: { key: 'star', speedY: { min: 250, max: 450 }, scale: { min: 0.08, max: 0.16 }, lifespan: 4500 },
    panels: [
      // Jack rides a rocket in from the left; the Moon is somewhere
      (s, c, instant) => {
        s.bg(c, 'sky2');
        if (PORTRAIT) s.actor(c, 'planet', 0.58, 0.36, 0.26, 0.14).setTint(0xc9b6ff).setAlpha(0.85);
        else s.actor(c, 'planet', 0.12, 0.98, 0.34, 0.18).setTint(0xc9b6ff).setAlpha(0.85);
        const rx = PORTRAIT ? 0.24 : 0.42, rocket = s.actor(c, 'rocket', instant ? rx : rx - 0.6, 0.94, 0.3, 0.3).setAngle(25);
        const jack = s.actor(c, 'jack_side', instant ? rx : rx - 0.6, 0.5, 0.42, 0.34); jack.y = rocket.y - rocket.displayHeight * 0.55;
        s.anim({ targets: [rocket, jack], angle: { from: 22, to: 28 }, duration: 90, yoyo: true, repeat: -1 });
        if (!instant) {
          s.anim({ targets: [rocket, jack], x: (rx - 0.5) * c.r.w, duration: 800, ease: 'Quad.out' });
          const tr = s.add.particles(0, 0, 'dot', { follow: rocket, followOffset: { x: -rocket.displayWidth * 0.3, y: -rocket.displayHeight * 0.2 }, frequency: 40, lifespan: 500, scale: { start: 0.3, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xffd23f, 0xff8a3d, 0xffffff], speed: 20 });
          c.addAt(tr, c.list.indexOf(rocket));
          A.whoosh();
        }
        s.caption(c, 'MEANWHILE, IN SPACE...', instant);
        const say = inst => s.bubble(c, PORTRAIT ? 0.68 : 0.5, PORTRAIT ? 0.62 : 0.46, 'Next stop: the Moon! Which way is up?', -1, inst);
        instant ? say(true) : s.at(1000, say);
      },
      // a UFO beams Jack up (a soft teaser for the Mothership's beam)
      (s, c, instant) => {
        s.bg(c, 'sky2');
        const ufo = s.actor(c, 'ufo', 0.5, 0.3, 0.26, 0.34);
        const beam = s.add.graphics(), bt = ufo.y - ufo.displayHeight * 0.2, bb = c.r.h * 0.46, uw = ufo.displayWidth * 0.3, lw = Math.min(c.r.w * 0.42, ufo.displayWidth * 1.4);
        beam.fillStyle(0xc8ff3d, 0.28); beam.fillPoints([{ x: -uw, y: bt }, { x: uw, y: bt }, { x: lw, y: bb }, { x: -lw, y: bb }], true);
        beam.fillStyle(0xffffff, 0.18); beam.fillPoints([{ x: -uw * 0.4, y: bt }, { x: uw * 0.4, y: bt }, { x: lw * 0.4, y: bb }, { x: -lw * 0.4, y: bb }], true);
        c.addAt(beam, c.list.indexOf(ufo));
        s.anim({ targets: beam, alpha: { from: 1, to: 0.6 }, duration: 400, yoyo: true, repeat: -1 });
        const j = s.actor(c, 'jack_upside', 0.5, 0.97, 0.42, 0.34), up = j.y - c.r.h * 0.12;
        s.anim({ targets: j, angle: { from: -8, to: 8 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        if (instant) j.y = up; else s.anim({ targets: j, y: up, duration: 2200, ease: 'Sine.inOut' });
        const blip = inst => { s.burst(c, PORTRAIT ? 0.2 : 0.3, PORTRAIT ? 0.3 : 0.14, 'BLIP!', PORTRAIT ? 72 : 60, inst); if (!inst) A.beam(); };
        // B66: in portrait a narrower bubble right of the beam, clear of Jack and of the panel border
        const say = inst => s.bubble(c, PORTRAIT ? 0.8 : 0.5, PORTRAIT ? 0.6 : 0.48, 'Put me DOWN! ...Okay, this is fun.', -1, inst, PORTRAIT ? 340 : 0);
        if (instant) { blip(true); say(true); } else { s.at(200, blip); s.at(1300, say); }
      },
      // The Blips (and Robo-Bop behind them) come in peace, with pillows
      (s, c, instant) => {
        s.bg(c, 'sky2');
        s.strip(c, 0xa99ad8, 0.78, 1);
        s.actor(c, 'robot', 0.88, 0.86, 0.4, 0.22).setAlpha(0.95);
        s.actor(c, 'aliens', 0.7, 0.98, 0.42);
        s.actor(c, 'pillow', 0.52, 0.98, 0.14, 0.14).setAngle(-10);
        s.actor(c, 'jack_front', 0.24, 0.98, 0.5);
        const s1 = inst => { s.bubble(c, 0.62, 0.2, 'We come in peace! And with PILLOWS!', 0.2, inst); if (!inst) A.blip(); };
        const s2 = inst => s.bubble(c, 0.34, 0.42, 'Phew. I brought pillows too!', -1, inst);
        if (instant) { s1(true); s2(true); } else { s.at(200, s1); s.at(1500, s2); }
      },
    ],
    // the Mothership slides in at the top of panel 1 and hovers
    peek: s => {
      const c = s.panels[0]; if (!c) return;
      const m = s.actor(c, 'mothership', PORTRAIT ? 0.78 : 0.5, PORTRAIT ? 0.38 : 0.31, PORTRAIT ? 0.3 : 0.14, PORTRAIT ? 0.3 : 0.5), y = m.y;
      c.moveDown(m); // under the panel border
      m.y = y - c.r.h * 0.15; m.setAlpha(0);
      s.tweens.add({ targets: m, y, alpha: 1, duration: 700, ease: 'Back.out', onComplete: () => s.tweens.add({ targets: m, y: y - 14, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' }) });
    },
  };
  COMIC_SCRIPTS.hills = {
    world: 0, title: 'PILLOW HILLS!', len: [2700, 2500, 3500],
    confetti: { key: 'feather', speedY: { min: 200, max: 400 }, scale: { min: 0.35, max: 0.6 }, lifespan: 5000 },
    panels: [
      // Jack naps upside down under the moon (Professor Hoot hides behind it)
      (s, c, instant) => {
        s.bg(c, 'sky');
        const mf = PORTRAIT ? [0.88, 0.5, 0.4, 0.16] : [0.76, 0.34, 0.18, 0.32];
        const owl = s.actor(c, 'owl', mf[0], mf[1], mf[2] * 0.8, mf[3] * 0.8).setVisible(false);
        const moon = s.actor(c, 'moon', ...mf); owl.y = moon.y - moon.displayHeight * 0.08; s.peekObj = owl; s.peekDX = -moon.displayWidth * 0.6;
        const jack = s.actor(c, 'jack_upside', PORTRAIT ? 0.34 : 0.5, 0.97, PORTRAIT ? 0.62 : 0.34, PORTRAIT ? 0.3 : 0.5);
        s.anim({ targets: jack, angle: { from: -4, to: 4 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        // B67: the head is at the bottom left of jack_upside.png, so the Zzz starts next to it (not at the feet)
        const z = s.actor(c, 'zzz', 0, 0, 0.16, 0.12); z.x = jack.x - jack.displayWidth * 0.5 - z.displayWidth * 0.3; z.y = jack.y - jack.displayHeight * 0.12;
        s.anim({ targets: z, y: z.y - c.r.h * 0.12, alpha: { from: 1, to: 0.2 }, duration: 1400, repeat: -1 });
        s.caption(c, 'MEANWHILE, IN THE PILLOW HILLS...', instant);
        if (!instant) s.at(300, () => A.snore());
        const say = inst => s.bubble(c, PORTRAIT ? 0.66 : 0.5, PORTRAIT ? 0.62 : 0.45, 'Zzz... dumplings... zzz...', -1, inst);
        instant ? say(true) : s.at(1000, say);
      },
      // BONK! a pillow out of nowhere, feathers everywhere
      (s, c, instant) => {
        s.bg(c, 'sky');
        const jack = s.actor(c, 'jack_side', PORTRAIT ? 0.62 : 0.55, PORTRAIT ? 0.97 : 0.9, PORTRAIT ? 0.62 : 0.35, PORTRAIT ? 0.3 : 0.55);
        const px = jack.x - jack.displayWidth * 0.5, py = jack.y - jack.displayHeight * 0.65;
        const pillow = s.actor(c, 'pillow', 0, 0, PORTRAIT ? 0.24 : 0.12, PORTRAIT ? 0.2 : 0.3); pillow.y = py + pillow.displayHeight / 2;
        if (instant) pillow.x = px - c.r.w * 0.06; else { pillow.x = -c.r.w * 0.6; s.anim({ targets: pillow, x: px, angle: 25, duration: 450, ease: 'Quad.in' }); A.whoosh(); }
        const hit = inst => {
          s.burst(c, PORTRAIT ? 0.2 : 0.3, PORTRAIT ? 0.3 : 0.2, 'BONK!', PORTRAIT ? 72 : 60, inst);
          if (inst) { jack.angle = 22; jack.x += c.r.w * 0.04; pillow.angle = -20; pillow.x = px - c.r.w * 0.06; return; }
          s.anim({ targets: jack, angle: 22, x: jack.x + c.r.w * 0.04, duration: 260, ease: 'Back.out' });
          s.anim({ targets: pillow, angle: -20, x: px - c.r.w * 0.06, duration: 320, ease: 'Quad.out' });
          const fe = s.add.particles(px, py, 'feather', { speed: { min: 150, max: 380 }, angle: { min: 0, max: 360 }, rotate: { min: 0, max: 360 }, scale: { min: 0.3, max: 0.55 }, lifespan: 1000, gravityY: 300, emitting: false });
          c.add(fe); fe.explode(14); A.poof();
        };
        instant ? hit(true) : s.at(450, hit);
      },
      // Timmy wants a pillow fight, Jack wants a nap
      (s, c, instant) => {
        s.bg(c, 'sky');
        s.strip(c, 0xfff3d2, 0.8, 1);
        s.actor(c, 'tiger', 0.74, 0.98, 0.5);
        s.actor(c, 'pillow', 0.56, 0.74, 0.16, 0.16).setAngle(-20);
        s.actor(c, 'jack_front', 0.24, 0.98, 0.5);
        const s1 = inst => s.bubble(c, 0.62, 0.2, 'Pillows at dawn, Jack!', 0.2, inst);
        const s2 = inst => s.bubble(c, 0.34, 0.42, 'It\'s not dawn. It\'s NAP time!', -1, inst);
        if (instant) { s1(true); s2(true); } else { s.at(200, s1); s.at(1400, s2); }
      },
    ],
    // Professor Hoot peeks out from behind the moon and wobbles
    peek: s => {
      const o = s.peekObj; if (!o) return;
      o.setVisible(true);
      s.tweens.add({ targets: o, x: o.x + (s.peekDX || 0), duration: 500, ease: 'Back.out', onComplete: () => s.tweens.add({ targets: o, angle: { from: -8, to: 8 }, duration: 300, yoyo: true, repeat: -1 }) });
    },
  };
  COMIC_SCRIPTS.spooky = {
    world: SPOOKY, title: 'SPOOKY!', len: [2700, 2900, 3500],
    confetti: { key: 'candy', speedY: { min: 120, max: 220 }, scale: { min: 0.12, max: 0.22 }, lifespan: Math.round(H / 120 * 1000) + 1000 },
    panels: [
      // Halloween night: pumpkins, an orange moon, a bat flaps by; Jack wonders about the hats
      (s, c, instant) => {
        s.bg(c, 'sky3');
        if (PORTRAIT) s.actor(c, 'moon', 0.88, 0.5, 0.4, 0.16).setTint(0xffa64d); else s.actor(c, 'moon', 0.8, 0.3, 0.16, 0.3).setTint(0xffa64d);
        s.actor(c, 'pumpkin', 0.1, 0.98, PORTRAIT ? 0.24 : 0.1, PORTRAIT ? 0.1 : 0.2);
        s.actor(c, 'pumpkin', PORTRAIT ? 0.52 : 0.86, 0.98, PORTRAIT ? 0.18 : 0.08, PORTRAIT ? 0.08 : 0.16);
        s.actor(c, 'jack_front', PORTRAIT ? 0.3 : 0.42, 0.98, PORTRAIT ? 0.55 : 0.3, PORTRAIT ? 0.45 : 0.5);
        const bx = PORTRAIT ? 0.62 : 0.25, by = PORTRAIT ? 0.3 : 0.4;
        const bat = s.actor(c, 'bat', instant ? bx : bx - 0.8, by, PORTRAIT ? 0.24 : 0.1, 0.18);
        s.anim({ targets: bat, scaleY: bat.scaleY * 0.6, duration: 140, yoyo: true, repeat: -1 });
        if (!instant) { s.anim({ targets: bat, x: (bx - 0.5) * c.r.w, duration: 1600, ease: 'Sine.out' }); A.whoosh(); }
        s.caption(c, 'MEANWHILE, ON HALLOWEEN NIGHT...', instant);
        const say = inst => s.bubble(c, PORTRAIT ? 0.68 : 0.5, PORTRAIT ? 0.64 : 0.52, 'Why does everyone have a cool hat?', -1, inst);
        instant ? say(true) : s.at(1000, say);
      },
      // EEEK! Batty and Jack hang upside down side by side
      (s, c, instant) => {
        s.bg(c, 'sky3');
        s.actor(c, 'web', 0.12, PORTRAIT ? 0.42 : 0.24, PORTRAIT ? 0.4 : 0.2, PORTRAIT ? 0.14 : 0.3).setAlpha(0.8);
        const line = s.add.graphics(); line.lineStyle(4, 0xe8e0ff, 0.8); c.add(line);
        // hanging from a line: the top of the picture is the pivot, so it sways like a pendulum
        const hang = (key, fx, fy, hf, wf, flip) => {
          const a = s.actor(c, key, fx, 0.5, hf, wf).setOrigin(0.5, 0).setFlipY(!!flip); a.y = (fy - 0.5) * c.r.h;
          line.lineBetween(a.x, -c.r.h / 2 + 5, a.x, a.y + 12);
          s.anim({ targets: a, angle: { from: -5, to: 5 }, duration: 900 + fx * 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          return a;
        };
        hang('jack_upside', PORTRAIT ? 0.34 : 0.3, 0.16, PORTRAIT ? 0.62 : 0.36, PORTRAIT ? 0.26 : 0.4);
        hang('bat', PORTRAIT ? 0.54 : 0.72, 0.16, PORTRAIT ? 0.38 : 0.2, PORTRAIT ? 0.16 : 0.3, true);
        const eek = inst => { s.burst(c, PORTRAIT ? 0.82 : 0.5, PORTRAIT ? 0.3 : 0.66, 'EEEK!', PORTRAIT ? 72 : 60, inst); if (!inst) A.tickle(); };
        const say = inst => s.bubble(c, PORTRAIT ? 0.76 : 0.5, PORTRAIT ? 0.72 : 0.86, 'Hey Jack, you nap like me!', -1, inst);
        if (instant) { eek(true); say(true); } else { s.at(200, eek); s.at(1200, say); }
      },
      // Pumpkin Pete with candy, Webster dangling, Count Fang hiding at the bottom
      (s, c, instant) => {
        s.bg(c, 'sky3');
        s.peekObj = s.actor(c, 'vampire', PORTRAIT ? 0.45 : 0.5, 0.98, PORTRAIT ? 0.32 : 0.18, PORTRAIT ? 0.14 : 0.3).setVisible(false);
        const line = s.add.graphics(); line.lineStyle(3, 0xe8e0ff, 0.8); c.add(line);
        const sp = s.actor(c, 'spider', PORTRAIT ? 0.95 : 0.86, 0.5, PORTRAIT ? 0.22 : 0.08, PORTRAIT ? 0.07 : 0.18).setOrigin(0.5, 0); sp.y = (0.04 - 0.5) * c.r.h;
        line.lineBetween(sp.x, -c.r.h / 2 + 5, sp.x, sp.y + 10);
        s.anim({ targets: sp, y: sp.y + c.r.h * 0.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        s.actor(c, 'pumpkin', 0.74, 0.98, 0.4);
        s.actor(c, 'lollipop', 0.58, 0.9, PORTRAIT ? 0.22 : 0.12, 0.1).setAngle(-15);
        s.actor(c, 'candy', 0.92, 0.98, PORTRAIT ? 0.16 : 0.07, 0.1);
        s.actor(c, 'jack_front', 0.24, 0.98, 0.5);
        const s1 = inst => s.bubble(c, PORTRAIT ? 0.58 : 0.62, PORTRAIT ? 0.2 : 0.27, 'Trick or treat... or PILLOW FIGHT!', 0.2, inst);
        const s2 = inst => s.bubble(c, 0.34, PORTRAIT ? 0.42 : 0.5, 'Can I pick ALL of them?', -1, inst);
        if (instant) { s1(true); s2(true); } else { s.at(200, s1); s.at(1400, s2); }
      },
    ],
    // Count Fang peeks up from the bottom of panel 3 and waves
    peek: s => {
      const o = s.peekObj; if (!o) return;
      const y = o.y; o.setVisible(true); o.y = y + o.displayHeight * 0.6; o.setAlpha(0);
      s.tweens.add({ targets: o, y, alpha: 1, duration: 600, ease: 'Back.out', onComplete: () => s.tweens.add({ targets: o, angle: { from: -10, to: 10 }, duration: 350, yoyo: true, repeat: -1 }) });
    },
    sting: s => s.time.delayedCall(1300, () => A.boo()),
  };
  // v1.0 Ocean "Foggy Business" (docs/gdd/1.0-ocean.md 6c): fog, a cheeky gull, the ship with Captain Fog; Thully's nightcap peeks out of the water
  COMIC_SCRIPTS.ocean = {
    world: OCEAN, title: 'OCEAN!', len: [2800, 2600, 3500],
    confetti: { key: 'bubbles', rise: true, speedY: { min: -320, max: -160 }, scale: { min: 0.12, max: 0.26 }, lifespan: Math.round(H / 160 * 1000) + 1500 },
    panels: [
      (s, c, instant) => {
        s.bg(c, 'sky5');
        const fog = s.actor(c, 'glow', 0.5, 0.75, 0.3, 1).setTint(0xffffff).setAlpha(0.3); s.anim({ targets: fog, x: fog.x + c.r.w * 0.1, duration: 3000, yoyo: true, repeat: -1 });
        // the lighthouse at the left edge, its beam sweeping
        const lx = -c.r.w / 2 + c.r.w * 0.08, ly = c.r.h / 2 - 10, th = c.r.h * 0.45, tw0 = Math.min(c.r.w * 0.07, 50), g = s.add.graphics();
        for (let k = 0; k < 5; k++) { g.fillStyle(k % 2 ? 0xffffff : 0xe2524a); g.fillRect(lx - tw0 / 2, ly - (k + 1) * th / 5, tw0, th / 5); }
        g.fillStyle(0xffe08a); g.fillCircle(lx, ly - th - 12, 14); c.add(g);
        const beam = s.add.graphics().setPosition(lx, ly - th - 12); beam.fillStyle(0xfff3b0, 0.25); beam.fillTriangle(0, 0, c.r.w * 0.35, -40, c.r.w * 0.35, 40); c.add(beam);
        s.anim({ targets: beam, angle: { from: -15, to: 15 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        const jack = s.actor(c, 'jack_side', instant ? 0.42 : -0.3, 0.92, 0.5, 0.36);
        s.anim({ targets: jack, angle: { from: -3, to: 3 }, duration: 90, yoyo: true, repeat: -1 });
        if (!instant) { s.anim({ targets: jack, x: (0.42 - 0.5) * c.r.w, duration: 800, ease: 'Quad.out' }); A.whirr && A.whirr(); }
        const cp = s.actor(c, 'compass', 0.74, 0.62, 0.2, 0.14); s.anim({ targets: cp, angle: 360, duration: 900, repeat: -1 });
        s.caption(c, 'MEANWHILE, IN THE FOGGY SEA...', instant);
        const say = inst => s.bubble(c, PORTRAIT ? 0.66 : 0.5, PORTRAIT ? 0.36 : 0.4, 'My compass is doing the Six-Seven!', -1, inst);
        instant ? say(true) : s.at(1000, say);
      },
      (s, c, instant) => {
        s.bg(c, 'sky5');
        const jack = s.actor(c, 'jack_front', 0.3, 0.98, 0.6, 0.3);
        const dx = jack.x + jack.displayWidth * 0.45, dy = jack.y - jack.displayHeight * 0.45;
        const dump = s.actor(c, 'dumpling', 0, 0, 0.14, 0.1); dump.x = dx; dump.y = dy + dump.displayHeight / 2;
        const gull = s.add.image(0, dy, 'icons', 'bird').setTint(0xffffff).setFlipX(true); gull.setScale(Math.min(0.26 * c.r.h / gull.height, 0.2 * c.r.w / gull.width)); c.add(gull);
        const gx = (0.7 - 0.5) * c.r.w, gy = -c.r.h * 0.18;
        const grab = inst => {
          s.burst(c, PORTRAIT ? 0.8 : 0.78, PORTRAIT ? 0.22 : 0.2, 'SQUAWK!', PORTRAIT ? 72 : 60, inst);
          if (inst) { gull.x = gx; gull.y = gy; dump.x = gx; dump.y = gy + gull.displayHeight * 0.3; }
          else {
            s.anim({ targets: [gull], x: gx, y: gy, duration: 500, ease: 'Quad.out' }); s.anim({ targets: [dump], x: gx, y: gy + gull.displayHeight * 0.3, duration: 500, ease: 'Quad.out' });
            const fe = s.add.particles(dx, dy, 'feather', { speed: { min: 120, max: 300 }, angle: { min: 0, max: 360 }, scale: { min: 0.25, max: 0.45 }, lifespan: 900, gravityY: 300, emitting: false }); c.add(fe); fe.explode(10);
            A.squawk && A.squawk(); A.whoosh();
          }
        };
        if (instant) grab(true); else { gull.x = dx; s.at(400, grab); }
        const say = inst => s.bubble(c, PORTRAIT ? 0.62 : 0.5, PORTRAIT ? 0.56 : 0.62, 'Mine now, matey!', 0.3, inst);
        instant ? say(true) : s.at(1300, say);
      },
      (s, c, instant) => {
        s.bg(c, 'sky5');
        s.strip(c, 0x2c8a8f, 0.8, 1);
        s.peekObj = s.actor(c, 'nightcap', PORTRAIT ? 0.5 : 0.52, 1.0, PORTRAIT ? 0.2 : 0.14, 0.14).setVisible(false);
        const ship = s.actor(c, 'ship', 0.8, 0.9, 0.62, 0.4).setTint(0xdfe6f5);
        s.anim({ targets: ship, angle: { from: -2, to: 2 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        s.actor(c, 'fogcap', 0.82, 0.48, 0.26, 0.18);
        s.actor(c, 'crab', 0.64, 0.66, 0.14, 0.1);
        s.actor(c, 'jack_front', 0.2, 0.98, 0.48, 0.26);
        const s1 = inst => s.bubble(c, 0.34, PORTRAIT ? 0.22 : 0.3, 'Is this a GHOST ship?', -1, inst);
        const s2 = inst => { s.bubble(c, 0.6, PORTRAIT ? 0.12 : 0.14, 'Nope! The crew is on a picnic.', 0.3, inst); if (!inst) A.honk(); };
        if (instant) { s1(true); s2(true); } else { s.at(200, s1); s.at(1400, s2); }
      },
    ],
    // Thully's nightcap rises out of the water in panel 3 and wobbles
    peek: s => {
      const o = s.peekObj; if (!o) return;
      const y = o.y; o.setVisible(true); o.y = y + o.displayHeight * 0.5; o.setAlpha(0);
      s.tweens.add({ targets: o, y, alpha: 1, duration: 700, ease: 'Back.out', onComplete: () => s.tweens.add({ targets: o, angle: { from: -8, to: 8 }, duration: 600, yoyo: true, repeat: -1 }) });
    },
    sting: s => s.time.delayedCall(1300, () => A.snore()),
  };
  // v1.0 Veggie Patch "Who Planted Jack?" (docs/gdd/1.0-veggie.md 6c): fireflies, PEEKABOO! from a mound, the Peas roll in; Brock Lee winks from behind the fence
  COMIC_SCRIPTS.veggie = {
    world: VEGGIE, title: 'VEGGIE PATCH!', len: [2700, 2600, 3500],
    confetti: { key: 'dot', tint: [0x8fd96b, 0x7fe36a, 0xb6f08c], speedY: { min: 200, max: 400 }, scale: { min: 0.12, max: 0.22 }, lifespan: 5000 },
    panels: [
      (s, c, instant) => {
        s.bg(c, 'sky6');
        const g = s.add.graphics(); g.fillStyle(0xb98a5a); const fy = c.r.h / 2 - 10;
        g.fillRect(-c.r.w / 2 + 5, fy - c.r.h * 0.12, c.r.w - 10, 10); g.fillRect(-c.r.w / 2 + 5, fy - c.r.h * 0.06, c.r.w - 10, 10);
        for (let x = -c.r.w / 2 + 20; x < c.r.w / 2 - 20; x += 70) g.fillRect(x, fy - c.r.h * 0.16, 16, c.r.h * 0.16);
        c.add(g);
        for (let i = 0; i < 10; i++) { const f = s.add.image((Math.random() - 0.5) * c.r.w * 0.85, (Math.random() - 0.6) * c.r.h * 0.7, 'dot').setScale(0.12).setTint(0xd8ff6a); c.add(f); s.anim({ targets: f, alpha: { from: 1, to: 0.2 }, duration: 600 + i * 70, yoyo: true, repeat: -1 }); }
        const jack = s.actor(c, 'jack_side', instant ? 0.4 : -0.3, 0.86, 0.5, 0.36);
        s.anim({ targets: jack, angle: { from: -4, to: 4 }, duration: 400, yoyo: true, repeat: -1 });
        if (!instant) { s.anim({ targets: jack, x: (0.4 - 0.5) * c.r.w, duration: 800, ease: 'Quad.out' }); A.whoosh(); }
        s.caption(c, 'MEANWHILE, IN THE VEGGIE PATCH...', instant);
        const say = inst => s.bubble(c, PORTRAIT ? 0.68 : 0.5, PORTRAIT ? 0.36 : 0.42, 'Mmm... smells like DINNER?', -1, inst);
        instant ? say(true) : s.at(1000, say);
      },
      (s, c, instant) => {
        s.bg(c, 'sky6');
        s.strip(c, 0x7a4e2d, 0.72, 1);
        const ms = [0.25, 0.5, 0.75].map(x => s.actor(c, 'mound', x, 0.98, 0.22, 0.22));
        const olly = s.actor(c, 'onion', 0.5, 0.82, 0.36, 0.2), oy = olly.y; c.remove(olly); c.addAt(olly, c.getIndex(ms[1])); // behind the middle mound
        const pop = inst => {
          s.burst(c, PORTRAIT ? 0.2 : 0.22, PORTRAIT ? 0.28 : 0.22, 'PEEKABOO!', PORTRAIT ? 64 : 54, inst);
          if (inst) return;
          olly.y = oy + olly.displayHeight * 0.5; s.anim({ targets: olly, y: oy, duration: 400, ease: 'Back.out' });
          s.anim({ targets: ms[1], angle: { from: -8, to: 8 }, duration: 80, yoyo: true, repeat: 3 }); A.pop && A.pop(); A.peekaboo && A.peekaboo();
        };
        instant ? pop(true) : s.at(300, pop);
        const say = inst => s.bubble(c, PORTRAIT ? 0.62 : 0.5, PORTRAIT ? 0.3 : 0.4, 'Don\'t cry! ...oh wait, that\'s me.', 0, inst);
        instant ? say(true) : s.at(1200, say);
      },
      (s, c, instant) => {
        s.bg(c, 'sky6');
        s.strip(c, 0x7a4e2d, 0.8, 1);
        const tree = s.actor(c, 'broccoli', PORTRAIT ? 0.52 : 0.5, 0.82, 0.5, 0.26).setAlpha(0.95);
        const g = s.add.graphics(); g.fillStyle(0xb98a5a); const fy = (0.82 - 0.5) * c.r.h;
        g.fillRect(-c.r.w / 2 + 5, fy - c.r.h * 0.1, c.r.w - 10, 10); for (let x = -c.r.w / 2 + 20; x < c.r.w / 2 - 20; x += 70) g.fillRect(x, fy - c.r.h * 0.14, 14, c.r.h * 0.14); c.add(g);
        s.peekTree = tree;
        const peas = s.actor(c, 'peapod', instant ? 0.8 : 1.3, 0.98, 0.32, 0.22);
        if (!instant) s.anim({ targets: peas, x: (0.8 - 0.5) * c.r.w, angle: -360, duration: 900, ease: 'Quad.out' });
        s.actor(c, 'garlic', 0.62, 0.98, 0.26, 0.16);
        s.actor(c, 'jack_front', 0.2, 0.98, 0.48, 0.26);
        const s1 = inst => s.bubble(c, 0.34, PORTRAIT ? 0.22 : 0.3, 'I\'m a dragon. I eat DUMPLINGS!', -1, inst);
        const s2 = inst => { s.bubble(c, 0.66, PORTRAIT ? 0.1 : 0.12, 'Good! We came to PLAY!', 0.3, inst); if (!inst) A.babble(20); };
        if (instant) { s1(true); s2(true); } else { s.at(200, s1); s.at(1400, s2); }
      },
    ],
    // the big broccoli "tree" behind the fence opens two eyes and winks (Brock Lee)
    peek: s => {
      const t = s.peekTree; if (!t || !t.parentContainer) return;
      const c = t.parentContainer, ex = t.x, ey = t.y - t.displayHeight * 0.62, r = Math.max(8, t.displayWidth * 0.06), g = s.add.graphics();
      const draw = wink => { g.clear(); g.fillStyle(0xffffff); g.fillCircle(ex - r * 2, ey, r * 1.3); g.fillStyle(0x1d2163); g.fillCircle(ex - r * 2, ey, r * 0.7); if (wink) { g.lineStyle(4, 0x1d2163); g.lineBetween(ex + r, ey, ex + r * 3, ey); } else { g.fillStyle(0xffffff); g.fillCircle(ex + r * 2, ey, r * 1.3); g.fillStyle(0x1d2163); g.fillCircle(ex + r * 2, ey, r * 0.7); } };
      c.addAt(g, c.list.indexOf(t) + 1); draw(false);
      s.time.addEvent({ delay: 900, loop: true, callback: () => { draw(true); s.time.delayedCall(300, () => draw(false)); } });
    },
    sting: s => s.time.delayedCall(1300, () => A.peekaboo && A.peekaboo()),
  };
  // v1.1 Countryballs "The Great Round Picnic" (docs/gdd/1.1-countryballs.md section 6): Jack flies in, England brings tea, the others roll in;
  // on the title page a white-red ball in a cardboard rocket rises behind the hill and plops back down
  COMIC_SCRIPTS.countryballs = {
    world: BALLS, title: 'COUNTRYBALLS!', len: [2700, 2600, 3500],
    confetti: { key: 'conf', tint: [0xff6b5b, 0xffd23f, 0x7fd6c2, 0x5fc8ff, 0xff9ed8], speedY: { min: 250, max: 450 }, scale: { min: 0.6, max: 1 }, lifespan: 5000 },
    panels: [
      (s, c, instant) => {
        s.bg(c, 'sky7');
        const g = s.add.graphics(), w = c.r.w, h = c.r.h, cols = [0xff6b5b, 0xffd23f, 0x7fe39a, 0x5fc8ff, 0xff9ed8];
        g.lineStyle(4, 0xfff3d2); g.lineBetween(-w / 2 + 5, -h * 0.12, w / 2 - 5, -h * 0.12);
        for (let i = 0; i < 9; i++) { const x = -w / 2 + w * (i + 0.5) / 9; g.fillStyle(cols[i % cols.length]); g.fillTriangle(x - 18, -h * 0.12, x + 18, -h * 0.12, x, -h * 0.12 + 36); }
        c.add(g);
        // Poland and his rocket wait behind the hill (they peek on the title page)
        const hx = (0.82 - 0.5) * w, pk = s.add.container(hx, h / 2 - 6).setVisible(false);
        const rk = s.add.image(-w * 0.04, -h * 0.12, 'rocket').setAngle(-45); rk.setScale(Math.min(0.3 * h / rk.height, 0.16 * w / rk.width));
        const pb = s.add.image(0, 0, 'poland').setOrigin(0.5, 1); pb.setScale(Math.min(0.2 * h / pb.height, 0.13 * w / pb.width));
        pk.add([rk, pb]); c.add(pk); s.peekBall = pk; s.peekY = pk.y; s.peekH = h;
        // the hill: the top half of an ellipse, so nothing reaches past the panel border
        const hill = s.add.graphics(), pts = []; for (let k = 0; k <= 24; k++) { const a = Math.PI + Math.PI * k / 24; pts.push(new Phaser.Geom.Point(hx + Math.cos(a) * w * 0.18, h / 2 - 5 + Math.sin(a) * h * 0.25)); }
        hill.fillStyle(0x7fd6c2); hill.fillPoints(pts, true); hill.lineStyle(5, 0x1d2163); hill.strokePoints(pts, false); c.add(hill);
        const jack = s.actor(c, 'jack_side', instant ? 0.36 : -0.3, 0.88, 0.5, 0.36);
        s.anim({ targets: jack, angle: { from: -3, to: 3 }, duration: 90, yoyo: true, repeat: -1 });
        if (!instant) { s.anim({ targets: jack, x: (0.36 - 0.5) * w, duration: 800, ease: 'Quad.out' }); A.whoosh(); }
        s.caption(c, 'MEANWHILE, AT THE GREAT ROUND PICNIC...', instant);
        const say = inst => s.bubble(c, PORTRAIT ? 0.62 : 0.5, PORTRAIT ? 0.42 : 0.46, 'Why is everyone so... ROUND?', -1, inst);
        instant ? say(true) : s.at(1000, say);
      },
      (s, c, instant) => {
        s.bg(c, 'sky7');
        s.strip(c, 0x9fe3d0, 0.8, 1);
        const en = s.actor(c, 'england', instant ? 0.66 : 1.3, 0.98, 0.62, 0.36);
        if (!instant) s.anim({ targets: en, x: (0.66 - 0.5) * c.r.w, duration: 700, ease: 'Back.out' });
        s.anim({ targets: en, angle: { from: -3, to: 3 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        const cup = s.actor(c, 'teacup', 0.34, 0.94, 0.2, 0.16);
        s.anim({ targets: cup, y: cup.y - c.r.h * 0.03, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        const say = inst => { s.bubble(c, PORTRAIT ? 0.36 : 0.42, PORTRAIT ? 0.3 : 0.24, 'Tea, old chap? Then pillows!', 0.6, inst); if (!inst) A.kettle && A.kettle(); };
        instant ? say(true) : s.at(800, say);
      },
      (s, c, instant) => {
        s.bg(c, 'sky7');
        s.strip(c, 0x9fe3d0, 0.8, 1);
        [['spain', 0.52], ['japan', 0.7], ['usa', 0.88]].forEach(([k, x], i) => {
          const b = s.actor(c, k, instant ? x : x + 0.8, 0.98, 0.36, 0.2);
          if (!instant) s.anim({ targets: b, x: (x - 0.5) * c.r.w, duration: 700 + i * 150, ease: 'Back.out' });
        });
        s.actor(c, 'jack_front', 0.2, 0.98, 0.5, 0.26);
        const s1 = inst => s.bubble(c, 0.7, PORTRAIT ? 0.16 : 0.2, 'Too easy, dude!', 0.6, inst);
        const s2 = inst => s.bubble(c, 0.32, PORTRAIT ? 0.4 : 0.44, 'Let\'s PLAY!', -1, inst);
        if (instant) { s1(true); s2(true); } else { s.at(300, s1); s.at(1400, s2); }
      },
    ],
    // the white-red ball in his cardboard rocket rises behind the hill... and plops back down
    peek: s => {
      const o = s.peekBall; if (!o) return;
      o.setVisible(true);
      const up = () => s.tweens.add({ targets: o, y: s.peekY - s.peekH * 0.26, duration: 600, ease: 'Quad.out', onComplete: () => s.tweens.add({ targets: o, y: s.peekY, duration: 500, ease: 'Bounce.out', delay: 300 }) });
      up(); s.time.addEvent({ delay: 2200, loop: true, callback: up });
    },
    sting: s => s.time.delayedCall(1300, () => A.fizzle && A.fizzle()),
  };
  const comicSeen = id => !!(Save.data.comics && Save.data.comics[id]);
  const COMIC_DUE = {
    hills: () => !Object.keys(Save.data.stars).some(k => Save.data.stars[k] > 0), // new players only: saves that played before v0.9 are marked seen by mig09; XP from a toy duel or a quest does not count (QA B65)
    space: () => worldOpen(SPACE), // everyone, once (also players already past Space)
    canada: () => worldOpen(CANADA),
    ocean: () => worldOpen(OCEAN),
    veggie: () => worldOpen(VEGGIE),
    countryballs: () => worldOpen(BALLS),
    spooky: () => EVENT_ON && worldOpen(SPOOKY), // during the event only
  };
  // a comic plays once, the first time its world opens (docs/gdd/0.9-world-comics.md section 4)
  const comicDue = id => !!(id && COMIC_SCRIPTS[id] && COMIC_DUE[id] && !comicSeen(id) && COMIC_DUE[id]());
  class ComicScene extends Phaser.Scene {
    constructor() { super('comic'); }
    init(data) {
      this.d = data || {}; this.S = COMIC_SCRIPTS[this.d.world] || null; this.id = this.S ? this.d.world : null;
      this.then = this.d.then || { key: 'map', data: { world: this.S ? this.S.world : 0 } }; this.start0 = this.d.panel || 0;
    }
    create() {
      this._leaving = false;
      if (!this.S) { this.scene.start('map'); return; } // an unknown comic: back to the map
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
      this.rects = rects; this.panels = []; this.cur = -1; this.steps = []; this.live = []; this.titled = false; this.nextEv = null; this.peekObj = null; this.peekBall = null; this.peekY = this.peekH = 0; // the scene object is reused (replay)
      // SKIP (top right, inside the play area): straight to the title page, which counts as seen
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
    // moves an actor sideways so it stays inside its panel (QA B64)
    inside(c, a, pad = 12) { const hw = a.displayWidth / 2, lim = c.r.w / 2 - pad - hw; a.x = lim > 0 ? clamp(a.x, -lim, lim) : 0; return a; }
    // a flat strip across the panel (ground, snow, moon dust): from fy0 to fy1 of the panel height
    strip(c, col, fy0, fy1) { const r = c.r, g = this.add.graphics(); g.fillStyle(col); g.fillRect(-r.w / 2 + 5, (fy0 - 0.5) * r.h, r.w - 10, (fy1 - fy0) * r.h - 5); c.add(g); return g; }
    // the yellow caption box in the top left corner; the text types in
    caption(c, full, instant) {
      const cap = txt(this, -c.r.w / 2 + 30, -c.r.h / 2 + 30, '', PORTRAIT ? 34 : 30, '#1d2163', { ox: 0, oy: 0, st: 0, shadow: false });
      const capBg = this.add.graphics(); c.add([capBg, cap]);
      cap.setText(full); if (cap.width > c.r.w - 70) cap.setWordWrapWidth(c.r.w - 70).setAlign('left'); cap.setText('');
      const drawCap = () => { capBg.clear(); capBg.fillStyle(0xffd23f); capBg.lineStyle(5, 0x1d2163); capBg.fillRect(-c.r.w / 2 + 14, -c.r.h / 2 + 16, cap.width + 32, cap.height + 28); capBg.strokeRect(-c.r.w / 2 + 14, -c.r.h / 2 + 16, cap.width + 32, cap.height + 28); };
      if (instant) { cap.setText(full); drawCap(); }
      else { let n = 0; const ev = this.time.addEvent({ delay: 30, repeat: full.length - 1, callback: () => { cap.setText(full.slice(0, ++n)); drawCap(); } }); this.steps.push(ev); this.later.push({ fn: () => { cap.setText(full); drawCap(); }, ran: false }); }
    }
    // wrap: a narrower text width than the default (0 = default)
    bubble(c, fx, fy, text, tailX, instant, wrap) {
      const r = c.r, x = (fx - 0.5) * r.w, y = (fy - 0.5) * r.h;
      const t = txt(this, 0, 0, text, PORTRAIT ? 32 : 30, '#1d2163', { st: 0, shadow: false, wrap: Math.min(r.w * 0.8, wrap || 560) });
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
    // maxW: the word is scaled down to fit (long world names on the title page)
    burst(c, fx, fy, word, size, instant, maxW) {
      const r = c ? c.r : null, x = c ? (fx - 0.5) * r.w : fx, y = c ? (fy - 0.5) * r.h : fy, R = size * 1.6, g = this.add.graphics();
      const t = txt(this, 0, 0, word, size, '#fff3d2', { stroke: '#1d2163', st: Math.round(size / 6) });
      // long words (PILLOW HILLS!) get a wider star; short ones keep the round one
      const sx = Math.max(1, t.width / (2 * R * 1.25) / 1.3);
      const star = (rad, col) => { const pts = []; for (let k = 0; k < 28; k++) { const a = k * Math.PI / 14, rr = k % 2 ? rad * 0.62 : rad; pts.push(new Phaser.Geom.Point(Math.cos(a) * rr * 1.25 * sx, Math.sin(a) * rr)); } g.fillStyle(col); g.fillPoints(pts, true); g.lineStyle(6, 0x1d2163); g.strokePoints(pts, true); };
      star(R, 0xffd23f); star(R * 0.72, 0xff6b5b);
      const k = maxW && t.width > maxW ? maxW / t.width : 1;
      // inside its panel sideways (a little overlap on the border is comic style; QA B64: FWUMP! on iPad)
      const hw = R * 1.25 * sx * k, lim = c ? r.w / 2 + 10 - hw : 0;
      const b = this.add.container(c && lim > 0 ? clamp(x, -lim, lim) : x, y, [g, t]).setAngle(-6).setScale(k); b.halfW = hw;
      if (c) c.add(b);
      if (!instant) { b.setScale(0); this.anim({ targets: b, scale: k, duration: 300, ease: 'Back.out' }); }
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
      this.S.panels[i](this, c, instant);
      this.border(c);
      if (!instant) {
        c.y += 60; c.setAlpha(0); this.anim({ targets: c, y: c.r.y, alpha: 1, duration: 300, ease: 'Back.out' });
        this.at(this.S.len[i], () => this.finishPanel(true), true);
      } else this.done = true;
    }
    // jump to the end state of the current panel
    finishPanel(auto) {
      if (this.done) return; this.done = true;
      this.steps.forEach(e => e.remove(false)); this.steps = [];
      const later = this.later; this.later = [];
      // stop the finite tweens and put their targets at the end values (Tween.complete() does not jump to the end);
      // then the steps not run yet draw their end state (after the tweens, so a later step wins: the BONK! pillow bounces off)
      const META = ['targets', 'duration', 'ease', 'delay', 'yoyo', 'repeat', 'onComplete'];
      this.live.forEach(([t, cfg]) => {
        t.stop();
        [].concat(cfg.targets).forEach(o => Object.keys(cfg).forEach(k => { if (META.includes(k)) return; const v = cfg[k]; if (typeof v === 'number') o[k] = v; else if (v && typeof v.to === 'number') o[k] = v.to; }));
      });
      this.live = [];
      if (!auto) later.forEach(r => { if (!r.ran && !r.auto) { r.ran = true; r.fn(true); } });
      const c = this.panels[this.cur]; if (c) { c.y = c.r.y; c.setAlpha(1); }
      if (auto) this.nextEv = this.time.delayedCall(300, () => { this.nextEv = null; this.next(); });
    }
    next() { if (this._leaving || this.titled) return; if (this.cur >= 2) this.toTitle(); else this.play(this.cur + 1, false); }
    tap() {
      if (this.titled) return;
      if (this.nextEv) { this.nextEv.remove(false); this.nextEv = null; } // a tap in the short pause after an auto-finish: one step only (code review)
      if (!this.done) this.finishPanel(false); else this.next();
    }
    seen() { Save.data.comics = Object.assign({}, Save.data.comics, { [this.id]: true }); Save.store(); }
    toTitle() {
      if (this.titled) return; this.titled = true;
      this.seen(); // seen once the title page shows (SKIP or the end)
      if (this.nextEv) { this.nextEv.remove(false); this.nextEv = null; }
      while (this.cur < 2) { this.finishPanel(false); this.play(this.cur + 1, true); }
      if (!this.done) this.finishPanel(false);
      this.d.panel = 3; this.sys.settings.data = Object.assign({}, this.d, { panel: 3 });
      this.skipBtn.setVisible(false); this.hint.setVisible(false);
      const S = this.S;
      if (S.peek) S.peek(this);
      const r0 = this.rects[0], r1 = this.rects[1];
      const b = this.burst(null, PORTRAIT ? W / 2 : (r0.x + r1.x) / 2, PORTRAIT ? (r0.y + r0.h / 2 + r1.y - r1.h / 2) / 2 : H * 0.42, S.title, PORTRAIT ? 120 : 110, false, W - 120); b.setDepth(50);
      A.comicSting && A.comicSting(); this.time.delayedCall(400, () => A.levelUp());
      if (S.sting) S.sting(this);
      const cf = S.confetti;
      // (v1.0: Ocean bubbles rise from the bottom; Veggie peas are tinted dots)
      const conf = this.add.particles(0, 0, cf.key, Object.assign({ x: { min: 0, max: W }, y: cf.rise ? H + 60 : -60, speedY: cf.speedY, speedX: { min: -120, max: 120 }, rotate: { min: 0, max: 360 }, lifespan: cf.lifespan, scale: cf.scale, quantity: 2, frequency: 120 }, cf.tint ? { tint: cf.tint } : {})).setDepth(49);
      this.time.delayedCall(2500, () => conf.stop());
      const go = button(this, W / 2, H - 110, 460, 130, this.then.key === 'album' ? 'DONE!' : 'LET\'S GO!', C.star, () => {
        this.seen();
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
      // iPad portrait (short and wide): TURN! sits beside a smaller machine, so both booster rows fit below it (QA B07)
      const side = this.side = PORTRAIT && H < 1700;
      this.mx = PORTRAIT && !side ? W / 2 : W * 0.3; this.my = side ? 640 : PORTRAIT ? (short ? 620 : 760) : 560; this.ms = side ? 0.75 : short ? 0.8 : 1;
      this.machine();
      const bx = side ? W * 0.75 : this.mx, by = side ? this.my + 40 : this.my + (PORTRAIT ? 330 * this.ms + 90 : 390);
      this.bx = bx; this.by = by; this.tw = side ? 340 : 380;
      this.turnBtn = button(this, bx, by, this.tw, 120, 'TURN!', C.star, () => this.turn(), { size: 56 });
      this.tweens.add({ targets: this.turnBtn, scale: 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      // v1.1.1: OPEN 10 (only with 10 or more capsules) and the "skip animation" checkbox (a device preference)
      this.tenBtn = button(this, bx, by, this.tw * 0.8, 120, 'OPEN 10', C.coral, () => this.turn10(), { size: 48 });
      this.skipBox();
      this.noneT = txt(this, bx, by, 'Win duels to get capsules.\nOne more is free every day!', 32, '#bcc0ee', { st: 5, weight: '500' });
      this.gridTop = side ? this.my + 330 * this.ms + 50 : PORTRAIT ? Math.max(by + 188, Math.min(by + 210, H - 556)) : 250; // portrait: both booster rows stay on screen at any height
      this.grid = this.add.container(0, 0);
      this.refresh();
      backButton(this, () => { if (!this.busy) fade(this, 'map', { world: this.world }); }); // not while a capsule opens: the caps are already spent (QA B78)
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
      // TURN! and OPEN 10 side by side; iPad portrait (side): a column right of the machine, the checkbox on top
      const ten = Save.data.caps >= 10, d = this.tw * 0.55 + 10, side = this.side;
      this.tenBtn.setVisible(ten);
      if (side) { this.turnBtn.setPosition(this.bx, this.by - 30); this.tenBtn.setPosition(this.bx, this.by + 100); }
      else { this.turnBtn.x = this.bx - (ten ? d : 0); this.tenBtn.x = this.bx + d; }
      this.skipUI.setVisible(n > 0).setPosition(side ? this.bx : PORTRAIT ? this.bx : W * 0.72, side ? this.by - 170 : PORTRAIT ? this.by + 113 : H - 170);
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
        c.setSize(cw, ch).setInteractive(); if (known) press(this, c);
        c.on('pointerup', () => { if (known) { A.click(); this.hint2(b.name + ': ' + b.desc); } });
        this.grid.add(c);
      });
    }
    hint2(s) {
      if (this._h) this._h.destroy();
      // iPad portrait: the booster rows reach the bottom, so the hint goes under TURN! (QA B07)
      const t = this._h = this.side ? txt(this, W * 0.72, this.by + 205, s, 32, '#ffd23f', { st: 6, wrap: 540 }).setDepth(70) : fit(txt(this, W / 2, H - 50, s, 32, '#ffd23f', { st: 6 }), W - 80).setDepth(70);
      this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
    }
    // "Skip animation" checkbox: a big tap target (box + label), the choice is a device preference (PSPrefs.skipCaps)
    skipBox() {
      const P = window.PSPrefs, on = () => !!(P && P.data && P.data.skipCaps);
      const c = this.skipUI = this.add.container(this.bx, this.by + 113).setDepth(6);
      const g = this.add.graphics(), lab = txt(this, 30, 0, 'Skip animation', 36, '#fff3d2', { st: 6 });
      const draw = () => { g.clear(); g.fillStyle(C.cream); g.fillRoundedRect(-186, -22, 44, 44, 10); g.lineStyle(5, 0x0f1240, 0.6); g.strokeRoundedRect(-186, -22, 44, 44, 10);
        if (on()) { g.lineStyle(9, C.coral); g.beginPath(); g.moveTo(-177, 0); g.lineTo(-167, 11); g.lineTo(-150, -12); g.strokePath(); } };
      draw(); c.add([g, lab]);
      c.setSize(440, 90).setInteractive(); press(this, c);
      c.on('pointerup', () => { if (!P) return; A.click(); P.set('skipCaps', !on()); draw(); });
      c.setVisible(false);
    }
    // takes one capsule: rolls the booster, stores it, tells the plugins (stickers, quests). Golden ones first (always SUPER RARE).
    take(onlyPlain) {
      const gold = !onlyPlain && (Save.data.goldCaps || 0) > 0;
      if (!gold && Save.data.caps <= 0) return null;
      let b = rollBoost(); if (gold) { const sr = BOOSTS.filter(x => x.r === 3); b = sr[rnd(0, sr.length - 1)]; }
      const isNew = !Save.data.seen[b.id];
      if (gold) Save.data.goldCaps--; else Save.data.caps--; Save.data.boosts[b.id] = (Save.data.boosts[b.id] || 0) + 1; Save.data.seen[b.id] = true; Save.store();
      emit('capsule', { boost: b, isNew }, this);
      return { b, isNew, gold };
    }
    skip() { const P = window.PSPrefs; return !!(P && P.data && P.data.skipCaps); }
    // OPEN 10: ten plain capsules, one summary screen (with "skip" there is no animation at all, without it the machine shakes once)
    async turn10() {
      if (this.busy || Save.data.caps < 10) return;
      this.busy = true; this.turnBtn.setVisible(false); this.tenBtn.setVisible(false); this.skipUI.setVisible(false);
      const got = []; for (let i = 0; i < 10; i++) got.push(this.take(true));
      if (!this.skip()) {
        A.spin(); for (let i = 0; i < 6; i++) this.time.delayedCall(i * 140, () => A.tick());
        this.tweens.add({ targets: this.crank, angle: 720, duration: 1200, ease: 'Sine.inOut', onComplete: () => this.crank.setAngle(0) });
        this.tweens.add({ targets: this.m, x: this.mx + 10, duration: 60, yoyo: true, repeat: 11 });
        await wait(this, 1300);
      }
      this.summary(got);
    }
    summary(got) {
      const layer = this.add.container(0, 0).setDepth(25), cx = W / 2;
      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.88).setInteractive(); layer.add(dim);
      const cw = PORTRAIT ? Math.min(190, (W - 80) / 5 - 12) : 200, ch = Math.round(cw * 1.2), top = H * (PORTRAIT ? 0.26 : 0.2);
      layer.add(txt(this, cx, top - 20, '10 CAPSULES!', PORTRAIT ? 72 : 64, '#fff3d2', { stroke: '#0f1240', st: 12 }));
      const best = Math.max(...got.map(r => r.b.r)); best >= 2 ? A.win() : A.levelUp();
      got.forEach((r, i) => {
        const x = cx + ((i % 5) - 2) * (cw + 12), y = top + 60 + ch / 2 + Math.floor(i / 5) * (ch + 14), b = r.b;
        const c = this.add.container(x, y), g = this.add.graphics();
        g.fillStyle(C.cream); g.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 24);
        g.lineStyle(6, Phaser.Display.Color.HexStringToColor(RARITY[b.r].color).color); g.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 24);
        c.add(g);
        const ic = img(this, 0, -ch * 0.12, b.icon); ic.setScale(iconScale(b.icon, cw * 0.55)); c.add(ic);
        c.add(fit(txt(this, 0, ch * 0.26, b.name, 22, C.ink, { st: 0, shadow: false }), cw - 14));
        for (let k = 0; k < b.r; k++) c.add(this.add.image((k - (b.r - 1) / 2) * 24, ch / 2 - 20, 'star').setScale(0.09));
        if (r.isNew) c.add(chip(this, cw / 2 - 30, -ch / 2 + 8, 'NEW!', C.coral, 22).setAngle(10));
        c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: this.skip() ? 1 : 260, delay: this.skip() ? 0 : i * 110, ease: 'Back.out' });
        layer.add(c);
      });
      const ok = button(this, cx, Math.min(top + 60 + (ch + 14) * 2 + 80, H - 90), 380, 120, 'NICE!', C.star, () => {
        ok.disableInteractive();
        this.tweens.add({ targets: layer, alpha: 0, duration: 250, onComplete: () => { layer.destroy(true); this.busy = false; this.refresh(); if (window.__psRotatePending && window.__psTryRebuild) window.__psTryRebuild(); } });
      }, { size: 50 }); layer.add(ok);
      this.summ = layer;
    }
    async turn() {
      const gold = (Save.data.goldCaps || 0) > 0;
      if (this.busy || (Save.data.caps <= 0 && !gold)) return;
      this.busy = true; this.turnBtn.setVisible(false); this.tenBtn.setVisible(false); this.skipUI.setVisible(false);
      const { b, isNew } = this.take();
      if (this.skip()) { // v1.1.1: no animation, the result right away
        const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.75).setDepth(18).setInteractive();
        return this.reveal(b, isNew, dim);
      }
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
          else if (window.__psRotatePending && window.__psTryRebuild) window.__psTryRebuild();
        } });
      }, { size: 50 }).setDepth(26);
    }
  }

  // ---------- start
  // helpers + data shared with plugin scenes (js/extra.js, js/net.js)
  PS = { VERSION, W, H, PORTRAIT, C, A, FONT, Save, IDB, TOYS, MOVES, RIVALS, WORLDS, BOOSTS, BOOST_BY_ID, RARITY, COSTUMES, KRAKEN, DIFFS, EVENT_ON, SPOOKY, SPACE, CANADA, OCEAN, VEGGIE, BALLS,
    txt, fit, tw, wait, rnd, clamp, buzz, img, iconScale, sky, groundKey, button, panel, chip, fitImage, starRow, fade, press, backButton, muteButton, capsuleButton, drawCapsule,
    addTexture, hatImage, levelOf, heroDef, jackDef, toyDef, toyById, totalStars, isUnlocked, emit, dailyStreak, worldOpen, bottomGround };
  const EXTRA_SCENES = [].concat(...PLUGINS.map(p => { try { return p.scenes ? p.scenes(PS) : []; } catch (e) { console.warn('plugin scenes', e); return []; } }));
  function snapshot(game) {
    const sc = game.scene.getScenes(true).find(x => x.scene.key !== 'boot');
    if (!sc) return null;
    // the player already tapped their way out (the screen is fading): keep that tap (QA B38 / #4)
    if (sc._leaving && sc._psTarget) { const t = Object.assign({}, sc._psTarget.data); delete t.resume; return { key: sc._psTarget.key, data: t }; }
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
    sc.events.on('create', () => { safeCam(sc); if (sc.scene.key !== 'boot') A.music(sc.scene.key !== 'battle' || sc.over ? 'calm' : sc.track ? sc.track() : 'battle'); emit('scene', { key: sc.scene.key }, sc); if (window.__psRotatePending && sc.scene.key !== 'boot') sc.time.delayedCall(100, () => window.__psTryRebuild && window.__psTryRebuild()); [700, 2200].forEach(t => sc.time.delayedCall(t, () => tintPage(game))); });
  }));
  window.__psJudgeSave = judgeSave; window.__game = game; window.__save = Save; window.__RIVALS = RIVALS; window.__IDB = IDB; window.__BOOSTS = BOOSTS;
  if (DEBUG) {
    // v1.0 test handles (headless tests run at 2-3 fps): a Compass Spin now or at the next turn, fill Thully's Wake-o-meter
    const bt = () => game.scene.getScene('battle');
    window.__psSpin = now => { const b = bt(); if (!b || !b.hero) return; if (now && !b.busy) { b.startSpin({}); b.setCards(true); } else b.spinNext = {}; };
    window.__psWake = () => { const b = bt(); if (b && b.rival && b.rival.asleep) { b.rival.meter = b.wakeNeed(); b.wakeUp(); } };
    // v1.1: window.__psPush = 'go' | 'soft' | 'skip' resolves the PUSH! turn, window.__psCopy = true forces a COPYCAT! next rival turn
  }
  window.__psPortrait = PORTRAIT; window.__psAspect = ASPECT; window.__psInsets = INS;
  window.__psSnapshot = () => snapshot(game);
  // don't rebuild in the middle of taking a toy photo (the phone keyboard also changes the window size there)
  // ...and not while a duel turn is playing out: the snapshot would restore it as YOUR TURN (QA B02)
  window.__psBlockRotate = () => game.scene.isActive('studio') || (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) ||
    (game.scene.isActive('battle') && (b => !!(b.hero && ((b.busy && !b.shown) || b.celebrating)))(game.scene.getScene('battle'))) || (game.scene.isActive('gacha') && game.scene.getScene('gacha').busy) || window.__psToasts > 0; // ...a capsule opening (the capsule is already taken) and not before the rewards are given (QA B31)
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
  // a freshly added Home Screen web app on iOS can settle its size and safe-area insets after launch without any
  // resize event: the top buttons then sit under the status bar, where iOS eats the taps. Check again a few times.
  window.addEventListener('orientationchange', () => setTimeout(() => window.__psTryRebuild(), 400));
  window.addEventListener('pageshow', () => setTimeout(() => window.__psTryRebuild(), 400));
  [700, 2000, 4000].forEach(t => setTimeout(() => window.__psTryRebuild && window.__psTryRebuild(), t));
  document.addEventListener('visibilitychange', () => { const A = window.PSAudio; if (!A.ctx) return; document.hidden ? A.ctx.suspend() : A.ctx.resume(); });
  const fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('500 40px Poppins')]).catch(() => {}) : Promise.resolve();
  // wait for fonts and (if online play is set up) the saved login, but never more than ~3 s
  const netReady = window.PSNetReady || Promise.resolve();
  Promise.race([Promise.all([fontsReady, netReady.catch(() => {})]), new Promise(r => setTimeout(r, 3000))]).then(() => { built = true; main(null); });
})();
