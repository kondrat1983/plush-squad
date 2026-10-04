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
