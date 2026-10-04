// Rotation around the end of a duel (QA B31): the result panel must follow the new orientation,
// and the rewards must be given exactly once.
const { test, expect } = require('@playwright/test');
const { boot, go, wait, fast, waitTurn, noErrors } = require('./helpers');

const texts = page => page.evaluate(() => {
  const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); });
  const b = __game && __game.scene.getScene('battle'); if (b) walk(b.children.list); return out;
});

async function rebuiltPanel(page) {
  await page.waitForFunction(() => window.__game && window.__game !== window.__oldGame && __game.scene.isActive('battle') && __game.scene.getScene('battle').shown, null, { timeout: 90000 });
  await fast(page); await wait(page, 1500);
}

test('B31: rotating during the winning move shows the result panel in the new layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await go(page, 'battle', { rival: 0 });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); });
  await waitTurn(page);
  const xp0 = await page.evaluate(() => __save.data.xp);
  await page.evaluate(() => { window.__oldGame = __game; const b = __game.scene.getScene('battle'); b.rival.hp = 1; b.playerMove(b.moves[0].k); });
  await page.setViewportSize({ width: 844, height: 390 });
  await rebuiltPanel(page);
  expect(await page.evaluate(() => window.__psPortrait)).toBe(false);
  expect(await page.evaluate(() => window.__psRotatePending)).toBeFalsy();
  expect(await texts(page)).toContain('YOU WIN!');
  const gain = await page.evaluate(() => __game.scene.getScene('battle').shown.gain);
  await wait(page, 3000);
  expect(await page.evaluate(() => __save.data.xp)).toBe(xp0 + gain);
  noErrors(page);
});

test('B31: rotating on the result panel keeps the panel and gives no second reward', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await go(page, 'battle', { rival: 0 });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 90000 }).toBe(true);
  await wait(page, 3000);
  const xp1 = await page.evaluate(() => __save.data.xp);
  await page.evaluate(() => { window.__oldGame = __game; });
  await page.setViewportSize({ width: 800, height: 1280 });
  await rebuiltPanel(page);
  expect(await page.evaluate(() => window.__psPortrait)).toBe(true);
  const t = await texts(page);
  expect(t).toContain('YOU WIN!');
  expect(t).toContain('MAP');
  expect(await page.evaluate(() => PSAudio._want)).toBe('calm');
  await wait(page, 2000);
  expect(await page.evaluate(() => __save.data.xp)).toBe(xp1);
  noErrors(page);
});

// B35: rotating during the win / lose animation rebuilt the game before result() ran, so the rewards were lost
test('B35: rotating during the win animation still gives the rewards', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await go(page, 'battle', { rival: 0 });
  const xp0 = await page.evaluate(() => __save.data.xp);
  await page.evaluate(() => { window.__oldGame = __game; const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  await page.setViewportSize({ width: 800, height: 1280 });
  await rebuiltPanel(page);
  expect(await page.evaluate(() => __save.data.xp)).toBeGreaterThan(xp0);
  expect(await texts(page)).toContain('YOU WIN!');
  noErrors(page);
});
