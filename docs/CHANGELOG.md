# Changelog

What happened in Plush Squad, newest on top: game releases (what changed for the player), owner decisions, new or changed docs. Details: [decisions](gdd/decisions.md), [GitHub issues](https://github.com/kondrat1983/plush-squad/issues?q=is%3Aissue).


## 5 Oct 2026
**Game: v0.8.1 (hotfix)**
- New Home Screen icon: a close-up of Jack's face (re-add the app to see it on iPhone).
- Sticker Album: STICKERS / COMICS switch to watch the Canada comic again.
- Layout fixes: My Squad pages, capsule machine, Me, Parents, Quests, title on 4:3 iPads, bigger result notes.
- Fixes: tap after rotation, kid-safe names, Kraken error with RETRY, press-down feedback, mail pages.
- Full QA run on v0.8.1 still to do (released early, owner's call).
## 4 Oct 2026 (evening)
**Game: v0.8.0** (release PR from `claude/v0.8`, live after Kondrat's OK)
- Canada world: Max the Moose, Beaver Bob, Mountie Bear, Sasquatch; SLAPSHOT + SAVE IT!; Pond Hockey; arrival comic (#31).
- Space rework: The Blips and The Mothership; "Fire or Beam?" with FOAM! / UMBRELLA! (parts 2 and 3, PRs #46 and #49).
- Boss hats (part 1, PR #42), 5 new stickers including Umbrella Hero (Kondrat: yes), 6 new quests, What's new 0.8.
- Bugs fixed: #13 (B06 album pages), #43 (B41 photo CANCEL), #45 (B44 title layout), #48 (B50 REMOVE button), and QA B42-B49.
- QA reports in `docs/qa/`: part 1 (hats), part 2 (Space), part 3 (Fire or Beam), parts 4-5 (Canada + SAVE IT!), parts 6-7 (comic, hockey, finish).

## 4 Oct 2026
**Docs and process**
- Docs website with menu and search (this site).
- GitHub issues and the "Plush Squad" project board are the only tracker.
- Process: `game-designer` → development → `/code-review` → `qa-tester` → Kondrat's OK → merge. Questions to Kondrat as tap-to-answer buttons.
- GDD v0.7 moved from the PDF into the repo; decisions, ideas and GDD-vs-code findings (G23-G36) added.
- CI test timeout raised to 45 min.

**Decisions (Kondrat)**
- v0.8 = Canada (boss Sasquatch) + Space rework (The Blips replace Polandball, The Mothership UFO replaces the Dragon Boss) + boss hats + comic arrival popup.
- Boss hats: green Owl Hat (Prof. Hoot), UFO Hat (Mothership), Bat Hat (Count Fang), red toque with a maple leaf (Sasquatch). The Royal Crown becomes the Superstar sticker reward.
- Mothership signature: "Fire or Beam?" (extinguisher or umbrella). Canada is harder than Space (+10 pep per slot, scaling from level 6).
- Kraken damage keeps scaling; its pep stays 220.

**In progress: v0.8** (built on the `claude/v0.8` branch, goes live in one release)
- Part 1/7: boss hats and save migration (PR #42).
- Sasquatch art made with an image AI.
- Bug #43 (no CANCEL while a toy photo is processed) will ship with v0.8.

**Game: v0.7.8 (hotfix, live)**
- Turning the phone at the end of a duel: the result panel follows the new layout, rewards are never lost or doubled, the stars / XP / LEVEL UP! celebration plays first, sticker toasts are kept.
- Greyed-out move cards have no strips; icons sit inside the cards.

**Game: v0.7.7 (hotfix)**
- Booster refund works in every duel; the Kraken result sends you to the Weekly Boss screen; turning the phone no longer restarts the duel music.

## 3 Oct 2026
**Game: v0.7.6**
- Duel and boss music; fix for a result screen crash in friend and Kraken duels.
