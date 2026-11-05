// Pixel Land rivals: Fluent Emoji 3D (MIT) reference -> 12 colours at full size -> pixels (mode) -> recolour -> hand-drawn props -> outline
const P = require('./sprite.js');
const OUT = [16, 24, 48, 255], rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const pix = (file, H) => { const b = P.trim(P.load(file), 0); const q = P.quantize(b, 14).buf; return P.cleanup(P.quantize(P.resize(q, Math.round(b.w * H / b.h), H, { mode: true }), 12).buf, { tol: 20 }); };
const pad = (b, l, t, r, bt) => { const o = new P.Buf(b.w + l + r, b.h + t + bt); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const v = b.px[y * b.w + x]; if (v) o.px[(y + t) * o.w + x + l] = v; } return o; };
// rules: { h: [a, b], s: min sat, y: [y0, y1] fraction, to: hue, sat, lmul }
const recolor = (b, rules) => { for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const i = y * b.w + x, v = b.px[i]; if (!v) continue; const [r, g, bb, a] = P.unpack(v); if (a < 128) continue; let [h, s, l] = P.toHsl([r, g, bb]);
  for (const R of rules) { const inH = R.h[0] <= R.h[1] ? h >= R.h[0] && h <= R.h[1] : h >= R.h[0] || h <= R.h[1]; if (!inH || s < (R.s || 0) || (R.y && (y < R.y[0] * b.h || y > R.y[1] * b.h))) continue;
    const c = P.hsl(R.to, R.sat ?? s, Math.min(0.95, l * (R.lmul || 1))); b.px[i] = P.col([...c, 255]); break; } } return b; };
const stamp = (b, rows, x0, y0, pal) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) b.pset(x0 + i, y0 + j, rgb(pal[ch])); }));
const box = (b, test) => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const v = b.px[y * b.w + x]; if (!v) continue; const [r, g, bb] = P.unpack(v); const [h, s, l] = P.toHsl([r, g, bb]); if (test(h, s, l)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } } return { x0, y0, x1, y1 }; };
const fin = (b, name) => { const o = P.outline(b, OUT); P.save(o, name + '.png'); return o; };
const R = {};

// 1. the knight (a Zelda-like elf hero): green tunic, sword up on the right, round shield on the left
{ let b = pad(pix('ref/man_elf_3d_default.png', 38), 8, 6, 10, 0);
  recolor(b, [{ h: [195, 230], s: 0.4, to: 110, sat: 0.62, lmul: 0.85 }]);
  stamp(b, ['....K', '...KW', '...KW', '...KW', '...KW', '...KW', '...KW', '...KW', '...KW', '.KKKKKK', '..KYYK', '...KbK', '...KbK', '...KK'], b.w - 14, 8, { K: '#101830', W: '#e8f0ff', Y: '#f8c838', b: '#7c4a20' });
  const hb = box(b, (h, s, l) => h > 38 && h < 55 && s > 0.6);
  const cw = hb.x1 - hb.x0 + 3, cap = [];
  for (let j = 0; j < 7; j++) { const a = Math.round(j * 0.9), w = Math.max(2, cw - Math.round((6 - j) * cw / 8)); cap.push('.'.repeat(Math.max(0, cw - w - a + 2)) + 'K' + 'G'.repeat(Math.max(0, w - 2)) + 'K'); }
  cap.unshift('.'.repeat(cw) + 'KK'); cap.push('K' + 'g'.repeat(cw) + 'K');
  stamp(b, cap, hb.x0 - 2, Math.max(0, hb.y0 - 7), { K: '#101830', G: '#3cb83c', g: '#258a28' });
  stamp(b, ['.KKKKK.', 'KRRRRRK', 'KRYYYRK', 'KRYRYRK', 'KRYYYRK', 'KRRRRRK', '.KRRRK.', '..KKK..'], 3, 27, { K: '#101830', R: '#c83030', Y: '#f8c838' });
  R.knight = fin(b, 'px_knight'); }
// 2. the blaster robot (a Mega Man-like hero): blue helmet, cyan face plate, arm cannon
{ let b = pad(pix('ref/robot_3d.png', 36), 2, 2, 10, 4);
  recolor(b, [{ h: [240, 300], s: 0.15, to: 212, sat: 0.7, lmul: 0.9 }, { h: [325, 360], s: 0.5, to: 190, sat: 0.8 }, { h: [30, 50], s: 0.5, to: 200, sat: 0.85 }]);
  stamp(b, ['..KKKKK.', '.KBBBBBK', 'KBLLLBBBK', 'KBBBBBKKK', 'KBBBBBKYY', '.KBBBBK..', '..KKKK...'], b.w - 13, b.h - 14, { K: '#101830', B: '#2860d8', L: '#68b8f8', Y: '#f8e870' });
  R.robot = fin(b, 'px_robot'); }
// 3. the bubble dino (a Bubble Bobble-like hero): bright green, a big bubble from the mouth
{ let b = pad(pix('ref/sauropod_3d.png', 34), 12, 10, 2, 0);
  recolor(b, [{ h: [130, 200], s: 0.2, to: 128, sat: 0.65, lmul: 1.05 }]);
  stamp(b, ['...KKKK...', '.KKCCCCKK.', 'KCCHHCCCCK', 'KCHHCCCCCK', 'KCCCCCCCCK', 'KCCCCCCCCK', 'KCCCCCCCCK', '.KKCCCCKK.', '...KKKK...'], 0, 0, { K: '#2888c8', C: '#c8f0ff', H: '#ffffff' });
  stamp(b, ['.KK.', 'KHCK', 'KCCK', '.KK.'], 9, 10, { K: '#2888c8', C: '#c8f0ff', H: '#ffffff' });
  R.dino = fin(b, 'px_dino'); }
// 4. the plumber (a Mario-like hero): red cap and shirt, blue overalls, a big moustache
{ let b = pad(pix('ref/man_mechanic_3d_default.png', 38), 1, 1, 1, 0);
  recolor(b, [{ h: [195, 225], s: 0.5, y: [0, 0.3], to: 2, sat: 0.75 }, { h: [260, 285], to: 2, sat: 0.7, lmul: 0.8 }]);
  const f = box(b, (h, s, l) => h > 25 && h < 50 && s > 0.6 && l > 0.45 && l < 0.7); f.y1 = Math.min(f.y1, Math.round(b.h * 0.5));
  const mw = Math.round((f.x1 - f.x0) * 0.7), mx = Math.round((f.x0 + f.x1) / 2 - mw / 2), my = Math.round(f.y0 + (f.y1 - f.y0) * 0.62);
  stamp(b, ['..' + 'M'.repeat(mw - 4) + '..', '.' + 'M'.repeat(mw - 2) + '.', 'M'.repeat(mw), 'MM' + '.'.repeat(Math.max(0, mw - 4)) + 'MM'], mx - 2, my - 1, { M: '#3a2010' });
  R.plumber = fin(b, 'px_plumber'); }
// 5. the boss: an 8-bit castle dragon, red with orange fins and gold horns
{ let b = pix('ref/dragon_3d.png', 52);
  recolor(b, [{ h: [140, 200], s: 0.2, to: 4, sat: 0.72, lmul: 0.95 }, { h: [300, 345], to: 28, sat: 0.9 }, { h: [35, 60], to: 48, sat: 0.95 }]);
  R.boss = fin(b, 'px_dragonboss'); }

P.save(P.sheet(Object.entries(R).map(([k, b]) => ({ buf: b, label: k.toUpperCase() })), { scale: 6, gap: 10, bg: [26, 31, 74, 255] }), 'enemies.png');
console.log(Object.entries(R).map(([k, b]) => k + ' ' + b.w + 'x' + b.h).join(', '));
