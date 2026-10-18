// v1.1.1 hotfix: capsule machine (SKIP ANIMATION, OPEN 10), mail MARK ALL READ, B70 / B71 iPad landscape layouts, B72 small layout fixes.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, noErrors } = require('./helpers');

// every sticker earned: no sticker toast and no sticker capsule changes the counts
const ACH_IDS = [...fs.readFileSync(path.join(__dirname, '..', 'js', 'extra.js'), 'utf8').matchAll(/\{ id: '(\w+)', name:/g)].map(m => m[1]);
const ach = Object.fromEntries(ACH_IDS.map(id => [id, 1]));
const SAVE = Object.assign({}, BASE_SAVE, { ach, stats: {}, daily: new Date().toDateString() });
const save = o => Object.assign({}, SAVE, o);
const PHONE = [390, 844], PAD = [1180, 820];

const texts = (page, key) => page.evaluate(key => {
  const out = [], walk = l => l.forEach(o => { if (o.type === 'Text' && o.visible) out.push(o.text); if (o.list) walk(o.list); });
  walk(__game.scene.getScene(key).children.list); return out;
}, key);
// taps the button (container) with this label
const tapLabel = (page, key, label) => page.evaluate(([key, label]) => {
  const find = l => { for (const o of l) { if (o.list) { if (o.input && o.list.some(t => t.type === 'Text' && t.text === label)) return o; const r = find(o.list); if (r) return r; } } return null; };
  const c = find(__game.scene.getScene(key).children.list); if (!c) return false; c.emit('pointerup', {}); return true;
}, [key, label]);
const prefs = page => page.evaluate(() => ({ live: PSPrefs.data.skipCaps, stored: JSON.parse(localStorage.getItem('plushsquad_prefs')).skipCaps }));

for (const [w, h] of [PHONE, PAD]) {
  test(`capsule machine: SKIP ANIMATION checkbox (90 px target, remembered), OPEN 10 only with 10+ capsules (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page, save({ caps: 3 }));
    await go(page, 'gacha');
    const info = () => page.evaluate(() => { const s = __game.scene.getScene('gacha'), c = s.skipUI;
      return { box: c.visible, tall: c.height * c.scaleY, wide: c.width * c.scaleX, ten: s.tenBtn.visible, x: c.x, y: c.y, W: __game.config.width, H: __game.config.height }; });
    let i = await info();
    expect(i.box).toBe(true); expect(i.ten).toBe(false);
    expect(i.tall).toBeGreaterThanOrEqual(90); expect(i.wide).toBeGreaterThanOrEqual(90);
    expect(i.y + i.tall / 2).toBeLessThanOrEqual(i.H); expect(i.x - i.wide / 2).toBeGreaterThanOrEqual(0); expect(i.x + i.wide / 2).toBeLessThanOrEqual(i.W);
    expect(await texts(page, 'gacha')).toContain('Skip animation');
    expect((await prefs(page)).live).toBe(false);
    expect(await tapLabel(page, 'gacha', 'Skip animation')).toBe(true);
    expect(await prefs(page)).toEqual({ live: true, stored: true });
    // with skip: the booster is shown at once, no TAP TO OPEN!, one capsule less
    await page.evaluate(() => __game.scene.getScene('gacha').turn());
    await wait(page, 1500);
    expect(await page.evaluate(() => __save.data.caps)).toBe(2);
    const t = await texts(page, 'gacha');
    expect(t).not.toContain('TAP TO OPEN!');
    expect(t.some(s => /^(NICE!|ONE MORE!)$/.test(s))).toBe(true);
    // the choice survives a reload of the page
    await page.reload(); await page.waitForFunction(() => window.__game && __game.scene.getScenes(true).length > 0, null, { timeout: 60000 });
    expect((await page.evaluate(() => PSPrefs.data.skipCaps))).toBe(true);
    // 10 capsules: OPEN 10 shows
    await page.evaluate(() => { __save.data.caps = 10; __save.store(); });
    await go(page, 'gacha');
    i = await info(); expect(i.ten).toBe(true);
    await page.evaluate(() => { __save.data.caps = 9; __save.store(); __game.scene.getScene('gacha').refresh(); });
    expect((await info()).ten).toBe(false);
    noErrors(page);
  });
}

test('capsule machine: with the animation (skip off) a single open still waits for TAP TO OPEN!', async ({ page }) => {
  await boot(page, save({ caps: 2 }));
  await go(page, 'gacha');
  // TAP TO OPEN! is shown for a few seconds only (then it opens by itself): record every text the scene creates
  await page.evaluate(() => { const sc = __game.scene.getScene('gacha'); window.__made = []; const o = sc.add.text.bind(sc.add); sc.add.text = (...a) => { __made.push(a[2]); return o(...a); }; });
  await page.evaluate(() => __game.scene.getScene('gacha').turn());
  await expect.poll(async () => { await fast(page); return page.evaluate(() => __made); }, { timeout: 40000 }).toContain('TAP TO OPEN!');
  noErrors(page);
});

for (const skip of [true, false]) {
  test(`OPEN 10 (skip ${skip}): 10 capsules, 10 results on one screen, caps -10, 10 capsule events, stats count 10`, async ({ page }) => {
    await page.setViewportSize({ width: PHONE[0], height: PHONE[1] });
    await boot(page, save({ caps: 12, goldCaps: 2 }));
    await page.evaluate(skip => {
      PSPrefs.set('skipCaps', skip);
      window.__ev = []; (window.PSPlugins).push({ onEvent: (n, d) => { if (n === 'capsule') __ev.push([d.boost.id, d.isNew]); } });
    }, skip);
    await go(page, 'gacha');
    expect(await page.evaluate(() => __game.scene.getScene('gacha').tenBtn.visible)).toBe(true);
    expect(await tapLabel(page, 'gacha', 'OPEN 10')).toBe(true);
    await expect.poll(async () => { await fast(page); return texts(page, 'gacha'); }, { timeout: 40000 }).toContain('10 CAPSULES!');
    await wait(page, 2500);
    const r = await page.evaluate(() => { const s = __game.scene.getScene('gacha');
      const cards = s.summ.list.filter(o => o.type === 'Container' && !o.input);
      return { caps: __save.data.caps, gold: __save.data.goldCaps, ev: __ev.length, opened: __save.data.stats.capsOpened, total: Object.values(__save.data.boosts).reduce((a, b) => a + b, 0), cards: cards.length,
        bad: cards.filter(c => { const b = c.getBounds(); return b.left < -2 || b.right > __game.config.width + 2 || b.bottom > __game.config.height; }).length }; });
    expect(r).toMatchObject({ caps: 2, gold: 2, ev: 10, opened: 10, total: 10, cards: 10, bad: 0 }); // golden capsules are left alone
    // the summary's boosters are exactly the 10 events, in order
    const names = await page.evaluate(() => { const s = __game.scene.getScene('gacha'); return s.summ.list.filter(o => o.type === 'Container' && !o.input).map(c => c.list.find(t => t.type === 'Text').text); });
    expect(names).toEqual(await page.evaluate(() => __ev.map(e => __BOOSTS.find(b => b.id === e[0]).name)));
    // NICE! closes it and the machine is usable again
    expect(await tapLabel(page, 'gacha', 'NICE!')).toBe(true);
    await expect.poll(async () => { await fast(page); return page.evaluate(() => !__game.scene.getScene('gacha').busy); }, { timeout: 20000 }).toBe(true);
    expect(await page.evaluate(() => __game.scene.getScene('gacha').tenBtn.visible)).toBe(false); // 2 capsules left
    noErrors(page);
  });
}

for (const [w, h] of [PHONE, PAD]) {
  test(`mail: MARK ALL READ clears the badge and popup count, keeps the gifts claimable (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page, save());
    // a stub for the online part; the inbox it serves is changed below
    await page.evaluate(() => {
      window.__inbox = [1, 2, 3].map(i => ({ id: 'm' + i, kind: 'gift_capsule', from_name: 'pal' + i, from_user: 'u' + i, payload: {} }));
      PSNet.ready = true; PSNet.user = { id: 'u1', name: 'kid', code: 'ABCD-EF' };
      PSNet.sb = { rpc: async () => ({ data: true }), from: () => { const q = { select: () => q, eq: () => q, order: () => q, limit: () => Promise.resolve({ data: __inbox.map(m => Object.assign({}, m)) }) }; return q; } };
    });
    await go(page, 'friends', { tab: 'mail' });
    await expect.poll(async () => { await fast(page); return texts(page, 'friends'); }, { timeout: 30000 }).toContain('MARK ALL READ');
    expect(await page.evaluate(() => PSNet.unread)).toBe(3);
    expect((await texts(page, 'friends')).filter(s => s === 'OPEN').length).toBe(3);
    expect(await tapLabel(page, 'friends', 'MARK ALL READ')).toBe(true);
    await expect.poll(async () => { await fast(page); return page.evaluate(() => PSNet.unread); }, { timeout: 30000 }).toBe(0);
    await expect.poll(async () => { await fast(page); return texts(page, 'friends'); }, { timeout: 30000 }).toContain('pal1 sent you a capsule!');
    const t = await texts(page, 'friends');
    expect(t).not.toContain('MARK ALL READ');
    expect(t.filter(s => s === 'OPEN').length).toBe(3); // still there and claimable
    // the nav badge (FRIENDS on the title and map) uses the same count
    expect(await page.evaluate(() => PSPlugins.find(p => p.name === 'net').nav[0].badge())).toBe(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plushsquad_mailseen_u1')).length)).toBe(3);
    // a later fetch: the same messages stay read, a new one counts
    await page.evaluate(async () => { __inbox.push({ id: 'm4', kind: 'friend', from_name: 'pal4', from_user: 'u4' }); await PSNet.inbox(); });
    expect(await page.evaluate(() => PSNet.unread)).toBe(1);
    await page.evaluate(() => PSNet.markAllRead());
    expect(await page.evaluate(() => PSNet.unread)).toBe(0);
    // claiming a gift still works and does not touch the seen list of the others
    await page.evaluate(() => { const s = __game.scene.getScene('friends'); s.scene.restart({ tab: 'mail' }); });
    await expect.poll(async () => { await fast(page); return texts(page, 'friends'); }, { timeout: 30000 }).toContain('pal1 sent you a capsule!');
    const caps0 = await page.evaluate(() => __save.data.caps);
    expect(await tapLabel(page, 'friends', 'OPEN')).toBe(true);
    await expect.poll(async () => page.evaluate(() => __save.data.caps), { timeout: 20000 }).toBe(caps0 + 1);
    noErrors(page);
  });
}

// ---------- B70 / B71: iPad landscape
const seed = (page, nToys, away = [], xp = 200) => page.evaluate(async ([nToys, away, xp]) => {
  const cv = document.createElement('canvas'); cv.width = 80; cv.height = 100;
  const cx = cv.getContext('2d'); cx.fillStyle = '#ff8a3d'; cx.fillRect(10, 10, 60, 80);
  const url = cv.toDataURL('image/png');
  const mk = async (i, p) => { const t = PSToys.createToy({ arch: PSToys.ARCH[i % PSToys.ARCH.length].id, element: 'magic', seed: 100 + i, aspect: 1 }); t.id = p + i; t.name = 'Toy' + i; t.xp = xp; await __IDB.set(t.id, url); return t; };
  const toys = []; for (let i = 0; i < nToys; i++) toys.push(await mk(i, 't'));
  toys.forEach(t => __game.textures.addImage('toy_' + t.id, __game.textures.get('jack_front').getSourceImage()));
  const day = n => PSAdventure.todayKey(new Date(Date.now() - n * 86400000));
  const list = [];
  for (let i = 0; i < away.length; i++) list.push({ toy: await mk(i, 'a'), trip: { world: away[i][0], left: day(away[i][1]), cards: away[i][2] || 0, seen: 0 } });
  __save.data.toys = toys; __save.data.away = list; __save.store();
}, [nToys, away, xp]);
const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

for (const [w, h] of [PAD, PHONE, [820, 1180]]) {
  test(`B70: My Squad toy page: ADVENTURE, PLAY AS and DUEL! do not touch and sit inside the panel, the XP text too (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page, save());
    await seed(page, 2, [], 200);
    await go(page, 'squad');
    await page.evaluate(() => __game.scene.getScene('squad').details({ toy: __save.data.toys[0] }));
    await wait(page, 1500);
    const r = await page.evaluate(() => {
      const s = __game.scene.getScene('squad'), W = __game.config.width, H = __game.config.height;
      const layer = s.children.list.filter(o => o.type === 'Container' && o.depth === 60)[0], p = layer.list.find(o => o.type === 'Container');
      const panel = p.list.find(o => o.type === 'Rectangle' && o.input).getBounds(), out = { panel: { l: panel.left, r: panel.right, t: panel.top, b: panel.bottom }, btn: {} };
      const bt = o => { const b = o.getBounds(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
      p.list.forEach(o => { if (o.type === 'Container' && o.input) { const t = o.list.find(x => x.type === 'Text'); if (t && /ADVENTURE|PLAY AS|PLAYING|DUEL/.test(t.text)) out.btn[t.text.replace(/ ✓/, '')] = bt(o); } });
      const xp = p.list.find(o => o.type === 'Text' && /toy XP$/.test(o.text)); out.xp = bt(xp);
      return out;
    });
    const names = Object.keys(r.btn); expect(names.length).toBe(3);
    const P = { left: r.panel.l, right: r.panel.r, top: r.panel.t, bottom: r.panel.b };
    for (const n of names) { const b = r.btn[n]; expect(b.left, n).toBeGreaterThanOrEqual(P.left + 20); expect(b.right, n).toBeLessThanOrEqual(P.right - 20); expect(b.bottom, n).toBeLessThanOrEqual(P.bottom - 20); expect(b.top, n).toBeGreaterThanOrEqual(P.top); }
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) expect(hit(r.btn[names[i]], r.btn[names[j]]), names[i] + ' vs ' + names[j]).toBe(false);
    expect(r.xp.right).toBeLessThanOrEqual(P.right - 20);
    noErrors(page);
  });
}

for (const [w, h] of [PAD, PHONE]) {
  test(`B71: Adventures list: postcards not covered by the buttons, day line readable (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page, save());
    await seed(page, 0, [[3, 5, 3], [2, 2, 1], [0, 6, 2]]);
    await go(page, 'adventures');
    await wait(page, 1500);
    const rows = await page.evaluate(() => {
      const s = __game.scene.getScene('adventures'), W = __game.config.width, H = __game.config.height;
      return s.children.list.filter(o => o.type === 'Container' && o.depth === 5).map(c => {
        const bt = o => { const b = o.getBounds(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
        const lab = o => o.list && o.list.find(t => t.type === 'Text');
        const btns = c.list.filter(o => o.type === 'Container' && o.input && lab(o) && /CALL HOME|SAY GOODBYE/.test(lab(o).text)).map(bt);
        const cards = c.list.filter(o => o.type === 'Container' && o.input && !lab(o)).map(bt);
        const day = c.list.find(o => o.type === 'Text' && /^Day \d/.test(o.text));
        return { btns, cards, size: parseFloat(day.style.fontSize) * day.scaleY, tiles: c.list.filter(o => o.type === 'Container' && !lab(o) && o.list.some(x => x.type === 'Graphics')).length, all: bt(c), W, H };
      });
    });
    expect(rows.length).toBe(3);
    for (const r of rows) {
      expect(r.btns.length).toBe(2);
      expect(r.size).toBeGreaterThanOrEqual(24);
      for (const b of r.btns) for (const c of r.cards) expect(hit(b, c)).toBe(false);
      for (const b of r.btns) { expect(b.left).toBeGreaterThanOrEqual(r.all.left); expect(b.right).toBeLessThanOrEqual(r.all.right); }
    }
    expect(rows.map(r => r.cards.length)).toEqual([3, 1, 2]); // delivered postcards stay tappable
    noErrors(page);
  });
}

// ---------- B72
for (const [w, h] of [PAD, PHONE]) {
  test(`B72: Ocean map: the lighthouse is not behind a map node (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page, save({ stars: { timmy: 3, moo: 2, sly: 2, hoot: 1, fang: 1, dragonboss: 1, moose: 1, sasquatch: 1 } }));
    await go(page, 'map', { world: 3 });
    const r = await page.evaluate(() => {
      const s = __game.scene.getScene('map'), H = __game.config.height, PORT = H > __game.config.width, gy = H * (PORT ? 0.62 : 0.58), lx = s.lhX;
      const box = { left: lx - 30, right: lx + 30, top: gy - 226, bottom: gy };
      const hits = []; const walk = l => l.forEach(o => { if (o.visible && o.type === 'Container' && o.input && o.width >= 100 && o.height >= 100) { const b = o.getBounds(); if (b.left < box.right && box.left < b.right && b.top < box.bottom && box.top < b.bottom) hits.push([Math.round(b.left), Math.round(b.top)]); } if (o.type === 'Container' && o.list && o.depth !== undefined) walk(o.list); });
      walk(s.children.list); return { lx, hits };
    });
    expect(r.lx).toBeGreaterThan(0);
    expect(r.hits).toEqual([]);
    noErrors(page);
  });
}

for (const [w, h] of [PHONE, PAD]) {
  test(`B72: Brock Lee hiding: dark strip behind the log line, small HIDING! stamp clear of the card names (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page, save({ xp: 6750 }));
    await go(page, 'battle', { rival: await page.evaluate(() => __RIVALS.findIndex(r => r.id === 'brocklee')) });
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
    await expect.poll(async () => { await fast(page); return page.evaluate(() => { const b = __game.scene.getScene('battle'); return !!(b && b.hero && !b.busy && !b.over); }); }, { timeout: 60000 }).toBe(true);
    await page.evaluate(async () => { const b = __game.scene.getScene('battle'), m = b.rmoves.find(x => x.type === 'hide'); b.busy = true; await b.doMove(m, b.rival, b.hero); b.busy = false; b.setCards(true); });
    await wait(page, 1500);
    const r = await page.evaluate(() => {
      const b = __game.scene.getScene('battle'), lb = b.logBg && b.logBg.getBounds(), lt = b.logT.getBounds();
      const stamps = b.moves.map(m => m.card).map(c => { const u = c.list[4], t1 = c.list[2]; return u.visible && u.text === 'HIDING!' ? { size: parseFloat(u.style.fontSize) * u.scaleX, a: u.getBounds(), n: t1.getBounds() } : null; }).filter(Boolean);
      return { bg: !!lb, cover: lb ? lb.left <= lt.left && lb.right >= lt.right && lb.top <= lt.top && lb.bottom >= lt.bottom : false, depth: b.logBg ? [b.logBg.depth, b.logT.depth] : null,
        stamps: stamps.map(s => ({ size: s.size, over: Math.max(0, Math.min(s.a.right, s.n.right) - Math.max(s.a.left, s.n.left)) * Math.max(0, Math.min(s.a.bottom, s.n.bottom) - Math.max(s.a.top, s.n.top)) / (s.a.width * s.a.height) })) };
    });
    expect(r.bg).toBe(true); expect(r.cover).toBe(true); expect(r.depth[1]).toBeGreaterThan(r.depth[0]);
    expect(r.stamps.length).toBeGreaterThan(0);
    r.stamps.forEach(s => { expect(s.size).toBeLessThanOrEqual(30); expect(s.over).toBeLessThan(0.3); }); // (the title box is wider than its letters)
    // found him: the strip and the stamps go away
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.clearMounds(); b.hidden = null; b.setCards(true); });
    expect(await page.evaluate(() => { const b = __game.scene.getScene('battle'); return [!!b.logBg, b.moves.some(m => m.card.list[4].visible && m.card.list[4].text === 'HIDING!')]; })).toEqual([false, false]);
    noErrors(page);
  });
}

for (const [w, h] of [PHONE, PAD]) {
  test(`B72: Halloween title: the sticker toast does not cover the PLUSH SQUAD logo (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    // fang beaten, King of Halloween not yet earned: its toast comes up on the title
    await boot(page, Object.assign(save({ stars: { timmy: 3, moo: 2, sly: 2, hoot: 1, fang: 1 } }), {}), '&halloween');
    await page.evaluate(() => { __save.data.ach.fang = 0; __game.scene.getScenes(true)[0].scene.start('title'); });
    // the toast stays up for about 3 s: catch it once it has settled and compare it with the logo letters
    const h1 = await page.waitForFunction(() => {
      const s = __game.scene.getScene('title'); s.tweens.setLagSmooth(5000, 33);
      const c = s.children.list.find(o => o.type === 'Container' && o.depth === 95); if (!c || c.y < 100 || c.y > __game.config.height) return false;
      const tb = { left: c.x - 410, right: c.x + 410, top: c.y - 75, bottom: c.y + 75 };
      const logo = s.children.list.filter(o => o.type === 'Text' && o.text.length === 1 && parseFloat(o.style.fontSize) >= 100 && o.y > 0 && o.y < __game.config.height).map(o => o.getBounds());
      return { n: logo.length, hits: logo.filter(b => b.left < tb.right && tb.left < b.right && b.top < tb.bottom && tb.top < b.bottom).length, y: c.y };
    }, null, { polling: 50, timeout: 40000 });
    const r = await h1.jsonValue();
    expect(r.n).toBeGreaterThan(0);
    expect(r.hits).toBe(0);
    noErrors(page);
  });
}
