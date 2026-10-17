// v1.0 Ocean (docs/gdd/1.0-ocean.md): world order and unlock, pep scaling from level 9, Compass Spin, WAKE UP! / ALARM!,
// Nightcap, music, map layout with 5 nodes and 5-6 tabs, comic, stickers, quests, the save migration
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, waitTurn, offscreen, noErrors } = require('./helpers');

const save = extra => Object.assign({}, BASE_SAVE, extra);
const CANADA_DONE = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 3, polandball: 3, ghost: 3, dragonboss: 3, moose: 3, beaver: 3, mountie: 3, sasquatch: 1 };
const OCEAN_DONE = Object.assign({}, CANADA_DONE, { hermy: 1, puff: 1, jelly: 1, fog: 1 });
const idx = (page, id) => page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);
const XP = { 1: 0, 9: 2200, 10: 2700, 11: 3250, 14: 5200 }; // first XP of these levels
const SIZES = { 'iPhone SE': { width: 375, height: 667 }, 'iPhone 14': { width: 390, height: 844 }, 'iPad portrait': { width: 768, height: 1024 }, 'iPad landscape': { width: 1024, height: 768 }, 'phone landscape': { width: 844, height: 390 } };
const texts = (page, key) => page.evaluate(key => { const out = [], walk = l => l.forEach(o => { if (o.type === 'Text' && o.visible) out.push(o.text); if (o.list) walk(o.list); });
  walk(__game.scene.getScene(key).children.list); return out; }, key);

async function duel(page, id, diff = 'normal') {
  await page.evaluate(d => { __save.data.diff = d; }, diff);
  await go(page, 'battle', { rival: await idx(page, id) });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page);
}
// card i sits on its own place?
const cardPlaces = page => page.evaluate(() => { const b = __game.scene.getScene('battle');
  return b.moves.map(m => b.rects.findIndex(r => Math.abs(r.x - m.card.x) < 2 && Math.abs(r.y - m.card.y) < 2)); });

test('Ocean sits after Canada: 5 rivals in order, opens after Sasquatch, Veggie Patch after Thully, Spooky last', async ({ page }) => {
  await boot(page, save({ stars: Object.assign({}, CANADA_DONE, { sasquatch: 0 }) }), '&halloween');
  const r = await page.evaluate(() => __RIVALS.map(r => [r.id, r.world, r.hp, r.xp, !!r.boss]));
  const ids = r.map(x => x[0]), i = ids.indexOf('hermy');
  expect(ids.slice(i - 1, i + 11)).toEqual(['sasquatch', 'hermy', 'puff', 'jelly', 'fog', 'thully', 'onion', 'peas', 'garlic', 'fungi', 'brocklee', 'england']);
  expect(r.slice(i, i + 5)).toEqual([['hermy', 3, 155, 150, false], ['puff', 3, 165, 160, false], ['jelly', 3, 175, 170, false], ['fog', 3, 185, 180, false], ['thully', 3, 220, 220, true]]);
  expect(await page.evaluate(() => __RIVALS.find(r => r.id === 'pumpkin').world)).toBe(6); // v1.1: Countryballs is 5
  // locked: the tab says who opens it
  await go(page, 'map', { world: 3 });
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).not.toBe(3);
  const hint = await page.evaluate(() => { const m = __game.scene.getScene('map'); m.children.list.filter(o => o.type === 'Container' && o.depth === 6 && o.height === 96)[3].emit('pointerup'); return m._hint && m._hint.text; });
  expect(hint).toBe('Beat Sasquatch to open OCEAN!');
  await page.evaluate(() => { __save.data.stars.sasquatch = 1; });
  await go(page, 'map', { world: 3 });
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(3);
  expect(await page.evaluate(() => __game.scene.getScene('map').world === 3 && [3, 4].map(w => __RIVALS.some((r, i) => r.world === w && (i === 0 || (__save.data.stars[__RIVALS[i - 1].id] || 0) > 0))))).toEqual([true, false]);
  noErrors(page);
});

test('first Sasquatch win: NEW WORLD: OCEAN note, NEXT RIVAL is Hermy', async ({ page }) => {
  await boot(page, save({ stars: Object.assign({}, CANADA_DONE, { sasquatch: 0 }) }));
  await go(page, 'battle', { rival: await idx(page, 'sasquatch') });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 90000 }).toBe(true);
  const sh = await page.evaluate(() => __game.scene.getScene('battle').shown);
  expect(sh.notes).toContain('NEW WORLD: OCEAN! Rival: Hermy the Hermit Crab');
  expect(sh.primary).toBe('next');
  expect(sh.nextIdx).toBe(await idx(page, 'hermy'));
  noErrors(page);
});

test('Ocean pep: scaling from level 9; EASY and HARD; Canada unchanged; Big Yawn and Compass Spin uses', async ({ page }) => {
  test.setTimeout(1500000); // 12 duels
  await boot(page, save({ stars: OCEAN_DONE }));
  const pep = async (xp, diff, id) => {
    await page.evaluate(([xp]) => { __save.data.xp = xp; }, [xp]);
    await duel(page, id, diff);
    return page.evaluate(() => __game.scene.getScene('battle').rival.max);
  };
  expect(await pep(XP[9], 'normal', 'hermy')).toBe(155);
  expect(await pep(XP[11], 'normal', 'hermy')).toBe(170);
  expect(await pep(XP[9], 'normal', 'thully')).toBe(220);
  expect(await pep(XP[10], 'normal', 'thully')).toBe(230);
  expect(await pep(XP[14] + 4000, 'normal', 'thully')).toBe(275);
  expect(await pep(XP[14], 'easy', 'thully')).toBe(175);
  expect(await page.evaluate(() => __game.scene.getScene('battle').rmoves.find(m => m.type === 'yawn').uses)).toBe(1);
  expect(await pep(XP[9], 'hard', 'thully')).toBe(265);
  expect(await page.evaluate(() => __game.scene.getScene('battle').rmoves.find(m => m.type === 'yawn').uses)).toBe(3);
  await pep(XP[9], 'normal', 'thully');
  expect(await page.evaluate(() => __game.scene.getScene('battle').rmoves.find(m => m.type === 'yawn').uses)).toBe(2);
  expect(await page.evaluate(() => __game.scene.getScene('battle').rmoves.find(m => m.type === 'whirl') || null)).toBe(null);
  await pep(XP[9], 'hard', 'fog');
  expect(await page.evaluate(() => __game.scene.getScene('battle').rmoves.find(m => m.type === 'whirl').uses)).toBe(3);
  await pep(XP[9], 'normal', 'fog');
  expect(await page.evaluate(() => __game.scene.getScene('battle').rmoves.find(m => m.type === 'whirl').uses)).toBe(2);
  expect(await pep(XP[9], 'normal', 'sasquatch')).toBe(240); // Canada keeps its L6 rule: 210 x 1.15 = 241.5, rounded to 5
  noErrors(page);
});

for (const diff of ['easy', 'normal', 'hard']) test(`Compass Spin on ${diff}: cards that move, the LUCKY card (+5 on the first hit), cards back after the move`, async ({ page }) => {
  await boot(page, save({ stars: OCEAN_DONE, xp: XP[9] }));
  await duel(page, 'fog', diff);
  await page.evaluate(() => __psSpin(true));
  await wait(page, 600);
  const sp = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return { order: b.spin.order, lucky: b.spin.lucky, glow: b.spin.glow, atk: !!b.moves[b.spin.lucky].dmg, n: b.moves.length }; });
  const moved = sp.order.filter((v, i) => v !== i).length;
  expect(sp.atk).toBe(true);
  if (diff === 'easy') expect(moved).toBe(0);
  if (diff === 'normal') { expect(moved).toBe(2); expect(sp.order[sp.lucky]).not.toBe(sp.lucky); }
  if (diff === 'hard') { expect(moved).toBeGreaterThanOrEqual(3); expect(sp.order[sp.lucky]).not.toBe(sp.lucky); }
  await wait(page, 1500);
  expect(await cardPlaces(page)).toEqual(sp.order);
  // the glow: EASY / NORMAL keep it; HARD hides it 1 s after the slide but keeps the badge
  const look = await page.evaluate(() => { const b = __game.scene.getScene('battle'), c = b.moves[b.spin.lucky].card; return { glow: c.list[6].visible, badge: c.list[7].visible, plus: c.list[8].visible }; });
  expect(look.glow).toBe(diff !== 'hard');
  expect(look.badge).toBe(diff !== 'easy');
  // play the LUCKY card with a fixed 10 pep hit: 15 lands
  const hit = await page.evaluate(async () => {
    const b = __game.scene.getScene('battle'), m = b.moves[b.spin.lucky];
    m.dmg = [10, 10]; m.type = 'throw'; m.tex = 'pillow'; b.rival.shield = false; b.afterPlayer = async () => {};
    const hp0 = b.rival.hp; await b.playerMove(m.k); delete b.afterPlayer; return hp0 - b.rival.hp;
  });
  expect(hit).toBe(15);
  expect(await page.evaluate(() => [__save.data.stats.lucky, __game.scene.getScene('battle').spin])).toEqual([1, null]);
  await wait(page, 1200);
  expect(await cardPlaces(page)).toEqual(sp.order.map((v, i) => i));
  noErrors(page);
});

test('Hermy\'s Mini Compass moves 2 cards on HARD; whirl never twice in a row or after a charge', async ({ page }) => {
  await boot(page, save({ stars: OCEAN_DONE, xp: XP[9] }));
  await duel(page, 'hermy', 'hard');
  // the rival's Mini Compass, then the player's turn is a Compass turn with 2 moved cards
  await page.evaluate(() => { const b = __game.scene.getScene('battle'), w = b.rmoves.find(m => m.type === 'whirl'); b.pickMove = () => w; b.playerMove(b.moves[0].k); });
  await waitTurn(page, 120000);
  const sp = await page.evaluate(() => { const b = __game.scene.getScene('battle'); delete b.pickMove; return b.spin && { order: b.spin.order, mini: b.spin.mini }; });
  expect(sp.mini).toBe(true);
  expect(sp.order.filter((v, i) => v !== i).length).toBe(2);
  const picks = await page.evaluate(() => {
    const b = __game.scene.getScene('battle'), T = b.rival, out = [];
    T.used = {};
    T.lastType = 'whirl'; T.afterCharge = false; for (let i = 0; i < 200; i++) out.push(b.pickMove().type);
    T.lastType = 'rush'; T.afterCharge = true; for (let i = 0; i < 200; i++) out.push(b.pickMove().type);
    return out;
  });
  expect(picks).not.toContain('whirl');
  noErrors(page);
});

test('a dizzy hero right after a Compass Spin uses the spin up; the next real turn is normal', async ({ page }) => {
  await boot(page, save({ stars: OCEAN_DONE, xp: XP[9] }));
  await duel(page, 'jelly', 'normal');
  await page.evaluate(() => {
    const b = __game.scene.getScene('battle'), w = b.rmoves.find(m => m.type === 'whirl'), r = b.rmoves.find(m => m.type === 'hop');
    let k = 0; b.pickMove = () => (k++ ? r : w);
    b.hero.dizzy = true; b.hero.hp = 100; b.playerMove(b.moves[0].k);
  });
  await waitTurn(page, 180000);
  expect(await page.evaluate(() => { const b = __game.scene.getScene('battle'); delete b.pickMove; return [b.spin, b.spinNext]; })).toEqual([null, null]);
  expect(await cardPlaces(page)).toEqual((await cardPlaces(page)).map((v, i) => i));
  noErrors(page);
});

test('rotation on a Compass turn keeps the moved cards and the LUCKY card, without a slide', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, save({ stars: OCEAN_DONE, xp: XP[9] }));
  await duel(page, 'fog', 'normal');
  await page.evaluate(() => __psSpin(true));
  await wait(page, 1500);
  const sp = await page.evaluate(() => { window.__oldGame = __game; const b = __game.scene.getScene('battle'); return { order: b.spin.order, lucky: b.spin.lucky }; });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.__game && window.__game !== window.__oldGame && __game.scene.isActive('battle') && __game.scene.getScene('battle').hero, null, { timeout: 90000 });
  await fast(page);
  const sp2 = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return { order: b.spin.order, lucky: b.spin.lucky }; });
  expect(sp2).toEqual(sp);
  expect(await cardPlaces(page)).toEqual(sp.order);
  noErrors(page);
});

test('Sleepy Thully: asleep with the lullaby, half damage, the Wake-o-meter, snore heal, WHO WOKE ME UP?! and boss music', async ({ page }) => {
  await boot(page, save({ stars: OCEAN_DONE, xp: XP[9] }));
  await duel(page, 'thully', 'normal');
  let st = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return { asleep: b.rival.asleep, meter: b.rival.meter, music: PSAudio._want, pips: b.meterBox.list.length }; });
  expect(st).toEqual({ asleep: true, meter: 0, music: 'lullaby', pips: 3 });
  // a hit does half (rounded up) and fills one pip
  const d = await page.evaluate(async () => { const b = __game.scene.getScene('battle'), hp = b.rival.hp; await b.impact(b.rival, 15); return [hp - b.rival.hp, b.rival.meter]; });
  expect(d).toEqual([8, 1]);
  // his turn while asleep: he only snores, +8 on NORMAL (capped at max)
  const sn = await page.evaluate(async () => { const b = __game.scene.getScene('battle'); b.rival.hp = 100; const h = b.hero.hp; await b.rivalTurn0(); return [b.rival.hp, b.hero.hp === h]; });
  expect(sn).toEqual([108, true]);
  // two more hits wake him (3 on NORMAL); the third hit is still halved, the next is full
  const w = await page.evaluate(async () => { const b = __game.scene.getScene('battle'); await b.impact(b.rival, 10); await b.impact(b.rival, 10); const hp = b.rival.hp; await b.impact(b.rival, 10); return [b.rival.asleep, hp - b.rival.hp, PSAudio._want, b.logT.text]; });
  expect(w[0]).toBe(false);
  expect(w[1]).toBe(10);
  expect(w[2]).toBe('boss');
  expect(w[3]).toContain('WHO WOKE ME UP');
  noErrors(page);
});

test('Big Yawn: ALARM! shows instead of the block buttons; ringing it makes Thully dizzy and counts', async ({ page }) => {
  await boot(page, save({ stars: OCEAN_DONE, xp: XP[9] }));
  await duel(page, 'thully', 'normal');
  await page.evaluate(async () => {
    __psWake(); const b = __game.scene.getScene('battle'), y = b.rmoves.find(m => m.type === 'yawn');
    b.rival.used[y.k] = 1; b.rival.lastType = 'yawn'; await b.startCharge(y, b.rival); b.setCards(true);
  });
  const ui = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return [b.alarmBtn.visible, b.alarmHand.visible, b.blockBtn.visible, b.extBtn.visible, b.umbBtn.visible, !!(b.diffChip && b.diffChip.visible)]; });
  expect(ui).toEqual([true, true, false, false, false, false]); // the hand: first ALARM! ever
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.rivalTurn = async () => { b.rivalSeen = b.rival.dizzy; b.rival.dizzy = false; }; b.alarmBtn.emit('pointerup'); });
  await waitTurn(page, 120000);
  const r = await page.evaluate(() => { const b = __game.scene.getScene('battle'); delete b.rivalTurn; return [b.rivalSeen, !!b.rival.charging, __save.data.stats.alarms, __save.data.stats.alarmSeen, b.rival.asleep]; });
  expect(r).toEqual([true, false, 1, 1, false]);
  noErrors(page);
});

test('Big Yawn not rung: +40 pep, asleep again with a full meter to fill and the lullaby; Six-Seven cancels it on NORMAL, not on HARD', async ({ page }) => {
  await boot(page, save({ stars: OCEAN_DONE, xp: XP[9] }));
  await duel(page, 'thully', 'normal');
  const r = await page.evaluate(async () => {
    __psWake(); const b = __game.scene.getScene('battle'), T = b.rival, y = b.rmoves.find(m => m.type === 'yawn');
    T.hp = 100; await b.startCharge(y, T); await b.rivalTurn0();
    return [T.hp, T.asleep, T.meter, PSAudio._want, !!T.charging];
  });
  expect(r).toEqual([140, true, 0, 'lullaby', false]);
  const six = await page.evaluate(async () => {
    __psWake(); const b = __game.scene.getScene('battle'), T = b.rival, y = b.rmoves.find(m => m.type === 'yawn');
    await b.startCharge(y, T); T.dizzy = true; await b.rivalTurn0(); return [T.asleep, !!T.charging];
  });
  expect(six).toEqual([false, false]);
  await duel(page, 'thully', 'hard');
  const hard = await page.evaluate(async () => {
    __psWake(); const b = __game.scene.getScene('battle'), T = b.rival, y = b.rmoves.find(m => m.type === 'yawn');
    await b.startCharge(y, T); T.dizzy = true; await b.rivalTurn0(); return [T.asleep, !!T.charging];
  });
  expect(hard).toEqual([true, false]);
  noErrors(page);
});

test('Captain\'s Nap: ALARM! = no dizzy (I\'M AWAKE, SIR!); not rung = +20 and no sleep phase; music sea, no crown', async ({ page }) => {
  await boot(page, save({ stars: OCEAN_DONE, xp: XP[9], stats: { alarmSeen: 1 } }));
  await duel(page, 'fog', 'normal');
  expect(await page.evaluate(() => [PSAudio._want, !!__game.scene.getScene('battle').R.boss])).toEqual(['sea', false]);
  await page.evaluate(async () => { const b = __game.scene.getScene('battle'); await b.startCharge(b.rmoves.find(m => m.type === 'yawn'), b.rival); b.setCards(true); });
  expect(await page.evaluate(() => { const b = __game.scene.getScene('battle'); return [b.alarmBtn.visible, b.alarmHand.visible]; })).toEqual([true, false]);
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.rivalTurn = async () => { b.rivalSeen = b.rival.dizzy; }; b.alarmBtn.emit('pointerup'); });
  await waitTurn(page, 120000);
  expect(await page.evaluate(() => { const b = __game.scene.getScene('battle'); delete b.rivalTurn; return [b.rivalSeen, b.logT.text.length > 0, __save.data.stats.alarms]; })).toEqual([false, true, 1]);
  const nap = await page.evaluate(async () => { const b = __game.scene.getScene('battle'), T = b.rival; T.hp = 100; await b.startCharge(b.rmoves.find(m => m.type === 'yawn'), T); await b.rivalTurn0(); return [T.hp, !!T.asleep, PSAudio._want]; });
  expect(nap).toEqual([120, false, 'sea']);
  noErrors(page);
});

test('rotation while Thully sleeps keeps the pose, the meter and the lullaby', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, save({ stars: OCEAN_DONE, xp: XP[9] }));
  await duel(page, 'thully', 'normal');
  await page.evaluate(async () => { window.__oldGame = __game; const b = __game.scene.getScene('battle'); await b.impact(b.rival, 10); });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.__game && window.__game !== window.__oldGame && __game.scene.isActive('battle') && __game.scene.getScene('battle').hero, null, { timeout: 90000 });
  await fast(page); await wait(page, 1000);
  const r = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return [b.rival.asleep, b.rival.meter, PSAudio._want, !!b.meterBox, b.rival.max - b.rival.hp]; });
  expect(r).toEqual([true, 1, 'lullaby', true, 5]);
  noErrors(page);
});

test('beating Sleepy Thully: Nightcap costume (first win only), crown on the map node, Good Morning! sticker', async ({ page }) => {
  await boot(page, save({ stars: OCEAN_DONE, xp: XP[9] }));
  for (let k = 0; k < 2; k++) {
    await go(page, 'battle', { rival: await idx(page, 'thully') });
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
    await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 90000 }).toBe(true);
    const notes = await page.evaluate(() => __game.scene.getScene('battle').shown.notes.join(' | '));
    if (k === 0) { expect(notes).toContain('New costume: Nightcap! Put it on in Me'); expect(notes).toContain('NEW WORLD: VEGGIE PATCH! Rival: Olly the Onion'); }
    else expect(notes).not.toContain('Nightcap');
  }
  await wait(page, 3000);
  expect(await page.evaluate(() => [__save.data.costumes.nightcap, !!__save.data.ach.thully])).toEqual([true, true]);
  await page.evaluate(() => { __save.data.costume = 'nightcap'; });
  await go(page, 'map', { world: 3 });
  const crown = await page.evaluate(() => __game.scene.getScene('map').children.list.filter(o => o.type === 'Container' && o.list.some(x => x.texture && x.texture.key === 'thully')).map(c => c.list.some(x => x.texture && x.texture.key === 'crown')));
  expect(crown).toEqual([true]);
  await duel(page, 'hermy');
  expect(await page.evaluate(() => { const h = __game.scene.getScene('battle').hero.hat; return h && h.texture.key; })).toBe('nightcap');
  noErrors(page);
});

test('save migration mig10 + mig11: an old Spooky lastWorld (3) becomes 6; players past Sasquatch find Ocean open', async ({ page }) => {
  const old = save({ stars: CANADA_DONE, lastWorld: 3 }); delete old.mig10;
  await boot(page, old, '&halloween');
  expect(await page.evaluate(() => [__save.data.lastWorld, __save.data.mig10, __save.data.mig11])).toEqual([6, 1, 1]);
  await go(page, 'map');
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(6);
  await go(page, 'map', { world: 3 });
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(3);
  noErrors(page);
});

test('save migration out of season: lastWorld 3 from an old save opens a valid world', async ({ page }) => {
  await page.addInitScript(() => {
    const D = Date, off = new D('2026-11-20T10:00:00').getTime() - D.now();
    class FD extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
    window.Date = FD;
  });
  const old = save({ lastWorld: 3 }); delete old.mig10;
  await boot(page, old);
  await go(page, 'map');
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(1); // the furthest open world (Space), not the missing Spooky
  noErrors(page);
});

for (const [tag, vp] of Object.entries(SIZES)) test(`map: 5 Ocean nodes and 7 tabs fit, nothing overlaps (${tag})`, async ({ page }) => {
  await page.setViewportSize(vp);
  await boot(page, save({ stars: Object.assign({}, OCEAN_DONE, { thully: 1 }) }), '&halloween');
  for (const w of [3, 2]) {
    await go(page, 'map', { world: w });
    const r = await page.evaluate(() => {
      const s = __game.scene.getScene('map');
      // per node: the disc, the name and the star row (at rest scale); plus the hero marker
      const nodes = s.children.list.filter(o => o.type === 'Container' && o.depth === 4).map(c => { const sc = c.scaleX; c.setScale(s.ns);
        const R = (c.height - 120) / 2, parts = [[c.x - R * s.ns, c.y - R * s.ns, 2 * R * s.ns, 2 * R * s.ns]];
        c.list.filter(o => o.type === 'Text' || (o.texture && o.texture.key === 'star')).forEach(o => { const b = o.getBounds(); parts.push([b.x, b.y, b.width, b.height]); });
        c.setScale(sc); return parts; });
      const mk = s.children.list.find(o => o.type === 'Image' && o.depth === 5); if (mk) { const b = mk.getBounds(); nodes.push([[b.x, b.y, b.width, b.height]]); }
      const tabs = s.children.list.filter(o => o.type === 'Container' && o.depth === 6 && o.height === 96).map(c => ({ w: c.width, x: c.x, name: c.list.find(o => o.type === 'Text').visible, size: c.list.find(o => o.type === 'Text').scaleX * 40 }));
      return { nodes, tabs };
    });
    expect(r.tabs.length).toBe(7); // v1.1: Countryballs + Spooky; all icon tabs, 90 px+ (a 4:3 iPad in landscape squeezes them a little)
    r.tabs.forEach(t => expect(t.w).toBeGreaterThanOrEqual(90));
    expect(r.tabs.filter(t => t.name).length).toBe(0);
    expect(r.nodes.length).toBe(w === 3 ? 6 : 5); // nodes + the hero marker
    for (let i = 0; i < r.nodes.length; i++) for (let j = i + 1; j < r.nodes.length; j++) for (const a of r.nodes[i]) for (const b of r.nodes[j]) {
      const ox = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), oy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
      expect(ox > 6 && oy > 6, `nodes ${i} and ${j} overlap on ${tag}: ${a.map(Math.round)} / ${b.map(Math.round)}`).toBe(false);
    }
    expect(await offscreen(page, 'map')).toEqual([]);
  }
  noErrors(page);
});
