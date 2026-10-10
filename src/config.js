export const WIDTH = 1280;
export const HEIGHT = 720;

// Upright Georgia for the interface and dialogue; Georgia italic for anything written by a hand in
// the world (logbook, ledger, chalk, notes, cards, the captain's lines).
export const FONT = 'Georgia, "Times New Roman", serif';

export const COLORS = {
  ink: 0x070b10,
  panel: 0x111a24,
  panelEdge: 0xd9a441,
  amber: 0xd9a441,
  amberCss: '#d9a441',
  paperCss: '#f3e6c8',
  mutedCss: '#9fb3c1',
};

export const HINT_DELAY_MS = 60_000;

// Tide clock: 0..TIDE_MAX, +1 per TIDE_STEP_MS of active play (paused in modals and talks).
export const TIDE_MAX = 6;
export const TIDE_STEP_MS = 180_000;
