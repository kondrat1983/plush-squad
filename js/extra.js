// Plush Squad — local extras (work offline, no account needed):
// Me (player card, titles, costumes), sticker Album (achievements), real-life Quests,
// Parents area (approve quests, bedtime, daily limit, play time) and the Bedtime screen.
(function () {
  'use strict';
  const S = () => (window.__save && window.__save.data) || {};
  const store = () => window.__save && window.__save.store();
  const todayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  // ---------- stickers (achievements). Each one gives a capsule and may unlock a title for the player card
  const ACH = [
    { id: 'first_win', name: 'First Win!', desc: 'Win your first duel', icon: 'j:trophy', title: 'Pillow Rookie', ok: d => (d.wins || 0) >= 1 },
    { id: 'wins25', name: 'Pillow Pro', desc: 'Win 25 duels', icon: 'pillow', title: 'Pillow Pro', ok: d => (d.wins || 0) >= 25 },
    { id: 'hoot', name: 'Class Dismissed', desc: 'Beat Professor Hoot', icon: 'owl', title: 'Top Student', ok: d => (d.stars.hoot || 0) > 0 },
    { id: 'polandball', name: 'Into Space!', desc: 'Beat The Blips', icon: 'aliens', title: 'Space Cadet', ok: d => (d.stars.polandball || 0) > 0 },
    // v0.8: the Dragon Boss is gone; Jack vs a friend's Jack is the new dragon vs dragon (earned stickers stay earned)
    { id: 'dragon', name: 'Dragon vs Dragon', desc: "Beat a friend's Jack", icon: 'dragonboss', title: 'Dragon Champion', ok: d => (d.stats.fjackWins || 0) > 0 },
    { id: 'ufo', name: 'Saucer Champ', desc: 'Beat The Mothership', icon: 'ufo', title: 'Space Champion', ok: d => (d.stats.motherWins || 0) > 0 },
    { id: 'fang', name: 'King of Halloween', desc: 'Beat Count Fang', icon: 'vampire', title: 'Pumpkin King', ok: d => (d.stars.fang || 0) > 0 },
    { id: 'hardboss', name: 'Hard as Pillows', desc: 'Beat a boss on HARD', icon: 'j:hundred', title: 'Hard Mode Hero', ok: d => (d.stats.hardBossWins || 0) >= 1 },
    { id: 'allstars', name: 'Superstar', desc: 'All 24 stars in Hills + Space', icon: 'j:glowstar', title: 'Superstar',
      ok: d => ['timmy', 'moo', 'sly', 'hoot', 'robot', 'polandball', 'ghost', 'dragonboss'].every(k => (d.stars[k] || 0) >= 3) },
    { id: 'block5', name: 'Firefighter', desc: 'Block Inferno Rain 5 times', icon: 'extinguisher', title: 'Firefighter', ok: d => (d.stats.blocks || 0) >= 5 },
    { id: 'caps10', name: 'Capsule Hunter', desc: 'Open 10 capsules', icon: 'gift', title: 'Capsule Hunter', ok: d => (d.stats.capsOpened || 0) >= 10 },
    { id: 'superrare', name: 'Lucky Duck', desc: 'Get a SUPER RARE booster', icon: 'heart', title: 'Lucky Duck', ok: d => (d.stats.superRares || 0) >= 1 },
    { id: 'toy1', name: 'Toy Maker', desc: 'Add your first toy', icon: 'i:camera', title: 'Toy Maker', ok: d => (d.toys || []).length >= 1 },
    { id: 'toys5', name: 'Squad Goals', desc: 'Have 5 toys in your squad', icon: 'j:teddy', title: 'Squad Leader', ok: d => (d.toys || []).length >= 5 },
    { id: 'catch30', name: 'Star Catcher', desc: 'Score 30 in Star Catch', icon: 'star', title: 'Star Catcher', ok: d => (d.bestCatch || 0) >= 30 },
    { id: 'catch50', name: 'Galaxy Hands', desc: 'Score 50 in Star Catch', icon: 'planet', title: 'Galaxy Hands', ok: d => (d.bestCatch || 0) >= 50 },
    { id: 'nap10', name: 'Sleepyhead', desc: 'Take 10 Upside-Down Naps', icon: 'zzz', title: 'Sleepyhead', ok: d => (d.stats.naps || 0) >= 10 },
    { id: 'quest5', name: 'Super Helper', desc: 'Finish 5 real-life quests', icon: 'j:quests', title: 'Super Helper', ok: d => (d.stats.quests || 0) >= 5 },
    { id: 'friend1', name: 'Best Buddies', desc: 'Add a friend', icon: 'j:friends', title: 'Best Buddy', ok: d => (d.stats.friends || 0) >= 1 },
    { id: 'gift1', name: 'Kind Heart', desc: 'Send a gift to a friend', icon: 'j:gift', title: 'Kind Heart', ok: d => (d.stats.gifts || 0) >= 1 },
    { id: 'friendwin', name: 'Friendly Rival', desc: 'Beat a friend\'s toy', icon: 'j:thumbs', title: 'Friendly Rival', ok: d => (d.stats.friendWins || 0) >= 1 },
    { id: 'kraken', name: 'Kraken Fighter', desc: 'Fight the weekly Pillow Kraken', icon: 'kraken', title: 'Kraken Fighter', ok: d => (d.stats.krakenHits || 0) >= 1 },
  ];
  const ACH_BY_ID = {}; ACH.forEach(a => ACH_BY_ID[a.id] = a);
  const titles = () => ['Plush Friend'].concat(ACH.filter(a => a.title && S().ach && S().ach[a.id]).map(a => a.title));
  let pending = [];
  function checkAch() {
    const d = S(); if (!d.ach) return;
    ACH.forEach(a => { try { if (!d.ach[a.id] && a.ok(d)) { d.ach[a.id] = Date.now(); d.caps = (d.caps || 0) + 1; pending.push(a); if (a.id === 'allstars' && d.costumes) d.costumes.crown = true; } } catch (e) {} });
    if (pending.length) store();
  }
  function bump(k, n = 1) { const d = S(); if (!d.stats) return; d.stats[k] = (d.stats[k] || 0) + n; }

  // ---------- real-life quests (a grown-up approves them in the Parents area)
  const QUESTS = [
    { id: 'tidy', text: 'Tidy up your toys', icon: 'j:basket' }, { id: 'read', text: 'Read a book for 15 minutes', icon: 'books' },
    { id: 'teeth', text: 'Brush your teeth morning and night', icon: 'j:toothbrush' }, { id: 'dishes', text: 'Help with the dishes', icon: 'j:plate' },
    { id: 'bed', text: 'Make your bed', icon: 'j:bed' }, { id: 'outside', text: 'Play outside for 30 minutes', icon: 'j:tree' },
    { id: 'veggies', text: 'Eat all your veggies', icon: 'j:broccoli' }, { id: 'clothes', text: 'Put your clothes away', icon: 'j:shirt' },
    { id: 'build', text: 'Do a puzzle or build something', icon: 'j:puzzle' }, { id: 'hug', text: 'Give someone a big hug', icon: 'j:hug' },
    { id: 'draw', text: 'Draw a picture for someone', icon: 'j:pencil' }, { id: 'plants', text: 'Water the plants', icon: 'j:water' },
    { id: 'pet', text: 'Help with a pet (or a plush pet!)', icon: 'j:dog' }, { id: 'song', text: 'Sing or play a song', icon: 'j:music' },
    { id: 'jacks', text: 'Do 20 jumping jacks', icon: 'j:run' }, { id: 'homework', text: 'Finish your homework', icon: 'j:album' },
    { id: 'wash', text: 'Wash your hands before dinner', icon: 'j:soap' }, { id: 'sweep', text: 'Help sweep or vacuum a room', icon: 'j:broom' },
  ];
  const QBY = {}; QUESTS.forEach(q => QBY[q.id] = q);
  function todaysQuests() {
    const d = S(), t = todayKey();
    if (!d.quests || d.quests.date !== t) {
      // keep yesterday's "done" quests waiting for approval
      // older ones still waiting stay too, until a grown-up checks them (QA B10)
      const carry = d.quests ? (d.quests.old || []).concat((d.quests.list || []).filter(q => q.st === 'done')) : [];
      let seed = 0; for (const ch of t) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
      const pool = QUESTS.slice(), pick = [];
      while (pick.length < 3) { seed = (seed * 1103515245 + 12345) >>> 0; pick.push(pool.splice(seed % pool.length, 1)[0]); }
      d.quests = { date: t, list: pick.map(q => ({ id: q.id, st: 'todo' })), old: carry };
      store();
    }
    return d.quests;
  }
  const pendingQuests = () => { const q = todaysQuests(); return q.list.filter(x => x.st === 'done').concat(q.old || []); };

  // ---------- play time + bedtime / daily limit
  function addPlay(sec) {
    const d = S(); if (!d.play) d.play = {};
    const k = todayKey(); d.play[k] = (d.play[k] || 0) + sec;
    const keys = Object.keys(d.play).sort(); while (keys.length > 14) delete d.play[keys.shift()];
  }
  setInterval(() => { if (!document.hidden && window.__game && window.__save) { addPlay(30); try { localStorage.setItem('plushsquad_v1', JSON.stringify(S())); } catch (e) {} } }, 30000);
  function blockedReason() {
    const p = S().parent || {}, now = new Date();
    if (p.until && Date.now() < p.until) return null; // a grown-up allowed extra time
    if (p.offDay === todayKey()) return null;
    if (p.bedtime && p.bedtime !== 'off') {
      const [bh, bm] = p.bedtime.split(':').map(Number), mins = now.getHours() * 60 + now.getMinutes();
      if (mins >= bh * 60 + bm || mins < 7 * 60) return 'bed';
    }
    if (p.limit && ((S().play || {})[todayKey()] || 0) >= p.limit * 60) return 'limit';
    return null;
  }

  // ---------- small UI helpers
  function toast(scene, PS, icon, title, sub) {
    if (!scene || !scene.sys || !scene.sys.isActive()) return null; // the kid already left this screen (QA B40)
    const { W, PORTRAIT, txt, img, iconScale, A, C } = PS;
    const y = PORTRAIT ? 260 : 170;
    const c = scene.add.container(W / 2, -150).setDepth(95);
    const g = scene.add.graphics(); const w = Math.min(W - 60, 820), h = 150;
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, 40);
    g.fillStyle(0xfff3d2); g.fillRoundedRect(-w / 2, -h / 2, w, h, 40);
    g.lineStyle(6, C.star); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 40);
    const ic = img(scene, -w / 2 + 85, 0, icon); ic.setScale(iconScale(icon, 105));
    c.add([g, ic, PS.fit(txt(scene, -w / 2 + 160, -26, title, 40, C.ink, { st: 0, shadow: false, ox: 0 }), w - 190),
      PS.fit(txt(scene, -w / 2 + 160, 30, sub, 28, '#4a4f8c', { st: 0, shadow: false, ox: 0, weight: '500' }), w - 190)]);
    A.levelUp && A.levelUp();
    scene.tweens.chain({ targets: c, tweens: [{ y, duration: 420, ease: 'Back.out' }, { y, duration: 2400 }, { y: -160, duration: 300, ease: 'Quad.in' }], onComplete: () => c.destroy() });
    // a rotation waits until the toast is gone, so the kid always sees it (game.js __psBlockRotate, QA B37)
    window.__psToasts = (window.__psToasts || 0) + 1;
    c.once('destroy', () => {
      window.__psToasts = Math.max(0, window.__psToasts - 1);
      if (!window.__psToasts && window.__psRotatePending && window.__psTryRebuild) setTimeout(() => window.__psTryRebuild(), 60);
    });
    return c;
  }
  // a sticker leaves the queue once its toast has slid in; a screen that stops (or restarts) before that
  // hands it on to the next screen, e.g. after a rotation rebuild (QA B37)
  const queued = new Map();
  function flushToasts(scene, PS) {
    if (!pending.length || !scene || !scene.sys || !scene.sys.isActive()) return;
    if (!scene._psToasts || !scene._psToasts.alive) {
      const tk = scene._psToasts = { alive: true }, end = () => { tk.alive = false; scene.events.off('shutdown', end); scene.events.off('destroy', end); };
      scene.events.on('shutdown', end); scene.events.on('destroy', end);
    }
    const tk = scene._psToasts;
    const list = pending.filter(a => { const q = queued.get(a); return !(q && q.alive); });
    list.forEach((a, i) => {
      queued.set(a, tk);
      scene.time.delayedCall(400 + i * 3300, () => {
        toast(scene, PS, a.icon, a.head || 'NEW STICKER: ' + a.name, a.sub || (a.desc + '  ·  +1 capsule'));
        scene.time.delayedCall(450, () => { pending = pending.filter(x => x !== a); queued.delete(a); }); // seen
      });
    });
  }
  function header(scene, PS, title, back = 'title') {
    const { W, PORTRAIT, txt, sky, backButton, muteButton, fade } = PS;
    scene._leaving = false;
    scene.cameras.main.fadeIn(350, 15, 18, 64);
    sky(scene, 0);
    txt(scene, W / 2, PORTRAIT ? 190 : 85, title, PORTRAIT ? 76 : 68, '#fff3d2', { stroke: '#0f1240', st: 12 });
    backButton(scene, () => fade(scene, back));
    muteButton(scene);
  }
  function card(scene, PS, x, y, w, h, color, stroke) {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x - w / 2, y - h / 2 + 10, w, h, 34);
    g.fillStyle(color == null ? PS.C.night2 : color); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 34);
    g.lineStyle(5, stroke == null ? PS.C.seam : stroke); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 34);
    return g;
  }
  // grown-up gate: a multiplication question typed on the number pad
  function parentGate(scene, PS, onOk) {
    const { W, H, txt, button, C, A } = PS;
    const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
    const layer = scene.add.container(0, 0).setDepth(90);
    const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.85).setInteractive(); layer.add(dim);
    layer.add(card(scene, PS, W / 2, H / 2, Math.min(W - 60, 860), 640, C.night2, C.star));
    layer.add(txt(scene, W / 2, H / 2 - 230, 'GROWN-UPS ONLY', 56, '#ffd23f', { st: 8 }));
    layer.add(txt(scene, W / 2, H / 2 - 150, 'What is ' + a + ' × ' + b + ' ?', 52, '#fff3d2', { st: 6 }));
    const el = document.createElement('input');
    el.type = 'text'; el.inputMode = 'numeric'; el.pattern = '[0-9]*'; el.maxLength = 3; el.autocomplete = 'off';
    el.style.cssText = 'font:700 60px Poppins,Arial,sans-serif;color:#1d2163;background:#fff3d2;border:0;border-radius:24px;padding:6px 18px;width:260px;text-align:center;outline:none';
    const dom = scene.add.dom(W / 2, H / 2 - 40, el); layer.add(dom);
    const msg = txt(scene, W / 2, H / 2 + 60, '', 34, '#ff9ed8', { st: 5 }); layer.add(msg);
    const close = () => { el.blur(); layer.destroy(true); };
    const check = () => {
      if (parseInt(el.value, 10) === a * b) { close(); onOk(); }
      else { A.block(); msg.setText('Not quite. Ask a grown-up!'); el.value = ''; }
    };
    el.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    layer.add(button(scene, W / 2 - 170, H / 2 + 200, 300, 110, 'CANCEL', C.cream, close, { size: 40 }));
    layer.add(button(scene, W / 2 + 170, H / 2 + 200, 300, 110, 'OK', C.star, check, { size: 44 }));
    setTimeout(() => { try { el.focus(); } catch (e) {} }, 200);
  }


  // ---------- "What's new" popup: shows once per version (CLOSE = see it again next time, DON'T SHOW AGAIN = hide until the next update)
  const WHATS_NEW = {
    '0.7': [
      { icon: 'pumpkin', title: 'SPOOKY world', text: 'Halloween rivals: Pumpkin Pete, Batty, Webster and Count Fang. Win hats!' },
      { icon: 'j:friends', title: 'Friends', text: 'Log in, add friends with a code, duel their toys, send gifts and stickers.' },
      { icon: 'kraken', title: 'Weekly Boss', text: 'Everyone fights the Pillow Kraken together. Beat it for a GOLDEN capsule!' },
      { icon: 'j:album', title: 'Sticker Album', text: '21 stickers to collect. Every sticker gives you a capsule.' },
      { icon: 'j:quests', title: 'Real-life Quests', text: 'Do them for real, a grown-up checks, you get capsules and XP.' },
      { icon: 'j:teddy', title: 'Me', text: 'Your player card with titles and costumes.' },
      { icon: 'j:museum', title: 'Toy Museum', text: 'See your friends\' toys, give hearts, and race them in Star Catch.' },
      { icon: 'j:parents', title: 'For parents', text: 'Bedtime and daily play time. Plus: no more overlaps on screen!' },
    ],
  };
  function whatsNew(scene, PS) {
    const d = S(), v = PS.VERSION.split('.').slice(0, 2).join('.'), list = WHATS_NEW[v];
    if (!list || d.seenVersion === v || window.__psWN) return;
    if (!(d.xp || 0) && !(d.wins || 0)) { d.seenVersion = v; store(); return; } // brand-new players don't need patch notes
    window.__psWN = true; // shown once per app launch
    const { W, H, PORTRAIT, C, A, txt, fit, img, iconScale, button } = PS;
    const lay = scene.add.container(0, 0).setDepth(96);
    lay.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.88).setInteractive());
    const pw = Math.min(W - 40, PORTRAIT ? 1020 : 1500), cols = PORTRAIT ? 1 : 2, rowH = PORTRAIT ? 138 : 128;
    const rows = Math.ceil(list.length / cols), ph = 200 + rows * rowH + 170, top = H / 2 - ph / 2;
    lay.add(card(scene, PS, W / 2, H / 2, pw, ph, C.night2, C.star));
    lay.add(txt(scene, W / 2, top + 75, "WHAT'S NEW in v" + v + '!', PORTRAIT ? 60 : 64, '#ffd23f', { stroke: '#0f1240', st: 10 }));
    const colW = (pw - 60) / cols;
    list.forEach((it, i) => {
      const cx = W / 2 - pw / 2 + 30 + (i % cols) * colW, y = top + 170 + Math.floor(i / cols) * rowH + rowH / 2;
      const ic = img(scene, cx + 60, y, it.icon); ic.setScale(iconScale(it.icon, 88)); lay.add(ic);
      lay.add(fit(txt(scene, cx + 125, y - 26, it.title, 34, '#fff3d2', { st: 5, ox: 0 }), colW - 140));
      lay.add(txt(scene, cx + 125, y + 20, it.text, 24, '#bcc0ee', { st: 0, shadow: false, ox: 0, weight: '500', wrap: colW - 140, align: 'left' }));
      scene.tweens.add({ targets: ic, angle: { from: -8, to: 8 }, duration: 800 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    const by = top + ph - 85, close = () => { A.click(); lay.destroy(true); };
    lay.add(button(scene, W / 2 - 230, by, 400, 110, 'CLOSE', C.star, close, { size: 42 }));
    lay.add(button(scene, W / 2 + 230, by, 400, 110, "DON'T SHOW AGAIN", C.cream, () => { d.seenVersion = v; store(); close(); }, { size: 30 }));
    lay.setAlpha(0); scene.tweens.add({ targets: lay, alpha: 1, duration: 300 });
    A.levelUp && A.levelUp();
  }

  function scenes(PS) {
    const { W, H, PORTRAIT, C, A, Save, txt, fit, img, iconScale, button, chip, fade, heroDef, levelOf, totalStars, COSTUMES, RIVALS } = PS;

    // ---------- ME: player card, title, costume, account box
    class MeScene extends Phaser.Scene {
      constructor() { super('me'); }
      create() {
        header(this, PS, 'ME');
        const d = Save.data, hero = heroDef(this), lv = levelOf(d.xp).l, Net = window.PSNet;
        const cw = Math.min(W - 80, 960), cx = W / 2, cy = PORTRAIT ? 640 : 410, chh = PORTRAIT ? 560 : 520;
        this.add.existing(card(this, PS, cx, cy, cw, chh, C.night2, C.star));
        const ax = PORTRAIT ? cx : cx - cw / 2 + 200, ay = PORTRAIT ? cy - 120 : cy;
        const av = this.add.image(ax, ay + 110, hero.isJack ? 'jack_front' : hero.tex).setOrigin(0.5, 1);
        av.setScale(Math.min(250 / av.height, 260 / av.width));
        const hc = COSTUMES.find(c => c.id === d.costume);
        if (hc && hc.tex) { const h = PS.hatImage(this, ax, ay + 110 - av.displayHeight * 0.96, hc).setOrigin(0.5, 0.85); h.setScale(av.displayWidth * hc.w / h.width).setAngle(-6); }
        const tx = PORTRAIT ? cx : cx - cw / 2 + 400, ox = PORTRAIT ? 0.5 : 0, ty = PORTRAIT ? cy + 30 : cy - 170;
        const name = Net && Net.user ? Net.user.name : 'Guest';
        txt(this, tx, ty, name, 64, '#fff3d2', { st: 9, ox });
        if (!d.title) d.title = 'Plush Friend';
        const tchip = chip(this, PORTRAIT ? cx : tx + 0, ty + 70, '★ ' + d.title + '  ▸', C.star, 30);
        if (!PORTRAIT) tchip.x = tx + tchip.w / 2;
        tchip.setSize(tchip.w, 60).setInteractive({ useHandCursor: true });
        tchip.on('pointerup', () => { const t = titles(), i = t.indexOf(d.title); d.title = t[(i + 1) % t.length]; Save.store(); A.click(); this.scene.restart(); });
        const stats = 'Level ' + lv + '   ·   ★ ' + totalStars() + '   ·   Stickers ' + Object.keys(d.ach || {}).length + '/' + ACH.length + '   ·   Best catch ' + (d.bestCatch || 0);
        fit(txt(this, tx, ty + 150, stats, 30, '#bcc0ee', { st: 5, ox, weight: '500' }), PORTRAIT ? cw - 60 : cw - 440);
        txt(this, tx, ty + 205, 'Wins ' + (d.wins || 0) + '   ·   Toys ' + (d.toys || []).length, 30, '#bcc0ee', { st: 5, ox, weight: '500' });
        // costumes
        const owned = COSTUMES.filter(c => c.id === 'none' || (d.costumes || {})[c.id]);
        const yC = cy + chh / 2 + 90;
        txt(this, cx, yC, 'COSTUME', 40, '#ffd23f', { st: 7 });
        // more hats than fit in one row (v0.8: up to 8 + none): tall portrait screens wrap into two rows, others shrink the cards
        // (a second row must stay above the account box, which starts about H - 340 in portrait; iPad portrait has no room)
        const wrap = PORTRAIT && owned.length * 170 > W - 80 && yC + 110 + 170 + 75 < H - 340;
        const step = wrap ? 170 : Math.min(170, (W - 80) / owned.length), cs = step - 20;
        const perRow = wrap ? Math.floor((W - 80) / 170) : owned.length;
        owned.forEach((c, i) => {
          const row = Math.floor(i / perRow), inRow = Math.min(perRow, owned.length - row * perRow), col = i % perRow;
          const x = cx + (col - (inRow - 1) / 2) * step, y = yC + 110 + row * 170, on = d.costume === c.id;
          const b = this.add.container(x, y);
          b.add(card(this, PS, 0, 0, cs, cs, on ? C.star : C.night2, on ? 0xffffff : C.seam));
          if (c.tex) { const im = PS.hatImage(this, 0, -8, c); im.setScale(cs * 0.66 / Math.max(im.width, im.height)); b.add(im); }
          else b.add(txt(this, 0, -8, 'NONE', Math.round(cs * 0.2), on ? C.ink : '#bcc0ee', { st: 0, shadow: false }));
          b.setSize(cs, cs).setInteractive({ useHandCursor: true });
          b.on('pointerup', () => { d.costume = c.id; Save.store(); A.click(); this.scene.restart(); });
        });
        if (owned.length === 1) txt(this, cx, yC + (PORTRAIT ? 230 : 200), PS.EVENT_ON ? 'Beat the SPOOKY rivals to win Halloween hats!' : 'Beat Professor Hoot to win the Owl Hat!', 28, '#bcc0ee', { st: 5, weight: '500' });
        // account
        const yA = PORTRAIT ? H - 260 : H - 55;
        if (Net && Net.ready) {
          if (Net.user) {
            txt(this, PORTRAIT ? cx : 300, yA - (PORTRAIT ? 60 : 0), 'Friend code: ' + (Net.user.code || '...'), 38, '#7fe39a', { st: 6 });
            button(this, PORTRAIT ? cx : W - 260, PORTRAIT ? yA + 60 : yA, 360, 100, 'LOG OUT', C.cream, () => Net.logout().then(() => window.__psRebuild && window.__psRebuild({ key: 'title', data: {} })), { size: 38 });
          } else {
            fit(txt(this, PORTRAIT ? cx : 380, yA - (PORTRAIT ? 70 : 0), 'Log in to save in the cloud and play with friends', 30, '#bcc0ee', { st: 5, weight: '500', wrap: PORTRAIT ? W - 120 : 560 }), PORTRAIT ? W - 80 : 600);
            button(this, PORTRAIT ? cx : W - 280, PORTRAIT ? yA + 60 : yA, 420, 110, 'LOG IN / SIGN UP', C.star, () => fade(this, 'account'), { size: 38 });
          }
        }
      }
    }

    // ---------- ALBUM: stickers
    class AlbumScene extends Phaser.Scene {
      constructor() { super('album'); }
      create() {
        header(this, PS, 'STICKER ALBUM');
        const d = Save.data, got = Object.keys(d.ach || {}).length;
        txt(this, W / 2, PORTRAIT ? 270 : 150, got + ' / ' + ACH.length + ' stickers  ·  each one = +1 capsule', 32, '#ffd23f', { st: 6 });
        const cols = PORTRAIT ? 3 : 7, cw = PORTRAIT ? 310 : Math.min(200, (W - 120) / 7 - 14), ch = PORTRAIT ? 230 : 250;
        const top = PORTRAIT ? 330 : 200;
        const all = ACH.filter(a => a.id !== 'fang' || PS.EVENT_ON || d.ach[a.id]);
        // pages when the stickers do not fit (QA B06; v0.8 has 22+): as many rows as fit above the page buttons
        const rows = Math.max(1, Math.floor((H - top - 150) / (ch + 14))), per = rows * cols, pages = Math.ceil(all.length / per);
        const pg = Math.min(pages - 1, Math.max(0, (this.sys.settings.data && this.sys.settings.data.page) || 0));
        const shown = all.slice(pg * per, pg * per + per);
        if (pages > 1) {
          const by = top + rows * (ch + 14) + 60;
          if (pg > 0) PS.button(this, W / 2 - 260, by, 200, 100, '◀', C.cream, () => this.scene.restart({ page: pg - 1 }), { size: 48 });
          txt(this, W / 2, by, (pg + 1) + ' / ' + pages, 40, '#fff3d2', { st: 6 });
          if (pg < pages - 1) PS.button(this, W / 2 + 260, by, 200, 100, '▶', C.star, () => this.scene.restart({ page: pg + 1 }), { size: 48 });
        }
        shown.forEach((a, i) => {
          const x = W / 2 + ((i % cols) - (cols - 1) / 2) * (cw + 14), y = top + ch / 2 + Math.floor(i / cols) * (ch + 14);
          const has = !!(d.ach || {})[a.id];
          const c = this.add.container(x, y);
          c.add(card(this, PS, 0, 0, cw, ch, has ? C.cream : 0x161946, has ? C.star : C.seam));
          const ic = img(this, 0, -ch * 0.16, a.icon); ic.setScale(iconScale(a.icon, Math.min(cw, ch) * 0.48));
          if (!has) ic.setTint(0x000000).setAlpha(0.45);
          else this.tweens.add({ targets: ic, angle: { from: -5, to: 5 }, duration: 900 + i * 37, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          c.add(ic);
          c.add(fit(txt(this, 0, ch * 0.22, has ? a.name : '???', 26, has ? C.ink : '#8a8fd6', { st: 0, shadow: false }), cw - 16));
          c.add(fit(txt(this, 0, ch * 0.36, a.desc, 18, has ? '#4a4f8c' : '#6a72d6', { st: 0, shadow: false, weight: '500' }), cw - 16));
          c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 260, delay: i * 25, ease: 'Back.out' });
        });
      }
    }

    // ---------- QUESTS: today's 3 real-life quests
    class QuestsScene extends Phaser.Scene {
      constructor() { super('quests'); }
      create() {
        header(this, PS, 'REAL-LIFE QUESTS');
        const q = todaysQuests();
        fit(txt(this, W / 2, PORTRAIT ? 275 : 150, 'Do it for real, tap I DID IT, then a grown-up checks it. Each quest = +1 capsule +20 XP', 30, '#bcc0ee', { st: 5, weight: '500', wrap: W - 120 }), W - 80);
        const w = Math.min(W - 80, 1000), h = PORTRAIT ? 230 : 190, top = PORTRAIT ? 380 : 230;
        q.list.forEach((it, i) => {
          const Q = QBY[it.id], y = top + h / 2 + i * (h + 24);
          this.add.existing(card(this, PS, W / 2, y, w, h, it.st === 'ok' ? 0x2d6b55 : C.night2, it.st === 'ok' ? 0x7fe39a : C.seam));
          const ic = img(this, W / 2 - w / 2 + 100, y, Q.icon); ic.setScale(iconScale(Q.icon, 120));
          fit(txt(this, W / 2 - w / 2 + 190, y - (PORTRAIT ? 40 : 0), Q.text, 38, '#fff3d2', { st: 6, ox: 0 }), PORTRAIT ? w - 230 : w - 560);
          const bx = PORTRAIT ? W / 2 - w / 2 + 190 + 170 : W / 2 + w / 2 - 170, by = PORTRAIT ? y + 50 : y;
          if (it.st === 'todo') button(this, bx, by, 300, 90, 'I DID IT!', C.star, () => { it.st = 'done'; Save.store(); A.levelUp(); this.scene.restart(); }, { size: 36 });
          else if (it.st === 'done') chip(this, bx, by, 'Waiting for a grown-up', C.cream, 26);
          else chip(this, bx, by, 'DONE! +1 capsule', 0x7fe39a, 28);
        });
        const n = pendingQuests().length;
        if (n) button(this, W / 2, PORTRAIT ? H - 160 : H - 90, 560, 110, 'GROWN-UP: CHECK (' + n + ')', C.cream, () => fade(this, 'parents'), { size: 38 });
        txt(this, W / 2, PORTRAIT ? H - 50 : H - 25, 'New quests every day', 26, '#6a72d6', { st: 0, shadow: false, weight: '500' });
      }
    }

    // ---------- PARENTS: approve quests, bedtime, daily limit, play time
    class ParentsScene extends Phaser.Scene {
      constructor() { super('parents'); }
      init(data) { this.ok = !!(data && data.ok); }
      create() {
        header(this, PS, 'PARENTS');
        if (!this.ok) { parentGate(this, PS, () => this.scene.restart({ ok: true })); return; }
        const d = Save.data; if (!d.parent) d.parent = { bedtime: 'off', limit: 0 };
        const P = d.parent, colW = PORTRAIT ? W - 80 : (W - 120) / 2;
        const lx = PORTRAIT ? W / 2 : 40 + colW / 2, rx = PORTRAIT ? W / 2 : W - 40 - colW / 2;
        let y = PORTRAIT ? 300 : 170;
        // quests to approve
        txt(this, lx, y, 'Quests to check', 40, '#ffd23f', { st: 6 });
        const list = pendingQuests();
        if (!list.length) txt(this, lx, y + 70, 'Nothing to check right now', 30, '#bcc0ee', { st: 5, weight: '500' });
        list.slice(0, 4).forEach((it, i) => {
          const Q = QBY[it.id], yy = y + 90 + i * 110;
          this.add.existing(card(this, PS, lx, yy, colW, 96));
          const ic = img(this, lx - colW / 2 + 60, yy, Q.icon); ic.setScale(iconScale(Q.icon, 70));
          fit(txt(this, lx - colW / 2 + 110, yy, Q.text, 28, '#fff3d2', { st: 5, ox: 0 }), colW - 420);
          button(this, lx + colW / 2 - 200, yy, 170, 74, 'YES', 0x7fe39a, () => this.approve(it, true), { size: 30 });
          button(this, lx + colW / 2 - 70, yy, 110, 74, 'NO', C.cream, () => this.approve(it, false), { size: 30 });
        });
        if (PORTRAIT) y += 120 + Math.max(1, Math.min(4, list.length)) * 110;
        // bedtime + limit
        const ry0 = PORTRAIT ? y : 170;
        txt(this, rx, ry0, 'Bedtime (until 7:00)', 40, '#ffd23f', { st: 6 });
        this.pills(rx, ry0 + 80, ['off', '20:00', '20:30', '21:00', '21:30'], P.bedtime || 'off', v => { P.bedtime = v; });
        txt(this, rx, ry0 + 180, 'Daily play limit', 40, '#ffd23f', { st: 6 });
        this.pills(rx, ry0 + 260, [0, 30, 45, 60, 90], P.limit || 0, v => { P.limit = v; }, v => v ? v + ' min' : 'off');
        // play time chart (7 days)
        const cy = ry0 + 380, play = d.play || {};
        txt(this, rx, cy, 'Play time', 40, '#ffd23f', { st: 6 });
        const days = []; for (let i = 6; i >= 0; i--) { const t = new Date(Date.now() - i * 86400000); days.push([todayKey(t), 'SMTWTFS'[t.getDay()]]); }
        const max = Math.max(1800, ...days.map(([k]) => play[k] || 0)), bw = Math.min(90, (colW - 60) / 7 - 14), bh = 180;
        days.forEach(([k, l], i) => {
          const x = rx + (i - 3) * (bw + 14), v = play[k] || 0, hh = Math.max(4, bh * v / max), base = cy + 60 + bh;
          this.add.rectangle(x, base, bw, hh, i === 6 ? C.star : C.mint).setOrigin(0.5, 1);
          txt(this, x, base + 26, l, 24, '#bcc0ee', { st: 0, shadow: false });
          txt(this, x, base - hh - 18, Math.round(v / 60) + 'm', 20, '#fff3d2', { st: 0, shadow: false });
        });
      }
      pills(x, y, vals, cur, set, label = v => v) {
        const bw = Math.min(170, (PORTRAIT ? W - 100 : (W - 160) / 2) / vals.length - 8);
        vals.forEach((v, i) => {
          const px = x + (i - (vals.length - 1) / 2) * (bw + 8), on = v === cur;
          const b = this.add.container(px, y);
          b.add(card(this, PS, 0, 0, bw, 76, on ? C.star : 0x161946, on ? 0xffffff : C.seam));
          b.add(fit(txt(this, 0, 0, String(label(v)), 28, on ? C.ink : '#bcc0ee', { st: 0, shadow: false }), bw - 12));
          b.setSize(bw, 76).setInteractive({ useHandCursor: true });
          b.on('pointerup', () => { set(v); Save.store(); A.click(); this.scene.restart({ ok: true }); });
        });
      }
      approve(it, yes) {
        const d = Save.data, q = d.quests;
        if (yes) { d.caps = (d.caps || 0) + 1; d.xp += 20; bump('quests'); A.win(); } else A.click();
        if (q.old && q.old.includes(it)) q.old.splice(q.old.indexOf(it), 1); else it.st = yes ? 'ok' : 'todo';
        checkAch(); Save.store(); this.scene.restart({ ok: true });
      }
    }

    // ---------- BEDTIME: Jack is asleep
    class BedtimeScene extends Phaser.Scene {
      constructor() { super('bedtime'); }
      create() {
        this._leaving = false; this.cameras.main.fadeIn(500, 15, 18, 64);
        PS.sky(this, 0);
        const r = blockedReason() || 'bed';
        const j = this.add.image(W / 2, H * 0.62, 'jack_upside').setScale(PORTRAIT ? 0.9 : 0.75);
        this.tweens.add({ targets: j, y: j.y - 20, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.time.addEvent({ delay: 900, loop: true, callback: () => {
          const z = this.add.image(W / 2 + 160, H * 0.62 - 260, 'zzz').setScale(0.3).setAlpha(0);
          this.tweens.add({ targets: z, y: z.y - 220, x: z.x + 90, alpha: { from: 1, to: 0 }, duration: 2200, onComplete: () => z.destroy() });
        } });
        txt(this, W / 2, PORTRAIT ? 300 : 140, r === 'bed' ? 'Shhh... Jack is sleeping' : 'Play time is over for today', PORTRAIT ? 60 : 64, '#fff3d2', { st: 9, wrap: W - 80 });
        txt(this, W / 2, PORTRAIT ? 420 : 230, r === 'bed' ? 'See you tomorrow morning!' : 'Great playing! See you tomorrow!', 38, '#bcc0ee', { st: 6, weight: '500' });
        const b = button(this, W - 150, H - 80, 220, 90, 'PARENTS', C.night3, () => parentGate(this, PS, () => this.unlock()), { size: 30, color: '#fff3d2' });
        b.setAlpha(0.8);
        PS.muteButton(this); // (QA B21)
      }
      unlock() {
        const d = Save.data; if (!d.parent) d.parent = {};
        const lay = this.add.container(0, 0).setDepth(90);
        lay.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.85).setInteractive());
        lay.add(button(this, W / 2, H / 2 - 80, 600, 120, '15 MORE MINUTES', C.star, () => { d.parent.until = Date.now() + 15 * 60000; Save.store(); fade(this, 'title'); }, { size: 42 }));
        lay.add(button(this, W / 2, H / 2 + 80, 600, 120, 'NO LIMIT TODAY', C.cream, () => { d.parent.offDay = todayKey(); Save.store(); fade(this, 'title'); }, { size: 42 }));
      }
    }
    return [MeScene, AlbumScene, QuestsScene, ParentsScene, BedtimeScene];
  }

  function onEvent(name, d, scene, PS) {
    const s = S(); if (!s.stats) return;
    if (name === 'duel') {
      if (d.won && d.boss) bump('bossWins');
      if (d.won && d.boss && d.diff === 'hard') bump('hardBossWins');
      if (d.won && d.mode === 'friend') bump('friendWins');
      if (d.mode === 'boss') bump('krakenHits');
      if (d.won && d.rival && d.rival.id === 'fjack') bump('fjackWins');
      if (d.won && d.rival && d.rival.id === 'dragonboss') bump('motherWins');
    }
    // Firefighter counts extinguisher blocks only; umbrella blocks of the Tractor Beam count apart (v0.8)
    if (name === 'block') bump(d && d.tool === 'umbrella' ? 'beamBlocks' : 'blocks');
    if (name === 'move' && d.type === 'nap') bump('naps');
    if (name === 'save' && d.result === 'perfect') bump('perfectSaves');
    if (name === 'capsule') { bump('capsOpened'); if (d.boost && d.boost.r === 3) bump('superRares'); }
    if (name === 'friendAdded') bump('friends');
    if (name === 'giftSent') bump('gifts');
    if (['duel', 'block', 'capsule', 'toyAdded', 'catch', 'friendAdded', 'giftSent', 'scene'].includes(name)) checkAch();
    if (name === 'scene') {
      // bedtime / daily limit: checked whenever a menu screen opens (never in the middle of a duel)
      // a new duel counts too (REMATCH / NEXT RIVAL), a duel restored after rotating does not (QA B03)
      const newDuel = d.key === 'battle' && !scene.res;
      if ((newDuel || ['title', 'map', 'squad', 'catch', 'hockey', 'comic', 'gacha', 'me', 'album', 'quests', 'friends', 'boss'].includes(d.key)) && blockedReason()) { scene.time.delayedCall(50, () => PS.fade(scene, 'bedtime')); return; }
      // not on the boot scene of a rebuilt game (it stops at once and the toasts were lost, QA B37);
      // a result panel restored after a rotation shows them like a menu does
      // v0.8: hats given to old saves by the migration in game.js, announced once like stickers (QA B43)
      const g = S().gifts08;
      if (g && d.key !== 'boot' && d.key !== 'battle') {
        g.forEach(id => { const c = PS.COSTUMES.find(x => x.id === id); if (c) pending.push({ icon: c.tex, head: 'A GIFT: ' + c.name + '!', sub: 'Thank you for playing! Put it on in Me' }); });
        delete S().gifts08; store();
      }
      if (d.key !== 'boot' && (d.key !== 'battle' || scene.shown)) flushToasts(scene, PS);
      if (d.key === 'title') scene.time.delayedCall(900, () => whatsNew(scene, PS));
    } else if (name === 'duel') scene.time.delayedCall(2500, () => flushToasts(scene, PS));
    else flushToasts(scene, PS);
  }

  window.PSExtra = { ACH, QUESTS, todaysQuests, pendingQuests, blockedReason, toast, header, card, parentGate, checkAch, bump };
  (window.PSPlugins = window.PSPlugins || []).push({
    name: 'extra',
    nav: [
      { key: 'me', label: 'ME', icon: 'j:teddy', order: 1 },
      { key: 'album', label: 'ALBUM', icon: 'j:album', order: 3 },
      { key: 'quests', label: 'QUESTS', icon: 'j:quests', order: 4, badge: () => { try { return todaysQuests().list.filter(q => q.st === 'todo').length; } catch (e) { return 0; } } },
      { key: 'parents', label: 'PARENTS', icon: 'j:parents', order: 5 },
    ],
    scenes, onEvent,
  });
})();
