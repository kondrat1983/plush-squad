# Decisions log

Owner decisions (Kondrat). They stand until Kondrat changes them; agents and docs treat them as rules, not bugs. A change is proposed only as an explicit question to Kondrat. Newest on top.

| Date | Decision | Why / notes |
|---|---|---|
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
| 4 Oct 2026 | Owner device notes are fixed in the next release or hotfix (greyed move cards, card icons). | Fixed in the v0.7.8 hotfix, which is in QA (not live yet). |
| before 4 Oct 2026 | **Pillow Kraken pep is fixed at 220** per duel, on every difficulty and level. | Weekly co-op boss, fair for everyone. Its damage still scales (G26). |
| before 4 Oct 2026 | **Toy duels and friend duels scale with level and difficulty**, like rivals. | So own and friends' toys stay a challenge. |
| before 4 Oct 2026 | **Parent gate is the multiplication table** (typed answer, 6–9 × 6–9). Keep it. | Easy for grown-ups, hard for young kids. |
| before 4 Oct 2026 | **Hotfixes never go into What's new.** Only feature releases (major.minor) add lines. | Kids see news, not bug fixes. |
| before 4 Oct 2026 | No shop, no ads, no purchases, no paid currency; capsules only from play, quests and friends. | GDD §2, §15. |
| before 4 Oct 2026 | No chat or free text between players; friends only by code. | GDD §11, §15. |
| before 4 Oct 2026 | Bedtime never interrupts a duel in progress; it is checked on menu screens and before a new duel. | GDD §10, QA B03. |
| before 4 Oct 2026 | Supabase: only the publishable key in the repo; schema changes only by Kondrat in the dashboard; nothing on the live project without his OK. | `CLAUDE.md`. |
