// Every main scene opens without a JS error, in portrait and landscape.
const { test } = require('@playwright/test');
const { boot, go, noErrors } = require('./helpers');

const SCENES = [['map', {}], ['squad', {}], ['gacha', {}], ['me', {}], ['album', {}], ['quests', {}], ['catch', { world: 0 }], ['bedtime', {}], ['parents', {}], ['title', {}]];

for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 1024, height: 768 }]]) {
  test(`smoke: all scenes open (${name})`, async ({ page }) => {
    await page.setViewportSize(vp);
    await boot(page);
    for (const [k, d] of SCENES) await go(page, k, d);
    noErrors(page);
  });
}
