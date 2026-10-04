// Duel rules that broke before: booster refund (B30), Kraken pep (B12), picker layout (B01).
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, waitTurn, offscreen, noErrors } = require('./helpers');

const BACK = () => { const bt = __game.scene.getScene('battle'); const back = bt.children.list.find(o => o.type === 'Container' && o.x === 80 && o.y === 80 && o.input); back.emit('pointerup'); };

test('B30: BACK before any move gives the booster back', async ({ page }) => {
  await boot(page, Object.assign({}, BASE_SAVE, { boosts: { fort: 1 } }));
  await go(page, 'battle', { rival: 0 });
  await page.evaluate(() => __game.scene.getScene('battle')._pick(__BOOSTS.find(x => x.id === 'fort')));
  await wait(page, 1500);
  expect(await page.evaluate(() => __save.data.boosts.fort || 0)).toBe(0);
  await page.evaluate(BACK); await wait(page, 1500);
  expect(await page.evaluate(() => __save.data.boosts.fort || 0)).toBe(1);
  noErrors(page);
});

test('B30: after a move the booster is spent', async ({ page }) => {
  await boot(page, Object.assign({}, BASE_SAVE, { boosts: { fort: 1 } }));
  await go(page, 'battle', { rival: 0 });
  await page.evaluate(() => __game.scene.getScene('battle')._pick(__BOOSTS.find(x => x.id === 'fort')));
  await wait(page, 3000);
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.playerMove(b.moves[0].k); });
  await wait(page, 1000);
  await waitTurn(page, 120000);
  await page.evaluate(BACK); await wait(page, 1500);
  expect(await page.evaluate(() => __save.data.boosts.fort || 0)).toBe(0);
  noErrors(page);
});

test('B12: Pillow Kraken always has 220 pep', async ({ page }) => {
  await boot(page, Object.assign({}, BASE_SAVE, { xp: 6000, diff: 'hard' }));
  await go(page, 'battle', { boss: true });
  expect(await page.evaluate(() => __game.scene.getScene('battle').rival.max)).toBe(220);
});

for (const [tag, vp] of [['iPad portrait', { width: 768, height: 1024 }], ['iPad landscape', { width: 1024, height: 768 }], ['phone landscape', { width: 844, height: 390 }], ['iPhone SE', { width: 375, height: 667 }]]) {
  test(`B01: booster picker with all 10 boosters fits (${tag})`, async ({ page }) => {
    await page.setViewportSize(vp);
    const all = Object.fromEntries(['breakfast', 'fort', 'milk', 'lucky', 'feathers', 'blizzard', 'moon', 'rocket', 'heart', 'superstar'].map(b => [b, 1]));
    await boot(page, Object.assign({}, BASE_SAVE, { boosts: all }));
    await go(page, 'battle', { rival: 0 });
    expect(await offscreen(page, 'battle')).toEqual([]);
    noErrors(page);
  });
}
