// v0.8 Canada world (docs/gdd/0.8-canada.md): rivals, unlock, scaling from level 6, north music, Canada Toque, map tabs
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, waitTurn, offscreen, noErrors } = require('./helpers');

const SPACE_DONE = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 3, polandball: 3, ghost: 3, dragonboss: 1 };
const save = extra => Object.assign({}, BASE_SAVE, extra);
const idx = (page, id) => page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);
const XP = { 5: 700, 8: 1750, 10: 2700 }; // first XP of these levels (need(l) = 100 + 50 (l - 1))

async function duel(page, id) {
  await go(page, 'battle', { rival: await idx(page, id) });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page);
}

test('Canada sits after Space: 4 rivals in order, opens after the Mothership, before the event world', async ({ page }) => {
  await boot(page, save({ stars: Object.assign({}, SPACE_DONE, { dragonboss: 0 }) }), '&halloween');
  const r = await page.evaluate(() => __RIVALS.map(r => [r.id, r.world, r.hp, r.xp, !!r.boss]));
  const ids = r.map(x => x[0]);
  const i = ids.indexOf('moose');
  expect(ids.slice(i - 1, i + 5)).toEqual(['dragonboss', 'moose', 'beaver', 'mountie', 'sasquatch', 'pumpkin']);
  expect(r.slice(i, i + 4)).toEqual([['moose', 2, 145, 130, false], ['beaver', 2, 155, 140, false], ['mountie', 2, 165, 150, false], ['sasquatch', 2, 210, 200, true]]);
  await go(page, 'map', { world: 2 });
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).not.toBe(2); // locked: falls back
  await page.evaluate(() => { __save.data.stars.dragonboss = 1; });
  await go(page, 'map', { world: 2 });
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(2);
  expect(await offscreen(page, 'map')).toEqual([]);
  noErrors(page);
});

test('Canada pep: scaling starts at level 6, EASY and HARD as in the design', async ({ page }) => {
  await boot(page, save({ stars: SPACE_DONE }));
  const pep = async (xp, diff, id = 'sasquatch') => {
    await page.evaluate(([xp, diff]) => { __save.data.xp = xp; __save.data.diff = diff; }, [xp, diff]);
    await duel(page, id);
    return page.evaluate(() => __game.scene.getScene('battle').rival.max);
  };
  expect(await pep(XP[5], 'normal')).toBe(210);
  expect(await pep(XP[8], 'normal')).toBe(230);
  expect(await pep(XP[10], 'normal')).toBe(250);
  expect(await pep(XP[8], 'easy')).toBe(170);
  expect(await pep(XP[8], 'hard')).toBe(275);
  expect(await pep(XP[5], 'normal', 'moose')).toBe(145);
  noErrors(page);
});

for (const [id, tex, track] of [['moose', 'moose', 'north'], ['beaver', 'beaver', 'north'], ['mountie', 'bear', 'north'], ['sasquatch', 'sasquatch', 'boss']]) test(`Canada duel vs ${id}: art, ${track} music, every rival move runs`, async ({ page }) => {
  await boot(page, save({ stars: SPACE_DONE }));
  {
    await duel(page, id);
    expect(await page.evaluate(() => __game.scene.getScene('battle').rival.spr.texture.key)).toBe(tex);
    expect(await page.evaluate(() => PSAudio._want)).toBe(track);
    // play each of the rival's moves once against Jack
    const n = await page.evaluate(() => __game.scene.getScene('battle').rmoves.length);
    for (let k = 0; k < n; k++) {
      await page.evaluate(k => { const b = __game.scene.getScene('battle'); b.hero.hp = b.hero.max; window.__mv = false; b.doMove(b.rmoves[k], b.rival, b.hero).then(() => { window.__mv = true; }); }, k);
      await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => window.__mv); }, { timeout: 60000 }).toBe(true);
    }
  }
  noErrors(page);
});

test('beating Sasquatch gives the Canada Toque; it shows in Me and on the title screen', async ({ page }) => {
  await boot(page, save({ stars: SPACE_DONE, mig08: 1 }));
  await duel(page, 'sasquatch');
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 90000 }).toBe(true);
  const d = await page.evaluate(() => __save.data);
  expect(d.costumes.toque).toBe(true);
  expect(JSON.stringify(await page.evaluate(() => __game.scene.getScene('battle').shown))).toContain('Canada Toque');
  await page.evaluate(() => { __save.data.costume = 'toque'; });
  await go(page, 'title');
  expect(await page.evaluate(() => __game.scene.getScene('title').children.list.some(o => o.texture && o.texture.key === 'toque'))).toBe(true);
  noErrors(page);
});

test('map tabs: with 4 worlds in portrait the open tab has its name, the others only an icon; nothing off screen', async ({ page }) => {
  for (const vp of [{ width: 375, height: 667 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(vp);
    await boot(page, save({ stars: Object.assign({}, SPACE_DONE, { moose: 1 }) }), '&halloween');
    await go(page, 'map', { world: 2 });
    const tabs = await page.evaluate(() => __game.scene.getScene('map').children.list.filter(o => o.type === 'Container' && o.depth === 6 && o.height === 96)
      .map(c => ({ w: c.width, name: c.list.find(o => o.type === 'Text').visible })));
    expect(tabs.length).toBe(4);
    expect(tabs.filter(t => t.name).length).toBe(vp.width < vp.height ? 1 : 4); // wide landscape: every name fits
    expect(tabs[2].name).toBe(true);
    expect(await offscreen(page, 'map')).toEqual([]);
  }
  noErrors(page);
});
