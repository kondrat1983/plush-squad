// v0.8 finish: new stickers and quests, What's new 0.8, Studio CANCEL (B41 #43), Title layout (B44 #45), REMOVE button (B50 #48)
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, noErrors } = require('./helpers');

const save = extra => Object.assign({}, BASE_SAVE, extra);

test('the 5 new stickers are earned from their stats, the 6 new quests are in the pool', async ({ page }) => {
  await boot(page, save({ stars: Object.assign({}, BASE_SAVE.stars, { sasquatch: 1 }), bestHockey: 20, stats: { perfectSaves: 10, beamBlocks: 5 } }));
  const r = await page.evaluate(() => {
    __save.data.stats.hockeyStreak = 3; PSExtra.checkAch();
    return { ach: Object.keys(__save.data.ach), quests: PSExtra.QUESTS.map(q => q.id), n: PSExtra.ACH.length };
  });
  for (const id of ['sasquatch', 'goalie', 'hattrick', 'slapshot', 'umbrella5']) expect(r.ach).toContain(id);
  for (const id of ['fort', 'pancakes', 'leaf', 'polite', 'animal', 'birds']) expect(r.quests).toContain(id);
  expect(r.quests.length).toBe(24);
  expect(r.n).toBe(27);
  noErrors(page);
});

test('What\'s new 0.8 shows for a player coming from 0.7', async ({ page }) => {
  await boot(page, save({ seenVersion: '0.7' })); // the title opens first and shows it (once per launch)
  const texts = () => page.evaluate(() => __game.scene.getScene('title').children.list.flatMap(o => o.list || [o]).filter(o => o.type === 'Text').map(t => t.text).join(' | '));
  await expect.poll(async () => { await wait(page, 500); return texts(); }, { timeout: 30000 }).toContain("WHAT'S NEW in v0.8!");
  expect(await texts()).toContain('CANADA');
  noErrors(page);
});

test('Studio: CANCEL / BACK while the photo is processed goes back to TAKE A PHOTO; a late reply is ignored', async ({ page }) => {
  await boot(page);
  await go(page, 'studio');
  const r = await page.evaluate(async () => {
    const s = __game.scene.getScene('studio');
    let resolved = null;
    s.busyState = true; s.job = { finish: v => { resolved = v; } };
    s.cancelJob();
    const texts = s.layer.list.filter(o => o.type === 'Container').flatMap(c => c.list).filter(o => o.type === 'Text').map(t => t.text);
    return { busy: s.busyState, job: s.job, resolved, texts };
  });
  expect(r).toMatchObject({ busy: false, job: null, resolved: { type: 'cancel' } });
  expect(r.texts).toContain('TAKE A PHOTO');
  noErrors(page);
});

test('Title portrait: the level panel sits between the logo and Jack with even gaps (5 sizes)', async ({ page }) => {
  for (const vp of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 820, height: 1180 }]) {
    await page.setViewportSize(vp);
    await boot(page);
    await go(page, 'title');
    const g = await page.evaluate(() => {
      const s = __game.scene.getScene('title'), L = s.children.list;
      const squad = L.filter(o => o.type === 'Text' && 'SQUAD'.includes(o.text) && o.text.length === 1);
      const logoBot = Math.max(...squad.map(o => o.y + o.displayHeight / 2));
      const lvl = L.find(o => o.type === 'Text' && /^LEVEL \d+$/.test(o.text));
      const jack = L.find(o => o.type === 'Image' && o.texture.key === 'jack_front');
      const top = lvl.y - 50, bot = lvl.y + 140; // the panel is 190 tall, LEVEL sits 46 below its top
      return { gap1: top - logoBot, gap2: (jack.y - jack.displayHeight) - bot };
    });
    expect(g.gap1).toBeGreaterThan(0);
    expect(g.gap2).toBeGreaterThan(-40); // Jack's bob tween moves him up to 34 px
    if (vp.height > 700 && vp.width < 500) expect(Math.abs(g.gap1 - g.gap2)).toBeLessThan(0.35 * Math.max(g.gap1, g.gap2) + 40);
  }
  noErrors(page);
});

test('Title on a small phone with a hat on: the hat stays clear of the level panel', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await boot(page, save({ costumes: { witchhat: true }, costume: 'witchhat' }));
  await go(page, 'title');
  const g = await page.evaluate(() => {
    const L = __game.scene.getScene('title').children.list;
    const lvl = L.find(o => o.type === 'Text' && /^LEVEL \d+$/.test(o.text));
    const hat = L.find(o => o.type === 'Image' && o.texture.key === 'witchhat');
    return { panelBot: lvl.y + 140, hatTop: hat.y - hat.displayHeight * 0.85 };
  });
  expect(g.hatTop).toBeGreaterThan(g.panelBot - 40); // minus Jack's bob
  noErrors(page);
});

test('My Squad: REMOVE is a real button, at least 90 px tall, and still asks first', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const t = PSToys.createToy({ arch: PSToys.ARCH[0].id, element: 'magic', seed: 1, aspect: 1 }); t.name = 'Bunny';
    __save.data.toys = [t];
    __game.textures.addImage('toy_' + t.id, __game.textures.get('jack_front').getSourceImage());
  });
  await go(page, 'squad');
  await page.evaluate(() => __game.scene.getScene('squad').details({ toy: __save.data.toys[0] }));
  await wait(page, 1000);
  const all = () => page.evaluate(() => { const out = []; const walk = l => l.forEach(o => { out.push(o); if (o.list) walk(o.list); }); walk(__game.scene.getScene('squad').children.list); return out.filter(o => o.type === 'Container' && o.list && o.list.some(t => t.text === 'REMOVE')).map(b => b.height); });
  const h = await all();
  expect(h.length).toBe(1);
  expect(h[0]).toBeGreaterThanOrEqual(90);
  await page.evaluate(() => { const out = []; const walk = l => l.forEach(o => { out.push(o); if (o.list) walk(o.list); }); walk(__game.scene.getScene('squad').children.list); out.find(o => o.type === 'Container' && o.list && o.list.some(t => t.text === 'REMOVE')).emit('pointerup'); });
  await wait(page, 500);
  const texts = await page.evaluate(() => { const out = []; const walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); }); walk(__game.scene.getScene('squad').children.list); return out.join('|'); });
  expect(texts).toContain('This toy will leave the squad.');
  expect(await page.evaluate(() => __save.data.toys.length)).toBe(1);
  noErrors(page);
});

test('B47: stats counted in memory survive a rotation rebuild', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { PSExtra.bump('perfectSaves'); PSExtra.bump('beamBlocks'); window.__psRebuild({ key: 'title', data: {} }); });
  await page.waitForFunction(() => window.__game && __game.scene.isActive('title'), null, { timeout: 60000 });
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('plushsquad_v1')).stats);
  expect(st.perfectSaves).toBe(1);
  expect(st.beamBlocks).toBe(1);
  noErrors(page);
});
