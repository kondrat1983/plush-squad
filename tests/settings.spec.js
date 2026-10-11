// v1.0 Settings screen (docs/gdd/1.0-settings.md): volumes, device-only prefs, CALM MODE, left-handed cards,
// BUZZ, WHAT'S NEW replay, bedtime, and the title nav with SETTINGS as the 6th item on every device size.
const { test, expect } = require('@playwright/test');
const { BASE_SAVE, boot, go, wait, fast, waitTurn, offscreen, noErrors } = require('./helpers');

const PREFS = 'plushsquad_prefs';
const MUSIC = [0, 0.10, 0.20, 0.32, 0.45], SFX = [0, 0.30, 0.55, 0.80, 1.00];
// D1-D5 from the QA plan plus a 4:3 iPad and a phone in landscape
const SIZES = {
  'iPhone SE': { width: 375, height: 667 }, 'iPhone 15 Pro Max': { width: 430, height: 932 }, 'iPad mini': { width: 744, height: 1133 },
  'iPad 11 portrait': { width: 834, height: 1194 }, 'iPad landscape': { width: 1194, height: 834 }, '4:3 iPad': { width: 1024, height: 768 },
  'phone landscape': { width: 932, height: 430 },
};

// seeds the device prefs before the game starts (same page trick as the save in boot())
async function bootWith(page, prefs, save = BASE_SAVE) {
  if (prefs) {
    await page.route(/supabase\.co/, r => r.abort());
    await page.goto('/manifest.json');
    await page.evaluate(([k, p]) => localStorage.setItem(k, JSON.stringify(p)), [PREFS, prefs]);
  }
  await boot(page, save);
}
// taps a game object (a top-level container) with the real mouse, like a finger would
async function tap(page, key, find) {
  const pt = await page.evaluate(([key, find]) => {
    const s = __game.scene.getScene(key), o = (new Function('s', 'return ' + find))(s), cam = s.cameras.main;
    const r = __game.canvas.getBoundingClientRect(), k = r.width / __game.config.width;
    return { x: r.left + (o.x - cam.scrollX) * k, y: r.top + (o.y - cam.scrollY) * k };
  }, [key, find]);
  await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.waitForTimeout(150); await page.mouse.up();
  await wait(page, 600);
}
const gains = page => page.evaluate(() => ({ m: PSAudio.musicGain.gain.value, s: PSAudio.sfxGain.gain.value, master: PSAudio.master.gain.value }));

test.describe('audio and prefs', () => {
  test('MUSIC and SOUNDS pills set the gains (level 3 = the old 0.32 / 0.8, OFF = 0); mute still mutes all', async ({ page }) => {
    await bootWith(page, null);
    await go(page, 'settings');
    // first run: defaults stored on the device
    expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)), PREFS)).toEqual({ music: 3, sfx: 3, calm: false, hand: 'right', buzz: true });
    // a real tap on MUSIC 1 creates the audio context with the chosen level
    await tap(page, 'settings', "s.rows.music[1].c");
    expect(await page.evaluate(() => PSPrefs.data.music)).toBe(1);
    await expect.poll(async () => (await gains(page)).m, { timeout: 10000 }).toBeCloseTo(MUSIC[1], 2);
    expect((await gains(page)).s).toBeCloseTo(0.8, 2);
    for (let l = 0; l <= 4; l++) {
      await page.evaluate(l => { const s = __game.scene.getScene('settings'); s.choose('music', l); s.choose('sfx', l); }, l);
      await expect.poll(async () => (await gains(page)).m, { timeout: 10000 }).toBeCloseTo(MUSIC[l], 2);
      await expect.poll(async () => (await gains(page)).s, { timeout: 10000 }).toBeCloseTo(SFX[l], 2);
    }
    await page.evaluate(() => { const s = __game.scene.getScene('settings'); s.choose('music', 3); s.choose('sfx', 3); });
    await expect.poll(async () => (await gains(page)).m, { timeout: 10000 }).toBeCloseTo(0.32, 2);
    await expect.poll(async () => (await gains(page)).s, { timeout: 10000 }).toBeCloseTo(0.8, 2);
    // the save starts muted: master is 0; unmuting restores master only, the chosen levels stay
    expect((await gains(page)).master).toBeCloseTo(0, 2);
    await page.evaluate(() => __game.scene.getScene('settings').choose('music', 1));
    await page.evaluate(() => { PSAudio.setMuted(false); });
    await expect.poll(async () => (await gains(page)).master, { timeout: 10000 }).toBeCloseTo(1, 2);
    expect((await gains(page)).m).toBeCloseTo(MUSIC[1], 2);
    // the selected pill is drawn as selected
    expect(await page.evaluate(() => __game.scene.getScene('settings').rows.music.map(p => p.on.visible))).toEqual([false, true, false, false, false]);
    noErrors(page);
  });

  test('prefs live on the device: they survive a reload and a rotation, and never go into the synced save', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootWith(page, null);
    await go(page, 'settings');
    await page.evaluate(() => { const s = __game.scene.getScene('settings'); s.choose('music', 1); s.choose('sfx', 4); s.choose('hand', 'left'); s.choose('buzz', false); });
    // the save has no prefs fields, and a cloud save pulled in (it replaces the save data) does not touch them
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('plushsquad_v1')));
    for (const k of ['music', 'sfx', 'calm', 'hand', 'buzz', 'prefs']) expect(save[k]).toBeUndefined();
    await page.evaluate(() => { __save.data = Object.assign({}, __save.data, { xp: 99 }); __save.store(); });
    expect(await page.evaluate(() => PSPrefs.data)).toEqual({ music: 1, sfx: 4, calm: false, hand: 'left', buzz: false });
    // rotation: the game is rebuilt into the Settings screen with the same choices
    await page.evaluate(() => { window.__oldGame = __game; });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForFunction(() => window.__game && __game !== window.__oldGame && __game.scene.isActive('settings'), null, { timeout: 90000 });
    await fast(page); await wait(page, 1500);
    expect(await page.evaluate(() => window.__psPortrait)).toBe(false);
    expect(await page.evaluate(() => __game.scene.getScene('settings').rows.hand.map(p => p.on.visible))).toEqual([true, false]);
    // reload
    await page.goto('/index.html?debug');
    await page.waitForFunction(() => window.__game && __game.scene.getScenes(true).length > 0, null, { timeout: 60000 });
    expect(await page.evaluate(() => PSPrefs.data)).toEqual({ music: 1, sfx: 4, calm: false, hand: 'left', buzz: false });
    expect(await page.evaluate(() => [PSAudio.musicLevel, PSAudio.sfxLevel])).toEqual([1, 4]);
    noErrors(page);
  });

  test('broken prefs fall back to the defaults', async ({ page }) => {
    await page.route(/supabase\.co/, r => r.abort());
    await page.goto('/manifest.json');
    await page.evaluate(k => localStorage.setItem(k, '{oops'), PREFS);
    await boot(page);
    expect(await page.evaluate(() => PSPrefs.data)).toEqual({ music: 3, sfx: 3, calm: false, hand: 'right', buzz: true });
    noErrors(page);
  });

  test('first run with the OS "reduce motion" setting turns CALM MODE on; a stored choice wins later', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page);
    expect(await page.evaluate(() => PSPrefs.data.calm)).toBe(true);
    await page.evaluate(() => { PSPrefs.set('calm', false); });
    await page.goto('/index.html?debug');
    await page.waitForFunction(() => window.__game && __game.scene.getScenes(true).length > 0, null, { timeout: 60000 });
    expect(await page.evaluate(() => PSPrefs.data.calm)).toBe(false);
    noErrors(page);
  });
});

// endless tweens (pulses, wobbles) that are running in a scene
const loops = (page, key) => page.evaluate(k => __game.scene.getScene(k).tweens.getTweens()
  .filter(t => t.isPlaying() && (t.loop === -1 || (t.data || []).some(d => d.repeat === -1))).length, key);

test.describe('calm mode', () => {
  test('title: nothing pulses or wobbles (TAP TO PLAY stands still), but it does without calm mode', async ({ page }) => {
    await bootWith(page, { calm: true });
    await go(page, 'title');
    expect(await loops(page, 'title')).toBe(0);
    await page.evaluate(() => PSPrefs.set('calm', false));
    await go(page, 'title');
    expect(await loops(page, 'title')).toBeGreaterThan(5);
    noErrors(page);
  });

  test('duel: no camera shake on hits, no pulsing BLOCK IT!, confetti at 25%; hit animations still play', async ({ page }) => {
    await bootWith(page, { calm: true }, Object.assign({}, BASE_SAVE, { diff: 'easy' }));
    await go(page, 'battle', { rival: 0 });
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
    await waitTurn(page);
    await page.evaluate(() => {
      const b = __game.scene.getScene('battle'), cam = b.cameras.main; window.__shakes = 0;
      const st = cam.shakeEffect.start; cam.shakeEffect.start = function () { window.__shakes++; return st.apply(this, arguments); };
      cam.shake(700, 0.016); // like Inferno Rain and SLAPSHOT
      window.__finite = 0;
      const tick = () => { window.__finite = Math.max(window.__finite, b.tweens.getTweens().filter(t => t.isPlaying() && !(t.loop === -1 || (t.data || []).some(d => d.repeat === -1))).length); };
      b.events.on('update', tick);
      b.playerMove('pillow');
    });
    await wait(page, 1000);
    await waitTurn(page, 120000);
    expect(await page.evaluate(() => window.__shakes)).toBe(0);
    expect(await page.evaluate(() => window.__finite)).toBeGreaterThan(0); // the throw / knock-back tweens
    expect(await loops(page, 'battle')).toBe(0);
    // EASY: a charging rival shows BLOCK IT!, which does not pulse; the charge glow is kept
    await page.evaluate(() => {
      const b = __game.scene.getScene('battle'), T = b.rival, m = { k: 'rx', type: 'rain', dmg: [5, 5], title: 'Rain', log: '' };
      b.rival.charging = m; b.startCharge && b.setCards(true);
    });
    const blk = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return { v: b.blockBtn.visible, tw: b.tweens.getTweensOf(b.blockBtn).filter(t => t.isPlaying()).length }; });
    expect(blk.v).toBe(true);
    expect(blk.tw).toBe(0);
    // confetti: 90 asked, at most a quarter
    const n = await page.evaluate(() => { const b = __game.scene.getScene('battle'); b.confetti.killAll(); b.confetti.explode(90, 500, 500); return b.confetti.getAliveParticleCount(); });
    expect(n).toBeLessThanOrEqual(23);
    expect(n).toBeGreaterThan(0);
    noErrors(page);
  });

  test('without calm mode the camera shakes and confetti is full', async ({ page }) => {
    await bootWith(page, { calm: false });
    await go(page, 'battle', { rival: 0 });
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
    await waitTurn(page);
    const r = await page.evaluate(() => {
      const b = __game.scene.getScene('battle'), cam = b.cameras.main; cam.shake(700, 0.006);
      b.confetti.killAll(); b.confetti.explode(90, 500, 500);
      return { shaking: cam.shakeEffect.isRunning, n: b.confetti.getAliveParticleCount() };
    });
    expect(r.shaking).toBe(true);
    expect(r.n).toBe(90);
    noErrors(page);
  });

  test('map: no UFO flyby, rockets or shooting stars in Space; still stars stay', async ({ page }) => {
    const SPACE_OPEN = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 1, polandball: 1, ghost: 1 };
    await bootWith(page, { calm: true }, Object.assign({}, BASE_SAVE, { stars: SPACE_OPEN }));
    await go(page, 'map', { world: 1 });
    const count = () => page.evaluate(() => {
      const s = __game.scene.getScene('map');
      s.time._active.concat(s.time._pendingInsertion || []).forEach(e => { if (e.loop && e.callback) { try { e.callback.call(e.callbackScope); } catch (x) {} } });
      const keys = s.children.list.map(o => o.texture && o.texture.key);
      return { ufo: keys.filter(k => k === 'ufo').length, rocket: keys.filter(k => k === 'rocket').length, streak: keys.filter(k => k === 'streak').length, dot: keys.filter(k => k === 'dot').length };
    });
    const c = await count();
    expect(c.ufo + c.rocket + c.streak).toBe(0);
    expect(c.dot).toBeGreaterThan(20);
    noErrors(page);
  });
});

// card centres in the current duel
const cards = page => page.evaluate(() => { const b = __game.scene.getScene('battle'); return b.moves.map(m => ({ k: m.k, x: Math.round(m.card.x), y: Math.round(m.card.y) })); });
async function duelCards(page, hand, vp, data, opt = {}, booted = false) {
  if (!booted) {
    await page.setViewportSize(vp);
    const save = Object.assign({}, BASE_SAVE, { xp: opt.xp == null ? 0 : opt.xp, boosts: opt.boost ? { [opt.boost]: 2 } : {} });
    await bootWith(page, { hand }, save);
  } else await page.evaluate(h => PSPrefs.set('hand', h), hand);
  await go(page, 'battle', data);
  await page.evaluate(id => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(id ? __BOOSTS.find(x => x.id === id) : null); }, opt.boost || null);
  await waitTurn(page);
  return { cards: await cards(page) };
}

test.describe('left-handed cards', () => {
  const CASES = [
    ['portrait, 4 cards, campaign', { width: 390, height: 844 }, { rival: 0 }, { xp: 0, n: 4 }],
    ['portrait, 5 cards, campaign boss + booster', { width: 375, height: 667 }, { rival: 3 }, { xp: 0, boost: 'milk', n: 5 }],
    ['landscape, 7 cards, friend', { width: 844, height: 390 }, { fjack: { level: 3 }, ownerName: 'Max' }, { xp: 500, n: 7 }],
    ['landscape, 9 cards, Kraken', { width: 1194, height: 834 }, { boss: true }, { xp: 1500, boost: 'milk', n: 9 }],
    ['iPad portrait, 9 cards, campaign', { width: 834, height: 1194 }, { rival: 0 }, { xp: 1500, boost: 'milk', n: 9 }],
  ];
  for (const [name, vp, data, opt] of CASES) {
    test(`LEFT mirrors the move cards: ${name}`, async ({ page }) => {
      const R = await duelCards(page, 'right', vp, data, opt);
      const L = await duelCards(page, 'left', vp, data, opt, true);
      const Wd = await page.evaluate(() => window.__psBleed.W);
      expect(L.cards.length).toBe(R.cards.length);
      expect(L.cards.length).toBe(opt.n);
      L.cards.forEach((c, i) => {
        expect(c.k).toBe(R.cards[i].k); // same order
        expect(c.y).toBe(R.cards[i].y);
        expect(Math.abs(c.x - (Wd - R.cards[i].x))).toBeLessThanOrEqual(1);
      });
      // card 0 is on the right half now, and a real tap on it plays it (the touch area moved with the card)
      expect(L.cards[0].x).toBeGreaterThan(Wd / 2);
      await tap(page, 'battle', "s.moves[0].card");
      expect(await page.evaluate(() => __game.scene.getScene('battle').acted)).toBe(true);
      noErrors(page);
    });
  }

  test('LEFT: a duel restored after a rotation keeps the mirror', async ({ page }) => {
    const { cards: before } = await duelCards(page, 'left', { width: 390, height: 844 }, { rival: 0 }, { xp: 0 });
    expect(before[0].x).toBeGreaterThan(540);
    await page.evaluate(() => { window.__oldGame = __game; });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForFunction(() => window.__game && __game !== window.__oldGame && __game.scene.isActive('battle') && __game.scene.getScene('battle').hero, null, { timeout: 90000 });
    await fast(page);
    await waitTurn(page);
    const after = await cards(page), Wd = await page.evaluate(() => window.__psBleed.W);
    expect(after[0].x).toBeGreaterThan(Wd / 2); // card 0 is the right-most one
    expect(after[0].x).toBe(Math.max(...after.map(c => c.x)));
    noErrors(page);
  });

  for (const [tag, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 1194, height: 834 }]]) {
    test(`LEFT mirrors FOAM! and UMBRELLA! (Fire or Beam?, NORMAL), ${tag}`, async ({ page }) => {
      await page.setViewportSize(vp);
      const SPACE_OPEN = { timmy: 3, moo: 3, sly: 3, hoot: 3, robot: 1, polandball: 1, ghost: 1 };
      const pos = async hand => {
        await page.evaluate(h => PSPrefs.set('hand', h), hand);
        await go(page, 'battle', { rival: await page.evaluate(() => __RIVALS.findIndex(r => r.id === 'dragonboss')) });
        await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
        await waitTurn(page);
        return page.evaluate(() => {
          const b = __game.scene.getScene('battle'), m = b.rmoves.find(x => x.type === 'beam');
          b.toolSwap = false; b.rival.charging = m; b.setCards(true);
          return { ext: Math.round(b.extBtn.x), umb: Math.round(b.umbBtn.x), v: b.extBtn.visible && b.umbBtn.visible };
        });
      };
      await bootWith(page, { hand: 'right' }, Object.assign({}, BASE_SAVE, { stars: SPACE_OPEN }));
      const r = await pos('right'), l = await pos('left');
      expect(r.v && l.v).toBe(true);
      expect(r.ext).toBeLessThan(r.umb);
      expect(l.ext).toBeGreaterThan(l.umb);
      expect(l.ext).toBe(r.umb);
      noErrors(page);
    });
  }
});

test.describe('screen', () => {
  test('BUZZ: hidden without vibration; OFF means no vibrate call', async ({ page }) => {
    await page.addInitScript(() => { delete Navigator.prototype.vibrate; });
    await boot(page);
    await go(page, 'settings');
    expect(await page.evaluate(() => Object.keys(__game.scene.getScene('settings').rows))).toEqual(['music', 'sfx', 'calm', 'hand']);
    noErrors(page);
  });

  test('BUZZ OFF stops the vibration; ON vibrates', async ({ page }) => {
    await page.addInitScript(() => { window.__vib = 0; Navigator.prototype.vibrate = function () { window.__vib++; return true; }; });
    await boot(page);
    await go(page, 'settings');
    expect(await page.evaluate(() => Object.keys(__game.scene.getScene('settings').rows))).toContain('buzz');
    await page.evaluate(() => { window.__vib = 0; __game.scene.getScene('settings').choose('buzz', false); });
    expect(await page.evaluate(() => window.__vib)).toBe(0);
    await page.evaluate(() => { window.__vib = 0; __game.scene.getScene('settings').choose('buzz', true); }); // a little buzz to show it
    expect(await page.evaluate(() => window.__vib)).toBe(1);
    await page.evaluate(() => __game.scene.getScene('settings').choose('buzz', false));
    // a pillow hit in a duel buzzes only when BUZZ is ON
    await go(page, 'battle', { rival: 0 });
    await page.evaluate(() => { const b = __game.scene.getScene('battle'); if (b._pick && !b.hero) b._pick(null); });
    await waitTurn(page);
    await page.evaluate(() => { window.__vib = 0; __game.scene.getScene('battle').playerMove('pillow'); });
    await wait(page, 1000); await waitTurn(page, 120000);
    expect(await page.evaluate(() => window.__vib)).toBe(0);
    await page.evaluate(() => PSPrefs.set('buzz', true));
    await page.evaluate(() => { window.__vib = 0; __game.scene.getScene('battle').playerMove('pillow'); });
    await wait(page, 1000); await waitTurn(page, 120000);
    expect(await page.evaluate(() => window.__vib)).toBeGreaterThan(0);
    noErrors(page);
  });
  test("WHAT'S NEW opens the list again; CLOSE goes back to Settings", async ({ page }) => {
    await boot(page); // seenVersion is the current one: the popup does not open by itself
    await go(page, 'settings');
    const texts = () => page.evaluate(() => { const out = [], walk = l => l.forEach(o => { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); }); walk(__game.scene.getScene('settings').children.list); return out.join(' | '); });
    expect(await texts()).not.toContain("WHAT'S NEW in");
    await tap(page, 'settings', 's.wnBtn');
    expect(await texts()).toContain("WHAT'S NEW in v");
    await page.evaluate(() => { const s = __game.scene.getScene('settings'); const lay = s.children.list.find(o => o.depth === 96); const close = lay.list.find(o => o.list && o.list.some(t => t.text === 'CLOSE')); close.emit('pointerup'); });
    await wait(page, 600);
    expect(await texts()).not.toContain("WHAT'S NEW in");
    expect(await page.evaluate(() => __game.scene.isActive('settings'))).toBe(true);
    noErrors(page);
  });

  test('bedtime: Settings stays open (it is not play); the title still goes to bed', async ({ page }) => {
    const play = {}; const d = new Date(); play[d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')] = 3600;
    await boot(page, Object.assign({}, BASE_SAVE, { parent: { bedtime: 'off', limit: 30 }, play }));
    await page.waitForFunction(() => __game.scene.isActive('bedtime'), null, { timeout: 30000 });
    await go(page, 'settings');
    await wait(page, 1000);
    expect(await page.evaluate(() => __game.scene.isActive('settings'))).toBe(true);
    await page.evaluate(() => __game.scene.getScene('settings').choose('music', 2));
    expect(await page.evaluate(() => PSPrefs.data.music)).toBe(2);
    noErrors(page);
  });
});

// layout: Settings and the title nav on every device size
const boxes = (page, key) => page.evaluate(key => {
  const s = __game.scene.getScene(key), out = [];
  const walk = (list, ox, oy) => list.forEach(o => {
    if (!o.visible) return;
    if (o.list) { if (o.input && o.input.enabled) out.push({ t: 'hit', x: ox + o.x, y: oy + o.y, w: o.width * o.scaleX, h: o.height * o.scaleY }); walk(o.list, ox + o.x, oy + o.y); return; }
    if (o.type === 'Text' && o.text) { const b = o.getBounds(); out.push({ t: 'text', s: o.text, x: ox + b.centerX, y: oy + b.centerY, w: b.width, h: b.height, c: !!o.parentContainer }); }
  });
  walk(s.children.list, 0, 0); return out;
}, key);
const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w - 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 2;

for (const [name, vp] of Object.entries(SIZES)) {
  test(`layout ${name}: Settings fits, pills >= 90 px, no overlaps; title nav has SETTINGS clear of mute and the level panel`, async ({ page }) => {
    await page.setViewportSize(vp);
    await bootWith(page, { music: 3 });
    // title
    await go(page, 'title');
    const nav = await page.evaluate(() => {
      const s = __game.scene.getScene('title');
      return s.children.list.filter(o => o.type === 'Container' && o.depth === 50 && o.list.some(t => t.type === 'Text')).map(c => {
        const t = c.list.find(x => x.type === 'Text'), b = t.getBounds();
        return { label: t.text, x: c.x, y: c.y, lb: { x: b.centerX, y: b.centerY, w: b.width, h: b.height } };
      });
    });
    expect(nav.map(n => n.label)).toContain('SETTINGS');
    const g = nav.find(n => n.label === 'SETTINGS');
    const W = await page.evaluate(() => window.__psBleed.W), H = await page.evaluate(() => window.__psBleed.H), P = await page.evaluate(() => window.__psPortrait);
    expect(g.x + 46).toBeLessThan(W - 80 - 46); // clear of the mute button
    const all = nav.map(n => ({ x: n.x, y: n.y, w: 100, h: 100 })).concat(nav.map(n => n.lb));
    for (let i = 0; i < nav.length; i++) for (let j = i + 1; j < nav.length; j++) {
      expect(overlap(all[i], all[j]), `${nav[i].label} vs ${nav[j].label}`).toBe(false);
      expect(overlap(nav[i].lb, nav[j].lb), `labels ${nav[i].label} / ${nav[j].label}`).toBe(false);
    }
    if (!P) { // the level panel (top at H * 0.7 - 95) stays below the last item and its label
      const last = nav[nav.length - 1];
      expect(last.y + 50).toBeLessThanOrEqual(H * 0.7 - 95);
    }
    expect(await offscreen(page, 'title')).toEqual([]);
    // tap SETTINGS
    await tap(page, 'title', "s.children.list.find(o => o.type === 'Container' && o.depth === 50 && o.list.some(t => t.text === 'SETTINGS'))");
    await page.waitForFunction(() => __game.scene.isActive('settings'), null, { timeout: 30000 });
    await wait(page, 1200);
    expect(await offscreen(page, 'settings')).toEqual([]);
    const b = await boxes(page, 'settings');
    const hits = b.filter(o => o.t === 'hit');
    const pills = await page.evaluate(() => { const s = __game.scene.getScene('settings'); return [].concat(...Object.values(s.rows)).map(p => ({ w: p.c.width, h: p.c.height })); });
    pills.forEach(p => expect(p.h).toBeGreaterThanOrEqual(90));
    for (let i = 0; i < hits.length; i++) for (let j = i + 1; j < hits.length; j++) expect(overlap(hits[i], hits[j]), JSON.stringify([hits[i], hits[j]])).toBe(false);
    // loose texts (labels, hints, credits) stay clear of the buttons and of each other, and inside the play area
    const loose = b.filter(o => o.t === 'text' && !o.c);
    loose.forEach(t => {
      expect(t.x - t.w / 2).toBeGreaterThanOrEqual(-2); expect(t.x + t.w / 2).toBeLessThanOrEqual(W + 2);
      expect(t.y + t.h / 2).toBeLessThanOrEqual(H + 2);
      hits.forEach(h => expect(overlap(t, h), t.s + ' vs a button').toBe(false));
    });
    for (let i = 0; i < loose.length; i++) for (let j = i + 1; j < loose.length; j++) expect(overlap(loose[i], loose[j]), loose[i].s + ' / ' + loose[j].s).toBe(false);
    await page.screenshot({ path: `test-results/settings-${name.replace(/[^a-z0-9]+/gi, '_')}.png` });
    noErrors(page);
  });
}
