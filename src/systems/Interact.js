// Bridges puzzle handlers to the game. `view` supplies presentation (text, sound, animation,
// modals); everything that changes game state goes through `state` here.
import { HANDLERS, pendingTalk } from '../data/puzzles.js';
import { TUTORIAL, WRONG_ITEM } from '../data/text.js';

export function createApi(state, view) {
  const api = {
    hotspot: null,

    get actor() {
      return state.active;
    },
    get tideLevel() {
      return state.tide;
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

    swapTo(who) {
      if (state.active !== who) view.swapTo(who);
    },

    keypad: (opts) => view.keypad(opts),
    choice: (opts) => view.choice(opts),
    lens: (opts) => view.lens(opts),
    valves: (opts) => view.valves(opts),
    morse: (opts) => view.morse(opts),
    talk: (lines, onDone) => view.talk(lines, onDone),
    ending: (id, onDone) => view.ending(id, onDone),
    end: (id) => view.end(id),
    refresh: () => view.refresh(),

    wrongItem() {
      view.sfx('error');
      view.say(WRONG_ITEM[Math.floor(Math.random() * WRONG_ITEM.length)]);
    },
  };
  return api;
}

export { pendingTalk };

export function interact(api, hotspot, item = null) {
  api.hotspot = hotspot;
  const handler = HANDLERS[hotspot.handler ?? hotspot.id];
  if (handler) handler(api, item);
  else api.say(hotspot.label);
}
