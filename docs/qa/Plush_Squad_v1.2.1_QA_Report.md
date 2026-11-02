# Plush Squad v1.2.1 QA Report (light pass)

Scope: new `hop` track and `riser()` in `js/audio.js`, title-only music hook in `js/game.js`. Code review, offline render, music and smoke specs. No layout matrix, no full regression list (no UI change).

## 0. Summary
Verdict: PASS. No new bugs. No S1/S2.

| Severity | New | Open from before |
|---|---|---|
| S1 | 0 | - |
| S2 | 0 | - |
| S3 | 0 | not re-checked |
| S4 | 0 | not re-checked |

Fix next: nothing. Next free bug ID stays B79.

## 1. Fix verification
No fix IDs in this change.

## 2. Checks
| Check | Result |
|---|---|
| Diff read: `riser()` guards ctx/bus like `drum()`; `hop` uses only existing helpers (`voice`, `drum` kinds kick/snare/ohat/hat/crash) | OK |
| Tracks after `go()`: title=hop, map=calm, squad=calm, settings=calm, title again=hop, battle (rival 0)=battle | OK (live) |
| Rotation rebuild on title: `PSAudio._switch` not called, track stays `hop` | OK (live, scratch test) |
| Offline render of all 512 steps at real timing, 2 ch, real noise buffer: 54.9 s, peak 0.619, RMS 0.058, 0 NaN/Inf | OK, not silent, no clipping |
| `tests/music.spec.js` (3 tests) | pass |
| `tests/smoke.spec.js` (portrait, landscape) | pass |
| Page errors | 0 |

Not run: result screen per mode, bedtime, boosters, map start world. The change does not touch them. The only hook change is the track choice in the scene `create` event.

## 3. Bug status
No new bugs. Notes (not bugs):
- The title now has a different track than Settings/Me (calm). Returning from the title is `A.music('hop')` with the same name, so no restart if the title is re-created while already on `hop`. Only a different track causes a crossfade. This is as intended [?].
- The code comment says "v1.3 hop", the version is 1.2.1. Cosmetic, S4 at most.
- The existing "every track" test uses an empty noise buffer and only checks peak > 0. It would not catch NaN or clipping. See section 5.

## 4. Layout matrix
Not tested (audio-only change).

## 5. Ideas for the Playwright suite
- In "every track schedules notes", fill the noise buffer with random values, render at real step timing, and assert `isFinite` on all samples and peak < 1.
- Assert `hop` is not used for `map`, `squad`, `settings` (already covered for map).

## 6. Not tested
- Real device (iOS): loudness of the hop track against the calm one, and the break and riser by ear [IOS].
- Whether the 54 s loop feels repetitive or too busy for a title screen: a taste call for the owner.
- Online (ON-xx): none needed.
