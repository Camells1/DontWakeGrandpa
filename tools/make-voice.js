// Records every one of Grandpa's lines (src/config.js LINES) as assets/voice/<category>_<index>.wav.
// The voice is Piper (https://github.com/rhasspy/piper, MIT) with the "norman" voice (trained on public-domain
// LibriVox recordings), then aged here: dropped a little in pitch, given an old man's wobble, and the shouted
// lines pushed until they crack. Usage: node tools/make-voice.js [path to the piper folder]
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const root = path.join(__dirname, '..'), PIPER = process.argv[2] || 'D:/Tools/piper', OUT = path.join(root, 'assets', 'voice');
const exe = path.join(PIPER, 'piper', 'piper.exe'), model = path.join(PIPER, 'en_US-norman-medium.onnx'), tmp = path.join(PIPER, 'line.wav');
const src = fs.readFileSync(path.join(root, 'src', 'config.js'), 'utf8'), at = src.indexOf('export const LINES = ');
const LINES = new Function('return ' + src.slice(at + 21, src.indexOf('};', at) + 1))();
const SHOUT = ['wake', 'miss', 'hit', 'slip', 'horn', 'tv'];
// what he is asked to say is not quite what is written in the speech bubble
const spoken = t => { let s = t.replace(/Zzz\.*\s*/g, '').replace(/\.\.\./g, ',').replace(/\bMmf\b/g, 'Mmm').replace(/\bHmf\b/g, 'Hmph').replace(/\bHA\b/g, 'Ha ha');
  if (s === s.toUpperCase()) s = s.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bi\b/g, 'I'); return s.trim(); };

function readWav(file) { const b = fs.readFileSync(file); let p = 12; while (p < b.length) { const id = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4); if (id === 'data') { const out = new Float32Array(n / 2); for (let i = 0; i < out.length; i++) out[i] = b.readInt16LE(p + 8 + i * 2) / 32768; return { rate: b.readUInt32LE(24), x: out }; } p += 8 + n + (n & 1); } throw new Error('no data in ' + file); }
function writeWav(file, x, rate) { const b = Buffer.alloc(44 + x.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, b); }
const biquad = (x, rate, type, f, q = 0.707) => { const w = 2 * Math.PI * f / rate, a = Math.sin(w) / (2 * q), c = Math.cos(w); let b0, b1, b2; if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a, y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
function trim(x, rate) { let a = 0, b = x.length - 1; while (a < b && Math.abs(x[a]) < 0.012) a++; while (b > a && Math.abs(x[b]) < 0.012) b--; a = Math.max(0, a - rate * 0.03 | 0); b = Math.min(x.length - 1, b + rate * 0.08 | 0); return x.slice(a, b + 1); }
// An old voice: lower, a touch slower, and never quite steady (a slow shake in pitch and in loudness, drifting about).
function age(x, rate, shout, seed) {
  let s = seed * 7919 + 13; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const base = shout ? 0.97 : 0.9, ph = rnd() * 6.28, ph2 = rnd() * 6.28, f1 = 5.1 + rnd() * 0.8, f2 = 1.3 + rnd() * 0.6, depth = shout ? 0.018 : 0.012;
  const out = []; let pos = 0;
  while (pos < x.length - 2) { const t = out.length / rate, i = pos | 0, fr = pos - i; out.push(x[i] * (1 - fr) + x[i + 1] * fr);
    pos += base * (1 + depth * Math.sin(2 * Math.PI * f1 * t + ph) + 0.012 * Math.sin(2 * Math.PI * f2 * t + ph2)); }
  let y = Float32Array.from(out);
  for (let i = 0; i < y.length; i++) { const t = i / rate; y[i] *= 1 - 0.07 * (0.5 + 0.5 * Math.sin(2 * Math.PI * f1 * t + ph + 1.3)); }
  y = biquad(biquad(y, rate, 'hp', 85), rate, 'lp', shout ? 7800 : 6200);
  let peak = 0; for (const v of y) peak = Math.max(peak, Math.abs(v)); const g = 0.9 / (peak || 1);
  for (let i = 0; i < y.length; i++) { let v = y[i] * g; if (shout) v = Math.tanh(v * 1.9) / Math.tanh(1.9); y[i] = v; }   // a shout pushes the voice until it rasps
  const fade = rate * 0.01 | 0; for (let i = 0; i < fade; i++) { y[i] *= i / fade; y[y.length - 1 - i] *= i / fade; }
  return y;
}

fs.mkdirSync(OUT, { recursive: true }); for (const f of fs.readdirSync(OUT)) if (f.endsWith('.wav')) fs.unlinkSync(path.join(OUT, f));
let n = 0, secs = 0;
for (const [cat, list] of Object.entries(LINES)) list.forEach((text, i) => {
  const shout = SHOUT.includes(cat), sleepy = cat === 'dream' || cat === 'mumble';
  const r = spawnSync(exe, ['-m', model, '-f', tmp, '--length_scale', shout ? '0.92' : sleepy ? '1.3' : '1.15', '--noise_scale', shout ? '0.9' : '0.75', '--noise_w', '0.95', '--sentence_silence', sleepy ? '0.45' : '0.18'], { input: spoken(text) + '\n', cwd: path.join(PIPER, 'piper') });
  if (r.status !== 0) throw new Error('piper failed on "' + text + '": ' + r.stderr);
  const w = readWav(tmp), y = age(trim(w.x, w.rate), w.rate, shout, n + 1); writeWav(path.join(OUT, cat + '_' + i + '.wav'), y, w.rate); n++; secs += y.length / w.rate;
});
fs.rmSync(tmp, { force: true });
console.log('recorded ' + n + ' lines, ' + secs.toFixed(1) + ' s of Grandpa');
