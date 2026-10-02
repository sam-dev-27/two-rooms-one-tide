export const TITLE = 'Two Rooms, One Tide';
export const TAGLINE = 'Two people. Two rooms. One rising tide.';

export const INTRO = {
  title: 'Gull Rock Light',
  text:
    'Three nights ago, keeper Elias Venn vanished and the light went dark. ' +
    'The harbourmaster called it an accident.\n\n' +
    'Tonight Mara climbed the tower to relight the lamp. Tobin, a harbour clerk with questions, came with her. ' +
    'Then someone barred the doors. Mara is in the lamp room. Tobin is in the cellar. ' +
    'Between them is only an old dumbwaiter, and the tide is rising.',
  button: 'Begin',
};

export const TUTORIAL = {
  look: 'Click anything in the room to look at it.',
  swap: 'Press TAB, or the button at the top right, to switch to Tobin.',
  send: 'Pick up something useful for the other room? Select it in the bag, then click the dumbwaiter hatch.',
  sent: 'Sent. Switch characters to collect it at the other end.',
};

export const WRONG_ITEM = [
  'That does nothing here.',
  'No. That isn\'t going to help.',
  'Not with that.',
];

// The hint button shows the first step that isn't done yet.
export const HINTS = [
  { done: (s) => s.has('read_logbook'), text: 'Mara: the logbook on the desk might explain what happened here.' },
  { done: (s) => s.has('knows_code'), text: 'The logbook says the drawer code is chalked downstairs. Switch to Tobin (TAB) and look at the cellar walls.' },
  { done: (s) => s.has('drawer_open'), text: 'The chalk said LIT 1874. Mara can try 1874 on the desk drawer.' },
  { done: (s) => s.has('key_sent') || s.has('locker_open'), text: 'Select the brass key in Mara\'s bag, then click the dumbwaiter hatch to send it down.' },
  { done: (s) => s.has('locker_open'), text: 'Tobin: the brass key fits the steel locker.' },
  { done: (s) => s.has('crate_open'), text: 'Tobin: nobody has searched the supply crate yet.' },
  { done: (s) => s.has('pages_joined'), text: 'The two page halves need to be in the same hands. Send one through the hatch.' },
  { done: (s) => s.has('valves_set'), text: 'Tobin: with the full valve order, the valve wheels are safe to turn.' },
  { done: (s) => s.has('fuse_fitted'), text: 'The great lamp upstairs needs a fuse. Send the one from the locker up the hatch, then fit it.' },
  { done: (s) => s.has('lamp_lit'), text: 'Mara: the lamp has a fuse and the generator is turning. Try the lamp again.' },
  { done: (s) => s.has('evidence_found'), text: 'When the cellar flooded, a plank floated loose. Tobin should look under it before you signal.' },
  { done: () => false, text: 'Mara: the balcony door is unlocked. Go out and signal the ship.' },
];

export const ENDINGS = {
  truth: {
    title: 'The Truth Comes In With the Tide',
    image: 'ending_truth',
    text:
      'Mara works the lamp shutter in long and short flashes: ELIAS MURDERED. PROOF ABOARD. ' +
      'The coastguard cutter answers.\n\n' +
      'At dawn they find Elias\'s photograph and ledger in Tobin\'s coat. By noon, Harbourmaster Crane is in irons, ' +
      'and the Marigold is no longer just another ship lost to the storm.',
  },
  cover: {
    title: 'Rescued',
    image: 'ending_cover',
    text:
      'The beam sweeps the water and a coastguard cutter turns toward the rock. Mara and Tobin are pulled out, cold and alive.\n\n' +
      'The report says the lamp failed and the keeper drowned. On the dock, Harbourmaster Crane shakes their hands and thanks them for their courage.',
    footer: 'There is another ending. Something in the lighthouse was waiting to be found.',
  },
};
