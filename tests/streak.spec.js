// v0.9 Pillow Week: the daily streak with a Sleepy Pillow (#32, docs/gdd/0.9-daily-streak.md), and #65 (no daily reward
// when the app opens into bedtime / the daily limit). The date is faked: Date runs `window.__psOff` ms ahead of the real clock.
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, fast, wait, noErrors } = require('./helpers');

const fakeDate = () => {
  const R = window.__RealDate = Date;
  class FD extends R {
    constructor(...a) { if (a.length) super(...a); else super(R.now() + (window.__psOff || 0)); }
    static now() { return R.now() + (window.__psOff || 0); }
  }
  window.Date = FD;
};
// moves the fake clock to noon, `n` days from the real today; returns that day's key
const setDay = (page, n, hour = 12) => page.evaluate(([n, hour]) => {
  const R = window.__RealDate, t = new R(); t.setHours(hour, 0, 0, 0); t.setDate(t.getDate() + n);
  window.__psOff = t.getTime() - R.now();
  PSExtra.checkAch(); // stickers the test save earns anyway (+1 capsule each) are counted before measuring the capsules
  return PSExtra.todayKey();
}, [n, hour]);
// date keys relative to the real today (node and the browser share the time zone)
const key = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const withStreak = (streak, extra = {}) => Object.assign({}, BASE_SAVE, { streak }, extra);
const state = page => page.evaluate(() => ({ caps: __save.data.caps, gold: __save.data.goldCaps || 0, xp: __save.data.xp, streak: JSON.parse(JSON.stringify(__save.data.streak)),
  popup: !!(__game.scene.isActive('map') && __game.scene.getScene('map')._psStreak), ach: Object.keys(__save.data.ach || {}) }));
const yay = page => page.evaluate(() => { const l = __game.scene.getScene('map')._psStreak; l.list[l.list.length - 1].emit('pointerup'); });

test.beforeEach(async ({ page }) => { await page.addInitScript(fakeDate); });

test('track logic: rewards, Sleepy Pillow, quiet restarts, new week, clock moved back, time-zone jump', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const E = PSExtra, D = 86400000, base = new Date(2026, 9, 5, 12).getTime(), k = n => E.todayKey(new Date(base + n * D));
    const out = {};
    // day 1..7 on 7 days in a row
    let st = E.blankStreak(); out.week = [];
    for (let i = 0; i < 7; i++) { const x = E.streakStep(st, k(i), base + i * D); st = x.st; out.week.push([x.kind, x.day, x.reward]); }
    out.weeks = st.weeks;
    // same day again: nothing
    out.same = E.streakStep(st, k(6), base + 6 * D + 3600000).kind;
    // the day after day 7: a new week, pillow ready
    let x = E.streakStep(st, k(7), base + 7 * D); out.newWeek = [x.kind, x.day, x.st.pillow, x.st.weeks, x.st.seen === k(7)];
    // skip one day: the Sleepy Pillow keeps the place
    st = E.blankStreak(); E.streakStep(st, k(0), base); E.streakStep(st, k(1), base + D);
    x = E.streakStep(st, k(3), base + 3 * D); out.pillow = [x.kind, x.day, x.st.pillow, x.napped, x.st.nap === k(3)];
    // a second skip in the same week: quiet restart
    x = E.streakStep(st, k(5), base + 5 * D); out.second = [x.kind, x.day, x.st.pillow, x.st.seen === k(5)];
    // two missed days: quiet restart
    st = E.blankStreak(); E.streakStep(st, k(0), base); E.streakStep(st, k(1), base + D);
    x = E.streakStep(st, k(4), base + 4 * D); out.gap3 = [x.kind, x.day];
    // clock back one day: nothing; three days: the track moves back quietly, the day number stays; the next day is gap 1
    st = E.blankStreak(); E.streakStep(st, k(0), base); E.streakStep(st, k(1), base + D); E.streakStep(st, k(2), base + 2 * D); st.seen = k(2);
    out.back1 = E.streakStep(st, k(1), base + D).kind;
    x = E.streakStep(st, k(-1), base - D); out.back3 = [x.kind, x.reward || null, st.days.length, st.days[2] === k(-1), st.seen === k(-1)];
    x = E.streakStep(st, k(0), base); out.after = [x.kind, x.day];
    // gap 2 but less than 36 hours: a time-zone jump east counts as the next day, no pillow used
    st = E.blankStreak(); E.streakStep(st, k(0), base + 10 * 3600000);
    x = E.streakStep(st, k(2), base + 10 * 3600000 + 30 * 3600000); out.tz = [x.kind, x.day, x.st.pillow];
    return out;
  });
  expect(r.week).toEqual([
    ['first', 1, { caps: 1 }], ['next', 2, { caps: 1, xp: 20 }], ['next', 3, { caps: 2 }], ['next', 4, { caps: 1, xp: 30 }],
    ['next', 5, { caps: 2 }], ['next', 6, { caps: 1, xp: 40 }], ['next', 7, { caps: 1, gold: 1, xp: 50 }]]);
  // the week: 9 capsules + 1 golden + 140 XP
  const sum = r.week.reduce((a, [, , w]) => ({ caps: a.caps + w.caps, gold: a.gold + (w.gold || 0), xp: a.xp + (w.xp || 0) }), { caps: 0, gold: 0, xp: 0 });
  expect(sum).toEqual({ caps: 9, gold: 1, xp: 140 });
  expect(r.weeks).toBe(1);
  expect(r.same).toBe('none');
  expect(r.newWeek).toEqual(['week', 1, 0, 1, true]);
  expect(r.pillow).toEqual(['pillow', 3, 1, true, true]);
  expect(r.second).toEqual(['restart', 1, 0, true]);
  expect(r.gap3).toEqual(['restart', 1]);
  expect(r.back1).toBe('none');
  expect(r.back3).toEqual(['fix', null, 3, true, true]);
  expect(r.after).toEqual(['next', 4]);
  expect(r.tz).toEqual(['next', 2, 0]);
  noErrors(page);
});

test('merge rule: later last day wins, same day keeps more days, weeks = the bigger, a restart is joined, never shorter', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const E = PSExtra, m = E.mergeStreak;
    const s = (days, o = {}) => Object.assign({ days, pillow: 0, at: 0, weeks: 0, seen: '' }, o);
    return {
      later: m(s(['2026-10-05', '2026-10-06']), s(['2026-10-05', '2026-10-06', '2026-10-07'])).days.length,
      older: m(s(['2026-10-05', '2026-10-06', '2026-10-07'], { seen: '2026-10-07' }), s(['2026-10-06'], { weeks: 2 })),
      same: m(s(['2026-10-07']), s(['2026-10-05', '2026-10-06', '2026-10-07'])).days.length,
      // the other device restarted today only because it did not know yesterday's days: joined
      join: m(s(['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']), s(['2026-10-07'])).days.length,
      // a real restart (two missed days) stays a restart
      real: m(s(['2026-10-01', '2026-10-02']), s(['2026-10-05'])).days,
      empty: m(undefined, s(['2026-10-07'])).days,
    };
  });
  expect(r.later).toBe(3);
  expect(r.older.days.length).toBe(3);
  expect(r.older.weeks).toBe(2);
  expect(r.older.seen).toBe('2026-10-07');
  expect(r.same).toBe(3);
  expect(r.join).toBe(5);
  expect(r.real).toEqual(['2026-10-05']);
  expect(r.empty).toEqual(['2026-10-07']);
  noErrors(page);
});

test('a full Pillow Week on the map: day 1 hint, popups from day 2, rewards once a day, golden capsule and sticker on day 7', async ({ page }) => {
  test.setTimeout(1500000); // 9 map opens at 2-3 fps
  const save = Object.assign({}, BASE_SAVE, { caps: 0, goldCaps: 0, ach: {} }); delete save.streak;
  await boot(page, save);
  await setDay(page, 0);
  let s0 = await state(page);
  expect(s0.streak.days).toEqual([]); // migration: daily gift not taken today, empty track
  await go(page, 'map');
  let s = await state(page);
  expect(s.caps - s0.caps).toBe(1); expect(s.popup).toBe(false); expect(s.streak.days.length).toBe(1);
  // same day, map again (after another screen): nothing
  await go(page, 'squad'); await go(page, 'map');
  expect((await state(page)).caps).toBe(s.caps);
  // Me shows the line
  await go(page, 'me');
  expect(await page.evaluate(() => __game.scene.getScene('me').streakLine.text)).toBe('Pillow Week: day 1 of 7  ·  Sleepy Pillow ready');
  const want = [null, null, [1, 0, 20], [2, 0, 0], [1, 0, 30], [2, 0, 0], [1, 0, 40], [2, 1, 50]]; // day 7: +1 capsule from the Pillow Week sticker
  for (let day = 2; day <= 7; day++) {
    await go(page, 'title'); await setDay(page, day - 1);
    s0 = await state(page);
    await go(page, 'map');
    s = await state(page);
    expect([s.caps - s0.caps, s.gold - s0.gold, s.xp - s0.xp], 'day ' + day).toEqual(want[day]);
    expect(s.popup, 'popup on day ' + day).toBe(true);
    expect(s.streak.days.length).toBe(day);
    await yay(page); await wait(page, 500);
    expect((await state(page)).popup).toBe(false);
    if (day === 2) { // map again the same day: no popup, no reward
      await go(page, 'squad'); await go(page, 'map');
      const s2 = await state(page);
      expect([s2.caps, s2.popup]).toEqual([s.caps, false]);
    }
  }
  s = await state(page);
  expect(s.streak.weeks).toBe(1);
  expect(s.ach).toContain('pillowweek');
  // the golden capsule gives a super rare in the capsule machine
  const r = await page.evaluate(() => { const B = __BOOSTS; return B.filter(b => b.r === 3).map(b => b.id); });
  expect(r.length).toBeGreaterThan(0);
  // the next day: a new week, day 1 (hint only), pillow ready
  await go(page, 'title'); await setDay(page, 7); await go(page, 'map');
  s = await state(page);
  expect([s.streak.days.length, s.streak.pillow, s.streak.weeks, s.popup]).toEqual([1, 0, 1, false]);
  noErrors(page);
});

test('one missed day: the Sleepy Pillow line; a second miss: quiet restart, no popup', async ({ page }) => {
  await boot(page, withStreak({ days: [key(-3), key(-2)], pillow: 0, at: 0, weeks: 0, seen: key(-2) }));
  await setDay(page, 0);
  await go(page, 'map');
  let s = await state(page);
  expect([s.streak.days.length, s.streak.pillow, s.popup]).toEqual([3, 1, true]);
  const texts = await page.evaluate(() => { const out = []; const walk = o => { if (o.text) out.push(o.text); (o.list || []).forEach(walk); }; walk(__game.scene.getScene('map')._psStreak); return out.join(' | '); });
  expect(texts).toContain('Sleepy Pillow kept your place');
  expect(texts).toContain('Sleepy Pillow is napping');
  await yay(page);
  await go(page, 'me');
  expect(await page.evaluate(() => __game.scene.getScene('me').streakLine.text)).toContain('day 3 of 7  ·  Sleepy Pillow is napping');
  await go(page, 'title'); await setDay(page, 2);
  const c0 = (await state(page)).caps;
  await go(page, 'map');
  s = await state(page);
  expect([s.streak.days.length, s.streak.pillow, s.popup, s.caps - c0]).toEqual([1, 0, false, 1]);
  noErrors(page);
});

test('two missed days: quiet restart on day 1', async ({ page }) => {
  await boot(page, withStreak({ days: [key(-5), key(-4), key(-3)], pillow: 0, at: 0, weeks: 0, seen: key(-3) }));
  await setDay(page, 0);
  await go(page, 'map');
  const s = await state(page);
  expect([s.streak.days, s.popup]).toEqual([[key(0)], false]);
  noErrors(page);
});

test('clock moved back: nothing given; far back: the track moves to today quietly', async ({ page }) => {
  await boot(page, withStreak({ days: [key(-1), key(0)], pillow: 0, at: Date.now(), weeks: 0, seen: key(0) }));
  await setDay(page, -1);
  const c0 = (await state(page)).caps;
  await go(page, 'map');
  let s = await state(page);
  expect([s.caps, s.streak.days, s.popup]).toEqual([c0, [key(-1), key(0)], false]);
  await go(page, 'title'); await setDay(page, -4); await go(page, 'map');
  s = await state(page);
  expect([s.caps, s.streak.days, s.popup]).toEqual([c0, [key(-5), key(-4)], false]);
  await go(page, 'title'); await setDay(page, -3); await go(page, 'map');
  s = await state(page);
  expect([s.caps - c0, s.streak.days.length, s.popup]).toEqual([2, 3, true]);
  noErrors(page);
});

test('#65: the app opens into bedtime: no day counted, no reward; after bedtime the day counts', async ({ page }) => {
  await boot(page, withStreak({ days: [key(-1)], pillow: 0, at: 0, weeks: 0, seen: key(-1) }, { parent: { bedtime: '20:00', limit: 0 } }));
  await setDay(page, 0, 21);
  const c0 = (await state(page)).caps;
  await page.evaluate(() => __game.scene.getScenes(true)[0].scene.start('map'));
  await page.waitForFunction(() => __game.scene.isActive('bedtime'), null, { timeout: 30000 });
  let s = await state(page);
  expect([s.caps, s.streak.days]).toEqual([c0, [key(-1)]]);
  // the daily limit too
  await page.evaluate(() => { __save.data.parent = { bedtime: 'off', limit: 30 }; __save.data.play = { [PSExtra.todayKey()]: 3600 }; });
  await setDay(page, 0, 12);
  await page.evaluate(() => __game.scene.getScenes(true)[0].scene.start('map'));
  await wait(page, 1500);
  await page.waitForFunction(() => __game.scene.isActive('bedtime'), null, { timeout: 30000 });
  s = await state(page);
  expect([s.caps, s.streak.days]).toEqual([c0, [key(-1)]]);
  // a grown-up lifts it: the map counts the day
  await page.evaluate(() => { __save.data.parent = { bedtime: 'off', limit: 0 }; });
  await go(page, 'map');
  s = await state(page);
  expect([s.caps - c0, s.streak.days, s.popup]).toEqual([1, [key(-1), key(0)], true]);
  noErrors(page);
});

test('rotation with the popup open: the popup shows again, the reward is given once', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, withStreak({ days: [key(-2), key(-1)], pillow: 0, at: 0, weeks: 0, seen: key(-1) }));
  await setDay(page, 0);
  const c0 = (await state(page)).caps;
  await go(page, 'map');
  expect((await state(page)).popup).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.__game && !__psPortrait && __game.scene.isActive('map'), null, { timeout: 60000 });
  await fast(page); await wait(page, 2000);
  let s = await state(page);
  expect([s.caps - c0, s.popup, s.streak.days.length]).toEqual([2, true, 3]);
  await yay(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => window.__game && __psPortrait && __game.scene.isActive('map'), null, { timeout: 60000 });
  await fast(page); await wait(page, 2000);
  s = await state(page);
  expect([s.caps - c0, s.popup]).toEqual([2, false]);
  noErrors(page);
});

test('migration: a v0.8 save that took today\'s daily capsule starts on day 1 with no extra capsule', async ({ page }) => {
  const save = Object.assign({}, BASE_SAVE, { caps: 3, daily: new Date().toDateString() }); delete save.streak;
  await boot(page, save);
  await setDay(page, 0);
  const c0 = (await state(page)).caps;
  await go(page, 'map');
  const s = await state(page);
  expect([s.caps, s.streak.days, s.popup]).toEqual([c0, [key(0)], false]);
  noErrors(page);
});

const fakeSb = cloud => `(() => {
  const log = window.__sbLog = [];
  const q = t => ({ select() { return this; }, eq() { return this; }, in() { return this; }, delete() { return this; },
    maybeSingle: async () => ({ data: ${cloud} }), then: r => r({ data: [] }),
    upsert: async v => { log.push(t + ':upsert'); window.__pushed = JSON.parse(JSON.stringify(v.data || {})); return {}; }, update() { return this; } });
  PSNet.sb = { from: q }; PSNet.user = { id: 'u1', name: 'tester' }; PSNet.synced = true; PSNet._syncing = false;
})()`;

test('cloud: a newer cloud save never shortens the local streak; an older one gives its later streak to the push', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(async ([a, b, k]) => {
    // newer cloud save with a shorter streak: the cloud save is applied, the local streak stays
    eval(a); const d = __save.data; d.owner = 'u1'; d.savedAt = 5; d.streak = { days: [k[0], k[1], k[2]], pillow: 0, at: 0, weeks: 0, seen: k[2] };
    PSNet._syncAt = 0; await PSNet.sync();
    const one = { xp: __save.data.xp, days: __save.data.streak.days.length, seen: __save.data.streak.seen };
    // older cloud save with a later streak (played the map there, duels here): merged before the push
    eval(b); __save.data.owner = 'u1'; __save.data.savedAt = Date.now() + 1e6; __save.data.streak = { days: [k[1]], pillow: 0, at: 0, weeks: 0, seen: k[1] };
    await PSNet.sync();
    return { one, pushed: window.__pushed && window.__pushed.streak.days };
  }, [fakeSb(`{ data: { owner: 'u1', savedAt: 9, xp: 2000, wins: 20, toys: [], stars: {}, hero: 'jack', streak: { days: ['${key(-1)}'], pillow: 0, at: 0, weeks: 0, seen: '' } } }`),
    fakeSb(`{ data: { owner: 'u1', savedAt: 1, xp: 5, streak: { days: ['${key(-1)}', '${key(0)}'], pillow: 0, at: 0, weeks: 1, seen: '' } } }`), [key(-2), key(-1), key(0)]]);
  expect(r.one).toEqual({ xp: 2000, days: 3, seen: key(0) });
  expect(r.pushed).toEqual([key(-1), key(0)]);
  noErrors(page);
});

test('cloud: a logged-in device syncs before counting, so a day counted on the other device is not given again', async ({ page }) => {
  await boot(page, withStreak({ days: [key(-1)], pillow: 0, at: 0, weeks: 0, seen: key(-1) }));
  await setDay(page, 0);
  await page.evaluate(js => { eval(js); __save.data.owner = 'u1'; __save.data.savedAt = 5; },
    fakeSb(`{ data: { owner: 'u1', savedAt: ${Date.now() + 1e9}, xp: 1500, wins: 12, caps: 7, toys: [], stars: { timmy: 3 }, hero: 'jack', mig08: 1, mig09: 1, comics: { hills: true, space: true, canada: true, spooky: true }, seenVersion: '0.9',
      streak: { days: ['${key(-1)}', '${key(0)}'], pillow: 0, at: Date.now(), weeks: 0, seen: '${key(0)}' } } }`));
  await page.evaluate(() => __game.scene.getScenes(true)[0].scene.start('map'));
  await page.waitForFunction(() => window.__game && __game.scene.isActive('map') && __save.data.streak.days.length === 2, null, { timeout: 60000 });
  await fast(page); await wait(page, 2500);
  const s = await state(page);
  // the cloud save has no stickers yet: each one the save earns on this device adds its own capsule, the day adds none
  expect([s.caps - s.ach.length, s.streak.days, s.popup]).toEqual([7, [key(-1), key(0)], false]);
  noErrors(page);
});
