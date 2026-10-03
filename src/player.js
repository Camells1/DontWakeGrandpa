// You, the bean. Snappy first-person movement (quick stops, air control, coyote time, buffered jumps,
// tiptoeing, sprinting, slides, climbing onto ledges), plus the two things beans are famous for:
// being knocked flying like a ragdoll, and being flattened into a pancake.
import * as THREE from 'three';
import { PLAYER, HOUSE, DEN } from './config.js';
import { clamp } from './util.js';

const ease = t => t * t * (3 - 2 * t);

export class Player {
  constructor(house, upgrades) { this.house = house; this.up = upgrades; this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.reset(); }
  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  get eye() { return this.flat ? 0.28 : this.rag ? 0.8 : PLAYER.eye + (PLAYER.crouchEye - PLAYER.eye) * this.crouchK; }
  reset(x = this.house.spawn[0], z = this.house.spawn[1]) {
    this.pos.set(x, this.house.standAt(x, z) + 0.05, z); this.vel.set(0, 0, 0); this.yaw = -Math.PI / 2; this.pitch = 0;
    Object.assign(this, { stamina: PLAYER.stamina, grounded: true, coyote: 0, jumpBuf: 0, mantle: null, crouch: false, crouchK: 0, slide: 0, stepPhase: 0, sprinting: false, regenWait: 0, surface: 'wood', rag: null, flat: false, dizzy: 0, air: 0 });
  }
  // Sent flying: no steering until you stop bouncing
  knock(vx, vy, vz, dur = 1.5) {
    if (this.flat) return;
    this.vel.set(vx, vy, vz); this.grounded = false; this.mantle = null; this.slide = 0;
    this.rag = { t: dur, rx: 0, rz: 0, sx: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 8), sz: (Math.random() - 0.5) * 14 };
  }
  flatten() { this.flat = true; this.rag = null; this.vel.set(0, 0, 0); this.mantle = null; }
  inflate() { this.flat = false; this.vel.y = 6; this.grounded = false; this.dizzy = 1.2; }

  // input: { mx, mz, yaw, pitch, sprint, jump (held), jumpHit, crouch (held), speedK (carrying something heavy) }
  // Returns what happened this frame: { step, jumped, landed (speed), mantled, slid, bounced (speed) }
  update(dt, input) {
    const ev = {}, P = PLAYER, w = this.house, shoes = this.up.shoes || 0;
    this.yaw = input.yaw; this.pitch = input.pitch; this.dizzy = Math.max(0, this.dizzy - dt);
    // ---- ragdoll: bounce about until the energy runs out
    if (this.rag) {
      const r = this.rag; r.t -= dt; this.vel.y -= P.gravity * dt;
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt; const before = this.speed;
      if (w.push(this.pos, this.pos.y, 0.5, this.vel, 1.2) && before - this.speed > 3) { ev.bounced = before; r.sx *= -0.7; }
      this._bounds(); this.pos.y += this.vel.y * dt;
      const g = w.standAt(this.pos.x, this.pos.z, this.pos.y + 0.3);
      if (this.pos.y <= g) { this.pos.y = g; if (this.vel.y < -4) { ev.bounced = -this.vel.y; this.vel.y *= -0.42; this.vel.x *= 0.72; this.vel.z *= 0.72; r.sx *= 0.7; r.sz *= 0.7; } else { this.vel.y = 0; const f = Math.max(0, 1 - dt * 3.5); this.vel.x *= f; this.vel.z *= f; r.sx *= f; r.sz *= f; this.grounded = true; } }
      else this.grounded = false;
      r.rx += r.sx * dt; r.rz += r.sz * dt;
      if (r.t <= 0 && this.grounded && this.speed < 2) { this.rag = null; this.dizzy = 0.9; this.vel.set(0, 0, 0); }
      return ev;
    }
    if (this.flat) input = { ...input, jump: false, jumpHit: false, sprint: false, crouch: false, speedK: 0.16 };
    if (this.mantle) {
      const m = this.mantle; m.t += dt / 0.36;
      const k = Math.min(1, m.t), up = ease(Math.min(1, k * 1.6)), fwd = ease(clamp((k - 0.35) / 0.65, 0, 1));
      this.pos.set(m.fx + (m.tx - m.fx) * fwd, m.fy + (m.ty - m.fy) * up, m.fz + (m.tz - m.fz) * fwd); this.vel.set(0, 0, 0);
      if (k >= 1) { this.mantle = null; this.grounded = true; }
      return ev;
    }
    const sy = Math.sin(input.yaw), cy = Math.cos(input.yaw), fx = -sy, fz = -cy, rx = cy, rz = -sy;
    let wx = fx * input.mz + rx * input.mx, wz = fz * input.mz + rz * input.mx;
    const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
    const moving = wl > 0.05;
    const wasCrouch = this.crouch;
    this.crouch = (!!input.crouch && this.grounded) || this.slide > 0;
    if (input.crouch && !wasCrouch && this.grounded && this.sprinting && this.speed > P.sprint * 0.8 && this.slide <= 0) { this.slide = P.slideTime; const k = P.slideSpeed / (this.speed || 1); this.vel.x *= k; this.vel.z *= k; ev.slid = true; }
    this.slide = Math.max(0, this.slide - dt);
    this.crouchK += ((this.crouch ? 1 : 0) - this.crouchK) * Math.min(1, dt * 12);
    this.sprinting = !!input.sprint && moving && input.mz > 0 && this.stamina > 1 && !this.crouch && (input.speedK ?? 1) > 0.7;
    if (this.sprinting) { this.stamina -= 12 * dt; this.regenWait = 0.8; } else if ((this.regenWait -= dt) <= 0) this.stamina += (this.speed < 0.5 ? 30 : 20) * dt;
    this.stamina = clamp(this.stamina, 0, P.stamina);
    this.coyote = this.grounded ? P.coyote : this.coyote - dt;
    this.jumpBuf = input.jumpHit ? P.jumpBuffer : this.jumpBuf - dt;
    let max = (this.crouch ? P.crouch : this.sprinting ? P.sprint : P.walk) * (1 + 0.08 * shoes) * (input.speedK ?? 1);
    if (input.mz < 0) max *= 0.8;
    if (this.slide > 0) { const sp = this.speed, drop = 5.5 * dt; if (sp > 0.01) { const k = Math.max(0, sp - drop) / sp; this.vel.x *= k; this.vel.z *= k; } this._accel(wx, wz, 3, 6 * dt); }
    else if (this.grounded) { const sp = this.speed; if (sp > 0.001) { const drop = Math.max(sp, 2.2) * P.friction * dt, k = Math.max(0, sp - drop) / sp; this.vel.x *= k; this.vel.z *= k; } this._accel(wx, wz, max, P.accel * dt); }
    else this._accel(wx, wz, Math.min(max, 3.6), P.airAccel * dt);
    this.vel.y -= P.gravity * dt;
    if (this.vel.y > 0 && !input.jump) this.vel.y -= P.gravity * dt * 0.9;       // short hop if you let go early
    if (this.jumpBuf > 0 && this.coyote > 0) { this.vel.y = P.jump * (1 + 0.12 * shoes); this.grounded = false; this.coyote = 0; this.jumpBuf = 0; this.slide = 0; ev.jumped = true; }
    // grab a ledge in front of you
    if ((input.jumpHit || (input.jump && !this.grounded)) && input.mz > 0) {
      const ax = this.pos.x + fx * 0.85, az = this.pos.z + fz * 0.85, top = w.standAt(ax, az, this.pos.y + 1.8), rise = top - this.pos.y;
      if (rise > 0.6 && rise < 2.4 && top > 0.3) { this.mantle = { t: 0, fx: this.pos.x, fy: this.pos.y, fz: this.pos.z, tx: ax, ty: top + 0.02, tz: az }; ev.mantled = true; return ev; }
    }
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    w.push(this.pos, this.pos.y, 0.48, this.vel, this.flat ? 0.3 : this.crouch ? 1.1 : 1.7);
    this._bounds(); this.pos.y += this.vel.y * dt;
    const g = w.standAt(this.pos.x, this.pos.z, this.pos.y);
    if (this.pos.y <= g) { if (!this.grounded && this.vel.y < -3.5) ev.landed = -this.vel.y; this.pos.y = g; this.vel.y = 0; this.grounded = true; }
    else if (this.grounded && this.pos.y - g < 0.5 && this.vel.y <= 0) { this.pos.y = g; this.vel.y = 0; }
    else this.grounded = false;
    this.air = this.grounded ? 0 : this.air + dt;
    if (this.grounded && this.speed > 0.8 && this.slide <= 0) {
      const before = Math.floor(this.stepPhase / Math.PI);
      this.stepPhase += this.speed * dt * (this.sprinting ? 1.25 : this.crouch ? 2.0 : 1.6);
      if (Math.floor(this.stepPhase / Math.PI) !== before) { ev.step = true; this.surface = w.surfaceAt(this.pos.x, this.pos.z, this.pos.y); }
    }
    return ev;
  }
  _bounds() { this.pos.x = clamp(this.pos.x, DEN.x - DEN.hx + 0.5, HOUSE.x1 - 0.5); this.pos.z = clamp(this.pos.z, HOUSE.z0 + 0.5, HOUSE.z1 - 0.5); }
  _accel(wx, wz, max, amount) { const cur = this.vel.x * wx + this.vel.z * wz, add = max - cur; if (add <= 0) return; const a = Math.min(amount, add); this.vel.x += wx * a; this.vel.z += wz * a; }
}
