// battle frames for pixel Jack (side view, facing right), made from side2.txt by moving rows
const P = require('./sprite.js'), fs = require('fs');
const base = P.rows('side2.txt').map(r => r.padEnd(44, '.'));   // 4 px spare on the right for the punch
const H = base.length;
const g = rows => rows.map(r => [...r]);
const s = rows => rows.map(r => r.join(''));
const shiftX = (rows, y0, y1, dx) => rows.map((r, y) => y < y0 || y > y1 ? r : dx > 0 ? ('.'.repeat(dx) + r.join('')).slice(0, r.length).split('') : (r.join('').slice(-dx) + '.'.repeat(-dx)).split(''));
const squash = rows => { const r = rows.slice(); r.splice(16, 1); r.unshift(Array(r[0].length).fill('.')); return r; };   // head and chest 1 px lower
const eyes = (rows, kind) => {
  const r = g(s(rows)), find = () => { for (let y = 0; y < 14; y++) { const x = r[y].indexOf('Y'); if (x >= 0) return [x, y]; } };
  const [ex, ey] = find();
  for (let y = ey - 1; y < ey + 4; y++) for (let x = ex - 1; x < ex + 4; x++) if ('KYyEH'.includes(r[y][x])) r[y][x] = 'B';
  if (kind === 'shut') { r[ey + 1][ex - 1] = 'K'; r[ey + 2][ex] = 'K'; r[ey + 2][ex + 1] = 'K'; r[ey + 1][ex + 2] = 'K'; }  // a happy sleepy arc
  if (kind === 'ouch') { r[ey][ex] = 'K'; r[ey + 1][ex + 1] = 'K'; r[ey + 2][ex] = 'K'; r[ey + 1][ex + 2] = 'K'; r[ey][ex + 3] = 'K'; r[ey + 2][ex + 3] = 'K'; }  // > < squint
  return r;
};
const mouth = rows => { const r = g(s(rows)); for (let y = 10; y < 14; y++) r[y] = [...r[y].join('').replace('DDDDDDKK', 'KZZZZZKK')]; return r; };
const punch = rows => { const r = g(s(rows)); for (let y = 19; y < 25; y++) { const l = r[y].join(''); const i = l.lastIndexOf('FF'); if (i > 0) { r[y] = [...(l.slice(0, i) + 'BBBFF' + l.slice(i + 2)).slice(0, l.length)]; } } return r; };
const B = g(base);
const F = {
  idle1: B,
  idle2: squash(B),
  attack: punch(mouth(shiftX(B, 0, 31, 3))),
  hit: eyes(shiftX(B, 0, 31, -2), 'ouch'),
  nap: eyes(squash(B), 'shut'),
};
const bufs = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, P.draw(s(v))]));
Object.entries(bufs).forEach(([k, b]) => P.save(b, 'jack_px_' + k + '.png'));
P.save(P.sheet(Object.entries(bufs).map(([k, b]) => ({ buf: b, label: k.toUpperCase() })), { scale: 6, gap: 8, bg: [26, 31, 74, 255] }), 'frames.png');
const seq = [bufs.idle1, bufs.idle2, bufs.idle1, bufs.idle2, bufs.attack, bufs.attack, bufs.idle1, bufs.hit, bufs.hit, bufs.idle1, bufs.nap, bufs.nap];
fs.writeFileSync('jack_px.gif', P.gif(seq.map(b => { const o = new P.Buf(b.w, b.h); o.clear([26, 31, 74, 255]); o.sprite ? o.sprite(b, 0, 0) : null; return o; }), { scale: 8, delay: 25 }));
console.log(Object.keys(bufs).join(' '), bufs.idle1.w, bufs.idle1.h);
