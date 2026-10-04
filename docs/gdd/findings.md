# GDD findings (G-IDs)

Places where the GDD and the code disagree. The code is the truth unless a finding says the code is wrong. G01-G22 are from earlier GDD reviews (kept outside the repo [?]); new IDs continue from the highest one here.

Status: **fixed in GDD** = the markdown GDD already says what the code does; **open** = needs a code change or a decision.

| ID | Where in GDD v0.7 (PDF) | GDD said | Code does (v0.7.7) | Status |
|---|---|---|---|---|
| G23 | §9 Where capsules come from | Gift from a friend: 1 per friend per day | A player can send 1 capsule a day in total, to any one friend (`send_inbox`, limit `gift_capsule` = 1). §11 of the same PDF already said "1 capsule a day". | fixed in GDD |
| G24 | §7 note under the rivals table | Toy duels and friends' toys use the toy's own pep | The toy's own pep (95-130) is the base, then the same difficulty and level scaling as rivals is applied (`hpMul` / `dmgMul` in `Battle.setup`; only the Kraken's pep is left out, see G26). Matches the owner's decision. | fixed in GDD |
| G25 | §8 Difficulty | Space scales from level 4 and caps at pep 1.25, damage 1.2 (no slope) | Slope is pep +0.05 and damage +0.04 per level from level 4. Spooky scales like Pillow Hills. | fixed in GDD |
| G26 | §7, §8 | Kraken "220 per duel"; difficulty table applies to all rivals | Kraken pep is always 220 (no difficulty, no level), but its damage is scaled by difficulty and level like other rivals. | fixed in GDD; Kondrat 4 Oct: keep it (decisions.md) |
| G27 | §12 Screens | Every duel ends with NEXT RIVAL / REMATCH | Since v0.7.7 the Kraken result shows BOSS (back to the Weekly Boss screen) instead of REMATCH (B33). | fixed in GDD |
| G28 | §8 XP sources | Lists rival wins, first win, loss, friend's toy, Star Catch, quest | Also: own toy duel win 30 XP, Weekly Kraken win 60 XP. | fixed in GDD |
| G29 | §12 UX principles | Buttons at least 90 px tall | Some touch targets are smaller (QA B26, open). | open (code) |
| G30 | §12 UX principles | Every tap presses the button down within 100 ms | Not every button has press-down feedback (QA B27, open). | open (code) |
| G31 | §1 Executive summary | Status: v0.6 live, v0.7 ready to ship | v0.7.7 is live (4 Oct 2026). | fixed in GDD |
| G32 | §8 Unlocks | Costumes from event rivals and the Dragon Boss | Only the four Spooky rivals give costumes (pumpkin, top hat, witch hat, Count Fang's crown). The Dragon Boss wears a crown in the art but gives no costume. | open (code): Kondrat 4 Oct: yes, the Dragon Boss gives a costume; design by `game-designer` |
| G33 | §7 intro | Rivals have 4–5 moves | 3–5: Timmy the Tiger has 3. | fixed in GDD |
| G34 | §7 table, §17 Seasons | Spooky event in October | `EVENT_ON` keeps it on from 1 October to 7 November (and with `?halloween`). | fixed in GDD |

To check after v0.7.8 ships: §12 / §14 rotation text should mention that a rotation waits until a duel turn, the result celebration or a sticker toast is over (B31, B35, B36, B37).
