// Plush Squad v0.4 — Jack the plush dragon, his rivals and YOUR toys (+ Toy). Phaser 3.
(function () {
  'use strict';
  const PORTRAIT = window.innerHeight > window.innerWidth;
  const ASPECT = Math.max(window.innerWidth, 1) / Math.max(window.innerHeight, 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const W = PORTRAIT ? 1080 : Math.round(clamp(1080 * ASPECT, 1440, 2340));
  const H = PORTRAIT ? Math.round(clamp(1080 / ASPECT, 1500, 2340)) : 1080;
  const DEBUG = /[?&]debug/.test(location.search);
  const A = window.PSAudio;
  const FONT = 'Poppins, "Arial Rounded MT Bold", Arial, sans-serif';
  const C = { night: 0x1d2163, night2: 0x272c7c, night3: 0x343a96, seam: 0x6a72d6, star: 0xffd23f, cream: 0xfff3d2, coral: 0xff6b5b, mint: 0x7fd6c2, orange: 0xff8a3d, ink: '#1d2163' };

  // ---------- save
  const KEY = 'plushsquad_v1';
  const Save = {
    data: { xp: 0, wins: 0, muted: false, stars: {}, toys: [], hero: 'jack' },
    load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {} },
    store() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} },
  };
  Save.load(); A.muted = !!Save.data.muted; if (!Save.data.stars) Save.data.stars = {}; if (!Array.isArray(Save.data.toys)) Save.data.toys = []; if (!Save.data.hero) Save.data.hero = 'jack';
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
      img.onload = () => { scene.textures.addImage(key, img); res(true); };
      img.onerror = () => res(false);
      img.src = url;
    });
  }
  // image helper: 'i:name' = frame of the icons atlas, otherwise a texture key
  function img(scene, x, y, key) { return key && key.startsWith('i:') ? scene.add.image(x, y, 'icons', key.slice(2)) : scene.add.image(x, y, key); }
  function iconScale(key, size) { // scale so the icon is ~size px
    if (!key) return 1;
    if (key.startsWith('i:')) return size / 144;
    const base = { pillow: 216, books: 224, snow: 214, zzz: 223, sparkles: 223, star: 224, dizzy: 224, dance: 223, shield: 179, note: 230, dumpling: 223, milk: 188, cloud: 224, feather: 120, dot: 64, spark: 80 }[key] || 220;
    return size / base;
  }

  // ---------- shared scenery
  function sky(scene) {
    scene.add.image(W / 2, H / 2, 'sky');
    const g = scene.add.image(W * 0.5, PORTRAIT ? H * 0.27 : H * 0.3, 'glow').setScale(PORTRAIT ? 2.2 : 2.6).setAlpha(0.55);
    scene.tweens.add({ targets: g, alpha: 0.35, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    for (let i = 0; i < (PORTRAIT ? 70 : 90); i++) {
      const s = scene.add.image(Math.random() * W, Math.random() * H * 0.62, 'dot')
        .setScale(0.12 + Math.random() * 0.22).setTint(Math.random() < 0.3 ? C.star : 0xffffff).setAlpha(0.3 + Math.random() * 0.6);
      scene.tweens.add({ targets: s, alpha: 0.08, duration: 900 + Math.random() * 2200, yoyo: true, repeat: -1, delay: Math.random() * 2000, ease: 'Sine.inOut' });
    }
    for (let i = 0; i < 5; i++) {
      const cl = scene.add.image(Math.random() * W, H * (0.08 + Math.random() * 0.42), 'cloud')
        .setAlpha(0.13 + Math.random() * 0.12).setScale(0.8 + Math.random() * 1.3);
      const sp = 9000 + Math.random() * 12000;
      scene.tweens.add({ targets: cl, x: cl.x + W * 0.35, duration: sp * 2, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    scene.time.addEvent({ delay: 4200, loop: true, callback: () => { if (Math.random() < 0.6) shootingStar(scene); } });
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
      const bar = this.add.rectangle(W / 2 - 300, H / 2, 4, 26, C.star).setOrigin(0, 0.5);
      this.add.rectangle(W / 2, H / 2, 608, 34).setStrokeStyle(4, C.seam);
      this.load.on('progress', p => bar.width = 600 * p);
      ['jack_side', 'jack_upside', 'jack_front', 'tiger', 'cow', 'snake', 'owl', 'moon', 'cloud', 'zzz', 'snow', 'star', 'trophy', 'heart', 'sparkles',
        'dumpling', 'milk', 'books', 'lock', 'dizzy', 'dance', 'crown', 'note', 'shield']
        .forEach(k => this.load.image(k, 'assets/' + k + '.png'));
      this.load.atlas('icons', 'assets/icons.webp', 'assets/icons.json');
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
      g.destroy();
      // sky gradient + glow + quilt ground (canvas textures)
      const sk = this.textures.createCanvas('sky', W, H), cx = sk.getContext();
      const gr = cx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0f1240'); gr.addColorStop(0.55, '#262b7c'); gr.addColorStop(1, '#3a3f9e');
      cx.fillStyle = gr; cx.fillRect(0, 0, W, H); sk.refresh();
      const st = this.textures.createCanvas('streak', 240, 8), sx = st.getContext();
      const sg = sx.createLinearGradient(0, 0, 240, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,1)');
      sx.fillStyle = sg; sx.beginPath(); sx.moveTo(0, 4); sx.lineTo(236, 0); sx.arc(236, 4, 4, -Math.PI / 2, Math.PI / 2); sx.closePath(); sx.fill(); st.refresh();
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
      // load saved toy pictures, then go
      Promise.all(Save.data.toys.map(t => IDB.get(t.id).then(url => url && addTexture(this, 'toy_' + t.id, url)).catch(() => {})))
        .then(() => this.scene.start('title'), () => this.scene.start('title'));
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
  ];
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
    { id: 'hoot', name: 'Professor Hoot', nick: 'Professor Hoot', short: 'PROF. HOOT', tex: 'owl', scale: 1.9, color: 0xc89a6a, hp: 150, xp: 100, boss: true,
      intro: 'Professor Hoot adjusts his cap: "Lesson time, Jack!"', laugh: 'The Professor declared a holiday. No homework!',
      moves: [{ type: 'volley', tex: 'books', dmg: [12, 21], word: 'LESSON TIME!', sound: 'hoot', w: 35, log: 'POP QUIZ! {a} throws books at {d}!' },
        { type: 'throw', tex: 'pillow', dmg: [11, 18], w: 25, log: '{a} swings a pillow at {d}!' },
        { type: 'dizzy', color: 0xffe08a, word: 'STARE...', uses: 2, w: 15, sound: 'hoot', log: '{a} gives {d} THE STARE...' },
        { type: 'heal', tex: 'milk', amt: 25, uses: 1, w: 10, log: '{a} sips some warm milk. Ahh.' },
        { type: 'roar', word: 'HOOT HOOT!', color: 0xffe08a, sound: 'hoot', dmg: [14, 22], w: 15, log: '{a} hoots so loud the moon wobbles!' }] },
  ];
  const DEF_W = { throw: 30, rush: 30, hop: 30, multi: 25, roar: 20, quake: 25, spray: 25, tickle: 25, volley: 25, heal: 15, nap: 15, shield: 15, dizzy: 15, dance: 12 };
  const isUnlocked = i => i === 0 || (Save.data.stars[RIVALS[i - 1].id] || 0) > 0;
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
    scene.cameras.main.fadeOut(320, 15, 18, 64);
    scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
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

  // ---------- Title
  class Title extends Phaser.Scene {
    constructor() { super('title'); }
    create() {
      this._leaving = false;
      this.cameras.main.fadeIn(400, 15, 18, 64);
      sky(this);
      this.add.image(W / 2, H + 40, 'ground').setOrigin(0.5, 1).setScale(1, PORTRAIT ? 0.55 : 0.6);
      const moon = this.add.image(PORTRAIT ? W * 0.8 : W * 0.84, PORTRAIT ? H * 0.12 : H * 0.2, 'moon').setScale(PORTRAIT ? 1.1 : 1.3);
      this.tweens.add({ targets: moon, angle: 8, y: moon.y + 14, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const ly = PORTRAIT ? H * 0.17 : H * 0.16;
      const word = (s, y, size, color, d0) => {
        const letters = s.split(''); const sp = size * 0.72; const x0 = W / 2 - (letters.length - 1) * sp / 2;
        letters.forEach((ch, i) => {
          const t = txt(this, x0 + i * sp, y - 300, ch, size, color, { stroke: '#0f1240', st: Math.round(size / 6) });
          this.tweens.add({ targets: t, y, duration: 700, delay: d0 + i * 60, ease: 'Bounce.out' });
          this.tweens.add({ targets: t, y: y - 14, duration: 1200, delay: 1600 + i * 110, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        });
      };
      word('PLUSH', ly, PORTRAIT ? 150 : 170, '#fff3d2', 100);
      word('SQUAD', ly + (PORTRAIT ? 160 : 180), PORTRAIT ? 150 : 170, '#ffd23f', 450);
      const jy = PORTRAIT ? H * 0.75 : H * 0.95;
      const sh = this.add.image(W / 2, jy + 6, 'shadow').setScale(1.3, 1);
      const hero = heroDef(this);
      const heroKey = hero.isJack ? 'jack_front' : hero.tex;
      const jack = this.add.image(W / 2, jy, heroKey).setOrigin(0.5, 1);
      jack.setScale(Math.min((PORTRAIT ? 590 : 425) / jack.height, (PORTRAIT ? 600 : 520) / jack.width));
      this.tweens.add({ targets: jack, y: jy - 34, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: sh, scaleX: 1.05, alpha: 0.6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.add.particles(0, 0, 'spark', { x: { min: W / 2 - 300, max: W / 2 + 300 }, y: { min: jy - 560, max: jy - 60 }, lifespan: 1200, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 220, tint: [C.star, 0xffffff, C.mint], rotate: { min: 0, max: 90 } }).setDepth(-0.5);
      const lv = levelOf(Save.data.xp);
      const px = PORTRAIT ? W / 2 : 330, py = PORTRAIT ? H * 0.43 : H * 0.62;
      const pg = this.add.graphics(); pg.fillStyle(C.night2, 0.9); pg.fillRoundedRect(px - 210, py - 105, 420, 210, 40); pg.lineStyle(4, C.seam); pg.strokeRoundedRect(px - 210, py - 105, 420, 210, 40);
      txt(this, px, py - 54, 'LEVEL ' + lv.l, 52, '#ffd23f', { st: 0 });
      this.add.rectangle(px, py + 8, 320, 26, C.night3).setStrokeStyle(3, C.seam);
      this.add.rectangle(px - 160, py + 8, Math.max(6, 320 * lv.r / lv.n), 20, C.star).setOrigin(0, 0.5);
      txt(this, px, py + 50, lv.r + ' / ' + lv.n + ' XP', 26, '#bcc0ee', { st: 0, shadow: false, weight: '500' });
      this.add.image(px - 40, py + 84, 'star').setScale(0.13);
      txt(this, px + 10, py + 84, totalStars() + ' / ' + RIVALS.length * 3, 26, '#fff3d2', { st: 0, shadow: false, ox: 0 });
      const bx = PORTRAIT ? W / 2 : W - 330, byy = PORTRAIT ? H * 0.86 : H * 0.6;
      const tp = button(this, bx, byy, PORTRAIT ? 640 : 500, 150, 'TAP TO PLAY', C.star, () => this.go(), { size: 60 });
      this.tweens.add({ targets: tp, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      button(this, bx, byy + (PORTRAIT ? 150 : 150), PORTRAIT ? 480 : 420, 100, '+ ADD A TOY', C.cream, () => { A.init(); A.startMusic(); fade(this, 'studio'); }, { size: 40 });
      muteButton(this);
      this.input.keyboard && this.input.keyboard.once('keydown-SPACE', () => this.go());
    }
    go() { A.init(); A.startMusic(); A.whoosh(); fade(this, 'map'); }
  }

  // ---------- Map: choose a rival
  class MapScene extends Phaser.Scene {
    constructor() { super('map'); }
    create() {
      this._leaving = false;
      this.cameras.main.fadeIn(350, 15, 18, 64);
      sky(this);
      this.add.image(W / 2, H + 40, 'ground').setOrigin(0.5, 1).setScale(1, PORTRAIT ? 0.45 : 0.5).setAlpha(0.8);
      txt(this, W / 2, PORTRAIT ? 190 : 95, 'CHOOSE A RIVAL', PORTRAIT ? 76 : 70, '#fff3d2', { stroke: '#0f1240', st: 12 });
      const lv = levelOf(Save.data.xp);
      txt(this, W / 2, PORTRAIT ? 270 : 165, 'Level ' + lv.l + '  ·  ★ ' + totalStars() + ' / ' + RIVALS.length * 3, 34, '#ffd23f', { st: 6 });
      const pts = PORTRAIT
        ? [[0.3, 0.8], [0.7, 0.64], [0.3, 0.48], [0.66, 0.3]].map(([x, y]) => [W * x, H * y])
        : [[0.14, 0.66], [0.37, 0.4], [0.61, 0.66], [0.85, 0.4]].map(([x, y]) => [W * x, H * y]);
      const g = this.add.graphics(); g.lineStyle(10, 0xfff3d2, 0.55);
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; const n = 14;
        for (let k = 0; k < n; k += 2) {
          const t1 = k / n, t2 = (k + 1) / n;
          const bx = (t) => x1 + (x2 - x1) * t, by = (t) => y1 + (y2 - y1) * t - Math.sin(Math.PI * t) * 60;
          g.lineBetween(bx(t1), by(t1), bx(t2), by(t2));
        }
      }
      let current = 0;
      RIVALS.forEach((r, i) => { if (isUnlocked(i)) current = i; });
      RIVALS.forEach((r, i) => this.node(r, i, pts[i][0], pts[i][1], isUnlocked(i), i === current));
      // hero marker at current node
      const hero = heroDef(this);
      const [cx, cy] = pts[current];
      const j = this.add.image(cx - (RIVALS[current].boss ? 130 : 110) - 80, cy + 40, hero.tex).setOrigin(0.5, 1).setDepth(5);
      j.setScale(Math.min(150 / j.height, 150 / j.width));
      this.tweens.add({ targets: j, y: j.y - 20, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      // squad button
      const sx = PORTRAIT ? W / 2 : W - 200, sy = PORTRAIT ? H - 110 : H - 90;
      const sq = button(this, sx, sy, 330, 110, 'MY SQUAD', C.cream, () => fade(this, 'squad'), { size: 44 });
      const face = this.add.image(-125, 0, hero.isJack ? 'jack_front' : hero.tex); face.setScale(Math.min(84 / face.height, 84 / face.width));
      sq.add(face); sq.list[1].x = 25;
      backButton(this, () => fade(this, 'title'));
      muteButton(this);
    }
    node(r, i, x, y, open, current) {
      const R = r.boss ? 130 : 110;
      const c = this.add.container(x, y).setDepth(4);
      const g = this.add.graphics();
      const stars = Save.data.stars[r.id] || 0;
      g.fillStyle(0x000000, 0.3); g.fillCircle(0, 12, R);
      g.fillStyle(open ? C.night2 : 0x161946); g.fillCircle(0, 0, R);
      g.lineStyle(8, stars > 0 ? C.star : (open ? C.cream : C.seam)); g.strokeCircle(0, 0, R);
      const im = this.add.image(0, 8, r.tex); im.setScale((R * 1.55) / Math.max(im.width, im.height));
      c.add([g, im]);
      if (r.boss) c.add(this.add.image(0, -R - 10, 'crown').setScale(0.42));
      if (!open) { im.setTint(0x000000).setAlpha(0.75); c.add(this.add.image(0, 10, 'lock').setScale(0.42)); }
      c.add(fit(txt(this, 0, R + 46, open ? r.name : '???', 38, open ? '#fff3d2' : '#8a8fd6', { st: 7 }), 420));
      if (open) c.add(starRow(this, 0, R + 104, stars, 64, 70));
      if (current && open) {
        this.tweens.add({ targets: c, scale: 1.07, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        const ring = this.add.image(x, y, 'ring').setScale(R / 52).setTint(C.star).setDepth(3).setAlpha(0.6);
        this.tweens.add({ targets: ring, scale: R / 40, alpha: 0, duration: 1300, repeat: -1 });
      }
      c.setSize(R * 2, R * 2 + 120).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        A.init();
        if (!open) { A.block(); this.tweens.add({ targets: c, x: x + 14, duration: 60, yoyo: true, repeat: 3 }); return; }
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
      const ml = d.moves.slice(0, 7);
      ml.forEach((m, i) => {
        const my = ty + 170 + i * (PORTRAIT ? 78 : (ml.length > 4 ? 62 : 80));
        const ic = img(this, tx - 250, my, m.icon || 'pillow'); ic.setScale(iconScale(m.icon || 'pillow', 56));
        p.add([ic, txt(this, tx - 205, my - 2, m.title, 34, '#fff3d2', { ox: 0, st: 5 }), txt(this, tx + 300, my, m.sub || '', 26, '#bcc0ee', { ox: 1, st: 0, weight: '500' })]);
      });
      if (it.jack && MOVES.length > ml.length) p.add(txt(this, tx, ty + 170 + ml.length * (PORTRAIT ? 78 : 62), 'More moves unlock as you level up!', 26, '#ffd23f', { st: 4, weight: '500' }));
      // buttons
      const isHero = it.jack ? (Save.data.hero === 'jack' || !toyById(Save.data.hero)) : Save.data.hero === it.toy.id;
      const by = ph / 2 - (PORTRAIT ? 230 : 110);
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
        const del = txt(this, pw / 2 - 90, -ph / 2 + 70, 'remove', 26, '#8a8fd6', { st: 0, weight: '500' }).setInteractive({ useHandCursor: true });
        del.on('pointerup', () => this.confirmRemove(it.toy, close));
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
      this._leaving = false; this.busyState = false;
      this.cameras.main.fadeIn(350, 15, 18, 64);
      sky(this);
      this.add.image(W / 2, H + 40, 'ground').setOrigin(0.5, 1).setScale(1, PORTRAIT ? 0.45 : 0.5).setAlpha(0.8);
      this.title = txt(this, W / 2, PORTRAIT ? 190 : 95, 'NEW TOY', PORTRAIT ? 80 : 72, '#fff3d2', { stroke: '#0f1240', st: 12 });
      this.layer = this.add.container(0, 0);
      backButton(this, () => { if (!this.busyState) fade(this, Save.data.toys.length ? 'squad' : 'title'); });
      muteButton(this);
      this.intro();
      try { getWorker(); } catch (e) {}
    }
    clear() { this.layer.removeAll(true); }
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
      const files = {};
      const w = getWorker();
      const result = await new Promise((res) => {
        w.onmessage = (ev) => {
          const m = ev.data;
          if (m.type === 'progress') {
            files[m.file] = [m.loaded, m.total];
            const L = Object.values(files).reduce((s, f) => s + f[0], 0), T = Object.values(files).reduce((s, f) => s + f[1], 0);
            status.setText('Downloading toy magic (first time only)... ' + Math.round(100 * L / Math.max(T, 1)) + '%');
          } else if (m.type === 'stage') {
            status.setText({ download: 'Getting the magic ready...', cutout: 'Cutting out your toy...', classify: 'Who could this be?...' }[m.stage] || status.text);
          } else if (m.type === 'done' || m.type === 'error') res(m);
        };
        w.onerror = (e) => res({ type: 'error', message: e.message || 'worker failed' });
        const buf = pic.data.data.buffer.slice(0);
        w.postMessage({ type: 'process', rgba: buf, w: pic.w, h: pic.h }, [buf]);
      });
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
      this.data0 = data || {};
      const toy = this.data0.toy && toyById(this.data0.toy);
      if (toy) { this.rivalIdx = -1; this.R = Object.assign(toyDef(toy), { xp: 30, scale: null }); }
      else { this.rivalIdx = this.data0.rival || 0; this.R = RIVALS[this.rivalIdx]; }
    }
    create() {
      this._leaving = false;
      const R = this.R;
      this.cameras.main.fadeIn(400, 15, 18, 64);
      sky(this);
      this.H = heroDef(this);
      this.moves = this.H.moves;
      // card layout
      const n = this.moves.length; const rects = []; let top;
      if (PORTRAIT) {
        const rows = Math.ceil(n / 2), h = rows > 2 ? 172 : 200, gy = h + 22, w = 490;
        const y0 = H - 70 - h / 2 - (rows - 1) * gy;
        for (let i = 0; i < n; i++) rects.push({ x: W / 2 + (i % 2 ? 1 : -1) * 258, y: y0 + Math.floor(i / 2) * gy, w, h });
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
      const groundY = PORTRAIT ? Math.max(H * 0.5, top - 200) : (compact ? top - 80 : H * 0.68);
      this.groundY = groundY;
      const zoom = compact ? 0.82 : 1;
      const moon = this.add.image(W / 2, PORTRAIT ? Math.max(H * 0.2, groundY - 760) : H * 0.24, 'moon').setScale(PORTRAIT ? 0.6 : 0.62 * zoom).setAlpha(0.95);
      this.tweens.add({ targets: moon, angle: -6, y: moon.y + 12, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.add.image(W / 2, groundY - (PORTRAIT ? 230 : 300 * zoom), 'ground').setOrigin(0.5, 0).setScale(1, PORTRAIT ? 1.6 : 0.9);

      this.feathers = this.add.particles(0, 0, 'feather', { emitting: false, speed: { min: 250, max: 750 }, angle: { min: 200, max: 340 }, gravityY: 900, lifespan: { min: 1100, max: 1700 }, rotate: { start: 0, end: 540 }, scale: { start: 0.7, end: 0.45 }, alpha: { start: 1, end: 0 } }).setDepth(20);
      this.sparks = this.add.particles(0, 0, 'spark', { emitting: false, speed: { min: 300, max: 900 }, lifespan: 450, scale: { start: 0.9, end: 0 }, tint: [C.star, 0xffffff], blendMode: 'ADD' }).setDepth(21);
      this.heals = this.add.particles(0, 0, 'dot', { emitting: false, speedY: { min: -500, max: -200 }, speedX: { min: -80, max: 80 }, lifespan: 1000, scale: { start: 0.45, end: 0 }, tint: [0x7fe39a, 0xd7ffb0, 0xffffff], blendMode: 'ADD' }).setDepth(21);
      this.dust = this.add.particles(0, 0, 'dot', { emitting: false, speed: { min: 200, max: 600 }, angle: { min: 180, max: 360 }, gravityY: 500, lifespan: 800, scale: { start: 0.6, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: [0xd8c7a3, 0xffffff] }).setDepth(19);
      this.notes = this.add.particles(0, 0, 'note', { emitting: false, speedY: { min: -400, max: -200 }, speedX: { min: -200, max: 200 }, lifespan: 1200, scale: { start: 0.25, end: 0.1 }, rotate: { min: -30, max: 30 }, alpha: { start: 1, end: 0 } }).setDepth(22);
      this.confetti = this.add.particles(0, 0, 'conf', { emitting: false, speed: { min: 500, max: 1300 }, angle: { min: 230, max: 310 }, gravityY: 1100, lifespan: 2600, rotate: { min: 0, max: 360 }, scaleX: { start: 1, end: 0.2 }, tint: [0xff6b5b, 0xffd23f, 0x7fd6c2, 0x9aa2ff, 0xff9ed8] }).setDepth(40);

      // fighters
      const fitScale = (key, hTarget, wMax) => { const f = this.textures.get(key).getSourceImage(); return Math.min(hTarget / f.height, wMax / f.width); };
      const hT = (PORTRAIT ? 520 : 465) * zoom, wM = (PORTRAIT ? 470 : 540) * zoom;
      const heroScale = this.H.isJack ? (PORTRAIT ? 0.9 : 0.8) * zoom : fitScale(this.H.tex, hT, wM);
      const rivScale = R.scale ? R.scale * (PORTRAIT ? 1.1 : 1) * zoom : fitScale(R.tex, hT, wM);
      this.hero = this.fighter(W * (PORTRAIT ? 0.27 : 0.28), groundY, this.H.tex, heroScale, 1, this.H.hp, false);
      this.rival = this.fighter(W * (PORTRAIT ? 0.74 : 0.72), groundY, R.tex, rivScale, -1, R.hp, !!R.isToy);
      this.hero.name = this.H.name; this.hero.napTex = this.H.napTex; this.hero.isJack = this.H.isJack;
      this.rival.name = R.nick || R.name;
      this.rmoves = R.moves.map((m, i) => Object.assign({ k: 'r' + i, w: DEF_W[m.type] || 20 }, m));

      const hy = PORTRAIT ? 200 : 150;
      this.hero.bar = this.hpBar(W * 0.27, hy, this.H.short, this.H.color, this.H.hp);
      this.rival.bar = this.hpBar(W * 0.73, hy, R.short, R.color, R.hp);
      const vs = txt(this, W / 2, hy + 10, 'VS', PORTRAIT ? 56 : 72, '#ffd23f', { stroke: '#0f1240', st: 12 });
      this.tweens.add({ targets: vs, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const intro = (R.intro || '').replace(/Jack/g, this.H.name);
      this.logT = txt(this, W / 2, groundY + (PORTRAIT ? 90 : (compact ? 42 : 55)), intro, 34, '#fff3d2', { st: 6, wrap: W * 0.9 });

      this.moves.forEach((m, i) => { m.card = this.actionCard(rects[i].x, rects[i].y, rects[i].w, rects[i].h, m); });
      backButton(this, () => { if (!this.busy || this.over) fade(this, this.rivalIdx < 0 ? 'squad' : 'map'); });
      muteButton(this);
      this.over = false; this.busy = false;
      this.banner('YOUR TURN', C.star);
      this.setCards(true);
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
      const draw = (pressed) => {
        g.clear();
        g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 10), w, h, R);
        g.fillStyle(C.cream); g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 6 : 0), w, h, R);
        g.fillStyle(0xffffff, 0.6); g.fillRoundedRect(-w / 2 + 14, -h / 2 + 9 + (pressed ? 6 : 0), w - 28, Math.min(26, h * 0.16), 12);
      };
      draw(false);
      const compact = h < 150;
      const V = !compact && w < 400;
      let L;
      if (V) L = { ix: 0, iy: -48, tx: 0, t1y: 26, t2y: 66, ox: 0.5, f1: 32, f2: 25, isz: 84, tw: w - 30 };
      else if (compact) L = { ix: -w / 2 + 58, iy: 0, tx: -w / 2 + 110, t1y: -18, t2y: 22, ox: 0, f1: 30, f2: 22, isz: 72, tw: w - 125 };
      else L = { ix: -w / 2 + (PORTRAIT ? 72 : 85), iy: 0, tx: -w / 2 + (PORTRAIT ? 140 : 165), t1y: -24, t2y: 26, ox: 0, f1: PORTRAIT ? 35 : 36, f2: PORTRAIT ? 28 : 27, isz: PORTRAIT ? 96 : 100, tw: w - (PORTRAIT ? 155 : 180) };
      const ik = a.icon || 'pillow';
      const ic = img(this, L.ix, L.iy, ik); ic.setScale(iconScale(ik, L.isz));
      const t1 = fit(txt(this, L.tx, L.t1y, a.title, L.f1, C.ink, { ox: L.ox, st: 0, shadow: false }), L.tw);
      const t2 = txt(this, L.tx, L.t2y, a.sub || '', L.f2, '#4a4f8c', { ox: L.ox, st: 0, shadow: false, weight: '500' });
      const used = txt(this, 0, 0, 'USED', compact ? 46 : 60, '#ff6b5b', { stroke: '#fff3d2', st: 8 }).setAngle(-12).setVisible(false);
      c.add([g, ic, t1, t2, used]);
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: ic, angle: { from: -6, to: 6 }, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      c.on('pointerdown', () => { if (!c.enabled) return; A.init(); draw(true); ic.y = L.iy + 6; t1.y = L.t1y + 6; t2.y = L.t2y + 6; });
      const up = () => { draw(false); ic.y = L.iy; t1.y = L.t1y; t2.y = L.t2y; };
      c.on('pointerout', up);
      c.on('pointerup', () => { up(); if (c.enabled) this.playerMove(a.k); });
      c.refresh = (on) => {
        const left = a.uses ? a.uses - (this.hero.used[a.k] || 0) : Infinity;
        const isUsed = left <= 0;
        t2.setText(a.uses ? (a.sub || '') + ' · ' + (isUsed ? 'used' : (a.uses === 1 ? 'once' : left + ' left')) : (a.sub || ''));
        fit(t2.setScale(1), L.tw);
        c.enabled = on && !isUsed; c.setAlpha(c.enabled ? 1 : (isUsed ? 0.45 : 0.7)); used.setVisible(isUsed);
      };
      return c;
    }
    setCards(on) { this.moves.forEach(m => m.card.refresh(on && !this.over)); }
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
    async hitStop(ms) { this.tweens.pauseAll(); await new Promise(r => setTimeout(r, ms)); this.tweens.resumeAll(); }
    async impact(target, dmg, kind = 'pillow', quiet = false) {
      const p = target.center();
      if (target.shield && dmg > 0) {
        dmg = Math.ceil(dmg / 2); target.shield = false; this.setStatus(target);
        A.block(); this.popWord(p.x, p.y - 220, 'BLOCKED!', '#9fdcff', 70, -6);
      }
      const crit = dmg >= 20;
      A.thump(crit ? 1.3 : (quiet ? 0.6 : 0.9)); buzz(crit ? 60 : 30);
      target.spr.setTintFill(0xffffff);
      this.time.delayedCall(90, () => target.spr.clearTint());
      this.sparks.explode(crit ? 26 : (quiet ? 8 : 14), p.x, p.y);
      if (kind !== 'roar') this.feathers.explode(quiet ? 5 : 8 + Math.round(dmg / 2), p.x, p.y - 20);
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
      const L = s => this.log(s.replace(/\{a\}/g, att.name).replace(/\{d\}/g, def.name));
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
          const tex = m.tex || 'snow'; const atlas = tex.startsWith('i:');
          const cfg = { speed: { min: 900, max: 1500 }, angle: { min: ang - 14, max: ang + 14 }, lifespan: 650, scale: { start: this.projScale(tex) * 0.35, end: this.projScale(tex) * 0.12 }, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0.3 }, frequency: 14 };
          if (atlas) cfg.frame = tex.slice(2);
          if (m.tint) cfg.tint = m.tint;
          if (tex === 'dot') cfg.scale = { start: 0.5, end: 0.2 };
          const cone = this.add.particles(f.x, f.y, atlas ? 'icons' : tex, cfg).setDepth(26);
          await wait(this, 420); cone.stop(); this.time.delayedCall(800, () => cone.destroy());
          await this.impact(def, d, 'spray');
          if (tex === 'snow') { def.spr.setTint(0x9fdcff); this.time.delayedCall(1100, () => def.spr.clearTint()); }
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
            if (i === 1) this.popWord(att.root.x - 60, att.root.y - att.height() - 40, 'SIX!', '#ff9ed8', 90, -10);
            if (i === 3) this.popWord(att.root.x + 80, att.root.y - att.height() - 40, 'SEVEN!', '#7fd6c2', 90, 10);
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
          await tw(this, { targets: att.root, y: this.groundY - 220, duration: 320, ease: 'Quad.out' });
          await tw(this, { targets: att.root, y: this.groundY, duration: 180, ease: 'Quad.in' });
          A.stomp(); buzz(90);
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
        case 'hop': {
          const sx = att.root.x, tx = def.root.x - att.dir * (PORTRAIT ? 330 : 400);
          for (let i = 1; i <= 3; i++) {
            A.tone && A.tone(400 + i * 150, 0.12, { type: 'triangle', vol: 0.15, slide: 1.6 });
            await tw(this, { targets: att.root, x: sx + (tx - sx) * i / 3, y: this.groundY - 160, duration: 180, ease: 'Quad.out' });
            await tw(this, { targets: att.root, y: this.groundY, duration: 150, ease: 'Quad.in' });
            this.tweens.add({ targets: att.squash, scaleX: 1.15, scaleY: 0.85, duration: 80, yoyo: true });
          }
          this.popWord(def.center().x, def.center().y - 220, 'BOING!', '#7fd6c2', 84, -8);
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
      const m = this.moves.find(x => x.k === k); if (!m) return;
      this.busy = true; this.setCards(false);
      const P = this.hero, T = this.rival;
      P.used[k] = (P.used[k] || 0) + 1;
      await this.doMove(m, P, T);
      if (this.checkEnd()) return;
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
    }
    async rivalTurn() {
      const T = this.rival;
      await wait(this, 450);
      this.banner(T.name.toUpperCase() + '\'S TURN', this.R.color === 0xf2f2f7 ? C.cream : this.R.color);
      await wait(this, 1100);
      if (T.dizzy) {
        T.dizzy = false; this.setStatus(T);
        this.log(T.name + ' is too dizzy to move!'); A.dizzy();
        await tw(this, { targets: T.root, angle: { from: -12, to: 12 }, duration: 180, yoyo: true, repeat: 2, onComplete: () => T.root.setAngle(0) });
        await wait(this, 500); return;
      }
      const m = this.pickMove();
      T.used[m.k] = (T.used[m.k] || 0) + 1; T.lastType = m.type;
      await this.doMove(m, T, this.hero);
    }
    pickMove() {
      const T = this.rival, P = this.hero;
      const ok = this.rmoves.filter(m => {
        if (m.uses && (T.used[m.k] || 0) >= m.uses) return false;
        if (m.type === 'heal' || m.type === 'nap') return T.hp < T.max * 0.65;
        if (m.type === 'shield') return !T.shield;
        if (m.type === 'dizzy' || m.type === 'dance') return !P.dizzy && T.lastType !== m.type;
        return true;
      });
      const pool = ok.length ? ok : this.rmoves.filter(m => m.dmg);
      const sum = pool.reduce((s, m) => s + m.w, 0); let r = Math.random() * sum;
      for (const m of pool) { r -= m.w; if (r <= 0) return m; }
      return pool[0];
    }
    checkEnd() {
      if (this.rival.hp <= 0) { this.finish(true); return true; }
      if (this.hero.hp <= 0) { this.finish(false); return true; }
      return false;
    }
    async finish(won) {
      this.over = true; this.busy = true; this.setCards(false);
      const P = this.hero, T = this.rival;
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
      const R = this.R, isCampaign = this.rivalIdx >= 0, id = R.id;
      const stars = won ? (this.hero.hp >= this.hero.max * 0.7 ? 3 : this.hero.hp >= this.hero.max * 0.35 ? 2 : 1) : 0;
      const prevStars = isCampaign ? (Save.data.stars[id] || 0) : 0;
      const firstClear = isCampaign && won && prevStars === 0;
      const gain = won ? R.xp + (firstClear ? 20 : 0) : 10;
      const before = levelOf(Save.data.xp);
      Save.data.xp += gain; if (won) Save.data.wins++;
      if (isCampaign && stars > prevStars) Save.data.stars[id] = stars;
      Save.store();
      const after = levelOf(Save.data.xp);
      const newMoves = MOVES.filter(m => m.lvl > before.l && m.lvl <= after.l);
      const nextIdx = this.rivalIdx + 1;
      const unlockedNext = firstClear && nextIdx < RIVALS.length;

      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0).setDepth(60).setInteractive();
      this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 300 });
      const pw = PORTRAIT ? 920 : 1000, ph = PORTRAIT ? 1150 : 940, T0 = -ph / 2;
      const p = this.add.container(W / 2, H / 2).setDepth(61).setScale(0);
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
      const note = txt(this, 0, T0 + 728, '', 34, '#ffd23f', { st: 6, wrap: pw - 100 });
      p.add([xpT, lvT, barBg, bar, note]);
      const notes = [];
      if (firstClear) notes.push('First win bonus +20 XP');
      if (unlockedNext) notes.push('New rival unlocked: ' + RIVALS[nextIdx].name + '!');
      if (newMoves.length && this.hero.isJack) notes.push('Jack learned: ' + newMoves.map(m => m.title).join(', ') + '!');
      note.setText(notes.join('\n')); if (notes.length > 1) note.setFontSize(30);
      const by = T0 + (PORTRAIT ? 860 : 845);
      const primary = isCampaign && won && nextIdx < RIVALS.length && isUnlocked(nextIdx)
        ? ['NEXT RIVAL', () => fade(this, 'battle', { rival: nextIdx })]
        : ['REMATCH', () => fade(this, 'battle', this.data0)];
      p.add(button(this, PORTRAIT ? 0 : -215, by, 390, 120, primary[0], C.star, primary[1], { size: 46 }));
      p.add(button(this, PORTRAIT ? 0 : 215, PORTRAIT ? by + 150 : by, 390, 120, isCampaign ? 'MAP' : 'SQUAD', C.cream, () => fade(this, isCampaign ? 'map' : 'squad'), { size: 46 }));
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

  // ---------- start
  function start() {
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent: 'game', backgroundColor: '#1d2163', width: W, height: H,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      dom: { createContainer: true },
      fps: { smoothStep: !DEBUG },
      input: { activePointers: 2 }, render: { antialias: true, powerPreference: 'high-performance' },
      scene: [Boot, Title, MapScene, SquadScene, StudioScene, Battle],
    });
    window.__game = game; window.__save = Save; window.__RIVALS = RIVALS; window.__IDB = IDB;
    let o = PORTRAIT;
    window.addEventListener('resize', () => {
      const p = window.innerHeight > window.innerWidth;
      if (p !== o) { o = p; if (!document.getElementById('toyfile') || document.activeElement.tagName !== 'INPUT') location.reload(); }
    });
    document.addEventListener('visibilitychange', () => { if (!A.ctx) return; document.hidden ? A.ctx.suspend() : A.ctx.resume(); });
  }
  const fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('500 40px Poppins')]).catch(() => {}) : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))]).then(start);
})();
