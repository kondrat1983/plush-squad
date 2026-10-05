# Plush Squad v0.8 parts 6+7 (comic, Pond Hockey, stickers, quests, What's new) + v0.8.0 release check - QA Report

| | |
|---|---|
| **Build** | worktree `claude/v0.8-finish`, HEAD b48cae5, VERSION / CACHE 0.8.0. Diff: `git diff origin/claude/v0.8-saveit...HEAD` (`js/game.js`, `js/extra.js`, `js/audio.js`, `sw.js`, `tests/comic-hockey.spec.js`, `tests/v08.spec.js`, `tests/helpers.js`, CI shards, docs). Earlier parts were QA'd in their own reports. |
| **Date** | 5 Oct 2026 (Halloween ON by date; OFF checked with a mocked 5 Dec date) |
| **Spec** | `docs/gdd/0.8-canada.md` from `origin/main`: 4b, 4c, 6, 7b, 8 (items 25-42), 9. Owner changes applied: Canada Toque (not a flag), Umbrella Hero counts full Tractor Beams only, What's new 0.8 has 8 lines. Issues #43 (B41), #45 (B44), #48 (B50). |
| **Method** | Code review of the diff, one full `npm test` (port 8765), scripted play in headless Chromium (`?debug`, `setLagSmooth(5000, 33)` after every start). Real mouse clicks, swipes and keys where it matters (comic taps, hockey controls, Studio file chooser, CANCEL / BACK). Duels ended through `finish(won)`. Rotations were real viewport changes. Layout checker + screenshots on D1-D5. No real device, no online accounts. |
| **Bug IDs** | Kept. New: B55-B59. |

## 0. Summary

**Verdict: v0.8.0 is OK to release from the QA side. No S1 / S2, no S3.** The suite is green (81 / 81). The comic shows once, from every entry point (map tab, NEXT RIVAL after the Mothership, a restored old save), survives rotation, respects bedtime and goes on to the right place. Pond Hockey unlocks after the first Bob win, all three controls work, XP / best / both stickers are right, rotation and BACK give no XP. Every battle mode shows the right result panel, win and lose. The three issues (#43, #48, #45) and the parts 4-5 bugs (B47, B51-B54) are fixed, with one gap: on a 768 x 1024 iPad in portrait a hat still covers the bottom of the title's level panel (B55). The other new findings are small looks issues. 0 page errors in every run.

| | |
|---|---|
| `npm test` | **81 / 81 pass** (43.4 min, one run, 2 workers; my scripts ran beside it) |
| Comic (items 25, 28-32) | ✅ D1-D5, real taps. ⚠️ B57, B58 (looks) |
| Pond Hockey (items 26, 33-36) | ✅ D1-D5, swipe / slow swipe / tap / keys, XP, best, Hat Trick, Slapshot Star, rotation, BACK, bedtime |
| Every battle mode, win + lose | ✅ 14 / 14 on D2 (Max, Sasquatch, Hoot, own toy, friend's toy, friend's Jack, Kraken) |
| What's new 0.8 for a 0.7 save | ✅ 8 rows fit on D1-D5, shown once per launch until DON'T SHOW AGAIN |
| Old v0.7.8 save -> 0.8.0 | ✅ stars kept, crown / owl hat / bat hat, gift toasts once, comic once |
| Studio CANCEL (#43) | ✅ live with a stalled model download. ⚠️ B56 |
| Title layout (#45) | ✅ phones with and without a hat. ❌ iPad 768 x 1024 with a hat (B55) |
| REMOVE (#48) | ✅ D1-D5 |
| Page errors | 0 in every run |
| New | **B55, B56, B57, B58, B59** (all S4) |

**Fix next:** B55 (the chief tester plays on an iPad; a one-number change). Then B56 (move CANCEL a little left). B57-B59 can wait for v0.8.1.

## 1. Fix verification

| ID | Status | How checked |
|---|---|---|
| B41 / #43 CANCEL while a photo is processed | ✅ | Real file chooser with `assets/cow.png`, every non-local request left hanging (a very slow phone). D2 and D5: real click on CANCEL goes back to TAKE A PHOTO (`busyState` false, `job` null). A second photo, then BACK: same. BACK again leaves to the title. Third photo, 90 s timer fired by hand: "Who is this? MYSTERY PLUSH?" (the photo is used as it is). 0 errors. ⚠️ CANCEL touches the mute button (B56) |
| B44 / #45 title portrait layout | ✅ phones / ❌ iPad 768 x 1024 | Measured hat top at the top of Jack's bob vs. panel bottom: D1 toque 113 px clear, D1 witch hat 104, D2 witch hat 146. D3 (768 x 1024): witch hat 78 px **over** the panel, toque 66, crown 51; no hat: 15 px clear. See B55 |
| B50 / #48 REMOVE button | ✅ | 230 x 90 button with the bin icon: top right in portrait, under the picture in landscape. No overlap with PLAY AS / DUEL! / ✕ on D1-D5 (checker + `lay_D1_squaddetail`, `lay_D5_squaddetail`). Confirm dialog: suite |
| B47 stats lost on rotation | ✅ | Suite T36-style test; `rebuild()` now calls `window.__save.store()`, and `__save` is set without `?debug` too |
| B51 Spooky tab over the capsule button (D4) | ✅ | `?halloween`, D4, worlds 0-3: checker clean |
| B52 "PILLOW HILLS" tiny with the event off | ✅ | Mocked 5 Dec: D1-D4 show icon-only tabs and the open tab's name at scale 1.0 (0.98 on D4); D5 shows all three names at 1.0 |
| B53 pines in Star Catch | ✅ | Catch with `{ world: 2 }`: 0 pines (D1, D3, D4) |
| B54 SAVE IT! chip over the hat | ✅ | Sasquatch duel with the toque, chip shown: on D3 / D4 it sits under the pep bar and the toque is fully visible (the chip touches the top of the hat's image box) (`b54_D3`) |

### Spec acceptance items 25-42

| Item | Status | How checked |
|---|---|---|
| 25. Rotate during the comic | ✅ | D2 -> D5 and D3 -> D4 mid panel 3: back on the same panel, `comics.canada` unset; D5 -> D2 and D4 -> D3 on the title page: title again, LET'S GO works, then set |
| 26. Rotate during Pond Hockey | ✅ | D2 -> D5, D3 -> D4 mid game (score 7): intro card, 45 s, XP and `bestHockey` unchanged. On the result panel: intro again, XP not given twice |
| 28. Shown once | ✅ | After LET'S GO: map tab, `title` -> `map {world 2}`, reload: no comic (D1-D5) |
| 29. SKIP then LET'S GO to the target | ✅ | From the map: map Canada. From NEXT RIVAL after the Mothership: the Max duel, music `north` |
| 30. Fast taps | ✅ | 10 real clicks in about 1 s on D1-D5: panels finish in order, title page, nothing lost |
| 31. Layout D1-D5 | ✅ / ⚠️ | Checker clean on every panel and the title page; bubble text 30-32 px. Looks: B57, B58 |
| 32. Bedtime | ✅ | Bedtime 00:00: boot, `map {world 2}`, `comic` and `hockey` all end on Bedtime; `comics` stays unset |
| 33. Hockey unlock | ✅ | Real Bob win: note "Bob challenges you to POND HOCKEY! Find it on the Canada map"; MAP -> Canada shows POND HOCKEY; Space still shows STAR CATCH |
| 34. 45 s, XP, best, stickers | ✅ | Score 21: +42 XP, `bestHockey` 21; score 20 with streak 3: NEW STICKER Hat Trick + Slapshot Star toasts on the result panel. Timer started at 45 |
| 35. Controls, BACK | ✅ | D1-D5: fast swipe, 1.5 s slow swipe, tap on the net, arrows + SPACE all shoot once; a tap on the hero does not; a double tap shoots once; BACK mid game: map, XP +0 |
| 36. Bedtime blocks the start | ✅ | See 32 |
| 40. Stickers in the album | ✅ | 27 / 27; pages: D1 2, D3 3, others 2; checker clean |
| 41. Quests | ✅ code + suite | 6 new quests in the pool, icons exist (`plate`, `hug`, `leaf`, `bird`, `books`, `shield`). ⚠️ text size in landscape (B59) |
| 42. What's new once, not for new players | ✅ | 0.7 save: shown on the title, again after a reload with CLOSE (by design), never with `seenVersion 0.8`. New players: code sets `seenVersion` |

## 2. Regression list results

### Result screen in every battle mode (D2, real `finish(won)`)

| Mode | Win | Lose | Music in duel |
|---|---|---|---|
| Campaign: Max | ✅ +130, NEXT RIVAL / MAP | ✅ +10, REMATCH / MAP | `north` |
| Campaign boss: Sasquatch | ✅ +220 first win, toque note, Big Friend sticker | ✅ +10 | `boss` |
| Campaign boss: Prof. Hoot | ✅ +100, Owl Hat note | ✅ +10 | `boss` |
| Own toy | ✅ +30, REMATCH / SQUAD | ✅ +10 | `battle` |
| Friend's toy | ✅ +35, REMATCH / FRIENDS | ✅ +10 | `battle` |
| Friend's Jack L5 | ✅ +35, REMATCH / FRIENDS | ✅ +10 | `battle` |
| Kraken | ✅ +60, BOSS / MAP | ✅ +10, BOSS / MAP | `boss` |
| Mothership first win | ✅ NEW WORLD: CANADA!, UFO Hat, NEXT RIVAL -> comic | | |
| Beaver Bob first win | ✅ Pond Hockey note, New rival: Mountie Bear | | |

Every panel: XP in the save = gain, `calm` after the panel, checker clean, 0 errors. Suite `result.spec.js` 9 / 9.

### Rotation

| Case | Result |
|---|---|
| Between turns, mid-turn, final move, result panel | ✅ suite `rotate.spec.js` 8 / 8 |
| Comic panel / comic title / Pond Hockey game / hockey result | ✅ (section 1) |
| Studio (blocked), Star Catch | code unchanged; `snapshot()` still sends Studio to the title |

### Bedtime / daily limit

✅ Comic, Pond Hockey, map and title all go to Bedtime. Duel finish and REMATCH after bedtime: code unchanged (suite).

### Boosters

✅ Suite (B30, B01). Fort picked in a Sasquatch duel on D1 / D3 / D4: chips fine.

### Music

✅ `north` / `boss` / `battle` per rival (above); comic and Pond Hockey play `calm`. New SFX (`babble`, `comicSting`) run without errors; not heard (headless, muted).

### Map start world

| Case | Opens |
|---|---|
| Old 0.7.8 save, `lastWorld 2` (old Spooky), Dragon Boss beaten | Canada -> comic first (expected: "from a restored save") |
| After the comic, reload | Canada map, no comic |
| Event on / off | tabs as in section 1 |

### Old v0.7.8 save -> 0.8.0 (D1-D5)

Save: 31 stars (Hills, Space with `dragonboss`, Spooky with `fang`), pumpkin / top hat / witch hat, `seenVersion 0.7`, no `mig08`.
- ✅ Stars kept (31 / 48 on the map), level 12.
- ✅ Costumes after the load: crown (Dragon Boss winner, no gift toast for it), owl hat and bat hat with "A GIFT: Owl Hat!" / "A GIFT: Bat Hat!" once, after What's new is closed.
- ✅ What's new 0.8, 8 rows (`old_D1_wn` ... `old_D5_wn`).
- ✅ TAP TO PLAY -> comic -> SKIP -> LET'S GO -> Canada map; reload: no comic, no gift toasts again.

## 3. Bug status

**Fixed by this change:** B41 (#43), B50 (#48), B47, B51, B52, B53, B54. B44 (#45) fixed on phones; the iPad gap is filed as B55.

**Still open (code unchanged):** B05, B07, B11, B13, B15, B16, B18, B19, B22, B23, B26, B27, B28, B29, B32, B38. Notes: B16 is worse with the new long quest texts (see B59); B05 (squad grid) and B19 (YES / NO) still flagged by the checker.

### New

**B55 - iPad portrait (768 x 1024): the hat covers the bottom of the title's level panel** · S4 · `game.js` `Title.create()` (`hMax = clamp(avail - 190 - 120 - (hatOn ? 230 : 0), 380, 800)`)
- Steps: iPad 9.7" / 10.2" in portrait (768 x 1024), wear the witch hat, toque or crown, open the title.
- Expected: logo, level panel and Jack with his hat do not touch (#45).
- Actual: on this screen `avail` is small, so `hMax` hits the 380 minimum and the gap is forced to 24. At the top of Jack's 34 px bob the hat is over the panel: witch hat 78 game px, toque 66, crown 51 (about 35-55 css px). It covers the star count. Without a hat Jack is 15 px clear. The suite checks 375 x 667, 390 x 844 and 820 x 1180, not 768 x 1024.
- Seen: live, `title_D3_witchhat.png`, `lay_D3_title_toque.png`.
- Fix idea: when `hatOn`, let `hMax` go down to about 300 on short portrait screens, or shrink the logo (`fs`) when `H < 1600`, or drop the bob to 16 px there. Add 768 x 1024 to the title test.

**B56 - Studio: CANCEL touches the mute button** · S4 · `game.js` `StudioScene.start()` (`button(this, W - 270, 80, 300, 100, 'CANCEL', ...)`)
- Steps: phone portrait, + ADD A TOY, take a photo, look at the top right while the magic runs.
- Expected: CANCEL and mute are two clear targets.
- Actual: CANCEL ends at x = W - 120, the mute circle starts at W - 126; with the button shadow they touch (`studio_D2_busy.png`). A kid aiming for CANCEL can mute the game instead.
- Seen: live (D2, D5).
- Fix idea: `W - 310` (about 40 px gap), or put CANCEL under the status line.

**B57 - Comic panel 2 on iPad landscape: Jack is fully hidden in the snow** · S4 · `game.js` `ComicScene.play()` panel 1 (snow ellipse `c.r.w * 0.62 x c.r.h * 0.36` at a fixed place)
- Steps: iPad landscape (1024 x 768), first trip to Canada, panel 2 (FWUMP!).
- Expected: the upside-down Jack sticks out of the snowbank (spec 7b).
- Actual: on the tall, narrow panel `jack_upside` is scaled by width and ends up small, and the snow ellipse covers all of him. The panel shows only a white circle and FWUMP! (`comic_D4_p0.png`, `comic_D4_title.png`). On D5 only his feet show, on D2 / D3 his back half shows.
- Seen: live.
- Fix idea: place and size the snow mound from Jack's displayed bounds (cover the top 50 % of `j.displayHeight` only), not from the panel size.

**B58 - Comic polish: wrong bubble tail, snow and pines outside the panels** · S4 · `game.js` `ComicScene.bubble()` / `play()`
- Steps: watch the comic on D1-D5.
- Expected: Max's line points at Max; nothing spills out of a panel (spec 7b: "a little overlap on the border is comic style").
- Actual: (1) "Sorry, eh! Welcome to Canada!" has its tail at the right end (`tailX = 1`), pointing at the pine where Sasquatch later peeks, not at Max (all sizes). (2) Snowflakes in panel 1 fall below the panel onto the paper (`lifespan = h / 120 s`, speed up to 160 px/s) (D4). (3) The pines in panel 1 stick out past the left border on landscape (D4, D5).
- Seen: live, `comic_D2_title.png`, `comic_D4_p0.png`, `comic_D5_title.png`.
- Fix idea: tail towards the speaker's x; `lifespan = c.r.h / 160 * 1000`; clamp actor x so the image stays inside the panel.

**B59 - The new long quest texts are tiny in landscape (Quests and Parents)** · S4 · `extra.js` `QuestsScene.create()` (`fit(..., w - 560)`), `ParentsScene.create()` (`fit(..., colW - 420)`)
- Steps: today's quests include "Make pancakes (or breakfast) with a grown-up" or "Say "please", "thank you" and "sorry" today"; open Quests on a phone in landscape, Parents on an iPad in landscape.
- Expected: readable text.
- Actual: Quests D4 / D5: the text is fitted to 18-20 game px (about 6.5 css px on an iPhone in landscape; this is B16, now worse). Parents D4: 10-11 game px (about 7.5 css px), `colW - 420` leaves only 240 px.
- Seen: live, `lay_D5_quests.png`, `lay_D4_parents.png`.
- Fix idea: wrap to two lines instead of `fit()` (word wrap at the same width, font 30); in Parents use `colW - 300`.

### Observations (no ID)

- **What's new text size:** the body text is 24 game px, about 8 css px on an iPhone (D1, D5). Same format as 0.7, so not new. On D3 the card fills the screen (top 13 px). Belongs with B26 [?].
- **Comic replay by tapping the open Canada tab:** an accidental tap opens the comic; getting out takes two taps (SKIP, LET'S GO). The spec marked this "[? Kondrat]". There is no BACK on the comic.
- **SKIP does not set `comics.canada`, only LET'S GO does.** The spec says "LET'S GO or SKIP". SKIP leads to the title page where LET'S GO is the only way out, so the result is the same unless the app is closed on that page.
- **Pond Hockey clock:** `dt` is capped at 50 ms, so below 20 fps the 45 s last longer. Fine on iPhone / iPad.
- **Studio type picker:** after the 90 s timeout, BACK does nothing on "Who is this?" (`busyState` stays true until the toy is made). Same as before this change.
- **Comic data table:** the spec asks for a `COMICS` data table for future worlds; the Canada script is hard-coded in `play()`. No problem now; needed before a second comic.
- **iPad letterbox colour:** on D3 the strips beside the canvas take the colour of the bottom of the screen (ice blue in Pond Hockey, next to the dark sky). Same mechanism as in other scenes (`tintPage`).
- Code review found no mode-only paths in the diff: the comic redirect in `fade()` only reacts to `RIVALS[data.rival]` with a Canada world, so toy (-1), friend (-2) and Kraken (-3) duels pass through.

## 4. Layout matrix

Save: Jack L9, 44 / 48 stars, 14 toys, 27 stickers, all boosters, 8 hats (toque on), 5 pending quests (incl. the longest new texts). Checker: text and interactive objects outside `0..W x 0..H`, overlapping interactive objects. Toasts sliding in from above and modal dims were ignored.

| Screen | D1 SE | D2 14 | D3 iPad P | D4 iPad L | D5 14 L |
|---|---|---|---|---|---|
| Title, toque | ✅ | ✅ | ❌ B55 | ✅ | ✅ |
| Title, no hat | ✅ | ✅ | ✅ | ✅ | ✅ |
| What's new 0.8 (8 rows) | ✅ | ✅ | ✅ (full height) | ✅ | ✅ |
| Map 0-3, event on | ✅ | ✅ | ✅ | ✅ | ✅ |
| Map, event off | ✅ icons | ✅ icons | ✅ icons | ✅ icons | ✅ names |
| Comic panels + title | ✅ | ✅ | ✅ | ⚠️ B57, B58 | ⚠️ B58 |
| Pond Hockey intro / play / result | ✅ | ✅ | ✅ | ✅ | ✅ |
| Studio processing (CANCEL) | | ⚠️ B56 | | | ⚠️ B56 |
| My Squad + toy details (REMOVE) | ⚠️ B05 | ✅ | ⚠️ B05 | ⚠️ B05 | ✅ |
| Me, 8 hats | ✅ | ✅ | (B11) | ✅ | ✅ |
| Album, 27 stickers | ✅ 2 pages | ✅ | ✅ 3 pages | ✅ | ✅ |
| Star Catch | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quests | ✅ | ✅ | ✅ | ⚠️ B59 | ⚠️ B59 / B16 |
| Parents | ⚠️ B19 | ⚠️ B19 | ⚠️ B15, B19 | ⚠️ B59, B19 | ⚠️ B19 |
| Sasquatch duel, chip + toque | ✅ | | ✅ | ✅ | |

## 5. Ideas for the Playwright suite

| # | Catches | Repro |
|---|---|---|
| T43 | B55 | Add `{ width: 768, height: 1024 }` with `costume: 'witchhat'` to the title test: hat top minus 34 > panel bottom |
| T44 | B56 | Studio, `s.busyState = true`, build the processing layer (or `start()` with a stubbed `pickFile`): CANCEL bounds right edge < mute circle left edge - 20 |
| T45 | B57 | 1024 x 768, `comic` panel 1 played instantly: the snow ellipse must not contain all of `jack_upside`'s bounds |
| T46 | B59 | Force `quests.list` to `pancakes`, 844 x 390: every quest text `scaleX * fontSize >= 26` |
| T47 | Comic once from NEXT RIVAL | Mothership `finish(true)`, click NEXT RIVAL: `comic` active with `then.key === 'battle'`; LET'S GO: battle with `R.id === 'moose'` |
| T48 | Hockey controls | `page.mouse` swipe from below the puck upward: `shots` +1; tap on the hero: +0; SPACE: +1 |
| T49 | Hockey stickers | `score = 20; bestStreak = 3; left = 0.2`: `ach.hattrick`, `ach.slapshot` set and both toasts seen |
| T50 | Comic and hockey under bedtime | `parent.bedtime = '00:00'`, start `comic` / `hockey`: Bedtime active, `comics.canada` unset |

## 6. Not tested

- **Real devices (IOS-xx):** comic and hockey with real fingers (swipe feel, tap zone over the net), the comic sounds by ear, the What's new text size on a real iPhone, the hat on the title on the kid's own iPad model, Studio CANCEL with a real slow model download on an old iPhone, Home Screen app full-bleed for the comic paper.
- **Online (ON-xx):** cloud save carrying `comics`, `bestHockey`, `hockeyStreak`; Studio after login.
- Real 45 s Pond Hockey games at full speed (headless runs at 2-3 fps; the end was reached by shortening `left`). Real 90 s Studio timeout (the timer was fired by hand).
