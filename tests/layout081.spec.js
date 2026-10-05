// v0.8.1 layout fixes: My Squad paging (B05), capsule machine (B07), Me (B11), Parents (B15, B19, B59),
// Quests (B16, B59), Title level panel (B18), result notes (B32). Checked on phone, iPad, portrait and landscape.
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, offscreen, noErrors } = require('./helpers');

const SIZES = { 'iPhone SE': [375, 667], 'iPhone 14': [390, 844], 'phone landscape': [844, 390], 'iPad Air portrait': [820, 1180], 'iPad portrait': [768, 1024], 'iPad Air landscape': [1180, 820] };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ARCH = ['dragon', 'dinosaur', 'bear', 'bunny', 'cat', 'dog'];
const TOYS = Array.from({ length: 14 }, (_, i) => ({ id: 't' + i, arch: ARCH[i % 6], element: 'ice', quirk: 'sleepy', hp: 100, name: 'Toy ' + i, seed: i }));
const ALL_HATS = { owlhat: true, ufohat: true, bat: true, pumpkin: true, tophat: true, witchhat: true, crown: true, toque: true };
// every sticker already earned: no toasts sliding over the screens
const ACH = ['first_win', 'wins25', 'hoot', 'polandball', 'dragon', 'ufo', 'fang', 'hardboss', 'allstars', 'block5', 'caps10', 'superrare', 'toy1', 'toys5', 'catch30', 'catch50', 'nap10', 'quest5', 'friend1', 'gift1', 'friendwin', 'sasquatch', 'goalie', 'hattrick', 'slapshot', 'umbrella5', 'kraken'];
const save = extra => Object.assign({}, BASE_SAVE, { ach: Object.fromEntries(ACH.map(k => [k, 1])) }, extra);
const QUESTS = () => ({ date: today(), list: [{ id: 'pancakes', st: 'todo' }, { id: 'polite', st: 'done' }, { id: 'animal', st: 'ok' }], old: [{ id: 'leaf', st: 'done' }, { id: 'birds', st: 'done' }, { id: 'pet', st: 'done' }] });

// screen boxes (play-area coordinates) of the texts and the tappable objects of a scene;
// tappable containers are not opened up (their own labels sit inside them)
const boxes = (page, key) => page.evaluate(key => {
  const s = __game.scene.getScene(key), W = __game.config.width, cam = s.cameras.main, out = [];
  const walk = list => list.forEach(o => {
    if (!o.visible || o.alpha === 0) return;
    const tap = o.input && o.input.enabled && o.width && o.width < W * 0.95;
    if ((o.type === 'Text' && o.text.length > 1) || tap) {
      let b;
      if (o.type === 'Container') { const m = o.getWorldTransformMatrix(); b = { x: m.tx - o.width * m.scaleX / 2, y: m.ty - o.height * m.scaleY / 2, w: o.width * m.scaleX, h: o.height * m.scaleY }; }
      else { const r = o.getBounds(); b = { x: r.x, y: r.y, w: r.width, h: r.height }; }
      const label = o.type === 'Text' ? o.text : ((o.list || []).find(x => x.type === 'Text') || {}).text || o.type;
      out.push({ label: String(label).slice(0, 40), x: b.x - cam.scrollX, y: b.y - cam.scrollY, w: b.w, h: b.h, text: o.type === 'Text',
        fs: o.type === 'Text' ? parseFloat(o.style.fontSize) * o.scaleX : 0, lines: o.type === 'Text' ? o.getWrappedText().length : 0 });
    }
    if (o.list && !tap) walk(o.list);
  });
  walk(s.children.list); return out;
}, key);
const overlaps = list => {
  const bad = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.x < b.x + b.w - 2 && b.x < a.x + a.w - 2 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2) bad.push(a.label + ' x ' + b.label);
  }
  return bad;
};
const outside = (page, list) => page.evaluate(list => {
  const W = __game.config.width, H = __game.config.height;
  return list.filter(a => a.x < -2 || a.y < -2 || a.x + a.w > W + 2 || a.y + a.h > H + 2).map(a => a.label);
}, list);
const clean = async (page, key) => {
  const list = await boxes(page, key);
  expect(overlaps(list), key).toEqual([]);
  expect(await outside(page, list), key).toEqual([]);
  expect(await offscreen(page, key), key).toEqual([]);
  return list;
};

for (const [tag, [width, height]] of Object.entries(SIZES)) {
  test(`v0.8.1 layout: Squad pages, capsules, Me, Quests, Parents fit (${tag})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await boot(page, save({ toys: TOYS, costumes: ALL_HATS, costume: 'owlhat', caps: 2, seen: { fort: 1 }, boosts: { fort: 1 }, quests: QUESTS() }));
    const landscape = width > height;

    // B05: every toy is on some page, and each page fits
    await go(page, 'squad');
    const names = new Set();
    for (let pg = 0; pg < 5; pg++) {
      if (pg) { await page.evaluate(pg => __game.scene.getScene('squad').scene.restart({ page: pg }), pg); await wait(page, 1500); }
      const list = await clean(page, 'squad');
      list.filter(b => !b.text).forEach(b => names.add(b.label));
      if (!list.some(b => b.label === '▶')) break;
    }
    for (const n of ['Jack'].concat(TOYS.map(t => t.name))) expect(names, n).toContain(n);

    // B07: all 10 booster cards inside the screen
    await go(page, 'gacha');
    await clean(page, 'gacha');
    const cards = await page.evaluate(() => __game.scene.getScene('gacha').grid.list.filter(o => o.type === 'Container').length);
    expect(cards).toBe(10);

    // B11: hat row clear of the account text (8 hats)
    await go(page, 'me');
    await clean(page, 'me');

    // B16 / B59: quests fit, quest texts at most two lines and not shrunk
    await go(page, 'quests');
    const q = await clean(page, 'quests');
    for (const t of ['Make pancakes', 'Say "please"', 'Learn 3 facts']) {
      const b = q.find(x => x.label.startsWith(t));
      expect(b.lines).toBeLessThanOrEqual(2);
      if (landscape) expect(b.fs).toBeGreaterThanOrEqual(38);
    }

    // B15 / B19 / B59: parents screen, YES / NO apart, chart inside, texts readable
    await go(page, 'parents', { ok: true });
    const p = await clean(page, 'parents');
    for (const t of ['Say "please"', 'Go outside', 'Feed the birds', 'Help with a pet']) {
      const b = p.find(x => x.label.startsWith(t));
      expect(b.fs).toBeGreaterThanOrEqual(26);
      expect(b.lines).toBeLessThanOrEqual(2);
    }
    noErrors(page);
  });

  // B32: six notes stay readable and above the buttons
  test(`v0.8.1 layout: result notes readable (${tag})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await boot(page, save());
    await go(page, 'battle', { rival: 3 });
    await page.evaluate(() => {
      const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.over = true; b.busy = true;
      b.resultPanel({ won: true, stars: 3, gain: 120, before: { l: 7, r: 150, n: 400 }, after: { l: 7, r: 270, n: 400 }, primary: 'next', nextIdx: 4,
        notes: ['First win bonus +20 XP', 'Bob challenges you to POND HOCKEY! Find it on the Canada map', 'NEW WORLD: Space! Rival: The Blips',
          'Jack learned: Tail Spin, Ice Breath!', '+2 capsules! Open on the map', 'New costume: Owl Hat! Put it on in Me'] }, false);
    });
    await wait(page, 1000);
    const r = await page.evaluate(() => {
      const s = __game.scene.getScene('battle'), H = __game.config.height, cam = s.cameras.main;
      const p = s.children.list.filter(o => o.type === 'Container' && o.depth === 61).pop();
      const note = p.list.find(o => o.type === 'Text' && o.text.startsWith('First win'));
      const btn = p.list.find(o => o.type === 'Container' && o.list.some(t => t.text === 'NEXT RIVAL'));
      const nb = note.getBounds(), texts = p.list.filter(o => o.type === 'Text').map(o => o.getBounds().top);
      const btns = p.list.filter(o => o.type === 'Container' && o.input).map(o => p.y + o.y + o.height / 2);
      return { fs: parseFloat(note.style.fontSize), noteBottom: nb.bottom, btnTop: p.y + btn.y - btn.height / 2, top: Math.min(...texts) - cam.scrollY, bottom: Math.max(...btns), H };
    });
    expect(r.fs).toBeGreaterThanOrEqual(30);
    expect(r.noteBottom).toBeLessThan(r.btnTop);
    expect(r.top).toBeGreaterThanOrEqual(-2);
    expect(r.bottom).toBeLessThanOrEqual(r.H + 2);
    noErrors(page);
  });
}

// B18: on a 4:3 iPad in landscape the level panel stays left of Jack (with a hat too)
for (const [width, height] of [[1024, 768], [1180, 820]]) {
  test(`v0.8.1 layout: title level panel clear of Jack's wing (${width}x${height})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await boot(page, save({ costumes: ALL_HATS, costume: 'owlhat' }));
    await go(page, 'title');
    const r = await page.evaluate(() => {
      const s = __game.scene.getScene('title');
      const jack = s.children.list.find(o => o.texture && o.texture.key === 'jack_front');
      const lvl = s.children.list.find(o => o.type === 'Text' && /^LEVEL /.test(o.text));
      return { jackLeft: jack.x - jack.displayWidth / 2, panelRight: lvl.x + 210 };
    });
    expect(r.panelRight).toBeLessThan(r.jackLeft);
    expect(await offscreen(page, 'title')).toEqual([]);
    noErrors(page);
  });
}

// B11: one hat card (+ hint) on iPad portrait stays clear of the account text
test('v0.8.1 layout: Me with no hats on iPad portrait', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const ach = save().ach; delete ach.allstars; // no Royal Crown
  await boot(page, save({ ach, costumes: {} }));
  await go(page, 'me');
  await clean(page, 'me');
  noErrors(page);
});
