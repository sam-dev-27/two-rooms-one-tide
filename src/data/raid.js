// The finale raid: after the signal goes out, Crane's wreckers row in to put the light out before
// the cutter arrives. Tuning and text live here; the rules are in src/systems/Raid.js (no Phaser)
// and the presentation in src/scenes/RaidScene.js. Times are in ms, meters run 0..100.

export const RAID = {
  durationMs: 75_000,
  seed: 1928,
  meterMax: 100,
  // When a meter empties there is a scuffle, the front is cleared and the meter comes back to this.
  refill: 45,
  gallery: {
    // Climbers appear along the rail; the gap between them shrinks from the first to the second value.
    firstMs: 2500,
    everyMs: [6500, 4300],
    climbMs: 10_000,
    // Inside the beam a climber slows to this fraction and goes blind after blindMs of light.
    beamSlow: 0.3,
    blindMs: 450,
    // Over the rail he hits the lamp every hitMs until shoved off with `shoves` clicks, each within shoveGapMs.
    hitMs: 3300,
    damage: 12,
    shoves: 3,
    shoveGapMs: 900,
    // Rail positions as 0..1 along the walkway.
    lanes: [0.08, 0.92],
  },
  cellar: {
    firstMs: 6000,
    everyMs: [8500, 5600],
    wadeMs: 11_000,
    // The timing ring shrinks from 1 to 0 every ringMs; a click while it is inside `green` shoves him back.
    ringMs: 1600,
    green: [0.16, 0.42],
    hitMs: 3300,
    damage: 11,
  },
  // Damage is summed over both meters. Tuned with scripted bots: a quick player stays clean, a slow
  // one (about a second to react, half the rings missed) mostly lands in bruised.
  tiers: { cleanMaxDamage: 24, batteredMinDamage: 150, batteredScuffles: 2 },
};

export const RAID_FRONTS = {
  gallery: { who: 'mara', name: 'Gallery', meter: 'lamp', meterLabel: 'Lamp' },
  cellar: { who: 'tobin', name: 'Cellar', meter: 'cellar', meterLabel: 'Cellar hold' },
};

export const RAID_TEXT = {
  intro: ['The cutter flashes back. Then, under the beam, oars.', 'They saw the signal. Crane\'s boats are coming to put the light out.'],
  howTo: {
    title: 'Hold the light until the cutter comes',
    rows: [
      { icon: 'beam', text: 'Mara, on the gallery: sweep the lamp beam with the mouse. Hold it on a climber until he shields his eyes, then click to flash him off the rail.' },
      { icon: 'shove', text: 'If one gets over the rail, click him three times fast to shove him back.' },
      { icon: 'ring', text: 'Tobin, in the cellar: click a wader when his shrinking ring is in the green, and he goes back in the sea.' },
      { icon: 'swap', text: 'Tab switches between them. The other front keeps going: watch its warning on the swap button.' },
    ],
    begin: 'Click or press Enter to begin',
  },
  shouts: ['Douse the light!', 'Get the lamp!', 'Over here, lads!', 'Crane pays double!', 'Find the keeper\'s boy!', 'Smash the glass!', 'Up, up!'],
  scuffle: {
    gallery: 'One gets over the rail. A boathook, the lamp glass, then Mara\'s fists. He goes over. The glass is cracked.',
    cellar: 'Two of them at once. Tobin goes down, gets up, and puts a spanner where it counts. The hatch holds.',
  },
  cutter: 'The Vigilant\'s searchlight sweeps the rock. The wreckers scatter for their boats.',
  tierLabel: { clean: 'Not a scratch on the light', bruised: 'Bruised, but the light held', battered: 'Battered, but the light held' },
  // One line in the ending card, by how the raid went.
  ending: {
    clean: 'Not one of Crane\'s wreckers laid a hand on the lamp. The cutter\'s crew fished four of them out of the surf, very wet and very quiet.',
    bruised: 'Crane\'s wreckers got close enough to leave marks. The lamp kept burning, and so did the bruises.',
    battered: 'When the cutter came alongside the lamp glass was cracked and Tobin was bleeding from the scalp. The light stayed lit. Just.',
  },
  skip: 'Skip the fight',
  skipped: 'You let the night take its course. The light held until the cutter came.',
};
