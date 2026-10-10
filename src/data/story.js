// Story framing: the opening hook, chapter cards and the drowned captain's appearances.
// Everything here is optional to the puzzle chain: nothing waits on a ghost, a vision or a card.

export const CAPTAIN = { name: 'Captain Hale', css: '#bfe3f2' };

// Played through the speaking tube straight after the opening, before the first objective.
export const HOOK = [
  ['tobin', 'Mara? Mara, can you hear me? The door\'s barred down here, and the sea\'s coming in under it.'],
  ['mara', 'Barred up here too. Somebody wanted us shut in with a dead man\'s lamp.'],
  ['tobin', 'The Halcyon\'s due on the evening tide. If the light\'s dark when she comes round the reef...'],
  ['mara', '...she goes the way of the Marigold. Not tonight. Elias kept a log. I\'ll start there.'],
  ['tobin', 'They\'ll say I did it, you know. Him falling. I\'m the only one who lived out here.'],
  ['mara', 'Then let\'s give them something better to say. Look around down there. Copy?'],
  ['tobin', 'Copy. ...That\'s what you say, isn\'t it? Copy.'],
];

// Full-screen title cards at the big turns of the story. `line` is written in the handwriting font.
export const CHAPTERS = {
  log: { numeral: 'I', title: 'The Keeper\'s Log', line: 'Two rooms, one speaking tube, and a dead man\'s handwriting.' },
  water: { numeral: 'II', title: 'Water and Light', line: 'The lamp needs the sea, and the sea needs a careful hand.' },
  tide: { numeral: 'III', title: 'What the Tide Brought', line: 'Some things only float when the cellar floods.' },
  signal: { numeral: 'IV', title: 'The Signal', line: 'Whatever you send now, the reef will read it.' },
  low: { numeral: 'V', title: 'Low Water', line: 'The full beam reaches the rim of the lens at last.' },
};
export const CHAPTER_ORDER = ['log', 'water', 'tide', 'signal', 'low'];

/**
 * The drowned master of the Marigold. Each appearance plays once, for `who` in `area` (it waits
 * until the player is there). `point` turns him toward a hotspot; `vision` plays a flashback
 * (VISIONS in cutscenes.js) afterwards and `cards` go on the board. `react` is what the witness
 * says once he has gone, warm or cold by trust. He never names a killer.
 */
export const GHOSTS = {
  logbook: {
    who: 'mara',
    area: 'lamp',
    point: 'logbook',
    lines: ['He kept a good log, your keeper. Every ship. Every name.', 'Mine is in there too. Hale. Marigold.'],
    cards: ['captain'],
    react: {
      warm: 'Copy. ...Nobody there. I\'ll tell Tobin. He won\'t laugh, and that\'s the worst of it.',
      cold: 'Nobody there. Nobody. And Tobin doesn\'t need to hear about it.',
    },
  },
  flood: {
    who: 'tobin',
    area: 'cellar',
    point: 'plank',
    lines: ['The sea gives back what is hidden in it, lad.', 'The light was dimmed by a hand that loved this tower.'],
    vision: 'flood',
    cards: ['captain', 'vision_dim', 'vision_marigold'],
    react: {
      warm: 'Elias always said the rock had company. ...I\'ll tell Mara. Later. When I\'ve stopped shaking.',
      cold: 'I\'m not telling Mara about that. She already thinks I\'m soft.',
    },
  },
  gallery: {
    who: 'mara',
    area: 'gallery',
    lines: ['He stood where you stand, the night he fell.', 'Two came up to him. I could not see their faces. Only the light.'],
    vision: 'stairs',
    cards: ['captain', 'vision_stairs'],
    react: {
      warm: 'Two. One of them was me. ...Tobin, tell me the other wasn\'t you.',
      cold: 'Two. I was one, and I left him alive. So who was the other?',
    },
  },
  wheelroom: {
    who: 'tobin',
    area: 'wheelroom',
    point: 'slate',
    lines: ['The wheel turns for whoever pays, lad.', 'Ask who held the pen. Then ask who held the light.'],
    vision: 'crane',
    cards: ['captain', 'vision_crane'],
    react: {
      warm: 'Who held the light. ...Elias did. And me, on rough nights. Mara should hear that from me.',
      cold: 'Who held the light. Well, it wasn\'t only me. It wasn\'t.',
    },
  },
  lightning: {
    who: 'mara',
    area: 'lamp',
    point: 'window',
    lines: ['Light, then dark, then light. That is how she went down.', 'Count the boats, signaller.'],
    react: {
      warm: 'Two boats on Thursday. Mine was one. ...So whose was the other?',
      cold: 'Two boats, Thursday. I rowed one of them. I know how that looks.',
    },
  },
  // At full power: the beam finds the Marigold's hull, and he shows how he died.
  signal: {
    who: 'mara',
    area: 'lamp',
    lines: ['Now the reef can see you.', 'Say a name plainly, signaller. I never had the chance to.'],
    vision: 'hale',
    cards: ['marigold_last'],
    react: {
      warm: 'The light came back up when it was too late. ...Tobin, whatever I send, I\'m sending it for both of us.',
      cold: 'Turned down, then turned back up. Plainly, then. The dead can be as plain as they like.',
    },
  },
};
