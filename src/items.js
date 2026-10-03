// Everything a bean can pick up, built from toy shapes: the loot (coins, false teeth, Grandma's china),
// and the things that are only good for hitting your friends with (frying pan, rubber chicken, a fish).
// Loose items are little physics objects: they fall, bounce, roll, spin and smash, and every knock is a noise.
import * as THREE from 'three';
import { ITEMS } from './config.js';
import { toyMat } from './materials.js';
import { C, ball, cap, cyl, cone, torus, rbox, slab, eyes, merge, WHITE, BLACK } from './shapes.js';
import { clamp } from './util.js';
import { addOutline } from './toon.js';

const GOLD = C(0xffc93c), SILVER = C(0xc4ccd8), PI = Math.PI;
// Each builder returns pieces. Loot sits centred on the origin; tools have their handle at the origin and stick up (+y).
const MAKE = {
  coin: () => [cyl(0.75, 0.75, 0.16, 0, 0, 0, GOLD), torus(0.55, 0.05, 0, 0.09, 0, C(0xe0a520)), ball(0.2, 0, 0.08, 0, C(0xe0a520), [1, 0.3, 1])],
  button: () => [cyl(0.55, 0.55, 0.14, 0, 0, 0, C(0xe5484d)), torus(0.42, 0.06, 0, 0.07, 0, C(0xb8323a)), ...[[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].map(([x, z]) => ball(0.07, x, 0.07, z, BLACK))],
  cookie: () => [cyl(1.0, 0.95, 0.3, 0, 0, 0, C(0xd9a05a)), ...[0, 1, 2, 3, 4, 5, 6].map(i => ball(0.14, Math.cos(i * 2.4) * 0.55 * (i % 2 ? 1 : 0.5), 0.16, Math.sin(i * 2.4) * 0.55, C(0x4a2c1a), [1, 0.6, 1]))],
  sugar: () => [rbox(0.9, 0.9, 0.9, 0, 0, 0, C(0xffffff), 0, 0, 0.2)],
  cheese: () => { const g = new THREE.CylinderGeometry(1.5, 1.5, 0.9, 12, 1, false, 0, PI / 3); g.translate(-0.6, 0, -0.5); return [Object.assign(g, {}).setAttribute && paintGeo(g, C(0xffd23c)), ball(0.22, 0.1, 0.46, 0.25, C(0xe0a520)), ball(0.16, -0.25, 0.46, 0.5, C(0xe0a520)), ball(0.2, 0.3, 0.2, 0.95, C(0xe0a520))]; },
  marble: () => [ball(0.45, 0, 0, 0, C(0x4a7dff)), ball(0.3, 0.12, 0.12, 0.12, C(0x9fdcff)), ball(0.14, 0.26, 0.22, 0.2, WHITE)],
  candy: () => [ball(0.42, 0, 0, 0, C(0xff6fa5), [1.3, 1, 1]), cone(0.3, 0.45, 0.72, 0, 0, C(0xffd6e6), 0, PI / 2), cone(0.3, 0.45, -0.72, 0, 0, C(0xffd6e6), 0, -PI / 2), torus(0.42, 0.06, 0, 0, 0, WHITE, 0, 0)],
  key: () => [torus(0.42, 0.14, -1.0, 0, 0, GOLD, PI / 2), cap(0.12, 1.5, 0.2, 0, 0, GOLD, 0, PI / 2), slab(0.16, 0.14, 0.4, 0.85, 0, 0.25, GOLD), slab(0.16, 0.14, 0.3, 0.55, 0, 0.2, GOLD)],
  ring: () => [torus(0.5, 0.13, 0, 0, 0, GOLD, 0), ball(0.26, 0, 0.58, 0, C(0x7af0ff)), cone(0.2, 0.2, 0, 0.44, 0, GOLD, PI)],
  thimble: () => [cyl(0.4, 0.52, 0.8, 0, 0, 0, SILVER), ball(0.4, 0, 0.4, 0, SILVER, [1, 0.5, 1]), torus(0.52, 0.06, 0, -0.38, 0, SILVER)],
  tooth: () => [ball(0.38, 0, 0.12, 0, GOLD, [1, 0.9, 0.9]), cone(0.16, 0.45, -0.16, -0.3, 0, GOLD, PI), cone(0.16, 0.45, 0.16, -0.3, 0, GOLD, PI), ball(0.1, 0.14, 0.3, 0.26, WHITE)],
  medal: () => [cyl(0.7, 0.7, 0.14, 0, 0, 0.55, GOLD), ball(0.3, 0, 0.08, 0.55, C(0xe0a520), [1, 0.4, 1]), rbox(0.7, 0.1, 1.1, 0, 0, -0.4, C(0xe5484d), 0, 0, 0.2), rbox(0.24, 0.12, 1.1, 0, 0.01, -0.4, C(0x4a7dff), 0, 0, 0.2)],
  battery: () => [cyl(0.38, 0.38, 1.3, 0, 0, 0, C(0x2a2a30), 0, PI / 2), cyl(0.39, 0.39, 0.5, 0.45, 0, 0, C(0xffc93c), 0, PI / 2), cyl(0.14, 0.14, 0.14, 0.72, 0, 0, SILVER, 0, PI / 2)],
  stamp: () => [rbox(1.3, 0.06, 1.0, 0, 0, 0, C(0xf5e8c6), 0, 0, 0.15), rbox(1.0, 0.07, 0.7, 0, 0.01, 0, C(0xe5484d), 0, 0, 0.15), ball(0.2, 0, 0.05, 0, C(0xffc93c), [1, 0.2, 1])],
  sock: () => [cap(0.5, 1.4, 0, 0.6, 0, WHITE.map(v => v * 0.45)), cap(0.48, 1.0, 0.6, -0.25, 0, WHITE.map(v => v * 0.45), 0, PI / 2), torus(0.5, 0.1, 0, 1.2, 0, C(0xe5484d)), torus(0.5, 0.1, 0, 0.85, 0, C(0xe5484d)), ball(0.2, 1.1, -0.2, 0.2, C(0x5fd08a))],
  hearing: () => [ball(0.45, 0, 0, 0, C(0xd9c59a), [0.7, 1.2, 0.6]), torus(0.36, 0.07, 0.1, 0.42, 0, C(0xcccccc), 0, 0, PI), ball(0.1, 0.44, 0.36, 0, C(0xe5484d))],
  watch: () => [cyl(1.25, 1.25, 0.3, 0, 0, 0, GOLD), cyl(1.05, 1.05, 0.06, 0, 0.16, 0, C(0xffffff)), slab(0.08, 0.05, 0.7, 0, 0.2, -0.3, BLACK), slab(0.5, 0.05, 0.08, 0.22, 0.2, 0, BLACK), torus(0.3, 0.1, 0, 0, -1.45, GOLD), ...[0, 1, 2, 3].map(i => torus(0.2, 0.06, 0.25 * i, 0, -1.85 - i * 0.25, GOLD, i % 2 ? 0 : PI / 2))],
  teeth: () => [...[-1, 1].flatMap(s => [torus(0.8, 0.28, 0, s * 0.3, 0, C(0xff7a90), PI / 2, 0, PI), ...[0, 1, 2, 3, 4, 5, 6].map(i => { const a = i / 6 * PI; return ball(0.2, Math.cos(a) * 0.8, s * 0.12, Math.sin(a) * 0.8, WHITE, [1, 1.3, 1]); })])],
  glasses: () => [torus(0.85, 0.12, -1.0, 0, 0, C(0x33384a), 0), torus(0.85, 0.12, 1.0, 0, 0, C(0x33384a), 0), cap(0.09, 0.3, 0, 0.1, 0, C(0x33384a), 0, PI / 2), cap(0.08, 1.9, -1.85, 0, -1.0, C(0x33384a), PI / 2), cap(0.08, 1.9, 1.85, 0, -1.0, C(0x33384a), PI / 2), cyl(0.78, 0.78, 0.04, -1.0, 0, 0, C(0xbfe8ff), PI / 2), cyl(0.78, 0.78, 0.04, 1.0, 0, 0, C(0xbfe8ff), PI / 2)],
  remote: () => [rbox(1.5, 0.55, 4.8, 0, 0, 0, C(0x33384a), 0, 0, 0.25), ball(0.28, 0, 0.3, -1.8, C(0xe5484d), [1, 0.5, 1]), ...[0, 1, 2, 3, 4, 5].map(i => ball(0.17, (i % 2 ? 0.32 : -0.32), 0.3, -0.9 + Math.floor(i / 2) * 0.7, C([0x5fd08a, 0xffc93c, 0x5bc8ff][i % 3]), [1, 0.5, 1])), rbox(0.9, 0.1, 1.0, 0, 0.28, 1.4, C(0x6f7a9a), 0, 0, 0.3)],
  spoon: () => [cap(0.16, 3.6, 0, 0, 0.6, SILVER, PI / 2), ball(0.85, 0, -0.05, -2.2, SILVER, [1, 0.35, 1.3])],
  plate: () => [cyl(2.1, 1.5, 0.28, 0, 0, 0, C(0xffffff)), torus(1.9, 0.09, 0, 0.14, 0, C(0x4a7dff)), ...[0, 1, 2, 3, 4, 5].map(i => ball(0.14, Math.cos(i * 1.05) * 1.1, 0.16, Math.sin(i * 1.05) * 1.1, C(0x4a7dff), [1, 0.3, 1]))],
  camel: () => [cap(0.5, 1.3, 0, 0.9, 0, GOLD, 0, PI / 2), ball(0.46, -0.3, 1.4, 0, GOLD), ball(0.42, 0.4, 1.38, 0, GOLD), cap(0.18, 0.9, 1.1, 1.5, 0, GOLD, 0, -0.5), cap(0.22, 0.35, 1.55, 2.05, 0, GOLD, 0, PI / 2), ...[[-0.6, -0.25], [-0.6, 0.25], [0.6, -0.25], [0.6, 0.25]].map(([x, z]) => cyl(0.1, 0.08, 0.9, x, 0.25, z, GOLD)), ball(0.11, 1.62, 2.16, 0.16, WHITE), ball(0.05, 1.68, 2.17, 0.22, BLACK), rbox(1.8, 0.2, 1.0, 0, -0.25, 0, C(0x8a5a36), 0, 0, 0.2)],
  wallet: () => [rbox(3.6, 0.9, 2.6, 0, 0, 0, C(0x8a5a36), 0, 0, 0.3), rbox(3.0, 0.2, 1.2, 0.2, 0.42, -0.9, C(0x5fd08a), 0, 0, 0.2), rbox(3.62, 0.94, 0.3, 0, 0, 0.5, C(0x6f4a2c), 0, 0, 0.3), ball(0.22, 1.5, 0.2, 1.3, GOLD)],
  pan: () => [cap(0.2, 2.2, 0, 1.1, 0, C(0x33384a)), cyl(1.5, 1.3, 0.4, 0, 3.6, 0, C(0x474c66), PI / 2), cyl(1.3, 1.3, 0.06, 0, 3.6, 0.2, C(0x24242e), PI / 2)],
  pillow: () => [rbox(2.4, 3.4, 1.1, 0, 1.8, 0, C(0xe8f2ff), 0, 0, 0.55), ...[[-1, 0.3], [1, 0.3], [-1, 3.3], [1, 3.3]].map(([x, y]) => ball(0.22, x, y, 0, C(0x9fc8ff)))],
  swatter: () => [cap(0.12, 3.0, 0, 1.5, 0, C(0x5fd08a)), rbox(1.7, 1.9, 0.12, 0, 4.0, 0, C(0xffc93c), 0, 0, 0.25), ...[-1, 0, 1].map(i => slab(1.5, 0.06, 0.14, 0, 4.0 + i * 0.5, 0, C(0xe0a520)))],
  baguette: () => [cap(0.5, 4.0, 0, 2.4, 0, C(0xd9a05a)), ...[0, 1, 2, 3].map(i => rbox(0.8, 0.12, 0.2, 0, 1.2 + i * 0.85, 0.42, C(0xf2d8a0), 0, 0.5, 0.3))],
  chicken: () => [cap(0.5, 1.5, 0, 1.4, 0, C(0xffd23c)), ball(0.5, 0, 2.7, 0.15, C(0xffd23c)), cone(0.2, 0.55, 0, 2.65, 0.7, C(0xff7a1a), PI / 2), ball(0.24, 0, 3.2, 0.1, C(0xe5484d)), ...eyes(0, 2.85, 0.42, 0.17, 0.2), cap(0.1, 0.7, -0.22, 0.3, 0, C(0xff7a1a)), cap(0.1, 0.7, 0.22, 0.3, 0, C(0xff7a1a))],
  paper: () => [cyl(0.45, 0.45, 4.2, 0, 2.1, 0, C(0xe8e4d8)), torus(0.46, 0.06, 0, 1.2, 0, C(0xe5484d)), ...[0, 1, 2, 3, 4].map(i => slab(0.5, 0.04, 0.02, 0.05, 2.2 + i * 0.4, 0.45, BLACK))],
  fish: () => [ball(0.7, 0, 2.0, 0, C(0x7fa8c8), [0.5, 1.9, 1]), cone(0.7, 0.9, 0, 0.5, 0, C(0x5f88a8), PI), ...eyes(0, 2.9, 0.3, 0.16, 0.001).slice(0, 0), ball(0.16, 0.3, 2.9, 0.3, WHITE), ball(0.07, 0.36, 2.9, 0.4, BLACK), ball(0.16, -0.3, 2.9, 0.3, WHITE), ball(0.07, -0.36, 2.9, 0.4, BLACK), cone(0.3, 0.6, 0, 2.3, -0.7, C(0x5f88a8), -PI / 2)],
  glove: () => [cap(0.14, 0.8, 0, 0.4, 0, SILVER), ball(1.0, 0, 1.9, 0, C(0xe5484d), [1, 1.1, 0.9]), ball(0.42, 0.85, 1.6, 0.2, C(0xe5484d)), torus(0.6, 0.2, 0, 1.0, 0, WHITE)],
  mallet: () => [cap(0.14, 2.6, 0, 1.3, 0, C(0x4a7dff)), cyl(0.8, 0.8, 1.8, 0, 3.0, 0, C(0xffd23c), 0, PI / 2), cyl(0.82, 0.82, 0.3, 0.8, 3.0, 0, C(0xe5484d), 0, PI / 2), cyl(0.82, 0.82, 0.3, -0.8, 3.0, 0, C(0xe5484d), 0, PI / 2)],
  banana: () => [cap(0.32, 0.9, 0, 0.6, 0, C(0xffe04a), 0, 0.3), cap(0.34, 0.9, -0.28, 1.4, 0, C(0xffe04a)), cap(0.32, 0.9, 0, 2.2, 0, C(0xffe04a), 0, -0.3), ball(0.16, 0.22, 0, 0, C(0x6f4a2c)), ball(0.14, 0.2, 2.8, 0, C(0x6f4a2c))],
  horn: () => [cyl(0.5, 0.5, 1.3, 0, 0.65, 0, C(0xe5484d)), cone(0.75, 1.1, 0, 1.9, 0, C(0xf5e8c6), PI), ball(0.2, 0, 1.38, 0.3, C(0xffc93c))],
  whoopee: () => [ball(1.1, 0, 0.2, 0, C(0xff6fa5), [1, 0.3, 1]), cap(0.16, 0.5, 1.2, 0.2, 0, C(0xe0508a), 0, PI / 2)],
  radio: () => [rbox(2.0, 1.4, 0.8, 0, 0.7, 0, C(0x35c4b0), 0, 0, 0.3), cyl(0.45, 0.45, 0.1, -0.45, 0.75, 0.42, C(0x24242e), PI / 2), ball(0.14, 0.5, 1.0, 0.42, C(0xffc93c)), ball(0.14, 0.5, 0.55, 0.42, C(0xe5484d)), cap(0.04, 1.2, 0.8, 1.9, 0, SILVER, 0, -0.3), ...eyes(-0.45, 1.05, 0.44, 0.001, 0.001).slice(0, 0)],
  pie: () => [cyl(1.0, 0.75, 0.3, 0, 0.15, 0, SILVER), ball(0.9, 0, 0.34, 0, WHITE, [1, 0.45, 1]), ...[0, 1, 2, 3, 4].map(i => ball(0.26, Math.cos(i * 1.26) * 0.5, 0.62, Math.sin(i * 1.26) * 0.5, WHITE)), ball(0.2, 0, 0.9, 0, C(0xe5484d))],
  spring: () => [cyl(0.9, 0.9, 0.14, 0, 0.07, 0, C(0x474c66)), ...[0, 1, 2, 3, 4].map(i => torus(0.6 - i * 0.04, 0.09, 0, 0.3 + i * 0.3, 0, SILVER)), cyl(0.6, 0.6, 0.14, 0, 1.75, 0, C(0xe5484d)), ...eyes(0, 1.95, 0.2, 0.12, 0.16)],
  glue: () => [cyl(0.6, 0.5, 0.9, 0, 0.45, 0, C(0xf5e8c6)), ball(0.62, 0, 0.9, 0, C(0xfff3a0), [1, 0.35, 1]), ball(0.2, 0.55, 0.6, 0.1, C(0xfff3a0), [1, 1.6, 1]), cap(0.07, 1.0, 0.2, 1.4, 0, C(0xbd7f45), 0, -0.3), rbox(0.7, 0.4, 0.05, 0, 0.45, 0.56, C(0xe5484d), 0, 0, 0.2)],
  jack: () => [rbox(1.3, 1.1, 1.3, 0, 0.55, 0, C(0x4a7dff), 0, 0, 0.2), ...[[-0.66, 0], [0.66, 0]].map(([x]) => ball(0.2, x, 0.6, 0, C(0xffc93c), [0.3, 1, 1])), ...[0, 1, 2].map(i => torus(0.3, 0.07, 0, 1.25 + i * 0.22, 0, SILVER)), ball(0.5, 0, 2.3, 0, C(0xffd9b0)), cone(0.4, 0.7, 0, 2.95, 0, C(0xe5484d)), ball(0.16, 0, 2.3, 0.48, C(0xe5484d)), ...eyes(0, 2.45, 0.38, 0.12, 0.2), cap(0.07, 0.6, 0.95, 0.6, 0, C(0xffc93c), 0, Math.PI / 2)],
  bubble: () => [rbox(2.4, 0.12, 1.8, 0, 0.06, 0, C(0xcfeaff), 0, 0, 0.2), ...Array.from({ length: 20 }, (_, i) => ball(0.17, -0.95 + (i % 5) * 0.48, 0.16, -0.66 + Math.floor(i / 5) * 0.44, C(0xe8f6ff), [1, 0.7, 1]))],
  alarm: () => [cyl(0.7, 0.7, 0.4, 0, 0.9, 0, C(0xe5484d), Math.PI / 2), cyl(0.56, 0.56, 0.06, 0, 0.9, 0.22, C(0xffffff), Math.PI / 2), slab(0.07, 0.42, 0.04, 0, 1.06, 0.27, BLACK), slab(0.3, 0.07, 0.04, 0.12, 0.9, 0.27, BLACK), ball(0.3, -0.5, 1.6, 0, C(0xffc93c), [1, 0.7, 1]), ball(0.3, 0.5, 1.6, 0, C(0xffc93c), [1, 0.7, 1]), cap(0.05, 0.3, 0, 1.75, 0, SILVER), cap(0.08, 0.3, -0.4, 0.2, 0, SILVER, 0, 0.4), cap(0.08, 0.3, 0.4, 0.2, 0, SILVER, 0, -0.4)],
  helium: () => [cap(0.05, 1.0, 0, 0.5, 0, C(0x8a5a36)), ...[[0, 0xe5484d], [1, 0x5bc8ff], [2, 0xffc93c]].flatMap(([i, c]) => [ball(0.55, (i - 1) * 0.6, 2.3 + (i % 2) * 0.4, (i - 1) * 0.15, C(c), [1, 1.2, 1]), cyl(0.015, 0.015, 1.4, (i - 1) * 0.3, 1.5, 0, WHITE, 0, (i - 1) * -0.4)])],
  shrink: () => [rbox(0.6, 0.9, 0.5, 0, 0.45, 0, C(0x9b6bff), 0, 0, 0.3), rbox(0.55, 0.6, 1.6, 0, 1.1, -0.4, C(0x5fd08a), 0, 0, 0.35), ...[0, 1, 2].map(i => torus(0.32 - i * 0.07, 0.06, 0, 1.1, -1.3 - i * 0.22, C(0xffc93c), 0)), ball(0.16, 0, 1.1, -1.95, C(0xe5484d)), ball(0.2, 0, 1.55, -0.1, C(0x7af0ff))],
  magnet: () => [cap(0.14, 0.7, 0, 0.35, 0, C(0x474c66)), torus(0.6, 0.24, 0, 1.3, 0, C(0xe5484d), 0, 0, Math.PI), rbox(0.5, 0.36, 0.5, -0.6, 1.2, 0, WHITE.map(v => v * 0.45), 0, 0, 0.2), rbox(0.5, 0.36, 0.5, 0.6, 1.2, 0, WHITE.map(v => v * 0.45), 0, 0, 0.2)],
  blower: () => [rbox(0.9, 1.0, 1.4, 0, 0.9, 0, C(0xff8a3c), 0, 0, 0.35), cap(0.14, 0.6, 0, 0.3, 0.2, C(0x474c66)), cyl(0.28, 0.4, 1.8, 0, 0.95, -1.5, C(0x474c66), Math.PI / 2), torus(0.42, 0.06, 0, 0.95, -2.4, C(0xffc93c), 0), ball(0.3, 0.5, 1.0, 0.2, C(0x474c66))],
  peel: () => [ball(0.3, 0, 0.3, 0, C(0xffe04a)), ...[0, 1, 2, 3].map(i => { const a = i * PI / 2 + 0.4; return rbox(0.5, 0.1, 1.3, Math.cos(a) * 0.7, 0.08, Math.sin(a) * 0.7, C(0xffe04a), -a + PI / 2, 0, 0.3); })]
};
function paintGeo(g, col) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col[0]; a[i * 3 + 1] = col[1]; a[i * 3 + 2] = col[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const geoCache = new Map();
export function itemGeo(kind) {
  if (!geoCache.has(kind)) { const g = merge(MAKE[kind]().filter(Boolean)); g.computeBoundingSphere(); geoCache.set(kind, g); }
  return geoCache.get(kind);
}
export const isTool = kind => !!ITEMS[kind]?.tool;
const _v = { x: 0, z: 0 }, _vel = { x: 0, z: 0 };

export class Items {
  constructor(scene, house) { this.scene = scene; this.house = house; this.list = new Map(); this.group = new THREE.Group(); scene.add(this.group); this.onImpact = null; this.onRest = null; }
  clear() { for (const it of this.list.values()) this.group.remove(it.obj); this.list.clear(); }
  add(o) { // { id, kind, x, y, z }
    const D = ITEMS[o.kind] || { size: 1.4, w: 1 }, obj = new THREE.Group(), m = new THREE.Mesh(itemGeo(o.kind), toyMat); m.castShadow = true; obj.add(m); addOutline(obj, 0.0024);
    const it = { vx: 0, vy: 0, vz: 0, rx: 0, ry: Math.random() * 6.28, rz: 0, sx: 0, sy: 0, sz: 0, holders: [], state: 'free', rest: true, last: null, r: Math.max(0.3, (D.size || 1.4) * 0.3), tool: !!D.tool, age: 0, ...o, obj };
    it.y = o.y + (it.tool ? 0.05 : it.r * 0.5); obj.position.set(it.x, it.y, it.z); this.group.add(obj); this.list.set(it.id, it); return it;
  }
  remove(id) { const it = this.list.get(id); if (it) { this.group.remove(it.obj); this.list.delete(id); } }
  // The thing a bean is most likely reaching for
  nearest(x, y, z, fx, fz, range = 3.2) {
    let best = null, bd = 1e9;
    for (const it of this.list.values()) { if (it.state === 'gone' || it.kind === 'peel') continue; const dx = it.x - x, dz = it.z - z, d = Math.hypot(dx, dz); if (d > range + it.r || Math.abs(it.y - y - 0.6) > 2.6) continue; const dot = d > 0.6 ? (dx * fx + dz * fz) / d : 1; if (dot < 0.1) continue; const score = d - dot; if (score < bd) { bd = score; best = it; } }
    return best;
  }
  toss(it, p, v, spin) { it.holders = []; it.state = 'free'; it.rest = false; it.x = p[0]; it.y = p[1]; it.z = p[2]; it.vx = v[0]; it.vy = v[1]; it.vz = v[2]; it.sx = spin?.[0] ?? (Math.random() - 0.5) * 12; it.sz = spin?.[2] ?? (Math.random() - 0.5) * 12; it.sy = (Math.random() - 0.5) * 8; it.age = 0; }
  // holdersPos: id -> { x, y, z, yaw, pitch, swing (0..1), flat }. Moves held things to their holders and lets loose things fall.
  update(dt, who) {
    const H = this.house;
    for (const it of this.list.values()) {
      const D = ITEMS[it.kind] || {}; it.age += dt;
      const hs = it.holders.map(id => who.get(id)).filter(Boolean);
      if (hs.length) {
        it.state = 'held'; it.rest = false; const heavy = (D.w || 1) > 1;
        if (hs.length === 1) {
          const p = hs[0], fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
          if (heavy) { const tx = p.x + fx * (1.0 + it.r), tz = p.z + fz * (1.0 + it.r); it.x += (tx - it.x) * Math.min(1, dt * 12); it.z += (tz - it.z) * Math.min(1, dt * 12); it.y += (H.standAt(it.x, it.z, p.y + 1) + it.r * 0.5 + 0.1 - it.y) * Math.min(1, dt * 12); it.ry = p.yaw; it.rx = it.rz = 0; }
          else if (p.mine) { // in my own hand: drawn small and low so it never fills the screen
            const sw = p.swing || 0, wind = sw > 0 && sw < 0.35 ? sw / 0.35 : 0, hit = sw >= 0.35 ? Math.min(1, (sw - 0.35) * 3.4) : 0, cp = Math.cos(p.pitch), sp = Math.sin(p.pitch), k = it.tool ? 0.2 : Math.min(0.3, 0.45 / it.r * 0.3);
            const fwd = 0.85 + hit * 0.35, side = 0.5 - hit * 0.36, drop = (it.tool ? 0.62 : 0.36) - wind * 0.16 + hit * 0.1;
            it.x = p.x + fx * fwd * cp + rx * side; it.z = p.z + fz * fwd * cp + rz * side; it.y = p.y + p.eye - drop + sp * fwd;
            it.ry = p.yaw + Math.PI; it.rx = it.tool ? 0.3 - wind * 1.2 + hit * 1.7 - p.pitch : -p.pitch; it.rz = it.tool ? -0.2 : 0; it.fp = k;
          } else { // in a friend's hand: out to the right, and it goes with the swing
            const sw = p.swing || 0, wind = sw > 0 && sw < 0.35 ? sw / 0.35 : 0, hit = sw >= 0.35 ? Math.min(1, (sw - 0.35) * 3.4) : 0, reach = Math.min(0.85 + hit * 0.7, H.rayDist(p.x, p.y + 1.2, p.z, fx, 0, fz, 2.4) - 0.35);
            it.x = p.x + fx * reach + rx * (0.42 - hit * 0.3); it.z = p.z + fz * reach + rz * (0.42 - hit * 0.3); it.y = p.y + (it.tool ? 0.75 : 0.95) + wind * 0.5 - hit * 0.25 + Math.sin(p.pitch) * 0.5;
            it.ry = p.yaw + Math.PI; it.rx = it.tool ? 0.35 - wind * 1.3 + hit * 1.9 : 0; it.rz = it.tool ? -0.25 : 0;
          }
        } else { // two or more beans: it rides between them
          let x = 0, y = 0, z = 0; for (const p of hs) { x += p.x; y += p.y; z += p.z; } x /= hs.length; y /= hs.length; z /= hs.length;
          it.x += (x - it.x) * Math.min(1, dt * 14); it.z += (z - it.z) * Math.min(1, dt * 14); it.y += (y + 1.05 - it.y) * Math.min(1, dt * 14); it.ry = Math.atan2(hs[1].x - hs[0].x, hs[1].z - hs[0].z) + Math.PI / 2; it.rx = it.rz = 0;
        }
      } else if (!it.rest && it.state === 'free') {
        // ---- falling, bouncing, rolling
        it.vy -= 26 * dt; it.x += it.vx * dt; it.z += it.vz * dt; it.y += it.vy * dt;
        _v.x = it.x; _v.z = it.z; _vel.x = it.vx; _vel.z = it.vz;
        if (H.push(_v, it.y - it.r * 0.5, it.r * 0.6, _vel, it.r)) { const lost = Math.hypot(it.vx - _vel.x, it.vz - _vel.z); it.x = _v.x; it.z = _v.z; it.vx = _vel.x * 0.6; it.vz = _vel.z * 0.6; if (lost > 4) this.onImpact?.(it, lost); }
        const g = H.standAt(it.x, it.z, it.y + 0.3) + (it.tool ? 0.05 : it.r * 0.5);
        if (it.y <= g) {
          const hitV = -it.vy; it.y = g;
          if (hitV > 2.4) { it.vy = hitV * (D.roll ? 0.45 : 0.32); it.vx *= 0.7; it.vz *= 0.7; it.sx *= 0.6; it.sz *= 0.6; this.onImpact?.(it, hitV); }
          else { it.vy = 0; const f = Math.max(0, 1 - dt * (D.roll ? 0.9 : 7)); it.vx *= f; it.vz *= f; it.sx *= f; it.sz *= f; it.sy *= f; if (Math.hypot(it.vx, it.vz) < 0.25) { it.rest = true; it.vx = it.vz = 0; this.onRest?.(it); } }
        }
        if (D.roll) { it.rx += it.vz * dt / it.r; it.rz -= it.vx * dt / it.r; } else { it.rx += it.sx * dt; it.rz += it.sz * dt; it.ry += it.sy * dt; }
        if (it.y < -5) { it.y = 0.5; it.vy = 0; }
      } else if (it.rest && !D.roll && !it.armed) { const tgt = it.tool && !D.trap ? Math.PI / 2 : 0; it.rx += (tgt - it.rx) * Math.min(1, dt * 9); it.rz += (0 - it.rz) * Math.min(1, dt * 9); }   // settle flat on the ground
      it.obj.position.set(it.x, it.y, it.z); it.obj.rotation.set(it.rx, it.ry, it.rz, 'YXZ'); it.obj.scale.setScalar(it.fp && hs.length === 1 ? it.fp : 1); if (!hs.length) it.fp = 0;
      if (it.rest && !it.tool && !it.holders.length && D.v) it.obj.position.y += Math.sin(it.age * 2.4 + it.x) * 0.06;
      if (it.armed && it.rest) { const b = it.kind === 'spring' ? Math.abs(Math.sin(it.age * 5)) * 0.25 : Math.sin(it.age * 6) * 0.06; it.obj.rotation.set(0, it.ry + (it.kind === 'jack' ? Math.sin(it.age * 3) * 0.3 : 0), 0); it.obj.scale.set(1 - b * 0.4, 1 + b, 1 - b * 0.4); }                          // an armed trap can't keep still     // loot bobs a little so you can spot it
    }
  }
}
