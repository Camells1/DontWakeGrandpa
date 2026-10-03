// The beans. Every part of one is a choice: colour, shape, eyes, mouth, top, trousers, hat, something on
// the face, something on the back, gloves and shoes. The model is built here from scratch to match, and
// every movement is animated by hand: tiptoeing with T-rex arms, panic running, flailing through the air,
// tumbling like a ragdoll, getting flattened into a pancake and pumped back up, four dances, shushing,
// waving, cheering and cowering.
import * as THREE from 'three';
import { toon } from './materials.js';
import { addOutline, GooglyEye } from './toon.js';
import { clamp } from './util.js';

export const PALETTE = [['Orange', 0xff8a3c], ['Teal', 0x35c4b0], ['Pink', 0xff6fa5], ['Yellow', 0xffd23c], ['Red', 0xe5484d], ['Blue', 0x4a7dff], ['Purple', 0x9b6bff], ['Green', 0x5fd08a],
  ['White', 0xf4f4ee], ['Grey', 0x8a8fa0], ['Brown', 0xb9773d], ['Black', 0x2a2a34], ['Lime', 0xb6e84a], ['Sky', 0x7fd4ff], ['Peach', 0xffc09a], ['Navy', 0x2f3f8a]];
const N = PALETTE.length, names = PALETTE.map(p => p[0]);
// What you can change, in the order it is sent to your friends
export const PARTS = [
  ['body', 'Bean colour', names], ['shape', 'Shape', ['Classic', 'Tall', 'Chonky', 'Small', 'Egg']], ['eyes', 'Eyes', ['Googly', 'Huge', 'Beady', 'Wonky', 'Sleepy', 'Cross']],
  ['mouth', 'Mouth', ['Smile', 'Big grin', 'Tongue out', 'Buck teeth', 'Worried']],
  ['top', 'Top', ['Nothing', 'T-shirt', 'Stripy jumper', 'Sailor top', 'Overalls', 'Tuxedo', 'Polka dots', 'Rainbow jumper', 'Hoodie', 'Waistcoat', 'Dress']], ['topA', 'Top colour', names], ['topB', 'Top second colour', names],
  ['pants', 'Bottoms', ['Nothing', 'Shorts', 'Trousers', 'Skirt']], ['pantsC', 'Trouser colour', names],
  ['hat', 'Hat', ['Nothing', 'Beanie', 'Bowler', 'Propeller cap', 'Nightcap', 'Top hat', 'Crown', 'Traffic cone', 'Cowboy', 'Chef', 'Party hat', 'Viking', 'Flower', 'Headband']], ['hatC', 'Hat colour', names],
  ['face', 'Face', ['Nothing', 'Moustache', 'Glasses', 'Shades', 'Clown nose', 'Monocle', 'Beard', 'Rosy cheeks', 'Bandit mask', 'Eye patch']],
  ['back', 'On your back', ['Nothing', 'Backpack', 'Cape', 'Balloon', 'Wings', 'Turtle shell', 'Swag bag', 'Jetpack']], ['backC', 'Back colour', names],
  ['gloves', 'Gloves', names], ['shoes', 'Shoes', names]
];
const DEF = { body: 0, shape: 0, eyes: 0, mouth: 0, top: 0, topA: 4, topB: 8, pants: 0, pantsC: 5, hat: 0, hatC: 1, face: 0, back: 0, backC: 4, gloves: 8, shoes: 11 };
export const defaultLook = i => ({ ...DEF, body: [0, 1, 2, 3][i % 4] });
export const randomLook = () => Object.fromEntries(PARTS.map(([k, , o]) => [k, Math.floor(Math.random() * o.length)]));
export const packLook = l => PARTS.map(([k]) => l[k] | 0);
export const unpackLook = a => Object.fromEntries(PARTS.map(([k, , o], i) => [k, clamp((Array.isArray(a) ? a[i] : a?.[k]) | 0, 0, o.length - 1)]));
const hex = i => PALETTE[i % N][1], lin = i => { const c = new THREE.Color(hex(i)); return [c.r, c.g, c.b]; };
const SHAPES = [{ h: 1.7, r: 0.27, taper: 0.25 }, { h: 1.95, r: 0.225, taper: 0.2 }, { h: 1.62, r: 0.34, taper: 0.2 }, { h: 1.35, r: 0.28, taper: 0.25 }, { h: 1.7, r: 0.3, taper: 0.5 }];
const RAINBOW = [0xe5484d, 0xff8a3c, 0xffd23c, 0x5fd08a, 0x4a7dff, 0x9b6bff].map(h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; });

// The outline of a bean: how wide it is at each height (t = 0 at the bottom, 1 at the top)
const girth = (R, taper, t) => R * (1 + taper / 2 - taper * t) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 2.6)), 1 / 2.6);
function bodyGeo(R, H, taper) {
  const rows = 60, pts = []; for (let i = 0; i <= rows; i++) { const t = i / rows; pts.push(new THREE.Vector2(Math.max(0.0001, girth(R, taper, t)), t * H)); }
  const g = new THREE.LatheGeometry(pts, 44); g.rotateY(Math.PI); return g;
}
// A piece of clothing: a shell a little bigger than the bean between two heights, with the pattern woven in.
// gap: how far the front is left open (radians either side of the middle). flare: how much it swings out at the bottom (a skirt).
function shellGeo(R, H, taper, t0, t1, pad, paint, gap = 0, flare = 0) {
  const rows = 26, pts = []; for (let i = 0; i <= rows; i++) { const t = t0 + (t1 - t0) * i / rows; pts.push(new THREE.Vector2(girth(R, taper, t) + pad + flare * Math.pow(1 - i / rows, 1.5), t * H)); }
  const g = gap ? new THREE.LatheGeometry(pts, 40, gap, Math.PI * 2 - gap * 2) : new THREE.LatheGeometry(pts, 40); if (!gap) g.rotateY(Math.PI);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = paint((p.getY(i) / H - t0) / (t1 - t0), Math.atan2(p.getX(i), p.getZ(i))); col[i * 3] = k[0]; col[i * 3 + 1] = k[1]; col[i * 3 + 2] = k[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
const flat = m => { m.userData.noOutline = true; return m; };
const ballG = (r, s = 14) => new THREE.SphereGeometry(r, s, Math.max(8, s - 4)), capG = (r, l) => new THREE.CapsuleGeometry(r, l, 5, 10), cylG = (a, b, h, s = 18) => new THREE.CylinderGeometry(a, b, h, s), coneG = (r, h, s = 14) => new THREE.ConeGeometry(r, h, s), torG = (R, r, arc = Math.PI * 2) => new THREE.TorusGeometry(R, r, 8, 22, arc);
const spring = (o, key, target, dt, k = 170, d = 16) => { o[key + 'V'] = (o[key + 'V'] || 0) + ((target - o[key]) * k - (o[key + 'V'] || 0) * d) * dt; o[key] += o[key + 'V'] * dt; };
const _f = new THREE.Vector3();

export class Robber {
  // look: an object from defaultLook / unpackLook (or a slot number for a plain bean)
  constructor(look = 0) {
    const L = this.look = typeof look === 'number' ? defaultLook(look) : unpackLook(look), S = SHAPES[L.shape], h = this.h = S.h;
    const r = this.r = h * S.r, legL = this.legL = h * 0.15, H = this.H = h - legL, headY = H * 0.72;
    const Cm = toon(hex(L.body)), dark = toon(0x1b1b24), white = toon(0xffffff), pink = toon(0xff8fa8), cA = toon(hex(L.topA)), cB = toon(hex(L.topB));
    this.root = new THREE.Group(); this.tumble = new THREE.Group(); this.tumble.position.y = h * 0.5; this.root.add(this.tumble);
    this.body = new THREE.Group(); this.body.position.y = -h * 0.5 + legL; this.tumble.add(this.body);
    this.torso = new THREE.Group(); this.body.add(this.torso);
    mesh(bodyGeo(r, H, S.taper), Cm, this.torso);
    const worn = this._clothes(L, r, H, S.taper);
    // ---- the face
    this.head = new THREE.Group(); this.head.position.set(0, headY, 0); this.torso.add(this.head);
    const ES = [[0.34, 0.34], [0.45, 0.45], [0.2, 0.2], [0.44, 0.25], [0.34, 0.34], [0.34, 0.34]][L.eyes]; this.eyes = [];
    [-1, 1].forEach((s, i) => {
      const er = r * ES[i], e = new GooglyEye(er, s > 0 ? 1.08 : 1); e.group.position.set(s * r * 0.4, 0, r * 0.82); this.head.add(e.group); this.eyes.push(e);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); shine.position.set(0.32, 0.38, 0.72); shine.userData.noOutline = true; e.pupil.add(shine);
      if (L.eyes === 4) { const lid = flat(mesh(new THREE.SphereGeometry(er * 1.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), Cm, this.head, s * r * 0.4, 0, r * 0.82)); lid.rotation.x = 0.35; }   // sleepy lids
      if (L.eyes === 5) e.derp.set(-s * 0.55, -0.1, 0);                                                                                                                        // cross-eyed
    });
    this.browY = r * (0.42 + ES[0] * 0.3); this.brows = []; for (const s of [-1, 1]) { const b = flat(mesh(capG(r * 0.055, r * 0.28), dark, this.head, s * r * 0.4, this.browY, r * 0.88)); b.rotation.z = Math.PI / 2; this.brows.push(b); }
    this.jaw = new THREE.Group(); this.jaw.position.set(0, -r * 0.62, r * 0.99); this.head.add(this.jaw);
    this.mouth = flat(mesh(ballG(r * 0.26, 12), dark, this.jaw)); this.mouth.scale.set(0.9, 0.2, 0.5);
    this.tongue = flat(mesh(ballG(r * 0.13, 8), pink, this.jaw, 0, -r * 0.05, r * 0.06)); this.tongue.visible = false;
    const wide = L.mouth === 1 ? 0.32 : 0.2; this.smile = new THREE.Group(); this.jaw.add(this.smile); this.smile.position.set(0, r * 0.08, r * 0.02);
    flat(mesh(torG(r * wide, r * 0.045, Math.PI), dark, this.smile)).rotation.z = L.mouth === 4 ? 0 : Math.PI; if (L.mouth === 4) this.smile.position.y = -r * 0.1;
    if (L.mouth === 1) flat(mesh(new THREE.BoxGeometry(r * 0.5, r * 0.09, r * 0.04), white, this.smile, 0, -r * 0.06, r * 0.01));
    if (L.mouth === 2) flat(mesh(ballG(r * 0.12, 8), pink, this.smile, r * 0.05, -r * 0.27, r * 0.02)).scale.set(1, 1.3, 0.5);
    if (L.mouth === 3) for (const s of [-1, 1]) flat(mesh(new THREE.BoxGeometry(r * 0.11, r * 0.16, r * 0.04), white, this.smile, s * r * 0.065, -r * 0.27, r * 0.02));
    this._face(L, r, dark, white); this._hat(L, r * 1.08, H - headY - r * 0.06); this._back(L, r, H);
    // ---- noodle arms with cartoon gloves, stubby legs with big shoes
    this.arms = []; this.legs = []; const ar = h * 0.3, cP = toon(hex(L.pantsC));
    for (const s of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(s * r * 1.0, H * 0.5, 0); this.torso.add(a);
      mesh(capG(ar * 0.13, ar * 0.62), Cm, a, 0, -ar * 0.4, 0); mesh(ballG(ar * 0.3, 12), toon(hex(L.gloves)), a, 0, -ar * 0.86, 0).scale.set(1, 0.9, 1.05);
      if (worn.sleeve) { const long = worn.sleeve === 2, len = ar * (long ? 0.56 : 0.2); mesh(capG(ar * 0.2, len), worn.mat, a, 0, -ar * 0.12 - len / 2, 0); mesh(torG(ar * 0.2, ar * 0.05), worn.mat, a, 0, -ar * 0.14 - len, 0).rotation.x = Math.PI / 2; }
      this.arms.push({ g: a, side: s, x: 0, z: s * 0.2 });
      const g = new THREE.Group(); g.position.set(s * r * 0.48, 0.03, 0); this.body.add(g);
      mesh(capG(h * 0.075, legL * 0.6), Cm, g, 0, -legL * 0.4, 0); mesh(ballG(h * 0.12, 12), toon(hex(L.shoes)), g, 0, -legL * 0.86, h * 0.055).scale.set(1.05, 0.6, 1.6);
      if (worn.legs) { const len = legL * (worn.legs === 2 ? 0.5 : 0.16); mesh(capG(h * 0.105, len), worn.legs === 3 ? toon(hex(L.topA)) : cP, g, 0, -legL * 0.12 - len / 2, 0); }
      this.legs.push({ g, side: s, rest: g.position.clone() });
    }
    this.hand = new THREE.Group(); this.hand.position.set(0, -ar * 0.86, 0); this.arms[1].g.add(this.hand);     // what you hold goes here
    addOutline(this.root, 0.003);
    Object.assign(this, { t: Math.random() * 10, phase: 0, sq: 0, sqV: 0, mouthK: 0, fid: 4 + Math.random() * 6, fidT: 0, fidKind: 0, flatK: 0, flatKV: 0, airT: 0, idleT: 0, pitch: 0, roll: 0, yaw: 0, by: 0, tp: 0, hp: 0, hy: 0 });
  }
  // Everything the bean wears, as real pieces sitting on top of it. Returns what the arms and legs need to match.
  _clothes(L, r, H, taper) {
    const T = this.torso, A = lin(L.topA), B = lin(L.topB), white = [0.95, 0.95, 0.92], cloth = toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }), mA = toon(hex(L.topA)), mB = toon(hex(L.topB)), mP = toon(hex(L.pantsC));
    const shell = (t0, t1, pad, paint, gap, flare) => mesh(shellGeo(r, H, taper, t0, t1, pad, paint, gap, flare), cloth, T);
    const hem = (t, pad, mat, thick = 0.045, gap = 0) => { const m = mesh(torG(girth(r, taper, t) + pad, r * thick, Math.PI * 2 - gap * 2), mat, T, 0, t * H, 0); m.rotation.set(Math.PI / 2, 0, gap ? Math.PI / 2 + gap : 0); return m; };
    const out = { sleeve: 0, legs: 0, mat: mA }, top = L.top, bottom = L.pants ? 0.2 : 0.15;
    // ---- trousers first, so tops sit over the waistband
    if (L.pants === 1 || L.pants === 2) { shell(0.02, 0.22, r * 0.06, () => lin(L.pantsC)); hem(0.22, r * 0.06, mP, 0.05); out.legs = L.pants; }
    else if (L.pants === 3) { shell(0.04, 0.24, r * 0.05, () => lin(L.pantsC), 0, r * 0.75); hem(0.24, r * 0.05, mP, 0.05); hem(0.04, r * 0.8, mP, 0.04); }                // a skirt that swings out
    // ---- tops
    const stripes = w => t => (Math.floor(t / w) % 2 ? B : A);
    if (top === 1) { shell(bottom, 0.53, r * 0.07, () => A); out.sleeve = 1; }
    else if (top === 2) { shell(bottom, 0.53, r * 0.08, stripes(0.2)); out.sleeve = 2; }
    else if (top === 3) { shell(bottom, 0.53, r * 0.07, stripes(0.1)); out.sleeve = 1; }
    else if (top === 6) { shell(bottom, 0.53, r * 0.07, (t, a) => { const u = (a / 0.45 + 100) % 1 - 0.5, v = (t / 0.26 + (Math.floor(a / 0.45 + 100) % 2) * 0.5) % 1 - 0.5; return u * u + v * v < 0.09 ? B : A; }); out.sleeve = 1; }
    else if (top === 7) { shell(bottom, 0.53, r * 0.08, t => RAINBOW[Math.max(0, Math.min(5, Math.floor((1 - t) * 6)))]); out.sleeve = 2; out.mat = toon(0xe5484d); }
    else if (top === 4) { // overalls: trousers, a bib, two straps over the shoulders and brass buttons
      shell(0.02, 0.36, r * 0.07, () => A); hem(0.36, r * 0.07, mA, 0.05); out.legs = 3;
      mesh(shellGeo(r, H, taper, 0.36, 0.52, r * 0.075, () => A, Math.PI - 0.5), cloth, T).rotation.y = Math.PI;
      for (const s of [-1, 1]) { const st = mesh(torG(r * 0.6, r * 0.075, Math.PI * 1.05), mA, T, s * r * 0.42, H * 0.5, 0); st.rotation.set(0, Math.PI / 2, 0); st.scale.set(1.25, 1.45, 1); flat(mesh(ballG(r * 0.09, 8), toon(0xffc93c), T, s * r * 0.42, H * 0.5, girth(r, taper, 0.5) + r * 0.1)); }
      mesh(new THREE.BoxGeometry(r * 0.5, r * 0.36, r * 0.05), mB, T, 0, H * 0.42, girth(r, taper, 0.42) + r * 0.09);
    } else if (top === 5) { // tuxedo: white shirt, open jacket with lapels, bow tie, studs
      shell(bottom, 0.53, r * 0.035, () => white); shell(bottom - 0.03, 0.54, r * 0.085, () => A, 0.42); hem(0.54, r * 0.085, mA, 0.05, 0.42); out.sleeve = 2;
      for (const s of [-1, 1]) { const lp = mesh(coneG(r * 0.2, r * 0.75, 4), mA, T, s * r * 0.36, H * 0.44, girth(r, taper, 0.44) * 0.86 + r * 0.1); lp.rotation.set(Math.PI + 0.1, 0, s * 0.3); lp.scale.z = 0.3; flat(mesh(coneG(r * 0.15, r * 0.28, 8), mB, T, s * r * 0.14, H * 0.53, girth(r, taper, 0.53) + r * 0.07)).rotation.z = s * Math.PI / 2; }
      flat(mesh(ballG(r * 0.08, 8), mB, T, 0, H * 0.53, girth(r, taper, 0.53) + r * 0.09)); for (let i = 0; i < 2; i++) flat(mesh(ballG(r * 0.05, 6), toon(0x1b1b24), T, 0, H * (0.44 - i * 0.09), girth(r, taper, 0.44 - i * 0.09) + r * 0.05));
    } else if (top === 8) { // hoodie: a thick body, a hood down the back, a pouch and two drawstrings
      shell(bottom - 0.02, 0.56, r * 0.1, () => A); hem(0.56, r * 0.1, mA, 0.07); hem(bottom - 0.02, r * 0.1, mB, 0.06); out.sleeve = 2;
      mesh(ballG(r * 0.66, 14), mA, T, 0, H * 0.68, -r * 0.62).scale.set(1.1, 0.95, 0.75); mesh(ballG(r * 0.42, 12), mA, T, 0, H * 0.3, girth(r, taper, 0.3) + r * 0.04).scale.set(1.2, 0.6, 0.35);
      for (const s of [-1, 1]) { flat(mesh(capG(r * 0.03, r * 0.34), toon(0xffffff), T, s * r * 0.18, H * 0.46, girth(r, taper, 0.46) + r * 0.13)); flat(mesh(ballG(r * 0.05, 6), toon(0xffffff), T, s * r * 0.18, H * 0.46 - r * 0.22, girth(r, taper, 0.44) + r * 0.13)); }
    } else if (top === 9) { shell(bottom, 0.53, r * 0.075, () => A, 0.6); hem(0.53, r * 0.075, mB, 0.04, 0.6); hem(bottom, r * 0.075, mB, 0.04, 0.6); }                                    // an open waistcoat
    else if (top === 10) { shell(0.3, 0.53, r * 0.07, () => A); shell(0.05, 0.31, r * 0.07, t => (t < 0.18 ? B : A), 0, r * 0.95); hem(0.05, r * 1.02, mB, 0.05); hem(0.31, r * 0.09, mB, 0.06); out.sleeve = 1; }   // a dress with a belt and a trim
    if ([1, 2, 3, 6, 7].includes(top)) { hem(0.53, r * (top === 2 || top === 7 ? 0.08 : 0.07), top === 3 || top === 6 ? mB : out.mat, 0.05); hem(bottom, r * (top === 2 || top === 7 ? 0.08 : 0.07), top === 2 ? mB : out.mat, 0.05); }
    if (L.face === 8) shell(0.655, 0.79, r * 0.035, () => [0.03, 0.03, 0.045]);                                                                                                // a bandit mask, tied round the head
    return out;
  }
  _face(L, r, dark, white) {
    const f = L.face, hd = this.head, z = r * 0.9;
    if (f === 1) for (const s of [-1, 1]) flat(mesh(capG(r * 0.09, r * 0.3), toon(0x4a2c1a), hd, s * r * 0.2, -r * 0.38, r * 1.0)).rotation.z = Math.PI / 2 - s * 0.35;
    else if (f === 2 || f === 5) { for (const s of f === 2 ? [-1, 1] : [1]) flat(mesh(torG(r * 0.4, r * 0.05), toon(f === 2 ? 0x33384a : 0xffc93c), hd, s * r * 0.4, 0, r * 1.1)); if (f === 2) flat(mesh(capG(r * 0.04, r * 0.1), toon(0x33384a), hd, 0, 0, r * 1.14)).rotation.z = Math.PI / 2; else flat(mesh(capG(r * 0.02, r * 0.8), toon(0xffc93c), hd, r * 0.75, -r * 0.5, r * 0.8)); }
    else if (f === 3) { flat(mesh(new THREE.BoxGeometry(r * 1.7, r * 0.42, r * 0.12), dark, hd, 0, 0, r * 1.12)); for (const s of [-1, 1]) flat(mesh(new THREE.BoxGeometry(r * 0.08, r * 0.1, r * 0.9), dark, hd, s * r * 0.9, 0, r * 0.66)); }
    else if (f === 4) mesh(ballG(r * 0.2, 12), toon(0xe5484d), hd, 0, -r * 0.28, r * 1.08);
    else if (f === 6) { mesh(ballG(r * 0.5, 12), toon(0xf4f4ee), hd, 0, -r * 0.95, r * 0.72).scale.set(1.1, 1, 0.6); }
    else if (f === 7) for (const s of [-1, 1]) flat(mesh(ballG(r * 0.17, 10), toon(0xff8fa8), hd, s * r * 0.68, -r * 0.42, r * 0.74)).scale.set(1, 0.7, 0.4);
    else if (f === 9) { flat(mesh(cylG(r * 0.38, r * 0.38, r * 0.06, 16), dark, hd, -r * 0.4, 0, r * 1.14)).rotation.x = Math.PI / 2; const st = flat(mesh(torG(r * 0.98, r * 0.035), dark, hd, 0, r * 0.05, 0)); st.rotation.set(Math.PI / 2, 0.25, 0); }
  }
  _hat(L, r, y) {
    const hat = new THREE.Group(); hat.position.set(0, y, 0); this.head.add(hat); this.hat = hat; const k = L.hat, c = toon(hex(L.hatC)), w = toon(0xffffff), gold = toon(0xffc93c), red = toon(0xe5484d);
    if (k === 1) { mesh(ballG(r * 0.86), c, hat, 0, r * 0.1, 0).scale.set(1, 0.7, 1); mesh(torG(r * 0.82, r * 0.14), w, hat, 0, r * 0.08, 0).rotation.x = Math.PI / 2; this.pom = mesh(ballG(r * 0.2, 10), w, hat, 0, r * 0.74, 0); }
    else if (k === 2) { mesh(ballG(r * 0.74), c, hat, 0, r * 0.12, 0).scale.set(1, 0.85, 1); mesh(cylG(r * 1.15, r * 1.15, r * 0.09, 20), c, hat, 0, r * 0.08, 0); mesh(torG(r * 0.73, r * 0.07), red, hat, 0, r * 0.2, 0).rotation.x = Math.PI / 2; }
    else if (k === 3) { mesh(ballG(r * 0.78), c, hat).scale.set(1, 0.6, 1); mesh(cylG(r * 0.6, r * 0.6, r * 0.06, 16), c, hat, 0, r * 0.04, r * 0.5); mesh(capG(r * 0.04, r * 0.25), gold, hat, 0, r * 0.55, 0); this.prop = new THREE.Group(); this.prop.position.y = r * 0.72; hat.add(this.prop); for (const s of [-1, 1]) mesh(ballG(r * 0.3, 8), red, this.prop, s * r * 0.3, 0, 0).scale.set(1, 0.12, 0.4); }
    else if (k === 4) { mesh(ballG(r * 0.8), c, hat, 0, r * 0.05, 0).scale.set(1, 0.7, 1); this.floppy = new THREE.Group(); this.floppy.position.set(0, r * 0.5, 0); hat.add(this.floppy); mesh(capG(r * 0.3, r * 0.7), c, this.floppy, 0, r * 0.4, 0); mesh(ballG(r * 0.32, 10), w, this.floppy, 0, r * 0.95, 0); mesh(torG(r * 0.78, r * 0.13), w, hat, 0, r * 0.04, 0).rotation.x = Math.PI / 2; }
    else if (k === 5) { mesh(cylG(r * 0.62, r * 0.66, r * 1.1, 20), c, hat, 0, r * 0.6, 0); mesh(cylG(r * 1.1, r * 1.1, r * 0.09, 22), c, hat, 0, r * 0.06, 0); mesh(torG(r * 0.67, r * 0.08), red, hat, 0, r * 0.22, 0).rotation.x = Math.PI / 2; }
    else if (k === 6) { mesh(cylG(r * 0.72, r * 0.66, r * 0.4, 18), gold, hat, 0, r * 0.2, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(coneG(r * 0.16, r * 0.4, 6), gold, hat, Math.cos(a) * r * 0.62, r * 0.56, Math.sin(a) * r * 0.62); mesh(ballG(r * 0.09, 8), i % 2 ? red : toon(0x4a7dff), hat, Math.cos(a) * r * 0.62, r * 0.8, Math.sin(a) * r * 0.62); } }
    else if (k === 7) { mesh(cylG(r * 0.8, r * 0.8, r * 0.08, 4), toon(0xff7a1a), hat, 0, r * 0.02, 0); mesh(coneG(r * 0.55, r * 1.4, 14), toon(0xff7a1a), hat, 0, r * 0.74, 0); flat(mesh(cylG(r * 0.3, r * 0.4, r * 0.28, 14), w, hat, 0, r * 0.62, 0)); }
    else if (k === 8) { mesh(ballG(r * 0.7), c, hat, 0, r * 0.2, 0).scale.set(1, 0.9, 1.15); const br = mesh(cylG(r * 1.5, r * 1.5, r * 0.08, 24), c, hat, 0, r * 0.08, 0); br.scale.set(1, 1, 0.82); for (const s of [-1, 1]) mesh(ballG(r * 0.5, 10), c, hat, s * r * 1.18, r * 0.22, 0).scale.set(0.45, 0.5, 1.2); mesh(torG(r * 0.7, r * 0.06), toon(0x4a2c1a), hat, 0, r * 0.3, 0).rotation.x = Math.PI / 2; }
    else if (k === 9) { mesh(cylG(r * 0.6, r * 0.62, r * 0.6, 18), w, hat, 0, r * 0.3, 0); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; mesh(ballG(r * 0.42, 10), w, hat, Math.cos(a) * r * 0.36, r * 0.82, Math.sin(a) * r * 0.36); } mesh(ballG(r * 0.42, 10), w, hat, 0, r * 0.98, 0); }
    else if (k === 10) { mesh(coneG(r * 0.6, r * 1.5, 16), c, hat, 0, r * 0.72, 0); for (let i = 0; i < 3; i++) flat(mesh(torG(r * (0.46 - i * 0.14), r * 0.05), w, hat, 0, r * (0.36 + i * 0.36), 0)).rotation.x = Math.PI / 2; this.pom = mesh(ballG(r * 0.2, 10), gold, hat, 0, r * 1.5, 0); }
    else if (k === 11) { mesh(ballG(r * 0.82), toon(0xb8c4d0), hat, 0, r * 0.06, 0).scale.set(1, 0.7, 1); mesh(torG(r * 0.8, r * 0.08), gold, hat, 0, r * 0.08, 0).rotation.x = Math.PI / 2; for (const s of [-1, 1]) { const hn = mesh(coneG(r * 0.2, r * 0.8, 10), w, hat, s * r * 0.86, r * 0.5, 0); hn.rotation.z = -s * 0.75; } }
    else if (k === 12) { mesh(capG(r * 0.04, r * 0.5), toon(0x5fd08a), hat, 0, r * 0.3, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(ballG(r * 0.2, 8), c, hat, Math.cos(a) * r * 0.28, r * 0.66, Math.sin(a) * r * 0.28).scale.set(1, 0.5, 1); } this.pom = mesh(ballG(r * 0.18, 8), gold, hat, 0, r * 0.68, 0); }
    else if (k === 13) { const b = mesh(torG(r * 0.9, r * 0.11), c, hat, 0, -r * 0.42, 0); b.rotation.x = Math.PI / 2; this.floppy = new THREE.Group(); this.floppy.position.set(0, -r * 0.42, -r * 0.9); hat.add(this.floppy); for (const s of [-1, 1]) mesh(capG(r * 0.07, r * 0.5), c, this.floppy, s * r * 0.12, -r * 0.3, 0).rotation.z = s * 0.3; }
  }
  _back(L, r, H) {
    const k = L.back, t = this.torso, c = toon(hex(L.backC)), y = H * 0.36, z = -r * 0.98;
    if (k === 1) { mesh(ballG(r * 0.6, 12), c, t, 0, y, z - r * 0.1).scale.set(1.05, 1.15, 0.7); mesh(ballG(r * 0.3, 10), toon(0xffffff), t, 0, y - r * 0.2, z - r * 0.45).scale.set(1, 0.8, 0.5); }
    else if (k === 2) { this.cape = new THREE.Group(); this.cape.position.set(0, H * 0.56, z + r * 0.12); t.add(this.cape); const g = new THREE.PlaneGeometry(r * 1.9, H * 0.6, 4, 6); g.translate(0, -H * 0.3, 0); const m = mesh(g, toon(hex(L.backC), { side: THREE.DoubleSide }), this.cape); m.userData.noOutline = true; mesh(torG(r * 0.86, r * 0.07, Math.PI), c, t, 0, H * 0.56, 0).rotation.set(Math.PI / 2, 0, Math.PI); }
    else if (k === 3) { this.balloon = new THREE.Group(); this.balloon.position.set(-r * 0.6, H * 0.5, z); t.add(this.balloon); flat(mesh(cylG(r * 0.012, r * 0.012, H * 1.0, 4), toon(0xffffff), this.balloon, 0, H * 0.5, 0)); mesh(ballG(r * 0.6, 14), c, this.balloon, 0, H * 1.2, 0).scale.set(1, 1.2, 1); mesh(coneG(r * 0.1, r * 0.14, 8), c, this.balloon, 0, H * 1.2 - r * 0.76, 0); }
    else if (k === 4) { this.wings = []; for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(s * r * 0.25, H * 0.5, z + r * 0.05); t.add(g); mesh(ballG(r * 0.6, 12), toon(0xffffff), g, s * r * 0.55, r * 0.15, 0).scale.set(1.1, 0.75, 0.2); mesh(ballG(r * 0.4, 10), toon(0xffffff), g, s * r * 0.5, -r * 0.3, 0).scale.set(1, 0.6, 0.2); this.wings.push({ g, s }); } }
    else if (k === 5) { mesh(ballG(r * 0.92, 16), c, t, 0, y + r * 0.1, z + r * 0.42).scale.set(1, 1.15, 0.6); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; flat(mesh(ballG(r * 0.2, 8), toon(0xffffff, { transparent: true, opacity: 0.35 }), t, Math.cos(a) * r * 0.42, y + r * 0.1 + Math.sin(a) * r * 0.5, z - r * 0.08)).scale.set(1, 1, 0.3); } }
    else if (k === 6) { mesh(ballG(r * 0.5, 12), toon(0xe0cda0), t, 0, y, z).scale.set(1, 1.2, 0.75); mesh(ballG(r * 0.17, 8), toon(0xb9a374), t, 0, y + r * 0.62, z); }
    else if (k === 7) { for (const s of [-1, 1]) { mesh(capG(r * 0.2, r * 0.6), toon(0xb8c4d0), t, s * r * 0.3, y + r * 0.1, z - r * 0.1); mesh(coneG(r * 0.2, r * 0.3, 10), c, t, s * r * 0.3, y + r * 0.62, z - r * 0.1); } this.flames = []; for (const s of [-1, 1]) { const f = flat(mesh(coneG(r * 0.16, r * 0.6, 8), new THREE.MeshBasicMaterial({ color: 0xffa530 }), t, s * r * 0.3, y - r * 0.62, z - r * 0.1)); f.rotation.x = Math.PI; this.flames.push(f); } }
  }

  // st: { speed, sprint, crouch, air, vy, act ('' | swing | throw | shush | wave | cheer | dance | use), actK (0..1 through the act), dance (0..3),
  //       carry (0 nothing, 1 holding, 2 dragging something heavy), talk (0..1), look, fwd (world Vector3), rag ({rx, rz} while tumbling) | null,
  //       flat (squashed), scared (0..1: Grandpa is up), covered, dizzy }
  update(dt, st) {
    const h = this.h, r = this.r; this.t += dt; const t = this.t;
    const sp = st.speed || 0, moving = sp > 0.3 && !st.air, run = clamp(sp / 8.6, 0, 1.2), sneak = !!st.crouch;
    this.phase += dt * (sneak ? 5.5 : 5 + run * 9) * (moving ? 1 : 0); const ph = this.phase;
    spring(this, 'sq', 0, dt, 130, 11);
    // ---- squashed flat, and popping back up
    spring(this, 'flatK', st.flat ? 1 : 0, dt, st.flat ? 300 : 120, st.flat ? 22 : 9);
    const fk = clamp(this.flatK, -0.25, 1), wob = st.flat ? Math.sin(t * 9) * 0.04 : 0, sy = Math.max(0.07, 1 - fk * 0.93);
    this.tumble.scale.set(1 + fk * 0.9 + wob, sy, 1 + fk * 0.9 - wob); this.tumble.position.y = h * 0.5 * sy;
    // ---- ragdoll: the whole bean tumbles, limbs everywhere
    const rag = !!st.rag;
    if (rag) { this.tumble.rotation.x = st.rag.rx; this.tumble.rotation.z = st.rag.rz; }
    else { this.tumble.rotation.x += (0 - this.tumble.rotation.x) * Math.min(1, dt * 9); this.tumble.rotation.z += (0 - this.tumble.rotation.z) * Math.min(1, dt * 9); }
    // ---- work out the pose we want
    const W = { by: 0, pitch: 0, roll: 0, yaw: 0, tp: 0, hp: 0, hy: 0, mouth: 0, aL: [0, 0.2], aR: [0, 0.2], brow: 0, legAmp: 0, lift: 0.07, eyeShake: Math.min(3, sp * 0.3), stretch: 0 };
    const breathe = Math.sin(t * 2) * 0.02, act = st.act || '', k = st.actK ?? 0, scared = st.scared || 0;
    this.airT = st.air ? this.airT + dt : 0; this.idleT = moving || act || st.carry || rag || st.flat ? 0 : this.idleT + dt;
    if (moving && !sneak) { // waddle, or leg it
      W.roll = Math.sin(ph) * 0.09 * (0.6 + run); W.pitch = run * 0.16 + (st.sprint ? 0.16 : 0); W.by = Math.abs(Math.sin(ph)) * h * 0.05 * (0.5 + run); W.legAmp = 0.55 * (0.5 + run * 0.6);
      const sw = Math.sin(ph) * 0.7 * (0.4 + run); W.aL = [sw, 0.25]; W.aR = [-sw, 0.25];
      if (st.sprint && scared > 0.3) { W.aL = [-2.9 + Math.sin(t * 22) * 0.35, 0.5]; W.aR = [-2.9 + Math.cos(t * 22) * 0.35, 0.5]; W.mouth = 0.9; W.brow = -0.5; W.eyeShake = 3; }   // panic run, arms in the air
      else if (st.sprint) { W.aL = [1.1, 0.5]; W.aR = [1.1, 0.5]; }                                                                                                             // arms streaming out behind
    } else if (sneak) { // cartoon tiptoe: hunched, T-rex arms, great big careful steps
      W.by = -h * 0.13 + (moving ? Math.abs(Math.sin(ph)) * h * 0.035 : 0); W.tp = 0.42; W.hp = -0.3; W.legAmp = moving ? 0.85 : 0; W.lift = 0.16;
      W.aL = [-1.25 + (moving ? Math.sin(ph) * 0.12 : 0), 0.12]; W.aR = [-1.25 - (moving ? Math.sin(ph) * 0.12 : 0), 0.12]; W.hy = Math.sin(t * 1.6) * 0.5; W.brow = 0.25; W.roll = moving ? Math.sin(ph) * 0.05 : 0;
    } else { // standing about: breathe, look round, and now and then scratch or yawn
      W.hy = Math.sin(t * 0.7) * 0.25 + Math.sin(t * 0.23) * 0.2;
      if ((this.fid -= dt) < 0) { this.fid = 5 + Math.random() * 7; this.fidT = 1.8; this.fidKind = Math.floor(Math.random() * 3); }
      if (this.fidT > 0) { this.fidT -= dt; const f = Math.sin(clamp(this.fidT / 1.8, 0, 1) * Math.PI);
        if (this.fidKind === 0) { W.aR = [-2.7 * f, 0.5 * f + 0.2]; W.hp = 0.15 * f; W.roll = Math.sin(t * 14) * 0.03 * f; }             // scratch your head
        else if (this.fidKind === 1) { W.mouth = f; W.aL = [-2.4 * f, 0.9 * f + 0.2]; W.aR = [-2.4 * f, 0.9 * f + 0.2]; W.stretch = 0.08 * f; W.hp = -0.3 * f; }   // a big yawn and stretch
        else { W.hy = Math.sin(this.fidT * 5) * 0.9 * f; W.tp = 0.1 * f; }                                                                 // check both ways
      }
      if (this.idleT > 18) { W.by = -h * 0.2; W.tp = 0.5; W.hp = 0.5 + Math.sin(t * 1.2) * 0.08; W.mouth = 0.25 + Math.sin(t * 1.2) * 0.2; W.aL = [-0.4, 0.3]; W.aR = [-0.4, 0.3]; }   // nodding off
    }
    if (st.air && !rag) { // up: stretch and reach. Down: flail.
      if (st.vy > 0) { W.stretch = 0.14; W.aL = [-2.8, 0.4]; W.aR = [-2.8, 0.4]; W.legAmp = 0; }
      else { W.aL = [-1.6 + Math.sin(t * 24) * 0.8, 1.2]; W.aR = [-1.6 + Math.cos(t * 24) * 0.8, 1.2]; W.mouth = this.airT > 0.5 ? 1 : 0.3; W.pitch = 0.12; W.eyeShake = 2.5; }
    }
    if (st.carry === 1) { W.aL = [-1.25, -0.25]; W.aR = [-1.25, -0.25]; W.tp += -0.08; }
    else if (st.carry === 2) { W.aL = [-1.0, -0.2]; W.aR = [-1.0, -0.2]; W.tp += -0.35; W.pitch -= 0.1; W.mouth = 0.5 + Math.sin(t * 6) * 0.2; W.brow = -0.4; W.roll += Math.sin(t * 7) * 0.05; }   // heave!
    if (act === 'swing') { const wind = k < 0.35 ? k / 0.35 : 0, hit = k >= 0.35 ? (k - 0.35) / 0.65 : 0; W.aR = [k < 0.35 ? -2.9 * wind : -2.9 + 3.9 * Math.min(1, hit * 2.4), 0.3]; W.yaw = k < 0.35 ? -0.6 * wind : -0.6 + 1.5 * Math.min(1, hit * 2.4) - hit * 0.9; W.pitch += hit > 0 ? 0.3 * Math.sin(hit * Math.PI) : -0.12 * wind; W.mouth = 0.8; W.brow = -0.6; W.stretch = hit > 0 ? 0.1 * Math.sin(hit * Math.PI) : 0; W.aL = [0.4, 0.6]; }
    else if (act === 'throw') { W.aR = [k < 0.4 ? -3.0 * (k / 0.4) : -3.0 + 3.6 * Math.min(1, (k - 0.4) * 4), 0.2]; W.pitch += k < 0.4 ? -0.25 * (k / 0.4) : 0.3 * Math.sin((k - 0.4) / 0.6 * Math.PI); W.mouth = 0.6; }
    else if (act === 'use') { W.aR = [-1.7, -0.1]; W.hp = 0.15; }
    else if (act === 'shush') { W.aR = [-2.25, -0.75]; W.tp += 0.25; W.hp = -0.1; W.brow = 0.5; W.mouth = 0.14; W.aL = [0.1, 0.6]; }
    else if (act === 'wave') { W.aR = [-2.8, 0.5 + Math.sin(t * 12) * 0.5]; W.roll += Math.sin(t * 6) * 0.06; W.mouth = 0.5; }
    else if (act === 'cheer') { W.aL = [-2.9, 0.6 + Math.sin(t * 16) * 0.2]; W.aR = [-2.9, 0.6 + Math.cos(t * 16) * 0.2]; W.by += Math.abs(Math.sin(t * 9)) * h * 0.14; W.mouth = 1; W.stretch = 0.06; }
    else if (act === 'dance') { const d = st.dance | 0;
      if (d === 0) { W.roll = Math.sin(t * 9) * 0.32; W.by += Math.abs(Math.sin(t * 9)) * h * 0.1; W.aL = [-2.6 + Math.sin(t * 9) * 0.5, 0.7]; W.aR = [-2.6 - Math.sin(t * 9) * 0.5, 0.7]; }                    // the wiggle
      else if (d === 1) { W.yaw = t * 7; W.aL = [-1.57, 1.4]; W.aR = [-1.57, 1.4]; W.by += Math.abs(Math.sin(t * 7)) * h * 0.06; }                                                                               // the spinny one
      else if (d === 2) { const s = Math.sin(t * 8); W.aL = [s * 0.9, 0.35 + s * 0.5]; W.aR = [-s * 0.9, 0.35 - s * 0.5]; W.roll = -s * 0.22; W.yaw = s * 0.35; }                                                  // the floss
      else { W.pitch = Math.sin(t * 6) * 0.5; W.by += -h * 0.1 + Math.abs(Math.cos(t * 6)) * h * 0.12; W.aL = [-2.9, 0.3]; W.aR = [-2.9, 0.3]; W.legAmp = 0.7; this.phase += dt * 12; }                         // the worm, sort of
      W.mouth = 0.6; W.hy = Math.sin(t * 4.5) * 0.5;
    }
    if (st.covered && scared > 0.3 && !moving && !act) { W.aL = [-2.7, -0.55]; W.aR = [-2.7, -0.55]; W.by = -h * 0.16; W.tp = 0.55; W.roll = Math.sin(t * 40) * 0.035; W.mouth = 0.25; W.brow = 0.6; W.eyeShake = 3; }   // hands over your head, shaking
    else if (scared > 0.3 && !moving && !act && !sneak) { W.roll += Math.sin(t * 38) * 0.02; W.brow = 0.6; W.mouth = Math.max(W.mouth, 0.4); }
    if (st.stuck) { W.aL = [-2.3 + Math.sin(t * 13) * 0.6, 0.9]; W.aR = [-2.3 + Math.cos(t * 13) * 0.6, 0.9]; W.roll = Math.sin(t * 9) * 0.2; W.pitch = 0.3 + Math.sin(t * 4.5) * 0.15; W.mouth = 0.7; W.brow = -0.5; W.stretch = Math.abs(Math.sin(t * 9)) * 0.12; W.eyeShake = 2; }   // heaving at feet that won't come unstuck
    if (st.dizzy) { W.roll += Math.sin(t * 8) * 0.22; W.hy = Math.sin(t * 6) * 0.6; W.mouth = 0.4; }
    if (rag) { W.aL = [Math.sin(t * 19) * 2.4, 1.3 + Math.sin(t * 13) * 0.6]; W.aR = [Math.cos(t * 17) * 2.4, 1.3 + Math.cos(t * 11) * 0.6]; W.mouth = 1; W.eyeShake = 3; W.legAmp = 0; W.tp = 0; W.by = 0; W.pitch = 0; W.roll = 0; }
    const talk = st.talk || 0;
    if (talk > 0.02 && !st.flat) { W.mouth = Math.max(W.mouth, 0.25 + talk * 0.75 * Math.abs(Math.sin(t * 19))); W.hp += Math.sin(t * 15) * 0.25 * talk; }
    // ---- ease into it
    const e = Math.min(1, dt * 11), b = this.body;
    this.by += (W.by - this.by) * e; this.pitch += (W.pitch - this.pitch) * e; this.roll += (W.roll - this.roll) * e; this.tp += (W.tp - this.tp) * e; this.hp += (W.hp - this.hp) * e; this.hy += (W.hy - this.hy) * e;
    this.yaw = act === 'dance' && (st.dance | 0) === 1 ? W.yaw : this.yaw + (W.yaw - this.yaw) * Math.min(1, dt * 16);
    b.position.y = -h * 0.5 + this.legL + this.by; b.rotation.set(this.pitch, this.yaw, this.roll);
    const s = 1 + this.sq * 0.3 + breathe + W.stretch + (talk > 0.02 ? Math.sin(t * 15) * 0.17 * talk : 0); b.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    this.torso.rotation.x = this.tp;
    // head: nod, and turn toward whatever it's looking at
    let hy = this.hy, hp = this.hp;
    if (st.look && st.fwd && !rag && !st.flat) { const ly = Math.atan2(st.look.x, st.look.z) - Math.atan2(st.fwd.x, st.fwd.z); hy += clamp(Math.atan2(Math.sin(ly), Math.cos(ly)), -0.9, 0.9) * 0.6; hp += clamp(-st.look.y, -0.7, 0.7) * 0.6; }
    this.head.rotation.y += (hy - this.head.rotation.y) * e; this.head.rotation.x += (hp - this.tp * 0.6 - this.head.rotation.x) * e;
    this.mouthK += (W.mouth - this.mouthK) * Math.min(1, dt * 16); this.jaw.rotation.x = this.mouthK * 0.7; this.mouth.scale.y = 0.02 + this.mouthK * 1.1; this.mouth.visible = this.mouthK > 0.12; this.smile.visible = !this.mouth.visible && !st.flat; this.tongue.visible = this.mouthK > 0.7;
    this.brows.forEach((br, i) => { br.rotation.z = Math.PI / 2 + (i ? -1 : 1) * W.brow * 0.6; br.position.y = this.browY + r * Math.max(0, W.brow) * 0.14; });
    // arms, legs
    for (const a of this.arms) { const w = a.side < 0 ? W.aL : W.aR; a.x += (w[0] - a.x) * Math.min(1, dt * (act === 'swing' ? 30 : 14)); a.z += (w[1] * a.side - a.z) * Math.min(1, dt * 14); a.g.rotation.set(a.x, 0, a.z); }
    for (const l of this.legs) {
      const a = ph + (l.side > 0 ? 0 : Math.PI), lift = W.legAmp ? Math.max(0, Math.sin(a)) : 0, swing = W.legAmp ? Math.cos(a) : 0;
      l.g.position.y = l.rest.y + lift * h * W.lift - this.by * 0.9; l.g.rotation.x = rag ? Math.sin(t * 15 + l.side) * 1.2 : st.air ? Math.sin(t * 20 + l.side * 2) * 0.5 : swing * W.legAmp; l.g.rotation.z = rag ? l.side * 0.5 : 0;
    }
    // everything that dangles, flaps, spins or floats
    if (this.prop) this.prop.rotation.y += dt * (5 + sp * 4 + talk * 40 + (st.air ? 30 : 0));
    if (this.floppy) { this.floppy.rotation.z = Math.sin(t * 3) * 0.2 + this.roll * 2 + (rag ? Math.sin(t * 20) : 0); this.floppy.rotation.x = -this.pitch * 2 - 0.5 - run * 0.5; }
    if (this.pom) this.pom.scale.setScalar(1 + Math.abs(Math.sin(ph)) * 0.15);
    if (this.cape) this.cape.rotation.x = 0.12 + run * 1.0 + Math.sin(t * (3 + run * 9)) * (0.05 + run * 0.12) + (st.air ? 0.9 : 0) + (rag ? Math.sin(t * 18) * 0.8 : 0);
    if (this.balloon) { this.balloon.rotation.z = Math.sin(t * 1.3) * 0.12 + this.roll - run * 0.0; this.balloon.rotation.x = -run * 0.5 + Math.sin(t * 1.1) * 0.06; }
    if (this.wings) for (const w of this.wings) w.g.rotation.y = w.s * (0.3 + Math.sin(t * (st.air ? 30 : 4)) * (st.air ? 0.7 : 0.15));
    if (this.flames) for (const f of this.flames) { f.visible = !!st.air; f.scale.y = 0.7 + Math.random() * 0.8; }
    const fwd = st.fwd || _f.set(0, 0, 1), dir = st.look || fwd;
    for (const ey of this.eyes) ey.update(dt, dir, fwd, { angry: 0, out: !!st.flat, shake: W.eyeShake });
  }
  kick(v = 5) { this.sqV = v; }      // a little squash: landing, getting bonked, picking something up
  dispose() { this.root.parent?.remove(this.root); }
}
