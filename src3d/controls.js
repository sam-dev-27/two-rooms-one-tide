// First-person input: pointer-lock mouse look with a drag-to-look fallback (for iframes or
// browsers that refuse the lock), WASD/arrows movement, and circle-vs-room collision.
const LOOK = 0.0022;
const DRAG_LOOK = 0.005;
const SPEED = 2.4;
const RADIUS = 0.3;
const PITCH_MAX = 1.35;
const CLICK_SLOP = 5;

const MOVE_KEYS = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export class Controls {
  /**
   * `handlers`: onClick(clientX, clientY | null), onLockChange(locked), onLockFailed(),
   * onHover(clientX, clientY), canLook() -> bool.
   */
  constructor(canvas, handlers, { drag = false } = {}) {
    this.canvas = canvas;
    this.h = handlers;
    this.dragMode = drag;
    this.locked = false;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.drag = null;
    this.mouse = null;

    canvas.addEventListener('mousedown', (e) => this.onDown(e));
    window.addEventListener('mousemove', (e) => this.onMove(e));
    window.addEventListener('mouseup', (e) => this.onUp(e));
    document.addEventListener('pointerlockchange', () => this.onLockChange());
    document.addEventListener('pointerlockerror', () => this.lockFailed());
    window.addEventListener('blur', () => this.keys.clear());
  }

  setDragMode(on) {
    this.dragMode = on;
    if (on && this.locked) document.exitPointerLock();
  }

  /** Asks for pointer lock (needs a user gesture); falls back to drag-to-look if refused. */
  lock() {
    if (this.dragMode || this.locked || !this.canvas.requestPointerLock) return;
    try {
      const p = this.canvas.requestPointerLock();
      if (p?.catch) p.catch((err) => (err?.name === 'NotSupportedError' || err?.name === 'SecurityError' ? this.lockFailed() : null));
    } catch {
      this.lockFailed();
    }
  }

  unlock() {
    if (this.locked) document.exitPointerLock();
  }

  lockFailed() {
    if (this.dragMode) return;
    this.dragMode = true;
    this.h.onLockFailed?.();
  }

  onLockChange() {
    this.locked = document.pointerLockElement === this.canvas;
    if (!this.locked) this.keys.clear();
    this.h.onLockChange?.(this.locked);
  }

  onDown(e) {
    if (e.button === 2) return this.h.onRightClick?.();
    if (e.button !== 0) return;
    if (this.locked) return this.h.onClick?.(null, null);
    if (!this.dragMode) return this.h.onUnlockedClick?.();
    this.drag = { x: e.clientX, y: e.clientY, moved: 0 };
  }

  onMove(e) {
    if (this.locked) {
      if (this.h.canLook()) this.look(e.movementX * LOOK, e.movementY * LOOK);
      return;
    }
    if (e.target === this.canvas || this.drag) this.mouse = { x: e.clientX, y: e.clientY };
    if (!this.drag) return;
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    this.drag.moved += Math.abs(dx) + Math.abs(dy);
    this.drag.x = e.clientX;
    this.drag.y = e.clientY;
    if (this.h.canLook()) this.look(dx * DRAG_LOOK, dy * DRAG_LOOK);
  }

  onUp(e) {
    if (!this.drag || e.button !== 0) return;
    const { moved } = this.drag;
    this.drag = null;
    if (moved < CLICK_SLOP) this.h.onClick?.(e.clientX, e.clientY);
  }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, this.pitch - dy));
  }

  keyDown(code) {
    if (MOVE_KEYS[code]) this.keys.add(code);
  }

  keyUp(code) {
    this.keys.delete(code);
  }

  clearKeys() {
    this.keys.clear();
  }

  /** The held movement direction in camera space, normalised; [0, 0] when idle. */
  input() {
    let x = 0;
    let f = 0;
    for (const code of this.keys) {
      x += MOVE_KEYS[code][0];
      f += MOVE_KEYS[code][1];
    }
    const len = Math.hypot(x, f);
    return len ? [x / len, f / len] : [0, 0];
  }

  /** Moves `pos` ({x, z}) by the held keys for `dt` seconds inside `room`; returns metres moved. */
  move(pos, dt, room, speedScale = 1) {
    const [sx, sf] = this.input();
    if (!sx && !sf) return 0;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const step = SPEED * speedScale * dt;
    const before = { x: pos.x, z: pos.z };
    pos.x += (sx * cos - sf * sin) * step;
    pos.z += (-sx * sin - sf * cos) * step;
    collide(pos, room);
    return Math.hypot(pos.x - before.x, pos.z - before.z);
  }
}

/** Pushes a player circle out of colliders and back inside the room bounds. */
export function collide(pos, room) {
  for (let pass = 0; pass < 2; pass++) {
    for (const c of room.colliders) {
      if (c.type === 'circle') {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + RADIUS;
        if (d < min && d > 1e-6) {
          pos.x = c.x + (dx / d) * min;
          pos.z = c.z + (dz / d) * min;
        }
      } else {
        const minX = c.minX - RADIUS;
        const maxX = c.maxX + RADIUS;
        const minZ = c.minZ - RADIUS;
        const maxZ = c.maxZ + RADIUS;
        if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
          const push = [
            [pos.x - minX, minX, null],
            [maxX - pos.x, maxX, null],
            [pos.z - minZ, null, minZ],
            [maxZ - pos.z, null, maxZ],
          ].sort((a, b) => a[0] - b[0])[0];
          if (push[1] !== null) pos.x = push[1];
          else pos.z = push[2];
        }
      }
    }
    const b = room.bounds;
    if (b.type === 'circle') {
      const d = Math.hypot(pos.x, pos.z);
      if (d > b.r) {
        pos.x *= b.r / d;
        pos.z *= b.r / d;
      }
    } else {
      pos.x = Math.max(b.minX, Math.min(b.maxX, pos.x));
      pos.z = Math.max(b.minZ, Math.min(b.maxZ, pos.z));
    }
  }
}
