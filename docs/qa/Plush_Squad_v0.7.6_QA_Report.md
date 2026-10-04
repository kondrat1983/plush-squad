# Plush Squad v0.7.6 - QA Report

| | |
|---|---|
| **Answers** | `Plush_Squad_v0.7.5_Handoff_for_QA.md` + `Plush_Squad_v0.7.6_Addendum_for_QA.md` |
| **Build** | v0.7.6 live, cache `plushsquad-v0.7.6`. `game.js` byte-identical to the 0.7.6 I diffed on 3 Oct; `audio.js` reviewed in full. |
| **Date** | 4 Oct 2026 (Halloween ON) |
| **Method** | Code review of the 0.7.5 -> 0.7.6 diff + live tests in Chromium with emulated sizes D1-D5, automated layout checker, scripted play, and **Web Audio instrumentation** (track-switch log, notes counted per music bus, level meters on the master / music / SFX gains). No real iOS device, no online accounts. |
| **Bug IDs** | Kept. New bugs: B33, B34 (B31, B32 came from the v0.7.5 report). |

---

## 0. Summary

**Verdict: v0.7.6 is good to play.** The result screen works in every battle mode, the music does what the addendum says, and all v0.7.5 fixes still hold. The game logged 0 JS errors during the test session.

| | |
|---|---|
| Result screen, 6 modes x win/lose | **12 / 12 pass**, 0 JS errors |
| Music checks (addendum 2) | **6 / 6 pass** + 1 small new bug (B34) |
| v0.7.5 fixes re-confirmed on 0.7.6 | **13 / 13** still fixed |
| Still open from earlier rounds | **B30** (refund only once per session), **B31**, **B32** + the planned paging / touch items |
| New bugs | **B33** (S3) Kraken REMATCH skips the daily fight check · **B34** (S4) rotating mid-duel restarts the duel track |
| Layout matrix (5 sizes x 22 screens) | Same as v0.7.5. No new layout issues. |

**Own miss:** the friend / Kraken result-screen crash in v0.7.5 (B20 regression) went through my v0.7.5 re-test. I only checked campaign results, although `isUnlocked(-1)` was visible in the diff. From now on, "every battle mode, win + lose" is a fixed part of my regression list (section 1).

**Fix next:** B30 (one line), B33, then the paging pass.

---

## 1. Result screen in every battle mode (addendum 1)

Each run: start the duel, end it through the real `finish(won)` path (animations, jingle, `result()`, plugin events), then read the panel, the save and the error log.

| Mode | Win | Lose | Track | Notes / buttons |
|---|---|---|---|---|
| Campaign (Timmy) | ✅ +60 XP, +1 capsule, "New rival unlocked: Moo" | ✅ +10 XP | battle | NEXT RIVAL / MAP · REMATCH / MAP |
| Campaign boss (Prof. Hoot) | ✅ +120 XP, "NEW WORLD: SPACE", "Jack learned" | ✅ +10 XP | **boss** | NEXT RIVAL / MAP · REMATCH / MAP |
| Own toy | ✅ +30 XP | ✅ +10 XP | battle | REMATCH / SQUAD |
| Friend's toy | ✅ +35 XP, Friendly Rival sticker | ✅ +10 XP | battle | REMATCH / FRIENDS |
| Friend's Jack | ✅ +35 XP | ✅ +10 XP | battle | REMATCH / FRIENDS |
| Kraken | ✅ +60 XP, "You hit the Kraken for 220!", Kraken Fighter sticker | ✅ +10 XP, hit reported | **boss** | REMATCH / MAP -> see **B33** |

0 JS errors in all 12 runs. **B20** still right in campaign: the first Dragon Boss win during the event shows no "NEW WORLD / New rival" note.

---

## 2. Music (addendum 2)

| Check | Result | Evidence |
|---|---|---|
| **Right track per rival** | ✅ | All 12 rivals + Kraken + own toy + friend's Jack + friend's toy: `boss` exactly for Prof. Hoot, Giant Dragon Boss, Count Fang, Kraken; `battle` for the other 12; `calm` on menus. |
| **No doubled music after REMATCH** | ✅ | 3 quick REMATCHes = 1 switch, 1 active music bus. REMATCH tapped **before** the 1.6 s lullaby return: no stray `calm` (the result timer dies with the scene). |
| **No doubled music after BACK** | ✅ | One switch `battle -> calm`, 1 bus. |
| **No doubled music after rotation** | ✅ 1 bus, but ⚠️ **B34** | Rotation mid-duel switches `battle -> calm -> battle` within 30 ms, so the track restarts from bar 1 with a fade-in. |
| **Win / lose jingle** | ✅ | Music stops at `finish()` (music level falls to the fade tail, -50 dB), lullaby back ~1.6 s after the panel. |
| **Mute in a duel** | ✅ | Mute button: master output silent (-inf dB), state saved; unmute brings the boss track back (-33 dB RMS). Note: the scheduler keeps making notes behind the mute (CPU only, not audible). |
| **No burst after background** | ✅ | (a) the game's own suspend -> 3 s -> resume: 4 notes in the next 300 ms. (b) JS thread frozen 2.5 s while the audio clock kept running (iOS-style): 8 notes in the next 300 ms vs a normal 6.5, 0 notes scheduled in the past. The catch-up guard works. |
| **SFX audible over music** | ✅ | Measured at the master output. SFX RMS over music RMS: calm +14.7 dB, battle +8.5 dB, boss +7.4 dB; SFX peaks -5 dB vs music peaks -18 to -19 dB. Boss is the tightest, still clear. |
| **No stutter on older iPads** | ⏳ device only | Load per track: calm 3.5, battle 33, boss ~14 note events/s (intro bars; part B adds the brass and full drums). Each event = 2-4 audio nodes. Fine on desktop; please check on the oldest iPad (IOS-18). |

---

## 3. v0.7.5 fixes on v0.7.6

| ID | Result | How |
|---|---|---|
| B01 Booster picker | ✅ Fixed | Matrix: 0 issues on D1-D5 |
| B02 Rotation mid-turn | ✅ Fixed | Real viewport change during Frosty Sneeze: held (`pending = true`), Sneeze dealt 25, rival answered, rebuild at YOUR TURN |
| B03 Bedtime before a new duel | ✅ Fixed | Clock 19:59 start -> 20:05 finish: panel shown; REMATCH -> Bedtime; Star Catch -> Bedtime |
| B04 Map start world | ✅ Fixed | Fresh = Pillow Hills; SPOOKY remembered; closed `lastWorld` -> Pillow Hills |
| B08 Jack's card | ✅ Fixed | Matrix D1-D5 |
| B09 Result notes fit | ✅ Fixed | 4 and 6 notes, D1-D5 (size: B32) |
| B10 Quest carry-over | ✅ Fixed | Still waiting after 3 day changes |
| B12 Kraken 220 | ✅ Fixed | Lv7 HARD = 220 |
| B14 Logout push | ✅ (code) | Unchanged since 0.7.5 |
| B17 One mute button | ✅ Fixed | 1 |
| B20 New rival note | ✅ Fixed | + the 0.7.5 crash is fixed (section 1) |
| B21 Bedtime mute | ✅ Fixed | 1 |
| B25 What's new align | ✅ Fixed | Code unchanged since 0.7.5 |

---

## 4. Bug status (all IDs)

**Fixed:** B01, B02, B03, B04, B08, B09, B10, B12, B14 (code), B17, B20, B21, B25.

**Still open:**

| ID | Sev | Status on 0.7.6 | Note |
|---|---|---|---|
| **B30** Booster refund | S3 | **Still open (partly fixed)** | First refund in a session works (`{fort:1}`), second is lost (`{}`). `boostRefunded` lives on the reused `Battle` instance and is never reset. Fix: reset it (and `acted`) in `init()`. |
| **B31** Result panel keeps the old orientation | S4 | Still open | Rotate during the winning move: panel stays in the landscape layout on a portrait screen, `__psRotatePending` stays `true` until the player leaves. |
| **B32** Result notes 17 px | S4 | Still open | Code unchanged. |
| B05, B06, B07, B11, B15, B16, B19 | S3/S4 | Still open | Re-confirmed in the matrix (section 5). Planned paging / touch pass. |
| B13, B18, B22, B23, B24, B26, B27, B28, B29 | S3/S4 | Still open | Code unchanged, not re-tested. |

**Regressed:** none in 0.7.6. (The 0.7.5 B20 regression is fixed.)

### New

**B33 - Kraken result offers REMATCH, which skips the daily fight check** · S3 · `game.js` `result()` (primary button), `net.js` `BossScene`
- Steps: Weekly Boss -> FIGHT -> finish the duel -> REMATCH (repeat).
- Expected: Kraken fights only through the Weekly Boss screen (`Net.bossStart()`, 3 tries a day; also no fight once the Kraken is beaten).
- Actual: REMATCH starts `battle {boss:true}` directly, with no `bossStart()`, so the tries counter is skipped. The server still caps hits (`ps_take('boss_hit', 3)`), so from the 4th fight on the hits are silently dropped, but the panel still says "You hit the Kraken for N! Everyone's hits add up". It also works after the Kraken is beaten that week, and every win still gives 60 XP. The BACK / second button goes to MAP, not to the Weekly Boss screen.
- Seen live: REMATCH / MAP buttons on the Kraken result (guest + forced Kraken duel). The server side is from code review only (needs an account).
- Fix idea: for `mode === 'boss'` show "BOSS" (back to the Weekly Boss screen) instead of REMATCH.

**B34 - Rotating during a duel restarts the duel music** · S4 · `game.js` scene `create` hook
- Steps: any duel -> rotate between turns.
- Expected: the track keeps playing (the `Audio` object survives the rebuild and `_track` is already right).
- Actual: the rebuilt game's **Boot** scene fires `create` -> `A.music('calm')`, then Battle -> `A.music('battle')`. Two switches in ~30 ms, so the duel track restarts from bar 1 with a 0.35 s fade-in, and the old bus's last notes overlap briefly. Not doubled (1 bus after).
- Fix idea: skip `boot` in the music hook (`sc.scene.key !== 'boot'`).

---

## 5. Layout matrix v0.7.6

Same "max content" save as before. ✅ clean · ❌ open bug.

| Screen / overlay | D1 SE | D2 14 | D3 iPad P | D4 iPad L | D5 14 L |
|---|---|---|---|---|---|
| Booster picker (10) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Squad details - Jack Lv6 / toy | ✅ | ✅ | ✅ | ✅ | ✅ |
| Duel (9 cards) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Result panel (4 / 6 notes) | ✅ * | ✅ * | ✅ * | ✅ * | ✅ * |
| My Squad (14 toys) | ❌ B05 | ✅ | ❌ B05 | ❌ B05 | ✅ |
| Capsule machine | ✅ | ✅ | ❌ B07 | ✅ | ✅ |
| Me | ✅ | ✅ | ❌ B11 | ✅ | ✅ |
| Sticker Album | ❌ B06 | ✅ | ❌ B06 | ✅ | ✅ |
| Quests / Quests all done | ✅ | ✅ | ✅ | ❌ B16 | ❌ B16 |
| Parents (5 pending) | ❌ B19 | ❌ B19 | ❌ B15, B19 | ❌ B19 | ❌ B19 |
| Title, Map x3, Studio, Star Catch intro, Parents gate, Bedtime, Friends, Account, Boss, What's new | ✅ | ✅ | ✅ | ✅ | ✅ |

\* fits; text size see B32.

**Rotation regression:** duel mid-turn ✅ (B02), winning move ❌ B31, result panel -> map ✅, Studio blocks rotation ✅, Title / Map / Squad / Capsules / Star Catch ✅ on v0.7.5 (rebuild code unchanged in 0.7.6). **Bedtime regression:** menus, Star Catch, REMATCH -> Bedtime ✅; running duel finishes ✅; restored duel after rotation not cut ✅ (v0.7.5).

---

## 6. Ideas for the Playwright suite

Short repros that would have caught what I found. All use the existing handles (`__game`, `__save`, `__BOOSTS`, `PSAudio`).

| # | Catches | Repro |
|---|---|---|
| T1 | 0.7.5 B20 crash, any future `result()` break | For each of 6 modes (`{rival:0}`, `{rival:3}`, `{toy:id}`, `{ftoy:{...,url:dataURL}}`, `{fjack:{level:3}}`, `{boss:true}`) x win/lose: start battle, set `rival.hp = 0` (or `hero.hp = 0`), call `finish(won)`, wait ~6 s. Expect a text "YOU WIN!" / "SO SLEEPY..." in the scene and no `pageerror`. |
| T2 | B30 | `boosts = {fort:1}` -> battle -> `_pick(fort)` -> back button `pointerup` -> battle again -> `_pick(fort)` -> back. Expect `__save.data.boosts.fort === 1`. |
| T3 | B31 | Portrait 390x844 duel, `rival.hp = 5`, `playerMove('pillow')`, then `setViewportSize(844x390)` during the turn. After the panel shows, expect `__psPortrait === false` (or `__psRotatePending === false`). |
| T4 | B33 | `{boss:true}` duel -> `finish(true)` -> the panel's primary button label is not "REMATCH". |
| T5 | B34 | Duel -> wrap `PSAudio._switch` with a counter -> rotate between turns -> expect 0 switches (track stays `battle`). Needs `PSAudio.init()` + `startMusic()` after a click. |
| T6 | Music per rival | For each rival index + Kraken: start battle, expect `PSAudio._want === (rival.boss ? 'boss' : 'battle')`. |
| T7 | Rotation stress (my open question from v0.7.5) | 20 viewport flips spread over Title / duel between turns / Star Catch. Expect `document.querySelectorAll('canvas').length === 1` and an active scene after each flip. In my background-pane setup old Phaser instances never finish `destroy()` (11 canvases left) and the game eventually boots with 0 scenes. A visible Playwright page will show whether that can happen for real. |
| T8 | Layout | Port of my checker: walk the active scene, fail on any text / interactive object outside `0..W x 0..H` or interactive objects overlapping inside the same layer; run on 5 sizes with a max-content save. |

---

## 7. Not tested

- **Real devices:** IOS-01..16 + **IOS-17** rapid rotation x20 + **IOS-18** music on the oldest iPad (stutter, silent switch, lock screen and back, AirPods connect / disconnect).
- **Online** ON-01..16 (needs Yuriy's test accounts and OK). B33's server side belongs here.
- Listening quality of the new tracks (no audio output in my setup; I measured levels, timing and node counts, not taste).
