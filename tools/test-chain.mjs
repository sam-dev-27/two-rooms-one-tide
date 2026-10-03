#!/usr/bin/env node
// Plays the whole story headlessly (no Phaser): every step of the chain, each mini-puzzle's wrong
// input, the tide clock, tampering and concealment flags, both signals and both final lines.
//   npm test            (add --verbose to print every line)
import assert from 'node:assert/strict';
import { GameState } from '../src/systems/State.js';
import { createApi, interact, pendingTalk } from '../src/systems/Interact.js';
import { nextHint, useHint } from '../src/systems/Hints.js';
import { ROOMS } from '../src/data/rooms.js';
import { VALVE_COLORS, VALVE_ORDER, LENS_PANELS } from '../src/data/puzzles.js';
import { HINTS, endingCard, FINAL_LINES } from '../src/data/text.js';
import { TIDE_MAX, TIDE_STEP_MS } from '../src/config.js';

const verbose = process.argv.includes('--verbose');

function makeGame() {
  const state = new GameState();
  const log = [];
  const talks = [];
  const pending = {};
  let ending = null;
  let finalEnd = null;

  const open = (kind) => (o) => {
    pending[kind] = o;
  };
  const view = {
    say: (t) => {
      log.push(t);
      if (verbose) console.log(`    ${t}`);
    },
    toast: () => {},
    sfx: () => {},
    pickup: () => {},
    sent: () => {},
    roomChanged: () => {},
    refresh: () => {},
    swapTo: (who) => state.setActive(who),
    keypad: open('keypad'),
    choice: open('choice'),
    lens: open('lens'),
    valves: open('valves'),
    morse: open('morse'),
    talk: (lines, onDone) => {
      talks.push(lines);
      if (verbose) for (const [who, t] of lines) console.log(`    ${who.toUpperCase()}: ${t}`);
      onDone?.();
    },
    ending: (id, onDone) => {
      ending = id;
      onDone();
    },
    end: (id) => (finalEnd = id),
  };
  const api = createApi(state, view);

  const find = (id) => {
    const hs = ROOMS[state.room].hotspots.find((h) => h.id === id);
    assert.ok(hs, `${id} is not in ${state.room}`);
    return hs;
  };
  const visible = (id) => {
    const hs = find(id);
    return !hs.visibleIf || hs.visibleIf(state);
  };
  const take = (kind) => {
    const o = pending[kind];
    assert.ok(o, `no ${kind} open`);
    delete pending[kind];
    return o;
  };

  return {
    state,
    api,
    log,
    talks,
    pending,
    get ending() {
      return ending;
    },
    get finalEnd() {
      return finalEnd;
    },
    click(id, item = null) {
      assert.ok(visible(id), `${id} should be visible for ${state.active}`);
      if (item) assert.ok(state.holds(item), `${state.active} should hold ${item} to use it on ${id}`);
      if (verbose) console.log(`  ${state.active} -> ${id}${item ? ` with ${item}` : ''}`);
      interact(api, find(id), item);
    },
    as(who) {
      state.setActive(who);
    },
    enter(code) {
      const k = take('keypad');
      if (code === k.code) k.onSuccess();
      return code === k.code;
    },
    choose(index) {
      const c = take('choice');
      const opt = c.options[index];
      assert.ok(opt.enabled, `option "${opt.label}" is disabled`);
      opt.onSelect();
    },
    take,
    visible,
    lastLine: () => log.at(-1),
    tube() {
      const before = talks.length;
      this.click(state.active === 'mara' ? 'hatch_lamp' : 'hatch_cellar');
      assert.equal(talks.length, before + 1, 'a speaking-tube talk should have played');
      return talks.at(-1);
    },
  };
}

const settingsFor = (names) => names.map((n) => VALVE_COLORS.indexOf(n));

/** Plays from the start to the Morse shutter. Options pick the concealment choices. */
function playToSignal(g, { hideLetter = false, hideEnvelope = true, wrongValves = 0 } = {}) {
  const s = g.state;

  // Mara: logbook teaches flash-code names.
  g.as('mara');
  g.click('logbook');
  assert.ok(s.has('read_logbook'));
  g.click('lamp');
  assert.ok(!s.has('fuse_fitted'), 'lamp is dead without a fuse');
  g.click('balcony');
  assert.ok(!s.has('saw_wool'), 'balcony locked before full power');
  assert.equal(pendingTalk(g.api), null, 'no talk before both have looked around');

  // Tobin: chalk code and anchor.
  g.as('tobin');
  assert.ok(s.holds('diary'), 'Tobin starts with his diary');
  g.click('chalk');
  assert.ok(s.has('knows_code') && s.has('knows_anchor'));
  g.click('stairs');
  assert.ok(s.has('saw_prints'));
  assert.match(g.lastLine(), /two sets of boot prints/);
  g.click('crate');
  g.click('locker');
  assert.ok(!s.has('locker_open'), 'locker stays shut without the key');
  g.click('valves');
  assert.ok(!g.pending.valves, 'valves need a gasket before the wheels open');
  g.click('plate');
  assert.match(g.lastLine(), /Dark/);

  // T1 at either hatch.
  const t1 = g.tube();
  assert.ok(s.has('talk_1'));
  assert.ok(t1.some(([, t]) => t.includes('At my aunt')), 'Tobin\'s alibi');
  assert.ok(t1.some(([, t]) => t.includes('never been out here')), 'Mara\'s alibi');

  // Mara: drawer keypad, wrong code then right; key + letter and a concealment choice.
  g.as('mara');
  g.click('drawer');
  assert.equal(g.enter('0000'), false);
  assert.ok(!s.has('drawer_open'));
  g.click('drawer');
  assert.equal(g.enter('1874'), true);
  assert.ok(s.holds('key') && s.holds('letter'));
  g.choose(hideLetter ? 0 : 1);
  assert.ok(s.has(hideLetter ? 'letter_hidden' : 'letter_told'));
  assert.equal(s.holds('letter'), !hideLetter, 'hidden letter goes into her coat');
  g.click('hatch_lamp', 'key');
  assert.ok(s.has('key_sent') && !s.holds('key'));

  // Tobin: locker gives fuse + envelope and a choice; sends the fuse up.
  g.as('tobin');
  g.click('locker');
  assert.ok(s.holds('fuse') && s.has('locker_open'));
  g.choose(hideEnvelope ? 0 : 1);
  assert.ok(s.has(hideEnvelope ? 'envelope_hidden' : 'envelope_told'));
  g.click('hatch_cellar', 'fuse');

  // Mara fits the fuse: no power. T2 then T4.
  g.as('mara');
  g.click('lamp', 'fuse');
  assert.ok(s.has('fuse_fitted') && !s.has('lamp_lit'));
  const t2 = g.tube();
  assert.ok(t2.some(([who, t]) => who === 'tobin' && t.includes('One dash')), 'T2 teaches T = one dash');
  const t4 = g.tube();
  assert.ok(s.has('talk_4'));
  assert.ok(t4.some(([, t]) => t.includes(hideLetter ? 'A pencil stub' : 'He was alive when I left')));
  assert.ok(t4.some(([, t]) => t.includes(hideEnvelope ? 'Just rags' : 'Crane pays people')));

  // Lens dial: the lantern goes in, then wrong inputs are harmless until wiped + anchor.
  g.click('lamp');
  assert.ok(s.has('lantern_set'));
  let lens = g.take('lens');
  assert.equal(lens.wiped, false);
  assert.equal(lens.attempt(LENS_PANELS[lens.rotation]), false, 'start position is not solved');
  assert.equal(lens.attempt('anchor'), false, 'anchor alone fails while the lens is sooty');
  assert.ok(!s.has('lens_set'));

  g.as('tobin');
  g.click('plate');
  assert.ok(s.has('saw_smear'));
  g.tube(); // T3
  assert.ok(s.has('talk_3'));

  g.as('mara');
  g.click('lamp');
  lens = g.take('lens');
  assert.match(lens.wipe(), /Gull grit/);
  assert.ok(s.has('lens_wiped'), 'tampering: lens wiped');
  assert.equal(lens.attempt('gull'), false, 'wrong panel after wiping');
  lens.rotate(5);
  assert.equal(s.memo.lens_rot, 5, 'rotation is remembered');
  assert.equal(lens.attempt('anchor'), true);
  assert.ok(s.has('lens_set'));

  // Tobin: plate shows the mirrored order; gasket from the diary; valve wheels.
  g.as('tobin');
  g.click('plate');
  assert.ok(s.has('knows_order'));
  assert.match(g.lastLine(), /white, green, red, yellow, blue/);
  g.click('valves');
  assert.ok(!g.pending.valves, 'still leaking without a gasket');
  g.click('valves', 'diary');
  assert.ok(s.has('gasket') && s.holds('diary_torn') && !s.holds('diary'), 'tampering: diary page torn for a gasket');
  g.click('valves');
  let valves = g.take('valves');
  const tideBefore = s.tide;
  assert.equal(valves.attempt(settingsFor(['white', 'green', 'red', 'yellow', 'blue'])), false, 'plate order unmirrored is wrong');
  assert.equal(s.tide, Math.min(TIDE_MAX, tideBefore + 1), 'a wrong valve attempt raises the tide');
  for (let i = 1; i < wrongValves; i++) valves.attempt([0, 0, 0, 0, 0]);
  assert.ok(!s.has('valves_set'));
  assert.equal(s.roomStates.cellar, 'before');
  valves.change([1, 2, 3, 4, 0]);
  assert.deepEqual(s.memo.valves, [1, 2, 3, 4, 0], 'wheel settings are kept');
  assert.equal(valves.attempt(settingsFor(VALVE_ORDER)), true);
  assert.ok(s.has('valves_set') && s.has('prints_gone'), 'tampering: flood washes the prints');
  assert.equal(s.roomStates.cellar, 'after');
  g.click('stairs');
  assert.match(g.lastLine(), /prints .* gone/);

  // Evidence floats up: T5.
  assert.ok(g.visible('plank'));
  g.click('plank');
  assert.ok(s.holds('photo') && s.holds('ledger') && s.has('evidence_found'));
  assert.ok(!g.visible('plank'));
  const t5 = g.tube();
  assert.ok(t5.some(([, t]) => t.includes('man with a pen')));

  // Mara: lamp lit but dim; T6; Tobin turns the rheostat.
  g.as('mara');
  g.click('lamp');
  assert.ok(s.has('lamp_lit') && !s.has('lamp_full'));
  assert.equal(s.roomStates.lamp, 'after');
  g.click('lamp');
  assert.ok(!g.pending.morse, 'no signalling with a dim lamp');
  g.tube(); // T6
  g.as('tobin');
  assert.ok(g.visible('rheostat'), 'rheostat appears once the lamp is lit');
  const tideAtFull = s.tide;
  g.click('rheostat');
  assert.ok(s.has('lamp_full'));
  assert.equal(s.tideBand, tideAtFull, 'tide band locks when the lamp reaches full');
  s.tick(TIDE_STEP_MS * 10);
  assert.equal(s.tide, tideAtFull, 'tide freezes once locked');

  g.as('mara');
  g.click('window');
  assert.ok(s.has('saw_ship'));
  g.click('balcony');
  assert.ok(s.has('saw_wool'));
}

function signal(g, word) {
  g.as('mara');
  g.click('lamp');
  const m = g.take('morse');
  const opt = m.words.find((w) => w.word === word);
  assert.ok(opt.enabled, `${word} should be enabled`);
  let p = { letter: 0, buffer: '' };
  // A wrong symbol resets only the current letter.
  if (word === 'CRANE') {
    p = m.step(word, p, '-');
    assert.equal(p.result, 'ok');
    p = m.step(word, p, '-');
    assert.equal(p.result, 'wrong');
    assert.deepEqual([p.letter, p.buffer], [0, '']);
  }
  for (const ch of word) {
    for (const sym of m.code[ch]) p = m.step(word, p, sym);
  }
  assert.equal(p.result, 'done');
  m.onDone(word);
}

function finish(g, actor) {
  const s = g.state;
  assert.ok(s.has('final_phase'));
  assert.equal(s.active, 'tobin', 'final scene starts as Tobin');
  g.click('hatch_cellar');
  assert.ok(!s.has('final_seen'), 'hatch waits for the plate');
  g.click('plate');
  assert.ok(s.has('final_plate'));
  assert.match(g.log.join(' '), /IF I FALL IT WAS/);
  assert.ok(s.notes.some((n) => n.text.includes('T is one dash. M is two.')));
  if (actor === 'mara') {
    g.as('mara');
    g.click('lamp');
    assert.match(g.lastLine(), /red wool/);
  }
  g.click(actor === 'mara' ? 'hatch_lamp' : 'hatch_cellar');
  assert.ok(s.has('final_seen'));
  assert.equal(g.finalEnd, 'final');
  return g.talks.at(-1);
}

// ---- full run 1: CRANE, ledger sent, final as Tobin ----
{
  const g = makeGame();
  playToSignal(g, { hideLetter: false, hideEnvelope: true });
  g.as('tobin');
  g.click('hatch_cellar', 'ledger');
  g.click('hatch_cellar', 'photo');
  assert.ok(g.state.has('ledger_sent'));
  const t7 = g.tube();
  assert.ok(t7.some(([, t]) => t.includes('we believe each other')));
  signal(g, 'CRANE');
  assert.equal(g.ending, 'truth');
  assert.ok(g.state.has('signalled_truth'));
  const card = endingCard(g.state, 'truth');
  assert.match(card.text, /CRANE\. UNDERSTOOD/);
  assert.match(card.text, /envelope stays in his pocket/);
  assert.doesNotMatch(card.text, /letter stays/);
  const last = finish(g, 'tobin');
  assert.deepEqual(last, FINAL_LINES.tobin);
  assert.equal(last[0][0], 'mara');
  assert.match(last[0][1], /Leave the wall\. It's only soot/);
  console.log('ok  full chain: CRANE signalled, final line as Tobin (Mara speaks)');
}

// ---- full run 2: SOS without the ledger, other concealment choices, final as Mara ----
{
  const g = makeGame();
  playToSignal(g, { hideLetter: true, hideEnvelope: false, wrongValves: 3 });
  g.as('mara');
  g.click('lamp');
  const m = g.take('morse');
  assert.deepEqual(m.words.map((w) => w.enabled), [false, true], 'CRANE locked without the ledger');
  signal(g, 'SOS');
  assert.equal(g.ending, 'cover');
  const card = endingCard(g.state, 'cover');
  assert.match(card.footer, /another ending/);
  assert.match(card.text, /letter stays in her coat/);
  assert.doesNotMatch(card.text, /envelope stays/);
  const last = finish(g, 'mara');
  assert.deepEqual(last, FINAL_LINES.mara);
  assert.equal(last[0][0], 'tobin');
  assert.match(last[0][1], /wash that scarf/);
  console.log('ok  full chain: SOS signalled, final line as Mara (Tobin speaks)');
}

// ---- tide clock ----
{
  const g = makeGame();
  const s = g.state;
  assert.equal(s.tide, 0);
  s.tick(TIDE_STEP_MS - 1);
  assert.equal(s.tide, 0);
  s.tick(1);
  assert.equal(s.tide, 1, '+1 per step of active play');
  s.tick(TIDE_STEP_MS * 20);
  assert.equal(s.tide, TIDE_MAX, 'caps at 6');
  for (let i = 0; i < 5; i++) g.api.raiseTide(1);
  assert.equal(s.tide, TIDE_MAX);
  assert.ok(![...s.flags].some((f) => /fail|lose|dead/.test(f)), 'no fail state');
  g.as('mara');
  g.click('window');
  assert.match(g.lastLine(), /black water/);

  const low = makeGame();
  low.as('mara');
  low.click('window');
  assert.ok(low.state.has('saw_wreck'), 'low tide shows the Marigold');
  low.state.advanceTide(2);
  low.click('window');
  assert.match(low.lastLine(), /Surf/);
  console.log('ok  tide clock advances, caps at 6, never fails; window follows the tide');
}

// ---- tide bands in the ending card ----
{
  const g = makeGame();
  const s = g.state;
  s.advanceTide(1);
  s.lockTide();
  assert.match(endingCard(s, 'truth').text, /clear water/);
  const g2 = makeGame();
  g2.state.advanceTide(4);
  g2.state.lockTide();
  assert.match(endingCard(g2.state, 'cover').text, /limped home/);
  const g3 = makeGame();
  g3.state.advanceTide(6);
  g3.state.lockTide();
  assert.match(endingCard(g3.state, 'truth').text, /never collected/);
  assert.match(endingCard(g3.state, 'cover').text, /last payout/);
  console.log('ok  tide band picks the Halcyon line');
}

// ---- urgency lines from tide 4 ----
{
  const g = makeGame();
  g.state.set('read_logbook');
  g.state.set('knows_code');
  g.state.advanceTide(4);
  g.as('mara');
  const t1 = g.tube();
  assert.ok(t1.some(([, t]) => t.includes('over my boots')));
  console.log('ok  talks gain urgency from tide 4');
}

// ---- hints ----
{
  const g = makeGame();
  const s = g.state;
  assert.match(nextHint(s), /logbook/);
  s.set('read_logbook');
  s.set('knows_code');
  s.set('talk_1');
  assert.equal(useHint(s), 'The chalk said LIT 1874.');
  assert.equal(useHint(s), 'Mara: enter 1874 on the desk drawer.');
  assert.equal(useHint(s), 'Mara: enter 1874 on the desk drawer.', 'escalation stops at the last hint');
  assert.equal(s.hintsUsed, 3);
  assert.equal(HINTS.length, 19, 'one hint step per row of the design ladder');
  console.log('ok  hint ladder escalates');
}

// ---- wrong items and hatch basics ----
{
  const g = makeGame();
  g.as('tobin');
  g.click('chalk', 'diary');
  assert.ok(g.state.holds('diary'), 'wrong item is never consumed');
  g.as('mara');
  g.click('hatch_lamp');
  assert.match(g.lastLine(), /speaking tube/);
  console.log('ok  wrong items are harmless; idle hatch describes itself');
}

console.log('\nAll puzzle-chain checks passed.');
