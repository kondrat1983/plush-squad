// v1.0 code-review fixes: a slow cloud sync vs the Pillow Week count, toy badges of the v1.0 rivals,
// cloud toy deletes only for toys this device said goodbye to (rows of unknown toys stay, missing rows come back)
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, waitTurn, noErrors } = require('./helpers');

const ACH_IDS = [...fs.readFileSync(path.join(__dirname, '..', 'js', 'extra.js'), 'utf8').matchAll(/\{ id: '(\w+)', name:/g)].map(m => m[1]);
const ach = Object.fromEntries(ACH_IDS.filter(id => !['goldtoy', 'toychamp'].includes(id)).map(id => [id, 1]));
const SAVE = Object.assign({}, BASE_SAVE, { ach, stats: {}, daily: new Date().toDateString() });
const key = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// a fake Supabase with state: one cloud save (fetch delayed by window.__sbDelay ms), toy rows, a bucket
const fakeSb = () => {
  const log = window.__sbLog = [];
  window.__rows = window.__rows || {};
  window.__pics = window.__pics || {};
  const q = t => ({
    _op: 'select',
    select() { return this; }, order() { return this; },
    eq(k, v) { this._eq = [k, v]; return this; },
    in(k, v) { this._in = v; return this; },
    delete() { this._op = 'delete'; return this; },
    update(v) { this._op = 'update'; this._v = v; return this; },
    maybeSingle: async () => {
      await new Promise(r => setTimeout(r, window.__sbDelay || 0));
      return { data: window.__cloud ? { data: JSON.parse(JSON.stringify(window.__cloud)) } : null };
    },
    upsert: async v => {
      if (t === 'saves') { window.__cloud = JSON.parse(JSON.stringify(v.data)); log.push('saves:upsert:' + v.data.wins + ':' + v.data.xp); }
      if (t === 'toys') { window.__rows[v.id] = v.meta; log.push('toys:upsert:' + v.id); }
      return {};
    },
    then(res) {
      if (t !== 'toys') return res({ data: null });
      if (this._op === 'delete') { (this._in || []).forEach(id => { delete window.__rows[id]; log.push('toys:delete:' + id); }); return res({ data: null }); }
      if (this._op === 'update') { if (this._eq) window.__rows[this._eq[1]] = this._v.meta; return res({ data: null }); }
      const ids = Object.keys(window.__rows).filter(id => this._in ? this._in.includes(id) : id.startsWith(this._eq[1] + ':'));
      res({ data: ids.map(id => ({ id, meta: window.__rows[id], img: 'pic:' + id })) });
    },
  });
  PSNet.sb = { from: q, storage: { from: () => ({
    remove: async p => { p.forEach(x => { delete window.__pics[x]; log.push('remove:' + x); }); return {}; },
    upload: async p => { window.__pics[p] = 1; log.push('upload:' + p); return {}; } }) } };
  PSNet.user = { id: 'u1', name: 'tester' };
};

test('#1 a slow sync: the day counted on the old save meanwhile does not push it over a newer cloud save; the day counts once, on the cloud save', async ({ page }) => {
  test.setTimeout(600000);
  await boot(page, Object.assign({}, SAVE, { streak: { days: [key(-1)], pillow: 0, at: Date.now() - 86400000, weeks: 0, seen: key(-1) } }));
  await page.evaluate(([fs, y]) => {
    eval('(' + fs + ')()');
    window.__sbDelay = 3000;
    // the other device played on: more wins and XP, saved later; its streak has the same days
    window.__cloud = Object.assign(JSON.parse(JSON.stringify(__save.data)), { owner: 'u1', savedAt: 5000, xp: 3000, wins: 77,
      streak: { days: [y], pillow: 0, at: Date.now() - 86400000, weeks: 0, seen: y } });
    PSNet.synced = false; PSNet._syncing = false; PSNet._syncP = null; PSNet._syncAt = 0;
    __save.data.owner = 'u1'; __save.data.savedAt = 1000; localStorage.setItem('plushsquad_v1', JSON.stringify(__save.data));
    PSNet.sync(); // the start sync of a kept login, still waiting for the cloud when the map opens
    __game.scene.getScenes(true)[0].scene.start('map');
  }, [fakeSb.toString(), key(-1)]);
  // the old map counts the day after 1.5 s; the cloud answers at 3 s, wins, the game rebuilds and counts the day again on it
  await page.waitForFunction(() => window.__game && __game.scene.isActive('map') && __save.data.wins === 77 && __save.data.streak.days.length === 2, null, { timeout: 120000 });
  await fast(page); await wait(page, 5000);
  const r = await page.evaluate(() => ({ xp: __save.data.xp, wins: __save.data.wins, days: __save.data.streak.days, log: __sbLog,
    ls: (d => [d.xp, d.wins])(JSON.parse(localStorage.getItem('plushsquad_v1'))) }));
  expect(r.wins).toBe(77);
  expect(r.xp).toBe(3020); // day 2 of the Pillow Week: +20 XP, once
  expect(r.days).toEqual([key(-1), key(0)]);
  expect(r.ls).toEqual([3020, 77]);
  expect(r.log.filter(l => l.startsWith('saves:upsert') && !l.startsWith('saves:upsert:77:'))).toEqual([]); // the old save never went up
  noErrors(page);
});

test('#1 nothing is pushed before the first sync result is known; an older cloud streak merged in reaches localStorage', async ({ page }) => {
  await boot(page, Object.assign({}, SAVE, { streak: { days: [key(0)], pillow: 0, at: Date.now(), weeks: 0, seen: key(0) } }));
  const r = await page.evaluate(async ([fs, k]) => {
    eval('(' + fs + ')()');
    window.__cloud = Object.assign(JSON.parse(JSON.stringify(__save.data)), { owner: 'u1', savedAt: 10, streak: { days: [k[0], k[1], k[2]], pillow: 0, at: 0, weeks: 3, seen: k[2] } });
    PSNet.synced = false; __save.data.owner = 'u1'; __save.data.savedAt = Date.now();
    await PSNet.pushNow(); const early = __sbLog.length;
    window.__sbDelay = 500; await PSNet.sync();
    return { early, log: __sbLog, ls: JSON.parse(localStorage.getItem('plushsquad_v1')).streak.weeks };
  }, [fakeSb.toString(), [key(-2), key(-1), key(0)]]);
  expect(r.early).toBe(0);
  expect(r.log.some(l => l.startsWith('saves:upsert'))).toBe(true);
  expect(r.ls).toBe(3);
  noErrors(page);
});

// one won campaign duel with the toy hero
async function win(page, idx) {
  await go(page, 'battle', { rival: idx });
  await page.evaluate(() => { const s = __game.scene.getScene('battle'); if (s._pick) s._pick(null); });
  await waitTurn(page);
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 120000 }).toBe(true);
  return page.evaluate(() => __game.scene.getScene('battle').shown.notes.join(' | '));
}

const V1 = ['hermy', 'puff', 'jelly', 'fog', 'thully', 'onion', 'peas', 'garlic', 'fungi', 'brocklee'];

test('#2 every campaign rival has a badge with its picture; okToy keeps the v1.0 badges', async ({ page }) => {
  await boot(page, SAVE);
  const r = await page.evaluate(async ([v1, fs]) => {
    const B = PSToys.BADGES, bad = [];
    __RIVALS.filter(R => !R.event || B[R.id]).forEach(R => { const b = B[R.id]; if (!b || b[0] !== R.tex || !!b[1] !== !!R.boss || !__game.textures.exists(b[0])) bad.push(R.id); });
    eval('(' + fs + ')()');
    window.__rows = { 'u2:z': { id: 'z', name: 'Zed', badges: Object.assign(Object.fromEntries(v1.map(k => [k, 1])), { hacked: 1 }) } };
    const kept = Object.keys((await PSNet.squad('u2'))[0].meta.badges).sort();
    return { bad, kept, all: v1.every(id => __RIVALS.some(R => R.id === id)) };
  }, [V1, fakeSb.toString()]);
  expect(r.all).toBe(true);
  expect(r.bad).toEqual([]);
  expect(r.kept).toEqual(V1.slice().sort());
  noErrors(page);
});

test('#2 beating each v1.0 rival with a toy hero gives its badge', async ({ page }) => {
  test.setTimeout(2400000); // 10 duels at 2-3 fps
  await boot(page, SAVE);
  await page.evaluate(() => {
    const t = Object.assign(PSToys.createToy({ arch: 'bear', element: 'fire', seed: 4242, aspect: 1 }), { id: 'tg', name: 'Teddy', xp: 0 });
    __save.data.toys = [t]; __save.data.hero = 'tg'; __save.store();
    __game.textures.addImage('toy_tg', __game.textures.get('jack_front').getSourceImage());
  });
  for (const id of V1) {
    const idx = await page.evaluate(id => __RIVALS.findIndex(R => R.id === id), id);
    const notes = await win(page, idx);
    expect(notes, id).toContain('New badge: ');
    expect(await page.evaluate(id => !!(__save.data.toys[0].badges || {})[id], id), id).toBe(true);
  }
  expect(Object.keys(await page.evaluate(() => __save.data.toys[0].badges)).sort()).toEqual(V1.slice().sort());
  noErrors(page);
});

// toys with a picture in IndexedDB
async function seedToys(page, squad, away) {
  await page.evaluate(async ([squad, away]) => {
    const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40; cv.getContext('2d').fillRect(5, 5, 30, 30);
    const url = cv.toDataURL('image/png');
    const mk = async id => { const t = PSToys.createToy({ arch: 'bear', element: 'magic', seed: 7, aspect: 1 }); t.id = id; t.name = 'T' + id; await __IDB.set(id, url); return t; };
    const toys = []; for (const id of squad) toys.push(await mk(id));
    const list = []; for (const id of away) list.push({ toy: await mk(id), trip: { world: 'hills', left: PSAdventure.todayKey(), cards: 0, seen: 0 } });
    __save.data.toys = toys; __save.data.away = list; __save.data.owner = 'u1'; __save.store();
  }, [squad, away]);
}

test('#3 push: a cloud toy this device does not know stays (made on the other device); a toy without a row is uploaded again; only save.gone is deleted', async ({ page }) => {
  await boot(page, SAVE);
  await seedToys(page, ['s1', 's2'], ['a1']);
  const r = await page.evaluate(async fs => {
    eval('(' + fs + ')()');
    // s1 has its row; s2 and a1 lost theirs (an older client deleted them); n9 is new on the other device; g1 was said goodbye to here
    window.__rows = { 'u1:s1': { id: 's1', name: 'Ts1' }, 'u1:n9': { id: 'n9', name: 'New' }, 'u1:g1': { id: 'g1', name: 'Bye' } };
    window.__pics = { 'u1/n9.png': 1, 'u1/g1.png': 1 };
    PSNet.synced = true; __save.data.gone = ['g1'];
    await PSNet.pushNow();
    const once = { rows: Object.keys(__rows).sort(), pics: Object.keys(__pics).sort(), gone: __save.data.gone, ls: JSON.parse(localStorage.getItem('plushsquad_v1')).gone, away: __rows['u1:a1'] && __rows['u1:a1'].away };
    const n = __sbLog.length; await PSNet.pushNow();
    return { once, again: __sbLog.slice(n).filter(l => !l.startsWith('saves')) };
  }, fakeSb.toString());
  expect(r.once.rows).toEqual(['u1:a1', 'u1:n9', 'u1:s1', 'u1:s2']);
  expect(r.once.pics).toEqual(['u1/a1.png', 'u1/n9.png', 'u1/s2.png']);
  expect(r.once.away).toBe('hills');
  expect(r.once.gone).toEqual([]);
  expect(r.once.ls).toEqual([]);
  expect(r.again).toEqual([]); // nothing left to delete or upload
  noErrors(page);
});

test('#3 SAY GOODBYE offline: the id waits in save.gone, the next push deletes it; applyCloud keeps it gone and finds pictures without a row', async ({ page }) => {
  await boot(page, SAVE);
  await seedToys(page, ['s1'], ['a1', 'a2']);
  await page.route('**/storage/v1/object/public/toys/u1/c1.png', r => r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }));
  const r = await page.evaluate(async fs => {
    eval('(' + fs + ')()');
    window.__rows = { 'u1:s1': { id: 's1' }, 'u1:a1': { id: 'a1', away: 'hills' }, 'u1:a2': { id: 'a2', away: 'hills' } };
    PSNet.synced = true;
    // the delete fails (offline)
    const from = PSNet.sb.from; PSNet.sb.from = t => { const o = from(t); if (t === 'toys') { const th = o.then; o.then = function (res) { if (this._op === 'delete') return res({ error: { message: 'offline' } }); return th.call(this, res); }; } return o; };
    PSAdventure.forget(__game.scene.getScenes(true)[0], __save.data.away[0]);
    await new Promise(r => setTimeout(r, 500));
    const offline = { gone: __save.data.gone.slice(), ls: JSON.parse(localStorage.getItem('plushsquad_v1')).gone, row: !!__rows['u1:a1'] };
    PSNet.sb.from = from;
    await PSNet.pushNow();
    const online = { gone: __save.data.gone, row: !!__rows['u1:a1'], a2: !!__rows['u1:a2'] };
    // a cloud save from the other device that still has a1 (and c1, whose row is missing): a1 stays gone, c1's picture comes down
    __save.data.gone = ['a1'];
    await PSNet.applyCloud({ owner: 'u1', savedAt: 9, toys: [{ id: 'c1', name: 'C' }], away: [{ toy: { id: 'a1' }, trip: { world: 'hills' } }], stars: {} });
    return { offline, online, away: __save.data.away.length, c1: !!(await __IDB.get('c1')) };
  }, fakeSb.toString());
  expect(r.offline).toEqual({ gone: ['a1'], ls: ['a1'], row: true });
  expect(r.online).toEqual({ gone: [], row: false, a2: true });
  expect(r.away).toBe(0);
  expect(r.c1).toBe(true);
  noErrors(page);
});

test('calm mode keeps the Big Yawn warning pulse (like the slapshot and beam charge)', async ({ page }) => {
  await boot(page, SAVE);
  await page.evaluate(() => PSPrefs.set('calm', true));
  await go(page, 'battle', { rival: 1 });
  await page.evaluate(() => { const s = __game.scene.getScene('battle'); if (s._pick) s._pick(null); });
  await waitTurn(page);
  const r = await page.evaluate(() => {
    const b = __game.scene.getScene('battle'), out = {};
    for (const type of ['yawn', 'slapshot']) {
      b.rival.charging = { type }; b.chargeFx(b.rival);
      out[type] = !!b.chargeTw && !b.chargeTw.isPaused();
      if (b.chargeTw) { b.chargeTw.stop(); b.chargeTw = null; } if (b.embers) { b.embers.destroy(); b.embers = null; }
    }
    b.rival.charging = null; return out;
  });
  expect(r).toEqual({ yawn: true, slapshot: true });
  noErrors(page);
});
