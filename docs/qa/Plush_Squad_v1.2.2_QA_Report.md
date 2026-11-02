# Plush Squad v1.2.2 QA Report (light pass)

Branch claude/biome-music, diff against claude/music-jumper (3 commits). Light pass: diff review, 4 spec files, one scripted probe.

## 0. Summary
Verdict: PASS, no S1/S2/S3 found. One S4 test gap (B79).

| Severity | New | Open |
|---|---|---|
| S1 | 0 | 0 |
| S2 | 0 | 0 |
| S3 | 0 | 0 |
| S4 | 1 | 1 |

B79: fixed in the same PR (test "B79: every world maps to an existing duel track and map track").

## 1. Fix verification
No fix IDs in this change.

## 2. Checks
- `npx playwright test tests/music.spec.js tests/space.spec.js tests/smoke.spec.js tests/result.spec.js` on port 8788: 23 passed, 0 failed. Result screens passed for campaign, campaign boss, friend's Jack and Kraken, win and lose. Own toy and friend's toy were not run separately.
- `_soft` leak: not found. The scheduler sets `this._soft = !!T.soft` right before every `T.play()` call, so a switch from a Map track to a duel track resets it on the next tick. `drum()`, `hit()` and `riser()` are called only from track `play()` functions. SFX use tone()/noise() and are not affected. After a soft track stops, `_soft` stays true but nothing calls drum/hit outside the scheduler.
- Duel track for undefined `R.world` (toy -1, friend -2, Kraken -3): `WORLD_TRACK[undefined] || 'battle'`, so it is valid. Boss still wins first (`R.boss`), Sleepy Thully still `lullaby`. Probe: toy and friend duels gave `battle`, no page errors. The Kraken duel was started with a bare `rivalIdx:-3` (no boss data), so the `boss` track for the Kraken is not confirmed live. It is covered by code order only.
- World 6 (Halloween) uses `battle` / `battleMap`. Fine by the table. Map worlds 2..5 and 6 map to the right names in `WORLD_TRACK` by code reading (indexes match SPACE=1, CANADA=2, OCEAN=3, VEGGIE=4, BALLS=5, SPOOKY=6).
- Map create hook: if the map scene redirects to a world comic, it plays the Map track for a moment, then `calm` on the comic scene. Harmless.
- Music after a duel result: `result()` returns to `calm`, then the map create hook plays its Map track (existing test covers world 0 and 1).
- Probe limit: with a fresh save the world tabs 1..5 are closed or show a comic, so I could not confirm the live track for worlds 2..6. Code review only.

## 3. Bug status
### B79 (S4, new): map track only tested for worlds 0 and 1
tests/music.spec.js checks `battleMap` and `spaceMap` only. A wrong `WORLD_TRACK` entry for Canada, Ocean, Veggie, Balls or the Halloween tab would not be caught.
Found by: code only. Fix idea: loop over worlds 2..6 with all worlds opened and comics seen, expect `northMap`, `seaMap`, `gardenMap`, `paradeMap`, `battleMap` via `_want`.

## 4. Layout matrix
Not run. No UI change.

## 5. Ideas for the Playwright suite
- B79 loop above.
- Switch `spaceMap` to `boss` mid-schedule and assert `PSAudio._soft === false` after one tick.
- Spy on `drum`/`hit` while a Map track plays: expect zero calls to create nodes.

## 6. Not tested
- Real device audio (IOS-xx): how the Map tracks sound (80% tempo, 0.75 gain, no drums), and the crossfade on iPhone.
- Online (ON-xx): Kraken live.
- Rotation, bedtime, boosters, layout matrix: not re-run (audio-only change).
