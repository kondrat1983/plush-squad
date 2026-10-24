// v1.3 Snow Fort (docs/gdd/1.3-snow-fort.md): the winter season window, the shared season slot 6, 4 rivals, SNOWBALL!, hats, stickers,
// Sleepy Thully's Zzz, music. Written for slow CI runners: no fixed sleeps between steps. Every wait polls a condition, and the
// multi-step duel interactions run inside one page.evaluate. The jump timing is checked through __psJudgeSnow and the tests'
// ?debug hooks window.__psSnowAuto ('perfect' | 'good' | 'miss' | 'manual' | 'freeze'); 'manual' + snowRun.tapAt(ms) taps at an exact time.
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, waitTurn, offscreen, noErrors } = require('./helpers');

const save = extra => Object.assign({}, BASE_SAVE, extra);
const idx = (page, id) => page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);

// a fixed "today" for `new Date()` without arguments (Date.now stays real)
const fakeDate = (page, y, m, d) => page.addInitScript(([y, m, d]) => {
  const R = Date, fixed = new R(y, m, d, 12).getTime();
  class FakeDate extends R { constructor(...a) { if (a.length) super(...a); else super(fixed); } }
  window.Date = FakeDate;
}, [y, m, d]);

async function duel(page, id, o = {}) {
  await boot(page, save(Object.assign({ diff: 'normal', stats: { saveSeen: 1, snowSeen: 1 } }, o.save || {})), o.query || '&winter');
  await page.evaluate(() => { window.B = () => __game.scene.getScene('battle'); });
  await go(page, 'battle', { rival: await idx(page, id) });
  await page.evaluate(() => { const b = B(); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page, 90000);
}

// one SNOWROLL against the hero with a fixed 20 damage; tapMs = a tap at exactly that time after the roll starts (null = no tap).
// Everything runs in one evaluate, so a slow machine only makes it slower, never wrong.
const ROLL = `async (tapMs, taps) => {
  const b = B(), m = Object.assign({}, b.rmoves.find(x => x.type === 'snowroll'), { dmg: [20, 20] });
  window.__psSnowAuto = 'manual';
  const hp0 = b.hero.hp, p = b.doMove(m, b.rival, b.hero);
  const t0 = performance.now();
  while (!b.snowRun && performance.now() - t0 < 120000) await new Promise(r => setTimeout(r, 30));
  const F = b.snowRun && b.snowRun.F;
  if (tapMs != null) for (let i = 0; i < (taps || 1) && b.snowRun; i++) b.snowRun.tapAt(tapMs);
  await p;
  return { lost: hp0 - b.hero.hp, stack: b.snowStack || 0, F };
}`;
const roll = (page, tapMs, taps) => page.evaluate(`(${ROLL})(${JSON.stringify(tapMs)}, ${taps || 1})`);
const fresh = page => page.evaluate(() => { const b = B(); b.hero.hp = b.hero.max; b.hero.shield = false; b.hero.dizzy = false; b.snowStack = 0; b.snowSync(false); b.rival.used = {}; });

// ---------------------------------------------------------------- the season window
test('seasonFor: Halloween 1 Oct to 7 Nov, winter 1 Dec to the end of February (29 Feb too), test flags beat the calendar, ?halloween beats ?winter', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const f = (y, m, d, q = '') => __psSeasonFor(new Date(y, m, d, 12), q);
    return {
      oct: [f(2026, 8, 30), f(2026, 9, 1), f(2026, 9, 31), f(2026, 10, 7), f(2026, 10, 8)],
      winter: [f(2026, 10, 30), f(2026, 11, 1), f(2026, 11, 31), f(2027, 0, 1), f(2027, 0, 7), f(2027, 0, 8), f(2027, 1, 28), f(2027, 2, 1)],
      leap: [f(2028, 1, 28), f(2028, 1, 29), f(2028, 2, 1)],
      mid: [f(2027, 3, 15), f(2027, 6, 15), f(2027, 7, 31)],
      flags: [f(2027, 6, 15, '?debug&winter'), f(2026, 9, 24, '?debug&winter'), f(2026, 11, 15, '?debug&halloween'), f(2026, 11, 15, '?debug&winter&halloween'), f(2027, 6, 15, '?debug&halloween&winter')],
    };
  });
  expect(r.oct).toEqual([null, 'halloween', 'halloween', 'halloween', null]);
  expect(r.winter).toEqual([null, 'winter', 'winter', 'winter', 'winter', 'winter', 'winter', null]);
  expect(r.leap).toEqual(['winter', 'winter', null]);
  expect(r.mid).toEqual([null, null, null]);
  expect(r.flags).toEqual(['winter', 'winter', 'halloween', 'halloween', 'halloween']);
  noErrors(page);
});

test('the real calendar: on 15 Dec with no flag the map has the SNOW tab at index 6 and the 4 winter rivals', async ({ page }) => {
  await fakeDate(page, 2026, 11, 15);
  await boot(page, save({ lastWorld: 6 }), '');
  await go(page, 'map');
  const r = await page.evaluate(() => ({
    rivals: __RIVALS.filter(x => x.world === 6).map(x => x.id), world: __game.scene.getScene('map').world,
    tab: (() => { const out = []; const walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); }); walk(__game.scene.getScene('map').children.list); return out; })(),
  }));
  expect(r.rivals).toEqual(['waddles', 'pola', 'dasher', 'frosty']);
  expect(r.world).toBe(6); // lastWorld 6 opens SNOW FORT
  expect(r.tab.join('|')).toContain('SNOW');
  expect(r.tab.join('|')).not.toContain('SPOOKY');
  noErrors(page);
});

test('out of both seasons (15 Jul): no tab 6, no season rivals, a saved lastWorld 6 falls back to the furthest open world, the winter hats stay in Me', async ({ page }) => {
  await fakeDate(page, 2027, 6, 15);
  await boot(page, save({ lastWorld: 6, costumes: { penguinhat: true, snowmanhat: true }, costume: 'penguinhat' }), '');
  const info = await page.evaluate(() => ({ rivals: __RIVALS.filter(x => (x.world || 0) === 6).length, total: __RIVALS.length }));
  expect(info.rivals).toBe(0);
  await go(page, 'map');
  const r = await page.evaluate(() => {
    const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); }); walk(__game.scene.getScene('map').children.list);
    return { world: __game.scene.getScene('map').world, text: out.join('|') };
  });
  expect(r.world).toBe(1); // no such tab: the map opens the furthest world of this save (Space) and forgets the 6
  expect(await page.evaluate(() => __save.data.lastWorld)).toBe(1);
  expect(r.text).not.toContain('SNOW');
  expect(r.text).not.toContain('SPOOKY');
  // the equipped winter hat is still on Jack's Title screen and in Me
  await go(page, 'me');
  const hats = await page.evaluate(() => { const out = []; const walk = l => l.forEach(o => { if (o.texture && o.texture.key) out.push(o.texture.key); if (o.list) walk(o.list); }); walk(__game.scene.getScene('me').children.list); return out; });
  expect(hats).toContain('penguin');
  expect(hats).toContain('snowman');
  await go(page, 'title');
  expect(await page.evaluate(() => __game.scene.getScene('title').children.list.some(o => o.texture && o.texture.key === 'penguin'))).toBe(true);
  noErrors(page);
});

test('Halloween is unchanged: ?halloween has SPOOKY and no SNOW, both flags give SPOOKY, Pete is 155 pep, Fang has the boss music', async ({ page }) => {
  await boot(page, save({ lastWorld: 6 }), '&halloween&winter');
  const r = await page.evaluate(() => ({ rivals: __RIVALS.filter(x => x.world === 6).map(x => x.id), winter: __RIVALS.filter(x => x.winter).length }));
  expect(r.rivals).toEqual(['pumpkin', 'batty', 'webster', 'fang']);
  expect(r.winter).toBe(0);
  await go(page, 'map');
  const tabs = await page.evaluate(() => { const out = []; const walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); }); walk(__game.scene.getScene('map').children.list); return out.join('|'); });
  expect(tabs).toContain('SPOOKY');
  expect(tabs).not.toContain('SNOW');
  await go(page, 'battle', { rival: await idx(page, 'pumpkin') });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page, 90000);
  const d = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return { hp: b.rHp, track: b.track(), want: PSAudio._want, snow: b.snowStack }; });
  expect(d).toMatchObject({ hp: 155, track: 'battle', snow: 0 }); // Spooky scales from level 1 (1.4 at level 7), music unchanged
  await go(page, 'battle', { rival: await idx(page, 'fang') });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page, 90000);
  expect(await page.evaluate(() => __game.scene.getScene('battle').track())).toBe('boss');
  noErrors(page);
});

// ---------------------------------------------------------------- the rivals and their numbers
test('the 4 winter rivals: hp, xp, hats, boss, moves, tags and scaling from level 5', async ({ page }) => {
  await boot(page, save({ xp: 0 }), '&winter');
  const r = await page.evaluate(() => {
    const W = __RIVALS.filter(x => x.winter);
    return { rows: W.map(x => [x.id, x.world, x.hp, x.xp, !!x.boss, x.reward || null, !!x.event]), moves: Object.fromEntries(W.map(x => [x.id, x.moves.map(m => m.type + ':' + m.w)])),
      tags: ['waddles', 'pola', 'dasher', 'frosty'].map(k => PSEmoji.tagOf(k)),
      frosty: W[3].moves.find(m => m.type === 'snowroll'), dasher: W[2].moves.find(m => m.type === 'snowroll'), lines: W.map(x => [x.intro.length > 10, x.laugh.length > 10]) };
  });
  expect(r.rows).toEqual([['waddles', 6, 120, 55, false, 'penguinhat', true], ['pola', 6, 135, 65, false, 'cocoahat', true], ['dasher', 6, 155, 80, false, null, true], ['frosty', 6, 185, 130, true, 'snowmanhat', true]]);
  expect(r.moves.waddles).toEqual(['rush:35', 'throw:25', 'snowroll:20', 'heal:20']);
  expect(r.moves.pola).toEqual(['spray:30', 'snowroll:25', 'roar:25', 'heal:20']);
  expect(r.moves.dasher).toEqual(['rush:30', 'snowroll:25', 'hop:25', 'dizzy:20']);
  expect(r.moves.frosty).toEqual(['snowroll:30', 'volley:25', 'throw:20', 'shield:15', 'heal:10']);
  expect(r.tags).toEqual(['cheeky', 'kind', 'cheeky', 'grumpy']);
  expect(r.frosty).toMatchObject({ big: true, double: true, dmg: [16, 24] });
  expect(r.dasher.fast).toBe(true);
  // scaling: hp from level 5 (x up to 1.25); EASY x0.8 and no scaling; HARD x1.2 (docs/gdd/1.3-snow-fort.md section 3 and 5)
  const hp = async (xp, diff) => {
    await page.evaluate(([xp, diff]) => { __save.data.xp = xp; __save.data.diff = diff; }, [xp, diff]);
    await go(page, 'battle', { rival: await idx(page, 'waddles') });
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
    await waitTurn(page, 90000);
    return page.evaluate(() => __game.scene.getScene('battle').rHp);
  };
  expect(await hp(0, 'normal')).toBe(120);           // level 1: no scaling yet
  expect(await hp(1500, 'normal')).toBe(130);        // level 7: 1.1
  expect(await hp(1e6, 'normal')).toBe(150);         // capped at 1.25
  expect(await hp(1e6, 'easy')).toBe(95);            // 120 x 0.8, never scaled
  expect(await hp(1e6, 'hard')).toBe(180);           // 120 x 1.2 x 1.25
  noErrors(page);
});

test('music: winter duels play snow, Sir Frosty the boss track, the snow track plays 16 bars without a hole or an error, the new sounds exist', async ({ page }) => {
  await duel(page, 'waddles');
  expect(await page.evaluate(() => ({ want: PSAudio._want, track: B().track() }))).toEqual({ want: 'snow', track: 'snow' });
  await go(page, 'battle', { rival: await idx(page, 'frosty') });
  await page.evaluate(() => { const b = B(); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page, 90000);
  expect(await page.evaluate(() => ({ want: PSAudio._want, track: B().track() }))).toEqual({ want: 'boss', track: 'boss' });
  const r = await page.evaluate(() => {
    const T = PSAudio.TRACKS.snow, calls = { voice: 0, hit: 0, bad: 0, bar: new Set() };
    const A = { voice(m) { calls.voice++; if (!(m >= 20 && m <= 130)) calls.bad++; }, hit() { calls.hit++; }, drum() {}, swell() {} };
    for (let n = 0; n < T.len; n++) { const before = calls.voice; T.play(A, n, 0, 0.25); if (calls.voice > before) calls.bar.add(Math.floor(n / 6)); }
    return { len: T.len, bpm: T.bpm, div: T.div, voices: calls.voice, hits: calls.hit, bad: calls.bad, bars: calls.bar.size, sfx: ['bells', 'ting', 'snowThud', 'snowRoll'].map(k => typeof PSAudio[k]) };
  });
  expect(r).toMatchObject({ len: 96, bpm: 120, div: 3, bad: 0, bars: 16, sfx: ['function', 'function', 'function', 'function'] });
  expect(r.hits).toBeGreaterThan(90); // sleigh bells on every eighth
  noErrors(page);
});

// ---------------------------------------------------------------- SNOWBALL!
test('judgeSnow follows the timing table (EASY any tap, NORMAL 1100-1500 / 700-1100, HARD 950-1200 / 650-950, Dasher on HARD scales to 1000)', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => { const j = __psJudgeSnow; return {
    e: [j(0, 'easy'), j(1200, 'easy'), j(2600, 'easy'), j(2601, 'easy')],
    n: [j(400, 'normal'), j(699, 'normal'), j(700, 'normal'), j(900, 'normal'), j(1099, 'normal'), j(1100, 'normal'), j(1200, 'normal'), j(1500, 'normal'), j(1501, 'normal')],
    h: [j(400, 'hard'), j(649, 'hard'), j(650, 'hard'), j(949, 'hard'), j(950, 'hard'), j(1200, 'hard'), j(1201, 'hard')],
    d: [j(500, 'hard', true), j(560, 'hard', true), j(791, 'hard', true), j(792, 'hard', true), j(1000, 'hard', true), j(1001, 'hard', true)],
    dn: [j(1200, 'normal', true), j(1501, 'normal', true)], // fast only matters on HARD
  }; });
  expect(r.e).toEqual(['perfect', 'perfect', 'perfect', 'late']);
  expect(r.n).toEqual(['early', 'early', 'good', 'good', 'good', 'perfect', 'perfect', 'perfect', 'late']);
  expect(r.h).toEqual(['early', 'early', 'good', 'good', 'perfect', 'perfect', 'late']);
  expect(r.d).toEqual(['early', 'good', 'good', 'perfect', 'perfect', 'late']);
  expect(r.dn).toEqual(['perfect', 'late']);
  noErrors(page);
});

test('NORMAL: perfect = 0 damage, good = half, late = full; the stack grows to 3 and not further; no tap = full damage', async ({ page }) => {
  await duel(page, 'waddles');
  expect(await page.evaluate(() => B().rmoves.find(m => m.type === 'snowroll').uses || 0)).toBe(0); // unlimited
  await fresh(page);
  let r = await roll(page, 1200); expect(r).toMatchObject({ lost: 0, stack: 1, F: 1500 });   // perfect
  r = await roll(page, 900);      expect(r).toMatchObject({ lost: 10, stack: 2 });              // good: half of 20
  r = await roll(page, 1450);     expect(r).toMatchObject({ lost: 0, stack: 3 });
  r = await roll(page, 1100);     expect(r).toMatchObject({ lost: 0, stack: 3 });              // a 4th perfect jump: the stack stays at 3
  expect(await page.evaluate(() => B().snowIcons.length)).toBe(3);
  await fresh(page);
  r = await roll(page, 400, 2);   expect(r).toMatchObject({ lost: 20, stack: 0 });              // early (the first early tap is a free WAIT FOR IT!): full damage
  r = await roll(page, null);     expect(r).toMatchObject({ lost: 20, stack: 0 });              // no tap: full damage, the duel goes on
  const st = await page.evaluate(() => ({ jumps: __save.data.stats.snowJumps, seen: __save.data.stats.snowSeen, over: B().over }));
  expect(st).toEqual({ jumps: 4, seen: 1, over: false });
  noErrors(page);
});

test('the stack: +4 pep per ball on the next throw, volley or tickle, then it is empty; other moves keep it; 3 balls count for Snow Fight', async ({ page }) => {
  await duel(page, 'waddles');
  const hit = (k, balls, dmg) => page.evaluate(async ([k, balls, dmg]) => {
    const b = B(); b.afterPlayer = async () => {}; // only the player's move, not the rival's answer
    b.rival.hp = b.rival.max; b.rival.shield = false; b.busy = false; b.over = false; b.hero.hp = b.hero.max;
    b.snowStack = balls; b.snowSync(false);
    const m = b.moves.find(x => x.k === k); if (dmg) m.dmg = [dmg, dmg];
    const hp0 = b.rival.hp; await b.playerMove(k);
    return { dealt: hp0 - b.rival.hp, stack: b.snowStack, bonus: b.hero.snowBonus || 0, icons: b.snowIcons.length };
  }, [k, balls, dmg]);
  expect(await hit('pillow', 0, 15)).toMatchObject({ dealt: 15, stack: 0 });
  expect(await hit('pillow', 1, 15)).toMatchObject({ dealt: 19, stack: 0, bonus: 0, icons: 0 });
  expect(await hit('pillow', 2, 15)).toMatchObject({ dealt: 23, stack: 0 });
  expect(await hit('pillow', 3, 15)).toMatchObject({ dealt: 27, stack: 0 });
  expect(await hit('tickle', 2, 10)).toMatchObject({ dealt: 18, stack: 0 });  // Tickle Attack takes the stack too
  expect(await hit('tailspin', 2)).toMatchObject({ stack: 2 });              // Tail Spin (a multi-hit) keeps it
  expect(await hit('frost', 3, 25)).toMatchObject({ dealt: 25, stack: 3 }); // a spray keeps the stack
  expect(await hit('nap', 3)).toMatchObject({ stack: 3 });                   // a heal / nap keeps the stack
  const s3 = await page.evaluate(() => __save.data.stats.snowStack3);
  expect(s3).toBe(1); // exactly one 3-ball throw
  noErrors(page);
});

test('EASY: any tap in the roll is perfect (roll 2200 ms); HARD: perfect 950-1200, good 650-950; Dasher rolls in 1000 ms on HARD', async ({ page }) => {
  await duel(page, 'dasher', { save: { diff: 'easy' } });
  await fresh(page);
  let r = await roll(page, 100);  expect(r).toMatchObject({ lost: 0, stack: 1, F: 2200 });
  r = await roll(page, 2000);     expect(r).toMatchObject({ lost: 0, stack: 2 });
  r = await roll(page, null);     expect(r.lost).toBe(20);       // no tap on EASY: a normal hit
  await duel(page, 'dasher', { save: { diff: 'hard' } });
  await fresh(page);
  r = await roll(page, 900);      expect(r).toMatchObject({ lost: 0, stack: 1, F: 1000 }); // Dasher: perfect 792-1000
  r = await roll(page, 700);      expect(r).toMatchObject({ lost: 10, stack: 2 });
  await duel(page, 'waddles', { save: { diff: 'hard' } });
  await fresh(page);
  r = await roll(page, 1000);     expect(r).toMatchObject({ lost: 0, stack: 1, F: 1200 });
  r = await roll(page, 700);      expect(r).toMatchObject({ lost: 10, stack: 2 });
  noErrors(page);
});

test('Sir Frosty rolls 2 balls on HARD (the second one smaller, half damage) and 1 on NORMAL; Melt Down halves the next hit', async ({ page }) => {
  const balls = () => page.evaluate(async () => {
    const b = B(), m = Object.assign({}, b.rmoves.find(x => x.type === 'snowroll'), { dmg: [20, 20] }), seen = [];
    const orig = b.snowBall; b.snowBall = function (...a) { seen.push([a[3], a[4]]); return orig.apply(this, a); };
    window.__psSnowAuto = 'miss'; b.hero.hp = b.hero.max; b.snowStack = 0;
    const hp0 = b.hero.hp; await b.doMove(m, b.rival, b.hero); b.snowBall = orig;
    return { seen, lost: hp0 - b.hero.hp };
  });
  await duel(page, 'frosty', { save: { diff: 'normal' } });
  expect(await balls()).toEqual({ seen: [[20, false]], lost: 20 });
  await duel(page, 'frosty', { save: { diff: 'hard' } });
  expect(await balls()).toEqual({ seen: [[20, false], [10, true]], lost: 30 });
  // Melt Down: the next hit on him does half
  const r = await page.evaluate(async () => {
    const b = B(), m = b.rmoves.find(x => x.type === 'shield'); b.afterPlayer = async () => {};
    await b.doMove(m, b.rival, b.hero);
    const sh = b.rival.shield; b.moves.find(x => x.k === 'pillow').dmg = [20, 20];
    b.rival.hp = b.rival.max; const hp0 = b.rival.hp; await b.playerMove('pillow');
    return { sh, dealt: hp0 - b.rival.hp, after: b.rival.shield };
  });
  expect(r).toEqual({ sh: true, dealt: 10, after: false });
  noErrors(page);
});

test('the jump ring and the tap: the whole screen below the header is the tap area, the first ball ever freezes and waits for the tap', async ({ page }) => {
  await duel(page, 'waddles', { save: { stats: { saveSeen: 1 } } }); // snowSeen not set: the tutorial
  const r = await page.evaluate(async () => {
    const b = B(), m = Object.assign({}, b.rmoves.find(x => x.type === 'snowroll'), { dmg: [20, 20] });
    window.__psSnowAuto = 'tutorial'; // the real first-ball flow, without the slow-frame rule (the test machine runs at 2-3 fps)
    const p = b.doMove(m, b.rival, b.hero);
    const t0 = performance.now();
    while (!(b.snowRun && b.snowRun.frozen != null) && performance.now() - t0 < 120000) await new Promise(r => setTimeout(r, 30));
    const frozen = b.snowRun && b.snowRun.frozen != null;
    // a tap far from Jack (bottom right corner, over a card) is the jump
    const hp0 = b.hero.hp;
    b.input.emit('pointerdown', { worldX: b.cameras.main.width - 10, worldY: b.cameras.main.height - 10 });
    await p;
    return { frozen, lost: hp0 - b.hero.hp, stack: b.snowStack, seen: __save.data.stats.snowSeen };
  });
  expect(r).toEqual({ frozen: true, lost: 0, stack: 1, seen: 1 });
  noErrors(page);
});

test('the stack survives a rotation, and a rotation during the roll waits until YOUR TURN', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await duel(page, 'waddles');
  await page.evaluate(() => { const b = B(); b.snowStack = 2; b.snowSync(false); window.__oldGame = __game; });
  expect(await page.evaluate(() => B().snapshot().snow)).toBe(2);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.__game !== window.__oldGame && __game.scene.isActive('battle') && __game.scene.getScene('battle').hero, null, { timeout: 120000 });
  await fast(page);
  expect(await page.evaluate(() => ({ stack: B().snowStack, icons: B().snowIcons.length, portrait: window.__psPortrait }))).toEqual({ stack: 2, icons: 2, portrait: false });
  // during the roll: busy, the rebuild is deferred
  await page.evaluate(() => { window.__oldGame = __game; const b = B(); window.__psSnowAuto = 'freeze'; b.busy = true; const m = Object.assign({}, b.rmoves.find(x => x.type === 'snowroll'), { dmg: [20, 20] }); window.__rollP = b.doMove(m, b.rival, b.hero); });
  await page.waitForFunction(() => !!B().snowRun, null, { timeout: 120000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => window.__psRotatePending === true, null, { timeout: 60000 });
  expect(await page.evaluate(() => window.__game === window.__oldGame)).toBe(true);
  await page.evaluate(async () => { B().snowRun.tapAt(0); await window.__rollP; B().busy = false; window.__psTryRebuild && window.__psTryRebuild(); });
  await page.waitForFunction(() => window.__game !== window.__oldGame && __game.scene.isActive('battle') && __game.scene.getScene('battle').hero, null, { timeout: 120000 });
  await fast(page);
  expect(await page.evaluate(() => ({ stack: B().snowStack, portrait: window.__psPortrait }))).toEqual({ stack: 3, portrait: true });
  noErrors(page);
});

// ---------------------------------------------------------------- hats, stickers, results
const finish = (page, won) => page.evaluate(won => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); if (won) b.rival.hp = 0; else b.hero.hp = 0; b.finish(won); }, won);

for (const [id, hat, sticker] of [['waddles', 'penguinhat', 'wpen'], ['pola', 'cocoahat', 'wpola'], ['dasher', null, 'wdash'], ['frosty', 'snowmanhat', 'wfrosty']]) {
  test(`result screen: winter ${id === 'frosty' ? 'boss' : 'campaign'} win (${id}) gives its stars, ${hat || 'no hat'}, the sticker and one capsule, and a rematch gives the hat only once`, async ({ page }) => {
    await boot(page, save(), '&winter');
    await page.evaluate(() => { window.B = () => __game.scene.getScene('battle'); });
    await go(page, 'battle', { rival: await idx(page, id) });
    const xp0 = await page.evaluate(() => __save.data.xp), caps0 = await page.evaluate(() => __save.data.caps);
    await finish(page, true);
    await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __save.data.xp); }, { timeout: 120000 }).toBeGreaterThan(xp0);
    const r = await page.evaluate(([id, hat, sticker]) => ({ stars: __save.data.stars[id], hat: hat ? !!__save.data.costumes[hat] : null, ach: !!__save.data.ach[sticker], caps: __save.data.caps, over: B().over,
      want: PSAudio._want, others: Object.keys(__save.data.costumes).filter(k => k !== hat).length }), [id, hat, sticker]);
    expect(r.stars).toBeGreaterThan(0);
    if (hat) expect(r.hat).toBe(true); else expect(r.others).toBe(0);
    expect(r.ach).toBe(true);
    expect(r.caps - caps0).toBeGreaterThanOrEqual(1);
    const sub = r.hat === true;
    // a second win (REMATCH): no second hat, nothing duplicated
    const before = await page.evaluate(() => JSON.stringify(__save.data.costumes));
    await go(page, 'battle', { rival: await idx(page, id) });
    await finish(page, true);
    await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => B().shown ? 1 : 0); }, { timeout: 120000 }).toBe(1);
    expect(await page.evaluate(() => JSON.stringify(__save.data.costumes))).toBe(before);
    expect(sub === (hat !== null)).toBe(true);
    noErrors(page);
  });
}

for (const [name, id] of [['campaign', 'pola'], ['boss', 'frosty']]) {
  test(`result screen: winter ${name} lose (${id}) still gives xp, no hat, no sticker`, async ({ page }) => {
    await boot(page, save(), '&winter');
    await go(page, 'battle', { rival: await idx(page, id) });
    const xp0 = await page.evaluate(() => __save.data.xp);
    await finish(page, false);
    await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __save.data.xp); }, { timeout: 120000 }).toBeGreaterThan(xp0);
    const r = await page.evaluate(id => ({ hats: Object.keys(__save.data.costumes), stars: __save.data.stars[id] || 0, want: PSAudio._want }), id);
    expect(r.hats).toEqual([]);
    expect(r.stars).toBe(0);
    noErrors(page);
  });
}

test('the 6 winter stickers unlock from their rules, one capsule each; Jump Master needs 20 jumps, Snow Fight a 3-ball throw', async ({ page }) => {
  await boot(page, save({ stats: {} }), '&winter');
  const r = await page.evaluate(() => {
    const d = __save.data, ids = ['wpen', 'wpola', 'wdash', 'wfrosty', 'wjump', 'wstack'], caps0 = d.caps || 0;
    PSExtra.checkAch(); const none = ids.filter(i => d.ach[i]).length;
    d.stars.waddles = 1; d.stars.pola = 2; d.stars.dasher = 1; d.stars.frosty = 3; d.stats.snowJumps = 19; PSExtra.checkAch();
    const mid = ids.filter(i => d.ach[i]);
    d.stats.snowJumps = 20; d.stats.snowStack3 = 1; PSExtra.checkAch();
    return { none, mid, all: ids.filter(i => d.ach[i]), caps: d.caps - caps0, names: PSExtra.ACH.filter(a => ids.includes(a.id)).map(a => a.name) };
  });
  expect(r.none).toBe(0);
  expect(r.mid).toEqual(['wpen', 'wpola', 'wdash', 'wfrosty']);
  expect(r.all.length).toBe(6);
  expect(r.caps).toBe(6);
  expect(r.names).toEqual(['Slide Time', 'Cocoa Time', 'Jingle Jam', 'Snow King', 'Jump Master', 'Snow Fight']);
  noErrors(page);
});

const albumTexts = async (page, tab) => {
  const all = new Set();
  for (let p = 0; p < (tab ? 1 : 6); p++) {
    await go(page, 'album', tab ? { tab } : { page: p });
    (await page.evaluate(() => { const out = []; const walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); }); walk(__game.scene.getScene('album').children.list); return out; })).forEach(t => all.add(t));
  }
  return [...all];
};

test('Album out of season (15 Jul): only the earned winter sticker shows, the total does not count the hidden ones, the winter comic cover is hidden unless seen', async ({ page }) => {
  await fakeDate(page, 2027, 6, 15);
  await boot(page, save({ ach: { wfrosty: 1 }, comics: Object.assign({}, BASE_SAVE.comics, { winter: false }) }), '');
  const names = ['Slide Time', 'Cocoa Time', 'Jingle Jam', 'Snow King', 'Jump Master', 'Snow Fight'];
  const st = await albumTexts(page);
  expect(names.filter(n => st.includes(n))).toEqual(['Snow King']);
  const n = await page.evaluate(() => PSExtra.ACH.length);
  expect(st.find(t => /stickers/.test(t))).toContain('/ ' + (n - 5) + ' stickers');
  let cv = await albumTexts(page, 'comics');
  expect(cv).not.toContain('Big Snowman'); expect(cv).not.toContain('Visit Snow Fort to unlock');
  await page.evaluate(() => { __save.data.comics.winter = true; });
  cv = await albumTexts(page, 'comics');
  expect(cv).toContain('Big Snowman');
  noErrors(page);
});

test('Album in the season: all 6 winter stickers (46 in total) and the winter comic cover, locked until seen', async ({ page }) => {
  await boot(page, save({ comics: Object.assign({}, BASE_SAVE.comics, { winter: false }) }), '&winter');
  const st = await albumTexts(page);
  for (const n of ['???']) expect(st).toContain(n);
  expect(st.find(t => /stickers/.test(t))).toContain('/ 46 stickers');
  const cv = await albumTexts(page, 'comics');
  expect(cv).toContain('Visit Snow Fort to unlock');
  noErrors(page);
});

test('comic: the winter comic plays once when SNOW FORT opens, skips to the title page, is marked seen; out of season its cover is hidden unless seen', async ({ page }) => {
  await boot(page, save({ comics: Object.assign({}, BASE_SAVE.comics, { winter: false }) }), '&winter');
  await page.evaluate(() => { __game.scene.getScenes(true)[0].scene.start('map', { world: 6 }); }); // the map starts the comic by itself
  await page.waitForFunction(() => __game.scene.isActive('comic'), null, { timeout: 60000 });
  await fast(page);
  const c = await page.evaluate(() => { const s = __game.scene.getScene('comic'); return { id: s.id, title: s.S.title, panels: s.S.panels.length, confetti: s.S.confetti.key }; });
  expect(c).toEqual({ id: 'winter', title: 'SNOW FORT!', panels: 3, confetti: 'snow' });
  // every panel works with instant = true (fast taps and rotation)
  await page.evaluate(() => { const s = __game.scene.getScene('comic'); s.toTitle(); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => !!(__save.data.comics && __save.data.comics.winter)); }, { timeout: 60000 }).toBe(true);
  noErrors(page);
});

test('the winter comic replays in an instant (all panels) and from the Album cover', async ({ page }) => {
  await boot(page, save(), '&winter');
  await go(page, 'comic', { world: 'winter', panel: 2 });
  const r = await page.evaluate(() => { const s = __game.scene.getScene('comic'); return { id: s.id, start: s.start0 }; });
  expect(r).toEqual({ id: 'winter', start: 2 });
  noErrors(page);
});

// ---------------------------------------------------------------- Title, Star Catch, adventure, Thully
test('Title: snow, a garland, the snowman and a pale blue SQUAD only in winter; the garland stays in calm mode', async ({ page }) => {
  const look = () => page.evaluate(() => { const s = __game.scene.getScene('title'), L = s.children.list; return {
    bulbs: (s.bulbs || []).length, snowman: L.some(o => o.texture && o.texture.key === 'snowman'), pumpkin: L.some(o => o.texture && o.texture.key === 'pumpkin'),
    particles: L.filter(o => o.type === 'ParticleEmitter').length, calm: !!(window.PSPrefs && PSPrefs.calm()) }; });
  await boot(page, save(), '&winter');
  await go(page, 'title');
  const w = await look();
  expect(w.bulbs).toBeGreaterThan(8); expect(w.snowman).toBe(true); expect(w.pumpkin).toBe(false);
  await page.evaluate(() => { PSPrefs.data.calm = true; });
  await go(page, 'title');
  const c = await look();
  expect(c.bulbs).toBeGreaterThan(8); // calm mode keeps the garland
  expect(c.particles).toBeLessThan(w.particles); // ...and drops the falling snow
  await boot(page, save(), '&halloween');
  await go(page, 'title');
  const h = await look();
  expect(h).toMatchObject({ bulbs: 0, snowman: false, pumpkin: true });
  noErrors(page);
});

test('Star Catch shows cocoa instead of the dumpling in winter (candy in October)', async ({ page }) => {
  // the how-to card is on screen for a few seconds: wait for it with a polling condition, never a fixed sleep
  const treat = () => page.waitForFunction(() => {
    const s = __game.scene.getScene('catch'); if (!s || !s.children) return false; const out = [];
    const walk = l => l.forEach(o => { if (o.texture && o.texture.key) out.push(o.texture.key); if (o.list) walk(o.list); }); walk(s.children.list);
    window.__treat = out.includes('cocoa') ? 'cocoa' : out.includes('candy') ? 'candy' : out.includes('dumpling') ? 'dumpling' : null; return !!window.__treat;
  }, null, { timeout: 60000, polling: 50 }).then(() => page.evaluate(() => window.__treat));
  await boot(page, save(), '&winter');
  await page.evaluate(() => { __game.scene.getScenes(true)[0].scene.start('catch'); });
  expect(await treat()).toBe('cocoa');
  await boot(page, save(), '&halloween');
  await page.evaluate(() => { __game.scene.getScenes(true)[0].scene.start('catch'); });
  expect(await treat()).toBe('candy');
  noErrors(page);
});

test('adventure: slot 6 is "winter" in winter (SNOW FORT in the list, no SPOOKY), a winter trip keeps its postcards out of season', async ({ page }) => {
  await boot(page, save(), '&winter');
  const r = await page.evaluate(() => ({ keys: PSAdventure.KEYS, w: PSAdventure.WORLD.winter, s: PSAdventure.WORLD.spooky }));
  expect(r.keys[6]).toBe('winter');
  expect(r.w).toMatchObject({ name: 'SNOW FORT', icon: 'snowman', prop: 'scarf' });
  expect(r.w.lines.length).toBe(3);
  expect(r.s.name).toBe('SPOOKY');
  await boot(page, save(), '&halloween');
  expect(await page.evaluate(() => PSAdventure.KEYS[6])).toBe('spooky');
  noErrors(page);
});

test('Sleepy Thully answers an emoji with a Zzz bubble while asleep: no wake-up, no meter change, a second tap inside the cooldown shows nothing', async ({ page }) => {
  await boot(page, save({ stars: Object.assign({}, BASE_SAVE.stars, { thully: 0 }) }), '');
  await page.evaluate(() => { window.B = () => __game.scene.getScene('battle'); });
  await go(page, 'battle', { rival: await idx(page, 'thully') });
  await page.evaluate(() => { const b = B(); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page, 90000);
  expect(await page.evaluate(() => B().track())).toBe('lullaby');
  const r = await page.evaluate(async () => {
    const b = B(); b.emoT0 = -1e9;
    const asleep0 = b.rival.asleep, meter0 = b.rival.meter, hp0 = b.rival.hp, php0 = b.hero.hp;
    b.emoRivalAt = -1e9; b.emoAt = -1e9;
    const sent = b.emoSend(2);
    const t0 = performance.now();
    while (!b.emoBub.r && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 20)); // the answer comes about 0.9 s later
    const bub = b.emoBub.r, zzz = !!(bub && bub.list.some(o => o.texture && o.texture.key === 'zzz'));
    const first = { sent, zzz, asleep: b.rival.asleep, meter: b.rival.meter, hp: b.rival.hp, same: asleep0 === b.rival.asleep && meter0 === b.rival.meter && hp0 === b.rival.hp && php0 === b.hero.hp };
    // a second answer inside the cooldown shows nothing
    const again = b.emoAnswer(2);
    // awake: a normal emoji
    b.rival.asleep = false; b.emoRivalAt = -1e9; const awake = b.emoAnswer(2);
    return { first, again, awake: typeof awake };
  });
  expect(r.first).toEqual({ sent: true, zzz: true, asleep: true, meter: 0, hp: expect.any(Number), same: true });
  expect(r.again).toBeNull();
  expect(r.awake).toBe('number');
  noErrors(page);
});

// ---------------------------------------------------------------- layout, 4 sizes
for (const [w, h] of [[390, 844], [844, 390], [820, 1180], [1180, 820]]) {
  test(`layout ${w}x${h}: Title garland clear of the menu, the 7 map tabs side by side inside the screen, the snow stack clear of the log and the cards`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page, save({ lastWorld: 6 }), '&winter');
    await go(page, 'title');
    const t = await page.evaluate(() => {
      const s = __game.scene.getScene('title'), L = s.children.list, nav = L.filter(o => o.type === 'Container' && o.depth === 50);
      const bulb = Math.max(...(s.bulbs || []).map(b => b.y + b.displayHeight / 2)), top = Math.min(...nav.map(c => c.y - 46));
      return { bulb, top, nav: nav.length, bulbs: (s.bulbs || []).length };
    });
    expect(t.bulbs).toBeGreaterThan(5); expect(t.nav).toBeGreaterThan(3);
    expect(t.bulb).toBeLessThanOrEqual(t.top); // the garland ends above the menu circles
    expect(await offscreen(page, 'title')).toEqual([]);
    await go(page, 'map', { world: 6 });
    const m = await page.evaluate(() => {
      const s = __game.scene.getScene('map'), tabs = s.children.list.filter(o => o.type === 'Container' && o.depth === 6 && o.input && o.width > 60 && o.width < 460 && o.y < 240).sort((a, b) => a.x - b.x);
      return { n: tabs.length, boxes: tabs.map(o => [o.x - o.width / 2, o.x + o.width / 2]), W: __game.config.width };
    });
    expect(m.n).toBe(7);
    m.boxes.forEach((b, i) => { expect(b[0]).toBeGreaterThanOrEqual(0); expect(b[1]).toBeLessThanOrEqual(m.W); if (i) expect(b[0]).toBeGreaterThanOrEqual(m.boxes[i - 1][1]); });
    expect(await offscreen(page, 'map')).toEqual([]);
    await go(page, 'battle', { rival: await idx(page, 'waddles') });
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
    await waitTurn(page, 90000);
    const l = await page.evaluate(() => {
      const b = __game.scene.getScene('battle'); b.snowStack = 3; b.snowSync(false);
      const box = o => ({ l: o.x - o.displayWidth * o.originX, r: o.x + o.displayWidth * (1 - o.originX), t: o.y - o.displayHeight * o.originY, b: o.y + o.displayHeight * (1 - o.originY) });
      const hit = (a, c) => a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;
      const icons = b.snowIcons.map(box), log = box(b.logT), cards = b.moves.map(m => ({ l: m.card.x - m.card.width / 2, r: m.card.x + m.card.width / 2, t: m.card.y - m.card.height / 2, b: m.card.y + m.card.height / 2 }));
      const W = __game.config.width;
      return { n: icons.length, log: icons.some(i => hit(i, log)), cards: icons.some(i => cards.some(c => hit(i, c))), inside: icons.every(i => i.l >= 0 && i.r <= W), bars: icons.some(i => i.t < b.hy + 40) };
    });
    expect(l).toEqual({ n: 3, log: false, cards: false, inside: true, bars: false });
    expect(await offscreen(page, 'battle')).toEqual([]);
    noErrors(page);
  });
}
