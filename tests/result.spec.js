// The result screen must work in every battle mode (v0.7.5 shipped a crash in friend and Kraken duels).
const { test, expect } = require('@playwright/test');
const { boot, go, wait, noErrors } = require('./helpers');

const MODES = {
  campaign: { rival: 0 },
  campaignBoss: { rival: 3 },                       // Professor Hoot (boss: true)
  friendJack: { fjack: { level: 3 }, ownerName: 'Max' },
  kraken: { boss: true },
};

for (const [name, data] of Object.entries(MODES)) {
  for (const won of [true, false]) {
    test(`result screen: ${name} ${won ? 'win' : 'lose'}`, async ({ page }) => {
      await boot(page);
      await go(page, 'battle', data);
      const xp0 = await page.evaluate(() => __save.data.xp);
      await page.evaluate(won => {
        const b = __game.scene.getScene('battle');
        if (b._pick) b._pick(null);                  // close the booster picker if it is open
        if (won) b.rival.hp = 0; else b.hero.hp = 0;
        b.finish(won);
      }, won);
      await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __save.data.xp); }, { timeout: 90000 }).toBeGreaterThan(xp0);
      noErrors(page);
    });
  }
}

// B33: the Kraken counts daily tries on the Weekly Boss screen, so its result must not offer a direct REMATCH
test('B33: Kraken result sends the player to the Weekly Boss screen', async ({ page }) => {
  await boot(page);
  await go(page, 'battle', { boss: true });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  const labels = () => page.evaluate(() => {
    const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); });
    walk(__game.scene.getScene('battle').children.list); return out;
  });
  await expect.poll(async () => { await wait(page, 500); return (await labels()).includes('BOSS'); }, { timeout: 90000 }).toBe(true);
  expect(await labels()).not.toContain('REMATCH');
  noErrors(page);
});
