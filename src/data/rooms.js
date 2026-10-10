// Layout data. Hotspot rectangles are in 1280x720 game coordinates; keep them above y = 636,
// where the inventory bar starts. After dropping in real art, run on localhost, press F2 and
// drag to measure new rectangles (shift-click places the character and the floor line).

// `faces`: which way each pose's art looks (1 right, -1 left). The idle pose faces the viewer
// and is never flipped; the others are mirrored to face where the character is going.
// `crouchH`: the crouch art is drawn closer than the idle pose, so it is fitted to this fraction
// of the standing height, which keeps the head the same size on screen (measured on the art).
export const CHARACTERS = {
  mara: { name: 'Mara', room: 'lamp', color: 0xb5413a, css: '#e0786f', faces: { act: 1, walk: 1, crouch: 1, talk: 1 }, crouchH: 0.66 },
  tobin: { name: 'Tobin', room: 'cellar', color: 0xd9a441, css: '#e8c070', faces: { act: -1, walk: 1, crouch: 1, talk: 1 }, crouchH: 0.52 },
};

// Hotspots may set `stand: x` for where the character stops to use them; otherwise they stop
// beside the hotspot on the side they approach from. `handler: 'exit'` with `to` walks into
// another area. Side areas (`main` set) take their art from the main room's state through
// `images`, and `arrive[from]` is where a character appears when walking in from `from`.
// A character walking in stands at the `stand` of the visible hotspot leading back where they
// came from, else at `arrive[from]`. `ghost` is where Captain Hale stands in that room.
export const ROOMS = {
  lamp: {
    name: 'The Lamp Room',
    // x, y = start feet position; h = on-screen height in pixels.
    char: { x: 860, y: 655, h: 400 },
    // Walkable strip of floor: feet stay on y, between minX and maxX.
    floor: { minX: 130, maxX: 1180, y: 655 },
    // Glass of the window, where the tide view and signal flashes are drawn.
    window: { x: 905, y: 82, w: 180, h: 372 },
    arrive: { gallery: 1120 },
    ghost: { x: 1010, y: 650, h: 430 },
    hotspots: [
      { id: 'logbook', label: 'Logbook', x: 150, y: 355, w: 200, h: 70 },
      { id: 'drawer', label: 'Desk drawer', x: 225, y: 430, w: 150, h: 65 },
      { id: 'lamp', label: 'Great lamp', x: 495, y: 50, w: 295, h: 450 },
      { id: 'window', label: 'Window', x: 890, y: 75, w: 200, h: 390 },
      { id: 'balcony', label: 'Gallery door', x: 1150, y: 125, w: 105, h: 505 },
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
    // The way down to the tide-wheel chamber is the wooden trapdoor painted into `hatchArt`
    // (closed, lifted, and lifted in the flooded room). Without that art the game falls back to
    // the plain cellar paintings and an iron door drawn in code (`door`, with the crate redrawn
    // over its foot as `front`). Hotspots marked `art` need the art; `noArt` ones replace them.
    hatchArt: { closed: 'cellar_hatch', open: 'cellar_hatch_open', flooded: 'cellar_after_hatch' },
    door: { x: 1132, y: 168, w: 116, h: 360, front: { x: 990, y: 452, w: 270, h: 190 } },
    arrive: { wheelroom: 1090 },
    ghost: { x: 470, y: 660, h: 430 },
    hotspots: [
      { id: 'valves', label: 'Valve wheels', x: 0, y: 395, w: 345, h: 170 },
      { id: 'chalk', label: 'Chalk marks', x: 590, y: 230, w: 125, h: 190 },
      { id: 'plate', label: 'Glass plate', x: 590, y: 60, w: 130, h: 154 },
      { id: 'locker', label: 'Steel locker', x: 720, y: 155, w: 155, h: 410 },
      { id: 'crate', label: 'Supply crate', x: 995, y: 455, w: 260, h: 178 },
      { id: 'stairs', label: 'Stairs up', x: 355, y: 140, w: 225, h: 400 },
      { id: 'hatch_cellar', handler: 'hatch', label: 'Hatch and speaking tube', x: 910, y: 105, w: 205, h: 165 },
      // One rect per painting: closed, lifted (the opening sits further right), and flooded (further
      // forward and to the left). All are cut off at the inventory strip.
      {
        id: 'floor_hatch',
        handler: 'floor_hatch',
        to: 'wheelroom',
        label: 'Floor hatch',
        x: 270,
        y: 522,
        w: 362,
        h: 114,
        stand: 700,
        art: 'cellar_hatch',
        visibleIf: (s) => s.roomStates.cellar !== 'after' && !s.has('hatch_open'),
      },
      {
        id: 'floor_hatch_open',
        handler: 'floor_hatch',
        to: 'wheelroom',
        label: 'Down the ladder',
        x: 320,
        y: 470,
        w: 400,
        h: 166,
        stand: 760,
        art: 'cellar_hatch',
        visibleIf: (s) => s.roomStates.cellar !== 'after' && s.has('hatch_open'),
      },
      {
        id: 'floor_hatch_wet',
        handler: 'floor_hatch',
        to: 'wheelroom',
        label: 'Floor hatch',
        x: 110,
        y: 470,
        w: 395,
        h: 166,
        stand: 590,
        art: 'cellar_after_hatch',
        visibleIf: (s) => s.roomStates.cellar === 'after',
      },
      { id: 'wheel_door', handler: 'exit', to: 'wheelroom', label: 'Iron door', x: 1128, y: 160, w: 128, h: 290, stand: 1100, noArt: 'cellar_hatch' },
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
  // Mara's side area: the iron walkway round the outside of the lamp room.
  gallery: {
    name: 'The Gallery',
    main: 'lamp',
    images: { before: 'gallery', after: 'gallery_lit' },
    outdoor: true,
    back: 'back inside first',
    char: { x: 1120, y: 600, h: 385 },
    floor: { minX: 110, maxX: 1180, y: 600 },
    arrive: { lamp: 1120 },
    ghost: { x: 640, y: 600, h: 440 },
    hotspots: [
      { id: 'gallery_back', handler: 'exit', to: 'lamp', label: 'Back inside', x: 1150, y: 300, w: 130, h: 300, stand: 1170 },
      { id: 'tally', label: 'Scratches on the frame', x: 755, y: 300, w: 120, h: 120 },
      { id: 'rail', label: 'The rail', x: 20, y: 300, w: 440, h: 135 },
      { id: 'mooring', label: 'The landing below', x: 480, y: 330, w: 250, h: 110 },
    ],
  },
  // Tobin's side area: the tide-wheel chamber behind the cellar wall.
  wheelroom: {
    name: 'The Tide-Wheel Chamber',
    main: 'cellar',
    images: { before: 'wheelroom', after: 'wheelroom_flooded' },
    back: 'back to the cellar first',
    char: { x: 250, y: 660, h: 400 },
    floor: { minX: 150, maxX: 1150, y: 660 },
    wade: { after: 0.12 },
    tideWade: 0.012,
    arrive: { cellar: 250 },
    ghost: { x: 780, y: 655, h: 440 },
    hotspots: [
      { id: 'wheel_back', handler: 'exit', to: 'cellar', label: 'Back up to the cellar', x: 55, y: 175, w: 165, h: 320, stand: 200 },
      { id: 'tide_wheel', label: 'Tide wheel', x: 375, y: 90, w: 400, h: 420 },
      { id: 'dynamo', label: 'Dynamo', x: 835, y: 360, w: 145, h: 125 },
      { id: 'slate', label: 'Workbench', x: 990, y: 395, w: 290, h: 150 },
      { id: 'hook', label: 'Wall lantern', x: 1060, y: 110, w: 100, h: 200 },
    ],
  },
};

/** The main room an area belongs to (itself for the lamp room and cellar). */
export const mainRoom = (area) => ROOMS[area]?.main ?? area;
