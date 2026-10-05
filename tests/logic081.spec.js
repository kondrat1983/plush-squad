// v0.8.1 hotfix: B38 (#4) tap kept through a rotation rebuild, B13 (#16) kid-safe names, B22 (#21) one toy worker,
// B23 (#22) Weekly Boss error screen, B27 (#25) press-down feedback, B28 (#26) mail pages.
// The online part is stubbed in the page (tests block *.supabase.co).
const { test, expect } = require('@playwright/test');
const { boot, go, wait, fast, noErrors } = require('./helpers');

const texts = (page, key) => page.evaluate(key => {
  const out = [], walk = l => l.forEach(o => { if (o.type === 'Text' && o.visible) out.push(o.text); if (o.list) walk(o.list); });
  walk(__game.scene.getScene(key).children.list); return out;
}, key);

// emits a pointer event on the first container in the scene that holds a text with this label
const tapLabel = (page, key, label, ev = 'pointerup') => page.evaluate(([key, label, ev]) => {
  const find = l => { for (const o of l) { if (o.list) { if (o.input && o.list.some(t => t.type === 'Text' && t.text === label)) return o; const r = find(o.list); if (r) return r; } } return null; };
  const c = find(__game.scene.getScene(key).children.list); if (!c) return false; c.emit(ev, {}); return true;
}, [key, label, ev]);

// a logged-in player with a stubbed server
const fakeNet = (page, sb) => page.evaluate(sb => {
  PSNet.ready = true; PSNet.user = { id: 'u1', name: 'kid', code: 'ABCD-EF' };
  PSNet.sb = eval('(' + sb + ')');
}, sb);

test('B13: the name filter blocks rude words, leetspeak and spacing, and keeps normal names', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const T = PSToys, all = [];
    T.ARCH.forEach(a => { all.push(a.name, ...a.nicks); Object.keys(T.ELEMENTS).forEach(e => all.push(...T.nameIdeas(a.id, e))); });
    return {
      bad: ['Fuck', 'f u c k', 'SH1T', 'B!tch', '@ss', 'a s s', 'Mr Ass', 'fuuuck', 'Idi0t', 'stupid'].filter(n => !T.badName(n)),
      ok: ['Cassie', 'Grape', 'Skills', 'Dickens', 'Classy', 'Pussycat', 'Mr Snuggles', 'Ted 2', 'Sushi Tiger', 'Kung Fu Kitty', 'Tofu Kat', 'Magic Untamed'].filter(n => T.badName(n)),
      nicks: all.filter(n => T.badName(n)),
    };
  });
  expect(r).toEqual({ bad: [], ok: [], nicks: [] });
  noErrors(page);
});

test('B13: Studio asks again for a kinder toy name, then saves a normal one', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await go(page, 'studio');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const r1 = await page.evaluate(async png => {
    const st = __game.scene.getScene('studio');
    st.cut = { url: png }; st.toy = { id: 'tbad', arch: 'bear', element: 0, quirk: 0, hp: 100, name: 'Sh1t Head', seed: 1 };
    await st.save();
    return { name: st.toy.name, toys: __save.data.toys.length };
  }, png);
  expect(r1).toEqual({ name: 'Teddy', toys: 0 });
  expect(await texts(page, 'studio')).toContain('Let\'s pick a kinder name!');
  const r2 = await page.evaluate(async () => { const st = __game.scene.getScene('studio'); st.toy.name = 'Fluffy'; await st.save(); return __save.data.toys.map(t => t.name); });
  expect(r2).toEqual(['Fluffy']);
  noErrors(page);
});

test('B13: names from friends are filtered (mail, museum, squad, board)', async ({ page }) => {
  await boot(page);
  await fakeNet(page, `{
    from: () => { const q = { select: () => q, eq: () => q, order: () => q,
      limit: () => Promise.resolve({ data: [{ id: 1, kind: 'beat', from_name: 'b1tch', payload: { toy: 'f u c k' } }, { id: 2, kind: 'friend', from_name: 'lena' }] }),
      then: (r) => r({ data: [{ id: 'x:t1', meta: { id: 't1', arch: 'cat', name: 'Fuuuck' }, img: '' }, { id: 'x:t2', meta: { id: 't2', arch: 'cat', name: 'Mittens' }, img: '' }] }) }; return q; },
    rpc: async (n) => n === 'museum' ? { data: [{ id: 'a:t', username: 'sh1tlord', meta: { arch: 'bunny', name: 'Big @ss' } }] }
      : n === 'catch_board' ? { data: [{ username: 'idiot', score: 5 }, { username: 'max', score: 3 }] } : { data: [] } }`);
  const r = await page.evaluate(async () => ({
    mail: (await PSNet.inbox()).map(m => [m.from_name, m.payload && m.payload.toy]),
    museum: (await PSNet.museum()).map(t => [t.username, t.meta.name]),
    squad: (await PSNet.squad('x')).map(t => t.meta.name),
    board: (await PSNet.board()).map(b => b.username),
  }));
  expect(r).toEqual({
    mail: [['Player', 'toy'], ['lena', undefined]],
    museum: [['Player', 'Bun-Bun']],
    squad: ['Whiskers', 'Mittens'],
    board: ['Player', 'max'],
  });
  noErrors(page);
});

test('B23: Weekly Boss shows an error with RETRY and BACK when the server call fails', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await boot(page);
  await fakeNet(page, `{ rpc: async () => ({ data: null, error: { message: 'rpc failed' } }) }`);
  await go(page, 'boss');
  await expect.poll(async () => { await fast(page); return texts(page, 'boss'); }, { timeout: 30000 }).toContain('RETRY');
  const t = await texts(page, 'boss');
  expect(t).toContain('BACK');
  expect(t).not.toContain('Loading...');
  // the server is back: RETRY shows the Kraken
  await page.evaluate(() => { PSNet.sb = { rpc: async () => ({ data: { name: 'Pillow Kraken', max_hp: 6000, dmg: 100, my_dmg: 0, claimed: false, tries_left: 3 } }) }; });
  expect(await tapLabel(page, 'boss', 'RETRY')).toBe(true);
  await expect.poll(async () => { await fast(page); return (await texts(page, 'boss')).some(s => /pep left/.test(s)); }, { timeout: 30000 }).toBe(true);
  // BACK goes to the map
  await page.evaluate(() => { PSNet.sb = { rpc: async () => ({ data: null, error: { message: 'x' } }) }; __game.scene.getScene('boss').scene.restart(); });
  await expect.poll(async () => { await fast(page); return texts(page, 'boss'); }, { timeout: 30000 }).toContain('BACK');
  expect(await tapLabel(page, 'boss', 'BACK')).toBe(true);
  await page.waitForFunction(() => __game.scene.isActive('map'), null, { timeout: 30000 });
  noErrors(page);
});

for (const [w, h] of [[390, 844], [1180, 820]]) {
  test(`B28: mail shows the 30 newest in pages (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page);
    await fakeNet(page, `{ rpc: async () => ({ data: [] }), from: () => { const q = { select: () => q, eq: () => q, order: () => q,
      limit: () => Promise.resolve({ data: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, kind: 'friend', from_name: 'p' + (i + 1) })) }) }; return q; } }`);
    await go(page, 'friends', { tab: 'mail' });
    await expect.poll(async () => { await fast(page); return (await texts(page, 'friends')).some(s => /^1 \/ \d+$/.test(s)); }, { timeout: 30000 }).toBe(true);
    const first = await texts(page, 'friends');
    const pages = +first.find(s => /^1 \/ \d+$/.test(s)).split(' / ')[1];
    expect(pages).toBeGreaterThan(1);
    expect(first).toContain('p1 added you as a friend!');
    expect(first).toContain('▶');
    expect(first).not.toContain('◀');
    expect(await tapLabel(page, 'friends', '▶')).toBe(true);
    await expect.poll(async () => { await fast(page); return texts(page, 'friends'); }, { timeout: 30000 }).toContain('2 / ' + pages);
    const second = await texts(page, 'friends');
    expect(second).toContain('◀');
    expect(second).not.toContain('p1 added you as a friend!');
    expect(await page.evaluate(() => __game.scene.getScene('friends').mailPage)).toBe(1);
    // a fresh visit to the mail tab starts on the first page again
    await page.evaluate(() => __game.scene.getScene('friends').scene.restart({ tab: 'mail' }));
    await expect.poll(async () => { await fast(page); return texts(page, 'friends'); }, { timeout: 30000 }).toContain('1 / ' + pages);
    noErrors(page);
  });
}

test('B22: the toy worker survives a rotation rebuild; CANCEL still replaces it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await go(page, 'studio');
  const made = await page.evaluate(() => { const w = window.__psToyWorker && __psToyWorker.w; if (w) w.__tag = 'first'; return !!w; });
  expect(made).toBe(true);
  await go(page, 'title');
  await page.evaluate(() => { window.__oldGame = __game; });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.__game && __game !== window.__oldGame && __game.scene.isActive('title'), null, { timeout: 90000 });
  await fast(page);
  await go(page, 'studio');
  expect(await page.evaluate(() => __psToyWorker.w && __psToyWorker.w.__tag)).toBe('first');
  // CANCEL during a job terminates and drops it; the next photo gets a fresh one
  const r = await page.evaluate(() => {
    const st = __game.scene.getScene('studio'); let got = null;
    st.job = { finish: m => { got = m.type; } }; st.busyState = true; st.cancelJob();
    return { gone: __psToyWorker.w === null, got };
  });
  expect(r).toEqual({ gone: true, got: 'cancel' });
  noErrors(page);
});

test('B38: a result tap during the fade survives a rotation rebuild', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await go(page, 'battle', { rival: 0 });
  await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick) b._pick(null); b.rival.hp = 0; b.finish(true); });
  await expect.poll(async () => { await wait(page, 500); return page.evaluate(() => { const b = __game.scene.getScene('battle'); return !!b.shown && !b.celebrating; }); }, { timeout: 90000 }).toBe(true);
  await wait(page, 2000);
  // tap NEXT RIVAL, and the (debounced) rotation rebuild fires while the screen is still fading
  const target = await page.evaluate(() => {
    const b = __game.scene.getScene('battle');
    const find = l => { for (const o of l) { if (o.list) { if (o.input && o.list.some(t => t.type === 'Text' && t.text === 'NEXT RIVAL')) return o; const r = find(o.list); if (r) return r; } } return null; };
    find(b.children.list).emit('pointerup', {});
    const snap = window.__psSnapshot();
    window.__oldGame = __game; window.__psRebuild();
    return snap;
  });
  expect(target).toEqual({ key: 'battle', data: { rival: 1 } });
  await page.waitForFunction(() => window.__game && __game !== window.__oldGame && __game.scene.isActive('battle'), null, { timeout: 90000 });
  await fast(page); await wait(page, 1500);
  const r = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return { rival: b.data0.rival, shown: !!b.shown, over: b.over }; });
  expect(r).toEqual({ rival: 1, shown: false, over: false });
  noErrors(page);
});

test('B27: back, map nodes, world tabs, nav, capsule and Studio type buttons press down', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await boot(page);
  // press every target, give the tweens a few real frames, read the scales; then release and read again
  // (in-game timers are not used: at 2 fps one frame can run a timer before the tween has moved)
  const pressAll = async (key, pick) => {
    await page.evaluate(([key, pick]) => {
      const s = __game.scene.getScene(key), list = eval('(' + pick + ')')(s);
      window.__pt = { list, rest: {}, down: {}, up: {} };
      Object.entries(list).forEach(([k, c]) => { __pt.rest[k] = c.scale; c.emit('pointerdown', {}); });
    }, [key, pick]);
    await wait(page, 1500);
    await page.evaluate(() => Object.entries(__pt.list).forEach(([k, c]) => { __pt.down[k] = c.scale / __pt.rest[k]; c.emit('pointerout', {}); }));
    await wait(page, 2000);
    return page.evaluate(() => { Object.entries(__pt.list).forEach(([k, c]) => { __pt.up[k] = c.scale / __pt.rest[k]; }); return { down: __pt.down, up: __pt.up }; });
  };
  const check = r => Object.keys(r.down).forEach(k => {
    expect(r.down[k], k + ' pressed').toBeLessThan(0.96);
    // the capsule button and the next rival's node pulse (up to x1.1), so released means back in that band
    // (the scale before the press may have been anywhere in the pulse, so compare with a margin)
    expect(r.up[k], k + ' released').toBeGreaterThan(0.9);
    expect(r.up[k], k + ' released').toBeLessThan(1.12);
    expect(r.up[k] - r.down[k], k + ' released').toBeGreaterThan(0.05);
  });
  // title nav buttons (round, top left)
  check(await pressAll('title', `s => ({ nav: s.children.list.find(o => o.type === 'Container' && o.input && o.x === 90 && o.y === 85) })`));
  await go(page, 'map', { world: 0 });
  check(await pressAll('map', `s => {
    const ins = s.children.list.filter(o => o.type === 'Container' && o.input);
    const back = ins.find(o => o.x === 80 && o.y === 80);
    const cap = ins.filter(o => o.depth === 50 && o.y === 80 && o !== back).sort((a, b) => a.x - b.x)[0];
    const nodes = ins.filter(o => o.depth === 4), tabs = ins.filter(o => o.depth === 6 && o.list.length === 3);
    return { back, cap, node: nodes[nodes.length - 1], tab: tabs[0] };
  }`));
  // Studio "who is it?" picker circles
  await go(page, 'studio');
  await page.evaluate(() => { const st = __game.scene.getScene('studio'); st.scores = []; st.picker(); });
  check(await pressAll('studio', `s => ({ type: s.children.list.flatMap(o => o.list || [o]).find(o => o.type === 'Arc' && o.input && o.input.enabled && o.radius > 40) })`));
  noErrors(page);
});
