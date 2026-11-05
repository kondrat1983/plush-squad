// battle frames for the Pixel Land rivals (they face left): idle1, idle2 (1 px squash), attack (lunge left), hit (pushed right)
const P = require('./sprite.js'), out = process.argv[2];
const OUT = [16, 24, 48, 255];
const shift = (b, dx, dy = 0, pad = 4) => { const o = new P.Buf(b.w + pad * 2, b.h + 1); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const v = b.px[y * b.w + x]; if (v) { const X = x + pad + dx, Y = y + 1 + dy; if (X >= 0 && X < o.w && Y >= 0 && Y < o.h) o.px[Y * o.w + X] = v; } } return o; };
const squash = (b, pad = 4) => { // drop the row at 45 % height: the top half sinks 1 px
  const cut = Math.round(b.h * 0.45), o = new P.Buf(b.w + pad * 2, b.h + 1);
  for (let y = 0; y < b.h; y++) { const ty = y < cut ? y + 1 : y === cut ? -1 : y; if (ty < 0) continue; for (let x = 0; x < b.w; x++) { const v = b.px[y * b.w + x]; if (v) o.px[(ty + 1 - (y < cut ? 0 : 0)) * o.w + x + pad] = v; } }
  return o; };
const sources = { knight: 'px_knight.png', boss: 'px_dragonboss.png' };
const hand = { bibi: 'bibi.txt', bolty: 'bolty.txt', pipo: 'pipo.txt' };
const all = {};
for (const [k, f] of Object.entries(sources)) all[k] = P.load(f);
for (const [k, f] of Object.entries(hand)) all[k] = P.draw(P.rows(f));
const sheet = [];
for (const [k, b] of Object.entries(all)) {
  const F = { idle1: shift(b, 0), idle2: squash(b), attack: shift(b, -3), hit: shift(b, 2) };
  for (const [n, fb] of Object.entries(F)) { P.save(fb, `${out}/px_${k}_${n}.png`); sheet.push({ buf: fb, label: (k + ' ' + n).toUpperCase() }); }
}
P.save(P.sheet(sheet, { scale: 4, gap: 8, cols: 4, bg: [26, 31, 74, 255] }), 'rival_frames.png');
console.log(Object.entries(all).map(([k, b]) => k + ' ' + b.w + 'x' + b.h).join(', '));
