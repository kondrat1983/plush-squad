# Plush Squad: Game Design Document

**Version 0.8** (GDD v0.8, synced with the code on 4 Oct 2026). Build described: v0.8.0 (branch `claude/v0.8-finish`, goes live after Kondrat's OK). Live today: v0.7.8. Owner: Kondrat. Chief tester: a 10-year-old. Live: [kondrat1983.github.io/plush-squad](https://kondrat1983.github.io/plush-squad/).

A gentle, funny pillow-fight game where a child's real plush toys become the heroes, friends duel each other's squads, and real-life kindness earns rewards.

> **This file is the main version of the GDD.** Sections 1 to 15 describe the game as it is built in v0.8.0. Section 16 lists what shipped in each version. Section 17 is the plan for the next versions. Numbers in tables are the real values from the code (`js/game.js`, `js/extra.js`, `js/audio.js`); where a doc and the code disagreed, the code wins and the gap is listed in [findings.md](findings.md) (G-IDs).
>
> Related: [decisions.md](decisions.md) (owner decisions), [ideas.md](ideas.md) (idea log), [findings.md](findings.md) (GDD vs code), `docs/qa/` (QA reports). Feature design docs: [0.8-canada.md](0.8-canada.md), [0.8-space-rework.md](0.8-space-rework.md), [0.8-world-pitch.md](0.8-world-pitch.md) (these are design-time docs; where they differ from the code, see findings G35-G46).

## Contents
1. Executive summary
2. Vision and design pillars
3. Audience and personas
4. Core loop and session flow
5. The duel
6. Heroes: Jack and your own toys
7. Rivals and worlds
8. Progression and difficulty
9. Rewards: capsules, boosters, stickers, costumes
10. Real-life quests and parents
11. Social and online play
12. Screens and UX
13. Art, audio and feel
14. Technical design
15. Safety and privacy
16. Version history
17. Roadmap
18. Risks and open questions
19. Appendix: content tables

---

## 1. Executive summary

| Genre | Platform | Audience |
|---|---|---|
| Turn-based pillow duels + collection | Web (PWA): iPhone, iPad, any browser | Kids 6 to 11 and their parents |
| **Session** | **Business model** | **Status** |
| 3 to 10 minutes | None. Free, no ads, no purchases | v0.7.8 live; v0.8.0 ready for Kondrat's OK |

### The pitch
Kids already love their plush toys and invent battles for them on the bed. Plush Squad takes that game onto the screen. Take a photo of a toy and the game cuts it out on the device, guesses what kind of animal it is and turns it into a hero with its own moves. Then the toy fights a cast of silly rivals in pillow duels where nobody gets hurt: they giggle until they give up.

Around the duel sits a light, honest meta: stars and levels, a capsule machine with surprise boosters, a sticker album, boss hats, friends who can duel your toys, a weekly boss everyone fights together, two mini-games, and real-life quests (tidy your toys, read a book) that a grown-up confirms.

### What makes it different
- **Your own toy is the hero.** No figures to buy (the trap that killed Skylanders and Disney Infinity). The toy is already on the bed.
- **Gentle conflict.** "Pep" instead of health, giggles instead of knockouts, a hero who naps upside down to heal.
- **Real-world loop.** Quests happen away from the screen and a parent approves them.
- **Safe by design.** Accounts without e-mails, friends only by code, no chat, toy photos processed on the device.

### Where we are
Eight versions in about a week, each shaped by the chief tester's feedback (survey of 2 October: "AWESOME", "they are all easy 😎", "add Polandball", new worlds Canada and Ocean, mini-games, real-life quests). v0.8 adds the Canada world with a skill-based save (SAVE IT!), a reworked Space world with a "pick the right tool" boss, Pond Hockey, boss hats, a comic, and more stickers and quests. A small group of family friends is already playing.

## 2. Vision and design pillars

**Vision:** Every child's favourite toy deserves to be a hero, and being kind in real life should feel as good as winning a duel.

1. **My toy, my hero.** The emotional core. Anything the player owns can join the squad in under a minute, with a name, a type and four moves that feel right for it (a tiger roars, a dragon sneezes fire). Jack, our real plush dragon, is the mascot and the default hero.
2. **Silly, never scary.** Pillows, tickles, sneezes, dances. Every hit pops feathers and big comic words. Losing means "too sleepy to go on". Rivals are characters with jokes, not enemies.
3. **Juicy and readable.** A 10-year-old understands every screen at a glance: big cards, one clear action, numbers that fly. Hit-stop, screen shake, squash and stretch and synthesized sounds make each tap feel great.
4. **Family-safe by default.** No money, no ads, no chat, no e-mails. Parents have a gate, a bedtime and a play-time limit. The game rewards real chores and reading, not endless play.

### Design rules we follow
- **Feedback beats balance spreadsheets.** Each version answers something the chief tester said.
- **Skill over bigger numbers.** v0.8 answers "too easy" with things a player gets better at (timed saves, reading the boss's charge), not only with more pep.
- **No dark patterns.** Capsules are a surprise mechanic, never sold. Daily rewards never punish a missed day.
- **Everything works offline.** Online features add to the game; they never block it.
- **One more turn, not one more hour.** Short sessions, bedtime respected, the hero literally falls asleep at night.

### Out of scope (on purpose)
- Open chat or free-text messages between kids.
- Real-money purchases, loot boxes for money, ads.
- Uploading photos of people. Only cut-out toys ever leave the device, and only when the player has an account.
- Violent themes. The Mothership's Inferno Rain is put out with an extinguisher, her tractor beam only "borrows" a card and gives it back, and Sasquatch says sorry after every puck.

## 3. Audience and personas
The game has two audiences: the child who plays and the parent who lets them. Both have to love it.

| The Chief Tester | The Parent | The Friend Group |
|---|---|---|
| Age 10, plays on iPad and phone | Busy, protective, curious | Classmates and cousins |
| Loves funny words, collecting, being the expert. Gets bored when it is easy ("they are all easy 😎"). Has strong ideas: Polandball, Inferno Rain blocked by an extinguisher or milk. Wants to show friends his toys. | Wants screen time that is short, kind and safe. Values chores, reading and bedtime. Will not give a child's e-mail to a game. Enjoys playing a duel together. *"Fine, but after you tidy your toys."* | Compare toys, scores and stickers. Want to beat each other's squad, then get revenge. Play at different times of day. Need zero-friction joining: a code, not an invite e-mail. *"Your friend beat your Cat! Revenge?"* |

### Feedback that shaped the game
| Tester said (survey, 2 Oct 2026) | What we built | Version |
|---|---|---|
| "The game is too easy", "They are all easy 😎" | Rivals scale with level; EASY / NORMAL / HARD; smarter rival AI | 0.5, 0.6 |
| (same, still the main ask) | Canada is harder than Space; SAVE IT! (timed save, skill decides); "Fire or Beam?" (pick the right tool, a missed beam takes a card) | 0.8 |
| New rivals: Dragon Boss, Robot, Ghost + Polandball | World 2: SPACE with Robo-Bop, Polandball, Boo, Giant Dragon Boss. In v0.8 Polandball became The Blips and the Dragon Boss became The Mothership (the Dragon is "on holiday" on her ship) | 0.5, 0.8 |
| "Inferno rain from the sky, blocked by a fire extinguisher, or milk" | Inferno Rain with the extinguisher; rivals block with milk. Kept in v0.8 as one half of "Fire or Beam?" | 0.5, 0.8 |
| Top 3: new worlds, mini-games, real-life quests | Star Catch; SPOOKY world; real-life quests (0.5, 0.7). Canada world, Pond Hockey, 6 new quests (0.8) | 0.5, 0.7, 0.8 |
| Funniest move: Upside-Down Nap | Kept as Jack's signature; Batty the Bat naps too; Sleepyhead sticker; Jack lands upside down in the Canada comic | 0.7, 0.8 |

## 4. Core loop and session flow
The core loop is one duel long, about 2 minutes. Everything else either feeds it (boosters, new moves) or rewards it (stars, stickers, capsules, hats).

**Pick a rival** (map, world tabs) → **Pillow duel** (booster, moves, turns) → **Rewards** (XP, stars, capsules) → **Grow** (levels, moves, unlocks) → back to Pick a rival.

Side loops feed the core: capsule machine → boosters for the next duel; sticker album → capsules + titles; real-life quests → capsules + XP; friends, weekly boss, Star Catch, Pond Hockey.

### A typical session (6 minutes)
| Minute | What happens | Why it matters |
|---|---|---|
| 0:00 | Title screen. Daily gift capsule pops on the map. "What's new" after an update. | Return reason, low pressure |
| 0:30 | Open a capsule: crank, shake, tap to open, rarity reveal. | Surprise and delight, no cost |
| 1:00 | Pick the next rival on the map, choose a booster. | Agency, small strategy |
| 1:30 | Duel: 6 to 10 turns of pillows, sneezes and dances. | The core fun |
| 3:30 | Result: stars fly in, XP bar fills, "New rival unlocked!", maybe a new move, hat or sticker. | Progress you can see |
| 4:00 | Mail: a friend beat your toy. Revenge duel. | Social pull |
| 6:00 | 30 seconds of Star Catch or 45 seconds of Pond Hockey, or off to do a real quest. | Ends on a high note |

Map: world tabs at the top (Pillow Hills, Space, Canada, and Spooky during the event). With 4 tabs only the open tab shows its name, the others show just their icon. Tapping the open Canada tab replays the comic. Difficulty switch, capsule and boss buttons, MY SQUAD, and a mini-game button (STAR CATCH; POND HOCKEY on the Canada map after the first win over Beaver Bob). Before every duel the player may spend one booster from the capsule collection.

## 5. The duel
A duel is a turn-based exchange between the hero and one rival. The player taps a move card; the rival answers. First to run out of **pep** giggles and gives up.

### Rules
- Hero acts, then rival acts. **Dizzy** skips one turn. **Shield** halves the next hit. A **crit** is any hit of 20 or more: bigger shake, zoom and a CRIT! word.
- Some moves have uses per duel (shown as "once", "2 left", then a USED stamp).
- Stars at the end: 3 if the hero keeps ≥ 70% pep, 2 if ≥ 35%, otherwise 1.
- **Charged moves** (Inferno Rain, Tractor Beam, SLAPSHOT): the rival spends one turn charging, the attack lands on its next turn. The AI never picks a charged move right after a charged move.

### Move types (data-driven engine)
Every move in the game, for Jack, rivals and photographed toys, is a small data object with a `type`. Seventeen types (some rows below pair two):

| Type | Behaviour | Examples |
|---|---|---|
| throw | Projectile in an arc (pillow, planet, pumpkin) | Pillow Whack, Mini Planet, Pillow Log |
| tickle | Run in, three tickles, random damage | Tickle Attack (5–28) |
| spray | Particle cone; can tint the target | Frosty Sneeze, Laser, Slime, Glitter Ray, Fluff Chomp |
| roar | Rings of sound + big word | RRRRR!, BOOOO!, SORRY, EH!, HELLO FRIEND! |
| quake | Jump and stomp; with `jump: 1` the rival flies off-screen first | Moo-Quake, Beam Me Up... Oops!, Avalanche |
| rush / hop | Dash or three hops into the target | Tail Whip, Bear Hug, Wobble Hop |
| multi | Several small hits in a spin | Tail Spin (3 × 5–9), Saucer Spin |
| volley | Three thrown objects | Pop Quiz (books), Snowball Fight |
| heal / nap | Restore pep; nap flips the hero upside down | Dumpling Snack, Pancake Stack, Upside-Down Nap |
| shield | Next hit does half | Pillow Fort, Bubble Helmets, Pillow Dam |
| dizzy / dance | Target skips its next turn | Six-Seven Dance, Hypno Stare, Maple Syrup |
| rain | Fireballs from the sky; charged for rivals; blockable | Inferno Rain (Jack 22–30, Mothership 24–30) |
| beam (v0.8) | Charged tractor beam; umbrella blocks it; can take a card | Tractor Beam, Mini Beam |
| slapshot (v0.8) | Charged hockey shot; a timed tap saves it | SLAPSHOT, Mini Slapshot |

### Signature mechanic, Space: "Fire or Beam?" (v0.8)
Inferno Rain was designed by the chief tester. Since v0.8 the Space boss, **The Mothership**, has two charged attacks and the player has to read which one is coming.

| | Inferno Rain | Tractor Beam |
|---|---|---|
| Charge look | red sky, embers, `GATHERING FIRE...` | yellow-green spotlight sweeps the ground, `WARMING UP THE BEAM...` |
| Right tool | extinguisher (FOAM!): 0 damage, rival STEAMED! (dizzy) | umbrella (UMBRELLA!): BOING!, 0 damage, rival BEAM JAM! (dizzy) |
| Wrong tool | umbrella: half damage, no dizzy | extinguisher: half damage, no dizzy |
| No block | full damage | full damage, and on NORMAL / HARD the beam takes one limited card for the rest of the duel |
| Six-Seven Dance during the charge | fire fizzles out | beam goes disco and fizzles |

- **Blocking costs the turn.** The block buttons appear while the rival charges; the move cards stay usable.
- **Which card the beam takes:** the first limited card that still has uses, in this order for Jack: Upside-Down Nap, Inferno Rain, Frosty Sneeze, Dumpling Snack, then the booster move, Six-Seven Dance last. Toys: heal or nap first, then the strongest limited move. Unlimited moves are never taken. The card shows a small UFO and a BEAMED UP stamp, and comes back after the duel ("Too cozy to keep!").
- **By difficulty:** EASY shows one BLOCK IT! button that always uses the right tool, and the beam never takes a card. NORMAL shows FOAM! and UMBRELLA!. HARD also swaps the two buttons at random on each charge (50%).
- **The Blips' Mini Beam** is the tutorial: one use, 14–20, only the UMBRELLA! button appears (every difficulty), a block gives 0 damage but no dizzy, no card is taken.
- **Milk:** Moo and Professor Hoot block Jack's Inferno Rain with a milk splash while their milk heal is unused, and the block uses up that heal (G36). The Mothership has no milk.
- Jack learns Inferno Rain at level 5 (not charged). Firefighter counts extinguisher blocks, Umbrella Hero counts umbrella blocks (Mini Beam included, G38).

### Signature mechanic, Canada: SLAPSHOT + SAVE IT! (v0.8)
The counter costs no turn; it costs skill.
1. **Wind-up.** The rival winds up (frosty tint, snowflakes rise, `WINDING UP...`). A chip by the hero says `NEXT: SAVE IT!`. No block button; the player takes a normal turn.
2. **Shot** (the rival's next turn). A glove appears in front of the hero with `GET READY...`, then `SLAPSHOT!` and the puck flies. A ring closes on the glove; it turns yellow in the good window and green in the perfect window. **Tap anywhere** below the top bar, or press SPACE.
3. **Result:** perfect = `SAVE!`, 0 damage, the puck bounces back for **10** (raw: no boosters, no shield); good = `GOOD SAVE!`, half damage (rounded up; a Pillow Fort shield halves again); miss = `BONK!`, full damage, then "Oh! Sorry!".

| | EASY | NORMAL | HARD |
|---|---|---|---|
| Pause before the shot | 800 ms | 600 ms | random 300–1000 ms |
| Flight time F | 2000 ms | 1200 ms | 1000 ms |
| Perfect window (ms after launch) | any tap until F + 300 | 880–1280 | 810–1060 |
| Good window | none | 480–879 | 560–809 |
| Early tap | counts as perfect | 1st: `WAIT FOR IT!` (forgiven), 2nd: miss | `TOO EARLY!`, miss |
| No tap | puck stops before the glove, `TAP!` waits 3 s, then `OOF!` = good save | miss | miss |
| Six-Seven Dance during the wind-up | rival drops the puck | rival drops the puck | the shot waits one turn (wind-up stays) |
| Sasquatch SLAPSHOT uses | 2 | 2 | 3 |

- **First SAVE IT! ever** (`stats.saveSeen` not set): the puck freezes in the perfect window and `TAP NOW!` waits with no time limit (on EASY at the stop point). Max the Moose's Mini Slapshot (1 use, 14–20) is usually the first one.
- **Fair timing:** judged with `performance.now()`. A frame gap over 250 ms during the flight restarts the shot ("slips! Again!"); after 2 restarts it is a good save. A stall before launch only stretches the pause. Taps during a stall are ignored, never judged.
- Perfect saves count for the Goalie sticker (`stats.perfectSaves`).

### Rival AI
Each rival move has a weight (defaults by type in `DEF_W`: throw / rush / hop / rain / beam / slapshot 30, multi / quake / spray / tickle / volley 25, roar 20, heal / nap / shield / dizzy 15, dance 12). Filters remove useless choices: heal only below 65% pep, no second shield, no dizzy on an already dizzy hero or twice in a row, no charged move twice in a row or right after a charge. On NORMAL and HARD the AI is smarter: ×4 weight for a finishing blow (not charged moves), ×0.5 for hitting a shield, ×2.5 for healing below 35% pep. On EASY weights are used as they are.

## 6. Heroes: Jack and your own toys

### Jack, the mascot
Jack is a real blue plush dragon, photographed from three angles (side, front, upside down for his nap). Pep 100. He starts with four moves and learns one more at each of the first levels. No new Jack move in v0.8 (owner's decision).

| Move | Level | Effect | Uses |
|---|---|---|---|
| Pillow Whack | 1 | 12–20 | ∞ |
| Tickle Attack | 1 | 5–28 | ∞ |
| Frosty Sneeze | 1 | 25 | 1 |
| Upside-Down Nap | 1 | +35 pep | 1 |
| Dumpling Snack | 2 | +20 pep | 2 |
| Six-Seven Dance | 3 | rival dizzy | 1 |
| Tail Spin | 4 | 3 × 5–9 | ∞ |
| Inferno Rain | 5 | 22–30 | 1 |

My Squad: Jack plus photographed toys. Tap a toy to play as it or duel it. The hero wears the chosen costume (section 9) on the title, in Me and in duels.

### + Toy: photo to hero in under a minute
Fully automatic and private. The photo never leaves the device unless the player has an account and the cut-out is saved to the cloud. BACK while the photo is processed cancels it (v0.8, B41).
1. **Background removal** on the device (ormbg model, 44 MB, Web Worker). The result is cleaned: largest blob kept, edges smoothed, white sticker outline added.
2. **"Who is it?"** MobileCLIP S0 compares the cut-out with 44 pre-computed toy types (dragon, tiger, bunny, robot, monster, round fluffy thing...). The child confirms or picks from a grid of icons.
3. **Hero generator** (rules, no AI text): type gives the signature move and a snack; the main colour gives an element move; a seeded personality gives the fourth move; pep 95–130; a name the child can edit.

| Element (from colour) | Move | Personality (seeded) | Move |
|---|---|---|---|
| Ice | Frosty Sneeze | Sleepy | Upside-Down Nap |
| Fire | Fire Sneeze | Hungry | Snack (type-based) |
| Leaf | Leaf Storm | Dancer | Six-Seven Dance |
| Sunny | Sunny Sparkle | Ticklish | Tickle Attack |
| Candy | Candy Cloud | Brave | Pillow Fort (shield) |
| Magic | Magic Fizz | Loud | Big Shout |
| Earth | Acorn Toss | Bouncy | Boing Boing |
| Snow / Shadow | Snowball / Shadow Puff | Spinny | Twirl Spin |

## 7. Rivals and worlds
Rivals are characters with an intro line, a "laugh" line when they give up and 3–5 moves (G33). They unlock in order across worlds: one star on a rival opens the next. Each world ends with a boss: a crown on the map node, the `boss` music, and a hat as the reward.

| World | Rival | Pep | XP (win) | Moves (summary) | Reward |
|---|---|---|---|---|---|
| Pillow Hills | Timmy the Tiger | 100 | 40 | Pillow swing, tickle, funny ROAR | |
| | Moo the Cow | 120 | 55 | Moo-Quake, Milk Break, shield | |
| | Sly the Snake | 130 | 70 | Tail whip, hypno-sway, HSSSS | |
| | Professor Hoot (boss) | 150 | 100 | Pop Quiz books, THE STARE, milk, HOOT HOOT | Owl Hat |
| Space (after Prof. Hoot) | Robo-Bop | 135 | 110 | PEW PEW laser, CLANK rush, BEEP BOOP, robot dance, recharge | |
| | The Blips | 145 | 120 | Mini Planet, Wobble Hop, Beam Me Up... Oops!, Bubble Helmets, Mini Beam | |
| | Boo the Space Ghost | 155 | 130 | BOO, slime, spooky circles, see-through, tickle | |
| | The Mothership (boss) | 200 | 180 | Inferno Rain, Tractor Beam, Saucer Spin, WE COME IN PEACE!, Glitter Ray | UFO Hat |
| Canada (after the Mothership) | Max the Moose | 145 | 130 | Mini Slapshot, Antler Rush, SORRY, EH!, Pancake Stack | |
| | Beaver Bob | 155 | 140 | Tail Slap, Pillow Log, Fluff Chomp, Pillow Dam | unlocks Pond Hockey |
| | Mountie Bear | 165 | 150 | Bear Hug, Snowball Fight, Maple Syrup, PARDON ME!, Honey Snack | |
| | Sasquatch (boss) | 210 | 200 | SLAPSHOT, Avalanche, Snowballs, HELLO FRIEND! | Canada Toque |
| Spooky (Halloween event, 1 Oct – 7 Nov, G34) | Pumpkin Pete | 110 | 50 | Pumpkin toss, candy storm, MWAHAHA, lollipop | Pumpkin Hat |
| | Batty the Bat | 125 | 60 | Swoop, sonar, upside-down nap, EEEEK | Top Hat |
| | Webster the Spider | 140 | 70 | Sticky web, eight-leg tickle, tickle, web hammock | Witch Hat |
| | Count Fang (boss) | 175 | 120 | Bat attack, hypno stare, cape, chocolate, BLAH BLAH | Bat Hat |
| Weekly (co-op) | Pillow Kraken | 220 per duel (fixed) / 6000 shared | 60 | Tentacle tickles, ink, tickle, BLUB BLUB | golden capsule |

Pep values are at NORMAL difficulty and level 1. They grow with the player's level (section 8). Duels against the player's own toys and friends' toys start from the toy's own pep (95–130), a friend's Jack from 100, and scale with level and difficulty like Pillow Hills (G24). The Kraken's pep is fixed at 220 (owner's decision); its damage still scales (G26).

The rival ids `polandball` and `dragonboss` are kept for The Blips and The Mothership, so old saves keep their stars, unlocks and stickers. Old Dragon Boss winners therefore have Canada open at once (owner's decision).

### Space rivals changed in v0.8 (NORMAL, L1, before scaling)
**The Blips** (`polandball`, tex `aliens`, three stacked Fluent 👽, plural). Intro: "We come in peace! And with PILLOWS!" Laugh: "Take us to your bedtime!"

| Move | Type | Damage | Uses | Weight |
|---|---|---|---|---|
| Mini Planet | throw | 13–20 | ∞ | 35 |
| Wobble Hop | hop | 12–21 | ∞ | 30 |
| Beam Me Up... Oops! (sound `blip`) | quake, jump | 15–24 | 2 | 20 |
| Bubble Helmets | shield | - | ∞ | 15 |
| Mini Beam | beam, charged, mini | 14–20 | 1 | 15 |

**The Mothership** (`dragonboss`, tex `mothership`, Fluent 🛸, boss, `big` 1.15). Intro: "Your friend the Giant Dragon is on holiday on my ship. He taught me INFERNO RAIN!" Laugh: "The Mothership giggled into disco lights. The Dragon waves: 'Great job!'"

| Move | Type | Damage | Uses | Weight |
|---|---|---|---|---|
| Inferno Rain | rain, charged | 24–30 | 1 | 20 |
| Tractor Beam (sound `beam`) | beam, charged | 24–30 | 2 (HARD 3) | 30 |
| Saucer Spin | multi | 3 × 7–11 | ∞ | 25 |
| We Come in Peace! | roar | 16–24 | ∞ | 20 |
| Glitter Ray | spray | 15–22 | ∞ | 15 |

In the Mothership duel the drifting decor UFO is hidden, so there are never two saucers.

### Canada (v0.8, world 3)
A snowy pine forest under the northern lights. Everyone is very polite and says sorry. Art: Fluent 3D emoji cut-outs for Max (🫎), Bob (🦫) and Mountie Bear (🐻 face, no hat, G43); Sasquatch is custom art by Kondrat. Duel music `north` (Sasquatch: `boss`).

**Max the Moose** (145 pep, 130 XP). "Sorry, eh! I have to pillow-fight you now. So sorry!"

| Move | Type | Damage / heal | Uses | Weight |
|---|---|---|---|---|
| Mini Slapshot | slapshot, charged, mini | 14–20 | 1 | 30 |
| Antler Rush | rush | 12–21 | ∞ | 30 |
| Sorry, Eh! (sound `honk`) | roar | 13–21 | ∞ | 20 |
| Pancake Stack | heal | +22 | 1 | 15 |

**Beaver Bob** (155 pep, 140 XP). "Nice pillows! I will build a dam with them." His first win opens Pond Hockey.

| Move | Type | Damage | Uses | Weight |
|---|---|---|---|---|
| Tail Slap | rush | 12–20 | ∞ | 35 |
| Pillow Log | throw | 12–19 | ∞ | 25 |
| Fluff Chomp (sound `chomp`) | spray | 11–19 | ∞ | 25 |
| Pillow Dam | shield | - | ∞ | 20 |

**Mountie Bear** (165 pep, 150 XP). "Pillow fight rules: no biting, no crying, always say sorry!"

| Move | Type | Damage / heal | Uses | Weight |
|---|---|---|---|---|
| Bear Hug | rush | 13–21 | ∞ | 30 |
| Snowball Fight | volley | 12–20 | ∞ | 25 |
| Maple Syrup (STICKY!) | dizzy | - | 1 | 15 |
| Pardon Me! | roar | 13–21 | ∞ | 20 |
| Honey Snack | heal | +25 | 1 | 10 |

**Sasquatch** (boss, 210 pep, 200 XP, `big` 1.15). A shy, fluffy giant who wants a hockey friend. "H-hello... do you want to play hockey? I shoot REALLY hard." Laugh: "You are my best friend now!" No shield, no heal.

| Move | Type | Damage | Uses | Weight |
|---|---|---|---|---|
| SLAPSHOT | slapshot, charged | 26–32 | 2 (HARD 3) | 35 |
| Avalanche (sound `stomp`) | quake | 16–24 | ∞ | 25 |
| Snowballs | volley | 16–24 | ∞ | 20 |
| Hello Friend! | roar | 15–23 | ∞ | 20 |

### Arrival comic (v0.8)
The first time a Canada scene would open (map tab, NEXT RIVAL into Max, a restored save), the game shows a short comic page first and then goes on to where the player was heading. Three panels, about 9 s if nobody taps: "MEANWHILE, IN CANADA..." with Jack shivering ("Brrr! Why is the sky made of ice cream?"); Jack head-first in a snowbank (FWUMP!); Max with pancakes ("Sorry, eh! Welcome to Canada!" / "Why are YOU sorry? I fell on YOUR snow!"). Then a CANADA! burst, maple-leaf confetti, a tiny Sasquatch peeking from behind a pine, and LET'S GO!. Tap = finish the panel, next tap = next panel; SKIP jumps to the title. `Save.data.comics.canada` is set on LET'S GO. Replay: tap the open Canada tab on the map. Bedtime and daily limit apply. Rotation resumes on the same panel. Panel details: G39.

## 8. Progression and difficulty

### Experience and levels
XP needed for the next level: `need(L) = 100 + 50 × (L − 1)`, so 100, 150, 200, 250... Level 5 takes 700 XP in total, level 6 1000, level 7 1350.

| Source | XP |
|---|---|
| Win vs rival | 40–200 (by rival; bosses more) |
| First win over a rival | +20 bonus |
| Loss | 10 (no one leaves empty-handed) |
| Own toy duel (win) | 30 |
| Friend's toy or friend's Jack duel (win) | 35 |
| Weekly Kraken (win) | 60 |
| Star Catch | score, max 60 |
| Pond Hockey | score × 2, max 60 |
| Real-life quest approved | +20 |
| HARD mode | ×1.5 (duels) |
| Super Star booster | ×2 |

Arrival levels when playing straight through (first wins only): the Mothership at about L5 (765 XP), Canada at L5, Sasquatch at about L7 (1445 XP). Rematches, mini-games and quests push this up [?].

### Difficulty
Two layers: the player's choice and the player's level.

| Mode | Rival pep | Rival damage | AI | XP |
|---|---|---|---|---|
| EASY | × 0.8, no level growth | × 0.8 | simple weights | ×1 |
| NORMAL | × level curve (below) | × level curve | smart | ×1 |
| HARD | NORMAL × 1.2 | NORMAL × 1.15 | smart | ×1.5 |

| World | Scaling starts | Pep per level, cap | Damage per level, cap |
|---|---|---|---|
| Pillow Hills, Spooky, toy and friend duels | L1 | +7%, max ×1.4 | +5%, max ×1.3 |
| Space | L4 | +5%, max ×1.25 | +4%, max ×1.2 |
| Canada (v0.8) | L6 | +5%, max ×1.25 | +4%, max ×1.2 |
| Weekly Kraken | pep never scales (220) | - | like Pillow Hills (G26) |

Pep is rounded to 5. Heal amounts scale with the pep multiplier. Examples: Sasquatch 210 at L6, 220 at L7, 250 at L10, 265 at L11+; EASY 170; HARD L6 250. Mothership: EASY 160, NORMAL L5 210, HARD L5 250. Canada also adds SLAPSHOT timing per difficulty and Space adds the block UI per difficulty (section 5).

### Unlocks
- Next rival: after one star on the previous rival. Next world: after its previous boss (Space after Prof. Hoot, Canada after the Mothership). Event worlds are open from day one of the event (Spooky: 1 October to 7 November).
- Pond Hockey: first win over Beaver Bob (result note: "Bob challenges you to POND HOCKEY! Find it on the Canada map").
- Jack's moves: level 2, 3, 4, 5 (section 6). Costumes: section 9. Titles: from stickers.
- Real-life quests feed progression too (section 10). Me: player card with title, stats and costumes.

## 9. Rewards: capsules, boosters, stickers, costumes
The surprise of a capsule machine, without the casino. Capsules are earned only by playing, kindness and friends, never bought. Opening: rays, rarity, name, NEW!, confetti. Unseen boosters in the collection show as "?".

### Where capsules come from
| Source | Amount |
|---|---|
| Daily gift | 1 per day |
| First win over any rival | 1 |
| Every 3rd win | 1 |
| New sticker | 1 |
| Approved real-life quest | 1 |
| Gift from a friend | a friend can send 1 capsule a day in total (G23) |
| Weekly Kraken defeated | 1 golden (guaranteed super rare) |

### Boosters (one per duel, consumed)
| Booster | Rarity | Effect |
|---|---|---|
| Big Breakfast | Common | Start with +25 pep |
| Pillow Fort | Common | Start behind a shield |
| Warm Milk | Common | Extra move: +30 pep |
| Lucky Star | Rare | Every hit does +3 |
| Feather Storm | Rare | Extra move: 3 feather hits (18–26) |
| Snow Globe | Rare | Extra move: Blizzard (20–26) |
| Sleepy Moon | Rare | Rival starts dizzy |
| Rocket Start | Rare | First hit does +10 |
| Spare Heart | Super rare | Out of pep? Bounce back with 40 |
| Super Star | Super rare | Double XP this duel |

Drop weights: common 14, rare 8, super rare 4 per booster, so a capsule gives a common booster 46.7% of the time, rare 44.4%, super rare 8.9%. A booster picked and then given back with BACK before the first move returns to the collection. Lucky Star and Rocket Start do not change a SAVE IT! bounce-back.

### Costumes (hats)
Every world boss gives a hat (owner's decision, v0.8). The result panel says "New costume: X! Put it on in Me". Hats are never taken away. Me shows owned hats in one row, or two rows on tall phones (the row still overlaps text on iPad portrait, QA B11, open).

| Hat | How to get it | Art |
|---|---|---|
| Owl Hat | Beat Professor Hoot | `owl.png` tinted green, a small owl on the head |
| UFO Hat | Beat the Mothership | `ufo.png` |
| Bat Hat | Beat Count Fang (only during the Spooky event) | `bat.png` |
| Canada Toque | Beat Sasquatch | red knit toque with a white band, pom-pom and maple leaf, drawn in code (G37) |
| Pumpkin Hat / Top Hat / Witch Hat | Beat Pumpkin Pete / Batty / Webster (event) | Fluent art; witch hat drawn for the game |
| Royal Crown | Superstar sticker (all 24 stars in Pillow Hills + Space). Players who beat the old Dragon Boss keep it. | `crown.png` |

**v0.8 save migration** (once, flag `mig08`, never takes anything away): old Dragon Boss winners get the Royal Crown stored (G35); old Prof. Hoot winners get the Owl Hat; old Count Fang winners get the Bat Hat. New hats from the migration are announced once with a gift toast on the first menu screen ("A GIFT: Owl Hat! Thank you for playing! Put it on in Me"; no toast for the crown to Dragon winners, who already saw it in Me).

### Sticker album
27 achievements (21 in v0.7 + 6 in v0.8: Saucer Champ, Big Friend, Goalie, Hat Trick, Slapshot Star, Umbrella Hero). Each gives a capsule; each unlocks a title for the player card. Earned stickers wobble, locked ones are silhouettes. The album pages when the stickers do not fit (B06). King of Halloween only shows during the event or once earned. Full list in the appendix.

## 10. Real-life quests and parents
The game's way to say "go and do something real". Three quests a day, chosen from 24 (6 new in v0.8), the same for the whole day.

### Quest flow
1. The child does the task for real (tidy toys, read 15 minutes, build a pillow fort, feed the birds with a grown-up...).
2. Taps I DID IT!; the card shows "Waiting for a grown-up".
3. A parent opens Parents (grown-up gate: a multiplication like 8 × 7, typed), and taps YES or NO.
4. YES gives +1 capsule and +20 XP. Unapproved quests carry over to the next day.

### Parent tools
| Tool | Options | Behaviour |
|---|---|---|
| Bedtime | off, 20:00, 20:30, 21:00, 21:30 (until 7:00) | Menu screens show "Shhh... Jack is sleeping". Duels in progress are never cut off. |
| Daily limit | off, 30, 45, 60, 90 minutes | Counted only while the game is visible. |
| Play time | 7-day bar chart | Today highlighted. |
| Override | 15 more minutes / no limit today | Behind the same grown-up gate on the bedtime screen. |

**Design note:** bedtime never interrupts a duel in progress. It is checked when a screen opens (title, map, squad, Star Catch, Pond Hockey, comic, capsules, Me, album, quests, friends, weekly boss) and before a new duel, so the child always finishes the fight and sees the result before Jack goes to sleep.

## 11. Social and online play
Friends make the game travel between homes. Everything social is asynchronous, code-based and free of chat.

### Accounts without e-mails
- A name (3–16 letters, numbers or _; a simple word filter) and a password. Internally the name maps to a private address that never receives mail.
- On sign-up the child gets a recovery code (like `ZWND-6WXP`) to write down. Name + recovery code + new password restores access; 5 wrong tries lock it for an hour.
- Guest progress moves into the new account. Logging in on a second device asks "Which progress do you want to keep?". The v0.8 migration also runs on a pulled cloud save.

### Features
| Feature | How it works | Limits |
|---|---|---|
| Friends by code | Each player has a code like `PKWG-W6`. Adding is mutual. | 20 new friends a day |
| Duel a friend's squad | Their photographed toys (or their Jack, at their level) become rivals, played by the AI. Beating a friend's Jack counts for Dragon vs Dragon. | none |
| Revenge | Winning sends "X beat your Cat! Revenge?" to the owner, with a REVENGE button. | 40 a day |
| Gifts | A free capsule, or one of your boosters. | 1 capsule, 3 boosters a day |
| Stickers | GG!, REMATCH?, LOL, COOL, WOW!, HUG, ZZZ, INTO SPACE! (icon: the Blips since v0.8) | 40 a day |
| Mail | Friend requests, gifts to open, stickers, revenge calls. | 30 newest |
| Toy Museum | All toys of you and your friends, with hearts. | friends only |
| Star Catch top list | Best score this week among you and your friends. No Pond Hockey board yet. | friends only |
| Weekly Pillow Kraken | One boss for every player, 6000 pep. Each duel's damage counts. When it falls, everyone who hit it claims a golden capsule. The result panel sends the player back to the Weekly Boss screen (BOSS button). | 3 fights a day |

## 12. Screens and UX
Title → Me, Friends, Map, Album, Quests, Parents. Map → Star Catch or Pond Hockey, Booster, Capsules, Weekly boss, comic (first Canada visit or replay). Friends → Friend duel. Booster → Duel. Every duel ends on a result panel: NEXT RIVAL / REMATCH (BOSS for the Kraken, G27) and back to where you came from.

### UX principles
- One big action per screen (TAP TO PLAY, TURN!, FIGHT!, LET'S GO!), secondary actions smaller and cream-coloured.
- Readable at arm's length: 1080-pixel logical canvas, titles 60–80 px, buttons at least 90 px tall (not true everywhere yet, G29 / B26).
- Any orientation, any time. Rotating the phone rebuilds the layout and puts the player back exactly where they were, even mid-duel. A rotation waits until a duel turn, the result celebration or a sticker toast is over (v0.7.8). The comic resumes on the same panel; Pond Hockey and Star Catch restart at their intro card without XP.
- Short phones: map nodes shrink to fit; duels with many moves switch to 3 card columns and smaller fighters.
- Feedback within 100 ms: every tap presses the button down, plays a click and wobbles (not true for every button yet, G30 / B27).
- Patch notes for kids: a "What's new" popup after each feature update with icons and one line per feature (8 lines for 0.8, see section 16). CLOSE shows it again next launch; DON'T SHOW AGAIN hides it until the next version. Brand-new players do not see it. Hotfixes never add lines (owner's rule).

## 13. Art, audio and feel

### Visual direction: "a bedroom at night"
A deep blue night sky with twinkling stars, a quilted blanket as the ground, a moon that wobbles. Characters are bright and soft. Jack is a real photo cut-out with a white sticker outline, and photographed toys get the same treatment, so the child's toy looks like it belongs.

| Ink | Night | Star | Cream | Coral | Mint |
|---|---|---|---|---|---|
| #1D2163 | #272C7C | #FFD23F | #FFF3D2 | #FF6B5B | #7FD6C2 |

World looks: Pillow Hills (night sky, clouds), Space (`sky2`: planet, drifting UFO, rockets), Canada (`sky4` twilight with an aurora that shimmers, pine silhouettes on menu screens, falling snow, a maple leaf now and then; snow ground `ground4`; the duel moon tinted cool blue), Spooky (orange moon, bats, cobwebs).

### Characters and icons
Rivals and icons come from Microsoft's Fluent Emoji 3D set (MIT licence) with a white sticker outline, so the cast reads as one family of toys. v0.8 adds Fluent art for the Blips (3 × 👽), the Mothership (🛸), the umbrella, Max (🫎), Bob (🦫), Mountie Bear (🐻), maple leaf, pine, pancakes, hockey stick and glove. Sasquatch is custom art by Kondrat (made with an image AI). Drawn in code: the witch hat, the Canada Toque, puck, snowball, SAVE IT! ring, aurora, comic halftone. Polandball and the Giant Dragon Boss art stay in `assets/` but are not in the cast any more (the Dragon is still the Dragon vs Dragon sticker icon).

### Juice checklist
- Hit-stop (60–130 ms) and screen shake on every hit, zoom on crits
- Squash and stretch on attacker and target
- Feathers, sparks, snow, slime, embers, steam, foam and beam particles
- Flying damage numbers, ghost pep bar that drains after the hit
- Banners for YOUR TURN / RIVAL'S TURN (plural for the Blips)
- Confetti on wins, level-up, super-rare capsules and perfect saves

### Type
Poppins Bold for everything in the game: rounded, friendly, readable. Words like ACHOO!, BOING!, PSSHHH!, SAVE! and FWUMP! are part of the art.

### Audio
Every sound is synthesized live with Web Audio: no audio files at all. 40+ effects. v0.8 adds `honk` (Max), `chomp` (Bob), `babble` (comic speech), `comicSting` (comic title), `slap`, `slide`, `glove`, `goalHorn` (hockey and SAVE IT!), `blip` (Blips), `beam` (tractor beam), `umbrella`.

Procedural music in `A.TRACKS`, picked by the scene `create` hook:

| Track | Where | Feel |
|---|---|---|
| `calm` | menus, result panels, comic, Star Catch, Pond Hockey | lullaby, 88 bpm |
| `battle` | duels in Pillow Hills, Space, Spooky, toy and friend duels | D minor, 144 bpm |
| `boss` | every boss (`boss: true`) and the Kraken | C minor, 112 bpm |
| `north` (v0.8) | Canada duels except Sasquatch | G major 6/8 jig, 126 bpm, 16 bars: oom-pah bass, square chords, hand claps |

`finish()` silences music for the win / lose jingle; `result()` returns to `calm`. One mute button on every screen.

Consistent UI kit: night panels with a seam stitch, star-yellow primary buttons, cream secondary buttons, icons that wobble.

## 14. Technical design
- **Device** (browser / installed PWA): `game.js` (Phaser 3.90: scenes, duel engine, save), plugins `extra.js` (local) and `net.js` (online), toy worker (ormbg + MobileCLIP on device), `audio.js` (Web Audio synth), localStorage + IndexedDB (save, toy pictures), service worker (offline cache, instant updates).
- **Scenes:** boot, title, map, squad, studio, battle, catch, hockey (v0.8), comic (v0.8), gacha, plus plugin scenes (me, album, quests, parents, bedtime, account, friends, boss...).
- **GitHub Pages:** static files, free hosting.
- **Supabase:** Auth (name + password), Postgres + Row Level Security, about 20 SQL functions, Storage for toy cut-outs, free tier. No schema change in v0.8.

| Area | Choice | Why |
|---|---|---|
| Engine | Phaser 3.90, plain JavaScript, no build step | Fast iteration; anyone can open the files |
| Delivery | Progressive Web App on GitHub Pages | Free, instant updates, installable on iPad |
| Updates | Service worker: network-first for code, cache-first for art | New versions arrive on next launch, still works offline |
| Layout | 1080-px logical canvas, FIT scaling, portrait and landscape layouts | One codebase for phone, tablet, desktop |
| Rotation | Game rebuilt for the new size; scene + duel snapshot restored (incl. a charge, beamed cards, the comic panel) | No lost duels when the child turns the iPad |
| Content | Moves, rivals, boosters, stickers, quests, costumes as data | New content without new code |
| On-device ML | transformers.js 3.8 (WASM), ormbg q8, MobileCLIP S0 fp32 | Photos never uploaded for processing |
| Online | Supabase: Auth, Postgres with Row Level Security, Storage, SQL functions | Free tier; security in the database, not the client |
| Extensibility | Plugins register scenes, menu items and event listeners (`duel`, `move`, `block`, `save`, `hockey`, `catch`, `capsule`...) | Online part can be switched off by config |

Test hooks (`?debug`): `__psSaveAuto` (`'perfect' / 'good' / 'miss'`) resolves SAVE IT! without timing; `__psJudgeSave(t, diff)` is the pure timing judge.

### Data model (online)
| Table | Holds | Who can read |
|---|---|---|
| profiles | name, friend code, title, level, stars, avatar | self and friends |
| saves | the whole save as JSON | self only |
| toys | toy data + picture link | self and friends |
| friends | pairs of players | self |
| inbox | gifts, stickers, revenge calls | receiver |
| boss / boss_hits | weekly Kraken and damage per player | via functions |
| catch_scores, likes | weekly scores, hearts | via functions |
| recovery, daily_limits | hashed recovery codes, rate limits | nobody (functions only) |

**Quality:** every release is tested headless in both orientations (Playwright suite in `tests/`, run by CI on every push), checked by the `qa-tester` agent (reports in `docs/qa/`); online screens with a mock service; SQL on a local Postgres with a copy of the Supabase auth schema.

## 15. Safety and privacy
Designed for children first, with the amended COPPA rules (compliance date 2026) and GDPR-K in mind.

| Risk | What the game does |
|---|---|
| Personal data | No e-mail, phone, real name, birthday or location is ever asked. Names are checked by a word filter; the sign-up screen says "not your real full name". |
| Photos | Background removal and recognition run on the device. Only the cut-out toy is stored, and only in the cloud when the child has an account. Photos of people are never needed. |
| Strangers | No search, no public lists. You only see players you added by their code. Leaderboards and the museum show friends only. |
| Chat | No free text between players. Only 8 fixed stickers and fixed messages ("X beat your toy!"). |
| Money | No purchases, no ads, no paid currency. Capsules are free and limited by play, quests and friends. |
| Over-play | Bedtime and daily limit set by a parent, also for Pond Hockey and the comic; no rewards for long sessions; no streak punishment. |
| Scary content | The beam takes a card, never a character, and gives it back; Sasquatch is shy and friendly; nobody gets hurt. |
| Accounts | Password recovery by a code written on paper; brute force limited to 5 tries an hour. Database rules make every player's save private. |
| Parent gate | Parent screens require a typed multiplication answer (6–9 × 6–9). |

### Before a public launch
- Privacy policy and parental consent screen; a way for a parent to delete an account and all its data from inside the game.
- Store review for kids categories (Apple Kids, Google Families).
- Moderation for toy names shown to friends (filter, report button).

## 16. Version history
Eight versions in about a week, one release per idea, each tested on a real 10-year-old.

| Version | Date | Name | What shipped |
|---|---|---|---|
| v0.1 | Sep 2026 | Prototype | Single-file artifact: Jack vs Timmy the Tiger, Russian and English versions. |
| v0.2 | Sep 30 – Oct 2 | Real game | Rewrite in Phaser: particles, hit-stop, shake, damage numbers, synthesized sound and lullaby. PWA on GitHub Pages. |
| v0.3 | Sep 30 – Oct 2 | Rivals map | Timmy → Moo → Sly → boss Professor Hoot. 1–3 stars, unlocks, rival-specific moves. Status effects (dizzy, shield). Jack learns moves at levels 2–4. |
| v0.4 | Oct 2 | + Toy | Photo → on-device cut-out → type guess from 44 types → hero generator. My Squad. v0.4.1: instant updates on phones. |
| v0.5 | Oct 3 | Space | World 2 with Robo-Bop, Polandball, Boo, Giant Dragon Boss. Inferno Rain and BLOCK IT!, difficulty grows with level, Star Catch mini-game. |
| v0.6 | Oct 3 | Capsules | EASY / NORMAL / HARD, seamless rotation, capsule machine with 10 boosters. |
| v0.7 | Oct 2026 | Friends | Accounts and cloud saves, friends, gifts, stickers, mail, toy museum, weekly Kraken. Sticker album, Me card, costumes, real-life quests, parents area, bedtime. Halloween SPOOKY world, What's new popup. |
| v0.8 | 4 Oct 2026 | Canada | World 3 Canada (Max, Bob, Mountie Bear, Sasquatch) with SLAPSHOT + SAVE IT!, `north` music, arrival comic, Pond Hockey. Space rework: The Blips, The Mothership, "Fire or Beam?". Boss hats, Royal Crown for Superstar, save migration with gift toasts. 6 new stickers (27), 6 new quests (24), album pages. Fixes: photo CANCEL (B41, #43), title layout (B44, #45), bigger REMOVE button (B50, #48), QA B42-B49. |

Patches after v0.7 (hotfixes, no What's new):
| Version | What changed |
|---|---|
| v0.7.1 – v0.7.4 | Account screens, iOS safe areas, full-screen on iPhone, iOS 26 bottom strip. |
| v0.7.5 | QA fixes: booster picker on iPad, rotation mid-turn, bedtime before new duels, map start world, Kraken fixed at 220, booster refund on BACK, result notes, quests carry over, save on logout. |
| v0.7.6 | Duel and boss music (procedural); fix of the result screen crash in friend and Kraken duels. |
| v0.7.7 | Booster refund in every duel (B30); Kraken result goes to the Weekly Boss screen (B33); rotation keeps the duel music (B34). |
| v0.7.8 | Rotation waits for the result celebration and sticker toasts (B36, B37, B40); greyed move cards and card icons (owner notes). |

What's new 0.8 (8 lines, `WHATS_NEW['0.8']`): CANADA · SAVE IT! · Pond Hockey · New Space rivals · The Mothership · Boss hats · Comic · New quests (G42).

## 17. Roadmap
What comes next, in order. Every item is a proposal to test with the chief tester first.

| Version | Focus | Main features | Size |
|---|---|---|---|
| v0.7 | Friends | Accounts, friends, weekly boss, quests, parents, Halloween | shipped |
| v0.8 | New world | Canada, Space rework, boss hats, comic, Pond Hockey | shipped (ready) |
| v0.8.x | Small follow-ups | Retro comics for Space and Pillow Hills; Home Screen icon close-up + maskable icon (B29) | S |
| v0.9 | Together | Two players on one iPad, live online duels; toys "go on an adventure" instead of being deleted (#47) | L |
| later [?] | More worlds | Ocean world, Shell Dive, daily streak with a Sleepy Pillow, Pond Hockey friends board (needs a schema change) | M |
| v1.0 | Launch | Toy growth, seasons, localisation, settings, consent, store build | L |

### Ocean world (not scheduled [?])
The tester's other world wish, with a water twist on every mechanic.
- Rivals: Shelly the Turtle (shell shield), Captain Pinch the crab (pinch combo), Dolly Dolphin (splash, sonar dizzy), boss Mega Shark (tidal wave: a charged move blocked by a pool float).
- Mini-game Shell Dive: swim down, collect shells, avoid jellyfish.

### Daily streak (not scheduled [?])
- 7-day track with growing rewards: XP, capsules, a golden capsule on day 7.
- One missed day a week is saved automatically by a "Sleepy Pillow". After two missed days the streak restarts at day 1, without any warning screen.

### v0.9 · Two players on one iPad
- Tabletop layout: the iPad lies flat, player 2's half is rotated 180°.
- Each player picks a hero from the same squad; no AI.
- Pass-and-play mode for phones.

### v0.9 · Live online duels
- Invite a friend from the Friends screen; both see READY; 20 seconds per turn; the AI plays a turn if time runs out.
- Only fixed quick reactions, no chat.
- Tech: Supabase Realtime channels; the server checks every move.

### v0.9 · Toys go on an adventure (#47)
Instead of a hard delete, a toy the child removes "goes on an adventure" (owner's decision; design to come).

### v1.0 · Toy growth (idea)
- Toys earn their own XP and levels, unlock a fifth and sixth move, then a golden outline.
- Badges from rivals they beat.

### v1.0 · Seasons (idea)
- Spooky (1 Oct – 7 Nov, live now), December Snow Fort, February Hearts, April Egg Hunt, July Beach.
- Each season: 4 rivals, 3 hats, 6 stickers and a themed Star Catch.

### v1.0 · Launch readiness (idea)
- Localisation: Russian and Ukrainian.
- Settings screen: music volume, reduce motion, left-handed card layout.
- Parent consent, privacy policy, delete-account button, toy-name moderation.
- Optional native wrapper for the App Store (Kids category).
- Simple, privacy-friendly analytics: daily players, duel wins by rival (balance), feature use. No personal data.

## 18. Risks and open questions
| Risk | Impact | Mitigation |
|---|---|---|
| Difficulty swings: bosses on NORMAL get much harder 1-2 levels after arrival (design sims for the Mothership and Sasquatch) | Kids quit a rival | Watch real duels; tune multipliers in one place; EASY is always available; a tuning pass after v0.8 [?] |
| SAVE IT! timing on old or slow devices | Unfair misses | `performance.now()` judging, hiccup rule (restart, then auto good save), EASY can never miss |
| Supabase free tier pauses after a week without activity | Online features stop | Offline play continues; unpause in one click; paid tier if the group grows |
| On-device models are large (90 MB) and slow on old phones | + Toy feels broken | Download once and cache; progress bar; manual type picker always works; CANCEL while processing |
| Kids forget passwords | Lost progress | Recovery code on paper; parent reset in the dashboard |
| Capsules feel like gambling | Parent trust | Never sold, shown odds, no streak of "almost"; golden capsules only from co-op |
| Inappropriate toy names between friends | Safety | Word filter now; report and hide in v1.0 |
| Scope grows faster than testing | Bugs on real devices | One version at a time, headless tests in both orientations, `qa-tester` agent on every PR |

### Open questions
- Should HARD give better capsules instead of only more XP?
- Should friends see each other's sticker albums?
- How strong should the weekly Kraken be? 6000 pep is about 30 full fights: right for a small friend group, far too easy with hundreds of players. Scale it with the number of active players?
- Should toys from friends be "borrowable" as heroes for one duel?
- Level drift on NORMAL (see risks): tuning pass after v0.8?
- Umbrella Hero counts Mini Beam blocks, so it can be earned on the Blips alone (G38). Keep?

## 19. Appendix: content tables

### Stickers (27)
| Sticker | How to get it | Title unlocked |
|---|---|---|
| First Win! | Win your first duel | Pillow Rookie |
| Pillow Pro | Win 25 duels | Pillow Pro |
| Class Dismissed | Beat Professor Hoot | Top Student |
| Into Space! | Beat The Blips (id `polandball`; old Polandball wins count) | Space Cadet |
| Dragon vs Dragon | Beat a friend's Jack (v0.8; earned stickers stay) | Dragon Champion |
| Saucer Champ (v0.8) | Beat The Mothership (counted from v0.8 on, `stats.motherWins`) | Space Champion |
| King of Halloween | Beat Count Fang (shown during the event or once earned) | Pumpkin King |
| Hard as Pillows | Beat a boss on HARD | Hard Mode Hero |
| Superstar | All 24 stars in Pillow Hills + Space (also gives the Royal Crown) | Superstar |
| Firefighter | Block Inferno Rain 5 times (extinguisher) | Firefighter |
| Capsule Hunter | Open 10 capsules | Capsule Hunter |
| Lucky Duck | Get a super rare booster | Lucky Duck |
| Toy Maker | Add your first toy | Toy Maker |
| Squad Goals | Have 5 toys | Squad Leader |
| Star Catcher | Score 30 in Star Catch | Star Catcher |
| Galaxy Hands | Score 50 in Star Catch | Galaxy Hands |
| Sleepyhead | Take 10 Upside-Down Naps | Sleepyhead |
| Super Helper | Finish 5 real-life quests | Super Helper |
| Best Buddies | Add a friend | Best Buddy |
| Kind Heart | Send a gift | Kind Heart |
| Friendly Rival | Beat a friend's toy | Friendly Rival |
| Big Friend (v0.8) | Beat Sasquatch | Sasquatch's Buddy |
| Goalie (v0.8) | Make 10 perfect saves | Goalie |
| Hat Trick (v0.8) | 3 goals in a row in Pond Hockey | Hat Trick Hero |
| Slapshot Star (v0.8) | Score 20 in Pond Hockey | Slapshot Star |
| Umbrella Hero (v0.8) | Block the Tractor Beam 5 times (Mini Beam counts, G38) | Umbrella Hero |
| Kraken Fighter | Fight the weekly Kraken | Kraken Fighter |

### Real-life quests (24, three a day)
Tidy up your toys · Read a book for 15 minutes · Brush your teeth morning and night · Help with the dishes · Make your bed · Play outside for 30 minutes · Eat all your veggies · Put your clothes away · Do a puzzle or build something · Give someone a big hug · Draw a picture for someone · Water the plants · Help with a pet (or a plush pet!) · Sing or play a song · Do 20 jumping jacks · Finish your homework · Wash your hands before dinner · Help sweep or vacuum a room · *v0.8:* Build a pillow fort · Make pancakes (or breakfast) with a grown-up · Go outside and find a cool leaf or pinecone · Say "please", "thank you" and "sorry" today · Learn 3 facts about a moose, beaver or bear · Feed the birds with a grown-up

### Star Catch
30 seconds. The hero follows the finger along the ground. Stars +1, dumplings +3 (candy during Halloween), pillows −2 and a short stun. Items fall faster over time; spawn interval 0.62 s down to 0.30 s. XP = score, max 60; best score is saved and shared on the friends' weekly board. The intro card shows what to catch and what to dodge.

### Pond Hockey (v0.8)
Opens after the first win over Beaver Bob; the Canada map's mini-game button then reads POND HOCKEY. 45 seconds, nobody loses.
- **Controls:** swipe up from the lower half (angle clamped to about ±35°, a faster swipe = a faster puck, 0.45–0.7 s); or tap the net area (medium speed); or arrows + SPACE.
- **Scoring:** goal +1; every 5th puck is a golden maple puck, +2. Post: DING!; Bob's save: NOPE!; wide: WIDE!. Nothing is taken away. Three goals in a row pop HAT TRICK!.
- **Bob:** slides in the net, slow (0–15 s), medium (15–30 s), fast with random turns (30–45 s). From 30 s, every 8 s he builds a pillow dam over half the net for 3 s.
- **Same for every difficulty.** XP = score × 2, max 60. Best score in `bestHockey`; `stats.hockeyStreak` keeps the best streak.
- **Layout:** net in the middle of the rink (portrait y = max(720, 0.4·H), landscape y = max(290, 0.32·H)), hero with a stick at the bottom (G41). Music: `calm`.

### Glossary
| Term | Meaning |
|---|---|
| Pep | Hit points. Losing all pep means "too sleepy to go on". |
| Capsule | Free surprise from the machine, contains one booster. |
| Booster | One-duel bonus chosen before a duel. |
| Golden capsule | Guaranteed super rare booster, from the weekly Kraken. |
| Squad | Jack plus the player's photographed toys. |
| Charge | A rival's turn spent winding up a big attack (fire, beam, slapshot). |
| SAVE IT! | The timed tap that saves a SLAPSHOT. |
| Grown-up gate | A typed multiplication question in front of parent screens. |
