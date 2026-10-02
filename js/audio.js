'use strict';
// ===== Âm thanh tổng hợp bằng WebAudio (không cần file) =====
const Snd = {
  ctx: null, muted: false,
  ensure() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* không có audio */ }
  },
  tone(f, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { }
  },
  sfx(n) {
    if (!this.ctx || this.muted) return;
    switch (n) {
      case 'hit': this.tone(170, 0.08, 'square', 0.09, -70); break;
      case 'hit2': this.tone(230, 0.07, 'square', 0.07, -90); break;
      case 'swing': this.tone(420, 0.05, 'triangle', 0.05, -180); break;
      case 'cast': this.tone(300, 0.3, 'sine', 0.06, 260); break;
      case 'fire': this.tone(110, 0.25, 'sawtooth', 0.09, -50); break;
      case 'heal': this.tone(520, 0.18, 'sine', 0.07, 160); this.tone(720, 0.22, 'sine', 0.05, 200, 0.07); break;
      case 'boom': this.tone(72, 0.4, 'sawtooth', 0.14, -30); this.tone(46, 0.5, 'sine', 0.18, -16); break;
      case 'bigboom': this.tone(60, 0.7, 'sawtooth', 0.2, -25); this.tone(38, 0.9, 'sine', 0.24, -10, 0.05); break;
      case 'select': this.tone(660, 0.07, 'square', 0.06); break;
      case 'confirm': this.tone(520, 0.09, 'triangle', 0.09); this.tone(780, 0.12, 'triangle', 0.08, 0, 0.07); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.11, 0, i * 0.09)); break;
      case 'lb': this.tone(180, 0.8, 'sawtooth', 0.13, 900); this.tone(90, 0.9, 'square', 0.08, 500, 0.1); break;
      case 'warn': this.tone(880, 0.11, 'square', 0.07); this.tone(880, 0.11, 'square', 0.07, 0, 0.16); break;
      case 'pickup': this.tone(880, 0.08, 'sine', 0.06, 260); break;
      case 'death': this.tone(150, 0.5, 'sawtooth', 0.11, -100); break;
      case 'victory': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.24, 'triangle', 0.11, 0, i * 0.14)); break;
      case 'fail': [320, 260, 200, 140].forEach((f, i) => this.tone(f, 0.32, 'sawtooth', 0.09, -30, i * 0.2)); break;
      case 'gate': this.tone(200, 0.4, 'triangle', 0.1, 300); this.tone(400, 0.5, 'sine', 0.06, 300, 0.1); break;
    }
  }
};
