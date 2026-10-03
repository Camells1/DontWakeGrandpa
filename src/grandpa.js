// Grandpa. Forty units of dressing gown, moustache and nightcap, asleep in his armchair.
// The host runs his brain: a noise meter that everything in the house feeds, and when it fills he gets up,
// stomps around the room and flattens beans with a slipper. Everyone animates him the same way:
// snoring with a fluttering moustache, stirring with one eye open, lurching awake, stomping, winding up
// and slamming the slipper, going flying on a banana peel, shaking his fist, yawning and dozing off again.
import * as THREE from 'three';
import { CHAIR, NOISE } from './config.js';
import { toon } from './materials.js';
import { addOutline, GooglyEye } from './toon.js';
import { clamp, lerp, angDiff } from './util.js';

const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
const ballG = (r, s = 18) => new THREE.SphereGeometry(r, s, Math.max(10, s - 4)), capG = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
const SIT = [CHAIR.x, CHAIR.z + 1.5], REACH = 17, SWAT_R = 4.8, WIND = 0.95;
const _f = new THREE.Vector3(), _l = new THREE.Vector3();

export class Grandpa {
  constructor(scene, house) {
    this.house = house; this.scene = scene;
    const robe = toon(0x7a5fb5), trim = toon(0xffc93c), skin = toon(0xffcfa8), white = toon(0xf4f4f0), dark = toon(0x1b1b24), pj = toon(0x8fc4ee), red = toon(0xe5484d), pink = toon(0xff9aa8);
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    this.torso = new THREE.Group(); this.body.add(this.torso);
    const tg = new THREE.CapsuleGeometry(7.5, 9, 12, 24); { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 12; p.setZ(i, p.getZ(i) + 1.6 * (1 - y * y) - 0.5 + (p.getZ(i) > 0 && y < 0.2 ? 1.2 * (1 - Math.abs(y + 0.3)) : 0)); } tg.computeVertexNormals(); }
    this.belly = mesh(tg, robe, this.torso, 0, 12, 0);
    mesh(new THREE.TorusGeometry(7.9, 0.7, 8, 28), trim, this.torso, 0, 8.4, 1).rotation.x = Math.PI / 2 - 0.08;                      // the cord round his middle
    mesh(new THREE.CapsuleGeometry(1.4, 12, 6, 12), white, this.torso, 0, 16, 7.2).userData.noOutline = true;                        // vest showing down the front
    mesh(ballG(1.1, 10), trim, this.torso, 0, 8.3, 8.9);                                                                                   // and the knot in it
    // ---- head
    this.head = new THREE.Group(); this.head.position.set(0, 26.5, 1.2); this.torso.add(this.head);
    mesh(ballG(6.4, 22), skin, this.head).scale.set(1, 0.95, 0.96);
    mesh(ballG(1.5, 12), pink, this.head, 0, -0.6, 6.3);                                                                              // nose
    for (const s of [-1, 1]) mesh(ballG(1.5, 10), skin, this.head, s * 6.2, -0.2, 0).scale.set(0.5, 1, 0.8);                       // ears
    this.aid = new THREE.Group(); this.aid.position.set(6.9, 0.2, 0.6); this.head.add(this.aid); mesh(ballG(0.6, 8), toon(0xd9c59a), this.aid);                                                         // the hearing aid (until somebody pinches it)
    this.eyes = []; this.lids = [];
    for (const s of [-1, 1]) {
      const e = new GooglyEye(1.55, s > 0 ? 1.1 : 0.96); e.group.position.set(s * 2.5, 1.5, 5.3); this.head.add(e.group); this.eyes.push(e);
      const lid = mesh(new THREE.SphereGeometry(1.86, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin, this.head, s * 2.5, 1.5, 5.3); lid.userData.noOutline = true; this.lids.push(lid);
    }
    this.brows = []; for (const s of [-1, 1]) { const b = mesh(capG(0.5, 2.3), white, this.head, s * 2.6, 3.9, 5.5); b.rotation.z = Math.PI / 2 + s * 0.2; b.userData.noOutline = true; this.brows.push(b); }
    this.mouth = mesh(ballG(1.5, 12), dark, this.head, 0, -3.3, 5.3); this.mouth.scale.set(1.2, 0.3, 0.6); this.mouth.userData.noOutline = true;
    this.tash = []; for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(s * 0.5, -2.1, 6); this.head.add(g); mesh(capG(0.85, 2.6), white, g, s * 1.9, -0.5, 0).rotation.z = Math.PI / 2 - s * 0.45; this.tash.push(g); }
    // nightcap: a stripy cone that flops over with a bobble on the end
    this.cap = new THREE.Group(); this.cap.position.set(0, 4.2, -0.6); this.head.add(this.cap);
    mesh(new THREE.TorusGeometry(5.4, 0.9, 8, 22), white, this.cap, 0, 0, 0).rotation.x = Math.PI / 2;
    mesh(new THREE.ConeGeometry(5.3, 6, 18, 1, true), red, this.cap, 0, 3, 0); this.capTip = new THREE.Group(); this.capTip.position.set(0, 5.2, 0); this.cap.add(this.capTip);
    mesh(new THREE.ConeGeometry(2.4, 6, 12), red, this.capTip, 0, 2.6, 0); this.bobble = mesh(ballG(1.5, 10), white, this.capTip, 0, 6, 0);
    // ---- arms and legs
    this.arms = []; this.legs = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(s * 8.2, 20.5, 0.5); this.torso.add(a);
      mesh(capG(2.3, 7.5), robe, a, 0, -5, 0); mesh(new THREE.TorusGeometry(2.4, 0.5, 6, 14), trim, a, 0, -9.6, 0).rotation.x = Math.PI / 2; mesh(ballG(2.9, 12), skin, a, 0, -11.6, 0);
      this.arms.push({ g: a, side: s, x: 0, z: 0 });
      const l = new THREE.Group(); l.position.set(s * 3.6, 1.2, 0); this.body.add(l);
      mesh(capG(2.5, 4.4), pj, l, 0, -4, 0); mesh(ballG(3, 12), red, l, 0, -8, 1.6).scale.set(1, 0.55, 1.75);
      this.legs.push({ g: l, side: s });
    }
    this.slipper = new THREE.Group(); this.slipper.position.set(0, -14.5, 2); this.arms[1].g.add(this.slipper); mesh(ballG(3.6, 14), red, this.slipper).scale.set(1, 0.4, 2.1); mesh(ballG(2.4, 10), toon(0xf5e8c6), this.slipper, 0, 0.5, -0.8).scale.set(1, 0.4, 1.5);
    addOutline(this.root, 0.0026); scene.add(this.root);
    // the slipper's shadow: get out from under it
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(SWAT_R, 28), new THREE.MeshBasicMaterial({ color: 0x12060a, transparent: true, opacity: 0.6, depthWrite: false })); this.shadow.rotation.x = -Math.PI / 2; this.shadow.visible = false; this.shadow.renderOrder = 3; scene.add(this.shadow);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(SWAT_R - 0.35, SWAT_R, 28), new THREE.MeshBasicMaterial({ color: 0xff3050, transparent: true, opacity: 0.9, depthWrite: false })); this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; this.ring.renderOrder = 3; scene.add(this.ring);
    this.onStep = null; this.onEvent = null;   // (x, z) each time a foot comes down; (kind, data) for the host's decisions
    this.reset(1, 0);
  }
  reset(hearing = 1, tea = 0) {
    Object.assign(this, { state: 'sleep', t: 0, x: SIT[0], z: SIT[1], yaw: 0, meter: 8, hearing, tea, aidGone: false, wakes: 0, awakeLeft: 0, at: 'S', path: [], target: null, noiseAt: null, swat: null, swatCd: 0, wander: 0, moving: false, grace: 0,
      vx: SIT[0], vz: SIT[1], vyaw: 0, tt: Math.random() * 9, phase: 0, sit: 1, lid: [1, 1], mouthK: 0, lean: 0, scratch: 8, stepSide: 0, fall: 0, bend: 0, said: 0 });
    this.aid.visible = true; this.house.chairBlock.off = false; this.shadow.visible = this.ring.visible = false;
  }
  get asleep() { return this.state === 'sleep' || this.state === 'stir'; }
  get up() { return this.state === 'hunt' || this.state === 'swat' || this.state === 'return' || this.state === 'slip' || this.state === 'waking'; }

  // ---------------------------------------------------------------- the host's side
  // Something made a noise at (x, z). amount: a footstep is about 1, a dropped frying pan about 25.
  noise(amount, x, z) {
    if (amount <= 0) return;
    const d = Math.hypot(x - this.x, z - this.z), k = clamp(1.35 - d / 125, 0.3, 1.35) * this.hearing * (this.aidGone ? 0.7 : 1);
    if (this.asleep) { if (this.grace <= 0) this.meter = Math.min(NOISE.wake + 5, this.meter + amount * k); if (amount > 2) this.noiseAt = { x, z }; }
    else if (this.state === 'hunt' && amount * k > 2.5) { this.noiseAt = { x, z }; }
  }
  // ctx: { players: [{ id, x, y, z, vx, vz, speed, light, flat, covered, den }], peels: [{ x, z, id }] }
  think(dt, ctx) {
    this.t += dt; this.swatCd -= dt; this.grace -= dt; const ev = (k, d) => this.onEvent?.(k, d || {});
    if (this.asleep) {
      this.meter = Math.max(0, this.meter - (this.state === 'stir' ? NOISE.decayStir : NOISE.decay) * (1 + this.tea * 0.3) * dt);
      const st = this.meter >= NOISE.stir ? 'stir' : 'sleep';
      if (st !== this.state) { this.state = st; this.t = 0; if (st === 'stir') ev('mumble'); }
      if (this.state === 'stir' && this.t > 5) { this.t = 0; ev('mumble'); }
      if (this.meter >= NOISE.wake) { this.state = 'waking'; this.t = 0; this.wakes++; this.awakeLeft = NOISE.awake - this.tea * 4 + Math.min(8, this.wakes * 2); this.target = null; this.at = 'S'; this.path = []; ev('wake'); }
      return;
    }
    const N = this.house.nodes;
    if (this.state === 'waking') { if (this.t > 2.3) { this.state = 'hunt'; this.t = 0; this.house.chairBlock.off = true; } return; }
    if (this.state === 'slip') { if (this.t > 5.5) { this.state = 'hunt'; this.t = 0; this.awakeLeft = Math.min(NOISE.awakeMax, this.awakeLeft + 5); } return; }
    if (this.state === 'sitting') { if (this.t > 1.8) { this.state = 'sleep'; this.t = 0; this.meter = 22; this.grace = 4; this.house.chairBlock.off = false; ev('asleep'); } return; }
    if (this.state === 'swat') {
      const s = this.swat;
      if (!s.done && this.t >= WIND) { s.done = true; const hit = ctx.players.filter(p => !p.flat && !p.den && Math.hypot(p.x - s.x, p.z - s.z) < SWAT_R && !this.house.covered(p.x, p.y, p.z)).map(p => p.id); ev('slam', { x: s.x, z: s.z, hit }); }
      if (this.t >= WIND + 0.75) { this.state = 'hunt'; this.t = 0; this.swatCd = 0.9; }
      return;
    }
    // ---- on his feet: who can he see?
    let seen = null, sd = 1e9;
    for (const p of ctx.players) {
      if (p.flat || p.den || this.house.covered(p.x, p.y, p.z)) continue;
      const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz), front = Math.abs(angDiff(Math.atan2(dx, dz), this.yaw)) < 1.3;
      if (d < 78 && (front || d < 16) && (p.speed > 0.6 || d < 42 || p.light) && d < sd) { sd = d; seen = p; }
    }
    if (this.state === 'hunt') {
      this.awakeLeft -= dt * (seen ? 0.35 : 1);
      if (seen) { this.target = { x: seen.x, z: seen.z, id: seen.id }; this.noiseAt = null; }
      else if (this.target && (this.target.age = (this.target.age || 0) + dt) > 3) this.target = null;
      if (this.awakeLeft <= 0 && !seen) { this.state = 'return'; this.t = 0; this.target = null; this.path = this.house.route(this.at, 'S'); ev('giveup'); return; }
      // a banana peel under a giant foot
      for (const pl of ctx.peels) if (this.moving && Math.hypot(pl.x - this.x, pl.z - this.z) < 5.5) { this.state = 'slip'; this.t = 0; ev('slip', { id: pl.id, x: pl.x, z: pl.z }); return; }
      if (seen && sd < REACH && this.swatCd <= 0) { // wind up over wherever the bean is heading
        this.state = 'swat'; this.t = 0; this.swat = { x: seen.x + (seen.vx || 0) * 0.3, z: seen.z + (seen.vz || 0) * 0.3, done: false }; this.yaw = Math.atan2(this.swat.x - this.x, this.swat.z - this.z); this.moving = false; ev('windup', { x: this.swat.x, z: this.swat.z }); return;
      }
      const goal = this.target || this.noiseAt;
      if (goal) { const dest = this.house.nearestNode(goal.x, goal.z); if (this.path.at(-1) !== dest) this.path = this.house.route(this.at, dest); }
      else if ((this.wander -= dt) <= 0 || !this.path.length) { this.wander = 5; const keys = Object.keys(N); this.path = this.house.route(this.at, keys[Math.floor(Math.random() * keys.length)]); }
    }
    // ---- walk the route, one standing place at a time
    this.moving = false;
    if (this.path.length) {
      const [nx, nz] = N[this.path[0]], dx = nx - this.x, dz = nz - this.z, d = Math.hypot(dx, dz), sp = this.state === 'return' ? 8 : 11.5;
      if (d < 0.8) { this.at = this.path.shift(); if (!this.path.length && this.noiseAt && !this.target) this.noiseAt = null; }
      else { const want = Math.atan2(dx, dz); this.yaw += angDiff(want, this.yaw) * Math.min(1, dt * 5); const k = Math.max(0.2, Math.cos(angDiff(want, this.yaw))); this.x += dx / d * Math.min(d, sp * k * dt); this.z += dz / d * Math.min(d, sp * k * dt); this.moving = true; }
    } else if (this.state === 'return') { this.yaw += angDiff(0, this.yaw) * Math.min(1, dt * 4); if (Math.abs(angDiff(0, this.yaw)) < 0.1) { this.state = 'sitting'; this.t = 0; } }
    else { const g = this.target || this.noiseAt; this.yaw += g ? angDiff(Math.atan2(g.x - this.x, g.z - this.z), this.yaw) * Math.min(1, dt * 4) : Math.sin(this.tt * 1.3) * dt * 1.2; if (this.target && !seen && (this.said -= dt) <= 0) { this.said = 4; ev('miss'); } }
  }
  snapshot() { const s = this.swat; return [this.state, +this.x.toFixed(1), +this.z.toFixed(1), +this.yaw.toFixed(2), Math.round(this.meter), +this.t.toFixed(2), s ? +s.x.toFixed(1) : 0, s ? +s.z.toFixed(1) : 0, this.moving ? 1 : 0, this.aidGone ? 1 : 0]; }
  apply(a) { const st = a[0]; if (st !== this.state) { this.state = st; } this.x = a[1]; this.z = a[2]; this.yaw = a[3]; this.meter = a[4]; if (Math.abs(this.t - a[5]) > 0.3) this.t = a[5]; this.swat = st === 'swat' ? { x: a[6], z: a[7] } : null; this.moving = !!a[8]; this.aidGone = !!a[9]; }

  // ---------------------------------------------------------------- what everyone sees
  // look: [{x, y, z}] beans he might glare at. Returns nothing; calls onStep when a foot lands.
  update(dt, look) {
    this.tt += dt; if (!this.onEvent) this.t += dt;   // guests keep their own clock between snapshots
    const tt = this.tt, st = this.state, t = this.t, k = Math.min(1, dt * 8);
    const sitting = st === 'sleep' || st === 'stir' || (st === 'sitting' && t > 0.2) || (st === 'waking' && t < 1.0);
    // where he is: in the chair, or wherever his feet have taken him
    let px = this.x, pz = this.z;
    if (st === 'waking') { const u = clamp((t - 1.0) / 1.2, 0, 1), [sx, sz] = this.house.nodes.S; px = lerp(SIT[0], sx, u); pz = lerp(SIT[1], sz, u); }
    else if (st === 'sitting') { const u = clamp(t / 1.2, 0, 1), [sx, sz] = this.house.nodes.S; px = lerp(sx, SIT[0], u); pz = lerp(sz, SIT[1], u); }
    else if (sitting) { px = SIT[0]; pz = SIT[1]; }
    this.vx += (px - this.vx) * Math.min(1, dt * 12); this.vz += (pz - this.vz) * Math.min(1, dt * 12); this.vyaw += angDiff(sitting ? 0 : this.yaw, this.vyaw) * Math.min(1, dt * 9);
    this.sit += ((sitting ? 1 : 0) - this.sit) * Math.min(1, dt * 5);
    const walking = this.moving && !sitting && st !== 'swat' && st !== 'slip';
    if (walking) { const before = Math.floor(this.phase / Math.PI); this.phase += dt * 5.2; if (Math.floor(this.phase / Math.PI) !== before) this.onStep?.(this.vx, this.vz); }
    const ph = this.phase, bob = walking ? Math.abs(Math.sin(ph)) * 1.2 : 0;
    this.fall += ((st === 'slip' ? (t < 3.6 ? 1 : 0.35) : 0) - this.fall) * Math.min(1, dt * (st === 'slip' && t < 0.5 ? 14 : 4));
    const swatK = st === 'swat' ? (t < WIND ? -t / WIND : Math.min(1, (t - WIND) / 0.12) * (1 - clamp((t - WIND - 0.3) / 0.45, 0, 1))) : 0;   // -1 wound up .. +1 slammed
    this.bend += ((swatK > 0 ? swatK * 1.0 : swatK * 0.25) - this.bend) * Math.min(1, dt * 22);
    this.root.position.set(this.vx, 0, this.vz); this.root.rotation.y = this.vyaw;
    this.body.position.set(0, lerp(9.2 + bob, 9.8, this.sit) - this.fall * 5.5, -this.fall * 4); this.body.rotation.x = -this.sit * 0.26 - this.fall * 1.45;
    this.body.rotation.z = walking ? Math.sin(ph) * 0.07 : 0;
    // breathing: big slow snores asleep, quick angry puffs awake
    const br = Math.sin(tt * (this.asleep ? 1.5 : 4)), inhale = Math.max(0, br), s = 1 + br * (this.asleep ? 0.045 : 0.015); this.belly.scale.set(1 + (s - 1) * 0.6, 1, s);
    this.torso.rotation.x = this.bend + (st === 'waking' ? Math.sin(clamp(t / 0.9, 0, 1) * Math.PI) * 0.5 : 0) + (st === 'stir' ? 0.06 : 0);
    // ---- face
    const want = { lidL: 1, lidR: 1, mouth: 0, brow: 0, headZ: 0, headX: 0, headY: 0 };
    if (st === 'sleep') { want.mouth = 0.25 + inhale * 0.75; want.headZ = 0.32 + Math.sin(tt * 0.5) * 0.04; want.headX = 0.2; }
    else if (st === 'stir') { want.lidL = 0.45 + Math.sin(tt * 3) * 0.15; want.lidR = 0.9; want.mouth = 0.2 + Math.abs(Math.sin(tt * 7)) * 0.35; want.brow = -0.4; want.headZ = 0.08; want.headY = Math.sin(tt * 1.1) * 0.5; want.headX = -0.05; }
    else if (st === 'sitting') { want.lidL = want.lidR = clamp(t / 1.5, 0, 1); want.mouth = Math.sin(clamp(t / 1.6, 0, 1) * Math.PI); want.headX = -0.3 * Math.sin(clamp(t / 1.6, 0, 1) * Math.PI); }   // one last yawn
    else { want.lidL = want.lidR = 0; want.brow = -0.75; want.mouth = st === 'waking' || st === 'slip' ? 1 : st === 'swat' ? 0.9 : 0.25 + Math.abs(Math.sin(tt * 5)) * 0.25; want.headY = !this.target && st === 'hunt' ? Math.sin(tt * 1.5) * 0.7 : 0; want.headX = st === 'hunt' || st === 'swat' ? 0.3 : 0; }
    if (st === 'slip' && t > 3.6) { want.lidL = want.lidR = 0.5; want.headZ = Math.sin(tt * 4) * 0.3; want.mouth = 0.4; }
    this.lid[0] += (want.lidL - this.lid[0]) * Math.min(1, dt * 14); this.lid[1] += (want.lidR - this.lid[1]) * Math.min(1, dt * 14);
    this.lids.forEach((l, i) => { l.rotation.x = lerp(-1.25, 1.4, this.lid[i]); });
    this.mouthK += (want.mouth - this.mouthK) * Math.min(1, dt * 12); this.mouth.scale.set(1.2 + this.mouthK * 0.3, 0.3 + this.mouthK * 1.1, 0.6);
    this.brows.forEach((b, i) => { b.rotation.z = Math.PI / 2 + (i ? 1 : -1) * (0.2 - want.brow * 0.6); b.position.y = 3.9 + want.brow * 0.5; });
    const flutter = this.asleep && br < 0 ? Math.sin(tt * 34) * 0.35 * -br : 0;                           // the moustache flaps on every breath out
    this.tash.forEach((g, i) => { g.rotation.z = (i ? 1 : -1) * (flutter + (this.up ? Math.sin(tt * 9) * 0.08 : 0)); g.rotation.x = -flutter * 0.4; });
    this.head.rotation.z += (want.headZ - this.head.rotation.z) * k; this.head.rotation.x += (want.headX - this.head.rotation.x) * k; this.head.rotation.y += (want.headY - this.head.rotation.y) * k;
    this.capTip.rotation.z = -1.25 + Math.sin(tt * 1.5) * 0.08 - (walking ? Math.sin(ph) * 0.3 : 0) + this.head.rotation.z; this.bobble.position.x = Math.sin(tt * 2.2 + (walking ? ph : 0)) * 0.4;
    this.aid.visible = !this.aidGone;
    // ---- arms: resting on the chair, scratching his belly, swinging as he stomps, or winding up the slipper
    this.scratch -= dt; const scr = this.asleep && this.scratch < 2 ? Math.sin(clamp((2 - this.scratch) / 2, 0, 1) * Math.PI) : 0; if (this.scratch < 0) this.scratch = 9 + Math.random() * 8;
    for (const a of this.arms) {
      let x = 0, z = a.side * 0.12;
      if (sitting) { x = -0.28; z = a.side * 0.3; if (a.side < 0 && scr) { x = -1.2 * scr - 0.28 * (1 - scr); z = a.side * (0.3 - 0.85 * scr) + Math.sin(tt * 13) * 0.12 * scr; } if (st === 'waking') { x = -2.6 + Math.sin(tt * 26) * 0.2; z = a.side * 0.5; } if (st === 'sitting') { const y = Math.sin(clamp(t / 1.6, 0, 1) * Math.PI); x = -0.28 - 2.4 * y; z = a.side * (0.3 + 0.7 * y); } }
      else if (st === 'slip') { x = -1.6 + Math.sin(tt * 17 + a.side) * (t < 3.6 ? 1.3 : 0.2); z = a.side * 1.1; }
      else if (st === 'swat' && a.side > 0) { x = swatK < 0 ? 2.95 * swatK : -2.95 + 3.6 * swatK + 2.95; z = 0.1; x = swatK < 0 ? 2.95 * swatK : lerp(-2.95, 0.45, swatK); }
      else if (walking) { x = Math.sin(ph + (a.side > 0 ? 0 : Math.PI)) * 0.55 + (a.side > 0 ? -0.6 : 0); z = a.side * 0.2; }
      else if (st === 'hunt' && this.target) { x = a.side > 0 ? -2.5 + Math.sin(tt * 14) * 0.3 : -0.2; z = a.side * 0.3; }       // shaking the slipper at you
      else if (st === 'waking') { x = -2.6 + Math.sin(tt * 26) * 0.2; z = a.side * 0.5; }
      a.x += (x - a.x) * Math.min(1, dt * (st === 'swat' ? 26 : 9)); a.z += (z - a.z) * Math.min(1, dt * 9); a.g.rotation.set(a.x, 0, a.z);
    }
    this.slipper.visible = this.up && st !== 'waking';
    for (const l of this.legs) { const sw = walking ? Math.sin(ph + (l.side > 0 ? 0 : Math.PI)) : 0; l.g.rotation.x = -this.sit * 1.36 + sw * 0.62 + (st === 'slip' ? -1.2 + Math.sin(tt * 15 + l.side * 2) * (t < 3.6 ? 0.6 : 0.1) : 0); l.g.position.y = 1.2 + Math.max(0, -sw) * 0.0; }
    // ---- eyes follow the nearest bean when he's up
    _f.set(Math.sin(this.vyaw), 0, Math.cos(this.vyaw)); let dir = _f;
    if (this.up && look?.length) { let best = null, bd = 1e9; for (const p of look) { const d = Math.hypot(p.x - this.vx, p.z - this.vz); if (d < bd) { bd = d; best = p; } } if (best) dir = _l.set(best.x - this.vx, best.y - 30, best.z - this.vz).normalize(); }
    for (const e of this.eyes) e.update(dt, dir, _f, { angry: this.up ? 0.3 : 0, out: st === 'slip' && t > 0.4, shake: walking ? 1.5 : 0 });
    // ---- the shadow of the slipper, shrinking as it comes down
    const sw = st === 'swat' && this.swat && t < WIND + 0.25; this.shadow.visible = this.ring.visible = !!sw;
    if (sw) { const u = clamp(t / WIND, 0, 1), y = this.house.standAt(this.swat.x, this.swat.z, 40) + 0.12; this.shadow.position.set(this.swat.x, y, this.swat.z); this.ring.position.set(this.swat.x, y + 0.02, this.swat.z); this.shadow.scale.setScalar(0.35 + u * 0.65); this.shadow.material.opacity = 0.25 + u * 0.5; this.ring.material.opacity = 0.5 + Math.sin(tt * 30) * 0.4; }
  }
  // Where the "Zzz" should float up from, and where his voice comes from
  get mouthPos() { return { x: this.vx + Math.sin(this.vyaw) * 6, y: this.sit > 0.5 ? 31 : 35, z: this.vz + Math.cos(this.vyaw) * 6 }; }
}
export const GRANDPA = { REACH, SWAT_R, WIND };
