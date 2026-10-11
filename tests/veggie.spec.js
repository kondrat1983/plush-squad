// v1.0 Veggie Patch (docs/gdd/1.0-veggie.md): rivals and unlock after Sleepy Thully, pep from level 11, PEEKABOO! (mounds, the tell,
// the worm on HARD, Six-Seven, heal during a hide, rotation), Brock Lee's Floret Forest, Broccoli Hair, stickers, quests, music
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, waitTurn, offscreen, noErrors } = require('./helpers');

const save = extra => Object.assign({}, BASE_SAVE, extra);
const OCEAN_DONE = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 3, polandball: 3, ghost: 3, dragonboss: 3, moose: 3, beaver: 3, mountie: 3, sasquatch: 3, hermy: 1, puff: 1, jelly: 1, fog: 1, thully: 1 };
const VEG_OPEN = Object.assign({}, OCEAN_DONE, { onion: 1, peas: 1, garlic: 1, fungi: 1 });
const idx = (page, id) => page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);
const XP = { 11: 3250, 12: 3850, 16: 6750 };
const texts = (page, key) => page.evaluate(key => { const out = [], walk = l => l.forEach(o => { if (o.type === 'Text' && o.visible) out.push(o.text); if (o.list) walk(o.list); });
  walk(__game.scene.getScene(key).children.list); return out; }, key);

async function duel(page, id, diff = 'normal') {
  await page.evaluate(d => { __save.data.diff = d; }, diff);
  await go(page, 'battle', { rival: await idx(page, id) });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page);
}
// the rival hides now (as on his turn), then it is the player's seek turn; afterPlayer is stubbed so nothing else moves
const hideNow = page => page.evaluate(async () => {
  const b = __game.scene.getScene('battle'), m = b.rmoves.find(x => x.type === 'hide');
  b.busy = true; await b.doMove(m, b.rival, b.hero); b.busy = false; b.setCards(true);
  b.afterPlayer = async () => { b.busy = false; b.setCards(true); };
  return { n: b.hidden.n, right: b.hidden.right };
});
const state = page => page.evaluate(() => { const b = __game.scene.getScene('battle'); return { hidden: !!b.hidden, rhp: b.rival.hp, hhp: b.hero.hp, dizzy: !!b.rival.dizzy, busy: b.busy, stats: Object.assign({}, __save.data.stats) }; });
const settle = async page => { await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !__game.scene.getScene('battle').busy); }, { timeout: 120000 }).toBe(true); };

test('Veggie Patch: 5 rivals after Sleepy Thully, opens after one Thully star, numbers as designed', async ({ page }) => {
  await boot(page, save({ stars: Object.assign({}, OCEAN_DONE, { thully: 0 }) }));
  const r = await page.evaluate(() => __RIVALS.filter(r => r.world === 4).map(r => [r.id, r.hp, r.xp, !!r.boss, !!r.plural]));
  expect(r).toEqual([['onion', 165, 170, false, false], ['peas', 175, 180, false, true], ['garlic', 185, 190, false, false], ['fungi', 195, 200, false, false], ['brocklee', 240, 240, true, false]]);
  await go(page, 'map', { world: 4 });
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).not.toBe(4);
  const hint = await page.evaluate(() => { const m = __game.scene.getScene('map'); m.children.list.filter(o => o.type === 'Container' && o.depth === 6 && o.height === 96)[4].emit('pointerup'); return m._hint && m._hint.text; });
  expect(hint).toBe('Beat Sleepy Thully to open VEGGIE PATCH!');
  await page.evaluate(() => { __save.data.stars.thully = 1; });
  await go(page, 'map', { world: 4 });
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(4);
  expect(await offscreen(page, 'map')).toEqual([]);
  noErrors(page);
});

test('Veggie pep from level 11; EASY / HARD; hide uses; garden music, boss music and the crown only for Brock Lee', async ({ page }) => {
  test.setTimeout(1500000); // 8 duels
  await boot(page, save({ stars: VEG_OPEN }));
  const pep = async (xp, diff, id) => { await page.evaluate(x => { __save.data.xp = x; }, xp); await duel(page, id, diff); return page.evaluate(() => __game.scene.getScene('battle').rival.max); };
  const uses = () => page.evaluate(() => __game.scene.getScene('battle').rmoves.find(m => m.type === 'hide').uses);
  expect(await pep(XP[11], 'normal', 'onion')).toBe(165);
  expect(await pep(XP[12], 'normal', 'onion')).toBe(175);
  expect(await pep(XP[11], 'normal', 'brocklee')).toBe(240);
  expect(await uses()).toBe(2);
  expect(await page.evaluate(() => PSAudio._want)).toBe('boss');
  expect(await pep(XP[12], 'normal', 'brocklee')).toBe(250);
  expect(await pep(XP[16] + 3000, 'normal', 'brocklee')).toBe(300);
  expect(await pep(XP[16], 'easy', 'brocklee')).toBe(190);
  expect(await uses()).toBe(2);
  expect(await pep(XP[11], 'hard', 'brocklee')).toBe(290);
  expect(await uses()).toBe(3);
  await pep(XP[11], 'normal', 'fungi');
  expect(await uses()).toBe(2);
  expect(await page.evaluate(() => [PSAudio._want, !!__game.scene.getScene('battle').R.boss])).toEqual(['garden', false]);
  noErrors(page);
});

test('PEEKABOO! on NORMAL: mounds, HIDING! cards, the right mound bonks for 15 and makes him dizzy; the tell only on the right mound', async ({ page }) => {
  await boot(page, save({ stars: VEG_OPEN, xp: XP[11], stats: { seekSeen: 1 } }));
  await duel(page, 'peas', 'normal');
  const h = await hideNow(page);
  expect(h.n).toBe(3);
  const ui = await page.evaluate(() => { const b = __game.scene.getScene('battle');
    return { cards: b.moves.map(m => [!!m.dmg, !!m.card.enabled]), pils: b.mounds.map(c => c.pil.visible), alpha: b.rival.squash.alpha, zones: b.mounds.map(c => { const z = c.list[2]; return [z.width, z.height]; }) }; });
  ui.cards.forEach(([atk, on]) => expect(on).toBe(!atk));
  expect(ui.pils.filter(Boolean).length).toBe(1);
  expect(ui.pils[h.right]).toBe(true);
  expect(ui.alpha).toBe(0);
  ui.zones.forEach(([w, hh]) => { expect(w).toBeGreaterThanOrEqual(150); expect(hh).toBeGreaterThanOrEqual(220); });
  const before = await state(page);
  await page.evaluate(r => __game.scene.getScene('battle').seek(r), h.right);
  await settle(page);
  const after = await state(page);
  expect(before.rhp - after.rhp).toBe(15);
  expect([after.hidden, after.dizzy, after.stats.found]).toEqual([false, true, 1]);
  noErrors(page);
});

test('PEEKABOO! wrong mound on NORMAL: the sneak tickle in the move\'s range; EASY: free retries, the pillow always out, no damage', async ({ page }) => {
  await boot(page, save({ stars: VEG_OPEN, xp: XP[11], stats: { seekSeen: 1 } }));
  await duel(page, 'fungi', 'normal');
  let h = await hideNow(page);
  let s0 = await state(page);
  await page.evaluate(i => __game.scene.getScene('battle').seek(i), (h.right + 1) % h.n);
  await settle(page);
  let s1 = await state(page);
  expect(s0.hhp - s1.hhp).toBeGreaterThanOrEqual(18);
  expect(s0.hhp - s1.hhp).toBeLessThanOrEqual(24);
  expect([s1.hidden, s1.dizzy, s1.rhp]).toEqual([false, false, s0.rhp]);
  await duel(page, 'fungi', 'easy');
  h = await hideNow(page);
  expect(h.n).toBe(2);
  expect(await page.evaluate(() => { const b = __game.scene.getScene('battle'), M = b.mounds[b.hidden.right]; return M.pil.y < M.top; })).toBe(true);
  s0 = await state(page);
  await page.evaluate(i => __game.scene.getScene('battle').seek(i), (h.right + 1) % h.n);
  await wait(page, 1000);
  s1 = await state(page);
  expect([s1.hidden, s1.busy, s1.hhp]).toEqual([true, false, s0.hhp]);
  await page.evaluate(r => __game.scene.getScene('battle').seek(r), h.right);
  await settle(page);
  expect((await state(page)).dizzy).toBe(true);
  noErrors(page);
});

test('Six-Seven during a hide finds him (dizzy, no bonk, Dance Detective); a heal during a hide works, then the sneak tickle', async ({ page }) => {
  await boot(page, save({ stars: VEG_OPEN, xp: XP[11], stats: { seekSeen: 1 } }));
  await duel(page, 'onion', 'normal');
  expect((await hideNow(page)).n).toBe(2);
  const s0 = await state(page);
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.playerMove(b.moves.find(m => m.type === 'dance').k); });
  await settle(page);
  const s1 = await state(page);
  expect([s1.hidden, s1.dizzy, s1.rhp, s1.stats.found, s1.stats.danceFind]).toEqual([false, true, s0.rhp, 1, 1]);
  expect(await page.evaluate(() => { PSExtra.checkAch(); return !!__save.data.ach.dancefind; })).toBe(true);
  await duel(page, 'peas', 'normal');
  await hideNow(page);
  await page.evaluate(() => { __game.scene.getScene('battle').hero.hp = 50; });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.playerMove(b.moves.find(m => m.k === 'dumpling').k); });
  await settle(page);
  const s2 = await state(page);
  expect(s2.hidden).toBe(false);
  expect(s2.hhp).toBeGreaterThanOrEqual(50 + 20 - 20);
  expect(s2.hhp).toBeLessThanOrEqual(50 + 20 - 14);
  noErrors(page);
});

test('Brock Lee on HARD: a 4-tree Floret Forest, the worm pops once from a wrong tree; the first seek ever shows the hand', async ({ page }) => {
  await boot(page, save({ stars: VEG_OPEN, xp: XP[11] }));
  await duel(page, 'brocklee', 'hard');
  const h = await hideNow(page);
  expect(h.n).toBe(4);
  expect(await page.evaluate(() => { const b = __game.scene.getScene('battle'); return [b.mounds.every(c => c.art.texture.key === 'broccoli'), !!b.seekHand, b.hidden.worm]; })).toEqual([true, true, false]);
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __game.scene.getScene('battle').hidden.worm); }, { timeout: 120000 }).toBe(true);
  await page.evaluate(r => __game.scene.getScene('battle').seek(r), h.right);
  await settle(page);
  expect(await page.evaluate(() => __save.data.stats.seekSeen)).toBe(1);
  await hideNow(page);
  expect(await page.evaluate(() => !!__game.scene.getScene('battle').seekHand)).toBe(false);
  noErrors(page);
});

test('the AI never hides twice in a row, right after a charge, or while the hero is dizzy', async ({ page }) => {
  await boot(page, save({ stars: VEG_OPEN, xp: XP[11] }));
  await duel(page, 'fungi', 'normal');
  const picks = await page.evaluate(() => {
    const b = __game.scene.getScene('battle'), T = b.rival, P = b.hero, out = [];
    const run = () => { T.used = {}; for (let i = 0; i < 150; i++) out.push(b.pickMove().type); };
    T.lastType = 'hide'; T.afterCharge = false; P.dizzy = false; run();
    T.lastType = 'hop'; T.afterCharge = true; run();
    T.afterCharge = false; P.dizzy = true; run(); P.dizzy = false;
    return out;
  });
  expect(picks).not.toContain('hide');
  noErrors(page);
});

test('rotation on a seek turn: same mounds, same right one, the worm does not repeat; the tap is applied once', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, save({ stars: VEG_OPEN, xp: XP[11], stats: { seekSeen: 1 } }));
  await duel(page, 'brocklee', 'hard');
  const h = await hideNow(page);
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __game.scene.getScene('battle').hidden.worm); }, { timeout: 120000 }).toBe(true);
  const hp0 = await page.evaluate(() => { window.__oldGame = __game; return __game.scene.getScene('battle').rival.hp; });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.__game && window.__game !== window.__oldGame && __game.scene.isActive('battle') && __game.scene.getScene('battle').hero, null, { timeout: 90000 });
  await fast(page);
  const r = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return { n: b.hidden.n, right: b.hidden.right, worm: b.hidden.worm, mounds: b.mounds.length, alpha: b.rival.squash.alpha }; });
  expect(r).toEqual({ n: h.n, right: h.right, worm: true, mounds: h.n, alpha: 0 });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.afterPlayer = async () => { b.busy = false; }; b.seek(b.hidden.right); });
  await settle(page);
  expect(await page.evaluate(() => __game.scene.getScene('battle').rival.hp)).toBe(hp0 - Math.ceil(15 * 1)); // HARD: the bonk is 15 (no booster)
  noErrors(page);
});

test('?debug __psHide resolves a real hide turn: the rival hides on his turn, the seek is found', async ({ page }) => {
  await boot(page, save({ stars: VEG_OPEN, xp: XP[11], stats: { seekSeen: 1 } }));
  await duel(page, 'onion', 'normal');
  await page.evaluate(() => { window.__psHide = 'found'; const b = __game.scene.getScene('battle'), m = b.rmoves.find(x => x.type === 'hide'); b.pickMove = () => m; b.playerMove(b.moves[0].k); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __save.data.stats.found || 0); }, { timeout: 180000 }).toBe(1);
  await page.evaluate(() => { delete __game.scene.getScene('battle').pickMove; window.__psHide = null; });
  noErrors(page);
});

test('beating Brock Lee: Broccoli Hair (first win only), Tree Hugger sticker; 3 stickers and 6 quests in the pools', async ({ page }) => {
  await boot(page, save({ stars: VEG_OPEN, xp: XP[11] }));
  for (let k = 0; k < 2; k++) {
    await go(page, 'battle', { rival: await idx(page, 'brocklee') });
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
    await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 90000 }).toBe(true);
    const notes = await page.evaluate(() => __game.scene.getScene('battle').shown.notes.join(' | '));
    if (k === 0) expect(notes).toContain('New costume: Broccoli Hair! Put it on in Me'); else expect(notes).not.toContain('Broccoli Hair');
  }
  await wait(page, 3000);
  expect(await page.evaluate(() => [__save.data.costumes.brochair, !!__save.data.ach.brocklee])).toEqual([true, true]);
  const pools = await page.evaluate(() => ({ ach: PSExtra.ACH.map(a => a.id), q: PSExtra.QUESTS.map(q => q.id) }));
  for (const id of ['thully', 'alarm5', 'lucky10', 'brocklee', 'seek10', 'dancefind']) expect(pools.ach).toContain(id);
  for (const id of ['boat', 'bath', 'seafacts', 'water', 'map', 'earlybed', 'tryveg', 'seed', 'washveg', 'vegface', 'rainbow', 'hideseek']) expect(pools.q).toContain(id);
  expect(pools.q.length).toBe(36);
  noErrors(page);
});

const SIZES = { 'iPhone SE': { width: 375, height: 667 }, 'iPhone 14': { width: 390, height: 844 }, 'iPad portrait': { width: 768, height: 1024 }, 'iPad landscape': { width: 1024, height: 768 }, 'phone landscape': { width: 844, height: 390 } };
for (const [tag, vp] of Object.entries(SIZES)) test(`4 mounds on Brock Lee and Me with 11 costumes fit (${tag})`, async ({ page }) => {
  await page.setViewportSize(vp);
  const costumes = { owlhat: true, ufohat: true, bat: true, toque: true, pumpkin: true, tophat: true, witchhat: true, crown: true, nightcap: true, brochair: true };
  await boot(page, save({ stars: VEG_OPEN, xp: XP[11], costumes, costume: 'brochair', stats: { seekSeen: 1 } }));
  await duel(page, 'brocklee', 'hard');
  await hideNow(page);
  const m = await page.evaluate(() => { const b = __game.scene.getScene('battle'), W = __game.config.width, cards = Math.min(...b.moves.map(x => x.card.y - x.card.height / 2));
    return { xs: b.mounds.map(c => c.x), w: W, bottom: Math.max(...b.mounds.map(c => c.y + c.list[2].y + c.list[2].height / 2)), cards }; });
  for (let i = 1; i < m.xs.length; i++) expect(m.xs[i] - m.xs[i - 1]).toBeGreaterThanOrEqual(140);
  expect(Math.max(...m.xs) + 75).toBeLessThanOrEqual(m.w + 2);
  expect(m.bottom).toBeLessThanOrEqual(m.cards + 2);
  expect(await offscreen(page, 'battle')).toEqual([]);
  await go(page, 'me');
  expect(await offscreen(page, 'me')).toEqual([]);
  const r = await page.evaluate(() => { const s = __game.scene.getScene('me'), H = __game.config.height;
    const hats = s.children.list.filter(o => o.type === 'Container' && o.input && o.width === o.height && o.width < 200 && o.y > 300);
    const texts = s.children.list.filter(o => o.type === 'Text' && o.y > H * 0.5).map(t => [t.y - t.displayHeight / 2, t.text]);
    return { n: hats.length, min: Math.min(...hats.map(h => h.width)), low: Math.max(...hats.map(h => h.y + h.height / 2)), texts }; });
  expect(r.n).toBe(11);
  expect(r.min).toBeGreaterThanOrEqual(90);
  r.texts.filter(([y, t]) => /Log in|Friend code/.test(t)).forEach(([y]) => expect(r.low).toBeLessThanOrEqual(y));
  noErrors(page);
});
