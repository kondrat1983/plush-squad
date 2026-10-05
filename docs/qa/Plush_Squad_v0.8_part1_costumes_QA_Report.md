# Plush Squad v0.8 part 1/7 (boss costumes + save migration) - QA Report

| | |
|---|---|
| **Build** | branch `claude/v0.8-costumes`, HEAD 9e9a275, PR #42. Diff: `git diff origin/claude/v0.8...HEAD` (`js/game.js`, `js/extra.js`, new `tests/costumes.spec.js`). Merge base fd8cf9f; `origin/claude/v0.8` has moved on to c63041f (design doc + CI timeout only), merge is clean. VERSION / CACHE still 0.7.8 (not a release). |
| **Date** | 4 Oct 2026 (Halloween ON; OFF checked with a mocked December date) |
| **Method** | Code review of the diff against `docs/gdd/0.8-space-rework.md` 6.2 / 6.4 / section 8 items 20-28 and `decisions.md` + `npm test` + scripted play in headless Chromium (`?debug`, lag smoothing off on every scene and after every rebuild, duels ended through `finish(won)`, hat cards and panel buttons pressed with real mouse events, rotations as real viewport changes) + seeded old saves, reloads and a simulated cloud pull (`localStorage` replaced, then `__psRebuild`) + layout checker on D1-D5 + screenshots. No real device, no online accounts. |
| **Bug IDs** | Kept. New: B42, B43 (after B41). |

## 0. Summary

**Verdict: good to merge into `claude/v0.8`. No S1 / S2.** The rewards, the Superstar crown and the migration all work, and nothing is ever taken away. Migration results: 10 seeded saves, each loaded 3 times; one cloud pull; 0 page errors in every run. Two new S4 findings, both about telling the kid about a hat. The crown hint in the Superstar sticker text is too small to read (B42). Players who get the Owl Hat / Bat Hat / Royal Crown from the migration are never told (B43).

| | |
|---|---|
| `npm test` | **42 / 43 pass** (17.7 min, 2 workers). The 9 new costume tests pass. 1 failure: `duel.spec.js` "B39: tall move icons" (`_pick is not a function`) while my own browser scripts were loading the machine. It passed 2 / 2 on a rerun, and the diff does not touch that code: a flaky test, not a game bug (see section 5) |
| Rewards (items 20, 21) | ✅ Hoot -> Owl Hat, Space boss -> UFO Hat, Fang -> Bat Hat (not crown), each announced once on the panel. Not given on a lose or on a second win |
| Superstar -> Royal Crown | ✅ through a real duel (23 stars, 3rd star on the Space boss) and through `checkAch`. ⚠️ announcement unreadable (B42) |
| Migration (items 24-28) | ✅ 10 seeded saves, 3 loads each: same result every time, no doubles, no extra capsules. ⚠️ silent (B43) |
| Cloud pull (rebuild) | ✅ old save without `mig08` pulled into a running v0.8 game: crown + owl + bat granted, `mig08` stored. v0.8 cloud save (`mig08`, Space boss stars): no crown |
| Me, 0 / 3 / 7 hats, D1-D5, logged out + faked logged in | ✅ 0 off-screen, 0 overlapping interactive objects, tap-to-wear and a quick double tap work. B11 (iPad portrait text vs hat row) still there, also with the logged-in "Friend code" line |
| Hats on Jack and a toy hero | ✅ title, Me, duel (owl tinted `8fe39a` at every site; UFO, crown, bat checked by eye) |
| Result screen, 6 modes x win / lose | ✅ 12 / 12 with Jack + 6 with a toy hero: right buttons, XP saved once, `boss` / `battle` -> `calm`, 0 errors |
| Rotation on the panel (Hoot win with the costume note) | ✅ 2 rebuilds, the same 4 notes, XP and hat given once |

**Fix next:** B42 (shorter sticker text, one line). B43 needs Kondrat's call: the design proposed a toast, and the decision log does not say.

## 1. Fix verification

No B-IDs were fixed in this PR. Items from the design doc:

| Item | Status | How checked |
|---|---|---|
| G35: crown shown to Dragon Boss winners but never stored | ✅ Fixed | The Me filter no longer has the `stars.dragonboss` rule. Old save with `stars.dragonboss: 3`, no `costumes.crown`: after load `costumes.crown === true`, and `localStorage` holds it after the first store |
| B24: Royal Crown not announced | ✅ Fixed in substance | The Dragon Boss no longer hands out a silent crown. The Space boss win now shows "New costume: UFO Hat! Put it on in Me". The crown now comes only from the Superstar sticker, whose toast says "Wins the Royal Crown!". That text is too small to read, see B42 |
| 20 / 21 rewards | ✅ | Real `finish(true)` vs Hoot, Space boss, Fang (`?halloween`). Notes as expected, `costumes.<id> = true`. Fang gives `bat`; `crown` stays falsy |
| 22 Me rows, tap to wear | ✅ | Section 4. Phones in portrait wrap into 5 + 3 (cards 150). iPad portrait and both landscapes use one row (iPad P cards 105, others 150). Real mouse click on the bat card sets `costume = 'bat'` in memory and in `localStorage`; a double tap on the crown sets `crown`, and Me stays open |
| 24 old full save | ✅ | 24 stars, `ach {polandball, dragon, allstars}`: crown + owl hat, ★ 24 unchanged, stickers kept, no `ufohat` |
| 25 old save wearing the crown | ✅ | `costume: 'crown'` kept; crown seen on the title, in Me and on Jack in the duel (screenshots) |
| 27 crown from Fang, no Space boss stars | ✅ | crown + pumpkin kept, bat added (`stars.fang: 2`) |
| 28 reload twice | ✅ | All 10 saves: state after load 2 and load 3 is identical to load 1 (costumes, `caps`, `ach`, stars). Sticker toasts only on the first load (stickers newly earned by `checkAch`, which is old behaviour) |
| Fresh player | ✅ | Empty `localStorage`: `mig08 = 1`, stored on the first save. A v0.8 player with `mig08` who beats the Space boss gets the UFO Hat and never the crown, even after a reload (suite + live) |
| Owl hat = small green owl (decision) | ✅ | Tint `0x8fe39a` on title / Me avatar / Me card / duel (`tintTopLeft` checked at each site). The tint also turns the cap and eyes green-ish. It reads as a green owl [?] |
| Bat hat only winnable in the event | ✅ | December mock: `fang` not in `__RIVALS`. The migrated bat hat still shows in Me and in a duel (`bat` texture always loaded) |
| Empty hint | ✅ | Event off: "Beat Professor Hoot to win the Owl Hat!" fits (D1). Event on: the Halloween hint, as before |

## 2. Regression list results

### Result screen in every battle mode (Jack wearing the owl hat, D2)

| Mode | Win | Lose | Notes |
|---|---|---|---|
| Campaign (Timmy) | ✅ NEXT RIVAL / MAP, +40 | ✅ REMATCH / MAP, +10 | `battle` -> `calm` |
| Campaign boss (Prof. Hoot) | ✅ +100 (+120 first clear), "New costume: Owl Hat!" once | ✅ no hat | `boss` -> `calm` |
| Own toy | ✅ REMATCH / SQUAD, +30 | ✅ | |
| Friend's toy | ✅ REMATCH / FRIENDS, +35 (Loading... restart path) | ✅ | |
| Friend's Jack (L5) | ✅ REMATCH / FRIENDS, +35 | ✅ | |
| Kraken | ✅ BOSS / MAP, +60, hit note | ✅ BOSS / MAP | `boss` -> `calm` |
| Toy hero (campaign, friend's Jack, Kraken) | ✅ | ✅ | owl hat on the toy, same results |
| Fang (`?halloween`) | ✅ "New costume: Bat Hat!" | not run | |
| Space boss, Superstar (D2 + D5) | ✅ crown + sticker toast | not run | ⚠️ B42 |

0 page errors. Suite `result.spec.js` 9 / 9.

Note on B32: a first Hoot win now always has 4 notes (first win, NEW WORLD, capsule, costume). That means 27 px notes on every new player's Hoot win, not only on the rare max case. They fit (D5 screenshot); see B32.

### Rotation

| Case | Result |
|---|---|
| Result panel (Hoot win with the costume note), D2 -> D5 -> D2 | ✅ rebuilt twice, same 4 notes, XP +120 once, `owlhat` set once |
| Final move / win animation (Superstar duel, rotate 300 ms after `finish`) | ✅ sticker toast shown before the rebuild; crown, sticker and XP once |
| Me with 8 cards, D5 -> D2 -> D5 | ✅ Me restored in the new layout, layout checker clean |
| Between turns, mid-turn hold | ✅ suite (`rotate.spec.js` 8 / 8, B34 music test) |
| Studio (blocked), Star Catch | not re-run (code unchanged since v0.7.8) |

### Bedtime / daily limit

✅ Bedtime 00:01 set in the middle of a Hoot duel: the duel finished, the panel showed with the costume note, and the hat was saved. ✅ NEXT RIVAL (real click) -> Bedtime. ✅ Me -> Bedtime.

### Boosters

✅ Suite B30 x3 (refund before a move, twice in one session, spent after a move). Code unchanged, booster rotation not re-run.

### Music

✅ Track per rival in the mode run above (`boss` for Hoot and the Kraken, `battle` otherwise, `calm` on the panel). ✅ Suite music tests 3 / 3. Mute and burst after a pause were not re-measured (code unchanged).

### Map start world

✅ Suite `map.spec.js` 2 / 2 (fresh player in Pillow Hills with Halloween on, `lastWorld`). Map code unchanged.

## 3. Bug status

**Fixed by this change:** G35 (crown never stored), B24 (crown not announced; the remaining readability issue is B42).

**Still open (code unchanged):** B11: iPad portrait (D3), the hat row overlaps the "Log in to save..." text by about 22 px with 8 cards. It also overlaps the logged-in "Friend code: ..." line (screenshot `me_D3_h7_login`), the same cause. With 1-4 cards it is worse (150 px cards). Also still open: B05, B06, B07, B13, B15, B16, B18, B19, B22, B23, B26, B27, B28, B29, B32, B38, B41.

**Reopened:** none.

### New

**B42 - "Wins the Royal Crown!" is too small to read** · S4 · `extra.js` `ACH` (`allstars.desc`), shown by `toast()` and `AlbumScene`
- Steps: (a) a save with 23 / 24 Pillow Hills + Space stars; win the 3rd star. (b) Open the Sticker Album.
- Expected: the kid can read that the Superstar sticker gives the Royal Crown. It is the only place in the game that says so.
- Actual: the new desc is 63 characters, and both texts are shrunk by `fit()`. Toast subtitle: scale 0.62, about 6 css px on iPhone portrait and landscape. Album card: 9.7 canvas px, which is **3.5 css px** on iPhone portrait (D2), **2.2 css px** on iPhone landscape (D5) and 6.9 css px on iPad portrait. The other stickers in the same Album are 6.5 / 12.8 css px. In the screenshot the Superstar line is a smear.
- Seen: live (measured + screenshots `superstar_toast_390`, `album_390`).
- Fix idea: keep `desc` short ("Get all 24 stars. Wins the Royal Crown!", or keep the old desc) and put the crown in the result notes instead ("New costume: Royal Crown! Put it on in Me"). For example, the crown could be added from `result()` when `checkAch` grants `allstars`. Or the toast could get a separate `reward` line.

**B43 - Hats given by the migration are never announced** · S4 · `game.js` `main()` migration block
- Steps: load a v0.7.8 save with `stars.hoot > 0` (or `stars.fang`, or `stars.dragonboss`).
- Expected (design 6.2, "Retro gift"): once, a toast "New costume: Owl Hat! Put it on in Me" (and for the Bat Hat / Royal Crown).
- Actual: the hats appear silently in Me; no toast, no note. Almost every existing player beat Hoot, so most players get a hat they will never hear about. Players who only saw the old Dragon Boss crown in Me will not notice any change, which is fine.
- Seen: live (title + map polled, only sticker toasts) + code.
- Fix idea: in the migration, push the newly granted ids to a list. Show them on the first menu screen through the existing `PSExtra` toast queue (rotation-safe since B37). Needs Kondrat's OK: the design calls it a "proposal", and `decisions.md` approves the gift but not the toast.

### Observations (no ID)

- [?] Rollout edge: a kid who plays the old Dragon Boss on a second device that still runs a cached v0.7.8, after the save has already been migrated (`mig08 = 1`), sees the crown there but never gets it stored. Only possible during the update window. No action suggested.
- Hats on wide toy heroes are scaled by sprite width (`w * displayWidth`). On the cow toy the "small" owl is about 150 css px tall on the title (screenshot `title_toy_owl`). This applies to every hat and is not new; it is worth a look when the toque comes [?].
- Wearing is not checked against ownership (`costume` set to a hat that is not in `costumes` still renders). This is old behaviour and only reachable by editing the save.

## 4. Layout matrix

Checker: text and interactive objects outside `0..W x 0..H`, and interactive objects overlapping each other. Me was run with 0, 3 and 7 hats (1 / 4 / 8 cards), logged out, plus logged in (faked `PSNet.user`) with 7 hats.

| Screen | D1 SE | D2 14 | D3 iPad P | D4 iPad L | D5 14 L |
|---|---|---|---|---|---|
| Me, 1 card (+ hint) | ✅ | ✅ | ⚠️ B11 | ✅ | ✅ |
| Me, 4 cards | ✅ | ✅ | ⚠️ B11 | ✅ | ✅ |
| Me, 8 cards, logged out | ✅ 2 rows (5 + 3) | ✅ 2 rows | ⚠️ B11 (1 row, cs 105) | ✅ 1 row | ✅ 1 row |
| Me, 8 cards, logged in | ✅ | ✅ | ⚠️ B11 ("Friend code" over the row) | ✅ | ✅ |
| Title with hat (Jack / toy) | | ✅ / ✅ | | | |
| Duel with hat (Jack / toy) | ✅ (bat) | ✅ / ✅ | | | |
| Result panel, 4 notes | | ✅ * | | | ✅ * |
| Album (Superstar text) | | ⚠️ B42 | ⚠️ B42 | | ⚠️ B42 |

\* fits, small notes are B32.

Hat card size on screen: 150 canvas px = 52 css px on D1, 54 on D5 (B26, unchanged). On D3, 105 canvas px = 75 css px. With the toque (10 cards) D3 would drop to 80 canvas px (57 css px) [?].

## 5. Ideas for the Playwright suite

| # | Catches | Repro |
|---|---|---|
| T16 | B42 | Album at 390x844: for every sticker desc, `fontSize * scaleX * innerWidth / config.width >= 6`. Today the Superstar desc is 3.5 |
| T17 | B43 | Boot a save with `stars.hoot: 1`, no `mig08`. Poll title + map 10 s for a text matching `/Owl Hat/`. Today: none |
| T18 | Migration on a cloud pull | Boot a `mig08` save. Then `localStorage.setItem(old save without mig08, with stars.hoot / fang / dragonboss)` + `__psRebuild({key:'title'})`. Expect crown + owlhat + bat and `mig08` in `localStorage` after the first store. Not covered today (the suite only reboots the page) |
| T19 | Toy hero hat | Toy in IDB (`PSToys.createToy` + `__IDB.set`), `hero = toy.id`, `costume: 'owlhat'`: expect `battle.hero.hat.texture.key === 'owl'` and a green tint, plus an owl image on the title |
| T20 | Flaky B39 test | In `duel.spec.js` B39 (and wherever `_pick` is called right after `go`), first `waitForFunction(() => __game.scene.getScene('battle')._pick)`. It failed once under load with `_pick is not a function` |
| T21 | B11 logged in | Me on 768x1024 with `PSNet.user` faked: the "Friend code" text bounds must not intersect any hat card |

## 6. Not tested

- **Real devices (IOS-xx):** hat look and tint on the real screen, touch on the 52 css px hat cards, Me two rows on an iPhone with the home indicator.
- **Online (ON-xx):** the real `applyCloud` / `reconcile` paths (simulated through `localStorage` + `__psRebuild` only). Friends' avatar `costume` with the new ids: no screen renders it today (`net.js` only sends it), so no crash is possible [?].
- Studio / Star Catch rotation, booster rotation, music mute and burst after a pause: code unchanged, not re-run.
- Out of scope for this PR: Mothership / Blips content, the toque, Saucer Champ, the Dragon vs Dragon sticker change.
