'use strict';
// Web Audio 합성 효과음. 외부 오디오 파일 없음.
const Audio_ = {
  ctx: null, muted: false, master: null, lastHit: 0,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
    try { this.muted = localStorage.getItem('ms_muted') === '1'; } catch (e) {}
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem('ms_muted', this.muted ? '1' : '0'); } catch (e) {}
    return this.muted;
  },
  tone(freq, dur, type = 'square', vol = 0.3, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol = 0.2, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(g); g.connect(this.master); s.start(t0);
  },
  shoot()   { this.tone(880, 0.08, 'square', 0.08, 440); },
  axe()     { this.tone(220, 0.15, 'sawtooth', 0.1, 110); },
  whip()    { this.noise(0.08, 0.12); this.tone(300, 0.1, 'triangle', 0.1, 900); },
  lightning() { this.noise(0.25, 0.25); this.tone(1200, 0.2, 'sawtooth', 0.12, 100); },
  hit() {
    const now = performance.now();
    if (now - this.lastHit < 40) return;   // 과도한 중첩 방지
    this.lastHit = now;
    this.tone(200 + Math.random() * 80, 0.06, 'square', 0.06, 80);
  },
  kill()    { this.noise(0.1, 0.08); },
  gem()     { this.tone(1200 + Math.random() * 300, 0.07, 'sine', 0.08, 1800); },
  hurt()    { this.tone(160, 0.2, 'sawtooth', 0.2, 60); this.noise(0.15, 0.15); },
  pickup()  { this.tone(600, 0.1, 'sine', 0.15, 1200); this.tone(900, 0.15, 'sine', 0.15, 1600, 0.08); },
  levelup() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.18, null, i * 0.08)); },
  boss()    { this.tone(80, 0.6, 'sawtooth', 0.3, 40); this.noise(0.5, 0.2); },
  bomb()    { this.noise(0.6, 0.4); this.tone(120, 0.5, 'sawtooth', 0.3, 30); },
  win()     { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, null, i * 0.12)); },
  lose()    { [440, 370, 311, 220].forEach((f, i) => this.tone(f, 0.35, 'sawtooth', 0.15, null, i * 0.2)); },
};
