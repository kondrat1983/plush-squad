// v0.8 Space rework (docs/gdd/0.8-space-rework.md): The Blips and The Mothership replace Polandball and the Dragon Boss
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, noErrors } = require('./helpers');

const save = extra => Object.assign({}, BASE_SAVE, extra);
const SPACE_OPEN = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 1, polandball: 1, ghost: 1 };
const idx = (page, id) => page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);
const allText = page => page.evaluate(() => { const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); });
  __game.scene.getScenes(true).forEach(s => walk(s.children.list)); return out.join(' | '); });
const winVs = async (page, i) => {
  await go(page, 'battle', { rival: i });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 90000 }).toBe(true);
};

test('Space map and duels show The Blips and The Mothership, never Polandball or the Dragon Boss', async ({ page }) => {
  await boot(page, save({ mig08: 1, stars: SPACE_OPEN }));
  await go(page, 'map', { world: 1 });
  let t = await allText(page);
  expect(t).toContain('The Blips');
  expect(t).not.toMatch(/Polandball|Dragon Boss/);
  for (const [id, name, tex, track] of [['polandball', 'BLIPS', 'aliens', 'battle'], ['dragonboss', 'MOTHERSHIP', 'mothership', 'boss']]) {
    await go(page, 'battle', { rival: await idx(page, id) });
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); });
    await wait(page, 1500);
    t = await allText(page);
    expect(t).toContain(name);
    expect(t).not.toMatch(/Polandball|POLANDBALL|DRAGON BOSS|Dragon Boss:/);
    expect(await page.evaluate(() => __game.scene.getScene('battle').rival.spr.texture.key)).toBe(tex);
    expect(await page.evaluate(() => PSAudio._want)).toBe(track);
  }
  noErrors(page);
});

test('beating The Mothership gives the UFO Hat and the Saucer Champ sticker; Dragon vs Dragon is a friend\'s Jack', async ({ page }) => {
  await boot(page, save({ mig08: 1, stars: SPACE_OPEN }));
  await winVs(page, await idx(page, 'dragonboss'));
  let d = await page.evaluate(() => __save.data);
  expect(d.costumes.ufohat).toBe(true);
  expect(d.ach.ufo).toBeTruthy();
  expect(d.ach.dragon).toBeFalsy();
  expect(d.stats.motherWins).toBe(1);
  await go(page, 'battle', { fjack: { level: 3 }, ownerName: 'Max' });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__save.data.ach.dragon); }, { timeout: 90000 }).toBe(true);
  noErrors(page);
});

test('old saves keep their Space stars and stickers; Saucer Champ is not given for old Dragon Boss wins', async ({ page }) => {
  await boot(page, save({ stars: Object.assign({}, SPACE_OPEN, { dragonboss: 3 }), ach: { polandball: 1, dragon: 1 } }));
  const d = await page.evaluate(() => { PSExtra.checkAch(); return __save.data; });
  expect(d.ach).toMatchObject({ polandball: 1, dragon: 1 });
  expect(d.ach.ufo).toBeFalsy();
  expect(d.stars.dragonboss).toBe(3);
  await go(page, 'album');
  const t = await allText(page);
  expect(t).toContain('Beat The Blips');
  expect(t).not.toMatch(/Polandball|Giant Dragon Boss/);
  noErrors(page);
});

// QA B06 + code review of v0.8 part 2: 22+ stickers do not fit one screen, so the album pages
const SIZES = { 'iPhone SE': { width: 375, height: 667 }, 'iPhone 14': { width: 390, height: 844 }, 'iPad portrait': { width: 768, height: 1024 }, 'iPad landscape': { width: 1024, height: 768 }, 'phone landscape': { width: 844, height: 390 } };
for (const [tag, vp] of Object.entries(SIZES)) {
  test(`Sticker Album pages fit the screen and show every sticker (${tag})`, async ({ page }) => {
    await page.setViewportSize(vp);
    await boot(page, save({}), '&halloween');
    await page.evaluate(() => { PSExtra.ACH.forEach(a => __save.data.ach[a.id] = 1); });
    await go(page, 'album');
    const seen = new Set();
    for (let p = 0; p < 6; p++) {
      const r = await page.evaluate(() => { const s = __game.scene.getScene('album'), H = __game.config.height, cam = s.cameras.main, out = { names: [], low: 0 };
        s.children.list.forEach(o => { if (o.type !== 'Container') return; const t = o.list.filter(x => x.type === 'Text').map(x => x.text); if (t.length === 2) { out.names.push(t[0]); if (o.y - cam.scrollY + o.height / 2 > H + 2 || o.y - cam.scrollY - 120 > H) out.low++; } });
        return out; });
      r.names.forEach(n => seen.add(n));
      expect(r.low, 'sticker cards below the screen').toBe(0);
      const next = await page.evaluate(() => { const s = __game.scene.getScene('album'); const b = s.children.list.find(o => o.type === 'Container' && o.input && o.list.some(x => x.text === '▶')); if (!b) return false; b.emit('pointerup'); return true; });
      if (!next) break;
      await wait(page, 1500);
    }
    expect(seen.size).toBe(await page.evaluate(() => PSExtra.ACH.length));
    noErrors(page);
  });
}
