# Plush Squad v0.7.8 - QA Report

| | |
|---|---|
| **Build** | branch `local/v0.7.8`, commit f86e2ed, base `origin/main` 4be4d84 (v0.7.7 live). VERSION / CACHE 0.7.8. |
| **Date** | 4 Oct 2026 (Halloween ON) |
| **Method** | Code review of `git diff origin/main...HEAD` + `npm test` + scripted play in headless Chromium (`?debug`, lag smoothing off on every scene and after every rebuild, duels ended through the real `finish(won)` path, buttons pressed with real mouse events at their screen position) + layout checker on D1-D5 + screenshots (cards also at 3x pixel ratio). Rotations are real viewport changes (resize -> `__psTryRebuild`). No real iOS device, no online accounts. |
| **Bug IDs** | Kept. New bugs: B36, B37, B38, B39 (after B35). |

---

## 0. Summary

**Verdict: v0.7.8 is good to merge. No S1 / S2 found.** B31 and B35 are fixed in every battle mode, the move cards look right, and B30 / B33 / B34 still hold. 0 page errors in all runs.

| | |
|---|---|
| `npm test` | **28 / 28 pass** (14.1 min, 2 workers) |
| Fix verification (B31, B35, move cards) | **3 / 3 fixed** |
| v0.7.7 fixes re-checked (B30, B33, B34) | **3 / 3 still fixed** |
| Result screen, 6 modes x win/lose, + 2 rotations on the panel each | **12 / 12 pass**: XP given once, right buttons, calm music, primary button works after the rebuild |
| Regression list | all pass (section 2) |
| New bugs | **B36** (S4) held rotation skips the win celebration · **B37** (S3) sticker toasts lost on every rebuild · **B38** (S4) tap during the rotation debounce is lost · **B39** (S4) Warm Milk icon touches the card edge and title |
| Layout matrix (duel 9 cards, picker, result fresh + restored) | 0 issues on D1-D5 |

**Fix next:** B37 (one line, also makes B36 smaller), then B36. B38 / B39 can wait.

---

## 1. Fix verification

| ID | Result | How checked |
|---|---|---|
| **B31** Result panel follows a rotation | ✅ Fixed (live) | (a) Rotation on the panel: all 6 modes x win/lose on iPad landscape -> portrait -> landscape. After each rebuild: `battle` active, panel in the new layout (screenshots), same title / XP / level / notes / buttons, `shown` kept, `__psRotatePending` false, `PSAudio._want = 'calm'`, XP unchanged after 2 rebuilds. Then the primary button pressed on the restored panel: NEXT RIVAL -> rival+1, REMATCH -> same duel (toy, friend's toy, friend's Jack, campaign), BOSS -> Weekly Boss screen. Friend's toy went through the "Loading..." restart path and still restored the panel. (b) Rotation held during the final move (iPhone portrait -> landscape): game kept the old layout through the win animation, rebuilt right after the panel appeared, panel in landscape, XP +40 once. See B36 for what the kid misses. |
| **B35** No lost rewards when rotating during the win / lose animation | ✅ Fixed (live) | Rotate 300 ms after `finish(true)` and `finish(false)`: `__psRotatePending = true`, no rebuild until the panel, then rebuild into the restored panel. XP +40 (win) / +10 (lose) given once. Two rotations during the animation (portrait -> landscape -> portrait): no rebuild needed at the end, panel and full celebration shown, XP once. |
| **Move cards** (owner's device notes) | ✅ Fixed (live) | Lv6 Jack + Warm Milk (9 cards), on / off / used, screenshots at 3x on iPhone portrait, iPad portrait, iPhone landscape. Disabled and USED cards are opaque, no strips at the top; highlight only on active cards. Portrait icons now sit inside the card; all icons at least 3 px from the top edge (measured with `getBounds`). One exception: B39. |

---

## 2. Regression list results

### Result screen in every battle mode

Each run: duel started with `scene.start`, booster picker closed, `finish(won)`, panel read, then rotated twice on the panel, then the primary button pressed.

| Mode | Win | Lose | Track before | Buttons |
|---|---|---|---|---|
| Campaign (Timmy) | ✅ +40 XP | ✅ +10 XP | battle | NEXT RIVAL / MAP · REMATCH / MAP |
| Campaign boss (Prof. Hoot) | ✅ +100 XP | ✅ +10 XP | **boss** | NEXT RIVAL / MAP · REMATCH / MAP |
| Own toy | ✅ +30 XP | ✅ +10 XP | battle | REMATCH / SQUAD |
| Friend's toy | ✅ +35 XP | ✅ +10 XP | battle | REMATCH / FRIENDS |
| Friend's Jack | ✅ +35 XP | ✅ +10 XP | battle | REMATCH / FRIENDS |
| Kraken | ✅ +60 XP, "You hit the Kraken for 220!" | ✅ +10 XP | **boss** | **BOSS** / MAP (B33) |

0 page errors (only the blocked `supabase.co` requests in the console).

### Rotation

| Case | Result |
|---|---|
| Between turns | ✅ HP kept (84 / 121), YOUR TURN, not busy |
| Mid-turn | ✅ held (`pending = true`, same game), rebuilt at YOUR TURN, turn finished first (HP 70 / 101) |
| Final move | ✅ B31 (see section 1), ⚠️ B36 |
| Win / lose animation | ✅ B35 |
| Result panel | ✅ B31, 12 / 12 modes |
| Tap MAP, then rotate during the fade | ✅ lands on the map in the new layout |
| Rotate, then tap within ~300 ms | ⚠️ B38 |
| Studio | ✅ blocked, `pending = true` |
| Star Catch | ✅ rebuilt into Star Catch |

### Bedtime / daily limit

Bedtime set to 00:01 in the middle of a duel: ✅ the duel finished and the panel showed. ✅ New: rotation on that panel restored the panel (not cut by bedtime, `scene.res` is set). ✅ NEXT RIVAL from the restored panel -> Bedtime. ✅ Map -> Bedtime, Star Catch -> Bedtime.

### Boosters (B30)

Save `{fort:1, rocket:1}`: ✅ pick + BACK before a move -> refunded; ✅ the same again in the same session -> refunded; ✅ BACK after a move -> spent; ✅ pick, rotate before a move, BACK -> refunded; ✅ pick, move, rotate, BACK -> spent. Plus the 3 B30 suite tests.

### Music

✅ Track per rival: battle / boss as in the table above. ✅ B34 suite test (rotation between turns does not restart the track). ✅ Restored result panel: `calm`; after REMATCH from a restored panel: `battle` (or `boss` for Prof. Hoot). Mute and burst-after-pause: code unchanged since v0.7.6, covered by the suite test "music track follows the scene" only, not re-measured.

### Map start world

✅ `map.spec.js` (B04 fresh player in Pillow Hills with Halloween on, `lastWorld` remembered). Closed `lastWorld` and `?halloween` off: map code unchanged since v0.7.6, not re-run.

---

## 3. Bug status

**Fixed in v0.7.8:** B31, B35, owner's move-card notes (strips, icons too high; no B-ID).

**Still fixed (v0.7.7):** B30, B33, B34.

**Still open (code unchanged, not re-tested):** B32 (result notes small, 4 notes = ~27 px on a 1080-wide canvas, visible on the D5 restored panel), B05, B06, B07, B11, B13, B15, B16, B18, B19, B22, B23, B24, B26, B27, B28, B29.

**Reopened:** none.

### New

**B36 - A rotation held during the final move skips the win celebration** · S4 · `game.js` `Battle.result()` (last line)
- Steps: iPhone portrait, rival at 1 pep, tap a move, rotate the phone while the move plays. Best seen with a level-up (save at 1740 XP, beat Timmy).
- Expected: the kid sees the stars pop, the XP count up and "LEVEL UP!", then the layout changes.
- Actual: `result()` calls `__psTryRebuild` 60 ms after the panel appears. The rebuilt panel is drawn with `fresh = false`: stars already lit, "+40 XP" and "LEVEL 8" already set. Measured: without rotation 3 star dings, 1 XP tick, 1 `levelUp`, "LEVEL UP!" shown; with the held rotation 0 `levelUp`, 0 ticks, "LEVEL UP!" never shown (2 star dings only because headless runs at 2-3 fps; on a device the rebuild comes before the first ding). Rewards are correct.
- Seen: live.
- Fix idea: apply the held rotation after the celebration, e.g. `delayedCall(2600, ...)` (after the bar / LEVEL UP tween), or when the player taps a button. The panel stays in the old layout for ~2.5 s, which is what B31 accepted before.

**B37 - Sticker toasts are lost on every rebuild** · S3 · `extra.js` `onEvent('scene')` + `game.js` scene `create` hook
- Steps: first Kraken duel (earns "Kraken Fighter"), rotate during the final move (or within 2.5 s after the panel), then go to the map.
- Expected: the "NEW STICKER: Kraken Fighter · +1 capsule" toast shows on the panel or on the next screen.
- Actual: no toast anywhere (polled the battle and the map for 12 s). The sticker and the capsule are saved (`ach` count 2 -> 3). Cause: the rebuilt game's **Boot** scene fires `create` -> `emit('scene', {key:'boot'})` -> `flushToasts(boot)` empties `pending` and schedules the toasts on Boot's timer; Boot starts the next scene a moment later and its timers die. Not new in 0.7.8 (any rebuild with pending toasts did this), but B31 + the 60 ms held rebuild make it much more likely right after a duel, which is when stickers are earned.
- Seen: live (toast missing) + code (cause).
- Fix idea: in `extra.js` skip `boot` (`if (d.key === 'boot') return;` before the flush), like the music hook does. Same class as B24 (reward not announced).

**B38 - A tap during the rotation debounce is lost** · S4 · `game.js` `snapshot()` / `fade()`
- Steps: on the result panel, rotate, and within ~300 ms tap NEXT RIVAL (or REMATCH / MAP).
- Expected: the next duel (or the map) in the new layout.
- Actual: the debounced rebuild fires during the 320 ms fade-out; `snapshot()` sees an over battle with `shown` and restores the result panel again. The kid has to tap a second time. In 0.7.7 the same race sent the kid to `backKey`, so it is not worse, just different. Tapping first and rotating after works (fade's own rebuild).
- Seen: live (landed on the panel, `data0 = {rival: 0}` instead of rival 1).
- Fix idea: in `fade()` store the target (`scene._psTarget = {key, data}`) and let `snapshot()` return it when `sc._leaving`. Works for every scene, not only Battle.

**B39 - Warm Milk icon touches the card top and the title** · S4 · `game.js` `Battle.actionCard()` (portrait grid `V` layout)
- Steps: Lv6 Jack + Warm Milk booster (9 cards, 3 rows, card height 172) on iPhone or iPad portrait.
- Expected: the icon sits inside the card with a gap, like the other icons.
- Actual: the milk glass is 90 px tall (slot `isz` = 76): top 3 px from the card edge, bottom 7 px into the title's box ("Warm Milk"). At 3x the glass visibly touches the title. The other 8 icons are 8-22 px from the top and clear of the title.
- Seen: live (measured with `getBounds`, screenshots at 3x).
- Fix idea: cap the icon by height too (`ic.setScale(Math.min(scale, isz / ic.height))`) or tune `iconScale` for `milk`. Check the other booster moves (feathers, blizzard) at the same time.

---

## 4. Layout matrix

Max-content save: Lv6 Jack, 14 toys, all stickers, all 10 boosters x2, hard mode, first clear (4 result notes). Checker: visible text and interactive objects outside `0..W x 0..H`, interactive objects overlapping in the same layer. Only screens touched by this diff were re-run; the rest is unchanged since v0.7.6 (smoke tests in the suite still open every scene in portrait and landscape).

| Screen | D1 SE | D2 14 | D3 iPad P | D4 iPad L | D5 14 L |
|---|---|---|---|---|---|
| Booster picker (10) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Duel, 9 cards (on / off / used) | ✅ ⚠️ B39 | ✅ ⚠️ B39 | ✅ ⚠️ B39 | ✅ | ✅ |
| Result panel, fresh (4 notes) | ✅ * | ✅ * | ✅ * | ✅ * | ✅ * |
| Result panel, restored after rotation (new) | ✅ * | ✅ * | ✅ * | ✅ * | ✅ * |
| Other screens | as v0.7.6 report (B05, B06, B07, B11, B15, B16, B19 still open) | | | | |

\* fits; note size see B32.

---

## 5. Ideas for the Playwright suite

| # | Catches | Repro |
|---|---|---|
| T9 | B37 | Kraken duel (fresh save, no `ach.kraken`), `rival.hp = 1`, `playerMove`, `setViewportSize` to landscape during the move, wait for the rebuilt panel, `go(map)`, poll map texts 10 s for `/NEW STICKER/`. Today: never appears. |
| T10 | B36 | Save xp 1740, Timmy, wrap `PSAudio.levelUp` with a counter before the move, rotate during the winning move, wait 8 s after the panel. Expect counter >= 1 (or a "LEVEL UP!" text seen). |
| T11 | B38 | Win, wait for `shown`, `setViewportSize` (rotate), after 150 ms press NEXT RIVAL with `page.mouse`, wait for the rebuild. Expect battle `data0.rival === 1` and `!shown`. |
| T12 | B39 | 9 cards (Lv6 + milk) at 390x844: for each card, icon `getBounds().bottom` < title `getBounds().y` and icon top >= card top + 6. The current "move cards" test only checks the top edge, with unscaled `c.height`. |
| T13 | B31, all modes | Extend `rotate.spec.js` B31 "on the panel" to the 6 modes of `result.spec.js` (friend's toy exercises the Loading restart path). Press the primary button on the restored panel and check the target scene. |

---

## 6. Not tested

- **Real devices:** IOS-01..18, especially rotation at the end of a duel on iPhone (the 60 ms held rebuild, B36) and the opaque card colours on the real screen.
- **Online:** ON-01..16 (no test accounts). Kraken hit report and friend "beat" mail after a restored panel: code shows `emit('duel')` runs once in `result()` and not in the restore path, so no double report [?], not seen live.
- Music mute and burst-after-pause were not re-measured (code unchanged since v0.7.6).
