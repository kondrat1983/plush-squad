// v1.1 Countryballs (docs/gdd/1.1-countryballs.md): rivals and unlock after Brock Lee, COPYCAT! (copy, nap / dance flops, heal copy,
// Mini Copycat, EASY flops, HARD without strips, the AI rules), Poland's PUSH! (full push, no push, HARD little push, uses per difficulty),
// mig11, the Pierogi Hat, stickers and quests, result() in Countryballs duels, 7 map tabs with the event, rotation with a copy armed
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, waitTurn, offscreen, noErrors } = require('./helpers');

const save = extra => Object.assign({}, BASE_SAVE, extra);
const VEG_DONE = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 3, polandball: 3, ghost: 3, dragonboss: 3, moose: 3, beaver: 3, mountie: 3, sasquatch: 3,
  hermy: 3, puff: 3, jelly: 3, fog: 3, thully: 3, onion: 1, peas: 1, garlic: 1, fungi: 1, brocklee: 1 };
const BALLS_OPEN = Object.assign({}, VEG_DONE, { england: 1, spain: 1, japan: 1, usa: 1 });
const idx = (page, id) => page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);
const B = () => __game.scene.getScene('battle');

async function duel(page, id, diff = 'normal') {
  await page.evaluate(d => { __save.data.diff = d; }, diff);
  await go(page, 'battle', { rival: await idx(page, id) });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page);
}
const settle = async page => { await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => { const b = __game.scene.getScene('battle'); return !b.busy || b.over; }); }, { timeout: 180000 }).toBe(true); };
// the rival plays his COPYCAT! now (as on his turn): fresh pep on both sides first, so a few rounds never end the duel
const armNow = page => page.evaluate(async () => {
  const b = __game.scene.getScene('battle'), m = b.rmoves.find(x => x.type === 'copy');
  b.hero.hp = b.hero.max; b.hero.bar.set(b.hero.hp, b); b.rival.hp = b.rival.max; b.rival.bar.set(b.rival.hp, b); b.rival.shield = false; b.hero.shield = false;
  b.busy = true; await b.doMove(m, b.rival, b.hero); b.busy = false; b.setCards(true);
  return { copy: !!b.copy, chip: !!b.copyChip, labels: Object.fromEntries(b.moves.map(x => [x.k, x.card.copyLabel])), hand: !!b.copyHand };
});
const st = page => page.evaluate(() => { const b = __game.scene.getScene('battle'); return { h: b.hero.hp, r: b.rival.hp, copy: !!b.copy, log: b.logT.text, stats: Object.assign({}, __save.data.stats) }; });
// plays the player's move k with a COPYCAT! armed; returns what the player dealt and what the copy did to the hero (+ = damage)
async function playCopied(page, k) {
  const s0 = await st(page);
  await page.evaluate(k => { window.__dealt = null; const b = __game.scene.getScene('battle'); b.playerMove(k); const t = setInterval(() => { if (b.copy && b.copy.rec && !b.copyRec) { window.__dealt = b.copy.rec.hits.slice(); window.__hp1 = [b.hero.hp, b.rival.hp]; clearInterval(t); } }, 20); }, k);
  await settle(page);
  const s1 = await st(page), mid = await page.evaluate(() => ({ dealt: window.__dealt, hp1: window.__hp1 }));
  return { s0, s1, dealt: (mid.dealt || []).reduce((a, b) => a + b, 0), hits: mid.dealt, heroAfterMove: mid.hp1 ? mid.hp1[0] : null, rivalAfterMove: mid.hp1 ? mid.hp1[1] : null };
}

test('Countryballs: 5 rivals after Brock Lee (ids, numbers, pictures), polandball is still The Blips; opens after one Brock Lee star', async ({ page }) => {
  await boot(page, save({ stars: Object.assign({}, VEG_DONE, { brocklee: 0 }) }), '&halloween');
  const r = await page.evaluate(() => __RIVALS.filter(r => r.world === 5).map(r => [r.id, r.hp, r.xp, !!r.boss, r.big || 1, __game.textures.exists(r.tex) && __game.textures.get(r.tex).key !== '__MISSING']));
  expect(r).toEqual([['england', 175, 190, false, 1, true], ['spain', 185, 200, false, 1, true], ['japan', 195, 210, false, 1, true], ['usa', 205, 220, false, 1.05, true], ['poland', 250, 260, true, 1.15, true]]);
  const order = await page.evaluate(() => __RIVALS.map(r => r.id));
  const i = order.indexOf('england');
  expect(order.slice(i - 1, i + 6)).toEqual(['brocklee', 'england', 'spain', 'japan', 'usa', 'poland', 'pumpkin']);
  expect(await page.evaluate(() => { const b = __RIVALS.find(r => r.id === 'polandball'); return [b.name, b.world, __RIVALS.find(r => r.id === 'pumpkin').world, __RIVALS.find(r => r.id === 'poland').reward]; })).toEqual(['The Blips', 1, 6, 'pierogi']);
  expect(await page.evaluate(() => ['teacup', 'bull', 'paella', 'sushi', 'burger', 'globe', 'balloon', 'sky7', 'ground7'].filter(k => !__game.textures.exists(k)))).toEqual([]);
  await go(page, 'map', { world: 5 });
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).not.toBe(5);
  const hint = await page.evaluate(() => { const m = __game.scene.getScene('map'); m.children.list.filter(o => o.type === 'Container' && o.depth === 6 && o.height === 96)[5].emit('pointerup'); return m._hint && m._hint.text; });
  expect(hint).toBe('Beat Brock Lee to open COUNTRYBALLS!');
  await page.evaluate(() => { __save.data.stars.brocklee = 1; });
  await go(page, 'map', { world: 5 });
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(5);
  // only Poland wears a crown on the map
  const crowns = await page.evaluate(() => __game.scene.getScene('map').children.list.filter(o => o.type === 'Container' && o.depth === 4).map(c => c.list.some(x => x.texture && x.texture.key === 'crown')));
  expect(crowns).toEqual([false, false, false, false, true]);
  noErrors(page);
});

test('COPYCAT! on NORMAL: the strips say what comes back; a hit, Tail Spin and Inferno Rain come back with the same numbers; a heal is copied', async ({ page }) => {
  test.setTimeout(900000);
  await boot(page, save({ stars: BALLS_OPEN, stats: { copySeen: 1 } }));
  await duel(page, 'spain', 'normal');
  const a = await armNow(page);
  expect([a.copy, a.chip, a.hand]).toEqual([true, true, false]);
  expect(a.labels).toMatchObject({ pillow: 'COPY: 12-20 at you', tailspin: 'COPY: 15-27 at you', nap: 'COPY: flops!', sixseven: 'COPY: flops!', dumpling: 'COPY: heals him', inferno: 'COPY: 22-30 at you' });
  expect(await page.evaluate(() => { const b = __game.scene.getScene('battle'); return [b.rival.spr.tintTopLeft, b.rival.spr.isTinted]; })).toEqual([0x7fd6c2, true]); // C.mint
  for (const k of ['pillow', 'tailspin', 'inferno']) {
    if (k !== 'pillow') await armNow(page);
    const p = await playCopied(page, k);
    expect(p.dealt, k).toBeGreaterThan(0);
    expect(p.heroAfterMove - p.s1.h, k).toBe(p.dealt); // the copy hits the hero with the very same total
    expect(p.s1.copy).toBe(false);
  }
  await armNow(page);
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.rival.hp = 100; b.rival.bar.set(100, b); });
  const hl = await playCopied(page, 'dumpling');
  expect(hl.s1.r - 100).toBe(20);
  expect(await page.evaluate(() => [__game.scene.getScene('battle').rival.lastType, __game.scene.getScene('battle').rival.afterCharge])).toEqual(['copy', true]);
  noErrors(page);
});

test('COPYCAT! flops: Upside-Down Nap ("Balls can\'t nap upside down!") and Six-Seven (too dizzy); Mirror Master after 5 flops', async ({ page }) => {
  test.setTimeout(900000);
  await boot(page, save({ stars: BALLS_OPEN, stats: { copySeen: 1, copyFlops: 3 } }));
  await duel(page, 'japan', 'normal');
  await armNow(page);
  let p = await playCopied(page, 'nap');
  expect(p.s1.h).toBe(p.heroAfterMove); // nothing comes back
  expect(p.s1.log).toContain('Balls can\'t nap upside down!');
  expect(p.s1.stats.copyFlops).toBe(4);
  await armNow(page);
  p = await playCopied(page, 'sixseven');
  expect(p.s1.h).toBe(p.heroAfterMove);
  expect(p.s1.log).toContain('too dizzy to copy');
  expect(p.s1.stats.copyFlops).toBe(5);
  expect(await page.evaluate(() => { PSExtra.checkAch(); return !!__save.data.ach.copycat5; })).toBe(true);
  noErrors(page);
});

test('Mini Copycat (England): the first COPYCAT! ever shows the hand on the nap card; a copied hit does half', async ({ page }) => {
  test.setTimeout(600000);
  await boot(page, save({ stars: BALLS_OPEN }));
  await duel(page, 'england', 'normal');
  const a = await armNow(page);
  expect(a.hand).toBe(true);
  expect(a.labels.pillow).toBe('COPY: 6-10 at you');
  const hand = await page.evaluate(() => { const b = __game.scene.getScene('battle'), c = b.moves.find(m => m.k === 'nap').card; return [Math.abs(b.copyHand.x - c.x) < c.width / 2, Math.abs(b.copyHand.y - c.y) < c.height / 2, b.logT.text]; });
  expect(hand.slice(0, 2)).toEqual([true, true]);
  expect(hand[2]).toContain('Try the nap!');
  const p = await playCopied(page, 'pillow');
  expect(p.heroAfterMove - p.s1.h).toBe(Math.max(1, Math.round(p.dealt / 2)));
  expect(p.s1.stats.copySeen).toBe(1);
  await armNow(page);
  expect(await page.evaluate(() => !!__game.scene.getScene('battle').copyHand)).toBe(false); // once only
  noErrors(page);
});

test('COPYCAT! on EASY: every copy flops (wet paint), strips shown, the best card glows; HARD: no strips', async ({ page }) => {
  test.setTimeout(600000);
  await boot(page, save({ stars: BALLS_OPEN, stats: { copySeen: 1 } }));
  await duel(page, 'usa', 'easy');
  const a = await armNow(page);
  expect(a.labels).toMatchObject({ pillow: 'COPY: flops!', dumpling: 'COPY: flops!', inferno: 'COPY: flops!' });
  expect(await page.evaluate(() => __game.scene.getScene('battle').moves.filter(m => m.card.list[11].visible).map(m => m.k))).toEqual(['inferno']);
  const p = await playCopied(page, 'pillow');
  expect(p.s1.h).toBe(p.heroAfterMove);
  expect(p.s1.log).toContain('The paint is still wet!');
  await duel(page, 'usa', 'hard');
  const h = await armNow(page);
  expect(h.copy).toBe(true);
  expect(Object.values(h.labels).filter(Boolean)).toEqual([]);
  noErrors(page);
});

test('the AI: no COPYCAT! twice in a row, after a charge or while the hero is dizzy; no launch right after a copy', async ({ page }) => {
  await boot(page, save({ stars: BALLS_OPEN }));
  await duel(page, 'poland', 'normal');
  const picks = await page.evaluate(() => {
    const b = __game.scene.getScene('battle'), T = b.rival, P = b.hero, out = [];
    const run = () => { T.used = {}; T.hp = T.max; for (let i = 0; i < 150; i++) out.push(b.pickMove().type); };
    T.lastType = 'copy'; T.afterCharge = true; P.dizzy = false; run(); // the turn after a copy (a copy counts as a charge)
    T.lastType = 'volley'; T.afterCharge = true; run();
    T.afterCharge = false; P.dizzy = true; run(); P.dizzy = false;
    T.lastType = 'volley'; T.afterCharge = false; const free = []; for (let i = 0; i < 200; i++) { T.used = {}; free.push(b.pickMove().type); }
    return { out, free };
  });
  expect(picks.out).not.toContain('copy');
  expect(picks.out.slice(0, 300)).not.toContain('launch');
  expect(picks.free).toContain('copy');
  expect(picks.free).toContain('launch');
  noErrors(page);
});

test('launch uses: EASY 1, NORMAL 2, HARD 3; copy uses; parade music for the balls, boss music for Poland', async ({ page }) => {
  test.setTimeout(900000);
  await boot(page, save({ stars: BALLS_OPEN }));
  const uses = () => page.evaluate(() => { const b = __game.scene.getScene('battle'); return [b.rmoves.find(m => m.type === 'launch').uses, b.rmoves.find(m => m.type === 'copy').uses, PSAudio._want]; });
  await duel(page, 'poland', 'easy'); expect(await uses()).toEqual([1, 1, 'boss']);
  await duel(page, 'poland', 'normal'); expect(await uses()).toEqual([2, 1, 'boss']);
  await duel(page, 'poland', 'hard'); expect(await uses()).toEqual([3, 2, 'boss']);
  await duel(page, 'usa', 'hard');
  expect(await page.evaluate(() => [__game.scene.getScene('battle').rmoves.find(m => m.type === 'copy').uses, PSAudio._want, !!__game.scene.getScene('battle').R.boss])).toEqual([3, 'parade', false]);
  noErrors(page);
});

// Poland starts his countdown now (as on his turn), then it is the player's turn
const countdown = page => page.evaluate(async () => {
  const b = __game.scene.getScene('battle'), T = b.rival, m = b.rmoves.find(x => x.type === 'launch');
  b.hero.hp = 80; b.hero.bar.set(80, b);
  b.busy = true; T.used[m.k] = (T.used[m.k] || 0) + 1; T.lastType = m.type; T.afterCharge = false; await b.startCharge(m, T); b.busy = false; b.setCards(true);
  return { push: b.pushBtn.visible, hand: b.alarmHand.visible, block: b.blockBtn.visible || b.extBtn.visible || b.umbBtn.visible, rocket: !!b.rocketImg, label: b.pushBtn.list[1].text };
});

test('PUSH! (NORMAL): Poland can into space, waves from orbit, drops a Space Pierogi (+10) and floats down; Mission Control counts', async ({ page }) => {
  test.setTimeout(600000);
  await boot(page, save({ stars: BALLS_OPEN, stats: { pushes: 4 } }));
  await duel(page, 'poland', 'normal');
  const c = await countdown(page);
  expect(c).toEqual({ push: true, hand: true, block: false, rocket: true, label: 'PUSH!' });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'), o = b.orbitTurn.bind(b); b.orbitTurn = async T => { window.__orbited = true; return o(T); }; b.playerPush(); });
  await settle(page);
  expect(await page.evaluate(() => window.__orbited)).toBe(true);
  const r = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return { h: b.hero.hp, orbit: b.rival.orbit, ch: b.rival.charging, y: Math.round(b.rival.root.y) === Math.round(b.groundY), sc: b.rival.root.scale, stats: __save.data.stats, log: b.logT.text }; });
  expect([r.h, r.orbit, r.ch, r.y, r.sc]).toEqual([90, false, null, true, 1]);
  expect([r.stats.pushes, r.stats.pushSeen]).toEqual([5, 1]);
  expect(await page.evaluate(() => { PSExtra.checkAch(); return !!__save.data.ach.push5; })).toBe(true);
  expect((await countdown(page)).hand).toBe(false); // the hand only the first time on NORMAL
  noErrors(page);
});

test('no PUSH!: the rocket fizzles and Poland falls on the hero (24-30); EASY: one launch, a hand, +15; HARD: a little push off the GO!', async ({ page }) => {
  test.setTimeout(900000);
  await boot(page, save({ stars: BALLS_OPEN, stats: { pushSeen: 1 } }));
  await duel(page, 'poland', 'normal');
  await countdown(page);
  await page.evaluate(() => { window.__psPush = 'skip'; __game.scene.getScene('battle').autoPush(); });
  // the player's card hits first, then the fall: measure the hero only
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => { const b = __game.scene.getScene('battle'); return !b.rival.charging && !b.busy; }); }, { timeout: 180000 }).toBe(true);
  const n = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return [80 - b.hero.hp, b.rival.charging, b.logT.text]; });
  expect(n[0]).toBeGreaterThanOrEqual(24); expect(n[0]).toBeLessThanOrEqual(30);
  expect(n[1]).toBe(null);
  expect(n[2]).toContain('Cannot into space... YET!');
  await page.evaluate(() => { window.__psPush = null; });
  await duel(page, 'poland', 'easy');
  expect((await countdown(page)).hand).toBe(true);
  await page.evaluate(() => __game.scene.getScene('battle').playerPush());
  await settle(page);
  expect(await page.evaluate(() => __game.scene.getScene('battle').hero.hp)).toBe(95);
  await duel(page, 'poland', 'hard');
  const h = await countdown(page);
  expect(h.hand).toBe(false);
  await expect.poll(async () => { await wait(page, 300); return page.evaluate(() => __game.scene.getScene('battle').pushBtn.list[1].text); }, { timeout: 30000 }).toMatch(/^(3|2|1|GO!)$/);
  const p0 = await page.evaluate(() => __save.data.stats.pushes || 0);
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); window.__psPush = 'soft'; b.afterPlayer = async () => { b.busy = false; b.setCards(true); }; b.playerPush(); });
  await settle(page);
  const s = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return [!!b.rival.orbit, b.rival.charging, b.hero.hp, __save.data.stats.pushes || 0, b.pushBtn.visible, b.pushBtn.list[1].text]; });
  expect(s).toEqual([false, null, 80, p0, false, 'PUSH!']);
  await page.evaluate(() => { window.__psPush = null; });
  noErrors(page);
});

test('save migration mig11: lastWorld 5 (Spooky in v1.0) becomes 6; a v1.1 save keeps 5 (Countryballs)', async ({ page }) => {
  const old = save({ stars: BALLS_OPEN, lastWorld: 5 }); delete old.mig11;
  await boot(page, old, '&halloween');
  expect(await page.evaluate(() => [__save.data.lastWorld, __save.data.mig11])).toEqual([6, 1]);
  await go(page, 'map');
  expect(await page.evaluate(() => [__game.scene.getScene('map').world, __game.scene.getScene('map').children.list.filter(o => o.type === 'Container' && o.depth === 4).some(c => c.list.some(x => x.texture && x.texture.key === 'pumpkin'))])).toEqual([6, true]);
  await page.evaluate(() => { __save.data.lastWorld = 5; __save.store(); });
  await page.reload();
  await page.waitForFunction(() => window.__game && __game.scene.getScenes(true).length > 0, null, { timeout: 60000 }); await fast(page);
  expect(await page.evaluate(() => __save.data.lastWorld)).toBe(5);
  await go(page, 'map');
  expect(await page.evaluate(() => __game.scene.getScene('map').world)).toBe(5);
  noErrors(page);
});

test('beating Poland: Pierogi Hat (first win only) worn in duels, Liftoff! sticker; 3 stickers and 6 quests in the pools', async ({ page }) => {
  test.setTimeout(600000);
  await boot(page, save({ stars: BALLS_OPEN }));
  for (let k = 0; k < 2; k++) {
    await go(page, 'battle', { rival: await idx(page, 'poland') });
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
    await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 90000 }).toBe(true);
    const notes = await page.evaluate(() => __game.scene.getScene('battle').shown.notes.join(' | '));
    if (k === 0) expect(notes).toContain('New costume: Pierogi Hat! Put it on in Me'); else expect(notes).not.toContain('Pierogi Hat');
  }
  await wait(page, 3000);
  expect(await page.evaluate(() => [__save.data.costumes.pierogi, !!__save.data.ach.poland])).toEqual([true, true]);
  await page.evaluate(() => { __save.data.costume = 'pierogi'; });
  await duel(page, 'england');
  expect(await page.evaluate(() => { const h = __game.scene.getScene('battle').hero.hat; return h && h.texture.key; })).toBe('dumpling');
  const pools = await page.evaluate(() => ({ ach: PSExtra.ACH.map(a => a.id), q: PSExtra.QUESTS.map(q => q.id), badges: ['england', 'spain', 'japan', 'usa', 'poland'].map(k => PSToys.BADGES[k]) }));
  for (const id of ['poland', 'push5', 'copycat5']) expect(pools.ach).toContain(id);
  for (const id of ['hello3', 'globe', 'teaparty', 'cookworld', 'catch', 'myflag']) expect(pools.q).toContain(id);
  expect(pools.badges).toEqual([['england'], ['spain'], ['japan'], ['usa'], ['poland', 1]]);
  noErrors(page);
});

// result() in Countryballs duels, win and lose (CLAUDE.md: the result screen in every mode)
for (const id of ['england', 'poland']) for (const won of [true, false]) {
  test(`result screen: ${id} (${id === 'poland' ? 'campaign boss' : 'campaign'}) ${won ? 'win' : 'lose'}`, async ({ page }) => {
    await boot(page, save({ stars: Object.assign({}, BALLS_OPEN, id === 'england' ? { england: 0, spain: 0, japan: 0, usa: 0 } : {}) }));
    await go(page, 'battle', { rival: await idx(page, id) });
    const xp0 = await page.evaluate(() => __save.data.xp);
    await page.evaluate(won => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); if (won) b.rival.hp = 0; else b.hero.hp = 0; b.finish(won); }, won);
    await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __save.data.xp); }, { timeout: 90000 }).toBeGreaterThan(xp0);
    const sh = await page.evaluate(() => __game.scene.getScene('battle').shown);
    expect(sh.won).toBe(won);
    if (won && id === 'england') expect(sh.notes.join(' | ')).toContain('New rival unlocked: Spain!');
    if (won && id === 'england') expect(sh.gain).toBe(190 + 20);
    noErrors(page);
  });
}

test('Brock Lee\'s first win opens COUNTRYBALLS (result note), its comic plays once on the way in', async ({ page }) => {
  test.setTimeout(600000);
  const comics = Object.assign({}, BASE_SAVE.comics); delete comics.countryballs;
  await boot(page, save({ stars: Object.assign({}, VEG_DONE, { brocklee: 0 }), comics }));
  await go(page, 'battle', { rival: await idx(page, 'brocklee') });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!__game.scene.getScene('battle').shown); }, { timeout: 90000 }).toBe(true);
  expect(await page.evaluate(() => __game.scene.getScene('battle').shown.notes.join(' | '))).toContain('NEW WORLD: COUNTRYBALLS! Rival: England');
  await page.evaluate(() => __game.scene.getScenes(true)[0].scene.start('map', { world: 5 }));
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __game.scene.getScenes(true).map(s => s.scene.key)); }, { timeout: 60000 }).toEqual(['comic']);
  expect(await page.evaluate(() => __game.scene.getScene('comic').id)).toBe('countryballs');
  await page.evaluate(() => __game.scene.getScene('comic').skipBtn.emit('pointerup'));
  expect(await page.evaluate(() => [__save.data.comics.countryballs, !!__game.scene.getScene('comic').peekBall.visible])).toEqual([true, true]);
  noErrors(page);
});

test('rotation with a COPYCAT! armed: the copy, the chip and the strips come back; the copy resolves once', async ({ page }) => {
  test.setTimeout(600000);
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, save({ stars: BALLS_OPEN, stats: { copySeen: 1 } }));
  await duel(page, 'spain', 'normal');
  await armNow(page);
  await page.evaluate(() => { window.__oldGame = __game; });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.__game && window.__game !== window.__oldGame && __game.scene.isActive('battle') && __game.scene.getScene('battle').hero, null, { timeout: 90000 });
  await fast(page); await wait(page, 1000);
  const r = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return [!!b.copy, !!b.copyChip, b.moves.find(m => m.k === 'pillow').card.copyLabel, b.rival.spr.isTinted]; });
  expect(r).toEqual([true, true, 'COPY: 12-20 at you', true]);
  const p = await playCopied(page, 'pillow');
  expect(p.heroAfterMove - p.s1.h).toBe(p.dealt);
  expect(p.s1.copy).toBe(false);
  noErrors(page);
});

// the map during the event: 7 tabs (Countryballs + Spooky), 90 px+, no overlaps, nothing off screen; the 5 Countryballs nodes do not overlap
const SIZES = { 'iPhone portrait': { width: 390, height: 844 }, 'iPhone landscape': { width: 844, height: 390 }, 'iPad portrait': { width: 768, height: 1024 }, 'iPad landscape': { width: 1024, height: 768 } };
for (const [tag, vp] of Object.entries(SIZES)) test(`map with ?halloween: 7 tabs and 5 Countryballs nodes fit, nothing overlaps (${tag})`, async ({ page }) => {
  await page.setViewportSize(vp);
  await boot(page, save({ stars: BALLS_OPEN }), '&halloween');
  await go(page, 'map', { world: 5 });
  const r = await page.evaluate(() => {
    const s = __game.scene.getScene('map');
    const tabs = s.children.list.filter(o => o.type === 'Container' && o.depth === 6 && o.height === 96).map(c => ({ l: c.x - c.width / 2, r: c.x + c.width / 2, w: c.width }));
    const nodes = s.children.list.filter(o => o.type === 'Container' && o.depth === 4).map(c => { const sc = c.scaleX; c.setScale(s.ns);
      const R = (c.height - 120) / 2, parts = [[c.x - R * s.ns, c.y - R * s.ns, 2 * R * s.ns, 2 * R * s.ns]];
      c.list.filter(o => o.type === 'Text' || (o.texture && o.texture.key === 'star')).forEach(o => { const b = o.getBounds(); parts.push([b.x, b.y, b.width, b.height]); });
      c.setScale(sc); return parts; });
    const lvl = s.children.list.find(o => o.type === 'Text' && /Level/.test(o.text)).text;
    return { tabs, nodes, lvl };
  });
  expect(r.tabs.length).toBe(7);
  r.tabs.forEach(t => expect(t.w).toBeGreaterThanOrEqual(90));
  for (let i = 1; i < r.tabs.length; i++) expect(r.tabs[i].l).toBeGreaterThanOrEqual(r.tabs[i - 1].r + 10);
  expect(r.lvl).toContain('FLAGS');
  expect(r.nodes.length).toBe(5);
  for (let i = 0; i < r.nodes.length; i++) for (let j = i + 1; j < r.nodes.length; j++) for (const a of r.nodes[i]) for (const b of r.nodes[j]) {
    const ox = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), oy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
    expect(ox > 6 && oy > 6, `nodes ${i} and ${j} overlap on ${tag}`).toBe(false);
  }
  expect(await offscreen(page, 'map')).toEqual([]);
  noErrors(page);
});

test('COPYCAT! strips match the copy: hero booster per hit, ROCKET START!, his shield; Mini Copycat rounds per hit', async ({ page }) => {
  test.setTimeout(600000);
  await boot(page, save({ stars: BALLS_OPEN, stats: { copySeen: 1 } }));
  await duel(page, 'spain', 'normal');
  await armNow(page);
  const lab = await page.evaluate(() => {
    const b = __game.scene.getScene('battle'), L = k => b.copyLabel(b.moves.find(m => m.k === k));
    const o = { plain: [L('pillow'), L('tailspin')] };
    b.hero.bonus = 5; o.bonus = [L('pillow'), L('tailspin')];
    b.hero.firstBonus = 4; o.first = [L('pillow'), L('tailspin')];
    b.rival.shield = true; o.shield = L('pillow');
    return o;
  });
  expect(lab.plain).toEqual(['COPY: 12-20 at you', 'COPY: 15-27 at you']);
  expect(lab.bonus).toEqual(['COPY: 17-25 at you', 'COPY: 30-42 at you']);
  expect(lab.first).toEqual(['COPY: 21-29 at you', 'COPY: 34-46 at you']);
  expect(lab.shield).toBe('COPY: 11-15 at you');
  // what really comes back lies inside the strip
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.hero.firstBonus = 0; b.hero.bonus = 0; b.rival.shield = false; });
  await armNow(page);
  const strip = await page.evaluate(() => __game.scene.getScene('battle').moves.find(m => m.k === 'pillow').card.copyLabel);
  const [lo, hi] = strip.match(/(\d+)-(\d+)/).slice(1).map(Number);
  await page.evaluate(() => { __game.scene.getScene('battle').hero.bonus = 5; });
  const p = await playCopied(page, 'pillow');
  expect(p.dealt).toBeGreaterThanOrEqual(lo + 5); expect(p.dealt).toBeLessThanOrEqual(hi + 5);
  expect(p.heroAfterMove - p.s1.h).toBe(p.dealt);
  // Mini Copycat: half per hit, rounded like copyMove does
  await duel(page, 'england', 'normal');
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.copy = { k: 0, mini: true }; b.hero.bonus = 3; });
  const mini = await page.evaluate(() => { const b = __game.scene.getScene('battle'), m = b.moves.find(x => x.k === 'tailspin'), h = v => Math.max(1, Math.round((v + 3) / 2)); return [b.copyLabel(m), 'COPY: ' + 3 * h(m.dmg[0]) + '-' + 3 * h(m.dmg[1]) + ' at you']; });
  expect(mini[0]).toBe(mini[1]);
  noErrors(page);
});

test('COPYCAT! log line after the paint fits 2 lines in portrait (390x844)', async ({ page }) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, save({ stars: BALLS_OPEN, stats: { copySeen: 1 } }));
  await duel(page, 'spain', 'normal');
  await armNow(page);
  const r = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return { lines: b.logT.getWrappedText().length, text: b.logT.text }; });
  expect(r.text).toContain('JACKBALL!');
  expect(r.lines).toBeLessThanOrEqual(2);
  noErrors(page);
});

test('PUSH! on HARD counts the press: down on GO!, lifted after the loop wrapped, still a full push', async ({ page }) => {
  test.setTimeout(600000);
  await boot(page, save({ stars: BALLS_OPEN, stats: { pushSeen: 1 } }));
  await duel(page, 'poland', 'hard');
  expect((await countdown(page)).push).toBe(true);
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.afterPlayer = async () => { b.busy = false; b.setCards(true); }; b.pushT0 = performance.now() - 1300; b.pushBtn.emit('pointerdown'); b.pushT0 = performance.now() - 100; b.pushBtn.emit('pointerup'); });
  await settle(page);
  expect(await page.evaluate(() => !!__game.scene.getScene('battle').rival.orbit)).toBe(true);
  noErrors(page);
});
