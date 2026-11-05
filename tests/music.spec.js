// Music: 'hop' main theme on the title, the world's quiet track on the map, lullaby in other menus, 'battle' in normal duels, 'boss' with crowned rivals and the Kraken, silence for the result jingle.
const { test, expect } = require('@playwright/test');
const { boot, go, wait, waitTurn, noErrors } = require('./helpers');

test('music track follows the scene', async ({ page }) => {
  await boot(page, Object.assign({}, require('./helpers').BASE_SAVE, { muted: false }));
  await page.evaluate(() => { PSAudio.init(); PSAudio.startMusic(); });
  const track = () => page.evaluate(() => PSAudio._track);
  await go(page, 'map', { world: 0 }); expect(await track()).toBe('battleMap');
  await go(page, 'squad'); expect(await track()).toBe('calm');
  await go(page, 'battle', { rival: 0 }); expect(await track()).toBe('battle');
  const robot = await page.evaluate(() => __RIVALS.findIndex(r => r.id === 'robot'));
  await go(page, 'battle', { rival: robot }); expect(await track()).toBe('space');
  const hoot = await page.evaluate(() => __RIVALS.findIndex(r => r.id === 'hoot'));
  await go(page, 'battle', { rival: hoot }); expect(await track()).toBe('boss');
  await go(page, 'battle', { boss: true }); expect(await track()).toBe('boss');
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  await wait(page, 500); expect(await track()).toBe(null);
  await expect.poll(async () => { await wait(page, 500); return track(); }, { timeout: 90000 }).toBe('calm');
  await go(page, 'title'); expect(await track()).toBe('hop');
  await go(page, 'map', { world: 1 }); expect(await track()).toBe('spaceMap');
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

// map versions: the world's tune, slower, without drums or noise hits
test('map versions are soft copies of the duel tracks', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const A = PSAudio, out = {};
    for (const k of ['battle', 'space', 'north', 'sea', 'garden', 'parade', 'pixel']) {
      const T = A.TRACKS[k], M = A.TRACKS[k + 'Map'];
      out[k] = [M.play === T.play, M.bpm < T.bpm, M.gain < T.gain, M.soft === true];
    }
    // a soft space track makes no noise sources (drums, hats); its notes still play
    const c = new OfflineAudioContext(1, 44100, 44100);
    Object.assign(A, { ctx: c, noiseBuf: c.createBuffer(1, 44100, 44100) });
    A._bus = c.createGain(); A._bus.connect(c.destination);
    let noise = 0, notes = 0;
    const src = c.createBufferSource.bind(c), osc = c.createOscillator.bind(c);
    c.createBufferSource = () => { noise++; return src(); };
    c.createOscillator = () => { notes++; return osc(); };
    A._soft = true;
    for (let i = 0; i < 256; i++) A.TRACKS.spaceMap.play(A, i, 0.01, 0.1);
    A._soft = false;
    return { out, noise, notes };
  });
  for (const v of Object.values(r.out)) expect(v).toEqual([true, true, true, true]);
  expect(r.noise).toBe(0);
  expect(r.notes).toBeGreaterThan(100);
  noErrors(page);
});

// QA B79: every world has its duel track and a map version (worlds 2..6 are not opened in the scene test above)
test('B79: every world maps to an existing duel track and map track', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => __WORLD_TRACK.map(k => [k, !!PSAudio.TRACKS[k], !!PSAudio.TRACKS[k + 'Map']]));
  expect(r.map(x => x[0])).toEqual(['battle', 'space', 'north', 'sea', 'garden', 'parade', 'pixel', 'battle']); // hills, space, canada, ocean, veggie, countryballs, pixel land, spooky
  for (const [k, duel, map] of r) expect([k, duel, map]).toEqual([k, true, true]);
  noErrors(page);
});

// v1.2.3: browsers need a tap before any sound; the first tap anywhere on the title starts the Hop theme
test('first tap on the title starts the music', async ({ page }) => {
  await boot(page, Object.assign({}, require('./helpers').BASE_SAVE, { muted: false }));
  await go(page, 'title');
  expect(await page.evaluate(() => !!PSAudio._timer)).toBe(false);
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.97);
  await expect.poll(() => page.evaluate(() => [!!PSAudio._timer, PSAudio._track])).toEqual([true, 'hop']);
  expect(await page.evaluate(() => __game.scene.isActive('title'))).toBe(true);
  noErrors(page);
});
