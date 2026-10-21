// v1.2: emoji chat in duels (docs/gdd/1.2-emoji-chat.md): button, tray of 16, bubbles, the rival answers, cooldown, log of 6,
// Settings toggle, rotation, friend win mail, layout on 5 sizes, result() in every mode.
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, waitTurn, noErrors } = require('./helpers');

const SIZES = [[390, 844], [844, 390], [820, 1180], [1180, 820], [375, 667], [667, 375], [568, 320]];

// opens a duel and waits for the first turn; spies on the bubbles (side, id)
async function duel(page, data = { rival: 0 }, save = BASE_SAVE, size = null) {
  if (size) await page.setViewportSize({ width: size[0], height: size[1] });
  await boot(page, save);
  await go(page, 'battle', data);
  await page.evaluate(() => {
    const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null);
  });
  await waitTurn(page);
  await page.evaluate(() => {
    const b = __game.scene.getScene('battle'); b._seen = [];
    const o = b.emoBubble.bind(b); b.emoBubble = (f, id, r) => { b._seen.push([r ? 'r' : 'h', id]); return o(f, id, r); };
  });
}
const B = (page, fn, arg) => page.evaluate(([src, arg]) => { const b = __game.scene.getScene('battle'); return eval('(' + src + ')')(b, arg); }, [fn.toString(), arg]);
// taps one emoji cell of the open tray
const tapCell = (page, i) => B(page, (b, i) => { b.emoTray.cells[i].emit('pointerup', {}); return true; }, i);
const openTray = page => B(page, b => { b.emoBtn.emit('pointerup', {}); return !!b.emoTray; });

test('PSEmoji: 16 ids in order, clean() keeps integers 0-15 (max 6), every rival has a personality tag', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const E = PSEmoji;
    return {
      names: E.EMOJI.map(e => e.id + ':' + e.name).join(','),
      frames: E.EMOJI.every(e => __game.textures.get('icons3').has(E.FRAME(e.id).slice(2))),
      clean: [E.clean([3, 99, 'x', -1, 2.5, 15, 0, 7, 8, 9, 10]), E.clean('boom'), E.clean(null), E.clean([1, 2, 3, 4, 5, 6, 7])],
      untagged: __RIVALS.concat([PSKrakenCheck()]).filter(R => !E.TAGS[R.id]).map(R => R.id),
      tags: [...new Set(Object.values(E.TAGS))].sort().join(','),
    };
    function PSKrakenCheck() { return { id: 'kraken' }; }
  });
  expect(r.names).toBe('0:grin,1:beam,2:lol,3:blush,4:happy,5:smile,6:sad,7:hug,8:crazy,9:nerd,10:cry,11:grumpy,12:mad,13:sneaky,14:up,15:down');
  expect(r.frames).toBe(true);
  expect(r.clean).toEqual([[3, 15, 0, 7, 8, 9], [], [], [1, 2, 3, 4, 5, 6]]);
  expect(r.untagged).toEqual([]);
  expect(r.tags).toBe('cheeky,grumpy,kind,shy');
  noErrors(page);
});

test('PSEmoji.reply: situation first, then mood and personality; never mean to a sad emoji', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const E = PSEmoji, set = s => { const out = new Set(); for (let i = 0; i < 40; i++) out.add(E.reply(s, i / 40)); return [...out].sort((a, b) => a - b); };
    const base = { rivalPct: 80, heroPct: 80, bigHit: false };
    return {
      kindFriendly: set({ ...base, mine: 0, tag: 'kind' }), kindCheeky: set({ ...base, mine: 8, tag: 'kind' }), kindAngry: set({ ...base, mine: 12, tag: 'kind' }),
      sad: [6, 10].map(m => ['kind', 'grumpy', 'cheeky', 'shy'].map(t => set({ ...base, mine: m, tag: t, boss: true, rivalPct: 10, bigHit: true }))).flat(2),
      grumpy: set({ ...base, mine: 0, tag: 'grumpy' }), shy: set({ ...base, mine: 12, tag: 'shy' }), cheeky: set({ ...base, mine: 0, tag: 'cheeky' }),
      rivalLosing: set({ ...base, mine: 0, tag: 'kind', rivalPct: 20 }), heroLosing: set({ ...base, mine: 0, tag: 'kind', heroPct: 20 }),
      bigHit: set({ ...base, mine: 0, tag: 'kind', bigHit: true }),
      boss: { kind: set({ ...base, mine: 0, tag: 'kind', boss: true }), grumpy: set({ ...base, mine: 0, tag: 'grumpy', boss: true }), cheeky: set({ ...base, mine: 0, tag: 'cheeky', boss: true }) },
      bossBeatsLosing: set({ ...base, mine: 0, tag: 'kind', boss: true, rivalPct: 10 }),
    };
  });
  expect(r.kindFriendly).toEqual([4, 7, 14]);
  expect(r.kindCheeky).toEqual([2, 8, 13]);
  expect(r.kindAngry).toEqual([6, 11, 12]);
  expect([...new Set(r.sad)].sort((a, b) => a - b)).toEqual([7, 14]);
  expect(r.grumpy).toEqual([11, 12]);
  expect(r.shy).toEqual([3, 5]);
  expect(r.cheeky).toEqual([8, 13]);
  expect(r.rivalLosing).toEqual([6, 8, 10]);
  expect(r.heroLosing).toEqual([1, 2, 13]);
  expect(r.bigHit).toEqual([9, 10, 11]);
  r.boss.kind.concat(r.boss.grumpy, r.boss.cheeky, r.bossBeatsLosing).forEach(id => expect([2, 12, 13]).toContain(id));
  expect(r.boss.grumpy).toContain(12);
  expect(r.boss.cheeky).toContain(13);
  noErrors(page);
});

test('tray: button opens 16 pictures in order (no text field), a pick closes it, a bubble shows, the turn is untouched', async ({ page }) => {
  await duel(page);
  expect(await B(page, b => b.emoBtn.visible)).toBe(true);
  expect(await openTray(page)).toBe(true);
  const t = await B(page, b => ({ n: b.emoTray.cells.length, ids: b.emoTray.cells.map(c => c.emo), frames: b.emoTray.cells.map(c => c.list[1].frame.name), inputs: document.querySelectorAll('input,textarea').length, cols: b.emoTray.cols }));
  expect(t.n).toBe(16);
  expect(t.ids).toEqual([...Array(16).keys()]);
  expect(t.frames).toEqual(['grin', 'beam', 'lol', 'blush', 'happy', 'smile', 'sad', 'hug', 'crazy', 'nerd', 'cry', 'grumpy', 'mad', 'sneaky', 'up', 'down']);
  expect(t.inputs).toBe(0);
  // one evaluate: the 2-3 fps browser is slow between calls (the tray closes by itself after 6 s)
  const before = await B(page, b => { const o = { acted: b.acted, busy: b.busy, h: b.hero.hp, r: b.rival.hp, on: b.moves.map(m => m.card.enabled), over: b.over }; b.emoTray.cells[2].emit('pointerup', {}); o.now = { tray: !!b.emoTray, seen: b._seen[0], bub: !!b.emoBub.h, log: b.emoLog.slice() }; return o; });
  expect(before.now).toEqual({ tray: false, seen: ['h', 2], bub: true, log: [2] });
  await wait(page, 2500); // the rival answers about 0.9 s later; the bubbles are gone after 1.4 s
  const after = await B(page, b => ({ acted: b.acted, busy: b.busy, h: b.hero.hp, r: b.rival.hp, on: b.moves.map(m => m.card.enabled), over: b.over, seen: b._seen, bub: [!!b.emoBub.h, !!b.emoBub.r] }));
  expect(after).toMatchObject({ acted: before.acted, busy: before.busy, h: before.h, r: before.r, on: before.on, over: before.over });
  expect(after.seen.length).toBe(2);
  expect(after.seen[1][0]).toBe('r');
  expect(after.bub).toEqual([false, false]);
  // the cards still work and the booster refund (acted) was not triggered by the emoji
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.playerMove(b.moves[0].k); });
  await wait(page, 1000);
  expect(await B(page, b => b.acted)).toBe(true);
  noErrors(page);
});

test('tray: a tap outside closes it, the button toggles it, it closes by itself after 6 s, a card tap still works', async ({ page }) => {
  await duel(page);
  await openTray(page);
  expect(await B(page, b => !!b.emoTray)).toBe(true);
  await B(page, b => { b.emoBtn.emit('pointerup', {}); return 1; });
  expect(await B(page, b => !!b.emoTray)).toBe(false);
  await openTray(page);
  await B(page, b => { b.input.emit('pointerdown', { worldX: 3, worldY: b.emoTray.y + 10 }); return 1; }); // outside, left of the tray
  expect(await B(page, b => !!b.emoTray)).toBe(false);
  await openTray(page);
  await B(page, b => { const t = b.emoTray; b.input.emit('pointerdown', { worldX: t.x + t.w / 2, worldY: t.y + t.h / 2 }); return 1; }); // inside
  expect(await B(page, b => !!b.emoTray)).toBe(true);
  await wait(page, 7000);
  expect(await B(page, b => !!b.emoTray)).toBe(false);
  noErrors(page);
});

test('cooldown: a second send within 1.2 s is ignored (tray stays open), later it works; no stuck bubble', async ({ page }) => {
  await duel(page);
  await openTray(page); await tapCell(page, 0);
  // taps inside the cooldown window, all in one evaluate (the browser is slow between calls)
  const r = await B(page, b => { b.emoBtn.emit('pointerup', {}); b.emoAt = performance.now() - 100; const t = b.emoTray; [1, 4, 5].forEach(i => t.cells[i].emit('pointerup', {})); return { log: b.emoLog.slice(), tray: !!b.emoTray }; });
  expect(r).toEqual({ log: [0], tray: true });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.emoAt = performance.now() - 1300; });
  await tapCell(page, 1);
  expect(await B(page, b => b.emoLog)).toEqual([0, 1]);
  await wait(page, 3000);
  expect(await B(page, b => [!!b.emoBub.h, !!b.emoBub.r, b.children.list.filter(o => o.depth === 38).length])).toEqual([false, false, 0]);
  noErrors(page);
});

test('the rival answers in character (kind, grumpy, boss) and the log keeps at most 6', async ({ page }) => {
  await duel(page, { rival: 3 }); // Professor Hoot: a crowned, grumpy rival
  const send = ids => B(page, (b, ids) => ids.map(id => { b.emoAt = -1e9; b.emoRivalAt = -1e9; b.emoSend(id); const r = b._seen.filter(s => s[0] === 'r').length; return r; }), ids);
  await B(page, (b) => { b.emoSend(0); return 1; });
  await wait(page, 1500);
  const first = await B(page, b => b._seen.filter(s => s[0] === 'r').map(s => s[1]));
  expect(first.length).toBe(1);
  expect([2, 12, 13]).toContain(first[0]); // boss row
  // 8 sends: all shown, only 6 kept
  await B(page, b => { for (let i = 0; i < 8; i++) { b.emoAt = -1e9; b.emoSend(i); } return 1; });
  expect(await B(page, b => b.emoLog.length)).toBe(6);
  expect(await B(page, b => b._seen.filter(s => s[0] === 'h').length)).toBe(9);
  expect(await B(page, b => b.emoLog)).toEqual([0, 0, 1, 2, 3, 4]);
  // direct answers: a sad emoji gets a hug or a thumbs up, even from the boss
  const sad = await B(page, b => { const out = []; for (let i = 0; i < 12; i++) { b.emoRivalAt = -1e9; out.push(b.emoAnswer(i % 2 ? 6 : 10)); } return out; });
  sad.forEach(id => expect([7, 14]).toContain(id));
  noErrors(page);
});

test('personality: a cheeky rival (Timmy) answers a friendly emoji with 8 or 13; a kind one (Moo) with 4, 7 or 14; toys stay kind', async ({ page }) => {
  await duel(page, { rival: 0 });
  const ans = (mine, n = 12) => B(page, (b, a) => { const out = []; for (let i = 0; i < a[1]; i++) { b.emoRivalAt = -1e9; out.push(b.emoAnswer(a[0])); } return out; }, [mine, n]);
  (await ans(0)).forEach(id => expect([8, 13]).toContain(id));
  await B(page, b => { b.R = __RIVALS[1]; return 1; }); // Moo
  (await ans(0)).forEach(id => expect([4, 7, 14]).toContain(id));
  await B(page, b => { b.R = __RIVALS[0]; b.mode = 'friend'; return 1; }); // friends' toys and Jacks: kind
  (await ans(0)).forEach(id => expect([4, 7, 14]).toContain(id));
  // rival at low pep
  await B(page, b => { b.mode = 'campaign'; b.rival.hp = 5; return 1; });
  (await ans(0)).forEach(id => expect([6, 8, 10]).toContain(id));
  noErrors(page);
});

test('the rival reacts alone once: never in the first 2 s, a very big hit (cry) and winning (LOL)', async ({ page }) => {
  await duel(page);
  expect(await B(page, b => { b.emoT0 = performance.now() - 500; return b.emoSolo('hit'); })).toBe(false); // too early
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.emoT0 = performance.now() - 5000; });
  expect(await B(page, b => b.emoSolo('hit'))).toBe(10);
  expect(await B(page, b => b.emoSolo('hit'))).toBe(false); // once
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.emoRivalAt = -1e9; });
  expect(await B(page, b => b.emoSolo('win'))).toBe(false); // at most ONE solo reaction per duel
  await B(page, b => { b.emoSoloDone = false; b.emoRivalAt = -1e9; return 1; });
  expect(await B(page, b => b.emoSolo('win'))).toBe(2);
  await B(page, b => { PSPrefs.set('emoji', false); b.emoSoloDone = false; b.emoRivalAt = -1e9; return 1; });
  expect(await B(page, b => b.emoSolo('hit'))).toBe(false); // the toggle is off
  noErrors(page);
});

test('Settings: EMOJI row (default ON); OFF hides the button, the tray, the answers', async ({ page }) => {
  await boot(page);
  expect(await page.evaluate(() => PSPrefs.data.emoji)).toBe(true);
  await go(page, 'settings');
  const rows = await page.evaluate(() => { const s = __game.scene.getScene('settings'); return Object.keys(s.rows); });
  expect(rows).toContain('emoji');
  await page.evaluate(() => __game.scene.getScene('settings').choose('emoji', false));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('plushsquad_prefs')).emoji)).toBe(false);
  await go(page, 'battle', { rival: 0 });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page);
  expect(await B(page, b => b.emoBtn.visible)).toBe(false);
  expect(await B(page, b => b.emoSend(3))).toBe(false);
  expect(await B(page, b => b.emoAnswer(3))).toBe(null);
  await page.evaluate(() => PSPrefs.set('emoji', true));
  await B(page, b => { b.emoSync(); return 1; });
  expect(await B(page, b => b.emoBtn.visible)).toBe(true);
  noErrors(page);
});

test('every duel mode has the button; the map and the result panel do not', async ({ page }) => {
  const save = Object.assign({}, BASE_SAVE);
  await boot(page, save);
  await page.evaluate(() => { const t = Object.assign(PSToys.createToy({ arch: 'bear', element: 'fire', seed: 4242, aspect: 1 }), { id: 'tg', name: 'Teddy', xp: 0 }); __save.data.toys = [t]; __game.textures.addImage('toy_tg', __game.textures.get('jack_front').getSourceImage()); });
  const modes = { campaign: { rival: 0 }, boss: { rival: 3 }, toy: { toy: 'tg' }, friendJack: { fjack: { level: 3 }, ownerName: 'Max' }, kraken: { boss: true } };
  for (const [name, data] of Object.entries(modes)) {
    await go(page, 'battle', data);
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
    await waitTurn(page);
    const r = await B(page, b => ({ mode: b.mode, vis: b.emoBtn.visible, sent: (b.emoSend(1), b.emoLog.slice()) }));
    expect(r, name).toMatchObject({ vis: true, sent: [1] });
    await wait(page, 500);
  }
  await go(page, 'map');
  expect(await page.evaluate(() => !!__game.scene.getScene('map').emoBtn)).toBe(false);
  noErrors(page);
});

test('result panel: the button is gone, and result() works in every mode (campaign, boss rival, friend, Kraken; win and lose)', async ({ page }) => {
  await boot(page);
  const modes = { campaign: { rival: 0 }, campaignBoss: { rival: 3 }, friendJack: { fjack: { level: 3 }, ownerName: 'Max' }, kraken: { boss: true } };
  for (const [name, data] of Object.entries(modes)) {
    for (const won of [true, false]) {
      await go(page, 'battle', data);
      const xp0 = await page.evaluate(() => __save.data.xp);
      await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null) });
      await waitTurn(page);
      await B(page, b => { b.emoSend(5); return 1; });
      await page.evaluate(won => { const b = __game.scene.getScene('battle'); if (won) b.rival.hp = 0; else b.hero.hp = 0; b.finish(won); }, won);
      await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __save.data.xp); }, { timeout: 90000, message: name + won }).toBeGreaterThan(xp0);
      expect(await B(page, b => b.emoBtn.visible), name).toBe(false);
    }
  }
  noErrors(page);
});

test('rotation: emoLog is in snapshot() and restored, the tray and bubbles are dropped, a running turn still defers it', async ({ page }) => {
  await duel(page, { rival: 0 }, BASE_SAVE, [390, 844]);
  await B(page, b => { b.emoSend(3); b.emoAt = -1e9; b.emoSend(9); return 1; });
  expect(await B(page, b => b.snapshot().emoLog)).toEqual([3, 9]);
  await wait(page, 2200);
  await openTray(page);
  expect(await B(page, b => !!b.emoTray)).toBe(true);
  await page.evaluate(() => { window.__oldGame = __game; });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.__game && window.__game !== window.__oldGame && __game.scene.isActive('battle') && __game.scene.getScene('battle').hero, null, { timeout: 90000 });
  await fast(page); await wait(page, 1500);
  const r = await B(page, b => ({ log: b.emoLog, tray: !!b.emoTray, bub: [!!b.emoBub.h, !!b.emoBub.r], vis: b.emoBtn.visible, portrait: window.__psPortrait }));
  expect(r).toEqual({ log: [3, 9], tray: false, bub: [false, false], vis: true, portrait: false });
  // the button does not block rotation (it is not a turn): while a turn runs it is deferred as before
  await B(page, b => { b.playerMove(b.moves[0].k); return 1; });
  await page.evaluate(() => { window.__oldGame = __game; });
  await page.setViewportSize({ width: 390, height: 844 });
  await wait(page, 800);
  expect(await page.evaluate(() => window.__psRotatePending)).toBeTruthy();
  noErrors(page);
});

// the friend win mail: emo ids ride on the existing 'beat' payload
async function friendWin(page, emoSent) {
  await boot(page);
  await page.evaluate(() => { PSNet.ready = true; PSNet.user = { id: 'u1', name: 'kid' }; window.__sent = []; PSNet.send = async (to, kind, p) => { window.__sent.push([to, kind, p]); return { ok: true }; }; });
  await go(page, 'battle', { fjack: { level: 3 }, ownerName: 'Max', ownerId: 'u2' });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page);
  await B(page, (b, ids) => { ids.forEach(id => { b.emoAt = -1e9; b.emoSend(id); }); return 1; }, emoSent);
  const xp0 = await page.evaluate(() => __save.data.xp);
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __save.data.xp); }, { timeout: 90000 }).toBeGreaterThan(xp0);
  return page.evaluate(() => window.__sent);
}
test('friend win: the beat mail carries emo (max 6, ids 0-15); no emoji sends the old payload', async ({ page }) => {
  const sent = await friendWin(page, [3, 14, 2, 2, 0, 9, 10, 11]);
  expect(sent).toEqual([['u2', 'beat', { toy: 'Jack', toyId: 'jack', emo: [3, 14, 2, 2, 0, 9] }]]);
  noErrors(page);
});
test('friend win with no emoji: the old payload, unchanged', async ({ page }) => {
  const sent = await friendWin(page, []);
  expect(sent).toEqual([['u2', 'beat', { toy: 'Jack', toyId: 'jack' }]]);
  noErrors(page);
});
test('friend loss sends no mail', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { PSNet.ready = true; PSNet.user = { id: 'u1', name: 'kid' }; window.__sent = []; PSNet.send = async (...a) => { window.__sent.push(a); return { ok: true }; }; });
  await go(page, 'battle', { fjack: { level: 3 }, ownerName: 'Max', ownerId: 'u2' });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
  await waitTurn(page);
  await B(page, b => { b.emoSend(3); return 1; });
  const xp0 = await page.evaluate(() => __save.data.xp);
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.hero.hp = 0; b.finish(false); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => __save.data.xp); }, { timeout: 90000 }).toBeGreaterThan(xp0);
  expect(await page.evaluate(() => window.__sent)).toEqual([]);
  noErrors(page);
});

test('mail: the receiver keeps only integers 0-15 (max 6) and shows them as small emoji; text is ignored', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await page.evaluate(() => {
    PSNet.ready = true; PSNet.user = { id: 'u1', name: 'kid', code: 'ABCD-EF' };
    PSNet.sb = { from: () => { const q = { select: () => q, eq: () => q, order: () => q, limit: () => Promise.resolve({ data: [
      { id: 1, kind: 'beat', from_name: 'Lena', payload: { toy: 'Jack', toyId: 'jack', emo: [3, 14, 99, 'hi', -1, 2.5, 0, 7, 8, 9, 10] } },
      { id: 2, kind: 'beat', from_name: 'Max', payload: { toy: 'Jack', emo: 'free text here' } },
      { id: 3, kind: 'beat', from_name: 'Ann', payload: { toy: 'Jack' } }] }) }; return q; } };
  });
  const list = await page.evaluate(async () => (await PSNet.inbox()).map(m => m.payload.emo));
  expect(list).toEqual([[3, 14, 0, 7, 8, 9], [], []]);
  await go(page, 'friends', { tab: 'mail' });
  await wait(page, 1500);
  const n = await page.evaluate(() => __game.scene.getScene('friends').children.list.filter(o => o.type === 'Image' && o.texture.key === 'icons3').length);
  expect(n).toBe(6);
  noErrors(page);
});

// ---- layout: the button and the tray stay clear of cards, tool buttons, the log, the back and mute buttons
const boxes = b => {
  const W = __game.config.width, H = __game.config.height, out = {};
  const box = (x, y, w, h) => ({ x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 });
  out.cards = b.moves.map((m, i) => box(m.card.x, m.card.y, m.card.width, m.card.height));
  const bby = b.bby;
  out.tools = [box(W / 2, bby, 420, 137), box(W / 2 - 230, bby, 420, 137), box(W / 2 + 230, bby, 420, 137)]; // BLOCK IT!, FOAM!/UMBRELLA! (either side), ALARM!, PUSH!
  const lb = b.logT.getBounds(); out.log = [{ x0: lb.x, x1: lb.x + lb.width, y0: lb.y, y1: lb.y + lb.height }];
  const bb = o => { const r = o.getBounds(); return { x0: r.x, x1: r.x + r.width, y0: r.y, y1: r.y + r.height }; };
  out.bars = [bb(b.hero.bar.c), bb(b.rival.bar.c)];
  out.back = [box(80, 80, 92, 92)]; out.mute = [box(W - 80, 80, 92, 92)];
  out.W = W; out.H = H;
  return out;
};
const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
for (const [w, h] of SIZES) {
  test(`layout ${w}x${h}: emoji button and tray clear of cards, tool buttons, log, pep bars, back and mute (right and left hand)`, async ({ page }) => {
    const save = Object.assign({}, BASE_SAVE, { xp: 9000 }); // more moves: 2 card rows
    await duel(page, { rival: 3 }, save, [w, h]);
    for (const hand of ['right', 'left']) {
      await page.evaluate(hand => { PSPrefs.set('hand', hand); }, hand);
      await page.evaluate(() => { __game.scene.getScene('battle').scene.restart({ rival: 3 }); });
      await page.waitForFunction(() => __game.scene.getScene('battle').hero && __game.scene.getScene('battle').emoBtn, null, { timeout: 30000 });
      await fast(page); await wait(page, 1500);
      await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
      await waitTurn(page);
      expect(await openTray(page)).toBe(true);
      const r = await B(page, (b, src) => {
        const bx = eval('(' + src + ')')(b), W = bx.W, H = bx.H, e = b.emoBtn, t = b.emoTray;
        return { bx, btn: { x0: e.x - 48, x1: e.x + 48, y0: e.y - 48, y1: e.y + 48 }, tray: { x0: t.x, x1: t.x + t.w, y0: t.y, y1: t.y + t.h }, cols: t.cols, cell: t.cell, W, H, left: e.x < W / 2 };
      }, boxes.toString());
      expect(r.left, hand).toBe(hand === 'left');
      const bad = [];
      for (const [name, items] of Object.entries(r.bx)) if (Array.isArray(items)) items.forEach((it, i) => {
        if (hit(r.btn, it)) bad.push('button/' + name + i);
        if (hit(r.tray, it)) bad.push('tray/' + name + i);
      });
      expect(bad, `${w}x${h} ${hand} cols ${r.cols}x${r.cell}`).toEqual([]);
      // inside the play area
      expect(r.tray.x0).toBeGreaterThanOrEqual(0); expect(r.tray.x1).toBeLessThanOrEqual(r.W);
      expect(r.tray.y0).toBeGreaterThanOrEqual(0); expect(r.tray.y1).toBeLessThanOrEqual(r.H);
      expect(r.btn.x0).toBeGreaterThanOrEqual(0); expect(r.btn.x1).toBeLessThanOrEqual(r.W);
    }
    noErrors(page);
  });
}

test('calm mode: bubbles fade in without a pop, the rival still answers', async ({ page }) => {
  await duel(page);
  await page.evaluate(() => PSPrefs.set('calm', true));
  const sc = await B(page, b => { b.emoSend(0); const c = b.emoBub.h; return { scale: c.scale, alpha: c.alpha }; });
  expect(sc.scale).toBe(1);
  expect(sc.alpha).toBeLessThan(1);
  await wait(page, 1500);
  expect((await B(page, b => b._seen.filter(s => s[0] === 'r').length))).toBe(1);
  noErrors(page);
});

test('big-hit answer follows the whole last move: multi-hit counts, and it is reset by the next move', async ({ page }) => {
  await duel(page);
  const r = await B(page, b => {
    const out = {}; b.heroMaxDmg = 20;
    b.moveDmg = 0; b.inMove = true; b.moveDmg += 8; b.moveDmg += 8; b.inMove = false; b.lastBig = b.moveDmg >= 0.7 * b.heroMaxDmg; out.multi = b.lastBig; // 16 >= 14
    out.beforeMove = b.lastBig;
    return out;
  });
  expect(r).toEqual({ multi: true, beforeMove: true });
  // a real small move resets it
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.heroMaxDmg = 1000; b.playerMove(b.moves[0].k); });
  await wait(page, 1500);
  expect(await B(page, b => [b.lastBig, b.moveDmg > 0])).toEqual([false, true]);
  noErrors(page);
});

test('cooldown dim: closing the tray keeps the button dimmed while cooling; thumbs down boings, crying wobbles', async ({ page }) => {
  await duel(page);
  const r = await B(page, b => {
    const calls = []; ['emoBoing', 'emoSad', 'emoSend', 'emoReply'].forEach(n => { const o = PSAudio[n]; PSAudio[n] = () => calls.push(n); });
    b.emoBtn.emit('pointerup', {}); b.emoSend(0); const dim = b.emoBtn.alpha; b.emoBtn.emit('pointerup', {}); b.emoClose(); const dim2 = b.emoBtn.alpha;
    b.emoSound(15, false); b.emoSound(10, false); b.emoSound(6, false); b.emoSound(6, true); b.emoSound(15, true);
    return { dim, dim2, calls };
  });
  expect(r.dim).toBeLessThan(1); expect(r.dim2).toBeLessThan(1);
  expect(r.calls).toEqual(['emoSend', 'emoBoing', 'emoSad', 'emoSend', 'emoReply', 'emoBoing']);
  await wait(page, 2500);
  expect(await B(page, b => b.emoBtn.alpha)).toBe(1);
  noErrors(page);
});

test('tray never covers a card: when the main band is too small it uses the arena or stays closed', async ({ page }) => {
  await duel(page, { rival: 3 }, Object.assign({}, BASE_SAVE, { xp: 9000 }));
  const r = await B(page, b => {
    const real = b.moves.map(m => ({ y0: m.card.y - m.card.height / 2, y1: m.card.y + m.card.height / 2 }));
    b.rects.forEach(x => { x.y -= 450; }); // pretend the cards start much higher: the main band shrinks
    b.emoBtn.emit('pointerup', {});
    const t = b.emoTray; if (!t) return { open: false };
    return { open: true, hits: real.filter(c => t.y < c.y1 && t.y + t.h > c.y0).length, h: t.h, y: t.y, log: b.logT.y - b.logT.height / 2 };
  });
  if (r.open) expect(r.hits).toBe(0);
  noErrors(page);
});
