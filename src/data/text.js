export const TITLE = 'Two Rooms, One Tide';
export const TAGLINE = 'Two people. Two rooms. One rising tide.';

export const INTRO = {
  title: 'Gull Rock Light',
  text:
    'Atlantic, 1928. Sailors call this stretch of sea the Triangle: compasses wander, ships vanish, and nobody is ever to blame. ' +
    'Gull Rock Light stands on its western edge. Nine ships have been lost on the reef below it in three years.\n\n' +
    'Three nights ago the keeper, Elias Venn, was found on the rocks at the foot of the tower. Harbourmaster Crane called it a fall.\n\n' +
    'Tonight two people rowed out to find out why the light keeps going dark: Mara Quell, a coastguard signaller dismissed after the Marigold went down, ' +
    'and Tobin Ashby, Elias\'s apprentice. Someone barred the doors behind them. Mara is in the lamp room. Tobin is in the cellar. ' +
    'A ship is due on the evening tide.',
  button: 'Begin',
};

export const TUTORIAL = {
  look: 'Click anything in the room to look at it.',
  swap: 'Press TAB, or the button at the top right, to switch to Tobin.',
  send: 'Pick up something useful for the other room? Select it in the bag, then click the hatch.',
  sent: 'Sent. Switch characters to collect it at the other end.',
  tube: 'The hatch is glowing: someone is calling down the speaking tube. Click it with empty hands to talk.',
  tide: 'The tide gauge at the top creeps up as time passes. It can\'t sink you, but the ship due tonight is out there.',
};

export const WRONG_ITEM = [
  'That does nothing here.',
  'No. That isn\'t going to help.',
  'Not with that.',
];

// Hints: the first entry not yet done is shown. An array escalates on repeated presses.
export const HINTS = [
  { done: (s) => s.has('read_logbook'), text: 'Mara: Elias\'s logbook on the desk.' },
  { done: (s) => s.has('knows_code'), text: 'Switch to Tobin (Tab) and look at the chalk on the cellar wall.' },
  { done: (s) => s.has('talk_1'), text: 'Someone is calling through the dumbwaiter hatch. Click it with empty hands.' },
  { done: (s) => s.has('drawer_open'), text: ['The chalk said LIT 1874.', 'Mara: enter 1874 on the desk drawer.'] },
  { done: (s) => s.has('key_sent') || s.has('locker_open'), text: 'Select the brass key in Mara\'s bag, then click the hatch.' },
  { done: (s) => s.has('locker_open'), text: 'Tobin: the key fits the steel locker.' },
  { done: (s) => s.has('fuse_fitted'), text: 'Send the fuse up the hatch and fit it in the great lamp.' },
  { done: (s) => s.has('lantern_set'), text: 'Mara: take a closer look at the great lamp.' },
  { done: (s) => s.has('lens_wiped'), text: ['Tobin says the light on his wall is a smear.', 'Mara: wipe the lens in the lamp dial.'] },
  { done: (s) => s.has('lens_set'), text: ['Tobin\'s chalk shows an anchor "to the well".', 'Turn the lens until the anchor sits over the WELL pointer.'] },
  { done: (s) => s.has('knows_order'), text: 'Tobin: look at the glass plate by the chalk.' },
  {
    done: (s) => s.has('gasket'),
    text: ['Wheel three leaks. Elias taught Tobin to make gaskets from paper and grease.', 'Use Tobin\'s diary on the valves.'],
  },
  {
    done: (s) => s.has('valves_set'),
    text: [
      'The plate shows the colours, but the logbook said the well flips everything.',
      'Look at the backwards 1.',
      'Left to right: blue, yellow, red, green, white.',
    ],
  },
  { done: (s) => s.has('evidence_found'), text: 'Something floated up when the cellar flooded.' },
  { done: (s) => s.has('lamp_lit'), text: 'Mara: the lamp has power now.' },
  { done: (s) => s.has('lamp_full'), text: ['The beam is dim. Ask Tobin (hatch).', 'Tobin: the rheostat on the pipe by the wheels.'] },
  {
    done: (s) => s.has('ledger_sent') || s.has('signalled_truth') || s.has('signalled_sos'),
    text: 'To accuse Crane, Mara needs the ledger. Tobin can send it up. Or signal for rescue without it.',
  },
  { done: (s) => s.has('signalled_truth') || s.has('signalled_sos'), text: 'Mara: signal the cutter with the great lamp. The card shows every letter.' },
  { done: (s) => s.has('final_seen'), text: 'Tobin: the glass plate. Then the hatch.' },
];

// Speaking-tube conversations, played at either hatch in order once `when` holds.
// `when` and `lines` receive the puzzle api (has, holds, tideLevel).
const urgent = (s) => (s.tideLevel >= 4 ? [['tobin', s.has('valves_set') ? 'It\'s still coming in out there, Mara.' : 'It\'s over my boots, Mara.']] : []);

export const TALKS = [
  {
    id: 'talk_1',
    when: (s) => s.has('read_logbook') && s.has('knows_code'),
    lines: (s) => [
      ['tobin', 'Mara? The tube still works. Elias used to shout the tea order down it.'],
      ['mara', 'I hear you. Barred up here too.'],
      ['tobin', 'Crane\'s men. They must have watched us row out.'],
      ...urgent(s),
      ['mara', 'You said you were in town Thursday. The night he died.'],
      ['tobin', 'At my aunt\'s. ...Why?'],
      ['mara', 'Getting the times straight. I\'d never been out here before tonight.'],
    ],
  },
  {
    id: 'talk_2',
    when: (s) => s.has('fuse_fitted'),
    lines: (s) => [
      ['mara', 'Fuse is in. Nothing.'],
      ['tobin', 'There wouldn\'t be. The lamp runs off the tide wheel, and the valves down here feed it. The paint\'s gone off the tags. Elias said he "set them by the light". I never knew what he meant.'],
      ...urgent(s),
      ['mara', 'Did he trust you with anything?'],
      ['tobin', 'Everything. He called me T in his diary. One dash. Shortest letter for the shortest lad on the rock.'],
    ],
  },
  {
    id: 'talk_3',
    when: (s) => s.has('saw_smear'),
    lines: (s) => [
      ['tobin', 'There\'s light on the wall down here! A glass plate by the chalk. It\'s just a smudge, like looking through a thumbprint.'],
      ...urgent(s),
      ['mara', 'The lens is black with soot. I\'ll clean it.'],
      ['tobin', 'Careful. He never let me touch that glass.'],
      ['mara', 'Then it\'s lucky it\'s me touching it.'],
    ],
  },
  {
    id: 'talk_4',
    when: (s) => (s.has('letter_hidden') || s.has('letter_told')) && (s.has('envelope_hidden') || s.has('envelope_told')),
    lines: (s) => [
      ...(s.has('letter_told')
        ? [
            ['mara', 'There was a letter in his drawer. Mine. I was meant to come out Thursday.'],
            ['tobin', '...Did you?'],
            ['mara', 'He was alive when I left.'],
          ]
        : [
            ['tobin', 'Anything in the drawer besides the key?'],
            ['mara', 'A pencil stub.'],
          ]),
      ...(s.has('envelope_told')
        ? [
            ['tobin', 'There\'s money in the locker. An envelope with a T on it. I don\'t know why.'],
            ['mara', 'Crane pays people, Tobin. It\'s what he does.'],
          ]
        : [
            ['mara', 'Anything in the locker besides the fuse?'],
            ['tobin', 'Rags. Just rags.'],
          ]),
    ],
  },
  {
    id: 'talk_5',
    when: (s) => s.has('evidence_found'),
    lines: () => [
      ['tobin', 'Under the floor. A photograph of Crane on the dock, watching a ship go down. The stern says Marigold.'],
      ['mara', '...My brother was on the Marigold.'],
      ['tobin', 'I\'m sorry. There\'s a ledger too. Payouts for every ship the papers blamed on the Triangle.'],
      ['mara', 'There\'s no Triangle. There\'s a man with a pen.'],
    ],
  },
  {
    id: 'talk_6',
    when: (s) => s.has('lamp_lit'),
    lines: (s) => [
      ['mara', 'It\'s lit, but weak. Orange, like a candle in a jar.'],
      ['tobin', 'The rheostat\'ll be on low. It\'s on the pipe by the wheels. Hang on.'],
      ...urgent(s),
      ['mara', 'You knew exactly where that was.'],
      ['tobin', 'I serviced every bolt in this tower, Mara.'],
    ],
  },
  {
    id: 'talk_7',
    when: (s) => s.has('ledger_sent'),
    lines: () => [
      ['mara', 'There\'s a T in this ledger. Forty pounds. "Low nights."'],
      ['tobin', 'And an M. "No signal logged, Marigold." What\'s that?'],
      ['mara', 'Crane offered. I said no. The light was dark; there was nothing to see.'],
      ['tobin', 'Elias told me to turn it low on rough nights. I thought it was wages.'],
      ['mara', 'Then we believe each other.'],
      ['tobin', '...Yes.'],
    ],
  },
];

// Last line of the game, spoken by whoever the player is NOT controlling at the hatch.
export const FINAL_LINES = {
  tobin: [['mara', 'Tobin? The boat\'s here. ...Leave the wall. It\'s only soot.']],
  mara: [['tobin', 'Mara? The boat\'s here. ...You\'ll want to wash that scarf.']],
};

export const FINAL_CARD = 'The tide went out at six.';
export const TWIST_CARD = 'But that was later.';

const TIDE_LINES = [
  { max: 2, text: () => 'The Halcyon turned away with a mile of clear water to spare.' },
  { max: 4, text: () => 'The Halcyon scraped the outer rocks and limped home. Every hand was saved.' },
  {
    max: 6,
    text: (truth) =>
      'The Halcyon broke on the reef. The cutter took off her crew; the sea took her cargo. ' +
      (truth ? 'The one payout Crane never collected.' : 'Crane\'s last payout.'),
  },
];

/** Builds the layered ending card: signal sent, tide band, then concealment lines. */
export function endingCard(s, id) {
  const truth = id === 'truth';
  const band = s.tideBand ?? s.tide ?? 0;
  const tideLine = TIDE_LINES.find((t) => band <= t.max).text(truth);
  const concealed = [];
  if (s.has('letter_hidden')) concealed.push('Mara\'s letter stays in her coat. Nobody asks for it.');
  if (s.has('envelope_hidden')) concealed.push('Tobin\'s envelope stays in his pocket. Nobody asks for it.');
  const base = ENDINGS[truth ? 'truth' : 'cover'];
  return {
    ...base,
    text: [base.text, tideLine, ...concealed].join('\n\n'),
  };
}

export const ENDINGS = {
  truth: {
    title: 'CRANE. UNDERSTOOD.',
    image: 'ending_truth',
    text:
      'The cutter answers: CRANE. UNDERSTOOD. By noon the harbourmaster is in irons and the Marigold is no longer a mystery of the Triangle. ' +
      'At the inquest Crane says only one thing: "I never set foot on that rock. Ask the two who did."',
  },
  cover: {
    title: 'Rescued',
    image: 'ending_cover',
    text:
      'The cutter answers and lowers a boat. The report says the lamp failed and the keeper fell. ' +
      'On the dock Harbourmaster Crane shakes their hands and thanks them for their courage. He holds Mara\'s a moment too long.',
    footer: 'There is another ending. Proof was waiting to be sent up.',
  },
  final: {
    title: TITLE,
    image: 'ending_open',
  },
};
