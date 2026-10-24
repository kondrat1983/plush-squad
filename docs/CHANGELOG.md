# Changelog

What happened in Plush Squad, newest on top: game releases (what changed for the player), owner decisions, new or changed docs. Details: [decisions](gdd/decisions.md), [GitHub issues](https://github.com/kondrat1983/plush-squad/issues?q=is%3Aissue).


## 24 Oct 2026
**Game: v1.3.0**
- New free winter season SNOW FORT (1 December to the end of February, test it any time with `?winter`): Waddles the Penguin, Pola the Polar Bear, Dasher the Deer and the boss Sir Frosty the Snowman. It shares world slot 6 with Spooky (only one season at a time, nothing to migrate).
- SNOWBALL!: rivals roll snowballs, tap to jump. Every jump you make puts a snowball on your stack (up to 3); your next throw adds +4 pep per ball. Winter hats (Penguin, Cocoa, Snowman) and 6 stickers, a winter comic, an adventure postcard, a winter title with a garland and a snowman, cocoa in Star Catch, the `snow` music with sleigh bells.
- Sleepy Thully answers an emoji with a Zzz bubble while asleep.
- Decisions: `gdd/decisions.md` (whole winter, neutral theme). Design: `gdd/1.3-snow-fort.md`.

## 21 Oct 2026
**Game: v1.2.0**
- Emoji in duels: a smiley button opens 16 emoji (Fluent Emoji 3D). Jack shows a speech bubble and the rival answers in character (grumpy, shy, cheeky or kind; bosses have their own answers). It never costs the turn and does not change the fight. A 1.2 s cooldown and 3 soft sounds.
- Settings: EMOJI ON / OFF (default ON). When you beat a friend, they see your emoji (up to 6) in their mail.
- Decisions and design: `gdd/1.2-emoji-chat.md`, `gdd/decisions.md`.

## 18 Oct 2026
**Game: v1.1.1 (hotfix)**
- Capsule machine: a SKIP ANIMATION checkbox (remembered on the device) and an OPEN 10 button (with 10 or more capsules) that shows all 10 prizes on one screen.
- Mail: MARK ALL READ. The new-mail badge and popup count only messages not marked yet; gifts stay in the list.
- iPad landscape: My Squad toy page buttons and XP text fit the panel (B70); Adventures postcards are not covered by SAY GOODBYE and the day line is readable (B71).
- Ocean map: the lighthouse no longer stands behind Hermy; Brock Lee: readable log line, small HIDING! stamp; Halloween title: the sticker toast no longer covers the logo (B72). Brock Lee picture: right side of the florets (B69).

## 17 Oct 2026
**Game: v1.1.0**
- New world COUNTRYBALLS (map tab FLAGS): England, Spain, Japan, USA and boss Poland at the Great Round Picnic. COPYCAT!: a ball paints itself like Jack and copies your next move (the nap and the dance make it flop). Poland's PUSH!: help him into space for a Space Pierogi, or he falls on you.
- Pierogi Hat for beating Poland, a parade march, comic "The Great Round Picnic", adventure postcards, 3 stickers, 6 quests, toy badges. Spooky is now world 6 (old saves are moved).
- Ball pictures by Kondrat.

## 11 Oct 2026
**Game: v1.0.0**
- Two new worlds: OCEAN (Hermy, Puff, Jelly, Captain Fog, boss Sleepy Thully; Compass Spin, WAKE UP! / ALARM!) and VEGGIE PATCH (Olly, The Peas, Garlic Gus, Fun-Guy, boss Brock Lee; PEEKABOO!). Comics, hats (Nightcap, Broccoli Hair), music, stickers and quests for both. Boss art by Kondrat.
- Pillow Week daily streak with a Sleepy Pillow (#32); no daily gift at bedtime (#65).
- Toys go on adventures instead of being deleted, with postcards and souvenirs (#47); a real delete also removes the photo from the cloud (#76).
- Toy growth: toy levels, 5th and 6th move, GOLDEN look, badges.
- Settings: music and sound volume, calm mode, left-handed cards, What's new replay.
- Fixes: Cyrillic name filter (#69), mail arrows (#70), Friends tab icon (#71), comic layout (#72, #75).

## 5 Oct 2026
**Game: v0.9.0**
- Comics for every world (#62): Jack lands in Pillow Hills (new players), Space (everyone, once) and Spooky (during Halloween), like the Canada comic. All 4 in the Album COMICS shelf (2 x 2). The open map tab no longer replays a comic; SKIP jumps to the title page.

**Game: v0.8.3 (hotfix)**
- One account on two devices: the newer progress wins on start and when coming back to the app; before, the device that saved last overwrote the other one (#64).

**Docs:** design docs for world comics (#62) and the Pillow Week daily streak (#32), approved by Kondrat.

**Game: v0.8.2 (hotfix)**
- Home Screen web app: top buttons work on the first start.
- Login on a new device (or the re-added web app) now brings the cloud progress; before, it was overwritten by the empty save.
- Cloud save: progress goes up when the app is switched away or opened again, not only after 15 s in the game.

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
