// Plush Squad — synthesized sound effects + tiny procedural lullaby (no audio files needed)
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
    levelUp() { [523, 784, 1047, 1568].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.2, delay: i * 0.09 })); },

    // ---- lullaby
    _timer: null, _next: 0, _step: 0,
    startMusic() {
      if (!this.ctx || this._timer) return;
      const bpm = 88, eighth = 60 / bpm / 2;
      const chords = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
      const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
      const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
      this._next = this.ctx.currentTime + 0.1; this._step = 0;
      this._timer = setInterval(() => {
        while (this._next < this.ctx.currentTime + 0.25) {
          const bar = Math.floor(this._step / 8) % 4, s = this._step % 8;
          const ch = chords[bar];
          const delay = this._next - this.ctx.currentTime;
          this.tone(mtof(ch[pattern[s]] + 12), eighth * 1.8, { type: 'triangle', vol: 0.07, delay, dest: this.musicGain, attack: 0.01 });
          if (s === 0) this.tone(mtof(ch[0] - 12), eighth * 7, { type: 'sine', vol: 0.12, delay, dest: this.musicGain, attack: 0.03 });
          if (s === 4 && Math.random() < 0.5) this.tone(mtof(ch[3] + 24), eighth * 2, { type: 'sine', vol: 0.035, delay, dest: this.musicGain });
          this._next += eighth; this._step++;
        }
      }, 60);
    },
  };
  window.PSAudio = Audio;
})();
