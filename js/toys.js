// Plush Squad — "+ Toy": archetypes, elements, quirks and the hero generator (no LLM, pure data + rules).
(function () {
  'use strict';
  // signature move per archetype. type = one of the generic battle move types (see Battle.doMove)
  const T = (title, type, o) => Object.assign({ title, type }, o);
  const ARCH = [
    ['dragon', 'Dragon', ['dragon'], T('Tail Spin', 'multi', { hits: 3, dmg: [5, 9], sub: '3 hits × 5–9', icon: 'i:dragon' }), 'cookie', ['Spike', 'Ember', 'Puff', 'Sir Scales']],
    ['dinosaur', 'Dino', ['dinosaur', 't-rex'], T('Dino Stomp', 'quake', { dmg: [14, 22], icon: 'i:dinosaur' }), 'leaf', ['Rexy', 'Chomp', 'Stompy', 'Dino Dan']],
    ['bear', 'Bear', ['teddy bear', 'bear'], T('Bear Hug', 'rush', { dmg: [15, 23], word: 'SQUEEZE!', icon: 'i:bear' }), 'honey', ['Teddy', 'Bruno', 'Honey', 'Fuzzy']],
    ['bunny', 'Bunny', ['bunny', 'rabbit'], T('Hop Hop Kick', 'hop', { dmg: [14, 22], icon: 'i:bunny' }), 'carrot', ['Bun-Bun', 'Hoppy', 'Clover', 'Thumper']],
    ['cat', 'Kitty', ['cat', 'kitten'], T('Yarn Ball Toss', 'throw', { tex: 'i:yarn', dmg: [13, 21], icon: 'i:yarn' }), 'fishfood', ['Whiskers', 'Mittens', 'Purrcy', 'Kit-Kat']],
    ['dog', 'Puppy', ['dog', 'puppy'], T('Fetch!', 'throw', { tex: 'i:ball', dmg: [13, 21], icon: 'i:ball' }), 'bone', ['Buddy', 'Biscuit', 'Waffles', 'Rex']],
    ['cow', 'Cow', ['cow'], T('Moo-Quake', 'quake', { dmg: [13, 21], icon: 'i:cow' }), 'apple', ['Moo', 'Daisy', 'Buttercup', 'Milky']],
    ['snake', 'Snake', ['snake'], T('Hypno Sway', 'dizzy', { color: 0xb38cff, word: 'DIZZY!', uses: 1, icon: 'i:snake' }), 'apple', ['Sly', 'Noodle', 'Sssam', 'Wiggles']],
    ['owl', 'Owl', ['owl'], T('Pop Quiz', 'volley', { tex: 'books', dmg: [12, 20], word: 'LESSON TIME!', icon: 'books' }), 'cookie', ['Hoot', 'Professor', 'Wise Wing', 'Olly']],
    ['tiger', 'Tiger', ['tiger'], T('Big Roar', 'roar', { word: 'RRRRR!', color: 0xffb36b, sound: 'roar', dmg: [14, 22], icon: 'i:tiger' }), 'cookie', ['Timmy', 'Stripes', 'Tigger', 'Rajah']],
    ['lion', 'Lion', ['lion'], T('King Roar', 'roar', { word: 'ROAAAR!', color: 0xffd23f, sound: 'roar', dmg: [14, 22], icon: 'i:lion' }), 'cookie', ['Leo', 'Simba', 'Sunny', 'King Fluff']],
    ['fox', 'Fox', ['fox'], T('Sneaky Swipe', 'rush', { dmg: [13, 21], word: 'SWISH!', icon: 'i:fox' }), 'apple', ['Foxy', 'Rusty', 'Ginger', 'Swift']],
    ['wolf', 'Wolf', ['wolf'], T('Moon Howl', 'roar', { word: 'AWOOOO!', color: 0xbfd0ff, sound: 'roar', dmg: [14, 22], icon: 'i:wolf' }), 'bone', ['Shadow', 'Luna', 'Howly', 'Grey']],
    ['monkey', 'Monkey', ['monkey', 'chimp'], T('Banana Peel', 'dizzy', { color: 0xffe066, word: 'SLIP!', uses: 1, tex: 'i:banana', icon: 'i:banana' }), 'banana', ['Coco', 'Bongo', 'Cheeky', 'Momo']],
    ['elephant', 'Elephant', ['elephant'], T('Trunk Spray', 'spray', { tex: 'i:droplet', dmg: [14, 22], word: 'SPLASH!', sound: 'whoosh', icon: 'i:droplet' }), 'apple', ['Ellie', 'Peanut', 'Jumbo', 'Dumbo']],
    ['penguin', 'Penguin', ['penguin'], T('Belly Slide', 'rush', { dmg: [13, 21], word: 'WHEEE!', icon: 'i:penguin' }), 'fishfood', ['Pingu', 'Waddles', 'Tux', 'Flipper']],
    ['unicorn', 'Unicorn', ['unicorn'], T('Rainbow Blast', 'spray', { tex: 'i:rainbow', dmg: [15, 23], word: 'SPARKLE!', sound: 'heal', icon: 'i:rainbow' }), 'candy', ['Sparkle', 'Stardust', 'Twinkle', 'Rainbow']],
    ['horse', 'Pony', ['horse', 'pony'], T('Pony Kick', 'rush', { dmg: [14, 22], word: 'NEIGH!', icon: 'i:horse' }), 'apple', ['Pony', 'Star', 'Clip-Clop', 'Maple']],
    ['pig', 'Piggy', ['pig', 'piglet'], T('Mud Splash', 'spray', { tex: 'dot', tint: 0x8a5a2b, dmg: [13, 21], word: 'SPLAT!', sound: 'whoosh', icon: 'i:pig' }), 'apple', ['Oinky', 'Peppa', 'Truffle', 'Piglet']],
    ['duck', 'Duck', ['duck', 'duckling'], T('Quack Attack', 'roar', { word: 'QUACK!', color: 0xffe066, sound: 'hoot', dmg: [13, 21], icon: 'i:duck' }), 'cookie', ['Ducky', 'Quackers', 'Puddles', 'Waddle']],
    ['bird', 'Birdie', ['bird', 'parrot'], T('Wing Gust', 'spray', { tex: 'feather', dmg: [13, 21], word: 'WHOOSH!', sound: 'whoosh', icon: 'i:bird' }), 'apple', ['Tweety', 'Kiwi', 'Sky', 'Chirpy']],
    ['chick', 'Chick', ['chick', 'chicken'], T('Peck Peck', 'multi', { hits: 3, dmg: [4, 8], sub: '3 pecks × 4–8', icon: 'i:chick' }), 'apple', ['Peep', 'Nugget', 'Sunny', 'Chicky']],
    ['frog', 'Froggy', ['frog'], T('Tongue Zap', 'rush', { dmg: [14, 22], word: 'ZAP!', icon: 'i:frog' }), 'apple', ['Hopper', 'Ribbit', 'Kermy', 'Lily']],
    ['turtle', 'Turtle', ['turtle', 'tortoise'], T('Shell Shield', 'shield', { icon: 'i:turtle' }), 'leaf', ['Shelly', 'Tank', 'Speedy', 'Mossy']],
    ['fish', 'Fishy', ['fish'], T('Bubble Blast', 'spray', { tex: 'i:bubble', dmg: [13, 21], word: 'BLUB!', sound: 'whoosh', icon: 'i:bubble' }), 'apple', ['Bubbles', 'Nemo', 'Finn', 'Splash']],
    ['octopus', 'Octopus', ['octopus'], T('Ink Squirt', 'dizzy', { color: 0x4a4a6a, word: 'INKED!', uses: 1, icon: 'i:octopus' }), 'fishfood', ['Inky', 'Octavia', 'Squishy', 'Wiggly']],
    ['shark', 'Shark', ['shark'], T('Chomp!', 'rush', { dmg: [15, 23], word: 'CHOMP!', icon: 'i:shark' }), 'fishfood', ['Bruce', 'Fin', 'Chompy', 'Jaws']],
    ['whale', 'Whale', ['whale'], T('Big Splash', 'spray', { tex: 'i:droplet', dmg: [14, 22], word: 'SPLOOSH!', sound: 'whoosh', icon: 'i:wave' }), 'fishfood', ['Blue', 'Moby', 'Splash', 'Bubba']],
    ['dolphin', 'Dolphin', ['dolphin'], T('Flip Splash', 'hop', { dmg: [13, 21], icon: 'i:dolphin' }), 'fishfood', ['Flipper', 'Echo', 'Splashy', 'Dolly']],
    ['giraffe', 'Giraffe', ['giraffe'], T('Neck Bonk', 'rush', { dmg: [14, 22], word: 'BONK!', icon: 'i:giraffe' }), 'leaf', ['Gerry', 'Spots', 'Tall Tom', 'Sunny']],
    ['panda', 'Panda', ['panda'], T('Bamboo Bop', 'throw', { tex: 'i:bamboo', dmg: [13, 21], icon: 'i:bamboo' }), 'bamboo', ['Po', 'Bao', 'Oreo', 'Bamboo']],
    ['koala', 'Koala', ['koala'], T('Koala Cuddle', 'rush', { dmg: [13, 21], word: 'CUDDLE!', icon: 'i:koala' }), 'leaf', ['Kiki', 'Gum', 'Snuggles', 'Kobi']],
    ['mouse', 'Mouse', ['mouse'], T('Cheese Toss', 'throw', { tex: 'i:cheese', dmg: [12, 20], icon: 'i:cheese' }), 'cheese', ['Squeaky', 'Pip', 'Cheddar', 'Minnie']],
    ['hamster', 'Hamster', ['hamster', 'guinea pig'], T('Wheel Roll', 'multi', { hits: 3, dmg: [4, 8], sub: '3 rolls × 4–8', icon: 'i:hamster' }), 'apple', ['Nibbles', 'Peanut', 'Hammy', 'Biscuit']],
    ['sheep', 'Sheep', ['sheep', 'lamb'], T('Fluff Bounce', 'hop', { dmg: [12, 20], icon: 'i:sheep' }), 'leaf', ['Fluffy', 'Woolly', 'Cotton', 'Shaun']],
    ['deer', 'Deer', ['deer', 'reindeer'], T('Antler Poke', 'rush', { dmg: [13, 21], word: 'POKE!', icon: 'i:deer' }), 'apple', ['Bambi', 'Rudy', 'Fawn', 'Comet']],
    ['raccoon', 'Raccoon', ['raccoon'], T('Sneaky Snatch', 'tickle', { dmg: [8, 26], icon: 'i:raccoon' }), 'cookie', ['Rocky', 'Bandit', 'Ringo', 'Rascal']],
    ['hedgehog', 'Hedgehog', ['hedgehog'], T('Prickle Roll', 'multi', { hits: 3, dmg: [5, 9], sub: '3 hits × 5–9', icon: 'i:hedgehog' }), 'apple', ['Spike', 'Sonic', 'Prickles', 'Hedgie']],
    ['sloth', 'Sloth', ['sloth'], T('Slooow Nap', 'nap', { amt: 30, uses: 1, icon: 'zzz' }), 'leaf', ['Slowy', 'Flash', 'Snoozy', 'Sid']],
    ['bee', 'Bee', ['bee', 'bumblebee'], T('Buzz Buzz', 'roar', { word: 'BZZZZ!', color: 0xffe066, sound: 'hiss', dmg: [13, 21], icon: 'i:bee' }), 'honey', ['Buzzy', 'Bumble', 'Honey', 'Stripe']],
    ['robot', 'Robot', ['robot'], T('Beep Boop Beam', 'spray', { tex: 'spark', tint: 0x7fd6ff, dmg: [14, 22], word: 'BEEP!', sound: 'crit', icon: 'i:robot' }), 'cookie', ['Robo', 'Bolt', 'Beep', 'Sparky']],
    ['doll', 'Doll', ['doll', 'rag doll'], T('Twirl Dance', 'dance', { uses: 1, icon: 'dance' }), 'cookie', ['Rosie', 'Dolly', 'Button', 'Lulu']],
    ['monster', 'Monster', ['monster', 'alien'], T('Monster Mash', 'quake', { dmg: [14, 22], icon: 'i:monster' }), 'cookie', ['Gloop', 'Zorp', 'Fuzzball', 'Blobby']],
    ['mystery', 'Mystery Plush', ['toy'], T('Plush Bump', 'rush', { dmg: [13, 21], word: 'BUMP!', icon: 'i:mystery' }), 'cookie', ['Mystery', 'Buddy', 'Snuggle', 'Pal']],
  ].map(([id, name, words, sig, snack, nicks]) => ({ id, name, words, sig, snack, nicks }));
  const ARCH_BY_ID = Object.fromEntries(ARCH.map(a => [a.id, a]));

  // element from the toy's main colour
  const ELEMENTS = {
    ice: { name: 'Ice', color: 0x7fd0ff, move: T('Frosty Sneeze', 'spray', { tex: 'snow', dmg: [20, 25], word: 'ACHOO!', sound: 'sneeze', inhale: true, uses: 1, icon: 'snow' }) },
    fire: { name: 'Fire', color: 0xff7a3d, move: T('Fire Sneeze', 'spray', { tex: 'i:fire', dmg: [20, 25], word: 'ACHOO!', sound: 'sneeze', inhale: true, uses: 1, icon: 'i:fire' }) },
    leaf: { name: 'Leaf', color: 0x6fd36f, move: T('Leaf Storm', 'spray', { tex: 'i:leaf', dmg: [14, 22], word: 'WHOOSH!', sound: 'whoosh', icon: 'i:leaf' }) },
    sun: { name: 'Sunny', color: 0xffd23f, move: T('Sunny Sparkle', 'spray', { tex: 'star', dmg: [14, 22], word: 'SHINE!', sound: 'heal', icon: 'star' }) },
    candy: { name: 'Candy', color: 0xff9ed8, move: T('Candy Cloud', 'spray', { tex: 'i:candy', dmg: [14, 22], word: 'SWEET!', sound: 'heal', icon: 'i:candy' }) },
    magic: { name: 'Magic', color: 0xb38cff, move: T('Magic Fizz', 'spray', { tex: 'sparkles', dmg: [14, 22], word: 'FIZZ!', sound: 'heal', icon: 'sparkles' }) },
    earth: { name: 'Earth', color: 0xc08a55, move: T('Acorn Toss', 'throw', { tex: 'i:acorn', dmg: [14, 22], icon: 'i:acorn' }) },
    snow: { name: 'Snow', color: 0xeef2ff, move: T('Snowball', 'throw', { tex: 'snow', dmg: [14, 22], icon: 'snow' }) },
    shadow: { name: 'Shadow', color: 0x6a6f9a, move: T('Shadow Puff', 'spray', { tex: 'cloud', tint: 0x55597a, dmg: [14, 22], word: 'POOF!', sound: 'poof', icon: 'cloud' }) },
  };
  const QUIRKS = {
    sleepy: { name: 'Sleepy', move: T('Upside-Down Nap', 'nap', { amt: 35, uses: 1, icon: 'zzz' }) },
    hungry: { name: 'Hungry', move: null /* snack, depends on archetype */ },
    dancer: { name: 'Dancer', move: T('Six-Seven Dance', 'dance', { uses: 1, icon: 'dance' }) },
    ticklish: { name: 'Ticklish', move: T('Tickle Attack', 'tickle', { dmg: [5, 28], icon: 'sparkles' }) },
    brave: { name: 'Brave', move: T('Pillow Fort', 'shield', { icon: 'shield' }) },
    loud: { name: 'Loud', move: T('Big Shout', 'roar', { word: 'BOO!', color: 0xfff3d2, sound: 'roar', dmg: [13, 21], icon: 'note' }) },
    bouncy: { name: 'Bouncy', move: T('Boing Boing', 'hop', { dmg: [13, 21], icon: 'i:ball' }) },
    spinny: { name: 'Spinny', move: T('Twirl Spin', 'multi', { hits: 3, dmg: [5, 9], sub: '3 hits × 5–9', icon: 'dizzy' }) },
  };
  const QUIRK_IDS = Object.keys(QUIRKS);

  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  function subFor(m) {
    if (m.sub) return m.sub;
    if (m.type === 'nap' || m.type === 'heal') return '+' + m.amt + ' pep';
    if (m.type === 'shield') return 'next hit ÷2';
    if (m.type === 'dizzy' || m.type === 'dance') return 'rival gets dizzy';
    if (m.dmg) return m.dmg[0] === m.dmg[1] ? m.dmg[0] + ' pep' : m.dmg[0] + '–' + m.dmg[1] + ' pep';
    return '';
  }
  function snackMove(arch) {
    const tex = 'i:' + (ARCH_BY_ID[arch] ? ARCH_BY_ID[arch].snack : 'cookie');
    return T('Snack Break', 'heal', { tex, amt: 20, uses: 2, icon: tex });
  }
  // Build the 4-move kit: pillow + signature + element + quirk
  function makeKit(toy) {
    const a = ARCH_BY_ID[toy.arch] || ARCH_BY_ID.mystery;
    const list = [
      T('Pillow Whack', 'throw', { tex: 'pillow', dmg: [12, 20], icon: 'pillow' }),
      Object.assign({}, a.sig),
      Object.assign({}, (ELEMENTS[toy.element] || ELEMENTS.magic).move),
      Object.assign({}, toy.quirk === 'hungry' ? snackMove(toy.arch) : QUIRKS[toy.quirk].move),
    ];
    return list.map((m, i) => Object.assign(m, { k: 'm' + i, sub: subFor(m), uses: m.uses || 0 }));
  }
  function pickQuirk(arch, r) {
    const sigType = (ARCH_BY_ID[arch] || ARCH_BY_ID.mystery).sig.type;
    for (let i = 0; i < 20; i++) {
      const q = QUIRK_IDS[Math.floor(r() * QUIRK_IDS.length)];
      const qt = q === 'hungry' ? 'heal' : QUIRKS[q].move.type;
      if (qt !== sigType) return q;
    }
    return 'hungry';
  }
  // ---- image analysis helpers (main thread, canvas pixels)
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s, l];
  }
  function elementFromPixels(data) { // data: RGBA Uint8ClampedArray of the cut-out
    const bins = new Array(12).fill(0); let n = 0, sat = 0, lig = 0, satW = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i + 3] < 160) continue;
      const [h, s, l] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
      n++; sat += s; lig += l;
      if (s > 0.22 && l > 0.12 && l < 0.92) { const w = s * (1 - Math.abs(l - 0.5)); bins[Math.floor(h / 30) % 12] += w; satW += w; }
    }
    if (!n) return 'magic';
    const ms = sat / n, ml = lig / n;
    if (satW / n < 0.08 || ms < 0.16) return ml > 0.62 ? 'snow' : (ml < 0.3 ? 'shadow' : 'earth');
    let best = 0; for (let i = 1; i < 12; i++) if (bins[i] > bins[best]) best = i;
    const hue = best * 30 + 15;
    if (hue < 20 || hue >= 345) return ml > 0.62 ? 'candy' : 'fire';
    if (hue < 45) return ml < 0.45 ? 'earth' : 'fire';
    if (hue < 70) return 'sun';
    if (hue < 165) return 'leaf';
    if (hue < 255) return 'ice';
    if (hue < 290) return 'magic';
    return 'candy';
  }
  function seedFromPixels(data, w, h) {
    let x = 2166136261 >>> 0;
    const step = Math.max(4, Math.floor(data.length / 4 / 512) * 4);
    for (let i = 0; i < data.length; i += step) { x ^= (data[i] >> 4) | ((data[i + 1] >> 4) << 4) | ((data[i + 3] >> 6) << 8); x = Math.imul(x, 16777619) >>> 0; }
    return (x ^ (w * 73856093) ^ (h * 19349663)) >>> 0;
  }
  // Create the toy record from analysis results
  function createToy({ arch, element, seed, aspect }) {
    const r = rng(seed);
    const a = ARCH_BY_ID[arch] || ARCH_BY_ID.mystery;
    const quirk = pickQuirk(arch, r);
    const hp = 95 + Math.round(r() * 6) * 5 + (aspect > 1.3 ? 5 : 0);
    const nameIdx = Math.floor(r() * a.nicks.length);
    return { id: 't' + Date.now().toString(36) + Math.floor(r() * 1e4).toString(36), arch: a.id, element, quirk, hp, name: a.nicks[nameIdx], seed, created: Date.now() };
  }
  function nameIdeas(arch, element) {
    const a = ARCH_BY_ID[arch] || ARCH_BY_ID.mystery;
    const el = ELEMENTS[element] ? ELEMENTS[element].name : '';
    return a.nicks.concat([el + ' ' + a.name, 'Captain ' + a.nicks[0]]);
  }
  // kid-safe names (QA B13 / #16): a short built-in list, any case, also with simple leetspeak (sh1t, @ss) and spacing (f u c k)
  const BAD_ANY = ['fuck', 'fuk', 'fck', 'shit', 'bitch', 'cunt', 'nigg', 'whore', 'slut', 'porn', 'penis', 'vagina', 'nazi', 'hitler',
    'wank', 'twat', 'bastard', 'dildo', 'asshole', 'retard', 'faggot', 'xyu', 'pizd', 'blyat', 'mudak'];
  const BAD_WORD = ['ass', 'arse', 'dick', 'cock', 'tit', 'tits', 'boob', 'boobs', 'sex', 'sexy', 'kill', 'die', 'damn', 'crap', 'piss',
    'fag', 'rape', 'suka', 'hui', 'idiot', 'stupid', 'dumb', 'moron', 'loser', 'poopface'];
  const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i', '+': 't' };
  function badName(name) {
    const s = String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[0-9@$!|+]/g, ch => LEET[ch] || ch);
    const words = s.split(/[^a-z]+/).filter(Boolean);
    const all = words.join(''), once = all.replace(/(.)\1+/g, '$1'); // "fuuuck" -> "fuck"
    if (BAD_ANY.some(w => all.includes(w) || once.includes(w))) return true;
    // whole words only for short ones, so Cassie, Grape or Skills stay fine; "a s s" counts as one word
    const spaced = words.length > 1 && words.every(w => w.length === 1) ? [all] : [];
    return words.concat(spaced).some(w => BAD_WORD.includes(w) || BAD_WORD.includes(w.replace(/(.)\1+/g, '$1')));
  }
  const safeName = (name, fallback) => badName(name) ? fallback : name;
  window.PSToys = { ARCH, ARCH_BY_ID, ELEMENTS, QUIRKS, makeKit, createToy, elementFromPixels, seedFromPixels, nameIdeas, subFor, badName, safeName };
})();
