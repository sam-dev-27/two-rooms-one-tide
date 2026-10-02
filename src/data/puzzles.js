// Puzzle logic. One handler per hotspot: (api, item) where item is the selected inventory item or null.
// Handlers only talk to `api`, never to Phaser, so tools/test-chain.mjs can play the game headlessly.
//
// Chain: logbook -> chalk code -> drawer key -> send key -> locker fuse -> crate page ->
//        join pages -> valves (flood + power) -> plank evidence -> send fuse -> lamp -> balcony ending.
import { ITEMS } from './items.js';

const DRAWER_CODE = '1874';

function lightLamp(api) {
  api.set('lamp_lit');
  api.sfx('unlock');
  api.setRoomState('lamp', 'after');
  api.say('Light! The great lamp roars to life and its beam sweeps the storm. Behind you, the balcony latch clicks free.');
}

export const HANDLERS = {
  // ---- Mara, lamp room ----
  logbook(api, item) {
    if (item) return api.wrongItem();
    if (api.has('read_logbook')) {
      return api.say('"Crane\'s men were on the rocks again tonight." The last entry still makes your skin crawl.');
    }
    api.set('read_logbook');
    api.note('logbook', 'Elias\'s log: "Crane\'s men were on the rocks again. Drawer code is the year this light was first lit. I chalked it downstairs where Crane won\'t look."');
    api.say('Elias\'s logbook. Last entry: "Crane\'s men were on the rocks again tonight. Drawer code is the year this light was first lit. I chalked it downstairs."');
    api.say('Pressed between the pages: the top half of a torn page. A valve order, cut off halfway.');
    api.give('page_a');
    api.toast('swap', 'swap');
  },

  drawer(api, item) {
    if (item) return api.wrongItem();
    if (api.has('drawer_open')) return api.say('Empty now, apart from a stub of pencil.');
    if (!api.has('knows_code')) api.say('A four-digit number lock. Elias\'s log said the code is chalked somewhere downstairs.');
    api.keypad({
      title: 'Desk drawer',
      code: DRAWER_CODE,
      onSuccess: () => {
        api.set('drawer_open');
        api.sfx('unlock');
        api.say('The lock clicks open. Inside: a heavy brass key stamped CELLAR LOCKER.');
        api.give('key');
      },
    });
  },

  lamp(api, item) {
    if (api.has('lamp_lit')) return api.say('The great lamp blazes. Somewhere out there, a ship must see it.');
    if (item && item !== 'fuse') return api.wrongItem();
    if (!api.has('fuse_fitted')) {
      if (!api.holds('fuse')) return api.say('The great lamp is dead. The fuse socket is empty and the brass is cold.');
      api.consume('fuse');
      api.set('fuse_fitted');
      api.sfx('unlock');
      if (api.has('valves_set')) return lightLamp(api);
      return api.say('The fuse seats with a click. Nothing. No current: the tide generator below must not be turning.');
    }
    if (api.has('valves_set')) return lightLamp(api);
    api.say('Still no power. The generator in the cellar has to be turning before the lamp will light.');
  },

  window(api, item) {
    if (item) return api.wrongItem();
    if (api.has('lamp_lit')) return api.say('The beam catches a coastguard cutter, already turning toward the rock.');
    api.say('Black water climbs the rocks. Far below, Tobin is somewhere in the cellar.');
  },

  balcony(api, item) {
    if (item) return api.wrongItem();
    if (!api.has('lamp_lit')) {
      return api.say('Locked tight. The latch is wired into the lamp circuit. It will only release when the light runs.');
    }
    const proof = api.has('evidence_found');
    api.choice({
      title: 'The balcony',
      text: proof
        ? 'Wind and spray. The cutter is close enough to read a signal. You have Elias\'s proof.'
        : 'Wind and spray. The cutter is close enough to read a signal. But you have nothing that proves what happened here.',
      options: [
        { label: 'Signal the truth: ELIAS MURDERED. PROOF ABOARD.', enabled: proof, onSelect: () => api.end('truth') },
        { label: 'Signal for rescue, and say nothing more.', enabled: true, onSelect: () => api.end('cover') },
      ],
    });
  },

  // ---- Tobin, cellar ----
  chalk(api, item) {
    if (item) return api.wrongItem();
    api.set('knows_code');
    api.note('chalk', 'Chalk in the cellar: "LIT 1874". Underneath, smaller: "drawer".');
    api.say('Scratched in chalk by the stairs: LIT 1874. Underneath, smaller: "drawer". Mara will want to know.');
  },

  crate(api, item) {
    if (item) return api.wrongItem();
    if (api.has('crate_open')) return api.say('Rope, rags and a tin of hard biscuits. Nothing else.');
    api.set('crate_open');
    api.say('Under the rope and rags, a page is tucked into a biscuit tin. Elias\'s handwriting: the bottom half of something.');
    api.give('page_b');
  },

  locker(api, item) {
    if (api.has('locker_open')) return api.say('The locker is empty now.');
    if (item && item !== 'key') return api.wrongItem();
    if (!api.holds('key')) return api.say('A steel locker with a brass padlock stamped CELLAR LOCKER. The key must be somewhere in the tower.');
    api.consume('key');
    api.set('locker_open');
    api.sfx('unlock');
    api.say('The brass key turns. Inside, wrapped in oilcloth: a spare fuse for the great lamp.');
    api.give('fuse');
  },

  valves(api, item) {
    if (api.has('valves_set')) return api.say('The wheels are locked in place. Behind the wall, the tide wheel thrums.');
    if (item && item !== 'valve_order') return api.wrongItem();
    if (api.holds('valve_order')) {
      api.consume('valve_order');
      api.set('valves_set');
      api.sfx('flood');
      api.setRoomState('cellar', 'after');
      api.say('Red, green, red, blue. The pipes shudder and the sea pours in, knee-deep and freezing. Behind the wall, the tide wheel starts turning the generator.');
      api.say('Something bobs to the surface: a loose floorboard.');
      return;
    }
    if (api.holds('page_a') || api.holds('page_b')) {
      return api.say('Half a valve order isn\'t enough. One wrong wheel could flood the whole tower. The full page is needed.');
    }
    api.say('Four iron valve wheels. The paint is too faded to tell them apart. Turning them blind could flood the whole tower.');
  },

  plank(api, item) {
    if (item) return api.wrongItem();
    api.set('evidence_found');
    api.note('evidence', 'Under the cellar floor: a photograph of Crane watching the Marigold sink, and a ledger of insurance payouts.');
    api.say('Under the floating plank, a hollow in the floor. Wrapped in oilskin: a photograph of Harbourmaster Crane watching the Marigold sink, and a ledger of insurance payouts.');
    api.say('Elias didn\'t drown by accident.');
    api.give('photo');
    api.give('ledger');
  },

  door(api, item) {
    if (item) return api.wrongItem();
    api.say('Barred from the outside. Someone made sure nobody would leave the cellar tonight.');
  },

  // ---- Both rooms ----
  hatch(api, item) {
    const direction = api.actor === 'mara' ? 'down' : 'up';
    if (item) {
      api.send(item);
      if (item === 'key') api.set('key_sent');
      if (item === 'fuse') api.set('fuse_sent');
      api.say(`The ${ITEMS[item].name.toLowerCase()} rattles ${direction} the dumbwaiter shaft.`);
      api.toast('sent', 'sent');
      return;
    }
    if (api.inventoryEmpty()) {
      return api.say(`The dumbwaiter hatch. A rope shaft runs ${direction} to the ${direction === 'down' ? 'cellar' : 'lamp room'}.`);
    }
    api.say(`Select something in the bag first, then click the hatch to send it ${direction}.`);
  },
};
