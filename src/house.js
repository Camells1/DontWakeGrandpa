// Grandpa's house, seen from mouse height. A living room and a kitchen full of giant furniture to climb,
// hide under and steal from, plus the mouse hole in the skirting board where the beans live.
// Everything solid is a box, a circle or a ramp in a grid, so nothing can walk through anything.
import * as THREE from 'three';
import { HOUSE, DEN, CHAIR } from './config.js';
import { ramp as toonRamp, toon, toyMat } from './materials.js';
import { C, ball, cap, cyl, cone, torus, rbox, slab, eyes, merge, WHITE, BLACK } from './shapes.js';
import { clamp, lerp, rng } from './util.js';
import { addOutline } from './toon.js';

const TAU = Math.PI * 2, EMPTY = [], CELL = 16;
const topAt = (c, x, z) => { if (!c.ramp) return c.top; const dx = x - c.x, dz = z - c.z, lz = dx * c.sn + dz * c.cs; return lerp(c.ramp[0], c.ramp[1], clamp((lz + c.hz) / Math.max(0.5, c.hz * 2 - 1.5), 0, 1)); };

function canvasTex(size, draw, repeat) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (repeat) t.repeat.set(...repeat); return t;
}

export class House {
  constructor(scene, quality = 'medium') {
    this.scene = scene; this.group = new THREE.Group(); scene.add(this.group);
    this.cells = new Map(); this.parts = new Map(); this.R = rng(4242);
    this.spots = []; this.toolSpots = []; this.creaks = []; this.ramps = [];
    this._floors(); this._walls(); this._living(); this._kitchen(); this._den(); this._paths();
    for (const [key, list] of this.parts) { const m = new THREE.Mesh(merge(list), toyMat), g = new THREE.Group(); m.castShadow = m.receiveShadow = true; g.add(m); this.group.add(g); addOutline(g, 0.0024); }   // a dark ink line round everything
    this.parts.clear();
  }

  // ---------------------------------------------------------------- solid things
  _key(i, j) { return i * 4096 + j; }
  addCollider(c) {
    const i0 = Math.floor((c.x - c.r - 1) / CELL), i1 = Math.floor((c.x + c.r + 1) / CELL), j0 = Math.floor((c.z - c.r - 1) / CELL), j1 = Math.floor((c.z + c.r + 1) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = this._key(i, j); if (!this.cells.has(k)) this.cells.set(k, []); this.cells.get(k).push(c); }
    return c;
  }
  addBox(o) { o.box = true; o.cs = Math.cos(o.ry || 0); o.sn = Math.sin(o.ry || 0); o.r = Math.hypot(o.hx, o.hz); return this.addCollider(o); }
  at(x, z) { return this.cells.get(this._key(Math.floor(x / CELL), Math.floor(z / CELL))) || EMPTY; }
  _inside(c, x, z, pad) {
    const dx = x - c.x, dz = z - c.z;
    if (!c.box) return dx * dx + dz * dz < (c.r + pad) * (c.r + pad);
    return Math.abs(dx * c.cs - dz * c.sn) < c.hx + pad && Math.abs(dx * c.sn + dz * c.cs) < c.hz + pad;
  }
  heightAt() { return 0; }
  // The highest thing you could be standing on at this spot, given your feet are at height y
  standAt(x, z, y = Infinity) {
    let g = 0;
    for (const c of this.at(x, z)) { if (c.off || !c.walk) continue; const top = topAt(c, x, z); if (top > y + 0.55 || top <= g) continue; if (this._inside(c, x, z, 0)) g = top; }
    return g;
  }
  // What you're standing on: 'rug' and 'soft' are quiet, 'creak' is very much not
  surfaceAt(x, z, y) {
    let top = 0, kind = Math.hypot(x - this.rug.x, z - this.rug.z) < this.rug.r ? 'rug' : x > HOUSE.split ? 'tile' : 'wood';
    for (const c of this.at(x, z)) { if (c.off || !c.walk) continue; const t = topAt(c, x, z); if (t > y + 0.55 || t <= top) continue; if (this._inside(c, x, z, 0)) { top = t; kind = c.soft ? 'soft' : 'wood'; } }
    if (top < 0.3 && kind !== 'rug' && this.creaks.some(k => Math.abs(x - k.x) < k.hx && Math.abs(z - k.z) < k.hz)) return 'creak';
    return kind;
  }
  // Push a body (feet at height y) out of anything solid. vel is optional: it slides along what it hits
  push(p, y, pad, vel, tall = 1.7) {
    let hit = null;
    for (const c of this.at(p.x, p.z)) {
      const top = topAt(c, p.x, p.z), bottom = c.ramp ? top - 0.8 : c.bottom;
      if (c.off || y >= top - 0.35 || (c.walk && top - y <= 0.55) || (bottom != null && y + tall < bottom)) continue;
      const dx = p.x - c.x, dz = p.z - c.z; let nx, nz, move;
      if (c.box) {
        const lx = dx * c.cs - dz * c.sn, lz = dx * c.sn + dz * c.cs, ox = c.hx + pad - Math.abs(lx), oz = c.hz + pad - Math.abs(lz);
        if (ox <= 0 || oz <= 0) continue;
        if (ox < oz) { const sg = lx < 0 ? -1 : 1; nx = c.cs * sg; nz = -c.sn * sg; move = ox; } else { const sg = lz < 0 ? -1 : 1; nx = c.sn * sg; nz = c.cs * sg; move = oz; }
      } else { const d = Math.hypot(dx, dz), min = c.r + pad; if (d >= min || d < 1e-4) continue; nx = dx / d; nz = dz / d; move = min - d; }
      p.x += nx * move; p.z += nz * move; hit = c;
      if (vel) { const into = vel.x * nx + vel.z * nz; if (into < 0) { vel.x -= nx * into; vel.z -= nz * into; } }
    }
    return hit;
  }
  // Is there something over your head here? (Grandpa can't see or swat a bean under the sofa.)
  covered(x, y, z) { for (const c of this.at(x, z)) if (!c.off && !c.ramp && c.bottom != null && c.bottom > y + 0.9 && c.bottom < y + 14 && this._inside(c, x, z, -0.2)) return true; return this.inDen(x, z); }
  inDen(x, z) { return x < HOUSE.x0 - 0.5; }
  // How far a ray gets before it hits the floor or something solid
  rayDist(ox, oy, oz, dx, dy, dz, range) {
    for (let t = 0.3; t < range; t += 0.3) {
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      if (y < 0) return t;
      for (const c of this.at(x, z)) if (!c.off && y < topAt(c, x, z) && (c.ramp ? y > topAt(c, x, z) - 0.8 : c.bottom == null || y > c.bottom) && this._inside(c, x, z, 0)) return t;
    }
    return range;
  }

  // ---------------------------------------------------------------- building blocks
  _add(key, geo) { if (!this.parts.has(key)) this.parts.set(key, []); this.parts.get(key).push(geo); }
  // A rounded block standing on height y. o: { ry, walk, collide, under (open underneath), soft, e (roundness), key, plain }
  box(col, x, y, z, sx, sy, sz, o = {}) {
    this._add(o.key || 'a', o.plain ? slab(sx, sy, sz, x, y + sy / 2, z, C(col), o.ry || 0) : rbox(sx, sy, sz, x, y + sy / 2, z, C(col), o.ry || 0, 0, o.e ?? 0.3));
    if (o.collide !== false) this.addBox({ x, z, hx: sx / 2, hz: sz / 2, ry: o.ry || 0, top: y + sy, bottom: o.under ? y : undefined, walk: o.walk !== false, soft: !!o.soft });
  }
  post(col, x, y, z, r, h, o = {}) { this._add(o.key || 'a', cyl(r, o.r2 ?? r, h, x, y + h / 2, z, C(col))); if (o.collide !== false) this.addCollider({ x, z, r: Math.max(r, o.r2 ?? r), top: y + h, bottom: o.under ? y : undefined, walk: !!o.walk }); }
  blob(col, x, y, z, r, s) { this._add('a', ball(r, x, y, z, C(col), s)); }
  // Something leaning that a bean can walk up: a ruler, a plank, a book, a baguette. From (x0, z0) at height y0 to (x1, z1) at y1.
  slope(col, x0, z0, y0, x1, z1, y1, w = 3.2, o = {}) {
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), ry = Math.atan2(dx, dz), full = Math.hypot(len, y1 - y0), tilt = Math.atan2(y1 - y0, len), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const g = rbox(w, 0.5, full, 0, 0, 0, C(col), 0, 0, 0.22); g.rotateX(-tilt); g.rotateY(ry); g.translate(cx, (y0 + y1) / 2 - 0.2, cz); this._add('a', g);
    if (o.ticks) for (let k = 1; k < full / 1.6; k++) { const m = slab(w * (k % 5 ? 0.35 : 0.6), 0.06, 0.14, 0, 0.27, -full / 2 + k * 1.6, BLACK); m.rotateX(-tilt); m.rotateY(ry); m.translate(cx, (y0 + y1) / 2 - 0.2, cz); this._add('a', m); }
    this.addBox({ x: cx, z: cz, hx: w / 2, hz: len / 2, ry, top: Math.max(y0, y1), ramp: [y0, y1], walk: true });
    this.ramps.push({ x0, z0, y0, x1, z1, y1 });
  }
  spot(x, y, z, tier = 1) { this.spots.push({ x, y, z, tier }); }
  tool(x, y, z) { this.toolSpots.push({ x, y, z }); }

  // ---------------------------------------------------------------- floors and walls
  _floors() {
    const H = HOUSE, planks = canvasTex(512, (c, S) => {
      c.fillStyle = '#b9773d'; c.fillRect(0, 0, S, S);
      for (let r = 0; r < 8; r++) { const off = (r % 2) * 128 + r * 37; for (let k = -1; k < 3; k++) { const x = off + k * 256 - 128; c.fillStyle = ['#c2823f', '#b27036', '#c98b4a', '#ad6b33', '#bd7a3c'][(r * 3 + k + 9) % 5]; c.fillRect(x + 2, r * 64 + 2, 252, 60); c.fillStyle = '#7a4a22'; for (const nx of [10, 240]) { c.beginPath(); c.arc(x + nx, r * 64 + 32, 3, 0, 7); c.fill(); } } }
      c.strokeStyle = '#7a4a22'; c.lineWidth = 3; for (let r = 0; r <= 8; r++) { c.beginPath(); c.moveTo(0, r * 64); c.lineTo(S, r * 64); c.stroke(); }
    }, [(H.split - H.x0) / 40, (H.z1 - H.z0) / 40]);
    const tiles = canvasTex(256, (c, S) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#f5ecd2' : '#57b9b0'; c.fillRect(i * 128, j * 128, 128, 128); } c.strokeStyle = '#2d6e6a'; c.lineWidth = 5; c.strokeRect(0, 0, S, S); c.strokeRect(128, 0, 128, 256); c.strokeRect(0, 128, 256, 128); }, [(H.x1 - H.split) / 20, (H.z1 - H.z0) / 20]);
    const plane = (tex, x0, x1, z0, z1, y = 0, color = 0xffffff) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshToonMaterial({ map: tex, color, gradientMap: toonRamp })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; this.group.add(m); return m; };
    plane(planks, H.x0, H.split, H.z0, H.z1); plane(tiles, H.split, H.x1, H.z0, H.z1);
    plane(null, DEN.x - DEN.hx, H.x0, DEN.z - DEN.hz, DEN.z + DEN.hz, 0, 0x8a5a36);
    // the big round rug: lovely and quiet to walk on
    this.rug = { x: -40, z: 8, r: 26 };
    const rugTex = canvasTex(512, (c, S) => { const cols = ['#e5484d', '#ffc93c', '#35c4b0', '#ff8a3c', '#f5e8c6', '#e5484d']; cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(S / 2, S / 2, S / 2 * (1 - i * 0.16), 0, 7); c.fill(); }); c.fillStyle = '#1b1630'; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; c.beginPath(); c.arc(S / 2 + Math.cos(a) * S * 0.46, S / 2 + Math.sin(a) * S * 0.46, 7, 0, 7); c.fill(); } });
    const rug = new THREE.Mesh(new THREE.CircleGeometry(this.rug.r, 48), new THREE.MeshToonMaterial({ map: rugTex, gradientMap: toonRamp })); rug.rotation.x = -Math.PI / 2; rug.position.set(this.rug.x, 0.06, this.rug.z); rug.receiveShadow = true; this.group.add(rug);
    // creaky floorboards: a little paler, with two shiny nails. Step on one and everybody hears it.
    for (const [x, z, w, d] of [[-66, 22, 9, 3], [-12, -20, 3, 10], [-58, -30, 8, 3], [-8, 34, 10, 3], [4, -6, 3, 9], [-74, 42, 3, 8], [-22, 52, 9, 3], [12, 40, 3, 9], [-50, 40, 8, 3], [-6, -44, 9, 3], [-70, -46, 3, 8], [14, 20, 8, 3]]) {
      this.creaks.push({ x, z, hx: w / 2, hz: d / 2 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon(0xe2b271)); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z); m.receiveShadow = true; this.group.add(m);
      for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.CircleGeometry(0.22, 8), toon(0x6f7a9a)); n.rotation.x = -Math.PI / 2; n.position.set(x + (w > d ? s * (w / 2 - 0.6) : 0), 0.05, z + (w > d ? 0 : s * (d / 2 - 0.6))); this.group.add(n); }
    }
  }
  _walls() {
    const H = HOUSE, T = 2, wall = canvasTex(512, (c, S) => {
      c.fillStyle = '#6fb7c9'; c.fillRect(0, 0, S, S); c.fillStyle = '#62a9bc'; for (let k = 0; k < 8; k++) c.fillRect(k * 64, 0, 32, S);
      c.fillStyle = '#f5e8c6'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.beginPath(); c.arc(i * 64 + 16 + (j % 2) * 32, j * 64 + 32, 5, 0, 7); c.fill(); }
    });
    const mat = (rx, ry) => { const t = wall.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshToonMaterial({ map: t, gradientMap: toonRamp }); };
    const face = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H.ceil), mat(w / 40, H.ceil / 40)); m.position.set(x, H.ceil / 2, z); m.rotation.y = ry; m.receiveShadow = true; this.group.add(m); };
    face(H.x1 - H.x0, 0, H.z0, 0); face(H.x1 - H.x0, 0, H.z1, Math.PI); face(H.z1 - H.z0, H.x1, 0, -Math.PI / 2); face(H.z1 - H.z0, H.x0, 0, Math.PI / 2);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(H.x1 - H.x0, H.z1 - H.z0), toon(0xf5e8c6)); ceil.rotation.x = Math.PI / 2; ceil.position.y = H.ceil; this.group.add(ceil);
    // the walls themselves (solid), with the mouse hole cut into the west one
    this.addBox({ x: 0, z: H.z0 - T / 2, hx: 100, hz: T / 2, top: H.ceil, walk: false }); this.addBox({ x: 0, z: H.z1 + T / 2, hx: 100, hz: T / 2, top: H.ceil, walk: false });
    this.addBox({ x: H.x1 + T / 2, z: 0, hx: T / 2, hz: 80, top: H.ceil, walk: false });
    const hole = 2.6; // half the width of the mouse hole
    this.addBox({ x: H.x0 - T / 2, z: (H.z0 + DEN.z - hole) / 2, hx: T / 2, hz: (DEN.z - hole - H.z0) / 2, top: H.ceil, walk: false });
    this.addBox({ x: H.x0 - T / 2, z: (DEN.z + hole + H.z1) / 2, hx: T / 2, hz: (H.z1 - DEN.z - hole) / 2, top: H.ceil, walk: false });
    this.addBox({ x: H.x0 - T / 2, z: DEN.z, hx: T / 2, hz: hole, top: H.ceil, bottom: 4.4, walk: false });
    // skirting boards all the way round
    const sk = 0xf5e8c6;
    for (const [x, z, sx, sz] of [[0, H.z0 + 0.4, 180, 0.8], [0, H.z1 - 0.4, 180, 0.8], [H.x1 - 0.4, 0, 0.8, 140]]) this.box(sk, x, 0, z, sx, 5, sz, { collide: false, e: 0.12, key: 'w' });
    this.box(sk, H.x0 + 0.4, 0, (H.z0 + DEN.z - hole) / 2, 0.8, 5, DEN.z - hole - H.z0, { collide: false, e: 0.12, key: 'w' }); this.box(sk, H.x0 + 0.4, 0, (DEN.z + hole + H.z1) / 2, 0.8, 5, H.z1 - DEN.z - hole, { collide: false, e: 0.12, key: 'w' });
    // the hole: a dark arch with a tiny welcome mat and a sign
    const arch = new THREE.Mesh(new THREE.CircleGeometry(hole, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x1a1020 })); arch.position.set(H.x0 + 0.05, 1.9, DEN.z); arch.rotation.y = Math.PI / 2; this.group.add(arch);
    const arch2 = new THREE.Mesh(new THREE.PlaneGeometry(hole * 2, 1.9), new THREE.MeshBasicMaterial({ color: 0x1a1020 })); arch2.position.set(H.x0 + 0.05, 0.95, DEN.z); arch2.rotation.y = Math.PI / 2; this.group.add(arch2);
    { const g = torus(hole + 0.25, 0.34, 0, 0, 0, C(0x8a5a36), 0, 0, Math.PI); g.rotateY(Math.PI / 2); g.translate(H.x0 + 0.5, 1.9, DEN.z); this._add('w', g); }
    this.box(0xe5484d, H.x0 + 3.2, 0, DEN.z, 3.4, 0.14, 4.4, { collide: false, e: 0.2 });
    // a window with the moon in it, and curtains
    const wx = -62, wy = 34; this.window = { x: wx, y: wy, z: H.z0 };
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), new THREE.MeshBasicMaterial({ color: 0x29357a })); pane.position.set(wx, wy, H.z0 + 0.1); this.group.add(pane);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), new THREE.MeshBasicMaterial({ color: 0xfff3c0 })); moon.position.set(wx + 6, wy + 4, H.z0 + 0.15); this.group.add(moon);
    for (const [sx, sy, px, py] of [[28, 1.4, 0, 10.5], [28, 1.4, 0, -10.5], [1.4, 22, -13.5, 0], [1.4, 22, 13.5, 0], [1, 20, 0, 0], [26, 1, 0, 0]]) this.box(0xf5e8c6, wx + px, wy + py - sy / 2, H.z0 + 0.6, sx, sy, 1, { collide: false, key: 'w' });
    for (const s of [-1, 1]) this.box(0xe5484d, wx + s * 18, wy - 16, H.z0 + 1.2, 8, 32, 1.6, { collide: false, e: 0.4, key: 'w' });
    this.box(0xf5e8c6, wx, wy - 12.6, H.z0 + 2, 30, 1, 4, { key: 'w', under: true });   // the sill
    // pictures: the camel, and a stern lady who is probably Mildred
    const pic = (x, y, z, ry, w, h, draw) => { const t = canvasTex(256, draw); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshToonMaterial({ map: t, gradientMap: toonRamp })); m.position.set(x, y, z); m.rotation.y = ry; this.group.add(m); const fr = new THREE.Mesh(new THREE.PlaneGeometry(w + 2, h + 2), toon(0x8a5a36)); fr.position.set(x - Math.sin(ry) * 0.06, y, z - Math.cos(ry) * 0.06); fr.rotation.y = ry; this.group.add(fr); };
    pic(-8, 40, H.z1 - 0.2, Math.PI, 14, 14, (c, S) => { c.fillStyle = '#9fdcff'; c.fillRect(0, 0, S, S); c.fillStyle = '#f2cc50'; c.fillRect(0, 190, S, 70); c.fillStyle = '#ffc93c'; c.beginPath(); c.ellipse(120, 150, 70, 34, 0, 0, 7); c.fill(); c.beginPath(); c.arc(95, 118, 26, 0, 7); c.arc(145, 118, 24, 0, 7); c.fill(); c.fillRect(170, 80, 18, 70); c.beginPath(); c.ellipse(196, 78, 24, 14, 0, 0, 7); c.fill(); for (const x of [75, 100, 140, 165]) c.fillRect(x, 170, 12, 50); c.fillStyle = '#fff'; c.beginPath(); c.arc(204, 72, 7, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(206, 72, 3, 0, 7); c.fill(); });
    pic(H.x1 - 0.2, 38, -20, -Math.PI / 2, 12, 16, (c, S) => { c.fillStyle = '#c38bff'; c.fillRect(0, 0, S, S); c.fillStyle = '#ff9fb8'; c.beginPath(); c.ellipse(128, 170, 60, 90, 0, 0, 7); c.fill(); c.fillStyle = '#ddd'; c.beginPath(); c.arc(128, 78, 46, 0, 7); c.fill(); c.fillStyle = '#fff'; for (const x of [106, 150]) { c.beginPath(); c.arc(x, 130, 20, 0, 7); c.fill(); } c.fillStyle = '#111'; for (const x of [110, 146]) { c.beginPath(); c.arc(x, 132, 8, 0, 7); c.fill(); } c.fillRect(100, 176, 56, 8); });
    for (let k = 0; k < 9; k++) this.box(0xf5f0e0, -20 + k * 2.6, 3, H.z1 - 1.6, 2, 14, 1.6, { collide: false, e: 0.45, key: 'w' }); this.box(0xf5f0e0, -9.6, 17, H.z1 - 1.6, 24, 1, 2, { collide: false, e: 0.4, key: 'w' });   // a radiator
    this.box(0xf5f0e0, 34, 9, H.z1 - 0.5, 4, 4, 0.6, { collide: false, e: 0.3, key: 'w' }); for (const s of [-1, 1]) this._add('w', ball(0.4, 34 + s * 0.8, 11.2, H.z1 - 0.9, BLACK));                                      // a socket (it looks surprised)
    this._add('w', cyl(0.3, 0.3, 8, -20, H.ceil - 4, 0, C(0x474c66))); this._add('w', cone(9, 5, -20, H.ceil - 9.5, 0, C(0xffc93c))); this.ceilLamp = { x: -20, y: H.ceil - 12, z: 0 };                                       // the big light
    // the cuckoo clock (from night four it has opinions)
    this.clock = { x: 12, y: 36, z: H.z1 - 1.4 };
    this.box(0x8a5a36, 12, 30, H.z1 - 1.6, 9, 11, 3, { collide: false, key: 'w' }); this._add('w', cone(7.4, 5, 12, 43.5, H.z1 - 1.6, C(0xe5484d))); this._add('w', cyl(3, 3, 0.4, 12, 36, H.z1 - 3.2, C(0xf5e8c6), Math.PI / 2));
    // the door Grandpa never uses at night
    this.box(0xbd7f45, 70, 0, H.z1 - 0.7, 24, 50, 1.4, { collide: false, key: 'w', e: 0.15 }); this.blob(0xffc93c, 79, 23, H.z1 - 2, 1.4);
  }

  // ---------------------------------------------------------------- furniture
  table(col, x, z, w, d, h, o = {}) {
    this.box(col, x, h - 1.4, z, w, 1.4, d, { under: true, ry: o.ry, e: 0.22 });
    const c = Math.cos(o.ry || 0), s = Math.sin(o.ry || 0);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const px = lx * (w / 2 - 1.6), pz = lz * (d / 2 - 1.6); this.post(o.leg || col, x + px * c + pz * s, 0, z - px * s + pz * c, 0.9, h - 1.4, { r2: 0.7 }); }
  }
  chair(col, x, z, ry) {
    const c = Math.cos(ry), s = Math.sin(ry), L = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    this.box(col, x, 9, z, 9, 1.2, 9, { under: true, ry, e: 0.25 }); { const [bx, bz] = L(0, -4); this.box(col, bx, 10.2, bz, 9, 12, 1.2, { ry, e: 0.25 }); }
    for (const [lx, lz] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) { const [px, pz] = L(lx, lz); this.post(col, px, 0, pz, 0.6, 9, { r2: 0.5 }); }
  }
  _living() {
    const H = HOUSE, r = this.R;
    // ---- Grandpa's armchair, facing the room
    const ax = CHAIR.x, az = CHAIR.z, ac = 0x8d5fb5;
    this.box(ac, ax, 2.6, az, 22, 5.2, 20, { under: true, e: 0.35 }); this.box(0xa878cf, ax, 7.6, az + 1, 16, 1.6, 15, { soft: true, e: 0.5 });           // base, cushion
    this.box(ac, ax, 7.8, az - 9, 22, 22, 5, { e: 0.4 }); for (const sx of [-1, 1]) this.box(ac, ax + sx * 9.6, 7.8, az + 1, 4, 8.4, 17, { e: 0.45 });   // back, arms
    for (const [sx, sz] of [[-9, -8], [9, -8], [-9, 8], [9, 8]]) this.post(0x5a3a26, ax + sx, 0, az + sz, 1, 2.6);
    for (const [bx, by] of [[-5, 16], [5, 16], [0, 21], [-5, 26], [5, 26]]) this.blob(0xffc93c, ax + bx, by, az - 6.4, 0.7, [1, 1, 0.5]);                    // buttons in the back
    this._add('a', cap(0.5, 20, ax, 29.9, az - 9, C(0xa878cf), 0, Math.PI / 2)); for (const sx of [-1, 1]) this._add('a', cap(0.45, 15, ax + sx * 9.6, 16.3, az + 1, C(0xa878cf), Math.PI / 2));
    this._add('a', cyl(5.4, 5.4, 0.16, ax, 30.2, az - 9, C(0xf5f0e0))); for (let k = 0; k < 9; k++) this._add('a', ball(0.9, ax - 8 + k * 2, 2.5, az + 10.1, C(0xa878cf), [1, 1.3, 0.5]));          // a doily, and a frill
    this.chairBlock = this.addCollider({ x: ax, z: az + 1, r: 8, top: 40, bottom: 9, walk: false });   // Grandpa himself, while he sits
    // ---- side table by his elbow: hearing aid, glasses, a mug of cold tea
    const sx = ax + 19, sz = az - 2; this.table(0xbd7f45, sx, sz, 11, 11, 13);
    this.post(0xf5e8c6, sx + 2.4, 13, sz - 2.6, 1.7, 3.4, { walk: true }); this._add('a', torus(1.1, 0.3, sx + 4.4, 14.8, sz - 2.6, C(0xf5e8c6), 0)); this._add('a', cyl(1.45, 1.45, 0.1, sx + 2.4, 16.2, sz - 2.6, C(0x8a5a36)));
    this.sideTable = { x: sx, y: 13, z: sz };
    this.slope(0xffc93c, sx + 4, sz + 30, 0, sx + 2, sz + 5, 13, 3.4, { ticks: true });        // a long ruler up to it
    this.spot(sx - 2.5, 13, sz + 2.5, 2);
    // ---- floor lamp behind the chair
    this.post(0x474c66, ax - 18, 0, az - 9, 2.6, 0.8); this.post(0x474c66, ax - 18, 0.8, az - 9, 0.5, 34); this._add('a', cyl(4, 7, 8, ax - 18, 38, az - 9, C(0xffe9a8))); this._add('a', torus(7, 0.35, ax - 18, 34.1, az - 9, C(0xe5484d))); this._add('a', torus(4, 0.3, ax - 18, 41.9, az - 9, C(0xe5484d))); this._add('a', cyl(0.08, 0.08, 5, ax - 15.5, 31.5, az - 9, C(0xffc93c))); this.blob(0xffc93c, ax - 15.5, 28.8, az - 9, 0.5);
    this.lamp = { x: ax - 18, y: 34, z: az - 9 };
    // ---- coffee table on the rug: the remote lives here, next to the biscuit plate
    const cx = -40, cz = 14; this.table(0xd9a45a, cx, cz, 24, 13, 7.5, { leg: 0x8a5a36 });
    this.slope(0x35c4b0, cx - 21, cz + 1, 0, cx - 11.5, cz + 1, 7.5, 3.6);                     // a leaning book
    this._add('a', cyl(3.4, 2.6, 0.5, cx + 6, 7.75, cz, C(0xf5e8c6))); this._add('a', torus(3.1, 0.14, cx + 6, 8.0, cz, C(0x4a7dff))); this.coffee = { x: cx, y: 7.5, z: cz };
    this.box(0xe5484d, cx - 6, 7.5, cz - 2.4, 6, 0.3, 4.4, { e: 0.16, ry: 0.3, collide: false }); this.box(0xf5e8c6, cx - 6, 7.8, cz - 2.4, 4.4, 0.06, 1.2, { e: 0.16, ry: 0.3, collide: false }); this._add('a', torus(1.3, 0.1, cx + 0.5, 7.56, cz + 3.6, C(0x8a5a36)));
    for (const [lx, lz] of [[-7, -3], [0, 3], [6, 0], [9.5, -4]]) this.spot(cx + lx, 7.5, cz + lz, 2);
    this.spot(cx - 6, 0, cz + 2, 1); this.spot(cx + 4, 0, cz - 2, 1);                               // and underneath
    // ---- the sofa along the west wall: plenty of room under it for a frightened bean
    const fx = H.x0 + 10, fz = -8, fc = 0x35c4b0;
    this.box(fc, fx, 3.2, fz, 17, 5, 46, { under: true, e: 0.3 });
    for (const k of [-1, 0, 1]) this.box(0x5fd8c8, fx + 1.2, 8.2, fz + k * 14.4, 14, 2.2, 14, { soft: true, e: 0.5 });
    this.box(fc, fx - 6.5, 8.2, fz, 4.6, 15, 46, { e: 0.4 }); for (const s of [-1, 1]) this.box(fc, fx + 0.5, 8.2, fz + s * 24.5, 17, 7, 4, { e: 0.45 });
    for (const [px, pz] of [[-6, -20], [6, -20], [-6, 20], [6, 20]]) this.post(0x5a3a26, fx + px, 0, fz + pz, 1, 3.2);
    this.box(0xffc93c, fx + 2, 10.4, fz - 13, 7, 3.4, 7, { soft: true, e: 0.6, ry: 0.4 });   // a cushion
    this.box(0xff6fa5, fx - 1.6, 10.4, fz + 19, 3, 6.4, 7, { soft: true, e: 0.6, ry: 0.2 }); for (const k of [-16, -8, 0, 8, 16]) for (const y of [15, 20]) this.blob(0x1f9c8e, fx - 4.1, y, fz + k, 0.6, [0.5, 1, 1]);
    this._add('a', cap(0.5, 44, fx - 6.5, 23.4, fz, C(0x5fd8c8), Math.PI / 2)); for (const s of [-1, 1]) this._add('a', cap(0.45, 15, fx + 0.5, 15.4, fz + s * 24.5, C(0x5fd8c8), 0, Math.PI / 2));
    this.slope(0xff9fb8, fx + 24, fz + 18, 0, fx + 8.2, fz + 18, 10.4, 6);                 // a blanket trailing to the floor
    for (const k of [-14, 2, 15]) this.spot(fx + 2, 10.4, fz + k, 2);
    for (const k of [-16, -3, 12]) this.spot(fx - 1, 0, fz + k, 1);
    // ---- the TV on its stand, flickering all night
    const tx = -40, tz = H.z1 - 7; this.table(0x474c66, tx, tz, 34, 10, 12);
    this.box(0x1b1630, tx, 12.6, tz + 1, 30, 18, 1.6, { e: 0.2 }); this.box(0x1b1630, tx, 12, tz + 1, 10, 0.8, 5, { e: 0.3 });
    for (const s of [-1, 1]) this._add('a', cap(0.22, 9, tx + s * 3.4, 34.5, tz + 1, C(0xb8c4d0), 0, s * -0.45)); this.blob(0xb8c4d0, tx, 30.8, tz + 1, 1.3, [1, 0.6, 1]); for (const k of [0, 1, 2]) this.blob([0xe5484d, 0xffc93c, 0x5fd08a][k], tx - 12 + k * 2, 13.4, tz + 0.1, 0.55);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(27.4, 15.4), new THREE.MeshBasicMaterial({ color: 0x9fc8ff })); screen.position.set(tx, 21.6, tz + 0.1); screen.rotation.y = Math.PI; this.group.add(screen); this.tv = { x: tx, y: 21, z: tz - 2, screen };
    this.slope(0xe5484d, tx - 31, tz - 5, 0, tx - 17.4, tz - 2, 12, 3.2);                    // a red book leaning on the stand
    this.spot(tx - 12, 12, tz - 2.5, 2); this.spot(tx + 13, 12, tz - 2.6, 2); this.spot(tx + 4, 0, tz - 1, 1);
    // ---- the bookshelf on the north wall: three shelves and a top that takes some reaching
    const bx = 0, bz = H.z0 + 5.5, bw = 40, wood = 0x8a5a36;
    for (const s of [-1, 1]) this.box(wood, bx + s * (bw / 2 + 0.7), 0, bz, 1.4, 37, 10, { e: 0.15 });
    this.box(wood, bx, 0, bz - 4.6, bw, 37, 0.8, { e: 0.1, collide: false });
    for (const y of [9, 18]) this.box(wood, bx, y - 1.2, bz, bw, 1.2, 10, { under: true, e: 0.15 });
    this.box(wood, bx - 9.75, 25.8, bz, 20.5, 1.2, 10, { under: true, e: 0.15 }); this.box(wood, bx + 15, 25.8, bz, 10, 1.2, 10, { under: true, e: 0.15 }); this.box(wood, bx + 5.25, 25.8, bz - 2.6, 9.5, 1.2, 4.8, { under: true, e: 0.15 });
    this.box(wood, bx + 9.75, 34.8, bz, 20.5, 1.2, 10, { under: true, e: 0.15 }); this.box(wood, bx - 15, 34.8, bz, 10, 1.2, 10, { under: true, e: 0.15 }); this.box(wood, bx - 5.25, 34.8, bz - 2.6, 9.5, 1.2, 4.8, { under: true, e: 0.15 });
    this.slope(0x6a6ff0, bx - 6, bz + 1.7, 18, bx + 9.6, bz + 1.7, 27, 2.4);            // a blue book from the second shelf up through the gap
    this.slope(0xe5484d, bx + 6, bz + 3.9, 27, bx - 9.6, bz + 3.9, 36, 2.1);            // and a red one to the very top
    this.box(wood, bx, 0, bz, bw, 1.2, 10, { e: 0.15 });
    const cols = [0xe5484d, 0x35c4b0, 0xffc93c, 0x6a6ff0, 0xff8a3c, 0x5fd08a, 0xff6fa5, 0xf5e8c6];
    for (const y of [1.2, 9, 18, 27]) { let x = bx - bw / 2 + 1.5; const gap = bx + (y === 9 ? 6 : y === 18 ? -8 : 12); while (x < bx + bw / 2 - 2) { const w = 1.3 + r() * 1.5, h = 5.5 + r() * 2.4; if (Math.abs(x - gap) > 5) this.box(cols[Math.floor(r() * 8)], x + w / 2, y, bz - 1.2 + r(), w, h, 6.4, { e: 0.14, collide: false }); x += w + 0.12; } this.addBox({ x: bx, z: bz - 2.4, hx: bw / 2, hz: 2.2, top: y + 6, bottom: y, walk: false }); }
    this.slope(0xffc93c, bx - 9, bz + 21, 0, bx - 9, bz + 4.6, 9, 3.4, { ticks: true });         // ruler to the first shelf
    this.slope(0xd9a45a, bx - 16.5, bz + 38, 0, bx - 16.5, bz + 4.6, 18, 3.6);                   // a long plank to the second
    for (const [lx, y] of [[6, 9], [-15, 9], [-8, 18], [16, 18], [12, 27], [-14, 27]]) this.spot(bx + lx, y, bz + 2.6, y > 20 ? 3 : 2);
    this.shelfTop = { x: bx - 10, y: 36, z: bz };
    this.box(wood, bx, 36, bz - 3.6, bw + 4, 1.6, 3, { e: 0.3, collide: false }); for (const s of [-1, 1]) this.blob(0xffc93c, bx + s * (bw / 2 + 1), 38.2, bz - 3.6, 1.2);
    this.post(0xe5484d, bx + 14, 36, bz - 1, 1.8, 2.6, { r2: 1.3, walk: true }); for (let k = 0; k < 5; k++) this.blob(0x5fd08a, bx + 14 + Math.cos(k * 1.3) * 1.6, 39.4 + (k % 2) * 0.8, bz - 1 + Math.sin(k * 1.3) * 1.6, 1.3); for (let k = 0; k < 4; k++) this.blob(0x43b869, bx + 16.4, 37.4 - k * 1.7, bz + 1.4 + k * 0.5, 0.75);   // a pot plant trailing down
    this.post(0xf5e8c6, bx - 14, 27, bz - 0.4, 1.3, 3.2, { walk: true, r2: 0.9 }); this.blob(0x4a7dff, bx - 14, 31.2, bz - 0.4, 1.5); this.box(0xffc93c, bx + 3, 9, bz + 0.6, 3.6, 3, 0.6, { e: 0.2, collide: false }); this.blob(0xff6fa5, bx + 3, 10.5, bz + 0.95, 0.9, [1, 1, 0.3]);            // a vase, and a photo frame
    // ---- odds and ends on the floor
    this.box(0xe5484d, -8, 0, 59, 6, 2.2, 3.4, { e: 0.45, ry: 0.5, soft: true }); this.box(0xe5484d, -1, 0, 61, 6, 2.2, 3.4, { e: 0.45, ry: -0.3, soft: true });     // his spare slippers
    this.box(0x6a6ff0, -14, 0, 44, 7, 1.2, 9, { e: 0.2, ry: 0.3 }); this.box(0xff8a3c, -14.5, 1.2, 44.4, 6.4, 1, 8.4, { e: 0.2, ry: 0.5 });                              // a pile of books
    this.post(0x5fd08a, -78, 0, 30, 2.4, 5, { r2: 3, walk: true }); this._add('a', ball(3.6, -78, 8, 30, C(0x43b869), [1, 1.3, 1])); this._add('a', ball(2.4, -76, 11, 31, C(0x5fd06a)));  // a pot plant
    for (const [x, z] of [[-84, 32], [-52, 58], [-20, 62], [8, 60], [16, -30], [-84, -60], [-60, -62], [-22, -62], [-6, 6], [-64, 8], [-30, -22], [-50, 30]]) this.spot(x, 0, z, 1);
    for (const [x, z] of [[-80, 40], [-30, 50], [4, 50], [-84, -40], [-10, -30], [-56, 46], [14, -52]]) this.tool(x, 0, z);
    this.tool(fx + 2, 10.4, fz - 5); this.tool(cx + 3, 7.5, cz - 4);
  }
  _kitchen() {
    const H = HOUSE, r = this.R, wood = 0xd9a45a;
    // ---- the island that divides the rooms
    const ix = 30, iz = -22; this.box(0xf5e8c6, ix, 0, iz, 10, 18.6, 38, { e: 0.14 }); this.box(0x8a5a36, ix, 18.6, iz, 11.6, 1.4, 40, { e: 0.2 }); this.island = { x: ix, y: 20, z: iz };
    this.slope(0xbd7f45, ix + 32, iz - 14, 0, ix + 5.6, iz - 14, 20, 3.4);                             // a broom leaning on it
    this._add('a', cyl(0.5, 0.5, 30, ix + 3, 34, iz - 16, C(0x6f7a9a))); this._add('a', ball(3.2, ix + 3, 20.8, iz - 16, C(0xff8a3c), [1, 0.5, 1])); this.blob(0xe5484d, ix + 2, 22.6, iz - 15.4, 1.3); this.blob(0x5fd08a, ix + 4.2, 22.5, iz - 16.6, 1.2); this.blob(0xffd23c, ix + 3, 22.9, iz - 17.4, 1.1, [1.8, 0.8, 0.8]);  // fruit bowl
    for (const [lx, lz] of [[-2, -12], [2, 0], [-1, 9], [3, -6]]) this.spot(ix + lx, 20, iz + lz, 2);
    // ---- kitchen table and four chairs
    const tx = 60, tz = 30; this.table(wood, tx, tz, 30, 20, 17, { leg: 0xbd7f45 }); this.ktable = { x: tx, y: 17, z: tz };
    this.chair(0xe5484d, tx - 8, tz - 14, 0); this.chair(0xe5484d, tx + 8, tz - 14, 0); this.chair(0xe5484d, tx - 8, tz + 14, Math.PI); this.chair(0xe5484d, tx + 8, tz + 14, Math.PI);
    this.slope(0x6a6ff0, tx - 26, tz - 14, 0, tx - 12.4, tz - 14, 10.2, 3.2);                            // a cookbook up to a chair
    this.slope(0xbd7f45, tx - 8, tz - 17, 10.2, tx - 8, tz - 9.6, 17, 3);                                // a wooden spoon from the chair to the table
    this.box(0x35c4b0, tx + 12.4, 17, tz - 2, 4.6, 1.7, 7, { e: 0.2 });                                  // a recipe book: the step up to the counter
    this._add('a', cyl(4.2, 3, 0.6, tx + 6, 17.3, tz + 2, C(0xf5e8c6))); this._add('a', cyl(1.6, 1.6, 4.4, tx - 4, 19.2, tz - 3, C(0xe5484d)));  // plate, salt
    for (const [lx, lz] of [[-10, -5], [0, 5], [6, 2], [11, -6], [-4, 0]]) this.spot(tx + lx, 17, tz + lz, 2);
    this.spot(tx - 8, 10.2, tz - 13, 1); this.spot(tx + 8, 10.2, tz + 13, 1); this.spot(tx + 3, 0, tz + 2, 1); this.spot(tx - 6, 0, tz - 3, 1);
    // ---- counter along the east wall, with a sink and a stove
    const cx = H.x1 - 7, cz = -22; this.box(0xf5e8c6, cx, 0, cz, 13, 19, 88, { e: 0.1 }); this.box(0x8a5a36, cx - 0.6, 19, cz, 14.6, 1.4, 89, { e: 0.14 }); this.counter = { x: cx, y: 20.4, z: cz };
    for (let k = 0; k < 5; k++) { this.box(0xe6d8b8, cx - 6.7, 3 + (k % 2) * 8, cz - 34 + k * 17, 0.6, 6.4, 13, { collide: false, e: 0.2 }); this._add('a', ball(0.7, cx - 7.3, 6.2 + (k % 2) * 8, cz - 34 + k * 17, C(0xffc93c))); }
    this.box(0xb8c4d0, cx, 20.4, cz + 26, 9, 0.5, 14, { collide: false, e: 0.2 }); this._add('a', cap(0.5, 5, cx + 4, 23, cz + 26, C(0xb8c4d0))); this._add('a', cap(0.5, 3, cx + 2, 25.6, cz + 26, C(0xb8c4d0), 0, Math.PI / 2));   // sink and tap
    this.box(0x474c66, cx, 20.4, cz - 26, 10, 0.5, 14, { collide: false, e: 0.2 }); for (const [a, b] of [[-2.4, -3.4], [2.4, -3.4], [-2.4, 3.4], [2.4, 3.4]]) this._add('a', torus(1.7, 0.24, cx + a, 20.95, cz - 26 + b, C(0xe5484d)));
    for (let k = 0; k < 11; k++) this.box(k % 2 ? 0xf5e8c6 : 0x57b9b0, H.x1 - 0.3, 21 + (k % 2) * 0.01, cz - 40 + k * 8, 0.3, 9, 8, { collide: false, e: 0.1 });                 // tiles up the wall
    for (const [k, col] of [[-14, 0xe5484d], [-10, 0xffc93c], [-6, 0x5fd08a]]) { this._add('a', cap(0.3, 5, H.x1 - 1, 30, cz + k, C(0xbd7f45))); this.blob(col, H.x1 - 1, 26.4, cz + k, 1.2, [0.4, 1.2, 1]); }   // spoons on hooks
    this.box(0xff8a3c, cx - 7.6, 11, cz + 12, 0.5, 7, 5, { collide: false, e: 0.35 });                                                                                         // a tea towel
    this.post(0xffe9a8, cx + 1, 20.4, cz + 2, 3.2, 6.4, { walk: true }); this._add('a', ball(3.3, cx + 1, 27, cz + 2, C(0xe5484d), [1, 0.4, 1])); this._add('a', ball(1, cx + 1, 28.6, cz + 2, C(0xffc93c)));                       // the cookie jar
    this.slope(0x5fd08a, cx - 30, cz - 2, 0, cx - 7.6, cz - 2, 20.4, 3.2);                                // a mop up to the counter
    for (const k of [-36, -14, 10, 36]) this.spot(cx - 2.5, 20.4, cz + k, 3);
    // ---- the fridge and the bin
    this.box(0xdfe8f0, H.x1 - 9, 0, 54, 16, 46, 18, { e: 0.16 }); this.box(0xb8c4d0, H.x1 - 17.4, 14, 60, 0.8, 16, 1.2, { collide: false, e: 0.4 }); this.box(0xc8d4e0, H.x1 - 17.1, 29, 54, 0.3, 0.5, 17, { collide: false, e: 0.3 });
    for (const [y, z, col] of [[24, 49, 0xe5484d], [20, 52, 0xffc93c], [26, 57, 0x5fd08a], [18, 47, 0x4a7dff]]) this.blob(col, H.x1 - 17.2, y, z, 0.9, [0.3, 1, 1]);                 // fridge magnets
    this.post(0x6f7a9a, 44, 0, H.z0 + 9, 5.4, 12, { r2: 4.4, walk: true }); this._add('a', ball(5.6, 44, 12, H.z0 + 9, C(0x474c66), [1, 0.3, 1])); for (const g of eyes(44, 8, H.z0 + 14.2, 0.9, 1.3)) this._add('a', g);   // the bin is watching
    for (const g of eyes(0, 0, 0, 1.6, 2.4)) this._add('a', g.rotateY(-Math.PI / 2).translate(H.x1 - 17.2, 34, 54));   // so is the fridge
    for (const g of eyes(0, 0, 0, 1.3, 2.0)) this._add('a', g.rotateY(Math.PI).translate(-40, 33, H.z1 - 7.9));        // and the telly
    // ---- the cat's bowl and a stool
    this.post(0x35c4b0, 36, 0, 58, 3.6, 1.6, { r2: 4.2, walk: true }); this.table(0xbd7f45, 52, H.z0 + 14, 9, 9, 11);
    this.spot(52, 11, H.z0 + 14, 2); this.spot(36, 1.6, 58, 1);
    for (const [x, z] of [[40, 60], [70, 62], [84, 34], [50, -56], [70, -40], [40, 0], [66, 4], [28, 20], [74, -62]]) this.spot(x, 0, z, 1);
    for (const [x, z] of [[46, 50], [72, 50], [58, -20], [38, -60], [26, 34]]) this.tool(x, 0, z);
    this.tool(tx + 9, 17, tz + 4); this.tool(cx - 2, 20.4, cz + 20); this.tool(ix, 20, iz + 14);
  }
  _den() {
    const D = DEN, H = HOUSE, T = 2, dirt = 0x8a5a36;
    // the bean family home: three walls of earth, a bed, fairy lights and the swag pile
    this.addBox({ x: D.x - D.hx - T / 2, z: D.z, hx: T / 2, hz: D.hz + T, top: 30, walk: false });
    this.addBox({ x: D.x, z: D.z - D.hz - T / 2, hx: D.hx + T, hz: T / 2, top: 30, walk: false }); this.addBox({ x: D.x, z: D.z + D.hz + T / 2, hx: D.hx + T, hz: T / 2, top: 30, walk: false });
    for (const [x, z, sx, sz] of [[D.x - D.hx - 1, D.z, 2, D.hz * 2 + 4], [D.x, D.z - D.hz - 1, D.hx * 2 + 2, 2], [D.x, D.z + D.hz + 1, D.hx * 2 + 2, 2]]) this.box(dirt, x, 0, z, sx, 8, sz, { collide: false, e: 0.2, key: 'w' });
    this.box(0x6f4a2c, D.x, 7.6, D.z, D.hx * 2 + 4, 2, D.hz * 2 + 4, { collide: false, e: 0.2, key: 'w' });
    this.box(0x6a6ff0, D.x - 5, 0, D.z - 5, 5, 1, 3.4, { e: 0.5, soft: true }); this.box(0xf5e8c6, D.x - 6.6, 1, D.z - 5, 1.6, 0.6, 2.6, { e: 0.6, collide: false });   // a matchbox bed
    this.box(0xffc93c, D.x - 5.6, 0, D.z + 4.6, 5, 0.3, 5, { collide: false, e: 0.4 });                                                                           // the swag mat
    this.swag = { x: D.x - 5.6, z: D.z + 4.6 };
    for (let k = 0; k < 7; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshBasicMaterial({ color: [0xff5d73, 0xffc93c, 0x5fd08a, 0x5bc8ff][k % 4] })); m.position.set(D.x - D.hx + 1.5 + k * 2.4, 6.2 - Math.sin(k / 6 * Math.PI) * 1.2, D.z - D.hz + 0.4); this.group.add(m); }
    this.spawn = [D.x + 2, D.z];
  }
  // Where a giant can walk without putting a foot through the furniture, and the Roomba's round
  _paths() {
    this.nodes = { S: [-40, -3], L: [-60, -8], R: [-14, -6], SL: [-62, 30], SR: [-16, 32], C: [-40, 40], H: [-74, 44], K1: [10, 16], K2: [40, 4], K3: [56, -54], K4: [30, 54], N: [8, -50] };
    this.links = [['S', 'L'], ['S', 'R'], ['L', 'SL'], ['R', 'SR'], ['SL', 'C'], ['SR', 'C'], ['SL', 'H'], ['R', 'K1'], ['SR', 'K1'], ['K1', 'K2'], ['K1', 'K4'], ['R', 'N'], ['N', 'K3']];
    this.roomba = [[-60, 26], [-22, 27], [10, 20], [24, 10], [24, 40], [34, 54], [2, 48], [-30, 48], [-64, 40]];
  }
  // The route between two of Grandpa's standing places (a list of node names)
  route(from, to) {
    const prev = { [from]: null }, q = [from];
    while (q.length) { const n = q.shift(); if (n === to) break; for (const [a, b] of this.links) { const m = a === n ? b : b === n ? a : null; if (m && !(m in prev)) { prev[m] = n; q.push(m); } } }
    const out = []; for (let n = to; n; n = prev[n]) out.unshift(n); return out;
  }
  nearestNode(x, z) { let best = 'S', bd = 1e9; for (const k in this.nodes) { const d = Math.hypot(this.nodes[k][0] - x, this.nodes[k][1] - z); if (d < bd) { bd = d; best = k; } } return best; }
}
