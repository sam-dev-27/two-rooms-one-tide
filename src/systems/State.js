// Game state with no Phaser dependency, so the puzzle chain can be tested in Node.
import { CHARACTERS } from '../data/rooms.js';
import { COMBINATIONS, START_ITEMS } from '../data/items.js';
import { TIDE_MAX, TIDE_STEP_MS } from '../config.js';

class Emitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, fn, ctx) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push({ fn, ctx });
    return this;
  }

  offContext(ctx) {
    for (const [event, list] of this.listeners) {
      this.listeners.set(event, list.filter((l) => l.ctx !== ctx));
    }
  }

  emit(event, ...args) {
    for (const { fn, ctx } of [...(this.listeners.get(event) ?? [])]) fn.apply(ctx, args);
  }
}

export class GameState extends Emitter {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.active = 'mara';
    this.flags = new Set();
    this.inventory = { mara: [...START_ITEMS.mara], tobin: [...START_ITEMS.tobin] };
    this.arrivals = { mara: [], tobin: [] };
    this.roomStates = { lamp: 'before', cellar: 'before' };
    this.notes = [];
    this.seen = new Set();
    this.selected = null;
    this.modal = false;
    this.hintsUsed = 0;
    this.hintLevels = {};
    this.tide = 0;
    this.tideBand = null;
    this.tideClock = 0;
    this.memo = {};
    this.startedAt = Date.now();
    this.lastProgressAt = Date.now();
    this.lastHintAt = 0;
    this.emit('reset');
  }

  get other() {
    return this.active === 'mara' ? 'tobin' : 'mara';
  }

  get room() {
    return CHARACTERS[this.active].room;
  }

  has(flag) {
    return this.flags.has(flag);
  }

  set(flag) {
    if (this.flags.has(flag)) return;
    this.flags.add(flag);
    this.lastProgressAt = Date.now();
    this.emit('flag', flag);
  }

  holds(item, who = this.active) {
    return this.inventory[who].includes(item);
  }

  /** Adds an item and returns any combinations it completed. */
  give(item, who = this.active) {
    this.inventory[who].push(item);
    const combined = this.combine(who);
    this.emit('inventory');
    return combined;
  }

  take(item, who = this.active) {
    this.inventory[who] = this.inventory[who].filter((i) => i !== item);
    if (this.selected === item) this.selected = null;
    this.emit('inventory');
  }

  combine(who) {
    const done = [];
    for (const combo of COMBINATIONS) {
      if (combo.parts.every((p) => this.inventory[who].includes(p))) {
        this.inventory[who] = this.inventory[who].filter((i) => !combo.parts.includes(i));
        this.inventory[who].push(combo.result);
        if (combo.flag) this.set(combo.flag);
        done.push(combo);
      }
    }
    return done;
  }

  /** Moves an item from the active character to the other through the chute. */
  send(item) {
    if (!this.holds(item)) return false;
    this.take(item);
    this.inventory[this.other].push(item);
    this.arrivals[this.other].push(item);
    this.lastProgressAt = Date.now();
    this.emit('inventory');
    return true;
  }

  swap() {
    this.selected = null;
    this.active = this.other;
    const arrived = this.arrivals[this.active];
    this.arrivals[this.active] = [];
    const combined = this.combine(this.active);
    this.emit('swap');
    this.emit('inventory');
    return { arrived, combined };
  }

  select(item) {
    this.selected = item;
    this.emit('select', item);
  }

  setRoomState(room, value) {
    this.roomStates[room] = value;
    this.emit('roomstate', room, value);
  }

  addNote(id, text) {
    if (this.notes.some((n) => n.id === id)) return;
    this.notes.push({ id, text });
    this.emit('notes');
  }

  /** Raises the tide; it caps at TIDE_MAX and freezes once the lamp's band is locked. Never a fail state. */
  advanceTide(n = 1) {
    if (this.tideBand !== null) return this.tide;
    const next = Math.min(TIDE_MAX, this.tide + n);
    if (next !== this.tide) {
      this.tide = next;
      this.emit('tide', next);
    }
    return this.tide;
  }

  /** Feeds active play time to the tide clock; callers skip it while modals or talks are open. */
  tick(ms) {
    if (this.tideBand !== null || this.tide >= TIDE_MAX) return;
    this.tideClock += ms;
    while (this.tideClock >= TIDE_STEP_MS) {
      this.tideClock -= TIDE_STEP_MS;
      this.advanceTide(1);
    }
  }

  lockTide() {
    if (this.tideBand === null) this.tideBand = this.tide;
    return this.tideBand;
  }

  /** Swaps only if `who` isn't already active; returns the swap result or null. */
  setActive(who) {
    return this.active === who ? null : this.swap();
  }

  /** Returns true the first time an id is seen; used for one-shot tutorial toasts. */
  markSeen(id) {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    return true;
  }
}

export const state = new GameState();
