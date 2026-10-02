# Plush Squad 🐉🛏️

A pillow duel starring **Jack** the plush dragon vs **Timmy the Tiger**.
Pure HTML5 (Phaser 3), works in any browser, installs as an app (PWA) and plays offline.

## Play locally
Open a terminal in this folder and run `python3 -m http.server 8000`, then open http://localhost:8000.
(Opening `index.html` by double-click won't work — browsers block loading local game files that way.)

## Publish on GitHub Pages (free)
1. Create a new **public** repo on github.com, e.g. `plush-squad`.
2. Upload everything from this folder (drag & drop the files on the repo page → *Commit changes*).
3. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
4. In ~1 minute the game is live at `https://<your-username>.github.io/plush-squad/`.

## Install on iPad / iPhone
Open the link in **Safari → Share → Add to Home Screen**. It launches full-screen and works offline.

## Updating
Change files, bump `CACHE` in `sw.js` (e.g. `plushsquad-v0.2.1`) so devices pick up the new version, push.

## What's inside
- `index.html` — page shell, PWA meta
- `js/game.js` — the game (Boot → Title → Battle scenes)
- `js/audio.js` — all sounds & music are synthesized live with Web Audio (no audio files)
- `assets/` — Jack photo cut-outs, Fluent Emoji 3D art (MIT, © Microsoft), Poppins font (OFL)
- `vendor/phaser.min.js` — Phaser 3.90 (MIT)
- `sw.js`, `manifest.json` — offline + install

## Roadmap ideas
- v0.3: more opponents (cow, snake…), world map, XP unlocks
- v0.4: "+ Toy": photo → background removal in-browser → new hero
