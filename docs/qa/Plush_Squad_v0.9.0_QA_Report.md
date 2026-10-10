# Plush Squad v0.9.0 (comics for every world, #62) - QA Report

| | |
|---|---|
| **Build** | worktree `claude/v0.9-comics-engine` (PR #73), HEAD 4b2e177, VERSION / CACHE 0.9.0. Diff: `git diff origin/main...HEAD` (origin/main = 58d4959): `js/game.js`, `js/extra.js`, `sw.js`, `tests/comics09.spec.js` (new), `tests/comic-hockey.spec.js`, `tests/helpers.js`, `tests/map.spec.js`, `tests/v08.spec.js`, README, CHANGELOG. |
| **Date** | 5 Oct 2026 (Halloween ON by date; OFF checked with a mocked 20 Nov date) |
| **Spec** | `docs/gdd/0.9-world-comics.md` section 8 (items 1-18), section 9 (What's new). Owner changes: SKIP button in the comic; replay only from Album > COMICS (no tab replay, so item 9 is replaced); NEXT RIVAL after Sasquatch during Halloween stays Pumpkin Pete. Known and filed: B64 (#72, Canada comic landscape edge). |
| **Method** | Code review of the diff. One full `npm test` (private config, port 8765, 3 workers, my scripts ran beside it). The failing tests were run again on an `origin/main` copy (port 8766). Scripted play in headless Chromium (`?debug`, `setLagSmooth(5000, 33)` after every start). Rotations were real viewport changes. Duels ended through `finish(won)`. Cloud pull simulated in the page (what `Net.applyCloud` + `__psRebuild` do, no network). Layout checker + screenshots on D1-D5. No real device, no online accounts. |
| **Bug IDs** | Kept. New: B65-B68. Test ideas continue after T57. |

## 0. Summary

**Verdict: OK to merge from the QA side. No S1 / S2.** All 4 comics play from their triggers, survive rotation on every panel, respect bedtime and the daily limit, and go on to the right place. The Canada comic is unchanged object for object. The Album shelf is a clean 2 x 2 on D1-D5, with Spooky hidden out of season. Old saves (local and from the cloud) get the Hills cover. Every battle mode shows the right result panel, and REMATCH never opens a comic. 0 page errors in every run.

One S3: a new player who earns XP before the first TAP TO PLAY (own toy duel, a quest) never sees the Hills comic, and its Album cover stays locked forever (B65). Three small look / text issues (B66-B68).

| | |
|---|---|
| `npm test` | **120 / 127 pass.** The 7 failures also fail on `origin/main` 58d4959 on this machine (pre-existing, timing; see 2.7). All 15 `comics09` tests, the comic, album, result and map tests pass |
| Engine (items 1-2) | ✅ Canada identical to main (D2, D4); unknown id goes to the map |
| Triggers (items 3-8, 10) | ✅ 8 scenarios live. ❌ B65 |
| Comic behaviour (items 11-13) | ✅ taps, SKIP, rotation on 12 panels (4 comics x 3), bedtime, daily limit |
| Layout (items 14-16) | ✅ checker clean, 4 comics x 5 sizes, panels + title page. ⚠️ B66, B67 by eye. B64 still open |
| Album (items 16-17) | ✅ D1-D5, event on / off, locked / seen |
| v0.9 migration on an old cloud save | ✅ `comics.hills` set, `canada` kept, `space` not set |
| Every battle mode, win + lose | ✅ 12 / 12 on D2 |
| What's new 0.9 | ✅ D1, D5. ⚠️ B68 (text out of season) |
| Page errors | 0 |
| New | **B65 (S3), B66 (S4), B67 (S4), B68 (S4)** |

**Fix next:** B65 (make the Hills comic due by "seen", not by "never played", or unlock it once the player has any XP). B66-B68 can go with the next layout pass. Kondrat: B68 wording.

## 1. Fix verification (acceptance items, section 8)

| Item | Status | How checked |
|---|---|---|
| 1. Canada comic unchanged | ✅ | Comic `{ world: 'canada', panel: 3 }` on main and on the branch, D2 and D4: every object in the 3 panels (type, texture, text, x, y, scale, visible) and the title burst are the same; only the random text texture ids differ. `comic-hockey.spec.js` and `albumcomics.spec.js` pass (the tab-replay step was changed by the owner decision) |
| 2. Start by id, unknown id | ✅ | All 4 ids, suite + my scripts. `{ world: 'nope' }`: map, no error (suite) |
| 3. New save -> Hills comic -> Hills map | ✅ / ❌ | Fresh save, TAP TO PLAY: `comic hills`, LET'S GO: map world 0, `comics.hills` true (with and without `?halloween`, and in November). ❌ If the new player gets XP first, never (B65) |
| 4. Old save: no Hills comic, cover unlocked | ✅ | Suite; plus a v0.8 cloud save (below) |
| 5. Space once for everyone | ✅ | Save with `lastWorld 1`, `space` unset: TAP TO PLAY -> Space comic -> Space map; Hills tab, Space tab again: map only |
| 6. Hoot first clear -> NEXT RIVAL -> Space comic -> Robo-Bop | ✅ | Real `finish(true)` vs Hoot, NEXT RIVAL tapped: `comic space`, `then = battle { rival: 4 }`; rotated (D2 -> D5) during the comic and again on the title page; double SKIP, double LET'S GO: one Robo-Bop duel, music `battle` |
| 7. `?halloween` Spooky | ✅ | Spooky tab: Spooky comic -> Spooky map; open tab again: nothing. Old save with `lastWorld 3`: TAP TO PLAY -> Spooky comic. NEXT RIVAL after Sasquatch -> comic -> Pumpkin Pete (suite) |
| 8. November | ✅ | Mocked 20 Nov: no Spooky tab; `lastWorld 3` falls back to Canada, no comic, no error; cover hidden if unseen, shown and playable if seen (suite) |
| 9. Tab replay | n/a | Replaced by the owner decision. Checked: the open tab does nothing on all 4 worlds (comic-hockey, comics09, my run) |
| 10. No comic in or after a duel | ✅ | 12 result panels: REMATCH -> battle, BOSS -> boss screen, never `comic`. Code: `fade()` skips the redirect when the target is the scene's own `data0`; toy / friend / Kraken data have no `RIVALS[data.rival]` |
| 11. Taps and SKIP | ✅ | Tap finishes a panel, next tap goes on, SKIP -> title page and sets only that comic's flag (suite, all 4) |
| 12. Rotation | ✅ | Real viewport change D2 <-> D5 on panels 1, 2, 3 of all 4 comics (clock paused): same panel, same number of objects per panel before and after, flag unset. Title page: title again, LET'S GO works |
| 13. Bedtime / daily limit | ✅ | Bedtime 00:00 (suite). Daily limit reached on a fresh save: boot and `map` end on Bedtime, `comics` stays unset |
| 14. Layout | ✅ / ⚠️ | See section 4. Checker clean; burst words fit (`PILLOW HILLS!` 112-968 of 1080 on portrait). B66, B67 |
| 15. Bubbles < 42 characters | ✅ | Longest: "Why are YOU sorry? I fell on YOUR snow!" (39) |
| 16. Album 2 x 2 | ✅ | D1-D5, event on (4 covers) and off (3, the lone one centred); clear of the switch |
| 17. Locked shake / seen plays + DONE! | ✅ | Suite (`albumcomics`, `comics09` Spooky out of season) |
| 18. No page errors | ✅ | 0 in every run |
| What's new 0.9 (section 9) | ✅ / ⚠️ | 0.8 save: one row "Comics", fits D1 and D5. B68 |

## 2. Regression list results

### 2.1 Result screen in every battle mode (D2, real `finish(won)`)

| Mode | Win | Lose | Music in duel |
|---|---|---|---|
| Campaign: Moo | ✅ +55, NEXT RIVAL / MAP | ✅ +10, REMATCH / MAP | `battle` |
| Campaign boss: Prof. Hoot | ✅ +100, NEXT RIVAL / MAP (-> Space comic when unseen) | ✅ +10, REMATCH / MAP | `boss` |
| Own toy | ✅ +30, REMATCH / SQUAD | ✅ +10 | `battle` |
| Friend's toy | ✅ +35, REMATCH / FRIENDS | ✅ +10 | `battle` |
| Friend's Jack L5 | ✅ +35, REMATCH / FRIENDS | ✅ +10 | `battle` |
| Kraken | ✅ +60, BOSS / MAP | ✅ +10, BOSS / MAP | `boss` |

Every panel: XP saved, `calm` after the panel, checker clean, primary button never lands in `comic`, 0 page errors. Suite `result.spec.js` 9 / 9.

### 2.2 Rotation

| Case | Result |
|---|---|
| Between turns, mid-turn, final move, result panel | ✅ suite `rotate.spec.js` (B31, B35, B36, B37). B40 test fails on main too (2.7) |
| Comic: every panel of every comic, title page | ✅ (item 12) |
| Studio (blocked), Star Catch | code unchanged |

### 2.3 Bedtime / daily limit

✅ Comic, map and title go to Bedtime; the due comic stays due. Duel finish and REMATCH after bedtime: code unchanged (`newDuel` check), suite.

### 2.4 Boosters

Code unchanged. Suite (B30, B01) green. The comic now sits between NEXT RIVAL and the duel; the booster picker still opens on the Robo-Bop duel after LET'S GO.

### 2.5 Music

✅ Comic plays `calm`; the duel after the comic switches to `battle`; Hoot and Kraken `boss`. The new comic SFX (`snore`, `poof`, `beam`, `blip`, `tickle`, `boo`) exist in `audio.js` and ran without errors; not heard (headless, muted).

### 2.6 Map start world

| Case | Opens |
|---|---|
| Fresh player (event on / off) | Hills comic -> Hills map |
| `lastWorld 1`, Space comic unseen | Space comic -> Space map |
| `lastWorld 3`, event on, Spooky unseen | Spooky comic -> Spooky map |
| `lastWorld 3`, November (closed world) | Canada map, no comic |
| v0.8 cloud save with `lastWorld 2` | Canada map (Space comic waits for the Space tab) |

### 2.7 Suite failures (not caused by this PR)

7 tests fail on this machine, on the branch **and** on `origin/main` 58d4959: `music.spec.js:21`, `rotate.spec.js:153` (B40), `space.spec.js:65` x 5 (Sticker Album pages). Cause: `BASE_SAVE` in `tests/helpers.js` has no `ach`, so every boot gives the "First Win" and "Class Dismissed" sticker toasts. On a slow runner the toast is still alive when the test checks: B40 sees `__psToasts = 1`, the music test gets an `AudioNode.connect` error from the toast's `levelUp` on its swapped `OfflineAudioContext`, and the album test counts the toast (two texts) as a 28th sticker. CI on main passes (faster runner, retries). Fix idea (test only): add `ach: { first_win: 1, hoot: 1 }` to `BASE_SAVE`, or wait for `__psToasts === 0` in `boot()` (T61).

### 2.8 v0.9 save migration on an old cloud save

- Fresh v0.9 device (`mig09: 1`, no `comics`) pulls a v0.8 cloud save (`xp 5200`, all stars, `comics: { canada: true }`, no `mig09`), then the AccountScene rebuild: `comics = { canada: true, hills: true }`, `mig09: 1`, stored in localStorage. TAP TO PLAY: Canada map, no comic. ✅
- Kept login, `sync()` pulls a newer v0.8 cloud save while the map is open, `__psRebuild()` with a snapshot: same result, map restored. ✅
- Works because `rebuild()` stores the pulled save and `main()` runs the migration on load.

## 3. Bug status

**Still open:** B26 (unchanged), B64 (#72). B64 note: on D4 the Canada FWUMP! burst also sits 42 px past the left edge of panel 2, and the pine in panel 3 is cut by the screen edge on D4 / D5 (already in the B64 exception in `comics09`).

**Earlier open notes, re-checked:**
- Comic replay from the open map tab: removed (owner decision). ✅
- NEXT RIVAL after Sasquatch during Halloween: Pumpkin Pete, now through the Spooky comic when it is unseen (owner decision). ✅
- What's new body text 24 game px: unchanged.

### New

**B65 - New player who gets XP before TAP TO PLAY never gets the Pillow Hills comic; its Album cover stays locked** · S3 · `game.js` `COMIC_DUE.hills`, v0.9 migration (`mig09`), `extra.js` `COMICS` hint
- Steps: fresh save. On the title tap + ADD A TOY, make a toy, fight it from My Squad (or approve a quest in Parents: +20 XP). Then TAP TO PLAY. Open Album > COMICS.
- Expected: the Hills comic plays the first time the player opens Pillow Hills (spec 4: "autoplays for new players"), or at least its cover unlocks.
- Actual: `COMIC_DUE.hills` is "xp, wins and stars all 0", so after a toy duel (+30 XP) it is never due. The migration already set `mig09` on the first boot (with no XP then), so it never unlocks the cover either. The Album shows "??? / Play to unlock" for good, though the player has played. Seen live: toy duel +30 XP, TAP TO PLAY -> map (no comic), Album: `??? | Play to unlock` (`toyfirst_album.png`).
- Seen: live (toy path), code (quest path).
- Fix idea: make Hills due when `!comicSeen('hills')` and the player has no campaign stars yet (ignore toy / quest XP), or unlock the cover when the map opens with Hills not due. Change the hint to "Open Pillow Hills to unlock".

**B66 - Space comic panel 2: Jack's bubble covers Jack in the beam (portrait)** · S4 · `game.js` `COMIC_SCRIPTS.space.panels[1]` (bubble at `0.78, 0.5` in portrait)
- Steps: phone or iPad in portrait, watch the Space comic, panel 2 (BLIP!).
- Expected: Jack visible in the beam, bubble beside him.
- Actual: the bubble "Put me DOWN! ...Okay, this is fun." sits over Jack's top half on D1, D2, D3; on D3 it also runs onto the right panel border. On D3 Jack in the beam is small (about 70 css px), so most of him is covered.
- Seen: live, `D1_space_panels.png`, `D3_space_panels.png`.
- Fix idea: in portrait put the bubble at `fy 0.2` (top right, under the BLIP! line) or move Jack to `fx 0.35`; cap the bubble wrap at `r.w * 0.6`.

**B67 - Hills comic panel 1: the Zzz comes out of Jack's tail, not his head** · S4 · `game.js` `COMIC_SCRIPTS.hills.panels[0]` (`z.x = jack.x + w * 0.35; z.y = jack.y - h * 0.75`)
- Steps: watch the Hills comic, panel 1.
- Expected: Jack sleeps upside down, the Zzz floats up from his head.
- Actual: in `jack_upside.png` the head is at the bottom (snout bottom left) and the feet / tail at the top. The Zzz is placed at the top right of the picture, so it floats up from his feet and tail. The chief tester will see it.
- Seen: live, all sizes (`D3_hills_panels.png`, `D4_hills_panels.png`).
- Fix idea: start the Zzz near the head (`jack.x - w * 0.3, jack.y - h * 0.15`) and let it float up beside him, or use `jack_side` rotated.

**B68 - What's new 0.9 says "Watch all 4 comics" but out of season the Album shows 3** · S4 · `extra.js` `WHATS_NEW['0.9']`
- Steps: a 0.8 player opens v0.9 after 7 Nov, never saw the Spooky comic. What's new, then Album > COMICS.
- Expected: the notes match what the kid sees.
- Actual: "Watch all 4 comics in the Album." The Album shows 3 covers (Spooky hidden unless seen, owner decision 5). The 0.9 notes stay until 0.10.
- Seen: code + live Album in a mocked November (`D2_album_locked_nov.png`).
- Fix idea: "Jack lands in every world! Watch the comics again in the Album." [? Kondrat]

### Observations (no ID)

- **A tap on SKIP during the fade to Bedtime still marks the comic as seen.** `toTitle()` does not check `_leaving`; the window is about 370 ms (50 ms + fade). Very unlikely.
- **Toasts slide over the comic page** (sticker / gift toasts sit at the top and cover the caption and SKIP for about 3 s). Same as any scene; rare in real play, since result panels flush stickers first.
- **Spooky confetti lifespan** is computed once per build from `H`; fine, because a rotation rebuilds `main()`.
- **The open world tab gives no feedback** now (no sound, no shake). Fine for an accidental tap; a kid expecting the old replay sees nothing happen.
- Code review found no mode-only paths: the comic redirect in `fade()` only reacts to `RIVALS[data.rival]`; toy (-1, no `rival` key), friend (-2) and Kraken (-3) pass through; the REMATCH guard compares object identity with `data0`, which also holds after a result-panel rotation (the restored scene builds a new `data0` and REMATCH passes that same object).

## 4. Layout matrix

Save: 9000 XP, all campaign stars (12 rivals), all comics seen (and a second pass with only Canada seen), `?halloween` for 4 covers; plus a mocked 20 Nov run. Not the full "max content" save (14 toys, boosters, quests): those screens are not touched by this diff. Checker: text and interactive objects outside `0..W x 0..H`, overlapping interactive objects; bubbles vs their panel (14 px allowance), actors vs the screen.

| Screen | D1 SE | D2 14 | D3 iPad P | D4 iPad L | D5 14 L |
|---|---|---|---|---|---|
| Hills comic, panels + title | ⚠️ B67 | ⚠️ B67 | ⚠️ B67 | ⚠️ B67 | ⚠️ B67 |
| Space comic, panels + title | ⚠️ B66 | ⚠️ B66 | ⚠️ B66 | ✅ | ✅ |
| Canada comic, panels + title | ✅ | ✅ | ✅ | ⚠️ B64 | ⚠️ B64 |
| Spooky comic, panels + title | ✅ | ✅ | ✅ | ✅ | ✅ |
| Album COMICS, 4 seen | ✅ | ✅ | ✅ | ✅ | ✅ |
| Album COMICS, locked | ✅ | ✅ | ✅ | ✅ | ✅ |
| Album COMICS, November (3, lone centred) | | ✅ | | | ✅ |
| What's new 0.9 | ✅ | | | | ✅ |
| Result panels, 6 modes | | ✅ | | | |

Burst word widths on the title page (game px): `PILLOW HILLS!` 856 of 1080 (portrait), 793 of 1440 (D4), 793 of 2337 (D5); scale 1.0 everywhere (the `maxW` fit is not needed on these sizes).

## 5. Ideas for the Playwright suite

| # | Catches | Repro |
|---|---|---|
| T58 | B65 | Fresh save; push a toy, `battle { toy }`, `finish(true)`; `title.go()`: expect `comic` with `id === 'hills'` (or `comics.hills` true) |
| T59 | B66 | 390 x 844, `comic { world: 'space', panel: 2 }`, `finishPanel(false)`: panel 2 bubble bounds must not overlap the `jack_upside` bounds by more than 20 % |
| T60 | B67 | `comic { world: 'hills' }` panel 1: `zzz.y` start > `jack.y - jack.displayHeight * 0.5` (lower half, the head) |
| T61 | 2.7 flaky tests | `boot()` waits until `window.__psToasts === 0` (or `BASE_SAVE.ach` set); run `music`, `rotate B40`, `space` album with `--workers 3` beside another job |
| T62 | Old cloud save | Fresh boot, replace `__save.data` with a v0.8 save (no `mig09`, xp > 0), `__psRebuild({ key: 'title' })`: `comics.hills === true`, `comics.space` undefined |
| T63 | Real rotation per panel | For each comic and panel 0-2: `setViewportSize` swap, clock paused: same `cur`, same `panels[i].list.length`, flag unset |

## 6. Not tested

- **Real devices (IOS-xx):** the 4 comics with real fingers and real speed (auto-advance timing, readability of the bubbles at 2.7-3.5 s), the new SFX by ear (snore, beam, boo), the comic paper under the iOS 26 Home Screen strip, What's new text size on the kid's iPhone.
- **Online (ON-xx):** real login pulling an old v0.8 cloud save, two devices on one account with different `comics` flags (newer save wins, flags can go back), cloud push of `mig09`. Simulated in the page only (2.8).
- Real October-to-November switch while the app stays open (the event flag is read at build time).

## Follow-up (5 Oct 2026)

Fixed in PR #73 before merge: B65 (Hills comic due by "no campaign stars"), B68 (What's new wording). B66 and B67 moved to #75. B64 is #72.
