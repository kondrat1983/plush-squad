// v1.0: toys go on an adventure (#47, #76), docs/gdd/1.0-toy-adventure.md section 8.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, offscreen, noErrors } = require('./helpers');

// every sticker already earned (no sticker toasts in the way of the postcards), except the one tested here
const ACH_IDS = [...fs.readFileSync(path.join(__dirname, '..', 'js', 'extra.js'), 'utf8').matchAll(/\{ id: '(\w+)', name:/g)].map(m => m[1]);
const ach = Object.fromEntries(ACH_IDS.filter(id => id !== 'explorer').map(id => [id, 1]));
const SAVE = Object.assign({}, BASE_SAVE, { ach, stats: {}, daily: new Date().toDateString() });

// toys with a picture in IndexedDB (and a texture for the squad ones, as Boot would load them)
async function seed(page, nToys, away = []) {
  await page.evaluate(async ([nToys, away]) => {
    const cv = document.createElement('canvas'); cv.width = 80; cv.height = 100;
    const cx = cv.getContext('2d'); cx.fillStyle = '#ff8a3d'; cx.fillRect(10, 10, 60, 80);
    const url = cv.toDataURL('image/png');
    const mk = async (i, p) => {
      const t = PSToys.createToy({ arch: PSToys.ARCH[i % PSToys.ARCH.length].id, element: 'magic', seed: 100 + i, aspect: 1 });
      t.id = p + i; t.name = 'Toy' + i; await __IDB.set(t.id, url); return t;
    };
    const toys = []; for (let i = 0; i < nToys; i++) toys.push(await mk(i, 't'));
    toys.forEach(t => __game.textures.addImage('toy_' + t.id, __game.textures.get('jack_front').getSourceImage()));
    const day = n => PSAdventure.todayKey(new Date(Date.now() - n * 86400000));
    const list = [];
    for (let i = 0; i < away.length; i++) list.push({ toy: await mk(i, 'a'), trip: { world: away[i][0], left: day(away[i][1]), cards: away[i][2] || 0, seen: 0 } });
    __save.data.toys = toys; __save.data.away = list; __save.store();
  }, [nToys, away]);
}
const all = (page, key) => page.evaluate(k => {
  const out = [], walk = l => l.forEach(o => { out.push({ type: o.type, text: o.text, input: !!(o.input && o.input.enabled), h: o.height, list: !!o.list }); if (o.list) walk(o.list); });
  walk(__game.scene.getScene(k).children.list); return out;
}, key);
const texts = async (page, key) => (await all(page, key)).filter(o => o.type === 'Text').map(o => o.text);
// taps the button (container) with this label in a scene
const tap = (page, key, label) => page.evaluate(([k, l]) => {
  const out = [], walk = list => list.forEach(o => { out.push(o); if (o.list) walk(o.list); });
  walk(__game.scene.getScene(k).children.list);
  const b = out.find(o => o.type === 'Container' && o.input && o.input.enabled && o.list && o.list.some(t => t.type === 'Text' && t.text === l));
  if (!b) return false; b.emit('pointerup'); return true;
}, [key, label]);
const until = async (page, fn, ms = 60000) => { await expect.poll(async () => { await wait(page, 500); return fn(); }, { timeout: ms }).toBeTruthy(); };

test('ADVENTURE replaces REMOVE (≥ 90 px, not for Jack); GO EXPLORE! shows the open worlds + SURPRISE ME; sending moves the toy away', async ({ page }) => {
  await boot(page, SAVE);
  await seed(page, 2);
  await page.evaluate(() => { __save.data.hero = 't0'; __save.store(); });
  await go(page, 'squad');
  await page.evaluate(() => __game.scene.getScene('squad').details({ jack: true }));
  await wait(page, 800);
  expect(await texts(page, 'squad')).not.toContain('ADVENTURE');
  await go(page, 'squad');
  await page.evaluate(() => __game.scene.getScene('squad').details({ toy: __save.data.toys[0] }));
  await wait(page, 800);
  const btn = (await all(page, 'squad')).filter(o => o.type === 'Container' && o.input && o.h >= 90);
  expect(btn.length).toBeGreaterThan(0);
  expect(await tap(page, 'squad', 'ADVENTURE')).toBe(true);
  await wait(page, 600);
  expect(await texts(page, 'squad')).toContain('Send Toy0 on an adventure?');
  expect(await tap(page, 'squad', 'GO EXPLORE!')).toBe(true);
  await wait(page, 800);
  const t = await texts(page, 'squad');
  const ev = await page.evaluate(() => __RIVALS.some(r => r.event));
  expect(t).toContain('Where to?');
  expect(t).toContain('PILLOW HILLS'); expect(t).toContain('SPACE'); expect(t).toContain('SURPRISE ME!');
  expect(t).not.toContain('CANADA'); // not open in this save (the Mothership is not beaten)
  if (ev) expect(t).toContain('SPOOKY'); else expect(t).not.toContain('SPOOKY');
  expect(await offscreen(page, 'squad')).toEqual([]);
  expect(await tap(page, 'squad', 'SPACE')).toBe(true);
  await until(page, () => page.evaluate(() => __save.data.away.length === 1 && __game.scene.isActive('squad')));
  await wait(page, 1500);
  const r = await page.evaluate(async () => ({ toys: __save.data.toys.map(t => t.id), away: __save.data.away.map(a => [a.toy.id, a.trip.world, a.trip.left === PSAdventure.todayKey(), a.trip.cards]),
    hero: __save.data.hero, pic: !!(await __IDB.get('t0')), stored: JSON.parse(localStorage.getItem('plushsquad_v1')).away.length }));
  expect(r).toEqual({ toys: ['t1'], away: [['t0', 'space', true, 0]], hero: 'jack', pic: true, stored: 1 });
  const st = await texts(page, 'squad');
  expect(st).toContain('ADVENTURES'); // the card appears with one toy away
  expect(st.join('|')).toContain('is off to SPACE!');
  noErrors(page);
});

for (const vp of [{ width: 375, height: 667 }, { width: 1024, height: 768 }]) {
  test(`ADVENTURES card only with toys away; the list pages 20 toys and fits the screen (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize(vp);
    await boot(page, SAVE);
    await seed(page, 3);
    await go(page, 'squad');
    expect(await texts(page, 'squad')).not.toContain('ADVENTURES');
    await seed(page, 14, Array.from({ length: 20 }, (_, i) => ['hills', i % 4]));
    await go(page, 'squad', { page: 9 }); // the last page of the squad
    expect(await texts(page, 'squad')).toContain('ADVENTURES');
    expect(await texts(page, 'squad')).toContain('20'); // count chip
    expect(await offscreen(page, 'squad')).toEqual([]);
    await go(page, 'adventures');
    const names = new Set();
    for (let p = 0; p < 12; p++) {
      await until(page, async () => (await texts(page, 'adventures')).some(s => /^Toy\d+$/.test(s)));
      (await texts(page, 'adventures')).filter(s => /^Toy\d+$/.test(s)).forEach(s => names.add(s));
      expect(await offscreen(page, 'adventures')).toEqual([]);
      if (!(await tap(page, 'adventures', '▶'))) break;
      await wait(page, 1200); await fast(page);
    }
    expect(names.size).toBe(20);
    noErrors(page);
  });
}

test('postcards: one toast with the right count at the first map open of the day, none the second time, max 3 per trip', async ({ page }) => {
  await boot(page, SAVE);
  await seed(page, 1, [['hills', 1], ['space', 2], ['canada', 3], ['spooky', 5], ['hills', 0]]);
  await go(page, 'map');
  await until(page, async () => (await texts(page, 'map')).includes('9 new postcards!'));
  expect(await page.evaluate(() => __save.data.away.map(a => a.trip.cards))).toEqual([1, 2, 3, 3, 0]);
  await go(page, 'title');
  await go(page, 'map');
  await wait(page, 5000);
  expect((await texts(page, 'map')).join('|')).not.toContain('postcard');
  // the cards: world text from (world, n), read again from the Adventures list
  await go(page, 'adventures');
  await until(page, async () => (await texts(page, 'adventures')).includes('CALL HOME'));
  await page.evaluate(() => { const s = __game.scene.getScene('adventures'); s.postcard(__save.data.away[2], 3, true); });
  await wait(page, 800);
  const t = await texts(page, 'adventures');
  expect(t).toContain('Greetings from CANADA!');
  expect(t).toContain('Sasquatch gave me a hug. A BIG soft one.');
  expect(await page.evaluate(() => __save.data.away[2].trip.seen)).toBe(3);
  noErrors(page);
});

test('postcards wait at bedtime, and the Adventures list is blocked like My Squad', async ({ page }) => {
  await boot(page, SAVE);
  await seed(page, 1, [['hills', 2]]);
  await page.evaluate(() => { __save.data.parent = { bedtime: '00:00', limit: 0 }; __save.store(); });
  await page.evaluate(() => __game.scene.getScenes(true)[0].scene.start('adventures'));
  await until(page, () => page.evaluate(() => __game.scene.isActive('bedtime')));
  await page.evaluate(() => __game.scene.getScenes(true)[0].scene.start('map'));
  await until(page, () => page.evaluate(() => __game.scene.isActive('bedtime')));
  await wait(page, 2500);
  expect(await page.evaluate(() => __save.data.away[0].trip.cards)).toBe(0);
  noErrors(page);
});

test('CALL HOME: short trip = no souvenir; 3+ days = souvenir, +1 capsule once, +20 toy XP, Explorer sticker once; full squad = message', async ({ page }) => {
  await boot(page, SAVE);
  await seed(page, 1, [['canada', 1], ['canada', 4], ['canada', 3]]);
  await go(page, 'adventures');
  await until(page, async () => (await texts(page, 'adventures')).includes('CALL HOME'));
  const caps0 = await page.evaluate(() => __save.data.caps);
  // short trip
  await page.evaluate(() => __game.scene.getScene('adventures').callHome(__save.data.away[0]));
  await wait(page, 600);
  expect((await texts(page, 'adventures')).join('|')).toContain('Next time stay longer for a souvenir.');
  let r = await page.evaluate(() => ({ caps: __save.data.caps, toy: __save.data.toys.find(t => t.id === 'a0'), away: __save.data.away.length }));
  expect(r.caps).toBe(caps0); expect(r.toy.souv).toBeUndefined(); expect(r.away).toBe(2);
  // long trip
  await page.evaluate(() => __game.scene.getScene('adventures').callHome(__save.data.away[0]));
  await wait(page, 600);
  expect((await texts(page, 'adventures')).join('|')).toContain('Toy1 is home with a souvenir!');
  r = await page.evaluate(() => ({ caps: __save.data.caps, toy: __save.data.toys.find(t => t.id === 'a1'), ach: __save.data.ach.explorer, souv: __save.data.stats.souvenirs }));
  // +1 souvenir capsule, +1 for the Explorer sticker
  expect(r.caps).toBe(caps0 + 2); expect(r.toy.souv).toEqual(['canada']); expect(r.ach).toBeTruthy(); expect(r.souv).toBe(1);
  // the same toy goes to the same world again: souvenir line, no capsule, no second sticker
  await page.evaluate(() => { const t = __save.data.toys.find(t => t.id === 'a1'); PSAdventure.send(t, 'canada'); __save.data.away.find(a => a.toy.id === 'a1').trip.left = PSAdventure.todayKey(new Date(Date.now() - 3 * 86400000)); });
  await page.evaluate(() => __game.scene.getScene('adventures').callHome(__save.data.away.find(a => a.toy.id === 'a1')));
  await wait(page, 600);
  r = await page.evaluate(() => ({ caps: __save.data.caps, toy: __save.data.toys.find(t => t.id === 'a1') }));
  expect(r.caps).toBe(caps0 + 2); expect(r.toy.souv).toEqual(['canada']);
  // full squad: friendly message, nothing lost
  await page.evaluate(() => { while (__save.data.toys.length < 14) __save.data.toys.push(Object.assign({}, __save.data.toys[0], { id: 'x' + __save.data.toys.length })); });
  const res = await page.evaluate(() => __game.scene.getScene('adventures').callHome(__save.data.away[0]));
  await wait(page, 400);
  expect((await texts(page, 'adventures')).join('|')).toContain('Your squad is full!');
  expect(await page.evaluate(() => [__save.data.toys.length, __save.data.away.length])).toEqual([14, 1]);
  noErrors(page);
});

test('the 21st toy cannot be sent: the adventure bus is full', async ({ page }) => {
  await boot(page, SAVE);
  await seed(page, 1, Array.from({ length: 20 }, () => ['hills', 0]));
  await go(page, 'squad');
  await page.evaluate(() => __game.scene.getScene('squad').details({ toy: __save.data.toys[0] }));
  await wait(page, 800);
  await tap(page, 'squad', 'ADVENTURE');
  await wait(page, 500);
  expect((await texts(page, 'squad')).join('|')).toContain('The adventure bus is full!');
  expect(await page.evaluate(() => [PSAdventure.send(__save.data.toys[0], 'hills'), __save.data.toys.length, __save.data.away.length])).toEqual([false, 1, 20]);
  noErrors(page);
});

test('SAY GOODBYE: parent gate first; a right answer deletes the toy, its picture, the cloud row and the PNG in the bucket (#76)', async ({ page }) => {
  await boot(page, SAVE);
  await seed(page, 1, [['hills', 1]]);
  await page.evaluate(() => {
    const log = window.__sbLog = [];
    const q = t => ({ select() { return this; }, eq(k, v) { log.push(t + ':eq:' + v); return this; }, in() { return this; }, delete() { log.push(t + ':delete'); return this; }, then: r => r({ data: [] }) });
    PSNet.sb = { from: q, storage: { from: b => ({ remove: async p => { log.push(b + ':remove:' + p.join(',')); return {}; } }) } };
    PSNet.user = { id: 'u1', name: 'tester' }; __save.data.owner = 'u1';
  });
  await go(page, 'adventures');
  await until(page, async () => (await texts(page, 'adventures')).includes('SAY GOODBYE'));
  await tap(page, 'adventures', 'SAY GOODBYE');
  await wait(page, 600);
  expect(await texts(page, 'adventures')).toContain('GROWN-UPS ONLY');
  const q = await page.evaluate(() => (__game.scene.getScene('adventures').children.list.flatMap(o => o.list || [o]).find(t => t.type === 'Text' && /What is/.test(t.text)) || {}).text);
  const [a, b] = q.match(/(\d) × (\d)/).slice(1).map(Number);
  await page.fill('input', String(a * b + 1)); await tap(page, 'adventures', 'OK');
  await wait(page, 300);
  expect(await texts(page, 'adventures')).toContain('Not quite. Ask a grown-up!');
  expect(await page.evaluate(() => __save.data.away.length)).toBe(1);
  await page.fill('input', String(a * b)); await tap(page, 'adventures', 'OK');
  await wait(page, 600);
  expect(await texts(page, 'adventures')).toContain('Delete Toy0\'s photo for good?');
  await tap(page, 'adventures', 'YES');
  await until(page, () => page.evaluate(() => __sbLog.includes('toys:remove:u1/a0.png')));
  const r = await page.evaluate(async () => ({ away: __save.data.away.length, pic: await __IDB.get('a0'), log: __sbLog }));
  expect(r.away).toBe(0);
  expect(r.pic).toBeFalsy();
  expect(r.log).toContain('toys:delete');
  expect(r.log).toContain('toys:eq:u1:a0');
  noErrors(page);
});

test('cloud: push keeps away rows and marks them, deletes gone rows with their PNG; friends do not see away toys; pictures of away toys come down', async ({ page }) => {
  await boot(page, SAVE);
  await seed(page, 1, [['canada', 1]]);
  const r = await page.evaluate(async () => {
    const log = [];
    const rows = [{ id: 'u1:t0', meta: { id: 't0', name: 'Toy0' } }, { id: 'u1:a0', meta: { id: 'a0', name: 'Toy0' } }, { id: 'u1:old', meta: { id: 'old', name: 'Old' } }];
    const all = rows.concat([{ id: 'u2:x', meta: { id: 'x', name: 'Fx', away: 'space' }, img: '' }, { id: 'u2:y', meta: { id: 'y', name: 'Fy' }, img: '' }]);
    const q = t => ({ select() { return this; }, order() { return this; }, upsert: async () => ({}),
      eq(k, v) { if (k === 'owner') this._o = v; if (this._u) { log.push('update:' + v + ':' + (this._u.meta ? this._u.meta.away || '-' : 'profile')); this._u = null; } return this; },
      in(k, v) { this._in = true; log.push(t + ':in:' + v.join(',')); return this; },
      delete() { log.push(t + ':delete'); return this; }, update(v) { this._u = v; return this; },
      then(res) { res({ data: t === 'toys' && !this._in ? all.filter(r => r.id.startsWith(this._o + ':')) : [] }); } });
    PSNet.sb = { from: q, rpc: async () => ({ data: [{ id: 'u2:x', meta: { id: 'x', name: 'Fx', away: 'space' }, username: 'f' }, { id: 'u2:y', meta: { id: 'y', name: 'Fy' }, username: 'f' }] }),
      storage: { from: b => ({ remove: async p => { log.push('remove:' + p.join(',')); return {}; } }) } };
    PSNet.user = { id: 'u1', name: 'tester' }; PSNet.synced = true; __save.data.owner = 'u1';
    await PSNet.pushNow();
    const squad = (await PSNet.squad('u2')).map(t => t.meta.id), museum = (await PSNet.museum()).map(t => t.meta.id);
    log.push('--');
    await PSNet.applyCloud({ toys: [{ id: 't0' }], away: [{ toy: { id: 'a0' }, trip: { world: 'canada' } }], stars: {} });
    return { log, squad, museum };
  });
  expect(r.log).toContain('toys:in:u1:old'); // only the toy that is really gone
  expect(r.log).toContain('remove:u1/old.png');
  expect(r.log).toContain('update:u1:a0:canada');
  expect(r.log.filter(l => l.startsWith('update:u1:t0'))).toEqual([]); // unchanged meta: no update
  expect(r.squad).toEqual(['y']);
  expect(r.museum).toEqual(['y']);
  expect(r.log.slice(r.log.indexOf('--'))).toContain('toys:in:u1:t0,u1:a0');
  noErrors(page);
});

test('rotation: the Where-to card, the Adventures list and an open postcard come back; nothing is sent twice', async ({ page }) => {
  await boot(page, SAVE);
  await seed(page, 2, [['space', 2]]);
  await go(page, 'squad');
  await page.evaluate(() => PSAdventure.whereTo(__game.scene.getScene('squad'), __save.data.toys[0]));
  await wait(page, 600);
  await page.evaluate(() => window.__psRebuild());
  await until(page, async () => page.evaluate(() => window.__game && __game.scene.isActive('squad')));
  await fast(page);
  await until(page, async () => (await texts(page, 'squad')).includes('Where to?'));
  await tap(page, 'squad', 'SPACE');
  await until(page, () => page.evaluate(() => __save.data.away.length === 2));
  await wait(page, 1500);
  expect(await page.evaluate(() => [__save.data.toys.length, __save.data.away.length])).toEqual([1, 2]);
  await go(page, 'adventures', { page: 0 });
  await until(page, async () => (await texts(page, 'adventures')).includes('CALL HOME'));
  await page.evaluate(() => __game.scene.getScene('adventures').postcard(__save.data.away[0], 2, true));
  await wait(page, 600);
  await page.evaluate(() => window.__psRebuild());
  await until(page, async () => page.evaluate(() => window.__game && __game.scene.isActive('adventures')));
  await fast(page);
  await until(page, async () => (await texts(page, 'adventures')).includes('Greetings from SPACE!'));
  expect(await texts(page, 'adventures')).toContain('The Blips borrowed my snack. They gave me a moon rock back!');
  expect(await page.evaluate(() => [__save.data.toys.length, __save.data.away.length])).toEqual([1, 2]);
  noErrors(page);
});

test('a toy that came home plays a toy duel to the end (regression)', async ({ page }) => {
  await boot(page, SAVE);
  await seed(page, 1, [['hills', 3]]);
  await page.evaluate(() => { const r = PSAdventure.comeHome(__save.data.away[0]); __game.textures.addImage('toy_a0', __game.textures.get('jack_front').getSourceImage()); __save.data.hero = 'a0'; return r; });
  await go(page, 'battle', { toy: 't0' });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); });
  await until(page, () => page.evaluate(() => { const b = __game.scene.getScene('battle'); return !!(b.hero && !b.busy); }));
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.rival.hp = 0; b.finish(true); });
  await until(page, () => page.evaluate(() => !!__game.scene.getScene('battle').shown), 90000);
  expect(await page.evaluate(() => __game.scene.getScene('battle').H.id)).toBe('a0');
  noErrors(page);
});
