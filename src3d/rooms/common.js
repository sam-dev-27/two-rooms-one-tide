// Shared building blocks for the procedural rooms: materials, canvas textures, colliders and
// the interactable registry (one entry per hotspot id in src/data/rooms.js).
import * as THREE from 'three';
import { url } from '../assets.js';

const loader = new THREE.TextureLoader();

/** Loads a texture from assets (resolved through the manifest); `fallback` draws one if missing. */
export function texture(path, { repeat = [1, 1], fallback = null, srgb = true, mirror = false } = {}) {
  const src = url(path);
  const wrap = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
  const setup = (tex) => {
    tex.wrapS = tex.wrapT = wrap;
    tex.repeat.set(...repeat);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  };
  if (!src) return fallback ? setup(fallback()) : null;
  return setup(loader.load(src));
}

export function canvasTexture(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Brush-stroke noise so flat procedural surfaces look painted rather than plastic. */
export function paintedTexture(base, { strokes = 260, spread = 26, w = 256, h = 256, horizontal = false } = {}) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const col = new THREE.Color(base);
    for (let i = 0; i < strokes; i++) {
      const k = 1 + (Math.random() - 0.5) * 0.28;
      ctx.fillStyle = `rgba(${Math.min(255, col.r * 255 * k) | 0},${Math.min(255, col.g * 255 * k) | 0},${Math.min(255, col.b * 255 * k) | 0},0.35)`;
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      if (horizontal) ctx.ellipse(x, y, spread * 1.6, spread * 0.25, 0, 0, Math.PI * 2);
      else ctx.ellipse(x, y, spread * (0.4 + Math.random()), spread * (0.2 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

const matCache = new Map();

/** A painterly matte material; shared by colour/texture unless `own` is set. */
export function mat(color, { map = null, rough = 0.92, metal = 0, emissive = 0x000000, emissiveIntensity = 1, transparent = false, opacity = 1, side = THREE.FrontSide, own = false, fog = true } = {}) {
  const key = !own && !map && `${color}|${rough}|${metal}|${emissive}|${opacity}|${side}|${fog}`;
  if (key && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, map, roughness: rough, metalness: metal, emissive, emissiveIntensity, transparent, opacity, side, fog });
  if (key) matCache.set(key, m);
  return m;
}

export const brass = () => mat(0xb08a3e, { rough: 0.45, metal: 0.55 });
export const iron = () => mat(0x3a3f44, { rough: 0.7, metal: 0.4 });

export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

export function cyl(rTop, rBottom, h, material, segs = 16, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segs), material);
  m.position.set(x, y, z);
  return m;
}

export function group(...children) {
  const g = new THREE.Group();
  children.forEach((c) => c && g.add(c));
  return g;
}

/**
 * Room-level registry: colliders for the player and interactables for the crosshair. Each
 * interactable gets its own material clones so its highlight never leaks onto other props.
 */
export class RoomKit {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.hotspots = {};
  }

  /** Axis-aligned box in the XZ plane, centred at (x, z). */
  block(x, z, w, d) {
    const c = { type: 'box', minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
    this.colliders.push(c);
    return c;
  }

  post(x, z, r) {
    const c = { type: 'circle', x, z, r };
    this.colliders.push(c);
    return c;
  }

  /**
   * Registers `object` as the 3D body of hotspot `id`. `hit` is an invisible box (size, centre in
   * world space) the crosshair aims at, larger than thin props so they're easy to target.
   */
  hotspot(id, object, { size, center, range = 3.2 } = {}) {
    if (!object.parent) this.scene.add(object);
    const meshes = [];
    object.traverse((o) => {
      if (!o.isMesh || o.userData.noGlow || !o.material.emissive) return;
      o.material = o.material.clone();
      o.material.userData.base = o.material.emissive.clone();
      o.material.userData.baseIntensity = o.material.emissiveIntensity;
      meshes.push(o);
    });
    object.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(object);
    const c = center ? new THREE.Vector3(...center) : bounds.getCenter(new THREE.Vector3());
    const s = size ? new THREE.Vector3(...size) : bounds.getSize(new THREE.Vector3()).addScalar(0.12);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(c);
    hit.userData.hotspot = id;
    this.scene.add(hit);
    this.hotspots[id] = { id, object, hit, meshes, anchor: c.clone(), range };
    return this.hotspots[id];
  }
}
