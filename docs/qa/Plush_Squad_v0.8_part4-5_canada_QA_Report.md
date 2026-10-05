# Plush Squad v0.8 parts 4+5 (Canada world, SLAPSHOT + SAVE IT!) - QA Report

| | |
|---|---|
| **Build** | worktree `claude/v0.8-saveit`, HEAD 2861364. Diff: `git diff origin/claude/v0.8-beam...HEAD` (`js/game.js`, `js/audio.js`, `js/extra.js`, `sw.js`, 9 new PNGs, `tests/canada.spec.js`, `tests/saveit.spec.js`, `tests/map.spec.js`). Merges of earlier parts were not reviewed again. VERSION / CACHE still 0.7.8 (not a release). |
| **Date** | 4 Oct 2026 (Halloween ON by date; OFF checked with a mocked December date) |
| **Spec** | `docs/gdd/0.8-canada.md` from `origin/main`, sections 2-7 and the section 8 items that apply (not 4b Pond Hockey, 4c quests, 7b comic, stickers). Owner changes applied: reward = Canada Toque (`toque`), CANADA = 2, SPOOKY = 3. |
| **Method** | Code review of the diff + full `npm test` (port 8765, one run) + scripted play in headless Chromium (`?debug`). For real SAVE IT! timing I replaced `performance.now` and the rAF timestamp with a virtual clock (+40 ms per frame during a shot, +150 ms otherwise). The game then sees smooth frames, and a real mouse click or SPACE press lands at a known time after launch. Duels ran through the real `playerMove` / `rivalTurn` path; only the AI pick was forced to SLAPSHOT. Duels ended through `finish(won)`. Rotations were real viewport changes. Layout checker + screenshots on D1-D5. No real device, no online accounts. |
| **Bug IDs** | Kept. New: B51-B54 (B50 is taken by a GitHub issue). B47 reopened. |

## 0. Summary

**Verdict: good to merge into `claude/v0.8`. No S1 / S2.** SAVE IT! works the way the spec says, with real taps on the real clock: perfect, good, miss, WAIT FOR IT!, TOO EARLY!, the EASY auto-save, the tutorial wait, the hiccup rule, SPACE, and taps on the top bar ignored. A perfect save at 8 pep wins the duel and shows the result once. Rotation during the wind-up, during the flight and during the tutorial freeze all come back right, with damage applied once. Every battle mode shows the right result panel, saves XP and plays the right music. 0 page errors in every run.

One older fix does not work: the B47 fix (`Save.store()` in `rebuild()`) calls a `Save` that is out of scope. The error is swallowed, so stats bumped in memory are still lost on a rotation. That now includes the new `perfectSaves` (B47 reopened). Four new S4 findings, all about looks: the Spooky tab covers the capsule button on iPad landscape (B51); "PILLOW HILLS" shrinks to about 9 css px on phones when the event is off (B52); pines float in mid-air in Star Catch (B53); the NEXT: SAVE IT! chip hides the hero's hat on iPad portrait (B54).

| | |
|---|---|
| `npm test` | **71 / 71 pass** (37.8 min, first run, nothing else running) |
| SAVE IT! timing (spec 8 items 10-18) | ✅ all, live, 18 scripted shots (section 1) |
| Perfect save wins the duel (item 13) | ✅ result shown once, +220 XP, toque note |
| Rotation (items 23-24) | ✅ wind-up D2->D5 and D3<->D4 x2; flight D2->D5 held until YOUR TURN; tutorial freeze held until the tap |
| Every battle mode, win + lose | ✅ 19 / 19 on D2; Max + Sasquatch win / lose on D1-D5 |
| Map tabs, 5 sizes x event on / off | ✅ readable or icon-only, nothing off screen. ⚠️ B51 (D4, event on), B52 (portrait, event off) |
| Old saves / start world | ✅ 7 cases (section 2) |
| Toque on Jack and a toy hero (title, Me, duel) | ✅. ⚠️ B54 (chip over the hat on D3) |
| Music | ✅ `north` for Max / Bob / Mountie, `boss` for Sasquatch, `calm` on every panel, unchanged elsewhere |
| Page errors | 0 in every run |
| New / reopened | **B47** reopened (S4), **B51**, **B52**, **B53**, **B54** (all S4) |

**Fix next:** B47 (one line, and it decides whether the Goalie sticker counts right later). Then B54 and B51 (layout), B52 (tab threshold), B53 (pine y in Star Catch). Nothing blocks the merge.

## 1. Fix verification (spec acceptance items)

| Item | Status | How checked |
|---|---|---|
| 1. Locked Canada tab | ✅ | Real click on the locked tab: "Beat The Mothership to open CANADA!" |
| 2. NEW WORLD note | ✅ code | `unlockedNext && worldOf(nextIdx) !== this.world`; Mothership is the rival right before Max. Suite covers the order |
| 3. Map tabs with 4 worlds | ✅ / ⚠️ B51 | Portrait: active tab 372 wide with its name, others 186 icon-only. D5: all four named. D4: active 348 + icon tabs, Spooky tab covers the capsule button |
| 4. `lastWorld = 2`, Canada locked | ✅ | Opens Pillow Hills (furthest), 0 errors |
| 5. map.spec | ✅ | Spooky = world 3, suite green |
| 6. Unlock order | ✅ | Suite + map screenshots: Max -> Bob -> Mountie -> Sasquatch (crown, lock) |
| 7. Pep | ✅ | Suite: 210 at L5, 230 at L8, 250 at L10, EASY 170, HARD L8 275. Live: Sasquatch 220 at L7, Max 150 at L7 |
| 8. Space scaling unchanged | ✅ code | Same formula, `from = 4` |
| 9. Uses 2 / HARD 3 | ✅ | Suite |
| 10. Wind-up | ✅ | Real rival turn: frost tint `cfeaff`, frost sky `9fdcff`, snow particles, "WINDING UP...", chip on, no BLOCK IT! / FOAM! / UMBRELLA!, all cards on |
| 11. `judgeSave` table | ✅ | Suite (all edges) |
| 12. Perfect / good / miss | ✅ live | NORMAL tap at 1080 ms: hero -0, rival -10, `perfectSaves` 1. Tap at 680: hero -10 (of 20). No tap: -20, "Sasquatch: Oh! Sorry!". HARD at 960: perfect; at 680: good. SPACE at 1000: perfect |
| 13. Bounce-back wins | ✅ live | Rival at 8 pep, real click at 1080: YOU WIN!, +220, NEXT RIVAL / MAP, notes once |
| 14. Six-Seven | ✅ | Suite: NORMAL drops the puck; HARD keeps the wind-up and the chip |
| 15. Tutorial waits | ✅ live | First save ever (Max, NORMAL): frozen with TAP NOW!, tapped after 11 s of game time: perfect, 0 damage, `saveSeen` set. EASY tutorial: tapped after 6 s, perfect (no auto-save). ⚠️ no hand icon pointing at the glove (spec, observation) |
| 16. EASY no tap | ✅ live | Good save after 3 s, -10 of 20 |
| 17. Early taps, NORMAL | ✅ live | Tap at 200 -> WAIT FOR IT!, tap at 1050 -> SAVE!. Taps at 160 + 320 -> TOO EARLY!, BONK!, -20. A tap during GET READY counts as the forgiven early tap |
| 18. Hiccup rule | ✅ live | One 420 ms stall at 520 ms: shot restarts ("slips! Again!"), a tap at 1080 after the relaunch is perfect. Three stalls: good save. HARD tap in the pause: TOO EARLY!, miss |
| Tap on the top bar | ✅ live | Click at y = 20 css px at 1000 ms: ignored, miss |
| 19. Inferno / beam still block | ✅ | Suite `beam.spec.js` 6 / 6 |
| 20-21. Modes + music | ✅ | Section 2 |
| 22. Toy hero vs Sasquatch | ✅ | Wide toy (700 x 300 picture): glove 233 x 260 in front, over the toy body, readable (D2, D4) |
| 23. Rotate in the wind-up | ✅ | D2->D5 at YOUR TURN: charging, chip, frost tint and sky restored, same pep and `used`; the next shot (auto good) hits once (100 -> 90). D3->D4->D3 on HARD: same, layout clean |
| 24. Rotate during the flight | ✅ | Resize at 500 ms: `__psRotatePending` true, same game; no tap -> miss once (100 -> 80), rebuild at YOUR TURN in landscape |
| Rotate during the tutorial freeze | ✅ / ⚠️ B47 | Pending while TAP NOW! waits; a click on the old (scaled) canvas saves; rebuild after. `perfectSaves` lost (B47) |
| Rewards | ✅ | Toque on the first Sasquatch win only (D1-D5), shown in Me and on the title (Jack and toy hero) |

## 2. Regression list results

### Result screen in every battle mode (D2, real `finish(won)`)

| Mode | Win | Lose | Music in duel |
|---|---|---|---|
| Campaign: Timmy | ✅ +40, NEXT RIVAL / MAP | ✅ +10, REMATCH / MAP | `battle` |
| Campaign boss: Prof. Hoot | ✅ +100 | ✅ +10 | `boss` |
| Canada: Max / Bob / Mountie | ✅ +130 / +140 / +150, NEXT RIVAL / MAP | ✅ Max +10, REMATCH / MAP | `north` |
| Canada boss: Sasquatch | ✅ first +220 (bonus, capsule, toque note), second +200 (no toque note) | ✅ +10 | `boss` |
| Own toy | ✅ +30, REMATCH / SQUAD | ✅ +10 | `battle` |
| Friend's toy | ✅ +35, REMATCH / FRIENDS | ✅ +10 | `battle` |
| Friend's Jack L6 | ✅ +35, REMATCH / FRIENDS | ✅ +10 | `battle` |
| Kraken | ✅ +60, BOSS / MAP | ✅ +10, BOSS / MAP | `boss` |

Max and Sasquatch win / lose were also run on D1, D3, D4, D5: same buttons, XP saved, `calm` after the panel, nothing off screen. Every panel: XP in the save = gain, 0 page errors. The suite `result.spec.js` (campaign, Hoot, friend's Jack, Kraken) is green too.

### Rotation

| Case | Result |
|---|---|
| Wind-up, flight, tutorial freeze | ✅ (section 1) |
| Between turns, mid-turn, final move, result panel | ✅ suite `rotate.spec.js` 8 / 8 |
| Studio (blocked), Star Catch | not re-run (code unchanged) |

### Bedtime / daily limit

✅ Bedtime set during a Max duel (clock mocked to 21:30): a real slapshot (auto good) still plays, the duel goes on, then NEXT RIVAL goes to Bedtime.

### Boosters

✅ Suite B30 x3, B01 x4. Booster picked in a Sasquatch HARD duel: chips and wind-up fine (section 4). Bounce-back with Lucky Star / Rocket Start: code only (`raw` skips both; Rocket Start is not used up).

### Music

✅ Track per rival (above). ✅ Suite: every track schedules notes without errors (incl. `north`), track follows the scene, B34. New SFX (`slap`, `slide`, `glove`, `goalHorn`, `honk`, `chomp`) run without errors; not heard (headless, muted).

### Map start world

| Case | Opens |
|---|---|
| Fresh player (event on) | Pillow Hills |
| `lastWorld 2` (old Spooky), Canada locked, event on | Pillow Hills (furthest) |
| `lastWorld 2`, Mothership beaten, event on | Canada (expected per spec: no migration) |
| `lastWorld 3`, event off | Canada (furthest) |
| `lastWorld 3`, event on | Spooky |
| `lastWorld 2`, Canada open, event off | Canada |
| No `lastWorld`, furthest = Canada | Canada |

## 3. Bug status

**Fixed by this change:** none from the open list (feature parts).

**Still open (code unchanged):** B05, B07, B11, B13, B15, B16, B18, B19, B22, B23, B26, B27, B28, B29, B32, B38, B41. B11 note: with the Canada Toque an old player can own 9 hats. On iPad portrait the cards shrink to 91 game px (about 65 css px) and still overlap "Log in to save..." (screenshot `me9_D3`).

### Reopened

**B47 - Stats bumped in memory are lost on a rotation (the fix does not run)** · S4 · `game.js` `rebuild()` (outside `main()`), `extra.js` `bump()`
- Steps: any duel. Make a perfect save (or block an Inferno, nap...), then rotate within 30 s.
- Expected: `stats.perfectSaves` (and `blocks`, `beamBlocks`, `naps`) kept after the rebuild.
- Actual: `rebuild()` calls `Save.store()`, but `Save` is a `const` inside `main()`. The ReferenceError is swallowed by `try {} catch (e) {}`, so nothing is stored. Seen live twice: (1) `__save.data.stats.perfectSaves = 7`, then `__psRebuild()`: localStorage and the new save both have no `perfectSaves`. (2) A perfect save in the tutorial, rotation held until YOUR TURN, after the rebuild `stats` = `{ naps: 1, saveSeen: 1 }`. Without a rotation the same run keeps `perfectSaves: 1`. The Goalie sticker (10 perfect saves, later part) will count short.
- Seen: live.
- Fix idea: `try { window.__save && window.__save.store(); } catch (e) {}` in `rebuild()` (or expose `window.__psStore = () => Save.store()` inside `main()`). Add T36 so it cannot silently break again.

### New

**B51 - iPad landscape, Halloween on: the Spooky tab covers the capsule button** · S4 · `game.js` `MapScene.create()` (tab `room = W - 480`)
- Steps: iPad landscape (1024 x 768), October (or `?halloween`), open the map.
- Expected: the four tabs sit between the back button and the capsule / mute buttons.
- Actual: the right tab (Spooky, 174 wide, right edge x 1200) overlaps the interactive capsule button by 15 x 88 game px. `room` keeps 240 px on each side for BACK and mute only; the capsule button sits left of mute. With 3 tabs the row ended at 1185, so this is new with the 4th tab. Phones in landscape (D5) have room; portrait puts tabs on their own row.
- Seen: live, checker + screenshot `map_on_D4_w2`.
- Fix idea: in landscape use `room = W - 600` (or end the row at the capsule button's left edge minus 20).

**B52 - "PILLOW HILLS" is about 9 css px on phones when the event is off** · S4 · `game.js` `MapScene.create()` (`wide = tw0 - 140 < 170`)
- Steps: any date from 8 Nov to 30 Sep, Canada open, phone portrait (D1, D2), map.
- Expected: tab names readable (spec item 3: "readable or replaced by an icon").
- Actual: with 3 worlds each tab is 310 wide, the name area is 170, so `wide` is false and all names show. "PILLOW HILLS" is fitted to scale 0.66 (26 game px, about 9 css px on an iPhone). CANADA 0.98, SPACE 1.0. This is the layout for 11 months of the year; before Canada (2 tabs) the name was full size. iPad landscape already uses icon-only tabs here.
- Seen: live, `map_off_D1_w2`, `map_off_D2_w0`.
- Fix idea: switch to icon-only when any name would scale below about 0.85 (`tw0 - 140 < 230`), or use a short tab label "HILLS".

**B53 - Star Catch in Canada: the pines float in the sky** · S4 · `game.js` `canadaDecor()` (`gy = H * 0.62` / `0.58` for every non-battle scene)
- Steps: open the Canada map, tap STAR CATCH.
- Expected: pines stand on the snow, or are not drawn.
- Actual: Star Catch draws its ground much lower (`bottomGround(..., 0.35)`), so the row of pines hangs about a quarter of the screen above the snow (D2, D4). On the map they also sit above the ground, but read as a far forest.
- Seen: live, `catch_on_D2_canada`, `catch_off_D4_canada`.
- Fix idea: pass the ground y to `sky()` / `canadaDecor()` (Catch: the top of its ground image), or skip pines when `scene.scene.key === 'catch'`.

**B54 - The NEXT: SAVE IT! chip hides the hero's hat on iPad portrait** · S4 · `game.js` `Battle.setup()` (`saveChip` at `hero.root.x, bby`)
- Steps: iPad portrait (768 x 1024), wear the Canada Toque (or any hat), Sasquatch duel, wait for a wind-up.
- Expected: the chip and the new hat both visible.
- Actual: the chip (depth 35) sits right on Jack's head and covers the toque almost completely (`chip_D3_hard`). On iPad landscape it touches the top of the hat; phones are clean. The kid wins the toque from Sasquatch and then cannot see it during Sasquatch's wind-ups.
- Seen: live, screenshots `chip_D3_hard`, `chip_D4_hard`.
- Fix idea: put the chip below the hp bar / beside the booster chip on short screens, or lift it by the hat height when a costume is worn.

### Observations (no ID)

- **Tutorial hand:** the spec says "a hand icon points at the glove"; the freeze shows only TAP NOW!. Works without it.
- **Hiccup restart text:** after a restart the label still says "SLAPSHOT!" while the puck waits 400 ms; "GET READY..." would match the spec flow.
- **Hiccup as a trick:** putting the app in the background three times during one flight gives a sure good save. This is what the spec asks for ("never loses a save to a frozen screen"). Mentioned only so Kondrat knows.
- **Frost tint and hits:** a hit on Sasquatch during the wind-up (`impact()` `clearTint()`, spray / rain tints) removes his frost tint; the frost sky and snowflakes stay. Same as the fire and beam tints before. Code only.
- **After Sasquatch during the event:** NEXT RIVAL goes to Pumpkin Pete (Spooky), as it did after the Mothership before.
- **Debug hooks:** `window.__psSaveAuto` and `__psJudgeSave` work without `?debug`, like `__game` and the other handles. Harmless on a phone.
- **Laugh line:** "You are my best friend now!" (spec: "best hockey friend"). Fine either way.
- `sw.js` FILES lists the 9 new PNGs; CACHE still `plushsquad-v0.7.8` (bump at release).

## 4. Layout matrix

Save: Jack L7, Canada open, 14 toys, all boosters, 8-9 hats, Feather Storm picked where noted. Checker: text and interactive objects outside `0..W x 0..H`, overlapping interactive objects.

| Screen | D1 SE | D2 14 | D3 iPad P | D4 iPad L | D5 14 L |
|---|---|---|---|---|---|
| Map Canada, event on | ✅ | ✅ | ✅ | ⚠️ B51 | ✅ |
| Map Hills, event on | ✅ | ✅ | ✅ | ⚠️ B51 | ✅ |
| Map, event off | ⚠️ B52 | ⚠️ B52 | ⚠️ B52 | ✅ icons | ✅ |
| Star Catch Canada | | ⚠️ B53 | | ⚠️ B53 | |
| Max duel (YOUR TURN) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sasquatch duel | ✅ | ✅ | ✅ | ✅ | ✅ |
| Wind-up + booster + HARD chip | ✅ | ✅ | ⚠️ B54 | ⚠️ B54 (touches) | ✅ |
| SAVE IT! shot (Jack, wide toy) | | ✅ | | ✅ | |
| Result panels Max / Sasquatch win + lose | ✅ | ✅ | ✅ | ✅ | ✅ |
| Title with toque (Jack, toy) | | ✅ | | ✅ | |
| Me, 9 hats | ✅ | ✅ | ⚠️ B11 | ✅ | ✅ |

The checker flags the move cards under the result panel as "overlapping" the panel buttons on every size. They sit under the panel's full-screen blocker, so taps cannot reach them (same as before this change).

## 5. Ideas for the Playwright suite

| # | Catches | Repro |
|---|---|---|
| T36 | B47 | `__save.data.stats.perfectSaves = 7; __psRebuild()`; after the new game is up expect `JSON.parse(localStorage.plushsquad_v1).stats.perfectSaves === 7` |
| T37 | Real SAVE IT! timing | `addInitScript`: `performance.now` and the rAF timestamp from a virtual clock (+40 ms per real frame). Force the slapshot, freeze the clock when the puck is 1080 ms out, `page.mouse.click` low on the canvas, expect hero -0 / rival -10. Same at 680 (good), no tap (miss), a click at y 20 (ignored) |
| T38 | Bounce-back win | Rival at 8 pep, `__psSaveAuto = 'perfect'`, real `playerMove`: expect `shown.won` and one result panel |
| T39 | B51 | 1024 x 768, `?halloween`, map: bounds of each tab container do not intersect the capsule button |
| T40 | B52 | 375 x 667, mocked December date, map: every visible tab name has `scaleX >= 0.85` |
| T41 | B54 | 768 x 1024, costume `toque`, force a wind-up: `saveChip.getBounds()` does not intersect the hat image |
| T42 | B53 | Catch scene with `{ world: 2 }`: every `pine` image bottom >= the top of the ground image |

## 6. Not tested

- **Real devices (IOS-xx):** SAVE IT! timing with a real finger and real touch latency (the 60-80 ms grace), the `north` track and new SFX by ear, haptics, the hiccup rule on a real app switch, the full-bleed tap zone below the iPhone top bar.
- **Online (ON-xx):** a real friend's toy / Jack from the Friends screen (simulated with `ftoy` / `fjack` data), cloud save carrying `perfectSaves` and the toque.
- Not in this part: Pond Hockey, comic, Canada quests and stickers, What's new 0.8.
- Not re-run (code unchanged): Studio and Star Catch rotation, booster across a rotation, mute and burst after a pause.
