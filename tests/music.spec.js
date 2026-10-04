// Music: lullaby in menus, 'battle' in normal duels, 'boss' with crowned rivals and the Kraken, silence for the result jingle.
const { test, expect } = require('@playwright/test');
const { boot, go, wait, waitTurn, noErrors } = require('./helpers');

test('music track follows the scene', async ({ page }) => {
  await boot(page, Object.assign({}, require('./helpers').BASE_SAVE, { muted: false }));
  await page.evaluate(() => { PSAudio.init(); PSAudio.startMusic(); });
  const track = () => page.evaluate(() => PSAudio._track);
  await go(page, 'map'); expect(await track()).toBe('calm');
  await go(page, 'battle', { rival: 0 }); expect(await track()).toBe('battle');
  const hoot = await page.evaluate(() => __RIVALS.findIndex(r => r.id === 'hoot'));
  await go(page, 'battle', { rival: hoot }); expect(await track()).toBe('boss');
  await go(page, 'battle', { boss: true }); expect(await track()).toBe('boss');
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  await wait(page, 500); expect(await track()).toBe(null);
  await expect.poll(async () => { await wait(page, 500); return track(); }, { timeout: 90000 }).toBe('calm');
  await go(page, 'title'); expect(await track()).toBe('calm');
  noErrors(page);
});

test('every track schedules notes without errors', async ({ page }) => {
  await boot(page);
  const n = await page.evaluate(async () => {
    const A = PSAudio, out = {};
    for (const name of Object.keys(A.TRACKS)) {
      const c = new OfflineAudioContext(1, 44100 * 4, 44100);
      Object.assign(A, { ctx: c, noiseBuf: c.createBuffer(1, 44100, 44100) });
      A.master = c.createGain(); A.master.connect(c.destination);
      A.musicGain = c.createGain(); A.musicGain.connect(A.master);
      A._bus = c.createGain(); A._bus.connect(A.musicGain);
      const T = A.TRACKS[name], sp = 60 / T.bpm / T.div;
      for (let i = 0; i < T.len; i++) T.play(A, i, 0.05 + (i % 16) * sp * 0.01, sp);  // every step once
      const buf = await c.startRendering(); let peak = 0; const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
      out[name] = peak;
    }
    return out;
  });
  for (const [k, peak] of Object.entries(n)) expect(peak, k).toBeGreaterThan(0);
  noErrors(page);
});

// B34: turning the device rebuilds the game; the duel track must keep playing, not restart from bar 1
test('B34: rotating between turns does not restart the duel music', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page, Object.assign({}, require('./helpers').BASE_SAVE, { muted: false }));
  await page.evaluate(() => { PSAudio.init(); PSAudio.startMusic(); });
  await go(page, 'battle', { rival: 0 });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); });
  await waitTurn(page);
  expect(await page.evaluate(() => PSAudio._track)).toBe('battle');
  await page.evaluate(() => { window.__switches = []; const f = PSAudio._switch; PSAudio._switch = function (n) { __switches.push(n); return f.apply(this, arguments); }; });
  await page.evaluate(() => { window.__oldGame = __game; });
  await page.setViewportSize({ width: 800, height: 1280 });
  await page.waitForFunction(() => window.__game !== window.__oldGame && __game.scene.isActive('battle'), null, { timeout: 60000 });
  await wait(page, 2000);
  expect(await page.evaluate(() => __switches)).toEqual([]);
  expect(await page.evaluate(() => PSAudio._track)).toBe('battle');
  noErrors(page);
});
