// Cutscenes: painted stills with a slow pan/zoom and typed captions.
// `from`/`to` are camera framings: x, y = the point of the image held at screen centre (0..1),
// zoom = scale on top of "cover the screen". `duration` is the pan length in ms; the shot itself
// lasts until its last caption has been read (or the player clicks on). `rain` is overlay strength.

export const OPENING = [
  {
    image: 'cut_storm',
    from: { x: 0.5, y: 0.5, zoom: 1.04 },
    to: { x: 0.62, y: 0.52, zoom: 1.12 },
    duration: 11000,
    captions: [
      'Atlantic, 1928.',
      'Sailors call this stretch of sea the Triangle. Compasses wander, ships vanish, and nobody is ever to blame.',
      'Nine ships have been lost on the reef below Gull Rock Light in three years.',
    ],
  },
  {
    image: 'cut_fall',
    from: { x: 0.5, y: 0.3, zoom: 1.25 },
    to: { x: 0.58, y: 0.65, zoom: 1.12 },
    duration: 8000,
    captions: [
      'Three nights ago the keeper, Elias Venn, was found on the rocks at the foot of the tower.',
      'Harbourmaster Crane called it a fall.',
    ],
  },
  {
    image: 'cut_rowboat',
    from: { x: 0.55, y: 0.5, zoom: 1.05 },
    to: { x: 0.35, y: 0.65, zoom: 1.25 },
    duration: 10000,
    captions: [
      'Tonight two people rowed out to find out why the light keeps going dark.',
      'Mara Quell, a coastguard signaller dismissed after the Marigold went down. Tobin Ashby, Elias\'s apprentice.',
    ],
  },
  {
    image: 'cut_barred',
    from: { x: 0.5, y: 0.45, zoom: 1.25 },
    to: { x: 0.5, y: 0.5, zoom: 1.05 },
    duration: 5000,
    rain: 0.3,
    captions: ['Someone barred the doors behind them.'],
  },
  {
    image: 'title',
    from: { x: 0.73, y: 0.2, zoom: 2 },
    to: { x: 0.72, y: 0.72, zoom: 2 },
    duration: 8000,
    captions: ['Mara is in the lamp room. Tobin is in the cellar.', 'A ship is due on the evening tide.'],
  },
];

// Captain Hale's flashbacks (GHOSTS in story.js), played as beats with a dreamlike treatment:
// desaturated, misted edges, a slow push in and handwritten captions. `fallback` is existing art
// shown in the same treatment if the vision still is missing. None of them names a killer.
export const VISIONS = {
  flood: [
    {
      image: 'vision_dim',
      fallback: 'lamp_after',
      from: { x: 0.5, y: 0.45, zoom: 1.05 },
      to: { x: 0.48, y: 0.4, zoom: 1.18 },
      duration: 9000,
      captions: ['Three years ago. The lamp on Gull Rock burning low and orange, the way somebody wanted it.', 'A careful hand on the rheostat. Then the hand let go.'],
    },
    {
      image: 'vision_marigold',
      fallback: 'cut_storm',
      from: { x: 0.5, y: 0.5, zoom: 1.04 },
      to: { x: 0.56, y: 0.55, zoom: 1.16 },
      duration: 9000,
      captions: ['The Marigold came round the reef in the dark, looking for a light that wasn\'t there.', 'On her foredeck a deckhand called Danny Quell was singing. Then the reef.'],
    },
  ],
  stairs: [
    {
      image: 'vision_stairs',
      fallback: 'closeup_bootprints',
      from: { x: 0.5, y: 0.6, zoom: 1.05 },
      to: { x: 0.5, y: 0.35, zoom: 1.2 },
      duration: 10000,
      captions: ['Thursday night. Boots on the iron stairs, climbing. Later, other boots.', 'A raised voice at the rail. The wind took the words.', 'Then one pair of boots going down, quickly.'],
    },
  ],
  crane: [
    {
      image: 'vision_crane',
      fallback: 'closeup_ledger',
      from: { x: 0.45, y: 0.5, zoom: 1.04 },
      to: { x: 0.55, y: 0.48, zoom: 1.18 },
      duration: 10000,
      captions: ['The harbour office, the morning after the Marigold. A pen moving down a column.', 'Marigold. Reef. Paid in full.', 'Harbourmaster Crane never set foot on the rock. He never needed to.'],
    },
  ],
  // How Captain Hale died, in his own words. It shows the hand on the light, never whose it was.
  hale: [
    {
      image: 'hale_bridge',
      fallback: 'cut_storm',
      from: { x: 0.5, y: 0.5, zoom: 1.04 },
      to: { x: 0.55, y: 0.46, zoom: 1.14 },
      duration: 9000,
      captions: ['Three years ago. I had the Marigold\'s wheel, and Gull Rock Light burning true off the starboard bow.', 'I steered by it, as I had a hundred nights.'],
    },
    {
      image: 'hale_dark',
      fallback: 'vision_dim',
      from: { x: 0.5, y: 0.45, zoom: 1.06 },
      to: { x: 0.5, y: 0.4, zoom: 1.2 },
      duration: 9000,
      captions: ['The light was there. Then a hand that knew the lamp turned it down.', 'Not out. Down. Low enough that a tired man doubts his own eyes.'],
    },
    {
      image: 'hale_reef',
      fallback: 'vision_marigold',
      from: { x: 0.5, y: 0.55, zoom: 1.05 },
      to: { x: 0.45, y: 0.6, zoom: 1.18 },
      duration: 9000,
      captions: ['Hard over. Too late. The reef opened her like a letter.', 'Thirty-one souls aboard. The water was very cold, and very quick.'],
    },
    {
      image: 'hale_last',
      fallback: 'cut_lamplit',
      from: { x: 0.5, y: 0.5, zoom: 1.12 },
      to: { x: 0.5, y: 0.42, zoom: 1.02 },
      duration: 9000,
      captions: ['I held the wheel until there was no ship under it.', 'The last thing I saw was the light coming back up. Full and bright. Too late for anyone.'],
    },
  ],
};

// Short mid-game beats. They return to the game where it left off. `fallback` is shown if the
// still is missing; with neither, the beat is skipped.
export const BEATS = {
  // When the lamp first reaches full power.
  lamplit: [
    {
      image: 'cut_lamplit',
      fallback: 'ending_open',
      from: { x: 0.45, y: 0.45, zoom: 1.18 },
      to: { x: 0.6, y: 0.55, zoom: 1.05 },
      duration: 9000,
      rain: 0.5,
      captions: [
        'Gull Rock Light burns at full power for the first time in years.',
        'The beam sweeps the reef and finds the Marigold\'s broken hull.',
        'Whatever Elias left in that glass, it is lit now.',
      ],
    },
  ],
  // Truth ending: after the cutter answers CRANE, before the ending card.
  arrest: [
    {
      image: 'cut_arrest',
      fallback: 'ending_truth',
      from: { x: 0.5, y: 0.5, zoom: 1.04 },
      to: { x: 0.42, y: 0.55, zoom: 1.16 },
      duration: 9000,
      rain: 0.15,
      captions: [
        'The Vigilant reached the harbour before dawn.',
        'Harbourmaster Crane was led along his own quay in irons.',
        'He looked back once, toward the rock.',
      ],
    },
  ],
};
