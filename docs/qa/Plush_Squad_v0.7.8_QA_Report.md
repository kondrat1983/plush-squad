# Plush Squad v0.7.8 - QA Report

| | |
|---|---|
| **Build** | branch `local/v0.7.8`, commit f86e2ed, base `origin/main` 4be4d84 (v0.7.7 live). VERSION / CACHE 0.7.8. |
| **Date** | 4 Oct 2026 (Halloween ON) |
| **Method** | Code review of `git diff origin/main...HEAD` + `npm test` + scripted play in headless Chromium (`?debug`, lag smoothing off on every scene and after every rebuild, duels ended through the real `finish(won)` path, buttons pressed with real mouse events at their screen position) + layout checker on D1-D5 + screenshots (cards also at 3x pixel ratio). Rotations are real viewport changes (resize -> `__psTryRebuild`). No real iOS device, no online accounts. |
| **Bug IDs** | Kept. New bugs: B36, B37, B38, B39 (after B35). |

---

## Second pass (commit ceecf83)

| | |
|---|---|
| **Build** | branch `claude/v0.7.8-hotfix`, HEAD ceecf83, base `origin/main` b57463f (v0.7.7 live). Changes since the first pass: `git diff a9838d9..HEAD` (`js/extra.js`, `js/game.js`, new tests). |
| **Date** | 4 Oct 2026 |
| **Method** | Code review of the diff (rotation hold: `celebrating`, `__psToasts`, create-hook retry; sticker queue in `flushToasts`) + `npm test` + scripted play in headless Chromium (`?debug`, lag smoothing off, duels ended through `finish(won)` or a real final move, buttons pressed with mouse events, rotations as real viewport changes). State of `celebrating` / `__psToasts` / `__psRotatePending` polled during the celebration and around every rebuild. No real device, no online accounts. |
| **Bug IDs** | Kept. New: B40. |

**Verdict: good to merge. No S1 / S2.** B36, B37 and B39 are fixed. The rotation hold always ended in every live run (0 stuck, 0 lost toasts, 0 repeated toasts, 0 page errors). One new S3 (B40): a toast drawn on a screen the kid has already left keeps the toast counter at 1, so rotations wait until the next screen change. Only reachable online (gift / sticker "sent!" toast after a slow `Net.send`); reproduced live by calling the toast on a stopped scene.

| | |
|---|---|
| `npm test` | **33 / 33 pass** (14.7 min, 2 workers), incl. the 5 new tests (B36, B37 x3, B39) |
| Fix verification (B36, B37, B39) | **3 / 3 fixed** |
| Result screen, 6 modes x win/lose, 2 rotations on the panel + primary button | **12 / 12 pass**: XP once, right buttons, `calm` on the panel, `battle` / `boss` after REMATCH |
| Rotation / bedtime / boosters | all pass (table below) |
| Can the hold get stuck? | `celebrating`: no (timer, or reset in `create()`, and only read while Battle is active). Pending: retried at YOUR TURN, after the celebration, after the last toast, on every new scene, and by `fade()`. `__psToasts`: yes, see **B40** |
| New bugs | **B40** (S3) toast counter leaks when the toast's scene is already stopped |
| Layout (move cards, 9 cards, milk / feathers / blizzard) | 0 issues on D1-D5 |

**Fix next:** B40 (two-line guard). B38 now has a second trigger (see below), still S4.

### Fix verification (second pass)

| ID | Result | How checked |
|---|---|---|
| **B36** Held rotation skips the celebration | ✅ Fixed (live) | Save at 1740 XP, Timmy, iPhone portrait, rotate during the winning move (and on a lose via `finish(false)`). `PSAudio.levelUp`, `starDing`, `tick` wrapped. Win: 3 star dings, XP count, `levelUp` played, "LEVEL UP!" created ~3.4 s after the panel, rebuild ~5.3 s after the panel (after "LEVEL UP!" was gone in 2 of 3 runs). Lose: hold 3300 ms, rebuild 4.5-5.3 s after the panel. XP +40 / +10 once, panel restored in landscape, `pending` false, `__psToasts` 0. Leaving the panel during the hold: MAP tapped 0.7 s after the rotation, landed on the map in the new layout (orientation change: `fade()` rebuild; aspect-only change 1024x768 -> 1366x768: the new create-hook retry rebuilt the map). Note: the hold ends 100 ms (game time) after the "LEVEL UP!" fade-out. At 2 fps in headless the end of the fade was cut in about half the runs (frame steps add up); on a 60 fps device it should fit [?]. A sturdier way is to end the hold in the fade's `onComplete`. |
| **B37** Sticker toasts lost on every rebuild | ✅ Fixed (live) | (a) Kraken win with only the Kraken sticker free, rotate 2 s after the panel: celebration held, then the "Kraken Fighter" toast played in full (`__psToasts` = 1, `pending` = 1), rebuild right after it, restored panel in portrait, toast **not** shown again in 70 s. (b) Rotation during the final move with the sticker toast landing in the same frame as the rebuild (happens at 2 fps): toast cut on the old game, shown again on the new one (the 450 ms "seen" timer had not run) -> not lost. (c) Direct probe: `__psToasts` 1 while a toast is up, 0 after it, rotation blocked meanwhile. (d) The 4 suite tests. Bonus: the boot-scene skip also fixes stickers earned at app start, which were scheduled on Boot and lost before. |
| **B39** Warm Milk icon too tall | ✅ Fixed (live) | Lv6 Jack + milk / feathers / blizzard, 9 cards, D1, D2, D3, D5 (+ D4 milk), `getBounds` on every card: milk icon now 76-82 px tall (was 90), top 11-14 px below the card edge, never into the title box (gap 0-4 px in portrait, same as snow / dumpling / comet; the cards' idle pulse moves these by a few px). Screenshot at 3x on D2: milk glass sits like the other icons. |

### Regression list (second pass)

| Item | Result |
|---|---|
| Result screen, campaign Timmy | ✅ win +40 NEXT RIVAL -> rival 1 · lose +10 REMATCH |
| Campaign boss (Prof. Hoot) | ✅ win +100 · lose +10, `boss` before, `boss` after REMATCH |
| Own toy | ✅ +30 / +10, REMATCH / SQUAD |
| Friend's toy | ✅ +35 / +10, REMATCH / FRIENDS (Loading restart path) |
| Friend's Jack | ✅ +35 / +10, REMATCH / FRIENDS |
| Kraken | ✅ +60 "hit the Kraken for 220" / +10, BOSS -> Weekly Boss screen |
| Rotation between turns | ✅ HP kept (89 / 125), YOUR TURN |
| Rotation mid-turn | ✅ held (same game, pending), rebuilt at YOUR TURN (76 / 106) |
| Final move / result panel | ✅ B36 (above), 12 / 12 modes |
| Studio | ✅ blocked, pending; leaving to Star Catch rebuilt (create-hook retry) |
| Star Catch | ✅ rebuilt into Star Catch |
| Bedtime | ✅ duel finished, rotation on the panel restored the panel, NEXT RIVAL -> Bedtime, Map -> Bedtime, Catch -> Bedtime |
| Boosters | ✅ BACK before a move refunded (twice), BACK after a move spent, rotate before a move + BACK refunded, move + rotate + BACK spent |
| Music | ✅ per mode as above; `music.spec.js` (track per scene, no restart on rotation) passes. Mute / burst after pause: code unchanged, not re-measured |
| Map start world | ✅ `map.spec.js` passes; code unchanged |

### New

**B40 - A toast on a screen the kid already left holds every rotation until the next screen change** · S3 · `extra.js` `toast()` (+ callers in `net.js` `FriendsScene.gift()` / `sticker()`)
- Steps: Friends, open a friend's gift overlay, tap SEND A CAPSULE on a slow network, tap CLOSE and BACK before the answer comes. When `Net.send` returns, `X().toast(this, ...)` runs on the stopped Friends scene. Then rotate the phone on the map.
- Expected: the map rebuilds in the new layout.
- Actual: `toast()` adds the container to the stopped scene; its tween never runs, so the container is never destroyed and `window.__psToasts` stays 1. `__psBlockRotate()` is true, the rotation stays pending, and the create-hook retry is blocked too. It clears only when the kid navigates (`fade()` rebuilds on an orientation change without asking the block) or opens Friends again, where the stale "Capsule sent!" toast then slides in out of context. An aspect-only change (no portrait flip) stays held until Friends is opened again.
- Seen: live with a stand-in: `PSExtra.toast(<stopped squad scene>, PS, ...)` on the map -> `__psToasts` 1 after 6 s, rotated to portrait, not rebuilt after 8 s (`pending` true); `scene.start('squad')` -> stale toast shown, then counter 0 and rebuild. The real trigger needs online accounts (code only).
- Fix idea: in `toast()`, `if (!scene.sys || !scene.sys.isActive()) return null;` before anything is drawn (the mail popup already checks this; the net.js callers do not use the return value). Or also release the count on the scene's `shutdown`.

**B38 update:** the held rotation is now also released by timers (end of the celebration, end of the last toast). If one fires inside the 320 ms fade after NEXT RIVAL / REMATCH / MAP, `snapshot()` sees the over battle with `shown` and restores the panel, so the tap is lost. Code only (at 2 fps the fade ends in one frame, so it could not be timed live). Same fix as before: let `snapshot()` use the fade target when `_leaving`.

### Not tested (second pass)

- Real devices (IOS-xx): the 3.3-4.1 s hold on the result panel and the toast hold at 60 fps on iPhone / iPad; how long the old layout feels to a kid.
- Online (ON-xx): the real B40 trigger (gift / sticker sent after leaving Friends), mail toast holding a rotation.
- Mute and burst after a pause (code unchanged).

---

# First pass (commit f86e2ed)

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

**Second pass status:** B36, B37, B39 **fixed** (second pass). B38 **still open** (owner: later; second trigger, see Second pass). **New:** B40 (S3). Everything else below unchanged.

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
| T14 | B40 | On the map: `PSExtra.toast(__game.scene.getScene('squad'), PS, 'star', 'x', 'y')` (PS from a test plugin pushed into `PSPlugins`), wait 6 s, expect `__psToasts` 0; then rotate and expect a rebuild within 5 s. Today: counter stays 1, no rebuild. |
| T15 | B36 margin | Level-up save, rotate during the winning move, record when the "LEVEL UP!" text is destroyed vs the rebuild; expect the text gone first. |
| T13 | B31, all modes | Extend `rotate.spec.js` B31 "on the panel" to the 6 modes of `result.spec.js` (friend's toy exercises the Loading restart path). Press the primary button on the restored panel and check the target scene. |

---

## 6. Not tested

- **Real devices:** IOS-01..18, especially rotation at the end of a duel on iPhone (the 60 ms held rebuild, B36) and the opaque card colours on the real screen.
- **Online:** ON-01..16 (no test accounts). Kraken hit report and friend "beat" mail after a restored panel: code shows `emit('duel')` runs once in `result()` and not in the restore path, so no double report [?], not seen live.
- Music mute and burst-after-pause were not re-measured (code unchanged since v0.7.6).
