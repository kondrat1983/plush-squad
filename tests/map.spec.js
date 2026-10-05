// Map start world (B04): fresh players start in Pillow Hills even during Halloween; the last world looked at is remembered.
const { test, expect } = require('@playwright/test');
const { boot, go, noErrors } = require('./helpers');

test('B04: fresh player starts in Pillow Hills during the Halloween event', async ({ page }) => {
  await boot(page, { muted: true, seenVersion: '0.7' }, '&halloween');
  await go(page, 'map');
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(0);
  noErrors(page);
});

test('B04: map reopens on the last world looked at', async ({ page }) => {
  await boot(page, undefined, '&halloween');
  await go(page, 'map', { world: 3 }); await go(page, 'title'); await go(page, 'map'); // 3 = Spooky since v0.8 (Canada is 2)
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(3);
  noErrors(page);
});
