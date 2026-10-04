# Plush Squad v0.8 part 3/7 ("Fire or Beam?") - QA Report

| | |
|---|---|
| **Build** | worktree `claude/v0.8-beam`, HEAD 8f76f4f. Diff: `git diff origin/claude/v0.8-space...HEAD` (`js/game.js`, `js/audio.js`, `js/extra.js`, new `tests/beam.spec.js`). The merge of `claude/v0.8-space` (B45, B46) was not reviewed again. VERSION / CACHE still 0.7.8 (not a release). |
| **Date** | 4 Oct 2026 (Halloween ON) |
| **Method** | Code review of the diff against `docs/gdd/0.8-space-rework.md` (sections 3.1 move 5, 3.2 option 2, 4 option 2, 8 items 5-19; read from `origin/main`) + `npm test` + scripted play in headless Chromium (`?debug`, lag smoothing off on every scene and after every rebuild, Mothership turns driven through the real `playerMove` / `rivalTurn` path with only the AI pick forced, FOAM! / UMBRELLA! / move cards / BACK / NEXT RIVAL pressed with real mouse events, rotations as real viewport changes, duels ended through `finish(won)`) + layout probe of the block buttons on D1-D5 + screenshots. No real device, no online accounts. |
| **Bug IDs** | Kept. New: B47, B48, B49 (after B46). |

## 0. Summary

**Verdict: good to merge into `claude/v0.8`. No S1 / S2.** The beam works the way the spec says, through the real turn path: right tool = 0 damage + dizzy, wrong tool = half, no block = full damage + one card BEAMED UP, given back at the end. The steal order is right for Jack and for a toy hero (atlas icons fly correctly). Rotation during a beam charge, during the block animation and after a steal all come back right. The AI never picked two charged moves in a row in 300 simulated HARD duels. 0 page errors in every scripted run. Three new S4 findings: a block made just before a rotation is not counted (old pattern, the new `beamBlocks` counter has it too) (B47); on iPad and phone landscape the two buttons cover the booster chip and the HARD chip (B48); on EASY the charge text promises a card steal that never happens (B49).

| | |
|---|---|
| `npm test` | **59 / 59 pass** after a rerun. First full run: 54 pass, 5 fail (4 in `costumes.spec.js`, 1 in `duel.spec.js` B30). All 12 tests in those two files pass when run alone. The first run shared the CPU with my scripts, and the failures fit a race in `helpers.boot()` [?] (section 5, T29) |
| Beam rules (spec 8 items 5-12) | ✅ all, live (details in section 1) |
| Rotation (items 14-16) | ✅ beam charge at YOUR TURN, umbrella animation (held, applied at YOUR TURN), after a steal (stamp kept, card still dead) |
| Block buttons on 5 sizes (item 17) | ✅ fit, 130 tall, no overlap with each other, the hp bars, the log or the cards. ⚠️ B48 (booster chip, HARD chip) |
| Every battle mode, win + lose (item 18) | ✅ 16 / 16: own toy, friend's toy, friend's Jack L5, Blips, Mothership, Kraken here + campaign, Prof. Hoot, friend's Jack L3, Kraken in the suite |
| Toy hero vs Mothership (item 19) | ✅ Snack Break, then Fire Sneeze, then "The beam finds nothing to grab!" |
| Page errors | 0 in every run |
| New bugs | **B47** (S4), **B48** (S4), **B49** (S4) |

**Fix next:** B49 (one string), B48 (button y or chip y on iPad / landscape). B47 is older than this change and small; fix it when the rotation code is touched next. Nothing blocks the merge.

## 1. Fix verification (spec acceptance items)

| Item | Status | How checked |
|---|---|---|
| 5. Inferno charge, NORMAL | ✅ | Real path: red sky, FOAM! + UMBRELLA! at YOUR TURN. FOAM! (real click): 0 damage, STEAMED!, `stats.blocks` 1, `beamBlocks` unchanged. UMBRELLA! on fire: half damage, no dizzy (suite) |
| 6. Beam charge, NORMAL | ✅ | Spotlight (`beamSpot`), green sky, "WARMING UP THE BEAM...", both buttons. UMBRELLA! (real click): 0 damage, BEAM JAM! dizzy, `beamBlocks` +1. FOAM! on beam: 100 -> 85, no dizzy, no card taken |
| 7. No block on a beam | ✅ | Jack L6 + Warm Milk booster: 100 -> 70, `beamed = ['nap']`, Nap card shows the UFO + BEAMED UP, Pillow / Tickle / Tail Spin never taken. A real click on the beamed card does nothing. Win: the log shows "Mothership gives back your Upside-Down Nap. Too cozy to keep!" for 1.6 s, then the win line; `beamed` empty on the panel |
| 8. Six-Seven during a charge | ✅ | Real click during a beam charge: "Mothership is too dizzy... the beam goes disco and fizzles!", 0 damage, spotlight gone |
| 9. Never two charged moves in a row | ✅ | 300 HARD duels x 14 rival turns with the real `pickMove` and the `rivalTurn0` state changes: 0 back-to-back charges; at most 3 beams and 1 Inferno per duel (avg 2.3 / 0.8) |
| 10. EASY | ✅ / ⚠️ B49 | One BLOCK IT! with the umbrella icon on a beam and the extinguisher on fire; never a steal (suite). The log still says "The beam takes a card if it hits" |
| 11. HARD 3 beams | ✅ | `uses` 3 on HARD, max 3 seen in the sim. Swap: FOAM! / UMBRELLA! sides swapped when `toolSwap` is set (screenshots D1-D5) |
| 12. Blips Mini Beam | ✅ | Only UMBRELLA!, centred, on NORMAL and EASY. Blocked: 0 damage, no dizzy. Not blocked: damage, no card (suite + layout run) |
| 13. Jack's Inferno during a Mothership charge | ✅ | Real click while a beam charges: the sky stays green the whole time (no red "grab FOAM!" flash), then the beam fires and takes Nap |
| 14. Rotate during a beam charge | ✅ | D2 -> D5 at YOUR TURN: `charging = beam`, spotlight back, both buttons in the landscape layout, same log, `boss` wanted |
| 15. Rotate after a steal | ✅ | D5 -> D2 (Jack) and D2 -> D5 (toy hero, 2 cards beamed): stamps kept, cards dead |
| 16. Rotate during the beam animation | ✅ | UMBRELLA! then resize 0.4 s later: `__psRotatePending` true, the block and BEAM JAM! play out, rebuild at YOUR TURN with the Mothership still dizzy. ⚠️ B47 (the block is not counted) |
| 17. Button layout | ✅ / ⚠️ B48 | Section 4 |
| 18. Every mode | ✅ | Section 2 |
| 19. Toy hero | ✅ | Bear toy (Fire element, hungry): 1st beam takes Snack Break (`icons:honey`, 90 px), 2nd Fire Sneeze (`icons:fire`), 3rd "nothing to grab". Toy loses: cards back, panel REMATCH / MAP, +10 XP |
| Double taps | ✅ | UMBRELLA! twice in one frame: one block, `beamBlocks` +1. FOAM! then UMBRELLA!: only FOAM! counts. UMBRELLA! then a card: only the block |
| B45 (from part 2) | ✅ seen fixed | Mothership win panel: 2-line laugh, no overlap (D2) |
| B46 (from part 2) | ⚠️ partly | Banner and "too dizzy" lines are plural now (code). Still singular: Jack's Six-Seven log "Blips gets dizzy watching!" (`MOVES` `{d} gets dizzy`). Code only |

## 2. Regression list results

### Result screen in every battle mode (D2, real `finish(won)`)

| Mode | Win | Lose | Notes |
|---|---|---|---|
| Campaign | ✅ suite | ✅ suite | |
| Campaign boss: Prof. Hoot | ✅ suite | ✅ suite | |
| Campaign: The Blips | ✅ +120, NEXT RIVAL / MAP | ✅ +10, REMATCH / MAP | |
| Campaign boss: The Mothership | ✅ +200 (first win), UFO Hat note, NEXT RIVAL / MAP | ✅ +10, REMATCH / MAP | also won through a real click with a beamed card (give-back line seen) |
| Own toy | ✅ +30, REMATCH / SQUAD | ✅ +10 | |
| Friend's toy | ✅ +35, REMATCH / FRIENDS | ✅ +10 | |
| Friend's Jack L5 | ✅ +35, REMATCH / FRIENDS | ✅ +10 | its Inferno Rain hit at once (100 -> 63), no charge, no block buttons |
| Friend's Jack L3 | ✅ suite | ✅ suite | |
| Kraken | ✅ +60, BOSS / MAP | ✅ +10, BOSS / MAP | |

Every panel: music back to `calm`, layout checker clean, 0 page errors.

### Rotation

| Case | Result |
|---|---|
| Beam charge, rebuild at YOUR TURN | ✅ |
| Umbrella animation (held until YOUR TURN) | ✅ (B47 for the counter) |
| After a steal (Jack and toy) | ✅ |
| Between turns, mid-turn, final move, result panel | ✅ suite `rotate.spec.js` 8 / 8 |
| Studio (blocked), Star Catch | not re-run (code unchanged) |

### Bedtime / daily limit

✅ Bedtime set during a beam charge: a rotation restores the duel (not Bedtime), the duel finishes, NEXT RIVAL (real click) -> Bedtime.

### Boosters

✅ Suite B30 x3, B01 x4 (after the rerun). ✅ Warm Milk booster duel with a steal: the order skips it while Nap is left. Booster rotation not re-run (code unchanged).

### Music

✅ `boss` wanted in every Mothership duel, also after the rebuild; `calm` after every panel. ✅ Suite music tests incl. B34. New SFX (`blip`, `beam`, `umbrella`) run without errors; not heard (headless, muted).

### Map start world

✅ Suite `map.spec.js` 2 / 2. Map code not changed.

## 3. Bug status

**Fixed by this change:** none from the open list (this is a feature part). B45 seen fixed; B46 partly fixed (see section 1).

**Still open (code unchanged):** B05, B07, B11, B13, B15, B16, B18, B19, B22, B23, B26, B27, B28, B29, B32, B38, B41, B44; B46 (one line left).

**Reopened:** none.

### New

**B47 - A block made just before a rotation is not counted** · S4 · `game.js` `rebuild()` / `main()` (`Save.load()`), `extra.js` `bump()`
- Steps: Mothership duel, NORMAL. Let her charge the beam, tap UMBRELLA!, turn the device while the beam bounces off (or within 30 s after).
- Expected: `stats.beamBlocks` +1 after the rebuild.
- Actual: `bump()` only changes `Save.data` in memory. The rebuild runs `main()` again, which builds a new `Save` from `localStorage`, so the +1 is gone. Seen: in memory 1, in `localStorage` 0, after the rebuild 0. The 30-second play-time timer in `extra.js` writes the save, so the window is up to 30 s. Same for `blocks` (Firefighter) and `naps` since stats exist; the new `beamBlocks` inherits it.
- Seen: live (scripted, D2 -> D5).
- Fix idea: `Save.store()` in `rebuild()` before `old.destroy()` (one line; also saves anything else changed since the last store). Or store in `bump()`.

**B48 - On iPad and phone landscape the block buttons cover the booster chip and the HARD chip** · S4 · `game.js` `Battle.setup()` (`bby`, `toolBtn`) and `setCards()` (x = W/2 ± 230)
- Steps: pick any booster, fight the Mothership on iPad portrait / landscape (or HARD on any landscape), wait for a charge.
- Expected: the booster chip ("Feather Storm") and the HARD chip stay readable, or the buttons sit clear of them.
- Actual: the buttons (y about 250-390 on D3, 200-340 on D4 / D5) cover the booster chip: FOAM! covers 207 x 39 of it on D3 and 190 x 40 on D4; on D3 even the single centred BLOCK IT! covers 65 x 40 (that part is older). On HARD the "HARD" chip at W/2 sits between the two buttons, half hidden (D4, D5). Phones in portrait (D1, D2) are clean. Nothing interactive is covered.
- Seen: live, probe + screenshots `s5_D3_N`, `s5_D4_Hswap`, `s5_D5_Hswap`.
- Fix idea: in landscape and on short portrait screens start the buttons below the chips (`bby >= hy + 76 + chipH/2 + 65 + 10`), or hide the booster / HARD chip while a charge is on (they say nothing during a charge).

**B49 - EASY charge text promises a card steal that never happens** · S4 · `game.js` `Battle.startCharge()`
- Steps: Save `diff: 'easy'`, fight the Mothership until she warms up the beam.
- Expected: no talk about cards (EASY never takes one, spec section 4).
- Actual: "Mothership warms up the TRACTOR BEAM! The beam takes a card if it hits. Tap BLOCK IT!"
- Seen: live (layout run, D1-D5).
- Fix idea: add the card sentence only when `!this.easy`, e.g. `(this.easy ? '' : ' The beam takes a card if it hits.')`.

### Observations (no ID)

- **State on the reused Battle scene:** BACK during a beam charge leaves `this.beamSpot` / `this.beamSweep` pointing at destroyed objects. The next Mothership duel still had them (`same: true`), and the next `endCharge()` tweens the dead Graphics. No page error, nothing visible. Resetting both (and `chargeTw`, `embers`, `extHold`, `toolSwap`) at the top of `setup()` would make it safe.
- **HARD swap after a rotation:** `toolSwap` is not in `snapshot()`, so a rotation during a HARD charge puts FOAM! back on the left. The layout changes anyway on a rotation, so it reads fine to me [?].
- **iPad landscape log line (old):** with 9 cards the log line is 2 lines on D4 and its bottom is 4 px into the top of the cards. True for every long line (the Mothership intro too), not only the new ones. D1-D3 have 40 px, D5 19 px.
- **Spec bits not in the code:** "saucer lights spin" during the charge (only a tint + spotlight + particles); no `WHATS_NEW['0.8']` entry yet (section 9 text includes "Fire or beam?"); no Umbrella Hero sticker (open question 7). `beamBlocks` also counts the Blips' Mini Beam; the spec does not say.
- **Touch size:** the buttons are 400 x 130 game px, about 145 x 47 css px on iPhone portrait and 144 x 47 on iPhone landscape. Fine for a tap, part of the B26 family.

## 4. Layout matrix

Probe: the block buttons at their pulse peak (scale 1.05) against the hp bars, the log line, every card, the booster chip and the other texts; checker: text and interactive objects outside `0..W x 0..H`, overlapping interactive objects. Save: Jack L6, all boosters, Feather Storm picked (9 cards).

| Screen | D1 SE | D2 14 | D3 iPad P | D4 iPad L | D5 14 L |
|---|---|---|---|---|---|
| Beam charge, NORMAL (FOAM! + UMBRELLA!) | ✅ | ✅ | ⚠️ B48 chip | ⚠️ B48 chip | ✅ |
| Inferno charge, HARD, swapped | ✅ | ✅ | ⚠️ B48 chip | ⚠️ B48 chip + HARD chip | ⚠️ B48 HARD chip (6 px chip) |
| Beam charge, EASY (BLOCK IT!) | ✅ | ✅ | ⚠️ chip (older) | ✅ | ✅ |
| Blips Mini Beam (UMBRELLA! centred) | ✅ | ✅ | ⚠️ chip (older) | ✅ | ✅ |
| BEAMED UP card (Jack, 9 cards) | | ✅ | | | ✅ |
| BEAMED UP cards (toy, 4 cards) | ✅ | | | | ✅ |
| Mothership win panel | | ✅ (B45 fixed) | | | |
| Result panels, 6 modes x win / lose | | ✅ | | | |

Checker (off-screen, interactive overlaps): 0 findings on every screen above.

## 5. Ideas for the Playwright suite

| # | Catches | Repro |
|---|---|---|
| T29 | Flaky boots (first run) | `helpers.boot()` sets `localStorage` while the first, empty game is still booting; a fresh game stores its own save on the title screen (What's new check, `extra.js` line ~195) and can overwrite the seeded one [?]. Fix: seed with `page.addInitScript()` before the first `goto`, or open `/manifest.json` (same origin, no game) for the `setItem` |
| T30 | B47 | Mothership, force a beam (`b.pickMove = () => beam` once), whack, then `playerBlock('umb')`; at YOUR TURN `setViewportSize(844x390)`; after the rebuild expect `stats.beamBlocks === 1` |
| T31 | B48 | iPad landscape, booster `feathers`, HARD, force a charge; expect the bounds of `extBtn` / `umbBtn` (at scale 1.05) not to intersect `b.boostChip.getBounds()` or the HARD chip |
| T32 | B49 | EASY, `startCharge(beam)`; expect `logT.text` not to match `/card/` |
| T33 | Real turn path | The beam tests call `startCharge()` directly. One test through `playerMove('pillow')` with a forced pick, then a real `umbBtn` pointer event, covers `rivalTurn0` (`afterCharge`, `charging`) too |
| T34 | Toy steal | Toy `{arch:'bear', element:'fire', quirk:'hungry'}` (picture in `__IDB`), three unblocked beams: `beamed` `['m3']`, then `['m3','m2']`, then log "nothing to grab" |
| T35 | Modes not in `result.spec.js` | Add `ownToy`, `friendToy` (`ftoy` with a data URL), Blips and Mothership to `MODES` |

## 6. Not tested

- **Real devices (IOS-xx):** the new SFX by ear (`beam` hum length, umbrella pop, Blips chirps) and their volume next to the `boss` music; the spotlight and green sky on a real screen; button touch on iPhone; haptics (`buzz`).
- **Online (ON-xx):** a real friend's Jack / friend's toy duel from the Friends screen (simulated with `fjack` / `ftoy` data); cloud save carrying `beamBlocks`.
- Not re-run because the code is unchanged: Studio and Star Catch rotation, booster rotation, mute and burst after a pause, Halloween OFF map.
