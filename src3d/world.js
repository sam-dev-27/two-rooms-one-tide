// The 3D presentation: renderer, the two room scenes, the first-person camera, what the
// crosshair is on, hotspot glows, and the atmosphere (sway, flicker, lightning, held lantern).
import * as THREE from 'three';
import { buildLamp } from './rooms/lamp.js';
import { buildCellar } from './rooms/cellar.js';
import { Controls } from './controls.js';

const STAGE_W = 1280;
const STAGE_H = 720;
const STEP_EVERY = 0.72;
const BOB = 0.035;
const AMBER = new THREE.Color(0xffb347);
const CREAM = new THREE.Color(0xfff1c4);
const SPAWN = { mara: 'lamp', tobin: 'cellar' };

export class World {
  constructor(canvas, { drag = false, onStep = null } = {}) {
    this.canvas = canvas;
    this.onStep = onStep;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 120);
    this.camera.rotation.order = 'YXZ';
    this.rooms = { lamp: buildLamp(), cellar: buildCellar() };
    this.room = null;
    this.who = null;
    this.pos = {};
    this.resetPositions();

    this.buildLantern();
    this.raycaster = new THREE.Raycaster();
    this.active = new Set();
    this.target = null;
    this.glows = {};
    this.shimmers = [];
    this.objective = null;
    this.revealing = false;
    this.walkDist = 0;
    this.bobPhase = 0;
    this.flicker = 0;
    this.flickerAt = 0;
    this.time = 0;
    this.shake = 0;

    this.controls = new Controls(canvas, {}, { drag });
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resetPositions() {
    for (const [who, roomId] of Object.entries(SPAWN)) {
      const { x, z, yaw } = this.rooms[roomId].spawn;
      this.pos[who] = { x, z, yaw, pitch: -0.05 };
    }
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Mara carries a storm lantern until she hangs it on the lamp; it lights her way. */
  buildLantern() {
    const g = new THREE.Group();
    const brass = new THREE.MeshStandardMaterial({ color: 0xa8823a, roughness: 0.45, metalness: 0.6 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xffd08a, emissive: 0xffa040, emissiveIntensity: 1.3, transparent: true, opacity: 0.85 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.03, 12), brass);
    const flame = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 12), glass);
    flame.position.y = 0.075;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.06, 12), brass);
    cap.position.y = 0.165;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 6, 16), brass);
    ring.position.y = 0.22;
    g.add(base, flame, cap, ring);
    g.position.set(0.42, -0.4, -0.8);
    g.scale.setScalar(0.7);
    this.lanternLight = new THREE.PointLight(0xffa850, 9, 7, 1.5);
    this.lanternLight.position.set(0.25, -0.15, -0.4);
    this.lantern = g;
    this.lanternFlame = glass;
    this.camera.add(g, this.lanternLight);
  }

  /** Moves the camera into the active character's room. */
  enter(who, state) {
    if (this.who) this.saveView();
    this.who = who;
    this.room = this.rooms[state.room];
    this.room.scene.add(this.camera);
    const p = this.pos[who];
    this.controls.yaw = p.yaw;
    this.controls.pitch = p.pitch;
    this.controls.clearKeys();
    this.target = null;
    this.glows = {};
    this.shimmers = [];
    this.objective = null;
    this.sync(state);
  }

  saveView() {
    const p = this.pos[this.who];
    p.yaw = this.controls.yaw;
    p.pitch = this.controls.pitch;
  }

  /** Re-applies flag/tide driven visuals to both rooms. */
  sync(state) {
    for (const r of Object.values(this.rooms)) r.sync(state);
    const carrying = this.who === 'mara' && !state.has('lantern_set');
    this.lantern.visible = carrying;
    this.lanternLight.intensity = carrying ? 9 : 0;
  }

  setActiveHotspots(ids) {
    this.active = new Set(ids);
    if (this.target && !this.active.has(this.target)) this.target = null;
  }

  hotspot(id) {
    return this.room?.kit.hotspots[id] ?? null;
  }

  /** Screen position (1280×720 stage units) of a hotspot, or null when it's behind the camera. */
  project(id) {
    const hs = this.hotspot(id);
    if (!hs) return null;
    const v = hs.anchor.clone().project(this.camera);
    if (v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * STAGE_W, y: ((1 - v.y) / 2) * STAGE_H, onScreen: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 };
  }

  /** Every active hotspot that's in front of the camera, for the Space/Shift reveal. */
  visibleHotspots() {
    const out = [];
    for (const id of this.active) {
      const p = this.project(id);
      if (p?.onScreen) out.push({ id, ...p });
    }
    return out;
  }

  /** What the crosshair (or, in drag mode, the mouse) is on: a hotspot id within reach, or null. */
  pick(clientX = null, clientY = null) {
    if (!this.room) return null;
    const ndc = new THREE.Vector2(0, 0);
    if (clientX !== null) {
      const r = this.canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    }
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = [];
    for (const id of this.active) {
      const hs = this.hotspot(id);
      if (hs?.hit.visible === false && !hs.alwaysPick) continue;
      if (hs) hits.push(hs.hit);
    }
    const found = this.raycaster.intersectObjects(hits, false);
    for (const f of found) {
      const id = f.object.userData.hotspot;
      if (f.distance <= this.hotspot(id).range) return id;
    }
    return null;
  }

  /** Lights a hotspot: `kind` is 'hover', 'calling', 'hold', 'objective' or null to clear. */
  glow(id, kind) {
    if (kind) this.glows[id] = kind;
    else delete this.glows[id];
  }

  shimmer(ids) {
    const now = this.time;
    this.shimmers = ids.map((id, i) => ({ id, start: now + 0.25 + i * 0.14 }));
  }

  strike(strength, reveal) {
    this.room?.strike(strength, reveal);
    this.shake = Math.max(this.shake, strength * 0.4);
  }

  flashWindow(ms, color) {
    this.rooms.lamp.flashWindow(ms, color);
  }

  quake(seconds) {
    this.shake = Math.max(this.shake, seconds);
  }

  /** Per-frame: movement (when `canMove`), camera, room animation, glows. Returns the targeted id. */
  update(dt, state, { canMove, canLook, mouse }) {
    this.time += dt;
    if (!this.who) return null;
    const t = this.time;
    const p = this.pos[this.who];
    const level = state.tide / 6;
    const lamp = state.room === 'lamp';

    if (canMove) {
      const wading = !lamp && this.rooms.cellar.waterLevel > 0.2;
      const moved = this.controls.move(p, dt, this.room.kit, wading ? 0.7 : 1);
      if (moved > 0) {
        this.walkDist += moved;
        this.bobPhase += moved * (Math.PI / STEP_EVERY);
        if (this.walkDist >= STEP_EVERY) {
          this.walkDist = 0;
          this.onStep?.(wading);
        }
        state.noteInput();
      } else {
        this.bobPhase += (Math.round(this.bobPhase / Math.PI) * Math.PI - this.bobPhase) * Math.min(1, dt * 8);
      }
    } else {
      this.controls.clearKeys();
    }
    if (!canLook) this.controls.drag = null;

    const sway = (lamp ? 0.012 : 0.006) * level;
    this.shake = Math.max(0, this.shake - dt);
    const quake = this.shake > 0 ? Math.min(1, this.shake) * 0.025 : 0;
    const cam = this.camera;
    cam.position.set(
      p.x + (Math.random() - 0.5) * quake,
      this.room.eye - Math.abs(Math.sin(this.bobPhase)) * BOB + (Math.random() - 0.5) * quake,
      p.z + (Math.random() - 0.5) * quake,
    );
    cam.rotation.set(this.controls.pitch + Math.sin(t / 1.3) * sway * 0.5, this.controls.yaw, Math.sin(t / 1.9) * sway);

    if (t > this.flickerAt) {
      const lit = state.has('lamp_lit');
      const strength = (lamp ? 0.05 : 0.035) + level * (lamp && lit && !state.has('lamp_full') ? 0.2 : 0.12);
      this.flicker = Math.random() < 0.25 + level * 0.35 ? Math.random() * strength : 0;
      this.flickerAt = t + 0.06 + Math.random() * (0.26 - level * 0.16);
    }
    this.room.update(dt, t, state, this.flicker);
    if (this.lantern.visible) {
      this.lanternLight.intensity = 9 * (1 - this.flicker * 2);
      this.lantern.position.y = -0.4 + Math.sin(this.bobPhase * 2) * 0.008;
      this.lantern.rotation.z = Math.sin(t * 1.7) * 0.05;
    }

    this.target = canLook ? this.pick(mouse?.x ?? null, mouse?.y ?? null) : null;
    this.applyGlows(t);
    this.renderer.render(this.room.scene, cam);
    return this.target;
  }

  applyGlows(t) {
    const kit = this.room.kit;
    for (const [id, hs] of Object.entries(kit.hotspots)) {
      let amount = 0;
      let color = AMBER;
      const kind = this.glows[id];
      if (kind === 'calling') amount = 0.12 + 0.12 * Math.sin(t * 4.5);
      else if (kind === 'hold') {
        amount = 0.16 + 0.14 * Math.sin(t * 9.8);
        color = CREAM;
      } else if (kind === 'objective') amount = 0.06 + 0.06 * Math.sin(t * 7.5);
      if (this.revealing && this.active.has(id)) {
        amount = Math.max(amount, 0.12);
        color = CREAM;
      }
      for (const s of this.shimmers) {
        if (s.id !== id) continue;
        const k = (t - s.start) / 0.68;
        if (k > 0 && k < 1) {
          amount = Math.max(amount, Math.sin(k * Math.PI) * 0.22);
          color = CREAM;
        }
      }
      if (id === this.target) amount = Math.max(amount, 0.11 + 0.04 * Math.sin(t * 5.2));
      for (const m of hs.meshes) {
        const mat = m.material;
        mat.emissive.copy(mat.userData.base).lerp(color, amount);
        mat.emissiveIntensity = Math.max(mat.userData.baseIntensity, amount > 0 ? 1 : 0);
      }
    }
    this.shimmers = this.shimmers.filter((s) => t - s.start < 0.7);
  }
}
