// Game state with no Phaser dependency, so the puzzle chain can be tested in Node.
import { CHARACTERS } from '../data/rooms.js';
import { COMBINATIONS, START_ITEMS } from '../data/items.js';
import { CARDS, COLUMNS, boardReaction } from '../data/board.js';
import { CROSS_ROOM } from '../data/text.js';
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

// Tips the player has already learned; they survive "Play again".
const PERSISTENT_SEEN = ['howto', 'space_reveal'];

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
    this.seen = new Set([...(this.seen ?? [])].filter((id) => PERSISTENT_SEEN.includes(id)));
    this.selected = null;
    this.modal = false;
    this.hintsUsed = 0;
    this.hintLevels = {};
    this.tide = 0;
    this.tideBand = null;
    this.tideClock = 0;
    this.memo = {};
    this.board = {};
    this.trust = 0;
    this.reactions = { mara: [], tobin: [] };
    this.holding = null;
    this.startedAt = Date.now();
    this.lastProgressAt = Date.now();
    this.lastInputAt = Date.now();
    this.lastHintAt = 0;
    this.addCard('fall');
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
    const cross = CROSS_ROOM[flag];
    if (cross && cross.to !== this.active) {
      this.queueReaction(cross.to, cross.line);
      if (cross.muffled) this.emit('muffled', cross.muffled);
    }
    this.emit('flag', flag);
  }

  /** A line `who` says the next time the player switches to them. */
  queueReaction(who, line) {
    if (!this.reactions[who].includes(line)) this.reactions[who].push(line);
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
    const reactions = this.reactions[this.active];
    this.reactions[this.active] = [];
    const combined = this.combine(this.active);
    this.emit('swap');
    this.emit('inventory');
    return { arrived, combined, reactions };
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

  // ---- case board ----

  /** Adds a clue card (unpinned, marked new). Returns true if it wasn't on the board yet. */
  addCard(id) {
    if (!CARDS[id] || this.board[id]) return false;
    this.board[id] = { column: null, fresh: true, order: Object.keys(this.board).length };
    this.emit('card', id);
    return true;
  }

  /** Pins a card on a suspect column, or back to the tray with null. Returns a one-time reaction or null. */
  pinCard(id, column) {
    const card = this.board[id];
    if (!card) return null;
    const to = COLUMNS.some((c) => c.id === column) ? column : null;
    card.fresh = false;
    if (card.column === to) return null;
    card.column = to;
    this.emit('board');
    const reaction = to && boardReaction(id, to, this.active);
    return reaction && this.markSeen(`react_${reaction.key}`) ? reaction : null;
  }

  seeCards() {
    for (const card of Object.values(this.board)) card.fresh = false;
    this.emit('board');
  }

  get freshCards() {
    return Object.values(this.board).filter((c) => c.fresh).length;
  }

  adjustTrust(n) {
    if (!n) return;
    this.trust += n;
    this.emit('trust', this.trust);
  }

  // ---- two-hands hold: one character keeps something in place while the player acts as the other ----

  startHold(id, by, ms) {
    this.holding = { id, by, ms, left: ms };
    this.emit('hold', this.holding);
  }

  /** Counts down an active hold; returns the hold that just ran out, or null. Callers skip it while modals are open. */
  tickHold(ms) {
    if (!this.holding) return null;
    this.holding.left -= ms;
    if (this.holding.left > 0) return null;
    const expired = this.holding;
    this.endHold();
    return expired;
  }

  endHold() {
    if (!this.holding) return;
    this.holding = null;
    this.emit('hold', null);
  }

  noteInput(now = Date.now()) {
    this.lastInputAt = now;
  }
}

export const state = new GameState();
