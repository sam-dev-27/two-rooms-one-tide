#!/usr/bin/env node
// Plays the whole puzzle chain headlessly (no Phaser) and checks both endings are reachable.
//   npm test
import assert from 'node:assert/strict';
import { GameState } from '../src/systems/State.js';
import { createApi, interact } from '../src/systems/Interact.js';
import { ROOMS } from '../src/data/rooms.js';

function makeGame({ verbose = false } = {}) {
  const state = new GameState();
  const log = [];
  let pendingKeypad = null;
  let pendingChoice = null;
  let ending = null;

  const view = {
    say: (t) => log.push(t),
    toast: () => {},
    sfx: () => {},
    pickup: () => {},
    sent: () => {},
    roomChanged: () => {},
    keypad: (o) => (pendingKeypad = o),
    choice: (o) => (pendingChoice = o),
    end: (id) => (ending = id),
  };
  const api = createApi(state, view);

  const visible = (id) => {
    const hs = ROOMS[state.room].hotspots.find((h) => h.id === id);
    assert.ok(hs, `${id} is not in ${state.room}`);
    return !hs.visibleIf || hs.visibleIf(state);
  };

  const game = {
    state,
    log,
    get ending() {
      return ending;
    },
    click(id, item = null) {
      assert.ok(visible(id), `${id} should be visible for ${state.active}`);
      if (item) assert.ok(state.holds(item), `${state.active} should hold ${item} to use it on ${id}`);
      const hs = ROOMS[state.room].hotspots.find((h) => h.id === id);
      interact(api, hs, item);
      if (verbose) console.log(`  ${state.active} -> ${id}${item ? ` with ${item}` : ''}: ${log.at(-1)}`);
    },
    enter(code) {
      assert.ok(pendingKeypad, 'no keypad open');
      const k = pendingKeypad;
      pendingKeypad = null;
      if (code === k.code) k.onSuccess();
      return code === k.code;
    },
    choose(index) {
      assert.ok(pendingChoice, 'no choice open');
      const opt = pendingChoice.options[index];
      assert.ok(opt.enabled, `option "${opt.label}" is disabled`);
      pendingChoice = null;
      opt.onSelect();
    },
    choiceEnabled: () => pendingChoice.options.map((o) => o.enabled),
    swap: () => state.swap(),
    visible,
  };
  return game;
}

function playToFinale(g, { takeEvidence }) {
  // Mara
  g.click('logbook');
  assert.ok(g.state.holds('page_a'));
  g.click('balcony');
  assert.ok(!g.state.has('lamp_lit'));

  // Tobin learns the drawer code
  g.swap();
  g.click('chalk');
  g.click('crate');
  assert.ok(g.state.holds('page_b'));
  g.click('locker');
  assert.ok(!g.state.has('locker_open'), 'locker must stay shut without the key');
  g.click('valves');
  assert.ok(!g.state.has('valves_set'), 'valves need the full page');

  // Mara opens the drawer; a wrong code is rejected
  g.swap();
  g.click('drawer');
  assert.equal(g.enter('0000'), false);
  g.click('drawer');
  assert.equal(g.enter('1874'), true);
  assert.ok(g.state.holds('key'));

  // Send key and top page down
  g.click('hatch_lamp', 'key');
  g.click('hatch_lamp', 'page_a');
  assert.ok(!g.state.holds('key'));

  // Tobin: arrivals combine the page halves
  g.swap();
  assert.ok(g.state.holds('valve_order'), 'page halves combine on arrival');
  assert.ok(g.state.has('pages_joined'));
  g.click('locker');
  assert.ok(g.state.holds('fuse'));
  assert.ok(!g.visible('plank'), 'plank hidden before the flood');
  g.click('valves');
  assert.ok(g.state.has('valves_set'));
  assert.equal(g.state.roomStates.cellar, 'after');
  assert.ok(g.visible('plank'), 'plank visible after the flood');
  if (takeEvidence) {
    g.click('plank');
    assert.ok(g.state.holds('photo') && g.state.holds('ledger'));
    assert.ok(!g.visible('plank'), 'plank hides once searched');
  }
  g.click('hatch_cellar', 'fuse');

  // Mara lights the lamp and goes out
  g.swap();
  assert.ok(g.state.holds('fuse'));
  g.click('lamp');
  assert.ok(g.state.has('lamp_lit'));
  assert.equal(g.state.roomStates.lamp, 'after');
  g.click('balcony');
}

const verbose = process.argv.includes('--verbose');

{
  const g = makeGame({ verbose });
  playToFinale(g, { takeEvidence: true });
  assert.deepEqual(g.choiceEnabled(), [true, true]);
  g.choose(0);
  assert.equal(g.ending, 'truth');
  console.log('ok  truth ending reachable');
}

{
  const g = makeGame({ verbose });
  playToFinale(g, { takeEvidence: false });
  assert.deepEqual(g.choiceEnabled(), [false, true], 'truth option locked without evidence');
  g.choose(1);
  assert.equal(g.ending, 'cover');
  console.log('ok  cover-up ending reachable');
}

{
  // Fuse fitted before the generator runs: lamp lights on the next click after the valves.
  const g = makeGame();
  g.state.give('fuse');
  g.click('lamp');
  assert.ok(g.state.has('fuse_fitted') && !g.state.has('lamp_lit'));
  g.state.set('valves_set');
  g.click('lamp');
  assert.ok(g.state.has('lamp_lit'));
  console.log('ok  fuse-before-power order works');
}

{
  // Wrong items never consume anything.
  const g = makeGame();
  g.state.give('fuse');
  g.click('logbook', 'fuse');
  assert.ok(g.state.holds('fuse'));
  console.log('ok  wrong item is harmless');
}

console.log('\nAll puzzle-chain checks passed.');
