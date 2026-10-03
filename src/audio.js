// Everything you hear, and nearly all of it is made on the spot from oscillators and noise: Grandpa's
// honk-shoo snore, his mumbling and bellowing, squeaks, boings, bonks, toots, the air horn, the lullaby,
// the cuckoo and the sneaky plucked music that speeds up into a chase. Footsteps and knocks are samples.
import { clamp } from './util.js';
import { LINES } from './config.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const SAMPLES = [...['grass', 'stone', 'wood'].flatMap(s => [0, 1, 2, 3, 4].map(n => `step_${s}00${n}`)), 'hit000', 'hit001', 'hit002', 'creak1', 'creak2', 'latch', 'coins1', 'coins2', 'swing1', 'swing2', 'cloth', 'leather', 'chop',
  'ui_click', 'ui_confirm', 'ui_error', 'ui_bong', 'ui_drop', 'doorOpen_1', 'doorClose_1', 'glass_002', 'impactMetal_light_000', 'impactMetal_light_001', 'impactPlank_medium_000', 'impactPunch_heavy_000', 'impactPunch_heavy_001',
  'impactWood_heavy_000', 'impactSoft_heavy_000', 'impactBell_heavy_000', 'metalClick'];

export class Sound {
  constructor(ctx) {
    this.ctx = ctx; this.ear = { x: 0, y: 0, z: 0, yaw: 0 }; this.buf = {};
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    // a gentle limiter, then turned well down: nothing in the house should make you jump out of your chair
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.knee.value = 18; comp.attack.value = 0.004; comp.release.value = 0.3;
    this.out = ctx.createGain(); this.out.gain.value = 0.5; this.master.connect(comp); comp.connect(this.out); this.out.connect(ctx.destination); this.voice = {};
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.musicG = ctx.createGain(); this.musicG.gain.value = 0.3; this.musicG.connect(this.master);
    this.beat = 0; this.step16 = 0; this.snoreT = 1; this.heart = 0; this.tvT = 0; window.speechSynthesis?.getVoices();
  }
  async load(onProgress) {
    const lines = Object.entries(LINES).flatMap(([cat, list]) => list.map((_, i) => cat + '_' + i)), total = SAMPLES.length + lines.length; let n = 0;
    const get = (url, into, key) => fetch(url).then(r => r.arrayBuffer()).then(b => this.ctx.decodeAudioData(b)).then(buf => { into[key] = buf; }).catch(() => {}).finally(() => onProgress?.(++n / total));
    await Promise.all([...SAMPLES.map(f => get(`assets/sfx/${f}.ogg`, this.buf, f)), ...lines.map(k => get(`assets/voice/${k}.wav`, this.voice, k))]);
  }
  setVolume(v) { this.master.gain.value = v; }
  listen(x, y, z, yaw) { Object.assign(this.ear, { x, y, z, yaw }); }
  _place(o) {
    if (o.x == null) return [1, 0];
    const e = this.ear, dx = o.x - e.x, dz = o.z - e.z, d = Math.hypot(dx, dz, (o.y ?? e.y) - e.y), range = o.range || 70;
    if (d > range) return [0, 0];
    const k = 1 - d / range, rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw);
    return [k * k, d < 0.5 ? 0 : clamp((dx * rx + dz * rz) / d, -1, 1) * 0.8];
  }
  _out(o) { const [k, pan] = this._place(o); if (k <= 0.003) return null; const c = this.ctx, g = c.createGain(), p = c.createStereoPanner(); g.gain.value = Math.min(o.vol ?? 1, 1.5) * k; p.pan.value = pan; g.connect(p); p.connect(o.music ? this.musicG : this.master); return g; }
  play(name, o = {}) { const buf = this.buf[name]; if (!buf) return; const out = this._out(o); if (!out) return; const s = this.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = (o.rate || 1) * rnd(0.95, 1.05); s.connect(out); s.start(this.ctx.currentTime + (o.delay || 0)); }
  // A pitched voice. f: [[time 0..1, Hz], ...]. o: { type, dur, vol, vib, vibRate, lp, attack, x, y, z, range, delay }
  tone(f, o = {}) {
    const out = this._out(o); if (!out) return;
    const c = this.ctx, t0 = c.currentTime + (o.delay || 0), dur = o.dur || 0.5, osc = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f[0][1], t0); for (const [t, hz] of f) osc.frequency.linearRampToValueAtTime(hz, t0 + t * dur);
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vibRate || 6; lg.gain.value = o.vib; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + dur + 0.1); }
    lp.type = 'lowpass'; lp.frequency.value = o.lp || 6000;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + Math.min(0.08, dur * (o.attack ?? 0.2))); g.gain.setValueAtTime(1, t0 + dur * (o.hold ?? 0.6)); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(lp); lp.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  // A burst of filtered noise. o: { type, freq, freq2, q, dur, vol, am, x, y, z, range, delay }
  noise(o = {}) {
    const out = this._out(o); if (!out) return;
    const c = this.ctx, t0 = c.currentTime + (o.delay || 0), dur = o.dur || 0.4, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.8; f.frequency.setValueAtTime(o.freq || 800, t0); if (o.freq2) f.frequency.exponentialRampToValueAtTime(o.freq2, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + Math.min(0.03, dur * (o.attack ?? 0.2))); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let last = g;
    if (o.am) { const l = c.createOscillator(), lg = c.createGain(), ag = c.createGain(); l.frequency.value = o.am; lg.gain.value = 0.5; ag.gain.value = 0.5; l.connect(lg); lg.connect(ag.gain); g.connect(ag); l.start(t0); l.stop(t0 + dur + 0.1); last = ag; }
    s.connect(f); f.connect(g); last.connect(out); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
  }

  // ---------------------------------------------------------------- beans
  step(surface, vol = 0.3, o = {}) {
    const s = surface === 'tile' ? 'stone' : surface === 'rug' || surface === 'soft' ? 'grass' : 'wood';
    this.play(`step_${s}00${Math.floor(Math.random() * 5)}`, { vol: vol * (s === 'grass' ? 0.5 : 1), rate: 1.25, ...o });
    if (surface === 'creak') { this.play(Math.random() < 0.5 ? 'creak1' : 'creak2', { vol: 1.1, rate: rnd(0.9, 1.3), ...o }); this.tone([[0, 300], [0.4, 520], [1, 380]], { type: 'sawtooth', dur: 0.4, vol: 0.12, lp: 1400, vib: 30, vibRate: 30, ...o }); }
  }
  // What a thing sounds like when it hits something (or someone)
  thing(kind, p = {}, power = 1) {
    const v = clamp(power, 0.3, 2);
    if (kind === 'metal') { this.play('impactMetal_light_00' + (Math.random() < 0.5 ? 0 : 1), { ...p, vol: 0.9 * v, rate: rnd(1.1, 1.6) }); this.tone([[0, rnd(1800, 2600)], [1, 1700]], { ...p, dur: 0.5, vol: 0.08 * v, attack: 0.01 }); }
    else if (kind === 'tick') this.play('metalClick', { ...p, vol: 0.7 * v, rate: rnd(1.2, 1.7) });
    else if (kind === 'soft' || kind === 'poof') { this.noise({ ...p, freq: 500, freq2: 120, dur: 0.22, vol: (kind === 'poof' ? 0.5 : 0.7) * v }); if (kind === 'poof') this.tone([[0, 220], [1, 120]], { ...p, dur: 0.16, vol: 0.12 }); }
    else if (kind === 'glass') { this.play('glass_002', { ...p, vol: 0.8 * v, rate: rnd(1.1, 1.5) }); this.tone([[0, 2400], [1, 2300]], { ...p, dur: 0.4, vol: 0.06, attack: 0.01 }); }
    else if (kind === 'clack') for (let i = 0; i < 3; i++) this.play('metalClick', { ...p, vol: 0.8, rate: rnd(0.8, 1.1), delay: i * 0.07 });
    else if (kind === 'plastic') this.play('impactPlank_medium_000', { ...p, vol: 0.7 * v, rate: rnd(1.5, 2) });
    else if (kind === 'pan') { this.play('impactBell_heavy_000', { ...p, vol: 1.6, rate: 0.9, range: 200 }); this.tone([[0, 233], [1, 229]], { ...p, type: 'triangle', dur: 2.2, vol: 0.4, attack: 0.01, vib: 4, vibRate: 9, range: 200 }); this.tone([[0, 466], [1, 460]], { ...p, dur: 1.4, vol: 0.2, attack: 0.01, range: 200 }); }
    else if (kind === 'slap') { this.play('hit00' + Math.floor(Math.random() * 3), { ...p, vol: 1.1 * v, rate: 1.2 }); this.noise({ ...p, type: 'highpass', freq: 1800, dur: 0.08, vol: 0.5 }); }
    else if (kind === 'thwack') this.play('impactWood_heavy_000', { ...p, vol: 1.1 * v, rate: 1.3 });
    else if (kind === 'squeak') this.squeak(p);
    else if (kind === 'boing') this.tone([[0, 160], [0.15, 620], [0.4, 260], [0.6, 520], [0.8, 300], [1, 420]], { ...p, type: 'triangle', dur: 0.7, vol: 0.4, vib: 30, vibRate: 22 });
    else if (kind === 'toot') this.toot(p);
  }
  // the troll items
  zap(p = {}) { this.tone([[0, 1800], [0.3, 500], [0.6, 1400], [1, 200]], { ...p, type: 'sawtooth', dur: 0.7, vol: 0.3, lp: 4000, vib: 90, vibRate: 30 }); this.tone([[0, 400], [1, 2400]], { ...p, type: 'square', dur: 0.5, vol: 0.08, delay: 0.5, lp: 5000 }); }
  balloon(p = {}) { this.tone([[0, 900], [0.2, 1500], [0.5, 1100], [1, 1900]], { ...p, type: 'sine', dur: 0.5, vol: 0.2, vib: 70, vibRate: 40 }); this.tone([[0, 300], [1, 1300]], { ...p, type: 'triangle', dur: 1.6, vol: 0.14, delay: 0.3 }); }
  zip(p = {}) { this.tone([[0, 120], [0.8, 900], [1, 1800]], { ...p, type: 'sawtooth', dur: 0.4, vol: 0.3, lp: 3000, vib: 60, vibRate: 55 }); this.noise({ ...p, type: 'bandpass', freq: 3000, q: 4, dur: 0.3, vol: 0.5, am: 60 }); this.play('metalClick', { ...p, vol: 1, delay: 0.38 }); }
  jack(p = {}) { [[523, 0], [659, 0.1], [784, 0.2]].forEach(([hz, d]) => this.tone([[0, hz * 2], [1, hz * 2]], { ...p, type: 'sine', dur: 0.14, vol: 0.2, delay: d })); this.tone([[0, 160], [0.15, 700], [0.5, 300], [1, 500]], { ...p, type: 'triangle', dur: 0.6, vol: 0.5, vib: 30, vibRate: 22, delay: 0.32 }); this.play('impactPunch_heavy_000', { ...p, vol: 1.2, delay: 0.34 }); }
  squeak(p = {}) { this.tone([[0, 520], [0.35, 1500], [0.6, 900], [1, 1300]], { ...p, type: 'sawtooth', dur: 0.32, vol: 0.32, lp: 3600 }); }
  toot(p = {}) { this.tone([[0, 150], [0.3, 110], [0.7, 130], [1, 70]], { ...p, type: 'sawtooth', dur: rnd(0.5, 1.0), vol: 0.5, lp: 700, vib: 40, vibRate: 38 }); this.noise({ ...p, freq: 300, dur: 0.6, vol: 0.4, am: 36 }); }
  smash(p = {}) { this.play('glass_002', { ...p, vol: 1.6, rate: 0.8, range: 180 }); this.noise({ ...p, type: 'highpass', freq: 2500, dur: 0.7, vol: 1.1, range: 180 }); for (let i = 0; i < 5; i++) this.tone([[0, rnd(2000, 4200)], [1, 1800]], { ...p, dur: rnd(0.15, 0.5), vol: 0.07, attack: 0.01, delay: i * 0.05, range: 180 }); }
  bonk(p = {}) { this.play('impactPunch_heavy_00' + (Math.random() < 0.5 ? 0 : 1), { ...p, vol: 1.1 }); this.tone([[0, 420], [1, 140]], { ...p, type: 'triangle', dur: 0.22, vol: 0.3 }); }
  whee(p = {}) { this.tone([[0, 500], [0.5, 1100], [1, 380]], { ...p, type: 'triangle', dur: 0.8, vol: 0.14, vib: 30, vibRate: 12 }); }
  squish(p = {}) { this.noise({ ...p, type: 'bandpass', freq: 900, freq2: 120, q: 2, dur: 0.55, vol: 1.6, am: 44 }); this.tone([[0, 380], [1, 60]], { ...p, type: 'sawtooth', dur: 0.5, vol: 0.4, lp: 900 }); }
  pump(p = {}, k = 0) { this.noise({ ...p, type: 'bandpass', freq: 700 + k * 900, q: 4, dur: 0.16, vol: 0.9 }); this.tone([[0, 200 + k * 300], [1, 320 + k * 380]], { ...p, type: 'triangle', dur: 0.16, vol: 0.2 }); }
  pop(p = {}) { this.tone([[0, 300], [1, 1000]], { ...p, dur: 0.12, vol: 0.5, type: 'triangle' }); this.noise({ ...p, type: 'highpass', freq: 2000, dur: 0.1, vol: 0.5 }); }
  swing() { this.play(Math.random() < 0.5 ? 'swing1' : 'swing2', { vol: 0.7, rate: 1.2 }); }
  grab() { this.play('leather', { vol: 0.5, rate: 1.4 }); }
  shush(p = {}) { this.noise({ ...p, type: 'highpass', freq: 3600, dur: 0.6, vol: 0.35, attack: 0.3, range: 30 }); }
  horn(p = {}) { for (const hz of [440, 554, 659]) this.tone([[0, hz], [1, hz * 0.99]], { ...p, type: 'sawtooth', dur: 1.3, vol: 0.5, lp: 3000, attack: 0.02, hold: 0.9, range: 400 }); }
  cash(v = 1) { this.play(Math.random() < 0.5 ? 'coins1' : 'coins2', { vol: 0.7 }); [784, 1046, 1568].forEach((hz, i) => this.tone([[0, hz], [1, hz]], { type: 'triangle', dur: 0.2, vol: 0.14 * Math.min(1.5, v), delay: i * 0.07 })); }
  ui(kind = 'click') { this.play('ui_' + kind, { vol: 0.5 }); }
  lullaby(p = {}) { [[523, 0], [523, 0.4], [784, 0.8], [784, 1.2], [880, 1.6], [880, 2.0], [784, 2.4], [698, 3.2], [698, 3.6], [659, 4.0], [659, 4.4], [587, 4.8], [587, 5.2], [523, 5.6]].forEach(([hz, d]) => { this.tone([[0, hz], [1, hz]], { ...p, type: 'sine', dur: 0.7, vol: 0.2, attack: 0.02, delay: d, range: 160 }); this.tone([[0, hz * 2], [1, hz * 2]], { ...p, dur: 0.35, vol: 0.06, attack: 0.02, delay: d, range: 160 }); }); }
  cuckoo(p = {}) { for (let i = 0; i < 3; i++) { this.tone([[0, 880], [1, 880]], { ...p, type: 'triangle', dur: 0.22, vol: 0.5, delay: i * 0.75, range: 300 }); this.tone([[0, 698], [1, 698]], { ...p, type: 'triangle', dur: 0.34, vol: 0.5, delay: i * 0.75 + 0.26, range: 300 }); } }
  tick(p = {}) { this.play('metalClick', { ...p, vol: 0.5, rate: 2.2 }); }
  beep(p = {}) { for (let i = 0; i < 3; i++) this.tone([[0, 1400], [1, 1400]], { ...p, type: 'square', dur: 0.09, vol: 0.14, delay: i * 0.13, lp: 3000 }); }
  tvBlare(p = {}) { this.noise({ ...p, type: 'bandpass', freq: 1500, q: 0.6, dur: 0.5, vol: 1.2, range: 250 }); [392, 494, 587, 784].forEach((hz, i) => this.tone([[0, hz], [1, hz]], { ...p, type: 'square', dur: 0.3, vol: 0.16, delay: 0.45 + i * 0.12, lp: 2500, range: 250 })); }
  jingle(kind) {
    const N = { win: [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.4], [784, 0.56], [1046, 0.7]], sad: [[466, 0], [440, 0.4], [415, 0.8], [392, 1.2]], start: [[330, 0], [392, 0.18], [330, 0.36], [262, 0.6]], quota: [[784, 0], [988, 0.1], [1175, 0.2], [1568, 0.32]], buy: [[784, 0], [1046, 0.09], [1568, 0.18]] }[kind] || [];
    for (const [hz, d] of N) kind === 'sad' ? this.tone([[0, hz], [0.7, hz], [1, hz * 0.9]], { type: 'sawtooth', dur: d > 1.1 ? 1.3 : 0.4, vol: 0.2, lp: 900, vib: d > 1.1 ? 14 : 0, vibRate: 5, delay: d }) : this.tone([[0, hz], [1, hz]], { type: 'triangle', dur: 0.3, vol: 0.2, delay: d });
  }

  // ---------------------------------------------------------------- Grandpa
  snore(p, inhale) {
    if (inhale) { this.noise({ ...p, type: 'bandpass', freq: 170, freq2: 330, q: 3, dur: 1.25, vol: 2.2, am: 21, attack: 0.5, range: 150 }); this.tone([[0, 70], [1, 95]], { ...p, type: 'sawtooth', dur: 1.2, vol: 0.25, lp: 300, vib: 8, vibRate: 21, attack: 0.5, range: 150 }); }
    else { this.tone([[0, 980], [0.3, 760], [1, 420]], { ...p, type: 'sine', dur: 1.3, vol: 0.09, attack: 0.3, vib: 18, vibRate: 9, range: 150 }); this.noise({ ...p, type: 'bandpass', freq: 1900, freq2: 700, q: 1.5, dur: 1.3, vol: 0.5, attack: 0.3, am: 30, range: 150 }); }
  }
  // Grandpa actually speaks: a recorded line (key like 'wake_3'), heard from where his mouth is.
  // loud: he is shouting, and it carries across the house. A new shout cuts off whatever he was saying; a mutter waits its turn.
  say(key, loud, p = {}) {
    const buf = this.voice[key]; if (!buf) return false;
    if (this.saying && this.ctx.currentTime < this.sayEnd) { if (!loud) return true; try { this.saying.stop(); } catch (_) {} }
    const out = this._out({ ...p, vol: loud ? 1.5 : 1.1, range: loud ? 480 : 230 }); if (!out) return true;
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.connect(out); s.start(); this.saying = s; this.sayEnd = this.ctx.currentTime + buf.duration; return true;
  }
  // Mumbling: a few low wobbly syllables. loud = he is properly shouting.
  speak(p, loud, syllables = 4) {
    for (let i = 0; i < syllables; i++) { const f = (loud ? rnd(150, 230) : rnd(90, 130)), d = i * (loud ? 0.2 : 0.3) + rnd(0, 0.05);
      this.tone([[0, f], [0.4, f * rnd(1.1, 1.4)], [1, f * rnd(0.7, 0.95)]], { ...p, type: 'sawtooth', dur: loud ? 0.22 : 0.3, vol: loud ? 0.9 : 0.3, lp: loud ? rnd(900, 1800) : rnd(380, 700), vib: loud ? 16 : 6, vibRate: 30, delay: d, range: loud ? 400 : 140 });
      if (loud) this.noise({ ...p, freq: rnd(700, 1400), dur: 0.2, vol: 0.5, delay: d, am: 28, range: 400 }); }
  }
  roar(p) { this.noise({ ...p, freq: 900, freq2: 200, dur: 1.5, vol: 2.4, am: 26, range: 500 }); this.tone([[0, 170], [0.2, 240], [1, 90]], { ...p, type: 'sawtooth', dur: 1.5, vol: 1, lp: 1100, vib: 14, vibRate: 26, range: 500 }); }
  stomp(p, vol = 1) { this.play('impactSoft_heavy_000', { ...p, vol: 1.6 * vol, rate: 0.55, range: 260 }); this.tone([[0, 62], [1, 30]], { ...p, dur: 0.35, vol: 1.1 * vol, attack: 0.03, range: 260 }); }
  slam(p) { this.play('impactPunch_heavy_000', { ...p, vol: 2.2, rate: 0.6, range: 300 }); this.play('impactWood_heavy_000', { ...p, vol: 1.8, rate: 0.7, range: 300 }); this.noise({ ...p, freq: 1000, freq2: 100, dur: 0.5, vol: 1.6, range: 300 }); this.tone([[0, 80], [1, 30]], { ...p, dur: 0.6, vol: 1.3, attack: 0.02, range: 300 }); }
  crash(p) { this.slam(p); this.play('impactMetal_light_001', { ...p, vol: 1.5, rate: 0.5, range: 300, delay: 0.15 }); this.noise({ ...p, freq: 500, freq2: 80, dur: 1.2, vol: 1.6, range: 300, delay: 0.1 }); }
  yawn(p) { this.tone([[0, 180], [0.4, 330], [1, 120]], { ...p, type: 'sawtooth', dur: 1.6, vol: 0.4, lp: 800, attack: 0.3, range: 200 }); }

  // ---------------------------------------------------------------- every frame: the snore, the telly, your heart, and the music
  // s: { dt, grandpa: {x, y, z}, state ('sleep' | 'stir' | 'awake' | 'quiet'), meter (0..1), fear (0..1), tv: {x, y, z}, playing }
  update(s) {
    const t = this.ctx.currentTime;
    if (s.playing && (s.state === 'sleep' || s.state === 'stir')) { this.snoreT -= s.dt * (s.state === 'stir' ? 1.6 : 1); if (this.snoreT <= 0) { this.snoreIn = !this.snoreIn; this.snoreT = this.snoreIn ? 1.4 : 1.7; if (s.state === 'sleep' || this.snoreIn) this.snore(s.grandpa, this.snoreIn); this.onSnore?.(this.snoreIn); } }
    if (s.playing && (this.tvT -= s.dt) <= 0) { this.tvT = rnd(0.5, 2.5); this.noise({ ...s.tv, type: 'bandpass', freq: rnd(600, 2400), q: 1, dur: rnd(0.2, 0.7), vol: 0.07, range: 60 }); }
    if (s.fear > 0.05 && (this.heart -= s.dt) <= 0) { this.heart = 0.9 - s.fear * 0.5; for (const d of [0, 0.15]) this.tone([[0, 62], [1, 38]], { dur: 0.16, vol: 0.5 * s.fear, attack: 0.05, delay: d }); }
    // music: tiptoe plucks while he sleeps, a nervous tremble when he stirs, a gallop when he's up
    const bpm = s.state === 'awake' ? 172 : s.state === 'stir' ? 112 : 96; this.beat -= s.dt;
    if (s.playing && s.state !== 'quiet' && this.beat <= 0) {
      this.beat += 60 / bpm / 2; const i = this.step16++ % 16, m = { music: true };
      if (s.state === 'awake') { const riff = [220, 220, 262, 220, 330, 220, 294, 262, 220, 220, 262, 220, 392, 349, 330, 294][i]; this.tone([[0, riff], [1, riff]], { ...m, type: 'sawtooth', dur: 0.16, vol: 0.2, lp: 1600, attack: 0.02 }); this.tone([[0, riff / 2], [1, riff / 2]], { ...m, type: 'triangle', dur: 0.16, vol: 0.25 }); if (i % 2 === 0) this.noise({ ...m, type: 'highpass', freq: 5000, dur: 0.05, vol: 0.25 }); if (i % 4 === 0) this.tone([[0, 90], [1, 40]], { ...m, dur: 0.14, vol: 0.5, attack: 0.02 }); }
      else { const bass = [110, 0, 0, 131, 0, 0, 165, 0, 147, 0, 0, 131, 0, 123, 0, 0][i], pluck = [0, 0, 440, 0, 0, 523, 0, 0, 0, 494, 0, 0, 392, 0, 0, 0][i];
        if (bass) this.tone([[0, bass], [1, bass]], { ...m, type: 'triangle', dur: 0.3, vol: 0.3, attack: 0.02, hold: 0.1 }); if (pluck) this.tone([[0, pluck], [1, pluck]], { ...m, type: 'triangle', dur: 0.18, vol: 0.12, attack: 0.02, hold: 0.1 });
        if (i % 4 === 2) this.noise({ ...m, type: 'highpass', freq: 6000, dur: 0.03, vol: 0.08 });
        if (s.state === 'stir' && i % 2 === 0) this.tone([[0, 466], [1, 466]], { ...m, type: 'sawtooth', dur: 0.2, vol: 0.05, lp: 1400, vib: 12, vibRate: 14 }); }
    }
  }
}
