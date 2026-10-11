// v1.0: toy growth (toy XP, 5th and 6th move, GOLDEN, badges), docs/gdd/1.0-toy-growth.md section 8.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, waitTurn, offscreen, noErrors } = require('./helpers');

const ACH_IDS = [...fs.readFileSync(path.join(__dirname, '..', 'js', 'extra.js'), 'utf8').matchAll(/\{ id: '(\w+)', name:/g)].map(m => m[1]);
const ach = Object.fromEntries(ACH_IDS.filter(id => !['goldtoy', 'toychamp'].includes(id)).map(id => [id, 1]));
const SAVE = Object.assign({}, BASE_SAVE, { ach, stats: {}, daily: new Date().toDateString() });

// a squad toy with a texture; the hero when hero = true
async function toy(page, xp, hero = true, extra = {}) {
  return page.evaluate(([xp, hero, extra]) => {
    const t = Object.assign(PSToys.createToy({ arch: 'bear', element: 'fire', seed: 4242, aspect: 1 }), { id: 'tg', name: 'Teddy', xp }, extra);
    __save.data.toys = [t]; if (hero) __save.data.hero = 'tg'; __save.store();
    __game.textures.addImage('toy_tg', __game.textures.get('jack_front').getSourceImage());
    return t.id;
  }, [xp, hero, extra]);
}
// one duel to its end: won or lost; returns the result info and the notes
async function duel(page, data, won, boost = null) {
  await go(page, 'battle', data);
  await page.evaluate(b => { const s = __game.scene.getScene('battle'); if (s._pick) s._pick(b ? __BOOSTS.find(x => x.id === b) : null); }, boost);
  await waitTurn(page);
  await page.evaluate(w => { const b = __game.scene.getScene('battle'); if (w) b.rival.hp = 0; else b.hero.hp = 0; b.finish(w); }, won);
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 120000 }).toBe(true);
  return page.evaluate(() => { const b = __game.scene.getScene('battle'); return { gain: b.shown.gain, notes: b.shown.notes.join(' | ') }; });
}
const tg = page => page.evaluate(() => { const t = __save.data.toys.find(x => x.id === 'tg'); return { xp: t.xp || 0, badges: t.badges || {} }; });

test('makeKit: 4 / 5 / 6 moves at toy XP 0 / 50 / 150 / 300; the 5th never repeats a type or adds a 2nd heal (all archetypes × elements × quirks)', async ({ page }) => {
  await boot(page, SAVE);
  const r = await page.evaluate(() => {
    const bad = [], T = PSToys;
    T.ARCH.forEach(a => Object.keys(T.ELEMENTS).forEach(el => Object.keys(T.QUIRKS).forEach(q => {
      const base = { arch: a.id, element: el, quirk: q, seed: 12345, hp: 100 };
      const n = [0, 50, 150, 300].map(xp => T.makeKit(Object.assign({ xp }, base)).length).join(',');
      if (n !== '4,5,6,6') bad.push(a.id + el + q + ':' + n);
      const k = T.makeKit(Object.assign({ xp: 150 }, base)), types = k.slice(0, 4).map(m => m.type);
      if (types.includes(k[4].type)) bad.push('type ' + a.id + el + q + ' ' + k[4].type);
      // (a sloth with the hungry quirk already has two heals in its base kit, v0.9; the 5th move never adds one more)
      if (types.some(t => t === 'nap' || t === 'heal') && ['nap', 'heal'].includes(k[4].type)) bad.push('heal ' + a.id + el + q);
      if (k[4].k !== 'm4' || k[5].k !== 'm5' || k[5].type !== 'volley' || k[5].uses !== 1 || k[5].dmg.join() !== '18,26') bad.push('keys ' + a.id + el + q);
    })));
    const t = { arch: 'bear', element: 'ice', quirk: 'brave', seed: 777, xp: 60 };
    const same = T.makeKit(t)[4].title === T.makeKit(JSON.parse(JSON.stringify(t)))[4].title;
    return { bad: bad.slice(0, 10), same, lv: [0, 49, 50, 149, 150, 299, 300, 9999].map(T.toyLevel), old: T.makeKit({ arch: 'bear', element: 'ice', quirk: 'brave', seed: 1 }).length };
  });
  expect(r.bad).toEqual([]);
  expect(r.same).toBe(true);
  expect(r.lv).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  expect(r.old).toBe(4); // a toy from before v1.0 (no xp field) is level 1
  noErrors(page);
});

test('toy XP and badges in every mode with a toy hero: campaign, campaign boss, Kraken, toy, friend; player XP unchanged', async ({ page }) => {
  await boot(page, SAVE);
  await toy(page, 0);
  // campaign win (Moo): +10, badge, player XP as for Jack (R.xp, no first-clear bonus: Moo has stars)
  const xp0 = await page.evaluate(() => __save.data.xp);
  let r = await duel(page, { rival: 1 }, true);
  expect(await tg(page)).toEqual({ xp: 10, badges: { moo: 1 } });
  expect(r.notes).toContain('Teddy +10 toy XP');
  expect(r.notes).toContain('New badge: Moo!');
  expect(r.gain).toBe(55);
  expect(await page.evaluate(() => __save.data.xp)).toBe(xp0 + 55);
  // a loss: +3
  r = await duel(page, { rival: 1 }, false);
  expect((await tg(page)).xp).toBe(13);
  // campaign boss (Professor Hoot): +20 (13 + 20 = 33), badge, Toy Champion sticker
  r = await duel(page, { rival: 3 }, true);
  let t = await tg(page);
  expect(t.xp).toBe(33); expect(t.badges.hoot).toBe(1);
  expect(await page.evaluate(() => !!__save.data.ach.toychamp)).toBe(true);
  // Kraken (boss mode): +20 on a win, badge 'kraken'; grows to level 2
  r = await duel(page, { boss: true }, true);
  t = await tg(page);
  expect(t.xp).toBe(53); expect(t.badges.kraken).toBe(1);
  expect(r.notes).toMatch(/Teddy grew to LEVEL 2! New move: /);
  // toy duel (own toy as rival): XP for the hero toy, no badge; the rival toy gets nothing
  await page.evaluate(() => { const r = Object.assign(PSToys.createToy({ arch: 'cat', element: 'ice', seed: 9, aspect: 1 }), { id: 'tr', name: 'Kit' }); __save.data.toys.push(r); __game.textures.addImage('toy_tr', __game.textures.get('jack_front').getSourceImage()); });
  r = await duel(page, { toy: 'tr' }, true);
  t = await tg(page);
  expect(t.xp).toBe(63); expect(Object.keys(t.badges).sort()).toEqual(['hoot', 'kraken', 'moo']);
  expect(await page.evaluate(() => __save.data.toys.find(x => x.id === 'tr').xp || 0)).toBe(0);
  // friend's GOLDEN toy: 6 moves on the rival side, the gold copy; no badge for the hero
  const url = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 60; c.height = 80; c.getContext('2d').fillRect(5, 5, 50, 70); return c.toDataURL(); });
  await go(page, 'battle', { ftoy: { id: 'fz', arch: 'dog', element: 'leaf', quirk: 'loud', seed: 5, hp: 100, name: 'Rex', xp: 300, url }, ownerName: 'Pal', ownerId: 'u2' });
  await page.evaluate(() => { const s = __game.scene.getScene('battle'); if (s._pick) s._pick(null); });
  await waitTurn(page);
  expect(await page.evaluate(() => { const b = __game.scene.getScene('battle'); return [b.rmoves.length, !!b.rival.gold || !!b.rival.goldChip]; })).toEqual([6, true]);
  r = await duel(page, { ftoy: { id: 'fz', arch: 'dog', element: 'leaf', quirk: 'loud', seed: 5, hp: 100, name: 'Rex', xp: 300, url }, ownerName: 'Pal', ownerId: 'u2' }, true);
  t = await tg(page);
  expect(t.xp).toBe(73); expect(Object.keys(t.badges).length).toBe(3);
  noErrors(page);
});

test('HARD ×1.5, Super Star ×2; Jack as hero gives no toy XP; GOLDEN at 300 with its sticker', async ({ page }) => {
  await boot(page, Object.assign({}, SAVE, { diff: 'hard', boosts: { superstar: 1 } }));
  await toy(page, 0);
  await duel(page, { rival: 0 }, true);
  expect((await tg(page)).xp).toBe(15);
  await duel(page, { rival: 0 }, true, 'superstar');
  expect((await tg(page)).xp).toBe(45); // 10 × 1.5 × 2
  await page.evaluate(() => { __save.data.hero = 'jack'; __save.store(); });
  await duel(page, { rival: 0 }, true);
  expect((await tg(page)).xp).toBe(45);
  await page.evaluate(() => { __save.data.diff = 'normal'; __save.data.hero = 'tg'; __save.data.toys[0].xp = 295; __save.store(); });
  const r = await duel(page, { rival: 0 }, true);
  expect(r.notes).toContain('Teddy is GOLDEN!');
  expect((await tg(page)).xp).toBe(300);
  await wait(page, 2000);
  expect(await page.evaluate(() => !!__save.data.ach.goldtoy)).toBe(true);
  noErrors(page);
});

for (const vp of [{ width: 375, height: 667 }, { width: 1024, height: 768 }, { width: 844, height: 390 }]) {
  test(`level 3 toy + booster: 7 cards fit; rotation keeps the 6th move used; details show level and badges; GOLDEN in squad (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize(vp);
    await boot(page, Object.assign({}, SAVE, { boosts: { milk: 1 } }));
    await toy(page, 160, true, { badges: { timmy: 1, hoot: 1, kraken: 1 } });
    await go(page, 'battle', { rival: 0 });
    await page.evaluate(() => { const s = __game.scene.getScene('battle'); s._pick(__BOOSTS.find(b => b.id === 'milk')); });
    await waitTurn(page);
    expect(await page.evaluate(() => __game.scene.getScene('battle').moves.length)).toBe(7);
    expect(await offscreen(page, 'battle')).toEqual([]);
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.hero.used.m5 = 1; window.__oldGame = __game; window.__psRebuild(); });
    await page.waitForFunction(() => window.__game && __game !== window.__oldGame && __game.scene.isActive('battle') && __game.scene.getScene('battle').hero, null, { timeout: 90000 });
    await fast(page);
    expect(await page.evaluate(() => __game.scene.getScene('battle').hero.used.m5)).toBe(1);
    await page.evaluate(() => { __save.data.toys[0].xp = 300; __save.store(); });
    await go(page, 'squad');
    const texts = () => page.evaluate(() => { const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); }); walk(__game.scene.getScene('squad').children.list); return out; });
    expect(await texts()).toContain('GOLDEN');
    await page.evaluate(() => __game.scene.getScene('squad').details({ toy: __save.data.toys[0] }));
    await wait(page, 1000);
    const t = (await texts()).join('|');
    expect(t).toContain('LEVEL 4');
    expect(t).toContain('3 badges');
    expect(await offscreen(page, 'squad')).toEqual([]);
    noErrors(page);
  });
}

test('cloud: a grown toy sends its meta on the next push; okToy clamps xp and drops unknown badges; an old save is level 1', async ({ page }) => {
  await boot(page, SAVE);
  await toy(page, 0, false);
  const r = await page.evaluate(async () => {
    const log = [];
    const q = t => ({ select() { return this; }, order() { return this; }, upsert: async () => ({}), in() { return this; }, delete() { return this; },
      eq(k, v) { if (this._u && this._u.meta) log.push('update:' + v + ':' + this._u.meta.xp); this._u = null; return this; }, update(v) { this._u = v; return this; },
      then(res) { res({ data: t === 'toys' ? (this._o2 ? [{ id: 'u2:z', meta: { id: 'z', name: 'Zed', xp: 99999, badges: { moo: 1, hacked: 1 } } }] : [{ id: 'u1:tg', meta: { id: 'tg', name: 'Teddy' } }]) : [] }); } });
    PSNet.sb = { from: t => { const o = q(t); const eq = o.eq; o.eq = function (k, v) { if (k === 'owner' && v === 'u2') this._o2 = true; return eq.call(this, k, v); }; return o; }, storage: { from: () => ({ remove: async () => ({}) }) } };
    PSNet.user = { id: 'u1', name: 'tester' }; PSNet.synced = true; __save.data.owner = 'u1';
    await PSNet.pushNow(); const before = log.length;
    __save.data.toys[0].xp = 60;
    await PSNet.pushNow();
    const fz = (await PSNet.squad('u2'))[0].meta;
    return { before, log, fz };
  });
  expect(r.before).toBe(0);
  expect(r.log).toContain('update:u1:tg:60');
  expect(r.fz.xp).toBe(300);
  expect(r.fz.badges).toEqual({ moo: 1 });
  noErrors(page);
});
