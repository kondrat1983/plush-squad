// Plush Squad — synthesized sound effects + procedural music: menu lullaby, duel and boss tracks (no audio files needed)
(function () {
  const Audio = {
    ctx: null, master: null, sfxGain: null, musicGain: null, noiseBuf: null, muted: false,
    init() {
      if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(c.destination);
      this.sfxGain = c.createGain(); this.sfxGain.gain.value = 0.8; this.sfxGain.connect(this.master);
      this.musicGain = c.createGain(); this.musicGain.gain.value = 0.32; this.musicGain.connect(this.master);
      const len = c.sampleRate * 1.5; const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    },
    tone(freq, dur, o = {}) {
      const c = this.ctx; if (!c) return;
      const t = c.currentTime + (o.delay || 0);
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * o.slide), t + dur);
      const v = o.vol == null ? 0.3 : o.vol;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.006));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(o.dest || this.sfxGain); osc.start(t); osc.stop(t + dur + 0.05);
    },
    noise(dur, o = {}) {
      const c = this.ctx; if (!c) return;
      const t = c.currentTime + (o.delay || 0);
      const src = c.createBufferSource(); src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.f || 1000, t);
      if (o.slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, (o.f || 1000) * o.slide), t + dur);
      const g = c.createGain(); const v = o.vol == null ? 0.3 : o.vol;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.sfxGain); src.start(t); src.stop(t + dur + 0.05);
    },
    // ---- effects
    click() { this.tone(660, 0.08, { type: 'triangle', vol: 0.25, slide: 1.5 }); },
    whoosh() { this.noise(0.35, { f: 400, slide: 6, q: 0.8, vol: 0.35, attack: 0.08 }); },
    thump(power = 1) {
      this.tone(170, 0.28, { slide: 0.35, vol: 0.55 * power });
      this.noise(0.18, { f: 900, slide: 0.3, vol: 0.4 * power });
      this.tone(90, 0.35, { type: 'triangle', slide: 0.5, vol: 0.3 * power, delay: 0.01 });
    },
    poof() { this.noise(0.4, { f: 2400, slide: 0.25, q: 0.6, vol: 0.25 }); },
    tickle() {
      for (let i = 0; i < 7; i++) this.tone(900 + Math.random() * 600, 0.07, { type: 'square', vol: 0.06, delay: i * 0.07, slide: 1.3 });
    },
    giggle() {
      [0, 0.12, 0.24, 0.36].forEach((d, i) => this.tone(520 - i * 30, 0.1, { type: 'triangle', vol: 0.18, delay: d, slide: 1.25 }));
    },
    inhale() { this.noise(0.5, { f: 300, slide: 4, vol: 0.2, attack: 0.4 }); },
    sneeze() {
      this.noise(0.5, { type: 'highpass', f: 1500, vol: 0.5, attack: 0.005 });
      this.tone(700, 0.35, { type: 'sawtooth', vol: 0.08, slide: 0.4 });
      [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.5, { vol: 0.07, delay: 0.1 + i * 0.06 }));
    },
    heal() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.16, delay: i * 0.07 })); },
    snore() { this.noise(0.6, { f: 220, q: 3, vol: 0.3, attack: 0.25 }); this.tone(110, 0.6, { type: 'sawtooth', vol: 0.04, attack: 0.25 }); },
    roar() {
      this.tone(140, 0.7, { type: 'sawtooth', vol: 0.22, slide: 0.6, attack: 0.04 });
      this.tone(147, 0.7, { type: 'sawtooth', vol: 0.18, slide: 0.55, attack: 0.04 });
      this.noise(0.7, { f: 500, q: 2, vol: 0.3, attack: 0.04, slide: 0.5 });
    },
    crit() { this.tone(1200, 0.25, { type: 'square', vol: 0.08, slide: 1.8 }); },
    turn() { this.tone(784, 0.12, { type: 'triangle', vol: 0.15 }); this.tone(1047, 0.18, { type: 'triangle', vol: 0.15, delay: 0.1 }); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i === 5 ? 0.7 : 0.18, { type: 'square', vol: 0.09, delay: i * 0.13 })); },
    lose() { [392, 370, 349, 330].forEach((f, i) => this.tone(f, i === 3 ? 0.8 : 0.3, { type: 'triangle', vol: 0.2, delay: i * 0.28, slide: i === 3 ? 0.8 : 1 })); },
    tick() { this.tone(1400 + Math.random() * 200, 0.04, { type: 'square', vol: 0.04 }); },
    moo() { this.tone(180, 0.9, { type: 'sawtooth', vol: 0.14, slide: 0.7, attack: 0.15 }); this.tone(182, 0.9, { type: 'triangle', vol: 0.2, slide: 0.68, attack: 0.15 }); },
    hiss() { this.noise(0.9, { type: 'highpass', f: 3500, vol: 0.25, attack: 0.1 }); },
    hoot() { [0, 0.32].forEach(d => { this.tone(420, 0.25, { vol: 0.25, delay: d, slide: 0.85, attack: 0.03 }); }); },
    gulp() { this.tone(300, 0.12, { vol: 0.3, slide: 0.5 }); this.tone(260, 0.12, { vol: 0.3, slide: 0.5, delay: 0.16 }); },
    dance() { [523, 659, 784, 659, 880, 784, 1047].forEach((f, i) => this.tone(f, 0.12, { type: 'square', vol: 0.07, delay: i * 0.11 })); },
    dizzy() { for (let i = 0; i < 6; i++) this.tone(900 + (i % 2) * 300, 0.12, { type: 'sine', vol: 0.12, delay: i * 0.09, slide: 0.8 }); },
    block() { this.tone(1800, 0.3, { type: 'triangle', vol: 0.16 }); this.tone(2400, 0.25, { type: 'sine', vol: 0.1, delay: 0.02 }); },
    stomp() { this.tone(70, 0.6, { vol: 0.6, slide: 0.5 }); this.noise(0.5, { f: 200, vol: 0.5, slide: 0.4 }); },
    starDing(i) { this.tone(1047 * Math.pow(1.26, i), 0.4, { type: 'triangle', vol: 0.2 }); },
    spin() { this.noise(0.5, { f: 800, slide: 3, q: 2, vol: 0.25, attack: 0.05 }); },
    laser() { for (let i = 0; i < 3; i++) this.tone(1800, 0.14, { type: 'square', vol: 0.07, slide: 0.25, delay: i * 0.11 }); },
    beep() { [988, 659, 988, 1319].forEach((f, i) => this.tone(f, 0.1, { type: 'square', vol: 0.08, delay: i * 0.12 })); },
    boo() { this.tone(260, 1.0, { type: 'sine', vol: 0.25, slide: 0.6, attack: 0.25 }); this.tone(390, 1.0, { type: 'triangle', vol: 0.08, slide: 0.55, attack: 0.3 }); this.noise(0.9, { f: 600, q: 4, vol: 0.12, attack: 0.3, slide: 0.5 }); },
    fire() { this.noise(1.1, { type: 'lowpass', f: 900, vol: 0.45, attack: 0.25, slide: 0.4 }); this.tone(80, 1.0, { type: 'sawtooth', vol: 0.1, slide: 0.6, attack: 0.2 }); },
    steam() { this.noise(0.9, { type: 'highpass', f: 2500, vol: 0.4, attack: 0.02, slide: 1.5 }); },
    bounce() { this.tone(300, 0.18, { vol: 0.3, slide: 2.4 }); },
    // v0.8 Canada: Max's honk (a moo a fifth lower, shorter), Bob's chewing
    honk() { this.tone(120, 0.6, { type: 'sawtooth', vol: 0.14, slide: 0.7, attack: 0.08 }); this.tone(121, 0.6, { type: 'triangle', vol: 0.2, slide: 0.68, attack: 0.08 }); },
    chomp() { for (let i = 0; i < 4; i++) { this.noise(0.05, { f: 2400, q: 2, vol: 0.25, delay: i * 0.09 }); this.tone(300, 0.05, { type: 'square', vol: 0.05, delay: i * 0.09 }); } },
    // v0.8 comic: speech babble (one blip per syllable) and a short brass-like sting for the title
    babble(n = 12) { for (let i = 0; i < Math.min(8, Math.ceil(n / 5)); i++) this.tone(500 + Math.random() * 500, 0.06, { type: 'triangle', vol: 0.08, delay: i * 0.08 }); },
    comicSting() { [392, 523, 659, 784].forEach((f, i) => this.tone(f, i === 3 ? 0.5 : 0.14, { type: 'square', vol: 0.07, delay: i * 0.12 })); },
    // v0.8 SAVE IT!: stick on puck, puck on ice, glove THWACK, a friendly hockey horn
    slap() { this.noise(0.08, { type: 'highpass', f: 3000, vol: 0.5, attack: 0.002 }); this.tone(110, 0.2, { vol: 0.4, slide: 0.5 }); },
    slide() { this.noise(0.5, { f: 900, q: 3, vol: 0.18, attack: 0.05, slide: 2.2 }); },
    glove() { this.tone(95, 0.22, { vol: 0.5, slide: 0.6 }); this.noise(0.06, { f: 2600, q: 1.5, vol: 0.3, delay: 0.01 }); },
    goalHorn() { [0, 0.42].forEach(d => { this.tone(392, 0.38, { type: 'square', vol: 0.07, delay: d }); this.tone(587, 0.38, { type: 'square', vol: 0.05, delay: d }); }); },
    // v0.8 Space: three rising chirps (the Blips), a wobbly rising hum (tractor beam), umbrella pop + flap
    blip() { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.09, { type: 'square', vol: 0.06, slide: 1.3, delay: i * 0.08 })); },
    beam() { for (let i = 0; i < 6; i++) this.tone(330 + i * 70, 0.24, { type: 'sine', vol: 0.12, slide: 1.12, delay: i * 0.18 }); this.tone(165, 1.2, { type: 'triangle', vol: 0.08, slide: 1.6, attack: 0.3 }); },
    umbrella() { this.tone(520, 0.08, { type: 'square', vol: 0.12, slide: 1.8 }); this.noise(0.25, { type: 'bandpass', f: 1200, q: 1, vol: 0.3, attack: 0.01, delay: 0.06 }); },
    catchStar() { this.tone(1319 + Math.random() * 300, 0.18, { type: 'triangle', vol: 0.16 }); this.tone(1760, 0.2, { type: 'sine', vol: 0.08, delay: 0.05 }); },
    levelUp() { [523, 784, 1047, 1568].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.2, delay: i * 0.09 })); },

    // ---- music: four procedural tracks (calm lullaby for menus, 'battle' for duels, 'boss' for boss duels, 'north' for Canada duels)
    // music(name) picks the track (crossfade); startMusic() starts the scheduler after the first tap.
    _timer: null, _next: 0, _step: 0, _track: null, _want: 'calm', _bus: null,
    mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); },
    // one synth voice: attack, hold, release; optional lowpass with a closing filter envelope and detune
    voice(m, at, dur, o = {}) {
      const c = this.ctx, bus = o.dest || this._bus; if (!c || !bus) return;
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'triangle'; osc.frequency.setValueAtTime(this.mtof(m), at);
      if (o.det) osc.detune.setValueAtTime(o.det, at);
      const v = o.vol == null ? 0.05 : o.vol, a = o.a || 0.008, r = o.r == null ? 0.08 : o.r;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + a);
      g.gain.setValueAtTime(v, at + Math.max(a, dur)); g.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(a, dur) + r);
      let out = osc;
      if (o.lp) {
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q || 0.7;
        f.frequency.setValueAtTime(o.lp * (o.env || 1), at);
        if (o.env) f.frequency.exponentialRampToValueAtTime(o.lp, at + (o.envT || 0.15));
        osc.connect(f); out = f;
      }
      out.connect(g); g.connect(bus); osc.start(at); osc.stop(at + Math.max(a, dur) + r + 0.05);
    },
    hit(at, dur, o = {}) { // filtered noise burst for drums
      const c = this.ctx, bus = this._bus; if (!c || !bus) return;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 0.8; f.frequency.setValueAtTime(o.f || 1000, at);
      const g = c.createGain(); g.gain.setValueAtTime(o.vol || 0.1, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(f); f.connect(g); g.connect(bus); src.start(at, Math.random() * 0.5); src.stop(at + dur + 0.05);
    },
    drum(kind, at, v = 1) {
      const c = this.ctx, bus = this._bus; if (!c || !bus) return;
      const thud = (f0, f1, dur, vol) => {
        const osc = c.createOscillator(), g = c.createGain();
        osc.frequency.setValueAtTime(f0, at); osc.frequency.exponentialRampToValueAtTime(f1, at + dur * 0.7);
        g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        osc.connect(g); g.connect(bus); osc.start(at); osc.stop(at + dur + 0.05);
      };
      if (kind === 'kick') { thud(150, 42, 0.32, 0.5 * v); this.hit(at, 0.03, { f: 3000, vol: 0.05 * v }); }
      else if (kind === 'snare') { this.hit(at, 0.16, { f: 1900, q: 0.6, vol: 0.2 * v }); thud(230, 170, 0.09, 0.14 * v); }
      else if (kind === 'hat') this.hit(at, 0.035, { type: 'highpass', f: 7500, vol: 0.06 * v });
      else if (kind === 'ohat') this.hit(at, 0.22, { type: 'highpass', f: 6500, vol: 0.05 * v });
      else if (kind === 'taiko') { thud(105, 48, 0.75, 0.55 * v); this.hit(at, 0.12, { type: 'lowpass', f: 420, q: 1, vol: 0.32 * v }); }
      else if (kind === 'tom') { thud(170, 95, 0.32, 0.32 * v); this.hit(at, 0.06, { type: 'lowpass', f: 700, vol: 0.12 * v }); }
      else if (kind === 'crash') this.hit(at, 1.9, { type: 'highpass', f: 4200, q: 0.5, vol: 0.09 * v });
    },
    TRACKS: {
      calm: { bpm: 88, div: 2, len: 32, gain: 1, play(A, n, t, sp) {
        const chords = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]], pattern = [0, 1, 2, 3, 2, 1, 2, 3];
        const ch = chords[Math.floor(n / 8) % 4], s = n % 8;
        A.voice(ch[pattern[s]] + 12, t, 0.001, { vol: 0.07, r: sp * 1.8 });
        if (s === 0) A.voice(ch[0] - 12, t, 0.001, { type: 'sine', vol: 0.12, a: 0.03, r: sp * 7 });
        if (s === 4 && Math.random() < 0.5) A.voice(ch[3] + 24, t, 0.001, { type: 'sine', vol: 0.035, r: sp * 2 });
      } },
      // D minor, 144 bpm, 16 bars: A = lead tune, B = arpeggio break
      battle: { bpm: 144, div: 4, len: 256, gain: 0.75, play(A, n, t, sp) {
        const bar = Math.floor(n / 16), b8 = bar % 8, s = n % 16, partB = bar >= 8;
        const roots = [38, 34, 36, 33, 38, 34, 43, 33];                     // D Bb C A D Bb G A
        const thirds = [3, 4, 4, 4, 3, 4, 3, 4], root = roots[b8], third = thirds[b8];
        // drums
        if (s === 0 || s === 8 || (s === 10 && b8 % 2 === 1)) A.drum('kick', t);
        if (s === 4 || s === 12) A.drum('snare', t);
        if (b8 === 7 && s >= 12) A.drum('snare', t, 0.5 + (s - 12) * 0.15);
        if (s % 2 === 0) A.drum(s === 14 ? 'ohat' : 'hat', t, s % 4 === 0 ? 1 : 0.7);
        if (n === 0 || n === 128) A.drum('crash', t, 0.8);
        // driving bass in eighths with octave jumps
        if (s % 2 === 0) A.voice(root + ([0, 0, 12, 0, 0, 0, 12, 7][s / 2]), t, sp * 1.2, { type: 'sawtooth', vol: 0.07, lp: 650, env: 2.5, r: 0.04 });
        // offbeat chord stabs
        if (s === 2 || s === 6 || s === 10 || s === 14) [12, 12 + third, 19].forEach((iv, k) => A.voice(root + 24 + iv, t, sp * 0.6, { type: 'square', vol: 0.012, lp: 2200, r: 0.04, det: k * 4 }));
        if (!partB) {
          const MEL = [
            [[0, 74, 3], [3, 77, 3], [6, 81, 2], [8, 79, 2], [10, 77, 2], [12, 76, 2], [14, 77, 2]],
            [[0, 74, 6], [6, 70, 2], [8, 74, 4], [12, 77, 4]],
            [[0, 79, 3], [3, 76, 3], [6, 72, 2], [8, 76, 2], [10, 79, 2], [12, 84, 4]],
            [[0, 81, 6], [6, 79, 2], [8, 76, 4], [12, 73, 4]],
            [[0, 74, 3], [3, 77, 3], [6, 81, 2], [8, 79, 2], [10, 77, 2], [12, 76, 2], [14, 77, 2]],
            [[0, 82, 3], [3, 81, 3], [6, 77, 2], [8, 74, 4], [12, 77, 4]],
            [[0, 79, 3], [3, 82, 3], [6, 86, 2], [8, 84, 2], [10, 82, 2], [12, 81, 2], [14, 79, 2]],
            [[0, 81, 8], [8, 76, 2], [10, 79, 2], [12, 73, 2], [14, 76, 2]],
          ];
          MEL[b8].forEach(([st, m, l]) => { if (st === s) { A.voice(m, t, sp * l * 0.85, { type: 'square', vol: 0.032, lp: 2600, r: 0.06 }); A.voice(m - 12, t, sp * l * 0.85, { type: 'triangle', vol: 0.05, r: 0.06 }); } });
        } else {
          const arp = [0, 12 + third, 19, 24, 19, 12 + third, 12, 19];
          A.voice(root + 24 + arp[s % 8], t, sp * 0.7, { type: 'sawtooth', vol: 0.022, lp: 1800, env: 2, r: 0.05 });
          if (s === 0) A.voice(root + 36 + (b8 % 4 === 3 ? third : 7), t, sp * 14, { type: 'square', vol: 0.02, a: 0.08, lp: 2000, r: 0.2 });
        }
      } },
      // C minor, 112 bpm, 16 bars: A = taiko + strings ostinato + choir, B = adds the brass theme and full drums
      boss: { bpm: 112, div: 4, len: 256, gain: 0.55, play(A, n, t, sp) {
        const bar = Math.floor(n / 16), b8 = bar % 8, s = n % 16, partB = bar >= 8;
        const roots = [36, 32, 39, 34, 36, 32, 41, 31];                     // C Ab Eb Bb C Ab F G
        const thirds = [3, 4, 4, 4, 3, 4, 3, 4], root = roots[b8], third = thirds[b8];
        // taiko
        const tk = partB ? [0, 3, 6, 8, 11, 14] : [0, 8];
        if (tk.includes(s)) A.drum('taiko', t, s === 0 || s === 8 ? 1 : 0.6);
        if (partB && (s === 4 || s === 12)) A.drum('snare', t, 0.8);
        if (b8 === 7 && s >= 8) A.drum(s % 2 ? 'tom' : 'taiko', t, 0.4 + (s - 8) * 0.08);
        if (n === 0 || n === 128 || (partB && s === 0 && b8 === 4)) A.drum('crash', t, 1);
        // strings ostinato in 16ths
        const ost = [0, 0, 12, 0, 7, 0, 12, 0, 0, 0, 12, 0, 7, 0, 12 + third, 12];
        A.voice(root + 12 + ost[s], t, sp * 0.55, { type: 'sawtooth', vol: partB ? 0.04 : 0.034, lp: 1300, env: 1.8, envT: 0.08, r: 0.05 });
        // sub on the downbeat
        if (s === 0) A.voice(root + 12, t, sp * 15, { type: 'sine', vol: 0.12, a: 0.02, r: 0.3 });
        // choir pad: chord tones, two detuned saws each, slow attack
        if (s === 0) [12, 12 + third, 19, 24].forEach(iv => [-8, 8].forEach(d => A.voice(root + 24 + iv, t, sp * 15, { type: 'sawtooth', vol: partB ? 0.012 : 0.01, a: 0.45, lp: 1100, r: 0.4, det: d })));
        if (partB) {
          const MEL = [
            [[0, 67, 8], [8, 72, 8]], [[0, 75, 12], [12, 72, 4]], [[0, 70, 8], [8, 67, 4], [12, 70, 4]], [[0, 74, 16]],
            [[0, 67, 8], [8, 72, 8]], [[0, 75, 8], [8, 77, 8]], [[0, 80, 8], [8, 77, 4], [12, 75, 4]], [[0, 74, 8], [8, 71, 8]],
          ];
          MEL[b8].forEach(([st, m, l]) => { if (st === s) [-6, 6].forEach(d => { A.voice(m, t, sp * l * 0.92, { type: 'sawtooth', vol: 0.03, a: 0.05, lp: 1700, env: 0.6, envT: 0.12, r: 0.12, det: d }); A.voice(m - 12, t, sp * l * 0.92, { type: 'sawtooth', vol: 0.022, a: 0.05, lp: 1100, r: 0.12, det: -d }); }); });
        } else if (s === 0 && b8 % 2 === 0) {
          A.voice(root + 24 + 7, t, sp * 30, { type: 'triangle', vol: 0.03, a: 0.6, r: 0.5 }); // a lone horn-ish note in the intro
        }
      } },
      // v0.8 Canada: G major jig in 6/8 (2 beats of 3 eighths per bar), 16 bars. Square "fiddle", oom-pah bass, claps, bells in part B
      north: { bpm: 126, div: 3, len: 96, gain: 0.7, play(A, n, t, sp) {
        const bar = Math.floor(n / 6), s = n % 6, partB = bar >= 8;
        const roots = [43, 43, 36, 38, 43, 40, 36, 38, 43, 43, 36, 38, 40, 36, 38, 43]; // G G C D G Em C D | G G C D Em C D G
        const minor = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], root = roots[bar], third = minor[bar] ? 3 : 4;
        // oom-pah: low root on 1, fifth on 2; chord "pah" on the off-eighths
        if (s === 0) A.voice(root, t, sp * 1.6, { type: 'triangle', vol: 0.13, r: 0.05 });
        if (s === 3) A.voice(root + 7, t, sp * 1.6, { type: 'triangle', vol: 0.11, r: 0.05 });
        if (s === 2 || s === 5) [12, 12 + third, 19].forEach(iv => A.voice(root + 12 + iv, t, sp * 0.5, { type: 'square', vol: 0.012, lp: 1800, r: 0.03 }));
        // hand claps on beats 1 and 2, a little hat on the rest
        if (s === 0 || s === 3) A.hit(t, 0.09, { f: 1500, q: 0.9, vol: 0.13 }); else A.drum('hat', t, 0.5);
        if (n === 0 || n === 48) A.drum('crash', t, 0.5);
        const MEL = [
          [67, 71, 74, 79, 74, 71], [72, 71, 69, 71, 74, 0], [72, 76, 79, 76, 72, 76], [74, 78, 81, 78, 74, 72],
          [71, 74, 79, 74, 71, 67], [71, 67, 64, 67, 71, 74], [76, 74, 72, 74, 76, 79], [78, 74, 72, 74, 0, 0],
          [79, 78, 76, 74, 76, 78], [79, 74, 71, 74, 79, 83], [81, 79, 76, 79, 81, 84], [83, 81, 78, 81, 78, 74],
          [76, 79, 83, 79, 76, 71], [72, 76, 79, 76, 72, 76], [74, 78, 81, 78, 74, 66], [67, 71, 74, 79, 0, 0],
        ];
        const m = MEL[bar][s];
        if (m) { A.voice(m, t, sp * 0.8, { type: 'square', vol: 0.03, lp: 2800, r: 0.05, det: 6 }); A.voice(m, t, sp * 0.8, { type: 'sawtooth', vol: 0.012, lp: 2200, r: 0.05, det: -8 }); }
        if (partB && s === 0) A.voice(root + 48 + (bar % 2 ? 7 : 0), t, 0.001, { type: 'sine', vol: 0.05, r: sp * 4 }); // bells
      } },
    },
    music(name) {
      if (name === undefined) name = 'calm';
      this._want = name;
      if (this._timer && name !== this._track) this._switch(name);
    },
    _switch(name) {
      const c = this.ctx, now = c.currentTime;
      if (this._bus) { const old = this._bus; old.gain.cancelScheduledValues(now); old.gain.setTargetAtTime(0.0001, now, 0.12); setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 1500); }
      this._bus = null; this._track = name;
      if (!name || !this.TRACKS[name]) return;
      const g = this._bus = c.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(this.TRACKS[name].gain || 1, now + 0.35); g.connect(this.musicGain);
      this._step = 0; this._next = now + 0.12;
    },
    startMusic() {
      if (!this.ctx || this._timer) return;
      this._switch(this._want);
      this._timer = setInterval(() => {
        const T = this.TRACKS[this._track]; if (!T || !this._bus) return;
        const now = this.ctx.currentTime, sp = 60 / T.bpm / T.div;
        if (this._next < now - 0.1) this._next = now + 0.05; // came back from a pause: don't fire a backlog of notes
        while (this._next < now + 0.25) {
          T.play(this, this._step % T.len, this._next, sp);
          this._next += sp; this._step++;
        }
      }, 60);
    },
  };
  window.PSAudio = Audio;
})();
