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
const SIT = [CHAIR.x, CHAIR.z + 1.5], REACH = 17, SWAT_R = 4.8, WIND = 0.95, STAND = 11, SEAT = 12.2;   // STAND: how high his hips are on his feet. SEAT: in the chair.
const _f = new THREE.Vector3(), _l = new THREE.Vector3();
// A smooth outline through [height, radius] points. Returns radius(height); .tab is the outline itself, bottom to top.
const profile = pts => { const tab = new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[1], p[0]))).getPoints(pts.length * 8).map(p => [p.y, Math.max(0, p.x)]); tab[0][1] = 0; tab[tab.length - 1][1] = 0;
  const R = y => { for (let i = tab.length - 1; i > 0; i--) if (y >= tab[i - 1][0]) { const a = tab[i - 1], b = tab[i]; return b[0] - a[0] < 1e-6 ? b[1] : lerp(a[1], b[1], clamp((y - a[0]) / (b[0] - a[0]), 0, 1)); } return 0; };
  R.tab = tab; return R; };
// A closed solid turned from a profile, every face painted its own colour: colour(height, angle) -> hex (angle 0 is the front). push(height, angle) moves it in z.
const solid = (R, colour, push, seg = 48) => {
  const tab = R.tab, n = tab.length, pos = [], idx = [], ang = j => -Math.PI + j / seg * Math.PI * 2;
  for (let i = 0; i < n; i++) for (let j = 0; j < seg; j++) { const a = ang(j), [y, r] = tab[i]; pos.push(Math.sin(a) * r, y, Math.cos(a) * r + (push ? push(y, a) : 0)); }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, d, a, d, c); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g = g.toNonIndexed();
  const count = g.attributes.position.count, col = new Float32Array(count * 3), c = new THREE.Color();
  for (let v = 0; v < count; v++) { const cell = Math.floor(v / 6), i = Math.floor(cell / seg), j = cell % seg; c.set(colour((tab[i][0] + tab[i + 1][0]) / 2, ang(j + 0.5))); col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; };
// Pyjama stripes down a leg: ten of them, two colours.
const striped = (geo, ca, cb) => { const g = geo.toNonIndexed(), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let f = 0; f < p.count; f += 3) { const x = p.getX(f) + p.getX(f + 1) + p.getX(f + 2), z = p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2); c.set(Math.floor((Math.atan2(x, z) + Math.PI) / (Math.PI / 5)) % 2 ? ca : cb); for (let v = f; v < f + 3; v++) { col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; } }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; };

export class Grandpa {
  constructor(scene, house) {
    this.house = house; this.scene = scene;
    const robeC = 0x7a5fb5, robe = toon(robeC), robeD = toon(0x5a4396), trim = toon(0xffc93c), skin = toon(0xffcfa8), skinD = toon(0xeeae8c), white = toon(0xf4f4f0), dark = toon(0x1b1b24), red = toon(0xe5484d), pink = toon(0xff9aa8), fluff = toon(0xff9fc0), cream = toon(0xfff3dc), sole = toon(0x70482f), paint = toon(0xffffff, { vertexColors: true });
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    // ---- hips: the skirt of the dressing gown is one closed lump, so there is never a hole to look up into
    this.skirt = new THREE.Group(); this.skirt.position.set(0, 2, 0); this.body.add(this.skirt);
    const hipR = profile([[-5.4, 0], [-5.4, 7.6], [-4.9, 9.4], [-4.1, 9.5], [-1.5, 9.2], [1, 8.8], [3.5, 8.0], [5.4, 6.3], [6.6, 3.4], [7, 0]]);
    mesh(solid(hipR, () => robeC), paint, this.skirt);
    mesh(new THREE.TorusGeometry(9.45, 0.6, 8, 32), trim, this.skirt, 0, -4.6, 0).rotation.x = Math.PI / 2;                             // gold braid round the hem
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([4, 2, 0, -2, -4].map(y => { const x = 1.6 + (4 - y) * 0.12; return new THREE.Vector3(x, y, Math.sqrt(Math.max(0, (hipR(y) + 0.1) ** 2 - x * x))); }), false), 10, 0.32, 6), robeD, this.skirt).userData.noOutline = true;   // where the gown wraps over
    // ---- torso: pot belly out the front, a stoop at the back, stripy pyjamas showing in the V of the collar
    this.torso = new THREE.Group(); this.body.add(this.torso);
    const robeR = profile([[-2.6, 0], [-2.2, 5.6], [0.5, 8.2], [5, 9.0], [10, 8.6], [15, 7.6], [19, 7.0], [21.6, 6.5], [23.6, 5.0], [24.7, 2.8], [25.1, 0]]);
    const bulge = (y, a) => { const f = Math.cos(a); return (Math.max(0, f) ** 1.5 * 2.6 * Math.exp(-(((y - 6.5) / 5.5) ** 2)) - Math.max(0, -f) * 1.3 * Math.exp(-(((y - 19) / 4) ** 2))) * Math.min(1, robeR(y) / 3); };
    const robeAt = (y, a, off = 0) => { const r = robeR(y) + off; return new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r + bulge(y, a)); };   // a = 0 is his front
    const lap = y => lerp(0.07, 0.6, clamp((y - 9) / 14.4, 0, 1) ** 1.3);                                                             // how wide the V is at this height
    const pjA = 0x8fc4ee, pjB = 0xf4f4f0, stripe = a => (Math.floor((a + Math.PI) / (Math.PI / 24)) % 2 ? pjA : pjB);
    this.belly = mesh(solid(robeR, (y, a) => (y > 9 && y < 24 && Math.abs(a) < lap(y) ? stripe(a) : robeC), bulge), paint, this.torso);
    const tube = (pts, r, mat, closed = false, seg = 28) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg, r, 8, closed), mat, this.belly);
    for (const s of [-1, 1]) tube(Array.from({ length: 9 }, (_, i) => { const y = 9.2 + i * 1.8; return robeAt(y, s * lap(y), 0.2); }), 0.8, robeD);   // the lapels
    tube(Array.from({ length: 20 }, (_, i) => robeAt(8.6, i / 20 * Math.PI * 2, 0.15)), 0.7, trim, true, 48);                              // the cord round his middle
    { const k = robeAt(8.6, 0, 0.9); mesh(ballG(1.25, 12), trim, this.belly, k.x, k.y, k.z); }                                             // and the knot in it
    for (const y of [12.5, 16, 19.5]) { const b = robeAt(y, 0, 0.12); mesh(ballG(0.5, 8), white, this.belly, b.x, b.y, b.z).userData.noOutline = true; }   // pyjama buttons
    mesh(new THREE.TorusGeometry(4.5, 1.05, 8, 22), robeD, this.torso, 0, 23.1, 0.3).rotation.x = Math.PI / 2 + 0.2;                    // collar
    // ---- head
    this.head = new THREE.Group(); this.head.position.set(0, 27.2, 1.6); this.torso.add(this.head);
    mesh(ballG(6.4, 24), skin, this.head).scale.set(1, 0.95, 0.96);
    for (const s of [-1, 1]) mesh(ballG(2.5, 14), skin, this.head, s * 3.9, -2.7, 3.3).scale.set(1, 0.9, 0.9);                         // cheeks
    this.chin = mesh(ballG(2.4, 14), skin, this.head, 0, -4.9, 3); this.chin.scale.set(1.3, 0.8, 1);                                                          // chin
    mesh(ballG(1.9, 14), pink, this.head, 0, -0.5, 6.5).scale.set(1.1, 0.95, 1);                                                       // a nose like a radish
    for (const s of [-1, 1]) {
      mesh(ballG(1.9, 12), skin, this.head, s * 6.3, -0.2, -0.2).scale.set(0.45, 1, 0.75); { const ie = mesh(ballG(1.1, 8), skinD, this.head, s * 6.65, -0.2, 0); ie.scale.set(0.3, 0.8, 0.6); ie.userData.noOutline = true; }
      for (const [y, r] of [[0.5, -1.15], [-0.3, -1.5]]) { const h = mesh(capG(0.2, 1.3), white, this.head, s * 7.2, y, 0.2); h.rotation.z = s * r; h.userData.noOutline = true; }   // ear hair
      for (const [x, y, z, r] of [[5.3, -1.9, -2.4, 1.7], [4.2, -2.7, -4.2, 1.6]]) mesh(ballG(r, 10), white, this.head, s * x, y, z);                                                 // what is left of his hair
    }
    mesh(ballG(1.7, 10), white, this.head, 0, -2.9, -5.4);
    this.aid = new THREE.Group(); this.aid.position.set(6.9, 1.5, 0.9); this.head.add(this.aid); mesh(ballG(0.65, 8), toon(0xd9c59a), this.aid);                                         // the hearing aid (until somebody pinches it)
    this.eyes = []; this.lids = [];
    for (const s of [-1, 1]) {
      const e = new GooglyEye(1.55, s > 0 ? 1.1 : 0.96); e.group.position.set(s * 2.5, 1.5, 5.3); this.head.add(e.group); this.eyes.push(e);
      const lid = mesh(new THREE.SphereGeometry(1.86, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin, this.head, s * 2.5, 1.5, 5.3); lid.userData.noOutline = true; this.lids.push(lid);
    }
    this.brows = []; for (const s of [-1, 1]) { const b = mesh(capG(0.68, 2.5), white, this.head, s * 2.6, 3.9, 5.6); b.rotation.z = Math.PI / 2 + s * 0.2; b.userData.noOutline = true; this.brows.push(b); }
    this.mouth = mesh(ballG(1.5, 12), dark, this.head, 0, -3.4, 5.5); this.mouth.scale.set(1.2, 0.3, 0.6); this.mouth.userData.noOutline = true;
    this.tooth = mesh(new THREE.BoxGeometry(0.8, 1, 0.4), white, this.head, -0.5, -4.4, 6.1); this.tooth.userData.noOutline = true;        // his one remaining tooth
    this.tash = []; for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(s * 0.5, -2.1, 6.2); this.head.add(g); mesh(capG(1.05, 3), white, g, s * 2.1, -0.6, 0).rotation.z = Math.PI / 2 - s * 0.5; mesh(ballG(0.9, 10), white, g, s * 4.3, -1.2, -0.3); mesh(ballG(0.65, 8), white, g, s * 5, -0.5, -0.5); this.tash.push(g); }
    // nightcap: a stripy cone that flops over with a bobble on the end
    this.cap = new THREE.Group(); this.cap.position.set(0, 4.2, -0.6); this.head.add(this.cap);
    mesh(new THREE.TorusGeometry(5.4, 0.9, 8, 22), white, this.cap, 0, 0, 0).rotation.x = Math.PI / 2;
    mesh(new THREE.ConeGeometry(5.3, 6, 18, 1, true), red, this.cap, 0, 3, 0); this.capTip = new THREE.Group(); this.capTip.position.set(0, 5.2, 0); this.cap.add(this.capTip);
    mesh(new THREE.ConeGeometry(2.4, 6, 12), red, this.capTip, 0, 2.6, 0); this.bobble = mesh(ballG(1.5, 10), white, this.capTip, 0, 6, 0);
    // ---- bunny slippers: two on his feet, and a third for flattening beans
    this.ears = [];
    const slipperOf = () => { const g = new THREE.Group();
      mesh(ballG(3, 16), sole, g, 0, -1.8, 1.7).scale.set(1.08, 0.3, 1.85); mesh(ballG(3, 16), fluff, g, 0, -0.5, 1.9).scale.set(1, 0.62, 1.7);
      for (const [x, z, r] of [[0, 1, 1.25], [-1.3, 3.9, 0.55], [0, 4.5, 0.55], [1.3, 3.9, 0.55]]) { const pad = mesh(ballG(r, 8), pink, g, x, -2.62, z); pad.scale.y = 0.22; pad.userData.noOutline = true; }   // paw pads
      mesh(new THREE.TorusGeometry(1.9, 0.62, 8, 16), cream, g, 0, 0.8, 0.2).rotation.x = Math.PI / 2; mesh(ballG(0.85, 8), cream, g, 0, 0.1, -3.1);                       // fluffy lining, and a tail
      for (const s of [-1, 1]) { mesh(ballG(0.38, 8), dark, g, s * 0.95, 0.72, 5.6).userData.noOutline = true; mesh(ballG(0.85, 8), cream, g, s * 0.75, -0.15, 6.3).scale.set(1, 0.75, 0.7);
        const ear = new THREE.Group(); ear.position.set(s * 1.25, 1.05, 3.7); ear.rotation.z = -s * 0.22; g.add(ear); mesh(capG(0.62, 2.4), fluff, ear, 0, 1.7, 0).scale.set(1, 1, 0.55); mesh(capG(0.3, 1.8), cream, ear, 0, 1.7, 0.28).userData.noOutline = true; this.ears.push(ear); }
      mesh(ballG(0.42, 8), pink, g, 0, 0.25, 6.85).userData.noOutline = true; return g; };
    // ---- arms (shoulder, elbow, a proper hand) and legs (hip, knee, slipper)
    this.arms = []; this.legs = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(s * 8.4, 20.4, 0.3); this.torso.add(a);
      mesh(ballG(3.2, 14), robe, a); mesh(capG(2.5, 3.4), robe, a, 0, -3.1, 0);
      const fore = new THREE.Group(); fore.position.set(0, -6.2, 0); a.add(fore); mesh(ballG(2.55, 12), robe, fore); mesh(new THREE.CylinderGeometry(2.3, 3.1, 5.4, 18), robe, fore, 0, -2.9, 0);
      mesh(new THREE.TorusGeometry(3.05, 0.6, 8, 18), trim, fore, 0, -5.5, 0).rotation.x = Math.PI / 2;
      const hand = new THREE.Group(); hand.position.set(0, -6.7, 0); fore.add(hand); mesh(ballG(2.6, 14), skin, hand).scale.set(1, 1.05, 0.82);
      mesh(capG(0.85, 1), skin, hand, -s * 2.3, -0.4, 0.9).rotation.z = -s * 0.9; for (let i = 0; i < 4; i++) mesh(capG(0.72, 1.1), skin, hand, (i - 1.5) * 1.22, -2.3, 0.45).rotation.x = -0.4;
      this.arms.push({ g: a, fore, hand, side: s, x: 0, z: 0, e: 0 });
      const l = new THREE.Group(); l.position.set(s * 3.5, 0, 0); this.body.add(l); mesh(striped(new THREE.CapsuleGeometry(2.6, 4.6, 6, 20), pjA, pjB), paint, l, 0, -2.3, 0);
      const knee = new THREE.Group(); knee.position.set(0, -4.6, 0); l.add(knee); mesh(striped(new THREE.SphereGeometry(2.62, 20, 12), pjA, pjB), paint, knee); mesh(striped(new THREE.CapsuleGeometry(2.35, 1.4, 6, 20), pjA, pjB), paint, knee, 0, -1.5, 0);
      mesh(new THREE.TorusGeometry(2.3, 0.55, 8, 16), white, knee, 0, -3.1, 0).rotation.x = Math.PI / 2; mesh(new THREE.CylinderGeometry(1.5, 1.65, 1.6, 12), skin, knee, 0, -3.8, 0);
      const foot = new THREE.Group(); foot.position.set(0, -4.4, 0); knee.add(foot); foot.add(slipperOf());
      this.legs.push({ g: l, knee, foot, side: s, x: 0, k: 0 });
    }
    this.slipper = new THREE.Group(); this.slipper.position.set(0, -2.6, -0.6); this.slipper.scale.setScalar(1.25); this.arms[1].hand.add(this.slipper); this.slipper.add(slipperOf());
    addOutline(this.root, 0.0026); scene.add(this.root);
    // the slipper's shadow: get out from under it
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(SWAT_R, 28), new THREE.MeshBasicMaterial({ color: 0x12060a, transparent: true, opacity: 0.6, depthWrite: false })); this.shadow.rotation.x = -Math.PI / 2; this.shadow.visible = false; this.shadow.renderOrder = 3; scene.add(this.shadow);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(SWAT_R - 0.35, SWAT_R, 28), new THREE.MeshBasicMaterial({ color: 0xff3050, transparent: true, opacity: 0.9, depthWrite: false })); this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; this.ring.renderOrder = 3; scene.add(this.ring);
    this.onStep = null; this.onEvent = null;   // (x, z) each time a foot comes down; (kind, data) for the host's decisions
    this.reset(1, 0);
  }
  reset(hearing = 1, tea = 0) {
    Object.assign(this, { state: 'sleep', t: 0, x: SIT[0], z: SIT[1], yaw: 0, meter: 8, hearing, tea, aidGone: false, wakes: 0, awakeLeft: 0, way: [], dest: null, replan: 0, target: null, noiseAt: null, swat: null, swatCd: 0, wander: 0, moving: false, grace: 0,
      vx: SIT[0], vz: SIT[1], vyaw: 0, tt: Math.random() * 9, phase: 0, sit: 1, lid: [1, 1], mouthK: 0, lean: 0, scratch: 8, stepSide: 0, fall: 0, bend: 0, said: 0, emo: null, pause: 0, snort: 6, toe: 4 });
    for (const a of this.arms) { a.x = -0.7; a.z = -a.side * 0.3; a.e = -0.3; } for (const l of this.legs) { l.x = -1.22; l.k = 0.1; }
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
      if (this.meter >= NOISE.wake) { this.state = 'waking'; this.t = 0; this.wakes++; this.awakeLeft = NOISE.awake - this.tea * 4 + Math.min(8, this.wakes * 2); this.target = null; this.way = []; this.dest = null; ev('wake'); }
      return;
    }
    const N = this.house.nodes;
    if (this.state === 'waking') { if (this.t > 2.3) { this.state = 'hunt'; this.t = 0; this.house.chairBlock.off = true; [this.x, this.z] = N.S; } return; }   // he has heaved himself out of the chair by now
    if (this.state === 'slip') { if (this.t > 5.5) { this.state = 'hunt'; this.t = 0; this.awakeLeft = Math.min(NOISE.awakeMax, this.awakeLeft + 5); } return; }
    if (this.state === 'sitting') { if (this.t > 1.8) { this.state = 'sleep'; this.t = 0; this.meter = 22; this.grace = 4; this.house.chairBlock.off = false; ev('asleep'); } return; }
    if (this.state === 'swat') {
      const s = this.swat;
      if (!s.done && this.t >= WIND) { s.done = true; const hit = ctx.players.filter(p => !p.flat && !p.den && Math.hypot(p.x - s.x, p.z - s.z) < SWAT_R && !this.house.covered(p.x, p.y, p.z)).map(p => p.id); ev('slam', { x: s.x, z: s.z, hit }); }
      if (this.t >= WIND + 0.75) { this.state = 'hunt'; this.t = 0; this.swatCd = 1.6; this.pause = 1.5; }
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
      if (this.awakeLeft <= 0 && !seen) { this.state = 'return'; this.t = 0; this.target = null; this.goTo(N.S[0], N.S[1]); ev('giveup'); return; }
      // a banana peel under a giant foot
      for (const pl of ctx.peels) if (this.moving && Math.hypot(pl.x - this.x, pl.z - this.z) < 5.5) { this.state = 'slip'; this.t = 0; ev('slip', { id: pl.id, x: pl.x, z: pl.z }); return; }
      if (seen && sd < REACH && this.swatCd <= 0) { // wind up over wherever the bean is heading
        this.state = 'swat'; this.t = 0; this.swat = { x: seen.x + (seen.vx || 0) * 0.3, z: seen.z + (seen.vz || 0) * 0.3, done: false }; this.yaw = Math.atan2(this.swat.x - this.x, this.swat.z - this.z); this.moving = false; ev('windup', { x: this.swat.x, z: this.swat.z }); return;
      }
      const goal = this.target || this.noiseAt;
      if (goal) { // go after it, round the furniture, and stop short rather than stand on it
        if (Math.hypot(goal.x - this.x, goal.z - this.z) < 10) this.way = [];
        else if (!this.dest || Math.hypot(goal.x - this.dest[0], goal.z - this.dest[1]) > 5 || (this.replan -= dt) < 0) { this.replan = 1.5; this.goTo(goal.x, goal.z); } }
      else if ((this.wander -= dt) <= 0 || !this.way.length) { this.wander = 6; const keys = Object.keys(N), n = N[keys[Math.floor(Math.random() * keys.length)]]; this.goTo(n[0], n[1]); }
    }
    // ---- walk the route, one standing place at a time
    this.moving = false; this.pause -= dt;
    if (this.pause > 0) { /* busy shaking his fists */ }
    else if (this.way.length) {
      const [nx, nz] = this.way[0], dx = nx - this.x, dz = nz - this.z, d = Math.hypot(dx, dz), sp = this.state === 'return' ? 8 : 11.5;
      if (d < 0.8) { this.way.shift(); if (!this.way.length && this.noiseAt && !this.target) this.noiseAt = null; }
      else { const want = Math.atan2(dx, dz); this.yaw += angDiff(want, this.yaw) * Math.min(1, dt * 5); const k = Math.max(0.2, Math.cos(angDiff(want, this.yaw))); this.x += dx / d * Math.min(d, sp * k * dt); this.z += dz / d * Math.min(d, sp * k * dt); this.moving = true; }
    } else if (this.state === 'return') { this.yaw += angDiff(0, this.yaw) * Math.min(1, dt * 4); if (Math.abs(angDiff(0, this.yaw)) < 0.1) { this.state = 'sitting'; this.t = 0; } }
    else { const g = this.target || this.noiseAt; this.yaw += g ? angDiff(Math.atan2(g.x - this.x, g.z - this.z), this.yaw) * Math.min(1, dt * 4) : Math.sin(this.tt * 1.3) * dt * 1.2; if (this.target && !seen && (this.said -= dt) <= 0) { this.said = 4; ev('miss'); } }
  }
  // Set off for a spot, round whatever is in the way
  goTo(x, z) { this.dest = [x, z]; this.way = this.house.walkPath(this.x, this.z, x, z); }
  snapshot() { const s = this.swat; return [this.state, +this.x.toFixed(1), +this.z.toFixed(1), +this.yaw.toFixed(2), Math.round(this.meter), +this.t.toFixed(2), s ? +s.x.toFixed(1) : 0, s ? +s.z.toFixed(1) : 0, this.moving ? 1 : 0, this.aidGone ? 1 : 0]; }
  apply(a) { const st = a[0]; if (st !== this.state) { this.state = st; } this.x = a[1]; this.z = a[2]; this.yaw = a[3]; this.meter = a[4]; if (Math.abs(this.t - a[5]) > 0.3) this.t = a[5]; this.swat = st === 'swat' ? { x: a[6], z: a[7] } : null; this.moving = !!a[8]; this.aidGone = !!a[9]; }

  // A little performance on top of whatever he is doing: 'tantrum' (missed), 'laugh' (got one), 'shrug' (gives up), 'fly' (swatting at nothing in his sleep)
  emote(kind) { this.emo = { k: kind, t: 0, d: { tantrum: 1.5, laugh: 1.7, shrug: 1.6, fly: 1.5 }[kind] || 1.4 }; }

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
    const sleepy = st === 'return', walking = this.moving && !sitting && st !== 'swat' && st !== 'slip';
    if (walking) { const before = Math.floor(this.phase / Math.PI); this.phase += dt * (sleepy ? 3.8 : 5.2); if (Math.floor(this.phase / Math.PI) !== before) this.onStep?.(this.vx, this.vz); }
    let em = this.emo, ek = 0; if (em) { em.t += dt; if (em.t >= em.d || (em.k === 'fly') !== sitting || st === 'swat' || st === 'slip') this.emo = em = null; else ek = Math.min(1, em.t * 6, (em.d - em.t) * 5); }
    const E = em ? em.k : '', ph = this.phase, bob = walking ? Math.abs(Math.sin(ph)) * (sleepy ? 0.6 : 1.3) : 0;
    const hop = E === 'tantrum' ? Math.abs(Math.sin(em.t * 10.5)) * 2.4 * ek : E === 'laugh' ? Math.abs(Math.sin(tt * 15)) * 0.5 * ek : 0;
    this.fall += ((st === 'slip' ? (t < 3.6 ? 1 : 0.35) : 0) - this.fall) * Math.min(1, dt * (st === 'slip' && t < 0.5 ? 14 : 4));
    // the slipper: lean back to wind up, then fold forward (and squat, for anything close) so it lands right on the shadow
    const sd = this.swat ? Math.hypot(this.swat.x - this.vx, this.swat.z - this.vz) : 12, bMax = Math.asin(clamp((sd - 3) / 20.4, 0.15, 0.86)), squatMax = clamp(STAND + 20.4 * Math.cos(bMax) - 19.5, 0, 6.5);
    const swatK = st === 'swat' ? (t < WIND ? -t / WIND : Math.min(1, (t - WIND) / 0.12) * (1 - clamp((t - WIND - 0.3) / 0.45, 0, 1))) : 0;   // -1 wound up .. +1 slammed
    this.bend += ((swatK > 0 ? swatK * bMax : swatK * 0.28) - this.bend) * Math.min(1, dt * 22);
    const squat = clamp(this.bend / bMax, 0, 1) * squatMax, q = Math.acos(1 - squat / 9);
    this.root.position.set(this.vx, 0, this.vz); this.root.rotation.y = this.vyaw;
    this.body.position.set(0, lerp(STAND + bob + hop - squat, SEAT, this.sit) - this.fall * 2.4, -this.fall * 4); this.body.rotation.x = -this.sit * 0.26 - this.fall * 1.45;
    this.body.rotation.z = walking ? Math.sin(ph) * (sleepy ? 0.04 : 0.08) : E === 'tantrum' ? Math.sin(em.t * 10.5) * 0.06 * ek : 0;
    // breathing: big slow snores asleep, quick angry puffs awake. Now and then a snort makes him jump.
    const br = Math.sin(tt * (this.asleep ? 1.5 : 4)), inhale = Math.max(0, br), s = 1 + br * (this.asleep ? 0.045 : 0.015) + (E === 'laugh' ? Math.sin(tt * 30) * 0.03 * ek : 0); this.belly.scale.set(1 + (s - 1) * 0.6, 1, s);
    if (st === 'sleep') { if ((this.snort -= dt) < 0) this.snort = 9 + Math.random() * 8; } else this.snort = 6;
    const jolt = st === 'sleep' && this.snort < 0.5 ? Math.sin(this.snort / 0.5 * Math.PI) : 0, search = st === 'hunt' && !this.target && !walking && !E;
    this.torso.rotation.x = this.bend + (st === 'waking' ? Math.sin(clamp(t / 0.9, 0, 1) * Math.PI) * 0.5 : 0) + (st === 'stir' ? 0.06 : 0) + (sleepy ? 0.2 : 0) + (search ? 0.16 : 0) - (E === 'laugh' ? 0.2 * ek : 0) - jolt * 0.06;
    this.torso.rotation.z = E === 'laugh' ? Math.sin(tt * 15) * 0.04 * ek : 0;
    // ---- face
    const want = { lidL: 1, lidR: 1, mouth: 0, brow: 0, headZ: 0, headX: 0, headY: 0 };
    if (st === 'sleep') { want.mouth = 0.25 + inhale * 0.75; want.headZ = 0.32 + Math.sin(tt * 0.5) * 0.04; want.headX = 0.2 - jolt * 0.45; if (jolt) want.mouth = 1; }
    else if (st === 'stir') { want.lidL = 0.45 + Math.sin(tt * 3) * 0.15; want.lidR = 0.9; want.mouth = 0.2 + Math.abs(Math.sin(tt * 7)) * 0.35; want.brow = -0.4; want.headZ = 0.08; want.headY = Math.sin(tt * 1.1) * 0.5; want.headX = -0.05; }
    else if (st === 'sitting') { want.lidL = want.lidR = clamp(t / 1.5, 0, 1); want.mouth = Math.sin(clamp(t / 1.6, 0, 1) * Math.PI); want.headX = -0.3 * Math.sin(clamp(t / 1.6, 0, 1) * Math.PI); }   // one last yawn
    else if (sleepy) { const yawn = Math.max(0, Math.sin(tt * 0.9)) ** 6; want.lidL = want.lidR = 0.55 + yawn * 0.4; want.mouth = yawn; want.headX = 0.25 - yawn * 0.5; want.brow = 0.3; want.headZ = Math.sin(ph) * 0.06; }
    else { want.lidL = want.lidR = 0; want.brow = -0.75; want.mouth = st === 'waking' || st === 'slip' ? 1 : st === 'swat' ? 0.9 : 0.25 + Math.abs(Math.sin(tt * 5)) * 0.25; want.headY = !this.target && st === 'hunt' ? Math.sin(tt * 1.5) * 0.7 : 0; want.headX = st === 'hunt' || st === 'swat' ? 0.3 : 0; }
    if (st === 'slip' && t > 3.6) { want.lidL = want.lidR = 0.5; want.headZ = Math.sin(tt * 4) * 0.3; want.mouth = 0.4; }
    if (E === 'tantrum') { want.headY = Math.sin(tt * 17) * 0.32; want.mouth = 1; want.headX = 0.15; }
    else if (E === 'laugh') { want.lidL = want.lidR = 0.75; want.mouth = 0.75 + Math.sin(tt * 15) * 0.25; want.headX = -0.38; want.brow = 0.6; }
    else if (E === 'shrug') { want.brow = 0.6; want.headZ = 0.22; want.mouth = 0.15; want.headX = 0.05; }
    this.lid[0] += (want.lidL - this.lid[0]) * Math.min(1, dt * 14); this.lid[1] += (want.lidR - this.lid[1]) * Math.min(1, dt * 14);
    this.lids.forEach((l, i) => { l.rotation.x = lerp(-1.25, 1.4, this.lid[i]); });
    this.mouthK += (want.mouth - this.mouthK) * Math.min(1, dt * 12); const my = 0.3 + this.mouthK * 1.1;
    this.mouth.scale.set(1.2 + this.mouthK * 0.3, my, 0.6); this.mouth.position.y = -3.4 - this.mouthK * 0.7; this.chin.position.y = -4.9 - this.mouthK * 1.5;   // his jaw drops when he shouts
    this.tooth.visible = this.mouthK > 0.3; this.tooth.position.y = this.mouth.position.y - my * 1.05;
    this.brows.forEach((b, i) => { b.rotation.z = Math.PI / 2 + (i ? 1 : -1) * (0.2 - want.brow * 0.6); b.position.y = 3.9 + want.brow * 0.5; });
    const flutter = this.asleep && br < 0 ? Math.sin(tt * 34) * 0.35 * -br : 0;                           // the moustache flaps on every breath out
    this.tash.forEach((g, i) => { g.rotation.z = (i ? 1 : -1) * (flutter + (this.up ? Math.sin(tt * 9) * 0.08 : 0)); g.rotation.x = -flutter * 0.4; });
    this.head.rotation.z += (want.headZ - this.head.rotation.z) * k; this.head.rotation.x += (want.headX - this.head.rotation.x) * k; this.head.rotation.y += (want.headY - this.head.rotation.y) * k;
    this.capTip.rotation.z = -1.25 + Math.sin(tt * 1.5) * 0.08 - (walking ? Math.sin(ph) * 0.3 : 0) + this.head.rotation.z - hop * 0.25; this.bobble.position.x = Math.sin(tt * 2.2 + (walking ? ph : 0)) * 0.4;
    this.aid.visible = !this.aidGone;
    // ---- arms: hands folded on his belly, scratching his nose, brandishing the slipper, shading his eyes to look for beans...
    this.scratch -= dt; const scr = this.asleep && this.scratch < 2 ? Math.sin(clamp((2 - this.scratch) / 2, 0, 1) * Math.PI) : 0; if (this.scratch < 0) this.scratch = 9 + Math.random() * 8;
    for (const a of this.arms) {
      const R = a.side > 0, S = a.side; let x = 0.05, z = S * 0.12, e = -0.15, quick = 9;
      if (sitting) { x = -0.7 + br * 0.03; z = -S * 0.3; e = -0.3;
        if (!R && scr) { x = lerp(x, -2.05, scr); z = lerp(z, 0.5, scr); e = lerp(e, -0.35, scr) + Math.sin(tt * 13) * 0.12 * scr; }                      // a good scratch of the nose
        if (st === 'waking') { x = -2.7 + Math.sin(tt * 26) * 0.2; z = S * 0.5; e = -0.3; }
        if (st === 'sitting') { const y = Math.sin(clamp(t / 1.6, 0, 1) * Math.PI); x = lerp(x, -2.7, y); z = lerp(z, S * 0.7, y); e = lerp(e, -0.25, y); }       // a stretch before he drops off
        if (E === 'fly' && R) { x = lerp(x, -2.3 + Math.sin(tt * 9) * 0.25, ek); z = lerp(z, Math.sin(tt * 11) * 0.5, ek); e = lerp(e, -0.7, ek); } }
      else if (st === 'slip') { if (t < 3.6) { x = -1.6 + Math.sin(tt * 17 + S) * 1.3; z = S * 1.1; e = -0.6 + Math.sin(tt * 15 + S) * 0.5; } else if (R) { x = -2.4; z = -0.45; e = -2.0 + Math.sin(tt * 9) * 0.15; } else { x = 0.7; z = S * 0.5; e = -0.2; } }   // then sits up rubbing his head
      else if (st === 'swat') { quick = 26; if (R) { x = swatK < 0 ? 2.9 * swatK : lerp(-2.9, 0.08 - bMax, swatK); e = swatK < 0 ? -0.9 : lerp(-0.9, -0.05, swatK); z = 0.1; } else { x = 0.5 + Math.max(0, swatK) * 0.4; z = S * 0.5; e = -0.5; } }
      else if (E === 'tantrum') { x = -2.6 + Math.sin(tt * 21 + S) * 0.4; z = S * 0.45; e = -1.0; quick = 16; }
      else if (E === 'laugh') { x = -0.7; z = -S * 0.3; e = -0.3 + Math.sin(tt * 15) * 0.06; }                                                                // holding his belly
      else if (E === 'shrug') { x = lerp(0.05, -0.3, ek); z = S * lerp(0.12, 0.7, ek); e = lerp(-0.15, -1.8, ek); }
      else if (walking && sleepy) { if (R) { x = Math.sin(ph) * 0.2; e = -0.2; } else { x = 0.62; z = 0.12; e = -0.45 + Math.sin(tt * 12) * 0.12; } }        // shuffling home, scratching his bottom
      else if (walking) { if (R) { x = -2.25 + Math.sin(ph * 2) * 0.12; z = S * 0.25; e = -0.5; } else { x = -0.45 + Math.sin(ph) * 0.55; z = S * 0.2; e = -1.3; } }   // slipper up, fist pumping
      else if (st === 'hunt' && this.target) { if (R) { x = -2.5 + Math.sin(tt * 14) * 0.3; z = S * 0.3; e = -0.4; } else { x = 0.15; z = S * 0.55; e = -1.5; } }   // shaking the slipper at you, other fist on his hip
      else if (search) { if (R) { x = -0.8; z = S * 0.2; e = -1.0; } else { x = -2.4; z = 0.5; e = -0.15; } }                                                    // a hand over his eyes, peering about
      else if (st === 'waking') { x = -2.7 + Math.sin(tt * 26) * 0.2; z = S * 0.5; e = -0.3; }
      a.x += (x - a.x) * Math.min(1, dt * quick); a.z += (z - a.z) * Math.min(1, dt * 9); a.e += (e - a.e) * Math.min(1, dt * (quick + 3)); a.g.rotation.set(a.x, 0, a.z); a.fore.rotation.x = a.e;
    }
    this.slipper.visible = this.up && st !== 'waking';
    // ---- legs: stuck out in front in the chair (toes wiggling), stomping, stamping in a rage, kicking in the air
    if ((this.toe -= dt) < -1.6) this.toe = 5 + Math.random() * 6;
    let avg = 0;
    for (const l of this.legs) {
      const off = l.side > 0 ? 0 : Math.PI, sw = walking ? Math.sin(ph + off) : 0; let x = sw * (sleepy ? 0.32 : 0.55) - q, kn = (walking ? Math.max(0, Math.cos(ph + off)) * (sleepy ? 0.35 : 0.95) : 0) + q * 2;
      if (st === 'slip') { x = -1.3 + Math.sin(tt * 15 + l.side * 2) * (t < 3.6 ? 0.6 : 0.1); kn = t < 3.6 ? 0.6 + Math.sin(tt * 13 + l.side) * 0.5 : 0.3; }
      else if (E === 'tantrum') { const up = Math.max(0, Math.sin(em.t * 10.5 + off)) * ek; x = -0.75 * up; kn = 1.3 * up; }
      else if (st === 'waking' && t < 1) { x = -0.3 * Math.abs(Math.sin(tt * 20)); }
      x = lerp(x, -1.22, this.sit) + (st === 'waking' && t < 1 ? -0.3 * Math.abs(Math.sin(tt * 20 + off)) : 0); kn = lerp(kn, 0.1, this.sit);
      l.x += (x - l.x) * Math.min(1, dt * 14); l.k += (kn - l.k) * Math.min(1, dt * 14); l.g.rotation.x = l.x; l.knee.rotation.x = l.k; avg += l.x / 2;
      const wig = this.asleep && this.toe < 0 && (l.side > 0) === (Math.floor(tt / 7) % 2 === 0) ? Math.sin(tt * 15) * 0.28 : 0;
      l.foot.rotation.set(-(l.x + l.k) * 0.8 * (1 - this.sit) + wig, l.side * 0.22, 0);
    }
    this.skirt.rotation.x += (Math.min(0, avg * 0.62) - this.skirt.rotation.x) * Math.min(1, dt * 12); this.skirt.scale.z = 1 - this.skirt.rotation.x * 0.42;     // the gown drapes over his lap
    this.ears.forEach((e, i) => { e.rotation.x = -0.45 + Math.sin(tt * 2 + i) * 0.05 + (walking ? Math.sin(ph * 2 + i) * 0.35 : 0) + hop * 0.2; });
    // ---- eyes follow the nearest bean when he's up
    _f.set(Math.sin(this.vyaw), 0, Math.cos(this.vyaw)); let dir = _f;
    if (this.up && look?.length) { let best = null, bd = 1e9; for (const p of look) { const d = Math.hypot(p.x - this.vx, p.z - this.vz); if (d < bd) { bd = d; best = p; } } if (best) dir = _l.set(best.x - this.vx, best.y - 37, best.z - this.vz).normalize(); }
    for (const e of this.eyes) e.update(dt, dir, _f, { angry: this.up && !sleepy && E !== 'laugh' ? 0.3 : 0, out: st === 'slip' && t > 0.4, shake: walking && !sleepy ? 1.5 : 0 });
    // ---- the shadow of the slipper, shrinking as it comes down
    const sw = st === 'swat' && this.swat && t < WIND + 0.25; this.shadow.visible = this.ring.visible = !!sw;
    if (sw) { const u = clamp(t / WIND, 0, 1), y = this.house.standAt(this.swat.x, this.swat.z, 40) + 0.12; this.shadow.position.set(this.swat.x, y, this.swat.z); this.ring.position.set(this.swat.x, y + 0.02, this.swat.z); this.shadow.scale.setScalar(0.35 + u * 0.65); this.shadow.material.opacity = 0.25 + u * 0.5; this.ring.material.opacity = 0.5 + Math.sin(tt * 30) * 0.4; }
  }
  // Where the "Zzz" should float up from, and where his voice comes from
  get mouthPos() { return { x: this.vx + Math.sin(this.vyaw) * 6, y: 35, z: this.vz + Math.cos(this.vyaw) * 6 }; }
}
export const GRANDPA = { REACH, SWAT_R, WIND };
