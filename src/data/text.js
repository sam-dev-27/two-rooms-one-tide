export const TITLE = 'Two Rooms, One Tide';
export const TAGLINE = 'Two people. Two rooms. One rising tide.';

export const TUTORIAL = {
  look: 'Click anything in the room to look at it.',
  swap: 'Press TAB, or the button at the top right, to switch to Tobin.',
  send: 'Pick up something useful for the other room? Select it in the bag, then click the hatch.',
  sent: 'Sent. Switch characters to collect it at the other end.',
  tube: 'The hatch is glowing: someone is calling down the speaking tube. Click it with empty hands to talk.',
  tide: 'The tide gauge at the top creeps up as time passes. It can\'t sink you, but the ship due tonight is out there.',
  board: 'New clue on the case board. Press C to open it, then drag clues onto a suspect. Nothing you pin changes the facts.',
  choice: 'You speak for both of them. What they admit through the tube is remembered.',
  finalBoard: 'The case board is still open (C). Who do you blame?',
};

export const CARD_TOAST = 'Added to the case board';

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
  {
    done: (s) => s.has('lamp_full'),
    text: [
      'The beam is dim. Ask Tobin (hatch).',
      'Tobin: the rheostat on the pipe by the wheels.',
      'Tobin holds the rheostat at FULL. Then switch to Mara (Tab) and click the great lamp before it slips.',
    ],
  },
  {
    done: (s) => s.has('ledger_sent') || s.has('signalled_truth') || s.has('signalled_sos'),
    text: 'To accuse Crane, Mara needs the ledger. Tobin can send it up. Or signal for rescue without it.',
  },
  { done: (s) => s.has('signalled_truth') || s.has('signalled_sos'), text: 'Mara: signal the cutter with the great lamp. The card shows every letter.' },
  { done: (s) => s.has('final_seen'), text: 'Tobin: the glass plate. Then the hatch.' },
];

// Trust between the two leads: what the player has them admit (or hide) moves it.
export const TRUST_DELTA = { clean: 1, deflect: 0, lie: -1 };
export const TRUST_WARM = 2;
export const CHOICE_LABELS = { lie: 'Lie', deflect: 'Deflect', clean: 'Come clean' };
export const trusting = (s) => s.trust >= TRUST_WARM;
export const trustLabel = (s) => (s.trust >= TRUST_WARM ? 'trusting' : s.trust <= -TRUST_WARM ? 'wary' : 'guarded');

/**
 * A pick-a-line moment inside a talk. `who` is the character whose line the player chooses.
 * Each option: { kind: lie | deflect | clean, label, lines, card? }. Picking sets the flag `${id}_${kind}`.
 */
const choose = (id, who, options) => ({ choice: id, who, options });

// Speaking-tube conversations, played at either hatch in order once `when` holds.
// `when`, `play` and `lines` receive the puzzle api (has, holds, tideLevel, trust).
const urgent = (s) => (s.tideLevel >= 4 ? [['tobin', s.has('valves_set') ? 'It\'s still coming in out there, Mara.' : 'It\'s over my boots, Mara.']] : []);
const believe = (s, kind, warm, cold) => [
  ['mara', 'Then we believe each other.'],
  ['tobin', s.trust + TRUST_DELTA[kind] >= TRUST_WARM ? warm : cold],
];

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
      choose('tube_alibi_tobin', 'tobin', [
        { kind: 'lie', label: '"At my aunt\'s."', card: 'alibi_tobin_aunt', lines: [['tobin', 'At my aunt\'s. ...Why?']] },
        { kind: 'deflect', label: '"Does it matter?"', lines: [['tobin', 'Does it matter where I was? He\'s gone either way. ...Why?']] },
        {
          kind: 'clean',
          label: '"I came back late."',
          card: 'alibi_tobin_back',
          lines: [['tobin', 'In town, mostly. I came back on the late boat to check the generator. Eleven-forty. I never went up. ...Why?']],
        },
      ]),
      choose('tube_alibi_mara', 'mara', [
        { kind: 'lie', label: '"I\'d never been out here."', card: 'alibi_mara_never', lines: [['mara', 'Getting the times straight. I\'d never been out here before tonight.']] },
        { kind: 'deflect', label: '"Getting the times straight."', lines: [['mara', 'Getting the times straight. Old habit.']] },
        {
          kind: 'clean',
          label: '"I was here Thursday too."',
          card: 'alibi_mara_here',
          lines: [
            ['mara', 'Because I was out here Thursday too. He wrote to me. We argued on the balcony.'],
            ['mara', 'He was alive when I left.'],
            ['tobin', '...You might have led with that.'],
          ],
        },
      ]),
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
        ? s.has('tube_alibi_mara_clean')
          ? [
              ['mara', 'The letter in his drawer is mine. It\'s why I came out Thursday.'],
              ['tobin', 'And you came anyway.'],
              ['mara', 'I came because of it.'],
            ]
          : [
              ['mara', 'There was a letter in his drawer. Mine. I was meant to come out Thursday.'],
              ['tobin', '...Did you?'],
              ['mara', 'He was alive when I left.'],
              ...(s.has('tube_alibi_mara_lie') ? [['tobin', 'You said you\'d never been out here.'], ['mara', 'I said a lot of things.']] : []),
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
    // A Tobin who trusts Mara volunteers his own initial before she can find it.
    play: (s) => trusting(s) && s.set('ledger_volunteered'),
    lines: (s) => [
      ['tobin', 'Under the floor. A photograph of Crane on the dock, watching a ship go down. The stern says Marigold.'],
      ['mara', '...My brother was on the Marigold.'],
      ['tobin', 'I\'m sorry. There\'s a ledger too. Payouts for every ship the papers blamed on the Triangle.'],
      ...(s.has('ledger_volunteered')
        ? [
            ['tobin', 'And Mara... there\'s a T in it. "Low nights." I wanted you to hear that from me.'],
            ['mara', 'Copy. ...Thank you.'],
          ]
        : []),
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
      choose('tube_rheostat', 'tobin', [
        { kind: 'lie', label: '"Lucky guess."', lines: [['tobin', 'Lucky guess. The pipes all look the same down here.'], ['mara', 'Copy.']] },
        { kind: 'deflect', label: '"I serviced every bolt."', lines: [['tobin', 'I serviced every bolt in this tower, Mara.']] },
        {
          kind: 'clean',
          label: '"I turned it low myself."',
          card: 'low_orders',
          lines: [
            ['tobin', 'Because I turned it low myself. Rough nights. Elias\'s orders. He said it rested the generator.'],
            ['mara', '...Thank you for telling me.'],
          ],
        },
      ]),
      ['tobin', 'The catch is worn, mind. I\'ll have to hold it at FULL while you latch the lamp up there. Be quick.'],
    ],
  },
  {
    id: 'talk_7',
    when: (s) => s.has('ledger_sent'),
    lines: (s) => {
      const wages = s.has('tube_rheostat_clean')
        ? ['tobin', 'You know about my low nights already. I thought the envelopes were wages.']
        : ['tobin', 'Elias told me to turn it low on rough nights. I thought it was wages.'];
      return [
        s.has('ledger_volunteered')
          ? ['mara', 'I have the ledger. Your T is here, like you said. Forty pounds. "Low nights."']
          : ['mara', 'There\'s a T in this ledger. Forty pounds. "Low nights."'],
        ['tobin', 'And an M. "No signal logged, Marigold." What\'s that?'],
        choose('tube_ledger', 'mara', [
          {
            kind: 'clean',
            label: '"Crane offered. I said no."',
            card: 'crane_offer',
            lines: [['mara', 'Crane offered. I said no. The light was dark; there was nothing to see.'], wages, ...believe(s, 'clean', '...Yes.', '...Yes. I suppose.')],
          },
          {
            kind: 'deflect',
            label: '"Ask Crane."',
            lines: [['mara', 'Ask Crane what he wrote. I only signed my report.'], wages, ...believe(s, 'deflect', '...Yes.', '...If you say so.')],
          },
          {
            kind: 'lie',
            label: '"Some other M."',
            lines: [['mara', 'Some other M. Half this coast starts with one.'], wages, ...believe(s, 'lie', '...Yes.', '...If you like.')],
          },
        ]),
      ];
    },
  },
];

// Last line of the game, spoken by whoever the player is NOT controlling at the hatch.
// Trust only changes the delivery; the words that matter stay the same.
export const FINAL_LINES = {
  tobin: {
    warm: [['mara', 'Tobin? The boat\'s here. ...Come away from the wall. It\'s only soot.']],
    cold: [['mara', 'Tobin. The boat\'s here. ...Leave the wall. It\'s only soot.']],
  },
  mara: {
    warm: [['tobin', 'Mara? The boat\'s here. ...You\'ll want to wash that scarf. I\'ll find you some soap.']],
    cold: [['tobin', 'Mara. The boat\'s here. ...You\'ll want to wash that scarf.']],
  },
};

export const finalLine = (s, actor) => FINAL_LINES[actor][trusting(s) ? 'warm' : 'cold'];

// Said by the character you swap to after something happened in the other room.
// `muffled` is heard in the room where it happened.
export const CROSS_ROOM = {
  fuse_fitted: { to: 'tobin', line: 'Something clicked up there. Fuse in, then. ...Still no hum down here.' },
  lens_set: { to: 'tobin', line: 'The plate just lit up properly. She did it.' },
  valve_wrong: { to: 'mara', line: 'The pipes rang like a struck bell a minute ago. Tobin? ...Copy. Nobody\'s dead.', muffled: 'Up the tube, faintly: "Tobin? What was that?"' },
  valves_set: { to: 'mara', line: 'The whole tower shook. Then a hum, under the floor. The tide wheel.', muffled: 'Up the tube, faintly: "Was that the sea?"' },
  evidence_found: { to: 'mara', line: 'Tobin\'s gone very quiet down there.' },
  lamp_lit: { to: 'tobin', line: 'The wheel\'s pulling hard now. She\'s got it lit.', muffled: 'Down the tube, faintly: a whoop. Or a cough.' },
  signalled_truth: { to: 'tobin', line: 'I counted the flashes on the plate. C. R. A... She sent his name.' },
  signalled_sos: { to: 'tobin', line: 'Three short, three long, three short. Someone\'s coming.' },
};

// Alternate lines for a hotspot once it has nothing new to say. The handler's own line comes
// back every few clicks so nothing important is lost.
export const BARKS = {
  logbook: {
    when: (s) => s.has('read_logbook'),
    lines: [
      '"The well flips everything." He underlined it twice.',
      'His handwriting gets smaller near the end. As if he was running out of room. Or time.',
      'Fifty-four years of weather. And one name in code.',
    ],
  },
  drawer: {
    when: (s) => s.has('drawer_open'),
    lines: ['Still a pencil stub. Still a compass that won\'t settle.', 'You check under the drawer. Dust. Copy.'],
  },
  balcony: {
    when: (s) => s.has('saw_wool'),
    lines: ['The rail is wet and cold. You don\'t look down.', 'Your hand goes to your scarf again. It\'s still there.'],
  },
  chalk: {
    when: (s) => s.has('knows_code'),
    lines: [
      'LIT 1874. He was proud of that year.',
      'The chalk anchor has a tiny face drawn on it. Elias did that. ...Or you did, years ago.',
      'Still says "drawer". It isn\'t going to say anything new.',
    ],
  },
  crate: {
    when: (s) => s.has('crate_open'),
    lines: ['You try the glove on. Your whole forearm fits inside.', 'Still biscuits. You\'re not that hungry. Yet.', 'Rope. Elias said a lighthouse runs on rope and tea.'],
  },
  locker: {
    when: (s) => s.has('locker_open'),
    lines: ['Rags. Honestly, just rags this time.', 'Your initials are scratched inside the door. Elias let you, your first winter.'],
  },
  stairs: {
    when: (s) => s.has('prints_gone'),
    lines: ['The water laps the third step. It was the fourth a minute ago.', 'You bang on the door. Nobody bangs back.', 'Barred from outside. Proper job, too. Crane\'s men never did anything by halves.'],
  },
  valves: {
    when: (s) => s.has('valves_set'),
    lines: ['They\'re humming. Elias said valves hum when they\'re happy.', 'You pat wheel three. Good wheel.'],
  },
  rheostat: {
    when: (s) => s.has('lamp_full'),
    lines: ['Still at FULL. You resist checking it again. You check it again.', 'That LOW mark. You know exactly how it got so bright.'],
  },
};

// Muttered after a while without input. Bands follow the tide: 0-2, 3-4, 5-6.
export const IDLE_MUTTERS = {
  mara: [
    ['Copy. Nobody\'s coming. Fine.', 'The compass still won\'t settle.', 'Wind\'s backing west. Weather coming.'],
    ['Come on, Tobin.', 'That ship won\'t wait for us.', 'Rain\'s getting in under the balcony door.'],
    ['I can\'t see the reef any more.', 'Think, Quell. Think.', 'The Halcyon\'s out there in this.'],
  ],
  tobin: [
    ['Elias would have had the kettle on by now.', 'Right. Right. What would he do?', 'Sorry. Talking to myself again. He hated that.'],
    ['It\'s at my ankles. That\'s fine. That\'s fine.', 'The pipes are groaning. They never groan.', 'Come on, come on.'],
    ['It\'s past my knees, Mara.', 'He always said the sea gets in everywhere eventually.', 'Don\'t panic. He hated it when I panicked.'],
  ],
};

export const tideBandIndex = (tide) => (tide <= 2 ? 0 : tide <= 4 ? 1 : 2);

// Two-hands moment at the rheostat, and the lightning reveal on Mara's window.
export const HOLD_TEXT = {
  start: ['The catch is worn smooth. Let go and it springs straight back to LOW.', 'Mara has to latch the lamp up there. Switch, quick!'],
  retry: 'You crank it back to FULL and hang on with both hands.',
  busy: 'Both hands on the rheostat. Switch to Mara (Tab) and latch the lamp!',
  slipTobin: ['Your grip goes. The handle snaps back to LOW with a bang.', 'Again. Hold it, and get Mara to the lamp faster.'],
  slipMara: ['Below, a clunk. The beam sags back to orange before you reach the latch.', 'Tobin lost his grip. He\'ll have to crank it up again.'],
  slipReaction: 'Sorry! It jumped right out of my hands. Once more?',
  latch: ['You throw the brass latch on the lamp housing. It bites.', 'The beam holds at full: white, hard, reaching all the way to the reef.'],
  label: 'Tobin is holding the rheostat',
};

export const LIGHTNING_TEXT = {
  reveal: 'TWO BOATS\nTHURS',
  seen: ['Lightning. For a heartbeat, letters stand out in the salt on the glass, traced by a finger: TWO BOATS THURS.', 'Then dark again. Elias wrote that. It has to be Elias.'],
  missedCellar: 'Lightning. Light flares through the gap under the stair door. Up top, Mara\'s window must be lit like day.',
  hintWindow: 'Salt streaks on the glass. Something is traced in them, too faint to read in this light. The next flash of lightning might show it.',
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
