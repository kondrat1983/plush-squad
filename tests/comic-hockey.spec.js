// v0.8 Canada extras: the arrival comic (#31) and Pond Hockey (docs/gdd/0.8-canada.md 7b and 4b)
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, offscreen, noErrors } = require('./helpers');

const OPEN = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 3, polandball: 3, ghost: 3, dragonboss: 1 };
const save = extra => Object.assign({}, BASE_SAVE, { comics: {}, stars: OPEN }, extra);
const scenes = page => page.evaluate(() => __game.scene.getScenes(true).map(s => s.scene.key));
const S = (page, key) => page.evaluate(k => !!__game.scene.getScene(k), key);

test('the comic shows on the first trip to Canada, taps go panel by panel, LET\'S GO opens the map once', async ({ page }) => {
  await boot(page, save());
  await page.evaluate(() => __game.scene.getScenes(true)[0].scene.start('map', { world: 2 }));
  await expect.poll(async () => { await wait(page, 500); return scenes(page); }, { timeout: 30000 }).toEqual(['comic']);
  // 10 fast taps: every panel is finished and the title comes, nothing breaks
  for (let i = 0; i < 10; i++) await page.evaluate(() => __game.scene.getScene('comic').tap());
  await page.evaluate(() => __game.scene.getScene('comic').toTitle());
  expect(await page.evaluate(() => __game.scene.getScene('comic').titled)).toBe(true);
  expect(await page.evaluate(() => __psSnapshot().data.panel)).toBe(3);
  expect(await offscreen(page, 'comic')).toEqual([]);
  expect(await page.evaluate(() => (__save.data.comics || {}).canada)).toBe(true); // the title page counts as seen (SKIP or the end)
  await page.evaluate(() => { const c = __game.scene.getScene('comic'); c.children.list.find(o => o.type === 'Container' && o.list.some(t => t.text === 'LET\'S GO!')).emit('pointerup'); });
  await expect.poll(async () => { await wait(page, 500); return scenes(page); }, { timeout: 30000 }).toEqual(['map']);
  expect(await page.evaluate(() => [__game.scene.getScene('map').world, __save.data.comics.canada])).toEqual([2, true]);
  await go(page, 'title'); await go(page, 'map', { world: 2 });
  expect(await scenes(page)).toEqual(['map']);
  // v0.9 (#62): tapping the open Canada tab no longer replays the comic (replay only from the Album)
  await page.evaluate(() => { const m = __game.scene.getScene('map'); m.children.list.find(o => o.type === 'Container' && o.height === 96 && o.list.some(t => t.text === 'CANADA')).emit('pointerup'); });
  await wait(page, 1500);
  expect(await scenes(page)).toEqual(['map']);
  // the reused scene starts fresh (Album replay) and SKIP still reaches the title page
  // checked right after create: on a slow CI runner one long frame can auto-advance the panels to the title page
  await page.evaluate(() => __game.scene.getScenes(true)[0].scene.start('comic', { world: 'canada', then: { key: 'album', data: { tab: 'comics' } } }));
  const fresh = await page.waitForFunction(() => { const c = __game.scene.getScene('comic'); return __game.scene.isActive('comic') && c.cur >= 0 ? { titled: c.titled, cur: c.cur } : null; }, null, { timeout: 30000, polling: 'raf' });
  expect((await fresh.jsonValue()).titled).toBe(false);
  await page.evaluate(() => __game.scene.getScene('comic').skipBtn.emit('pointerup'));
  expect(await page.evaluate(() => __game.scene.getScene('comic').titled)).toBe(true);
  noErrors(page);
});

test('the comic comes back where it was after a rebuild, and SKIP + LET\'S GO goes on to the Canada duel', async ({ page }) => {
  await boot(page, save());
  const max = await page.evaluate(() => __RIVALS.findIndex(r => r.id === 'moose'));
  await page.evaluate(m => __game.scene.getScenes(true)[0].scene.start('comic', { world: 'canada', then: { key: 'battle', data: { rival: m } } }), max);
  await wait(page, 1500);
  await page.evaluate(() => { const c = __game.scene.getScene('comic'); c.tap(); c.tap(); });
  const snap = await page.evaluate(() => __psSnapshot());
  expect(snap.key).toBe('comic');
  expect(snap.data.panel).toBeGreaterThanOrEqual(1);
  await page.evaluate(s => window.__psRebuild(s), snap);
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => { const c = window.__game && __game.scene.getScene('comic'); return c && c.sys.isActive() ? c.cur : -1; }); }, { timeout: 60000 }).toBe(Math.min(2, snap.data.panel)); // 3 = the title page (all panels shown)
  expect(await page.evaluate(() => !!__game.scene.getScene('comic').titled)).toBe(snap.data.panel >= 3);
  await page.evaluate(() => __game.scene.getScene('comic').skipBtn.emit('pointerup'));
  await page.evaluate(() => { const c = __game.scene.getScene('comic'); c.children.list.find(o => o.type === 'Container' && o.list.some(t => t.text === 'LET\'S GO!')).emit('pointerup'); });
  await expect.poll(async () => { await wait(page, 500); return scenes(page); }, { timeout: 30000 }).toEqual(['battle']);
  expect(await page.evaluate(() => __game.scene.getScene('battle').R.id)).toBe('moose');
  noErrors(page);
});

test('Pond Hockey opens after the first Beaver Bob win; goals, posts, saves; XP = score x 2 (max 60)', async ({ page }) => {
  await boot(page, save({ comics: { canada: true }, stars: Object.assign({}, OPEN, { moose: 1 }) }));
  await go(page, 'map', { world: 2 });
  const label = () => page.evaluate(() => __game.scene.getScene('map').children.list.filter(o => o.type === 'Container').flatMap(c => c.list).filter(o => o.type === 'Text').map(t => t.text).find(t => /STAR CATCH|POND HOCKEY/.test(t)));
  expect(await label()).toBe('STAR CATCH');
  await page.evaluate(() => { __save.data.stars.beaver = 1; });
  await go(page, 'map', { world: 2 });
  expect(await label()).toBe('POND HOCKEY');
  await go(page, 'hockey');
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __game.scene.getScene('hockey').running); }, { timeout: 60000 }).toBe(true);
  expect(await offscreen(page, 'hockey')).toEqual([]);
  const r = await page.evaluate(() => {
    const h = __game.scene.getScene('hockey'), out = [], mk = gold => ({ o: h.add.image(0, 0, 'puck'), gold });
    h.bob.x = h.netX - h.netW / 2 + h.bobHalf; h.damT = 0; // Bob on the left
    h.judge(mk(false), h.netX + h.netW / 2 - 60); out.push(h.score);            // goal +1
    h.judge(mk(true), h.netX + h.netW / 2 - 60); out.push(h.score);             // golden +2
    h.judge(mk(false), h.netX + h.netW / 2 - 5); out.push(h.score);             // post
    h.judge(mk(false), h.bob.x); out.push(h.score);                              // Bob saves
    h.judge(mk(false), h.netX + h.netW); out.push(h.score);                      // wide
    for (let i = 0; i < 3; i++) h.judge(mk(false), h.netX + h.netW / 2 - 60);   // 3 in a row
    out.push(h.score, h.bestStreak);
    const xp0 = __save.data.xp; h.end(); out.push(__save.data.xp - xp0, __save.data.bestHockey);
    return out;
  });
  expect(r).toEqual([1, 3, 3, 3, 3, 6, 3, 12, 6]);
  noErrors(page);
});
