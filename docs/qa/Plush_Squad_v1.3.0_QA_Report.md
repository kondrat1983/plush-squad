# Plush Squad v1.3.0 Pixel Land: QA report

## 0. Summary
Verdict: PASS WITH FIXES. No S1 or S2 found. Three S3 and three S4 bugs, all in the new UI (button placement and one rotation restore).

| Severity | New | Open |
|---|---|---|
| S1 | 0 | 0 |
| S2 | 0 | 0 |
| S3 | 3 (B80, B81, B82) | 3 |
| S4 | 3 (B83, B84, B85) | 3 |

Fix next: B80, B81, B82.

Method: `tests/pixel13.spec.js`, `result.spec.js`, `smoke.spec.js`, `music.spec.js`, `map.spec.js` on port 8788 (26 passed, 0 failed). Then scripted play on four viewports (D2 390x844, D5 844x390, D3 820x1180, D4 1180x820) with a max-level save and `?halloween` for the map. Screenshots were read. Page errors: 0 in every run.

## 1. Fix verification
No fix IDs in this change.

## 2. Checks against section 8
- Order and crown: leafy, bolty, bibi, pipo, pixeldragon at ids 27..31, right after poland (26). Crown only on the last node. OK.
- Music: `pixel` on rivals 1-4, `boss` on the dragon, `pixelMap` on the map (test). OK.
- Tabs with `?halloween`: 8 tabs, each 110x96 (107x96 on iPad landscape) game px, in one row, none off screen, no overlaps. Spooky is the 8th tab. OK on D2-D5.
- Map Pixel Land on 4 sizes: castle, clouds, hills, locked nodes readable, no overlap with tabs. Two small notes: B84 (label at the edge) and the castle sits behind the last node on the landscape sizes. [?] the castle overlap may be intended.
- Duel look: `jack_px_idle1/2`, `leafy_idle1`, attack and hit frames swap (test saw `jack_px_attack`, `leafy_hit`). NEAREST filter set. OK.
- NOW LOADING: shows (8 blocks), a tap on the screen ends it at once (checked with the scene time slowed down). The second line of the doc "resolution drop in 3 steps" is not in `pxBoot()` (B85).
- Photo toy: hero gets `px:toy_tg`, `__psPixMs` 8 ms, the original texture and `Save.data.toys` are unchanged. `__psPixFail = true` keeps the normal texture (test). Poland and the Kraken (`boss:true`) are not 8-bit, no chest, pep 220. Toy mode and friend mode are gated by `this.mode === 'campaign'` (code only; friend duel result is covered by result.spec).
- 1-UP: chest opens after the chosen turn, button and heart tap both work (real mouse click on the heart), a double call (button twice plus heart) counts once, `stats.oneups` +1. Two chances: rival declined, player did not take it, state goes `gone` and never reopens over 7 more turns. Heal values by `heartHeal()` code: EASY 30, NORMAL 25, HARD 20 (the in-duel hp after a claim also includes the rival's reply hit, so I read it from code and from the pixel13 test). Rival AI formula matches section 8 (EASY never; NORMAL under 60 % else 35 %; HARD under 80 % else 60 %). I did not run it 200 times (code only).
- CONTINUE?: NORMAL shows one NO! button, HARD three (order random, stable during the count), EASY skips to an auto win. Revive 20 % (65 of 325) and 25 % HARD (98 of 390). Second KO ends the duel. 8-Bit Cap given. Result shows `HI-SCORE! 001290`. Boss bonus +2000 is lost after a revive, as designed.
- Rotation: with the heart up (portrait to landscape): heart, hp, damage, score restored, no new boot, 0 errors, but see B82. During CONTINUE?: rotation is held (`__psRotatePending` true), then applied after the revive, with `contRevived`, the x1 chip, rival hp and `contUsed` kept. A second KO afterwards ends the duel normally.
- Result screens: campaign, boss, friend's Jack, Kraken, win and lose passed in result.spec. My own runs also reached the Pixel Dragon result (NORMAL, HARD, EASY) without errors.

## 3. Bug status
### B80 (S3, new): 1-UP button covers the SCORE chip and VS on D3, D4, D5
File: `pxInit()`, `this.oneBtn = button(this, W/2, this.bby, ...)` at depth 35 (score chip depth 30).
Steps: Pixel Land duel on iPad (either way) or phone landscape, `__psHeart='player'`, play one move.
Expected (section 8, point 13): the score chip does not overlap anything.
Actual: `bby` is under the pep bars on these sizes, so the red 1-UP! button sits on the VS badge and the SCORE chip (score bounds 996,242,345,36 vs button 980,225,312,89 on D5). The score is hidden while the heart is up. D2 (phone portrait) is fine.
Seen: live, screenshots `heart_D3/D4/D5`. Fix idea: put the score chip higher or lower on these layouts, or place the button under the chip.

### B81 (S3, new): CONTINUE? title is covered by the NO!/YES! buttons on D3, D4, D5
File: `continuePrompt()`, `big('CONTINUE?', H*0.3 ...)` against buttons at `this.bby`.
Steps: Pixel Dragon, KO him once on NORMAL, iPad or landscape.
Actual: the NO! button covers the top of "CONTINUE?" (D4: only the lower half of the letters is visible). On D5 the HARD row of 3 buttons hides the title and half of the countdown number. D2 is fine. The first-time hand at `bby - 150` is probably off screen too [?].
Seen: live, `cont_normal_D4`, `cont_hard_D5`. Fix idea: place the prompt block relative to `bby` on those layouts, or move the buttons down.

### B82 (S3, new): after a rotation with the heart up, the 1-UP! button is missing
File: `pxInit(res)`: creates `oneBtn` hidden, and nothing calls `heartBtnSync()` after the restore.
Steps: duel in Pixel Land, `__psHeart='player'`, make one move (heart up, button shown), rotate the phone.
Expected: same state after the rebuild, as section 8 point 16.
Actual: heart and its label are back and tappable, but `oneBtn.visible` is false until the next sync. A kid who looks for the button finds only a small heart (96x81 game px). The heart then also leaves after 2 chances.
Seen: live (`btn:true` before, `btn:false` after). Fix idea: call `this.heartBtnSync()` at the end of `pxInit` (after the first turn is ready).

### B83 (S4, new): countdown number is hard to read on the sun
`continuePrompt()` number is white with a dark stroke over the yellow pixel sun in portrait (D2). Fix idea: other colour or no sun behind it.

### B84 (S4, new): first rival name label touches the screen edge on iPad and landscape
Map, Pixel Land, "Sir Leafy the Elf Knight" under the first node starts at x of about 0 on D4 and D5. Fix idea: use `nick` or wrap the label.

### B85 (S4, new): boot has no "resolution drop in 3 steps"
Doc section 8 point 7 asks for it. `pxBoot()` has only the 8 blocks and the flash. Either update the doc or add the steps.

### Notes (not bugs)
- The heart hit area is 96x81 game px. B26 (touch targets under 90 px) is still open in general. The button is the big target.
- After the first win of the Pixel Dragon the result shows NEXT RIVAL for the event rival, also with `?halloween` off. Same as after Poland before, so left as is.
- My save was a max save, so achievement toasts appeared on top of the tabs in the screenshots. They are not part of the change.

## 4. Layout matrix
| ID | Device | Map (tabs, nodes, castle) | Duel (score, bars, emoji) | 1-UP button | CONTINUE? |
|---|---|---|---|---|---|
| D1 | iPhone SE | not run | not run | not run | not run |
| D2 | iPhone 14 portrait | OK | OK | OK | OK |
| D3 | iPad portrait | OK, 8 tabs | OK | B80 | B81 |
| D4 | iPad landscape | OK, B84 | OK | B80 | B81 |
| D5 | iPhone 14 landscape | OK, B84 | OK | B80 | B81 |

Interactive objects outside 0..W x 0..H on the map: none on D2-D5. Overlap check on the map: none.

## 5. Ideas for the Playwright suite
- B80: with `__psHeart='player'`, after one move assert that the bounds of `b.oneBtn` and `b.scoreT` do not intersect on 1180x820.
- B81: with CONTINUE? open, assert `contOpen` button bounds do not intersect the "CONTINUE?" text bounds on 1180x820 and 844x390.
- B82: rotate (`setViewportSize`) while `b.heart.state === 'up'` and `b.heart.next === 'p'`, then expect `b.oneBtn.visible === true`.

## 6. Not tested
- Real iPhone and iPad (IOS-xx): Press Start 2P font look, NEAREST scaling, sound of the new SFX, pixel sun and cloud steps on a real screen.
- Online (ON-xx): cloud save with `mig12` through `applyCloud`, friend's toy badges, postcards.
- D1 (375x667) was not run.
- Not run live: friend and own-toy duel in Pixel Land through the UI, CALM MODE, left-handed buttons, Bedtime, boosters in Pixel Land (Big Breakfast, Spare Heart, Sleepy Moon), emoji chat lines, rival AI 200-run statistics, Fire Breath block, quest and sticker earning flow.


## Fixes after this report (same PR)
- B80: the 1-UP! button moved below the SCORE chip (`max(bby, score + 120)`).
- B81: CONTINUE? lays out top-down (title, number, buttons below the number).
- B82: `pxInit()` calls `heartBtnSync()`, so the button comes back after a rotation.
- B83: the countdown number is gold with a dark edge.
- B84: a node name next to the screen edge moves inwards.
- B85: the design doc now describes the built boot (no step-by-step resolution drop).
