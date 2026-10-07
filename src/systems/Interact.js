// Bridges puzzle handlers to the game. `view` supplies presentation (text, sound, animation,
// modals); everything that changes game state goes through `state` here.
import { HANDLERS, HOLDS, pendingTalk } from '../data/puzzles.js';
import { TUTORIAL, WRONG_ITEM, BARKS, HOLD_TEXT, TRUST_DELTA } from '../data/text.js';

export function createApi(state, view) {
  const api = {
    hotspot: null,

    get actor() {
      return state.active;
    },
    get tideLevel() {
      return state.tide;
    },
    get trust() {
      return state.trust;
    },
    get holding() {
      return state.holding;
    },
    has: (flag) => state.has(flag),
    set: (flag) => state.set(flag),
    holds: (item) => state.holds(item),
    inventoryEmpty: () => state.inventory[state.active].length === 0,

    say: (text) => view.say(text),
    sfx: (name) => view.sfx(name),
    note: (id, text) => state.addNote(id, text),

    toast(id, tutorialKey) {
      if (state.markSeen(id)) view.toast(TUTORIAL[tutorialKey]);
    },

    /** Puts a clue on the case board. The board tip waits until swapping has been learned. */
    card(id) {
      if (!state.addCard(id)) return;
      view.cardAdded?.(id);
      if (state.seen.has('swapped')) api.toast('board', 'board');
    },

    adjustTrust: (n) => state.adjustTrust(n),
    queueReaction: (who, line) => state.queueReaction(who, line),

    /** Applies a speaking-tube line choice: trust, a remembered flag, and any card it unlocks. */
    chose(choice, option) {
      state.adjustTrust(TRUST_DELTA[option.kind] ?? 0);
      state.set(`${choice.choice}_${option.kind}`);
      if (option.card) api.card(option.card);
    },

    give(item) {
      const combined = state.give(item);
      view.pickup(item, api.hotspot);
      view.sfx('pickup');
      for (const combo of combined) view.say(combo.text);
      // Teach sending only after swapping has been learned, so the two tips never collide.
      if (state.seen.has('swapped')) api.toast('send', 'send');
    },

    consume: (item) => state.take(item),

    send(item) {
      if (!state.send(item)) return;
      view.sfx('send');
      view.sent(item, api.hotspot);
    },

    setRoomState(room, value) {
      state.setRoomState(room, value);
      view.roomChanged(room, value);
    },

    /** Per-puzzle scratch memory (wheel settings, lens rotation) that survives closing a modal. */
    memo(key, init) {
      if (!(key in state.memo)) state.memo[key] = init;
      return state.memo[key];
    },
    remember: (key, value) => (state.memo[key] = value),

    raiseTide(n = 1) {
      const before = state.tide;
      const after = state.advanceTide(n);
      return after - before;
    },
    lockTide: () => state.lockTide(),

    startHold: (id, by, ms) => state.startHold(id, by, ms),
    endHold: () => state.endHold(),
    /** Called by the scene when a hold's countdown runs out. */
    holdExpired(hold) {
      HOLDS[hold.id]?.slip(api);
      view.refresh();
    },

    swapTo(who) {
      if (state.active !== who) view.swapTo(who);
    },

    keypad: (opts) => view.keypad(opts),
    choice: (opts) => view.choice(opts),
    lens: (opts) => view.lens(opts),
    valves: (opts) => view.valves(opts),
    morse: (opts) => view.morse(opts),
    talk: (lines, onDone) => view.talk(lines, onDone, (choice, option) => api.chose(choice, option)),
    ending: (id, onDone) => view.ending(id, onDone),
    end: (id) => view.end(id),
    refresh: () => view.refresh(),

    /** Shows a painted close-up (CLOSEUPS[id]); `then` runs once it is closed. */
    closeup(id, then) {
      if (view.closeup) view.closeup(id, then);
      else then?.();
    },
    /** Plays a short cutscene beat (BEATS[id]) and returns to the game; `then` runs afterwards. */
    cutscene(id, then) {
      if (view.cutscene) view.cutscene(id, then);
      else then?.();
    },

    wrongItem() {
      view.sfx('error');
      view.say(WRONG_ITEM[Math.floor(Math.random() * WRONG_ITEM.length)]);
    },
  };
  return api;
}

export { pendingTalk };

/** Exhausted hotspots cycle through their barks, with the handler's own line every few clicks. */
function bark(api, hotspot, item) {
  const entry = BARKS[hotspot.id];
  if (item || !entry || api.has('final_phase') || !entry.when(api)) return false;
  const key = `bark_${hotspot.id}`;
  const n = api.memo(key, 0);
  api.remember(key, n + 1);
  const at = n % (entry.lines.length + 1);
  if (at === 0) return false;
  api.say(entry.lines[at - 1]);
  return true;
}

export function interact(api, hotspot, item = null) {
  api.hotspot = hotspot;
  const id = hotspot.handler ?? hotspot.id;
  const hold = api.holding;
  if (hold && api.actor === hold.by && id !== hold.id) return api.say(HOLD_TEXT.busy);
  if (bark(api, hotspot, item)) return;
  const handler = HANDLERS[id];
  if (handler) handler(api, item);
  else api.say(hotspot.label);
}
