// Little puffs of everything: dust, broken china, sleepy Zs, stars round a dizzy head, hearts, confetti.
import * as THREE from 'three';

class Particles {
  constructor(max, additive) {
    this.max = max; this.cursor = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.rgba = new Float32Array(max * 4); this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4)); geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.uniforms = { uScale: { value: 600 } };
    this.mesh = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec4 aColor; attribute float aSize; uniform float uScale; varying vec4 vC;
        void main() { vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(-mv.z, 0.1); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec4 vC;
        void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, ${additive ? '0.0' : '0.32'}, d) * vC.a; if (a < 0.004) discard; gl_FragColor = vec4(vC.rgb${additive ? ' * a' : ''}, a); }`
    }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
  }
  emit(p) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z; this.vel[i * 3] = p.vx || 0; this.vel[i * 3 + 1] = p.vy || 0; this.vel[i * 3 + 2] = p.vz || 0;
    this.life[i] = this.maxLife[i] = p.life || 1; this.rgba[i * 4] = p.r ?? 1; this.rgba[i * 4 + 1] = p.g ?? 1; this.rgba[i * 4 + 2] = p.b ?? 1; this.rgba[i * 4 + 3] = p.a ?? 1;
    this.s0[i] = p.size ?? 0.1; this.s1[i] = p.size2 ?? this.s0[i]; this.grav[i] = p.grav ?? 0; this.drag[i] = p.drag ?? 0;
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.col[i * 4 + 3] = 0; continue; }
      this.life[i] -= dt; const k = 1 - this.life[i] / this.maxLife[i], j = i * 3, d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[j] *= d; this.vel[j + 2] *= d; this.vel[j + 1] = this.vel[j + 1] * d - this.grav[i] * dt;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < 0.05 && this.grav[i] > 0) { this.pos[j + 1] = 0.05; this.vel[j + 1] *= -0.3; this.vel[j] *= 0.6; this.vel[j + 2] *= 0.6; }
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k;
      this.col[i * 4] = this.rgba[i * 4]; this.col[i * 4 + 1] = this.rgba[i * 4 + 1]; this.col[i * 4 + 2] = this.rgba[i * 4 + 2]; this.col[i * 4 + 3] = this.rgba[i * 4 + 3] * Math.min(1, (1 - k) * 3);
    }
    const g = this.mesh.geometry; g.attributes.position.needsUpdate = g.attributes.aColor.needsUpdate = g.attributes.aSize.needsUpdate = true;
  }
}
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const CONF = [[1, 0.3, 0.4], [0.3, 0.8, 1], [1, 0.85, 0.3], [0.5, 1, 0.5], [0.8, 0.5, 1]];

export class Fx {
  constructor(scene) { this.soft = new Particles(2400, false); this.glow = new Particles(900, true); this.group = new THREE.Group(); this.group.add(this.soft.mesh, this.glow.mesh); scene.add(this.group); }
  dust(x, y, z, n = 8, s = 1) { for (let i = 0; i < n; i++) this.soft.emit({ x: x + rnd(0.3 * s), y: y + 0.1, z: z + rnd(0.3 * s), vx: rnd(1.6 * s), vy: 0.4 + Math.random() * s, vz: rnd(1.6 * s), life: 0.6 + Math.random() * 0.6, size: 0.25 * s, size2: 0.9 * s, r: 0.82, g: 0.76, b: 0.66, a: 0.5, drag: 2 }); }
  shards(x, y, z, n = 22, col = [1, 1, 1]) { for (let i = 0; i < n; i++) this.soft.emit({ x, y, z, vx: rnd(5), vy: 2 + Math.random() * 5, vz: rnd(5), life: 0.9 + Math.random() * 0.7, size: 0.16 + Math.random() * 0.14, r: col[0], g: col[1], b: col[2] * (0.8 + Math.random() * 0.2), grav: 18 }); }
  zzz(x, y, z, big = 1) { this.soft.emit({ x, y, z, vx: 0.6 * big, vy: 1.4 * big, vz: rnd(0.3), life: 2.4, size: 0.5 * big, size2: 1.6 * big, r: 0.85, g: 0.92, b: 1, a: 0.75 }); }
  hearts(x, y, z, n = 6) { for (let i = 0; i < n; i++) this.glow.emit({ x: x + rnd(0.4), y: y + rnd(0.2), z: z + rnd(0.4), vx: rnd(0.4), vy: 0.8 + Math.random() * 0.6, vz: rnd(0.4), life: 1.2 + Math.random() * 0.6, size: 0.18, r: 1, g: 0.35, b: 0.5 }); }
  stars(x, y, z) { for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28; this.glow.emit({ x: x + Math.cos(a) * 0.5, y, z: z + Math.sin(a) * 0.5, vx: -Math.sin(a) * 1.4, vy: 0.2, vz: Math.cos(a) * 1.4, life: 0.6, size: 0.14, r: 1, g: 0.9, b: 0.3 }); } }
  confetti(x, y, z, n = 60, s = 1) { for (let i = 0; i < n; i++) { const c = CONF[i % 5]; this.soft.emit({ x, y, z, vx: rnd(4 * s), vy: (3 + Math.random() * 5) * s, vz: rnd(4 * s), life: 1.6 + Math.random(), size: 0.14, r: c[0], g: c[1], b: c[2], grav: 9, drag: 1.2 }); } }
  sparkle(x, y, z, n = 10) { for (let i = 0; i < n; i++) this.glow.emit({ x: x + rnd(0.6), y: y + rnd(0.6), z: z + rnd(0.6), vx: rnd(1), vy: 1 + Math.random(), vz: rnd(1), life: 0.7, size: 0.16, size2: 0.02, r: 1, g: 0.9, b: 0.4 }); }
  bonk(x, y, z) { for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; this.glow.emit({ x, y, z, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, vz: rnd(2), life: 0.28, size: 0.26, size2: 0.05, r: 1, g: 1, b: 0.6 }); } }
  shock(x, y, z, r = 5) { for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28; this.soft.emit({ x: x + Math.cos(a) * r * 0.3, y: y + 0.2, z: z + Math.sin(a) * r * 0.3, vx: Math.cos(a) * r * 2.4, vy: 1.2, vz: Math.sin(a) * r * 2.4, life: 0.6, size: 0.6, size2: 1.8, r: 0.9, g: 0.85, b: 0.75, a: 0.6, drag: 3 }); } }
  update(dt, viewH, fov) { const scale = viewH / (2 * Math.tan(fov * Math.PI / 360)); this.soft.uniforms.uScale.value = this.glow.uniforms.uScale.value = scale; this.soft.update(dt); this.glow.update(dt); }
}
