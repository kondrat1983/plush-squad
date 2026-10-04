# Decisions log

Owner decisions (Kondrat). They stand until Kondrat changes them; agents and docs treat them as rules, not bugs. A change is proposed only as an explicit question to Kondrat. Newest on top.

| Date | Decision | Why / notes |
|---|---|---|
| 4 Oct 2026 | **Giant Dragon Boss gives a costume** when beaten (G32). Which costume: `game-designer` proposes, Kondrat picks. | Like the Spooky rivals; the old GDD promised it. |
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
