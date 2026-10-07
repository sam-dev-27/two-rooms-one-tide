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
