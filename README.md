# Plush Squad 🐉🛏️

**Docs (GDD, decisions, design docs, QA reports):** https://kondrat1983.github.io/plush-squad/docs/

A pillow duel starring **Jack** the plush dragon, his rivals and your own toys.
Pure HTML5 (Phaser 3), works in any browser, installs as an app (PWA) and plays offline.

## Play locally
Open a terminal in this folder and run `python3 -m http.server 8000`, then open http://localhost:8000.
(Opening `index.html` by double-click won't work — browsers block loading local game files that way.)

## Tests
`npm install && npx playwright install chromium && npm test` runs the browser tests in `tests/` (Playwright). They also run on every push (GitHub Actions). Notes for AI helpers are in `CLAUDE.md`.

## Publish on GitHub Pages (free)
1. Create a new **public** repo on github.com, e.g. `plush-squad`.
2. Upload everything from this folder (drag & drop the files on the repo page → *Commit changes*).
3. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
4. In ~1 minute the game is live at `https://<your-username>.github.io/plush-squad/`.

## Install on iPad / iPhone
Open the link in **Safari → Share → Add to Home Screen**. It launches full-screen and works offline.

## Updating
Change files, bump `CACHE` in `sw.js` (e.g. `plushsquad-v0.2.1`) so devices pick up the new version, push.

## Online part (optional)
`js/config.js` holds the Supabase project URL and publishable key (public by design). The database is created once with `supabase/schema.sql` (SQL Editor → Run); all access is protected by Row Level Security. Without config the game is fully offline.

## What's inside
- `index.html` — page shell, PWA meta
- `js/game.js` — the game (Boot → Title → Map / Squad / Studio / Star Catch / Capsules → Battle scenes)
- `js/audio.js` — all sounds & music are synthesized live with Web Audio (no audio files)
- `js/toys.js` — toy types, elements, personalities and the hero generator (no AI text, just rules)
- `js/extra.js` — Me, Sticker Album, real-life Quests, Parents area, bedtime, What's new
- `js/net.js` — accounts, cloud saves, friends, mail, weekly boss, museum (Supabase, `vendor/supabase.js`)
- `js/toyworker.js` — on-device background removal + type guess (transformers.js, `vendor/tjs`)
- `assets/` — Jack photo cut-outs, Fluent Emoji 3D art (MIT, © Microsoft), Poppins font (OFL), `arch_emb.json` (pre-computed type embeddings)
- `vendor/phaser.min.js` — Phaser 3.90 (MIT)
- `sw.js`, `manifest.json` — offline + install

## Versions
- **v0.8**
  - **Canada**, a new snowy world: Max the Moose, Beaver Bob, Mountie Bear and the boss **Sasquatch**. Harder than Space.
  - **SAVE IT!**: Sasquatch shoots hockey pucks; tap at the right moment for a perfect save (the puck bounces back).
  - **Pond Hockey** mini-game (after beating Beaver Bob) and a **comic** the first time you arrive in Canada.
  - **Space rework**: The Blips (three aliens) and the boss **The Mothership**. "Fire or Beam?": FOAM! stops Inferno Rain, UMBRELLA! stops the Tractor Beam, which can take a card.
  - **Boss hats**: Owl Hat, UFO Hat, Bat Hat, Canada Toque. The Royal Crown is now the Superstar sticker reward.
  - 5 new stickers (27), 6 new real-life quests (24), Sticker Album pages.
  - Fixes: CANCEL while a toy photo is processed, title layout on tall phones, a bigger REMOVE button.
- **v0.7**
  - **Accounts** (name + password, no e-mails) with **cloud saves**, a recovery code for forgotten passwords.
  - **Friends** by code: duel your friends' toys (or their Jack), "X beat your toy! Revenge?", gift a capsule a day or a booster, send stickers.
  - **Weekly co-op boss**: everyone hits the same Pillow Kraken; when it falls, everyone who hit it gets a golden (super rare) capsule.
  - **Toy Museum** with hearts, **Star Catch top list** of the week (friends only).
  - **Sticker Album** (21 achievements, each = a capsule), **Me** card with titles and costumes.
  - **Real-life quests** approved by a grown-up, **Parents** area: bedtime, daily limit, play time.
  - **Halloween event** (October): SPOOKY world with Pumpkin Pete, Batty, Webster and Count Fang, hats to win, candy in Star Catch.
  - "What's new" popup after updates; layout fixes on small phones.
- **v0.6**
  - **Difficulty: EASY / NORMAL / HARD** switch on the map (saved). Easy = softer rivals; Hard = tougher rivals and ×1.5 XP.
  - **Rotate any time:** turning the phone/iPad rebuilds the game for the new orientation and puts you back where you were, even mid-duel (pep, used moves, dizzy, shields are kept).
  - **Capsule machine:** turn the crank, a capsule rolls out, tap to open a surprise **booster** (10 kinds: common / rare / super rare).
    Capsules come from first wins over each rival, every 3rd win and one free capsule a day. No shop, nothing to buy.
    Before a duel you can pick one booster: Big Breakfast, Pillow Fort, Warm Milk, Lucky Star, Feather Storm, Snow Globe, Sleepy Moon, Rocket Start, Spare Heart, Super Star.
- **v0.5** — ideas from our chief tester's survey:
  - **World 2: SPACE** (unlocks after Professor Hoot): Robo-Bop → Polandball → Boo the Space Ghost → boss **Giant Dragon Boss**. World tabs on the map.
  - **Inferno Rain**: the Dragon Boss gathers fire for a turn, then fireballs fall from the sky. Tap **BLOCK IT!** to grab the fire extinguisher:
    the rain turns to steam and the boss gets dizzy. Rivals with milk can block it too. Jack learns Inferno Rain at Lv5.
  - **Harder rivals** as you level up (more pep, stronger hits, smarter choices), because the game was "too easy 😎".
  - **Star Catch** mini-game: 30 seconds, catch stars (+1) and dumplings (+3), dodge pillows. Score = XP.
- **v0.4** — **+ Toy**: take a photo of any plush → the background is removed on the device (ormbg, Apache-2.0) →
  "who is it?" is guessed on the device (MobileCLIP S0, Apple sample-code licence) from 44 types → a hero is built from rules:
  type → signature move, main colour → element move, a random personality → extra move, name you can edit.
  Toys live in **My Squad**: play as any toy, or duel your own toys. Nothing is uploaded; models (~90 MB) download once from Hugging Face.
- **v0.3** — rivals map (Timmy the Tiger → Moo the Cow → Sly the Snake → boss Professor Hoot), 1–3 stars per rival,
  rival-specific moves (Moo-Quake, Milk Break, Shield, Tail Whip, Hypno, Pop Quiz), status effects (dizzy, shield),
  new Jack moves unlocked by level: Dumpling Snack (Lv2), Six-Seven Dance (Lv3), Tail Spin (Lv4).
- **v0.2** — Phaser rewrite of the pillow duel: particles, hit-stop, screen shake, synthesized sound, PWA.

## Roadmap
- v0.8 Ocean / Canada worlds, daily streak
- v0.9 Two players on one iPad, live online duels
