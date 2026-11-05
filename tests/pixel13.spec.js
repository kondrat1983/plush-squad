// v1.3 Pixel Land (docs/gdd/1.3-pixel-land.md): the world, mig12, the 8-bit look, the 1-UP, CONTINUE?, the score, music and rewards
const { test, expect } = require('@playwright/test');
const { boot, go, wait, waitTurn, noErrors, BASE_SAVE } = require('./helpers');

const BEFORE = ['timmy', 'moo', 'sly', 'hoot', 'robot', 'polandball', 'ghost', 'dragonboss', 'moose', 'beaver', 'mountie', 'sasquatch', 'hermy', 'puff', 'jelly', 'fog', 'thully', 'onion', 'peas', 'garlic', 'fungi', 'brocklee', 'england', 'spain', 'japan', 'usa', 'poland'];
const PIXEL_IDS = ['leafy', 'bolty', 'bibi', 'pipo', 'pixeldragon'];
const save = (more = {}) => Object.assign({}, BASE_SAVE, { xp: 30000, stars: Object.fromEntries(BEFORE.concat(more.extra || []).map(k => [k, 3])) }, more);
const B = (page, fn) => page.evaluate(`(${fn})(__game.scene.getScene('battle'))`);
async function duel(page, id) {
  const i = await page.evaluate(id => __RIVALS.findIndex(r => r.id === id), id);
  await go(page, 'battle', { rival: i });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); });
  await waitTurn(page);
}

test('Pixel Land is world 6 after Countryballs, Spooky moves to 7; the rivals, cap and scaling', async ({ page }) => {
  await boot(page, save(), '&halloween');
  const r = await page.evaluate(() => ({
    ids: __RIVALS.filter(r => r.world === 6).map(r => r.id), spooky: __RIVALS.find(r => r.id === 'pumpkin').world,
    boss: __RIVALS.filter(r => r.world === 6 && r.boss).map(r => r.id), hp: __RIVALS.filter(r => r.world === 6).map(r => r.hp),
    after: __RIVALS.findIndex(r => r.id === 'leafy') - __RIVALS.findIndex(r => r.id === 'poland'), cap: !!__PS.COSTUMES.find(c => c.id === 'bitcap'),
    tags: ['leafy', 'bolty', 'bibi', 'pipo', 'pixeldragon'].map(id => PSEmoji.tagOf ? PSEmoji.tagOf(id) : ''), worlds: __PS.WORLDS.map(w => w.tab),
  }));
  expect(r.ids).toEqual(PIXEL_IDS);
  expect(r.spooky).toBe(7);
  expect(r.boss).toEqual(['pixeldragon']);
  expect(r.hp).toEqual([185, 195, 205, 215, 260]);
  expect(r.after).toBe(1);
  expect(r.cap).toBe(true);
  expect(r.tags).toEqual(['shy', 'cheeky', 'kind', 'cheeky', 'grumpy']);
  expect(r.worlds).toEqual(['HILLS', 'SPACE', 'CANADA', 'OCEAN', 'VEGGIES', 'FLAGS', 'PIXEL', 'SPOOKY']);
  noErrors(page);
});

test('mig12: lastWorld 6 (Spooky in v1.1) becomes 7 and hi-scores start empty; a v1.3 save keeps 6', async ({ page }) => {
  const old = save({ lastWorld: 6 }); delete old.mig12;
  await boot(page, old, '&halloween');
  expect(await page.evaluate(() => [__save.data.lastWorld, __save.data.mig12, JSON.stringify(__save.data.hi)])).toEqual([7, 1, '{}']);
  const r = await page.evaluate(() => { const d = { lastWorld: 6, mig08: 1, mig09: 1, mig10: 1, mig11: 1, mig12: 1 }; __save.migrate(d); return d.lastWorld; });
  expect(r).toBe(6);
  noErrors(page);
});

test('a Pixel Land duel is 8-bit: Jack and the rival use hand-made frames (nearest), attack and hit frames swap', async ({ page }) => {
  await boot(page, save());
  await duel(page, 'leafy');
  const r = await B(page, b => [b.pxDuel, b.hero.spr.texture.key, b.rival.spr.texture.key, b.hero.spr.texture.source[0].scaleMode, b.rival.px, window.PSAudio._want]);
  expect(r[0]).toBe(true);
  expect(r[1]).toMatch(/^jack_px_idle[12]$/);
  expect(r[2]).toMatch(/^leafy_idle[12]$/);
  expect(r[3]).toBe(1); // Phaser.ScaleModes.NEAREST
  expect(r[4]).toBe('leafy');
  expect(r[5]).toBe('pixel');
  const seen = await page.evaluate(async () => {
    const b = __game.scene.getScene('battle'), keys = new Set();
    const ev = b.time.addEvent({ delay: 30, loop: true, callback: () => { keys.add(b.hero.spr.texture.key); keys.add(b.rival.spr.texture.key); } });
    b.playerMove('pillow');
    await new Promise(r => { const t = setInterval(() => { if (!b.busy || b.over) { clearInterval(t); r(); } }, 200); });
    ev.remove(false); return [...keys];
  });
  expect(seen).toContain('jack_px_attack');
  expect(seen).toContain('leafy_hit');
  noErrors(page);
});

test('a photo toy is pixelated only in Pixel Land, and its picture stays the same', async ({ page }) => {
  await boot(page, save());
  await page.evaluate(() => {
    const t = Object.assign(PSToys.createToy({ arch: 'bear', element: 'fire', seed: 4242, aspect: 1 }), { id: 'tg', name: 'Teddy', xp: 0 });
    __save.data.toys = [t]; __save.data.hero = 'tg'; __save.store();
    __game.textures.addImage('toy_tg', __game.textures.get('jack_front').getSourceImage());
  });
  const before = await page.evaluate(() => [__game.textures.get('toy_tg').getSourceImage().width, JSON.stringify(__save.data.toys[0])]);
  await duel(page, 'bolty');
  const r = await B(page, b => [b.hero.spr.texture.key, window.__psPixMs, b.hero.spr.displayHeight > 200]);
  expect(r[0]).toBe('px:toy_tg');
  expect(r[1]).toBeLessThan(400);
  expect(r[2]).toBe(true);
  const after = await page.evaluate(() => [__game.textures.get('toy_tg').getSourceImage().width, JSON.stringify(__save.data.toys[0])]);
  expect(after).toEqual(before);
  // failure: the normal picture
  await page.evaluate(() => {
    window.__psPixFail = true;
    const t = Object.assign(PSToys.createToy({ arch: 'cat', element: 'ice', seed: 9, aspect: 1 }), { id: 'tg2', name: 'Kit', xp: 0 });
    __save.data.toys.push(t); __save.data.hero = 'tg2'; __save.store();
    __game.textures.addImage('toy_tg2', __game.textures.get('jack_front').getSourceImage());
  });
  await duel(page, 'bolty');
  expect(await B(page, b => b.hero.spr.texture.key)).toBe('toy_tg2');
  await page.evaluate(() => { window.__psPixFail = false; __save.data.hero = 'tg'; });
  // not in other worlds, not toy-vs-toy, not the Kraken
  await duel(page, 'poland');
  expect(await B(page, b => [b.pxDuel, b.hero.spr.texture.key])).toEqual([false, 'toy_tg']);
  await go(page, 'battle', { boss: true });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); });
  await waitTurn(page);
  expect(await B(page, b => [b.pxDuel, !!b.heart, b.rival.max])).toEqual([false, false, 220]);
  noErrors(page);
});

test('1-UP: the chest opens, the heart heals the one who claims it (costs the turn); EASY rivals never claim', async ({ page }) => {
  await boot(page, save());
  await page.evaluate(() => { window.__psHeart = 'player'; window.__psHeartTake = undefined; });
  await duel(page, 'bibi');
  expect(await B(page, b => [b.heart.state, b.chest.texture.key])).toEqual(['closed', 'chest']);
  await page.evaluate(() => __game.scene.getScene('battle').playerMove('pillow'));
  await waitTurn(page);
  expect(await B(page, b => [b.heart.state, b.heart.next, b.oneBtn.visible, b.chest.texture.key])).toEqual(['up', 'p', true, 'chestopen']);
  const healed = await page.evaluate(async () => { const b = __game.scene.getScene('battle'); b.hero.hp = 40; b.hero.bar.set(40, b); await b.claimHeart(b.hero); return b.hero.hp; });
  expect(healed).toBe(65); // NORMAL +25
  expect(await B(page, b => [b.heart.state, b.oneups, __save.data.stats.oneups, b.oneBtn.visible])).toEqual(['gone', 1, 1, false]);
  // the rival's rule on EASY: never
  await page.evaluate(() => { __save.data.diff = 'easy'; window.__psHeart = 'rival'; });
  await duel(page, 'bibi');
  const easy = await page.evaluate(async () => { const b = __game.scene.getScene('battle'); b.rival.hp = 20; let n = 0; for (let i = 0; i < 20; i++) if (await b.rivalOneUp()) n++; return n; });
  expect(easy).toBe(0);
  await page.evaluate(() => { __save.data.diff = 'normal'; window.__psHeart = null; });
  noErrors(page);
});

test('CONTINUE?: the Pixel Dragon comes back once with 20 % unless you tap NO; the win gives the 8-Bit Cap and a hi-score', async ({ page }) => {
  await boot(page, save({ extra: ['leafy', 'bolty', 'bibi', 'pipo'] }));
  await duel(page, 'pixeldragon');
  expect(await page.evaluate(() => window.PSAudio._want)).toBe('boss');
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.rival.hp = 1; b.rival.bar.set(1, b); b.playerMove('pillow'); });
  await page.waitForFunction(() => __game.scene.getScene('battle').contUsed, null, { timeout: 60000 });
  await page.waitForFunction(() => !__game.scene.getScene('battle').contOpen && !__game.scene.getScene('battle').busy, null, { timeout: 90000 });
  expect(await B(page, b => [b.contRevived, b.contHp === Math.round(b.rival.max * 0.2), !!b.contChip, b.over])).toEqual([true, true, true, false]); // (his own turn may heal him after that)
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.rival.hp = 1; b.rival.bar.set(1, b); b.playerMove('pillow'); });
  await page.waitForFunction(() => { const b = __game.scene.getScene('battle'); return b.over && b.shown; }, null, { timeout: 90000 });
  const r = await page.evaluate(() => [__save.data.stars.pixeldragon > 0, !!__save.data.costumes.bitcap, (__save.data.hi.pixeldragon || 0) > 0]);
  expect(r).toEqual([true, true, true]);
  // NO! before 0: a win at once
  await page.evaluate(() => { window.__psCont = 'no'; });
  await duel(page, 'pixeldragon');
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.rival.hp = 1; b.rival.bar.set(1, b); b.playerMove('pillow'); });
  await page.waitForFunction(() => { const b = __game.scene.getScene('battle'); return b.over && b.shown; }, null, { timeout: 90000 });
  expect(await page.evaluate(() => [__game.scene.getScene('battle').contRevived || false, __save.data.stats.noContinue])).toEqual([false, 1]);
  await page.evaluate(() => { window.__psCont = null; });
  noErrors(page);
});

test('Pixel Land map: pixel sky, pixelMap music, the comic and the new stickers, quests and postcard', async ({ page }) => {
  await boot(page, save());
  await page.evaluate(() => { PSAudio.init(); PSAudio.startMusic(); });
  await go(page, 'map', { world: 6 });
  const r = await page.evaluate(() => ({
    music: PSAudio._track, sky: __game.scene.getScene('map').children.list.some(o => o.texture && o.texture.key === 'sky8'),
    castle: __game.scene.getScene('map').children.list.some(o => o.texture && o.texture.key === 'castle'),
    stickers: ['pdragon', 'oneup5', 'nocont'].filter(id => PSExtra.ACH.some(a => a.id === id)).length,
    quests: ['retro', 'squares', 'bricks', 'levelup', 'bubbles', 'hop20'].filter(id => PSExtra.QUESTS.some(q => q.id === id)).length,
  }));
  expect(r.music).toBe('pixelMap');
  expect(r.sky).toBe(true);
  expect(r.castle).toBe(true);
  expect([r.stickers, r.quests]).toEqual([3, 6]);
  noErrors(page);
});
