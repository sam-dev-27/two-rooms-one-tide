// Layout data. Hotspot rectangles are in 1280x720 game coordinates; keep them above y = 636,
// where the inventory bar starts. After dropping in real art, run on localhost, press L and
// drag to measure new rectangles (shift-click places the character and the floor line).

// `faces`: which way each pose's art looks (1 right, -1 left). The idle pose faces the viewer
// and is never flipped; the others are mirrored to face where the character is going.
export const CHARACTERS = {
  mara: { name: 'Mara', room: 'lamp', color: 0xb5413a, css: '#e0786f', faces: { act: 1, walk: 1, crouch: 1, talk: 1 } },
  tobin: { name: 'Tobin', room: 'cellar', color: 0xd9a441, css: '#e8c070', faces: { act: -1, walk: 1, crouch: 1, talk: 1 } },
};

// Hotspots may set `stand: x` for where the character stops to use them; otherwise they stop
// beside the hotspot on the side they approach from.
export const ROOMS = {
  lamp: {
    name: 'The Lamp Room',
    // x, y = start feet position; h = on-screen height in pixels.
    char: { x: 860, y: 655, h: 400 },
    // Walkable strip of floor: feet stay on y, between minX and maxX.
    floor: { minX: 130, maxX: 1180, y: 655 },
    // Glass of the window, where the tide view and signal flashes are drawn.
    window: { x: 905, y: 82, w: 180, h: 372 },
    hotspots: [
      { id: 'logbook', label: 'Logbook', x: 150, y: 355, w: 200, h: 70 },
      { id: 'drawer', label: 'Desk drawer', x: 225, y: 430, w: 150, h: 65 },
      { id: 'lamp', label: 'Great lamp', x: 495, y: 50, w: 295, h: 450 },
      { id: 'window', label: 'Window', x: 890, y: 75, w: 200, h: 390 },
      { id: 'balcony', label: 'Balcony door', x: 1150, y: 125, w: 105, h: 505 },
      { id: 'hatch_lamp', handler: 'hatch', label: 'Hatch and speaking tube', x: 385, y: 425, w: 125, h: 95 },
    ],
  },
  cellar: {
    name: 'The Cellar',
    char: { x: 935, y: 665, h: 400 },
    floor: { minX: 120, maxX: 1180, y: 665 },
    // Water depth per room state, as a fraction of char.h; the figure is cut off at the waterline.
    // Before the flood the depth follows the tide instead (see GameScene.waterDepth).
    wade: { after: 0.27 },
    tideWade: 0.018,
    plate: { x: 594, y: 66, w: 122, h: 142 },
    hotspots: [
      { id: 'valves', label: 'Valve wheels', x: 0, y: 395, w: 345, h: 170 },
      { id: 'chalk', label: 'Chalk marks', x: 590, y: 230, w: 125, h: 190 },
      { id: 'plate', label: 'Glass plate', x: 590, y: 60, w: 130, h: 154 },
      { id: 'locker', label: 'Steel locker', x: 720, y: 155, w: 155, h: 410 },
      { id: 'crate', label: 'Supply crate', x: 995, y: 455, w: 260, h: 178 },
      { id: 'stairs', label: 'Stairs up', x: 355, y: 140, w: 225, h: 400 },
      { id: 'hatch_cellar', handler: 'hatch', label: 'Hatch and speaking tube', x: 910, y: 105, w: 205, h: 165 },
      {
        id: 'rheostat',
        label: 'Rheostat',
        x: 248,
        y: 186,
        w: 100,
        h: 110,
        visibleIf: (s) => s.has('lamp_lit'),
      },
      {
        id: 'plank',
        label: 'Floating plank',
        x: 530,
        y: 480,
        w: 220,
        h: 145,
        visibleIf: (s) => s.has('valves_set') && !s.has('evidence_found'),
      },
    ],
  },
};
