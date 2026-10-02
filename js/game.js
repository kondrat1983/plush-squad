// Plush Squad v0.3 — Jack the plush dragon vs his plush rivals. Phaser 3.
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
    data: { xp: 0, wins: 0, muted: false, stars: {} },
    load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {} },
    store() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} },
  };
  Save.load(); A.muted = !!Save.data.muted; if (!Save.data.stars) Save.data.stars = {};
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
      this.scene.start('title');
    }
  }

  // ---------- game data
  // Jack's moves. lvl = player level that unlocks it, uses = per-duel limit (0 = unlimited)
  const MOVES = [
    { k: 'pillow', lvl: 1, uses: 0, title: 'Pillow Whack', sub: '12–20 pep', icon: 'pillow', iconS: 0.5 },
    { k: 'tickle', lvl: 1, uses: 0, title: 'Tickle Attack', sub: '5–28, pure luck', icon: 'sparkles', iconS: 0.42 },
    { k: 'frost', lvl: 1, uses: 1, title: 'Frosty Sneeze', sub: '25 pep', icon: 'snow', iconS: 0.42 },
    { k: 'nap', lvl: 1, uses: 1, title: 'Upside-Down Nap', sub: '+35 pep', icon: 'zzz', iconS: 0.44 },
    { k: 'dumpling', lvl: 2, uses: 2, title: 'Dumpling Snack', sub: '+20 pep', icon: 'dumpling', iconS: 0.42 },
    { k: 'sixseven', lvl: 3, uses: 1, title: 'Six-Seven Dance', sub: 'rival gets dizzy', icon: 'dance', iconS: 0.5 },
    { k: 'tailspin', lvl: 4, uses: 0, title: 'Tail Spin', sub: '3 hits × 5–9', icon: 'dizzy', iconS: 0.42 },
  ];
  const RIVALS = [
    { id: 'timmy', name: 'Timmy the Tiger', short: 'TIMMY', tex: 'tiger', scale: 2.0, color: C.orange, hp: 100, xp: 40,
      intro: 'Timmy waves a paw: "Pillows at dawn, Jack!"', laugh: 'Timmy laughed so hard he gave up.',
      moves: [['pillow', 45, [10, 18]], ['tickle', 40, [4, 22]], ['roar', 15, [15, 24]]], roar: ['RRRRR!', 0xffb36b, 'Timmy ROARS so funny that Jack tumbles over!'] },
    { id: 'moo', name: 'Moo the Cow', short: 'MOO', tex: 'cow', scale: 2.0, color: 0xf2f2f7, hp: 120, xp: 55,
      intro: 'Moo chews slowly: "Moooove aside, little dragon."', laugh: 'Moo rolled over giggling in the hay.',
      moves: [['pillow', 35, [10, 17]], ['stomp', 30, [12, 20]], ['milk', 15, [20, 20]], ['shield', 20, [0, 0]]] },
    { id: 'sly', name: 'Sly the Snake', short: 'SLY', tex: 'snake', scale: 1.9, color: 0x5fd38d, hp: 130, xp: 70,
      intro: 'Sly hisses: "Ssssleepy already, Jack?"', laugh: 'Sly tied himself in a knot laughing.',
      moves: [['tailwhip', 40, [10, 18]], ['tickle', 25, [5, 20]], ['hypno', 15, [0, 0]], ['roar', 20, [13, 21]]], roar: ['HSSSSS!', 0x8ef0a8, 'Sly hisses so loudly Jack\'s ears flop!'] },
    { id: 'hoot', name: 'Professor Hoot', short: 'PROF. HOOT', tex: 'owl', scale: 1.9, color: 0xc89a6a, hp: 150, xp: 100, boss: true,
      intro: 'Professor Hoot adjusts his cap: "Lesson time, Jack!"', laugh: 'The Professor declared a holiday. No homework!',
      moves: [['lesson', 35, [12, 21]], ['pillow', 25, [11, 18]], ['hypno', 15, [0, 0]], ['milk', 10, [25, 25]], ['roar', 15, [14, 22]]], roar: ['HOOT HOOT!', 0xffe08a, 'Professor Hoot hoots so loud the moon wobbles!'] },
  ];
  const isUnlocked = i => i === 0 || (Save.data.stars[RIVALS[i - 1].id] || 0) > 0;
  const totalStars = () => RIVALS.reduce((s, r) => s + (Save.data.stars[r.id] || 0), 0);
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
      const jack = this.add.image(W / 2, jy, 'jack_front').setOrigin(0.5, 1).setScale(PORTRAIT ? 0.95 : 0.68);
      this.tweens.add({ targets: jack, y: jy - 34, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: sh, scaleX: 1.05, alpha: 0.6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.add.particles(0, 0, 'spark', { x: { min: W / 2 - 300, max: W / 2 + 300 }, y: { min: jy - 560, max: jy - 60 }, lifespan: 1200, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 220, tint: [C.star, 0xffffff, C.mint], rotate: { min: 0, max: 90 } }).setDepth(-0.5);
      // level panel
      const lv = levelOf(Save.data.xp);
      const px = PORTRAIT ? W / 2 : 330, py = PORTRAIT ? H * 0.43 : H * 0.62;
      const pg = this.add.graphics(); pg.fillStyle(C.night2, 0.9); pg.fillRoundedRect(px - 210, py - 105, 420, 210, 40); pg.lineStyle(4, C.seam); pg.strokeRoundedRect(px - 210, py - 105, 420, 210, 40);
      txt(this, px, py - 54, 'LEVEL ' + lv.l, 52, '#ffd23f', { st: 0 });
      this.add.rectangle(px, py + 8, 320, 26, C.night3).setStrokeStyle(3, C.seam);
      this.add.rectangle(px - 160, py + 8, Math.max(6, 320 * lv.r / lv.n), 20, C.star).setOrigin(0, 0.5);
      txt(this, px, py + 50, lv.r + ' / ' + lv.n + ' XP', 26, '#bcc0ee', { st: 0, shadow: false, weight: '500' });
      this.add.image(px - 40, py + 84, 'star').setScale(0.13);
      txt(this, px + 10, py + 84, totalStars() + ' / ' + RIVALS.length * 3, 26, '#fff3d2', { st: 0, shadow: false, ox: 0 });
      const tp = button(this, PORTRAIT ? W / 2 : W - 330, PORTRAIT ? H * 0.86 : H * 0.62, PORTRAIT ? 640 : 500, 150, 'TAP TO PLAY', C.star, () => this.go(), { size: 60 });
      this.tweens.add({ targets: tp, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      txt(this, PORTRAIT ? W / 2 : W - 330, PORTRAIT ? H * 0.86 + 120 : H * 0.62 + 115, 'Pillow duels with plush rivals', 30, '#bcc0ee', { st: 0, weight: '500' });
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
        ? [[0.3, 0.83], [0.7, 0.66], [0.3, 0.49], [0.66, 0.29]].map(([x, y]) => [W * x, H * y])
        : [[0.14, 0.7], [0.37, 0.42], [0.61, 0.7], [0.85, 0.42]].map(([x, y]) => [W * x, H * y]);
      // dashed stitched path
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
      // Jack marker at current node
      const [cx, cy] = pts[current];
      const j = this.add.image(cx - (RIVALS[current].boss ? 130 : 110) - 80, cy + 40, 'jack_side').setOrigin(0.5, 1).setScale(0.26).setDepth(5);
      this.tweens.add({ targets: j, y: j.y - 20, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
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
      const img = this.add.image(0, 8, r.tex); img.setScale((R * 1.55) / Math.max(img.width, img.height));
      c.add([g, img]);
      if (r.boss) c.add(this.add.image(0, -R - 10, 'crown').setScale(0.42));
      if (!open) { img.setTint(0x000000).setAlpha(0.75); c.add(this.add.image(0, 10, 'lock').setScale(0.42)); }
      const nameT = fit(txt(this, 0, R + 46, open ? r.name : '???', 38, open ? '#fff3d2' : '#8a8fd6', { st: 7 }), 420);
      c.add(nameT);
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

  // ---------- Battle
  class Battle extends Phaser.Scene {
    constructor() { super('battle'); }
    init(data) { this.rivalIdx = (data && data.rival) || 0; this.R = RIVALS[this.rivalIdx]; }
    create() {
      this._leaving = false;
      const R = this.R;
      this.cameras.main.fadeIn(400, 15, 18, 64);
      sky(this);
      const lv = levelOf(Save.data.xp).l;
      this.moves = MOVES.filter(m => m.lvl <= lv).map(m => Object.assign({}, m));
      // card layout (decides how much room the arena gets)
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

      // particles
      this.feathers = this.add.particles(0, 0, 'feather', { emitting: false, speed: { min: 250, max: 750 }, angle: { min: 200, max: 340 }, gravityY: 900, lifespan: { min: 1100, max: 1700 }, rotate: { start: 0, end: 540 }, scale: { start: 0.7, end: 0.45 }, alpha: { start: 1, end: 0 } }).setDepth(20);
      this.sparks = this.add.particles(0, 0, 'spark', { emitting: false, speed: { min: 300, max: 900 }, lifespan: 450, scale: { start: 0.9, end: 0 }, tint: [C.star, 0xffffff], blendMode: 'ADD' }).setDepth(21);
      this.snow = this.add.particles(0, 0, 'snow', { emitting: false, speed: { min: 600, max: 1200 }, lifespan: 700, scale: { start: 0.28, end: 0.08 }, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0.2 } }).setDepth(21);
      this.heals = this.add.particles(0, 0, 'dot', { emitting: false, speedY: { min: -500, max: -200 }, speedX: { min: -80, max: 80 }, lifespan: 1000, scale: { start: 0.45, end: 0 }, tint: [0x7fe39a, 0xd7ffb0, 0xffffff], blendMode: 'ADD' }).setDepth(21);
      this.dust = this.add.particles(0, 0, 'dot', { emitting: false, speed: { min: 200, max: 600 }, angle: { min: 180, max: 360 }, gravityY: 500, lifespan: 800, scale: { start: 0.6, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: [0xd8c7a3, 0xffffff] }).setDepth(19);
      this.notes = this.add.particles(0, 0, 'note', { emitting: false, speedY: { min: -400, max: -200 }, speedX: { min: -200, max: 200 }, lifespan: 1200, scale: { start: 0.25, end: 0.1 }, rotate: { min: -30, max: 30 }, alpha: { start: 1, end: 0 } }).setDepth(22);
      this.confetti = this.add.particles(0, 0, 'conf', { emitting: false, speed: { min: 500, max: 1300 }, angle: { min: 230, max: 310 }, gravityY: 1100, lifespan: 2600, rotate: { min: 0, max: 360 }, scaleX: { start: 1, end: 0.2 }, tint: [0xff6b5b, 0xffd23f, 0x7fd6c2, 0x9aa2ff, 0xff9ed8] }).setDepth(40);

      // fighters
      this.jackX = W * (PORTRAIT ? 0.27 : 0.28); this.rivX = W * (PORTRAIT ? 0.74 : 0.72);
      this.jack = this.fighter(this.jackX, groundY, 'jack_side', (PORTRAIT ? 0.9 : 0.8) * zoom, 1, 100);
      this.rival = this.fighter(this.rivX, groundY, R.tex, R.scale * (PORTRAIT ? 1.1 : 1) * zoom, -1, R.hp);
      this.jack.name = 'Jack'; this.rival.name = R.name.split(' ')[0] === 'Professor' ? 'Professor Hoot' : R.name.split(' ')[0];

      // HUD
      const hy = PORTRAIT ? 200 : 150;
      this.jack.bar = this.hpBar(W * 0.27, hy, 'JACK', C.mint, 100);
      this.rival.bar = this.hpBar(W * 0.73, hy, R.short, R.color, R.hp);
      const vs = txt(this, W / 2, hy + 10, 'VS', PORTRAIT ? 56 : 72, '#ffd23f', { stroke: '#0f1240', st: 12 });
      this.tweens.add({ targets: vs, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.logT = txt(this, W / 2, groundY + (PORTRAIT ? 90 : (compact ? 42 : 55)), R.intro, PORTRAIT ? 34 : 34, '#fff3d2', { st: 6, wrap: W * 0.9 });

      this.moves.forEach((m, i) => { m.card = this.actionCard(rects[i].x, rects[i].y, rects[i].w, rects[i].h, m); });
      backButton(this, () => { if (!this.busy || this.over) fade(this, 'map'); });
      muteButton(this);
      this.resetDuel();
    }

    fighter(x, y, key, scale, dir, maxHp) {
      const root = this.add.container(x, y).setDepth(10);
      const shadow = this.add.image(0, 4, 'shadow').setScale(dir > 0 ? 1.25 : 1.1, 1);
      const squash = this.add.container(0, 0);
      const spr = this.add.image(0, 0, key).setOrigin(0.5, 1).setScale(scale);
      const status = this.add.container(0, 0);
      squash.add(spr); root.add([shadow, squash, status]);
      const f = { root, squash, spr, shadow, status, scale, dir, key, hp: maxHp, max: maxHp, dizzy: false, shield: false, used: {} };
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
      if (f.dizzy) {
        const d = this.add.image(0, top, 'dizzy').setScale(0.38);
        this.tweens.add({ targets: d, angle: 360, duration: 1200, repeat: -1 });
        f.status.add(d);
      }
      if (f.shield) {
        const s = this.add.image(f.dir * -f.spr.displayWidth * 0.45, -f.height() * 0.45, 'shield').setScale(0.42).setAlpha(0.95);
        this.tweens.add({ targets: s, y: s.y - 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        f.status.add(s);
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
        reset: () => { fill.width = shine.width = ghost.width = w; val.setText('PEP ' + max); fill.fillColor = color; },
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
      const V = !compact && w < 400; // narrow & tall card: icon on top
      let L;
      if (V) L = { ix: 0, iy: -48, tx: 0, t1y: 26, t2y: 66, ox: 0.5, f1: 32, f2: 25, is: 0.8, tw: w - 30 };
      else if (compact) L = { ix: -w / 2 + 58, iy: 0, tx: -w / 2 + 110, t1y: -18, t2y: 22, ox: 0, f1: 30, f2: 22, is: 0.72, tw: w - 125 };
      else L = { ix: -w / 2 + (PORTRAIT ? 72 : 85), iy: 0, tx: -w / 2 + (PORTRAIT ? 140 : 165), t1y: -24, t2y: 26, ox: 0, f1: PORTRAIT ? 35 : 36, f2: PORTRAIT ? 28 : 27, is: PORTRAIT ? 1.05 : 1, tw: w - (PORTRAIT ? 155 : 180) };
      const ic = this.add.image(L.ix, L.iy, a.icon).setScale(a.icon === 'pillow' ? a.iconS * 1.2 * L.is * (V ? 1 : 1) : a.iconS * L.is);
      const t1 = fit(txt(this, L.tx, L.t1y, a.title, L.f1, C.ink, { ox: L.ox, st: 0, shadow: false }), L.tw);
      const t2 = txt(this, L.tx, L.t2y, a.sub, L.f2, '#4a4f8c', { ox: L.ox, st: 0, shadow: false, weight: '500' });
      const used = txt(this, 0, 0, 'USED', compact ? 46 : 60, '#ff6b5b', { stroke: '#fff3d2', st: 8 }).setAngle(-12).setVisible(false);
      c.add([g, ic, t1, t2, used]);
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: ic, angle: { from: -6, to: 6 }, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      c.on('pointerdown', () => { if (!c.enabled) return; A.init(); draw(true); ic.y = L.iy + 6; t1.y = L.t1y + 6; t2.y = L.t2y + 6; });
      const up = () => { draw(false); ic.y = L.iy; t1.y = L.t1y; t2.y = L.t2y; };
      c.on('pointerout', up);
      c.on('pointerup', () => { up(); if (c.enabled) this.playerMove(a.k); });
      c.refresh = (on) => {
        const left = a.uses ? a.uses - (this.jack.used[a.k] || 0) : Infinity;
        const isUsed = left <= 0;
        t2.setText(a.uses ? a.sub + ' · ' + (isUsed ? 'used' : (a.uses === 1 ? 'once' : left + ' left')) : a.sub);
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
    resetDuel() {
      this.over = false; this.busy = false;
      this.log(this.R.intro);
      this.banner('YOUR TURN', C.star);
      this.setCards(true);
    }
    banner(s, color) {
      const y = PORTRAIT ? H * 0.35 : H * 0.42;
      const c = this.add.container(W / 2, y).setDepth(45);
      const t = txt(this, 0, 0, s, 64, C.ink, { st: 0, shadow: false });
      const w = t.width + 120;
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
      const t = txt(this, x, y, s, size, color, { stroke: '#0f1240', st: 12 }).setDepth(41).setAngle(angle).setScale(0);
      this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.out' });
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
    heal(f, n, color = '#7fe39a') {
      A.heal(); this.heals.explode(40, f.root.x, f.root.y - 40);
      f.hp = Math.min(f.max, f.hp + n); f.bar.set(f.hp, this);
      this.number(f.center().x, f.center().y - 140, '+' + n, color);
    }
    async lunge(f, dist, dur = 160) {
      await tw(this, { targets: f.squash, scaleX: 0.9, scaleY: 1.08, duration: 120, ease: 'Quad.out' });
      this.tweens.add({ targets: f.squash, scaleX: 1.08, scaleY: 0.94, duration: dur, yoyo: true });
      await tw(this, { targets: f.root, x: f.root.x + f.dir * dist, duration: dur, ease: 'Back.out' });
    }
    async back(f) { await tw(this, { targets: f.root, x: f.home, y: this.groundY, duration: 380, ease: 'Quad.inOut' }); }
    async throwThing(from, to, tex = 'pillow', scale = 0.95, dur = 420) {
      const a = from.front(), b = to.center();
      const pil = this.add.image(a.x, a.y, tex).setDepth(25).setScale(scale);
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
      A.giggle();
      await this.impact(def, d, 'tickle');
      await this.back(att);
    }
    async rings(att, def, color, word, sound) {
      sound(); buzz(80);
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
    async makeDizzy(att, def, color) {
      A.dizzy();
      const c = att.front(), t = def.center();
      for (let i = 0; i < 6; i++) {
        const ring = this.add.image(c.x, c.y, 'ring').setDepth(22).setTint(color).setScale(0.25).setAlpha(0.95);
        this.tweens.add({ targets: ring, x: t.x, y: t.y - 60, scale: 1.4, angle: 180, alpha: 0.1, duration: 600, delay: i * 90, onComplete: () => ring.destroy() });
      }
      await wait(this, 750);
      this.tweens.add({ targets: def.root, angle: { from: -10, to: 10 }, duration: 160, yoyo: true, repeat: 3, onComplete: () => def.root.setAngle(0) });
      def.dizzy = true; this.setStatus(def);
      this.popWord(t.x, t.y - 230, 'DIZZY!', '#ffd23f', 76, 6);
      await wait(this, 700);
    }

    // ---- Jack's turn
    async playerMove(k) {
      if (this.busy || this.over) return;
      this.busy = true; this.setCards(false);
      const J = this.jack, T = this.rival, tn = T.name;
      J.used[k] = (J.used[k] || 0) + 1;
      if (k === 'pillow') {
        this.log('Jack whacks ' + tn + ' with a pillow!');
        await this.lunge(J, 60); await this.throwThing(J, T); await this.impact(T, rnd(12, 20)); await this.back(J);
      } else if (k === 'tickle') {
        const d = rnd(5, 28);
        this.log(d > 20 ? 'BELLY TICKLE! ' + tn + ' can\'t stop laughing!' : 'Jack tickles ' + tn + '!');
        await this.tickleRun(J, T, d);
      } else if (k === 'frost') {
        this.log('Ah... ah... ACHOO! A frosty sneeze!');
        A.inhale();
        await tw(this, { targets: J.squash, scaleX: 1.12, scaleY: 1.12, duration: 520, ease: 'Sine.in' });
        const f = J.front();
        A.sneeze(); buzz(40);
        this.popWord(f.x + 60, f.y - 120, 'ACHOO!', '#9fe3ff', 96, -8);
        this.tweens.add({ targets: J.squash, scaleX: 0.92, scaleY: 0.95, duration: 120, yoyo: true });
        this.tweens.add({ targets: J.squash, scaleX: 1, scaleY: 1, duration: 200, delay: 240 });
        const ang = Phaser.Math.RadToDeg(Math.atan2(T.center().y - f.y, T.center().x - f.x));
        const cone = this.add.particles(f.x, f.y, 'snow', { speed: { min: 900, max: 1500 }, angle: { min: ang - 14, max: ang + 14 }, lifespan: 650, scale: { start: 0.3, end: 0.1 }, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0.3 }, frequency: 12 }).setDepth(26);
        const mist = this.add.particles(f.x, f.y, 'dot', { speed: { min: 700, max: 1200 }, angle: { min: ang - 18, max: ang + 18 }, lifespan: 600, scale: { start: 0.2, end: 1.1 }, alpha: { start: 0.5, end: 0 }, tint: 0xbfeaff, frequency: 16 }).setDepth(25);
        await wait(this, 420); cone.stop(); mist.stop(); this.time.delayedCall(800, () => { cone.destroy(); mist.destroy(); });
        this.snow.explode(18, T.center().x, T.center().y);
        await this.impact(T, 25, 'frost');
        T.spr.setTint(0x9fdcff); this.time.delayedCall(1100, () => T.spr.clearTint());
      } else if (k === 'nap') {
        this.log('Jack flips upside down and naps mid-flight... +35 pep!');
        await tw(this, { targets: J.squash, scaleX: 0, duration: 130, ease: 'Quad.in' });
        J.spr.setTexture('jack_upside');
        await tw(this, { targets: J.squash, scaleX: 1, duration: 200, ease: 'Back.out' });
        this.tweens.add({ targets: J.root, y: this.groundY - 70, duration: 600, yoyo: true, hold: 900, ease: 'Sine.inOut' });
        A.snore();
        for (let i = 0; i < 3; i++) {
          const z = this.add.image(J.root.x + 110 + i * 30, J.root.y - J.height() * 0.85, 'zzz').setScale(0.25 + i * 0.07).setDepth(26).setAlpha(0);
          this.tweens.add({ targets: z, y: z.y - 230, x: z.x + 80, alpha: { from: 1, to: 0 }, duration: 1500, delay: i * 330, ease: 'Sine.out', onComplete: () => z.destroy() });
        }
        await wait(this, 700);
        this.heal(J, 35);
        await wait(this, 1000);
        await tw(this, { targets: J.squash, scaleX: 0, duration: 120, ease: 'Quad.in' });
        J.spr.setTexture('jack_side');
        await tw(this, { targets: J.squash, scaleX: 1, duration: 200, ease: 'Back.out' });
      } else if (k === 'dumpling') {
        this.log('Snack break! Jack gobbles a dumpling. Nom!');
        const f = J.front();
        const dm = this.add.image(f.x + 140, f.y - 40, 'dumpling').setScale(0).setDepth(26);
        await tw(this, { targets: dm, scale: 0.6, angle: 360, duration: 420, ease: 'Back.out' });
        await tw(this, { targets: dm, x: f.x, y: f.y, scale: 0.2, duration: 260, ease: 'Quad.in' });
        dm.destroy(); A.gulp();
        this.tweens.add({ targets: J.squash, scaleX: 1.15, scaleY: 0.88, duration: 120, yoyo: true, repeat: 2 });
        this.popWord(f.x + 30, f.y - 140, 'NOM!', '#ffd23f', 90, -8);
        await wait(this, 400);
        this.heal(J, 20);
        await wait(this, 600);
      } else if (k === 'sixseven') {
        this.log('Jack busts out the SIX-SEVEN dance! ' + tn + ' gets dizzy watching!');
        A.dance();
        const sx = J.root.x;
        for (let i = 0; i < 4; i++) {
          this.notes.explode(3, J.root.x, J.root.y - J.height() * 0.8);
          if (i === 1) this.popWord(J.root.x - 60, J.root.y - J.height() - 40, 'SIX!', '#ff9ed8', 90, -10);
          if (i === 3) this.popWord(J.root.x + 80, J.root.y - J.height() - 40, 'SEVEN!', '#7fd6c2', 90, 10);
          await tw(this, { targets: J.root, x: sx + (i % 2 ? 40 : -40), y: this.groundY - 60, angle: i % 2 ? 12 : -12, duration: 170, ease: 'Quad.out' });
          await tw(this, { targets: J.root, y: this.groundY, duration: 140, ease: 'Quad.in' });
        }
        await tw(this, { targets: J.root, x: sx, angle: 0, duration: 150 });
        await this.makeDizzy(J, T, 0xff9ed8);
      } else if (k === 'tailspin') {
        this.log('TAIL SPIN! Jack whirls like a plush tornado!');
        A.spin();
        const tx = T.root.x - J.dir * (PORTRAIT ? 300 : 360);
        await Promise.all([tw(this, { targets: J.root, x: tx, duration: 380, ease: 'Quad.in' }), tw(this, { targets: J.squash, angle: 720, duration: 380 })]);
        J.squash.setAngle(0);
        for (let i = 0; i < 3; i++) {
          if (this.rival.hp <= 0) break;
          this.tweens.add({ targets: J.squash, angle: 360, duration: 220, onComplete: () => J.squash.setAngle(0) });
          await this.impact(T, rnd(5, 9), 'pillow', true);
        }
        await this.back(J);
      }
      if (this.checkEnd()) return;
      await wait(this, 450);
      this.banner(T.name.toUpperCase() + '\'S TURN', this.R.color === 0xf2f2f7 ? C.cream : this.R.color);
      await wait(this, 1100);
      if (T.dizzy) {
        T.dizzy = false; this.setStatus(T);
        this.log(tn + ' is too dizzy to move!'); A.dizzy();
        await tw(this, { targets: T.root, angle: { from: -12, to: 12 }, duration: 180, yoyo: true, repeat: 2, onComplete: () => T.root.setAngle(0) });
        await wait(this, 500);
      } else {
        await this.rivalMove();
      }
      if (this.checkEnd()) return;
      await wait(this, 250);
      if (J.dizzy) {
        J.dizzy = false;
        this.banner('JACK IS DIZZY!', C.coral);
        this.log('Jack is too dizzy... he skips this turn!');
        await tw(this, { targets: J.root, angle: { from: -12, to: 12 }, duration: 180, yoyo: true, repeat: 3, onComplete: () => J.root.setAngle(0) });
        this.setStatus(J);
        await wait(this, 900);
        this.banner(T.name.toUpperCase() + '\'S TURN', this.R.color === 0xf2f2f7 ? C.cream : this.R.color);
        await wait(this, 1000);
        await this.rivalMove();
        if (this.checkEnd()) return;
        await wait(this, 250);
      }
      this.banner('YOUR TURN', C.star);
      this.busy = false; this.setCards(true);
    }

    // ---- Rival's turn
    pickMove() {
      const T = this.rival, J = this.jack;
      const ok = this.R.moves.filter(([k]) => {
        if (k === 'milk') return T.hp < T.max * 0.65 && (T.used.milk || 0) < 1;
        if (k === 'shield') return !T.shield;
        if (k === 'hypno') return !J.dizzy && (T.used.hypno || 0) < 2 && T.lastMove !== 'hypno';
        return true;
      });
      const sum = ok.reduce((s, m) => s + m[1], 0); let r = Math.random() * sum;
      for (const m of ok) { r -= m[1]; if (r <= 0) return m; }
      return ok[0];
    }
    async rivalMove() {
      const J = this.jack, T = this.rival, tn = T.name;
      const [k, , range] = this.pickMove();
      T.used[k] = (T.used[k] || 0) + 1; T.lastMove = k;
      const d = rnd(range[0], range[1]);
      if (k === 'pillow') {
        this.log(tn + ' swings a pillow at Jack!');
        await this.lunge(T, 60); await this.throwThing(T, J); await this.impact(J, d); await this.back(T);
      } else if (k === 'tickle') {
        this.log(tn + ' sneaks in for a tickle!');
        await this.tickleRun(T, J, d);
      } else if (k === 'roar') {
        const [word, color, line] = this.R.roar;
        this.log(line);
        const snd = this.R.id === 'sly' ? () => A.hiss() : (this.R.id === 'hoot' ? () => A.hoot() : () => A.roar());
        await this.rings(T, J, color, word, snd);
        await this.impact(J, d, 'roar');
      } else if (k === 'stomp') {
        this.log('MOO-QUAKE! Moo stomps and the whole blanket shakes!');
        A.moo();
        await tw(this, { targets: T.root, y: this.groundY - 220, duration: 320, ease: 'Quad.out' });
        await tw(this, { targets: T.root, y: this.groundY, duration: 180, ease: 'Quad.in' });
        A.stomp(); buzz(90);
        this.cameras.main.shake(450, 0.016);
        this.dust.explode(26, T.root.x - 120, this.groundY); this.dust.explode(26, T.root.x + 120, this.groundY);
        this.tweens.add({ targets: T.squash, scaleX: 1.2, scaleY: 0.8, duration: 90, yoyo: true });
        await tw(this, { targets: J.root, y: this.groundY - 150, duration: 220, ease: 'Quad.out', yoyo: true });
        await this.impact(J, d, 'roar');
      } else if (k === 'milk') {
        this.log(tn + ' takes a milk break. Refreshing!');
        const f = T.front();
        const m = this.add.image(f.x - 120, f.y - 60, 'milk').setScale(0).setDepth(26);
        await tw(this, { targets: m, scale: 0.55, duration: 300, ease: 'Back.out' });
        await tw(this, { targets: m, x: f.x, y: f.y, angle: -40, duration: 300 });
        A.gulp(); this.tweens.add({ targets: T.squash, scaleX: 1.12, scaleY: 0.9, duration: 120, yoyo: true, repeat: 2 });
        await wait(this, 300); m.destroy();
        this.heal(T, d);
        await wait(this, 600);
      } else if (k === 'shield') {
        this.log(tn + ' hides behind a shield. Next hit only does half!');
        A.block();
        T.shield = true; this.setStatus(T);
        this.tweens.add({ targets: T.squash, scaleX: 0.92, scaleY: 1.06, duration: 160, yoyo: true });
        await wait(this, 900);
      } else if (k === 'tailwhip') {
        this.log('Sly whips his tail like a jump rope!');
        A.whoosh();
        await tw(this, { targets: T.root, x: J.root.x + (PORTRAIT ? 330 : 400), duration: 260, ease: 'Quad.out' });
        await tw(this, { targets: T.squash, angle: 25, duration: 120, yoyo: true });
        await this.impact(J, d);
        await this.back(T);
      } else if (k === 'hypno') {
        this.log(this.R.id === 'hoot' ? 'Professor Hoot gives Jack THE STARE...' : 'Sly does the hypno-sway... Jack feels wobbly!');
        if (this.R.id === 'hoot') A.hoot(); else A.hiss();
        this.tweens.add({ targets: T.root, angle: { from: -8, to: 8 }, duration: 260, yoyo: true, repeat: 2, onComplete: () => T.root.setAngle(0) });
        await this.makeDizzy(T, J, this.R.id === 'hoot' ? 0xffe08a : 0xb38cff);
      } else if (k === 'lesson') {
        this.log('POP QUIZ! Professor Hoot throws books at Jack!');
        A.hoot();
        this.popWord(T.front().x - 80, T.front().y - 170, 'LESSON TIME!', '#ffe08a', 72, 6);
        const per = Math.ceil(d / 3);
        for (let i = 0; i < 3; i++) {
          await this.throwThing(T, J, 'books', 0.5, 300);
          await this.impact(J, i < 2 ? per : Math.max(1, d - per * 2), 'pillow', true);
          if (J.hp <= 0) break;
        }
      }
    }
    checkEnd() {
      if (this.rival.hp <= 0) { this.finish(true); return true; }
      if (this.jack.hp <= 0) { this.finish(false); return true; }
      return false;
    }
    async finish(won) {
      this.over = true; this.busy = true; this.setCards(false);
      const J = this.jack, T = this.rival;
      if (won) {
        this.log(this.R.laugh + ' Jack wins!');
        await tw(this, { targets: T.root, angle: 28, duration: 380, ease: 'Back.out' });
        this.tweens.add({ targets: T.squash, scaleY: 0.9, scaleX: 1.06, duration: 110, yoyo: true, repeat: 7 });
        this.popWord(T.center().x + 40, T.center().y - 200, 'HAHAHA', '#ff9ed8', 80, 8);
        A.win(); buzz([40, 60, 40]);
        this.confetti.explode(90, W * 0.25, H); this.confetti.explode(90, W * 0.75, H);
        for (let i = 0; i < 3; i++) await tw(this, { targets: J.root, y: this.groundY - 140, duration: 230, yoyo: true, ease: 'Quad.out' });
      } else {
        this.log('Jack is too sleepy to go on...');
        await tw(this, { targets: J.squash, scaleX: 0, duration: 130 });
        J.spr.setTexture('jack_upside');
        await tw(this, { targets: J.squash, scaleX: 1, duration: 200, ease: 'Back.out' });
        A.lose();
        for (let i = 0; i < 3; i++) {
          const z = this.add.image(J.root.x + 120, J.root.y - J.height() * 0.8, 'zzz').setScale(0.3).setDepth(26).setAlpha(0);
          this.tweens.add({ targets: z, y: z.y - 230, x: z.x + 70, alpha: { from: 1, to: 0 }, duration: 1600, delay: i * 400, onComplete: () => z.destroy() });
        }
        this.tweens.add({ targets: T.root, y: this.groundY - 100, duration: 250, yoyo: true, repeat: 2 });
        await wait(this, 1200);
      }
      this.result(won);
    }
    result(won) {
      const R = this.R, id = R.id;
      const stars = won ? (this.jack.hp >= 70 ? 3 : this.jack.hp >= 35 ? 2 : 1) : 0;
      const prevStars = Save.data.stars[id] || 0;
      const firstClear = won && prevStars === 0;
      const gain = won ? R.xp + (firstClear ? 20 : 0) : 10;
      const before = levelOf(Save.data.xp);
      Save.data.xp += gain; if (won) Save.data.wins++;
      if (stars > prevStars) Save.data.stars[id] = stars;
      Save.store();
      const after = levelOf(Save.data.xp);
      const newMoves = MOVES.filter(m => m.lvl > before.l && m.lvl <= after.l);
      const nextIdx = this.rivalIdx + 1;
      const unlockedNext = firstClear && nextIdx < RIVALS.length;

      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0).setDepth(60).setInteractive();
      this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 300 });
      const pw = PORTRAIT ? 920 : 1000, ph = PORTRAIT ? 1150 : 940, T0 = -ph / 2;
      const p = this.add.container(W / 2, H / 2).setDepth(61).setScale(0);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-pw / 2, T0 + 16, pw, ph, 60);
      g.fillStyle(C.night2); g.fillRoundedRect(-pw / 2, T0, pw, ph, 60);
      g.lineStyle(6, C.seam); g.strokeRoundedRect(-pw / 2 + 16, T0 + 16, pw - 32, ph - 32, 48);
      const icon = this.add.image(0, T0 + 120, won ? 'trophy' : 'zzz').setScale(won ? 0.7 : 0.7);
      this.tweens.add({ targets: icon, y: icon.y - 12, angle: { from: -5, to: 5 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const title = txt(this, 0, T0 + 265, won ? 'YOU WIN!' : 'SO SLEEPY...', 100, won ? '#ffd23f' : '#bcc0ee', { stroke: '#0f1240', st: 14 });
      const sub = txt(this, 0, T0 + 345, won ? R.laugh : 'Jack needs a nap. Next time for sure!', 34, '#fff3d2', { st: 0, weight: '500', wrap: pw - 120 });
      p.add([g, icon, title, sub]);
      // stars
      const sr = [];
      for (let i = 0; i < 3; i++) {
        const s = this.add.image((i - 1) * 120, T0 + 445 - (i === 1 ? 14 : 0), 'star').setScale(0.42).setTint(0x3a3f7a);
        p.add(s); sr.push(s);
      }
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
      if (newMoves.length) notes.push('New move: ' + newMoves.map(m => m.title).join(', ') + '!');
      note.setText(notes.join('\n')); if (notes.length > 1) note.setFontSize(30);
      const by = T0 + (PORTRAIT ? 860 : 845);
      const primary = won && nextIdx < RIVALS.length && isUnlocked(nextIdx)
        ? ['NEXT RIVAL', () => fade(this, 'battle', { rival: nextIdx })]
        : ['REMATCH', () => fade(this, 'battle', { rival: this.rivalIdx })];
      const b1 = button(this, PORTRAIT ? 0 : -215, PORTRAIT ? by : by, 390, 120, primary[0], C.star, primary[1], { size: 46 });
      const b2 = button(this, PORTRAIT ? 0 : 215, PORTRAIT ? by + 150 : by, 390, 120, 'MAP', C.cream, () => fade(this, 'map'), { size: 46 });
      p.add([b1, b2]);
      this.tweens.add({ targets: p, scale: 1, duration: 420, ease: 'Back.out' });
      // stars pop in
      for (let i = 0; i < stars; i++) {
        this.time.delayedCall(600 + i * 280, () => {
          sr[i].clearTint(); A.starDing(i);
          this.tweens.add({ targets: sr[i], scale: { from: 0.8, to: 0.42 }, angle: { from: -30, to: 0 }, duration: 320, ease: 'Back.out' });
          this.sparks.explode(10, W / 2 + (i - 1) * 120, H / 2 + T0 + 445);
        });
      }
      const o = { v: 0 };
      this.tweens.add({ targets: o, v: gain, duration: 900, delay: 500 + stars * 280, onUpdate: () => { xpT.setText('+' + Math.round(o.v) + ' XP'); if (Math.random() < 0.5) A.tick(); } });
      this.time.delayedCall(800 + stars * 280, () => {
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
  // Fighter "home" x is where it returns after moving
  const _fighter = Battle.prototype.fighter;
  Battle.prototype.fighter = function (x, ...rest) { const f = _fighter.call(this, x, ...rest); f.home = x; return f; };

  // ---------- start
  function start() {
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent: 'game', backgroundColor: '#1d2163', width: W, height: H,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      fps: { smoothStep: !DEBUG },
      input: { activePointers: 2 }, render: { antialias: true, powerPreference: 'high-performance' },
      scene: [Boot, Title, MapScene, Battle],
    });
    window.__game = game; window.__save = Save; window.__RIVALS = RIVALS;
    let o = PORTRAIT;
    window.addEventListener('resize', () => { const p = window.innerHeight > window.innerWidth; if (p !== o) { o = p; location.reload(); } });
    document.addEventListener('visibilitychange', () => { if (!A.ctx) return; document.hidden ? A.ctx.suspend() : A.ctx.resume(); });
  }
  const fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('500 40px Poppins')]).catch(() => {}) : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))]).then(start);
})();
