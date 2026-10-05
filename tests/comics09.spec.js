// v0.9 comics for every world (#62, docs/gdd/0.9-world-comics.md section 8): Pillow Hills, Space, Canada, Spooky
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, offscreen, noErrors } = require('./helpers');

const IDS = ['hills', 'space', 'canada', 'spooky'];
const TITLES = { hills: 'PILLOW HILLS!', space: 'SPACE!', canada: 'CANADA!', spooky: 'SPOOKY!' };
const COVERS = ['Pillows at Dawn', 'Beam Me Up... Oops', 'Welcome to Canada!', 'Hats for Everyone'];
const OPEN = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 3, polandball: 3, ghost: 3, dragonboss: 1, moose: 1, beaver: 1, bear: 1, sasquatch: 1 };
const save = extra => Object.assign({}, BASE_SAVE, extra);
const scenes = page => page.evaluate(() => __game.scene.getScenes(true).map(s => s.scene.key));
const flags = page => page.evaluate(() => Object.assign({}, __save.data.comics));
const texts = (page, key) => page.evaluate(k => { const out = []; const walk = l => l.forEach(o => { if (o.type === 'Text' && o.visible) out.push(o.text); if (o.list) walk(o.list); }); walk(__game.scene.getScene(k).children.list); return out.join(' | '); }, key);
const until = async (page, fn, want, timeout = 60000) => expect.poll(async () => { await wait(page, 500); return fn(); }, { timeout }).toEqual(want);
// emits a tap on the first interactive container of a scene that shows this label (nested ones too)
const tapLabel = (page, key, label) => page.evaluate(([k, label]) => {
  const find = l => { for (const o of l) { if (o.list) { if (o.input && o.list.some(t => t.type === 'Text' && t.text === label)) return o; const r = find(o.list); if (r) return r; } } return null; };
  const c = find(__game.scene.getScene(k).children.list); if (!c) throw new Error('no button ' + label); c.emit('pointerup', {});
}, [key, label]);
const tapTab = (page, name) => page.evaluate(n => { __game.scene.getScene('map').children.list.find(o => o.type === 'Container' && o.height === 96 && o.list.some(t => t.text === n)).emit('pointerup'); }, name);
// starts a comic with its clock stopped, so the panels only move on taps (SwiftShader runs the game far slower than real time)
async function startComic(page, data) {
  await page.evaluate(d => { const c = __game.scene.getScene('comic'); c.events.once('create', () => { c.time.paused = true; }); __game.scene.getScenes(true)[0].scene.start('comic', d); }, data);
  await page.waitForFunction(() => __game.scene.isActive('comic'), null, { timeout: 30000 });
  await fast(page);
}
const idx = (page, id) => page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);
// a duel's result panel with NEXT RIVAL (or REMATCH) as the main button
async function resultWith(page, primary, nextIdx) {
  await page.waitForFunction(() => { const b = __game.scene.getScene('battle'); return b.sys.isActive() && !!(b.hero || typeof b._pick === 'function'); }, null, { timeout: 60000 });
  await page.evaluate(([primary, nextIdx]) => {
    const b = __game.scene.getScene('battle'); if (!b.hero && b._pick) b._pick(null); b.over = true; b.busy = true;
    b.resultPanel({ won: true, stars: 3, gain: 50, before: { l: 5, r: 10, n: 400 }, after: { l: 5, r: 60, n: 400 }, primary, nextIdx, notes: [] }, false);
  }, [primary, nextIdx]);
  await wait(page, 800);
}

test('each comic starts by its id: panels, taps, SKIP (top right, 90 px+) sets only its flag; an unknown id goes to the map', async ({ page }) => {
  await boot(page, save({ comics: {} }));
  for (const id of IDS) {
    await startComic(page, { world: id, then: { key: 'album', data: { tab: 'comics' } } });
    expect(await page.evaluate(() => __game.scene.getScene('comic').id)).toBe(id);
    await page.evaluate(() => { const c = __game.scene.getScene('comic'); c.tap(); c.tap(); c.tap(); });
    expect(await page.evaluate(() => [__game.scene.getScene('comic').cur, __game.scene.getScene('comic').done])).toEqual([1, true]);
    expect((await flags(page))[id]).toBeFalsy(); // not seen before the title page
    const skip = await page.evaluate(() => { const c = __game.scene.getScene('comic'), b = c.skipBtn; return { x: b.x, y: b.y, w: b.width, h: b.height, W: __game.config.width }; });
    expect(skip.h).toBeGreaterThanOrEqual(90);
    expect(skip.y - skip.h / 2).toBeGreaterThanOrEqual(0);
    expect(skip.x + skip.w / 2).toBeLessThanOrEqual(skip.W);
    expect(skip.x).toBeGreaterThan(skip.W / 2);
    await page.evaluate(() => __game.scene.getScene('comic').skipBtn.emit('pointerup'));
    expect(await page.evaluate(() => [__game.scene.getScene('comic').titled, __game.scene.getScene('comic').cur, __game.scene.getScene('comic').panels.length])).toEqual([true, 2, 3]);
    expect((await flags(page))[id]).toBe(true);
    const t = await texts(page, 'comic');
    expect(t).toContain(TITLES[id]);
    expect(t).toContain('DONE!');
    expect(await offscreen(page, 'comic')).toEqual([]);
    // the words in the panels: short bubbles (under 42 characters), nothing under 30 px
    const words = await page.evaluate(() => { const out = []; const walk = l => l.forEach(o => { if (o.type === 'Text') out.push([o.text, parseFloat(o.style.fontSize) * o.scaleX]); if (o.list) walk(o.list); }); __game.scene.getScene('comic').panels.forEach(p => walk(p.list)); return out; });
    expect(words.length).toBeGreaterThanOrEqual(5);
    for (const [s, fs] of words) { expect(s.length, s).toBeLessThan(42); expect(fs, s).toBeGreaterThanOrEqual(30); }
  }
  expect(await flags(page)).toEqual({ hills: true, space: true, canada: true, spooky: true });
  await page.evaluate(() => __game.scene.getScenes(true)[0].scene.start('comic', { world: 'nope' }));
  await until(page, () => scenes(page), ['map']);
  noErrors(page);
});

test('new save: TAP TO PLAY plays the Pillow Hills comic once, then the Pillow Hills map', async ({ page }) => {
  await boot(page, { muted: true });
  await go(page, 'title');
  await page.evaluate(() => __game.scene.getScene('title').go());
  await until(page, () => scenes(page), ['comic']);
  expect(await page.evaluate(() => __game.scene.getScene('comic').id)).toBe('hills');
  await page.evaluate(() => __game.scene.getScene('comic').skipBtn.emit('pointerup'));
  expect((await flags(page)).hills).toBe(true);
  await tapLabel(page, 'comic', 'LET\'S GO!');
  await until(page, () => scenes(page), ['map']);
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(0);
  await go(page, 'title');
  await page.evaluate(() => __game.scene.getScene('title').go());
  await until(page, () => scenes(page), ['map']);
  noErrors(page);
});

test('old save after the update: no Hills comic, its cover is unlocked in the Album; Space is not', async ({ page }) => {
  const old = save({ comics: { canada: true, spooky: true } }); delete old.mig09;
  await boot(page, old);
  expect(await flags(page)).toEqual({ canada: true, spooky: true, hills: true });
  await go(page, 'map', { world: 0 });
  expect(await scenes(page)).toEqual(['map']);
  await go(page, 'album', { tab: 'comics' });
  const t = await texts(page, 'album');
  expect(t).toContain('Pillows at Dawn');
  expect(t).toContain('Reach Space to unlock');
  noErrors(page);
});

test('Space: the tab plays it once, the open tab never replays; NEXT RIVAL after Prof. Hoot goes through it to the duel', async ({ page }) => {
  await boot(page, save({ comics: { hills: true, canada: true, spooky: true } }));
  await go(page, 'map', { world: 0 });
  await tapTab(page, 'SPACE');
  await until(page, () => scenes(page), ['comic']);
  expect(await page.evaluate(() => __game.scene.getScene('comic').id)).toBe('space');
  await page.evaluate(() => __game.scene.getScene('comic').skipBtn.emit('pointerup'));
  await tapLabel(page, 'comic', 'LET\'S GO!');
  await until(page, () => scenes(page), ['map']);
  expect(await page.evaluate(() => [__game.scene.getScene('map').world, __save.data.comics.space])).toEqual([1, true]);
  // the open tab does nothing now (#62: replay only from the Album)
  await tapTab(page, 'SPACE');
  await wait(page, 1500);
  expect(await scenes(page)).toEqual(['map']);
  await go(page, 'map', { world: 0 });
  await tapTab(page, 'SPACE');
  await until(page, () => page.evaluate(() => __game.scene.isActive('map') && __game.scene.getScene('map').world), 1);
  expect(await scenes(page)).toEqual(['map']);
  // first clear of Prof. Hoot -> NEXT RIVAL: the comic first, then the first Space duel
  await page.evaluate(() => { __save.data.comics.space = false; });
  const hoot = await idx(page, 'hoot'), next = hoot + 1;
  await go(page, 'battle', { rival: hoot });
  await resultWith(page, 'next', next);
  await tapLabel(page, 'battle', 'NEXT RIVAL');
  await until(page, () => scenes(page), ['comic']);
  expect(await page.evaluate(() => [__game.scene.getScene('comic').id, __game.scene.getScene('comic').then])).toEqual(['space', { key: 'battle', data: { rival: next } }]);
  await page.evaluate(() => __game.scene.getScene('comic').skipBtn.emit('pointerup'));
  await tapLabel(page, 'comic', 'LET\'S GO!');
  await until(page, () => scenes(page), ['battle']);
  expect(await page.evaluate(() => __game.scene.getScene('battle').R.world)).toBe(1);
  noErrors(page);
});

test('no comic in or after a duel: REMATCH of a Space duel and of a friend duel go straight back to the duel', async ({ page }) => {
  await boot(page, save({ comics: { hills: true, canada: true, spooky: true } }));
  const sp = await idx(page, 'robot');
  await go(page, 'battle', { rival: sp }); // started directly (e.g. restored), so the Space comic is still due
  await resultWith(page, 'rematch');
  await tapLabel(page, 'battle', 'REMATCH');
  const seen = new Set();
  for (let i = 0; i < 8; i++) { (await scenes(page)).forEach(k => seen.add(k)); await wait(page, 500); }
  expect([...seen]).toEqual(['battle']);
  expect(await page.evaluate(() => [__game.scene.getScene('battle').rivalIdx, !!__game.scene.getScene('battle').shown])).toEqual([sp, false]);
  // a friend's Jack (world of Pillow Hills) with the Hills comic due: no comic either
  await page.evaluate(() => { __save.data.comics = {}; __save.data.xp = 0; __save.data.wins = 0; __save.data.stars = {}; });
  await go(page, 'battle', { fjack: { level: 3 }, ownerName: 'Max' });
  await resultWith(page, 'rematch');
  await tapLabel(page, 'battle', 'REMATCH');
  seen.clear();
  for (let i = 0; i < 8; i++) { (await scenes(page)).forEach(k => seen.add(k)); await wait(page, 500); }
  expect([...seen]).toEqual(['battle']);
  noErrors(page);
});

test('?halloween: the Spooky tab plays the Spooky comic; NEXT RIVAL after Sasquatch to Pumpkin Pete goes through it', async ({ page }) => {
  await boot(page, save({ stars: OPEN, comics: { hills: true, space: true, canada: true } }), '&halloween');
  await go(page, 'map', { world: 2 });
  await tapTab(page, 'SPOOKY');
  await until(page, () => scenes(page), ['comic']);
  expect(await page.evaluate(() => __game.scene.getScene('comic').id)).toBe('spooky');
  await page.evaluate(() => __game.scene.getScene('comic').skipBtn.emit('pointerup'));
  await tapLabel(page, 'comic', 'LET\'S GO!');
  await until(page, () => scenes(page), ['map']);
  expect(await page.evaluate(() => [__game.scene.getScene('map').world, __save.data.comics.spooky])).toEqual([3, true]);
  await page.evaluate(() => { __save.data.comics.spooky = false; });
  const sq = await idx(page, 'sasquatch'), pete = await idx(page, 'pumpkin');
  await go(page, 'battle', { rival: sq });
  await resultWith(page, 'next', pete);
  await tapLabel(page, 'battle', 'NEXT RIVAL');
  await until(page, () => scenes(page), ['comic']);
  expect(await page.evaluate(() => __game.scene.getScene('comic').id)).toBe('spooky');
  await page.evaluate(() => __game.scene.getScene('comic').toTitle());
  await tapLabel(page, 'comic', 'LET\'S GO!');
  await until(page, () => scenes(page), ['battle']);
  expect(await page.evaluate(() => __game.scene.getScene('battle').R.id)).toBe('pumpkin');
  noErrors(page);
});

test('out of season (20 Nov): no Spooky tab or comic; the cover is hidden if unseen, shown and playable if seen', async ({ page }) => {
  // move the clock to November (the tests also run in October, when the event is on by date)
  await page.addInitScript(() => {
    const D = Date, off = new D('2026-11-20T10:00:00').getTime() - D.now();
    class FD extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
    window.Date = FD;
  });
  await boot(page, save({ stars: OPEN, comics: { hills: true, space: true, canada: true } }));
  expect(await page.evaluate(() => new Date().getMonth())).toBe(10);
  await go(page, 'map', { world: 2 });
  expect(await scenes(page)).toEqual(['map']);
  expect(await texts(page, 'map')).not.toContain('SPOOKY');
  await go(page, 'album', { tab: 'comics' });
  let t = await texts(page, 'album');
  expect(t).not.toContain('Hats for Everyone');
  expect(t).not.toContain('Comes back on Halloween');
  await page.evaluate(() => { __save.data.comics.spooky = true; });
  await go(page, 'album', { tab: 'comics' });
  t = await texts(page, 'album');
  expect(t).toContain('Hats for Everyone');
  await tapLabel(page, 'album', 'Hats for Everyone');
  await until(page, () => scenes(page), ['comic']);
  expect(await page.evaluate(() => __game.scene.getScene('comic').id)).toBe('spooky');
  await page.evaluate(() => __game.scene.getScene('comic').toTitle());
  await tapLabel(page, 'comic', 'DONE!');
  await until(page, () => scenes(page), ['album']);
  noErrors(page);
});

test('rotation mid-comic: same panel, nothing drawn twice, the flag waits for the title page', async ({ page }) => {
  await boot(page, save({ comics: { canada: true } }));
  for (const id of ['hills', 'space', 'spooky']) {
    await startComic(page, { world: id });
    await page.evaluate(() => { const c = __game.scene.getScene('comic'); c.tap(); c.tap(); }); // panel 1 finished, panel 2 started
    const snap = await page.evaluate(() => __psSnapshot());
    expect(snap).toMatchObject({ key: 'comic', data: { world: id, panel: 1 } });
    await page.evaluate(s => { window.__oldGame = __game; window.__psRebuild(s); }, snap);
    // stop the new comic's clock as soon as it runs (the panels would go on by themselves)
    await page.waitForFunction(() => { const g = window.__game, c = g && g !== window.__oldGame && g.scene.getScene('comic'); if (c && c.sys.isActive() && c.panels) { c.time.paused = true; return true; } return false; }, null, { timeout: 60000, polling: 50 });
    await fast(page);
    expect(await page.evaluate(() => { const c = __game.scene.getScene('comic'); return [c.id, c.cur, c.panels.length, !!c.titled]; })).toEqual([id, 1, 2, false]);
    expect((await flags(page))[id]).toBeFalsy();
    await page.evaluate(() => __game.scene.getScene('comic').toTitle());
    expect((await flags(page))[id]).toBe(true);
    // and on the title page
    await page.evaluate(() => window.__psRebuild(__psSnapshot()));
    await page.waitForFunction(() => window.__game && __game.scene.isActive('comic'), null, { timeout: 60000 });
    await fast(page); await wait(page, 1000);
    expect(await page.evaluate(() => { const c = __game.scene.getScene('comic'); return [c.cur, c.panels.length, !!c.titled]; })).toEqual([2, 3, true]);
    expect(await texts(page, 'comic')).toContain('LET\'S GO!');
  }
  noErrors(page);
});

test('bedtime: a due comic does not start, the bedtime screen shows, the comic is still due after', async ({ page }) => {
  await boot(page, save({ comics: { hills: true, canada: true, spooky: true }, parent: { bedtime: '00:00' } }));
  await page.evaluate(() => __game.scene.getScenes(true)[0].scene.start('map', { world: 1 }));
  await until(page, () => scenes(page), ['bedtime']);
  expect((await flags(page)).space).toBeFalsy();
  noErrors(page);
});

// Album shelf and comic pages on the phone and iPad sizes (+ iPhone SE landscape for the cover titles)
for (const [name, vp] of [['iPhone SE', [375, 667]], ['iPhone 15 Pro Max', [430, 932]], ['iPad mini', [744, 1133]], ['iPad 11 portrait', [834, 1194]], ['iPad landscape', [1194, 834]], ['iPhone SE landscape', [667, 375]]]) {
  test(`layout on ${name}: Album 2 x 2 shelf clear of the switch, comic pages inside the screen`, async ({ page }) => {
    await page.setViewportSize({ width: vp[0], height: vp[1] });
    await boot(page, save(), '&halloween');
    await go(page, 'album', { tab: 'comics' });
    expect(await offscreen(page, 'album')).toEqual([]);
    const r = await page.evaluate(() => {
      const L = __game.scene.getScene('album').children.list.filter(o => o.type === 'Container' && o.input);
      const sw = L.filter(o => o.list.some(t => t.text === 'STICKERS' || t.text === 'COMICS'));
      const cov = L.filter(o => !sw.includes(o) && o.width >= 400).map(o => ({ x: o.x, y: o.y, w: o.width, h: o.height, title: o.list.find(t => t.type === 'Text').text, tw: o.list.find(t => t.type === 'Text').displayWidth }));
      return { swTop: Math.min(...sw.map(o => o.y - o.height / 2)), cov };
    });
    expect(r.cov.map(c => c.title)).toEqual(COVERS);
    const [a, b, c, d] = r.cov;
    expect([a.y === b.y, c.y === d.y, a.x < b.x, c.x < d.x, a.x === c.x]).toEqual([true, true, true, true, true]);
    expect(b.x - a.x).toBeGreaterThanOrEqual(a.w);
    expect(c.y - a.y).toBeGreaterThanOrEqual(a.h);
    for (const k of r.cov) { expect(k.y + k.h / 2).toBeLessThanOrEqual(r.swTop); expect(k.tw).toBeLessThanOrEqual(k.w - 30); }
    for (const id of IDS) {
      await go(page, 'comic', { world: id, panel: 3 });
      expect(await offscreen(page, 'comic'), id).toEqual([]);
      // every bubble stays in its panel (a little overlap on the border is comic style); actors stay on the screen
      const bad = await page.evaluate(() => {
        const s = __game.scene.getScene('comic'), W = __game.config.width, H = __game.config.height, out = [];
        s.panels.forEach((p, i) => p.list.forEach(o => {
          if (o.type === 'Container' && o.list[1] && o.list[1].type === 'Text' && o.angle === 0) { // a bubble
            const t = o.list[1], bw = t.width + 60, bh = t.height + 44;
            if (Math.abs(o.x) + bw / 2 > p.r.w / 2 + 12 || Math.abs(o.y) + bh / 2 > p.r.h / 2 + 12) out.push(['bubble', i, t.text]);
          }
          if (o.type === 'Image' && o.visible) {
            const b = o.getBounds();
            if (b.left < -2 || b.right > W + 2 || b.top < -2 || b.bottom > H + 2) out.push(['actor', i, o.texture.key]);
          }
        }));
        return out;
      });
      // known, not part of #62: Canada's pine and Sasquatch (panel 3, shipped in v0.8) stick out past the right screen edge in landscape
      expect(bad.filter(x => !(id === 'canada' && x[0] === 'actor' && ['pine', 'sasquatch'].includes(x[2]))), id).toEqual([]);
    }
    noErrors(page);
  });
}
