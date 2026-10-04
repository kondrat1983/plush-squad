# Plush Squad v0.8 part 2/7 (Space rework) - QA Report

| | |
|---|---|
| **Build** | worktree `claude/v0.8-space`, HEAD 500688f, PR #46. Diff: `git diff origin/claude/v0.8-costumes...HEAD` (`js/game.js`, `js/extra.js`, `js/net.js`, `sw.js`, 3 new assets, new `tests/space.spec.js`). VERSION / CACHE still 0.7.8 (not a release). |
| **Date** | 4 Oct 2026 (Halloween ON) |
| **Method** | Code review of the diff against `docs/gdd/0.8-space-rework.md` (sections 3, 6.3, 6.4, 8; read from `origin/claude/v0.8`, the doc is not in this worktree) and `decisions.md` + `npm test` + scripted play in headless Chromium (`?debug`, lag smoothing off on every scene and after every rebuild, duels ended through `finish(won)`, BLOCK IT / REMATCH / NEXT RIVAL / album page buttons pressed with real mouse events, rotations as real viewport changes) + seeded old saves + layout checker on D1-D5 + screenshots + offline check with the service worker registered by hand. No real device, no online accounts. |
| **Scope** | Part 2 = content swap with the OLD boss behaviour (Inferno Rain + BLOCK IT!). Tractor beam, umbrella, Mini Beam, new SFX and the charge text are part 3 and were not judged here. |
| **Bug IDs** | Kept. New: B45, B46 (after B44). |

## 0. Summary

**Verdict: good to merge into `claude/v0.8`. No S1 / S2.** The swap is clean: no "Polandball" or "Dragon Boss" text anywhere a kid can see, old saves keep every star and sticker, the new stickers are given by the right stats, Inferno Rain + BLOCK IT! and the milk block work as before, and a rotation during a Mothership charge comes back with the charge and the button. Album paging (B06) works on all 5 sizes and across a rotation. 0 page errors in every run. Two new S4 findings: the Mothership's win line is so long that it overlaps "YOU WIN!" and the stars on the result panel (B45), and "Blips" is plural but the shared duel lines treat it as one ("Blips is too dizzy", "BLIPS'S TURN") (B46).

| | |
|---|---|
| `npm test` | **53 / 53 pass** (22.1 min, 2 workers), incl. the 8 new Space tests |
| Space map + 4 Space rivals, win and lose, D2 + D5 | ✅ 16 / 16 duels: right art, right track (`battle`, `boss` for the Mothership), panel, buttons, XP once, `calm` after. ⚠️ B45 on the Mothership win panel |
| Old names | ✅ none in map, duel, result, Album, Me, toasts (text walk of every scene + toast watcher) |
| Mothership rewards | ✅ first win: UFO Hat note, Saucer Champ toast, `motherWins` 1. Second win: nothing new. Old Dragon Boss winner: UFO Hat + Saucer Champ only after a new win |
| Dragon vs Dragon | ✅ given on a friend's Jack win (`fjackWins` 1), not on a Mothership win, kept by old saves |
| Inferno Rain / BLOCK IT! / milk | ✅ (details in section 2) |
| Rotation during a Mothership charge | ✅ both cases: at YOUR TURN (rebuilds at once) and mid-charge (held, applied at YOUR TURN) |
| Album paging, D1-D5 + rotation | ✅ all 22 stickers reachable, nothing off-screen, page kept across rotation |
| Offline cache | ✅ every `FILES` entry exists; new art cached; offline reload loads `aliens`, `mothership`, `umbrella`, `dragonboss` |
| Result screen, every mode, win + lose | ✅ 12 / 12 (+ 8 Space duels above) |
| New bugs | **B45** (S4), **B46** (S4) |

**Fix next:** B45 (shorten the Mothership laugh or give the panel room for 3 lines). B46 needs a small choice (see the bug). Nothing blocks the merge.

## 1. Fix verification

| ID / item | Status | How checked |
|---|---|---|
| **B06** Sticker Album has no paging | ✅ Fixed | Max-content save (all 22 stickers, `?halloween`). D1 15 + 7, D2 21 + 1, D3 12 + 10, D4 14 + 8, D5 14 + 8. Real mouse clicks on ▶ / ◀. Layout checker: 0 off-screen, 0 overlaps on every page. Rotation on page 2 (D2 -> D5 -> D2) stays on page 2 (clamped to the new page count). Double ◀ tap: one page back, no error. A new visit from the title nav starts on page 1 (`data = {}`) |
| Design 3.1 The Blips | ✅ | `__RIVALS[5]`: id `polandball`, The Blips / Blips / THE BLIPS, tex `aliens`, green, 145 hp / 120 xp. Moves Mini Planet (planet projectile), Wobble Hop, Beam me up... oops! (word colour `#8cff7a`, checked by hooking `popWord`), bubble helmets. Option 1 numbers kept (Mini Beam is part 3) |
| Design 3.2 The Mothership | ✅ | `__RIVALS[7]`: id `dragonboss`, tex `mothership`, lilac, boss, `reward: 'ufohat'`, 200 hp / 180 xp, `big: 1.15`, no `ownCrown`. Map crown drawn by the generic boss rule (screenshots D2, D4, D5). Duel has 0 `ufo` decor images (Blips / Robo-Bop / Boo duels have 1) |
| Design 6.3 stickers | ✅ | Into Space! = `stars.polandball`, icon `aliens`. Dragon vs Dragon = `stats.fjackWins`. Saucer Champ = `stats.motherWins`, never from old `stars.dragonboss` (old save with 3 stars: not given on load, given after a new win) |
| Design 6.4 ids kept | ✅ | Old v0.7.8 save (24 stars, `ach` polandball / dragon / allstars, wearing the crown, title Dragon Champion): ★ 24 / 36, 3 stars on the Blips and Mothership nodes, stickers kept, crown kept and worn, title kept. Save with only `stars.polandball`: Boo open, Mothership locked, hint "Beat Boo the Space Ghost first!" |
| `net.js` friend sticker icon | ✅ code + texture | `space` sticker icon is `aliens` (texture loaded in Boot, `iconScale` base 385 = the art's long side). Old mail keeps the id `space`, so it shows the new icon. Not seen on screen (needs an account) |
| `sw.js` / Boot preload | ✅ | `FILES` -polandball +aliens +mothership +umbrella; all 70 entries exist. SW registered by hand on localhost: cache holds the 3 new files; offline reload has all textures. `assets/polandball.png` is still in the repo but loaded nowhere |

## 2. Regression list results

### Space duels (D2 portrait and D5 landscape, Halloween ON)

| Rival | Win | Lose | Track | Notes |
|---|---|---|---|---|
| Robo-Bop | ✅ NEXT RIVAL / MAP | ✅ REMATCH / MAP | `battle` -> `calm` | |
| The Blips | ✅ +120 | ✅ +10 | `battle` -> `calm` | sprite 482 px tall (D2), 347 (D5) |
| Boo | ✅ | ✅ | `battle` -> `calm` | |
| The Mothership | ✅ +200 first win, UFO Hat note, Saucer Champ toast | ✅ | `boss` -> `calm` | ⚠️ B45 |

0 page errors, layout checker clean on every duel and panel.

### Result screen in every battle mode (D2)

| Mode | Win | Lose | Notes |
|---|---|---|---|
| Campaign | ✅ (Space duels above) | ✅ | |
| Campaign boss: Prof. Hoot | ✅ +100, Owl Hat note | ✅ REMATCH / MAP | `boss` |
| Campaign boss: Mothership | ✅ | ✅ | `boss` |
| Own toy | ✅ REMATCH / SQUAD, +30 | ✅ +10 | |
| Friend's toy | ✅ REMATCH / FRIENDS, +35, Friendly Rival | ✅ | |
| Friend's Jack (L5) | ✅ REMATCH / FRIENDS, +35, **Dragon vs Dragon** toast, `fjackWins` 1 | ✅ no sticker | |
| Kraken | ✅ BOSS / MAP, +60 | ✅ BOSS / MAP | `boss` |

### Inferno Rain against the Mothership

| Case | Result |
|---|---|
| Charge (forced `pickMove`) | ✅ red sky, embers, BLOCK IT! visible at YOUR TURN on D1-D5, no overlaps. Log still says "takes a deep breath... GATHERING FIRE" (part 3 changes it, design appendix A) |
| BLOCK IT! (real mouse click) | ✅ "READY!", rain blocked, Jack 100 -> 100, `stats.blocks` +1, Mothership STEAMED (dizzy) |
| No block | ✅ Jack 100 -> 70, charge ends |
| 2 uses | ✅ `used.r0` 2 after two charges |
| Rotate at YOUR TURN while charging (D2 -> D5) | ✅ rebuilt at once, `charging = rain`, button and embers back, `boss` music; the rain then hits normally |
| Rotate during the charge animation | ✅ held (`__psRotatePending`), applied at YOUR TURN with the charge restored; BLOCK IT! after the rebuild blocks and counts |
| Jack's own Inferno Rain vs Moo / vs Prof. Hoot | ✅ milk block: their milk move used, 0 damage |
| Jack's own Inferno Rain vs the Mothership | ✅ always hits (230 -> 200) |

### Rotation

| Case | Result |
|---|---|
| Mothership charge (2 cases) | ✅ above |
| Mothership win panel, D2 -> D5 | ✅ same notes (UFO Hat), XP once, `calm`, 0 decor UFOs |
| Album page 2 | ✅ |
| Between turns, mid-turn, final move, result panel | ✅ suite `rotate.spec.js` 8 / 8 |
| Studio (blocked), Star Catch | not re-run (code unchanged) |

### Bedtime / daily limit

✅ Bedtime set during a Blips duel: the duel finished and the panel showed. ✅ NEXT RIVAL (real click) -> Bedtime. ✅ A new Mothership duel -> Bedtime.

### Boosters

✅ Suite B30 x3 + B01 x5. Code unchanged; booster rotation not re-run.

### Music

✅ `boss` in every Mothership duel, `battle` for the Blips. ✅ Mothership lose -> `calm`, REMATCH (real click) -> `boss` again, one track. ✅ Suite music tests. Mute and burst after a pause not re-measured (code unchanged).

### Map start world

✅ Suite `map.spec.js` 2 / 2. Map code changed only in the crown line.

## 3. Bug status

**Fixed by this change:** B06 (Sticker Album paging).

**From part 1, fixed on the costumes branch (seen in this build):** B42 (the Superstar desc is short again, the panel says "Superstar! New costume: Royal Crown!", seen live), B43 (suite test "migration gifts are announced once" passes; not re-run by hand).

**Still open (code unchanged):** B05, B07, B11, B13, B15, B16, B18, B19, B22, B23, B26, B27, B28, B29, B32, B38, B41, B44.

**Reopened:** none.

### New

**B45 - The Mothership's win line overlaps "YOU WIN!" and the stars** · S4 · `game.js` `RIVALS` (`dragonboss.laugh`) shown by `Battle.result()` (`sub` at `T0 + 345`)
- Steps: beat The Mothership (any device).
- Expected: the win line sits between "YOU WIN!" and the stars, like every other rival.
- Actual: the laugh is 121 characters (the next longest is the Blips, 78; the old Dragon Boss line was 78). It wraps to 3 lines on both orientations. `sub` is centred on a fixed y, so the first line runs into the bottom of "YOU WIN!" and the last line runs into the stars. The panel has room for 2 lines only.
- Seen: live, screenshots `result_dragonboss_win_D2.png`, `result_dragonboss_win_D5.png`.
- Fix idea: shorten the line to 2 lines, for example `The Mothership giggled so hard her lights went disco. "Great job, little dragon!"` (the Dragon can still wave in the duel log). Or set `oy: 0` on `sub` and push the stars down by the extra line height. Text change = Kondrat's / designer's wording.

**B46 - "The Blips" are plural, the shared duel lines are singular** · S4 · `game.js` `rivalTurn0()` banner, dizzy logs, `MOVES` logs (`{d} gets dizzy`)
- Steps: fight The Blips; let them get dizzy (Six-Seven Dance) or just wait for their turn.
- Expected: "THE BLIPS' TURN", "The Blips are too dizzy to move!".
- Actual: "BLIPS'S TURN", "Blips is too dizzy to move!", "Jack busts out the SIX-SEVEN dance! Blips gets dizzy watching!". The Blips' own move logs are plural ("Blips bowl a tiny planet"), so the two styles sit next to each other in the same duel.
- Seen: code (strings at lines 1905, 1925, 1929-1930, 2065 and the `{d} gets` logs) + live log line "Blips try to beam up..." for the plural side.
- Fix idea: a `plural: true` flag on the rival, and a tiny helper (`is` / `are`, `'S` / `'`) for the 4-5 shared lines. Or accept it as is; the chief tester may well notice [?].

### Observations (no ID)

- **Dragon Boss picture is still visible**: the Dragon vs Dragon sticker uses `dragonboss.png` as its icon (Album, sticker toast). Design 3.3 asks for that; acceptance item 1 says "no ... picture anywhere". The Dragon is "on holiday" in the story, so it reads fine to me [?]. Kondrat's call.
- **Two stickers for one friend's Jack win**: a friend's Jack win also bumps `friendWins`, so a first one gives Friendly Rival ("Beat a friend's toy") and Dragon vs Dragon together. `friendWins` behaviour is old; only the pair is new.
- **Players who skipped v0.7** [?]: a player who beat the Dragon Boss on v0.6 and never opened v0.7 never got `ach.dragon`. On v0.8 they now need a friend's Jack win (an account). Probably nobody.
- **Charge text** ("takes a deep breath... the sky turns red!", "GATHERING FIRE...") and the orange charge tint on a lilac saucer read like the old dragon. Part 3 rewrites `startCharge`, so no ID.
- `assets/polandball.png` and the `polandball` entry in `iconScale` are dead now. Safe to delete in a later cleanup (old SW caches only hold a copy).
- VERSION / CACHE are still 0.7.8. Fine for a part branch; the v0.8 release must bump both, or installed apps keep the old `plushsquad-v0.7.8` cache name (new files are still added to it, so nothing breaks).
- Album counter: outside the Halloween event the Album says "x / 22" but shows 21 cards (Count Fang hidden). Old behaviour.

## 4. Layout matrix

Checker: text and interactive objects outside `0..W x 0..H`, and overlapping interactive objects at the same depth. Save: 3 Hills + Space stars open, or all 22 stickers for the Album.

| Screen | D1 SE | D2 14 | D3 iPad P | D4 iPad L | D5 14 L |
|---|---|---|---|---|---|
| Map, Space tab | ✅ | ✅ | ✅ | ✅ | ✅ |
| Blips duel | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mothership duel, idle | | ✅ | | | ✅ |
| Mothership charge + BLOCK IT! | ✅ | ✅ | ✅ | ✅ | ✅ (also after rotation) |
| Result panel, Space rivals | | ✅ / ⚠️ B45 (Mothership win) | | | ✅ / ⚠️ B45 |
| Album page 1 / page 2 | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |
| Me (old save, crown, Dragon Champion) | | | | | ✅ |

Album sticker text: the new descs fit at scale 0.85-1.0 (D4 worst: "Beat The Mothership" 0.85). On D4 the old long descs shrink to 0.59 ("Fight the weekly Pillow Kraken"): old, part of B42's family, not new.

## 5. Ideas for the Playwright suite

| # | Catches | Repro |
|---|---|---|
| T22 | B45 | For every `__RIVALS` entry with a `laugh`: finish a win, then check that the bounds of the `sub` text do not intersect the "YOU WIN!" text or the star images |
| T23 | B46 | Blips duel, set `rival.dizzy = true`, run `rivalTurn0()`; expect the log not to match `/Blips is|BLIPS'S/` |
| T24 | Charge + rotation | Mothership, `b.pickMove = () => b.rmoves[0]`, one player move, then at YOUR TURN rotate: expect `rival.charging.type === 'rain'` and `blockBtn.visible` in the new game. Second variant: rotate while the charge animates, expect `__psRotatePending` then the same state (my script did both) |
| T25 | Milk block | Jack (L7) plays `inferno` vs Moo and vs Hoot: rival hp unchanged, milk move `used` 1. Vs the Mothership: hp drops |
| T26 | Offline list | Node-only test: every key in the Boot preload list and every `icon:` texture used by `ACH` / `STICKERS` has `assets/<key>.png` in `sw.js FILES` |
| T27 | Bedtime + Space | Bedtime during a Blips duel: panel shows; NEXT RIVAL -> `bedtime`; `scene.start('battle', {rival: 7})` -> `bedtime` |
| T28 | Old saves through a full win | Old save with `stars.dragonboss: 3`, no `stats`: Mothership win gives `ufohat` + `ach.ufo`, no second `dragon`, stars stay 3 |

## 6. Not tested

- **Real devices (IOS-xx):** the new art at real size and the alien-green / lilac on the iPhone screen; ◀ / ▶ glyphs on the Album buttons (iOS may draw them with the emoji font [?]; the Friends screen already uses them); touch on the page buttons (200 x 100 canvas px, about 70 x 35 css px on iPhone portrait, part of B26).
- **Online (ON-xx):** friend sticker picker and mail with the new `aliens` icon; a real friend's Jack duel from the Friends screen (simulated with `fjack` data); cloud save carrying `fjackWins` / `motherWins`; friends' star totals.
- Not re-run because the code is unchanged: Studio and Star Catch rotation, booster rotation, mute and burst after a pause, Halloween OFF map.
- Out of scope (part 3): Tractor Beam, umbrella, Mini Beam, new SFX, charge texts, EASY one-button rule, HARD extra beam.
