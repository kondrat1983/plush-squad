// one letter = one pixel; '#' lines are comments; rows are padded with '.' to the longest row
const P = require(process.env.HOME + '/.claude/skills/codixel/core/pixel.js');
const PAL = { K: '#101830', D: '#1c3c78', B: '#2c5cb0', L: '#5890d8', R: '#6aa0b0', r: '#3a6878',
  W: '#7c6048', w: '#4e3a2a', C: '#f4e0a8', c: '#d8bc80', S: '#ec8c5c', F: '#56b4a8', f: '#2e8078',
  G: '#5aa890', g: '#357a66', Y: '#f8c838', y: '#b88018', E: '#000000', H: '#ffffff', X: '#ffffff', Z: '#ff5050', O: '#f89838', o: '#c06820', P: '#f888a8', M: '#c83040', V: '#c8f0ff', T: '#20a8a0', t: '#127a74', N: '#6a3a1a', A: '#f8c090', a: '#d89060', U: '#3a2010', Q: '#f8d040', I: '#48c048', i: '#2a8a30', J: '#8ae070', e: '#1a3c90', b: '#68b8f8', n: '#2860d8' };
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
P.draw = (rows, mirror) => {
  if (mirror) rows = rows.map(l => l + [...l].reverse().join(''));
  const w = Math.max(...rows.map(r => r.length)), b = new P.Buf(w, rows.length);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) b.pset(x, y, rgb(PAL[ch])); }));
  return b;
};
P.rows = file => require('fs').readFileSync(file, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#'));
module.exports = P;
if (require.main === module) { const [f, out, m] = process.argv.slice(2); P.save(P.draw(P.rows(f), m === 'm').scaled(11), out); }
