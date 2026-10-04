# Plush Squad: Game Design Document

**Version 0.7** (GDD v0.7, October 2026), transferred from the PDF on 4 Oct 2026. Live build: v0.7.7. Owner: Kondrat. Chief tester: a 10-year-old. Live: [kondrat1983.github.io/plush-squad](https://kondrat1983.github.io/plush-squad/).

A gentle, funny pillow-fight game where a child's real plush toys become the heroes, friends duel each other's squads, and real-life kindness earns rewards.

> **This file is the main version of the GDD.** It lives in the repo from 4 Oct 2026 on. Sections 1 to 15 describe the game as it is built today. Section 16 lists what shipped in each version. Section 17 is the plan for the next versions. Numbers in tables are the real values from the code; where the PDF and the code disagreed, the code wins and the gap is listed in [findings.md](findings.md) (G-IDs). The PDF had screenshots and mockups; they are not copied here.
>
> Related: [decisions.md](decisions.md) (owner decisions), [ideas.md](ideas.md) (idea log), [findings.md](findings.md) (GDD vs code), `docs/qa/` (QA reports).

## Contents
1. Executive summary
2. Vision and design pillars
3. Audience and personas
4. Core loop and session flow
5. The duel
6. Heroes: Jack and your own toys
7. Rivals and worlds
8. Progression and difficulty
9. Rewards: capsules, boosters, stickers
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
| 3 to 10 minutes | None. Free, no ads, no purchases | v0.7.7 live (see G31) |

### The pitch
Kids already love their plush toys and invent battles for them on the bed. Plush Squad takes that game onto the screen. Take a photo of a toy and the game cuts it out on the device, guesses what kind of animal it is and turns it into a hero with its own moves. Then the toy fights a cast of silly rivals in pillow duels where nobody gets hurt: they giggle until they give up.

Around the duel sits a light, honest meta: stars and levels, a capsule machine with surprise boosters, a sticker album, friends who can duel your toys, a weekly boss everyone fights together, and real-life quests (tidy your toys, read a book) that a grown-up confirms.

### What makes it different
- **Your own toy is the hero.** No figures to buy (the trap that killed Skylanders and Disney Infinity). The toy is already on the bed.
- **Gentle conflict.** "Pep" instead of health, giggles instead of knockouts, a hero who naps upside down to heal.
- **Real-world loop.** Quests happen away from the screen and a parent approves them.
- **Safe by design.** Accounts without e-mails, friends only by code, no chat, toy photos processed on the device.

### Where we are
Seven versions in one week, each shaped by the chief tester's feedback (survey of 2 October: "AWESOME", "they are all easy 😎", "add Polandball"). The game is playable at kondrat1983.github.io/plush-squad; a small group of family friends is already playing.

## 2. Vision and design pillars

**Vision:** Every child's favourite toy deserves to be a hero, and being kind in real life should feel as good as winning a duel.

1. **My toy, my hero.** The emotional core. Anything the player owns can join the squad in under a minute, with a name, a type and four moves that feel right for it (a tiger roars, a dragon sneezes fire). Jack, our real plush dragon, is the mascot and the default hero.
2. **Silly, never scary.** Pillows, tickles, sneezes, dances. Every hit pops feathers and big comic words. Losing means "too sleepy to go on". Rivals are characters with jokes, not enemies.
3. **Juicy and readable.** A 10-year-old understands every screen at a glance: big cards, one clear action, numbers that fly. Hit-stop, screen shake, squash and stretch and synthesized sounds make each tap feel great.
4. **Family-safe by default.** No money, no ads, no chat, no e-mails. Parents have a gate, a bedtime and a play-time limit. The game rewards real chores and reading, not endless play.

### Design rules we follow
- **Feedback beats balance spreadsheets.** Each version answers something the chief tester said.
- **No dark patterns.** Capsules are a surprise mechanic, never sold. Daily rewards never punish a missed day.
- **Everything works offline.** Online features add to the game; they never block it.
- **One more turn, not one more hour.** Short sessions, bedtime respected, the hero literally falls asleep at night.

### Out of scope (on purpose)
- Open chat or free-text messages between kids.
- Real-money purchases, loot boxes for money, ads.
- Uploading photos of people. Only cut-out toys ever leave the device, and only when the player has an account.
- Violent themes. Even the Dragon Boss only rains fire that can be put out with an extinguisher.

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
| New rivals: Dragon Boss, Robot, Ghost + Polandball | World 2: SPACE with Robo-Bop, Polandball, Boo, Giant Dragon Boss | 0.5 |
| "Inferno rain from the sky, blocked by a fire extinguisher, or milk" | Inferno Rain with a BLOCK IT! extinguisher; rivals block with milk | 0.5 |
| Top 3: new worlds, mini-games, real-life quests | Star Catch mini-game; SPOOKY world; real-life quests | 0.5, 0.7 |
| Funniest move: Upside-Down Nap | Kept as Jack's signature; Batty the Bat naps too; Sleepyhead sticker | 0.7 |

## 4. Core loop and session flow
The core loop is one duel long, about 2 minutes. Everything else either feeds it (boosters, new moves) or rewards it (stars, stickers, capsules).

**Pick a rival** (map, world tabs) → **Pillow duel** (booster, moves, turns) → **Rewards** (XP, stars, capsules) → **Grow** (levels, moves, unlocks) → back to Pick a rival.

Side loops feed the core: capsule machine → boosters for the next duel; sticker album → capsules + titles; real-life quests → capsules + XP; friends, weekly boss, Star Catch.

### A typical session (6 minutes)
| Minute | What happens | Why it matters |
|---|---|---|
| 0:00 | Title screen. Daily gift capsule pops on the map. "What's new" after an update. | Return reason, low pressure |
| 0:30 | Open a capsule: crank, shake, tap to open, rarity reveal. | Surprise and delight, no cost |
| 1:00 | Pick the next rival on the map, choose a booster. | Agency, small strategy |
| 1:30 | Duel: 6 to 10 turns of pillows, sneezes and dances. | The core fun |
| 3:30 | Result: stars fly in, XP bar fills, "New rival unlocked!", maybe a new move or sticker. | Progress you can see |
| 4:00 | Mail: a friend beat your toy. Revenge duel. | Social pull |
| 6:00 | 30 seconds of Star Catch, or off to do a real quest. | Ends on a high note |

Map: world tabs at the top (Pillow Hills, Space, Spooky), difficulty switch at the bottom, capsule and boss buttons top right. Before every duel the player may spend one booster from the capsule collection.

## 5. The duel
A duel is a turn-based exchange between the hero and one rival. The player taps a move card; the rival answers. First to run out of **pep** giggles and gives up.

### Rules
- Hero acts, then rival acts. **Dizzy** skips one turn. **Shield** halves the next hit. A **crit** is any hit of 20 or more: bigger shake, zoom and a CRIT! word.
- Some moves have uses per duel (shown as "once", "2 left", then a USED stamp).
- Stars at the end: 3 if the hero keeps ≥ 70% pep, 2 if ≥ 35%, otherwise 1.

### Move types (data-driven engine)
Every move in the game, for Jack, rivals and photographed toys, is a small data object with a `type`. Twelve types cover all 70+ moves:

| Type | Behaviour | Examples |
|---|---|---|
| throw | Projectile in an arc (pillow, pierogi, pumpkin) | Pillow Whack, Pierogi Toss |
| tickle | Run in, three tickles, random damage | Tickle Attack (5–28) |
| spray | Particle cone; can freeze/slime the target | Frosty Sneeze, Laser, Slime |
| roar | Rings of sound + big word | RRRRR!, BOOOO!, BLAH BLAH! |
| quake | Jump and stomp; Polandball flies off-screen first | Moo-Quake, Cannot Into Space! |
| rush / hop | Dash or three hops into the target | Tail Whip, Bounce Bounce |
| multi | Several small hits in a spin | Tail Spin (3 × 5–9) |
| volley | Three thrown objects | Pop Quiz (books), Bat Attack |
| heal / nap | Restore pep; nap flips the hero upside down | Dumpling Snack, Upside-Down Nap |
| shield | Next hit does half | Pillow Fort, Hussar Helmet |
| dizzy / dance | Target skips its next turn | Six-Seven Dance, Hypno Stare |
| rain | Charge one turn, then 5 fireballs; can be blocked | Inferno Rain (22–30) |

### Signature mechanic: Inferno Rain
Designed by the chief tester. The Giant Dragon Boss **gathers fire** for one turn: the sky turns red and embers rise. The player now sees a pulsing **BLOCK IT!** button with a fire extinguisher.
- **Block:** uses the turn; the fireballs hit a cloud of foam, PSSHHH!, 0 damage, and the boss is **STEAMED!** (dizzy).
- **Ignore:** attack instead and take 24–30 damage.
- **Make the boss dizzy** while charging (Six-Seven Dance): the fire fizzles out.
- Jack learns Inferno Rain at level 5. Rivals with milk left (Moo, Prof. Hoot) block it with a milk splash.

### Rival AI
Each rival move has a weight. Filters remove useless choices (healing at high pep, shielding twice, making an already dizzy hero dizzy). On NORMAL and HARD the AI is smarter: ×4 weight for a finishing blow, ×0.5 for hitting a shield, ×2.5 for healing below 35% pep. On EASY weights are used as they are.

## 6. Heroes: Jack and your own toys

### Jack, the mascot
Jack is a real blue plush dragon, photographed from three angles (side, front, upside down for his nap). He starts with four moves and learns one more at each of the first levels.

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

My Squad: Jack plus photographed toys. Tap a toy to play as it or duel it.

### + Toy: photo to hero in under a minute
Fully automatic and private. The photo never leaves the device unless the player has an account and the cut-out is saved to the cloud.
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
Rivals are characters with an intro line, a "laugh" line when they give up and 3–5 moves (G33). They unlock in order: beat one to open the next. Each world ends with a boss wearing a crown.

| World | Rival | Pep | XP (win) | Moves |
|---|---|---|---|---|
| Pillow Hills | Timmy the Tiger | 100 | 40 | Pillow swing, tickle, funny ROAR |
| | Moo the Cow | 120 | 55 | Moo-Quake, Milk Break, shield |
| | Sly the Snake | 130 | 70 | Tail whip, hypno-sway, HSSSS |
| | Professor Hoot (boss) | 150 | 100 | Pop Quiz books, THE STARE, milk |
| Space (after Prof. Hoot) | Robo-Bop | 135 | 110 | PEW PEW laser, robot dance, recharge |
| | Polandball | 145 | 120 | Pierogi Toss, Bounce Bounce, Cannot Into Space!, hussar helmet |
| | Boo the Space Ghost | 155 | 130 | BOO, slime, spooky circles, see-through |
| | Giant Dragon Boss | 200 | 180 | Inferno Rain, tail spin, fire sneeze |
| Spooky (Halloween event, 1 Oct – 7 Nov, G34) | Pumpkin Pete | 110 | 50 | Pumpkin toss, candy storm, MWAHAHA |
| | Batty the Bat | 125 | 60 | Swoop, sonar, upside-down nap |
| | Webster the Spider | 140 | 70 | Sticky web, eight-leg tickle |
| | Count Fang (boss) | 175 | 120 | Bat attack, hypno stare, cape |
| Weekly (co-op) | Pillow Kraken | 220 per duel (fixed) / 6000 shared | 60 | Tentacle tickles, ink, BLUB BLUB |

Pep values are at NORMAL difficulty and level 1. They grow with the player's level (section 8). Duels against the player's own toys and friends' toys start from the toy's own pep (95–130) and scale with level and difficulty the same way (owner's decision, see G24). The Kraken's pep is fixed at 220 (owner's decision); its damage still scales (G26). The XP column is added in this transfer from the code.

Polandball tries to fly into space... CANNOT! and falls on Jack.

## 8. Progression and difficulty

### Experience and levels
XP needed for the next level: `need(L) = 100 + 50 × (L − 1)`, so 100, 150, 200, 250... Level 5 takes 700 XP in total, about 10 to 14 duels.

| Source | XP |
|---|---|
| Win vs rival | 40–180 (by rival; boss more) |
| First win over a rival | +20 bonus |
| Loss | 10 (no one leaves empty-handed) |
| Own toy duel (win) | 30 |
| Friend's toy or friend's Jack duel (win) | 35 |
| Weekly Kraken (win) | 60 |
| Star Catch | score, max 60 |
| Real-life quest approved | +20 |
| HARD mode | ×1.5 |
| Super Star booster | ×2 |

### Difficulty
The tester found v0.4 too easy, so difficulty now has two layers: the player's choice and the player's level.

| Mode | Rival pep | Rival damage | AI | XP |
|---|---|---|---|---|
| EASY | × 0.8, no level growth | × 0.8 | simple weights | ×1 |
| NORMAL | × (1 + 0.07·(L−1)), max 1.4 | × (1 + 0.05·(L−1)), max 1.3 | smart | ×1 |
| HARD | NORMAL × 1.2 | NORMAL × 1.15 | smart | ×1.5 |

Space rivals start scaling later (from level 4) and cap lower: pep × (1 + 0.05·(L−4)), max 1.25; damage × (1 + 0.04·(L−4)), max 1.2, because their base values are already higher (G25). Spooky rivals scale like Pillow Hills. The Kraken's pep never scales (fixed 220); its damage does (G26).

### Unlocks
- Next rival: after one star on the previous rival. Next world: after its previous boss. Event worlds are open from day one of the event (Spooky: 1 October to 7 November).
- Jack's moves: level 2, 3, 4, 5 (section 6). Costumes: from the Spooky event rivals (Pumpkin Pete: pumpkin, Batty: top hat, Webster: witch hat, Count Fang: crown) (G32). Titles: from stickers.
- Real-life quests feed progression too (section 10). Me: player card with title, stats and costumes.

## 9. Rewards: capsules, boosters, stickers
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

Drop weights: common 14, rare 8, super rare 4 per booster, so a capsule gives a common booster 46.7% of the time, rare 44.4%, super rare 8.9%. A booster picked and then given back with BACK before the first move returns to the collection.

### Sticker album
21 achievements. Each gives a capsule; most also unlock a title for the player card (Pillow Rookie, Space Cadet, Firefighter, Kraken Fighter...). Earned stickers wobble, locked ones are silhouettes. Full list in the appendix.

## 10. Real-life quests and parents
The game's way to say "go and do something real". Three quests a day, chosen from 18, the same for the whole day.

### Quest flow
1. The child does the task for real (tidy toys, read 15 minutes, brush teeth, help with the dishes, water the plants, 20 jumping jacks...).
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

**Design note:** bedtime never interrupts a duel in progress. It is checked only when a menu screen opens (and before a new duel), so the child always finishes the fight and sees the result before Jack goes to sleep. Bedtime screen: Jack sleeps upside down, zzz floats up, a small PARENTS button in the corner.

## 11. Social and online play
Friends make the game travel between homes. Everything social is asynchronous, code-based and free of chat.

### Accounts without e-mails
- A name (3–16 letters, numbers or _; a simple word filter) and a password. Internally the name maps to a private address that never receives mail.
- On sign-up the child gets a recovery code (like `ZWND-6WXP`) to write down. Name + recovery code + new password restores access; 5 wrong tries lock it for an hour.
- Guest progress moves into the new account. Logging in on a second device asks "Which progress do you want to keep?".

### Features
| Feature | How it works | Limits |
|---|---|---|
| Friends by code | Each player has a code like `PKWG-W6`. Adding is mutual. | 20 new friends a day |
| Duel a friend's squad | Their photographed toys (or their Jack, at their level) become rivals, played by the AI. | none |
| Revenge | Winning sends "X beat your Cat! Revenge?" to the owner, with a REVENGE button. | 40 a day |
| Gifts | A free capsule, or one of your boosters. | 1 capsule, 3 boosters a day |
| Stickers | GG!, REMATCH?, LOL, COOL, WOW!, HUG, ZZZ, INTO SPACE! | 40 a day |
| Mail | Friend requests, gifts to open, stickers, revenge calls. | 30 newest |
| Toy Museum | All toys of you and your friends, with hearts. | friends only |
| Star Catch top list | Best score this week among you and your friends. | friends only |
| Weekly Pillow Kraken | One boss for every player, 6000 pep. Each duel's damage counts. When it falls, everyone who hit it claims a golden capsule. The Kraken result panel sends the player back to the Weekly Boss screen (BOSS button), which counts the tries. | 3 fights a day |

## 12. Screens and UX
Title → Me, Friends, Map, Album, Quests, Parents. Map → Star Catch, Booster, Capsules, Weekly boss. Friends → Friend duel. Booster → Duel. Every duel ends on a result panel: NEXT RIVAL / REMATCH (BOSS for the Kraken, see G27) and back to where you came from.

### UX principles
- One big action per screen (TAP TO PLAY, TURN!, FIGHT!), secondary actions smaller and cream-coloured.
- Readable at arm's length: 1080-pixel logical canvas, titles 60–80 px, buttons at least 90 px tall (not true everywhere yet, see G29 / B26).
- Any orientation, any time. Rotating the phone rebuilds the layout and puts the player back exactly where they were, even mid-duel.
- Short phones: map nodes shrink to fit; duels with many moves switch to 3 card columns and smaller fighters.
- Feedback within 100 ms: every tap presses the button down, plays a click and wobbles (not true for every button yet, see G30 / B27).
- Patch notes for kids: a "What's new" popup after each update with icons and one line per feature. CLOSE shows it again next launch; DON'T SHOW AGAIN hides it until the next version. Hotfixes never add lines (owner's rule).

## 13. Art, audio and feel

### Visual direction: "a bedroom at night"
A deep blue night sky with twinkling stars, a quilted blanket as the ground, a moon that wobbles. Characters are bright and soft. Jack is a real photo cut-out with a white sticker outline, and photographed toys get the same treatment, so the child's toy looks like it belongs.

| Ink | Night | Star | Cream | Coral | Mint |
|---|---|---|---|---|---|
| #1D2163 | #272C7C | #FFD23F | #FFF3D2 | #FF6B5B | #7FD6C2 |

### Characters and icons
Rivals and icons come from Microsoft's Fluent Emoji 3D set (MIT licence) with a white sticker outline, so the cast reads as one family of toys. Polandball and the witch hat are drawn for the game.

### Juice checklist
- Hit-stop (60–130 ms) and screen shake on every hit, zoom on crits
- Squash and stretch on attacker and target
- Feathers, sparks, snow, slime, embers and steam particles
- Flying damage numbers, ghost pep bar that drains after the hit
- Banners for YOUR TURN / RIVAL'S TURN
- Confetti on wins, level-up and super-rare capsules

### Type
Poppins Bold for everything in the game: rounded, friendly, readable. Words like ACHOO!, BOING! and PSSHHH! are part of the art.

### Audio
Every sound is synthesized live with Web Audio: no audio files at all. 30+ effects (thump, whoosh, sneeze, moo, hiss, hoot, laser, BOO, fire, steam...) and procedural music: `calm` lullaby in menus, `battle` in duels, `boss` for crowned rivals and the Kraken (since v0.7.6). One mute button on every screen.

Consistent UI kit: night panels with a seam stitch, star-yellow primary buttons, cream secondary buttons, icons that wobble.

## 14. Technical design
- **Device** (browser / installed PWA): `game.js` (Phaser 3.90: scenes, duel engine, save), plugins `extra.js` (local) and `net.js` (online), toy worker (ormbg + MobileCLIP on device), `audio.js` (Web Audio synth), localStorage + IndexedDB (save, toy pictures), service worker (offline cache, instant updates).
- **GitHub Pages:** static files, free hosting.
- **Supabase:** Auth (name + password), Postgres + Row Level Security, about 20 SQL functions, Storage for toy cut-outs, free tier.

| Area | Choice | Why |
|---|---|---|
| Engine | Phaser 3.90, plain JavaScript, no build step | Fast iteration; anyone can open the files |
| Delivery | Progressive Web App on GitHub Pages | Free, instant updates, installable on iPad |
| Updates | Service worker: network-first for code, cache-first for art | New versions arrive on next launch, still works offline |
| Layout | 1080-px logical canvas, FIT scaling, portrait and landscape layouts | One codebase for phone, tablet, desktop |
| Rotation | Game rebuilt for the new size; scene + duel snapshot restored | No lost duels when the child turns the iPad |
| Content | Moves, rivals, boosters, stickers, quests as data | New content without new code |
| On-device ML | transformers.js 3.8 (WASM), ormbg q8, MobileCLIP S0 fp32 | Photos never uploaded for processing |
| Online | Supabase: Auth, Postgres with Row Level Security, Storage, SQL functions | Free tier; security in the database, not the client |
| Extensibility | Plugins register scenes, menu items and event listeners | Online part can be switched off by config |

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

**Quality:** every release is tested headless in both orientations (Playwright suite in `tests/`, run by CI on every push), checked by the `qa-tester` agent (reports in `docs/qa/`); online screens with a mock service; SQL on a local Postgres with a copy of the Supabase auth schema (sign-up, friends, gifts once a day, likes, password recovery, privacy between players).

## 15. Safety and privacy
Designed for children first, with the amended COPPA rules (compliance date 2026) and GDPR-K in mind.

| Risk | What the game does |
|---|---|
| Personal data | No e-mail, phone, real name, birthday or location is ever asked. Names are checked by a word filter; the sign-up screen says "not your real full name". |
| Photos | Background removal and recognition run on the device. Only the cut-out toy is stored, and only in the cloud when the child has an account. Photos of people are never needed. |
| Strangers | No search, no public lists. You only see players you added by their code. Leaderboards and the museum show friends only. |
| Chat | No free text between players. Only 8 fixed stickers and fixed messages ("X beat your toy!"). |
| Money | No purchases, no ads, no paid currency. Capsules are free and limited by play, quests and friends. |
| Over-play | Bedtime and daily limit set by a parent; no rewards for long sessions; no streak punishment. |
| Accounts | Password recovery by a code written on paper; brute force limited to 5 tries an hour. Database rules make every player's save private. |
| Parent gate | Parent screens require a typed multiplication answer (6–9 × 6–9). |

### Before a public launch
- Privacy policy and parental consent screen; a way for a parent to delete an account and all its data from inside the game.
- Store review for kids categories (Apple Kids, Google Families).
- Moderation for toy names shown to friends (filter, report button).

## 16. Version history
Seven versions in one week, one release per idea, each tested on a real 10-year-old.

| Version | Date | Name | What shipped |
|---|---|---|---|
| v0.1 | Sep 2026 | Prototype | Single-file artifact: Jack vs Timmy the Tiger, Russian and English versions. |
| v0.2 | Sep 30 – Oct 2 | Real game | Rewrite in Phaser: particles, hit-stop, shake, damage numbers, synthesized sound and lullaby. PWA on GitHub Pages. First reaction from the tester: pure delight. |
| v0.3 | Sep 30 – Oct 2 | Rivals map | Timmy → Moo → Sly → boss Professor Hoot. 1–3 stars, unlocks, rival-specific moves. Status effects (dizzy, shield). Jack learns moves at levels 2–4. |
| v0.4 | Oct 2 | + Toy | Photo → on-device cut-out → type guess from 44 types → hero generator. My Squad: play as any toy or duel it. v0.4.1: instant updates on phones. |
| v0.5 | Oct 3 | Space | World 2 with Robo-Bop, Polandball, Boo, Giant Dragon Boss. Inferno Rain and BLOCK IT!, difficulty grows with level, Star Catch mini-game. |
| v0.6 | Oct 3 | Capsules | EASY / NORMAL / HARD, seamless rotation, capsule machine with 10 boosters. |
| v0.7 | Oct 2026 | Friends | Accounts and cloud saves, friends, gifts, stickers, mail, toy museum, weekly Kraken. Sticker album, Me card, costumes, real-life quests, parents area, bedtime. Halloween SPOOKY world, What's new popup, small-phone layout fixes. |

Patches after v0.7 (hotfixes, no What's new):
| Version | What changed |
|---|---|
| v0.7.1 – v0.7.4 | Account screens, iOS safe areas, full-screen on iPhone, iOS 26 bottom strip. |
| v0.7.5 | QA fixes: booster picker on iPad, rotation mid-turn, bedtime before new duels, map start world, Kraken fixed at 220, booster refund on BACK, result notes, quests carry over, save on logout. |
| v0.7.6 | Duel and boss music (procedural); fix of the result screen crash in friend and Kraken duels. |
| v0.7.7 | Booster refund in every duel (B30); Kraken result goes to the Weekly Boss screen (B33); rotation keeps the duel music (B34). |

## 17. Roadmap
What comes next, in order. Every item is a proposal to test with the chief tester first.

| Version | Focus | Main features | Size |
|---|---|---|---|
| v0.7 | Friends | Accounts, friends, weekly boss, quests, parents, Halloween | shipped |
| v0.8 | New worlds | Ocean, Canada, daily streak, Shell Dive | M |
| v0.9 | Together | Two players on one iPad, live online duels | L |
| v1.0 | Launch | Toy growth, seasons, localisation, settings, consent, store build | L |

### v0.8 · World 3: Ocean
**Goal:** the tester's first choice of new world, with a water twist on every mechanic.
- Rivals: Shelly the Turtle (shell shield, slow but tough), Captain Pinch the crab (pinch combo), Dolly Dolphin (splash, sonar dizzy), boss Mega Shark (tidal wave: a new charged move blocked by a pool float).
- Mini-game Shell Dive: swim down, collect shells, avoid jellyfish.
- Reward: snorkel and captain hat costumes.

### v0.8 · World 4: Canada
**Goal:** the second world the tester asked for, built on friendly Canadian jokes.
- Max the Moose ("Sorry, eh!" slapshot), Beaver Bob (builds a dam shield), Mountie Bear, boss Big Foot.
- New moves for Jack from this world: Pancake Stack (heal), Maple Syrup (rival gets sticky = dizzy), Snowball Fight (3 hits).

### v0.8 · Daily streak
**Goal:** a reason to come back every day without punishment.
- 7-day track with growing rewards: XP, capsules, a golden capsule on day 7.
- One missed day a week is saved automatically by a "Sleepy Pillow". After two missed days the streak restarts at day 1, without any warning screen.

### v0.9 · Two players on one iPad
**Goal:** parent and child, or siblings, play a duel together on one tablet.
- Tabletop layout: the iPad lies flat, player 2's half is rotated 180°.
- Each player picks a hero from the same squad; no AI.
- Pass-and-play mode for phones.

### v0.9 · Live online duels
**Goal:** friends duel at the same time from different homes.
- Invite a friend from the Friends screen; both see READY; 20 seconds per turn; the AI plays a turn if time runs out.
- Only fixed quick reactions, no chat.
- Tech: Supabase Realtime channels; the server checks every move.

### v1.0 · Toy growth (idea)
**Goal:** photographed toys become as deep as Jack.
- Toys earn their own XP and levels, unlock a fifth and sixth move, then a golden outline.
- Badges from rivals they beat.

### v1.0 · Seasons (idea)
**Goal:** a free themed season every few months keeps the game fresh without selling a pass.
- Spooky (1 Oct – 7 Nov, live now), December Snow Fort, February Hearts, April Egg Hunt, July Beach.
- Each season: 4 rivals, 3 hats, 6 stickers and a themed Star Catch.

### v1.0 · Launch readiness (idea)
**Goal:** ready for families beyond friends.
- Localisation: Russian and Ukrainian (the tester chose English, many friends may not).
- Settings screen: music volume, reduce motion, left-handed card layout.
- Parent consent, privacy policy, delete-account button, toy-name moderation.
- Optional native wrapper for the App Store (Kids category).
- Simple, privacy-friendly analytics: daily players, duel wins by rival (balance), feature use. No personal data.

## 18. Risks and open questions
| Risk | Impact | Mitigation |
|---|---|---|
| Difficulty swings: HARD too hard after level scaling, or Space bosses too long | Kids quit a rival | Watch real duels; tune multipliers in one place; EASY is always available |
| Supabase free tier pauses after a week without activity | Online features stop | Offline play continues; unpause in one click; paid tier if the group grows |
| On-device models are large (90 MB) and slow on old phones | + Toy feels broken | Download once and cache; progress bar; manual type picker always works |
| Kids forget passwords | Lost progress | Recovery code on paper; parent reset in the dashboard |
| Capsules feel like gambling | Parent trust | Never sold, shown odds, no streak of "almost"; golden capsules only from co-op |
| Inappropriate toy names between friends | Safety | Word filter now; report and hide in v1.0 |
| Scope grows faster than testing | Bugs on real devices | One version at a time, headless tests in both orientations, `qa-tester` agent on every PR, tester session each week |

### Open questions
- Should HARD give better capsules instead of only more XP?
- Should friends see each other's sticker albums?
- How strong should the weekly Kraken be? 6000 pep is about 30 full fights: right for a small friend group, far too easy with hundreds of players. Scale it with the number of active players?
- Should toys from friends be "borrowable" as heroes for one duel?

## 19. Appendix: content tables

### Stickers (21)
| Sticker | How to get it | Title unlocked |
|---|---|---|
| First Win! | Win your first duel | Pillow Rookie |
| Pillow Pro | Win 25 duels | Pillow Pro |
| Class Dismissed | Beat Professor Hoot | Top Student |
| Into Space! | Beat Polandball | Space Cadet |
| Dragon vs Dragon | Beat the Giant Dragon Boss | Dragon Champion |
| King of Halloween | Beat Count Fang | Pumpkin King |
| Hard as Pillows | Beat a boss on HARD | Hard Mode Hero |
| Superstar | All 24 stars in Pillow Hills + Space | Superstar |
| Firefighter | Block Inferno Rain 5 times | Firefighter |
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
| Kraken Fighter | Fight the weekly Kraken | Kraken Fighter |

### Real-life quests (18, three a day)
Tidy up your toys · Read a book for 15 minutes · Brush your teeth morning and night · Help with the dishes · Make your bed · Play outside for 30 minutes · Eat all your veggies · Put your clothes away · Do a puzzle or build something · Give someone a big hug · Draw a picture for someone · Water the plants · Help with a pet (or a plush pet!) · Sing or play a song · Do 20 jumping jacks · Finish your homework · Wash your hands before dinner · Help sweep or vacuum a room

### Star Catch
30 seconds. The hero follows the finger along the ground. Stars +1, dumplings +3 (candy during Halloween), pillows −2 and a short stun. Items fall faster over time; spawn interval 0.62 s down to 0.30 s. XP = score, max 60; best score is saved and shared on the friends' weekly board. The intro card shows what to catch and what to dodge.

### Glossary
| Term | Meaning |
|---|---|
| Pep | Hit points. Losing all pep means "too sleepy to go on". |
| Capsule | Free surprise from the machine, contains one booster. |
| Booster | One-duel bonus chosen before a duel. |
| Golden capsule | Guaranteed super rare booster, from the weekly Kraken. |
| Squad | Jack plus the player's photographed toys. |
| Grown-up gate | A typed multiplication question in front of parent screens. |
