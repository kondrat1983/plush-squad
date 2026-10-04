// Shared helpers for the Plush Squad browser tests.
// The game exposes debug handles with ?debug: window.__game, __save, __RIVALS, __BOOSTS, PSAudio, PSExtra.
const { expect } = require('@playwright/test');

const URL = '/index.html?debug';

// a mid-game save: level ~5, Pillow Hills cleared, sound muted (music state is still tracked); mig08: already on v0.8 (no migration gift toasts)
const BASE_SAVE = { mig08: 1, comics: { canada: true }, xp: 1500, wins: 12, muted: true, stars: { timmy: 3, moo: 2, sly: 2, hoot: 1 }, toys: [], hero: 'jack', diff: 'normal', caps: 0, daily: 'x', seenVersion: '0.7', costumes: {} };

// Opens the game with a given save. Collects page errors in page._errors. Blocks the online backend (tests are offline).
async function boot(page, save = BASE_SAVE, query = '') {
  page._errors = [];
  page.on('pageerror', e => page._errors.push(String(e && e.stack || e)));
  await page.route(/supabase\.co/, r => r.abort());
  // seed the save on a page of the same origin that does not start the game: a booting game could save over it (QA T29)
  await page.goto('/manifest.json');
  await page.evaluate(s => localStorage.setItem('plushsquad_v1', s), JSON.stringify(save));
  await page.goto(URL + query);
  await page.waitForFunction(() => window.__game && __game.scene.getScenes(true).length > 0, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await fast(page);
}

// Phaser's tween manager treats frames > 500 ms as 33 ms ("lag smoothing"); at 2-3 fps duels look frozen.
// Re-run after any scene start or rebuild.
async function fast(page) {
  await page.evaluate(() => { (window.__game ? __game.scene.scenes : []).forEach(s => s.tweens && s.tweens.setLagSmooth(5000, 33)); });
}

async function wait(page, ms) {
  for (let t = 0; t < ms; t += 500) { await fast(page); await page.waitForTimeout(500); }
}

async function go(page, key, data = {}) {
  await page.evaluate(([k, d]) => { __game.scene.getScenes(true)[0].scene.start(k, d); }, [key, data]);
  await page.waitForFunction(k => __game.scene.isActive(k), key, { timeout: 30000 });
  await wait(page, 1500);
}

const active = page => page.evaluate(() => __game.scene.getScenes(true).map(s => s.scene.key));

// waits until the duel is ready for the player's move (picker closed, not busy)
async function waitTurn(page, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const ok = await page.evaluate(() => { const b = __game.scene.getScene('battle'); return !!(b && b.hero && !b.busy && !b.over); });
    if (ok) return;
    await wait(page, 500);
  }
  throw new Error('duel turn did not come back');
}

// interactive objects of a scene that stick out of the play area W x H (layout checker)
const offscreen = (page, key) => page.evaluate(key => {
  const s = __game.scene.getScene(key), W = __game.config.width, H = __game.config.height, cam = s.cameras.main, bad = [];
  const walk = (list, ox, oy) => list.forEach(o => {
    if (!o.visible) return;
    const x = ox + (o.x || 0), y = oy + (o.y || 0);
    if (o.input && o.input.enabled && o.width) {
      const sx = x - cam.scrollX, sy = y - cam.scrollY, hw = o.width * (o.scaleX || 1) / 2, hh = o.height * (o.scaleY || 1) / 2;
      if (sx - hw < -2 || sx + hw > W + 2 || sy - hh < -2 || sy + hh > H + 2) bad.push([o.type, Math.round(sx), Math.round(sy)]);
    }
    if (o.list) walk(o.list, x, y);
  });
  walk(s.children.list, 0, 0); return bad;
}, key);

const noErrors = page => expect(page._errors, page._errors.join('\n')).toEqual([]);

module.exports = { BASE_SAVE, boot, fast, wait, go, active, waitTurn, offscreen, noErrors };
