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

// B36: a rotation held during the final move waits until the stars, XP count and LEVEL UP! have played
test('B36: a held rotation is applied after the result celebration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await go(page, 'battle', { rival: 0 });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); });
  await waitTurn(page);
  await page.evaluate(() => {
    window.__oldGame = __game; window.__t = {};
    const b = __game.scene.getScene('battle'), r = b.result.bind(b);
    b.result = w => { __t.result = performance.now(); r(w); };
    const iv = setInterval(() => { if (window.__game !== window.__oldGame) { __t.rebuild = performance.now(); clearInterval(iv); } }, 20);
    b.rival.hp = 1; b.playerMove(b.moves[0].k);
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await rebuiltPanel(page);
  const t = await page.evaluate(() => __t);
  expect(t.rebuild - t.result, 'the rebuild waits for the celebration').toBeGreaterThan(2000);
  expect(await page.evaluate(() => window.__psPortrait)).toBe(false);
  noErrors(page);
});

// B37: sticker toasts waiting to be shown were scheduled on the boot scene of a rebuilt game and lost
test('B37: a sticker toast survives a rotation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await go(page, 'map');
  await page.evaluate(() => { window.__oldGame = __game; const a = PSExtra.ACH.find(x => !__save.data.ach || !__save.data.ach[x.id]); a.ok = () => true; PSExtra.checkAch(); });
  await page.setViewportSize({ width: 800, height: 1280 });
  await page.waitForFunction(() => window.__game && window.__game !== window.__oldGame && __game.scene.getScenes(true).some(s => s.scene.key !== 'boot'), null, { timeout: 90000 });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => {
    const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); });
    __game.scene.getScenes(true).forEach(s => walk(s.children.list)); return out.some(t => t.startsWith('NEW STICKER'));
  }); }, { timeout: 60000 }).toBe(true);
  noErrors(page);
});

// code review of B36: a sticker earned on the final move (with a held rotation) must be shown in full, not cut off by the rebuild
test('B37: a sticker earned on the final move survives the held rotation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await go(page, 'battle', { rival: 0 });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); });
  await waitTurn(page);
  await page.evaluate(() => {
    window.__oldGame = __game; window.__t = {};
    const a = PSExtra.ACH.find(x => !__save.data.ach || !__save.data.ach[x.id]); a.ok = () => true;
    const iv = setInterval(() => { const g = window.__game; if (!g) return;
      if (g !== window.__oldGame && !__t.rebuild) __t.rebuild = performance.now();
      const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); });
      g.scene.getScenes(true).forEach(s => walk(s.children.list));
      if (out.some(t => t.startsWith('NEW STICKER'))) { if (!__t.seen) __t.seen = performance.now(); if (g !== window.__oldGame) __t.seenNew = true; }
      if (__t.rebuild && (__t.seenNew || performance.now() - __t.rebuild > 20000)) clearInterval(iv); }, 50);
    const b = __game.scene.getScene('battle'); b.rival.hp = 1; b.playerMove(b.moves[0].k);
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await rebuiltPanel(page);
  await wait(page, 4000);
  const t = await page.evaluate(() => __t);
  expect(t.seen, 'the toast showed').toBeTruthy();
  // either the whole toast (about 3.1 s) played before the rebuild, or it showed again after it
  expect(t.seenNew || t.rebuild - t.seen > 2800, JSON.stringify(t)).toBe(true);
  noErrors(page);
});

// code review of B37: a screen that restarts itself right after earning a sticker must not swallow the toast
test('B37: a sticker toast survives a screen restart', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page);
  await go(page, 'map');
  await page.evaluate(() => {
    window.__seen = false;
    const a = PSExtra.ACH.find(x => !__save.data.ach || !__save.data.ach[x.id]); a.ok = () => true; PSExtra.checkAch();
    const m = __game.scene.getScene('map'); m.scene.restart({ world: 0 });
    setTimeout(() => __game.scene.getScene('map').scene.restart({ world: 0 }), 50);
    const iv = setInterval(() => { const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); });
      __game.scene.getScenes(true).forEach(s => walk(s.children.list)); if (out.some(t => t.startsWith('NEW STICKER'))) { window.__seen = true; clearInterval(iv); } }, 100);
  });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => window.__seen); }, { timeout: 60000 }).toBe(true);
  noErrors(page);
});
