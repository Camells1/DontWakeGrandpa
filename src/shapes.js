// Building blocks for every toy in the house: blobs, pills, soap-bar boxes, googly eyes.
// Each one returns a little piece with its colour baked in; merge() glues pieces into one shape.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const C = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
export const WHITE = [2.2, 2.2, 2.2], BLACK = [0.015, 0.015, 0.02];
export function paint(g, col) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col[0]; a[i * 3 + 1] = col[1]; a[i * 3 + 2] = col[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
export const place = (g, x, y, z, rx = 0, ry = 0, rz = 0) => { if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
export const ball = (r, x, y, z, col, s) => { const g = new THREE.SphereGeometry(r, 14, 10); if (s) g.scale(...s); return paint(place(g, x, y, z), col); };
export const cap = (r, len, x, y, z, col, rx = 0, rz = 0, ry = 0) => paint(place(new THREE.CapsuleGeometry(r, len, 4, 12), x, y, z, rx, ry, rz), col);
export const cyl = (rt, rb, h, x, y, z, col, rx = 0, rz = 0, seg = 16) => paint(place(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, rx, 0, rz), col);
export const cone = (r, h, x, y, z, col, rx = 0, rz = 0) => paint(place(new THREE.ConeGeometry(r, h, 12), x, y, z, rx, 0, rz), col);
export const torus = (R, r, x, y, z, col, rx = Math.PI / 2, rz = 0, arc = Math.PI * 2) => paint(place(new THREE.TorusGeometry(R, r, 8, 20, arc), x, y, z, rx, 0, rz), col);
export const slab = (sx, sy, sz, x, y, z, col, ry = 0) => paint(place(new THREE.BoxGeometry(sx, sy, sz), x, y, z, 0, ry), col);
// A box with every edge rounded off, like a bar of soap. e: 0.2 = nearly square, 0.5 = very round
export function rbox(sx, sy, sz, x, y, z, col, ry = 0, rz = 0, e = 0.3, rx = 0) {
  const g = new THREE.SphereGeometry(1, 16, 12), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, Math.sign(p.getX(i)) * Math.abs(p.getX(i)) ** e * sx / 2, Math.sign(p.getY(i)) * Math.abs(p.getY(i)) ** e * sy / 2, Math.sign(p.getZ(i)) * Math.abs(p.getZ(i)) ** e * sz / 2);
  g.computeVertexNormals(); return paint(place(g, x, y, z, rx, ry, rz), col);
}
// Two googly eyes looking out along +z, one pupil a bit off because nobody here is quite right
export const eyes = (x, y, z, r, gap) => [ball(r, x - gap, y, z, WHITE), ball(r * 1.12, x + gap, y, z, WHITE), ball(r * 0.46, x - gap + r * 0.15, y - r * 0.1, z + r * 0.72, BLACK), ball(r * 0.5, x + gap - r * 0.1, y + r * 0.18, z + r * 0.8, BLACK)];
export function merge(parts) { const g = mergeGeometries(parts.map(q => q.index ? q.toNonIndexed() : q)); for (const q of parts) q.dispose(); return g; }
