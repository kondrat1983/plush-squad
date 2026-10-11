// Bug fixes after v0.9.0: B61 (#69) Cyrillic in the kid-safe name filter, B62 (#70) mail pager, B63 (#71) TOP CATCH tab,
// B64 (#72) Canada comic panel 3 in landscape, B66 + B67 (#75) Space bubble in portrait and the Hills Zzz.
// The online part is stubbed in the page (tests block *.supabase.co).
const { test, expect } = require('@playwright/test');
const { boot, go, fast, noErrors } = require('./helpers');

const texts = (page, key) => page.evaluate(key => {
  const out = [], walk = l => l.forEach(o => { if (o.type === 'Text' && o.visible) out.push(o.text); if (o.list) walk(o.list); });
  walk(__game.scene.getScene(key).children.list); return out;
}, key);
const tapLabel = (page, key, label) => page.evaluate(([key, label]) => {
  const find = l => { for (const o of l) { if (o.list) { if (o.input && o.list.some(t => t.type === 'Text' && t.text === label)) return o; const r = find(o.list); if (r) return r; } } return null; };
  const c = find(__game.scene.getScene(key).children.list); if (!c) return false; c.emit('pointerup', {}); return true;
}, [key, label]);
const fakeNet = (page, sb) => page.evaluate(sb => {
  PSNet.ready = true; PSNet.user = { id: 'u1', name: 'kid', code: 'ABCD-EF' };
  PSNet.sb = eval('(' + sb + ')');
}, sb);

test('B61: Cyrillic spellings and look-alike letters are caught; harmless names pass; player names use the same list', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const T = PSToys;
    const bad = ['сука', 'СУКА', 'с у к а', 'хуй', 'хyй', 'блять', 'пизда', 'мудак', 'ёбаный', 'заебал', 'пидор', 'сучка', 'бля', 'cyкa',
      'fuсk', 'shіt', 'Вiтch', 'Мr Аss', 'Fuck Мишка', 'Die', 'tit', 'blue tit fuck', 'swankshit'];
    const ok = ['Shiitake', 'Shitake Mushroom', 'Swanky', 'Blue Tit', 'Blue-Tit', 'Die Hard', 'Peacock', 'Cockatoo',
      'Мишка', 'Чебурашка', 'Лохматик', 'Котик', 'Пушистик', 'Ёжик', 'Хрюша', 'Чихуахуа', 'Ушастик', 'Хлебушек', 'Кораблик', 'Teddy Мишка'];
    return {
      missed: bad.filter(n => !T.badName(n)),
      blocked: ok.filter(n => T.badName(n)),
      user: ['tit_head', 'mr_ass', 'idiot99'].map(n => PSNet.checkName(n)),
      userOk: ['max_2016', 'shiitake', 'swanky'].map(n => PSNet.checkName(n)),
    };
  });
  expect(r.missed).toEqual([]);
  expect(r.blocked).toEqual([]);
  expect(r.user).toEqual(['Please pick a different name', 'Please pick a different name', 'Please pick a different name']);
  expect(r.userOk).toEqual([null, null, null]);
  noErrors(page);
});

for (const [w, h] of [[390, 844], [1180, 820]]) {
  test(`B62: mail arrows are 90 px+ tall and the pager sits right below the list (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page);
    // a short last page: one message more than fits on the first page
    const per = await page.evaluate(() => { const H = __game.config.height, top = (H > __game.config.width ? 290 : 175) + 80 + 40; return Math.max(1, Math.floor((H - top - 150) / 164)); });
    await fakeNet(page, `{ rpc: async () => ({ data: [] }), from: () => { const q = { select: () => q, eq: () => q, order: () => q,
      limit: () => Promise.resolve({ data: Array.from({ length: ${per + 1} }, (_, i) => ({ id: i + 1, kind: 'friend', from_name: 'p' + (i + 1) })) }) }; return q; } }`);
    const pager = async () => {
      await expect.poll(async () => { await fast(page); return (await texts(page, 'friends')).some(s => /^\d \/ 2$/.test(s)); }, { timeout: 30000 }).toBe(true);
      return page.evaluate(() => {
        const s = __game.scene.getScene('friends'), L = s.children.list;
        const arrows = L.filter(o => o.type === 'Container' && o.input && o.list.some(t => t.text === '◀' || t.text === '▶')).map(o => ({ y: o.y, w: o.width * o.scaleX, h: o.height * o.scaleY }));
        const rows = L.filter(o => o.type === 'Text' && / added you as a friend!$/.test(o.text)).map(o => o.y);
        return { arrows, lastRow: Math.max(...rows), H: __game.config.height };
      });
    };
    await go(page, 'friends', { tab: 'mail' });
    let p = await pager();
    expect(p.arrows.length).toBe(1);
    for (const a of p.arrows) { expect(a.h).toBeGreaterThanOrEqual(90); expect(a.w).toBeGreaterThanOrEqual(90); expect(a.y + a.h / 2).toBeLessThanOrEqual(p.H); }
    expect(await tapLabel(page, 'friends', '▶')).toBe(true);
    await expect.poll(async () => { await fast(page); return texts(page, 'friends'); }, { timeout: 30000 }).toContain('2 / 2');
    p = await pager();
    // the last page has one message; the arrow sits just under its card (card: 150 tall around the text line)
    const a = p.arrows[0], gap = (a.y - a.h / 2) - (p.lastRow + 75);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(60);
    noErrors(page);
  });
}

for (const [w, h] of [[375, 667], [1194, 834]]) {
  test(`B63: Friends tabs keep a gap between the icon and the label (${w}x${h})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await boot(page);
    await fakeNet(page, `{ rpc: async () => ({ data: [] }), from: () => { const q = { select: () => q, eq: () => q, or: () => q, order: () => q, limit: () => Promise.resolve({ data: [] }), then: r => r({ data: [] }) }; return q; } }`);
    await go(page, 'friends', { tab: 'top' });
    const tabs = await page.evaluate(() => __game.scene.getScene('friends').children.list
      .filter(o => o.type === 'Container' && o.input && o.list.some(t => ['FRIENDS', 'MAIL', 'MUSEUM', 'TOP CATCH'].includes(t.text)))
      .map(o => { const im = o.list.find(t => t.type === 'Image'), t = o.list.find(t => t.type === 'Text');
        return { label: t.text, iconRight: im.x + im.displayWidth / 2, textLeft: t.x - t.displayWidth / 2, textRight: t.x + t.displayWidth / 2, half: o.width / 2 }; }));
    expect(tabs.map(t => t.label)).toEqual(['FRIENDS', 'MAIL', 'MUSEUM', 'TOP CATCH']);
    for (const t of tabs) { expect(t.textLeft - t.iconRight, t.label).toBeGreaterThanOrEqual(6); expect(t.textRight, t.label).toBeLessThanOrEqual(t.half); }
    noErrors(page);
  });
}

// panel i of the comic on its title page (all panels drawn), in panel coordinates
const comicPanel = (page, i) => page.evaluate(i => {
  const p = __game.scene.getScene('comic').panels[i];
  const items = p.list.map(o => ({ type: o.type, key: o.texture ? o.texture.key : null, x: o.x, y: o.y, w: o.displayWidth, h: o.displayHeight,
    text: o.list && (o.list.find(t => t.type === 'Text') || {}).text, tw: o.list && (o.list.find(t => t.type === 'Text') || {}).width,
    th: o.list && (o.list.find(t => t.type === 'Text') || {}).height, scale: o.scaleX }));
  return { w: p.r.w, h: p.r.h, items };
}, i);

for (const [name, vp] of [['iPad landscape', [1194, 834]], ['iPhone SE landscape', [667, 375]], ['iPad portrait', [1024, 1366]], ['iPad mini', [744, 1133]]]) {
  test(`B64: Canada panel 3 pine and Sasquatch and the panel 2 FWUMP! stay inside their panels (${name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp[0], height: vp[1] });
    await boot(page);
    await go(page, 'comic', { world: 'canada', panel: 3 });
    const p3 = await comicPanel(page, 2);
    for (const k of ['pine', 'sasquatch']) {
      const a = p3.items.find(o => o.key === k);
      expect(Math.abs(a.x) + a.w / 2, k).toBeLessThanOrEqual(p3.w / 2);
    }
    const p2 = await comicPanel(page, 1);
    const fw = p2.items.find(o => o.text === 'FWUMP!');
    // half the star's width (scaled); a little overlap on the border is comic style
    const half = await page.evaluate(() => __game.scene.getScene('comic').panels[1].list.find(o => o.list && o.list.some(t => t.text === 'FWUMP!')).halfW);
    expect(half).toBeGreaterThan(50);
    expect(Math.abs(fw.x) + half).toBeLessThanOrEqual(p2.w / 2 + 14);
    noErrors(page);
  });
}

for (const [name, vp] of [['iPhone SE', [375, 667]], ['iPad 11 portrait', [834, 1194]], ['iPad mini', [744, 1133]]]) {
  test(`B66: Space panel 2 bubble clears Jack in the beam and the panel border (${name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp[0], height: vp[1] });
    await boot(page);
    await go(page, 'comic', { world: 'space', panel: 3 });
    const p = await comicPanel(page, 1);
    const j = p.items.find(o => o.key === 'jack_upside'), b = p.items.find(o => o.text === 'Put me DOWN! ...Okay, this is fun.');
    const bw = b.tw + 60, bh = b.th + 44;
    expect(b.x - bw / 2).toBeGreaterThanOrEqual(j.x + j.w / 2); // right of Jack
    expect(b.x + bw / 2).toBeLessThanOrEqual(p.w / 2 - 10); // off the border
    expect(Math.abs(b.y) + bh / 2).toBeLessThanOrEqual(p.h / 2 - 10);
    noErrors(page);
  });
}

for (const [name, vp] of [['iPhone SE', [375, 667]], ['iPad landscape', [1194, 834]]]) {
  test(`B67: Hills panel 1 Zzz starts at Jack's head (bottom left of the upside-down picture) (${name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp[0], height: vp[1] });
    await boot(page);
    await go(page, 'comic', { world: 'hills', panel: 3 });
    const r = await page.evaluate(() => {
      const s = __game.scene.getScene('comic'), p = s.panels[0];
      const j = p.list.find(o => o.texture && o.texture.key === 'jack_upside'), z = p.list.find(o => o.texture && o.texture.key === 'zzz');
      const tw = s.tweens.getTweensOf(z)[0], y0 = tw.data.find(d => d.key === 'y').start;
      return { jx: j.x, jw: j.displayWidth, jy: j.y, jh: j.displayHeight, zx: z.x, zy0: y0, pw: p.r.w, zw: z.displayWidth };
    });
    expect(r.zx).toBeLessThan(r.jx - r.jw * 0.3); // left side, where the head is
    expect(r.zy0).toBeGreaterThan(r.jy - r.jh * 0.4); // the lower part of the picture
    expect(r.zx - r.zw / 2).toBeGreaterThanOrEqual(-r.pw / 2); // inside the panel
    noErrors(page);
  });
}
