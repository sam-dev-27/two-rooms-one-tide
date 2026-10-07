import { HINTS } from '../data/text.js';
import { HINT_DELAY_MS } from '../config.js';

const FALLBACK = 'Look around. Both rooms still hide something.';

function current(state) {
  const index = HINTS.findIndex((h) => !h.done(state));
  if (index < 0) return { index, texts: [FALLBACK] };
  const { text } = HINTS[index];
  return { index, texts: Array.isArray(text) ? text : [text] };
}

/** The hint the next press would show; repeated presses on one step escalate through its array. */
export function nextHint(state) {
  const { index, texts } = current(state);
  const level = state.hintLevels?.[index] ?? 0;
  return texts[Math.min(level, texts.length - 1)];
}

/** True once the player has gone HINT_DELAY_MS without progress or a hint. */
export function isStuck(state, now = Date.now()) {
  return !state.modal && now - Math.max(state.lastProgressAt, state.lastHintAt) > HINT_DELAY_MS;
}

/** The current step's short goal for `who` (default: the active character), or null once the story is done. */
export function objective(state, who = state.active) {
  const step = HINTS.find((h) => !h.done(state));
  const o = step?.objective?.[who];
  return (typeof o === 'function' ? o(state) : o) ?? null;
}

/** Hotspot id the current step points `who` at, if any. */
export function objectiveTarget(state, who = state.active) {
  return HINTS.find((h) => !h.done(state))?.target?.[who] ?? null;
}

export function useHint(state) {
  const text = nextHint(state);
  const { index } = current(state);
  state.hintLevels[index] = (state.hintLevels[index] ?? 0) + 1;
  state.hintsUsed++;
  state.lastHintAt = Date.now();
  return text;
}
