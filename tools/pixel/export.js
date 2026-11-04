// copy the approved sprites into assets/px at 4x (nearest), trimmed
const P = require('./sprite.js'), fs = require('fs'), [dst] = process.argv.slice(2);
const put = (b, name) => P.save(P.trim(b, 0).scaled(4), `${dst}/${name}.png`);
for (const n of ['idle1', 'idle2', 'attack', 'hit', 'nap']) P.save(P.load(`jack_px_${n}.png`).scaled(4), `${dst}/jack_px_${n}.png`); // same canvas for every frame: no jump on a swap
put(P.draw(P.rows('jack2.txt'), true), 'jack_px_front');
const ren = { knight: 'leafy', boss: 'pixeldragon', bibi: 'bibi', bolty: 'bolty', pipo: 'pipo' };
for (const [k, id] of Object.entries(ren)) for (const n of ['idle1', 'idle2', 'attack', 'hit']) P.save(P.load(`out/px_${k}_${n}.png`).scaled(4), `${dst}/${id}_${n}.png`);
for (const f of ['chest', 'chestopen', 'heart8', 'bitcap', 'castle', 'sun']) put(P.draw(P.rows(`props/${f}.txt`)), f);
