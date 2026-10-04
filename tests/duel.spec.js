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

test('B30: the refund works again in the next duel of the same session', async ({ page }) => {
  await boot(page, Object.assign({}, BASE_SAVE, { boosts: { fort: 1 } }));
  for (let i = 0; i < 2; i++) {
    await go(page, 'battle', { rival: 0 });
    await page.evaluate(() => __game.scene.getScene('battle')._pick(__BOOSTS.find(x => x.id === 'fort')));
    await wait(page, 1500);
    await page.evaluate(BACK); await wait(page, 1500);
    expect(await page.evaluate(() => __save.data.boosts.fort || 0), 'duel ' + (i + 1)).toBe(1);
  }
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

// owner's device notes (4 Oct 2026): greyed cards showed strips (see-through layers), icons almost spilled out of the card
test('move cards: greyed cards stay opaque, icons inside the card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await go(page, 'battle', { rival: 0 });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); });
  await waitTurn(page);
  const r = await page.evaluate(() => {
    const b = __game.scene.getScene('battle');
    b.hero.used[b.moves.find(m => m.uses).k] = 99; b.setCards(false);
    return b.moves.map(m => { const c = m.card, ic = c.list[1]; return { alpha: c.alpha, top: ic.y - ic.displayHeight / 2, cardTop: -c.height / 2 }; });
  });
  for (const c of r) {
    expect(c.alpha).toBe(1);
    expect(c.top).toBeGreaterThanOrEqual(c.cardTop);
  }
  noErrors(page);
});

// B39: the Warm Milk icon is taller than wide and stuck out of its slot in the portrait grid
test('B39: tall move icons stay inside their slot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, Object.assign({}, BASE_SAVE, { boosts: { milk: 1 } }));
  await go(page, 'battle', { rival: 0 });
  await page.waitForFunction(() => typeof __game.scene.getScene('battle')._pick === 'function', null, { timeout: 60000 }); // picker built (flaky under load, QA v0.8 part 1)
  await page.evaluate(() => __game.scene.getScene('battle')._pick(__BOOSTS.find(x => x.id === 'milk')));
  await waitTurn(page);
  const r = await page.evaluate(() => { const c = __game.scene.getScene('battle').moves.find(m => m.icon === 'milk').card, ic = c.list[1]; return { top: ic.y - ic.displayHeight / 2, cardTop: -c.height / 2, h: ic.displayHeight, title: c.list[2].y - c.list[2].displayHeight / 2, bottom: ic.y + ic.displayHeight / 2 }; });
  expect(r.top).toBeGreaterThanOrEqual(r.cardTop + 4);
  expect(r.bottom).toBeLessThanOrEqual(r.title);
  noErrors(page);
});
