# Plush Squad v1.0.0 QA Report (light pass)

Branch `claude/v1.0`, commit 6adbc53. Scope: new v1.0 features only, 2 sizes: iPhone 15 Pro Max portrait (430x932) and iPad landscape (1180x820). Scripted headless Chromium, `?debug`, no full suite (CI runs it). Page errors: 0 in every run. Text sizes below are game pixels (canvas is 1080 wide on the phone, 1554 on the iPad).

## 0. Summary

Verdict: no S1, no S2. Merge is not blocked. Two S3 layout bugs on iPad landscape and two S4 cosmetic ones.

| Severity | New | Open from before |
|---|---|---|
| S1 | 0 | n/a |
| S2 | 0 | n/a |
| S3 | 2 (B70, B71) | n/a |
| S4 | 2 (B69, B72) | n/a |

Fix next: B70, B71 (both iPad landscape), then B69 (art).

## 1. Fix verification

Not part of this pass.

## 2. Checks

| # | Area | Result |
|---|---|---|
| 1 | Ocean map, 5 nodes (Hermy open, 4 locked, Thully crowned) | OK on both sizes; Ocean comic plays on first open |
| 1 | Hermy duel, Compass Spin (forced Hermy to use WHIRL!) | OK: log line, cards drift, compass badge, LUCKY card +5 |
| 1 | Thully duel start | Asleep, bubble, wake meter OK. ALARM! is hidden at start; it shows only when Thully yawns (code: `setCards`, `yawn`). Forced a yawn: button, hand, text all show, tap works. Not a bug [?] if the brief meant "at start" |
| 2 | Veggie Patch PEEKABOO! | Mounds (Olly, 2 mounds) and trees (Brock Lee, 3) show, tap on the right one works, rival comes out, cards unlock. See B69, B72 |
| 3 | Pillow Week popup, day 2 | OK both sizes: DAY 2, 7 pillows, rewards, YAY!. No overlaps |
| 4 | My Squad ADVENTURE, GO EXPLORE!, Where to? list, send to Ocean, Adventures list, postcard | Works on both sizes. See B70, B71 |
| 5 | Toy detail: level bar, badges (9) | Shows. See B70 |
| 6 | Settings: music and sound pills, calm, hand, buzz | Pills set prefs (music 4, OFF, sfx 1, calm on, LEFT). LEFT mirrors the cards in a duel (card x 888/540/192 phone, 1322/959/595 iPad). OK |
| 7 | What's new 1.0 on title | Shows once, 7 entries, CLOSE and DON'T SHOW AGAIN. OK |
| 8 | Result panel after a win, campaign (Puff) and Kraken | Panel, trophy, XP saved (+160 and +60), NEXT RIVAL / BOSS and MAP buttons. OK both sizes |

Text under 30 px: move descriptions (22-25), What's new body (24), toy XP line (24), settings hints (24-26), badge count chip (22). Same style as earlier versions, not reported as new. Exception: B71.

## 3. Bug status

### B69 (S4) Brock Lee picture is cut off on the right
- File: `assets/brocklee.png` (214x380, alpha bbox = the whole image).
- Steps: open the Brock Lee duel, look at him.
- Expected: whole broccoli head and arm.
- Actual: the right side of the head and the pillow edge is cut with a straight vertical line.
- Seen: live (screenshot and the PNG itself).
- Fix idea: re-export the art with a margin.

### B70 (S3) iPad landscape: toy detail, ADVENTURE button overlaps PLAYING
- File: `js/game.js` `SquadScene.details` (and `js/adventure.js` button placement).
- Steps: 1180x820, My Squad, open a toy with level and badges.
- Expected: three buttons not touching, inside the panel.
- Actual: ADVENTURE (bottom left) overlaps PLAYING by about 10x70 px and hangs at the panel's bottom edge. The "200 / 300 toy XP" text runs to the panel border. Phone portrait is fine.
- Seen: live (checker and screenshot `ipad_toydetail`).
- Fix idea: put ADVENTURE next to the title in landscape like in portrait, or shift PLAYING and DUEL right.

### B71 (S3) iPad landscape: Adventures list, SAY GOODBYE covers postcards, tiny text
- File: `js/adventure.js` `AdventuresScene` row layout.
- Steps: 1180x820 with a toy away, open ADVENTURES.
- Expected: 3 postcard tiles tappable, readable day line.
- Actual: SAY GOODBYE sits on top of postcards 2 and 3 (86 px overlap, only the first tile is visible). The "Day 5 in OCEAN" line is about 11 px. The row uses a third of the screen width.
- Seen: live (screenshot `ipad_adventures`).
- Fix idea: stack the postcards under the name in landscape, or widen the row and move the buttons right of the tiles. Day line at least 24.

### B72 (S4) small cosmetic items (iPad landscape unless noted)
- Ocean map: Hermy's node sits on the lighthouse.
- Brock Lee forest: the log line runs over the tree trunks; the HIDING! stamp covers the card names on all sizes (cards stay readable only by icon).
- Title on Halloween: sticker toast covers the PLUSH SQUAD title (short, transient).
- Seen: live.

## 4. Layout matrix (this pass)

| Screen | 430x932 | 1180x820 |
|---|---|---|
| Ocean map | OK | B72 |
| Hermy, Thully duel | OK | OK |
| Veggie hide (mounds, trees) | OK | B72 |
| Pillow Week popup | OK | OK |
| My Squad, toy detail | OK | B70 |
| Where to? | OK | OK |
| Adventures, postcard | OK | B71 |
| Settings | OK | OK |
| What's new | OK | OK |
| Result panel (campaign, Kraken) | OK | OK |

No items off screen on the new screens (a sticker toast sliding in is off screen for a moment on the iPad title).

## 5. Ideas for the Playwright suite

- B70: at 1180x820 open `squad.details` for a toy, assert the buttons' bounds do not intersect.
- B71: at 1180x820 with one toy away, assert no button bounds intersect the postcard tiles; day text font size >= 24.
- B69: check the alpha of the right-most column of `brocklee.png` is empty.

## 6. Not tested

Real device (iOS), online parts (ON-xx), the rest of the regression list (rotation, bedtime, boosters, music buses; CI covers them), HARD and EASY variants, other sizes, a real Thully fight to the end, the cloud sync paths.
