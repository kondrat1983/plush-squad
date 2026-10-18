# Plush Squad v1.1.0 QA Report (light pass)

Branch `claude/v1.1-countryballs`, checked on 4d204ce. Head is now f8e99e7, which only changes two test files, so the results stand. Scope: new v1.1 features only, 2 sizes: iPhone portrait 390x844 and iPad landscape 1180x820. Scripted headless Chromium, `?debug`. Full suite not run (CI does). Page errors: 0 in every run. Canvas is 1080 wide on the phone and 1554 on the iPad, so sizes below are game pixels.

## 0. Summary

Verdict: no S1, no S2. Merge is not blocked. One S3 (the Poland picture), four S4.

| Severity | New | Open from before |
|---|---|---|
| S1 | 0 | 0 |
| S2 | 0 | 0 |
| S3 | 1 (B73) | B71 seen again |
| S4 | 4 (B74 to B77) | B69, B70, B72 not rechecked |

Fix next: B73 (needs Kondrat's decision), then B74.

## 1. Fix verification

Not part of this pass.

## 2. Checks

| Area | Result |
|---|---|
| Map, FLAGS tab, with `?halloween` (7 tabs) | 7 tabs of 110x96 on both sizes, nothing off screen, tab fits on iPad. Level line shows "FLAGS" on both. Event is on today, so the 6-tab case was checked by faking the date (see mig11). |
| Rivals | Order England, Spain, Japan, USA, Poland. Crown only on Poland. Locked until one Brock Lee star. Pep: England 175, Poland 250 / 265 (L14) / 315 (L18+), EASY 200, HARD 300, USA 205. All match the design. |
| COPYCAT! (England mini, Spain) | Real taps on both sizes. Arms, mint tint, chip, strips on every card, first-time hand on the nap card, `copySeen` set once. Nap: "Balls can't nap upside down!", copy gone, `copyFlops` +1. Strip numbers match the card ranges (mini halves). |
| All 24 rival moves, forced through `doMove` | 0 errors, hero pep changes as expected. Copy leaves the tint on and `copy` armed. |
| Poland PUSH! NORMAL | Button, hand and words show on both sizes. Full push: rocket flies up, "CAN INTO SPACE!", orbit turn with planet, "HELLO FROM SPACE!", Space Pierogi, parachute down, `pushes` +1, rival back on the ground at scale 1. |
| Poland not pushed | Fall damage in range: NORMAL 30 (24-30), EASY 22 (x0.8 range), HARD 35 (x1.15 range). Log "Fizzle... PLOP!". Launch uses 2 / 1 / 3 as designed. |
| Poland HARD | Button counts 3, 2, 1, GO!. Off GO! it is a little push: no fall, no orbit, no `pushes`. On GO! a full push. (My timing was slow, both outcomes seen.) |
| Rotation 390x844 to 844x390 and back | With a copy armed: same state after each rebuild (tint, chip, strips, hand), copy resolves once on the nap. With a launch charge: rotation held mid-turn, applied at YOUR TURN, PUSH! button and rocket back, push works after the rebuild. |
| Leave and come back | BACK during a HARD countdown, during the orbit turn and with a copy armed, then a new Poland duel: clean state (no rocket, planet, chip, tint), 0 errors. |
| Result screens, win and lose | England, Poland (Pierogi Hat note, `pierogi` costume saved, +280 XP, first-win text), Kraken: panel, right buttons (NEXT RIVAL or REMATCH, MAP, BOSS for Kraken), XP saved, music back to `calm`, on both sizes (Kraken phone and iPad). Toy hero and friend duels not run. The result code is not in the diff. |
| Music | England and USA `parade`, Poland `boss`. |
| mig11 | v1.0 save with `lastWorld` 5 (Spooky) becomes 6. A save with `mig11` keeps 5 (Countryballs). Closed world falls back to Veggie. Event off (date faked to 20 Nov): lastWorld 6 falls back to Countryballs. Fresh player: Hills comic. |
| Cloud save migration | `Save.migrate` run on sample cloud saves: v1.0 Spooky 5 to 6, v1.1 stays 5, v0.7 3 to 6. See B76. |
| Comic | Plays when the world opens (also for a save past Brock Lee), marked seen, title page and peek ball shown, nothing off screen. Album comics tab: 7 covers fit on both sizes. |
| Stickers and quests | `poland`, `push5`, `copycat5` earn once each, +1 capsule each, no double award. 6 new quests in the pool (42 total). |
| What's new 1.1 | 3 entries, fits on both sizes. |
| Adventure | Trip to COUNTRYBALLS shows on the list and the postcard (teacup, line, fits). |
| Pierogi Hat | Shows in Me and on the title. |
| Fonts | `¡ Ó é ś ć` exist in both Poppins files. |

## 3. Bug status

### B73 (S3) Poland picture has the flag the wrong way round
- File: `assets/poland.png`.
- Steps: open Poland (map, duel, comic, What's new icon).
- Expected: white on top, red below (the design says "white over red").
- Actual: red on top, white below. That is the Indonesia / Monaco flag. A 10-year-old who knows flags will see it.
- Seen: live and the PNG itself.
- Fix idea: flip the picture vertically (the eyes sit in the red part, so re-export). Kondrat's art, his call.
- Related note [?]: England is a Union Jack with top hat. The design said "white ball, red cross". Kondrat may have meant this.

### B74 (S4) iPad landscape: tutorial hands cover text
- File: `js/game.js` `copyFx` (hand on the nap card) and `alarmHand` for PUSH!.
- Steps: 1180x820, first COPYCAT ever: the hand sits on the "Upside-Down Nap" title and hides "own". First PUSH!: the hand sits on the "VS" in the pep bars.
- Expected: hand points at the target without hiding text.
- Actual: as above. Phone is fine.
- Seen: live (screenshots).
- Fix idea: put the nap hand on the icon side of the card (left); place the PUSH! hand below the button on landscape.

### B75 (S4) COPY strips are tiny on the phone
- File: `js/game.js` `actionCard` `setCopy` (22 px text).
- 22 game px is about 8 CSS px on a 390-wide phone. It is the key hint of the new rule.
- Fix idea: 26 to 28 px and a taller strip if the card has room.

### B76 (S4) `Save.migrate` throws if the save has no `stars`
- File: `js/game.js` migrate (mig08 block), called from `js/net.js` `applyCloud`.
- Steps: `__save.migrate({})` gives "Cannot read properties of undefined (reading 'dragonboss')".
- Real cloud rows come from full saves, so I think this is rare [?]. If it happens, the pull is dropped silently by the `catch` in `_sync`.
- Seen: live (called directly).
- Fix idea: default `d.stars`, `d.toys` in `Save.migrate` before the blocks.

### B77 (S4) Map bunting runs over node labels
- File: `js/game.js` `ballsDecor`.
- The pennants cross "???" labels and a star row (iPad: Spain label, USA stars; phone: Japan label).
- Fix idea: lift the bunting above the top node row in landscape or draw it behind the labels.

### Still open from before
- B71 (S3): Adventures list on iPad landscape, SAY GOODBYE covers the postcard tiles, tiny day text. Seen again in this pass.
- B69, B70, B72: not rechecked.

## 4. Layout matrix

Two sizes only, as asked. D1 to D5 not run.

| Screen | iPhone 390x844 | iPad 1180x820 |
|---|---|---|
| Map FLAGS, 7 tabs | OK (B77) | OK (B77) |
| Duel England, copy armed | OK (B75) | OK (B74, B75) |
| Duel Poland, PUSH! | OK | OK (B74) |
| Orbit turn | OK | OK |
| Result panels | OK | OK |
| Comic and Album comics (7 covers) | OK | OK |
| What's new 1.1 | OK | OK |
| Adventures, postcard | OK | B71 |

The off-screen checker found nothing outside 0..W x 0..H in the new screens. The only hits were sticker toasts sliding in.

## 5. Ideas for the Playwright suite

- B73: load `assets/poland.png`, sample the top-center and bottom-center pixel: the top must be lighter than the bottom.
- B74: 1180x820, first COPYCAT: the hand bounds must not intersect the nap card title text bounds.
- B75: assert the strip text font size >= 26.
- B76: `__save.migrate({})` must not throw.
- Rotation with a copy armed, and with a launch charge: already in `tests/countryballs.spec.js`.

## 6. Not tested

- Real device: iOS touch feel of the HARD GO! window (600 ms), sound and music of the new SFX and `parade`, iPhone safe areas.
- Layout sizes D1 to D5 other than the two asked for, rotation on the iPad.
- Toy hero, friend duel results and booster flows in Countryballs duels, bedtime, left-handed mirror, CALM MODE balloon.
- Online (ON-xx): real cloud save pull with a v1.0 account. Only the migrate function was called directly.
