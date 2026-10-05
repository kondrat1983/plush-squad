# Ocean world: idea sketch

Status: **sketch, not a design doc.** Nothing here is approved. It becomes a plan through a full design doc (`<version>-ocean.md`) and Kondrat's OK. Date: 5 Oct 2026.

Inputs: Kondrat (Bermuda Triangle, Sargasso Sea ship park, a Mary Celeste style ship, fog, lighthouse, seagulls, a sleepy plush Cthulhu boss), the chief tester ("too easy", Ocean was a first world wish), the older Ocean pitch in `0.8-world-pitch.md` (Mega Shark, SURF'S UP!, Shell Dive). Mood books: classic kids' sea-mystery books, Andre Norton's "Sargasso of Space", Jules Verne, Stevenson.

## 1. Mood in one paragraph

Jack flies into a warm foggy sea where compasses get giggly and spin. A lighthouse blinks on the horizon, seagulls steal snacks, and old plush ships rest in a soft seaweed "ship park" (the Sargasso Sea, but cozy: nobody is lost, the crews just went on a picnic). Deep below, in sunken Snoozeville (R'lyeh), a huge plush Cthulhu is having the longest nap in history. Jack's job: wake him up for a pillow fight. He is grumpy in the morning. Mystery, never horror.

## 2. Does "Triangle" repeat another world mechanic?

What the code does today (`js/game.js`):

| World | Signature | What it does |
|---|---|---|
| Pillow Hills | none (classic moves) | |
| Space | Inferno Rain + Tractor Beam, BLOCK IT! (extinguisher / umbrella) | rival charges one turn, kid picks the right tool; the beam takes one limited card until the end of the duel (`beamed`). On HARD the two tool buttons **swap sides** at random (`toolSwap`). |
| Canada | SLAPSHOT + SAVE IT! | timing tap when the puck comes. Maple syrup is only Mountie Bear's `dizzy` move "STICKY!" (skip a turn), not a world rule. |
| Spooky (event) | none, uses `dizzy` and `nap` | |

Verdict: the Triangle (compass spins, move cards swap places for one turn) **does not repeat maple syrup** (that is a plain skip-a-turn). It **partly overlaps** with Space: HARD `toolSwap` already moves buttons around, and the Tractor Beam already messes with your cards. It is also a pure "confusion" rule: a 6-year-old who knows the cards by position gets lost, a 10-year-old just reads the cards again. That makes it annoying more than hard [?].

Proposed variant, **"Compass Spin"** (keeps the owner's idea, adds a reason to look):
- Warning first: fog rolls in and a compass chip by the rival spins for one turn ("THE TRIANGLE IS TINGLING..."). Same pattern as the charge turn, so kids know it.
- Next player turn: two cards (NORMAL) or the whole grid (HARD) slide to new places, with a visible slide, and get a small compass badge. One of the moved cards glows: **LUCKY CURRENT, +5 on this hit**. So the kid wants to find it, not just survive the mess.
- After that turn the cards slide back.
- EASY: no swap at all, only the spinning compass and one glowing +5 card. Nothing moves under a small finger.
- The swapped order must go into `snapshot()` for rotation [?].

Option B, if Kondrat prefers no moving cards: **"Fog Bank"**: fog covers two cards for one turn (title shows, icon hidden); a tap on a fogged card blows the fog away and plays it normally. Smallest code change, but weaker [?].

## 3. Seagulls (owner's rule: nobody hurts them)

Seagulls are not rivals and are never hit. They are cheeky snack thieves.
- **Gull Swoop:** at most once per duel (NORMAL / HARD; EASY: it only flies past and drops a feather, no theft). A gull squawks and circles over Jack for one turn: "SQUAWK! Is that a DUMPLING?"
- **Being careful:** tap the gull to toss it a cracker. It catches the cracker, says "THANKS, MATEY!" and flies off happy. That is feeding, not hitting. Or just use the eyed thing this turn.
- **Not careful:** it snatches your booster bonus (Lucky Star, Rocket Start) or, with no booster, one snack card (Dumpling / Warm Milk). It brings it back after the duel with a feather as a sorry gift. Close to the beam rule, so keep the window wide (no timing skill, unlike SAVE IT!).
- Also: map ambience (gulls bobbing on the water) and a Shell Dive hazard idea (a gull steals one shell, laughs, drops it back).

## 4. Rivals (designer's pick: 4 rivals + boss)

Numbers are first guesses for a later sim. Current Canada slots for reference: Max 145 / 130 XP, Bob 155 / 140, Mountie 165 / 150, Sasquatch 210 / 200 (`js/game.js`). Canada scales from level 6 (`from = 6`, pep +5% per level up to x1.25, damage +4% up to x1.2). Ocean idea: +10 pep per slot, scaling from level 8 [?].

| # | Rival | Look | Pep / XP [?] | Personality | Signature moves (existing types) |
|---|---|---|---|---|---|
| 1 | **Hermy the Hermit Crab** | 🦀 crab, new Fluent cut-out, a teacup on his back as a shell [?] | 155 / 150 | House-proud, changes shells all the time. "This one is a TEACUP!" | Pinch-Tickle `multi` 2 x 7-11; Sideways Dash `rush`; Shell Swap `shield`; **Mini Compass** (teaches the Triangle once, mini) |
| 2 | **Puff the Pufferfish** | 🐡 blowfish, new Fluent cut-out | 165 / 160 | Nervous, puffs up when surprised, deflates with a toot. | PUFF UP! `shield` (high weight); Bubble Blast `spray` (atlas `bubble`); Bouncy Ball `hop`; deflate "PFFFT!" `roar` |
| 3 | **Jelly the Jellyfish** | 🪼 jellyfish, Fluent 3D has it? [?], fallback a tinted drawn dome | 175 / 170 | Dreamy, glows, talks very slowly. "Bzzzt... tickly..." | Tickle Zap `dizzy` (the stun, 2 uses); Glow Dance `dance`; Wiggle Tickle `multi` 4 x 4-7 |
| 4 (mini-boss) | **Captain Fog** | a puffy fog cloud wearing a captain's cap (`cloud.png` + `cap.png`, both exist) | 185 / 180 | Skipper of the plush ghost ship "Mary Pillowste". The crew is on a picnic. Gets sleepy on watch. | FOG HORN! `roar` (`honk` exists); Fog Bank `shield`; Full Compass Spin; **Captain's Nap** (mini Big Yawn, teaches ALARM! once) |
| Boss | **Sleepy Thully** (plush Cthulhu) | custom art by image AI (prompt below) | 230 / 220 [?] | Huge, soft, grumpy in the morning. "Five more minutes..." | see section 5 |

**Ghost captain vs Boo.** Boo the Space Ghost already uses `ghost.png`, the `ghostly` fade and a BOOO! roar. A ghost captain with the same art and fade would feel like Boo in a hat. Twist: Captain Fog is not a ghost at all, he is fog. The ship only *looks* empty because the fog is the captain. Cheap art (two existing images), and it links to the fog and the lighthouse.

Laugh lines all end with giving up and giggling, for example Puff: "Puff giggled so hard he went PFFFT and floated away like a balloon."

## 5. Boss: Sleepy Thully and "WAKE UP!"

**Look, clearly not the Pillow Kraken:**

| | Pillow Kraken (weekly) | Sleepy Thully |
|---|---|---|
| Colour | pink / orange (`0xff9ed8`) | sea-green with a lilac belly [?] |
| Body | round head, tentacles below | sitting plush, small felt bat wings, short tentacle "moustache", striped nightcap |
| Mood | bubbly, tickles | sleepy, grumpy, then very sorry |
| Moves | Tentacle Tickles, Ink, BLUB BLUB! | snore, yawn, flop; no ink, no BLUB |
| Sound | `boo`, `whoosh` | `snore` (exists), new grumble and alarm |
| Pep | fixed 220 (owner decision) | world boss, scales like other bosses |

**Mechanic "WAKE UP!" (sketch):**
1. **Asleep at the start.** Zzz chip, `snore` sound. He does not attack, he only snores. A dream bubble makes hits do half. A **Wake-o-meter** fills with every hit; louder moves fill it faster [?]. Full meter (EASY 2 hits, NORMAL 3, HARD 4 [?]): "WHO WOKE ME UP?!", boss music starts.
2. **Grumpy phase.** Normal attacks: Flap Flop `quake`, Tentacle Tuck-In `multi` 3 x 7-11 ("tucks Jack in with a blanket"), Bubble Snore `spray`, GRUMBLE! `roar`.
3. **Big Yawn (charge).** "Five more minutes..." If nobody stops him, he falls back asleep: +30 pep and the dream bubble returns. Counter: an **ALARM!** button (`j:alarm` icon exists) in the BLOCK IT! spot: it rings, he jumps "I'M UP! I'M UP!" and is dizzy for one turn.
4. Why it is new: in Space and Canada a missed block **hurts you**. Here a missed ALARM! **hurts nobody**, the duel just gets longer. Gentle for a 6-year-old, but on HARD (3 yawns, 4-hit meter) a lazy player cannot win by just mashing pillows [?].

| | EASY | NORMAL | HARD |
|---|---|---|---|
| Wake-o-meter | 2 hits | 3 hits | 4 hits |
| Big Yawn uses | 1, ALARM! pulses | 2 | 3, and the ALARM! button sits among other tools [?] |
| Dizzy cancels the yawn | yes | yes | no |

**Reward:** Thully's striped **Nightcap** costume (drawn on canvas like the toque [?]), sticker "Good Morning!" (wake Thully 3 times) [?]. Fits Jack's nap theme and the Sleepyhead sticker.

**Kid safety:** no "elder god", madness, cultists, dark water or glowing eyes. Big soft eyes, nightcap, pillow. Name for kids: "Sleepy Thully" with "Cthulhu" only in the intro joke [?]. The Lovecraft story is public domain in the US since 2024 [?].

## 6. Assets: what exists, what is new

- **Exists:** `cloud.png`, `cap.png`, `zzz.png`, `moon.png`, `umbrella.png`, `sparkles.png`, `kraken.png` (comic cameo only); atlas `i:octopus`, `i:fish`, `i:shark`, `i:turtle`, `i:dolphin`, `i:whale`, `i:wave`, `i:bubble`, `i:droplet`, `i:bird` (seagull, tinted white [?]), `i:fishfood` (the gull cracker [?]); `j:alarm`, `j:octopus`, `j:bath`, `j:sleep`.
- **New Fluent 3D cut-outs (MIT, 256 px):** 🦀 crab, 🐡 blowfish, 🪼 jellyfish [? may not be in Fluent 3D], 🧭 compass, ⛵ sailboat or 🚢 ship, ⚓ anchor, 🐚 spiral shell.
- **No emoji exists:** lighthouse (draw it with Phaser graphics, like the Space planet and UFO deco), seagull (no emoji, use tinted `bird`), seaweed (tinted leaf [?]), nightcap (canvas, like the toque).
- **Custom:** Sleepy Thully by image AI (prompt below), Hermy's teacup shell [?].

## 7. Music and sound

`A.TRACKS` today has `calm`, `battle`, `boss` and `north` (Canada, 126 bpm, 3 steps per beat). CLAUDE.md lists only three tracks (doc gap, not a bug).
- **Yes, a sea track is worth it:** `sea`, a 6/8 shanty at about 110 bpm, squeezebox-like square lead, low "heave-ho" bass, built like `north`. Rivals use `sea`, like Canada rivals use `north`.
- Boss: asleep phase = a slow music-box lullaby (or `calm` [?]); awake = `boss`. A track switch mid-duel is new for the scene hook [?].
- New SFX: gull squawk, compass whirr, alarm ring, puff-up and PFFFT, grumble, splash. Reuse `snore`, `honk`, `whoosh`.
- Map: fog banks drifting, lighthouse beam sweeping slowly, gulls bobbing, seaweed ship park with plush wrecks, three buoys making a triangle.

## 8. Grok image prompt for the boss

```
A cute plush toy of a sleepy, grumpy baby Cthulhu, Microsoft Fluent Emoji 3D style, soft glossy vinyl-and-felt toy look, rounded chunky shapes, warm studio lighting, gentle soft shadows. Full body, front view, sitting upright, centered. Sea-green mint body with a pale lilac round belly, two small purple felt bat wings behind the shoulders, a short row of soft little tentacles under the nose like a funny moustache, tiny stubby arms and legs. Big friendly half-closed sleepy eyes, rosy cheeks, a small grumpy pout. Wears a long blue-and-white striped nightcap with a white pompom flopping to one side. Hugs a fluffy white pillow under one arm. Kid-friendly, adorable, funny, not scary, no teeth, no dark colors, no slime. Thick white sticker outline around the whole figure, like a die-cut sticker. Plain transparent background (or flat pure white if transparency is not possible). No text, no shadow on the ground, no extra objects.
```

Model: `assets/sasquatch.png` (glossy plush, white die-cut outline, holds a pillow, warm smile, transparent). Save as `assets/thully.png`, about 380 px tall like Sasquatch.

## 9. Questions for Kondrat (recommended option first)

1. **World tone?** (a) cozy mystery: fog, lighthouse, picnic crews, nothing lost for real; (b) sunny beach (the older Mega Shark pitch); (c) pirate adventure.
2. **Cthulhu boss?** (a) yes, as "Sleepy Thully", cute nightcap version; (b) yes, but a made-up name with no Lovecraft link; (c) no, Mega Shark from the old pitch.
3. **World mechanic?** (a) "Compass Spin" (owner's Triangle + LUCKY CURRENT card, no swap on EASY); (b) owner's Triangle as is (cards shuffle for one turn); (c) "Fog Bank" (cards fogged, tap to clear).
4. **Own music track?** (a) yes, a `sea` shanty plus a lullaby for the sleeping boss; (b) only the `sea` track, boss keeps `boss`; (c) no new music, reuse `battle` and `boss`.

Chief tester questions (fun to ask): "Would you rather wake up a sleeping monster with a pillow or with an alarm clock?" and "If a seagull steals your snack, what do you give it?"

## Kondrat's answers (5 Oct 2026)

1. Tone: cozy mystery.
2. Boss: yes, Sleepy Thully.
3. Mechanic: Compass Spin.
4. Music: `sea` shanty + lullaby for the sleeping boss.

Next: Kondrat makes `assets/thully.png` with the Grok prompt in section 8; a full design doc when Ocean is next in line.
