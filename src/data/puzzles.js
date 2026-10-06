// Puzzle logic. One handler per hotspot: (api, item) where item is the selected inventory item or null.
// Handlers only talk to `api`, never to Phaser, so tools/test-chain.mjs can play the game headlessly.
//
// Chain: logbook + chalk -> talk 1 -> drawer (key, letter) -> locker (fuse, envelope) -> fuse in lamp ->
//        lantern + lens dial (wipe, anchor to WELL) -> plate shows mirrored valve colours -> diary gasket ->
//        valve wheels (flood, power, evidence) -> lamp lit dim -> Tobin holds the rheostat at FULL while
//        Mara latches the lamp (two hands, 8 s) -> ledger up ->
//        Morse shutter (CRANE or SOS) -> ending card -> final scene at the plate and the hatch.
import { ITEMS } from './items.js';
import { TALKS, finalLine, HOLD_TEXT, LIGHTNING_TEXT } from './text.js';

const DRAWER_CODE = '1874';
export const HOLD_MS = 8000;

export const LENS_PANELS = ['anchor', 'gull', 'star', 'bell', 'ship', 'fish', 'key', 'crown'];
export const LENS_TARGET = 'anchor';
const LENS_START = 3;

export const VALVE_COLORS = ['red', 'blue', 'green', 'yellow', 'white'];
// The plate shows WHITE GREEN RED YELLOW BLUE; the well mirrors it.
export const VALVE_ORDER = ['blue', 'yellow', 'red', 'green', 'white'];

export const MORSE = { C: '-.-.', R: '.-.', A: '.-', N: '-.', E: '.', S: '...', O: '---' };

/**
 * Advances Morse entry by one symbol ('.' or '-'). A wrong symbol resets only the current letter.
 * Returns { letter, buffer, result } where result is 'ok' | 'letter' | 'wrong' | 'done'.
 */
export function morseStep(word, { letter, buffer }, symbol) {
  const target = MORSE[word[letter]];
  const next = buffer + symbol;
  if (!target.startsWith(next)) return { letter, buffer: '', result: 'wrong' };
  if (next !== target) return { letter, buffer: next, result: 'ok' };
  if (letter + 1 === word.length) return { letter: letter + 1, buffer: '', result: 'done' };
  return { letter: letter + 1, buffer: '', result: 'letter' };
}

/** The next speaking-tube conversation that is ready and not yet played, or null. */
export function pendingTalk(api) {
  return TALKS.find((t) => !api.has(t.id) && t.when(api)) ?? null;
}

function openLens(api) {
  api.lens({
    panels: LENS_PANELS,
    rotation: api.memo('lens_rot', LENS_START),
    wiped: api.has('lens_wiped'),
    rotate: (r) => api.remember('lens_rot', r),
    wipe() {
      if (api.has('lens_wiped')) return;
      api.set('lens_wiped');
      api.card('soot_wipe');
      api.note('wipe', 'You wiped the soot off the lens with your scarf. Something scratched in the soot on the rim came away with it.');
      return 'The soot comes away in long streaks. Something scratched comes away with it. Gull grit, probably.';
    },
    attempt(panel) {
      if (!api.has('lens_wiped') || panel !== LENS_TARGET) return false;
      api.set('lens_set');
      api.sfx('unlock');
      api.say('The lens settles. Far below, something brightens.');
      api.refresh();
      return true;
    },
  });
}

function openValves(api) {
  api.valves({
    colors: VALVE_COLORS,
    settings: api.memo('valves', [0, 0, 0, 0, 0]),
    wrongText: 'Not that. The pipes are complaining.',
    change: (settings) => api.remember('valves', [...settings]),
    attempt(settings) {
      const names = settings.map((i) => VALVE_COLORS[i]);
      if (names.some((c, i) => c !== VALVE_ORDER[i])) {
        api.sfx('error');
        api.raiseTide(1);
        api.set('valve_wrong');
        return false;
      }
      api.set('valves_set');
      api.set('prints_gone');
      api.sfx('flood');
      api.setRoomState('cellar', 'after');
      api.say('Blue, yellow, red, green, white. The pipes shudder and the sea pours in, knee-deep and freezing.');
      api.say('Behind the wall, the tide wheel starts to turn.');
      api.say('Something bobs to the surface: a loose floorboard.');
      return true;
    },
  });
}

function openMorse(api) {
  api.morse({
    words: [
      { word: 'CRANE', enabled: api.holds('ledger'), lockedLabel: 'needs the ledger' },
      { word: 'SOS', enabled: true },
    ],
    code: MORSE,
    step: morseStep,
    onDone(word) {
      const id = word === 'CRANE' ? 'truth' : 'cover';
      api.set(id === 'truth' ? 'signalled_truth' : 'signalled_sos');
      api.ending(id, () => beginFinal(api));
    },
  });
}

function beginFinal(api) {
  api.set('final_phase');
  api.swapTo('tobin');
  api.refresh();
  api.say('The lamp runs at full power for the first time. Light pours down the weight-well, brighter than you have ever seen it.');
}

function concealChoice(api, { item, title, text, keep, tell, hiddenFlag, toldFlag, hiddenText, toldText }) {
  api.choice({
    title,
    text,
    closable: false,
    options: [
      {
        label: keep,
        enabled: true,
        onSelect: () => {
          api.set(hiddenFlag);
          api.adjustTrust(-1);
          api.consume(item);
          api.say(hiddenText);
        },
      },
      {
        label: tell,
        enabled: true,
        onSelect: () => {
          api.set(toldFlag);
          api.adjustTrust(1);
          api.say(toldText);
        },
      },
    ],
  });
}

// Two-hands moments: `slip` runs when the hold's countdown ends. Never a fail state; the first
// slip costs one tide step, like a wrong valve setting.
export const HOLDS = {
  rheostat: {
    slip(api) {
      api.sfx('error');
      if (!api.has('hold_slipped')) {
        api.set('hold_slipped');
        api.raiseTide(1);
      }
      for (const line of api.actor === 'tobin' ? HOLD_TEXT.slipTobin : HOLD_TEXT.slipMara) api.say(line);
      if (api.actor !== 'tobin') api.queueReaction('tobin', HOLD_TEXT.slipReaction);
    },
  },
};

/** True while the lightning can still reveal the writing on Mara's window. */
export const lightningPending = (api) => api.has('valves_set') && !api.has('saw_boats') && !api.has('final_phase');

/** A lightning strike. Mara sees the salt writing if she is the one in front of the window. */
export function lightningStrike(api) {
  if (!lightningPending(api)) return null;
  if (api.actor !== 'mara') return 'missed';
  api.set('saw_boats');
  api.card('two_boats');
  api.note('boats', 'Lightning lit up writing traced in the salt on the lamp-room window: TWO BOATS THURS.');
  for (const line of LIGHTNING_TEXT.seen) api.say(line);
  return 'seen';
}

export const HANDLERS = {
  // ---- Mara, lamp room ----
  logbook(api, item) {
    if (item) return api.wrongItem();
    if (api.has('read_logbook')) {
      return api.say('"−·−·\'s men on the rocks again." "Tell −− everything Thursday." "The drawer code is chalked below." "The well flips everything."');
    }
    api.set('read_logbook');
    api.card('flash_names');
    api.card('thursday');
    api.note(
      'logbook',
      'Elias\'s log, names in flash-code: "−·−·\'s men on the rocks again" (C: Crane). "Tell −− everything Thursday." "The drawer code is chalked below." "The well flips everything."',
    );
    api.say('Elias\'s logbook. He wrote names in flash-code, like a signaller.');
    api.say('"−·−·\'s men on the rocks again." Dash-dot-dash-dot. C. Crane.');
    api.say('"Tell −− everything Thursday." "The drawer code is chalked below." And the last line: "The well flips everything."');
    api.toast('swap', 'swap');
  },

  drawer(api, item) {
    if (item) return api.wrongItem();
    if (api.has('drawer_open')) return api.say('Empty now, apart from a stub of pencil. On the desk, Elias\'s compass needle swings and never settles.');
    if (!api.has('knows_code')) api.say('A four-digit number lock. The log said the code is chalked somewhere below.');
    api.keypad({
      title: 'Desk drawer',
      code: DRAWER_CODE,
      onSuccess: () => {
        api.set('drawer_open');
        api.sfx('unlock');
        api.say('The lock clicks open. Inside: a heavy brass key stamped CELLAR LOCKER. Under it, a letter in your own handwriting.');
        api.give('key');
        api.give('letter');
        api.card('letter');
        concealChoice(api, {
          item: 'letter',
          title: 'Your letter',
          text: '"Thursday. If it\'s true, God help you. — M."\n\nYou wrote it a week ago. Tobin will ask what was in the drawer.',
          keep: 'Keep it to yourself',
          tell: 'Tell Tobin',
          hiddenFlag: 'letter_hidden',
          toldFlag: 'letter_told',
          hiddenText: 'You fold the letter into your coat.',
          toldText: 'You keep the letter out. Tobin should hear it from you.',
        });
      },
    });
  },

  lamp(api, item) {
    if (api.has('final_phase')) {
      if (item) return api.wrongItem();
      api.set('final_lens');
      api.say('A long clean streak across the rim, the width of a scarf.');
      api.say('Soot ground into the red wool.');
      return;
    }
    if (item && item !== 'fuse') return api.wrongItem();
    if (!api.has('fuse_fitted')) {
      if (!api.holds('fuse')) return api.say('The great lamp is dead. The fuse socket is empty and the brass is cold.');
      api.consume('fuse');
      api.set('fuse_fitted');
      api.sfx('unlock');
      return api.say('The fuse seats with a click. Nothing. No current: the tide wheel below must not be turning.');
    }
    if (item) return api.wrongItem();
    if (!api.has('lens_set')) {
      if (!api.has('lantern_set')) {
        api.set('lantern_set');
        api.refresh();
        api.say('You hang your lantern inside the lens cage. Its light drops through the glass and down the weight-well.');
      }
      return openLens(api);
    }
    if (!api.has('valves_set')) return api.say('The lens is set. Still no power: the tide wheel below isn\'t turning.');
    if (!api.has('lamp_lit')) {
      api.set('lamp_lit');
      api.sfx('unlock');
      api.setRoomState('lamp', 'after');
      return api.say('Light! But weak: orange, like a candle in a jar. A beam this dim won\'t reach the reef.');
    }
    if (!api.has('lamp_full')) {
      if (api.holding?.id !== 'rheostat') {
        return api.say(api.has('rheostat_tried')
          ? 'Lit, but dim. The latch on the housing only bites at full power. Tobin has to hold the rheostat at FULL first.'
          : 'Lit, but dim. Someone turned this lamp low, and it isn\'t up here.');
      }
      api.endHold();
      api.set('lamp_full');
      api.lockTide();
      api.sfx('unlock');
      api.refresh();
      for (const line of HOLD_TEXT.latch) api.say(line);
      return;
    }
    if (api.has('signalled_truth') || api.has('signalled_sos')) return api.say('The great lamp blazes.');
    openMorse(api);
  },

  window(api, item) {
    if (item) return api.wrongItem();
    if (api.has('final_phase')) return api.say('A small boat with a lantern is pulling for the rock.');
    if (api.has('valves_set') && !api.has('saw_boats')) api.say(LIGHTNING_TEXT.hintWindow);
    if (api.has('lamp_full')) {
      api.set('saw_ship');
      return api.say('The full beam finds the Halcyon, turning off the reef. Closer in, the cutter Vigilant swings toward the light.');
    }
    if (api.has('lamp_lit')) return api.say('The dim beam barely reaches the rocks. Out there, a ship\'s lights: the Halcyon, running for the reef.');
    if (api.tideLevel <= 1) {
      api.set('saw_wreck');
      api.card('wreck');
      api.say('The tide is out. The reef shows its teeth, and on it, the broken hull of the Marigold.');
      return api.say('Danny.');
    }
    if (api.tideLevel <= 3) return api.say('Surf breaks white over the reef. Somewhere beyond it, the Halcyon is on her way in.');
    api.say('The reef is gone under black water. That\'s when it kills.');
  },

  balcony(api, item) {
    if (item) return api.wrongItem();
    if (!api.has('lamp_full')) {
      return api.say('Locked tight. The latch is wired into the lamp circuit. It only releases when the light runs at full.');
    }
    api.set('saw_wool');
    api.card('wool');
    api.note('wool', 'A tuft of red wool snagged on the balcony rail, where Elias went over.');
    api.say('Wind and spray. On the rail he fell from, a tuft of red wool is snagged on a rivet.');
    api.say('Your hand goes to your scarf before you can stop it.');
  },

  // ---- Tobin, cellar ----
  chalk(api, item) {
    if (item) return api.wrongItem();
    api.set('knows_code');
    api.set('knows_anchor');
    api.note('chalk', 'Chalk in the cellar: "LIT 1874 — drawer". Beside it, a chalk anchor with an arrow: "to the well".');
    api.say('Scratched in chalk by the stairs: LIT 1874. Underneath, smaller: "drawer".');
    api.say('Beside it, a little chalk anchor with an arrow pointing up at the plate: "to the well".');
  },

  plate(api, item) {
    if (item) return api.wrongItem();
    if (api.has('final_phase')) {
      api.set('final_plate');
      api.note('soot', 'On the plate, in Elias\'s hand from the lens rim: "IF I FALL IT WAS" and one long bar. Then a clean streak where the soot was wiped away.');
      api.note('flash_tm', 'Flash-code: T is one dash. M is two.');
      api.card('projection');
      api.toast('final_board', 'finalBoard');
      api.say('The full beam lights the whole lens now, rim and all. Words fall down the well backwards in Elias\'s scratchy hand.');
      api.say('You read them the right way round: IF I FALL IT WAS. Then one long bar.');
      api.say('After it, a clean streak where the soot was wiped away.');
      api.refresh();
      return;
    }
    if (!api.has('lantern_set')) return api.say('A square of frosted glass set into the wall, under the old weight-well shaft. Dark.');
    if (!api.has('lens_wiped')) {
      api.set('saw_smear');
      return api.say('Light on the glass plate, coming down the weight-well. Just a smudge, like looking through a thumbprint.');
    }
    if (!api.has('lens_set')) return api.say('Coloured light slides across the glass, but it falls off one edge. The lens isn\'t lined up.');
    api.set('knows_order');
    api.note('order', 'Glass plate: five coloured dots, WHITE, GREEN, RED, YELLOW, BLUE, with a backwards "1" beside the right-hand dot.');
    api.say('Five coloured dots shine on the glass: white, green, red, yellow, blue. Beside the right-hand dot, a "1", written backwards.');
  },

  crate(api, item) {
    if (item) return api.wrongItem();
    if (api.has('crate_open')) return api.say('Rope, rags, biscuits, and that enormous glove.');
    api.set('crate_open');
    api.card('glove');
    api.say('Rope, rags and a tin of hard biscuits. Under them, an oversized oilskin glove stamped HARBOURMASTER. Nobody on this rock has hands that big.');
  },

  locker(api, item) {
    if (api.has('locker_open')) return api.say('The locker is empty now. Rags. Just rags.');
    if (item && item !== 'key') return api.wrongItem();
    if (!api.holds('key')) return api.say('A steel locker with a brass padlock stamped CELLAR LOCKER. The key must be somewhere in the tower.');
    api.consume('key');
    api.set('locker_open');
    api.sfx('unlock');
    api.say('The brass key turns. Inside, wrapped in oilcloth: a spare fuse for the great lamp. Tucked behind it, a brown envelope marked "T."');
    api.give('fuse');
    api.give('envelope');
    api.card('envelope');
    concealChoice(api, {
      item: 'envelope',
      title: 'An envelope marked "T."',
      text: 'Banknotes. More than a month\'s wages. Elias used to hand you envelopes like this on rough nights.\n\nMara will ask what was in the locker.',
      keep: 'Pocket it',
      tell: 'Tell Mara',
      hiddenFlag: 'envelope_hidden',
      toldFlag: 'envelope_told',
      hiddenText: 'You push the envelope deep into your pocket.',
      toldText: 'You leave the envelope out. Better she hears it from you.',
    });
  },

  valves(api, item) {
    if (api.has('valves_set')) return api.say('The wheels are locked in place. Behind the wall, the tide wheel thrums.');
    if (item === 'diary') {
      api.consume('diary');
      api.set('gasket');
      api.card('diary_1140');
      api.card('torn_page');
      api.note('gasket', 'Tore the "Low nights — E\'s orders" page out of the diary to make a gasket for wheel three.');
      api.say('Paper and grease, like Elias taught you. The only page that will do is the one headed "Low nights — E\'s orders". You tear it out and pack it round the spindle.');
      api.say('Wheel three stops spraying.');
      api.give('diary_torn');
      return;
    }
    if (item) return api.wrongItem();
    if (!api.has('gasket')) {
      api.say('Five iron valve wheels with brass tags, the paint long gone. Wheel three sprays seawater the moment you touch it. It needs a gasket.');
      return;
    }
    openValves(api);
  },

  plank(api, item) {
    if (item) return api.wrongItem();
    api.set('evidence_found');
    api.note('evidence', 'Under the cellar floor: a photograph of Crane watching the Marigold sink, and a ledger of insurance payouts for ships "lost to the Triangle".');
    api.say('Under the floating plank, a hollow in the floor. Wrapped in oilskin: a photograph of Harbourmaster Crane watching a ship go down, and a ledger of insurance payouts.');
    api.give('photo');
    api.give('ledger');
    api.card('photo');
    api.card('ledger');
  },

  rheostat(api, item) {
    if (item) return api.wrongItem();
    if (api.has('lamp_full')) return api.say('The handle sits at FULL, held there by Mara\'s latch. The scratched LOW mark under it is worn bright from use.');
    if (api.holding?.id === 'rheostat') return api.say(HOLD_TEXT.busy);
    api.sfx('unlock');
    if (!api.has('rheostat_tried')) {
      api.set('rheostat_tried');
      api.card('rheostat_low');
      api.say('The handle sits on a scratched mark: LOW. Worn bright, as if someone turned it there often. You crank it round to FULL.');
      for (const line of HOLD_TEXT.start) api.say(line);
    } else {
      api.say(HOLD_TEXT.retry);
    }
    api.startHold('rheostat', 'tobin', HOLD_MS);
    api.refresh();
  },

  stairs(api, item) {
    if (item) return api.wrongItem();
    if (api.has('prints_gone')) return api.say('Sea water laps the third step. Whatever prints were on the stairs are gone. The door at the top is still barred.');
    api.set('saw_prints');
    api.card('prints');
    api.say('The door at the top of the stairs is barred from outside. On the damp steps, two sets of boot prints, one smaller. One set never comes back down.');
  },

  // ---- Both rooms: dumbwaiter and speaking tube ----
  hatch(api, item) {
    const direction = api.actor === 'mara' ? 'down' : 'up';
    if (item) {
      api.send(item);
      if (item === 'key') api.set('key_sent');
      if (item === 'fuse') api.set('fuse_sent');
      if (item === 'ledger' && api.actor === 'tobin') api.set('ledger_sent');
      api.say(`The ${ITEMS[item].name.toLowerCase()} rattles ${direction} the dumbwaiter shaft.`);
      api.toast('sent', 'sent');
      return;
    }
    if (api.has('final_phase')) {
      if (!api.has('final_plate')) {
        return api.say(api.actor === 'tobin' ? 'Not yet. There\'s writing on the glass plate.' : 'Tobin has gone quiet down there.');
      }
      api.set('final_seen');
      api.remember('final_actor', api.actor);
      api.talk(finalLine(api, api.actor), () => api.end('final'));
      return;
    }
    const talk = pendingTalk(api);
    if (talk) {
      api.set(talk.id);
      talk.play?.(api);
      api.talk(talk.lines(api));
      return;
    }
    if (api.inventoryEmpty()) {
      return api.say(`The dumbwaiter hatch, with the old speaking tube beside it. The shaft runs ${direction} to the ${direction === 'down' ? 'cellar' : 'lamp room'}.`);
    }
    api.say(`Select something in the bag first, then click the hatch to send it ${direction}.`);
  },
};
