// Plush Squad: toys go on an adventure (v1.0, docs/gdd/1.0-toy-adventure.md, #47 and #76).
// "Remove" became "Go explore!": the toy leaves My Squad for a world the kid has opened, sends up to 3 postcards
// (days 1-3 after leaving, at the first map open of the day) and comes home with CALL HOME, with a souvenir after 3+ days.
// A real delete (photo, cloud row, picture in the storage bucket) is behind the parent gate (SAY GOODBYE).
(function () {
  'use strict';
  const S = () => (window.__save && window.__save.data) || {};
  const store = () => window.__save && window.__save.store();
  const X = () => window.PSExtra;
  const todayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const MAX_AWAY = 20, SQUAD_MAX = 14, CARDS = 3, SOUV_DAYS = 3, SOUV_XP = 20;
  // worlds by key (not by index: WORLDS[3] exists only while the Spooky event runs)
  const KEYS = ['hills', 'space', 'canada', 'spooky'];
  const WORLD = {
    hills: { name: 'PILLOW HILLS', icon: 'moon', prop: 'pillow', lines: ['Timmy taught me his funny roar. RRRR!', 'Moo shared her warm milk with me. Moooo-licious!', 'Professor Hoot gave me a gold star for napping.'] },
    space: { name: 'SPACE', icon: 'rocket', prop: 'planet', lines: ['Robo-Bop says BEEP BOOP. I think it means hi!', 'The Blips borrowed my snack. They gave me a moon rock back!', 'Boo and I played hide and seek. Boo always wins.'] },
    canada: { name: 'CANADA', icon: 'mapleleaf', prop: 'pine', lines: ['Max the Moose made me a pancake tower!', 'Beaver Bob taught me pond hockey. I scored once!', 'Sasquatch gave me a hug. A BIG soft one.'] },
    spooky: { name: 'SPOOKY', icon: 'pumpkin', prop: 'candy', lines: ['Pumpkin Pete told me a joke. It was corny!', 'Batty showed me how to sleep upside down. Like Jack!', 'Count Fang shared his candy. Only the red ones.'] },
  };
  const W_OF = k => WORLD[k] || WORLD.hills;

  const away = () => { const d = S(); if (!Array.isArray(d.away)) d.away = []; return d.away; };
  // calendar days between two local date keys ('2026-10-10'); noon avoids daylight-saving surprises
  const dayNum = k => { const [y, m, d] = String(k || '').split('-').map(Number); return Math.round(new Date(y, (m || 1) - 1, d || 1, 12).getTime() / 86400000); };
  // days since the toy left; a clock moved back counts as 0 (postcards wait until the date passes 'left' again)
  const daysAway = trip => Math.max(0, (dayNum(todayKey()) - dayNum(trip && trip.left)) || 0);
  const cardsDue = e => Math.min(CARDS, daysAway(e.trip));
  // something new for the dot on the ADVENTURES card: an unread postcard, or a trip long enough for a souvenir
  const news = () => away().some(e => e && e.trip && ((e.trip.cards || 0) > (e.trip.seen || 0) || daysAway(e.trip) >= SOUV_DAYS));

  let P = null;           // the game's helpers (PS), refreshed on every build of the game
  let later = null;       // a toast for the next screen (after a scene restart)

  function hint(scene, s) {
    const { W, H, txt } = P;
    if (scene._advHint) scene._advHint.destroy();
    window.PSAdventure.lastHint = s; // for the tests (a hint fades fast on a slow test machine)
    const t = scene._advHint = txt(scene, W / 2, H - 140, s, 36, '#ff9ed8', { st: 7, wrap: W - 100 }).setDepth(99);
    scene.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 500, onComplete: () => t.destroy() });
  }
  // a small card on top of the screen: title, text, buttons [[label, color, cb, textColor]]
  function dialog(scene, title, sub, buttons, o = {}) {
    const { W, H, PORTRAIT, txt, fit, button, panel, C } = P;
    const layer = scene.add.container(0, 0).setDepth(o.depth || 80);
    layer.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.7).setInteractive());
    const pw = Math.min(W - 60, 900), ph = o.h || 520;
    layer.add(panel(scene, W / 2, H / 2, pw, ph, C.night2, 0));
    layer.add(fit(txt(scene, W / 2, H / 2 - ph / 2 + 110, title, 52, '#ffd23f', { st: 8 }), pw - 100));
    if (sub) layer.add(txt(scene, W / 2, H / 2 - ph / 2 + 200, sub, 32, '#fff3d2', { st: 0, weight: '500', wrap: pw - 140, oy: 0 }));
    const bw = buttons.length > 1 ? Math.min(340, (pw - 120) / 2) : 360;
    buttons.forEach(([label, color, cb, tc], i) => {
      const x = W / 2 + (buttons.length > 1 ? (i - (buttons.length - 1) / 2) * (bw + 30) : 0);
      const b = button(scene, x, H / 2 + ph / 2 - 110, bw, 110, label, color, () => cb(layer), { size: 40, color: tc });
      fit(b.list[1], bw - 40); layer.add(b);
    });
    layer.setAlpha(0); scene.tweens.add({ targets: layer, alpha: 1, duration: 200 });
    return layer;
  }

  // ---------- sending a toy away (from the My Squad details panel)
  function ask(scene, toy, closeDetails) {
    if (!P) return;
    const { C, A } = P;
    if (away().length >= MAX_AWAY) { A.block(); hint(scene, 'The adventure bus is full! Call a toy home first.'); return; }
    dialog(scene, 'Send ' + toy.name + ' on an adventure?', toy.name + ' packs a snack and goes exploring. ' + toy.name + ' will send you postcards!', [
      ['STAY', C.star, layer => layer.destroy(true)],
      ['GO EXPLORE!', C.coral, layer => { layer.destroy(true); if (closeDetails) closeDetails(); whereTo(scene, toy); }, '#fff3d2'],
    ]);
  }
  function whereTo(scene, toy) {
    if (!P) return;
    const { W, H, PORTRAIT, C, A, txt, fit, img, iconScale, button, panel, press, WORLDS, worldOpen } = P;
    const sd = scene.sys.settings.data || (scene.sys.settings.data = {});
    sd.send = toy.id; // a rotation brings this card back (game.js SquadScene.create)
    const open = KEYS.filter((k, i) => i < WORLDS.length && worldOpen(i));
    const items = open.concat(['surprise']);
    const cols = PORTRAIT ? 1 : 2, rows = Math.ceil(items.length / cols), bw = PORTRAIT ? 640 : 520, bh = 116, gap = 22;
    const pw = Math.min(W - 60, cols * bw + (cols - 1) * 30 + 120), ph = 330 + rows * (bh + gap);
    const layer = scene.add.container(0, 0).setDepth(80);
    layer.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.7).setInteractive());
    layer.add(panel(scene, W / 2, H / 2, pw, ph, C.night2, 0));
    const top = H / 2 - ph / 2;
    layer.add(fit(txt(scene, W / 2 + 60, top + 110, 'Where to?', 64, '#ffd23f', { stroke: '#0f1240', st: 10 }), pw - 360));
    const key = 'toy_' + toy.id;
    const pic = scene.textures.exists(key) ? scene.add.image(W / 2 - 200, top + 115, key) : null;
    if (pic) { pic.setScale(Math.min(150 / pic.width, 150 / pic.height)); layer.add(pic); scene.tweens.add({ targets: pic, y: pic.y - 10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); }
    let gone = false;
    const pick = k => {
      if (gone) return; gone = true;
      const wk = k === 'surprise' ? open[Math.floor(Math.random() * open.length)] : k;
      if (!send(toy, wk)) { layer.destroy(true); delete sd.send; return; }
      delete sd.send;
      layer.list.forEach(o => o.disableInteractive && o.disableInteractive());
      A.whoosh && A.whoosh();
      later = { key: 'squad', icon: W_OF(wk).icon, title: toy.name + ' is off to ' + W_OF(wk).name + '!', sub: toy.name + ' will send you postcards!' };
      const done = () => { if (scene.sys.isActive()) scene.scene.restart({ page: scene.page || 0 }); };
      if (pic) { scene.tweens.killTweensOf(pic); scene.tweens.add({ targets: pic, x: W + 300, y: pic.y - 160, angle: 30, duration: 650, ease: 'Quad.in', onComplete: done }); }
      else scene.time.delayedCall(300, done);
    };
    items.forEach((k, i) => {
      const r = Math.floor(i / cols), inRow = r === rows - 1 ? items.length - cols * (rows - 1) : cols;
      const x = W / 2 + ((i % cols) - (inRow - 1) / 2) * (bw + 30), y = top + 250 + r * (bh + gap) + bh / 2;
      const sur = k === 'surprise';
      const b = button(scene, x, y, bw, bh, sur ? 'SURPRISE ME!' : W_OF(k).name, sur ? C.star : C.cream, () => pick(k), { size: 40 });
      const icon = sur ? 'sparkles' : W_OF(k).icon;
      b.add(img(scene, -bw / 2 + 70, 0, icon).setScale(iconScale(icon, 74))); b.list[1].x = 40; fit(b.list[1], bw - 190);
      layer.add(b);
    });
    const x = txt(scene, W / 2 - pw / 2 + 70, top + 70, '✕', 50, '#bcc0ee', { st: 0 }).setInteractive({ useHandCursor: true });
    x.on('pointerup', () => { if (gone) return; A.click(); delete sd.send; layer.destroy(true); }); press(scene, x, 0.85); layer.add(x);
    layer.setAlpha(0); scene.tweens.add({ targets: layer, alpha: 1, duration: 200 });
    return layer;
  }
  // the save part of sending (no UI): false when the toy is not in the squad any more (a double tap) or the bus is full
  function send(toy, wk) {
    const d = S();
    if (!(d.toys || []).some(t => t.id === toy.id) || away().length >= MAX_AWAY) return false;
    d.toys = d.toys.filter(t => t.id !== toy.id);
    if (d.hero === toy.id) d.hero = 'jack';
    away().push({ toy, trip: { world: WORLD[wk] ? wk : 'hills', left: todayKey(), cards: 0, seen: 0 } });
    store();
    return true;
  }
  // coming home (no UI): null when the squad is full. Souvenir after 3+ days; a capsule only for the first souvenir
  // of this toy from this world (no "send and return" farming); +20 toy XP (toy growth)
  function comeHome(e) {
    const d = S();
    if ((d.toys || []).length >= SQUAD_MAX) return null;
    const i = away().indexOf(e); if (i < 0) return null;
    const t = e.toy, wk = e.trip.world, souv = daysAway(e.trip) >= SOUV_DAYS;
    let cap = false, grew = null;
    if (souv) {
      const list = Array.isArray(t.souv) ? t.souv : [];
      if (!list.includes(wk)) { t.souv = list.concat([wk]); d.caps = (d.caps || 0) + 1; cap = true; }
      if (d.stats) d.stats.souvenirs = (d.stats.souvenirs || 0) + 1; // the Explorer sticker
      grew = window.PSToys && window.PSToys.addToyXp ? window.PSToys.addToyXp(t, SOUV_XP) : null;
    }
    away().splice(i, 1);
    d.toys.push(t);
    store();
    return { souv, cap, grew, world: wk };
  }
  // a real delete, for grown-ups: the toy, its picture on this device, its cloud row and the picture in the bucket (#76)
  function forget(scene, e) {
    const i = away().indexOf(e); if (i < 0) return;
    away().splice(i, 1); store();
    const id = e.toy.id;
    try { P.IDB.del(id).catch(() => {}); } catch (err) {}
    if (scene.textures.exists('toy_' + id)) scene.textures.remove('toy_' + id);
    if (window.PSNet && window.PSNet.forgetToy) window.PSNet.forgetToy(id);
  }

  // ---------- postcards: at the first map open of the day, after any popup on the map (streak, mail, stickers)
  function busy(scene) {
    if ((window.__psToasts || 0) > 0 || window.__psPopup) return true;
    return scene.children.list.some(o => o.active && o.visible && o.depth >= 80);
  }
  function postcards(scene) {
    if (!away().some(e => e && e.trip && cardsDue(e) > (e.trip.cards || 0))) return;
    if (X() && X().blockedReason && X().blockedReason()) return; // bedtime: postcards wait (days still count)
    let tries = 0;
    const go = () => {
      if (!scene.sys.isActive() || scene._leaving) return;
      if (busy(scene)) { if (++tries < 80) scene.time.delayedCall(500, go); return; }
      const due = away().filter(e => e && e.trip && cardsDue(e) > (e.trip.cards || 0));
      if (!due.length) return;
      let n = 0;
      due.forEach(e => { const k = cardsDue(e); n += k - (e.trip.cards || 0); e.trip.cards = k; });
      store();
      const { A, W, press, fade } = P;
      const c = X().toast(scene, P, 'j:letter', n === 1 ? 'A postcard from ' + due[0].toy.name + '!' : n + ' new postcards!', 'Tap to read ' + (n === 1 ? 'it' : 'them') + ' in ADVENTURES');
      A.click(); A.starDing && A.starDing(0);
      if (c) { c.setSize(Math.min(W - 60, 820), 150).setInteractive({ useHandCursor: true }); press(scene, c, 0.96); c.on('pointerup', () => fade(scene, 'adventures')); }
    };
    scene.time.delayedCall(1500, go);
  }

  // ---------- the Adventures list (from the ADVENTURES card in My Squad)
  function scenes(PS) {
    P = PS;
    const { W, H, PORTRAIT, C, A, txt, fit, img, iconScale, button, chip, fade, press, IDB, addTexture, groundKey } = PS;
    class AdventuresScene extends Phaser.Scene {
      constructor() { super('adventures'); }
      init(data) { this.page = (data && data.page) || 0; }
      create() {
        X().header(this, PS, 'ADVENTURES', 'squad');
        const list = away().filter(e => e && e.toy && e.trip);
        if (!list.length) {
          txt(this, W / 2, H / 2 - 60, 'Everybody is home!', 56, '#fff3d2', { st: 8 });
          button(this, W / 2, H / 2 + 90, 420, 110, 'MY SQUAD', C.star, () => fade(this, 'squad'), { size: 42 });
          return;
        }
        txt(this, W / 2, PORTRAIT ? 270 : 150, 'Tap a postcard to read it. CALL HOME any time!', 32, '#bcc0ee', { st: 5, weight: '500' });
        const cols = PORTRAIT ? 1 : 2, rw = PORTRAIT ? W - 80 : Math.min(900, (W - 120) / 2), rh = 290, gap = 20, top = PORTRAIT ? 330 : 210;
        const rows = Math.max(1, Math.floor((H - top - 150) / (rh + gap))), per = rows * cols, pages = Math.ceil(list.length / per);
        const pg = this.page = Math.min(pages - 1, Math.max(0, this.page));
        const shown = list.slice(pg * per, pg * per + per);
        if (pages > 1) {
          const by = top + rows * (rh + gap) + 50;
          if (pg > 0) button(this, W / 2 - 260, by, 200, 100, '◀', C.cream, () => this.scene.restart({ page: pg - 1 }), { size: 48 });
          txt(this, W / 2, by, (pg + 1) + ' / ' + pages, 40, '#fff3d2', { st: 6 });
          if (pg < pages - 1) button(this, W / 2 + 260, by, 200, 100, '▶', C.star, () => this.scene.restart({ page: pg + 1 }), { size: 48 });
        }
        // the pictures stay in IndexedDB while a toy is away; load the ones on this page
        const tok = this._tok = {};
        Promise.all(shown.map(e => this.textures.exists('toy_' + e.toy.id) ? true : IDB.get(e.toy.id).then(url => url && addTexture(this, 'toy_' + e.toy.id, url)).catch(() => false)))
          .then(() => {
            if (this._tok !== tok || !this.sys.isActive()) return;
            shown.forEach((e, i) => this.row(e, W / 2 + ((i % cols) - (cols - 1) / 2) * (rw + 30), top + rh / 2 + Math.floor(i / cols) * (rh + gap), rw, rh, i));
            const sd = this.sys.settings.data || {}, oc = sd.card && list.find(e => e.toy.id === sd.card.id);
            if (oc && sd.card.n <= (oc.trip.cards || 0)) this.postcard(oc, sd.card.n, false); else delete sd.card;
          }).catch(e => console.warn('adventures', e));
      }
      row(e, x, y, w, h, i) {
        const c = this.add.container(x, y).setDepth(5);
        c.add(X().card(this, PS, 0, 0, w, h));
        const t = e.toy, wd = W_OF(e.trip.world), key = 'toy_' + t.id;
        if (this.textures.exists(key)) c.add(PS.fitImage(this, -w / 2 + 120, 0, key, 190, h - 50));
        else c.add(img(this, -w / 2 + 120, 0, 'j:ticket').setScale(iconScale('j:ticket', 120)));
        const tx = -w / 2 + 240, bx = w / 2 - 170, textW = bx - 160 - tx;
        c.add(fit(txt(this, tx, -h / 2 + 52, t.name, 44, '#fff3d2', { st: 7, ox: 0 }), textW));
        const wi = img(this, tx + 26, -h / 2 + 118, wd.icon); wi.setScale(iconScale(wd.icon, 48)); c.add(wi);
        c.add(fit(txt(this, tx + 62, -h / 2 + 118, 'Day ' + (daysAway(e.trip) + 1) + ' in ' + wd.name, 30, '#bcc0ee', { st: 5, ox: 0, weight: '500' }), textW - 62));
        // postcards: delivered ones can be read again; NEW dot until read
        for (let n = 1; n <= CARDS; n++) {
          const has = n <= (e.trip.cards || 0), px = tx + 58 + (n - 1) * 132, py = h / 2 - 70;
          const pc = this.add.container(px, py);
          const g = this.add.graphics();
          if (has) { g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-58, -36, 116, 80, 14); g.fillStyle(C.cream); g.fillRoundedRect(-58, -42, 116, 80, 14); }
          else { g.lineStyle(4, C.seam, 0.8); g.strokeRoundedRect(-58, -42, 116, 80, 14); }
          pc.add(g);
          if (has) {
            pc.add(img(this, -22, -2, 'j:letter').setScale(iconScale('j:letter', 50)));
            pc.add(this.add.image(30, -18, 'star').setScale(0.12).setAngle(12));
            if (n > (e.trip.seen || 0)) pc.add(this.add.circle(50, -38, 13, C.coral).setStrokeStyle(3, 0x0f1240));
            pc.setSize(116, 90).setInteractive({ useHandCursor: true }); press(this, pc, 0.9);
            pc.on('pointerup', () => this.postcard(e, n, true));
          } else pc.add(txt(this, 0, -2, String(n), 30, '#6a72d6', { st: 0, shadow: false }));
          c.add(pc);
        }
        const home = button(this, bx, -h / 2 + 85, 300, 104, 'CALL HOME', C.star, () => this.callHome(e), { size: 38 });
        const bye = button(this, bx, h / 2 - 75, 300, 92, 'SAY GOODBYE', C.cream, () => this.goodbye(e), { size: 28 });
        fit(home.list[1], 270); fit(bye.list[1], 270);
        c.add([home, bye]);
        c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 280, delay: i * 60, ease: 'Back.out' });
      }
      // one postcard: a cream card, the world ground, the toy, one world prop, a star stamp and the line
      postcard(e, n, fresh) {
        const sd = this.sys.settings.data || (this.sys.settings.data = {});
        sd.card = { id: e.toy.id, n }; // a rotation opens it again
        if (n > (e.trip.seen || 0)) { e.trip.seen = n; store(); }
        if (fresh) { A.click(); A.starDing && A.starDing(0); }
        const wd = W_OF(e.trip.world), wi = Math.max(0, KEYS.indexOf(e.trip.world));
        const layer = this.add.container(0, 0).setDepth(85);
        const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.75).setInteractive(); layer.add(dim);
        const pw = PORTRAIT ? W - 100 : Math.min(W - 200, 1300), ph = PORTRAIT ? 1100 : 900, x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x0, y0 + 16, pw, ph, 40);
        g.fillStyle(C.cream); g.fillRoundedRect(x0, y0, pw, ph, 40);
        layer.add(g);
        // the world's ground strip along the bottom (the top part of the ground texture: the hill line)
        const gk = groundKey(wi), gt = this.textures.get(gk).getSourceImage(), gw = gt.width, gch = Math.min(gt.height, gw * 0.18);
        const sc = (pw - 40) / gw, gimg = this.add.image(x0 + 20, y0 + ph - 20 - gch * sc, gk).setOrigin(0, 0).setScale(sc).setCrop(0, 0, gw, gch);
        layer.add(gimg);
        const sky = this.add.graphics(); sky.lineStyle(6, C.star); sky.strokeRoundedRect(x0 + 16, y0 + 16, pw - 32, ph - 32, 30); layer.add(sky);
        layer.add(fit(txt(this, W / 2, y0 + 95, 'Greetings from ' + wd.name + '!', PORTRAIT ? 60 : 66, '#ff6b5b', { stroke: '#0f1240', st: 9 }), pw - 260));
        layer.add(txt(this, W / 2, y0 + 175, wd.lines[n - 1] || '', PORTRAIT ? 40 : 44, C.ink, { st: 0, shadow: false, wrap: pw - 160, oy: 0 }));
        const stamp = this.add.image(x0 + pw - 100, y0 + 100, 'star').setScale(0.42).setAngle(14); layer.add(stamp);
        const groundTop = y0 + ph - 20 - gch * sc, key = 'toy_' + e.toy.id;
        if (this.textures.exists(key)) {
          const ti = this.add.image(W / 2 - pw * 0.18, groundTop + gch * sc * 0.55, key).setOrigin(0.5, 1);
          ti.setScale(Math.min((ph * 0.45) / ti.height, (pw * 0.4) / ti.width)); layer.add(ti);
          this.tweens.add({ targets: ti, y: ti.y - 16, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
        const pr = this.add.image(W / 2 + pw * 0.25, groundTop + gch * sc * 0.5, wd.prop).setOrigin(0.5, 1);
        pr.setScale(Math.min((ph * 0.3) / pr.height, (pw * 0.3) / pr.width)); layer.add(pr);
        layer.add(txt(this, x0 + 60, y0 + ph - 60, '- ' + e.toy.name + '  (' + n + ' / ' + CARDS + ')', 30, '#fff3d2', { st: 5, ox: 0 }));
        const close = () => { delete sd.card; A.click(); layer.destroy(true); };
        dim.on('pointerup', close);
        const ok = button(this, x0 + pw - 150, y0 + ph - 70, 220, 96, 'OK', C.star, close, { size: 40 }); layer.add(ok);
        if (fresh) { layer.setAlpha(0); this.tweens.add({ targets: layer, alpha: 1, duration: 220 }); }
      }
      callHome(e) {
        const t = e.toy, r = comeHome(e);
        if (!r) { A.block(); hint(this, 'Your squad is full! Send another toy exploring first.'); return; }
        A.levelUp && A.levelUp();
        if (r.souv && r.cap) A.starDing && this.time.delayedCall(300, () => A.starDing(1));
        const wd = W_OF(r.world);
        const g = r.grew, lines = r.souv ? ['A souvenir from ' + wd.name + '!'].concat(r.cap ? ['+1 capsule! Open it on the map'] : [])
          .concat(g && g.gain ? ['+' + g.gain + ' toy XP'] : []).concat(g && g.note ? [g.note] : [])
          : ['Next time stay longer for a souvenir.'];
        const lay = dialog(this, r.souv ? t.name + ' is home with a souvenir!' : t.name + ' is home!', lines.join('\n'), [['YAY!', C.star, () => this.scene.restart({ page: this.page })]], { depth: 86, h: 560 });
        if (r.souv) { const si = img(this, W / 2, H / 2 - 280 - 10, wd.icon); si.setScale(iconScale(wd.icon, 90)); lay.add(si); this.tweens.add({ targets: si, angle: { from: -12, to: 12 }, duration: 600, yoyo: true, repeat: -1 }); }
        X().checkAch && X().checkAch();
        PS.emit('toyHome', { toy: t, souvenir: r.souv, world: r.world }, this);
      }
      goodbye(e) {
        X().parentGate(this, PS, () => {
          dialog(this, 'Delete ' + e.toy.name + '\'s photo for good?', 'The toy and its picture are deleted from this device and from the cloud. This cannot be undone.', [
            ['NO', C.star, l => l.destroy(true)],
            ['YES', C.coral, l => { l.destroy(true); forget(this, e); this.scene.restart({ page: this.page }); }, '#fff3d2'],
          ], { depth: 88, h: 560 });
        });
      }
    }
    return [AdventuresScene];
  }

  function onEvent(name, d, scene, PS) {
    if (name !== 'scene' || !scene) return;
    if (d.key === 'adventures' && X() && X().blockedReason && X().blockedReason()) { scene.time.delayedCall(50, () => PS.fade(scene, 'bedtime')); return; } // like My Squad
    if (later && later.key === d.key) { const l = later; later = null; scene.time.delayedCall(350, () => X() && X().toast(scene, PS, l.icon, l.title, l.sub)); }
    if (d.key === 'map') postcards(scene);
  }

  window.PSAdventure = { ask, whereTo, send, comeHome, forget, news, daysAway, cardsDue, todayKey, WORLD, KEYS, MAX_AWAY, away };
  (window.PSPlugins = window.PSPlugins || []).push({ name: 'adventure', scenes, onEvent });
})();
