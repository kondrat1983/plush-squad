# Plush Squad v0.8.2 (with v0.8.1) - QA Report

| | |
|---|---|
| **Build** | `origin/main` 03d7236 (Hotfix v0.8.2, PR #61), VERSION / CACHE 0.8.2. Diff checked: `git diff bda9da9..03d7236` (v0.8.0 release merge -> v0.8.2): `js/game.js`, `js/extra.js`, `js/net.js`, `js/toys.js`, `index.html`, `manifest.json`, `sw.js`, icons, 4 new test files. |
| **Date** | 5 Oct 2026 (Halloween ON by date; `?halloween` used where it matters) |
| **Why** | Issue #60: v0.8.1 went live without a full QA run; v0.8.2 followed as a hotfix. This report covers both. |
| **Method** | Code review of the diff, one full `npm test` (port 8765, 2 workers), scripted play in headless Chromium (`?debug`, `setLagSmooth(5000, 33)` after every start). Results ended through the real `finish(won)`. Rotations were real viewport changes. Online parts with a stubbed `PSNet.sb` (no network; `*.supabase.co` blocked). Layout checker + screenshots on D1-D5. No real device, no real accounts. |
| **Bug IDs** | Kept. New: B60-B63. B60 is issue #64 (filed without an ID), now with a repro. |

## 0. Summary

**Verdict: v0.8.1 + v0.8.2 are fine for play on one device. One S2 for kids who use one account on two devices (B60 / #64). The v0.8.2 cloud changes make it happen sooner: opening the app on the second device is now enough to push its old save over the newer one in the cloud.** The rest of v0.8.1 checks out: suite 110 / 110, all 14 result panels right, the layout checker is clean on D1-D5 for every touched screen, and there were 0 page errors in every run. The other findings are small: a gap in the name filter (B61, S3) and two look issues (B62, B63, S4).

| | |
|---|---|
| `npm test` | **110 / 110 pass** (56.0 min, one run) |
| Every battle mode, win + lose (D2) | ✅ 14 / 14 (Timmy, Prof. Hoot, Sasquatch, own toy, friend's toy, friend's Jack, Kraken) |
| v0.8.1 fixes (17 IDs) | ✅ all verified, with notes on B13 (-> B61) and B28 (-> B62) |
| B55, B56, B57 (fixed in v0.8.0 after the last report) | ✅ |
| v0.8.2 launch inset re-check | ✅ insets that settle up to about 4 s after launch are picked up |
| v0.8.2 cloud save | ✅ login keeps the cloud save, logout gives a fresh guest, app switch pushes. ❌ B60 |
| Layout matrix D1-D5 | ✅ checker clean on 14 screens x 5 sizes. ⚠️ B62, B63 by eye |
| Page errors | 0 in every run |
| New | **B60 (S2), B61 (S3), B62 (S4), B63 (S4)** |

**Fix next:** B60 (pull the newer cloud save on start before anything is pushed). Then B61. B62 and B63 can go with the next layout pass.

## 1. Fix verification

| ID / issue | Status | How checked |
|---|---|---|
| B05 / #12 My Squad pages | ✅ | 14 toys, D1-D5: page 1 / 2 with ◀ ▶ (200 x 100), page 2 shows the rest, checker clean (`D1_squad_p1`, `D5_squad_p1`). Page kept in the snapshot data on rotation (code) |
| B07 / #14 Capsule machine rows | ✅ | D3: TURN! beside a smaller machine, both rows of 5 fit above the bottom edge (`D3_gacha`) |
| B11 / #15 Me hint, iPad portrait | ✅ | D3 with 8 hats: hat row and LOG IN text apart (`D3_me`); suite test with no hats |
| B13 / #16 kid-safe names | ✅ / ⚠️ | Suite (Studio asks again, friend names filtered in mail, museum, squad, board). `badName` probed in node with 60 names: English, leetspeak, spacing and repeats are caught. ❌ Cyrillic is not (B61). Some harmless names are blocked (observation) |
| B15 / #17 Parents chart, iPad portrait | ✅ | D3: chart and day letters inside the screen (`D3_parents`) |
| B16 / #18 + B59 / #52 Quests landscape | ✅ | D4, D5: long texts wrap to two lines at 38 game px, button and chips clear (`D5_quests`) |
| B18 / #19 Title panel vs wing on 4:3 | ✅ | D4: level panel left of Jack's wing, with and without a hat (`D4_title_toque`) |
| B19 / #20 Parents YES / NO | ✅ | D1-D5: YES and NO apart, no overlap from the checker (`D1_parents`, `D4_parents`) |
| B22 / #21 one toy worker | ✅ | Suite (`logic081` B22); code: `window.__psToyWorker` kept across `main()`, CANCEL and the 90 s timer drop it |
| B23 / #22 Kraken error | ✅ | `bossStatus` stubbed to reject: "The Kraken is hiding!" with RETRY and BACK on D1-D5 (`D1_boss_err`); suite covers the late answer |
| B27 / #25 press-down feedback | ✅ | Suite (`logic081` B27). Code: loops on the same object are paused while pressed and resumed on release |
| B28 / #26 mail paging | ✅ / ⚠️ | 30 stubbed messages: D1 4 pages, D2 3, D3 6, D4 / D5 8; last page clamps. Arrows are small (B62) |
| B29 / #27 icon + maskable | ✅ | 180 / 192 / 512 px, Jack's face fills the icon; checked with an iOS rounded mask and the 80 % maskable circle: eyes and snout stay inside (`icons.png`). Manifest has separate `any` and `maskable` entries |
| B32 / #28 result notes | ✅ | Notes at 34 game px in every mode with notes (Hoot, Sasquatch 3 notes, Kraken); suite on 5 sizes |
| B38 / #4 tap before rotation | ✅ | Live: tap Timmy on the map, rotate during the fade: rebuilt straight into the duel. Suite too |
| B55 hat vs title panel, 768 x 1024 | ✅ | D3 with witch hat: hat clear of the panel (`D3_title_witch`) |
| B56 Studio CANCEL vs mute | ✅ code | CANCEL now at `W - 310`: right edge `W - 160`, mute starts at `W - 126` (34 px gap) |
| B57 Jack hidden in the snow | ✅ | D4: Jack's legs and tail stick out of the mound (`comic_D4_title`) |
| B58 / #51 comic polish | ✅ | Max's bubble points down at Max, pines inside panel 1, snow ends inside panel 1 (lifespan `h / 160`), D1-D5 |
| #54 Album COMICS switch | ✅ | Real tap on the cover (D2) -> comic, music `calm`, rotate mid panel 3 -> same panel, `then` kept -> SKIP -> DONE! (3 fast taps) -> album on the COMICS tab, 0 errors. Locked card shakes back (suite) |
| v0.8.2 insets after launch | ✅ | `#safe` padding set to 47 / 34 px at 0.3 s, 1.5 s and 3 s after load: rebuilt, top buttons start at 61 css px. Set at 6 s: not picked up (only checks at 0.7, 2 and 4 s). Toasts hold the check until they end (by design) |
| v0.8.2 login keeps the cloud save | ✅ | Suite (`cloudsave` test 3) |
| v0.8.2 logout | ✅ | Stubbed: LOG OUT pushes once, then title with a fresh guest (xp 0, 0 toys, no owner) in memory and in localStorage; map, squad, me open fine |
| v0.8.2 app switch push | ✅ | Suite (`cloudsave` test 2) |
| v0.8.2 `catchUp` | ❌ | Works when nothing was stored at start, but see B60 |

## 2. Regression list results

### Result screen in every battle mode (D2, real `finish(won)`)

| Mode | Win | Lose | Music in duel |
|---|---|---|---|
| Campaign: Timmy | ✅ +40, NEXT RIVAL / MAP | ✅ +10, REMATCH / MAP | `battle` |
| Campaign boss: Prof. Hoot | ✅ +100, Owl Hat note | ✅ +10 | `boss` |
| Campaign boss: Sasquatch | ✅ +220, 3 notes (first win, capsule, toque) at 34 px | ✅ +10 | `boss` |
| Own toy | ✅ +30, REMATCH / SQUAD | ✅ +10 | `battle` |
| Friend's toy | ✅ +35, REMATCH / FRIENDS | ✅ +10 | `battle` |
| Friend's Jack L5 | ✅ +35, REMATCH / FRIENDS | ✅ +10 | `battle` |
| Kraken | ✅ +60, BOSS / MAP, "hit for 220" | ✅ +10, BOSS / MAP | `boss` |

Every panel: `calm` after the panel, checker clean, 0 errors. Suite `result.spec.js` green.

### Rotation

| Case | Result |
|---|---|
| Mid-turn | ✅ held (`__psRotatePending`), applied at YOUR TURN, pep values kept, landscape |
| During the fade into a duel (B38) | ✅ rebuilt into the duel |
| Comic from the album, mid panel | ✅ same panel, `then` = album |
| Studio | ✅ blocked; leaving to the title applies it |
| Between turns, final move, result panel, Star Catch | ✅ suite `rotate.spec.js` 8 / 8 (code for Star Catch unchanged) |

### Bedtime / daily limit

✅ Bedtime set during a duel: the duel finishes, the panel shows, NEXT RIVAL goes to Bedtime. Album (COMICS tab) goes to Bedtime. Not re-tested: #65 (daily capsule given when the map opens into Bedtime), already in the tracker.

### Boosters

✅ Suite (B30 refund before a move, spent after a move, twice in one session; B01 picker on 5 sizes). The diff only adds press-down to the picker cards.

### Music

✅ Per rival as above; comic and album `calm`. Suite `music.spec.js` (one bus after rotation) green.

### Map start world

✅ Suite `map.spec.js` (fresh player, `lastWorld`). Code unchanged.

## 3. Bug status

**Fixed and verified:** B05, B07, B11, B13 (see B61), B15, B16, B18, B19, B22, B23, B27, B28 (see B62), B29, B32, B38, B55, B56, B57, B58, B59.

**Still open:** B26 (issue #24 is closed, but small touch targets remain: B62; album sticker descriptions are 12-14 game px in landscape, about 5 css px on D5).

**Earlier open notes, re-checked:**
- **Comic BACK button:** still none. From the album the way out is SKIP, then DONE! (two taps). SKIP now marks the comic as seen. A tap on the open Canada map tab still replays the comic; with the album replay in place, that map-tab replay could go [? Kondrat].
- **What's new text size:** unchanged, body text 24 game px (about 8 css px on an iPhone).
- **NEXT RIVAL after Sasquatch during Halloween:** unchanged. With the event on (today, by date), NEXT RIVAL after a Sasquatch win leads to Pumpkin Pete in the Spooky world, with no "new world" note. Needs Kondrat's call (keep, or show MAP as the main button after the last Canada rival).

### New

**B60 - Two logged-in devices overwrite each other's progress; v0.8.2 makes it happen on app start** · S2 [?] · `js/net.js` `Net.init()` / `catchUp()` / `PSOnSave`; `js/game.js` `rebuild()`; `js/extra.js` `todaysQuests()` · issue #64 (please rename it "B60: ...")
- Steps: one account, logged in on device A (iPad) and device B (iPhone). Play on A (cloud gets A's progress). Next day, open B and touch nothing.
- Expected: B shows A's progress, or at least does not send its own older save to the cloud.
- Actual: B never pulls the cloud save with a kept login (#64). New in v0.8.2: any save store at start bumps `savedAt` to now, and `catchUp()` then thinks the local save is newer. Two start-up stores happen on real devices:
  1. the first start of a day: `todaysQuests()` stores the new quests; `catchUp()` pushes B's save 5 s after launch;
  2. a launch rebuild (the v0.8.2 inset re-check, the exact iOS case it targets): `rebuild()` stores, which arms the 15 s push.
  In both cases B's old save (xp 1500) replaced A's newer one (xp 9999) in the cloud. If the kid then re-adds the web app or logs in again, the newer progress is gone.
- Seen: live with a stubbed `PSNet.sb` (cloud `savedAt 2000, xp 9999`, local `savedAt 1000, xp 1500`). Same day, no rebuild: no push (correct). New day: `saves:upsert xp=1500` at once. Launch rebuild: `saves:upsert xp=1500` after 15 s.
- Severity: S2 as in #64. It is S1 (lost progress) if the chief tester uses one account on both her iPhone and iPad [? Kondrat].
- Also: `Save.store()` writes localStorage before `PSOnSave` sets `savedAt`, so the stored `savedAt` is always one store behind the one in memory.
- Fix idea: on start (after `loadProfile`) and on `visibilitychange` back to visible, fetch the cloud row before any push. If cloud `savedAt` > local, apply it (`applyCloud` + rebuild); push only when local is newer. Do not bump `savedAt` for stores that carry no progress (quests roll-over, rebuild), or keep a separate `progressAt`. Set `savedAt` before writing localStorage.

**B61 - The kid-safe name filter lets Cyrillic swear words through** · S3 · `js/toys.js` `badName()` (also used by `js/net.js` `okName` / `okToy`)
- Steps: + ADD A TOY, name the toy with a Russian swear word in Cyrillic (for example the Cyrillic forms of the words already on the list as `xyu`, `suka`, `blyat`), SAVE. Or a friend's toy with such a name in the museum.
- Expected: blocked like the Latin forms on the list.
- Actual: `badName` lower-cases, strips accents, then splits on `[^a-z]+`, so every Cyrillic letter is a separator and the name has no words left to check. All three Cyrillic words pass; their Latin forms are blocked. Mixed scripts (Latin letters inside a Cyrillic word) pass too.
- Seen: code + node run of `js/toys.js` with 60 names.
- Fix idea: map Cyrillic look-alikes to Latin (а->a, е->e, о->o, р->p, с->c, у->y, х->x, к->k, ...) and add the Cyrillic stems to the list, or split on non-letters with `\p{L}` and check a Cyrillic list too. Add the cases to the B13 test.
- Observation (no ID, Kondrat to decide): some harmless names are blocked: "Shiitake" (repeat-collapse makes "shitake"), "Swanky" (wank), "Snigglet", "Blue Tit" (a bird), "Die Hard", "Moby Dick", "Big Dumb Bear", "Stupid Cupid". The kid sees "Let's pick a kinder name!" and the arch nickname in the box.

**B62 - Mail page arrows are tiny and the pager drifts away from the list** · S4 · `js/net.js` `FriendsScene.showMail()` (`button(..., 120, 64, '◀' ...)`, page label 30 px)
- Steps: 9+ messages in MAIL, iPhone portrait or landscape.
- Expected: page arrows like My Squad and the Sticker Album (200 x 100, label 40 px); touch targets at least 90 game px (B26).
- Actual: ◀ ▶ are 120 x 64 game px, about 42 x 22 css px on an iPhone, label "1 / 4" about 10-11 css px (`D1_mail_p1`, `D5_mail_p1`). The pager sits under a full page; on a short last page it stays at the bottom of the screen, far from the last message (`D2_mail_last`).
- Seen: live (stubbed inbox), D1-D5.
- Fix idea: `button(..., 200, 100, ..., { size: 48 })` and a 40 px label, as in SquadScene.

**B63 - Friends: the star icon covers the "T" of TOP CATCH** · S4 · `js/net.js` `FriendsScene.create()` tabs (`['top', 'TOP CATCH', 'star']`, `iconScale(ic, 50)`)
- Steps: open FRIENDS on an iPhone (portrait or landscape).
- Expected: icon left of the label like the other three tabs.
- Actual: the star is drawn larger than the other tab icons and overlaps the first letter of TOP CATCH (`D1_mail_p1`, `D2_mail_last`, `D5_mail_p1`). Not part of this diff; first noticed now.
- Seen: live.
- Fix idea: use an icon from the emoji atlas (`j:star` [?]) or scale `star` to about 40 px; or fit the label to `tw - 90`.

### Observations (no ID)

- **Inset re-check window:** checks run at 0.7, 2 and 4 s after launch (plus `pageshow` / `orientationchange`). An inset that settles later is not picked up until the next resize. Needs a real Home Screen app to know if 4 s is enough (IOS item).
- **What's new can flash:** when a launch rebuild happens while What's new is open (it shows 0.9 s after the title), the popup disappears and does not come back this launch (`__psWN` already set). It shows again on the next launch, since `seenVersion` is not set. Very small.
- **Parents shows 4 quests at a time** while Quests says "GROWN-UP: CHECK (5)". The 5th shows after one is checked. Same as before.
- **`apple-touch-icon.png?v=0.8.1`** is not in the service worker's file list (the list has the name without `?v=`). Online it loads from the network; only matters offline. No action needed.

## 4. Layout matrix

Save: Jack L15, 32 / 48 stars, 14 toys, 27 stickers, all 10 boosters, 9 hats (toque on), 5 pending quests with the longest texts, 7 days of play time, 30 stubbed mail messages. Checker: text and interactive objects outside `0..W x 0..H`, overlapping interactive objects at the same depth. Toasts sliding in from above were ignored.

| Screen | D1 SE | D2 14 | D3 iPad P | D4 iPad L | D5 14 L |
|---|---|---|---|---|---|
| Title, toque / no hat / witch hat | ✅ | ✅ | ✅ (B55 fixed) | ✅ (B18 fixed) | ✅ |
| My Squad page 1 / page 2 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Capsule machine | ✅ | ✅ | ✅ (B07 fixed) | ✅ | ✅ |
| Me, 9 hats | ✅ | ✅ | ✅ (B11 fixed) | ✅ | ✅ |
| Album stickers | ✅ | ✅ | ✅ | ⚠️ desc 12 px (B26) | ⚠️ desc 14 px (B26) |
| Album comics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quests | ✅ | ✅ | ✅ | ✅ (B16 fixed) | ✅ (B16 fixed) |
| Parents | ✅ | ✅ | ✅ (B15 fixed) | ✅ (B59 fixed) | ✅ |
| Mail page 1 / last page | ⚠️ B62, B63 | ⚠️ B62, B63 | ⚠️ B62 | ⚠️ B62 | ⚠️ B62, B63 |
| Weekly Boss error | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comic panels + title page | ✅ | ✅ | ✅ | ✅ (B57, B58 fixed) | ✅ |
| Result panel, all modes | | ✅ | suite | suite | suite |

## 5. Ideas for the Playwright suite

| # | Catches | Repro |
|---|---|---|
| T51 | B60 (new day) | Save `owner 'u1', savedAt 1000`, `quests.date` = yesterday; stub `PSNet.sb` with cloud `{ savedAt: 2000, xp: 9999 }`; boot, `await PSNet.catchUp()`: no `saves:upsert`, and after the fix `__save.data.xp === 9999` |
| T52 | B60 (launch rebuild) | Same save with today's quests and all stickers; set `#safe` padding, `__psTryRebuild()`; wait 16 s: no `saves:upsert` |
| T53 | B61 | Add the Cyrillic forms and a mixed-script form to the B13 list: `badName(...)` is true |
| T54 | B62 | 30 stubbed messages, 390 x 844: ◀ / ▶ containers at least 90 game px tall |
| T55 | B63 | FRIENDS tabs: the icon's right edge < the label's left edge for all four tabs |
| T56 | Insets after launch | Set `#safe` padding 47 px at 1.5 s after load: `__psInsets.t === 47` and the first nav button's top >= 47 css px |
| T57 | Logout | Stub `sb.auth.signOut`, LOG OUT on Me: title, `__save.data.xp === 0`, localStorage the same, 0 errors |

## 6. Not tested

- **Real devices (IOS-xx):** the inset re-check on a freshly added Home Screen app (does iOS settle within 4 s?), the new icon on the Home Screen (iOS caches the old one; re-add the app), press-down feel with real fingers, What's new and mail arrow sizes on a real iPhone.
- **Online (ON-xx):** real login / logout / app switch against Supabase, two real devices on one account (B60), kid-safe names arriving from a real friend, the Kraken RETRY after a real RPC error, mail paging with 30 real messages.

## Follow-up (5 Oct 2026)

B60 (#64) is fixed in v0.8.3 (PR #66): nothing is pushed before the first sync, and a newer cloud save wins on start and on return to the app.
