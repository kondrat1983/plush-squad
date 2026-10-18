# Plush Squad v1.1.1 QA Report (hotfix, light pass)

Branch `claude/v1.1.1-hotfix`, head be047bb, diff vs origin/main. Scope: only the hotfix changes. Full suite not run (CI does). Sizes: 390x844 and 1180x820 (820x1180 for the capsule machine, 1024x768 for Adventures).

## 0. Summary

**Verdict: PASS. No S1 or S2. Nothing blocks the merge.**

| Severity | New | Open from before |
|---|---|---|
| S1 | 0 | 0 |
| S2 | 0 | 0 |
| S3 | 0 | not re-checked |
| S4 | 1 (B78) | fixed |

B78 fixed in v1.1.1 (commit e5ebb93): BACK is ignored while a capsule opens.

## 1. Fix verification

| Change | How checked | Result |
|---|---|---|
| Capsule SKIP ANIMATION | `tests/hotfix111.spec.js` (25 tests, all green, 7.4 min) plus screenshots at 390, 1180, 820. Box is 90 px or more, stays in the screen, survives reload (`PSPrefs.skipCaps`), single open shows the result at once, caps 3 -> 2. With skip off, TAP TO OPEN! still shows. | OK |
| OPEN 10 | Shows only with 10 or more plain capsules (9: hidden). 12 caps + 2 golden: caps 2 left, golden untouched, 10 `capsule` events, `stats.capsOpened` 10, 10 cards on one screen inside the viewport, NICE! closes and unlocks the machine. Both skip on and off. | OK |
| Rotation blocked while opening | `__psBlockRotate` checks `gacha.busy`; pending rotation applies after NICE! (code read, spec test at 5 sizes). Also: leaving with the BACK scene change mid OPEN 10 gives 0 page errors, boosters kept. | OK |
| Mail MARK ALL READ | Stubbed `PSNet.sb` (no network). 3 gifts: badge 3 -> 0 on mail tab and FRIENDS nav, popup count uses `Net.unread`, the 3 OPEN buttons stay, no deleting or claiming. Seen ids stored per user id, capped to 300. Code read: `claim()` and `inbox()` go through `recount()`. | OK |
| B69 Brock Lee art | Viewed `assets/brocklee.png`: florets symmetric, no visible seam. Also in the duel screenshots. | OK |
| B70 toy page buttons | Spec at 1180x820, 390x844, 820x1180: ADVENTURE, PLAY AS, DUEL! do not touch, inside the panel, XP text inside. | OK |
| B71 Adventures list | Spec at 1180x820, 1024x768, 390x844: postcards clear of buttons, day line readable. | OK |
| B72 Ocean lighthouse | Spec: lighthouse not behind a map node at 1180x820 and 390x844. | OK |
| B72 Brock Lee strip and HIDING! stamp | Screenshots at 390 and 1180: dark strip behind the log line, small HIDING! stamp in the card corner, card names readable. | OK |
| B72 Halloween sticker toast | Spec: toast no longer covers the PLUSH SQUAD logo, 390 and 1180. | OK |
| Brock Lee re-entry crash (logBg) | Spec: hide, back to map, new Brock Lee duel, no page error; rotation restore resizes the strip. `logBg` is reset in `create()`. | OK |

## 2. Regression list (limited to what the diff touches)

| Item | Result |
|---|---|
| Result screens, all modes | Not run. The diff does not touch `result()` or `finish()`. CI covers it. |
| Rotation | Capsule machine and Brock Lee hiding restore: OK. Others not run. |
| Boosters, Music, Bedtime, Map start world | Not run (not touched). |
| Page errors | 0 in every run. |

## 3. Bug status

No fixed, reopened or old bugs re-checked. Highest ID in the v1.1.0 report was B77, so new IDs start at B78.

### B78 (S4, new): leaving the capsule machine during OPEN 10 shows no summary

**Fixed in v1.1.1:** BACK is ignored while a capsule opens (test in `tests/hotfix111.spec.js`).
- File: `js/game.js`, `Gacha.turn10()` / `take()`.
- Steps: with skip off and 10 or more capsules, tap OPEN 10, then press BACK within about 1 second.
- Expected: the kid still sees what he got, or the capsules are only taken when the summary shows.
- Actual: the 10 capsules are already spent and the boosters are in the bag, but the summary is never drawn. No error. Seen live (caps 12 -> 2, 10 boosters added, 0 errors, map shown).
- Fix idea: take the capsules after the 1.3 s wait, or block BACK while `busy`. The single TURN! has the same pattern [?], so the owner may accept it.

## 4. Layout matrix (touched screens only)

| Screen | 390x844 | 1180x820 | 820x1180 | 1024x768 |
|---|---|---|---|---|
| Capsule machine (TURN!, OPEN 10, checkbox, grid) | OK | OK | OK | OK (spec) |
| OPEN 10 summary | OK | OK | not shot | n/a |
| My Squad toy page | OK | OK | OK | n/a |
| Adventures list | OK | OK | n/a | OK |
| Ocean map | OK | OK | n/a | n/a |
| Brock Lee hiding | OK | OK | n/a | n/a |
| Title (Halloween toast) | OK | OK | n/a | n/a |

D1 (375x667) was only tested for the capsule machine (spec). Eyeballed screenshots: no overlap, no cut-off text.

## 5. Ideas for the Playwright suite

- B78: OPEN 10 with skip off, scene change after 500 ms, assert either a summary or no capsules spent.
- Mail: after MARK ALL READ, a new inbox message with a new id must raise the badge to 1 again (not covered by the current spec).
- OPEN 10 with exactly 10 caps and with golden caps only (OPEN 10 must stay hidden).

## 6. Not tested

- Real iPhone and iPad (IOS-xx): touch feel of the 90 px checkbox, safe areas.
- Online mail (ON-xx): only a stubbed inbox was used; real Supabase not touched.
- Rotation on the OPEN 10 summary on a real device.
- Full regression list (CI).
