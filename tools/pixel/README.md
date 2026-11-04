# Pixel Land sprites (v1.3)

Sources of the 8-bit sprites in `assets/px/` (docs/gdd/1.3-pixel-land.md, section 4c and 7).

- `side2.txt` (Jack, side view, battle) and `jack2.txt` (Jack, front, left half, mirrored): drawn by hand, one letter = one pixel. Colours are the `PAL` table in `sprite.js`.
- `bibi.txt`, `bolty.txt`, `pipo.txt`: drawn by hand. `props/*.txt`: chest, heart, cap, castle, sun.
- Sir Leafy and the Pixel Dragon: `enemies.js` pixelates Fluent Emoji 3D pictures (MIT, github.com/microsoft/fluentui-emoji: `man_elf_3d_default.png`, `dragon_3d.png`, put them in `ref/`), recolours them and adds hand-drawn props.
- `anim.js` makes Jack's battle frames, `rframes.js` the rivals' frames, `export.js` writes everything to `assets/px/` at 4x (nearest).

The scripts need the codixel skill (`git clone https://github.com/mankidev/codixel ~/.claude/skills/codixel`, MIT) for `core/pixel.js`. Run them from a scratch folder that holds these files.
