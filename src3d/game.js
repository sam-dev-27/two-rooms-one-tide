// The first-person game loop: the 3D counterpart of src/scenes/GameScene.js. Puzzle logic stays
// in src/data + src/systems; this file only presents it (the `view` contract of createApi).
import { ROOMS, CHARACTERS } from '../src/data/rooms.js';
import { ITEMS } from '../src/data/items.js';
import { TWIST_CARD, ENDINGS, endingCard, IDLE_MUTTERS, LIGHTNING_TEXT, tideBandIndex } from '../src/data/text.js';
import { BEATS } from '../src/data/cutscenes.js';
import { epilogueLine } from '../src/data/board.js';
import { lightningPending, lightningStrike } from '../src/data/puzzles.js';
import { createApi, interact, pendingTalk } from '../src/systems/Interact.js';
import { objectiveTarget } from '../src/systems/Hints.js';
import { UI_IMAGES, CUTSCENE_IMAGES } from '../src/data/assets.js';
import { url } from './assets.js';

const imageFor = (key) => key && url(CUTSCENE_IMAGES[key] ?? UI_IMAGES[key]);

const listItems = (items) => {
  const names = items.map((i) => `the ${ITEMS[i].name.toLowerCase()}`);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
};

const IDLE_MS = 25_000;
const STRIKE_REVEAL_MS = [20_000, 30_000];
const STRIKE_FIRST_MS = 9_000;
const STRIKE_AMBIENT_MS = [35_000, 55_000];
const BEAT_DELAY_MS = 1300;
const OBJECTIVE_GLOW_S = 9;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Game {
  constructor({ state, ui, world, sfx }) {
    this.state = state;
    this.ui = ui;
    this.world = world;
    this.sfx = sfx;
    this.busy = false;
    this.playing = false;
    this.revealOn = false;
    this.strikeClock = STRIKE_FIRST_MS;
    this.lastMutter = null;
    this.objectiveUntil = 0;
    this.lastTarget = undefined;
    this.timers = new Set();
    this.api = createApi(state, this.view());

    state.on('request-swap', () => this.swap(), this);
    state.on('flag', () => this.onFlag(), this);
    state.on('tide', () => this.onTide(), this);
    state.on('flash', (ms, color) => world.flashWindow(ms ?? 120, color ?? 0xfff1c4), this);
    state.on('hold', () => this.refresh(), this);
    state.on('muffled', (text) => this.later(700, () => this.ui.say(text)), this);
    state.on('roomstate', () => this.refresh(), this);
  }

  later(ms, fn) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
    return id;
  }

  clearTimers() {
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
  }

  /** Fresh run: after state.reset(). */
  begin() {
    const { state } = this;
    this.clearTimers();
    this.busy = false;
    this.strikeClock = STRIKE_FIRST_MS;
    this.lastMutter = null;
    this.world.resetPositions();
    this.world.who = null;
    this.enterRoom();
    state.noteInput();
    this.sfx.setStorm(state.tide / 6);
    this.playing = true;
    const start = () => {
      this.api.toast('look', 'look');
      this.introduceRoom();
    };
    if (state.seen.has('howto')) start();
    else this.ui.howTo(start);
  }

  // ---------- per frame ----------

  canMove() {
    const { state } = this;
    return this.playing && !this.busy && !state.modal && !this.ui.screen && state.holding?.by !== state.active;
  }

  update(dtMs, { paused, mouse }) {
    const { state } = this;
    const live = this.playing && !paused;
    if (live && !this.busy && !state.modal && !state.has('final_phase')) state.tick(dtMs);
    if (live && !state.modal) {
      const expired = state.tickHold(dtMs);
      if (expired) this.api.holdExpired(expired);
    }
    if (this.revealOn && (state.modal || this.busy)) this.showReveal(false);
    const look = this.playing && !this.busy && !state.modal && !this.ui.screen && !paused;
    const target = this.world.update(dtMs / 1000, state, { canMove: this.canMove() && !paused, canLook: look, mouse });
    if (target !== this.lastTarget) {
      this.lastTarget = target;
      this.ui.setTarget(target ? this.label(target) : null);
    }
    if (this.revealOn) this.ui.reveal(this.revealList());
    if (this.objectiveUntil && this.world.time > this.objectiveUntil) this.clearObjective();
    if (!live) return;
    this.updateLightning(dtMs);
    this.updateIdle();
  }

  label(id) {
    const hs = this.hotspotData(id);
    if (!hs) return null;
    const sel = this.state.selected;
    return sel ? `Use ${ITEMS[sel].name.toLowerCase()} on ${hs.label.toLowerCase()}` : hs.label;
  }

  hotspotData(id) {
    return ROOMS[this.state.room].hotspots.find((h) => h.id === id) ?? null;
  }

  visibleHotspots() {
    const { state } = this;
    return ROOMS[state.room].hotspots.filter((h) => !h.visibleIf || h.visibleIf(state));
  }

  updateIdle() {
    const { state } = this;
    if (this.busy || state.modal || state.holding || this.ui.showing || state.has('final_phase')) return;
    if (Date.now() - state.lastInputAt < IDLE_MS) return;
    const pool = IDLE_MUTTERS[state.active][tideBandIndex(state.tide)].filter((l) => l !== this.lastMutter);
    this.lastMutter = pool[Math.floor(Math.random() * pool.length)];
    state.noteInput();
    this.ui.say(`"${this.lastMutter}"`);
  }

  updateLightning(delta) {
    const { state } = this;
    const reveal = lightningPending(this.api);
    if (state.has('final_phase') || (!reveal && state.tide < 4)) return;
    this.strikeClock -= delta;
    if (this.strikeClock > 0) return;
    if (this.busy || state.modal || state.holding) {
      this.strikeClock = 1500;
      return;
    }
    const [lo, hi] = reveal ? STRIKE_REVEAL_MS : STRIKE_AMBIENT_MS;
    this.strikeClock = lo + Math.random() * (hi - lo);
    this.strike(reveal);
  }

  /** A lightning flash and thunder. While the window writing is unseen, it shows on Mara's glass. */
  strike(reveal = lightningPending(this.api)) {
    const lamp = this.state.room === 'lamp';
    this.world.strike(lamp ? 1 : 0.6, reveal && lamp);
    this.later(220, () => this.world.strike(lamp ? 0.7 : 0.4, false));
    this.later(450 + Math.random() * 500, () => this.sfx.play('thunder'));
    if (!reveal) return;
    this.later(600, () => {
      const result = lightningStrike(this.api);
      if (result === 'missed' && this.state.markSeen('lightning_missed')) this.ui.say(LIGHTNING_TEXT.missedCellar);
    });
  }

  // ---------- input ----------

  /** Click / E: use whatever the crosshair (or mouse, in drag mode) is on. */
  click(clientX = null, clientY = null) {
    const { state } = this;
    if (!this.playing || state.modal || this.busy || this.ui.screen) return false;
    const id = clientX === null ? this.world.target : this.world.pick(clientX, clientY);
    if (!id) return false;
    const hs = this.hotspotData(id);
    if (!hs) return false;
    this.sfx.play('click');
    if (this.objective === id) this.clearObjective();
    this.use(hs, state.selected);
    return true;
  }

  use(hs, item) {
    const { state } = this;
    if (state.modal || this.busy || !this.visibleHotspots().includes(hs)) return;
    if (item && !state.holds(item)) item = null;
    this.ui.clearMessages();
    interact(this.api, hs, item);
    if (item) state.select(null);
    this.lastTarget = undefined;
    if (this.busy) return;
    this.refresh();
  }

  /** Hold Space or Shift: mark and label everything usable in view. */
  showReveal(on) {
    const { state } = this;
    if (on && (!this.playing || state.modal || this.busy)) return;
    if (on === this.revealOn) return;
    this.revealOn = on;
    this.world.revealing = on;
    if (on) state.markSeen('space_reveal');
    this.ui.reveal(on ? this.revealList() : null);
  }

  revealList() {
    return this.world.visibleHotspots().map(({ id, x, y }) => ({ label: this.hotspotData(id)?.label ?? id, x, y }));
  }

  selectSlot(n) {
    const { state } = this;
    const item = state.inventory[state.active][n];
    if (!item) return;
    state.select(state.selected === item ? null : item);
    this.sfx.play('click');
  }

  cycleItem(dir) {
    const { state } = this;
    const inv = state.inventory[state.active];
    if (!inv.length) return;
    const i = inv.indexOf(state.selected);
    const next = i < 0 ? (dir > 0 ? 0 : inv.length - 1) : i + dir;
    state.select(next < 0 || next >= inv.length ? null : inv[next]);
  }

  // ---------- presentation hooks used by puzzle handlers ----------

  stagePoint(hs) {
    const p = hs && this.world.project(hs.id);
    return p?.onScreen ? p : { x: 640, y: 360 };
  }

  view() {
    return {
      say: (text) => this.ui.say(text),
      toast: (text) => this.ui.toast(text),
      sfx: (name) => this.sfx.play(name),
      pickup: (item, hs) => {
        const { x, y } = this.stagePoint(hs);
        this.ui.pickup(item, x, y);
      },
      sent: (item, hs) => {
        const { x, y } = this.stagePoint(hs);
        this.ui.sent(item, x, y, this.state.active === 'mara' ? 1 : -1);
      },
      roomChanged: (room) => this.onRoomChanged(room),
      refresh: () => this.refresh(),
      swapTo: (who) => this.swapTo(who),
      keypad: (opts) => this.ui.keypad(opts),
      choice: (opts) => this.ui.choice(opts),
      lens: (opts) => this.ui.lens(opts),
      valves: (opts) => this.ui.valves(opts),
      morse: (opts) => this.ui.morse(opts),
      talk: (lines, onDone, onChoose) => this.ui.talk(lines, onDone, onChoose),
      closeup: (id, then) => this.ui.closeup(id, then),
      cutscene: (id, then) => {
        this.busy = true;
        this.later(BEAT_DELAY_MS, () => {
          this.busy = false;
          this.playBeat(id, then);
        });
      },
      ending: (id, onDone) => this.showEnding(id, onDone),
      end: (id) => this.endGame(id),
    };
  }

  // ---------- world state ----------

  enterRoom() {
    const { state } = this;
    this.world.enter(state.active, state);
    this.ui.setTarget(null);
    this.lastTarget = undefined;
    this.objective = null;
    this.objectiveUntil = 0;
    document.body.classList.toggle('glasses', state.active === 'tobin');
    this.refresh();
  }

  /** Re-applies everything that depends on flags, the tide or the hold. */
  refresh() {
    const { state } = this;
    const visible = this.visibleHotspots();
    this.world.setActiveHotspots(visible.map((h) => h.id));
    for (const h of visible) if (h.visibleIf && state.markSeen(`reveal_${h.id}`)) this.world.shimmer([h.id]);
    this.world.sync(state);
    for (const h of ROOMS[state.room].hotspots) if (this.world.glows[h.id] !== 'objective') this.world.glow(h.id, null);
    const calling = state.has('final_phase') ? state.has('final_plate') && !state.has('final_seen') : !!pendingTalk(this.api);
    if (calling) this.world.glow(ROOMS[state.room].hotspots.find((h) => h.handler === 'hatch').id, 'calling');
    if (state.holding) this.world.glow(state.room === 'cellar' ? 'rheostat' : 'lamp', 'hold');
  }

  onFlag() {
    const { state } = this;
    this.refresh();
    if (this.objective && objectiveTarget(state) !== this.objective) this.clearObjective();
    if (pendingTalk(this.api) && !state.has('final_phase')) this.api.toast('tube', 'tube');
  }

  onTide() {
    this.sfx.setStorm(this.state.tide / 6);
    this.refresh();
    this.api.toast('tide', 'tide');
  }

  onRoomChanged(room) {
    this.refresh();
    if (room === this.state.room) this.world.quake(0.9);
  }

  /** First visit to a room: hotspots shimmer once, and the objective's hotspot pulses a while. */
  introduceRoom() {
    const { state } = this;
    if (!this.playing || !state.markSeen(`visit_${state.room}`)) return;
    const ids = this.visibleHotspots().map((h) => h.id);
    this.world.shimmer(ids);
    const target = objectiveTarget(state);
    if (target && ids.includes(target) && !state.has('final_phase')) {
      this.later(450 + ids.length * 140, () => {
        if (objectiveTarget(this.state) === target && this.visibleHotspots().some((h) => h.id === target)) {
          this.objective = target;
          this.objectiveUntil = this.world.time + OBJECTIVE_GLOW_S;
          if (!this.world.glows[target]) this.world.glow(target, 'objective');
        }
      });
    }
  }

  clearObjective() {
    if (this.objective && this.world.glows[this.objective] === 'objective') this.world.glow(this.objective, null);
    this.objective = null;
    this.objectiveUntil = 0;
  }

  // ---------- swapping ----------

  async swap() {
    const { state } = this;
    if (!this.playing || this.busy || state.modal) return;
    this.busy = true;
    state.markSeen('swapped');
    this.sfx.play('swap');
    this.showReveal(false);
    await this.ui.fade(1, 220);
    const { arrived, combined, reactions } = state.swap();
    this.enterRoom();
    this.ui.fade(0, 260);
    this.busy = false;
    this.ui.clearMessages();
    this.ui.hideToast();
    this.announceArrivals(arrived, combined, reactions);
    this.introduceRoom();
  }

  /** Switches character immediately, for scripted moments that happen under a black card. */
  swapTo(who) {
    const result = this.state.setActive(who);
    this.enterRoom();
    if (result) this.announceArrivals(result.arrived, result.combined, result.reactions);
  }

  announceArrivals(arrived, combined, reactions = []) {
    for (const line of reactions) this.ui.say(`"${line}"`);
    if (arrived.length) {
      this.sfx.play('pickup');
      this.ui.say(`${CHARACTERS[this.state.active].name} finds ${listItems(arrived)} in the dumbwaiter.`);
    }
    for (const combo of combined) this.ui.say(combo.text);
  }

  // ---------- cutscene beats and endings ----------

  async playBeat(id, onDone) {
    const { state } = this;
    const shots = (BEATS[id] ?? []).filter((s) => imageFor(s.image) || imageFor(s.fallback));
    if (!shots.length) return onDone?.();
    const wasBusy = this.busy;
    const wasModal = state.modal;
    this.busy = true;
    state.modal = true;
    this.showReveal(false);
    await this.ui.fade(1, 450);
    await this.ui.cutscene(shots, { mode: 'beat' });
    state.noteInput();
    this.ui.fade(0, 600);
    this.busy = wasBusy;
    state.modal = wasModal;
    onDone?.();
  }

  /** Cutter's reply in the window, the layered ending card, then the twist card into the final scene. */
  showEnding(id, onDone) {
    this.busy = true;
    const reply = ['.', '-', '.'];
    let t = 500;
    for (const sym of reply) {
      const ms = sym === '.' ? 160 : 520;
      this.later(t, () => this.world.flashWindow(ms, 0xd8f0ff));
      t += ms + 380;
    }
    const card = () => {
      this.sfx.play('win');
      this.ui.endingCard(endingCard(this.state, id), () => {
        this.ui.blackCard(TWIST_CARD, () => {
          this.busy = false;
          onDone();
        });
      });
    };
    this.later(t + 300, () => (ENDINGS[id]?.beat ? this.playBeat(ENDINGS[id].beat, card) : card()));
  }

  async endGame(id) {
    const { state } = this;
    this.busy = true;
    await this.ui.fade(1, 1400);
    this.playing = false;
    const seconds = Math.round((Date.now() - state.startedAt) / 1000);
    this.onEnd?.({
      id,
      actor: state.memo.final_actor ?? state.active,
      epilogue: epilogueLine(state.board),
      time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
      hints: state.hintsUsed,
      tide: state.tideBand ?? state.tide,
    });
  }
}

export { wait };
