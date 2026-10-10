// Bridges puzzle handlers to the game. `view` supplies presentation (text, sound, animation,
// modals); everything that changes game state goes through `state` here.
import { HANDLERS, HOLDS, pendingTalk } from '../data/puzzles.js';
import { TUTORIAL, WRONG_ITEM, BARKS, HOLD_TEXT, TRUST_DELTA, CHOICE_LABELS, trusting } from '../data/text.js';
import { CHAPTERS, GHOSTS } from '../data/story.js';
import { VISIONS } from '../data/cutscenes.js';
import { ROOMS } from '../data/rooms.js';
import { recordRaid } from './Raid.js';

export function createApi(state, view) {
  const api = {
    hotspot: null,

    get actor() {
      return state.active;
    },
    /** The area the active character is in (their main room unless they walked out of it). */
    get area() {
      return state.room;
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
    /** A line worth keeping in the story log as well as saying. */
    narrate(text) {
      state.logLine('narration', null, text);
      view.say(text);
    },
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

    logChoice: (who, title, options, chosen) => state.logChoice(who, title, options, chosen),

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

    /** A one-off visual beat in the room (the floor hatch lifting); purely presentation. */
    effect: (name) => view.effect?.(name),

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

    /**
     * Walks the active character into another area. Returns false when the view has no areas
     * (the 3D version), so handlers can fall back to their single-room behaviour.
     */
    goTo(area) {
      if (!view.goTo || !ROOMS[area]) return false;
      const from = state.room;
      if (!state.setArea(state.active, area)) return false;
      view.goTo(area, from);
      return true;
    },
    homeAll() {
      state.homeAll();
      view.refresh();
    },

    /** Shows a chapter card once (CHAPTERS[id]); `then` runs after it, or at once if it was already shown. */
    chapter(id, then) {
      if (!CHAPTERS[id] || !state.beginChapter(id)) return then?.();
      if (view.chapter) view.chapter(CHAPTERS[id], then);
      else then?.();
    },

    /**
     * Captain Hale appears (GHOSTS[id]) once. His lines, any vision captions and cards are
     * recorded straight away; the view shows him whenever the witness is in the right place.
     */
    ghost(id) {
      const def = GHOSTS[id];
      if (!def || state.has(`ghost_${id}`)) return false;
      state.set(`ghost_${id}`);
      for (const line of def.lines) state.logLine('ghost', 'captain', line);
      const react = def.react?.[trusting(state) ? 'warm' : 'cold'];
      if (react) state.logLine('talk', def.who, react);
      for (const shot of VISIONS[def.vision] ?? []) for (const line of shot.captions) state.logLine('vision', null, line);
      for (const card of def.cards ?? []) api.card(card);
      if (view.ghost) view.ghost({ id, ...def, react });
      else for (const line of def.lines) view.say(`A drowned man's voice: "${line}"`);
      return true;
    },

    keypad: (opts) => view.keypad(opts),
    choice: (opts) => view.choice(opts),
    lens: (opts) => view.lens(opts),
    valves: (opts) => view.valves(opts),
    morse: (opts) => view.morse(opts),

    /** A conversation. Lines are logged as they are reached; a choice logs every option on offer. */
    talk(lines, onDone) {
      const rest = [...lines];
      const logUntilChoice = () => {
        while (rest.length && Array.isArray(rest[0])) state.logLine('talk', ...rest.shift());
        rest.shift();
      };
      logUntilChoice();
      view.talk(lines, onDone, (choice, option) => {
        api.chose(choice, option);
        state.logChoice(
          choice.who,
          null,
          choice.options.map((o) => `${CHOICE_LABELS[o.kind]}: ${o.label}`),
          choice.options.indexOf(option),
        );
        for (const line of option.lines) if (Array.isArray(line)) state.logLine('talk', ...line);
        logUntilChoice();
      });
    },
    /**
     * The finale raid, once per game. Views without one (the 3D version) skip it and the ending
     * card simply has no raid line; otherwise the result is recorded before `then` runs.
     */
    raid(then) {
      if (state.has('raid_done') || !view.raid) return then?.();
      view.raid((result) => {
        recordRaid(state, result);
        then?.();
      });
    },
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
