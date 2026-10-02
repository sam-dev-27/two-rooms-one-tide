import { HINTS } from '../data/text.js';
import { HINT_DELAY_MS } from '../config.js';

export function nextHint(state) {
  return HINTS.find((h) => !h.done(state))?.text ?? 'Look around. Both rooms still hide something.';
}

/** True once the player has gone HINT_DELAY_MS without progress or a hint. */
export function isStuck(state, now = Date.now()) {
  return !state.modal && now - Math.max(state.lastProgressAt, state.lastHintAt) > HINT_DELAY_MS;
}

export function useHint(state) {
  state.hintsUsed++;
  state.lastHintAt = Date.now();
  return nextHint(state);
}
