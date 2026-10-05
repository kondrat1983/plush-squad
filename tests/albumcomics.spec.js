// v0.8.1: the Sticker Album has a STICKERS / COMICS switch; seen comics play again and come back to the album (#54)
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, offscreen, noErrors } = require('./helpers');

const texts = (page, key) => page.evaluate(k => { const out = []; const walk = l => l.forEach(o => { if (o.type === 'Text' && o.visible) out.push(o.text); if (o.list) walk(o.list); }); walk(__game.scene.getScene(k).children.list); return out.join(' | '); }, key);

test('COMICS tab: locked before Canada, plays again after, DONE! goes back to the album', async ({ page }) => {
  await boot(page, Object.assign({}, BASE_SAVE, { comics: {} }));
  await go(page, 'album');
  expect(await texts(page, 'album')).toContain('STICKERS');
  await go(page, 'album', { tab: 'comics' });
  let t = await texts(page, 'album');
  expect(t).toContain('Reach Canada to unlock');
  expect(await offscreen(page, 'album')).toEqual([]);
  await page.evaluate(() => { __save.data.comics = { canada: true }; });
  await go(page, 'album', { tab: 'comics' });
  t = await texts(page, 'album');
  expect(t).toContain('Welcome to Canada!');
  await page.evaluate(() => { const s = __game.scene.getScene('album'); s.children.list.find(o => o.type === 'Container' && o.input && o.list.some(x => x.text === 'Welcome to Canada!')).emit('pointerup'); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __game.scene.getScenes(true).map(s => s.scene.key)); }, { timeout: 30000 }).toEqual(['comic']);
  await page.evaluate(() => __game.scene.getScene('comic').toTitle());
  expect(await texts(page, 'comic')).toContain('DONE!');
  await page.evaluate(() => { const c = __game.scene.getScene('comic'); c.children.list.find(o => o.type === 'Container' && o.list.some(t => t.text === 'DONE!')).emit('pointerup'); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __game.scene.getScenes(true).map(s => s.scene.key)); }, { timeout: 30000 }).toEqual(['album']);
  expect(await texts(page, 'album')).toContain('Tap a comic to watch it again');
  noErrors(page);
});

test('the switch and the sticker pages fit on 5 sizes', async ({ page }) => {
  for (const vp of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 820, height: 1180 }, { width: 1180, height: 820 }]) {
    await page.setViewportSize(vp);
    await boot(page);
    await go(page, 'album');
    expect(await offscreen(page, 'album')).toEqual([]);
    // the page buttons stay above the switch
    const r = await page.evaluate(() => {
      const L = __game.scene.getScene('album').children.list.filter(o => o.type === 'Container' && o.input);
      const sw = L.filter(o => o.list.some(t => t.text === 'STICKERS' || t.text === 'COMICS'));
      const pg = L.filter(o => o.list.some(t => t.text === '◀' || t.text === '▶'));
      return { swTop: Math.min(...sw.map(o => o.y - 50)), pgBot: pg.length ? Math.max(...pg.map(o => o.y + 50)) : 0 };
    });
    expect(r.pgBot).toBeLessThanOrEqual(r.swTop);
  }
  noErrors(page);
});
