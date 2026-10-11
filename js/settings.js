// Plush Squad: v1.0 Settings (docs/gdd/1.0-settings.md). Device-only preferences, never in the synced save:
// localStorage['plushsquad_prefs'] = { music: 0-4, sfx: 0-4, calm, hand: 'right' | 'left', buzz }.
// Calm mode works through three small hooks on Phaser itself (camera shake, endless tweens, confetti),
// so every screen follows it without changes scattered over game.js.
(function () {
  'use strict';
  const KEY = 'plushsquad_prefs';
  const lvl = v => (Number.isInteger(v) && v >= 0 && v <= 4 ? v : 3);
  const osCalm = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const Prefs = {
    KEY,
    data: null,
    load() {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
      const first = !raw || typeof raw !== 'object';
      const r = first ? {} : raw;
      this.data = {
        music: lvl(r.music), sfx: lvl(r.sfx),
        calm: typeof r.calm === 'boolean' ? r.calm : osCalm(), // first run: follow the OS "reduce motion" setting
        hand: r.hand === 'left' ? 'left' : 'right',
        buzz: r.buzz !== false,
      };
      if (first) this.save();
      return this.data;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} },
    set(k, v) { this.data[k] = v; this.save(); this.apply(); },
    apply() { const A = window.PSAudio; if (A && A.setVolumes) A.setVolumes(this.data.music, this.data.sfx); },
    calm() { return !!(this.data && this.data.calm); },
    left() { return !!(this.data && this.data.hand === 'left'); },
    canBuzz() { return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'; },
    // endless tweens that still run in calm mode (they tell the kid what is happening, e.g. the rival's charge glow)
    _keep: new WeakSet(),
    keep(cfg) { if (cfg && typeof cfg === 'object') this._keep.add(cfg); return cfg; },
  };
  Prefs.load(); Prefs.apply(); // before the first tap creates the audio context
  window.PSPrefs = Prefs;

  // ---------- calm mode hooks
  if (window.Phaser) {
    // 1) no camera shakes
    const Cam = Phaser.Cameras.Scene2D.Camera.prototype;
    if (!Cam.__psShake) {
      Cam.__psShake = Cam.shake;
      Cam.shake = function () { return Prefs.calm() ? this : Cam.__psShake.apply(this, arguments); };
    }
    // 2) endless pulses and wobbles (repeat: -1) stand still: the tween is created paused, so code that keeps
    // a handle to it (stop, remove) works as before. Comics keep their motion; tweens with onUpdate do work, not decoration.
    const TM = Phaser.Tweens.TweenManager.prototype;
    if (!TM.__psAdd) {
      TM.__psAdd = TM.add;
      TM.add = function (cfg) {
        if (Prefs.calm() && cfg && !(Phaser.Tweens.BaseTween && cfg instanceof Phaser.Tweens.BaseTween) && cfg.repeat === -1 && !cfg.onUpdate && !Prefs._keep.has(cfg) &&
          !(this.scene && this.scene.sys && this.scene.sys.settings.key === 'comic')) cfg = Object.assign({}, cfg, { paused: true });
        return TM.__psAdd.call(this, cfg);
      };
    }
    // 3) confetti: a quarter of the pieces (the 'conf' emitters of duels, Star Catch and Pond Hockey)
    const PE = Phaser.GameObjects.Particles.ParticleEmitter.prototype;
    if (!PE.__psExplode) {
      PE.__psExplode = PE.explode;
      PE.explode = function (count, x, y) {
        if (Prefs.calm() && this.texture && this.texture.key === 'conf' && count > 0) count = Math.max(1, Math.round(count * 0.25));
        return PE.__psExplode.call(this, count, x, y);
      };
    }
  }

  // ---------- the Settings screen
  function scenes(PS) {
    const { W, H, PORTRAIT, C, A, txt, fit, img, iconScale, button, press, buzz } = PS;
    const X = window.PSExtra;
    const PH = 96; // pill height: touch targets over 90 px (B26)
    class SettingsScene extends Phaser.Scene {
      constructor() { super('settings'); }
      create() {
        X.header(this, PS, 'SETTINGS');
        this.rows = {};
        const rows = [
          { key: 'music', label: 'MUSIC', icon: 'j:music', vals: [0, 1, 2, 3, 4], name: v => (v ? String(v) : 'OFF') },
          { key: 'sfx', label: 'SOUNDS', icon: 'note', vals: [0, 1, 2, 3, 4], name: v => (v ? String(v) : 'OFF') },
          { key: 'calm', label: 'CALM MODE', sub: 'Less shaking and sparkles', icon: 'zzz', vals: [false, true], name: v => (v ? 'ON' : 'OFF') },
          { key: 'hand', label: 'CARDS', sub: 'Which hand do you play with?', icon: 'j:hug', vals: ['left', 'right'], name: v => v.toUpperCase() },
        ];
        if (Prefs.canBuzz()) rows.push({ key: 'buzz', label: 'BUZZ', icon: 'j:bell', vals: [false, true], name: v => (v ? 'ON' : 'OFF') });
        const credits = 'v' + PS.VERSION + '  ·  Art: Fluent Emoji (MIT)  ·  Font: Poppins (OFL)  ·  Sounds made by the game';
        if (PORTRAIT) {
          // one column: icon + label on the left, pills on the right
          const top = 340, pitch = Math.min(190, (H - top - 330) / rows.length), pl = 450, pr = W - 50;
          rows.forEach((r, i) => this.row(r, 60, top + i * pitch, pl, pr, false));
          const by = top + rows.length * pitch + 30;
          this.wnBtn = this.wn(W / 2, by);
          txt(this, W / 2, Math.max(by + 140, H - 90), credits, 26, '#8a91e0', { st: 0, shadow: false, weight: '500', wrap: W - 120 });
        } else {
          // two columns: rows 1-3 left, the rest right; the label sits above its pills
          const colW = Math.min(900, (W - 160) / 2), lx = W / 2 - 40 - colW, rx = W / 2 + 40, top = 210, pitch = 230;
          const right = rows.slice(3);
          rows.slice(0, 3).forEach((r, i) => this.row(r, lx, top + i * pitch, lx, lx + colW, true));
          right.forEach((r, i) => this.row(r, rx, top + i * pitch, rx, rx + colW, true));
          this.wnBtn = this.wn(rx + colW / 2, top + right.length * pitch + 70);
          txt(this, W / 2, H - 50, credits, 26, '#8a91e0', { st: 0, shadow: false, weight: '500', wrap: W - 120 });
        }
        this.refresh();
      }
      // one option row. stacked: label line at y, pills under it; otherwise label left and pills at the same height
      row(r, x, y, pl, pr, stacked) {
        const py = stacked ? y + 92 : y;
        const ic = img(this, x + 40, y, r.icon); ic.setScale(iconScale(r.icon, 72));
        const lt = txt(this, x + 95, stacked || !r.sub ? y : y - 22, r.label, 40, '#ffd23f', { st: 6, ox: 0 });
        if (r.sub) {
          if (stacked) fit(txt(this, x + 110 + lt.width, y + 4, r.sub, 26, '#bcc0ee', { st: 0, shadow: false, weight: '500', ox: 0 }), pr - (x + 110 + lt.width));
          else txt(this, x + 95, y + 30, r.sub, 24, '#bcc0ee', { st: 0, shadow: false, weight: '500', ox: 0, oy: 0, wrap: pl - x - 110, align: 'left' });
        }
        const gap = 12, n = r.vals.length, bw = Math.min(n > 2 ? 150 : 260, (pr - pl - gap * (n - 1)) / n);
        const x0 = stacked ? pl : pr - n * bw - gap * (n - 1);
        const pills = r.vals.map((v, i) => {
          const c = this.add.container(x0 + bw / 2 + i * (bw + gap), py).setDepth(5); // above the shooting stars
          const off = X.card(this, PS, 0, 0, bw, PH, 0x161946, C.seam), on = X.card(this, PS, 0, 0, bw, PH, C.star, 0xffffff);
          const t = fit(txt(this, 0, 0, r.name(v), 34, '#bcc0ee', { st: 0, shadow: false }), bw - 16);
          c.add([off, on, t]); c.setSize(bw, PH).setInteractive({ useHandCursor: true }); press(this, c);
          c.on('pointerup', () => this.choose(r.key, v));
          return { v, c, on, off, t };
        });
        this.rows[r.key] = pills;
      }
      wn(x, y) {
        const b = button(this, x, y, 520, 110, "WHAT'S NEW", C.cream, () => X.whatsNew && X.whatsNew(this, PS, true), { size: 42 });
        b.list[1].x = 40; fit(b.list[1], 360);
        const ic = img(this, -190, -4, 'j:gear'); ic.setScale(iconScale('j:gear', 70)); b.add(ic);
        return b;
      }
      refresh() {
        const P = Prefs.data;
        Object.keys(this.rows).forEach(k => this.rows[k].forEach(p => {
          const sel = P[k] === p.v;
          p.on.setVisible(sel); p.off.setVisible(!sel); p.t.setColor(sel ? C.ink : '#bcc0ee');
        }));
      }
      choose(key, v) {
        if (Prefs.data[key] === v) return;
        Prefs.set(key, v);
        A.init();
        if (key === 'music') A.startMusic(); // the calm track runs here, so the new level is heard at once
        if (key === 'sfx') { if (v) A.thump(0.8); } else A.click();
        if (key === 'buzz' && v) buzz(40);
        if (key === 'calm') { this.scene.restart(); return; } // the stars stop (or start) twinkling right away
        this.refresh();
      }
    }
    return [SettingsScene];
  }

  (window.PSPlugins = window.PSPlugins || []).push({
    name: 'settings',
    nav: [{ key: 'settings', label: 'SETTINGS', icon: 'j:gear', order: 6 }],
    scenes,
  });
})();
