// Plush Squad v1.2: emoji chat in duels (docs/gdd/1.2-emoji-chat.md).
// Pure data and one pure function, so tests can call them without a duel. No text, no input: 16 fixed pictures, ids 0-15.
// The pictures are Fluent Emoji 3D (MIT) in assets/icons3.webp, frames 'e:<name>'.
(function () {
  'use strict';
  const EMOJI = [
    { id: 0, name: 'grin', mood: 'friendly' }, { id: 1, name: 'beam', mood: 'friendly' }, { id: 2, name: 'lol', mood: 'cheeky' }, { id: 3, name: 'blush', mood: 'friendly' },
    { id: 4, name: 'happy', mood: 'friendly' }, { id: 5, name: 'smile', mood: 'calm' }, { id: 6, name: 'sad', mood: 'sad' }, { id: 7, name: 'hug', mood: 'friendly' },
    { id: 8, name: 'crazy', mood: 'cheeky' }, { id: 9, name: 'nerd', mood: 'cheeky' }, { id: 10, name: 'cry', mood: 'sad' }, { id: 11, name: 'grumpy', mood: 'angry' },
    { id: 12, name: 'mad', mood: 'angry' }, { id: 13, name: 'sneaky', mood: 'cheeky' }, { id: 14, name: 'up', mood: 'friendly' }, { id: 15, name: 'down', mood: 'angry' },
  ];
  const FRAME = id => 'e:' + EMOJI[id].name;
  // 0-15 integers only, at most 6 (the friend mail is untrusted input)
  const clean = a => (Array.isArray(a) ? a.filter(n => Number.isInteger(n) && n >= 0 && n <= 15).slice(0, 6) : []);
  // personality of every rival (owner's decision, 21 Oct 2026). Toys, friends' toys and friends' Jacks are 'kind' (the default).
  const TAGS = {
    timmy: 'cheeky', moo: 'kind', sly: 'cheeky', hoot: 'grumpy',
    robot: 'kind', polandball: 'cheeky', ghost: 'shy', dragonboss: 'kind',
    moose: 'kind', beaver: 'cheeky', mountie: 'grumpy', sasquatch: 'shy',
    hermy: 'shy', puff: 'grumpy', jelly: 'kind', fog: 'grumpy', thully: 'kind',
    onion: 'shy', peas: 'cheeky', garlic: 'grumpy', fungi: 'cheeky', brocklee: 'kind',
    england: 'kind', spain: 'cheeky', japan: 'shy', usa: 'cheeky', poland: 'kind',
    pumpkin: 'cheeky', batty: 'shy', webster: 'shy', fang: 'grumpy', kraken: 'cheeky',
    waddles: 'cheeky', pola: 'kind', dasher: 'cheeky', frosty: 'grumpy', // v1.3 Snow Fort
  };
  const tagOf = id => TAGS[id] || 'kind';
  const BY_MOOD = { friendly: [4, 7, 14], calm: [4, 7, 14], cheeky: [2, 8, 13], angry: [12, 11, 6], sad: [7, 14] };
  const BY_TAG = { grumpy: [11, 12], shy: [3, 5], cheeky: [8, 13] };
  const BOSS = { grumpy: [12, 12, 13, 2], cheeky: [13, 13, 2, 12], shy: [2, 2, 13], kind: [2, 2, 13] };
  const rnd = (list, r) => list[Math.floor((r == null ? Math.random() : r) * list.length) % list.length];
  // The rival's answer. s = { mine: id, tag, boss, rivalPct, heroPct, bigHit } (percent of pep left, 0-100); r = optional 0..1 random.
  // Checked in this order: boss, rival losing, Jack losing, Jack's big hit, then the mood of the sent emoji (personality first).
  // Never mean: a sad emoji always gets a hug or a thumbs up (this check comes first).
  function reply(s, r) {
    const mood = EMOJI[s.mine] ? EMOJI[s.mine].mood : 'friendly', tag = s.tag === 'grumpy' || s.tag === 'shy' || s.tag === 'cheeky' ? s.tag : 'kind';
    if (mood === 'sad') return rnd(BY_MOOD.sad, r); // never mean: a sad emoji gets a hug or a thumbs up, even from a boss
    if (s.boss) return rnd(BOSS[tag], r);
    if (s.rivalPct != null && s.rivalPct < 25) return rnd([10, 6, 8], r);
    if (s.heroPct != null && s.heroPct < 25) return rnd([2, 1, 13], r);
    if (s.bigHit) return rnd([11, 10, 9], r);
    if (BY_TAG[tag]) return rnd(BY_TAG[tag], r);
    return rnd(BY_MOOD[mood] || BY_MOOD.friendly, r);
  }
  window.PSEmoji = { EMOJI, FRAME, clean, TAGS, tagOf, reply, BOSS_IDS: [13, 2, 12], COOLDOWN: 1200, MAX_LOG: 6 };
})();
