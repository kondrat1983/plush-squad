// v0.8.2: progress reaches the cloud even when iOS closes the app before the 15 s push
const { test, expect } = require('@playwright/test');
const { boot, noErrors } = require('./helpers');

const fakeSb = cloud => `(() => {
  const log = window.__sbLog = [];
  const q = t => ({ select() { return this; }, eq() { return this; }, in() { return this; }, delete() { log.push(t + ':delete'); return this; },
    maybeSingle: async () => ({ data: ${cloud} }), then: r => r({ data: [] }),
    upsert: async v => { log.push(t + ':upsert'); return {}; }, update() { log.push(t + ':update'); return this; } });
  PSNet.sb = { from: q }; PSNet.user = { id: 'u1', name: 'tester' };
})()`;

test('catchUp pushes a newer local save, skips when the cloud is newer or the save is not this account', async ({ page }) => {
  await boot(page);
  const run = (cloud, owner, savedAt) => page.evaluate(async ([js, owner, savedAt]) => {
    eval(js); __save.data.owner = owner; __save.data.savedAt = savedAt; await PSNet.catchUp(); return __sbLog.includes('saves:upsert');
  }, [fakeSb(cloud), owner, savedAt]);
  expect(await run('null', 'u1', 5)).toBe(true);
  expect(await run('{ data: { savedAt: 1 } }', 'u1', 5)).toBe(true);
  expect(await run('{ data: { savedAt: 9 } }', 'u1', 5)).toBe(false);
  expect(await run('null', 'someone', 5)).toBe(false);
  noErrors(page);
});

test('a pending push goes out at once when the page is hidden (app switch on iOS)', async ({ page }) => {
  await boot(page);
  const pushed = await page.evaluate(async js => {
    eval(js); __save.data.owner = 'u1'; __save.store();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 200));
    return __sbLog.includes('saves:upsert');
  }, fakeSb('null'));
  expect(pushed).toBe(true);
  noErrors(page);
});

test('login on a fresh device: the cloud progress survives the rebuild that follows (it was overwritten by the empty save)', async ({ page }) => {
  await boot(page, { xp: 0, wins: 0, toys: [], stars: {}, hero: 'jack' });
  await page.evaluate(async js => {
    eval(js); const cloud = { xp: 900, wins: 9, toys: [], stars: { teddy: 3 }, savedAt: 5 };
    PSNet.sb.from = t => ({ select() { return this; }, eq() { return this; }, in() { return this; }, maybeSingle: async () => ({ data: { data: cloud } }) });
    await PSNet.reconcile();
    window.__psRebuild({ key: 'title', data: {} });
  }, fakeSb('null'));
  await page.waitForFunction(() => window.__game && __game.scene.isActive('title'), null, { timeout: 60000 });
  const r = await page.evaluate(() => ({ mem: __save.data.xp, ls: JSON.parse(localStorage.getItem('plushsquad_v1')).xp, owner: __save.data.owner }));
  expect(r).toEqual({ mem: 900, ls: 900, owner: 'u1' });
  noErrors(page);
});
