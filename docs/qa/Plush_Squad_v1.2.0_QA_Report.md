# Plush Squad v1.2.0 QA report (emoji chat, light pass)

Branch claude/v1.2-emoji, head 823487a. Scope: only the new feature versus origin/main. The full suite was not run (CI does). Checks were scripted in headless Chromium with `?debug`, `fast()` timing, real mouse clicks for the main flow, and screenshots.

## 0. Summary

**Verdict: PASS. No S1 or S2 found, nothing blocks the merge.** No new bugs.

| Severity | New | Open from before |
|---|---|---|
| S1 | 0 | 0 |
| S2 | 0 | 0 |
| S3 | 0 | 0 |
| S4 | 0 | 0 |

Highest earlier ID is B78 (fixed in v1.1.1). Next new ID would be B79.

Fix next: nothing. Notes for Kondrat in section 3.

## 1. Fix verification

No earlier bug IDs were in scope for this change.

## 2. Check results (feature checklist)

| Area | Check | Result |
|---|---|---|
| Button in modes | campaign, Prof. Hoot (boss), toy, friend's Jack, Kraken, Thully, Poland: button visible after the first turn starts | OK |
| Button elsewhere | Hidden on the result panel, absent on the map; the pick-a-booster screen starts before the duel exists | OK |
| Tray | Real click on the button opens it, real click on a cell sends. 16 icons in order, no text field. Portrait 390x844: 4x4. iPad landscape and phone landscape: 8x2 (the build note allows it) | OK |
| Turn safety | Sending left `acted`, `busy`, pep and the turn untouched. A card tap with the tray open closes the tray and plays the card. Tray and send also work while the rival acts | OK |
| Cooldown | 5 sends in one tick: only the first goes through, log keeps `[0]`. Button dims to 0.45 and returns. Spaced sends go through | OK |
| Auto close, tap outside | Closes after 6 s and on a tap outside | OK |
| Rival answers | Bubble comes about 0.9 s later; kind, grumpy, cheeky, boss and sad cases are covered by the dev unit tests, spot-checked here | OK |
| Solo reaction | First call fires, later ones do nothing; nothing in the first 2 s | OK |
| Settings EMOJI OFF | Button hidden, send, tray, solo and answers all stop. Row fits at 390x844 and 844x390 | OK |
| Calm mode | Bubble starts at scale 1 and fades in (no pop) | OK |
| Left-handed | Button moves to the other side of VS at 390x844 and in landscape | OK |
| Rotation | Portrait to landscape with the tray open: tray gone, `emoLog` kept, duel intact, button back at its new spot. Sending works after the rebuild. The dev test covers the deferred rotation during a turn | OK |
| REMATCH (scene reuse) | After finish and a restart: new button visible, `emoLog` empty, solo flag reset, one `pointerdown` listener | OK |
| Result panel | finish(true) with an emoji sent: panel shows, button gone, no page errors | OK |
| Friend mail | Payload logic read in code (`cleanEmo`, WIN only, `emo` left out when empty). Mail rows rendered with a stub inbox (7 ids, a text value, 6 thumbs down, a long toy name): max 6 icons, text ignored, rows readable | OK |
| What's new 1.2 | Popup shows at 390, 844 and 1180 with the smiley icon | OK |
| Version label | v1.2.0 on the title and in Settings | OK |
| Page errors | 0 in every run | OK |

Overlap check (geometry plus screenshots), button, tray and both bubbles against cards, BLOCK IT / FOAM / UMBRELLA / ALARM / PUSH (all forced visible), log, pep bars, VS, back and mute. Sizes 390x844, 1180x820, 844x390 and also 375x667. Modes campaign, Hoot, friend's Jack, toy, Kraken, Thully, Poland. Right-handed, plus left-handed for campaign and Kraken. Result: 0 overlaps, nothing outside the play area.

## 3. Bug status

No new bugs. Notes, not bugs:

- Sleepy Thully never answers an emoji while asleep (`emoAnswer` returns on `asleep`). Jack's bubble still shows. A kid may think it is broken. Kondrat's call [?].
- In landscape the tray is 8x2, not 4x4. Documented in the build notes, so not a defect.
- The mail row text shrinks a lot with a long toy name (older behaviour, not from this change).

## 4. Layout matrix (emoji parts only)

| Device | Size | Button | Tray | Bubbles |
|---|---|---|---|---|
| iPhone portrait | 390x844 | OK, top centre beside VS | 4x4, clear | OK |
| iPhone SE portrait | 375x667 | OK | OK | OK |
| iPad landscape | 1180x820 | OK, right edge under the bars | 8x2, clear | OK |
| Phone landscape | 844x390 | OK | 8x2, clear | OK |

## 5. Ideas for the Playwright suite

The dev suite already covers most of this. Two small additions:
- Real mouse clicks (not `emit('pointerup')`) on the button and a cell, then a card tap with the tray open. This caught nothing, but it is the path a kid uses.
- After REMATCH: `emoLog` empty, one `pointerdown` listener on the scene input.

## 6. Not tested

- Real iPhone and iPad: touch size of the 96 px button, safe-area insets, sound on iOS (IOS-xx).
- Online: real Supabase inbox and `send_inbox` (ON-xx). Tests use a stub.
- Bedtime and the full regression list were not run (out of scope for this light pass, CI runs the suite).
- Hearing the sounds (only the code path and mute were checked).
