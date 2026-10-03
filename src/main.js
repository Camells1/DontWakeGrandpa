// Don't Wake Grandpa. Tiny beans rob a sleeping giant, one night at a time. Everything makes a noise,
// including your own real voice, and when the noise meter fills he gets up with a slipper.
// The host runs Grandpa, the loot, the Roomba and the clock; everybody runs their own bean.
import * as THREE from 'three';
import { VERSION, HOUSE, DEN, CHAIR, NIGHTS, NOISE, ITEMS, TOOLS, LOOT_POOL, UPGRADES, LINES, TIPS } from './config.js';
import { House } from './house.js';
import { Robber, PARTS, PALETTE, defaultLook, randomLook, packLook, unpackLook } from './beans.js';
import { Grandpa, GRANDPA } from './grandpa.js';
import { Items, itemGeo } from './items.js';
import { Player } from './player.js';
import { Fx } from './fx.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { Net } from './net.js';
import { Voice } from './voice.js';
import { toon } from './materials.js';
import { C, ball, cyl, torus, eyes, merge } from './shapes.js';
import { toyMat } from './materials.js';
import { toonUniforms, addOutline } from './toon.js';
import { clean, ok } from './filter.js';
import { clamp, lerp, esc, angDiff } from './util.js';

const $ = id => document.getElementById(id), show = (id, on = true) => $(id).classList.toggle('hide', !on);
const SET = Object.assign({ name: '', look: defaultLook(0), vol: 70, sens: 100, quality: 'medium', voice: 'ptt', vox: 60, pttKey: 'KeyV', radioKey: 'KeyB', ears: 1, help: true }, JSON.parse(localStorage.getItem('dwg') || '{}'));
SET.look = unpackLook(SET.look);
const save = () => localStorage.setItem('dwg', JSON.stringify(SET));
const keyName = code => code.replace(/^Key|^Digit/, '').replace(/^Arrow/, '').replace('Left', ' L').replace('Right', ' R').replace(/^Numpad/, 'Num ').trim();
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)], hexOf = l => '#' + PALETTE[l.body][1].toString(16).padStart(6, '0');
const ACTS = ['', 'swing', 'throw', 'use', 'shush', 'wave', 'cheer', 'dance'];

// ---------------------------------------------------------------- renderer, scene, lights
const canvas = $('c'), renderer = new THREE.WebGLRenderer({ canvas, antialias: SET.quality !== 'low', powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, SET.quality === 'high' ? 2 : SET.quality === 'low' ? 0.85 : 1.25));
renderer.toneMapping = THREE.NeutralToneMapping; renderer.shadowMap.enabled = SET.quality !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x100c1e);
const camera = new THREE.PerspectiveCamera(78, 1, 0.06, 600); camera.rotation.order = 'YXZ';
const hemi = new THREE.HemisphereLight(0x8f9cf0, 0x3a2f55, 0.9), moon = new THREE.DirectionalLight(0xa9bcff, 1.5);
moon.position.set(-90, 120, -150); moon.target.position.set(-10, 0, 0); moon.castShadow = true; moon.shadow.mapSize.set(SET.quality === 'high' ? 4096 : 2048, SET.quality === 'high' ? 4096 : 2048);
Object.assign(moon.shadow.camera, { left: -125, right: 125, top: 125, bottom: -125, near: 20, far: 420 }); moon.shadow.bias = -0.0012; moon.shadow.normalBias = 0.14;
const tvLight = new THREE.PointLight(0x9fc8ff, 900, 110, 1.5), lampLight = new THREE.PointLight(0xffd9a0, 0, 160, 1.3), bigLight = new THREE.PointLight(0xfff0d0, 0, 260, 1.1), denLight = new THREE.PointLight(0xffc88a, 120, 34, 1.4), fill = new THREE.PointLight(0xfff0e0, 0, 30, 1.2);
const torch = new THREE.SpotLight(0xfff0d0, 0, 70, 0.55, 0.5, 1.3); camera.add(torch, torch.target); torch.target.position.set(0, 0, -1);
scene.add(hemi, moon, moon.target, tvLight, lampLight, bigLight, denLight, fill, camera);

const actx = new (window.AudioContext || window.webkitAudioContext)();
let house, grandpa, items, fx, player, sound, input, net = null, voice = null, myId = 'h', isHost = true, started = false, time = 0, overlay = null, preview = null, previewKey = '';
const players = new Map();   // id -> everything known about a bean (mine included)
const G = { phase: 'menu', night: 1, t: 0, dur: 1, bank: 0, money: 0, up: Object.fromEntries(UPGRADES.map(u => [u.id, 0])), stats: { squished: 0, wakes: 0, bonks: 0, loot: 0, broken: 0, retries: 0 }, roombas: [], clockT: 0, allFlat: 0, homeT: 0, nextId: 1, said: 0 };
const me = { hold: null, light: false, swing: 0, swung: false, act: '', actT: 0, dance: 0, charge: 0, helmet: false, loud: 0, pend: 0, pendAt: [0, 0], sendN: 0, sendT: 0, holdT: 0, holdKey: '', useCd: 0, soloFlat: 0, soloLives: 2, lookYaw: -Math.PI / 2, lookPitch: 0, shake: 0, covered: false, slipCd: 0, dragT: 0 };
const roombaObjs = [];

// ---------------------------------------------------------------- little helpers for the screen
function toast(text, kind = '') { const box = $('toasts'), el = document.createElement('div'); el.className = 'toast card ' + kind; el.textContent = text; box.prepend(el); while (box.children.length > 5) box.lastChild.remove(); setTimeout(() => el.remove(), 6000); }
let bannerT = 0, bubbleT = 0;
function banner(title, sub = '', color = '#fff') { $('banner-title').textContent = title; $('banner-title').style.color = color; $('banner-sub').textContent = sub; const b = $('banner'); b.classList.add('hide'); void b.offsetWidth; b.classList.remove('hide'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.add('hide'), 4200); }
function bubble(text, shout) { const b = $('bubble'); b.textContent = (shout ? '👴 ' : '💤 ') + text; b.classList.toggle('shout', !!shout); b.classList.add('hide'); void b.offsetWidth; b.classList.remove('hide'); clearTimeout(bubbleT); bubbleT = setTimeout(() => b.classList.add('hide'), shout ? 3200 : 2600); }
function chatLine(name, text, color) { const log = $('chat-log'), el = document.createElement('div'); el.innerHTML = `<b style="color:${color}">${esc(name)}:</b> ${esc(text)}`; log.append(el); while (log.children.length > 6) log.firstChild.remove(); setTimeout(() => el.remove(), 14000); }
const nameOf = id => players.get(id)?.name || 'Somebody';
const clockText = () => { const m = Math.floor(clamp(G.t / G.dur, 0, 1) * 360), h = Math.floor(m / 60); return `${h === 0 ? 12 : h}:${String(Math.floor((m % 60) / 10) * 10).padStart(2, '0')} AM`; };
function ev(d, to) { if (to) { if (to === myId) handleEv(d); else net?.sendTo(to, { type: 'ev', ...d }); return; } handleEv(d); net?.send({ type: 'ev', ...d }); }
function act(k, d = {}) { if (isHost) doAct(myId, k, d); else net.sendTo('h', { type: 'act', k, ...d }); }
// I made a noise. The host adds it to Grandpa's meter; I see it on my own loudness bar.
function noise(a, x = player.pos.x, z = player.pos.z) { if (a <= 0 || G.phase !== 'night') return; me.loud = Math.min(100, me.loud + a * 4); if (isHost) grandpa.noise(a, x, z); else { me.pend += a; me.pendAt = [x, z]; } }

// ---------------------------------------------------------------- the host: nights, loot, Grandpa, the Roomba, the clock
function startNight(n) {
  const N = NIGHTS[n - 1], list = [], add = (kind, s) => list.push([G.nextId++, kind, +s.x.toFixed(1), s.y, +s.z.toFixed(1)]);
  const spots = [...house.spots].sort(() => Math.random() - 0.5).slice(0, N.loot);
  for (const s of spots) { let k = pick(LOOT_POOL); if (s.tier >= 2 && ITEMS[k].v < 20 && Math.random() < 0.6) k = pick(LOOT_POOL); if (s.y > 0 && ITEMS[k].w > 2) k = 'ring'; add(k, s); }
  add('hearing', { x: house.sideTable.x - 2.4, y: house.sideTable.y, z: house.sideTable.z - 2 }); add('remote', { x: house.coffee.x + 9, y: house.coffee.y, z: house.coffee.z + 3.4 });
  add('camel', { x: house.shelfTop.x, y: house.shelfTop.y, z: house.shelfTop.z + 2 }); if (n >= 2) add('wallet', { x: house.counter.x - 2, y: house.counter.y, z: house.counter.z - 6 });
  for (const s of [...house.toolSpots].sort(() => Math.random() - 0.5).slice(0, 7 + n)) add(pick(TOOLS), s);
  Object.assign(G, { phase: 'night', night: n, t: 0, dur: N.seconds, bank: 0, allFlat: 0, homeT: 0, said: 9, clockT: N.clock || 0, roombas: Array.from({ length: N.roomba || 0 }, (_, i) => ({ k: i * 4, u: 0, dir: i ? -1 : 1, stun: 0, x: house.roomba[i * 4][0], z: house.roomba[i * 4][1], yaw: 0 })) });
  grandpa.reset(N.hearing, G.up.tea);
  ev({ k: 'night', n, dur: N.seconds, items: list, up: G.up, money: G.money });
}
function endNight(win, why) {
  if (G.phase !== 'night') return;
  if (win) { G.money += G.bank; G.phase = G.night >= NIGHTS.length ? 'win' : 'shop'; } else { G.phase = 'fail'; G.stats.retries++; }
  ev({ k: 'phase', phase: G.phase, why, bank: G.bank, money: G.money, stats: G.stats, night: G.night });
}
function hostTick(dt) {
  if (G.phase !== 'night') return;
  const list = [...players.values()], N = NIGHTS[G.night - 1];
  G.t += dt;
  for (const p of list) if ((p.raw || 0) > 0.07 && p.ears && !p.den) grandpa.noise(p.raw * 11 * dt, p.x, p.z);                     // real voices carry
  grandpa.think(dt, { players: list.map(p => ({ id: p.id, x: p.x, y: p.y, z: p.z, vx: p.vx || 0, vz: p.vz || 0, speed: p.speed || 0, light: p.light, flat: p.flat, den: house.inDen(p.x, p.z) })), peels: [...items.list.values()].filter(i => i.kind === 'peel') });
  // loot: into the den is into the bank; heavy things scrape; false teeth chatter
  for (const it of items.list.values()) {
    const D = ITEMS[it.kind]; if (!D) continue;
    if (D.v && it.x < HOUSE.x0 - 1.6 && (it.rest || it.holders.length)) { G.bank += D.v; G.stats.loot++; const by = it.holders[0] || it.last; items.remove(it.id); ev({ k: 'bank', id: it.id, v: D.v, by, total: G.bank }); continue; }
    if (it.holders.length) { const h = players.get(it.holders[0]); if (h && (h.speed || 0) > 1) { if (D.w > it.holders.length) grandpa.noise(2.4 * dt, it.x, it.z); if (D.chatter) grandpa.noise(3 * dt, it.x, it.z); } }
  }
  if (grandpa.state === 'sleep' && (G.said -= dt) <= 0) { G.said = rnd(16, 30); ev({ k: 'g', e: 'dream', line: pick(LINES.dream) }); }                       // talking in his sleep
  // the Roomba does its round
  for (const r of G.roombas) {
    if ((r.stun -= dt) > 0) { r.yaw += dt * 9; continue; }
    const P = house.roomba, a = P[r.k % P.length], b = P[(r.k + r.dir + P.length) % P.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]); r.u += dt * 5.2 / len;
    if (r.u >= 1) { r.u = 0; r.k = (r.k + r.dir + P.length) % P.length; }
    r.x = lerp(a[0], b[0], r.u); r.z = lerp(a[1], b[1], r.u); r.yaw += angDiff(Math.atan2(b[0] - a[0], b[1] - a[1]), r.yaw) * Math.min(1, dt * 4);
  }
  // the cuckoo clock
  if (N.clock) { const before = G.clockT; G.clockT -= dt; if (before > 4 && G.clockT <= 4) ev({ k: 'tick' }); if (G.clockT <= 0) { G.clockT = N.clock; grandpa.noise(15, house.clock.x, house.clock.z); ev({ k: 'cuckoo' }); } }
  // how it ends: everybody flat, the sun coming up, or the whole crew home with the quota
  const up = list.filter(p => !p.flat);
  if (list.length > 1 || me.soloLives <= 0) { G.allFlat = up.length ? 0 : G.allFlat + dt; if (G.allFlat > 3) return endNight(false, 'flat'); }
  if (G.t >= G.dur) return endNight(G.bank >= N.quota, 'dawn');
  if (G.bank >= N.quota && up.length && up.every(p => house.inDen(p.x, p.z)) && !grandpa.up) { G.homeT += dt; if (G.homeT > 4) return endNight(true, 'home'); } else G.homeT = 0;
  if (net && (me.sendT -= dt) <= 0) { me.sendT = 0.12; net.send({ type: 'state', s: [G.night, +G.t.toFixed(1), G.bank, G.money], g: grandpa.snapshot(), r: G.roombas.map(r => [+r.x.toFixed(1), +r.z.toFixed(1), +r.yaw.toFixed(2), r.stun > 0 ? 1 : 0]) }); }
}
// What a bean asked for
function doAct(pid, k, d) {
  const p = players.get(pid); if (!p) return;
  if (k === 'noise') { grandpa.noise(clamp(+d.a || 0, 0, 60), +d.x || 0, +d.z || 0); }
  else if (k === 'grab') { const it = items.list.get(d.id); if (!it || it.kind === 'peel' || it.holders.includes(pid) || it.holders.length >= 4 || p.flat) return; if ([...items.list.values()].some(i => i.holders.includes(pid))) return; it.last = pid; if (it.kind === 'hearing' && !grandpa.aidGone) { grandpa.aidGone = true; ev({ k: 'toast', text: `🦻 ${p.name} pinched his hearing aid. He hears worse now!`, kind: 'egg' }); } ev({ k: 'hold', id: it.id, holders: [...it.holders, pid] }); }
  else if (k === 'drop') { const it = items.list.get(d.id); if (!it || !it.holders.includes(pid)) return; const rest = it.holders.filter(h => h !== pid); if (rest.length) ev({ k: 'hold', id: it.id, holders: rest }); else ev({ k: 'toss', id: it.id, p: d.p, v: d.v, by: pid, arm: d.arm ? 1 : 0 }); }
  else if (k === 'bonk') { if (d.kind === 'pie') { const pie = [...items.list.values()].find(i => i.kind === 'pie' && i.holders.includes(pid)); if (pie) { items.remove(pie.id); ev({ k: 'gone', id: pie.id, why: 'splat', x: pie.x, y: pie.y, z: pie.z }); ev({ k: 'pie' }, d.tgt); ev({ k: 'toast', text: `🥧 ${p.name} pied ${nameOf(d.tgt)} right in the face`, kind: 'egg' }); } return; } const t = players.get(d.tgt), D = ITEMS[d.kind] || { hit: [4, 3], snd: 'slap' }; if (!t || t.flat) return; const dx = t.x - p.x, dz = t.z - p.z, l = Math.hypot(dx, dz) || 1, pw = D.hit[0]; G.stats.bonks++; grandpa.noise(D.hit[1], t.x, t.z); ev({ k: 'bonk', vx: dx / l * pw, vy: 3 + pw * 0.28, vz: dz / l * pw, dur: 0.9 + pw * 0.05 }, d.tgt); ev({ k: 'bonked', id: d.tgt, snd: D.snd, x: t.x, y: t.y + 1, z: t.z }); }
  else if (k === 'whack') { if (d.what === 'roomba' && G.roombas[d.i]) { G.roombas[d.i].stun = 7; ev({ k: 'bonked', snd: 'boing', x: G.roombas[d.i].x, y: 1, z: G.roombas[d.i].z }); } else if (d.what === 'grandpa' && grandpa.asleep) { grandpa.noise(34, grandpa.x, grandpa.z); ev({ k: 'toast', text: `${p.name} just whacked GRANDPA on the slipper.`, kind: 'bad' }); ev({ k: 'bonked', snd: (ITEMS[d.kind] || {}).snd || 'slap', x: CHAIR.x, y: 3, z: CHAIR.z + 11 }); } }
  else if (k === 'pump') { const t = players.get(d.tgt); if (t?.flat) { ev({ k: 'inflate', id: d.tgt, by: pid }); } }
  else if (k === 'flat') { G.stats.squished++; }
  else if (k === 'thump') { grandpa.noise(clamp(+d.a || 0, 0, 20), p.x, p.z); ev({ k: 'bonked', id: pid, snd: d.snd || 'soft', x: p.x, y: p.y + 1, z: p.z }); }
  else if (k === 'roomba') { grandpa.noise(12, p.x, p.z); ev({ k: 'beep', x: p.x, z: p.z }); }
  else if (k === 'slipped') { const it = items.list.get(d.id); if (it) { items.remove(d.id); grandpa.noise(8, p.x, p.z); ev({ k: 'gone', id: d.id, why: 'slip', x: it.x, y: it.y, z: it.z }); } }
  else if (k === 'trap') { const it = items.list.get(d.id); if (!it) return; const kind = it.kind; grandpa.noise({ spring: 8, glue: 3, jack: 16, bubble: 9, whoopee: 14 }[kind] || 6, it.x, it.z); ev({ k: 'trap', kind, id: it.id, x: it.x, z: it.z, who: pid }); if (kind === 'spring' || kind === 'jack') { items.remove(it.id); ev({ k: 'gone', id: it.id, why: 'used', x: it.x, y: it.y, z: it.z }); } }
  else if (k === 'zap') {
    const it = items.list.get(d.id), t = players.get(d.tgt); if (!it || !t || !it.holders.includes(pid) || t.flat) return; const kind = it.kind;
    if (kind === 'magnet') { const theirs = [...items.list.values()].find(i => i.holders.includes(d.tgt)); if (!theirs) return; ev({ k: 'zip', x: t.x, y: t.y + 1, z: t.z }); items.remove(it.id); ev({ k: 'gone', id: it.id, why: 'used', x: it.x, y: it.y, z: it.z }); ev({ k: 'hold', id: theirs.id, holders: [pid] }); ev({ k: 'toast', text: `🧲 ${p.name} yanked the ${ITEMS[theirs.kind].name} right out of ${t.name}'s hands`, kind: 'egg' }); ev({ k: 'bonked', id: d.tgt, snd: 'boing', x: t.x, y: t.y + 1, z: t.z }); return; }
    if (!ITEMS[kind].keep) { items.remove(it.id); ev({ k: 'gone', id: it.id, why: 'used', x: it.x, y: it.y, z: it.z }); }
    ev({ k: 'zapped', how: kind, tgt: d.tgt, by: pid, x: p.x, y: p.y + 1.2, z: p.z });
  }
  else if (k === 'blow') { const t = players.get(d.tgt); if (!t || t.flat) return; grandpa.noise(1.2, p.x, p.z); ev({ k: 'push', vx: +d.vx || 0, vz: +d.vz || 0 }, d.tgt); }
  else if (k === 'ring') { grandpa.noise(42, p.x, p.z); ev({ k: 'ring', id: pid, x: p.x, y: p.y, z: p.z }); }
  else if (k === 'pied') { const it = items.list.get(d.id); if (it) { items.remove(it.id); ev({ k: 'gone', id: it.id, why: 'splat', x: p.x, y: p.y + 1.3, z: p.z }); } ev({ k: 'toast', text: `🥧 ${p.name} took a cream pie to the face`, kind: 'egg' }); }
  else if (k === 'toot') { grandpa.noise(14, +d.x || p.x, +d.z || p.z); ev({ k: 'toot', x: +d.x || p.x, z: +d.z || p.z }); }
  else if (k === 'use') {
    const it = items.list.get(d.id); if (!it || !it.holders.includes(pid)) return; const how = ITEMS[it.kind].use;
    if (how === 'banana') { items.remove(it.id); ev({ k: 'gone', id: it.id, why: 'eat', x: it.x, y: it.y, z: it.z }); ev({ k: 'add', item: [G.nextId++, 'peel', +p.x.toFixed(1), +house.standAt(p.x, p.z, p.y + 0.5).toFixed(2), +p.z.toFixed(1)] }); }
    else if (how === 'horn') { grandpa.noise(50, p.x, p.z); ev({ k: 'horn', x: p.x, y: p.y + 1, z: p.z, by: pid }); if (grandpa.up) ev({ k: 'g', e: 'shout', line: pick(LINES.horn) }); }
    else if (how === 'lullaby') { if (grandpa.asleep) grandpa.meter = Math.max(0, grandpa.meter - 40); items.remove(it.id); ev({ k: 'gone', id: it.id, why: 'used', x: it.x, y: it.y, z: it.z }); ev({ k: 'lullaby', x: p.x, y: p.y + 1, z: p.z, by: pid }); }
    else if (how === 'remote') { grandpa.noise(30, house.tv.x, house.tv.z); ev({ k: 'tv', by: pid }); if (grandpa.up) ev({ k: 'g', e: 'shout', line: pick(LINES.tv) }); }
  }
  else if (k === 'buy') { const u = UPGRADES.find(q => q.id === d.id), lvl = G.up[d.id] || 0; if (!u || G.phase !== 'shop' || lvl >= u.max || G.money < u.cost * (lvl + 1)) return; G.money -= u.cost * (lvl + 1); G.up[d.id] = lvl + 1; ev({ k: 'bought', id: d.id, by: pid, up: G.up, money: G.money }); }
}
function hostWire() {
  grandpa.onEvent = (kind, d) => {
    if (kind === 'slam') { G.stats.squished += 0; ev({ k: 'g', e: 'slam', x: d.x, z: d.z, hit: d.hit, line: d.hit.length ? pick(LINES.hit) : pick(LINES.miss) }); }
    else if (kind === 'wake') { G.stats.wakes++; ev({ k: 'g', e: 'wake', line: pick(LINES.wake) }); }
    else if (kind === 'slip') { const it = items.list.get(d.id); items.remove(d.id); ev({ k: 'gone', id: d.id, why: 'slip', x: d.x, y: 0.2, z: d.z }); ev({ k: 'g', e: 'slip', line: pick(LINES.slip) }); }
    else ev({ k: 'g', e: kind, x: d.x, z: d.z, line: kind === 'mumble' ? pick(LINES.mumble) : kind === 'miss' ? pick(LINES.miss) : kind === 'asleep' || kind === 'giveup' ? pick(LINES.sleep) : '' });
  };
  items.onRest = it => { if (isHost && net) net.send({ type: 'ev', k: 'rest', id: it.id, p: [+it.x.toFixed(2), +it.y.toFixed(2), +it.z.toFixed(2)] }); };
}

// ---------------------------------------------------------------- things everyone sees and hears
function handleEv(d) {
  const k = d.k;
  if (k === 'night') beginNight(d);
  else if (k === 'phase') endOfNight(d);
  else if (k === 'hold') { const it = items.list.get(d.id); if (!it) return; it.holders = d.holders; it.rest = false; it.state = 'held'; if (d.holders.includes(myId)) { if (me.hold !== d.id) sound.grab(); me.hold = d.id; } else if (me.hold === d.id) me.hold = null; }
  else if (k === 'toss') { const it = items.list.get(d.id); if (!it) return; items.toss(it, d.p, d.v); it.last = d.by; it.armed = !!d.arm; if (me.hold === d.id) me.hold = null; }
  else if (k === 'rest') { const it = items.list.get(d.id); if (it && !it.holders.length) { it.x = d.p[0]; it.y = d.p[1]; it.z = d.p[2]; it.vx = it.vy = it.vz = 0; it.rest = true; } }
  else if (k === 'add') { items.add({ id: d.item[0], kind: d.item[1], x: d.item[2], y: d.item[3], z: d.item[4] }); }
  else if (k === 'gone') { if (me.hold === d.id) me.hold = null; items.remove(d.id); if (d.why === 'break') { sound.smash(d); fx.shards(d.x, d.y + 0.3, d.z, 30); toast('💥 Something smashed. That was worth money.', 'bad'); } else if (d.why === 'eat') { sound.thing('soft', d); } else if (d.why === 'slip') { sound.whee(d); sound.thing('boing', d); } else if (d.why === 'splat') { sound.squish(d); fx.shards(d.x, d.y, d.z, 26, [1, 1, 0.95]); } else fx.dust(d.x, d.y, d.z, 8); }
  else if (k === 'bank') { if (me.hold === d.id) me.hold = null; items.remove(d.id); G.bank = d.total; sound.cash(d.v / 30); fx.sparkle(house.swag.x, 1.2, house.swag.z, 14); fx.confetti(house.swag.x, 1, house.swag.z, 12, 0.6); toast(`💰 ${nameOf(d.by)} brought home +$${d.v}`, 'good'); const p = players.get(d.by); if (p) p.cheer = 1.4; if (d.by === myId) { me.act = 'cheer'; me.actT = 1.2; } if (G.bank >= NIGHTS[G.night - 1].quota && G.bank - d.v < NIGHTS[G.night - 1].quota) { banner('QUOTA MET!', 'Everybody back in the hole. Or stay and get greedy.', '#8fe0a0'); sound.jingle('quota'); } }
  else if (k === 'bonk') { player.knock(d.vx, d.vy, d.vz, d.dur); me.shake = 0.5; dropHeld([d.vx * 0.4, 3, d.vz * 0.4]); }
  else if (k === 'pie') { me.pied = 5; sound.squish(player.pos); }
  else if (k === 'bonked') { const p = { x: d.x, y: d.y, z: d.z }; sound.thing(d.snd, p, 1.2); if (d.snd !== 'poof') sound.bonk(p); fx.bonk(d.x, d.y, d.z); if (d.snd === 'poof') fx.dust(d.x, d.y, d.z, 10, 0.8); const t = players.get(d.id); t?.bean?.kick(8); }
  else if (k === 'inflate') { const t = players.get(d.id); if (t) t.flat = false; sound.pop(t || {}); if (t) fx.confetti(t.x, t.y + 1, t.z, 30, 0.7); if (d.id === myId) { player.inflate(); show('flat', false); toast(`${nameOf(d.by)} pumped you back up!`, 'good'); } }
  else if (k === 'trap') {
    const pos = { x: d.x, y: 0.5, z: d.z }; if (d.kind === 'spring') { sound.thing('boing', pos, 1.5); fx.dust(d.x, 0.2, d.z, 8); } else if (d.kind === 'jack') { sound.jack(pos); fx.confetti(d.x, 1.5, d.z, 30, 0.8); } else if (d.kind === 'bubble') { for (let i = 0; i < 5; i++) setTimeout(() => sound.pop(pos), i * 90); } else if (d.kind === 'glue') { sound.squish(pos); } else sound.toot(pos);
    if (d.who !== myId && d.kind === 'spring') toast(`${nameOf(d.who)} has left the building.`, 'egg');
  }
  else if (k === 'zapped') { // each troll item has its own noise and its own little show
    const t = players.get(d.tgt), by = nameOf(d.by), at = t || player.pos, pos = { x: at.x, y: at.y + 1, z: at.z };
    if (d.how === 'shrink') { sound.zap(pos); for (let i = 0; i < 12; i++) fx.sparkle(lerp(d.x, at.x, i / 12), lerp(d.y, at.y + 1, i / 12), lerp(d.z, at.z, i / 12), 2); toast(`🔫 ${by} shrank ${nameOf(d.tgt)}`, 'egg'); }
    else if (d.how === 'helium') { sound.balloon(pos); fx.confetti(at.x, at.y + 2, at.z, 14, 0.5); toast(`🎈 ${by} tied balloons to ${nameOf(d.tgt)}. Bye!`, 'egg'); }
    else if (d.how === 'alarm') { sound.thing('clack', pos); sound.tick(pos); toast(`⏰ ${by} stuck an alarm clock on ${nameOf(d.tgt)}...`, 'bad'); }
    t?.bean?.kick(9);
    if (d.tgt === myId) { if (d.how === 'shrink') me.tiny = 20; else if (d.how === 'helium') { me.float = 4.2; player.vel.y = 4; player.grounded = false; } else if (d.how === 'alarm') me.alarm = 5; }
  }
  else if (k === 'zip') { sound.zip(d); for (let i = 0; i < 4; i++) fx.stars(d.x, d.y + i * 0.2, d.z); }
  else if (k === 'push') { player.vel.x += d.vx; player.vel.z += d.vz; if (!player.grounded) player.vel.y += 1.5; }
  else if (k === 'ring') { const pos = { x: d.x, y: d.y + 1, z: d.z, range: 300 }; for (let i = 0; i < 14; i++) setTimeout(() => { sound.tone([[0, 1900], [1, 1900]], { ...pos, type: 'square', dur: 0.06, vol: 0.3, lp: 5000 }); sound.play('impactMetal_light_000', { ...pos, vol: 0.6, rate: 2 }); }, i * 90); toast(`⏰ ${nameOf(d.id)}'s alarm clock is RINGING`, 'bad'); }
  else if (k === 'beep') { sound.beep({ x: d.x, y: 1, z: d.z }); }
  else if (k === 'toot') { sound.toot({ x: d.x, y: 0.5, z: d.z, range: 120 }); fx.dust(d.x, 0.3, d.z, 10, 0.8); }
  else if (k === 'horn') { sound.horn(d); me.shake = Math.max(me.shake, 0.5); toast(`📯 ${nameOf(d.by)} used the air horn. Why.`, 'bad'); }
  else if (k === 'lullaby') { sound.lullaby(d); toast(`🎵 ${nameOf(d.by)} played Grandpa a lullaby.`, 'good'); fx.hearts(grandpa.mouthPos.x, 34, grandpa.mouthPos.z, 8); }
  else if (k === 'tv') { sound.tvBlare(house.tv); house.tv.screen.material.color.setHSL(Math.random(), 0.8, 0.6); house.tv.flash = 1; toast(`📺 ${nameOf(d.by)} changed the channel. Loudly.`, 'bad'); }
  else if (k === 'tick') { toast('⏰ The cuckoo clock is about to go off...', 'bad'); for (let i = 0; i < 6; i++) setTimeout(() => sound.tick(house.clock), i * 600); }
  else if (k === 'cuckoo') { sound.cuckoo(house.clock); house.cuckooT = 2.4; }
  else if (k === 'toast') toast(d.text, d.kind);
  else if (k === 'bought') { Object.assign(G.up, d.up); G.money = d.money; sound.jingle('buy'); toast(`${nameOf(d.by)} bought ${UPGRADES.find(u => u.id === d.id).name}`, 'good'); fillShop(); }
  else if (k === 'g') grandpaEvent(d);
}
function grandpaEvent(d) {
  const m = grandpa.mouthPos, e = d.e;
  const gd = Math.hypot(m.x - player.pos.x, m.z - player.pos.z), say = (line, loud, n) => { if (!sound.say(line, loud, gd)) sound.speak(m, loud, n); };   // real words if the PC can speak, grumbling noises if not
  if (e === 'mumble' || e === 'dream') { say(d.line, false, 3 + Math.floor(Math.random() * 3)); bubble(d.line, false); }
  else if (e === 'wake') { sound.roar(m); setTimeout(() => say(d.line, true, 5), 500); bubble(d.line, true); banner('HE\'S AWAKE!', 'Hide under something. Watch for the slipper.', '#ff5d73'); me.shake = 1; }
  else if (e === 'windup') { sound.swing(); sound.speak(m, true, 1); }
  else if (e === 'slam') {
    sound.slam({ x: d.x, y: 0, z: d.z }); fx.shock(d.x, house.standAt(d.x, d.z, 40), d.z, 5); const dist = Math.hypot(d.x - player.pos.x, d.z - player.pos.z); me.shake = Math.max(me.shake, clamp(1.3 - dist / 40, 0, 1.2)); if (d.line) { bubble(d.line, true); say(d.line, true, 2); }
    for (const id of d.hit) { const p = players.get(id); if (p && id !== myId) { p.flat = true; sound.squish(p); } }
    if (d.hit.includes(myId)) { if (G.up.helmet && !me.helmet) { me.helmet = true; player.knock(rnd(-9, 9), 11, rnd(-9, 9), 1.8); toast('🪖 The colander took it! It is now a flat colander.', 'egg'); sound.thing('pan', player.pos); } else flatten(); }
    else if (dist < 9 && !player.flat) player.knock((player.pos.x - d.x) / (dist || 1) * 7, 6, (player.pos.z - d.z) / (dist || 1) * 7, 1.1);   // the shockwave
  }
  else if (e === 'slip') { sound.crash({ x: grandpa.x, y: 2, z: grandpa.z }); sound.whee(m); bubble(d.line, true); say(d.line, true, 3); me.shake = 1.4; fx.shock(grandpa.x, 0, grandpa.z, 9); toast('🍌 GRANDPA SLIPPED ON THE BANANA!', 'egg'); }
  else if (e === 'miss' || e === 'shout') { say(d.line, true, 3); if (d.line) bubble(d.line, true); }
  else if (e === 'giveup') { say(d.line, false, 4); bubble(d.line, false); }
  else if (e === 'asleep') { sound.yawn(m); toast('😴 He\'s gone back to sleep.', 'good'); }
}
function flatten() { player.flatten(); dropHeld([0, 2, 0]); sound.squish(player.pos); show('flat'); act('flat'); me.soloFlat = 7; $('flat-tip').textContent = players.size > 1 ? 'A friend can pump you back up. You can still wriggle about.' : me.soloLives > 0 ? 'Hang on... re-inflating.' : 'No puff left.'; }
function dropHeld(v = [0, 0, 0]) { const it = items.list.get(me.hold); if (!it) { me.hold = null; return; } act('drop', { id: it.id, p: [+it.x.toFixed(2), +Math.max(it.y, player.pos.y + 0.4).toFixed(2), +it.z.toFixed(2)], v: v.map(n => +n.toFixed(2)) }); me.hold = null; }

// ---------------------------------------------------------------- a night begins and ends
function beginNight(d) {
  started = true; G.phase = 'night'; G.night = d.n; G.t = 0; G.dur = d.dur; G.bank = 0; Object.assign(G.up, d.up); G.money = d.money;
  for (const id of ['menu', 'lobby', 'shop-over', 'fail-over', 'win-over', 'flat']) show(id, false); overlay = null; show('hud');
  items.clear(); for (const [id, kind, x, y, z] of d.items) items.add({ id, kind, x, y, z });
  if (!isHost) grandpa.reset(NIGHTS[d.n - 1].hearing, G.up.tea);
  const i = [...players.keys()].indexOf(myId); player.reset(DEN.x + 1 + (i % 2) * 2.4, DEN.z - 2.5 + Math.floor(i / 2) * 3 + (i % 2));
  Object.assign(me, { hold: null, light: false, swing: 0, act: '', actT: 0, charge: 0, helmet: false, loud: 0, pend: 0, soloFlat: 0, soloLives: 2, lookYaw: -Math.PI / 2, lookPitch: 0, shake: 0, tiny: 0, pied: 0, stuck: 0, float: 0, alarm: 0, blowT: 0 });
  for (const p of players.values()) p.flat = false;
  const N = NIGHTS[d.n - 1]; $('qnight').textContent = 'Night ' + d.n; $('qneed').textContent = '$' + N.quota; if (preview) preview.root.visible = false;
  banner(N.title.toUpperCase(), N.sub, '#ffc93c'); toast('💡 ' + pick(TIPS)); sound.jingle('start'); input.lock();
  while (roombaObjs.length) scene.remove(roombaObjs.pop());
}
function endOfNight(d) {
  G.phase = d.phase; G.bank = d.bank; G.money = d.money; G.stats = d.stats; input.unlock(); show('flat', false);
  const statRows = [['Banked tonight', '$' + d.bank], ['Total in the hole', '$' + d.money], ['Times he woke up', d.stats.wakes], ['Beans flattened', d.stats.squished], ['Friends whacked', d.stats.bonks], ['Things stolen', d.stats.loot]].map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
  if (d.phase === 'shop') { $('shop-title').textContent = `Night ${d.night} done!`; $('shop-stats').innerHTML = statRows; fillShop(); openOverlay('shop-over'); sound.jingle('win'); $('btn-next').classList.toggle('hide', !isHost); $('shop-msg').textContent = isHost ? '' : 'Waiting for the host to start the next night...'; }
  else if (d.phase === 'win') { $('win-stats').innerHTML = statRows + `<span>Nights restarted</span><b>${d.stats.retries}</b>`; openOverlay('win-over'); sound.jingle('win'); }
  else { $('fail-title').textContent = d.why === 'flat' ? 'Everybody got flattened' : 'The sun came up'; $('fail-text').textContent = d.why === 'flat' ? 'Grandpa sweeps four pancakes into the dustpan and goes back to bed. You wake up in the hole, round again and very embarrassed.' : `You only got $${d.bank} of the $${NIGHTS[d.night - 1].quota} you needed. Grandpa makes his breakfast, none the wiser, and you go hungry.`; openOverlay('fail-over'); sound.jingle('sad'); $('btn-retry').classList.toggle('hide', !isHost); $('fail-msg').textContent = isHost ? '' : 'Waiting for the host...'; }
}
function fillShop() {
  $('shop-money').textContent = '$' + G.money;
  $('shop-list').innerHTML = UPGRADES.map(u => { const lvl = G.up[u.id] || 0, cost = u.cost * (lvl + 1), full = lvl >= u.max; return `<div class="up"><span class="ic">${u.icon}</span><span class="tx"><b>${u.name} ${'★'.repeat(lvl)}${'☆'.repeat(u.max - lvl)}</b>${u.desc}</span><button class="btn small green" data-buy="${u.id}" ${full || G.money < cost ? 'disabled' : ''}>${full ? 'MAX' : '$' + cost}</button></div>`; }).join('');
}
function openOverlay(id) { if (overlay) show(overlay, false); overlay = id; show(id); input.unlock(); }
function closeOverlay(relock = true) { if (!overlay) return; show(overlay, false); overlay = null; if (relock && started && G.phase === 'night') input.lock(); }
function leave(msg) {
  started = false; G.phase = 'menu'; input.unlock(); if (overlay) show(overlay, false); overlay = null;
  try { voice?.stop(); } catch (_) {} voice = null; try { net?.destroy(); } catch (_) {} net = null; isHost = true; myId = 'h';
  for (const p of players.values()) dropBean(p); players.clear(); items.clear(); grandpa.reset(); while (roombaObjs.length) scene.remove(roombaObjs.pop());
  for (const id of ['hud', 'lobby', 'pause-over', 'shop-over', 'fail-over', 'win-over']) show(id, false); show('menu'); $('menu-msg').textContent = msg || '';
  G.money = 0; for (const k in G.up) G.up[k] = 0; G.stats = { squished: 0, wakes: 0, bonks: 0, loot: 0, broken: 0, retries: 0 };
}

// ---------------------------------------------------------------- the other beans
function addPlayer(id, name, look) { const p = { id, name: clean(String(name || 'Bean').slice(0, 14)) || 'Bean', look: unpackLook(look), x: house.spawn[0], y: 0, z: house.spawn[1], yaw: 0, pitch: 0, tx: house.spawn[0], ty: 0, tz: house.spawn[1], tyaw: 0, flags: 0, act: 0, actK: 0, dance: 0, speed: 0, tl: 0, raw: 0, rx: 0, rz: 0, vy: 0, ears: 1 }; players.set(id, p); return p; }
function makeBean(p) {
  p.bean = new Robber(p.look); scene.add(p.bean.root);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d');
  c.font = '800 34px Bahnschrift, Segoe UI, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 8; c.strokeStyle = '#24183a'; c.strokeText(p.name, 128, 34); c.fillStyle = hexOf(p.look); c.fillText(p.name, 128, 34);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  p.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false })); p.tag.scale.set(1.7, 0.42, 1); p.tag.position.y = p.bean.h + 0.75; p.bean.root.add(p.tag);
  p.spot = new THREE.SpotLight(0xfff0d0, 0, 50, 0.5, 0.5, 1.3); p.spot.position.set(0, 1.2, 0.3); p.spot.target.position.set(0, 1.0, 6); p.bean.root.add(p.spot, p.spot.target);
}
function dropBean(p) { if (p.bean) { scene.remove(p.bean.root); p.tag.material.map.dispose(); p.bean = null; } }
const _look = new THREE.Vector3(), _fwd = new THREE.Vector3();
function updateBeans(dt) {
  const scared = grandpa.up ? 1 : 0;
  for (const p of players.values()) {
    if (p.id === myId) continue; if (!p.bean) makeBean(p);
    const k = Math.min(1, dt * 14), px = p.x, pz = p.z, f = p.flags;
    p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.z += (p.tz - p.z) * k; p.yaw += angDiff(p.tyaw, p.yaw) * k;
    p.bean.root.position.set(p.x, p.y, p.z); p.bean.root.rotation.y = p.yaw + Math.PI; p.bean.root.visible = started; const tiny = f & 1024 ? 0.45 : 1; p.bean.root.scale.setScalar(p.bean.root.scale.x + (tiny - p.bean.root.scale.x) * Math.min(1, dt * 8));
    if (!p.pieM) { p.pieM = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), toon(0xffffff)); p.pieM.scale.set(1, 1, 0.4); p.pieM.position.set(0, p.bean.H * 0.72 + p.bean.legL, 0.5); p.bean.root.add(p.pieM); } p.pieM.visible = !!(f & 2048);
    _fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw)); _look.set(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch));
    p.talk = Math.max(clamp((voice?.level(p.id) || 0) * 7, 0, 1), p.tl || 0); p.cheer = Math.max(0, (p.cheer || 0) - dt);
    const held = [...items.list.values()].find(i => i.holders.includes(p.id)), heavy = held && ITEMS[held.kind].w > 1;
    p.bean.update(dt, { speed: p.speed, sprint: !!(f & 2), crouch: !!(f & 1), air: !!(f & 4), vy: p.vy, act: p.cheer > 0 ? 'cheer' : ACTS[p.act] || '', actK: p.actK, dance: p.dance, carry: held ? (heavy ? 2 : ACTS[p.act] === 'swing' || ACTS[p.act] === 'throw' ? 0 : 1) : 0, talk: p.talk, look: _look, fwd: _fwd, rag: f & 32 ? { rx: p.rx, rz: p.rz } : null, flat: !!(f & 16) || p.flat, scared, covered: !!(f & 64), dizzy: !!(f & 512), stuck: !!(f & 16384) });
    // what has been done to them: balloons overhead, an alarm clock on their back
    if (!p.extras) { p.extras = {}; for (const [k, y, z, sc] of [['helium', p.bean.h * 0.9, 0, 0.8], ['alarm', p.bean.h * 0.45, -0.5, 0.42]]) { const m = new THREE.Mesh(itemGeo(k), toyMat); m.position.set(0, y, z); m.scale.setScalar(sc); p.bean.root.add(m); p.extras[k] = m; } }
    p.extras.helium.visible = !!(f & 4096); p.extras.helium.rotation.z = Math.sin(time * 3) * 0.2; p.extras.alarm.visible = !!(f & 8192); p.extras.alarm.rotation.z = Math.sin(time * 40) * 0.25; if (f & 8192 && Math.random() < dt * 6) fx.stars(p.x, p.y + 1.6, p.z);
    p.flat = !!(f & 16); p.light = !!(f & 8); p.spot.intensity = p.light && !p.flat ? 60 : 0; p.tag.visible = !(f & 32);
    p.stepD = (p.stepD || 0) + Math.hypot(p.x - px, p.z - pz); if (p.stepD > 1.7 && !(f & 1) && !(f & 4) && !p.flat) { p.stepD = 0; sound.step(house.surfaceAt(p.x, p.z, p.y), 0.3, { x: p.x, y: p.y, z: p.z, range: 30 }); }
  }
}

// ---------------------------------------------------------------- reaching, carrying, whacking, throwing
function interact(dt) {
  const fxd = -Math.sin(me.lookYaw), fzd = -Math.cos(me.lookYaw), P = player.pos, E = input.keys.KeyE; let prompt = '', hold = 0, key = '';
  const held = items.list.get(me.hold); if (!held) me.hold = null;
  if (!player.flat && !player.rag) {
    // a flat friend to pump up comes first
    let friend = null, fd = 2.8; for (const p of players.values()) if (p.id !== myId && p.flat) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < fd && Math.abs(p.y - P.y) < 2) { fd = d; friend = p; } }
    if (friend) { prompt = `<kbd>E</kbd>Hold to pump up ${esc(friend.name)}`; key = 'pump' + friend.id; hold = 2.2; if (E) { const before = Math.floor(me.holdT / 0.4); me.holdT = me.holdKey === key ? me.holdT + dt : 0; me.holdKey = key; if (Math.floor(me.holdT / 0.4) !== before) { sound.pump(friend, me.holdT / hold); friend.bean?.kick(4); me.act = 'use'; me.actT = 0.3; } if (me.holdT >= hold) { me.holdT = 0; act('pump', { tgt: friend.id }); } } else me.holdT = 0; }
    else if (!held) { const it = items.nearest(P.x, P.y, P.z, fxd, fzd, 3.0); if (it) { const D = ITEMS[it.kind]; prompt = `<kbd>E</kbd>${it.holders.length ? 'Help carry' : 'Grab'} the ${D.name}${D.v ? ` <b style="color:#1f8a4c">$${D.v}</b>` : ''}${D.w > 1 ? ` <small>(heavy: ${D.w} beans)</small>` : ''}`; if (input.hit('KeyE')) act('grab', { id: it.id }); } me.holdT = 0; }
    else { me.holdT = 0; if (input.hit('KeyQ') || input.hit('KeyE')) { dropHeld([fxd * 1.5, 1, fzd * 1.5]); } }
  }
  show('prompt', !!prompt); if (prompt) { $('prompt-text').innerHTML = prompt; $('hold').style.display = hold ? '' : 'none'; $('hold').firstChild.style.width = Math.round(me.holdT / (hold || 1) * 100) + '%'; }
  // ---- what's in your hands
  me.useCd -= dt; const D = held && ITEMS[held.kind], heavy = D && D.w > held.holders.length;
  show('carry', !!held); if (held) $('carry').innerHTML = `${D.name}${D.v ? ' · $' + D.v : ''}<small>${D.use ? 'Click: ' + { banana: 'eat it (and drop the peel)', horn: 'HONK', place: 'put it down as a trap', lullaby: 'play a lullaby', remote: 'change the channel', zap: 'use it on a friend', blow: 'hold to blow' }[D.use] : 'Click: whack'} · Right click: throw · Q: put down${heavy ? ' · needs ' + D.w + ' beans' : ''}${D.troll ? '<br>😈 ' + D.troll : ''}</small>`;
  if (player.flat || player.rag || overlay) { me.charge = 0; show('charge', false); return; }
  const click = input.mouse.left && !me.clicked; me.clicked = input.mouse.left;
  if (click && me.swing <= 0 && me.useCd <= 0) {
    if (D?.use === 'zap') { // point it at a friend
      let t = null, bd = 9; for (const p of players.values()) { if (p.id === myId || p.flat) continue; const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz); if (d < bd && (dx * fxd + dz * fzd) / (d || 1) > 0.8) { bd = d; t = p; } }
      me.useCd = 1; me.act = 'use'; me.actT = 0.5; if (t) { act('zap', { id: held.id, tgt: t.id }); sound.thing('boing', P); } else toast('Point it at a friend (close up) and click.');
    }
    else if (D?.use === 'blow') { /* held down: see below */ }
    else if (D?.use) { me.useCd = D.use === 'horn' ? 2.5 : 1; me.act = 'use'; me.actT = 0.5; if (D.use === 'place') { dropHeld([0, 0, 0]); const id = held.id; setTimeout(() => { const it = items.list.get(id); if (it) it.armed = true; }, 400); act('drop', { id, p: [P.x + fxd, P.y + 0.3, P.z + fzd], v: [0, 0, 0], arm: 1 }); } else act('use', { id: held.id }); }
    else if (!heavy) { me.swing = 0.001; me.swung = false; me.act = 'swing'; sound.swing(); }
  }
  if (me.swing > 0) { // the swing takes a moment; it connects part way through
    me.swing += dt / 0.42; me.actK = me.swing; me.actT = 0.1; me.act = 'swing';
    if (!me.swung && me.swing > 0.42) { me.swung = true; const kind = held?.kind || 'slap'; let hit = false;
      for (const p of players.values()) { if (p.id === myId || p.flat) continue; const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz); if (d < 2.7 && Math.abs(p.y - P.y) < 2 && (dx * fxd + dz * fzd) / (d || 1) > 0.25) { act('bonk', { tgt: p.id, kind }); hit = true; } }
      G.roombas.forEach((r, i) => { if (Math.hypot(r.x - P.x, r.z - P.z) < 5) { act('whack', { what: 'roomba', i }); hit = true; } });
      if (grandpa.asleep && Math.hypot(CHAIR.x - P.x, CHAIR.z + 11 - P.z) < 6) { act('whack', { what: 'grandpa', kind }); hit = true; }
      if (!hit && held) noise(1.5);
    }
    if (me.swing >= 1) me.swing = 0;
  }
  if (D?.use === 'blow' && input.mouse.left && !heavy) { // the leaf blower: everything in front of you leaves
    me.act = 'use'; me.actT = 0.2; if ((me.blowT -= dt) <= 0) { me.blowT = 0.14; noise(1.3); sound.noise({ type: 'bandpass', freq: 900, q: 0.7, dur: 0.2, vol: 0.5 }); fx.dust(P.x + fxd * 2, P.y + 1, P.z + fzd * 2, 2, 1.2);
      for (const p of players.values()) { if (p.id === myId || p.flat) continue; const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz); if (d < 8 && (dx * fxd + dz * fzd) / (d || 1) > 0.7) act('blow', { tgt: p.id, vx: +(fxd * 3.2).toFixed(1), vz: +(fzd * 3.2).toFixed(1) }); } }
  }
  // throwing: hold the right button to wind up
  if (held && !heavy && input.mouse.right) { me.charge = Math.min(1, me.charge + dt / 0.8); me.act = 'throw'; me.actK = me.charge * 0.38; me.actT = 0.1; }
  else if (held && me.charge > 0) { const pw = (8 + 15 * me.charge) / Math.sqrt(D.w), cp = Math.cos(me.lookPitch); dropHeld([fxd * cp * pw + player.vel.x, Math.sin(me.lookPitch) * pw + 3.5, fzd * cp * pw + player.vel.z]); me.charge = 0; me.act = 'throw'; me.actK = 0.6; me.actT = 0.3; sound.swing(); }
  else me.charge = 0;
  show('charge', me.charge > 0); if (me.charge > 0) $('charge').firstChild.style.width = me.charge * 100 + '%';
}

// ---------------------------------------------------------------- one frame
function frame(dt) {
  time += dt;
  const W = canvas.clientWidth, H = canvas.clientHeight, pr = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(W * pr) || canvas.height !== Math.floor(H * pr)) { renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  toonUniforms.uAspect.value = camera.aspect;
  if (!started) return menuFrame(dt);
  const night = G.phase === 'night', locked = input.locked && !overlay, typing = document.activeElement === $('chat-in'), ctl = locked && !typing && night, K = input.keys, P = player.pos;
  if (locked) { const s = 0.0022 * SET.sens / 100; me.lookYaw -= input.dx * s; me.lookPitch = clamp(me.lookPitch - input.dy * s, -1.5, 1.5); }
  // ---- carrying slows you down; two beans on a heavy thing are tied to it
  const held = items.list.get(me.hold), HD = held && ITEMS[held.kind]; let speedK = 1;
  if (held) { const n = held.holders.length, w = HD.w; speedK = n >= w ? (w > 1 ? 0.86 : 1) : clamp(0.3 * n / w * 2 + 0.16 * (G.up.arms || 0), 0.2, 0.8); }
  const e = player.update(dt, { yaw: me.lookYaw, pitch: me.lookPitch, mx: ctl ? (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) : 0, mz: ctl ? (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0) : 0, sprint: ctl && (K.ShiftLeft || K.ShiftRight), jump: ctl && K.Space, jumpHit: ctl && input.hit('Space'), crouch: ctl && (K.ControlLeft || K.KeyC), speedK });
  if (held && held.holders.length > 1) { const dx = held.x - P.x, dz = held.z - P.z, d = Math.hypot(dx, dz); if (d > 1.9) { P.x += dx / d * (d - 1.9); P.z += dz / d * (d - 1.9); } }
  for (const p of players.values()) if (p.id !== myId && !p.flat && !player.rag) { const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz); if (d < 0.9 && d > 0.001 && Math.abs(P.y - p.y) < 1.5) { P.x += dx / d * (0.9 - d) * 0.5; P.z += dz / d * (0.9 - d) * 0.5; house.push(P, P.y, 0.48, player.vel, 1.7); } }   // beans are solid
  // ---- the noises I make
  const socks = 1 - 0.3 * (G.up.socks || 0);
  if (e.step) { const s = player.surface, quiet = s === 'rug' || s === 'soft' ? 0.25 : 1; sound.step(s, player.crouch ? 0.08 : player.sprinting ? 0.45 : 0.25); noise(((player.crouch ? 0 : player.sprinting ? 2.5 : 0.8) * quiet + (s === 'creak' ? 7 * (NIGHTS[G.night - 1].creaky || 1) : 0)) * socks); if (s === 'creak') toast('Creeeeak.', 'bad'); }
  if (e.jumped) sound.play('cloth', { vol: 0.3, rate: 1.4 }); if (e.landed) { sound.play('impactSoft_heavy_000', { vol: Math.min(0.9, e.landed / 14), rate: 1.3 }); if (e.landed > 6) { noise((e.landed - 5) * 0.9 * socks); fx.dust(P.x, P.y, P.z, 5); } }
  if (e.bounced) { sound.bonk(P); noise(3 + e.bounced * 0.3); fx.dust(P.x, P.y, P.z, 6); me.shake = Math.max(me.shake, 0.3); } if (e.slid) sound.play('leather', { vol: 0.5, rate: 0.7 });
  const raw = voice ? clamp((voice.rawLevel || 0) * 7, 0, 1) : 0, myTalk = voice ? clamp((voice.localLevel || 0) * 7, 0, 1) : 0;
  if (SET.ears && raw > 0.07 && night && !house.inDen(P.x, P.z)) me.loud = Math.min(100, me.loud + raw * 60 * dt);
  if (held && HD.chatter && player.speed > 1 && (me.dragT -= dt) <= 0) { me.dragT = 0.4; sound.thing('clack', held); }
  if (held && HD.w > held.holders.length && player.speed > 1 && (me.dragT -= dt) <= 0) { me.dragT = 0.5; sound.play('creak1', { vol: 0.4, rate: 0.7 }); }
  if (me.light && grandpa.asleep) { const m = grandpa.mouthPos, dx = m.x - P.x, dy = m.y + 3 - (P.y + 1.5), dz = m.z - P.z, d = Math.hypot(dx, dy, dz), cp = Math.cos(me.lookPitch); if (d < 55 && (dx * -Math.sin(me.lookYaw) * cp + dy * Math.sin(me.lookPitch) + dz * -Math.cos(me.lookYaw) * cp) / d > 0.975) noise(7 * dt, grandpa.x, grandpa.z); }   // shining the torch in his face
  // ---- the things that happen to me
  me.slipCd -= dt;
  if (night && !player.flat && !player.rag) {
    for (const it of items.list.values()) {
      const dx = it.x - P.x, dz = it.z - P.z, d = Math.hypot(dx, dz);
      if (it.kind === 'peel' && d < 1.3 && player.grounded && player.speed > 1.5 && me.slipCd <= 0) { me.slipCd = 2; player.knock(player.vel.x * 1.5, 7, player.vel.z * 1.5, 1.4); act('slipped', { id: it.id }); }
      else if (it.armed && it.rest && d < 1.5 && player.grounded && me.slipCd <= 0 && (ITEMS[it.kind].trap || it.kind === 'whoopee')) {
        me.slipCd = 1.6; const kind = it.kind;
        if (kind === 'whoopee') { player.vel.y = 6; player.grounded = false; act('toot', { x: it.x, z: it.z }); }
        else { act('trap', { id: it.id }); if (kind === 'spring') { player.knock(rnd(-3, 3), 24, rnd(-3, 3), 2.4); dropHeld([0, 4, 0]); } else if (kind === 'jack') { player.knock(dx / (d || 1) * -9, 8, dz / (d || 1) * -9, 1.3); dropHeld([0, 3, 0]); } else if (kind === 'glue') { me.stuck = 3.5; toast('You are stuck in glue.', 'bad'); } }
      }
      else if (it.state === 'free' && !it.rest && it.last !== myId && d < it.r + 0.7 && Math.abs(it.y - P.y - 0.9) < 1.3) { const sp = Math.hypot(it.vx, it.vy, it.vz), D = ITEMS[it.kind]; if (sp > 5 && it.kind === 'pie') { me.pied = 5; it.last = myId; act('pied', { id: it.id }); } else if (sp > 7 && D) { player.knock(it.vx * 0.5 * D.w, 4 + D.w, it.vz * 0.5 * D.w, 1.1); it.vx *= -0.3; it.vz *= -0.3; it.last = myId; act('thump', { a: D.hit[1] * 0.6, snd: D.snd }); dropHeld([0, 3, 0]); } }
    }
    G.roombas.forEach((r, i) => { const dx = P.x - r.x, dz = P.z - r.z, d = Math.hypot(dx, dz); if (d < 3.5 && P.y < 1.4 && r[3] !== 1 && !(r.stun > 0)) { player.knock(dx / (d || 1) * 9, 6, dz / (d || 1) * 9, 1.1); act('roomba', { i }); dropHeld([0, 3, 0]); } });
  }
  if (player.flat && players.size === 1 && me.soloLives > 0 && (me.soloFlat -= dt) <= 0) { me.soloLives--; player.inflate(); show('flat', false); sound.pop(P); toast(me.soloLives ? 'You wriggled yourself round again. One puff left.' : 'That was your last puff. Do not get flattened again.', 'bad'); }
  me.tiny = Math.max(0, (me.tiny || 0) - dt); me.pied = Math.max(0, (me.pied || 0) - dt); me.stuck = Math.max(0, (me.stuck || 0) - dt); me.float = Math.max(0, (me.float || 0) - dt);
  if (me.float > 0) { player.vel.y = 3.4; player.grounded = false; if (me.float <= dt * 1.5) { player.knock(rnd(-2, 2), 0, rnd(-2, 2), 1.6); toast('The balloons popped.', 'bad'); sound.pop(P); } }
  if (me.stuck > 0) { player.vel.x = 0; player.vel.z = 0; }
  if (me.alarm > 0) { const before = Math.ceil(me.alarm * 2); me.alarm -= dt; if (Math.ceil(me.alarm * 2) !== before) sound.tick(P); if (me.alarm <= 0) { me.alarm = 0; act('ring'); } }
  $('pie').style.opacity = Math.min(1, me.pied / 1.5);
  me.covered = house.covered(P.x, P.y, P.z);
  // ---- emotes
  me.actT -= dt; if (me.actT <= 0 && me.swing <= 0) me.act = '';
  if (ctl && !player.flat && !player.rag) {
    if (input.hit('KeyF')) { me.light = !me.light; sound.play('metalClick', { vol: 0.5, rate: me.light ? 1.2 : 0.9 }); }
    if (input.hit('KeyG')) me.dance = (me.dance + 1) % 4; if (K.KeyG) { me.act = 'dance'; me.actT = 0.2; }
    if (input.hit('KeyT')) { me.act = 'shush'; me.actT = 1.2; sound.shush(); net?.send({ type: 'emote', e: 'shush' }); }
    if (K.KeyZ) { me.act = 'wave'; me.actT = 0.2; }
    if (input.hit('KeyH')) { SET.help = !SET.help; save(); show('help', SET.help); }
  }
  if (input.hit('Enter') && !overlay) { const ci = $('chat-in'); if (typing) { const t = clean(ci.value.trim()); if (t) { chatLine(nameOf(myId), t, hexOf(SET.look)); net?.send({ type: 'chat', text: t }); } ci.value = ''; ci.blur(); show('chat-in', false); input.lock(); } else { show('chat-in'); ci.focus(); } }
  if (night) interact(dt); else { show('prompt', false); show('carry', false); }
  // ---- voice chat
  me.radio = !!(ctl && K[SET.radioKey]);
  if (voice) { voice.setTalking(!!(ctl && (K[SET.pttKey] || K[SET.radioKey]))); const pm = new Map(); for (const p of players.values()) pm.set(p.id, { x: p.x, y: p.y + 1.4, z: p.z, radio: !!(p.flags & 128) }); voice.update({ x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: me.lookYaw }, pm, SET.vol / 100 * 1.5); }
  // ---- my own record; everyone else gets it twelve times a second
  const mp = players.get(myId), flags = (player.crouch ? 1 : 0) | (player.sprinting ? 2 : 0) | (!player.grounded ? 4 : 0) | (me.light ? 8 : 0) | (player.flat ? 16 : 0) | (player.rag ? 32 : 0) | (me.covered ? 64 : 0) | (me.radio ? 128 : 0) | (player.dizzy > 0 ? 512 : 0) | (me.tiny > 0 ? 1024 : 0) | (me.pied > 0 ? 2048 : 0) | (me.float > 0 ? 4096 : 0) | (me.alarm > 0 ? 8192 : 0) | (me.stuck > 0 ? 16384 : 0);
  if (mp) Object.assign(mp, { vx: player.vel.x, vz: player.vel.z, x: P.x, y: P.y, z: P.z, yaw: me.lookYaw, pitch: me.lookPitch, flags, flat: player.flat, light: me.light, speed: player.speed, raw: SET.ears ? raw : 0, tl: myTalk, ears: SET.ears });
  if (net && (me.sendN -= dt) <= 0) { me.sendN = 0.07; const r = player.rag; net.send({ type: 'pos', p: [+P.x.toFixed(2), +P.y.toFixed(2), +P.z.toFixed(2), +me.lookYaw.toFixed(3), +me.lookPitch.toFixed(2), flags, ACTS.indexOf(me.act), +(me.actK || 0).toFixed(2), me.dance, +player.speed.toFixed(1), +myTalk.toFixed(2), SET.ears ? +raw.toFixed(2) : 0, r ? +r.rx.toFixed(2) : 0, r ? +r.rz.toFixed(2) : 0, +player.vel.y.toFixed(1)] }); if (!isHost && me.pend > 0) { net.sendTo('h', { type: 'act', k: 'noise', a: +me.pend.toFixed(2), x: me.pendAt[0], z: me.pendAt[1] }); me.pend = 0; } }
  // ---- the world
  if (isHost) hostTick(dt); else if (night) G.t += dt;
  updateBeans(dt);
  const who = new Map(); for (const p of players.values()) who.set(p.id, p.id === myId ? { x: P.x, y: P.y, z: P.z, yaw: me.lookYaw, pitch: me.lookPitch, swing: me.swing, mine: true, eye: player.eye } : { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, swing: ACTS[p.act] === 'swing' ? p.actK : 0 });
  items.update(dt, who);
  grandpa.update(dt, [...players.values()].filter(p => !p.flat));
  updateRoombas(dt);
  // ---- camera: your eyes; they tumble when you do
  me.shake = Math.max(0, me.shake - dt * 1.7); const sx = (Math.random() - 0.5) * me.shake * 0.4, sy = (Math.random() - 0.5) * me.shake * 0.4, r = player.rag;
  const bob = player.grounded && player.speed > 1 && !player.flat ? Math.sin(player.stepPhase * 2) * 0.03 * Math.min(1, player.speed / 5) : 0;
  camera.position.set(P.x, P.y + (player.eye + bob) * (me.tiny > 0 ? 0.5 : 1), P.z);
  camera.rotation.set(me.lookPitch + sy + (r ? Math.sin(r.rx) * 0.9 : 0) + (player.flat ? 0.25 : 0), me.lookYaw + sx, (r ? Math.sin(r.rz) * 1.1 + Math.sin(r.rx * 0.5) * 0.5 : 0) + (player.slide > 0 ? -0.06 : 0) + (me.act === 'dance' ? Math.sin(time * 9) * 0.1 : 0) + (player.dizzy > 0 ? Math.sin(time * 9) * 0.08 * player.dizzy : 0));
  const fov = 78 + (player.sprinting ? 7 : 0) + (r ? 10 : 0); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 8); camera.updateProjectionMatrix(); }
  sound.listen(camera.position.x, camera.position.y, camera.position.z, me.lookYaw);
  lights(dt); torch.intensity = me.light && !player.flat ? 130 : 0;
  fx.update(dt, canvas.height, camera.fov);
  const gd = Math.hypot(grandpa.vx - P.x, grandpa.vz - P.z);
  sound.update({ dt, playing: night, grandpa: grandpa.mouthPos, tv: house.tv, state: !night ? 'quiet' : grandpa.up ? 'awake' : grandpa.state === 'stir' ? 'stir' : 'sleep', fear: grandpa.up && !player.flat ? clamp(1.2 - gd / 60, 0, 1) : 0 });
  hud(dt);
  renderer.render(scene, camera);
}
let hudT = 0;
function hud(dt) {
  me.loud = Math.max(0, me.loud - dt * 55); $('loud').querySelector('i').style.width = me.loud + '%';
  $('alarm').style.opacity = grandpa.up && G.phase === 'night' ? 0.35 + Math.sin(time * 6) * 0.15 : 0;
  if ((hudT -= dt) > 0) return; hudT = 0.12;
  const m = clamp(grandpa.meter / NOISE.wake, 0, 1), st = grandpa.up ? 'awake' : grandpa.state === 'stir' ? 'stir' : 'sleep';
  $('mbar').firstChild.style.width = (st === 'awake' ? 100 : m * 100) + '%'; $('meter').className = 'card ' + (st === 'sleep' ? '' : st);
  $('mface').textContent = st === 'awake' ? '😡' : st === 'stir' ? '😑' : m > 0.25 ? '😪' : '😴'; $('mlabel').textContent = st === 'awake' ? 'AWAKE! HIDE!' : st === 'stir' ? 'Stirring... shhh' : m > 0.25 ? 'Snoring' : 'Fast asleep'; $('clock').textContent = clockText();
  const N = NIGHTS[G.night - 1]; $('qhave').textContent = '$' + G.bank; $('qbar').firstChild.style.width = clamp(G.bank / N.quota, 0, 1) * 100 + '%';
  $('qnote').textContent = G.bank >= N.quota ? (G.homeT > 0 ? 'Everybody home... counting the swag' : 'Quota met! Get the whole crew back in the hole.') : `${Math.max(0, Math.ceil((G.dur - G.t) / 60))} min until sunrise`;
  $('stam').querySelector('i').style.width = player.stamina + '%';
  $('team').innerHTML = [...players.values()].map(p => `<div class="mate card ${p.flat ? 'flat' : ''} ${(p.id === myId ? mp_talk() : p.talk) > 0.12 ? 'talk' : ''}"><span class="dot" style="background:${hexOf(p.look)}"></span><span>${p.flat ? '🥞 ' : ''}${esc(p.name)}${p.id === myId ? ' (you)' : ''}</span><span class="mic">${p.flags & 128 ? '📻' : '🎤'}</span></div>`).join('');
  const lvl = voice ? clamp((voice.rawLevel || 0) * 7, 0, 1) : 0; $('mic').classList.toggle('on', lvl > 0.12 && !!SET.ears);
  $('mic-text').textContent = !voice?.micOk ? 'no microphone' : me.radio ? 'RADIO' : SET.voice === 'open' ? 'mic always on' : SET.voice === 'vox' ? 'voice activated' : `${keyName(SET.pttKey)}: talk`;
}
const mp_talk = () => (voice ? clamp((voice.localLevel || 0) * 7, 0, 1) : 0);
function lights(dt) {
  const up = grandpa.up && G.phase === 'night' ? 1 : 0; lights.k = (lights.k || 0) + (up - (lights.k || 0)) * Math.min(1, dt * 4); const k = lights.k;
  hemi.intensity = lerp(0.95, 1.25, k); hemi.color.setRGB(lerp(0.56, 1, k), lerp(0.61, 0.93, k), lerp(0.94, 0.82, k)); moon.intensity = lerp(1.5, 1.0, k);
  house.tv.flash = Math.max(0, (house.tv.flash || 0) - dt); tvLight.position.set(house.tv.x, house.tv.y, house.tv.z); tvLight.intensity = 700 + Math.sin(time * 23) * 120 + Math.sin(time * 7.3) * 200 + house.tv.flash * 2500;
  if (!house.tv.flash) house.tv.screen.material.color.setHSL(0.6, 0.5, 0.72 + Math.sin(time * 17) * 0.06);
  lampLight.position.set(house.lamp.x, house.lamp.y, house.lamp.z); lampLight.intensity = k * 110; bigLight.position.set(house.ceilLamp.x, house.ceilLamp.y, house.ceilLamp.z); bigLight.intensity = k * 200;
  denLight.position.set(DEN.x, 5, DEN.z);
}
function updateRoombas(dt) {
  while (roombaObjs.length < G.roombas.length) { const g = new THREE.Group(), m = new THREE.Mesh(merge([cyl(3.2, 3.3, 1.3, 0, 0.75, 0, C(0x33384a)), torus(3.3, 0.3, 0, 0.5, 0, C(0xe5484d)), cyl(1.2, 1.2, 0.2, 0, 1.45, 0, C(0x5bc8ff)), ...eyes(0, 1.7, 2.2, 0.5, 0.7), cyl(0.06, 0.06, 2.2, -1.6, 2.4, -1.4, C(0xb8c4d0)), ball(0.3, -1.6, 3.5, -1.4, C(0xffc93c))]), toyMat); m.castShadow = true; g.add(m); addOutline(g, 0.0024); scene.add(g); roombaObjs.push(g); }
  G.roombas.forEach((r, i) => { const o = roombaObjs[i]; o.visible = true; o.position.x += (r.x - o.position.x) * Math.min(1, dt * 12); o.position.z += (r.z - o.position.z) * Math.min(1, dt * 12); o.rotation.y = r.yaw; o.position.y = r.stun > 0 ? Math.abs(Math.sin(time * 12)) * 0.4 : 0; });
  for (let i = G.roombas.length; i < roombaObjs.length; i++) roombaObjs[i].visible = false;
}
// Behind the menu: down on the floor, looking up at Grandpa asleep, with your own bean showing off its outfit
function menuFrame(dt) {
  const a = Math.sin(time * 0.15) * 0.12; camera.position.set(-60 + a * 6, 2.0, 34); camera.fov = 66; camera.updateProjectionMatrix(); camera.lookAt(-45, 8.5, -6);
  const key = JSON.stringify(SET.look); if (key !== previewKey) { if (preview) scene.remove(preview.root); preview = new Robber(SET.look); previewKey = key; scene.add(preview.root); preview.kick(7); }
  preview.root.visible = true; preview.root.position.set(-60.4, 0, 27.6); preview.root.rotation.y = Math.atan2(camera.position.x - preview.root.position.x, camera.position.z - preview.root.position.z) + Math.sin(time * 0.8) * 0.5;
  const dressing = !$('dress-panel').classList.contains('hide'); preview.update(dt, { act: dressing ? (Math.floor(time / 4) % 3 === 2 ? 'wave' : '') : Math.floor(time / 5) % 2 ? 'dance' : 'wave', dance: Math.floor(time / 10) % 4, fwd: _fwd.set(Math.sin(preview.root.rotation.y), 0, Math.cos(preview.root.rotation.y)), look: _look.set(camera.position.x - preview.root.position.x, 0.4, camera.position.z - preview.root.position.z).normalize() });
  fill.position.set(-59, 3.5, 31); fill.intensity = 30;
  grandpa.update(dt, []); lights(dt); fx.update(dt, canvas.height, camera.fov);
  sound.listen(camera.position.x, camera.position.y, camera.position.z, 0); sound.update({ dt, playing: actx.state === 'running', grandpa: grandpa.mouthPos, tv: house.tv, state: 'sleep', fear: 0 });
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- co-op wiring
function wireNet() {
  net.on('pos', (d, from) => { const p = players.get(from), a = d.p; if (!p || !Array.isArray(a)) return; const now = performance.now(), gap = Math.max(0.03, (now - (p.at || now - 70)) / 1000); p.vx = (a[0] - p.tx) / gap; p.vz = (a[2] - p.tz) / gap; p.at = now; [p.tx, p.ty, p.tz, p.tyaw, p.pitch, p.flags, p.act, p.actK, p.dance, p.speed, p.tl, p.raw, p.rx, p.rz, p.vy] = a; p.flat = !!(p.flags & 16); p.light = !!(p.flags & 8); if (isHost) { p.x = p.tx; p.y = p.ty; p.z = p.tz; } });
  net.on('act', (d, from) => { if (isHost) doAct(from, d.k, d); });
  net.on('ev', d => handleEv(d));
  net.on('state', d => { [G.night, , G.bank, G.money] = d.s; if (Math.abs(G.t - d.s[1]) > 0.6) G.t = d.s[1]; grandpa.apply(d.g); G.roombas = d.r.map(r => ({ x: r[0], z: r[1], yaw: r[2], stun: r[3] })); });
  net.on('chat', (d, from) => { const p = players.get(from); if (p) chatLine(p.name, clean(String(d.text || '').slice(0, 120)), hexOf(p.look)); });
  net.on('emote', (d, from) => { const p = players.get(from); if (p && d.e === 'shush') sound.shush(p); });
  net.on('joined', d => { if (!players.has(d.id)) { const p = addPlayer(d.id, d.name, d.look); lobbyList(); toast(`${p.name} squeezed into the hole`, 'good'); } });
  net.on('left', d => { const p = players.get(d.id); if (p) { toast(`${p.name} went home`); dropBean(p); players.delete(d.id); voice?.removePlayer(d.id); lobbyList(); } });
  net.on('vready', (d, from) => { if (!voice?.local) return; voice.addPlayer(from, d.peerId, true); net.sendTo(from, { type: 'vhere', peerId: net.peer.id }); });
  net.on('vhere', (d, from) => { if (voice?.local) voice.addPlayer(from, d.peerId, true); });
  net.onJoin = (id, hello) => {
    if (G.phase !== 'lobby') { net.sendTo(id, { type: 'full', reason: 'That heist has already started.' }); return; }
    const p = addPlayer(id, ok(hello.name) ? hello.name : 'Bean', hello.look);
    net.sendTo(id, { type: 'welcome', you: id, players: [...players.values()].map(q => ({ id: q.id, name: q.name, look: packLook(q.look) })) });
    net.send({ type: 'joined', id, name: p.name, look: packLook(p.look) }); lobbyList(); toast(`${p.name} squeezed into the hole`, 'good');
  };
  net.onLeave = id => { const p = players.get(id); if (!p) return; for (const it of items.list.values()) if (it.holders.includes(id)) ev({ k: 'toss', id: it.id, p: [it.x, it.y, it.z], v: [0, 0, 0], by: id }); toast(`${p.name} went home`); dropBean(p); players.delete(id); voice?.removePlayer(id); net.send({ type: 'left', id }); lobbyList(); };
  net.onClose = () => leave('Lost the connection to the host.');
}
const voxGate = () => 0.012 + (100 - SET.vox) / 100 * 0.1;
async function startVoice() { voice = new Voice(); voice.voxGate = voxGate(); await voice.start(net?.peer || null, myId, SET.voice); if (net) net.send({ type: 'vready', peerId: net.peer.id }); }
function lobbyList() {
  if (G.phase !== 'lobby') return; const list = [...players.values()];
  $('lobby-list').innerHTML = [0, 1, 2, 3].map(i => list[i] ? `<div class="slot"><span class="dot" style="background:${hexOf(list[i].look)}"></span>${esc(list[i].name)}${list[i].id === myId ? ' (you)' : ''}${list[i].id === 'h' ? ' ⭐' : ''}</div>` : '<div class="slot empty">Waiting for a bean...</div>').join('');
  $('btn-start').classList.toggle('hide', !isHost); $('btn-start').textContent = list.length < 2 ? 'Start alone' : `Start the heist (${list.length} beans)`; $('lobby-msg').textContent = isHost ? '' : 'Waiting for the host to start...';
}
function myName() { const n = $('name').value.trim(); if (n.length < 2) { $('menu-msg').textContent = 'Give your bean a name first (2+ letters).'; return null; } if (!ok(n)) { $('menu-msg').textContent = 'Pick a different name, please.'; return null; } SET.name = n; save(); actx.resume(); return n; }
async function host() {
  const name = myName(); if (!name) return; $('menu-msg').textContent = 'Digging a mouse hole...';
  try { net = new Net(); const code = await net.host(); isHost = true; myId = 'h'; wireNet(); G.phase = 'lobby'; players.clear(); addPlayer('h', name, SET.look); $('room-code').textContent = code; show('menu', false); show('lobby'); lobbyList(); startVoice(); $('menu-msg').textContent = ''; }
  catch (e) { net = null; $('menu-msg').textContent = e.message || 'Could not host.'; }
}
async function join() {
  const name = myName(), code = $('join-code').value.trim().toUpperCase(); if (!name) return; if (code.length !== 5) { $('menu-msg').textContent = 'Room codes are 5 letters.'; return; }
  $('menu-msg').textContent = 'Squeezing in...';
  try { net = new Net(); const w = await net.join(code, { name, look: packLook(SET.look) }); isHost = false; myId = w.you; wireNet(); G.phase = 'lobby'; players.clear(); for (const q of w.players) addPlayer(q.id, q.name, q.look); $('room-code').textContent = code; show('menu', false); show('lobby'); lobbyList(); $('menu-msg').textContent = ''; startVoice(); }
  catch (e) { net = null; $('menu-msg').textContent = e.message || 'Could not join.'; }
}
function solo() { const name = myName(); if (!name) return; net = null; isHost = true; myId = 'h'; players.clear(); addPlayer('h', name, SET.look); startVoice(); startNight(1); }

// ---------------------------------------------------------------- menus
function dressList() {
  $('dress-list').innerHTML = PARTS.map(([k, label, opts]) => { const v = SET.look[k], colour = opts.length === PALETTE.length && opts[0] === PALETTE[0][0]; return `<div class="part"><span>${label}</span><button data-part="${k}" data-d="-1">◀</button><b>${colour ? `<i class="sw" style="background:#${PALETTE[v][1].toString(16).padStart(6, '0')}"></i>` : ''}${opts[v]}</b><button data-part="${k}" data-d="1">▶</button></div>`; }).join('');
}
function wireMenus() {
  $('ver').textContent = VERSION; $('name').value = SET.name; dressList();
  $('btn-dress').onclick = () => { show('play-panel', false); show('dress-panel'); sound.ui('click'); }; $('btn-dress-done').onclick = () => { show('dress-panel', false); show('play-panel'); save(); sound.ui('confirm'); };
  $('btn-random').onclick = () => { SET.look = randomLook(); save(); dressList(); sound.pop(); }; $('btn-plain').onclick = () => { SET.look = defaultLook(SET.look.body); save(); dressList(); sound.ui('click'); };
  $('dress-list').onclick = e => { const b = e.target.closest('[data-part]'); if (!b) return; const part = PARTS.find(p => p[0] === b.dataset.part), n = part[2].length; SET.look[part[0]] = (SET.look[part[0]] + +b.dataset.d + n) % n; save(); dressList(); sound.ui('click'); };
  $('btn-host').onclick = host; $('btn-join').onclick = join; $('btn-solo').onclick = solo; $('join-code').onkeydown = e => { if (e.key === 'Enter') join(); e.stopPropagation(); };
  $('btn-quit').onclick = () => window.electronAPI?.quit ? window.electronAPI.quit() : window.close();
  $('btn-start').onclick = () => { if (isHost && G.phase === 'lobby') startNight(1); };
  $('btn-next').onclick = () => { if (isHost && G.phase === 'shop') startNight(G.night + 1); }; $('btn-retry').onclick = () => { if (isHost && G.phase === 'fail') startNight(G.night); };
  $('btn-resume').onclick = () => closeOverlay();
  const openSet = () => { $('set-vol').value = SET.vol; $('set-sens').value = SET.sens; $('set-quality').value = SET.quality; $('set-voice').value = SET.voice; $('set-vox').value = SET.vox; $('set-ears').value = SET.ears ? '1' : '0'; show('settings-over'); };
  $('btn-settings').onclick = openSet; $('btn-settings2').onclick = openSet;
  let binding = null; const showKeys = () => { for (const k of ['pttKey', 'radioKey']) { $('bind-' + k).textContent = binding === k ? 'Press a key...' : keyName(SET[k]); $('k-' + k).textContent = keyName(SET[k]); } };
  for (const k of ['pttKey', 'radioKey']) $('bind-' + k).onclick = e => { binding = k; showKeys(); e.target.blur(); };
  addEventListener('keydown', e => { if (!binding) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.code !== 'Escape') { const other = binding === 'pttKey' ? 'radioKey' : 'pttKey'; if (SET[other] === e.code) SET[other] = SET[binding]; SET[binding] = e.code; save(); } binding = null; showKeys(); }, true); showKeys();
  $('set-vol').oninput = e => { SET.vol = +e.target.value; sound.setVolume(SET.vol / 100); save(); }; $('set-sens').oninput = e => { SET.sens = +e.target.value; save(); };
  $('set-quality').onchange = e => { SET.quality = e.target.value; save(); }; $('set-voice').onchange = e => { SET.voice = e.target.value; voice?.setMode(SET.voice); save(); };
  $('set-vox').oninput = e => { SET.vox = +e.target.value; if (voice) voice.voxGate = voxGate(); save(); }; $('set-ears').onchange = e => { SET.ears = +e.target.value; save(); };
  document.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { show('settings-over', false); sound.ui('click'); }
    if (e.target.closest('[data-leave]')) leave();
    const b = e.target.closest('[data-buy]'); if (b) act('buy', { id: b.dataset.buy });
  });
  canvas.addEventListener('click', () => { actx.resume(); if (started && !overlay && G.phase === 'night') input.lock(); });
  input.onLockChange = on => { if (!on && started && !overlay && G.phase === 'night' && document.activeElement !== $('chat-in')) openOverlay('pause-over'); };
  addEventListener('keydown', e => { if (e.code === 'Tab') e.preventDefault(); if (e.code === 'Escape' && overlay === 'pause-over') closeOverlay(false); });
  $('chat-in').addEventListener('keydown', e => { if (e.code !== 'Enter') e.stopPropagation(); }); $('name').addEventListener('keydown', e => e.stopPropagation());
  show('help', SET.help);
}

// ---------------------------------------------------------------- boot
(async function boot() {
  try {
    sound = new Sound(actx); sound.setVolume(SET.vol / 100); await sound.load(k => { $('loadbar').firstChild.style.width = Math.round(k * 100) + '%'; });
    house = new House(scene, SET.quality); grandpa = new Grandpa(scene, house); items = new Items(scene, house); fx = new Fx(scene); input = new Input(canvas); player = new Player(house, G.up);
    grandpa.onStep = (x, z) => { sound.stomp({ x, y: 0, z }); const d = Math.hypot(x - player.pos.x, z - player.pos.z); me.shake = Math.max(me.shake, clamp(0.7 - d / 70, 0, 0.6)); fx.dust(x, 0, z, 6, 2); };
    sound.onSnore = inhale => { if (!inhale) { const m = grandpa.mouthPos; fx.zzz(m.x, m.y + 4, m.z, 3); } };
    items.onImpact = (it, speed) => { const D = ITEMS[it.kind] || { snd: 'soft', hit: [0, 2], w: 1 }; sound.thing(D.snd, it, speed / 9); if (speed > 6) fx.dust(it.x, it.y, it.z, 4); if (!isHost) return; grandpa.noise(D.hit[1] * clamp(speed / 9, 0.3, 1.6) + D.w, it.x, it.z); if (D.fragile && speed > D.fragile) { G.stats.broken++; grandpa.noise(22, it.x, it.z); items.remove(it.id); ev({ k: 'gone', id: it.id, why: 'break', x: it.x, y: it.y, z: it.z }); } };
    hostWire(); wireMenus(); show('loading', false); show('menu');
    let last = performance.now();
    const loop = now => { requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; frame(dt); input.endFrame(); };
    requestAnimationFrame(loop);
    // for testing
    window.__dwg = { G, SET, me, players, get player() { return player; }, get house() { return house; }, get grandpa() { return grandpa; }, get items() { return items; }, get sound() { return sound; }, get input() { return input; }, get voice() { return voice; }, get net() { return net; }, camera, renderer, scene, act, ev, noise, startNight, endNight, solo, host, addPlayer, flatten,
      step(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) { frame(dt); input.endFrame(); } }, tp(x, z, y) { player.pos.set(x, y ?? house.standAt(x, z, 99) + 0.1, z); player.vel.set(0, 0, 0); }, look(yaw, pitch = 0) { me.lookYaw = yaw; me.lookPitch = pitch; } };
  } catch (e) { console.error(e); $('loadtext').textContent = 'Something broke: ' + (e.message || e); }
})();
