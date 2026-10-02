// Layout data. Hotspot rectangles are in 1280x720 game coordinates; keep them above y = 636,
// where the inventory bar starts. After dropping in real art, run on localhost, press D and
// drag to measure new rectangles (shift-click places the character).

export const CHARACTERS = {
  mara: { name: 'Mara', room: 'lamp', color: 0xb5413a },
  tobin: { name: 'Tobin', room: 'cellar', color: 0xd9a441 },
};

export const ROOMS = {
  lamp: {
    name: 'The Lamp Room',
    // x, y = feet position; h = on-screen height in pixels.
    char: { x: 860, y: 655, h: 400 },
    hotspots: [
      { id: 'logbook', label: 'Logbook', x: 150, y: 355, w: 200, h: 70 },
      { id: 'drawer', label: 'Desk drawer', x: 225, y: 430, w: 150, h: 65 },
      { id: 'lamp', label: 'Great lamp', x: 495, y: 50, w: 295, h: 450 },
      { id: 'window', label: 'Window', x: 890, y: 75, w: 200, h: 390 },
      { id: 'balcony', label: 'Balcony door', x: 1150, y: 125, w: 105, h: 505 },
      { id: 'hatch_lamp', handler: 'hatch', label: 'Dumbwaiter hatch', x: 385, y: 425, w: 125, h: 95 },
    ],
  },
  cellar: {
    name: 'The Cellar',
    char: { x: 820, y: 660, h: 420 },
    hotspots: [
      { id: 'valves', label: 'Valve wheels', x: 40, y: 250, w: 320, h: 160 },
      { id: 'chalk', label: 'Chalk marks', x: 390, y: 110, w: 150, h: 110 },
      { id: 'locker', label: 'Steel locker', x: 560, y: 190, w: 190, h: 330 },
      { id: 'crate', label: 'Supply crate', x: 950, y: 470, w: 240, h: 160 },
      { id: 'door', label: 'Cellar door', x: 1200, y: 190, w: 80, h: 380 },
      { id: 'hatch_cellar', handler: 'hatch', label: 'Dumbwaiter hatch', x: 1060, y: 150, w: 130, h: 120 },
      {
        id: 'plank',
        label: 'Floating plank',
        x: 400,
        y: 470,
        w: 240,
        h: 70,
        visibleIf: (s) => s.has('valves_set') && !s.has('evidence_found'),
      },
    ],
  },
};
