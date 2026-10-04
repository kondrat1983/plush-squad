// v0.8 "Fire or Beam?" (docs/gdd/0.8-space-rework.md section 4, option 2): the Mothership's Tractor Beam,
// the FOAM! / UMBRELLA! buttons, the card beam-up and the Blips' Mini Beam
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, waitTurn, noErrors } = require('./helpers');

const SPACE_OPEN = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 1, polandball: 1, ghost: 1 };
const idx = (page, id) => page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);

async function duel(page, id, diff = 'normal', extra = {}) {
  await boot(page, Object.assign({}, BASE_SAVE, { diff, stars: SPACE_OPEN }, extra));
  await page.evaluate(() => { window.B = () => __game.scene.getScene('battle'); });
  await go(page, 'battle', { rival: await idx(page, id) });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page);
}
// the rival starts charging a move of this type (fixed damage 20 so the halves are exact)
async function charge(page, type) {
  await page.evaluate(t => {
    const b = __game.scene.getScene('battle'), T = b.rival, m = b.rmoves.find(x => x.type === t);
    m.dmg = [20, 20]; window.__cdone = false;
    b.busy = true; b.setCards(false); T.used[m.k] = (T.used[m.k] || 0) + 1; T.lastType = m.type;
    b.startCharge(m, T).then(() => { b.busy = false; b.setCards(true); window.__cdone = true; });
  }, type);
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => window.__cdone); }, { timeout: 60000 }).toBe(true);
}
const buttons = page => page.evaluate(() => {
  const b = __game.scene.getScene('battle');
  const r = o => ({ v: o.visible, x: Math.round(o.x), y: Math.round(o.y), w: o.width, h: o.height, icon: o.icon.texture.key });
  return { one: r(b.blockBtn), ext: r(b.extBtn), umb: r(b.umbBtn) };
});
// does an action and waits for YOUR TURN; returns the hero's pep lost
async function act(page, fn) {
  const hp0 = await page.evaluate(() => __game.scene.getScene('battle').hero.hp);
  await page.evaluate(fn);
  await wait(page, 1000);
  await waitTurn(page, 120000);
  return hp0 - await page.evaluate(() => __game.scene.getScene('battle').hero.hp);
}

test('NORMAL: Tractor Beam shows FOAM! and UMBRELLA!; the umbrella blocks it (0 damage, BEAM JAM!, beamBlocks)', async ({ page }) => {
  await duel(page, 'dragonboss');
  await charge(page, 'beam');
  const bt = await buttons(page);
  expect(bt.one.v).toBe(false);
  expect(bt.ext.v && bt.umb.v).toBe(true);
  expect(Math.abs(bt.ext.x - bt.umb.x)).toBeGreaterThanOrEqual(bt.ext.w); // side by side, no overlap
  expect(bt.ext.h).toBeGreaterThanOrEqual(90);
  expect(await page.evaluate(() => !!B().beamSpot)).toBe(true);
  const lost = await act(page, () => B().playerBlock('umb'));
  expect(lost).toBe(0);
  const s = await page.evaluate(() => ({ dizzy: B().rival.dizzy, st: __save.data.stats || {}, beamed: B().hero.beamed || [], spot: !!B().beamSpot }));
  expect(s.dizzy).toBe(true);
  expect(s.st.beamBlocks).toBe(1);
  expect(s.st.blocks || 0).toBe(0);
  expect(s.beamed).toEqual([]);
  expect(s.spot).toBe(false);
  noErrors(page);
});

test('NORMAL: no block on a beam takes the Nap card (BEAMED UP), survives a rebuild, and comes back at the end', async ({ page }) => {
  await duel(page, 'dragonboss');
  await charge(page, 'beam');
  const lost = await act(page, () => B().playerMove('pillow'));
  expect(lost).toBe(20);
  let s = await page.evaluate(() => ({ beamed: B().hero.beamed, on: B().moves.find(m => m.k === 'nap').card.enabled, pillow: B().moves.find(m => m.k === 'pillow').card.enabled }));
  expect(s.beamed).toEqual(['nap']);
  expect(s.on).toBe(false);
  expect(s.pillow).toBe(true);
  // a rotation rebuild keeps the stamp
  const snap = await page.evaluate(() => B().snapshot());
  expect(snap.h.beamed).toEqual(['nap']);
  await go(page, 'battle', { rival: await idx(page, 'dragonboss'), resume: snap });
  await waitTurn(page);
  s = await page.evaluate(() => ({ beamed: B().hero.beamed, on: B().moves.find(m => m.k === 'nap').card.enabled }));
  expect(s.beamed).toEqual(['nap']);
  expect(s.on).toBe(false);
  // nap is never taken twice: the next steal picks the next limited card, never an unlimited one
  const next = await page.evaluate(() => { const c = B().stealCard(); return c && c.k; });
  expect(['frost', 'dumpling', 'sixseven', 'inferno']).toContain(next);
  await page.evaluate(() => { const b = B(); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => (B().hero.beamed || []).length); }, { timeout: 60000 }).toBe(0);
  noErrors(page);
});

test('wrong tool is half damage and no dizzy, both ways; FOAM! on Inferno Rain still steams the Mothership', async ({ page }) => {
  await duel(page, 'dragonboss');
  await charge(page, 'beam');
  expect(await act(page, () => B().playerBlock('ext'))).toBe(10);
  let s = await page.evaluate(() => ({ dizzy: B().rival.dizzy, beamed: B().hero.beamed || [], st: __save.data.stats || {} }));
  expect(s.dizzy).toBe(false);
  expect(s.beamed).toEqual([]);
  expect(s.st.blocks || 0).toBe(0);
  await charge(page, 'rain');
  expect(await act(page, () => B().playerBlock('umb'))).toBe(10);
  expect(await page.evaluate(() => B().rival.dizzy)).toBe(false);
  await page.evaluate(() => { B().rival.used = {}; B().rival.afterCharge = false; });
  await charge(page, 'rain');
  expect(await page.evaluate(() => B().fireFx.fillColor)).toBe(0xff3b1f);
  expect(await act(page, () => B().playerBlock('ext'))).toBe(0);
  s = await page.evaluate(() => ({ dizzy: B().rival.dizzy, st: __save.data.stats || {} }));
  expect(s.dizzy).toBe(true);
  expect(s.st.blocks).toBe(1);
  expect(s.st.beamBlocks || 0).toBe(0);
  noErrors(page);
});

test('never two charged moves in a row', async ({ page }) => {
  await duel(page, 'dragonboss', 'hard');
  const r = await page.evaluate(() => {
    const b = B(), T = b.rival; let bad = 0;
    for (let i = 0; i < 300; i++) { T.used = {}; T.lastType = 'multi'; T.afterCharge = true; if (b.pickMove().charge) bad++; }
    T.afterCharge = false; let charged = 0;
    for (let i = 0; i < 300; i++) { T.used = {}; T.lastType = 'multi'; if (b.pickMove().charge) charged++; }
    return { bad, charged, beamUses: b.rmoves.find(m => m.type === 'beam').uses, rainUses: b.rmoves.find(m => m.type === 'rain').uses };
  });
  expect(r.bad).toBe(0);
  expect(r.charged).toBeGreaterThan(0);
  expect(r.beamUses).toBe(3); // HARD: three beams
  expect(r.rainUses).toBe(1);
  noErrors(page);
});

test('EASY: one BLOCK IT! button picks the right tool by itself, and the beam never takes a card', async ({ page }) => {
  await duel(page, 'dragonboss', 'easy');
  expect(await page.evaluate(() => B().rmoves.find(m => m.type === 'beam').uses)).toBe(2);
  await charge(page, 'beam');
  let bt = await buttons(page);
  expect(bt.one.v).toBe(true);
  expect(bt.one.icon).toBe('umbrella');
  expect(bt.ext.v || bt.umb.v).toBe(false);
  expect(await act(page, () => B().blockBtn.emit('pointerup'))).toBe(0);
  expect(await page.evaluate(() => (__save.data.stats || {}).beamBlocks)).toBe(1);
  await page.evaluate(() => { B().rival.afterCharge = false; B().rival.dizzy = false; });
  await charge(page, 'beam');
  expect(await act(page, () => B().playerMove('pillow'))).toBe(20);
  expect(await page.evaluate(() => B().hero.beamed || [])).toEqual([]);
  await page.evaluate(() => { B().rival.afterCharge = false; });
  await charge(page, 'rain');
  bt = await buttons(page);
  expect(bt.one.icon).toBe('extinguisher');
  noErrors(page);
});

test('Blips Mini Beam: only UMBRELLA!, blocked = 0 damage and no dizzy; not blocked = damage, no card taken', async ({ page }) => {
  await duel(page, 'polandball');
  const mini = await page.evaluate(() => B().rmoves.find(m => m.type === 'beam'));
  expect(mini).toMatchObject({ mini: true, uses: 1, charge: true });
  await charge(page, 'beam');
  const bt = await buttons(page);
  expect(bt.umb.v).toBe(true);
  expect(bt.ext.v || bt.one.v).toBe(false);
  expect(bt.umb.x).toBe(bt.one.x); // centred (BLOCK IT! always sits in the middle)
  expect(await act(page, () => B().playerBlock('umb'))).toBe(0);
  expect(await page.evaluate(() => B().rival.dizzy)).toBe(false);
  await page.evaluate(() => { B().rival.used = {}; B().rival.afterCharge = false; });
  await charge(page, 'beam');
  expect(await act(page, () => B().playerMove('pillow'))).toBe(20);
  expect(await page.evaluate(() => B().hero.beamed || [])).toEqual([]);
  noErrors(page);
});
