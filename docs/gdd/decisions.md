# Decisions log

Owner decisions (Kondrat). They stand until Kondrat changes them; agents and docs treat them as rules, not bugs. A change is proposed only as an explicit question to Kondrat. Newest on top.

| Date | Decision | Why / notes |
|---|---|---|
| 5 Oct 2026 | **Ocean world (sketch, `ocean-ideas.md`):** tone = cozy mystery (fog, lighthouse, Sargasso ship park, the picnic crew of the "Mary Pillowste"); boss = Sleepy Thully (cute plush Cthulhu in a nightcap, the fight is about waking him up); mechanic = Compass Spin (nothing moves on EASY); own music = a `sea` shanty plus a lullaby while the boss sleeps. Seagulls are never hit (funny thieves only). | Kondrat, answers 1-4. Full design doc later. |
| 5 Oct 2026 | **Comics for every world** as in `0.9-world-comics.md`, all recommendations: 3 panels + title page; Hills plays for new players only (old saves get it unlocked in the Album); Space once for everyone; Spooky during the event only, cover hidden out of season unless seen; no NEW chip, no comic sticker; titles as proposed. | Kondrat (#62). |
| 5 Oct 2026 | **Daily streak "Pillow Week"** as in `0.9-daily-streak.md`, all recommendations: a day counts at the first map open; replaces the daily capsule; 9 capsules + 1 golden + 140 XP a week; one Sleepy Pillow a week, quiet restart; popup on the map from day 2 + one line in Me; "Pillow Week" sticker; no Parents switch; cloud streak fetched before counting. | Kondrat (#32). |
| 5 Oct 2026 | **Order:** fix #64 (two devices overwrite progress) first, then world comics, then the streak. | Kondrat. |
| 4 Oct 2026 | **Toys "go on an adventure" instead of being deleted** moves to **v0.9** (GitHub issue #47; not the QA bug B47). | Not part of v0.8. Needs a design doc first. |
| 4 Oct 2026 | **Bug #48** (QA B50, REMOVE button too small in My Squad) ships **in v0.8**. | Fixed on `claude/v0.8-finish`. |
| 4 Oct 2026 | **Gift toast for migrated hats: yes.** Hats given to old saves by the v0.8 migration (Owl Hat, Bat Hat, Royal Crown) are announced once on the first menu screen ("A GIFT: ... Thank you for playing!"). No toast for the crown to old Dragon Boss winners, who already saw it in Me. | QA B43. |
| 4 Oct 2026 | **Umbrella Hero sticker: yes** (block the Tractor Beam 5 times). | Answer to `0.8-space-rework.md` question 7. Mini Beam blocks count (G38). |
| 4 Oct 2026 | **Sasquatch art by Kondrat** (made with an image AI; plush look as in `0.8-canada.md` [?]). | `assets/sasquatch.png`. |
| 4 Oct 2026 | **Canada rivals use Fluent Emoji 3D art:** Max 🫎, Beaver Bob 🦫, Mountie Bear 🐻 (face, no Mountie hat). | Same MIT source as the rest of the cast. |
| 4 Oct 2026 | **Royal Crown = Superstar reward** (all 24 stars in Pillow Hills + Space). Players who already own it (old Dragon Boss winners, Count Fang before v0.8) keep it. | Answer to space-rework question 4. |
| 4 Oct 2026 | **Boss hats:** Professor Hoot gives a **green Owl Hat** (a small green owl); the Mothership a **UFO Hat**; Count Fang a **Bat Hat**, winnable **only during the Spooky event**; Sasquatch a **red Canada Toque with a maple leaf** (instead of the Canada flag in `0.8-canada.md`). | Final list as shipped in v0.8. |
| 4 Oct 2026 | **Mothership signature = option 2 "Fire or Beam?"** (extinguisher for Inferno Rain, umbrella for the Tractor Beam; EASY gets one always-right BLOCK IT!; a missed beam takes one limited card on NORMAL / HARD). | Option 1 (reskin) dropped. |
| 4 Oct 2026 | **v0.8 design answers** (questions in `0.8-space-rework.md` and `0.8-canada.md`): UFO signature is option (b) "Fire or Beam?" (extinguisher vs umbrella, one always-right button on EASY); names The Blips, The Mothership, Dragon on holiday are OK; old Dragon Boss winners get Canada open; Royal Crown stays with owners and becomes the reward for the Superstar sticker; owl hat and bat hat are given to players who already beat Hoot / Fang; "Dragon vs Dragon" sticker now means "beat a friend's Jack" (owners keep it); the bat hat is only winnable during the Spooky event; Sasquatch costume = **red toque with a maple leaf**; owl hat = **a small green owl** on the head; Sasquatch art made with an image AI; retro comics for Space / Pillow Hills later (v0.8.x); Pond Hockey friends board later; no new Canada move for Jack in v0.8. | Kondrat, answers 1-13. |
| 4 Oct 2026 | **v0.8 world is Canada.** The boss is **Sasquatch**, not Big Foot. | Kondrat picked from `0.8-world-pitch.md`. |
| 4 Oct 2026 | **Boss costumes for every world:** Professor Hoot gives an owl hat; the Space UFO boss gives a UFO hat; Count Fang gives a bat costume (instead of the crown); Sasquatch gives a red toque with a maple leaf (changed from the Canada flag the same day). Costumes already owned stay. | Replaces the earlier "Dragon Crown" pick (dropped the same day with the Space rework). |
| 4 Oct 2026 | **Space rework in v0.8:** Robo-Bop and Boo stay; Polandball is replaced by Aliens 👽, the Giant Dragon Boss by a UFO boss 🛸 (new moves, lines, stickers). Design: `docs/gdd/0.8-space-rework.md`. | Polandball and the Dragon Boss do not fit the Space theme. |
| 4 Oct 2026 | **v0.8 = Canada + Space rework + boss costumes + comic arrival popup.** v0.7.8 is already live. | |
| 4 Oct 2026 | **The new world is harder than Space:** +10 pep per slot vs Space (boss 210), NORMAL scaling from L6 with the Space slope and caps; EASY unchanged. | Answer to "too easy". |
| 4 Oct 2026 | **Kraken damage keeps scaling** with difficulty and level; only its pep is fixed at 220 (G26). | Confirmed as is. |
| 4 Oct 2026 | Process: `game-designer` agent → development → `/code-review` → `qa-tester` agent → Kondrat's OK → merge. | QA and the GDD live in the repo (`docs/qa/`, `docs/gdd/`). |
| 4 Oct 2026 | Merge to `main` only after Kondrat's OK. One-off exception for the v0.7.8 hotfix only: merge without asking if QA finds nothing new, then tell him. | Merge = live in about a minute. |
| 4 Oct 2026 | A rotation during the end of a duel waits until the result celebration (stars, XP count, LEVEL UP!) has played, then the panel switches to the new layout. | QA B36, option 1 of 2. |
| 4 Oct 2026 | Owner device notes are fixed in the next release or hotfix (greyed move cards, card icons). | Fixed in the v0.7.8 hotfix (live). |
| before 4 Oct 2026 | **Pillow Kraken pep is fixed at 220** per duel, on every difficulty and level. | Weekly co-op boss, fair for everyone. Its damage still scales (G26). |
| before 4 Oct 2026 | **Toy duels and friend duels scale with level and difficulty**, like rivals. | So own and friends' toys stay a challenge. |
| before 4 Oct 2026 | **Parent gate is the multiplication table** (typed answer, 6–9 × 6–9). Keep it. | Easy for grown-ups, hard for young kids. |
| before 4 Oct 2026 | **Hotfixes never go into What's new.** Only feature releases (major.minor) add lines. | Kids see news, not bug fixes. |
| before 4 Oct 2026 | No shop, no ads, no purchases, no paid currency; capsules only from play, quests and friends. | GDD §2, §15. |
| before 4 Oct 2026 | No chat or free text between players; friends only by code. | GDD §11, §15. |
| before 4 Oct 2026 | Bedtime never interrupts a duel in progress; it is checked on menu screens and before a new duel. | GDD §10, QA B03. |
| before 4 Oct 2026 | Supabase: only the publishable key in the repo; schema changes only by Kondrat in the dashboard; nothing on the live project without his OK. | `CLAUDE.md`. |
