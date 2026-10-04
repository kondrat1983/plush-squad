// v0.8 boss costumes and the save migration (docs/gdd/0.8-space-rework.md 6.2, 6.4; decisions.md)
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, offscreen, noErrors } = require('./helpers');

const save = extra => Object.assign({}, BASE_SAVE, extra);
const winVs = async (page, data) => {
  await go(page, 'battle', data);
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 90000 }).toBe(true);
  return page.evaluate(() => __game.scene.getScene('battle').shown.notes);
};
const idx = (page, id) => page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);

test('migration: an old save keeps the crown and gets the owl hat, nothing is removed', async ({ page }) => {
  const old = save({ mig08: 0, stars: { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 3, polandball: 3, ghost: 3, dragonboss: 3 }, ach: { polandball: 1, dragon: 1 }, costumes: { pumpkin: true }, costume: 'crown' });
  await boot(page, old);
  const d = await page.evaluate(() => __save.data);
  expect(d.costumes).toMatchObject({ crown: true, owlhat: true, pumpkin: true });
  expect(d.costumes.ufohat).toBeFalsy();
  expect(d.costume).toBe('crown');
  expect(d.ach).toMatchObject({ polandball: 1, dragon: 1 });
  expect(d.stars.dragonboss).toBe(3);
  // gift toasts: the owl hat yes, the crown no (Me already showed it to Dragon Boss winners, code review)
  const texts = () => page.evaluate(() => { const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); });
    __game.scene.getScenes(true).forEach(s => walk(s.children.list)); return out.join('|'); });
  let all = '';
  for (let i = 0; i < 16; i++) { await wait(page, 500); all += await texts(); }
  expect(all).toContain('A GIFT: Owl Hat');
  expect(all).not.toContain('A GIFT: Royal Crown');
  noErrors(page);
});

test('migration runs once: a new player who beats the Space boss gets the UFO Hat, not the crown', async ({ page }) => {
  await boot(page, save({ stars: { timmy: 1, moo: 1, sly: 1, hoot: 1, robot: 1, polandball: 1, ghost: 1 }, mig08: 1 })); // not all 24 stars: no Superstar crown
  const notes = await winVs(page, { rival: await idx(page, 'dragonboss') });
  expect(notes.join(' ')).toContain('New costume: UFO Hat');
  const c = await page.evaluate(() => __save.data.costumes);
  expect(c.ufohat).toBe(true);
  expect(c.crown).toBeFalsy();
  // reload: the migration must not add the crown now that the UFO boss has stars
  await page.evaluate(() => __save.store());
  await boot(page, await page.evaluate(() => __save.data));
  expect(await page.evaluate(() => !!__save.data.costumes.crown)).toBe(false);
  noErrors(page);
});

test('Professor Hoot gives the Owl Hat (green), Count Fang the Bat Hat', async ({ page }) => {
  await boot(page, save({ mig08: 1 }), '&halloween');
  expect((await winVs(page, { rival: await idx(page, 'hoot') })).join(' ')).toContain('New costume: Owl Hat');
  expect((await winVs(page, { rival: await idx(page, 'fang') })).join(' ')).toContain('New costume: Bat Hat');
  const c = await page.evaluate(() => __save.data.costumes);
  expect(c).toMatchObject({ owlhat: true, bat: true });
  expect(c.crown).toBeFalsy();
  noErrors(page);
});

test('the Superstar sticker gives the Royal Crown', async ({ page }) => {
  const all = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 3, polandball: 3, ghost: 3, dragonboss: 3 };
  await boot(page, save({ stars: all, mig08: 1 }));
  await page.evaluate(() => PSExtra.checkAch());
  expect(await page.evaluate(() => [!!__save.data.ach.allstars, !!__save.data.costumes.crown])).toEqual([true, true]);
  noErrors(page);
});

const SIZES = { 'iPhone SE': { width: 375, height: 667 }, 'iPhone 14': { width: 390, height: 844 }, 'iPad portrait': { width: 768, height: 1024 }, 'iPad landscape': { width: 1024, height: 768 }, 'phone landscape': { width: 844, height: 390 } };
for (const [tag, vp] of Object.entries(SIZES)) {
  test(`Me: all 8 hats fit and the owl hat is worn (${tag})`, async ({ page }) => {
    await page.setViewportSize(vp);
    const costumes = { owlhat: true, ufohat: true, bat: true, pumpkin: true, tophat: true, witchhat: true, crown: true };
    await boot(page, save({ mig08: 1, costumes, costume: 'owlhat' }));
    await go(page, 'me');
    expect(await offscreen(page, 'me')).toEqual([]);
    // hat cards stay above the LOG IN / LOG OUT button (top at H - 255 in portrait, code review); the text above it vs row 1 on iPad is B11 (#15)
    const low = await page.evaluate(() => { const s = __game.scene.getScene('me'), H = __game.config.height, cam = s.cameras.main;
      return s.children.list.filter(o => o.type === 'Container' && o.input && o.width >= 90 && o.width <= 150 && o.y - cam.scrollY + o.height / 2 > (__psPortrait ? H - 255 : H)).length; });
    expect(low).toBe(0);
    // the worn owl is tinted green
    const tinted = await page.evaluate(() => __game.scene.getScene('me').children.list.some(o => o.texture && o.texture.key === 'owl' && o.tintTopLeft !== 0xffffff));
    expect(tinted).toBe(true);
    await go(page, 'title');
    noErrors(page);
  });
}

// QA B43: hats given by the migration are announced once as a gift
test('migration gifts are announced once on the first menu screen', async ({ page }) => {
  await boot(page, save({ mig08: 0, stars: { timmy: 3, moo: 3, sly: 3, hoot: 3 } })); // a save from before v0.8
  const seen = () => page.evaluate(() => { const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); });
    __game.scene.getScenes(true).forEach(s => walk(s.children.list)); return out.some(t => t.startsWith('A GIFT: Owl Hat')); });
  await expect.poll(async () => { await wait(page, 500); return seen(); }, { timeout: 60000 }).toBe(true);
  expect(await page.evaluate(() => __save.data.gifts08)).toBeUndefined();
  await wait(page, 4000);
  await boot(page, await page.evaluate(() => __save.data));
  await wait(page, 4000);
  expect(await seen()).toBe(false);
  noErrors(page);
});

// QA B42: the Royal Crown won with the Superstar sticker is named on the result panel
test('winning the 24th star announces the Royal Crown', async ({ page }) => {
  await boot(page, save({ mig08: 1, stars: { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 3, polandball: 3, ghost: 3, dragonboss: 2 } }));
  const notes = await winVs(page, { rival: await idx(page, 'dragonboss') });
  expect(notes.join(' ')).toContain('Royal Crown');
  noErrors(page);
});
