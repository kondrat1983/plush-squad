// Plush Squad v0.2 — Jack the dragon vs Timmy the Tiger. Phaser 3.
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
    data: { xp: 0, wins: 0, muted: false },
    load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {} },
    store() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} },
  };
  Save.load(); A.muted = !!Save.data.muted;
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
      ['jack_side', 'jack_upside', 'jack_front', 'tiger', 'moon', 'cloud', 'zzz', 'snow', 'star', 'trophy', 'heart', 'sparkles']
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

  // ---------- Title
  class Title extends Phaser.Scene {
    constructor() { super('title'); }
    create() {
      this.cameras.main.fadeIn(400, 15, 18, 64);
      sky(this);
      this.add.image(W / 2, H + 40, 'ground').setOrigin(0.5, 1).setScale(1, PORTRAIT ? 0.55 : 0.6);
      const moon = this.add.image(PORTRAIT ? W * 0.8 : W * 0.84, PORTRAIT ? H * 0.12 : H * 0.2, 'moon').setScale(PORTRAIT ? 1.1 : 1.3);
      this.tweens.add({ targets: moon, angle: 8, y: moon.y + 14, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      // logo
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
      // Jack
      const jy = PORTRAIT ? H * 0.75 : H * 0.95;
      const sh = this.add.image(W / 2, jy + 6, 'shadow').setScale(1.3, 1);
      const jack = this.add.image(W / 2, jy, 'jack_front').setOrigin(0.5, 1).setScale(PORTRAIT ? 0.95 : 0.68);
      this.tweens.add({ targets: jack, y: jy - 34, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: sh, scaleX: 1.05, alpha: 0.6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const sp = this.add.particles(0, 0, 'spark', { x: { min: W / 2 - 300, max: W / 2 + 300 }, y: { min: jy - 560, max: jy - 60 }, lifespan: 1200, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 220, tint: [C.star, 0xffffff, C.mint], rotate: { min: 0, max: 90 } });
      sp.setDepth(-0.5);
      // level panel
      const lv = levelOf(Save.data.xp);
      const px = PORTRAIT ? W / 2 : 330, py = PORTRAIT ? H * 0.43 : H * 0.62;
      const pg = this.add.graphics(); pg.fillStyle(C.night2, 0.9); pg.fillRoundedRect(px - 210, py - 95, 420, 190, 40); pg.lineStyle(4, C.seam); pg.strokeRoundedRect(px - 210, py - 95, 420, 190, 40);
      txt(this, px, py - 44, 'LEVEL ' + lv.l, 52, '#ffd23f', { st: 0 });
      this.add.rectangle(px, py + 20, 320, 26, C.night3).setStrokeStyle(3, C.seam);
      this.add.rectangle(px - 160, py + 20, Math.max(6, 320 * lv.r / lv.n), 20, C.star).setOrigin(0, 0.5);
      txt(this, px, py + 60, lv.r + ' / ' + lv.n + ' XP · ' + Save.data.wins + ' wins', 26, '#bcc0ee', { st: 0, shadow: false, weight: '500' });
      // tap to play
      const tp = button(this, PORTRAIT ? W / 2 : W - 330, PORTRAIT ? H * 0.86 : H * 0.62, PORTRAIT ? 640 : 500, 150, 'TAP TO PLAY', C.star, () => this.go(), { size: 60 });
      this.tweens.add({ targets: tp, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      txt(this, PORTRAIT ? W / 2 : W - 330, PORTRAIT ? H * 0.86 + 120 : H * 0.62 + 115, 'Pillow Duel vs Timmy the Tiger', 30, '#bcc0ee', { st: 0, weight: '500' });
      muteButton(this);
      this.input.keyboard && this.input.keyboard.once('keydown-SPACE', () => this.go());
    }
    go() {
      if (this.leaving) return; this.leaving = true;
      A.init(); A.startMusic(); A.whoosh();
      this.cameras.main.fadeOut(350, 15, 18, 64);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('battle'));
    }
  }

  // ---------- Battle
  class Battle extends Phaser.Scene {
    constructor() { super('battle'); }
    create() {
      this.cameras.main.fadeIn(400, 15, 18, 64);
      sky(this);
      const groundY = PORTRAIT ? H * 0.57 : H * 0.68;
      this.groundY = groundY;
      const moon = this.add.image(W / 2, PORTRAIT ? H * 0.2 : H * 0.24, 'moon').setScale(PORTRAIT ? 0.6 : 0.62).setAlpha(0.95);
      this.tweens.add({ targets: moon, angle: -6, y: moon.y + 12, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.add.image(W / 2, groundY - (PORTRAIT ? 230 : 300), 'ground').setOrigin(0.5, 0).setScale(1, PORTRAIT ? 1.6 : 0.9);

      // particles
      this.feathers = this.add.particles(0, 0, 'feather', { emitting: false, speed: { min: 250, max: 750 }, angle: { min: 200, max: 340 }, gravityY: 900, lifespan: { min: 1100, max: 1700 }, rotate: { start: 0, end: 540 }, scale: { start: 0.7, end: 0.45 }, alpha: { start: 1, end: 0 } }).setDepth(20);
      this.sparks = this.add.particles(0, 0, 'spark', { emitting: false, speed: { min: 300, max: 900 }, lifespan: 450, scale: { start: 0.9, end: 0 }, tint: [C.star, 0xffffff], blendMode: 'ADD' }).setDepth(21);
      this.snow = this.add.particles(0, 0, 'snow', { emitting: false, speed: { min: 600, max: 1200 }, lifespan: 700, scale: { start: 0.28, end: 0.08 }, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0.2 } }).setDepth(21);
      this.heals = this.add.particles(0, 0, 'dot', { emitting: false, speedY: { min: -500, max: -200 }, speedX: { min: -80, max: 80 }, lifespan: 1000, scale: { start: 0.45, end: 0 }, tint: [0x7fe39a, 0xd7ffb0, 0xffffff], blendMode: 'ADD' }).setDepth(21);
      this.confetti = this.add.particles(0, 0, 'conf', { emitting: false, speed: { min: 500, max: 1300 }, angle: { min: 230, max: 310 }, gravityY: 1100, lifespan: 2600, rotate: { min: 0, max: 360 }, scaleX: { start: 1, end: 0.2 }, tint: [0xff6b5b, 0xffd23f, 0x7fd6c2, 0x9aa2ff, 0xff9ed8] }).setDepth(40);

      // fighters
      const fs = PORTRAIT ? 0.9 : 0.8;
      this.jack = this.fighter(W * (PORTRAIT ? 0.27 : 0.28), groundY, 'jack_side', fs, 1);
      this.tiger = this.fighter(W * (PORTRAIT ? 0.74 : 0.72), groundY, 'tiger', PORTRAIT ? 2.2 : 2.0, -1);
      this.jack.name = 'Jack'; this.tiger.name = 'Timmy';

      // HUD
      const hy = PORTRAIT ? 190 : 110;
      this.jack.bar = this.hpBar(PORTRAIT ? W * 0.27 : W * 0.25, hy, 'JACK', C.mint);
      this.tiger.bar = this.hpBar(PORTRAIT ? W * 0.73 : W * 0.75, hy, 'TIMMY', C.orange);
      const vs = txt(this, W / 2, hy + 10, 'VS', PORTRAIT ? 56 : 72, '#ffd23f', { stroke: '#0f1240', st: 12 });
      this.tweens.add({ targets: vs, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.logT = txt(this, W / 2, groundY + (PORTRAIT ? 90 : 55), 'Timmy waves a paw: "Pillows at dawn, Jack!"', PORTRAIT ? 34 : 36, '#fff3d2', { st: 6, wrap: W * 0.9 });

      // actions
      this.actions = [
        { k: 'pillow', title: 'Pillow Whack', sub: '12–20 pep', icon: 'pillow', iconS: 0.5 },
        { k: 'tickle', title: 'Tickle Attack', sub: '5–28, pure luck', icon: 'sparkles', iconS: 0.42 },
        { k: 'frost', title: 'Frosty Sneeze', sub: '25 pep · once', icon: 'snow', iconS: 0.42 },
        { k: 'nap', title: 'Upside-Down Nap', sub: '+35 pep · once', icon: 'zzz', iconS: 0.44 },
      ];
      this.actions.forEach((a, i) => {
        let x, y, w, h;
        if (PORTRAIT) { w = 490; h = 200; x = W / 2 + (i % 2 ? 1 : -1) * 258; y = H - 130 - 70 - (1 - Math.floor(i / 2)) * 228; }
        else { w = Math.min(430, (W - 100) / 4 - 22); h = w < 400 ? 200 : 170; x = W / 2 + (i - 1.5) * (w + 24); y = H - h / 2 - 25; }
        a.card = this.actionCard(x, y, w, h, a);
      });
      muteButton(this);
      this.resetDuel();
    }

    fighter(x, y, key, scale, dir) {
      const root = this.add.container(x, y).setDepth(10);
      const shadow = this.add.image(0, 4, 'shadow').setScale(dir > 0 ? 1.25 : 1.1, 1);
      const squash = this.add.container(0, 0);
      const spr = this.add.image(0, 0, key).setOrigin(0.5, 1).setScale(scale);
      squash.add(spr); root.add([shadow, squash]);
      const f = { root, squash, spr, shadow, scale, dir, key, hp: 100 };
      f.idle = this.tweens.add({ targets: spr, scaleY: scale * 1.035, scaleX: scale * 0.99, duration: 950 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      f.bob = this.tweens.add({ targets: spr, y: -10, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * 500 });
      f.height = () => spr.displayHeight;
      f.center = () => ({ x: root.x + (dir > 0 ? 40 : -10), y: root.y - spr.displayHeight * 0.55 });
      f.front = () => ({ x: root.x + dir * spr.displayWidth * 0.38, y: root.y - spr.displayHeight * (dir > 0 ? 0.72 : 0.62) });
      return f;
    }
    hpBar(x, y, name, color) {
      const w = PORTRAIT ? 370 : Math.min(560, W * 0.33), h = 44;
      const c = this.add.container(x, y).setDepth(30);
      const back = this.add.graphics();
      back.fillStyle(0x0f1240, 0.85); back.fillRoundedRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 30);
      back.lineStyle(4, C.seam); back.strokeRoundedRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 30);
      const ghost = this.add.rectangle(-w / 2, 0, w, h - 8, 0xffffff).setOrigin(0, 0.5);
      const fill = this.add.rectangle(-w / 2, 0, w, h - 8, color).setOrigin(0, 0.5);
      const shine = this.add.rectangle(-w / 2, -8, w, 8, 0xffffff, 0.3).setOrigin(0, 0.5);
      const label = txt(this, -w / 2 + 4, -h / 2 - 34, name, 38, '#fff3d2', { ox: 0, st: 7 });
      const val = txt(this, w / 2 - 4, -h / 2 - 34, 'PEP 100', 32, '#bcc0ee', { ox: 1, st: 6 });
      c.add([back, ghost, fill, shine, label, val]);
      return {
        set: (hp, scene) => {
          const tw2 = w * Math.max(0, hp) / 100;
          scene.tweens.add({ targets: [fill, shine], width: tw2, duration: 260, ease: 'Quad.out' });
          scene.tweens.add({ targets: ghost, width: tw2, duration: 500, delay: 420, ease: 'Quad.inOut' });
          val.setText('PEP ' + Math.max(0, hp));
          scene.tweens.add({ targets: c, scale: { from: 1.07, to: 1 }, duration: 260, ease: 'Back.out' });
          fill.fillColor = hp < 30 ? C.coral : color;
        },
        reset: () => { fill.width = shine.width = ghost.width = w; val.setText('PEP 100'); fill.fillColor = color; },
      };
    }
    actionCard(x, y, w, h, a) {
      const c = this.add.container(x, y).setDepth(30);
      const g = this.add.graphics();
      const draw = (pressed) => {
        g.clear();
        g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 4 : 12), w, h, 34);
        g.fillStyle(C.cream); g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 6 : 0), w, h, 34);
        g.fillStyle(0xffffff, 0.6); g.fillRoundedRect(-w / 2 + 14, -h / 2 + 10 + (pressed ? 6 : 0), w - 28, 26, 13);
      };
      draw(false);
      const V = w < 400; // narrow card: icon on top, text centered
      const L = V ? { ix: 0, iy: -48, tx: 0, t1y: 26, t2y: 66, ox: 0.5, f1: 32, f2: 25, is: 0.8 } : { ix: -w / 2 + (PORTRAIT ? 72 : 85), iy: 0, tx: -w / 2 + (PORTRAIT ? 140 : 165), t1y: -24, t2y: 26, ox: 0, f1: PORTRAIT ? 35 : 36, f2: PORTRAIT ? 28 : 27, is: PORTRAIT ? 1.05 : 1 };
      const ic = this.add.image(L.ix, L.iy, a.icon).setScale(a.icon === 'pillow' ? a.iconS * 1.2 * (V ? 0.8 : 1) : a.iconS * L.is);
      const t1 = txt(this, L.tx, L.t1y, a.title, L.f1, C.ink, { ox: L.ox, st: 0, shadow: false });
      const t2 = txt(this, L.tx, L.t2y, a.sub, L.f2, '#4a4f8c', { ox: L.ox, st: 0, shadow: false, weight: '500' });
      const used = txt(this, 0, 0, 'USED', 60, '#ff6b5b', { stroke: '#fff3d2', st: 8 }).setAngle(-12).setVisible(false);
      c.add([g, ic, t1, t2, used]);
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: ic, angle: { from: -6, to: 6 }, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      c.on('pointerdown', () => { if (!c.enabled) return; A.init(); draw(true); ic.y = L.iy + 6; t1.y = L.t1y + 6; t2.y = L.t2y + 6; });
      const up = () => { draw(false); ic.y = L.iy; t1.y = L.t1y; t2.y = L.t2y; };
      c.on('pointerout', up);
      c.on('pointerup', () => { up(); if (c.enabled) this.playerMove(a.k); });
      c.setEnabled = (on, isUsed) => {
        c.enabled = on; c.setAlpha(on ? 1 : (isUsed ? 0.45 : 0.7)); used.setVisible(!!isUsed);
      };
      return c;
    }
    setCards(on) {
      this.actions.forEach(a => {
        const isUsed = (a.k === 'frost' && this.used.frost) || (a.k === 'nap' && this.used.nap);
        a.card.setEnabled(on && !isUsed && !this.over, isUsed);
      });
    }
    log(s) {
      this.logT.setText(s);
      this.tweens.add({ targets: this.logT, scale: { from: 1.12, to: 1 }, alpha: { from: 0.4, to: 1 }, duration: 260, ease: 'Back.out' });
    }
    resetDuel() {
      this.over = false; this.busy = false; this.used = { frost: false, nap: false };
      [this.jack, this.tiger].forEach(f => { f.hp = 100; f.bar.reset(); f.spr.setTexture(f.key).clearTint(); f.root.setAngle(0); f.squash.setScale(1); f.root.y = this.groundY; });
      this.jack.root.x = W * (PORTRAIT ? 0.27 : 0.28); this.tiger.root.x = W * (PORTRAIT ? 0.74 : 0.72);
      this.log('Timmy waves a paw: "Pillows at dawn, Jack!"');
      this.banner('YOUR TURN', C.star);
      this.setCards(true);
    }
    banner(s, color) {
      const y = PORTRAIT ? H * 0.35 : H * 0.42;
      const c = this.add.container(W / 2, y).setDepth(45);
      const w = s.length * 46 + 120;
      const g = this.add.graphics(); g.fillStyle(color); g.fillRoundedRect(-w / 2, -55, w, 110, 55);
      g.lineStyle(6, 0xffffff); g.strokeRoundedRect(-w / 2, -55, w, 110, 55);
      const t = txt(this, 0, 0, s, 64, C.ink, { st: 0, shadow: false });
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
    async hitStop(ms) {
      this.tweens.pauseAll();
      await new Promise(r => setTimeout(r, ms));
      this.tweens.resumeAll();
    }
    async impact(target, dmg, kind = 'pillow') {
      const p = target.center(); const crit = dmg >= 20;
      A.thump(crit ? 1.3 : 0.9); buzz(crit ? 60 : 30);
      target.spr.setTintFill(0xffffff);
      this.time.delayedCall(90, () => target.spr.clearTint());
      this.sparks.explode(crit ? 26 : 14, p.x, p.y);
      if (kind !== 'roar') this.feathers.explode(8 + Math.round(dmg / 2), p.x, p.y - 20);
      const ring = this.add.image(p.x, p.y, 'ring').setDepth(22).setScale(0.3).setAlpha(0.9);
      this.tweens.add({ targets: ring, scale: crit ? 2.6 : 1.8, alpha: 0, duration: 380, ease: 'Quad.out', onComplete: () => ring.destroy() });
      this.cameras.main.shake(crit ? 320 : 180, crit ? 0.014 : 0.006);
      if (crit) { A.crit(); this.cameras.main.zoomTo(1.05, 90); this.time.delayedCall(260, () => this.cameras.main.zoomTo(1, 260)); }
      await this.hitStop(crit ? 130 : 60);
      target.hp = Math.max(0, target.hp - dmg); target.bar.set(target.hp, this);
      this.number(p.x, p.y - 120, '-' + dmg, target === this.tiger ? '#ffd23f' : '#ff6b5b');
      if (crit) this.popWord(p.x + (target.dir > 0 ? -150 : 150), p.y - 260, 'CRIT!', '#ff6b5b', 76, -10);
      // squash + knockback
      const kb = -target.dir * (crit ? 90 : 50);
      this.tweens.add({ targets: target.squash, scaleX: 1.18, scaleY: 0.82, duration: 70, yoyo: true, ease: 'Quad.out' });
      await tw(this, { targets: target.root, x: target.root.x + kb, angle: -target.dir * (crit ? 10 : 5), duration: 110, ease: 'Quad.out' });
      await tw(this, { targets: target.root, x: target.root.x - kb, angle: 0, duration: 420, ease: 'Elastic.out', easeParams: [1, 0.5] });
    }
    async lunge(f, dist, dur = 160) {
      await tw(this, { targets: f.squash, scaleX: 0.9, scaleY: 1.08, duration: 120, ease: 'Quad.out' });
      this.tweens.add({ targets: f.squash, scaleX: 1.08, scaleY: 0.94, duration: dur, yoyo: true });
      await tw(this, { targets: f.root, x: f.root.x + f.dir * dist, duration: dur, ease: 'Back.out' });
    }
    async back(f, x) { await tw(this, { targets: f.root, x, duration: 380, ease: 'Quad.inOut' }); }
    async throwPillow(from, to) {
      const a = from.front(), b = to.center();
      const pil = this.add.image(a.x, a.y, 'pillow').setDepth(25).setScale(0.95);
      A.whoosh();
      const trail = this.add.particles(0, 0, 'feather', { follow: pil, frequency: 45, lifespan: 500, scale: { start: 0.35, end: 0 }, alpha: { start: 0.8, end: 0 }, speed: 40, rotate: { min: 0, max: 360 } }).setDepth(24);
      const o = { t: 0 };
      await tw(this, { targets: o, t: 1, duration: 420, ease: 'Sine.in', onUpdate: () => {
        pil.x = a.x + (b.x - a.x) * o.t; pil.y = a.y + (b.y - a.y) * o.t - Math.sin(Math.PI * o.t) * 220; pil.angle = from.dir * o.t * 540;
      } });
      trail.stop(); this.time.delayedCall(600, () => trail.destroy());
      pil.destroy();
    }

    async playerMove(k) {
      if (this.busy || this.over) return;
      this.busy = true; this.setCards(false);
      const J = this.jack, T = this.tiger, home = J.root.x;
      if (k === 'pillow') {
        const d = rnd(12, 20);
        this.log('Jack whacks Timmy with a pillow!');
        await this.lunge(J, 60); await this.throwPillow(J, T); await this.impact(T, d); await this.back(J, home);
      } else if (k === 'tickle') {
        const d = rnd(5, 28);
        this.log(d > 20 ? 'BELLY TICKLE! Timmy can\'t stop laughing!' : 'Jack tickles Timmy!');
        const tx = T.root.x - J.dir * (PORTRAIT ? 300 : 360);
        A.whoosh();
        await tw(this, { targets: J.root, x: tx, y: this.groundY - 60, duration: 330, ease: 'Quad.out' });
        await tw(this, { targets: J.root, y: this.groundY, duration: 160, ease: 'Quad.in' });
        A.tickle();
        const words = ['tickle!', 'hehe', 'tickle!'];
        for (let i = 0; i < 3; i++) {
          this.popWord(T.center().x + rnd(-120, 120), T.center().y - 150 - i * 50, words[i], i % 2 ? '#ff9ed8' : '#fff3d2', 56, rnd(-15, 15));
          this.tweens.add({ targets: J.squash, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 1 });
          await tw(this, { targets: T.root, angle: i % 2 ? 7 : -7, duration: 90, yoyo: true });
        }
        A.giggle();
        await this.impact(T, d, 'tickle');
        await this.back(J, home);
      } else if (k === 'frost') {
        this.used.frost = true; const d = 25;
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
        T.spr.setTint(0x9fdcff);
        this.snow.explode(18, T.center().x, T.center().y);
        await this.impact(T, d, 'frost');
        T.spr.setTint(0x9fdcff);
        this.time.delayedCall(1100, () => T.spr.clearTint());
      } else if (k === 'nap') {
        this.used.nap = true;
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
        A.heal(); this.heals.explode(40, J.root.x, J.root.y - 40);
        J.hp = Math.min(100, J.hp + 35); J.bar.set(J.hp, this);
        this.number(J.center().x, J.center().y - 140, '+35', '#7fe39a');
        await wait(this, 1000);
        await tw(this, { targets: J.squash, scaleX: 0, duration: 120, ease: 'Quad.in' });
        J.spr.setTexture('jack_side');
        await tw(this, { targets: J.squash, scaleX: 1, duration: 200, ease: 'Back.out' });
      }
      if (this.checkEnd()) return;
      await wait(this, 450);
      this.banner('TIMMY\'S TURN', C.orange);
      await wait(this, 1100);
      await this.tigerMove();
      if (this.checkEnd()) return;
      await wait(this, 250);
      this.banner('YOUR TURN', C.star);
      this.busy = false; this.setCards(true);
    }
    async tigerMove() {
      const J = this.jack, T = this.tiger, home = T.root.x, r = Math.random();
      if (r < 0.45) {
        const d = rnd(10, 18); this.log('Timmy swings a pillow at Jack!');
        await this.lunge(T, 60); await this.throwPillow(T, J); await this.impact(J, d); await this.back(T, home);
      } else if (r < 0.85) {
        const d = rnd(4, 22); this.log('Timmy sneaks in for a tickle!');
        A.whoosh();
        await tw(this, { targets: T.root, x: J.root.x + (PORTRAIT ? 300 : 380), y: this.groundY - 50, duration: 320, ease: 'Quad.out' });
        await tw(this, { targets: T.root, y: this.groundY, duration: 150, ease: 'Quad.in' });
        A.tickle();
        for (let i = 0; i < 3; i++) {
          this.popWord(J.center().x + rnd(-120, 120), J.center().y - 150 - i * 50, i === 1 ? 'hehe' : 'tickle!', i % 2 ? '#ff9ed8' : '#fff3d2', 56, rnd(-15, 15));
          await tw(this, { targets: J.root, angle: i % 2 ? 7 : -7, duration: 90, yoyo: true });
        }
        A.giggle();
        await this.impact(J, d, 'tickle'); await this.back(T, home);
      } else {
        const d = rnd(15, 24); this.log('Timmy ROARS so funny that Jack tumbles over!');
        A.roar(); buzz(80);
        this.tweens.add({ targets: T.squash, scaleX: 1.18, scaleY: 1.18, duration: 200, yoyo: true, hold: 500 });
        const c = T.front();
        this.popWord(c.x - 60, c.y - 160, 'RRRRR!', '#ff8a3d', 110, 8);
        for (let i = 0; i < 4; i++) {
          const ring = this.add.image(c.x, c.y, 'ring').setDepth(22).setTint(0xffb36b).setScale(0.4).setAlpha(0.9);
          this.tweens.add({ targets: ring, x: J.center().x + 80, scale: 2.2, alpha: 0, duration: 650, delay: i * 120, onComplete: () => ring.destroy() });
        }
        this.cameras.main.shake(700, 0.006);
        await wait(this, 600);
        await this.impact(J, d, 'roar');
      }
    }
    checkEnd() {
      if (this.tiger.hp <= 0) { this.finish(true); return true; }
      if (this.jack.hp <= 0) { this.finish(false); return true; }
      return false;
    }
    async finish(won) {
      this.over = true; this.busy = true; this.setCards(false);
      const J = this.jack, T = this.tiger;
      if (won) {
        this.log('Timmy laughs so hard he gives up! Jack wins!');
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
      const gain = won ? 40 : 10;
      const before = levelOf(Save.data.xp);
      Save.data.xp += gain; if (won) Save.data.wins++; Save.store();
      const after = levelOf(Save.data.xp);
      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0).setDepth(60).setInteractive();
      this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 300 });
      const pw = PORTRAIT ? 920 : 1000, ph = PORTRAIT ? 1100 : 900, T0 = -ph / 2;
      const p = this.add.container(W / 2, H / 2).setDepth(61).setScale(0);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-pw / 2, T0 + 16, pw, ph, 60);
      g.fillStyle(C.night2); g.fillRoundedRect(-pw / 2, T0, pw, ph, 60);
      g.lineStyle(6, C.seam); g.strokeRoundedRect(-pw / 2 + 16, T0 + 16, pw - 32, ph - 32, 48);
      const icon = this.add.image(0, T0 + 145, won ? 'trophy' : 'zzz').setScale(won ? 0.85 : 0.8);
      this.tweens.add({ targets: icon, y: icon.y - 14, angle: { from: -5, to: 5 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const title = txt(this, 0, T0 + 315, won ? 'YOU WIN!' : 'SO SLEEPY...', 104, won ? '#ffd23f' : '#bcc0ee', { stroke: '#0f1240', st: 14 });
      const sub = txt(this, 0, T0 + 400, won ? 'Timmy laughed so hard he gave up.' : 'Jack needs a nap. Next time for sure!', 36, '#fff3d2', { st: 0, weight: '500', wrap: pw - 120 });
      const xpT = txt(this, 0, T0 + 480, '+0 XP', 64, '#7fe39a', { stroke: '#0f1240', st: 10 });
      const bw = pw - 220;
      const lvT = txt(this, -bw / 2, T0 + 552, 'LEVEL ' + before.l, 36, '#fff3d2', { ox: 0, st: 0 });
      const barBg = this.add.rectangle(0, T0 + 605, bw, 36, C.night3).setStrokeStyle(4, C.seam);
      const bar = this.add.rectangle(-bw / 2, T0 + 605, Math.max(4, bw * before.r / before.n), 28, C.star).setOrigin(0, 0.5);
      p.add([g, icon, title, sub, xpT, lvT, barBg, bar]);
      const b1 = button(this, PORTRAIT ? 0 : -215, PORTRAIT ? T0 + 775 : T0 + 760, 390, 124, 'REMATCH', C.star, () => this.scene.restart(), { size: 50 });
      const b2 = button(this, PORTRAIT ? 0 : 215, PORTRAIT ? T0 + 935 : T0 + 760, 390, 124, 'HOME', C.cream, () => {
        this.cameras.main.fadeOut(300, 15, 18, 64); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('title'));
      }, { size: 50 });
      p.add([b1, b2]);
      this.tweens.add({ targets: p, scale: 1, duration: 420, ease: 'Back.out' });
      // count XP and fill bar
      const o = { v: 0 };
      this.tweens.add({ targets: o, v: gain, duration: 900, delay: 500, onUpdate: () => { xpT.setText('+' + Math.round(o.v) + ' XP'); if (Math.random() < 0.5) A.tick(); } });
      this.time.delayedCall(700, () => {
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
      fps: { smoothStep: !DEBUG },
      input: { activePointers: 2 }, render: { antialias: true, powerPreference: 'high-performance' },
      scene: [Boot, Title, Battle],
    });
    window.__game = game;
    let o = PORTRAIT;
    window.addEventListener('resize', () => { const p = window.innerHeight > window.innerWidth; if (p !== o) { o = p; location.reload(); } });
    document.addEventListener('visibilitychange', () => { if (!A.ctx) return; document.hidden ? A.ctx.suspend() : A.ctx.resume(); });
  }
  const fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px Poppins'), document.fonts.load('500 40px Poppins')]).catch(() => {}) : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))]).then(start);
})();
