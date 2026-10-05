// v0.8 SLAPSHOT + SAVE IT! (docs/gdd/0.8-canada.md section 4). Headless Chromium runs at 2-3 fps, so the duel tests use
// the ?debug hook window.__psSaveAuto ('perfect' | 'good' | 'miss'); the timing itself is checked through __psJudgeSave.
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, waitTurn, noErrors } = require('./helpers');

const OPEN = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 3, polandball: 3, ghost: 3, dragonboss: 1, moose: 1, beaver: 1, mountie: 1 };
const idx = (page, id) => page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);

async function duel(page, id, diff = 'normal', stats = { saveSeen: 1 }) {
  await boot(page, Object.assign({}, BASE_SAVE, { diff, stars: OPEN, stats }));
  await page.evaluate(() => { window.B = () => __game.scene.getScene('battle'); });
  await go(page, 'battle', { rival: await idx(page, id) });
  await page.evaluate(() => { const b = B(); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page);
}
async function windUp(page) {
  await page.evaluate(() => {
    const b = B(), T = b.rival, m = b.rmoves.find(x => x.type === 'slapshot');
    m.dmg = [20, 20]; window.__cdone = false;
    b.busy = true; b.setCards(false); T.used[m.k] = (T.used[m.k] || 0) + 1; T.lastType = m.type;
    b.startCharge(m, T).then(() => { b.busy = false; b.setCards(true); window.__cdone = true; });
  });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => window.__cdone); }, { timeout: 60000 }).toBe(true);
}
// the hero waits a turn (a shield costs nothing to the rival); returns [hero pep lost, rival pep lost]
async function act(page, fn = () => B().playerMove('tickle')) {
  const hp0 = await page.evaluate(() => [B().hero.hp, B().rival.hp]);
  await page.evaluate(() => { B().impact = (orig => async function (t, d, ...r) { if (t === this.rival && !r[2]) d = 0; return orig.call(this, t, d, ...r); })(B().impact); });
  await page.evaluate(fn);
  await wait(page, 1000);
  await waitTurn(page, 120000);
  const hp1 = await page.evaluate(() => [B().hero.hp, B().rival.hp]);
  return [hp0[0] - hp1[0], hp0[1] - hp1[1]];
}

test('judgeSave follows the timing table', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => { const j = __psJudgeSave; return {
    n: [j(-100, 'normal'), j(470, 'normal'), j(480, 'normal'), j(879, 'normal'), j(880, 'normal'), j(1280, 'normal'), j(1281, 'normal')],
    h: [j(559, 'hard'), j(560, 'hard'), j(810, 'hard'), j(1060, 'hard'), j(1061, 'hard')],
    e: [j(-700, 'easy'), j(0, 'easy'), j(2300, 'easy'), j(2301, 'easy')],
  }; });
  expect(r.n).toEqual(['early', 'early', 'good', 'good', 'perfect', 'perfect', 'late']);
  expect(r.h).toEqual(['early', 'good', 'perfect', 'perfect', 'late']);
  expect(r.e).toEqual(['perfect', 'perfect', 'perfect', 'late']);
  noErrors(page);
});

test('Sasquatch wind-up shows NEXT: SAVE IT! and no block button; perfect = 0 damage and 10 back, good = half, miss = full', async ({ page }) => {
  await duel(page, 'sasquatch');
  for (const [res, hero, rival] of [['perfect', 0, 10], ['good', 10, 0], ['miss', 20, 0]]) {
    await page.evaluate(() => { B().rival.used = {}; B().rival.afterCharge = false; B().hero.hp = B().hero.max; });
    await windUp(page);
    const ui = await page.evaluate(() => ({ chip: B().saveChip.visible, one: B().blockBtn.visible, ext: B().extBtn.visible, umb: B().umbBtn.visible }));
    expect(ui).toEqual({ chip: true, one: false, ext: false, umb: false });
    await page.evaluate(r => { window.__psSaveAuto = r; }, res);
    expect(await act(page)).toEqual([hero, rival]);
    expect(await page.evaluate(() => B().saveChip.visible)).toBe(false);
  }
  const st = await page.evaluate(() => __save.data.stats);
  expect(st.perfectSaves).toBe(1);
  noErrors(page);
});

test('Six-Seven during the wind-up: NORMAL drops the puck, HARD only delays the shot', async ({ page }) => {
  await duel(page, 'sasquatch');
  await windUp(page);
  await page.evaluate(() => { window.__psSaveAuto = 'miss'; });
  expect((await act(page, () => B().playerMove('sixseven')))[0]).toBe(0);
  expect(await page.evaluate(() => !!B().rival.charging)).toBe(false);
  await duel(page, 'sasquatch', 'hard');
  expect(await page.evaluate(() => B().rmoves.find(m => m.type === 'slapshot').uses)).toBe(3);
  await windUp(page);
  await page.evaluate(() => { window.__psSaveAuto = 'miss'; });
  expect((await act(page, () => B().playerMove('sixseven')))[0]).toBe(0);
  expect(await page.evaluate(() => B().rival.charging && B().rival.charging.type)).toBe('slapshot');
  expect(await page.evaluate(() => B().saveChip.visible)).toBe(true);
  noErrors(page);
});

test('Max has one mini slapshot; a rebuild during the wind-up keeps it; the real timed save never hangs', async ({ page }) => {
  await duel(page, 'moose');
  const m = await page.evaluate(() => B().rmoves.find(x => x.type === 'slapshot'));
  expect(m).toMatchObject({ mini: true, uses: 1, charge: true });
  await windUp(page);
  const snap = await page.evaluate(() => B().snapshot());
  await go(page, 'battle', { rival: await idx(page, 'moose'), resume: snap });
  await waitTurn(page);
  expect(await page.evaluate(() => [B().rival.charging && B().rival.charging.type, B().saveChip.visible])).toEqual(['slapshot', true]);
  // no auto: at 2-3 fps every frame is a hiccup, so the shot restarts twice and ends as a good save (never a stuck duel)
  await page.evaluate(() => { window.__psSaveAuto = null; B().rival.charging.dmg = [20, 20]; });
  const [lost] = await act(page);
  expect([0, 10, 20]).toContain(lost);
  noErrors(page);
});
